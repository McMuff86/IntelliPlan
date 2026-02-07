import { pool } from '../config/database';
import type {
  CreatePendenzDTO,
  Pendenz,
  PendenzHistorie,
  PendenzWithNames,
  UpdatePendenzDTO,
} from '../models/pendenz';

// ─── Helpers ───────────────────────────────────────────

async function getNextNr(projectId: string): Promise<number> {
  const result = await pool.query<{ max_nr: number | null }>(
    `SELECT MAX(nr) AS max_nr FROM pendenzen WHERE project_id = $1`,
    [projectId]
  );
  return (result.rows[0].max_nr ?? 0) + 1;
}

const SELECT_WITH_NAMES = `
  SELECT
    p.*,
    uv.name AS verantwortlich_name,
    ue.name AS erfasst_von_name
  FROM pendenzen p
  LEFT JOIN users uv ON uv.id = p.verantwortlich_id
  JOIN users ue ON ue.id = p.erfasst_von_id
`;

// ─── CRUD ──────────────────────────────────────────────

export async function createPendenz(data: CreatePendenzDTO): Promise<PendenzWithNames> {
  const nr = await getNextNr(data.project_id);

  const result = await pool.query<Pendenz>(
    `INSERT INTO pendenzen (
      project_id, nr, beschreibung, bereich,
      verantwortlich_id, erfasst_von_id,
      prioritaet, faellig_bis, bemerkungen, auftragsnummer, kategorie
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      data.project_id,
      nr,
      data.beschreibung,
      data.bereich,
      data.verantwortlich_id ?? null,
      data.erfasst_von_id,
      data.prioritaet ?? 'mittel',
      data.faellig_bis ?? null,
      data.bemerkungen ?? null,
      data.auftragsnummer ?? null,
      data.kategorie ?? 'projekt',
    ]
  );

  // Re-fetch with joined user names
  return getPendenzById(result.rows[0].id) as Promise<PendenzWithNames>;
}

export async function getPendenzById(id: string): Promise<PendenzWithNames | null> {
  const result = await pool.query<PendenzWithNames>(
    `${SELECT_WITH_NAMES} WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export interface ListPendenzenOptions {
  projectId: string;
  status?: string;
  verantwortlichId?: string;
  bereich?: string;
  ueberfaellig?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedPendenzen {
  data: PendenzWithNames[];
  total: number;
  limit: number;
  offset: number;
}

export async function listPendenzen(opts: ListPendenzenOptions): Promise<PaginatedPendenzen> {
  const conditions: string[] = ['p.project_id = $1', 'p.archived_at IS NULL'];
  const params: unknown[] = [opts.projectId];
  let paramIdx = 2;

  if (opts.status) {
    conditions.push(`p.status = $${paramIdx}`);
    params.push(opts.status);
    paramIdx++;
  }

  if (opts.verantwortlichId) {
    conditions.push(`p.verantwortlich_id = $${paramIdx}`);
    params.push(opts.verantwortlichId);
    paramIdx++;
  }

  if (opts.bereich) {
    conditions.push(`p.bereich = $${paramIdx}`);
    params.push(opts.bereich);
    paramIdx++;
  }

  if (opts.ueberfaellig) {
    conditions.push(`p.faellig_bis < CURRENT_DATE AND p.status != 'erledigt'`);
  }

  const whereClause = conditions.join(' AND ');

  // Sort
  const allowedSorts: Record<string, string> = {
    'faellig_bis': 'p.faellig_bis ASC NULLS LAST',
    '-faellig_bis': 'p.faellig_bis DESC NULLS LAST',
    'erstellt_am': 'p.created_at ASC',
    '-erstellt_am': 'p.created_at DESC',
    'nr': 'p.nr ASC',
    '-nr': 'p.nr DESC',
    'prioritaet': `CASE p.prioritaet WHEN 'hoch' THEN 1 WHEN 'mittel' THEN 2 WHEN 'niedrig' THEN 3 END ASC`,
    '-prioritaet': `CASE p.prioritaet WHEN 'hoch' THEN 1 WHEN 'mittel' THEN 2 WHEN 'niedrig' THEN 3 END DESC`,
  };
  const orderBy = (opts.sort && allowedSorts[opts.sort]) || 'p.nr ASC';

  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  // Count
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM pendenzen p WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Data
  const dataResult = await pool.query<PendenzWithNames>(
    `${SELECT_WITH_NAMES} WHERE ${whereClause} ORDER BY ${orderBy} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return { data: dataResult.rows, total, limit, offset };
}

export async function updatePendenz(
  id: string,
  data: UpdatePendenzDTO
): Promise<PendenzWithNames | null> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  const mappings: [keyof UpdatePendenzDTO, string][] = [
    ['beschreibung', 'beschreibung'],
    ['bereich', 'bereich'],
    ['verantwortlich_id', 'verantwortlich_id'],
    ['prioritaet', 'prioritaet'],
    ['status', 'status'],
    ['faellig_bis', 'faellig_bis'],
    ['erledigt_am', 'erledigt_am'],
    ['bemerkungen', 'bemerkungen'],
    ['auftragsnummer', 'auftragsnummer'],
    ['kategorie', 'kategorie'],
  ];

  for (const [key, col] of mappings) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${paramIdx}`);
      params.push(data[key]);
      paramIdx++;
    }
  }

  // Auto-set erledigt_am when status changes to erledigt
  if (data.status === 'erledigt' && data.erledigt_am === undefined) {
    fields.push(`erledigt_am = CURRENT_DATE`);
  }

  // Clear erledigt_am when status changes away from erledigt
  if (data.status && data.status !== 'erledigt' && data.erledigt_am === undefined) {
    fields.push(`erledigt_am = NULL`);
  }

  if (fields.length === 0) {
    return getPendenzById(id);
  }

  const result = await pool.query<Pendenz>(
    `UPDATE pendenzen SET ${fields.join(', ')} WHERE id = $${paramIdx} AND archived_at IS NULL RETURNING *`,
    [...params, id]
  );

  if (result.rowCount === 0) return null;

  return getPendenzById(id);
}

export async function archivePendenz(id: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE pendenzen SET archived_at = NOW() WHERE id = $1 AND archived_at IS NULL`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Historie ──────────────────────────────────────────

export async function createHistorieEntry(data: {
  pendenzId: string;
  userId: string | null;
  aktion: string;
  feld?: string | null;
  alterWert?: string | null;
  neuerWert?: string | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO pendenzen_historie (pendenz_id, user_id, aktion, feld, alter_wert, neuer_wert)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.pendenzId,
      data.userId,
      data.aktion,
      data.feld ?? null,
      data.alterWert ?? null,
      data.neuerWert ?? null,
    ]
  );
}

export async function getHistorie(pendenzId: string): Promise<PendenzHistorie[]> {
  const result = await pool.query<PendenzHistorie>(
    `SELECT * FROM pendenzen_historie WHERE pendenz_id = $1 ORDER BY created_at DESC`,
    [pendenzId]
  );
  return result.rows;
}

/**
 * Track field-level changes between old and new pendenz state.
 */
export function detectChanges(
  before: Pendenz,
  after: Pendenz
): Array<{ feld: string; alterWert: string | null; neuerWert: string | null }> {
  const changes: Array<{ feld: string; alterWert: string | null; neuerWert: string | null }> = [];

  const trackedFields: (keyof Pendenz)[] = [
    'beschreibung',
    'bereich',
    'verantwortlich_id',
    'prioritaet',
    'status',
    'faellig_bis',
    'erledigt_am',
    'bemerkungen',
    'auftragsnummer',
    'kategorie',
  ];

  for (const feld of trackedFields) {
    const oldVal = before[feld];
    const newVal = after[feld];
    if (String(oldVal ?? '') !== String(newVal ?? '')) {
      changes.push({
        feld,
        alterWert: oldVal != null ? String(oldVal) : null,
        neuerWert: newVal != null ? String(newVal) : null,
      });
    }
  }

  return changes;
}
