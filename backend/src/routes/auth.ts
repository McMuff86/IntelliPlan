import { Router } from 'express';
import * as authController from '../controllers/authController';
import {
  loginValidator,
  registerValidator,
  verifyEmailValidator,
  requestPasswordResetValidator,
  resetPasswordValidator,
  updateProfileValidator,
} from '../validators/authValidator';
import { requireUserId } from '../middleware/roleMiddleware';

const router = Router();

router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/verify', verifyEmailValidator, authController.verifyEmail);
router.post('/password-reset', requestPasswordResetValidator, authController.requestPasswordReset);
router.post('/password-reset/confirm', resetPasswordValidator, authController.resetPassword);
router.get('/me', requireUserId, authController.getCurrentUser);
router.post('/logout', requireUserId, authController.logout);
router.put('/profile', requireUserId, updateProfileValidator, authController.updateProfile);

export default router;
