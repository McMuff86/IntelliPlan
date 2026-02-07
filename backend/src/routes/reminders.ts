import { Router } from 'express';
import * as reminderController from '../controllers/reminderController';
import { createReminderValidator } from '../validators/reminderValidator';
import { requirePermission } from '../middleware/roleMiddleware';

const router = Router();

// Read routes
router.get('/upcoming', requirePermission('reminders:read'), reminderController.getUpcoming);

// Write routes
router.post('/', requirePermission('reminders:write'), createReminderValidator, reminderController.create);
router.put('/:id/dismiss', requirePermission('reminders:write'), reminderController.dismiss);

// Delete routes
router.delete('/:id', requirePermission('reminders:delete'), reminderController.remove);

export default router;
