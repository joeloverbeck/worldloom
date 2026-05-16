# SPEC36STOPIPNIN-006: Implement `expected_witness_coverage` validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/structural/expected-witness-coverage.ts` (new structural validator); `tools/validators/src/public/registry.ts` (registration); `tools/validators/tests/structural/registry.test.ts` (test extension); `tools/validators/tests/structural/expected-witness-coverage.test.ts` (new test file); `tools/validators/src/structural/non-propagation-tag-shape.ts` (source-comment cleanup; no behavioral change); `.claude/skills/branching-story-turn-cycle/SKILL.md` (skill prose at line 439); `.claude/skills/branching-story-health-audit/SKILL.md` (skill prose at line 196)
**Deps**: `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`

## Problem

`tools/validators/src/structural/non-propagation-tag-shape.ts:4-7` source comment explicitly states *"Full witness coverage (computing direct/indirect witnesses from active STSTAT.location/agency, event kind/targets, BEL.basis.source_event) is planned for validator-hardening-II; see SPEC-35 Risks & Open Questions"*. The current `non_propagation_tag_shape` validator checks tag syntax, closed-reason coverage, and record-ID shape only — never queries SE/BEL/STSTAT to compute expected witness groups. Both `.claude/skills/branching-story-turn-cycle/SKILL.md:439` and `.claude/skills/branching-story-health-audit/SKILL.md:196` describe the gap consistently. Audit motivation (`reports/story-related-improvements-ninth-iteration.md` §WL-N9-P1-002): a public betrayal / violence / status event that fails to create BEL records can pass `non_propagation_tag_shape` if the SE author wrote a syntactically valid tag for a wrong group label. SPEC-36 §D2 adds the semantic witness-coverage validator alongside (not replacing) `non_propagation_tag_shape`.

## Assumption Reassessment (2026-05-16)

