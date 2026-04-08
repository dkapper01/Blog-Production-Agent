# Blog Production System — Architecture V2
### Production-Grade Multi-Agent Design

**Authored:** 2026-04-08  
**Status:** Implementation-Ready  
**Replaces:** CLAUDE.md coordinator workflow (Steps 1–10)

---

## Observed Weaknesses in Current System

Before proposing changes, here are the concrete failure modes identified from the live run history:

| Weakness | Evidence |
|----------|----------|
| Inconsistent gate logic | Brand-checker marks inline citations `blocksPublishing: false` (soft); Editor marks same issue `severity: "hard_constraint"`. Two agents disagree on what blocks publishing. |
| Single-pass QA | Editor reviews full draft globally but never sections independently. A weak section buried in the middle passes undetected. |
| No composite score | System uses `editorialReport.passScore` alone for routing. SEO (82) and brand (88) scores from the FDE run are not factored into the routing decision. The effective composite for that run was ~84, not 81. |
| Research synthesis is inline | The coordinator does conflict detection by reading files in its own context — this competes with other context and is error-prone. |
| Context bloat risk | Writers receive full research file slugs but must re-read all files. On a 5-subtopic run that's 5 JSON files worth of context before writing a word. |
| No user feedback loop | There is no mechanism to capture Gülcan's actual reaction to published posts. Voice guide updates rely solely on pass score, which the system sets itself. |
| Voice guide example quality | Examples are added if `passScore ≥ 85`. That gate is self-assessed. A run could produce a 90 score but still have awkward voice — no external verification. |
| No idempotency | If a run crashes between steps, there is no way to resume from the last checkpoint without re-running from scratch. |
| Word count guard fires late | The guard checks word count in Step 7 (after writing). By then the writer has already used a large context slot. The outline should encode `estimatedWordCount` per section. |

---

## 1. Architecture Overview

### Coordinator Responsibilities

The coordinator is the **only** agent that reads memory files, computes routing decisions, and writes checkpoints. It never writes prose.

```
Intake → Context Loading → Research → Synthesis → Outline → Writing → Multi-Pass QA → Gate → Publish → Feedback → Learning
```

**Coordinator owns:**
- RunConfig construction and persistence
- ContextPacket assembly (one read of all memory files, never re-read)
- Research synthesis (conflict detection, master fact list)
- CompositeQAScore calculation and routing logic
- Revision instruction assembly (specifying exactly what to fix, in what order)
- Error accumulation and branch isolation
- Voice guide update (reads Voice Curator output, applies cap logic)
- Final report to user

**Coordinator never does:**
- Write prose or draft content
- Evaluate voice quality
- Parse research findings
- Decide whether a paragraph sounds like Gülcan

### Subagent Roster

| Agent | Role | Output |
|-------|------|--------|
| `researcher` | Deep dive on one subtopic | `SubtopicFindings` JSON |
| `outline` | Structured post plan per language | `OutlineDoc` JSON |
| `writer` | Draft prose per language | `draft.md` + `DraftMeta` + `CitationMap` |
| `section-reviewer` | Section-level QA (local pass) | `SectionReviewReport[]` JSON |
| `editor` | Global QA (narrative arc, tone arc) | `EditorialReport` JSON |
| `seo` | Keyword + readability analysis | `SEOReport` JSON |
| `brand-checker` | Voice compliance check | `BrandReport` JSON |
| `publisher` | Final assembly + social/email variants | Published files |
| `feedback-collector` | Post-publish questionnaire | `FeedbackRecord` JSON |
| `voice-curator` | Selects and validates voice examples | `VoiceExample` or rejection reason |

### Data Flow

```
[RunConfig] ──► [ContextPacket]
                     │
            ┌────────┴────────┐
            ▼                 ▼
      researcher(1)    researcher(N)  ← parallel
            │                 │
            └────────┬────────┘
                     ▼
            [ResearchSynthesis]
                     │
            ┌────────┴────────┐   (dual-lang: both in parallel)
            ▼                 ▼
       outline(en)       outline(tr)
            │                 │
            ▼                 ▼
        writer(en)        writer(tr)   ← parallel
            │                 │
    ┌───────┼───────┐  ┌──────┼──────┐
    ▼       ▼       ▼  ▼      ▼      ▼
section- editor  seo  (same per TR branch)
reviewer         ← all 6 in parallel for dual
    │       │       │
    └───────┴───────┘
            ▼
    [CompositeQAScore]
            │
     routing decision
      ┌─────┼─────┐
      ▼     ▼     ▼
   proceed revise redraft
      │
      ▼
  publisher(s)
      │
      ▼
 feedback-collector (async, optional)
      │
      ▼
 voice-curator + audience model update
```

---

## 2. Improved Pipeline — Stage by Stage

### Stage 0: Intake & RunConfig

**Purpose:** Parse user intent into a fully-typed configuration object. Write it to disk for idempotency and debugging.

**Inputs:** Raw user message string

**Outputs:** `files/run-config.json` containing `RunConfig`

**Validation:**
- `topic` must be non-empty
- `languages` must be `['en']`, `['tr']`, or `['en', 'tr']`
- `format` must be one of the valid enum values if specified
- `wordCountTarget` maps to numeric ranges (short: 800–1200, standard: 1200–2000, long: 2000–2500)

**Failure handling:** If topic is empty, ask the user before proceeding. All other fields have defaults.

```json
{
  "runId": "uuid-v4",
  "topic": "The skills required to become a forward deployed engineer",
  "languages": ["en"],
  "format": "explainer",
  "tone": null,
  "keywords": ["forward deployed engineer", "FDE skills"],
  "wordCountTarget": "standard",
  "wordCountRange": { "min": 1200, "max": 2000 },
  "pauseAfterOutline": false,
  "skipAltFormat": false,
  "startedAt": "2026-04-08T10:00:00.000Z"
}
```

---

### Stage 1: Context Loading & ContextPacket

**Purpose:** Load all memory files once, extract actionable signals, and produce a structured `ContextPacket` that is passed to every downstream agent verbatim. Agents never read memory files themselves.

**Inputs (coordinator reads directly):**
- `memory/brand-guide.json`
- `memory/gulcan-voice.md`
- `memory/audience-model.json`
- `memory/content-library.json`

**Outputs:** `ContextPacket` (held in coordinator memory, not written to disk)

**ContextPacket structure:**
```json
{
  "brandGuide": { /* full brand-guide.json */ },
  "voiceGuideText": "# Gülcan Yayla — Voice Profile\n...",
  "resolvedFormat": "explainer",
  "audienceResonantKeywords": ["AI assessment tools", "AI hiring tools"],
  "priorCoverage": [
    {
      "slug": "best-ai-assessment-tools-for-employers",
      "title": "The Best AI Assessment Tools for Employers",
      "angle": "Comparison of 6 specific tools with scoring rubric",
      "keywords": ["AI assessment tools", "AI hiring tools"]
    }
  ],
  "avoidTopics": ["partisan political commentary", "investment advice", "medical diagnoses"]
}
```

**Prior coverage detection:** Match any content-library entry where `title`, `summary`, or `keywords` share a key term with the topic or any subtopic. A match requires at least one shared named concept, not just a generic word.

