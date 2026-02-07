import { Router } from 'express';
import { query } from 'express-validator';
import * as wochenplanController from '../controllers/wochenplanController';
import { requireUserId, loadUser } from '../middleware/roleMiddleware';
import {
  conflictsValidator,
  quickAssignValidator,
  copyWeekValidator,
  unassignedValidator,
  phaseMatrixValidator,
  resourceScheduleValidator,
  resourcesOverviewValidator,
} from '../validators/wochenplanValidator';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

// ─── Existing: GET /api/wochenplan ──────────────────────
router.get(
  '/',
  [
    query('kw').optional().isInt({ min: 1, max: 53 }).withMessage('kw must be between 1 and 53'),
    query('year').optional().isInt({ min: 2020, max: 2099 }).withMessage('year must be between 2020 and 2099'),
  ],
  wochenplanController.getWochenplan
);

// ─── WP3: Intelligent KW-View API ──────────────────────

// 3.1 Conflict Detection
router.get('/conflicts', conflictsValidator, wochenplanController.getConflicts);

// 3.2 Quick-Assign Batch
router.post('/assign', quickAssignValidator, wochenplanController.assignBatch);

// 3.3 Copy-Week
router.post('/copy', copyWeekValidator, wochenplanController.copyWeekHandler);

// 3.4 Unassigned Tasks
router.get('/unassigned', unassignedValidator, wochenplanController.getUnassigned);

// 3.5 KW-Phase-Matrix
router.get('/phase-matrix', phaseMatrixValidator, wochenplanController.getPhaseMatrixHandler);

// ─── WP4: Mitarbeiter-View API ─────────────────────────

// 4.2 All-Resources Week Overview (must be BEFORE :resourceId to avoid conflict)
router.get('/resources', resourcesOverviewValidator, wochenplanController.getResourcesOverviewHandler);

// 4.1 Resource Weekly Schedule
router.get('/resource/:resourceId', resourceScheduleValidator, wochenplanController.getResourceScheduleHandler);

export default router;
