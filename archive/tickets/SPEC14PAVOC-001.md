# SPEC14PAVOC-001: Validator Framework Update — Adjudication Frontmatter, Status-Coupled Mystery, Geography / Technology Domains

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/` (schema renamed; `record_schema_compliance` adjudication path; `rule7_mystery_reserve_preservation` cross-field rule; `adjudication_discovery_fields` retired; `CANONICAL_DOMAINS` adds `geography` and `technology`; schema gains `originating_skill`)
**Deps**: SPEC-14, `archive/tickets/SPEC14PAVOC-003.md` (shared canonical-vocabularies module landed first so this ticket can import from it)

## Problem

At intake, per SPEC-14, the validator framework:
- Reads adjudication records by scanning the file body for a `## Discovery` heading + bullet list (`record_schema_compliance.ts:127-137` + `parseDiscoveryBlock` regex), inconsistent with the engine's frontmatter emission and with the character/DA hybrid records.
- Hardcodes `low|medium|high` as the only valid `future_resolution_safety` values, collapsing the load-bearing distinction between forbidden mysteries (M-5 architecture) and rare-but-allowed mysteries.
- Lacks `geography` and `technology` in `CANONICAL_DOMAINS`; geography is one of the 13 mandatory world concerns per FOUNDATIONS §Mandatory World Files, and technology is both an ontology category and half of the mandatory `Magic or Tech Systems` concern.
- Runs a separate `adjudication_discovery_fields` validator whose purpose is subsumed by `record_schema_compliance` against a frontmatter-bearing schema.

At intake these contributed 153 of the 224 grandfathered findings on animalia (140 GF-0004 + 8 GF-0008 + 3 GF-0006 geography subset + 7 GF-0001 retired-validator findings; 17 GF-0006 domain re-tags handled by `SPEC14PAVOC-005` content fix). The `technology` addition closes a FOUNDATIONS vocabulary oversight for future CFs but does not change the current animalia grandfathering count.

## Assumption Reassessment (2026-04-25)

1. `tools/validators/src/structural/record-schema-compliance.ts` was the adjudication parsing branch. Switching from `parseDiscoveryBlock(file.content)` to `frontmatterFor(file.content)` mirrors the existing characters/diegetic-artifacts branches and now treats a missing PA frontmatter block as `{}` so legacy body-only PAs fail schema-required fields instead of being ignored.
2. `tools/validators/src/_helpers/index-access.ts` and `tools/validators/src/cli/_helpers.ts` both reconstruct indexed DB rows for validator consumers. Both had to switch adjudication rows from `parseDiscoveryBlock(row.body)` to `parseYamlRecord(frontmatterFor(row.body) ?? "")`; `tools/validators/src/cli/_helpers.ts` was required same-seam fallout found during implementation.
3. `tools/validators/src/structural/adjudication-discovery-fields.ts` was the validator being retired. Pipeline-wide grep confirmed the live registry is `tools/validators/src/public/registry.ts`, not `tools/validators/src/framework/aggregate.ts`; removal there removes the CLI and public validation surface.
4. `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts` hardcoded `VALID_FUTURE_RESOLUTION_SAFETY`. Per SPEC-14 §Approach workstream 4, this is status-coupled via `MYSTERY_STATUS_ENUM` and `mysteryResolutionSafetyForStatus` from `@worldloom/world-index/public/canonical-vocabularies`.
5. Schema rename `adjudication-discovery.schema.json` → `adjudication-frontmatter.schema.json`: `tools/validators/src/structural/utils.ts:53-64` (`RECORD_TYPE_TO_SCHEMA`) maps `adjudication_record` → `adjudication-discovery`; this map updates to point to the renamed file. The schema content adds `originating_skill` (optional) but otherwise unchanged in field set / required list.
6. `geography` and `technology` additions to `CANONICAL_DOMAINS` are single-source updates. Per `archive/tickets/SPEC14PAVOC-003.md`, the canonical list lives in `tools/world-index/src/public/canonical-vocabularies.ts` — this ticket adds any remaining missing domains there, not in any validator-local file.
7. FOUNDATIONS Rule 2 now lists `geography` and `technology` per the SPEC-14 collateral amendment and follow-up vocabulary correction; the validator change ratifies what FOUNDATIONS now says.
8. Schema extension is additive only: `originating_skill` is optional. Existing body-prose animalia adjudications now fail the unchanged required frontmatter fields until `SPEC14PAVOC-004` migrates them; the optional `originating_skill` field is not the source of those failures.
9. The live animalia grandfathering policy had exact-match rows for the old Rule 7 code/message. Updating GF-0008 code/message text to `rule7.future_resolution_safety_status_mismatch` is required matcher fallout for the renamed validator verdict, while leaving actual content normalization to `SPEC14PAVOC-005`.

