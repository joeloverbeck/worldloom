# STOREDUCE-002: Enforce one-line `PG.validation_trace` rationales per AGENTS.md

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — skill-prose-only change. `branching-story-bootstrap/references/phase-10-validation.md`, `branching-story-turn-cycle/references/phase-9-validation-gates.md`, optionally `.claude/skills/_shared-templates/story-state-contract.md` §7 and `.claude/skills/_shared-templates/story-record-schemas.md` §4.2.
**Deps**: None (composes with STOREDUCE-001 but is independent — either alone is a coherent improvement)

## Problem

`AGENTS.md` line 22 and global `CLAUDE.md` state: **"Validation test PASS entries require a one-line rationale. A bare 'PASS' is treated as FAIL."** The shared story-state contract at `.claude/skills/_shared-templates/story-state-contract.md:405` cites that rule by name when establishing `PG.validation_trace` discipline. The record schema at `.claude/skills/_shared-templates/story-record-schemas.md:110` codifies the slot as `# * one entry per shared gate with PASS + one-line rationale`.

In practice, the LLM authoring `branching-story-bootstrap` and `branching-story-turn-cycle` emits multi-sentence paragraph rationales spanning 200+ words per gate. Visible evidence in `worlds/erotica-world/stories/red-bunny/INDEX.md` (which projects `PG.validation_trace` verbatim) at lines 335-389: every gate carries semicolon-chained sub-clauses listing state-delta contents, alias bindings, expected-witness discharge paths, branch-path lineage, etc.

This drift has two costs:

1. **Authoring time per turn**: the LLM spends significant output budget composing nine multi-sentence paragraphs per page — a recurring per-turn cost the user noticed as part of "turn-cycle takes a long time to run."
2. **Anti-pattern surface for downstream consumers**: `mcp-integration-audit/SKILL.md:173` explicitly identifies "trusting PG-3's embedded `validation_trace.canon_promotion_hold` text" as an anti-pattern — its recommendation is that downstream skills re-fetch the resolving `SE-<integer>` record rather than rely on the projection. Long rationale prose invites the anti-pattern reliance; concise rationales discourage it structurally because the prose is too thin to substitute for source-record retrieval.

The drift source is the canonical examples in `phase-10-validation.md` and `phase-9-validation-gates.md`: those references describe each gate's pass condition in 2-4 sentences AND then expect "one-line PASS rationale per gate" without naming a length cap. Empirically, the LLM matches the surrounding prose register and produces paragraph-length rationales.

The `validation_trace_shape_compliance` validator (`tools/validators/dist/src/structural/validation-trace-shape-compliance.js`) checks the flat nine-key mapping shape only — it does NOT enforce rationale length, structure, or content. A concise one-line rationale satisfies every machine check and satisfies AGENTS.md.

## Assumption Reassessment (2026-05-27)

1. `AGENTS.md:22` carries the verbatim rule: `**Validation test PASS entries require a one-line rationale.** A bare "PASS" is treated as FAIL.` This is the FOUNDATIONS-aligned authority — `docs/FOUNDATIONS.md` cross-references via the broader Tooling Recommendation and HARD-GATE Discipline pattern.
2. `.claude/skills/_shared-templates/story-record-schemas.md:110` carries the canonical schema slot `validation_trace:` with explicit `# * one entry per shared gate with PASS + one-line rationale` plus per-gate `"PASS: <rationale>"` shape examples (lines 111-119). The schema is already aligned with the one-line rule.
3. `.claude/skills/_shared-templates/story-state-contract.md:405` cites the AGENTS.md one-line rule when establishing the `PG.validation_trace` discipline. The shared contract is already aligned.
4. `branching-story-bootstrap/references/phase-10-validation.md:5` and `branching-story-turn-cycle/references/phase-9-validation-gates.md:3` both say "one-line PASS rationale per gate" but provide no length-cap exemplar and surround the statement with multi-sentence gate-definition prose. The LLM matches the surrounding register.
5. `tools/validators/dist/src/structural/validation-trace-shape-compliance.js:15-64` confirms the validator checks: (a) `validation_trace` is an object, (b) has exactly the nine required keys, (c) has no extra keys. **No length, prose-structure, or content check exists**. Concise rationales pass identically to paragraph rationales.
6. `mcp-integration-audit/SKILL.md:173` documents the anti-pattern of consumers trusting `validation_trace` projection text in place of re-fetching the source record (`get_record(record_id='SE-N')`). Shorter rationales discourage this anti-pattern at the source.
7. **FOUNDATIONS principle under audit**: AGENTS.md one-line rationale rule (cross-referenced from FOUNDATIONS Tooling Recommendation and the shared contract). The change reinforces existing discipline rather than introducing new doctrine.
8. **`PG.state_hash` impact**: `validation_trace` IS included in the canonical-JSON state-hash payload (per `phase-10-validation.md:31` and `phase-9-validation-gates.md:43`). Changing rationale text changes the hash deterministically — both authoring and validation use the same canonical JSON helper (`@worldloom/world-index/hash/content`), so authoring-time and validation-time hashes remain byte-identical for any rationale shape. No replay-equality breakage.
9. **Adjacent contradiction discovered**: `.claude/skills/_shared-templates/story-record-schemas.md:137-140` notes that `validation_trace.parent_snapshot_compatibility` MAY need to cite a specific CH id when the drift window covers two or more intervening CH entries. This is a structural citation requirement (a CH id reference), not a verbosity requirement — a concise rationale of the form `"PASS: drift compatible; cites CH-<integer>"` satisfies both the one-line rule AND the citation requirement. No conflict.

## Architecture Check

