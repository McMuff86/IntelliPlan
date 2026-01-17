import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { projectService } from '../services/projectService';
import type { Project } from '../types';
import EmptyState from '../components/EmptyState';
import axios from 'axios';

const defaultWorkdayStart = '08:00';
const defaultWorkdayEnd = '17:00';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [workdayStart, setWorkdayStart] = useState(defaultWorkdayStart);
  const [workdayEnd, setWorkdayEnd] = useState(defaultWorkdayEnd);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getAll();
      setProjects(data);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string | { message?: string } } | undefined;
        const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(message || 'Failed to load projects');
      } else {
        setError('Failed to load projects');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setIncludeWeekends(true);
    setWorkdayStart(defaultWorkdayStart);
    setWorkdayEnd(defaultWorkdayEnd);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const created = await projectService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        includeWeekends,
        workdayStart,
        workdayEnd,
      });
      setProjects((prev) => [created, ...prev]);
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string | { message?: string } } | undefined;
        const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(message || 'Failed to create project');
      } else {
        setError('Failed to create project');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Projects
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          New Project
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={2}>
          {[...Array(3)].map((_, index) => (
            <Grid key={index} size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={28} />
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="rounded" width="40%" height={24} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start planning tasks."
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid key={project.id} size={{ xs: 12, md: 4 }}>
              <Card
                onClick={() => navigate(`/projects/${project.id}`)}
                sx={{ cursor: 'pointer', height: '100%' }}
              >
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarMonthIcon color="primary" fontSize="small" />
                      <Typography variant="h6">{project.name}</Typography>
                    </Stack>
                    {project.description && (
                      <Typography variant="body2" color="text.secondary">
                        {project.description}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        label={project.includeWeekends ? 'Weekends included' : 'Weekdays only'}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`${project.workdayStart} - ${project.workdayEnd}`}
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Project</DialogTitle>
        <DialogContent>
          <TextField
            label="Project Name"
            fullWidth
            margin="normal"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <FormControlLabel
            control={
              <Switch
                checked={includeWeekends}
                onChange={(event) => setIncludeWeekends(event.target.checked)}
              />
            }
            label="Include weekends"
          />
          <Box display="flex" gap={2} mt={1}>
            <TextField
              label="Workday start"
              type="time"
              value={workdayStart}
              onChange={(event) => setWorkdayStart(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Workday end"
              type="time"
              value={workdayEnd}
              onChange={(event) => setWorkdayEnd(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
