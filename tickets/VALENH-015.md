# VALENH-015: Align engine CHC schema to canonical shared contract — drop pre-reset COMTAX-era fields

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-choice.schema.json` (relax required fields and enum constraints); paired tests under `tools/validators/tests/structural/`; downstream `tools/world-index/src/public/canonical-vocabularies.ts` constants whose sole consumer is the to-be-relaxed CHC schema (audit + decide whether to retain or drop).
**Deps**: `archive/tickets/FOUNDATIONS-002.md`, `archive/tickets/VALENH-012.md`, `archive/tickets/VALENH-013.md`

## Problem

The `branching-story-bootstrap` session of 2026-05-13 (red-bunny bundle in `erotica-world`) emitted 4 CHC records for the root page's first-contact choices. Four of the 390 initial validation failures were `record_schema_compliance.unknown_commitment_class` on CHC-1 / CHC-2 / CHC-3 / CHC-4 — the operator had to discover (by reading `tools/world-index/src/public/canonical-vocabularies.ts`) that the engine's CHC JSON schema requires every `scene_commitment` choice to declare a `commitment_class` drawn from a closed 76+-value taxonomy with a paired closed `COMMITMENT_FAMILIES` enum, plus `record_version: 2`, `choice_kind: scene_commitment | tactical_beat`, `strategy_cluster`, `choice_contract`, `likely_effects[]`, `continuation_capacity`, and a `choice_worthiness` object with five required sub-fields (`strategic_question_answered`, `strong_axes`, `expected_state_delta`, `why_not_microbeat`, `foreseeable_difference`).

None of these fields are in the canonical shared contract at `.claude/skills/_shared-templates/story-state-contract.md`. The contract at §4.4 (commitment block schema) explicitly states at line 235: *"There is no `record_version` (greenfield resets to 1; no v2 / v3 history). There is no `shape` discriminator (single shape — reintroduce only if a second shape is ever needed). There is no `required_context` block (redundant with predicate preconditions). There is no `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, or `stop_policy` — these are arc / plot-rail framings that commitment blocks deliberately reject."* The CHC field set the contract defines in the `branching-story-bootstrap/SKILL.md` Phase 8 prose (line 264) is the contract-canonical CHC carrier: `surface_label`, `player_visible_intent`, `target_or_action_family` (using the §4.4a `action_family` taxonomy), `likely_state_pressure`, `associated_commitment_block`, `success_policy` (only when `target_or_action_family == 'attempt'`).

The engine schema retained the pre-reset COMTAX-era field set (per archived `COMTAX-001 / COMTAX-002 / COMTAX-003`) when the story-pipeline architecture was rebuilt; the corresponding skill-prose surfaces were aligned to the canonical contract during the reset, but the engine layer was not. The result is a structural divergence: skills emit contract-canonical CHC records, the engine rejects them as schema-incomplete, the operator is forced to compose CHC records that carry BOTH the contract's six fields AND the engine's pre-reset 7+ fields to clear validation. The bootstrap session's 4 emitted CHCs all carry the dual-schema overlay; the bundle is committed in that form because schema-vs-contract divergence is the engine's, not the bundle's.

The user has confirmed during this session that `.claude/skills/_shared-templates/story-state-contract.md` is the canonical structural contract for the post-reset story skills, and that engine layer carryover from the pre-reset architecture is the layer to align (not the contract).

This ticket aligns the engine CHC schema to the canonical contract: relax `tools/validators/src/schemas/story-choice.schema.json` to require only the contract-canonical fields, drop the `record_version: const 2` and `choice_kind` enum constraints and the `scene_commitment`-specific elaborate sub-schema, and audit the `tools/world-index/src/public/canonical-vocabularies.ts` `COMMITMENT_CLASSES` + `COMMITMENT_FAMILIES` enums whose sole consumer is the to-be-relaxed CHC `commitment_class` field.

## Assumption Reassessment (2026-05-13)

