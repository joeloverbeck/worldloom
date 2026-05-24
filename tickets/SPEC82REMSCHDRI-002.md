# SPEC82REMSCHDRI-002: Bootstrap stale-comment + Phase 6 grounding-population amendment

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` (line 166 stale-comment replacement); `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` (new grounding-population bullet).
**Deps**: None

## Problem

`.claude/skills/branching-story-bootstrap/SKILL.md:166` reads:

> Seeded SLTs may become eligible for non-player drivers when SPEC-77's `compatible_turn_drivers` field is available; this bootstrap skill does not populate that future field.

SPEC-77 landed (archived at `archive/specs/SPEC-77-slt-grounding-provenance-minimal.md`); `grounding.compatible_turn_drivers[]` is required and structurally enforced by `tools/validators/src/schemas/story-storylet.schema.json:242-269` with `additionalProperties: false`. The skill-prose comment is stale on its face — "future field" describes a field that has been required since SPEC-77 shipped.

The stale comment hides an implementation gap: a reassessment-time read of `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` (20 lines, entire file) confirms Phase 6 does NOT prescribe `grounding.compatible_turn_drivers[]` or `grounding.reason_to_exist`. Phase 6 covers seed-block creation conditional on `seed_commitment_blocks` argument, cast-role coverage, scope fields (`scope.visibility`, `scope.branch_id`, etc.), and predicate selection from the existential DSL, but skips the SPEC-77 grounding fields entirely. Without the Phase 6 amendment, every bootstrap that seeds any SLT would fail `slt_grounding_minimal_integrity` and (transitively) the Phase 10 validation gate, blocking the HARD-GATE write.

The repair has two parts that must land together for grounding-population coherence: (1) extend Phase 6's reference file with the grounding-population bullet, (2) replace the stale-future-tense SKILL.md comment with current-tense guidance. Without (1), the seed-block authoring guidance has no concrete grounding instructions; without (2), the SKILL.md prose continues to claim the field is "future" while Phase 6's authoring guidance contradicts.

## Assumption Reassessment (2026-05-24)

1. `.claude/skills/branching-story-bootstrap/SKILL.md:166` carries the stale "future field" comment — verified at grep-time during SPEC-82 reassessment. `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` does NOT prescribe `grounding.compatible_turn_drivers[]` or `grounding.reason_to_exist` — verified by reassessment-time full Read of the 20-line file. `tools/validators/src/schemas/story-storylet.schema.json:242-269` confirms `grounding` is required, with `additionalProperties: false` on the `grounding` subobject and `compatible_turn_drivers[]` + `reason_to_exist` as the two required sub-fields.
2. SPEC-82 §3.2 §Repair parts 1 + 2 prescribe the Phase 6 amendment + SKILL.md comment replacement; §3.2 §Acceptance enumerates the post-repair invariants (bootstrap end-to-end passes `slt_grounding_minimal_integrity`; stale "future field" language removed; Phase 6 amendment names FOUNDATIONS §Story Bundles §5b and cites SPEC-77 §3.4). SPEC-77 §3.4 is the canonical source for the grounding minimum: `compatible_turn_drivers[]` (closed 8-value enum) + `reason_to_exist` (≥16 chars, banned-phrase filter).
3. Cross-skill / cross-artifact boundary under audit: the bootstrap-to-commitment-block-authoring grounding contract. `branching-story-bootstrap` Phase 6 seeds the initial SLT pool; `commitment-block-authoring` extends the pool post-bootstrap. Both skills produce SLT records that must satisfy `slt_grounding_minimal_integrity`. The `commitment-block-authoring` Phase 4 already prescribes `grounding.compatible_turn_drivers[]` + `grounding.reason_to_exist` per SPEC-77; this amendment brings bootstrap Phase 6 into parity, closing the cross-skill grounding-population gap.
4. FOUNDATIONS principle under audit: §Story Bundles §5b (Schema-Minimalism). SPEC-77's two-field grounding minimum (`compatible_turn_drivers[]` + `reason_to_exist`) is the load-bearing surface §5b protects; the amendment ensures bootstrap-seeded SLTs satisfy the minimum at creation time rather than failing at Phase 10 validation. The amendment names §5b and cites SPEC-77 §3.4 directly in the Phase 6 reference, per SPEC-82 §3.2 §Acceptance.

## Architecture Check

1. The Phase 6 amendment extends the existing seed-block authoring guidance with one additional bullet covering the SPEC-77 grounding minimum — it does not restructure Phase 6's existing cast-role coverage or scope/predicate guidance. The new bullet's placement (after the "All seed blocks: `scope.visibility: global_author_pool`..." paragraph, before the "Use the existential predicates" paragraph) co-locates it with the other per-seed-block authoring requirements (scope fields, branch_id constraints) so a seed-block author encounters all the SLT-record requirements in one prose breath rather than two.
2. No backwards-compatibility shims introduced. The SKILL.md comment substitution is a direct replacement; no "for legacy bundles, the old behavior is..." escape hatch is retained. No production bundles depend on the stale comment (the stale comment described non-behavior — "this bootstrap skill does not populate that future field" — and no consumer codepath reads the comment text), so removal is clean.

## Verification Layers

1. **Invariant: bootstrap-seeded SLTs satisfy `slt_grounding_minimal_integrity`.** → skill dry-run: invoke `branching-story-bootstrap` with `seed_commitment_blocks: minimal` on a non-empty seed configuration; verify the patch-plan validates the seed SLTs pass the structural validator at Phase 10.
2. **Invariant: SKILL.md line 166 no longer contains "future field" language.** → codebase grep-proof: `grep -n "future field" .claude/skills/branching-story-bootstrap/SKILL.md` returns zero matches; `grep -n "may become eligible for non-player drivers when SPEC-77" .claude/skills/branching-story-bootstrap/SKILL.md` returns zero matches.
3. **Invariant: Phase 6 reference prescribes the SPEC-77 grounding minimum.** → codebase grep-proof: `grep -n "compatible_turn_drivers\|reason_to_exist" .claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` returns matches naming both grounding fields; the new bullet's text cites FOUNDATIONS §Story Bundles §5b and SPEC-77 §3.4.
4. **Invariant: bootstrap-to-commitment-block-authoring grounding contract is uniform.** → FOUNDATIONS alignment check: §Story Bundles §5b — both skills now prescribe the SPEC-77 grounding minimum; the Phase 6 amendment closes the prior asymmetry where Phase 6 was silent on grounding while `commitment-block-authoring` Phase 4 was explicit.

## What to Change

### 1. Extend Phase 6 reference file

In `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md`, add a new bullet between the "All seed blocks: `scope.visibility: global_author_pool`, `scope.branch_id: null`..." paragraph (line 13) and the "Use the existential predicates in the predicate DSL..." paragraph (line 15). Suggested content:

> **Grounding population per SPEC-77** (FOUNDATIONS §Story Bundles §5b, SPEC-77 §3.4): every seeded SLT must populate `grounding.compatible_turn_drivers[]` with the closed 8-value enum entries that match the block's predicate kinds and target driver kinds (`npc_action` for blocks gated by `any_plan_active` / `any_emotion_active`; `player_action` / `player_write_in` for blocks whose preconditions are player-context-only; `clock_fire` for blocks gated by `any_clock_active`; `secret_reveal` for blocks gated by `any_secret_unrevealed`; etc.) plus a non-generic `grounding.reason_to_exist` (≥16 chars, avoiding SPEC-77's banned-phrase list). `additionalProperties: false` on the grounding object structurally forbids additional fields beyond these two.

The exact wording is the implementer's choice provided it (a) names both required grounding fields, (b) describes the driver-kind selection criterion, (c) cites FOUNDATIONS §Story Bundles §5b and SPEC-77 §3.4 as the governing requirements.

### 2. Replace stale SKILL.md comment

In `.claude/skills/branching-story-bootstrap/SKILL.md`, replace line 166:

> Seeded SLTs may become eligible for non-player drivers when SPEC-77's `compatible_turn_drivers` field is available; this bootstrap skill does not populate that future field.

with:

> Seeded SLTs populate `grounding.compatible_turn_drivers[]` and `grounding.reason_to_exist` per SPEC-77 (see Phase 6 reference). The `compatible_turn_drivers[]` enum entries describe which `SE.turn_driver.kind` values the block is eligible for; pick the kinds the block's predicates structurally support.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify) — line 166 stale-comment replacement
- `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` (modify) — add new grounding-population bullet between existing paragraphs (placement: after line 13's scope paragraph, before line 15's predicates paragraph)

## Out of Scope

- Changes to `commitment-block-authoring` Phase 4. The grounding-population guidance there is already aligned with SPEC-77 and needs no parallel update.
- Backfilling grounding fields on SLT records produced by past bootstrap runs. No production story bundles exist (per the SPEC-82 iteration-2 user redirection); the prior absence of grounding-population guidance left no production data to migrate.
- Extending the grounding object beyond the SPEC-77 minimum (e.g., adding `causal_pressure_classes`, `source_records`, `role_lanes`). SPEC-77 §4 §Out of Scope explicitly cuts these fields with derivability rationale; re-adding them is out of scope for SPEC-82 and would route through a successor SPEC.
- Phase 6 changes beyond the grounding-population bullet. The existing cast-role coverage, scope-field, and predicate-selection guidance remain untouched.

## Acceptance Criteria

### Tests That Must Pass

1. `branching-story-bootstrap` end-to-end with `seed_commitment_blocks: minimal` on a non-empty seed configuration: produced SLT records pass `slt_grounding_minimal_integrity` at Phase 10 validation; the HARD-GATE write succeeds.
2. `grep -n "future field" .claude/skills/branching-story-bootstrap/SKILL.md` returns zero matches.
3. `grep -n "compatible_turn_drivers\|reason_to_exist" .claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` returns matches naming both grounding fields in the new bullet.

### Invariants

1. SKILL.md line 166 (post-edit) reads the current-tense guidance prescribed by SPEC-82 §3.2 part 2; the stale "future field" language is removed entirely.
2. Phase 6 reference file (post-edit) prescribes both `grounding.compatible_turn_drivers[]` (with driver-kind selection criterion) and `grounding.reason_to_exist` (non-generic, ≥16 chars, banned-phrase-aware) per SPEC-77 §3.4; the bullet names FOUNDATIONS §Story Bundles §5b and SPEC-77 §3.4 as governing requirements.
3. Bootstrap-seeded SLT records carry both required grounding fields at creation time; the `slt_grounding_minimal_integrity` validator passes at Phase 10 for every seeded SLT.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (greps + bootstrap skill end-to-end dry-run) and existing pipeline coverage is named in Assumption Reassessment (Phase 10 validation gate already exercises `slt_grounding_minimal_integrity` per the bootstrap HARD-GATE flow).`

### Commands

1. `grep -n "future field\|may become eligible for non-player drivers when SPEC-77" .claude/skills/branching-story-bootstrap/SKILL.md` — confirms zero matches after the line-166 replacement.
2. `grep -n "compatible_turn_drivers\|reason_to_exist\|FOUNDATIONS.*5b\|SPEC-77.*3.4" .claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` — confirms the new grounding-population bullet contains both fields plus the FOUNDATIONS and SPEC-77 citations.
3. `branching-story-bootstrap` end-to-end dry-run with `seed_commitment_blocks: minimal` on a non-empty seed configuration — verify the patch plan's seed SLTs pass `slt_grounding_minimal_integrity` at Phase 10 validation. The bootstrap skill's HARD-GATE flow exercises the validator; a successful Phase 10 pass is the full-pipeline verification boundary because there is no narrower per-helper test surface for the `slt_grounding_minimal_integrity` consumer.
