/**
 * Rich terminal status display for the blog production pipeline.
 *
 * Shows a live spinner line for the current stage, appends permanent
 * checkmark lines when stages complete, and estimates time remaining.
 */

import chalk from 'chalk';
import type { WizardFormat, WizardLanguage } from '../intake/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PipelineStage =
  | 'Planning'
  | 'Research'
  | 'Outline'
  | 'Writing'
  | 'Editorial'
  | 'Publishing'
  | 'Alt Format'
  | 'Done';

interface AgentRun {
  agentId: string;       // e.g. "RESEARCHER-1"
  agentType: string;     // e.g. "researcher"
  stage: PipelineStage;
  startedAt: number;     // Date.now()
  completedAt?: number;
  details?: string;      // filled in when complete
}

// ---------------------------------------------------------------------------
// Stage ETA estimates (seconds)
// ---------------------------------------------------------------------------

const STAGE_ESTIMATES_SINGLE: Record<PipelineStage, number> = {
  Planning:    10,
  Research:    90,
  Outline:     45,
  Writing:     90,
  Editorial:   45,
  Publishing:  45,
  'Alt Format': 120,
  Done:         0,
};

const STAGE_ESTIMATES_DUAL: Record<PipelineStage, number> = {
  Planning:    10,
  Research:    90,   // same — already parallel
  Outline:     60,
  Writing:     110,
  Editorial:   60,
  Publishing:  60,
  'Alt Format': 150,
  Done:          0,
};

const STAGE_ORDER: PipelineStage[] = [
  'Planning', 'Research', 'Outline', 'Writing', 'Editorial', 'Publishing', 'Alt Format',
];

// ---------------------------------------------------------------------------
// Agent type → stage mapping
// ---------------------------------------------------------------------------

