import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { PendenzResponse, PendenzStatus, CreatePendenzDTO, UpdatePendenzDTO, Project } from '../types';
import { pendenzService } from '../services/pendenzService';
import { projectService } from '../services/projectService';
import PendenzStatusBadge from '../components/PendenzStatusBadge';
import PendenzPrioritaetBadge from '../components/PendenzPrioritaetBadge';
import PendenzHistorie from '../components/PendenzHistorie';
import PendenzForm from '../components/PendenzForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

const bereichLabel: Record<string, string> = {
  avor: 'AVOR',
  montage: 'Montage',
  planung: 'Planung',
  material: 'Material',
};

const kategorieLabel: Record<string, string> = {
  projekt: 'Projekt',
  allgemein: 'Allgemein',
  benutzer: 'Benutzer',
};

// Status transitions
const statusTransitions: Record<PendenzStatus, { next: PendenzStatus; label: string; icon: React.ReactNode }[]> = {
  offen: [
    { next: 'in_arbeit', label: 'Starten', icon: <PlayArrowIcon /> },
  ],
  in_arbeit: [
    { next: 'erledigt', label: 'Erledigen', icon: <CheckCircleIcon /> },
    { next: 'offen', label: 'Zurück zu Offen', icon: <UndoIcon /> },
  ],
  erledigt: [
    { next: 'offen', label: 'Wiedereröffnen', icon: <UndoIcon /> },
  ],
};

