# SPEC06SKIREWPAT-001: canon-addition — full migration to atomic-source

**Status**: COMPLETED 2026-04-26
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/canon-addition/SKILL.md` rewritten; `.claude/skills/canon-addition/references/` collapses 8→3 files (5 deleted/folded); `.claude/skills/canon-addition/templates/` collapses 5→2 files (engine owns CF/CH schemas); `.claude/skills/canon-addition/examples/` refreshed to atomic-source op vocabulary
**Deps**: None — SPEC-01, SPEC-02, SPEC-02-PHASE2, SPEC-03, SPEC-04, SPEC-05 Part B, SPEC-13, SPEC-14 all archived per `specs/IMPLEMENTATION-ORDER.md` §Deliverable status

## Problem

`canon-addition/SKILL.md` (237 lines) and its references/ tree (8 files / 847 lines) and templates/ tree (5 files) currently mix **reasoning** (Phases 0–11 judgment — scope, invariants, capability, prerequisites, diffusion, consequence propagation across 13 exposition domains, escalation-gate critics, counterfactual pressure test, contradiction classification, repair pass, narrative-fit, verdict synthesis) with **mechanism** (file loading via "Large-file method" grep-and-targeted-read patterns, `CF-NNNN`/`CH-NNNN`/`PA-NNNN` allocation via ledger scan, anchor-hash construction, attribution stamping via `<!-- added by CF-NNNN -->` comments, Phase 14a Tests 1–8/10 mechanical layers, Phase 15a 25+ sequential `Edit` calls with inter-step grep-checkpoint discipline). Per SPEC-13 (atomic-source migration) and SPEC-14 (PA contract reconciliation), the mechanism layers can move out: retrieval is now record-addressed via `mcp__worldloom__get_record` / `get_context_packet`; ID allocation via `allocate_next_id`; writes via `submit_patch_plan` with typed atomic-record ops; validation via `validate_patch_plan` exercising `record_schema_compliance` + structural + Rule 1/2/4/5/6/7 mechanical layers. Furthermore the skill currently references retired monolithic files (`CANON_LEDGER.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `INVARIANTS.md`, etc.) that no longer exist post-SPEC-13 — every invocation operates against stale path assumptions.

Target shape per SPEC-06 §Migration plan and §Expected aggregate impact: SKILL.md ~95 lines; references/ 3 files / ~360 lines; templates/ 2 files (critic-prompt + critic-report-format); ~60% reduction across the canon-addition surface.

## Assumption Reassessment (2026-04-26)

