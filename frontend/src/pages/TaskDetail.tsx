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
  FormControlLabel,
  Switch,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { format } from 'date-fns';
import axios from 'axios';
import type {
  DependencyType,
  Task,
  TaskDependency,
  TaskStatus,
  TaskWorkSlot,
} from '../types';
import { taskService } from '../services/taskService';
import Breadcrumbs from '../components/Breadcrumbs';

const dependencyOptions: DependencyType[] = ['finish_start', 'start_start', 'finish_finish'];

const dependencyLabel = (value: DependencyType) => {
  if (value === 'start_start') return 'Start to Start';
  if (value === 'finish_finish') return 'Finish to Finish';
  return 'Finish to Start';
};

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

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [workSlots, setWorkSlots] = useState<TaskWorkSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [dependsOnTaskId, setDependsOnTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState<DependencyType>('finish_start');

  const [slotStart, setSlotStart] = useState<Date | null>(null);
  const [slotEnd, setSlotEnd] = useState<Date | null>(null);
  const [slotFixed, setSlotFixed] = useState(false);
  const [shiftDays, setShiftDays] = useState<number | ''>('');
  const [cascadeShift, setCascadeShift] = useState(true);
  const [shiftBlock, setShiftBlock] = useState(false);

  const loadTask = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const taskData = await taskService.getById(id);
      setTask(taskData);

      const [tasksData, depsData, slotsData] = await Promise.all([
        taskService.getByProject(taskData.projectId),
        taskService.listDependencies(taskData.id),
        taskService.listWorkSlots(taskData.id),
      ]);

      setProjectTasks(tasksData);
      setDependencies(depsData);
      setWorkSlots(slotsData);
    } catch (err) {
      console.error(err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [id]);

  const dependencyMap = useMemo(() => {
    return new Map(projectTasks.map((t) => [t.id, t]));
  }, [projectTasks]);

  const isBlocked = useMemo(() => {
    return dependencies.some((dep) => {
      const depTask = dependencyMap.get(dep.dependsOnTaskId);
      return !depTask || depTask.status !== 'done';
    });
  }, [dependencies, dependencyMap]);
  const blockedNow = task?.isBlocked ?? isBlocked;

  const handleStartTask = async () => {
    if (!task) return;
    try {
      setActionLoading(true);
      const updated = await taskService.update(task.id, { status: 'in_progress' });
      setTask(updated);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string | { message?: string } } | undefined;
        const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(message || 'Failed to start task');
      } else {
        setError('Failed to start task');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDone = async () => {
    if (!task) return;
    try {
      setActionLoading(true);
      const updated = await taskService.update(task.id, { status: 'done' });
      setTask(updated);
    } catch (err) {
      console.error(err);
      setError('Failed to complete task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDependency = async () => {
    if (!task || !dependsOnTaskId) return;
    try {
      setActionLoading(true);
      const created = await taskService.createDependency(task.id, {
        dependsOnTaskId,
        dependencyType,
      });
      setDependencies((prev) => [...prev, created]);
      setDependsOnTaskId('');
    } catch (err) {
      console.error(err);
      setError('Failed to add dependency');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    if (!task) return;
    try {
      setActionLoading(true);
      await taskService.deleteDependency(task.id, dependencyId);
      setDependencies((prev) => prev.filter((dep) => dep.id !== dependencyId));
    } catch (err) {
      console.error(err);
      setError('Failed to remove dependency');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!task || !slotStart || !slotEnd) return;
    try {
      setActionLoading(true);
      const created = await taskService.createWorkSlot(task.id, {
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        isFixed: slotFixed,
      });
      setWorkSlots((prev) => [...prev, created].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setSlotStart(null);
      setSlotEnd(null);
      setSlotFixed(false);
    } catch (err) {
      console.error(err);
      setError('Failed to add work slot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShiftSchedule = async () => {
    if (!task || shiftDays === '' || Number.isNaN(shiftDays)) return;
    try {
      setActionLoading(true);
      await taskService.shiftSchedule(task.id, {
        deltaDays: Number(shiftDays),
        cascade: cascadeShift,
        shiftBlock,
      });
      await loadTask();
      setShiftDays('');
    } catch (err) {
      console.error(err);
      setError('Failed to shift schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSlot = async (slotId: string) => {
    if (!task) return;
    try {
      setActionLoading(true);
      await taskService.deleteWorkSlot(task.id, slotId);
      setWorkSlots((prev) => prev.filter((slot) => slot.id !== slotId));
    } catch (err) {
      console.error(err);
      setError('Failed to remove work slot');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !task) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Task not found'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  const availableDependencyTasks = projectTasks.filter((t) => t.id !== task.id);

  return (
    <Box>
      <Breadcrumbs
        items={[
          { label: 'Projects', path: '/projects' },
          { label: task.title },
        ]}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            {task.title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
            <Chip size="small" label={statusLabel(task.status)} color={statusColor(task.status)} />
            {blockedNow && task.status !== 'done' && task.status !== 'blocked' && (
              <Chip size="small" label="Blocked" color="warning" />
            )}
            {task.schedulingMode === 'auto' ? (
              <Chip size="small" label="Auto scheduling" variant="outlined" />
            ) : (
              <Chip size="small" label="Manual scheduling" variant="outlined" />
            )}
          </Stack>
        </Box>
        <Button variant="outlined" onClick={() => navigate('/projects')}>
          All Projects
        </Button>
      </Box>

      {blockedNow && task.status !== 'done' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This task is blocked by unfinished dependencies.
        </Alert>
      )}

      <Stack direction="row" spacing={2} mb={3}>
        {task.status === 'planned' && (
          <Button
            variant="contained"
            onClick={handleStartTask}
            disabled={blockedNow || actionLoading}
          >
            Start Task
          </Button>
        )}
        {task.status === 'in_progress' && (
          <Button
            variant="contained"
            onClick={handleMarkDone}
            disabled={actionLoading}
          >
            Mark Done
          </Button>
        )}
      </Stack>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Dependencies
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {dependencies.length === 0 ? (
          <Typography color="text.secondary">No dependencies yet.</Typography>
        ) : (
          <Stack spacing={1.5} mb={2}>
            {dependencies.map((dep) => (
              <Paper
                key={dep.id}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2">
                    {dependencyMap.get(dep.dependsOnTaskId)?.title || 'Unknown task'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dependencyLabel(dep.dependencyType)}
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => handleRemoveDependency(dep.id)}>
                  Remove
                </Button>
              </Paper>
            ))}
          </Stack>
        )}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label="Depends on"
            value={dependsOnTaskId}
            onChange={(event) => setDependsOnTaskId(event.target.value)}
            fullWidth
          >
            {availableDependencyTasks.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Dependency type"
            value={dependencyType}
            onChange={(event) => setDependencyType(event.target.value as DependencyType)}
            fullWidth
          >
            {dependencyOptions.map((value) => (
              <MenuItem key={value} value={value}>
                {dependencyLabel(value)}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddDependency}
            disabled={!dependsOnTaskId || actionLoading}
          >
            Add
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" gutterBottom>
          Work Slots
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {workSlots.length === 0 ? (
          <Typography color="text.secondary">No work slots yet.</Typography>
        ) : (
          <Stack spacing={1.5} mb={2}>
            {workSlots.map((slot) => (
              <Paper
                key={slot.id}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2">
                    {format(new Date(slot.startTime), 'MMM d, yyyy h:mm a')} - {format(new Date(slot.endTime), 'MMM d, yyyy h:mm a')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {slot.isFixed ? 'Fixed' : 'Flexible'}
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => handleRemoveSlot(slot.id)}>
                  Remove
                </Button>
              </Paper>
            ))}
          </Stack>
        )}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <DateTimePicker
              label="Start time"
              value={slotStart}
              onChange={(value) => setSlotStart(value)}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DateTimePicker
              label="End time"
              value={slotEnd}
              onChange={(value) => setSlotEnd(value)}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <FormControlLabel
              control={<Switch checked={slotFixed} onChange={(event) => setSlotFixed(event.target.checked)} />}
              label="Fixed"
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddSlot}
              disabled={!slotStart || !slotEnd || actionLoading}
            >
              Add slot
            </Button>
          </Stack>
        </LocalizationProvider>
      </Paper>

      <Paper sx={{ p: 2.5, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Shift Schedule
        </Typography>
        <Divider sx={{ mb: 2 }} />
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
          <FormControlLabel
            control={
              <Switch
                checked={cascadeShift}
                onChange={(event) => setCascadeShift(event.target.checked)}
                disabled={shiftBlock}
              />
            }
            label="Shift dependent tasks"
          />
          <FormControlLabel
            control={
              <Switch
                checked={shiftBlock}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setShiftBlock(checked);
                  if (checked) {
                    setCascadeShift(false);
                  }
                }}
              />
            }
            label="Shift entire dependency block"
          />
          <Button
            variant="contained"
            onClick={handleShiftSchedule}
            disabled={shiftDays === '' || actionLoading}
          >
            Shift Schedule
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
