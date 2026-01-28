import { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Collapse,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import TimerIcon from '@mui/icons-material/Timer';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { AISuggestion } from '../../types';

const strategyConfig: Record<
  AISuggestion['type'],
  { icon: React.ReactNode; label: string; color: string }
> = {
  reschedule: {
    icon: <ScheduleIcon />,
    label: '🔄 Reschedule',
    color: '#0f766e',
  },
  split: {
    icon: <ContentCutIcon />,
    label: '✂️ Split',
    color: '#7c3aed',
  },
  shorten: {
    icon: <TimerIcon />,
    label: '⏱️ Shorten',
    color: '#d97706',
  },
  swap: {
    icon: <SwapHorizIcon />,
    label: '🔁 Swap',
    color: '#2563eb',
  },
  move_earlier: {
    icon: <FastRewindIcon />,
    label: '⏪ Move Earlier',
    color: '#059669',
  },
};

interface AISuggestionsProps {
  suggestions: AISuggestion[];
  onApply: (suggestion: AISuggestion) => void;
  disabled?: boolean;
}

export default function AISuggestions({
  suggestions,
  onApply,
  disabled = false,
}: AISuggestionsProps) {
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleApply = async (suggestion: AISuggestion, index: number) => {
    setApplyingIndex(index);
    setError(null);
    try {
      onApply(suggestion);
      setAppliedIndex(index);
    } catch {
      setError('Failed to apply suggestion. Please try again.');
    } finally {
      setApplyingIndex(null);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AutoFixHighIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 600 }}>
          AI Suggestions
        </Typography>
      </Box>

      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      </Collapse>

      <List
        dense
        sx={{
          bgcolor: 'action.hover',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {suggestions.map((suggestion, index) => {
          const config = strategyConfig[suggestion.type];
          const isApplying = applyingIndex === index;
          const isApplied = appliedIndex === index;

          return (
            <ListItem
              key={`${suggestion.type}-${index}`}
              divider={index < suggestions.length - 1}
              sx={{
                py: 1.5,
                opacity: appliedIndex !== null && !isApplied ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: config.color }}>
                {config.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {config.label}
                    </Typography>
                    {suggestion.confidence >= 0.8 && (
                      <Chip
                        label="Recommended"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box component="span">
                    <Typography variant="body2" component="span" sx={{ color: 'text.secondary', display: 'block' }}>
                      {suggestion.description}
                    </Typography>
                    {suggestion.proposedTime && (
                      <Typography
                        variant="caption"
                        component="span"
                        sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                      >
                        → {formatTime(suggestion.proposedTime.startTime)} –{' '}
                        {formatTime(suggestion.proposedTime.endTime)}
                      </Typography>
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                {isApplied ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    disabled={disabled || isApplying || appliedIndex !== null}
                    onClick={() => handleApply(suggestion, index)}
                    startIcon={isApplying ? <CircularProgress size={14} /> : undefined}
                    sx={{ minWidth: 90, textTransform: 'none' }}
                  >
                    {isApplying ? 'Applying…' : 'Apply'}
                  </Button>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
