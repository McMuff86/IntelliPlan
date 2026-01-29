import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  FormControlLabel,
  Switch,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { TaskTemplate, TemplateTask, TaskCategory } from '../../types';

const categories: { value: TaskCategory; label: string }[] = [
  { value: 'planning', label: 'Planung' },
  { value: 'procurement', label: 'Beschaffung' },
  { value: 'production', label: 'Produktion' },
  { value: 'treatment', label: 'Behandlung' },
  { value: 'assembly', label: 'Montage' },
  { value: 'delivery', label: 'Lieferung' },
  { value: 'approval', label: 'Freigabe' },
  { value: 'documentation', label: 'Dokumentation' },
];

interface TemplateEditorProps {
  open: boolean;
  template: TaskTemplate | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    tasks: TemplateTask[];
    isDefault: boolean;
  }) => void;
}

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyTask(order: number): TemplateTask {
  return {
    id: generateId(),
    order,
    name: '',
    durationUnit: 'days',
    category: 'planning',
    isOptional: false,
  };
}

export default function TemplateEditor({ open, template, onClose, onSave }: TemplateEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [tasks, setTasks] = useState<TemplateTask[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setIsDefault(template.isDefault);
      setTasks([...template.tasks]);
    } else {
      setName('');
      setDescription('');
      setIsDefault(false);
      setTasks([createEmptyTask(1)]);
    }
  }, [template, open]);

  const handleAddTask = () => {
    setTasks((prev) => [...prev, createEmptyTask(prev.length + 1)]);
  };

  const handleRemoveTask = (index: number) => {
    setTasks((prev) => {
      const removed = prev[index];
      const updated = prev.filter((_, i) => i !== index);
      // Remove dependencies on deleted task and reorder
      return updated.map((t, i) => ({
        ...t,
        order: i + 1,
        dependsOn: t.dependsOn?.filter((d) => d !== removed.id),
      }));
    });
  };

  const handleMoveTask = (index: number, direction: 'up' | 'down') => {
    setTasks((prev) => {
      const arr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= arr.length) return prev;
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return arr.map((t, i) => ({ ...t, order: i + 1 }));
    });
  };

  const handleTaskChange = (index: number, field: keyof TemplateTask, value: unknown) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = () => {
    onSave({ name, description, tasks, isDefault });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {template ? 'Template bearbeiten' : 'Neues Template erstellen'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Beschreibung"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
            }
            label="Standard"
            sx={{ minWidth: 120 }}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50 }}>#</TableCell>
                <TableCell>Aufgabe</TableCell>
                <TableCell sx={{ width: 130 }}>Kategorie</TableCell>
                <TableCell sx={{ width: 80 }}>Dauer</TableCell>
                <TableCell sx={{ width: 80 }}>Einheit</TableCell>
                <TableCell sx={{ width: 120 }}>Abhängig von</TableCell>
                <TableCell sx={{ width: 100 }}>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task, index) => (
                <TableRow key={task.id}>
                  <TableCell>{task.order}</TableCell>
                  <TableCell>
                    <TextField
                      value={task.name}
                      onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                      size="small"
                      fullWidth
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={task.category}
                      onChange={(e) => handleTaskChange(index, 'category', e.target.value)}
                      size="small"
                      fullWidth
                      variant="standard"
                    >
                      {categories.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={task.estimatedDuration ?? ''}
                      onChange={(e) =>
                        handleTaskChange(
                          index,
                          'estimatedDuration',
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      size="small"
                      variant="standard"
                      inputProps={{ min: 0, step: 0.5 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={task.durationUnit}
                      onChange={(e) => handleTaskChange(index, 'durationUnit', e.target.value)}
                      size="small"
                      variant="standard"
                      fullWidth
                    >
                      <MenuItem value="days">Tage</MenuItem>
                      <MenuItem value="hours">Std</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={(task.dependsOn || [])
                        .map((depId) => {
                          const depTask = tasks.find((t) => t.id === depId);
                          return depTask ? depTask.order : '';
                        })
                        .filter(Boolean)
                        .join(', ')}
                      onChange={(e) => {
                        const orderNums = e.target.value
                          .split(',')
                          .map((s) => parseInt(s.trim(), 10))
                          .filter((n) => !isNaN(n));
                        const depIds = orderNums
                          .map((order) => tasks.find((t) => t.order === order)?.id)
                          .filter((id): id is string => !!id);
                        handleTaskChange(index, 'dependsOn', depIds);
                      }}
                      size="small"
                      variant="standard"
                      placeholder="z.B. 1, 2"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveTask(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveTask(index, 'down')}
                      disabled={index === tasks.length - 1}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveTask(index)}
                      disabled={tasks.length <= 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Button startIcon={<AddIcon />} onClick={handleAddTask} sx={{ mt: 1 }}>
          Schritt hinzufügen
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || tasks.length === 0 || tasks.some((t) => !t.name.trim())}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
