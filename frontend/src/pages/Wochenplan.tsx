import { useState, useEffect, useCallback, useRef } from 'react';
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
  Snackbar,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import {
  wochenplanService,
  type WeekPlanResponse,
  type Section,
  type WeekPlanTask,
  type WeekPlanResource,
  type DayAssignmentDetail,
  type ResourceConflict,
} from '../services/wochenplanService';
import AssignmentDialog from '../components/wochenplan/AssignmentDialog';
import QuickAssignPopover from '../components/wochenplan/QuickAssignPopover';
import type { HalfDay } from '../services/assignmentService';

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
  transport: 'TRANS',
  montage: 'MONT',
};

const PHASE_COLORS: Record<string, string> = {
  zuschnitt: '#e65100',
  cnc: '#1565c0',
  produktion: '#2e7d32',
  behandlung: '#6a1b9a',
  beschlaege: '#f57f17',
  transport: '#00838f',
  montage: '#c62828',
};

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

// ─── Assignment Dialog State ───────────────────────────

interface DialogState {
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
  existingAssignment: DayAssignmentDetail | null;
}

const INITIAL_DIALOG_STATE: DialogState = {
  open: false,
  taskId: '',
  date: '',
  dayName: '',
  halfDay: 'morning',
  department: '',
  taskInfo: { projectOrderNumber: '', customerName: '', description: '' },
  existingAssignment: null,
};

// ─── Snackbar State ────────────────────────────────────

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

// ─── Component ─────────────────────────────────────────

