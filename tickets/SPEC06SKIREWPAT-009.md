# SPEC06SKIREWPAT-009: SPEC-06 Phase 2 acceptance capstone

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None (no new production code; this is the integration acceptance ticket exercising the pipeline composed by SPEC06SKIREWPAT-001..008)
**Deps**: SPEC06SKIREWPAT-001, SPEC06SKIREWPAT-002, SPEC06SKIREWPAT-003, SPEC06SKIREWPAT-004, SPEC06SKIREWPAT-005, SPEC06SKIREWPAT-006, SPEC06SKIREWPAT-007, SPEC06SKIREWPAT-008 — every per-skill rewrite must land before acceptance can run

## Problem

SPEC-06 §Verification (lines 225–236) specifies "Phase 2 full-migration acceptance" criteria that span every skill rewrite: token reduction ≥80%, every record passes `record_schema_compliance`, reasoning preservation across 3 historical adjudications, role-split discipline (Localizer-Editor-Auditor measured; Localizer fresh-context-window). These criteria cannot be verified per-ticket because they are cross-skill cumulative properties (token reduction is a measurement across runs, not a per-skill property; role-split requires the Localizer pattern to actually fire during a real skill run; reasoning preservation requires comparing pre- vs post-migration adjudication output). Per the spec-integration ticket shape rule in `.claude/skills/spec-to-tickets/SKILL.md` §Step 3, this is a single trailing capstone ticket whose acceptance criteria enumerate the spec's §Verification bullets as test sub-cases.

This ticket introduces no new production code; it exercises the pipeline composed by tickets 001–008 and gates SPEC-06 acceptance.

## Assumption Reassessment (2026-04-26)

1. Tickets SPEC06SKIREWPAT-001 through 008 must land before this ticket can begin. Each per-skill ticket includes its own dry-run + record-schema acceptance criterion; this capstone exercises cross-skill aspects.
2. SPEC-06 §Verification (`specs/SPEC-06-skill-rewrite-patterns.md` lines 225–236) is the authoritative test matrix. SPEC-08 Phase 2 completion gate (`specs/IMPLEMENTATION-ORDER.md` lines 142–151) overlaps and must also be satisfied (zero `world-validate animalia --json` findings; ≥80% token reduction; atomicity injection tests pass; concurrency test passes; per-skill `record_schema_compliance` end-to-end).
3. Cross-skill / cross-artifact boundary: this ticket is the integration boundary. It exercises every skill's atomic-source-routed write path through Hook 3 and validator gates; it measures token usage of canon-addition large-delivery runs against the Phase 0 baseline (per `specs/IMPLEMENTATION-ORDER.md` §Measurement baseline lines 288–296: tool-input tokens for a representative canon-addition run, captured before Phase 1 began).
4. FOUNDATIONS principles under audit:
   - **Rule 5 (No Consequence Evasion)**: every skill rewrite must satisfy validator gates; second-order effects (Hook 3 enforcement, Hook 5 post-write validation, `record_schema_compliance` on engine-emitted records) are exercised end-to-end.
   - **Rule 7 (Preserve Mystery Deliberately)**: every skill rewrite preserves Mystery Reserve firewall semantics; no rewrite silently resolves M-N entries.
5. Per SPEC-14: every record emitted by a rewritten skill (PA frontmatter, character frontmatter, DA frontmatter, atomic CF/CH/M/OQ/INV/ENT/SEC YAML) passes `record_schema_compliance` end-to-end.

## Architecture Check

1. Capstone ticket pattern per `.claude/skills/spec-to-tickets/SKILL.md` §Spec-Integration Ticket Shape: single trailing ticket; acceptance criteria enumerate spec §Verification bullets; introduces no new production code; uses fixture-world-copy strategy if mutating test runs are needed (`fs.cpSync` to a temp root rather than mutating `worlds/animalia/`); re-enumerated counts (not hardcoded). Token-reduction measurement uses real animalia state (read-only).
2. The capstone does not introduce new validators or engine surfaces — all coverage exists per SPEC-03 / SPEC-04 / SPEC-05 Part B.

