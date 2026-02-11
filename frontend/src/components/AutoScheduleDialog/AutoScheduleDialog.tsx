import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formatISO } from 'date-fns';
import { de } from 'date-fns/locale/de';
import type {
  AutoSchedulePreviewResult,
  AutoScheduleTaskAction,
  Task,
} from '../../types';

interface AutoScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onPreview: (taskIds: string[], endDate: string) => Promise<AutoSchedulePreviewResult>;
  onSchedule: (taskIds: string[], endDate: string) => Promise<void>;
}

const actionLabel: Record<AutoScheduleTaskAction, string> = {
  create: 'Create',
  update: 'Update',
  unchanged: 'Unchanged',
  skipped: 'Skipped',
};

const actionColor: Record<
  AutoScheduleTaskAction,
  'default' | 'success' | 'warning'
> = {
  create: 'success',
  update: 'warning',
  unchanged: 'default',
  skipped: 'default',
};

export default function AutoScheduleDialog({
  open,
  onClose,
  tasks,
  onPreview,
  onSchedule,
}: AutoScheduleDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [preview, setPreview] = useState<AutoSchedulePreviewResult | null>(null);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasDuration = (task: Task) =>
    task.durationMinutes != null && task.durationMinutes > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    const ids = new Set<string>();
    tasks.forEach((task) => {
      if (hasDuration(task)) {
        ids.add(task.id);
      }
    });
    setSelectedIds(ids);
    setEndDate(null);
    setPreview(null);
    setPreviewSignature(null);
    setError(null);
  }, [open, tasks]);

  const orderedSelectedIds = useMemo(
    () => tasks.filter((task) => selectedIds.has(task.id)).map((task) => task.id),
    [selectedIds, tasks]
  );

  const formattedEndDate = endDate
    ? formatISO(endDate, { representation: 'date' })
    : null;

  const currentSignature = useMemo(() => {
    const datePart = formattedEndDate ?? '';
    return `${datePart}|${orderedSelectedIds.join(',')}`;
  }, [formattedEndDate, orderedSelectedIds]);

  useEffect(() => {
    if (!previewSignature || previewSignature === currentSignature) {
      return;
    }
    setPreview(null);
    setPreviewSignature(null);
  }, [currentSignature, previewSignature]);

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

  const selectedCount = orderedSelectedIds.length;
  const tasksWithoutDuration = tasks.filter((task) => !hasDuration(task));

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  };

  const ensureInput = (): string | null => {
    if (!formattedEndDate) {
      setError('Please select a deadline');
      return null;
    }
    if (selectedCount === 0) {
      setError('Please select at least one task');
      return null;
    }
    return formattedEndDate;
  };

  const handlePreview = async () => {
    const resolvedEndDate = ensureInput();
    if (!resolvedEndDate) {
      return;
    }

    try {
      setPreviewing(true);
      setError(null);
      const result = await onPreview(orderedSelectedIds, resolvedEndDate);
      setPreview(result);
      setPreviewSignature(currentSignature);
    } catch (err) {
      console.error(err);
      setError('Failed to generate scheduling preview');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSchedule = async () => {
    const resolvedEndDate = ensureInput();
    if (!resolvedEndDate) {
      return;
    }
    if (!preview || previewSignature !== currentSignature) {
      setError('Please generate a fresh preview before applying the plan');
      return;
    }

    try {
      setScheduling(true);
      setError(null);
      await onSchedule(orderedSelectedIds, resolvedEndDate);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to apply scheduling plan');
    } finally {
      setScheduling(false);
    }
  };

  const canApplyPlan = Boolean(
    preview &&
      previewSignature === currentSignature &&
      selectedCount > 0 &&
      formattedEndDate
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Auto-Schedule Tasks</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Generate a deterministic schedule proposal, review the delta, then apply.
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

          <Typography variant="subtitle2">Tasks (workflow order)</Typography>
          <List dense sx={{ maxHeight: 280, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {tasks.map((task) => {
              const disabled = !hasDuration(task);
              return (
                <ListItem key={task.id} disablePadding sx={{ opacity: disabled ? 0.55 : 1 }}>
                  <FormControlLabel
                    sx={{ width: '100%', ml: 0, px: 1.5, py: 0.5 }}
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
                            : `Duration: ${formatDuration(task.durationMinutes as number)}`
                        }
                      />
                    }
                  />
                </ListItem>
              );
            })}
          </List>

          {preview && (
            <>
              <Divider />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={`Create: ${preview.summary.createCount}`} color="success" variant="outlined" />
                <Chip size="small" label={`Update: ${preview.summary.updateCount}`} color="warning" variant="outlined" />
                <Chip size="small" label={`Unchanged: ${preview.summary.unchangedCount}`} variant="outlined" />
                <Chip size="small" label={`Skipped: ${preview.summary.skippedTaskCount}`} variant="outlined" />
                <Chip
                  size="small"
                  label={`Conflicts: ${preview.summary.conflictCount}`}
                  color={preview.summary.conflictCount > 0 ? 'error' : 'default'}
                  variant="outlined"
                />
              </Stack>

              {preview.warnings.length > 0 && (
                <Alert severity={preview.summary.conflictCount > 0 ? 'warning' : 'info'} variant="outlined">
                  <Typography variant="subtitle2">Preview warnings</Typography>
                  {preview.warnings.slice(0, 5).map((warning) => (
                    <Typography key={warning} variant="body2">
                      • {warning}
                    </Typography>
                  ))}
                </Alert>
              )}

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Planned task changes
                </Typography>
                <List dense sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {preview.tasks.map((task) => (
                    <ListItem key={task.taskId} sx={{ py: 0.75 }}>
                      <ListItemText
                        primary={task.title}
                        secondary={
                          task.action === 'skipped'
                            ? task.reason ?? 'Skipped'
                            : `${task.startDate ?? '-'} -> ${task.dueDate ?? '-'} (${task.slotCount} slot${task.slotCount === 1 ? '' : 's'})`
                        }
                      />
                      <Chip
                        size="small"
                        label={actionLabel[task.action]}
                        color={actionColor[task.action]}
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {preview.conflicts.length > 0 && (
                <Alert severity="error" variant="outlined">
                  <Typography variant="subtitle2">Detected resource conflicts</Typography>
                  {preview.conflicts.slice(0, 3).map((conflict, index) => (
                    <Typography key={`${conflict.taskId}-${index}`} variant="body2">
                      • {conflict.taskTitle} overlaps with {conflict.conflictTaskTitle}
                    </Typography>
                  ))}
                </Alert>
              )}
            </>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={previewing || scheduling}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          onClick={handlePreview}
          disabled={previewing || scheduling || selectedCount === 0 || !formattedEndDate}
        >
          {previewing ? 'Generating preview...' : 'Preview Plan'}
        </Button>
        <Button
          variant="contained"
          onClick={handleSchedule}
          disabled={!canApplyPlan || previewing || scheduling}
        >
          {scheduling ? 'Applying...' : `Apply Plan (${selectedCount})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