**Failure handling:** If any memory file is missing, halt and report. These are hard dependencies — the pipeline cannot produce on-brand output without them.

---

### Stage 2: Research (Parallel)

**Purpose:** Each researcher produces a structured findings document for one subtopic. Research is language-agnostic — both EN and TR branches consume the same files.

**Inputs (per agent):**
- Specific subtopic string
- Output slug (kebab-case)
- Prior coverage list from ContextPacket
- Instruction: "If a prior post already covered this angle, go deeper — find a data point or framing that post did not use."

**Outputs:** `files/research/{slug}.json` containing `SubtopicFindings`

```json
{
  "slug": "fde-role-definition",
  "subtopic": "What is a Forward Deployed Engineer",
  "summary": "One paragraph summary of findings.",
  "keyFindings": [
    {
      "claim": "Palantir pioneered the FDE model in the mid-2000s for intelligence and enterprise clients.",
      "source": "Palantir company history; LinkedIn alumni accounts",
      "confidence": 0.95
    }
  ],
  "targetFacts": [
    "Palantir pioneered the FDE model in the mid-2000s"
  ],
  "usefulQuotes": [
    {
      "text": "An FDE is what happens when you send your best engineer to the customer site...",
      "attribution": "Paraphrase from r/palantir community"
    }
  ],
  "dataGaps": ["Exact number of FDEs employed industry-wide is not publicly reported"],
  "sources": ["Palantir job postings", "r/palantir", "LinkedIn alumni accounts"]
}
```

**Validation (coordinator checks after all complete):**
- `keyFindings` not empty
- Every finding has `confidence > 0`
- `slug` matches the file path
- File is valid JSON

**Failure handling:** If a researcher returns invalid JSON or empty findings, retry once with explicit schema example appended to the prompt. If still failing, log and proceed with remaining subtopics (minimum 2 of N required to continue).

---

### Stage 3: Research Synthesis

**Purpose:** The coordinator reads all research files, detects conflicts, resolves them by confidence score, and produces a `ResearchSynthesis` that all outline agents receive instead of raw research slugs.

This stage runs in the coordinator — no subagent required. It is a deterministic data merge step.

**Conflict detection logic:**
- Load all `files/research/*.json`
- Group `keyFindings` by subject/metric
- Flag as conflict if: same subject, different quantitative value, from different files
- Resolve by: prefer higher `confidence` score; if tied, prefer the finding with a named primary source over a secondary one

**Outputs:** `ResearchSynthesis` (held in coordinator memory)

```json
{
  "subtopicSlugs": ["fde-role-definition", "fde-technical-skills", "fde-career-path"],
  "resolvedConflicts": [
    {
      "metric": "FDE travel load",
      "conflictingValues": [
        { "value": "30–50%", "source": "fde-role-definition", "confidence": 0.88 },
        { "value": "50–80%", "source": "fde-career-path", "confidence": 0.75 }
      ],
      "resolvedValue": "30–80%",
      "resolvedSource": "fde-role-definition",
      "resolvedConfidence": 0.88,
      "rationale": "Higher confidence source used; range merged to reflect both data points."
    }
  ],
  "masterFactList": [
    {
      "claim": "Palantir pioneered the FDE model in the mid-2000s",
      "confidence": 0.95,
      "sourceSlug": "fde-role-definition",
      "approved": true
    }
  ],
  "lowConfidenceFacts": [
    {
      "claim": "...",
      "confidence": 0.55,
      "sourceSlug": "...",
      "approved": false
    }
  ],
  "coverageGaps": ["No industry-wide FDE headcount data available"]
}
```

**Note:** `masterFactList` is capped at 25 entries (highest confidence). Low-confidence facts (< 0.7) are excluded from `masterFactList` and flagged in `lowConfidenceFacts`. Writers are instructed never to use `lowConfidenceFacts` without explicit qualification ("some sources suggest...").

---

### Stage 4: Outline (Per Language)

**Purpose:** Produce a structured post plan that encodes section-level word count targets, target facts, and differentiation from prior coverage.

**Inputs (passed in task prompt):**
- `RunConfig.topic`, `RunConfig.format`, `RunConfig.keywords`, `RunConfig.wordCountRange`
- Language (`en` or `tr`)
- `ContextPacket.brandGuide` (inline)
- `ContextPacket.voiceGuideText` (inline — first 40 lines only; enough for constraints, not full examples)
- `ContextPacket.priorCoverage` (with differentiation instruction)
- `ResearchSynthesis.masterFactList` (NOT raw research files)
- `ResearchSynthesis.resolvedConflicts`
- `ResearchSynthesis.subtopicSlugs` (for reference — agent may read individual files for detail)
- For TR: Turkish audience note (see Section 7)

**Outputs:** `files/drafts/outline[-lang].json` containing `OutlineDoc`

```json
{
  "topic": "Skill set required for becoming a forward deployed engineer",
  "format": "explainer",
  "language": "en",
  "slug": "forward-deployed-engineer-skills",
  "thesis": "Becoming a forward deployed engineer requires...",
  "targetKeywords": ["forward deployed engineer", "FDE skills"],
  "targetAudience": "Mid-career software engineers considering a pivot...",
  "targetWordCount": 1600,
  "differentiationNotes": "No prior coverage of this topic in content library.",
  "sections": [
    {
      "heading": "The Engineer Who Ships at the Customer's Site",
      "type": "introduction",
      "keyPoints": ["FDE is not a consultant — they write production code on-site"],
      "targetFacts": ["Palantir pioneered FDE model in mid-2000s"],
      "estimatedWordCount": 300
    }
  ],
  "researchSlugs": ["fde-role-definition", "fde-technical-skills"],
  "wordCountBudget": {
    "introduction": 300,
    "body": 1100,
    "conclusion": 200,
    "total": 1600
  }
}
```

**Validation:**
- `thesis` present and non-empty
- ≥ 3 sections
- All `targetFacts` in any section must appear in `ResearchSynthesis.masterFactList`
- `wordCountBudget.total` must be within `RunConfig.wordCountRange` ± 10%
- Section `estimatedWordCount` values must sum to `wordCountBudget.total`

**Failure handling:** If output fails schema validation, retry once with the schema error and an example of a valid `OutlineDoc` appended.

**PAUSE_AFTER_OUTLINE:** After validation passes, coordinator reads outline file, formats headings + one-line descriptions, outputs to user, and emits `[AWAITING_OUTLINE_APPROVAL]`. Halts until user approves.

---

### Stage 5: Writing (Per Language)

**Purpose:** Produce a prose draft that follows the outline section-by-section, respects word count budgets per section, and embeds Gülcan's voice throughout.

**Inputs (passed in task prompt):**
- `ContextPacket.brandGuide` (full, inline)
- `ContextPacket.voiceGuideText` (full, inline — including all examples)
- Outline path (agent reads this file)
- `ResearchSynthesis.masterFactList` (inline — facts the writer MUST use)
- `ResearchSynthesis.resolvedConflicts` (inline — which value to use for each conflict)
- Research slugs (agent reads these files directly for detail and quotes)
- Language
- Explicit word count constraint: "Target {min}–{max} words total. Each section has a budget in the outline — do not exceed section budgets by more than 15%."

