# SPEC39TOOESMMIG-002: validators ESM convert

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` package.json `type` field flips from `commonjs` to `module`; 5 source files updated to replace `__dirname` (unavailable in ESM) with `import.meta.dirname` (Node 22+ native).
**Deps**: `tickets/SPEC39TOOESMMIG-004.md` (world-mcp must be ESM before its downstream build can compile against an ESM validators package)

## Problem

`tools/validators` is already authored for the modern Node16/Node16 module form (tsconfig uses `module: "Node16"` + `moduleResolution: "Node16"`; all relative imports already use the `.js` suffix discipline). The remaining gaps are (a) the `package.json` `"type": "commonjs"` declaration, and (b) 5 source files that use the CJS-only `__dirname` global for schema-path resolution — these files break under ESM because `__dirname` is undefined. The standard ESM replacement is `import.meta.dirname` (Node 22+ native; the package's `engines.node` already requires `>=22`).

The 5 `__dirname` sites are scope expansion beyond SPEC-39's per-package deliverable table (which said "None" for validators source edits) but stay within SPEC-39's overall intent (full ESM convert across `tools/`). The expansion is documented at item 5 of Assumption Reassessment below.

## Assumption Reassessment (2026-05-17)

1. **Codebase**: `tools/validators/package.json` currently declares `"type": "commonjs"`. `tools/validators/tsconfig.json` already uses `module: "Node16"` + `moduleResolution: "Node16"`. All relative imports in `tools/validators/src/**/*.ts` and `tools/validators/tests/**/*.ts` use the `.js` suffix discipline (verified: 0 extensionless relative imports). 5 source files use `__dirname`: `src/cli/_helpers.ts`, `src/structural/prose-receipt-schema-compliance.ts`, `src/structural/record-schema-compliance.ts`, `src/structural/proposal-package-shape.ts`, `src/_helpers/index-access.ts` (all for schema-path resolution: `path.resolve(__dirname, "../../../src/schemas/...")` or analogous shapes). `engines.node` is `>=22` so `import.meta.dirname` (Node 21.2+) is available.
2. **Spec/docs**: SPEC-39 §Deliverables row for `tools/validators` is *"None (already Node16/Node16) | Change `"type": "commonjs"` → `"type": "module"` | None (`.js` suffixes already used) | Already authored for ESM-shape; flip the package.json flag"*. This ticket implements that row PLUS the `__dirname` replacement work documented at item 5; the spec's stated "None" for source edits was incorrect against the actual codebase surface.
3. **Cross-artifact boundary**: `tools/validators`'s `dist/` is a file dependency consumed by `tools/world-mcp` (`file:../validators`). The corrected SPEC-39 queue must migrate world-mcp first: the same Node16 TypeScript rule that blocks CJS validators from importing an ESM patch-engine package would block CJS world-mcp from importing an ESM validators package. Once `tickets/SPEC39TOOESMMIG-004.md` lands, the world-mcp downstream build in this ticket exercises ESM-to-ESM or ESM-to-CJS producer interop instead of CJS-to-ESM.
4. **FOUNDATIONS principle restatement**: `docs/FOUNDATIONS.md` §Machine-Facing Layer item 4 names the `tools/validators` framework as the "executable enforcement of Rules 1–7 plus structural invariants" and treats it as non-negotiable infrastructure for canon validation. Aligning its module system with the modern Node ESM trajectory preserves the §Machine-Facing Layer's coherence and lets the validator framework participate in the unified ESM surface that SPEC-39 establishes across all five tools/ packages.
5. **Mismatch + correction**: SPEC-39 §Deliverables row claimed validators required no source edits ("None (`.js` suffixes already used)"). Codebase grep at decomposition time revealed 5 `__dirname` sites that break under ESM (the global is undefined in ESM modules). The corrected scope is documented in this ticket's What to Change section 2. The replacement uses `import.meta.dirname` (Node 22+ native), which is functionally equivalent to `__dirname` for the schema-path-resolution pattern these sites implement. This expansion does not change SPEC-39's intent; it sizes the ticket against the actual implementation surface the codebase requires.
6. **Dependency correction**: The draft ticket claimed `Deps: None`, but downstream `tools/world-mcp` is a TypeScript Node16 consumer of validators. To keep the downstream consumer build acceptance criterion truthful, `tickets/SPEC39TOOESMMIG-004.md` must land first.

## Architecture Check

1. Flipping the `package.json` `type` field plus replacing `__dirname` with `import.meta.dirname` is the minimum-change realization of SPEC-39's "validators ESM convert" deliverable. The package's TypeScript source is already authored to ESM conventions for imports (`.js` suffixes); only the CJS-only path-resolution globals need the equivalent ESM construct.
2. No backwards-compatibility shims introduced. `import.meta.dirname` is Node 22+ native and matches the package's `engines.node: >=22` declaration. The schema-path-resolution semantics are byte-identical to the prior `__dirname`-based pattern; tests against existing fixtures will catch any path-resolution regression.

## Verification Layers

1. **Build produces no deprecation warnings or interop errors** → codebase grep-proof: `npm --prefix tools/validators run build 2>&1 | grep -E "deprecat|TS1479|TS5107"` returns empty.
2. **All existing tests pass under the new module emission + path-resolution shape** → command-execution proof: `npm --prefix tools/validators test` exits 0 with all tests passing, including any tests that exercise schema-path resolution via the modified files.
3. **Downstream consumer build still passes** → command-execution proof: `npm --prefix tools/world-mcp run build` succeeds against the post-flip validators `dist/`.
4. **No residual `__dirname` usage in validators source** → codebase grep-proof: `grep -rE "__dirname|__filename" tools/validators/src` returns empty after the changes.

## What to Change

### 1. `tools/validators/package.json`: flip `type` field

Change the `"type"` field from `"commonjs"` to `"module"`. No other fields change.

### 2. Replace `__dirname` with `import.meta.dirname` in 5 source files

In each of the following files, replace `__dirname` usage with `import.meta.dirname` (Node 22+ native; no import statement needed). The pattern is local to each file:

- `tools/validators/src/cli/_helpers.ts`
- `tools/validators/src/structural/prose-receipt-schema-compliance.ts`
- `tools/validators/src/structural/record-schema-compliance.ts`
- `tools/validators/src/structural/proposal-package-shape.ts`
- `tools/validators/src/_helpers/index-access.ts`

For each file: locate the `__dirname` reference (typically inside a `path.resolve(__dirname, ...)` or `path.join(__dirname, ...)` call), replace `__dirname` with `import.meta.dirname`. No surrounding logic changes; the resolved path semantics are byte-identical because `import.meta.dirname` returns the same directory-path string `__dirname` returned under CJS.

### 3. Rebuild and re-verify

Run `npm --prefix tools/validators run clean && npm --prefix tools/validators run build` to regenerate `dist/`. Then `npm --prefix tools/validators test` to confirm all tests pass (especially any tests exercising schema-validation paths through the modified files).

### 4. Downstream consumer smoke

Rebuild `tools/world-mcp` against the new validators `dist/` (`npm --prefix tools/world-mcp run build`) to confirm the ESM emission doesn't break the file-dependency import chain.

## Files to Touch

- `tools/validators/package.json` (modify — flip `"type": "commonjs"` to `"type": "module"`)
- `tools/validators/src/cli/_helpers.ts` (modify — `__dirname` → `import.meta.dirname`)
- `tools/validators/src/structural/prose-receipt-schema-compliance.ts` (modify — same)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify — same)
- `tools/validators/src/structural/proposal-package-shape.ts` (modify — same)
- `tools/validators/src/_helpers/index-access.ts` (modify — same)

## Out of Scope

- Upgrading `typescript` past 5.9.3 in validators (dependabot bump handled separately).
- Changing any validator's rule logic, predicate, threshold, or output shape. This ticket changes ONLY the module-system declaration and the `__dirname` ESM-compatibility shim.
- Modifying other tools/ packages in the same PR. Per SPEC-39's per-package self-contained migration model, each package lands independently.
- Adding new validators or removing existing ones. The validator registry remains identical.
- Switching from `import.meta.dirname` to the older `import.meta.url` + `fileURLToPath(import.meta.url)` shim. `import.meta.dirname` is Node 22+ native and matches the package's `engines.node: >=22`; the older pattern is unnecessary for this codebase.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run clean && npm --prefix tools/validators run build` exits 0 with no TypeScript deprecation warnings (no TS5107) and no ESM/CJS interop errors (no TS1479).
2. `npm --prefix tools/validators test` exits 0 with all existing tests passing, including any tests that exercise validators whose schema-path resolution flows through the 5 modified files.
3. `grep -rE "__dirname|__filename" tools/validators/src` returns empty (no residual CJS-only globals).
4. `npm --prefix tools/world-mcp run build` (against the post-flip validators `dist/`) succeeds without `require is not defined` / `Cannot use import statement outside a module` / missing-default-export errors.

### Invariants

1. No runtime behavior change: validator outputs (verdicts, error messages, schema-validation results) byte-identical pre/post-migration on identical inputs.
2. No public API change: the package's `exports` field, validator registry, and consumed-by-others surface remain unchanged.
3. `package.json` `"type"` field is `"module"` after the change.
4. All 5 modified source files compile under `module: "Node16"` + `"type": "module"` and resolve schema paths to the same absolute paths as the pre-migration `__dirname`-based form.

## Test Plan

### New/Modified Tests

1. `None — config-and-shim ticket; verification is command-based against the existing validators test suite, which already exercises every schema-validation path through the 5 modified files.`

### Commands

1. `npm --prefix tools/validators run clean && npm --prefix tools/validators run build && npm --prefix tools/validators test` (targeted package verification)
2. `grep -rE "__dirname|__filename" tools/validators/src` (must return empty — no residual CJS-only globals)
3. `npm --prefix tools/world-mcp run build` (downstream consumer integration smoke)
