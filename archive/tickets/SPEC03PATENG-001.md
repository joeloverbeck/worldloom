# SPEC03PATENG-001: Package scaffold, envelope types, new record-class interfaces

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/patch-engine/` TypeScript package (new); extends `tools/world-index/src/schema/types.ts` with 7 new record-class interfaces; re-exports them via `tools/world-index/src/public/types.ts`. No impact on existing world-index parse logic or world-mcp read surface.
**Deps**: None

## Problem

SPEC-03's patch engine needs a TypeScript home: a package to own the envelope schema (`PatchPlanEnvelope`, `PatchOperation`, `PatchReceipt`), the per-op modules that will land in subsequent tickets (002–004), and the approval/commit subtrees (005–006). Today `tools/patch-engine/` contains only a stale README.md scaffold from Phase 0 (pre-SPEC-13 op vocabulary; to be rewritten in 007 once the real package shape lands).

Separately, seven record-class interfaces that SPEC-03's op payload table names (`InvariantRecord`, `MysteryRecord`, `OpenQuestionRecord`, `NamedEntityRecord`, `SectionRecord`, `CharacterDossier`, `DiegeticArtifactFrontmatter`) do not exist in code today — only `CanonFactRecord` (tools/world-index/src/schema/types.ts:131) and `ChangeLogEntry` (types.ts:180) are defined. Reassessment Q1 selected option (a): land the 7 interfaces in `tools/world-index/src/schema/types.ts` alongside the existing types, exported via `tools/world-index/src/public/types.ts`, so SPEC-04 validators (`record_schema_compliance`) and SPEC-02 MCP tools (`get_record`) import the same definitions and the patch-engine consumes them via its world-index dep per package-boundary rule.

## Assumption Reassessment (2026-04-24)

1. `tools/patch-engine/` currently contains only `README.md` (confirmed via `ls tools/patch-engine/`). The README documents the pre-SPEC-13 op vocabulary (`insert_before_node`, `append_cf_record`, etc.) and must be rewritten to match the atomic-record op vocabulary as part of ticket 007's world-mcp rewire or a late sub-step of 006. This ticket does not touch the README; it adds new files.
2. `CanonFactRecord` lives at `tools/world-index/src/schema/types.ts`; `ChangeLogEntry` lives in the same file. The 7 new interfaces insert after `ChangeLogEntry` and mirror the atomic YAML schemas in `archive/specs/SPEC-13-atomic-source-migration.md` §B plus live `animalia` samples/templates. They preserve the file's existing open-object posture with `[key: string]: unknown` for forward-compatible schema additions.
3. Shared boundary: `tools/world-index` public API exported from `tools/world-index/src/public/types.ts` is the type surface consumed by `tools/patch-engine`, `tools/world-mcp`, and future `tools/validators`. Extending it is additive; no breaking changes to existing exports. The live public import path is `@worldloom/world-index/public/types`, not the package root, matching `tools/world-mcp`'s current imports and `tools/world-index/package.json` export map.
4. FOUNDATIONS principle under audit: **§Canon Fact Record Schema** (docs/FOUNDATIONS.md §257–320) is preserved 1:1 in the existing `CanonFactRecord` interface; the 7 new interfaces mirror SPEC-13 §B atomic record schemas. No Validation Rule is strengthened or weakened by this ticket.
5. Package-command drift: the repo has no root `package.json` or `pnpm-workspace.yaml`; each TypeScript tool package is built from its own package root with `npm`. The drafted `pnpm --filter ...` proof commands are replaced by package-local `npm install` / `npm run build` commands.
6. Schema extension posture: **additive-only**. The 7 new interfaces are new exports; `CanonFactRecord` and `ChangeLogEntry` are untouched. Consumers (world-mcp, future SPEC-04 validators, future SPEC-03 tickets 002–006) pick up the new types via `tools/world-index/src/public/types.ts` re-exports.

## Architecture Check

1. Placing record-type interfaces in `tools/world-index/src/schema/types.ts` (rather than inside the patch-engine package) co-locates them with the existing `CanonFactRecord`/`ChangeLogEntry` definitions and with the `NODE_TYPES` enum in the same file. Validators (SPEC-04 `record_schema_compliance`) and MCP retrieval tools (SPEC-02 Phase 2 `get_record`) can import the same definitions without creating a new shared schema package. Respects the existing package-boundary rule (`tools/patch-engine` consumes `tools/world-index`'s public API; may not reach into parser internals).
2. `PatchPlanEnvelope` and `PatchOperation` live in the patch-engine package because they are the engine's input surface, not a world-state record shape. `PatchReceipt` likewise belongs to patch-engine as an output type. This ticket lands the type in `src/envelope/schema.ts`; ticket 006 owns the root package entrypoint (`src/apply.ts`) and must re-export `PatchReceipt` there so ticket 007 can import it from `@worldloom/patch-engine` instead of declaring a narrow local stub.
3. No backwards-compatibility aliasing/shims introduced. The existing stub `PatchReceipt` in world-mcp is explicitly superseded by ticket 007, not kept alongside the new one.

## Verification Layers

1. New record-class interfaces export correctly -> codebase grep-proof (`grep -c "^export interface \(InvariantRecord\|MysteryRecord\|OpenQuestionRecord\|NamedEntityRecord\|SectionRecord\|CharacterDossier\|DiegeticArtifactFrontmatter\|ExtensionEntry\)" tools/world-index/src/schema/types.ts` returns 8; public re-export grep returns ≥1).
2. `PatchPlanEnvelope` / `PatchOperation` / `PatchReceipt` interfaces present in patch-engine envelope module -> codebase grep-proof (`grep -n "export interface PatchPlanEnvelope\|PatchOperation\|PatchReceipt" tools/patch-engine/src/envelope/schema.ts` returns ≥3 matches).
3. Discriminated union on `PatchOperation.op` enforces append-only vocabulary at compile time -> TypeScript typecheck (`cd tools/patch-engine && npm run build` succeeds; a deliberate test case `const bad: PatchOperation = { op: 'replace_cf_record', ... }` would fail compilation — verified in ticket 008).
4. Package declaration accepted -> TypeScript build succeeds (`cd tools/patch-engine && npm run build` exits 0; `tools/patch-engine/dist/` populated).
5. World-index public re-export reachability -> downstream package compile (`cd tools/world-mcp && npm install && npm run build` exits 0), confirming the new exports are additive and do not break existing import paths.

## What to Change

### 1. Create `tools/patch-engine/package.json`

```json
{
  "name": "@worldloom/patch-engine",
  "version": "0.1.0",
  "description": "Deterministic atomic-record patch applier (SPEC-03).",
  "private": true,
  "type": "commonjs",
  "main": "dist/src/apply.js",
  "types": "dist/src/apply.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && node --test dist/tests/**/*.test.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@worldloom/world-index": "file:../world-index",
    "better-sqlite3": "12.2.0",
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

Dependency rationale: `@worldloom/world-index` for public types via `@worldloom/world-index/public/types` (record-class interfaces and existing enum constants) and future package-local integration with the index; `better-sqlite3` matches the version pinned by world-index and world-mcp; `js-yaml` for canonical YAML serialization of atomic records (world-index's parser uses read-oriented YAML helpers but does not expose a writer — the engine needs its own stable-dump path for create/update ops).

### 2. Create `tools/patch-engine/tsconfig.json`

Mirror the `strict: true` / `target: es2022` / `outDir: dist` layout of the existing TypeScript tool packages, using `module: Node16` / `moduleResolution: Node16` so the `@worldloom/world-index/public/types` export map resolves the same way it does in `tools/world-mcp`. Include `src/**/*` and `tests/**/*`; exclude `dist` and `node_modules`.

### 3. Create `tools/patch-engine/src/envelope/schema.ts`

Export the exact TypeScript shapes from SPEC-03 §Edit contract envelope (post-reassessment spec §Edit contract envelope):

- `PatchPlanEnvelope` interface — fields `plan_id`, `target_world`, `approval_token`, `verdict`, `originating_skill`, `originating_cf_ids?`, `originating_ch_id?`, `originating_pa_id?`, `expected_id_allocations` (with all 10 class sub-fields per spec lines 115–124), `patches: PatchOperation[]`.
- `OperationKind` discriminated-union type enumerating exactly the 14 op names: 7 create ops + 4 update/append ops + 3 hybrid-file ops. The closed union IS the compile-time append-only gate — attempts to construct `replace_cf_record` / `delete_cf_record` ops fail at type check.
- `PatchOperation` discriminated-union type — common fields `op`, `target_world`, `target_record_id?`, `target_file?`, `expected_content_hash?`, `expected_anchor_checksum?`, `payload`, `retcon_attestation?`, `failure_mode?: 'strict' | 'relocate_on_miss'`.
- `OperationPayload` — per-op payload types keyed by `op`: `{op: 'create_cf_record', payload: {cf_record: CanonFactRecord}}`, `{op: 'create_inv_record', payload: {inv_record: InvariantRecord}}`, etc. The 7 create ops type-check against the 7 record-class interfaces imported from `@worldloom/world-index/public/types`.
- `RetconAttestation` interface — `{retcon_type: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; originating_ch: string; rationale: string}` per spec line 140.
- `PatchReceipt` interface — fields `plan_id`, `applied_at`, `files_written`, `new_nodes`, `id_allocations_consumed` (all 10 class sub-fields per spec lines 267–278 post-reassessment), `index_sync_duration_ms`.

### 4. Create `tools/patch-engine/src/envelope/validate.ts`

Export `validateEnvelopeShape(envelope: unknown): {ok: true; envelope: PatchPlanEnvelope} | {ok: false; errors: string[]}`. Structural validation only — required top-level fields present, `patches` is an array, each `op` is one of the 14 `OperationKind` values, `target_world` matches envelope's `target_world`. Payload-specific schema validation (CF record fields complete, etc.) is deferred to the SPEC-04 `record_schema_compliance` validator invoked by `apply.ts` in Phase A step 5 (ticket 006).

### 5. Modify `tools/world-index/src/schema/types.ts`

Insert the 7 new interfaces after `ChangeLogEntry` (currently at line 180). Each interface mirrors the corresponding atomic YAML schema in SPEC-13 §B:

- `InvariantRecord` — fields: `id`, `category` ('ontological' | 'causal' | 'distribution' | 'social' | 'aesthetic_thematic'), `title`, `statement`, `rationale`, `examples: string[]`, `non_examples: string[]`, `break_conditions`, `revision_difficulty` ('low' | 'medium' | 'high'), `extensions: ExtensionEntry[]`.
- `MysteryRecord` — fields per SPEC-13 §B lines 155–175: `id`, `title`, `status`, `knowns: string[]`, `unknowns: string[]`, `common_interpretations`, `disallowed_cheap_answers: string[]`, `domains_touched: string[]`, `future_resolution_safety`, `extensions: ExtensionEntry[]`.
- `OpenQuestionRecord` — fields per SPEC-13 §B lines 180–197: `id`, `topic`, `body`, `when_to_resolve`, `caution?`, `extensions: ExtensionEntry[]`.
- `NamedEntityRecord` — shape per SPEC-13 §B line 199's `ENT-NNNN.yaml` schema (fields to be confirmed against an animalia sample at implementation time — spec says schema is "as currently authored").
- `SectionRecord` — fields: `id` (e.g., `SEC-GEO-001`), `file_class` (e.g., `GEOGRAPHY`), `heading`, `body`, `touched_by_cf: string[]`, `extensions: ExtensionEntry[]`.
- `CharacterDossier` — frontmatter shape of `worlds/<slug>/characters/<slug>.md` (fields per the character-generation skill's template at `.claude/skills/character-generation/templates/character-dossier.md`; confirmed at implementation time).
- `DiegeticArtifactFrontmatter` — frontmatter shape of `worlds/<slug>/diegetic-artifacts/<slug>.md` (fields per the diegetic-artifact-generation skill's template; confirmed at implementation time).

Also add a shared `ExtensionEntry` interface if not already present: `{originating_cf: string; change_id: string; date: string; label: string; body: string}` per SPEC-13 §B.

### 6. Modify `tools/world-index/src/public/types.ts`

Add `export type { InvariantRecord, MysteryRecord, OpenQuestionRecord, NamedEntityRecord, SectionRecord, CharacterDossier, DiegeticArtifactFrontmatter, ExtensionEntry } from "../schema/types";` alongside the existing `CanonFactRecord` / `ChangeLogEntry` / `ModificationHistoryEntry` re-exports.

## Files to Touch

- `tools/patch-engine/package.json` (new)
- `tools/patch-engine/package-lock.json` (new)
- `tools/patch-engine/tsconfig.json` (new)
- `tools/patch-engine/src/envelope/schema.ts` (new)
- `tools/patch-engine/src/envelope/validate.ts` (new)
- `tools/world-index/src/schema/types.ts` (modify — append 7 new interfaces + `ExtensionEntry`)
- `tools/world-index/src/public/types.ts` (modify — append 8 re-exports)

## Out of Scope

- Per-op modules (`src/ops/create-*.ts`, `src/ops/update-*.ts`, `src/ops/append-*.ts`) — covered by tickets 002, 003, 004.
- Approval-token verification (`src/approval/verify-token.ts`) — ticket 005.
- Apply orchestration (`src/apply.ts`, `src/commit/*.ts`) — ticket 006.
- world-mcp rewire (replacing the stub at `tools/world-mcp/src/tools/submit-patch-plan.ts`) — ticket 007.
- Rewriting `tools/patch-engine/README.md` (currently documents pre-SPEC-13 op vocabulary) — done alongside ticket 007 when the package becomes externally consumable.
- SPEC-02 Phase 2 tooling update (adds `get_record`, `find_sections_touched_by`, extends `allocate_next_id` to INV/OQ/ENT/SEC) — out of scope per SPEC-03 Dependencies; blocks ticket 009 (integration capstone) but not this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build` exits 0 (TypeScript compiles clean; `dist/` populated).
2. `cd tools/world-index && npm run build` exits 0 after the type additions (confirms the new interfaces do not break existing world-index code).
3. `cd tools/world-mcp && npm install && npm run build` exits 0 (refreshes the file dependency and confirms the new world-index re-exports are picked up by world-mcp's existing type imports without manual intervention).
4. `grep -c "^export interface \(InvariantRecord\|MysteryRecord\|OpenQuestionRecord\|NamedEntityRecord\|SectionRecord\|CharacterDossier\|DiegeticArtifactFrontmatter\|ExtensionEntry\)" tools/world-index/src/schema/types.ts` returns 8.
5. `grep -c "^export type { .*InvariantRecord\|MysteryRecord\|OpenQuestionRecord\|NamedEntityRecord\|SectionRecord\|CharacterDossier\|DiegeticArtifactFrontmatter\|ExtensionEntry.* } from" tools/world-index/src/public/types.ts` ≥1 (re-exports present).

### Invariants

1. The 7 new interfaces mirror SPEC-13 §B atomic record schemas 1:1 (no field omissions, renames, or type drift).
2. `PatchOperation.op` is a closed discriminated union over exactly the 14 op names SPEC-03 defines. Attempting to construct an op outside this union (e.g., `replace_cf_record`, `delete_cf_record`, or any pre-SPEC-13 anchor-based op) must fail TypeScript compilation.
3. `PatchReceipt.id_allocations_consumed` lists all 10 class sub-fields (cf_ids, ch_ids, inv_ids, m_ids, oq_ids, ent_ids, sec_ids, pa_ids, char_ids, da_ids) per spec lines 267–278.
4. No existing `CanonFactRecord` / `ChangeLogEntry` / `ModificationHistoryEntry` exports are modified — additions are strictly after the last current definition.
5. `tools/patch-engine` does not import from `tools/world-index/src/parse/*` or `tools/world-index/src/index/*` (parser/index internals) — only from `@worldloom/world-index/public/types`. Package-boundary rule preserved.

## Test Plan

### New/Modified Tests

1. `None — this ticket lands types + package scaffold only; behavioral testing begins in ticket 002 (per-op modules) and is consolidated in tickets 008 (unit) and 009 (integration).` The compile-time invariants (discriminated-union closure, record-interface field completeness) are verified by `tsc` itself during the package build; a deliberate `@ts-expect-error` probe is added in ticket 008.

### Commands

1. `cd tools/patch-engine && npm install && npm run build` (targeted: installs the new package-local dependencies and confirms the new package compiles).
2. `cd tools/world-index && npm run build` followed by `cd tools/world-mcp && npm install && npm run build` (downstream: confirms the type additions don't break existing consumers).
3. `grep -c "^export interface \(InvariantRecord\|MysteryRecord\|OpenQuestionRecord\|NamedEntityRecord\|SectionRecord\|CharacterDossier\|DiegeticArtifactFrontmatter\|ExtensionEntry\)" tools/world-index/src/schema/types.ts` returns 8.

## Outcome

Completed on 2026-04-24. Added the `tools/patch-engine` package scaffold, SPEC-03 envelope schema and structural envelope validator. Added the additive world-index record-class interfaces plus public re-exports for patch-engine and future validator/MCP consumers. Post-review note: the package root is intentionally not importable yet because `src/apply.ts` is ticket 006's owned entrypoint; ticket 006 was updated to make that root entrypoint re-export `PatchReceipt`.

## Verification Result

1. `cd tools/world-index && npm run build` — passed.
2. `cd tools/patch-engine && npm install && npm run build` — passed after refreshing the file dependency on the rebuilt world-index package.
3. `cd tools/world-mcp && npm install && npm run build` — passed.
4. `grep -c "^export interface \(InvariantRecord\|MysteryRecord\|OpenQuestionRecord\|NamedEntityRecord\|SectionRecord\|CharacterDossier\|DiegeticArtifactFrontmatter\|ExtensionEntry\)" tools/world-index/src/schema/types.ts` — returned 8.
5. `grep -c "^export type { .*InvariantRecord\|MysteryRecord\|OpenQuestionRecord\|NamedEntityRecord\|SectionRecord\|CharacterDossier\|DiegeticArtifactFrontmatter\|ExtensionEntry.* } from" tools/world-index/src/public/types.ts` — returned 6, satisfying the ≥1 re-export presence check.
6. Post-review rerun: `cd tools/patch-engine && npm run build`, `cd tools/world-index && npm run build`, and `cd tools/world-mcp && npm run build` — all passed.

## Deviations

The drafted `pnpm --filter ...` commands were not truthful for the live repo because there is no root package workspace. Verification used package-local `npm` commands. The new package also uses `module: Node16` / `moduleResolution: Node16` rather than `commonjs` / `node`, because the live `@worldloom/world-index/public/types` export map requires Node16-style resolution.

`npm install` in `tools/patch-engine` reported one moderate audit vulnerability and a deprecated transitive `prebuild-install` package. Dependency remediation was outside this scaffold/type ticket and was not run.
