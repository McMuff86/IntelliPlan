export interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isOwn?: boolean;
}

export interface CreateAppointmentDTO {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface ReversePlanTaskInput {
  id?: string;
  title: string;
  durationMinutes: number;
  resourceId?: string;
  resourceLabel?: string;
}

export interface ReversePlanResourceInput {
  id: string;
  name: string;
  availability?: { start: string; end: string };
}

export interface ReversePlanRequest {
  endDate: string;
  tasks: ReversePlanTaskInput[];
  resources?: ReversePlanResourceInput[];
  timezone?: string;
  includeWeekends?: boolean;
  workdayStart?: string;
  workdayEnd?: string;
}

export interface ReversePlanScheduleEntry {
  taskId?: string;
  title: string;
  startTime: string;
  endTime: string;
  resourceId?: string;
  resourceLabel?: string;
}

export interface ReversePlanResult {
  schedule: ReversePlanScheduleEntry[];
  endDate: string;
  timezone: string;
  warnings?: string[];
  promptTemplate?: string;
}

export interface AppointmentFormData {
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  timezone: string;
}

export interface OverlapConflict {
  hasOverlap: boolean;
  conflicts: Appointment[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "single" | "team";
  teamId?: string;
  timezone: string;
  emailVerified?: boolean;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export type TaskStatus = "planned" | "in_progress" | "blocked" | "done";
export type SchedulingMode = "manual" | "auto";
export type DependencyType = "finish_start" | "start_start" | "finish_finish";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  includeWeekends: boolean;
  workdayStart: string;
  workdayEnd: string;
  workTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  schedulingMode: SchedulingMode;
  durationMinutes: number | null;
  resourceLabel: string | null;
  resourceId: string | null;
  resourceName?: string | null;
  resourceType?: "person" | "machine" | "vehicle" | null;
  startDate: string | null;
  dueDate: string | null;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  isBlocked?: boolean;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: DependencyType;
  createdAt: string;
}

export interface TaskWorkSlot {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  isFixed: boolean;
  isAllDay: boolean;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWorkSlotCalendar {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  isFixed: boolean;
  isAllDay: boolean;
  taskDurationMinutes: number | null;
  reminderEnabled: boolean;
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  includeWeekends?: boolean;
  workdayStart?: string;
  workdayEnd?: string;
  workTemplate?: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: TaskStatus;
  schedulingMode?: SchedulingMode;
  durationMinutes?: number | null;
  resourceLabel?: string | null;
  resourceId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  reminderEnabled?: boolean;
}

export interface CreateDependencyDTO {
  dependsOnTaskId: string;
  dependencyType: DependencyType;
}

export interface CreateWorkSlotDTO {
  startTime: string;
  endTime: string;
  isFixed?: boolean;
  isAllDay?: boolean;
  reminderEnabled?: boolean;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  actorUserId: string | null;
  entityType: "project" | "task" | "work_slot" | "dependency";
  action: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type ResourceType = "person" | "machine" | "vehicle";

export interface Resource {
  id: string;
  ownerId: string;
  name: string;
  resourceType: ResourceType;
  description: string | null;
  isActive: boolean;
  availabilityEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceDTO {
  name: string;
  resourceType: ResourceType;
  description?: string | null;
  isActive?: boolean;
  availabilityEnabled?: boolean;
}
