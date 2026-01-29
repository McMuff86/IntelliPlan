import { Router } from 'express';
import * as industryController from '../controllers/industryController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { createIndustryValidator, updateIndustryValidator } from '../validators/industryValidator';

const router = Router();

// Public: list and get
router.get('/', industryController.list);
router.get('/:id', industryController.getById);

// Protected: mutations
router.post('/', requireUserId, loadUser, createIndustryValidator, industryController.create);
router.put('/:id', requireUserId, loadUser, updateIndustryValidator, industryController.update);
router.delete('/:id', requireUserId, loadUser, industryController.remove);

export default router;
