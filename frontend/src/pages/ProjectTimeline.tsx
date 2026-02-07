import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Snackbar,
  useTheme,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimelineIcon from '@mui/icons-material/Timeline';
import LinkIcon from '@mui/icons-material/Link';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import {
  addDays,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  differenceInCalendarDays,
  format,
  isWeekend,
} from 'date-fns';
import type { DependencyType, Project, Task, TaskDependency, TaskWorkSlot } from '../types';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import Breadcrumbs from '../components/Breadcrumbs';
import EmptyState from '../components/EmptyState';
import { topologicalSort } from '../utils/topologicalSort';

type TimelineRow = {
  task: Task;
  start: Date | null;
  end: Date | null;
  dependencies: TaskDependency[];
  workSlots: TaskWorkSlot[];
};

const ZOOM_LEVELS = [28, 40, 56, 72, 96];
const DEFAULT_ZOOM_INDEX = 2; // 56px
const headerHeight = 48;
const rowHeight = 60;

const dependencyLabel = (value: DependencyType) => {
  if (value === 'start_start') return 'Start to Start';
  if (value === 'finish_finish') return 'Finish to Finish';
  return 'Finish to Start';
};

const statusLabel = (status: Task['status']) =>
  ({
    planned: 'Planned',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    done: 'Done',
  })[status];

const statusColor = (status: Task['status']) => {
  if (status === 'done') return 'success';
  if (status === 'blocked') return 'warning';
  if (status === 'in_progress') return 'info';
  return 'default';
};

const getTaskRange = (task: Task, workSlots: TaskWorkSlot[]) => {
  if (workSlots.length > 0) {
    const starts = workSlots.map((slot) => new Date(slot.startTime).getTime());
    const ends = workSlots.map((slot) => {
      const end = new Date(slot.endTime).getTime();
      return slot.isAllDay ? end - 1 : end;
    });
    const minStart = Math.min(...starts);
    const maxEnd = Math.max(...ends);
    return { start: new Date(minStart), end: new Date(maxEnd) };
  }

  const start = task.startDate ? startOfDay(new Date(task.startDate)) : null;
  const end = task.dueDate ? endOfDay(new Date(task.dueDate)) : null;

  if (start && end) {
    return { start, end };
  }

  if (start) {
    return { start, end: endOfDay(start) };
  }

  if (end) {
    return { start: startOfDay(end), end };
  }

  return { start: null, end: null };
};

