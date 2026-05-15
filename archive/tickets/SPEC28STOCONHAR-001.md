# SPEC28STOCONHAR-001: Reconcile prose-attach hash-drift contract contradiction

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-prose-attach` skill (deterministic-check list expands 7 → 8); `.claude/skills/_shared-templates/story-state-contract.md` §4.6 prose-receipt schema; `specs/SPEC-28-story-contract-hardening.md` D1 truthing note.
**Deps**: None

## Problem

At intake, `branching-story-prose-attach/SKILL.md` contradicted itself on hash-drift behavior. The `accept_plan_drift` argument prose said that when `accept_plan_drift=false`, a `plan_hash` / `state_hash` mismatch "fails the receipt"; Phase 2 said drift was recorded in `notes` and "the verdict is exclusively driven by the 7 deterministic checks at Phase 3" — none of which inspected the plan/state hash. The skill therefore could not determine whether hash drift failed the receipt. SPEC-28 D1.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/branching-story-prose-attach/SKILL.md`: the argument-prose claim ("when false, a mismatch ... fails the receipt") and the Phase 2 claim ("verdict is exclusively driven by the 7 deterministic checks") are both present and contradict — confirmed during SPEC-28's brainstorm verification round. The 7 current deterministic checks (`engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `choice_consequence_visibility`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority`) include no hash check.
2. Verified against `.claude/skills/_shared-templates/story-state-contract.md` §4.6 (Prose receipt): the prose-receipt schema enumerates the deterministic checks; no `hash_integrity` check currently exists.
3. Cross-artifact shared boundary: the prose-receipt schema (`story-state-contract.md` §4.6) and its consumer `branching-story-prose-attach`. No JSON-schema counterpart exists for the prose receipt — `tools/validators/src/schemas/` has no `prose-receipt.schema.json` (confirmed at decomposition); the receipt is validated solely by `branching-story-prose-attach`'s own deterministic-check logic. This is why D1, unlike D2/D3, has no `tools/validators/` surface.
4. FOUNDATIONS principle motivating this ticket — §Story Bundles §4a (Plan-Authority Boundary): "Rendered prose is a rendering of that state, not a second state engine." The `hash_integrity` check protects the plan-hash ↔ rendered-prose boundary — a drifted render is caught — without making the receipt a second state engine; the receipt still never mutates the `PG` record.
5. HARD-GATE enforcement surface: `branching-story-prose-attach` opens with a HARD-GATE block citing "7 deterministic checks complete per ... §4.6". This ticket changes that count to 8. The change does not weaken the Mystery Reserve firewall — `forbidden_mystery_resolution` remains an independent deterministic check; `hash_integrity` is an additive integrity check, not a replacement.
6. Schema extension: D1 extends the prose-receipt schema in `story-state-contract.md` §4.6 by adding the `hash_integrity` check. The sole consumer of this schema is `branching-story-prose-attach` (no JSON-schema validator, no other skill reads the prose receipt). The extension is additive — a new check entry; existing checks are unchanged. No consumer beyond `branching-story-prose-attach` needs updating.
7. Reassessment correction: live `.claude/skills/branching-story-prose-attach/SKILL.md` does contain a placeholder-hash subcase that records literal `PLACEHOLDER_TO_BE_COMPUTED*` hashes in notes and leaves the verdict unaffected. D1 absorbs this same-seam contradiction by making missing, placeholder, or non-sha256 PG hash fields `hash_integrity: FAIL` rather than a non-verdict-driving exception.
8. Explicit spec reference check: `specs/SPEC-28-story-contract-hardening.md` D1 carries the same stale "placeholder-hash exception is moot" note. This run truths that same-seam D1 note; other SPEC-28 deliverables remain out of scope.

## Architecture Check

1. Adding `hash_integrity` as an 8th deterministic check (rather than leaving hash drift recorded-but-not-verdict-driving) is cleaner because it makes the `accept_plan_drift=false` argument prose TRUE — the contradiction is resolved in favor of a single coherent rule (hash drift IS verdict-driving when drift is not accepted) rather than two passages that disagree. The three-valued `PASS | WARN | FAIL` shape mirrors the existing receipt-check vocabulary.
2. No backwards-compatibility shims or alias paths — the 7 → 8 count change is applied in place; the contradictory argument-prose sentence is rewritten, not aliased.

## Verification Layers

1. Contradiction resolved -> codebase grep-proof: `grep -n "exclusively driven by the 7" .claude/skills/branching-story-prose-attach/SKILL.md` returns no hits; the argument prose, Phase 2, and the HARD-GATE summary all describe `hash_integrity` as verdict-driving when `accept_plan_drift=false`.
2. Schema carries the new check -> codebase grep-proof: `grep -n "hash_integrity" .claude/skills/_shared-templates/story-state-contract.md` returns a hit in the §4.6 prose-receipt schema with `PASS | WARN | FAIL` semantics.
3. Count consistency -> codebase grep-proof: every "7 deterministic checks" reference in `branching-story-prose-attach/SKILL.md` now reads "8".
4. Single-skill, single-shared-contract ticket: the three layers above (contradiction, schema, count) are the distinct invariants; no schema-validation or skill-dry-run layer applies because the prose receipt has no JSON-schema validator and zero production bundles exist to dry-run against.

## Landed Changes

### 1. Added `hash_integrity` to the §4.6 prose-receipt schema

