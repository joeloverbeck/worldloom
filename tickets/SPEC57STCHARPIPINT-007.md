# SPEC57STCHARPIPINT-007: Health-audit phase 2m + optional source-drift mode

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — adds a structural phase 2m + an optional source-drift mode to `branching-story-health-audit`; no new tool/schema.
**Deps**: SPEC57STCHARPIPINT-001 (audits STCHAR records), SPEC57STCHARPIPINT-002 (checks page-plan §16a packets).

## Problem

Health-audit has no STCHAR-authority checks, so stale/superseded/missing STCHAR, page-plan packet gaps, and split character authority go undetected. SPEC-57 Phase 6 adds structural phase 2m and an optional advisory source-drift mode (realizing the prior triage's Option D) that never rewrites STCHAR automatically.

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/branching-story-health-audit/SKILL.md` currently defines structural phases 2a–2l (replay, branch isolation, debt, belief/visibility, DA, mystery/canon, continuation, causal dependency, canon baseline drift, CLK/STSEC/STQ, STPLAN/STEMO, active-state underuse); there is no 2m. `2m` is the next available slot.
2. SPEC-57 §Phase 6 specifies the 2m checks (`stent_missing_required_stchar`, `stchar_unresolved`, `stchar_not_active_for_bound_stent`, `stchar_superseded_still_active`, `page_plan_missing_stchar_packet`, `page_plan_stchar_hash_mismatch`, `choice/plan/emotion_character_grounding_missing`, `split_character_authority`, `repeated_profile_fidelity_failure`) and the optional source-drift mode (compares `STCHAR.source_char_hash` against current `CHAR-*` content hash; advisory only). The STCHAR `source_char_hash` field exists in the SPEC-56 schema; the world-index `stchar_source_character` edge supports the drift comparison.
3. Cross-skill boundary under audit: the §16a page-plan packet (SPEC57STCHARPIPINT-002) and the STCHAR record/hashes (SPEC-56) are the surfaces 2m inspects; the `profile_fidelity` receipt block (SPEC57STCHARPIPINT-006) is the source of `repeated_profile_fidelity_failure`.
4. FOUNDATIONS §6.1 (default mode must not re-read world `CHAR` for drift) and Rule 7 (mystery firewall preserved — the audit reports, it does not resolve): the source-drift mode is advisory and never rewrites STCHAR; default mode stays firewalled from world `CHAR`.

## Architecture Check

1. Making source-drift an optional advisory mode (rather than a default check) preserves the runtime firewall — normal health audits never touch world `CHAR` — while still surfacing drift when explicitly requested. Auto-rewriting STCHAR on drift would violate Rule 6 (silent retcon) and the firewall.
2. No backwards-compatibility shim: 2m is a net-new phase; no existing phase is repurposed.

## Verification Layers

1. Phase 2m reports missing/stale/split-authority/page-plan/prose-fidelity failures → skill dry-run over a fixture bundle with seeded faults.
2. Default mode does not read world `CHAR` → grep-proof + manual review that 2m's default path consults only story-bundle records.
3. Optional source-drift mode is advisory only → dry-run confirms it reports drift without emitting any STCHAR supersession.
4. Single-layer note beyond the above is N/A — health-audit is LLM-executed; the proof surfaces are dry-run + grep of the SKILL.md phase list.

## What to Change

### 1. Add structural phase 2m

Insert "Phase 2m: STCHAR authority health" after 2l with the nine checks named in §Phase 6.

### 2. Add optional source-drift mode

Add an opt-in mode comparing `STCHAR.source_char_hash` to the current `CHAR-*` content hash, reporting advisory drift only; document that it never rewrites STCHAR and that default mode does not read world `CHAR`. Update the FOUNDATIONS Alignment table to reference STCHAR.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- The `profile_fidelity` receipt block it consumes (SPEC57STCHARPIPINT-006).
- Any automatic STCHAR regeneration on drift (advisory only; regeneration is `story-character-profile`'s `regenerate` mode).
- The STCHAR authoring skill (SPEC57STCHARPIPINT-001).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "2m\|STCHAR authority health\|source-drift" .claude/skills/branching-story-health-audit/SKILL.md` shows the new phase + mode.
2. Dry-run over a fixture bundle with a superseded-but-active STCHAR and a missing page-plan packet reports `stchar_superseded_still_active` and `page_plan_missing_stchar_packet`.
3. Dry-run of the source-drift mode reports drift and emits no STCHAR supersession.

### Invariants

1. Default health-audit mode reads no world `CHAR`.
2. Source-drift mode never rewrites or supersedes STCHAR.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; health-audit is LLM-executed and verified by dry-run + grep-proof. The STCHAR source_char_hash field it reads is covered by existing SPEC-56 schema tests.`

### Commands

1. `grep -n "2m\|STCHAR\|source-drift\|source_char_hash" .claude/skills/branching-story-health-audit/SKILL.md`
2. Health-audit dry-run (default + source-drift modes) over a fixture bundle with seeded STCHAR faults.
3. Dry-run + grep is the correct boundary because health-audit emits a report, not code; its inputs (STCHAR schema/hashes) are validator-covered.
