import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { WeekPlanResource, DayAssignmentDetail } from '../../services/wochenplanService';
import {
  assignmentService,
  type HalfDay,
  type StatusCode,
} from '../../services/assignmentService';

// ─── Types ─────────────────────────────────────────────

export interface AssignmentDialogProps {
  open: boolean;
  taskId: string;
  date: string;
  dayName: string;
  halfDay: HalfDay;
  department: string;
  taskInfo: {
    projectOrderNumber: string;
    customerName: string;
    description: string;
  };
  /** Existing assignment detail (edit mode) or null (create mode) */
  existingAssignment: DayAssignmentDetail | null;
  /** Available resources for the department (pre-loaded) */
  resources: WeekPlanResource[];
  onSave: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: StatusCode; label: string }[] = [
  { value: 'assigned', label: 'Zugewiesen' },
  { value: 'available', label: 'Verfügbar' },
  { value: 'sick', label: 'Krank' },
  { value: 'vacation', label: 'Ferien' },
  { value: 'training', label: 'Schule' },
  { value: 'other', label: 'Andere' },
];

const HALF_DAY_OPTIONS: { value: HalfDay; label: string }[] = [
  { value: 'morning', label: 'VM' },
  { value: 'afternoon', label: 'NM' },
  { value: 'full_day', label: 'Ganztag' },
];

// ─── Component ─────────────────────────────────────────

export default function AssignmentDialog({
  open,
  taskId,
  date,
  dayName,
  halfDay: initialHalfDay,
  department,
  taskInfo,
  existingAssignment,
  resources,
  onSave,
  onClose,
}: AssignmentDialogProps) {
  const isEditMode = existingAssignment !== null;

  // ─── Form State ─────────────────────────────────────
  const [resourceId, setResourceId] = useState<string>('');
  const [selectedHalfDay, setSelectedHalfDay] = useState<HalfDay>(initialHalfDay);
  const [statusCode, setStatusCode] = useState<StatusCode>('assigned');
  const [notes, setNotes] = useState<string>('');
  const [isFixed, setIsFixed] = useState<boolean>(false);

  // ─── UI State ───────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Initialize form from existing assignment ───────
  const initializeForm = useCallback(() => {
    if (existingAssignment) {
      setResourceId(existingAssignment.resourceId);
      setSelectedHalfDay(existingAssignment.halfDay as HalfDay);
      setStatusCode((existingAssignment.statusCode as StatusCode) || 'assigned');
      setNotes(existingAssignment.notes || '');
      setIsFixed(existingAssignment.isFixed);
    } else {
      setResourceId('');
      setSelectedHalfDay(initialHalfDay);
      setStatusCode('assigned');
      setNotes('');
      setIsFixed(false);
    }
    setError(null);
  }, [existingAssignment, initialHalfDay]);

  useEffect(() => {
    if (open) {
      initializeForm();
    }
  }, [open, initializeForm]);

  // ─── Handlers ───────────────────────────────────────

  const handleSave = async () => {
    if (!resourceId) {
      setError('Bitte einen Mitarbeiter auswählen');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditMode && existingAssignment) {
        await assignmentService.updateAssignment(existingAssignment.assignmentId, {
          resourceId,
          halfDay: selectedHalfDay,
          statusCode,
          notes: notes || null,
          isFixed,
        });
      } else {
        await assignmentService.createAssignment(taskId, {
          resourceId,
          assignmentDate: date,
          halfDay: selectedHalfDay,
          statusCode,
          notes: notes || null,
          isFixed,
        });
      }
      onSave();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
        if (axiosErr.response?.status === 409) {
          setError('Diese Zuordnung existiert bereits (gleicher MA, Tag und Halbtag)');
        } else {
          setError(axiosErr.response?.data?.error || 'Fehler beim Speichern');
        }
      } else {
        setError('Fehler beim Speichern');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingAssignment) return;

    setDeleting(true);
    setError(null);

    try {
      await assignmentService.deleteAssignment(existingAssignment.assignmentId);
      onSave();
    } catch {
      setError('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const handleResourceChange = (e: SelectChangeEvent<string>) => {
    setResourceId(e.target.value);
  };

  const handleStatusChange = (e: SelectChangeEvent<string>) => {
    setStatusCode(e.target.value as StatusCode);
  };

  const handleHalfDayChange = (
    _: React.MouseEvent<HTMLElement>,
    value: HalfDay | null
  ) => {
    if (value !== null) {
      setSelectedHalfDay(value);
    }
  };

  // Filter resources by department (show all if department is unknown)
  const filteredResources = department
    ? resources.filter(
        (r) => r.department === department || !r.department
      )
    : resources;

  const isProcessing = saving || deleting;

  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {isEditMode ? 'Zuordnung bearbeiten' : 'Neue Zuordnung'}
      </DialogTitle>

      <DialogContent>
        {/* Task Info */}
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Auftrag
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {taskInfo.projectOrderNumber || '—'} · {taskInfo.customerName || '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {taskInfo.description || '—'}
          </Typography>
        </Box>

        {/* Date/Day Info */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Datum
          </Typography>
          <Typography variant="body1">
            {dayName}, {date}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Resource Dropdown */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="resource-select-label">Mitarbeiter</InputLabel>
          <Select
            labelId="resource-select-label"
            value={resourceId}
            onChange={handleResourceChange}
            label="Mitarbeiter"
            disabled={isProcessing}
          >
            {filteredResources.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.shortCode ? `${r.shortCode} – ` : ''}{r.name}
              </MenuItem>
            ))}
            {filteredResources.length === 0 && (
              <MenuItem disabled value="">
                Keine Mitarbeiter verfügbar
              </MenuItem>
            )}
          </Select>
        </FormControl>

        {/* Half-Day Toggle */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            Zeitraum
          </Typography>
          <ToggleButtonGroup
            value={selectedHalfDay}
            exclusive
            onChange={handleHalfDayChange}
            size="small"
            disabled={isProcessing}
          >
            {HALF_DAY_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Status */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="status-select-label">Status</InputLabel>
          <Select
            labelId="status-select-label"
            value={statusCode}
            onChange={handleStatusChange}
            label="Status"
            disabled={isProcessing}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Notes */}
        <TextField
          fullWidth
          label="Notizen"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={2}
          sx={{ mb: 2 }}
          disabled={isProcessing}
        />

        {/* Is Fixed Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={isFixed}
              onChange={(e) => setIsFixed(e.target.checked)}
              disabled={isProcessing}
            />
          }
          label="Fix (fester Termin)"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {/* Delete button (only in edit mode) */}
        {isEditMode && (
          <IconButton
            onClick={handleDelete}
            disabled={isProcessing}
            color="error"
            sx={{ mr: 'auto' }}
            title="Zuordnung löschen"
          >
            {deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          </IconButton>
        )}

        <Button onClick={onClose} disabled={isProcessing}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isProcessing || !resourceId}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
