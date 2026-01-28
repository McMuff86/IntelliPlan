import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  NotificationsActive as NotificationsIcon,
  DoneAll as DismissIcon,
  DeleteOutline as RemoveIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { appointmentService } from '../services/appointmentService';
import { reminderService } from '../services/reminderService';
import type { Reminder } from '../services/reminderService';
import type { Appointment } from '../types';
import AppointmentForm from '../components/AppointmentForm';
import { useTimezone } from '../hooks/useTimezone';
import Breadcrumbs from '../components/Breadcrumbs';
import ConfirmDialog from '../components/ConfirmDialog';

const REMINDER_PRESETS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '1 day', minutes: 1440 },
];

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { timezone: preferredTimezone } = useTimezone();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [addingReminder, setAddingReminder] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchAppointment = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await appointmentService.getById(id);
        setAppointment(data);
      } catch (err) {
        setError('Failed to load appointment');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchReminders = async () => {
      try {
        setRemindersLoading(true);
        const data = await reminderService.getForAppointment(id);
        setReminders(data);
      } catch (err) {
        console.error('Failed to load reminders', err);
      } finally {
        setRemindersLoading(false);
      }
    };
    fetchReminders();
  }, [id]);

  const handleAddReminder = async (offsetMinutes: number) => {
    if (!id) return;
    try {
      setAddingReminder(true);
      const newReminder = await reminderService.create(id, offsetMinutes);
      setReminders((prev) => [...prev, newReminder]);
    } catch (err) {
      console.error('Failed to add reminder', err);
    } finally {
      setAddingReminder(false);
    }
  };

  const handleDismissReminder = async (reminderId: string) => {
    try {
      await reminderService.dismiss(reminderId);
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, status: 'dismissed' as const } : r))
      );
    } catch (err) {
      console.error('Failed to dismiss reminder', err);
    }
  };

  const handleRemoveReminder = async (reminderId: string) => {
    try {
      await reminderService.remove(reminderId);
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (err) {
      console.error('Failed to remove reminder', err);
    }
  };

  const formatDateTime = (isoString: string) => {
    const utcDate = parseISO(isoString);
    const zonedDate = toZonedTime(utcDate, preferredTimezone);
    return format(zonedDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
  };

  const handleDelete = async () => {
    if (!appointment) return;

    try {
      setDeleting(true);
      await appointmentService.delete(appointment.id);
      navigate('/appointments');
    } catch (err) {
      setError('Failed to delete appointment');
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleEditSuccess = (updatedAppointment: Appointment) => {
    setAppointment(updatedAppointment);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !appointment) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Appointment not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/appointments')}
        >
          Back to Appointments
        </Button>
      </Container>
    );
  }

  if (isEditing) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => setIsEditing(false)}
          sx={{ mb: 2 }}
        >
          Cancel Edit
        </Button>
        <AppointmentForm
          initialData={appointment}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs
        items={[
          { label: 'Appointments', path: '/appointments' },
          { label: appointment.title },
        ]}
      />

      <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            gap: 2,
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h1">
            {appointment.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
              fullWidth
              sx={{ flexGrow: { xs: 1, sm: 0 } }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              fullWidth
              sx={{ flexGrow: { xs: 1, sm: 0 } }}
            >
              Delete
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {appointment.description && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1">
                {appointment.description}
              </Typography>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Start
            </Typography>
            <Typography variant="body1">
              {formatDateTime(appointment.startTime)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              End
            </Typography>
            <Typography variant="body1">
              {formatDateTime(appointment.endTime)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Appointment Timezone
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={appointment.timezone.replace(/_/g, ' ')}
                size="small"
                variant="outlined"
                color={appointment.timezone === preferredTimezone ? 'primary' : 'default'}
              />
              {appointment.timezone !== preferredTimezone && (
                <Typography variant="caption" color="text.secondary">
                  (Displayed in {preferredTimezone.replace(/_/g, ' ')})
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body2">
                {format(parseISO(appointment.createdAt), 'MMM d, yyyy h:mm a')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body2">
                {format(parseISO(appointment.updatedAt), 'MMM d, yyyy h:mm a')}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Reminders Section */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <NotificationsIcon color="primary" />
            <Typography variant="h6">Reminders</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {REMINDER_PRESETS.map((preset) => (
              <Chip
                key={preset.minutes}
                label={`${preset.label} before`}
                onClick={() => handleAddReminder(preset.minutes)}
                variant="outlined"
                color="primary"
                disabled={addingReminder}
                clickable
              />
            ))}
          </Box>

          {remindersLoading ? (
            <CircularProgress size={24} />
          ) : reminders.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No reminders set. Click a preset above to add one.
            </Typography>
          ) : (
            <List disablePadding>
              {reminders.map((reminder) => (
                <ListItem
                  key={reminder.id}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    mb: 1,
                    px: 2,
                  }}
                  secondaryAction={
                    <Box>
                      {reminder.status === 'pending' && (
                        <Tooltip title="Dismiss">
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleDismissReminder(reminder.id)}
                            sx={{ mr: 0.5 }}
                          >
                            <DismissIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveReminder(reminder.id)}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      reminder.offsetMinutes != null
                        ? `${reminder.offsetMinutes >= 1440
                            ? `${reminder.offsetMinutes / 1440} day(s)`
                            : reminder.offsetMinutes >= 60
                              ? `${reminder.offsetMinutes / 60} hour(s)`
                              : `${reminder.offsetMinutes} min`
                          } before`
                        : format(parseISO(reminder.remindAt), 'MMM d, yyyy h:mm a')
                    }
                    secondary={
                      <Chip
                        label={reminder.status}
                        size="small"
                        color={
                          reminder.status === 'pending'
                            ? 'info'
                            : reminder.status === 'sent'
                              ? 'success'
                              : 'default'
                        }
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Appointment"
        message={`Are you sure you want to delete "${appointment.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleting}
        destructive
      />
    </Container>
  );
}
