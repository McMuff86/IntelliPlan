import { body, query, ValidationChain } from 'express-validator';
import { VALID_STATUS_CODES } from '../models/taskAssignment';

const halfDayValues = ['morning', 'afternoon', 'full_day'];

export const createTaskAssignmentValidator: ValidationChain[] = [
  body('resourceId')
    .notEmpty()
    .withMessage('resourceId is required')
    .isUUID()
    .withMessage('resourceId must be a valid UUID'),
  body('assignmentDate')
    .notEmpty()
    .withMessage('assignmentDate is required')
    .isISO8601()
    .withMessage('assignmentDate must be a valid ISO 8601 date'),
  body('halfDay')
    .notEmpty()
    .withMessage('halfDay is required')
    .isIn(halfDayValues)
    .withMessage(`halfDay must be one of: ${halfDayValues.join(', ')}`),
  body('notes')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be less than 2000 characters'),
  body('isFixed')
    .optional()
    .isBoolean()
    .withMessage('isFixed must be boolean'),
  body('startTime')
    .optional({ values: 'null' })
    .matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .withMessage('startTime must be a valid time (HH:MM or HH:MM:SS)'),
  body('statusCode')
    .optional()
    .isIn(VALID_STATUS_CODES)
    .withMessage(`statusCode must be one of: ${VALID_STATUS_CODES.join(', ')}`),
];

export const updateTaskAssignmentValidator: ValidationChain[] = [
  body('resourceId')
    .optional()
    .isUUID()
    .withMessage('resourceId must be a valid UUID'),
  body('assignmentDate')
    .optional()
    .isISO8601()
    .withMessage('assignmentDate must be a valid ISO 8601 date'),
  body('halfDay')
    .optional()
    .isIn(halfDayValues)
    .withMessage(`halfDay must be one of: ${halfDayValues.join(', ')}`),
  body('notes')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be less than 2000 characters'),
  body('isFixed')
    .optional()
    .isBoolean()
    .withMessage('isFixed must be boolean'),
  body('startTime')
    .optional({ values: 'null' })
    .matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .withMessage('startTime must be a valid time (HH:MM or HH:MM:SS)'),
  body('statusCode')
    .optional()
    .isIn(VALID_STATUS_CODES)
    .withMessage(`statusCode must be one of: ${VALID_STATUS_CODES.join(', ')}`),
];

export const listAssignmentsQueryValidator: ValidationChain[] = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('from must be a valid ISO 8601 date'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('to must be a valid ISO 8601 date'),
  query('resource_id')
    .optional()
    .isUUID()
    .withMessage('resource_id must be a valid UUID'),
  query('status_code')
    .optional()
    .isIn(VALID_STATUS_CODES)
    .withMessage(`status_code must be one of: ${VALID_STATUS_CODES.join(', ')}`),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('limit must be between 1 and 500'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be >= 0'),
];

export const bulkAssignmentValidator: ValidationChain[] = [
  body('assignments')
    .isArray({ min: 1, max: 50 })
    .withMessage('assignments must be an array with 1-50 items'),
  body('assignments.*.taskId')
    .notEmpty()
    .withMessage('taskId is required')
    .isUUID()
    .withMessage('taskId must be a valid UUID'),
  body('assignments.*.resourceId')
    .notEmpty()
    .withMessage('resourceId is required')
    .isUUID()
    .withMessage('resourceId must be a valid UUID'),
  body('assignments.*.dates')
    .isArray({ min: 1, max: 31 })
    .withMessage('dates must be an array with 1-31 items'),
  body('assignments.*.dates.*')
    .isISO8601()
    .withMessage('each date must be a valid ISO 8601 date'),
  body('assignments.*.halfDay')
    .notEmpty()
    .withMessage('halfDay is required')
    .isIn(halfDayValues)
    .withMessage(`halfDay must be one of: ${halfDayValues.join(', ')}`),
  body('assignments.*.isFixed')
    .optional()
    .isBoolean()
    .withMessage('isFixed must be boolean'),
  body('assignments.*.statusCode')
    .optional()
    .isIn(VALID_STATUS_CODES)
    .withMessage(`statusCode must be one of: ${VALID_STATUS_CODES.join(', ')}`),
];
