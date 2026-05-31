# SPEC-104 — Manual Story Studio: Beat Templates, Deterministic Filtering, Candidate UI

**Status:** PROPOSED
**Date:** 2026-05-30
**Classification:** story-canon-related (introduces the manual analogue of SLT commitment blocks at a deliberately lighter scope; reuses the storylet-filtering staging pattern of `select-storylet-candidates` without engine-grade scope/predicate/effect/saliency machinery; surfaces template selection back into the SPEC-102 prompt composer).
**Depends on:** **SPEC-100** (sandbox + package), **SPEC-101** (records that the filter consumes), **SPEC-102** (prompt composer §6 hook point for selected template), `archive/specs/SPEC-103-prose-paste-segments-and-manuscript.md` (segment sidecar's `selected_template` field). Land in order.
**Related:** `docs/FOUNDATIONS.md` §Story Bundles §5a (commitment blocks are causal moves, not arcs — Manual Studio borrows the discipline without the schema); `.claude/skills/commitment-block-authoring/SKILL.md` (precedent for storylet authoring); `mcp__worldloom__select_storylet_candidates` (precedent for staged deterministic filtering); proposal §8 / §9 / §15.
**Source:** critical triage of `reports/manual-story-studio-first-iteration.md` §8 / §9 milestone M5 (ChatGPT-Pro, 2026-05-30). Accepted with one modification: enum vocabularies for `move_family`, `tone_fit`, and `relationship_axes` are explicitly defined in this spec rather than left implicit.

---

## 1. Context & Motivation

Beat templates are Manual Studio's lightweight analogue of `SLT` commitment blocks. An author working in Manual Studio over time develops a library of reusable "shapes" — "soft confrontation that lets the other person retreat", "delayed reveal under social pressure", "interruption that resets the room" — and wants to invoke one when composing a new prompt. Beat templates are the author's reusable card collection.

The proposal correctly names them "beat templates" in the UI (not "storylets") to defuse the implication of an autonomous selection / execution engine. Manual Studio never auto-selects a template; the author always picks. The deterministic filtering pipeline narrows the visible candidates by structural compatibility — active templates, role-slot satisfiability against selected cast, required record classes present, required tags present, location/tone compatibility, forbidden-secret/reveal compatibility — and surfaces a "why suggested" trace per candidate. The author chooses or skips.

ChatGPT-Pro's proposal §8 / §9 sketches the schema, the filter stages, and the candidate card UI. The triage accepts in full and resolves the enum-vocabulary gap explicitly.

This spec is intentionally last in the M1-M5 sequence because beat templates are optional to the round trip: SPEC-100 + SPEC-101 + SPEC-102 + SPEC-103 form a complete working cockpit without templates, and templates layer on as the author's library accretes.

## 2. Scope

### In scope

1. **Manual Beat Template schema** (one file per template, at `worlds/<slug>/manual-stories/<slug>/records/beat-templates/mtemplate-<integer>.yaml`):
   - `id: mtemplate-<integer>` (numeric integer suffix, matching SPEC-101's per-class allocator at `tools/manual-story-studio/src/write/id-allocator.ts` and `docs/ID-ALLOCATION.md` §Manual-story-scoped; widening the allocator to admit slug suffixes is explicitly flagged in the allocator as a deliberate single-point change and is out of scope here).
   - `title` (string).
   - `active` (bool, default `true`).
   - `classification.move_family` (closed enum: `negotiation | confrontation | seduction | escape | reveal | concealment | bargaining | care | grief | celebration | confession | refusal | observation | travel | preparation | aftermath | other`).
   - `classification.tags` (string array; free-form authorial tags, e.g., `relationship`, `hurt`, `guarded-truth`, `park`).
   - `classification.intensity` (one of `general | mature | explicit`, mirroring story-contract `content_intensity`).
   - `classification.tone_fit` (closed enum array: `intimate | tender | tense | comic | bleak | wry | reverent | clinical | feverish | hushed | ceremonial`).
   - `role_slots` (map; each slot key is a free-form name like `initiator`, `guarded_other`; each value is `{compatible_roles: [<role>]}` where `<role>` is from the SPEC-101 closed role enum: `viewpoint | primary_actor | opposing_actor | allied_actor | authority | dependent | witness | information_source | pressure_source | social_bridge | background`).
   - `requires.record_classes_any` (string array of record-class names, e.g., `["beliefs", "emotions", "relationships"]`).
   - `requires.record_tags_any` (string array, e.g., `["hurt", "secrecy", "mistrust"]`).
   - `requires.relationship_axes_any` (closed enum array; subset of SPEC-101 relationship axes: `trust | fear | attraction | power | respect | familiarity`).
   - `requires.location_tags_any` (string array, e.g., `["public", "semi-private", "park"]`).
   - `excludes.record_tags_any` (string array, e.g., `["active-violence", "chase"]`).
   - `excludes.forbidden_if_secret_tags` (string array — secrets whose `forbidden_reveal_tags` overlap any value here exclude the template; e.g., `["must-not-reveal-yet"]`).
   - `beat_guidance` (array of 1-5 objects, each `{function: "setup" | "pressure" | "turn" | "exit" | "aftermath", instruction: string}`).
   - `forbidden_inventions` (string array, copied verbatim into the SPEC-102 prompt §12 when the template is selected).
   - `author_notes` (string).

   **`manual-story.yaml` `prompt_policy` extension** (extends SPEC-101 §2.1's `prompt_policy` block):
   - `prompt_policy.recent_template_advisory_window` (int, default `2`) — number of trailing segments scanned for the §2.2 stage-8 recent-use advisory. The recent-use scan reads each segment's sidecar `selected_template` to build the per-template last-used set. The default of 2 matches the proposal §9 intent ("Recent-use advisory, not hard block") at the lightest useful window. Setting to `0` disables the advisory entirely.
2. **Deterministic 9-stage filtering pipeline** (backend, `tools/manual-story-studio/src/templates/filter.ts`):
   - Inputs: current manual story metadata, selected cast (subset of `cast_order`), active records (per SPEC-101 active flag), moment directive (string), optional author-selected move_family / tags / location, all beat templates.
   - Stage 1: Active templates only (`active: true`).
   - Stage 2: Content-intensity compatibility (template `classification.intensity` ≤ story-contract `content_intensity`, comparing on the ordered enum `general < mature < explicit`).
   - Stage 3: Role-slot satisfiability against selected cast (each role slot has at least one candidate cast member whose `roles` array intersects the slot's `compatible_roles`).
   - Stage 4: Required record classes present (every class in `requires.record_classes_any` has at least one active record in the manual story; `_any` semantics: the template requires *at least one* of the listed classes to be present, not all).
   - Stage 5: Required tags present (any active record carries any tag in `requires.record_tags_any`).
   - Stage 6: Location / tone compatibility (selected location's `tags` intersect `requires.location_tags_any` if non-empty; story-contract `tone` field — when populated — does not block but ranks via tone-fit; per stage 9 sort).
   - Stage 7: Forbidden-secret / forbidden-reveal compatibility (no active secret's `forbidden_reveal_tags` intersect `excludes.forbidden_if_secret_tags`; no active record's tags intersect `excludes.record_tags_any`).
   - Stage 8: Recent-use advisory (template used in the last `prompt_policy.recent_template_advisory_window` segments — see §2 In scope item 1's `prompt_policy` block extension — surfaces as an advisory badge; NOT a hard block).
   - Stage 9: Sort by: (a) author explicit pin first, (b) tag overlap with required + selected tags, (c) role-fit count, (d) tone-fit overlap with story-contract `tone` if populated, (e) recent-use advisory (deprioritize recently-used), (f) title alphabetical as tiebreak.
   - Output: ordered list of `{template, why_suggested, advisory_flags}` objects.
3. **`why_suggested` trace assembly**:
   - String array of human-readable reasons: `"relationship + hurt + guarded truth"` (tag overlap), `"selected cast fits initiator/guarded_other"` (role-slot match), `"location: park"` (location-tag match), etc.
   - One line per matched filter dimension; capped at 4 lines per template to keep cards readable.
   - The author sees the trace on each candidate card per proposal §9.
4. **Beat Template CRUD UI** (frontend, `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx`):
   - List view (active / archived toggle, filter by move_family).
   - Per-template card: title, move_family badge, tags, beat count, last-used segment.
   - Detail view: full schema renderer with section-grouped fields.
   - Create / Edit form: per-section editors for classification, role_slots (slot-name + compatible-roles multi-select), requires, excludes, beat_guidance (1-5 ordered rows), forbidden_inventions, author_notes.
   - Delete follows the SPEC-101 hybrid policy.
5. **Candidate Cards UI** (frontend, `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx`):
   - Renders in the Moment Composer screen (SPEC-102) below the relevant records picker.
   - Each candidate is a card showing: title, move_family, beat count, `why_suggested` lines, "Use this template" / "Skip" actions, recent-use advisory badge.
   - "No template" is always an option — author may compose without selecting a template (the prompt composer's §6 Optional Beat Template Guidance section is then omitted from the prompt).
6. **Wire selected template into SPEC-102 composer**:
   - The Moment Composer passes the optional `selected_template: mtemplate-<integer>` ID through to `POST /api/.../prompts/preview` and `POST /api/.../prompts`. The prompt-routes layer (per §4 modify list) resolves the ID to `worlds/<world>/manual-stories/<msSlug>/records/beat-templates/<selected_template>.yaml` and passes the resolved path into the existing composer input field `included_template_path` (the landed SPEC-102 wire-up at `tools/manual-story-studio/src/server/routes/prompts.ts:45,94-95`); SPEC-104 introduces the ID-shaped public API while preserving the path-shaped internal composer input.
   - The composer's stage 5 (load optional selected beat template) reads the template file at `included_template_path` and includes its `beat_guidance` and `forbidden_inventions` in §6 of the composed prompt — extending the existing stage-5 loader at `tools/manual-story-studio/src/prompt/compose.ts:130-135,183` whose output already flows into the existing §6 emitter via the `included_template_body` field.
   - The composer's stage 12 (sidecar write) records the resolved `included_template_path` on the prompt sidecar — this is the field landed by SPEC-102 at `tools/manual-story-studio/src/write/prompts.ts:62-63`, not a new field.
   - The segment sidecar from SPEC-103 carries the parallel `selected_template` field (an mtemplate-N ID string, not a path); `tools/manual-story-studio/src/write/segments.ts:292` already maps the prompt sidecar's `included_template_path` to the segment's `selected_template` at save time. SPEC-104's contribution is making the path-and-ID flow non-null when a template is selected; the field shapes themselves are unchanged.
7. **Update prompt lint to handle beat-template content** (extends SPEC-102 lint):
   - Beat-template `beat_guidance.instruction` strings are subject to the same engine-jargon and Manual-Studio-internal-ID denylist as other prompt sections.
   - Lint rejects a template whose `beat_guidance` contains a forbidden term, with the violating string surfaced.
   - Author may override (SPEC-102 §3 key decision applies here too).

### Out of scope

- Auto-selection of templates — explicitly forbidden by design; the author always chooses.
- Engine-grade SLT fields: `scope`, `predicates` (closed-DSL), `effects` (state-delta mirroring SE), `saliency` (numeric ranking), `mystery_policy.allowed_authority`, `provenance.origin`, `created_at_page` — all out of scope; Manual Studio templates are author-curated cards, not engine moves.
- Template selection saliency scoring beyond the §2 stage-9 sort — no LLM-driven natural-language trigger matching (Drama Llama-style); deterministic only.
- Cross-manual-story template library — each manual story has its own templates. Shared template library is M6 deferral.
- Template versioning / supersession — edits overwrite in place per SPEC-101 hybrid policy.

## 3. Key decisions

- **Templates are records, not engine constructs.** They live under `records/beat-templates/` alongside the other 18 SPEC-101 MVP record classes (cast through artifacts), follow the same `active` / `tags` / common-field discipline, and use the same CRUD routes (extended to support the beat-template-specific fields). Treating them as records keeps the Manual Studio data model uniform.
- **The `_any` filtering semantics is OR within a stage, AND across stages.** A template requires one of the listed classes (OR), one of the listed tags (OR), and one of the listed locations (OR); a template that satisfies all three stages' OR conditions is a candidate. This is the lightest filter that still narrows usefully.
- **The 9-stage filter is the deterministic staging pattern from `select-storylet-candidates`, not the same machinery.** The discipline transfers; the scope shrinks. No predicate DSL, no scope/visibility branching, no saliency-as-stored-field, no cooldown mechanism. Recent-use advisory is computed at filter time from segment sidecars (which template each segment selected) — not stored on the template.
- **The author may compose without a template.** Selecting no template is the default. Templates are an accelerator, not a requirement. The prompt composer omits §6 when no template is selected.
- **`why_suggested` is computed deterministically per filter pass.** Same inputs → same trace lines. Lets the author build intuition about why certain templates rank high.
- **Move-family enum is closed but broad.** 17 values cover the move space the proposal §8 example contemplates (negotiation) plus the obvious sibling moves (confrontation, seduction, escape, reveal, concealment, bargaining, care, grief, celebration, confession, refusal, observation, travel, preparation, aftermath) plus an explicit `other`. Authors who need a 18th move add a ticket to extend the enum.
- **Tone-fit enum is closed.** 11 values cover the qualitative tonal space (intimate, tender, tense, comic, bleak, wry, reverent, clinical, feverish, hushed, ceremonial). Stage 6 uses it advisorily; story-contract `tone` (free-form string) does not directly map but contributes to stage 9 sort by string overlap heuristic — author tones that match a tone-fit token rank that token higher.
- **Relationship-axes enum is closed.** 6 values (`trust`, `fear`, `attraction`, `power`, `respect`, `familiarity`) — same set as SPEC-101 `mrel-*.axes` keys. Symmetric across the schemas.
- **Beat guidance count is 1-5.** Mirrors the SLT beat discipline at FOUNDATIONS §9. Lower than 1 has no value; higher than 5 starts authoring whole scenes inside the template, which is exactly the failure mode the proposal §8 explicitly avoids ("Keep 1-5 beat guidance items").

## 4. Files to touch

**Create (backend):**

- `tools/manual-story-studio/src/templates/filter.ts` — 9-stage pipeline.
- `tools/manual-story-studio/src/templates/why-suggested.ts` — `why_suggested` trace assembly.
- `tools/manual-story-studio/src/templates/recent-use.ts` — scan segment sidecars for `selected_template`, compute per-template last-used-segment (window size from `manual-story.yaml` `prompt_policy.recent_template_advisory_window`).
- `tools/manual-story-studio/src/schema/beat-template.ts` — TypeScript types + zod-style schema validation.
- `tools/manual-story-studio/src/validate/beat-template-schema.ts` — declarative schema validator (called by CRUD).
- `tools/manual-story-studio/src/server/routes/beat-templates.ts` — CRUD routes following SPEC-101 pattern + `POST /api/.../moment-composer/template-candidates` (computes filtered candidates given a moment composer input).

**Modify (backend):**

- `tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts` (from SPEC-102) — the file already accepts an `included_template_body` input and emits `(none selected)` when empty. SPEC-104's contribution is wiring stage 5's template load to populate `included_template_body` with the selected template's `beat_guidance` (rendered as an enumerated list keyed by `function`) and `forbidden_inventions` (rendered verbatim into the §12 assembly per existing `section-12-forbidden-inventions-and-reveals.ts` wiring). A net-new `section-6-beat-template-guidance.ts` file would collide with the existing emitter and is explicitly not introduced.
- `tools/manual-story-studio/src/prompt/compose.ts` — extend stage 5 (load optional template) to parse `beat_guidance` + `forbidden_inventions` from the loaded YAML and pass them through the existing `included_template_body` channel; no new pipeline stage is added; stage 9 already concatenates §6 via the existing emitter.
- `tools/manual-story-studio/src/prompt/lint.ts` — extend lint to scan template guidance strings against the existing `ENGINE_JARGON_DENYLIST`, `SCHEMA_VALIDATOR_DENYLIST`, `INTERNAL_ID_REGEX`, and `RECORD_CLASS_NARRATOR_PHRASES` surfaces at `lint.ts:23,70,88,90`; new rules ride on the existing tier system (hard vs soft) and override path.
- `tools/manual-story-studio/src/write/prompts.ts` — no field-shape change; the existing `included_template_path` sidecar field becomes non-null when a template is selected. Spec edit is documenting this composer-side flow; no schema mutation required here.
- `tools/manual-story-studio/src/write/segments.ts` — no field-shape change; existing `selected_template` segment-sidecar field at `segments.ts:35,47,98,157-159,259,266,292,306` is already populated from prompt sidecar's `included_template_path` via the landed mapping at `segments.ts:292`. Spec edit is documenting this flow; no schema mutation required here.
- `tools/manual-story-studio/src/server/routes/prompts.ts` — extend the existing POST `/preview` and `/` route handlers (currently accept `included_template_path` only at `routes/prompts.ts:45,94-95`) to also accept an optional `selected_template: mtemplate-<integer>` ID; resolve the ID to `worlds/<world>/manual-stories/<msSlug>/records/beat-templates/<selected_template>.yaml` and pass through the existing `included_template_path` channel. Preserves back-compat with callers that still pass `included_template_path` directly.
- `tools/manual-story-studio/src/server/routes/beat-templates.ts` — see Create (backend) above. (Listed here for completeness of the routes-side surface.)
- `tools/manual-story-studio/src/validate/schema.ts` (from SPEC-101) — register beat-template class declarative validator; iterates `MANUAL_RECORD_CLASSES` per existing schema.ts:4,846 pattern.
- `tools/manual-story-studio/src/schema/manual-story.ts` (from SPEC-101) — three-part extension: (a) add `"beat-templates"` to the `ManualRecordClass` union (line 160); (b) add `"beat-templates": "mtemplate"` to the `MANUAL_RECORD_CLASS_PREFIXES` map (line 180); (c) append `"beat-templates"` to the `MANUAL_RECORD_CLASSES` array (line 201). Required for `allocateNextIdForClass("beat-templates")` and CRUD-route schema lookup to function; the id-allocator's prefix lookup at `id-allocator.ts:60` throws on unregistered classes. Also: extend the `ManualStoryPromptPolicy` interface (line 67) with `recent_template_advisory_window: number` (default `2`); the `manual-story-metadata.ts` initializer should default the field alongside the existing `default_beat_count` / `include_recent_segments` defaults.
- `tools/manual-story-studio/src/write/manual-story-metadata.ts` — add the `recent_template_advisory_window: 2` default to the metadata initializer alongside the existing `prompt_policy.*` defaults (parallel to SPEC-103 §4's `allow_reorder` default addition).

**Create (frontend):**

- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` — CRUD UI.
- `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx` — candidate cards.
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` — create/edit form.
- `tools/manual-story-studio/web/src/api/beat-templates.ts` — typed client.

**Modify (frontend):**

- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (from SPEC-102) — replace the existing beat-template placeholder fieldset at `MomentComposer.tsx:234-237` (currently shows *"Reserved for SPEC-104. No template selector in this iteration."*) with the `BeatTemplateCandidates` component rendered below the records picker. Thread the selected `mtemplate-<integer>` ID through to the compose-preview call via the routes-layer's `selected_template` field (per the §4 modify `routes/prompts.ts` entry above).
- `tools/manual-story-studio/web/src/App.tsx` — add `/worlds/:worldSlug/manual-stories/:msSlug/beat-templates` route (matching the existing full-prefix shape established by SPEC-101/102/103 at `App.tsx:34-61`).
- `tools/manual-story-studio/web/src/types/manual-story.ts` (from SPEC-101/103) — hand-maintained mirror of the new backend `schema/beat-template.ts` types. Per SPEC-103 §4's established rule, every backend schema extension requires a parallel update here because the Vite (bundler) module resolution cannot import from the backend's Node16 module tree. Also mirror the new `prompt_policy.recent_template_advisory_window: number` field and any new typed fields on the beat-template CRUD response surface.

**Modify (docs):**

- `docs/ID-ALLOCATION.md` — flip the `mtemplate-<integer>` annotation at line 70 from *"schema deferred to SPEC-104"* to *"schema landed in SPEC-104"*.

**Tests** (organized per the SPEC-103 §4 per-subsystem convention — `test/server/`, `test/write/`, `test/manuscript/`, with root reserved for pure-function modules; a new `test/templates/` subdirectory groups the template-specific pure functions):

- `test/templates/beat-template-schema.test.ts` — closed enums validated; missing required fields rejected; beat_guidance count 1-5 enforced.
- `test/templates/filter.test.ts` — fixture manual story + fixture templates → expected candidate order across at least 5 distinct input combinations (covers each of the 9 stages exercising its block path).
- `test/templates/why-suggested.test.ts` — trace lines match expected for fixture inputs; 4-line cap enforced.
- `test/templates/recent-use.test.ts` — last-used-segment correctly derived from segment sidecars; respects `prompt_policy.recent_template_advisory_window`.
- `test/server/beat-templates-routes.test.ts` — CRUD round-trip + `POST /api/.../moment-composer/template-candidates` returns ordered candidate set; write-scope-guard adherence verified.
- `test/server/prompts-routes.test.ts` (extend existing SPEC-103-updated file) — verify the new `selected_template` route input resolves to `included_template_path` correctly; back-compat path (direct `included_template_path`) still works.
- `test/prompt/section-6-template-guidance.test.ts` — selected template renders `beat_guidance` + `forbidden_inventions` into §6 correctly; no template selected → §6 emits `(none selected)` per the existing emitter contract.

**No modification to:**

- World canon, story bundles, hooks, validators, MCP, patch engine.
- The SLT schema or `select-storylet-candidates` MCP tool.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Story Bundles §5a Commitment Blocks Are Causal Moves | aligns @ author-curated-cards | Manual Studio beat templates borrow the "causal move" framing without the engine schema. No `arc_contract`, no `dramatic_unit`, no `execution_envelope`, no `effect_model` mirroring SE state-delta — the proposal §8 explicitly declines these and this spec preserves the decline. Templates are reusable shapes the author invokes manually. |
| §Story Bundles §5c Present Causal State, Not Narrative Shape | aligns @ no-act-language-in-templates | Beat-guidance instructions follow the §5c "no act structure" prohibition: SPEC-102 lint denylist (the words "page", "scene", "act", "arc", "midpoint", "climax", "Act II", etc.) applies to template guidance strings just as it applies to prompt body sections. |
| §Story Bundles §5b Schema-Minimalism | aligns @ author-load-bearing-only | Every beat-template field is consumed by the filter pipeline, the prompt composer, the candidate UI, or the segment provenance. No nice-to-have fields. |
| §9 Prose Length Discipline | aligns @ no-quota-in-templates | Beat templates do not impose word counts; the SPEC-102 prompt §14 Stop Rule applies regardless of template selection. |
| §Tooling Recommendation (deterministic context-packet shape) | aligns @ deterministic-filter | Filter is deterministic and traceable — same inputs → same candidate order with same `why_suggested` lines. No LLM-driven trigger matching (rejecting Drama Llama-style natural-language storylet selection per proposal §19). |
| §Canonical Storage Layer engine-only-write discipline | aligns | Templates land under `records/beat-templates/` inside the SPEC-100 sandbox; `_source/` untouched. |

## 6. Build & test

`tools/manual-story-studio`: `npm test`. Filter determinism is the key test surface — fixture manual story + fixture template library + fixture composer inputs → expected candidate order, expected `why_suggested` traces, byte-identical across runs.

## 7. Acceptance criteria

1. Beat template schema validates closed enums; missing required fields rejected.
2. Beat-guidance count enforced to 1-5.
3. CRUD UI permits create / edit / archive / hard-delete (per SPEC-101 hybrid policy).
4. Filter pipeline runs deterministically; fixture inputs → expected candidate order across at least 5 distinct test scenarios.
5. `why_suggested` trace lines correctly identify the matched dimensions for each candidate.
6. Recent-use advisory correctly identifies templates used in the last N segments.
7. Candidate cards render in Moment Composer; selecting a template flows through to the prompt composer's §6 section.
8. Prompt composer's §6 Optional Beat Template Guidance is present when a template is selected and absent when not.
9. Lint scans template guidance strings for engine jargon; override path works as in SPEC-102.
10. Segment sidecar's `selected_template` is populated when a template was used.
11. Prompt History view (from SPEC-103) displays the template used per prompt.
12. `npm test` passes for `@worldloom/manual-story-studio`.

## 8. Risks & Open Questions

- **Closed enum drift.** `move_family`, `tone_fit`, and `relationship_axes` are closed. As authoring patterns surface novel moves or tonal registers, the enums may need extension. Drift is handled by amending this spec, not by introducing a runtime extension mechanism. The author who hits a missing enum value either uses `other` and a tag, or files a ticket to extend.
- **Filter stages may need reordering.** The 9-stage order matches the proposal §9 listing. If real-world authoring surfaces a better order, a follow-up ticket can reorder stages without amending this spec, as long as the determinism property is preserved.
- **Tone-fit and story-contract `tone` overlap heuristic is fuzzy.** Story-contract `tone` is free-form; tone-fit is enum. Stage 9 uses string-substring containment as the overlap heuristic (case-insensitive). If authors find this too loose or too strict, a follow-up ticket can swap in a closed mapping table.
- **The `excludes.forbidden_if_secret_tags` semantics needs author intuition.** A template that says "exclude if any active secret carries the tag `must-not-reveal-yet`" prevents the author from accidentally selecting a confrontation template when a held-back-reveal secret is in play. Useful but the author must reason about it. Surfaced in the `why_suggested` trace lines as an exclusion when the template would have matched otherwise.
- **Recent-use advisory is per-manual-story, not cross-manual-story.** A template used heavily in story A doesn't deprioritize itself in story B. Acceptable for MVP.
- **No template sharing across manual stories.** Each manual story carries its own `records/beat-templates/` library. If the author wants to reuse a template across stories, manual copy. Shared template library is M6 deferral.
- **Beat templates don't enforce the proposal's §8 forbidden-inventions through the SPEC-102 lint.** They contribute to §12 Forbidden Inventions assembly but the lint can't validate that the LLM honored the constraint. Honoring is the author's review responsibility, same as for all prompt-side discipline.
