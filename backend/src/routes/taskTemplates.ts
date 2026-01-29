import { Router } from 'express';
import * as taskTemplateController from '../controllers/taskTemplateController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { createTaskTemplateValidator, updateTaskTemplateValidator } from '../validators/taskTemplateValidator';

const router = Router();

// All routes require auth
router.use(requireUserId);
router.use(loadUser);

router.get('/', taskTemplateController.list);
router.get('/:id', taskTemplateController.getById);
router.post('/', createTaskTemplateValidator, taskTemplateController.create);
router.put('/:id', updateTaskTemplateValidator, taskTemplateController.update);
router.delete('/:id', taskTemplateController.remove);

export default router;
