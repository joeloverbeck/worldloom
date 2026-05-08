# SPEC22SCECOM-005: Add `arc_trace_evidence_alignment` + `narrative_point_classification` + `arc_envelope_conformance` validators

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 3 new validator files under `tools/validators/src/rules/`. Validators auto-register via `tools/validators/src/public/registry.ts`.
**Deps**: archive/tickets/SPEC22SCECOM-002.md

## Problem

At intake, SPEC-22 §Track 2 still needed three trace-and-classification validators: `arc_trace_evidence_alignment` (every ARC_TRACE evidence_span has valid byte offsets within the page's prose; effect_evidence references real variant.required_effects entries; stop_condition_hit.id references a real stop_policy entry); `narrative_point_classification` (PG.state_snapshot.narrative_point_classification is in the closed enum AND consistent with ARC_TRACE.stop_condition_hit.category); `arc_envelope_conformance` (deterministic counterpart to Layer 3's LLM `semantic_critic_verdict` — checks ARC_TRACE.possible_violations[] against arc.execution_envelope at canonical-record-time). Without these, ARC_TRACE evidence could drift from the prose it claimed to cite, narrative_point could be misclassified silently, and high-severity envelope violations could land in committed records without deterministic detection.

## Assumption Reassessment (2026-05-08)

1. `tools/validators/src/rules/` ships existing rule validators; the 3 new validators land alongside as parallel rule files following the deterministic-check ValidatorResult shape.
2. **Cross-skill boundary under audit**: all three validators read ARC_TRACE records (whose write surface lands in 001 + 007 + 008). `narrative_point_classification` additionally reads PG records' `state_snapshot.narrative_point_classification` field (documented by 013). `arc_envelope_conformance` reads ARC_TRACE.possible_violations[] and the realized arc's execution_envelope. The boundary is the persisted-record schema; no runtime page-cycle code is consumed.
3. **SPEC-22 §Risks** (post-2026-05-08-reassessment) explicitly resolved the arc_envelope_conformance gap: this validator was added as the 8th entry in §Track 2 to close the cross-spec dependency on archived SPEC-20 §E's 5 Phase 9 gates. The arc_envelope_conformance check is the deterministic counterpart to the Layer 3 LLM `semantic_critic_verdict`; it operates on already-extracted ARC_TRACE.possible_violations[] evidence rather than re-running an LLM critic.
4. **FOUNDATIONS Rule 7 (Preserve Mystery Deliberately)** restated: a high-severity envelope violation could touch `mystery_preservation.forbidden_resolutions[]` — silently committing such a violation would weaken the Mystery Reserve firewall. `arc_envelope_conformance` HARD-REJECTs high-severity entries at canonical-record-time, preserving the firewall.
5. **HARD-GATE / canon-write ordering**: N/A at validator-framework level — validators run inside the patch-engine pre-apply gate (existing surface) and inside `world-validate` CLI; they don't themselves write records.
6. **Run-mode boundary**: the three validators apply in `full-world`, `pre-apply` when ARC_TRACE / PG / SLT story-record ops are present, and `incremental` when touched files include arc-trace, page, storylet, or page-prose paths. Pre-apply proof also requires `tools/validators/src/_helpers/index-access.ts` to materialize `create_arc_trace_record`; without that same-seam helper update, patch-plan validation would not see newly-created ARC_TRACE records.
7. **Schema extension**: validators consume v2 schemas added in archive/tickets/SPEC22SCECOM-002.md, including the new `story-arc-trace.schema.json`. The `narrative_point` enum is added to canonical-vocabularies in 006 (soft dep — validator ships with an inline enum first).
8. **CLI proof correction**: the live `world-validate` CLI uses positional `world-validate <world-slug>` and `--rules=<validator_names>`; there is no `--world` flag. The CLI named-rule allowlist in `tools/validators/src/cli/_helpers.ts`, registry/count tests, and package README inventory are same-seam fallout for adding registered validators.
9. (Rename/removal): None — pure addition.

