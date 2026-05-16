# SPEC36STOPIPNIN-004: Tighten story-bundle ID regexes + convert padded fixtures + negative golden tests

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-*.schema.json` (17 schema files; regex tightening on existing patterns); `tools/validators/src/structural/recursive-reference-closure.ts` (branch-prefix page-id helper aligned to unpadded PG ids); validators package fixture/test updates
**Deps**: `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`

## Problem

At intake, `tools/validators/tests/structural/observer-firewall.test.ts:9-12` and `tools/validators/tests/structural/branch-isolation.test.ts:9-14` used padded mock IDs (`PG-0001`, `CHC-0001`, `BEL-0001`, `SF-0001`, `BR-0001`, `STENT-0001`). FOUNDATIONS-002 (per FOUNDATIONS.md §Canonical Storage Layer) mandates unpadded natural-integer IDs. The pre-ticket schema regex `^PG-[0-9]+$` (verified at `tools/validators/src/schemas/story-page.schema.json` and analogous for the other 16 story-bundle schemas) accepted both padded and unpadded forms, so padded IDs passed `record_schema_compliance` and the fixture rot persisted across sessions. SPEC-35 D8 swept some fixture files but did not address the regex; SPEC-36 §D3 closes the recurrence channel by mechanically rejecting padded IDs going forward.

## Assumption Reassessment (2026-05-16)

1. At intake, padded mock IDs were verified at `tools/validators/tests/structural/observer-firewall.test.ts:9-12, 20-23, 29-33, 40-44, 52-53` (multiple instances of `PG-0001`, `CHC-0001`, `BEL-0001`, `BEL-0002`, `SE-0001`, `STENT-0001`, `STENT-0002`, `SF-0001`) and `tools/validators/tests/structural/branch-isolation.test.ts:9-14` (`BR-0001`, `PG-0001`, `BR-0002`, `PG-0002`, `SF-0001`, `SF-0002`). Cross-file audit-time grep surfaced additional sites in `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (SLT-0001, SLT-0002, STENT-0001) and `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (extensive use: SF-0001..0007, OBL-0001/0002, CNSQ-0001, THR-0001, SREL-0001, STINT-0001, STLOC-0001, STOBJ-0001, STENT-0001..0002). All 17 story-bundle schema files under `tools/validators/src/schemas/story-*.schema.json` used `^<PREFIX>-[0-9]+$` patterns that admitted padded forms.
2. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §D3 specifies regex tightening across all story-bundle schemas, fixture conversion in the two named files PLUS the §D3 sub-rule 3 "Authoring-time sibling sweep" extending the conversion to additional padded sites surfaced by grep, and two negative golden tests proving padded IDs fail `record_schema_compliance`. FOUNDATIONS.md §Canonical Storage Layer (FOUNDATIONS-002) confirms the unpadded-ID convention is canonical.
3. Cross-artifact boundary under audit: the story-bundle ID-format schemas are the contract between the patch-engine pre-apply validation and the test fixtures (plus any author-owned content under `worlds/<slug>/`). Tightening the regex converts a documentation convention (FOUNDATIONS-002 unpadded form) into structural enforcement — any padded ID in any consumer surface fails `record_schema_compliance` going forward.
4. FOUNDATIONS principle: FOUNDATIONS-002 (unpadded natural-integer ID convention per §Canonical Storage Layer) — engine schemas use `^<CLASS>-[0-9]+$` patterns per §Canonical Storage Layer, but the canonical form is the unpadded suffix. The loose regex is the drift; tightening to `^<CLASS>-(0|[1-9][0-9]*)$` aligns the mechanical surface with the canonical form.
5. Canon Safety surface: the patch-engine pre-apply validation uses `record_schema_compliance` to gate story-bundle record writes; the schema regex IS the gate's enforcement mechanism. Tightening the regex narrows what writes the engine accepts — story-bundle records with padded IDs become structurally invalid. This does not weaken the Mystery Reserve firewall (Rule 7) or any other Canon Safety check; it strengthens the FOUNDATIONS-002 enforcement surface.
6. Schema extension scope: this is a BREAKING regex restriction on existing story-bundle ID-format fields (`id`, plus the reference-field patterns within each schema that match other story-bundle IDs). Consumers are: (a) `record_schema_compliance` validator (which uses the schemas as authoritative); (b) test fixtures (sweep covers `tools/validators/tests/` and `tools/world-mcp/tests/`); (c) any author-owned content under `worlds/<slug>/stories/<slug>/_source/` (gitignored per CLAUDE.md, but author-owned padded-ID content would fail validation after this ticket lands). FOUNDATIONS-002 has been canonical since SPEC-13; padded IDs in author-owned content are already drift, and the tightening surfaces them at the next validation run rather than letting them persist silently.
7. Implementation reassessment found one source helper beyond the draft file list: `tools/validators/src/structural/recursive-reference-closure.ts` had a hard-coded `PG-\d{4}` branch-prefix visibility check. Because `story-storylet.schema.json` now accepts only unpadded `PG` ids in `visible_branch_path_prefix`, the helper was same-seam fallout and was updated to the same unpadded pattern. The fixture sweep was also narrowed truthfully: `tools/validators/tests/**/*.ts` positive story-bundle and schema/pre-apply fixtures were normalized to unpadded ids; `tools/world-mcp/tests/` padded literals were left unchanged because live hits are allocator/legacy/world-level fixtures or out-of-package story-bundle consumer tests, not validators-package positive schema fixtures. Remaining padded hits in `tools/validators/tests/**/*.ts` are intentional negative PG/BEL tests or world-canon/legacy fixtures (`CF-0001`, `CH-0006`) outside D3's story-bundle schema contract.

## Architecture Check

1. Tightening regex + converting fixtures + adding negative golden tests is the minimum 3-part change that (a) mechanically enforces FOUNDATIONS-002, (b) brings fixture state into compliance, and (c) proves the tightening works going forward. Alternative — only converting fixtures (SPEC-35 D8's approach) — was insufficient: the next audit (this one) found padded fixtures still drifting in. Mechanical enforcement is the structural fix.
2. No backwards-compatibility aliasing/shims introduced; padded IDs become invalid post-this-ticket and any author-owned padded content must be migrated. The migration is unpadded-ID conversion at the source, not regex relaxation.

## Verification Layers

1. All 17 story-bundle schemas use the tightened regex → codebase grep-proof: `if rg -n '\[0-9\]\+' tools/validators/src/schemas/story-*.schema.json; then exit 1; fi` returns zero loose-pattern hits; `rg -n '"pattern": "\^[^"]*-\(0\|\[1-9\]\[0-9\]\*\).*\$"' tools/validators/src/schemas/story-*.schema.json | wc -l` reports tightened story-schema patterns.
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
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — align branch-prefix page-id helper with unpadded PG schema)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify — appended padded PG rejection test)
- `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` (modify — appended padded BEL rejection test)
- `tools/validators/tests/**/*.ts` positive validator/pre-apply/story-bundle fixtures surfaced by the implementation-time grep (modify — normalize padded current-contract ids to unpadded forms)

## Out of Scope

- World-canon schema regex tightening (CF / CH / INV / M / OQ / ENT / SEC schemas). World-canon schemas have their own ID-format conventions per FOUNDATIONS §Canonical Storage Layer and are not modified by this ticket.
- Migration of author-owned `worlds/<slug>/stories/<slug>/_source/` content with padded IDs. Per SPEC-36 §Risks, breakage from padded author content is acceptable — the FOUNDATIONS-002 convention has been canonical since SPEC-13; the fix is unpadded-ID migration at the source, not regex relaxation.
- Other validators that read story-bundle IDs as strings (any logic outside `record_schema_compliance`'s schema-driven validation). Those validators continue to use string-comparison logic regardless of the regex tightening.
- ID-allocator changes. `tools/world-mcp/src/tools/allocate-next-id.ts` already uses `zeroPad: false` for all classes per F6 / SPEC-35-D6 verification; no changes needed.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build && npm test` in `tools/validators/` is green — all existing tests pass under unpadded mock IDs; the two negative golden tests pass under the tightened regex.
2. `if rg -n '\[0-9\]\+' tools/validators/src/schemas/story-*.schema.json; then exit 1; fi` returns zero hits (every loose `[0-9]+` pattern in story-bundle schemas has been tightened).
3. `rg -n '(PG|CHC|BEL|SF|SE|BR|STENT|SLT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STINT|STSTAT|DA|CF|CH|M|ENT|STORY)-0+[0-9]+' tools/validators/tests -g '*.ts'` returns only the intentional negative PG/BEL padded-id tests and world-canon/legacy exclusions; `tools/world-mcp/tests/` padded hits are out of this validators-package ticket unless they are positive fixtures consumed by the validators package proof.
4. World-canon schemas (`canon-fact-record.schema.json`, `change-log-entry.schema.json`, `invariant.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `entity.schema.json`, `section.schema.json`) remain unchanged: `git diff tools/validators/src/schemas/canon-fact-record.schema.json ...` returns empty for all seven world-canon schema files.

### Invariants

1. Story-bundle ID-format schemas mechanically reject padded IDs via `^<PREFIX>-(0|[1-9][0-9]*)$` patterns.
2. The `record_schema_compliance` validator surfaces padded-ID violations as schema errors (proven by the two negative golden tests).
3. World-canon schemas remain untouched; D3's scope is strictly story-bundle.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` and `tools/validators/tests/structural/record-schema-compliance-bel.test.ts` — two negative golden tests proving padded PG and BEL fixtures fail validation; appended to existing class-specific schema tests.
2. `tools/validators/tests/structural/observer-firewall.test.ts` (modify) — convert padded mocks to unpadded; existing test behavior preserved.
3. `tools/validators/tests/structural/branch-isolation.test.ts` (modify) — same conversion.
4. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify — sweep) — same conversion.
5. `tools/validators/tests/_helpers/state-snapshot-replay.test.ts` (modify — sweep) — same conversion.

