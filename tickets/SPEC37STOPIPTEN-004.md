# SPEC37STOPIPTEN-004: Build-info validator/schema fingerprint extension and MACHINE-FACING-LAYER.md docs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/build-info.ts` (BuildInfo interface + `createBuildInfo` function); extends `tools/world-mcp/tests/server/capability-parity.test.ts` (two new tests); updates two schema-paired test files for symmetry; adds new prose to `docs/MACHINE-FACING-LAYER.md` (new `### Build-info fields` sub-section + revision of line 113's stale-diagnostic row).
**Deps**: None

## Problem

`tools/world-mcp/src/build-info.ts:6` defines the `BuildInfo` interface with exactly three fields — `git_commit_hash`, `build_timestamp`, `source_schema_hash` — where `source_schema_hash` (line 41) is SHA-256 over normalized tool capabilities (sorted `{name, description, input_schema_enums}` per tool). Validator source content, record-schema files, and the patch-operation schema manifest are NOT hashed; consequently a running MCP server with a stale validator bundle exposes no fingerprint that diverges from a current-source server, and `describe_capabilities()` cannot detect the staleness. `tools/world-mcp/tests/server/capability-parity.test.ts` asserts the validator-registry name list against an expected set but cannot detect implementation drift inside an unchanged-name validator — most validator changes adjust predicate logic without adding or removing validators. `docs/MACHINE-FACING-LAYER.md` mentions `describe_capabilities` at line 83 and discusses the validator-bundle-staleness diagnostic at line 113, but does not enumerate the `build_info` field surface — any fingerprint extension introduces field documentation as new prose. Additionally, line 113 currently states `describe_capabilities()` "cannot detect this because the validators bundle version is not part of the world-mcp tool or enum contract surface" — this assertion becomes false once `validator_registry_hash` lands, so the same edit must revise line 113. This ticket lands the supporting passive currency indicator that complements SPEC37STOPIPTEN-003's load-bearing smoke test; together they cover both behavioral and introspective runtime currency.

## Assumption Reassessment (2026-05-17)

