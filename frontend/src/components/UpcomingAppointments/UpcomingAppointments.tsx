import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Button,
  Box,
  Skeleton,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { appointmentService } from '../../services/appointmentService';
import { useTimezone } from '../../hooks/useTimezone';
import type { Appointment } from '../../types';

const UpcomingAppointments = () => {
  const navigate = useNavigate();
  const { timezone } = useTimezone();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        setLoading(true);
        const now = new Date().toISOString();
        const response = await appointmentService.getAll({
          start: now,
          limit: 5,
        });
        setAppointments(response.appointments);
      } catch (err) {
        setError('Failed to load appointments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, []);

  const formatDateTime = (isoString: string) => {
    const date = toZonedTime(isoString, timezone);
    return format(date, 'EEE, MMM d | h:mm a');
  };

  const handleAppointmentClick = (id: string) => {
    navigate(`/appointments/${id}`);
  };

  return (
    <Card
      sx={{
        background: 'var(--ip-surface-elevated)',
        border: '1px solid var(--ip-outline)',
        boxShadow: 'var(--ip-shadow)',
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'rgba(37, 99, 235, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <EventIcon />
          </Box>
        }
        title="Upcoming Appointments"
        subheader="Your next five meetings"
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent sx={{ pt: 0 }}>
        {loading ? (
          <List disablePadding>
            {[...Array(3)].map((_, index) => (
              <ListItem key={index} disablePadding sx={{ py: 1 }}>
                <ListItemText
                  primary={<Skeleton variant="text" width="70%" />}
                  secondary={<Skeleton variant="text" width="50%" />}
                />
              </ListItem>
            ))}
          </List>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : appointments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="text.secondary" gutterBottom>
              No upcoming appointments
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/appointments/new')}
            >
              Create Appointment
            </Button>
          </Box>
        ) : (
          <List disablePadding>
            {appointments.map((appointment) => (
              <ListItem key={appointment.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleAppointmentClick(appointment.id)}
                sx={{
                  borderRadius: 2,
                  border: '1px solid var(--ip-outline)',
                  background: 'var(--ip-surface)',
                  '&:hover': {
                    background: 'rgba(15, 118, 110, 0.12)',
                  },
                }}
              >
                  <ListItemText
                    primary={appointment.title}
                    secondary={formatDateTime(appointment.startTime)}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      {appointments.length > 0 && (
        <CardActions>
          <Button size="small" onClick={() => navigate('/appointments')}>
            View All
          </Button>
        </CardActions>
      )}
    </Card>
  );
};

export default UpcomingAppointments;


