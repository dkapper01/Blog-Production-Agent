/**
 * Audience model — persistence and derived insight helpers.
 * Persisted in memory/audience-model.json.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AudienceModel, AudienceSignal, PostFormat } from '../schemas';

const MODEL_PATH = path.join(process.cwd(), 'memory', 'audience-model.json');

export function loadAudienceModel(): AudienceModel {
  if (!fs.existsSync(MODEL_PATH)) {
    return {
      signals: [],
      topPerformingFormats: [],
      topPerformingKeywords: [],
      lastUpdated: '',
    };
  }
  return JSON.parse(fs.readFileSync(MODEL_PATH, 'utf-8')) as AudienceModel;
}

export function saveAudienceModel(model: AudienceModel): void {
  fs.writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2), 'utf-8');
}

/** Append a new signal and re-derive insights, then persist. */
export function addSignal(signal: AudienceSignal): void {
  const model = loadAudienceModel();
  model.signals.push(signal);
  const derived = deriveInsights(model.signals);
  model.topPerformingFormats = derived.topPerformingFormats;
  model.topPerformingKeywords = derived.topPerformingKeywords;
  model.lastUpdated = new Date().toISOString();
  saveAudienceModel(model);
}

/**
 * Derive top formats and keywords from signals that have an engagementScore.
 * Signals without a score are excluded from ranking but still stored.
 */
export function deriveInsights(signals: AudienceSignal[]): {
  topPerformingFormats: PostFormat[];
  topPerformingKeywords: string[];
} {
  const scored = signals.filter((s) => s.engagementScore !== undefined);

  if (scored.length === 0) {
    return { topPerformingFormats: [], topPerformingKeywords: [] };
  }

  // Average engagement score per format
  const formatScores = new Map<PostFormat, { total: number; count: number }>();
  for (const s of scored) {
    const entry = formatScores.get(s.format) ?? { total: 0, count: 0 };
    entry.total += s.engagementScore!;
    entry.count += 1;
    formatScores.set(s.format, entry);
  }
  const topPerformingFormats = [...formatScores.entries()]
    .map(([format, { total, count }]) => ({ format, avg: total / count }))
    .sort((a, b) => b.avg - a.avg)
    .map((x) => x.format);

  // Keyword frequency weighted by engagement score (top-quartile posts only)
  const sortedByScore = [...scored].sort(
    (a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0),
  );
  const topQuartile = sortedByScore.slice(
    0,
    Math.max(1, Math.ceil(sortedByScore.length / 4)),
  );
  const keywordCounts = new Map<string, number>();
  for (const s of topQuartile) {
    for (const kw of s.keywords) {
      keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
    }
  }
  const topPerformingKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw]) => kw);

  return { topPerformingFormats, topPerformingKeywords };
}
