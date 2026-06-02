# SPEC-115 — Manual Story Studio: Deterministic Read-Only World Source Browser

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (new read-only world-read layer + new frontend browser pane; no canon-pipeline integration, read-only, no MCP).
**Depends on:** archive/specs/SPEC-100-manual-story-studio-package-boundary.md (the read/write sandbox; this spec adds a *read-only* world-source reader strictly outside the write sandbox), SPEC-112 (the copy-into-story-record form reuses `RecordForm` + `RecordCardMini`).
**Blocks:** —
**Related:** `tools/manual-story-studio/src/read/worlds.ts`, `tools/manual-story-studio/src/read/`, `tools/manual-story-studio/src/server/routes/`, `tools/manual-story-studio/web/src/pages/Worlds.tsx`, `tools/manual-story-studio/web/src/pages/`.
**Source:** critical triage of `reports/manual-story-studio-third-iteration.md` §15 / §34 / §39 Stage 6 (ChatGPT-Pro, 2026-06-02). Accepted: verified "largest underbuilt area" — the world read layer (`src/read/worlds.ts`) only enumerates world slugs that have a `WORLD_KERNEL.md`; it exposes no `_source/`, characters, diegetic artifacts, sections, mysteries, or open questions, and the Worlds page lists slugs only. This is the surface that lets Manual Studio replace the branching skills' automatic distillation by making *manual* reading + record creation fast.

---

## 1. Context & Motivation

Verified: `src/read/worlds.ts` returns `{ worldSlug, absolutePath, hasWorldKernel }` per world and nothing more; the server registers no route for browsing world `_source/`, characters, or artifacts; `Worlds.tsx` renders a list of slugs linking to manual-stories. So when an author needs to ground a story record in world canon, they must leave the tool, open the repo, read raw YAML, and copy facts back by hand.

The product premise (report §15) is that Manual Studio does **not** auto-distill world canon into story records (no semantic extraction, no transformation, no MCP — report §8/§38). Instead it makes the *manual* path fast: a read-only world Source Browser on the left, the story-local Record Workbench on the right, with "select world text → copy literal text into a story record field" as the core gesture. This keeps the author fully in control (the human-LLM co-writing and local-first research the report cites in §27 supports this) while removing the biggest friction in starting a story.

