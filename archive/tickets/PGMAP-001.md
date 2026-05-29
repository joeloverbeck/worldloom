# PGMAP-001: Align PG active-records full-map contract across schema, validator, and PG-authoring skill guidance

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md`, `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md`, `.claude/skills/_shared-templates/story-record-schemas.md` (§4.2); no validator/schema logic change in the owned scope.
**Deps**: none

## Problem

A freshly bootstrapped, fully schema-valid root page (`red-bunny` PG-1) drew a `compatibility_drift` WARN (`compat_requires_migration_patch`): "PG-1 state_snapshot.active_records omits DA, STQ, STPLAN; new/current-contract pages must materialize the full active-record map." The page was authored exactly as the bootstrap phase-7 reference prescribes (include keys for the classes that have records) and exactly as the PG JSON schema requires (`active_records.required` is `["STCHAR"]` only). At intake, four surfaces disagreed or were incomplete about what a current-contract page's `active_records` map must contain:

1. **PG JSON schema** (`tools/validators/src/schemas/story-page.schema.json:50`): `active_records.required: ["STCHAR"]` — omitting `DA`/`STQ`/`STPLAN`/`CNSQ` is hard-valid.
2. **`compatibility_drift` validator** (`tools/validators/src/structural/compatibility-drift.ts`): for an in-plan / current-contract-parented page, omitting any optional active-record class key is `severity: "warn"`, classification `requires_migration_patch`, with suggested fix "Materialize ... as empty arrays."
3. **`active_records_full_shape` validator** (`tools/validators/src/structural/active-records-full-shape.ts`): in full-world mode, every missing member of `ACTIVE_RECORDS_CLASSES` is reported; missing `STCHAR` is `fail`, and every other missing class is `warn`.
4. **PG-authoring skill guidance** (`branching-story-bootstrap/references/phase-7-root-event-and-page.md`): "active_records including the STCHAR, BEL, and STSTAT keys plus CLK / STSEC / STQ keys when optional seed records exist" — i.e., include only keys you have records for.

Before this ticket, an author who followed the skill guidance and the hard schema could produce WARNs on every new bundle. The guidance now matches the validator's stated current contract so clean bootstrap/turn-cycle authoring materializes the full map up front.

## Assumption Reassessment (2026-05-29)

1. **Codebase check.** Confirmed `compatibility-drift.ts` sets `severity = isCreatedPageInPlan(...) || hasCurrentContractParent(...) ? "warn" : "info"` and `missingOptionalActiveRecordKeys` flags every member of `OPTIONAL_ACTIVE_RECORDS_CLASSES` not present as an array. Confirmed `active-records-full-shape.ts` reads `ACTIVE_RECORDS_CLASSES` and reports every missing class key in full-world mode. Confirmed `story-page.schema.json` still has `active_records.required: ["STCHAR"]`, so the JSON Schema remains intentionally permissive while structural validators express the full-map current contract.
2. **Specs/docs check.** `.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md` and `_shared-templates/story-record-schemas.md` §4.2 enumerate the `active_records` keys but neither states "new pages must materialize the full class-key map." `branching-story-turn-cycle/references/phase-6-page-snapshot.md` is the sibling PG-authoring surface and shares the gap.
3. **Shared boundary under audit.** The `PG.state_snapshot.active_records` shape contract, shared by `branching-story-bootstrap` and `branching-story-turn-cycle` (both author `PG` records), the `story-page.schema.json` schema, `compatibility_drift`, and `active_records_full_shape`. This ticket only changes prose guidance; schema and validator behavior are left intact in scope.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles §5b (Schema-Minimalism: every stored field must be load-bearing). The compat validator's *legacy* branch (`compatibility-drift.ts:140`) states "replay validators normalize the missing keys to `[]`." If replay already infers missing keys as empty, then the materialized empty arrays carry no information a consumer cannot derive — which is in tension with §5b. The recommended scope (doc-alignment to materialize the full map) resolves the author-facing WARN without taking a position on §5b; see item 5.
5. **Adjacent contradiction (classified as future cleanup → own ticket).** The validators WARN new/current-contract pages for omitted active-record keys while `compatibility_drift` also asserts that legacy replay normalizes optional missing keys to `[]`. This means the new-page full-map requirement is forward-shape-consistency hygiene, not replay correctness, and arguably has tension with §5b. Deciding whether to drop the WARNs and rely on normalization everywhere requires auditing every `active_records` consumer (replay validators, `get_context_packet` story-bundle assembly in `tools/world-mcp/src/context-packet/`, scene-plan/turn-cycle retrieval) to confirm none branch on key presence. That audit is out of scope here and must become its own ticket if pursued. This ticket takes the lower-risk path: make documented authoring guidance match the live structural-validator current contract.
6. **Scope correction.** The drafted ticket named `OPTIONAL_ACTIVE_RECORDS_CLASSES ∪ {STCHAR}` as the key-list proof, but live `active_records_full_shape` uses the full `ACTIVE_RECORDS_CLASSES` list from `tools/validators/src/_helpers/state-snapshot-replay.ts`. The owned prose must therefore name all 18 active-record classes, not only optional classes plus `STCHAR`.

## Architecture Check

1. Documentation alignment is the cleanest fix because it makes the authoring guidance, shared contract prose, and structural-validator current contract agree at zero behavioral risk: the validators already declare the intended current contract and ship suggested fixes to materialize missing classes as empty arrays, and the schema already tolerates the full map. Tightening the schema to require all keys would break grandfathered legacy pages that the validator deliberately reads as `info` + normalized; loosening the validators would require the consumer audit named in Assumption Reassessment item 5. Aligning the prose is the minimal, non-breaking move.
2. No backwards-compatibility aliasing/shims introduced — legacy pages remain grandfathered (`info`, normalized) exactly as today; only forward-authoring prose changes.

## Verification Layers

1. New bootstrap/turn-cycle guidance materializes the full active-records map → manual contract review + stale-anchor grep over the edited skill references proves they instruct authors to include every `ACTIVE_RECORDS_CLASSES` key with `[]` for inactive classes.
2. Guidance text matches validator contract → codebase grep-proof (`ACTIVE_RECORDS_CLASSES` in `state-snapshot-replay.ts` equals the key list named in the updated phase-7 / phase-6 references and §4.2).
3. Legacy grandfathering unchanged → FOUNDATIONS alignment check + grep-proof (no edit to `compatibility-drift.ts` severity logic; legacy `info` path untouched).

## Landed Changes

### 1. Bootstrap PG-authoring guidance

`.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md` now replaces the narrowed "active_records including the STCHAR, BEL, and STSTAT keys plus CLK / STSEC / STQ keys when optional seed records exist" instruction with an explicit current-contract rule: new `PG.state_snapshot.active_records` maps materialize every `ACTIVE_RECORDS_CLASSES` key, using `[]` for classes with no active records. It names the canonical key list and cites `active_records_full_shape.active_records_class_key_missing` plus `compatibility_drift.compat_requires_migration_patch` as enforcing validators.

### 2. Turn-cycle PG-authoring guidance

`.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` now applies the identical full-map rule so continuation/fork pages are authored full-map by default.

### 3. Shared contract §4.2

`.claude/skills/_shared-templates/story-record-schemas.md` §4.2 (`PG` schema) now adds a normative note that new/current-contract pages materialize the full `active_records` class-key map (empty arrays for unused classes), while legacy pages with missing optional keys remain grandfathered and replay-normalized to `[]`.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `archive/tickets/PGMAP-001.md` (modify closeout/reassessment)

## Out of Scope

- Changing `story-page.schema.json` `active_records.required`.
- Changing `compatibility_drift` severity logic or the legacy `info` path.
- Deciding the §5b "drop the WARN vs require the map" question (Assumption Reassessment item 5) — that requires a separate `active_records`-consumer audit ticket.

## Acceptance Criteria

### Tests That Must Pass

1. The edited bootstrap and turn-cycle guidance instructs new/current-contract `PG.state_snapshot.active_records` authors to materialize all 18 active-record class keys, with `[]` for inactive classes.
2. The key list named in the three updated docs is byte-equal (as a set) to `ACTIVE_RECORDS_CLASSES` from `tools/validators/src/_helpers/state-snapshot-replay.ts`.
3. Validator and JSON Schema files are untouched, preserving existing `compatibility_drift` grandfathering and `story-page.schema.json` permissiveness.

### Invariants

1. Following the PG-authoring skill guidance literally produces a current-contract page that satisfies the live full-map structural-validator contract.
2. The documented `active_records` key set never diverges from the validator helper's `ACTIVE_RECORDS_CLASSES` source of truth.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is manual review plus grep/probe checks against existing validator source and tests.`

