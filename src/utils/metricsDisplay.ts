/**
 * RunMetrics — captures every measurable signal from a single agent run
 * and renders a formatted panel to the terminal. The full metrics object
 * is also saved as JSON to the session directory for later analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelMetrics {
  costUSD: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
}

export interface AgentMetrics {
  agentId: string;
  agentType: string;
  toolCallCount: number;
  durationMs: number | null;
}

export interface RunMetrics {
  // Identity
  topic: string;
  format: string;
  language: string;
  completedAt: string;

  // Cost
  totalCostUsd: number;
  modelUsage: Record<string, ModelMetrics>;

  // Aggregate tokens (sum across all models)
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;

  // Pipeline
  durationMs: number;
  subagentsSpawned: number;
  totalToolCalls: number;
  webSearchCount: number;
  revisionPasses: number;
  agentBreakdown: AgentMetrics[];

  // Quality (from output files — null if run failed before these were written)
  passScore: number | null;
  wordCount: number | null;
  citationCount: number | null;
}

// ---------------------------------------------------------------------------
// Quality file helpers
// ---------------------------------------------------------------------------

/**
 * Read passScore from the editorial report (either language suffix or base path).
 */
export function readPassScore(language: string): number | null {
  const candidates = language === 'en'
    ? ['files/drafts/editorial-report.json']
    : language === 'tr'
      ? ['files/drafts/editorial-report-tr.json']
      : ['files/drafts/editorial-report-en.json', 'files/drafts/editorial-report-tr.json'];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>;
        const score = data['passScore'];
        if (typeof score === 'number') return score;
      }
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * Read wordCount and citationCount from draft-meta.json.
 */
export function readDraftMeta(language: string): { wordCount: number | null; citationCount: number | null } {
  const candidates = language === 'en'
    ? ['files/drafts/draft-meta.json']
    : language === 'tr'
      ? ['files/drafts/draft-meta-tr.json']
      : ['files/drafts/draft-meta-en.json', 'files/drafts/draft-meta-tr.json'];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>;
        return {
          wordCount:    typeof data['wordCount']    === 'number' ? data['wordCount']    : null,
          citationCount: typeof data['citationCount'] === 'number' ? data['citationCount'] : null,
        };
      }
    } catch { /* ignore */ }
  }
  return { wordCount: null, citationCount: null };
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function row(label: string, value: string, width = 26): string {
  return `  ${label.padEnd(width)} ${value}`;
}

function dim(s: string): string { return chalk.dim(s); }
function w(s: string):   string { return chalk.white(s); }

function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function cacheBar(readTokens: number, totalInput: number): string {
  if (totalInput === 0) return '';
  const pct = Math.round((readTokens / totalInput) * 100);
  const filled = Math.round(pct / 5);
  return chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(20 - filled)) + dim(` ${pct}%`);
}

