import { body, ValidationChain } from 'express-validator';
import { VALID_DEPARTMENTS, VALID_EMPLOYEE_TYPES, VALID_WORK_ROLES } from '../models/resource';

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
  body('department')
    .optional({ values: 'null' })
    .isIn(VALID_DEPARTMENTS)
    .withMessage(`department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
  body('employeeType')
    .optional({ values: 'null' })
    .isIn(VALID_EMPLOYEE_TYPES)
    .withMessage(`employeeType must be one of: ${VALID_EMPLOYEE_TYPES.join(', ')}`),
  body('shortCode')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('shortCode must be less than 20 characters'),
  body('defaultLocation')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('defaultLocation must be less than 200 characters'),
  body('weeklyHours')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 168 })
    .withMessage('weeklyHours must be between 0 and 168'),
  body('workRole')
    .optional({ values: 'null' })
    .isIn(VALID_WORK_ROLES)
    .withMessage(`workRole must be one of: ${VALID_WORK_ROLES.join(', ')}`),
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
  body('department')
    .optional({ values: 'null' })
    .isIn(VALID_DEPARTMENTS)
    .withMessage(`department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
  body('employeeType')
    .optional({ values: 'null' })
    .isIn(VALID_EMPLOYEE_TYPES)
    .withMessage(`employeeType must be one of: ${VALID_EMPLOYEE_TYPES.join(', ')}`),
  body('shortCode')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('shortCode must be less than 20 characters'),
  body('defaultLocation')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('defaultLocation must be less than 200 characters'),
  body('weeklyHours')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 168 })
    .withMessage('weeklyHours must be between 0 and 168'),
  body('workRole')
    .optional({ values: 'null' })
    .isIn(VALID_WORK_ROLES)
    .withMessage(`workRole must be one of: ${VALID_WORK_ROLES.join(', ')}`),
];
