/**
 * Coordinator — processes assistant messages from the lead agent and
 * streams them to the transcript.
 *
 * The coordinator runs as the top-level agent; it spawns researchers, writer,
 * and publisher via the Task tool. This module handles message routing only;
 * the actual agent logic lives in prompts/coordinator.txt.
 */

import type { SDKAssistantMessage } from '@anthropic-ai/claude-agent-sdk';
import type { SubagentTracker } from '../../utils/subagentTracker';
import type { TranscriptWriter } from '../../utils/transcript';

// Re-export so callers import from one place
export { processAssistantMessage } from '../../utils/messageHandler';

/**
 * Type guard — narrows an unknown SDK message to SDKAssistantMessage.
 */
export function isAssistantMessage(msg: unknown): msg is SDKAssistantMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === 'assistant'
  );
}

/**
 * Type guard — narrows an unknown SDK message to a system/init message.
 */
export function isInitMessage(
  msg: unknown,
): msg is { type: 'system'; subtype: 'init'; session_id: string } {
  const m = msg as Record<string, unknown>;
  return m['type'] === 'system' && m['subtype'] === 'init';
}
