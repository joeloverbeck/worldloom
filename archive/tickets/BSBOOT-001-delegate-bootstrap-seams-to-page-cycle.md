# BSBOOT-001: Refactor branching-story-bootstrap to delegate Phase 7 SE schema and Phase 8 choice generation to branching-story-page-cycle

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/SKILL.md` (Phase 7 + Phase 8 + templates/story-records.yaml PG/SE/CHC sections + Guardrails seam-removal) and `.claude/skills/branching-story-page-cycle/SKILL.md` (same-seam stale BSBOOT debt note removal)
**Deps**: branching-story-page-cycle skill must exist (this ticket is filed at the same time as the skill ships, so this dep is satisfied once branching-story-page-cycle lands)

## Problem

At intake, `branching-story-bootstrap` was created before `branching-story-page-cycle` shipped. As a result, two phases of the bootstrap inlined minimal schemas marked with explicit "seam" annotations in the prose:

- **Phase 7 §Emit SE-0001 bootstrap event** — inlined a minimal SE schema with `# Seam: refactor when branching-story-page-cycle defines the production op vocabulary`. The actual `op_type` enum, `deterministic_payload` structure, `state_hash_before/after` semantics, and `preconditions_checked` block were not present in the bootstrap's inline shape.
- **Phase 8 Initial Choice Generation** — inlined a minimal CHC schema and a minimal choice-generation procedure (4-6 CHCs covering main-thread / relationship / OBL / less-obvious / diversification slots). The actual Amendment B Pipeline (affordance space collection → salient-affordance shortlist + LLM proposer → engine validation → diversification + scoring → surface-label rendering by LLM → write-in slot N+1) and the full `choice_contract` block (user_intent, guaranteed_action, success_policy, allowed_outcome_band, forbidden_outcomes, minimum_state_change) were not present in the bootstrap's inline shape.

The bootstrap's `templates/story-records.yaml` SE and CHC sections similarly contained minimal placeholder schemas with seam markers. Reassessment also found the PG template needed same-seam parity work because the ticket's invariant explicitly requires PG-0001 compatibility with page-cycle PG records.

Now that `branching-story-page-cycle` ships and is the production authority for PG/SE/CHC schemas, the bootstrap delegates to those production schemas (use them at PG-0001 / SE-0001 / initial CHC emission) so that:

1. The bootstrap's PG-0001 / SE-0001 / initial CHCs are byte-for-byte schema-compatible with what the page-cycle produces on subsequent turns. A consumer of the bundle (the page-cycle itself, or `branching-story-health-audit`, or any future tooling) sees a uniform record shape regardless of whether a record was bootstrap-emitted or page-cycle-emitted.
2. Schema drift between the two skills is reduced by making the page-cycle the named authority for SE / CHC / PG schemas; the bootstrap consumes that contract and keeps worked genesis examples aligned to it.
3. The "seam" annotations in the bootstrap's prose can be removed, simplifying the bootstrap's surface. Future page-cycle schema changes still need an explicit same-seam parity sweep of bootstrap examples unless a later ticket extracts a mechanical shared schema source.

## Assumption Reassessment (2026-05-02)

