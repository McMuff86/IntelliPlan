import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Stack,
  Skeleton,
  Alert,
  Snackbar,
  Chip,
  TableSortLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import type {
  PendenzResponse,
  PendenzStatus,
  PendenzBereich,
} from '../types';
import { pendenzService } from '../services/pendenzService';
import { projectService } from '../services/projectService';
import PendenzStatusBadge from '../components/PendenzStatusBadge';
import PendenzPrioritaetBadge from '../components/PendenzPrioritaetBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import type { Project } from '../types';

const statusFilterOptions: { value: string; label: string }[] = [
  { value: '', label: 'Alle Status' },
  { value: 'offen', label: 'Offen' },
  { value: 'in_arbeit', label: 'In Arbeit' },
  { value: 'erledigt', label: 'Erledigt' },
];

const bereichFilterOptions: { value: string; label: string }[] = [
  { value: '', label: 'Alle Bereiche' },
  { value: 'avor', label: 'AVOR' },
  { value: 'montage', label: 'Montage' },
  { value: 'planung', label: 'Planung' },
  { value: 'material', label: 'Material' },
];

const bereichLabel: Record<PendenzBereich, string> = {
  avor: 'AVOR',
  montage: 'Montage',
  planung: 'Planung',
  material: 'Material',
};

type SortField = 'faellig_bis' | '-faellig_bis' | 'prioritaet' | '-prioritaet' | 'nr' | '-nr';

