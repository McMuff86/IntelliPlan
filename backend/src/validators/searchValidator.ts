import { query, type ValidationChain } from 'express-validator';

const paginationValidators: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

const textSearchValidator: ValidationChain = query('q')
  .optional()
  .trim()
  .isLength({ max: 500 })
  .withMessage('Search query must be less than 500 characters');

export const searchAppointmentsValidator: ValidationChain[] = [
  textSearchValidator,

  query('from')
    .optional()
    .isISO8601()
    .withMessage('from must be a valid ISO 8601 date'),

  query('to')
    .optional()
    .isISO8601()
    .withMessage('to must be a valid ISO 8601 date'),

  ...paginationValidators,
];

export const searchProjectsValidator: ValidationChain[] = [
  textSearchValidator,

  query('status')
    .optional()
    .isIn(['active', 'completed', 'archived'])
    .withMessage('Status must be one of: active, completed, archived'),

  ...paginationValidators,
];

export const searchTasksValidator: ValidationChain[] = [
  textSearchValidator,

  query('projectId')
    .optional()
    .isUUID()
    .withMessage('projectId must be a valid UUID'),

  query('status')
    .optional()
    .isIn(['planned', 'in_progress', 'blocked', 'done'])
    .withMessage('Status must be one of: planned, in_progress, blocked, done'),

  ...paginationValidators,
];
