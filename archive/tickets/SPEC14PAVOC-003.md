# SPEC14PAVOC-003: Canonical-Vocabulary MCP Tool & Shared-Enum-Module Refactor

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new MCP tool `mcp__worldloom__get_canonical_vocabulary` in `tools/world-mcp/`; new shared module exporting canonical enums; `tools/validators/` refactored to import from shared module
**Deps**: SPEC-14

## Problem

At intake, the validator's canonical vocabularies (`CANONICAL_DOMAINS` in `tools/validators/src/rules/_shared/domain-enum.ts`; `VALID_FUTURE_RESOLUTION_SAFETY` and `VALID_STATUSES` hardcoded in `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts`) lived inside the validator package with no skill-facing API. Skills emitted candidate values without runtime access to the canonical lists; vocabulary drift was caught only at write-time via validator post-write fail. Per SPEC-14 §Approach workstream 5, skills must be able to query canonical vocabularies during reasoning.

This ticket lands the foundational shared module that `SPEC14PAVOC-001` (validator) and the SPEC-06 skill rewrites both consume. It must precede `SPEC14PAVOC-001`.

## Assumption Reassessment (2026-04-25)

1. At intake, `tools/validators/src/rules/_shared/domain-enum.ts:1-22` exported `CANONICAL_DOMAINS` as a `readonly string[]` with 22 entries; consumed by `tools/validators/src/rules/rule2-no-pure-cosmetics.ts:3` via `isCanonicalDomain`. It now lives in `tools/world-index/src/public/canonical-vocabularies.ts`; the validator imports from the package public subpath. Follow-up review found `technology` was also missing despite FOUNDATIONS naming it as an ontology category and part of the mandatory Magic or Tech Systems concern, so the shared export now includes 23 entries.
2. `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts:6-7` still hardcodes its current status and resolution-safety sets. Reassessment correction: the shared module exposes the SPEC-14 / schema-aligned mystery vocabularies for MCP and future consumers, but this ticket does not switch Rule 7 to the new status-coupled resolution-safety logic because that semantic change belongs to `SPEC14PAVOC-001`.
3. `tools/world-mcp/src/server.ts` registers MCP tools through `registerWrappedTool` and `MCP_TOOL_NAMES` / `MCP_TOOL_ORDER` in `tools/world-mcp/src/tool-names.ts`. The new `get_canonical_vocabulary` tool follows the same registration shape; no server-side framework changes.
4. The verdict enum `["ACCEPT", "ACCEPT_WITH_REQUIRED_UPDATES", "ACCEPT_AS_LOCAL_EXCEPTION", "ACCEPT_AS_CONTESTED_BELIEF", "REVISE_AND_RESUBMIT", "REJECT"]` lives only in `tools/validators/src/schemas/adjudication-discovery.schema.json`. This ticket extracts it into the shared module so the engine (`SPEC14PAVOC-002`) can also import it for type-safe verdict constraints.
5. Cross-package boundary preference per archived SPEC-03 §Record-type TypeScript interfaces: shared types colocated under `tools/world-index/src/public/` to avoid creating a new package. This ticket follows that precedent — the shared canonical-vocabulary module lives at `tools/world-index/src/public/canonical-vocabularies.ts` and is exported as `@worldloom/world-index/public/canonical-vocabularies` (not a new top-level `tools/_shared/` package).
6. Schema extension is additive-only: existing `domains_affected` validation against `CANONICAL_DOMAINS` is unchanged in semantics except that `technology` is now accepted as a FOUNDATIONS-aligned domain. The `geography` addition (per SPEC-14) remains in `SPEC14PAVOC-001`.
7. No skill / hook / spec rename in this ticket. Pipeline-wide grep for live `domain-enum` import paths now returns no active source imports; the old validator-local module was deleted.
8. Draft mismatch corrected: there is no `tools/world-index/src/public/index.ts` or `@worldloom/world-index/public` export in the live package. The truthful public surface is a package export added to `tools/world-index/package.json` for `./public/canonical-vocabularies`.
9. Same-package user-facing surface checked: `tools/world-mcp/README.md` had a 12-tool inventory and now lists the 13-tool inventory including `mcp__worldloom__get_canonical_vocabulary`.

## Architecture Check

1. Single-source-of-truth principle: validator and MCP tool both reading from `@worldloom/world-index/public/canonical-vocabularies` eliminates the validator-as-private-source pattern. Verdict enum, mystery status enum, mystery resolution-safety enum, and the domain helper live in one public module with package-level import coverage.
2. No backwards-compatibility shim. The relocated module is a hard move; the import in `rule2-no-pure-cosmetics.ts` updates in the same change. No re-export from the old path.

## Verification Layers

