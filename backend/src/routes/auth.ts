import { Router } from 'express';
import * as authController from '../controllers/authController';
import {
  loginValidator,
  registerValidator,
  verifyEmailValidator,
  requestPasswordResetValidator,
  resetPasswordValidator,
} from '../validators/authValidator';

const router = Router();

router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/verify', verifyEmailValidator, authController.verifyEmail);
router.post('/password-reset', requestPasswordResetValidator, authController.requestPasswordReset);
router.post('/password-reset/confirm', resetPasswordValidator, authController.resetPassword);

export default router;
