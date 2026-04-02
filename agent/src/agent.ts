/**
 * Entry point for the blog production research agent.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { confirm } from '@inquirer/prompts';

import { setupSession, TranscriptWriter } from './utils/transcript';
import { LLMSession } from './llm/client';
import { buildPipelineSetup, ensureOutputDirs } from './config/pipeline';
import { isAssistantMessage, processAssistantMessage } from './utils/messageHandler';
import { ProgressDisplay } from './utils/progressDisplay';
import { runWizard, buildPromptString } from './intake/wizard';
import type { SubagentTracker } from './utils/subagentTracker';

// Load environment variables from .env file
dotenv.config();

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
    // Run wizard loop: each iteration produces one blog post
    while (true) {
      // Intake wizard — collects all parameters with arrow-key prompts
      const answers = await runWizard();
      const prompt = buildPromptString(answers);

      // Create progress display for this run
      const display = new ProgressDisplay(answers.topic, answers.format, answers.language);
      const { baseOptions, tracker } = buildPipelineSetup(transcript, sessionDir, display);
      currentTracker = tracker;

      display.showHeader();
      transcript.writeToFile(`\n[Intake answers]\n${prompt}\n`);

      // Buffer coordinator text for post-run report
      let coordinatorReport = '';
      await llm.send(prompt, baseOptions, (msg) => {
        if (isAssistantMessage(msg)) {
          for (const block of msg.message.content) {
            if (block.type === 'text') coordinatorReport += block.text;
          }
          processAssistantMessage(msg, tracker, transcript, true);
        }
      });

      display.stop();
      display.showReport(coordinatorReport);
      transcript.writeToFile('\n[Run complete]\n');

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
