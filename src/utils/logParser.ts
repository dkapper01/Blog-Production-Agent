/**
 * Parses tool_calls.jsonl log files to derive real per-stage timing averages.
 * Used to replace hardcoded ETA estimates in ProgressDisplay with data-driven ones.
 */

import * as fs from 'fs';
import * as path from 'path';

/** Maps agent type strings to pipeline stage names */
const AGENT_TO_STAGE: Record<string, string> = {
  researcher: 'Research',
  outline:    'Outline',
  writer:     'Writing',
  editor:     'Editorial',
  seo:        'Editorial',
  publisher:  'Publishing',
};

interface ToolEvent {
  event: string;
  timestamp: string;
  tool_use_id: string;
  agent_type?: string;
}

/**
 * Read the N most recent session directories from logsDir, sorted newest-first.
 */
function recentSessions(logsDir: string, limit = 10): string[] {
  if (!fs.existsSync(logsDir)) return [];
  return fs
    .readdirSync(logsDir)
    .filter((name) => fs.statSync(path.join(logsDir, name)).isDirectory())
    .sort()
    .reverse()
    .slice(0, limit)
    .map((name) => path.join(logsDir, name, 'tool_calls.jsonl'));
}

/**
 * Parse one tool_calls.jsonl file and return per-stage durations in seconds.
 * Matches tool_call_start / tool_call_complete pairs keyed by tool_use_id.
 */
function parseStageDurations(jsonlPath: string): Map<string, number[]> {
  const stageDurations = new Map<string, number[]>();

  if (!fs.existsSync(jsonlPath)) return stageDurations;

  const starts = new Map<string, { stage: string; startedAt: number }>();

  let raw: string;
  try {
    raw = fs.readFileSync(jsonlPath, 'utf-8');
  } catch {
    return stageDurations;
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: ToolEvent;
    try {
      entry = JSON.parse(trimmed) as ToolEvent;
    } catch {
      continue;
    }

    // We only care about Task tool events (each Task = one subagent run)
    if (entry.event === 'tool_call_start' && entry.agent_type) {
      const stage = AGENT_TO_STAGE[entry.agent_type];
      if (stage) {
        starts.set(entry.tool_use_id, {
          stage,
          startedAt: new Date(entry.timestamp).getTime(),
        });
      }
    } else if (entry.event === 'tool_call_complete') {
      const start = starts.get(entry.tool_use_id);
      if (start) {
        const durationSecs = (new Date(entry.timestamp).getTime() - start.startedAt) / 1000;
        if (durationSecs > 0 && durationSecs < 600) {
          const existing = stageDurations.get(start.stage) ?? [];
          existing.push(durationSecs);
          stageDurations.set(start.stage, existing);
        }
        starts.delete(entry.tool_use_id);
      }
    }
  }

  return stageDurations;
}

/**
 * Aggregate stage durations across all recent sessions.
 * Returns average seconds per stage, only for stages with ≥ 2 data points.
 */
export function loadStageTiming(logsDir: string): Partial<Record<string, number>> {
  const allDurations = new Map<string, number[]>();

  for (const jsonlPath of recentSessions(logsDir)) {
    const durations = parseStageDurations(jsonlPath);
    for (const [stage, values] of durations) {
      const existing = allDurations.get(stage) ?? [];
      allDurations.set(stage, existing.concat(values));
    }
  }

  const result: Partial<Record<string, number>> = {};
  for (const [stage, values] of allDurations) {
    if (values.length >= 2) {
      result[stage] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  return result;
}
