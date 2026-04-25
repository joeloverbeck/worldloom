# SPEC04VALFRA-001: Package scaffold, framework types, Verdict schema

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/validators/` TypeScript package (previously scaffold-only). Adds `src/framework/{types,run,aggregate}.ts`; rewrites `tools/validators/README.md` to reflect the post-reassessment 13-mechanized + 1-skill-judgment validator surface (retires `attribution_comment` / `anchor_integrity` references). No impact on existing world-index / world-mcp / patch-engine packages.
**Deps**: None

## Problem

SPEC-04's validator framework needs a TypeScript home: a package to own the per-validator modules (landed in tickets 003–004), the JSON schemas (002), the `world-validate` CLI (005), and the `validatePatchPlan` engine entry point (006). At intake, `tools/validators/` contained only a stale `README.md` scaffold from Phase 0 that documented the pre-reassessment validator inventory (listed `attribution_comment` and `anchor_integrity` in the structural set — both retired per the reassessed spec's §Package Location "Retired vs pre-SPEC-13" note).

Separately, the framework surface — `Verdict`, `ValidatorRun`, `Validator`, `RunMode`, `Context` — must exist before any per-validator module can be written, and the downstream MCP stub at `tools/world-mcp/src/tools/validate-patch-plan.ts:9-17` already declares a matching `Verdict` interface that this package must mirror exactly so ticket 006's stub swap is a drop-in.

## Assumption Reassessment (2026-04-25)

1. At intake, `tools/validators/` contained only `README.md` (confirmed via `ls tools/validators/`). The README documented the pre-reassessment structural set including `attribution_comment` and `anchor_integrity` — both retired by the reassessed SPEC-04 §Package Location note. This ticket rewrote the README alongside landing the package scaffold so the documented inventory matches the mechanized-validator surface that tickets 002–006 will populate.
2. The `Verdict` interface must match `tools/world-mcp/src/tools/validate-patch-plan.ts:9-17` exactly — fields `validator`, `severity: 'fail' | 'warn' | 'info'`, `code`, `message`, `location: { file: string; line_range?: [number, number]; node_id?: string }`, `suggested_fix?: string` (confirmed via direct read). The SQL `validation_results` table at `tools/world-index/src/schema/migrations/001_initial.sql:124-136` persists the same columns (`node_id`, no `record_id`). The reassessed spec's implementation-pattern example at §Validator implementation pattern uses `node_id` after the reassessment Issue I6 correction — the types.ts file must not drift.
3. Shared boundary: `@worldloom/validators/public/types` will be the type surface imported by `tools/patch-engine` (via the SPEC-03 engine's pre-apply hook, wired in ticket 006) and by `tools/world-mcp/src/tools/validate-patch-plan.ts` (also wired in ticket 006). World-index is the upstream dependency — the record-class interfaces (`CanonFactRecord`, `ChangeLogEntry`, `InvariantRecord`, `MysteryRecord`, `OpenQuestionRecord`, `NamedEntityRecord`, `SectionRecord`, `CharacterDossier`, `DiegeticArtifactFrontmatter`) live in `tools/world-index/src/schema/types.ts` and are re-exported by `@worldloom/world-index/public/types`. Reassessment correction: no live `WorldIndexReadSurface`, `IndexedRecord`, or `PatchPlanEnvelope` public type exists today, and `@worldloom/patch-engine` currently exports only `PatchReceipt`; this ticket therefore defines a narrow local `WorldIndexReadSurface`, `IndexedRecord`, and opaque `PatchPlanEnvelope` placeholder in `tools/validators/src/framework/types.ts` rather than changing sibling package exports. Ticket 006 owns replacing the opaque envelope with the real engine/MCP integration type when the validator entry point is wired.
4. FOUNDATIONS principle under audit: **§Tooling Recommendation** (docs/FOUNDATIONS.md §416–428) — "LLM agents should never operate on prose alone." The framework's `Context` type gives validators typed access to world-state via the index's query surface; no prose parsing. This ticket's framework types do not weaken any Validation Rule; they are the container types that subsequent rule-derived and structural validators populate.
5. Package-command convention: the repo has no root `package.json` or `pnpm-workspace.yaml`; each TypeScript tool package is built package-locally with `npm`. `tools/patch-engine/package.json` established the shape (confirmed via direct read: `"build": "tsc -p tsconfig.json"`, `"test": "npm run build && node --test dist/tests/**/*.test.js"`, `"clean": "rm -rf dist"`, `"type": "commonjs"`, `"module: Node16"` in tsconfig for `@worldloom/*` export-map resolution). This package mirrors that convention.
6. Schema extension posture: **additive-only**. The new `Verdict` and `ValidatorRun` interfaces are exported from a new package; `tools/world-mcp/src/tools/validate-patch-plan.ts:9-17`'s existing `Verdict` declaration is untouched by this ticket — ticket 006 replaces its sentinel branch with an import from `@worldloom/validators` and deletes the local duplicate then.

## Architecture Check

1. Placing `Verdict` / `ValidatorRun` types in a new `@worldloom/validators/public/types` surface (rather than inside `world-index`'s public types) keeps world-index's type surface focused on world-state records and keeps the validator-specific contract in the package that owns validator behavior. The subsequent per-validator modules (tickets 003–004) can consume `Verdict` without pulling in world-state types they don't use, and the engine pre-apply hook (ticket 006) imports `Verdict` from `@worldloom/validators`, not `@worldloom/world-index` — clearer dependency direction.
2. The `Validator` interface's `applies_to(ctx) => boolean` predicate is the per-run-mode applicability mechanism from the reassessed spec's §Per-run-mode applicability matrix. Each concrete validator in tickets 003–004 declares its own `applies_to`; the framework's `run.ts` consults this predicate before invoking `run(input, ctx)`. Encoding applicability in the type means the matrix is machine-checked rather than documentation-only.
3. No backwards-compatibility aliasing/shims introduced. The stale `tools/validators/README.md` is rewritten in-place; the retired `attribution_comment` / `anchor_integrity` names are deleted, not preserved as deprecated exports.

## Verification Layers

1. New package compiles clean → TypeScript build (`cd tools/validators && npm install && npm run build` exits 0; `tools/validators/dist/` populated).
2. Framework interfaces export correctly → codebase grep-proof (`grep -c "^export interface \(Verdict\|ValidatorRun\|Validator\|Context\)\|^export type RunMode" tools/validators/src/framework/types.ts` returns ≥5).
3. `Verdict` shape matches the downstream MCP stub exactly → byte-level comparison (`diff <(sed -n '9,17p' tools/world-mcp/src/tools/validate-patch-plan.ts) <(grep -A8 "^export interface Verdict" tools/validators/src/framework/types.ts | head -9)` reveals no semantic divergence beyond the `export` keyword).
4. Package public surface is import-neutral for downstream consumers → downstream package compile (`cd tools/world-mcp && npm install && npm run build` exits 0; import is added by ticket 006, so 001 does not add `@worldloom/validators` to world-mcp yet).
5. README retired-validator removal → codebase grep-proof (`node -e "const fs=require('fs'); const readme=fs.readFileSync('tools/validators/README.md','utf8'); if(/attribution_comment|anchor_integrity/.test(readme)){ process.exit(1); }"` exits 0 after the rewrite).

## What to Change

### 1. Create `tools/validators/package.json`

```json
{
  "name": "@worldloom/validators",
  "version": "0.1.0",
  "description": "Executable FOUNDATIONS Rule 1-7 plus structural invariant enforcement (SPEC-04).",
  "private": true,
  "type": "commonjs",
  "main": "dist/src/public/index.js",
  "types": "dist/src/public/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/src/public/index.d.ts",
      "require": "./dist/src/public/index.js",
      "import": "./dist/src/public/index.js"
    },
    "./public/types": {
      "types": "./dist/src/public/types.d.ts",
      "require": "./dist/src/public/types.js",
      "import": "./dist/src/public/types.js"
    }
  },
  "bin": {
    "world-validate": "dist/src/cli/world-validate.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && node --test dist/tests/**/*.test.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@worldloom/world-index": "file:../world-index",
    "ajv": "8.17.1",
    "js-yaml": "4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "4.0.9",
    "@types/node": "24.7.2",
    "typescript": "5.9.3"
  },
  "engines": {
    "node": ">=20"
  }
}
```

Dependency rationale: `@worldloom/world-index` for the record-class type imports (`CanonFactRecord`, `ChangeLogEntry`, `MysteryRecord`, `SectionRecord`, etc.) and for the indexed-read query surface the `Context.index` field exposes. `ajv` is selected for JSON Schema validation in ticket 002 (`record_schema_compliance`); lands here so all of `ticket 002`'s schema work sees the dependency declared. `js-yaml` reads atomic-YAML records when the index isn't consulted directly. The `bin` entry reserves the `world-validate` name for ticket 005's CLI; the file doesn't exist yet, but declaring the mapping up front avoids a package.json edit in 005.

### 2. Create `tools/validators/tsconfig.json`

Mirror the `strict: true` / `target: es2022` / `outDir: dist` layout of `tools/patch-engine/tsconfig.json`, using `module: Node16` / `moduleResolution: Node16` so the `@worldloom/world-index/public/types` export map resolves correctly. Include `src/**/*` and `tests/**/*`; exclude `dist` and `node_modules`.

### 3. Create `tools/validators/src/framework/types.ts`

Export the framework-level interfaces that per-validator modules consume:

- `type RunMode = 'pre-apply' | 'full-world' | 'incremental';`
- `interface Verdict` — mirroring `tools/world-mcp/src/tools/validate-patch-plan.ts:9-17` exactly: `validator: string`, `severity: 'fail' | 'warn' | 'info'`, `code: string`, `message: string`, `location: { file: string; line_range?: [number, number]; node_id?: string }`, `suggested_fix?: string`.
- `interface ValidatorRun` — `run_mode: RunMode`, `world_slug: string`, `started_at: string`, `finished_at: string`, `verdicts: Verdict[]`, `summary: { fail_count: number; warn_count: number; info_count: number; validators_run: string[]; validators_skipped: { name: string; reason: string }[] }`. Runtime-only per spec §Verdict schema Persistence note.
- `interface Context` — `run_mode: RunMode`, `world_slug: string`, `index: WorldIndexReadSurface` (locally declared narrow read surface; defines the subset of methods validators may invoke — at minimum `query({ record_type, world_slug }): Promise<IndexedRecord[]>` per the spec's implementation-pattern example), `touched_files: string[]` (populated in `incremental` mode; empty in `pre-apply` and `full-world`), `patch_plan?: PatchPlanEnvelope` (populated in `pre-apply` mode only; opaque local placeholder until ticket 006 wires the real entry point).
- `interface Validator<TInput = unknown>` — `name: string`, `severity_mode: 'fail' | 'warn' | 'info'`, `applies_to: (ctx: Context) => boolean`, `run: (input: TInput, ctx: Context) => Promise<Verdict[]>`.

### 4. Create `tools/validators/src/framework/run.ts`

Export `runValidators(validators: Validator[], input: unknown, ctx: Context): Promise<ValidatorRun>`. Implementation: filter `validators` by `applies_to(ctx)`, then invoke `run(input, ctx)` on each in parallel via `Promise.all`, collect verdicts, populate the `ValidatorRun` summary with `started_at` / `finished_at` ISO timestamps, `validators_run` (names of invoked validators), `validators_skipped` (names + reason for filtered-out ones; reason is `'applies_to=false'` unless the validator exports a more specific `skip_reason` string), and severity-bucket counts from `aggregate.ts`.

### 5. Create `tools/validators/src/framework/aggregate.ts`

Export `aggregateSeverity(verdicts: Verdict[]): { fail_count, warn_count, info_count }`. Pure function over verdict severity tags. Used by `run.ts` to populate `ValidatorRun.summary`.

### 6. Create `tools/validators/src/public/types.ts`

Re-export `Verdict`, `ValidatorRun`, `Validator`, `Context`, `RunMode` from `../framework/types`. Engine integration (ticket 006) imports from `@worldloom/validators/public/types`.

### 7. Create `tools/validators/src/public/index.ts`

Placeholder file that re-exports from `./types`; ticket 006 adds the `validatePatchPlan` entry point here.

### 8. Rewrite `tools/validators/README.md`

Replace the current Phase 0 scaffold content with a summary that matches the reassessed SPEC-04 surface:

- Package purpose + link to `specs/SPEC-04-validator-framework.md`.
- Phase status: "Phase 2 Tier 1 — structural subset activates via CLI (ticket 005); engine integration in ticket 006."
- 13 mechanized validators listed in two groups: 6 rule-derived (Rule 1, 2, 4, 5, 6, 7) + 7 structural (`yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `record_schema_compliance`, `touched_by_cf_completeness`, `modification_history_retrofit`, `adjudication_discovery_fields`).
- 1 skill-judgment rule: Rule 3 No Specialness Inflation — remains `canon-addition` Phase 14a Test 10 prose-judgment; not mechanized.
- Verdict schema one-liner (matches `tools/world-mcp/src/tools/validate-patch-plan.ts:9-17`).
- Gate semantics: pre-apply (engine-called, blocks on any fail), full-world (CLI, exit 1 on any fail), incremental (Hook 5 post-apply, logs to `validation_results`, non-blocking).
- CLI surface (planned, ticket 005): `world-validate <world-slug>` + flags per spec §CLI usage.
- Phase 14a migration note: canon-addition skill Phase 14a collapses to `mcp__worldloom__validate_patch_plan(plan)` + skill-judgment for Tests 3 (stabilizer quality), 6 (MR overlap), 8, 9, 10.

