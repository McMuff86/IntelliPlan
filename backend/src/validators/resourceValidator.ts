import { body, ValidationChain } from 'express-validator';

const resourceTypes = ['person', 'machine', 'vehicle'];

export const createResourceValidator: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: 255 })
    .withMessage('name must be less than 255 characters'),
  body('resourceType')
    .notEmpty()
    .withMessage('resourceType is required')
    .isIn(resourceTypes)
    .withMessage(`resourceType must be one of: ${resourceTypes.join(', ')}`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('description must be less than 5000 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
  body('availabilityEnabled')
    .optional()
    .isBoolean()
    .withMessage('availabilityEnabled must be boolean'),
];

export const updateResourceValidator: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('name must be less than 255 characters'),
  body('resourceType')
    .optional()
    .isIn(resourceTypes)
    .withMessage(`resourceType must be one of: ${resourceTypes.join(', ')}`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('description must be less than 5000 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
  body('availabilityEnabled')
    .optional()
    .isBoolean()
    .withMessage('availabilityEnabled must be boolean'),
];