1. `non-propagation-tag-shape.ts:4-7` source comment verified by direct read; only tag-shape validator currently registered. Schema fields needed for witness computation all verified by parallel-Explore-agent quotes during SPEC-36 brainstorm session: `BEL.holder` / `BEL.visibility` (enum: `private | shared | factional | public | rumored | concealed | suppressed`) / `BEL.basis.source_event` at `tools/validators/src/schemas/story-belief.schema.json`; `SE.actor` / `SE.targets` / `SE.state_delta` (`create | supersede | close`) at `tools/validators/src/schemas/story-event.schema.json`; `STSTAT.life` (enum) / `STSTAT.agency` (enum including `incapacitated`, `unconscious`, `dead`) / `STSTAT.location` (pattern `^(STLOC-[0-9]+|unknown|concealed|offstage)$`) at `tools/validators/src/schemas/story-status.schema.json`. No schema changes required.
2. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §D2 specifies the validator with a deterministic STLOC + STSTAT co-location trigger (rejecting the auditor's natural-language event-class trigger as `(pragmatic — scoping)` per §Key design decisions), 7 tests minimum, registry registration, registry test extension, skill-prose updates at the two named sites, AND a source-comment cleanup at `non-propagation-tag-shape.ts:4-7`. The existing `non_propagation_tag_shape` validator is preserved unchanged behaviorally — only its source comment is updated to reflect that semantic witness coverage now lives in the new sibling validator.
3. Cross-artifact boundary under audit: the structural-validator framework contract at `tools/validators/src/structural/utils.ts` and the consumer surfaces in `branching-story-turn-cycle` Phase 9 and `branching-story-health-audit` Phase 2d. The validator framework's `Validator` type (per `tools/validators/src/framework/types.ts`) is the contract the new validator must satisfy; the skill-prose consumers must be updated to describe two deployed validators (`non_propagation_tag_shape` for syntax + `expected_witness_coverage` for semantic coverage) rather than one deferred-coverage validator.
4. FOUNDATIONS principles: Rule 5 (No Consequence Evasion) per `docs/FOUNDATIONS.md:452-453` — public events with mechanically-visible deltas at non-concealed STLOCs that produce no BEL records and no valid non-propagation tag ARE consequence evasion (the observers' belief state should record what they witnessed). §Story Bundles §6a (Belief vs Fact) per `docs/FOUNDATIONS.md:646-650` — BEL records are the canonical surface for observer consequences; the validator enforces that public events produce the BEL records the contract requires. §Story Bundles §6b (Information / Observer Firewall) per `docs/FOUNDATIONS.md:652-656` — the validator's STLOC + STSTAT co-location heuristic is the structural counterpart to §6b's observer-side access-route enforcement; together they govern both directions of the witness firewall (information access AND consequence propagation).
5. Canon Safety surface: new structural validator gates patch-engine pre-apply via `validate_patch_plan` / `submit_patch_plan` for patch plans containing `create_se_record` ops. The validator does NOT weaken the Mystery Reserve firewall (Rule 7) — concealed / offstage STLOCs explicitly exempt SEs from the trigger (the validator never fires on concealed-location events). The semantic event-classification judgment that previously lived in `non_propagation_tag_shape`'s deferred scope remains in skill prose where it already lives; the validator catches the subset of events whose deltas produce mechanically-visible consequences at non-concealed STLOCs.

## Architecture Check

1. Two sibling validators (syntactic `non_propagation_tag_shape` + semantic `expected_witness_coverage`) cleanly separate the two concerns. Alternative — extending `non_propagation_tag_shape` to perform semantic computation in addition to tag-syntax checking — was rejected: the two concerns operate on different data (syntax checks the tag string; semantic coverage queries SE+BEL+STSTAT+STLOC), and combining them would create a single validator with two distinct triggering conditions and verdict-code namespaces — worse maintainability for no benefit. The sibling pattern is the standard worldloom shape (parallel: `canon_baseline_drift` + `canon_drift_classification_evidence`).
2. The deterministic STLOC + STSTAT co-location trigger (per SPEC-36 §Key design decisions) is the `(pragmatic — scoping)` choice over the strictly-correct semantic-event-class trigger. Worked alternative: adding `SE.event_kind` enum values for "public" vs "private" events would be schema expansion explicitly rejected by SPEC-36 §13 Anti-recommendations. The co-location heuristic computes from existing fields and covers the red-team motivation under the most common shape; semantic event-class judgment for ambiguous events stays in skill prose where it already lives.
3. No backwards-compatibility aliasing/shims introduced; `non_propagation_tag_shape` is preserved unchanged in behavior (only its source comment is updated). The new validator is a sibling addition.

## Verification Layers

1. `expected_witness_coverage` appears in `structuralValidators` array exports → codebase grep-proof: `grep -n 'expected_witness_coverage\\|expectedWitnessCoverage' tools/validators/src/public/registry.ts` returns at least two hits (import + array entry).
2. `tools/validators/tests/structural/registry.test.ts` expected validator-name list includes `"expected_witness_coverage"` → schema validation: registry test passes under updated expected list.
3. Four verdict codes (`expected_witness_coverage_missing_public_bel`, `expected_witness_coverage_wrong_group_label`, `expected_witness_coverage_partial_bel_coverage`, `expected_witness_coverage_tag_records_unresolved`) emit correctly under failure fixtures → schema validation: 7 tests minimum (verdict-cases + accept-paths + concealed-location no-trigger case) pass.
4. `non_propagation_tag_shape` behavior unchanged → regression check: `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` continues to pass without modification.
5. Skill-prose pointers updated at both consumer sites + source-comment cleanup → codebase grep-proof: `grep -n 'full witness coverage planned but not yet implemented\\|planned for validator-hardening-II' .claude/skills/ tools/validators/src/` returns ZERO hits.

## What to Change

### 1. Create `tools/validators/src/structural/expected-witness-coverage.ts`

Implement the validator with:

- `name: "expected_witness_coverage"`
- `severity_mode: "fail"`
- `applies_to`: returns true when `ctx.run_mode === "full-world"` OR the patch plan contains `create_se_record`
- Imports + helper-function usage per the established sibling-validator pattern (`observer-firewall.ts` as template)

**Deterministic trigger condition.** The validator fires on an SE record when ALL of the following hold:

- `SE.event_kind` is not `audit_only` (audit-only SE shapes are exempt; see `audit_only_se_shape` validator)
- The actor's STSTAT-derived `location` (from most recent active STSTAT for `SE.actor` at parent-PG snapshot) is a STLOC-N id (not in {`unknown`, `concealed`, `offstage`}) AND that STLOC's `location` field is not in {`concealed`, `offstage`}
- The SE's `state_delta` either (a) creates BEL records with `visibility` in {`public`, `shared`, `factional`, `rumored`}, OR (b) supersedes any STSTAT for a STENT other than the actor, OR (c) creates/supersedes any STENT, OR (d) creates DA records with `visibility` matching the same set

**Expected-witness group computation.** For each triggering SE:

- `direct_witness_group`: all active STENT-ids whose most-recent STSTAT at parent-PG snapshot has `location` equal to the SE actor's `location` AND `life: alive` AND `agency` not in {`incapacitated`, `unconscious`, `dead`}, excluding the actor itself
- `indirect_witness_group`: all active STENT-ids whose STSTAT location matches any STLOC in the same `parent_location` chain as the actor's STLOC (per `STLOC.parent_location` if the field exists; otherwise empty), with the same alive/agency filter

**Coverage check.** Accept when EITHER:

- `state_delta.create[]` includes BEL records covering every STENT in `direct_witness_group` (one BEL per STENT OR one BEL with `holder` in `group:<label>` / `public` form whose semantic membership the validator can verify against the computed group), with `basis.source_event` matching the triggering SE id and appropriate `visibility`; OR
- `SE.world_logic_rationale` contains a parseable `non_propagation:<reason>(group=<label>, records=[...])` tag with `<reason>` in the closed set, `<label>` matching a computed group, and `records=[...]` ids existing and corresponding to that group

On failure, emit one of:
- `expected_witness_coverage_missing_public_bel` — trigger fires; neither BEL coverage nor a valid non-propagation tag present
- `expected_witness_coverage_wrong_group_label` — non-propagation tag's `<label>` doesn't match any computed group
- `expected_witness_coverage_partial_bel_coverage` — BEL coverage for the computed group is incomplete
- `expected_witness_coverage_tag_records_unresolved` — tag cites records that don't exist or don't belong to the computed group

### 2. Register the validator in `tools/validators/src/public/registry.ts`

Add `import { expectedWitnessCoverage } from "../structural/expected-witness-coverage.js";` (alphabetical-by-export-name with other imports). Append `expectedWitnessCoverage` to the `structuralValidators` readonly array after the existing 21 entries, including the `causalDependencyThreatScan` entry landed by `archive/tickets/SPEC36STOPIPNIN-005.md`; the array is unordered for validator-runner consumers.

### 3. Update `tools/validators/tests/structural/registry.test.ts`

Add `"expected_witness_coverage"` to the expected validator-name list (becomes 22 entries after both 005 and 006 land; this ticket can land first with 21 or after 005 with 22).

### 4. Create `tools/validators/tests/structural/expected-witness-coverage.test.ts`

7 tests minimum following the established pattern:

- `expected_witness_coverage_rejects_missing_public_bel` — fixture: SE at non-concealed STLOC with two active co-located STENTs other than actor; state_delta creates public-visibility DA but no BEL records and no non-propagation tag. Expect verdict.
- `expected_witness_coverage_rejects_wrong_group_label` — fixture: SE at public STLOC; non-propagation tag with `group=guards` when computed group label is `group=tavern_patrons`. Expect verdict.
- `expected_witness_coverage_rejects_partial_bel_coverage` — fixture: SE at public STLOC with three co-located STENTs; only one BEL created. Expect verdict.
- `expected_witness_coverage_rejects_tag_records_unresolved` — fixture: valid non-propagation tag but `records=[STENT-99]` where STENT-99 does not exist. Expect verdict.
- `expected_witness_coverage_accepts_full_bel_coverage` — fixture: BEL records for every direct witness. Expect no verdict.
- `expected_witness_coverage_accepts_valid_non_propagation_evidence` — fixture: offstage/concealed event with valid tag citing DA/STOBJ evidence. Expect no verdict.
- `expected_witness_coverage_does_not_trigger_for_concealed_location` — fixture: SE at STLOC with `location: concealed`; no BEL, no tag. Expect no verdict (trigger does not fire).

Use unpadded mock IDs per FOUNDATIONS-002.

### 5. Update skill prose at `.claude/skills/branching-story-turn-cycle/SKILL.md:439`

Replace *"The deployed structural validator for tag syntax is `non_propagation_tag_shape` (full witness coverage planned but not yet implemented; see SPEC-35 Risks & Open Questions)"* with *"The deployed structural validators are `non_propagation_tag_shape` (tag-syntax check) and `expected_witness_coverage` (semantic STLOC + STSTAT co-location coverage check; see SPEC-36 D2). Authors may rely on either BEL creation or a valid non-propagation tag for the computed witness group"*.

### 6. Update skill prose at `.claude/skills/branching-story-health-audit/SKILL.md:196`

Replace the *"full witness coverage planned but not yet implemented; see SPEC-35 Risks & Open Questions"* clause within the larger paragraph with *"the structural validator `expected_witness_coverage` performs semantic STLOC + STSTAT co-location witness-group computation; see `tools/validators/src/structural/expected-witness-coverage.ts` and SPEC-36 D2"*. Preserve the rest of the surrounding paragraph (group computation prose, valid-tag-reason listing, repair_kind: turn_repair).

### 7. Update source comment at `tools/validators/src/structural/non-propagation-tag-shape.ts:4-7`

Replace lines 4-7:
```
// This validator checks non_propagation: tag syntax and closed-reason coverage.
// Full witness coverage (computing direct/indirect witnesses from active STSTAT.location/agency,
// event kind/targets, BEL.basis.source_event) is planned for validator-hardening-II;
// see SPEC-35 Risks & Open Questions.
```
with:
```
// This validator checks non_propagation: tag syntax and closed-reason coverage.
// Full witness coverage is performed by the sibling validator expected_witness_coverage
// (see ./expected-witness-coverage.ts). This validator remains the tag-syntax check
// for non-propagation tags.
```

## Files to Touch

- `tools/validators/src/structural/expected-witness-coverage.ts` (new)
- `tools/validators/src/structural/non-propagation-tag-shape.ts` (modify — source comment only; no behavioral change)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (new)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — line 439)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — line 196)

