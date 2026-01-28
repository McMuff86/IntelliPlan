import { body, ValidationChain } from 'express-validator';

export const createReminderValidator: ValidationChain[] = [
  body('appointmentId')
    .notEmpty()
    .withMessage('Appointment ID is required')
    .isUUID()
    .withMessage('Appointment ID must be a valid UUID'),

  body('offsetMinutes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset minutes must be a non-negative integer'),

  body('remindAt')
    .optional()
    .isISO8601()
    .withMessage('remindAt must be a valid ISO 8601 date'),
];
