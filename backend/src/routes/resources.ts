import { Router } from 'express';
import { query } from 'express-validator';
import * as resourceController from '../controllers/resourceController';
import * as taskAssignmentController from '../controllers/taskAssignmentController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { createResourceValidator, updateResourceValidator } from '../validators/resourceValidator';
import { VALID_DEPARTMENTS, VALID_EMPLOYEE_TYPES } from '../models/resource';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

const listResourcesQueryValidator = [
  query('department')
    .optional()
    .isIn(VALID_DEPARTMENTS)
    .withMessage(`department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
  query('employee_type')
    .optional()
    .isIn(VALID_EMPLOYEE_TYPES)
    .withMessage(`employee_type must be one of: ${VALID_EMPLOYEE_TYPES.join(', ')}`),
  query('active')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('active must be true or false'),
  query('resource_type')
    .optional()
    .isIn(['person', 'machine', 'vehicle'])
    .withMessage('resource_type must be one of: person, machine, vehicle'),
];

const availableResourcesQueryValidator = [
  query('date')
    .notEmpty()
    .withMessage('date is required')
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date'),
  query('half_day')
    .optional()
    .isIn(['morning', 'afternoon', 'full_day'])
    .withMessage('half_day must be one of: morning, afternoon, full_day'),
];

router.get('/available', availableResourcesQueryValidator, resourceController.available);
router.get('/', listResourcesQueryValidator, resourceController.list);
router.post('/', createResourceValidator, resourceController.create);
router.get('/:id', resourceController.getById);
router.put('/:id', updateResourceValidator, resourceController.update);
router.delete('/:id', resourceController.remove);

// Resource assignments (capacity check)
router.get('/:resourceId/assignments', taskAssignmentController.listByResource);

export default router;
