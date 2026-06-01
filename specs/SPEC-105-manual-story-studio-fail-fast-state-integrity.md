# SPEC-105 — Manual Story Studio: Fail-Fast State Integrity + Health Endpoint

**Status:** PROPOSED
**Date:** 2026-06-01
**Classification:** tooling-adjacent (`tools/manual-story-studio` explicitly disclaims `No LLM, no MCP, no patch engine`; no canon-pipeline integration). Lands per the parallel writing-cockpit tie-break in the brainstorm skill.
**Depends on:** — (foundational; unblocks SPEC-108 / SPEC-109 / SPEC-111).
**Blocks:** SPEC-108 (segment lifecycle relies on typed-error reads), SPEC-109 (current-context layer relies on typed-error reads), SPEC-111 (UX cockpit consumes the new `/health` endpoint).
**Related:** `tools/manual-story-studio/src/read/`, `tools/manual-story-studio/src/server/routes/`, `tools/manual-story-studio/web/src/`, `scripts/build-all.sh`, `scripts/check-all.sh`.
**Source:** critical triage of `reports/manual-story-studio-second-iteration.md` §§5 / 7 / 16 / 17 / 18 / 19 / 31 Stage 1 (ChatGPT-Pro, 2026-06-01). Accepted with modification: scope bundles the `build-all.sh` / `check-all.sh` inclusion (report §7 / §17) into this foundational spec because "local all-green covers Manual Studio" is integrity discipline, not a separate concern.

**Implementation note (2026-06-01, SPEC105MANSTOSTU-007):** `readManuscript` now returns `ReadResult<ManuscriptReadResult>` with an explicit `manuscript_present` flag, and `compileManuscript` now returns `ReadResult<CompileManuscriptResult>` using the migrated metadata and segment read helpers. Draft-era statements below that describe `manuscript/compile.ts` as still doing raw `readFileSync` + `YAML.parse` are historical intake context for ticket 007, not the current implementation state.

**Implementation note (2026-06-01, SPEC105MANSTOSTU-010):** Manual Story Studio now exposes `GET /api/worlds/:world/manual-stories/:story/health` through `tools/manual-story-studio/src/server/routes/health.ts`, registered from `src/server/http.ts` inside the read-route scope. Draft-era statements below that say the package has no `/health` endpoint are historical intake context, not the current implementation state.

**Implementation note (2026-06-01, SPEC105MANSTOSTU-011):** The web frontend now has a local `HealthReport` type mirror, `/health` API wrapper, `useStoryHealth` hook, and `HealthBanner` mounted at App level. The banner parses the per-story URL prefix with `useLocation()` because the App-level mount sits outside the matched `<Routes>` element.

**Implementation note (2026-06-01, SPEC105MANSTOSTU-012):** The seven frontend `.catch(() => {})` silent-swallow sites in `Dashboard.tsx` and `MomentComposer.tsx` have been replaced with explicit panel-level error states and retry buttons. The Dashboard manuscript absent-vs-failed handler remains as the intentional optional-read distinction.

---

## 1. Context & Motivation

The current Manual Story Studio read layer treats every YAML parse failure, every missing-or-malformed sidecar, and every unreadable file as `null`, empty list, or "not found." Verified examples in the live tree:

