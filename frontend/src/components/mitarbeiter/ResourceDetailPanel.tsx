import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WorkIcon from '@mui/icons-material/Work';
import ResourceEditDialog from './ResourceEditDialog';
import {
  mitarbeiterService,
  type ResourceWeekSchedule,
} from '../../services/mitarbeiterService';

// ─── Constants ─────────────────────────────────────────

const DEPT_LABELS: Record<string, string> = {
  zuschnitt: 'Zuschnitt',
  cnc: 'CNC',
  produktion: 'Produktion',
  behandlung: 'Behandlung',
  beschlaege: 'Beschläge',
  transport: 'Transport',
  montage: 'Montage',
  buero: 'Büro',
};

const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  internal: 'Intern',
  temporary: 'Temporär',
  external_firm: 'Externe Firma',
  pensioner: 'Pensionär',
  apprentice: 'Lehrling',
};

const WORK_ROLE_LABELS: Record<string, string> = {
  arbeiter: 'Arbeiter',
  hilfskraft: 'Hilfskraft',
  lehrling: 'Lehrling',
  allrounder: 'Allrounder',
  buero: 'B\u00fcro',
};

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Zugewiesen',
  available: 'Verfügbar',
  sick: 'Krank',
  vacation: 'Ferien',
  training: 'Kurs',
  other: 'Sonstig',
};

const STATUS_COLORS: Record<string, string> = {
  assigned: '#1565c0',
  available: '#2e7d32',
  sick: '#e65100',
  vacation: '#6a1b9a',
  training: '#757575',
  other: '#757575',
};

// ─── Props ─────────────────────────────────────────────

interface ResourceDetailPanelProps {
  open: boolean;
  resourceId: string | null;
  kw: number;
  year: number;
  onClose: () => void;
  onResourceUpdated?: () => void;
}

// ─── Component ─────────────────────────────────────────

