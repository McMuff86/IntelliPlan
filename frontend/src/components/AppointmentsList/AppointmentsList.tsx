import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Skeleton,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { appointmentService } from '../../services/appointmentService';
import axios from 'axios';
import type { Appointment } from '../../types';
import { useTimezone } from '../../hooks/useTimezone';
import EmptyState from '../EmptyState';
import ConfirmDialog from '../ConfirmDialog';

export default function AppointmentsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { timezone: preferredTimezone } = useTimezone();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const range = searchParams.get('range') || 'all';

  const getRangeParams = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === 'today') {
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      return { start: startOfDay.toISOString(), end: endOfDay.toISOString() };
    }

    if (range === 'week') {
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      return { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() };
    }

    return null;
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const rangeParams = getRangeParams();
      const response = await appointmentService.getAll(rangeParams || undefined);
      const sorted = [...response.appointments].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      setAppointments(sorted);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string | { message?: string } } | undefined;
        const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
        setError(message || 'Failed to load appointments');
      } else {
        setError('Failed to load appointments');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [range]);

  const handleViewClick = (id: string) => {
    navigate(`/appointments/${id}`);
  };

  const handleDeleteClick = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return;

    try {
      setDeleting(true);
      await appointmentService.delete(appointmentToDelete.id);
      setAppointments((prev) => prev.filter((a) => a.id !== appointmentToDelete.id));
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (err) {
      setError('Failed to delete appointment');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAppointmentToDelete(null);
  };

  const formatDateTime = (isoString: string) => {
    const utcDate = parseISO(isoString);
    const zonedDate = toZonedTime(utcDate, preferredTimezone);
    return format(zonedDate, 'MMM d, yyyy h:mm a');
  };

  const getShortTimezone = (tz: string) => {
    const parts = tz.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Timezone</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                <TableCell align="right">
                  <Skeleton variant="circular" width={32} height={32} sx={{ display: 'inline-block', mr: 1 }} />
                  <Skeleton variant="circular" width={32} height={32} sx={{ display: 'inline-block' }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (appointments.length === 0) {
    return (
      <Paper>
        <EmptyState
          title="No appointments yet"
          description="Create your first appointment to get started."
          onAction={() => navigate('/appointments/new')}
        />
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Timezone</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow
                key={appointment.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => handleViewClick(appointment.id)}
              >
                <TableCell>{appointment.title}</TableCell>
                <TableCell>{formatDateTime(appointment.startTime)}</TableCell>
                <TableCell>{formatDateTime(appointment.endTime)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={getShortTimezone(appointment.timezone)}
                    variant="outlined"
                    color={appointment.timezone === preferredTimezone ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewClick(appointment.id);
                    }}
                    aria-label={`View appointment: ${appointment.title}`}
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(appointment);
                    }}
                    aria-label={`Delete appointment: ${appointment.title}`}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Appointment"
        message={`Are you sure you want to delete "${appointmentToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleting}
        destructive
      />
    </>
  );
}