1. Engine state (HEAD): `tools/validators/src/schemas/story-choice.schema.json` lines 5-68 require `id`, `story_id`, `record_version`, `choice_kind`. Line 9 fixes `record_version: const 2`. Line 10 enforces `choice_kind` enum (`scene_commitment | tactical_beat`). Lines 21-37 define `choice_worthiness` with five required sub-fields (`strategic_question_answered`, `strong_axes`, `expected_state_delta`, `why_not_microbeat`, `foreseeable_difference`). Lines 43-63 add a conditional-required block for `scene_commitment`: `commitment_class`, `strategy_cluster`, `choice_contract`, `likely_effects`, `continuation_capacity`, `choice_worthiness`. Top-level `additionalProperties: true` (line 68). The `commitment_class` enum is sourced from `tools/world-index/src/public/canonical-vocabularies.ts` `COMMITMENT_CLASSES` (76+ values) and validated against `COMMITMENT_CLASS_TO_FAMILY`. Verified by grep: `grep -nE "record_version|scene_commitment|commitment_class|choice_worthiness" tools/validators/src/schemas/story-choice.schema.json`. Working-tree at audit time: clean (the `tools/validators/src/` surface was not in `git status --porcelain` output).
2. Canonical contract state (HEAD): `.claude/skills/_shared-templates/story-state-contract.md:235` explicitly disclaims `record_version`, `shape` discriminator, `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, and `stop_policy` within the §4.4 schema-minimalism context. The contract does not define a §4-numbered CHC schema; the CHC carrier shape lives in consumer-skill prose (`branching-story-bootstrap/SKILL.md` Phase 8 at line 264 and `branching-story-turn-cycle/SKILL.md` line 312, both enumerating `surface_label`, `player_visible_intent`, `target_or_action_family`, `likely_state_pressure`, `associated_commitment_block`, `success_policy`). The user confirmed during this session (audit's reassessment exchange) that the shared contract is canonical and engine pre-reset carryover is the divergence direction to fix.
3. Shared boundary under audit: the CHC record schema as the contract between (a) the validator framework (which decides record acceptance at submit time per `record_schema_compliance`), (b) the canonical shared template (the post-reset story-pipeline architecture's structural commitment), and (c) consumer skills (`branching-story-bootstrap` emitting CHCs at Phase 8; `branching-story-turn-cycle` emitting CHCs at Phase 8; `commitment-block-authoring` referencing CHC continuation semantics). All three must agree on the post-reset canonical field set; the validator schema is the lone outlier carrying pre-reset COMTAX field requirements.
4. FOUNDATIONS principle restated: §Story Bundles §5b ("Schema-Minimalism At Story Scope") commits that "every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. Nice-to-have fields are dropped, because each field costs LLM tokens to author at every record and to read at every retrieval." The engine schema's `record_version: 2`, `scene_commitment` sub-schema, `commitment_class` closed taxonomy, and `choice_worthiness` 5-sub-field structure are pre-reset legacy fields that the canonical contract explicitly disclaims; under §5b they are nice-to-have fields by definition and should be dropped.
5. Schema extension classification: this is a SCHEMA RELAXATION (removing required fields and constraint conditions), not an extension. Consumers: the validator framework's `record_schema_compliance` (will accept the relaxed shape immediately), `branching-story-bootstrap` Phase 8 prose (already documents only the canonical fields per `.claude/skills/branching-story-bootstrap/SKILL.md:264`), `branching-story-turn-cycle` Phase 8 prose (per line 312), `commitment-block-authoring` (does not author CHC records directly; consumes them by reference). Already-shipped CHC records (the red-bunny bundle's CHC-1 / CHC-2 / CHC-3 / CHC-4) carry both the legacy and canonical fields and continue to validate under the relaxed schema thanks to top-level `additionalProperties: true`. The relaxation is additive in the backwards-compatibility sense (legacy fields remain valid extra fields per `additionalProperties: true`) but normative in the forward direction (new CHC records can be authored with the canonical fields only).
6. Rename / removal blast radius: removing `record_version: const 2` and the `choice_kind` enum requirement, plus relaxing the `scene_commitment` conditional sub-schema, touches:
   - `tools/validators/src/schemas/story-choice.schema.json` — primary edit.
   - `tools/validators/src/structural/record-schema-compliance.ts` — `record_schema_compliance.unknown_commitment_class` verdict (at lines 196-211 per the prior bootstrap session's failure-message attribution) becomes unreachable post-relaxation; verify the verdict code + its triggering path are dropped cleanly (or kept as best-effort lint if the `commitment_class` field remains optional). The `commitment_family_mismatch` verdict at lines 213-220 (same file) is in the same removal scope.
   - `tools/world-index/src/public/canonical-vocabularies.ts` — `COMMITMENT_CLASSES`, `COMMITMENT_FAMILIES`, `COMMITMENT_CLASS_TO_FAMILY`, `commitmentFamilyForClass` whose sole consumer is the to-be-relaxed CHC schema. Audit whether any OTHER consumer references these constants (grep `tools/` for `COMMITMENT_CLASSES` / `COMMITMENT_FAMILIES` / `COMMITMENT_CLASS_TO_FAMILY` / `commitmentFamilyForClass`); retain them only if a non-CHC consumer surfaces.
   - `tools/validators/tests/structural/record-schema-compliance.test.ts` and other validator test fixtures referencing CHC scene_commitment shapes — update test assertions to reflect the relaxed schema.
   - `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 8 prose, `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 8 prose — no edits required; both already enumerate only the canonical fields. The skill prose is post-relaxation truthful as written.
7. Adjacent contradictions surfaced during reassessment: (a) the `commitment_family` field in `tools/world-index/src/public/canonical-vocabularies.ts` paired with `commitment_class` (the `COMMITMENT_CLASS_TO_FAMILY` map) — these fields might serve a separate purpose in turn-cycle's runtime CHC routing (selecting which storylet family handles a given choice). Classification: required reassessment as part of this ticket — if the family routing is load-bearing for turn-cycle's action resolution, retain `commitment_family` as an optional CHC field; if not, drop both `commitment_class` and `commitment_family` together. (b) `tools/validators/tests/fixtures/story-storylet-complete.yaml` retains legacy SLT fields (`arc_contract`, `dramatic_unit`, etc.) as a negative-rejection fixture per VALENH-012's Out-of-Scope clause — this ticket does not touch that fixture; the CHC schema relaxation is independent. Both classifications are required consequences of this ticket; neither is a separate bug nor future cleanup.

## Architecture Check

1. Schema relaxation aligning the engine validator to the canonical shared contract is cleaner than alternatives: (a) updating the canonical contract to match the engine would reverse the post-reset architectural commitment the user has explicitly confirmed (shared contract is canonical, engine has pre-reset carryover) and re-introduce the COMTAX-era fields the contract's §5b schema-minimalism rule deliberately removed; (b) leaving the divergence in place forces every CHC-emitting skill (bootstrap, turn-cycle, plus any future skill) to author records with the dual-schema overlay indefinitely, doubling field count per CHC and tripling LLM-token cost at every CHC retrieval; (c) introducing a translation layer between the contract and the engine would create a permanent dual-source-of-truth surface, violating §5b directly. Relaxation is the only path that re-establishes single canonical authority.
2. No backwards-compatibility aliasing/shim. The schema's `additionalProperties: true` already permits legacy fields as extras on existing records — the just-shipped red-bunny CHCs continue to validate without any per-record migration. New CHC records authored against the canonical contract validate cleanly. No alias paths, no field renames, no transition flags.

## Verification Layers

1. CHC record with only contract-canonical fields (`id`, `story_id`, `surface_label`, `player_visible_intent`, `target_or_action_family`, `likely_state_pressure`, `associated_commitment_block`, `success_policy` when applicable) validates clean → unit test under `tools/validators/tests/structural/record-schema-compliance.test.ts`.
2. CHC record with both canonical fields AND legacy COMTAX fields (matching the red-bunny bundle's shipped shape) continues to validate clean → regression unit test confirming backwards compatibility via `additionalProperties: true`.
3. CHC record missing one of the canonical fields (e.g., no `surface_label`) fails validation with a clear field-missing verdict → unit test.
4. The `unknown_commitment_class` and `commitment_family_mismatch` verdict paths in `tools/validators/src/structural/record-schema-compliance.ts` either are removed entirely OR are downgraded to optional lint paths that fire only when the optional `commitment_class` field is present → grep-proof + targeted compiled test.
5. `tools/world-index/src/public/canonical-vocabularies.ts` audit: every consumer of `COMMITMENT_CLASSES` / `COMMITMENT_FAMILIES` / `COMMITMENT_CLASS_TO_FAMILY` / `commitmentFamilyForClass` is enumerated (grep `tools/` and `.claude/skills/`); the constants are retained only if a non-CHC consumer surfaces, dropped otherwise → grep-proof.
6. End-to-end: a fresh `branching-story-bootstrap` invocation emitting CHCs with only the canonical fields (matching the Phase 8 prose exactly, without the dual-schema overlay) validates clean → optional manual proof if a sandbox world is available; otherwise the unit test in layer 1 is the portable acceptance surface.

## What to Change

### 1. Relax `tools/validators/src/schemas/story-choice.schema.json`

Edit the JSON schema to require ONLY the contract-canonical fields:

- Keep `id` (pattern `^CHC-[0-9]+$`) and `story_id` as required (these are universal record-id fields).
- Drop `record_version: const 2` (remove from `required[]` and from `properties`).
- Drop the `choice_kind` enum requirement (remove from `required[]` and from `properties`; if a field carrying the same semantic is wanted as an optional skill-internal field, leave it as `additionalProperties: true` accommodation — i.e., remove the schema entry entirely rather than relax the enum).
- Remove the `allOf` conditional sub-schema for `scene_commitment` (lines 43-63). The `commitment_class`, `strategy_cluster`, `choice_contract`, `likely_effects`, `continuation_capacity`, `choice_worthiness` requirements are dropped; the fields remain valid as additional properties on records that choose to carry them.
- Add the canonical fields as schema-recognized properties (each optional unless the contract explicitly requires it):
  - `surface_label` (string, the player-visible label)
  - `player_visible_intent` (string, the intent disclosure)
  - `target_or_action_family` (string, per the shared contract §4.4a action_family taxonomy — if the engine wants to enforce that taxonomy as a closed list, source it from the existing `ACTION_FAMILIES` constant in `tools/world-index/src/public/canonical-vocabularies.ts`, which is the action-family taxonomy already established at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts:41`)
  - `likely_state_pressure` (string, debts/beliefs the choice engages)
  - `associated_commitment_block` (string, pattern `^SLT-[0-9]+$` OR null)
  - `success_policy` (string, only when `target_or_action_family == 'attempt'`)
