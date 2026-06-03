# SPEC100MANSTOSTU-001: Manual Studio package skeleton + package README + docs scaffold

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces a new `tools/manual-story-studio/` package and a new `docs/manual-story-studio/` documentation directory. No impact on existing tools, skills, or hooks.
**Deps**: None

## Problem

SPEC-100's foundational deliverable: the Manual Story Studio package must exist on disk before any backend module, frontend file, or capstone test can land. SPEC-100 §2 in-scope items 1, 5, and 8 require a `tools/manual-story-studio/` package skeleton mirroring Story Explorer's stack (Fastify + Vite + YAML, Node ≥22, TypeScript) AND a `docs/manual-story-studio/` directory scaffold AND a documented verified posture (Hook 3 / Hook 2 / lowercase-ID safety analysis) in both the package README and the docs README. Establishing the package boundary first — with its dependency declarations explicitly excluding `@worldloom/patch-engine`, `@worldloom/world-mcp`, and `better-sqlite3` — makes the spec's design intent enforceable at npm-install time and gives subsequent tickets a stable scaffold to land their modules into.

## Assumption Reassessment (2026-05-30)

1. Package name `@worldloom/manual-story-studio` and the `tools/manual-story-studio/` path do not yet exist (`ls tools/manual-story-studio` confirms absent at HEAD); `tools/story-explorer/package.json` lines 2-31 are the mirror template (scripts: `build` / `build:backend` / `test` / `test:backend` / `clean`; deps `fastify@5.6.2` + `@fastify/static@^8.0.0` + `yaml@2.9.0`; devDeps `@types/node@25.9.0` + `typescript@6.0.3`; `engines.node >=22`). Manual Studio's `package.json` mirrors this shape EXCEPT it omits `@worldloom/world-index` and `better-sqlite3` (per SPEC-100 §2 item 1 explicit exclusion: "**no `better-sqlite3`** unless §6 indexes spec is later added").
2. SPEC-100 §2 item 5 + item 8 prescribe the docs scaffold and verified-posture content; the reassessed spec lines 28-29 (updated for verbatim/Manual-Studio-specific asymmetry) and lines 38-42 (updated for Hook 2 two-branch gating + STCHAR pattern correction) are authoritative. `docs/prose-renderer-contract/content-policy.md` exists at HEAD and is the verbatim-reuse target referenced by the docs README.
3. **Cross-skill / cross-artifact boundary**: this ticket establishes the contract between `tools/manual-story-studio/` (write-scope) and three sibling surfaces — `tools/world-index/` (read-scope, enumerate.ts modified by ticket 004), `tools/hooks/` (Hook 3 + Hook 2, both confirmed structurally outside `manual-stories/` per the reassessed spec), and `tools/story-explorer/` (Fastify pattern precedent, no shared code). The package README documents this boundary; the docs README documents the renderer-contract relationship with SPEC-102's future Manual Studio-specific variants.
4. **FOUNDATIONS principles restated** (motivate the verified-posture documentation): (a) §Tooling Recommendation — Manual Studio's LLM is external, realizing §Tooling Recommendation's intent across a process boundary by serving canon-data + content-policy in external Markdown packets; (b) §Story Bundles §6 Story-Bundle ID Classes — uppercase patterns at `tools/world-index/src/parse/story-directories.ts` (23 directory specs: STENT, SE, SLT, …) enforce case discipline; Manual Studio's lowercase `m`-prefix IDs collide with none of those regexes; (c) §Story Bundles §4 Write Discipline — Hook 3's `_source/`-only path patterns at `tools/hooks/src/hook3-guard-direct-edit.ts:39-40` naturally exclude `manual-stories/`; the in-tool sandbox (ticket 003) provides defense-in-depth.

## Architecture Check

1. **Package boundary as design enforcement, not convention**: declaring the dependency exclusions (`@worldloom/patch-engine`, `@worldloom/world-mcp`, `better-sqlite3`) at `package.json` level makes the spec's "no engine, no MCP, no DB" design enforceable at install time; a future contributor cannot accidentally import the patch engine because the dependency would have to be added explicitly. Cleaner than a runtime guard (which fires only at execution).
2. **Verified posture lives in the package README, not in scattered comments**: the spec's documented posture (Hook 3 / Hook 2 / lowercase-ID safety analysis) belongs in the package README where contributors read it first, not buried in a code comment in a future module. Cleaner than spreading the analysis across module-level comments where readers must reconstruct the boundary from fragments.
3. No backwards-compatibility aliasing/shims introduced; this is a greenfield package.

## Verification Layers

