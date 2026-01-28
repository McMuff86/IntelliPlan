import { body, ValidationChain } from 'express-validator';

const templateValues = ['weekday_8_17', 'weekday_8_17_with_weekends', 'custom'];

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
];

export const shiftProjectValidator: ValidationChain[] = [
  body('deltaDays')
    .notEmpty()
    .withMessage('deltaDays is required')
    .isInt({ min: -3650, max: 3650 })
    .withMessage('deltaDays must be an integer between -3650 and 3650'),
];
