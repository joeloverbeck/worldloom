# SPEC03PATENG-002: Create-op modules (7 atomic-record creators)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 7 per-op modules under `tools/patch-engine/src/ops/create-*-record.ts`, shared op staging/types helpers, and a patch-engine package type dependency. No impact on existing world-index or world-mcp code.
**Deps**: SPEC03PATENG-001

## Problem

SPEC-03's Create ops table (post-reassessment spec lines 73–79) defines 7 op types — one per atomic record class — each of which writes a new `_source/*.yaml` file to disk. Every op validates its payload against the corresponding record-class interface added in ticket 001 and produces a staged temp-file that ticket 006's apply orchestrator will fsync+rename atomically. This ticket lands the op modules as self-contained functions; wiring into the two-phase commit lives in ticket 006.

## Assumption Reassessment (2026-04-24)

1. Record-class interfaces (`CanonFactRecord`, `ChangeLogEntry`, `InvariantRecord`, `MysteryRecord`, `OpenQuestionRecord`, `NamedEntityRecord`, `SectionRecord`) are available via `import type { ... } from "@worldloom/world-index/public/types"` after ticket 001 re-exports them from `tools/world-index/src/public/types.ts`. Subpath per ticket 001's package-command and import-path notes (the repo uses `@worldloom/world-index`'s `exports` map, not the package root).
2. Atomic-file path convention per SPEC-13 §A (archived at `archive/specs/SPEC-13-atomic-source-migration.md` lines 42–75): `_source/canon/CF-NNNN.yaml`, `_source/change-log/CH-NNNN.yaml`, `_source/invariants/<INV-ID>.yaml`, `_source/mystery-reserve/M-NNNN.yaml`, `_source/open-questions/OQ-NNNN.yaml`, `_source/entities/ENT-NNNN.yaml`, `_source/<file-subdir>/SEC-<PREFIX>-NNN.yaml`. SEC file-subdir mapping per SPEC-13 §A (`ELF`→`everyday-life/`, `INS`→`institutions/`, `MTS`→`magic-or-tech-systems/`, `GEO`→`geography/`, `ECR`→`economy-and-resources/`, `PAS`→`peoples-and-species/`, `TML`→`timeline/`).
3. Shared boundary correction: `tools/world-index/src/hash/content.ts` exports `serializeStableYaml(value)` only, while `contentHashForYaml(parsed)` lives at `tools/world-index/src/parse/canonical.ts`. Neither helper is reachable through `@worldloom/world-index`'s public export map (`tools/world-index/package.json` exports only `./public/types`). To preserve the package-boundary rule from ticket 001, this ticket owns a patch-engine-local stable YAML/hash helper under `tools/patch-engine/src/ops/shared.ts` instead of importing world-index parser/hash internals.
4. Error-shape correction: the drafted op signature returns `Promise<StagedWrite>`, so validation and overwrite failures cannot be returned as plain success values without weakening the type. The landed shape rejects with a structured `PatchEngineOpError` carrying `code`, `target_file`, and `record_id` where applicable; ticket 008's unit tests can assert rejection details.
5. Change-log ID correction: `ChangeLogEntry` uses `change_id`, not `id`, in `tools/world-index/src/schema/types.ts`. `stageCreateChRecord` therefore derives the record ID and filename from `ch_record.change_id`.
6. Type dependency correction: `tools/patch-engine` did not declare `@types/better-sqlite3`, but this ticket's `OpContext` introduces a `BetterSqlite3.Database`-typed handle under `strict` TypeScript. Adding the dev dependency is same-seam package fallout required for `npm run build`.
7. Adjacent contradictions: none — the create ops are strictly additive new-file writes. They do not interact with existing `_source/` records except to refuse overwrites at the target path.

## Architecture Check

1. One file per op (e.g., `src/ops/create-cf-record.ts`) mirrors the SPEC-03 op vocabulary 1:1 and keeps each op individually testable. A hypothetical monolithic `src/ops/create.ts` with a switch on `op` would couple the 7 ops and complicate per-op fixture tests.
2. Each op exports a single function with uniform shape: `(envelope: PatchPlanEnvelope, op: PatchOperation, context: OpContext) => Promise<StagedWrite>`. `StagedWrite` carries `{target_file_path, temp_file_path, new_content, new_hash}` which ticket 006's orchestrator aggregates before the fsync+rename step. Failures reject with `PatchEngineOpError`.
3. Each op computes the target file path from its `target_world` + record ID; no op receives the path directly from the envelope. This keeps the engine the sole authority on canonical storage paths (per SPEC-13 §A write discipline) and prevents skills from injecting arbitrary paths.
4. No backwards-compatibility aliasing/shims introduced. Retired pre-SPEC-13 ops (`append_cf_record`, `append_change_log_entry`) are absent from `OperationKind` per ticket 001.

## Verification Layers

