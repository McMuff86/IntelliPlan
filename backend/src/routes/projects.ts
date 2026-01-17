import { Router } from 'express';
import * as projectController from '../controllers/projectController';
import * as taskController from '../controllers/taskController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { createProjectValidator, updateProjectValidator } from '../validators/projectValidator';
import { createTaskValidator } from '../validators/taskValidator';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

router.get('/', projectController.list);
router.post('/', createProjectValidator, projectController.create);
router.get('/:id', projectController.getById);
router.put('/:id', updateProjectValidator, projectController.update);
router.delete('/:id', projectController.remove);

router.get('/:projectId/tasks', taskController.listByProject);
router.post('/:projectId/tasks', createTaskValidator, taskController.createInProject);

export default router;
