# Blog Production Agent

A multi-agent system that researches a topic, writes a full blog post in your brand voice, and delivers a ready-to-publish package — social copy, email teaser, A/B headline variants, and more.

## Quick Start

```bash
cd ts
npm install

# Add your API key
echo "ANTHROPIC_API_KEY=your-key-here" > .env

# Run
npm start
```

## How It Works

An interactive wizard collects your post parameters — topic, format, tone, language, audience, keywords, and word count. Then the pipeline runs automatically:

1. **Coordinator** decomposes the topic into 3–5 research angles
2. **Researchers** run in parallel, searching the web and saving structured findings to `files/research/`
3. **Outline agent** reads all research and produces a section-by-section plan with SEO assignments
4. **Writer** drafts the post in Markdown using the outline and research
5. **Editor** + **SEO reviewer** run in parallel — editor scores the draft (0–100); posts below 85 are sent back for revision
6. **Publisher** produces all output files and updates the content library

## Agents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| **Coordinator** | Sonnet | `Task`, `Read`, `Glob` | Orchestrates the full pipeline |
| **Researcher** | Haiku | `WebSearch`, `Write` | Researches one subtopic, writes `files/research/{slug}.json` |
| **Outline** | Sonnet | `Glob`, `Read`, `Write` | Builds `files/drafts/outline.json` from all research |
| **Writer** | Sonnet | `Glob`, `Read`, `Write` | Writes the full draft and citation map |
| **SEO** | Haiku | `Read`, `Write` | Checks keyword density, headings, and readability |
| **Editor** | Sonnet | `Read`, `Write` | Scores the draft; flags factual concerns |
| **Publisher** | Haiku | `Glob`, `Read`, `Write` | Writes output files; updates content library |

## Wizard Options

| Question | Options |
|----------|---------|
| **Format** | Let agent decide / Explainer / How-to / Listicle / Opinion / Case study |
| **Language** | English only / Turkish only / Both (dual independent posts) |
| **Tone** | Informative & analytical / Conversational / Bold & opinionated / Practical & tactical |
| **Audience** | Brand guide default or custom description |
| **Keywords** | Agent decides or comma-separated list |
| **Word count** | Short (~800–1,200) / Standard (~1,200–2,000) / Long (~2,000–2,500) |

Your format, language, tone, and word count preferences are saved between sessions.

## Output

All files land in `files/output/` with a shared `{date}-{slug}` prefix:

```
files/output/
  2026-04-01-{slug}.md                ← blog post (Markdown + front matter)
  2026-04-01-{slug}-social.json       ← LinkedIn, Twitter, and Substack copy
  2026-04-01-{slug}-email.json        ← email teaser (subject, preview, body, CTA)
  2026-04-01-{slug}-variants.json     ← A/B headline + meta description variants
  2026-04-01-{slug}-listicle.md       ← alternative format version
  ...
```

For dual-language runs, Turkish files get a `-tr` suffix.

## Brand & Voice

Two files in `memory/` control how posts are written. Edit them to match your style — the agent reads them fresh at the start of every run.

- **`memory/brand-guide.json`** — voice description, tone words, target audience, hard constraints, topics to avoid, preferred word count
- **`memory/gulcan-voice.md`** — detailed voice profile with examples, anti-patterns, and language guidance for both English and Turkish

High-scoring posts (≥85) automatically append an example paragraph to the voice guide.

## Content Library & Audience Model

- **`memory/content-library.json`** — every published post, indexed by slug
- **`memory/audience-model.json`** — per-post engagement signals; add `engagementScore` values manually after posts go live and the agent will favour top-performing formats and keywords on future runs

## Session Logs

```
logs/
  session_YYYYMMDD_HHMMSS/
    transcript.txt      ← human-readable session log
    tool_calls.jsonl    ← structured record of every tool call
```

## Requirements

- Node.js 18+
- `ANTHROPIC_API_KEY` in `agent/.env`

See [USER_GUIDE.md](agent/USER_GUIDE.md) for detailed usage instructions.
