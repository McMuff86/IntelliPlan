import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  differenceInCalendarDays,
  format,
  getISOWeek,
  isWeekend,
  isSameMonth,
  startOfMonth,
  startOfDay,
  startOfWeek,
} from "date-fns";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Skeleton,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TimelineIcon from "@mui/icons-material/Timeline";
import { projectService } from "../services/projectService";
import { taskService } from "../services/taskService";
import { industryService } from "../services/industryService";
import { productTypeService } from "../services/productTypeService";
import { taskTemplateService } from "../services/taskTemplateService";
import type { Project, TaskWorkSlotCalendar, Industry, ProductType, TaskTemplate } from "../types";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const defaultWorkdayStart = "08:00";
const defaultWorkdayEnd = "17:00";
const defaultWorkTemplate = "weekday_8_17_with_weekends";
const ganttColumnWidth = 56;
const ganttHeaderHeight = 44;
const ganttRowHeight = 56;
const holidayStorageKey = "intelliplan-holidays";

type Holiday = {
  id: string;
  date: string;
  name: string;
};

const workTemplateOptions = [
  { value: "weekday_8_17", label: "Mon–Fri 08:00–17:00" },
  { value: "weekday_8_17_with_weekends", label: "Mon–Sun 08:00–17:00" },
  { value: "custom", label: "Custom" },
];

const workTemplateDefaults: Record<
  string,
  { includeWeekends: boolean; workdayStart: string; workdayEnd: string }
> = {
  weekday_8_17: {
    includeWeekends: false,
    workdayStart: "08:00",
    workdayEnd: "17:00",
  },
  weekday_8_17_with_weekends: {
    includeWeekends: true,
    workdayStart: "08:00",
    workdayEnd: "17:00",
  },
};

const formatTemplateLabel = (template?: string) => {
  const entry = workTemplateOptions.find((option) => option.value === template);
  return entry ? entry.label : "Custom";
};

