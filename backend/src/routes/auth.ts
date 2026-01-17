import { Router } from 'express';
import * as authController from '../controllers/authController';
import { loginValidator, registerValidator } from '../validators/authValidator';

const router = Router();

router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);

export default router;
