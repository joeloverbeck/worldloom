# SPEC27FOUCAN-001: CF Record schema correctness — status enum + required_world_updates shape

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`canon-fact-record.schema.json` + focused schema tests), `tools/world-index` (`CanonFactStatus` type), `docs/FOUNDATIONS.md`, `.claude/skills/create-base-world` + `.claude/skills/skill-creator` CF templates, `.claude/skills/story-fact-promotion-to-canon` CF-shaped candidate template, `.claude/skills/continuity-audit` retcon proposal template, `.claude/skills/canon-addition` example.
**Deps**: None

## Problem

At intake, the Canon Fact Record `status` enum was internally inconsistent. `docs/FOUNDATIONS.md` §Canon Layers named five canon layers (Hard / Derived / Soft / Contested / Mystery Reserve), but the `status` enum — and the binding schema/type surfaces — carried only `hard_canon | soft_canon | contested_canon | mystery_reserve`: `derived_canon` was absent, and `mystery_reserve` was present even though Mystery Reserve is a separate first-class `M-<integer>` record class. Separately, the FOUNDATIONS CF schema and CF-parity producer examples showed stale `required_world_updates` shapes: retired root markdown filenames or SEC record IDs instead of bare UPPER_SNAKE SEC file-class names.

## Assumption Reassessment (2026-05-14)

1. At intake, `tools/validators/src/schemas/canon-fact-record.schema.json` defined `status` as the four-value enum `["hard_canon","soft_canon","contested_canon","mystery_reserve"]`; `tools/world-index/src/schema/types.ts` defined `CanonFactStatus` as the same four-value union. Zero CF records across `worlds/` used `mystery_reserve` or `contested_canon` as a `status`.
2. At intake, `docs/FOUNDATIONS.md` showed the old four-value enum and showed `required_world_updates` with retired `.md` filenames; `FOUNDATIONS.md` also stated those root markdown files do not exist on machine-layer-enabled worlds. The enforced flat-UPPER_SNAKE-SEC-file-class shape was confirmed in `tools/validators/src/structural/touched-by-cf-completeness.ts` and `tools/patch-engine/src/ops/append-extension.ts`.
3. Shared boundary under audit: the Canon Fact Record `status` enum and `required_world_updates` field shape, restated across the validator JSON schema, the world-index TS type, the `create-base-world` and `skill-creator` CF templates, `story-fact-promotion-to-canon`'s CF-shaped candidate template, `continuity-audit`'s CF-parallel retcon proposal template, and `canon-addition`'s example. These current CF-parity surfaces must move in lockstep.
4. FOUNDATIONS principle under audit: §Canon Layers (five named layers) and Rule 6 (No Silent Retcons) + the Genesis-world rule (`FOUNDATIONS.md:355`). The genesis-world / append-only-ledger rule grandfathers historical CF records — CFs predating this schema extension remain valid; only CFs appended afterward must meet the new enum. No existing CF uses `mystery_reserve`, so the grandfathering set is empty in practice.
5. Schema modified: the Canon Fact Record `status` enum. Consumers: the `record_schema_compliance` validator (reads the JSON schema), `world-index` parsing (`CanonFactStatus`), the CF templates, CF-shaped promotion/retcon producer templates, and `canon-addition`'s emitter/example surfaces. The change is mixed — adding `derived_canon` is additive; removing `mystery_reserve` is technically breaking but zero records use it, so the practical blast radius is the enum-definition and CF-parity producer surfaces only.
6. Removed enum value `mystery_reserve` (as a CF `status`): intake grep found CF-status or CF-shaped-candidate hits in `canon-fact-record.schema.json`, `types.ts`, both CF templates, `story-fact-promotion-to-canon`, and `continuity-audit` retcon proposal surfaces. Other hits were Mystery Reserve record-class/firewall/proposal-routing references, not CF `status` values. Retired-`.md`-filename `required_world_updates` examples appeared in the FOUNDATIONS CF schema, `skill-creator/templates/canon-fact-record.yaml`, and same-seam CF-parity producer templates; `canon-addition/examples/accept-with-required-updates.md` and the `continuity-audit` retcon proposal template used SEC record IDs, the inverse error. All current CF-parity producer hits were absorbed by this ticket.
7. HARD-GATE read: required and completed. `record_schema_compliance` is part of the pre-apply validation signal used by `validate_patch_plan` / `submit_patch_plan`; this ticket tightens the CF status enum but does not weaken gate ordering, approval-token behavior, or Mystery Reserve firewall behavior. Mystery Reserve remains a separate `M-<integer>` record class.
8. Explicit spec reference checked: `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` had D1 current-state prose that became historical after this ticket landed and omitted the two absorbed CF-parity producer templates. A dated implementation note and D1 deliverables row update were added instead of rewriting the full proposal draft.

