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
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login', authLimiter, loginValidator, authController.login);
router.post('/verify', verifyEmailValidator, authController.verifyEmail);
router.post('/password-reset', authLimiter, requestPasswordResetValidator, authController.requestPasswordReset);
router.post('/password-reset/confirm', authLimiter, resetPasswordValidator, authController.resetPassword);
router.get('/me', requireUserId, authController.getCurrentUser);
router.post('/logout', requireUserId, authController.logout);
router.put('/profile', requireUserId, updateProfileValidator, authController.updateProfile);

export default router;
