# STOTURNCYC-001: Surface the turn-cycle SF/CNSQ/DA `derived_from` grounding requirement in authoring guidance

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — documentation only: `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`, `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md`, and the shared schema `.claude/skills/_shared-templates/story-record-schemas.md` (§4.5.3 SF, §4.5.5 CNSQ, §4.5.10 DA). No validator/tool/code change.
**Deps**: None

## Problem

A turn-cycle author who creates a new branch-local `SF` (or `CNSQ`, or `DA`) mid-story will, by following the current guidance, produce a record with empty `derived_from` and hit a guaranteed dry-run FAIL.

During a live `branching-story-turn-cycle` run (red-bunny, PG-3 → PG-4), a new branch-local fact `SF-7` ("Jon disclosed his attraction and wish to help") was authored with `derived_from: []`, modeled on (a) the schema prose at §4.5.3 — *"default `[]`; non-empty for mirrored or derived facts"* — and (b) the only `SF` examples in the bundle, `SF-5`/`SF-6`, which carry `derived_from: []`. The dry-run failed:

```
turn_cycle_output_grounding_integrity / turn_cycle_output_missing_derived_from (severity: fail)
SF-7.derived_from must name at least one parent-active or same-event-created grounding record.
```

The validator (`tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts`) requires every `SF`/`CNSQ`/`DA` in a non-genesis `turn_resolution` event's `state_delta.create[]` to carry non-empty `derived_from`, with each entry both (1) in an allowed class set and (2) parent-active or same-event-created. `SF-5`/`SF-6` are exempt **only** because they were created at `PG-1` (the validator short-circuits on `childPageId === "PG-1"` / `event_kind === "story_start"`, lines 62-64). So the in-bundle examples and the schema's permissive "default `[]`" prose actively mislead the author of a mid-story fact into an avoidable failed dry-run. The fix landed by grounding `SF-7` in `[STINT-4, STEMO-1]`, but only after a wasted validate round-trip.

This is FOUNDATIONS **Rule 1 (No Floating Facts)** working correctly at the validator layer; the gap is purely that the turn-cycle authoring surface never tells the author the rule, the genesis exemption, or the allowed grounding class set.

## Assumption Reassessment (2026-05-29)

