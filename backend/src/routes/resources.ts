import { Router } from 'express';
import * as resourceController from '../controllers/resourceController';
import * as taskAssignmentController from '../controllers/taskAssignmentController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { createResourceValidator, updateResourceValidator } from '../validators/resourceValidator';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

router.get('/', resourceController.list);
router.post('/', createResourceValidator, resourceController.create);
router.get('/:id', resourceController.getById);
router.put('/:id', updateResourceValidator, resourceController.update);
router.delete('/:id', resourceController.remove);

// Resource assignments (capacity check)
router.get('/:resourceId/assignments', taskAssignmentController.listByResource);

export default router;
