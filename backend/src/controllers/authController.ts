import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createUser,
  getUserByEmail,
  getUserByEmailVerificationToken,
  getUserByPasswordResetToken,
  markUserEmailVerified,
  setPasswordResetToken,
  updateUserPassword,
} from '../services/userService';
import { generateToken, hashPassword, hashToken, signToken, verifyPassword } from '../services/authService';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import { toUserResponse } from '../models/user';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';
const EMAIL_VERIFY_BYPASS = process.env.EMAIL_VERIFY_BYPASS === 'true';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { name, email, password, timezone } = req.body;
    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const rawVerificationToken = generateToken();
    const verificationToken = hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const verificationLink = `${APP_BASE_URL}/auth?action=verify&token=${rawVerificationToken}`;
    const user = await createUser({
      name,
      email,
      role: 'single',
      timezone: timezone || 'UTC',
      password_hash: passwordHash,
      email_verification_token: verificationToken,
      email_verification_expires_at: verificationExpiresAt,
      email_verified_at: EMAIL_VERIFY_BYPASS ? new Date() : null,
    });

    if (!EMAIL_VERIFY_BYPASS) {
      const emailSent = await sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationLink,
      });

      if (!emailSent) {
        console.log(`Verify email: ${verificationLink}`);
      }
    }

    const token = EMAIL_VERIFY_BYPASS ? signToken(user.id) : null;
    res.status(201).json({
      success: true,
      data: {
        token,
        user: toUserResponse(user),
        verificationLink: EMAIL_VERIFY_BYPASS ? undefined : verificationLink,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user || !user.password_hash) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }
    if (!user.email_verified_at && !EMAIL_VERIFY_BYPASS) {
      res.status(403).json({ success: false, error: 'Email not verified' });
      return;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = signToken(user.id);
    res.status(200).json({
      success: true,
      data: {
        token,
        user: toUserResponse(user),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = (req.body.token || req.query.token) as string | undefined;
    if (!rawToken) {
      res.status(400).json({ success: false, error: 'Token is required' });
      return;
    }

    const token = hashToken(rawToken);
    const user = await getUserByEmailVerificationToken(token);
    if (!user) {
      res.status(400).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    await markUserEmailVerified(user.id);
    res.status(200).json({ success: true, data: { message: 'Email verified' } });
  } catch (error) {
    next(error);
  }
}

export async function requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    const user = await getUserByEmail(email);
    if (user) {
      const rawToken = generateToken();
      const token = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const resetLink = `${APP_BASE_URL}/auth?action=reset&token=${rawToken}`;
      await setPasswordResetToken(user.id, token, expiresAt);
      const emailSent = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink,
      });

      if (!emailSent) {
        console.log(`Password reset: ${resetLink}`);
      }
    }

    res.status(200).json({ success: true, data: { message: 'If the email exists, a reset link was sent.' } });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ success: false, error: 'Token and password are required' });
      return;
    }

    const hashedToken = hashToken(token);
    const user = await getUserByPasswordResetToken(hashedToken);
    if (!user) {
      res.status(400).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    const passwordHash = await hashPassword(password);
    await updateUserPassword(user.id, passwordHash);
    res.status(200).json({ success: true, data: { message: 'Password updated' } });
  } catch (error) {
    next(error);
  }
}
