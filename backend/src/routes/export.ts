import { Router } from 'express';
import { query } from 'express-validator';
import * as exportController from '../controllers/exportController';
import { loadUser, requireUserId } from '../middleware/roleMiddleware';
import { VALID_DEPARTMENTS } from '../models/resource';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

const exportCSVValidator = [
  query('kw')
    .optional()
    .isInt({ min: 1, max: 53 })
    .withMessage('kw must be an integer between 1 and 53'),
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .withMessage('year must be an integer between 2020 and 2100'),
  query('department')
    .optional()
    .isIn(VALID_DEPARTMENTS)
    .withMessage(`department must be one of: ${VALID_DEPARTMENTS.join(', ')}`),
];

router.get('/wochenplan/csv', exportCSVValidator, exportController.exportCSV);

export default router;
