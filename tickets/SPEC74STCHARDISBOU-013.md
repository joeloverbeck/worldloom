# SPEC74STCHARDISBOU-013: Capstone — red-bunny STCHAR migration + end-to-end validator verification

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` (migration via patch engine; subject to Hook 3 engine-only mutation discipline + ENGINESYNC-005 hash-drift coordination); new capstone integration test file `tools/validators/tests/integration/spec74-stchar-end-to-end.test.ts` (or equivalent path) exercising the full STCHAR validator suite on the migrated red-bunny fixtures
**Deps**: `archive/tickets/SPEC74STCHARDISBOU-001.md`, `archive/tickets/SPEC74STCHARDISBOU-002.md`, `archive/tickets/SPEC74STCHARDISBOU-004.md`, `archive/tickets/SPEC74STCHARDISBOU-005.md`, `archive/tickets/SPEC74STCHARDISBOU-007.md`, 010, 012

## Problem

After `archive/tickets/SPEC74STCHARDISBOU-001.md`, `archive/tickets/SPEC74STCHARDISBOU-002.md`, `archive/tickets/SPEC74STCHARDISBOU-003.md`, `archive/tickets/SPEC74STCHARDISBOU-004.md`, `archive/tickets/SPEC74STCHARDISBOU-005.md`, `archive/tickets/SPEC74STCHARDISBOU-006.md`, `archive/tickets/SPEC74STCHARDISBOU-007.md`, and active tickets SPEC74STCHARDISBOU-008 through -012 land, the validator framework will FAIL-everywhere on STCHAR profiles that lack the `Stable Source Material Inventory` subsection, cite temporal-state records in operational sections, lack `regeneration_reason_class` for regenerated profiles, or carry §16a packets with stale current-state references. The 3 active red-bunny STCHAR profiles (`STCHAR-1.md`, `STCHAR-2.md`, `STCHAR-3.md`) were authored before this spec landed and almost certainly fail the new structural gates. The fail-everywhere policy chosen at SPEC-74 §5 triage requires a pre-landing remediation pass on red-bunny before the validators register. Additionally, the SPEC-74 capstone needs an end-to-end test exercising every new validator + extension against the migrated red-bunny fixtures + intentional negative fixtures, asserting expected pass/fail diagnostics.

## Assumption Reassessment (2026-05-23)

1. Verified all 7 upstream dependency tickets cover the validator + schema + skill + template surface this capstone exercises: `archive/tickets/SPEC74STCHARDISBOU-001.md` (story-character-profile authoring discipline), `archive/tickets/SPEC74STCHARDISBOU-002.md` (bootstrap Phase 1b ledger), `archive/tickets/SPEC74STCHARDISBOU-004.md` (story-record-schemas STCHAR prose + field rule), `archive/tickets/SPEC74STCHARDISBOU-005.md` (turn-cycle §16a paragraph rewrite), `archive/tickets/SPEC74STCHARDISBOU-007.md` (body-integrity subsection requirement), 010 (page-packet validator extension), 012 (health-audit Phase 2m findings). The leaf-set transitively reaches the full validator + schema surface: 010 → 003 (story-state-contract §16a rewrite); 012 → 008 + 009 + 011; 011 → 006.
2. Verified red-bunny STCHAR fixtures exist at `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` (Step 2 spot-check confirmed); no other bundle has STCHAR profiles on `main`.
3. Cross-skill boundary under audit: the capstone exercises the full STCHAR validator suite (existing pre-SPEC-74 validators + the 3 new validators + the page-packet extension + the body-integrity extension); the migration touches engine-only write surfaces (`worlds/<slug>/stories/<slug>/_source/character-authorities/*.yaml` via patch-engine STCHAR-record op, with Hook 3 blocking direct edits); the ENGINESYNC-005 hash-drift coordination is a load-bearing prerequisite (per SPEC-74 §5 KNOWN BLOCKER).
4. FOUNDATIONS principle restated: Rule 6 (No Silent Retcons) — the migration is itself a retcon of existing red-bunny STCHAR profiles; the retcon attribution MUST cite SPEC-74 as the motivating spec. Each migrated profile's modification_history (if the records schema supports it) or change-log entry must record the SPEC-74 attribution. §Story Bundles §6.1 — the migration preserves STCHAR's role as story-local character authority while bringing the profiles into compliance with the new structural gates.
5. HARD-GATE / Canon Safety Check surface touched: the migration routes through the patch engine (`mcp__worldloom__submit_patch_plan`); Hook 3 blocks direct edits to `worlds/<slug>/stories/<slug>/_source/*.yaml` and to the hybrid character-authority markdown surface (engine-routed via prescribed skill operations). The implementing developer MUST verify ENGINESYNC-005's `file_versions` hash-basis mismatch disposition before any engine-routed STCHAR mutation: either (a) confirm SPEC-71 / SPEC-72 incidentally cleared the mismatch via a probe patch, OR (b) coordinate with ENGINESYNC-005 sequencing. The MEMORY.md entry `project_red_bunny_hash_drift.md` records the blocker; the band-aid hand-reconciliation it notes is NOT a load-bearing path for this spec.
6. **Rename/remove blast radius**: this migration changes the content of existing `STCHAR-{1,2,3}.md` records — adding `Stable Source Material Inventory` subsection (per `archive/tickets/SPEC74STCHARDISBOU-007.md`), routing any embedded temporal-state references to STSTAT/STEMO/BEL/STPLAN/etc. (per SPEC74STCHARDISBOU-009 contamination detection), and adding `regeneration_reason_class` for any regenerated profiles (per SPEC74STCHARDISBOU-006 schema field). The blast radius is per-file (3 STCHAR files) plus per-page-plan files that cite the affected STCHAR profiles in §16a packets (if any cite stale current-state references per SPEC74STCHARDISBOU-010, those packets need remediation too). Grep `worlds/erotica-world/stories/red-bunny/` for `STCHAR-{1,2,3}` references in page-plan / prose-receipt files to enumerate the full migration scope before patching.

## Architecture Check

1. The capstone treats the migration AS the integration test: re-running the full STCHAR validator suite on the migrated red-bunny fixtures IS the success criterion. The end-to-end test file in `tools/validators/tests/integration/` (or equivalent path — confirm at implementation time the canonical integration-test directory under `tools/validators/tests/`) loads the migrated red-bunny fixtures + intentional negative fixtures (hand-crafted positive + negative cases per SPEC-74 §7 bootstrap/skill-level golden tests) and asserts the expected pass/fail diagnostics.
2. The fixture-world copy strategy (per Spec-Integration Ticket Shape) is NOT applicable here — the migration directly mutates red-bunny because red-bunny IS the production fixture for STCHAR profiles, and SPEC-74 §5 explicitly requires the pre-landing remediation. The capstone test loads red-bunny in-place (post-migration) and asserts validator behavior.
3. No backwards-compatibility shims. The fail-everywhere policy commits to the no-grandfathering posture.

## Verification Layers

1. **Migration applied successfully via patch engine** → patch-engine receipt: each of the 3 red-bunny STCHAR profiles has a patch-engine receipt recording the SPEC-74 attribution.
2. **All STCHAR validators PASS on migrated red-bunny fixtures** → `npm test --prefix tools/validators` runs the full validator suite (including the new 3 from SPEC74STCHARDISBOU-008 / -009 / -011 + extensions from -007 + -010) and asserts 0 STCHAR-related failures on red-bunny.
3. **Capstone integration test asserts expected pass/fail diagnostics on intentional negative fixtures** → the new test file loads hand-crafted negative fixtures (contaminated STCHAR per §4.9, empty inventory per §4.11, regenerated without reason per §4.10, stale §16a citations per §4.12) and asserts each fires the expected diagnostic id.
4. **ENGINESYNC-005 disposition recorded** → the ticket implementation explicitly documents which disposition path was taken (probe-patch confirms cleared, OR coordinated with ENGINESYNC-005 sequencing) in the ticket's implementation notes before the migration runs.
5. **Bootstrap/skill-level golden tests per SPEC-74 §7** → the capstone test exercises the bootstrap-skill golden cases: given a source CHAR with dormant stable capability not needed on root page, bootstrap STCHAR includes it in `Agency and Planning Tendencies` or `Perception and Embodiment`; given an opening seed with bruise/chase/crying/fear, generated initial records include `STSTAT`/`STEMO`/`BEL`/`THR` as appropriate, and STCHAR operational sections do not cite those record ids.

## What to Change

### 1. ENGINESYNC-005 disposition check (PRE-MIGRATION)

Before any engine-routed STCHAR mutation, verify the ENGINESYNC-005 hash-drift blocker disposition:

- **Option (a)**: probe patch — attempt a no-op patch through the engine on a red-bunny record; if the `file_versions` hash-basis mismatch fires, the blocker is still active and Option (b) applies.
- **Option (b)**: coordinate with ENGINESYNC-005 sequencing — either land ENGINESYNC-005's fix first, OR sequence this ticket's migration after ENGINESYNC-005 is resolved.

Document the chosen disposition + the evidence (probe-patch output or ENGINESYNC-005 status) in the ticket's implementation notes BEFORE the migration runs. The band-aid hand-reconciliation noted in MEMORY.md is NOT a load-bearing path.

### 2. Red-bunny STCHAR remediation pass

For each of the 3 active STCHAR profiles (`STCHAR-1.md`, `STCHAR-2.md`, `STCHAR-3.md`):

(a) Run health-audit Phase 2m (with the new findings registered by SPEC74STCHARDISBOU-012) to enumerate the structural issues each profile carries:
- `stchar_temporal_authority_contamination` → temporal-state record ids in operational sections (route current facts to state records / page plans via turn-cycle repair turn; regenerate STCHAR only if contamination is embedded in durable sections AND cannot be cleanly removed via authorized in-place repair).
- `stchar_semantic_loss_risk` → missing or malformed `Stable Source Material Inventory` (regenerate via `story-character-profile regenerate` with `regeneration_reason_class: stable_source_material_omission_repair` if stable source material was omitted and later pages would lawfully need it; if bootstrap omission was objectively wrong, regenerate).
- Body / subsection / schema-shape issue only → repair body, schema, or both in place without changing the durable model.

(b) Apply repairs via the patch engine (`mcp__worldloom__submit_patch_plan`) routing through the prescribed STCHAR-record op. Each patch carries the SPEC-74 attribution in its metadata (Rule 6 retcon attribution).

(c) Re-run the full STCHAR validator suite on each profile post-repair; confirm 0 failures before proceeding to the next profile.

### 3. Capstone integration test

**File**: `tools/validators/tests/integration/spec74-stchar-end-to-end.test.ts` (or canonical equivalent — confirm the `tools/validators/tests/integration/` directory exists at implementation time; if not, use the canonical integration-test path in the worldloom validator framework, typically a sub-directory under `tools/validators/tests/`).

Test cases:

(a) Load the migrated red-bunny STCHAR profiles. Run the full STCHAR validator suite (`stchar_body_integrity`, `stchar_source_fact_coverage`, `stchar_source_material_inventory_integrity`, `stchar_temporal_reference_boundary`, `stchar_regeneration_reason_integrity`, `stchar_supersession_integrity`, `no_char_authority_in_story_runtime`, `page_plan_stchar_packet_integrity`, etc.). Assert 0 STCHAR-related failures.

(b) Load hand-crafted negative fixtures (one per new validator + extension):
- Contaminated STCHAR (operational section cites `STEMO-1`) → assert `stchar_temporal_reference_boundary` FAILS with `<STCHAR-id> operational section '<section>' cites temporal story-state record <record-id> as durable character authority`.
- world-char STCHAR with empty inventory → assert `stchar_source_material_inventory_integrity` FAILS.
- Regenerated STCHAR with `regeneration_reason_class: null` → assert `stchar_regeneration_reason_integrity` FAILS.
- Regenerated STCHAR with `durable_branch_transformation` but no story-local evidence → assert `stchar_regeneration_reason_integrity` FAILS.
- §16a packet citing stale `BEL-2` not in `PG.state_snapshot.active_records[]` → assert `page_plan_stchar_packet_integrity` FAILS with `stale_current_state_reference`.
- §16a packet with `Current-state grounding records: none` but body cites `STPLAN-1` → assert `page_plan_stchar_packet_integrity` FAILS with `grounding_records_none_with_citations`.

(c) Bootstrap/skill-level golden tests per SPEC-74 §7:
- Given a source CHAR with a dormant stable capability not needed on root page, bootstrap STCHAR includes it in `Agency and Planning Tendencies` or `Perception and Embodiment`.
- Given an opening seed with bruise/chase/crying/fear, generated initial records include `STSTAT`/`STEMO`/`BEL`/`THR` as appropriate, and STCHAR operational sections do not cite those record ids.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md` (modify via patch engine)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md` (modify via patch engine)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md` (modify via patch engine)
- Red-bunny page-plan / prose-receipt files that cite affected STCHAR profiles in §16a packets (if any cite stale current-state references — enumerate at implementation time via `grep -r 'STCHAR-[123]' worlds/erotica-world/stories/red-bunny/pages-prose-plans/ worlds/erotica-world/stories/red-bunny/pages-prose-receipts/` — modify via patch engine if needed)
- `tools/validators/tests/integration/spec74-stchar-end-to-end.test.ts` (new — confirm canonical integration-test directory path at implementation time)

## Out of Scope

- Modifying any STCHAR profile in a bundle OTHER than red-bunny (no other bundle has STCHAR profiles on `main`).
- Reintroducing any STCHAR hash field (forbidden by SPEC-71 + `forbidden_stchar_tamper_hash_fields` validator).
- Bypassing the ENGINESYNC-005 hash-drift coordination via direct file edits (Hook 3 blocks; the band-aid hand-reconciliation is not a load-bearing path).
- Migration of any bundle that does not yet exist on `main`.

## Acceptance Criteria

### Tests That Must Pass

1. ENGINESYNC-005 disposition is documented before any engine-routed STCHAR mutation runs (probe-patch evidence or coordination-with-ENGINESYNC-005 evidence in implementation notes).
2. Each of the 3 red-bunny STCHAR profiles has a patch-engine receipt recording the SPEC-74 attribution.
3. `npm test --prefix tools/validators` PASSES with 0 STCHAR-related failures on the migrated red-bunny fixtures.
4. The capstone integration test file exists and exercises all 8 SPEC-74-introduced validator surfaces (3 new validators + 2 extended validators + 1 new schema field + 1 new body subsection + 1 health-audit Phase 2m finding set) against migrated red-bunny + intentional negative fixtures.
5. The bootstrap/skill-level golden tests per SPEC-74 §7 PASS — bootstrap correctly routes opening temporal state to STSTAT/STEMO/BEL/THR and STCHAR operational sections do not cite those record ids.

### Invariants

1. The 3 active red-bunny STCHAR profiles pass the FAIL-everywhere STCHAR validator suite post-migration.
2. Every red-bunny STCHAR repair routes through the patch engine; no direct `Edit`/`Write` calls bypass Hook 3.
3. The SPEC-74 attribution is recorded on every migrated record (Rule 6 retcon discipline).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec74-stchar-end-to-end.test.ts` (new) — exercises the full STCHAR validator suite on migrated red-bunny + intentional negative fixtures + bootstrap/skill-level golden cases.

### Commands

1. `npm test --prefix tools/validators` (confirms the full validator suite passes on red-bunny + new test cases pass)
2. `grep -r 'STCHAR-[123]' worlds/erotica-world/stories/red-bunny/pages-prose-plans/ worlds/erotica-world/stories/red-bunny/pages-prose-receipts/` (enumerates §16a packets that may need remediation alongside the STCHAR profile changes)
3. Dry-run a probe patch through `mcp__worldloom__submit_patch_plan` on a red-bunny record to confirm ENGINESYNC-005 disposition before the migration runs.
