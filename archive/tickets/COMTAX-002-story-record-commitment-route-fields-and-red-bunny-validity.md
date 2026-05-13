# COMTAX-002: Add commitment route fields to story records while preserving `red-bunny`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — extends CHC/SLT/RSP story-bundle record contracts, validators, schema discovery, and live-corpus proof so `commitment_family` and optional `commitment_detail` can coexist with the expanded closed `commitment_class`.
**Deps**: `archive/tickets/COMTAX-001-commitment-family-and-expanded-base-taxonomy.md`

## Problem

At intake, COMTAX-001 had archived with `commitment_class` as an expanded closed base taxonomy and every class mapped to a `commitment_family`, but story records still lacked a way to carry the family explicitly for routing/coverage or story-specific precision without making `commitment_class` open.

The target representation is:

```yaml
commitment_family: inquiry_discovery
commitment_class: ask_one_bounded_question
commitment_detail: ask_where_the_knife_came_from
```

The existing story `worlds/erotica-world/stories/red-bunny/*` had to remain valid. This ticket landed the validator derivation path, so no existing `red-bunny` CHC/SLT records or prose content were rewritten.

## Assumption Reassessment (2026-05-12)

1. Current CHC schema: `tools/validators/src/schemas/story-choice.schema.json` requires `commitment_class` for `choice_kind: scene_commitment` but only validates it as a non-empty string.
2. Current SLT schema: `tools/validators/src/schemas/story-storylet.schema.json` requires `arc_contract.commitment_class` and `exit_portfolio.native_seeds[].commitment_class` but only validates them as non-empty strings.
3. Shared boundary under audit: CHC `commitment_class`, SLT `arc_contract.commitment_class`, SLT `exit_portfolio.native_seeds[].commitment_class`, stop-policy predicate args that name `commitment_class`, and RSP `target_commitment_class` all refer to the same base routing taxonomy.
4. Existing live story constraint: `worlds/erotica-world/stories/red-bunny/_source/choices/CHC-1.yaml` through `CHC-9.yaml` and `_source/storylets/SLT-1.yaml` through `SLT-12.yaml` currently use only the original 20 commitment classes. Their prose/content should remain valid under the expanded taxonomy.
5. Schema strategy: this ticket used additive fields with derivation fallback rather than a breaking required-field migration. `commitment_family` can be derived from `commitment_class` via the archived COMTAX-001 mapping for old records.
6. Red-bunny data strategy: this ticket uses derivation compatibility, not materialized migration. Existing `red-bunny` CHC/SLT records remain valid without `_source` edits because explicit `commitment_family` is optional and only consistency-checked when present.
7. Same-seam file-list correction: `.claude/skills/branching-story-health-audit/SKILL.md`, `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md`, and `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` also name the RSP parse-time card fields and must move with the RSP template/reference contract. Broader COMTAX-003 story-skill authoring behavior remains out of scope.
8. HARD-GATE / validation-signal check: `docs/HARD-GATE-DISCIPLINE.md` was read because this ticket changes validator/schema and content-generating skill parse-time field guidance; the implementation remains additive and does not weaken approval-token, submit, pre-apply, or Mystery Reserve firewall behavior.
9. Mismatch + correction: the research report proposed `base_commitment_class`. This repo should not add that field; `commitment_class` remains the base routing key, and `commitment_detail` is the new open label.

## Architecture Check

1. Additive `commitment_family` + `commitment_detail` is cleaner than opening `commitment_class` because it preserves existing deterministic joins.
2. Derived-family compatibility is cleaner than forcing immediate world-content edits. The landed validator keeps `commitment_family` optional and checks it only when present, so no `red-bunny` `_source` migration was needed.
3. No backwards-compatibility aliasing through `base_commitment_class`. The only accepted shape is `commitment_family`, `commitment_class`, optional `commitment_detail`.

## Verification Layers

1. CHC and SLT schemas accept the route fields and reject inconsistent explicit `commitment_family` values when both family and class are present -> validator/schema test.
2. Existing records without explicit `commitment_family` remain valid by derivation -> live-corpus proof.
3. `commitment_detail` is optional, non-empty when present, and intentionally open snake_case/prose-safe label -> schema test.
4. `get_record_schema` exposes the new fields for story record consumers -> MCP schema-discovery test.
5. `red-bunny` structural validation passes after implementation -> live-corpus validation.

## Landed Changes

### 1. Extend story schemas and validators

Updated story record schemas for:

- CHC records: top-level `commitment_family`, `commitment_class`, optional `commitment_detail`.
- SLT records: `arc_contract.commitment_family`, `arc_contract.commitment_class`, optional `arc_contract.commitment_detail`.
- SLT `exit_portfolio.native_seeds[]`: `commitment_family`, `commitment_class`, optional `commitment_detail`.