1. Each create op produces a YAML file whose parsed content equals the `*_record` payload -> unit test fixture (ticket 008 exercises this; this ticket just wires the write).
2. Each create op's output file path matches the SPEC-13 §A convention for its record class -> codebase grep-proof (`grep -h 'targetFilePath: path.join' tools/patch-engine/src/ops/create-*-record.ts | wc -l` returns 7, literal subdir grep covers six fixed classes, and `sectionSubdirForId` covers the seven SEC prefixes).
3. Payload type coercion prevents caller errors -> TypeScript typecheck (`const op: PatchOperation = {op: 'create_cf_record', payload: {cf_record: <non-CanonFactRecord>}}` fails compilation).
4. YAML serialization is deterministic (stable key order) -> codebase grep-proof (each op reaches `serializeStableYaml()` via the shared staging helper, not `JSON.stringify` or `yaml.dump` without a sort comparator).

## What to Change

### 1. Create `tools/patch-engine/src/ops/create-cf-record.ts`

Export `stageCreateCfRecord(env: PatchPlanEnvelope, op: PatchOperation & {op: 'create_cf_record'}, ctx: OpContext): Promise<StagedWrite>`. Steps:
- Assert `op.payload.cf_record.id` matches pattern `CF-\d{4}`.
- Assert `op.payload.cf_record.id` appears in `env.expected_id_allocations.cf_ids` (prevents undeclared ID minting).
- Compute target path: `<worldRoot>/worlds/<env.target_world>/_source/canon/<cf_record.id>.yaml`.
- Refuse to overwrite an existing file at target path — reject with `PatchEngineOpError` `{code: 'record_already_exists', target_file, record_id}`. (Write-order Tier 1 implies fresh creates.)
- Serialize `cf_record` via `serializeStableYaml()`; write to temp path `<target>.patch-engine.<plan_id>.tmp`.
- Return `{target_file_path, temp_file_path, new_content, new_hash: contentHashForYaml(cf_record)}`.

### 2. Create `tools/patch-engine/src/ops/create-ch-record.ts`

Parallel structure to create-cf-record. Target: `_source/change-log/<ch_record.change_id>.yaml`. ID pattern: `CH-\d{4}`. Allocation check: `env.expected_id_allocations.ch_ids`.

### 3. Create `tools/patch-engine/src/ops/create-inv-record.ts`

Target: `_source/invariants/<inv_record.id>.yaml`. ID pattern matches any of the category prefixes per CLAUDE.md §ID Allocation Conventions: `ONT-\d+`, `CAU-\d+`, `DIS-\d+`, `SOC-\d+`, `AES-\d+`. Allocation check: `env.expected_id_allocations.inv_ids`.

### 4. Create `tools/patch-engine/src/ops/create-m-record.ts`

Target: `_source/mystery-reserve/<m_record.id>.yaml`. ID pattern: `M-\d+` (animalia uses unpadded `M-1` through `M-20`; new worlds zero-pad; accept both). Allocation check: `env.expected_id_allocations.m_ids`.

### 5. Create `tools/patch-engine/src/ops/create-oq-record.ts`

Target: `_source/open-questions/<oq_record.id>.yaml`. ID pattern: `OQ-\d{4}`. Allocation check: `env.expected_id_allocations.oq_ids`.

### 6. Create `tools/patch-engine/src/ops/create-ent-record.ts`

Target: `_source/entities/<ent_record.id>.yaml`. ID pattern: `ENT-\d{4}`. Allocation check: `env.expected_id_allocations.ent_ids`.

### 7. Create `tools/patch-engine/src/ops/create-sec-record.ts`

Target: `_source/<file-subdir>/<sec_record.id>.yaml`, where `<file-subdir>` is derived from the SEC ID prefix via the lookup table in Assumption Reassessment item 2. ID pattern: `SEC-(ELF|INS|MTS|GEO|ECR|PAS|TML)-\d{3}`. Allocation check: `env.expected_id_allocations.sec_ids`.

### 8. Create `tools/patch-engine/src/ops/types.ts`

Shared internal types for ops:

```typescript
export interface OpContext {
  worldRoot: string;            // absolute path to the repository root containing worlds/
  db: BetterSqlite3.Database;   // open SQLite handle on the world index
}

export interface StagedWrite {
  target_file_path: string;     // final path after rename
  temp_file_path: string;       // `.patch-engine.<plan_id>.tmp` path
  new_content: string;          // serialized YAML content
  new_hash: string;             // contentHashForYaml of the parsed record
  op_kind: OperationKind;       // echoed for logging / receipt assembly
}
```

### 9. Create `tools/patch-engine/src/ops/shared.ts`

Shared helper for create ops:
- `PatchEngineOpError` with structured fields for `record_already_exists`, invalid ID format, missing allocation, and unsupported SEC prefix failures.
- `serializeStableYaml(value)` and `contentHashForYaml(value)` using `js-yaml` with sorted keys plus SHA-256 NFC normalization, preserving the deterministic hash contract without importing world-index internals.
- `stageNewRecordFile(...)` that performs ID/allocation checks, target overwrite checks, stable serialization, temp-file write, and `StagedWrite` assembly.

## Files to Touch

