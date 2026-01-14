import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import { Box, Paper, Typography, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, ToggleButtonGroup, ToggleButton, Button, Snackbar, Alert } from '@mui/material';
import { Close as CloseIcon, CalendarMonth, ViewWeek, Today } from '@mui/icons-material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { appointmentService } from '../../services/appointmentService';
import type { Appointment } from '../../types';
import axios from 'axios';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    appointment: Appointment;
  };
}

type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

interface PendingDrop {
  appointmentId: string;
  newStart: string;
  newEnd: string;
  conflicts: Appointment[];
  revertFunc: () => void;
}

export default function CalendarView() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState<CalendarViewType>('dayGridMonth');
  const [calendarRef, setCalendarRef] = useState<FullCalendar | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    const calendarEvents: CalendarEvent[] = appointments.map((apt) => ({
      id: apt.id,
      title: apt.title,
      start: apt.startTime,
      end: apt.endTime,
      extendedProps: {
        appointment: apt,
      },
    }));
    setEvents(calendarEvents);
  }, [appointments]);

  const loadAppointments = async () => {
    try {
      const response = await appointmentService.getAll();
      setAppointments(response.appointments);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    navigate(`/appointments/${info.event.id}`);
  };

  const handleDateClick = (info: DateClickArg) => {
    const clickedDate = info.date;
    setSelectedDate(clickedDate);
    
    const dayApts = appointments.filter((apt) => {
      const aptDate = toZonedTime(new Date(apt.startTime), userTimezone);
      return (
        aptDate.getFullYear() === clickedDate.getFullYear() &&
        aptDate.getMonth() === clickedDate.getMonth() &&
        aptDate.getDate() === clickedDate.getDate()
      );
    });
    
    setDayAppointments(dayApts);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setDayAppointments([]);
  };

  const handleAppointmentClick = (id: string) => {
    handleDialogClose();
    navigate(`/appointments/${id}`);
  };

  const formatTime = (dateString: string) => {
    const date = toZonedTime(new Date(dateString), userTimezone);
    return format(date, 'HH:mm');
  };

  const handleViewChange = (_event: React.MouseEvent<HTMLElement>, newView: CalendarViewType | null) => {
    if (newView && calendarRef) {
      setCurrentView(newView);
      const calendarApi = calendarRef.getApi();
      calendarApi.changeView(newView);
    }
  };

  const handleEventDropOrResize = async (
    info: EventDropArg | EventResizeDoneArg,
    forceUpdate = false
  ) => {
    const { event, revert } = info;
    const appointmentId = event.id;
    const newStart = event.start?.toISOString();
    const newEnd = event.end?.toISOString();

    if (!newStart || !newEnd) {
      revert();
      return;
    }

    setIsUpdating(true);
    try {
      await appointmentService.update(
        appointmentId,
        { startTime: newStart, endTime: newEnd },
        forceUpdate
      );
      setSnackbar({ open: true, message: 'Appointment rescheduled successfully', severity: 'success' });
      loadAppointments();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const conflicts = error.response.data.conflicts as Appointment[];
        setPendingDrop({ appointmentId, newStart, newEnd, conflicts, revertFunc: revert });
        setOverlapDialogOpen(true);
      } else {
        setSnackbar({ open: true, message: 'Failed to reschedule appointment', severity: 'error' });
        revert();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOverlapCancel = () => {
    if (pendingDrop) {
      pendingDrop.revertFunc();
    }
    setPendingDrop(null);
    setOverlapDialogOpen(false);
  };

  const handleOverlapConfirm = async () => {
    if (!pendingDrop) return;

    setIsUpdating(true);
    try {
      await appointmentService.update(
        pendingDrop.appointmentId,
        { startTime: pendingDrop.newStart, endTime: pendingDrop.newEnd },
        true
      );
      setSnackbar({ open: true, message: 'Appointment rescheduled successfully', severity: 'success' });
      loadAppointments();
    } catch {
      setSnackbar({ open: true, message: 'Failed to reschedule appointment', severity: 'error' });
      pendingDrop.revertFunc();
    } finally {
      setIsUpdating(false);
      setPendingDrop(null);
      setOverlapDialogOpen(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <ToggleButtonGroup
            value={currentView}
            exclusive
            onChange={handleViewChange}
            size="small"
          >
            <ToggleButton value="dayGridMonth" aria-label="month view">
              <CalendarMonth sx={{ mr: 0.5 }} />
              Month
            </ToggleButton>
            <ToggleButton value="timeGridWeek" aria-label="week view">
              <ViewWeek sx={{ mr: 0.5 }} />
              Week
            </ToggleButton>
            <ToggleButton value="timeGridDay" aria-label="day view">
              <Today sx={{ mr: 0.5 }} />
              Day
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <FullCalendar
          ref={(ref) => setCalendarRef(ref)}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          editable={true}
          eventDrop={handleEventDropOrResize}
          eventResize={handleEventDropOrResize}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator={true}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Typography>
          <IconButton onClick={handleDialogClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {dayAppointments.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No appointments on this day
            </Typography>
          ) : (
            <List>
              {dayAppointments.map((apt) => (
                <ListItem
                  key={apt.id}
                  onClick={() => handleAppointmentClick(apt.id)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                >
                  <ListItemText
                    primary={apt.title}
                    secondary={`${formatTime(apt.startTime)} - ${formatTime(apt.endTime)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={overlapDialogOpen}
        onClose={handleOverlapCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon color="warning" />
            <Typography variant="h6" component="span">
              Scheduling Conflict Detected
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This reschedule overlaps with the following appointments:
          </Typography>
          <List sx={{ bgcolor: 'warning.light', borderRadius: 1, mt: 1 }}>
            {pendingDrop?.conflicts.map((conflict) => (
              <ListItem key={conflict.id} divider>
                <ListItemText
                  primary={conflict.title}
                  secondary={`${new Date(conflict.startTime).toLocaleString()} - ${new Date(conflict.endTime).toLocaleString()}`}
                  primaryTypographyProps={{ fontWeight: 'medium' }}
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Would you like to reschedule anyway?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleOverlapCancel} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleOverlapConfirm} variant="contained" color="warning" disabled={isUpdating}>
            Reschedule Anyway
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
