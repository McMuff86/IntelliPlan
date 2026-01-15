import { Box, Typography, Button } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AddIcon from '@mui/icons-material/Add';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const EmptyState = ({
  title,
  description,
  actionLabel = 'Create Appointment',
  onAction,
  icon,
}: EmptyStateProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box sx={{ mb: 2, color: 'text.secondary' }}>
        {icon || <EventBusyIcon sx={{ fontSize: 64 }} />}
      </Box>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
      )}
      {onAction && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
