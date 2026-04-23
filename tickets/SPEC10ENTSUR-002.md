# SPEC10ENTSUR-002: Add YAML frontmatter sidecar parse to `extractProseNodes`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/parse/prose.ts` adds a YAML-frontmatter parse step for whole-file record node types; no persisted schema change.
**Deps**: `specs/SPEC-10-entity-surface-redesign.md`, `docs/FOUNDATIONS.md`

## Problem

SPEC-10 §Deliverable 3 Stage A names `character_record.name`, `character_proposal_card.name`, and `diegetic_artifact_record.title` as authority-bearing anchors. These are YAML frontmatter fields on whole-file records. `SPEC10ENTSUR-001` shipped a truthful narrower solution by re-reading persisted whole-file `body` content inside `entities.ts`, so Stage A no longer depends on this ticket. The remaining gap is architectural cleanup: `tools/world-index/src/parse/prose.ts` still has no shared frontmatter parse primitive, and `extractYamlNodes` still only handles fenced `code` blocks (`lang === 'yaml'`), not frontmatter delimited by `---`.

## Assumption Reassessment (2026-04-22)

1. `tools/world-index/src/parse/prose.ts` lines 103-168 construct whole-file records via `createWholeFileRecord` with `body: lines.join("\n")` at line 130 and line 163 — no frontmatter parse. The `yaml` npm package is already imported at line 3 (`import YAML from "yaml"`) so no new dependency is needed.
2. `specs/SPEC-10-entity-surface-redesign.md` §Deliverable 3 Stage A explicitly names the frontmatter-parse mechanism: "shared YAML-frontmatter parse step that runs for every whole-file record … parsed frontmatter is carried on the in-memory `NodeRow` as a non-persisted sidecar field (`frontmatter?: Record<string, unknown>`), consumed by Stage A adapters in `entities.ts`, and then discarded before DB insert." That mechanism is now optional cleanup rather than a blocker because `SPEC10ENTSUR-001` landed a direct reread path in `tools/world-index/src/parse/entities.ts`.
3. Shared boundary under audit: the in-memory `NodeRow` shape passed from `extractProseNodes` through `insertNodes` to `finalizeEntityState`. Adding a sidecar `frontmatter?` field that does not persist requires a type-level change distinct from the SQL `NodeRow` surface — captured via a local intersection type or a parse-time-only `ParsedNodeRow` alias in `prose.ts`, never exported as part of `schema/types.ts`.
4. `docs/FOUNDATIONS.md` §Core Principle requires the world model to be constrained and explicit. The current live implementation already stays on the structured-anchor side by re-reading frontmatter directly from persisted whole-file bodies; this ticket is now about centralizing that parse primitive so the contract is less duplicated.
5. Dependency correction from live repo state: this ticket is no longer a blocker for the shipped Stage A adapters. If implemented, it should be treated as cleanup/refactor value inside the same package seam, not as a prerequisite for canonical entity extraction correctness.
9. Mismatch + correction: the spec's text says "carried on the in-memory `NodeRow`". The `NodeRow` interface lives in `schema/types.ts` and drives SQL insert shape. A correct reading — and the one this ticket implements — is that the sidecar is a parse-time-only shape layered over `NodeRow`, not a new persisted column. The mismatch is spec-text convenience, not a real contradiction; this ticket closes it by keeping the sidecar internal to `prose.ts` consumers and stripping it before `insertNodes`.

## Architecture Check

1. A single shared frontmatter-parse step inside `extractProseNodes` is cleaner than pushing frontmatter parsing into each Stage A adapter (`character_record.name`, `character_proposal_card.name`, `diegetic_artifact_record.title`): it centralizes error handling, guarantees consistent delimiter handling (`^---\s*$` … `^---\s*$`), and keeps adapters thin.
2. No backwards-compatibility aliasing: the sidecar is a forward-only in-memory field. It is never serialized to SQLite, so there is no legacy shape to honor. `validation_results` rows for frontmatter parse failures use a new `validator_name` ('frontmatter_parse') rather than overloading an existing validator label.

## Verification Layers

1. Whole-file records emitted from `extractProseNodes` carry a parsed `frontmatter?: Record<string, unknown>` when their file begins with `---\n...\n---`. -> targeted unit test in `tests/prose-whole-file.test.ts` (or a new `tests/prose-frontmatter.test.ts`).
2. Parse failures (malformed YAML in frontmatter) emit a `validation_results` row with `validator_name='frontmatter_parse'`, `severity='warn'`, and the affected node's `frontmatter` field is `undefined`. -> targeted unit test feeding a malformed-frontmatter fixture.
3. Non-whole-file nodes (`section`, `subsection`, `bullet_cluster`) are not affected — their `NodeRow` carries no `frontmatter` sidecar. -> targeted unit test.
4. The sidecar field is stripped before `insertNodes` writes to SQLite. -> codebase grep-proof that `insertNodes` receives rows typed as `NodeRow` (the SQL shape), never `ParsedNodeRow`; confirm no `frontmatter` column is referenced in `src/index/nodes.ts`.

