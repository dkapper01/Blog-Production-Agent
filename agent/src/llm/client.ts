/**
 * LLMSession — thin wrapper around the Agent SDK's query() function.
 *
 * Manages multi-turn session continuity by capturing the session_id from the
 * first SDKSystemMessage and passing resume: sessionId on subsequent calls.
 * All callers share one LLMSession instance per conversation.
 *
 * All query() calls are wrapped in withRetry() for transient error recovery.
 */

import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { withRetry } from './retryHandler';

export type MessageHandler = (msg: unknown) => void;

export class LLMSession {
  private sessionId: string | undefined;

  /**
   * Send a prompt and iterate over all messages.
   * Calls `onMessage` for each message received.
   * Captures session_id on first system/init message.
   * Retries the entire query on transient failures.
   */
  async send(
    prompt: string,
    baseOptions: Options,
    onMessage: MessageHandler,
  ): Promise<void> {
    const callOptions: Options = this.sessionId
      ? { ...baseOptions, resume: this.sessionId }
      : baseOptions;

    await withRetry(async () => {
      const q = query({ prompt, options: callOptions });

      for await (const msg of q) {
        const m = msg as Record<string, unknown>;

        // Capture session_id for multi-turn continuity
        if (
          m['type'] === 'system' &&
          m['subtype'] === 'init' &&
          !this.sessionId
        ) {
          this.sessionId = m['session_id'] as string | undefined;
        }

        onMessage(msg);
      }
    }, 'LLMSession.send');
  }

  /** Reset session (start a new conversation thread) */
  reset(): void {
    this.sessionId = undefined;
  }
}
