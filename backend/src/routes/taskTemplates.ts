import { Router } from 'express';
import * as taskTemplateController from '../controllers/taskTemplateController';
import { requirePermission } from '../middleware/roleMiddleware';
import { createTaskTemplateValidator, updateTaskTemplateValidator } from '../validators/taskTemplateValidator';

const router = Router();

// Read routes
router.get('/', requirePermission('templates:read'), taskTemplateController.list);
router.get('/:id', requirePermission('templates:read'), taskTemplateController.getById);

// Write routes
router.post('/', requirePermission('templates:write'), createTaskTemplateValidator, taskTemplateController.create);
router.put('/:id', requirePermission('templates:write'), updateTaskTemplateValidator, taskTemplateController.update);

// Delete routes
router.delete('/:id', requirePermission('templates:delete'), taskTemplateController.remove);

export default router;