## Architecture Check

1. Mirroring the character/DA frontmatter pattern is structurally cleaner than maintaining a separate Discovery-block parsing path. Three hybrid record types now share one validation strategy (frontmatter via `frontmatterFor`).
2. Status-coupled mystery rule formalizes the existing semantic distinction (forbidden mysteries are categorically different from low-resolution-safety mysteries) at the validator level rather than via authoring discipline alone.
3. No backwards-compatibility shim. The `parseDiscoveryBlock` function is removed entirely along with the `adjudication_discovery_fields` validator. Pre-migration animalia PAs (which lack frontmatter) will fail `record_schema_compliance` against the new schema; that is intentional and resolved by `SPEC14PAVOC-004`'s migration.

## Verification Layers

1. Adjudication frontmatter parsing → `tools/validators/tests/structural/record-schema-compliance.test.ts` — new fixtures: a frontmatter-form PA passes; a body-only PA (legacy shape) fails with all 8 missing-required errors.
2. Status-coupled mystery rule → `tools/validators/tests/rules/rule7-mystery-reserve-preservation.test.ts` — 4 cases: `forbidden`+`none` passes; `forbidden`+`low` fails (`rule7.future_resolution_safety_status_mismatch`); `active`+`medium` passes; `active`+`none` fails.
3. `geography` / `technology` domains → `tools/validators/tests/rules/rule2-no-pure-cosmetics.test.ts` — adds cases asserting both are canonical; existing canonical domains all still pass.
4. Retired `adjudication_discovery_fields` → `tools/validators/tests/cli/world-validate.test.ts` — assert validator name is NOT in `summary.validators_run`.
5. Schema rename → schema-loader fixture asserts `RECORD_TYPE_TO_SCHEMA[adjudication_record]` resolves to the renamed `.json` file and Ajv compilation succeeds.

## What to Change

### 1. Add `geography` and `technology` to canonical domain enum

In `tools/world-index/src/public/canonical-vocabularies.ts` (created by `archive/tickets/SPEC14PAVOC-003.md`), append `"geography"` and retain the follow-up `"technology"` addition in `CANONICAL_DOMAINS`. With both FOUNDATIONS corrections, the export is 24 entries.

### 2. Rename adjudication schema

Move `tools/validators/src/schemas/adjudication-discovery.schema.json` → `tools/validators/src/schemas/adjudication-frontmatter.schema.json`. Update title comment to *"Parsed YAML frontmatter for `worlds/<slug>/adjudications/PA-NNNN-*.md`; consistent with `character-frontmatter` and `diegetic-artifact-frontmatter`."* Add `originating_skill` to `properties` as `{ "type": "string" }` (optional — not in `required`).

Update `tools/validators/src/structural/utils.ts` `RECORD_TYPE_TO_SCHEMA` entry: `adjudication_record` → `"adjudication-frontmatter"`.

### 3. Switch `record_schema_compliance` adjudication path to frontmatter

In `tools/validators/src/structural/record-schema-compliance.ts:127-137`, replace the adjudication branch:

```typescript
if (normalizedPath.startsWith("adjudications/")) {
  const frontmatter = frontmatterFor(file.content);
  const parsed = frontmatter === null ? {} : parseYamlSurface(frontmatter);
  if (!parsed) continue;
  records.push({
    node_id: String(asPlainRecord(parsed).pa_id ?? normalizedPath),
    node_type: "adjudication_record",
    file_path: normalizedPath,
    parsed
  });
}
```

Remove the `parseDiscoveryBlock` import + function from this file.

### 4. Switch `parsedBodyFor` adjudication branch

In `tools/validators/src/_helpers/index-access.ts:262-264` and `tools/validators/src/cli/_helpers.ts`, route adjudication rows through frontmatter parsing:

```typescript
if (row.node_type === "character_record" || row.node_type === "diegetic_artifact_record" || row.node_type === "adjudication_record") {
  return parseYamlRecord(frontmatterFor(row.body) ?? "");
}
```

Remove the `parseDiscoveryBlock` import.

### 5. Retire `adjudication_discovery_fields` validator

Delete `tools/validators/src/structural/adjudication-discovery-fields.ts`. Remove from `tools/validators/src/public/registry.ts`.

### 6. Status-couple mystery `future_resolution_safety` rule

In `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts`:
- Remove inline `VALID_FUTURE_RESOLUTION_SAFETY` and `VALID_STATUSES` sets.
- Import `MYSTERY_STATUS_ENUM` and `mysteryResolutionSafetyForStatus` from `@worldloom/world-index/public/canonical-vocabularies`.
- Replace the resolution-safety check (lines 30-42) with status-coupled logic:

```typescript
const status = typeof parsed.status === "string" ? parsed.status : "";
if (!MYSTERY_STATUS_ENUM.includes(status)) {
  verdicts.push(fail(VALIDATOR, "rule7.invalid_status", `${mrId} has invalid status '${status}'`, record));
} else {
  const allowed = mysteryResolutionSafetyForStatus(status);
  const safety = typeof parsed.future_resolution_safety === "string" ? parsed.future_resolution_safety : "";
  if (!allowed.includes(safety)) {
    verdicts.push(fail(
      VALIDATOR,
      "rule7.future_resolution_safety_status_mismatch",
      `${mrId} has future_resolution_safety '${safety}' but status '${status}' allows only [${allowed.join(", ")}]`,
      record
    ));
  }
}
```

The existing `rule7.invalid_future_resolution_safety` code is replaced by `rule7.future_resolution_safety_status_mismatch`. Update the test fixtures + grandfathering matcher accordingly.

### 7. Update tests + fixtures

- `tools/validators/tests/structural/record-schema-compliance.test.ts` — add frontmatter-form PA fixture; assert pass. Add legacy body-only PA fixture; assert fail with required-field errors.
- `tools/validators/tests/rules/rule7-mystery-reserve-preservation.test.ts` — replace the existing safety-enum tests with the 4 status-coupled cases.
- `tools/validators/tests/rules/rule2-no-pure-cosmetics.test.ts` — add `geography` and `technology` to the canonical-domain happy path.
- `tools/validators/tests/cli/world-validate.test.ts` — assert `adjudication_discovery_fields` is NOT in `summary.validators_run`.
- `tools/validators/tests/integration/spec04-verification.test.ts` — update the interim animalia baseline to expect 136 visible PA frontmatter failures until `SPEC14PAVOC-004`.

## Files to Touch

- `tools/world-index/src/public/canonical-vocabularies.ts` (modify — add `geography`; `technology` was added by the archived SPEC14PAVOC-003 follow-up correction)
- `tools/validators/src/schemas/adjudication-discovery.schema.json` (delete via move)
- `tools/validators/src/schemas/adjudication-frontmatter.schema.json` (new — content of the old schema, renamed; adds `originating_skill`)
- `tools/validators/src/structural/utils.ts` (modify — RECORD_TYPE_TO_SCHEMA entry)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify — adjudication branch + remove `parseDiscoveryBlock`)
- `tools/validators/src/_helpers/index-access.ts` (modify — `parsedBodyFor` adjudication branch + remove import)
- `tools/validators/src/cli/_helpers.ts` (modify — CLI DB-row adjudication parsing)
- `tools/validators/src/structural/adjudication-discovery-fields.ts` (delete)
- `tools/validators/src/public/registry.ts` (modify — remove `adjudicationDiscoveryFields` entry)
- `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts` (modify — status-coupled rule)
- `tools/validators/README.md` (modify — schema/inventory wording)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/validators/tests/rules/rule7-mystery-reserve-preservation.test.ts` (modify)
- `tools/validators/tests/rules/rule2-no-pure-cosmetics.test.ts` (modify)
- `tools/validators/tests/rules/animalia-baseline.test.ts` (modify — new Rule 7 code and geography-domain baseline)
- `tools/validators/tests/structural/registry.test.ts` (modify — retired-validator registry assertion)
- `tools/validators/tests/cli/world-validate.test.ts` (modify — assert retired-validator absence)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — active validator count and interim PA-failure baseline)
- `tools/validators/tests/integration/README.md` (modify — active validator wording)
- `worlds/animalia/audits/validation-grandfathering.yaml` (modify — update GF-0008 exact matcher code/message only)

## Out of Scope

- Engine-side `append_adjudication_record` field rename and verdict enum (lands in `SPEC14PAVOC-002`).
- The MCP `get_canonical_vocabulary` tool (landed in `archive/tickets/SPEC14PAVOC-003.md`).
- Animalia content migration to satisfy the new schema (lands in `SPEC14PAVOC-004` through `-006`).
- Re-tagging animalia CFs that use `history`/`memory` to `memory_and_myth` (lands in `SPEC14PAVOC-005`).
- Updating the grandfathering YAML to remove now-obsolete entries (lands in the migration tickets that close the underlying findings).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes.
2. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js animalia --json > /tmp/worldloom-spec14-001.json` exits `1` until `SPEC14PAVOC-004`, and `jq '.summary.validators_run' /tmp/worldloom-spec14-001.json` does NOT contain `"adjudication_discovery_fields"`.
3. Unit test asserting a frontmatter-form synthetic PA passes `record_schema_compliance` and a body-only synthetic PA fails it with the 8 required-field errors.
4. Unit test asserting `forbidden`+`none` passes Rule 7; `active`+`medium` passes; `forbidden`+`low` fails with `rule7.future_resolution_safety_status_mismatch`.