1. Package directory and metadata files exist → codebase grep-proof: `test -d tools/manual-story-studio/` returns 0; `node -e "console.log(require('./tools/manual-story-studio/package.json').name)"` outputs `@worldloom/manual-story-studio`.
2. Dependency exclusions enforced → codebase grep-proof: `node -e "const d = require('./tools/manual-story-studio/package.json'); console.log(['@worldloom/patch-engine','@worldloom/world-mcp','better-sqlite3'].filter(p => d.dependencies && d.dependencies[p]))"` outputs `[]`.
3. Verified posture documented → codebase grep-proof: `grep -q "Hook 3" tools/manual-story-studio/README.md && grep -q "Hook 2" tools/manual-story-studio/README.md && grep -q "lowercase" tools/manual-story-studio/README.md`.
4. Single-package skeleton ticket; no cross-skill invariant needs separate proof here — sibling tickets (002 fence registration, 003 sandbox semantics) prove their own invariants.

## What to Change

### 1. Create `tools/manual-story-studio/package.json`

```json
{
  "name": "@worldloom/manual-story-studio",
  "version": "0.1.0",
  "description": "Deterministic local writing cockpit: manual story records, external Markdown prompt composition, pasted-prose manuscript pipeline. No LLM, no MCP, no patch engine.",
  "private": true,
  "type": "module",
  "bin": {
    "manual-story-studio": "dist/src/cli.js"
  },
  "scripts": {
    "build": "npm --prefix web install --no-audit --no-fund && npm --prefix web run build && npm run build:backend",
    "build:backend": "tsc -p tsconfig.json",
    "test": "npm run build:backend && node --test \"dist/test/**/*.test.js\" && npm --prefix web test",
    "test:backend": "npm run build:backend && node --test \"dist/test/**/*.test.js\"",
    "clean": "rm -rf dist web/dist web/node_modules"
  },
  "dependencies": {
    "@fastify/static": "^8.0.0",
    "fastify": "5.6.2",
    "yaml": "2.9.0"
  },
  "devDependencies": {
    "@types/node": "25.9.0",
    "typescript": "6.0.3"
  },
  "engines": {
    "node": ">=22"
  }
}
```

### 2. Create `tools/manual-story-studio/tsconfig.json`

Mirror `tools/story-explorer/tsconfig.json` exactly — same `compilerOptions` (`target: ES2023`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `outDir: dist`, etc.), same `include` (`src/**/*`, `test/**/*`).

### 3. Create `tools/manual-story-studio/README.md`

Must contain these sections (header `# @worldloom/manual-story-studio`):

- **Purpose**: 2-paragraph summary — deterministic writing cockpit, external LLM, manual record state, no engine fidelity.
- **Stack**: Node ≥22, TypeScript, Fastify + `@fastify/static`, YAML; Vite + React frontend under `web/`. Explicitly notes the omitted dependencies (`@worldloom/patch-engine`, `@worldloom/world-mcp`, `better-sqlite3`) and the rationale (per SPEC-100 §3 Key decisions).
- **Write boundary**: explicit list of forbidden write destinations (`worlds/<slug>/stories/`, `worlds/<slug>/_source/`, `worlds/<slug>/characters/`, `worlds/<slug>/diegetic-artifacts/`, `worlds/<slug>/_index/`, `tools/story-explorer/`, `tools/patch-engine/`, `tools/world-index/`, `tools/world-mcp/`). Allowed: `worlds/<slug>/manual-stories/<manual-story-slug>/**` only.
- **Verified posture** (reproduce the reassessed SPEC-100 §2 item 8 content):
  - **Hook 3 (`tools/hooks/src/hook3-guard-direct-edit.ts:39-40`)**: path patterns only match `_source/` or `stories/<bundle>/_source/`. Manual Studio's `worlds/<slug>/manual-stories/**` surface is naturally outside Hook 3's pattern; the in-tool sandbox (ticket 003) is the primary write guard, Hook 3 the unrelated upstream guard.
  - **Hook 2**: two gating branches per the reassessed spec — (a) atomic-source-YAML gating at `isAtomicSourceYaml(relativePath)` (line 117), matching `_source/...*.yaml` and `stories/<bundle>/_source/...*.yaml`; (b) protected-markdown-filename gating via `ALWAYS_PROTECTED_FILES = {CANON_LEDGER.md}` and `THRESHOLD_PROTECTED_FILES = {MYSTERY_RESERVE.md, EVERYDAY_LIFE.md, INSTITUTIONS.md, OPEN_QUESTIONS.md, TIMELINE.md, GEOGRAPHY.md}` (per `tools/hooks/src/lib/size-thresholds.ts`). Manual Studio's per-file YAML records under `manual-stories/<slug>/records/<class>/*.yaml` escape (a); Manual Studio's chosen `.md` filenames (`manuscript.md`, `prompts/PROMPT-*.md`, `segments/SEG-*.md`) collide with neither protected set in (b). Reads are direct on both surfaces.
  - **World-index parser ID patterns** (per `tools/world-index/src/parse/story-directories.ts`): all uppercase (23 directory specs — `^STENT-[0-9]+$`, `^SE-[0-9]+$`, `^SLT-[0-9]+$`, etc.). STCHAR's uppercase pattern is enforced separately by the hybrid-record validator for `story-characters/STCHAR-*.md`, not by `story-directories.ts`. Manual Studio's lowercase `m`-prefix IDs (`mchar-*`, `mbel-*`, `mtemplate-*`, …) never match any of those regexes regardless of where they're enforced.