## Architecture Check

1. Three distinct validators rather than one merged validator: each operates on a different field surface within ARC_TRACE / PG records and produces distinct failure-mode reasons. Merging would conflate three independently meaningful checks.
2. `arc_envelope_conformance` is intentionally the deterministic counterpart to Layer 3's LLM `semantic_critic_verdict` rather than a redundant re-implementation — the LLM critic catches semantic-prose-level violations at extraction time; this validator catches the same violations from already-emitted ARC_TRACE.possible_violations[] evidence at canonical-record-time, providing a cheap deterministic backstop.
3. No backwards-compatibility aliasing/shims.

## Verification Layers

1. `arc_trace_evidence_alignment` rejects out-of-range evidence_span (start < 0, end > prose length, end ≤ start); rejects effect_evidence with effect_ref pointing outside variants[<applied>].required_effects[] range; rejects stop_condition_hit.id not matching any real stop_policy entry — unit tests.
2. `narrative_point_classification` rejects unknown classification (not in closed enum); rejects classification inconsistent with stop_condition_hit.category (e.g., NATURAL_COMMITMENT_HINGE when category is interrupt_before).
3. `arc_envelope_conformance` rejects ARC_TRACE with high-severity possible_violations entry (forbidden_actions realized in prose; mystery_preservation.forbidden_resolutions[] touched); accepts medium-severity as warning; accepts low-severity as info; auto-PASSes at PG-0001 (root-page no-arc exception).
4. Registry registration → grep validator names in `tools/validators/src/public/registry.ts`.
5. FOUNDATIONS Rule 7 alignment: arc_envelope_conformance HARD-REJECT preserves Mystery Reserve firewall by blocking commits that touch forbidden_resolutions.

## Landed Changes

### 1. Added `tools/validators/src/rules/arc_trace_evidence_alignment.ts`

Deterministic check function over ARC_TRACE records (with referenced PG + SLT records resolved):

- For each ARC_TRACE: verifies every `evidence_span: {start, end}` byte offset has start ≥ 0, end > start, end ≤ prose-length-of-cited-page.
- Verifies every `effect_evidence[].effect_ref` is in-range for the applied variant's `required_effects[]` (0 ≤ effect_ref < required_effects.length).
- Verifies every `stop_condition_hit.id` references a real `arc.stop_policy.normal_exits[N].id`, `interrupt_before[N].id`, or named `safety_valves` key.
- Failure mode: HARD-REJECT.

### 2. Added `tools/validators/src/rules/narrative_point_classification.ts`

Deterministic check function over PG records (with optional ARC_TRACE resolved via `state_snapshot.arc_trace_id`):

