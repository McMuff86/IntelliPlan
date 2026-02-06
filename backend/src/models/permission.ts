export interface Permission {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface PermissionResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface RolePermission {
  role: string;
  permission_id: string;
}

export function toPermissionResponse(permission: Permission): PermissionResponse {
  return {
    id: permission.id,
    name: permission.name,
    description: permission.description,
    createdAt: permission.created_at.toISOString(),
  };
}
