import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController';
import {
  createAppointmentValidator,
  reversePlanValidator,
  updateAppointmentValidator,
} from '../validators/appointmentValidator';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

router.get('/', appointmentController.list);
router.get('/:id', appointmentController.getById);
router.post('/', createAppointmentValidator, appointmentController.create);
router.post('/reverse-plan', reversePlanValidator, appointmentController.reversePlan);
router.put('/:id', updateAppointmentValidator, appointmentController.update);
router.delete('/:id', appointmentController.remove);

export default router;
