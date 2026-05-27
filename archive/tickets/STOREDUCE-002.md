# STOREDUCE-002: Enforce one-line `PG.validation_trace` rationales per AGENTS.md

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — skill-prose-only change. Updated `branching-story-bootstrap/references/phase-10-validation.md`, `branching-story-turn-cycle/references/phase-9-validation-gates.md`, `.claude/skills/_shared-templates/story-state-contract.md` §7, and `.claude/skills/_shared-templates/story-record-schemas.md` §4.2.
**Deps**: None (composes with STOREDUCE-001 but is independent — either alone is a coherent improvement)

## Problem

At intake, `AGENTS.md` and global `CLAUDE.md` stated: **"Validation test PASS entries require a one-line rationale. A bare 'PASS' is treated as FAIL."** The shared story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` cited that rule by name when establishing `PG.validation_trace` discipline. The record schema at `.claude/skills/_shared-templates/story-record-schemas.md` codified the slot as `# * one entry per shared gate with PASS + one-line rationale`.

Before this ticket, LLM-authored `branching-story-bootstrap` and `branching-story-turn-cycle` outputs could emit multi-sentence paragraph rationales spanning 200+ words per gate. Intake evidence in `worlds/erotica-world/stories/red-bunny/INDEX.md` (which projects `PG.validation_trace` verbatim) showed semicolon-chained sub-clauses listing state-delta contents, alias bindings, expected-witness discharge paths, branch-path lineage, etc.

This drift has two costs:

1. **Authoring time per turn**: the LLM spends significant output budget composing nine multi-sentence paragraphs per page — a recurring per-turn cost the user noticed as part of "turn-cycle takes a long time to run."
2. **Anti-pattern surface for downstream consumers**: `mcp-integration-audit/SKILL.md:173` explicitly identifies "trusting PG-3's embedded `validation_trace.canon_promotion_hold` text" as an anti-pattern — its recommendation is that downstream skills re-fetch the resolving `SE-<integer>` record rather than rely on the projection. Long rationale prose invites the anti-pattern reliance; concise rationales discourage it structurally because the prose is too thin to substitute for source-record retrieval.

The intake drift source was the canonical examples in `phase-10-validation.md` and `phase-9-validation-gates.md`: those references described each gate's pass condition in 2-4 sentences and then expected "one-line PASS rationale per gate" without naming a length cap. This ticket now adds concise target-form exemplars at that authoring surface.

The `validation_trace_shape_compliance` validator (`tools/validators/dist/src/structural/validation-trace-shape-compliance.js`) checks the flat nine-key mapping shape only — it does NOT enforce rationale length, structure, or content. A concise one-line rationale satisfies every machine check and satisfies AGENTS.md.

## Assumption Reassessment (2026-05-27)