### Commands

1. `cd tools/validators && npm run build && npm test` — full-suite proof.
2. `if rg -n '\[0-9\]\+' tools/validators/src/schemas/story-*.schema.json; then exit 1; fi` — confirm no loose regex remains in story-bundle schemas.
3. `rg -n '(PG|CHC|BEL|SF|SE|BR|STENT|SLT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STINT|STSTAT|DA|CF|CH|M|ENT|STORY)-0+[0-9]+' tools/validators/tests -g '*.ts'` — confirm validators package sweep coverage and classify the intentional negative/world-canon exclusions.

## Outcome

Completed: 2026-05-16

What changed:

- Tightened all 17 `tools/validators/src/schemas/story-*.schema.json` ID/reference patterns from loose `[0-9]+` suffixes to unpadded natural-integer suffixes using `(0|[1-9][0-9]*)`.
- Normalized validators package positive fixtures and pre-apply/story-bundle test records to unpadded ids so the stricter schemas are exercised by current-contract data.
- Added padded-id rejection coverage by appending PG and BEL negative tests to the existing class-specific `record_schema_compliance` test files.
- Updated `tools/validators/src/structural/recursive-reference-closure.ts` so branch-prefix storylet visibility accepts the same unpadded `PG` id shape now enforced by the storylet schema.

