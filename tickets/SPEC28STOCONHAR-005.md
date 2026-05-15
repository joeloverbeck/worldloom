# SPEC28STOCONHAR-005: Promotion-package authority consistency

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `story-fact-promotion-to-canon` skill SKILL.md + `templates/proposal-package.yaml`.
**Deps**: None

## Problem

`.claude/skills/story-fact-promotion-to-canon/SKILL.md` (~line 198) and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (~line 62) initialize `source_basis.direct_user_approval: false` with a comment "set true at Phase 7 HARD-GATE approval". The skill's Phase 7 never sets it true, and `direct_user_approval` is **inert** repo-wide (no validator, skill, or patch-engine op reads it — confirmed in the brainstorm verification round). The comments are misleading in principle: package approval at Phase 7 authorizes *proposal creation*, not *canon acceptance*; canon acceptance is `canon-addition`'s exclusive authority.

Separately, the same template documents `derived_from: [<parent CF id if mirrored, or null if novel>]`, which yields the literal `[null]` for novel candidates — a null-inside-an-ID-list hazard inconsistent with the flat `derived_from: []` SPEC-24 (SCAUD-001 / SCAUD-003) already established for `SF.derived_from`. SPEC-28 D5.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (~line 198) and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (~line 62): both carry the misleading "set true at Phase 7 HARD-GATE approval" comment; the implementation already keeps `direct_user_approval: false` (verified during the brainstorm). The `derived_from` documentation specifies `[<parent CF id if mirrored, or null if novel>]`.
2. Verified against `archive/specs/SPEC-24-story-state-contract-property-audit.md` (SCAUD-001 / SCAUD-003): SPEC-24's `SF.derived_from` precedent uses a flat `derived_from: []` for novel candidates — never `[null]`. SPEC-28 D5's `[null] → []` change aligns the promotion-package template with the precedent SPEC-24 already set for the sibling `SF` record class.
3. Cross-artifact shared boundary: the `story-promotions/SP-<integer>-proposal-package.yaml` artifact this template produces is consumed by `.claude/skills/canon-addition/SKILL.md` as a CF-shaped candidate; `canon-addition` performs canon acceptance. `direct_user_approval` is inert across canon-addition / `tools/validators` / `tools/patch-engine` (confirmed). The CF schema at `tools/validators/src/schemas/canon-fact-record.schema.json` accepts `derived_from: []` (the field is a list with a CF-id-pattern itemschema; `[]` is valid, `[null]` is not).
4. HARD-GATE / canon-write ordering: `story-fact-promotion-to-canon`'s Phase 7 HARD-GATE authorizes the user to create a proposal package — it does not authorize canon mutation. Canon mutation happens via `canon-addition`'s own HARD-GATE adjudication of the proposal. D5 corrects the misleading template comments so the boundary is documented correctly. No HARD-GATE semantics change; no MR firewall impact (the change is comment-and-default text only).
5. Adjacent contradiction surfaced at reassessment: `source_basis.direct_user_approval` is a field-without-a-consumer at the world-canon CF-schema level (no validator, skill, or patch-engine reads it). Whether the field should exist at all in the CF schema is a separate FOUNDATIONS / canon-addition scope question — classified as **future cleanup that must become its own follow-up** (flagged in `docs/triage/2026-05-15-story-related-improvements-triage.md` as a follow-up). D5's scope is limited to correcting the misleading *story-skill* comments.

## Architecture Check

1. Correcting the comment text and changing the default from `[null]` to `[]` (rather than redefining the field's semantics or removing it) is cleaner because the field exists in the CF schema across the repo and SPEC-28 D5 is scoped narrowly to fixing the misleading story-skill comment + a single template default. The deeper question (whether `direct_user_approval` should exist at all in the CF schema) belongs in FOUNDATIONS / canon-addition scope, not in D5.
2. No backwards-compatibility shims or alias paths — comments and the `derived_from` default are corrected in place. No parallel "the old comment said X" footnote is added.

## Verification Layers

1. Comments are corrected -> codebase grep-proof: `grep -n "set true at Phase 7" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` returns no hits; the comments now state that `direct_user_approval` stays `false` through the entire promotion flow (package approval authorizes proposal creation, not canon acceptance).
2. `derived_from` default is corrected -> codebase grep-proof: `grep -n "null if novel" .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns no hits; the template uses the flat `derived_from: []` for novel candidates.
3. SPEC-24 precedent alignment -> manual review: the changed `derived_from` documentation matches the `SF.derived_from: []` precedent SPEC-24 / SCAUD-003 established.

## What to Change

### 1. Correct the `direct_user_approval` comments

In `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (~line 198) and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (~line 62), replace the "set true at Phase 7 HARD-GATE approval" / "set true after Phase 7 HARD-GATE approval" comments with text stating that `direct_user_approval` stays `false` through the entire `story-fact-promotion-to-canon` flow. Make it explicit that the Phase 7 HARD-GATE authorizes *proposal creation*, not *canon acceptance*; canon acceptance is `canon-addition`'s exclusive authority.

### 2. Change the `derived_from` default for novel candidates from `[null]` to `[]`

In the same two files, replace `derived_from: [<parent CF id if mirrored, or null if novel>]` (or any equivalent phrasing that yields `[null]` for novel candidates) with documentation showing `derived_from: []` for novel candidates (and `derived_from: [<parent CF id>]` for mirrored candidates). Add a brief note that `null` is never a valid entry — the list is either empty (novel) or carries one-or-more parent CF ids. This aligns with the flat `SF.derived_from: []` precedent SPEC-24 / SCAUD-003 already set.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (modify)

## Out of Scope

- Whether `direct_user_approval` should exist at all in the world-canon CF schema — flagged in `docs/triage/2026-05-15-story-related-improvements-triage.md` as a FOUNDATIONS / canon-addition scope question.
- The closeout supersession/disposition reconciliation — SPEC28STOCONHAR-006 (SPEC-28 D6).
- Other phases of `story-fact-promotion-to-canon` outside the proposal-package authoring.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "set true at Phase 7\|set true after Phase 7" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` returns no hits.
2. `grep -n "null if novel" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` returns no hits.
3. `grep -nE "derived_from:\s*\[\]|derived_from: \[\]" .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` returns at least one hit (the novel-candidate case shows the flat empty list).

### Invariants

1. `direct_user_approval` stays `false` end-to-end through `story-fact-promotion-to-canon`; the Phase 7 HARD-GATE is documented as authorizing proposal creation only.
2. `derived_from` for novel candidates is the flat empty list `[]`, never `[null]` (aligning with the SPEC-24 / SCAUD-003 `SF.derived_from` precedent).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "direct_user_approval|derived_from" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml`
2. `grep -n "set true" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (must return no hits referring to `direct_user_approval`).
3. A narrower command is the correct verification boundary: D5 is comment-and-default text fixes in two files; grep-proofs against those files fully cover the change.