### Commands

1. `node -e '<extract ACTIVE_RECORDS_CLASSES and compare to prose lists>'` — confirm the key lists in the three edited docs equal `ACTIVE_RECORDS_CLASSES`.
2. `rg -n 'active_records including the STCHAR|per-class lists including|OPTIONAL_ACTIVE_RECORDS_CLASSES' .claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md .claude/skills/_shared-templates/story-record-schemas.md` — expected no matches for stale narrowed guidance.
3. `git diff --check -- .claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md .claude/skills/_shared-templates/story-record-schemas.md archive/tickets/PGMAP-001.md` — whitespace hygiene for all owned prose.

## Outcome

Completed: 2026-05-29.

The PG authoring references and shared story-record schema prose now agree that new/current-contract `PG.state_snapshot.active_records` maps materialize all 18 `ACTIVE_RECORDS_CLASSES` keys: `STENT`, `STCHAR`, `STINT`, `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA`, `STSTAT`, `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO`. Classes with no active records are written as `[]`. No validator, JSON Schema, or patch-engine behavior changed.

## Verification Result

1. `rg -n 'active_records including the STCHAR|per-class lists including|OPTIONAL_ACTIVE_RECORDS_CLASSES' .claude/skills/branching-story-bootstrap/references/phase-7-root-event-and-page.md .claude/skills/branching-story-turn-cycle/references/phase-6-page-snapshot.md .claude/skills/_shared-templates/story-record-schemas.md` returned no matches, proving the stale narrowed guidance is gone from the edited operational surfaces.
2. `node -e '<extract ACTIVE_RECORDS_CLASSES and compare to prose lists>'` reported 18 matching keys in each edited prose surface.
3. Manual review confirmed `compatibility-drift.ts`, `active-records-full-shape.ts`, `state-snapshot-replay.ts`, and `story-page.schema.json` were read-only witnesses in this run and were not edited.
4. The pre-archive intent-to-add hygiene check passed against the then-active ticket path, proving whitespace hygiene while also clearing the temporary intent-to-add marker for the initially untracked ticket. Post-archive review reran whitespace hygiene against `archive/tickets/PGMAP-001.md`.

## Deviations

The drafted ticket used `OPTIONAL_ACTIVE_RECORDS_CLASSES ∪ {STCHAR}` as the prose-proof set and named a bootstrap dry-run / `validate-patch-plan` smoke as acceptance. Live reassessment found `active_records_full_shape` already enforces the full `ACTIVE_RECORDS_CLASSES` map in full-world mode, and no portable bootstrap plan fixture exists in the ticket scope. Acceptance was narrowed to manual contract review plus grep/probe proof over the edited prose and validator source.
