# SPEC64WORSYSCOM-001: `artifact_maturity` structural validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `artifact_maturity` in `tools/validators` (registry append); participates in the engine pre-apply gate and the `world-validate` CLI. No impact on existing validators (additive registry append).
**Deps**: None

## Problem

A world cannot currently be checked for *maturity confusion* — an artifact claiming an authority tier its path and ID prefix do not grant (e.g., a `character-proposals/NCP-9` file presenting itself, in prose framing / frontmatter / INDEX entry, as a realized `CHAR` dossier). SPEC-62 added the FOUNDATIONS §Artifact Authority and Maturity boundary that names each artifact's tier; SPEC-64 D1 makes that boundary executable. This ticket adds the structural validator that derives an artifact's tier from its path + ID prefix and flags collapse against the FOUNDATIONS authority map.

## Assumption Reassessment (2026-05-21)

1. The validator framework exposes `Validator` (`name`, `severity_mode`, `applies_to`, `run`) at `tools/validators/src/framework/types.ts`; structural validators register in the `structuralValidators` array at `tools/validators/src/public/registry.ts`; record access is via `queryStructuralRecords(ctx)` returning `IndexedRecord` (carrying `file_path`, `node_id`, `node_type`) per `tools/validators/src/structural/utils.ts`. `tools/validators/src/structural/approval-semantics.ts` is the shape model for a simple registered structural validator. `RunMode = "pre-apply" | "full-world" | "incremental"` (types.ts:16).
2. SPEC-64 §D1 specifies path/prefix derivation with **no** `maturity_level` frontmatter field; FOUNDATIONS §Artifact Authority and Maturity (the maturity-class enum: `NWP` / `PR`,`RP`,EPE-sidecars / `NCP` / `CHAR`,`DA` / `_source/` records / `PA` / `AU` / `EPE` / downstream story record) is the authoritative tier list; report §10.2 is satisfied by derivation.
3. Cross-artifact boundary under audit: the maturity-class authority map is the shared contract between FOUNDATIONS §Artifact Authority and Maturity (authored by SPEC-62) and this validator's derivation table; the indexed surface is the world-index node-type set (`proposal_card` / `character_proposal_card` / `audit_record` / `pressure_event_card` / `retcon_proposal_card` / `pressure_event_sidecar_proposal` / `world_proposal_card`, per `tools/world-index/src/parse/prose.ts`). The validator must not drift from either.
4. FOUNDATIONS §Artifact Authority and Maturity restated: canon layer and artifact maturity are separate; only accepted world-canon `_source/` records claim world-canon authority; a file's path + ID prefix determine its maturity class, and presenting a higher tier than the path/prefix grants is the collapse this validator detects.
5. Canon Safety surface: `artifact_maturity` is a structural validator under `tools/validators/src/structural/`; under `run_mode: "pre-apply"` it emits `fail` (gating canon/hybrid writes), under `full-world` it emits `warn`. Confirm `applies_to` scopes the validator to world-system artifacts so it does not over-block unrelated patch plans, and that it touches no `M-<integer>` record — it resolves no Mystery Reserve entry, leaving the Rule 7 firewall intact.

## Architecture Check

1. Deriving maturity from path + ID prefix (rather than a mandatory `maturity_level` frontmatter field) avoids a schema migration across every proposal/audit/pressure/world-proposal surface for zero consumer benefit; the world-index already supplies `file_path`, `node_id`, and `node_type`, so derivation is free at validation time.
2. No backwards-compatibility shim or alias path — fail-fast with a detailed incompatibility message and manual repair, per report §10.

## Verification Layers

1. Maturity collapse is detected → unit test (`artifact-maturity.test.ts`) asserting a `character-proposals/NCP-*` record framed as a realized dossier yields code `artifact_maturity.collapse` naming the path, prefix-implied tier, and correct routing skill.
2. Validator is wired into the framework → `tests/structural/registry.test.ts` name-list grep-proof includes `artifact_maturity`.
3. Block-vs-warn follows run_mode → unit test asserting `fail` severity under `pre-apply` and `warn` under `full-world`.
4. Mystery Reserve firewall untouched → manual review: the validator reads only proposal/audit/pressure/world-proposal surfaces and emits no verdict that narrows an `M-<integer>` record.

## What to Change

### 1. New validator module

Create `tools/validators/src/structural/artifact-maturity.ts` exporting `artifactMaturity: Validator` (`name: "artifact_maturity"`). For each indexed world-system artifact, derive the prefix-implied tier from its path + ID prefix against the FOUNDATIONS §Artifact Authority and Maturity map; when the artifact's presented tier (prose framing / frontmatter / INDEX entry) exceeds the path/prefix-granted tier, emit a verdict with `code: "artifact_maturity.collapse"` naming the path, the prefix-implied tier, and the correct routing skill. Severity is run_mode-conditional (`fail` under `pre-apply`, `warn` under `full-world`).

### 2. Register the validator

Add the import and the `artifactMaturity` entry to the `structuralValidators` array in `tools/validators/src/public/registry.ts`.

### 3. Extend the registry test

Add `artifact_maturity` to the structural-validator name-list assertion in `tools/validators/tests/structural/registry.test.ts`.

## Files to Touch

- `tools/validators/src/structural/artifact-maturity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/structural/artifact-maturity.test.ts` (new)

## Out of Scope

- A mandatory `maturity_level` frontmatter field on any schema — rejected in favor of path/prefix derivation (SPEC-64 §Out of Scope).
- The world-compatibility CLI mode (SPEC64WORSYSCOM-003) and index-consistency validator (SPEC64WORSYSCOM-002).
- Any change to the FOUNDATIONS authority map itself (owned by SPEC-62, landed).

## Acceptance Criteria

### Tests That Must Pass

1. `artifact_maturity.collapse` fires for a `character-proposals/NCP-*` record that presents as a realized dossier; the message names the path, prefix-implied tier, and routing skill.
2. A correctly-tiered artifact (e.g., an `NCP-*` card framed as a candidate proposal) produces no verdict.
3. Severity is `fail` under `run_mode: "pre-apply"` and `warn` under `full-world`.
4. `npm test --prefix tools/validators` passes, including the registry name-list assertion that now includes `artifact_maturity`.

### Invariants

1. Maturity is derived solely from path + ID prefix; no schema gains a `maturity_level` field.
2. The validator resolves no Mystery Reserve entry and changes no canon-validator threshold.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/artifact-maturity.test.ts` (new) — collapse-detection, clean-pass, and run_mode-severity cases.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — assert `artifact_maturity` is registered.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (covers `tsc`; the package defines no separate `typecheck` script)
