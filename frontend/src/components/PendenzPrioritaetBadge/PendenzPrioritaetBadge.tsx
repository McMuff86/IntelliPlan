import { Chip } from '@mui/material';
import type { PendenzPrioritaet } from '../../types';

const prioritaetConfig: Record<PendenzPrioritaet, { label: string; color: 'error' | 'warning' | 'success' }> = {
  hoch: { label: 'Hoch', color: 'error' },
  mittel: { label: 'Mittel', color: 'warning' },
  niedrig: { label: 'Normal', color: 'success' },
};

interface PendenzPrioritaetBadgeProps {
  prioritaet: PendenzPrioritaet;
  size?: 'small' | 'medium';
}

const PendenzPrioritaetBadge = ({ prioritaet, size = 'small' }: PendenzPrioritaetBadgeProps) => {
  const config = prioritaetConfig[prioritaet];
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
};

export default PendenzPrioritaetBadge;