1. Current `.claude/skills/canon-addition/SKILL.md` (237 lines) references retired monolithic files in §World-State Prerequisites (`worlds/<world-slug>/CANON_LEDGER.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `INVARIANTS.md` lines 129–133) and in Procedure step 1 "Large-file method" (lines 146–157). These files are gone post-SPEC-13 per `docs/FOUNDATIONS.md` §Canonical Storage Layer line 458 ("The retired root-level markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, and the five large prose files) do not exist on machine-layer-enabled worlds.").
2. SPEC-06 `specs/SPEC-06-skill-rewrite-patterns.md` §Migration plan canon-addition subsection (lines 132–152) prescribes the rewrite scope including the references-file disposition (survive: proposal-normalization, consequence-analysis, counterfactual-and-verdict; delete-or-fold: accept-path, phase-15a-checkpoint-grep-reference, foundations-and-rules-alignment, guardrails, non-accept-path); SPEC-04 (`archive/specs/SPEC-04-validator-framework.md` lines 320–321) governs which Phase 14a tests stay in-skill (Tests 9, 10 fully + judgment layers of Tests 3, 6, 8).
3. Cross-skill / cross-artifact boundary: this rewrite modifies the contract canon-addition exposes to `continuity-audit` (which dispatches retcon-proposal cards back to canon-addition via `proposal_path`) and to `propose-new-canon-facts` / `canon-facts-from-diegetic-artifacts` (which produce `proposal_path`-consumable cards). The contract surface is the `proposal_path` argument shape — unchanged by this rewrite. Mystery Reserve firewall remains the load-bearing semantic boundary; engine-side `rule7_mystery_reserve_preservation` validator catches mechanical violations, skill-side Phase 9 repair-pass judgment catches semantic violations.
4. FOUNDATIONS principles under audit:
   - **Rule 6 (No Silent Retcons)**: attribution stamping moves from skill-prose responsibility (`<!-- added by CF-NNNN -->` hand-formatted in domain-file edits, `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): ...` in CF notes fields) to engine-enforced (`append_extension` + `append_modification_history_entry` ops auto-stamp). `modification_history_retrofit` validator catches retrofit-discipline drift.
   - **Rule 7 (Preserve Mystery Deliberately)**: Phase 9 firewall judgment stays in skill (semantic — does the proposal collide with M-N forbidden answers?); `rule7_mystery_reserve_preservation` validator catches mechanical violations (`status: forbidden` + `future_resolution_safety: low/medium/high` mismatches per FOUNDATIONS line 91).
5. HARD-GATE semantics: gate fires at user-approval step before `submit_patch_plan`; `approval_token` is the mechanism for the engine to verify approval, NOT a replacement for the gate. Auto-Mode does not bypass; per CLAUDE.md §HARD-GATE Discipline, the gate is absolute.
6. CF Record schema preserved per FOUNDATIONS.md §Canon Fact Record Schema (lines 263–318); the rewrite uses `create_cf_record` + `append_extension` + `append_touched_by_cf` + `append_modification_history_entry` ops; engine owns serialization. Consumer-side: `record_schema_compliance` validator parses every emitted CF; SPEC-14 `get_canonical_vocabulary` provides domain / verdict / mystery_status / mystery_resolution_safety enums.
7. Rename/removal blast radius for the 5 deleted reference files:
   - `accept-path.md` (217 lines): in `canon-addition/SKILL.md` (self-deleted); in `phase-15a-checkpoint-grep-reference.md` (self-deleted alongside); in `.claude/skills/skill-audit/SKILL.md` (informational example reference, not load-bearing).
   - `phase-15a-checkpoint-grep-reference.md` (258 lines): in `canon-addition/SKILL.md` (self-deleted); in `accept-path.md` (self-deleted); in `specs/SPEC-07-docs-updates.md` (cross-spec — Part B is active and not yet decomposed; route as cross-spec follow-up per Step 6).
   - `foundations-and-rules-alignment.md` (31 lines): in `canon-addition/SKILL.md` (folded into inline Test 9/10 + Rule mapping); in `specs/SPEC-06` (the spec itself — already updated per /reassess-spec).
   - `guardrails.md` (13 lines): in `character-generation/references/governance-and-foundations.md` (uses "guardrails"-style content, not this file); in `.claude/skills/skill-consolidate/SKILL.md` (generic skill-pattern reference). Both are name-sake collisions, not load-bearing dependencies on canon-addition's specific guardrails.md.
   - `non-accept-path.md` (25 lines): in `canon-addition/SKILL.md` (folded into inline non-accept branch); in `specs/SPEC-06` (the spec itself).

## Architecture Check

1. Thin-orchestrator pattern (per SPEC-06 §Thin-orchestrator template): pre-flight via `mcp__worldloom__allocate_next_id` + `get_context_packet`; Phases 0–11 judgment retained verbatim (consequence propagation, critic dispatch, counterfactual reasoning, verdict synthesis); Phase 13a assembles `PatchOperation[]` referencing `node_ids` from the context packet; Phase 14a calls `validate_patch_plan` (replaces mechanical Phase 14a Tests 1, 2, 4, 5, 7 + mechanical cores of Tests 3, 6); skill-side judgment retained for Tests 9 (verdict cites phases), 10 (Rule 3 specialness inflation — Rule 3 unmechanized), and judgment layers of Tests 3, 6, 8; HARD-GATE fires before `submit_patch_plan(plan, approval_token)`. Cleaner than monolithic-markdown approach because retrieval is record-addressed (no oversize-file fallback prose, no per-file structural-anchor catalog) and writes are atomic (no inter-step checkpoint discipline, no partial-failure recovery semantics).
2. No backwards-compatibility shims — pre-migration SKILL.md text is replaced wholesale; no transitional dual-path ("if `_source/` exists, use atomic; else fall back to monolithic") code. Animalia is the only world; it migrated in SPEC-13 Stream B; no legacy form remains to support.

## Verification Layers

1. Skill emits engine-routed writes only → grep-proof: skill text contains zero `Read worlds/<slug>/_source/`, zero `Edit worlds/<slug>/_source/`, zero raw paths under `_source/canon/` `_source/change-log/` `_source/invariants/` `_source/mystery-reserve/` `_source/open-questions/` `_source/entities/`; only MCP tool calls and `submit_patch_plan` invocations
2. PA frontmatter passes `record_schema_compliance` end-to-end → schema validation: `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` reports zero `record_schema_compliance` failures on engine-emitted PA after a sample skill run
3. Bidirectional CF↔SEC pointer maintained → engine fail-fast: every accept-branch patch plan whose `verdict` cites `touched_by_cf[]` includes a paired `update_record_field` op extending target CF's `required_world_updates` ahead of the `append_touched_by_cf` op (SPEC-14 contract; engine rejects plans lacking the bidirectional pointer)
4. Phase 9 Mystery Reserve firewall judgment preserved → manual review: 3 historical adjudications (selected from `worlds/animalia/adjudications/`) re-run; verdicts match pre-migration baseline; phase-citation coverage equivalent
5. HARD-GATE absoluteness → skill dry-run trace: gate fires before write; `submit_patch_plan` is never called without `approval_token`; auto-mode does not bypass

## What to Change

### 1. Rewrite SKILL.md as thin orchestrator (target ~95 lines)

Replace pre-flight grep-and-scan (current SKILL.md lines 144–157, the "Large-file method" block) with `mcp__worldloom__allocate_next_id(world_slug, id_class)` for `PA-NNNN`, `CF-NNNN`, `CH-NNNN` allocation (per SPEC-02-PHASE2's `allocate_next_id` extension to PA/CF/CH classes) and `mcp__worldloom__get_context_packet(task_type='canon-addition', seed_nodes=[<proposal_node_id>], token_budget=10000)` for world-state load. Replace §World-State Prerequisites file enumeration (current lines 127–135) with a single sentence pointing to the context-packet contract. Inline Test 9 (verdict cites phases) + Test 10 (Rule 3 specialness inflation) judgment text from `foundations-and-rules-alignment.md`. Inline surviving guardrails from `guardrails.md`. Inline non-accept branch from `non-accept-path.md`. Drop the entire "Large-file method" pattern catalog (current SKILL.md lines 146–157). Drop Phase 12a mechanical axis-(a)(b) scan prose (the modification_history scan); the mechanical scan is replaced by `find_impacted_fragments` MCP call + `rule6_no_silent_retcons` validator enforcement; the axis-(c) decision test (substantive extension vs cross-reference) STAYS in-skill per SPEC-06 §What STAYS table. Drop Phase 15a 25+ Edit checkpoint discipline; replace with single `submit_patch_plan` call.

### 2. Survive `references/` files (refresh content)

- `proposal-normalization.md` (145 lines) — keep judgment lore: classification, fact-type tie-break rubric, retcon-proposal inputs, composite-facts primary-type convention. Remove any references to deleted siblings.
- `consequence-analysis.md` (70 lines) — keep Phase 6 13-domain reasoning. Remove references to deleted siblings.
- `counterfactual-and-verdict.md` (88 lines) — keep Phases 7–11 judgment. Add a brief PA `body_markdown` structural-template paragraph (since `templates/adjudication-report.md` is deleted). Remove references to deleted siblings.

### 3. Delete `references/` files

- `accept-path.md` — mechanism (Phase 12a–15a write ordering, attribution stamping, structural-integrity grep checkpoints). Replaced by engine ops + validators.
- `phase-15a-checkpoint-grep-reference.md` — engine atomicity replaces inter-step checkpoints; structurally impossible to fail halfway under two-phase commit.
- `foundations-and-rules-alignment.md` — fold surviving Test 9/10 judgment into SKILL.md inline.
- `guardrails.md` — fold surviving guardrails inline; engine-enforced ones (HARD-GATE absoluteness, no-git-commit, worktree discipline) deleted because they're CLAUDE.md-level conventions, not skill-internal rules.
- `non-accept-path.md` — fold non-accept branch (REVISE_AND_RESUBMIT, REJECT) into SKILL.md inline.

### 4. Templates

Keep:
- `templates/critic-prompt.md` — Phase 6a critic dispatch scaffolding (Common Preamble + Your Specific Concern + Reference Files + Output Contract; six per-role briefs).
- `templates/critic-report-format.md` — required report structure each critic returns.

Delete:
- `templates/canon-fact-record.yaml` — engine owns CF schema via `create_cf_record` op; `record_schema_compliance` validator enforces.
- `templates/change-log-entry.yaml` — engine owns CH schema via `create_ch_record` op.
- `templates/adjudication-report.md` — PA frontmatter shape per SPEC-14 (`pa_id`, canonical-enum `verdict`, `originating_skill: "canon-addition"`, `change_id`, four `*_touched` arrays); analysis prose lands in `body_markdown` of `append_adjudication_record`. The body-markdown structural guidance (Discovery / Proposal / Phase 0–11 Analysis / Verdict / Justification / Critic Reports / Required World Updates Applied / Resubmission Menu / Why This Cannot Be Repaired sections) folds into SKILL.md or `counterfactual-and-verdict.md`.

### 5. Phase 13a patch-plan assembly

At Phase 13a (deliverable assembly), the skill assembles `PatchOperation[]` referencing `node_ids` from the context packet:
- Per accepted CF: `create_cf_record` op carrying full CF YAML (per FOUNDATIONS §Canon Fact Record Schema).
- Per CH entry: `create_ch_record` op carrying full CH YAML.
- Per `required_world_updates` SEC: paired `update_record_field` extending target CF's `required_world_updates` ahead of `append_touched_by_cf` on target SEC (SPEC-14 bidirectional pointer; engine fail-fast rejects plans lacking the pair).
- Per modification_history retrofit (Phase 12a axis (a)(b)(c)): `append_modification_history_entry` op on each affected CF.
- Per Mystery Reserve extension (Phase 9 firewall extension): `append_extension` op on target M-N.
- Per new OQ raised by reasoning (Phase 2 / Phase 10): `create_oq_record` op AND cite resulting `OQ-NNNN` in PA's `open_questions_touched[]`.
- Per accept-with-required-updates: `append_adjudication_record` op carrying PA frontmatter + body_markdown.

Domain values, verdict enum, and mystery-resolution-safety values validated at reasoning time via `mcp__worldloom__get_canonical_vocabulary({class})` lookups (SPEC-14 contract) BEFORE patch plan finalization. Eliminates a class of post-write validator fails (vocabulary drift) without coupling skill prose to validator code paths.

### 6. Phase 14a validation

Replace mechanical Phase 14a 10-test rubric with `mcp__worldloom__validate_patch_plan(plan)` call exercising: `record_schema_compliance`, `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, `modification_history_retrofit`, `yaml_parse_integrity`, plus Rules 1, 2, 4, 5, 6, 7 mechanical layers. Skill-side judgment retained for:
- **Test 9** (verdict cites phases) — fully judgment.
- **Test 10** (Rule 3 No Specialness Inflation) — Rule 3 unmechanized per archived SPEC-04 §Risks; skill prose rubric is the load-bearing enforcement surface.
- **Judgment layers of Test 3** (stabilizer-quality assessment on top of structural pass).
- **Judgment layers of Test 6** (forbidden-answer overlap check against MR entries — semantic).
- **Judgment layers of Test 8** (stabilizer-mechanism quality assessment).