1. Single-source-of-truth invariant — validator and MCP return identical lists → integration test in `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` asserts `get_canonical_vocabulary({class: "domain"})` returns `CANONICAL_DOMAINS` exactly (length + contents).
2. MCP tool registration → `tools/world-mcp/tests/server/list-tools.test.ts`, `tools/world-mcp/tests/server/dispatch.test.ts`, and the compiled `getRegisteredToolNames()` probe assert the tool is in the registered tool list.
3. Mystery resolution-safety coupling exposed as data → schema-level unit test asserts `get_canonical_vocabulary({class: "mystery_resolution_safety"})` returns `{ canonical_values: ["none", "low", "medium", "high"], coupling: { field: "status", rule: "..." } }`.

## What to Change

### 1. Create shared canonical-vocabularies module

New file `tools/world-index/src/public/canonical-vocabularies.ts`:

```typescript
export const CANONICAL_DOMAINS: readonly string[] = [
  "labor", "embodiment", "social_norms", "architecture", "mobility",
  "law", "trade", "war", "kinship", "religion", "language",
  "status_signaling", "ecology", "daily_routine", "economy",
  "settlement_life", "memory_and_myth", "magic", "technology", "medicine",
  "status_order", "warfare", "taboo_and_pollution"
];
// (technology was added by follow-up correction; geography is added in SPEC14PAVOC-001)

export const VERDICT_ENUM: readonly string[] = [
  "ACCEPT",
  "ACCEPT_WITH_REQUIRED_UPDATES",
  "ACCEPT_AS_LOCAL_EXCEPTION",
  "ACCEPT_AS_CONTESTED_BELIEF",
  "REVISE_AND_RESUBMIT",
  "REJECT"
];

export const MYSTERY_STATUS_ENUM: readonly string[] = [
  "active", "passive", "passive_depth", "forbidden"
];

export const MYSTERY_RESOLUTION_SAFETY_ENUM: readonly string[] = [
  "none", "low", "medium", "high"
];

export function mysteryResolutionSafetyForStatus(status: string): readonly string[] {
  if (status === "forbidden") return ["none"];
  return ["low", "medium", "high"];
}

export function isCanonicalDomain(value: string): boolean {
  return CANONICAL_DOMAINS.includes(value);
}
```

Export as package subpath `@worldloom/world-index/public/canonical-vocabularies` via `tools/world-index/package.json`.

### 2. Update validator imports

`tools/validators/src/rules/rule2-no-pure-cosmetics.ts:3` — change from `import { isCanonicalDomain } from "./_shared/domain-enum.js"` to `import { isCanonicalDomain } from "@worldloom/world-index/public/canonical-vocabularies"`. Delete `tools/validators/src/rules/_shared/domain-enum.ts`.

### 3. Add MCP tool `get_canonical_vocabulary`

New file `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`. Tool takes `{ class: "domain" | "verdict" | "mystery_status" | "mystery_resolution_safety" }`; returns `{ canonical_values: string[], coupling?: { field: string, rule: string } }`. The `coupling` field is populated only for `mystery_resolution_safety`.

Register in `tools/world-mcp/src/server.ts` under `mcp__worldloom__get_canonical_vocabulary`.

### 4. Tests

- New test: `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`. Cases: `domain` returns full list; `verdict` returns 6 enum values; `mystery_status` returns 4; `mystery_resolution_safety` returns 4 values + coupling object; unknown `class` returns error.
- Existing test: `tools/validators/tests/rules/rule2-no-pure-cosmetics.test.ts` — no behavior change expected; rerun to confirm import path move is non-breaking.

## Files to Touch

- `tools/world-index/src/public/canonical-vocabularies.ts` (new)
- `tools/world-index/package.json` (modify — add public subpath export)
- `tools/world-index/README.md` (modify — document the new public vocabulary surface)
- `tools/world-index/tests/public-types.test.ts` (modify — public import-time guard for the new export)
- `tools/validators/src/rules/rule2-no-pure-cosmetics.ts` (modify — import path change)
- `tools/validators/src/rules/_shared/domain-enum.ts` (delete)
- `tools/validators/tests/rules/rule2-no-pure-cosmetics.test.ts` (modify — import shared enum source)
- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify — tool name/order registration)
- `tools/world-mcp/src/server.ts` (modify — register new tool)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — 13-tool inventory)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — dispatch coverage)
- `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` (new)
- `tools/world-mcp/README.md` (modify — 13-tool inventory)

## Out of Scope

