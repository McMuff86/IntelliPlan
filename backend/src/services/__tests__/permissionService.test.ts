import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import {
  getUserPermissions,
  hasPermission,
  getRolePermissions,
  getAllPermissions,
  invalidateUserPermissionCache,
  clearPermissionCache,
  getPermissionCacheSize,
} from '../permissionService';
import { pool } from '../../config/database';
import type { Permission } from '../../models/permission';

const mockedPool = vi.mocked(pool);

const mockPermissions: Permission[] = [
  {
    id: 'perm-1',
    name: 'projects:read',
    description: 'Projekte anzeigen',
    created_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'perm-2',
    name: 'projects:write',
    description: 'Projekte erstellen und bearbeiten',
    created_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'perm-3',
    name: 'tasks:read',
    description: 'Aufgaben anzeigen',
    created_at: new Date('2026-01-01T00:00:00Z'),
  },
];

describe('permissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPermissionCache();
  });

  // =========================================================================
  // getUserPermissions
  // =========================================================================
  describe('getUserPermissions', () => {
    it('should return permission names for a user', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ name: 'projects:read' }, { name: 'projects:write' }, { name: 'tasks:read' }],
        rowCount: 3,
      } as any);

      const perms = await getUserPermissions('user-1');

      expect(perms).toEqual(['projects:read', 'projects:write', 'tasks:read']);
      expect(mockedPool.query).toHaveBeenCalledTimes(1);
      expect(mockedPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.name'),
        ['user-1']
      );
    });

    it('should return empty array when user has no permissions', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const perms = await getUserPermissions('user-no-perms');
      expect(perms).toEqual([]);
    });

    it('should cache results on second call', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ name: 'projects:read' }],
        rowCount: 1,
      } as any);

      const first = await getUserPermissions('user-cached');
      const second = await getUserPermissions('user-cached');

      expect(first).toEqual(['projects:read']);
      expect(second).toEqual(['projects:read']);
      // Only one DB call – second was served from cache
      expect(mockedPool.query).toHaveBeenCalledTimes(1);
    });

    it('should cache independently per user', async () => {
      mockedPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'projects:read' }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ name: 'tasks:read' }],
          rowCount: 1,
        } as any);

      const permsA = await getUserPermissions('user-a');
      const permsB = await getUserPermissions('user-b');

      expect(permsA).toEqual(['projects:read']);
      expect(permsB).toEqual(['tasks:read']);
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
    });

    it('should re-fetch after cache invalidation', async () => {
      mockedPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'projects:read' }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ name: 'projects:read' }, { name: 'projects:write' }],
          rowCount: 2,
        } as any);

      const first = await getUserPermissions('user-inv');
      expect(first).toEqual(['projects:read']);

      invalidateUserPermissionCache('user-inv');

      const second = await getUserPermissions('user-inv');
      expect(second).toEqual(['projects:read', 'projects:write']);
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
    });

    it('should re-fetch after full cache clear', async () => {
      mockedPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'projects:read' }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [{ name: 'tasks:read' }],
          rowCount: 1,
        } as any);

      await getUserPermissions('user-clear');
      expect(mockedPool.query).toHaveBeenCalledTimes(1);

      clearPermissionCache();

      await getUserPermissions('user-clear');
      expect(mockedPool.query).toHaveBeenCalledTimes(2);
    });

    it('should propagate database errors', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(getUserPermissions('user-err')).rejects.toThrow('DB connection failed');
    });

    it('should join users, role_permissions, and permissions tables', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getUserPermissions('user-join');

      const sql = mockedPool.query.mock.calls[0][0] as string;
      expect(sql).toContain('role_permissions');
      expect(sql).toContain('users');
      expect(sql).toContain('permissions');
    });
  });

  // =========================================================================
  // hasPermission
  // =========================================================================
  describe('hasPermission', () => {
    it('should return true when user has the permission', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ name: 'projects:read' }, { name: 'projects:write' }],
        rowCount: 2,
      } as any);

      const result = await hasPermission('user-has', 'projects:write');
      expect(result).toBe(true);
    });

    it('should return false when user lacks the permission', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ name: 'projects:read' }],
        rowCount: 1,
      } as any);

      const result = await hasPermission('user-lack', 'projects:delete');
      expect(result).toBe(false);
    });

    it('should return false when user has no permissions at all', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await hasPermission('user-none', 'projects:read');
      expect(result).toBe(false);
    });

    it('should use cached permissions for repeated checks', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ name: 'tasks:read' }, { name: 'tasks:write' }],
        rowCount: 2,
      } as any);

      await hasPermission('user-rep', 'tasks:read');
      await hasPermission('user-rep', 'tasks:write');
      await hasPermission('user-rep', 'tasks:delete');

      // Only one DB query despite three checks
      expect(mockedPool.query).toHaveBeenCalledTimes(1);
    });

    it('should be case-sensitive for permission names', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ name: 'projects:read' }],
        rowCount: 1,
      } as any);

      expect(await hasPermission('user-case', 'projects:read')).toBe(true);
      expect(await hasPermission('user-case', 'Projects:Read')).toBe(false);
      expect(await hasPermission('user-case', 'PROJECTS:READ')).toBe(false);
    });
  });

  // =========================================================================
  // getRolePermissions
  // =========================================================================
  describe('getRolePermissions', () => {
    it('should return permissions for a given role', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: mockPermissions,
        rowCount: 3,
      } as any);

      const perms = await getRolePermissions('admin');

      expect(perms).toHaveLength(3);
      expect(perms[0].name).toBe('projects:read');
      expect(mockedPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE rp.role = $1'),
        ['admin']
      );
    });

    it('should return empty array for role with no permissions', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const perms = await getRolePermissions('lehrling');
      expect(perms).toEqual([]);
    });

    it('should return full Permission objects (not just names)', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [mockPermissions[0]],
        rowCount: 1,
      } as any);

      const perms = await getRolePermissions('monteur');

      expect(perms[0]).toHaveProperty('id');
      expect(perms[0]).toHaveProperty('name');
      expect(perms[0]).toHaveProperty('description');
      expect(perms[0]).toHaveProperty('created_at');
    });

    it('should query with the correct role parameter', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getRolePermissions('projektleiter');

      expect(mockedPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['projektleiter']
      );
    });
  });

  // =========================================================================
  // getAllPermissions
  // =========================================================================
  describe('getAllPermissions', () => {
    it('should return all permissions ordered by name', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: mockPermissions,
        rowCount: 3,
      } as any);

      const perms = await getAllPermissions();

      expect(perms).toHaveLength(3);
      expect(mockedPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name')
      );
    });

    it('should return empty array when no permissions exist', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const perms = await getAllPermissions();
      expect(perms).toEqual([]);
    });
  });

  // =========================================================================
  // Cache management
  // =========================================================================
  describe('cache management', () => {
    it('should report cache size of 0 initially', () => {
      expect(getPermissionCacheSize()).toBe(0);
    });

    it('should increment cache size after getUserPermissions', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getUserPermissions('user-size');
      expect(getPermissionCacheSize()).toBe(1);
    });

    it('should not increment cache size for same user', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ name: 'projects:read' }],
        rowCount: 1,
      } as any);

      await getUserPermissions('user-same');
      await getUserPermissions('user-same');
      expect(getPermissionCacheSize()).toBe(1);
    });

    it('should track multiple users in cache', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getUserPermissions('user-m1');
      await getUserPermissions('user-m2');
      await getUserPermissions('user-m3');

      expect(getPermissionCacheSize()).toBe(3);
    });

    it('should reduce cache size when invalidating a user', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getUserPermissions('user-r1');
      await getUserPermissions('user-r2');
      expect(getPermissionCacheSize()).toBe(2);

      invalidateUserPermissionCache('user-r1');
      expect(getPermissionCacheSize()).toBe(1);
    });

    it('should reset cache size to 0 on clearPermissionCache', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getUserPermissions('user-c1');
      await getUserPermissions('user-c2');

      clearPermissionCache();
      expect(getPermissionCacheSize()).toBe(0);
    });

    it('should not throw when invalidating non-existent user', () => {
      expect(() => invalidateUserPermissionCache('non-existent')).not.toThrow();
    });
  });
});
