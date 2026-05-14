# SPEC26STOCOHHAR-004: Add prose-attach choice_consequence_visibility check

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-prose-attach` skill prose, `.claude/skills/_shared-templates/story-state-contract.md` §4.6 (prose-receipt schema), and `specs/SPEC-26-story-coherence-hardening-ii.md` status note.
**Deps**: archive/tickets/SPEC26STOCOHHAR-003.md

## Problem

At intake, `branching-story-prose-attach` ran 6 deterministic checks but none verified that the route outcome of a non-accept action was made *legible in the rendered prose*. SPEC-26 D3's read/verify half added a seventh check, `choice_consequence_visibility`, that verifies the prose realizes `SE.resolution.player_visible_feedback` (the field created by SPEC26STOCOHHAR-003). Before this ticket, a page that routed a player action to `world_block` but hid why it failed passed prose-attach cleanly — agency is not just having choices, it is seeing that the system understood the choice and why the world responded.

## Assumption Reassessment (2026-05-14)

1. At intake, verified against the current codebase at SPEC-26 Step 2: `branching-story-prose-attach/SKILL.md` defined exactly 6 deterministic checks — `engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority` — plus a roll-up `verdict` block and a `repair_recommendation` ladder. The skill cross-referenced `.claude/skills/_shared-templates/story-state-contract.md` §4.6 with the stale "6 deterministic checks" count.
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D3: `choice_consequence_visibility` is `PASS | WARN | FAIL` — `PASS` = prose makes the selected action, route, and immediate consequence legible to a first-time reader; `WARN` = the action occurred but the consequence/route feedback is easy to miss; `FAIL` = prose obscures, contradicts, or omits the consequence (especially for `attempt`/`accommodate`/`world_block`/`promotion_hold`/`terminal` routes). It verifies the prose realizes `SE.resolution.player_visible_feedback`.
3. Cross-skill / cross-artifact boundary under audit: the prose-receipt check set, owned jointly by `branching-story-prose-attach/SKILL.md` (the check definitions, verdict roll-up, repair ladder) and `story-state-contract.md` §4.6 (the prose-receipt direct-write artifact schema). The new check also depends on the `SE.resolution.player_visible_feedback` field from `archive/tickets/SPEC26STOCOHHAR-003.md` — hence the `Deps`.
4. FOUNDATIONS principle under audit: §Story Bundles §4a (Plan-Authority Boundary) — `choice_consequence_visibility` is a prose-receipt check, a rendering-of-state validation, not a second state engine. It reads the committed `SE.resolution` and the rendered prose; it does not mutate page state. This keeps prose-attach within its mandate (validate the rendering; never re-author state).
5. HARD-GATE / Canon Safety surface (per `tickets/README.md` check 9): this ticket adds a sibling check next to `forbidden_mystery_resolution` (the Rule 7 redundant prose-side guard). The enforcement surfaces touched are the prose-attach 6→7 check suite, the roll-up `verdict` block, and the `repair_recommendation` ladder. `docs/HARD-GATE-DISCIPLINE.md` was read on 2026-05-14; confirmed: `choice_consequence_visibility` reads `SE.resolution` and the prose only; it does not relax, reorder, or bypass `forbidden_mystery_resolution`, and it adds no new path that could resolve a `forbidden`-status mystery — the Mystery Reserve firewall is unchanged.
6. Output-schema extension (per `tickets/_TEMPLATE.md` menu item 6): the schema extended is the prose-receipt direct-write artifact at `story-state-contract.md` §4.6 (the `pages-prose-receipts/PG-<integer>.yaml` schema). The extension is additive — a new `choice_consequence_visibility: PASS | WARN | FAIL` field joins the existing six check results. Consumers: the roll-up `verdict` derivation in `branching-story-prose-attach`, and human reviewers reading the receipt; no breaking change to existing receipt readers (a new field with a deterministic value).

## Architecture Check

1. Adding `choice_consequence_visibility` as a seventh deterministic check is cleaner than leaving consequence-legibility to the existing `required_event_rendered` check: `required_event_rendered` verifies the *event* is dramatized, not that the *route outcome and its cause* are legible — the new check has a distinct contract (`SE.resolution.player_visible_feedback`) to verify against, which only exists because SPEC26STOCOHHAR-003 created it. A dedicated check keeps each check single-purpose.
2. No backwards-compatibility aliasing or shims — the new check is net-new; the existing six checks are unchanged in name and semantics.

## Verification Layers

1. The seventh check exists and is wired into the verdict -> codebase grep-proof: `choice_consequence_visibility` appears in `branching-story-prose-attach/SKILL.md` as a defined check, in the roll-up `verdict` block, and (where applicable) in the `repair_recommendation` ladder.
2. The prose-receipt schema carries the new field -> schema validation: `story-state-contract.md` §4.6 lists `choice_consequence_visibility` and the "6 deterministic checks" count is updated to 7.
3. The check verifies against the real contract field -> manual contract review + grep proof: no executable story-skill dry-runner is available in this Codex session, so `choice_consequence_visibility` is verified as a deterministic prose-receipt check over plan §7 `SE.resolution.player_visible_feedback`, with omission/contradiction routed to `revise_prose`.
4. (Single-layer not applicable — this is a cross-skill + cross-artifact ticket; the three layers map the wiring invariant, the schema-extension invariant, and the behavioral invariant to distinct proof surfaces.)

## Landed Changes

### 1. prose-attach — add the seventh deterministic check

`branching-story-prose-attach/SKILL.md` now adds `choice_consequence_visibility` (`PASS | WARN | FAIL`) as check 7, defined per Assumption Reassessment item 2. It verifies the rendered prose realizes the page's `SE.resolution.player_visible_feedback`, with `WARN`/`FAIL` graded by how legible the route outcome and its cause are. For `accept` routes with no `resolution`, the check passes when the selected event and consequence remain legible under `required_event_rendered`.

### 2. prose-attach — update the verdict roll-up and repair ladder

The roll-up `verdict` block now includes `choice_consequence_visibility`, and the `repair_recommendation` ladder routes `choice_consequence_visibility: FAIL` to `revise_prose`.

### 3. Contract §4.6 — 6 → 7 deterministic checks

`story-state-contract.md` §4.6 (prose receipt) now adds `choice_consequence_visibility` to the receipt's check-result fields and states that the `checks` mapping contains seven deterministic prose/state checks plus optional `craft_critic`. The §38 cross-reference count in `branching-story-prose-attach/SKILL.md` is updated to match.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.6)
- `specs/SPEC-26-story-coherence-hardening-ii.md` (modify — add D3 completion note for the prose-attach half)

## Out of Scope

- The `SE.resolution` schema/contract/validator/emitter work — that is `archive/tickets/SPEC26STOCOHHAR-003.md`, on which this ticket depends.
- Cross-referencing the Player Agency Contract from `choice_consequence_visibility` — that wiring is owned by SPEC26STOCOHHAR-008 (D7).
- Any change to the six existing prose-attach checks' names or semantics.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'choice_consequence_visibility' .claude/skills/branching-story-prose-attach/SKILL.md` returns the check definition, its appearance in the roll-up `verdict` block, and the repair ladder.
2. `grep -n 'choice_consequence_visibility\|7 deterministic checks\|seven deterministic checks' .claude/skills/_shared-templates/story-state-contract.md` confirms §4.6 carries the new field and the updated count.
3. `! grep -nE '6 deterministic checks|six deterministic checks' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md` confirms no stale "6"/"six" count references remain in the operational skill/contract surfaces.