**Critical instruction for writers:**
```
DO NOT exceed the section word count budgets by more than 15% each.
DO NOT use any fact with confidence < 0.7 without qualifying it as "some sources suggest."
Every statistic MUST include an inline citation placeholder: [SOURCE: {source description}].
The opening paragraph MUST follow the voice guide's "personal hook" pattern.
```

**Outputs:**
- `files/drafts/draft[-lang].md` — prose draft (citation placeholders, not live URLs)
- `files/drafts/draft-meta[-lang].json` — `DraftMeta`
- `files/drafts/citations[-lang].json` — `CitationMap`

```json
// DraftMeta
{
  "title": "The Skills You Actually Need to Become a Forward Deployed Engineer",
  "slug": "forward-deployed-engineer-skills",
  "topic": "...",
  "format": "explainer",
  "language": "en",
  "wordCount": 1587,
  "thesis": "...",
  "targetKeywords": ["forward deployed engineer"],
  "primaryKeyword": "forward deployed engineer",
  "targetAudience": "...",
  "citationCount": 12,
  "sectionWordCounts": {
    "The Engineer Who Ships at the Customer's Site": 312,
    "Technical Depth: Full-Stack, Not Specialized": 287
  },
  "createdAt": "2026-04-08T11:00:00.000Z"
}

// CitationMap
{
  "citations": [
    {
      "id": "cite-001",
      "claim": "Palantir pioneered the FDE model in the mid-2000s",
      "sourceDescription": "Palantir Technologies company history; LinkedIn alumni accounts",
      "confidence": 0.95,
      "urlPlaceholder": "[Palantir company history]"
    }
  ]
}
```

**Validation (coordinator checks):**
- `wordCount` within `RunConfig.wordCountRange` — if > upper × 1.30, STOP and return error to coordinator before spawning QA
- `citationCount ≥ 3`
- File is valid prose (non-empty, > 500 words)

**Failure handling:** If word count is > 130% of upper bound, spawn writer again with a cut instruction prepended to all other instructions. This is the only pre-QA retry.

---

### Stage 6: Multi-Pass QA (Parallel Per Language)

**Purpose:** Run four independent QA perspectives simultaneously. Isolate each agent's context strictly.

**All four agents spawn in one coordinator response per language branch.**

#### 6a. Section Reviewer (LOCAL PASS — NEW)

Reviews each section independently. Catches problems that are invisible at the global level: a weak argument in section 3, a paragraph that breaks voice in section 5.

**Inputs:** Draft path only (agent reads the file). No brand guide, no research, no outline.

**Outputs:** `files/drafts/section-review[-lang].json`

```json
{
  "language": "en",
  "sections": [
    {
      "heading": "The Engineer Who Ships at the Customer's Site",
      "sectionIndex": 0,
      "voiceScore": 95,
      "argumentScore": 90,
      "factDensityScore": 85,
      "issues": [],
      "sectionPassScore": 90
    },
    {
      "heading": "Technical Depth: Full-Stack, Not Specialized",
      "sectionIndex": 1,
      "voiceScore": 75,
      "argumentScore": 80,
      "factDensityScore": 90,
      "issues": [
        {
          "type": "voice",
          "severity": "soft",
          "description": "Third paragraph reads like a job description list, not Gülcan's analytical voice.",
          "suggestedFix": "Add one sentence connecting the list to a real-world consequence the reader can feel."
        }
      ],
      "sectionPassScore": 82
    }
  ],
  "lowestSectionScore": 82,
  "averageSectionScore": 88
}
```

**Context isolation rule:** Section reviewer receives ONLY the draft. No brand guide, no voice guide, no outline. It scores what is on the page.

#### 6b. Editor (GLOBAL PASS)

Reviews cross-section coherence: does the thesis hold through all sections? Does tone drift? Is the narrative arc complete?

**Inputs:** Draft path + `DraftMeta` path only. No brand guide, no research, no outline.

**Outputs:** `files/drafts/editorial-report[-lang].json`

```json
{
  "passScore": 81,
  "language": "en",
  "overallAssessment": "...",
  "voiceScore": 90,
  "structureScore": 88,
  "citationScore": 50,
  "narrativeArcScore": 85,
  "toneConsistencyScore": 88,
  "revisionPriority": [
    {
      "priority": 1,
      "issue": "Missing inline citation links",
      "detail": "Brand guide hard constraint: every factual claim must have an inline hyperlink. Citation placeholders exist but are not resolved.",
      "severity": "hard_constraint",
      "affectedSections": ["all"]
    }
  ],
  "strengths": ["Personal anecdote opening effective", "FDE vs. consultant distinction clear"],
  "factFlags": [],
  "requiresRevision": false,
  "publishBlocker": "Resolve citation placeholders before publishing."
}
```

**Critical change vs. current system:** The editor's `passScore` reflects ONLY global editorial quality. It does NOT assess SEO or brand compliance. Those are separate scores. This prevents dilution.

#### 6c. SEO Agent

**Inputs:** Draft path + `DraftMeta` path + target keywords (from `RunConfig`).

**Outputs:** `files/drafts/seo-analysis[-lang].json` (schema unchanged from current system)

**Critical fix:** If output file is missing or empty after the agent completes, coordinator re-spawns the SEO agent once before computing the composite score. SEO is never assumed to have succeeded.

#### 6d. Brand Checker

**Inputs:** Draft path + full `brand-guide.json` (inline in task prompt) + `voiceGuideText` (inline).

**Outputs:** `files/drafts/brand-report[-lang].json`

**Critical fix — Hard Constraint Alignment:**

The brand checker must explicitly evaluate each `hardConstraints` rule from the brand guide:

```json
{
  "hardConstraintsEvaluation": [
    {
      "rule": "Always cite sources inline with hyperlinks.",
      "status": "VIOLATED",
      "evidence": "Draft contains citation placeholders [SOURCE: ...] but no live hyperlinks.",
      "blocksPublishing": true
    },
    {
      "rule": "Never make up statistics.",
      "status": "PASSED",
      "evidence": "All statistics traceable to research files."
    },
    {
      "rule": "Every post must have a clear thesis in the introduction.",
      "status": "PASSED",
      "evidence": "Thesis present in second paragraph of introduction."
    }
  ],
  "blocksPublishing": true,
  "hardViolations": ["Missing inline hyperlinks — hard constraint violated"],
  "softAdvisories": [],
  "voiceCompliance": { ... },
  "overallBrandScore": 72,
  "notes": "Strong voice compliance; blocked on citation hard constraint."
}
```

**This resolves the current inconsistency:** In the FDE run, the editor called inline citations a `hard_constraint` but the brand-checker set `blocksPublishing: false`. Under this design, if ANY `hardConstraintsEvaluation` entry has `"blocksPublishing": true`, the overall `blocksPublishing` must be `true`. No exceptions.

---

### Stage 7: CompositeQAScore & Gate

**Purpose:** Coordinator computes a single weighted score from all four QA outputs and makes a deterministic routing decision.

