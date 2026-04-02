/**
 * Error categorization and retry logic for Agent SDK calls.
 *
 * Error categories:
 *   transient  — network, timeout, rate limit (429, 503). Retry with backoff.
 *   validation — schema mismatch, bad input. Retry once with a correction note.
 *   business   — content policy, auth failure (401, 403). No retry; escalate.
 */

export type ErrorCategory = 'transient' | 'validation' | 'business';

export interface CategorizedError {
  category: ErrorCategory;
  message: string;
  isRetryable: boolean;
  retryAfterMs?: number;
}

const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const BUSINESS_STATUS_CODES = new Set([400, 401, 403, 404]);

/** Extract HTTP status code from an error if present */
function extractStatusCode(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e['status'] === 'number') return e['status'];
    if (typeof e['statusCode'] === 'number') return e['statusCode'];
  }
  return undefined;
}

/** Extract Retry-After header value in milliseconds if present */
function extractRetryAfterMs(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const headers = (err as Record<string, unknown>)['headers'];
    if (headers && typeof headers === 'object') {
      const retryAfter = (headers as Record<string, unknown>)['retry-after'];
      if (typeof retryAfter === 'string') {
        const seconds = parseFloat(retryAfter);
        if (!isNaN(seconds)) return seconds * 1000;
      }
    }
  }
  return undefined;
}

export function categorizeError(err: unknown): CategorizedError {
  const message = err instanceof Error ? err.message : String(err);
  const status = extractStatusCode(err);

  if (status !== undefined) {
    if (TRANSIENT_STATUS_CODES.has(status)) {
      return {
        category: 'transient',
        message,
        isRetryable: true,
        retryAfterMs: extractRetryAfterMs(err),
      };
    }
    if (BUSINESS_STATUS_CODES.has(status)) {
      return { category: 'business', message, isRetryable: false };
    }
  }

  // Network / timeout errors have no status code
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ENOTFOUND') ||
    message.includes('socket hang up') ||
    message.includes('network')
  ) {
    return { category: 'transient', message, isRetryable: true };
  }

  // Schema / validation errors
  if (
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('schema') ||
    message.includes('validation')
  ) {
    return { category: 'validation', message, isRetryable: true };
  }

  // Default to business (safe — won't retry unexpectedly)
  return { category: 'business', message, isRetryable: false };
}

/** Sleep for the given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a given async operation with categorized error handling.
 *
 * - Transient errors: exponential backoff (1s, 2s, 4s), max 3 retries.
 *   Respects Retry-After if present.
 * - Validation errors: retry once only (caller may pass a corrected input).
 * - Business errors: throw immediately, no retry.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  label = 'operation',
): Promise<T> {
  const MAX_TRANSIENT_RETRIES = 3;
  const BASE_BACKOFF_MS = 1000;

  let transientAttempt = 0;
  let validationAttempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (err: unknown) {
      const categorized = categorizeError(err);

      if (categorized.category === 'business') {
        throw new Error(`[${label}] Non-retryable error: ${categorized.message}`);
      }

      if (categorized.category === 'validation') {
        if (validationAttempt >= 1) {
          throw new Error(`[${label}] Validation error persisted after retry: ${categorized.message}`);
        }
        validationAttempt++;
        process.stderr.write(`[${label}] Validation error (attempt ${validationAttempt}), retrying: ${categorized.message}\n`);
        continue;
      }

      // Transient
      if (transientAttempt >= MAX_TRANSIENT_RETRIES) {
        throw new Error(`[${label}] Transient error after ${MAX_TRANSIENT_RETRIES} retries: ${categorized.message}`);
      }

      const backoffMs = categorized.retryAfterMs ?? BASE_BACKOFF_MS * Math.pow(2, transientAttempt);
      transientAttempt++;
      process.stderr.write(`[${label}] Transient error (attempt ${transientAttempt}/${MAX_TRANSIENT_RETRIES}), retrying in ${backoffMs}ms: ${categorized.message}\n`);
      await sleep(backoffMs);
    }
  }
}
