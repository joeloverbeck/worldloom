# SPEC-109 — Manual Story Studio: Current-Context Selector Layer

**Status:** PROPOSED
**Date:** 2026-06-01
**Classification:** tooling-adjacent (introduces a new per-story authoring artifact `current-context.yaml` under `worlds/<slug>/manual-stories/<slug>/`; no canon-pipeline integration).
**Depends on:** SPEC-105 (typed-error reads — current-context consumes the read-result discriminated union for its own load path and for the records it references).
**Blocks:** SPEC-111 (UX cockpit consumes the current-context surface in the dashboard).
**Related:** `tools/manual-story-studio/src/schema/manual-story.ts`, `tools/manual-story-studio/src/prompt/compose.ts`, `tools/manual-story-studio/web/src/pages/Dashboard.tsx`, `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`.
**Source:** critical triage of `reports/manual-story-studio-second-iteration.md` §§5 / 9 / 12 / 13 / 18 / 24 / 29 / 31 Stage 5 (ChatGPT-Pro, 2026-06-01). Accepted: the prompt composer currently relies on importance/centrality heuristics over the full record corpus; an explicit `current-context.yaml` selector is qualitatively better and unblocks both the cockpit UX and meaningful prompt curation. The report's "Schema deepening" (§31 Stage 6) is DEFERRED until this layer lands and reveals concrete schema gaps in use.

---

## 1. Context & Motivation

The current prompt composer at `tools/manual-story-studio/src/prompt/compose.ts:107-120` and downstream sections select records via heuristics: importance bucketing (`high`/`central`) plus typed reference walks. This produces *a* selection, but not necessarily the selection that matches the current moment. Verified from the report §13: the current handoff section relies on "high/central importance records, references to included cast, and recent last paragraph" — useful, but the author has no first-class way to say "right now, the POV is Mara, she is in the riverhouse kitchen, the trust clock is at 3, the debt secret is forbidden to reveal, the last accepted segment ends on Iven's interruption."

The result is a prompt that knows the corpus but not the cockpit's *current* point of view onto it. The Moment Composer page's "relevant records" panel suggests records by importance, not by what the author is writing about now. Dashboard renders a list of summaries rather than an integrated current-state glance.

The fix is a named per-story file capturing the cockpit's active selection. Per the report §24:

```yaml
current_location: mloc-2
current_cast: [mchar-1, mchar-3]
pov_holder: mchar-1
active_pressure_clocks: [mclock-1]
active_secrets_questions: [msec-2, mq-1]
pinned_records: [mrel-4, mobl-1]
must_not_reveal: [msec-2]
current_handoff_summary: |
  Mara is in the kitchen of the riverhouse waiting for Iven. The
  bread on the counter has not been touched. She has decided to ask
  about the debt directly if he stays past the second cup.
last_accepted_segment: SEG-7
```

This is a small file with a precise role: it is the cockpit's *current point of view onto the record corpus*. The prompt composer reads it as the primary selector for §3 (current handoff), §7 (cast rendering), §8 (continuity constraints), §10 (secrets/reveal limits) of the external prompt. The dashboard reads it to render the "current state glance" panel the cockpit needs. The Moment Composer reads it to seed its record-selection picker.

The file is hand-edited (no auto-update from prose or from segment saves). The author controls it. The post-prose state-review checklist (SPEC-103, already shipped) prompts the author to consider updating the current context after a segment is accepted, but the update remains explicit.

This spec is the highest-leverage data-layer improvement after SPEC-105's integrity foundation. It is a prerequisite for the SPEC-111 dashboard cockpit and is referenced (as the eventual "state-review marked complete" precondition source) by SPEC-108's repair-mode gate.

## 2. Scope

### In scope

1. **New `current-context.yaml` schema.** Add `src/schema/current-context.ts` with the canonical shape:
   ```ts
   export interface CurrentContext {
     current_location: string | null;            // mloc-<n> or null
     current_cast: string[];                     // ordered list of mchar-<n>
     pov_holder: string | null;                  // mchar-<n>; one of current_cast
     active_pressure_clocks: string[];           // mclock-<n>
     active_secrets_questions: string[];         // msec-<n> or mq-<n>
     pinned_records: string[];                   // typed mixed IDs (any manual class)
     must_not_reveal: string[];                  // subset of active_secrets_questions OR any msec-<n>
     current_handoff_summary: string;            // freeform prose; the author's "what's happening right now" paragraph
     last_accepted_segment: string | null;       // SEG-<n>; mirrors metadata.segment_order tail
     last_reviewed_after_segment: string | null; // SEG-<n>; set when author marks state-review complete
   }
   ```
   `last_reviewed_after_segment` is the surface SPEC-108's `force_replace` precondition consults: a segment can be silently replaced only if no `last_reviewed_after_segment >= that segment` exists.

