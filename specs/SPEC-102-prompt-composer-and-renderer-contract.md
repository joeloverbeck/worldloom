# SPEC-102 — Manual Story Studio: Deterministic Prompt Composer + Renderer Contract Docs

**Status:** PROPOSED
**Date:** 2026-05-30
**Classification:** story-canon-related (the prompt composer is the externalization of FOUNDATIONS §Tooling Recommendation across a process boundary; reuses the canonical content-policy verbatim; introduces a Manual-Studio variant of the prose-craft-contract and render-time-instruction docs sibling to `docs/prose-renderer-contract/`).
**Depends on:** **SPEC-100** (package + sandbox), **SPEC-101** (records + Manual Character Profile + dashboard). Land SPEC-100, then SPEC-101, then this.
**Related:** `docs/prose-renderer-contract/content-policy.md` (reused verbatim), `docs/prose-renderer-contract/prose-craft-contract.md` (precedent for Manual Studio variant; not modified), `docs/prose-renderer-contract/render-time-instruction.md` (precedent for Manual Studio variant; not modified).
**Source:** critical triage of `reports/manual-story-studio-first-iteration.md` §10 / §11 / §18 milestone M3 (ChatGPT-Pro, 2026-05-30). Accepted as proposed; renderer-contract audit decisions ratified (reuse content-policy verbatim, create Manual Studio variants for prose-craft-contract and render-time-instruction).

---

## 1. Context & Motivation

The prompt composer is the heart of Manual Studio. The author edits records and the manuscript inside the cockpit; the external LLM generates prose; the bridge between them is one deterministic Markdown prompt the author copies into a third-party LLM and pastes the response back from. The composer's job is to assemble that prompt completely, verbatim where required, and cleanly — without engine-internal vocabulary, internal record IDs, or any leakage of the Manual Studio data model into the LLM-facing surface.

ChatGPT-Pro's proposal §10 / §11 / §18 lays out the composition pipeline, the 15-section Markdown format, the prompt lint discipline, and the renderer-contract audit. The triage accepts the proposal in full. This spec hardens it into a deterministic build: every input is a record file or a known doc file, every pipeline stage is testable in isolation, and every emitted prompt is byte-identical given the same inputs.

This is the Manual Studio surface that most directly realizes FOUNDATIONS §Tooling Recommendation ("LLM agents should never operate on prose alone... should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain"). Manual Studio externalizes the LLM, so the equivalent surface here is the external Markdown packet — and §Tooling Recommendation's intent is satisfied by composing that packet exhaustively per the proposal's §11 structure.

## 2. Scope

### In scope

1. **Moment Composer screen** (frontend, `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`):
   - Mandatory **moment directive** text area (free-form authorial statement of what the next prose should depict). Lint rejects empty directive.
   - Involved cast multi-select (defaults to `cast_order` from `manual-story.yaml`, author may narrow).
   - Relevant records picker (auto-suggests active records with `importance: high` or `central` and active records referencing involved cast; author may add/remove pins).
   - Optional move-family / tag / location selector (consumed by SPEC-104 beat-template filtering when present).
   - Optional selected beat template (deferred — SPEC-104 wires this in).
   - "Generate Prompt" button → navigates to Prompt Preview screen.
2. **Deterministic 12-stage composition pipeline** (backend, `tools/manual-story-studio/src/prompt/compose.ts`):
   1. Validate moment directive is non-empty.
   2. Load story metadata (`manual-story.yaml`) and prose preferences.
   3. Load selected cast profiles (`cast/mchar-*.yaml`).
   4. Load selected / active relevant records (`records/<class>/m*-*.yaml`).
   5. Load optional selected beat template (passed in; SPEC-104 produces the selection).
   6. Load canonical content policy verbatim from `docs/prose-renderer-contract/content-policy.md` (read at composer time, not bundled at build time, so doc updates flow through without rebuilding).
   7. Load Manual Studio prose craft contract from `docs/manual-story-studio/prose-craft-contract.md` (created in this spec — see §4).
   8. Translate records into novelist-facing language (per-class translators at `tools/manual-story-studio/src/prompt/translators/<class>.ts`; e.g., a belief becomes "Jon thinks Ane is hurt and is trying not to scare her off", a clock becomes "trust toward Ane is rising slowly", a secret becomes "Ane has not told Jon she was followed last week", a forbidden-reveal-tag becomes a "do not let the prose reveal: X" line in §12).
   9. Compose one Markdown prompt following the 15-section structure (§3 below).
   10. Run prompt lint (per §3 lint stage below).
   11. Return composed Markdown + lint status to the frontend Prompt Preview.
   12. On author "Save Prompt" action, write `prompts/PROMPT-<n>.md` + `prompt-runs/PROMPT-<n>.yaml` sidecar (sidecar carries: id, created_at, manual_story_slug, included_cast, included_records, included_template, moment_directive, prompt_sha256).
