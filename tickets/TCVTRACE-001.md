# TCVTRACE-001: Surface the literal nine `validation_trace` keys in the turn-cycle references and flag the `plan_grounding` gate-name mismatch

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — docs only: `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`, optionally `.claude/skills/_shared-templates/story-state-contract.md` §7
**Deps**: None

## Problem

`PG.validation_trace` is a flat mapping whose nine required keys are validated by `validation_trace_shape_compliance`. The literal keys are defined only in `.claude/skills/_shared-templates/story-record-schemas.md` §4.2 (lines 113-121). The turn-cycle phase-8/phase-9 author-facing reference (`references/phase-9-validation-gates.md`) and the shared contract §7 gate table both describe the gates by **descriptive name** ("state-delta grounding", gate 7) but never give the literal key string.

For gate 7 the descriptive name and the schema key diverge: the gate is named **"state-delta grounding"** but the required key is the vestigial **`plan_grounding`** (a leftover from the retired page-plan era). An author drafting `validation_trace` by following the gate names naturally writes `state_delta_grounding`, which fails `validation_trace_shape_compliance` with both a `missing_keys: [plan_grounding]` and an `extra_keys: [state_delta_grounding]` verdict. This happened during the PG-6 turn-cycle on `red-bunny` and forced a draft→validate→fix→recompute-hash→revalidate loop (the validation_trace edit changed the PG record, so `state_hash` had to be recomputed).

This is avoidable, deterministic friction: list the literal keys where the author actually looks.

## Assumption Reassessment (2026-05-30)

1. The required keys are emitted at `.claude/skills/_shared-templates/story-record-schemas.md:113-121`: `input_legality`, `parent_snapshot_compatibility`, `mystery_invariant_firewall`, `branch_isolation`, `append_only_delta`, `consequence_or_terminal`, `plan_grounding`, `canon_promotion_hold`, `turn_driver_lawfulness`. Confirmed by reading the file and by the committed `worlds/erotica-world/stories/red-bunny/_source/pages/PG-5.yaml` validation_trace (uses `plan_grounding`).
2. The mismatch source: `_shared-templates/story-state-contract.md` §7 gate table row 7 is titled "state-delta grounding"; `references/phase-9-validation-gates.md` item 7 is likewise "state-delta grounding". Neither states the key is `plan_grounding`. Confirmed by reading both files.
3. Shared boundary under audit: the `validation_trace` key contract between `story-record-schemas.md` §4.2 (definition) and `validation_trace_shape_compliance` (`tools/validators/src/...`) enforcement. This ticket changes only author-facing documentation; it does not change the schema or validator, so the enforced contract is untouched.
4. FOUNDATIONS principle: AGENTS.md / FOUNDATIONS "Validation test PASS entries require a one-line rationale" — the nine-key trace is the surface that carries those rationales. Making the keys explicit strengthens, never weakens, that surface. No HARD-GATE or Mystery Reserve firewall surface is touched.
5. Adjacent contradiction classification: the gate-name/key divergence (`plan_grounding` vs "state-delta grounding") is a pre-existing naming-debt bug. Renaming the schema key would be a breaking change to every committed PG record and the validator, so it is explicitly **future cleanup, out of scope here**; this ticket documents the divergence rather than resolving it.

## Architecture Check

1. Documentation-only fix at the point of use is cleaner than a schema rename: the key `plan_grounding` is load-bearing in every committed PG record's `state_hash` payload and in `validation_trace_shape_compliance`; renaming it would force a migration of historical records and a coordinated validator change for zero functional gain. Listing the literal keys (with the one mismatch flagged) removes the friction at near-zero risk.
2. No backwards-compatibility aliasing/shims introduced; the validator and schema are unchanged.

## Verification Layers

1. Invariant: the phase-9 reference lists all nine literal keys -> codebase grep-proof (`grep -c "plan_grounding" .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` >= 1 and all nine keys present).
2. Invariant: the `plan_grounding` ≠ "state-delta grounding" trap is explicitly flagged -> manual review of the added note.
3. Invariant: a fresh turn-cycle authoring pass produces a `validation_trace` that passes `validation_trace_shape_compliance` on first dry-run -> skill dry-run (`validate-patch-plan` returns no `validation_trace_shape_compliance` verdict).

## What to Change

### 1. `references/phase-9-validation-gates.md` — add a literal-key reference block

Immediately before the numbered gate list, add a short table mapping each gate's descriptive name to its exact `validation_trace` key, calling out that gate 7's key is `plan_grounding` (NOT `state_delta_grounding`) and gate 3's key is `mystery_invariant_firewall` (NOT `mystery_firewall`). Keys, in order: `input_legality`, `parent_snapshot_compatibility`, `mystery_invariant_firewall`, `branch_isolation`, `append_only_delta`, `consequence_or_terminal`, `plan_grounding`, `canon_promotion_hold`, `turn_driver_lawfulness`.

### 2. `_shared-templates/story-state-contract.md` §7 (optional)

Annotate gate 7's row, e.g. "state-delta grounding (`validation_trace` key: `plan_grounding`)", so the contract table is self-describing.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — optional §7 annotation)

## Out of Scope

- Renaming the schema key `plan_grounding` to match the gate name (breaking change to committed PG records, the schema, and `validation_trace_shape_compliance`).
- Any change to `validation_trace_shape_compliance` behavior.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "plan_grounding" .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` returns the key in the new reference block.
2. Manual review confirms all nine literal keys are listed in gate order with the two name/key mismatches flagged.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <a fresh turn-cycle envelope>.json` returns no `validation_trace_shape_compliance` verdict (authoring a PG from the updated reference yields correct keys first try).

### Invariants

1. The nine literal `validation_trace` keys appear verbatim wherever a turn-cycle author is directed to populate the trace.
2. The schema key `plan_grounding` and the validator remain unchanged (additive documentation only).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage (`validation_trace_shape_compliance`) is named in Assumption Reassessment.`

### Commands

1. `grep -n "input_legality\|parent_snapshot_compatibility\|mystery_invariant_firewall\|branch_isolation\|append_only_delta\|consequence_or_terminal\|plan_grounding\|canon_promotion_hold\|turn_driver_lawfulness" .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/<next-turn-envelope>.json` (expect no `validation_trace_shape_compliance` failure).
3. A narrower command is correct here because the change is confined to one reference doc; the full pipeline is exercised only to confirm the authored trace keys validate.
