# SPEC39TOOESMMIG-002: validators ESM convert

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` package.json `type` field flipped from `commonjs` to `module`; source/test files were updated for ESM-safe schema-path and AJV 2020 subpath interop.
**Deps**: `archive/tickets/SPEC39TOOESMMIG-004.md` (world-mcp must be ESM before its downstream build can compile against an ESM validators package)

## Problem

At intake, `tools/validators` was already authored for the modern Node16/Node16 module form (tsconfig uses `module: "Node16"` + `moduleResolution: "Node16"`; all relative imports already used the `.js` suffix discipline). The remaining gaps were (a) the `package.json` `"type": "commonjs"` declaration, and (b) 5 source files that used the CJS-only `__dirname` global for schema-path resolution — these files break under ESM because `__dirname` is undefined. The standard ESM replacement is `import.meta.dirname` (Node 22+ native; the package's `engines.node` already requires `>=22`).

The 5 source `__dirname` sites were scope expansion beyond SPEC-39's per-package deliverable table (which said "None" for validators source edits) but stayed within SPEC-39's overall intent (full ESM convert across `tools/`). The expansion is documented at item 5 of Assumption Reassessment below.

## Assumption Reassessment (2026-05-17)

1. **Codebase at intake**: `tools/validators/package.json` declared `"type": "commonjs"`. `tools/validators/tsconfig.json` already used `module: "Node16"` + `moduleResolution: "Node16"`. All relative imports in `tools/validators/src/**/*.ts` and `tools/validators/tests/**/*.ts` used the `.js` suffix discipline (verified: 0 extensionless relative imports). 5 source files used `__dirname`: `src/cli/_helpers.ts`, `src/structural/prose-receipt-schema-compliance.ts`, `src/structural/record-schema-compliance.ts`, `src/structural/proposal-package-shape.ts`, `src/_helpers/index-access.ts` (all for schema-path resolution: `path.resolve(__dirname, "../../../src/schemas/...")` or analogous shapes). `engines.node` is `>=22` so `import.meta.dirname` (Node 21.2+) is available.
2. **Spec/docs**: SPEC-39 §Deliverables row for `tools/validators` is *"None (already Node16/Node16) | Change `"type": "commonjs"` → `"type": "module"` | None (`.js` suffixes already used) | Already authored for ESM-shape; flip the package.json flag"*. This ticket implements that row PLUS the `__dirname` replacement work documented at item 5; the spec's stated "None" for source edits was incorrect against the actual codebase surface.
3. **Cross-artifact boundary**: `tools/validators`'s `dist/` is a file dependency consumed by `tools/world-mcp` (`file:../validators`). The corrected SPEC-39 queue must migrate world-mcp first: the same Node16 TypeScript rule that blocks CJS validators from importing an ESM patch-engine package would block CJS world-mcp from importing an ESM validators package. Once `archive/tickets/SPEC39TOOESMMIG-004.md` lands, the world-mcp downstream build in this ticket exercises ESM-to-ESM or ESM-to-CJS producer interop instead of CJS-to-ESM.
4. **FOUNDATIONS principle restatement**: `docs/FOUNDATIONS.md` §Machine-Facing Layer item 4 names the `tools/validators` framework as the "executable enforcement of Rules 1–7 plus structural invariants" and treats it as non-negotiable infrastructure for canon validation. Aligning its module system with the modern Node ESM trajectory preserves the §Machine-Facing Layer's coherence and lets the validator framework participate in the unified ESM surface that SPEC-39 establishes across all five tools/ packages.
5. **Mismatch + correction**: SPEC-39 §Deliverables row claimed validators required no source edits ("None (`.js` suffixes already used)"). Codebase grep at decomposition time revealed 5 `__dirname` sites that break under ESM (the global is undefined in ESM modules). The corrected scope is documented in this ticket's What to Change section 2. The replacement uses `import.meta.dirname` (Node 22+ native), which is functionally equivalent to `__dirname` for the schema-path-resolution pattern these sites implement. This expansion does not change SPEC-39's intent; it sizes the ticket against the actual implementation surface the codebase requires.
6. **Dependency correction**: The draft ticket claimed `Deps: None`, but downstream `tools/world-mcp` is a TypeScript Node16 consumer of validators. To keep the downstream consumer build acceptance criterion truthful, `archive/tickets/SPEC39TOOESMMIG-004.md` must land first.
7. **Proof-boundary correction**: A pre-edit baseline run of `npm run clean && npm run build && npm test` from `tools/validators` built successfully but the concurrent wrapper test lane failed 3 wrapper files (`dist/tests/cli/world-validate.story-bundle.test.js`, `dist/tests/cli/world-validate.test.js`, `dist/tests/integration/spec34-integration.test.js`). Those same compiled files passed when run directly together. The acceptance surface is therefore corrected to build plus focused compiled schema-path/CLI smoke proof rather than claiming the pre-existing concurrent wrapper is green.
8. **Same-seam ESM fallout**: The package flip exposed TypeScript Node16 fallout in AJV 2020 subpath imports (`ajv/dist/2020` needed the runtime `.js` subpath and a typed constructor projection for the CJS module shape) plus one test-only `__dirname` helper in `tests/integration/spec09-verification.test.ts`. These are same-seam ESM compatibility repairs required for validators to compile and prove the existing schema paths under `"type": "module"`; they do not change validator behavior, rule logic, schemas, or public exports.

## Architecture Check

1. Flipping the `package.json` `type` field plus replacing `__dirname` with `import.meta.dirname` is the minimum-change realization of SPEC-39's "validators ESM convert" deliverable. The package's TypeScript source is already authored to ESM conventions for imports (`.js` suffixes); only the CJS-only path-resolution globals need the equivalent ESM construct.
2. No backwards-compatibility shims introduced. `import.meta.dirname` is Node 22+ native and matches the package's `engines.node: >=22` declaration. The schema-path-resolution semantics are byte-identical to the prior `__dirname`-based pattern; tests against existing fixtures will catch any path-resolution regression.

## Verification Layers

1. **Build produces no deprecation warnings or interop errors** → codebase grep-proof: `npm --prefix tools/validators run build 2>&1 | grep -E "deprecat|TS1479|TS5107"` returns empty.
2. **Affected CLI/schema-path tests pass under the new module emission + path-resolution shape** → command-execution proof: from `tools/validators`, a direct compiled test lane covering index access, CLI JSON/version flows, SPEC-09 schema compilation, SPEC-34 CLI integration, AJV corpus conformance, predicate DSL schema parity, and modified structural schema validators exits 0 after the build.
3. **Downstream consumer build still passes** → command-execution proof: `npm --prefix tools/world-mcp run build` succeeds against the post-flip validators `dist/`.
4. **No residual `__dirname` usage in validators source** → codebase grep-proof: `grep -rE "__dirname|__filename" tools/validators/src` returns empty after the changes.

## Landed Changes

### 1. `tools/validators/package.json`: flip `type` field

Changed the `"type"` field from `"commonjs"` to `"module"`. No other package manifest field changed.

### 2. Replace `__dirname` with `import.meta.dirname` in 5 source files

Replaced `__dirname` usage with `import.meta.dirname` (Node 22+ native) in:

- `tools/validators/src/cli/_helpers.ts`
- `tools/validators/src/structural/prose-receipt-schema-compliance.ts`
- `tools/validators/src/structural/record-schema-compliance.ts`
- `tools/validators/src/structural/proposal-package-shape.ts`
- `tools/validators/src/_helpers/index-access.ts`

The same ESM-safe replacement was also required in `tools/validators/tests/integration/spec09-verification.test.ts` for package-root resolution. No surrounding logic changed; the resolved path semantics are equivalent because `import.meta.dirname` returns the module directory path that `__dirname` returned under CJS.

### 3. Normalize AJV 2020 subpath imports for Node16 ESM

Updated AJV 2020 imports in source and tests from `ajv/dist/2020` to `ajv/dist/2020.js`, with a narrow local constructor projection that reflects the CJS runtime module shape under ESM. This repaired TypeScript Node16 build fallout without changing schema contents or validator logic.

### 4. Rebuild and re-verify

Ran the validators clean/build and focused compiled proof lanes listed in `## Verification Result`. The standard `npm test` wrapper remains a diagnostic broad lane, but it had a pre-existing concurrent baseline failure before this ticket's edits.

