import { Router } from 'express';
import * as reminderController from '../controllers/reminderController';
import { createReminderValidator } from '../validators/reminderValidator';
import { requireUserId } from '../middleware/roleMiddleware';

const router = Router();

router.use(requireUserId);

router.post('/', createReminderValidator, reminderController.create);
router.get('/upcoming', reminderController.getUpcoming);
router.put('/:id/dismiss', reminderController.dismiss);
router.delete('/:id', reminderController.remove);

export default router;