### Invariants

1. prose-attach runs exactly 7 deterministic checks; the count is consistent across `branching-story-prose-attach/SKILL.md` and `story-state-contract.md` §4.6.
2. `choice_consequence_visibility` reads `SE.resolution` and the rendered prose only — it never mutates page state (FOUNDATIONS §Story Bundles §4a).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The prose-attach checks are skill-prose deterministic checks, not tool-validator code; verification is grep-proof + manual contract review because no executable story-skill dry-runner is available in this Codex session.

### Commands

1. `grep -rn 'choice_consequence_visibility' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
2. `! grep -rnE '6 deterministic checks|six deterministic checks' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
3. A grep/manual-review boundary is correct: prose-attach's checks are skill-prose, not validator binaries — the count-consistency grep plus manual contract review of the `world_block` omission path is the full verification surface available in this Codex session.

## Outcome

Completion date: 2026-05-14.

`branching-story-prose-attach` now runs seven deterministic checks. The new `choice_consequence_visibility` check reads plan §7 `SE.resolution.player_visible_feedback` and verifies the rendered prose makes the selected action, route, and immediate consequence legible. The shared prose-receipt schema now carries the matching `checks.choice_consequence_visibility` field and explicit seven-check count. `choice_consequence_visibility: FAIL` routes to `revise_prose`, preserving the Plan-Authority Boundary and leaving `forbidden_mystery_resolution` unchanged.

`specs/SPEC-26-story-coherence-hardening-ii.md` now records that both halves of D3 are landed; remaining D3 problem/deliverable prose is historical intake context unless a later SPEC-26 ticket reopens it.

## Verification Result

1. `grep -rn 'choice_consequence_visibility' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md` — passed; the field appears in the skill definition, repair ladder, receipt YAML example, and shared receipt schema/count note.
2. `! grep -rnE '6 deterministic checks|six deterministic checks' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md` — passed; no stale six-check count remains in the operational skill/contract surfaces.
3. Manual contract review — passed; the new check reads plan §7 `SE.resolution.player_visible_feedback` and rendered prose only, does not mutate `PG`, does not alter the prose-attach HARD-GATE approval step, and does not relax or reorder `forbidden_mystery_resolution`.

## Deviations

1. The drafted skill dry-run was replaced with manual contract review plus grep proof because no executable story-skill dry-runner is available in this Codex session. This is the truthful proof surface for skill-prose deterministic checks.
2. `SPEC26STOCOHHAR-008` remains active and owns the later Player Agency Contract cross-reference. This ticket did not add that cross-reference.
