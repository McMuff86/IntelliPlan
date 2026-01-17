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
  role: 'admin' | 'single' | 'team';
  teamId?: string;
  timezone: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export type TaskStatus = 'planned' | 'in_progress' | 'blocked' | 'done';
export type SchedulingMode = 'manual' | 'auto';
export type DependencyType = 'finish_start' | 'start_start' | 'finish_finish';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  includeWeekends: boolean;
  workdayStart: string;
  workdayEnd: string;
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
  startDate: string | null;
  dueDate: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  includeWeekends?: boolean;
  workdayStart?: string;
  workdayEnd?: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: TaskStatus;
  schedulingMode?: SchedulingMode;
  durationMinutes?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface CreateDependencyDTO {
  dependsOnTaskId: string;
  dependencyType: DependencyType;
}

export interface CreateWorkSlotDTO {
  startTime: string;
  endTime: string;
  isFixed?: boolean;
}
