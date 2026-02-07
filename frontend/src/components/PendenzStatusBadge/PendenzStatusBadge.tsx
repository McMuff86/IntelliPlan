import { Chip } from '@mui/material';
import type { PendenzStatus } from '../../types';

const statusConfig: Record<PendenzStatus, { label: string; color: 'info' | 'warning' | 'success' }> = {
  offen: { label: 'Offen', color: 'info' },
  in_arbeit: { label: 'In Arbeit', color: 'warning' },
  erledigt: { label: 'Erledigt', color: 'success' },
};

interface PendenzStatusBadgeProps {
  status: PendenzStatus;
  size?: 'small' | 'medium';
  archived?: boolean;
}

const PendenzStatusBadge = ({ status, size = 'small', archived = false }: PendenzStatusBadgeProps) => {
  if (archived) {
    return (
      <Chip
        label="Archiviert"
        size={size}
        sx={{
          bgcolor: 'action.disabledBackground',
          color: 'text.disabled',
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    );
  }

  const config = statusConfig[status];
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
};

export default PendenzStatusBadge;
