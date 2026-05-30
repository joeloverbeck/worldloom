# SPEC100MANSTOSTU-005: Read backends — world enumeration + per-world manual-stories enumeration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/read/worlds.ts` and `tools/manual-story-studio/src/read/manual-stories.ts`. No impact on existing tools.
**Deps**: SPEC100MANSTOSTU-001

## Problem

SPEC-100 §2 in-scope item 6 (world picker + manual-story list UI) requires direct filesystem enumeration of `worlds/` for the world picker and of `worlds/<world>/manual-stories/` for the per-world manual-story list. Because Manual Studio explicitly does not depend on `@worldloom/world-mcp` or `@worldloom/world-index` (per SPEC-100 §2 item 1 dependency exclusions + §3 Key decisions), the reads are direct filesystem traversals of `worlds/` (not MCP-backed, not index-backed). These two read backends become the foundation that ticket 006 (server scaffolding + GET `/api/worlds`) and ticket 007 (GET `/api/worlds/:slug/manual-stories`) consume from their route handlers.

## Assumption Reassessment (2026-05-30)

1. `tools/story-explorer/src/read/world-list.ts` is the established direct-filesystem world-enumeration precedent (confirmed by reading `tools/story-explorer/src/server/routes/worlds.ts:6` which imports `enumerateWorlds` from `../../read/world-list.js`). Story Explorer reads `worlds/` directly without depending on the world-index for the world list — the same posture Manual Studio adopts. The shape Manual Studio mirrors: a function that scans `<repoRoot>/worlds/`, filters to directory entries, optionally derives display metadata from `WORLD_KERNEL.md` (per Story Explorer pattern), and returns a typed array.
2. SPEC-100 §4 Files to touch lines 72-73 specify `tools/manual-story-studio/src/read/worlds.ts` (direct enumeration of `worlds/`) and `tools/manual-story-studio/src/read/manual-stories.ts` (enumeration of `worlds/<world>/manual-stories/` per world). Both are new files; no existing reads in `tools/manual-story-studio/` to extend.
3. **Cross-skill / cross-artifact boundary**: these reads share the `worlds/` directory surface with `tools/story-explorer/src/read/world-list.ts` (read-only) and with the patch engine + world-index (both write/index this surface through their own discipline). Manual Studio's reads MUST be read-only — no writes, no mutations, no derived-file caching. The shared boundary is the filesystem layout of `worlds/<slug>/` (well-known via `worlds/<slug>/WORLD_KERNEL.md` presence as the world-validity test); reading is unrestricted, writing remains gated by the sandbox (ticket 003) and the route guard (ticket 002).

## Architecture Check

1. **Direct filesystem reads, no world-index dependency**: per SPEC-100 §8 Risks discussion, depending on the world-index would couple Manual Studio to an unrelated build artifact (the gitignored `_index/world.db`); reading `worlds/` directly is the right abstraction for a writing tool whose content surface lives outside the index. The cost (no FTS-backed search of manual records) is acceptable for MVP and explicitly folded into the M6 deferral.
2. **Mirror Story Explorer's reader pattern, no shared import**: per SPEC-100 §8 Risks + §2 in-scope item 6 ("reuse the read-only enumeration logic pattern from Story Explorer"), Manual Studio copies the pattern but does not import Story Explorer's module (no shared package exists yet; introducing one is explicitly out of scope per SPEC-100 §8 Risks). A future shared package consolidation is the M6 deferral.
3. No backwards-compatibility aliasing/shims introduced — both modules are new.

## Verification Layers

1. `enumerateWorlds(repoRoot)` returns an array of world entries matching `worlds/<slug>/` subdirectories that contain a `WORLD_KERNEL.md` (skips non-world directories) → unit test with a fixture repo root containing 2 valid worlds + 1 invalid directory; asserts the returned array has exactly 2 entries.
2. `enumerateManualStories(repoRoot, worldSlug)` returns an array of manual-story entries from `worlds/<worldSlug>/manual-stories/<slug>/`, gated on the presence of `manual-story.yaml` per story directory → unit test with a fixture world containing 2 valid manual stories + 1 directory without `manual-story.yaml`; asserts exactly 2 entries.
3. Reading a world that has no `manual-stories/` subdirectory returns an empty array (not an error) → unit test asserts `enumerateManualStories(repoRoot, "world-without-manual-stories")` returns `[]`.

## What to Change

### 1. Create `tools/manual-story-studio/src/read/worlds.ts`

