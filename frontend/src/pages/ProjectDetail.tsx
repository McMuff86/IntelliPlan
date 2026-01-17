import { useEffect, useState } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formatISO, format } from 'date-fns';
import type { Project, Task, TaskStatus, SchedulingMode } from '../types';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import Breadcrumbs from '../components/Breadcrumbs';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('manual');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);

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
    } catch (err) {
      console.error(err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

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
      const created = await taskService.createInProject(project.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        schedulingMode,
        durationMinutes: durationMinutes === '' ? null : durationMinutes,
        startDate: startDate ? formatISO(startDate, { representation: 'date' }) : null,
        dueDate: dueDate ? formatISO(dueDate, { representation: 'date' }) : null,
      });
      setTasks((prev) => [created, ...prev]);
      resetForm();
    } catch (err) {
      console.error(err);
      setError('Failed to create task');
    } finally {
      setCreating(false);
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
        <Button variant="outlined" onClick={() => navigate('/projects')}>
          All Projects
        </Button>
      </Box>

      {project.description && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body1">{project.description}</Typography>
        </Paper>
      )}

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

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" gutterBottom>
          Tasks
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {tasks.length === 0 ? (
          <Typography color="text.secondary">No tasks yet. Create the first one above.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {tasks.map((task) => (
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
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {task.title}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip size="small" label={statusLabel(task.status)} color={statusColor(task.status)} />
                    {task.startDate && (
                      <Chip size="small" label={`Start: ${format(new Date(task.startDate), 'MMM d, yyyy')}`} variant="outlined" />
                    )}
                    {task.dueDate && (
                      <Chip size="small" label={`Due: ${format(new Date(task.dueDate), 'MMM d, yyyy')}`} variant="outlined" />
                    )}
                  </Stack>
                </Box>
                <Button variant="outlined" onClick={() => navigate(`/tasks/${task.id}`)}>
                  Open
                </Button>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
