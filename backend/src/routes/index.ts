import { Router } from 'express';
import appointmentsRouter from './appointments';
import authRouter from './auth';
import projectsRouter from './projects';
import tasksRouter from './tasks';
import resourcesRouter from './resources';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'IntelliPlan API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRouter);
router.use('/appointments', appointmentsRouter);
router.use('/projects', projectsRouter);
router.use('/tasks', tasksRouter);
router.use('/resources', resourcesRouter);

export default router;
