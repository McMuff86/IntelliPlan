import { body, ValidationChain } from 'express-validator';
import {
  VALID_PROJECT_PRIORITIES,
  VALID_PROJECT_RISK_LEVELS,
} from '../models/project';
import { VALID_PHASE_CODES } from '../models/task';
import {
  VALID_READINESS_CHECK_CODES,
  VALID_READINESS_STATUSES,
} from '../models/projectReadiness';

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
  body('targetEndDate')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('targetEndDate must be a valid ISO 8601 date'),
  body('priority')
    .optional()
    .isIn(VALID_PROJECT_PRIORITIES)
    .withMessage(`priority must be one of: ${VALID_PROJECT_PRIORITIES.join(', ')}`),
  body('riskLevel')
    .optional()
    .isIn(VALID_PROJECT_RISK_LEVELS)
    .withMessage(`riskLevel must be one of: ${VALID_PROJECT_RISK_LEVELS.join(', ')}`),
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

export const updateProjectPhasePlanValidator: ValidationChain[] = [
  body('phases')
    .isArray({ min: 1 })
    .withMessage('phases must be a non-empty array'),
  body('phases.*.phaseCode')
    .isIn(VALID_PHASE_CODES)
    .withMessage(`phaseCode must be one of: ${VALID_PHASE_CODES.join(', ')}`),
  body('phases.*.phaseLabel')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('phaseLabel must be between 1 and 255 characters'),
  body('phases.*.sequenceOrder')
    .isInt({ min: 1, max: 9999 })
    .withMessage('sequenceOrder must be an integer between 1 and 9999'),
  body('phases.*.isRequired')
    .optional()
    .isBoolean()
    .withMessage('isRequired must be boolean'),
  body('phases.*.isEnabled')
    .optional()
    .isBoolean()
    .withMessage('isEnabled must be boolean'),
  body('phases.*.estimatedHoursMin')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 999.9 })
    .withMessage('estimatedHoursMin must be between 0 and 999.9'),
  body('phases.*.estimatedHoursMax')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 999.9 })
    .withMessage('estimatedHoursMax must be between 0 and 999.9'),
  body('phases.*.dependencyPhaseCodes')
    .optional()
    .isArray()
    .withMessage('dependencyPhaseCodes must be an array'),
  body('phases.*.dependencyPhaseCodes.*')
    .optional()
    .isIn(VALID_PHASE_CODES)
    .withMessage(`dependencyPhaseCodes must contain valid phase codes: ${VALID_PHASE_CODES.join(', ')}`),
  body('phases.*.notes')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('notes must be less than 5000 characters'),
  body('phases')
    .custom((phases: Array<{ phaseCode: string; estimatedHoursMin?: unknown; estimatedHoursMax?: unknown }>) => {
      const phaseCodes = new Set<string>();
      for (const phase of phases) {
        if (phaseCodes.has(phase.phaseCode)) {
          throw new Error(`Duplicate phaseCode: ${phase.phaseCode}`);
        }
        phaseCodes.add(phase.phaseCode);

        const min =
          phase.estimatedHoursMin === undefined || phase.estimatedHoursMin === null
            ? null
            : Number(phase.estimatedHoursMin);
        const max =
          phase.estimatedHoursMax === undefined || phase.estimatedHoursMax === null
            ? null
            : Number(phase.estimatedHoursMax);

        if (
          min !== null &&
          max !== null &&
          !Number.isNaN(min) &&
          !Number.isNaN(max) &&
          min > max
        ) {
          throw new Error(`estimatedHoursMin must be <= estimatedHoursMax for ${phase.phaseCode}`);
        }
      }
      return true;
    }),
];

export const syncProjectPhasePlanValidator: ValidationChain[] = [
  body('replaceExistingPhaseTasks')
    .optional()
    .isBoolean()
    .withMessage('replaceExistingPhaseTasks must be boolean'),
];

export const updateProjectReadinessValidator: ValidationChain[] = [
  body('checks')
    .isArray({ min: 1 })
    .withMessage('checks must be a non-empty array'),
  body('checks.*.checkCode')
    .isIn(VALID_READINESS_CHECK_CODES)
    .withMessage(`checkCode must be one of: ${VALID_READINESS_CHECK_CODES.join(', ')}`),
  body('checks.*.status')
    .isIn(VALID_READINESS_STATUSES)
    .withMessage(`status must be one of: ${VALID_READINESS_STATUSES.join(', ')}`),
  body('checks.*.comment')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('comment must be less than 2000 characters'),
  body('checks.*.checkedAt')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('checkedAt must be a valid ISO 8601 date-time'),
  body('checks')
    .custom((checks: Array<{ checkCode: string }>) => {
      const uniqueCodes = new Set<string>();
      for (const check of checks) {
        if (uniqueCodes.has(check.checkCode)) {
          throw new Error(`Duplicate checkCode: ${check.checkCode}`);
        }
        uniqueCodes.add(check.checkCode);
      }
      return true;
    }),
];
