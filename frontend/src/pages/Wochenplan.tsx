import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import {
  wochenplanService,
  type WeekPlanResponse,
  type Section,
  type WeekPlanTask,
} from '../services/wochenplanService';

// ─── Helpers ───────────────────────────────────────────

function getCurrentISOWeek(): { kw: number; year: number } {
  const now = new Date();
  const year = now.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(year, 0, 1).getTime()) / 86400000
  );
  const kw = Math.ceil((dayOfYear + jan4.getDay() + 1) / 7);
  return { kw: Math.min(kw, 53), year };
}

const PHASE_LABELS: Record<string, string> = {
  zuschnitt: 'ZUS',
  cnc: 'CNC',
  produktion: 'PROD',
  behandlung: 'BEH',
  beschlaege: 'BESCHL',
  montage: 'MONT',
};

const PHASE_COLORS: Record<string, string> = {
  zuschnitt: '#e65100',
  cnc: '#1565c0',
  produktion: '#2e7d32',
  behandlung: '#6a1b9a',
  beschlaege: '#f57f17',
  montage: '#c62828',
};

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

// ─── Component ─────────────────────────────────────────

export default function Wochenplan() {
  const [weekPlan, setWeekPlan] = useState<WeekPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initial = getCurrentISOWeek();
  const [kw, setKw] = useState(initial.kw);
  const [year, setYear] = useState(initial.year);

  const fetchWeekPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await wochenplanService.getWeekPlan(kw, year);
      setWeekPlan(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Fehler beim Laden des Wochenplans';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [kw, year]);

  useEffect(() => {
    fetchWeekPlan();
  }, [fetchWeekPlan]);

  const handlePrev = () => {
    if (kw === 1) {
      setKw(52);
      setYear((y) => y - 1);
    } else {
      setKw((k) => k - 1);
    }
  };

  const handleNext = () => {
    if (kw >= 52) {
      setKw(1);
      setYear((y) => y + 1);
    } else {
      setKw((k) => k + 1);
    }
  };

  const handleKwChange = (e: SelectChangeEvent<number>) => {
    setKw(Number(e.target.value));
  };

  const handleYearChange = (e: SelectChangeEvent<number>) => {
    setYear(Number(e.target.value));
  };

  // Generate KW options 1-53
  const kwOptions = Array.from({ length: 53 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 10 }, (_, i) => year - 3 + i);

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
        <Typography variant="h4" component="h1">
          Wochenplan
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrev} size="small" aria-label="Vorherige Woche">
            <ChevronLeftIcon />
          </IconButton>

          <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center' }}>
            KW
          </Typography>

          <Select
            value={kw}
            onChange={handleKwChange}
            size="small"
            sx={{ minWidth: 80 }}
          >
            {kwOptions.map((w) => (
              <MenuItem key={w} value={w}>
                {w}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={year}
            onChange={handleYearChange}
            size="small"
            sx={{ minWidth: 100 }}
          >
            {yearOptions.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>

          <IconButton onClick={handleNext} size="small" aria-label="Nächste Woche">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Date range */}
      {weekPlan && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {weekPlan.dateRange.from} — {weekPlan.dateRange.to}
        </Typography>
      )}

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

      {/* Sections */}
      {!loading && weekPlan && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {weekPlan.sections.map((section) => (
            <SectionTable key={section.department} section={section} currentKw={kw} />
          ))}

          {/* Global Capacity Summary */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Kapazitätsübersicht
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {weekPlan.capacitySummary.byDepartment.map((dept) => (
                <Box key={dept.department} sx={{ minWidth: 180 }}>
                  <Typography variant="subtitle2">{dept.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dept.plannedHours}h / {dept.availableHours}h
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(dept.utilizationPercent, 100)}
                    color={dept.utilizationPercent > 90 ? 'error' : dept.utilizationPercent > 70 ? 'warning' : 'primary'}
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {dept.utilizationPercent}%
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1">
                Gesamt: {weekPlan.capacitySummary.totalPlannedHours}h /{' '}
                {weekPlan.capacitySummary.totalAvailableHours}h (
                {weekPlan.capacitySummary.utilizationPercent}%)
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

// ─── Section Table ─────────────────────────────────────

function SectionTable({
  section,
  currentKw,
}: {
  section: Section;
  currentKw: number;
}) {
  const hasTasks = section.tasks.length > 0;

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {/* Section header */}
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
        <Typography variant="h6">{section.label}</Typography>
        <Typography variant="body2">
          {section.totalHours.planned}h / {section.totalHours.available}h verfügbar
          {section.resources.length > 0 && ` · ${section.resources.length} Mitarbeiter`}
        </Typography>
      </Box>

      {!hasTasks ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Keine Aufträge in dieser Woche
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1400 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>Auftrag</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 50 }}>SB</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Kunde</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Arbeit</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Montageort</TableCell>
                {Object.entries(PHASE_LABELS).map(([key, label]) => (
                  <TableCell key={key} sx={{ fontWeight: 700, textAlign: 'center', minWidth: 60 }}>
                    {label}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 40 }}>Arb.</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 60 }}>Farbe</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>Kontakt</TableCell>
                {DAY_LABELS.map((d) => (
                  <TableCell key={d} sx={{ fontWeight: 700, textAlign: 'center', minWidth: 80 }}>
                    {d}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Bemerkungen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {section.tasks.map((task) => (
                <TaskRow key={task.taskId} task={task} currentKw={currentKw} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

// ─── Task Row ──────────────────────────────────────────

function TaskRow({
  task,
  currentKw,
}: {
  task: WeekPlanTask;
  currentKw: number;
}) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={600} noWrap>
          {task.projectOrderNumber || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {task.sachbearbeiter || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {task.customerName || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap title={task.description}>
          {task.description || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap>
          {task.installationLocation || '—'}
        </Typography>
      </TableCell>

      {/* Phase KW chips */}
      {task.phases.map((p) => (
        <TableCell key={p.phase} sx={{ textAlign: 'center' }}>
          {p.plannedKw !== null ? (
            <Chip
              label={p.plannedKw}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                height: 24,
                minWidth: 36,
                bgcolor:
                  p.plannedKw === currentKw
                    ? PHASE_COLORS[p.phase] || 'primary.main'
                    : 'action.selected',
                color: p.plannedKw === currentKw ? '#fff' : 'text.primary',
              }}
            />
          ) : (
            <Typography variant="caption" color="text.disabled">
              —
            </Typography>
          )}
        </TableCell>
      ))}

      <TableCell sx={{ textAlign: 'center' }}>
        <Typography variant="body2" fontWeight={600}>
          {task.workerCount || '—'}
        </Typography>
      </TableCell>
      <TableCell>
        {task.color ? (
          <Tooltip title={task.color}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: isValidColor(task.color) ? task.color : 'grey.400',
                border: '2px solid',
                borderColor: 'divider',
              }}
            />
          </Tooltip>
        ) : (
          <Typography variant="caption" color="text.disabled">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" noWrap>
            {task.contactName || '—'}
          </Typography>
          {task.needsCallback && (
            <Tooltip title="Rückruf nötig">
              <PhoneCallbackIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
        </Box>
      </TableCell>

      {/* Day assignments */}
      {task.assignments.map((day, idx) => (
        <TableCell key={day.date} sx={{ textAlign: 'center', px: 0.5 }}>
          <DayCell day={day} dayLabel={DAY_LABELS[idx]} />
        </TableCell>
      ))}

      <TableCell>
        <Typography
          variant="body2"
          sx={{ maxWidth: 200, whiteSpace: 'normal', wordBreak: 'break-word' }}
        >
          {task.remarks || '—'}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

// ─── Day Cell ──────────────────────────────────────────

function DayCell({
  day,
}: {
  day: WeekPlanTask['assignments'][number];
  dayLabel: string;
}) {
  const morning = day.morning;
  const afternoon = day.afternoon;

  // If same person for both halves, show once
  if (morning && afternoon && morning === afternoon) {
    return (
      <Tooltip title={day.notes || day.dayName}>
        <Chip
          label={getInitials(morning)}
          size="small"
          color={day.isFixed ? 'primary' : 'default'}
          variant={day.isFixed ? 'filled' : 'outlined'}
          sx={{ fontSize: '0.7rem', height: 22, fontWeight: 600 }}
        />
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Tooltip title={morning ? `VM: ${morning}` : 'Vormittag frei'}>
        <Chip
          label={morning ? getInitials(morning) : 'FREI'}
          size="small"
          color={morning ? (day.isFixed ? 'primary' : 'default') : 'default'}
          variant={morning ? (day.isFixed ? 'filled' : 'outlined') : 'outlined'}
          sx={{
            fontSize: '0.6rem',
            height: 18,
            fontWeight: morning ? 600 : 400,
            opacity: morning ? 1 : 0.5,
          }}
        />
      </Tooltip>
      <Tooltip title={afternoon ? `NM: ${afternoon}` : 'Nachmittag frei'}>
        <Chip
          label={afternoon ? getInitials(afternoon) : 'FREI'}
          size="small"
          color={afternoon ? (day.isFixed ? 'primary' : 'default') : 'default'}
          variant={afternoon ? (day.isFixed ? 'filled' : 'outlined') : 'outlined'}
          sx={{
            fontSize: '0.6rem',
            height: 18,
            fontWeight: afternoon ? 600 : 400,
            opacity: afternoon ? 1 : 0.5,
          }}
        />
      </Tooltip>
    </Box>
  );
}

// ─── Utils ─────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 3).toUpperCase();
  }
  return parts
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 3);
}

function isValidColor(color: string): boolean {
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) return true;
  if (/^(rgb|hsl)a?\(/.test(color)) return true;
  // Named CSS colors — do a rough check
  const namedColors = [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
    'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'teal',
    'navy', 'maroon', 'olive', 'coral', 'salmon', 'gold', 'silver',
    'beige', 'ivory', 'wheat', 'tan', 'khaki', 'crimson', 'indigo',
    'turquoise', 'violet',
  ];
  return namedColors.includes(color.toLowerCase());
}
