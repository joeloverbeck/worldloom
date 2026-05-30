# SPEC-103 — Manual Story Studio: Prose Paste, Segment Storage, Manuscript Compilation, State Update Checklist

**Status:** PROPOSED
**Date:** 2026-05-30
**Classification:** story-canon-related (closes the externalized-LLM loop by accepting pasted prose as durable manuscript text and prescribing the post-paste state-update discipline; preserves §Story Bundles §4a Plan-Authority Boundary by treating pasted prose as manuscript, not authoritative state).
**Depends on:** **SPEC-100** (sandbox), **SPEC-101** (records + metadata), **SPEC-102** (prompts that segments reference). Land in order.
**Related:** `archive/specs/SPEC-99-context-packet-scene-surface-and-closeout.md` and predecessors (precedent that rendered prose is publication, not state); `docs/FOUNDATIONS.md` §Story Bundles §4a; `.claude/skills/branching-story-scene-prose-attach/SKILL.md` (precedent for "validates/attaches prose without mutating PG / SCN / SE state").
**Source:** critical triage of `reports/manual-story-studio-first-iteration.md` §12 / §13 milestone M4 (ChatGPT-Pro, 2026-05-30). Accepted as proposed; one out-of-report disclosure folded into the segment sidecar schema (the `prompt_sha256` field is informational and never gates any subsequent flow, per [[feedback_author_rejects_hash_coupling]]).

---

## 1. Context & Motivation

The author has a prompt (SPEC-102) and a third-party LLM. The author copies the prompt out, pastes the LLM's response back, reviews and edits it, and saves it as a segment. The manuscript grows segment by segment. State records (SPEC-101) update only by explicit author action — never inferred from prose.

This spec lands the close of the round trip: a paste-and-review editor, a Save Segment write flow, the segment sidecar that ties prose to the prompt that produced it, a deterministic `manuscript.md` compiler that concatenates segments in order, a Rebuild Manuscript command, and a state-update checklist that prompts the author to review record classes after each save without claiming any record changed.

The discipline mirrors `branching-story-scene-prose-attach` at the appropriate scope: validate/attach without mutating state. Manual Studio's version is lighter still — no receipts gate, no prose-quality verdict, no PG / SCN / SE coupling — because the validation surface doesn't exist outside the engine.

ChatGPT-Pro's proposal §12 / §13 is the design as accepted; this spec hardens it into a deterministic implementation.

## 2. Scope

### In scope

1. **Paste Prose editor screen** (frontend, `tools/manual-story-studio/web/src/pages/PasteProse.tsx`):
   - Large monospace editor for pasted prose.
   - Optional segment title input (free-form; defaults to truncated first sentence if blank at save).
   - Optional author note input.
   - Reference to the prompt that produced this prose (auto-set from the navigation context if the author arrived from Prompt Preview; otherwise selectable from saved prompts).
   - Live word count.
   - "Save Segment" primary action.
   - "Discard" action.
2. **Save Segment write flow** (backend, `tools/manual-story-studio/src/write/segments.ts`):
   - Allocate next segment ID (`SEG-<n>`, per-manual-story append-only).
   - Write `segments/SEG-<n>.md` (prose body only — pure Markdown, no frontmatter).
   - Write `segments/SEG-<n>.yaml` sidecar with the schema in §3 below.
   - Append `SEG-<n>` to `manual-story.yaml` `segment_order`.
   - If `manuscript.compile_on_segment_save: true` (default), recompile `manuscript.md`.
   - Return the new segment ID, sidecar, and a State Update Checklist payload (the list of record classes the author should review; per §4 of this spec).
