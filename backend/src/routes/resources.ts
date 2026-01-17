import { Router } from 'express';
import * as resourceController from '../controllers/resourceController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { createResourceValidator, updateResourceValidator } from '../validators/resourceValidator';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

router.get('/', resourceController.list);
router.post('/', createResourceValidator, resourceController.create);
router.get('/:id', resourceController.getById);
router.put('/:id', updateResourceValidator, resourceController.update);
router.delete('/:id', resourceController.remove);

export default router;
