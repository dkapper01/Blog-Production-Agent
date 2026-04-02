# Blog Production Agent — User Guide

*A step-by-step guide for creating research-backed blog posts from a single topic request.*

---

## Table of Contents

1. [What this tool does](#1-what-this-tool-does)
2. [One-time setup](#2-one-time-setup)
3. [Starting a session](#3-starting-a-session)
4. [Writing a good topic request](#4-writing-a-good-topic-request)
   - [4a. Dual-language posts (English + Turkish)](#4a-dual-language-posts-english--turkish)
5. [What happens while the agent runs](#5-what-happens-while-the-agent-runs)
6. [Your output files — what you get](#6-your-output-files--what-you-get)
7. [Customizing the brand and voice](#7-customizing-the-brand-and-voice)
8. [The content library — your publishing history](#8-the-content-library--your-publishing-history)
9. [Session logs](#9-session-logs)
10. [Troubleshooting](#10-troubleshooting)
11. [Tips for best results](#11-tips-for-best-results)

---

## 1. What this tool does

You give it a topic. It does the rest.

The Blog Production Agent researches your topic from multiple angles, writes a full blog post in your brand voice, checks it for quality and accuracy, and delivers a ready-to-publish package that includes:

- A complete, well-researched blog post (800–2,500 words, depending on the length you choose)
- A second version of the same post in a different format (e.g., a listicle if the first was an explainer)
- Ready-to-post copy for LinkedIn, Twitter, and Substack
- An email teaser with subject line and preview text
- Two headline and meta-description variants for A/B testing on your website

Every claim in the post is backed by a real source. References appear at the bottom of each post as numbered, linked citations.

The agent also learns over time. Each post it produces updates its understanding of which formats and topics perform best for your audience — so future posts improve automatically as the signal builds up.

---

## 2. One-time setup

These steps only need to be done once, the first time you use the tool.

### 2a. Get an API key

The agent uses Claude (an AI model by Anthropic) to do its work. You need an API key to access it.

1. Go to **console.anthropic.com**
2. Sign in or create an account
3. Navigate to **Settings → API Keys**
4. Click **Create Key**, give it a name, and copy the key

### 2b. Add your API key to the project

1. Open the `ts` folder of this project
2. Find the file named `.env` (if it doesn't exist, create a new file with that exact name)
3. Add this line to the file, replacing `your-key-here` with the key you copied:

```
ANTHROPIC_API_KEY=your-key-here
```

4. Save the file

> **Important:** Never share your `.env` file or your API key with anyone. Treat it like a password.

### 2c. Install the dependencies

Open a terminal, navigate to the `ts` folder, and run:

```
npm install
```

This downloads everything the agent needs to work. It only takes a minute and only needs to be done once (or again if you update the project).

---

## 3. Starting a session

1. Open a terminal
2. Navigate to the `ts` folder
3. Run:

```
npm start
```

The agent opens with a welcome screen and immediately starts the intake wizard — a short series of questions to configure your post. Use the **arrow keys** to move between options and **Enter** to confirm each answer.

```
==================================================
  Blog Production Agent
==================================================
  Answer a few questions to get started.
  Use arrow keys to select, Enter to confirm.

? What topic do you want to write about? › _
```

After you type your topic and press Enter, the remaining questions appear one at a time:

```
? Format?
❯ Let the agent decide
  Explainer — explain a concept or trend
  How-to — step-by-step guide
  Listicle — numbered list of tips/tools
  Opinion — argue a point of view
  Case study — real-world example

? Language?
❯ English only
  Turkish only
  Both English and Turkish

? Tone?
❯ Informative & analytical
  Conversational & personal
  Bold & opinionated
  Practical & tactical

? Target audience?
❯ Use brand guide default
  Customize...

? SEO keywords?
❯ Let the agent decide
  Add keywords

? Word count?
  Short     (~800–1,200 words)
❯ Standard  (~1,200–2,000 words)
  Long      (~2,000–2,500 words)
```

Once you've answered all questions, the wizard shows a summary:

```
──────────────────────────────────────────────────
  Summary
──────────────────────────────────────────────────
  Topic:    The rise of AI in Turkish startups
  Format:   explainer
  Language: English + Turkish
  Tone:     informative and analytical
  Audience: Technical professionals... (default)
  Keywords: Agent decides
  Length:   ~1,200–2,000 words
──────────────────────────────────────────────────

? Save format, language, tone, and word count as your defaults? › No
? Start writing? › Yes
```

The agent then runs the full pipeline automatically. You don't need to do anything until it finishes and reports back.

### Writing another post

After each run completes, the agent asks:

```
? Write another post? › No
```

Select **Yes** to run the wizard again for a new post in the same session. Select **No** (or press **Ctrl+C** at any time) to exit. The agent saves the session log before closing.

### Defaults

The wizard remembers your preferred **format**, **language**, **tone**, and **word count** between sessions. The first time you run, these are pre-set to sensible values (let the agent decide the format, English, informative, standard length). After any run you can choose "Save as defaults" to update them — your selections will be pre-highlighted the next time you open the wizard.

---

## 4. Choosing a topic

The only free-text question in the wizard is the topic. Everything else — format, language, tone, audience, keywords, word count — is selected from a menu.

**Tips for a good topic:**

- **Be specific.** "AI tools for small businesses" will produce a broad survey. "How small e-commerce businesses are using AI to reduce customer service costs" will produce a focused, usable post.
- **Name the outcome or the question.** A topic framed as a question ("Is remote work hurting junior employees?") gives the agent a clear thesis to build around.
- **Don't include format instructions in the topic.** The format question handles that. Just describe what the post should be *about*.

**Examples:**

```
The rise of AI assessment tools in hiring
Four-day work weeks: what the research actually shows
How Turkish startups are competing with European tech companies
Burnout prevention for early-stage founders
```

---

## 4a. Dual-language posts (English + Turkish)

The agent can produce two complete, independently written posts from a single research run — one in English and one in Turkish. The Turkish version is written natively for a Turkish audience, not translated from the English post.

### How to request it

In the wizard, when the **Language** question appears, select **Both English and Turkish**:

```
? Language?
  English only
  Turkish only
❯ Both English and Turkish
```

### What "natively written" means

The two posts are not the same content in two languages. The agent produces two separate editorial plans (outlines) from the same research:

- The **English post** is framed for a global professional audience
- The **Turkish post** is framed for a Turkish professional audience — it prefers Turkey-specific data points from the research, uses Turkish company examples where relevant (Patika.dev, Trendyol, the Istanbul startup ecosystem), and asks the questions a Turkish reader actually has

The core ideas, facts, and argument are the same. The examples, framing, and cultural references differ.

### What you get

A dual-language run produces double the output — one complete package per language:

**English:**
```
files/output/
  2026-04-02-{topic}.md
  2026-04-02-{topic}-social.json
  2026-04-02-{topic}-email.json
  2026-04-02-{topic}-variants.json
  2026-04-02-{topic}-listicle.md       ← alternative format
  2026-04-02-{topic}-listicle-social.json
  ...
```

**Turkish (`-tr` suffix):**
```
files/output/
  2026-04-02-{topic}-tr.md
  2026-04-02-{topic}-tr-social.json
  2026-04-02-{topic}-tr-email.json
  2026-04-02-{topic}-tr-variants.json
  2026-04-02-{topic}-tr-listicle.md    ← alternative format in Turkish
  ...
```

The Turkish social snippets, email teaser, and A/B variants are all written in Turkish in Gülcan's Turkish voice — flowing sentences, rhetorical questions, the warmth and self-deprecating humor characteristic of her Turkish writing.

### What takes longer

A dual-language run does more work. The research phase is the same length, but every subsequent stage runs twice (two outlines, two drafts, two editorial reviews, two publishers, two alternative formats). Expect roughly double the runtime of a single-language run.

### Editorial independence

The two posts go through separate editorial reviews. If the Turkish draft scores below the threshold and needs revision, the English post is not held up — it proceeds to publishing on its own. If one language fails completely (scores below 65 after a full rewrite), the agent publishes the passing language and reports the failure for the other.

---

## 5. What happens while the agent runs

After you press Enter, the agent runs a multi-stage process. This is entirely automatic — you don't need to do anything until it finishes. Here is what is happening at each stage:

### Stage 1 — Planning (seconds)
The agent reads your request and breaks the topic into 3–5 focused angles to research. It also reads your brand configuration and voice guide to know how to write for you.

### Stage 2 — Research (1–3 minutes)
The agent researches each angle simultaneously — gathering facts, statistics, and sources from across the web. Each researcher saves its findings to a file in `files/research/`. Every fact gets a confidence rating so the agent knows which claims are well-supported and which need hedging.

### Stage 3 — Outline (30–60 seconds)
A dedicated outline agent reads all the research and builds a structured plan for the post: section headings, key points, which facts belong where, and which keywords to place in each section.

### Stage 4 — Writing (1–2 minutes)
The writer reads the outline and the research and writes the full draft. It also produces a `citations.json` file that maps every claim in the post back to its source, and a `draft-meta.json` file with the post's title, slug, word count, and other metadata.

### Stage 5 — Editorial review (30–60 seconds)
Two reviewers run simultaneously:

- **The editor** reads only the draft — no research, no brand guide. This gives it an independent perspective, like a fresh pair of eyes. It scores the post on clarity, accuracy, brand voice, and flow (0–100). Scores below 85 trigger automatic rework — either a targeted revision (65–84) or a full re-draft (<65). See Stage 6 for details.
- **The SEO reviewer** checks keyword coverage, heading structure, and readability, and suggests meta descriptions.

### Stage 6 — Revisions (if needed)
If the editorial score is 65–84, the agent revises the draft and re-runs the editorial review. It does this at most twice before proceeding. If the score is below 65 on a first attempt, it rewrites the post from scratch. The agent will not publish a post that scores below 65 after a full rewrite.

> If the editor finds any factual claims it cannot verify and considers them high-risk, the agent will pause and ask you whether to continue before publishing.

### Stage 7 — Publishing the primary post (30–60 seconds)
The publisher takes the finished draft and produces all the output files: the final post, social snippets, email teaser, and A/B headline variants. It also updates the content library and audience model.

### Stage 8 — Alternative format (1–2 minutes)
Using the same research, the agent produces a second version of the post in a different format:
- If the primary was an explainer, opinion piece, or case study → the alternative is a **listicle**
- If the primary was a how-to → the alternative is a **listicle**
- If the primary was a listicle → the alternative is a **how-to**

This second version skips the editorial review loop — it's derivative content, so one pass is enough.

### Stage 9 — Voice guide update and final report
If the post scored 85 or above, the agent extracts the best paragraph from the draft and appends it as a new example to `memory/gulcan-voice.md`. In a dual-language run, both the English and Turkish post can each contribute an example.

The agent then prints a summary to the terminal showing all output file paths, word count, editorial score, SEO coverage, and the opening line of the LinkedIn post.

---

## 6. Your output files — what you get

All output files are saved to the `files/output/` folder. Every file for one post shares the same date and slug prefix — for example, a post about AI hiring tools published on 1 April 2026 would produce:

```
files/output/
  2026-04-01-best-ai-assessment-tools-for-employers.md
  2026-04-01-best-ai-assessment-tools-for-employers-social.json
  2026-04-01-best-ai-assessment-tools-for-employers-email.json
  2026-04-01-best-ai-assessment-tools-for-employers-variants.json
  2026-04-01-best-ai-assessment-tools-for-employers-listicle.md
  2026-04-01-best-ai-assessment-tools-for-employers-listicle-social.json
  2026-04-01-best-ai-assessment-tools-for-employers-listicle-email.json
  2026-04-01-best-ai-assessment-tools-for-employers-listicle-variants.json
```

### The blog post (`.md`)

A Markdown file ready to paste into your CMS (WordPress, Webflow, Ghost, Substack, etc.). It contains:

- **Front matter** — structured metadata at the top (title, date, summary, keywords, word count)
- **The post body** — exactly as the writer produced it, never modified after the editorial pass
- **References** — a numbered, linked list of every source cited in the post

### Social snippets (`-social.json`)

Ready-to-post copy for three platforms, all written in your voice:

- **LinkedIn** — 150–300 words, personal opening hook, ends with a question or call to action
- **Twitter** — a single punchy sentence under 280 characters to open a thread
- **Substack** — 2–3 warm sentences for a Substack Note, ends with a link placeholder (`CTA_URL`)

Replace `CTA_URL` with the live URL once the post is published.

### Email teaser (`-email.json`)

Contains everything you need for a newsletter send:

- **Subject line** — 60 characters max, factual and specific
- **Preview text** — 90 characters max, shown in the inbox before the reader opens
- **Body** — 3–5 sentences in your voice
- **CTA text and URL** — replace `CTA_URL` with the live link

### A/B variants (`-variants.json`)

Two headline and meta-description combinations for testing different angles on your website or newsletter:

- **Variant A** — the published title and meta
- **Variant B** — a genuinely different angle (a surprising statistic, a contrarian take, a question, or outcome-led framing)

Use these to run a simple split test on your homepage hero or email subject line.

---

## 7. Customizing the brand and voice

The agent's writing is controlled by two files in the `memory/` folder. You can edit these at any time — the agent reads them fresh at the start of every run.

### `memory/brand-guide.json`

This file defines the factual and structural rules for every post. Open it in any text editor to change:

| Setting | What it controls |
|---|---|
| `voice` | One-sentence description of your brand's writing style |
| `tone` | A list of tone words (e.g. `"analytical"`, `"direct"`, `"warm"`) |
| `targetAudience` | Who the posts are written for |
| `hardConstraints` | Rules the agent must never break (e.g. always cite sources) |
| `softPreferences` | Guidelines the agent should follow when possible |
| `avoidTopics` | Topics the agent will refuse to write about |
| `preferredWordCount` | Minimum and maximum word count for posts |

**Example — changing the target audience:**
```json
"targetAudience": "Founders and operators at early-stage B2B startups"
```

**Example — adjusting word count:**
```json
"preferredWordCount": { "min": 800, "max": 1500 }
```

### `memory/gulcan-voice.md`

This is the detailed voice profile the agent uses when writing posts and social content. It describes:

- How posts should open
- The type of personal details and vulnerability to include
- Humor style and where to use it
- Language patterns in both English and Turkish
- Structural patterns by format (long-form, LinkedIn, etc.)
- Anti-patterns — specific phrases and habits to avoid

Edit this file to match your actual writing style. The more specific and personal it is, the better the agent will mimic your voice. You can add your own writing samples as examples.

The `## Examples` section at the bottom of the file is populated automatically — every time a post scores 85 or above, the agent appends the best paragraph from that post as a real example for future reference. You don't need to manage this section manually.

---

## 8. The content library — your publishing history

Every post the agent publishes is registered in `memory/content-library.json`. This file is a running record of everything produced, including:

- Title, slug, and summary
- Keywords used
- Date published
- Path to the output file
- Word count and citation count

You don't need to edit this file. The agent maintains it automatically. You can open it to browse your publishing history or to check whether a topic has already been covered.

### Audience signals

The agent also maintains `memory/audience-model.json`. Each time a post is published, the agent adds an entry to this file recording the format, keywords, and publish date.

Once you start tracking engagement on your published posts, you can manually add an `engagementScore` (a number from 0–100) to each entry. The agent will use this data to automatically prefer formats and keywords that perform well with your audience.

**Example — adding an engagement score after a post goes live:**

Open `memory/audience-model.json` and find the entry for the post:

```json
{
  "postSlug": "best-ai-assessment-tools-for-employers",
  "format": "explainer",
  "keywords": ["AI assessment tools", "AI hiring tools"],
  "publishedAt": "2026-04-01T12:00:00.000Z",
  "engagementScore": 82,
  "notes": "Strong LinkedIn shares, lower email open rate"
}
```

Add `"engagementScore"` and optionally `"notes"`. Save the file. The agent will factor this in on the next run.

---

## 9. Session logs

Every time you run the agent, it saves a log of the full session to the `logs/` folder. Each session gets its own folder named with the date and time:

```
logs/
  session_20260401_143022/
    transcript.txt      ← full conversation with the agent
    tool_calls.jsonl    ← detailed record of every action taken
```

The transcript is a plain-text file you can open in any editor. The tool calls file is more technical — it records every file read, file written, and web search the agent performed. You generally won't need to look at it, but it's useful if something unexpected happened and you want to understand what the agent did.

---

## 10. Troubleshooting

### "ANTHROPIC_API_KEY not found"

The agent cannot find your API key. Check that:
1. The file `agent/.env` exists
2. It contains a line that starts with `ANTHROPIC_API_KEY=`
3. The key itself is correct — no extra spaces, no quotes around the value

### The agent stops mid-run with an error message

The agent will print a clear description of what failed and at which stage. Common causes:

- **Network issue** — The agent retries automatically on temporary connection errors. If it fails after multiple retries, check your internet connection and try again.
- **API rate limit** — If you run the agent many times in quick succession, you may hit Anthropic's rate limits. Wait a minute and try again.
- **File not found** — If the agent says it can't find `memory/brand-guide.json` or `memory/gulcan-voice.md`, make sure those files exist in the `agent/memory/` folder.

### The agent pauses and asks about "factual flags"

The editor found one or more claims in the draft that it considers potentially unverifiable or risky. The agent will describe each flagged claim and ask whether to continue.

- If you recognise the claim and trust it, type `continue` to proceed to publishing.
- If you're unsure, type `stop` to abort the run. You can then review the draft at `files/drafts/draft.md` and the editorial report at `files/drafts/editorial-report.json` before deciding what to do.

### The post doesn't sound like my voice

The agent writes in the style described in `memory/gulcan-voice.md`. If the output doesn't feel right:

1. Open `memory/gulcan-voice.md`
2. Look at the **Anti-Patterns** section — add any phrases or habits you want to explicitly avoid
3. Look at the **Examples** section — paste in one or two paragraphs you've actually written as concrete examples of your voice
4. Be specific: "uses 1–2 rhetorical questions per section" is more useful than "sounds conversational"

The more specific and personal the voice guide, the more accurately the agent will write in your style. Every high-scoring post also adds an example automatically, so the guide improves with use.

### The output folder is empty

If the agent completed but nothing appeared in `files/output/`, check:
1. The editorial score — if it fell below 65 after a full rewrite, the agent will refuse to publish and will have reported this in the terminal
2. The session transcript in `logs/` for details on what happened

---

## 11. Tips for best results

**Be specific about your topic.** Vague topics produce vague posts. "AI in healthcare" will produce a broad survey. "How AI-assisted diagnostics are reducing misdiagnosis rates in radiology" will produce a focused, usable piece.

**Name the audience.** "For HR managers evaluating new tools" tells the agent who it's writing for and shapes every word choice, example, and recommendation.

**Specify keywords only when you mean it.** The agent will place every keyword you give it somewhere in the post. Don't give it ten keywords for a 1,500-word article — three or four focused terms is plenty.

**Add engagement scores.** The audience model only becomes valuable when you give it feedback. After your posts go live, take five minutes to add scores to `memory/audience-model.json`. Over time, the agent will automatically favour the formats and topics that actually drive results.

**Let the voice guide grow.** When a post comes out well, you'll see it added to the Examples section of `memory/gulcan-voice.md` automatically. You can also add your own writing samples at any time — pasting in a paragraph or two from your best LinkedIn posts or a Substack note you were proud of goes a long way.

**Don't edit the draft before checking the editorial report.** The draft is at `files/drafts/draft.md` and the editorial report is at `files/drafts/editorial-report.json`. If you want to understand why the agent made certain choices — or why a section was flagged — read those before making manual edits.

**Run it again with a different format.** If you get an explainer and want to try the same topic as a how-to, just run the agent again and specify the format in your request. The research stage is quick — it will re-research the topic and produce a structurally different post.

---

*For issues or feedback, check the session logs in the `logs/` folder — they contain a full record of what the agent did and any errors it encountered.*