## Verification Layers

1. End-to-end skill execution → skill dry-run: each of the 8 rewritten skills runs end-to-end on animalia (or a fixture copy where mutation is required); HARD-GATEs fire correctly; engine ops succeed; validators pass
2. Token reduction ≥80% → measurement: capture tool-input tokens for a representative canon-addition large-delivery run on animalia; compare to Phase 0 baseline per `specs/IMPLEMENTATION-ORDER.md` §Measurement baseline; ratio ≥80%
3. Record schema compliance end-to-end → schema validation: `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` reports zero findings on the post-migration animalia state; per-skill integration tests assert engine-emitted output passes `record_schema_compliance`
4. Hook 3 enforcement → Hook 3 trace: synthetic raw `Edit` attempts on `_source/*.yaml` from within each skill are denied; hybrid-file edits permitted
5. Reasoning preservation → manual review: 3 historical adjudications re-run on canon-addition; verdicts and phase-citation coverage match pre-migration baseline (covered partially by SPEC06SKIREWPAT-001 acceptance test 5; this capstone confirms the cross-skill aspect)
6. Role split discipline → run trace: confirm the Localizer pattern (Explore subagent dispatched via `Agent({subagent_type: 'Explore'})`) fires on a canon-addition large delivery; Hook 4 SubagentStart preface is emitted; localization output is structured-evidence bundles (node IDs + summaries), not narrative prose

## What to Change

### 1. Composite acceptance test runner

Compose a runnable acceptance harness (script or documented manual checklist) that:

- Captures Phase 0 baseline tokens for canon-addition large-delivery (read from `specs/IMPLEMENTATION-ORDER.md` §Measurement baseline, OR re-capture by running pre-migration canon-addition on a fixture).
- Runs each of the 8 rewritten skills on animalia (or fixture) and records: tool-input tokens, validator pass/fail set, Hook 3 / Hook 5 trace, dossier / artifact / proposal card / audit record / adjudication record outputs.
- Asserts: every emitted record passes `record_schema_compliance`; token reduction ≥80% for canon-addition large delivery; zero `world-validate animalia --json` findings; per-skill end-to-end output pass.

### 2. Reasoning preservation harness

Re-run 3 historical canon-addition adjudications selected from `worlds/animalia/adjudications/` (selection criteria: span of verdicts — at least one ACCEPT, one ACCEPT_WITH_REQUIRED_UPDATES, one REJECT or REVISE_AND_RESUBMIT; span of complexity — at least one large-delivery, one narrow-proposal); compare verdict + phase-citation coverage pre/post.

### 3. Role split harness

Confirm the Localizer pattern fires on a canon-addition large delivery. Inspect the run's tool-call trace for: `Agent({subagent_type: 'Explore'})` invocation; Hook 4 `additionalContext` emission; structured evidence-bundle output from the subagent.

### 4. Token measurement methodology

Use the same methodology as the Phase 0 baseline (per `specs/IMPLEMENTATION-ORDER.md` §Measurement baseline). Capture across 3 representative runs per skill; report median or mean as documented.

### 5. Cross-spec follow-up

Per SPEC06SKIREWPAT-001 §Out of Scope, the deletion of `phase-15a-checkpoint-grep-reference.md` requires SPEC-07 Part B to drop its reference to that file. This is a cross-spec follow-up surfaced in the SPEC-06 final summary and is not part of this capstone's scope, but the capstone should verify that SPEC-07 Part B has been re-reassessed and updated (or that the cross-spec follow-up is tracked as a known dangling reference).

### 6. Capstone deliverable

Compose a Phase 2 acceptance report (markdown, ad-hoc location TBD by user — typical worldloom convention is `docs/triage/<date>-spec06-acceptance.md` or similar) summarizing the measurement results, validator outcomes, and reasoning-preservation review.