- `tools/manual-story-studio/src/read/manual-story-metadata.ts:8-21` — `readManualStoryMetadata` returns `null` on missing file, parse exception, or non-object YAML.
- `tools/manual-story-studio/src/read/records.ts:32-43` — `listRecords` continues past parse failures (`if (parsed === null) continue;`) and silently drops records missing a required summary field.
- `tools/manual-story-studio/src/read/records.ts:50-69` — `readRecord` returns `null` on invalid ID shape, missing file, or parse exception.
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx:67,72,77,101` and `tools/manual-story-studio/web/src/pages/MomentComposer.tsx:66,71,89` — 7 occurrences of `.catch(() => {})` that swallow backend integrity failures behind empty/loading states.

This violates the cockpit's fail-fast model: an author opening a dashboard cannot distinguish "no records exist" from "every record file is malformed." Corruption is rendered as absence, which is the precise failure mode FOUNDATIONS Rule 6 (No Silent Retcons) flags as load-bearing for canon discipline and which the report §16 calls out as the "biggest correctness failure."

Two further integrity gaps verified:

- `scripts/build-all.sh` and `scripts/check-all.sh` make no reference to `tools/manual-story-studio` (verified via grep). Local "all green" is currently misleading because the package is excluded from the monorepo's local-check path even though dedicated CI exists.
- The package has no `/health` endpoint; every page handles failure ad hoc; there is no shared backend → frontend integrity contract.

This spec is the foundational integrity fix. It establishes (a) a structured health model, (b) typed errors out of the read layer, (c) surfaced frontend error states, and (d) inclusion in the monorepo all-green path. It is a prerequisite for SPEC-108 (segment lifecycle changes presume typed-error reads exist), SPEC-109 (current-context consumes the read-layer contract), and SPEC-111 (the cockpit UX consumes `/health`).

## 2. Scope

### In scope

1. **Structured health model.** Add `src/health/types.ts` with the canonical health shape:
   ```ts
   export type HealthStatus = "ok" | "degraded" | "blocked";
   export type HealthSeverity = "info" | "warn" | "error" | "blocking";
   export interface HealthFinding {
     severity: HealthSeverity;
     code: string;          // stable kebab-case code, e.g. "metadata-yaml-parse-failed"
     path: string;          // repo-relative path to the offending file
     message: string;       // human-readable summary
     repair_hint: string;   // actionable next step
   }
   export interface HealthReport {
     status: HealthStatus;
     findings: HealthFinding[];
     blocked_actions: Array<"prompt_copy" | "prompt_save" | "segment_save" | "manuscript_compile">;
   }
   ```
   `status` is derived from finding severities: any `blocking` finding → `blocked`; otherwise any `error` → `degraded`; otherwise `ok`. `blocked_actions` lists which cockpit operations the current health state disables.

2. **`GET /api/worlds/:world/manual-stories/:story/health` route.** New route at `src/server/routes/health.ts`. Walks the manual story directory and runs three integrity passes:
   - **Pass 1 (file integrity):** YAML parses for `manual-story.yaml`, every `records/<class>/<id>.yaml`, every `segments/SEG-<n>.yaml`, every `prompts/PROMPT-<n>.yaml` and its `.md` sidecar pair; required files exist; IDs match filenames; no duplicate IDs.
   - **Pass 2 (schema integrity):** Records validate against their per-class schema; metadata validates; sidecars validate.
   - **Pass 3 (reference integrity):** Typed refs resolve; selected prompt records exist and are active; segment evidence refs resolve.
   Each failure emits a structured `HealthFinding`. Pass 1 failures are `blocking`; Pass 2/3 are `error` or `warn` depending on whether the affected surface is reachable without resolution.

3. **Read-layer error typing.** Replace silent-null returns with a discriminated result type. New `src/read/result.ts`:
   ```ts
   export type ReadResult<T> =
     | { ok: true; value: T }
     | { ok: false; error: ReadError };
   export interface ReadError {
     code: string;
     path: string;
     cause?: unknown;
     repair_hint: string;
   }
   ```
   Update every PUBLIC exported read function in `src/read/*.ts` to return `ReadResult<T>` instead of `T | null`:
   - `readManualStoryMetadata` → `ReadResult<ManualStoryMetadata>` (currently in `read/manual-story-metadata.ts`).
   - `listRecords` → `ReadResult<ManualRecordSummary[]>`, `readRecord` → `ReadResult<ManualRecordOfClass<C>>`, `scanReferences` → `ReadResult<ReferrerEntry[]>`, `listAllKnownIds` → `ReadResult<KnownIds>` (currently in `read/records.ts`).
   - `listSegments` → `ReadResult<SegmentListEntry[]>`, `readSegmentSidecar` → `ReadResult<SegmentSidecar>`, `readSegmentBody` → `ReadResult<string>` (currently in `read/segments.ts` — note the actual export names verified at `tools/manual-story-studio/src/read/segments.ts:27,53,66`; the spec previously named `listSegmentSidecars` / `readSegment`, neither of which exists in the live tree).
   - `readManuscript` → `ReadResult<ManuscriptReadResult>` (currently in `read/manuscript.ts` — note the backend type is `ManuscriptReadResult`, not the frontend API serialization type `ManuscriptResponse`).
   - The manual-story-list and world-list enumerators in `read/manual-stories.ts` and `read/worlds.ts` likewise migrate from `T | null` to `ReadResult<T>` so a corrupt sibling manual story does not silently disappear from the world's manual story list.

   Internal private helpers in `src/read/*.ts` (`parseYamlFile`, `toSummary`, `isSegmentSidecar`, `parseSegmentSidecar`) may continue to return `T | null` inside their module as a parse-or-null shape; their public callers translate the null into a `ReadResult` `ok: false` with the appropriate `ReadError.code`. The contract surface is the public export list above; internal helpers are an implementation detail of each module's parsing pipeline.

   Convert raised `YAML.parse` / `readFileSync` exceptions into `ReadError` at the read-layer boundary; callers receive structured failure information instead of swallowed exceptions.

   Existing callers within the package — the prompt composer, the state-update checklist builder, the manuscript compiler, and every write-side / route-side consumer per §4 Modify — update to handle the result type. Where a missing file is genuinely valid (e.g., optional sidecar absent before first compile), callers may explicitly downgrade to a no-op; where corruption is fatal, callers propagate the error to the route layer which translates it to `409` or `500` per §3 Key decisions.

4. **HTTP status code discipline.** Route behavior:
   - `200` only when requested data is valid.
   - `404` only for genuinely-absent manual story or record.
   - `409` for blocked health state (corrupt YAML, schema violation, ref break) on a read or write attempt — the response body carries the `HealthReport` shape so the frontend can render specific findings.
   - `422` for invalid write input (schema validation failure on submitted payload).
   - `500` only for unexpected server errors not captured by the above.

   **Per-`ReadError.code` → HTTP status mapping.** The read-layer error codes are stable kebab-case strings emitted by the read-layer boundary (per §2 item 3); the route layer maps each to an HTTP outcome as follows:

   | `ReadError.code` | HTTP status | Body |
   | --- | --- | --- |
   | `file_not_found` (genuine absence) | `404` | `{ error: "not_found" }` |
   | `invalid_id_shape` | `400` | `{ error: "bad_request", reason }` |
   | `yaml_parse_failed` | `409` | `HealthReport` |
   | `schema_validation_failed` | `409` | `HealthReport` |
   | `reference_unresolved` | `409` | `HealthReport` |
   | `io_error` (unexpected) | `500` | `{ error: "internal_error" }` |

   The mapping is deterministic — given a `ReadError.code`, the route layer always returns the same status. Routes never invent a status for unrecognized codes; a missing-from-the-table code is a programming error and surfaces as `500` with a logged warning.

5. **Frontend health-banner component.** New `web/src/components/HealthBanner.tsx` consumed by `web/src/App.tsx`. Mounted above the `<Routes>` outlet and **conditionally rendered when the current URL matches the per-story prefix** `/worlds/:worldSlug/manual-stories/:msSlug/*` — the banner renders persistently across every per-story page when status is `degraded` or `blocked`, hidden when status is `ok`, hidden entirely when not on a per-story route (Worlds list / Manual Stories list / Create form pages). Per-finding rows show severity badge, code, file path, message, and repair hint. The banner is hydrated by a `useStoryHealth(worldSlug, msSlug)` hook (in `web/src/hooks/useStoryHealth.ts`) that polls `/health` on initial page load and after any successful write; the hook returns `null` and skips polling when `worldSlug` / `msSlug` are absent.

6. **Replace silent error swallowing in frontend.** Eliminate the 7 `.catch(() => {})` occurrences in `Dashboard.tsx` and `MomentComposer.tsx`. Replace with one of two patterns:
   - For health-relevant reads (records, segments, manuscript): surface via `useStoryHealth` → banner; the page itself renders an error state in the affected panel.
   - For genuinely-optional reads (e.g., the manuscript may not exist before first compile): explicit handling that distinguishes "absent" (rendered as an empty state with affordance) from "failed to read" (rendered as an error state).

7. **`build-all.sh` / `check-all.sh` inclusion.** Add `tools/manual-story-studio` to both scripts. Pattern matches the existing inclusion of `tools/story-explorer` (the closest analog — Fastify + Vite, dedicated CI plus monorepo coverage).

8. **Acceptance tests** at `tools/manual-story-studio/test/health/`:
   - corrupt `manual-story.yaml` (intentional YAML syntax error in a fixture) → `/health` returns `blocked` with a `metadata-yaml-parse-failed` finding; `Dashboard` renders the banner; prompt-compose route returns `409`.
   - corrupt single record file → `/health` returns `degraded` with a record-specific finding; non-affected records still load.
   - missing segment sidecar (orphan `.md` without `.yaml`) → `blocked` with `segment-sidecar-missing`; manuscript-compile route returns `409`.
   - dangling typed ref (record points at non-existent ID) → `degraded` with `reference-resolution-failed`.

### Out of scope

- Frontend full-cockpit consolidation (single-page cockpit, keyboard shortcuts, ID hiding from primary UI, sibling-page nav) — **SPEC-111**.
- Adding a "repair mode" UI for editing corrupted records — defer; the current goal is visibility, not in-app repair. Authors repair via direct file edit until a real demand surfaces.
- Removing `editSegment`/`deleteSegment` from the segment lifecycle — **SPEC-108**.
- Promoting prompt-leakage lint to hard tier — **SPEC-106**.
- Prose/state contract correction — **SPEC-107**.
- New `current-context.yaml` storage — **SPEC-109**.
- Beat-template pressure/turn-card field deepening — **SPEC-110** (Stage 7 in `reports/manual-story-studio-second-iteration.md` §31).
- **Stage 6 — Schema deepening of relationship / emotion / belief / plan / clock / secret / question / consequence / current-presentation overlays.** Deferred; no spec scheduled. Re-evaluate after SPEC-109 lands the current-context layer and cockpit usage reveals concrete schema gaps. Per `reports/manual-story-studio-second-iteration.md` §9, §25, and §31 Stage 6.
- **Stage 9 — Acceptance test layer beyond this spec's slice** (full-workflow tests, browser-like component tests, sandbox-escape negative tests, prompt-safety acceptance suite). Deferred; this spec ships only the corrupt-state acceptance fixtures at `test/health/` per §2 item 8. The broader §17 catalog is left for a future tooling spec when the web package gains a browser-like test harness. Per `reports/manual-story-studio-second-iteration.md` §17 and §31 Stage 9.
- **Stage 10 — Optional read-only world-canon import flow** (browse/copy selected canon character / fact into a manual record with `source_world_ref`; no sync). Deferred; no spec scheduled. Manual Studio remains world-canon-read-free in MVP per SPEC-100's design intent. Per `reports/manual-story-studio-second-iteration.md` §23 and §31 Stage 10.

## 3. Key decisions

- **Discriminated result type over thrown exceptions in the read layer.** Throwing from `readRecord` would force every existing caller (prompt composer, checklist builder, manuscript compiler) into try/catch noise. A `ReadResult<T>` discriminated union forces every caller to acknowledge the failure path at the type level, which is the load-bearing discipline this spec exists to install. Exceptions are still raised inside the read layer (where the IO actually fails) and converted to `ReadError` at the boundary.

- **Health is on-demand, not a daemon.** The `/health` route runs the integrity passes per request. Manual stories are small (dozens to low-hundreds of records); the passes complete in single-digit milliseconds. A persistent in-memory cache or background watcher is YAGNI; add only if measurement shows the read path is hot.

- **`409` for health-blocked operations, not `503`.** The story exists and the request is well-formed; the resource is in conflict with the cockpit's integrity discipline. `409 Conflict` carries the `HealthReport` body so the frontend can render exactly what's wrong. `503` would imply transient server failure, which is misleading.

- **The frontend banner is hydrated by the same `/health` endpoint that backend routes consult; there is no separate "ui-only health" path.** This guarantees the banner and the route behavior derive from the same data; the author never sees a green banner alongside a `409` response.

- **`build-all.sh` / `check-all.sh` inclusion is integrity discipline, not script grooming.** Local "all green" must cover Manual Studio because future specs (108/109/111) will land cross-package edits whose test breakages must surface during local check, not only in CI. Bundling this small fix into the integrity spec is consistent with the report's §17 framing.

- **Dedicated CI workflow is preserved.** The existing `.github/workflows/manual-story-studio-ci.yml` (per the report §3) remains unchanged; this spec adds monorepo coverage on top of it, not in place of it.

- **`manuscript/compile.ts` is a behavior-change site (throw → typed error).** The current `compileManuscript` does raw `readFileSync` + `YAML.parse` without try/catch at `src/manuscript/compile.ts:41-44, 52-54, 66-68`; corrupt metadata or a malformed segment sidecar throws an uncaught exception that the manuscript-compile route surfaces as an unhandled 500. Under this spec the read-layer wrapping converts those throws into `ReadResult` errors at the read-layer boundary, and `compileManuscript` returns a `ReadResult`-shaped failure so the route can emit `409` with the `HealthReport` body per the per-error-code table in §2 item 4. The change is desirable — visible-specific-repairable failure replaces an uncaught throw — and is called out here so the migration's behavior impact is not hidden inside the "adapt to discriminated union" framing of §4 Modify.

## 4. Files to touch

**Create:**

- `tools/manual-story-studio/src/health/types.ts` — `HealthStatus`, `HealthSeverity`, `HealthFinding`, `HealthReport`.
- `tools/manual-story-studio/src/health/compute.ts` — three-pass integrity computation; returns `HealthReport`.
- `tools/manual-story-studio/src/read/result.ts` — `ReadResult<T>` and `ReadError`.
- `tools/manual-story-studio/src/server/routes/health.ts` — `GET /api/worlds/:world/manual-stories/:story/health`.
- `tools/manual-story-studio/web/src/components/HealthBanner.tsx`.
- `tools/manual-story-studio/web/src/hooks/useStoryHealth.ts`.
- `tools/manual-story-studio/web/src/api/health.ts` — fetch wrapper.
- `tools/manual-story-studio/test/health/health-compute.test.ts` — backend integrity pass tests.
- `tools/manual-story-studio/test/health/health-route.test.ts` — route status code tests.
- `tools/manual-story-studio/test/health/fixtures/` — corrupt-metadata, corrupt-record, missing-sidecar, dangling-ref fixtures.

**Modify:**

- `tools/manual-story-studio/src/read/manual-story-metadata.ts` — return `ReadResult<ManualStoryMetadata>` instead of `ManualStoryMetadata | null`.
- `tools/manual-story-studio/src/read/records.ts` — `listRecords` returns `ReadResult<ManualRecordSummary[]>` collecting per-record errors as findings (no silent skip); `readRecord` returns `ReadResult<ManualRecordOfClass<C>>`; `scanReferences` returns `ReadResult<ReferrerEntry[]>` (corruption of any one record under scan is a structured error, not a silently-omitted referrer); `listAllKnownIds` returns `ReadResult<KnownIds>` (consumed by write-side ID-allocation checks — a silent parse failure here could let a duplicate ID slip past).
- `tools/manual-story-studio/src/read/segments.ts` — `listSegments` returns `ReadResult<SegmentListEntry[]>`; `readSegmentSidecar` returns `ReadResult<SegmentSidecar>`; `readSegmentBody` returns `ReadResult<string>`. (Names verified at `src/read/segments.ts:27,53,66`; an earlier draft of this spec named `listSegmentSidecars` / `readSegment`, neither of which exists.)
- `tools/manual-story-studio/src/read/manuscript.ts` — `readManuscript` returns `ReadResult<ManuscriptReadResult>` with explicit distinction between "absent before first compile" (typed value with a flag) and "read failed" (error result). (Backend type is `ManuscriptReadResult` at `src/read/manuscript.ts:8-13`; the frontend API serialization type `ManuscriptResponse` at `web/src/api/manuscript.ts:16` is unchanged.)
- `tools/manual-story-studio/src/read/manual-stories.ts` — convert the manual-story-list enumerator from `T | null` to a `ReadResult`-shaped result so a corrupt sibling manual story does not silently disappear from a world's manual story list.
- `tools/manual-story-studio/src/read/worlds.ts` — convert the world-list enumerator similarly.
- `tools/manual-story-studio/src/prompt/compose.ts` — adapt every `readManualStoryMetadata` / `readRecord` call site to the discriminated union (stage 2 metadata read; stage 3 cast `readRecord` loop; stage 4 records `readRecord` loop), and convert the stage-5 beat-template raw `readFileSync` + `YAML.parse` (which currently swallows read failures via `catch { rawText = ""; }`) to a `ReadResult`-style read so a corrupt template file produces a structured `selected_template_valid` lint finding instead of silently rendering an empty template body.
- `tools/manual-story-studio/src/state-update-checklist.ts` — adapt to read-result discriminated union (the `listRecords` + `readRecord` calls inside `buildStateUpdateChecklist`'s class iteration).
- `tools/manual-story-studio/src/manuscript/compile.ts` — adapt to read-result discriminated union; replace the raw `readFileSync` + `YAML.parse` at lines 41-44, 52-54, 66-68 with the typed read helpers so corrupt metadata / segment YAML produces a `ReadResult` error the route surfaces as `409` (per §3 Key decisions, this is an intentional throw → typed-error behavior change).
- `tools/manual-story-studio/src/write/records.ts` — adapt the `listAllKnownIds` / `readRecord` / `scanReferences` call sites at lines 149, 182, 187 to the discriminated union; on `ok: false` from any of these, return the write-side failure shape (`broken_refs` or a new `read_failed` variant) so the route surfaces `409` with the `HealthReport` body rather than silently proceeding.
- `tools/manual-story-studio/src/write/segments.ts` — adapt the `scanReferences` call site at line 209 similarly.
- `tools/manual-story-studio/src/server/http.ts` — register the new health route inside the read-route scope.
- `tools/manual-story-studio/src/server/routes/records.ts` / `segments.ts` / `manuscript.ts` / `prompts.ts` / `metadata.ts` / `beat-templates.ts` / `worlds.ts` / `manual-stories.ts` — translate `ReadResult` errors into HTTP status codes per the per-error-code table in §2 item 4; on `blocked` health for the story, return `409` with the full `HealthReport` body. Every route that today consumes a `T | null` from the read layer adapts to the new shape; specifically: `metadata.ts` calls `readManualStoryMetadata`, `beat-templates.ts` calls `readManualStoryMetadata` + `listRecords` + `readRecord`, `worlds.ts` and `manual-stories.ts` call the world-list and manual-story-list enumerators.
- `tools/manual-story-studio/web/src/App.tsx` — mount `<HealthBanner />` above the `<Routes>` outlet when on a per-story route.
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` — remove `.catch(() => {})` at lines 67, 72, 77, 101; replace with explicit error state per §2 item 6.
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` — remove `.catch(() => {})` at lines 66, 71, 89; same treatment.
- `scripts/build-all.sh` — add a `tools/manual-story-studio` entry matching the `tools/story-explorer` pattern.
- `scripts/check-all.sh` — same.

**No modification to:**

- `.github/workflows/manual-story-studio-ci.yml` — dedicated CI stays.
- `tools/world-index/`, `tools/world-mcp/`, `tools/patch-engine/`, `tools/hooks/` — unaffected.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Rule 6 No Silent Retcons | aligns @ read-layer surface | Replacing silent-null with structured findings prevents corruption from masquerading as absence; FOUNDATIONS frames silence as not-permission-to-invent at the canon layer, and Manual Studio's read layer applies the same discipline to local truth. |
| §Soft Canon / Local Truth (must be explicit and validated) | aligns @ health endpoint | The health endpoint makes local-truth integrity *visible* per cockpit page; a manual story whose local truth has degraded cannot silently accept new writes that would compound the degradation. |
| §Tooling Recommendation (least-privilege LLM packets) | aligns @ blocked_actions | When health is `blocked`, the route layer denies prompt copy/save and segment save — the external LLM never receives a packet derived from corrupted local state, which is the cockpit's equivalent of the §Tooling Recommendation's least-agency posture. |
| §Story Bundles §4 Write Discipline (deterministic write surface) | aligns by analogy @ HTTP status discipline | Manual Studio is not a story bundle, but the discipline of returning `409` only for genuine integrity conflict (not for absent resources or input validation failures) mirrors the determinism FOUNDATIONS expects from canon-write surfaces. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | Manual Studio writes no canon facts; the package explicitly disclaims canon-pipeline integration. No Rule 1 surface engaged. |
| §Canonical Storage Layer engine-only-write discipline | N/A @ tooling-adjacent | This spec does not touch `_source/`; Hook 3 is unaffected; the patch engine is not invoked. The disclaimer above remains structurally true. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` (from the package directory) runs `npm run build:backend && node --test "dist/test/**/*.test.js" && npm --prefix web test`. The web test step remains `tsc --noEmit` per the current package.json — extending it to component tests is **SPEC-111**'s concern.

