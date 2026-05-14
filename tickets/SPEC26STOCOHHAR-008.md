# SPEC26STOCOHHAR-008: Add Player Agency Contract to STORY_KERNEL.md

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `branching-story-bootstrap`, `branching-story-turn-cycle`, and `branching-story-prose-attach` skill prose. No schema, MCP, or validator change.
**Deps**: SPEC26STOCOHHAR-004

## Problem

The player's agency surface is implicit. `branching-story-turn-cycle`'s Phase 9 action-source-legality check must know which `STENT` the player controls and whether the player may act on knowledge the viewpoint character lacks — today it infers this per turn. `branching-story-bootstrap` does not even enumerate the sections it writes into `STORY_KERNEL.md`. SPEC-26 D7 makes the agency surface an explicit authored contract.

## Assumption Reassessment (2026-05-14)

1. Verified against the current codebase at SPEC-26 Step 2: `branching-story-turn-cycle/SKILL.md` Phase 9 additional check 1 is "action source legality" (confirmed at `:43`, `:342`). `branching-story-bootstrap/SKILL.md` writes `STORY_KERNEL.md` (confirmed — it is in the bootstrap write set) but does not enumerate the sections it places there. `branching-story-prose-attach/SKILL.md` runs `entity_status_consistency` as one of its deterministic checks.
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D7: the `## Player Agency Contract` section carries three load-bearing bullets — **Agency surface** (which `STENT` record(s) the player primarily controls), **Write-in envelope** (what kinds of manual actions are admissible), **Viewpoint limits** (whether the player may act on knowledge the viewpoint character lacks). The report's other three bullets (control style, impossible-action policy, consequence-visibility promise) are dropped — they restate `FOUNDATIONS.md` or are authorial taste with no consumer.
3. Cross-skill / cross-artifact boundary under audit: the `STORY_KERNEL.md` Player Agency Contract section, authored by `branching-story-bootstrap`, read by `branching-story-turn-cycle` Phase 9 check 1 (as a routing input) and `branching-story-prose-attach` (as a cross-reference for `entity_status_consistency` and the new `choice_consequence_visibility` check). `STORY_KERNEL.md` is a primary-authored direct-write markdown surface (FOUNDATIONS §Story Bundles §4 / §2) — not an atomic `_source/*.yaml` record — so no schema or patch-engine surface is involved.
4. HARD-GATE / gate-validation surface (per `tickets/README.md` check 9): this ticket makes `branching-story-turn-cycle` Phase 9 additional check 1 (action-source legality) *read* the Player Agency Contract — Phase 9 is the validation phase preceding the Phase 10 HARD-GATE. Confirmed: the change supplies check 1 a stable routing input (agency surface + viewpoint limits) that it currently infers; it does not weaken the check, touch gate 3 (mystery/invariant firewall), resolve any `forbidden`-status mystery, or alter HARD-GATE ordering. The Mystery Reserve firewall is unchanged.
5. Mismatch + correction: `branching-story-bootstrap` writes `STORY_KERNEL.md` but does not enumerate its sections, so there is no contract for what the file must contain — the Player Agency Contract has nowhere defined to live, and check 1's routing input is unspecified. Correction — bootstrap gains an explicit `STORY_KERNEL.md` section enumeration that includes the required `## Player Agency Contract` section; turn-cycle check 1 reads it; prose-attach cross-references it.

## Architecture Check

1. An explicit authored contract is cleaner than per-turn inference: `branching-story-turn-cycle` check 1 currently re-infers the agency surface and viewpoint limits every turn, which is non-deterministic and unauditable. A `STORY_KERNEL.md` section authored once at bootstrap gives check 1 and prose-attach a stable, reviewable routing input. Trimming the contract to the three load-bearing bullets (dropping the three that restate FOUNDATIONS or carry no consumer) keeps it minimal.
2. No backwards-compatibility aliasing or shims — the section is net-new; bootstrap's `STORY_KERNEL.md` section enumeration is added, not aliased over an old implicit convention.