- **Run**: `node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root /path/to/worldloom` (CLI binary lands in ticket 006); Vite dev server on port 5176 proxies `/api/*` to backend port 5175 (mirror Story Explorer's 5173/5174 pattern; web frontend lands in ticket 008).
- **Build & test**: `npm test` chains `build:backend` + backend tests + `web test`.

### 4. Create `docs/manual-story-studio/README.md`

Single section explaining the directory's purpose:

> **Purpose**: this directory houses Manual Studio-specific renderer-contract files. SPEC-102 lands two files here:
> - `prose-craft-contract.md` — Manual Studio-specific prose craft contract (variant of `docs/prose-renderer-contract/prose-craft-contract.md`, with scene/page-specific references and diagnostic verdict language removed for Manual Studio's segment-cluster context).
> - `manual-render-instruction.md` — Manual Studio-specific render-time instruction (the existing `docs/prose-renderer-contract/render-time-instruction.md` is scene-range / PG-record specific and cannot be cleanly reused for Manual Studio).
>
> Only `docs/prose-renderer-contract/content-policy.md` is reused **verbatim** (inlined byte-for-byte into Manual Studio's external prompts per SPEC-102 §11). No content files yet — SPEC-102 ships the two Manual Studio variants.

## Files to Touch

- `tools/manual-story-studio/package.json` (new)
- `tools/manual-story-studio/tsconfig.json` (new)
- `tools/manual-story-studio/README.md` (new)
- `docs/manual-story-studio/README.md` (new)

## Out of Scope

- `tools/manual-story-studio/src/**` — no source modules in this ticket; subsequent tickets (002 write-scope-guard, 003 sandbox, 005 reads, 006 server, 007 routes, 008 frontend) land their own files.
- `tools/manual-story-studio/web/**` — frontend lands in ticket 008.
- `tools/manual-story-studio/test/**` — tests land alongside their respective module tickets.
- `tools/world-index/src/enumerate.ts` modification — ticket 004.
- Population of `docs/manual-story-studio/prose-craft-contract.md` and `manual-render-instruction.md` — SPEC-102's deliverable, not in this batch.

## Acceptance Criteria

### Tests That Must Pass

1. `test -d tools/manual-story-studio && test -f tools/manual-story-studio/package.json && test -f tools/manual-story-studio/tsconfig.json && test -f tools/manual-story-studio/README.md && test -d docs/manual-story-studio && test -f docs/manual-story-studio/README.md` — all paths resolve.
2. `node -e "const d = require('./tools/manual-story-studio/package.json'); if (d.name !== '@worldloom/manual-story-studio') process.exit(1); if (['@worldloom/patch-engine','@worldloom/world-mcp','better-sqlite3'].some(p => d.dependencies && d.dependencies[p])) process.exit(2)"` — exit 0.
3. `cd tools/manual-story-studio && npm run build:backend` — succeeds (compiles empty `src/` tree).
4. `grep -E "Hook 3.*hook3-guard-direct-edit" tools/manual-story-studio/README.md && grep -E "Hook 2.*atomic-source-YAML" tools/manual-story-studio/README.md && grep -E "lowercase.*m-prefix" tools/manual-story-studio/README.md` — verified-posture sections present.
5. `grep -E "content-policy\\.md.*verbatim" docs/manual-story-studio/README.md && grep -E "prose-craft-contract\\.md.*Manual Studio" docs/manual-story-studio/README.md && grep -E "manual-render-instruction\\.md.*Manual Studio" docs/manual-story-studio/README.md` — docs README distinguishes verbatim vs Manual Studio-specific files.

### Invariants

1. `tools/manual-story-studio/package.json` declares no dependency on `@worldloom/patch-engine`, `@worldloom/world-mcp`, or `better-sqlite3`. (Architectural invariant — Manual Studio operates outside the engine.)
2. The package README's verified-posture sections cite Hook 3 (`tools/hooks/src/hook3-guard-direct-edit.ts:39-40`), Hook 2's two gating branches, and the world-index uppercase-pattern catalogue — preserving the reassessed spec's verified-posture analysis at the implementation surface.

## Test Plan

### New/Modified Tests

1. `None — package skeleton ticket; verification is command-based (build + grep-proofs in Acceptance Criteria). Module-level tests land in tickets 002, 003, 005, 006, 007.`

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — confirms tsconfig + package.json compile cleanly.
2. `grep -E "Hook 3|Hook 2|lowercase" tools/manual-story-studio/README.md | wc -l` — confirms ≥3 verified-posture lines.
3. The full `cd tools/manual-story-studio && npm test` chain is not yet meaningful at this ticket (no source files and no `web/` tree); the capstone (ticket 009) is the chain's end-to-end gate.
