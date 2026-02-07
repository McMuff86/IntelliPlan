import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { loadUser, requirePermission } from '../middleware/roleMiddleware';
import {
  createDependencyValidator,
  createWorkSlotValidator,
  shiftTaskValidator,
  updateTaskValidator,
  updateWorkSlotReminderValidator,
} from '../validators/taskValidator';
import { searchTasksValidator } from '../validators/searchValidator';
import { searchTasksHandler } from '../controllers/searchController';
import * as taskAssignmentController from '../controllers/taskAssignmentController';
import { createTaskAssignmentValidator } from '../validators/taskAssignmentValidator';

const router = Router();

// Read routes
router.get('/search', requirePermission('tasks:read'), searchTasksValidator, searchTasksHandler);
router.get('/work-slots', requirePermission('tasks:read'), taskController.listCalendarWorkSlots);
router.get('/:id', requirePermission('tasks:read'), taskController.getById);

// Write routes
router.put('/:id', requirePermission('tasks:write'), updateTaskValidator, taskController.update);
router.post('/:id/shift', requirePermission('tasks:write'), shiftTaskValidator, taskController.shiftSchedule);

// Delete routes
router.delete('/:id', requirePermission('tasks:delete'), taskController.remove);

// Dependencies
router.get('/:id/dependencies', requirePermission('tasks:read'), taskController.listTaskDependencies);
router.post('/:id/dependencies', requirePermission('tasks:write'), createDependencyValidator, taskController.createTaskDependency);
router.delete('/:id/dependencies/:dependencyId', requirePermission('tasks:write'), taskController.removeTaskDependency);

// Work slots
router.get('/:id/work-slots', requirePermission('tasks:read'), taskController.listTaskWorkSlots);
router.post('/:id/work-slots', requirePermission('tasks:write'), createWorkSlotValidator, taskController.createTaskWorkSlot);
router.delete('/:id/work-slots/:slotId', requirePermission('tasks:write'), taskController.removeTaskWorkSlot);
router.put(
  '/:id/work-slots/:slotId/reminder',
  requirePermission('tasks:write'),
  updateWorkSlotReminderValidator,
  taskController.updateTaskWorkSlotReminder
);

// Task assignments
router.get('/:taskId/assignments', requirePermission('tasks:read'), taskAssignmentController.listByTask);
router.post('/:taskId/assignments', requirePermission('tasks:write'), createTaskAssignmentValidator, taskAssignmentController.createForTask);

export default router;