In `.claude/skills/_shared-templates/story-state-contract.md` §4.6, `hash_integrity` is now an eighth deterministic check in the receipt's `checks:` map with three-valued semantics: `PASS` (recorded `plan_hash` / `state_hash` are sha256-shaped and match recomputed values), `WARN` (valid drift accepted because `accept_plan_drift=true`), `FAIL` (drift with `accept_plan_drift=false`, or PG hash fields missing / placeholder / non-sha256). The check is inside `checks:` rather than a separate receipt field, preserving the receipt's existing verdict roll-up shape.

### 2. Reconciled the prose-attach SKILL.md contradiction

In `.claude/skills/branching-story-prose-attach/SKILL.md`, the HARD-GATE summary, process flow, Phase 1 hash computation, Phase 2 hash-integrity rules, Phase 3 deterministic-check list, receipt YAML example, and deferred-integration note now agree that under `accept_plan_drift=false` a hash mismatch yields `hash_integrity: FAIL` and is verdict-driving, while under `accept_plan_drift=true` valid drift yields `hash_integrity: WARN`. Missing, placeholder, or non-sha256 PG hash fields fail regardless of `accept_plan_drift`.

### 3. Truthed the explicit SPEC-28 reference

`specs/SPEC-28-story-contract-hardening.md` D1 now carries a dated implementation note for SPEC28STOCONHAR-001, historicalizes the old current-state contradiction, records that the live prose-attach skill did contain a placeholder-hash subcase, and states that D1 absorbs it into `hash_integrity: FAIL`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `specs/SPEC-28-story-contract-hardening.md` (modify — same-seam D1 truthing note only)

## Out of Scope

- The cross-file count sweep for any reference to prose-attach's check count OUTSIDE `branching-story-prose-attach` — that is SPEC28STOCONHAR-004's scope (SPEC-28 D4).
- Any change to the 7 existing deterministic checks' semantics.
- The prose receipt's non-check fields.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "exclusively driven by the 7" .claude/skills/branching-story-prose-attach/SKILL.md` returns no hits.
2. `grep -n "hash_integrity" .claude/skills/_shared-templates/story-state-contract.md` returns at least one hit inside §4.6 with `PASS | WARN | FAIL` semantics.
3. `grep -cE "8 deterministic checks|eight deterministic checks" .claude/skills/branching-story-prose-attach/SKILL.md` returns ≥1, AND `grep -n "7 deterministic checks" .claude/skills/branching-story-prose-attach/SKILL.md` returns no hits.

### Invariants

1. The prose receipt never mutates the `PG` record (FOUNDATIONS §Story Bundles §4a) — `hash_integrity` is a receipt check, not a `PG` write.
2. `branching-story-prose-attach`'s deterministic-check count is identical wherever it is stated (argument prose, Phase 2, HARD-GATE summary, and the §4.6 schema).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "hash_integrity|8 deterministic|eight deterministic" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
2. `grep -nE "exclusively driven by the 7|7 deterministic checks" .claude/skills/branching-story-prose-attach/SKILL.md` (must return nothing)
3. A narrower command is the correct verification boundary: D1 is a contract + skill-prose change with no JSON-schema or code counterpart (confirmed — no prose-receipt JSON schema), so grep-proofs against the two edited files fully cover the change.

## Outcome

Implemented D1. The prose receipt schema now carries `checks.hash_integrity`, and `branching-story-prose-attach` treats plan/state hash drift as verdict-driving through that check. The previous placeholder-hash exception no longer permits a PASS/WARN-by-omission path: missing, placeholder, or non-sha256 PG hash fields now fail the receipt.

## Verification Result

1. `grep -nE "hash_integrity|8 deterministic|eight deterministic" .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md` — passed; found `hash_integrity` in the skill HARD-GATE, Phase 2, Phase 3, receipt YAML example, deferred-integration note, and the shared §4.6 schema.
2. `grep -nE "exclusively driven by the 7|7 deterministic checks" .claude/skills/branching-story-prose-attach/SKILL.md` — passed as a no-hit negative proof; command exited 1 because the stale operational phrasing is absent.
3. `grep -n "hash_integrity" .claude/skills/_shared-templates/story-state-contract.md` — passed; `hash_integrity` is present in §4.6 with `PASS | WARN | FAIL` semantics.
4. `grep -n "no such exception\|moot" specs/SPEC-28-story-contract-hardening.md archive/tickets/SPEC28STOCONHAR-001.md` — passed for the owned D1 stale note; only unrelated out-of-scope `moot` wording and this ticket's historical reassessment mention remain.
5. Manual review of `specs/SPEC-28-story-contract-hardening.md` D1 — passed; the old current-state contradiction is now labelled as intake state and the dated implementation note names the landed `hash_integrity` surface.
6. `git diff --check -- .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md` — passed.
7. `grep -n '[[:blank:]]$' archive/tickets/SPEC28STOCONHAR-001.md specs/SPEC-28-story-contract-hardening.md` — passed as a no-hit negative proof; command exited 1 because there is no trailing whitespace in the untracked ticket/spec files.

## Deviations

1. Reassessment found the live prose-attach skill did contain the placeholder-hash subcase that the ticket/spec originally called moot. The active ticket absorbed that same-seam cleanup, updated SPEC-28 D1, and made placeholder PG hashes `hash_integrity: FAIL`.
2. D4's broader count cascade remains out of scope. This ticket updated only the prose-attach deterministic-check count and the shared prose-receipt contract.
