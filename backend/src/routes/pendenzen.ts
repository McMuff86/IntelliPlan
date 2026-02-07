import { Router } from 'express';
import * as pendenzController from '../controllers/pendenzController';
import { requirePermission } from '../middleware/roleMiddleware';
import {
  createPendenzValidator,
  updatePendenzValidator,
  listPendenzenQueryValidator,
} from '../validators/pendenzValidator';

const router = Router();

// Single pendenz operations (by id)
router.get('/:id', requirePermission('pendenzen:read'), pendenzController.getById);
router.get('/:id/historie', requirePermission('pendenzen:read'), pendenzController.listHistorie);
router.patch('/:id', requirePermission('pendenzen:write'), updatePendenzValidator, pendenzController.update);
router.delete('/:id', requirePermission('pendenzen:delete'), pendenzController.remove);

export default router;

// Project-scoped routes are registered in routes/projects.ts
// GET  /api/projects/:projectId/pendenzen
// POST /api/projects/:projectId/pendenzen
