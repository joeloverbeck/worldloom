# @worldloom/manual-story-studio

## Purpose

Manual Story Studio is a deterministic, no-LLM, no-MCP, no-patch-engine local writing cockpit. It produces external Markdown prompts (consumed by an external third-party LLM the author drives manually) and stores manual record state, segments, and a compiled manuscript on disk under `worlds/<slug>/manual-stories/<slug>/`.

Manual Studio is intentionally **outside** the Worldloom branching-story pipeline: no PG / SE / SCN / SLT records, no patch engine, no MCP runtime dependency, no validators that assume the branching-story state machine. The goal is speed of authoring, not engine fidelity. World canon and normal story bundles remain strictly read-only to this tool.

## Stack

- Node `>=22`
- TypeScript
- Backend: Fastify + `@fastify/static` + `yaml`
- Frontend (`web/`): Vite + React

### Explicitly omitted dependencies

Manual Studio deliberately does **not** depend on:

- `@worldloom/patch-engine` — Manual Studio is not an engine-routed surface. The engine remains the sole writer of `_source/<world-subdir>/*.yaml` and `stories/<bundle>/_source/<class>/*.yaml`.
- `@worldloom/world-mcp` — Manual Studio reads canon via direct file reads, not via MCP retrieval. The external LLM gets canon snapshots through Manual Studio's emitted Markdown prompts, not through MCP.
- `better-sqlite3` — Manual Studio carries no SQLite index. Rebuildable JSON indexes over manual records are an M6 deferral (post-SPEC-104) and remain out of scope today.

Rationale: per SPEC-100 §3 Key decisions, declaring these exclusions at the dependency level makes the design intent enforceable at install time. A future contributor cannot accidentally import the engine or MCP without explicitly adding the dependency.

## Write boundary

**Allowed**: `worlds/<slug>/manual-stories/<manual-story-slug>/**` only.

**Forbidden destinations** (denylist applied to the resolved real path inside the in-tool sandbox at `src/write/sandbox.ts`):

- `worlds/<slug>/stories/` — branching-story bundles are engine-routed
- `worlds/<slug>/_source/` — atomic-source YAML records are engine-only-write
- `worlds/<slug>/characters/` — hybrid character dossiers are engine-routed
- `worlds/<slug>/diegetic-artifacts/` — hybrid artifact records are engine-routed
- `worlds/<slug>/_index/` — derived world-index DB territory
- `tools/story-explorer/` — sibling read-only browser
- `tools/patch-engine/` — engine package
- `tools/world-index/` — world-index package
- `tools/world-mcp/` — MCP retrieval package

The sandbox resolves the target real path via `fs.realpathSync.native` and rejects symlink escapes, `..` traversal, and absolute user-supplied paths before any write.

## Verified posture

The following analyses verify the boundaries between Manual Studio and three sibling surfaces — Hook 3, Hook 2, and the world-index parser — at the time of SPEC-100 reassessment (2026-05-30).

### Hook 3 (`tools/hooks/src/hook3-guard-direct-edit.ts:39-40`)

Hook 3 guards only paths matching `_source/` or `stories/<bundle>/_source/`. Manual Studio's write surface at `worlds/<slug>/manual-stories/**` is **naturally outside** Hook 3's pattern. Manual Studio's in-tool sandbox is the primary guard against accidental escape; Hook 3 is an unrelated upstream guard that does not extend to the `manual-stories/` surface (and should not be extended — Hook 3 protects engine-only-write surfaces, and Manual Studio is not one).

### Hook 2 (`tools/hooks/src/hook2-guard-large-read.ts`)

Hook 2 has two gating branches:

1. **Atomic-source-YAML gating** at `isAtomicSourceYaml(relativePath)` (line 117) — matches `_source/...*.yaml` and `stories/<bundle>/_source/...*.yaml`, redirecting oversized reads to MCP retrieval.
2. **Protected-markdown-filename gating** against two closed sets in `tools/hooks/src/lib/size-thresholds.ts`:
   - `ALWAYS_PROTECTED_FILES = {CANON_LEDGER.md}`
   - `THRESHOLD_PROTECTED_FILES = {MYSTERY_RESERVE.md, EVERYDAY_LIFE.md, INSTITUTIONS.md, OPEN_QUESTIONS.md, TIMELINE.md, GEOGRAPHY.md}`

Manual Studio's per-file YAML records under `manual-stories/<slug>/records/<class>/*.yaml` are outside the `_source/` prefix and so escape branch (a). Manual Studio's chosen `.md` filenames (`manuscript.md`, `prompts/PROMPT-*.md`, `segments/SEG-*.md`) collide with neither protected set in branch (b). Reads are direct on both surfaces — no MCP redirection.

### World-index parser ID patterns (lowercase `m-prefix` discipline)

The world-index parser at `tools/world-index/src/parse/story-directories.ts` enumerates 23 directory specs, all with **uppercase** ID patterns: `^STENT-[0-9]+$`, `^SE-[0-9]+$`, `^SLT-[0-9]+$`, and so on. STCHAR's uppercase pattern (`^STCHAR-[0-9]+$`) is enforced separately by the hybrid-record validator for `story-characters/STCHAR-*.md`, not by `story-directories.ts`.

Manual Studio uses **lowercase `m`-prefix** IDs throughout (`mchar-*`, `mbel-*`, `mtemplate-*`, etc., per SPEC-101 / SPEC-104). No `m`-prefix ID matches any of those uppercase regexes at any surface, regardless of where they are enforced. The lowercase discipline makes the boundary visible to humans reading file trees too. The `enumerate.ts` `manual-stories/` exclusion (SPEC-100 §2 item 4) is the warn-noise fix; identity safety is by-construction via the case discipline.

## Run

Build:

```
cd tools/manual-story-studio && npm run build
```

Boot backend:

```
node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root /path/to/worldloom
```

Boot Vite dev server (separate terminal):

```
cd tools/manual-story-studio/web && npm run dev
# Listens on http://127.0.0.1:5176, proxies /api/* to backend port 5175.
```

## Build & test

`npm test` chains `build:backend` + backend tests + `web test`:

```
cd tools/manual-story-studio && npm test
```
