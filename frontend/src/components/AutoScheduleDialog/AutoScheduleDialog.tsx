import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Alert,
  Typography,
  Stack,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formatISO } from 'date-fns';
import { de } from 'date-fns/locale/de';
import type { Task } from '../../types';

interface AutoScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onSchedule: (taskIds: string[], endDate: string) => Promise<void>;
}

export default function AutoScheduleDialog({ open, onClose, tasks, onSchedule }: AutoScheduleDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select tasks that have duration when dialog opens
  useMemo(() => {
    if (open) {
      const ids = new Set<string>();
      for (const task of tasks) {
        if (task.durationMinutes && task.durationMinutes > 0) {
          ids.add(task.id);
        }
      }
      setSelectedIds(ids);
      setError(null);
    }
  }, [open, tasks]);

  const hasDuration = (task: Task) => task.durationMinutes != null && task.durationMinutes > 0;

  const toggleTask = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const tasksWithoutDuration = tasks.filter((t) => !hasDuration(t));

  const handleSchedule = async () => {
    if (!endDate) {
      setError('Please select a deadline');
      return;
    }
    if (selectedCount === 0) {
      setError('Please select at least one task');
      return;
    }

    try {
      setScheduling(true);
      setError(null);
      // Maintain workflow order for selected tasks
      const orderedIds = tasks.filter((t) => selectedIds.has(t.id)).map((t) => t.id);
      await onSchedule(orderedIds, formatISO(endDate, { representation: 'date' }));
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to auto-schedule tasks');
    } finally {
      setScheduling(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Auto-Schedule Tasks</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Schedule tasks backward from a deadline. Tasks are planned in workflow order, with the last task ending at the deadline.
          </Typography>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
            <DatePicker
              label="Project Deadline"
              value={endDate}
              onChange={(date) => setEndDate(date)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>

          {tasksWithoutDuration.length > 0 && (
            <Alert severity="warning" variant="outlined">
              {tasksWithoutDuration.length} task(s) have no duration and will be skipped.
            </Alert>
          )}

          <Typography variant="subtitle2">Tasks (in workflow order)</Typography>

          <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
            {tasks.map((task) => {
              const disabled = !hasDuration(task);
              return (
                <ListItem key={task.id} disablePadding sx={{ opacity: disabled ? 0.5 : 1 }}>
                  <FormControlLabel
                    sx={{ width: '100%', ml: 0 }}
                    control={
                      <Checkbox
                        checked={selectedIds.has(task.id)}
                        onChange={() => toggleTask(task.id)}
                        disabled={disabled}
                      />
                    }
                    label={
                      <ListItemText
                        primary={task.title}
                        secondary={
                          disabled
                            ? 'No duration set'
                            : `Duration: ${formatDuration(task.durationMinutes!)}`
                        }
                      />
                    }
                  />
                </ListItem>
              );
            })}
          </List>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={scheduling}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSchedule}
          disabled={scheduling || selectedCount === 0 || !endDate}
        >
          {scheduling ? 'Scheduling...' : `Schedule ${selectedCount} Task${selectedCount !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
