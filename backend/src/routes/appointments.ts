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
import { loadUser, requireUserId } from '../middleware/roleMiddleware';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

router.get('/search', searchAppointmentsValidator, searchAppointmentsHandler);
router.get('/', appointmentController.list);
router.get('/:id/reminders', reminderController.getForAppointment);
router.get('/:id', appointmentController.getById);
router.post('/', createAppointmentValidator, appointmentController.create);
router.post('/reverse-plan', reversePlanValidator, appointmentController.reversePlan);
router.put('/:id', updateAppointmentValidator, appointmentController.update);
router.delete('/:id', appointmentController.remove);

export default router;
