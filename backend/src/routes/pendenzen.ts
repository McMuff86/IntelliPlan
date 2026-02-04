import { Router } from 'express';
import * as pendenzController from '../controllers/pendenzController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import {
  createPendenzValidator,
  updatePendenzValidator,
  listPendenzenQueryValidator,
} from '../validators/pendenzValidator';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

// Single pendenz operations (by id)
router.get('/:id', pendenzController.getById);
router.patch('/:id', updatePendenzValidator, pendenzController.update);
router.delete('/:id', pendenzController.remove);
router.get('/:id/historie', pendenzController.listHistorie);

export default router;

// Project-scoped routes are registered in routes/projects.ts
// GET  /api/projects/:projectId/pendenzen
// POST /api/projects/:projectId/pendenzen
