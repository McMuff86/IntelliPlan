import { pool } from '../config/database';
import logger from '../config/logger';

interface CliOptions {
  ownerId: string;
  execute: boolean;
  clearTaskWeeks: boolean;
}

function usage(): string {
  return [
    'Usage:',
    '  ts-node src/scripts/resetWochenplanData.ts --owner-id <uuid> [--execute] [--keep-task-weeks]',
    '',
    'Flags:',
    '  --owner-id <uuid>     Required tenant owner_id',
    '  --execute             Apply changes (without this flag: dry-run only)',
    '  --keep-task-weeks     Keep tasks.planned_week/planned_year untouched',
  ].join('\n');
}

function parseArgs(argv: string[]): CliOptions {
  let ownerId = '';
  let execute = false;
  let clearTaskWeeks = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--execute') {
      execute = true;
      continue;
    }
    if (arg === '--keep-task-weeks') {
      clearTaskWeeks = false;
      continue;
    }
    if (arg === '--owner-id' && i + 1 < argv.length) {
      ownerId = argv[i + 1];
      i++;
      continue;
    }
    if (arg.startsWith('--owner-id=')) {
      ownerId = arg.slice('--owner-id='.length);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
  }

  if (!ownerId) {
    throw new Error(`Missing required argument --owner-id\n\n${usage()}`);
  }

  return { ownerId, execute, clearTaskWeeks };
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const assignmentCountResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM task_assignments ta
       JOIN tasks t ON t.id = ta.task_id
       WHERE t.owner_id = $1
         AND t.deleted_at IS NULL
         AND ta.deleted_at IS NULL`,
      [options.ownerId]
    );

    const phaseCountResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM task_phase_schedules tps
       JOIN tasks t ON t.id = tps.task_id
       WHERE t.owner_id = $1
         AND t.deleted_at IS NULL`,
      [options.ownerId]
    );

    const plannedTasksCountResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM tasks
       WHERE owner_id = $1
         AND deleted_at IS NULL
         AND (planned_week IS NOT NULL OR planned_year IS NOT NULL)`,
      [options.ownerId]
    );

    const preview = {
      ownerId: options.ownerId,
      assignmentsToSoftDelete: parseInt(assignmentCountResult.rows[0].count, 10),
      phaseSchedulesToDelete: parseInt(phaseCountResult.rows[0].count, 10),
      tasksWithWeekPlanning: parseInt(plannedTasksCountResult.rows[0].count, 10),
      clearTaskWeeks: options.clearTaskWeeks,
      mode: options.execute ? 'execute' : 'dry-run',
    };

    logger.info(preview, 'Wochenplan reset preview');

    if (!options.execute) {
      logger.info('Dry-run complete. Re-run with --execute to apply changes.');
      return;
    }

    await client.query('BEGIN');
    inTransaction = true;

    const softDeleteAssignmentsResult = await client.query(
      `UPDATE task_assignments ta
       SET deleted_at = NOW(), updated_at = NOW()
       FROM tasks t
       WHERE ta.task_id = t.id
         AND t.owner_id = $1
         AND t.deleted_at IS NULL
         AND ta.deleted_at IS NULL`,
      [options.ownerId]
    );

    const deletePhaseSchedulesResult = await client.query(
      `DELETE FROM task_phase_schedules tps
       USING tasks t
       WHERE tps.task_id = t.id
         AND t.owner_id = $1
         AND t.deleted_at IS NULL`,
      [options.ownerId]
    );

    let clearTaskWeeksCount = 0;
    if (options.clearTaskWeeks) {
      const clearTaskWeeksResult = await client.query(
        `UPDATE tasks
         SET planned_week = NULL,
             planned_year = NULL,
             updated_at = NOW()
         WHERE owner_id = $1
           AND deleted_at IS NULL
           AND (planned_week IS NOT NULL OR planned_year IS NOT NULL)`,
        [options.ownerId]
      );
      clearTaskWeeksCount = clearTaskWeeksResult.rowCount ?? 0;
    }

    await client.query('COMMIT');
    inTransaction = false;

    logger.info(
      {
        ownerId: options.ownerId,
        assignmentsSoftDeleted: softDeleteAssignmentsResult.rowCount ?? 0,
        phaseSchedulesDeleted: deletePhaseSchedulesResult.rowCount ?? 0,
        tasksWeekPlanningCleared: clearTaskWeeksCount,
      },
      'Wochenplan reset executed successfully'
    );
  } catch (error) {
    if (inTransaction) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ err: error }, 'Wochenplan reset failed');
    process.exit(1);
  });
