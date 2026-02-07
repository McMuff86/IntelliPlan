import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { addMonths } from "date-fns";
import { Box } from "@mui/material";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  editable?: boolean;
  durationEditable?: boolean;
  extendedProps?: Record<string, unknown>;
}

interface MultiMonthCalendarProps {
  /** First month to display (Date set to 1st of month) */
  startMonth: Date;
  /** How many months to render */
  monthCount: number;
  events: CalendarEvent[];
  showWeekends: boolean;
  showWeekNumbers: boolean;
  editable: boolean;
  onEventClick: (info: EventClickArg) => void;
  onEventDrop: (info: EventDropArg) => void;
}

export default function MultiMonthCalendar({
  startMonth,
  monthCount,
  events,
  showWeekends,
  showWeekNumbers,
  editable,
  onEventClick,
  onEventDrop,
}: MultiMonthCalendarProps) {
  const months = useMemo(() => {
    return Array.from({ length: monthCount }, (_unused, i) =>
      addMonths(startMonth, i),
    );
  }, [startMonth, monthCount]);

  // Responsive columns based on month count
  const gridColumns = useMemo(() => {
    if (monthCount <= 1) return "1fr";
    if (monthCount <= 2) return { xs: "1fr", md: "repeat(2, 1fr)" };
    if (monthCount <= 3) return { xs: "1fr", md: "repeat(3, 1fr)" };
    if (monthCount <= 4) return { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" };
    return { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" };
  }, [monthCount]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: gridColumns,
        gap: 2,
        "& .fc": {
          fontSize: "0.8rem",
        },
        "& .fc .fc-toolbar": {
          marginBottom: "0.5em",
        },
        "& .fc .fc-toolbar-title": {
          fontSize: "1rem",
        },
      }}
    >
      {months.map((month) => (
        <Box key={month.toISOString()}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={month}
            events={events}
            eventClick={onEventClick}
            editable={editable}
            eventDrop={onEventDrop}
            headerToolbar={{
              left: "",
              center: "title",
              right: "",
            }}
            height="auto"
            eventDisplay="block"
            displayEventEnd={true}
            dayMaxEvents={2}
            weekends={showWeekends}
            weekNumbers={showWeekNumbers}
            weekNumberCalculation="ISO"
          />
        </Box>
      ))}
    </Box>
  );
}