3. **Segment sidecar schema** (`segments/SEG-<n>.yaml`):
   - `id: SEG-<n>`
   - `created_at` (ISO 8601)
   - `title` (string)
   - `prompt_id: PROMPT-<n>` (null if author didn't reference a prompt — manual segment authoring without prompt round-trip is permitted).
   - `prompt_sha256` (sha256 of the referenced prompt file's body at save time; informational only — never read as a precondition for any subsequent operation, per [[feedback_author_rejects_hash_coupling]]).
   - `moment_directive` (string — copied from the prompt sidecar if `prompt_id` set, else empty).
   - `selected_template: mtemplate-<n>` (null if none — SPEC-104 wires this).
   - `included_record_summary.characters` (`[mchar-*]` from prompt sidecar's `included_cast`).
   - `included_record_summary.records` (`[m*-*]` from prompt sidecar's `included_records`).
   - `author_note` (string).
   - `word_count` (integer; computed at save time; advisory).
4. **Deterministic `manuscript.md` compiler** (`tools/manual-story-studio/src/manuscript/compile.ts`):
   - Reads `manual-story.yaml` `segment_order`.
   - Reads each `segments/SEG-<n>.md` in order.
   - Concatenates with one blank line between segments.
   - If `manuscript.include_segment_titles: true`, prepends each segment's `title` as `## <title>` from the sidecar before the segment body.
   - Writes `worlds/<world>/manual-stories/<ms>/manuscript.md`.
   - Idempotent and side-effect-free (no records read or written).
5. **Rebuild Manuscript command**:
   - Backend route `POST /api/.../manuscript/rebuild`.
   - Frontend button on Manuscript view.
   - Useful when author edits a segment's prose file directly, when `compile_on_segment_save` is `false`, or when manual segment reordering happens.
6. **State Update Checklist UI** (frontend, `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx`):
   - Appears as a modal after Save Segment.
   - Lists record classes the author should review:
     - statuses, emotions, beliefs, relationships, objects, plans, clocks, secrets, questions, consequences, obligations, threads.
   - Lead text: "Review these categories manually. Manual Story Studio has not changed any records."
   - Each class has a "Review N records" button that opens the Records screen filtered to that class with the involved cast pre-filtered.
   - "Skip review" action closes the modal.
   - The checklist NEVER asserts that any record changed; the LLM cannot have changed Manual Studio state by definition.
7. **Manuscript view** (frontend, `tools/manual-story-studio/web/src/pages/Manuscript.tsx`):
   - Full compiled `manuscript.md` rendered as Markdown (read-only display).
   - Segment list sidebar (linked from `manual-story.yaml` `segment_order`).
   - Per-segment actions: Edit (opens Paste Prose editor pre-populated), Delete (hybrid policy per SPEC-101 §3), Reorder (UI affordance gated by `manuscript.allow_reorder` — default `false` for MVP; reorder is M6).
   - Rebuild Manuscript button.
   - Word count summary (per-segment + total).
   - "Open in Editor" hint (the file path of `manuscript.md` so the author can open it externally).
8. **Prompt History view** (frontend, `tools/manual-story-studio/web/src/pages/PromptHistory.tsx`):
   - Lists saved prompts (from `prompts/PROMPT-*.md`).
   - Per-prompt: id, created_at, moment_directive snippet, links to the segments produced from this prompt (computed by scanning segment sidecars for matching `prompt_id`).
   - Click a prompt → opens read-only view of the prompt body + sidecar.
   - "Reuse Prompt" action navigates back to Moment Composer pre-populated with the prompt's inputs.

### Out of scope

- Beat template selection in the prompt (SPEC-104) — segment sidecar reserves the `selected_template` field; SPEC-104 wires it.
- Segment reorder UI — `manuscript.allow_reorder` defaults `false`; reorder is M6 deferral.
- Failed-attempt history — the proposal §13 explicitly says "Do not store failed external attempts unless the user explicitly saves them. The default workflow should be disposable retries"; this spec ships that default.
- Diff view between two segments — M6.
- Export-to-other-format (PDF, EPUB) — M6.
- Persistent state-update checklist log (which classes the author actually reviewed) — M6.
- Auto-update of records from prose — explicitly forbidden by design.

## 3. Key decisions

- **Segment prose files are pure Markdown, no frontmatter.** The sidecar carries all metadata. This lets the author open `segments/SEG-<n>.md` in any Markdown editor without confusion; the YAML sidecar handles tooling needs separately.
- **Sidecar `prompt_sha256` is informational, never gating.** Recorded at save for audit purposes. No flow reads it as a precondition — editing the prompt after the segment is saved produces no warning, no validation failure, no auto-resync. Explicit per [[feedback_author_rejects_hash_coupling]].
- **`manual-story.yaml` `segment_order` is the source of truth for segment ordering.** The manuscript compiler reads it; the filesystem listing of `segments/*.md` is not authoritative. This lets the author hide a segment temporarily (remove from `segment_order` without deleting the file) and reorder by editing the YAML.
- **State Update Checklist never claims state changed.** Manual Studio cannot know whether the pasted prose implies state changes. The checklist asks the author to review classes; it does not pre-fill or pre-suggest record edits. This is the right discipline at the prose-attach scope — mirroring `branching-story-scene-prose-attach`'s "validates/attaches prose without mutating PG / SCN / SE state" position.
- **Deterministic compilation, not incremental.** The compiler reads all segments and writes the full manuscript on every save (and every rebuild). For MVP this is fast; if manuscripts grow large enough that recompile latency becomes annoying, optional incremental compile is M6.
- **Manuscript word count is advisory.** No floor, no ceiling, no quota. Per §9 prose-length discipline applied to the author's view of their own work.
- **Discarding without saving is the default for unwanted prose.** Pasted prose held in the editor before Save Segment is in-memory only and disappears on navigation. The author who wants to retain a discarded attempt does so manually (paste into a notes file). Manual Studio is opinionated against accumulating disposable retries.
- **Segment edit re-opens the Paste Prose editor.** Editing an existing segment is the same flow as creating one, pre-populated with the existing prose. On save, the segment is updated in place (same id, same sidecar except `updated_at` and `word_count`); the manuscript recompiles.

## 4. Files to touch

**Create (backend):**

- `tools/manual-story-studio/src/write/segments.ts` — save segment, sidecar, segment_order update.
- `tools/manual-story-studio/src/write/segment-id-allocator.ts` — per-manual-story append-only `SEG-<n>` allocator.
- `tools/manual-story-studio/src/manuscript/compile.ts` — deterministic compiler.
- `tools/manual-story-studio/src/read/segments.ts` — list / read segments.
- `tools/manual-story-studio/src/read/manuscript.ts` — read compiled manuscript.
- `tools/manual-story-studio/src/server/routes/segments.ts` — POST (save), GET (list / single), PUT (edit), DELETE (hybrid).
- `tools/manual-story-studio/src/server/routes/manuscript.ts` — GET manuscript, POST rebuild.
- `tools/manual-story-studio/src/server/routes/prompt-history.ts` — GET prompt list with linked segments.
- `tools/manual-story-studio/src/state-update-checklist.ts` — pure function: (saved segment sidecar, involved cast) → checklist payload (list of record classes + per-class counts of records referencing the involved cast).

**Create (frontend):**

- `tools/manual-story-studio/web/src/pages/PasteProse.tsx`
- `tools/manual-story-studio/web/src/pages/Manuscript.tsx`
- `tools/manual-story-studio/web/src/pages/PromptHistory.tsx`
- `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx`
- `tools/manual-story-studio/web/src/components/SegmentListItem.tsx`
- `tools/manual-story-studio/web/src/api/segments.ts`
- `tools/manual-story-studio/web/src/api/manuscript.ts`

**Modify:**

- `tools/manual-story-studio/src/server/http.ts` — register segment / manuscript / prompt-history routes.
- `tools/manual-story-studio/web/src/App.tsx` — add `/paste-prose`, `/manuscript`, `/prompt-history` routes.
- `tools/manual-story-studio/src/schema/manual-story.ts` — extend types for segment sidecar.
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (from SPEC-101) — wire the manuscript word count widget to the manuscript reader.

**Tests:**

- `test/segments-save-flow.test.ts` — save segment, verify sidecar shape, verify `segment_order` updated, verify manuscript recompiled.
- `test/manuscript-compile.test.ts` — fixture segments → byte-identical compiled manuscript.
- `test/segment-edit-and-rebuild.test.ts` — edit a segment, verify in-place update, verify manuscript regenerates.
- `test/state-update-checklist.test.ts` — checklist payload includes all 12 review classes with correct counts for fixture cast.
- `test/prompt-history.test.ts` — list prompts with linked segments by `prompt_id`.

**No modification to:**

- SPEC-100 / SPEC-101 / SPEC-102 surfaces (this spec consumes them).
- World canon, story bundles, hooks, validators, MCP, patch engine.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Story Bundles §4a Plan-Authority Boundary | aligns @ paste-as-manuscript-not-state | Pasted prose is durable under `segments/SEG-<n>.md`; no record is modified by the paste; the State Update Checklist explicitly disclaims state change ("Review these categories manually. Manual Story Studio has not changed any records."). |
| §Story Bundles §4 Write Discipline (rendered prose is publication, not state) | aligns @ segment-as-publication | Segments are the publication artifact; the source of truth for state is the records under `records/`; the manuscript is a deterministic compilation, never a state authority. |
| §Tooling Recommendation (LLM externalized via prompt packet) | aligns @ round-trip-close | Closes the SPEC-102 round trip: prompt out, prose in, segment saved, checklist prompts the author to update records. The LLM never touches Manual Studio state. |
| §9 Prose Length Discipline | aligns @ advisory-word-count | Word count is computed and displayed; no enforcement, no floor, no ceiling, no quota. |
| §Canonical Storage Layer engine-only-write discipline | aligns | All writes (segments, sidecars, manuscript, segment_order) land under `worlds/<slug>/manual-stories/<slug>/` via the SPEC-100 sandbox; `_source/` untouched. |
| §Story Bundles §6b Information / Observer Firewall | N/A | The firewall governs which cast members know what; Manual Studio segments are author-authored prose, not engine-emitted state; the author honors the firewall by reading the prompt's §10 / §12 reveal-permission framing before approving the LLM's prose. |

## 6. Build & test

`tools/manual-story-studio`: `npm test`. Determinism is the key test surface: fixture segments → byte-identical manuscript across runs.

## 7. Acceptance criteria

1. Author can paste prose into the editor, fill in optional title / note, and save a segment.
2. `segments/SEG-<n>.md` is written with the prose body only; `segments/SEG-<n>.yaml` sidecar carries the full schema in §3.
3. `manual-story.yaml` `segment_order` is updated append-only on each save.
4. `manuscript.md` recompiles automatically when `compile_on_segment_save: true`; manual Rebuild button works.
5. Manuscript compilation is deterministic: same inputs → byte-identical output across runs (tested).
6. State Update Checklist appears post-save, lists 12 review classes, never asserts state changed.
7. Segment edit (in-place update) preserves the sidecar's `id` and `created_at`, updates `word_count`, and triggers manuscript recompile.
8. Segment delete follows the hybrid policy from SPEC-101 §3.
9. Manuscript view shows full compiled manuscript with segment list and word count summary.
10. Prompt History view lists saved prompts with links to segments produced from them.
11. Discarded prose (paste-then-navigate-away) is not persisted anywhere.
12. `npm test` passes for `@worldloom/manual-story-studio`.

## 8. Risks & Open Questions

- **`prompt_sha256` is informational by author's standing position.** Recording it carries a tiny audit-trail benefit; never gating any flow on it keeps the editable-artifact discipline clean. If a future need for "did this prompt change since this segment was saved" surfaces, surface it as a UI-only diff hint (read-time computed), not a stored gate.
- **Segment edit overwrites prior prose without diff record.** The author who wants to keep prior prose for comparison should copy it into a notes file before editing. Acceptable for MVP; a per-segment edit history is M6.
- **The State Update Checklist's per-class counts (records referencing the involved cast) are read at save time, not after the author reviews.** If the author opens the Records screen via the checklist, edits records, returns to the dashboard, the checklist counts in the dashboard widget will refresh on next paint. No stale-checklist banner.
- **`manuscript.md` is written even when the author has not yet pasted any segments.** First-save creates the file with the one segment; first-rebuild on an empty `segment_order` writes an empty `manuscript.md`. This is acceptable; empty manuscript is a legitimate state.
- **No invariant-check on pasted prose.** If the LLM's response violates a forbidden-invention or forbidden-reveal listed in the prompt's §12, Manual Studio has no mechanism to detect it. The author is the gate. This is the deliberate boundary — Manual Studio is an authoring cockpit, not a prose validator.
- **No write to the prompt file from the segment save flow.** Segments reference prompts but never modify them. If a saved prompt is later deleted, the segment sidecar's `prompt_id` becomes a stale reference; the Prompt History view will not crash, but the "Reuse Prompt" action will fail with a clear "prompt no longer exists" message. Acceptable; saved prompt files are the author's to manage.
