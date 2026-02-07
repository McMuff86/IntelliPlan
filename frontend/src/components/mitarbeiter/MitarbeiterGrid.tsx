import { useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Chip,
  LinearProgress,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type {
  ResourceOverviewEntry,
  ResourceSlot,
} from '../../services/mitarbeiterService';

// ─── Constants ─────────────────────────────────────────

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

const STATUS_COLORS: Record<string, string> = {
  assigned: '#1565c0',   // Blue
  available: '#2e7d32',  // Green
  sick: '#e65100',       // Orange
  vacation: '#6a1b9a',   // Purple
  training: '#757575',   // Grey
  other: '#757575',      // Grey
};

const STATUS_BG_COLORS: Record<string, string> = {
  assigned: '#e3f2fd',
  available: '#e8f5e9',
  sick: '#fff3e0',
  vacation: '#f3e5f5',
  training: '#f5f5f5',
  other: '#f5f5f5',
};

const FIX_COLOR = '#c62828'; // Red for FIX
const FIX_BG = '#ffebee';

// ─── Props ─────────────────────────────────────────────

interface MitarbeiterGridProps {
  resources: ResourceOverviewEntry[];
  onResourceClick: (resourceId: string) => void;
}

// ─── Component ─────────────────────────────────────────

export default function MitarbeiterGrid({
  resources,
  onResourceClick,
}: MitarbeiterGridProps) {
  const navigate = useNavigate();

  // Group resources by department for visual separation
  const groupedResources = useMemo(() => {
    const groups = new Map<string, ResourceOverviewEntry[]>();
    for (const r of resources) {
      const dept = r.department || 'unbekannt';
      if (!groups.has(dept)) {
        groups.set(dept, []);
      }
      groups.get(dept)!.push(r);
    }
    return groups;
  }, [resources]);

  if (resources.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Keine Mitarbeiter gefunden
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1100 }}>
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                fontWeight: 700,
                minWidth: 120,
                position: 'sticky',
                left: 0,
                bgcolor: 'background.paper',
                zIndex: 2,
              }}
            >
              MA
            </TableCell>
            {DAY_LABELS.map((day) => (
              <TableCell
                key={day}
                colSpan={2}
                sx={{ fontWeight: 700, textAlign: 'center', borderLeft: '1px solid', borderColor: 'divider' }}
              >
                {day}
              </TableCell>
            ))}
            <TableCell
              sx={{
                fontWeight: 700,
                textAlign: 'center',
                minWidth: 80,
                borderLeft: '1px solid',
                borderColor: 'divider',
              }}
            >
              %
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              sx={{
                fontWeight: 600,
                fontSize: '0.7rem',
                position: 'sticky',
                left: 0,
                bgcolor: 'background.paper',
                zIndex: 2,
              }}
            />
            {DAY_LABELS.map((day) => (
              <SubDayHeaders key={day} />
            ))}
            <TableCell sx={{ borderLeft: '1px solid', borderColor: 'divider' }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from(groupedResources.entries()).map(([dept, deptResources]) => (
            <DepartmentGroup
              key={dept}
              department={dept}
              resources={deptResources}
              onResourceClick={onResourceClick}
              onCellClick={(taskId) => {
                if (taskId) {
                  navigate(`/wochenplan`);
                }
              }}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ─── Sub-day headers (VM / NM) ────────────────────────

function SubDayHeaders() {
  return (
    <>
      <TableCell
        sx={{
          fontWeight: 600,
          fontSize: '0.65rem',
          textAlign: 'center',
          color: 'text.secondary',
          borderLeft: '1px solid',
          borderColor: 'divider',
          py: 0.25,
        }}
      >
        VM
      </TableCell>
      <TableCell
        sx={{
          fontWeight: 600,
          fontSize: '0.65rem',
          textAlign: 'center',
          color: 'text.secondary',
          py: 0.25,
        }}
      >
        NM
      </TableCell>
    </>
  );
}

// ─── Department Group ──────────────────────────────────

const DEPT_LABELS: Record<string, string> = {
  zuschnitt: 'Zuschnitt',
  cnc: 'CNC',
  produktion: 'Produktion',
  behandlung: 'Behandlung',
  beschlaege: 'Beschläge',
  transport: 'Transport',
  montage: 'Montage',
  buero: 'Büro',
  unbekannt: 'Unbekannt',
};

interface DepartmentGroupProps {
  department: string;
  resources: ResourceOverviewEntry[];
  onResourceClick: (resourceId: string) => void;
  onCellClick: (taskId: string | null) => void;
}

function DepartmentGroup({
  department,
  resources,
  onResourceClick,
  onCellClick,
}: DepartmentGroupProps) {
  return (
    <>
      {/* Department header row */}
      <TableRow>
        <TableCell
          colSpan={12}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 700,
            py: 0.75,
            px: 2,
            fontSize: '0.85rem',
          }}
        >
          {DEPT_LABELS[department] || department} ({resources.length})
        </TableCell>
      </TableRow>

      {/* Resource rows */}
      {resources.map((resource) => (
        <ResourceRow
          key={resource.resourceId}
          resource={resource}
          onResourceClick={onResourceClick}
          onCellClick={onCellClick}
        />
      ))}
    </>
  );
}

// ─── Resource Row ──────────────────────────────────────

interface ResourceRowProps {
  resource: ResourceOverviewEntry;
  onResourceClick: (resourceId: string) => void;
  onCellClick: (taskId: string | null) => void;
}

function ResourceRow({ resource, onResourceClick, onCellClick }: ResourceRowProps) {
  const utilPct = resource.weekSummary.utilizationPercent;
  const utilColor =
    utilPct > 100 ? 'error' : utilPct > 90 ? 'warning' : utilPct > 70 ? 'info' : 'success';

  return (
    <TableRow hover>
      {/* Resource name - sticky */}
      <TableCell
        sx={{
          position: 'sticky',
          left: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
        onClick={() => onResourceClick(resource.resourceId)}
      >
        <Typography variant="body2" fontWeight={700} noWrap>
          {resource.shortCode || resource.resourceName}
        </Typography>
        {resource.shortCode && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {resource.resourceName}
          </Typography>
        )}
      </TableCell>

      {/* Day cells - morning + afternoon per day */}
      {resource.days.map((day) => (
        <DayCells
          key={day.date}
          morning={day.morning}
          afternoon={day.afternoon}
          date={day.date}
          dayName={day.dayName}
          onCellClick={onCellClick}
        />
      ))}

      {/* Utilization % */}
      <TableCell
        sx={{
          textAlign: 'center',
          borderLeft: '1px solid',
          borderColor: 'divider',
          minWidth: 80,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Chip
            label={`${utilPct}%`}
            size="small"
            color={utilColor}
            variant={utilPct > 100 ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, fontSize: '0.75rem', height: 22 }}
          />
          <LinearProgress
            variant="determinate"
            value={Math.min(utilPct, 100)}
            color={utilColor === 'info' ? 'primary' : utilColor}
            sx={{ width: '100%', height: 4, borderRadius: 2 }}
          />
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ─── Day Cells (Morning + Afternoon) ──────────────────

interface DayCellsProps {
  morning: ResourceSlot | null;
  afternoon: ResourceSlot | null;
  date: string;
  dayName: string;
  onCellClick: (taskId: string | null) => void;
}

function DayCells({ morning, afternoon, date, dayName, onCellClick }: DayCellsProps) {
  return (
    <>
      <TableCell
        sx={{
          textAlign: 'center',
          p: 0.25,
          borderLeft: '1px solid',
          borderColor: 'divider',
          minWidth: 60,
        }}
      >
        <SlotChip
          slot={morning}
          halfLabel="VM"
          date={date}
          dayName={dayName}
          onClick={() => onCellClick(morning?.taskId ?? null)}
        />
      </TableCell>
      <TableCell sx={{ textAlign: 'center', p: 0.25, minWidth: 60 }}>
        <SlotChip
          slot={afternoon}
          halfLabel="NM"
          date={date}
          dayName={dayName}
          onClick={() => onCellClick(afternoon?.taskId ?? null)}
        />
      </TableCell>
    </>
  );
}

// ─── Slot Chip ─────────────────────────────────────────

interface SlotChipProps {
  slot: ResourceSlot | null;
  halfLabel: string;
  date: string;
  dayName: string;
  onClick: () => void;
}

function SlotChip({ slot, halfLabel, date, dayName, onClick }: SlotChipProps) {
  if (!slot) {
    // Free slot
    return (
      <Box
        sx={{
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          bgcolor: '#e8f5e9',
          cursor: 'default',
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontSize: '0.6rem', color: '#2e7d32', fontWeight: 500 }}
        >
          FREI
        </Typography>
      </Box>
    );
  }

  const isFixed = slot.isFixed;
  const status = slot.statusCode || 'assigned';
  const bgColor = isFixed ? FIX_BG : STATUS_BG_COLORS[status] || STATUS_BG_COLORS.assigned;
  const textColor = isFixed ? FIX_COLOR : STATUS_COLORS[status] || STATUS_COLORS.assigned;

  // Display text: project order number abbreviation or status
  let label = '';
  if (status === 'sick') label = 'KRANK';
  else if (status === 'vacation') label = 'FERIEN';
  else if (status === 'training') label = 'KURS';
  else if (status === 'other') label = 'ANDERE';
  else if (slot.projectOrderNumber) {
    // Abbreviate: take first 6 chars
    label = slot.projectOrderNumber.length > 6
      ? slot.projectOrderNumber.substring(0, 6)
      : slot.projectOrderNumber;
  } else {
    label = isFixed ? 'FIX' : '●';
  }

  // Tooltip
  const tooltipLines: string[] = [];
  if (slot.projectOrderNumber) tooltipLines.push(`Auftrag: ${slot.projectOrderNumber}`);
  if (slot.customerName) tooltipLines.push(`Kunde: ${slot.customerName}`);
  if (slot.description) tooltipLines.push(`Arbeit: ${slot.description}`);
  if (slot.installationLocation) tooltipLines.push(`Ort: ${slot.installationLocation}`);
  if (isFixed) tooltipLines.push('⚡ FIX');
  if (slot.notes) tooltipLines.push(`Notiz: ${slot.notes}`);
  tooltipLines.push(`${dayName} ${halfLabel} · ${date}`);

  return (
    <Tooltip title={tooltipLines.join('\n')} arrow placement="top">
      <Box
        onClick={slot.taskId ? onClick : undefined}
        sx={{
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          bgcolor: bgColor,
          border: isFixed ? `2px solid ${FIX_COLOR}` : '1px solid transparent',
          cursor: slot.taskId ? 'pointer' : 'default',
          transition: 'all 0.15s',
          '&:hover': slot.taskId
            ? { boxShadow: `0 0 0 2px ${textColor}40`, transform: 'scale(1.05)' }
            : undefined,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.6rem',
            fontWeight: 700,
            color: textColor,
            lineHeight: 1,
            px: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 55,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}
