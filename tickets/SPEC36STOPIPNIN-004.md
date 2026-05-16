# SPEC36STOPIPNIN-004: Tighten story-bundle ID regexes + convert padded fixtures + negative golden tests

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-*.schema.json` (17 schema files; regex tightening on existing patterns)
**Deps**: `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`

## Problem

`tools/validators/tests/structural/observer-firewall.test.ts:9-12` and `tools/validators/tests/structural/branch-isolation.test.ts:9-14` use padded mock IDs (`PG-0001`, `CHC-0001`, `BEL-0001`, `SF-0001`, `BR-0001`, `STENT-0001`). FOUNDATIONS-002 (per FOUNDATIONS.md §Canonical Storage Layer) mandates unpadded natural-integer IDs. The current schema regex `^PG-[0-9]+$` (verified at `tools/validators/src/schemas/story-page.schema.json` and analogous for the other 16 story-bundle schemas) accepts both padded and unpadded forms, so padded IDs pass `record_schema_compliance` and the fixture rot persists across sessions. SPEC-35 D8 swept some fixture files but did not address the regex; SPEC-36 §D3 closes the recurrence channel by mechanically rejecting padded IDs going forward.

## Assumption Reassessment (2026-05-16)

1. Padded mock IDs verified at `tools/validators/tests/structural/observer-firewall.test.ts:9-12, 20-23, 29-33, 40-44, 52-53` (multiple instances of `PG-0001`, `CHC-0001`, `BEL-0001`, `BEL-0002`, `SE-0001`, `STENT-0001`, `STENT-0002`, `SF-0001`) and `tools/validators/tests/structural/branch-isolation.test.ts:9-14` (`BR-0001`, `PG-0001`, `BR-0002`, `PG-0002`, `SF-0001`, `SF-0002`). Cross-file audit-time grep surfaced additional sites in `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (SLT-0001, SLT-0002, STENT-0001) and `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (extensive use: SF-0001..0007, OBL-0001/0002, CNSQ-0001, THR-0001, SREL-0001, STINT-0001, STLOC-0001, STOBJ-0001, STENT-0001..0002). All 17 story-bundle schema files under `tools/validators/src/schemas/story-*.schema.json` use `^<PREFIX>-[0-9]+$` patterns that admit padded forms.
2. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §D3 specifies regex tightening across all story-bundle schemas, fixture conversion in the two named files PLUS the §D3 sub-rule 3 "Authoring-time sibling sweep" extending the conversion to additional padded sites surfaced by grep, and two negative golden tests proving padded IDs fail `record_schema_compliance`. FOUNDATIONS.md §Canonical Storage Layer (FOUNDATIONS-002) confirms the unpadded-ID convention is canonical.
3. Cross-artifact boundary under audit: the story-bundle ID-format schemas are the contract between the patch-engine pre-apply validation and the test fixtures (plus any author-owned content under `worlds/<slug>/`). Tightening the regex converts a documentation convention (FOUNDATIONS-002 unpadded form) into structural enforcement — any padded ID in any consumer surface fails `record_schema_compliance` going forward.
4. FOUNDATIONS principle: FOUNDATIONS-002 (unpadded natural-integer ID convention per §Canonical Storage Layer) — engine schemas use `^<CLASS>-[0-9]+$` patterns per §Canonical Storage Layer, but the canonical form is the unpadded suffix. The loose regex is the drift; tightening to `^<CLASS>-(0|[1-9][0-9]*)$` aligns the mechanical surface with the canonical form.
5. Canon Safety surface: the patch-engine pre-apply validation uses `record_schema_compliance` to gate story-bundle record writes; the schema regex IS the gate's enforcement mechanism. Tightening the regex narrows what writes the engine accepts — story-bundle records with padded IDs become structurally invalid. This does not weaken the Mystery Reserve firewall (Rule 7) or any other Canon Safety check; it strengthens the FOUNDATIONS-002 enforcement surface.
6. Schema extension scope: this is a BREAKING regex restriction on existing story-bundle ID-format fields (`id`, plus the reference-field patterns within each schema that match other story-bundle IDs). Consumers are: (a) `record_schema_compliance` validator (which uses the schemas as authoritative); (b) test fixtures (sweep covers `tools/validators/tests/` and `tools/world-mcp/tests/`); (c) any author-owned content under `worlds/<slug>/stories/<slug>/_source/` (gitignored per CLAUDE.md, but author-owned padded-ID content would fail validation after this ticket lands). FOUNDATIONS-002 has been canonical since SPEC-13; padded IDs in author-owned content are already drift, and the tightening surfaces them at the next validation run rather than letting them persist silently.

## Architecture Check

1. Tightening regex + converting fixtures + adding negative golden tests is the minimum 3-part change that (a) mechanically enforces FOUNDATIONS-002, (b) brings fixture state into compliance, and (c) proves the tightening works going forward. Alternative — only converting fixtures (SPEC-35 D8's approach) — was insufficient: the next audit (this one) found padded fixtures still drifting in. Mechanical enforcement is the structural fix.
2. No backwards-compatibility aliasing/shims introduced; padded IDs become invalid post-this-ticket and any author-owned padded content must be migrated. The migration is unpadded-ID conversion at the source, not regex relaxation.

## Verification Layers

1. All 17 story-bundle schemas use the tightened regex → codebase grep-proof: `grep -lE '\\^[A-Z]+-\\\\\\?\\[0-9\\]\\+\\\\\\?\\$' tools/validators/src/schemas/story-*.schema.json` returns zero hits (no schema retains the loose `[0-9]+` form); `grep -lE '\\^[A-Z]+-\\(0\\|\\[1-9\\]\\[0-9\\]\\*\\)\\$' tools/validators/src/schemas/story-*.schema.json` matches all 17 schemas.
2. World-canon schemas (CF, CH, INV, M, OQ, ENT, SEC) unchanged → grep-proof: `tools/validators/src/schemas/{canon-fact-record,change-log-entry,invariant,mystery-reserve,open-question,entity,section}.schema.json` retain their existing patterns. (Out of D3 scope per SPEC-36.)
3. Negative golden tests fail under tightened regex → schema validation: padded PG and BEL fixtures fail `record_schema_compliance` per the new test assertions.
4. Existing test suites pass with unpadded mock IDs → regression test: full `npm test` in `tools/validators/` green.

## What to Change

### 1. Tighten regex on all 17 story-bundle ID-format schemas

For each of the 17 story-bundle schema files (`tools/validators/src/schemas/story-belief.schema.json`, `story-branch`, `story-choice`, `story-consequence`, `story-diegetic-artifact`, `story-entity`, `story-event`, `story-fact`, `story-intention`, `story-location`, `story-object`, `story-obligation`, `story-page`, `story-relationship`, `story-status`, `story-storylet`, `story-thread`):

- Replace `^<PREFIX>-[0-9]+$` with `^<PREFIX>-(0|[1-9][0-9]*)$` on the `id` field and on every reference-field pattern that matches another story-bundle ID (e.g., `BEL.basis.source_event` pattern `^SE-[0-9]+$` becomes `^SE-(0|[1-9][0-9]*)$`; multi-prefix patterns like `^(STENT|STLOC|STOBJ)-[0-9]+$` become `^(STENT|STLOC|STOBJ)-(0|[1-9][0-9]*)$`).
- Preserve the schema's $schema header, title, descriptions, and all other structural content unchanged.

World-canon schemas (CF, CH, INV, M, OQ, ENT, SEC; `canon-fact-record.schema.json`, `change-log-entry.schema.json`, `invariant.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `entity.schema.json`, `section.schema.json`) are OUT of D3 scope and unchanged.

