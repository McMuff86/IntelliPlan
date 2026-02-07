import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Box,
  Autocomplete,
  Chip,
} from '@mui/material';
import type { Resource, WorkRole, Department, EmployeeType } from '../../types';
import { resourceService } from '../../services/resourceService';

// ─── Constants ─────────────────────────────────────────

const DEPT_OPTIONS: { value: Department; label: string }[] = [
  { value: 'zuschnitt', label: 'Zuschnitt' },
  { value: 'cnc', label: 'CNC' },
  { value: 'produktion', label: 'Produktion' },
  { value: 'behandlung', label: 'Behandlung' },
  { value: 'beschlaege', label: 'Beschl\u00e4ge' },
  { value: 'transport', label: 'Transport' },
  { value: 'montage', label: 'Montage' },
  { value: 'buero', label: 'B\u00fcro' },
];

const EMPLOYEE_TYPE_OPTIONS: { value: EmployeeType; label: string }[] = [
  { value: 'internal', label: 'Intern' },
  { value: 'temporary', label: 'Tempor\u00e4r' },
  { value: 'external_firm', label: 'Externe Firma' },
  { value: 'pensioner', label: 'Pension\u00e4r' },
  { value: 'apprentice', label: 'Lehrling' },
];

const WORK_ROLE_OPTIONS: { value: WorkRole; label: string }[] = [
  { value: 'arbeiter', label: 'Arbeiter' },
  { value: 'hilfskraft', label: 'Hilfskraft' },
  { value: 'lehrling', label: 'Lehrling' },
  { value: 'allrounder', label: 'Allrounder' },
  { value: 'buero', label: 'B\u00fcro' },
];

const FACHGEBIET_SUGGESTIONS = [
  'Lackierer',
  'Zwischenschliff',
  'Schreiner',
  'Monteur',
  'Elektriker',
  'Bodenleger',
  'Plattenleger',
  'Glaser',
];

const QUALIFICATION_SUGGESTIONS = [
  'qual:CNC',
  'qual:Hobelmaschine',
  'qual:Staplerschein',
  'qual:Kreiss\u00e4ge',
  'qual:Kantenanleimer',
  'qual:Spritzanlage',
  'qual:Abl\u00e4ngs\u00e4ge',
];

// ─── Props ─────────────────────────────────────────────

interface ResourceEditDialogProps {
  open: boolean;
  resourceId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ─────────────────────────────────────────

export default function ResourceEditDialog({
  open,
  resourceId,
  onClose,
  onSaved,
}: ResourceEditDialogProps) {
  const isEditMode = !!resourceId;

  // Form state
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [department, setDepartment] = useState<Department | ''>('');
  const [employeeType, setEmployeeType] = useState<EmployeeType | ''>('');
  const [workRole, setWorkRole] = useState<WorkRole>('arbeiter');
  const [weeklyHours, setWeeklyHours] = useState<string>('42.5');
  const [fachgebiete, setFachgebiete] = useState<string[]>([]);
  const [qualifikationen, setQualifikationen] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load resource data when editing
  useEffect(() => {
    if (!open) return;

    if (isEditMode && resourceId) {
      setLoading(true);
      setError(null);
      resourceService
        .getById(resourceId)
        .then((res: Resource) => {
          setName(res.name);
          setShortCode(res.shortCode || '');
          setDepartment(res.department || '');
          setEmployeeType(res.employeeType || '');
          setWorkRole(res.workRole || 'arbeiter');
          setWeeklyHours(res.weeklyHours != null ? String(res.weeklyHours) : '42.5');
          const skills = res.skills || [];
          setFachgebiete(skills.filter((s) => !s.startsWith('qual:')));
          setQualifikationen(skills.filter((s) => s.startsWith('qual:')));
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        })
        .finally(() => setLoading(false));
    } else {
      // Reset form for create mode
      setName('');
      setShortCode('');
      setDepartment('');
      setEmployeeType('');
      setWorkRole('arbeiter');
      setWeeklyHours('42.5');
      setFachgebiete([]);
      setQualifikationen([]);
      setError(null);
    }
  }, [open, isEditMode, resourceId]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    setSaving(true);
    setError(null);

    const skills = [...fachgebiete, ...qualifikationen];
    const data = {
      name: name.trim(),
      shortCode: shortCode.trim() || null,
      department: department || null,
      employeeType: employeeType || null,
      workRole,
      weeklyHours: weeklyHours ? parseFloat(weeklyHours) : null,
      skills: skills.length > 0 ? skills : null,
    };

    try {
      if (isEditMode && resourceId) {
        await resourceService.update(resourceId, data);
      } else {
        await resourceService.create({ ...data, resourceType: 'person' });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              size="small"
            />

            <TextField
              label="K\u00fcrzel"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              fullWidth
              size="small"
              placeholder="z.B. MA_01"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Abteilung</InputLabel>
              <Select
                value={department}
                label="Abteilung"
                onChange={(e) => setDepartment(e.target.value as Department | '')}
              >
                <MenuItem value="">
                  <em>Keine</em>
                </MenuItem>
                {DEPT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Anstellungsart</InputLabel>
              <Select
                value={employeeType}
                label="Anstellungsart"
                onChange={(e) => setEmployeeType(e.target.value as EmployeeType | '')}
              >
                <MenuItem value="">
                  <em>Keine</em>
                </MenuItem>
                {EMPLOYEE_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Arbeitsrolle</InputLabel>
              <Select
                value={workRole}
                label="Arbeitsrolle"
                onChange={(e) => setWorkRole(e.target.value as WorkRole)}
              >
                {WORK_ROLE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Wochenstunden"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              type="number"
              fullWidth
              size="small"
              slotProps={{ htmlInput: { min: 0, max: 168, step: 0.5 } }}
            />

            <Autocomplete
              multiple
              freeSolo
              options={FACHGEBIET_SUGGESTIONS}
              value={fachgebiete}
              onChange={(_, newVal) => setFachgebiete(newVal)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    size="small"
                    color="primary"
                    variant="outlined"
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Fachgebiete"
                  size="small"
                  placeholder="Fachgebiet eingeben..."
                />
              )}
            />

            <Autocomplete
              multiple
              freeSolo
              options={QUALIFICATION_SUGGESTIONS}
              value={qualifikationen}
              onChange={(_, newVal) =>
                setQualifikationen(
                  newVal.map((v) => (v.startsWith('qual:') ? v : `qual:${v}`))
                )
              }
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.replace('qual:', '')}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Qualifikationen"
                  size="small"
                  placeholder="Qualifikation eingeben..."
                />
              )}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || loading || !name.trim()}
        >
          {saving ? <CircularProgress size={20} /> : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
