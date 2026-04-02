/**
 * Types for the interactive intake wizard.
 * These are UI-layer types — they live here rather than in schemas/index.ts
 * because they describe wizard state, not pipeline contracts.
 */

import type { PostFormat } from '../schemas';

/** Format choice, with 'agent-decide' as the "let the model choose" option */
export type WizardFormat = PostFormat | 'agent-decide';

/** Language selection in the wizard */
export type WizardLanguage = 'en' | 'tr' | 'both';

/** Tone presets exposed to the user */
export type WizardTone = 'informative' | 'conversational' | 'bold' | 'practical';

/** Word count tier */
export type WizardWordCount = 'short' | 'standard' | 'long';

/** Word count ranges mapped from WizardWordCount */
export const WORD_COUNT_RANGES: Record<WizardWordCount, { min: number; max: number; label: string }> = {
  short:    { min: 800,  max: 1200, label: '~800–1,200 words' },
  standard: { min: 1200, max: 2000, label: '~1,200–2,000 words' },
  long:     { min: 2000, max: 2500, label: '~2,000–2,500 words' },
};

/** Tone descriptions passed to the coordinator */
export const TONE_LABELS: Record<WizardTone, string> = {
  informative:    'informative and analytical',
  conversational: 'conversational and personal',
  bold:           'bold and opinionated',
  practical:      'practical and tactical',
};

/**
 * Saved defaults — persisted to memory/defaults.json.
 * Only wizard-controlled fields that are worth remembering across sessions.
 * Topic, audience, and keywords are intentionally excluded (they change every time).
 */
export interface WizardDefaults {
  format?: WizardFormat;
  language?: WizardLanguage;
  tone?: WizardTone;
  wordCount?: WizardWordCount;
}

/**
 * The full set of answers collected by the wizard for one post run.
 */
export interface IntakeAnswers {
  topic: string;
  format: WizardFormat;
  language: WizardLanguage;
  tone: WizardTone;
  /** undefined = use brand guide default */
  targetAudience?: string;
  /** undefined = let the agent decide */
  keywords?: string[];
  wordCount: WizardWordCount;
}
