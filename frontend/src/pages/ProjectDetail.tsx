import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  Alert,
  TextField,
  MenuItem,
  Divider,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimelineIcon from '@mui/icons-material/Timeline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formatISO, format, parseISO } from 'date-fns';
import type { Project, ProjectActivity, Task, TaskStatus, SchedulingMode } from '../types';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import Breadcrumbs from '../components/Breadcrumbs';
import axios from 'axios';

const statusOptions: TaskStatus[] = ['planned', 'in_progress', 'blocked', 'done'];
const schedulingOptions: SchedulingMode[] = ['manual', 'auto'];

const statusLabel = (status: TaskStatus) =>
  ({
    planned: 'Planned',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    done: 'Done',
  })[status];

const statusColor = (status: TaskStatus) => {
  if (status === 'done') return 'success';
  if (status === 'blocked') return 'warning';
  if (status === 'in_progress') return 'info';
  return 'default';
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [savingTaskTitle, setSavingTaskTitle] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('manual');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [shiftDays, setShiftDays] = useState<number | ''>('');
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  const loadProject = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [projectData, taskData] = await Promise.all([
        projectService.getById(id),
        taskService.getByProject(id),
      ]);
      setProject(projectData);
      setTasks(taskData);
      void loadActivity(projectData.id);
    } catch (err) {
      console.error(err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async (projectId: string) => {
    try {
      const data = await projectService.getActivity(projectId);
      setActivity(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshTasks = async (projectId: string) => {
    const taskData = await taskService.getByProject(projectId);
    setTasks(taskData);
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const sortedTasks = useMemo(() => {
    const list = [...tasks];
    list.sort((a, b) => {
      const result = a.title.localeCompare(b.title);
      return taskSortOrder === 'asc' ? result : -result;
    });
    return list;
  }, [tasks, taskSortOrder]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('planned');
    setSchedulingMode('manual');
    setDurationMinutes('');
    setStartDate(null);
    setDueDate(null);
  };

  const handleCreateTask = async () => {
    if (!project || !title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        schedulingMode,
        durationMinutes: durationMinutes === '' ? undefined : durationMinutes,
        startDate: startDate ? formatISO(startDate, { representation: 'date' }) : undefined,
        dueDate: dueDate ? formatISO(dueDate, { representation: 'date' }) : undefined,
      };
      const created = await taskService.createInProject(project.id, payload);
      setTasks((prev) => [created, ...prev]);
      resetForm();
      void loadActivity(project.id);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string | { message?: string } } | undefined;
        const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(message || 'Failed to create task');
      } else {
        setError('Failed to create task');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleShiftProject = async () => {
    if (!project || shiftDays === '' || Number.isNaN(shiftDays)) return;
    try {
      setShifting(true);
      setError(null);
      await projectService.shiftSchedule(project.id, { deltaDays: Number(shiftDays) });
      await refreshTasks(project.id);
      setShiftDays('');
      void loadActivity(project.id);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string | { message?: string } } | undefined;
        const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(message || 'Failed to shift project');
      } else {
        setError('Failed to shift project');
      }
    } finally {
      setShifting(false);
    }
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  const handleSaveTaskTitle = async (taskId: string) => {
    if (!project) return;
    const nextTitle = editingTaskTitle.trim();
    if (!nextTitle) {
      setError('Task title is required');
      return;
    }

    try {
      setSavingTaskTitle(true);
      setError(null);
      const updated = await taskService.update(taskId, { title: nextTitle });
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      cancelEditingTask();
      void loadActivity(project.id);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string | { message?: string } } | undefined;
        const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(message || 'Failed to update task title');
      } else {
        setError('Failed to update task title');
      }
    } finally {
      setSavingTaskTitle(false);
    }
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

  return (
    <Box>
      <Breadcrumbs
        items={[
          { label: 'Projects', path: '/projects' },
          { label: project.name },
        ]}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            {project.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {project.includeWeekends ? 'Weekends included' : 'Weekdays only'} · {project.workdayStart} - {project.workdayEnd}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/projects')}>
            All Projects
          </Button>
          <Button
            variant="contained"
            startIcon={<TimelineIcon />}
            onClick={() => navigate(`/projects/${project.id}/timeline`)}
          >
            Timeline
          </Button>
        </Stack>
      </Box>

      {project.description && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body1">{project.description}</Typography>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body2">
              {format(parseISO(project.createdAt), 'MMM d, yyyy h:mm a')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Last Updated
            </Typography>
            <Typography variant="body2">
              {format(parseISO(project.updatedAt), 'MMM d, yyyy h:mm a')}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Create Task
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            fullWidth
            multiline
            rows={3}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              fullWidth
            >
              {statusOptions.map((value) => (
                <MenuItem key={value} value={value}>
                  {statusLabel(value)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Scheduling Mode"
              value={schedulingMode}
              onChange={(event) => setSchedulingMode(event.target.value as SchedulingMode)}
              fullWidth
            >
              {schedulingOptions.map((value) => (
                <MenuItem key={value} value={value}>
                  {value === 'manual' ? 'Manual' : 'Auto'}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Duration (minutes)"
              type="number"
              value={durationMinutes}
              onChange={(event) => {
                const value = event.target.value;
                setDurationMinutes(value === '' ? '' : Number(value));
              }}
              fullWidth
            />
          </Stack>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Due Date"
                value={dueDate}
                onChange={(date) => setDueDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>
          </LocalizationProvider>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateTask}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Add Task'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Shift Project Schedule
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Move all tasks and work slots by a number of days. Tasks without dates stay unchanged.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Shift by (days)"
            type="number"
            value={shiftDays}
            onChange={(event) => {
              const value = event.target.value;
              setShiftDays(value === '' ? '' : Number(value));
            }}
            helperText="Use negative numbers to move earlier"
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleShiftProject}
            disabled={shiftDays === '' || shifting}
          >
            {shifting ? 'Shifting...' : 'Shift Project'}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Tasks</Typography>
          <TextField
            select
            label="Sort"
            size="small"
            value={taskSortOrder}
            onChange={(event) => setTaskSortOrder(event.target.value as 'asc' | 'desc')}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="asc">Title A-Z</MenuItem>
            <MenuItem value="desc">Title Z-A</MenuItem>
          </TextField>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {sortedTasks.length === 0 ? (
          <Typography color="text.secondary">No tasks yet. Create the first one above.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {sortedTasks.map((task) => (
              <Paper
                key={task.id}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {editingTaskId === task.id ? (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <TextField
                        label="Task title"
                        value={editingTaskTitle}
                        onChange={(event) => setEditingTaskTitle(event.target.value)}
                        size="small"
                        fullWidth
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSaveTaskTitle(task.id)}
                        disabled={savingTaskTitle}
                      >
                        Save
                      </Button>
                      <Button size="small" onClick={cancelEditingTask} disabled={savingTaskTitle}>
                        Cancel
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {task.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip size="small" label={statusLabel(task.status)} color={statusColor(task.status)} />
                        {task.isBlocked && task.status !== 'done' && task.status !== 'blocked' && (
                          <Chip size="small" label="Blocked" color="warning" />
                        )}
                        {task.startDate && (
                          <Chip size="small" label={`Start: ${format(new Date(task.startDate), 'MMM d, yyyy')}`} variant="outlined" />
                        )}
                        {task.dueDate && (
                          <Chip size="small" label={`Due: ${format(new Date(task.dueDate), 'MMM d, yyyy')}`} variant="outlined" />
                        )}
                      </Stack>
                    </>
                  )}
                </Box>
                {editingTaskId !== task.id && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button variant="outlined" onClick={() => startEditingTask(task)}>
                      Rename
                    </Button>
                    <Button variant="outlined" onClick={() => navigate(`/tasks/${task.id}`)}>
                      Open
                    </Button>
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper sx={{ p: 2.5, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Activity History
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {activity.length === 0 ? (
          <Typography color="text.secondary">No activity yet.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {activity.map((entry, index) => {
              const actorLabel = entry.actorUserId ? entry.actorUserId : 'unknown';
              const shortActor = entry.actorUserId ? `${entry.actorUserId.slice(0, 8)}...` : 'unknown';
              return (
                <Paper
                  key={`${entry.id}-${index}`}
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Entry #{activity.length - index}
                    </Typography>
                    <Typography variant="subtitle2">{entry.summary}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mt={1}>
                      <Chip size="small" label={entry.entityType.replace('_', ' ')} variant="outlined" />
                      <Chip size="small" label={entry.action} variant="outlined" />
                    </Stack>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography variant="caption" color="text.secondary">
                      {format(parseISO(entry.createdAt), 'MMM d, yyyy h:mm a')}
                    </Typography>
                    <Tooltip title={actorLabel}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Actor: {shortActor}
                      </Typography>
                    </Tooltip>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
