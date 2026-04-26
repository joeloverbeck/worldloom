# SPEC06SKIREWPAT-009: SPEC-06 Phase 2 static-audit capstone

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None (no new production code; this is a static-audit gate over the rewrites composed by SPEC06SKIREWPAT-001..008)
**Deps**: SPEC06SKIREWPAT-001, SPEC06SKIREWPAT-002, SPEC06SKIREWPAT-003, SPEC06SKIREWPAT-004, SPEC06SKIREWPAT-005, SPEC06SKIREWPAT-006, SPEC06SKIREWPAT-007, SPEC06SKIREWPAT-008 — every per-skill rewrite must land before audit can run

## Problem

SPEC-06 §Verification originally enumerated runtime-only verification gates (token reduction ≥80%, reasoning-preservation re-runs of historical adjudications, instrumented Localizer-Editor-Auditor dispatch trace) alongside static and CLI gates. On 2026-04-26 the project narrowed verification scope: runtime measurement of token reduction, reasoning preservation, and role-split dispatch is no longer a verification gate. The retired bullets are recorded in `specs/SPEC-06-skill-rewrite-patterns.md` §Retired verification gates (and the corresponding Phase 2 token-reduction items in `specs/SPEC-08-migration-and-phasing.md` and `specs/IMPLEMENTATION-ORDER.md` were retired in the same pass).

The surviving SPEC-06 §Verification surface — structural patterns inside each rewritten `SKILL.md`, validator pass on the post-rewrite animalia state, `record_schema_compliance` end-to-end, and Hook 3 enforcement (covered by `tools/hooks/` test suite) — is statically and CLI-verifiable across all 8 rewrites at once. Per the spec-integration ticket shape rule in `.claude/skills/spec-to-tickets/SKILL.md` §Step 3, this is the single trailing capstone over tickets 001–008.

This ticket introduces no new production code; it audits the rewrites composed by tickets 001–008 against the (narrowed) SPEC-06 §Verification surface.

## Assumption Reassessment (2026-04-26)

1. Tickets SPEC06SKIREWPAT-001 through 008 must land before this ticket can run. Each per-skill ticket includes its own dry-run + record-schema acceptance criterion against the engine; this capstone is purely a cross-skill static review plus CLI gates over the resulting state.
2. SPEC-06 §Verification (post-2026-04-26 narrowing) and the SPEC-08 Phase 2 completion gate (`specs/IMPLEMENTATION-ORDER.md` Phase 2 completion gate, post-narrowing) are the authoritative cross-skill criteria. Both have had their runtime token-reduction / reasoning-preservation / role-split bullets retired in the spec edits made alongside this ticket; this ticket exercises the surviving static-and-CLI surface.
3. Cross-skill / cross-artifact boundary: this ticket's audit surface is the eight rewritten `SKILL.md` files plus `worlds/animalia/` post-rewrite state. It mutates neither — it produces a single read-only audit report under `docs/triage/`.
4. FOUNDATIONS principles under audit:
   - **§Canonical Storage Layer**: each rewritten SKILL routes `_source/` writes through engine ops; no rewritten SKILL prescribes raw `Edit`/`Write` on `_source/<subdir>/*.yaml`.
   - **§Mandatory World Files (atomic-source classification)**: no rewritten SKILL reads from the retired monolithic files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, `PEOPLES_AND_SPECIES.md`).
   - **Rule 7 (Preserve Mystery Deliberately)**: rewrites that handle proposals or generate content (canon-addition, canon-facts-from-diegetic-artifacts, character-generation, diegetic-artifact-generation, propose-new-canon-facts, propose-new-characters, continuity-audit) preserve Mystery Reserve firewall language.
   - **HARD-GATE discipline**: every canon-mutating or content-generating skill retains its `<HARD-GATE>` block at the top of `SKILL.md`.
5. Per SPEC-14: animalia's current `_source/` and hybrid-file state passes `record_schema_compliance` end-to-end. This is verified by `world-validate animalia --json` reporting zero findings; a per-skill runtime assertion against engine output is covered by each per-skill ticket's own acceptance, not re-litigated here.

## Architecture Check

1. Capstone shape per `.claude/skills/spec-to-tickets/SKILL.md` §Spec-Integration Ticket Shape: single trailing ticket; introduces no new production code; verification is grep-and-CLI; the audit report is the deliverable. This revision narrows the capstone from a runtime acceptance harness to a static-audit gate — a one-direction reduction in scope, not a contract change.
2. The capstone introduces no new validators, hooks, engine ops, or MCP tools. It exercises existing surfaces only.

