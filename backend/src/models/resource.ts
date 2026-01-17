export type ResourceType = 'person' | 'machine' | 'vehicle';

export interface Resource {
  id: string;
  owner_id: string;
  name: string;
  resource_type: ResourceType;
  description: string | null;
  is_active: boolean;
  availability_enabled: boolean;
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
}

export interface UpdateResourceDTO {
  name?: string;
  resource_type?: ResourceType;
  description?: string | null;
  is_active?: boolean;
  availability_enabled?: boolean;
}

export const toResourceResponse = (resource: Resource): ResourceResponse => ({
  id: resource.id,
  ownerId: resource.owner_id,
  name: resource.name,
  resourceType: resource.resource_type,
  description: resource.description,
  isActive: resource.is_active,
  availabilityEnabled: resource.availability_enabled,
  createdAt: resource.created_at,
  updatedAt: resource.updated_at,
});
