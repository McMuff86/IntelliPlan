import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['N'], description: 'New Appointment' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Escape'], description: 'Close dialog / Cancel' },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp = ({ open, onClose }: KeyboardShortcutsHelpProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Keyboard Shortcuts</Typography>
        <IconButton onClick={onClose} size="small" aria-label="close shortcuts help">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {shortcuts.map((shortcut, index) => (
            <Box key={index}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Typography>{shortcut.description}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {shortcut.keys.map((key, keyIndex) => (
                    <Chip
                      key={keyIndex}
                      label={key}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        minWidth: 32,
                      }}
                    />
                  ))}
                </Box>
              </Box>
              {index < shortcuts.length - 1 && <Divider />}
            </Box>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
