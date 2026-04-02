/**
 * Pipeline configuration — constants and base Options builder.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Options, HookCallbackMatcher } from '@anthropic-ai/claude-agent-sdk';
import { buildAgentDefinitions } from './agents';
import { SubagentTracker } from '../utils/subagentTracker';
import { TranscriptWriter } from '../utils/transcript';
import type { ProgressDisplay } from '../utils/progressDisplay';

const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');

function loadPrompt(filename: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, filename), 'utf-8').trim();
}

/** Ensure runtime output directories exist before any agent writes */
export function ensureOutputDirs(): void {
  for (const dir of ['files/research', 'files/drafts', 'files/output', 'memory']) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Clear generated files from the previous run so stale data never bleeds in */
export function clearRunFiles(): void {
  for (const dir of ['files/research', 'files/drafts']) {
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Checkpoint utilities
// ---------------------------------------------------------------------------

export interface Checkpoint {
  stage: string;
  completedAt: string;
  runTopic: string;
}

const CHECKPOINT_PATH = path.join(process.cwd(), 'files', 'checkpoint.json');

export function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8')) as Checkpoint;
    }
  } catch {
    // Corrupt checkpoint — ignore
  }
  return null;
}

export function deleteCheckpoint(): void {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) fs.unlinkSync(CHECKPOINT_PATH);
  } catch {
    // Best-effort
  }
}

export interface PipelineSetup {
  baseOptions: Options;
  tracker: SubagentTracker;
}

/** Build the base Options object for the coordinator, plus the tracker for cleanup */
export function buildPipelineSetup(
  transcript: TranscriptWriter,
  sessionDir: string,
  progressDisplay?: ProgressDisplay,
): PipelineSetup {
  const tracker = new SubagentTracker(transcript, sessionDir, progressDisplay ?? null);

  const hooks: Options['hooks'] = {
    PreToolUse: [
      { hooks: [tracker.preToolUseHook] } as HookCallbackMatcher,
    ],
    PostToolUse: [
      { hooks: [tracker.postToolUseHook] } as HookCallbackMatcher,
    ],
  };

  const baseOptions: Options = {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    settingSources: ['project'],
    systemPrompt: loadPrompt('coordinator.txt'),
    allowedTools: ['Task', 'Read', 'Glob'],
    agents: buildAgentDefinitions(),
    hooks,
    model: 'sonnet',
  };

  return { baseOptions, tracker };
}
