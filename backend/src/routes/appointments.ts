import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController';
import * as reminderController from '../controllers/reminderController';
import {
  createAppointmentValidator,
  reversePlanValidator,
  updateAppointmentValidator,
} from '../validators/appointmentValidator';
import { searchAppointmentsValidator } from '../validators/searchValidator';
import { searchAppointmentsHandler } from '../controllers/searchController';
import { loadUser, requirePermission } from '../middleware/roleMiddleware';

const router = Router();

// Read routes
router.get('/search', requirePermission('appointments:read'), searchAppointmentsValidator, searchAppointmentsHandler);
router.get('/', requirePermission('appointments:read'), appointmentController.list);
router.get('/:id/reminders', requirePermission('appointments:read'), reminderController.getForAppointment);
router.get('/:id', requirePermission('appointments:read'), appointmentController.getById);

// Write routes
router.post('/', requirePermission('appointments:write'), createAppointmentValidator, appointmentController.create);
router.post('/reverse-plan', requirePermission('appointments:write'), reversePlanValidator, appointmentController.reversePlan);
router.put('/:id', requirePermission('appointments:write'), updateAppointmentValidator, appointmentController.update);

// Delete routes
router.delete('/:id', requirePermission('appointments:delete'), appointmentController.remove);

export default router;