2. **`current-context.yaml` storage location.** File path `worlds/<slug>/manual-stories/<slug>/current-context.yaml`. Created on first write; absent before that. The cockpit treats absence as "no current context set yet" — a degraded but operative state where the prompt composer falls back to the current heuristic behavior and the dashboard renders an empty current-state panel with a "Set current context" affordance.

3. **Read path.** Add `src/read/current-context.ts` exposing `readCurrentContext(manualStoryRoot): ReadResult<CurrentContext | null>` — `null` is the typed "file absent" value, distinct from a `ReadError` for a corrupted file. The function honors SPEC-105's typed-error discipline.

4. **Write path.** Add `src/write/current-context.ts` exposing `writeCurrentContext(root, ctx): WriteResult` — full-file replace (the file is small and hand-edited; merging is unnecessary). Atomic write via the existing `safeWriteFile` sandbox.

5. **Schema validation.** Add `src/validate/current-context.ts` exposing `validateCurrentContext(ctx, knownIds): ValidationResult` — asserts every referenced ID exists in the corpus and is the right shape. Validation failures route into the health report from SPEC-105 as findings under code `current-context-reference-broken` / `current-context-pov-not-in-cast`.

6. **Backend routes.**
   - `GET /api/worlds/:world/manual-stories/:story/current-context` — returns the parsed `CurrentContext` or `null` if the file is absent; `409` if the file is corrupted (health-integrated).
   - `PUT /api/worlds/:world/manual-stories/:story/current-context` — accepts the full `CurrentContext` body, validates, writes; `422` on validation failure with structured findings.

7. **Prompt composer plumbing.** Modify `src/prompt/compose.ts` to:
   - Load `current-context.yaml` after loading metadata (between current stages 2 and 3).
   - When current-context is present:
     - §3 Current Situation reads `current_handoff_summary` directly; falls back to the last accepted segment's last paragraph for the "recent prose" sub-bullet.
     - §7 Cast and Voice prefers `current_cast` over the importance heuristic; honors `pov_holder` for the POV sub-bullet.
     - §8 Emotional and Relationship State and §11 Physical Continuity prefer `pinned_records` + records referencing items in `current_cast` over the importance heuristic.
     - §10 Beliefs/Secrets/Questions includes `active_secrets_questions`; `must_not_reveal` is rendered as the explicit forbidden-reveal list.
   - When current-context is absent: composer falls back to current behavior (importance/centrality heuristics).

8. **Dashboard surfacing.** Add a "Current State" panel at the top of `web/src/pages/Dashboard.tsx` rendering: current location, POV holder, current cast (chips), active pressure clocks (chips), active secrets (chips), `current_handoff_summary` (paragraph). When current-context is absent: render a "Set current context" affordance routing to a new "Edit Current Context" page.

9. **Edit Current Context page.** New `web/src/pages/EditCurrentContext.tsx` with form fields for each `CurrentContext` field. Records-typed fields use the existing `RefList` component pattern. The page's Save button calls `PUT /current-context`.

10. **Mark-state-reviewed affordance.** A small "Mark state reviewed after SEG-N" button on the state-update checklist (already-existing per SPEC-103) sets `last_reviewed_after_segment = SEG-N` via a `PATCH /current-context` field-targeted endpoint (or, simpler, via `PUT` of the full context with that one field changed — preferred for simplicity).

11. **Acceptance tests** under `tools/manual-story-studio/test/current-context/`:
    - read of an absent file returns `ReadResult ok=true, value=null`.
    - read of a corrupted file returns `ReadResult ok=false` with `ReadError code="current-context-yaml-parse-failed"`.
    - write rejects a `pov_holder` not in `current_cast` with `422` finding `current-context-pov-not-in-cast`.
    - write rejects an unknown record ID in `pinned_records` with `422` finding `current-context-reference-broken`.
    - prompt compose with current-context present prefers `current_cast` over importance heuristic in §7.
    - prompt compose with current-context absent falls back to current heuristic behavior.
    - dashboard renders "Current State" panel from current-context payload.

### Out of scope

- **Schema deepening of relationship/emotion/belief/plan/clock/secret/question/consequence** — explicitly deferred per the triage (report §31 Stage 6 lands after this spec stabilizes; the deferred surface gets its own follow-up spec when concrete gaps surface in use).
- Auto-update of `current_handoff_summary` from prose — explicit author action only; the report's "do not infer state from prose" rule applies to the handoff summary too.
- Multi-context branching (one story, multiple current-contexts for different POVs) — defer; YAGNI.
- Migration of existing stories — the file is purely additive; absent file means heuristic fallback.
- World-canon import surface — **deferred per the triage**.
- Beat-template integration with current-context (template filter consuming `active_pressure_clocks`) — **SPEC-110** scope; this spec's filter changes are deferred to that spec.
- Health endpoint and read-error typing — **SPEC-105** (prerequisite).