- Required fields: `id`, `story_id`. Schema-level decision on whether to require any of the canonical fields is per the shared contract's silence (contract says "Each CHC carries..." but doesn't mark fields as required at field-level; safest is to leave all canonical fields optional, since the bootstrap and turn-cycle skill prose treat them as conventionally-present-but-not-schema-enforced).
- Keep `additionalProperties: true` at root so existing records with legacy COMTAX fields continue to validate.

### 2. Update `tools/validators/src/structural/record-schema-compliance.ts`

The `unknown_commitment_class` and `commitment_family_mismatch` verdict paths (lines 196-220) read the CHC record's `commitment_class` and `commitment_family` fields and validate them against the closed taxonomy. Since `commitment_class` is no longer schema-required, these verdicts should EITHER:

- (a) be removed entirely if the relaxation drops both `commitment_class` and `commitment_family` from the canonical CHC field set, OR
- (b) be downgraded to optional-lint verdicts: fire only when the CHC record carries `commitment_class` AND the value is not in the closed taxonomy (so legacy records continue to lint cleanly; canonical-only records pass without consulting the taxonomy).

Choose (a) unless the §Assumption Reassessment item 7(a) audit reveals that `commitment_family` is load-bearing for turn-cycle's runtime CHC routing — if so, choose (b) and retain `commitment_family` (not `commitment_class`) as an optional CHC field per §What to Change item 1.