## Verification Result

- `cd tools/validators && npm test` — PASS. The command rebuilt the package and ran 306 tests with 306 passing.
- `if rg -n '\[0-9\]\+' tools/validators/src/schemas/story-*.schema.json; then exit 1; fi` — PASS; no loose `[0-9]+` story-schema patterns remain.
- `rg -n '"pattern": "\^[^"]*-\(0\|\[1-9\]\[0-9\]\*\).*\$"' tools/validators/src/schemas/story-*.schema.json | wc -l` — PASS; 124 tightened story-schema pattern occurrences.
- `git diff --name-only -- tools/validators/src/schemas/canon-fact-record.schema.json tools/validators/src/schemas/change-log-entry.schema.json tools/validators/src/schemas/invariant.schema.json tools/validators/src/schemas/mystery-reserve.schema.json tools/validators/src/schemas/open-question.schema.json tools/validators/src/schemas/entity.schema.json tools/validators/src/schemas/section.schema.json` — PASS; no world-canon schema files changed.
- `rg -n '(PG|CHC|BEL|SF|SE|BR|STENT|SLT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STINT|STSTAT|DA|CF|CH|M|ENT|STORY)-0+[0-9]+' tools/validators/tests -g '*.ts'` — PASS after classification; remaining hits are the intentional padded PG/BEL rejection tests and world-canon/legacy exclusions outside the story-bundle schema contract.

## Deviations

- The drafted `tools/world-mcp/tests/` sweep was narrowed out of this ticket's accepted boundary after live grep classification. The remaining `tools/world-mcp/tests/` padded hits are allocator/legacy/world-level fixture cases or consumer-package story-bundle tests, not validators-package positive schema fixtures.
- No separate `record-schema-compliance.padded-id-rejection.test.ts` file was created; the two golden tests were appended to existing class-specific `record_schema_compliance` tests, which is the tighter local test organization.
- One source helper (`recursive-reference-closure.ts` `PAGE_ID`) was added to the landed file set because the stricter storylet schema made its old padded-only branch-prefix check stale.
