import { pool } from '../config/database';
import { Permission } from '../models/permission';
import { UserRole } from '../models/user';

// In-memory cache for user permissions (userId -> { permissions, expiresAt })
interface CacheEntry {
  permissions: string[];
  expiresAt: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all permissions assigned to a user's role.
 * Results are cached per userId for CACHE_TTL_MS.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const now = Date.now();
  const cached = permissionCache.get(userId);

  if (cached && cached.expiresAt > now) {
    return cached.permissions;
  }

  const result = await pool.query<{ name: string }>(
    `SELECT p.name
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     INNER JOIN users u ON u.role = rp.role
     WHERE u.id = $1
     ORDER BY p.name`,
    [userId]
  );

  const permissions = result.rows.map((row) => row.name);

  permissionCache.set(userId, {
    permissions,
    expiresAt: now + CACHE_TTL_MS,
  });

  return permissions;
}

/**
 * Check if a user has a specific permission.
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

/**
 * Get all permissions for a given role.
 */
export async function getRolePermissions(role: UserRole): Promise<Permission[]> {
  const result = await pool.query<Permission>(
    `SELECT p.*
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role = $1
     ORDER BY p.name`,
    [role]
  );

  return result.rows;
}

/**
 * Get all available permissions.
 */
export async function getAllPermissions(): Promise<Permission[]> {
  const result = await pool.query<Permission>(
    `SELECT * FROM permissions ORDER BY name`
  );

  return result.rows;
}

/**
 * Invalidate cache for a specific user.
 * Call this when a user's role changes.
 */
export function invalidateUserPermissionCache(userId: string): void {
  permissionCache.delete(userId);
}

/**
 * Clear the entire permission cache.
 * Call this when role_permissions mappings change.
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Get current cache size (for monitoring/testing).
 */
export function getPermissionCacheSize(): number {
  return permissionCache.size;
}
