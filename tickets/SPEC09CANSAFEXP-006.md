# SPEC09CANSAFEXP-006: diegetic-artifact-generation template cleanup — statement_of_existence + world_relation block

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` adds two new frontmatter fields (`statement_of_existence`, structured `world_relation` block); `.claude/skills/diegetic-artifact-generation/SKILL.md` updates the frontmatter-fields enumeration in §Output to mirror the template; `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` extends to declare the new optional fields.
**Deps**: None (independent of canon-safety expansion's main thrust; minor template cleanup)

## Problem

SPEC-09 §Deliverables `diegetic-artifact-generation skill updates` ships two minor template additions: (a) a `statement_of_existence` field describing what physically exists in-world (paper, stone, tablet, wax seal, oral performance record, etc.); (b) an explicit `world_relation: { corroborates, contests, conceals, mythologizes, ritualizes }` structured block that surfaces what the artifact does to canon — currently this is implicit in `claim_map` + `desired_relation_to_truth`. Making `world_relation` explicit enables future cross-artifact queries (e.g., "which artifacts corroborate CF-0024?"). These additions are unrelated to the canon-safety expansion's main thrust (Rules 11/12, conditionally-mandatory blocks) and can land independently.

## Assumption Reassessment (2026-04-27)

1. `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` exists (confirmed at spot-check (a)) and is the authoritative schema for diegetic artifact frontmatter (per `.claude/skills/diegetic-artifact-generation/SKILL.md` §Output, which states *"Frontmatter fields enumerated in templates/diegetic-artifact.md (the authoritative schema)"*).
2. `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` exists (confirmed via spot-check listing of validator schemas dir) and is the structural-validation schema enforced by `record_schema_compliance` for diegetic artifact frontmatter. Adding new optional fields requires extending this schema or risk the structural validator rejecting artifacts that include the new fields (parallel to the CF schema's `additionalProperties: false` issue from SPEC09CANSAFEXP-002).
3. **Cross-skill / cross-artifact boundary under audit**: this ticket extends the diegetic-artifact frontmatter schema. Consumers — `diegetic-artifact-generation` skill (writes), `canon-facts-from-diegetic-artifacts` skill (reads), `record_schema_compliance` validator (validates) — pick up the additive optional fields without code changes. No existing artifact requires retrofit.
4. **FOUNDATIONS principle motivating this ticket**: SPEC-09 §Out of Scope rejects "Artifact Provenance as a new FOUNDATIONS section" because the diegetic-artifact-generation template already covers most provenance fields. The two minor additions handled here close residual gaps (`statement_of_existence` for physical-form documentation; explicit `world_relation` for query-friendliness) without requiring a FOUNDATIONS section addition.
5. **No HARD-GATE / canon-write ordering surface touched.** Diegetic artifacts go through their own HARD-GATE in diegetic-artifact-generation, but template-field additions don't change gate semantics. Mystery Reserve firewall unaffected.
6. **Schema extension shape**: additive-only. Both fields optional; existing diegetic artifacts (if any) lack both fields and remain valid post-extension.

## Architecture Check

1. Adding fields to the existing template (rather than creating a separate "extended-template" file) preserves single-source-of-truth. The skill's §Output already cites `templates/diegetic-artifact.md` as authoritative; extending it keeps that pointer valid.
2. `world_relation` as a structured block (rather than an unstructured prose field) enables future grep-driven cross-artifact queries — a `grep "corroborates: CF-0024"` directly answers "which artifacts corroborate CF-0024?" without parsing free prose.
3. No backwards-compatibility shims introduced. Both fields are optional in the JSONSchema; existing artifacts validate without modification.

## Verification Layers

1. Template adds the two new fields — codebase grep-proof (`grep -n "statement_of_existence\|world_relation" .claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md`).
2. SKILL.md §Output frontmatter-fields enumeration updated to include the new fields — codebase grep-proof.
3. Validator schema accepts the new fields — schema validation: `node -e "const Ajv = require('ajv'); const ajv = new Ajv(); const s = require('./tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json'); ajv.compile(s); console.log('OK');"` from repo root.
4. Existing diegetic artifact (if any in `worlds/<slug>/diegetic-artifacts/`) still validates — `world-validate <slug> --structural --json` exits 0.
5. diegetic-artifact-generation skill dry-run on a synthetic artifact emits both new fields with concrete values — skill dry-run.

## What to Change

### 1. `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` — add two new frontmatter fields

Locate the existing frontmatter section (between the opening `---` and the first body section). Add two new fields. Field order: insert `statement_of_existence` after `artifact_type` (logical grouping: type and physical existence describe what the artifact IS); insert `world_relation` after `desired_relation_to_truth` (logical grouping: both describe the artifact's relation to truth/canon).

Schema:

```yaml
statement_of_existence: <one-line description of what physically exists in-world: paper, stone tablet, wax seal, oral performance record, woven pattern, scratched cave wall, etc.>