3. **External Markdown prompt format** (15 sections, fixed order, fixed headings):
   1. `## 1. Content Policy` — verbatim from `docs/prose-renderer-contract/content-policy.md`.
   2. `## 2. Story Contract` — title, tone, POV, tense, content intensity, prose preferences (rendered as author-facing prose, not YAML).
   3. `## 3. Current Situation` — short natural-language summary of the immediate situation, assembled from author-pinned records and the most recent segment's last paragraph if `prompt_policy.include_recent_segments > 0`.
   4. `## 4. Manual Moment Directive` — verbatim author directive.
   5. `## 5. Required Beat Cluster` — fixed instruction: "Render only the next 2-5 beats as continuous prose. Begin from the current situation. Follow the manual moment directive. Stop as soon as the immediate exchange or action produces the first materially new response point: a decision pressure, emotional turn, information change, practical result, refusal, reveal-withheld, changed tactic, or newly exposed vulnerability. Do not continue into the next scene. Do not summarize future consequences. Do not add choices. Do not add headings. Do not explain the prose."
   6. `## 6. Optional Beat Template Guidance` — present only if a template was selected (SPEC-104).
   7. `## 7. Cast and Voice` — for each involved cast member: voice baseline / under_pressure / intimacy / evasion / anger / lying, anti_generic_warnings, body & presence, pressure_behavior, prose_constraints. Translated into novelist-facing language.
   8. `## 8. Emotional and Relationship State` — active `memo-*` / `mrel-*` records relevant to involved cast.
   9. `## 9. Current Intentions and Plans` — active `mint-*` / `mplan-*` records for involved cast.
   10. `## 10. Relevant Beliefs, Secrets, and Open Questions` — active `mbel-*` / `msecret-*` / `mq-*` records, with reveal-permission language inferred from `secret.audience_visibility` and `question.must_not_resolve_unless`.
   11. `## 11. Physical Continuity` — location (`mloc-*`), bodies (cast body_and_presence), objects (`mobj-*`), props, recent concrete facts (active `mfact-*`).
   12. `## 12. Forbidden Inventions and Forbidden Reveals` — assembled from `secret.forbidden_reveal_tags`, `prose_constraints.prose_must_not_imply`, `prose_constraints.forbidden_inventions`, and any pinned record's prose constraints.
   13. `## 13. Style and Prose Craft` — verbatim from `docs/manual-story-studio/prose-craft-contract.md` (created in this spec).
   14. `## 14. Stop Rule` — fixed instruction: "Stop at the first materially new response point. The correct ending is the moment where the author has a new thing to decide, not the moment where the entire scene has resolved."
   15. `## 15. Output Instruction` — fixed instruction: "Output prose only. No commentary. No Markdown headings. No bullet points. No notes."
4. **Prompt lint** (`tools/manual-story-studio/src/prompt/lint.ts`):
   - Moment directive present and non-empty (rejects empty).
   - Content policy section is byte-for-byte equal to `docs/prose-renderer-contract/content-policy.md` body.
   - Selected cast profiles exist (no missing IDs).
   - Selected records exist (no missing IDs).
   - No internal record IDs in the output (`mchar-`, `mbel-`, `mrel-`, etc. must not appear anywhere in the composed prompt body except in the `prompt-runs/*.yaml` sidecar — verified by regex sweep of the prompt body).
   - No engine jargon (closed denylist: `PG-`, `SE-`, `SCN-`, `SLT-`, `STCHAR-`, `STENT-`, `STSEC-`, `STPLAN-`, `STEMO-`, `BEL-`, `SF-`, `CHC-`, `BR-`, `OBL-`, `CNSQ-`, `THR-`, `STSTAT-`, `STLOC-`, `STOBJ-`, `STQ-`, `DA-`, `CLK-`, `SLB-`, `SAU-`, `SP-`, `RSP-`, `CF-`, `CH-`, `INV-`, `M-`, `OQ-`, `ENT-`, `SEC-`, `CHAR-`, `PA-`, `EPE-`, `NCP-`, `NCB-`, `NWP-`, `PR-`, `RP-`, `AU-`).
   - No schema/validator/patch/lifecycle terms (closed denylist: `state_snapshot`, `state_delta`, `state_hash`, `patch_plan`, `submit_patch_plan`, `validator`, `validation_trace`, `supersession`, `superseded`, `append_only`, `mystery_policy`, `provenance.origin`, `bootstrap`, `record_version`, `schema_version`).
   - No Worldloom-specific record-class vocabulary in narrator voice (denylist as enforced text-mode, not metadata): the prompt body may quote `the beliefs of...` as natural language but must not say "BEL records" or "the SF authority is..." in narrator voice.
   - Lint failures show as red banner items in the Prompt Preview UI with the exact violating substring and section name; the author can re-edit upstream and recompose.