- `tools/patch-engine/src/ops/create-cf-record.ts` (new)
- `tools/patch-engine/src/ops/create-ch-record.ts` (new)
- `tools/patch-engine/src/ops/create-inv-record.ts` (new)
- `tools/patch-engine/src/ops/create-m-record.ts` (new)
- `tools/patch-engine/src/ops/create-oq-record.ts` (new)
- `tools/patch-engine/src/ops/create-ent-record.ts` (new)
- `tools/patch-engine/src/ops/create-sec-record.ts` (new)
- `tools/patch-engine/src/ops/types.ts` (new)
- `tools/patch-engine/src/ops/shared.ts` (new)
- `tools/patch-engine/package.json` (modify — add `@types/better-sqlite3` for `OpContext.db`)
- `tools/patch-engine/package-lock.json` (modify — lock `@types/better-sqlite3`)

## Out of Scope

- Update/append ops (ticket 003).
- Hybrid-file ops (ticket 004).
- fsync + rename (ticket 006's `commit/rename.ts`).
- Per-world write lock (ticket 006).
- Per-op unit tests with before/after fixtures (ticket 008).
- Running ops against the live `worlds/animalia/_source/` tree — tickets at this phase operate on fixture worlds only.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build` exits 0 with all 9 new ops files compiled.
2. `grep -h -c "^export function stageCreate" tools/patch-engine/src/ops/create-*-record.ts | awk '{s+=$1} END {print s}'` returns 7.
3. Each op's function signature conforms to `(env: PatchPlanEnvelope, op: PatchOperation & {op: ...}, ctx: OpContext) => Promise<StagedWrite>` — verified by TypeScript type checks in ticket 008.

### Invariants

1. Each create op writes to exactly the SPEC-13 §A path convention for its record class; no op receives or derives a path from the envelope's `target_file` field (that field is reserved for hybrid-file ops in ticket 004).
2. Each create op refuses to overwrite an existing file, rejecting with structured `record_already_exists` details. (Append-only discipline: `_source/*.yaml` files are created exactly once.)
3. YAML serialization uses a stable key ordering (`serializeStableYaml` in `ops/shared.ts`) so repeated runs of the same op produce byte-identical output and `contentHashForYaml` is deterministic.
4. Each create op validates its record ID against the envelope's `expected_id_allocations` for that class; unmatched IDs fail the op before any temp-file write.

## Test Plan

### New/Modified Tests

1. `None — this ticket lands op modules only; behavioral testing is consolidated in ticket 008 (per-op unit tests with fixture before/after snapshots).` The compile-time invariants (discriminated-union narrowing on `op.payload`) are verified by `tsc`.

### Commands

1. `cd tools/patch-engine && npm run build` (targeted: confirms all 7 create-op modules plus shared ops helpers/types compile).
2. `grep -n "serializeStableYaml\|contentHashForYaml" tools/patch-engine/src/ops/shared.ts` returns both helper names, and `grep -h "return stageNewRecordFile" tools/patch-engine/src/ops/create-*-record.ts | wc -l` returns 7 — confirms every op uses the shared stable serializer path (none skipped).
3. `grep -h -c "env.expected_id_allocations" tools/patch-engine/src/ops/create-*-record.ts | awk '{s+=$1} END {print s}'` should equal 7 — confirms every op performs the allocation check.

## Outcome

Completed on 2026-04-24. Added the seven create-op staging modules for CF, CH, invariant, Mystery Reserve, Open Question, named entity, and SEC records. Added shared op types and staging helpers for deterministic YAML serialization, content hashing, allocation checks, target overwrite rejection, temp-file writes, and SPEC-13 path derivation. Added `@types/better-sqlite3` so the new `OpContext.db` type compiles under the package's strict TypeScript settings.

## Verification Result

1. `cd tools/patch-engine && npm run build` — passed.
2. `grep -h -c "^export function stageCreate" tools/patch-engine/src/ops/create-*-record.ts | awk '{s+=$1} END {print s}'` — returned 7.
3. `grep -h 'targetFilePath: path.join' tools/patch-engine/src/ops/create-*-record.ts | wc -l` — returned 7.
4. `grep -n "serializeStableYaml\|contentHashForYaml" tools/patch-engine/src/ops/shared.ts` — returned both helper definitions and call sites.
5. `grep -h "return stageNewRecordFile" tools/patch-engine/src/ops/create-*-record.ts | wc -l` — returned 7.
6. `grep -h -c "env.expected_id_allocations" tools/patch-engine/src/ops/create-*-record.ts | awk '{s+=$1} END {print s}'` — returned 7.
7. `grep -n 'case "ELF"\|case "INS"\|case "MTS"\|case "GEO"\|case "ECR"\|case "PAS"\|case "TML"' tools/patch-engine/src/ops/shared.ts` — returned all seven SEC prefix mappings.

## Deviations

The world-index hash helper was not reachable from the package public API, so the implementation uses a patch-engine-local stable serializer/hash helper rather than importing world-index internals. `ChangeLogEntry` uses `change_id`, so `create_ch_record` derives the filename from that field. `npm install @types/better-sqlite3@7.6.13 --save-dev` reported one moderate audit vulnerability and funding notices; dependency remediation is outside this ticket.
