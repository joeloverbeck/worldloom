# SPEC68DIEARTCLA-002: Type the four loose DA frontmatter objects + conformance regression

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (further tightened); extends the DA test file created by SPEC68DIEARTCLA-001. No change to `record-schema-compliance.ts`.
**Deps**: SPEC68DIEARTCLA-001

## Problem

Beyond `claim_map`, the DA frontmatter schema leaves four high-value blocks as untyped `{ "type": "object" }`: `author_profile` (line 60), `epistemic_horizon` (61), `world_consistency` (65), `source_basis` (66). The DA template comments already *assert* that `record_schema_compliance` enforces the `world_consistency` id-format regex ("rejects mixed-format entries", template line 96) — but the loose object means it does not; the discipline is documented as mechanical yet is prose-only. This ticket types the four objects against the template shape (mechanizing the asserted enforcement) and runs a conformance regression over existing on-disk DA files to surface — not silently break — any non-conformance.

## Assumption Reassessment (2026-05-22)

1. Current loose definitions in `diegetic-artifact-frontmatter.schema.json`: `author_profile` (line 60), `epistemic_horizon` (61), `world_consistency` (65), `source_basis` (66) — all `{ "type": "object" }`. `world_relation` (lines 40-49) is ALREADY strictly typed (CF-pattern arrays, `additionalProperties: false`) — not in scope. Template field shapes (`.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` lines 55-106): `author_profile` 15 fields (two nullable: `sex_or_gender`, `trauma_history_if_relevant`); `epistemic_horizon` 6 string-arrays; `world_consistency` `canon_facts_consulted[]` `^CF-[0-9]+$`, `invariants_respected[]` `^(ONT|CAU|DIS|SOC|AES)-[0-9]+$`, `mystery_reserve_firewall[]` `^M-[0-9]+$`, `distribution_exceptions[]` (free-string); `source_basis` `world_slug` / `brief_path` (strings), `character_path` (string|null), `generated_date` (string), `user_approved` (bool).
2. SPEC-68 §2.3 specifies these four; §3 mandates a conformance check over on-disk DA files (report non-conformance, not auto-migrate); §6 names the regression. `user_approved` keeps its boolean shape — the report's approval-field rename was rejected at SPEC-61 triage and is out of scope.
3. Cross-artifact boundary under audit: the conformance surface is the 4 on-disk DA files — `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md` and `worlds/animalia/diegetic-artifacts/{after-action-report-harrowgate-contract,a-season-on-the-circuit,namahan-at-the-third-gate}.md`. Each must validate against the fully-tightened schema (001 + this ticket) or be flagged for hand-repair. World-data repair is NOT in this ticket's scope (it would edit `worlds/<slug>/`); the deliverable is the conformance *report*.
4. FOUNDATIONS principle motivating this ticket: **Rule 6 (No Silent Retcons)** — typing `world_consistency.canon_facts_consulted[]` (and the invariant / MR-firewall arrays) with the id-format regex preserves the proof-of-check audit trail the DA skill records at Phase 7, mechanizing what the template comment already promises rather than leaving it prose-only.
5. Existing output schema extended: the same DA frontmatter schema as 001; this ticket types four more blocks. Non-additive (existing DA files must conform); consumer is `record_schema_compliance`; the regression in this ticket is the conformance gate. No consumer code change.

## Architecture Check

1. Typing the four blocks to the template shape makes the schema the single source of truth for DA frontmatter and turns the template's aspirational "record_schema_compliance rejects mixed-format entries" comment into a true statement. Running the regression as acceptance (rather than auto-migrating) honors the SPEC-64 strict-compatibility posture: report incompatibility with exact path/field, let the human repair.
2. No backwards-compatibility shims: loose objects are replaced with typed ones outright; no permissive fallback retained.

## Verification Layers

1. `world_consistency.canon_facts_consulted` rejects a non-`^CF-[0-9]+$` entry → schema validation (ajv fixture).
2. `author_profile` rejects an unknown field (`additionalProperties: false`) and accepts the two nullable fields as null → schema validation (fixtures).
3. `source_basis` requires its five fields with correct types → schema validation (fixture).
4. The 4 on-disk DA files validate, OR non-conformance is reported with exact path/field → `record_schema_compliance` run over the real DA records.

## What to Change

### 1. Type the four loose objects (§2.3)

`author_profile` (15 named fields, `additionalProperties: false`, the two nullable fields as `string|null`); `epistemic_horizon` (6 named string-arrays); `world_consistency` (the four arrays with the id-format regexes above + `distribution_exceptions` free-string array); `source_basis` (`world_slug` / `brief_path` strings, `character_path` string|null, `generated_date` string, `user_approved` boolean). Optionally tighten `genre_conventions` to `{ honors: [], breaks: [] }`. Re-read the template at implementation time to reconcile field drift.

### 2. Conformance regression (§3 + §6)

Add a regression in the DA test file that loads each on-disk DA record and asserts schema-conformance; on failure, surface the exact `instancePath`. Document any non-conformant file as a compatibility finding for hand-repair — do NOT edit world data here.

### 3. Fixtures

Extend `record-schema-compliance-diegetic-artifact.test.ts` (created by SPEC68DIEARTCLA-001) with the four-object positive/negative fixtures.

## Files to Touch

- `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-diegetic-artifact.test.ts` (modify — created by SPEC68DIEARTCLA-001)

## Out of Scope

- `claim_map` typing + `if/then` (SPEC68DIEARTCLA-001).
- Hand-repairing non-conformant world DA data under `worlds/<slug>/diegetic-artifacts/` — flagged as a compatibility report; repaired by hand outside this pipeline.
- The `user_approved` → semantic-rename taxonomy (rejected at SPEC-61 triage).
- Any new validator.

## Acceptance Criteria

### Tests That Must Pass

1. Four-object fixtures: malformed `world_consistency` id rejected; unknown `author_profile` field rejected; `source_basis` missing a required field rejected; nullable fields accept null; conformant blocks pass.
2. Conformance regression over the 4 on-disk DA files passes, OR reports each non-conformant file with exact path/field (no green-by-relaxation).
3. `npm run build --prefix tools/validators` + `npm test --prefix tools/validators` green.

### Invariants

1. `world_relation` (already typed) is unchanged.
2. Every typed object uses `additionalProperties: false`; no DA frontmatter block remains a bare `{ "type": "object" }` after this ticket.
3. The schema change reports — never silently normalizes — non-conformant existing DA data.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-diegetic-artifact.test.ts` (modify) — adds the four-object fixtures + the on-disk DA conformance regression.

### Commands

1. `npm run build --prefix tools/validators` — tsc typecheck + schema compiles under `strict: true`.
2. `npm test --prefix tools/validators` — runs the DA schema fixtures + conformance regression.