function inferStage(agentType: string, publishingDone: boolean): PipelineStage {
  switch (agentType) {
    case 'researcher': return 'Research';
    case 'outline':    return publishingDone ? 'Alt Format' : 'Outline';
    case 'writer':     return publishingDone ? 'Alt Format' : 'Writing';
    case 'editor':
    case 'seo':        return 'Editorial';
    case 'publisher':  return publishingDone ? 'Alt Format' : 'Publishing';
    default:           return 'Planning';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s % 60}s`;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return '';
  const m = Math.ceil(seconds / 60);
  return `~${m} min remaining`;
}

function clearLine(): void {
  process.stdout.write('\r' + ' '.repeat(process.stdout.columns ?? 80) + '\r');
}

// ---------------------------------------------------------------------------
// ProgressDisplay
// ---------------------------------------------------------------------------

export class ProgressDisplay {
  private topic: string;
  private format: string;
  private language: WizardLanguage;
  private isDual: boolean;

  private runStart = Date.now();
  private spinnerFrame = 0;
  private spinnerInterval: NodeJS.Timeout | null = null;

  // Stage tracking
  private completedStages: Set<PipelineStage> = new Set();
  private currentStage: PipelineStage | null = null;
  private currentStageStart = Date.now();
  private publishingDone = false;

  // Agent tracking
  private activeAgents: Map<string, AgentRun> = new Map();  // agentId → run
  private completedAgents: AgentRun[] = [];

  // Live line state
  private liveLine = '';

  constructor(topic: string, format: WizardFormat, language: WizardLanguage) {
    this.topic = topic.length > 55 ? topic.slice(0, 52) + '...' : topic;
    this.format = format === 'agent-decide' ? 'auto' : format;
    this.language = language;
    this.isDual = language === 'both';
  }

  // ---------------------------------------------------------------------------
  // Public API — called by agent.ts
  // ---------------------------------------------------------------------------

  showHeader(): void {
    const estimates = this.isDual ? STAGE_ESTIMATES_DUAL : STAGE_ESTIMATES_SINGLE;
    const totalSecs = STAGE_ORDER.reduce((sum, s) => sum + estimates[s], 0);
    const etaMins = Math.ceil(totalSecs / 60);
    const langLabel = { en: 'English', tr: 'Turkish', both: 'English + Turkish' }[this.language];

    const bar = '═'.repeat(50);
    console.log('\n' + chalk.bold.blue(bar));
    console.log(chalk.bold.blue('  Blog Production Agent — Running'));
    console.log(chalk.bold.blue(bar));
    console.log(`  ${chalk.dim('Topic:')}    ${chalk.white(this.topic)}`);
    console.log(`  ${chalk.dim('Format:')}   ${chalk.white(this.format)} · ${chalk.white(langLabel)}`);
    console.log(`  ${chalk.dim('Est. time:')} ${chalk.white('~' + etaMins + ' min')}`);
    console.log(chalk.blue('─'.repeat(50)));
    console.log('');

    // Planning starts immediately
    this._startStage('Planning');
  }

  /** Called by SubagentTracker when a Task tool fires */
  agentStarted(agentId: string, agentType: string, description: string): void {
    const stage = inferStage(agentType, this.publishingDone);

    // Transition to new stage if needed
    if (stage !== this.currentStage) {
      if (this.currentStage) this._completeStage(this.currentStage);
      this._startStage(stage);
    }

    const run: AgentRun = {
      agentId,
      agentType,
      stage,
      startedAt: Date.now(),
    };
    this.activeAgents.set(agentId, run);

    // Print permanent line for this agent starting
    const shortDesc = description.length > 45 ? description.slice(0, 42) + '...' : description;
    this._printLine(
      `  ${chalk.dim('├─')} ${chalk.yellow('⠸')} ${chalk.dim(agentId)}  ${shortDesc}`
    );
  }

  /** Called by SubagentTracker when a Task tool completes */
  agentCompleted(agentId: string): void {
    const run = this.activeAgents.get(agentId);
    if (!run) return;

    run.completedAt = Date.now();
    const elapsed = run.completedAt - run.startedAt;
    this.activeAgents.delete(agentId);
    this.completedAgents.push(run);

    // Mark publishing done when a publisher completes (to detect alt-format stage)
    if (run.agentType === 'publisher' && run.stage === 'Publishing') {
      this.publishingDone = true;
    }

    this._printLine(
      `  ${chalk.dim('│ ')} ${chalk.green('✓')} ${chalk.dim(agentId)}` +
      chalk.dim(`  ${formatElapsed(elapsed)}`)
    );

    // If all active agents in this stage are done, auto-complete the stage
    const remainingInStage = [...this.activeAgents.values()].filter(
      (a) => a.stage === run.stage,
    );
    if (remainingInStage.length === 0 && this.currentStage === run.stage) {
      this._completeStage(run.stage);
    }
  }

  /** Called after llm.send() returns — stops spinner, prints Done banner */
  stop(): void {
    if (this.currentStage && this.currentStage !== 'Done') {
      this._completeStage(this.currentStage);
    }

    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }

    clearLine();
    const totalElapsed = Date.now() - this.runStart;
    const bar = '═'.repeat(50);
    console.log('');
    console.log(chalk.bold.green(bar));
    console.log(
      chalk.bold.green('  ✓  Done') +
      chalk.dim(`  —  ${formatElapsed(totalElapsed)} total`)
    );
    console.log(chalk.bold.green(bar) + '\n');
  }

  /** Print the coordinator's final report after the run completes */
  showReport(text: string): void {
    if (!text.trim()) return;
    console.log(chalk.bold('─'.repeat(50)));
    console.log(chalk.bold('  Report'));
    console.log(chalk.dim('─'.repeat(50)));
    // Print each line with slight indent
    for (const line of text.trim().split('\n')) {
      console.log('  ' + line);
    }
    console.log('');
  }

  // ---------------------------------------------------------------------------
  // Internal stage management
  // ---------------------------------------------------------------------------

  private _startStage(stage: PipelineStage): void {
    this.currentStage = stage;
    this.currentStageStart = Date.now();

    if (!this.spinnerInterval) {
      this.spinnerInterval = setInterval(() => this._tick(), 100);
    }
    this._updateLiveLine();
  }

  private _completeStage(stage: PipelineStage): void {
    this.completedStages.add(stage);
    const elapsed = Date.now() - this.currentStageStart;

    clearLine();
    process.stdout.write(
      `  ${chalk.green('✓')}  ${chalk.bold(stage.padEnd(16))}` +
      chalk.dim(`  ${formatElapsed(elapsed)}`) +
      '\n'
    );

    if (this.currentStage === stage) {
      this.currentStage = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Live line rendering
  // ---------------------------------------------------------------------------

  private _tick(): void {
    this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
    this._updateLiveLine();
  }

  private _updateLiveLine(): void {
    if (!this.currentStage) return;

    const frame = SPINNER_FRAMES[this.spinnerFrame];
    const elapsed = Date.now() - this.currentStageStart;

    // Active agent count
    const active = [...this.activeAgents.values()].filter(
      (a) => a.stage === this.currentStage,
    );
    const completed = this.completedAgents.filter(
      (a) => a.stage === this.currentStage,
    ).length;

    let label = this.currentStage;
    if (active.length > 0) {
      const total = active.length + completed;
      if (total > 1) label += `  (${completed}/${total} done)`;
    }

    // ETA
    const estimates = this.isDual ? STAGE_ESTIMATES_DUAL : STAGE_ESTIMATES_SINGLE;
    const currentIdx = STAGE_ORDER.indexOf(this.currentStage);
    const remainingSecs = STAGE_ORDER
      .slice(currentIdx + 1)
      .reduce((sum, s) => sum + estimates[s], 0);
    const etaStr = remainingSecs > 0 ? chalk.dim(`  ·  ${formatEta(remainingSecs)}`) : '';

    const line =
      `  ${chalk.yellow(frame)}  ${chalk.bold(label)}` +
      chalk.dim(`  ${formatElapsed(elapsed)}`) +
      etaStr;

    this.liveLine = line;
    process.stdout.write('\r' + line + ' '.repeat(
      Math.max(0, (process.stdout.columns ?? 80) - line.replace(/\x1B\[[0-9;]*m/g, '').length)
    ));
  }

  // ---------------------------------------------------------------------------
  // Print permanent line (clears live line, prints, restores live line)
  // ---------------------------------------------------------------------------

  private _printLine(text: string): void {
    clearLine();
    process.stdout.write(text + '\n');
    if (this.liveLine) {
      process.stdout.write(this.liveLine);
    }
  }
}