**Inputs (coordinator reads):**
- `files/drafts/section-review[-lang].json`
- `files/drafts/editorial-report[-lang].json`
- `files/drafts/seo-analysis[-lang].json`
- `files/drafts/brand-report[-lang].json`
- `files/drafts/draft-meta[-lang].json`

**Composite Score Formula:**

```
compositeScore = (editorPassScore   × 0.35)
              + (seoScore           × 0.20)
              + (brandScore         × 0.25)
              + (sectionAvgScore    × 0.20)
```

*Rationale for weights: Brand (0.25) and section quality (0.20) are raised vs. current system, which implicitly weighted only the editor. SEO is lowered from implicit 50% parity to 20% — SEO matters, but voice fidelity matters more.*

**Hard Gates (checked before routing, regardless of score):**

| Condition | Action |
|-----------|--------|
| `brandReport.blocksPublishing = true` | Force revision; brand violations listed FIRST in revision instructions |
| `factFlags` with `confidence ≥ 0.7` present | Surface to user; await approval before proceeding |
| `draftMeta.wordCount > wordCountRange.max × 1.30` | Force cut pass before any other revision |
| `editorialReport.citationScore < 30` | Force citation resolution pass |
| SEO output missing/empty | Re-spawn SEO agent; do not gate without score |

**Routing Table:**

| compositeScore | blocksPublishing | revisionPass | Decision |
|---|---|---|---|
| ≥ 85 | false | any | `proceed` → Stage 8 |
| 65–84 | false | 0 | `revise` → pass 1 |
| 65–84 | false | 1 | `revise` → pass 2 |
| 65–84 | false | 2 | `proceed` with `requiresRevision: true` flag in report |
| < 65 | any | 0 | `redraft` → full re-draft |
| < 65 | any | 1 | `escalate` → stop, report failure to user |
| any | true | 0 | `revise` (brand violations first) |
| any | true | 1 | `revise` (brand violations first) → if still blocking, `escalate` |

**Revision instruction assembly (coordinator builds this, not the writer):**

The coordinator assembles a ranked instruction list:
1. Word count cut instruction (if applicable) — always first
2. Hard constraint violations from brand report
3. `revisionPriority` items from editorial report (in order)
4. Low-scoring sections from section review (lowest score first)
5. Missing keywords from SEO report
6. Soft advisories from brand report (last)

This list is passed to the writer as the complete revision brief. The writer does not read QA reports directly.

**CompositeQAScore output (held in coordinator memory):**
```json
{
  "language": "en",
  "editorScore": 81,
  "seoScore": 82,
  "brandScore": 72,
  "sectionAvgScore": 88,
  "compositeScore": 80,
  "routingDecision": "revise",
  "revisionPass": 0,
  "blocksPublishing": true,
  "hardGatesFired": ["brand_hard_constraint_citations"],
  "revisionInstructions": [
    "PRIORITY 1 (HARD CONSTRAINT): Resolve all [SOURCE: ...] citation placeholders with live hyperlinks. Use the CitationMap at files/drafts/citations.json for source descriptions. Find real URLs for: Palantir FDE job descriptions, Levels.fyi/Glassdoor compensation data, r/palantir community descriptions.",
    "PRIORITY 2: Section 'Technical Depth' (index 1) reads like a job description list in the third paragraph. Add one sentence connecting the requirements to a real-world consequence.",
    "PRIORITY 3 (SEO): Primary keyword 'forward deployed engineer' density is 0.68% — within range. No action needed. Missing keywords to weave in naturally: 'FDE interview process', 'forward deployed engineer salary'."
  ]
}
```

---

### Stage 8: Publisher

No structural changes from current system. Receives final draft, meta, citations, voice guide path, content library path, audience model path. Produces output file + social/email/variants.

**One addition:** Publisher appends the `compositeScore` and `routingDecision` to the output file's frontmatter:

```yaml
---
passScore: 85
compositeScore: 87
revisionPasses: 1
---
```

This data is used in Stage 11 (Learning) to decide voice guide eligibility.

---

### Stage 9: Alternative Format

No structural changes. Skips editorial loop. Uses `SKIP_ALT_FORMAT` flag.

---

### Stage 10: User Feedback Collection (NEW)

**Purpose:** Capture Gülcan's actual reaction to the published post before committing learning updates. This is the external validation that the self-assessed `compositeScore` cannot provide.

**Timing:** Runs after publisher completes. Async — coordinator presents the questionnaire and waits for response. If no response within the session, skip learning updates for this run.

**Feedback Questionnaire (output to user):**

```
─────────────────────────────────────────────
  POST REVIEW — "{postTitle}"
  Published: {outputPath}
  Word count: {wordCount} | CompositeScore: {score}
─────────────────────────────────────────────

Rate each dimension 1–5 (1 = poor, 5 = excellent):

  CLARITY        — Easy to follow, well-structured?
  TONE MATCH     — Sounds like you, not a generic AI blog?
  USEFULNESS     — Would your reader take something from this?
  BRAND FIT      — Represents you the way you'd want?
  SEO NATURALNESS — Keywords feel integrated, not forced?

FREEFORM (optional):
  → What worked well?
  → What would you change?

PUBLISH DECISION:
  [A] As-is   [B] Minor edits   [C] Major edits   [D] Reject
─────────────────────────────────────────────
```

**FeedbackRecord output:** `files/feedback/{slug}-feedback[-lang].json`

```json
{
  "postSlug": "forward-deployed-engineer-skills",
  "language": "en",
  "publishedAt": "2026-04-07T00:05:00.000Z",
  "collectedAt": "2026-04-08T12:00:00.000Z",
  "scores": {
    "clarity": 5,
    "toneMatch": 4,
    "usefulness": 5,
    "brandFit": 4,
    "seoNaturalness": 3
  },
  "averageScore": 4.2,
  "freeform": "The opening anecdote is perfect. The technical section felt a bit listy in the middle.",
  "publishDecision": "minor_edits",
  "classification": "positive",
  "appliedToVoiceGuide": false,
  "appliedToAudienceModel": false
}
```

**Feedback Classification Logic:**

| Condition | Classification | Learning Action |
|-----------|----------------|-----------------|
| `averageScore < 3.0` OR `toneMatch < 3` | `critical` | No voice or audience update |
| `averageScore 3.0–3.9` AND `toneMatch ≥ 3` | `preference` | Audience model update only |
| `averageScore ≥ 4.0` AND `toneMatch ≥ 4` AND `brandFit ≥ 4` | `positive` | Both voice guide and audience model eligible |
| No feedback collected | *(score-only gate)* | Voice guide eligible if `compositeScore ≥ 87`; audience model updated regardless |

---

### Stage 11: Learning Updates

#### 11a. Voice Guide Update (Via Voice Curator)

The coordinator spawns `voice-curator` only if:
- `feedbackClassification = 'positive'` (or no feedback + `compositeScore ≥ 87`)
- `compositeScore ≥ 85`
- `brandReport.overallBrandScore ≥ 80`

