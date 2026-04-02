/**
 * Entry point for the blog production research agent.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { confirm, input } from '@inquirer/prompts';

import { setupSession, TranscriptWriter } from './utils/transcript';
import { LLMSession } from './llm/client';
import {
  buildPipelineSetup,
  ensureOutputDirs,
  clearRunFiles,
  loadCheckpoint,
  deleteCheckpoint,
} from './config/pipeline';
import { isAssistantMessage, processAssistantMessage } from './utils/messageHandler';
import { ProgressDisplay } from './utils/progressDisplay';
import { runWizard, buildPromptString } from './intake/wizard';
import { loadStageTiming } from './utils/logParser';
import { loadAudienceModel, saveAudienceModel, deriveInsights } from './memory/audienceModel';
import type { SubagentTracker } from './utils/subagentTracker';

// Load environment variables from .env file
dotenv.config();

const LOGS_DIR = path.join(process.cwd(), 'logs');

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\nError: ANTHROPIC_API_KEY not found.');
    console.log('Set it in a .env file or export it in your shell.');
    console.log('Get your key at: https://console.anthropic.com/settings/keys\n');
    return;
  }

  // Ensure output directories exist
  ensureOutputDirs();

  // Setup session logging
  const [transcriptFile, sessionDir] = setupSession();
  const transcript = new TranscriptWriter(transcriptFile);

  // LLM session manages multi-turn continuity
  const llm = new LLMSession();

  // Track current run's tracker for SIGINT cleanup
  let currentTracker: SubagentTracker | null = null;

  const cleanup = () => {
    transcript.writeToFile('\n\nGoodbye!\n');
    transcript.close();
    if (currentTracker) currentTracker.close();
    console.log(`\nSession logs saved to: ${sessionDir}`);
    console.log(`  Transcript:  ${transcriptFile}`);
    console.log(`  Tool calls:  ${path.join(sessionDir, 'tool_calls.jsonl')}`);
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  try {
    // ── Checkpoint check (#2) ───────────────────────────────────────────────
    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      console.log(`\n  Incomplete run found: "${checkpoint.runTopic}" (stopped after ${checkpoint.stage})`);
      const resume = await confirm({ message: 'Resume from checkpoint?', default: true });
      if (!resume) {
        deleteCheckpoint();
        llm.reset();
      }
    }

    // ── Load real timing data for progress estimates (#9) ──────────────────
    const timingOverrides = loadStageTiming(LOGS_DIR);

    // Run wizard loop: each iteration produces one blog post
    while (true) {
      // Intake wizard — collects all parameters with arrow-key prompts
      const answers = await runWizard();
      let prompt = buildPromptString(answers);

      // Inject checkpoint context if resuming (#2)
      if (checkpoint) {
        prompt =
          `CHECKPOINT: Previous run for topic "${checkpoint.runTopic}" completed through ` +
          `${checkpoint.stage}. Resume from the next stage.\n\n${prompt}`;
      }

      // Clear stale files from previous run (#1)
      clearRunFiles();

      // Create progress display for this run (#9 — timing overrides applied)
      const display = new ProgressDisplay(
        answers.topic,
        answers.format,
        answers.language,
        timingOverrides,
      );
      const { baseOptions, tracker } = buildPipelineSetup(transcript, sessionDir, display);
      currentTracker = tracker;

      display.showHeader();
      transcript.writeToFile(`\n[Intake answers]\n${prompt}\n`);

      let coordinatorReport = '';

      const runTurn = async (p: string): Promise<void> => {
        await llm.send(p, baseOptions, (msg) => {
          if (isAssistantMessage(msg)) {
            for (const block of msg.message.content) {
              if (block.type === 'text') coordinatorReport += block.text;
            }
            processAssistantMessage(msg, tracker, transcript, true);
          }
        });
      };

      await runTurn(prompt);

      // ── Outline review multi-turn (#7) ────────────────────────────────────
      if (answers.reviewOutline && coordinatorReport.includes('[AWAITING_OUTLINE_APPROVAL]')) {
        display.stop();

        // Show the outline text that preceded the marker
        const markerIdx = coordinatorReport.indexOf('[AWAITING_OUTLINE_APPROVAL]');
        const outlineText = coordinatorReport.slice(0, markerIdx).trim();
        console.log('\n' + '─'.repeat(50));
        console.log('  Outline ready for review');
        console.log('─'.repeat(50));
        console.log(outlineText);
        console.log('─'.repeat(50) + '\n');

        const proceed = await confirm({ message: 'Proceed with writing?', default: true });

        if (!proceed) {
          console.log('\n  Run cancelled at outline review.\n');
          transcript.writeToFile('\n[Cancelled at outline review]\n');
          deleteCheckpoint();
          llm.reset();
          break;
        }

        // Resume from Step 5
        coordinatorReport = '';
        display.showHeader();
        await runTurn('Outline approved. Please continue from Step 5.');
      }

      display.stop();
      display.showReport(coordinatorReport);
      transcript.writeToFile('\n[Run complete]\n');

      // ── Engagement score prompt (#11) ─────────────────────────────────────
      const ratingRaw = await input({
        message: "Rate this post's performance (1–5, or Enter to skip):",
        default: '',
      });
      const rating = ratingRaw.trim();
      if (rating && /^[1-5]$/.test(rating)) {
        const score = parseInt(rating, 10);
        const model = loadAudienceModel();
        if (model.signals.length > 0) {
          const latest = model.signals[model.signals.length - 1];
          latest.engagementScore = score;
          const derived = deriveInsights(model.signals);
          model.topPerformingFormats = derived.topPerformingFormats;
          model.topPerformingKeywords = derived.topPerformingKeywords;
          model.lastUpdated = new Date().toISOString();
          saveAudienceModel(model);
          console.log(`  Score saved for "${latest.postTitle ?? latest.postSlug}".\n`);
        }
      }

      // Clean up checkpoint and session after a completed run
      deleteCheckpoint();
      llm.reset();

      // After the run, offer to write another post
      const another = await confirm({
        message: 'Write another post?',
        default: false,
      });
      if (!another) break;

      console.log(''); // spacing before next wizard run
    }
  } finally {
    cleanup();
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
