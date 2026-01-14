import { useMemo, useCallback } from 'react';
import { Box, Typography, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Add as AddIcon, ViewList, CalendarMonth } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import AppointmentsList from '../components/AppointmentsList';
import CalendarView from '../components/CalendarView';

type ViewMode = 'list' | 'calendar';

const VIEW_STORAGE_KEY = 'intelliplan-view-preference';

export default function Appointments() {
  const navigate = useNavigate();
  const location = useLocation();

  const viewMode = useMemo<ViewMode>(() => {
    if (location.pathname === '/appointments/calendar') return 'calendar';
    if (location.pathname === '/appointments/list') return 'list';
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'calendar') return 'calendar';
    return 'list';
  }, [location.pathname]);

  const handleViewChange = useCallback((_event: React.MouseEvent<HTMLElement>, newView: ViewMode | null) => {
    if (newView && newView !== viewMode) {
      localStorage.setItem(VIEW_STORAGE_KEY, newView);
      const targetPath = newView === 'calendar' ? '/appointments/calendar' : '/appointments/list';
      navigate(targetPath);
    }
  }, [navigate, viewMode]);

  const handleRedirect = useCallback(() => {
    if (location.pathname === '/appointments') {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      const targetPath = stored === 'calendar' ? '/appointments/calendar' : '/appointments/list';
      navigate(targetPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  if (location.pathname === '/appointments') {
    handleRedirect();
    return null;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Appointments
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewChange}
            size="small"
          >
            <ToggleButton value="list" aria-label="list view">
              <ViewList sx={{ mr: 0.5 }} />
              List
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="calendar view">
              <CalendarMonth sx={{ mr: 0.5 }} />
              Calendar
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/appointments/new')}
          >
            New Appointment
          </Button>
        </Box>
      </Box>
      <Box sx={{ transition: 'opacity 0.2s ease-in-out' }}>
        {viewMode === 'list' ? <AppointmentsList /> : <CalendarView />}
      </Box>
    </Box>
  );
}