1. **Validator behavior (codebase).** `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts`: `TARGET_CLASSES = {CNSQ, SF, DA}` (line 5); genesis exemption at lines 62-64 (`childPageId === "PG-1" || event_kind === "story_start"` → returns `[]`); empty-`derived_from` fail at lines 93-98 (`turn_cycle_output_missing_derived_from`); per-entry allowed-and-active check at lines 100-107 (`turn_cycle_output_grounding_missing`). `ALLOWED_GROUNDING_PREFIXES` (lines 9-24) = `{SE, SF, BEL, OBL, CNSQ, STINT, SREL, DA, CLK, STSEC, STQ, STSTAT, STPLAN, STEMO}`. Note the classes that are **NOT** allowed grounding for these records: `STENT`, `STCHAR`, `STLOC`, `STOBJ`, `THR`, `M`, `CF`.
2. **Schema prose (docs).** `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.3 (`SF`) states `derived_from` is "default `[]`; non-empty for mirrored or derived facts" and gives no turn-cycle/mid-story carve-out. §4.5.5 (`CNSQ`) and §4.5.10 (`DA`) similarly default `derived_from` to `[]`. None of the three mentions the `turn_cycle_output_grounding_integrity` requirement or its allowed-class subset.
3. **Skill authoring surface (skills).** `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` says "Create new facts (`SF`) or beliefs (`BEL`)" with no grounding-requirement note; `references/phase-4-5-belief-and-mystery.md` discusses SF/DA propagation but not the `derived_from` grounding requirement. Shared boundary under audit: the turn-cycle authoring docs ↔ the `turn_cycle_output_grounding_integrity` validator contract.
4. **FOUNDATIONS principle restated.** FOUNDATIONS Rule 1 (No Floating Facts): every asserted fact must trace to a grounding cause. The validator enforces this for mid-story `SF`/`CNSQ`/`DA`; this ticket only documents it. No enforcement surface is weakened — this is additive guidance.
5. **Lie-promotion interaction (separate existing rule, must be cross-referenced).** §4.5.3's truth-relation rule plus the `lie_promoted_silently` validator force `authority: branch_local_counterfactual` when a `derived_from` entry is a `BEL` whose `truth_relation` is not `true`. So the grounding guidance must steer authors toward grounding ordinary branch-local facts in `SE`/`STINT`/`STEMO`/`SREL`/true-`BEL` rather than a non-true `BEL`, to avoid being forced counterfactual. This is a required cross-reference, not a new rule.

## Architecture Check

1. Documentation-only, additive: it teaches an already-enforced invariant at the surface where the author drafts the record, eliminating a deterministic failed dry-run. No alternative requires code change; relaxing the validator would violate FOUNDATIONS Rule 1, so doc alignment is the correct lever.
2. No backwards-compatibility shims or aliasing — prose additions only; existing `SF`/`CNSQ`/`DA` records are untouched and the genesis exemption keeps PG-1 bootstrap facts valid.

## Verification Layers

1. Allowed-grounding-class list in the doc matches the validator → codebase grep-proof against `ALLOWED_GROUNDING_PREFIXES` in `turn-cycle-output-grounding-integrity.ts`.
2. Genesis exemption stated correctly in the doc → codebase grep-proof against the `childPageId === "PG-1" || event_kind === "story_start"` short-circuit.
3. Guidance prevents the failure → skill dry-run: a turn-cycle envelope creating a mid-story `SF` with `derived_from` grounded in an allowed active record passes `turn_cycle_output_grounding_integrity`; the same record with `derived_from: []` fails `turn_cycle_output_missing_derived_from`.
4. Lie-promotion cross-reference correct → FOUNDATIONS alignment check (Rule 1 + Rule 4) plus grep-proof against the `lie_promoted_silently` validator and §4.5.3 truth-relation rule.

## What to Change

### 1. `references/phase-2-3-commitment-and-state-delta.md` (Phase 3 state-delta section)

Add a short rule where "Create new facts (`SF`)..." is discussed: any `SF`, `CNSQ`, or `DA` created in a turn-cycle event (i.e. any page after `PG-1`) MUST carry a non-empty `derived_from` naming at least one record that is active on the parent `PG` snapshot or created in the same event, drawn from the allowed grounding classes `{SE, SF, BEL, OBL, CNSQ, STINT, SREL, DA, CLK, STSEC, STQ, STSTAT, STPLAN, STEMO}`. Note explicitly that `STENT`, `STCHAR`, `STLOC`, `STOBJ`, and `THR` are NOT accepted grounding for these three classes. State the `turn_cycle_output_missing_derived_from` / `turn_cycle_output_grounding_missing` failure codes so the rule is greppable from the failure message. Cross-reference the lie-promotion caveat (ground ordinary branch-local facts in `SE`/`STINT`/`STEMO`/`SREL`/true-`BEL`, never a non-true `BEL`, to avoid being forced to `authority: branch_local_counterfactual`).

### 2. `references/phase-4-5-belief-and-mystery.md`

Add a one-line cross-reference at the SF/DA-creation discussion pointing to the Phase 3 grounding rule, so an author creating a `DA` or a derived `SF` during Phase 4-5 sees the same requirement.

### 3. `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.3, §4.5.5, §4.5.10

Append a sentence to each of the `SF`, `CNSQ`, and `DA` schema notes: for records created after `PG-1` via a turn-cycle/`turn_resolution` event, `derived_from` is effectively required (enforced by `turn_cycle_output_grounding_integrity`); the empty-`[]` default is lawful only for genesis (`PG-1` / `story_start`) records and for classes/contexts the validator does not target.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)

## Out of Scope

- Changing `turn_cycle_output_grounding_integrity` behavior or the allowed-class set (the validator is correct per Rule 1).
- Retrofitting `derived_from` onto existing genesis `SF`/`CNSQ`/`DA` records (they are lawfully exempt).
- The player-driver `turn_driver` shape surfacing (tracked separately in STOTURNCYC-002).

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: the allowed-grounding class list written into the docs is byte-consistent with `ALLOWED_GROUNDING_PREFIXES` in `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts`.
2. Skill dry-run: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <envelope-with-grounded-midstory-SF>` returns `status: pass`; the same envelope with `SF.derived_from: []` returns a `turn_cycle_output_missing_derived_from` fail verdict.
3. Full-pipeline: existing validator suite for `turn-cycle-output-grounding-integrity` still passes unchanged (no behavior change expected).

### Invariants

1. Every mid-story turn-cycle-created `SF`/`CNSQ`/`DA` carries non-empty, allowed, parent-active-or-same-event `derived_from` (FOUNDATIONS Rule 1).
2. Documentation never instructs grounding an ordinary `branch_local` `SF` in a non-true `BEL` (preserves Rule 4 / `lie_promoted_silently`).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage (`turn-cycle-output-grounding-integrity`) is named in Assumption Reassessment.`

### Commands

1. `grep -n "ALLOWED_GROUNDING_PREFIXES" -A 20 tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` (confirm doc list matches source)
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <test-envelope>.json` (confirm grounded SF passes, empty SF fails)
3. A narrower validator unit run is the correct boundary because the change is doc-only and the enforcing validator already has coverage; the dry-run command proves the guidance produces a passing envelope.
