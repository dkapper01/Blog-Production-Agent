# Inter-Agent File Contracts

Each file in this directory defines the expected schema for a shared artifact that agents read and write.

## How coordinators use these

After each agent completes, the writing-coordinator validates the output file against its schema before passing it to the next agent. Validation checks required fields and types — not exhaustive, but catches the most common failure modes (missing fields, wrong types, empty arrays).

## Contract index

| Schema file | Artifact path | Owner agent | Consumers |
|---|---|---|---|
| `run-config.schema.json` | `files/run-config.json` | writing-coordinator (Step 1) | All downstream agents |
| `research-file.schema.json` | `files/research/{slug}.json` | researcher | writing-coordinator (Step 3.5), outline, writer |
| `outline.schema.json` | `files/drafts/outline[-lang].json` | outline | writer |
| `draft-meta.schema.json` | `files/drafts/draft-meta[-lang].json` | writer | writing-coordinator (pre-QA), publisher |

## Adding new contracts

When a new inter-agent artifact is introduced:
1. Add a schema file here following the same pattern
2. Add a row to the index above
3. Add validation in the coordinator before the artifact is consumed
