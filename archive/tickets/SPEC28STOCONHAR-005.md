# SPEC28STOCONHAR-005: Promotion-package authority consistency

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `story-fact-promotion-to-canon` skill SKILL.md + `templates/proposal-package.yaml`; SPEC-28 D5 implementation note.
**Deps**: None

## Problem

At intake, `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (~line 198) and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (~line 62) initialized `source_basis.direct_user_approval: false` with a comment "set true at Phase 7 HARD-GATE approval". The skill's Phase 7 never sets it true, and `direct_user_approval` is **inert** repo-wide (no validator, skill, or patch-engine op reads it — confirmed in the brainstorm verification round). The comments were misleading in principle: package approval at Phase 7 authorizes *proposal creation*, not *canon acceptance*; canon acceptance is `canon-addition`'s exclusive authority.

Separately, the same template documented `derived_from: [<parent CF id if mirrored, or null if novel>]`, which yielded the literal `[null]` for novel candidates — a null-inside-an-ID-list hazard inconsistent with the flat `derived_from: []` SPEC-24 (SCAUD-001 / SCAUD-003) already established for `SF.derived_from`. SPEC-28 D5.

## Assumption Reassessment (2026-05-15)

1. At reassessment before implementation, `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (~line 198) and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (~line 62) both carried the misleading "set true at Phase 7 HARD-GATE approval" comment; the implementation already kept `direct_user_approval: false` (verified during the brainstorm). The `derived_from` documentation specified `[<parent CF id if mirrored, or null if novel>]`.
2. Verified against `archive/specs/SPEC-24-story-state-contract-property-audit.md` (SCAUD-001 / SCAUD-003): SPEC-24's `SF.derived_from` precedent uses a flat `derived_from: []` for novel candidates — never `[null]`. SPEC-28 D5's `[null] → []` change aligns the promotion-package template with the precedent SPEC-24 already set for the sibling `SF` record class.
3. Cross-artifact shared boundary: the `story-promotions/SP-<integer>-proposal-package.yaml` artifact this template produces is consumed by `.claude/skills/canon-addition/SKILL.md` as a CF-shaped candidate; `canon-addition` performs canon acceptance. `direct_user_approval` is inert across canon-addition / `tools/validators` / `tools/patch-engine` (confirmed). The CF schema at `tools/validators/src/schemas/canon-fact-record.schema.json` accepts `derived_from: []` (the field is a list with a CF-id-pattern itemschema; `[]` is valid, `[null]` is not).
4. HARD-GATE / canon-write ordering: `story-fact-promotion-to-canon`'s Phase 7 HARD-GATE authorizes the user to create a proposal package — it does not authorize canon mutation. Canon mutation happens via `canon-addition`'s own HARD-GATE adjudication of the proposal. D5 corrects the misleading template comments so the boundary is documented correctly. No HARD-GATE semantics change; no MR firewall impact (the change is comment-and-default text only).
5. Adjacent contradiction surfaced at reassessment: `source_basis.direct_user_approval` is a field-without-a-consumer at the world-canon CF-schema level (no validator, skill, or patch-engine reads it). Whether the field should exist at all in the CF schema is a separate FOUNDATIONS / canon-addition scope question — classified as **future cleanup** and now captured by `tickets/FOUNDATIONS-005.md`. D5's scope is limited to correcting the misleading *story-skill* comments.
6. Live proof correction: the drafted broad `set true at Phase 7|set true after Phase 7` grep also matches legitimate `hard_gate_approved` proposal-package ledger comments, which remain true for package creation approval. The acceptance proof is narrowed to the `source_basis.direct_user_approval` lines plus a separate no-`null if novel` sweep.
7. Explicit SPEC-28 reference truthing: `specs/SPEC-28-story-contract-hardening.md` still carries D5 current-state/intake prose. This ticket owns adding the same dated implementation-note pattern already used for D1-D4, while leaving the historical D5 problem/change text as intake context.

## Architecture Check