1. `AGENTS.md:22` carries the verbatim rule: `**Validation test PASS entries require a one-line rationale.** A bare "PASS" is treated as FAIL.` This is the FOUNDATIONS-aligned authority — `docs/FOUNDATIONS.md` cross-references via the broader Tooling Recommendation and HARD-GATE Discipline pattern.
2. `.claude/skills/_shared-templates/story-record-schemas.md` carries the canonical schema slot `validation_trace:` plus per-gate `"PASS: <rationale>"` shape examples. This ticket tightened the slot comment to `PASS + one concise-sentence rationale`.
3. `.claude/skills/_shared-templates/story-state-contract.md` cites the AGENTS.md one-line rule when establishing the `PG.validation_trace` discipline. This ticket added the authoring-side target form and preserved the shape-only validator boundary.
4. `branching-story-bootstrap/references/phase-10-validation.md` and `branching-story-turn-cycle/references/phase-9-validation-gates.md` said "one-line PASS rationale per gate" but provided no length-cap exemplar and surrounded the statement with multi-sentence gate-definition prose. This ticket added explicit concise-sentence clauses and target-form exemplars.
5. `tools/validators/dist/src/structural/validation-trace-shape-compliance.js:15-64` confirms the validator checks: (a) `validation_trace` is an object, (b) has exactly the nine required keys, (c) has no extra keys. **No length, prose-structure, or content check exists**. Concise rationales pass identically to paragraph rationales.
6. `mcp-integration-audit/SKILL.md:173` documents the anti-pattern of consumers trusting `validation_trace` projection text in place of re-fetching the source record (`get_record(record_id='SE-N')`). Shorter rationales discourage this anti-pattern at the source.
7. **FOUNDATIONS principle under audit**: AGENTS.md one-line rationale rule (cross-referenced from FOUNDATIONS Tooling Recommendation and the shared contract). The change reinforces existing discipline rather than introducing new doctrine.
8. **`PG.state_hash` impact**: `validation_trace` IS included in the canonical-JSON state-hash payload (per `phase-10-validation.md:31` and `phase-9-validation-gates.md:43`). Changing rationale text changes the hash deterministically — both authoring and validation use the same canonical JSON helper (`@worldloom/world-index/hash/content`), so authoring-time and validation-time hashes remain byte-identical for any rationale shape. No replay-equality breakage.
9. **Adjacent contradiction checked**: `.claude/skills/_shared-templates/story-record-schemas.md` notes that `validation_trace.parent_snapshot_compatibility` MAY need to cite a specific CH id when the drift window covers two or more intervening CH entries. This is a structural citation requirement (a CH id reference), not a verbosity requirement. A concise rationale of the form `"PASS: drift compatible after CH-<integer> review."` satisfies both the one-line rule and the citation requirement. No conflict.
10. **HARD-GATE discipline read**: `docs/HARD-GATE-DISCIPLINE.md` confirms validation/rejection tests must record PASS with authority-cited one-line rationales. This ticket reinforces that discipline and does not weaken gate ordering, approval-token behavior, pre-apply validation, or patch-engine submission.

## Architecture Check

1. The change reinforces an existing AGENTS.md / shared-contract / record-schema rule that has empirically drifted in LLM output. It does not introduce new doctrine.
2. Alternative considered — add a length-cap validator to `validation_trace_shape_compliance`: rejected as scope creep. The one-line rule is a prose discipline best enforced at the authoring instruction surface; a validator would require defining "one line" structurally (character count? sentence count?) and would produce noisy regressions on existing red-bunny pages. The instruction-side fix targets the authoring drift directly without retroactive enforcement on committed pages.
3. No backwards-compatibility shim. Existing committed pages with paragraph-length rationales remain valid (their `state_hash` covers their actual rationale text; `validation_trace_shape_compliance` passes either form).

## Verification Layers

1. **Concise rationale exemplars present in skill references** → grep/manual review: `phase-10-validation.md` carries 8 `Target form:` exemplars and `phase-9-validation-gates.md` carries 9 `Target form:` exemplars after this change.
2. **Length-cap discipline explicit at reference-file scope** → codebase grep-proof: `grep -rn "<= 30 words\|one concise sentence per gate\|no semicolon-chained" ...` returns the explicit instruction on the owned references and shared contract.
3. **No validator regression** → `cd tools/validators && npm test` passes; `validation_trace_shape_compliance` remains shape-only and accepts both old and new rationale forms.
4. **No MCP/consumer regression** → `cd tools/world-mcp && npm test` passes; no consumer of `PG.validation_trace` depends on rationale length.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md`

The opening sentence now requires one concise sentence per gate, `<= 30 words`, single sentence, and no semicolon-chained sub-clauses. Each of the 8 shared bootstrap gates has a `Target form:` exemplar.

### 2. `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`

The opening sentence now requires one concise sentence per gate, `<= 30 words`, single sentence, and no semicolon-chained sub-clauses. The 8 shared turn-cycle gates plus Gate 9 Turn-Driver Lawfulness have target-form exemplars.

### 3. `.claude/skills/_shared-templates/story-state-contract.md` §7

The §7 preamble now states the one-sentence, `<= 30 words`, no-semicolon target form and clarifies that `validation_trace_shape_compliance` enforces only the flat nine-key mapping shape.

### 4. `.claude/skills/_shared-templates/story-record-schemas.md` §4.2

The `validation_trace` schema comment now says each entry carries `PASS + one concise-sentence rationale`.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` (modify — add length-cap clause and per-gate target-form exemplars)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify — same intervention for the 8 + Gate 9 definitions)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — defensive cross-reference at §7)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — comment tightening at §4.2)
- `archive/tickets/STOREDUCE-002.md` (mark complete with closeout evidence)