## Out of Scope

- Schema additions or field expansions. Per SPEC-36 §13 Anti-recommendations, no new SE fields (`SE.event_kind` enum expansion, `SE.requires_witness_coverage` boolean) are added. The deterministic STLOC + STSTAT co-location trigger covers the audit motivation without schema changes.
- Modifying `non_propagation_tag_shape` validator behavior. The sibling validator is preserved unchanged; only its source comment is updated to reflect that semantic coverage now lives in `expected_witness_coverage`.
- Semantic event-class classification (which events are "secrecy / betrayal / public ritual"). Per SPEC-36 §Risks, the deterministic trigger heuristic is the chosen approach; semantic classification stays in skill prose where it already lives. Future calibration after pilot-tier authoring may revisit per §Risks.
- `causal_dependency_threat_scan` validator (SPEC-36 §D1 / `archive/tickets/SPEC36STOPIPNIN-005.md`). Independent sibling validator; it has already landed and does not need further edits in this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. All 7 new test cases in `tools/validators/tests/structural/expected-witness-coverage.test.ts` pass under `npm run build && npm test` in `tools/validators/`.
2. `tools/validators/tests/structural/registry.test.ts` expected validator-name list includes `expected_witness_coverage` and the test passes.
3. `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` continues to pass unchanged (zero behavioral regression on the syntax validator).
4. Full `npm test` in `tools/validators/` is green.
5. `grep -n 'full witness coverage planned but not yet implemented\\|planned for validator-hardening-II' .claude/skills/ tools/validators/src/` returns ZERO hits (all three update sites flipped).