Loop back to relevant Phase on validator fail; record PASS/FAIL with one-line rationale in adjudication record's "Phase 14a Validation Checklist" body section.

### 7. Phase 15a HARD-GATE → submit_patch_plan

HARD-GATE presents deliverable summary (use the existing scale-discipline thematic-chunking pattern for large deliveries — current SKILL.md lines 195); user issues `approval_token`; skill calls `mcp__worldloom__submit_patch_plan(plan, approval_token)`; engine applies atomically. Drop the 25+ Edit prose-checkpoint discipline (current SKILL.md line 196 references the deleted phase-15a-checkpoint-grep-reference.md).

### 8. Forward-compat scaffolding for SPEC-09

Preserve §Validation Tests structure such that SPEC-09 Phase 2.5's Tests 11 (action-space) and 12 (redundancy) attach without re-restructuring (per `specs/SPEC-09-canon-safety-expansion.md` line 6 "Depends on: SPEC-04 (Validator Framework — houses new validators), SPEC-06 (canon-addition rewrite — where Tests 11 & 12 attach)"). Keep Tests numbered 1–10 as a contiguous block; SPEC-09 will append Tests 11/12.

### 9. Refresh examples

Update `.claude/skills/canon-addition/examples/accept-with-required-updates.md` and `examples/reject.md` to use atomic-source op vocabulary (`create_cf_record`, `update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`, `create_oq_record`, `append_adjudication_record`) instead of monolithic-Edit pseudo-code.

