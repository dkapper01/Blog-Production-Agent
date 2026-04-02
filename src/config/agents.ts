/**
 * AgentDefinition objects for each specialist subagent.
 * Loaded once and passed into the coordinator's Options.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');

function loadPrompt(filename: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, filename), 'utf-8').trim();
}

export function buildAgentDefinitions(): Record<string, AgentDefinition> {
  return {
    researcher: {
      description:
        'Researches a single subtopic using web search. ' +
        'Writes a structured JSON file to files/research/{slug}.json containing ' +
        'facts, citations, and a prose summary. ' +
        'Use one researcher per subtopic for parallel coverage.',
      tools: ['WebSearch', 'WebFetch', 'Write'],
      prompt: loadPrompt('researcher.txt'),
      model: 'haiku',
    },

    outline: {
      description:
        'Reads all research JSON files from files/research/ and produces a structured ' +
        'blog outline in files/drafts/outline.json. The outline assigns specific facts ' +
        'and keywords to each section so the writer has a clear, SEO-informed structure ' +
        'to follow. Use after all researchers complete and before the writer.',
      tools: ['Glob', 'Read', 'Write'],
      prompt: loadPrompt('outline.txt'),
      model: 'sonnet',
    },

    writer: {
      description:
        'Reads all research JSON files from files/research/, synthesizes them into ' +
        'a well-structured blog post draft (Markdown), and writes it to ' +
        'files/drafts/draft.md along with metadata in files/drafts/draft-meta.json. ' +
        'Applies brand voice and hard constraints. Does NOT search the web.',
      tools: ['Glob', 'Read', 'Write'],
      prompt: loadPrompt('writer.txt'),
      model: 'sonnet',
    },

    seo: {
      description:
        'Analyzes the blog draft for SEO quality. Reads files/drafts/draft.md and ' +
        'files/drafts/draft-meta.json, checks keyword density, heading structure, ' +
        'and readability, and writes findings to files/drafts/seo-analysis.json. ' +
        'Does NOT rewrite the draft — produces a report only. ' +
        'Run concurrently with the editor after the writer completes.',
      tools: ['Read', 'Write'],
      prompt: loadPrompt('seo.txt'),
      model: 'haiku',
    },

    editor: {
      description:
        'Independently reviews the blog draft for quality, accuracy, brand voice, and flow. ' +
        'Receives ONLY files/drafts/draft.md and files/drafts/draft-meta.json — ' +
        'no research files, no job spec, no coordinator history. ' +
        'Produces files/drafts/editorial-report.json with a passScore (0–100), ' +
        'a list of issues with severity and suggestions, and factFlags for suspect claims. ' +
        'Use after the writer and before the publisher.',
      tools: ['Read', 'Write'],
      prompt: loadPrompt('editor.txt'),
      model: 'sonnet',
    },

    'brand-checker': {
      description:
        'Checks a blog draft for compliance with the brand guide hard constraints, ' +
        'soft preferences, and topic blocklist. Receives the draft path and brand-guide.json ' +
        'content inline — no research files, no voice guide, no coordinator history. ' +
        'Writes a brand-report.json with hardViolations, softAdvisories, and topicFlags. ' +
        'Run concurrently with the editor and SEO agent after the writer completes.',
      tools: ['Read', 'Write'],
      prompt: loadPrompt('brand-checker.txt'),
      model: 'haiku',
    },

    publisher: {
      description:
        'Reads the draft from files/drafts/draft.md and draft-meta.json, ' +
        'applies final formatting, writes the finished post to ' +
        'files/output/{date}-{slug}.md, and appends an entry to ' +
        'memory/content-library.json. ' +
        'Use after the writer has completed its draft.',
      tools: ['Glob', 'Read', 'Write'],
      prompt: loadPrompt('publisher.txt'),
      model: 'haiku',
    },
  };
}
