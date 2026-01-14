import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { Box, Paper, Typography, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { appointmentService } from '../../services/appointmentService';
import type { Appointment } from '../../types';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    appointment: Appointment;
  };
}

export default function CalendarView() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
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
    </Box>
  );
}
