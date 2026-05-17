# SPEC39TOOESMMIG-001: patch-engine ESM convert

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine` package.json `type` field flips from `commonjs` to `module`; no source code changes.
**Deps**: `archive/tickets/SPEC39TOOESMMIG-004.md`, `archive/tickets/SPEC39TOOESMMIG-002.md` (downstream TypeScript consumers must be ESM before they can compile against an ESM patch-engine package)

## Problem

At intake, `tools/patch-engine` was already authored for the modern Node16/Node16 module form (tsconfig uses `module: "Node16"` + `moduleResolution: "Node16"`; all relative imports already use the `.js` suffix discipline). The only remaining patch-engine-local gap was the `package.json` `"type": "commonjs"` declaration, which told Node to emit and load the compiled JavaScript as CommonJS. Flipping it to `"type": "module"` aligns patch-engine with the SPEC-39 end-state (all five `tools/` packages on ESM), and this ticket landed only after the TypeScript consumers that blocked the earlier attempt had moved to ESM.

Patch-engine was the cleanest SPEC-39 producer-package slice after the consumer prerequisites landed because it had zero `__dirname`/`__filename` usage (verified via grep across `src/`) and zero extensionless relative imports — the entire migration surface was a single `package.json` flip plus a clean rebuild.

## Assumption Reassessment (2026-05-17)

1. **Codebase at intake**: `tools/patch-engine/package.json` declared `"type": "commonjs"` and `tools/patch-engine/tsconfig.json` already used `module: "Node16"` + `moduleResolution: "Node16"`. All relative imports in `tools/patch-engine/src/**/*.ts` and `tools/patch-engine/tests/**/*.ts` used the `.js` suffix discipline (verified: 0 extensionless relative imports). No `__dirname` / `__filename` / `require(` usage existed in `src/` (verified via grep). The migration surface was genuinely a single field change.
2. **Spec/docs**: SPEC-39 §Deliverables row for `tools/patch-engine` is *"None (already Node16/Node16) | Change `"type": "commonjs"` → `"type": "module"` | None (`.js` suffixes already used) | Already authored for ESM-shape; flip the package.json flag"*. This ticket implements that row exactly; SPEC-39's intent is preserved.
3. **Cross-artifact boundary**: `tools/patch-engine`'s `dist/` is a file dependency consumed by `tools/validators` (`file:../patch-engine`) and `tools/world-mcp` (`file:../patch-engine`). A 2026-05-17 live proof attempt showed the original "independent" claim was false: after a temporary local flip of patch-engine to `"type": "module"`, `npm run build` in `tools/validators` failed with TS1541/TS1479 because validators was still a CommonJS package importing an ESM package. The corrected dependency chain is `world-mcp` first (`archive/tickets/SPEC39TOOESMMIG-004.md`), then validators (`archive/tickets/SPEC39TOOESMMIG-002.md`), then patch-engine. This ticket remains the same single-field patch-engine migration once those consumers have moved.
4. **FOUNDATIONS principle restatement**: `docs/FOUNDATIONS.md` §Machine-Facing Layer item 3 names `tools/patch-engine/` as the "deterministic world-edit applier with typed operations, anchor-hash anchoring, append-only vocabulary, and engine-controlled write ordering" and treats it as non-negotiable infrastructure for canon-mutation. Aligning its module system with the modern Node ESM trajectory preserves the §Machine-Facing Layer's coherence — keeping all five tools/ packages on the same module shape rather than maintaining a CJS/ESM split.
5. **Mismatch + correction**: The draft ticket claimed `Deps: None` and treated CJS consumers importing an ESM patch-engine package as safe. TypeScript's Node16 compile gate rejects that shape before runtime interop can matter. The ticket was therefore retargeted to wait on `archive/tickets/SPEC39TOOESMMIG-004.md` and `archive/tickets/SPEC39TOOESMMIG-002.md`; this run landed the patch-engine manifest flip only after those archived prerequisites were present.
6. **Proof boundary**: The consumer package dependency view is symlinked to the live producer (`tools/validators/node_modules/@worldloom/patch-engine` and `tools/world-mcp/node_modules/@worldloom/patch-engine` both point to `../../../patch-engine`), so producer build plus consumer builds exercise the post-flip patch-engine package without a reinstall.

## Architecture Check

1. Flipping a single `package.json` field is the minimum-change realization of SPEC-39's "patch-engine ESM convert" deliverable. The package's TypeScript source is already authored to ESM conventions (`.js` suffixes; modern import syntax); the runtime emission target is the only inconsistency, and `"type": "module"` resolves it.
2. No backwards-compatibility shims introduced. The package's public `exports` field remains unchanged; downstream consumers continue to `import { ... } from "@worldloom/patch-engine"` without source edits.

## Verification Layers

1. **Build produces no deprecation warnings or interop errors** → command-execution proof: `npm --prefix tools/patch-engine run build` exits 0 with no visible TS5107 or TS1479 diagnostics.
2. **All existing tests pass under the new module emission** → command-execution proof: `npm --prefix tools/patch-engine test` and `npm --prefix tools/patch-engine run test:compile-reject` and `npm --prefix tools/patch-engine run test:integration` all exit 0.
3. **Downstream consumer builds still pass** → command-execution proof: `npm --prefix tools/validators run build` and `npm --prefix tools/world-mcp run build` both succeed against the new patch-engine `dist/` (no `require(esm)` failures, no missing-default-export errors).

## Landed Changes

### 1. `tools/patch-engine/package.json`: flip `type` field

Changed the `"type"` field from `"commonjs"` to `"module"`. No other field in `package.json` changed.

### 2. Rebuild and re-verify

Ran the patch-engine clean/build/test lanes listed in `## Verification Result` to regenerate `dist/` under the new emission target and confirm the existing runtime, integration, and compile-rejection tests still pass.

### 3. Downstream consumer smoke

Rebuilt `tools/validators` and `tools/world-mcp` against the new patch-engine `dist/` to confirm the ESM emission does not break the symlinked file-dependency import chain.

## Files to Touch

- `tools/patch-engine/package.json` (modify — flip `"type": "commonjs"` to `"type": "module"`)
- `specs/SPEC-39-tools-esm-migration.md` (modify — dated implementation note for the patch-engine row)

## Out of Scope

- Upgrading `typescript` past 5.9.3 in patch-engine (dependabot will eventually bump it; the spec covers the Node16/Node16 + `ignoreDeprecations` migration only).
- Adding any source-level changes (`.ts` files). Patch-engine's `.js`-suffix discipline and absence of `__dirname` usage means source files do not require edits.
- Changing the patch-engine public `exports` field, op-kind vocabulary, schema, or any runtime behavior. This ticket changes ONLY the module-system declaration.
- Modifying other tools/ packages in the same PR. Per the corrected dependency model, this ticket lands after the consumer-package tickets but still changes only `tools/patch-engine`.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/patch-engine run clean && npm --prefix tools/patch-engine run build` exits 0 with no TypeScript deprecation warnings (no TS5107) and no ESM/CJS interop errors (no TS1479).
2. `npm --prefix tools/patch-engine test`, `npm --prefix tools/patch-engine run test:compile-reject`, and `npm --prefix tools/patch-engine run test:integration` all exit 0 with all existing tests passing.
3. `npm --prefix tools/validators run build` and `npm --prefix tools/world-mcp run build` (against the post-flip patch-engine `dist/`) both succeed without `require is not defined` / `Cannot use import statement outside a module` / missing-default-export errors.

### Invariants

1. No runtime behavior change: existing op handlers (`create_cf_record`, `update_record_field`, `append_extension`, etc.) produce byte-identical outputs on identical inputs.
2. No public API change: the package's `exports` field, op-kind vocabulary, and consumed-by-others surface remain unchanged.
3. `package.json` `"type"` field is `"module"` after the change; no other field is modified.

## Test Plan

### New/Modified Tests

1. `None — config-only ticket; verification is command-based against the existing patch-engine test suite (test, test:compile-reject, test:integration) and downstream consumer rebuilds.`

### Commands

1. `npm --prefix tools/patch-engine run clean && npm --prefix tools/patch-engine run build && npm --prefix tools/patch-engine test` (targeted package verification)
2. `npm --prefix tools/patch-engine run test:compile-reject && npm --prefix tools/patch-engine run test:integration` (extended patch-engine test surfaces)
3. `npm --prefix tools/validators run build && npm --prefix tools/world-mcp run build` (downstream consumer integration smoke)

## Outcome

Completed on 2026-05-17. `tools/patch-engine` now declares `"type": "module"` and emits/loads compiled JavaScript as ESM under the existing Node16 TypeScript configuration. No source files, public exports, operation kinds, schemas, or runtime behavior changed.

The SPEC-39 implementation notes were updated to record the landed patch-engine slice. The remaining SPEC-39 tickets stay queued for `tools/hooks` and `tools/world-index`.

## Verification Result

Pre-edit baseline:

1. `npm run clean` from `tools/patch-engine` — passed; removed ignored stale `dist/`.
2. `npm run build` from `tools/patch-engine` before the manifest flip — passed.
3. `npm test` from `tools/patch-engine` before the manifest flip — passed, 76/76 tests.

Post-edit proof:

1. `npm run clean` from `tools/patch-engine` — passed.
2. `npm run build` from `tools/patch-engine` — passed with no TS5107 or TS1479 diagnostics.
3. `npm test` from `tools/patch-engine` — passed, 76/76 tests.
4. `npm run test:compile-reject` from `tools/patch-engine` — passed by producing the expected TypeScript rejection diagnostics for forbidden operation variants.
5. `npm run test:integration` from `tools/patch-engine` — passed, 2/2 integration tests.
6. `rg -n "__dirname|__filename|require\\(" tools/patch-engine/src` — no matches.
7. `rg --pcre2 -n "(?:from|export\\s+.*from) ['\\\"]\\.\\.?/(?![^'\\\"]*\\.js['\\\"])[^'\\\"]+['\\\"]|import\\(['\\\"]\\.\\.?/(?![^'\\\"]*\\.js['\\\"])[^'\\\"]+['\\\"]\\)" tools/patch-engine/src tools/patch-engine/tests` — no matches.
8. `npm run build` from `tools/validators` — passed against the symlinked post-flip patch-engine package.
9. `npm run build` from `tools/world-mcp` — passed against the symlinked post-flip patch-engine package.

## Deviations

- None. The ticket remained a single-field package manifest flip plus proof and spec closeout truthing.
- The initial extensionless-import grep was rerun with `--pcre2` because the first diagnostic form used look-ahead syntax that default `rg` does not support. The final accepted grep is the PCRE2 command recorded above.