## 3. Key decisions

- **`null` for absent file; `ReadError` for corrupted file.** The two states are semantically different and the cockpit handles them differently (empty-state affordance vs. error banner). SPEC-105's `ReadResult<CurrentContext | null>` shape encodes this directly.

- **Full-file replace on write, no patching.** The file is small (one screen) and hand-edited; PATCH endpoints would add complexity for no benefit. The `PUT` body carries the entire context.

- **Heuristic fallback when context absent.** The composer's importance/centrality logic is preserved as the fallback path; this means the current-context layer is purely additive — existing stories without a context file continue to work.

- **`must_not_reveal` is its own field, not a flag on secrets.** The author may want to forbid reveal of a secret that is *not* currently active (e.g., a background secret whose reveal would derail the scene). Keeping `must_not_reveal` as a separate list lets the author express "background secrets X and Y, but Y must not be revealed this beat" without conflating with the "active" set.

- **`last_reviewed_after_segment` is set by an explicit author action.** The state-update checklist (SPEC-103) prompts after a save; the author clicks "Mark state reviewed after SEG-N" when ready. No automatic update. SPEC-108's repair-mode `force_replace` precondition reads this surface to decide whether silent replacement is permitted.

- **Schema deepening is deferred, not abandoned.** The report's §25 schema-deepening proposals (belief.confidence, emotion.bodily_expression, etc.) are good, but adding them now would couple this spec to a much larger surface. After this spec ships, the author's first round of cockpit use will surface which existing schema gaps actually bite — a focused follow-up spec captures those, instead of speculatively deepening every class.

- **No `INDEX.md` for the manual-stories directory.** The world's `manual-stories/INDEX.md` is not part of this spec (Manual Studio is excluded from world-index enumeration; a separate index file would be both un-indexed and duplicative). The Worlds page enumerates manual stories at runtime per `tools/manual-story-studio/src/read/manual-stories.ts`.

## 4. Files to touch

**Create:**

- `tools/manual-story-studio/src/schema/current-context.ts` — `CurrentContext` type.
- `tools/manual-story-studio/src/read/current-context.ts` — `readCurrentContext`.
- `tools/manual-story-studio/src/write/current-context.ts` — `writeCurrentContext`.
- `tools/manual-story-studio/src/validate/current-context.ts` — `validateCurrentContext` against known IDs.
- `tools/manual-story-studio/src/server/routes/current-context.ts` — `GET` / `PUT`.
- `tools/manual-story-studio/web/src/api/current-context.ts` — fetch wrappers.
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` — form page.
- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` — read-only render consumed by Dashboard.
- `tools/manual-story-studio/test/current-context/current-context-read.test.ts`.
- `tools/manual-story-studio/test/current-context/current-context-write.test.ts`.
- `tools/manual-story-studio/test/current-context/current-context-validate.test.ts`.
- `tools/manual-story-studio/test/current-context/compose-prefers-context.test.ts`.
- `tools/manual-story-studio/test/current-context/fixtures/` — fixtures with present, absent, and corrupted current-context files.

**Modify:**

- `tools/manual-story-studio/src/prompt/compose.ts` — load current-context after metadata; §3/§7/§8/§10/§11 selector preference per §2 item 7.
- `tools/manual-story-studio/src/health/compute.ts` (from SPEC-105) — Pass 2 schema integrity also validates current-context if present; Pass 3 reference integrity also resolves current-context IDs.
- `tools/manual-story-studio/src/server/http.ts` — register the two new routes inside their appropriate scopes (read in read scope; write in write scope).
- `tools/manual-story-studio/web/src/App.tsx` — bind `/worlds/:worldSlug/manual-stories/:msSlug/current-context/edit` to `<EditCurrentContext />`.
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` — mount `<CurrentStatePanel />` at the top; remove or de-emphasize the importance-bucketed records panel since the current-state panel is now primary.
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` — seed the "involved cast" picker default from `current_cast`; seed the "relevant records" picker default from `pinned_records`.
- `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` — add the "Mark state reviewed after SEG-N" button.

**No modification to:**