- Adding `geography` to `CANONICAL_DOMAINS` (lands in `SPEC14PAVOC-001`).
- Changing the mystery-rule logic to be status-coupled (lands in `SPEC14PAVOC-001`).
- Engine consumption of `VERDICT_ENUM` for `append_adjudication_record` typing (lands in `SPEC14PAVOC-002`).
- Skills consuming `get_canonical_vocabulary` at reasoning time (lands during SPEC-06 skill rewrites; this ticket only ships the API surface).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — new `get-canonical-vocabulary.test.ts` passes.
2. `cd tools/validators && npm test` — existing tests pass after import path move.
3. `cd tools/world-index && npm run build && npm test` — public subpath export compiles and package tests pass.
4. `cd tools/world-mcp && node -e "const { getRegisteredToolNames } = require('./dist/src/server.js'); console.log(getRegisteredToolNames().includes('mcp__worldloom__get_canonical_vocabulary') ? 'present' : 'missing'); console.log(getRegisteredToolNames().length);"` lists `mcp__worldloom__get_canonical_vocabulary` in the registered tool set and reports 13 tools.

### Invariants

1. Validator and MCP tool use the same public `CANONICAL_DOMAINS` export; `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` verifies the returned domain list matches the shared module exactly.
2. No re-export shim left at the old `tools/validators/src/rules/_shared/domain-enum.ts` path (the file is deleted, not retained for compatibility).
3. The shared module has no runtime dependencies beyond TypeScript primitives — pure data + a single helper function.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` — unit tests for each of the 4 vocabulary classes plus error case.
2. `tools/validators/tests/rules/rule2-no-pure-cosmetics.test.ts` — re-run existing tests after import path change.
3. `tools/world-index/tests/public-types.test.ts` — extended public import-time guard to cover `@worldloom/world-index/public/canonical-vocabularies`.

### Commands

1. `cd tools/world-index && npm run build && npm test` — shared module builds and re-exports cleanly.
2. `cd tools/world-mcp && npm run build && npm test` — MCP tool registers and returns expected lists.
3. `cd tools/validators && npm run build && npm test` — validator still passes after import path move.

## Outcome

Landed `@worldloom/world-index/public/canonical-vocabularies` as the shared vocabulary source for the canonical domains, adjudication verdict enum, mystery status enum, mystery resolution-safety enum, `isCanonicalDomain`, and `mysteryResolutionSafetyForStatus`. Follow-up correction added `technology` to the domain list after comparing the enum against FOUNDATIONS.

`rule2_no_pure_cosmetics` now imports `isCanonicalDomain` from that public package subpath, and the validator-local `domain-enum.ts` file was removed without a compatibility shim. `tools/world-mcp` now registers `mcp__worldloom__get_canonical_vocabulary`, dispatches it through the existing wrapped-tool path, and documents it in the package README.

## Verification Result

Completed on 2026-04-25:

1. `cd tools/world-index && npm run build && node --test dist/tests/public-types.test.js` — pass.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-canonical-vocabulary.test.js dist/tests/server/list-tools.test.js dist/tests/server/dispatch.test.js` — pass.
3. `cd tools/validators && node --test dist/tests/rules/rule2-no-pure-cosmetics.test.js` — pass.
4. `cd tools/world-index && npm test` — pass, 55 tests.
5. `cd tools/validators && npm test` — pass, 47 tests.
6. `cd tools/world-mcp && npm test` — pass, 122 tests.
7. `cd tools/world-mcp && node -e "const { getRegisteredToolNames } = require('./dist/src/server.js'); console.log(getRegisteredToolNames().includes('mcp__worldloom__get_canonical_vocabulary') ? 'present' : 'missing'); console.log(getRegisteredToolNames().length);"` — outputs `present` and `13`.

Follow-up correction proof on 2026-04-25:

8. `cd tools/world-index && npm run build` — pass.
9. `cd tools/validators && npm run build && node --test dist/tests/rules/rule2-no-pure-cosmetics.test.js` — pass; includes `technology` canonical-domain acceptance.
10. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-canonical-vocabulary.test.js` — pass; MCP domain vocabulary includes `technology`.
11. `cd tools/world-index && node -e "const { CANONICAL_DOMAINS } = require('./dist/src/public/canonical-vocabularies.js'); console.log(CANONICAL_DOMAINS.includes('technology') ? 'technology-present' : 'technology-missing'); console.log(CANONICAL_DOMAINS.length);"` — outputs `technology-present` and `23`.

## Deviations

1. The draft referenced `tools/world-index/src/public/index.ts` and `@worldloom/world-index/public`; the live package has no such file/export. The landed public surface is the explicit package subpath `@worldloom/world-index/public/canonical-vocabularies`.
2. The shared `MYSTERY_RESOLUTION_SAFETY_ENUM` includes `none` for the SPEC-14 status-coupled rule, but `rule7_mystery_reserve_preservation` still keeps its current flat `low|medium|high` check until `SPEC14PAVOC-001` owns the semantic validator change.