**Voice Curator task:**
1. Read the final draft
2. Read `memory/gulcan-voice.md` to see existing examples
3. Select one paragraph (3–6 sentences) that best exemplifies Gülcan's voice, using this rubric:
   - Personal, specific, not generic
   - Contains at least one voice marker from the guide
   - Would be unrecognizable as AI output without context
   - Is NOT semantically similar to any existing example (different hook type, different topic domain)
4. If no sufficiently distinct paragraph exists, output `{ "eligible": false, "reason": "..." }`
5. If eligible, output the selected paragraph + formatted example block

**Voice Curator output:** `files/drafts/voice-example[-lang].json`

```json
{
  "eligible": true,
  "paragraph": "Last Tuesday I watched a colleague spend forty minutes...",
  "exampleBlock": "### Example {N}: en how-to — \"Build a Second Brain with AI\" (passScore: 92)\n\n> Last Tuesday I watched...",
  "distinctiveElements": ["specific time reference ('Last Tuesday')", "observed-a-colleague frame", "specific duration ('forty minutes')"],
  "notSimilarTo": ["Example 1 (different hook: friend-told-me vs. I-watched)", "Example 2 (different domain: AI tools vs. hiring)"]
}
```

**Coordinator applies cap logic:**
1. Count `### Example` occurrences between `<!-- EXAMPLES_START -->` and `<!-- EXAMPLES_END -->`
2. If count ≥ 5: find the example with the lowest `passScore` in parentheses; remove it; renumber remaining
3. Append new example block
4. Write updated `memory/gulcan-voice.md`

#### 11b. Audience Model Update

Coordinator appends a new signal to `memory/audience-model.json` for any post that completed publishing (regardless of feedback):

```json
{
  "postSlug": "forward-deployed-engineer-skills",
  "postTitle": "The Skills You Actually Need to Become a Forward Deployed Engineer",
  "format": "explainer",
  "language": "en",
  "keywords": ["forward deployed engineer", "FDE skills"],
  "publishedAt": "2026-04-08T00:00:00.000Z",
  "compositeQAScore": 85,
  "feedbackScore": 4.2,
  "feedbackClassification": "positive"
}
```

**Promotion logic (coordinator evaluates after each update):**
- Count signals per format → if ≥ 3 signals AND average `feedbackScore ≥ 4.0` → promote format to `topPerformingFormats`
- Count signals per keyword → if ≥ 3 signals → promote keyword to `topPerformingKeywords`

---

## 3. Structured Output Contracts (Full Schemas)

### RunConfig
```typescript
interface RunConfig {
  runId: string;                    // UUID v4
  topic: string;
  languages: ('en' | 'tr')[];
  format?: 'explainer' | 'how-to' | 'listicle' | 'opinion' | 'case-study';
  tone?: string;
  keywords?: string[];
  wordCountTarget: 'short' | 'standard' | 'long';
  wordCountRange: { min: number; max: number };
  pauseAfterOutline: boolean;
  skipAltFormat: boolean;
  startedAt: string;                // ISO 8601
}
```

### SubtopicFindings
```typescript
interface SubtopicFindings {
  slug: string;
  subtopic: string;
  summary: string;                  // 1–3 sentence overview
  keyFindings: Finding[];
  targetFacts: string[];            // verbatim sentences to use in post
  usefulQuotes: Quote[];
  dataGaps: string[];
  sources: string[];
}

interface Finding {
  claim: string;
  source: string;
  confidence: number;              // 0.0–1.0
}

interface Quote {
  text: string;
  attribution: string;
}
```

### ResearchSynthesis
```typescript
interface ResearchSynthesis {
  subtopicSlugs: string[];
  resolvedConflicts: ConflictResolution[];
  masterFactList: MasterFact[];     // max 25, confidence ≥ 0.7
  lowConfidenceFacts: MasterFact[]; // confidence < 0.7
  coverageGaps: string[];
}

interface ConflictResolution {
  metric: string;
  conflictingValues: { value: string; source: string; confidence: number }[];
  resolvedValue: string;
  resolvedSource: string;
  resolvedConfidence: number;
  rationale: string;
}

interface MasterFact {
  claim: string;
  confidence: number;
  sourceSlug: string;
  approved: boolean;
}
```

### OutlineDoc
```typescript
interface OutlineDoc {
  topic: string;
  format: string;
  language: 'en' | 'tr';
  slug: string;
  thesis: string;
  targetKeywords: string[];
  targetAudience: string;
  targetWordCount: number;
  wordCountBudget: {
    introduction: number;
    body: number;
    conclusion: number;
    total: number;
  };
  differentiationNotes: string;
  sections: Section[];
  researchSlugs: string[];
}

interface Section {
  heading: string;
  type: 'introduction' | 'body' | 'conclusion';
  keyPoints: string[];
  targetFacts: string[];
  estimatedWordCount: number;
}
```

### DraftMeta
```typescript
interface DraftMeta {
  title: string;
  slug: string;
  topic: string;
  format: string;
  language: 'en' | 'tr';
  wordCount: number;
  thesis: string;
  targetKeywords: string[];
  primaryKeyword: string;
  targetAudience: string;
  citationCount: number;
  sectionWordCounts: Record<string, number>;
  createdAt: string;
}
```

### CompositeQAScore
```typescript
interface CompositeQAScore {
  language: 'en' | 'tr';
  editorScore: number;          // 0–100, weight 0.35
  seoScore: number;             // 0–100, weight 0.20
  brandScore: number;           // 0–100, weight 0.25
  sectionAvgScore: number;      // 0–100, weight 0.20
  compositeScore: number;       // weighted sum
  routingDecision: 'proceed' | 'revise' | 'redraft' | 'escalate';
  revisionPass: number;         // 0 = initial, 1 = first revision, 2 = second revision
  blocksPublishing: boolean;
  hardGatesFired: string[];
  revisionInstructions: string[];  // ordered list, highest priority first
}
```

### AgentError (Universal Error Envelope)
```typescript
interface AgentOutput<T> {
  status: 'ok' | 'partial' | 'error';
  data: T | null;
  error: AgentError | null;
  warnings: Warning[];
}

interface AgentError {
  stage: string;
  agentRole: string;
  language: 'en' | 'tr' | 'agnostic';
  errorType: 'validation' | 'output_parse' | 'timeout' | 'content_policy' | 'schema_mismatch' | 'unknown';
  message: string;
  retryable: boolean;
  retryCount: number;
  fatal: boolean;                // if true, halt this branch
}

interface Warning {
  code: string;
  message: string;
  severity: 'info' | 'warn';
}
```

---

## 4. Quality Control System

### Scoring Rubric Summary

| Dimension | Agent | Weight | Key Sub-dimensions |
|-----------|-------|--------|-------------------|
| Global editorial | Editor | 35% | Voice, structure, citations, narrative arc, tone consistency |
| Brand compliance | Brand Checker | 25% | Hard constraint adherence, voice markers, topic avoidance |
| Section quality | Section Reviewer | 20% | Per-section voice, argument, fact density |
| SEO | SEO Agent | 20% | Keyword density, readability, meta |

### Hard Gates (block routing regardless of score)