This is the largest single build in this iteration and is sequenced **last** (it has no other spec as a prerequisite beyond SPEC-112's card/form reuse, and the smaller ergonomic specs deliver value sooner).

### 1.1 Reading `_source/` directly is acceptable here

The repo's general rule "never read `_source/` subdirectories in bulk; use typed retrieval" and Hook 2's oversized-`_source/`-read redirect govern the **Claude Code agent / skill layer** operating inside the canon-mutation pipeline. Manual Studio is a **separate, standalone, read-only Fastify app** that the report (§8) explicitly argues must *not* take an MCP/world-index runtime dependency (latency, stale-index risk, failure modes, mental overhead for zero core-loop benefit). A read-only browser reading world files directly off disk is the sanctioned design for this tool. The safety obligations are: (a) reads are strictly read-only (no write path touches world canon — the existing write sandbox already denylists `_source/`, characters, diegetic-artifacts); (b) the browser surfaces world material as **literal text for the author to read and selectively copy**, never as auto-extracted "facts" (preserving the Diegetic-to-World firewall discipline the canon pipeline enforces elsewhere — Manual Studio must not launder narrator-voice artifact text into asserted story facts automatically; the author does the judging).

## 2. Scope

### In scope

1. **Read-only world-source read layer.** New reader(s) under `src/read/` that, for a given world slug, enumerate and read (read-only, parse-tolerant with structured errors per SPEC-105):
   - root files: `WORLD_KERNEL.md`, `ONTOLOGY.md`;
   - `_source/` subdirectories the report names: canon, invariants, mystery-reserve, open-questions, timeline, geography, peoples-and-species, institutions, economy-and-resources, magic-or-tech-systems, everyday-life (enumerate what exists; do not hard-fail on a world missing a given subdir);
   - `characters/` (CHAR dossiers) and `diegetic-artifacts/` (DA).
   Each item is surfaced as `{ kind, path, title/name (if parseable), tags/class (if present), raw_text }`. **No semantic extraction, no transformation, no sync, no provenance write-back** (report §34, §38).
2. **Deterministic search** over the enumerated world material: literal text, title/name, tags, class, filename. Client-side or server-side filter (pick the lower-churn responsive option; a world is bounded enough that loading summaries + on-demand raw text is fine — mirror SPEC-112's no-index decision).
3. **Two-pane browser UI.** Replace/extend `Worlds.tsx` (and/or a new per-story Source Browser page) into: left = world source browser (tree/list by kind + search + read-only record view); right = story-local Record Workbench (the existing record forms). Affordances: open a world record read-only; **select literal text → copy into a story record field**; copy a simple field (title/name) into a story record. The author then creates a story `fact`/`belief`/`location`/`object`/`character` via the existing `RecordForm` (SPEC-112 pickers apply) — the browser pre-fills the copied text into the chosen field; the author edits and saves.
4. **Strict read-only guarantee.** The world-source routes are **read-only** (GET only) and must register outside any writable scope; they must never expose a write/edit/copy-*to-world* path. Reuse the route write-scope guard to assert no write method is registered for world-source routes. World paths are resolved from a validated world slug, never from a raw filesystem path in a request body (consistent with archived SPEC-116's containment discipline — applied here on the read side from the start).

### Out of scope

- Any **write** to world canon, characters, diegetic artifacts, or `_source/` (the write sandbox already forbids this; this spec does not add an exception).
- **Automatic** semantic extraction / fact distillation / transformation / provenance pointers (report §15, §34, §38: "No semantic extraction. No sync. No provenance required." A `source_world_character` pointer remains optional/informational per the existing schema — the validator already skips it).
- MCP / world-index runtime dependency (report §8 — explicitly rejected).
- A required provenance ledger linking story records to world sources (report §38: "No default. Optional notes are enough." — the author may hand-note a source in the record `notes` field; nothing is auto-written).
- Editing world files in any way.

## 3. Key decisions

- **Read-only, direct filesystem, no index.** Matches the report's repeated guidance (§8/§27/§38) and the package boundary. A read-only browser cannot violate the write sandbox, and direct reads avoid the stale-index/latency cost of MCP for a bounded per-world dataset.
- **Literal text, author-judged — never auto-distillation.** The browser's value is making manual reading + selective copy fast; it deliberately does *not* infer facts from world text. This preserves, at the tooling layer, the Diegetic-to-World firewall the canon pipeline enforces (narrator-voice artifact text is not silently promoted to asserted story truth).
- **Copy fills a form field; the author saves.** "Copy literal text → story record field" pre-fills; nothing persists until the author saves the story record through the existing (sandbox-contained) write path. No new write surface.
- **Enumerate-what-exists, fail-soft.** Worlds vary in which `_source/` subdirs they have; the browser lists what's present and surfaces structured errors for unparseable files (SPEC-105 discipline) rather than hard-failing the whole browse.
- **Sequenced last.** Largest build, no downstream blocker; the smaller ergonomic specs (112/113/114) and the security fix (116) deliver value first.

## 4. Files to touch

**Create:**

- `tools/manual-story-studio/src/read/world-source.ts` — read-only enumeration + parse-tolerant read of root files, `_source/` subdirs, characters, diegetic-artifacts for a given world slug (§2 item 1).
- `tools/manual-story-studio/src/server/routes/world-source.ts` — **GET-only** routes for listing/searching/reading world source, registered outside any writable scope.
- `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` — the two-pane browser + copy-into-record gestures (§2 item 3).
- `tools/manual-story-studio/web/src/api/world-source.ts` — read-only client for the new routes.
- `tools/manual-story-studio/test/read/world-source.test.ts` — enumeration covers the named `_source/` subdirs + characters + diegetic-artifacts; missing subdir is fail-soft; unparseable file yields a structured error; **no write path exists**.
- `tools/manual-story-studio/test/server/world-source-readonly.test.ts` — asserts the world-source routes are GET-only and that no value in a request body can cause a read outside the resolved world root (slug-resolved paths only; absolute/`..` rejected).

**Modify:**

- `tools/manual-story-studio/src/read/worlds.ts` — keep the slug enumeration; the new reader builds on it (no behavior change to existing callers).
- `tools/manual-story-studio/web/src/pages/Worlds.tsx` and/or App routing — add the Source Browser entry point (a per-story "Source Browser" page is cleaner than overloading the top-level Worlds list; mount it alongside the other per-story pages via SPEC-111's `StoryPageNav`).
- `tools/manual-story-studio/web/src/index.css` — two-pane browser styling.

**No modification to:** the write sandbox denylist (world canon stays write-forbidden), record schema, prompt/segment pipelines. **No new write surface anywhere.**

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Canonical Storage Layer / Hook 3 write discipline | aligns @ read-only world access | The browser is strictly read-only; it never writes world canon, characters, diegetic artifacts, or `_source/`. The existing write-sandbox denylist remains the authority; this spec adds only GET routes outside the writable scope. |
| Diegetic-to-World firewall (no auto-laundering of artifact/narrator text into asserted facts) | aligns @ author-judged copy | The browser surfaces world/artifact text as literal material the author reads and selectively copies; it performs **no** automatic extraction or promotion of narrator-voice content into story facts. The author does the judging — the firewall the canon pipeline enforces is honored at the tooling layer. |
| §Soft Canon / Local Truth (explicit + validated) | aligns @ copy-fills-form | Copied literal text pre-fills a story-record form field; nothing persists until the author saves through the existing validated write path, so story records remain explicit author assertions. |
| §Tooling Recommendation (no unnecessary index/runtime coupling) | aligns @ direct read-only reads | Reading bounded per-world material directly (no MCP/world-index) avoids stale-index and latency failure modes for zero core-loop benefit, per report §8/§27/§38. |
| §world-canon vs story-bundle execution state (FOUNDATIONS line 105) | N/A @ tooling-adjacent | Reading world canon does not write it; story records remain under `manual-stories/`, outside world canon and the story-bundle pipeline. |

## 6. Build & test

`tools/manual-story-studio`:
- `npm run test:backend` runs the world-source enumeration + read-only-route tests under `node --test` (use a fixture world tree under `test/` covering present + missing `_source/` subdirs and an unparseable file).
- `npm --prefix web test` (web `tsc --noEmit`) covers the SourceBrowser page + copy-into-record gesture types.
- `npm test` runs both; `npm run build` must succeed.

## 7. Acceptance criteria

1. **PASS rationale required.** For a fixture world, the source reader enumerates `WORLD_KERNEL.md`, `ONTOLOGY.md`, the present `_source/` subdirs, `characters/`, and `diegetic-artifacts/`, and a missing subdir does not hard-fail the browse — verified by a fixture-driven test.
2. Search filters world material by literal text / title / tags / class / filename.
3. The author can open a world record read-only and copy selected literal text into a story-record form field, then save the story record through the existing sandbox-contained write path.
4. **No write path to world canon exists**: a test asserts the world-source routes are GET-only and registered outside the writable scope, and that no request-body value reads outside the resolved world root.
5. No automatic extraction/transformation/provenance-write occurs — copy is literal and author-initiated; nothing is auto-promoted to a story fact.
6. An unparseable world file surfaces a structured error (SPEC-105 discipline), not a crash or silent skip.
7. `npm test` is green; `npm run build` succeeds.