export default function ResourceDetailPanel({
  open,
  resourceId,
  kw,
  year,
  onClose,
  onResourceUpdated,
}: ResourceDetailPanelProps) {
  const [schedule, setSchedule] = useState<ResourceWeekSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await mitarbeiterService.getResourceSchedule(resourceId, kw, year);
      setSchedule(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Fehler beim Laden der Mitarbeiterdaten';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resourceId, kw, year]);

  useEffect(() => {
    if (open && resourceId) {
      fetchSchedule();
    }
  }, [open, resourceId, fetchSchedule]);

  const utilPct = schedule?.weekSummary.utilizationPercent ?? 0;
  const utilColor =
    utilPct > 100 ? 'error' : utilPct > 90 ? 'warning' : utilPct > 70 ? 'info' : 'success';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 420, md: 480 }, p: 0 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PersonIcon />
          <Typography variant="h6" noWrap>
            {schedule?.resource.shortCode || schedule?.resource.name || 'Mitarbeiter'}
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={() => setEditOpen(true)} sx={{ color: 'inherit' }} title="Bearbeiten">
            <EditIcon />
          </IconButton>
          <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && schedule && (
          <>
            {/* Resource Info */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              {schedule.resource.shortCode && (
                <InfoRow
                  icon={<BadgeIcon fontSize="small" />}
                  label="Kürzel"
                  value={schedule.resource.shortCode}
                />
              )}
              <InfoRow
                icon={<PersonIcon fontSize="small" />}
                label="Name"
                value={schedule.resource.name}
              />
              <InfoRow
                icon={<BusinessIcon fontSize="small" />}
                label="Abteilung"
                value={
                  schedule.resource.department
                    ? DEPT_LABELS[schedule.resource.department] || schedule.resource.department
                    : '—'
                }
              />
              <InfoRow
                icon={<BadgeIcon fontSize="small" />}
                label="Typ"
                value={
                  schedule.resource.employeeType
                    ? EMPLOYEE_TYPE_LABELS[schedule.resource.employeeType] ||
                      schedule.resource.employeeType
                    : '—'
                }
              />
              <InfoRow
                icon={<WorkIcon fontSize="small" />}
                label="Arbeitsrolle"
                value={
                  schedule.resource.workRole
                    ? WORK_ROLE_LABELS[schedule.resource.workRole] || schedule.resource.workRole
                    : 'Arbeiter'
                }
              />
              <InfoRow
                icon={<AccessTimeIcon fontSize="small" />}
                label="Wochenstunden"
                value={`${schedule.resource.weeklyHours}h`}
              />
              {schedule.resource.skills && schedule.resource.skills.length > 0 && (
                <>
                  {schedule.resource.skills.filter((s) => !s.startsWith('qual:')).length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Fachgebiete
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {schedule.resource.skills
                          .filter((s) => !s.startsWith('qual:'))
                          .map((skill) => (
                            <Chip key={skill} label={skill} size="small" color="primary" variant="outlined" />
                          ))}
                      </Box>
                    </Box>
                  )}
                  {schedule.resource.skills.filter((s) => s.startsWith('qual:')).length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Qualifikationen
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {schedule.resource.skills
                          .filter((s) => s.startsWith('qual:'))
                          .map((skill) => (
                            <Chip key={skill} label={skill.replace('qual:', '')} size="small" color="secondary" variant="outlined" />
                          ))}
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Box>

            {/* Week Summary */}
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                KW {schedule.kw} / {schedule.year}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {schedule.weekSummary.totalAssigned}h / {schedule.weekSummary.totalAvailable}h
                </Typography>
                <Chip
                  label={`${utilPct}%`}
                  size="small"
                  color={utilColor}
                  variant={utilPct > 100 ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(utilPct, 100)}
                color={utilColor === 'info' ? 'primary' : utilColor}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* Weekly Schedule Table */}
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Wochenplan
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 50 }}>Tag</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>VM</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>NM</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.days.map((day) => (
                    <TableRow key={day.date} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {day.dayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {day.date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <SlotDetail slot={day.morning} />
                      </TableCell>
                      <TableCell>
                        <SlotDetail slot={day.afternoon} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>

      <ResourceEditDialog
        open={editOpen}
        resourceId={resourceId}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          fetchSchedule();
          onResourceUpdated?.();
        }}
      />
    </Drawer>
  );
}

// ─── Helper Components ─────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon}
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function SlotDetail({ slot }: { slot: import('../../services/mitarbeiterService').ResourceSlot | null }) {
  if (!slot) {
    return (
      <Chip
        label="FREI"
        size="small"
        sx={{
          bgcolor: '#e8f5e9',
          color: '#2e7d32',
          fontWeight: 600,
          fontSize: '0.7rem',
          height: 24,
        }}
      />
    );
  }

  const status = slot.statusCode || 'assigned';
  const statusLabel = STATUS_LABELS[status] || status;
  const color = slot.isFixed ? '#c62828' : STATUS_COLORS[status] || STATUS_COLORS.assigned;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {slot.projectOrderNumber && (
        <Typography variant="body2" fontWeight={600} sx={{ color }}>
          {slot.projectOrderNumber}
        </Typography>
      )}
      {slot.customerName && (
        <Typography variant="caption" color="text.secondary">
          {slot.customerName}
        </Typography>
      )}
      {slot.description && (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
          {slot.description}
        </Typography>
      )}
      {slot.installationLocation && (
        <Typography variant="caption" color="text.secondary">
          📍 {slot.installationLocation}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Chip
          label={statusLabel}
          size="small"
          sx={{
            bgcolor: `${color}15`,
            color,
            fontWeight: 600,
            fontSize: '0.65rem',
            height: 20,
          }}
        />
        {slot.isFixed && (
          <Chip
            label="FIX"
            size="small"
            sx={{
              bgcolor: '#ffebee',
              color: '#c62828',
              fontWeight: 700,
              fontSize: '0.65rem',
              height: 20,
            }}
          />
        )}
      </Box>
      {slot.notes && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {slot.notes}
        </Typography>
      )}
    </Box>
  );
}
