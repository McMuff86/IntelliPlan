import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress,
  Collapse,
  Chip,
  Grid,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import GroupIcon from '@mui/icons-material/Group';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ConstructionIcon from '@mui/icons-material/Construction';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import BuildIcon from '@mui/icons-material/Build';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HomeRepairServiceIcon from '@mui/icons-material/HomeRepairService';
import BusinessIcon from '@mui/icons-material/Business';
import {
  capacityService,
  type CapacityOverview,
  type DepartmentCapacity,
  type ResourceCapacity,
  type PeriodCapacity,
} from '../services/capacityService';

// ─── Helpers ───────────────────────────────────────────

function getCurrentISOWeekDates(): { from: string; to: string; kw: number; year: number } {
  const now = new Date();
  const year = now.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(year, 0, 1).getTime()) / 86400000
  );
  const kw = Math.min(Math.ceil((dayOfYear + jan4.getDay() + 1) / 7), 53);

  // Calculate Monday of ISO week
  const jan4Date = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4Date.getUTCDay() || 7;
  const monday = new Date(jan4Date);
  monday.setUTCDate(jan4Date.getUTCDate() - (dayOfWeek - 1) + (kw - 1) * 7);

  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);

  return {
    from: monday.toISOString().slice(0, 10),
    to: friday.toISOString().slice(0, 10),
    kw,
    year,
  };
}

function weekOffset(from: string, to: string, delta: number): { from: string; to: string } {
  const f = new Date(from + 'T00:00:00Z');
  const t = new Date(to + 'T00:00:00Z');
  f.setUTCDate(f.getUTCDate() + delta * 7);
  t.setUTCDate(t.getUTCDate() + delta * 7);
  return {
    from: f.toISOString().slice(0, 10),
    to: t.toISOString().slice(0, 10),
  };
}

function getISOWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00Z');
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayNum = Math.ceil((date.getTime() - yearStart.getTime()) / 86400000);
  return Math.ceil((dayNum + yearStart.getUTCDay()) / 7);
}

function getUtilColor(pct: number): 'success' | 'warning' | 'error' {
  if (pct > 90) return 'error';
  if (pct > 70) return 'warning';
  return 'success';
}

function getUtilColorHex(pct: number): string {
  if (pct > 90) return '#d32f2f';
  if (pct > 70) return '#ed6c02';
  return '#2e7d32';
}

const DEPT_ICONS: Record<string, React.ReactNode> = {
  zuschnitt: <ContentCutIcon />,
  cnc: <PrecisionManufacturingIcon />,
  produktion: <ConstructionIcon />,
  behandlung: <FormatPaintIcon />,
  beschlaege: <BuildIcon />,
  transport: <LocalShippingIcon />,
  montage: <HomeRepairServiceIcon />,
  buero: <BusinessIcon />,
};

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

// ─── Main Component ────────────────────────────────────

