import { body, ValidationChain } from 'express-validator';

export const createProductTypeValidator: ValidationChain[] = [
  body('industryId')
    .notEmpty()
    .withMessage('Industry ID is required')
    .isUUID()
    .withMessage('Industry ID must be a valid UUID'),
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
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon must be less than 50 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
];

export const updateProductTypeValidator: ValidationChain[] = [
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
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Icon must be less than 50 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
];