export function showRunMetrics(metrics: RunMetrics): void {
  const div  = chalk.dim('─'.repeat(52));
  const head = chalk.bold.blue('═'.repeat(52));

  console.log('\n' + head);
  console.log(chalk.bold.blue('  Run Metrics'));
  console.log(head);

  // ── Cost ─────────────────────────────────────────────────────────────────
  console.log('\n' + chalk.bold('  Cost'));
  console.log(div);
  console.log(row('Total', chalk.bold.yellow(fmtCost(metrics.totalCostUsd))));

  const models = Object.entries(metrics.modelUsage)
    .filter(([, m]) => m.costUSD > 0)
    .sort(([, a], [, b]) => b.costUSD - a.costUSD);

  for (const [model, m] of models) {
    const shortModel = model.replace('claude-', '');
    const tokenDetail = dim(`  in ${fmtTokens(m.inputTokens)} · out ${fmtTokens(m.outputTokens)}`);
    console.log(row(`  ${shortModel}`, w(fmtCost(m.costUSD)) + tokenDetail));
  }

  // ── Tokens ───────────────────────────────────────────────────────────────
  console.log('\n' + chalk.bold('  Tokens'));
  console.log(div);

  const totalIn = metrics.totalInputTokens + metrics.totalCacheReadTokens + metrics.totalCacheWriteTokens;
  console.log(row('Input (billed at full price)', w(fmtTokens(metrics.totalInputTokens))));
  console.log(row('Output', w(fmtTokens(metrics.totalOutputTokens))));

  if (metrics.totalCacheReadTokens > 0 || metrics.totalCacheWriteTokens > 0) {
    console.log('');
    // Cache read saves ~90% vs full input price
    const readSavingsUsd = metrics.totalCacheReadTokens * 0.000003 * 0.9; // rough blended rate
    console.log(row(
      'Cache reads (0.1× price)',
      w(fmtTokens(metrics.totalCacheReadTokens)) + dim(`  saved ~${fmtCost(readSavingsUsd)}`),
    ));
    console.log(row('Cache writes (1.25× price)', w(fmtTokens(metrics.totalCacheWriteTokens))));
    if (totalIn > 0) {
      console.log(row('Cache hit rate', cacheBar(metrics.totalCacheReadTokens, totalIn)));
    }
  } else {
    console.log(dim('\n  No cache activity detected — see [cache] lines in stderr'));
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────
  console.log('\n' + chalk.bold('  Pipeline'));
  console.log(div);

  const totalSecs = Math.floor(metrics.durationMs / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  console.log(row('Duration', w(durationStr)));
  console.log(row('Subagents spawned', w(String(metrics.subagentsSpawned))));
  console.log(row('Tool calls (total)', w(String(metrics.totalToolCalls))));
  console.log(row('Web searches', w(String(metrics.webSearchCount))));
  console.log(row('Revision passes', w(String(metrics.revisionPasses))));

  // Per-agent breakdown
  if (metrics.agentBreakdown.length > 0) {
    console.log('');
    const grouped = new Map<string, { count: number; totalTools: number }>();
    for (const a of metrics.agentBreakdown) {
      const existing = grouped.get(a.agentType) ?? { count: 0, totalTools: 0 };
      grouped.set(a.agentType, {
        count:      existing.count + 1,
        totalTools: existing.totalTools + a.toolCallCount,
      });
    }
    for (const [type, g] of [...grouped.entries()].sort((a, b) => b[1].totalTools - a[1].totalTools)) {
      const label = g.count > 1 ? `  ${type} ×${g.count}` : `  ${type}`;
      console.log(row(label, dim(`${g.totalTools} tool calls`)));
    }
  }

  // ── Quality ───────────────────────────────────────────────────────────────
  console.log('\n' + chalk.bold('  Quality'));
  console.log(div);

  if (metrics.passScore !== null) {
    const scoreColor = metrics.passScore >= 85 ? chalk.green : metrics.passScore >= 65 ? chalk.yellow : chalk.red;
    console.log(row('passScore', scoreColor(String(metrics.passScore))));
  } else {
    console.log(row('passScore', dim('n/a')));
  }

  console.log(row('Word count',    metrics.wordCount    !== null ? w(metrics.wordCount.toLocaleString())    : dim('n/a')));
  console.log(row('Citations',     metrics.citationCount !== null ? w(String(metrics.citationCount))        : dim('n/a')));

  console.log('\n' + chalk.dim('═'.repeat(52)) + '\n');
}

// ---------------------------------------------------------------------------
// Persist to disk
// ---------------------------------------------------------------------------

/**
 * Save the full metrics object as JSON to the session directory.
 * Filename: run-metrics.json
 */
export function saveRunMetrics(metrics: RunMetrics, sessionDir: string): void {
  try {
    const dest = path.join(sessionDir, 'run-metrics.json');
    fs.writeFileSync(dest, JSON.stringify(metrics, null, 2), 'utf-8');
  } catch {
    // Non-fatal — metrics display already shown to user
  }
}
