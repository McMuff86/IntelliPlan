import { Router } from 'express';
import * as projectController from '../controllers/projectController';
import * as taskController from '../controllers/taskController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { createProjectValidator, shiftProjectValidator, updateProjectValidator } from '../validators/projectValidator';
import { createTaskValidator } from '../validators/taskValidator';
import { searchProjectsValidator } from '../validators/searchValidator';
import { searchProjectsHandler } from '../controllers/searchController';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

router.get('/search', searchProjectsValidator, searchProjectsHandler);
router.get('/', projectController.list);
router.post('/', createProjectValidator, projectController.create);
router.get('/:id', projectController.getById);
router.put('/:id', updateProjectValidator, projectController.update);
router.delete('/:id', projectController.remove);
router.post('/:id/shift', shiftProjectValidator, projectController.shiftSchedule);
router.get('/:id/activity', projectController.listActivity);
router.post('/:id/apply-template', projectController.applyTemplate);
router.post('/:id/reset-template', projectController.resetProjectToTemplate);

router.get('/:projectId/tasks', taskController.listByProject);
router.post('/:projectId/tasks', createTaskValidator, taskController.createInProject);

export default router;