export default function ProjectTimeline() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<Record<string, TaskDependency[]>>({});
  const [taskSlots, setTaskSlots] = useState<Record<string, TaskWorkSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragDeltaDays, setDragDeltaDays] = useState(0);
  const [shiftingTaskId, setShiftingTaskId] = useState<string | null>(null);
  const [shiftSnackbar, setShiftSnackbar] = useState<{
    open: boolean;
    taskId: string;
    taskTitle: string;
    deltaDays: number;
    cascade: boolean;
  } | null>(null);
  const [cascadeMode, setCascadeMode] = useState<boolean>(() => {
    return localStorage.getItem('timeline-cascade-mode') !== 'false';
  });
  const [cascadeDialogOpen, setCascadeDialogOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState<number>(() => {
    const stored = localStorage.getItem('timeline-zoom-index');
    return stored ? Math.min(Math.max(Number(stored), 0), ZOOM_LEVELS.length - 1) : DEFAULT_ZOOM_INDEX;
  });
  const columnWidth = ZOOM_LEVELS[zoomIndex];
  const [pendingShift, setPendingShift] = useState<{
    taskId: string; deltaDays: number; taskTitle: string;
  } | null>(null);
  const dragStartXRef = useRef(0);
  const dragDeltaRef = useRef(0);

  const loadTimeline = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [projectData, taskData] = await Promise.all([
        projectService.getById(id),
        taskService.getByProject(id),
      ]);

      const [dependencies, slots] = await Promise.all([
        Promise.all(taskData.map((task) => taskService.listDependencies(task.id))),
        Promise.all(taskData.map((task) => taskService.listWorkSlots(task.id))),
      ]);

      const dependencyMap: Record<string, TaskDependency[]> = {};
      const slotMap: Record<string, TaskWorkSlot[]> = {};

      taskData.forEach((task, index) => {
        dependencyMap[task.id] = dependencies[index] || [];
        slotMap[task.id] = slots[index] || [];
      });

      setProject(projectData);
      setTasks(taskData);
      setTaskDependencies(dependencyMap);
      setTaskSlots(slotMap);
    } catch (err) {
      console.error(err);
      setError('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTimeline();
  }, [id]);

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const rows = useMemo<TimelineRow[]>(() => {
    const sortedTasks = topologicalSort(tasks, (id) => (taskDependencies[id] ?? []).map((d) => d.dependsOnTaskId));

    return sortedTasks.map((task) => {
      const workSlots = taskSlots[task.id] ?? [];
      const dependencies = taskDependencies[task.id] ?? [];
      const { start, end } = getTaskRange(task, workSlots);
      return { task, start, end, dependencies, workSlots };
    });
  }, [tasks, taskDependencies, taskSlots]);

  const scheduledRows = useMemo(
    () => rows.filter((row) => row.start && row.end),
    [rows]
  );

  const unscheduledRows = useMemo(
    () => rows.filter((row) => !row.start || !row.end),
    [rows]
  );

  const timelineRange = useMemo(() => {
    if (scheduledRows.length === 0) return null;
    let minStart = scheduledRows[0].start as Date;
    let maxEnd = scheduledRows[0].end as Date;
    scheduledRows.forEach((row) => {
      if (row.start && row.start < minStart) minStart = row.start;
      if (row.end && row.end > maxEnd) maxEnd = row.end;
    });
    const start = startOfDay(minStart);
    const end = startOfDay(maxEnd);
    const days = eachDayOfInterval({ start, end });
    return { start, end, days };
  }, [scheduledRows]);

  const hasDependents = useCallback((taskId: string): boolean => {
    return Object.values(taskDependencies).some(
      (deps) => deps.some((d) => d.dependsOnTaskId === taskId)
    );
  }, [taskDependencies]);

  const shiftTaskSchedule = useCallback(
    async (taskId: string, deltaDays: number, taskTitle: string, cascade: boolean) => {
      if (!deltaDays) return;
      try {
        setShiftingTaskId(taskId);
        await taskService.shiftSchedule(taskId, { deltaDays, cascade });
        await loadTimeline();
        setShiftSnackbar({ open: true, taskId, taskTitle, deltaDays, cascade });
      } catch (err) {
        console.error(err);
        setError('Failed to shift task schedule');
      } finally {
        setShiftingTaskId(null);
      }
    },
    [loadTimeline],
  );

  const startTaskDrag = (event: React.MouseEvent, taskId: string) => {
    event.preventDefault();
    if (shiftingTaskId) return;
    dragStartXRef.current = event.clientX;
    dragDeltaRef.current = 0;
    setDragDeltaDays(0);
    setDraggingTaskId(taskId);
  };

  useEffect(() => {
    if (!draggingTaskId) return;

    const handleMove = (event: MouseEvent) => {
      const deltaX = event.clientX - dragStartXRef.current;
      const nextDelta = Math.round(deltaX / columnWidth);
      dragDeltaRef.current = nextDelta;
      setDragDeltaDays(nextDelta);
    };

    const handleUp = async () => {
      const deltaDays = dragDeltaRef.current;
      const taskId = draggingTaskId;
      setDraggingTaskId(null);
      setDragDeltaDays(0);

      if (!taskId || deltaDays === 0) return;

      const task = taskMap.get(taskId);
      const title = task?.title || 'Task';

      if (cascadeMode || !hasDependents(taskId)) {
        await shiftTaskSchedule(taskId, deltaDays, title, cascadeMode);
      } else {
        setPendingShift({ taskId, deltaDays, taskTitle: title });
        setCascadeDialogOpen(true);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingTaskId, shiftTaskSchedule, taskMap, cascadeMode, hasDependents]);

  const handleShiftSnackbarClose = () => {
    if (!shiftSnackbar) return;
    setShiftSnackbar({ ...shiftSnackbar, open: false });
  };

  const handleShiftUndo = async () => {
    if (!shiftSnackbar) return;
    const { taskId, taskTitle, deltaDays, cascade } = shiftSnackbar;
    setShiftSnackbar(null);
    await shiftTaskSchedule(taskId, -deltaDays, taskTitle, cascade);
  };

  const getBarStyle = (task: Task, blocked: boolean) => {
    if (task.status === 'done') {
      return {
        background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.65), rgba(100, 116, 139, 0.9))',
      };
    }
    if (blocked || task.status === 'blocked') {
      return {
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.7), rgba(251, 146, 60, 0.95))',
      };
    }
    if (task.status === 'in_progress') {
      return {
        background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
      };
    }
    return {
      background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.7), rgba(15, 118, 110, 0.95))',
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Project not found'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  const totalTasks = tasks.length;
  const scheduledCount = scheduledRows.length;
  const unscheduledCount = unscheduledRows.length;
  const blockedCount = tasks.filter((task) => task.isBlocked).length;

  return (
    <Box>
      <Breadcrumbs
        items={[
          { label: 'Projects', path: '/projects' },
          { label: project.name, path: `/projects/${project.id}` },
          { label: 'Timeline' },
        ]}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            Timeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {project.name}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
            <Chip size="small" label={`${totalTasks} tasks`} variant="outlined" />
            <Chip size="small" label={`${scheduledCount} scheduled`} color="primary" />
            <Chip size="small" label={`${unscheduledCount} unscheduled`} variant="outlined" />
            {blockedCount > 0 && <Chip size="small" label={`${blockedCount} blocked`} color="warning" />}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={() => navigate(`/projects/${project.id}`)}>
            Project Detail
          </Button>
          <Button variant="contained" startIcon={<TimelineIcon />} onClick={() => loadTimeline()}>
            Refresh
          </Button>
        </Stack>
      </Box>

      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(249, 115, 22, 0.08))',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Box>
            <Typography variant="h6">Project cadence</Typography>
            <Typography variant="body2" color="text.secondary">
              Weekends {project.includeWeekends ? 'included' : 'excluded'} | Workday {project.workdayStart} -{' '}
              {project.workdayEnd}
            </Typography>
          </Box>
          {timelineRange && (
            <Chip
              label={`${format(timelineRange.start, 'MMM d, yyyy')} - ${format(timelineRange.end, 'MMM d, yyyy')}`}
              color="secondary"
            />
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">Schedule overview</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title="Zoom out">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const next = Math.max(0, zoomIndex - 1);
                      setZoomIndex(next);
                      localStorage.setItem('timeline-zoom-index', String(next));
                    }}
                    disabled={zoomIndex === 0}
                    sx={{ minWidth: 32, px: 0.5 }}
                  >
                    <ZoomOutIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32, textAlign: 'center' }}>
                {Math.round((columnWidth / ZOOM_LEVELS[DEFAULT_ZOOM_INDEX]) * 100)}%
              </Typography>
              <Tooltip title="Zoom in">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const next = Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1);
                      setZoomIndex(next);
                      localStorage.setItem('timeline-zoom-index', String(next));
                    }}
                    disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                    sx={{ minWidth: 32, px: 0.5 }}
                  >
                    <ZoomInIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={cascadeMode}
                  onChange={(e) => {
                    setCascadeMode(e.target.checked);
                    localStorage.setItem('timeline-cascade-mode', String(e.target.checked));
                  }}
                />
              }
              label="Immer mit Abhängigkeiten verschieben"
            />
          </Stack>
        </Stack>
        <Divider sx={{ mb: 2 }} />

        {scheduledRows.length === 0 || !timelineRange ? (
          <EmptyState
            title="No scheduled tasks yet"
            description="Add start/due dates or work slots to see them on the timeline."
            actionLabel="Open Project"
            onAction={() => navigate(`/projects/${project.id}`)}
          />
        ) : (
          <Box sx={{ display: { xs: 'block', md: 'grid' }, gridTemplateColumns: '280px 1fr', gap: 2 }}>
            <Box>
              <Box
                sx={{
                  height: headerHeight,
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  fontWeight: 600,
                }}
              >
                Tasks
              </Box>
              <Stack spacing={0}>
                {scheduledRows.map((row) => {
                  const dependencyTitles = row.dependencies
                    .map((dep) => {
                      const title = taskMap.get(dep.dependsOnTaskId)?.title || 'Unknown task';
                      return `${title} (${dependencyLabel(dep.dependencyType)})`;
                    })
                    .join(', ');
                  const blocked =
                    row.task.isBlocked ??
                    row.dependencies.some((dep) => taskMap.get(dep.dependsOnTaskId)?.status !== 'done');

                  return (
                    <Box
                      key={`task-${row.task.id}`}
                      sx={{
                        height: rowHeight,
                        px: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {row.task.title}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip size="small" label={statusLabel(row.task.status)} color={statusColor(row.task.status)} />
                          {blocked && row.task.status !== 'done' && row.task.status !== 'blocked' && (
                            <Chip size="small" label="Blocked" color="warning" />
                          )}
                          {row.dependencies.length > 0 && (
                            <Tooltip title={`Depends on: ${dependencyTitles}`}>
                              <Chip size="small" icon={<LinkIcon />} label={`${row.dependencies.length} deps`} variant="outlined" />
                            </Tooltip>
                          )}
                        </Stack>
                      </Box>
                      <Button size="small" onClick={() => navigate(`/tasks/${row.task.id}`)}>
                        Open
                      </Button>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: timelineRange.days.length * columnWidth }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${timelineRange.days.length}, ${columnWidth}px)`,
                    height: headerHeight,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    background: 'rgba(15, 118, 110, 0.06)',
                  }}
                >
                  {timelineRange.days.map((day) => (
                    <Box
                      key={day.toISOString()}
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: isWeekend(day) ? 'rgba(15, 23, 42, 0.04)' : 'transparent',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {format(day, 'MMM d')}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Stack spacing={0}>
                  {scheduledRows.map((row) => {
                    const startIndex = differenceInCalendarDays(startOfDay(row.start as Date), timelineRange.start);
                    const endIndex = differenceInCalendarDays(startOfDay(row.end as Date), timelineRange.start);
                    const gridStart = Math.max(1, startIndex + 1);
                    const gridEnd = Math.max(gridStart + 1, endIndex + 2);
                    const blocked =
                      row.task.isBlocked ??
                      row.dependencies.some((dep) => taskMap.get(dep.dependsOnTaskId)?.status !== 'done');
                    const barStyle = getBarStyle(row.task, blocked);
                    const rangeLabel = `${format(row.start as Date, 'MMM d, yyyy')} - ${format(
                      row.end as Date,
                      'MMM d, yyyy'
                    )}`;
                    const isDragging = draggingTaskId === row.task.id;
                    const offsetDays = isDragging ? dragDeltaDays : 0;
                    const shiftLabel =
                      isDragging && dragDeltaDays !== 0
                        ? `${dragDeltaDays > 0 ? '+' : ''}${dragDeltaDays}d`
                        : '';

                    return (
                      <Box
                        key={`timeline-${row.task.id}`}
                        sx={{
                          height: rowHeight,
                          display: 'grid',
                          gridTemplateColumns: `repeat(${timelineRange.days.length}, ${columnWidth}px)`,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          position: 'relative',
                          backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.05) 1px, transparent 1px)`,
                          backgroundSize: `${columnWidth}px 100%`,
                        }}
                      >
                        <Tooltip title={rangeLabel}>
                          <Box
                            role="button"
                            aria-label={`Shift ${row.task.title}`}
                            onMouseDown={(e) => startTaskDrag(e, row.task.id)}
                            sx={{
                              gridColumn: `${gridStart} / ${gridEnd}`,
                              alignSelf: 'center',
                              height: 18,
                              borderRadius: 999,
                              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.15)',
                              cursor: shiftingTaskId ? 'not-allowed' : 'grab',
                              transform: `translateX(${offsetDays * columnWidth}px)`,
                              transition: isDragging ? 'none' : 'transform 120ms ease-out',
                              ...barStyle,
                            }}
                          />
                        </Tooltip>
                        {shiftLabel && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 12,
                              px: 1,
                              py: 0.25,
                              borderRadius: 999,
                              backgroundColor: 'rgba(15, 23, 42, 0.8)',
                              color: '#fff',
                              fontSize: 11,
                            }}
                          >
                            {shiftLabel}
                          </Box>
                        )}
                        {row.workSlots.map((slot) => {
                          const slotStart = startOfDay(new Date(slot.startTime));
                          const slotEndBase = startOfDay(new Date(slot.endTime));
                          const slotEnd = slot.isAllDay ? addDays(slotEndBase, -1) : slotEndBase;
                          const slotStartIndex = differenceInCalendarDays(slotStart, timelineRange.start);
                          const slotEndIndex = differenceInCalendarDays(slotEnd, timelineRange.start);
                          const slotGridStart = Math.max(1, slotStartIndex + 1);
                          const slotGridEnd = Math.max(slotGridStart + 1, slotEndIndex + 2);

                          return (
                            <Box
                              key={slot.id}
                              sx={{
                                gridColumn: `${slotGridStart} / ${slotGridEnd}`,
                                alignSelf: 'center',
                                height: 6,
                                borderRadius: 999,
                                backgroundColor: 'rgba(15, 23, 42, 0.35)',
                              }}
                            />
                          );
                        })}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {unscheduledRows.length > 0 && (
        <Paper sx={{ p: 2.5, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Unscheduled tasks
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1.5}>
            {unscheduledRows.map((row) => (
              <Box
                key={`unscheduled-${row.task.id}`}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {row.task.title}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={statusLabel(row.task.status)} color={statusColor(row.task.status)} />
                    <Chip size="small" label="No dates or slots" variant="outlined" />
                  </Stack>
                </Box>
                <Button onClick={() => navigate(`/tasks/${row.task.id}`)}>Add schedule</Button>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <Dialog
        open={cascadeDialogOpen}
        onClose={() => { setCascadeDialogOpen(false); setPendingShift(null); }}
      >
        <DialogTitle>Abhängige Tasks verschieben?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Dieser Task hat nachfolgende abhängige Tasks. Sollen diese mitbewegt werden?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={async () => {
            setCascadeDialogOpen(false);
            if (pendingShift) await shiftTaskSchedule(pendingShift.taskId, pendingShift.deltaDays, pendingShift.taskTitle, false);
            setPendingShift(null);
          }}>Nur diesen Task</Button>
          <Button variant="contained" onClick={async () => {
            setCascadeDialogOpen(false);
            if (pendingShift) await shiftTaskSchedule(pendingShift.taskId, pendingShift.deltaDays, pendingShift.taskTitle, true);
            setPendingShift(null);
          }}>Mit Abhängigkeiten</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(shiftSnackbar?.open)}
        autoHideDuration={5000}
        onClose={handleShiftSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleShiftSnackbarClose}
          severity="success"
          action={
            <Button color="inherit" size="small" onClick={handleShiftUndo}>
              Undo
            </Button>
          }
          sx={{ width: '100%' }}
        >
          {shiftSnackbar
            ? `${shiftSnackbar.taskTitle} shifted by ${
                shiftSnackbar.deltaDays > 0 ? '+' : ''
              }${shiftSnackbar.deltaDays} days`
            : 'Task shifted'}
        </Alert>
      </Snackbar>
    </Box>
  );
}