```typescript
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export interface WorldEntry {
  worldSlug: string;
  absolutePath: string;
  hasWorldKernel: boolean;
}

export function enumerateWorlds(repoRoot: string): WorldEntry[] {
  const worldsDir = path.join(repoRoot, "worlds");
  if (!existsSync(worldsDir)) return [];

  const entries = readdirSync(worldsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => /^[a-z0-9-]+$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en-US"));

  const results: WorldEntry[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(worldsDir, entry.name);
    const hasWorldKernel = existsSync(path.join(absolutePath, "WORLD_KERNEL.md"));
    if (!hasWorldKernel) continue; // Not a valid world; skip
    results.push({ worldSlug: entry.name, absolutePath, hasWorldKernel });
  }
  return results;
}
```

### 2. Create `tools/manual-story-studio/src/read/manual-stories.ts`

```typescript
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export interface ManualStoryEntry {
  worldSlug: string;
  manualStorySlug: string;
  absolutePath: string;
  title: string | null;
}

export function enumerateManualStories(repoRoot: string, worldSlug: string): ManualStoryEntry[] {
  if (!/^[a-z0-9-]+$/.test(worldSlug)) {
    throw new Error(`invalid world slug: ${worldSlug}`);
  }

  const manualStoriesDir = path.join(repoRoot, "worlds", worldSlug, "manual-stories");
  if (!existsSync(manualStoriesDir)) return [];

  const entries = readdirSync(manualStoriesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => /^[a-z0-9-]+$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en-US"));

  const results: ManualStoryEntry[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(manualStoriesDir, entry.name);
    const manualStoryYamlPath = path.join(absolutePath, "manual-story.yaml");
    if (!existsSync(manualStoryYamlPath)) continue; // Not a valid manual story; skip
    const title = readTitleFromManualStoryYaml(manualStoryYamlPath); // null on parse failure / missing field
    results.push({ worldSlug, manualStorySlug: entry.name, absolutePath, title });
  }
  return results;
}

function readTitleFromManualStoryYaml(yamlPath: string): string | null {
  // Use the yaml dep (declared in package.json by ticket 001) to parse the file.
  // Return parsed.title if present and string-typed; null otherwise.
  // Fail-soft: any parse/read error returns null (the title is informational; the manual story is still listable).
  // ...
}
```

### 3. Create tests at `tools/manual-story-studio/test/read/worlds.test.ts` and `tools/manual-story-studio/test/read/manual-stories.test.ts`

Each test uses `node:fs` + temp directories to construct fixture trees. Cases:

- `worlds.test.ts`: (a) empty `worlds/` → `[]`; (b) 2 valid worlds + 1 directory without `WORLD_KERNEL.md` → 2 entries; (c) malformed slug directory (`World!`) → skipped.
- `manual-stories.test.ts`: (a) no `manual-stories/` subdirectory → `[]`; (b) 2 valid manual stories + 1 directory without `manual-story.yaml` → 2 entries; (c) invalid world slug throws; (d) title parsed from a valid `manual-story.yaml`; (e) missing/malformed YAML returns `title: null` but the entry is still listed.

## Files to Touch

- `tools/manual-story-studio/src/read/worlds.ts` (new)
- `tools/manual-story-studio/src/read/manual-stories.ts` (new)
- `tools/manual-story-studio/test/read/worlds.test.ts` (new)
- `tools/manual-story-studio/test/read/manual-stories.test.ts` (new)

## Out of Scope

- HTTP route handlers — tickets 006 (GET `/api/worlds`) and 007 (GET `/api/worlds/:slug/manual-stories`) consume these readers.
- Reading world canon (CF / CH / INV / M / OQ / ENT / SEC records) — Manual Studio reads `WORLD_KERNEL.md` and hybrid `characters/` / `diegetic-artifacts/` files via direct file reads in later specs (SPEC-101+); MCP-backed canon reads are not in MVP scope.
- Caching / index building over manual-story content — Manual Studio's `indexes/` directory is an M6 deferral (rebuildable JSON, not in MVP).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/read/*.test.js"` — all read-backend test cases pass.
2. `grep -E "enumerateWorlds|enumerateManualStories" tools/manual-story-studio/src/read/*.ts` — both functions exported.

### Invariants

1. Read backends never write to disk; they perform `readdir` / `stat` / `existsSync` only. (Architectural invariant — Manual Studio's reads are read-only against the `worlds/` surface.)
2. Read backends gracefully handle missing directories (`worlds/` absent, per-world `manual-stories/` absent) by returning `[]` rather than throwing. (Data-contract invariant — the route handlers should not need to wrap calls in try/catch for the absent-directory case.)

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/worlds.test.ts` — new file, 3+ test cases.
2. `tools/manual-story-studio/test/read/manual-stories.test.ts` — new file, 5+ test cases.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/read/*.test.js"` — targeted test run.
2. `cd tools/manual-story-studio && npm test` — full chain.
