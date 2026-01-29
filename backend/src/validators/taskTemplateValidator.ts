import { body, ValidationChain } from 'express-validator';

const taskCategories = [
  'planning', 'procurement', 'production', 'treatment',
  'assembly', 'delivery', 'approval', 'documentation',
];

const tasksArrayValidation: ValidationChain[] = [
  body('tasks')
    .isArray({ min: 1 })
    .withMessage('Tasks must be a non-empty array'),
  body('tasks.*.id')
    .trim()
    .notEmpty()
    .withMessage('Each task must have an id'),
  body('tasks.*.order')
    .isInt({ min: 1 })
    .withMessage('Each task must have an order >= 1'),
  body('tasks.*.name')
    .trim()
    .notEmpty()
    .withMessage('Each task must have a name')
    .isLength({ max: 255 })
    .withMessage('Task name must be less than 255 characters'),
  body('tasks.*.durationUnit')
    .isIn(['hours', 'days'])
    .withMessage('durationUnit must be "hours" or "days"'),
  body('tasks.*.category')
    .isIn(taskCategories)
    .withMessage(`category must be one of: ${taskCategories.join(', ')}`),
  body('tasks.*.isOptional')
    .isBoolean()
    .withMessage('isOptional must be boolean'),
  body('tasks.*.estimatedDuration')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('estimatedDuration must be a positive number'),
  body('tasks.*.dependsOn')
    .optional()
    .isArray()
    .withMessage('dependsOn must be an array'),
  body('tasks.*.checklistItems')
    .optional()
    .isArray()
    .withMessage('checklistItems must be an array'),
];

export const createTaskTemplateValidator: ValidationChain[] = [
  body('productTypeId')
    .notEmpty()
    .withMessage('Product type ID is required')
    .isUUID()
    .withMessage('Product type ID must be a valid UUID'),
  body('name')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be boolean'),
  ...tasksArrayValidation,
];

export const updateTaskTemplateValidator: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be boolean'),
  body('tasks')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Tasks must be a non-empty array'),
  body('tasks.*.id')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Each task must have an id'),
  body('tasks.*.order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each task must have an order >= 1'),
  body('tasks.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Each task must have a name'),
  body('tasks.*.durationUnit')
    .optional()
    .isIn(['hours', 'days'])
    .withMessage('durationUnit must be "hours" or "days"'),
  body('tasks.*.category')
    .optional()
    .isIn(taskCategories)
    .withMessage(`category must be one of: ${taskCategories.join(', ')}`),
  body('tasks.*.isOptional')
    .optional()
    .isBoolean()
    .withMessage('isOptional must be boolean'),
];
