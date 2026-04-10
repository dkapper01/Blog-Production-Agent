# Blog Production System — User Guide

*Everything you need to know to use the Blog Production System — from your first post to advanced workflows.*

---

## Table of Contents

1. [What this system does](#1-what-this-system-does)
2. [How to start](#2-how-to-start)
3. [Select your brand](#3-select-your-brand)
4. [Writing a post](#4-writing-a-post)
   - [4a. Basic request](#4a-basic-request)
   - [4b. Write about a URL or article](#4b-write-about-a-url-or-article)
   - [4c. Write in Turkish or both languages](#4c-write-in-turkish-or-both-languages)
   - [4d. Write from your raw notes](#4d-write-from-your-raw-notes)
   - [4e. SEO keyword enrichment](#4e-seo-keyword-enrichment)
   - [4f. Review the outline before writing](#4f-review-the-outline-before-writing)
5. [Content calendar](#5-content-calendar)
   - [5a. Generate a 90-day calendar](#5a-generate-a-90-day-calendar)
   - [5b. Write posts from the calendar](#5b-write-posts-from-the-calendar)
   - [5c. SEO keyword discovery](#5c-seo-keyword-discovery)
6. [What happens during a run](#6-what-happens-during-a-run)
7. [Your output files](#7-your-output-files)
8. [Reviewing and rating a post](#8-reviewing-and-rating-a-post)
9. [How the system learns](#9-how-the-system-learns)
10. [Setting up a brand](#10-setting-up-a-brand)
11. [System architecture](#11-system-architecture)
12. [Tips for best results](#12-tips-for-best-results)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What this system does

You describe what you want to write. The system does the research, writing, and quality review — then delivers a ready-to-publish package.

Each run produces:

- A complete blog post (800–2,500 words) in your brand voice
- A second version in a different format (e.g. a listicle version of an explainer)
- Ready-to-post copy for LinkedIn, Twitter, and Substack
- An email newsletter teaser with subject line and preview text
- Two headline and meta-description variants for A/B testing

Every factual claim is cited. The system also learns over time — each post updates the brand's voice profile and audience model so future posts improve automatically.

---

## 2. How to start

1. Open **Claude Code** on your computer
2. Navigate to the `research-agent` project folder
3. Start talking — no setup, no commands, no API key needed

Everything is in one project. Writing posts, planning calendars, and discovering keywords all happen here.

---

## 3. Select your brand

Every session starts with a brand selection menu:

```
─────────────────────────────────────────────
  SELECT BRAND
─────────────────────────────────────────────
  1. Startup One — Your first startup description
  2. Startup Two — Your second startup description

  Which brand is this for?
─────────────────────────────────────────────
```

Reply with the number. Everything that follows — the brand voice, content library, keyword history, and audience data — comes from that brand's profile. Posts for different brands never mix.

---

## 4. Writing a post

### 4a. Basic request

Type a plain sentence describing what you want. No special syntax required.

```
Write a post about AI tools for small businesses
Write a post about the future of remote work
Write a listicle about productivity tools for founders
Write a short post about startup fundraising
Write a post about AI in hiring, targeting "AI assessment tools" and "skills-based hiring"
```

**All available options:**

| What you want | How to say it | Default |
|---|---|---|
| Topic | Just state it | Required |
| Language | "in Turkish", "in both English and Turkish" | English |
| Format | "as an explainer / how-to / listicle / opinion / case study" | Agent decides |
| Tone | "informative", "conversational", "bold", "practical" | Brand guide default |
| Audience | "for [description]" | Brand guide default |
| Keywords | "targeting [keyword], [keyword]" | Agent decides |
| Word count | "short (~800–1,200)", "standard (~1,200–2,000)", "long (~2,000–2,500)" | Standard |
| Review outline first | Add `[PAUSE_AFTER_OUTLINE]` | Off |
| Skip alternative format | Add `[SKIP_ALT_FORMAT]` | Off |
| SEO keyword research | Add `[SEO_BRIEF]` | Off |

---

### 4b. Write about a URL or article

Paste any article link directly into your request:

```
Write a post about this: https://example.com/some-article
Can you write about this article? https://example.com/some-article
```

The system fetches and reads the article, then asks one follow-up question before proceeding:

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

- **Reply A** — the post opens by referencing the article and engages with its arguments directly. Good for thought-leadership responses.
- **Reply B** — the system covers the same topic in your voice without mentioning the source article. Good when you want to own a topic without appearing reactive.

Either way, the article becomes part of the research base. The system supplements it with additional sources and writes in your brand voice.

---

### 4c. Write in Turkish or both languages

```
Write a post about AI tools in Turkish
Write a post about startup fundraising in both English and Turkish
hem İngilizce hem Türkçe yaz
```

In dual-language mode, both posts are written natively — the Turkish version is not a translation. They share research but have independent outlines, drafts, and editorial reviews. The Turkish post is written for a Turkish professional audience with local examples and cultural context.

Output files are distinguished with language suffixes: `draft-en.md` and `draft-tr.md`.

---

### 4d. Write from your raw notes

The fastest way to start a post. Instead of describing a topic, paste whatever you already have — raw thoughts, a voice memo transcript, a brain dump, a LinkedIn comment, an email you wrote.

Put `[FROM_NOTES]` on the first line, then paste your notes below:

```
[FROM_NOTES]
I've been thinking about how most companies approach AI hiring backwards.
They run assessments after interviews — which means 3 hours of everyone's time
before they know if basic criteria are met. We made this mistake at my last company.
Cost us two months of wasted pipeline. There has to be a better sequencing.
```

The system extracts a topic, thesis, key points, and personal material, then shows you a summary before doing anything:

```
─────────────────────────────────────────────
  NOTES PARSED
─────────────────────────────────────────────
  TOPIC:   AI assessment sequencing in hiring pipelines
  THESIS:  Most companies run AI assessments too late in the hiring process,
           wasting interviewer time on candidates who would have been screened
           out earlier.

  KEY POINTS:
  1. Assessment after interview wastes 3+ hours per candidate
  2. Pre-interview screening changes the economics of the pipeline
  3. First-hand experience at previous company as supporting case

  FORMAT:  opinion  |  LANGUAGE: en

  PERSONAL MATERIAL FOUND: 1 item — will be preserved in the post
  FACTS TO VERIFY: 1 item — researchers will corroborate

  Continue with these? [Y] Yes  [E] Edit topic/thesis  [N] Cancel
─────────────────────────────────────────────
```

Reply **Y** to proceed, **E** to adjust the topic or thesis, or **N** to cancel.

Your notes become the anchor research file. Personal stories and specific phrases are flagged as mandatory content that the writer must include. Research agents focus on corroborating and deepening what you already know, not replacing it.

**What works well as notes:**
- A few paragraphs of free writing about something you observed or experienced
- A voice memo transcript (paste the text)
- A LinkedIn comment thread where you made a substantive point
- An email you wrote to a client or colleague explaining something
- Even bullet points: "I want to cover: X, Y, Z"

The notes don't need to be polished. The messier and more specific, the better the output.

---

### 4e. SEO keyword enrichment

Add `[SEO_BRIEF]` to any writing request to run keyword research scoped to your topic before the outline is built:

```
Write a post about AI hiring tools [SEO_BRIEF]
Write a post about remote work productivity [SEO_BRIEF]
```

The system researches keyword opportunities for your specific topic, selects the best keyword, and feeds that targeting into the outline and QA review. The post is optimised for that keyword from the start rather than retrofitting it during editing.

For keyword *discovery* (finding topics to write about, not enriching a topic you already have), see [Section 5c](#5c-seo-keyword-discovery).

---

### 4f. Review the outline before writing

Add `[PAUSE_AFTER_OUTLINE]` to any request to see the structure before writing begins:

```
Write a post about AI in hiring [PAUSE_AFTER_OUTLINE]
```

After the outline is built, the system will print the section headings with one-line descriptions and stop. Reply with "looks good" or "continue" to proceed, or give feedback to adjust the structure. Nothing is written until you approve.

---

## 5. Content calendar

### 5a. Generate a 90-day calendar

Plan your entire next quarter — finding the best topics, sequencing them strategically, and saving everything so you can write posts one at a time whenever you're ready.

```
Create a 90-day content calendar [CONTENT_CALENDAR]
Plan my next quarter of content [CONTENT_CALENDAR]
```

The system searches for 25 potential topics across your brand's subject areas, then selects and sequences the best 12 into a publishing plan. Each post in the plan gets:

- A suggested publish date (one per week)
- A specific keyword to target and why it's a good opportunity
- A format recommendation (explainer, listicle, how-to, etc.)
- The funnel stage it addresses (awareness, consideration, or decision)
- A note on what existing competitor content is missing — your opening

The system also identifies **topic clusters**: a pillar post paired with 2–3 supporting posts that interlink. This is the most effective way to build authority on a subject over time.

After the plan is ready, you'll see a table like this:

```
─────────────────────────────────────────────
  90-DAY CONTENT CALENDAR — Brand Name
  Apr 15 – Jul 14, 2026  |  12 posts  |  2 topic clusters
─────────────────────────────────────────────
  #   Date      Title                              Format      Difficulty  Cluster
  1   Apr 15    [title]                            Explainer   Easy        Pillar: AI Literacy
  2   Apr 22    [title]                            Listicle    Easy        Standalone
  3   Apr 29    [title]                            How-to      Medium      Supports #1
  ...
─────────────────────────────────────────────
  FUNNEL:    5 awareness · 4 consideration · 3 decision
  CLUSTERS:  2 identified
  LANGUAGES: 3 Turkish · 9 English
─────────────────────────────────────────────
  Say "write post 1" to start, or "write posts 1–3" to batch.
─────────────────────────────────────────────
```

The calendar is saved to `files/calendar/{brand-slug}-calendar.json` and persists between sessions.

---

### 5b. Write posts from the calendar

Once a calendar exists for a brand, say which post number you want to write:

```
write post 1
write posts 1-3
```

The system fills in the topic, keyword, format, and language automatically from the calendar — you don't need to re-specify anything. After each post publishes, the calendar is updated to mark it complete with the output path and QA score.

**Batch limit:** Up to 3 posts in one session. After the third, the system pauses and asks if you want to continue.

---

### 5c. SEO keyword discovery

Find the best keyword opportunities for your brand before you've decided what to write:

```
Find keyword opportunities [SEO_BRIEF]
Find keyword opportunities for AI productivity tools [SEO_BRIEF]
```

The system researches and ranks the top 10 keyword opportunities based on your brand's subject areas, audience, and competitor gaps. Results are presented as a ranked list with difficulty and priority scores. The full opportunity data is saved to `files/seo/keyword-opportunities.json`.

To write a post targeting one of the discovered keywords:

```
Write a post about [keyword] [SEO_BRIEF]
```

---

## 6. What happens during a run

After you send your request, everything runs automatically.

### Brand routing (instant)
The orchestrator reads your message, matches your intent to the right coordinator (writing or planning), and delegates — passing your brand context along.

### Planning (seconds)
The writing coordinator reads your request, breaks the topic into 3–5 research angles, checks your content library for prior coverage, and loads your brand guide and voice profile.

### Research (1–3 minutes)
One researcher per angle runs simultaneously, gathering facts, statistics, and sources. Every finding gets a confidence score. If you provided a source URL or raw notes, that content is included alongside web research.

### Conflict resolution (seconds)
Before writing, the coordinator scans all research for contradictory statistics. When two sources disagree, the higher-confidence value wins and the discrepancy is noted.

### Outline (30–60 seconds)
An outline agent reads all research and builds a structured plan: section headings, key points, which facts belong where, and keyword placement. The coordinator validates the outline structure before proceeding.

> **If you added `[PAUSE_AFTER_OUTLINE]`:** The system prints the outline and stops here. Reply to proceed or to adjust the structure.

### Writing (1–2 minutes)
The writer drafts the full post following the outline. Every factual claim gets a citation placeholder. The writer also produces a metadata file and a citation map.

### Quality review (30–60 seconds)
Four reviewers run simultaneously:
- **Section reviewer** — scores each section for voice, argument clarity, and fact density
- **Editor** — evaluates the full post for coherence, structure, and citation completeness
- **SEO agent** — checks keyword coverage, heading structure, and readability
- **Brand checker** — validates every rule in your brand guide

A composite score (0–100) is computed from all four.

### Revisions (if needed)
- Score **85–100**: proceed directly to publishing
- Score **65–84**: the coordinator assembles a prioritised revision list and respawns the writer (max 2 revision passes)
- Score **below 65**: full re-draft from the outline (max 1 re-draft)
- Score **below 65 after re-draft**: the branch is halted and not published

If a factual claim is flagged as potentially unverifiable (confidence ≥ 0.7), the system pauses and asks you whether to continue before publishing.

### Publishing (30–60 seconds)
The publisher writes the final post, social copy, email teaser, and A/B variants to `files/output/`. The content library and audience model are updated.

### Alternative format (1–2 minutes)
Using the same research, a second version is produced in a different format (e.g. a listicle if the primary was an explainer). This skips the full editorial loop.

---

## 7. Your output files

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
A Markdown file ready to paste into your CMS (WordPress, Webflow, Ghost, Substack, etc.). Contains front matter with metadata including the QA composite score, the full post body, and a numbered reference list.

### Social copy (`-social.json`)
Ready-to-post copy for three platforms:
- **LinkedIn** — 150–300 words, personal opening, ends with a question or call to action
- **Twitter** — a single punchy sentence under 280 characters
- **Substack** — 2–3 warm sentences for a Substack Note

Replace `CTA_URL` in each file with the live URL once the post is published.

### Email teaser (`-email.json`)
Subject line (under 60 characters), preview text (under 90 characters), body copy, and CTA — everything you need for a newsletter send.

### A/B variants (`-variants.json`)
Two headline and meta-description combinations for split testing. Variant A is the published title; Variant B is a genuinely different angle.

### Content calendar (`files/calendar/`)
If you generated a calendar, it lives at `files/calendar/{brand-slug}-calendar.json`. This file is updated in place as you write posts from it — completed posts are marked with their output path, publish date, and QA score.

### Draft artefacts (`files/drafts/`)
Intermediate files written during a run. Useful for diagnostics:

| File | Contents |
|---|---|
| `draft.md` | The working draft |
| `draft-meta.json` | Title, word count, format, keywords |
| `outline.json` | Section structure and fact assignments |
| `editorial-report.json` | Editor's full evaluation |
| `seo-analysis.json` | Keyword coverage, readability, meta suggestions |
| `brand-report.json` | Brand guide compliance check |
| `section-review.json` | Per-section scores and suggested fixes |
| `citations.json` | All cited sources |

---

## 8. Reviewing and rating a post

After each run completes, the system presents a review prompt:

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

You can answer all of it, some of it, or press Enter to skip. Ratings are saved to `files/feedback/` and feed directly into the audience model.

---

## 9. How the system learns

The system maintains three persistent learning artefacts per brand, updated after every run:

### Voice profile (`brands/{slug}/voice.skill`)

When a post scores 87 or above (or 85+ with positive feedback), the system selects the single best paragraph from that post — one that most distinctly captures the brand voice — and appends it as a numbered example to the voice profile.

Before any update, the current voice file is automatically backed up to `brands/{slug}/voice-snapshots/voice-{timestamp}.skill`. If a voice update ever produces worse results, you can restore the previous version from a snapshot.

The voice profile holds a maximum of 5 examples at a time. When a 6th is added, the lowest-scoring example is removed. Over time the examples represent only the best writing the system has seen for this brand.

You can also add your own examples manually — paste any paragraph from a post you're proud of into the **Examples** section of the voice profile.

### Audience model (`brands/{slug}/audience-model.json`)

After every published post, a signal is appended: the format used, keywords targeted, language, QA score, and your feedback score (if given). Over time:

- Formats that score well consistently get promoted to `topPerformingFormats` — the system defaults to these when you don't specify a format
- Keywords that appear in high-scoring posts get promoted to `topPerformingKeywords` — the system adds these to keyword targeting automatically

The threshold for promotion is 3 posts with feedback score ≥ 4.0 (or QA score ≥ 85 where no feedback exists).

### Content library (`brands/{slug}/content-library.json`)

Updated after every published post with title, slug, summary, and keywords. Used to detect prior coverage — the outline agent receives this list and is instructed to differentiate from angles already covered.

---

## 10. Setting up a brand

Each brand has its own folder under `brands/`. The system reads these files fresh at the start of every run.

### Adding a new brand

Open `brands/index.json` and add an entry:

```json
{
  "brands": [
    { "slug": "my-startup", "name": "My Startup", "description": "One-line description shown in the selection menu" }
  ]
}
```

Then create `brands/my-startup/` with four files — copy any existing brand folder as a template.

### `brand-guide.json`

The rules every post must follow. The fields that matter most:

| Field | What to fill in |
|---|---|
| `voice` | One sentence: how this brand writes |
| `targetAudience` | Who the readers are |
| `tone` | 3–5 tone words |
| `hardConstraints` | Rules the system must never break (blocker-level) |
| `avoidTopics` | Topics to refuse entirely |
| `seoContext.keyTopicAreas` | Subject areas for calendar research and keyword discovery |
| `seoContext.competitorTypes` | What kinds of competitors to search for gaps against |

### `voice.skill`

The detailed voice profile — the most important file for output quality. It controls how every post sounds.

Fill in:
- A description of who the writer is and their professional context
- How their posts typically open (first sentence patterns)
- What makes their perspective distinctive
- Phrases and habits characteristic of their writing
- Things they would never write (anti-patterns)

The **Examples** section at the bottom is populated automatically. You can also seed it manually by pasting paragraphs from posts you're proud of.

### `audience-model.json`

Maintained automatically. You can manually add an `engagementScore` (0–100) to any past-post signal to help the system learn what performed well before the system was set up.

### `content-library.json`

Maintained automatically. Each entry represents one published post and is used to avoid repeating covered angles.

---

## 11. System architecture

This section is for understanding how the system is structured — useful if something goes wrong or you want to extend it.

### Overview

The system uses a **thin orchestrator + coordinator subagents** pattern:

```
CLAUDE.md (orchestrator)
  ├── Reads brands/index.json → shows brand menu
  ├── Reads .claude/capabilities.json → matches intent
  └── Spawns coordinator subagent
        ├── writing-coordinator.md  (Steps 0–11: research → outline → write → QA → publish)
        └── planning-coordinator.md (calendar generation, SEO discovery)
              └── Each spawns its own leaf agents:
                    researcher, outline, writer, editor, seo,
                    section-reviewer, brand-checker, publisher,
                    voice-curator, notes-parser, calendar-researcher,
                    calendar-strategist
```

**CLAUDE.md is only 2k characters.** It does nothing except brand selection and routing. All pipeline logic lives in coordinator subagent files, which only load into context when needed.

### Routing

Intent is matched against `.claude/capabilities.json`. Adding a new capability (e.g. social post generation) means adding a new coordinator file and one entry in `capabilities.json` — the orchestrator never changes.

### Shared state (file-based memory)

Agents communicate exclusively through files. There is no in-memory state shared between agents.

| Layer | Location | Lifespan | Contents |
|---|---|---|---|
| Run state | `files/run-config.json`, `files/checkpoint.json`, `files/research/*.json`, `files/drafts/*` | One run | Topic config, research findings, draft artefacts |
| Planning state | `files/calendar/{brand}-calendar.json`, `files/seo/` | Until replaced | Content calendar, keyword briefs |
| Brand memory | `brands/{slug}/voice.skill`, `audience-model.json`, `content-library.json` | Permanent, grows | Voice examples, performance signals, post history |
| Voice backups | `brands/{slug}/voice-snapshots/` | Permanent | One snapshot per voice update, for rollback |

### File contracts

Inter-agent file formats are documented in `.claude/contracts/`. Each schema file defines the required fields and types for one shared artefact. The writing coordinator validates each file against its contract before passing it to the next agent.

| Contract | File it validates |
|---|---|
| `run-config.schema.json` | `files/run-config.json` |
| `research-file.schema.json` | `files/research/{slug}.json` |
| `outline.schema.json` | `files/drafts/outline[-lang].json` |
| `draft-meta.schema.json` | `files/drafts/draft-meta[-lang].json` |

### Project layout

```
research-agent/
  .claude/
    CLAUDE.md                      ← orchestrator (brand selection + routing)
    capabilities.json              ← intent routing table
    subagents/
      writing-coordinator.md       ← full writing pipeline (Steps 0–11)
      planning-coordinator.md      ← calendar + SEO discovery
      researcher.md
      outline.md
      writer.md
      editor.md
      section-reviewer.md
      seo.md
      brand-checker.md
      publisher.md
      voice-curator.md
      notes-parser.md
      calendar-researcher.md
      calendar-strategist.md
    contracts/
      run-config.schema.json
      research-file.schema.json
      outline.schema.json
      draft-meta.schema.json
    skills/
      seo-keyword-brief.skill
  brands/
    index.json
    startup-one/
      brand-guide.json
      voice.skill
      audience-model.json
      content-library.json
      voice-snapshots/             ← automatic backups before each voice update
  files/
    run-config.json
    checkpoint.json
    research/
    drafts/
    output/
    calendar/
    seo/
    feedback/
```

---

## 12. Tips for best results

**Be specific, but not too narrow.** "AI tools for small businesses" produces a broad survey. "How small e-commerce businesses are using AI to reduce customer service costs" produces a focused, actionable post. But going too narrow (a single company, a two-year window) limits what researchers can find.

**Use URLs when you have a source.** If you've read an article you want to respond to or build on, paste the link. It's faster than describing it, and the system reads the full article rather than guessing at its contents.

**Name the audience.** "For HR managers evaluating new tools" shapes every word choice, example, and recommendation. Without it, the system falls back to your brand guide default.

**Add feedback after posts go live.** The audience model only becomes useful when you give it signal. A minute spent rating a post after it publishes is worth several future runs — the system automatically avoids formats or angles that didn't land.

**Seed the voice profile early.** Before you've run enough posts for the automatic example collection to build up, paste 2–3 paragraphs from your actual best writing into the Examples section of `brands/{slug}/voice.skill`. This gives the writer a concrete target immediately.

**Use `[PAUSE_AFTER_OUTLINE]`** when you want to redirect before a long run. It costs one extra round-trip but prevents wasted writing if the structure is going in the wrong direction.

**Use `[FROM_NOTES]` for opinion and experience posts.** The system is at its best when your perspective is the starting point. Research agents are good at finding evidence but only you can provide the original observation.

**Generate a calendar quarterly.** The calendar researcher searches for real keyword opportunities and competitor gaps at the time it runs. A calendar older than 3 months may be pointing at topics where the competitive landscape has changed.

---

## 13. Troubleshooting

### The system pauses and asks about "factual flags"
The editor found one or more claims it considers potentially unverifiable. The system describes each flagged claim and asks whether to continue.
- If you recognise the claim and trust it, reply `continue`
- If you're unsure, reply `stop` — then review `files/drafts/draft.md` and `files/drafts/editorial-report.json` before deciding

### The post doesn't sound like my voice
Open `brands/{slug}/voice.skill` (where `{slug}` is your brand's folder name) and:
1. Look at the **Anti-Patterns** section — add any phrases or habits you want explicitly avoided
2. Look at the **Examples** section — paste in a paragraph or two from your best actual writing
3. Be specific: "uses 1–2 rhetorical questions per section" is more useful than "sounds conversational"
4. If a recent automatic example made things worse, restore the voice file from `brands/{slug}/voice-snapshots/` and delete the bad example

### The output folder is empty after a run
If the system completed but nothing appeared in `files/output/`, check:
- The terminal output — if the editorial score fell below 65 after a full re-draft, the system refuses to publish and explains why
- `files/drafts/editorial-report.json` for details on what failed
- `files/drafts/brand-report.json` — a brand constraint violation that blocks publishing will be flagged here

### The system stopped mid-run
The system prints a clear description of what failed and at which stage. Check `files/checkpoint.json` to see how far the run got. Common causes:
- **Research failure** — if fewer than two research files were produced with sufficient findings, the run halts. This usually means the topic is too niche for web search to find credible sources. Try broadening the topic slightly.
- **Outline validation failure** — the outline agent failed to produce a valid structure after two attempts. Check `files/drafts/outline.json` for what was returned.
- **Network issue** — the agent retries automatically; if it fails after retries, check your connection and start a new run

### The calendar file is missing
If you say "write post 3" and the system can't find a calendar file, it means either:
- You haven't generated a calendar for this brand yet — say `Create a 90-day content calendar [CONTENT_CALENDAR]`
- You selected a different brand at the start of the session than the one the calendar was generated for

### I want to revert a voice profile change
Voice snapshots are written automatically to `brands/{slug}/voice-snapshots/` before every update. Open the snapshots folder, find the file dated before the change you want to undo, and copy its contents back to `brands/{slug}/voice.skill`.

### I want to re-run a specific stage
The system doesn't currently support resuming from a checkpoint mid-run. Start a new run with the same request — research is fast and output files overwrite cleanly. The `[PAUSE_AFTER_OUTLINE]` flag is the best tool for catching problems before writing starts.

---

*For questions or issues, describe the problem to Claude Code and include the relevant stage — it can read the draft and report files directly to help diagnose what happened.*
