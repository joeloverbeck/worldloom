# SPEC92SCERANPRO-001: SCN record contract amendments (shared-templates)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — amends `.claude/skills/_shared-templates/story-record-schemas.md` and `story-state-contract.md`; no executable code. Foundational — defines the SCN record canonically before the JSON schema (SPEC92SCERANPRO-002) implements it.
**Deps**: None

## Problem

Before this ticket, SPEC-92 had introduced a new story-bundle record class `SCN` (scene / render-unit membership) plus a renderer-facing scene-plan structure, but the shared story-state contract did not define that record class. The shared story-state contract is authoritative for story-bundle record schemas — "skills must not add fields to those schemas without amending the contract first" (FOUNDATIONS §Story Bundles §5b). This ticket defines the SCN field list, the scene-prose-receipt fields, and the renderer-facing scene-plan structure before any JSON schema, patch op, validator, or skill consumes them.

## Assumption Reassessment (2026-05-28)

1. `.claude/skills/_shared-templates/story-record-schemas.md` and `story-state-contract.md` both exist. `story-record-schemas.md` now hosts the `SCN` field list as §4.5.20 and the scene-prose receipt as §4.7; `story-state-contract.md` now lists `SCN` in the record inventory and adds §8a for scene-plan structure.
2. SPEC-92 §3 (SCN schema), §5 (scene-plan structure), §6 (validation) define the contract content. The SCN field set is post-reassessment: the `/reassess-spec` pass dropped `render_kind` and `source_pg_fingerprint` per §5b — do NOT reintroduce them. Outcome amended 2026-05-28: SPEC92SCERANPRO-003 added optional `supersedes: SCN-* | null` as the load-bearing append-only lifecycle field needed for SCN range/status supersession.
3. Cross-artifact boundary under audit: the shared-templates contract is consumed by the validators package (SPEC92SCERANPRO-002 JSON schemas must match this field list), the patch engine (-003), and the two new skills (-008 / -009). This ticket is the single authoritative source those consumers mirror.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates this ticket: every SCN field must be load-bearing — consumed by the index (membership/edges), a validator (contiguity / choice-surface), or scene attach. The contract must carry no nice-to-have fields; the reassessment already removed `render_kind` (no consumer) and `source_pg_fingerprint` (advisory; freshness moved to the receipt).

## Architecture Check

1. Contract-first lands the authoritative SCN definition before machine enforcement, so the JSON schema (-002) and the skills (-008 / -009) mirror one source rather than drift. This matches how every existing story-bundle class (PG, SLT) is defined in the contract first.
2. No backwards-compatibility shims: SCN is a net-new class; the scene-plan structure section is added alongside (not replacing) the page-plan §8 — additive, since page plans coexist until SPEC-93.

## Verification Layers

1. SCN field list matches SPEC-92 §3 (no render_kind / source_pg_fingerprint) -> manual review + grep-proof (`grep -n "render_kind\|source_pg_fingerprint"` returns zero).
2. Scene-plan structure section present with the §2/§3/§render-time verbatim-inline note -> grep-proof.
3. Every SCN field annotated with its load-bearing consumer (§5b) -> manual review against the field list.

## Landed Changes

### 1. story-record-schemas.md — SCN record schema added

Added §4.5.20 defining `SCN`: `id`, `story_id`, `branch_id`, `status` (`planned | rendered | attached`), `pg_ids`, `start_page_id`, `end_page_id`, `previous_scene_id`, `choice_surface_page_id`, `emitted_choice_ids`, `title`, `slug`, `scene_descriptor`, `boundary_rationale`, `prose_plan_path`, `prose_path`, and `receipt_path`. Each field is annotated with its load-bearing consumer. Added §4.7 for the scene-prose-receipt field set: included PG ids + their `state_hash`es at attach, advisory freshness semantics, and the scene-range content checks.

Outcome amended: 2026-05-28

SPEC92SCERANPRO-003 added optional `supersedes: SCN-* | null` to the live shared template as the lifecycle field required by the patch-engine `supersede_scn_record` op. This preserves the no-`render_kind` / no-`source_pg_fingerprint` decision while making the already-intended append-only range/status supersession schema-valid.

### 2. story-state-contract.md — scene-plan structure + scene-scope rules added

Added `SCN` to the record inventory, updated the §4 schema pointer to 22 record classes plus the scene receipt, and added §8a `Scene-Plan Minimum Contract`. The section records the renderer-clean scene-plan section list, the zero-ID / zero-hash / zero-validator / zero-lifecycle body rule, the §2/§3/Render-Time verbatim-inline-once-per-scene note, scene-scope validation rules, and the note that scene attach is downstream/non-authoritative like prose-attach rather than a tenth page-plan gate.

## Files to Touch

- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- The JSON schema files (SPEC92SCERANPRO-002).
- Any validator, patch op, or skill (-003 through -011).
- FOUNDATIONS amendments (-010).
- Removing or altering the page-plan §8 structure (additive only; SPEC-93 handles removal).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "SCN" .claude/skills/_shared-templates/story-record-schemas.md` shows the SCN field list present.
2. `grep -n "render_kind\|source_pg_fingerprint" .claude/skills/_shared-templates/story-record-schemas.md` returns zero (reassessment removals honored).
3. story-state-contract.md scene-plan structure section present with the verbatim-inline note.

### Invariants

1. Every SCN field in the contract names a load-bearing consumer (§5b).
2. The scene-plan structure is additive — the page-plan §8 enumeration is unchanged.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based, and the JSON-schema parity check lands in SPEC92SCERANPRO-002 (whose schema must match this contract).`

### Commands

1. `grep -n "render_kind\|source_pg_fingerprint" .claude/skills/_shared-templates/story-record-schemas.md` (expect zero)
2. `grep -n "scene_descriptor\|boundary_rationale\|choice_surface_page_id" .claude/skills/_shared-templates/story-record-schemas.md` (expect the SCN field list)

## Outcome

Completed: 2026-05-28

The shared contract now defines the SCN render-unit membership record before downstream schema, patch-engine, validator, and skill tickets consume it. The schema template also defines the scene-prose receipt, including advisory `state_hash_at_attach` freshness and range-walk checks. The main story-state contract now includes the scene render layer in the authority model, lists `SCN` in the record inventory, points §4 to the new schema entries, and adds §8a with the scene-plan minimum contract.

## Verification Result

1. `grep -n "render_kind\|source_pg_fingerprint" .claude/skills/_shared-templates/story-record-schemas.md` returned no matches, confirming the reassessment removals were not reintroduced.
2. `grep -n "scene_descriptor\|boundary_rationale\|choice_surface_page_id" .claude/skills/_shared-templates/story-record-schemas.md` found the SCN field list and receipt linkage references.
3. `grep -n "Scene-Plan Minimum Contract\|scene-prose-receipts\|Render-Time Instruction" .claude/skills/_shared-templates/story-state-contract.md` found §8a and the verbatim scene-plan contract.
4. Manual review confirmed every SCN field names a load-bearing consumer and the existing page-plan §8 content remains present.

## Deviations

No implementation deviations. The landed contract also updated the record-class count and main-contract inventory to keep the new SCN schema discoverable from the main shared contract.
