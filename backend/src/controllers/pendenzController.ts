import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  archivePendenz,
  createHistorieEntry,
  createPendenz,
  detectChanges,
  getHistorie,
  getPendenzById,
  listPendenzen,
  updatePendenz,
} from '../services/pendenzService';
import { getProjectById } from '../services/projectService';
import { toPendenzHistorieResponse, toPendenzResponse } from '../models/pendenz';
import type { Pendenz } from '../models/pendenz';

const getUserId = (req: Request): string | null => {
  if (!req.user) return null;
  return req.user.id;
};

// ─── List pendenzen for a project ──────────────────────

export async function listByProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const projectId = req.params.projectId as string;
    const project = await getProjectById(projectId, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const { status, verantwortlich, bereich, ueberfaellig, sort, limit, offset } = req.query;

    const result = await listPendenzen({
      projectId,
      status: status as string | undefined,
      verantwortlichId: verantwortlich as string | undefined,
      bereich: bereich as string | undefined,
      ueberfaellig: ueberfaellig === 'true',
      sort: sort as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.data.map(toPendenzResponse),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ─── Get single pendenz ────────────────────────────────

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const pendenz = await getPendenzById(req.params.id as string);
    if (!pendenz || pendenz.archived_at) {
      res.status(404).json({ success: false, error: 'Pendenz not found' });
      return;
    }

    res.status(200).json({ success: true, data: toPendenzResponse(pendenz) });
  } catch (error) {
    next(error);
  }
}

// ─── Create pendenz ────────────────────────────────────

export async function createInProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const projectId = req.params.projectId as string;
    const project = await getProjectById(projectId, userId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const {
      beschreibung,
      bereich,
      verantwortlichId,
      prioritaet,
      faelligBis,
      bemerkungen,
      auftragsnummer,
      kategorie,
    } = req.body;

    const pendenz = await createPendenz({
      project_id: projectId,
      erfasst_von_id: userId,
      beschreibung,
      bereich,
      verantwortlich_id: verantwortlichId ?? null,
      prioritaet,
      faellig_bis: faelligBis ?? null,
      bemerkungen: bemerkungen ?? null,
      auftragsnummer: auftragsnummer ?? null,
      kategorie,
    });

    // Log creation in historie
    await createHistorieEntry({
      pendenzId: pendenz.id,
      userId,
      aktion: 'erstellt',
    });

    res.status(201).json({ success: true, data: toPendenzResponse(pendenz) });
  } catch (error) {
    next(error);
  }
}

// ─── Update pendenz ────────────────────────────────────

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const existing = await getPendenzById(req.params.id as string);
    if (!existing || existing.archived_at) {
      res.status(404).json({ success: false, error: 'Pendenz not found' });
      return;
    }

    const {
      beschreibung,
      bereich,
      verantwortlichId,
      prioritaet,
      status,
      faelligBis,
      erledigtAm,
      bemerkungen,
      auftragsnummer,
      kategorie,
    } = req.body;

    const updated = await updatePendenz(req.params.id as string, {
      beschreibung,
      bereich,
      verantwortlich_id: verantwortlichId,
      prioritaet,
      status,
      faellig_bis: faelligBis,
      erledigt_am: erledigtAm,
      bemerkungen,
      auftragsnummer,
      kategorie,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Pendenz not found' });
      return;
    }

    // Detect and log changes
    const changes = detectChanges(existing as Pendenz, updated as Pendenz);
    const aktion = changes.some(c => c.feld === 'status') ? 'status_geaendert' : 'aktualisiert';

    for (const change of changes) {
      await createHistorieEntry({
        pendenzId: updated.id,
        userId,
        aktion,
        feld: change.feld,
        alterWert: change.alterWert,
        neuerWert: change.neuerWert,
      });
    }

    res.status(200).json({ success: true, data: toPendenzResponse(updated) });
  } catch (error) {
    next(error);
  }
}

// ─── Archive (soft delete) pendenz ─────────────────────

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const existing = await getPendenzById(req.params.id as string);
    if (!existing || existing.archived_at) {
      res.status(404).json({ success: false, error: 'Pendenz not found' });
      return;
    }

    const archived = await archivePendenz(req.params.id as string);
    if (!archived) {
      res.status(404).json({ success: false, error: 'Pendenz not found' });
      return;
    }

    await createHistorieEntry({
      pendenzId: existing.id,
      userId,
      aktion: 'archiviert',
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ─── Get historie for a pendenz ────────────────────────

export async function listHistorie(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    const pendenz = await getPendenzById(req.params.id as string);
    if (!pendenz) {
      res.status(404).json({ success: false, error: 'Pendenz not found' });
      return;
    }

    const historie = await getHistorie(req.params.id as string);

    res.status(200).json({
      success: true,
      data: historie.map(toPendenzHistorieResponse),
    });
  } catch (error) {
    next(error);
  }
}
