import { Router } from 'express';
import * as industryController from '../controllers/industryController';
import { requirePermission } from '../middleware/roleMiddleware';
import { createIndustryValidator, updateIndustryValidator } from '../validators/industryValidator';

const router = Router();

// Public: list and get (templates are reference data)
router.get('/', industryController.list);
router.get('/:id', industryController.getById);

// Protected: mutations
router.post('/', requirePermission('templates:write'), createIndustryValidator, industryController.create);
router.put('/:id', requirePermission('templates:write'), updateIndustryValidator, industryController.update);
router.delete('/:id', requirePermission('templates:delete'), industryController.remove);

export default router;
