# SPEC-100 — Manual Story Studio: Package Boundary, Write Sandbox, Index Integration

**Status:** PROPOSED
**Date:** 2026-05-30
**Classification:** story-canon-related (introduces a new write surface under `worlds/<slug>/manual-stories/` adjacent to story-bundle territory; touches world-index enumeration; coexists with Hook 3 / Hook 2 path-guard surfaces; uses Worldloom-adjacent vocabulary deliberately segregated from engine-recognized ID classes).
**Depends on:** — (foundational spec for this initiative)
**Blocks:** SPEC-101 (which lists SPEC-100 as its sole hard predecessor in `specs/IMPLEMENTATION-ORDER.md`; the chain continues SPEC-101 → SPEC-102 → SPEC-103 → SPEC-104).
**Related:** `tools/story-explorer` (precedent for Fastify + read-only guard pattern; share UI tokens / disclosure components but not server identity), `tools/world-index/src/enumerate.ts` (extension point), `tools/hooks/` (verified compatibility).
**Source:** critical triage of `reports/manual-story-studio-first-iteration.md` §1 / §3 / §4 / §16 / §17 / §20 milestone M1 (ChatGPT-Pro, 2026-05-30). Accepted with one integration-gap modification (`enumerate.ts` exclusion) and verified-posture documentation for Hook 3 / Hook 2 / lowercase ID safety.

---

## 1. Context & Motivation

The author wants a deterministic, no-LLM, no-Claude-Code-skill writing cockpit that produces external Markdown prompts (for use with a third-party LLM the author copies prose back from) and stores manual record state, segments, and a compiled manuscript on disk. This is intentionally **outside** the Worldloom branching-story pipeline: no PG / SE / SCN / SLT records, no patch engine, no MCP runtime dependency, no validators that assume the branching-story state machine. The goal is speed of authoring, not engine fidelity.

