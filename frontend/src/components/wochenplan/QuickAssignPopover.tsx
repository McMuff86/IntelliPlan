import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { WeekPlanResource } from '../../services/wochenplanService';
import { assignmentService } from '../../services/assignmentService';
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
  onAssigned: () => void;
  onClose: () => void;
  onOpenFullDialog: () => void;
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

  // Filter resources by department + search
  const filtered = resources.filter((r) => {
    const matchesDept = !department || r.department === department || !r.department;
    if (!matchesDept) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.shortCode?.toLowerCase().includes(q) ?? false)
    );
  });

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setFilter('');
      setError(null);
      setAssigning(false);
      // Focus search input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleAssign = useCallback(
    async (resourceId: string) => {
      setAssigning(true);
      setError(null);
      try {
        // Assign to the primary cell
        await assignmentService.createAssignment(taskId, {
          resourceId,
          assignmentDate: date,
          halfDay,
        });

        // Assign to all batch-selected cells
        for (const cell of batchCells) {
          // Skip if same as primary cell
          if (cell.taskId === taskId && cell.date === date && cell.halfDay === halfDay) {
            continue;
          }
          try {
            await assignmentService.createAssignment(cell.taskId, {
              resourceId,
              assignmentDate: cell.date,
              halfDay: cell.halfDay,
            });
          } catch {
            // Skip conflicts on individual batch cells
          }
        }

        onAssigned();
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
          if (axiosErr.response?.status === 409) {
            setError('Bereits zugewiesen');
          } else {
            setError(axiosErr.response?.data?.error || 'Fehler');
          }
        } else {
          setError('Fehler beim Zuweisen');
        }
        setAssigning(false);
      }
    },
    [taskId, date, halfDay, batchCells, onAssigned]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filtered.length === 1) {
      e.preventDefault();
      void handleAssign(filtered[0].id);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={assigning ? undefined : onClose}
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

      {batchCells.length > 0 && (
        <Typography variant="caption" sx={{ px: 1.5, display: 'block', color: 'info.main', fontWeight: 600 }}>
          {batchCells.length + 1} Zellen ausgewählt (Batch-Zuweisung)
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
          onClick={onOpenFullDialog}
          disabled={assigning}
        >
          Erweitert…
        </Button>
      </Box>
    </Popover>
  );
}
