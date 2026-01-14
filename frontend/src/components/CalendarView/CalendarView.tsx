import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { Box, Paper, Typography, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, IconButton, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Close as CloseIcon, CalendarMonth, ViewWeek, Today } from '@mui/icons-material';
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

type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

export default function CalendarView() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState<CalendarViewType>('dayGridMonth');
  const [calendarRef, setCalendarRef] = useState<FullCalendar | null>(null);
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
    </Box>
  );
}
