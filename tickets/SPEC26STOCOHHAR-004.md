# SPEC26STOCOHHAR-004: Add prose-attach choice_consequence_visibility check

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-prose-attach` skill prose and `.claude/skills/_shared-templates/story-state-contract.md` §4.6 (prose-receipt schema).
**Deps**: archive/tickets/SPEC26STOCOHHAR-003.md

## Problem

`branching-story-prose-attach` runs 6 deterministic checks but none verifies that the route outcome of a non-accept action is made *legible in the rendered prose*. SPEC-26 D3's read/verify half adds a seventh check, `choice_consequence_visibility`, that verifies the prose realizes `SE.resolution.player_visible_feedback` (the field created by SPEC26STOCOHHAR-003). Without it, a page that routes a player action to `world_block` but hides why it failed passes prose-attach cleanly — agency is not just having choices, it is seeing that the system understood the choice and why the world responded.

## Assumption Reassessment (2026-05-14)

1. Verified against the current codebase at SPEC-26 Step 2: `branching-story-prose-attach/SKILL.md` defines exactly 6 deterministic checks — `engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority` (lines 167–184) — plus a roll-up `verdict` block (lines 240–245) and a `repair_recommendation` ladder (lines 218–220). The skill cross-references `.claude/skills/_shared-templates/story-state-contract.md` §4.6 ("6 deterministic checks complete per ... §4.6", line 38).
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D3: `choice_consequence_visibility` is `PASS | WARN | FAIL` — `PASS` = prose makes the selected action, route, and immediate consequence legible to a first-time reader; `WARN` = the action occurred but the consequence/route feedback is easy to miss; `FAIL` = prose obscures, contradicts, or omits the consequence (especially for `attempt`/`accommodate`/`world_block`/`promotion_hold`/`terminal` routes). It verifies the prose realizes `SE.resolution.player_visible_feedback`.
3. Cross-skill / cross-artifact boundary under audit: the prose-receipt check set, owned jointly by `branching-story-prose-attach/SKILL.md` (the check definitions, verdict roll-up, repair ladder) and `story-state-contract.md` §4.6 (the prose-receipt direct-write artifact schema). The new check also depends on the `SE.resolution.player_visible_feedback` field from `archive/tickets/SPEC26STOCOHHAR-003.md` — hence the `Deps`.
4. FOUNDATIONS principle under audit: §Story Bundles §4a (Plan-Authority Boundary) — `choice_consequence_visibility` is a prose-receipt check, a rendering-of-state validation, not a second state engine. It reads the committed `SE.resolution` and the rendered prose; it does not mutate page state. This keeps prose-attach within its mandate (validate the rendering; never re-author state).
5. HARD-GATE / Canon Safety surface (per `tickets/README.md` check 9): this ticket adds a sibling check next to `forbidden_mystery_resolution` (the Rule 7 redundant prose-side guard). The enforcement surfaces touched are the prose-attach 6→7 check suite, the roll-up `verdict` block, and the `repair_recommendation` ladder. Confirmed: `choice_consequence_visibility` reads `SE.resolution` and the prose only; it does not relax, reorder, or bypass `forbidden_mystery_resolution`, and it adds no new path that could resolve a `forbidden`-status mystery — the Mystery Reserve firewall is unchanged.
6. Output-schema extension (per `tickets/_TEMPLATE.md` menu item 6): the schema extended is the prose-receipt direct-write artifact at `story-state-contract.md` §4.6 (the `pages-prose-receipts/PG-<integer>.yaml` schema). The extension is additive — a new `choice_consequence_visibility: PASS | WARN | FAIL` field joins the existing six check results. Consumers: the roll-up `verdict` derivation in `branching-story-prose-attach`, and human reviewers reading the receipt; no breaking change to existing receipt readers (a new field with a deterministic value).

## Architecture Check

1. Adding `choice_consequence_visibility` as a seventh deterministic check is cleaner than leaving consequence-legibility to the existing `required_event_rendered` check: `required_event_rendered` verifies the *event* is dramatized, not that the *route outcome and its cause* are legible — the new check has a distinct contract (`SE.resolution.player_visible_feedback`) to verify against, which only exists because SPEC26STOCOHHAR-003 created it. A dedicated check keeps each check single-purpose.
2. No backwards-compatibility aliasing or shims — the new check is net-new; the existing six checks are unchanged in name and semantics.

## Verification Layers

1. The seventh check exists and is wired into the verdict -> codebase grep-proof: `choice_consequence_visibility` appears in `branching-story-prose-attach/SKILL.md` as a defined check, in the roll-up `verdict` block, and (where applicable) in the `repair_recommendation` ladder.
2. The prose-receipt schema carries the new field -> schema validation: `story-state-contract.md` §4.6 lists `choice_consequence_visibility` and the "6 deterministic checks" count is updated to 7.
3. The check verifies against the real contract field -> skill dry-run: `choice_consequence_visibility` fails a page whose prose omits a `world_block` outcome's cause and passes one that renders `SE.resolution.player_visible_feedback`.
4. (Single-layer not applicable — this is a cross-skill + cross-artifact ticket; the three layers map the wiring invariant, the schema-extension invariant, and the behavioral invariant to distinct proof surfaces.)

## What to Change

### 1. prose-attach — add the seventh deterministic check

In `branching-story-prose-attach/SKILL.md`, add `choice_consequence_visibility` (`PASS | WARN | FAIL`) as check 7, defined per Assumption Reassessment item 2. It verifies the rendered prose realizes the page's `SE.resolution.player_visible_feedback`, with `WARN`/`FAIL` graded by how legible the route outcome and its cause are.

### 2. prose-attach — update the verdict roll-up and repair ladder

Update the roll-up `verdict` block (currently lines 240–245) to include `choice_consequence_visibility`. Extend the `repair_recommendation` ladder if a `FAIL` on this check warrants a specific repair route (e.g., `revise_prose` when the prose omits the consequence); otherwise fold it into the existing verdict logic.

### 3. Contract §4.6 — 6 → 7 deterministic checks

In `story-state-contract.md` §4.6 (prose receipt), change "6 deterministic checks" to "7" and add `choice_consequence_visibility` to the receipt's check-result fields. Update the §38 cross-reference count in `branching-story-prose-attach/SKILL.md` ("6 deterministic checks complete per ... §4.6") to match.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.6)

## Out of Scope

- The `SE.resolution` schema/contract/validator/emitter work — that is `archive/tickets/SPEC26STOCOHHAR-003.md`, on which this ticket depends.
- Cross-referencing the Player Agency Contract from `choice_consequence_visibility` — that wiring is owned by SPEC26STOCOHHAR-008 (D7).
- Any change to the six existing prose-attach checks' names or semantics.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'choice_consequence_visibility' .claude/skills/branching-story-prose-attach/SKILL.md` returns the check definition, its appearance in the roll-up `verdict` block, and (if applicable) the repair ladder.
2. `grep -n 'choice_consequence_visibility\|7 deterministic checks\|seven deterministic checks' .claude/skills/_shared-templates/story-state-contract.md` confirms §4.6 carries the new field and the updated count.
3. `grep -nE '6 deterministic checks|six deterministic checks' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md` returns no stale "6"/"six" count references.

### Invariants

1. prose-attach runs exactly 7 deterministic checks; the count is consistent across `branching-story-prose-attach/SKILL.md` and `story-state-contract.md` §4.6.
2. `choice_consequence_visibility` reads `SE.resolution` and the rendered prose only — it never mutates page state (FOUNDATIONS §Story Bundles §4a).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` The prose-attach checks are skill-prose deterministic checks, not tool-validator code; verification is grep-proof + skill dry-run, consistent with how the existing six checks are verified.

### Commands

1. `grep -rn 'choice_consequence_visibility' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
2. `grep -rnE '6 deterministic checks|six deterministic checks' .claude/skills/branching-story-prose-attach/SKILL.md .claude/skills/_shared-templates/story-state-contract.md`
3. A grep-based boundary is correct: prose-attach's checks are skill-prose, not validator binaries — the count-consistency grep plus a manual skill dry-run against a `world_block` page is the full verification surface.
