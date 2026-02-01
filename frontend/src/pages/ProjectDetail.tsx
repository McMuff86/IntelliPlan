import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimelineIcon from '@mui/icons-material/Timeline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RestoreIcon from '@mui/icons-material/Restore';
import EventIcon from '@mui/icons-material/Event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formatISO, format, parseISO } from 'date-fns';
import type { Project, ProjectActivity, Resource, ResourceType, Task, TaskStatus, SchedulingMode } from '../types';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { resourceService } from '../services/resourceService';
import Breadcrumbs from '../components/Breadcrumbs';
import AutoScheduleDialog from '../components/AutoScheduleDialog/AutoScheduleDialog';
import axios from 'axios';

const statusOptions: TaskStatus[] = ['planned', 'in_progress', 'blocked', 'done'];
const schedulingOptions: SchedulingMode[] = ['manual', 'auto'];
const resourceTypeOptions: ResourceType[] = ['person', 'machine', 'vehicle'];
const defaultLayoutOrder = ['tasks', 'create', 'resources', 'activity', 'shift'] as const;
type LayoutSectionKey = (typeof defaultLayoutOrder)[number];
const layoutSectionLabels: Record<LayoutSectionKey, string> = {
  tasks: 'Tasks',
  create: 'Create Task',
  resources: 'Resources',
  activity: 'Activity History',
  shift: 'Shift Project Schedule',
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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [savingTaskTitle, setSavingTaskTitle] = useState(false);
  const [creatingResource, setCreatingResource] = useState(false);
  const [updatingResourceId, setUpdatingResourceId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('manual');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [resourceLabel, setResourceLabel] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [shiftDays, setShiftDays] = useState<number | ''>('');
  const [taskSortOrder, setTaskSortOrder] = useState<
    'title_asc' | 'title_desc' | 'start_asc' | 'start_desc' | 'due_asc' | 'due_desc' | 'created_asc' | 'created_desc' | 'workflow'
  >('workflow');
  const [taskFilter, setTaskFilter] = useState<'all' | 'overdue' | 'date_range'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<Date | null>(null);
  const [taskDependencies, setTaskDependencies] = useState<Map<string, string[]>>(new Map());
  const [resetting, setResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [layoutOrder, setLayoutOrder] = useState<LayoutSectionKey[]>([...defaultLayoutOrder]);
  const [draggingSection, setDraggingSection] = useState<LayoutSectionKey | null>(null);
  const [layoutTemplates, setLayoutTemplates] = useState<Record<string, LayoutSectionKey[]>>({});
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');

  const [resourceName, setResourceName] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('person');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceActive, setResourceActive] = useState(true);
  const [resourceAvailabilityEnabled, setResourceAvailabilityEnabled] = useState(false);

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
      void loadResources();
      void loadDependencies(taskData);
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

  const loadResources = async () => {
    try {
      const data = await resourceService.getAll();
      setResources(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDependencies = async (taskList: Task[]) => {
    const depMap = new Map<string, string[]>();
    try {
      for (const task of taskList) {
        const deps = await taskService.listDependencies(task.id);
        if (deps.length > 0) {
          depMap.set(task.id, deps.map((d) => d.dependsOnTaskId));
        }
      }
    } catch (err) {
      console.error('Failed to load dependencies', err);
    }
    setTaskDependencies(depMap);
  };

  const refreshTasks = async (projectId: string) => {
    const taskData = await taskService.getByProject(projectId);
    setTasks(taskData);
    void loadDependencies(taskData);
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  useEffect(() => {
    const storedTemplates = localStorage.getItem('projectLayoutTemplates');
    if (storedTemplates) {
      try {
        const parsed = JSON.parse(storedTemplates) as Record<string, LayoutSectionKey[]>;
        setLayoutTemplates(parsed);
      } catch {
        setLayoutTemplates({});
      }
    }
  }, []);

  useEffect(() => {
    if (!project?.id) return;
    const stored = localStorage.getItem(`projectLayout:${project.id}`);
    if (!stored) {
      setLayoutOrder([...defaultLayoutOrder]);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as LayoutSectionKey[];
      const normalized = normalizeLayoutOrder(parsed);
      setLayoutOrder(normalized);
    } catch {
      setLayoutOrder([...defaultLayoutOrder]);
    }
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id) return;
    localStorage.setItem(`projectLayout:${project.id}`, JSON.stringify(layoutOrder));
  }, [layoutOrder, project?.id]);

  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  };

  const filteredAndSortedTasks = useMemo(() => {
    // 1. Filter
    let list = [...tasks];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (taskFilter === 'overdue') {
      list = list.filter((t) => {
        if (!t.dueDate || t.status === 'done') return false;
        return new Date(t.dueDate) < now;
      });
    } else if (taskFilter === 'date_range') {
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        if (filterDateFrom && due < filterDateFrom) return false;
        if (filterDateTo) {
          const toEnd = new Date(filterDateTo);
          toEnd.setHours(23, 59, 59, 999);
          if (due > toEnd) return false;
        }
        return true;
      });
    }

    // 2. Sort
    if (taskSortOrder === 'workflow') {
      // Topological sort using dependencies
      const taskIds = new Set(list.map((t) => t.id));
      const inDegree = new Map<string, number>();
      const adjacency = new Map<string, string[]>();
      for (const t of list) {
        inDegree.set(t.id, 0);
        adjacency.set(t.id, []);
      }
      for (const t of list) {
        const deps = taskDependencies.get(t.id) || [];
        for (const depId of deps) {
          if (taskIds.has(depId)) {
            inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
            adjacency.get(depId)?.push(t.id);
          }
        }
      }
      const queue: string[] = [];
      for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
      }
      // Stable sort: among tasks with same in-degree, sort by createdAt
      queue.sort((a, b) => {
        const ta = list.find((t) => t.id === a)!;
        const tb = list.find((t) => t.id === b)!;
        return new Date(ta.createdAt).getTime() - new Date(tb.createdAt).getTime();
      });
      const sorted: Task[] = [];
      const taskMap = new Map(list.map((t) => [t.id, t]));
      while (queue.length > 0) {
        const current = queue.shift()!;
        sorted.push(taskMap.get(current)!);
        const neighbors = adjacency.get(current) || [];
        for (const neighbor of neighbors) {
          const newDeg = (inDegree.get(neighbor) || 1) - 1;
          inDegree.set(neighbor, newDeg);
          if (newDeg === 0) {
            // Insert in createdAt order
            const nt = taskMap.get(neighbor)!;
            const insertIdx = queue.findIndex((qId) => {
              const qt = taskMap.get(qId)!;
              return new Date(qt.createdAt).getTime() > new Date(nt.createdAt).getTime();
            });
            if (insertIdx === -1) queue.push(neighbor);
            else queue.splice(insertIdx, 0, neighbor);
          }
        }
      }
      // Add any remaining tasks (cycles, if any)
      for (const t of list) {
        if (!sorted.find((s) => s.id === t.id)) sorted.push(t);
      }
      return sorted;
    }

    list.sort((a, b) => {
      switch (taskSortOrder) {
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'start_asc': {
          const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
          return aTime - bTime;
        }
        case 'start_desc': {
          const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.NEGATIVE_INFINITY;
          const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.NEGATIVE_INFINITY;
          return bTime - aTime;
        }
        case 'due_asc': {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
          return aTime - bTime;
        }
        case 'due_desc': {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.NEGATIVE_INFINITY;
          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.NEGATIVE_INFINITY;
          return bTime - aTime;
        }
        case 'created_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'created_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
    return list;
  }, [tasks, taskSortOrder, taskFilter, filterDateFrom, filterDateTo, taskDependencies]);

  const normalizeLayoutOrder = (order: LayoutSectionKey[]) => {
    const seen = new Set<LayoutSectionKey>();
    const filtered = order.filter((item) => {
      if (!defaultLayoutOrder.includes(item)) return false;
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
    defaultLayoutOrder.forEach((key) => {
      if (!seen.has(key)) filtered.push(key);
    });
    return filtered;
  };

  const moveLayoutItem = (source: LayoutSectionKey, target: LayoutSectionKey) => {
    if (source === target) return;
    const next = [...layoutOrder];
    const sourceIndex = next.indexOf(source);
    const targetIndex = next.indexOf(target);
    if (sourceIndex === -1 || targetIndex === -1) return;
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    setLayoutOrder(next);
  };

  const handleDragStart = (section: LayoutSectionKey) => (event: React.DragEvent) => {
    setDraggingSection(section);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', section);
  };

  const handleDrop = (target: LayoutSectionKey) => (event: React.DragEvent) => {
    event.preventDefault();
    const source = (event.dataTransfer.getData('text/plain') as LayoutSectionKey) || draggingSection;
    if (!source) return;
    moveLayoutItem(source, target);
    setDraggingSection(null);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleSaveTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) return;
    const nextTemplates = { ...layoutTemplates, [name]: layoutOrder };
    setLayoutTemplates(nextTemplates);
    localStorage.setItem('projectLayoutTemplates', JSON.stringify(nextTemplates));
    setSelectedTemplate(name);
    setNewTemplateName('');
  };

  const handleLoadTemplate = (name: string) => {
    const template = layoutTemplates[name];
    if (!template) return;
    setLayoutOrder(normalizeLayoutOrder(template));
  };

  const handleResetLayout = () => {
    setLayoutOrder([...defaultLayoutOrder]);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('planned');
    setSchedulingMode('manual');
    setDurationMinutes('');
    setResourceLabel('');
    setResourceId('');
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
        resourceLabel: resourceLabel.trim() || undefined,
        resourceId: resourceId || undefined,
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

  const handleResetTemplate = async () => {
    if (!project) return;
    try {
      setResetting(true);
      setError(null);
      await projectService.resetToTemplate(project.id);
      await refreshTasks(project.id);
      void loadActivity(project.id);
      setResetDialogOpen(false);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string | { message?: string } } | undefined;
        const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(message || 'Failed to reset template');
      } else {
        setError('Failed to reset template');
      }
    } finally {
      setResetting(false);
    }
  };

  const handleAutoSchedule = async (taskIds: string[], endDate: string) => {
    if (!project) return;
    await projectService.autoSchedule(project.id, { taskIds, endDate });
    await refreshTasks(project.id);
    void loadActivity(project.id);
  };

  const resetResourceForm = () => {
    setResourceName('');
    setResourceType('person');
    setResourceDescription('');
    setResourceActive(true);
    setResourceAvailabilityEnabled(false);
  };

  const handleCreateResource = async () => {
    const name = resourceName.trim();
    if (!name) {
      setError('Resource name is required');
      return;
    }

    try {
      setCreatingResource(true);
      setError(null);
      const created = await resourceService.create({
        name,
        resourceType,
        description: resourceDescription.trim() || null,
        isActive: resourceActive,
        availabilityEnabled: resourceAvailabilityEnabled,
      });
      setResources((prev) => [created, ...prev]);
      resetResourceForm();
    } catch (err) {
      console.error(err);
      setError('Failed to create resource');
    } finally {
      setCreatingResource(false);
    }
  };

  const updateResource = async (resourceIdToUpdate: string, payload: Partial<Resource>) => {
    try {
      setUpdatingResourceId(resourceIdToUpdate);
      const updated = await resourceService.update(resourceIdToUpdate, {
        name: payload.name,
        resourceType: payload.resourceType,
        description: payload.description,
        isActive: payload.isActive,
        availabilityEnabled: payload.availabilityEnabled,
      });
      setResources((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      console.error(err);
      setError('Failed to update resource');
    } finally {
      setUpdatingResourceId(null);
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

  const sectionActions: Partial<Record<LayoutSectionKey, ReactNode>> = {
    tasks: (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <TextField
          select
          label="Sort"
          size="small"
          value={taskSortOrder}
          onChange={(event) =>
            setTaskSortOrder(
              event.target.value as typeof taskSortOrder
            )
          }
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="title_asc">Title A-Z</MenuItem>
          <MenuItem value="title_desc">Title Z-A</MenuItem>
          <MenuItem value="start_asc">Start date (oldest)</MenuItem>
          <MenuItem value="start_desc">Start date (newest)</MenuItem>
          <MenuItem value="due_asc">Due date (oldest)</MenuItem>
          <MenuItem value="due_desc">Due date (newest)</MenuItem>
          <MenuItem value="created_asc">Created (oldest)</MenuItem>
          <MenuItem value="created_desc">Created (newest)</MenuItem>
          <MenuItem value="workflow">Workflow order</MenuItem>
        </TextField>
        <TextField
          select
          label="Filter"
          size="small"
          value={taskFilter}
          onChange={(event) => setTaskFilter(event.target.value as 'all' | 'overdue' | 'date_range')}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="overdue">Overdue</MenuItem>
          <MenuItem value="date_range">Date range</MenuItem>
        </TextField>
        {taskFilter === 'date_range' && (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="From"
              value={filterDateFrom}
              onChange={(date) => setFilterDateFrom(date)}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 140 } } }}
            />
            <DatePicker
              label="To"
              value={filterDateTo}
              onChange={(date) => setFilterDateTo(date)}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 140 } } }}
            />
          </LocalizationProvider>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<EventIcon />}
          onClick={() => setAutoScheduleOpen(true)}
        >
          Schedule Tasks
        </Button>
        {project?.taskTemplateId && (
          <Tooltip title="Reset tasks to template defaults">
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestoreIcon />}
              onClick={() => setResetDialogOpen(true)}
              disabled={resetting}
            >
              {resetting ? 'Resetting...' : 'Reset'}
            </Button>
          </Tooltip>
        )}
      </Stack>
    ),
  };

  const sectionContent: Record<LayoutSectionKey, ReactNode> = {
    create: (
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
            <TextField
              select
              label="Assigned resource"
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
              fullWidth
            >
              <MenuItem value="">Unassigned</MenuItem>
              {resources
                .filter((resource) => resource.isActive)
                .map((resource) => (
                  <MenuItem key={resource.id} value={resource.id}>
                    {resource.name} ({resource.resourceType})
                  </MenuItem>
                ))}
            </TextField>
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
        <TextField
          label="Resource note"
          value={resourceLabel}
          onChange={(event) => setResourceLabel(event.target.value)}
          fullWidth
        />
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
    ),
    resources: (
      <Stack spacing={2}>
        <Stack spacing={2}>
          <TextField
            label="Resource name"
            value={resourceName}
            onChange={(event) => setResourceName(event.target.value)}
            fullWidth
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              select
              label="Resource type"
              value={resourceType}
              onChange={(event) => setResourceType(event.target.value as ResourceType)}
              fullWidth
            >
              {resourceTypeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={resourceActive}
                  onChange={(event) => setResourceActive(event.target.checked)}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={resourceAvailabilityEnabled}
                  onChange={(event) => setResourceAvailabilityEnabled(event.target.checked)}
                />
              }
              label="Availability enabled"
            />
          </Stack>
          <TextField
            label="Description"
            value={resourceDescription}
            onChange={(event) => setResourceDescription(event.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <Button
            variant="contained"
            onClick={handleCreateResource}
            disabled={creatingResource}
          >
            {creatingResource ? 'Creating...' : 'Add Resource'}
          </Button>
        </Stack>

        <Divider />

        <Typography variant="body2" color="text.secondary">
          Availability toggles are stored now; scheduling rules will be applied in a future update.
        </Typography>

        {resources.length === 0 ? (
          <Typography color="text.secondary">No resources yet. Add people, machines, or vehicles to get started.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {resources.map((resource) => (
              <Paper
                key={resource.id}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2">{resource.name}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mt={1}>
                    <Chip size="small" label={resource.resourceType} variant="outlined" />
                    <Chip
                      size="small"
                      label={resource.isActive ? 'Active' : 'Inactive'}
                      color={resource.isActive ? 'success' : 'default'}
                    />
                    <Chip
                      size="small"
                      label={resource.availabilityEnabled ? 'Availability on' : 'Availability off'}
                      variant="outlined"
                    />
                  </Stack>
                  {resource.description && (
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {resource.description}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={resource.isActive}
                        onChange={(event) =>
                          updateResource(resource.id, { isActive: event.target.checked })
                        }
                        disabled={updatingResourceId === resource.id}
                      />
                    }
                    label="Active"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={resource.availabilityEnabled}
                        onChange={(event) =>
                          updateResource(resource.id, { availabilityEnabled: event.target.checked })
                        }
                        disabled={updatingResourceId === resource.id}
                      />
                    }
                    label="Availability"
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    ),
    shift: (
      <>
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
      </>
    ),
    tasks: (
      <>
        {filteredAndSortedTasks.length === 0 ? (
          <Typography color="text.secondary">No tasks yet. Create one to get started.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {filteredAndSortedTasks.map((task) => (
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
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
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
                          <Chip
                            size="small"
                            label={`Start: ${format(new Date(task.startDate), 'MMM d, yyyy')}`}
                            variant="outlined"
                          />
                        )}
                        {task.dueDate && (
                          <Chip
                            size="small"
                            label={`Due: ${format(new Date(task.dueDate), 'MMM d, yyyy')}`}
                            variant="outlined"
                          />
                        )}
                        {task.durationMinutes ? (
                          <Chip
                            size="small"
                            label={`Duration: ${formatDuration(task.durationMinutes)}`}
                            variant="outlined"
                          />
                        ) : null}
                        {task.resourceName ? (
                          <Chip
                            size="small"
                            label={`Resource: ${task.resourceName}${task.resourceType ? ` (${task.resourceType})` : ''}`}
                            variant="outlined"
                          />
                        ) : task.resourceLabel ? (
                          <Chip
                            size="small"
                            label={`Resource: ${task.resourceLabel}`}
                            variant="outlined"
                          />
                        ) : null}
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
      </>
    ),
    activity: (
      <>
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
      </>
    ),
  };

  const renderSection = (sectionKey: LayoutSectionKey) => (
    <Paper
      key={sectionKey}
      onDrop={handleDrop(sectionKey)}
      onDragOver={handleDragOver}
      sx={{
        p: 2.5,
        mb: 3,
        border: draggingSection === sectionKey ? '1px dashed rgba(15, 23, 42, 0.3)' : '1px solid transparent',
        transition: 'border-color 0.2s ease',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Drag to reorder">
            <Box
              draggable
              onDragStart={handleDragStart(sectionKey)}
              onDragEnd={() => setDraggingSection(null)}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: 'text.secondary' }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          </Tooltip>
          <Typography variant="h6">{layoutSectionLabels[sectionKey]}</Typography>
        </Box>
        {sectionActions[sectionKey]}
      </Box>
      <Divider sx={{ mb: 2 }} />
      {sectionContent[sectionKey]}
    </Paper>
  );

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
            {project.includeWeekends ? 'Weekends included' : 'Weekdays only'} | {project.workdayStart} - {project.workdayEnd}
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

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Layout
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drag sections by the handle to reorder. Save templates to reuse layouts.
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              select
              label="Template"
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
              fullWidth
            >
              <MenuItem value="">Select template</MenuItem>
              {Object.keys(layoutTemplates).map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              onClick={() => handleLoadTemplate(selectedTemplate)}
              disabled={!selectedTemplate}
            >
              Load
            </Button>
            <Button variant="outlined" onClick={handleResetLayout}>
              Reset Default
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              label="New template name"
              value={newTemplateName}
              onChange={(event) => setNewTemplateName(event.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleSaveTemplate}
              disabled={!newTemplateName.trim()}
            >
              Save Template
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {layoutOrder.map((sectionKey) => renderSection(sectionKey))}

      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset to Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            All existing tasks will be deleted and replaced with the default template workflow. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)} disabled={resetting}>
            Cancel
          </Button>
          <Button onClick={handleResetTemplate} color="error" variant="contained" disabled={resetting}>
            {resetting ? 'Resetting...' : 'Reset'}
          </Button>
        </DialogActions>
      </Dialog>

      <AutoScheduleDialog
        open={autoScheduleOpen}
        onClose={() => setAutoScheduleOpen(false)}
        tasks={filteredAndSortedTasks}
        onSchedule={handleAutoSchedule}
      />
    </Box>
  );
}