### 5. Downstream consumer smoke

Rebuilt `tools/world-mcp` against the new validators `dist/` (`npm run build` from `tools/world-mcp`) to confirm the ESM emission doesn't break the file-dependency import chain.

## Files to Touch

- `tools/validators/package.json` (modify — flip `"type": "commonjs"` to `"type": "module"`)
- `tools/validators/src/cli/_helpers.ts` (modify — `__dirname` → `import.meta.dirname`)
- `tools/validators/src/structural/prose-receipt-schema-compliance.ts` (modify — same)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify — same)
- `tools/validators/src/structural/proposal-package-shape.ts` (modify — same)
- `tools/validators/src/_helpers/index-access.ts` (modify — same)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify — AJV 2020 subpath interop and `__dirname` replacement)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify — AJV 2020 subpath interop)
- `tools/validators/tests/schemas/corpus-conformance.test.ts` (modify — AJV 2020 subpath interop)
- `specs/SPEC-39-tools-esm-migration.md` (modify — dated implementation note for the validators row)

## Out of Scope

- Upgrading `typescript` past 5.9.3 in validators (dependabot bump handled separately).
- Changing any validator's rule logic, predicate, threshold, or output shape. This ticket changes ONLY the module-system declaration and the `__dirname` ESM-compatibility shim.
- Modifying other tools/ packages in the same PR. Per SPEC-39's per-package self-contained migration model, each package lands independently.
- Adding new validators or removing existing ones. The validator registry remains identical.
- Switching from `import.meta.dirname` to the older `import.meta.url` + `fileURLToPath(import.meta.url)` shim. `import.meta.dirname` is Node 22+ native and matches the package's `engines.node: >=22`; the older pattern is unnecessary for this codebase.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run clean && npm --prefix tools/validators run build` exits 0 with no TypeScript deprecation warnings (no TS5107) and no ESM/CJS interop errors (no TS1479).
2. From `tools/validators`, the focused compiled proof command listed in `## Verification Result` exits 0 after the build, including tests that exercise validators whose schema-path resolution flows through the modified files.
3. `grep -rE "__dirname|__filename" tools/validators/src` returns empty (no residual CJS-only globals).
4. `npm --prefix tools/world-mcp run build` (against the post-flip validators `dist/`) succeeds without `require is not defined` / `Cannot use import statement outside a module` / missing-default-export errors.

