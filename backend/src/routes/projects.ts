import { Router } from 'express';
import * as projectController from '../controllers/projectController';
import * as taskController from '../controllers/taskController';
import * as pendenzController from '../controllers/pendenzController';
import { loadUser, requirePermission } from '../middleware/roleMiddleware';
import { autoScheduleValidator, createProjectValidator, shiftProjectValidator, updateProjectValidator } from '../validators/projectValidator';
import { createTaskValidator } from '../validators/taskValidator';
import { createPendenzValidator, listPendenzenQueryValidator } from '../validators/pendenzValidator';
import { searchProjectsValidator } from '../validators/searchValidator';
import { searchProjectsHandler } from '../controllers/searchController';

const router = Router();

// Read routes
router.get('/search', requirePermission('projects:read'), searchProjectsValidator, searchProjectsHandler);
router.get('/trash', requirePermission('projects:read'), projectController.listTrash);
router.get('/', requirePermission('projects:read'), projectController.list);
router.get('/:id', requirePermission('projects:read'), projectController.getById);
router.get('/:id/activity', requirePermission('projects:read'), projectController.listActivity);

// Write routes
router.post('/', requirePermission('projects:write'), createProjectValidator, projectController.create);
router.put('/:id', requirePermission('projects:write'), updateProjectValidator, projectController.update);
router.post('/:id/restore', requirePermission('projects:write'), projectController.restore);
router.post('/:id/shift', requirePermission('projects:write'), shiftProjectValidator, projectController.shiftSchedule);
router.post('/:id/apply-template', requirePermission('projects:write'), projectController.applyTemplate);
router.post('/:id/reset-template', requirePermission('projects:write'), projectController.resetProjectToTemplate);
router.post('/:id/auto-schedule', requirePermission('projects:write'), autoScheduleValidator, projectController.autoSchedule);

// Delete routes
router.delete('/:id', requirePermission('projects:delete'), projectController.remove);
router.delete('/:id/permanent', requirePermission('projects:delete'), projectController.permanentRemove);

// Tasks (project-scoped)
router.get('/:projectId/tasks', requirePermission('tasks:read'), taskController.listByProject);
router.post('/:projectId/tasks', requirePermission('tasks:write'), createTaskValidator, taskController.createInProject);

// Pendenzen (project-scoped)
router.get('/:projectId/pendenzen', requirePermission('pendenzen:read'), listPendenzenQueryValidator, pendenzController.listByProject);
router.post('/:projectId/pendenzen', requirePermission('pendenzen:write'), createPendenzValidator, pendenzController.createInProject);

export default router;
