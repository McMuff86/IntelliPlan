import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createUser, getUserByEmail } from '../services/userService';
import { hashPassword, signToken, verifyPassword } from '../services/authService';
import { toUserResponse } from '../models/user';

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
    const user = await createUser({
      name,
      email,
      role: 'single',
      timezone: timezone || 'UTC',
      password_hash: passwordHash,
    });

    const token = signToken(user.id);
    res.status(201).json({
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
