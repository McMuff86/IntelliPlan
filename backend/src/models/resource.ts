export type ResourceType = 'person' | 'machine' | 'vehicle';
export type Department = 'zuschnitt' | 'cnc' | 'produktion' | 'behandlung' | 'beschlaege' | 'transport' | 'montage' | 'buero';
export type EmployeeType = 'internal' | 'temporary' | 'external_firm' | 'pensioner' | 'apprentice';

export const VALID_DEPARTMENTS: Department[] = ['zuschnitt', 'cnc', 'produktion', 'behandlung', 'beschlaege', 'transport', 'montage', 'buero'];
export const VALID_EMPLOYEE_TYPES: EmployeeType[] = ['internal', 'temporary', 'external_firm', 'pensioner', 'apprentice'];

export interface Resource {
  id: string;
  owner_id: string;
  name: string;
  resource_type: ResourceType;
  description: string | null;
  is_active: boolean;
  availability_enabled: boolean;
  department: Department | null;
  employee_type: EmployeeType | null;
  short_code: string | null;
  default_location: string | null;
  weekly_hours: number | null;
  skills: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceResponse {
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
  skills: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceDTO {
  owner_id: string;
  name: string;
  resource_type: ResourceType;
  description?: string | null;
  is_active?: boolean;
  availability_enabled?: boolean;
  department?: Department | null;
  employee_type?: EmployeeType | null;
  short_code?: string | null;
  default_location?: string | null;
  weekly_hours?: number | null;
  skills?: string[] | null;
}

export interface UpdateResourceDTO {
  name?: string;
  resource_type?: ResourceType;
  description?: string | null;
  is_active?: boolean;
  availability_enabled?: boolean;
  department?: Department | null;
  employee_type?: EmployeeType | null;
  short_code?: string | null;
  default_location?: string | null;
  weekly_hours?: number | null;
  skills?: string[] | null;
}

export const toResourceResponse = (resource: Resource): ResourceResponse => ({
  id: resource.id,
  ownerId: resource.owner_id,
  name: resource.name,
  resourceType: resource.resource_type,
  description: resource.description,
  isActive: resource.is_active,
  availabilityEnabled: resource.availability_enabled,
  department: resource.department,
  employeeType: resource.employee_type,
  shortCode: resource.short_code,
  defaultLocation: resource.default_location,
  weeklyHours: resource.weekly_hours ? Number(resource.weekly_hours) : null,
  skills: resource.skills,
  createdAt: resource.created_at,
  updatedAt: resource.updated_at,
});
