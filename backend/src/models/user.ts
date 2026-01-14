export type UserRole = 'admin' | 'single' | 'team';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team_id: string | null;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.team_id,
    timezone: user.timezone,
    createdAt: user.created_at.toISOString(),
    updatedAt: user.updated_at.toISOString(),
  };
}
