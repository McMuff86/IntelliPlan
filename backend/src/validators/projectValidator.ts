import { body, ValidationChain } from 'express-validator';

export const createProjectValidator: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('includeWeekends')
    .optional()
    .isBoolean()
    .withMessage('includeWeekends must be boolean'),
  body('workdayStart')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayStart must be in HH:MM format'),
  body('workdayEnd')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayEnd must be in HH:MM format'),
];

export const updateProjectValidator: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('includeWeekends')
    .optional()
    .isBoolean()
    .withMessage('includeWeekends must be boolean'),
  body('workdayStart')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayStart must be in HH:MM format'),
  body('workdayEnd')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayEnd must be in HH:MM format'),
];
