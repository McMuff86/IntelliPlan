import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  startOfYear,
  endOfYear,
  startOfDay,
  differenceInCalendarDays,
  format,
  startOfMonth,
} from "date-fns";
import { Box, Paper, Typography, Stack, Tooltip } from "@mui/material";

interface ProjectRange {
  projectId: string;
  projectName: string;
  start: Date | null;
  end: Date | null;
  taskIds: Set<string>;
  slotCount: number;
}

interface YearGanttChartProps {
  year: number;
  projectRanges: ProjectRange[];
}

const monthLabels = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const barColors = [
  "rgba(59, 130, 246, 0.75)",
  "rgba(16, 185, 129, 0.75)",
  "rgba(245, 158, 11, 0.75)",
  "rgba(168, 85, 247, 0.75)",
  "rgba(239, 68, 68, 0.75)",
  "rgba(20, 184, 166, 0.75)",
  "rgba(236, 72, 153, 0.75)",
  "rgba(99, 102, 241, 0.75)",
];

export default function YearGanttChart({ year, projectRanges }: YearGanttChartProps) {
  const navigate = useNavigate();

  const yearStart = useMemo(() => startOfYear(new Date(year, 0, 1)), [year]);
  const yearEnd = useMemo(() => endOfYear(new Date(year, 0, 1)), [year]);
  const totalDays = useMemo(
    () => differenceInCalendarDays(yearEnd, yearStart) + 1,
    [yearStart, yearEnd],
  );

  const monthOffsets = useMemo(() => {
    return Array.from({ length: 12 }, (_unused, i) => {
      const monthStart = startOfMonth(new Date(year, i, 1));
      const offset = differenceInCalendarDays(monthStart, yearStart);
      return { label: monthLabels[i], offset, pct: (offset / totalDays) * 100 };
    });
  }, [year, yearStart, totalDays]);

  const scheduledRanges = useMemo(
    () => projectRanges.filter((r) => r.start && r.end),
    [projectRanges],
  );

  if (scheduledRanges.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Project Timeline {year}
      </Typography>

      {/* Month header */}
      <Box sx={{ position: "relative", height: 28, mb: 0.5 }}>
        {monthOffsets.map((m) => (
          <Box
            key={m.label}
            sx={{
              position: "absolute",
              left: `${m.pct}%`,
              fontSize: 11,
              color: "text.secondary",
              userSelect: "none",
            }}
          >
            {m.label}
          </Box>
        ))}
      </Box>

      {/* Grid lines + bars */}
      <Box sx={{ position: "relative" }}>
        {/* Vertical month grid lines */}
        {monthOffsets.map((m) => (
          <Box
            key={`line-${m.label}`}
            sx={{
              position: "absolute",
              left: `${m.pct}%`,
              top: 0,
              bottom: 0,
              width: "1px",
              backgroundColor: "divider",
              zIndex: 0,
            }}
          />
        ))}

        <Stack spacing={0.75} sx={{ position: "relative", zIndex: 1 }}>
          {scheduledRanges.map((range, index) => {
            const projectStart = startOfDay(range.start as Date);
            const projectEnd = startOfDay(range.end as Date);

            // Clamp to year boundaries
            const clampedStart = projectStart < yearStart ? yearStart : projectStart;
            const clampedEnd = projectEnd > yearEnd ? yearEnd : projectEnd;

            const startOffset = differenceInCalendarDays(clampedStart, yearStart);
            const endOffset = differenceInCalendarDays(clampedEnd, yearStart);
            const leftPct = (startOffset / totalDays) * 100;
            const widthPct = ((endOffset - startOffset + 1) / totalDays) * 100;
            const color = barColors[index % barColors.length];

            const tooltipText = `${range.projectName}: ${format(projectStart, "dd.MM.yyyy")} – ${format(projectEnd, "dd.MM.yyyy")} (${range.taskIds.size} tasks)`;

            return (
              <Tooltip key={range.projectId} title={tooltipText} arrow placement="top">
                <Box
                  onClick={() => navigate(`/projects/${range.projectId}`)}
                  sx={{
                    position: "relative",
                    height: 28,
                    cursor: "pointer",
                    "&:hover .gantt-bar": {
                      filter: "brightness(1.15)",
                    },
                  }}
                >
                  {/* Project name label */}
                  <Typography
                    variant="caption"
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 11,
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                      pr: 0.5,
                      maxWidth: `${leftPct}%`,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {range.projectName}
                  </Typography>

                  {/* Bar */}
                  <Box
                    className="gantt-bar"
                    sx={{
                      position: "absolute",
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 0.3)}%`,
                      top: 4,
                      height: 20,
                      borderRadius: 999,
                      backgroundColor: color,
                      transition: "filter 150ms ease",
                    }}
                  />
                </Box>
              </Tooltip>
            );
          })}
        </Stack>
      </Box>
    </Paper>
  );
}
