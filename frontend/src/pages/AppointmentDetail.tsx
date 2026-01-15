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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { appointmentService } from '../services/appointmentService';
import type { Appointment } from '../types';
import AppointmentForm from '../components/AppointmentForm';
import { useTimezone } from '../hooks/useTimezone';
import Breadcrumbs from '../components/Breadcrumbs';
import ConfirmDialog from '../components/ConfirmDialog';

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

      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Typography variant="h4" component="h1">
            {appointment.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
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