world_relation:
  corroborates: []  # CF-NNNN list of canon facts this artifact reinforces
  contests: []      # CF-NNNN list this artifact disputes
  conceals: []      # CF-NNNN list this artifact hides or obscures
  mythologizes: []  # CF-NNNN list this artifact transforms into legend
  ritualizes: []    # CF-NNNN list this artifact embeds in ritual/ceremony
```

Both fields are optional. Authors set `statement_of_existence` to a one-line string; `world_relation` accepts arrays of CF IDs (empty arrays acceptable when no relation of that type applies; omit the field entirely when the artifact's relation to canon is purely implicit in `claim_map`).

### 2. `.claude/skills/diegetic-artifact-generation/SKILL.md` — update §Output frontmatter-fields enumeration

Locate the §Output bullet enumerating frontmatter fields (greppable anchor: `Frontmatter fields enumerated in templates/diegetic-artifact.md`). The current list ends with `notes`. Append `statement_of_existence` (after `artifact_type`) and `world_relation` (after `desired_relation_to_truth`) so the SKILL.md enumeration mirrors the template field order.

### 3. `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` — declare new optional fields

Add two new properties under `properties`:

```jsonschema
"statement_of_existence": { "type": "string", "minLength": 1 },
"world_relation": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "corroborates": { "type": "array", "items": { "type": "string", "pattern": "^CF-[0-9]{4}$" } },
    "contests":     { "type": "array", "items": { "type": "string", "pattern": "^CF-[0-9]{4}$" } },
    "conceals":     { "type": "array", "items": { "type": "string", "pattern": "^CF-[0-9]{4}$" } },
    "mythologizes": { "type": "array", "items": { "type": "string", "pattern": "^CF-[0-9]{4}$" } },
    "ritualizes":   { "type": "array", "items": { "type": "string", "pattern": "^CF-[0-9]{4}$" } }
  }
}
```

Both properties are optional (NOT added to the schema's `required` array if one exists; if the schema has `additionalProperties: false`, the new properties allow artifacts to declare them without rejection).

### 4. Test fixture (light-touch)

Add a small fixture at `tools/validators/tests/fixtures/diegetic-artifact-with-new-fields.yaml` exercising both new fields, plus a test case in `tools/validators/tests/structural/record-schema-compliance.test.ts` that asserts the fixture validates cleanly.

## Files to Touch

- `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` (modify) — add `statement_of_existence` and `world_relation` fields
- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify) — extend §Output frontmatter-fields enumeration at line 102
- `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (modify) — declare two new optional fields
- `tools/validators/tests/fixtures/diegetic-artifact-with-new-fields.yaml` (new)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — add test case for the new fixture

## Out of Scope

- Existing diegetic artifact backfill (no retroactive sweep — additive optional fields don't require backfill)
- New FOUNDATIONS §Artifact Provenance section (rejected at SPEC-09 design time; the template IS the schema)
- canon-facts-from-diegetic-artifacts skill changes (the mining flow reads the template; new fields ingest as optional context, no skill change required)
- Cross-artifact query tooling (`mcp__worldloom__find_artifacts_corroborating(cf_id)`-style retrieval surface) — out of scope for this ticket; the structured `world_relation` block enables such tooling later but does not require it now
- Rules 11/12 validators (delivered by SPEC09CANSAFEXP-003)
- canon-addition / continuity-audit / create-base-world updates

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "statement_of_existence|world_relation:" .claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` returns matches at the new field positions.
2. `grep -nE "statement_of_existence|world_relation" .claude/skills/diegetic-artifact-generation/SKILL.md` returns matches in the §Output frontmatter-fields enumeration.
3. `grep -nE "statement_of_existence|world_relation" tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` returns matches in the schema's `properties` block.
4. `cd tools/validators && npm test` — full validator test suite passes including the new diegetic-artifact fixture.
5. `cd tools/validators && npm run build` — TypeScript compilation succeeds.
6. ajv compile succeeds: `node -e "const Ajv = require('ajv'); const ajv = new Ajv(); const s = require('./tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json'); ajv.compile(s); console.log('OK');"` from repo root.

### Invariants

1. Existing diegetic artifacts (if any in animalia or elsewhere) validate cleanly post-schema-extension. Both new fields are optional.
2. `world_relation` sub-fields all accept CF-NNNN ID format only; ad-hoc strings or other ID prefixes fail schema validation.
3. Template field order preserves the logical groupings stated in §What to Change (statement_of_existence near artifact_type; world_relation near desired_relation_to_truth).
4. SKILL.md §Output enumeration order mirrors template field order — readers of either surface see the same field sequence.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/diegetic-artifact-with-new-fields.yaml` (new) — fixture exercising both fields with valid values.
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — add test case asserting the fixture validates.

### Commands

1. `cd tools/validators && npm test` — package-local test suite.
2. `cd tools/validators && npm run build` — TypeScript compile.
3. `grep -nE "statement_of_existence|world_relation" .claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md .claude/skills/diegetic-artifact-generation/SKILL.md tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` — all three surfaces carry the new fields.
