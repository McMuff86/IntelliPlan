export type UserRole = 'admin' | 'single' | 'team';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team_id: string | null;
  timezone: string;
  industry_id: string | null;
  password_hash?: string | null;
  email_verified_at?: Date | null;
  email_verification_token?: string | null;
  email_verification_expires_at?: Date | null;
  password_reset_token?: string | null;
  password_reset_expires_at?: Date | null;
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
  industryId: string | null;
  emailVerified: boolean;
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
    industryId: user.industry_id,
    emailVerified: Boolean(user.email_verified_at),
    createdAt: user.created_at.toISOString(),
    updatedAt: user.updated_at.toISOString(),
  };
}
