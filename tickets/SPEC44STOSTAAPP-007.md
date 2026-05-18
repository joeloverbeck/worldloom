# SPEC44STOSTAAPP-007: `propagation_exception_integrity` validator

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `propagation_exception_integrity` registered in `tools/validators/src/public/registry.ts`; extends the existing `non_propagation_tag_shape` mechanism with coverage enforcement. No impact on existing validators.
**Deps**: None

## Problem

`tools/validators/src/structural/non-propagation-tag-shape.ts` validates the SHAPE of `non_propagation:<reason>(group=<label>, records=[<record_ids>])` tags inside `SE.world_logic_rationale`, but does NOT enforce COVERAGE — i.e., when an SE record's `expected_witnesses` group receives no BEL create/supersession in `state_delta`, the rationale MUST contain a parseable `non_propagation:` tag covering that group. Today, an SE record can name an `expected_witnesses` group without propagating the event to that group (no BEL create) AND without a `non_propagation:` tag justifying the omission; the existing tag-shape validator catches only the form of tags that ARE present, not the absence of a tag where one should be present.

Per SPEC-44 §Approach Phase 3 step 11, this validator codifies the coverage rule: when expected propagation is omitted from `state_delta.create/supersede`, a `non_propagation:` tag covering the omitted group is mandatory. The tag's `reason` enum is the 5-value closed set defined at `non-propagation-tag-shape.ts:9-15`: `no_witness`, `witness_incapacitated`, `evidence_concealed`, `institution_suppresses_report`, `event_leaves_no_accessible_trace`.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/structural/non-propagation-tag-shape.ts` exists and validates tag shape (verified at SPEC-44 brainstorm Agent 1 verbatim quote). The 5-reason enum and the tag parse regex (`/^non_propagation:([A-Za-z_]+)\(group=([^,()[\]\s]+), records=\[([^\]]*)\]\)$/`) live there. The `expected_witnesses` field on SE records is a list of group labels naming which witness groups should receive a BEL create from the event; the field is mentioned in `.claude/skills/_shared-templates/story-state-contract.md` §4 (SE schema). BEL records have a `holders` field; coverage discrimination matches each `expected_witnesses` group label against the holders set of BEL records created in `state_delta.create` (or superseded in `state_delta.supersede` when the BEL update is the propagation).
2. SPEC-44 §Approach Phase 3 step 11 specifies the coverage rule and the relationship to the existing tag-shape validator. The new validator is a coverage check, not a re-implementation of tag-shape parsing.
3. **Cross-boundary surface under audit**: this validator complements `non-propagation-tag-shape.ts` — that validator checks tag form; this validator checks tag presence-when-required. Both consume the same `SE.world_logic_rationale` surface and the same parse regex (re-use via import or share-via-extracted-helper).
4. **FOUNDATIONS principle**: §Story Bundles §6b (Information / Observer Firewall) — the firewall governs the post-event propagation side ("who comes to know, suspect, misunderstand, or report what happened after the event"); the coverage check enforces that omitting propagation requires an explicit justification, parallel to how the firewall requires justifying access in the pre-event direction.
5. **Canon Safety surface touched**: the new validator is a structural pre-apply gate under `tools/validators/src/structural/` per the per-ticket-type granularity rule. It gates `SE` record submission; the change does NOT weaken the Mystery Reserve firewall — propagation-exception coverage is internal observer-firewall consistency, distinct from mystery-resolution gating.

## Architecture Check

1. **Coverage validator complements shape validator.** `non-propagation-tag-shape.ts` catches malformed tags; this validator catches absent tags where they should be present. The two are layered: shape catches form; coverage catches omission.
2. **No backwards-compatibility shim.** The validator emits `fail` for any uncovered omission. Pre-SPEC-44 SE records that either propagate to all expected_witnesses groups OR include `non_propagation:` tags for omitted groups validate clean.

## Verification Layers

