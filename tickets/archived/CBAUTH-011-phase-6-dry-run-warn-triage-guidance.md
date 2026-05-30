# CBAUTH-011: Add Phase 6 dry-run-warn triage guidance for warns on pre-existing non-batch records

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/SKILL.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: None

## Problem

Phase 6 sub-step 2 instructs the operator to run `validate_patch_plan` (or the CLI equivalent) as the dry-run gate before HARD-GATE. Sub-step 3 then composes the deliverable summary the user approves. Neither sub-step documents how to triage **warn-severity verdicts whose location targets a pre-existing record not in the patch plan** — verdicts the validator surfaces because it audits the full bundle scope, not just the new SLT records the patch creates.

Observed on the 2026-05-30 red-bunny SLB-5 run: the dry-run returned `status: pass` with 27 PASS validators, but also one `warn`-severity verdict:

```
chc_slt_selected_commitment_trace.weak_incidental_grounding on CHC-33
  → "CHC-33 grounds in the same record class as a selecting predicate, but not the exact selected record."
```

CHC-33 was authored at the prior `branching-story-turn-cycle` PG-8 commit (see commit `b6d19a29` "Implement STOTURNCYC-007: document eligibility_background_only marker in Phase 7"); it is not in this batch's `patches[]` op set. The verdict is incidental noise relative to commitment-block-authoring's scope, but the deliverable-summary contract makes no provision for it — the operator improvises an interpretive judgment ("the single warn is on pre-existing CHC-33 (unrelated to this batch's records)") that should be a documented step.

Without explicit triage guidance, a future operator could either (a) treat all dry-run warns as batch-blocking and miss approval, or (b) silently ignore all warns and miss a genuine batch-record finding. Both failure modes are predictable.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 2 instructs `mcp__worldloom__validate_patch_plan` (or the CLI equivalent) "exercises `record_schema_compliance` for each SLT record" and documents the inline-paste vs CLI path-selection. Verified by direct Read this session. The sub-step does not say what to do with warn-severity verdicts on non-batch records the validator surfaces incidentally.
2. `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 3 enumerates the deliverable-summary bullets (mode + source, SLT inventory, coverage-depth signal, moment_signature echo, moment_fit_lanes, early_termination state, per-block one-line summary, per-block validation trace, batch-diversity result, skipped RSP cards, SLB manifest preview). Verified by direct Read. None of the bullets cover "dry-run warns on non-batch records".
3. Shared boundary under audit: the `validate_patch_plan` response shape (`status`, `verdicts[].location`, `verdicts[].severity`). The `verdicts[].location.node_id` field already carries the offending record id, so the operator can mechanically distinguish "is this id in `expected_id_allocations.slt_ids[]`?" — a one-line check that should be documented at sub-step 2.
4. FOUNDATIONS principle under audit: §Tooling Recommendation (HARD-GATE PASS/FAIL rationales cite the validator result, not impression). The HARD-GATE moment is where this triage decision becomes load-bearing — the operator must cite WHY a warn is or is not actionable for this batch, and the skill prose should give that cite.
5. Adjacent contradiction classification: CBAUTH-008's Phase 6 sub-step 3 enumeration is the immediate precedent for "deliverable-summary contract additions"; CBAUTH-011 follows the same pattern by adding triage-step guidance at sub-step 2 (the dry-run interpretation site) and a one-bullet enumeration at sub-step 3 (the per-batch-record warn vs incidental-warn surfacing). Required-consequence elaboration; no separate bug.
6. Out-of-scope creep guard: this ticket does NOT add a validator-scope filter that hides non-batch verdicts (changing validator scope would mask genuine cross-bundle findings the validator currently catches). It does NOT change the dry-run command, response shape, or HARD-GATE logic. Skill-prose elaboration only.

## Architecture Check

1. Cleaner than alternatives: documenting the triage step at sub-step 2 (where the dry-run runs) and the surfacing at sub-step 3 (where the operator composes the summary) keeps the discipline at the existing sub-step boundaries the SKILL.md already uses. The alternative — a validator-scope flag that filters non-batch verdicts — is brittle (validators legitimately audit cross-bundle invariants and the response is the right place for the operator to see them), and would move the policy decision from the skill (correct site) to the validator (wrong site).
2. No backwards-compatibility aliasing/shims introduced: prose elaboration within existing Phase 6 sub-steps. No schema change. No on-disk artifact changes.

## Verification Layers

1. Invariant: Phase 6 sub-step 2 documents the dry-run-warn triage step (per-verdict check: is `verdict.location.node_id` in this batch's `expected_id_allocations.slt_ids[]`?) → codebase grep-proof (`SKILL.md` Phase 6 sub-step 2 contains a one-paragraph triage instruction naming the `location.node_id` field and the batch-id-membership test).
2. Invariant: Phase 6 sub-step 3 deliverable summary surfaces both batch-record verdicts and incidental-record verdicts separately so the operator's HARD-GATE rationale cites both categories → codebase grep-proof (`SKILL.md` Phase 6 sub-step 3 has a bullet like "Dry-run verdicts: by-batch (X) — list with severity + code; incidental on pre-existing records (Y) — list with severity + code + 'not actionable for this batch' note").
3. Invariant: the triage is a documentation elaboration, not a validator-scope change → FOUNDATIONS alignment check (the §Tooling Recommendation HARD-GATE-cite discipline is satisfied by the operator naming the verdict + reason at approval time; the validator remains the authority).

## What to Change

### 1. Sub-step 2 triage paragraph

In `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 2 (the `validate_patch_plan` instruction), after the inline-paste vs CLI path-selection paragraph, add a triage paragraph:

