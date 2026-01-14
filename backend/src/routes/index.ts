import { Router } from 'express';
import appointmentsRouter from './appointments';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'IntelliPlan API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/appointments', appointmentsRouter);

export default router;
