/**
 * EventBus – Simple in-process event system
 *
 * Provides a typed EventEmitter-based system for decoupling
 * service operations from side-effects (logging, notifications, etc.).
 *
 * ## Design Decisions
 * - In-process only (no Redis, no queues) – sufficient for current scale
 * - Synchronous-style API but handlers run async (fire-and-forget)
 * - Type-safe event definitions
 * - Subscriber pattern for later WebSocket integration
 *
 * ## Future: WebSocket Integration
 * When Socket.IO is added, a WebSocket subscriber can listen to events
 * and broadcast to connected clients:
 *
 * ```ts
 * eventBus.on('assignment.created', (payload) => {
 *   io.to(`tenant:${payload.tenantId}`).emit('assignment:created', payload);
 * });
 * ```
 *
 * ## Future: Queue Migration
 * If events need persistence/retry, the same API can be backed by
 * BullMQ or similar. Subscribers won't need to change.
 *
 * @example
 * ```ts
 * // In a service:
 * import { eventBus } from '../events/eventBus';
 *
 * async function createAssignment(data: CreateDTO) {
 *   const result = await pool.query(...);
 *   eventBus.emit('assignment.created', {
 *     assignmentId: result.rows[0].id,
 *     taskId: data.task_id,
 *     resourceId: data.resource_id,
 *     userId: currentUser.id,
 *   });
 *   return result.rows[0];
 * }
 *
 * // In a subscriber:
 * eventBus.on('assignment.created', async (payload) => {
 *   await activityService.log('assignment', 'created', payload);
 * });
 * ```
 */

import { EventEmitter } from 'events';
import logger from '../config/logger';

// ─── Event Definitions ─────────────────────────────────

export interface EventMap {
  // Task events
  'task.created': TaskEventPayload;
  'task.updated': TaskEventPayload & { changes: string[] };
  'task.deleted': TaskEventPayload;
  'task.statusChanged': TaskEventPayload & { fromStatus: string; toStatus: string };

  // Assignment events
  'assignment.created': AssignmentEventPayload;
  'assignment.updated': AssignmentEventPayload & { changes: string[] };
  'assignment.deleted': AssignmentEventPayload;
  'assignment.moved': AssignmentMovedPayload;

  // Project events
  'project.created': ProjectEventPayload;
  'project.updated': ProjectEventPayload & { changes: string[] };
  'project.deleted': ProjectEventPayload;

  // Resource events
  'resource.created': ResourceEventPayload;
  'resource.updated': ResourceEventPayload & { changes: string[] };

  // Pendenz events
  'pendenz.created': PendenzEventPayload;
  'pendenz.statusChanged': PendenzEventPayload & { fromStatus: string; toStatus: string };

  // System events
  'system.error': SystemErrorPayload;
}

// ─── Payload Types ─────────────────────────────────────

export interface BaseEventPayload {
  /** ID of the user who triggered the event */
  userId?: string;
  /** Tenant ID (for future multi-tenant) */
  tenantId?: string;
  /** Timestamp of the event */
  timestamp: string;
}

export interface TaskEventPayload extends BaseEventPayload {
  taskId: string;
  projectId: string;
  title?: string;
}

export interface AssignmentEventPayload extends BaseEventPayload {
  assignmentId: string;
  taskId: string;
  resourceId: string;
  assignmentDate: string;
  halfDay: string;
}

export interface AssignmentMovedPayload extends BaseEventPayload {
  assignmentId: string;
  taskId: string;
  resourceId: string;
  fromDate: string;
  toDate: string;
  fromHalfDay: string;
  toHalfDay: string;
}

export interface ProjectEventPayload extends BaseEventPayload {
  projectId: string;
  name?: string;
}

export interface ResourceEventPayload extends BaseEventPayload {
  resourceId: string;
  name?: string;
}

export interface PendenzEventPayload extends BaseEventPayload {
  pendenzId: string;
  projectId?: string;
  title?: string;
}

export interface SystemErrorPayload {
  error: string;
  context?: string;
  stack?: string;
  timestamp: string;
}

// ─── EventBus Implementation ───────────────────────────

type EventName = keyof EventMap;
type EventHandler<T extends EventName> = (payload: EventMap[T]) => void | Promise<void>;

class AppEventBus {
  private emitter: EventEmitter;
  private subscriberCount = new Map<string, number>();

  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners since we may have many subscribers
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit an event. Handlers are called asynchronously (fire-and-forget).
   * Errors in handlers are caught and logged, never thrown to the caller.
   */
  emit<T extends EventName>(event: T, payload: EventMap[T]): void {
    // Add timestamp if not present
    if ('timestamp' in payload === false || !(payload as BaseEventPayload).timestamp) {
      (payload as BaseEventPayload).timestamp = new Date().toISOString();
    }

    try {
      this.emitter.emit(event, payload);
    } catch (err) {
      // Should never happen with async handlers, but just in case
      logger.error({ err, event }, 'EventBus: Error emitting event');
    }
  }

  /**
   * Subscribe to an event.
   * The handler is wrapped to catch errors and prevent them from
   * affecting other handlers or the emitter.
   *
   * @returns Unsubscribe function
   */
  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    const wrappedHandler = async (payload: EventMap[T]) => {
      try {
        await handler(payload);
      } catch (err) {
        logger.error(
          { err, event, payload },
          `EventBus: Error in handler for "${event}"`
        );
      }
    };

    this.emitter.on(event, wrappedHandler);

    // Track subscriber count
    const count = this.subscriberCount.get(event) ?? 0;
    this.subscriberCount.set(event, count + 1);

    logger.debug({ event, subscriberCount: count + 1 }, 'EventBus: Handler registered');

    // Return unsubscribe function
    return () => {
      this.emitter.off(event, wrappedHandler);
      const newCount = (this.subscriberCount.get(event) ?? 1) - 1;
      this.subscriberCount.set(event, newCount);
    };
  }

  /**
   * Subscribe to an event, but only trigger once.
   */
  once<T extends EventName>(event: T, handler: EventHandler<T>): void {
    const wrappedHandler = async (payload: EventMap[T]) => {
      try {
        await handler(payload);
      } catch (err) {
        logger.error(
          { err, event },
          `EventBus: Error in once-handler for "${event}"`
        );
      }
    };

    this.emitter.once(event, wrappedHandler);
  }

  /**
   * Remove all listeners for an event (or all events).
   */
  removeAllListeners(event?: EventName): void {
    if (event) {
      this.emitter.removeAllListeners(event);
      this.subscriberCount.set(event, 0);
    } else {
      this.emitter.removeAllListeners();
      this.subscriberCount.clear();
    }
  }

  /**
   * Get diagnostic info about registered subscribers.
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [event, count] of this.subscriberCount) {
      if (count > 0) stats[event] = count;
    }
    return stats;
  }
}

// ─── Singleton Export ──────────────────────────────────

/** Global event bus instance */
export const eventBus = new AppEventBus();

// ─── Helper: Create timestamped payload ────────────────

/**
 * Helper to create a payload with automatic timestamp.
 *
 * @example
 * ```ts
 * eventBus.emit('task.created', withTimestamp({
 *   taskId: task.id,
 *   projectId: task.project_id,
 *   userId: currentUser.id,
 * }));
 * ```
 */
export function withTimestamp<T extends Record<string, unknown>>(
  payload: T
): T & { timestamp: string } {
  return {
    ...payload,
    timestamp: new Date().toISOString(),
  };
}
