import { pool } from '../config/database';
import { getTaskTemplateById } from './taskTemplateService';
import type { TemplateTask } from '../models/taskTemplate';
import type { Task } from '../models/task';

export async function applyTemplateToProject(
  projectId: string,
  templateId: string,
  ownerId: string
): Promise<Task[]> {
  const template = await getTaskTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const templateTasks: TemplateTask[] = template.tasks;
  if (!templateTasks || templateTasks.length === 0) {
    return [];
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Map template task IDs to real task IDs
    const templateIdToRealId = new Map<string, string>();
    const createdTasks: Task[] = [];

    // Create all tasks first
    for (const tt of templateTasks) {
      const durationMinutes = tt.estimatedDuration
        ? tt.durationUnit === 'days'
          ? Math.round(tt.estimatedDuration * 8 * 60) // 8h workday
          : Math.round(tt.estimatedDuration * 60)
        : null;

      const result = await client.query<Task>(
        `INSERT INTO tasks (project_id, owner_id, title, description, status, scheduling_mode, duration_minutes)
         VALUES ($1, $2, $3, $4, 'planned', 'manual', $5)
         RETURNING *`,
        [projectId, ownerId, tt.name, tt.description || null, durationMinutes]
      );

      const task = result.rows[0];
      templateIdToRealId.set(tt.id, task.id);
      createdTasks.push(task);
    }

    // Create dependencies
    for (const tt of templateTasks) {
      if (tt.dependsOn && tt.dependsOn.length > 0) {
        const realTaskId = templateIdToRealId.get(tt.id);
        if (!realTaskId) continue;

        for (const depId of tt.dependsOn) {
          const realDepId = templateIdToRealId.get(depId);
          if (!realDepId) continue;

          await client.query(
            `INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
             VALUES ($1, $2, 'finish_start')`,
            [realTaskId, realDepId]
          );
        }
      }
    }

    await client.query('COMMIT');
    return createdTasks;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