### 3. Audit `tools/world-index/src/public/canonical-vocabularies.ts`

Grep `tools/` and `.claude/skills/` for every consumer of `COMMITMENT_CLASSES`, `COMMITMENT_FAMILIES`, `COMMITMENT_CLASS_TO_FAMILY`, `commitmentFamilyForClass`. Expected consumers: the to-be-relaxed CHC schema-compliance check (this ticket's primary edit) and potentially turn-cycle's runtime action routing. If the audit reveals no non-CHC consumer, drop all four constants from the file. If turn-cycle's runtime routing references `commitmentFamilyForClass`, retain `COMMITMENT_FAMILIES` and `commitmentFamilyForClass` as the runtime-routing surface and drop only `COMMITMENT_CLASSES` and `COMMITMENT_CLASS_TO_FAMILY`. Resolution is determined by the audit outcome at implementation time.

### 4. Update tests

In `tools/validators/tests/structural/record-schema-compliance.test.ts` (and any sibling CHC-touching test files):

- Update the canonical-CHC-record test fixture to the relaxed shape (no `record_version`, no `choice_kind`, optional `commitment_class`).
- Add a regression test: a CHC record with both canonical fields AND legacy COMTAX fields validates clean.
- Add a missing-canonical-field test: a CHC record without `surface_label` either passes (if surface_label is optional in the relaxed schema) or fails with a clear verdict (if surface_label is added to `required[]`); align with §What to Change item 1's required-list decision.
- Update or remove tests that asserted the `unknown_commitment_class` or `commitment_family_mismatch` verdicts on records WITHOUT `commitment_class`; preserve tests that exercise those verdicts on records WITH `commitment_class` only if §What to Change item 2 takes path (b).

### 5. Update `tools/validators/README.md` (if applicable)

If the README documents the CHC schema's required-field set or the closed `commitment_class` taxonomy as part of the public validator API surface, update it to reflect the relaxed shape and the canonical contract reference. Skip if the README does not document CHC schema specifics.

### 6. Rebuild compiled artifacts

`cd tools/validators && npm run build` regenerates `dist/` artifacts. The compiled-tests path is the proof surface for the targeted-test commands below.

## Files to Touch

- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify — relax or downgrade the `unknown_commitment_class` / `commitment_family_mismatch` verdict paths)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — update CHC test fixtures and assertions)
- `tools/world-index/src/public/canonical-vocabularies.ts` (modify — audit consumer set; drop unused commitment-class/family constants)
- `tools/validators/README.md` (modify, if the README documents CHC schema specifics)
- `tools/validators/dist/...` (regenerated by build; not directly edited)

