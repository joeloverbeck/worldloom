# SPEC68DIEARTCLA-001: Type `claim_map.items` and add cross-field anti-laundering `if/then`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (tightened, consumed by `record_schema_compliance`); new test file under `tools/validators/tests/structural/`. No change to `record-schema-compliance.ts` itself.
**Deps**: None

## Problem

The diegetic-artifact (DA) frontmatter schema defines `claim_map` as an untyped `{ "type": "array" }` (`diegetic-artifact-frontmatter.schema.json:62`) — no `items` schema. The DA skill's Phase 3/7/8 discipline (per-claim `canon_status`, `narrator_belief`, `source`, and the `canonically_true ⇒ cf_id` / `mystery_adjacent ⇒ mr_id` requirements) lives only in skill prose and the body-trace audit, not in the schema `record_schema_compliance` actually runs. This leaves the clearest canon-laundering seam unmechanized: a DA claim can assert `canon_status: canonically_true` without naming the CF it rests on, and nothing at the schema layer rejects it. This ticket types `claim_map.items` against the authoritative template vocabulary and adds `if/then` rules so the laundering shapes the skill forbids in prose are rejected by ajv at validation time.

## Assumption Reassessment (2026-05-22)

1. The host schema is `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (root `additionalProperties: false`; `claim_map` currently `{ "type": "array" }` at line 62). It is compiled by `record_schema_compliance` through an `Ajv2020` instance (`tools/validators/src/structural/record-schema-compliance.ts:29` — `new Ajv2020({ allErrors: true, strict: true, formats: { date: true } })`) and applied to DA records via `RECORD_TYPE_TO_SCHEMA` (`tools/validators/src/structural/utils.ts:108` — `diegetic_artifact_record: "diegetic-artifact-frontmatter"`). Draft-2020-12 `if/then` is therefore enforced; conditional validation is already exercised in-tree (`character-proposal-card.schema.json`, `pressure-event-sidecar-proposal.schema.json`, `section.schema.json`), so no new validator is needed. `strict: true` requires the added blocks be strict-clean (no unknown keywords) or `ajv.compile` throws at load.
2. The authoritative `claim_map` vocabulary is `.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md` (lines 80-90; the SKILL.md names this template "the authoritative schema"): `claim`; `canon_status` ∈ {canonically_true, canonically_false, partially_true, contested, mystery_adjacent, prohibited_for_this_artifact}; `narrator_belief` ∈ {true, false, uncertain, performed_belief}; `source` ∈ {witnessed, learned_from_authority, inherited_tradition, common_rumor, contested_scholarship, impossible_for_narrator_to_verify}; `contradiction_risk` ∈ {none, soft, hard}; `mode` ∈ {direct, implied, symbolic}; `adaptive_behavior_preserved_under_wrong_ontology` (bool); `cf_id` (`^CF-[0-9]+$`|null, required when `canonically_true`); `mr_id` (`^M-[0-9]+$`|null, required when `mystery_adjacent`); `repair_trace`. SPEC-68 §2.1/§2.2 specify exactly these; the report's invented `DAC-*` / `claim_kind` / `canonization_allowed` vocabulary is explicitly out of scope (would break the skill).
3. Cross-artifact boundary under audit: the DA frontmatter schema is the contract between the producer (`diegetic-artifact-generation`, which writes `claim_map` per its template) and the consumers (`record_schema_compliance` at pre-apply; `canon-facts-from-diegetic-artifacts` which *reads* `claim_map` to mine candidates — `references/phase-1-claim-extraction.md`). Typing formalizes the shape the template already produces; the mining consumer reads claim entries and is unaffected (no field renamed or removed).
4. FOUNDATIONS principles motivating this ticket: **Rule 1 (No Floating Facts)** — `canon_status: canonically_true ⇒ cf_id required` forces every canon-true claim to name the accepted CF it rests on, grounding the claim. **Rule 7 (Preserve Mystery Deliberately)** — `canon_status: mystery_adjacent ⇒ mr_id required` makes a mystery-touching claim name the M record, reinforcing (never resolving) the Mystery Reserve firewall the DA skill's Phase 7b enforces. Both rules are strengthened, not weakened. (DA is a non-canon realized hybrid per FOUNDATIONS §Artifact Authority + the §3.9/§4.4 non-canon-surface carve-out, so this is not a canon-pipeline-semantics change.)
5. Existing output schema extended: the DA frontmatter schema is the realized-hybrid DA output schema. The change tightens `claim_map` (array → typed-items + `if/then`); it is **non-additive** (existing DA files must conform). Consumer is `record_schema_compliance`; on-disk DA conformance is verified in SPEC68DIEARTCLA-002's regression. No consumer code change.

## Architecture Check

1. Encoding the per-claim contract + cross-field rules in the schema (rather than a bespoke `da_claim_authority` validator) reuses the existing `record_schema_compliance` ajv path — the discipline becomes machine-enforced with zero new validator surface, lower maintenance, and consistency with how every other record class is validated. The `if/then` form is already proven in-tree.
2. No backwards-compatibility aliasing/shims: the loose `{ "type": "array" }` is replaced outright with the typed item schema; no legacy-permissive fallback is retained.

## Verification Layers

1. `claim_map.items` rejects an unknown `canon_status` / `narrator_belief` / `source` enum → schema validation (ajv unit fixture).
2. `canon_status: canonically_true` with absent/null `cf_id` → rejected → schema validation (ajv `if/then` fixture).
3. `canon_status: mystery_adjacent` with absent/null `mr_id` → rejected → schema validation (ajv `if/then` fixture).
4. A template-conformant `claim_map` entry passes → schema validation (positive fixture).
5. Schema compiles under `Ajv2020({ strict: true })` → `npm run build --prefix tools/validators` (tsc + schema load at test bootstrap).

## What to Change

### 1. Type `claim_map.items` (§2.1)

Replace `"claim_map": { "type": "array" }` with `minItems: 1` and a typed `items` object (`additionalProperties: false`); required: `claim`, `canon_status`, `narrator_belief`, `source`, `contradiction_risk`, `mode`; enums per Assumption Reassessment item 2; `cf_id` / `mr_id` as `^CF-[0-9]+$` / `^M-[0-9]+$` or null; `adaptive_behavior_preserved_under_wrong_ontology` boolean (optional); `repair_trace` object|null (kept permissive — free-form Phase-7f record). Re-read `templates/diegetic-artifact.md` at implementation time and reconcile any enum drift — the template is authoritative.

### 2. Add cross-field `if/then` (§2.2)

On `claim_map.items`: `if canon_status == canonically_true then cf_id required (non-null, ^CF-[0-9]+$)`; `if canon_status == mystery_adjacent then mr_id required (non-null, ^M-[0-9]+$)`. CF/MR id *resolvability* (the id points to an existing record) stays a skill-Phase-7 judgment concern — the schema enforces presence + format only.

### 3. Fixtures

New `record-schema-compliance-diegetic-artifact.test.ts`: positive (template-conformant `claim_map` passes) + negative (unknown enum; `canonically_true` w/o `cf_id`; `mystery_adjacent` w/o `mr_id`) cases, each asserting the precise ajv error path.

## Files to Touch

- `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-diegetic-artifact.test.ts` (new)

## Out of Scope

- The four loose objects (`author_profile` / `epistemic_horizon` / `world_consistency` / `source_basis`) — SPEC68DIEARTCLA-002.
- The full-schema conformance regression over on-disk DA files — SPEC68DIEARTCLA-002.
- The report's invented `DAC-*` / `claim_kind` / `truth_relation_to_canon` / `canonization_allowed` vocabulary — explicitly rejected (misaligned with the artifact).
- Any new validator (`da_claim_authority` / `da_mystery_claim_firewall`) — unnecessary; ajv via `record_schema_compliance` suffices.
- Hand-repairing non-conformant world DA data (`worlds/<slug>/` files).

## Acceptance Criteria

### Tests That Must Pass

1. New fixtures: unknown `canon_status` enum rejected; `canonically_true` w/o `cf_id` rejected; `mystery_adjacent` w/o `mr_id` rejected; template-conformant entry passes — each with the expected ajv `instancePath`.
2. `npm run build --prefix tools/validators` — tsc passes and the schema compiles clean under `strict: true`.
3. `npm test --prefix tools/validators` green.

### Invariants

1. `record_schema_compliance` applies `diegetic-artifact-frontmatter` to `diegetic_artifact_record` (mapping unchanged).
2. No `claim_map` entry can assert `canonically_true` without a `^CF-[0-9]+$` `cf_id`, nor `mystery_adjacent` without a `^M-[0-9]+$` `mr_id`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-diegetic-artifact.test.ts` (new) — `claim_map` typing + `if/then` positive/negative fixtures, following the existing `record-schema-compliance-story-*.test.ts` per-class pattern.

### Commands

1. `npm run build --prefix tools/validators` — tsc typecheck + schema-load (no `typecheck` script in `tools/validators/package.json`; `build` invokes `tsc` and covers it).
2. `npm test --prefix tools/validators` — runs `build` then `node --test dist/tests/**/*.test.js`.
