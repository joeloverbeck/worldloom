# SPEC22SCECOM-012: `story-fact-promotion-to-canon` source_kind: `arc_effect_promotion` full specification

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (and any reference files it ships with). No code changes.
**Deps**: archive/tickets/SPEC22SCECOM-001.md, 005, 006, 008

## Problem

SPEC-22 §Track 4's story-fact-promotion-to-canon deliverable adds a fifth `source_kind` enum value, `arc_effect_promotion`, with full specification: new required arguments (`source_arc_id`, `source_page_id`, `applied_variant_id`, `effect_index`); Pre-flight validation branch; Phase 1 source extraction (load arc record + page record + ARC_TRACE evidence); Phase 2 CF candidate translation per effect-type; Phase 4 mystery-firewall handling against `execution_envelope.mystery_preservation.forbidden_resolutions[]`; Phase 10 superseding-record shape (SF/SREL/STENT superseder with `promoted_to_cf` annotation + per-record provenance fields); proposal_package extension fields. The HARD-GATE handoff to canon-addition is preserved — `arc_effect_promotion` is the only new lawful story→world promotion route under v2.

## Assumption Reassessment (2026-05-08)

1. `.claude/skills/story-fact-promotion-to-canon/SKILL.md` exists. `source_kind` enum currently has 4 values: `story_fact`, `mystery_resolution`, `character_arc_outcome`, `artifact_canonization` (verified at SPEC-22 reassessment via SKILL.md frontmatter argument).
2. SP-NNNN proposal_package shape carries 13 fields (verified at reassessment): `promotion_id`, `source_kind`, `source_record`, `promotion_branch_path`, `cf_candidate`, `provenance`, `scope_inflation_check`, `mystery_firewall`, `downstream_impact`, `rule_12_two_trace_check`, `contradiction_handling_preference`, `cross_story_impact_scan_performed`, `execution_mode`, `content_policy`. The new source_kind extends with 5 additional fields: `source_arc_id`, `applied_variant_id`, `effect_index`, `arc_trace_id`, `arc_trace_evidence_span`.
3. Phase 1 / Phase 2 / Phase 4 / Phase 10 numbering matches the spec's references (verified).
4. **Cross-skill boundary under audit**: promotion consumes (a) MCP retrieval (008) — Pre-flight uses `get_record(source_arc_id)`, `get_record(source_page_id)`, `get_record(arc_trace_id)`; (b) canonical-vocabularies (006) — Phase 2 CF candidate translation cites the closed effect-type enum from archived SPEC-19 §A; (c) v2 validators (005) — `arc_envelope_conformance` semantics inform Phase 4 mystery-firewall handling; (d) patch-engine op (archive/tickets/SPEC22SCECOM-001.md) — Phase 10 superseding-record submission routes through `submit_patch_plan`. The HARD-GATE handoff to canon-addition is the only world-canon mutation path; this ticket does NOT bypass canon-addition.
5. **FOUNDATIONS Rule 6 (No Silent Retcons)** restated: every promotion of a story-local fact / arc-effect into world canon must produce a CH-NNNN entry through canon-addition; promotion ledger SP-NNNN + proposal-package sidecar preserve the attribution chain story-side; canon-addition produces the world-canon CH entry.
6. **FOUNDATIONS Rule 7 (Preserve Mystery Deliberately)** restated: Phase 4 mystery-firewall handling for `arc_effect_promotion` checks the arc's `execution_envelope.mystery_preservation.forbidden_resolutions[]` against the world's whole-class M load. If the arc's envelope omits a `forbidden`-status M id that the proposed CF could touch, HARD-REJECT. For arc effects whose CF candidate would resolve a non-forbidden M, route via `source_kind: mystery_resolution` instead (Pre-flight HARD-REJECT for mystery_progress effects).
7. **HARD-GATE / canon-write ordering preserved**: this skill writes only story-side records (SP ledger, superseding SF/SREL/STENT records via patch-engine ops) and hands off the proposal package to canon-addition; canon-addition's HARD-GATE governs the actual CF/CH/PA write.
8. **Schema extension is additive** — new `source_kind` value; existing 4 values preserved. Proposal_package schema gains 5 new fields when `source_kind: arc_effect_promotion`; existing schema for the 4 prior source_kinds is unchanged.

## Architecture Check

1. Cohesive single-skill update — all promotion path additions for `arc_effect_promotion` land together (Pre-flight + Phase 1 + Phase 2 + Phase 4 + Phase 10 + proposal_package extension). Splitting per-phase would risk inconsistency windows.
2. `arc_effect_promotion` follows the same skill-level architecture as the existing 4 source_kinds (canon-addition handoff via HARD-GATE; SP ledger + sidecar; mystery firewall; superseding-record discipline) — no new architectural shape.
3. No backwards-compatibility aliasing — the 4 existing source_kinds are preserved; `arc_effect_promotion` is a parallel addition.