1. `tools/world-mcp/src/build-info.ts` exists with `BuildInfo` interface at line 6 (3 fields) and `createBuildInfo(tools)` function at line 37 returning the populated interface; the function is referenced by name (`createBuildInfo`, not `computeBuildInfo` as SPEC-37 D4 §1 prose hedges) from `tools/world-mcp/src/server.ts:479`. `BuildInfo` is consumed by `tools/world-mcp/src/tools/describe-capabilities.ts` (lines 1, 10, 19) as the typed shape of the `build_info` response field; extending the interface flows automatically into the response shape. The interface extension is additive — no consumer breaks. `tools/patch-engine/src/envelope/schema.ts:58` exports `OPERATION_KINDS` (the closed list of patch operation kinds); the per-kind payload schemas live in the same envelope schema module surface and are the source-of-truth for `patch_operation_schema_hash`.
2. `tools/world-mcp/tests/server/capability-parity.test.ts` exists (126 lines); two additional tests are appended per the spec. Two additional test files assert the existing 3-field `build_info` shape and must be kept in sync with the new 2 fields for symmetry: `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (lines 44-47) and `tools/world-mcp/tests/server/dispatch.test.ts` (lines 969-971). Adding the two new fingerprint-format assertions to those two files is additive consistency, not new scope (spec under-enumeration of schema-paired test surfaces; resolved by adding both files to Files to Touch). `docs/MACHINE-FACING-LAYER.md` mentions `describe_capabilities` at line 83, the rebuild-and-restart guidance at line 93, the stale-tool-contract diagnostic at line 112, and the stale-validator-bundle diagnostic at line 113. Line 113 explicitly states `describe_capabilities()` "cannot detect this" — that assertion is invalidated by this ticket's `validator_registry_hash` extension and must be revised in the same edit.
3. Cross-skill / cross-artifact boundary under audit: the runtime introspection contract between `describe_capabilities` (MCP tool that returns `build_info`), `BuildInfo` (the typed shape), `createBuildInfo` (the source-of-truth function), and the docs surface at `docs/MACHINE-FACING-LAYER.md` that documents what each field means. Two passive fingerprint surfaces (`validator_registry_hash` over validator-source content, `patch_operation_schema_hash` over op-schema manifest) add two distinct currency signals — neither alone catches all drift; both together cover validator-implementation drift and contract drift respectively. The smoke test in SPEC37STOPIPTEN-003 complements these passive fingerprints with active validator-code-path exercise.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Machine-Facing Layer (line 532) — capability and schema-discovery currency; the runtime surface must expose enough fingerprinting that consumers can verify "this running server has the validator/schema bundle I expect." §Read Discipline — machine-facing layer documentation must enumerate what each runtime-exposed field means; adding fingerprint fields without documenting them perpetuates the documentation gap the spec calls out.

## Architecture Check

1. Hashing validator source-file CONTENT (not just names) is structurally correct — a name-list hash fails to detect predicate-body changes inside an unchanged-named validator, which is the actual drift class the audit fears. Content-hashing catches any byte-level change in any validator source file, deterministic across OS via `\n` line normalization. Computing the hash at build time (embedding it as a compile-time constant) rather than at server-startup time mitigates the cold-start cost the spec's §Risks "D4 server-startup cost" entry names; the implementer chooses build-time vs. startup-time per the cost/complexity trade-off, but build-time is preferred for performance.
2. Adding the two new fingerprints as additional fields on the existing `BuildInfo` interface (rather than authoring a parallel `ExtendedBuildInfo`) keeps the introspection surface single-source. The existing `source_schema_hash` is preserved unchanged — it tells consumers "tool capability surface changed"; the new hashes add "validator behavior surface changed" and "patch-operation contract changed" as orthogonal signals. No backwards-compatibility shims; the additive field set does not break any existing consumer (assertions only check field shape, not field-set closure).

## Verification Layers

1. `BuildInfo` interface includes the two new fields → TypeScript compiler enforces consumer alignment; `cd tools/world-mcp && npm run build` exits 0.
2. New fingerprint fields populate with 64-char hex strings at runtime → the two new capability-parity tests assert format and equality against locally computed expectations.
3. Hash divergence on validator-source byte change → manual sanity check (modify a validator source file, rebuild, observe `validator_registry_hash` changes); not a unit test, but documented in Test Plan as a manual verification step.
4. Schema-paired test symmetry → `grep -n "validator_registry_hash\|patch_operation_schema_hash" tools/world-mcp/tests/` returns matches in all three test files that assert `build_info` shape.
5. Docs surface enumerates all five fields → `grep -n "validator_registry_hash\|patch_operation_schema_hash" docs/MACHINE-FACING-LAYER.md` returns matches; the line 113 revision removes the "cannot detect" assertion and references the new fingerprints.

## What to Change

### 1. Build-info source extension at `tools/world-mcp/src/build-info.ts`

Extend the `BuildInfo` interface (currently 3 fields at lines 6-10) with two new fields:

```typescript
export interface BuildInfo {
  git_commit_hash: string;
  build_timestamp: string;
  source_schema_hash: string;
  validator_registry_hash: string;     // NEW
  patch_operation_schema_hash: string; // NEW
}
```

Extend `createBuildInfo` (line 37) to populate both new fields:

- `validator_registry_hash`: SHA-256 over the concatenated source-content bytes of all files matching `tools/validators/src/structural/*.ts` and `tools/validators/src/rules/*.ts`, sorted by relative path (deterministic ordering). File reads use `fs.readFileSync(path, "utf-8")` and normalize line endings to `\n` (strip `\r` if present) for cross-OS reproducibility. The hash MUST cover file CONTENTS, not just file names — name-list hashing fails to detect predicate-body changes inside an unchanged-named validator. Preferred implementation: compute the hash at build time (in the same step that produces `dist/`) and embed it as a compile-time constant, rather than computing at runtime — see §Risks "D4 server-startup cost" for cold-start performance rationale; the spec's preferred form is the build-time computation. If implementer chooses runtime computation, document the choice in a code comment and benchmark the cost.
- `patch_operation_schema_hash`: SHA-256 over the JSON.stringify of the op-schema manifest — for each kind in `OPERATION_KINDS` (exported at `tools/patch-engine/src/envelope/schema.ts:58`), include the kind and the corresponding op-schema bytes from the envelope-schema module's source-of-truth. Sort by kind for determinism. This catches the case where an op kind's payload schema changes (e.g., required field added or removed) without the kind name changing.

The existing `source_schema_hash` is preserved unchanged for backward compatibility — it tells consumers "tool capability surface changed"; the new hashes tell consumers "validator behavior surface changed" and "patch-operation contract changed" respectively. The three fingerprints are orthogonal signals.

### 2. Capability-parity test extension at `tools/world-mcp/tests/server/capability-parity.test.ts`

Add two new test cases:

- `describe_capabilities_exposes_validator_registry_hash` — invoke `describe_capabilities` via the in-memory server using the existing test pattern; assert `result.build_info.validator_registry_hash` matches `/^[0-9a-f]{64}$/`. Compute the expected hash locally in the test (read the same validator files using the same glob pattern, hash with SHA-256 and identical line normalization) and assert equality. The parity check is what catches a stale runtime hash against a current source-tree.
- `describe_capabilities_exposes_patch_operation_schema_hash` — analogous: assert `result.build_info.patch_operation_schema_hash` matches `/^[0-9a-f]{64}$/` and equals a locally computed manifest hash.

### 3. Schema-paired test symmetry — `tools/world-mcp/tests/tools/describe-capabilities.test.ts`

This test file (lines 44-47) asserts the existing 3-field `build_info` shape. Add two additional shape assertions for the new fingerprints so all `build_info`-asserting tests stay in sync:

```typescript
assert.match(manifest.build_info.validator_registry_hash, /^[0-9a-f]{64}$/);
assert.match(manifest.build_info.patch_operation_schema_hash, /^[0-9a-f]{64}$/);
```

Apply the same additions to the second test in the file (the `assert.deepEqual(second.build_info, first.build_info)` invariant at line 98 continues to hold for the augmented shape since both `first` and `second` are produced by the same `createBuildInfo` call form).

### 4. Schema-paired test symmetry — `tools/world-mcp/tests/server/dispatch.test.ts`

The describe_capabilities test at lines 948-1021 asserts existing field shapes at lines 969-971. Add the two new format assertions analogously:

```typescript
assert.match(structured.build_info?.validator_registry_hash ?? "", /^[0-9a-f]{64}$/);
assert.match(structured.build_info?.patch_operation_schema_hash ?? "", /^[0-9a-f]{64}$/);
```

### 5. Documentation extension at `docs/MACHINE-FACING-LAYER.md`

Insert a new sub-section after the existing `describe_capabilities` paragraph at line 83. Suggested header: `### Build-info fields`. Content:

```markdown
### Build-info fields

`describe_capabilities` returns a `build_info` object alongside the tool list.
Each field exposes a different currency surface:

- `git_commit_hash` — the git commit the server source was built from.
  `unknown` when the build environment lacks git context.
- `build_timestamp` — ISO-8601 timestamp of the build (server-start moment).
  Useful for "when was this binary made" inspection; not a fingerprint.
- `source_schema_hash` — SHA-256 over normalized tool capabilities (sorted
  `{name, description, input_schema_enums}` per tool). Changes when the tool
  surface itself changes (new tool added, enum value added, description
  rewritten). Does NOT change when validator or patch-operation internals
  change without affecting the tool surface.
- `validator_registry_hash` — SHA-256 over the concatenated source bytes of
  every file in `tools/validators/src/structural/` and
  `tools/validators/src/rules/`, sorted by path. Changes when ANY validator's
  source content changes, even when the validator's name is unchanged. The
  fingerprint a consumer checks to verify "does this running server have
  validator bundle X?"
- `patch_operation_schema_hash` — SHA-256 over the patch-operation schema
  manifest (op-kind → op-schema mapping, sorted by kind). Changes when an
  op-kind's payload schema changes (required-field addition or removal, type
  change, enum value change). Useful for catching schema drift in deployed
  servers where the tool surface name might be unchanged but the underlying
  contract has shifted.

Consumers verifying server currency should compare BOTH
`validator_registry_hash` AND `patch_operation_schema_hash` against locally
computed expectations — neither alone catches all drift.
`validator_registry_hash` catches validator-implementation drift;
`patch_operation_schema_hash` catches contract drift. The deployed smoke test
at `tools/world-mcp/tests/server/dispatch.test.ts` (per SPEC-37 D3) complements
these passive fingerprints by actively exercising validator code paths against
known-bad fixtures.
```

Also extend the existing line 93 prose to mention `validator_registry_hash` and `patch_operation_schema_hash` as the deterministic comparison surface (the existing prose says *"call `mcp__worldloom__describe_capabilities()` for enum/contract inspection when deployed server is stale"* — add a clause naming both new fingerprints).

### 6. Stale-diagnostic row revision at `docs/MACHINE-FACING-LAYER.md` line 113

The existing row at line 113 (the "A tool's pre-apply validators reject a patch plan with verdicts inconsistent with the just-rebuilt validators source" diagnostic) explicitly states *"`describe_capabilities()` cannot detect this because the validators bundle version is not part of the world-mcp tool or enum contract surface"* — this assertion becomes false once `validator_registry_hash` lands. Revise the row's "cannot detect" clause to read approximately: *"`describe_capabilities()` exposes `build_info.validator_registry_hash` (per SPEC-37 D4) as the deterministic fingerprint over validator source content — compare the runtime value against a locally computed hash to detect bundle staleness directly. The temporary CLI workaround below remains available when session restart is not immediately practical."* Retain the existing CLI workaround prose verbatim (the principled fix and CLI escape valve both still apply); only the "cannot detect" claim is invalidated.

## Files to Touch

- `tools/world-mcp/src/build-info.ts` (modify — extend interface + function)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify — two new tests)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify — schema-paired format assertions)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — schema-paired format assertions in the existing describe_capabilities test at line 948)
- `docs/MACHINE-FACING-LAYER.md` (modify — new `### Build-info fields` sub-section + line 93 prose extension + line 113 stale-diagnostic revision)

## Out of Scope

- New patch-engine ops, new MCP retrieval tools, new validators — this ticket is pure runtime-introspection extension on existing surfaces.
- Validator file relocations or directory restructuring — `validator_registry_hash` glob pattern matches the current `tools/validators/src/structural/*.ts` + `tools/validators/src/rules/*.ts` layout; if a future restructuring moves validators into sub-directories, the glob updates in a follow-up.
- CI deployment-pipeline fingerprint verification (a CI step that asserts the deployed `dist/` matches the source-tree hash) — that is a separate deployment-pipeline contract per the spec's §Out of Scope "Generated `dist/` freshness check" entry.
- Schema field additions to record schemas (CF, CH, STENT, etc.) — runtime build-info fields are not record-schema fields; this ticket honors the spec's anti-recommendation against schema expansion.

## Acceptance Criteria

### Tests That Must Pass

1. `BuildInfo` interface includes `validator_registry_hash` and `patch_operation_schema_hash` fields after the change; `cd tools/world-mcp && npm run build` exits 0 (TypeScript compiler proves consumer alignment).
2. The two new capability-parity tests pass; the locally computed hashes match the runtime-exposed hashes.
3. The two schema-paired format assertions added to `tools/world-mcp/tests/tools/describe-capabilities.test.ts` pass; all other existing assertions in that file remain green.
4. The two schema-paired format assertions added to `tools/world-mcp/tests/server/dispatch.test.ts` (in the existing describe_capabilities test) pass; all other existing dispatch tests remain green.
5. `cd tools/world-mcp && npm run build && npm test` exits 0.

### Invariants

1. `validator_registry_hash` covers FILE CONTENTS of all validator source files, not just file names — name-list hashing fails to catch predicate-body drift inside an unchanged-named validator.
2. `patch_operation_schema_hash` covers the per-kind payload schemas, not just the kind list — name-list hashing fails to catch required-field addition/removal inside an unchanged kind.
3. The existing `source_schema_hash` is preserved unchanged; all three fingerprints are orthogonal currency signals.
4. `docs/MACHINE-FACING-LAYER.md` line 113's "cannot detect" assertion is invalidated and revised in the same edit that lands the fingerprint — leaving the assertion stale would itself create the same documentation-gap the spec calls out.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/capability-parity.test.ts` — two new tests per §What to Change §2; covers both new fingerprint fields against locally computed hashes.
2. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — schema-paired format assertions added per §What to Change §3; keeps the file's `build_info` shape coverage in sync.
3. `tools/world-mcp/tests/server/dispatch.test.ts` — schema-paired format assertions added per §What to Change §4; keeps the describe_capabilities smoke test's `build_info` shape coverage in sync.

### Commands

1. `cd tools/world-mcp && npm run build && npm test` — full world-mcp package verification.
2. `grep -n "validator_registry_hash\|patch_operation_schema_hash" tools/world-mcp/src/build-info.ts tools/world-mcp/tests/` — verify both new fields land in source and all three test files.
3. `grep -n "validator_registry_hash\|patch_operation_schema_hash\|cannot detect" docs/MACHINE-FACING-LAYER.md` — verify docs prose mentions both new fingerprints and the line 113 "cannot detect" assertion is no longer present (or is contextualized away from the validator-bundle staleness diagnostic).
4. Hash-divergence manual sanity (post-implementation, optional): temporarily append a whitespace-only change to any file in `tools/validators/src/structural/`, rebuild both packages, observe `validator_registry_hash` changes between rebuilds; revert the whitespace change.