## Architecture Check

1. Aligning the enum to the five named Canon Layers (minus the layer that is a separate record class) is cleaner than the status quo, where `derived_canon` is silently encoded via `source_basis.derived_from` and `mystery_reserve` is dead enum surface. Documenting the enforced `required_world_updates` shape — rather than the reviewer's invented structured-object shape — keeps the doc and the validator in agreement.
2. No backwards-compatibility aliasing — `mystery_reserve` is removed outright (zero records use it); the genesis-world / append-only rule, not a shim, governs the (empty) grandfathering set.

## Verification Layers

1. `status: derived_canon` accepted, `status: mystery_reserve` rejected on new CFs -> schema validation (`record_schema_compliance` against the updated `canon-fact-record.schema.json`).
2. `CanonFactStatus` type matches the enum -> codebase grep-proof + `npm run build` typecheck in `tools/world-index`.
3. No retired-`.md`-filename `required_world_updates` example and no `mystery_reserve` CF-status example remain -> codebase grep-proof across `docs/` and `.claude/skills/`.
4. Enum aligns with §Canon Layers' five named layers -> FOUNDATIONS alignment check.

## Landed Changes

### 1. CF `status` enum — FOUNDATIONS + schema + type

- `docs/FOUNDATIONS.md`: `status: hard_canon | derived_canon | soft_canon | contested_canon`.
- `tools/validators/src/schemas/canon-fact-record.schema.json`: `status` enum is `["hard_canon","derived_canon","soft_canon","contested_canon"]`.
- `tools/world-index/src/schema/types.ts`: `CanonFactStatus` union uses the same four values.
- `tools/validators/tests/structural/record-schema-compliance.test.ts`: added an acceptance/rejection pair proving `derived_canon` passes and `mystery_reserve` fails as a CF status.
- `tools/world-index/tests/public-types.test.ts`: tightened the public type assertion to the exact four-value `CanonFactStatus` union.
- `docs/FOUNDATIONS.md`: added a note immediately after the CF schema block that Mystery Reserve entries are first-class `M-<integer>` records, not a CF status.

### 2. `required_world_updates` doc shape

- `docs/FOUNDATIONS.md`: replaced the retired-`.md`-filename list with bare UPPER_SNAKE SEC file-class names and documented that retired root markdown filenames must not appear in `required_world_updates`.

### 3. Stale-surface sweep

- `.claude/skills/skill-creator/templates/canon-fact-record.yaml`: updated the `required_world_updates` example to the enforced UPPER_SNAKE shape and updated the `status` enum documentation.
- `.claude/skills/create-base-world/templates/canon-fact-record.yaml`: updated the `status` enum documentation; its `required_world_updates` UPPER_SNAKE guidance was already correct.
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` and `templates/proposal-package.yaml`: updated the CF-shaped candidate `status` enum and `required_world_updates` description to match FOUNDATIONS.
- `.claude/skills/continuity-audit/templates/retcon-proposal-card.md`: updated the CF-parallel proposed status values and `required_world_updates` description to match the accepted CF schema.
- `.claude/skills/canon-addition/examples/accept-with-required-updates.md`: corrected `required_world_updates` from SEC record IDs to UPPER_SNAKE file-class names.

### 4. Change Control Policy prose pointer

- `docs/FOUNDATIONS.md` §Change Control Policy: added a one-line pointer noting that the CH (Change Log Entry) record schema operationalizes the policy. No `impact_surface_map` was introduced.
- `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md`: added a dated D1 implementation note and updated the D1 deliverables row for the absorbed CF-parity producer templates.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `tools/validators/src/schemas/canon-fact-record.schema.json` (modify)
- `tools/world-index/src/schema/types.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `.claude/skills/skill-creator/templates/canon-fact-record.yaml` (modify)
- `.claude/skills/create-base-world/templates/canon-fact-record.yaml` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (modify)
- `.claude/skills/continuity-audit/templates/retcon-proposal-card.md` (modify)
- `.claude/skills/canon-addition/examples/accept-with-required-updates.md` (modify)
- `specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` (modify)

## Out of Scope

- The reviewer's invented `mystery_links[]` CF field — does not exist, not introduced.
- The reviewer's invented structured-object `required_world_updates` shape (`target_class` / `target_record_ids` / `discovery_required`) — contradicts the enforced flat shape.
- Reviewer Amendment 3 (Canon Integration Chain) and Amendment 10 (`impact_surface_map`) — rejected per spec §Out of Scope; D1's Change Control change is limited to a one-line prose pointer.
- Migrating or rewriting any existing CF record — none use `mystery_reserve`; grandfathering is a no-op in practice.

## Acceptance Criteria