## Verification Layers

1. Static structural audit of each rewritten `SKILL.md` → grep-proof: each of the 8 rewritten skills (canon-addition, create-base-world, character-generation, diegetic-artifact-generation, propose-new-canon-facts, canon-facts-from-diegetic-artifacts, propose-new-characters, continuity-audit) is grep-checked against the four structural patterns named in §What to Change item 1.
2. World-state validator pass → CLI: `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` returns zero findings on current animalia state. This subsumes `record_schema_compliance`, `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, `modification_history_retrofit`, `yaml_parse_integrity`, plus Rules 1, 2, 4, 5, 6, 7.
3. Tools-package test-suite pass → CLI: each `tools/<package>/` `npm test` passes. Hook 3 / Hook 5 enforcement, engine atomicity, validator coverage, and MCP retrieval are covered inside these suites.
4. Cross-spec follow-up surfaced → audit-report entry: SPEC-07 Part B obligation regarding any deleted per-skill reference files (e.g., the `phase-15a-checkpoint-grep-reference.md` deletion called out in SPEC06SKIREWPAT-001 §Out of Scope) is named in the audit report so it does not get lost.

## What to Change

### 1. Static structural audit of the 8 rewritten skills

For each of the eight skill paths below, grep-check the four patterns and record pass/fail with the matching evidence line(s) in the audit report:

- `.claude/skills/canon-addition/SKILL.md`
- `.claude/skills/create-base-world/SKILL.md`
- `.claude/skills/character-generation/SKILL.md`
- `.claude/skills/diegetic-artifact-generation/SKILL.md`
- `.claude/skills/propose-new-canon-facts/SKILL.md`
- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md`
- `.claude/skills/propose-new-characters/SKILL.md`
- `.claude/skills/continuity-audit/SKILL.md`

Patterns:

