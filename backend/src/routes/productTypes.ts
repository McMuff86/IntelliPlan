import { Router } from 'express';
import * as productTypeController from '../controllers/productTypeController';
import { requirePermission } from '../middleware/roleMiddleware';
import { createProductTypeValidator, updateProductTypeValidator } from '../validators/productTypeValidator';

const router = Router();

// Public: list and get (templates are reference data)
router.get('/', productTypeController.list);
router.get('/:id', productTypeController.getById);

// Protected: mutations
router.post('/', requirePermission('templates:write'), createProductTypeValidator, productTypeController.create);
router.put('/:id', requirePermission('templates:write'), updateProductTypeValidator, productTypeController.update);
router.delete('/:id', requirePermission('templates:delete'), productTypeController.remove);

export default router;
