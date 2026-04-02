/**
 * Transcript handling for conversation history.
 * Direct port of research_agent/utils/transcript.py
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Format current date/time as YYYYMMDD_HHMMSS
 * Equivalent to Python's datetime.now().strftime("%Y%m%d_%H%M%S")
 */
function formatTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${mo}${d}_${h}${mi}${s}`;
}

/**
 * Setup session directory and transcript file.
 * Creates a session folder in logs/ with timestamp, containing both
 * transcript and detailed tool call logs.
 *
 * Returns [transcriptFilePath, sessionDirPath]
 */
export function setupSession(): [string, string] {
  const timestamp = formatTimestamp();
  const sessionDir = path.join('logs', `session_${timestamp}`);
  fs.mkdirSync(sessionDir, { recursive: true });
  const transcriptFile = path.join(sessionDir, 'transcript.txt');
  return [transcriptFile, sessionDir];
}

/**
 * Helper to write output to both console and transcript file.
 * Port of Python's TranscriptWriter class.
 */
export class TranscriptWriter {
  private file: fs.WriteStream;

  constructor(transcriptFile: string) {
    this.file = fs.createWriteStream(transcriptFile, { encoding: 'utf-8' });
  }

  /**
   * Write text to both console (stdout) and transcript file.
   * `end` is appended after `text` (default: '' — no extra separator).
   */
  write(text: string, end: string = ''): void {
    process.stdout.write(text + end);
    this.file.write(text + end);
  }

  /**
   * Write text to transcript file only (not console).
   * Used for detailed input/output that would clutter the terminal.
   */
  writeToFile(text: string): void {
    this.file.write(text);
  }

  close(): void {
    this.file.end();
  }
}
