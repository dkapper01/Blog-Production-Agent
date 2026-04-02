/**
 * Message handling for processing agent responses.
 * Direct port of research_agent/utils/message_handler.py
 */

import type { SDKAssistantMessage } from '@anthropic-ai/claude-agent-sdk';
import type { SubagentTracker } from './subagentTracker';
import type { TranscriptWriter } from './transcript';

/**
 * Module-level state: tracks whether a tool was just used for formatting.
 * Port of Python's module-level `_tool_just_used = False`.
 */
let _toolJustUsed = false;

/**
 * Process an SDKAssistantMessage and write output to transcript.
 *
 * @param suppressStdout When true, coordinator TextBlock content goes to the
 *   transcript file only — not to stdout. The progress display handles all
 *   terminal output while the pipeline is running. Set to false (default)
 *   to preserve the original behaviour (text to both stdout and file).
 */
export function processAssistantMessage(
  msg: SDKAssistantMessage,
  tracker: SubagentTracker,
  transcript: TranscriptWriter,
  suppressStdout = false,
): void {
  // Update tracker context with parent_tool_use_id from message
  const parentId = msg.parent_tool_use_id ?? null;
  tracker.setCurrentContext(parentId);

  for (const block of msg.message.content) {
    if (block.type === 'text') {
      if (suppressStdout) {
        // Transcript only — progress display handles the terminal
        if (_toolJustUsed) {
          transcript.writeToFile('\n');
          _toolJustUsed = false;
        }
        transcript.writeToFile(block.text);
      } else {
        // Original behaviour: both stdout and transcript
        if (_toolJustUsed) {
          transcript.write('\n');
          _toolJustUsed = false;
        }
        transcript.write(block.text);
      }
    } else if (block.type === 'tool_use') {
      // Mark that a tool was used (for newline formatting)
      _toolJustUsed = true;

      // Only handle Task tool (subagent spawning)
      if (block.name === 'Task') {
        const input = block.input as Record<string, unknown>;
        const subagentType = (input['subagent_type'] as string) ?? 'unknown';
        const description = (input['description'] as string) ?? 'no description';
        const prompt = (input['prompt'] as string) ?? '';

        // Register with tracker (this triggers display.agentStarted if display is wired in)
        const subagentId = tracker.registerSubagentSpawn(
          block.id,
          subagentType,
          description,
          prompt,
        );

        // Log to transcript file only (display handles terminal output)
        transcript.writeToFile(`\n[Spawning ${subagentId}: ${description}]\n`);
      }
    }
  }
}

/** Type guard re-exported for use in agent.ts */
export function isAssistantMessage(msg: unknown): msg is SDKAssistantMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    'type' in msg &&
    (msg as Record<string, unknown>)['type'] === 'assistant'
  );
}
