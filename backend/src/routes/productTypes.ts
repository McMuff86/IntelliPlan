import { Router } from 'express';
import * as productTypeController from '../controllers/productTypeController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { createProductTypeValidator, updateProductTypeValidator } from '../validators/productTypeValidator';

const router = Router();

// Public: list and get
router.get('/', productTypeController.list);
router.get('/:id', productTypeController.getById);

// Protected: mutations
router.post('/', requireUserId, loadUser, createProductTypeValidator, productTypeController.create);
router.put('/:id', requireUserId, loadUser, updateProductTypeValidator, productTypeController.update);
router.delete('/:id', requireUserId, loadUser, productTypeController.remove);

export default router;
