import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { reminderService } from '../../services/reminderService';
import type { Reminder } from '../../services/reminderService';
import { useTimezone } from '../../hooks/useTimezone';

interface UpcomingReminder extends Reminder {
  appointment?: {
    id: string;
    title: string;
  };
}

const UpcomingReminders = () => {
  const navigate = useNavigate();
  const { timezone } = useTimezone();
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        setLoading(true);
        const data = await reminderService.getUpcoming();
        setReminders(data.slice(0, 5));
      } catch (err) {
        setError('Failed to load reminders');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUpcoming();
  }, []);

  const formatReminderTime = (isoString: string) => {
    const date = toZonedTime(isoString, timezone);
    return format(date, 'EEE, MMM d | h:mm a');
  };

  const handleDismiss = async (id: string) => {
    try {
      await reminderService.dismiss(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to dismiss reminder', err);
    }
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
              bgcolor: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
            }}
          >
            <NotificationsActiveIcon />
          </Box>
        }
        title="Upcoming Reminders"
        subheader="Your next notifications"
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
        ) : reminders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="text.secondary">
              No upcoming reminders
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {reminders.map((reminder) => (
              <ListItem
                key={reminder.id}
                disablePadding
                sx={{ mb: 1 }}
                secondaryAction={
                  <Tooltip title="Dismiss">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDismiss(reminder.id)}
                    >
                      <DoneAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton
                  onClick={() => navigate(`/appointments/${reminder.appointmentId}`)}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid var(--ip-outline)',
                    background: 'var(--ip-surface)',
                    pr: 6,
                    '&:hover': {
                      background: 'rgba(245, 158, 11, 0.12)',
                    },
                  }}
                >
                  <ListItemText
                    primary={reminder.appointment?.title ?? 'Appointment'}
                    secondary={formatReminderTime(reminder.remindAt)}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingReminders;