export default function Pendenzen() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pendenzen, setPendenzen] = useState<PendenzResponse[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [bereichFilter, setBereichFilter] = useState<string>('');
  const [sort, setSort] = useState<SortField>('faellig_bis');

  // Archive confirm
  const [archiveTarget, setArchiveTarget] = useState<PendenzResponse | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Pagination
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;

  const loadPendenzen = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await pendenzService.listByProject(projectId, {
        status: (statusFilter || undefined) as PendenzStatus | undefined,
        bereich: (bereichFilter || undefined) as PendenzBereich | undefined,
        sort,
        limit,
        offset: page * limit,
      });
      setPendenzen(result.data);
      setTotal(result.pagination.total);
    } catch {
      setError('Pendenzen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, bereichFilter, sort, page]);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const proj = await projectService.getById(projectId);
      setProject(proj);
    } catch {
      // Project load error is secondary
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    loadPendenzen();
  }, [loadPendenzen]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [statusFilter, bereichFilter, sort]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await pendenzService.archive(archiveTarget.id);
      setSnackbar({ open: true, message: `Pendenz #${archiveTarget.nr} archiviert`, severity: 'success' });
      setArchiveTarget(null);
      loadPendenzen();
    } catch {
      setSnackbar({ open: true, message: 'Archivierung fehlgeschlagen', severity: 'error' });
    } finally {
      setArchiving(false);
    }
  };

  const handleSortToggle = (field: 'faellig_bis' | 'prioritaet' | 'nr') => {
    setSort((prev) => {
      if (prev === field) return `-${field}` as SortField;
      if (prev === `-${field}`) return field as SortField;
      return field as SortField;
    });
  };

  const getSortDirection = (field: string): 'asc' | 'desc' | undefined => {
    if (sort === field) return 'asc';
    if (sort === `-${field}`) return 'desc';
    return undefined;
  };

  const isOverdue = (p: PendenzResponse): boolean => {
    if (!p.faelligBis || p.status === 'erledigt') return false;
    const d = parseISO(p.faelligBis);
    return isPast(d) && !isToday(d);
  };

  const canEdit = user?.role === 'admin' || user?.role === 'team';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            Pendenzen
          </Typography>
          {project && (
            <Typography variant="body2" color="text.secondary">
              {project.name}
            </Typography>
          )}
        </Box>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/projects/${projectId}/pendenzen/new`)}
          >
            Neue Pendenz
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          {statusFilterOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Bereich"
          value={bereichFilter}
          onChange={(e) => setBereichFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          {bereichFilterOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        {total > 0 && (
          <Chip
            label={`${total} Pendenz${total !== 1 ? 'en' : ''}`}
            variant="outlined"
            sx={{ alignSelf: 'center' }}
          />
        )}
      </Stack>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Stack spacing={1}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      )}

      {/* Empty state */}
      {!loading && pendenzen.length === 0 && !error && (
        <EmptyState
          title="Keine Pendenzen"
          description={
            statusFilter || bereichFilter
              ? 'Keine Pendenzen mit diesen Filtern gefunden.'
              : 'Noch keine Pendenzen für dieses Projekt erstellt.'
          }
          actionLabel="Neue Pendenz"
          onAction={canEdit ? () => navigate(`/projects/${projectId}/pendenzen/new`) : undefined}
        />
      )}

      {/* Table */}
      {!loading && pendenzen.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 70 }}>
                  <TableSortLabel
                    active={sort === 'nr' || sort === '-nr'}
                    direction={getSortDirection('nr') || 'asc'}
                    onClick={() => handleSortToggle('nr')}
                  >
                    Nr.
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Beschreibung</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Bereich</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }}>
                  <TableSortLabel
                    active={sort === 'prioritaet' || sort === '-prioritaet'}
                    direction={getSortDirection('prioritaet') || 'asc'}
                    onClick={() => handleSortToggle('prioritaet')}
                  >
                    Priorität
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>
                  <TableSortLabel
                    active={sort === 'faellig_bis' || sort === '-faellig_bis'}
                    direction={getSortDirection('faellig_bis') || 'asc'}
                    onClick={() => handleSortToggle('faellig_bis')}
                  >
                    Fällig
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>Verantwortlich</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }} align="right">
                  Aktionen
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendenzen.map((p) => {
                const overdue = isOverdue(p);
                return (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      bgcolor: overdue ? 'error.50' : undefined,
                      '&:hover': { bgcolor: overdue ? 'error.100' : undefined },
                    }}
                    onClick={() => navigate(`/projects/${projectId}/pendenzen/${p.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        #{p.nr}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 400,
                        }}
                      >
                        {p.beschreibung}
                      </Typography>
                      {p.auftragsnummer && (
                        <Typography variant="caption" color="text.secondary">
                          Auftrag: {p.auftragsnummer}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={bereichLabel[p.bereich]} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <PendenzPrioritaetBadge prioritaet={p.prioritaet} />
                    </TableCell>
                    <TableCell>
                      <PendenzStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>
                      {p.faelligBis ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {overdue && (
                            <Tooltip title="Überfällig">
                              <WarningAmberIcon color="error" sx={{ fontSize: 16 }} />
                            </Tooltip>
                          )}
                          <Typography
                            variant="body2"
                            color={overdue ? 'error.main' : 'text.primary'}
                            fontWeight={overdue ? 600 : 400}
                          >
                            {format(parseISO(p.faelligBis), 'dd.MM.yyyy', { locale: de })}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">–</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {p.verantwortlichName ?? '–'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Anzeigen">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/projects/${projectId}/pendenzen/${p.id}`)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canEdit && (
                        <>
                          <Tooltip title="Bearbeiten">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/projects/${projectId}/pendenzen/${p.id}/edit`)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Archivieren">
                            <IconButton
                              size="small"
                              onClick={() => setArchiveTarget(p)}
                            >
                              <ArchiveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination info */}
      {!loading && total > limit && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Zeige {page * limit + 1}–{Math.min((page + 1) * limit, total)} von {total}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Zurück
            </Button>
            <Button
              size="small"
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Weiter
            </Button>
          </Stack>
        </Box>
      )}

      {/* Archive confirmation */}
      <ConfirmDialog
        open={!!archiveTarget}
        title="Pendenz archivieren"
        message={`Möchten Sie Pendenz #${archiveTarget?.nr ?? ''} wirklich archivieren?`}
        confirmLabel="Archivieren"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
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
