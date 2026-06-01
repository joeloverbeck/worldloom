# SPEC105MANSTOSTU-004: Migrate `readManualStoryMetadata` + callers

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/src/read/manual-story-metadata.ts` (signature change `ManualStoryMetadata | null` → `ReadResult<ManualStoryMetadata>`) plus three caller sites (`prompt/compose.ts` stage 2; `server/routes/metadata.ts`; `server/routes/beat-templates.ts` line 306). No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-002.md, archive/tickets/SPEC105MANSTOSTU-003.md

## Problem

At intake, `readManualStoryMetadata` at `tools/manual-story-studio/src/read/manual-story-metadata.ts:8-21` returned `ManualStoryMetadata | null` on missing file / parse exception / non-object YAML — three distinct failure conditions collapsed into one return value. Per SPEC-105 §2 item 3, the public read surface had to migrate to `ReadResult<ManualStoryMetadata>` so callers can distinguish "story doesn't exist" (404) from "metadata corrupt" (409 with `HealthReport` body). This ticket migrated the read function and its three caller sites coherently, leaving the build green.

## Assumption Reassessment (2026-06-01)

1. The three caller sites are verified at HEAD:
   - `tools/manual-story-studio/src/prompt/compose.ts:81` — `const metadata = readManualStoryMetadata(input.manualStoryRoot);` followed by `if (!metadata) { throw new Error(...) }` at lines 82–86.
   - `tools/manual-story-studio/src/server/routes/metadata.ts:41` — direct call inside the GET handler.
   - `tools/manual-story-studio/src/server/routes/beat-templates.ts:306` — `const metadata = readManualStoryMetadata(root.absolutePath);` (the beat-template candidate-generation route also reads metadata to resolve cast).
   `grep -rn "readManualStoryMetadata" tools/manual-story-studio/src/` returns exactly these 4 sites (1 definition + 3 callers) — no other callers exist.
2. SPEC-105 §2 item 3 + §4 Modify list this signature change explicitly. The read-error vocabulary (`file_not_found`, `yaml_parse_failed`) is consumed by `mapReadErrorToHttpReply` from archive/tickets/SPEC105MANSTOSTU-003.md — routes call the helper on `ok: false` returns.
3. Cross-skill boundary: `tools/manual-story-studio` is canon-pipeline-fenced per SPEC-100; this signature change is internal to the package, no cross-package import added or modified.
4. Rule 6 retcon attribution: the migration changes the public return type from `ManualStoryMetadata | null` to `ReadResult<ManualStoryMetadata>` — this is a non-additive signature change. Existing behavior (caller checks `if (!metadata)` and falls back) is replaced with discriminated-union narrowing (`if (!result.ok)` and explicit error dispatch via `mapReadErrorToHttpReply`). The change is warranted because the existing `T | null` shape conflates three failure conditions that need distinct HTTP outcomes per SPEC-105 §2 item 4. No backwards-compat shim or `T | null` overload is retained.
5. Blast-radius of the signature change: 3 caller sites enumerated above. The structural impact is local — no transitive type-flow into other modules because `ManualStoryMetadata` is consumed by name, not via inference into other functions' signatures. The blast-radius grep at acceptance time confirms no orphan call sites.

## Architecture Check

1. Migrating the read function and its callers in one coherent diff is the smallest reviewable unit that keeps the build green at every commit — splitting the read-side change from the caller-side adaptation would leave the build broken between commits. The three caller sites are mechanical adaptations (compose throws on `!result.ok` with a richer error message; routes call `mapReadErrorToHttpReply` directly).
2. No backwards-compatibility aliasing/shims — the old `T | null` return is removed outright. `compose.ts`'s existing `throw new Error("manual_story_not_found: ...")` becomes a richer error that preserves the parse-failure cause when `result.error.code === "yaml_parse_failed"` (the route-layer caller of `composePrompt` then surfaces the failure to the frontend via 500 or per-route mapping).

## Verification Layers

1. Type signature change → codebase grep-proof: `grep -nE "readManualStoryMetadata.*ReadResult" tools/manual-story-studio/src/read/manual-story-metadata.ts` returns the new signature.
2. Caller-site adaptations leave build green → `cd tools/manual-story-studio && npm run build:backend` compiles cleanly across the modified files.
3. Route 404 vs 409 dispatch is correct → integration tests in SPEC105MANSTOSTU-014 cover the corrupt-metadata case end-to-end. For this ticket, route-level unit tests assert that `readManualStoryMetadata` returning `ok: false` with `code: "yaml_parse_failed"` triggers `mapReadErrorToHttpReply` and surfaces the 409 + HealthReport body.

## Landed Changes

### 1. `tools/manual-story-studio/src/read/manual-story-metadata.ts`

Changed the function to return `ReadResult<ManualStoryMetadata>`:

```ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { ManualStoryMetadata } from "../schema/manual-story.js";
import { type ReadResult, ok, err } from "./result.js";

