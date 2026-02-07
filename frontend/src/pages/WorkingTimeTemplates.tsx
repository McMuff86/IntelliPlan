import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import Breadcrumbs from '../components/Breadcrumbs';
import {
  workingTimeService,
  type WorkingTimeTemplateResponse,
  type WorkingTimeSlotInput,
  type CreateTemplateDTO,
} from '../services/workingTimeService';

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

interface SlotFormEntry {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const defaultSlotForm = (): SlotFormEntry[] =>
  [1, 2, 3, 4, 5, 6, 0].map((day) => ({
    dayOfWeek: day,
    enabled: day >= 1 && day <= 5,
    startTime: '07:00',
    endTime: '17:00',
  }));

const slotsFromForm = (entries: SlotFormEntry[]): WorkingTimeSlotInput[] =>
  entries
    .filter((e) => e.enabled)
    .map((e) => ({ dayOfWeek: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime }));

const formFromSlots = (slots: WorkingTimeSlotInput[]): SlotFormEntry[] => {
  const base = defaultSlotForm().map((e) => ({ ...e, enabled: false }));
  for (const slot of slots) {
    const entry = base.find((b) => b.dayOfWeek === slot.dayOfWeek);
    if (entry) {
      entry.enabled = true;
      entry.startTime = slot.startTime;
      entry.endTime = slot.endTime;
    }
  }
  return base;
};

export default function WorkingTimeTemplates() {
  const [templates, setTemplates] = useState<WorkingTimeTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formSlots, setFormSlots] = useState<SlotFormEntry[]>(defaultSlotForm());
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await workingTimeService.getAll();
      setTemplates(data);
    } catch {
      setFeedback({ severity: 'error', message: 'Vorlagen konnten nicht geladen werden' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateDefaults = async () => {
    try {
      await workingTimeService.createDefaults();
      setFeedback({ severity: 'success', message: 'Standard-Vorlagen erstellt' });
      loadTemplates();
    } catch {
      setFeedback({ severity: 'error', message: 'Fehler beim Erstellen der Standard-Vorlagen' });
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormName('');
    setFormIsDefault(false);
    setFormSlots(defaultSlotForm());
    setDialogOpen(true);
  };

  const openEditDialog = (template: WorkingTimeTemplateResponse) => {
    setEditingId(template.id);
    setFormName(template.name);
    setFormIsDefault(template.isDefault);
    setFormSlots(
      formFromSlots(
        template.slots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      )
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const enabledSlots = slotsFromForm(formSlots);
    if (!formName.trim() || enabledSlots.length === 0) {
      setFeedback({ severity: 'error', message: 'Name und mindestens ein Tag sind erforderlich' });
      return;
    }

    const dto: CreateTemplateDTO = {
      name: formName.trim(),
      isDefault: formIsDefault,
      slots: enabledSlots,
    };

    setSaving(true);
    try {
      if (editingId) {
        await workingTimeService.update(editingId, dto);
        setFeedback({ severity: 'success', message: 'Vorlage aktualisiert' });
      } else {
        await workingTimeService.create(dto);
        setFeedback({ severity: 'success', message: 'Vorlage erstellt' });
      }
      setDialogOpen(false);
      loadTemplates();
    } catch {
      setFeedback({ severity: 'error', message: 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await workingTimeService.delete(deleteId);
      setFeedback({ severity: 'success', message: 'Vorlage gelöscht' });
      setDeleteId(null);
      loadTemplates();
    } catch {
      setFeedback({ severity: 'error', message: 'Fehler beim Löschen' });
    } finally {
      setDeleting(false);
    }
  };

  const updateSlot = (index: number, field: keyof SlotFormEntry, value: string | boolean) => {
    setFormSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs
        items={[
          { label: 'Settings', path: '/settings' },
          { label: 'Arbeitszeiten' },
        ]}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Arbeitszeitvorlagen
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={handleCreateDefaults}>
            Standard-Vorlagen erstellen
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Neue Vorlage
          </Button>
        </Box>
      </Box>

      {templates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Noch keine Arbeitszeitvorlagen vorhanden.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Erstellen Sie Standard-Vorlagen für eine Schweizer Schreinerei oder legen Sie eigene an.
          </Typography>
          <Button variant="contained" onClick={handleCreateDefaults}>
            Standard-Vorlagen erstellen
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {templates.map((template) => (
            <Grid size={{ xs: 12, md: 6 }} key={template.id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">{template.name}</Typography>
                    {template.isDefault && (
                      <Chip label="Standard" color="primary" size="small" />
                    )}
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openEditDialog(template)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(template.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {/* Weekly slot display */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                    const daySlots = template.slots
                      .filter((s) => s.dayOfWeek === day)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));
                    return (
                      <Box
                        key={day}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 0.5,
                          opacity: daySlots.length === 0 ? 0.4 : 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ width: 30, fontWeight: 'bold', flexShrink: 0 }}
                        >
                          {DAY_SHORT[day]}
                        </Typography>
                        {daySlots.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        ) : (
                          daySlots.map((s, i) => (
                            <Chip
                              key={i}
                              label={`${s.startTime}–${s.endTime}`}
                              size="small"
                              variant="outlined"
                            />
                          ))
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox checked={formIsDefault} onChange={(e) => setFormIsDefault(e.target.checked)} />
            }
            label="Als Standard setzen"
            sx={{ mb: 2 }}
          />
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Arbeitstage & Zeiten
          </Typography>
          {formSlots.map((slot, index) => (
            <Box key={slot.dayOfWeek} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={slot.enabled}
                    onChange={(e) => updateSlot(index, 'enabled', e.target.checked)}
                  />
                }
                label={DAY_NAMES[slot.dayOfWeek]}
                sx={{ width: 140, mr: 0 }}
              />
              <TextField
                type="time"
                size="small"
                value={slot.startTime}
                onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                disabled={!slot.enabled}
                sx={{ width: 130 }}
              />
              <Typography variant="body2">–</Typography>
              <TextField
                type="time"
                size="small"
                value={slot.endTime}
                onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                disabled={!slot.enabled}
                sx={{ width: 130 }}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle>Vorlage löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie diese Arbeitszeitvorlage wirklich löschen? Diese Aktion kann nicht rückgängig
            gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Abbrechen</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Löschen…' : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={feedback !== null}
        autoHideDuration={3000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setFeedback(null)} severity={feedback?.severity ?? 'success'}>
          {feedback?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
