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

export interface AISuggestion {
  type: 'reschedule' | 'split' | 'shorten' | 'swap' | 'move_earlier';
  confidence: number;
  description: string;
  proposedTime?: {
    startTime: string;
    endTime: string;
  };
  reasoning: string;
}

export interface OverlapConflict {
  hasOverlap: boolean;
  conflicts: Appointment[];
  aiSuggestions?: AISuggestion[];
  conflictPattern?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "single" | "team";
  teamId?: string;
  timezone: string;
  industryId?: string | null;
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
export type PhaseCode = "ZUS" | "CNC" | "PROD" | "VORBEH" | "NACHBEH" | "BESCHL" | "TRANS" | "MONT";
export type ProjectPriority = "low" | "normal" | "high" | "urgent";
export type ProjectRiskLevel = "low" | "medium" | "high" | "critical";
export type ReadinessCheckCode = "AVOR_DONE" | "MATERIAL_READY" | "FITTINGS_READY" | "PLANS_READY" | "SITE_READY";
export type ReadinessStatus = "pending" | "ok" | "blocked" | "n_a";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  includeWeekends: boolean;
  workdayStart: string;
  workdayEnd: string;
  workTemplate: string;
  taskTemplateId: string | null;
  orderNumber: string | null;
  customerName: string | null;
  installationLocation: string | null;
  color: string | null;
  contactName: string | null;
  contactPhone: string | null;
  needsCallback: boolean;
  sachbearbeiter: string | null;
  workerCount: number | null;
  helperCount: number | null;
  remarks: string | null;
  targetEndDate: string | null;
  priority: ProjectPriority;
  riskLevel: ProjectRiskLevel;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
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
  phaseCode?: string | null;
  plannedWeek?: number | null;
  plannedYear?: number | null;
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
  taskTemplateId?: string;
  orderNumber?: string | null;
  customerName?: string | null;
  installationLocation?: string | null;
  color?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  needsCallback?: boolean;
  sachbearbeiter?: string | null;
  workerCount?: number | null;
  helperCount?: number | null;
  remarks?: string | null;
  targetEndDate?: string | null;
  priority?: ProjectPriority;
  riskLevel?: ProjectRiskLevel;
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
  phaseCode?: string | null;
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

export interface ProjectPhasePlan {
  id: string;
  projectId: string;
  ownerId: string;
  phaseCode: PhaseCode;
  phaseLabel: string;
  sequenceOrder: number;
  isRequired: boolean;
  isEnabled: boolean;
  estimatedHoursMin: number | null;
  estimatedHoursMax: number | null;
  dependencyPhaseCodes: PhaseCode[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectPhasePlanInput {
  phaseCode: PhaseCode;
  phaseLabel?: string;
  sequenceOrder: number;
  isRequired?: boolean;
  isEnabled?: boolean;
  estimatedHoursMin?: number | null;
  estimatedHoursMax?: number | null;
  dependencyPhaseCodes?: PhaseCode[];
  notes?: string | null;
}

export interface SyncProjectPhasePlanResult {
  createdTaskIds: string[];
  updatedTaskIds: string[];
  deletedTaskIds: string[];
  warnings: string[];
}

export type AutoScheduleTaskAction = "create" | "update" | "unchanged" | "skipped";

export interface AutoSchedulePreviewTaskSlot {
  startTime: string;
  endTime: string;
}

export interface AutoSchedulePreviewTask {
  taskId: string;
  title: string;
  phaseCode: string | null;
  resourceId: string | null;
  action: AutoScheduleTaskAction;
  reason: string | null;
  durationMinutes: number | null;
  startDate: string | null;
  dueDate: string | null;
  slotCount: number;
  slots: AutoSchedulePreviewTaskSlot[];
}

export interface AutoSchedulePreviewConflict {
  taskId: string;
  taskTitle: string;
  resourceId: string;
  resourceName: string | null;
  proposedStartTime: string;
  proposedEndTime: string;
  conflictTaskId: string;
  conflictTaskTitle: string;
  conflictStartTime: string;
  conflictEndTime: string;
}

export interface AutoSchedulePreviewSummary {
  selectedTaskCount: number;
  scheduledTaskCount: number;
  skippedTaskCount: number;
  createCount: number;
  updateCount: number;
  unchangedCount: number;
  conflictCount: number;
}

export interface AutoSchedulePreviewResult {
  projectId: string;
  ownerId: string;
  endDate: string;
  taskIds: string[];
  summary: AutoSchedulePreviewSummary;
  tasks: AutoSchedulePreviewTask[];
  warnings: string[];
  conflicts: AutoSchedulePreviewConflict[];
  createdAt: string;
}

export interface AutoScheduleApplyResult {
  scheduledTaskIds: string[];
  skippedTaskIds: string[];
  warnings: string[];
}

export interface ProjectReadinessCheck {
  id: string;
  projectId: string;
  ownerId: string;
  checkCode: ReadinessCheckCode;
  checkLabel: string;
  status: ReadinessStatus;
  checkedBy: string | null;
  checkedAt: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectReadinessCheckInput {
  checkCode: ReadinessCheckCode;
  status: ReadinessStatus;
  comment?: string | null;
  checkedAt?: string | null;
}

export interface ProjectReadinessSummary {
  projectId: string;
  ownerId: string;
  totalChecks: number;
  okCount: number;
  naCount: number;
  pendingCount: number;
  blockedCount: number;
  isReady: boolean;
  updatedAt: string | null;
}

export interface DefaultReadinessCheckTemplate {
  checkCode: ReadinessCheckCode;
  checkLabel: string;
  status: ReadinessStatus;
}

export type ResourceType = "person" | "machine" | "vehicle";
export type Department = 'zuschnitt' | 'cnc' | 'produktion' | 'behandlung' | 'beschlaege' | 'transport' | 'montage' | 'buero';
export type EmployeeType = 'internal' | 'temporary' | 'external_firm' | 'pensioner' | 'apprentice';
export type WorkRole = 'arbeiter' | 'hilfskraft' | 'lehrling' | 'allrounder' | 'buero';

export interface Resource {
  id: string;
  ownerId: string;
  name: string;
  resourceType: ResourceType;
  description: string | null;
  isActive: boolean;
  availabilityEnabled: boolean;
  department: Department | null;
  employeeType: EmployeeType | null;
  shortCode: string | null;
  defaultLocation: string | null;
  weeklyHours: number | null;
  workRole: WorkRole;
  skills: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceDTO {
  name: string;
  resourceType: ResourceType;
  description?: string | null;
  isActive?: boolean;
  availabilityEnabled?: boolean;
  department?: Department | null;
  employeeType?: EmployeeType | null;
  shortCode?: string | null;
  defaultLocation?: string | null;
  weeklyHours?: number | null;
  workRole?: WorkRole;
  skills?: string[] | null;
}

// Search types
export interface PaginatedSearchResult<T> {
  total: number;
  page: number;
  totalPages: number;
  items: T[];
}

export interface SearchAppointmentsParams {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface SearchProjectsParams {
  q?: string;
  status?: 'active' | 'completed' | 'archived';
  page?: number;
  limit?: number;
}

export interface SearchTasksParams {
  q?: string;
  projectId?: string;
  status?: 'planned' | 'in_progress' | 'blocked' | 'done';
  page?: number;
  limit?: number;
}

export interface GlobalSearchResult {
  appointments: Appointment[];
  projects: Project[];
  tasks: Task[];
}

// ─── Industry / Template Types ───

export type TaskCategory =
  | 'planning'
  | 'procurement'
  | 'production'
  | 'treatment'
  | 'assembly'
  | 'delivery'
  | 'approval'
  | 'documentation';

export interface IndustrySettings {
  usePhases: boolean;
  supportsSubtasks: boolean;
  terminology: {
    project: string;
    task: string;
    client: string;
  };
}

export interface Industry {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  settings: IndustrySettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProductType {
  id: string;
  industryId: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateTask {
  id: string;
  order: number;
  code?: string;
  name: string;
  description?: string;
  estimatedDuration?: number;
  durationUnit: 'hours' | 'days';
  dependsOn?: string[];
  category: TaskCategory;
  isOptional: boolean;
  defaultAssignee?: string;
  checklistItems?: string[];
}

export interface TaskTemplate {
  id: string;
  productTypeId: string;
  name: string;
  description: string | null;
  tasks: TemplateTask[];
  isDefault: boolean;
  isSystem: boolean;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskTemplateDTO {
  productTypeId: string;
  name: string;
  description?: string;
  tasks: TemplateTask[];
  isDefault?: boolean;
}

// ─── Pendenzen Types ───

export type PendenzBereich = 'avor' | 'montage' | 'planung' | 'material';
export type PendenzPrioritaet = 'hoch' | 'mittel' | 'niedrig';
export type PendenzStatus = 'offen' | 'in_arbeit' | 'erledigt';
export type PendenzKategorie = 'projekt' | 'allgemein' | 'benutzer';

export interface PendenzResponse {
  id: string;
  projectId: string;
  nr: number;
  beschreibung: string;
  bereich: PendenzBereich;
  verantwortlichId: string | null;
  verantwortlichName: string | null;
  erfasstVonId: string;
  erfasstVonName: string;
  prioritaet: PendenzPrioritaet;
  status: PendenzStatus;
  faelligBis: string | null;
  erledigtAm: string | null;
  bemerkungen: string | null;
  auftragsnummer: string | null;
  kategorie: PendenzKategorie;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePendenzDTO {
  beschreibung: string;
  bereich: PendenzBereich;
  verantwortlichId?: string | null;
  prioritaet?: PendenzPrioritaet;
  faelligBis?: string | null;
  bemerkungen?: string | null;
  auftragsnummer?: string | null;
  kategorie?: PendenzKategorie;
}

export interface UpdatePendenzDTO {
  beschreibung?: string;
  bereich?: PendenzBereich;
  verantwortlichId?: string | null;
  prioritaet?: PendenzPrioritaet;
  status?: PendenzStatus;
  faelligBis?: string | null;
  erledigtAm?: string | null;
  bemerkungen?: string | null;
  auftragsnummer?: string | null;
  kategorie?: PendenzKategorie;
}

export interface PendenzHistorieResponse {
  id: string;
  pendenzId: string;
  userId: string | null;
  aktion: string;
  feld: string | null;
  alterWert: string | null;
  neuerWert: string | null;
  createdAt: string;
}

export interface PendenzenListParams {
  status?: PendenzStatus;
  bereich?: PendenzBereich;
  verantwortlich?: string;
  ueberfaellig?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface PendenzenListResponse {
  data: PendenzResponse[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
