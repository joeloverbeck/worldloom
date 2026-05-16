# SPEC33STOPIPSEV-003: Reorder prose-attach Phase 6 to submit patch before direct artifacts

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 6 step 4 reordering; no tool/validator/patch-engine changes.
**Deps**: None

## Problem

`.claude/skills/branching-story-prose-attach/SKILL.md` Phase 6 currently writes the receipt and updates `INDEX.md` BEFORE submitting the optional `create_se_record` patch when `emit_attach_event: true`. The shared write order at `_shared-templates/story-state-contract.md` §10 requires: build patch plan → dry-run validate → obtain approval token → submit patch plan → write direct-markdown artifacts → post-write plan-hash verification → update bundle `INDEX.md` last. Patch submit precedes direct artifacts and INDEX; the current Phase 6 violates this when `emit_attach_event: true`. The audit-only SE event (`event_kind: prose_attach`, story-state contract §4.3a) has no replay-delta, but ordering still matters: a filesystem failure between INDEX write and patch submit would leave INDEX reporting prose attached while the audit ledger entry never committed.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of current Phase 6 order**: live read of `branching-story-prose-attach/SKILL.md` Phase 6 confirms the current on-approval step writes receipt → updates INDEX → conditionally builds and submits `create_se_record` patch; live read of `_shared-templates/story-state-contract.md` §10 confirms the canonical order is patch submit (step 4) before direct artifacts (step 5) before INDEX (step 6).
2. **Specs/docs cross-reference**: SPEC-33 §D3 names the violation site and the canonical order; story-state contract §4.3a classifies `event_kind: prose_attach` as audit-only (no replay-delta) but does not relax the write-order discipline for the audit-only SE.
3. **Cross-skill boundary**: the shared boundary under audit is `_shared-templates/story-state-contract.md` §10 shared write order. Every state-changing skill — including prose-attach when `emit_attach_event: true` — must honor it. Atomic commit ordering is a §4 Write Discipline invariant per FOUNDATIONS.
4. **FOUNDATIONS principle restatement**: §4 Write Discipline (atomic commit ordering — patch engine routes for `_source/*.yaml`; direct-markdown artifacts and INDEX updates follow patch acceptance, not precede it). The audit-only classification at §4.3a relaxes replay semantics, NOT write order.
5. **HARD-GATE / canon-write ordering**: prose-attach Phase 6 is the HARD-GATE fire-point for `emit_attach_event: true` invocations; the reorder places `mcp__worldloom__submit_patch_plan` for the audit-only SE record before any direct-markdown artifact or INDEX write. The Mystery Reserve firewall is not weakened — the audit-only SE (`event_kind: prose_attach`) carries no replay-delta and does not interact with Mystery Reserve resolution; the reorder strengthens atomicity without touching firewall semantics.

## Architecture Check

1. The reordered Phase 6 step 4 places patch submission before receipt and INDEX writes — matching shared write order §10. A filesystem failure between INDEX write and patch submit can no longer leave inconsistent state. Cleaner than alternatives that would (a) exempt audit-only SE from write order (would weaken §10 discipline and create a class-by-class exception surface) or (b) move the audit-only SE outside the patch engine (would require a separate write path for one event kind, increasing surface complexity).
2. No backwards-compatibility aliasing/shims introduced — the prior order is replaced; no parallel legacy path retained.

## Verification Layers

1. Patch submission precedes direct artifacts in Phase 6 → codebase grep-proof (the reordered step 4 sub-block names `submit via mcp__worldloom__submit_patch_plan` BEFORE `Write pages-prose-receipts/`).
2. Failure-behavior block confirms abort-on-patch-failure → manual review of the Phase 6 step 4 abort clause.
3. Shared write order §10 unchanged → no edit to `_shared-templates/story-state-contract.md` §10; the contract remains authoritative and the skill now conforms.

## What to Change

### 1. Replace Phase 6 step 4 on-approval block in prose-attach SKILL.md

In `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 6 (Commit / Write), replace the existing step 4 on-approval block with:

```
4. On approval:
   a. If `emit_attach_event: true`: build a single-op patch envelope with
      `create_se_record` for `event_kind: prose_attach` conforming to
      story-state contract §4.3a (audit-only SE events). Dry-run validate via
      `mcp__worldloom__validate_patch_plan`, obtain the approval token, and
      submit via `mcp__worldloom__submit_patch_plan`. If this optional patch
      fails, abort: write no receipt and no INDEX update for this invocation;
      surface the patch failure and allow the user to re-run with
      `emit_attach_event=false` or repair the patch shape.
   b. Write `pages-prose-receipts/<page_id>.yaml` (direct write, not
      patch-engine routed — the receipt is not a `_source/` record).
   c. Update bundle `INDEX.md` to reflect prose status + receipt verdict.
```

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- Other prose-attach SKILL.md sections (Phase 3 check 8 promotion-claims path, FOUNDATIONS Alignment row, retrieval wording) — covered by SPEC33STOPIPSEV-002 (D2) and SPEC33STOPIPSEV-008 (D8).
- Shared write order §10 itself — already canonical; this ticket only updates the skill to conform.
- `event_kind: prose_attach` classification at §4.3a — unchanged; audit-only relaxes replay semantics, not write order.
- Patch-engine `create_se_record` op — already implemented; no engine changes required.

## Acceptance Criteria

### Tests That Must Pass

1. Phase 6 step 4 sub-step (a) explicitly names `submit_patch_plan` before sub-steps (b) receipt and (c) INDEX writes. Manual visual verification of the on-approval block.
2. Phase 6 step 4 includes an explicit abort clause for patch failure: `If this optional patch fails, abort: write no receipt and no INDEX update for this invocation`.
3. `grep -n 'Write \`pages-prose-receipts' .claude/skills/branching-story-prose-attach/SKILL.md` returns the write step appearing AFTER the patch-submission step within Phase 6.

### Invariants

1. Patch engine submission precedes direct-markdown artifacts and INDEX updates for any skill invocation that emits a `_source/*.yaml` record, including audit-only SE events.
2. A patch failure aborts all downstream direct writes within the same invocation; no partial state lands.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n -A 20 '## Phase 6' .claude/skills/branching-story-prose-attach/SKILL.md | grep -nE 'submit_patch_plan|pages-prose-receipts|INDEX.md'` — confirm submission appears before receipt and INDEX writes.
2. Visual review of Phase 6 step 4 sub-block against story-state contract §10 ordering.
3. A narrower command is the right verification boundary because the fix is a single block reorder; no integration test runner exercises Phase 6 prose. The shared write order is the canonical proof surface — its §10 ordering is unchanged.
