/**
 * LLMSession — thin wrapper around the Agent SDK's query() function.
 *
 * Manages multi-turn session continuity by capturing the session_id from the
 * first SDKSystemMessage and passing resume: sessionId on subsequent calls.
 * All callers share one LLMSession instance per conversation.
 *
 * All query() calls are wrapped in withRetry() for transient error recovery.
 */

import * as fs from 'fs';
import * as path from 'path';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { withRetry } from './retryHandler';

export type MessageHandler = (msg: unknown) => void;

const SESSION_FILE = path.join(process.cwd(), 'files', '.session');

export class LLMSession {
  private sessionId: string | undefined;

  constructor() {
    // Restore session ID from disk if present (survives process crashes)
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const stored = fs.readFileSync(SESSION_FILE, 'utf-8').trim();
        if (stored) this.sessionId = stored;
      }
    } catch {
      // Ignore — start without a session ID
    }
  }

  /**
   * Send a prompt and iterate over all messages.
   * Calls `onMessage` for each message received.
   * Captures session_id on first system/init message and persists it to disk.
   * Retries the entire query on transient failures (resume: sessionId is passed).
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

        // Capture session_id for multi-turn continuity and persist to disk
        if (
          m['type'] === 'system' &&
          m['subtype'] === 'init' &&
          !this.sessionId
        ) {
          this.sessionId = m['session_id'] as string | undefined;
          if (this.sessionId) {
            try {
              fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
              fs.writeFileSync(SESSION_FILE, this.sessionId, 'utf-8');
            } catch {
              // Non-fatal — session recovery just won't work for this run
            }
          }
        }

        onMessage(msg);
      }
    }, 'LLMSession.send');
  }

  /** Reset session (start a new conversation thread) */
  reset(): void {
    this.sessionId = undefined;
    try {
      if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    } catch {
      // Best-effort
    }
  }
}
