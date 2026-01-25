import { body, ValidationChain } from 'express-validator';

export const registerValidator: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 255 })
    .withMessage('name must be less than 255 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('email must be a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('timezone must be less than 100 characters'),
];

export const loginValidator: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('email must be a valid email'),
  body('password')
    .notEmpty()
    .withMessage('password is required'),
];

export const verifyEmailValidator: ValidationChain[] = [
  body('token')
    .optional()
    .notEmpty()
    .withMessage('token is required'),
];

export const requestPasswordResetValidator: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('email must be a valid email'),
];

export const resetPasswordValidator: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
];

export const updateProfileValidator: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('name must be less than 255 characters'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('timezone must be less than 100 characters'),
];