### 2. Convert padded mock IDs in the two named test files

`tools/validators/tests/structural/observer-firewall.test.ts` and `tools/validators/tests/structural/branch-isolation.test.ts`: replace `PG-0001` → `PG-1`, `CHC-0001` → `CHC-1`, `BEL-0001` → `BEL-1`, `BEL-0002` → `BEL-2`, `SF-0001` → `SF-1`, `SF-0002` → `SF-2`, `BR-0001` → `BR-1`, `BR-0002` → `BR-2`, `STENT-0001` → `STENT-1`, `STENT-0002` → `STENT-2`, `SE-0001` → `SE-1`. Do not change test logic; only IDs and any expected-detail strings that quote them.

### 3. Apply the SPEC-36 §D3 sub-rule 3 sibling sweep

Grep across `tools/validators/tests/` and `tools/world-mcp/tests/` for `-[0]{2,}[0-9]+` patterns matching story-bundle prefix tokens (`PG|CHC|BEL|SF|SE|BR|STENT|SLT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STINT|STSTAT|DA`). Convert each hit to unpadded UNLESS the hit explicitly asserts padded-ID rejection (in which case keep the padded form and add an inline comment naming the negative-test intent, parallel to the negative golden tests added in step 4 below). Confirmed sweep sites from audit-time grep: `tools/validators/tests/cli/world-validate.story-bundle.test.ts:34, 69-70, 85` (SLT-0001, SLT-0002, STENT-0001) and `tools/validators/tests/_helpers/state-snapshot-replay.test.ts:12-50` (extensive: SF-0001..0007, OBL-0001/0002, CNSQ-0001, THR-0001, SREL-0001, STINT-0001, STLOC-0001, STOBJ-0001, STENT-0001..0002). Re-grep at implementation time confirms the full list.

### 4. Add negative golden tests proving padded IDs fail `record_schema_compliance`

Append to an appropriate `record-schema-compliance-*.test.ts` file (or create a new `record-schema-compliance.padded-id-rejection.test.ts` if the existing per-class files are tightly scoped):

