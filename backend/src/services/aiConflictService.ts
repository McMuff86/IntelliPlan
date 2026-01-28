/**
 * AI-Powered Conflict Resolution Service
 * 
 * Provides intelligent suggestions for resolving scheduling conflicts.
 * For MVP: Uses rule-based heuristics inspired by carpentry shop workflows.
 * Future: Integrate with Hugging Face API or local ML model.
 */

import { Appointment } from '../models/appointment';
import { pool } from '../config/database';
import { join } from 'path';
import logger from '../config/logger';

export interface ConflictSuggestion {
  type: 'reschedule' | 'split' | 'shorten' | 'swap' | 'move_earlier';
  confidence: number; // 0-1
  description: string;
  proposedTime?: {
    startTime: string;
    endTime: string;
  };
  reasoning: string;
}

export interface AIConflictResolutionOptions {
  requestedStart: string;
  requestedEnd: string;
  conflicts: Appointment[];
  userId: string;
  title?: string;
}

export interface AIConflictResolutionResult {
  suggestions: ConflictSuggestion[];
  conflictPattern: string;
  historicalContext?: string;
}

/**
 * Analyze conflicts and generate AI-powered suggestions
 */
export async function generateConflictSuggestions(
  options: AIConflictResolutionOptions
): Promise<AIConflictResolutionResult> {
  const { requestedStart, requestedEnd, conflicts, userId, title } = options;
  
  const suggestions: ConflictSuggestion[] = [];
  
  // Parse times
  const reqStart = new Date(requestedStart);
  const reqEnd = new Date(requestedEnd);
  const duration = reqEnd.getTime() - reqStart.getTime();
  
  // Analyze conflict pattern
  const conflictPattern = analyzeConflictPattern(conflicts, reqStart, reqEnd);
  
  // Load historical learnings (from beads)
  const historicalContext = await loadHistoricalLearnings(userId);
  
  // Rule 1: Find next available slot (simple greedy)
  const nextSlot = await findNextAvailableSlot(userId, duration, reqEnd);
  if (nextSlot) {
    suggestions.push({
      type: 'reschedule',
      confidence: 0.9,
      description: `Reschedule to next available time slot`,
      proposedTime: {
        startTime: nextSlot.start.toISOString(),
        endTime: nextSlot.end.toISOString(),
      },
      reasoning: 'Next available slot with same duration. No conflicts detected.',
    });
  }
  
  // Rule 2: Find slot before the conflict
  const beforeSlot = await findAvailableSlotBefore(userId, duration, reqStart);
  if (beforeSlot) {
    suggestions.push({
      type: 'move_earlier',
      confidence: 0.85,
      description: `Move earlier to avoid conflict`,
      proposedTime: {
        startTime: beforeSlot.start.toISOString(),
        endTime: beforeSlot.end.toISOString(),
      },
      reasoning: 'Available slot before requested time. Same day if possible.',
    });
  }
  
  // Rule 3: Check if any conflicting appointment has low priority
  // (For carpentry use case: check if it's a "planning" vs "production" task)
  const lowPriorityConflict = conflicts.find(c => 
    c.title.toLowerCase().includes('planning') || 
    c.title.toLowerCase().includes('review')
  );
  
  if (lowPriorityConflict) {
    suggestions.push({
      type: 'swap',
      confidence: 0.75,
      description: `Swap with lower priority appointment: "${lowPriorityConflict.title}"`,
      proposedTime: {
        startTime: requestedStart,
        endTime: requestedEnd,
      },
      reasoning: `Detected "${lowPriorityConflict.title}" as potentially lower priority. Consider swapping.`,
    });
  }
  
  // Rule 4: Split long appointments if conflict is partial
  if (conflicts.length === 1 && conflicts[0]) {
    const conflict = conflicts[0];
    const conflictStart = conflict.start_time.getTime();
    const conflictEnd = conflict.end_time.getTime();
    const reqStartMs = reqStart.getTime();
    const reqEndMs = reqEnd.getTime();
    
    // Check if we can split the requested appointment
    if (reqStartMs < conflictStart && reqEndMs > conflictEnd) {
      // New appointment spans across existing one
      const beforeDuration = conflictStart - reqStartMs;
      const afterDuration = reqEndMs - conflictEnd;
      
      if (beforeDuration > 15 * 60 * 1000 && afterDuration > 15 * 60 * 1000) {
        // Both parts > 15 minutes
        suggestions.push({
          type: 'split',
          confidence: 0.65,
          description: `Split into two appointments around the conflict`,
          reasoning: `Can create two separate appointments: ${Math.round(beforeDuration/60000)}min before and ${Math.round(afterDuration/60000)}min after the conflicting appointment.`,
        });
      }
    }
  }
  
  // Rule 5: Shorten if there's partial overlap
  if (conflicts.length === 1) {
    const conflict = conflicts[0];
    const conflictStart = conflict.start_time.getTime();
    const conflictEnd = conflict.end_time.getTime();
    const reqStartMs = reqStart.getTime();
    const reqEndMs = reqEnd.getTime();
    
    if (reqStartMs < conflictStart && reqEndMs > conflictStart && reqEndMs <= conflictEnd) {
      // Overlap at the end - shorten to end before conflict
      const newEnd = new Date(conflictStart - 1000); // 1 second before
      suggestions.push({
        type: 'shorten',
        confidence: 0.7,
        description: `Shorten appointment to end before conflict`,
        proposedTime: {
          startTime: requestedStart,
          endTime: newEnd.toISOString(),
        },
        reasoning: `End appointment at ${newEnd.toLocaleTimeString()} to avoid conflict.`,
      });
    }
  }
  
  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  // Log to beads for future learning
  await logConflictLearning({
    userId,
    requestedStart,
    requestedEnd,
    title,
    conflictPattern,
    suggestions,
  });
  
  return {
    suggestions: suggestions.slice(0, 3), // Return top 3 suggestions
    conflictPattern,
    historicalContext,
  };
}

