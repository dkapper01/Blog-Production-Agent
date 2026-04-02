/**
 * Domain schemas for the blog production pipeline.
 * These interfaces serve as contracts between agent stages.
 */

// ---------------------------------------------------------------------------
// Research layer
// ---------------------------------------------------------------------------

/** A single verifiable fact extracted from a source */
export interface Fact {
  claim: string;
  value?: string | number;     // quantitative value when applicable
  unit?: string;               // e.g. "%" or "USD"
  year?: number;
  confidence: number;          // 0–1: how strongly the source supports this claim
}

/** A source citation */
export interface Citation {
  id: string;                  // unique ID within a research file, e.g. "c1"
  title: string;
  url: string;
  publishedDate?: string;      // ISO date string
  accessedDate: string;        // ISO date string
}

/** Reference from a draft section back to a Citation by ID */
export interface CitationRef {
  citationId: string;          // matches Citation.id
  anchor: string;              // display text used for the inline link
  sectionHeading: string;      // H2 heading of the section that uses it
}

/** Full citation map written to files/drafts/citations.json by the writer */
export interface CitationMap {
  citations: Citation[];       // deduplicated across all research files
  refs: CitationRef[];         // one entry per use in the draft
  generatedAt: string;         // ISO datetime
}

/** Output written by each Researcher subagent to files/research/{slug}.json */
export interface SubtopicFindings {
  subtopic: string;            // human-readable label
  slug: string;                // kebab-case, used as filename stem
  summary: string;             // 2–4 sentence prose summary
  facts: Fact[];
  citations: Citation[];
  researchedAt: string;        // ISO datetime
}

/** Aggregated view the Coordinator builds from all SubtopicFindings */
export interface ResearchSummary {
  topic: string;
  subtopics: SubtopicFindings[];
  totalFacts: number;
  totalCitations: number;
  completedAt: string;         // ISO datetime
}

// ---------------------------------------------------------------------------
// Outline layer
// ---------------------------------------------------------------------------

export type PostFormat = 'explainer' | 'how-to' | 'listicle' | 'opinion' | 'case-study';

/** Language the post is written in — 'en' (default) or 'tr' (Turkish) */
export type PostLanguage = 'en' | 'tr';

/** SEO scaffold attached to the outline */
export interface SEOScaffold {
  primaryKeyword: string;
  secondaryKeywords: string[];
  internalLinkSlots: string[];  // placeholder anchors for internal links
}

/** One section in the blog outline */
export interface OutlineSection {
  heading: string;
  level: 'h2' | 'h3';
  keyPoints: string[];          // specific claims the section must address
  targetFacts: string[];        // fact claims from research assigned to this section
  targetKeywords: string[];     // keywords to naturally place here
  estimatedWords: number;
}

/** Written to files/drafts/outline.json by the Outline Agent */
export interface BlogOutline {
  title: string;
  h1: string;
  format: PostFormat;
  language: PostLanguage;        // 'en' (default) or 'tr'
  sections: OutlineSection[];
  estimatedTotalWords: number;
  keywordCoverageMap: Record<string, boolean>;  // keyword → covered in outline?
  seoScaffold: SEOScaffold;
  createdAt: string;            // ISO datetime
}

// ---------------------------------------------------------------------------
// SEO layer
// ---------------------------------------------------------------------------

/** Written to files/drafts/seo-analysis.json by the SEO Agent */
export interface SEOAnalysis {
  keywordDensity: Record<string, number>;   // keyword → occurrences per 1000 words
  missingKeywords: string[];                // target keywords not found in draft
  headingQuality: {
    h1Count: number;
    h2Count: number;
    primaryKeywordInH1: boolean;
    issues: string[];
  };
  metaSuggestions: {
    titleVariants: string[];
    metaDescriptionVariants: string[];
  };
  readabilityScore: number;                 // Flesch-Kincaid approximation (0–100)
  internalLinkOpportunities: string[];      // anchor text suggestions
  analyzedAt: string;                       // ISO datetime
}

// ---------------------------------------------------------------------------
// Writing layer
// ---------------------------------------------------------------------------

/** Metadata produced alongside the draft markdown */
export interface DraftPost {
  title: string;
  slug: string;                // kebab-case URL slug
  language: PostLanguage;      // 'en' (default) or 'tr'
  summary: string;             // 1–2 sentence excerpt
  targetKeywords: string[];
  wordCount: number;
  sections: string[];          // ordered list of H2 headings
  citationCount: number;
  draftFile: string;           // relative path to draft markdown
  writtenAt: string;           // ISO datetime
}

// ---------------------------------------------------------------------------
// Brand / memory layer
// ---------------------------------------------------------------------------

/** Hard constraints that the writer must always satisfy */
export interface HardConstraint {
  rule: string;
  example?: string;
}

/** Soft preferences — should follow unless context overrides */
export interface SoftPreference {
  preference: string;
  example?: string;
}