## Files to Touch

- `.claude/skills/canon-addition/SKILL.md` (modify — rewrite ~237 → ~95 lines)
- `.claude/skills/canon-addition/references/proposal-normalization.md` (modify — remove references to deleted siblings)
- `.claude/skills/canon-addition/references/consequence-analysis.md` (modify — remove references to deleted siblings)
- `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` (modify — remove references to deleted siblings; absorb PA body-markdown structural guidance)
- `.claude/skills/canon-addition/references/accept-path.md` (delete)
- `.claude/skills/canon-addition/references/phase-15a-checkpoint-grep-reference.md` (delete)
- `.claude/skills/canon-addition/references/foundations-and-rules-alignment.md` (delete)
- `.claude/skills/canon-addition/references/guardrails.md` (delete)
- `.claude/skills/canon-addition/references/non-accept-path.md` (delete)
- `.claude/skills/canon-addition/templates/canon-fact-record.yaml` (delete)
- `.claude/skills/canon-addition/templates/change-log-entry.yaml` (delete)
- `.claude/skills/canon-addition/templates/adjudication-report.md` (delete; structural guidance folds into SKILL.md or counterfactual-and-verdict.md)
- `.claude/skills/canon-addition/examples/accept-with-required-updates.md` (modify — refresh to atomic-source op vocabulary)
- `.claude/skills/canon-addition/examples/reject.md` (modify — refresh)

