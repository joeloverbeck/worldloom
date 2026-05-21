# SPEC57STCHARPIPINT-007: Health-audit phase 2m + optional source-drift mode

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — adds a structural phase 2m + an optional source-drift mode to `branching-story-health-audit`; no new tool/schema.
**Deps**: archive/tickets/SPEC57STCHARPIPINT-001.md (audits STCHAR records), archive/tickets/SPEC57STCHARPIPINT-002.md (checks page-plan §16a packets).

## Problem

Health-audit has no STCHAR-authority checks, so stale/superseded/missing STCHAR, page-plan packet gaps, and split character authority go undetected. SPEC-57 Phase 6 adds structural phase 2m and an optional advisory source-drift mode (realizing the prior triage's Option D) that never rewrites STCHAR automatically.

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/branching-story-health-audit/SKILL.md` currently defines structural phases 2a–2l (replay, branch isolation, debt, belief/visibility, DA, mystery/canon, continuation, causal dependency, canon baseline drift, CLK/STSEC/STQ, STPLAN/STEMO, active-state underuse); there is no 2m. `2m` is the next available slot.
2. SPEC-57 §Phase 6 specifies the 2m checks (`stent_missing_required_stchar`, `stchar_unresolved`, `stchar_not_active_for_bound_stent`, `stchar_superseded_still_active`, `page_plan_missing_stchar_packet`, `page_plan_stchar_hash_mismatch`, `choice/plan/emotion_character_grounding_missing`, `split_character_authority`, `repeated_profile_fidelity_failure`) and the optional source-drift mode (compares `STCHAR.source_char_hash` against current `CHAR-*` content hash; advisory only). The STCHAR `source_char_hash` field exists in the SPEC-56 schema; the world-index `stchar_source_character` edge supports the drift comparison.
3. Cross-skill boundary under audit: the §16a page-plan packet (archive/tickets/SPEC57STCHARPIPINT-002.md) and the STCHAR record/hashes (SPEC-56) are the surfaces 2m inspects; the `profile_fidelity` receipt block (archive/tickets/SPEC57STCHARPIPINT-006.md) is the source of `repeated_profile_fidelity_failure`.
4. FOUNDATIONS §6.1 (default mode must not re-read world `CHAR` for drift) and Rule 7 (mystery firewall preserved — the audit reports, it does not resolve): the source-drift mode is advisory and never rewrites STCHAR; default mode stays firewalled from world `CHAR`.
5. HARD-GATE read: required and completed because the health-audit `<HARD-GATE>` phase-completion list changed from 12 to 13 structural sub-phases. The edit preserves approval timing, write boundaries, and direct-write audit surfaces; it only updates what analysis must complete before the existing approval gate can fire.
6. Reassessment correction: this repo does not expose an executable runner for `.claude/skills/<slug>/` dry-runs in Codex. The accepted proof surface is manual contract review plus grep/stale-anchor proof over `branching-story-health-audit/SKILL.md`, not a claimed live health-audit invocation over a fixture bundle.

## Architecture Check

1. Making source-drift an optional advisory mode (rather than a default check) preserves the runtime firewall — normal health audits never touch world `CHAR` — while still surfacing drift when explicitly requested. Auto-rewriting STCHAR on drift would violate Rule 6 (silent retcon) and the firewall.
2. No backwards-compatibility shim: 2m is a net-new phase; no existing phase is repurposed.

## Verification Layers

1. Phase 2m names missing/stale/split-authority/page-plan/prose-fidelity finding codes with repair routing and evidence requirements → grep-proof + manual contract review of `.claude/skills/branching-story-health-audit/SKILL.md`.
2. Default mode does not read world `CHAR` → grep-proof + manual review that 2m's default path consults only story-bundle records.
3. Optional source-drift mode is advisory only → grep-proof + manual review that `source_drift` is opt-in, reports only, and never rewrites or supersedes STCHAR.
4. Single-layer note beyond the above is N/A — health-audit is LLM-executed; the proof surfaces are manual review + grep of the SKILL.md phase list.

## Landed Changes

### 1. Added structural phase 2m

Inserted "Phase 2m: STCHAR authority health" after 2l with the nine checks named in §Phase 6, including missing required STCHAR bindings, unresolved/inactive/superseded STCHAR, missing or hash-mismatched §16a page-plan packets, character-specific grounding gaps, split world-`CHAR` authority, and repeated profile-fidelity failures.

### 2. Added optional source_drift mode

Added an opt-in `source_drift` mode comparing `STCHAR.source_char_hash` to the current `CHAR-*` content hash, reporting advisory drift only. The default structural mode explicitly does not read world `CHAR`, and the mode never rewrites or supersedes STCHAR. The health-audit mode list, HARD-GATE phase list, SAU report template, validation-rule summary, and FOUNDATIONS Alignment table now reference STCHAR authority.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- The `profile_fidelity` receipt block it consumes (archive/tickets/SPEC57STCHARPIPINT-006.md).
- Any automatic STCHAR regeneration on drift (advisory only; regeneration is `story-character-profile`'s `regenerate` mode).
- The STCHAR authoring skill (archive/tickets/SPEC57STCHARPIPINT-001.md).

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n '2m|STCHAR authority health|source_drift|source_char_hash|stchar_superseded_still_active|page_plan_missing_stchar_packet|split_character_authority|repeated_profile_fidelity_failure|Story-Local Character Authority' .claude/skills/branching-story-health-audit/SKILL.md` shows the new phase, mode, finding codes, and FOUNDATIONS alignment.
2. Manual review confirms Phase 2m default mode consults story-bundle records, page plans, prose receipts, indexed STCHAR summaries, and targeted story-record retrieval; it does not read world `CHAR-*`.
3. Manual review confirms `source_drift` reports advisory drift and source-missing findings only, and emits no STCHAR rewrite or supersession path.

### Invariants

1. Default health-audit mode reads no world `CHAR`.
2. Source-drift mode never rewrites or supersedes STCHAR.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; health-audit is LLM-executed and verified by manual contract review + grep-proof. The STCHAR source_char_hash field it reads is covered by existing SPEC-56 schema tests.`

### Commands

1. `rg -n '2m|STCHAR authority health|source_drift|source_char_hash|stchar_superseded_still_active|page_plan_missing_stchar_packet|split_character_authority|repeated_profile_fidelity_failure|Story-Local Character Authority' .claude/skills/branching-story-health-audit/SKILL.md`
2. `rg -n '12 structural|Twelve sub-phases|Valid: structural, compatibility, prose, remediation, cross_story|skill dry-run|Dry-run|dry-run' .claude/skills/branching-story-health-audit/SKILL.md archive/tickets/SPEC57STCHARPIPINT-007.md` (expected: no stale hits outside this ticket's labelled deviation/proof-history text).
3. Manual review + grep is the correct boundary because health-audit emits a report, not code; its inputs (STCHAR schema/hashes) are validator-covered and there is no executable `.claude/skills/<slug>/` runner in this Codex context.

## Outcome

Completed: 2026-05-21

Added Phase 2m STCHAR authority health to `branching-story-health-audit`, including checks for STENT/STCHAR binding, active/superseded STCHAR state, §16a page-plan packet presence and hash fidelity, character-specific grounding, split world-`CHAR` authority, and repeated profile-fidelity failures. Added opt-in `source_drift` advisory mode for comparing `STCHAR.source_char_hash` to the current source `CHAR-*` hash without rewriting or superseding STCHAR.

The skill's mode declarations, HARD-GATE phase list, process flow, world-state prerequisites, pre-flight mode parsing, SAU report template, validation-rule summary, and FOUNDATIONS Alignment table were updated to keep the new phase and mode operationally visible.

## Verification Result

- `rg -n '2m|STCHAR authority health|source_drift|source_char_hash|stchar_superseded_still_active|page_plan_missing_stchar_packet|split_character_authority|repeated_profile_fidelity_failure|Story-Local Character Authority' .claude/skills/branching-story-health-audit/SKILL.md` — PASS; the edited skill names Phase 2m, opt-in `source_drift`, key finding codes, source-hash advisory mode, and the FOUNDATIONS §6.1 alignment row.
- `rg -n '12 structural|Twelve sub-phases|Valid: structural, compatibility, prose, remediation, cross_story|skill dry-run|Dry-run|dry-run' .claude/skills/branching-story-health-audit/SKILL.md archive/tickets/SPEC57STCHARPIPINT-007.md` — PASS after closeout; no stale phase-count, old mode-list, or active dry-run proof claims remain outside labelled deviation/proof-history text.
- Manual review against SPEC-57 §Phase 6, `docs/FOUNDATIONS.md` §Story Bundles §6.1, and `docs/HARD-GATE-DISCIPLINE.md` — PASS; default structural mode stays story-local, `source_drift` is opt-in/advisory only, and the HARD-GATE still waits for explicit approval before audit artifacts are written.

## Deviations

- The drafted health-audit dry-run proof was replaced with manual contract review plus grep proof because Codex has no executable runner for `.claude/skills/<slug>/` dry-runs. This ticket changes LLM-facing skill instructions; the machine-enforced STCHAR schema, hash fields, and receipt blocks are covered by SPEC-56 and archive/tickets/SPEC57STCHARPIPINT-006.md.
