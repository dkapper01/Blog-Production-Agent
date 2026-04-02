#!/usr/bin/env tsx
/**
 * npm run stats — pipeline health summary
 *
 * Reads memory/content-library.json and logs to print:
 *   - total posts, avg passScore, % requiring revision
 *   - avg word count, avg citation count
 *   - top 3 keywords by frequency
 *   - session count and avg tool calls per session
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.join(__dirname, '..', '..');
const LIBRARY_PATH = path.join(ROOT, 'memory', 'content-library.json');
const LOGS_DIR = path.join(ROOT, 'logs');

// ---------------------------------------------------------------------------
// Types (minimal — only fields we use)
// ---------------------------------------------------------------------------

interface LibraryEntry {
  title: string;
  slug: string;
  keywords?: string[];
  wordCount?: number;
  citationCount?: number;
  passScore?: number | null;
  format?: string;
  language?: string;
}

// ---------------------------------------------------------------------------
// Library stats
// ---------------------------------------------------------------------------

function analyzeLibrary(entries: LibraryEntry[]) {
  const total = entries.length;

  const withScore = entries.filter((e) => typeof e.passScore === 'number' && e.passScore !== null);
  const avgPassScore =
    withScore.length > 0
      ? withScore.reduce((s, e) => s + (e.passScore as number), 0) / withScore.length
      : null;

  const revisionRequired = withScore.filter((e) => (e.passScore as number) < 85).length;
  const revisionPct = withScore.length > 0 ? (revisionRequired / withScore.length) * 100 : null;

  const withWordCount = entries.filter((e) => typeof e.wordCount === 'number');
  const avgWordCount =
    withWordCount.length > 0
      ? withWordCount.reduce((s, e) => s + (e.wordCount as number), 0) / withWordCount.length
      : null;

  const withCitations = entries.filter((e) => typeof e.citationCount === 'number');
  const avgCitations =
    withCitations.length > 0
      ? withCitations.reduce((s, e) => s + (e.citationCount as number), 0) / withCitations.length
      : null;

  // Keyword frequency
  const freq = new Map<string, number>();
  for (const entry of entries) {
    for (const kw of entry.keywords ?? []) {
      const k = kw.toLowerCase().trim();
      freq.set(k, (freq.get(k) ?? 0) + 1);
    }
  }
  const topKeywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw, count]) => ({ kw, count }));

  // Format breakdown
  const formatCounts = new Map<string, number>();
  for (const entry of entries) {
    const fmt = entry.format ?? 'explainer';
    formatCounts.set(fmt, (formatCounts.get(fmt) ?? 0) + 1);
  }

  // Language breakdown
  const langCounts = new Map<string, number>();
  for (const entry of entries) {
    const lang = entry.language ?? 'en';
    langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
  }

  return {
    total,
    avgPassScore,
    scoredCount: withScore.length,
    revisionRequired,
    revisionPct,
    avgWordCount,
    avgCitations,
    topKeywords,
    formatCounts,
    langCounts,
  };
}

// ---------------------------------------------------------------------------
// Log stats
// ---------------------------------------------------------------------------

async function countToolCallsInFile(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    let count = 0;
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
    rl.on('line', () => count++);
    rl.on('close', () => resolve(count));
    rl.on('error', () => resolve(0));
  });
}

async function analyzeLogSessions(): Promise<{ sessionCount: number; avgToolCalls: number | null }> {
  if (!fs.existsSync(LOGS_DIR)) return { sessionCount: 0, avgToolCalls: null };

  const sessions = fs
    .readdirSync(LOGS_DIR)
    .filter((d) => fs.existsSync(path.join(LOGS_DIR, d, 'tool_calls.jsonl')));

  if (sessions.length === 0) return { sessionCount: 0, avgToolCalls: null };

  const counts = await Promise.all(
    sessions.map((s) => countToolCallsInFile(path.join(LOGS_DIR, s, 'tool_calls.jsonl'))),
  );

  const avg = counts.reduce((s, c) => s + c, 0) / counts.length;
  return { sessionCount: sessions.length, avgToolCalls: avg };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmt(n: number | null, decimals = 1, suffix = ''): string {
  if (n === null) return chalk.dim('n/a');
  return chalk.white(n.toFixed(decimals) + suffix);
}

function bar(value: number, max: number, width = 20): string {
  const filled = Math.round((value / max) * width);
  return chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(width - filled));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Load library
  let entries: LibraryEntry[] = [];
  if (fs.existsSync(LIBRARY_PATH)) {
    try {
      entries = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf-8'));
    } catch {
      console.error(chalk.red('Error reading content-library.json'));
      process.exit(1);
    }
  }

  const lib = analyzeLibrary(entries);
  const logs = await analyzeLogSessions();

  const divider = chalk.dim('─'.repeat(52));
  const header = chalk.bold.blue('═'.repeat(52));

  console.log('\n' + header);
  console.log(chalk.bold.blue('  Blog Agent — Pipeline Stats'));
  console.log(header);

  // --- Quality ---
  console.log('\n' + chalk.bold('  Quality'));
  console.log(divider);
  console.log(`  ${'Total posts'.padEnd(26)} ${chalk.white(lib.total)}`);

  if (lib.avgPassScore !== null) {
    const scoreColor = lib.avgPassScore >= 85 ? chalk.green : lib.avgPassScore >= 70 ? chalk.yellow : chalk.red;
    console.log(`  ${'Avg passScore'.padEnd(26)} ${scoreColor(lib.avgPassScore.toFixed(1))}  ${chalk.dim(`(${lib.scoredCount} scored)`)}`);
  } else {
    console.log(`  ${'Avg passScore'.padEnd(26)} ${chalk.dim('n/a — no scores recorded')}`);
  }

  if (lib.revisionPct !== null) {
    const pctColor = lib.revisionPct <= 30 ? chalk.green : lib.revisionPct <= 60 ? chalk.yellow : chalk.red;
    console.log(
      `  ${'Required revision (<85)'.padEnd(26)} ${pctColor(lib.revisionPct.toFixed(0) + '%')}` +
      chalk.dim(`  (${lib.revisionRequired} of ${lib.scoredCount})`),
    );
  } else {
    console.log(`  ${'Required revision (<85)'.padEnd(26)} ${chalk.dim('n/a')}`);
  }

  // --- Content ---
  console.log('\n' + chalk.bold('  Content'));
  console.log(divider);
  console.log(`  ${'Avg word count'.padEnd(26)} ${fmt(lib.avgWordCount, 0, ' words')}`);
  console.log(`  ${'Avg citation count'.padEnd(26)} ${fmt(lib.avgCitations, 1, ' citations')}`);

  // --- Keywords ---
  console.log('\n' + chalk.bold('  Top Keywords'));
  console.log(divider);
  if (lib.topKeywords.length === 0) {
    console.log(chalk.dim('  No keyword data'));
  } else {
    const maxCount = lib.topKeywords[0].count;
    for (const { kw, count } of lib.topKeywords) {
      const label = kw.length > 30 ? kw.slice(0, 28) + '…' : kw;
      console.log(`  ${label.padEnd(32)} ${bar(count, maxCount, 10)}  ${chalk.dim(count + 'x')}`);
    }
  }

  // --- Format / Language breakdown ---
  if (lib.formatCounts.size > 0) {
    console.log('\n' + chalk.bold('  Format Breakdown'));
    console.log(divider);
    for (const [fmt2, count] of [...lib.formatCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${fmt2.padEnd(26)} ${chalk.white(count)}`);
    }
  }

  if (lib.langCounts.size > 1) {
    console.log('\n' + chalk.bold('  Language Breakdown'));
    console.log(divider);
    for (const [lang, count] of [...lib.langCounts.entries()].sort((a, b) => b[1] - a[1])) {
      const label = lang === 'en' ? 'English' : lang === 'tr' ? 'Turkish' : lang;
      console.log(`  ${label.padEnd(26)} ${chalk.white(count)}`);
    }
  }

  // --- Sessions ---
  console.log('\n' + chalk.bold('  Sessions'));
  console.log(divider);
  console.log(`  ${'Total sessions logged'.padEnd(26)} ${chalk.white(logs.sessionCount)}`);
  console.log(`  ${'Avg tool calls/session'.padEnd(26)} ${fmt(logs.avgToolCalls, 0)}`);

  console.log('\n' + chalk.dim('═'.repeat(52)) + '\n');
}

main().catch((err) => {
  console.error(chalk.red('stats error:'), err);
  process.exit(1);
});