1. **Validator registered with `fail` severity** → codebase grep-proof: `grep -n 'propagation_exception_integrity' tools/validators/src/public/registry.ts` returns a registry entry with `severity_mode: "fail"`.
2. **Validator fires on uncovered omission** → synthetic-fixture test: an SE record with `expected_witnesses: ["group:council"]`, no BEL create in `state_delta` for any `group:council` holder, and no `non_propagation:` tag in `world_logic_rationale` → expect `fail` verdict.
3. **Validator validates clean on covered omission** → synthetic-fixture test: same SE record but with `world_logic_rationale` containing `non_propagation:event_leaves_no_accessible_trace(group=council, records=[DA-3])` → expect clean verdict.
4. **Validator validates clean on full propagation** → synthetic-fixture test: same SE record but with `state_delta.create: [BEL-12]` where BEL-12.holders includes `group:council` → expect clean verdict.

## What to Change

### 1. Author the validator module

Create `tools/validators/src/structural/propagation-exception-integrity.ts`. The module exports a `propagationExceptionIntegrity` validator following the existing structural-validator pattern. The validator:
- Targets the pre-apply and full validation phases (`applies_to: ["pre_apply", "full"]`).
- For each SE record:
  - Read `expected_witnesses` (if present); for each group label:
    - Check whether `state_delta.create` or `state_delta.supersede` contains a BEL record whose `holders` includes the group label.
    - If no BEL covers the group, check whether `world_logic_rationale` contains a `non_propagation:<reason>(group=<group_label>, ...)` tag for the omitted group (re-use the parse regex from `non-propagation-tag-shape.ts` — import or share the helper).
    - If neither a propagating BEL nor a covering tag exists, emit `fail` with `code: "propagation_exception_uncovered"` and a message naming the SE id, the omitted group, and the suggested fix (either propagate the BEL or add a `non_propagation:` tag for the group).

### 2. Register the validator

Edit `tools/validators/src/public/registry.ts` to add an import for the new validator module and a registry entry alongside the other SE-record structural validators.

### 3. Author the test module

Create `tools/validators/tests/structural/propagation-exception-integrity.test.ts` covering:
- **Negative test 1 (uncovered omission, single group)**: SE with `expected_witnesses: ["group:council"]`, no BEL create for the group, no `non_propagation:` tag → expect `fail`.
- **Negative test 2 (uncovered omission, one group covered + one not)**: SE with `expected_witnesses: ["group:council", "group:guild"]`, BEL create covers `group:council` but not `group:guild`, no `non_propagation:` tag for `group:guild` → expect `fail` (for the uncovered `group:guild`).
- **Positive test 1 (full propagation)**: SE with `expected_witnesses: ["group:council"]`, BEL create with `holders: ["group:council"]` → expect clean.
- **Positive test 2 (covered omission)**: SE with `expected_witnesses: ["group:council"]`, no BEL create, `world_logic_rationale` contains `non_propagation:event_leaves_no_accessible_trace(group=council, records=[DA-3])` → expect clean.
- **Positive test 3 (no expected_witnesses)**: SE with no `expected_witnesses` field → expect clean (rule does not apply).

## Files to Touch

- `tools/validators/src/structural/propagation-exception-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + registry entry)
- `tools/validators/tests/structural/propagation-exception-integrity.test.ts` (new)

## Out of Scope

- Changes to `non-propagation-tag-shape.ts` — its scope (tag form validation) is distinct from this validator's scope (tag presence enforcement); the two are complementary.
- Changes to the 5-reason enum or the parse regex — both remain owned by `non-propagation-tag-shape.ts`.
- Validation of BEL `holders` schema or `expected_witnesses` field shape — covered by the SE / BEL record-schema-compliance validators.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- propagation-exception-integrity` passes all 5 test cases (2 negative, 3 positive).
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression).
3. `npm run build --prefix tools/validators` exits 0.

### Invariants

1. When an SE record's `expected_witnesses` names a group, the same SE record either has a BEL create/supersede whose `holders` covers the group, OR `world_logic_rationale` contains a `non_propagation:<reason>(group=<group_label>, records=[...])` tag covering the group.
2. The validator does NOT replace the tag-shape validator — `non-propagation-tag-shape.ts` continues to enforce that any tag present is well-formed; this validator enforces that a tag is present when required.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/propagation-exception-integrity.test.ts` (new) — 5 test cases per §What to Change step 3.
2. No modifications to existing tests.

### Commands

1. `npm test --prefix tools/validators -- propagation-exception-integrity` — targeted validator test.
2. `npm test --prefix tools/validators` — full validator suite regression.
3. `npm run build --prefix tools/validators` — compilation check.
