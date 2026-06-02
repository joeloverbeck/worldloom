# SPEC-110 — Manual Story Studio: Beat Template Pressure/Turn Card Fields

**Status:** PROPOSED
**Date:** 2026-06-01
**Classification:** tooling-adjacent (schema extension on `BeatTemplate` records under `worlds/<slug>/manual-stories/<slug>/records/beat-templates/`; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md (typed-error reads).
**Blocks:** —
**Related:** `tools/manual-story-studio/src/schema/beat-template.ts`, `tools/manual-story-studio/src/templates/filter.ts`, `tools/manual-story-studio/src/templates/why-suggested.ts`, `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx`, `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx`.
**Source:** critical triage of `reports/manual-story-studio-second-iteration.md` §§11 / 12 / 27 / 31 Stage 7 (ChatGPT-Pro, 2026-06-01). Accepted with modification: the report's 7 new fields are adopted; `cooldown_segments` is dropped (the report itself classifies cooldown as "advisory only" — YAGNI under brainstorm Guardrails). Beat templates remain author-facing manual cards with no automatic state effects; the addition is semantic deepening, not storylet engine import.

---

## 1. Context & Motivation

The current `BeatTemplate` schema (verified at `tools/manual-story-studio/src/schema/beat-template.ts:137-148`) captures:

```ts
interface BeatTemplate {
  id: string;
  title: string;
  active: boolean;
  classification: { move_family, tags, intensity, tone_fit };
  role_slots: Record<string, { compatible_roles }>;
  requires: { record_classes_any, record_tags_any, relationship_axes_any, location_tags_any };
  excludes: { record_tags_any, forbidden_if_secret_tags };
  beat_guidance: Array<{ function, instruction }>;
  forbidden_inventions: string[];
  author_notes: string;
}
```

This is rich on the *classification* and *constraint* axes but thin on the *pressure semantics* axis. The report §11 critiques two specific gaps:

- **No explicit pressure-type or turn-type.** "Move family" names the shape of the action (negotiation, confrontation, ...); it does not name the *kind of pressure being applied* (threat, temptation, misunderstanding, debt, intimacy, exposure, reversal). A template categorized as `negotiation` can be applying any of those pressures — the author cannot filter "show me templates that apply *trust pressure* under *practical stakes*" because the schema does not carry trust-pressure-vs-other-pressure as a first-class axis.

- **No template-specific stop cue, no do-not-resolve constraints, no expected post-prose state-review hint.** Each template would benefit from naming (a) what the LLM should stop short of for this template specifically (`stop_after`), (b) what resolutions this template should NOT produce (`do_not_resolve`), and (c) which record classes are likely to need review after a segment shaped by this template (`expected_state_review`). These are author-facing semantic annotations that strengthen both the prompt curation and the post-prose checklist.

The report §27 proposes the additions; this spec implements the subset judged correct after critical triage:

- ACCEPT: `pressure_type`, `turn_type`, `preconditions_text`, `do_not_resolve`, `expected_state_review`, `stop_after`, `anti_patterns`.
- REJECT: `cooldown_segments` — the report itself flags this as "advisory only," and Manual Studio already has `recent_template_advisory_window` at the metadata level (`tools/manual-story-studio/src/schema/manual-story.ts:72`). A per-template cooldown duplicates a story-level concern without additional value. YAGNI.

The additions are author-facing deepening, not automatic effects. The deterministic filter (per `tools/manual-story-studio/src/templates/filter.ts`) surfaces some of the new fields in the per-candidate why-suggested trace; none of them drive automatic state changes — the cockpit's prose/state boundary (SPEC-107) is preserved.

## 2. Scope

### In scope

1. **New enum: `BeatTemplatePressureType`.** 11 closed-set values from the report §11:
   ```
   threat | temptation | misunderstanding | deadline | debt | intimacy |
   exposure | reversal | choice | loss | discovery
   ```

2. **New enum: `BeatTemplateTurnType`.** 11 closed-set values from the report §11:
   ```
   reveal | refusal | concession | escalation | reversal_turn |
   commitment | misread | sacrifice | boundary_crossing | discovery_turn | consequence_arrives
   ```
   (`reversal_turn` and `discovery_turn` are renamed from the report's `reversal` / `discovery` to disambiguate from the pressure-type enum values; `boundary_crossing` / `consequence_arrives` snake-case the report's hyphenated forms; clarity at the type level beats vocabulary purity. Note the report §27 worked example uses `pressure_type: trust_test` / `turn_type: reluctant_concession`, which are inconsistent with the report's own §11 closed sets — this spec follows §11.)

3. **Schema extension on `BeatTemplate`.** Add 7 new fields:
   ```ts
   interface BeatTemplate {
     // ...existing fields...
     pressure_type: BeatTemplatePressureType;
     turn_type: BeatTemplateTurnType;
     preconditions_text: string;        // plain English, author-facing
     do_not_resolve: string[];          // freeform constraints, one per line
     expected_state_review: ManualRecordClass[];  // record classes to suggest in the post-prose checklist
     stop_after: string;                // template-specific stop cue prose
     anti_patterns: string[];           // what the template should not become
   }
   ```
   All seven fields are required at the schema level (not optional) — every template authored from now on names them. Existing inline test fixtures are updated with values per §2 item 5.

4. **Validation.** Update `src/validate/beat-template-schema.ts` to enforce the new fields:
   - `pressure_type` and `turn_type` must match their respective closed enums.
   - `expected_state_review` entries must be valid `ManualRecordClass` values (reuses the existing `MANUAL_RECORD_CLASSES` const), **excluding `beat-templates`** — a post-prose state-review checklist only references state-bearing record classes, never the template library itself. (The validator emits a distinct finding for a `beat-templates` entry, separate from the unknown-record-class finding.)
   - `preconditions_text` and `stop_after` may be empty strings (no minimum length) but the fields must be present.
   - `do_not_resolve` and `anti_patterns` may be empty arrays but the fields must be present.

5. **Update inline test fixtures (no migration script).** Reassessment verified there are **no on-disk beat-template YAML files anywhere** in the repo (`find . -name 'mtemplate-*.yaml' -not -path './node_modules/*'` → empty, including production worlds); the only beat-template fixtures are **inline TypeScript literals** in `tools/manual-story-studio/test/templates/*.test.ts` (e.g. `validTemplate()` in `beat-template-schema.test.ts`, and the template builders used by `filter.test.ts` / `recent-use.test.ts` / `why-suggested.test.ts`). Because the 7 new fields are *required*, adding them to `BeatTemplate` is a **TypeScript compile-break** of every inline fixture — the real "migration" is updating those TS literals, not running a YAML migration script. Update each inline fixture to populate the 7 new fields, using a pragmatic `move_family → pressure_type / turn_type` default for realism (e.g. `negotiation → debt`, `seduction → intimacy`, `escape → threat`, `confrontation → escalation`, `reveal → reveal`). The defaults make the fixtures schema-valid; an author refines authored templates via the CRUD form (item 7) going forward.

6. **Filter why-suggested rendering.** Extend `src/templates/why-suggested.ts` to surface the matched `pressure_type` in the per-candidate trace. The trace is assembled by `assembleWhySuggested` over the `WhySuggestedMatches` shape (fed by `buildMatchState` in `filter.ts`) and emits **at most 4 compact token lines** (e.g. `pressure: intimacy`, `tone: tense`) — not full English sentences. So:
   - extend `WhySuggestedMatches` with a `pressureTypeMatch` field, populate it in `buildMatchState` when the author's `desired_pressure_type` pin (per §2 item 9) equals the template's `pressure_type`, and emit a terse `pressure: <type>` line in `assembleWhySuggested` when the match fires.
   - the candidate card surfaces `anti_patterns` (and the other new author-facing fields) in its expanded view per §2 item 8 — not the why-suggested trace.
   (There is no "why not suggested" output in the current filter — it returns only surviving candidates with `why_suggested`. A rejected-candidate explanation surface is out of scope; see §Out of scope.)

7. **Frontend form changes.** `web/src/components/BeatTemplateForm.tsx` gains form fields for the 7 new fields:
   - `pressure_type` and `turn_type`: `<select>` populated from the enum exports.
   - `preconditions_text` and `stop_after`: `<textarea>`.
   - `do_not_resolve` and `anti_patterns`: line-per-entry textarea with split-on-newline parsing on save (matching the existing `forbidden_inventions` control).
   - `expected_state_review`: multi-select chips from `MANUAL_RECORD_CLASSES` (excluding `beat-templates` per item 4).

8. **Frontend candidate card changes.** `web/src/components/BeatTemplateCandidates.tsx` exposes the new fields in the candidate card:
   - `pressure_type` and `turn_type` shown as small chips at the card head.
   - `preconditions_text` shown as a one-line summary; full prose in an expand-on-hover tooltip.
   - `do_not_resolve` and `anti_patterns` shown as bulleted lists in the expanded view.
   - `expected_state_review` shown as a "After prose, review: [chips]" line.

9. **Filter input extension (author directive pin).** Add an optional author directive pin `desired_pressure_type` (and optionally `target_relationship_axis`) to the filter's `FilterOptionalPins` (`filter.ts:44-48`, alongside the existing `moveFamily` / `tags` / `location` pins) and thread it through the candidate request body. When the author supplies `desired_pressure_type`, the deterministic stage-9 sort gains **one additional tie-breaker**: a template whose `pressure_type` equals the pin ranks above an otherwise-equal template whose does not. The score remains a stable deterministic ordering (string-equality on an enum-valued field; no randomness). This follows the report §12 directive-metadata model (`desired_pressure_type` / `target_relationship_axis` as author-supplied filter inputs); it is **not** derived from SPEC-109's current-context layer, whose `CurrentContext` carries no relationship-axis or pressure-type field.

10. **Acceptance tests** under `tools/manual-story-studio/test/templates/`:
    - `validateBeatTemplate` rejects unknown `pressure_type` enum value with a structured finding.
    - `validateBeatTemplate` rejects unknown `turn_type` enum value, and rejects an `expected_state_review` entry that is an unknown record class or the disallowed `beat-templates` class, each with a distinct finding code.
    - `filter` with the `desired_pressure_type` pin set and a matching `pressure_type` ranks the template above an otherwise-equal template with a non-matching `pressure_type`.
    - `assembleWhySuggested` output for a candidate includes a terse `pressure: <type>` line when the pin match fires.
    - Existing template tests under `test/templates/` continue to pass after the schema extension (the updated inline fixtures populate the new required fields with valid defaults).

### Out of scope

- Storylet predicate DSL — explicitly forbidden by the report §11 ("This is not a branching SLT, and it should not become one") and by the package's no-engine identity. The new fields are author-facing card semantics, not executable rules.
- Cooldown / recent-use scoring on a per-template basis — rejected; the story-level `recent_template_advisory_window` is sufficient.
- Automatic state effects after a template is used — explicitly preserved as out of scope (the report §11: "no automatic state effects: only `expected_state_review` suggestions after prose"). `expected_state_review` is a *suggestion* surfaced in the state-update checklist, never an automatic edit.
- Move-family enum changes — the existing 17-member enum stays.
- Tone-fit enum changes — the existing 11-member enum stays.
- Beat-template-location refactor (move `records/beat-templates/` → `templates/`) — explicitly rejected per the triage.
- Health endpoint integration of template-schema findings — covered by SPEC-105's Pass 2 schema integrity.
- **`scene_function` (report §11)** — rejected. The author-facing "function" axis is already carried by `classification.move_family` plus the `beat_guidance[].function` enum (`setup | pressure | turn | exit | aftermath`); a separate `scene_function` enum is taxonomy bloat without a distinct consumer. YAGNI.
- **`requires_context` (report §11)** — already covered by the existing `requires` block (`record_classes_any` / `record_tags_any` / `relationship_axes_any` / `location_tags_any`); no new field is added.
- **`example_use` (report §11)** — deferred. The existing `author_notes` free-text field can hold an example; a dedicated field is not load-bearing for filter or why-suggested rendering.
- **`pin` (report §11)** — already covered by the filter's `optionalAuthorPins` (pinned `move_family` / `tags` / `location`) plus the new `desired_pressure_type` pin from §2 item 9; no per-template pin field is added.
- **"Why not suggested" surface (report §12)** — deferred. The filter returns only surviving candidates with `why_suggested`; a rejected-candidate explanation surface is a separate UI deliverable, not part of this spec.

## 3. Key decisions

- **Closed enums for `pressure_type` and `turn_type`.** Open strings would let authors invent fresh values per template; closed enums force a vocabulary and make filter scoring tractable. 11+11 is enough breadth without becoming a taxonomy maintenance project.

- **Rename `reversal_turn` and `discovery_turn` for type-system clarity.** The report's enums use `reversal` and `discovery` as both pressure types and turn types. TypeScript would conflate them at usage sites; renaming the turn-type variants resolves the ambiguity. The author-facing UI may render them as "Reversal" / "Discovery" without the `_turn` suffix.

- **All 7 fields required at the schema level.** Making fields optional would mean every consumer (filter, why-suggested trace, form, candidate card) handles the missing case, which is the source of the silent-skip family of bugs SPEC-105 also fixes. Updated inline fixtures cover existing test data; new templates fill the fields meaningfully via the CRUD form.

- **No `cooldown_segments`.** The report itself classifies cooldown as "advisory only," and the story metadata's `recent_template_advisory_window: 2` already provides an advisory window. Per-template cooldown adds a per-template variant of an already-advisory story-level setting — pure complexity without expressive benefit.

- **`expected_state_review` uses existing record-class identifiers, minus `beat-templates`.** No new vocabulary; the field references the existing `MANUAL_RECORD_CLASSES` const so the state-update checklist already knows how to render the suggested classes. The `beat-templates` class is excluded — a post-prose review checklist names state-bearing classes (relationships, obligations, emotions, secrets, ...), never the template library.

- **Filter scoring adds one ordering criterion, not a re-ranking.** The current 9-stage deterministic filter (per the report §12) stays the same up to and including the existing tags/role/tone/recent/title ordering; the new `pressure_type` match (against the author's `desired_pressure_type` directive pin) becomes an additional tie-breaker, not a replacement. This preserves the determinism the report praises.

- **Pressure-type match is author-supplied, not context-derived.** The match input is an explicit author directive pin (`desired_pressure_type`), per the report §12 directive-metadata model. SPEC-109's current-context layer is deliberately not the source: `CurrentContext` carries no relationship-axis or pressure-type field, and the filter does not consume `CurrentContext` today. Wiring the pin through `FilterOptionalPins` + the candidate request body keeps the change local to the filter surface and avoids a speculative context→filter dependency.

- **Fixture defaults are pragmatic, not authoritative.** The `move_family → pressure_type / turn_type` mapping used to fill the updated inline fixtures is a default — some move families fit multiple pressures (`bargaining → debt` or `temptation`). Pick one per move family for the fixture; an author refines authored templates when next reviewed. Refinement is not part of this spec's deliverable.

## 4. Files to touch

**Modify:**

- `tools/manual-story-studio/src/schema/beat-template.ts`:
  - Add `BeatTemplatePressureType` type + const.
  - Add `BeatTemplateTurnType` type + const.
  - Extend `BeatTemplate` interface with the 7 new fields.
- `tools/manual-story-studio/src/validate/beat-template-schema.ts`:
  - Enforce the new field shapes per §2 item 4 (including the `beat-templates`-excluded `expected_state_review` check).
  - Emit structured findings on enum mismatch.
- `tools/manual-story-studio/src/templates/filter.ts`:
  - Add `desired_pressure_type` (and optional `target_relationship_axis`) to `FilterOptionalPins`.
  - Add the pressure-type tie-breaker to stage 9 per §2 item 9.
  - Extend `buildMatchState` to record the pressure-type match for the why-suggested trace.
- `tools/manual-story-studio/src/templates/why-suggested.ts` — extend `WhySuggestedMatches` + `assembleWhySuggested` to surface the matched `pressure_type` as a terse trace line per §2 item 6.
- The candidate route handler + `CandidateRequestBody` type (`web/src/types/manual-story.ts` and the backend candidate route) — thread the new `optional_desired_pressure_type` directive pin from the Moment Composer through to `FilterOptionalPins`. (Plumbing for §2 item 9; pre-declared by the Q1(a) directive-pin decision.)
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` — add form fields per §2 item 7.
- `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx` — surface the new fields in the candidate card per §2 item 8, and expose the `desired_pressure_type` directive input from the Moment Composer.
- Inline TS beat-template fixtures in `tools/manual-story-studio/test/templates/*.test.ts` (e.g. `validTemplate()` in `beat-template-schema.test.ts`, and the template builders in `filter.test.ts` / `recent-use.test.ts` / `why-suggested.test.ts`) — updated to populate the 7 new required fields per §2 item 5.
- `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` — extend with new-field validation tests.

**Create:**

- `tools/manual-story-studio/test/templates/beat-template-spec110-fields.test.ts` — focused tests for the new field validation, the `desired_pressure_type` filter tie-breaker, and the why-suggested pressure-type line.

**No modification to:**

- `tools/manual-story-studio/src/templates/filter.ts`'s 9-stage filter structure — only one tie-breaker added.
- The move-family / tone-fit / relationship-axis enums.
- Beat-template storage location (still `records/beat-templates/`).
- `tools/manual-story-studio/web/src/components/recordSchemas.ts` — `BeatTemplateForm.tsx` is a custom, hand-written form, not the generic `RecordForm`/`recordSchemas` scaffold; the new fields are added directly to the custom form, so no schema-metadata change is needed here.
- `tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts` — `emitSection6` only passes through the pre-rendered `included_template_body`; it does not assemble the body from individual template fields. If `do_not_resolve` / `stop_after` are to reach the external LLM, the wiring site is `src/prompt/compose.ts` (where `included_template_body` is assembled, `compose.ts:262`), not section-6. Whether to surface the new fields in the prompt body is deferred — review during implementation; it is not a required deliverable of this spec.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Soft Canon / Local Truth (must be explicit) | aligns @ template schema | The new fields make pressure-type and turn-type *explicit* at authoring time, not derived from move-family heuristics; each template card declares its semantic role first-class. |
| §Tooling Recommendation (least-privilege LLM packets) | aligns @ author-facing schema | The new `do_not_resolve` / `stop_after` fields give the author an explicit do-not-do list on the card. Whether they ride into the prompt's optional beat-template guidance section is deferred to a `compose.ts` wiring decision (per §4); the schema-level explicitness holds regardless. |
| §Story Bundles §4a Plan-Authority Boundary (authoring authority explicit) | aligns by analogy @ template schema | Branching pipelines name their pressure/turn semantics via STPLAN / STEMO; Manual Studio's analog is the template's `pressure_type` / `turn_type` / `expected_state_review` — explicit authoring, no inference. |
| Rule 2 No Pure Cosmetics | aligns @ template schema | Each new field has a concrete consumer: `pressure_type` feeds the filter tie-breaker (against the author `desired_pressure_type` pin) and the why-suggested trace; `expected_state_review` feeds the post-prose checklist; `do_not_resolve` / `stop_after` / `anti_patterns` feed the candidate card and (deferred) prompt guidance. No field is added for documentation alone. |
| §Story Bundles §Storylet Pool | N/A @ no-engine-import | Manual Studio's templates are not SLTs; the report explicitly excludes the SLT predicate DSL. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | No canon facts engaged. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` runs the new tests alongside the existing template suite. The updated inline fixtures (item 5) make the existing template suite typecheck and pass under the extended schema; the new `beat-template-spec110-fields.test.ts` covers the field validation, the `desired_pressure_type` tie-breaker, and the why-suggested pressure-type line.

Manual verification: open Beat Templates page; create a new template; verify the form has fields for the 7 new fields; save; verify validation rejects an invalid `pressure_type`. Open Moment Composer; set the `desired_pressure_type` directive to `intimacy`; verify candidate templates whose `pressure_type` is `intimacy` rank higher than otherwise-equal templates; verify the why-suggested trace shows the `pressure: intimacy` line.

## 7. Acceptance criteria

1. `BeatTemplatePressureType` enum has exactly 11 values matching the spec list. (verified by test)
2. `BeatTemplateTurnType` enum has exactly 11 values; renamed `reversal_turn` and `discovery_turn` documented in the type comment. (verified by test)
3. `BeatTemplate` interface includes all 7 new fields, all required. (verified by typecheck)
4. `validateBeatTemplate` rejects: invalid `pressure_type`, invalid `turn_type`, an `expected_state_review` entry that is an unknown record class, and an `expected_state_review` entry of `beat-templates` — each with a distinct finding code. (acceptance tests)
5. Existing inline TS test fixtures populate the 7 new required fields; the template suite typechecks and passes after the schema extension. No migration script is created. (acceptance test)
6. With the author `desired_pressure_type` pin set to `intimacy`, the filter ranks templates with `pressure_type === intimacy` above otherwise-equal templates whose `pressure_type` does not match the pin. (acceptance test — covers the tie-breaker)
7. The why-suggested trace for a candidate template includes a terse `pressure: <type>` line referencing the matched `pressure_type` when the `desired_pressure_type` pin match fires. (acceptance test)
8. The `BeatTemplateForm` UI exposes form controls for all 7 new fields; saving a template with all fields populated round-trips through the backend without data loss. (manual verification)
9. The `BeatTemplateCandidates` card surfaces `pressure_type` and `turn_type` chips and shows `do_not_resolve` / `anti_patterns` / `expected_state_review` in an expanded view. (manual verification)
10. The `web/` `tsc --noEmit` step remains green; existing template tests pass.

## 8. Assumption reassessment

- **Verified at reassessment — no on-disk beat-template YAML exists.** `find . -name 'mtemplate-*.yaml' -not -path './node_modules/*'` returns empty repo-wide, including production worlds (`worlds/<slug>/manual-stories/<slug>/records/beat-templates/`). There is no migration surface; the only fixtures are inline TS literals in `test/templates/*.test.ts`. If an author creates on-disk templates before this lands, the now-required fields will make `validateBeatTemplate` reject them until refilled — acceptable, because the CRUD form (item 7) authors the fields going forward.
- **Verified — the form scaffold concern is moot.** `BeatTemplateForm.tsx` is a custom, hand-written form, not the generic `RecordForm`/`recordSchemas` scaffold; adding required fields is a form-fields-only change with no scaffold impact.
- **Fixture default mapping is one-per-family, not authoritative.** The `move_family → pressure_type / turn_type` default used to fill the updated inline fixtures is a *default* — some move families fit multiple pressures (`bargaining → debt` or `temptation`). The fixture picks one per move family; the author refines per template later.
- **Filter determinism is preserved.** The new tie-breaker is deterministic (string-equality match of a template's `pressure_type` against the author's `desired_pressure_type` pin), not stochastic. Templates ordered identically under the existing 9-stage filter remain ordered identically; only ties where one template's `pressure_type` matches the pin are broken by the new criterion.
- **Pressure-type match input is author-supplied.** Items 6/9 do not depend on SPEC-109's current-context: `CurrentContext` (`src/schema/current-context.ts`) has no relationship-axis or pressure-type field, and `filter.ts` does not consume `CurrentContext`. The match input is the author's `desired_pressure_type` directive pin, threaded through `FilterOptionalPins` + the candidate request body.
