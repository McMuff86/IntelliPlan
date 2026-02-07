import api from './api';

export interface ImportSummary {
  projectCount: number;
  taskCount: number;
  resourceCount: number;
  assignmentCount: number;
  phaseScheduleCount: number;
  weeksCovered: number[];
}

export interface ImportValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
  summary: ImportSummary;
}

export interface ImportResult {
  success: boolean;
  projectsCreated: number;
  projectsUpdated: number;
  tasksCreated: number;
  resourcesCreated: number;
  resourcesUpdated: number;
  assignmentsCreated: number;
  phaseSchedulesCreated: number;
  errors: string[];
}

export async function validateWochenplanImport(file: File): Promise<ImportValidation> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/import/wochenplan/validate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.data;
}

export async function executeWochenplanImport(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/import/wochenplan/execute', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.data;
}
