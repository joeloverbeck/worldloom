# SPEC115MANSTOSTU-001: World-source read layer

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new read-only module `tools/manual-story-studio/src/read/world-source.ts` (reuses `result.ts` `ReadResult` + `worlds.ts` `enumerateWorlds`). No impact on existing readers, schemas, or write paths.
**Deps**: None

## Problem

The manual-story-studio world read layer (`src/read/worlds.ts` `enumerateWorlds`) returns only `{ worldSlug, absolutePath, hasWorldKernel }` per world — it exposes no `_source/` records, characters, diegetic-artifacts, or root canon files. An author grounding a story record in world canon must leave the tool, open the repo, and read raw YAML by hand. Build a read-only reader that, for a validated world slug, enumerates and parse-tolerantly reads the world's source material and surfaces each item as `{ kind, path, title/name (if parseable), tags/class (if present), raw_text }`, with structured errors (SPEC-105 `result.ts` discipline) and fail-soft on missing subdirs.

## Assumption Reassessment (2026-06-02)

1. `src/read/worlds.ts` exports `enumerateWorlds(repoRoot): ReadResult<WorldEntry[]>` with `WorldEntry = { worldSlug, absolutePath, hasWorldKernel }` (verified); it skips worlds lacking `WORLD_KERNEL.md`. The new reader IMPORTS `enumerateWorlds` to resolve the validated world root — **no edit to `worlds.ts` is required** (spec §4's "Modify worlds.ts — no behavior change" is satisfied by import-only reuse; `enumerateWorlds` is already exported, so the deliverable's intent is met without a `(modify)` entry).
2. Spec §2 item 1 + §4 (`specs/SPEC-115-manual-story-studio-world-source-browser.md`) name the read surface: root files `WORLD_KERNEL.md` / `ONTOLOGY.md`; the 11 `_source/` subdirs (canon, invariants, mystery-reserve, open-questions, timeline, geography, peoples-and-species, institutions, economy-and-resources, magic-or-tech-systems, everyday-life); `characters/`; `diegetic-artifacts/`. Matches FOUNDATIONS §Mandatory World Files storage form.
3. Shared boundary under audit: the `ReadResult<T>` / `ok` / `err` structured-error contract in `src/read/result.ts` (SPEC-105) — the reader returns `ReadResult` and surfaces a structured error (not a throw) for an unparseable file. The reader reuses `yaml` (the package's existing parse dependency) for best-effort title/name/tags/class extraction.
4. FOUNDATIONS §Tooling Recommendation / §Canonical Storage Layer read discipline: the general "never read `_source/` in bulk; use typed retrieval" rule + Hook 2 govern the Claude Code agent/skill layer operating inside the canon-mutation pipeline; manual-story-studio is a separate, standalone, read-only app the report (§8) argues must NOT take an MCP/world-index runtime dependency. A read-only direct-filesystem reader is the sanctioned design here (spec §1.1) — this reader introduces no canon write path.
5. Canon Safety / Mystery Reserve firewall (read-side): the reader reads `_source/mystery-reserve/M-*.yaml` and other canon records as **literal text only** — it performs no semantic extraction, no transformation, and no promotion of any content to a fact. It cannot resolve a forbidden-status `M`, because it neither writes canon nor writes story records; copied text lands (later, by author action in SPEC115MANSTOSTU-003) only in `manual-stories/` records, which are neither world canon nor story-bundle records. The Diegetic-to-World firewall is preserved at the read layer by surfacing raw text without inference.

## Architecture Check

1. The reader composes on top of `enumerateWorlds` (slug→root resolution) and `result.ts` (structured errors) rather than re-implementing world discovery or error handling — a minimal new surface consistent with the existing `src/read/*.ts` module conventions. Enumeration is fail-soft (a missing `_source/` subdir is skipped, not a hard failure) and parse-tolerant (an unparseable file yields a structured-error item, not a crash), mirroring how the package already degrades gracefully.
2. No backwards-compatibility shim or aliasing: this is a new module; `worlds.ts` is consumed unchanged.

## Verification Layers

1. Enumeration covers root files + present `_source/` subdirs + characters + diegetic-artifacts -> `test/read/world-source.test.ts` fixture-world assertion (codebase test).
2. A missing `_source/` subdir is fail-soft (browse not aborted) -> fixture test with an incomplete world tree.
3. An unparseable file yields a structured error, not a throw -> fixture test with a malformed YAML file, asserting a `ReadResult` error item.
4. Read-only invariant (no write path exists in the module) -> codebase grep-proof: no `fs.write*` / `mkdir` / patch-engine / world-mcp import in `world-source.ts`.

## What to Change

### 1. New reader `src/read/world-source.ts`

- Export a reader (e.g. `readWorldSource(repoRoot, worldSlug): ReadResult<WorldSourceItem[]>`; final name at implementer discretion, but it MUST return `ReadResult`).
- Resolve the world root via `enumerateWorlds` (a slug not present in the enumeration -> structured error, never a raw path).
- Enumerate, for the resolved root: root files (`WORLD_KERNEL.md`, `ONTOLOGY.md`); each present `_source/` subdir among the 11 named in spec §2 item 1; `characters/`; `diegetic-artifacts/`. A missing subdir -> skip (fail-soft).
- For each file: produce `{ kind, path, title/name (best-effort YAML/markdown parse), tags/class (if present), raw_text }`. A parse failure -> structured-error item (SPEC-105), browse continues.
- No semantic extraction, transformation, sync, or provenance write-back (spec §2 item 1, §3).

### 2. Reader test `test/read/world-source.test.ts`

- A fixture world tree under `test/` covering present + missing `_source/` subdirs, `characters/`, `diegetic-artifacts/`, and one unparseable file. Assert enumeration coverage, fail-soft on a missing subdir, structured error on the unparseable file, and that the module exposes no write path.

## Files to Touch

- `tools/manual-story-studio/src/read/world-source.ts` (new)
- `tools/manual-story-studio/test/read/world-source.test.ts` (new)

(Reused, not modified: `tools/manual-story-studio/src/read/result.ts`, `tools/manual-story-studio/src/read/worlds.ts` — imported, no edit.)

## Out of Scope

- HTTP routes (SPEC115MANSTOSTU-002), frontend (SPEC115MANSTOSTU-003).
- Any write to world canon, characters, diegetic-artifacts, or `_source/`.
- Semantic extraction / fact distillation / transformation / provenance pointers.
- MCP / world-index runtime dependency.

## Acceptance Criteria

### Tests That Must Pass

1. For a fixture world, the reader enumerates `WORLD_KERNEL.md`, `ONTOLOGY.md`, the present `_source/` subdirs, `characters/`, and `diegetic-artifacts/`; a missing subdir does not abort the browse. (spec AC1)
2. An unparseable world file surfaces a structured error (`ReadResult` error item), not a crash or silent skip. (spec AC6)
3. `cd tools/manual-story-studio && npm run test:backend` is green.

### Invariants

1. The reader writes nothing — no `fs.write*`, no `mkdir`, no patch-engine / world-mcp import.
2. The world root is resolved only from a slug validated via `enumerateWorlds`; no raw filesystem path from outside reaches a read.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/read/world-source.test.ts` — fixture-driven enumeration + fail-soft + structured-error + no-write-path coverage.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm run build`

## Outcome

Completed on 2026-06-02.

Added `tools/manual-story-studio/src/read/world-source.ts`, exporting `readWorldSource(repoRoot, worldSlug): ReadResult<WorldSourceItem[]>`. The reader resolves worlds exclusively through `enumerateWorlds`, enumerates `WORLD_KERNEL.md`, `ONTOLOGY.md`, present `_source/` subdirectories, `characters/`, and `diegetic-artifacts/`, and returns literal raw text plus best-effort `title` / `name` / `tags` / `class` metadata. Missing source subdirectories are skipped fail-soft. Malformed YAML stays visible as raw text and carries a structured `yaml_parse_failed` item error instead of crashing or silently disappearing.

Added `tools/manual-story-studio/test/read/world-source.test.ts` covering enumeration, missing subdirectory fail-soft behavior, malformed YAML item errors, slug-only world resolution, and the module-level no-write-path invariant.

No changes were made to `tools/manual-story-studio/src/read/worlds.ts`; the existing exported `enumerateWorlds` function was sufficient and is reused unchanged.

## Verification Result

1. PASS: `cd tools/manual-story-studio && npm run build:backend` — TypeScript backend compile succeeded after the exact-optional-property fix.
2. PASS: `cd tools/manual-story-studio && node --test dist/test/read/world-source.test.js` — focused reader suite passed 5/5 tests after rebuilding compiled output.
3. PASS: `cd tools/manual-story-studio && npm run test:backend` — backend/static suite passed 83/83 compiled tests, including `dist/test/read/world-source.test.js`.
4. PASS: `cd tools/manual-story-studio && npm run build` — web install/build, Vite production build, and backend compile all succeeded.

## Deviations

1. The reader keeps malformed YAML files in the item list with `raw_text` plus an embedded structured `error`; this matches the ticket's "structured-error item" wording while preserving browse continuity.
2. `WORLD_KERNEL.md` is emitted before `ONTOLOGY.md`, following the spec's root-file order rather than global lexical order.
