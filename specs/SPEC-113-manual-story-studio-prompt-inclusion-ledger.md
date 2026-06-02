# SPEC-113 — Manual Story Studio: Prompt Inclusion Ledger, Prompt Preview Inspector, and Working-Set Explicit Exclusion

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (backend compose-result extension + frontend Prompt Preview rebuild + one working-set schema field; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-102-prompt-composer-and-renderer-contract.md (extends the deterministic compose result), archive/specs/SPEC-109-manual-story-studio-current-context-layer.md (adds `excluded_records` to the current-context/working-set surface), archive/specs/SPEC-112-manual-story-studio-record-pickers.md (the Prompt Preview inspector reuses the archived `RecordPicker` / extended `RecordCard` presentation).
**Blocks:** —
**Related:** `tools/manual-story-studio/src/prompt/compose.ts`, `tools/manual-story-studio/src/prompt/types.ts`, `tools/manual-story-studio/src/prompt/sections/`, `tools/manual-story-studio/src/schema/current-context.ts`, `tools/manual-story-studio/src/schema/manual-story.ts`, `tools/manual-story-studio/web/src/pages/PromptPreview.tsx`, `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx`.
**Source:** critical triage of `reports/manual-story-studio-third-iteration.md` §13 / §14 / §19 / §32 / §33 / §39 Stages 1,3,4 (ChatGPT-Pro, 2026-06-02). Accepted **with modification**: the report's full 5-value per-record `prompt_mode` redesign is reduced to "explicit working-set exclusion + an inclusion ledger" (see §3); the report's on-disk file rename (`current-context.yaml` → `prompt-working-set.yaml`) is **declined** and replaced by a UI-label-only reframe.

---

## 1. Context & Motivation

Verified from the tree: `composePrompt()` (`src/prompt/compose.ts`) returns exactly `{ markdown, lint, sidecar_draft }` (`src/prompt/types.ts` `PromptComposeResult`). There is **no** per-record account of what was included, excluded, suppressed, or blocked, and **no** section→record mapping. `PromptPreview.tsx` is therefore a `<pre>` block of the markdown plus a lint badge and a toolbar — it cannot answer the author's real question: *"Did the app process my records the way I expected?"*

The report calls this "the missing backbone of Prompt Preview" (§14) and "confidence UX, not a validator console" (§19). It is the second-highest-value fix after pickers, and it is fully deterministic — no engine, no LLM, no network — so it fits the package boundary cleanly.

Two report proposals are trimmed before acceptance:

1. **The 5-value per-record `prompt_mode` (`default/always/pinned_next/excluded/never_prompt`) is reduced.** The current per-record `prompt_visibility` enum (`always / include_when_relevant / only_if_pinned`) already covers always-include, conditional-include, and pin-gated. The genuine gaps are (a) no explicit *exclude* and (b) no explainability. `pinned_next` duplicates the working-set's existing `pinned_records`; `never_prompt` overlaps `only_if_pinned` for scaffolding records. So this spec keeps `prompt_visibility` as-is and adds **one** thing on the selection side — a working-set-level `excluded_records` list — plus the ledger. A future spec may revisit the per-record enum if real use shows `only_if_pinned` is insufficient for "private scaffolding."

2. **The file rename is declined.** Renaming `current-context.yaml` to `prompt-working-set.yaml` with a migration/read-compat shim is churn against zero functional gain and adds exactly the kind of state coupling the author prefers to avoid on freely-editable artifacts. Instead, the **UI label** "Current State / Current Context" becomes "Prompt Working Set" (the conceptual reframe the report actually wants — "it is a selection lens, not state"), while the on-disk file keeps its name. The reframe is a string/label change, not a storage migration.

## 2. Scope

### In scope

1. **`excluded_records` on the working set.** Add an optional `excluded_records: string[]` field to the current-context schema (`src/schema/current-context.ts`) and its validator. Semantics: a record in `excluded_records` is suppressed from the composed prompt for the next run regardless of its `prompt_visibility` or importance (must-not-reveal continues to suppress *revealable content* separately, per existing behavior). Edited via a `<RecordPicker>` (archived SPEC-112) in `EditCurrentContext.tsx`.
2. **An inclusion ledger on the compose result.** Extend `PromptComposeResult` with a structured `resolution` object (name final at implementation; `inclusion_ledger` acceptable) carrying, deterministically:
   - `included`: per record → `{ id, title, class, reason, section }` where `reason ∈ {explicitly_selected, pinned, active_secret_question, current_cast}` — each maps to an actual `composePrompt` seeding path (`explicitly_selected` = the Moment Composer `included_records` selection; `pinned` = working-set `pinned_records`; `active_secret_question` = `active_secrets_questions`; `current_cast` = a cast profile seeded from `current_cast`) — and `section` is the prompt section number/name it landed in. (Section 3's "Pinned situation context" membership is further narrowed by the existing central/high-importance-or-cast-referenced display filter in `section-3-current-situation.ts`; the ledger records the resulting §3 membership, it does not introduce a new relevance gate.)
   - `excluded`: per record → `{ id, title, class, reason }` where `reason ∈ {inactive, working_set_excluded}` — `inactive` = a seeded record dropped by the existing `active === false` check (`compose.ts` stage 4); `working_set_excluded` = present in the working set's `excluded_records`. The ledger reports only on records compose actually enumerates (the seeded set + cast); it does not scan the whole record corpus to manufacture `only_if_pinned`/relevance verdicts for records that were never seeded. (See §3 "Descriptive ledger, not evaluative.")
   - `suppressed`: per record → `{ id, title, reason: must_not_reveal }` (record may still contribute a safety warning, matching current must-not-reveal behavior).
   - `blocked`: per record/input → `{ ref, reason }` for unresolved/malformed/missing inputs that the lint already flags (the ledger surfaces them grouped, not re-lints them).
   - `section_map`: per emitted section → the record ids that fed it (e.g. "§8 ← these emotion/relationship records").
   The ledger is **derived during the existing 12-stage compose**, not a second pass: each stage that already decides inclusion records its decision into the ledger as it goes. Determinism is preserved (same inputs → byte-identical ledger).
3. **Prompt Preview inspector (two-pane).** Rebuild `PromptPreview.tsx` into: left = the markdown `<pre>` (kept) + copy/save toolbar + lint badge; right = the **Prompt Inspector** rendering the ledger as grouped, card-based sections: copy status (allowed/blocked), hard-lint findings, selected cast, selected template, working set, included-with-reasons, excluded-with-reasons, suppressed reveals, sections-generated, and missing/blocked inputs. Records render via the extended `RecordCard` surface from archived SPEC-112. Each excluded/suppressed entry states *why*.
4. **UI relabel.** Replace user-facing "Current State" / "Current Context" labels with "Prompt Working Set" (or "Current Writing Focus") across the pages that surface it (`EditCurrentContext.tsx` heading, `CurrentStatePanel.tsx`, the `StoryPageNav.tsx` nav entry; the Dashboard panel is `CurrentStatePanel`, relabelled transitively). On-disk filename unchanged.

### Out of scope

- The full 5-value per-record `prompt_mode` enum (declined → minimal `excluded_records` instead; revisit only if real use proves `only_if_pinned` insufficient).
- Renaming `current-context.yaml` on disk or any migration shim (declined).
- A prompt-inclusion *toggle on every record card* outside Prompt Preview / bulk include-exclude (report §24) — deferred to the post-segment workbench follow-up.
- Changing the 15 prompt sections or the section emitters' content (report §38: keep 15 sections; "the problem is inclusion control and explainability, not section count"). The emitters gain ledger-recording side-output only; their emitted markdown is unchanged.
- New search backend / index.

## 3. Key decisions

- **Trim the enum, add one selection field.** The minimal change that delivers explicit exclude + explainability is `excluded_records` (working-set) + the ledger. Rewriting the per-record enum would be a schema migration affecting every record with no proven need; YAGNI applies. Documented as a deliberate reduction of the report's proposal.
- **Decline the file rename; relabel the UI.** The reframe the report wants ("selection lens, not state") is delivered by the label change; the filename is an implementation detail the author may hand-edit, and renaming it buys nothing while adding migration risk and coupling. (Consistent with the author's freely-editable-artifact / zero-coupling preference.)
- **Build the ledger inside the existing compose, not as a parallel pass.** Re-deriving inclusion in a second function would risk drift between "what the markdown contains" and "what the ledger claims." Recording each stage's decision as it fires guarantees the ledger describes the actual composition.
- **Descriptive ledger, not evaluative.** The ledger's reason vocabulary describes the inclusion decisions `composePrompt` actually makes — record seeding (`explicitly_selected` / `pinned` / `active_secret_question` / `current_cast`) and the existing `active === false` / `excluded_records` drops — not an aspirational `prompt_visibility`-driven or relevance-scored model. Compose ignores `prompt_visibility` at composition time (the enum is authored on records at `src/schema/manual-story.ts` but never consulted in `compose.ts`/`sections/`) and never seeds `current_location` / `active_pressure_clocks` as records, so reason values such as `relevant_active`, `current_location`, `active_clock`, `only_if_pinned_unpinned`, and `not_relevant` (the report §14 model) have no real inclusion path here. Surfacing them would require a read-only whole-corpus evaluation pass — exactly the "second pass" this spec avoids — and would mean teaching compose to honor `prompt_visibility`. If real use later proves the richer reasons necessary, that evaluative pass is where they would land; it is deliberately out of scope now.
- **`last_reviewed_after_segment` is retained, not removed.** Report §13 proposes removing or demoting `last_reviewed_after_segment` from the working set ("belongs to workflow status, not prompt focus"). It is retained as-is: it is load-bearing for the SPEC-108 repair precondition (`src/schema/current-context.ts` comment; consumed in `src/validate/current-context.ts`). Because the on-disk file is not renamed (the rename is declined above), keeping a workflow-status field alongside the prompt-focus fields creates no semantic conflict, and demoting it is deferred to any future workflow-status refactor.
- **The inspector is confidence UX, not a validator.** It groups by author-meaningful reasons ("included because current cast", "excluded because you excluded it") rather than by lint rule. Lint findings remain a separate, already-existing badge.
- **must-not-reveal stays separate from `excluded_records`.** Exclusion drops a record entirely; must-not-reveal keeps the record present but suppresses its revealable content and may emit a safety warning — distinct behaviors the ledger reports in distinct buckets. When a record appears in BOTH `excluded_records` and `must_not_reveal`, exclusion wins: the record is dropped entirely and reported under `excluded` (reason `working_set_excluded`), not under `suppressed`.

## 4. Files to touch

**Modify:**

- `tools/manual-story-studio/src/schema/current-context.ts` — add optional `excluded_records: string[]`.
- `tools/manual-story-studio/src/validate/` (current-context validator) — validate `excluded_records` entries as known record refs (same treatment as `pinned_records`).
- `tools/manual-story-studio/src/prompt/types.ts` — extend `PromptComposeResult` with the `resolution`/`inclusion_ledger` shape (§2 item 2).
- `tools/manual-story-studio/src/prompt/compose.ts` — thread ledger-recording through the existing stages; apply `excluded_records` suppression; keep determinism.
- `tools/manual-story-studio/src/prompt/sections/*.ts` — each emitter reports which record ids it consumed into the `section_map` (side-output only; emitted markdown unchanged). In particular `section-3-current-situation.ts` records its "Pinned situation context" membership and reasons.
- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` — rebuild into the two-pane inspector (§2 item 3).
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` — add an `excluded_records` `<RecordPicker>`; apply the "Prompt Working Set" relabel.
- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` (two `<h2>Current State</h2>` occurrences) and `tools/manual-story-studio/web/src/components/StoryPageNav.tsx` (the `{ label: "Current State", … }` nav entry) — apply the "Prompt Working Set" relabel. (`Dashboard.tsx` renders `CurrentStatePanel`, so the dashboard panel is relabelled transitively; there is no separate Dashboard-level label site.)
- `tools/manual-story-studio/web/src/api/prompts.ts` — surface the new `resolution` field from the compose response.
- `tools/manual-story-studio/web/src/types/manual-story.ts` — add the frontend `resolution` / `inclusion_ledger` types to the web `PromptComposeResult` interface (mirroring `src/prompt/types.ts`) so the two-pane inspector typechecks under `npm --prefix web test`. (Without this the inspector cannot reference `composeResult.resolution`; the backend `types.ts` change alone does not reach the web type tree.)

**Create:**

- `tools/manual-story-studio/test/prompt/inclusion-ledger.test.ts` — asserts the ledger is deterministic, that `included.section` matches where the record actually appears, that `excluded_records` produces an `excluded` entry with reason `working_set_excluded` and the record is absent from the markdown, that an inactive record reports `inactive`, and that must-not-reveal reports `suppressed` (not `excluded`).
- `tools/manual-story-studio/test/web/prompt-inspector.test.ts` — asserts the inspector renders included/excluded/suppressed/blocked groups from a ledger fixture. (Files under `test/web/` compile and run under `node --test` via `npm run test:backend` / `npm test`, like the existing `test/web/record-picker.test.ts`; this is the available-harness level for web-component logic, distinct from the `npm --prefix web test` `tsc --noEmit` typecheck.)

**No modification to:** the 15-section set, segment/manuscript pipeline, record schema beyond `current-context`, ID format/storage.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Soft Canon / Local Truth (explicit + validated) | aligns @ inclusion ledger | The ledger makes the prompt's selection lens explicit and inspectable — the author can verify exactly which local-truth records reached the prompt and why, rather than trusting an opaque heuristic. |
| §Tooling Recommendation (deterministic, least-privilege packets) | aligns @ derived-during-compose ledger | The ledger is computed deterministically inside the existing pipeline with no LLM/network; explicit `excluded_records` lets the author *narrow* what reaches the external LLM, tightening the packet. |
| Rule 6 No Silent Retcons | aligns @ explainability | Surfacing why each record was included/excluded prevents silent, unexplained shifts in what the prompt asserts between runs — a change in inclusion is now visible in the ledger. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | No world-canon facts; story-local prompt composition only. |
| §World Generativity vs Story-Bundle State | N/A @ tooling-adjacent | Working set + ledger operate over manual-story records only; outside both world canon and the story-bundle pipeline. (Corrects report §7's framing.) |

## 6. Build & test

`tools/manual-story-studio`:
- `npm run test:backend` runs the ledger determinism + reason-bucket tests under `node --test`.
- `npm --prefix web test` (web `tsc --noEmit`) covers the inspector + the new `excluded_records` picker mount.
- `npm test` runs both; `npm run build` must succeed.

## 7. Acceptance criteria

1. **PASS rationale required.** `composePrompt()` returns a `resolution`/`inclusion_ledger` with `included` / `excluded` / `suppressed` / `blocked` / `section_map`, and a determinism test confirms byte-identical ledger output for identical inputs.
2. A record listed in the working set's `excluded_records` is absent from the composed markdown and appears in `excluded` with reason `working_set_excluded`.
3. An inactive record (one that was explicitly selected, pinned, or otherwise seeded but carries `active: false`) appears in `excluded` with reason `inactive`.
4. A must-not-reveal record appears in `suppressed` (not `excluded`), and the existing safety-warning behavior is preserved.
5. `section_map` correctly attributes each included record to the section it actually fed (verified against the markdown).
6. Prompt Preview shows the two-pane inspector; every excluded/suppressed entry states a reason; copy/save status is shown.
7. User-facing labels read "Prompt Working Set" (no "Current State"); the on-disk `current-context.yaml` filename is unchanged and the file remains hand-editable.
8. `npm test` is green; `npm run build` succeeds.

## 8. Risks & Open Questions

- **Ledger reason vocabulary is descriptive by design.** The reason enums (`included`: `explicitly_selected` / `pinned` / `active_secret_question` / `current_cast`; `excluded`: `inactive` / `working_set_excluded`) intentionally cover only the inclusion paths `composePrompt` actually exercises today. The richer report §14 model (`relevant_active`, `only_if_pinned_unpinned`, `not_relevant`, etc.) is deferred to a future evaluative pass that would also make compose honor `prompt_visibility` (see §3 "Descriptive ledger, not evaluative"). If decomposition or implementation surfaces author demand for the richer reasons, route it to that follow-up rather than widening this spec.
- **`section_map` requires touching all 15 section emitters.** `assembleSections` (`src/prompt/sections/index.ts`) currently returns markdown strings only; recording which record ids fed each section means each emitter must also return its consumed-id set (or an equivalent side-channel). This is a signature/return-shape change across `section-3` … `section-12` (translator-driven sections 7–11 carry most of the per-record attribution). Determinism must be preserved (insertion-ordered structures, no wall-clock).
- **must-not-reveal / `excluded_records` overlap.** Resolved in §3: exclusion wins (record dropped, reported under `excluded`). The implementation must apply `excluded_records` suppression at the seeding stage (`compose.ts` stage 2.5 / stage 4) before the must-not-reveal `suppressed` bucket is populated, so a doubly-listed record never reaches `suppressed`.
- **`last_reviewed_after_segment` retained.** Per §3, the report §13 demotion is declined (SPEC-108 repair precondition depends on it). Any future workflow-status refactor that revisits this field is out of scope here.
