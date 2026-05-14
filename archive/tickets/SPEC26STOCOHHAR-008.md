# SPEC26STOCOHHAR-008: Add Player Agency Contract to STORY_KERNEL.md

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `branching-story-bootstrap`, `branching-story-turn-cycle`, and `branching-story-prose-attach` skill prose, plus SPEC-26 status note. No schema, MCP, or validator change.
**Deps**: archive/tickets/SPEC26STOCOHHAR-004.md

## Problem

At intake, the player's agency surface was implicit. `branching-story-turn-cycle`'s Phase 9 action-source-legality check needed to know which `STENT` the player controls and whether the player may act on knowledge the viewpoint character lacks, but inferred this per turn. `branching-story-bootstrap` did not enumerate the sections it writes into `STORY_KERNEL.md`. SPEC-26 D7 made the agency surface an explicit authored contract.

## Assumption Reassessment (2026-05-14)

1. At intake, verified against the current codebase at SPEC-26 Step 2: `branching-story-turn-cycle/SKILL.md` Phase 9 additional check 1 was "Action source legality"; its pre-flight already loaded `STORY_KERNEL.md`, but the check did not read the Player Agency Contract. `branching-story-bootstrap/SKILL.md` wrote `STORY_KERNEL.md` (confirmed — it was in the bootstrap write set) but did not enumerate the sections it placed there. `branching-story-prose-attach/SKILL.md` ran `choice_consequence_visibility` and `entity_status_consistency`, but did not load or cross-reference `STORY_KERNEL.md`.
2. Verified against `archive/specs/SPEC-26-story-coherence-hardening-ii.md` D7: the `## Player Agency Contract` section carries three load-bearing bullets — **Agency surface** (which `STENT` record(s) the player primarily controls), **Write-in envelope** (what kinds of manual actions are admissible), **Viewpoint limits** (whether the player may act on knowledge the viewpoint character lacks). The report's other three bullets (control style, impossible-action policy, consequence-visibility promise) are dropped — they restate `FOUNDATIONS.md` or are authorial taste with no consumer.
3. Cross-skill / cross-artifact boundary under audit: the `STORY_KERNEL.md` Player Agency Contract section, authored by `branching-story-bootstrap`, read by `branching-story-turn-cycle` Phase 9 check 1 (as a routing input) and `branching-story-prose-attach` (as a cross-reference for `entity_status_consistency` and the new `choice_consequence_visibility` check). `STORY_KERNEL.md` is a primary-authored direct-write markdown surface (FOUNDATIONS §Story Bundles §4 / §2) — not an atomic `_source/*.yaml` record — so no schema or patch-engine surface is involved.
4. HARD-GATE / gate-validation surface (per `tickets/README.md` check 9): this ticket makes `branching-story-turn-cycle` Phase 9 additional check 1 (action-source legality) *read* the Player Agency Contract — Phase 9 is the validation phase preceding the Phase 10 HARD-GATE. Confirmed: the change supplies check 1 a stable routing input (agency surface + viewpoint limits) that it previously inferred; it does not weaken the check, touch gate 3 (mystery/invariant firewall), resolve any `forbidden`-status mystery, or alter HARD-GATE ordering. The Mystery Reserve firewall is unchanged.
5. Mismatch + correction: `branching-story-bootstrap` writes `STORY_KERNEL.md` but does not enumerate its sections, so there is no contract for what the file must contain — the Player Agency Contract has nowhere defined to live, check 1's routing input is unspecified, and prose-attach has no loaded contract to compare against. Correction — bootstrap gains an explicit `STORY_KERNEL.md` section enumeration that includes the required `## Player Agency Contract` section; turn-cycle check 1 reads it; prose-attach loads and cross-references it.
6. Verification correction: no executable story-skill dry-runner is available in this Codex session. The truthful proof surface is manual contract review plus grep-proof over the three edited skill files, matching the earlier SPEC26STOCOHHAR-004 closeout precedent for prose workflow skills.

## Architecture Check

1. An explicit authored contract is cleaner than per-turn inference: before this ticket, `branching-story-turn-cycle` check 1 re-inferred the agency surface and viewpoint limits every turn, which was non-deterministic and unauditable. A `STORY_KERNEL.md` section authored once at bootstrap gives check 1 and prose-attach a stable, reviewable routing input. Trimming the contract to the three load-bearing bullets (dropping the three that restate FOUNDATIONS or carry no consumer) keeps it minimal.
2. No backwards-compatibility aliasing or shims — the section is net-new; bootstrap's `STORY_KERNEL.md` section enumeration is added, not aliased over an old implicit convention.

## Verification Layers

1. bootstrap authors the section -> manual contract review + codebase grep-proof: `branching-story-bootstrap` requires a `STORY_KERNEL.md` containing a `## Player Agency Contract` section with the three bullets, and its `STORY_KERNEL.md` section enumeration lists that section.
2. turn-cycle check 1 reads the contract -> codebase grep-proof: `branching-story-turn-cycle/SKILL.md` Phase 9 additional check 1 prose references reading the Player Agency Contract when parsing `manual_action_text`.
3. prose-attach cross-references the contract -> codebase grep-proof: `branching-story-prose-attach/SKILL.md` references the Player Agency Contract from `entity_status_consistency` and the `choice_consequence_visibility` check (the latter created by `archive/tickets/SPEC26STOCOHHAR-004.md`, hence the `Deps`).
4. (Single-layer not applicable — this is a cross-skill ticket; the three layers map the authoring invariant, the routing-input invariant, and the prose-validation cross-reference invariant to distinct proof surfaces.)