```
brandReport.blocksPublishing = true          → always revise first
factFlags with confidence ≥ 0.7 present      → escalate to user
wordCount > wordCountRange.max × 1.30        → cut pass (pre-QA)
editorialReport.citationScore < 30           → citation pass
SEO output missing                           → re-spawn SEO
```

### Max Retry Rules

| Stage | Max Retries | On Exhaustion |
|-------|-------------|---------------|
| Research agent | 1 | Skip subtopic (if ≥ 2 others completed) |
| Outline agent | 1 | Halt branch, report error |
| Writer (word count cut) | 1 | Proceed to QA with warning |
| Revision pass | 2 | Proceed with `requiresRevision: true` |
| Re-draft | 1 | Escalate to user, halt branch |
| Brand-checker (post-revision) | 1 | Escalate if still blocking |
| SEO agent | 1 | Proceed with warning (SEO not a hard gate) |

---

## 5. User Feedback System

*(See Stage 10 above for the questionnaire design and FeedbackRecord schema.)*

**Classification → Action Matrix:**

| Classification | Voice Guide | Audience Model | Content Library |
|----------------|-------------|----------------|-----------------|
| `positive` | Eligible (if score ≥ 85 + voice curator approves) | ✅ Added | ✅ Added |
| `preference` | ❌ Not updated | ✅ Added | ✅ Added |
| `critical` | ❌ Not updated | ✅ Added (negative signal) | ✅ Added |
| No feedback | Score-only gate (≥ 87) | ✅ Added | ✅ Added |

**Protecting the voice guide from bad feedback:**
- Feedback score is a gate, not a bypass — a `positive` feedback score still requires the Voice Curator to find a genuinely distinctive paragraph
- Voice Curator explicitly checks for semantic similarity to existing examples
- The Voice Curator is a separate agent, not the coordinator — it has no incentive to approve its own work
- A post where the writer was re-drafted (had `passScore < 65` at any point) is ineligible for voice guide update regardless of final score or feedback

---

## 6. Memory & Learning Strategy

### What Gets Stored

| Item | Storage Target | Gate |
|------|---------------|------|
| Voice example paragraph | `memory/gulcan-voice.md` | compositeScore ≥ 85 + curator approves + feedback positive (or no feedback + score ≥ 87) |
| Audience signal | `memory/audience-model.json` | Every completed publish |
| Feedback record | `files/feedback/{slug}-feedback.json` | Always (if feedback collected) |

### What Never Gets Stored

- Debug runs, test topics, or runs where the user explicitly marked as `[TEST]`
- Posts that failed to pass triage (`routingDecision: 'escalate'`)
- Posts where `publishDecision: 'reject'` in feedback

### Safe Audience Model Updates

The coordinator edits `memory/audience-model.json` directly (not via subagent). Updates are append-only — no existing signal is modified or deleted. Promotion of formats/keywords to `topPerforming*` arrays requires 3+ signals AND average feedbackScore ≥ 4.0 (not just publication count).

### Voice Guide Protection Checklist

Before appending any example:
1. compositeScore in output frontmatter ≥ 85 ✓
2. brandReport.overallBrandScore ≥ 80 ✓
3. feedbackClassification = 'positive' OR (no feedback AND compositeScore ≥ 87) ✓
4. voice-curator returned `eligible: true` ✓
5. Count existing examples — apply cap if ≥ 5 ✓
6. New example is not semantically similar to any existing example ✓

---

## 7. Dual-Language Architecture

### Shared Context (Language-Agnostic)

| Item | Shared | Rationale |
|------|--------|-----------|
| RunConfig | ✅ | Single topic, same intent |
| ContextPacket | ✅ (both languages read same packet) | Brand voice is the same person |
| Research files | ✅ | Facts don't change by language |
| ResearchSynthesis | ✅ | Same conflict resolution for both branches |

### Per-Language (Fully Isolated)

All draft artifacts, all QA reports, all CompositeQAScores, all publisher outputs, all FeedbackRecords.

### Turkish-Specific Context Additions

Every TR outline and writer task prompt includes this Turkish audience block:

```
TURKISH LANGUAGE MODE:
- Write in Turkish natively. Do not translate from English.
- Target audience: Turkish technical professionals and founders.
- Prefer Turkey-specific data points, Turkish company examples, and local business context where the research supports it. Global insights should be filtered through "what does this mean for Turkish professionals?"
- Voice checklist (must include ALL):
  □ Use "gene" not "yine"
  □ Use "pek çok" not "birçok"  
  □ At least one `:)` after an ironic or self-deprecating observation
  □ At least one rhetorical question as a paragraph opener
  □ Flows like spoken Turkish — not like translated English prose
  □ At least one "bir yandan... bir yandan..." construction (if the topic supports it)
- Gülcan's Turkish writing uses more humor and more rhetorical questions than her English writing. The tone is warmer and more personal.
```

### Cross-Language Consistency Check

After both outlines complete (before spawning writers), coordinator checks:
- Do both posts defend the same thesis? (Phrasing may differ; substance must not contradict.)
- Do both posts use the same resolved value for any conflicted statistic?

If contradiction found, coordinator corrects the lower-confidence outline before spawning writers.

### No Translation Artifacts Rule

Neither TR outline nor TR writer is shown the EN output at any point. The two branches see the same research and ContextPacket, but no cross-language content. This prevents Turkish output that reads like translated English (a known failure mode of multilingual AI systems).

---

## 8. Error Handling & Reliability

### Error Propagation Pattern

Every agent writes output in the `AgentOutput<T>` envelope:

```json
{
  "status": "error",
  "data": null,
  "error": {
    "stage": "Writing",
    "agentRole": "writer",
    "language": "tr",
    "errorType": "validation",
    "message": "Draft word count 3,412 exceeds maximum × 1.30 (2,600). Cut pass required before QA.",
    "retryable": true,
    "retryCount": 0,
    "fatal": false
  },
  "warnings": []
}
```

The coordinator reads `status` first. If `error`, it checks `retryable` and `retryCount` before spawning a retry or halting.

### Partial Results Handling

If a research agent fails:
- Continue with remaining subtopics
- Note the missing subtopic in `ResearchSynthesis.coverageGaps`
- Pass `coverageGaps` to outline agents as: "Research for '{subtopic}' is unavailable. Do not fabricate findings for this area. Note the gap in the post if it would leave a meaningful hole in the argument."

If an SEO agent fails:
- Set `seoScore = 0` with a warning (not null)
- Exclude SEO from composite score calculation for this run (reweight: editor 43%, brand 32%, sections 25%)
- Note in final report: "SEO score unavailable — composite excludes SEO dimension"

If one language branch fails re-draft:
- Mark branch as `status: failed` in final report
- Continue other branch to completion
- Do not update voice guide or audience model for the failed branch

### Checkpoint & Idempotency

Write `files/checkpoint.json` after every stage completion:

```json
{
  "runId": "uuid",
  "stage": "Outline",
  "language": "en",
  "completedAt": "2026-04-08T11:00:00.000Z",
  "runTopic": "Forward Deployed Engineer Skills",
  "completedBranches": ["en"],
  "pendingBranches": []
}
```