1. The seam annotations in `branching-story-bootstrap/SKILL.md` Phase 7 and Phase 8 were explicit before implementation. Post-implementation, `grep -n "Seam:" .claude/skills/branching-story-bootstrap/SKILL.md` returns only the Phase 6 `storylet-pool-authoring` seam at line 364.
2. The branching-story-page-cycle skill at `.claude/skills/branching-story-page-cycle/SKILL.md` is the production authority for PG / SE / CHC schemas. The live authority sections are §Record Schemas §Page Record, §Story Event Record, and §Choice Record plus Phase 8 step 5 for the detailed CHC block.
3. The shared boundary under audit is the SE / CHC / PG schema contract between the two skills. The bootstrap is the consumer; the page-cycle is the producer/authority. The boundary lives in three artifacts: (a) `branching-story-page-cycle/SKILL.md` §Record Schemas (inline), (b) `branching-story-bootstrap/SKILL.md` Phase 7 + Phase 8, and (c) `branching-story-bootstrap/templates/story-records.yaml`.
4. **FOUNDATIONS principle**: No FOUNDATIONS rule directly motivates this ticket. The motivation is operational: per the proposal's Shape (a) inline-with-seams discipline (per the gap-filler interview's §Future-sibling parity gap), the bootstrap inlined minimal seams pending page-cycle's production authority shipping. With page-cycle shipped, the seams can close.
5. This ticket does NOT touch HARD-GATE semantics. The bootstrap's HARD-GATE remains as-is. The page-cycle's per-mode HARD-GATE policy is independent (the bootstrap is always invoked in `authoring` mode regardless of the bundle's `execution_mode_default`, because bootstrap is itself an authoring act).
6. This ticket extends the bootstrap's PG-0001 / SE-0001 / initial-CHC schemas to match the page-cycle's production schemas with bootstrap-appropriate genesis values. `SE-0001.ops: []` remains valid because no event ops fire at genesis; `state_hash_before: null` remains valid because there is no parent; `state_hash_after` points at `PG-0001.state_hash`.
7. No skill is renamed or removed. The bootstrap's existing `branching-story-bootstrap/templates/story-records.yaml` PG, SE, and CHC documents were extended/additively aligned to the page-cycle schema.
8. Same-seam widening: the draft `Files to Touch` named only SE/CHC template sections, but the ticket's own invariant included PG-0001. The PG template and Phase 7 PG emission prose were absorbed into this ticket so the claimed PG/SE/CHC parity is truthful.
9. Same-seam producer cleanup: `.claude/skills/branching-story-page-cycle/SKILL.md` still listed `tickets/BSBOOT-001` as known integration debt. That note became stale once this ticket landed, so the debt bullet was removed. Active sibling tickets `MCPENH-011` and `MCPENH-012` remain untouched and still own allocator/profile integration.

## Architecture Check

1. Single authority (page-cycle is the runtime authority for PG/SE/CHC) is cleaner than two peer sources because schema drift is the failure mode this ticket reduces. The bootstrap keeps genesis examples for operator clarity, but those examples are subordinate to the page-cycle authority and must be parity-swept when that authority changes.
2. No backwards-compatibility shims: the bootstrap's existing PG-0001 / SE-0001 / CHC records on already-bootstrapped bundles continue to validate (the schema is additive — fields are added or aligned, none removed). New bootstraps emit the page-cycle-aligned schema. If a maintainer wants to re-emit existing PG-0001 records under the new schema, that's a separate one-time migration concern, not in scope here.

## Verification Layers

1. **Schema-comparison check** — manual review of `branching-story-page-cycle/SKILL.md` §Record Schemas / Phase 8 step 5 against `branching-story-bootstrap/templates/story-records.yaml` confirmed the bootstrap PG/SE/CHC example documents now carry the production field set, with genesis-specific values for root/null state.
2. **Bootstrap template inspection** — `story-records.yaml` now includes PG `write_in_*`, obligation status arrays, `governor_nudge_applied`, and `validation_trace`; SE `source`, `actor/action/target/instrument`, `preconditions_checked`, `ops`, and `state_hash_before/after`; CHC `operation`, `actor`, `target`, `uses_fact`, `choice_contract`, `likely_effects`, `choice_mode`, `poetic_effect`, `content_intensity_implied`, and `label`.
3. **Seam-removal grep** — post-refactor, `grep -n "Seam:" .claude/skills/branching-story-bootstrap/SKILL.md` returns only the Phase 6 `storylet-pool-authoring` seam. Phase 6 closure is separate forward work.
4. **Producer stale-anchor sweep** — `rg -n "BSBOOT-001|bootstrap inlines minimal seams|SE-0001 inline minimal schema|initial choice generation"` over the page-cycle skill no longer returns the old debt note.

## What to Change

### 1. Phase 7 PG-0001 / SE-0001 emission

Landed: Phase 7 now describes PG-0001 as a page-cycle-compatible Page Record, citing `branching-story-page-cycle` §Record Schemas §Page Record as the runtime authority and naming the root-page values for `write_in_used`, `write_in_routing`, expanded obligation arrays, `governor_nudge_applied`, and `validation_trace`.

Landed: the inline minimal SE schema was replaced with the page-cycle's production SE schema, citing `branching-story-page-cycle` §Record Schemas §Story Event Record. For SE-0001 specifically:

- `id: SE-0001`
- `story_id: STORY-NNN`
- `branch_id: BR-0001`
- `created_at_page: PG-0001`
- `source.parent_page_id: null` (no parent at genesis)
- `source.chosen_choice_id: null` (no prior choice)
- `source.write_in_text_hash: null`
- `source.storylet_realized: <selected SLT id>`
- `actor: system` (genesis is system-emitted, not character-emitted)
- `action: bootstrap`
- `target: null`
- `instrument: null`
- `preconditions_checked: []` (no preconditions for genesis)
- `ops: []` (no event ops fire at genesis — PG-0001's state_snapshot is the bedrock, not a delta)
- `state_hash_before: null`
- `state_hash_after: <PG-0001.state_hash>`
- `notes: "Genesis event for STORY-NNN — bootstrap emission, no preceding state."`

The Phase 7 SE seam comment was removed.

### 2. Phase 8 Initial Choice Generation

Landed: the inline minimal procedure was replaced with delegation to the page-cycle's Phase 8 (Amendment B Pipeline). The bootstrap's Phase 8 cites the page-cycle's Phase 8 by section reference and applies the same six-step pipeline (affordance space collection -> shortlist + proposer -> validation -> diversification + scoring -> label rendering -> write-in slot) to the genesis state.

Each emitted CHC carries the full `choice_contract` block per the page-cycle's CHC schema. The diversification floor (≥3 distinct choice_modes, ≥3 distinct poetic_effects, ≥60% open high-salience OBLs) applies.

The Phase 8 seam comment was removed.

### 3. `templates/story-records.yaml` PG, SE, and CHC sections

Landed: the PG document now matches the page-cycle Page Record field set with bootstrap-root values. The SE document now matches the page-cycle Story Event Record field set with example values reflecting SE-0001 genesis. The CHC document now matches the page-cycle Phase 8 step 5 CHC schema including the `choice_contract` block.

The SE seam annotation in this template was removed.

### 4. Guardrails seam-disclosure removal

Landed: `branching-story-bootstrap/SKILL.md` §Guardrails now lists `branching-story-page-cycle` as an existing schema-contract consumer/producer relationship, not a future seam. The entries for `storylet-pool-authoring`, `story-fact-promotion-to-canon`, and `branching-story-health-audit` remain future-sibling disclosures.

### 5. Producer debt-note cleanup

Landed: `.claude/skills/branching-story-page-cycle/SKILL.md` no longer lists BSBOOT-001 as known integration debt.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify; same-seam stale debt note only)
- `tickets/BSBOOT-001-delegate-bootstrap-seams-to-page-cycle.md` (modify)

## Out of Scope

- Phase 6 storylet-pool seed delegation to `storylet-pool-authoring` — that sibling does not exist yet; separate forward work.
- Changing `branching-story-page-cycle` behavior, schemas, or HARD-GATE policy — the page-cycle remains the authority; this ticket only removed its stale BSBOOT debt note.
- Migrating existing bootstrapped bundles' PG-0001 / SE-0001 / CHC records to the new schema — additive-only; existing records remain valid.
- Hook 3 namespace extension or patch-engine ops for story-bundle classes (separate forward tickets per Shape A integration posture).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Seam:" .claude/skills/branching-story-bootstrap/SKILL.md` returns only Phase 6 (storylet-pool-authoring) seam — Phase 7 and Phase 8 seams are gone.
2. Manual schema review confirms bootstrap PG-0001, SE-0001, and CHC templates carry the page-cycle production field sets, with genesis-specific values where the root page has no parent or prior choice.
3. `rg -n "inline minimal SE schema|inline minimal choice generation|BSBOOT-001|bootstrap inlines minimal seams" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns no stale live-skill hits for the closed seam.
4. `git diff --check` passes.

### Invariants

1. PG-0001 / SE-0001 / initial-CHC records are byte-for-byte schema-compatible with subsequent page-cycle-emitted PG-NNNN / SE-NNNN / CHC-NNNN records — a downstream consumer (page-cycle, audit, future tooling) does not need to special-case bootstrap-emitted records.
2. The page-cycle is the runtime authority for SE / CHC / PG schemas. Schema changes happen in the page-cycle's SKILL.md and require a same-seam parity sweep of the bootstrap's worked genesis examples.

## Test Plan

### New/Modified Tests

1. `None — documentation-only / skill-contract ticket; verification is command-based and manual-review-based because these skills are prose workflows, not executable runners.`

### Commands

1. `grep -n "Seam:" .claude/skills/branching-story-bootstrap/SKILL.md`
2. `rg -n "inline minimal SE schema|inline minimal choice generation|BSBOOT-001|bootstrap inlines minimal seams" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml`
3. Manual review of `branching-story-page-cycle/SKILL.md` §Record Schemas / Phase 8 step 5 against `branching-story-bootstrap/templates/story-records.yaml`.
4. `git diff --check`

## Outcome

Completed. `branching-story-bootstrap` now delegates PG/SE/CHC schema authority to `branching-story-page-cycle` for root-page, genesis-event, and initial-choice records. The bootstrap template was expanded to the page-cycle-compatible PG, SE, and CHC field sets, including full CHC `choice_contract` data and structured SE replay fields. The bootstrap guardrails now treat page-cycle as an existing schema authority, and the page-cycle skill no longer lists BSBOOT-001 as pending integration debt.

Outcome amended: 2026-05-02 — post-ticket review narrowed the closeout wording from mechanical single-source propagation to explicit runtime authority plus parity-swept bootstrap examples. No implementation files changed during review.

## Verification Result

1. `grep -n "Seam:" .claude/skills/branching-story-bootstrap/SKILL.md` returned only the Phase 6 storylet-pool-authoring seam.
2. `rg -n "inline minimal SE schema|inline minimal choice generation|BSBOOT-001|bootstrap inlines minimal seams" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returned no hits.
3. Manual schema review compared the page-cycle PG/SE/CHC authority text with the bootstrap Phase 7/8 prose and `templates/story-records.yaml`; the remaining differences are bootstrap-root values (`parent_page_id: null`, `chosen_choice_id: null`, no prior state, no genesis ops).
4. `git diff --check` passed.

## Deviations

1. The drafted full smoke (`bootstrap a fixture story bundle; run one page-cycle turn; world-validate`) was not run because these branching-story skills are prose workflow definitions and no executable story-bundle validator/runner exists in the current repo. The truthful proof boundary is grep plus manual review of the skill/template contract.
2. The ticket absorbed PG template parity and the page-cycle stale debt-note cleanup as same-seam required consequences, even though the initial `Files to Touch` only named bootstrap SE/CHC template sections and excluded page-cycle edits.
3. The landed prose does not create a mechanical shared schema include. It establishes page-cycle as the runtime authority and aligns bootstrap's worked examples to that authority; future page-cycle schema changes still require an explicit parity sweep unless a later ticket extracts a shared schema source.
