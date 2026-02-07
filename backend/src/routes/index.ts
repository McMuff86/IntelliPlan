import { Router } from 'express';
import { pool } from '../config/database';
import appointmentsRouter from './appointments';
import authRouter from './auth';
import projectsRouter from './projects';
import tasksRouter from './tasks';
import resourcesRouter from './resources';
import remindersRouter from './reminders';
import workingTimeTemplatesRouter from './workingTimeTemplates';
import industriesRouter from './industries';
import productTypesRouter from './productTypes';
import taskTemplatesRouter from './taskTemplates';
import pendenzenRouter from './pendenzen';
import taskAssignmentsRouter from './taskAssignments';
import wochenplanRouter from './wochenplan';
import capacityRouter from './capacity';
import importRouter from './import';
import exportRouter from './export';

const router = Router();

router.get('/health', async (_req, res) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart, error: (err as Error).message };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    status: allHealthy ? 'healthy' : 'degraded',
    version: process.env.npm_package_version || '0.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  });
});

router.use('/auth', authRouter);
router.use('/appointments', appointmentsRouter);
router.use('/projects', projectsRouter);
router.use('/tasks', tasksRouter);
router.use('/resources', resourcesRouter);
router.use('/reminders', remindersRouter);
router.use('/working-time-templates', workingTimeTemplatesRouter);
router.use('/industries', industriesRouter);
router.use('/product-types', productTypesRouter);
router.use('/task-templates', taskTemplatesRouter);
router.use('/pendenzen', pendenzenRouter);
router.use('/assignments', taskAssignmentsRouter);
router.use('/wochenplan', wochenplanRouter);
router.use('/capacity', capacityRouter);
router.use('/import', importRouter);
router.use('/export', exportRouter);

export default router;
