import { Router } from 'express';
import * as workingTimeController from '../controllers/workingTimeController';
import { requireUserId } from '../middleware/roleMiddleware';
import {
  createWorkingTimeTemplateValidator,
  updateWorkingTimeTemplateValidator,
} from '../validators/workingTimeValidator';

const router = Router();

router.use(requireUserId);

router.get('/', workingTimeController.list);
router.post('/', createWorkingTimeTemplateValidator, workingTimeController.create);
router.post('/defaults', workingTimeController.createDefaults);
router.get('/:id', workingTimeController.getById);
router.put('/:id', updateWorkingTimeTemplateValidator, workingTimeController.update);
router.delete('/:id', workingTimeController.remove);

export default router;
