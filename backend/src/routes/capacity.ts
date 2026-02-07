import { Router } from 'express';
import * as capacityController from '../controllers/capacityController';
import {
  capacityQueryValidator,
  capacityDepartmentValidator,
  capacityResourceValidator,
} from '../validators/capacityValidator';
import { requireUserId, loadUser } from '../middleware/roleMiddleware';

const router = Router();

router.use(requireUserId);
router.use(loadUser);

// GET /api/capacity?from=2026-02-09&to=2026-02-13
router.get(
  '/',
  capacityQueryValidator,
  capacityController.getCapacityOverview
);

// GET /api/capacity/department/:dept?from=...&to=...
router.get(
  '/department/:dept',
  capacityDepartmentValidator,
  capacityController.getDepartmentCapacity
);

// GET /api/capacity/resource/:id?from=...&to=...
router.get(
  '/resource/:id',
  capacityResourceValidator,
  capacityController.getResourceCapacity
);

export default router;
