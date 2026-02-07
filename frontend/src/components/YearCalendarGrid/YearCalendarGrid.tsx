import React, { useMemo } from "react";
import {
  addDays,
  addWeeks,
  format,
  getISOWeek,
  isSameMonth,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Box, Paper, Typography } from "@mui/material";

type Holiday = {
  id: string;
  date: string;
  name: string;
};

interface YearCalendarGridProps {
  calendarYear: number;
  showWeekNumbers: boolean;
  showWeekends: boolean;
  holidayByDate: Map<string, Holiday>;
  onDayClick: (dateKey: string, year: number) => void;
}

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const buildMonthWeeks = (month: Date) => {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  return Array.from({ length: 6 }, (_unused, weekIndex) => {
    const weekStart = addWeeks(start, weekIndex);
    return Array.from({ length: 7 }, (_dayUnused, dayIndex) =>
      addDays(weekStart, dayIndex),
    );
  });
};

export default function YearCalendarGrid({
  calendarYear,
  showWeekNumbers,
  showWeekends,
  holidayByDate,
  onDayClick,
}: YearCalendarGridProps) {
  const calendarMonths = useMemo(() => {
    return Array.from(
      { length: 12 },
      (_unused, index) => new Date(calendarYear, index, 1),
    );
  }, [calendarYear]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
        },
        gap: 2,
      }}
    >
      {calendarMonths.map((month) => {
        const weeks = buildMonthWeeks(month);
        const columnCount = showWeekNumbers ? 8 : 7;
        const cells: React.JSX.Element[] = [];

        if (showWeekNumbers) {
          cells.push(
            <Box
              key={`${month.toISOString()}-wk-label`}
              sx={{
                textAlign: "center",
                fontSize: 11,
                color: "text.secondary",
                py: 0.5,
              }}
            >
              WK
            </Box>,
          );
        }

        weekDayLabels.forEach((label) => {
          cells.push(
            <Box
              key={`${month.toISOString()}-${label}`}
              sx={{
                textAlign: "center",
                fontSize: 11,
                color: "text.secondary",
                py: 0.5,
              }}
            >
              {label}
            </Box>,
          );
        });

        weeks.forEach((week, weekIndex) => {
          if (showWeekNumbers) {
            const weekNumber = getISOWeek(week[0]);
            cells.push(
              <Box
                key={`${month.toISOString()}-wk-${weekIndex}`}
                sx={{
                  textAlign: "center",
                  fontSize: 11,
                  color: "text.secondary",
                  py: 0.5,
                }}
              >
                {weekNumber}
              </Box>,
            );
          }

          week.forEach((day, dayIndex) => {
            const isInMonth = isSameMonth(day, month);
            const isSelectable =
              isInMonth && day.getFullYear() === calendarYear;
            const dateKey = format(day, "yyyy-MM-dd");
            const holiday = holidayByDate.get(dateKey);
            const isWeekendDay = isWeekend(day);
            const baseOpacity = isInMonth ? 1 : 0.35;
            const weekendOpacity =
              showWeekends || !isWeekendDay ? 1 : 0.35;
            const opacity = Math.min(baseOpacity, weekendOpacity);

            cells.push(
              <Box
                key={`${month.toISOString()}-${weekIndex}-${dayIndex}`}
                onClick={() => {
                  if (!isSelectable) return;
                  onDayClick(dateKey, calendarYear);
                }}
                title={holiday ? holiday.name : undefined}
                sx={{
                  minHeight: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1,
                  cursor: isSelectable ? "pointer" : "default",
                  backgroundColor: holiday
                    ? "rgba(248, 113, 113, 0.25)"
                    : "transparent",
                  border: holiday
                    ? "1px solid rgba(239, 68, 68, 0.6)"
                    : "1px solid transparent",
                  opacity,
                  fontSize: 12,
                  color: isInMonth ? "text.primary" : "text.disabled",
                  "&:hover": isSelectable
                    ? {
                        backgroundColor: holiday
                          ? "rgba(248, 113, 113, 0.35)"
                          : "rgba(15, 118, 110, 0.08)",
                      }
                    : undefined,
                }}
              >
                {day.getDate()}
              </Box>,
            );
          });
        });

        return (
          <Paper
            key={month.toISOString()}
            sx={{
              p: 1.5,
              background: "var(--ip-surface-elevated)",
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {format(month, "MMMM")}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                gap: 0.5,
              }}
            >
              {cells}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