Cold-start manual verification: in a worktree with a fixture world containing a corrupted `manual-story.yaml`, launch `node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root <worktree>`, open the dashboard for the corrupted story, confirm the health banner renders with the `metadata-yaml-parse-failed` finding and the prompt-compose button is disabled.

Monorepo coverage: from repo root, run `bash scripts/check-all.sh` and confirm it now invokes `npm --prefix tools/manual-story-studio test`.

## 7. Acceptance criteria

1. `GET /api/worlds/:world/manual-stories/:story/health` returns a `HealthReport` matching the canonical schema; status code is `200` regardless of health status (the *status* of the story is in the body, the request itself is well-formed). The response body conforms structurally to the `HealthReport` interface in `src/health/types.ts`: `findings` is always an array (empty `[]` when `status: ok`), `blocked_actions` is always an array (empty `[]` when not blocked), and every emitted `HealthFinding` carries all five required fields (`severity`, `code`, `path`, `message`, `repair_hint`).
2. Corrupting `manual-story.yaml` in a fixture story results in `/health` returning `status: "blocked"`, `blocked_actions` containing all four entries, and exactly one finding with `code: "metadata-yaml-parse-failed"`. (acceptance test)
3. Corrupting a single record YAML results in `/health` returning `status: "degraded"`, `blocked_actions` empty, and exactly one finding with `code: "record-yaml-parse-failed"`. Other records list normally. (acceptance test)
4. Removing a segment sidecar `.yaml` while leaving its `.md` results in `/health` returning `status: "blocked"`, `blocked_actions` containing `manuscript_compile`, and a finding with `code: "segment-sidecar-missing"`. (acceptance test)
5. A record with a `refs.characters` pointing at a non-existent cast ID results in `/health` returning `status: "degraded"` and a finding with `code: "reference-resolution-failed"`. (acceptance test)
6. Every PUBLIC exported function in `tools/manual-story-studio/src/read/*.ts` returns `ReadResult<T>` rather than `T | null` to indicate failure — covering `readManualStoryMetadata`, `listRecords`, `readRecord`, `scanReferences`, `listAllKnownIds`, `listSegments`, `readSegmentSidecar`, `readSegmentBody`, `readManuscript`, and the world-list / manual-story-list enumerators. (Verified by grep: `grep -rnE "^export (async )?function.*: .*\| null" tools/manual-story-studio/src/read/` returns zero matches. Internal private helpers like `parseYamlFile` / `toSummary` / `isSegmentSidecar` may continue to return `T | null` inside their module — they are not part of the public read-layer contract and their nullability is translated to `ReadResult` `ok: false` by their public callers.)
7. The 7 `.catch(() => {})` occurrences in the live tree are removed; `grep -rn "\.catch(() => {})" tools/manual-story-studio/web/src/` returns zero matches.
8. `scripts/build-all.sh` and `scripts/check-all.sh` both invoke `tools/manual-story-studio` test/build steps; running `bash scripts/check-all.sh` from a clean tree exits 0 and includes the Manual Studio test output.
9. POSTing to `/api/.../prompts/compose` with a story whose `/health` is `blocked` returns HTTP `409` with a body matching the `HealthReport` shape. (acceptance test)
10. All existing tests under `tools/manual-story-studio/test/` continue to pass after the read-layer signature change. Cross-cutting test updates are part of this spec's diff.

