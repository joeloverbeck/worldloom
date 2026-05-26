# SPEC87STOEXPBAC-006: RecordCard data path + deterministic summaries

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/src/view-models/record-card.ts` + `record-link.ts` + `src/read/record-card.ts` (per-class summary data path).
**Deps**: archive/tickets/SPEC87STOEXPBAC-001.md, archive/tickets/SPEC87STOEXPBAC-005.md

## Problem

SPEC-87 §4 specifies `RecordCard` as the view-model the SPEC-89 X-Ray surface consumes for every active record on a page. SPEC-87 §8 specifies per-class deterministic summary rules (22 indexed classes including STENT, STCHAR, STSTAT, BEL, SF, SE, CHC, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, DA, CLK, STSEC, STQ, STPLAN, STEMO, BR, SLT) plus a 4-step fallback chain for missing display fields. This ticket implements the data path for all 27 FOUNDATIONS §6 story-bundle / audit classes: parsing record bodies, extracting the per-class summary fields, computing chips (urgency / salience / confidence / visibility / etc.), and emitting `RecordCard` view-models. The full field rendering (compact-vs-expanded card UI, raw-YAML escape hatch UX, linked-record peek panels) lives in SPEC-89; this ticket owns the data layer.

## Assumption Reassessment (2026-05-25)

1. Record schemas are defined per-class in `tools/validators/src/schemas/story-<class>.schema.json` (brainstorm-verified pattern, e.g., `story-page.schema.json`, `story-event.schema.json`, `story-choice.schema.json`, `story-fact.schema.json`, `story-belief.schema.json`, `story-entity.schema.json`). Each class's compact-summary fields per SPEC-87 §8 are subsets of the schema's required + optional fields. The data path reads parsed YAML bodies (via ticket 005's `raw-yaml.ts`) and extracts the summary fields per the §8 mapping table.
2. SPEC-87 §8 specifies the 4-step fallback chain: (1) explicit title/label/name/objective/claim; (2) first meaningful string field for that class; (3) record ID + class; (4) `"Untitled <CLASS> record"`. The §Hard rule: never fabricate text not present in the record. This ticket's data path enforces the fallback chain; the rendering layer (SPEC-89) consumes the resolved summary line.
3. Cross-skill boundary: the per-class record-schema contracts are the shared boundary under audit. Each of the 22 record classes has a schema in `tools/validators/src/schemas/`; this ticket's `record-card.ts` reads each class's schema-shaped body and applies the §8 mapping. Schema drift in any record class would break the corresponding card's summary line; the data path treats the schema as authoritative (parsed body fields are addressed by name, not by position).

## Assumption Reassessment (2026-05-26)

1. Live package proof uses TypeScript plus Node's built-in test runner (`npm run build && node --test "dist/test/**/*.test.js"`), not Vitest. The proof commands below are corrected to package-local `npm run build`, direct compiled Node test invocations, and `npm test`.
2. FOUNDATIONS §Story-Bundle ID Classes names 24 per-bundle classes plus SAU/SP/RSP audit and promotion classes, totaling 27. The implementation covers all 27 in `recordCardClasses()` and the per-class dispatch table; the original 22-class language remains accurate only for the indexed classes explicitly listed in SPEC-87 §8.
3. Cross-artifact boundary remains the parsed story-record body contract. The implementation does not validate full schema conformance or invent schema fields; it maps known class fields from the parsed body into deterministic summaries, chips, participant IDs, links, and raw-source metadata for SPEC-89 consumers.

## Architecture Check

1. The per-class summary mapping (§8 table) is implemented as a per-class dispatch table in `record-card.ts` rather than a giant switch — each class's summary is a function of its parsed body. The fallback chain is one helper applied uniformly. Centralizing the data path here lets SPEC-89's rendering layer consume `RecordCard.summaryLine` without per-class rendering logic in the frontend.
2. No backwards-compatibility shims. SPEC-87 §8 is the first specification of this surface.

## Verification Layers

1. Per-class summary extraction → compiled Node test (one assertion per class against a representative record body; asserts the summary line matches the class mapping)
2. Fallback chain step (1) → compiled Node test (record body with explicit `title` / `label` / `name` / `objective` / `claim` → summary uses that field)
3. Fallback chain step (4) → compiled Node test (record body with no meaningful string field → summary is `"Untitled <CLASS> record"`)
4. No fabrication → compiled Node test (asserts summaries come from body fields or from the class-name fallback)
5. Cross-skill schema contract → codebase grep-proof (the per-class dispatch table's field references match the actual schema field names — e.g., for SE the dispatch reads `event_kind`, `actor`, `targets`, `outcome_route` — these names exist in `story-event.schema.json`)

## What to Change

### 1. Implement RecordCard + RecordLink view-models

- `tools/story-explorer/src/view-models/record-card.ts` — exports `RecordCard` per SPEC-87 §4 (`recordId`, `recordClass`, `group`, `summaryLine`, `chips`, `primaryFields`, `secondaryFields`, `status`, `visibility`, `confidence`, `urgency`, `participants`, `provenance`, `links`, `rawAvailable`, `sourcePath`, `contentHash`). Includes the 8 record-group enum (Cast & Status / Scene & Affordances / Knowledge & Truth / Plans & Emotion / Relationships & Debts / Pressure & Open Loops / Event Delta / Validation & Integrity) for the `group` field.
- `tools/story-explorer/src/view-models/record-link.ts` — exports `RecordLink` per SPEC-87 §4 (`recordId`, `recordClass`, `label`, `relationship`, `targetExists`, `activeOnCurrentPage`, `targetPageId?`, `brokenReason?`).

### 2. Implement per-class summary data path

- `tools/story-explorer/src/read/record-card.ts` — exports `buildRecordCard(recordId, parsedBody, activeOnCurrentPage): RecordCard`. Internal dispatch table maps each of the 22 record classes to a per-class summary builder. Each builder extracts the SPEC-87 §8 fields, computes chips per the class's visibility/urgency/confidence/salience fields (when present), and applies the 4-step fallback chain when the primary display field is absent. The dispatch table covers: STENT, STCHAR, STSTAT, BEL, SF, SE, CHC, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, DA, CLK, STSEC, STQ, STPLAN, STEMO, BR, SLT. (SLB / SAU / SP / RSP are read via direct file reads in 008 per SPEC-87 §7 — they get their own summary builders here too for completeness across all 27 FOUNDATIONS §6 story-bundle classes; SLB carries `move_family` / `scope_visibility` / `branch_scope` per the SPEC-87 §8 row, SAU/SP/RSP carry their own title/status/holder fields per their respective schemas.)

### 3. Tests

- `tools/story-explorer/test/record-card.test.ts` — one describe per record class; per-class assertion on summary line against a representative body.
- `tools/story-explorer/test/deterministic-summaries.test.ts` — covers the 4-step fallback chain + the no-fabrication invariant + group-assignment correctness for each of the 8 record groups.

## Files to Touch

- `tools/story-explorer/src/view-models/record-card.ts` (new)
- `tools/story-explorer/src/view-models/record-link.ts` (new)
- `tools/story-explorer/src/read/record-card.ts` (new)
- `tools/story-explorer/test/record-card.test.ts` (new)
- `tools/story-explorer/test/deterministic-summaries.test.ts` (new)

## Out of Scope

- Compact-vs-expanded card UI rendering (SPEC-89)
- Raw-YAML escape-hatch disclosure UX (SPEC-89)
- Linked-record peek panel UX (SPEC-89)
- LLM summaries (explicitly out per SPEC-87 §2 Named Assumption — no LLM summaries in v1)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run build && node --test dist/test/record-card.test.js` — per-class summary extraction passes for all 27 FOUNDATIONS §6 story-bundle / audit classes.
2. `cd tools/story-explorer && npm run build && node --test dist/test/deterministic-summaries.test.js` — fallback chain + no-fabrication invariant pass.
3. RecordCard.summaryLine never contains text absent from the parsed body (no-fabrication invariant).

