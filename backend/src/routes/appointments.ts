import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController';
import { createAppointmentValidator, updateAppointmentValidator } from '../validators/appointmentValidator';

const router = Router();

router.get('/', appointmentController.list);
router.get('/:id', appointmentController.getById);
router.post('/', createAppointmentValidator, appointmentController.create);
router.put('/:id', updateAppointmentValidator, appointmentController.update);
router.delete('/:id', appointmentController.remove);

export default router;
