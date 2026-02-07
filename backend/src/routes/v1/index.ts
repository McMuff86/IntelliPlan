/**
 * API v1 Routes
 *
 * Re-exportiert alle aktuellen Routes unter dem /api/v1/ Prefix.
 * Dies ist der erste Schritt zur API-Versionierung.
 *
 * ## Aktuell
 * Alle Endpoints laufen unter `/api/v1/...`
 *
 * ## Wie v2 hinzugefügt wird
 *
 * 1. Erstelle `backend/src/routes/v2/index.ts`
 * 2. Kopiere nur die Routes die sich ändern
 * 3. In `backend/src/routes/index.ts`:
 *    ```ts
 *    import v1Router from './v1';
 *    import v2Router from './v2';
 *
 *    router.use('/v1', v1Router);
 *    router.use('/v2', v2Router);
 *    // Optional: latest alias
 *    router.use('/latest', v2Router);
 *    ```
 * 4. v1 bleibt für bestehende Clients erhalten (Deprecation-Header)
 * 5. v2 kann Breaking Changes einführen (neue DTOs, geänderte Responses)
 *
 * ## Versionierungs-Strategie
 *
 * - **URL-basiert:** `/api/v1/projects`, `/api/v2/projects`
 * - **Nicht Header-basiert** (einfacher zu testen, cachen, debuggen)
 * - **Additive Changes** (neue Felder, neue Endpoints) brauchen KEINE neue Version
 * - **Breaking Changes** (Felder entfernt, Response-Struktur geändert) → neue Version
 * - **Deprecation:** v1 bekommt `Sunset` Header, 6 Monate Übergangszeit
 */

import { Router } from 'express';
import appointmentsRouter from '../appointments';
import authRouter from '../auth';
import projectsRouter from '../projects';
import tasksRouter from '../tasks';
import resourcesRouter from '../resources';
import remindersRouter from '../reminders';
import workingTimeTemplatesRouter from '../workingTimeTemplates';
import industriesRouter from '../industries';
import productTypesRouter from '../productTypes';
import taskTemplatesRouter from '../taskTemplates';
import pendenzenRouter from '../pendenzen';
import taskAssignmentsRouter from '../taskAssignments';
import wochenplanRouter from '../wochenplan';

const v1Router = Router();

// Auth (no version prefix usually, but included for completeness)
v1Router.use('/auth', authRouter);

// Core entities
v1Router.use('/projects', projectsRouter);
v1Router.use('/tasks', tasksRouter);
v1Router.use('/resources', resourcesRouter);

// Wochenplan & Assignments
v1Router.use('/wochenplan', wochenplanRouter);
v1Router.use('/assignments', taskAssignmentsRouter);

// Supporting entities
v1Router.use('/appointments', appointmentsRouter);
v1Router.use('/reminders', remindersRouter);
v1Router.use('/pendenzen', pendenzenRouter);

// Configuration
v1Router.use('/working-time-templates', workingTimeTemplatesRouter);
v1Router.use('/industries', industriesRouter);
v1Router.use('/product-types', productTypesRouter);
v1Router.use('/task-templates', taskTemplatesRouter);

export default v1Router;