1. **Engine-routed writes for canon paths**: skills that write to `_source/` reference `mcp__worldloom__submit_patch_plan` or one of the engine op names (`create_cf_record`, `create_ch_record`, `create_inv_record`, `create_m_record`, `create_oq_record`, `create_ent_record`, `create_sec_record`, `update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`); skills that write hybrid files (PA / character / DA records) reference the corresponding hybrid-file op (`append_adjudication_record`, `append_character_record`, `append_diegetic_artifact_record`) or the spec's documented direct-Edit-on-hybrid pattern. Pure read-only skills are exempt; flag the skill class explicitly in the audit row.
2. **No retired-monolith references**: zero matches for the eleven retired filenames in §Assumption Reassessment item 4 within the rewritten SKILL.md (and its `references/` siblings — recurse one level). Templates and example outputs that quote pre-migration file names from historical adjudications are permitted; the rule is about *prescriptive* references in the skill's instructions, not about quoted historical evidence. Distinguish in the audit row.
3. **HARD-GATE block intact**: canon-mutating and content-generating skills (all eight in this capstone's scope) contain a `<HARD-GATE>` block at the top of `SKILL.md`. Confirm presence by grep; quote the gate's first line in the audit row.
4. **Mystery Reserve firewall preserved**: skills that handle proposals or generate content reference the Mystery Reserve firewall by name (e.g., "Mystery Reserve firewall", "M-N entries", "do not silently resolve"). Confirm by grep; quote the relevant phrase in the audit row. Skills where this is genuinely not applicable (none of the eight in this list, but call out N/A explicitly if so concluded) must justify the N/A.

### 2. World-state validator gate

Run `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` from the repo root and capture the output. Acceptance is zero findings. If findings exist, classify them:

- **Pre-existing** (present before tickets 001–008 landed; provable via `git log -p` against `worlds/animalia/_source/` or against the `world-validate` CLI's own dated outputs in `docs/triage/` if present): document and route to a separate ticket; do not block this capstone.
- **Introduced by tickets 001–008** (post-dates ticket 001 commit): block this capstone; reopen the responsible per-skill ticket.

### 3. Tools-package test-suite gate

Run `npm test` in each of `tools/world-mcp/`, `tools/patch-engine/`, `tools/validators/`, `tools/hooks/`, `tools/world-index/`. Acceptance is full pass across all five. If failures exist, the responsible per-skill ticket (or the responsible engine/validator/hooks ticket) is reopened.

### 4. Cross-spec follow-up surfacing

If any SPEC06SKIREWPAT-001..008 ticket noted a cross-spec follow-up (e.g., the `phase-15a-checkpoint-grep-reference.md` deletion → SPEC-07 Part B impact named in SPEC06SKIREWPAT-001 §Out of Scope), record it in the audit report under §Cross-Spec Follow-Ups so it doesn't go silent. This is paperwork, not adjudication; the SPEC-07 owner decides what to do.

### 5. Capstone deliverable

Produce `docs/triage/2026-04-26-spec06-phase2-static-acceptance.md` (substitute the actual audit-run date if it differs) containing:

- §Audit scope: lists the eight skills audited and the four patterns
- §Static audit table: 8 rows × 4 columns of pass/fail with grep evidence
- §Validator gate: full output of the `world-validate` command
- §Test-suite gate: brief pass summary per `tools/` package
- §Cross-Spec Follow-Ups: list inherited from per-skill tickets
- §Retired verification gates pointer: a one-paragraph note linking to `specs/SPEC-06-skill-rewrite-patterns.md` §Retired verification gates so the audit report records (without re-litigating) that token reduction, reasoning preservation, and role split were retired from SPEC-06 on 2026-04-26 and are intentionally not exercised by this capstone

## Files to Touch

- `docs/triage/2026-04-26-spec06-phase2-static-acceptance.md` (new) — the audit report

## Out of Scope

- **Token-reduction measurement, reasoning-preservation re-runs, role-split dispatch harness**. Retired from SPEC-06 / SPEC-08 / IMPLEMENTATION-ORDER.md per the 2026-04-26 scope narrowing executed alongside this ticket; recorded under `specs/SPEC-06-skill-rewrite-patterns.md` §Retired verification gates. Not deferrals — actual retirements.
- **End-to-end skill dry-runs**. Runtime-only; the per-skill tickets 001–008 each carried their own dry-run acceptance, so this capstone does not re-litigate them.
- **Per-skill code rewrites** (covered by SPEC06SKIREWPAT-001..008).
- **New validators, engine ops, MCP tools, or hooks**.
- **Spec edits beyond the retirements already made**. If the audit reveals a separate defect in SPEC-06, route through `/reassess-spec`.
- **SPEC-07 Part B docs updates** (cross-spec; SPEC-07 owns; surface in §Cross-Spec Follow-Ups only).
- **SPEC-09 Phase 2.5 work** (independent track).

## Acceptance Criteria

### Tests That Must Pass

1. **`world-validate animalia --json` zero findings**: post-rewrite animalia state passes every active validator. Per SPEC-08 Phase 2 completion gate.
2. **`tools/` test suites pass**: `world-mcp`, `patch-engine`, `validators`, `hooks`, `world-index` each pass `npm test`.
3. **Static structural audit pass on all eight skills**: each of the four patterns (engine-routed writes, no retired-monolith references, HARD-GATE intact, Mystery Reserve firewall preserved) verified per skill with grep evidence in the audit report.
4. **Audit report exists at `docs/triage/<date>-spec06-phase2-static-acceptance.md`** with all six sections populated.

### Invariants

1. The rewritten skills' instructions do not direct the agent to bypass the patch engine for `_source/` writes (per CLAUDE.md non-negotiable).
2. No rewritten skill reads from a retired monolithic file in its prescriptive instructions (per FOUNDATIONS.md §Mandatory World Files post-SPEC-13 atomic-source classification).
3. HARD-GATE discipline is preserved in every canon-mutating or content-generating skill (per `docs/HARD-GATE-DISCIPLINE.md`).
4. Mystery Reserve firewall language is preserved in skills that touch proposals or generated content (per Rule 7).
5. The retired runtime bullets remain visible in `specs/SPEC-06-skill-rewrite-patterns.md` §Retired verification gates (and the corresponding pointers in SPEC-08 / IMPLEMENTATION-ORDER.md), and the audit report links to that section, so the scope-narrowing decision stays auditable.

## Test Plan

### New/Modified Tests

1. None — this is a static-audit + CLI-gate ticket. The validator and test-suite commands cited under §Commands are existing pipeline coverage; the audit report is documentation-only output. No production code changes.

### Commands

1. `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` — zero findings expected.
2. `cd tools/world-mcp && npm test && cd ../patch-engine && npm test && cd ../validators && npm test && cd ../hooks && npm test && cd ../world-index && npm test` — every package's test suite passes.
3. Manual grep audit per pattern × skill (16 grep commands minimum: 4 patterns × 4 skills with non-trivial-grep, plus visual confirmation on the others). The grep is the correct verification boundary because the patterns are *structural prescriptions inside SKILL.md prose*, not behaviors observable at the engine surface — engine-side tests already cover behavioral compliance via the `tools/` test suites in command 2.