export default function Wochenplan() {
  const [weekPlan, setWeekPlan] = useState<WeekPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ResourceConflict[]>([]);

  const initial = getCurrentISOWeek();
  const [kw, setKw] = useState(initial.kw);
  const [year, setYear] = useState(initial.year);

  // Dialog state
  const [dialogState, setDialogState] = useState<DialogState>(INITIAL_DIALOG_STATE);

  // Section collapse state (persisted in localStorage)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('wochenplan-collapsed-sections');
      return stored ? JSON.parse(stored) as Record<string, boolean> : {};
    } catch {
      return {};
    }
  });

  const toggleSectionCollapse = useCallback((department: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [department]: !prev[department] };
      localStorage.setItem('wochenplan-collapsed-sections', JSON.stringify(next));
      return next;
    });
  }, []);

  // Multi-select state for batch assign
  const [selectedCells, setSelectedCells] = useState<
    Array<{ taskId: string; date: string; halfDay: HalfDay; department: string }>
  >([]);

  const clearSelection = useCallback(() => {
    setSelectedCells([]);
  }, []);

  // Quick-assign popover state
  const [quickAssign, setQuickAssign] = useState<{
    open: boolean;
    anchorEl: HTMLElement | null;
    taskId: string;
    date: string;
    halfDay: HalfDay;
    department: string;
    taskInfo: DialogState['taskInfo'];
  }>({
    open: false,
    anchorEl: null,
    taskId: '',
    date: '',
    halfDay: 'morning',
    department: '',
    taskInfo: { projectOrderNumber: '', customerName: '', description: '' },
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchWeekPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, conflictData] = await Promise.all([
        wochenplanService.getWeekPlan(kw, year),
        wochenplanService.getConflicts(kw, year),
      ]);
      setWeekPlan(data);
      setConflicts(conflictData.conflicts);
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

  // ─── Assignment Dialog Handlers ─────────────────────

  const handleCellClick = (
    taskId: string,
    date: string,
    dayName: string,
    halfDay: HalfDay,
    department: string,
    taskInfo: DialogState['taskInfo'],
    existingAssignment: DayAssignmentDetail | null,
    anchorEl?: HTMLElement | null,
    shiftKey?: boolean
  ) => {
    // Shift+click on FREI cells for multi-select (same task row)
    if (shiftKey && !existingAssignment) {
      setSelectedCells((prev) => {
        const exists = prev.some(
          (c) => c.taskId === taskId && c.date === date && c.halfDay === halfDay
        );
        if (exists) {
          // Deselect
          return prev.filter(
            (c) => !(c.taskId === taskId && c.date === date && c.halfDay === halfDay)
          );
        }
        // Only allow selecting cells from the same task row
        const filtered = prev.filter((c) => c.taskId === taskId);
        return [...filtered, { taskId, date, halfDay, department }];
      });
      return;
    }

    // If we have selected cells and click a FREI cell (non-shift), open quick-assign for batch
    if (selectedCells.length > 0 && !existingAssignment && anchorEl) {
      // Add current cell to selection if not already there
      const allCells = [...selectedCells];
      const alreadySelected = allCells.some(
        (c) => c.taskId === taskId && c.date === date && c.halfDay === halfDay
      );
      if (!alreadySelected) {
        allCells.push({ taskId, date, halfDay, department });
        setSelectedCells(allCells);
      }
      // Open quick-assign — will assign to all selected cells
      setQuickAssign({
        open: true,
        anchorEl,
        taskId,
        date,
        halfDay,
        department,
        taskInfo,
      });
      return;
    }

    // If no existing assignment (FREI cell), open quick-assign popover
    if (!existingAssignment && anchorEl) {
      setQuickAssign({
        open: true,
        anchorEl,
        taskId,
        date,
        halfDay,
        department,
        taskInfo,
      });
      return;
    }

    // Otherwise, open full dialog (for editing existing assignments)
    clearSelection();
    setDialogState({
      open: true,
      taskId,
      date,
      dayName,
      halfDay,
      department,
      taskInfo,
      existingAssignment,
    });
  };

  const handleDialogClose = () => {
    setDialogState(INITIAL_DIALOG_STATE);
  };

  const handleDialogSave = async () => {
    setDialogState(INITIAL_DIALOG_STATE);
    setSnackbar({
      open: true,
      message: 'Zuordnung gespeichert',
      severity: 'success',
    });
    // Reload data to reflect changes
    await fetchWeekPlan();
  };

  const handleQuickAssignClose = () => {
    setQuickAssign((s) => ({ ...s, open: false, anchorEl: null }));
  };

  const handleQuickAssigned = async () => {
    const count = selectedCells.length;
    handleQuickAssignClose();
    clearSelection();
    setSnackbar({
      open: true,
      message: count > 0 ? `${count + 1} Zuordnungen gespeichert` : 'Zuordnung gespeichert',
      severity: 'success',
    });
    await fetchWeekPlan();
  };

  const handleQuickAssignOpenFull = () => {
    const qa = quickAssign;
    handleQuickAssignClose();
    setDialogState({
      open: true,
      taskId: qa.taskId,
      date: qa.date,
      dayName: '',
      halfDay: qa.halfDay,
      department: qa.department,
      taskInfo: qa.taskInfo,
      existingAssignment: null,
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  // ─── Keyboard Shortcuts ─────────────────────────────
  const handlePrevRef = useRef(handlePrev);
  const handleNextRef = useRef(handleNext);
  handlePrevRef.current = handlePrev;
  handleNextRef.current = handleNext;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevRef.current();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextRef.current();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        const today = getCurrentISOWeek();
        setKw(today.kw);
        setYear(today.year);
      } else if (e.key === 'Escape') {
        setSelectedCells([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Collect all resources from the current weekPlan for the dialog
  const allResources: WeekPlanResource[] = weekPlan
    ? weekPlan.sections.flatMap((s) => s.resources)
    : [];

  // Build conflict lookup: key = "resourceId|date|halfDay" → conflict tooltip
  const conflictMap = new Map<string, string>();
  for (const c of conflicts) {
    // For each conflict, mark the resource+date+halfDay
    const tooltip = `${c.shortCode || c.resourceName} ist auch bei ${c.assignments.map((a) => a.projectOrderNumber || a.description).join(', ')} eingeteilt`;
    const key = `${c.resourceId}|${c.date}|${c.halfDay}`;
    conflictMap.set(key, tooltip);
    // Also add for full_day if halfDay is morning or afternoon
    if (c.halfDay === 'full_day') {
      conflictMap.set(`${c.resourceId}|${c.date}|morning`, tooltip);
      conflictMap.set(`${c.resourceId}|${c.date}|afternoon`, tooltip);
    }
  }

  // De-duplicate resources by ID
  const resourceMap = new Map<string, WeekPlanResource>();
  for (const r of allResources) {
    resourceMap.set(r.id, r);
  }
  const uniqueResources = Array.from(resourceMap.values());

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

          <Tooltip title="← → Woche wechseln · T = Heute">
            <Typography
              variant="caption"
              sx={{
                ml: 1,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'action.hover',
                color: 'text.secondary',
                fontSize: '0.7rem',
                cursor: 'default',
              }}
            >
              ⌨
            </Typography>
          </Tooltip>
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
            <SectionTable
              key={section.department}
              section={section}
              currentKw={kw}
              collapsed={!!collapsedSections[section.department]}
              onToggleCollapse={() => toggleSectionCollapse(section.department)}
              conflictMap={conflictMap}
              selectedCells={selectedCells}
              onCellClick={handleCellClick}
            />
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

      {/* Assignment Dialog */}
      <AssignmentDialog
        open={dialogState.open}
        taskId={dialogState.taskId}
        date={dialogState.date}
        dayName={dialogState.dayName}
        halfDay={dialogState.halfDay}
        department={dialogState.department}
        taskInfo={dialogState.taskInfo}
        existingAssignment={dialogState.existingAssignment}
        resources={uniqueResources}
        onSave={handleDialogSave}
        onClose={handleDialogClose}
      />

      {/* Quick-Assign Popover */}
      <QuickAssignPopover
        open={quickAssign.open}
        anchorEl={quickAssign.anchorEl}
        taskId={quickAssign.taskId}
        date={quickAssign.date}
        halfDay={quickAssign.halfDay}
        department={quickAssign.department}
        resources={uniqueResources}
        batchCells={selectedCells}
        onAssigned={handleQuickAssigned}
        onClose={handleQuickAssignClose}
        onOpenFullDialog={handleQuickAssignOpenFull}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ─── Section Table ─────────────────────────────────────

interface SelectedCellInfo {
  taskId: string;
  date: string;
  halfDay: HalfDay;
  department: string;
}

interface SectionTableProps {
  section: Section;
  currentKw: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  conflictMap: Map<string, string>;
  selectedCells: SelectedCellInfo[];
  onCellClick: (
    taskId: string,
    date: string,
    dayName: string,
    halfDay: HalfDay,
    department: string,
    taskInfo: DialogState['taskInfo'],
    existingAssignment: DayAssignmentDetail | null,
    anchorEl?: HTMLElement | null,
    shiftKey?: boolean
  ) => void;
}

function SectionTable({ section, currentKw, collapsed, onToggleCollapse, conflictMap, selectedCells, onCellClick }: SectionTableProps) {
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
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={onToggleCollapse}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ color: 'inherit', p: 0.25 }}>
            {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
          <Typography variant="h6">{section.label}</Typography>
          {(() => {
            const unassignedCount = section.tasks.filter((task) =>
              task.assignments.every(
                (day) => day.morning === null && day.afternoon === null
              )
            ).length;
            if (unassignedCount > 0) {
              return (
                <Chip
                  label={`${unassignedCount} nicht zugewiesen`}
                  size="small"
                  sx={{
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              );
            }
            return null;
          })()}
        </Box>
        <Typography variant="body2">
          {section.tasks.length} Aufträge · {section.totalHours.planned}h / {section.totalHours.available}h verfügbar
          {section.resources.length > 0 && ` · ${section.resources.length} Mitarbeiter`}
        </Typography>
      </Box>

      {!collapsed && (
        !hasTasks ? (
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
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 40 }}>Hilf.</TableCell>
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
                  <TaskRow
                    key={task.taskId}
                    task={task}
                    currentKw={currentKw}
                    department={section.department}
                    conflictMap={conflictMap}
                    selectedCells={selectedCells}
                    onCellClick={onCellClick}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Paper>
  );
}

// ─── Task Row ──────────────────────────────────────────

interface TaskRowProps {
  task: WeekPlanTask;
  currentKw: number;
  department: string;
  conflictMap: Map<string, string>;
  selectedCells: SelectedCellInfo[];
  onCellClick: SectionTableProps['onCellClick'];
}

function TaskRow({ task, currentKw, department, conflictMap, selectedCells, onCellClick }: TaskRowProps) {
  const taskInfo: DialogState['taskInfo'] = {
    projectOrderNumber: task.projectOrderNumber,
    customerName: task.customerName,
    description: task.description,
  };

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
      <TableCell sx={{ textAlign: 'center' }}>
        <Typography variant="body2" fontWeight={600}>
          {task.helperCount || '—'}
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

      {/* Day assignments – now clickable */}
      {task.assignments.map((day, idx) => (
        <TableCell key={day.date} sx={{ textAlign: 'center', px: 0.5 }}>
          <DayCell
            day={day}
            dayLabel={DAY_LABELS[idx]}
            taskId={task.taskId}
            department={department}
            taskInfo={taskInfo}
            conflictMap={conflictMap}
            selectedCells={selectedCells}
            onCellClick={onCellClick}
          />
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

// ─── Day Cell (Interactive) ────────────────────────────

interface DayCellProps {
  day: WeekPlanTask['assignments'][number];
  dayLabel: string;
  taskId: string;
  department: string;
  taskInfo: DialogState['taskInfo'];
  conflictMap: Map<string, string>;
  selectedCells: SelectedCellInfo[];
  onCellClick: SectionTableProps['onCellClick'];
}

function DayCell({ day, dayLabel, taskId, department, taskInfo, conflictMap, selectedCells, onCellClick }: DayCellProps) {
  const morning = day.morning;
  const afternoon = day.afternoon;
  const morningDetail = day.morningDetail ?? null;
  const afternoonDetail = day.afternoonDetail ?? null;

  // Check if cells are selected (for multi-select highlight)
  const isMorningSelected = selectedCells.some(
    (c) => c.taskId === taskId && c.date === day.date && c.halfDay === 'morning'
  );
  const isAfternoonSelected = selectedCells.some(
    (c) => c.taskId === taskId && c.date === day.date && c.halfDay === 'afternoon'
  );

  const selectedBorderSx = {
    border: '2px solid',
    borderColor: 'info.main',
    boxShadow: '0 0 0 1px rgba(25, 118, 210, 0.3)',
  };

  // Check for conflicts on this cell's assignments
  const morningConflict = morningDetail
    ? conflictMap.get(`${morningDetail.resourceId}|${day.date}|morning`) ?? null
    : null;
  const afternoonConflict = afternoonDetail
    ? conflictMap.get(`${afternoonDetail.resourceId}|${day.date}|afternoon`) ?? null
    : null;

  const conflictBorderSx = {
    border: '2px solid',
    borderColor: 'error.main',
  };

  const handleMorningClick = (e: React.MouseEvent<HTMLElement>) => {
    onCellClick(
      taskId,
      day.date,
      day.dayName,
      'morning',
      department,
      taskInfo,
      morningDetail,
      e.currentTarget,
      e.shiftKey
    );
  };

  const handleAfternoonClick = (e: React.MouseEvent<HTMLElement>) => {
    onCellClick(
      taskId,
      day.date,
      day.dayName,
      'afternoon',
      department,
      taskInfo,
      afternoonDetail,
      e.currentTarget,
      e.shiftKey
    );
  };

  const handleFullDayClick = (e: React.MouseEvent<HTMLElement>) => {
    // If both are the same person (full_day), open with the morning detail
    onCellClick(
      taskId,
      day.date,
      day.dayName,
      morningDetail?.halfDay === 'full_day' ? 'full_day' : 'morning',
      department,
      taskInfo,
      morningDetail,
      e.currentTarget,
      e.shiftKey
    );
  };

  // If same person for both halves, show once (clickable)
  if (morning && afternoon && morning === afternoon) {
    const fullDayConflict = morningConflict || afternoonConflict;
    return (
      <Tooltip title={fullDayConflict || day.notes || day.dayName}>
        <Chip
          label={getInitials(morning)}
          size="small"
          color={fullDayConflict ? 'error' : day.isFixed ? 'primary' : 'default'}
          variant={day.isFixed ? 'filled' : 'outlined'}
          onClick={handleFullDayClick}
          sx={{
            fontSize: '0.7rem',
            height: 22,
            fontWeight: 600,
            cursor: 'pointer',
            ...(fullDayConflict ? conflictBorderSx : {}),
            '&:hover': {
              boxShadow: fullDayConflict
                ? '0 0 0 2px rgba(211, 47, 47, 0.5)'
                : '0 0 0 2px rgba(25, 118, 210, 0.4)',
            },
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {/* Morning */}
      <Tooltip title={morningConflict || (morning ? `VM: ${morning}` : `${dayLabel} VM – Klick zum Zuweisen`)}>
        <Chip
          label={morning ? getInitials(morning) : 'FREI'}
          size="small"
          color={morningConflict ? 'error' : morning ? (day.isFixed ? 'primary' : 'default') : 'default'}
          variant={morning ? (day.isFixed ? 'filled' : 'outlined') : 'outlined'}
          onClick={handleMorningClick}
          sx={{
            fontSize: '0.6rem',
            height: 18,
            fontWeight: morning ? 600 : 400,
            opacity: morning ? 1 : isMorningSelected ? 1 : 0.5,
            cursor: 'pointer',
            ...(morningConflict ? conflictBorderSx : isMorningSelected ? selectedBorderSx : {}),
            '&:hover': {
              opacity: 1,
              boxShadow: morningConflict
                ? '0 0 0 2px rgba(211, 47, 47, 0.5)'
                : morning
                  ? '0 0 0 2px rgba(25, 118, 210, 0.4)'
                  : '0 0 0 2px rgba(76, 175, 80, 0.5)',
              bgcolor: morning ? undefined : 'action.hover',
            },
          }}
        />
      </Tooltip>

      {/* Afternoon */}
      <Tooltip title={afternoonConflict || (afternoon ? `NM: ${afternoon}` : `${dayLabel} NM – Klick zum Zuweisen`)}>
        <Chip
          label={afternoon ? getInitials(afternoon) : 'FREI'}
          size="small"
          color={afternoonConflict ? 'error' : afternoon ? (day.isFixed ? 'primary' : 'default') : 'default'}
          variant={afternoon ? (day.isFixed ? 'filled' : 'outlined') : 'outlined'}
          onClick={handleAfternoonClick}
          sx={{
            fontSize: '0.6rem',
            height: 18,
            fontWeight: afternoon ? 600 : 400,
            opacity: afternoon ? 1 : isAfternoonSelected ? 1 : 0.5,
            cursor: 'pointer',
            ...(afternoonConflict ? conflictBorderSx : isAfternoonSelected ? selectedBorderSx : {}),
            '&:hover': {
              opacity: 1,
              boxShadow: afternoonConflict
                ? '0 0 0 2px rgba(211, 47, 47, 0.5)'
                : afternoon
                  ? '0 0 0 2px rgba(25, 118, 210, 0.4)'
                  : '0 0 0 2px rgba(76, 175, 80, 0.5)',
              bgcolor: afternoon ? undefined : 'action.hover',
            },
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
