import { Router } from 'express';
import * as resourceController from '../controllers/resourceController';
import { requirePermission } from '../middleware/roleMiddleware';
import { createResourceValidator, updateResourceValidator } from '../validators/resourceValidator';

const router = Router();

// Read routes
router.get('/', requirePermission('resources:read'), resourceController.list);
router.get('/:id', requirePermission('resources:read'), resourceController.getById);

// Write routes
router.post('/', requirePermission('resources:write'), createResourceValidator, resourceController.create);
router.put('/:id', requirePermission('resources:write'), updateResourceValidator, resourceController.update);

// Delete routes
router.delete('/:id', requirePermission('resources:delete'), resourceController.remove);

export default router;