1. Correcting the comment text and changing the default from `[null]` to `[]` (rather than redefining the field's semantics or removing it) is cleaner because the field exists in the CF schema across the repo and SPEC-28 D5 is scoped narrowly to fixing the misleading story-skill comment + a single template default. The deeper question (whether `direct_user_approval` should exist at all in the CF schema) belongs in FOUNDATIONS / canon-addition scope, not in D5.
2. No backwards-compatibility shims or alias paths — comments and the `derived_from` default are corrected in place. No parallel "the old comment said X" footnote is added.

## Verification Layers

1. Comments are corrected -> codebase grep-proof: `grep -nE "direct_user_approval: false.*set true" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` returns no hits; the comments now state that `direct_user_approval` stays `false` through the entire promotion flow (package approval authorizes proposal creation, not canon acceptance).
2. `derived_from` default is corrected -> codebase grep-proof: `grep -n "null if novel" .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns no hits; the template uses the flat `derived_from: []` for novel candidates.
3. SPEC-24 precedent alignment -> manual review: the changed `derived_from` documentation matches the `SF.derived_from: []` precedent SPEC-24 / SCAUD-003 established.
4. SPEC-28 explicit reference truthing -> manual review: `specs/SPEC-28-story-contract-hardening.md` has a dated implementation note for D5, preserving remaining D5 prose as historical intake context.

## Landed Changes

### 1. Corrected the `direct_user_approval` comments

In `.claude/skills/story-fact-promotion-to-canon/SKILL.md` and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml`, replaced the `direct_user_approval` "set true at/after Phase 7 HARD-GATE approval" comments with text stating that `direct_user_approval` stays `false` through the `story-fact-promotion-to-canon` flow. The examples now state that Phase 7 authorizes *proposal creation*, not *canon acceptance*; canon acceptance remains `canon-addition`'s exclusive authority.

### 2. Changed the `derived_from` default for novel candidates from `[null]` to `[]`

In the same two files, replaced `derived_from: [<parent CF id if mirrored, or null if novel>]` with documentation showing `derived_from: []` for novel candidates and `[<parent CF id>]` for mirrored candidates. The examples now state that `null` and branch ids are never valid entries. This aligns with the flat `SF.derived_from: []` precedent SPEC-24 / SCAUD-003 already set.

### 3. Truthed the SPEC-28 D5 reference

Added a dated implementation note to `specs/SPEC-28-story-contract-hardening.md` marking D5 as landed and labeling the remaining D5 current-state prose as historical intake context.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (modify)
- `specs/SPEC-28-story-contract-hardening.md` (modify)

## Out of Scope

- Whether `direct_user_approval` should exist at all in the world-canon CF schema — captured by `tickets/FOUNDATIONS-005.md` as a FOUNDATIONS / canon-addition scope question.
- The closeout supersession/disposition reconciliation — SPEC28STOCONHAR-006 (SPEC-28 D6).
- Other phases of `story-fact-promotion-to-canon` outside the proposal-package authoring.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "direct_user_approval: false.*set true" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` returns no hits.
2. `grep -n "null if novel" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` returns no hits.
3. `grep -nE "derived_from:\s*\[\]|derived_from: \[\]" .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` returns at least one hit (the novel-candidate case shows the flat empty list).
4. Manual review confirms the SPEC-28 D5 implementation note matches the landed skill/template contract.

### Invariants

1. `direct_user_approval` stays `false` end-to-end through `story-fact-promotion-to-canon`; the Phase 7 HARD-GATE is documented as authorizing proposal creation only.
2. `derived_from` for novel candidates is the flat empty list `[]`, never `[null]` (aligning with the SPEC-24 / SCAUD-003 `SF.derived_from` precedent).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "direct_user_approval|derived_from" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml`
2. `grep -nE "direct_user_approval: false.*set true" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (must return no hits).
3. A narrower command is the correct verification boundary: D5 is comment-and-default text fixes in two files; grep-proofs against those files fully cover the change.

## Outcome

Completed on 2026-05-15. The promotion-package examples now keep `source_basis.direct_user_approval: false` through the promotion flow, identify Phase 7 as proposal-package approval rather than canon acceptance, and use `derived_from: []` for novel candidates with no `null` or branch ids. SPEC-28 D5 now has a dated implementation note.

## Verification Result

1. `grep -nE "direct_user_approval|derived_from" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` — passed; manual review confirmed the two edited examples and the remaining legitimate `derived_from` explanatory references.
2. `grep -nE "direct_user_approval: false.*set true" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` — passed with no hits (expected exit 1 / empty output).
3. `grep -n "null if novel" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` — passed with no hits (expected exit 1 / empty output).
4. `grep -nE "derived_from:\s*\[\]|derived_from: \[\]" .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` — passed; hit line 63.
5. Manual review confirmed `specs/SPEC-28-story-contract-hardening.md` D5 has the dated implementation note and preserves the old D5 description as historical intake context.

## Deviations

The original broad `set true at Phase 7|set true after Phase 7` no-hit proof was narrowed because it also matched legitimate `hard_gate_approved` proposal-package ledger comments. Those ledger comments remain in scope for package creation approval and were intentionally left unchanged.