## Out of Scope

- Retroactive re-authoring of existing committed `PG.validation_trace` rationales in `worlds/erotica-world/stories/red-bunny/_source/pages/PG-*.yaml`. Existing records retain their paragraph-length rationales as historical record; only future skill executions produce concise rationales.
- Adding a structural length-cap to `validation_trace_shape_compliance`. The validator stays shape-only; length discipline is authoring-side per AGENTS.md.
- Changes to `world_logic_rationale` on `SE-<integer>` records or any other rationale field elsewhere in the story-bundle schema set. Those carry their own contracts.
- `STOREDUCE-001` (markdown projection removal) — coordinated but independent.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "<= 30 words\|one concise sentence per gate\|no semicolon-chained" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` returns matches for the length-cap clause on the owned instruction surfaces.
2. Each modified reference file carries at least one `Target form:` exemplar per gate definition: 8 in bootstrap and 9 in turn-cycle.
3. `cd tools/validators && npm test` continues to pass — `validation_trace_shape_compliance` accepts both old paragraph-rationales (on existing pages) and new concise rationales (on new pages).
4. `cd tools/world-mcp && npm test` continues to pass — no consumer of `PG.validation_trace` depends on rationale length.

### Invariants

1. AGENTS.md one-line rationale rule is honored: future-authored `PG.validation_trace` rationales are single sentences with no bare "PASS" entries.
2. `validation_trace_shape_compliance` semantics unchanged: shape-only validation; length-discipline lives in skill prose.
3. `PG.state_hash` continues to cover `validation_trace` byte-for-byte; existing committed pages remain replay-equal under their original rationales.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; the changes are skill references and shared templates only. The validator that governs PG.validation_trace shape continues to enforce the YAML-field structure unchanged. Verification is command-based (grep + existing pipeline coverage).`

### Commands

1. `grep -rn "Target form:" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` — returns one match per gate definition (8 in bootstrap, 9 in turn-cycle).
2. `grep -rn "<= 30 words\|one concise sentence per gate\|no semicolon-chained" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` — returns matches for the explicit length-cap clause.
3. `cd tools/validators && npm test` — passed after the prose edits.
4. `cd tools/world-mcp && npm test` — passed after the prose edits.

## Outcome

Implemented. Future `PG.validation_trace` authoring guidance now points authors to short, authority-cited target forms instead of letting long gate-description prose set the rationale register. Validator semantics were intentionally unchanged.

## Verification Result

1. `grep -rn "Target form:" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` — passed; 8 bootstrap exemplars and 9 turn-cycle exemplars were present.
2. `grep -rn "<= 30 words\|one concise sentence per gate\|no semicolon-chained" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` — passed; the explicit concise-sentence discipline is present on the owned references and shared contract.
3. `cd tools/validators && npm test` — passed after the prose edits (`1093` pass, `0` fail).
4. `cd tools/world-mcp && npm test` — passed after the prose edits (`495` pass, `0` fail).
5. `git diff --check` — passed after closeout edits.

## Deviations

1. The optional shared-template edits were included because they are same-seam defensive contract surfaces for `PG.validation_trace`.
2. The landed target-form examples use ASCII `<= 30 words` instead of the drafted Unicode `≤ 30 words`, and the proof commands were updated accordingly.
3. The drafted Gate 9 exemplar used semicolon-separated clauses; the landed exemplar avoids semicolons to satisfy the new no-semicolon discipline.
