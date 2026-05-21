# SPEC64WORSYSCOM-001: `artifact_maturity` structural validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator `artifact_maturity` in `tools/validators` (registry append); participates in the engine pre-apply gate and the `world-validate` CLI. Same-seam validator inventory/count witnesses and the `world-mcp` registry parity consumer move with the registry append.
**Deps**: None

## Problem

A world cannot currently be checked for *maturity confusion* — an artifact claiming an authority tier its path and ID prefix do not grant (e.g., a `character-proposals/NCP-9` file presenting itself, in prose framing / frontmatter / INDEX entry, as a realized `CHAR` dossier). SPEC-62 added the FOUNDATIONS §Artifact Authority and Maturity boundary that names each artifact's tier; SPEC-64 D1 makes that boundary executable. This ticket adds the structural validator that derives an artifact's tier from its path + ID prefix and flags collapse against the FOUNDATIONS authority map.

## Assumption Reassessment (2026-05-21)

1. The validator framework exposes `Validator` (`name`, `severity_mode`, `applies_to`, `run`) at `tools/validators/src/framework/types.ts`; structural validators register in the `structuralValidators` array at `tools/validators/src/public/registry.ts`; record access is via `queryStructuralRecords(ctx)` returning `IndexedRecord` (carrying `file_path`, `node_id`, `node_type`) per `tools/validators/src/structural/utils.ts`. `tools/validators/src/structural/approval-semantics.ts` is the shape model for a simple registered structural validator. `RunMode = "pre-apply" | "full-world" | "incremental"` (types.ts:16).
2. SPEC-64 §D1 specifies path/prefix derivation with **no** `maturity_level` frontmatter field; FOUNDATIONS §Artifact Authority and Maturity (the maturity-class enum: `NWP` / `PR`,`RP`,EPE-sidecars / `NCP` / `CHAR`,`DA` / `_source/` records / `PA` / `AU` / `EPE` / downstream story record) is the authoritative tier list; report §10.2 is satisfied by derivation.
3. Cross-artifact boundary under audit: the maturity-class authority map is the shared contract between FOUNDATIONS §Artifact Authority and Maturity (authored by SPEC-62) and this validator's derivation table; the indexed surface is the world-index node-type set (`proposal_card` / `character_proposal_card` / `audit_record` / `pressure_event_card` / `retcon_proposal_card` / `pressure_event_sidecar_proposal` / `world_proposal_card`, per `tools/world-index/src/parse/prose.ts`). The validator must not drift from either.
4. FOUNDATIONS §Artifact Authority and Maturity restated: canon layer and artifact maturity are separate; only accepted world-canon `_source/` records claim world-canon authority; a file's path + ID prefix determine its maturity class, and presenting a higher tier than the path/prefix grants is the collapse this validator detects.
5. Canon Safety surface: `artifact_maturity` is a structural validator under `tools/validators/src/structural/`; under `run_mode: "pre-apply"` it emits `fail` (gating canon/hybrid writes), under `full-world` it emits `warn`. Confirm `applies_to` scopes the validator to world-system artifacts so it does not over-block unrelated patch plans, and that it touches no `M-<integer>` record — it resolves no Mystery Reserve entry, leaving the Rule 7 firewall intact.
6. Reassessment widened the proof surface before source edits: `tools/validators/README.md`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/world-mcp/tests/server/capability-parity.test.ts` all carry validator inventory/count or registry-name assertions that must move with any structural-validator registration. This does not change runtime behavior; it keeps the registry witnesses truthful.

## Architecture Check

1. Deriving maturity from path + ID prefix (rather than a mandatory `maturity_level` frontmatter field) avoids a schema migration across every proposal/audit/pressure/world-proposal surface for zero consumer benefit; the world-index already supplies `file_path`, `node_id`, and `node_type`, so derivation is free at validation time.
2. No backwards-compatibility shim or alias path — fail-fast with a detailed incompatibility message and manual repair, per report §10.

## Verification Layers

1. Maturity collapse is detected → unit test (`artifact-maturity.test.ts`) asserting a `character-proposals/NCP-*` record framed as a realized dossier yields code `artifact_maturity.collapse` naming the path, prefix-implied tier, and correct routing skill.
2. Validator is wired into the framework → `tests/structural/registry.test.ts`, `tests/integration/spec04-verification.test.ts`, `tools/validators/README.md`, and `tools/world-mcp/tests/server/capability-parity.test.ts` name/count witnesses include `artifact_maturity`.
3. Block-vs-warn follows run_mode → unit test asserting `fail` severity under `pre-apply` and `warn` under `full-world`.
4. Mystery Reserve firewall untouched → manual review: the validator reads only proposal/audit/pressure/world-proposal surfaces and emits no verdict that narrows an `M-<integer>` record.

## Landed Changes

### 1. New validator module

`tools/validators/src/structural/artifact-maturity.ts` exports `artifactMaturity: Validator` (`name: "artifact_maturity"`). For each indexed or file-input world-system artifact, it derives the prefix-implied tier from path + ID prefix against the FOUNDATIONS §Artifact Authority and Maturity map. When frontmatter or markdown content explicitly presents a higher tier than the path/prefix grants, it emits `code: "artifact_maturity.collapse"` naming the path, prefix-implied tier, and correct routing skill. Severity is run_mode-conditional (`fail` under `pre-apply`, `warn` under `full-world`).

### 2. Register the validator

The import and `artifactMaturity` entry were added to the `structuralValidators` array in `tools/validators/src/public/registry.ts`.

### 3. Extend the registry and inventory witnesses

`artifact_maturity` was added to the structural registry name-list test, the CLI `--since` selected-validator expectation, SPEC-04 validator counts, the validators README inventory, and the downstream `world-mcp` capability parity expected validator list.

## Files to Touch

- `tools/validators/src/structural/artifact-maturity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/structural/artifact-maturity.test.ts` (new)
- `tools/validators/tests/cli/world-validate.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)

