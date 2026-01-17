import { body, ValidationChain } from 'express-validator';

const statusValues = ['planned', 'in_progress', 'blocked', 'done'];
const schedulingValues = ['manual', 'auto'];
const dependencyValues = ['finish_start', 'start_start', 'finish_finish'];

export const createTaskValidator: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('status')
    .optional()
    .isIn(statusValues)
    .withMessage(`Status must be one of: ${statusValues.join(', ')}`),
  body('schedulingMode')
    .optional()
    .isIn(schedulingValues)
    .withMessage(`schedulingMode must be one of: ${schedulingValues.join(', ')}`),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('durationMinutes must be a positive integer'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be ISO 8601'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('dueDate must be ISO 8601'),
];

export const updateTaskValidator: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('status')
    .optional()
    .isIn(statusValues)
    .withMessage(`Status must be one of: ${statusValues.join(', ')}`),
  body('schedulingMode')
    .optional()
    .isIn(schedulingValues)
    .withMessage(`schedulingMode must be one of: ${schedulingValues.join(', ')}`),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('durationMinutes must be a positive integer'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be ISO 8601'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('dueDate must be ISO 8601'),
];

export const createDependencyValidator: ValidationChain[] = [
  body('dependsOnTaskId')
    .notEmpty()
    .withMessage('dependsOnTaskId is required')
    .isUUID()
    .withMessage('dependsOnTaskId must be a valid UUID'),
  body('dependencyType')
    .notEmpty()
    .withMessage('dependencyType is required')
    .isIn(dependencyValues)
    .withMessage(`dependencyType must be one of: ${dependencyValues.join(', ')}`),
];

export const createWorkSlotValidator: ValidationChain[] = [
  body('startTime')
    .notEmpty()
    .withMessage('startTime is required')
    .isISO8601()
    .withMessage('startTime must be ISO 8601'),
  body('endTime')
    .notEmpty()
    .withMessage('endTime is required')
    .isISO8601()
    .withMessage('endTime must be ISO 8601'),
  body('isFixed')
    .optional()
    .isBoolean()
    .withMessage('isFixed must be boolean'),
];