If a run is re-invoked with the same `runId`, coordinator reads `checkpoint.json` and skips completed stages. (Requires explicit user invocation with `runId`; not automatic.)

---

## 9. Claude Code Implementation Plan

### Orchestrator Logic (CLAUDE.md Updates)

The CLAUDE.md coordinator prompt should be updated to:

1. **Construct RunConfig first** — write to `files/run-config.json` before spawning any agents
2. **Load ContextPacket once** — four Read tool calls in one response; never re-read memory files
3. **Pass structured context, not file paths** — agents receive content inline, not instructions to "read memory/brand-guide.json"
4. **Compute CompositeQAScore in coordinator** — no agent decides routing; the coordinator runs the formula
5. **Assemble revision instructions** — coordinator builds the ordered list; writer never reads QA reports
6. **All retries are explicit** — no retry without structured error feedback from the failed agent

### Subagent Invocation Pattern

Every agent task prompt follows this template:

```
ROLE: You are a [role] in a blog production pipeline.

TASK: [specific task]

INPUTS:
- [file path or inline content]
- [file path or inline content]

OUTPUT:
Write your result to: [output file path]

OUTPUT FORMAT: Valid JSON matching this schema:
[schema]

EXAMPLE OUTPUT:
[minimal valid example]

ERROR HANDLING:
If you cannot produce valid output, write:
{"status":"error","data":null,"error":{"stage":"[stage]","agentRole":"[role]","language":"[lang]","errorType":"[type]","message":"[what failed]","retryable":true,"retryCount":0,"fatal":false},"warnings":[]}

CONTEXT ISOLATION:
Do NOT read any files other than those listed in INPUTS above.
Do NOT write to any file other than the output file path above.
```

### File Read/Write Boundaries (Strict)

| Agent | May Read | Must Write |
|-------|----------|-----------|
| `researcher` | Nothing (web search only) | `files/research/{slug}.json` |
| `outline` | `files/research/{slug}.json` (listed slugs only) | `files/drafts/outline[-lang].json` |
| `writer` | `files/drafts/outline[-lang].json`, `files/research/{slug}.json` | `files/drafts/draft[-lang].md`, `draft-meta[-lang].json`, `citations[-lang].json` |
| `section-reviewer` | `files/drafts/draft[-lang].md` | `files/drafts/section-review[-lang].json` |
| `editor` | `files/drafts/draft[-lang].md`, `files/drafts/draft-meta[-lang].json` | `files/drafts/editorial-report[-lang].json` |
| `seo` | `files/drafts/draft[-lang].md`, `files/drafts/draft-meta[-lang].json` | `files/drafts/seo-analysis[-lang].json` |
| `brand-checker` | `files/drafts/draft[-lang].md` (brand guide inline) | `files/drafts/brand-report[-lang].json` |
| `publisher` | `files/drafts/draft[-lang].md`, `draft-meta[-lang].json`, `citations[-lang].json` | `files/output/...` |
| `feedback-collector` | Nothing | `files/feedback/{slug}-feedback[-lang].json` |
| `voice-curator` | `files/drafts/draft[-lang].md`, `memory/gulcan-voice.md` | `files/drafts/voice-example[-lang].json` |
| coordinator | Everything | `files/run-config.json`, `files/checkpoint.json`, `memory/gulcan-voice.md`, `memory/audience-model.json` |

### Keeping the System Debuggable

- Every stage writes to disk before the next stage begins — no in-memory hand-off
- `files/run-config.json` is written before any agent spawns — a crash at any point leaves a recoverable state
- Checkpoint records the `runId` — identical runs can be distinguished by ID
- QA reports are never deleted — they accumulate and can be compared across revision passes
- Coordinator writes revision pass number to checkpoint — easy to see how many passes a post required

---

## 10. Prompt Templates

### Coordinator Prompt (Intake Section)

```
You are the Blog Production Coordinator. Your job is to orchestrate a pipeline that produces
blog posts in Gülcan Yayla's voice.

STEP 0 — PARSE INTAKE
From the user's message, extract:
- topic (required — ask if missing)
- languages: detect from message
  - ['en', 'tr'] if: "both English and Turkish", "dual language", "hem İngilizce hem Türkçe"
  - ['tr'] if: "in Turkish", "Türkçe", or message is written in Turkish
  - ['en'] for all others
- format: user-specified or null (you will determine from audience model)
- tone: user-specified or null
- keywords: user-specified or []
- wordCountTarget: "short" | "standard" | "long" — default "standard"
- pauseAfterOutline: true if "[PAUSE_AFTER_OUTLINE]" in message
- skipAltFormat: true if "[SKIP_ALT_FORMAT]" in message

Write the parsed config to files/run-config.json as RunConfig JSON.
Then proceed to Step 1.
```

### Researcher Prompt Template

```
ROLE: You are a researcher for a blog production pipeline. Your job is to find accurate,
well-sourced information on a specific subtopic.

TASK: Research the following subtopic:
"{subtopic}"

This research will be used in a blog post about: "{topic}"

PRIOR COVERAGE:
{priorCoverageList}
If prior posts already covered an angle listed above, find data or framing that post did not use.

OUTPUT FILE: files/research/{slug}.json

OUTPUT FORMAT:
{
  "slug": "{slug}",
  "subtopic": "{subtopic}",
  "summary": "1–3 sentence overview of findings",
  "keyFindings": [
    { "claim": "...", "source": "...", "confidence": 0.0–1.0 }
  ],
  "targetFacts": ["verbatim sentences that should appear in the post"],
  "usefulQuotes": [{ "text": "...", "attribution": "..." }],
  "dataGaps": ["things you could not find"],
  "sources": ["list of sources consulted"]
}

RULES:
- confidence: 0.9+ = primary source, 0.7–0.9 = credible secondary, 0.5–0.7 = community/uncertain
- Never fabricate statistics — mark as a dataGap if unavailable
- Prefer specific numbers over ranges; prefer named sources over "some reports"
- Minimum 5 keyFindings to pass validation

ERROR HANDLING: If you cannot produce valid output, write:
{"status":"error","data":null,"error":{"stage":"Research","agentRole":"researcher","language":"agnostic","errorType":"unknown","message":"[what failed]","retryable":true,"retryCount":0,"fatal":false},"warnings":[]}
```

### Writer Prompt Template

```
ROLE: You are a writer producing blog content in Gülcan Yayla's voice.
You write for her — not about her. Every word should sound like she wrote it.

BRAND GUIDE:
{brandGuideJSON}

VOICE GUIDE:
{voiceGuideText}

TASK: Write a {format} blog post in {language} on this topic:
"{topic}"

OUTLINE: Read the full outline from: {outlinePath}
Follow the outline section by section. Do not add sections not in the outline.
Do not exceed each section's estimatedWordCount by more than 15%.

MASTER FACTS (you MUST use all of these):
{masterFactList}

KNOWN DATA CONFLICTS (use the resolved value):
{resolvedConflicts}

RESEARCH FILES (read for detail and quotes):
{researchSlugs}

{wordCountInstruction}
{languageInstruction}

OUTPUT FILES:
1. {draftPath} — prose draft
2. {draftMetaPath} — DraftMeta JSON
3. {citationsPath} — CitationMap JSON

CITATION RULE: Every factual claim must have an inline citation placeholder:
[SOURCE: {source description}]
These will be resolved to live URLs by the publisher. Do NOT leave claims uncited.

VOICE RULES (non-negotiable):
- Open with a personal anecdote or specific concrete moment — never a rhetorical question or generic statement
- Include "Let me explain how." as a standalone sentence at least once
- Keep paragraphs under 5 sentences
- Active voice throughout — no passive constructions
- End with an actionable takeaway
- No corporate buzzwords
- Do NOT open any paragraph with "In conclusion", "To summarize", or "In today's"
```

