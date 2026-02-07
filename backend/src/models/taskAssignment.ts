export type HalfDay = 'morning' | 'afternoon' | 'full_day';
export type StatusCode = 'assigned' | 'available' | 'sick' | 'vacation' | 'training' | 'other';

export const VALID_STATUS_CODES: StatusCode[] = ['assigned', 'available', 'sick', 'vacation', 'training', 'other'];

export interface TaskAssignment {
  id: string;
  task_id: string;
  resource_id: string;
  assignment_date: string;
  half_day: HalfDay;
  notes: string | null;
  is_fixed: boolean;
  start_time: string | null;
  status_code: StatusCode;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TaskAssignmentWithNames extends TaskAssignment {
  resource_name: string;
  resource_short_code: string | null;
  task_title: string;
  project_id: string;
  project_name: string;
}

export interface TaskAssignmentResponse {
  id: string;
  taskId: string;
  resourceId: string;
  assignmentDate: string;
  halfDay: HalfDay;
  notes: string | null;
  isFixed: boolean;
  startTime: string | null;
  statusCode: StatusCode;
  resourceName: string;
  resourceShortCode: string | null;
  taskTitle: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskAssignmentDTO {
  task_id: string;
  resource_id: string;
  assignment_date: string;
  half_day: HalfDay;
  notes?: string | null;
  is_fixed?: boolean;
  start_time?: string | null;
  status_code?: StatusCode;
}

export interface UpdateTaskAssignmentDTO {
  resource_id?: string;
  assignment_date?: string;
  half_day?: HalfDay;
  notes?: string | null;
  is_fixed?: boolean;
  start_time?: string | null;
  status_code?: StatusCode;
}

export interface BulkCreateAssignmentDTO {
  task_id: string;
  resource_id: string;
  dates: string[];
  half_day: HalfDay;
  is_fixed?: boolean;
  status_code?: StatusCode;
}

export const toTaskAssignmentResponse = (row: TaskAssignmentWithNames): TaskAssignmentResponse => ({
  id: row.id,
  taskId: row.task_id,
  resourceId: row.resource_id,
  assignmentDate: row.assignment_date,
  halfDay: row.half_day,
  notes: row.notes,
  isFixed: row.is_fixed,
  startTime: row.start_time,
  statusCode: row.status_code,
  resourceName: row.resource_name,
  resourceShortCode: row.resource_short_code,
  taskTitle: row.task_title,
  projectId: row.project_id,
  projectName: row.project_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
