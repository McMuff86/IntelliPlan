import { Router } from 'express';
import { query } from 'express-validator';
import * as wochenplanController from '../controllers/wochenplanController';
import { requireUserId, loadUser } from '../middleware/roleMiddleware';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

router.get(
  '/',
  [
    query('kw').optional().isInt({ min: 1, max: 53 }).withMessage('kw must be between 1 and 53'),
    query('year').optional().isInt({ min: 2020, max: 2099 }).withMessage('year must be between 2020 and 2099'),
  ],
  wochenplanController.getWochenplan
);

export default router;