## Out of Scope

- A mandatory `maturity_level` frontmatter field on any schema — rejected in favor of path/prefix derivation (SPEC-64 §Out of Scope).
- The world-compatibility CLI mode (SPEC64WORSYSCOM-003) and index-consistency validator (SPEC64WORSYSCOM-002).
- Any change to the FOUNDATIONS authority map itself (owned by SPEC-62, landed).

## Acceptance Criteria

### Tests That Must Pass

1. `artifact_maturity.collapse` fires for a `character-proposals/NCP-*` record that presents as a realized dossier; the message names the path, prefix-implied tier, and routing skill.
2. A correctly-tiered artifact (e.g., an `NCP-*` card framed as a candidate proposal) produces no verdict.
3. Severity is `fail` under `run_mode: "pre-apply"` and `warn` under `full-world`.
4. `npm test --prefix tools/validators` passes, including registry name-list and validator-count assertions that now include `artifact_maturity`.
5. `tools/world-mcp` registry parity recognizes the new validator name after rebuilding the validators package.

### Invariants

1. Maturity is derived solely from path + ID prefix; no schema gains a `maturity_level` field.
2. The validator resolves no Mystery Reserve entry and changes no canon-validator threshold.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/artifact-maturity.test.ts` (new) — collapse-detection, clean-pass, and run_mode-severity cases.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — assert `artifact_maturity` is registered.
3. `tools/validators/tests/cli/world-validate.test.ts` (modify) — update selected-validator expectation for incremental/since scope.
4. `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — update active structural/total validator counts.
5. `tools/world-mcp/tests/server/capability-parity.test.ts` (modify) — update downstream expected validator registry name list.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (covers `tsc`; the package defines no separate `typecheck` script)
3. `(cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js)` — downstream registry parity proof

## Outcome

Completed: 2026-05-21

Implemented `artifact_maturity` as an additive structural validator over world-system artifacts. The validator derives granted maturity from path + ID/prefix, scans indexed frontmatter and available markdown content for explicit higher-tier claims, reports `artifact_maturity.collapse`, uses `fail` outside `full-world` and `warn` in `full-world`, and leaves `_source/`/Mystery Reserve records untouched. Registered it in the validators package and updated same-seam registry/count/inventory witnesses plus the downstream `world-mcp` validator-registry parity test.

## Verification Result

1. `npm run build` from `tools/validators` — PASS.
2. `node --test dist/tests/structural/artifact-maturity.test.js dist/tests/structural/registry.test.js` from `tools/validators` — PASS (5 tests).
3. First `npm test` from `tools/validators` — exposed one same-seam stale expected validator list in `tools/validators/tests/cli/world-validate.test.ts` after `artifact_maturity` joined the selected validators.
4. Final `npm test` from `tools/validators` — PASS (818 tests).
5. `npm run build` from `tools/world-mcp` — PASS.
6. `node --test dist/tests/server/capability-parity.test.js` from `tools/world-mcp` — PASS (5 tests).
7. Manual FOUNDATIONS alignment check — PASS: the validator enforces §Artifact Authority and Maturity by detecting overclaiming; it does not add `maturity_level`, does not mutate canon, and does not resolve Mystery Reserve content.

## Deviations

- The live registry append required same-seam witness updates beyond the initial file list: `tools/validators/README.md`, `tools/validators/tests/cli/world-validate.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/world-mcp/tests/server/capability-parity.test.ts`.
- Existing ignored package artifacts were present before verification (`tools/validators/dist/`, `tools/validators/node_modules/`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`). Builds refreshed `dist/`; ignored artifacts are not tracked source changes.