## 8. Assumption reassessment

- **Assumption:** `tools/story-explorer` is currently in both `scripts/build-all.sh` and `scripts/check-all.sh` as the pattern to follow. → Verify before drafting the patch; if it is in neither, the inclusion pattern should match the closest peer that IS covered (e.g., `tools/validators` or `tools/world-mcp`).
- **Assumption:** The corrupt-metadata acceptance test fixture can be a static YAML file with intentional syntax error checked into `test/health/fixtures/`. → Verify that `node --test` and the test harness do not fail at fixture-discovery time; if YAML parsing is attempted at test load, store the corrupt content as `.yaml.txt` and rename at test setup.
- **Assumption:** The web test step's current `tsc --noEmit` continues to pass after the new `HealthBanner.tsx` and `useStoryHealth.ts` are added. → The change adds new files only and does not alter existing types; the typecheck should remain green.

## 9. Risks & Open Questions

- **Internal-helper scope decision is documented but not strictly enforced.** §2 item 3 and §7 AC#6 carve out internal private helpers in `src/read/*.ts` (`parseYamlFile`, `toSummary`, `isSegmentSidecar`, `parseSegmentSidecar`) from the typed-error migration; they may continue to return `T | null` inside their module as long as their public callers translate the null to a `ReadResult` error. The risk: a future refactor exporting one of these helpers (or moving it to a new file) would silently widen the read-layer contract surface without anyone re-running AC#6. Mitigation: AC#6's grep is the structural backstop; any new export with a `T | null` return type fails AC#6 at the next monorepo check. Re-evaluate this carve-out if the helper count grows materially or a helper begins handling more than one error condition.