/**
 * Analyze the pattern of conflicts
 */
function analyzeConflictPattern(conflicts: Appointment[], reqStart: Date, reqEnd: Date): string {
  if (conflicts.length === 0) return 'no-conflict';
  if (conflicts.length === 1) {
    const conflict = conflicts[0];
    const conflictStart = conflict.start_time.getTime();
    const conflictEnd = conflict.end_time.getTime();
    const reqStartMs = reqStart.getTime();
    const reqEndMs = reqEnd.getTime();
    
    if (reqStartMs >= conflictStart && reqEndMs <= conflictEnd) {
      return 'fully-contained';
    } else if (reqStartMs < conflictStart && reqEndMs > conflictEnd) {
      return 'fully-contains';
    } else if (reqStartMs < conflictStart) {
      return 'overlap-end';
    } else {
      return 'overlap-start';
    }
  }
  return 'multiple-conflicts';
}

/**
 * Find next available time slot after a given time
 */
async function findNextAvailableSlot(
  userId: string,
  durationMs: number,
  afterTime: Date
): Promise<{ start: Date; end: Date } | null> {
  // Find appointments for the next 7 days
  const searchStart = afterTime;
  const searchEnd = new Date(afterTime.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const result = await pool.query<Appointment>(
    `SELECT * FROM appointments 
     WHERE user_id = $1 
       AND deleted_at IS NULL
       AND start_time >= $2
       AND start_time < $3
     ORDER BY start_time ASC`,
    [userId, searchStart.toISOString(), searchEnd.toISOString()]
  );
  
  const appointments = result.rows;
  
  // Check gaps between appointments
  let currentTime = new Date(afterTime);
  
  // Skip to next business hour if outside (assuming 8-17 for carpentry shop)
  currentTime = adjustToBusinessHours(currentTime);
  
  for (const apt of appointments) {
    const aptStart = apt.start_time.getTime();
    const gap = aptStart - currentTime.getTime();
    
    if (gap >= durationMs) {
      // Found a gap
      return {
        start: new Date(currentTime),
        end: new Date(currentTime.getTime() + durationMs),
      };
    }
    
    // Move to end of this appointment
    currentTime = new Date(apt.end_time.getTime());
    currentTime = adjustToBusinessHours(currentTime);
  }
  
  // No conflicts found, can use time after last appointment
  if (currentTime.getTime() < searchEnd.getTime()) {
    return {
      start: new Date(currentTime),
      end: new Date(currentTime.getTime() + durationMs),
    };
  }
  
  return null;
}

/**
 * Find available slot before a given time
 */
async function findAvailableSlotBefore(
  userId: string,
  durationMs: number,
  beforeTime: Date
): Promise<{ start: Date; end: Date } | null> {
  // Search 7 days back
  const searchStart = new Date(beforeTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const result = await pool.query<Appointment>(
    `SELECT * FROM appointments 
     WHERE user_id = $1 
       AND deleted_at IS NULL
       AND end_time <= $2
       AND start_time >= $3
     ORDER BY end_time DESC`,
    [userId, beforeTime.toISOString(), searchStart.toISOString()]
  );
  
  const appointments = result.rows;
  
  // Start from requested time and work backwards
  let currentEnd = new Date(beforeTime);
  currentEnd = adjustToBusinessHours(currentEnd);
  
  for (const apt of appointments) {
    const aptEnd = apt.end_time.getTime();
    const gap = currentEnd.getTime() - aptEnd;
    
    if (gap >= durationMs) {
      // Found a gap
      const proposedEnd = new Date(currentEnd);
      const proposedStart = new Date(currentEnd.getTime() - durationMs);
      
      // Check if both are in business hours
      if (isInBusinessHours(proposedStart) && isInBusinessHours(proposedEnd)) {
        return {
          start: proposedStart,
          end: proposedEnd,
        };
      }
    }
    
    // Move to start of this appointment
    currentEnd = new Date(apt.start_time);
  }
  
  return null;
}

/**
 * Adjust time to next business hour (8-17, Mon-Fri)
 * For Swiss carpentry shop use case
 */
function adjustToBusinessHours(time: Date): Date {
  const result = new Date(time);
  const day = result.getDay(); // 0 = Sunday
  const hour = result.getHours();
  
  // If weekend, move to Monday
  if (day === 0) { // Sunday -> Monday
    result.setDate(result.getDate() + 1);
    result.setHours(8, 0, 0, 0);
  } else if (day === 6) { // Saturday -> Monday
    result.setDate(result.getDate() + 2);
    result.setHours(8, 0, 0, 0);
  } else if (hour < 8) {
    // Before business hours -> 8 AM
    result.setHours(8, 0, 0, 0);
  } else if (hour >= 17) {
    // After business hours -> next day 8 AM
    result.setDate(result.getDate() + 1);
    result.setHours(8, 0, 0, 0);
    // Check if next day is weekend
    if (result.getDay() === 6) {
      result.setDate(result.getDate() + 2);
    } else if (result.getDay() === 0) {
      result.setDate(result.getDate() + 1);
    }
  }
  
  return result;
}

/**
 * Check if time is within business hours
 */
function isInBusinessHours(time: Date): boolean {
  const day = time.getDay();
  const hour = time.getHours();
  
  return day >= 1 && day <= 5 && hour >= 8 && hour < 17;
}

/**
 * Load historical conflict learnings from beads
 */
async function loadHistoricalLearnings(userId: string): Promise<string> {
  // Get beads directory from environment or default
  const beadsDir = process.env.BEADS_DIR || join(process.cwd(), '..', '.beads');
  const learningsFile = join(beadsDir, 'conflict_learnings.json');
  
  try {
    const { readFile } = await import('fs/promises');
    const data = await readFile(learningsFile, 'utf-8');
    const learnings = JSON.parse(data);
    
    // Filter learnings for this user
    const userLearnings = learnings.filter((l: { userId: string }) => l.userId === userId);
    
    if (userLearnings.length > 0) {
      const recentPatterns = userLearnings
        .slice(-5)
        .map((l: { conflictPattern: string }) => l.conflictPattern)
        .join(', ');
      
      return `Recent patterns: ${recentPatterns}`;
    }
  } catch {
    // File doesn't exist yet or other error - that's okay
  }
  
  return 'No historical data yet';
}

/**
 * Log conflict and resolution for future learning
 */
async function logConflictLearning(data: {
  userId: string;
  requestedStart: string;
  requestedEnd: string;
  title?: string;
  conflictPattern: string;
  suggestions: ConflictSuggestion[];
}): Promise<void> {
  const beadsDir = process.env.BEADS_DIR || join(process.cwd(), '..', '.beads');
  const learningsFile = join(beadsDir, 'conflict_learnings.json');
  
  const entry = {
    timestamp: new Date().toISOString(),
    userId: data.userId,
    requestedStart: data.requestedStart,
    requestedEnd: data.requestedEnd,
    title: data.title,
    conflictPattern: data.conflictPattern,
    topSuggestion: data.suggestions[0]?.type || 'none',
    suggestionCount: data.suggestions.length,
  };
  
  try {
    const { readFile, writeFile } = await import('fs/promises');
    let learnings = [];
    
    try {
      const data = await readFile(learningsFile, 'utf-8');
      learnings = JSON.parse(data);
    } catch {
      // File doesn't exist, start fresh
    }
    
    learnings.push(entry);
    
    // Keep last 100 entries
    if (learnings.length > 100) {
      learnings = learnings.slice(-100);
    }
    
    await writeFile(learningsFile, JSON.stringify(learnings, null, 2));
  } catch {
    // Silently fail - logging is not critical
    logger.warn('Failed to log conflict learning');
  }
}

/**
 * Get conflict statistics for a user (for analytics)
 */
export async function getConflictStatistics(userId: string): Promise<{
  totalConflicts: number;
  commonPatterns: { [key: string]: number };
  commonSolutions: { [key: string]: number };
}> {
  const beadsDir = process.env.BEADS_DIR || join(process.cwd(), '..', '.beads');
  const learningsFile = join(beadsDir, 'conflict_learnings.json');
  
  try {
    const { readFile } = await import('fs/promises');
    const data = await readFile(learningsFile, 'utf-8');
    const learnings = JSON.parse(data);
    
    const userLearnings = learnings.filter((l: { userId: string }) => l.userId === userId);
    
    const patterns: { [key: string]: number } = {};
    const solutions: { [key: string]: number } = {};
    
    for (const learning of userLearnings) {
      const l = learning as { conflictPattern: string; topSuggestion: string };
      patterns[l.conflictPattern] = (patterns[l.conflictPattern] || 0) + 1;
      solutions[l.topSuggestion] = (solutions[l.topSuggestion] || 0) + 1;
    }
    
    return {
      totalConflicts: userLearnings.length,
      commonPatterns: patterns,
      commonSolutions: solutions,
    };
  } catch {
    return {
      totalConflicts: 0,
      commonPatterns: {},
      commonSolutions: {},
    };
  }
}