## Verification Layers

1. `source_kind` enum frontmatter argument has 5 values → grep SKILL.md frontmatter for `arc_effect_promotion`.
2. New required arguments documented (Pre-flight section): `source_arc_id`, `source_page_id`, `applied_variant_id`, `effect_index` → grep SKILL.md.
3. Phase 1 source extraction branch loads arc + page + variant + ARC_TRACE → manual review of Phase 1 prose.
4. Phase 2 CF candidate translation per effect-type (10 effect types) — explicit handling for each: `fact_create`, `relationship_axis_shift`, `thread_pressure_delta`, `obligation_status_change`, `consequence_open`, `consequence_address`, `cast_change`, `location_change`, `mystery_progress`, `fact_invalidate` → manual review.
5. Phase 4 mystery-firewall for `arc_effect_promotion` HARD-REJECTs when arc envelope omits forbidden-M coverage → manual review of Phase 4 prose.
6. Phase 10 superseding-record shape includes `promoted_to_cf` + `promoted_via_arc` + `promoted_via_variant` + `promoted_via_effect_index` annotations → manual review.
7. Proposal_package extension fields documented (5 new fields when `source_kind: arc_effect_promotion`) → manual review.
8. FOUNDATIONS Rule 6 + Rule 7 alignment: HARD-GATE handoff preserved; mystery-firewall enforced.

## What to Change

### 1. Extend `source_kind` enum

In SKILL.md frontmatter `arguments` block for `source_kind`: add `arc_effect_promotion` to the closed enum.

### 2. New required arguments (Pre-flight)

In SKILL.md Pre-flight section: when `source_kind == arc_effect_promotion`, require:

- `source_arc_id`: SLT-NNNN whose `effect_model.variants[]` contains the variant being promoted. Arc must be present in the bundle's storylet pool.
- `source_page_id`: PG-NNNN whose `state_snapshot.applied_effect_variant` refers to the variant; page's `storylet_realized` must match `source_arc_id`.
- `applied_variant_id`: variant id from `arc.effect_model.variants[]`; must equal page's `state_snapshot.applied_effect_variant`.
- `effect_index`: 0-based index identifying which `required_effects[N]` is the promotion target. Required when variants have multiple effects; defaults to 0 when only one entry.

### 3. Pre-flight validation branch

For `source_kind: arc_effect_promotion`: validate arc YAML exists, has `record_version: 2` and `shape: scene_commitment_arc`; validate page YAML exists, `storylet_realized == source_arc_id`, `state_snapshot.applied_effect_variant == applied_variant_id`; validate `applied_variant_id` exists in arc's `effect_model.variants[].id`; validate `effect_index` is in-range.

### 4. Phase 1 source extraction (`arc_effect_promotion` branch)

Load: arc record (including `arc_contract`, `dramatic_unit`, `effect_model.variants[<applied_variant_id>]`, specific `required_effects[<effect_index>]`); page record (state_snapshot for post-application story state, applied_event_ops SE record); rendered prose `pages-prose/PG-<source_page_id>.md` (supporting prose excerpt for proposal_package); ARC_TRACE record if present (per `state_snapshot.arc_trace_id`) — capture `effect_evidence[<effect_index>]` for the proposal_package's evidence_span citation. Walk arc preconditions + `dramatic_unit.entry_pressure` along branch_path.

### 5. Phase 2 CF candidate translation (`arc_effect_promotion` branch)

Per-effect-type translation logic:

- `fact_create` → CF candidate's `statement` derives from fact's subject/predicate/object form; `type` per fact's category; scope per `known_by` + arc's `commitment_scope`; `truth_scope.diegetic_status` per fact's `epistemic_class`; `domains_affected` requires Phase-2-LLM enumeration.
- `relationship_axis_shift` → CF candidate is typically `type: belief` or `type: institution` describing relationship-axis state at world-canon scale.
- `thread_pressure_delta` → typically NOT directly promotable (story-local by design); structured warning recommending re-route as `character_arc_outcome` or `story_fact`.
- `obligation_status_change` → typically NOT directly promotable; same warning.
- `consequence_open` / `consequence_address` → typically NOT directly promotable; same warning.
- `cast_change` / `location_change` → may be promotable when world-canon implications exist; Phase 2 LLM produces CF candidate framing the change with appropriate scope.
- `mystery_progress` → routes via `source_kind: mystery_resolution` instead, NOT `arc_effect_promotion`. Pre-flight HARD-REJECTs with explicit re-route guidance.
- `fact_invalidate` → typically promotable when invalidation has world-canon scope; Phase 2 LLM produces CF candidate framing the invalidation.

