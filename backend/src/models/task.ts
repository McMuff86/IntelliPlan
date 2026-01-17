export type TaskStatus = 'planned' | 'in_progress' | 'blocked' | 'done';
export type SchedulingMode = 'manual' | 'auto';
export type DependencyType = 'finish_start' | 'start_start' | 'finish_finish';

export interface Task {
  id: string;
  project_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  scheduling_mode: SchedulingMode;
  duration_minutes: number | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskResponse {
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
}

export interface CreateTaskDTO {
  project_id: string;
  owner_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  scheduling_mode?: SchedulingMode;
  duration_minutes?: number | null;
  start_date?: string | null;
  due_date?: string | null;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  scheduling_mode?: SchedulingMode;
  duration_minutes?: number | null;
  start_date?: string | null;
  due_date?: string | null;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
  created_at: string;
}

export interface TaskDependencyResponse {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: DependencyType;
  createdAt: string;
}

export interface TaskWorkSlot {
  id: string;
  task_id: string;
  start_time: string;
  end_time: string;
  is_fixed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskWorkSlotResponse {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  isFixed: boolean;
  createdAt: string;
  updatedAt: string;
}

export const toTaskResponse = (task: Task): TaskResponse => ({
  id: task.id,
  projectId: task.project_id,
  ownerId: task.owner_id,
  title: task.title,
  description: task.description,
  status: task.status,
  schedulingMode: task.scheduling_mode,
  durationMinutes: task.duration_minutes,
  startDate: task.start_date,
  dueDate: task.due_date,
  createdAt: task.created_at,
  updatedAt: task.updated_at,
});

export const toTaskDependencyResponse = (dependency: TaskDependency): TaskDependencyResponse => ({
  id: dependency.id,
  taskId: dependency.task_id,
  dependsOnTaskId: dependency.depends_on_task_id,
  dependencyType: dependency.dependency_type,
  createdAt: dependency.created_at,
});

export const toTaskWorkSlotResponse = (slot: TaskWorkSlot): TaskWorkSlotResponse => ({
  id: slot.id,
  taskId: slot.task_id,
  startTime: slot.start_time,
  endTime: slot.end_time,
  isFixed: slot.is_fixed,
  createdAt: slot.created_at,
  updatedAt: slot.updated_at,
});
