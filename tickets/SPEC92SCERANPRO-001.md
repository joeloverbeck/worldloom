# SPEC92SCERANPRO-001: SCN record contract amendments (shared-templates)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — amends `.claude/skills/_shared-templates/story-record-schemas.md` and `story-state-contract.md`; no executable code. Foundational — defines the SCN record canonically before the JSON schema (SPEC92SCERANPRO-002) implements it.
**Deps**: None

## Problem

SPEC-92 introduces a new story-bundle record class `SCN` (scene / render-unit membership) plus a renderer-facing scene-plan structure. The shared story-state contract is authoritative for story-bundle record schemas — "skills must not add fields to those schemas without amending the contract first" (FOUNDATIONS §Story Bundles §5b). Before any JSON schema, patch op, validator, or skill can reference `SCN`, the contract must define it: the SCN field list, the scene-prose-receipt fields, and the renderer-facing scene-plan structure (the scene-scope analogue of the page-plan §8 structure).

## Assumption Reassessment (2026-05-28)

1. `.claude/skills/_shared-templates/story-record-schemas.md` and `story-state-contract.md` both exist at HEAD (verified `test -f`). story-record-schemas.md hosts per-class field lists; story-state-contract.md §7 hosts the nine hard gates and §8 the page-plan section enumeration.
2. SPEC-92 §3 (SCN schema), §5 (scene-plan structure), §6 (validation) define the contract content. The SCN field set is post-reassessment: the `/reassess-spec` pass dropped `render_kind` and `source_pg_fingerprint` per §5b — do NOT reintroduce them.
3. Cross-artifact boundary under audit: the shared-templates contract is consumed by the validators package (SPEC92SCERANPRO-002 JSON schemas must match this field list), the patch engine (-003), and the two new skills (-008 / -009). This ticket is the single authoritative source those consumers mirror.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates this ticket: every SCN field must be load-bearing — consumed by the index (membership/edges), a validator (contiguity / choice-surface), or scene attach. The contract must carry no nice-to-have fields; the reassessment already removed `render_kind` (no consumer) and `source_pg_fingerprint` (advisory; freshness moved to the receipt).

## Architecture Check

1. Contract-first lands the authoritative SCN definition before machine enforcement, so the JSON schema (-002) and the skills (-008 / -009) mirror one source rather than drift. This matches how every existing story-bundle class (PG, SLT) is defined in the contract first.
2. No backwards-compatibility shims: SCN is a net-new class; the scene-plan structure section is added alongside (not replacing) the page-plan §8 — additive, since page plans coexist until SPEC-93.

## Verification Layers

1. SCN field list matches SPEC-92 §3 (no render_kind / source_pg_fingerprint) -> manual review + grep-proof (`grep -n "render_kind\|source_pg_fingerprint"` returns zero).
2. Scene-plan structure section present with the §2/§3/§render-time verbatim-inline note -> grep-proof.
3. Every SCN field annotated with its load-bearing consumer (§5b) -> manual review against the field list.

## What to Change

### 1. story-record-schemas.md — add the SCN record schema

Add a subsection defining `SCN`: `id`, `story_id`, `branch_id`, `status` (`planned | rendered | attached`), `pg_ids` (ordered, contiguous along one `branch_path`), `start_page_id`, `end_page_id`, `previous_scene_id` (null for SCN-1), `choice_surface_page_id`, `emitted_choice_ids`, `title`, `slug`, `scene_descriptor` (descriptive-of-committed-beats, never future-prescriptive), `boundary_rationale`, `prose_plan_path`, `prose_path`, `receipt_path`. Annotate each field's consumer per §5b. Add the scene-prose-receipt field set: included PG ids + their `state_hash`es at attach (advisory freshness) + the `scene_range_*` check results.

### 2. story-state-contract.md — add the renderer-facing scene-plan structure + scene-scope rules

Add a scene-plan structure section (the scene analogue of §8): the renderer-clean section list (Content Policy / Prose Craft Contract / Render Mission / What Changes / Where Begins-Ends / Beat Chain / POV-Observer Firewall / Cast & Voice / Throughlines / Choice Surface / Render-Time Instruction), the zero-ID / zero-hash / zero-validator / zero-lifecycle body rule, and the §2/§3/§render-time verbatim-inline-once-per-scene note. Add a scene-scope validation-rules note and a nine-gate note that scene attach is a downstream non-authoritative pass (like prose-attach), not a tenth gate.

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
