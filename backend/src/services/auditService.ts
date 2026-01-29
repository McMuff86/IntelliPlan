import { pool } from '../config/database';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export async function logAuditEvent(data: {
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.userId,
      data.action,
      data.entityType ?? null,
      data.entityId ?? null,
      data.ipAddress ?? null,
      data.userAgent ?? null,
      JSON.stringify(data.metadata ?? {}),
    ]
  );
}

export async function getAuditLogs(userId: string): Promise<AuditLogEntry[]> {
  const result = await pool.query<AuditLogEntry>(
    `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return result.rows;
}
