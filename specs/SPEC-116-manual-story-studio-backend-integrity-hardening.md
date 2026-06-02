# SPEC-116 — Manual Story Studio: Backend Integrity Hardening — Template-Path Containment, Scoped Health Gating, Prompt-Input Validation

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (backend route + health + sandbox changes only; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-100-manual-story-studio-package-boundary.md (consumes the write-sandbox `assertInsideSandbox` containment primitive), archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md (consumes the `/health` compute + blocked-actions gate it now refines).
**Blocks:** — (independent; recommended first per specs/IMPLEMENTATION-ORDER.md because it closes a live arbitrary-file-read vulnerability and has no UI prerequisites).
**Related:** `tools/manual-story-studio/src/server/routes/prompts.ts`, `tools/manual-story-studio/src/prompt/compose.ts`, `tools/manual-story-studio/src/write/sandbox.ts`, `tools/manual-story-studio/src/health/compute.ts`, `tools/manual-story-studio/src/health/types.ts`, `tools/manual-story-studio/src/server/health-gate.ts`.
**Source:** critical triage of `reports/manual-story-studio-third-iteration.md` §22 / §25 (ChatGPT-Pro, 2026-06-02). The report's §25 generically recommended "audit every route so no route takes arbitrary filesystem paths where logical IDs would suffice." Codebase verification (this session, 4 parallel Explore passes) located the concrete violation: the prompts compose route reads `included_template_path` without sandbox containment — an arbitrary-file-read vulnerability (out-of-report finding O1). The §22 health recommendations (scope blocking to dependent actions; validate prompt/contract inputs) are accepted as the same backend-integrity surface.

---

## 1. Context & Motivation

The second pass made the write boundary one of the strongest parts of the package: writes resolve only under `worlds/<world>/manual-stories/<story>/` via `resolveManualStoryRoot` + `assertInsideSandbox` (`src/write/sandbox.ts`), and a route write-scope guard throws if a write method registers outside the writable scope. Verified accurate.

But two read-side integrity gaps remain:

### 1.1 Arbitrary file read via template body fields (`included_template_path` and `selected_template`) (security — load-bearing)

The prompts compose route accepts `included_template_path` as a free-form string in the request body (`src/server/routes/prompts.ts` `ComposeBody.included_template_path?: string | null`), threads it through `buildComposeInput`, and `composePrompt` (`src/prompt/compose.ts`) reads the file from disk **without** calling `assertInsideSandbox` and **while accepting both absolute and relative paths**. A client request body of `{"included_template_path": "/etc/passwd"}` (or `"../../../../some/secret"`) causes the server to read an arbitrary file and surface its contents into the composed prompt and the persisted prompt sidecar.

The same hole exists on the SPEC-104 logical-id field `selected_template`: `resolveBeatTemplatePath` builds `records/beat-templates/<id>.yaml` with no id-pattern check and no containment, so `selected_template: "../../../_source/canon/CF-1"` resolves outside the story root and is read if a matching `.yaml` exists (gated only by `existsSync`). Containing only `included_template_path` would leave this sibling field exploitable — and the traversal can reach the very canon `_source/` surfaces the SPEC-100 fence is meant to protect.

This is a path-traversal / arbitrary-file-read vulnerability. Even though Manual Studio is a local single-author tool, the package's own boundary contract (SPEC-100) promises that *all* filesystem access stays inside the manual-story sandbox; this route silently breaks that promise on the read side. Beat templates are addressable by their allocated `mtemplate-<n>` id under `templates/` (story-local) or by a global-library id — there is no legitimate reason for the route to accept a raw filesystem path.

### 1.2 Health gating is all-or-nothing, and skips prompt/contract inputs

Verified from `src/health/compute.ts` + `src/health/types.ts` + `src/server/health-gate.ts`:

- When health status is `blocked`, **all four** actions (`prompt_copy`, `prompt_save`, `segment_save`, `manuscript_compile`) are blocked together. A blocking finding isolated to (say) a corrupt prompt sidecar should not also block `segment_save` or `manuscript_compile`, which do not depend on that surface. The report §22: "Do not block all actions for every error; block only actions that depend on the broken surface."
- Health does **not** validate: prompt sidecar files / prompt markdown existence for saved prompts; presence of the content-policy and prose-craft-contract documents that the composer hard-requires (their *absence* currently surfaces only at compose time as a read error, not as an actionable health finding); manuscript freshness against `segment_order`.

This spec fixes 1.1 (mandatory; security) and the load-bearing parts of 1.2 (dependency-scoped blocking + content-policy/prose-craft presence validation). Manuscript freshness is included as a low-cost derived check. Prompt-sidecar existence/parseability validation is **out of scope** here (see §Out of scope) — the hard-tier lint already runs at compose/save.

## 2. Scope

### In scope

1. **Contain template selection; remove the raw-path body field.** The logical-id form an earlier draft proposed as new (`included_template_id`) already shipped in SPEC-104 as `selected_template` — the route resolves it to `records/beat-templates/<id>.yaml` (`resolveBeatTemplatePath`), and the frontend (`web/src/pages/MomentComposer.tsx`) already sends it. So the fix is not a new field; it is removal + containment of what exists:
   - **Remove the `included_template_path` body-field acceptance** from `ComposeBody` / `buildComposeInput` (`src/server/routes/prompts.ts`). The frontend no longer uses it; only two back-compat route tests do (`test/server/prompts-routes.test.ts`) — migrate or delete them. The *internal* `PromptComposeInput.included_template_path` field stays: it carries the route-resolved path and is not a request-body surface.
   - **Validate and contain `selected_template`.** `resolveBeatTemplatePath` currently does no id-pattern check and no containment, so `selected_template: "../../../_source/canon/CF-1"` resolves outside the story root and is read if a matching `.yaml` exists. Pattern-validate the id (`^mtemplate-\d+$`, or `classifyManualRecordId`) and run `assertInsideSandbox` (or an exported `assertReadableInsideSandbox`) on the constructed path before reading.
   - **Contain the compose-time read.** `composePrompt` (`src/prompt/compose.ts`) must `assertInsideSandbox` the resolved template path before `readFileSync`, regardless of which field populated it — defense-in-depth so the read can never escape the sandbox even if a future caller repopulates the internal field.
   - **Net contract:** `selected_template` (logical id) is the sole public template API; **no request-body value may cause a read outside the manual-story sandbox.** An invalid id, an absolute path, or any `..` traversal is rejected with a structured 400, not silently read.
2. **Dependency-scoped health blocking.** Replace the single `blocked === (status === "blocked")` rule with a per-action computation: each of the four gated actions is blocked only when at least one blocking finding belongs to a surface that action depends on. Minimum dependency map:
   - `prompt_copy` / `prompt_save` ← metadata, records, current-context/working-set, content-policy, prose-craft-contract.
   - `segment_save` ← metadata, segment sidecars/bodies.
   - `manuscript_compile` ← metadata, `segment_order`, segment bodies.
   - A finding on a surface no action depends on still surfaces in the report (status `degraded`/`blocked` for visibility) but blocks no action.
3. **Validate compose-required documents in the health reference pass.** Add findings (blocking for the prompt actions only, per the dependency map) when the content-policy document or the prose-craft-contract document the composer requires is absent or unparseable. This converts a compose-time read error into an actionable health finding with a repair link target.
4. **Manuscript freshness check (low severity).** Add a non-blocking `degraded`-severity finding when `manuscript.md` is older than the newest segment in `segment_order` (or absent while `segment_order` is non-empty). Freshness never blocks — `manuscript_compile` regenerates it.

### Out of scope

- **Prompt-sidecar / prompt-markdown existence validation in health** (report §22, recommendation 1) — out of scope. The hard-tier lint already runs at compose/save; this spec adds no prompt-sidecar existence/parseability finding to the health pass. (The §1.2 corrupt-sidecar example is illustrative of the dependency-scoping principle, not a deliverable here.)
- **Working-set shape validation at route read time** (report §22, recommendation 4) — out of scope. Current-context references are already validated in the health reference pass (`validateCurrentContext`, `src/health/compute.ts`); validating the working set at every route read (rather than at health time) is a separate route-layer concern deferred to a later iteration.
- Any change to the write-scope guard or the sandbox containment primitive itself (they are correct; this spec *uses* them on a surface that currently bypasses them).
- The 5-value `prompt_mode` redesign and the inclusion ledger — those live in SPEC-113.
- Adding MCP / world-index / patch-engine — explicitly rejected by the report §8 and not introduced here.

## 3. Key decisions

- **The logical-id template form already exists as `selected_template` (SPEC-104).** Accepting a raw path was the root cause; the cleanest fix is to stop accepting paths in request bodies entirely and make `selected_template` the sole public template API, matching how records/segments/prompts resolve (validated id → constructed path under the story root). Note: the existing id-resolution sites (`readRecord`, segment/prompt readers) rely on id-prefix classification under the story root rather than a `realpathSync` containment primitive — so the template path is the one read that must *additionally* `assertInsideSandbox`, because its id reaches a constructed filesystem path the new validation must fence. No global read-only template library exists today (templates are story-local under `records/beat-templates/`); if one is ever added, containment against its explicit root is mandatory.
- **Scope blocking by dependency, not by global status.** The all-or-nothing gate punishes the author for an unrelated broken surface. A dependency map is small, explicit, and testable, and matches the report's §22 intent precisely.
- **Promote content-policy / prose-craft presence to a health finding.** These documents are compose preconditions; surfacing their absence at health time (with a repair target) is strictly better than a raw read error at compose time. Scoping the block to the prompt actions only (via the dependency map) means a missing contract never blocks `segment_save`.
- **Freshness is advisory only.** Manuscript is a derived artifact; a stale manuscript is regenerable and must never block work.

## 4. Files to touch

**Modify:**

- `tools/manual-story-studio/src/server/routes/prompts.ts` — remove the `included_template_path` body-field acceptance from `ComposeBody` / `buildComposeInput`; pattern-validate `selected_template` (`^mtemplate-\d+$`) and `assertInsideSandbox` its path in `resolveBeatTemplatePath`; reject an invalid id with a structured 400.
- `tools/manual-story-studio/src/prompt/compose.ts` — resolve the template through a sandbox-contained path; remove the unguarded absolute-or-relative read; surface a structured error if the contained reference does not resolve.
- `tools/manual-story-studio/src/write/sandbox.ts` — if needed, export a read-side containment helper (e.g. `assertReadableInsideSandbox`) so compose can reuse the same `realpathSync`-based check the write path uses (no behavior change to existing write containment).
- `tools/manual-story-studio/src/health/compute.ts` — compute per-action blocked sets from a dependency map over findings; add content-policy / prose-craft presence checks to the reference pass; add the manuscript-freshness check. The content-policy / prose-craft docs live at repo level (`docs/prose-renderer-contract/content-policy.md`, `docs/manual-story-studio/prose-craft-contract.md`), but `computeHealth` only receives `manualStoryRoot`; derive `repoRoot` inside `computeHealth` via `path.resolve(manualStoryRoot, "../../../..")` (mirroring `resolveManualStoryRoot`'s `worlds/<world>/manual-stories/<story>` layout) so no call-site signature change is needed — the GET `/health` route (`routes/health.ts`), `blockIfHealthDisallows`, and the prompts/manuscript/segments callers stay untouched.
- `tools/manual-story-studio/src/health/types.ts` — extend the report shape if needed so `blocked_actions` is derived per-action (it may already be an array; this formalizes how it is populated).
- `tools/manual-story-studio/src/server/health-gate.ts` — no logic change expected (it already checks `report.blocked_actions` membership); confirm it reads the per-action set.

**Create:**

- `tools/manual-story-studio/test/server/prompt-template-path-containment.test.ts` — asserts an absolute path and a `..`-traversal path are rejected (400 / structured error) and never read; asserts a valid contained template id resolves.
- `tools/manual-story-studio/test/health/dependency-scoped-blocking.test.ts` — asserts a blocking finding on one surface blocks only the dependent actions; asserts missing content-policy blocks prompt actions but not `segment_save`; asserts manuscript staleness is `degraded` and blocks nothing.

**Minimal web change:** the frontend already composes via `selected_template` (`web/src/pages/MomentComposer.tsx`), so the contained form is wired end-to-end — no picker work is needed here (richer picker UX remains SPEC-112 / SPEC-113 territory). The only web edit is deleting the now-dead `included_template_path` field from `web/src/types/manual-story.ts` once the body field is removed, keeping `npm --prefix web test` (`tsc --noEmit`) green (see §7 AC#7).

**No modification to:** record/template schema, prompt section emitters.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Canonical Storage Layer / write-discipline (containment) | aligns @ read-side sandbox containment | The package promises all filesystem access stays inside the manual-story sandbox; this spec extends that promise to the one read path (`compose` template read) that currently bypasses it. Defense-in-depth analog of the canon-layer write discipline at the tooling layer. |
| §Soft Canon / Local Truth (must be explicit and validated) | aligns @ scoped health gating | Validating compose-required documents (content-policy, prose-craft) at health time makes local-truth integrity explicit and actionable instead of surfacing as an opaque compose-time read error. |
| §Tooling Recommendation (least-privilege packets) | aligns @ template-path containment | Removing arbitrary-file-read narrows what the deterministic composer can pull into a prompt to author-authored, sandbox-contained material only. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | No world-canon facts engaged; the tool never writes `_source/`. |
| §world-canon vs story-bundle execution state (FOUNDATIONS line 105) | N/A @ tooling-adjacent | Manual Studio writes only under `manual-stories/`, outside both world canon and the story-bundle pipeline; this spec does not change that boundary. (Corrects the report §7's overstated framing.) |

## 6. Build & test

`tools/manual-story-studio`:
- `npm run test:backend` runs the new containment + dependency-scoped-blocking tests plus the existing health/route suites under `node --test`.
- `npm test` additionally runs `npm --prefix web test` (the web `tsc --noEmit` baseline) — must remain green. The frontend already composes via `selected_template`; removing the `included_template_path` body field requires deleting the dead `included_template_path` entry from `web/src/types/manual-story.ts` so the web types stay in sync with the route contract.
- `npm run build` must succeed (`build:backend` = `tsc -p tsconfig.json`).

## 7. Acceptance criteria

1. **PASS rationale required.** With the `included_template_path` body field removed, a request that still sends it (or sends `selected_template: "/etc/passwd"`) is rejected with a structured 4xx and reads no file outside the sandbox — verified by a test that fails if any read occurs outside the manual-story root.
2. A compose request whose `selected_template` is a `..`-traversal value (e.g. `../../../_source/canon/CF-1`) is rejected identically and reads no file.
3. A valid `selected_template` logical id (e.g. `mtemplate-1`) still composes successfully.
4. A blocking finding isolated to a prompt-only surface (e.g. missing content-policy) blocks `prompt_copy`/`prompt_save` but leaves `segment_save` and `manuscript_compile` allowed.
5. A blocking finding on a segment sidecar blocks `segment_save`/`manuscript_compile` but leaves the prompt actions allowed when prompt inputs are healthy.
6. A stale or missing `manuscript.md` (with non-empty `segment_order`) produces a `degraded` finding and blocks nothing.
7. `npm test` is green end to end; `npm run build` succeeds; `web/src/types/manual-story.ts` no longer declares `included_template_path` (the frontend already composes via `selected_template`).