- Verifies `PG.state_snapshot.narrative_point_classification` is in the closed enum: `CONTINUE_ARC`, `NATURAL_COMMITMENT_HINGE`, `INTERRUPT_HINGE`, `CONTINUE_ONLY_PAUSE`, `TERMINAL_OR_CHAPTER_CLOSE`.
- Consistency check (when ARC_TRACE present): NATURAL_COMMITMENT_HINGE iff stop_condition_hit.category == normal_exit; INTERRUPT_HINGE iff interrupt_before; CONTINUE_ONLY_PAUSE iff safety_valve.
- Bootstrap PG-0001 root-page exception: NATURAL_COMMITMENT_HINGE accepted as the bootstrap default (per SPEC-20 §F's PG-0001 special case).
- Failure mode: HARD-REJECT.

### 3. Added `tools/validators/src/rules/arc_envelope_conformance.ts`

Deterministic check function over ARC_TRACE records (with realized arc resolved):

- For each ARC_TRACE: iterates `possible_violations[]`. For each violation: classifies severity from the persisted violation severity (high / medium / low).
- High-severity: HARD-REJECT (forbidden_actions realized in prose; mystery_preservation.forbidden_resolutions[] touched).
- Medium-severity: surface as `warning` finding.
- Low-severity: surface as `info`.
- PG-0001 root-page exception: when no arc has been realized (root scene-setter), this validator auto-PASSes with rationale `"PG-0001 root special case — no arc selected"` (preserves the bootstrap-PG-0001 vacuous-at-root semantics required by archived SPEC-20 §F).

### 4. Registered validators and truth-synced package surfaces

Added the three new validator imports + entries to `ruleValidators`, added the names to the CLI `--rules` allowlist, materialized `create_arc_trace_record` in the pre-apply read surface, updated registry/count tests, extended the temp-indexed v2 story-bundle CLI smoke, and updated the package README inventory.

## Files to Touch

- `tools/validators/src/rules/arc_trace_evidence_alignment.ts` (new)
- `tools/validators/src/rules/narrative_point_classification.ts` (new)
- `tools/validators/src/rules/arc_envelope_conformance.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register new validators)
- `tools/validators/src/cli/_helpers.ts` (modify — allow the new validator names in `--rules`)
- `tools/validators/src/_helpers/index-access.ts` (modify — materialize `create_arc_trace_record` during pre-apply reads)
- `tools/validators/tests/rules/arc_trace_evidence_alignment.test.ts` (new)
- `tools/validators/tests/rules/narrative_point_classification.test.ts` (new)
- `tools/validators/tests/rules/arc_envelope_conformance.test.ts` (new)
- `tools/validators/tests/rules/registry.test.ts` (modify — registry inventory)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator count/list)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply skip inventory + ARC_TRACE materialization proof)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify — v2 story-bundle CLI smoke includes all 8 scene-commitment rule validators)
- `tools/validators/README.md` (modify — validator inventory/count)
- `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (modify — truth Track 2 status when this lands)
- `specs/IMPLEMENTATION-ORDER.md` (modify — truth Track 2 validator count/status)

## Out of Scope

- Effect-model validators (in 004)
- Schema-shape + DSL validators (in 003)
- Schema infrastructure (in archive/tickets/SPEC22SCECOM-002.md)
- Layer 3 LLM `semantic_critic_verdict` extraction logic — owned by archived SPEC-20 (runtime page-cycle); this validator only consumes already-emitted ARC_TRACE.possible_violations[]
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `arc_trace_evidence_alignment` accepts well-formed fixture; rejects on each of: evidence_span out-of-range, effect_evidence.effect_ref out-of-range, stop_condition_hit.id unknown.
2. `narrative_point_classification` rejects unknown enum value; rejects inconsistent classification (NATURAL_COMMITMENT_HINGE when stop_condition_hit.category is interrupt_before); accepts NATURAL_COMMITMENT_HINGE at PG-0001 (root-page exception).
3. `arc_envelope_conformance` HARD-REJECTs on high-severity possible_violations entry; surfaces medium-severity as warning; surfaces low-severity as info; auto-PASSes at PG-0001 with rationale `"PG-0001 root special case — no arc selected"`.
4. `world-validate` CLI runs against the temp-indexed v2 fixture bundle and emits PASS for all eight scene-commitment rule validators, including the three new validators.

### Invariants

1. Every ARC_TRACE.evidence_span has valid byte offsets within the cited prose (per arc_trace_evidence_alignment).
2. Every ARC_TRACE.effect_evidence[].effect_ref is in-range for the applied variant's required_effects[] (per arc_trace_evidence_alignment).
3. PG.state_snapshot.narrative_point_classification is in the closed enum and consistent with stop_condition_hit.category (per narrative_point_classification).
4. No high-severity envelope violation lands in committed ARC_TRACE records (per arc_envelope_conformance — preserves Mystery Reserve firewall per FOUNDATIONS Rule 7).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/arc_trace_evidence_alignment.test.ts` (new) — passing + 3 failing fixtures.
2. `tools/validators/tests/rules/narrative_point_classification.test.ts` (new) — passing + 2 failing + PG-0001 root exception.
3. `tools/validators/tests/rules/arc_envelope_conformance.test.ts` (new) — high/medium/low severity scenarios + PG-0001 vacuous-at-root.
4. `tools/validators/tests/rules/registry.test.ts` (modified) — rule registry inventory includes the three new validators.
5. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modified) — temp-indexed v2 story bundle exercises all 8 scene-commitment rule validators through the compiled CLI.
6. `tools/validators/tests/integration/spec04-verification.test.ts` (modified) — SPEC-04 registry count/list now expects 17 rule validators / 26 total validators.
7. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified) — clean non-story patch plans skip these validators, and `create_arc_trace_record` pre-apply materialization lets all three new validators pass on a valid trace plan.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm run test`
3. `cd tools/validators && node dist/src/cli/world-validate.js clean --story alpha --rules arc_schema_compliance,choice_worthiness_completeness,effect_model_legality,effect_model_replay_safety,stop_policy_parsability,arc_trace_evidence_alignment,narrative_point_classification,arc_envelope_conformance --json`

## Outcome

Completed: 2026-05-08.

Implemented and registered all three remaining SPEC-22 Track 2 trace/classification validators. `arc_trace_evidence_alignment` now validates ARC_TRACE evidence spans against page prose, effect references against the applied variant's required effects, and stop-condition ids against the realized arc's stop policy. `narrative_point_classification` validates PG narrative-point enum values and the deterministic stop-category consistency checks, including the PG-0001 root default. `arc_envelope_conformance` emits fail/warn/info verdicts for high/medium/low persisted envelope violations and preserves the PG-0001 no-arc exception.

Same-seam package fallout was also completed: registry imports/entries, CLI named-rule selection, pre-apply materialization for `create_arc_trace_record`, package README inventory/counts, registry/count tests, the v2 story-bundle CLI smoke, and SPEC-22 / implementation-order status prose.

Outcome amended: 2026-05-08.

Post-review refinement changed `arc_trace_evidence_alignment` to validate `evidence_span.start` / `end` against UTF-8 byte length rather than JavaScript string length, and added non-ASCII regression coverage proving valid UTF-8 byte spans are accepted while spans beyond byte length are rejected.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/rules/arc_trace_evidence_alignment.test.js dist/tests/rules/narrative_point_classification.test.js dist/tests/rules/arc_envelope_conformance.test.js dist/tests/rules/registry.test.js dist/tests/cli/world-validate.story-bundle.test.js` — passed, 17 focused tests, including non-ASCII UTF-8 byte-offset acceptance and rejection coverage.
3. `cd tools/validators && node --test dist/tests/integration/spec04-verification.test.js` — passed after registry count/order truthing.
4. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js` — passed after adding the clean-plan skip classification for the three new story validators and the ARC_TRACE pre-apply materialization proof.
5. `cd tools/validators && npm test` — passed, 182 tests.
6. Manual FOUNDATIONS Rule 7 alignment check: `arc_envelope_conformance` leaves low/medium findings visible but blocks high-severity ARC_TRACE violations, preserving the Mystery Reserve firewall at the deterministic validator layer.
7. Codebase grep-proof: the three validator names appear in `tools/validators/src/public/registry.ts`, `tools/validators/src/cli/_helpers.ts`, `tools/validators/README.md`, and focused tests.

## Deviations

- The drafted CLI command used a non-live `--world` flag. The landed proof uses the current positional form: `node dist/src/cli/world-validate.js clean --story alpha --rules ... --json`.
- The implementation keeps the `narrative_point` enum inline because SPEC22SCECOM-006 still owns the canonical-vocabulary export. This matches the ticket's soft-dependency boundary.
- `arc_trace_evidence_alignment` accepts named `stop_policy.safety_valves` keys for `CONTINUE_ONLY_PAUSE` compatibility in addition to normal/interrupt stop ids; this is same-seam required fallout from the ticket's own narrative-point safety-valve consistency rule.
- Post-review initially reopened the ticket because span bounds used JavaScript string length. That blocker is resolved by the 2026-05-08 amended outcome and proof above.