## Verification Layers

1. bootstrap authors the section -> skill dry-run: `branching-story-bootstrap` emits a `STORY_KERNEL.md` containing a `## Player Agency Contract` section with the three bullets, and its `STORY_KERNEL.md` section enumeration lists that section.
2. turn-cycle check 1 reads the contract -> codebase grep-proof: `branching-story-turn-cycle/SKILL.md` Phase 9 additional check 1 prose references reading the Player Agency Contract when parsing `manual_action_text`.
3. prose-attach cross-references the contract -> codebase grep-proof: `branching-story-prose-attach/SKILL.md` references the Player Agency Contract from `entity_status_consistency` and the `choice_consequence_visibility` check (the latter created by SPEC26STOCOHHAR-004, hence the `Deps`).
4. (Single-layer not applicable — this is a cross-skill ticket; the three layers map the authoring invariant, the routing-input invariant, and the prose-validation cross-reference invariant to distinct proof surfaces.)

## What to Change

### 1. bootstrap — enumerate STORY_KERNEL.md sections + add the Player Agency Contract

In `branching-story-bootstrap/SKILL.md`, add an explicit enumeration of the sections it writes into `STORY_KERNEL.md`, and include a required `## Player Agency Contract` section with the three bullets (Agency surface / Write-in envelope / Viewpoint limits), drafted at bootstrap.

### 2. turn-cycle — Phase 9 check 1 reads the contract

In `branching-story-turn-cycle/SKILL.md`, Phase 9 additional check 1 (action-source legality) **must** read the Player Agency Contract when parsing `manual_action_text` — the agency surface and viewpoint limits become explicit routing inputs rather than inferred.

### 3. prose-attach — cross-reference the contract

In `branching-story-prose-attach/SKILL.md`, cross-reference the Player Agency Contract when running `entity_status_consistency` and the `choice_consequence_visibility` check (from SPEC26STOCOHHAR-004), to flag prose implying a broader or narrower agency surface than the contract permits.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- The three dropped bullets (control style, impossible-action policy, consequence-visibility promise) — explicitly out of scope per SPEC-26 D7.
- Any atomic `_source/*.yaml` record schema — `STORY_KERNEL.md` is a primary-authored markdown surface, not an atomic record.
- The `choice_consequence_visibility` check itself — created by SPEC26STOCOHHAR-004; this ticket only adds the Agency Contract cross-reference to it.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'Player Agency Contract' .claude/skills/branching-story-bootstrap/SKILL.md` returns the section in bootstrap's `STORY_KERNEL.md` section enumeration, and the enumeration itself is present.
2. `grep -n 'Player Agency Contract' .claude/skills/branching-story-turn-cycle/SKILL.md` returns the Phase 9 check 1 read reference.
3. `grep -n 'Player Agency Contract' .claude/skills/branching-story-prose-attach/SKILL.md` returns the cross-reference from `entity_status_consistency` / `choice_consequence_visibility`.

### Invariants

1. `branching-story-bootstrap` enumerates every section it writes into `STORY_KERNEL.md`, and the `## Player Agency Contract` section is required in that enumeration.
2. The Player Agency Contract carries exactly the three load-bearing bullets — agency surface, write-in envelope, viewpoint limits — and no schema field is introduced (`STORY_KERNEL.md` stays a primary-authored markdown surface).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` `STORY_KERNEL.md` is a primary-authored markdown artifact with no validator binding; verification is grep-proof + skill dry-run.

### Commands

1. `grep -rn 'Player Agency Contract' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md`
2. `grep -nE 'STORY_KERNEL.md|Agency surface|Write-in envelope|Viewpoint limits' .claude/skills/branching-story-bootstrap/SKILL.md` (confirms the section enumeration + the three bullets)
3. A grep-plus-dry-run boundary is correct: `STORY_KERNEL.md` is a markdown surface with no schema validator — a bootstrap skill dry-run inspecting the emitted `STORY_KERNEL.md` is the behavioral verification surface.