> **Dry-run-warn triage.** The dry-run audits the full bundle scope, not only the new SLT records the patch creates. A warn or fail verdict whose `location.node_id` resolves to a record outside this batch's `expected_id_allocations.slt_ids[]` is incidental to the patch — it surfaces a pre-existing pattern (typically a prior turn-cycle CHC's grounding or a prior bundle invariant) and is not actionable by this skill's HARD-GATE decision. Mechanically: for each `verdict` in the dry-run response, check `verdict.location.node_id` against the batch's allocated `slt_ids[]`; a verdict whose `node_id` is in the set is a batch-record verdict and is actionable here; a verdict whose `node_id` is outside the set is incidental and is surfaced at sub-step 3 but does not block approval. Genuine batch-record FAIL verdicts still block per the existing HARD-GATE rule.

### 2. Sub-step 3 deliverable-summary bullets

Extend the sub-step 3 bullet enumeration with a new bullet (placed adjacent to "moment_signature echo"):

> - Dry-run verdicts: by-batch (N verdicts) — list each with `severity`, `code`, and one-line evidence (PASS verdicts are not listed individually; FAIL or warn verdicts are); incidental on pre-existing records (N verdicts) — list each with `severity`, `code`, and `location.node_id`, marked "not actionable for this batch" so the user's HARD-GATE rationale cites the incidental verdicts honestly rather than hiding them.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- Any change to `validate_patch_plan` response shape, validator scope, or the per-validator location-emission discipline.
- Any change to the dry-run CLI binary, the submit CLI, or the HARD-GATE prose.
- Generalization of the triage discipline to other story-pipeline skills (each skill's Phase 6 sub-step 3 is owned by that skill; this ticket scopes to commitment-block-authoring).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Dry-run-warn triage" .claude/skills/commitment-block-authoring/SKILL.md` returns the new sub-step 2 paragraph header.
2. `grep -n "incidental on pre-existing records" .claude/skills/commitment-block-authoring/SKILL.md` returns the new sub-step 3 bullet.
3. Re-running `commitment-block-authoring` against a bundle whose dry-run produces a warn on a pre-existing record (e.g., red-bunny PG-8 + CHC-33's `weak_incidental_grounding`) shows the deliverable summary lists the incidental verdict with the "not actionable for this batch" note and proceeds to HARD-GATE approval.

### Invariants

1. Validator scope is unchanged: the validators continue to audit cross-bundle invariants and the dry-run response continues to surface non-batch verdicts.
2. HARD-GATE block-on-FAIL semantics are unchanged: a genuine batch-record FAIL verdict still blocks approval; only incidental warns are filtered from the actionable-set for THIS batch.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "Dry-run-warn triage\|incidental on pre-existing records" .claude/skills/commitment-block-authoring/SKILL.md`
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <a representative SLB envelope on any bundle with pre-existing CHC weak_incidental_grounding warns> 2>/dev/null | jq '.verdicts[] | {code, severity, node_id: .location.node_id}'` — confirms the response shape the triage paragraph consumes is the current shape.
3. (No narrower verification surface needed — the ticket is prose-only and the verification is grep + a representative dry-run response.)
