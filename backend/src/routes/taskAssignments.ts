import { Router } from 'express';
import * as taskAssignmentController from '../controllers/taskAssignmentController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import {
  updateTaskAssignmentValidator,
  listAssignmentsQueryValidator,
} from '../validators/taskAssignmentValidator';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

// Global assignment queries
router.get('/', listAssignmentsQueryValidator, taskAssignmentController.list);
router.get('/:id', taskAssignmentController.getById);
router.put('/:id', updateTaskAssignmentValidator, taskAssignmentController.update);
router.delete('/:id', taskAssignmentController.remove);

export default router;

// Task-scoped routes are registered in routes/tasks.ts:
// GET  /api/tasks/:taskId/assignments
// POST /api/tasks/:taskId/assignments

// Resource-scoped routes are registered in routes/resources.ts:
// GET  /api/resources/:resourceId/assignments?from=...&to=...