- **Three unadjudicated `reports/manual-story-studio-second-iteration.md` §31 stages are deferred (Stages 6 / 9 / 10).** Per §Out of scope, Schema deepening / Acceptance test layer beyond this spec's slice / Optional world-canon import each route to deferred follow-up. The risk: Stage 6's "shallow schema breadth" critique (report §5, §9, §25) overlaps with SPEC-110's beat-template deepening; if cockpit use after SPEC-109+SPEC-110 land surfaces a concrete schema gap (e.g., relationship axes, secret reveal-policy), a follow-up spec should be filed against the originating §-anchor. Stage 9's broader acceptance-test catalog depends on a web-package browser-like test harness that doesn't exist today; revisit when the harness is in scope. Stage 10's world-canon import is YAGNI under the current Manual-Studio-is-canon-read-free posture.

- **HealthBanner App.tsx mounting overlap with SPEC-111.** SPEC-105 §2 item 5 (this spec) defines the persistent-per-story-route mounting. SPEC-111 §2 item 1 reframes SPEC-105 as shipping "the `HealthBanner` component **scaffold** but does not mount it persistently across all per-story pages" — and claims the per-story mounting as its own scope. The actual ownership: SPEC-105 owns the route-aware persistent mounting (above the `<Routes>` outlet, conditional on the per-story URL prefix). SPEC-111 then becomes purely additive — it adds the StoryPageNav (the sibling-page tab strip) and consumes the existing banner mount, not re-establishing it. A cross-spec edit to SPEC-111's framing is out of scope per this skill's §Guardrails (§No scope creep). Risk: if SPEC-111 lands first and re-mounts the banner, the two mountings may double-render; the implementer of whichever spec lands second should remove the duplicate mount and cite this Risks entry.

- **Route layer error-code → HTTP status dispatch is a deterministic mapping** (per the table in §2 item 4). The risk: a future read-layer change that introduces a new `ReadError.code` not yet in the table will default to `500` with a logged warning until the table is extended. This is intentional — the table is the contract, and new codes require an explicit table entry — but a code added by a sibling spec (e.g., SPEC-108's segment-lifecycle change might introduce a `segment_locked` code) needs a coordinated table extension as part of that sibling's diff.

- **`manuscript/compile.ts` is a throw → typed-error behavior change.** Per §3 Key decisions, the migration converts uncaught exceptions on corrupt metadata / segment YAML into `ReadResult` errors. The risk: existing callers of `compileManuscript` (the manuscript route + the auto-compile-on-segment-save logic per `manual-story.yaml`'s `compile_on_segment_save: true` default) need to handle the new error shape. The current behavior — uncaught exception bubbling up as an HTTP 500 — was implicitly "unrecoverable, log and restart"; the new behavior is "recoverable, 409 with HealthReport." Acceptance test #4 (segment-sidecar-missing) covers this transition; the spec's diff should include a manuscript-route-level test that exercises the compile path with corrupt metadata.