### Tests That Must Pass

1. A CF fixture with `status: derived_canon` passes `record_schema_compliance`; a CF fixture with `status: mystery_reserve` fails it.
2. `npm run build` in `tools/world-index` succeeds; `npm test` in `tools/validators` succeeds (including its build).
3. `if rg -n '^\s*- (INSTITUTIONS|ECONOMY_AND_RESOURCES|EVERYDAY_LIFE|TIMELINE)\.md\b' docs/FOUNDATIONS.md .claude/skills/skill-creator/templates/canon-fact-record.yaml; then exit 1; fi` returns zero retired-filename list/example hits.
4. `rg -n 'mystery_reserve' docs/FOUNDATIONS.md .claude/skills/create-base-world/templates/canon-fact-record.yaml .claude/skills/skill-creator/templates/canon-fact-record.yaml .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml .claude/skills/continuity-audit/templates/retcon-proposal-card.md` returns only a legitimate Mystery Reserve record-class validator reference in FOUNDATIONS, not a CF-status enum hit.

### Invariants

1. The CF `status` enum is identical across `canon-fact-record.schema.json`, `CanonFactStatus`, and both CF templates.
2. `required_world_updates` examples everywhere use bare UPPER_SNAKE SEC file-class names — never `.md` filenames, never SEC record IDs.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — extend `record_schema_compliance` with a CF status pair (`derived_canon` accepted, `mystery_reserve` rejected).

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/validators && npm test`
3. `if rg -n '^\s*- (INSTITUTIONS|ECONOMY_AND_RESOURCES|EVERYDAY_LIFE|TIMELINE)\.md\b' docs/FOUNDATIONS.md .claude/skills/skill-creator/templates/canon-fact-record.yaml; then exit 1; fi`
4. `rg -n 'mystery_reserve' docs/FOUNDATIONS.md .claude/skills/create-base-world/templates/canon-fact-record.yaml .claude/skills/skill-creator/templates/canon-fact-record.yaml .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml .claude/skills/continuity-audit/templates/retcon-proposal-card.md`

## Outcome

Completed. The accepted CF status enum is now `hard_canon | derived_canon | soft_canon | contested_canon` across FOUNDATIONS, the validator schema, the world-index type surface, CF templates, and current CF-parity producer templates. `required_world_updates` examples now use UPPER_SNAKE SEC file classes, and the Change Control Policy points at the CH record schema as its operationalization.

## Verification Result

1. `cd tools/world-index && npm run build` — PASS.
2. `cd tools/validators && npm test` — PASS, 215 tests.
3. `if rg -n '^\s*- (INSTITUTIONS|ECONOMY_AND_RESOURCES|EVERYDAY_LIFE|TIMELINE)\.md\b' docs/FOUNDATIONS.md .claude/skills/skill-creator/templates/canon-fact-record.yaml; then exit 1; fi` — PASS; no retired-filename `required_world_updates` list/example hits remain on the owned surfaces.
4. `rg -n 'mystery_reserve' docs/FOUNDATIONS.md .claude/skills/create-base-world/templates/canon-fact-record.yaml .claude/skills/skill-creator/templates/canon-fact-record.yaml .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml .claude/skills/continuity-audit/templates/retcon-proposal-card.md` — PASS by classification; the only remaining hit is `docs/FOUNDATIONS.md`'s legitimate `rule7_mystery_reserve_preservation` Mystery Reserve record-class validator reference.
5. `rg -n 'required_world_updates: \[SEC-|required_world_updates.*\.md|status: hard_canon \| soft_canon \| contested_canon \| mystery_reserve|proposed_status: hard_canon.*mystery_reserve|desired_canon_status.*mystery_reserve' docs/FOUNDATIONS.md .claude/skills/create-base-world/templates/canon-fact-record.yaml .claude/skills/skill-creator/templates/canon-fact-record.yaml .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml .claude/skills/continuity-audit/templates/retcon-proposal-card.md .claude/skills/canon-addition/examples/accept-with-required-updates.md` — PASS; no stale accepted-CF status or `required_world_updates` shape hits remain.

## Deviations

1. Reassessment absorbed `story-fact-promotion-to-canon` and `continuity-audit` retcon proposal CF-parity surfaces because both claim field-copy/parity with the accepted CF schema; leaving them stale would make the schema change operationally misleading.
2. The drafted retired-filename grep over all `docs/FOUNDATIONS.md` was too broad because the Canonical Storage Layer intentionally names retired root markdown files as historical/nonexistent storage forms. Verification uses a list/example-line anchored grep against the owned `required_world_updates` examples instead.
3. The explicit SPEC-27 reference was updated with a dated implementation note instead of a broad rewrite; remaining D1 current-state prose in the proposal is historical intake context.