export default function PendenzDetail() {
  const { projectId, pendenzId } = useParams<{ projectId: string; pendenzId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isNew = pendenzId === 'new';
  const isEditRoute = window.location.pathname.endsWith('/edit');
  const [isEditing, setIsEditing] = useState(isNew || isEditRoute);

  const [pendenz, setPendenz] = useState<PendenzResponse | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [historieTrigger, setHistorieTrigger] = useState(0);

  // Status change confirmation
  const [statusChange, setStatusChange] = useState<{ target: PendenzStatus; label: string } | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  // Archive confirm
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const canEdit = user?.role === 'admin' || user?.role === 'team';

  const loadPendenz = useCallback(async () => {
    if (!pendenzId || isNew) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pendenzService.getById(pendenzId);
      setPendenz(data);
    } catch {
      setError('Pendenz konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [pendenzId, isNew]);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const proj = await projectService.getById(projectId);
      setProject(proj);
    } catch {
      // secondary
    }
  }, [projectId]);

  useEffect(() => {
    loadPendenz();
    loadProject();
  }, [loadPendenz, loadProject]);

  const handleCreate = async (data: CreatePendenzDTO | UpdatePendenzDTO) => {
    if (!projectId) return;
    setSaving(true);
    try {
      const created = await pendenzService.createInProject(projectId, data as CreatePendenzDTO);
      setSnackbar({ open: true, message: `Pendenz #${created.nr} erstellt`, severity: 'success' });
      navigate(`/projects/${projectId}/pendenzen/${created.id}`, { replace: true });
    } catch {
      throw new Error('Pendenz konnte nicht erstellt werden');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: CreatePendenzDTO | UpdatePendenzDTO) => {
    if (!pendenzId || isNew) return;
    setSaving(true);
    try {
      const updated = await pendenzService.update(pendenzId, data as UpdatePendenzDTO);
      setPendenz(updated);
      setIsEditing(false);
      setHistorieTrigger((t) => t + 1);
      setSnackbar({ open: true, message: 'Pendenz aktualisiert', severity: 'success' });
    } catch {
      throw new Error('Pendenz konnte nicht aktualisiert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!pendenzId || !statusChange) return;
    setStatusChanging(true);
    try {
      const updated = await pendenzService.updateStatus(pendenzId, statusChange.target);
      setPendenz(updated);
      setHistorieTrigger((t) => t + 1);
      setSnackbar({
        open: true,
        message: `Status auf "${statusChange.target === 'offen' ? 'Offen' : statusChange.target === 'in_arbeit' ? 'In Arbeit' : 'Erledigt'}" gesetzt`,
        severity: 'success',
      });
      setStatusChange(null);
    } catch {
      setSnackbar({ open: true, message: 'Statusänderung fehlgeschlagen', severity: 'error' });
    } finally {
      setStatusChanging(false);
    }
  };

  const handleArchive = async () => {
    if (!pendenzId) return;
    setArchiving(true);
    try {
      await pendenzService.archive(pendenzId);
      setSnackbar({ open: true, message: 'Pendenz archiviert', severity: 'success' });
      navigate(`/projects/${projectId}/pendenzen`, { replace: true });
    } catch {
      setSnackbar({ open: true, message: 'Archivierung fehlgeschlagen', severity: 'error' });
    } finally {
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error && !isNew) {
    return (
      <Box>
        <IconButton onClick={() => navigate(`/projects/${projectId}/pendenzen`)} sx={{ mb: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Create form
  if (isNew) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate(`/projects/${projectId}/pendenzen`)}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Neue Pendenz
            </Typography>
            {project && (
              <Typography variant="body2" color="text.secondary">
                {project.name}
              </Typography>
            )}
          </Box>
        </Box>
        <Paper sx={{ p: 3 }}>
          <PendenzForm
            onSubmit={handleCreate}
            onCancel={() => navigate(`/projects/${projectId}/pendenzen`)}
            loading={saving}
          />
        </Paper>
      </Box>
    );
  }

  // Edit form
  if (isEditing && pendenz) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => setIsEditing(false)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={700}>
            Pendenz #{pendenz.nr} bearbeiten
          </Typography>
        </Box>
        <Paper sx={{ p: 3 }}>
          <PendenzForm
            pendenz={pendenz}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            loading={saving}
            isEdit
          />
        </Paper>
      </Box>
    );
  }

  // Detail view
  if (!pendenz) {
    return (
      <Box>
        <IconButton onClick={() => navigate(`/projects/${projectId}/pendenzen`)}>
          <ArrowBackIcon />
        </IconButton>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Pendenz nicht gefunden.
        </Alert>
      </Box>
    );
  }

  const transitions = statusTransitions[pendenz.status] || [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate(`/projects/${projectId}/pendenzen`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" fontWeight={700}>
              Pendenz #{pendenz.nr}
            </Typography>
            <PendenzStatusBadge status={pendenz.status} size="medium" />
            <PendenzPrioritaetBadge prioritaet={pendenz.prioritaet} size="medium" />
          </Box>
          {project && (
            <Typography variant="body2" color="text.secondary">
              {project.name}
            </Typography>
          )}
        </Box>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
            >
              Bearbeiten
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ArchiveIcon />}
              onClick={() => setShowArchiveConfirm(true)}
            >
              Archivieren
            </Button>
          </Stack>
        )}
      </Box>

      {/* Status workflow buttons */}
      {canEdit && transitions.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          {transitions.map((t) => (
            <Button
              key={t.next}
              variant="contained"
              color={t.next === 'erledigt' ? 'success' : t.next === 'in_arbeit' ? 'warning' : 'info'}
              startIcon={t.icon}
              onClick={() => setStatusChange({ target: t.next, label: t.label })}
            >
              {t.label}
            </Button>
          ))}
        </Stack>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Details" />
        <Tab label="Historie" />
      </Tabs>

      {/* Details Tab */}
      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Beschreibung
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
            {pendenz.beschreibung}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Bereich
              </Typography>
              <Typography variant="body1">{bereichLabel[pendenz.bereich]}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Kategorie
              </Typography>
              <Typography variant="body1">{kategorieLabel[pendenz.kategorie]}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Priorität
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <PendenzPrioritaetBadge prioritaet={pendenz.prioritaet} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <PendenzStatusBadge status={pendenz.status} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Fällig bis
              </Typography>
              <Typography variant="body1">
                {pendenz.faelligBis
                  ? format(parseISO(pendenz.faelligBis), 'dd.MM.yyyy', { locale: de })
                  : '–'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Erledigt am
              </Typography>
              <Typography variant="body1">
                {pendenz.erledigtAm
                  ? format(parseISO(pendenz.erledigtAm), 'dd.MM.yyyy', { locale: de })
                  : '–'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Verantwortlich
              </Typography>
              <Typography variant="body1">{pendenz.verantwortlichName ?? '–'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Erfasst von
              </Typography>
              <Typography variant="body1">{pendenz.erfasstVonName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Auftragsnummer
              </Typography>
              <Typography variant="body1">{pendenz.auftragsnummer ?? '–'}</Typography>
            </Grid>
          </Grid>

          {pendenz.bemerkungen && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                Bemerkungen
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {pendenz.bemerkungen}
              </Typography>
            </>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Erstellt: {format(parseISO(pendenz.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Aktualisiert: {format(parseISO(pendenz.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Historie Tab */}
      {tab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Änderungshistorie
          </Typography>
          <PendenzHistorie pendenzId={pendenz.id} refreshTrigger={historieTrigger} />
        </Paper>
      )}

      {/* Status change confirmation */}
      <ConfirmDialog
        open={!!statusChange}
        title="Status ändern"
        message={`Möchten Sie den Status auf "${statusChange?.label}" setzen?`}
        confirmLabel={statusChange?.label ?? 'Bestätigen'}
        onConfirm={handleStatusChange}
        onCancel={() => setStatusChange(null)}
        loading={statusChanging}
      />

      {/* Archive confirmation */}
      <ConfirmDialog
        open={showArchiveConfirm}
        title="Pendenz archivieren"
        message={`Möchten Sie Pendenz #${pendenz.nr} wirklich archivieren?`}
        confirmLabel="Archivieren"
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveConfirm(false)}
        loading={archiving}
        destructive
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