Translation respects the same Phase 2 laundering firewall as existing source_kinds — `source_basis.derived_from` carries CF parent ids only; promotion provenance flows through SP+CH+PA.

### 6. Phase 4 mystery-firewall (`arc_effect_promotion` branch)

Check arc's `execution_envelope.mystery_preservation.forbidden_resolutions[]` against world's whole-class M load. If arc envelope omits a `forbidden`-status M id that the proposed CF could touch, HARD-REJECT with: "arc envelope does not include forbidden M-NNNN; arc-effect promotion cannot proceed without explicit envelope coverage."

### 7. Phase 10 superseding-record shape (`arc_effect_promotion` branch)

Supersession unit is the arc-effect-derived SF (or SREL for relationship_axis_shift, STENT for cast_change) record:

```yaml
id: SF-<new-id>
story_id: STORY-NNNN
logical_id: <original SF logical_id>
supersedes: <original SF id>
created_at_page: <source_page_id>
promoted_to_cf: CF-NNNN
promoted_via_arc: SLT-<source_arc_id>
promoted_via_variant: <applied_variant_id>
promoted_via_effect_index: <effect_index>
# all other fields inherited from original SF
```

For non-SF source effects (relationship_axis_shift / cast_change), the supersession is the corresponding record class; `promoted_to_cf` / `promoted_via_*` fields are added uniformly across record classes.

### 8. Proposal_package extension fields

Add 5 new fields to the proposal_package schema (when `source_kind == arc_effect_promotion`):

- `source_arc_id`: SLT-NNNN
- `applied_variant_id`: variant id
- `effect_index`: integer
- `arc_trace_id`: ARCTRACE-NNNN if trace was emitted; null otherwise
- `arc_trace_evidence_span`: when arc_trace_id non-null, the `effect_evidence[<effect_index>].evidence_span` `{start, end}` byte offsets

`provenance.supporting_pages` carries `[source_page_id]` (one page); `provenance.supporting_prose_excerpts` carries the rendered arc page's prose; `provenance.source_record` carries `{source_arc_id, applied_variant_id, effect_index}` instead of a single record id.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — frontmatter source_kind enum + Pre-flight argument list + Pre-flight validation branch + Phase 1/2/4/10 prose + proposal_package extension)

## Out of Scope

- Bootstrap alignment (in 010)
- Health-audit alignment (in 011)
- Page-cycle record-schemas (in 013)
- Migration (in 014)
- Validators (in 003/004/005)
- Canonical vocabularies (in 006)
- MCP retrieval extension (in 008)
- Patch-engine op (in 001)
- canon-addition's CF/CH/PA write logic — owned by canon-addition (existing); this skill only hands off the proposal package
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `source_kind` enum has 5 values (4 existing + `arc_effect_promotion`) → grep SKILL.md frontmatter.
2. New required arguments documented for `arc_effect_promotion`: `source_arc_id`, `source_page_id`, `applied_variant_id`, `effect_index`.
3. Pre-flight validation branch documented (arc + page + variant + effect_index existence checks).
4. Phase 1 source extraction branch loads arc + page + variant + ARC_TRACE evidence.
5. Phase 2 CF candidate translation has explicit per-effect-type handling for all 10 effect types (per archived SPEC-19 §A).
6. Phase 4 mystery-firewall handles `arc_effect_promotion` against `execution_envelope.mystery_preservation.forbidden_resolutions[]`.
7. Phase 10 superseding-record shape includes 4 promotion-attribution fields.
8. Proposal_package documents 5 new fields when `source_kind: arc_effect_promotion`.
9. HARD-GATE handoff to canon-addition is preserved (no new world-canon write path).

### Invariants

1. story-fact-promotion-to-canon remains the only lawful story→world canon mutation path; canon-addition is the only authority for CF/CH/PA writes.
2. FOUNDATIONS Rule 6 (No Silent Retcons): every `arc_effect_promotion` produces a CH entry through canon-addition's standard discipline.
3. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately): arc envelope's `mystery_preservation.forbidden_resolutions[]` audit blocks promotions that would touch unmodeled forbidden mysteries.
4. The 4 existing source_kinds are preserved unchanged; `arc_effect_promotion` is parallel addition.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'arc_effect_promotion' .claude/skills/story-fact-promotion-to-canon/SKILL.md`
2. `grep -nE 'source_arc_id|applied_variant_id|effect_index|arc_trace_evidence_span' .claude/skills/story-fact-promotion-to-canon/SKILL.md`
3. `grep -nE 'promoted_via_arc|promoted_via_variant|promoted_via_effect_index' .claude/skills/story-fact-promotion-to-canon/SKILL.md`
4. Manual review of Phase 1/2/4/10 branches against SPEC-22 §Track 4 prose.