## Out of Scope

- Migration of the red-bunny bundle's already-shipped CHC records to drop the legacy COMTAX fields (the records continue to validate under the relaxed schema thanks to `additionalProperties: true`; per `archive/tickets/FOUNDATIONS-002.md` §Out of Scope, repairing already-committed red-bunny story-bundle data is a separate concern).
- The `commitment_family` field's runtime routing role in `branching-story-turn-cycle` (if the §Assumption Reassessment item 7(a) audit reveals it is load-bearing for runtime action routing, retain it per §What to Change item 2; if not, drop it). Either resolution is in-scope for this ticket; the audit-and-decide step itself is in-scope.
- Other CHC-adjacent validator concerns (e.g., the `choice_kind: tactical_beat` semantic — is it a real second shape per the contract's `# (single shape — reintroduce only if a second shape is ever needed)` exclusion, or pre-reset legacy too?) — out of scope; if `tactical_beat` is genuinely the only second `choice_kind` ever needed, it can be re-added in a separate ticket once a use case surfaces.
- Skill-prose updates to `branching-story-bootstrap/SKILL.md` Phase 8 or `branching-story-turn-cycle/SKILL.md` Phase 8 — both already document the canonical CHC field set; no edits required post-relaxation.
- Updating `tools/validators/tests/fixtures/story-storylet-complete.yaml` (which retains legacy SLT fields as a negative-rejection fixture per `archive/tickets/VALENH-012.md` §Out of Scope) — that fixture is for SLT records, not CHC records; CHC test fixtures live in the test file directly, not in shared fixture YAML.
- Schema-by-example documentation updates per `archive/tickets/MCPENH-038-document-schema-by-example-pattern-in-engine-envelope-shape.md` — separate documentation surface; out of scope unless the schema-by-example documentation directly cites CHC fields, in which case file a follow-up.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: a CHC record with only contract-canonical fields (`id: CHC-1`, `story_id: STORY-1`, `surface_label: "Approach the bench..."`, `player_visible_intent: "..."`, `target_or_action_family: "communicate"`, `likely_state_pressure: "..."`, `associated_commitment_block: "SLT-1"`, no `record_version`, no `choice_kind`, no `commitment_class`) validates clean.
2. New unit test: a CHC record with both canonical fields AND legacy COMTAX fields (matching the red-bunny bundle's shipped CHC-1 shape) continues to validate clean (regression check via `additionalProperties: true`).
3. New unit test: a CHC record missing `id` or `story_id` fails validation with a clear field-missing verdict (the only fields that must remain required per §What to Change item 1).
4. Existing tests under `tools/validators/tests/structural/record-schema-compliance.test.ts` that exercised the CHC schema continue to pass after fixture updates; tests that asserted the `unknown_commitment_class` or `commitment_family_mismatch` verdicts on canonical-only records are removed or downgraded per §What to Change item 2.
5. Full-package: `cd tools/validators && npm test` passes with no regression on non-CHC validator surfaces (the relaxation is scoped to CHC).
6. Grep-proof: `grep -rE "COMMITMENT_CLASSES|COMMITMENT_FAMILIES|COMMITMENT_CLASS_TO_FAMILY|commitmentFamilyForClass" tools/ .claude/skills/` returns either zero hits (if all four constants are dropped) or only the retained `commitment_family`-routing surfaces in turn-cycle if §What to Change item 3 keeps them.

### Invariants

1. The CHC schema requires only fields the canonical shared contract treats as carrier-mandatory (per `branching-story-bootstrap/SKILL.md` Phase 8 line 264 and `branching-story-turn-cycle/SKILL.md` line 312). The schema does NOT enforce pre-reset COMTAX fields the contract explicitly disclaims.
2. Already-shipped CHC records carrying legacy COMTAX fields continue to validate under `additionalProperties: true`; no per-record migration is required.
3. `tools/world-index/src/public/canonical-vocabularies.ts` carries no unused constants whose sole consumer was the to-be-relaxed CHC schema; commitment-class/family constants are retained only if a non-CHC consumer surfaces.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — replace the canonical-CHC test fixture with the relaxed shape; add the both-canonical-and-legacy regression test (red-bunny shape); add the missing-required-field test; update or remove tests asserting the `unknown_commitment_class` / `commitment_family_mismatch` verdicts on canonical-only records.

### Commands

1. Build: `cd tools/validators && npm run build`
2. Targeted compiled test: `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js`
3. Full-package: `cd tools/validators && npm test`
4. Stale-anchor proof (post-relaxation): `grep -nE "record_version|scene_commitment|commitment_class|commitment_family|choice_worthiness" tools/validators/src/schemas/story-choice.schema.json` — assert only the relaxed/canonical surface remains, no `record_version: const 2`, no `scene_commitment` conditional sub-schema.
5. Consumer-audit proof: `grep -rE "COMMITMENT_CLASSES|COMMITMENT_FAMILIES|COMMITMENT_CLASS_TO_FAMILY|commitmentFamilyForClass" tools/ .claude/skills/` — enumerate every consumer post-edit; assert retained constants have at least one non-CHC consumer.
