# SPEC57STCHARPIPINT-002: Page-plan §16a STCHAR packet contract (mandatory)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — promotes the reserved §16a slot in the shared story-state contract to mandatory; consumed by bootstrap (-003), turn-cycle (-004), and prose-attach (-006).
**Deps**: archive/tickets/SPEC57STCHARPIPINT-001.md (the packet projects STCHAR `§Page-Plan Voice Block` and other body-template sections the new skill defines).

## Problem

The page plan is the external renderer's only authority and must not ask it to infer character voice from record ids. SPEC-56 reserved §16a ("STCHAR-derived character authority packets") in `_shared-templates/story-state-contract.md` §8 but left it non-mandatory. This ticket promotes §16a to mandatory and defines the packet shape (SPEC-57 Phase 7, contract portion).

## Assumption Reassessment (2026-05-21)

1. At intake, `.claude/skills/_shared-templates/story-state-contract.md` §8 enumerated page-plan sections including `§16 Cast material reality projection (optional)` and `§16a STCHAR-derived character authority packets (reserved; not yet mandatory)`; the §16a note stated "SPEC-57 will define and promote ... once bootstrap, turn-cycle, and packet-presence enforcement land." This ticket flipped §16a to mandatory and specified its content. §16 (cast material reality) remains a distinct, retained section — do not conflate.
2. SPEC-57 §Phase 7 names the three STCHAR hashes (`profile_hash`, `voice_block_hash`, `page_packet_hash`) as the citations prose-attach validates; these exist in the SPEC-56 schema. No word-count ceiling (FOUNDATIONS §9).
3. Cross-skill boundary under audit: the shared story-state contract §8 is consumed by every page-plan-emitting and page-plan-validating skill (bootstrap, turn-cycle, prose-attach). Per FOUNDATIONS §Story Bundles §5b, skills must not add page-plan sections without amending this contract first — this ticket is that amendment.
4. FOUNDATIONS §4a (Plan is authority, prose is receipt): the §16a packet is the renderer's voice authority; prose-attach validates the receipt against it. The packet must carry human prose, not ids as shorthand.

## Architecture Check

1. Defining the packet once in the shared contract keeps bootstrap, turn-cycle, and prose-attach reading a single source of truth, preventing per-skill drift in what a "voice packet" contains.
2. No backwards-compatibility shim: §16a was reserved, not previously populated; promoting it introduces no alias. The §16a-absent grace clause is removed from the shared contract here; emitter and validator rollout remains owned by follow-up tickets named in Out of Scope.

## Verification Layers

1. §16a is mandatory and fully specified while §16 remains distinct → grep-proof of the contract §8 table rows and §16a body (`rg -n '^\\| 16 \\||^\\| 16a \\||§16a|§16 ' .claude/skills/_shared-templates/story-state-contract.md` shows the retained §16 row plus mandatory §16a wording, not "reserved").
2. Packet enumerates the three hashes + required-because reason + voice authority + appraisal/pressure/relationship/perception/agency fields → manual review against SPEC-57 §Phase 7.
3. Single-layer note: this is a contract-document edit; the proof surfaces are grep + manual contract review. Emitter/validator behavior is proven by -003/-004/-006.

## Landed Changes

### 1. Promoted §16a to mandatory in `story-state-contract.md` §8

The §16a row now describes mandatory relevant STCHAR-derived character authority packets instead of a reserved slot. The trailing note now requires packets for every viewpoint character, speaker, major actor, direct target, emotionally salient character, or any character whose behavior/voice materially shapes the page. The old §16a absence grace clause was removed from the live contract.

### 2. Specified the packet content

The packet template now includes `STENT-/STCHAR-/display name`, required-because reason, the three STCHAR hashes, story-facing identity for this page, voice/dialogue authority projecting STCHAR `Page-Plan Voice Block`, relevant appraisal rules, relevant pressure behavior, relationship-specific conduct, perception/embodiment constraints, agency/planning tendency, prose must-show, prose must-not-imply, and anti-generic warnings. The contract also states that §5/§9/§9b/§9c/§16/§17 are retained and that §16a is voice authority, not a temporal-state replacement.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- Bootstrap/turn-cycle emission of the packet (SPEC57STCHARPIPINT-003 / -004 — they reference this contract).
- Prose-attach validation of the packet (SPEC57STCHARPIPINT-006).
- Any change to §16 (cast material reality projection) or other page-plan sections.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n '^\\| 16 \\||^\\| 16a \\||§16a|§16 ' .claude/skills/_shared-templates/story-state-contract.md` returns the retained §16 row plus mandatory §16a wording (no live contract "reserved; not yet mandatory").
2. Manual review confirms the packet specification names all SPEC-57 §Phase 7 fields including the three hashes.

### Invariants

1. §16 (cast material reality) and §16a (STCHAR voice authority) remain distinct sections; promoting §16a does not repurpose §16.
2. No page-plan section is added or removed except the §16a promotion.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against the contract and the existing pipeline coverage of page-plan section discipline is named in Assumption Reassessment.`

### Commands

1. `rg -n '^\\| 16 \\||^\\| 16a \\||§16a|§16 ' .claude/skills/_shared-templates/story-state-contract.md`
2. Manual contract review against SPEC-57 §Phase 7.
3. A grep + manual review is the correct boundary because the deliverable is a shared-contract section-discipline edit with no executable surface of its own.

## Outcome

Completed: 2026-05-21

Promoted `.claude/skills/_shared-templates/story-state-contract.md` §8 §16a from a reserved slot to a mandatory relevant STCHAR-derived character authority packet. The packet now names the triggering character roles, required `STENT`/`STCHAR`/display-name identity, the three STCHAR hashes, story-facing identity, voice/dialogue authority, appraisal, pressure behavior, relationship conduct, perception/embodiment, agency/planning tendency, prose must-show/must-not-imply, and anti-generic warnings. §16 remains the separate cast-material-reality projection.

## Verification Result

- `rg -n '^\\| 16 \\||^\\| 16a \\||§16a|§16 ' .claude/skills/_shared-templates/story-state-contract.md` — PASS; §16 remains the retained cast-material-reality row, and §16a now appears as mandatory STCHAR voice authority without the reserved/not-yet-mandatory live contract wording.
- The field-presence grep below passed; the live packet template names the SPEC-57 Phase 7 packet fields and the `CHAR-*` operational-authority prohibition.

```sh
rg -n 'profile_hash|voice_block_hash|page_packet_hash|Required because|Voice/dialogue authority|Relevant appraisal rules|Relevant pressure behavior|Relationship-specific conduct|Perception and embodiment constraints|Agency and planning tendency|Anti-generic warnings|world `CHAR-\*`' .claude/skills/_shared-templates/story-state-contract.md
```
- Manual review against SPEC-57 §Phase 7 and `docs/FOUNDATIONS.md` §6.1 — PASS; the contract defines §16a as the renderer's STCHAR voice/behavior authority, preserves §16 and adjacent page-plan sections, and keeps world `CHAR` out of runtime characterization.

## Deviations

- The spec and this ticket retain historical mentions that SPEC-56 reserved §16a as "not yet mandatory"; those are labelled or contextualized as intake/history. The current live contract no longer presents §16a as reserved.
- The drafted `grep -n "§16a\|§16 "` proof was replaced with the accepted `rg` command above because the latter explicitly shows both §8 table rows and the §16a body.