/** Loaded from memory/brand-guide.json */
export interface BrandGuide {
  voice: string;               // one-sentence voice description
  tone: string[];              // tone adjectives
  targetAudience: string;
  hardConstraints: HardConstraint[];
  softPreferences: SoftPreference[];
  avoidTopics: string[];
  preferredWordCount: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Content library
// ---------------------------------------------------------------------------

/** One entry per published post, persisted in memory/content-library.json */
export interface ContentLibraryEntry {
  id: string;                  // UUID
  title: string;
  slug: string;
  summary: string;
  keywords: string[];
  publishedAt: string;         // ISO datetime
  outputFile: string;          // relative path to final output file
}

// ---------------------------------------------------------------------------
// Editorial layer
// ---------------------------------------------------------------------------

export type EditorialIssueType = 'clarity' | 'accuracy' | 'brand' | 'flow' | 'seo';
export type EditorialSeverity = 'critical' | 'major' | 'minor';

/** A single issue flagged by the Editor Agent */
export interface EditorialIssue {
  type: EditorialIssueType;
  severity: EditorialSeverity;
  sectionRef: string;           // H2 heading of the affected section
  description: string;          // what is wrong
  suggestion: string;           // how to fix it
}

/** A factual claim the editor cannot verify against the provided citations */
export interface FactFlag {
  claim: string;                // verbatim claim from the draft
  concern: string;              // why it is suspect
  confidence: number;           // editor's confidence the claim is wrong (0–1)
}

/** Written to files/drafts/editorial-report.json by the Editor Agent */
export interface EditorialReport {
  passScore: number;            // 0–100; ≥85 = proceed, 65–84 = revise, <65 = re-draft
  issues: EditorialIssue[];
  factFlags: FactFlag[];
  requiresRevision: boolean;    // true if passScore < 85
  revisionPriority: string[];   // ordered list of issue descriptions to address first
  checkedAt: string;            // ISO datetime
}

// ---------------------------------------------------------------------------
// Publishing layer
// ---------------------------------------------------------------------------

export type SocialPlatform = 'linkedin' | 'twitter' | 'substack';

/** A single platform-specific social snippet */
export interface SocialSnippet {
  platform: SocialPlatform;
  text: string;                // ready-to-post copy
  hashtags: string[];
  characterCount: number;
}

/** All social snippets for one post — written to files/output/{date}-{slug}-social.json */
export interface SocialSnippetSet {
  postSlug: string;
  postTitle: string;
  snippets: SocialSnippet[];
  generatedAt: string;         // ISO datetime
}

/** Email teaser written to files/output/{date}-{slug}-email.json */
export interface EmailTeaser {
  postSlug: string;
  subjectLine: string;         // ≤60 characters
  previewText: string;         // ≤90 characters, shown in inbox before open
  body: string;                // 3–5 sentence email body with CTA
  ctaText: string;             // button/link label, e.g. "Read the full post"
  ctaUrl: string;              // placeholder — filled in when post is live
  generatedAt: string;         // ISO datetime
}

/** One headline + meta variant for A/B testing */
export interface ABVariant {
  id: 'A' | 'B';
  title: string;               // post headline
  metaDescription: string;     // 140–160 character meta description
  openingHook: string;         // alternative first sentence for social/email use
  angle: string;               // one-line description of the angle this variant takes
}

/** Both variants written to files/output/{date}-{slug}-variants.json */
export interface ABVariantSet {
  postSlug: string;
  variants: [ABVariant, ABVariant];  // always exactly A and B
  generatedAt: string;               // ISO datetime
}

/** Result returned after the Publisher writes all output files */
export interface PublishResult {
  success: boolean;
  outputFile: string;          // path to published post
  socialFile: string;          // path to social snippets JSON
  emailFile: string;           // path to email teaser JSON
  variantsFile: string;        // path to A/B variants JSON
  libraryEntry: ContentLibraryEntry;
  publishedAt: string;
}

// ---------------------------------------------------------------------------
// Audience model
// ---------------------------------------------------------------------------

/** One data point per published post — grows over time */
export interface AudienceSignal {
  postSlug: string;
  postTitle: string;
  format: PostFormat;
  language: PostLanguage;      // 'en' (default) or 'tr'
  keywords: string[];
  publishedAt: string;         // ISO datetime
  engagementScore?: number;    // 0–100, filled in manually or via platform integration
  notes?: string;              // optional human annotation (what worked, what didn't)
}

/** Persisted in memory/audience-model.json */
export interface AudienceModel {
  signals: AudienceSignal[];
  topPerformingFormats: PostFormat[];   // derived: formats ranked by avg engagementScore
  topPerformingKeywords: string[];      // derived: keywords from highest-scoring posts
  lastUpdated: string;                  // ISO datetime
}

// ---------------------------------------------------------------------------
// Platform publishing layer
// ---------------------------------------------------------------------------

export type PublishPlatform = 'linkedin' | 'substack' | 'email';

/** Describes one platform target for live publishing */
export interface PublishTarget {
  platform: PublishPlatform;
  /** Platform-specific config — e.g. page URN for LinkedIn, publication ID for Substack */
  config?: Record<string, string>;
}

/** Result returned by each platform stub after attempting to publish */
export interface PlatformPublishResult {
  platform: PublishPlatform;
  success: boolean;
  /** URL of the published content, if available */
  url?: string;
  /** Human-readable status from the platform (or stub notice) */
  message: string;
  publishedAt: string;          // ISO datetime
}

// ---------------------------------------------------------------------------
// Pipeline job spec (top-level input)
// ---------------------------------------------------------------------------

/** Passed by the coordinator to kick off a research + writing run */
export interface BlogJobSpec {
  topic: string;               // user's original request
  subtopics: string[];         // coordinator-decomposed subtopics
  /** One or two languages to produce. ['en'] = English only, ['tr'] = Turkish only,
   *  ['en', 'tr'] = dual-language run (independent EN and TR pipelines). */
  languages: PostLanguage[];
  targetAudience?: string;     // override brand guide default
  targetKeywords?: string[];   // optional SEO keywords
  tone?: string[];             // override brand guide defaults
  /** If present, coordinator will attempt live publishing to these platforms after Step 9 */
  publishTargets?: PublishTarget[];
  requestedAt: string;         // ISO datetime
}
