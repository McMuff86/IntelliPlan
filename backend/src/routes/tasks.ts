import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import {
  createDependencyValidator,
  createWorkSlotValidator,
  shiftTaskValidator,
  updateTaskValidator,
  updateWorkSlotReminderValidator,
} from '../validators/taskValidator';
import { searchTasksValidator } from '../validators/searchValidator';
import { searchTasksHandler } from '../controllers/searchController';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

router.get('/search', searchTasksValidator, searchTasksHandler);
router.get('/work-slots', taskController.listCalendarWorkSlots);
router.get('/:id', taskController.getById);
router.put('/:id', updateTaskValidator, taskController.update);
router.delete('/:id', taskController.remove);
router.post('/:id/shift', shiftTaskValidator, taskController.shiftSchedule);

router.get('/:id/dependencies', taskController.listTaskDependencies);
router.post('/:id/dependencies', createDependencyValidator, taskController.createTaskDependency);
router.delete('/:id/dependencies/:dependencyId', taskController.removeTaskDependency);

router.get('/:id/work-slots', taskController.listTaskWorkSlots);
router.post('/:id/work-slots', createWorkSlotValidator, taskController.createTaskWorkSlot);
router.delete('/:id/work-slots/:slotId', taskController.removeTaskWorkSlot);
router.put(
  '/:id/work-slots/:slotId/reminder',
  updateWorkSlotReminderValidator,
  taskController.updateTaskWorkSlotReminder
);

export default router;