export default function Capacity() {
  const initial = getCurrentISOWeekDates();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [overview, setOverview] = useState<CapacityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const kw = useMemo(() => getISOWeekNumber(from), [from]);

  const fetchCapacity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await capacityService.getOverview(from, to);
      setOverview(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Laden der Kapazitätsdaten';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchCapacity();
  }, [fetchCapacity]);

  const handlePrev = () => {
    const next = weekOffset(from, to, -1);
    setFrom(next.from);
    setTo(next.to);
  };

  const handleNext = () => {
    const next = weekOffset(from, to, 1);
    setFrom(next.from);
    setTo(next.to);
  };

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  // Departments with actual data (resources or assignments)
  const activeDepts = useMemo(
    () => overview?.departments.filter((d) => d.resourceCount > 0) ?? [],
    [overview]
  );

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AssessmentIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Kapazität
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrev} size="small" aria-label="Vorherige Woche">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center' }}>
            KW {kw} · {from} — {to}
          </Typography>
          <IconButton onClick={handleNext} size="small" aria-label="Nächste Woche">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Loading / Error */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && overview && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Company-Wide Summary */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Gesamtübersicht
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color={getUtilColorHex(overview.utilizationPercent)}>
                    {overview.utilizationPercent}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gesamtauslastung
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3">
                    {overview.totalAssignedHours}
                    <Typography component="span" variant="h5" color="text.secondary">
                      {' '}/ {overview.totalAvailableHours}h
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Zugewiesene / Verfügbare Stunden
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color={overview.overbookedResources.length > 0 ? 'error' : 'text.primary'}>
                    {overview.overbookedResources.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Überbuchte Mitarbeiter
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Top Overbooked Warning */}
            {overview.overbookedResources.length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <WarningAmberIcon fontSize="small" />
                  Überbuchte Mitarbeiter
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {overview.overbookedResources.map((r) => (
                    <Chip
                      key={r.resourceId}
                      label={`${r.shortCode || r.resourceName} – ${r.utilizationPercent}%`}
                      color="error"
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>

          {/* Department Cards Grid */}
          <Grid container spacing={2}>
            {activeDepts.map((dept) => (
              <Grid key={dept.department} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <DepartmentCard
                  dept={dept}
                  expanded={expandedDepts.has(dept.department)}
                  onToggle={() => toggleDept(dept.department)}
                />
              </Grid>
            ))}
          </Grid>

          {/* Expanded Department Details */}
          {activeDepts
            .filter((d) => expandedDepts.has(d.department))
            .map((dept) => (
              <DepartmentDetail key={dept.department} dept={dept} />
            ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Department Card ───────────────────────────────────

function DepartmentCard({
  dept,
  expanded,
  onToggle,
}: {
  dept: DepartmentCapacity;
  expanded: boolean;
  onToggle: () => void;
}) {
  const utilColor = getUtilColor(dept.utilizationPercent);

  return (
    <Paper
      sx={{
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: expanded ? '2px solid' : '2px solid transparent',
        borderColor: expanded ? 'primary.main' : 'transparent',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
      onClick={onToggle}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {DEPT_ICONS[dept.department] || <GroupIcon />}
          <Typography variant="subtitle1" fontWeight={600}>
            {dept.label}
          </Typography>
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>

      {/* Utilization bar */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Auslastung
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color={`${utilColor}.main`}
          >
            {dept.utilizationPercent}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(dept.utilizationPercent, 100)}
          color={utilColor}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {dept.totalAssignedHours}h / {dept.totalAvailableHours}h
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <GroupIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {dept.resourceCount}
          </Typography>
          {dept.overbookedCount > 0 && (
            <Tooltip title={`${dept.overbookedCount} überbucht`}>
              <Chip
                label={dept.overbookedCount}
                color="error"
                size="small"
                sx={{ height: 20, fontSize: '0.7rem', ml: 0.5 }}
              />
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// ─── Department Detail Table ───────────────────────────

function DepartmentDetail({ dept }: { dept: DepartmentCapacity }) {
  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {DEPT_ICONS[dept.department] || <GroupIcon />}
          <Typography variant="h6">{dept.label} – Detail</Typography>
        </Box>
        <Typography variant="body2">
          {dept.resourceCount} Mitarbeiter · {dept.utilizationPercent}% Auslastung
        </Typography>
      </Box>

      {dept.resources.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Keine Mitarbeiter in dieser Abteilung</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Mitarbeiter</TableCell>
                {DAY_LABELS.map((d) => (
                  <TableCell key={d} sx={{ fontWeight: 700, textAlign: 'center', minWidth: 100 }}>
                    {d}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 80 }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 60 }}>%</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dept.resources.map((resource) => (
                <ResourceRow key={resource.resourceId} resource={resource} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

// ─── Resource Row ──────────────────────────────────────

function ResourceRow({ resource }: { resource: ResourceCapacity }) {
  const totalAssigned = resource.periods.reduce((s, p) => s + p.assignedHours, 0);
  const totalAvailable = resource.periods.reduce((s, p) => s + p.availableHours, 0);
  const totalUtilPct = totalAvailable > 0 ? Math.round((totalAssigned / totalAvailable) * 1000) / 10 : 0;
  const isOverbooked = resource.periods.some((p) => p.isOverbooked);

  return (
    <TableRow
      hover
      sx={{
        bgcolor: isOverbooked ? 'error.50' : undefined,
      }}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {resource.shortCode || resource.resourceName}
          </Typography>
          {isOverbooked && (
            <Tooltip title="Überbucht!">
              <WarningAmberIcon fontSize="small" color="error" />
            </Tooltip>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {resource.resourceName}
        </Typography>
      </TableCell>

      {/* Day cells */}
      {resource.periods.map((period, idx) => (
        <TableCell key={period.date} sx={{ textAlign: 'center', px: 0.5 }}>
          <PeriodCell period={period} />
        </TableCell>
      ))}

      {/* Total */}
      <TableCell sx={{ textAlign: 'center' }}>
        <Typography variant="body2" fontWeight={600}>
          {Math.round(totalAssigned * 10) / 10}h
        </Typography>
        <Typography variant="caption" color="text.secondary">
          / {Math.round(totalAvailable * 10) / 10}h
        </Typography>
      </TableCell>

      {/* Percentage */}
      <TableCell sx={{ textAlign: 'center' }}>
        <Chip
          label={`${totalUtilPct}%`}
          size="small"
          color={getUtilColor(totalUtilPct)}
          variant={totalUtilPct > 100 ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
        />
      </TableCell>
    </TableRow>
  );
}

// ─── Period Cell ───────────────────────────────────────

function PeriodCell({ period }: { period: PeriodCapacity }) {
  const hasAssignments = period.assignments.length > 0;

  // Build tooltip content
  const tooltipContent = hasAssignments
    ? period.assignments.map((a) => `${a.halfDay === 'full_day' ? '🔵' : a.halfDay === 'morning' ? '🌅' : '🌆'} ${a.projectName}`).join('\n')
    : `${period.dayName} – frei`;

  const cellBg = period.isOverbooked
    ? '#ffebee'
    : period.utilizationPercent >= 100
      ? '#e8f5e9'
      : period.utilizationPercent > 0
        ? '#fff3e0'
        : 'transparent';

  // Show status codes if present
  const statusAssignments = period.assignments.filter(
    (a) => a.statusCode && a.statusCode !== 'assigned'
  );
  const hasStatus = statusAssignments.length > 0;

  return (
    <Tooltip title={tooltipContent} arrow>
      <Box
        sx={{
          bgcolor: cellBg,
          borderRadius: 1,
          p: 0.5,
          minHeight: 36,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.25,
        }}
      >
        {hasAssignments ? (
          <>
            <Typography
              variant="caption"
              fontWeight={700}
              color={period.isOverbooked ? 'error' : 'text.primary'}
            >
              {Math.round(period.assignedHours * 10) / 10}h
            </Typography>
            {hasStatus && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                {statusAssignments.map((a) => a.statusCode.toUpperCase()).join(', ')}
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="caption" color="text.disabled">
            —
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}