const formatDuration = (minutes?: number | null) => {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
};

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workTemplate, setWorkTemplate] = useState(defaultWorkTemplate);
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [workdayStart, setWorkdayStart] = useState(defaultWorkdayStart);
  const [workdayEnd, setWorkdayEnd] = useState(defaultWorkdayEnd);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState("");
  const [selectedProductTypeId, setSelectedProductTypeId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const resolvedView = useMemo<"grid" | "calendar" | "gantt">(() => {
    const view = searchParams.get("view");
    if (view === "calendar" || view === "gantt") {
      return view;
    }
    return "grid";
  }, [searchParams]);
  const [viewMode, setViewMode] = useState<"grid" | "calendar" | "gantt">(
    resolvedView,
  );
  const [taskSlots, setTaskSlots] = useState<TaskWorkSlotCalendar[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showProjectOverlay, setShowProjectOverlay] = useState(true);
  const [showWeekNumbers, setShowWeekNumbers] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"month" | "year">("month");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(
    null,
  );
  const [dragDeltaDays, setDragDeltaDays] = useState(0);
  const [shiftingProjectId, setShiftingProjectId] = useState<string | null>(
    null,
  );
  const [shiftSnackbar, setShiftSnackbar] = useState<{
    open: boolean;
    projectId: string;
    projectName: string;
    deltaDays: number;
  } | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const dragStartXRef = useRef(0);
  const dragDeltaRef = useRef(0);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getAll();
      setProjects(data);
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | { error?: string | { message?: string } }
          | undefined;
        const message =
          typeof data?.error === "string" ? data.error : data?.error?.message;
        setError(message || "Failed to load projects");
      } else {
        setError("Failed to load projects");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(holidayStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Holiday[];
      if (Array.isArray(parsed)) {
        setHolidays(parsed);
      }
    } catch (error) {
      console.warn("Failed to parse holidays", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(holidayStorageKey, JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    setViewMode(resolvedView);
  }, [resolvedView]);

  // Load industries when dialog opens, preselect user's industry
  useEffect(() => {
    if (dialogOpen && industries.length === 0) {
      industryService.getAll().then((inds) => {
        setIndustries(inds);
        if (user?.industryId) {
          setSelectedIndustryId(user.industryId);
        }
      }).catch(console.error);
    } else if (dialogOpen && user?.industryId && !selectedIndustryId) {
      setSelectedIndustryId(user.industryId);
    }
  }, [dialogOpen]);

  // Load product types when industry changes
  useEffect(() => {
    if (selectedIndustryId) {
      setSelectedProductTypeId("");
      setSelectedTemplateId("");
      setTaskTemplates([]);
      productTypeService
        .getAll(selectedIndustryId)
        .then(setProductTypes)
        .catch(console.error);
    } else {
      setProductTypes([]);
      setSelectedProductTypeId("");
      setSelectedTemplateId("");
      setTaskTemplates([]);
    }
  }, [selectedIndustryId]);

  // Load templates when product type changes
  useEffect(() => {
    if (selectedProductTypeId) {
      setSelectedTemplateId("");
      taskTemplateService
        .getAll(selectedProductTypeId)
        .then(setTaskTemplates)
        .catch(console.error);
    } else {
      setTaskTemplates([]);
      setSelectedTemplateId("");
    }
  }, [selectedProductTypeId]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setWorkTemplate(defaultWorkTemplate);
    setIncludeWeekends(true);
    setWorkdayStart(defaultWorkdayStart);
    setWorkdayEnd(defaultWorkdayEnd);
    setSelectedIndustryId("");
    setSelectedProductTypeId("");
    setSelectedTemplateId("");
    setProductTypes([]);
    setTaskTemplates([]);
  };

  const handleWorkTemplateChange = (value: string) => {
    setWorkTemplate(value);
    const defaults = workTemplateDefaults[value];
    if (defaults) {
      setIncludeWeekends(defaults.includeWeekends);
      setWorkdayStart(defaults.workdayStart);
      setWorkdayEnd(defaults.workdayEnd);
    }
  };

  const loadTaskSlots = useCallback(async () => {
    try {
      setCalendarLoading(true);
      setCalendarError(null);
      const data = await taskService.getWorkSlotsForCalendar();
      setTaskSlots(data);
    } catch (err) {
      console.error(err);
      setCalendarError("Failed to load project calendar");
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "calendar" || viewMode === "gantt") {
      loadTaskSlots();
    }
  }, [viewMode, loadTaskSlots]);

  const projectNameById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project.name]));
  }, [projects]);

  const filteredSlots = useMemo(() => {
    if (projectFilter.length === 0) {
      return taskSlots;
    }
    return taskSlots.filter((slot) => projectFilter.includes(slot.projectId));
  }, [projectFilter, taskSlots]);

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextView: "grid" | "calendar" | "gantt" | null,
  ) => {
    if (nextView) {
      setViewMode(nextView);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("view", nextView);
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleProjectFilterChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value;
    if (typeof value === "string") {
      setProjectFilter(value.split(","));
      return;
    }
    setProjectFilter(value as string[]);
  };

  const handleCalendarModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextMode: "month" | "year" | null,
  ) => {
    if (!nextMode) return;
    setCalendarMode(nextMode);
    if (nextMode === "year") {
      setShowProjectOverlay(false);
    }
  };

  const handleCalendarYearChange = (event: SelectChangeEvent<number>) => {
    const nextYear = Number(event.target.value);
    setCalendarYear(nextYear);
  };

  const buildMonthWeeks = (month: Date) => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 6 }, (_unused, weekIndex) => {
      const weekStart = addWeeks(start, weekIndex);
      return Array.from({ length: 7 }, (_dayUnused, dayIndex) =>
        addDays(weekStart, dayIndex),
      );
    });
  };

  const weekDayLabels = useMemo(
    () => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    [],
  );

  const holidayYearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1, current + 2];
  }, []);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((holiday) => {
      const year = new Date(`${holiday.date}T00:00:00`).getFullYear();
      return year === holidayYear;
    });
  }, [holidayYear, holidays]);

  const holidayByDate = useMemo(() => {
    return new Map(holidays.map((holiday) => [holiday.date, holiday]));
  }, [holidays]);

  const openHolidayDialog = () => {
    setHolidayDialogOpen(true);
    setHolidayError(null);
    if (!holidayDate) {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      setHolidayDate(`${today.getFullYear()}-${month}-${day}`);
      setHolidayYear(today.getFullYear());
    }
  };

  const handleHolidayYearChange = (event: SelectChangeEvent<number>) => {
    const nextYear = Number(event.target.value);
    setHolidayYear(nextYear);
    setHolidayError(null);
    if (holidayDate) {
      const parts = holidayDate.split("-");
      if (parts.length === 3) {
        setHolidayDate(`${nextYear}-${parts[1]}-${parts[2]}`);
        return;
      }
    }
    setHolidayDate(`${nextYear}-01-01`);
  };

  const handleAddHoliday = () => {
    if (!holidayName.trim() || !holidayDate) {
      setHolidayError("Holiday name and date are required");
      return;
    }

    const year = new Date(`${holidayDate}T00:00:00`).getFullYear();
    if (year !== holidayYear) {
      setHolidayError("Holiday date must match the selected year");
      return;
    }

    const exists = holidays.some(
      (holiday) =>
        holiday.date === holidayDate &&
        holiday.name.trim().toLowerCase() === holidayName.trim().toLowerCase(),
    );
    if (exists) {
      setHolidayError("Holiday already exists for this date");
      return;
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    setHolidays((prev) => [
      ...prev,
      {
        id,
        date: holidayDate,
        name: holidayName.trim(),
      },
    ]);
    setHolidayName("");
    setHolidayError(null);
  };

  const handleRemoveHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
  };

  const handleCalendarEventClick = (info: EventClickArg) => {
    const { type, projectId, taskId } = info.event.extendedProps as {
      type?: "project" | "task" | "holiday";
      projectId?: string;
      taskId?: string;
    };
    if (type === "holiday") {
      const start = info.event.start;
      if (start) {
        const month = String(start.getMonth() + 1).padStart(2, "0");
        const day = String(start.getDate()).padStart(2, "0");
        setHolidayYear(start.getFullYear());
        setHolidayDate(`${start.getFullYear()}-${month}-${day}`);
      }
      openHolidayDialog();
      return;
    }
    if (type === "project" && projectId) {
      navigate(`/projects/${projectId}`);
      return;
    }
    if (type === "task" && taskId) {
      navigate(`/tasks/${taskId}`);
      return;
    }
    if (projectId) {
      navigate(`/projects/${projectId}`);
      return;
    }
    if (taskId) {
      navigate(`/tasks/${taskId}`);
    }
  };

  const filteredProjectIds = useMemo(() => {
    if (projectFilter.length === 0) {
      return new Set(projects.map((project) => project.id));
    }
    return new Set(projectFilter);
  }, [projectFilter, projects]);

  const projectRanges = useMemo(() => {
    const ranges = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        start: Date | null;
        end: Date | null;
        taskIds: Set<string>;
        slotCount: number;
      }
    >();

    filteredSlots.forEach((slot) => {
      if (!filteredProjectIds.has(slot.projectId)) {
        return;
      }
      const slotStart = startOfDay(new Date(slot.startTime));
      const slotEndBase = startOfDay(new Date(slot.endTime));
      const slotEnd = slot.isAllDay ? addDays(slotEndBase, -1) : slotEndBase;
      const existing = ranges.get(slot.projectId) || {
        projectId: slot.projectId,
        projectName: slot.projectName,
        start: null,
        end: null,
        taskIds: new Set<string>(),
        slotCount: 0,
      };

      existing.slotCount += 1;
      existing.taskIds.add(slot.taskId);
      if (!existing.start || slotStart < existing.start) {
        existing.start = slotStart;
      }
      if (!existing.end || slotEnd > existing.end) {
        existing.end = slotEnd;
      }

      ranges.set(slot.projectId, existing);
    });

    return Array.from(ranges.values());
  }, [filteredProjectIds, filteredSlots]);

  const scheduledProjectRanges = useMemo(
    () => projectRanges.filter((range) => range.start && range.end),
    [projectRanges],
  );

  const unscheduledProjects = useMemo(() => {
    const scheduledIds = new Set(projectRanges.map((range) => range.projectId));
    return projects.filter(
      (project) =>
        filteredProjectIds.has(project.id) && !scheduledIds.has(project.id),
    );
  }, [filteredProjectIds, projectRanges, projects]);

  const calendarEvents = useMemo(() => {
    const holidayEvents = holidays.map((holiday) => ({
      id: `holiday-${holiday.id}`,
      title: holiday.name,
      start: `${holiday.date}T00:00:00`,
      end: addDays(new Date(`${holiday.date}T00:00:00`), 1).toISOString(),
      allDay: true,
      backgroundColor: "rgba(248, 113, 113, 0.75)",
      borderColor: "rgba(239, 68, 68, 0.9)",
      textColor: "#ffffff",
      editable: false,
      extendedProps: {
        type: "holiday",
      },
    }));

    const taskEvents = filteredSlots.map((slot) => {
      const durationLabel = slot.taskDurationMinutes
        ? ` | ${formatDuration(slot.taskDurationMinutes)}`
        : "";
      return {
        id: `task-${slot.id}`,
        title: `${slot.projectName} | ${slot.taskTitle}${durationLabel}`,
        start: slot.startTime,
        end: slot.endTime,
        allDay: slot.isAllDay,
        backgroundColor: "rgba(20, 184, 166, 0.85)",
        borderColor: "rgba(13, 148, 136, 0.9)",
        textColor: "#ffffff",
        editable: false,
        extendedProps: {
          type: "task",
          projectId: slot.projectId,
          taskId: slot.taskId,
        },
      };
    });

    if (!showProjectOverlay) {
      return [...holidayEvents, ...taskEvents];
    }

    const projectEvents = scheduledProjectRanges.map((range) => ({
      id: `project-${range.projectId}`,
      title: range.projectName,
      start: (range.start as Date).toISOString(),
      end: addDays(range.end as Date, 1).toISOString(),
      allDay: true,
      backgroundColor: "rgba(59, 130, 246, 0.55)",
      borderColor: "rgba(37, 99, 235, 0.85)",
      textColor: "#ffffff",
      editable: true,
      durationEditable: false,
      extendedProps: {
        type: "project",
        projectId: range.projectId,
      },
    }));

    return [...holidayEvents, ...projectEvents, ...taskEvents];
  }, [filteredSlots, holidays, scheduledProjectRanges, showProjectOverlay]);

  const calendarMonths = useMemo(() => {
    return Array.from(
      { length: 12 },
      (_unused, index) => new Date(calendarYear, index, 1),
    );
  }, [calendarYear]);

  const timelineRange = useMemo(() => {
    if (scheduledProjectRanges.length === 0) return null;
    let minStart = scheduledProjectRanges[0].start as Date;
    let maxEnd = scheduledProjectRanges[0].end as Date;
    scheduledProjectRanges.forEach((range) => {
      if (range.start && range.start < minStart) {
        minStart = range.start;
      }
      if (range.end && range.end > maxEnd) {
        maxEnd = range.end;
      }
    });
    const start = startOfDay(minStart);
    const end = startOfDay(maxEnd);
    const days = eachDayOfInterval({ start, end });
    return { start, end, days };
  }, [scheduledProjectRanges]);

  const shiftProjectSchedule = useCallback(
    async (
      projectId: string,
      deltaDays: number,
      projectName?: string,
      notify = true,
    ) => {
      if (!deltaDays) return false;
      try {
        setShiftingProjectId(projectId);
        setCalendarError(null);
        await projectService.shiftSchedule(projectId, { deltaDays });
        await loadTaskSlots();
        if (notify) {
          setShiftSnackbar({
            open: true,
            projectId,
            projectName:
              projectName || projectNameById.get(projectId) || "Project",
            deltaDays,
          });
        }
        return true;
      } catch (err) {
        console.error(err);
        setCalendarError("Failed to shift project schedule");
        return false;
      } finally {
        setShiftingProjectId(null);
      }
    },
    [loadTaskSlots, projectNameById],
  );

  const startProjectDrag = (event: React.MouseEvent, projectId: string) => {
    event.preventDefault();
    if (shiftingProjectId) {
      return;
    }
    dragStartXRef.current = event.clientX;
    dragDeltaRef.current = 0;
    setDragDeltaDays(0);
    setDraggingProjectId(projectId);
  };

  useEffect(() => {
    if (!draggingProjectId) return;

    const handleMove = (event: MouseEvent) => {
      const deltaX = event.clientX - dragStartXRef.current;
      const nextDelta = Math.round(deltaX / ganttColumnWidth);
      dragDeltaRef.current = nextDelta;
      setDragDeltaDays(nextDelta);
    };

    const handleUp = async () => {
      const deltaDays = dragDeltaRef.current;
      const projectId = draggingProjectId;
      setDraggingProjectId(null);
      setDragDeltaDays(0);

      if (!projectId || deltaDays === 0) {
        return;
      }

      await shiftProjectSchedule(
        projectId,
        deltaDays,
        projectNameById.get(projectId),
      );
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [
    draggingProjectId,
    shiftProjectSchedule,
    shiftingProjectId,
    projectNameById,
  ]);

  const handleCalendarEventDrop = async (info: EventDropArg) => {
    const { type, projectId } = info.event.extendedProps as {
      type?: "project" | "task";
      projectId?: string;
    };

    if (type !== "project" || !projectId || shiftingProjectId) {
      info.revert();
      return;
    }

    const oldStart = info.oldEvent.start;
    const newStart = info.event.start;
    if (!oldStart || !newStart) {
      info.revert();
      return;
    }

    const deltaDays = differenceInCalendarDays(
      startOfDay(newStart),
      startOfDay(oldStart),
    );
    if (!deltaDays) {
      return;
    }

    const success = await shiftProjectSchedule(
      projectId,
      deltaDays,
      projectNameById.get(projectId),
    );
    if (!success) {
      info.revert();
    }
  };

  const handleShiftSnackbarClose = () => {
    if (!shiftSnackbar) return;
    setShiftSnackbar({ ...shiftSnackbar, open: false });
  };

  const handleShiftUndo = async () => {
    if (!shiftSnackbar) return;
    const { projectId, deltaDays } = shiftSnackbar;
    setShiftSnackbar(null);
    await shiftProjectSchedule(
      projectId,
      -deltaDays,
      projectNameById.get(projectId),
      false,
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const created = await projectService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        includeWeekends,
        workdayStart,
        workdayEnd,
        workTemplate,
        taskTemplateId: selectedTemplateId || undefined,
      });
      setProjects((prev) => [created, ...prev]);
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | { error?: string | { message?: string } }
          | undefined;
        const message =
          typeof data?.error === "string" ? data.error : data?.error?.message;
        setError(message || "Failed to create project");
      } else {
        setError("Failed to create project");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Projects
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="flex-end"
        >
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
          >
            <ToggleButton value="grid" aria-label="grid view">
              <ViewModuleIcon sx={{ mr: 0.5 }} />
              Cards
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="calendar view">
              <CalendarMonthIcon sx={{ mr: 0.5 }} />
              Calendar
            </ToggleButton>
            <ToggleButton value="gantt" aria-label="gantt view">
              <TimelineIcon sx={{ mr: 0.5 }} />
              Gantt
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Project
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {viewMode === "grid" ? (
        loading ? (
          <Grid container spacing={2}>
            {[...Array(3)].map((_, index) => (
              <Grid key={index} size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={28} />
                    <Skeleton variant="text" width="80%" />
                    <Skeleton
                      variant="rounded"
                      width="40%"
                      height={24}
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to start planning tasks."
            actionLabel="Create Project"
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <Grid container spacing={2}>
            {projects.map((project) => (
              <Grid key={project.id} size={{ xs: 12, md: 4 }}>
                <Card
                  onClick={() => navigate(`/projects/${project.id}`)}
                  sx={{ cursor: "pointer", height: "100%" }}
                >
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarMonthIcon color="primary" fontSize="small" />
                        <Typography variant="h6">{project.name}</Typography>
                      </Stack>
                      {project.description && (
                        <Typography variant="body2" color="text.secondary">
                          {project.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={
                            project.includeWeekends
                              ? "Weekends included"
                              : "Weekdays only"
                          }
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={formatTemplateLabel(project.workTemplate)}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`${project.workdayStart} - ${project.workdayEnd}`}
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      ) : viewMode === "calendar" ? (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="h6">Project Calendar</Typography>
            <Typography variant="body2" color="text.secondary">
              Shows task work slots across all projects (appointments are
              hidden).
            </Typography>
          </Stack>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <TextField
              select
              label="Filter projects"
              value={projectFilter}
              SelectProps={{
                multiple: true,
                onChange: handleProjectFilterChange,
                renderValue: (selected) => {
                  const ids = selected as string[];
                  if (ids.length === 0) return "All projects";
                  return ids
                    .map((id) => projectNameById.get(id) ?? "Unknown")
                    .join(", ");
                },
              }}
              fullWidth
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="flex-end"
            >
              <ToggleButtonGroup
                value={calendarMode}
                exclusive
                onChange={handleCalendarModeChange}
                size="small"
              >
                <ToggleButton value="month" aria-label="month view">
                  Month
                </ToggleButton>
                <ToggleButton value="year" aria-label="year view">
                  Year
                </ToggleButton>
              </ToggleButtonGroup>
              {calendarMode === "year" && (
                <TextField
                  select
                  label="Year"
                  value={calendarYear}
                  onChange={handleCalendarYearChange}
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  {holidayYearOptions.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Button
                variant="outlined"
                onClick={() => setProjectFilter([])}
                disabled={projectFilter.length === 0}
              >
                Clear Filter
              </Button>
              <Button variant="outlined" onClick={openHolidayDialog}>
                Holidays
              </Button>
              {calendarMode === "month" && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={showProjectOverlay}
                      onChange={(event) =>
                        setShowProjectOverlay(event.target.checked)
                      }
                    />
                  }
                  label="Project bars"
                />
              )}
              <FormControlLabel
                control={
                  <Switch
                    checked={showWeekNumbers}
                    onChange={(event) =>
                      setShowWeekNumbers(event.target.checked)
                    }
                  />
                }
                label="Week numbers"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showWeekends}
                    onChange={(event) => setShowWeekends(event.target.checked)}
                  />
                }
                label="Show weekends"
              />
            </Stack>
          </Stack>
          {calendarError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {calendarError}
            </Alert>
          )}
          {calendarLoading ? (
            <Skeleton
              variant="rectangular"
              height={420}
              sx={{ borderRadius: 1 }}
            />
          ) : calendarMode === "month" ? (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              eventClick={handleCalendarEventClick}
              editable={showProjectOverlay}
              eventDrop={handleCalendarEventDrop}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              height="auto"
              eventDisplay="block"
              displayEventEnd={true}
              dayMaxEvents={3}
              weekends={showWeekends}
              weekNumbers={showWeekNumbers}
              weekNumberCalculation="ISO"
            />
          ) : (
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
                const cells: JSX.Element[] = [];

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
                          setHolidayYear(calendarYear);
                          setHolidayDate(dateKey);
                          openHolidayDialog();
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
          )}
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="h6">Project Gantt</Typography>
            <Typography variant="body2" color="text.secondary">
              Drag a project bar to shift the entire schedule by days.
            </Typography>
          </Stack>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <TextField
              select
              label="Filter projects"
              value={projectFilter}
              SelectProps={{
                multiple: true,
                onChange: handleProjectFilterChange,
                renderValue: (selected) => {
                  const ids = selected as string[];
                  if (ids.length === 0) return "All projects";
                  return ids
                    .map((id) => projectNameById.get(id) ?? "Unknown")
                    .join(", ");
                },
              }}
              fullWidth
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="flex-end"
            >
              <Button
                variant="outlined"
                onClick={() => setProjectFilter([])}
                disabled={projectFilter.length === 0}
              >
                Clear Filter
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={showWeekends}
                    onChange={(event) => setShowWeekends(event.target.checked)}
                  />
                }
                label="Show weekends"
              />
            </Stack>
          </Stack>
          {calendarError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {calendarError}
            </Alert>
          )}
          {calendarLoading ? (
            <Skeleton
              variant="rectangular"
              height={420}
              sx={{ borderRadius: 1 }}
            />
          ) : scheduledProjectRanges.length === 0 || !timelineRange ? (
            <EmptyState
              title="No scheduled projects yet"
              description="Add work slots to see project schedules here."
              actionLabel="Open Projects"
              onAction={() => navigate("/projects")}
            />
          ) : (
            <Box
              sx={{
                display: { xs: "block", md: "grid" },
                gridTemplateColumns: "260px 1fr",
                gap: 2,
              }}
            >
              <Box>
                <Box
                  sx={{
                    height: ganttHeaderHeight,
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    color: "text.secondary",
                    fontWeight: 600,
                  }}
                >
                  Projects
                </Box>
                <Stack spacing={0}>
                  {scheduledProjectRanges.map((range) => {
                    const taskCount = range.taskIds.size;
                    return (
                      <Box
                        key={`project-${range.projectId}`}
                        sx={{
                          height: ganttRowHeight,
                          px: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap>
                            {range.projectName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {taskCount} tasks | {range.slotCount} slots
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() =>
                            navigate(`/projects/${range.projectId}`)
                          }
                        >
                          Open
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              <Box sx={{ overflowX: "auto" }}>
                <Box
                  sx={{
                    minWidth: timelineRange.days.length * ganttColumnWidth,
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${timelineRange.days.length}, ${ganttColumnWidth}px)`,
                      height: ganttHeaderHeight,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      background: "rgba(15, 118, 110, 0.06)",
                    }}
                  >
                    {timelineRange.days.map((day) => (
                      <Box
                        key={day.toISOString()}
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRight: "1px solid",
                          borderColor: "divider",
                          backgroundColor: isWeekend(day)
                            ? "rgba(15, 23, 42, 0.04)"
                            : "transparent",
                          opacity: showWeekends || !isWeekend(day) ? 1 : 0.3,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {format(day, "MMM d")}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Stack spacing={0}>
                    {scheduledProjectRanges.map((range) => {
                      const startIndex = differenceInCalendarDays(
                        startOfDay(range.start as Date),
                        timelineRange.start,
                      );
                      const endIndex = differenceInCalendarDays(
                        startOfDay(range.end as Date),
                        timelineRange.start,
                      );
                      const gridStart = Math.max(1, startIndex + 1);
                      const gridEnd = Math.max(gridStart + 1, endIndex + 2);
                      const isDragging = draggingProjectId === range.projectId;
                      const offsetDays = isDragging ? dragDeltaDays : 0;
                      const shiftLabel =
                        isDragging && dragDeltaDays !== 0
                          ? `Shift ${dragDeltaDays > 0 ? "+" : ""}${dragDeltaDays}d`
                          : "";

                      return (
                        <Box
                          key={`gantt-${range.projectId}`}
                          sx={{
                            height: ganttRowHeight,
                            display: "grid",
                            gridTemplateColumns: `repeat(${timelineRange.days.length}, ${ganttColumnWidth}px)`,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            position: "relative",
                            backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.05) 1px, transparent 1px)`,
                            backgroundSize: `${ganttColumnWidth}px 100%`,
                          }}
                        >
                          <Box
                            role="button"
                            aria-label={`Shift ${range.projectName}`}
                            onMouseDown={(event) =>
                              startProjectDrag(event, range.projectId)
                            }
                            sx={{
                              gridColumn: `${gridStart} / ${gridEnd}`,
                              alignSelf: "center",
                              height: 18,
                              borderRadius: 999,
                              cursor: shiftingProjectId
                                ? "not-allowed"
                                : "grab",
                              background:
                                "linear-gradient(135deg, rgba(59, 130, 246, 0.7), rgba(37, 99, 235, 0.95))",
                              boxShadow: "0 8px 18px rgba(15, 23, 42, 0.2)",
                              transform: `translateX(${offsetDays * ganttColumnWidth}px)`,
                              transition: isDragging
                                ? "none"
                                : "transform 120ms ease-out",
                            }}
                          />
                          {shiftLabel && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 12,
                                px: 1,
                                py: 0.25,
                                borderRadius: 999,
                                backgroundColor: "rgba(15, 23, 42, 0.8)",
                                color: "#fff",
                                fontSize: 11,
                              }}
                            >
                              {shiftLabel}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Box>
            </Box>
          )}
          {!calendarLoading && unscheduledProjects.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Unscheduled projects
              </Typography>
              <Stack spacing={1.5}>
                {unscheduledProjects.map((project) => (
                  <Box
                    key={`unscheduled-${project.id}`}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No work slots scheduled yet
                      </Typography>
                    </Box>
                    <Button onClick={() => navigate(`/projects/${project.id}`)}>
                      Add schedule
                    </Button>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      )}

      <Dialog
        open={holidayDialogOpen}
        onClose={() => setHolidayDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Holidays</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {holidayError && <Alert severity="error">{holidayError}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Year"
                value={holidayYear}
                onChange={handleHolidayYearChange}
                fullWidth
              >
                {holidayYearOptions.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Date"
                type="date"
                value={holidayDate}
                onChange={(event) => {
                  setHolidayDate(event.target.value);
                  setHolidayError(null);
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Holiday name"
              value={holidayName}
              onChange={(event) => {
                setHolidayName(event.target.value);
                setHolidayError(null);
              }}
              fullWidth
            />
            <Button variant="contained" onClick={handleAddHoliday}>
              Add holiday
            </Button>
            {filteredHolidays.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No holidays in {holidayYear}
              </Typography>
            ) : (
              <Stack spacing={1}>
                {filteredHolidays.map((holiday) => (
                  <Box
                    key={holiday.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {holiday.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {holiday.date}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveHoliday(holiday.id)}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHolidayDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Project</DialogTitle>
        <DialogContent>
          <TextField
            label="Project Name"
            fullWidth
            margin="normal"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          {/* Cascading template selection */}
          <TextField
            select
            label="Branche (optional)"
            fullWidth
            margin="normal"
            value={selectedIndustryId}
            onChange={(event) => setSelectedIndustryId(event.target.value)}
          >
            <MenuItem value="">Keine Branche</MenuItem>
            {industries.map((ind) => (
              <MenuItem key={ind.id} value={ind.id}>
                {ind.name}
              </MenuItem>
            ))}
          </TextField>

          {selectedIndustryId && productTypes.length > 0 && (
            <TextField
              select
              label="Produkttyp"
              fullWidth
              margin="normal"
              value={selectedProductTypeId}
              onChange={(event) => setSelectedProductTypeId(event.target.value)}
            >
              <MenuItem value="">Produkttyp wählen</MenuItem>
              {productTypes.map((pt) => (
                <MenuItem key={pt.id} value={pt.id}>
                  {pt.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {selectedProductTypeId && taskTemplates.length > 0 && (
            <>
              <TextField
                select
                label="Aufgaben-Vorlage"
                fullWidth
                margin="normal"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
              >
                <MenuItem value="">Keine Vorlage</MenuItem>
                {taskTemplates.map((tmpl) => (
                  <MenuItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.tasks.length} Schritte)
                    {tmpl.isSystem ? " — System" : ""}
                  </MenuItem>
                ))}
              </TextField>

              {selectedTemplateId && (() => {
                const tmpl = taskTemplates.find((t) => t.id === selectedTemplateId);
                if (!tmpl) return null;
                return (
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 1, mb: 1, maxHeight: 200, overflow: 'auto' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Vorschau: {tmpl.tasks.length} Aufgaben
                    </Typography>
                    {tmpl.tasks.map((task, idx) => (
                      <Typography key={task.id} variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {idx + 1}. {task.name}
                        {task.estimatedDuration ? ` (${task.estimatedDuration}${task.durationUnit === 'days' ? 'd' : 'h'})` : ''}
                      </Typography>
                    ))}
                  </Paper>
                );
              })()}
            </>
          )}

          <TextField
            select
            label="Working time template"
            fullWidth
            margin="normal"
            value={workTemplate}
            onChange={(event) => handleWorkTemplateChange(event.target.value)}
          >
            {workTemplateOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={includeWeekends}
                onChange={(event) => {
                  setIncludeWeekends(event.target.checked);
                  if (workTemplate !== "custom") {
                    setWorkTemplate("custom");
                  }
                }}
              />
            }
            label="Include weekends"
          />
          <Box display="flex" gap={2} mt={1}>
            <TextField
              label="Workday start"
              type="time"
              value={workdayStart}
              onChange={(event) => {
                setWorkdayStart(event.target.value);
                if (workTemplate !== "custom") {
                  setWorkTemplate("custom");
                }
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Workday end"
              type="time"
              value={workdayEnd}
              onChange={(event) => {
                setWorkdayEnd(event.target.value);
                if (workTemplate !== "custom") {
                  setWorkTemplate("custom");
                }
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Project"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(shiftSnackbar?.open)}
        autoHideDuration={5000}
        onClose={handleShiftSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleShiftSnackbarClose}
          severity="success"
          action={
            <Button color="inherit" size="small" onClick={handleShiftUndo}>
              Undo
            </Button>
          }
          sx={{ width: "100%" }}
        >
          {shiftSnackbar
            ? `${shiftSnackbar.projectName} shifted by ${
                shiftSnackbar.deltaDays > 0 ? "+" : ""
              }${shiftSnackbar.deltaDays} days`
            : "Project shifted"}
        </Alert>
      </Snackbar>
    </Box>
  );
}
