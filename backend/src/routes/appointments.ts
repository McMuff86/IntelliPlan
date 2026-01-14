import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController';
import { createAppointmentValidator } from '../validators/appointmentValidator';

const router = Router();

router.get('/', appointmentController.list);
router.get('/:id', appointmentController.getById);
router.post('/', createAppointmentValidator, appointmentController.create);

export default router;