Added structural route validation in `record_schema_compliance` because JSON Schema cannot express the shared mapping cleanly:

- If `commitment_family` is present, it must equal the canonical family for `commitment_class`.
- If `commitment_family` is absent, consumers derive it from `commitment_class`.
- `commitment_class` remains closed to `COMMITMENT_CLASSES`.
- `commitment_detail`, when present, must be a non-empty string. No snake_case hard rejection was added.

### 2. Update RSP/remediation card schema surfaces

Updated `branching-story-health-audit` RSP templates and consumer schema references to allow:

```yaml
target_commitment_family: null
target_commitment_class: null
target_commitment_detail: null
```

`target_commitment_class` remains canonical/base. `target_commitment_detail` is optional precision and is not allowed to be the only deterministic join key.

### 3. Preserve `red-bunny` by derivation

Used the preferred compatibility strategy. Existing `red-bunny` records remain valid without content edits because explicit `commitment_family` is optional and derived from existing `commitment_class` when absent.

## Files to Touch

- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (modify)
- `tickets/COMTAX-003-update-story-skills-for-commitment-route-taxonomy.md` (modify dependency truthing)

## Out of Scope

- Expanding the taxonomy itself (COMTAX-001).
- Updating all authoring/page-cycle/bootstrap instructions (COMTAX-003).
- Rewriting `red-bunny` prose, page plans, labels, or story content.
- Renaming `commitment_class` to `base_commitment_class`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-arc.test.js dist/tests/integration/validate-patch-plan.test.js`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
4. `cd tools/world-mcp && npm run build`
5. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`
6. `cd tools/validators && npm test`
7. `git diff --check`

### Invariants

1. Existing `red-bunny` story content remains valid and readable.
2. `commitment_class` remains the base routing key.
3. `commitment_family` is either explicit and consistent or derived from `commitment_class`.
4. `commitment_detail` never participates in deterministic joins unless a future ticket explicitly adds such behavior.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` — old-shape CHC/SLT compatibility, explicit route fields, family/class mismatch rejection, unknown closed-class rejection, and non-empty `commitment_detail`.
2. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — schema-discovery exposure for CHC and SLT route fields.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm test`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
4. `cd tools/world-mcp && npm run build`
5. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`
6. `cd tools/world-mcp && npm test` (broad diagnostic lane; see Deviations)
7. `git diff --check`

## Outcome

Completed on 2026-05-12.

CHC and SLT record schemas now expose optional `commitment_family` and `commitment_detail` route fields while keeping `commitment_class` as the closed base key. `record_schema_compliance` validates closed `commitment_class` values and rejects explicit `commitment_family` values that do not match the canonical COMTAX-001 class-to-family mapping. Existing records without `commitment_family` remain valid by derivation, so `red-bunny` was not edited.

RSP card producer/consumer surfaces now include `target_commitment_family`, base `target_commitment_class`, and optional `target_commitment_detail`, with prose preserving that detail is not a deterministic join key. COMTAX-003 was truthed to depend on the actual derivation-compatibility strategy.

## Verification Result

Passed:

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/structural/record-schema-compliance-arc.test.js dist/tests/integration/validate-patch-plan.test.js`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` — 6 validators run, 3 skipped, 0 fail / 0 warn / 0 info.
4. `cd tools/world-mcp && npm run build`
5. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`
6. `cd tools/validators && npm test` — 205 tests passed.
7. Final focused rerun after closeout-adjacent edits: `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-arc.test.js dist/tests/integration/validate-patch-plan.test.js`
8. Final focused `red-bunny` rerun: `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` — 0 verdicts.
9. `git diff --check`

Broad diagnostic:

1. `cd tools/world-mcp && npm test` rebuilt successfully, then failed the pre-existing/spec-known local-corpus assertion `SPEC-22 migration and Hook 3 coverage are visible in live repo contracts`, which expects `worlds/erotica-world/stories/red-bunny` to be absent. This checkout has the local/gitignored `red-bunny` story path present. The ticket-owned schema-discovery test passed in the same run.

## Deviations

1. The materialized `red-bunny` migration path was not used. The landed compatibility path derives family from `commitment_class` and leaves story content untouched.
2. `arc_schema_compliance.ts` did not need changes; route-family consistency belongs in `record_schema_compliance`, which already owns structural schema checks.
3. The full `tools/world-mcp` suite still has the unrelated local `red-bunny` presence failure described above; acceptance is on the focused schema-discovery proof plus the validator and live-corpus proofs.