### Invariants

1. Summary text MUST trace to a record body field or to the class-name fallback step (4) — no LLM-generated or invented text per SPEC-87 §8 hard rule.
2. The 8 record-group enum membership matches SPEC-87 §7 taxonomy exactly; record-class-to-group assignment matches the table.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/record-card.test.ts` — per-class summary correctness.
2. `tools/story-explorer/test/deterministic-summaries.test.ts` — fallback chain + no-fabrication.

### Commands

1. `cd tools/story-explorer && npm run build && node --test dist/test/record-card.test.js` (targeted)
2. `cd tools/story-explorer && npm run build && node --test dist/test/deterministic-summaries.test.js` (targeted)
3. `cd tools/story-explorer && npm test` (full-pipeline)

## Outcome

Completed: 2026-05-26

Added the `RecordCard`, `RecordLink`, chip, field, group, and provenance view-model types. Added `tools/story-explorer/src/read/record-card.ts` with a per-class dispatch table covering all 27 FOUNDATIONS §6 story-bundle / audit classes, deterministic summary fallback, chip extraction, participant/reference extraction, and raw-source/provenance passthrough options.

Added compiled Node tests for representative per-class summaries, 27-class coverage, chips/participants/links/provenance, fallback ordering, no-fabrication behavior, and the eight record-group buckets.

## Verification Result

1. `cd tools/story-explorer && npm test` pre-edit baseline passed: 21 tests.
2. `cd tools/story-explorer && npm run build && node --test dist/test/record-card.test.js dist/test/deterministic-summaries.test.js` passed.
3. `cd tools/story-explorer && npm test` passed: 56 tests, 56 pass.

## Deviations

1. Drafted Vitest proof wording was corrected to the live compiled Node test runner.
2. The implemented dispatch table covers all 27 FOUNDATIONS §6 story-bundle / audit classes rather than stopping at the 22 indexed classes named in the SPEC-87 §8 summary row.
3. `RecordCard.provenance`, `sourcePath`, and `contentHash` are supplied through optional builder metadata because the current `buildRecordCard(recordId, parsedBody, activeOnCurrentPage)` data path receives parsed bodies; route-level raw reads in later tickets can pass source/hash/provenance metadata when available.
