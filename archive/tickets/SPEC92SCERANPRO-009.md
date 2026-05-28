# SPEC92SCERANPRO-009: branching-story-scene-prose-attach skill

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new skill `.claude/skills/branching-story-scene-prose-attach/`; no impact on existing skills (additive).
**Deps**: archive/tickets/SPEC92SCERANPRO-004.md, archive/tickets/SPEC92SCERANPRO-007.md

## Problem

Rendered scene prose must be validated against every included PG and attached via a receipt, without mutating story state. This skill is the scene-level analogue of `branching-story-prose-attach`.

## Assumption Reassessment (2026-05-28)

1. At intake, no `.claude/skills/branching-story-scene-prose-attach/` existed. This ticket added the skill and composed SCN retrieval (-004) with the scene-prose-receipt schema/content validators (-007), modeling on the existing `branching-story-prose-attach` skill while keeping scene attach non-authoritative.
2. SPEC-92 §6 + §Acceptance #5 define the skill: validate `scene-prose/SCN-<n>.md` against all included PGs, write `scene-prose-receipts/SCN-<n>.yaml`, mutate no PG / story state, emit no SE by default.
3. Cross-artifact boundary under audit: the skill consumes the -007 receipt validators + -004 retrieval; it produces `scene-prose-receipts/SCN-<n>.yaml` (direct write) + an INDEX update. It reads the SCN record + included PGs via MCP retrieval.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary — scene prose is a non-authoritative rendering; attach creates no state) + §Rule 7 (the receipt's `scene_range_forbidden_mystery_resolution` preserves the MR firewall) motivate the skill.
5. Skill HARD-GATE / Canon Safety surface: `docs/HARD-GATE-DISCIPLINE.md` was read before authoring. The landed skill's HARD-GATE forbids writing `scene-prose-receipts/<scene_id>.yaml`, updating `INDEX.md`, creating/editing `scene-prose/`, or submitting any patch plan until validation and explicit approval complete. The skill has no `emit_attach_event` option, emits no SE by default, and repeatedly states that it never mutates `PG`, `SCN`, `SE`, or any other `_source` story record.
6. The ticket's drafted "skill dry-run" proof is not executable in the Codex context because `.claude/skills/` are prose workflows without a local runner. Verification was narrowed to manual contract review, grep proof over the landed skill, and whitespace hygiene, which is the strongest truthful proof for this skill deliverable.

## Architecture Check

1. Modeling on `branching-story-prose-attach` (validate → receipt, no state mutation) keeps the scene attach consistent with the page attach; the range-walk over included PGs is the one new concern, delegated to the -007 validators.
2. No shims: net-new skill; does not modify `branching-story-prose-attach` (coexistence).

## Verification Layers

1. Scene prose validated against every included PG -> the -007 range-walk validators.
2. Receipt written; no PG / `_source` state mutated -> manual contract review + grep-proof (no patch submitted, no SE by default).
3. HARD-GATE forbids receipt-write / patch-submit pre-approval -> skill-structure review.

## Landed Changes

### 1. New skill SKILL.md (+ references)

Added `branching-story-scene-prose-attach/SKILL.md`: pre-flight, HARD-GATE (no receipt-write / INDEX update / patch-submit pre-approval), SCN + included PG + end CHC retrieval, range-wide receipt checks, receipt/INDEX write order, post-write validator command, no-state audit, no default SE emission, and no `_source` mutation.

Added focused references:

- `references/receipt-checks.md` — the eight scene receipt checks and roll-up rules.
- `references/write-and-validation.md` — receipt schema shape, direct-write order, validator coverage, and no-state audit.

## Files to Touch

- `.claude/skills/branching-story-scene-prose-attach/SKILL.md` (new)
- `.claude/skills/branching-story-scene-prose-attach/references/*.md` (new, as needed)

## Out of Scope

- The scene-plan skill (-008).
- The receipt validators themselves (-007) and the schema (-002).
- FOUNDATIONS §7 roster update + WORKFLOWS entry (-010).

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review: the skill requires every included PG to be retrieved and validated through the receipt checks before approval.
2. Manual contract review: Rule 7 firewall is represented by `scene_range_forbidden_mystery_resolution` and cannot be downgraded from FAIL.
3. Grep proof: HARD-GATE present forbidding receipt-write / INDEX update / patch-submit pre-approval, and no-state-mutation language present.

### Invariants

1. The skill never mutates the PG record or any `_source/` state record.
2. No SE is emitted by default.

## Test Plan

### New/Modified Tests

1. `None — skill deliverable; verification is manual contract review + grep-proof of HARD-GATE + no-state-mutation, per Assumption Reassessment.`

### Commands

1. `grep -n "HARD-GATE\|never mutate\|no SE\|Do not submit a patch plan\|no _source" .claude/skills/branching-story-scene-prose-attach/SKILL.md .claude/skills/branching-story-scene-prose-attach/references/*.md`
2. `rg -n "emit_attach_event|SE-<integer>|mcp__worldloom__submit_patch_plan|_source|scene-prose-receipts|scene_prose_receipt_content|scene_prose_receipt_schema_compliance" .claude/skills/branching-story-scene-prose-attach`

## Outcome

Completed: 2026-05-28

Added the `branching-story-scene-prose-attach` skill and two focused references. The skill validates rendered scene prose over the full `SCN.pg_ids` range, emits a `scene-prose-receipts/SCN-<integer>.yaml` receipt, updates bundle `INDEX.md` only after explicit approval, and preserves the plan-authority boundary by never mutating `PG`, `SCN`, `SE`, or other `_source` story records.

## Verification Result

1. Manual contract review — PASS: the skill loads FOUNDATIONS and shared story contracts, retrieves SCN / included PGs / end CHCs via typed retrieval, evaluates all eight receipt checks range-wide, requires one-line authority-cited PASS rationales, and records strict-mode publication behavior without changing state.
2. `grep -n "HARD-GATE\|never mutate\|no SE\|Do not submit a patch plan\|no _source" .claude/skills/branching-story-scene-prose-attach/SKILL.md .claude/skills/branching-story-scene-prose-attach/references/*.md` — PASS: HARD-GATE, no-state mutation, and no patch-plan anchors are present.
3. `rg -n "emit_attach_event|SE-<integer>|mcp__worldloom__submit_patch_plan|_source|scene-prose-receipts|scene_prose_receipt_content|scene_prose_receipt_schema_compliance" .claude/skills/branching-story-scene-prose-attach` — PASS by manual classification: `emit_attach_event` appears only in the statement that the skill has no such option; `mcp__worldloom__submit_patch_plan` appears only inside the HARD-GATE prohibition; `_source` appears only in no-state-mutation/read-discipline language; the receipt validators are named in the validation reference.
4. `git add -N .claude/skills/branching-story-scene-prose-attach/SKILL.md .claude/skills/branching-story-scene-prose-attach/references/receipt-checks.md .claude/skills/branching-story-scene-prose-attach/references/write-and-validation.md && git diff --check -- .claude/skills/branching-story-scene-prose-attach archive/tickets/SPEC92SCERANPRO-009.md` — PASS; intent-to-add markers were cleared afterward with `git reset -- ...`.

## Deviations

- Replaced the drafted skill dry-run proof with manual contract review plus grep proof because the `.claude/skills/` prose workflow has no executable runner in the Codex context.