## Files to Touch

- Acceptance harness (script or runbook): location TBD — could be a new `tools/test-harness/` package, a shell script under `tools/`, or a documented manual checklist in `docs/`. Recommend a documented manual checklist + targeted scripts for measurable pieces (token capture, validator runs, Hook 3 trace synthesis), since the Phase 0 baseline used the same shape.
- `docs/triage/<date>-spec06-phase2-acceptance.md` (new) — capstone deliverable summarizing acceptance results.

## Out of Scope

- Per-skill code rewrites (covered by SPEC06SKIREWPAT-001..008)
- New validators, engine ops, MCP tools, or hooks (the pipeline is shipped; this capstone exercises it)
- Spec edits (none should be needed; if acceptance reveals a SPEC-06 defect, route through `/reassess-spec`)
- SPEC-07 Part B docs updates (cross-spec; SPEC-07 owns)
- SPEC-09 Phase 2.5 work (independent track)

## Acceptance Criteria

### Tests That Must Pass

1. **Token reduction ≥80%**: canon-addition large-delivery run on animalia uses ≤20% of Phase 0 baseline tool-input tokens. Measurement methodology matches `specs/IMPLEMENTATION-ORDER.md` §Measurement baseline.
2. **`world-validate animalia --json` zero findings**: post-migration animalia state passes every validator. (Per SPEC-08 Phase 2 completion gate.)
3. **Per-skill `record_schema_compliance` pass**: each of the 8 rewritten skills' emitted records passes `record_schema_compliance` end-to-end.
4. **Hook 3 enforcement**: synthetic raw `Edit` attempt on `_source/*.yaml` from within any skill is denied; hybrid-file edits permitted.
5. **Hook 5 post-write validation**: every successful `submit_patch_plan` triggers Hook 5; failures surface via patch receipt.
6. **Reasoning preservation**: 3 historical canon-addition adjudications re-run; verdicts and phase-citation coverage match pre-migration baseline.
7. **Role split discipline**: Localizer subagent dispatched on a canon-addition large delivery; Hook 4 SubagentStart preface fires; localization output is structured-evidence bundles, not narrative prose.

### Invariants

1. Token-reduction methodology stable: same harness as Phase 0 baseline (per IMPLEMENTATION-ORDER.md §Measurement baseline).
2. Validator coverage complete: zero findings means every active validator passed.
3. End-to-end discipline: every skill's writes route through engine ops (for atomic-source paths) or through direct-Edit on hybrid files (Hook 3 allowlist); no skill bypasses either path.
4. Mystery Reserve firewall preserved across the migration: no skill rewrite silently resolves an M-N entry; semantic firewall judgment remains intact.

## Test Plan

### New/Modified Tests

1. Acceptance harness scripts/runbook (location TBD per Files to Touch). Documentation-only on the runbook side; small targeted scripts for token capture and validator runs.
2. `docs/triage/<date>-spec06-phase2-acceptance.md` (new) — capstone deliverable.

### Commands

1. `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` — zero findings expected
2. `cd tools/world-mcp && npm test && cd ../patch-engine && npm test && cd ../validators && npm test && cd ../hooks && npm test && cd ../world-index && npm test` — every package's test suite passes
3. Manual skill dry-runs across all 8 skills (canon-addition large delivery + create-base-world genesis + character-generation + diegetic-artifact-generation + propose-new-canon-facts + canon-facts-from-diegetic-artifacts + propose-new-characters + continuity-audit) on animalia with token measurement and validator-pass confirmation. The narrower commands above target individual subsystems; the manual end-to-end run is the correct verification boundary because acceptance criteria are cross-skill cumulative properties.
4. Reasoning-preservation review: re-run 3 historical animalia adjudications; manual diff of pre/post verdicts. Manual review is the correct boundary because verdict reasoning is semantic judgment.
