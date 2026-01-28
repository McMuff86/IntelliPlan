import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Appointment, AISuggestion } from '../../types';
import AISuggestions from '../AISuggestions';

interface OverlapWarningDialogProps {
  open: boolean;
  conflicts: Appointment[];
  aiSuggestions?: AISuggestion[];
  onCancel: () => void;
  onConfirm: () => void;
  onApplySuggestion?: (suggestion: AISuggestion) => void;
  isSubmitting?: boolean;
}

export default function OverlapWarningDialog({
  open,
  conflicts,
  aiSuggestions,
  onCancel,
  onConfirm,
  onApplySuggestion,
  isSubmitting = false,
}: OverlapWarningDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="overlap-warning-dialog-title"
    >
      <DialogTitle id="overlap-warning-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          <Typography variant="h6" component="span">
            Scheduling Conflict Detected
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          This appointment overlaps with the following existing appointments:
        </Typography>
        <List
          sx={{
            bgcolor: 'warning.light',
            borderRadius: 1,
            mt: 1,
          }}
        >
          {conflicts.map((conflict) => (
            <ListItem key={conflict.id} divider>
              <ListItemText
                primary={conflict.title}
                secondary={`${new Date(conflict.startTime).toLocaleString()} - ${new Date(conflict.endTime).toLocaleString()}`}
                primaryTypographyProps={{ fontWeight: 'medium' }}
              />
            </ListItem>
          ))}
        </List>

        {aiSuggestions && aiSuggestions.length > 0 && onApplySuggestion && (
          <>
            <Divider sx={{ my: 2 }} />
            <AISuggestions
              suggestions={aiSuggestions}
              onApply={onApplySuggestion}
              disabled={isSubmitting}
            />
          </>
        )}

        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          {aiSuggestions && aiSuggestions.length > 0
            ? 'Apply a suggestion above, create anyway, or go back to modify manually.'
            : 'Would you like to create this appointment anyway, or go back to modify it?'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="warning"
          disabled={isSubmitting}
        >
          Create Anyway
        </Button>
      </DialogActions>
    </Dialog>
  );
}