- `tools/manual-story-studio/src/schema/manual-story.ts` — `ManualStoryMetadata` schema unchanged; current-context is a sibling file, not embedded.
- The 15 prompt section helpers — section logic stays; the composer's *input* to those sections shifts when current-context is present.
- Any record-class schema — schema deepening explicitly deferred.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Soft Canon / Local Truth (must be explicit and author-controlled) | aligns @ current-context file | `current-context.yaml` is the cockpit's most explicit, most author-controlled local-truth surface: a named, hand-edited file naming exactly what the author considers current. |
| §Story Bundles §4a Plan-Authority Boundary (authoring authority is explicit, not derived) | aligns by analogy @ current-context file | Branching pipelines derive plan-authority via STPLAN; Manual Studio's analog is the hand-authored current-context. The principle (authoring authority is named, not inferred) maps cleanly. |
| §Story Bundles §6 Story-Bundle ID Classes (uppercase patterns) | aligns @ case-discipline | All IDs referenced in current-context are lowercase Manual Studio classes (`mchar-`, `mloc-`, `mclock-`, `msec-`, `mq-`, `mrel-`, `mobl-`, ...) plus uppercase `SEG-` (Manual Studio's segment class); no collision with world-index story-directory regexes. |
| Rule 6 No Silent Retcons | aligns @ last_reviewed_after_segment | The explicit state-review-marked surface prevents a future spec from silently inferring "state was reviewed" from prose or from segment count; it is set only by author action. |
| §Tooling Recommendation (least-privilege LLM packets) | aligns @ prompt composer | The composer's `current-context`-aware curation narrows the LLM packet to exactly the records relevant to the moment, increasing precision of the external request. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | No canon facts engaged. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` runs the new current-context tests alongside the existing suite. The compose-test extension asserts the selector preference under current-context-present vs absent.

Manual verification: create a fixture story with a `current-context.yaml` naming Mara as POV holder; compose a prompt; verify §3/§7 render Mara-centric content; remove the file; recompose; verify the importance fallback engages. Open the Edit Current Context page; verify the POV holder dropdown is populated from current-cast; verify saving an invalid POV (not in cast) returns a structured 422.

## 7. Acceptance criteria

1. `readCurrentContext` returns `{ok: true, value: null}` when the file is absent; `{ok: false, error: {code: "current-context-yaml-parse-failed"}}` when corrupted; `{ok: true, value: <ctx>}` when valid. (acceptance test)
2. `validateCurrentContext` rejects `pov_holder` not in `current_cast` with finding code `current-context-pov-not-in-cast`. (acceptance test)
3. `validateCurrentContext` rejects unknown record IDs in any reference field with finding code `current-context-reference-broken`. (acceptance test)
4. `PUT /api/.../current-context` with a valid body writes the file and returns `200`. (acceptance test)
5. `PUT /api/.../current-context` with an invalid POV holder returns `422` with the matching finding. (acceptance test)
6. The composed prompt's §3 Current Situation prefers `current_handoff_summary` when current-context is present. (acceptance test)
7. The composed prompt's §7 Cast and Voice renders `current_cast` members in `current_cast` order when current-context is present. (acceptance test)
8. With current-context absent, the composer's existing importance heuristic continues to drive selection. (acceptance test)
9. Dashboard renders the `CurrentStatePanel` from current-context when present; renders a "Set current context" affordance when absent. (manual verification)
10. The state-update checklist's "Mark state reviewed after SEG-N" button updates `last_reviewed_after_segment` correctly. (acceptance test)
11. SPEC-105's `/health` route emits `current-context-yaml-parse-failed` as a `blocking` finding when the file is corrupt; `current-context-reference-broken` as an `error` finding when references are stale. (acceptance test — integration with SPEC-105)
12. The `web/` `tsc --noEmit` step remains green.

## 8. Assumption reassessment

- **Assumption:** SPEC-105 has landed and the `ReadResult<T>` discriminated union is available at the read-layer surface. → Verified prerequisite; this spec lists SPEC-105 as a hard dependency. If SPEC-105 has not landed when implementation starts, pause this spec until it does — building current-context on the silent-null layer is regression.
- **Assumption:** Manual Studio's IDs are stable enough that pinning specific IDs into `current-context.yaml` will not break under casual refactors. → Verified: SPEC-101 / SPEC-104 establish per-class ID allocators with append-only semantics; references survive renames at the prefix level. The `validateCurrentContext` pass catches genuine breakage.
- **Assumption:** The state-update checklist component (SPEC-103) is in place to host the "Mark state reviewed" button. → Verified: `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` exists.
- **Assumption:** The composer's existing 15-section structure does not require restructure to accept current-context as a primary selector. → Verified by reading `tools/manual-story-studio/src/prompt/sections/`: each section helper takes a translator-context argument, and the composer constructs that context. Threading current-context-derived selections through to the existing context object is additive.
