import { body, ValidationChain } from 'express-validator';

export const createWorkingTimeTemplateValidator: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 100 })
    .withMessage('name must be less than 100 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be boolean'),
  body('slots')
    .isArray({ min: 1 })
    .withMessage('slots must be a non-empty array'),
  body('slots.*.dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday)'),
  body('slots.*.startTime')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('startTime must be in HH:MM format'),
  body('slots.*.endTime')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('endTime must be in HH:MM format'),
];

export const updateWorkingTimeTemplateValidator: ValidationChain[] = [
  ...createWorkingTimeTemplateValidator,
];
