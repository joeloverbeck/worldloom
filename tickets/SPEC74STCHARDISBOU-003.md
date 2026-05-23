# SPEC74STCHARDISBOU-003: _shared-templates/story-state-contract.md §16a projection-vs-authority rewrite + grounding-records field

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §16a section rewrite + new packet field (`Current-state grounding records:`)
**Deps**: None

## Problem

The shared `story-state-contract.md` §16a description does not currently frame §16a as a page-local projection of stable STCHAR authority through active current state — readers may interpret §16a as a place where current state lives inside STCHAR. There is no `Current-state grounding records:` packet field, so page-local modulations that depend on current state (e.g., a viewpoint character's current fear) cannot be structurally linked to the active STEMO/BEL/STPLAN/etc. records that ground them. SPEC74STCHARDISBOU-010 introduces a validator (`page_plan_stchar_packet_integrity` extension) that requires the new field; this ticket establishes the contract that validator enforces.

## Assumption Reassessment (2026-05-23)

1. Verified current `.claude/skills/_shared-templates/story-state-contract.md` at the §16a section: the field list currently includes `STENT / STCHAR / display name`, `Required because:` (composite, per SPEC-73's multi-label parsing), `Stable STCHAR seed used`, `Page-local projection`, `Prose must-show`, `Prose must-not-imply`, `Anti-generic warnings` — no `Current-state grounding records:` field; no projection-vs-authority framing currently present.
2. Verified SPEC-74 §4.3 specifies the §16a rewrite + new field add; SPEC-74 §3 (Out of Scope) explicitly drops the source-report's hash citations (`profile_hash`, `voice_block_hash`, `page_packet_hash`) — they no longer exist post-SPEC-71, and §6.3's verbatim text proposing them is rejected.
3. Cross-skill boundary under audit: the §16a packet contract this template defines IS consumed by (a) `branching-story-bootstrap` Phase 8 (root page-plan authoring), (b) `branching-story-turn-cycle` Phase 7 page-plan authoring (per SPEC74STCHARDISBOU-005), and (c) `page-plan-stchar-packet-integrity.ts` validator (per SPEC74STCHARDISBOU-010). The new `Current-state grounding records:` field IS the contract between the §16a packet author and the validator's `stale_current_state_reference` / `grounding_records_none_with_citations` checks.
4. FOUNDATIONS principle restated: §Story Bundles §5c ("Present Causal State, Not Narrative Shape") — §16a is the page-local projection composing stable STCHAR authority + active current state, not a place where current state migrates into STCHAR.
5. HARD-GATE / Canon Safety Check surface touched: the §16a packet contract gates the `page_plan_stchar_packet_integrity` validator's behavior (SPEC74STCHARDISBOU-010 extension); the new field is the structural anchor for the new pre-apply check. The contract change does NOT weaken the Mystery Reserve firewall (MR firewall lives at the canon-pipeline layer; §16a is story-bundle-scope and reads only story-bundle records).

## Architecture Check

1. The projection-vs-authority framing makes the existing-but-implicit contract explicit: §16a composes stable STCHAR seed + active state at render time; current state does NOT live inside STCHAR. This is wording that ratifies what the validator already structurally requires — no new mechanism, just clearer authoring discipline.
2. No backwards-compatibility shims. Existing §16a packets that lack the `Current-state grounding records:` field will fail the SPEC74STCHARDISBOU-010 validator extension when that ticket lands; the migration is covered by SPEC74STCHARDISBOU-013's red-bunny remediation pass. Existing packets that explicitly reference no current state may emit the new field as `Current-state grounding records: none; stable STCHAR authority only.` to make the no-grounding case explicit.

## Verification Layers

1. **§16a projection-vs-authority framing present** → codebase grep-proof: `grep -n 'page-local projection' .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 match in the §16a section.
2. **`Current-state grounding records:` field added to per-character packet structure** → grep-proof: `grep -n 'Current-state grounding records:' .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 match.
3. **No hash-field reintroduction** → grep-proof: `grep -nE 'profile_hash|voice_block_hash|page_packet_hash' .claude/skills/_shared-templates/story-state-contract.md` returns 0 matches in the §16a section (per SPEC-71's strip + SPEC-74 §3 Out of Scope explicit drop).
4. **Forbid-CHAR-as-page-plan-authority rule explicit** → grep-proof: `grep -n 'Forbid citing world `CHAR-\*` as operational page-plan characterization authority\|must not cite world `CHAR-\*` as operational page-plan' .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 match.

## What to Change

### 1. Replace §16a description

The §16a section currently describes the packet's required fields; rewrite its preamble to make the projection-vs-authority framing explicit:

> §16a is a page-local projection composing (1) stable STCHAR authority, (2) active current story-state records in the page snapshot, and (3) this page's rendering needs. STCHAR supplies stable voice / conduct / appraisal / pressure behavior / relationship behavior / perception / embodiment / agency tendencies / capabilities / limits / anti-generic constraints. Active records supply current physical condition / belief / plan / emotion / relationship state / pressure / secret-question-clock state / location / objects / causal event. A §16a packet must not imply that current state lives inside STCHAR.

### 2. Add new `Current-state grounding records:` field to the per-character packet structure

Insert the new field into the per-character packet field list (immediately after `Stable STCHAR seed used` is the natural placement; choose the position that reads naturally in the surrounding field list). When page-local modulation depends on active state, the field names the active records that ground the modulation, cited by id — e.g., `STEMO-3, BEL-7, STPLAN-2`. When no current-state record is needed, the field reads:

```
Current-state grounding records: none; stable STCHAR authority only.
```

Forbid citing world `CHAR-*` as operational page-plan characterization authority.

### 3. Post-SPEC-71 packet field list (canonical reference)

State the canonical post-SPEC-71 / post-this-spec field list explicitly:
- `STENT / STCHAR / display name`
- `Required because:` (composite, per SPEC-73)
- `Stable STCHAR seed used`
- `Current-state grounding records:` (this spec)
- `Page-local projection`
- `Prose must-show`
- `Prose must-not-imply`
- `Anti-generic warnings`

Do NOT reintroduce any hash fields. SPEC-71 removed `profile_hash`, `voice_block_hash`, `page_packet_hash`; the schema's `additionalProperties: false` + the `forbidden_stchar_tamper_hash_fields` validator structurally prevent reintroduction.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- The validator extension that consumes this new field (SPEC74STCHARDISBOU-010 — adds `stale_current_state_reference` + `grounding_records_none_with_citations` checks).
- `phase-7-page-plan.md` §16a paragraph rewrite (SPEC74STCHARDISBOU-005 — same convention, different file).
- `story-record-schemas.md` STCHAR prose + field rule (SPEC74STCHARDISBOU-004).
- Any reintroduction of STCHAR hash fields (forbidden by SPEC-71 + the existing `forbidden_stchar_tamper_hash_fields` validator).
- Migration of existing §16a packets in red-bunny prose-plans (covered by SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'page-local projection' .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 match in the §16a section.
2. `grep -n 'Current-state grounding records:' .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 match.
3. `grep -n 'none; stable STCHAR authority only' .claude/skills/_shared-templates/story-state-contract.md` returns ≥1 match (the no-grounding case explicit form).
4. `grep -nE 'profile_hash|voice_block_hash|page_packet_hash' .claude/skills/_shared-templates/story-state-contract.md` returns 0 matches in or adjacent to the §16a section.
5. The forbid-world-CHAR-authority rule is present in the §16a section.

### Invariants

1. §16a is a projection layer composing stable STCHAR authority + active current state; current state does NOT live inside STCHAR.
2. Page-local modulations depending on current state MUST cite the grounding records via the new field; the no-grounding case has its own explicit form (`Current-state grounding records: none; stable STCHAR authority only.`).
3. World `CHAR-*` records MUST NOT be cited as operational page-plan characterization authority — only story-local STCHAR profiles serve that role at runtime.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'Current-state grounding records:\|page-local projection' .claude/skills/_shared-templates/story-state-contract.md` (confirms both new field + projection framing)
2. `grep -nE 'profile_hash|voice_block_hash|page_packet_hash' .claude/skills/_shared-templates/story-state-contract.md` (confirms 0 hash-field reintroductions)
3. Manual inspection of the §16a section's per-character packet field list to confirm the canonical post-SPEC-71 field set + new grounding-records field appears in the documented order.
