# SPEC57STCHARPIPINT-002: Page-plan §16a STCHAR packet contract (mandatory)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — promotes the reserved §16a slot in the shared story-state contract to mandatory; consumed by bootstrap (-003), turn-cycle (-004), and prose-attach (-006).
**Deps**: SPEC57STCHARPIPINT-001 (the packet projects STCHAR `§Page-Plan Voice Block` and other body-template sections the new skill defines).

## Problem

The page plan is the external renderer's only authority and must not ask it to infer character voice from record ids. SPEC-56 reserved §16a ("STCHAR-derived character authority packets") in `_shared-templates/story-state-contract.md` §8 but left it non-mandatory. This ticket promotes §16a to mandatory and defines the packet shape (SPEC-57 Phase 7, contract portion).

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/_shared-templates/story-state-contract.md` §8 enumerates page-plan sections including `§16 Cast material reality projection (optional)` and `§16a STCHAR-derived character authority packets (reserved; not yet mandatory)`; the §16a note states "SPEC-57 will define and promote ... once bootstrap, turn-cycle, and packet-presence enforcement land." This ticket flips §16a to mandatory and specifies its content. §16 (cast material reality) is a distinct, retained section — do not conflate.
2. SPEC-57 §Phase 7 names the three STCHAR hashes (`profile_hash`, `voice_block_hash`, `page_packet_hash`) as the citations prose-attach validates; these exist in the SPEC-56 schema. No word-count ceiling (FOUNDATIONS §9).
3. Cross-skill boundary under audit: the shared story-state contract §8 is consumed by every page-plan-emitting and page-plan-validating skill (bootstrap, turn-cycle, prose-attach). Per FOUNDATIONS §Story Bundles §5b, skills must not add page-plan sections without amending this contract first — this ticket is that amendment.
4. FOUNDATIONS §4a (Plan is authority, prose is receipt): the §16a packet is the renderer's voice authority; prose-attach validates the receipt against it. The packet must carry human prose, not ids as shorthand.

## Architecture Check

1. Defining the packet once in the shared contract keeps bootstrap, turn-cycle, and prose-attach reading a single source of truth, preventing per-skill drift in what a "voice packet" contains.
2. No backwards-compatibility shim: §16a was reserved, not previously populated; promoting it introduces no alias and breaks no prior page plan (the §16a-absent grace clause is removed only once emitters land — see Out of Scope).

## Verification Layers

1. §16a is mandatory and fully specified → grep-proof of the contract §8 (`grep -n "§16a" .claude/skills/_shared-templates/story-state-contract.md` shows mandatory wording, not "reserved").
2. Packet enumerates the three hashes + required-because reason + voice authority + appraisal/pressure/relationship/perception/agency fields → manual review against SPEC-57 §Phase 7.
3. Single-layer note: this is a contract-document edit; the proof surfaces are grep + manual contract review. Emitter/validator behavior is proven by -003/-004/-006.

## What to Change

### 1. Promote §16a to mandatory in `story-state-contract.md` §8

Rewrite the §16a row and its trailing note: §16a is mandatory for every viewpoint / speaker / major actor / direct target / emotionally salient character (or any whose behavior/voice materially shapes the page). Remove the "skills must not fail a page plan solely because §16a is absent" grace clause (or scope it to a one-revision migration window).

### 2. Specify the packet content

Per packet: `STENT-/STCHAR-/display name`; required-because reason; the three STCHAR hashes; story-facing identity for this page; voice/dialogue authority (copy/project STCHAR `§Page-Plan Voice Block`); relevant appraisal rules; relevant pressure behavior; relationship-specific conduct; perception/embodiment (viewpoint/close narration); agency/planning tendency (action-driving characters); prose must-show / must-not-imply / anti-generic warnings. Note that §5/§9/§9b/§9c/§16/§17 are retained — §16a is voice authority, not a temporal-state replacement.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- Bootstrap/turn-cycle emission of the packet (SPEC57STCHARPIPINT-003 / -004 — they reference this contract).
- Prose-attach validation of the packet (SPEC57STCHARPIPINT-006).
- Any change to §16 (cast material reality projection) or other page-plan sections.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "§16a" .claude/skills/_shared-templates/story-state-contract.md` returns the mandatory wording (no "reserved; not yet mandatory").
2. Manual review confirms the packet specification names all SPEC-57 §Phase 7 fields including the three hashes.

### Invariants

1. §16 (cast material reality) and §16a (STCHAR voice authority) remain distinct sections; promoting §16a does not repurpose §16.
2. No page-plan section is added or removed except the §16a promotion.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against the contract and the existing pipeline coverage of page-plan section discipline is named in Assumption Reassessment.`

### Commands

1. `grep -n "§16a\|§16 " .claude/skills/_shared-templates/story-state-contract.md`
2. Manual contract review against SPEC-57 §Phase 7.
3. A grep + manual review is the correct boundary because the deliverable is a shared-contract section-discipline edit with no executable surface of its own.
