import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { loadUser } from '../middleware/roleMiddleware';
import { createDependencyValidator, createWorkSlotValidator, updateTaskValidator } from '../validators/taskValidator';

const router = Router();

router.use(loadUser);

router.get('/:id', taskController.getById);
router.put('/:id', updateTaskValidator, taskController.update);
router.delete('/:id', taskController.remove);

router.get('/:id/dependencies', taskController.listTaskDependencies);
router.post('/:id/dependencies', createDependencyValidator, taskController.createTaskDependency);
router.delete('/:id/dependencies/:dependencyId', taskController.removeTaskDependency);

router.get('/:id/work-slots', taskController.listTaskWorkSlots);
router.post('/:id/work-slots', createWorkSlotValidator, taskController.createTaskWorkSlot);
router.delete('/:id/work-slots/:slotId', taskController.removeTaskWorkSlot);

export default router;