export function readManualStoryMetadata(
  manualStoryRoot: string,
): ReadResult<ManualStoryMetadata> {
  const fullPath = path.join(manualStoryRoot, "manual-story.yaml");
  if (!existsSync(fullPath)) {
    return err({
      code: "file_not_found",
      path: fullPath,
      repair_hint: "Create manual-story.yaml at the manual story root.",
    });
  }
  let text: string;
  try {
    text = readFileSync(fullPath, "utf8");
  } catch (cause) {
    return err({
      code: "io_error",
      path: fullPath,
      cause,
      repair_hint: "Check file permissions on manual-story.yaml.",
    });
  }
  let parsed: unknown;
  try {
    parsed = YAML.parse(text);
  } catch (cause) {
    return err({
      code: "yaml_parse_failed",
      path: fullPath,
      cause,
      repair_hint: "Fix YAML syntax errors in manual-story.yaml.",
    });
  }
  if (typeof parsed !== "object" || parsed === null) {
    return err({
      code: "schema_validation_failed",
      path: fullPath,
      repair_hint: "manual-story.yaml must contain a top-level mapping.",
    });
  }
  return ok(parsed as ManualStoryMetadata);
}
```

### 2. `tools/manual-story-studio/src/prompt/compose.ts` — stage 2

Replaced the existing stage 2 with discriminated-union narrowing:

```ts
const metadataResult = readManualStoryMetadata(input.manualStoryRoot);
if (!metadataResult.ok) {
  throw new Error(
    `manual_story_metadata_unavailable: ${metadataResult.error.code} at ${metadataResult.error.path}`,
  );
}
const metadata = metadataResult.value;
```

The thrown error preserves the read-error code in its message. The route-level migration that converts broader prompt-compose read failures into structured 409 responses remains in later route tickets; 004 only converts the stage 2 metadata read.

### 3. `tools/manual-story-studio/src/server/routes/metadata.ts`

Adapt the GET handler at line 41 to dispatch via `mapReadErrorToHttpReply`:

```ts
const result = readManualStoryMetadata(root.absolutePath);
if (!result.ok) {
  return mapReadErrorToHttpReply(reply, result.error);
}
return { metadata: result.value };
```

### 4. `tools/manual-story-studio/src/server/routes/beat-templates.ts` — line 306

Same adaptation pattern as routes/metadata.ts.

## Files to Touch

- `tools/manual-story-studio/src/read/manual-story-metadata.ts` (modify)
- `tools/manual-story-studio/src/prompt/compose.ts` (modify — stage 2 only; stages 3+4+5 are SPEC105MANSTOSTU-005's scope)
- `tools/manual-story-studio/src/server/routes/metadata.ts` (modify)
- `tools/manual-story-studio/src/server/routes/beat-templates.ts` (modify — readManualStoryMetadata call at line 306 only; listRecords/readRecord calls are 005's scope)

## Out of Scope

- Migrating any other read function — SPEC105MANSTOSTU-005 (records), 006 (segments), 007 (manuscript), 008 (enumerators).
- The `compose.ts` stages 3+4+5 adaptations (readRecord cast/records loops; raw template read) — SPEC105MANSTOSTU-005.
- Frontend rendering of the resulting 409 body — SPEC105MANSTOSTU-011 / SPEC105MANSTOSTU-012.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` compiles cleanly — all caller sites narrow on `result.ok` before accessing `.value`.
2. `cd tools/manual-story-studio && npm test` runs and the existing metadata-route + compose tests pass (any test that asserted `readManualStoryMetadata === null` is updated to assert `!result.ok`).
3. `grep -rn "readManualStoryMetadata" tools/manual-story-studio/src/` returns exactly 4 sites (1 definition + 3 callers) — no orphan callers introduced.
4. `grep -nE "readManualStoryMetadata\(.+\)\.[^o]" tools/manual-story-studio/src/` returns zero matches (no caller accesses fields directly on the return value without narrowing on `.ok` first).

### Invariants

1. `readManualStoryMetadata` returns `ReadResult<ManualStoryMetadata>` — never `T | null`.
2. Every caller narrows on `result.ok` before accessing `.value` (TypeScript enforces this at compile time).
3. Route 404 is returned only when `result.error.code === "file_not_found"`; corrupt YAML produces 409 per the SPEC-105 §2 item 4 dispatch table.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/routes/metadata.test.ts` (modify — assert 404 for absent story, 409 + HealthReport body for corrupt YAML, 200 for valid metadata).
2. `tools/manual-story-studio/test/prompt/compose.test.ts` (modify if a test depended on the `null` return; adapt to `!result.ok` narrowing).

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — compile check.
2. `cd tools/manual-story-studio && npm test` — full package test.

## Outcome

Completed on 2026-06-01.

This ticket migrated `readManualStoryMetadata` to `ReadResult<ManualStoryMetadata>`, adapted the three source callers (`compose.ts`, metadata route, beat-template candidate route), and updated read/metadata-route tests. Corrupt metadata YAML now reaches the route layer as `yaml_parse_failed` and returns the shared 409 `HealthReport` response.

No deviations from the planned production file set. The test updates additionally cover the read-layer corrupt-YAML result and metadata-route 409 body.

## Verification Result

Commands run from the repo root unless a package directory is named:

1. `cd tools/manual-story-studio && npm run build:backend` — passed.
2. `cd tools/manual-story-studio && npm test` — passed; backend reported 358 tests passing and web `tsc --noEmit` passed.
3. `grep -nE "readManualStoryMetadata.*ReadResult" tools/manual-story-studio/src/read/manual-story-metadata.ts` — passed.
4. `grep -rn "readManualStoryMetadata(" tools/manual-story-studio/src/` — passed; returned exactly 4 callable sites: 1 definition and 3 callers.
5. `grep -rnE "readManualStoryMetadata\\(.+\\)\\.[^o]" tools/manual-story-studio/src/` — passed with zero matches.
