import { body, query, param, type ValidationChain } from 'express-validator';
import { VALID_DEPARTMENTS } from '../models/resource';
import { VALID_STATUS_CODES } from '../models/taskAssignment';

const halfDayValues = ['morning', 'afternoon', 'full_day'];

// ─── Shared KW/Year validators ─────────────────────────

const kwValidator = (field: 'query' | 'body' = 'query') => {
  const fn = field === 'query' ? query : body;
  return [
    fn('kw')
      .optional()
      .isInt({ min: 1, max: 53 })
      .withMessage('kw must be between 1 and 53')
      .toInt(),
    fn('year')
      .optional()
      .isInt({ min: 2020, max: 2099 })
      .withMessage('year must be between 2020 and 2099')
      .toInt(),
  ];
};

// ─── 3.1 Conflict Detection ───────────────────────────

export const conflictsValidator: ValidationChain[] = [
  query('kw')
    .notEmpty()
    .withMessage('kw is required')
    .isInt({ min: 1, max: 53 })
    .withMessage('kw must be between 1 and 53')
    .toInt(),
  query('year')
    .notEmpty()
    .withMessage('year is required')
    .isInt({ min: 2020, max: 2099 })
    .withMessage('year must be between 2020 and 2099')
    .toInt(),
];

// ─── 3.2 Quick-Assign Batch ──────────────────────────

export const quickAssignValidator: ValidationChain[] = [
  body('assignments')
    .isArray({ min: 1, max: 100 })
    .withMessage('assignments must be an array with 1-100 items'),
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
  body('assignments.*.date')
    .notEmpty()
    .withMessage('date is required')
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date'),
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
  body('assignments.*.notes')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be less than 2000 characters'),
];

// ─── 3.3 Copy-Week ───────────────────────────────────

export const copyWeekValidator: ValidationChain[] = [
  body('sourceKw')
    .notEmpty()
    .withMessage('sourceKw is required')
    .isInt({ min: 1, max: 53 })
    .withMessage('sourceKw must be between 1 and 53')
    .toInt(),
  body('sourceYear')
    .notEmpty()
    .withMessage('sourceYear is required')
    .isInt({ min: 2020, max: 2099 })
    .withMessage('sourceYear must be between 2020 and 2099')
    .toInt(),
  body('targetKw')
    .notEmpty()
    .withMessage('targetKw is required')
    .isInt({ min: 1, max: 53 })
    .withMessage('targetKw must be between 1 and 53')
    .toInt(),
  body('targetYear')
    .notEmpty()
    .withMessage('targetYear is required')
    .isInt({ min: 2020, max: 2099 })
    .withMessage('targetYear must be between 2020 and 2099')
    .toInt(),
  body('options')
    .optional()
    .isObject()
    .withMessage('options must be an object'),
  body('options.includeAssignments')
    .optional()
    .isBoolean()
    .withMessage('options.includeAssignments must be boolean'),
];

// ─── 3.4 Unassigned Tasks ────────────────────────────

export const unassignedValidator: ValidationChain[] = [
  query('kw')
    .notEmpty()
    .withMessage('kw is required')
    .isInt({ min: 1, max: 53 })
    .withMessage('kw must be between 1 and 53')
    .toInt(),
  query('year')
    .notEmpty()
    .withMessage('year is required')
    .isInt({ min: 2020, max: 2099 })
    .withMessage('year must be between 2020 and 2099')
    .toInt(),
];

// ─── 3.5 KW-Phase-Matrix ────────────────────────────

export const phaseMatrixValidator: ValidationChain[] = [
  query('from_kw')
    .notEmpty()
    .withMessage('from_kw is required')
    .isInt({ min: 1, max: 53 })
    .withMessage('from_kw must be between 1 and 53')
    .toInt(),
  query('to_kw')
    .notEmpty()
    .withMessage('to_kw is required')
    .isInt({ min: 1, max: 53 })
    .withMessage('to_kw must be between 1 and 53')
    .toInt()
    .custom((value, { req }) => {
      const fromKw = parseInt(req.query?.from_kw as string, 10);
      if (value < fromKw) {
        throw new Error('to_kw must be >= from_kw');
      }
      if (value - fromKw > 26) {
        throw new Error('KW range must not exceed 26 weeks');
      }
      return true;
    }),
  query('year')
    .notEmpty()
    .withMessage('year is required')
    .isInt({ min: 2020, max: 2099 })
    .withMessage('year must be between 2020 and 2099')
    .toInt(),
];

// ─── 4.1 Resource Weekly Schedule ────────────────────

export const resourceScheduleValidator: ValidationChain[] = [
  param('resourceId')
    .notEmpty()
    .withMessage('resourceId is required')
    .isUUID()
    .withMessage('resourceId must be a valid UUID'),
  query('kw')
    .notEmpty()
    .withMessage('kw is required')
    .isInt({ min: 1, max: 53 })
    .withMessage('kw must be between 1 and 53')
    .toInt(),
  query('year')
    .notEmpty()
    .withMessage('year is required')
    .isInt({ min: 2020, max: 2099 })
    .withMessage('year must be between 2020 and 2099')
    .toInt(),
];

// ─── 4.2 All-Resources Week Overview ─────────────────

export const resourcesOverviewValidator: ValidationChain[] = [
  query('kw')
    .notEmpty()
    .withMessage('kw is required')
    .isInt({ min: 1, max: 53 })
    .withMessage('kw must be between 1 and 53')
    .toInt(),
  query('year')
    .notEmpty()
    .withMessage('year is required')
    .isInt({ min: 2020, max: 2099 })
    .withMessage('year must be between 2020 and 2099')
    .toInt(),
  query('department')
    .optional()
    .isIn(VALID_DEPARTMENTS)
    .withMessage(`department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
];
