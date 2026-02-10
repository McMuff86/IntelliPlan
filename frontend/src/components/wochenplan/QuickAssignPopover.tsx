import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Popover,
  Box,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Button,
  Divider,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import {
  wochenplanService,
  type WeekPlanResource,
  type BatchAssignItem,
  type ResourceConflict,
} from '../../services/wochenplanService';
import type { HalfDay } from '../../services/assignmentService';

export interface SelectedCell {
  taskId: string;
  date: string;
  halfDay: HalfDay;
  department: string;
}

export interface QuickAssignPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  taskId: string;
  date: string;
  halfDay: HalfDay;
  department: string;
  resources: WeekPlanResource[];
  /** Additional cells selected via shift+click for batch assignment */
  batchCells: SelectedCell[];
  onAssigned: (createdAssignments: number) => void | Promise<void>;
  onClose: () => void;
  onOpenFullDialog: () => void;
}

interface ApiConflictResponse {
  error?: string;
  data?: {
    conflicts?: ResourceConflict[];
  };
}

function formatHalfDayLabel(value: string): string {
  if (value === 'morning') return 'VM';
  if (value === 'afternoon') return 'NM';
  if (value === 'full_day') return 'Ganztag';
  return value;
}

function formatConflictLabel(conflict: ResourceConflict): string {
  const resource = conflict.shortCode || conflict.resourceName || 'Mitarbeiter';
  return `${resource} ${conflict.date} ${formatHalfDayLabel(conflict.halfDay)}`;
}

function extractAssignError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as {
      response?: { status?: number; data?: ApiConflictResponse };
    }).response;

    if (response?.status === 409) {
      const conflicts = response.data?.data?.conflicts;
      if (Array.isArray(conflicts) && conflicts.length > 0) {
        const preview = conflicts.slice(0, 2).map(formatConflictLabel).join(' · ');
        const more = conflicts.length > 2 ? ` +${conflicts.length - 2} weitere` : '';
        return `Konflikt erkannt: ${preview}${more}`;
      }
      return response.data?.error || 'Konflikte erkannt. Keine Zuordnung gespeichert.';
    }

    if (typeof response?.data?.error === 'string' && response.data.error.length > 0) {
      return response.data.error;
    }
  }

  return 'Fehler beim Zuweisen';
}

export default function QuickAssignPopover({
  open,
  anchorEl,
  taskId,
  date,
  halfDay,
  department,
  resources,
  batchCells,
  onAssigned,
  onClose,
  onOpenFullDialog,
}: QuickAssignPopoverProps) {
  const [filter, setFilter] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetLocalState = useCallback(() => {
    setFilter('');
    setAssigning(false);
    setError(null);
  }, []);

  const selectedTargets = useMemo(() => {
    const targetMap = new Map<string, SelectedCell>();
    const addTarget = (cell: SelectedCell) => {
      targetMap.set(`${cell.taskId}|${cell.date}|${cell.halfDay}`, cell);
    };

    addTarget({ taskId, date, halfDay, department });
    for (const cell of batchCells) {
      addTarget(cell);
    }

    return Array.from(targetMap.values());
  }, [taskId, date, halfDay, department, batchCells]);

  // Filter resources by department + search
  const filtered = useMemo(() => {
    return resources.filter((resource) => {
      const matchesDept =
        !department || resource.department === department || !resource.department;
      if (!matchesDept) return false;
      if (!filter.trim()) return true;
      const query = filter.toLowerCase();
      return (
        resource.name.toLowerCase().includes(query) ||
        (resource.shortCode?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [resources, department, filter]);

  // Focus input when popover opens
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleAssign = useCallback(
    async (resourceId: string) => {
      setAssigning(true);
      setError(null);

      try {
        const assignments: BatchAssignItem[] = selectedTargets.map((cell) => ({
          taskId: cell.taskId,
          resourceId,
          date: cell.date,
          halfDay: cell.halfDay,
        }));

        const result = await wochenplanService.assignBatch(assignments);
        resetLocalState();
        await onAssigned(result.created);
      } catch (err: unknown) {
        setError(extractAssignError(err));
        setAssigning(false);
      }
    },
    [selectedTargets, resetLocalState, onAssigned]
  );

  const handleCloseInternal = useCallback(() => {
    if (assigning) return;
    resetLocalState();
    onClose();
  }, [assigning, resetLocalState, onClose]);

  const handleOpenFullDialogInternal = useCallback(() => {
    if (assigning) return;
    resetLocalState();
    onOpenFullDialog();
  }, [assigning, resetLocalState, onOpenFullDialog]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filtered.length === 1) {
      e.preventDefault();
      void handleAssign(filtered[0].id);
    } else if (e.key === 'Escape') {
      handleCloseInternal();
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleCloseInternal}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{
        paper: {
          sx: { width: 280, maxHeight: 360, overflow: 'hidden' },
        },
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <TextField
          inputRef={inputRef}
          placeholder="Mitarbeiter suchen…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          fullWidth
          disabled={assigning}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {selectedTargets.length > 1 && (
        <Typography variant="caption" sx={{ px: 1.5, display: 'block', color: 'info.main', fontWeight: 600 }}>
          {selectedTargets.length} Zellen ausgewählt (Batch-Zuweisung)
        </Typography>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ px: 1.5, display: 'block' }}>
          {error}
        </Typography>
      )}

      <List dense sx={{ maxHeight: 220, overflow: 'auto', py: 0 }}>
        {filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
            Keine Mitarbeiter gefunden
          </Typography>
        ) : (
          filtered.map((r) => (
            <ListItemButton
              key={r.id}
              onClick={() => void handleAssign(r.id)}
              disabled={assigning}
              dense
            >
              <ListItemText
                primary={r.shortCode ? `${r.shortCode} – ${r.name}` : r.name}
                secondary={r.department || undefined}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>
          ))
        )}
      </List>

      <Divider />
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <Button
          size="small"
          startIcon={<OpenInFullIcon fontSize="small" />}
          onClick={handleOpenFullDialogInternal}
          disabled={assigning}
        >
          Erweitert…
        </Button>
      </Box>
    </Popover>
  );
}