- One test constructing a minimal PG fixture with id `PG-0001`, running `record_schema_compliance`, asserting the verdicts array contains an error referencing the regex violation.
- One test constructing a minimal BEL fixture with id `BEL-0001`, same assertion shape.

The two tests cover both schema files most affected by the regex change and prove the tightening works mechanically going forward.

## Files to Touch

- `tools/validators/src/schemas/story-belief.schema.json` (modify)
- `tools/validators/src/schemas/story-branch.schema.json` (modify)
- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/schemas/story-consequence.schema.json` (modify)
- `tools/validators/src/schemas/story-diegetic-artifact.schema.json` (modify)
- `tools/validators/src/schemas/story-entity.schema.json` (modify)
- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/src/schemas/story-fact.schema.json` (modify)
- `tools/validators/src/schemas/story-intention.schema.json` (modify)
- `tools/validators/src/schemas/story-location.schema.json` (modify)
- `tools/validators/src/schemas/story-object.schema.json` (modify)
- `tools/validators/src/schemas/story-obligation.schema.json` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/src/schemas/story-relationship.schema.json` (modify)
- `tools/validators/src/schemas/story-status.schema.json` (modify)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/src/schemas/story-thread.schema.json` (modify)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify)
- `tools/validators/tests/structural/branch-isolation.test.ts` (modify)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify — sweep)
- `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (modify — sweep)
- `tools/validators/tests/structural/record-schema-compliance.padded-id-rejection.test.ts` (new) OR append to an existing `record-schema-compliance-*.test.ts` per operator judgment at implementation time
- Any additional fixture files surfaced by the re-grep at implementation time per SPEC-36 §D3 sub-rule 3

## Out of Scope

- World-canon schema regex tightening (CF / CH / INV / M / OQ / ENT / SEC schemas). World-canon schemas have their own ID-format conventions per FOUNDATIONS §Canonical Storage Layer and are not modified by this ticket.
- Migration of author-owned `worlds/<slug>/stories/<slug>/_source/` content with padded IDs. Per SPEC-36 §Risks, breakage from padded author content is acceptable — the FOUNDATIONS-002 convention has been canonical since SPEC-13; the fix is unpadded-ID migration at the source, not regex relaxation.
- Other validators that read story-bundle IDs as strings (any logic outside `record_schema_compliance`'s schema-driven validation). Those validators continue to use string-comparison logic regardless of the regex tightening.
- ID-allocator changes. `tools/world-mcp/src/tools/allocate-next-id.ts` already uses `zeroPad: false` for all classes per F6 / SPEC-35-D6 verification; no changes needed.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build && npm test` in `tools/validators/` is green — all existing tests pass under unpadded mock IDs; the two negative golden tests pass under the tightened regex.
2. `grep -nE '"pattern": "\\^[A-Z|]+-\\[0-9\\]\\+\\\\\\?\\$"' tools/validators/src/schemas/story-*.schema.json` returns zero hits (every loose `[0-9]+` pattern in story-bundle schemas has been tightened).
3. `grep -rnE '(PG|CHC|BEL|SF|SE|BR|STENT|SLT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STINT|STSTAT|DA)-0+[0-9]+' tools/validators/tests/ tools/world-mcp/tests/` returns either zero hits OR every hit carries an inline comment naming negative-test intent.
4. World-canon schemas (`canon-fact-record.schema.json`, `change-log-entry.schema.json`, `invariant.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `entity.schema.json`, `section.schema.json`) remain unchanged: `git diff tools/validators/src/schemas/canon-fact-record.schema.json ...` returns empty for all seven world-canon schema files.

### Invariants

1. Story-bundle ID-format schemas mechanically reject padded IDs via `^<PREFIX>-(0|[1-9][0-9]*)$` patterns.
2. The `record_schema_compliance` validator surfaces padded-ID violations as schema errors (proven by the two negative golden tests).
3. World-canon schemas remain untouched; D3's scope is strictly story-bundle.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.padded-id-rejection.test.ts` (new) OR appended to an existing `record-schema-compliance-*.test.ts` — two negative golden tests proving padded PG and BEL fixtures fail validation; rationale per change list step 4.
2. `tools/validators/tests/structural/observer-firewall.test.ts` (modify) — convert padded mocks to unpadded; existing test behavior preserved.
3. `tools/validators/tests/structural/branch-isolation.test.ts` (modify) — same conversion.
4. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify — sweep) — same conversion.
5. `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (modify — sweep) — same conversion.

### Commands

1. `cd tools/validators && npm run build && npm test` — full-suite proof.
2. `grep -nE '"pattern": "\\^[A-Z|]+-\\[0-9\\]\\+\\\\\\?\\$"' tools/validators/src/schemas/story-*.schema.json` — confirm no loose regex remains in story-bundle schemas.
3. `grep -rnE '(PG|CHC|BEL|SF|SE|BR|STENT|SLT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STINT|STSTAT|DA)-0+[0-9]+' tools/validators/tests/ tools/world-mcp/tests/` — confirm sweep coverage.
