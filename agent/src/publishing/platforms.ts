/**
 * Platform publishing stubs.
 *
 * Each function reads the relevant output file produced by the publisher agent
 * and would post it to the target platform. Currently stubbed — no live API
 * calls are made. Wire up real implementations by replacing the stub body.
 *
 * To connect a platform:
 *   1. Add credentials to .env (e.g. LINKEDIN_ACCESS_TOKEN, SUBSTACK_API_KEY)
 *   2. Replace the stub body with actual HTTP calls
 *   3. The return type (PlatformPublishResult) is the contract — keep it
 */

import * as fs from 'fs';
import type { PlatformPublishResult, SocialSnippetSet, EmailTeaser } from '../schemas';

// ---------------------------------------------------------------------------
// LinkedIn
// ---------------------------------------------------------------------------

/**
 * Publishes the LinkedIn snippet from a social snippets file.
 *
 * @param socialFilePath  Path to files/output/{date}-{slug}-social.json
 * @param config          Platform-specific config (e.g. { pageUrn: 'urn:li:...' })
 */
export async function publishToLinkedIn(
  socialFilePath: string,
  config: Record<string, string> = {},
): Promise<PlatformPublishResult> {
  const raw = fs.readFileSync(socialFilePath, 'utf-8');
  const snippets = JSON.parse(raw) as SocialSnippetSet;
  const linkedin = snippets.snippets.find((s) => s.platform === 'linkedin');

  if (!linkedin) {
    return {
      platform: 'linkedin',
      success: false,
      message: 'No LinkedIn snippet found in social file.',
      publishedAt: new Date().toISOString(),
    };
  }

  // TODO: replace with real LinkedIn API call
  // Example:
  //   const token = process.env.LINKEDIN_ACCESS_TOKEN;
  //   const pageUrn = config.pageUrn;
  //   await fetch('https://api.linkedin.com/v2/ugcPosts', { ... })
  console.log('[platforms] LinkedIn stub — would post:', linkedin.text.slice(0, 80) + '…');
  void config; // suppress unused-variable warning until wired up

  return {
    platform: 'linkedin',
    success: false,
    message: 'LinkedIn publishing is not yet configured. Add LINKEDIN_ACCESS_TOKEN to .env and implement the stub in src/publishing/platforms.ts.',
    publishedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Substack
// ---------------------------------------------------------------------------

/**
 * Publishes the Substack note from a social snippets file.
 *
 * @param socialFilePath  Path to files/output/{date}-{slug}-social.json
 * @param config          Platform-specific config (e.g. { publicationId: '...' })
 */
export async function publishToSubstack(
  socialFilePath: string,
  config: Record<string, string> = {},
): Promise<PlatformPublishResult> {
  const raw = fs.readFileSync(socialFilePath, 'utf-8');
  const snippets = JSON.parse(raw) as SocialSnippetSet;
  const substack = snippets.snippets.find((s) => s.platform === 'substack');

  if (!substack) {
    return {
      platform: 'substack',
      success: false,
      message: 'No Substack snippet found in social file.',
      publishedAt: new Date().toISOString(),
    };
  }

  // TODO: replace with real Substack API call
  // Example:
  //   const apiKey = process.env.SUBSTACK_API_KEY;
  //   const publicationId = config.publicationId;
  //   await fetch(`https://substack.com/api/v1/publication/${publicationId}/notes`, { ... })
  console.log('[platforms] Substack stub — would post:', substack.text.slice(0, 80) + '…');
  void config;

  return {
    platform: 'substack',
    success: false,
    message: 'Substack publishing is not yet configured. Add SUBSTACK_API_KEY to .env and implement the stub in src/publishing/platforms.ts.',
    publishedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Email campaign
// ---------------------------------------------------------------------------

/**
 * Sends the email teaser to the configured email provider (e.g. Mailchimp, ConvertKit).
 *
 * @param emailFilePath  Path to files/output/{date}-{slug}-email.json
 * @param config         Platform-specific config (e.g. { listId: '...', campaignName: '...' })
 */
export async function sendEmailCampaign(
  emailFilePath: string,
  config: Record<string, string> = {},
): Promise<PlatformPublishResult> {
  const raw = fs.readFileSync(emailFilePath, 'utf-8');
  const teaser = JSON.parse(raw) as EmailTeaser;

  // TODO: replace with real email provider API call
  // Example (Mailchimp):
  //   const apiKey = process.env.MAILCHIMP_API_KEY;
  //   const listId = config.listId;
  //   await fetch(`https://usX.api.mailchimp.com/3.0/campaigns`, { ... })
  console.log('[platforms] Email stub — subject:', teaser.subjectLine);
  void config;

  return {
    platform: 'email',
    success: false,
    message: 'Email publishing is not yet configured. Add your email provider API key to .env and implement the stub in src/publishing/platforms.ts.',
    publishedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Routes a publish target to the correct stub function.
 * Called by the coordinator after both primary and alternative publishers complete.
 */
export async function dispatchPublish(
  platform: 'linkedin' | 'substack' | 'email',
  socialFilePath: string,
  emailFilePath: string,
  config: Record<string, string> = {},
): Promise<PlatformPublishResult> {
  switch (platform) {
    case 'linkedin':
      return publishToLinkedIn(socialFilePath, config);
    case 'substack':
      return publishToSubstack(socialFilePath, config);
    case 'email':
      return sendEmailCampaign(emailFilePath, config);
  }
}
