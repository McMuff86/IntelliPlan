import { Router } from 'express';
import * as workingTimeController from '../controllers/workingTimeController';
import { requirePermission } from '../middleware/roleMiddleware';
import {
  createWorkingTimeTemplateValidator,
  updateWorkingTimeTemplateValidator,
} from '../validators/workingTimeValidator';

const router = Router();

// Read routes
router.get('/', requirePermission('settings:read'), workingTimeController.list);
router.get('/:id', requirePermission('settings:read'), workingTimeController.getById);

// Write routes
router.post('/', requirePermission('settings:write'), createWorkingTimeTemplateValidator, workingTimeController.create);
router.post('/defaults', requirePermission('settings:write'), workingTimeController.createDefaults);
router.put('/:id', requirePermission('settings:write'), updateWorkingTimeTemplateValidator, workingTimeController.update);

// Delete routes
router.delete('/:id', requirePermission('settings:write'), workingTimeController.remove);

export default router;