Delete all references to `attribution_comment` and `anchor_integrity`.

## Files to Touch

- `tools/validators/package.json` (new)
- `tools/validators/package-lock.json` (new; generated by `npm install`)
- `tools/validators/tsconfig.json` (new)
- `tools/validators/src/framework/types.ts` (new)
- `tools/validators/src/framework/run.ts` (new)
- `tools/validators/src/framework/aggregate.ts` (new)
- `tools/validators/src/public/types.ts` (new)
- `tools/validators/src/public/index.ts` (new)
- `tools/validators/README.md` (modify — full rewrite per §8 above)

## Out of Scope

- JSON Schemas — ticket 002.
- Structural validator implementations — ticket 003.
- Rule-derived validator implementations — ticket 004.
- `world-validate` CLI — ticket 005.
- Engine integration (`validatePatchPlan` entry point + world-mcp stub swap) — ticket 006.
- Integration capstone / bootstrap audit — ticket 007.
- Modifying `tools/world-mcp/src/tools/validate-patch-plan.ts` to import from `@worldloom/validators` — owned by ticket 006.
- Any cross-spec doc drift on `attribution_comment` / `anchor_integrity` references in `docs/FOUNDATIONS.md:439`, `specs/SPEC-05-hooks-discipline.md:174`, or `specs/SPEC-07-docs-updates.md:47` — owned by SPEC-07 Part B decomposition.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm install && npm run build` exits 0; `dist/` populated.
2. `grep -c "^export interface \(Verdict\|ValidatorRun\|Validator\|Context\)" tools/validators/src/framework/types.ts` returns 4.
3. `grep -c "^export type RunMode" tools/validators/src/framework/types.ts` returns 1.
4. `node -e "const fs=require('fs'); const readme=fs.readFileSync('tools/validators/README.md','utf8'); if(/attribution_comment|anchor_integrity/.test(readme)){ process.exit(1); }"` exits 0.
5. `cd tools/world-mcp && npm install && npm run build` exits 0 (refreshes file dependency on the rebuilt world-index; confirms the new package's presence does not break existing imports).

### Invariants

1. The `Verdict` interface field set matches `tools/world-mcp/src/tools/validate-patch-plan.ts:9-17` exactly — `validator`, `severity`, `code`, `message`, `location.{file,line_range?,node_id?}`, `suggested_fix?`. Field renames, type changes, or `record_id`/`node_id` drift must fail ticket review.
2. `Validator.applies_to` is a synchronous predicate over `Context` — it cannot itself read from the index (`async` would invert the runner's filter-before-run discipline).
3. `@worldloom/validators/public/*` does NOT re-export any per-validator implementation symbol — that surface is owned by tickets 003–004's own exports and is consumed via the package's internal registry (also owned by 003–004), not via the public-types surface.
4. The package's `exports` map includes only `.` (the index) and `./public/types` (the type surface); internal framework modules remain non-public.

## Test Plan

### New/Modified Tests

1. `None — this ticket lands types + package scaffold only; behavioral testing begins with ticket 003 (structural validators, with per-validator fixture suites) and consolidates in ticket 007 (integration capstone). The compile-time invariants (exported-interface shape, discriminated-union closures where applicable) are verified by `tsc` during the package build.`

### Commands

1. `cd tools/validators && npm install && npm run build` (targeted: installs package-local dependencies and confirms compilation).
2. `cd tools/world-mcp && npm install && npm run build` (downstream: confirms the new package's presence is import-neutral for the existing world-mcp code — ticket 006 adds the real import later).
3. `node -e "const fs=require('fs'); const readme=fs.readFileSync('tools/validators/README.md','utf8'); if(/attribution_comment|anchor_integrity/.test(readme)){ process.exit(1); }"` exits 0 (README rewrite verification).

## Outcome

Completion date: 2026-04-25.

Implemented the package scaffold for `@worldloom/validators`:

- Added `tools/validators/package.json`, `package-lock.json`, and `tsconfig.json`.
- Added framework types, `aggregateSeverity`, `runValidators`, and public type re-exports under `tools/validators/src/`.
- Rewrote `tools/validators/README.md` to the reassessed SPEC-04 inventory: 6 rule-derived mechanized validators, 7 structural validators, and Rule 3 as skill judgment.

No existing world-index, world-mcp, or patch-engine source files were modified.

## Verification Result

Completed on 2026-04-25:

1. `cd tools/validators && npm install` — passed; produced `tools/validators/package-lock.json`. npm reported 2 moderate vulnerabilities and 2 funding notices; dependency remediation is outside this scaffold ticket.
2. `cd tools/validators && npm run build` — passed; `dist/src/framework/*` and `dist/src/public/*` emitted.
3. `grep -c "^export interface \(Verdict\|ValidatorRun\|Validator\|Context\)" tools/validators/src/framework/types.ts` — printed `4`.
4. `grep -c "^export type RunMode" tools/validators/src/framework/types.ts` — printed `1`.
5. Direct `node -e` comparison of `Verdict` in `tools/world-mcp/src/tools/validate-patch-plan.ts` and `tools/validators/src/framework/types.ts` — passed with `Verdict shapes match`.
6. Direct `node -e` README scan for retired validator names — passed with `retired validator names absent`.
7. `cd tools/world-mcp && npm install` — passed; existing package was up to date with 0 vulnerabilities reported.
8. `cd tools/world-mcp && npm run build` — passed.
9. `git status --short --ignored tools/validators` — showed source/package owned edits plus ignored `tools/validators/dist/` and `tools/validators/node_modules/`; these are expected generated ignored artifacts from the package-local build/install proof.

## Deviations

The drafted ticket expected `WorldIndexReadSurface`, `IndexedRecord`, and `PatchPlanEnvelope` to be available from existing sibling package public surfaces. Live reassessment showed those types are not exported today (`@worldloom/patch-engine` currently exports only `PatchReceipt`). To keep ticket 001 independently landable and avoid changing sibling package contracts, this ticket defines a narrow local `WorldIndexReadSurface`, `IndexedRecord`, and opaque `PatchPlanEnvelope` in `tools/validators/src/framework/types.ts`. Ticket 006 remains the owner for replacing the opaque envelope boundary with the real engine/MCP integration type during the `validatePatchPlan` rewire.
