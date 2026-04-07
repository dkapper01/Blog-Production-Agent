# Blog Production Agent

A multi-agent blog production pipeline that researches a topic, writes a full post in your brand voice, and delivers a ready-to-publish package — social copy, email teaser, A/B headline variants, and more.

> **No API key required.** This pipeline runs entirely within Claude Code on your Claude Max plan. No Node.js, no npm, no `.env` file needed.

## Quick Start

1. [Install Claude Code](https://claude.ai/code)
2. Clone this repo and open it in Claude Code:
   ```bash
   git clone https://github.com/dkapper01/blog-production-agent.git
   cd blog-production-agent
   claude
   ```
3. Edit the brand files in `memory/` to match your voice and brand (see [Brand & Voice](#brand--voice) below)
4. Tell Claude Code what you want to write:
   ```
   Write a post about AI agents in enterprise software
   ```

That's it. The pipeline runs automatically.

## How to Run a Post

Just describe what you want. Examples:

```
Write a post about the future of remote work
Write a post about second brain tools in Turkish
Write a post about startup fundraising in both English and Turkish
Write a post about Web3 for developers as a listicle [SKIP_ALT_FORMAT]
Write a post about AI productivity tools [PAUSE_AFTER_OUTLINE]
```

### Intake parameters

| Parameter | How to specify | Default |
|-----------|---------------|---------|
| **Topic** | Just state it | Required |
| **Language** | "in English", "in Turkish", "in both English and Turkish" | English |
| **Format** | "as an explainer / how-to / listicle / opinion / case study" | Agent decides |
| **Tone** | "informative", "conversational", "bold", "practical" | Brand guide default |
| **Audience** | "for [description]" | Brand guide default |
| **Keywords** | "targeting [keyword1], [keyword2]" | Agent decides |
| **Word count** | "short (~800–1200)", "standard (~1200–2000)", "long (~2000–2500)" | Standard |
| **Pause for review** | `[PAUSE_AFTER_OUTLINE]` anywhere in request | Off |
| **Skip alt format** | `[SKIP_ALT_FORMAT]` anywhere in request | Off |

## How It Works

Claude Code's main session acts as the **Coordinator** — it owns all routing, triage, and inter-agent communication. Specialist subagents handle focused tasks and write results to disk.

1. **Coordinator** decomposes the topic into 3–5 research angles and checks for prior coverage
2. **Researchers** run in parallel, searching the web and saving structured findings to `files/research/`
3. **Coordinator** reads all research, detects conflicting statistics, and resolves them by confidence score
4. **Outline agent** reads all research and produces a section-by-section plan with SEO assignments
5. **Writer** drafts the post in Markdown using the outline and research
6. **Editor** + **SEO agent** + **Brand checker** run in parallel — editor scores the draft (0–100); posts below 85 are revised; brand violations block publishing
7. **Publisher** writes the final post, social copy, email teaser, and A/B variants; updates the content library

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| **Coordinator** | Sonnet | Orchestrates the full pipeline; all routing and triage decisions |
| **Researcher** | Haiku | Researches one subtopic, writes `files/research/{slug}.json` |
| **Outline** | Sonnet | Builds the section-by-section plan from all research |
| **Writer** | Sonnet | Writes the full draft, citation map, and metadata |
| **Editor** | Sonnet | Scores the draft (0–100); flags factual concerns; sees draft only |
| **SEO** | Haiku | Checks keyword density, headings, and readability |
| **Brand Checker** | Haiku | Validates hard constraints and topic blocklist against brand guide |
| **Publisher** | Haiku | Writes output files; updates content library and audience model |

## Output

All files land in `files/output/` with a shared `{date}-{slug}` prefix:

```
files/output/
  2026-04-01-{slug}.md                ← blog post (Markdown + front matter)
  2026-04-01-{slug}-social.json       ← LinkedIn, Twitter, and Substack copy
  2026-04-01-{slug}-email.json        ← email teaser (subject, preview, body, CTA)
  2026-04-01-{slug}-variants.json     ← A/B headline + meta description variants
  2026-04-01-{slug}-listicle.md       ← alternative format version
```

For dual-language runs, Turkish files get a `-tr` suffix.

## Brand & Voice

Four files in `memory/` control how posts are written. Edit them to match your style — the agent reads them fresh at the start of every run.

| File | What to edit |
|------|-------------|
| `memory/brand-guide.json` | Voice description, tone words, target audience, hard constraints, topics to avoid, preferred word count |
| `memory/gulcan-voice.md` | Detailed voice profile with examples, anti-patterns, and language-specific guidance |
| `memory/content-library.json` | Auto-updated after every published post — tracks all prior coverage |
| `memory/audience-model.json` | Add `engagementScore` values manually after posts go live; the agent favours top-performing formats and keywords on future runs |

High-scoring posts (≥85) automatically append an example paragraph to the voice guide, so the agent's understanding of your voice improves over time.

## Language Support

| Mode | How to request |
|------|---------------|
| English only | Default — just state the topic |
| Turkish only | Add "in Turkish" or write the request in Turkish |
| Both languages | "in both English and Turkish" or "hem İngilizce hem Türkçe" |

In dual-language mode, both posts are written natively — the Turkish version is not a translation. They share the same research but have independent outlines, drafts, and editorial passes.

## Requirements

- [Claude Code](https://claude.ai/code) with a Claude Max plan
- Git (to clone the repo)

No Node.js. No API key. No `.env` file.
