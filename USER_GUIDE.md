# Blog Production Agent — User Guide

*A plain-language guide to creating research-backed blog posts using the Blog Production Agent.*

---

## Table of Contents

1. [What this tool does](#1-what-this-tool-does)
2. [How to start](#2-how-to-start)
3. [Select your brand](#3-select-your-brand)
4. [How to ask for a post](#4-how-to-ask-for-a-post)
   - [4a. Write about a URL or article](#4a-write-about-a-url-or-article)
   - [4b. Write in Turkish or both languages](#4b-write-in-turkish-or-both-languages)
   - [4c. Use SEO keyword research](#4c-use-seo-keyword-research)
5. [What happens while the agent runs](#5-what-happens-while-the-agent-runs)
6. [Your output files — what you get](#6-your-output-files--what-you-get)
7. [Reviewing and rating a post](#7-reviewing-and-rating-a-post)
8. [Setting up a brand](#8-setting-up-a-brand)
9. [Tips for best results](#9-tips-for-best-results)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What this tool does

You describe what you want to write. The agent does the research, writing, and quality review — then delivers a ready-to-publish package.

Each run produces:

- A complete blog post (800–2,500 words) in your brand voice
- A second version in a different format (e.g. a listicle version of an explainer)
- Ready-to-post copy for LinkedIn, Twitter, and Substack
- An email newsletter teaser with subject line and preview text
- Two headline and meta-description variants for A/B testing

Every factual claim is cited. The agent also learns over time — each post updates its understanding of what performs best for your audience.

---

## 2. How to start

1. Open **Claude Code** on your computer
2. Navigate to this project folder
3. Start talking — no setup, no commands, no API key needed

The agent is always ready. Just type what you want.

---

## 3. Select your brand

Every session starts with a brand selection menu. The agent will always ask this first:

```
─────────────────────────────────────────────
  SELECT BRAND
─────────────────────────────────────────────
  1. Startup One — Your first startup description
  2. Startup Two — Your second startup description

  Which brand is this post for?
─────────────────────────────────────────────
```

Reply with the number. Everything that follows — the brand voice, content library, keyword history, and audience data — comes from that brand's profile. Posts for different startups never mix.

---

## 4. How to ask for a post

Type a plain sentence describing what you want. You don't need to use special syntax — just talk to it.

**Simple examples:**
```
Write a post about AI tools for small businesses
Write a post about the future of remote work
Write a post about how to build a second brain
```

**With optional parameters:**
```
Write a short post about startup fundraising
Write a listicle about productivity tools for founders
Write a post about AI in hiring, targeting "AI assessment tools" and "skills-based hiring"
Write a post about burnout prevention [PAUSE_AFTER_OUTLINE]
```

### All available options

| What you want | How to say it | Default |
|---|---|---|
| Topic | Just state it | Required |
| Language | "in Turkish", "in both English and Turkish" | English |
| Format | "as an explainer / how-to / listicle / opinion / case study" | Agent decides |
| Tone | "informative", "conversational", "bold", "practical" | Brand guide default |
| Audience | "for [description]" | Brand guide default |
| Keywords | "targeting [keyword], [keyword]" | Agent decides |
| Word count | "short", "standard", or "long" | Standard (~1,200–2,000 words) |
| Review outline before writing | Add `[PAUSE_AFTER_OUTLINE]` to your request | Off |
| Skip the alternative format | Add `[SKIP_ALT_FORMAT]` to your request | Off |
| Include SEO research | Add `[SEO_BRIEF]` to your request | Off |

---

### 4a. Write about a URL or article

Paste any article link directly into your request. The agent will read the article and ask you one follow-up question before it starts:

```
Write a post about this: https://example.com/some-article
Can you write about this article? https://example.com/some-article
```

After fetching the article, the agent will ask:

```
─────────────────────────────────────────────
  SOURCE ARTICLE DETECTED
  "Article Title Here"
─────────────────────────────────────────────
  How should this post be written?

  [A] Commentary / response — engage with the article's
      arguments, agree or push back, add your perspective

  [B] Your version of the same topic — cover the same
      subject independently, with your own angle and voice

  Reply A or B to continue.
─────────────────────────────────────────────
```

- **Reply A** — the post will open by referencing the article and engage with its arguments directly. Good for LinkedIn thought-leadership responses.
- **Reply B** — the agent covers the same topic in your voice without mentioning the source article. Good when you want to own a topic without appearing reactive.

Either way, the article becomes part of the research. The agent supplements it with additional sources and writes the post in your brand voice.

---

### 4b. Write in Turkish or both languages

```
Write a post about AI tools in Turkish
Write a post about startup fundraising in both English and Turkish
```

In dual-language mode, both posts are written natively — the Turkish version is not a translation. They share the same research but have independent outlines, drafts, and editorial reviews. The Turkish post is written for a Turkish professional audience, with local examples and cultural context.

---

### 4c. Use SEO keyword research

Add `[SEO_BRIEF]` to your request to run keyword research before writing.

**Discovery mode** — find keyword opportunities for your business:
```
Find keyword opportunities for my business [SEO_BRIEF]
```
The agent will present a ranked list of keyword opportunities and ask you to pick one before writing.

**Enrichment mode** — research keywords for a specific topic you already have:
```
Write a post about AI hiring tools [SEO_BRIEF]
```
The agent runs keyword research scoped to your topic, then proceeds automatically.

---

## 4. What happens while the agent runs

After you send your request, everything runs automatically. Here is what is happening at each stage:

### Planning (seconds)
The agent reads your request, breaks the topic into 3–5 research angles, checks your content library for prior coverage, and loads your brand guide and voice profile.

### Research (1–3 minutes)
One researcher per angle runs simultaneously, gathering facts, statistics, and sources. If you provided a source URL, its content is included alongside the research. Every finding gets a confidence rating so the agent knows which claims are well-supported.

### Conflict resolution (seconds)
Before writing, the agent scans all research files for contradictory statistics. When two sources disagree on a number, the higher-confidence value wins and the discrepancy is noted.

### Outline (30–60 seconds)
An outline agent reads all research and builds a structured plan: section headings, key points, which facts belong where, and keyword placement.

> **If you added `[PAUSE_AFTER_OUTLINE]`:** The agent will print the outline and stop here. Reply with "looks good" or "continue" to proceed, or give feedback to adjust the structure before writing begins.

### Writing (1–2 minutes)
The writer drafts the full post following the outline. Every factual claim gets a citation placeholder. The writer also produces a metadata file and a citation map.

### Quality review (30–60 seconds)
Four reviewers run simultaneously:
- **Section reviewer** — scores each section independently for voice, argument clarity, and fact density
- **Editor** — evaluates the full post for coherence, structure, and citation completeness
- **SEO agent** — checks keyword coverage, heading structure, and readability
- **Brand checker** — validates every hard rule in your brand guide

A composite score (0–100) is computed. Posts below 85 are revised automatically. Posts below 65 after a full rewrite are not published.

### Revisions (if needed)
If the score is 65–84, the agent revises the draft and re-reviews. It does this at most twice. If a factual claim is flagged as potentially unverifiable, the agent pauses and asks you whether to continue before publishing.

### Publishing (30–60 seconds)
The publisher writes the final post, social copy, email teaser, and A/B variants to `files/output/`. The content library and audience model are updated.

### Alternative format (1–2 minutes)
Using the same research, a second version is produced in a different format (e.g. a listicle if the primary was an explainer). This skips the full editorial loop.

---

## 5. Your output files — what you get

All files land in `files/output/` with a shared date-and-slug prefix. For a post about AI hiring tools published on 1 April 2026:

```
files/output/
  2026-04-01-best-ai-assessment-tools-for-employers.md
  2026-04-01-best-ai-assessment-tools-for-employers-social.json
  2026-04-01-best-ai-assessment-tools-for-employers-email.json
  2026-04-01-best-ai-assessment-tools-for-employers-variants.json
  2026-04-01-best-ai-assessment-tools-for-employers-listicle.md
```

For dual-language runs, Turkish files get a `-tr` suffix.

### The blog post (`.md`)
A Markdown file ready to paste into your CMS (WordPress, Webflow, Ghost, Substack, etc.). Contains front matter metadata, the full post body, and a numbered reference list at the bottom.

### Social copy (`-social.json`)
Ready-to-post copy for three platforms:
- **LinkedIn** — 150–300 words, personal opening, ends with a question or call to action
- **Twitter** — a single punchy sentence under 280 characters
- **Substack** — 2–3 warm sentences for a Substack Note

Replace `CTA_URL` in each file with the live URL once the post is published.

### Email teaser (`-email.json`)
Everything you need for a newsletter send: subject line, preview text, body copy, and CTA. Subject line is under 60 characters; preview text under 90.

### A/B variants (`-variants.json`)
Two headline and meta-description combinations for split testing — Variant A is the published title; Variant B is a genuinely different angle (a surprising statistic, a contrarian take, or outcome-led framing).

---

## 6. Reviewing and rating a post

After each run completes, the agent will show you a review prompt:

```
─────────────────────────────────────────────
  POST REVIEW — "Post Title Here"
  Published: files/output/2026-04-01-{slug}.md
  Word count: 1,480 | QA Score: 88
─────────────────────────────────────────────
  Rate each 1–5 (1 = poor, 5 = excellent):

  CLARITY         — Easy to follow, well-structured?
  TONE MATCH      — Sounds like you, not a generic AI blog?
  USEFULNESS      — Would your reader take something actionable?
  BRAND FIT       — Represents you professionally?
  SEO NATURALNESS — Keywords feel integrated, not forced?

  FREEFORM (press Enter to skip):
  → What worked well?
  → What would you change?

  PUBLISH DECISION: [A] As-is  [B] Minor edits  [C] Major edits  [D] Reject
─────────────────────────────────────────────
```

You can answer all of it, some of it, or just press Enter to skip. Your ratings are saved to `files/feedback/` and feed into the audience model — the agent uses this data to produce better posts over time.

---

## 8. Setting up a brand

Each startup has its own profile folder under `brands/`. The agent reads these files fresh at the start of every run.

### Adding or renaming a startup

Open `brands/index.json` and add an entry:

```json
{
  "brands": [
    { "slug": "my-startup", "name": "My Startup", "description": "One-line description" }
  ]
}
```

Then create a folder `brands/my-startup/` with four files — copy the template from `brands/startup-one/` as a starting point.

### `brands/{name}/brand-guide.json`

The rules for every post from this brand. The fields that matter most:

| Field | What to fill in |
|---|---|
| `voice` | One sentence: how this brand writes |
| `targetAudience` | Who the readers are |
| `tone` | 3–5 tone words |
| `hardConstraints` | Rules the agent must never break |
| `avoidTopics` | Topics to refuse entirely |

### `brands/{name}/voice.skill`

The detailed voice profile for the founder or author writing for this brand. This is the most important file to fill in well — it controls how every post sounds.

Open the template and replace the placeholder sections with:

- A description of who the writer is
- How their posts typically open
- What makes their perspective distinctive
- Phrases and habits characteristic of their writing
- Things they would never write

The **Examples** section at the bottom is populated automatically — every time a post scores 85 or above, the agent appends the best paragraph as a real example. You can also paste in paragraphs from posts you're proud of.

### `brands/{name}/content-library.json` and `audience-model.json`

Both are maintained automatically. The content library tracks every published post (used to avoid repeating topics). The audience model tracks which formats and keywords perform best — add an `engagementScore` (0–100) to any entry after a post goes live to help the agent learn what works.

---

## 9. Tips for best results

**Be specific, but not too narrow.** "AI tools for small businesses" will produce a broad survey. "How small e-commerce businesses are using AI to reduce customer service costs" will produce a focused, actionable post. But going too narrow (a single company, a two-year window) limits what the researchers can find.

**Use URLs when you have a source.** If you've read an article you want to respond to or build on, paste the link. It's faster than describing it, and the agent will read the full article rather than guessing what it says.

**Name the audience.** "For HR managers evaluating new tools" shapes every word choice, example, and recommendation. Without it, the agent falls back to your brand guide default.

**Add feedback after posts go live.** The audience model only becomes useful when you give it signal. A minute spent rating a post after it publishes is worth several future runs that automatically avoid formats or angles that didn't land.

**Don't edit the draft before reading the editorial report.** The draft is at `files/drafts/draft.md` and the report is at `files/drafts/editorial-report.json`. If a section surprised you, the report will explain the agent's reasoning before you start making changes.

**Use `[PAUSE_AFTER_OUTLINE]`** when you want to review the structure before a long run. It's a one-second addition that lets you redirect before the writing starts rather than after.

---

## 10. Troubleshooting

### The agent pauses and asks about "factual flags"
The editor found one or more claims it considers potentially unverifiable. The agent will describe each flagged claim and ask whether to continue.
- If you recognise the claim and trust it, reply `continue`
- If you're unsure, reply `stop` — then review `files/drafts/draft.md` and `files/drafts/editorial-report.json` before deciding

### The post doesn't sound like my voice
Open `.claude/skills/gulcan-voice.skill` and:
1. Look at the **Anti-Patterns** section — add any phrases or habits you want to explicitly avoid
2. Look at the **Examples** section — paste in a paragraph or two from your best actual writing
3. Be specific: "uses 1–2 rhetorical questions per section" is more useful than "sounds conversational"

### The output folder is empty after a run
If the agent completed but nothing appeared in `files/output/`, check:
- The terminal output — if the editorial score fell below 65 after a full rewrite, the agent refuses to publish and explains why
- `files/drafts/editorial-report.json` for details on what failed

### The agent stopped mid-run
The agent prints a clear description of what failed and at which stage. It writes a checkpoint to `files/checkpoint.json` as it runs — this file shows how far it got. Common causes:
- **Network issue** — the agent retries automatically; if it fails after multiple retries, check your connection and try again
- **Research failure** — if fewer than two research files were produced with sufficient findings, the agent halts and reports the gap

### I want to re-run a specific stage
The agent doesn't currently support resuming from a checkpoint mid-run. If a run fails partway through, start a new run with the same request — research is fast and the output files will overwrite cleanly.

---

*For questions or issues, describe the problem to Claude Code and include the relevant stage — it can read the draft and report files directly to help diagnose what happened.*
