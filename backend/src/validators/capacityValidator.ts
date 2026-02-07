import { query, param, type ValidationChain } from 'express-validator';
import { VALID_DEPARTMENTS } from '../models/resource';

export const capacityQueryValidator: ValidationChain[] = [
  query('from')
    .notEmpty()
    .withMessage('from is required')
    .isISO8601()
    .withMessage('from must be a valid ISO 8601 date (YYYY-MM-DD)'),
  query('to')
    .notEmpty()
    .withMessage('to is required')
    .isISO8601()
    .withMessage('to must be a valid ISO 8601 date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query?.from && value < req.query.from) {
        throw new Error('to must be on or after from');
      }
      // Max range: 31 days
      if (req.query?.from) {
        const fromDate = new Date(req.query.from as string);
        const toDate = new Date(value);
        const diffDays = Math.ceil(
          (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays > 31) {
          throw new Error('Date range must not exceed 31 days');
        }
      }
      return true;
    }),
];

export const capacityDepartmentValidator: ValidationChain[] = [
  ...capacityQueryValidator,
  param('dept')
    .notEmpty()
    .withMessage('department is required')
    .isIn(VALID_DEPARTMENTS)
    .withMessage(`department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
];

export const capacityResourceValidator: ValidationChain[] = [
  ...capacityQueryValidator,
  param('id')
    .notEmpty()
    .withMessage('resource id is required')
    .isUUID()
    .withMessage('resource id must be a valid UUID'),
];
