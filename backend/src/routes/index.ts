import { Router } from 'express';
import appointmentsRouter from './appointments';
import projectsRouter from './projects';
import tasksRouter from './tasks';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'IntelliPlan API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/appointments', appointmentsRouter);
router.use('/projects', projectsRouter);
router.use('/tasks', tasksRouter);

export default router;
