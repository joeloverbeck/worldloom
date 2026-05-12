# COMTAX-002: Add commitment route fields to story records while preserving `red-bunny`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — extends CHC/SLT/RSP story-bundle record contracts, validators, schema discovery, and live-corpus proof so `commitment_family` and optional `commitment_detail` can coexist with the expanded closed `commitment_class`.
**Deps**: `archive/tickets/COMTAX-001-commitment-family-and-expanded-base-taxonomy.md`

## Problem

With COMTAX-001 archived, `commitment_class` is an expanded closed base taxonomy and every class maps to a `commitment_family`. Story records still need a way to carry the family explicitly for routing/coverage and a way to carry story-specific precision without making `commitment_class` open.

The target representation is:

```yaml
commitment_family: inquiry_discovery
commitment_class: ask_one_bounded_question
commitment_detail: ask_where_the_knife_came_from
```

The existing story `worlds/erotica-world/stories/red-bunny/*` must remain valid. If this ticket makes new fields required, it must update the existing `red-bunny` CHC/SLT records in the same ticket or provide a validator derivation path that preserves their validity without editing content. Prose and story content must not be rewritten.

## Assumption Reassessment (2026-05-12)

1. Current CHC schema: `tools/validators/src/schemas/story-choice.schema.json` requires `commitment_class` for `choice_kind: scene_commitment` but only validates it as a non-empty string.
2. Current SLT schema: `tools/validators/src/schemas/story-storylet.schema.json` requires `arc_contract.commitment_class` and `exit_portfolio.native_seeds[].commitment_class` but only validates them as non-empty strings.
3. Shared boundary under audit: CHC `commitment_class`, SLT `arc_contract.commitment_class`, SLT `exit_portfolio.native_seeds[].commitment_class`, stop-policy predicate args that name `commitment_class`, and RSP `target_commitment_class` all refer to the same base routing taxonomy.
4. Existing live story constraint: `worlds/erotica-world/stories/red-bunny/_source/choices/CHC-0001.yaml` through `CHC-0009.yaml` and `_source/storylets/SLT-0001.yaml` through `SLT-0012.yaml` currently use only the original 20 commitment classes. Their prose/content should remain valid under the expanded taxonomy.
5. Schema strategy: this ticket should prefer additive fields with derivation fallback over breaking required fields unless it also performs a bounded live-corpus migration. `commitment_family` can be derived from `commitment_class` via the archived COMTAX-001 mapping for old records.
6. Red-bunny data strategy: if the implementation chooses to materialize `commitment_family` in `red-bunny`, add it mechanically from the mapping and do not rewrite labels, prose, obligations, threads, story facts, or storylet dramatic content.
7. Mismatch + correction: the research report proposed `base_commitment_class`. This repo should not add that field; `commitment_class` remains the base routing key, and `commitment_detail` is the new open label.

## Architecture Check

1. Additive `commitment_family` + `commitment_detail` is cleaner than opening `commitment_class` because it preserves existing deterministic joins.
2. Derived-family compatibility is cleaner than forcing immediate world-content edits, but if validators require explicit family fields then the ticket must migrate `red-bunny` mechanically and prove validity.
3. No backwards-compatibility aliasing through `base_commitment_class`. The only accepted shape is `commitment_family`, `commitment_class`, optional `commitment_detail`.

## Verification Layers

1. CHC and SLT schemas accept the route fields and reject inconsistent explicit `commitment_family` values when both family and class are present -> validator/schema test.
2. Existing records without explicit `commitment_family` remain valid by derivation, or `red-bunny` is mechanically migrated and validated -> live-corpus proof.
3. `commitment_detail` is optional, non-empty when present, and intentionally open snake_case/prose-safe label -> schema test.
4. `get_record_schema` exposes the new fields for story record consumers -> MCP schema-discovery test.
5. `red-bunny` structural validation passes after implementation -> live-corpus validation.

## What to Change

### 1. Extend story schemas and validators

Update story record schemas for:

- CHC records: top-level `commitment_family`, `commitment_class`, optional `commitment_detail`.
- SLT records: `arc_contract.commitment_family`, `arc_contract.commitment_class`, optional `arc_contract.commitment_detail`.
- SLT `exit_portfolio.native_seeds[]`: `commitment_family`, `commitment_class`, optional `commitment_detail`.

Add rule-level consistency validation if JSON Schema cannot express the mapping cleanly:

- If `commitment_family` is present, it must equal `commitmentFamilyForClass(commitment_class)`.
- If `commitment_family` is absent, consumers derive it from `commitment_class`.
- `commitment_detail`, when present, must be a non-empty string. Prefer snake_case for machine-authored records; do not reject older human-authored prose unless this ticket explicitly sets that policy.

### 2. Update RSP/remediation card schema surfaces

Update `branching-story-health-audit` RSP templates and consumer schema references to allow:

```yaml
target_commitment_family: null
target_commitment_class: null
target_commitment_detail: null
```

`target_commitment_class` remains canonical/base. `target_commitment_detail` is optional precision.

### 3. Preserve or migrate `red-bunny`

Choose one implementation strategy and record it in the ticket closeout:

- **Preferred compatibility strategy**: existing `red-bunny` records remain valid without content edits because `commitment_family` is derived from existing `commitment_class`.
- **Materialized migration strategy**: add `commitment_family` mechanically to every `red-bunny` CHC and SLT route block, and optionally add no `commitment_detail`. Do not rewrite prose, labels, page plans, story facts, obligations, threads, or relationship content.

If materializing, fix the two known CHC `arc_archetype` drift values only if current validators or skill contracts require it; otherwise leave that orthogonal issue out of scope.

## Files to Touch

- `tools/validators/src/schemas/story-choice.schema.json` (modify)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/src/rules/arc_schema_compliance.ts` or a focused structural validator (modify/new)
- `tools/validators/tests/**` (modify/add)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify if schema discovery expectations change)
- `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` (modify)
- `worlds/erotica-world/stories/red-bunny/_source/choices/*.yaml` (modify only if materialized migration is chosen)
- `worlds/erotica-world/stories/red-bunny/_source/storylets/*.yaml` (modify only if materialized migration is chosen)

## Out of Scope

- Expanding the taxonomy itself (COMTAX-001).
- Updating all authoring/page-cycle/bootstrap instructions (COMTAX-003).
- Rewriting `red-bunny` prose, page plans, labels, or story content.
- Renaming `commitment_class` to `base_commitment_class`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/integration/validate-patch-plan.test.js`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
4. `cd tools/world-mcp && npm run build`
5. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`

### Invariants

1. Existing `red-bunny` story content remains valid and readable.
2. `commitment_class` remains the base routing key.
3. `commitment_family` is either explicit and consistent or derived from `commitment_class`.
4. `commitment_detail` never participates in deterministic joins unless a future ticket explicitly adds such behavior.

## Test Plan

### New/Modified Tests

1. Validator schema/structural tests for explicit family/class consistency.
2. Validator fixture with old-shape route data proving derivation compatibility, unless materialized migration is chosen.
3. Validator fixture with optional `commitment_detail`.
4. MCP schema-discovery test if required fields or optional fields are surfaced.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm test`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
4. `cd tools/world-mcp && npm run build`
5. `cd tools/world-mcp && npm test`
