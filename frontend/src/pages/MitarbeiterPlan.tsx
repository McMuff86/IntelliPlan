import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Chip,
  Paper,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import {
  mitarbeiterService,
  type ResourcesOverviewResponse,
} from '../services/mitarbeiterService';
import MitarbeiterGrid from '../components/mitarbeiter/MitarbeiterGrid';
import ResourceDetailPanel from '../components/mitarbeiter/ResourceDetailPanel';

// ─── Helpers ───────────────────────────────────────────

function getCurrentISOWeek(): { kw: number; year: number } {
  const now = new Date();
  const year = now.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(year, 0, 1).getTime()) / 86400000
  );
  const kw = Math.ceil((dayOfYear + jan4.getDay() + 1) / 7);
  return { kw: Math.min(kw, 53), year };
}

// ─── Constants ─────────────────────────────────────────

const DEPARTMENT_TABS = [
  { key: 'alle', label: 'Alle' },
  { key: 'zuschnitt', label: 'Zuschnitt' },
  { key: 'cnc', label: 'CNC' },
  { key: 'produktion', label: 'Produktion' },
  { key: 'behandlung', label: 'Behandlung' },
  { key: 'beschlaege', label: 'Beschläge' },
  { key: 'transport', label: 'Transport' },
  { key: 'montage', label: 'Montage' },
  { key: 'buero', label: 'Büro' },
];

// ─── Component ─────────────────────────────────────────

export default function MitarbeiterPlan() {
  const initial = getCurrentISOWeek();
  const [searchParams] = useSearchParams();
  const initialDept = searchParams.get('department') || 'alle';
  const initialSearch = searchParams.get('search') || '';

  const [kw, setKw] = useState(initial.kw);
  const [year, setYear] = useState(initial.year);
  const [department, setDepartment] = useState(initialDept);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [overview, setOverview] = useState<ResourcesOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel state
  const [detailResourceId, setDetailResourceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mitarbeiterService.getResourcesOverview(kw, year, department);
      setOverview(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Fehler beim Laden der Mitarbeiterdaten';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [kw, year, department]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // KW Navigation
  const handlePrev = () => {
    if (kw === 1) {
      setKw(52);
      setYear((y) => y - 1);
    } else {
      setKw((k) => k - 1);
    }
  };

  const handleNext = () => {
    if (kw >= 52) {
      setKw(1);
      setYear((y) => y + 1);
    } else {
      setKw((k) => k + 1);
    }
  };

  const handleKwChange = (e: SelectChangeEvent<number>) => {
    setKw(Number(e.target.value));
  };

  const handleYearChange = (e: SelectChangeEvent<number>) => {
    setYear(Number(e.target.value));
  };

  const handleDepartmentChange = (_: React.SyntheticEvent, newValue: string) => {
    setDepartment(newValue);
  };

  const handleResourceClick = (resourceId: string) => {
    setDetailResourceId(resourceId);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailResourceId(null);
  };

  // Filter resources by search query
  const filteredResources = useMemo(() => {
    if (!overview) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return overview.resources;
    return overview.resources.filter(
      (r) =>
        r.resourceName.toLowerCase().includes(query) ||
        (r.shortCode && r.shortCode.toLowerCase().includes(query))
    );
  }, [overview, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    if (!filteredResources.length) return null;
    const totalResources = filteredResources.length;
    const avgUtil =
      Math.round(
        (filteredResources.reduce((s, r) => s + r.weekSummary.utilizationPercent, 0) /
          totalResources) *
          10
      ) / 10;
    const overbooked = filteredResources.filter(
      (r) => r.weekSummary.utilizationPercent > 100
    ).length;
    const free = filteredResources.filter(
      (r) => r.weekSummary.utilizationPercent === 0
    ).length;
    return { totalResources, avgUtil, overbooked, free };
  }, [filteredResources]);

  const kwOptions = Array.from({ length: 53 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 10 }, (_, i) => year - 3 + i);

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PeopleIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Mitarbeiter-Plan
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrev} size="small" aria-label="Vorherige Woche">
            <ChevronLeftIcon />
          </IconButton>

          <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center' }}>
            KW
          </Typography>

          <Select
            value={kw}
            onChange={handleKwChange}
            size="small"
            sx={{ minWidth: 80 }}
          >
            {kwOptions.map((w) => (
              <MenuItem key={w} value={w}>
                {w}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={year}
            onChange={handleYearChange}
            size="small"
            sx={{ minWidth: 100 }}
          >
            {yearOptions.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>

          <IconButton onClick={handleNext} size="small" aria-label="Nächste Woche">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Date range */}
      {overview && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {overview.dateRange.from} — {overview.dateRange.to}
        </Typography>
      )}

      {/* Department Tabs + Search */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Tabs
            value={department}
            onChange={handleDepartmentChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { minHeight: 40, py: 0.5, textTransform: 'none' },
            }}
          >
            {DEPARTMENT_TABS.map((tab) => (
              <Tab key={tab.key} value={tab.key} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        <TextField
          size="small"
          placeholder="Suche nach Name oder Kürzel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 250 }}
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

      {/* Stats bar */}
      {stats && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Chip
            label={`${stats.totalResources} Mitarbeiter`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Ø ${stats.avgUtil}% Auslastung`}
            size="small"
            color={stats.avgUtil > 90 ? 'error' : stats.avgUtil > 70 ? 'warning' : 'success'}
            variant="outlined"
          />
          {stats.overbooked > 0 && (
            <Chip
              label={`${stats.overbooked} überbucht`}
              size="small"
              color="error"
              variant="filled"
            />
          )}
          {stats.free > 0 && (
            <Chip
              label={`${stats.free} unbelegt`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Paper>
      )}

      {/* Loading / Error */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Grid */}
      {!loading && !error && (
        <MitarbeiterGrid
          resources={filteredResources}
          onResourceClick={handleResourceClick}
        />
      )}

      {/* Resource Detail Panel */}
      <ResourceDetailPanel
        open={detailOpen}
        resourceId={detailResourceId}
        kw={kw}
        year={year}
        onClose={handleDetailClose}
      />
    </Box>
  );
}
