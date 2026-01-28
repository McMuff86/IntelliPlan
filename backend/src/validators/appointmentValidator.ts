import { body, ValidationChain } from 'express-validator';

export const createAppointmentValidator: ValidationChain[] = [
  body('title')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),

  body('description')
    .optional()
    .trim()
    // No .escape() — description may contain markdown
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),

  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),

  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date')
    .custom((endTime, { req }) => {
      const startTime = new Date(req.body.startTime);
      const end = new Date(endTime);
      if (end <= startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),

  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Timezone must be less than 100 characters'),
];

export const updateAppointmentValidator: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),

  body('description')
    .optional()
    .trim()
    // No .escape() — description may contain markdown
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),

  body('startTime').optional().isISO8601().withMessage('Start time must be a valid ISO 8601 date'),

  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date')
    .custom((endTime, { req }) => {
      const startTime = req.body.startTime;
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end <= start) {
          throw new Error('End time must be after start time');
        }
      }
      return true;
    }),

  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Timezone must be less than 100 characters'),
];

export const reversePlanValidator: ValidationChain[] = [
  body('endDate')
    .notEmpty()
    .withMessage('endDate is required')
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  body('tasks').isArray({ min: 1 }).withMessage('tasks must be a non-empty array'),
  body('tasks.*.title')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('task title is required')
    .isLength({ max: 255 })
    .withMessage('task title must be less than 255 characters'),
  body('tasks.*.durationMinutes')
    .notEmpty()
    .withMessage('durationMinutes is required')
    .isInt({ min: 1 })
    .withMessage('durationMinutes must be a positive integer'),
  body('tasks.*.resourceId').optional().isUUID().withMessage('resourceId must be a valid UUID'),
  body('tasks.*.resourceLabel')
    .optional()
    .isLength({ max: 255 })
    .withMessage('resourceLabel must be less than 255 characters'),
  body('includeWeekends').optional().isBoolean().withMessage('includeWeekends must be boolean'),
  body('workdayStart')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayStart must be in HH:MM format'),
  body('workdayEnd')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('workdayEnd must be in HH:MM format'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('timezone must be less than 100 characters'),
  body('resources').optional().isArray().withMessage('resources must be an array'),
];
