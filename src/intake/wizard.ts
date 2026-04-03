/**
 * Interactive intake wizard for the blog production agent.
 * Asks the user a series of multiple-choice questions via arrow-key selection
 * (@inquirer/prompts), then returns a structured IntakeAnswers object.
 */

import * as fs from 'fs';
import * as path from 'path';
import { select, input, confirm } from '@inquirer/prompts';
import { loadBrandGuide } from '../memory/brandVoice';
import { loadLibrary } from '../memory/contentLibrary';
import type { IntakeAnswers, WizardDefaults, WizardFormat, WizardLanguage, WizardTone, WizardWordCount } from './types';
import { TONE_LABELS, WORD_COUNT_RANGES } from './types';

const DEFAULTS_PATH = path.join(process.cwd(), 'memory', 'defaults.json');

// ---------------------------------------------------------------------------
// Defaults persistence
// ---------------------------------------------------------------------------

function loadDefaults(): WizardDefaults {
  try {
    if (fs.existsSync(DEFAULTS_PATH)) {
      return JSON.parse(fs.readFileSync(DEFAULTS_PATH, 'utf-8')) as WizardDefaults;
    }
  } catch {
    // Corrupt or missing file — proceed with empty defaults
  }
  return {};
}

function saveDefaults(answers: IntakeAnswers): void {
  const defaults: WizardDefaults = {
    format:           answers.format,
    language:         answers.language,
    tone:             answers.tone,
    wordCount:        answers.wordCount,
    generateAltFormat: answers.generateAltFormat,
  };
  fs.writeFileSync(DEFAULTS_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Duplicate detection (#10)
// ---------------------------------------------------------------------------

/**
 * Returns up to 3 existing library entries whose titles+keywords share
 * ≥3 words with the given topic (case-insensitive, ignores stop words).
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'be', 'how', 'what',
  'why', 'when', 'do', 'does', 'it', 'its', 'as', 'if', 'that', 'this',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

interface SimilarPost {
  title: string;
  publishedAt: string;
  overlap: number;
}

function findSimilarPosts(topic: string): SimilarPost[] {
  try {
    const library = loadLibrary();
    const topicTokens = tokenize(topic);
    const similar: SimilarPost[] = [];

    for (const entry of library) {
      const entryTokens = tokenize(
        `${entry.title} ${entry.keywords.join(' ')} ${entry.summary}`,
      );
      const overlap = [...topicTokens].filter((w) => entryTokens.has(w)).length;
      if (overlap >= 3) {
        similar.push({
          title: entry.title,
          publishedAt: entry.publishedAt.slice(0, 10),
          overlap,
        });
      }
    }

    return similar.sort((a, b) => b.overlap - a.overlap).slice(0, 3);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

export async function runWizard(): Promise<IntakeAnswers> {
  const defaults = loadDefaults();
  const brandGuide = loadBrandGuide();

  console.log('\n' + '='.repeat(50));
  console.log('  Blog Production Agent');
  console.log('='.repeat(50));
  console.log('  Answer a few questions to get started.');
  console.log('  Use arrow keys to select, Enter to confirm.\n');

  // ── 1. Topic ──────────────────────────────────────────────────────────────
  let topic = '';
  while (true) {
    topic = await input({
      message: 'What topic do you want to write about?',
      validate: (v) => v.trim().length > 0 || 'Please enter a topic.',
    });

    // Duplicate detection
    const similar = findSimilarPosts(topic);
    if (similar.length > 0) {
      console.log('');
      for (const post of similar) {
        console.log(`  ⚠  Similar post found: "${post.title}" (${post.publishedAt})`);
      }
      const proceed = await confirm({
        message: 'Continue with this topic anyway?',
        default: true,
      });
      if (proceed) break;
      // else: re-prompt for topic
      console.log('');
    } else {
      break;
    }
  }

  // ── 2. Format ─────────────────────────────────────────────────────────────
  const formatChoices: Array<{ name: string; value: WizardFormat; description?: string }> = [
    { value: 'agent-decide', name: 'Let the agent decide',  description: 'Uses your top-performing format from audience history, or defaults to explainer' },
    { value: 'explainer',    name: 'Explainer',             description: 'Explain a concept, trend, or topic in depth' },
    { value: 'how-to',       name: 'How-to',                description: 'Step-by-step guide for achieving a specific outcome' },
    { value: 'listicle',     name: 'Listicle',              description: 'Numbered list of tips, tools, or reasons' },
    { value: 'opinion',      name: 'Opinion',               description: 'Argue a point of view with evidence and a counterargument' },
    { value: 'case-study',   name: 'Case study',            description: 'Real-world example with context, approach, results, and lessons' },
  ];
  const format = await select<WizardFormat>({
    message: 'Format?',
    choices: formatChoices,
    default: defaults.format ?? 'agent-decide',
  });

  // ── 3. Language ───────────────────────────────────────────────────────────
  const languageChoices: Array<{ name: string; value: WizardLanguage; description?: string }> = [
    { value: 'en',   name: 'English only',              description: 'One post in English' },
    { value: 'tr',   name: 'Turkish only',              description: 'One post natively written in Turkish' },
    { value: 'both', name: 'Both English and Turkish',  description: 'Two independent posts — EN framed globally, TR tailored for Turkish audience' },
  ];
  const language = await select<WizardLanguage>({
    message: 'Language?',
    choices: languageChoices,
    default: defaults.language ?? 'en',
  });

  // ── 4. Tone ───────────────────────────────────────────────────────────────
  const toneChoices: Array<{ name: string; value: WizardTone; description?: string }> = [
    { value: 'informative',    name: 'Informative & analytical',   description: 'Data-backed, clear reasoning, authoritative but accessible' },
    { value: 'conversational', name: 'Conversational & personal',  description: 'Warm, story-led, written like a trusted friend explaining something' },
    { value: 'bold',           name: 'Bold & opinionated',         description: 'Takes a clear stance, challenges assumptions, confident voice' },
    { value: 'practical',      name: 'Practical & tactical',       description: 'Action-oriented, specific steps, no fluff' },
  ];
  const tone = await select<WizardTone>({
    message: 'Tone?',
    choices: toneChoices,
    default: defaults.tone ?? 'informative',
  });

  // ── 5. Target audience ────────────────────────────────────────────────────
  const audienceChoices: Array<{ name: string; value: 'default' | 'custom'; description?: string }> = [
    { value: 'default', name: `Use brand guide default`, description: `"${brandGuide.targetAudience}"` },
    { value: 'custom',  name: 'Customize...',             description: 'Describe a specific audience for this post' },
  ];
  const audienceChoice = await select<'default' | 'custom'>({
    message: 'Target audience?',
    choices: audienceChoices,
  });
  const targetAudience = audienceChoice === 'custom'
    ? await input({ message: 'Describe the target audience for this post:' })
    : undefined;

  // ── 6. Keywords ───────────────────────────────────────────────────────────
  const keywordChoices: Array<{ name: string; value: 'none' | 'custom'; description?: string }> = [
    { value: 'none',   name: 'Let the agent decide',  description: 'Agent derives keywords from the topic and research' },
    { value: 'custom', name: 'Add keywords',           description: 'Enter comma-separated keywords to prioritise in the post' },
  ];
  const keywordChoice = await select<'none' | 'custom'>({
    message: 'SEO keywords?',
    choices: keywordChoices,
  });
  let keywords: string[] | undefined;
  if (keywordChoice === 'custom') {
    const raw = await input({ message: 'Enter keywords, comma-separated:' });
    keywords = raw.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
  }

  // ── 7. Word count ─────────────────────────────────────────────────────────
  const wordCountChoices: Array<{ name: string; value: WizardWordCount }> = [
    { value: 'short',    name: `Short     ${WORD_COUNT_RANGES.short.label}` },
    { value: 'standard', name: `Standard  ${WORD_COUNT_RANGES.standard.label}` },
    { value: 'long',     name: `Long      ${WORD_COUNT_RANGES.long.label}` },
  ];
  const wordCount = await select<WizardWordCount>({
    message: 'Word count?',
    choices: wordCountChoices,
    default: defaults.wordCount ?? 'standard',
  });

  // ── 8. Alternative format (#8) ────────────────────────────────────────────
  const altFormatChoices: Array<{ name: string; value: boolean; description?: string }> = [
    { value: true,  name: 'Yes — produce a second version',  description: 'e.g. a listicle if the primary is an explainer (runs after the primary)' },
    { value: false, name: 'No — primary post only',          description: 'Skip the alternative format step' },
  ];
  const generateAltFormat = await select<boolean>({
    message: 'Generate alternative format?',
    choices: altFormatChoices,
    default: defaults.generateAltFormat ?? false,
  });

  // ── 9. Outline review (#7) ────────────────────────────────────────────────
  const reviewChoices: Array<{ name: string; value: boolean; description?: string }> = [
    { value: false, name: 'No — run fully automatically',       description: 'Agent writes without interruption' },
    { value: true,  name: 'Yes — pause after outline for review', description: 'See the section plan before writing starts' },
  ];
  const reviewOutline = await select<boolean>({
    message: 'Review outline before writing?',
    choices: reviewChoices,
    default: false,
  });

  const answers: IntakeAnswers = {
    topic, format, language, tone, targetAudience, keywords,
    wordCount, generateAltFormat, reviewOutline,
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('  Summary');
  console.log('─'.repeat(50));
  console.log(`  Topic:      ${topic}`);
  console.log(`  Format:     ${format === 'agent-decide' ? 'Let the agent decide' : format}`);
  console.log(`  Language:   ${{ en: 'English only', tr: 'Turkish only', both: 'English + Turkish' }[language]}`);
  console.log(`  Tone:       ${TONE_LABELS[tone]}`);
  console.log(`  Audience:   ${targetAudience ?? `${brandGuide.targetAudience} (default)`}`);
  console.log(`  Keywords:   ${keywords ? keywords.join(', ') : 'Agent decides'}`);
  console.log(`  Length:     ${WORD_COUNT_RANGES[wordCount].label}`);
  console.log(`  Alt format: ${generateAltFormat ? 'Yes' : 'No'}`);
  console.log(`  Review:     ${reviewOutline ? 'Pause after outline' : 'Fully automatic'}`);
  console.log('─'.repeat(50) + '\n');

  // ── Save defaults? ────────────────────────────────────────────────────────
  const wantsSave = await confirm({
    message: 'Save format, language, tone, word count, and alt-format preference as defaults?',
    default: false,
  });
  if (wantsSave) {
    saveDefaults(answers);
    console.log('  Defaults saved.\n');
  }

  // ── Start? ────────────────────────────────────────────────────────────────
  const wantsStart = await confirm({
    message: 'Start writing?',
    default: true,
  });
  if (!wantsStart) {
    console.log('\n  Cancelled.\n');
    process.exit(0);
  }

  return answers;
}

// ---------------------------------------------------------------------------
// Prompt serialiser
// ---------------------------------------------------------------------------

/**
 * Converts IntakeAnswers into a clean structured prompt string
 * that the coordinator can parse unambiguously.
 */
export function buildPromptString(answers: IntakeAnswers): string {
  const lines: string[] = [];

  lines.push(`Topic: ${answers.topic}`);

  if (answers.format === 'agent-decide') {
    lines.push('Format: let the agent decide (use audience model top format, or default to explainer)');
  } else {
    lines.push(`Format: ${answers.format}`);
  }

  const languageMap: Record<string, string> = {
    en:   'English only (en)',
    tr:   'Turkish only (tr)',
    both: 'both English and Turkish (en and tr)',
  };
  lines.push(`Language: ${languageMap[answers.language]}`);

  lines.push(`Tone: ${TONE_LABELS[answers.tone]}`);

  if (answers.targetAudience) {
    lines.push(`Target audience: ${answers.targetAudience}`);
  }

  if (answers.keywords && answers.keywords.length > 0) {
    lines.push(`Keywords: ${answers.keywords.join(', ')}`);
  }

  const wc = WORD_COUNT_RANGES[answers.wordCount];
  lines.push(`Word count: ${answers.wordCount} (${wc.min}–${wc.max} words)`);

  if (!answers.generateAltFormat) {
    lines.push('[SKIP_ALT_FORMAT]');
  }

  if (answers.reviewOutline) {
    lines.push('[PAUSE_AFTER_OUTLINE]');
  }

  return lines.join('\n');
}