### Invariants

1. `expected_witness_coverage` is a registered structural validator with `severity_mode: "fail"` that runs against patch plans containing `create_se_record` ops.
2. The validator fires only on SEs whose actor is at a non-concealed STLOC AND whose `state_delta` produces mechanically-visible consequences (public-visibility BEL, STSTAT supersessions on other STENTs, STENT create/supersede, or public-visibility DA).
3. `non_propagation_tag_shape` continues to gate tag syntax independently; the two validators coexist as siblings without overlapping verdict codes.
4. Concealed-location SEs are exempt from the trigger; the validator does not weaken the Mystery Reserve firewall or any other Canon Safety check.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/expected-witness-coverage.test.ts` (new) — 7 tests covering all four verdict codes + accept paths + concealed-location no-trigger case; rationale per change list step 4.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — extend expected validator-name list with the new entry.
3. `tools/validators/tests/structural/non-propagation-tag-shape.test.ts` — unchanged; regression-tested as part of the full suite to confirm zero behavioral impact.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/expected-witness-coverage.test.js` — targeted test-file run.
2. `cd tools/validators && npm test` — full-suite proof.
3. `grep -n 'full witness coverage planned but not yet implemented\\|planned for validator-hardening-II' .claude/skills/ tools/validators/src/` — confirm skill-prose pointers + source-comment cleanup all landed.
