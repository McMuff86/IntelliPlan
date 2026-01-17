import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Grid, Box, Skeleton, useTheme, ButtonBase } from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  accentColor?: string;
}

const StatCard = ({ title, count, icon, onClick, loading, accentColor }: StatCardProps) => {
  const theme = useTheme();
  const tone = accentColor || theme.palette.primary.main;

  const content = (
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
      <Box
        sx={{
          width: 54,
          height: 54,
          borderRadius: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(tone, 0.14),
          color: tone,
          boxShadow: `0 10px 24px ${alpha(tone, 0.25)}`,
        }}
      >
        {icon}
      </Box>
      <Box>
        {loading ? (
          <>
            <Skeleton variant="text" width={48} height={36} />
            <Skeleton variant="text" width={110} />
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
    </CardContent>
  );

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        background: 'var(--ip-surface-elevated)',
        border: '1px solid var(--ip-outline)',
        boxShadow: 'var(--ip-shadow)',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${alpha(tone, 0.12)}, transparent 60%)`,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.2s ease',
        },
        ...(onClick && {
          cursor: 'pointer',
          '&:hover::after': {
            opacity: 1,
          },
        }),
      }}
    >
      {onClick ? (
        <ButtonBase
          onClick={onClick}
          sx={{
            width: '100%',
            height: '100%',
            textAlign: 'left',
            alignItems: 'stretch',
            borderRadius: 'inherit',
          }}
          aria-label={`${title} appointments`}
        >
          {content}
        </ButtonBase>
      ) : (
        <Box sx={{ width: '100%', height: '100%' }}>
          {content}
        </Box>
      )}
    </Card>
  );
};

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

  const formatDateParam = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
          accentColor="#0f766e"
          onClick={() => navigate(`/appointments/calendar?view=day&date=${formatDateParam(startOfDay)}`)}
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          title="This Week"
          count={weekCount}
          icon={<DateRangeIcon fontSize="large" />}
          accentColor="#2563eb"
          onClick={() => navigate(`/appointments/calendar?view=week&date=${formatDateParam(startOfWeek)}`)}
          loading={loading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          title="Total"
          count={totalCount}
          icon={<EventNoteIcon fontSize="large" />}
          accentColor="#f97316"
          onClick={() => navigate('/appointments/list?range=all')}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
};

export default StatsCards;