1. The change reinforces an existing AGENTS.md / shared-contract / record-schema rule that has empirically drifted in LLM output. It does not introduce new doctrine.
2. Alternative considered — add a length-cap validator to `validation_trace_shape_compliance`: rejected as scope creep. The one-line rule is a prose discipline best enforced at the authoring instruction surface; a validator would require defining "one line" structurally (character count? sentence count?) and would produce noisy regressions on existing red-bunny pages. The instruction-side fix targets the authoring drift directly without retroactive enforcement on committed pages.
3. No backwards-compatibility shim. Existing committed pages with paragraph-length rationales remain valid (their `state_hash` covers their actual rationale text; `validation_trace_shape_compliance` passes either form).

## Verification Layers

1. **Concise rationale exemplars present in skill references** → manual review: `phase-10-validation.md` and `phase-9-validation-gates.md` carry inline one-line example rationales per gate after this change, demonstrating the target register.
2. **Length-cap discipline explicit at reference-file scope** → codebase grep-proof: `grep -rn "one-line\|one line\|concise rationale" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` returns the explicit instruction with a target word/character bound (e.g., "≤ 30 words" or "single sentence").
3. **No validator regression** → `cd tools/validators && npm test` continues to pass; `validation_trace_shape_compliance` is shape-only and accepts both old and new rationale forms.
4. **Existing committed pages stay valid** → schema validation: existing red-bunny `PG-1.yaml` through `PG-6.yaml` records continue to pass `record_schema_compliance` and `validation_trace_shape_compliance` without re-authoring. The change applies to future skill executions only.

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md`

In the opening sentence (line 5: "Populate `PG-1.validation_trace` with one-line PASS rationale per gate:"), add an explicit length-cap clause: e.g., "Populate `PG-1.validation_trace` with **one concise sentence per gate (≤ 30 words; single sentence; no semicolon-chained sub-clauses)** per AGENTS.md 'Validation test PASS entries require a one-line rationale.'" Then for each of the 8 numbered gates below, append a target-form example rationale at the end of the gate's definition — e.g., for gate 1 (input legality): `Target form: "PASS: SE-1 is story_start with PG-1 carve-out fields per §4.2."`

### 2. `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`

Same intervention as #1, applied to line 3 ("Populate `PG-<integer>.validation_trace` with one-line PASS rationale per gate:") and the 8 + Gate 9 numbered definitions. Target-form examples should reflect turn-cycle's per-gate concerns (e.g., for gate 9 Turn-Driver Lawfulness: `Target form: "PASS: player_action driver; initiator=player; driver_records=[]; pov perceived_directly."`).

### 3. (Optional) `.claude/skills/_shared-templates/story-state-contract.md` §7

At the gate table (lines around 412-417) or in the §7 preamble (line 405), append a defensive cross-reference: "The rationale prose target form is **one sentence per gate, ≤ 30 words, no semicolon-chained sub-clauses** per AGENTS.md. The `validation_trace_shape_compliance` validator enforces the flat nine-key mapping shape only; rationale length discipline is authoring-side."

### 4. (Optional) `.claude/skills/_shared-templates/story-record-schemas.md` §4.2

The schema slot at line 110 already says "one entry per shared gate with PASS + one-line rationale" — no edit needed unless the operator wants to tighten the comment to "one sentence per gate, ≤ 30 words" for surface consistency.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` (modify — add length-cap clause and per-gate target-form exemplars)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify — same intervention for the 8 + Gate 9 definitions)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — optional defensive cross-reference at §7)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — optional comment tightening at §4.2)
- `tickets/STOREDUCE-002.md` (mark complete with closeout evidence)

## Out of Scope

- Retroactive re-authoring of existing committed `PG.validation_trace` rationales in `worlds/erotica-world/stories/red-bunny/_source/pages/PG-*.yaml`. Existing records retain their paragraph-length rationales as historical record; only future skill executions produce concise rationales.
- Adding a structural length-cap to `validation_trace_shape_compliance`. The validator stays shape-only; length discipline is authoring-side per AGENTS.md.
- Changes to `world_logic_rationale` on `SE-<integer>` records or any other rationale field elsewhere in the story-bundle schema set. Those carry their own contracts.
- `STOREDUCE-001` (markdown projection removal) — coordinated but independent.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "≤ 30 words\|one concise sentence per gate\|no semicolon-chained" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` returns matches for the length-cap clause.
2. Each modified reference file carries at least one `Target form:` exemplar per gate definition.
3. `cd tools/validators && npm test` continues to pass — `validation_trace_shape_compliance` accepts both old paragraph-rationales (on existing pages) and new concise rationales (on new pages).
4. `cd tools/world-mcp && npm test` continues to pass — no consumer of `PG.validation_trace` depends on rationale length.

### Invariants

1. AGENTS.md one-line rationale rule is honored: future-authored `PG.validation_trace` rationales are single sentences with no bare "PASS" entries.
2. `validation_trace_shape_compliance` semantics unchanged: shape-only validation; length-discipline lives in skill prose.
3. `PG.state_hash` continues to cover `validation_trace` byte-for-byte; existing committed pages remain replay-equal under their original rationales.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; the only change is to skill reference files. The validator that governs PG.validation_trace shape continues to enforce the YAML-field structure unchanged. Verification is command-based (grep + existing pipeline coverage).`

### Commands

1. `grep -rn "Target form:" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` — must return one match per gate definition (8 in bootstrap, 9 in turn-cycle).
2. `grep -rn "≤ 30 words\|one concise sentence per gate" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` — must return matches for the explicit length-cap clause.
3. `cd tools/validators && npm test` — must continue to pass.
4. `cd tools/world-mcp && npm test` — must continue to pass.
