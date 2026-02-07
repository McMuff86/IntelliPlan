import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TextField,
  Button,
  Paper,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface AppointmentFiltersProps {
  onFiltersChange: (filters: {
    q?: string;
    from?: string;
    to?: string;
  }) => void;
}

export default function AppointmentFilters({ onFiltersChange }: AppointmentFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [to, setTo] = useState(searchParams.get('to') || '');

  const buildFilters = useCallback(() => {
    const filters: { q?: string; from?: string; to?: string } = {};
    if (q.trim()) filters.q = q.trim();
    if (from) filters.from = new Date(from).toISOString();
    if (to) filters.to = new Date(to).toISOString();
    return filters;
  }, [q, from, to]);

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    // Preserve non-filter params like range
    if (q.trim()) {
      params.set('q', q.trim());
    } else {
      params.delete('q');
    }
    if (from) {
      params.set('from', from);
    } else {
      params.delete('from');
    }
    if (to) {
      params.set('to', to);
    } else {
      params.delete('to');
    }

    setSearchParams(params, { replace: true });
  }, [q, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced notify parent
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange(buildFilters());
    }, 300);
    return () => clearTimeout(timer);
  }, [q, from, to, buildFilters, onFiltersChange]);

  const handleClear = () => {
    setQ('');
    setFrom('');
    setTo('');
  };

  const hasFilters = q.trim() || from || to;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
    >
      <TextField
        size="small"
        placeholder="Search appointments…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 220, flexGrow: 1, maxWidth: 360 }}
      />
      <TextField
        size="small"
        type="date"
        label="From"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 150 }}
      />
      <TextField
        size="small"
        type="date"
        label="To"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 150 }}
      />
      {hasFilters && (
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={handleClear}
          sx={{ textTransform: 'none' }}
        >
          Clear filters
        </Button>
      )}
    </Paper>
  );
}