### Invariants

1. `parseDiscoveryBlock` no longer exists anywhere in `tools/validators/src/` (removed alongside the retired validator).
2. Adjudication validation goes through `frontmatterFor` exclusively; the body of a PA file is unconstrained.
3. Mystery `future_resolution_safety` validity is a pure function of `status` × `future_resolution_safety` — no other field affects the check.
4. `CANONICAL_DOMAINS` is sourced from `@worldloom/world-index/public/canonical-vocabularies` (single source of truth).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — frontmatter-form PA fixture + legacy body-only fail fixture.
2. `tools/validators/tests/rules/rule7-mystery-reserve-preservation.test.ts` — replace flat-enum tests with status-coupled matrix.
3. `tools/validators/tests/rules/rule2-no-pure-cosmetics.test.ts` — `geography` and `technology` added to canonical-pass fixture.
4. `tools/validators/tests/cli/world-validate.test.ts` — assert `adjudication_discovery_fields` retirement.
5. `tools/validators/tests/integration/spec04-verification.test.ts` — assert 12 active validators and the interim 136 visible PA frontmatter failures.

### Commands

1. `cd tools/world-index && npm run build && npm test` — producer public vocabulary surface and package tests.
2. `cd tools/validators && npm test` — full unit + integration suite.
3. `cd /home/joeloverbeck/projects/worldloom && node tools/validators/dist/src/cli/world-validate.js animalia --json > /tmp/worldloom-spec14-001.json` — expected exit `1` with 136 visible PA frontmatter failures until `SPEC14PAVOC-004`.
4. `jq '.verdicts | map(select(.code == "rule7.future_resolution_safety_status_mismatch")) | length' /tmp/worldloom-spec14-001.json` (expected: 8 — the M-2/M-4/M-5/M-7/M-15/M-16/M-17/M-20 cases now report under the new code; will be normalized in `SPEC14PAVOC-005`).
5. `jq '.verdicts | map(select(.validator == "adjudication_discovery_fields")) | length' /tmp/worldloom-spec14-001.json` (expected: 0 — validator retired).

## Outcome

Completed: 2026-04-25.

Implemented the SPEC-14 validator slice: PA schema validation now uses YAML frontmatter, the legacy Discovery-block parser and validator are removed, Rule 7 status-couples mystery resolution safety through the shared vocabulary module, and `geography` / `technology` are canonical domains from `@worldloom/world-index/public/canonical-vocabularies`.

The package docs, registry tests, animalia baseline tests, and GF-0008 exact grandfathering matcher were updated to match the new validator surface. Animalia's legacy PA files now fail `record_schema_compliance.required` visibly until `SPEC14PAVOC-004` migrates them.

## Verification Result

Passed:

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm test`
3. `cd tools/validators && npm run clean`
4. `cd tools/validators && npm test`
5. `if rg "parseDiscoveryBlock" tools/validators/src; then exit 1; fi`
6. `node tools/validators/dist/src/cli/world-validate.js animalia --json > /tmp/worldloom-spec14-001.json` exited `1` as expected for the pre-migration PA baseline; summary was `fail_count: 136`, `info_count: 216`, and `validators_run` did not include `adjudication_discovery_fields`.
7. `jq '.verdicts | map(select(.code == "rule7.future_resolution_safety_status_mismatch")) | length' /tmp/worldloom-spec14-001.json` returned `8`.
8. `jq '.verdicts | map(select(.validator == "adjudication_discovery_fields")) | length' /tmp/worldloom-spec14-001.json` returned `0`.

Ignored/generated state classification: `tools/world-index/dist/` and `tools/validators/dist/` were regenerated by the package build/test commands and are expected ignored generated artifacts. `tools/validators/node_modules/@worldloom/world-index` is a symlink to `../../../world-index`; the consumer saw the rebuilt producer artifact.

## Deviations

1. The live validator registry is `tools/validators/src/public/registry.ts`, not `tools/validators/src/framework/aggregate.ts`.
2. `tools/validators/src/cli/_helpers.ts` was required same-seam fallout because it also parsed adjudication DB rows.
3. The full animalia CLI proof exits `1` until `SPEC14PAVOC-004` migrates PA files to frontmatter. This is the intended interim failure surface for this ticket, not a validator test failure.
