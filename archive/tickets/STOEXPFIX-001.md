# STOEXPFIX-001: Align story-explorer SF/STEMO summary rules with canonical story-bundle schema

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — tooling-only fix in `tools/story-explorer/`; no canon, skill, hook, or schema mutation.
**Deps**: None

## Problem

At intake, the story-explorer UI at `tools/story-explorer/web/` omitted the actual content of `SF` and `STEMO` records when rendering active state on a page. Concretely, on `http://127.0.0.1:5174/worlds/erotica-world/stories/red-bunny/pages/PG-6`:

- `SF-1` renders as `'SF-1 · "SF-1 (SF)" · branch_local · derived-from CF-0005 · created at PG-1'` — the fact statement is missing; the quoted slot has fallen back to the `<id> (<class>)` summary.
- `STEMO-15` renders as `'STEMO-15 · holder STENT-1 · STENT-1 · intensity medium'` — the emotion type is missing; the affect slot has fallen back to the holder ID via the `summaryLine` fallback.

The data was present on disk (`SF-1.yaml` has `statement: ...`; `STEMO-15.yaml` has `affect_kind: confusion`) and the canonical schemas defined in skill prescriptions name those exact fields. The view-model's `SUMMARY_RULES` for `SF` and `STEMO` declared field names that do not exist in canonical story-bundle records, so `buildRecordCard` produced empty primary/secondary field sets for those content slots before this ticket.

## Assumption Reassessment (2026-05-27)