## What to Change

### 1. Add a parse-time `ParsedNodeRow` shape in `tools/world-index/src/parse/prose.ts`

Define (locally, not exported): `type ParsedNodeRow = NodeRow & { frontmatter?: Record<string, unknown> }`.

### 2. Implement a frontmatter extractor

Add a helper `extractFrontmatter(lines: string[]): { frontmatter: Record<string, unknown> | undefined; parseError: string | null }`:

- If `lines[0].trim() !== '---'`, return `{ frontmatter: undefined, parseError: null }`.
- Scan for a closing `^---\s*$` line; if absent, return `{ frontmatter: undefined, parseError: null }` (not a YAML-frontmatter file).
- Extract the body between the delimiters, parse with `YAML.parse`.
- On parse failure, return `{ frontmatter: undefined, parseError: <error-message> }`.
- On success, verify the parsed value is a non-null object (reject scalars/arrays). Return `{ frontmatter, parseError: null }` on valid object; otherwise `{ frontmatter: undefined, parseError: 'frontmatter is not a mapping' }`.

### 3. Wire the parser into `createWholeFileRecord`

Only run frontmatter extraction when `FILE_RECORD_TYPES.has(firstSegment)` returns true for the current file's top-level segment. Attach the parsed `frontmatter` (if any) to the returned `ParsedNodeRow`. Keep `body` unchanged (`lines.join("\n")`) — the frontmatter stays in body for mention-evidence scans in Stage C.

### 4. Surface parse-failure diagnostics

Extend `ParsedFileResult.validationResults` to include a new row when `extractFrontmatter` returned a non-null `parseError` — `result_id` allocated inline, `validator_name='frontmatter_parse'`, `severity='warn'`, `code='frontmatter_parse_error'`, `message` carrying the parse-error text, `node_id` set to the whole-file record's id, `file_path` set to `relativeFilePath`, `line_range_start` / `line_range_end` set to the span of the frontmatter block (or `1`/`1` if the closing delimiter was missing). Follow the existing pattern used by `yamlIssues` in `parseWorldFile`.

### 5. Strip the sidecar before persistence

Update the `parseWorldFile` return in `shared.ts` call-site (if needed) — verify that the rows returned in `ParsedFileResult.nodes` are typed as `NodeRow[]` (the SQL shape), not `ParsedNodeRow[]`. The sidecar is consumed only by Stage A adapters in SPEC10ENTSUR-004. Practically: `ParsedNodeRow` is internal to `prose.ts` and conversions to `NodeRow` drop the sidecar. Stage A in 004 will re-read frontmatter via a separate mechanism (either a second parse pass over `body`, or a reserved `Map<node_id, frontmatter>` passed alongside); this ticket only establishes the parse primitive.

## Files to Touch

- `tools/world-index/src/parse/prose.ts` (modify)

## Deviations

- `SPEC10ENTSUR-001` shipped a narrower frontmatter reread path inside `tools/world-index/src/parse/entities.ts`, so this ticket is no longer required for the correctness of Stage A entity extraction. It remains as a cleanup ticket for consolidating that logic into `parse/prose.ts`.

## Out of Scope

- Consuming the parsed frontmatter in Stage A adapters (SPEC10ENTSUR-004)
- Any schema change in `001_initial.sql` or `types.ts` (SPEC10ENTSUR-001)
- Adding frontmatter handling to non-whole-file node types
- Persisting frontmatter to SQLite (explicitly forbidden by SPEC-10 §D3 Stage A)
- Supporting TOML, JSON, or any non-YAML frontmatter format

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: a fixture file with well-formed YAML frontmatter on a `character_record` path produces a node whose `frontmatter` field is the parsed object.
2. Unit test: a fixture file with malformed YAML frontmatter produces a node with `frontmatter === undefined` AND a `validation_results` row with `validator_name='frontmatter_parse'`, `severity='warn'`.
3. Unit test: a fixture file with no frontmatter at all produces a node with `frontmatter === undefined` AND no `validation_results` row.
4. `cd tools/world-index && npm run build`
5. `cd tools/world-index && node --test dist/tests/prose-whole-file.test.js`

### Invariants

1. Frontmatter never persists to SQLite — the sidecar field is parse-time-only and never appears in `INSERT INTO nodes`.
2. A parse failure does not block indexing; it emits a `warn`-severity `validation_results` row and the affected record proceeds with `frontmatter === undefined`.
3. Non-whole-file node types (`section`, `subsection`, `bullet_cluster`) are unaffected — no `frontmatter` sidecar, no new validation rows.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/prose-whole-file.test.ts` — extend with 3 new cases (well-formed, malformed, absent frontmatter). Prefer extending this existing file over adding a new `prose-frontmatter.test.ts` to keep the whole-file-record tests colocated.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/prose-whole-file.test.js`
3. Narrower command scope is correct here: `extractProseNodes` is covered end-to-end by `prose-whole-file.test.ts`; the animalia integration capstone (SPEC10ENTSUR-008) re-verifies the parse step under real-corpus conditions.
