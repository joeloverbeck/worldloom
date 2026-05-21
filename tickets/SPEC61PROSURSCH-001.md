# SPEC61PROSURSCH-001: JSON schemas for the eight proposal/audit/pressure surfaces

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds eight JSON Schema files under `tools/validators/src/schemas/`; no impact on existing schema files (all new).
**Deps**: None

## Problem

Every mature world-system surface (CF/CH/INV/M/OQ/ENT/SEC, CHAR/DA/PA, NCP/NCB, all story-bundle classes) is JSON-schema-backed, but the least-mature proposal/audit/pressure surfaces have **zero** schema coverage (verified: none appear in `tools/validators/src/schemas/`). This is exactly where maturity/approval confusion is most likely yet least mechanically caught. This ticket adds the declarative schema contract for the eight uncovered surfaces; wiring them into structural validation is SPEC61PROSURSCH-003.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase: `tools/validators/src/schemas/` ships 38 schemas; `character-proposal-card.schema.json` and `character-proposal-batch.schema.json` are the proven direct-write-proposal precedent (both use root `additionalProperties: false` + a required `source_basis` object). The eight new schemas model on this pair.
2. Verified against the spec: SPEC-61 §2.1 lists the eight schema basenames and mandates that each schema's required-field set is **derived from the current template frontmatter of the producing skill** — `.claude/skills/propose-new-canon-facts/templates/proposal-card.md` + `batch-manifest.md`, `.claude/skills/emergent-pressure-events/templates/pressure-event-card.md` + `sidecar-proposal-card.md` + `batch-manifest.md`, `.claude/skills/continuity-audit/templates/audit-report.md` + `retcon-proposal-card.md`, `.claude/skills/propose-new-worlds-from-preferences/templates/proposal-card.md` + `batch-manifest.md`. Read each template; do not invent fields.
3. Cross-artifact boundary under audit: each schema is a contract over a sibling skill's emitted frontmatter. The schema's required-field set must match what the producing skill actually writes today — a field the schema requires that the skill doesn't emit fails every real card. Derive from the template, then spot-check one emitted example per surface where one exists.
4. FOUNDATIONS §Canon Fact Record Schema (lines 355–361) reserves `source_basis.direct_user_approval` for accepted CF records. Per SPEC-61 §2.1, each new schema declares `source_basis` as an object and carries the optional defense-in-depth prohibition `"not": {"required": ["direct_user_approval"]}` on `source_basis` (the primary enforcement is the SPEC61PROSURSCH-004 validator, per the spec's Q1=(a) resolution). The schemas must not require `direct_user_approval`.

## Architecture Check

1. Modeling on the `character-proposal-card` precedent keeps the new schemas consistent with the established direct-write-proposal validation pattern, so the SPEC61PROSURSCH-003 wiring reuses the existing `record-schema-compliance` path with no new validation machinery.
2. No backwards-compatibility shims — all eight files are new; no existing schema is aliased or duplicated.

## Verification Layers

1. Each schema is valid JSON Schema (compiles under the validator's ajv setup) -> schema validation (`npm --prefix tools/validators run build` + a compile smoke test).
2. Each schema's required-field set matches the producing skill's template frontmatter -> codebase grep-proof (diff schema `required` against template keys per surface).
3. `source_basis` schemas do not require `direct_user_approval` and carry the optional `not`-prohibition -> codebase grep-proof.
4. Single concern (declarative schema files); behavioral validation lands in SPEC61PROSURSCH-003 — so no skill-dry-run layer applies here.

## What to Change

### 1. Author eight JSON Schema files

Under `tools/validators/src/schemas/`, each modeled on `character-proposal-card.schema.json` / `character-proposal-batch.schema.json`:

- `proposal-card.schema.json` (PR — `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`)
- `proposal-batch.schema.json` (PR **and** EPE batch manifests — shared shape; see §6 decision below)
- `pressure-event-card.schema.json` (EPE base card)
- `pressure-event-sidecar-proposal.schema.json` (EPE `*.proposal.md`)
- `audit-report.schema.json` (AU)
- `retcon-proposal-card.schema.json` (RP)
- `world-proposal-card.schema.json` (NWP)
- `world-proposal-batch.schema.json` (NWB)

Each schema: pins `world_slug` / `id` / `generated_date` consistent with sibling proposal schemas; declares `source_basis` as an object with the optional `"not": {"required": ["direct_user_approval"]}` prohibition; uses canonical-vocabulary `$ref`s where a field is a canonical enum (EPE `origin_type`, PR `proposal_family`, `domains_affected`, sourced from `tools/world-index/src/public/canonical-vocabularies.ts`); leaves skill-local heuristic lists as free-string.

### 2. Resolve the pressure-event-batch shared-vs-split decision (SPEC-61 §6)

Read `propose-new-canon-facts/templates/batch-manifest.md` and `emergent-pressure-events/templates/batch-manifest.md`. If their frontmatter aligns, `proposal-batch.schema.json` covers both (eight schemas). If they diverge, split out `pressure-event-batch.schema.json` (a ninth schema) and flag that SPEC61PROSURSCH-002/003 must add a ninth `pressure_event_batch` node type + RECORD_TYPE_TO_SCHEMA row. Record the decision in this ticket's implementation commit message.

## Files to Touch

- `tools/validators/src/schemas/proposal-card.schema.json` (new)
- `tools/validators/src/schemas/proposal-batch.schema.json` (new)
- `tools/validators/src/schemas/pressure-event-card.schema.json` (new)
- `tools/validators/src/schemas/pressure-event-sidecar-proposal.schema.json` (new)
- `tools/validators/src/schemas/audit-report.schema.json` (new)
- `tools/validators/src/schemas/retcon-proposal-card.schema.json` (new)
- `tools/validators/src/schemas/world-proposal-card.schema.json` (new)
- `tools/validators/src/schemas/world-proposal-batch.schema.json` (new)

## Out of Scope

- Wiring schemas into `RECORD_TYPE_TO_SCHEMA` / scan dirs (SPEC61PROSURSCH-003).
- The `approval-semantics` validator (SPEC61PROSURSCH-004) — schemas carry only the optional `not`-prohibition, not the primary enforcement.
- World-index node-type/enumeration changes (SPEC61PROSURSCH-002).
- Editing producing-skill templates or any `_source/` record.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds (TypeScript + schema files load).
2. Each new schema compiles under ajv (compile smoke test added in SPEC61PROSURSCH-003 fixtures; here, a one-off `node -e` ajv compile of each file passes).
3. For each surface, the schema's `required` array is a subset of (or exactly) the producing template's emitted frontmatter keys (manual diff per surface).

### Invariants

1. No new schema requires `source_basis.direct_user_approval`; each carries the optional `not`-prohibition on `source_basis`.
2. Every canonical-enum field uses a `$ref` to `canonical-vocabularies`-sourced values rather than an inline literal list.

## Test Plan

### New/Modified Tests

1. `None — schema files are exercised by the fixtures added in SPEC61PROSURSCH-003; this ticket's verification is a per-file ajv compile smoke test (command below).`

### Commands

1. `npm --prefix tools/validators run build`
2. `for f in proposal-card proposal-batch pressure-event-card pressure-event-sidecar-proposal audit-report retcon-proposal-card world-proposal-card world-proposal-batch; do node -e "require('ajv'); JSON.parse(require('fs').readFileSync('tools/validators/src/schemas/'+process.argv[1]+'.schema.json'))" "$f" && echo "OK $f"; done`
3. Narrower compile-only boundary is correct here because schema *behavior* (FAIL on malformed cards) is validated in SPEC61PROSURSCH-003 once the schemas are wired into `record-schema-compliance`.