1. **At reassessment before implementation**, `tools/story-explorer/src/read/record-card.ts` `SUMMARY_RULES.SF` declared `primaryFields: ["claim"]`. The canonical SF schema per `.claude/skills/branching-story-bootstrap/references/phase-3-4-facts-beliefs-da.md:7` lists fields `id, story_id, created_at_page, supersedes, statement, authority, derived_from`. Verified across all 8 SF records under `worlds/erotica-world/stories/red-bunny/_source/facts/` — each carries `statement:` and none carry `claim:`. The pre-fix rule could not populate any primary field from a real SF body.
2. **At reassessment before implementation**, `SUMMARY_RULES.STEMO` declared `primaryFields: ["emotion", "description", "holder"]` and `secondaryFields: ["target", "intensity", "reason"]`. The canonical STEMO schema (per `.claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md:102` and `worlds/erotica-world/stories/red-bunny/_source/emotions/STEMO-15.yaml`) uses `affect_kind`, `orientation.toward_records` (nested), `appraisal_basis`, `intensity`, `trigger_event`, `supersedes`, `holder`, `status`. Of the seven pre-fix primary/secondary field names, only `holder` and `intensity` corresponded to real STEMO fields.
3. **Cross-artifact boundary under audit**: the contract is the canonical YAML schema for `SF` and `STEMO` records as defined in story-pipeline skill prescriptions. The story-explorer's view-model is a downstream reader; it must reflect the canonical schema, not invent alternative field names. No skill, hook, validator, or engine schema changes — only the view-model's field-name registry.
4. **FOUNDATIONS principle under audit**: §Canonical Storage Layer (FOUNDATIONS.md line 596+) — atomic YAML story records under `_source/<class>/<ID>.yaml` are the sole canonical form of story-bundle state. Read-side tooling must honor the canonical schema; drift is a tooling defect, not a canon mutation. No Validation Rule (1-7, 11, 12) is engaged: this is a display-layer bug and does not touch Mystery Reserve, HARD-GATE semantics, or canon-write ordering.
5. **Renderer-side gaps at reassessment**: `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` `FIELD_ALIASES.appraisal` only listed `['appraisal', 'description', 'reason']` — none matched the canonical `appraisal_basis`. `FIELD_ALIASES.orientation` only listed `['orientation', 'target']` — neither matched the canonical nested path `orientation.toward_records`. These aliases were extended for the STEMO renderer row to surface canonical values.
6. **Test-fixture drift compounding the defect**: at reassessment, `tools/story-explorer/test/record-card.test.ts` declared the SF representative fixture with `claim` (non-canonical), and the STEMO fixture with `emotion` + `target` (both non-canonical). The pre-fix test suite passed because fixtures encoded the bug rather than the schema. Re-grounding fixtures against canonical field names was part of the fix, not a separate concern.
7. **Mismatch + correction**: no scope mismatch — the user-reported "two minor problems" map exactly to two field-drift sites in `SUMMARY_RULES`. A broader audit of other record classes (STENT, STSTAT, STINT, BEL, STLOC, STOBJ, STQ, THR, SREL spot-checked against red-bunny records and confirmed clean; STCHAR is hybrid and parsed via a different path; STSEC's `secret_claim` field was not exhaustively verified and is deferred) is explicitly Out of Scope below.
8. **Adjacent contradiction**: the existing renderer test at `web/src/components/xray/__tests__/RecordCardRenderers.test.tsx:97` uses `{ name: 'orientation', value: 'toward gate' }` — a hypothetical flat `orientation` field rather than the canonical nested path. After this ticket, the renderer alias accepts both forms (the existing flat alias is preserved); the renderer test fixture's behavior is unchanged. No second ticket needed.

## Architecture Check

1. **Why this is cleaner than alternatives**:
   - Alternative A (flatten `orientation.toward_records` into a synthetic top-level `orientation` field during view-model construction): would introduce a per-field transformation layer in `buildRecordCard` solely for one nested path. Inelegant; future nested fields would each require similar special-cases.
   - Alternative B (modify canonical STEMO schema to use a flat `orientation` field): violates §Canonical Storage Layer — the schema is authority, the view-model is read-side.
   - Chosen approach: the view-model declares the canonical field name (nested path included), and `FIELD_ALIASES` already supports nested paths (precedent: `scopeVisibility: ['scope.visibility', 'author_scope.visibility', ...]`). Pure schema alignment, no shims.
2. **No backwards-compatibility shims**: existing alias entries are preserved (extended, not replaced), so the renderer remains compatible with the existing hand-written renderer test fixtures while also working against real on-disk record shapes. No legacy field names are written to disk anywhere — the change is read-side only.

## Verification Layers

1. **SUMMARY_RULES field names match canonical schema** → codebase grep-proof: confirm `SUMMARY_RULES.SF.primaryFields` contains `statement` and `SUMMARY_RULES.STEMO.primaryFields` contains `affect_kind`; confirm no remaining occurrence of `"claim"` / `"emotion"` / `"target"` in `SUMMARY_RULES.SF` / `SUMMARY_RULES.STEMO`.
2. **FIELD_ALIASES extension preserves existing entries** → codebase grep-proof: confirm `FIELD_ALIASES.orientation` contains both `'orientation.toward_records'` and `'orientation'` (existing); confirm `FIELD_ALIASES.appraisal` contains both `'appraisal_basis'` and `'appraisal'` (existing).
3. **Test fixtures use canonical schema** → schema validation: the `REPRESENTATIVE_RECORDS.SF.body` includes `statement` (not `claim`); `REPRESENTATIVE_RECORDS.STEMO.body` includes `affect_kind` and `orientation: { toward_records: [...] }`.
4. **End-to-end read path produces canonical content** → API smoke: with the dev server running at `http://127.0.0.1:5174`, query `/api/worlds/erotica-world/stories/red-bunny/records/SF-1` and `/api/worlds/erotica-world/stories/red-bunny/records/STEMO-15`; confirm SF-1 exposes the statement string and STEMO-15 exposes `confusion` as `affect_kind`.

## Landed Changes

### 1. `tools/story-explorer/src/read/record-card.ts` — fix `SUMMARY_RULES`

- `SF` rule:
  - `primaryFields: ["claim"]` changed to `primaryFields: ["statement"]`
  - `secondaryFields` and `visibilityField` unchanged.
- `STEMO` rule:
  - `primaryFields: ["emotion", "description", "holder"]` changed to `primaryFields: ["affect_kind", "holder"]`
  - `secondaryFields: ["target", "intensity", "reason"]` changed to `secondaryFields: ["orientation.toward_records", "intensity", "appraisal_basis", "trigger_event", "supersedes"]`
  - `participantFields: ["holder", "target"]` changed to `participantFields: ["holder", "orientation.toward_records"]`
  - `statusField: "status"` and `urgencyField: "intensity"` unchanged.

### 2. `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` — extend `FIELD_ALIASES`

- `appraisal`: `['appraisal', 'description', 'reason']` changed to `['appraisal_basis', 'appraisal', 'description', 'reason']`
- `orientation`: `['orientation', 'target']` changed to `['orientation.toward_records', 'orientation', 'target']`

The renderer's STEMO row (lines 251-262) requires no change — `fieldValue(recordCard, 'affect')` and `fieldValue(recordCard, 'appraisal')` resolve through the extended aliases.

### 3. `tools/story-explorer/test/record-card.test.ts` — re-ground SF and STEMO fixtures

- `REPRESENTATIVE_RECORDS.SF`:
  - Replace `claim: "The cellar door is unlocked."` with `statement: "The cellar door is unlocked."`
  - Update `expected: "The cellar door is unlocked."` (unchanged; the `summaryLine` path uses `EXPLICIT_SUMMARY_FIELDS` which does not include `statement` — so the expected falls through to `firstMeaningfulString` over `primarySummaryFields` which now contains `statement`, producing the same string).
- `REPRESENTATIVE_RECORDS.STEMO`:
  - Replace `emotion: "fear"` with `affect_kind: "fear"`
  - Replace `target: "STENT-2"` with `orientation: { toward_records: ["STENT-2"] }`
  - Update `expected: "fear"` (unchanged; reasoning parallels SF — `firstMeaningfulString` finds `affect_kind` via the updated `primarySummaryFields`).

### 4. `tools/story-explorer/test/record-card.test.ts` — regression coverage

Added a new test case (`buildRecordCard surfaces canonical SF/STEMO field names on real record shapes`) that:

1. Constructs a body matching the structure of `worlds/erotica-world/stories/red-bunny/_source/facts/SF-1.yaml` (with `statement`, `authority`, `derived_from`, `created_at_page`).
2. Calls `buildRecordCard("SF-1", body, ...)` and asserts `card.primaryFields[0].name === "statement"` and the value is the statement string.
3. Repeats for STEMO with a body matching `STEMO-15.yaml` and asserts `card.primaryFields` includes `{ name: "affect_kind", value: "confusion" }` and `card.secondaryFields` includes a field whose name is `"orientation.toward_records"` and whose value contains `"STENT-3"`.

This is the integration-style test that was missing — it exercises the server-side schema mapping with a real-shaped body rather than the bug-encoding fixture.

## Files to Touch

- `tools/story-explorer/src/read/record-card.ts` (modify)
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` (modify)
- `tools/story-explorer/test/record-card.test.ts` (modify)

## Out of Scope

- Broader summary-rule audit of other record classes (`STENT`, `STSTAT`, `STINT`, `BEL`, `STLOC`, `STOBJ`, `STQ`, `THR`, `SREL` spot-checked clean against red-bunny records; `STCHAR` is hybrid via a different parsing path; `STSEC` `secret_claim` was not exhaustively verified). Follow-up audit is active as `tickets/STOEXPFIX-010.md`.
- Architectural refactor binding `SUMMARY_RULES` to a canonical-schema source of truth derived from skill-prescription docs. YAGNI — two known drift sites do not justify a generated-vocabulary layer.
- `RecordCardRenderers.test.tsx` is not modified — the existing fixture passes `{ name: 'orientation', value: 'toward gate' }` (flat form), which the extended alias still accepts.
- No changes to `worlds/<slug>/_source/` records; no schema, validator, hook, MCP retrieval, or engine modifications.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test` — the existing test suite, with re-grounded fixtures, passes including the new regression test.
2. `node -e 'const fs=require("fs"); const s=fs.readFileSync("tools/story-explorer/src/read/record-card.ts","utf8"); const sf=s.match(/SF: \{[\s\S]*?\n  \},/)[0]; const stemo=s.match(/STEMO: \{[\s\S]*?\n  \},/)[0]; if (!sf.includes("statement") || /claim/.test(sf) || !stemo.includes("affect_kind") || !stemo.includes("orientation.toward_records") || /emotion|target|reason/.test(stemo)) process.exit(1);'` — confirms the SF/STEMO summary rules no longer carry the removed field names.
3. API smoke: with the dev server running, query `/api/worlds/erotica-world/stories/red-bunny/records/SF-1` and `/api/worlds/erotica-world/stories/red-bunny/records/STEMO-15`; SF-1 returns `statement` in `primaryFields`, and STEMO-15 returns `affect_kind`, `orientation.toward_records`, and `appraisal_basis`.

### Invariants

1. **Schema alignment**: every field name in `SUMMARY_RULES.SF` and `SUMMARY_RULES.STEMO` corresponds to an actual field path on the canonical YAML schema for that record class.
2. **Read-only discipline**: no `_source/` file is mutated by this change; only `tools/story-explorer/` is touched.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/record-card.test.ts` — re-ground SF and STEMO fixtures to canonical field names; add `buildRecordCard surfaces canonical SF/STEMO field names on real record shapes` test that exercises the server-side mapping with body shapes matching real on-disk records.

### Commands

1. `cd tools/story-explorer && npm test` — runs the server-side test suite including the new regression test.
2. `cd tools/story-explorer/web && npm test` — runs the renderer test suite; should remain green without modification because the extended aliases preserve existing fixture behavior.
3. Manual/API smoke:
   ```bash
   for id in SF-1 STEMO-15; do
     curl -s http://127.0.0.1:5174/api/worlds/erotica-world/stories/red-bunny/records/$id |
       jq '{recordId: .data.recordCard.recordId, primaryFields: .data.recordCard.primaryFields, secondaryFields: .data.recordCard.secondaryFields, summaryLine: .data.recordCard.summaryLine}'
   done
   ```
   This confirms the API now returns the canonical field names in primary/secondary fields and that `summaryLine` is no longer the `<id> (<class>)` placeholder for these records.

## Outcome

Completed. `tools/story-explorer/src/read/record-card.ts` now maps `SF` summaries to `statement` and `STEMO` summaries/participants to `affect_kind`, `orientation.toward_records`, `appraisal_basis`, `trigger_event`, and `supersedes`. `RecordCardRenderers.tsx` now resolves canonical `appraisal_basis` and nested `orientation.toward_records` while preserving the existing flat alias entries. `record-card.test.ts` uses canonical SF/STEMO fixture shapes and adds regression coverage for real-shaped SF-1/STEMO-15 bodies.

## Verification Result

1. Baseline before edits: `cd tools/story-explorer && npm test` passed (backend 89 tests, web 185 tests); web output included existing React Router future-flag warnings and an expected ErrorBoundary test throw.
2. Backend proof after edits: `cd tools/story-explorer && npm run test:backend` passed (15 compiled test files).
3. Renderer proof after edits: `cd tools/story-explorer && npm --prefix web test` passed (76 files, 185 tests); output included existing React Router future-flag warnings and the expected ErrorBoundary test throw.
4. API smoke after edits: started `node dist/src/cli.js --port 5174 --repo-root /home/joeloverbeck/projects/worldloom` with approval because sandbox-local bind returned `listen EPERM`; record API responses showed `SF-1.primaryFields[0].name == "statement"` and `STEMO-15` primary/secondary fields including `affect_kind`, `orientation.toward_records`, and `appraisal_basis`.
5. Final proof after ticket closeout edits: `cd tools/story-explorer && npm test` passed (backend 90 tests, web 185 tests); output included existing React Router future-flag warnings and the expected ErrorBoundary test throw.

## Deviations

- The drafted API smoke command used `/api/page/PG-6` / `.activeRecords[]`, but the live Story Explorer route shape returns record cards from `/api/worlds/:slug/stories/:storySlug/records/:recordId`. Acceptance and Test Plan were corrected to the live route.
- The full `npm test` lane was green before edits; final proof used the narrower affected backend and web lanes plus the live record API smoke before the closeout text. A final full `npm test` was run after closeout prose edits.
