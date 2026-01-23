import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import { Box, Paper, Typography, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, ToggleButtonGroup, ToggleButton, Button, Snackbar, Alert, Skeleton, Grid, Stack, Chip, FormControlLabel, Switch, Tooltip } from '@mui/material';
import { Close as CloseIcon, CalendarMonth, ViewWeek, Today, Add as AddIcon } from '@mui/icons-material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { appointmentService } from '../../services/appointmentService';
import { taskService } from '../../services/taskService';
import type { Appointment, TaskWorkSlotCalendar } from '../../types';
import axios from 'axios';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    type: 'appointment' | 'task';
    appointment?: Appointment;
    taskSlot?: TaskWorkSlotCalendar;
  };
}

type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

interface DayEntry {
  id: string;
  type: 'appointment' | 'task';
  title: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  durationMinutes?: number | null;
  appointmentId?: string;
  taskId?: string;
  projectName?: string;
}

interface PendingDrop {
  appointmentId: string;
  newStart: string;
  newEnd: string;
  conflicts: Appointment[];
  revertFunc: () => void;
}

export default function CalendarView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showTaskOverlay, setShowTaskOverlay] = useState(false);
  const [taskSlots, setTaskSlots] = useState<TaskWorkSlotCalendar[]>([]);
  const resolvedView = useMemo<CalendarViewType>(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'day') return 'timeGridDay';
    if (viewParam === 'week') return 'timeGridWeek';
    return 'dayGridMonth';
  }, [searchParams]);
  const [currentView, setCurrentView] = useState<CalendarViewType>(resolvedView);
  const [calendarRef, setCalendarRef] = useState<FullCalendar | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatTime = (dateString: string) => {
    const date = toZonedTime(new Date(dateString), userTimezone);
    return format(date, 'HH:mm');
  };

  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (showTaskOverlay) {
      loadTaskSlots();
    }
  }, [showTaskOverlay]);

  useEffect(() => {
    if (!calendarRef) return;
    const calendarApi = calendarRef.getApi();
    if (resolvedView !== currentView) {
      setCurrentView(resolvedView);
      calendarApi.changeView(resolvedView);
    }
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!Number.isNaN(parsed.getTime())) {
        calendarApi.gotoDate(parsed);
      }
    }
  }, [calendarRef, currentView, resolvedView, searchParams]);

  useEffect(() => {
    const appointmentEvents: CalendarEvent[] = appointments.map((apt) => ({
      id: apt.id,
      title: apt.title,
      start: apt.startTime,
      end: apt.endTime,
      allDay: false,
      extendedProps: {
        type: 'appointment',
        appointment: apt,
      },
    }));

    const taskEvents: CalendarEvent[] = showTaskOverlay
      ? taskSlots.filter((slot) => slot.reminderEnabled).map((slot) => {
          const durationLabel = slot.taskDurationMinutes
            ? ` | ${formatDuration(slot.taskDurationMinutes)}`
            : '';
          return {
            id: `task-${slot.id}`,
            title: `${slot.taskTitle} | ${slot.projectName}${durationLabel}`,
            start: slot.startTime,
            end: slot.endTime,
            allDay: slot.isAllDay,
            backgroundColor: 'rgba(249, 115, 22, 0.85)',
            borderColor: 'rgba(234, 88, 12, 0.9)',
            textColor: '#ffffff',
            extendedProps: {
              type: 'task',
              taskSlot: slot,
            },
          };
        })
      : [];

    setEvents([...appointmentEvents, ...taskEvents]);
  }, [appointments, showTaskOverlay, taskSlots]);

  const loadAppointments = async () => {
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

  const loadTaskSlots = async () => {
    try {
      const response = await taskService.getWorkSlotsForCalendar();
      setTaskSlots(response);
    } catch (error) {
      console.error('Failed to load task work slots:', error);
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    const { type, appointment, taskSlot } = info.event.extendedProps as CalendarEvent['extendedProps'];
    if (type === 'task' && taskSlot?.taskId) {
      navigate(`/tasks/${taskSlot.taskId}`);
      return;
    }
    if (appointment?.id) {
      navigate(`/appointments/${appointment.id}`);
      return;
    }
    navigate(`/appointments/${info.event.id}`);
  };

  const handleDateClick = (info: DateClickArg) => {
    const clickedDate = info.date;
    setSelectedDate(clickedDate);

    const dayItems: DayEntry[] = [];
    appointments.forEach((apt) => {
      const aptDate = toZonedTime(new Date(apt.startTime), userTimezone);
      if (
        aptDate.getFullYear() === clickedDate.getFullYear() &&
        aptDate.getMonth() === clickedDate.getMonth() &&
        aptDate.getDate() === clickedDate.getDate()
      ) {
        dayItems.push({
          id: apt.id,
          type: 'appointment',
          title: apt.title,
          startTime: apt.startTime,
          endTime: apt.endTime,
          appointmentId: apt.id,
        });
      }
    });

    if (showTaskOverlay) {
      taskSlots.filter((slot) => slot.reminderEnabled).forEach((slot) => {
        const slotDate = toZonedTime(new Date(slot.startTime), userTimezone);
        if (
          slotDate.getFullYear() === clickedDate.getFullYear() &&
          slotDate.getMonth() === clickedDate.getMonth() &&
          slotDate.getDate() === clickedDate.getDate()
        ) {
          dayItems.push({
            id: slot.id,
            type: 'task',
            title: slot.taskTitle,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAllDay: slot.isAllDay,
            durationMinutes: slot.taskDurationMinutes,
            taskId: slot.taskId,
            projectName: slot.projectName,
          });
        }
      });
    }

    dayItems.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    setDayEntries(dayItems);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setDayEntries([]);
  };

  const handleAppointmentClick = (id: string) => {
    handleDialogClose();
    navigate(`/appointments/${id}`);
  };

  const handleTaskClick = (id: string) => {
    handleDialogClose();
    navigate(`/tasks/${id}`);
  };

  const handleViewChange = (_event: React.MouseEvent<HTMLElement>, newView: CalendarViewType | null) => {
    if (newView && calendarRef) {
      setCurrentView(newView);
      const calendarApi = calendarRef.getApi();
      calendarApi.changeView(newView);
      const viewParam = newView === 'timeGridDay' ? 'day' : newView === 'timeGridWeek' ? 'week' : 'month';
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('view', viewParam);
      setSearchParams(nextParams, { replace: true });
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

  if (loading) {
    return (
      <Box>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Skeleton variant="rounded" width={280} height={40} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Skeleton variant="rounded" width={100} height={36} />
            <Skeleton variant="text" width={200} height={32} />
            <Box width={100} />
          </Box>
          <Grid container spacing={0.5}>
            {[...Array(35)].map((_, index) => (
              <Grid key={index} size={{ xs: 12 / 7 }}>
                <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 0.5 }} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    );
  }

  const eventDisplayMode = currentView === 'dayGridMonth' ? 'auto' : 'block';

  return (
    <Box>
      <Paper
        sx={{
          p: 2,
          background: 'var(--ip-surface-elevated)',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showTaskOverlay}
                onChange={(event) => setShowTaskOverlay(event.target.checked)}
              />
            }
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">Reminders overlay</Typography>
                <Tooltip title="Show reminder-enabled task slots alongside appointments">
                  <Chip
                    size="small"
                    label={taskSlots.filter((slot) => slot.reminderEnabled).length}
                    variant="outlined"
                  />
                </Tooltip>
              </Stack>
            }
          />
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
          eventDisplay={eventDisplayMode}
          displayEventEnd={true}
          dayMaxEvents={3}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={showTaskOverlay}
          nowIndicator={true}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Typography>
          <IconButton onClick={handleDialogClose} size="small" aria-label="close dialog">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {dayEntries.length === 0 ? (
            <Box sx={{ py: 2.5, textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom>
                No items on this day
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add an appointment or work slot to keep your schedule moving.
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  handleDialogClose();
                  navigate('/appointments/new');
                }}
              >
                Create Appointment
              </Button>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {dayEntries.map((entry) => (
                <Paper
                  key={`${entry.type}-${entry.id}`}
                  onClick={() => {
                    if (entry.type === 'task' && entry.taskId) {
                      handleTaskClick(entry.taskId);
                    } else if (entry.appointmentId) {
                      handleAppointmentClick(entry.appointmentId);
                    }
                  }}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      background: 'rgba(15, 118, 110, 0.08)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 44,
                      borderRadius: 999,
                      background:
                        entry.type === 'task'
                          ? 'linear-gradient(180deg, rgba(249, 115, 22, 0.85), rgba(234, 88, 12, 0.9))'
                          : 'linear-gradient(180deg, rgba(15, 118, 110, 0.8), rgba(14, 165, 233, 0.8))',
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {entry.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entry.isAllDay
                        ? `All day${entry.durationMinutes ? ` | ${formatDuration(entry.durationMinutes)}` : ''}`
                        : `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}${
                            entry.durationMinutes ? ` | ${formatDuration(entry.durationMinutes)}` : ''
                          }`}
                    </Typography>
                    {entry.projectName && (
                      <Typography variant="caption" color="text.secondary">
                        {entry.projectName}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={entry.type === 'task' ? 'Task' : 'Appointment'}
                    size="small"
                    variant="outlined"
                  />
                </Paper>
              ))}
            </Stack>
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