### Section Reviewer Prompt Template

```
ROLE: You are a section-level editorial reviewer. You evaluate each section of a blog draft
independently, without knowledge of the brand guide, research, or outline.

TASK: Read the draft at {draftPath} and score each section independently.

For each section, evaluate:
1. VOICE SCORE (0–100): Does this section sound like a specific human voice?
   Penalize: generic phrases, passive voice, buzzwords, listicle-style bullets without narrative
2. ARGUMENT SCORE (0–100): Is the argument in this section clear and well-supported?
   Penalize: unsupported claims, circular reasoning, non-sequiturs between sentences
3. FACT DENSITY SCORE (0–100): Does this section use specific data, names, numbers?
   Penalize: vague claims ("many companies", "some studies"), opinion stated as fact

OUTPUT FILE: {sectionReviewPath}
OUTPUT FORMAT: SectionReviewReport[] JSON

ISOLATION RULE: Read ONLY {draftPath}. Do not read any other files.
Score what is on the page — not what should be there based on the topic.
```

### Editor Prompt Template (Global Pass)

```
ROLE: You are a global editorial reviewer. You evaluate the full draft for cross-section
coherence — narrative arc, tone consistency, and structural integrity.

TASK: Read the draft at {draftPath} and the metadata at {draftMetaPath}.
Evaluate the post as a whole reading experience.

EVALUATE:
1. VOICE SCORE: Does the voice stay consistent from opening to conclusion?
2. STRUCTURE SCORE: Is the narrative arc complete? Introduction → development → resolution?
3. CITATION SCORE: Are factual claims cited? Are [SOURCE: ...] placeholders present?
4. NARRATIVE ARC SCORE: Does each section follow logically from the previous?
5. TONE CONSISTENCY SCORE: Does the tone drift mid-post?

COMPUTE passScore: weighted average of the five scores above.

OUTPUT FILE: {editorialReportPath}

CITATION RULE: If the draft contains uncited factual claims (no [SOURCE:] placeholder),
mark citationScore accordingly and add to revisionPriority with severity: "hard_constraint".

ISOLATION RULE: Read ONLY {draftPath} and {draftMetaPath}.
Do NOT read brand guide, research files, or outline.
```

### Brand Checker Prompt Template

```
ROLE: You are a brand compliance checker. You verify that a blog draft adheres to the
brand guide's hard constraints and voice preferences.

BRAND GUIDE:
{brandGuideJSON}

VOICE GUIDE:
{voiceGuideText}

TASK: Read the draft at {draftPath} and evaluate compliance.

HARD CONSTRAINTS EVALUATION:
For each rule in brandGuide.hardConstraints, determine:
- status: "PASSED" or "VIOLATED"
- evidence: specific quote or observation from the draft
- blocksPublishing: true if violated (ANY violated hard constraint → overall blocksPublishing: true)

VOICE COMPLIANCE:
Evaluate each item in the voiceCompliance checklist.

AVOID TOPICS CHECK:
Verify the draft does not contain: {avoidTopics}

OUTPUT FILE: {brandReportPath}

CRITICAL RULE: If ANY hardConstraints evaluation entry has blocksPublishing: true,
the top-level blocksPublishing field MUST be true. Do not set blocksPublishing: false
when a hard constraint is violated.
```

### QA Prompt (Feedback Collector)

```
ROLE: You are collecting post-publication feedback from the author, Gülcan Yayla.

TASK: Present a structured review questionnaire and collect responses.

POST DETAILS:
- Title: {postTitle}
- File: {outputPath}
- Word count: {wordCount}
- Composite QA score: {compositeScore}

OUTPUT THE FOLLOWING TO THE USER:
─────────────────────────────────────────────
  POST REVIEW — "{postTitle}"
  Published: {outputPath}
  Word count: {wordCount} | QA Score: {compositeScore}
─────────────────────────────────────────────

Rate each 1–5 (1 = poor, 5 = excellent):

  CLARITY        — Easy to follow, well-structured?
  TONE MATCH     — Sounds like you, not a generic AI blog?
  USEFULNESS     — Would your reader take something actionable?
  BRAND FIT      — Represents you professionally?
  SEO NATURALNESS — Keywords feel integrated, not forced?

FREEFORM (optional — press enter to skip):
  → What worked well?
  → What would you change?

PUBLISH DECISION: [A] As-is  [B] Minor edits  [C] Major edits  [D] Reject
─────────────────────────────────────────────

Wait for the user's response, then write FeedbackRecord JSON to: {feedbackPath}
Classify as 'critical' / 'preference' / 'positive' using the classification rules.
```

---

## Implementation Priority

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Fix brand-checker `blocksPublishing` logic | Low | Eliminates gate inconsistency |
| P0 | Add CompositeQAScore calculation to coordinator | Low | Proper multi-signal routing |
| P1 | Add Section Reviewer agent | Medium | Catches section-level problems |
| P1 | Add User Feedback Questionnaire (Stage 10) | Low | Enables external validation |
| P1 | Voice Curator agent | Medium | Prevents low-quality examples |
| P2 | ResearchSynthesis as explicit stage | Low | Cleaner coordinator logic |
| P2 | AgentOutput error envelope | Medium | Structured retry logic |
| P2 | RunConfig written to disk | Low | Idempotency |
| P3 | Audience model promotion logic | Low | Better format/keyword signals |
| P3 | Cross-language consistency check | Low | Prevents contradictory dual posts |

---

## Extensibility: Messaging Interfaces (WhatsApp / Telegram)

The architecture is compatible with messaging interfaces with these additions:

1. **Intake via webhook:** A message received on WhatsApp/Telegram triggers a `RunConfig` construction from the message text. The same language detection and parameter parsing logic applies.

2. **Feedback collection via messaging:** The `FeedbackRecord` questionnaire maps directly to a conversational flow — each dimension becomes a message with 1–5 reply options. The feedback-collector agent works identically whether receiving input from a terminal or a message interface.

3. **Progress updates:** Checkpoints can be forwarded as status messages: "Research complete (3/3 subtopics). Writing now..." This requires the coordinator to emit messages at each checkpoint, which is already the pattern.

4. **Output delivery:** The publisher can add a final step: upload the output file and send the path (or a preview snippet) to the messaging interface. Social snippets from the publisher output are naturally suited for this.

The only coupling concern is the coordinator prompt in CLAUDE.md — it assumes terminal I/O. Extract the intake parsing and report formatting into separate functions/prompts to make them interface-agnostic.