### Invariants

1. No runtime behavior change: validator outputs (verdicts, error messages, schema-validation results) byte-identical pre/post-migration on identical inputs.
2. No public API change: the package's `exports` field, validator registry, and consumed-by-others surface remain unchanged.
3. `package.json` `"type"` field is `"module"` after the change.
4. All 5 modified source files compile under `module: "Node16"` + `"type": "module"` and resolve schema paths to the same absolute paths as the pre-migration `__dirname`-based form.

## Test Plan

### New/Modified Tests

1. `None — no new tests added; existing compiled CLI, schema, and structural validator tests were updated only where their imports/path helpers needed ESM compatibility.`

### Commands

1. From `tools/validators`: `npm run clean && npm run build` (targeted package build)
2. From `tools/validators`: `node --test dist/tests/_helpers/index-access.test.js dist/tests/cli/world-validate.story-bundle.test.js dist/tests/cli/world-validate.test.js dist/tests/integration/spec09-verification.test.js dist/tests/integration/spec34-integration.test.js dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/schemas/corpus-conformance.test.js dist/tests/structural/proposal-package-shape.test.js dist/tests/structural/prose-receipt-schema-compliance.test.js dist/tests/structural/record-schema-compliance.test.js` (focused compiled proof over changed ESM path/AJV/CLI surfaces)
3. `rg -n "__dirname|__filename" tools/validators/src` (must return empty — no residual CJS-only globals in source)
4. From `tools/world-mcp`: `npm run build` (downstream consumer integration smoke)

## Outcome

Completed on 2026-05-17. `tools/validators` now declares `"type": "module"`, source schema-path lookups use `import.meta.dirname`, and the AJV 2020 schema compiler imports used by validators/tests resolve under TypeScript Node16 ESM. The package's exports, validator registry, schemas, and rule logic were not changed.

## Verification Result

1. `npm run clean && npm run build` from `tools/validators` — passed; TypeScript emitted under `"type": "module"` with no TS5107 or TS1479 errors.
2. `rg -n "__dirname|__filename" tools/validators/src` from repo root — no matches.
3. `rg -n "from ['\"]\\.\\.?/[^.'\"]*['\"]|export .* from ['\"]\\.\\.?/[^.'\"]*['\"]|import\\(['\"]\\.\\.?/[^.'\"]*['\"]\\)" tools/validators/src tools/validators/tests` from repo root — no matches.
4. `node --test dist/tests/_helpers/index-access.test.js dist/tests/cli/world-validate.story-bundle.test.js dist/tests/cli/world-validate.test.js dist/tests/integration/spec09-verification.test.js dist/tests/integration/spec34-integration.test.js dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/schemas/corpus-conformance.test.js dist/tests/structural/proposal-package-shape.test.js dist/tests/structural/prose-receipt-schema-compliance.test.js dist/tests/structural/record-schema-compliance.test.js` from `tools/validators` — passed, 75/75 focused subtests.
5. `npm run build` from `tools/world-mcp` — passed against the symlinked post-flip validators package.

## Deviations

- SPEC-39's validators row said source edits were unnecessary. Live ESM build proof showed AJV 2020 subpath imports and one test helper path lookup also had to move with the validators package flip; these are same-seam ESM compatibility repairs.
- The standard `npm test` wrapper in `tools/validators` is not claimed green. A pre-edit baseline and post-edit rerun both failed the same three compiled wrapper files when Node launched the file set concurrently, while the focused CLI/schema-path proof covering those files directly passed. This ticket records the wrapper behavior as a pre-existing concurrency-sensitive broad-lane issue, not validators ESM fallout.
