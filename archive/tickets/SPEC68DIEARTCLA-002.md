# SPEC68DIEARTCLA-002: Type the four loose DA frontmatter objects + conformance regression

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (further tightened); extends the DA test file created by SPEC68DIEARTCLA-001 and truths same-package DA positive fixtures. No change to `record-schema-compliance.ts`.
**Deps**: archive/tickets/SPEC68DIEARTCLA-001.md

## Problem

Beyond `claim_map`, the DA frontmatter schema leaves four high-value blocks as untyped `{ "type": "object" }`: `author_profile` (line 60), `epistemic_horizon` (61), `world_consistency` (65), `source_basis` (66). The DA template comments already *assert* that `record_schema_compliance` enforces the `world_consistency` id-format regex ("rejects mixed-format entries", template line 96) — but the loose object means it does not; the discipline is documented as mechanical yet is prose-only. This ticket types the four objects against the template shape (mechanizing the asserted enforcement) and runs a conformance regression over existing on-disk DA files to surface — not silently break — any non-conformance.

## Assumption Reassessment (2026-05-22)

1. At intake, loose definitions in `diegetic-artifact-frontmatter.schema.json` were: `author_profile`, `epistemic_horizon`, `world_consistency`, and `source_basis` — all `{ "type": "object" }`; `genre_conventions` was the adjacent bare object and was tightened with the same template-shaped pass. `world_relation` was already strictly typed (CF-pattern arrays, `additionalProperties: false`) and stayed unchanged. Template field shapes (`.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md`): `genre_conventions` has `honors[]` / `breaks[]`; `author_profile` has 15 fields (two nullable: `sex_or_gender`, `trauma_history_if_relevant`); `epistemic_horizon` has 6 string-arrays; `world_consistency` has `canon_facts_consulted[]` `^CF-[0-9]+$`, `invariants_respected[]` `^(ONT|CAU|DIS|SOC|AES)-[0-9]+$`, `mystery_reserve_firewall[]` `^M-[0-9]+$`, `distribution_exceptions[]`; `source_basis` has `world_slug` / `brief_path` strings, `character_path` string|null, `generated_date` string, `user_approved` boolean.
2. SPEC-68 §2.3 specifies these four; §3 mandates a conformance check over on-disk DA files (report non-conformance, not auto-migrate); §6 names the regression. `user_approved` keeps its boolean shape — the report's approval-field rename was rejected at SPEC-61 triage and is out of scope.
3. Cross-artifact boundary under audit: the conformance surface includes DA markdown records discoverable in the active checkout. Current inventory is three checked-in DA records: `tools/validators/tests/fixtures/diegetic-artifact-with-new-fields.md`, `tests/fixtures/animalia/diegetic-artifacts/a-season-on-the-circuit.md`, and `tests/fixtures/animalia/diegetic-artifacts/after-action-report-harrowgate-contract.md`. No active `worlds/<slug>/diegetic-artifacts/*.md` files are present in this worktree. SPEC68DIEARTCLA-001 normalized the checked-in fixture DA `claim_map` entries while leaving loose-object typing to this ticket. Each discovered DA must validate against the fully-tightened schema (archive/tickets/SPEC68DIEARTCLA-001.md + this ticket) or be flagged for hand-repair. Private/live world-data repair remains out of scope; the deliverable is the conformance *report* over visible records.
4. FOUNDATIONS principle motivating this ticket: **Rule 6 (No Silent Retcons)** — typing `world_consistency.canon_facts_consulted[]` (and the invariant / MR-firewall arrays) with the id-format regex preserves the proof-of-check audit trail the DA skill records at Phase 7, mechanizing what the template comment already promises rather than leaving it prose-only.
5. Existing output schema extended: the same DA frontmatter schema as 001; this ticket types four more blocks. Non-additive (existing DA files must conform); consumer is `record_schema_compliance`; the regression in this ticket is the conformance gate. No consumer code change.

## Architecture Check

1. Typing the four blocks to the template shape makes the schema the single source of truth for DA frontmatter and turns the template's aspirational "record_schema_compliance rejects mixed-format entries" comment into a true statement. Running the regression as acceptance (rather than auto-migrating) honors the SPEC-64 strict-compatibility posture: report incompatibility with exact path/field, let the human repair.
2. No backwards-compatibility shims: loose objects are replaced with typed ones outright; no permissive fallback retained.

## Verification Layers

1. `world_consistency.canon_facts_consulted` rejects a non-`^CF-[0-9]+$` entry → schema validation (ajv fixture).
2. `author_profile` rejects an unknown field (`additionalProperties: false`) and accepts the two nullable fields as null → schema validation (fixtures).
3. `source_basis` requires its five fields with correct types → schema validation (fixture).
4. The three visible on-disk DA records validate, OR non-conformance is reported with exact path/field → `record_schema_compliance` run over the real DA records available in this checkout.

## What to Change

### 1. Type the loose objects (§2.3)

`author_profile` (15 named fields, `additionalProperties: false`, the two nullable fields as `string|null`); `epistemic_horizon` (6 named string-arrays); `world_consistency` (the four arrays with the id-format regexes above + `distribution_exceptions` free-string array); `source_basis` (`world_slug` / `brief_path` strings, `character_path` string|null, `generated_date` string, `user_approved` boolean). `genre_conventions` is also tightened to `{ honors: [], breaks: [] }`. The template was re-read at implementation time and the field set reconciled.