## Landed Changes

### 1. bootstrap — enumerate STORY_KERNEL.md sections + add the Player Agency Contract

`branching-story-bootstrap/SKILL.md` now has an explicit `STORY_KERNEL.md` section contract and requires `## Player Agency Contract` with the three bullets (Agency surface / Write-in envelope / Viewpoint limits), drafted at bootstrap.

### 2. turn-cycle — Phase 9 check 1 reads the contract

`branching-story-turn-cycle/SKILL.md` now loads `STORY_KERNEL.md` `## Player Agency Contract` at pre-flight, uses it when parsing `manual_action_text`, and records the contract read in Phase 9 additional check 1.

### 3. prose-attach — cross-reference the contract

`branching-story-prose-attach/SKILL.md` now loads `STORY_KERNEL.md` `## Player Agency Contract` and cross-references it when running `entity_status_consistency` and `choice_consequence_visibility`, to flag prose implying a broader or narrower agency surface than the contract permits.

### 4. SPEC-26 status note

`archive/specs/SPEC-26-story-coherence-hardening-ii.md` now records D7 as landed by this ticket and treats remaining D7 current-state problem statements as historical intake evidence.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `archive/specs/SPEC-26-story-coherence-hardening-ii.md` (modify — D7 implementation note)

## Out of Scope

- The three dropped bullets (control style, impossible-action policy, consequence-visibility promise) — explicitly out of scope per SPEC-26 D7.
- Any atomic `_source/*.yaml` record schema — `STORY_KERNEL.md` is a primary-authored markdown surface, not an atomic record.
- The `choice_consequence_visibility` check itself — created by `archive/tickets/SPEC26STOCOHHAR-004.md`; this ticket only adds the Agency Contract cross-reference to it.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn 'Player Agency Contract' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` returns the bootstrap section contract, turn-cycle Phase 9 read reference, and prose-attach cross-reference.
2. `grep -nE 'STORY_KERNEL.md|Agency surface|Write-in envelope|Viewpoint limits' .claude/skills/branching-story-bootstrap/SKILL.md` returns the bootstrap `STORY_KERNEL.md` section contract and the three required bullets.
3. `grep -rnE 'Player Agency Contract|manual_action_text|choice_consequence_visibility|entity_status_consistency' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` returns the turn-cycle and prose-attach consumer references.

### Invariants

1. `branching-story-bootstrap` enumerates every section it writes into `STORY_KERNEL.md`, and the `## Player Agency Contract` section is required in that enumeration.
2. The Player Agency Contract carries exactly the three load-bearing bullets — agency surface, write-in envelope, viewpoint limits — and no schema field is introduced (`STORY_KERNEL.md` stays a primary-authored markdown surface).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` `STORY_KERNEL.md` is a primary-authored markdown artifact with no validator binding; verification is grep-proof + manual contract review because no executable story-skill dry-runner is available in this Codex session.

### Commands

1. `grep -rn 'Player Agency Contract' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md`
2. `grep -nE 'STORY_KERNEL.md|Agency surface|Write-in envelope|Viewpoint limits' .claude/skills/branching-story-bootstrap/SKILL.md` (confirms the section enumeration + the three bullets)
3. `grep -rnE 'Player Agency Contract|manual_action_text|choice_consequence_visibility|entity_status_consistency' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md`
4. `grep -n 'D7 landed' archive/specs/SPEC-26-story-coherence-hardening-ii.md`
5. A grep-plus-manual-review boundary is correct: `STORY_KERNEL.md` is a markdown surface with no schema validator, and no executable story-skill dry-runner is available in this Codex session.

## Outcome

Completion date: 2026-05-14.

`branching-story-bootstrap` now defines the `STORY_KERNEL.md` section set and requires `## Player Agency Contract` with Agency surface, Write-in envelope, and Viewpoint limits. `branching-story-turn-cycle` now loads that contract and uses it as the explicit routing input for `manual_action_text` action-source legality. `branching-story-prose-attach` now loads the same contract and cross-references it during `choice_consequence_visibility` and `entity_status_consistency`.

`archive/specs/SPEC-26-story-coherence-hardening-ii.md` now records that D7 landed through this ticket; remaining D7 problem/deliverable prose is historical intake context unless a later ticket reopens it.

## Verification Result

1. `grep -rn 'Player Agency Contract' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` — passed; bootstrap defines the required section, turn-cycle loads and reads it, and prose-attach loads/cross-references it.
2. `grep -nE 'STORY_KERNEL.md|Agency surface|Write-in envelope|Viewpoint limits' .claude/skills/branching-story-bootstrap/SKILL.md` — passed; the section enumeration and three required bullets are present.
3. `grep -rnE 'Player Agency Contract|manual_action_text|choice_consequence_visibility|entity_status_consistency' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` — passed; turn-cycle and prose-attach contain the consumer-side references.
4. `grep -n 'D7 landed' archive/specs/SPEC-26-story-coherence-hardening-ii.md` — passed; SPEC-26 has the D7 implementation note.

## Deviations

1. The drafted skill dry-run was replaced with manual contract review plus grep proof because no executable story-skill dry-runner is available in this Codex session. This is the truthful proof surface for skill-prose direct-write markdown contract changes.
2. `archive/specs/SPEC-26-story-coherence-hardening-ii.md` was added to the file set because the user explicitly supplied `specs/SPEC-26*` as the reference and the same-seam D7 status note would otherwise remain stale.
