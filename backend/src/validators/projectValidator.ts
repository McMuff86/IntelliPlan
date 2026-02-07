import { body, ValidationChain } from 'express-validator';

const templateValues = ['weekday_8_17', 'weekday_8_17_with_weekends', 'custom'];

// Shared validators for Wochenplan-specific project fields (migration 035)
const wochenplanFieldValidators: ValidationChain[] = [
  body('orderNumber')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('orderNumber must be less than 50 characters'),
  body('customerName')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('customerName must be less than 200 characters'),
  body('installationLocation')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('installationLocation must be less than 200 characters'),
  body('color')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('color must be less than 100 characters'),
  body('contactName')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('contactName must be less than 200 characters'),
  body('contactPhone')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('contactPhone must be less than 50 characters'),
  body('needsCallback')
    .optional()
    .isBoolean()
    .withMessage('needsCallback must be boolean'),
  body('sachbearbeiter')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('sachbearbeiter must be less than 20 characters'),
  body('workerCount')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('workerCount must be a number >= 0'),
  body('helperCount')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('helperCount must be a number >= 0'),
  body('remarks')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 10000 })
    .withMessage('remarks must be less than 10000 characters'),
];

export const createProjectValidator: ValidationChain[] = [
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
    // No .escape() — description may contain markdown
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('includeWeekends').optional().isBoolean().withMessage('includeWeekends must be boolean'),
  body('workdayStart')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayStart must be in HH:MM format'),
  body('workdayEnd')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayEnd must be in HH:MM format'),
  body('workTemplate')
    .optional()
    .isIn(templateValues)
    .withMessage(`workTemplate must be one of: ${templateValues.join(', ')}`),
  body('taskTemplateId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('taskTemplateId must be a valid UUID'),
  ...wochenplanFieldValidators,
];

export const updateProjectValidator: ValidationChain[] = [
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
    // No .escape() — description may contain markdown
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('includeWeekends').optional().isBoolean().withMessage('includeWeekends must be boolean'),
  body('workdayStart')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayStart must be in HH:MM format'),
  body('workdayEnd')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayEnd must be in HH:MM format'),
  body('workTemplate')
    .optional()
    .isIn(templateValues)
    .withMessage(`workTemplate must be one of: ${templateValues.join(', ')}`),
  ...wochenplanFieldValidators,
];

export const autoScheduleValidator: ValidationChain[] = [
  body('taskIds')
    .isArray({ min: 1 })
    .withMessage('taskIds must be a non-empty array'),
  body('taskIds.*')
    .isUUID()
    .withMessage('Each taskId must be a valid UUID'),
  body('endDate')
    .notEmpty()
    .withMessage('endDate is required')
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
];

export const shiftProjectValidator: ValidationChain[] = [
  body('deltaDays')
    .notEmpty()
    .withMessage('deltaDays is required')
    .isInt({ min: -3650, max: 3650 })
    .withMessage('deltaDays must be an integer between -3650 and 3650'),
];