The pipeline this spec creates lives at `tools/manual-story-studio/` (backend + web frontend, Fastify + Vite, mirroring Story Explorer's stack) and its content surface lives at `worlds/<slug>/manual-stories/<slug>/`. The boundary must be obvious to humans, to other tools, and to hooks — both directions. This spec establishes that boundary before anything reads or writes inside it.

ChatGPT-Pro's proposal is architecturally sound. The one verified gap: `tools/world-index/src/enumerate.ts:77-110` recursively walks the world directory tree, classifies any non-recognized file as `unexpected_path`, and writes a `validation_results` warn row per file at `tools/world-index/src/commands/shared.ts:551-571`. Left unaddressed, every Manual Studio file under `worlds/<slug>/manual-stories/` would emit one warn-severity validation row per file on each `world-index build/sync`. Noisy but not blocking; cleanly fixed by adding `manual-stories` to `enumerate.ts`'s `isExcludedPath()`.

## 2. Scope

### In scope

1. **Package skeleton at `tools/manual-story-studio/`.** Mirror Story Explorer's structure: `package.json` (name `@worldloom/manual-story-studio`, type `module`, Node `>=22`, deps `fastify` 5.6.2 + `@fastify/static` ^8.0.0 + `yaml` 2.9.0; **no `@worldloom/patch-engine`**, **no `@worldloom/world-mcp`**, **no `better-sqlite3`** unless §6 indexes spec is later added), `src/cli.ts` + `src/server/` + `src/read/` + `src/write/` + `src/validate/` + `src/prompt/` + `src/manuscript/` (later specs fill these), `web/` (Vite + React shell), `dist/` gitignored, `tsconfig.json` mirroring Story Explorer.
2. **Backend HTTP shell.** Fastify server registered with a **write-scope guard** (opposite-shape analogue of Story Explorer's `wrapRouterReadOnly` at `tools/story-explorer/src/server/readonly-guard.ts`). The guard registers POST / PUT / DELETE handlers only within an explicit "Manual Studio write scope" wrapper; any handler registered outside the wrapper that attempts a write throws at registration time, not at request time. Implementation lives at `tools/manual-story-studio/src/server/write-scope-guard.ts`.
3. **Realpath-based filesystem write sandbox.** Every write route receives logical IDs (world slug, manual story slug, record class, record id, segment id, prompt id), never a free-form path. The write layer at `tools/manual-story-studio/src/write/sandbox.ts` resolves the manual story root, resolves the target real path via `fs.realpathSync.native`, asserts the real path's `path.relative()` from the resolved manual story root contains no `..` segments, and rejects symlink escapes, absolute user-supplied paths, and `..` traversal before any write. Forbidden destinations are an explicit denylist applied to the resolved real path: `worlds/<slug>/stories/`, `worlds/<slug>/_source/`, `worlds/<slug>/characters/`, `worlds/<slug>/diegetic-artifacts/`, `worlds/<slug>/_index/`, `tools/story-explorer/`, `tools/patch-engine/`, `tools/world-index/`, `tools/world-mcp/`.
4. **`enumerate.ts` exclusion (load-bearing fix).** Update `tools/world-index/src/enumerate.ts:112` `isExcludedPath()` to also return `true` when `segments[0] === "manual-stories"`. This excludes the entire `worlds/<slug>/manual-stories/**` subtree from world-index enumeration before walk descends, so no Manual Studio file ever produces an `unexpected_path` warn row and `world-index build/sync` stays clean.
5. **`docs/manual-story-studio/` scaffold.** Create `docs/manual-story-studio/README.md` introducing the directory's purpose: SPEC-102 lands two Manual Studio renderer-contract files here — `prose-craft-contract.md` and `manual-render-instruction.md` — as Manual Studio-specific variants (the existing `docs/prose-renderer-contract/render-time-instruction.md` is scene-range / PG-record specific and cannot be cleanly reused for Manual Studio's segment-cluster context). Only `docs/prose-renderer-contract/content-policy.md` is reused verbatim (inlined byte-for-byte into Manual Studio's external prompts per SPEC-102). No content files yet — SPEC-102 ships the two Manual Studio variants.
6. **World picker + manual story list/create UI shell.** Web frontend at `tools/manual-story-studio/web/` (Vite + React, mirroring Story Explorer's frontend setup) implements only: world enumeration (reuse the read-only enumeration logic pattern from Story Explorer; reading `worlds/` directly is fine — no MCP, no world-index dependency for the world list), manual story list per selected world (reads `worlds/<world>/manual-stories/`), "Create Manual Story" form (slug + title), "Open" navigation stub. No record CRUD, no prompt generation, no prose paste yet — those are SPEC-101 / SPEC-102 / SPEC-103.
7. **Startup banner.** Backend logs and frontend dashboard display:
   ```
   Manual Story Studio
   Write root: worlds/<world>/manual-stories/<story>/
   World canon: read-only
   Normal story bundles: read-only
   External LLM: not connected
   ```
8. **Documented verified posture (in package README and `docs/manual-story-studio/README.md`).**
   - **Hook 3 (`tools/hooks/src/hook3-guard-direct-edit.ts:39-40`)** guards only paths matching `_source/` or `stories/<bundle>/_source/`. Manual Studio's write surface at `worlds/<slug>/manual-stories/**` is naturally outside Hook 3's pattern; Manual Studio's in-tool write sandbox is the primary guard, Hook 3 the unrelated upstream guard.
   - **Hook 2 (`tools/hooks/src/hook2-guard-large-read.ts`)** has two gating branches: (a) atomic-source-YAML gating at `isAtomicSourceYaml(relativePath)` — matches `_source/...*.yaml` and `stories/<bundle>/_source/...*.yaml`, redirecting oversized reads to MCP; (b) protected-markdown-filename gating against the closed sets `ALWAYS_PROTECTED_FILES = {CANON_LEDGER.md}` and `THRESHOLD_PROTECTED_FILES = {MYSTERY_RESERVE.md, EVERYDAY_LIFE.md, INSTITUTIONS.md, OPEN_QUESTIONS.md, TIMELINE.md, GEOGRAPHY.md}` (per `tools/hooks/src/lib/size-thresholds.ts`). Manual Studio's per-file YAML records under `manual-stories/<slug>/records/<class>/*.yaml` are outside the `_source/` prefix and so escape branch (a); Manual Studio's chosen `.md` filenames (`manuscript.md`, `prompts/PROMPT-*.md`, `segments/SEG-*.md`) collide with neither protected set in branch (b). Reads are direct on both surfaces.
   - **World-index parser ID patterns** (per `tools/world-index/src/parse/story-directories.ts`) are all uppercase: `^STENT-[0-9]+$`, `^SE-[0-9]+$`, `^SLT-[0-9]+$`, etc. — 23 directory specs in that file. STCHAR's uppercase pattern (`^STCHAR-[0-9]+$`) is enforced separately by the hybrid-record validator for `story-characters/STCHAR-*.md`, not by `story-directories.ts`. Manual Studio's lowercase IDs (`mchar-*`, `mbel-*`, `mtemplate-*`, etc., per SPEC-101 / SPEC-104) never match any of those regexes regardless of where they're enforced; even without the `enumerate.ts` exclusion (item 4 above), no ID collision is structurally possible. The `enumerate.ts` exclusion is the warn-noise fix, not an identity-safety fix; identity safety is by-construction via case discipline.

### Out of scope

- Manual record class schemas, CRUD routes, manual character profile schema, dashboard widgets — SPEC-101.
- Prompt composer, content-policy verbatim reuse, prompt lint, Manual Studio prose-craft / render-time docs — SPEC-102.
- Prose paste, segment storage, manuscript compilation, state-update checklist — SPEC-103.
- Beat templates, deterministic filtering, candidate UI — SPEC-104.
- Read-only canon/character lookup helpers, manual canon-import flows, optional rebuildable indexes — M6 deferral (post-SPEC-104 tickets as needed).
- LLM calls inside Manual Studio, automatic state extraction from pasted prose, branching, patch-engine writes, Story Explorer write integration — rejected by design intent.
- Modification of Story Explorer to weaken its read-only guard — explicitly forbidden.

## 3. Key decisions

- **Write-scope guard is the inverse of Story Explorer's read-only guard.** Story Explorer wraps its router so only GET / HEAD register; Manual Studio wraps its router so write methods register only inside an explicit `wrapRouterWritable` scope. Symmetric pattern, opposite polarity.
- **`enumerate.ts` exclusion is the canonical fix, not a per-tool ignore-list.** Adding `manual-stories` to `isExcludedPath()` is one line, structurally correct (the directory is not part of the world-index inventory), and avoids a per-build noise stream. Alternative considered and rejected: leave the warn rows in place. Rejected because each world build/sync would accumulate dozens-to-hundreds of warn rows, eroding signal in real validation warnings.
- **In-tool sandbox is the primary write guard; Hook 3 is unrelated upstream.** Hook 3's pattern-coverage of `_source/` does not extend to `manual-stories/` and should not be extended — Hook 3 protects engine-only-write surfaces; Manual Studio is not an engine-only-write surface. Manual Studio's in-tool realpath check + denylist is the right layer.
- **No `@worldloom/world-mcp` dependency.** Reads are direct file reads. World canon for read-only display (later specs) uses direct file reads of `worlds/<slug>/WORLD_KERNEL.md` and hybrid files under `characters/` / `diegetic-artifacts/`; atomic `_source/` records are not read in MVP. This honors §Tooling Recommendation indirectly by externalizing the LLM rather than serving it canon at runtime.
- **Lowercase IDs are an identity-safety measure, not a regex-evasion trick.** The lowercase prefix is documented as case discipline that makes the boundary visible to humans reading file trees too. World-index pattern safety follows automatically.
- **`worlds/<slug>/manual-stories/` placement, not a top-level `manual-stories/` directory.** Manual stories belong to a world (they read world canon, they share cast with world characters, their narrative space is bounded by world invariants). Placing them under the world makes provenance obvious. The world-index integration cost is the one-line `enumerate.ts` exclusion (already in scope).

## 4. Files to touch

**Create (new package):**

- `tools/manual-story-studio/package.json` — name `@worldloom/manual-story-studio`, scripts `build` / `build:backend` / `test` / `test:backend` / `clean` mirroring Story Explorer's package, deps `fastify@5.6.2` + `@fastify/static@^8.0.0` + `yaml@2.9.0`, devDeps `@types/node@25.9.0` + `typescript@6.0.3`, engines `node >=22`, `bin: { "manual-story-studio": "dist/src/cli.js" }`, `type: module`.
- `tools/manual-story-studio/tsconfig.json` — mirror Story Explorer.
- `tools/manual-story-studio/src/cli.ts` — argv parsing (`--port`, `--repo-root`), repo-root resolution, server start.
- `tools/manual-story-studio/src/server/http.ts` — Fastify server, register routes, serve `web/dist/` if present (mirror Story Explorer's `http.ts:93` pattern).
- `tools/manual-story-studio/src/server/write-scope-guard.ts` — `wrapRouterWritable(server, registerFn)` opposite-shape analogue of `tools/story-explorer/src/server/readonly-guard.ts`.
- `tools/manual-story-studio/src/write/sandbox.ts` — `resolveManualStoryRoot(repoRoot, worldSlug, manualStorySlug)` + `assertInsideSandbox(realPath, manualStoryRoot)` + denylist check.
- `tools/manual-story-studio/src/read/worlds.ts` — direct enumeration of `worlds/` (reuse pattern from Story Explorer's world list, no DB).
- `tools/manual-story-studio/src/read/manual-stories.ts` — enumeration of `worlds/<world>/manual-stories/` per world.
- `tools/manual-story-studio/src/server/routes/worlds.ts` — `GET /api/worlds`.
- `tools/manual-story-studio/src/server/routes/manual-stories.ts` — `GET /api/worlds/:slug/manual-stories`, `POST /api/worlds/:slug/manual-stories` (create new manual story directory with empty `manual-story.yaml`).
- `tools/manual-story-studio/web/package.json`, `web/vite.config.ts`, `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/pages/Worlds.tsx`, `web/src/pages/ManualStories.tsx`, `web/src/pages/CreateManualStory.tsx` — Vite + React frontend shell with world picker + manual story list/create. Mirror Story Explorer's frontend setup.
- `tools/manual-story-studio/README.md` — purpose, stack, write-scope guard, sandbox, startup banner, run instructions.
- `docs/manual-story-studio/README.md` — purpose of the docs subdirectory; SPEC-102 lands prose-craft and render-time files here.

**Modify:**

- `tools/world-index/src/enumerate.ts:112` — extend `isExcludedPath()` to return `true` when `segments[0] === "manual-stories"`. One added condition; place after the `_index` exclusion at line 116-118 for visual proximity.
- `tools/world-index/test/enumerate.test.ts` (or equivalent) — add a fixture-based test: a world directory containing `manual-stories/<slug>/manual-story.yaml` enumerates to no `unexpected` entries and no `indexable` additions; world-build is clean.

**No modification to:**

- `tools/hooks/` — no changes; Manual Studio's surface is naturally outside Hook 3 / Hook 2 path patterns by construction.
- `tools/story-explorer/` — no changes; Story Explorer stays read-only. Visual tokens / disclosure components / route-error UI may be **copied** into Manual Studio's `web/` (not imported as a runtime dependency) in later specs; that copying is out of scope here.
- `tools/patch-engine/` — no changes; Manual Studio does not route through the engine.
- `tools/world-mcp/` — no changes; Manual Studio does not consume MCP.
- `tools/validators/` — no changes; Manual Studio's validators (SPEC-101 / SPEC-102) live in `tools/manual-story-studio/src/validate/`.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Canonical Storage Layer engine-only-write discipline | aligns | Manual Studio's write surface is entirely outside `_source/` (sandbox surface + `enumerate.ts` exclusion + Hook 3 unaffected); the patch engine remains the sole writer of `_source/<world-subdir>/*.yaml` and `stories/<bundle>/_source/<class>/*.yaml`. |
| §Tooling Recommendation (LLM agents never operate on prose alone) | aligns @ externalized-LLM packet | Manual Studio's LLM is external; the §10 / §11 prompt composer (SPEC-102) delivers world contract + cast + records + content-policy verbatim in the external Markdown packet, realizing §Tooling Recommendation's intent across a process boundary. |
| §Story Bundles §4a Plan-Authority Boundary (rendered prose is non-authoritative) | aligns @ paste-as-manuscript-not-state | Manual Studio treats pasted prose as durable manuscript text under `segments/SEG-<n>.md` (SPEC-103), never inferred as state; record updates are explicit author action via the state-update checklist (SPEC-103). |
| §Story Bundles §9 Prose Length Discipline (no word-count quotas) | aligns @ prompt-stop-rule | Manual Studio's external prompt format (SPEC-102 §11) uses a stop-at-first-materially-new-response-point rule, not a word-count quota; length follows content. |
| §Story Bundles §4 Write Discipline (Hook 3 blocks direct edit/write to `_source/`) | aligns @ surface-separation | Manual Studio's `manual-stories/` surface is naturally outside Hook 3's path patterns; the in-tool sandbox provides defense-in-depth against accidental cross-surface writes. |
| §Story Bundles §6 Story-Bundle ID Classes (uppercase `^STENT-[0-9]+$`-style patterns) | aligns @ case-discipline | Manual Studio uses lowercase `m`-prefixes (`mchar-`, `mbel-`, `mtemplate-`); no regex collision with world-index story-directory patterns at any surface. |
| Rule 5 No Consequence Evasion | N/A @ acknowledged-second-order-effect | The `enumerate.ts` exclusion has one acknowledged second-order effect (one fewer `unexpected_path` warn row per Manual Studio file per `world-index build/sync`), addressed explicitly in §3 Key decisions as a desirable noise reduction. No canon-pipeline second-order effects: Manual Studio writes no canon, reads no canon `_source/`, makes no MCP / patch-engine calls. |
| Rule 6 No Silent Retcons | N/A @ green-field-no-canon-mutation | Manual Studio is a green-field tool that mutates no canon, emits no Change Log Entry, and triggers no retcon path. The `enumerate.ts` modification is reversible by removing the one added condition; no audit trail is required because no canon history changes. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` runs `npm run build:backend && node --test dist/test/**/*.test.js && npm --prefix web test`. `tools/world-index`: re-run `npm test` after the `enumerate.ts` modification to confirm no regressions; add the new enumerate test for the `manual-stories/` exclusion.

Cold-start manual run: `node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root /home/joeloverbeck/projects/worldloom`. Open `http://127.0.0.1:5175`; verify world picker lists known worlds, manual story list is empty for any world initially, creating a manual story under `erotica-world` writes `worlds/erotica-world/manual-stories/<slug>/manual-story.yaml`, and a `world-index build erotica-world` immediately afterward emits zero `unexpected_path` warnings.

## 7. Acceptance criteria

1. `tools/manual-story-studio/` package builds and `npm test` passes.
2. Backend exposes `GET /api/worlds`, `GET /api/worlds/:slug/manual-stories`, `POST /api/worlds/:slug/manual-stories`; no other routes registered.
3. Attempting to register a POST route outside `wrapRouterWritable` throws at registration time (tested).
4. Write sandbox rejects symlink escapes, `..` traversal, and absolute user-supplied paths; tested with synthetic malicious inputs.
5. `tools/world-index/src/enumerate.ts` excludes `manual-stories/` subtree; a fixture world with `manual-stories/<slug>/manual-story.yaml` enumerates to zero `unexpected` entries (tested).
6. Running `world-index build <world>` after creating a manual story emits zero `unexpected_path` warn rows for that world.
7. Frontend world picker enumerates worlds, manual story list shows manual stories per world, "Create Manual Story" writes a minimal `manual-story.yaml` and returns to the list view.
8. Startup banner appears in backend logs and frontend dashboard.
9. Package README documents the verified Hook 3 / Hook 2 / lowercase-ID posture.

## 8. Risks & Open Questions

- **No `@worldloom/world-mcp` dependency means no canon retrieval helper in MVP.** SPEC-101's dashboard widgets and SPEC-102's prompt composer rely on direct file reads of `WORLD_KERNEL.md` and hybrid files. If canon read patterns get heavy in later specs, an MCP dependency might be re-evaluated then; not now.
- **Story Explorer UI component reuse is copy, not import.** Manual Studio's `web/` will duplicate visual tokens / disclosure components / route-error UI from Story Explorer's `web/` rather than depending on a shared package. A future shared package (`tools/worldloom-ui-shared/` or `tools/world-read/`) is a reasonable consolidation once Manual Studio has proven its shape — explicitly out of scope here per the proposal §17.
- **Web dev mode pairing.** Vite dev server on port 5176 proxies `/api/*` to backend on port 5175 (mirror Story Explorer's 5173 / 5174 pattern). README documents the dual-terminal flow.
- **No `world-index` runtime dependency**, even though Story Explorer has one. Manual Studio's world picker reads `worlds/` directly because Manual Studio's content surface is outside the world index; depending on the index would couple Manual Studio to an unrelated build artifact. The cost (no FTS-backed search of manual records) is acceptable for MVP and is folded into the M6 deferral.