5. **`docs/manual-story-studio/prose-craft-contract.md`** (new file):
   - Borrows the principles of `docs/prose-renderer-contract/prose-craft-contract.md`: POV discipline, free indirect discourse, filter-word cuts, concrete sensory grounding, no ledger jargon, length-follows-content.
   - Removes scene-plan-specific diagnostic verdict vocabulary (the existing prose-craft-contract is the canonical source inlined into scene-plan diagnostics; that scope doesn't apply here).
   - Removes references to prior pages, planned scene boundaries, scene-range stopping points, page/scene-render integration language.
   - Adds Manual Studio-specific language: 2-5 beat cluster framing, manual directive primacy, prose-as-manuscript-not-state framing, "the author will update records manually after pasting prose" stop-implication.
6. **`docs/manual-story-studio/manual-render-instruction.md`** (new file):
   - Render the next 2-5 beats.
   - Obey the manual moment directive.
   - Output prose only.
   - Stop at the first materially new response point.
   - Do not continue the scene beyond that point.
   - Do not add choices.
   - Do not infer or announce future consequences.
   - Do not expose IDs or engine jargon.
   - Do not use the words "page", "scene", "act", "arc", "midpoint", "climax", or any other narrative-structure language.
   - The composer reads this file verbatim into §13 of the prompt only when `prompt_policy.include_render_instruction = true` (default `true`).
7. **Prompt Preview screen** (frontend, `tools/manual-story-studio/web/src/pages/PromptPreview.tsx`):
   - Shows the composed Markdown in a monospace pane.
   - Shows lint status: "clean external prompt" with section count, or numbered list of violations with section + offset.
   - "Copy to clipboard" button.
   - "Save Prompt" button (writes `prompts/PROMPT-<n>.md` + sidecar).
   - "Regenerate" button (re-runs composition with current author input).
   - "Edit Directive" / "Edit Cast" / "Edit Records" / "Edit Template" buttons (navigate back to Moment Composer with that section focused).

### Out of scope

- Beat template selection UI and the optional §6 inclusion — SPEC-104.
- Prose paste / segment save / state update checklist — SPEC-103.
- Compiled `manuscript.md` reading by the composer — SPEC-103 lands the compiled artifact; this spec reads only the most recent segment's last paragraph when `include_recent_segments > 0`, per item 3.5 above.
- Auto-import of world canon into the prompt — M6 deferral.
- LLM round-trip inside Manual Studio — explicitly forbidden by design.
- Prompt history search / full-text — M6 deferral.

## 3. Key decisions

- **Content policy is read at composer time, not bundled at build time.** Reading `docs/prose-renderer-contract/content-policy.md` per composition guarantees the freshest canonical text; the cost is one file read per prompt, which is trivial. Bundling would require a rebuild on every content-policy update.
- **Lint is hard-fail by default, soft-fail with author override.** A clean prompt is the default deliverable. The author can override lint and copy a flagged prompt anyway (UI: "this prompt has 2 lint violations — copy anyway?") because the lint denylists are conservative and may surface legitimate authorial language. Override is logged in the prompt sidecar so the author can audit later.
- **Per-class translators are pure functions of record → prose fragment.** No state, no LLM, no inferencing beyond the record's own fields. Tested per class with fixture records → expected prose fragments.
- **The 15-section structure is fixed.** Sections cannot be reordered, omitted (except §6 optional beat template), or extended without amending this spec. The fixed structure is what makes the prompt determinic and what makes the external LLM's behavior consistent across compositions.
- **Manual Studio's prose-craft variant is a sibling document, not a fork.** The original `docs/prose-renderer-contract/prose-craft-contract.md` is unchanged. `docs/manual-story-studio/prose-craft-contract.md` is authored fresh, borrowing principles but pruning scene-plan-specific scope.
- **No prompt-side validator for invariant compliance.** Manual Studio cannot verify that the external LLM's prose respects world invariants; that's the author's review responsibility before saving the segment (SPEC-103). The composer's lint is about the **outgoing** prompt's cleanliness, not about the **incoming** prose's correctness.
- **`prompt_sha256` is informational, never gating.** Per SPEC-103 the segment sidecar will carry `prompt_sha256` so the author can later audit which prompt produced which segment. No downstream flow reads it as a precondition — explicit per the author's standing position [[feedback_author_rejects_hash_coupling]] that hash coupling on editable artifacts is rejected.

## 4. Files to touch

**Create (backend):**

- `tools/manual-story-studio/src/prompt/compose.ts` — 12-stage pipeline.
- `tools/manual-story-studio/src/prompt/lint.ts` — denylist + verbatim-section check + ID-leak sweep.
- `tools/manual-story-studio/src/prompt/translators/index.ts` + per-class translators (`beliefs.ts`, `secrets.ts`, `intentions.ts`, `plans.ts`, `emotions.ts`, `relationships.ts`, `obligations.ts`, `consequences.ts`, `clocks.ts`, `threads.ts`, `questions.ts`, `artifacts.ts`, `statuses.ts`, `locations.ts`, `objects.ts`, `facts.ts`, `entities.ts`, `cast.ts`).
- `tools/manual-story-studio/src/prompt/sections/` — one file per Markdown section (§1 through §15), assembling section bodies from inputs.
- `tools/manual-story-studio/src/write/prompts.ts` — write `prompts/PROMPT-<n>.md` + sidecar; ID allocator for prompts (per-manual-story append-only).
- `tools/manual-story-studio/src/server/routes/prompts.ts` — `POST /api/.../prompts/preview` (composes + lints, returns body), `POST /api/.../prompts` (composes + writes), `GET /api/.../prompts` (lists), `GET /api/.../prompts/:id` (reads).

**Create (frontend):**

- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`
- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx`
- `tools/manual-story-studio/web/src/components/LintBadge.tsx`
- `tools/manual-story-studio/web/src/api/prompts.ts`

**Create (docs):**

- `docs/manual-story-studio/prose-craft-contract.md`
- `docs/manual-story-studio/manual-render-instruction.md`

**Modify:**

- `tools/manual-story-studio/src/server/http.ts` — register prompt routes.
- `tools/manual-story-studio/web/src/App.tsx` — add `/moment-composer` and `/prompts/preview` routes.

**Tests:**

- `test/prompt-compose.test.ts` — fixture manual story → fixture composed prompt; assert byte-identical for fixed inputs.
- `test/prompt-lint.test.ts` — assert each denylist rule fires on a synthetic violating prompt and passes on a clean one.
- `test/prompt-translators-<class>.test.ts` — per-class translator fixture tests.

**No modification to:**

- `docs/prose-renderer-contract/content-policy.md` (read verbatim).
- `docs/prose-renderer-contract/prose-craft-contract.md` (precedent only; not the source).
- `docs/prose-renderer-contract/render-time-instruction.md` (precedent only; not the source).

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Tooling Recommendation (LLM agents never operate on prose alone) | aligns @ externalized-LLM packet | The 15-section Markdown prompt is Manual Studio's externalized §Tooling Recommendation packet: World Kernel content reaches the LLM via §2 Story Contract + §11 Physical Continuity; Invariants reach via §13 Style and Prose Craft + §12 Forbidden Inventions; relevant records reach via §3 / §7 / §8 / §9 / §10; mystery-reserve discipline reaches via §10 / §12. Realized across a process boundary rather than via MCP. |
| §9 Prose Length Discipline (no word-count quotas) | aligns @ stop-rule | §5 Required Beat Cluster and §14 Stop Rule use "stop at the first materially new response point", never a word count. Manual Studio's prose-craft-contract.md borrows this discipline. |
| §Story Bundles §4a Plan-Authority Boundary | aligns @ no-state-output | The composer's output is one Markdown prompt for the external LLM; nothing about the composed prompt mutates Manual Studio state. The prompt is published; state remains the author's edit responsibility. |
| §Story Bundles §5c Present Causal State, Not Narrative Shape | aligns @ language-discipline | `docs/manual-story-studio/manual-render-instruction.md` explicitly forbids the words "page", "scene", "act", "arc", "midpoint", "climax" — the same prohibition §5c places on the engine surface, applied to the LLM-facing render instruction. |
| §Story Bundles §6b Information / Observer Firewall | aligns @ secret-visibility-gating | §10 Relevant Beliefs / Secrets / Open Questions translates `secret.audience_visibility` and `question.must_not_resolve_unless` into reveal-permission language; §12 Forbidden Inventions repeats `forbidden_reveal_tags` as do-not-reveal instructions. Firewall enforcement is at composer scope. |
| §Canonical Storage Layer engine-only-write discipline | aligns | The composer writes only `prompts/PROMPT-<n>.md` + `prompt-runs/PROMPT-<n>.yaml` inside the manual story root (sandbox-bounded); no write to `_source/`, no patch-engine touch. |

## 6. Build & test

`tools/manual-story-studio`: `npm test`. Fixture-based determinism is the key test surface — a fixed manual story + fixed cast + fixed records + fixed directive → byte-identical composed Markdown across runs. Lint tests use synthetic prompts with one violation each; a clean prompt fixture passes all lint rules.

## 7. Acceptance criteria

1. Composer pipeline runs end-to-end for a fixture manual story; output is byte-identical across runs given identical inputs.
2. All 15 sections appear in fixed order with correct content; content policy is verbatim from `docs/prose-renderer-contract/content-policy.md` (tested by byte-equality).
3. Every prompt-lint rule fires on at least one synthetic violation fixture and passes on the clean fixture.
4. Author can compose, preview, copy, regenerate, and save prompts from the UI.
5. Saved prompts land under `prompts/PROMPT-<n>.md` with sidecar `prompt-runs/PROMPT-<n>.yaml`; ID allocation is append-only.
6. `docs/manual-story-studio/prose-craft-contract.md` and `manual-render-instruction.md` exist and are read at composer time.
7. Prompt body contains no Manual Studio internal record IDs (regex sweep verifies absence of `m[a-z]+-[0-9]+`).
8. Prompt body contains no engine jargon (denylist sweep verifies absence of all uppercase-class IDs and schema/validator terms).
9. Override flow ("copy anyway") logs the override in the sidecar.
10. `npm test` passes for `@worldloom/manual-story-studio`.

## 8. Risks & Open Questions

- **Per-class translator authoring is the largest single piece of this spec.** Each translator is a small pure function but there are 17 of them; quality of the composed prompt depends on translator quality. Translators are expected to evolve as the author exercises Manual Studio; per-class fixture tests pin behavior so regressions are visible.
- **Lint denylists may surface false positives.** The author override path exists for this. As usage patterns surface, the denylists can be tuned in a follow-up ticket without amending this spec.
- **The author can edit the saved prompt before copying.** The sandbox permits direct edits to `prompts/PROMPT-<n>.md`. Per [[feedback_author_rejects_hash_coupling]], the sidecar's `prompt_sha256` is recorded at save time but never re-verified — editing post-save does not regenerate the hash and no flow gates on it. This is the right default; if a future need for "what prompt actually shipped" provenance arises, surface it as a follow-up rather than coupling state here.
- **`docs/prose-renderer-contract/content-policy.md` may evolve.** When it does, the next composed prompt picks up the change automatically; previously-saved `prompts/PROMPT-<n>.md` files retain their own snapshot. This is correct for a writing tool: the saved prompt is the historical artifact.
- **No interactive cast-voice authoring in the prompt.** The prompt embeds the cast profile's voice section verbatim. If the author wants a one-off voice tweak for a particular scene, they edit the profile and re-compose. Acceptable for MVP.
- **The Manual Studio variants of prose-craft-contract and manual-render-instruction are siblings to the canonical files, not patches on them.** This avoids fork-drift complexity: the canonical files exist for the branching pipeline; Manual Studio's variants exist for Manual Studio. Drift between them is expected and acceptable.