### 2. Conformance regression (§3 + §6)

Add a regression in the DA test file that loads each visible on-disk DA markdown record and asserts schema-conformance; on failure, surface the exact `instancePath`. Document any non-conformant private/live world file as a compatibility finding for hand-repair — do NOT edit private/live world data here.

### 3. Fixtures

Extended `record-schema-compliance-diegetic-artifact.test.ts` (created by SPEC68DIEARTCLA-001) with the loose-object positive/negative fixtures and the visible DA markdown conformance regression. Updated same-package DA positive fixtures that still carried old loose-object or template-drift shapes.

## Files to Touch

- `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-diegetic-artifact.test.ts` (modify — created by SPEC68DIEARTCLA-001)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — same-seam inline DA positive fixtures)
- `tools/validators/tests/fixtures/diegetic-artifact-with-new-fields.md` (modify — current positive DA fixture)
- `tests/fixtures/animalia/diegetic-artifacts/a-season-on-the-circuit.md` (modify — current positive DA fixture)

## Out of Scope

- `claim_map` typing + `if/then` (archive/tickets/SPEC68DIEARTCLA-001.md).
- Hand-repairing non-conformant private/live world DA data under `worlds/<slug>/diegetic-artifacts/` — flagged as a compatibility report; repaired by hand outside this pipeline. Checked-in fixture DAs used by the validators suite are current positive records and may be truthed to the tightened schema.
- The `user_approved` → semantic-rename taxonomy (rejected at SPEC-61 triage).
- Any new validator.

## Acceptance Criteria

### Tests That Passed

1. Four-object fixtures: malformed `world_consistency` id rejected; unknown `author_profile` field rejected; `source_basis` missing a required field rejected; nullable fields accept null; conformant blocks pass.
2. Conformance regression over the visible on-disk DA markdown records passes, OR reports each non-conformant private/live world file with exact path/field (no green-by-relaxation).
3. `npm run build` and `npm test` from `tools/validators` green.

### Invariants

1. `world_relation` (already typed) is unchanged.
2. Every typed object uses `additionalProperties: false`; no DA frontmatter block remains a bare `{ "type": "object" }` after this ticket.
3. The schema change reports — never silently normalizes — non-conformant existing DA data.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-diegetic-artifact.test.ts` (modify) — adds the four-object fixtures + the on-disk DA conformance regression.

### Commands

1. `npm run build` from `tools/validators` — tsc typecheck + schema compiles under `strict: true`.
2. `node --test dist/tests/structural/record-schema-compliance-diegetic-artifact.test.js` from `tools/validators` — focused DA schema fixtures + conformance regression.
3. `node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/structural/record-schema-compliance-diegetic-artifact.test.js` from `tools/validators` — same-seam structural fixture proof.
4. `npm test` from `tools/validators` — full validators package suite.

## Outcome

Completed: 2026-05-22.

The DA frontmatter schema now types `genre_conventions`, `author_profile`, `epistemic_horizon`, `world_consistency`, and `source_basis` with template-shaped object schemas and `additionalProperties: false`. `world_consistency` now mechanically enforces the promised CF, invariant, and MR id regexes. `source_basis` requires the five template fields with `user_approved` as a boolean.

The DA schema test now covers template-conformant loose-object blocks, malformed `world_consistency`, unknown `author_profile` fields, missing `source_basis` fields, and a regression over the three visible checked-in DA markdown records in this worktree. Same-seam positive fixtures were truthed where the tighter schema exposed old loose-object or template-drift shapes. No private/live world data under `worlds/<slug>/` was edited.

## Verification Result

- `npm run build` from `tools/validators` — initially failed because the new test used unavailable `test.step`; fixed the test loop, then PASS.
- `node --test dist/tests/structural/record-schema-compliance-diegetic-artifact.test.js` from `tools/validators` — PASS, 7/7 subtests.
- `npm test` from `tools/validators` — initially failed after the schema tightening because `record-schema-compliance.test.ts` still had inline DA positive fixtures with `{}` loose objects; updated those same-seam fixtures.
- `node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/structural/record-schema-compliance-diegetic-artifact.test.js` from `tools/validators` — PASS, 41/41 subtests.
- `npm test` from `tools/validators` — PASS, 861/861 tests.

## Deviations

- The ticket's intake estimate of four on-disk DA files was corrected to the current checkout inventory: three visible checked-in DA markdown records and no active `worlds/<slug>/diegetic-artifacts/*.md` files. The regression uses that visible inventory.
- The optional `genre_conventions` tightening was included because it was the remaining adjacent bare DA frontmatter object and matches the live template's `honors[]` / `breaks[]` shape.
- Same-seam positive fixture truthing expanded the touched file set to `record-schema-compliance.test.ts` and `tools/validators/tests/fixtures/diegetic-artifact-with-new-fields.md`. The animalia fixture `a-season-on-the-circuit.md` was also truthed from old template keys (`sex_gender`, `ideology`, `honored`, `calibrated_deviations`) to the current template keys. `after-action-report-harrowgate-contract.md` already conformed and was not changed.
