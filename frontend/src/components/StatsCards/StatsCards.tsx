import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Grid, Box, Skeleton } from '@mui/material';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { appointmentService } from '../../services/appointmentService';
import type { Appointment } from '../../types';

interface StatCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

const StatCard = ({ title, count, icon, onClick, loading }: StatCardProps) => (
  <Card
    onClick={onClick}
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { bgcolor: 'action.hover' } : {},
      height: '100%',
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Box>
          {loading ? (
            <>
              <Skeleton variant="text" width={40} height={40} />
              <Skeleton variant="text" width={80} />
            </>
          ) : (
            <>
              <Typography variant="h4" component="div">
                {count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const StatsCards = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await appointmentService.getAll();
        setAppointments(response.appointments);
      } catch (error) {
        console.error('Failed to load appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayCount = appointments.filter((apt) => {
    const start = new Date(apt.startTime);
    return start >= startOfDay && start < endOfDay;
  }).length;

  const weekCount = appointments.filter((apt) => {
    const start = new Date(apt.startTime);
    return start >= startOfWeek && start < endOfWeek;
  }).length;

  const totalCount = appointments.length;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          title="Today"
          count={todayCount}
          icon={<TodayIcon fontSize="large" />}
          onClick={() => navigate('/appointments/calendar')}
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          title="This Week"
          count={weekCount}
          icon={<DateRangeIcon fontSize="large" />}
          onClick={() => navigate('/appointments/calendar')}
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          title="Total"
          count={totalCount}
          icon={<EventNoteIcon fontSize="large" />}
          onClick={() => navigate('/appointments')}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
};

export default StatsCards;