## Out of Scope

- Migration of OTHER skills (covered by SPEC06SKIREWPAT-002 through 008)
- New patch-engine ops beyond SPEC-03 / SPEC-14 vocabulary (audit-record op deferred per SPEC-06 §Out of Scope; continuity-audit's audit records stay direct-Edit on hybrid file)
- SPEC-09 Tests 11/12 attachment (Phase 2.5 work; SPEC-09 owns; this ticket only preserves the structural slot for them)
- World-canon edits (this is a skill rewrite; no `worlds/<slug>/` writes)
- Token-reduction measurement against animalia (covered by SPEC06SKIREWPAT-009 capstone)
- SPEC-07 Part B coordination on the deleted `phase-15a-checkpoint-grep-reference.md` (cross-spec follow-up; SPEC-07 must be re-reassessed to drop the reference)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run on a representative new-fact proposal: pre-flight invokes `mcp__worldloom__allocate_next_id` + `get_context_packet`; zero raw `Read` of `_source/canon/` or `_source/change-log/`; Hook 2 records no large-read attempts.
2. Skill dry-run on a clarificatory-retcon proposal (`retcon_type: A`): produces no new CF; emits `update_record_field` + `append_modification_history_entry` ops on target CFs; PA frontmatter `verdict: ACCEPT_WITH_REQUIRED_UPDATES`; passes `record_schema_compliance`.
3. Skill dry-run on a large delivery (≥6 `required_world_updates`): single `submit_patch_plan` call; zero raw Edit on `_source/*.yaml`; Hook 3 denies any direct-Edit attempt on `_source/`.
4. `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` reports zero validator fails on the post-skill-run state.
5. Reasoning preservation: re-run 3 historical adjudications (selected from `worlds/animalia/adjudications/`); verdicts match pre-migration baseline; phase-citation coverage equivalent (per SPEC-06 §Verification "Reasoning preservation" bullet).

### Invariants

1. HARD-GATE absoluteness: skill cannot `submit_patch_plan` without `approval_token` issued at user-approval step. Auto-Mode does not bypass.
2. Mystery Reserve firewall: every Phase 9 repair pass that touches an M-N entry produces a `rule7_mystery_reserve_preservation`-passing patch; mechanical violations cannot land.
3. CF Record schema fidelity: every `create_cf_record` op emission satisfies FOUNDATIONS.md §Canon Fact Record Schema (every field in lines 263–318 present and well-typed).
4. Bidirectional pointer (SPEC-14): every `append_touched_by_cf` op is preceded in the same plan by an `update_record_field` op extending the target CF's `required_world_updates`. Engine fail-fast rejects plans lacking the pair.
5. Append-only ledger: existing CFs are not deleted or in-place-mutated except in `notes`, `modification_history[]`, `extensions[]` fields per FOUNDATIONS.md §Canon Fact Record Schema line 320.

## Test Plan

### New/Modified Tests

1. `None — skill rewrite; verification is skill-dry-run + world-validate command-based; engine and validator coverage already exists per SPEC-03 and SPEC-04. Per-skill integration test for record_schema_compliance pass on engine-emitted output is covered by SPEC06SKIREWPAT-009 capstone.`

### Commands

1. `cd tools/world-mcp && npm test` — confirm MCP retrieval surface unchanged
2. `cd tools/patch-engine && npm test` — confirm engine ops unchanged
3. `cd tools/validators && npm test` — confirm validator pass-fail set unchanged
4. `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` — post-skill-rewrite world state passes all validators (zero findings per SPEC-08 Phase 2 completion gate)
5. Manual skill dry-run on 3 historical animalia proposals (selected from `worlds/animalia/adjudications/PA-*`); compare verdict + phase-citation coverage to pre-migration baseline. The narrower commands above target the engine/validator/MCP layers; the manual dry-run is the correct verification boundary for skill-level reasoning preservation because reasoning is judgment, not code.
