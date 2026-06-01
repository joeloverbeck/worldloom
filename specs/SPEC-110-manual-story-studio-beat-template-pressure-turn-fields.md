# SPEC-110 — Manual Story Studio: Beat Template Pressure/Turn Card Fields

**Status:** PROPOSED
**Date:** 2026-06-01
**Classification:** tooling-adjacent (schema extension on `BeatTemplate` records under `worlds/<slug>/manual-stories/<slug>/records/beat-templates/`; no canon-pipeline integration).
**Depends on:** SPEC-105 (typed-error reads).
**Blocks:** —
**Related:** `tools/manual-story-studio/src/schema/beat-template.ts`, `tools/manual-story-studio/src/templates/filter.ts`, `tools/manual-story-studio/src/templates/explain.ts`, `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx`, `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx`.
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

The additions are author-facing deepening, not automatic effects. The deterministic filter (per `tools/manual-story-studio/src/templates/filter.ts`) consumes some of the new fields for the "why fits" explanation; none of them drive automatic state changes — the cockpit's prose/state boundary (SPEC-107) is preserved.

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
   (`reversal_turn` and `discovery_turn` are renamed from the report's `reversal` / `discovery` to disambiguate from the pressure-type enum values; clarity at the type level beats vocabulary purity.)

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
   All seven fields are required at the schema level (not optional) — every template authored from now on names them. Existing on-disk fixtures are migrated with default values per §2 item 5.

4. **Validation.** Update `src/validate/beat-template-schema.ts` to enforce the new fields:
   - `pressure_type` and `turn_type` must match their respective closed enums.
   - `expected_state_review` entries must be valid `ManualRecordClass` values (reuses the existing `MANUAL_RECORD_CLASSES` const).
   - `preconditions_text` and `stop_after` may be empty strings (no minimum length) but the fields must be present.
   - `do_not_resolve` and `anti_patterns` may be empty arrays but the fields must be present.

5. **Migration of existing fixtures.** Scan `tools/manual-story-studio/test/templates/fixtures/` (and any other fixture directory containing beat templates) for existing `mtemplate-N.yaml` files; for each, add the 7 new fields with sensible defaults:
   - `pressure_type`: derived from `classification.move_family` per a small static mapping (e.g., `negotiation → debt`, `seduction → intimacy`, `escape → threat`, ... — full mapping in the spec implementation).
   - `turn_type`: derived from `classification.move_family` similarly (e.g., `confrontation → escalation`, `reveal → reveal`).
   - `preconditions_text`: empty string.
   - `do_not_resolve`: empty array.
   - `expected_state_review`: empty array.
   - `stop_after`: empty string.
   - `anti_patterns`: empty array.

   The migration is a one-shot script committed as part of this spec's diff, not a runtime concern. Authored content can be filled in later by the author per template.

6. **Filter explain rendering.** Extend `src/templates/explain.ts` to render the new fields in the "why suggested" / "why not suggested" output:
   - "Fits trust pressure between cast A and B (template pressure_type: `intimacy`, story's active relationship axis: `trust`)" — when current-context (SPEC-109) is present, the filter explains the match in pressure-type terms.
   - "Forbidden because the active secret tag `<tag>` is in this template's `excludes.forbidden_if_secret_tags`" — existing behavior.
   - "Anti-pattern note: this template should not become full reconciliation" — surface the template's `anti_patterns` entries in the candidate card's expanded view.

7. **Frontend form changes.** `web/src/components/BeatTemplateForm.tsx` gains form fields for the 7 new fields:
   - `pressure_type` and `turn_type`: `<select>` populated from the enum exports.
   - `preconditions_text` and `stop_after`: `<textarea>`.
   - `do_not_resolve` and `anti_patterns`: line-per-entry textarea with split-on-newline parsing on save.
   - `expected_state_review`: multi-select chips from `MANUAL_RECORD_CLASSES`.

8. **Frontend candidate card changes.** `web/src/components/BeatTemplateCandidates.tsx` exposes the new fields in the candidate card:
   - `pressure_type` and `turn_type` shown as small chips at the card head.
   - `preconditions_text` shown as a one-line summary; full prose in an expand-on-hover tooltip.
   - `do_not_resolve` and `anti_patterns` shown as bulleted lists in the expanded view.
   - `expected_state_review` shown as a "After prose, review: [chips]" line.

9. **Filter input extension (current-context-aware).** When SPEC-109's current-context is present, the deterministic filter scores templates higher when `pressure_type` matches the active relationship-axis context. The score remains a stable deterministic ordering (no randomness); the new field adds one ordering criterion.

10. **Acceptance tests** under `tools/manual-story-studio/test/templates/`:
    - `validateBeatTemplate` rejects unknown `pressure_type` enum value with structured finding.
    - `validateBeatTemplate` rejects unknown `expected_state_review` record class.
    - `filter` with current-context-present and matching `pressure_type` ranks the template above an otherwise-equal template with non-matching `pressure_type`.
    - `explain` output for a candidate includes a pressure-type-rooted "why" sentence.
    - The migration script's mapping produces valid templates for every fixture (no validation failure on the migrated set).
    - Existing template tests under `test/templates/` continue to pass after the schema extension (the migration adds the new fields with valid defaults).

### Out of scope

- Storylet predicate DSL — explicitly forbidden by the report §11 ("This is not a branching SLT, and it should not become one") and by the package's no-engine identity. The new fields are author-facing card semantics, not executable rules.
- Cooldown / recent-use scoring on a per-template basis — rejected; the story-level `recent_template_advisory_window` is sufficient.
- Automatic state effects after a template is used — explicitly preserved as out of scope (the report §11: "no automatic state effects: only `expected_state_review` suggestions after prose"). `expected_state_review` is a *suggestion* surfaced in the state-update checklist, never an automatic edit.
- Move-family enum changes — the existing 17-member enum stays.
- Tone-fit enum changes — the existing 11-member enum stays.
- Beat-template-location refactor (move `records/beat-templates/` → `templates/`) — explicitly rejected per the triage.
- Health endpoint integration of template-schema findings — covered by SPEC-105's Pass 2 schema integrity.

## 3. Key decisions

- **Closed enums for `pressure_type` and `turn_type`.** Open strings would let authors invent fresh values per template; closed enums force a vocabulary and make filter scoring tractable. 11+11 is enough breadth without becoming a taxonomy maintenance project.

- **Rename `reversal_turn` and `discovery_turn` for type-system clarity.** The report's enums use `reversal` and `discovery` as both pressure types and turn types. TypeScript would conflate them at usage sites; renaming the turn-type variants resolves the ambiguity. The author-facing UI may render them as "Reversal" / "Discovery" without the `_turn` suffix.

- **All 7 fields required at the schema level.** Making fields optional would mean every consumer (filter, explain, form, candidate card) handles the missing case, which is the source of the silent-skip family of bugs SPEC-105 also fixes. Defaults during migration cover existing data; new templates fill the fields meaningfully.

- **No `cooldown_segments`.** The report itself classifies cooldown as "advisory only," and the story metadata's `recent_template_advisory_window: 2` already provides an advisory window. Per-template cooldown adds a per-template variant of an already-advisory story-level setting — pure complexity without expressive benefit.

- **`expected_state_review` uses existing record-class identifiers.** No new vocabulary; the field references the existing `MANUAL_RECORD_CLASSES` const, so the state-update checklist already knows how to render the suggested classes.

- **Filter scoring adds one ordering criterion, not a re-ranking.** The current 9-stage deterministic filter (per the report §12) stays the same up to and including the existing tags/role/tone/recent/title ordering; the new `pressure_type` match becomes an additional tie-breaker, not a replacement. This preserves the determinism the report praises.

- **Migration defaults are pragmatic, not authoritative.** The move-family-to-pressure-type mapping is a one-shot author-friendly default; the author is expected to refine each migrated template's fields when next reviewed. Refinement is not part of this spec's deliverable.

## 4. Files to touch

**Modify:**

- `tools/manual-story-studio/src/schema/beat-template.ts`:
  - Add `BeatTemplatePressureType` type + const.
  - Add `BeatTemplateTurnType` type + const.
  - Extend `BeatTemplate` interface with the 7 new fields.
- `tools/manual-story-studio/src/validate/beat-template-schema.ts`:
  - Enforce the new field shapes per §2 item 4.
  - Emit structured findings on enum mismatch.
- `tools/manual-story-studio/src/templates/filter.ts` — add pressure-type-match scoring per §2 item 9 (only fires when SPEC-109 current-context is present).
- `tools/manual-story-studio/src/templates/explain.ts` — render the new fields in the "why" output per §2 item 6.
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` — add form fields per §2 item 7.
- `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx` — surface the new fields in the candidate card per §2 item 8.
- `tools/manual-story-studio/web/src/components/recordSchemas.ts` — schema-aware rendering metadata for the new fields (if used by the existing form scaffold).
- All existing `mtemplate-*.yaml` fixtures under `tools/manual-story-studio/test/templates/fixtures/` — migrated by the one-shot script per §2 item 5.
- `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` (or equivalent) — extend with new-field tests.

**Create:**

- `tools/manual-story-studio/scripts/migrate-beat-templates-spec110.ts` — one-shot migration with the move-family→pressure-type/turn-type mapping. Reads each fixture, writes back with the new fields populated, validates the result. Documented as one-shot in its top comment; not invoked at runtime.
- `tools/manual-story-studio/test/templates/beat-template-spec110-fields.test.ts` — focused tests for the new field validation, filter scoring, and explain output.
- `tools/manual-story-studio/test/templates/migration-defaults.test.ts` — assert the migration script's mapping produces validation-passing templates for the representative fixtures.

**No modification to:**

- `tools/manual-story-studio/src/templates/filter.ts`'s 9-stage filter structure — only one tie-breaker added.
- The move-family / tone-fit / relationship-axis enums.
- Beat-template storage location (still `records/beat-templates/`).
- `tools/manual-story-studio/src/prompt/sections/section-6-optional-beat-template-guidance.ts` unless it needs to emit the new `do_not_resolve` / `stop_after` strings as part of §6 (review during implementation; if §6 already includes the existing `forbidden_inventions`, extending to the new author-facing surfaces is a small addition).

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Soft Canon / Local Truth (must be explicit) | aligns @ template schema | The new fields make pressure-type and turn-type *explicit* at authoring time, not derived from move-family heuristics; each template card declares its semantic role first-class. |
| §Tooling Recommendation (least-privilege LLM packets) | aligns @ prompt § sections | The new `do_not_resolve` and `stop_after` fields ride into the optional beat-template guidance section; the external LLM sees the explicit do-not-do list rather than guessing from `forbidden_inventions` alone. |
| §Story Bundles §4a Plan-Authority Boundary (authoring authority explicit) | aligns by analogy @ template schema | Branching pipelines name their pressure/turn semantics via STPLAN / STEMO; Manual Studio's analog is the template's `pressure_type` / `turn_type` / `expected_state_review` — explicit authoring, no inference. |
| Rule 2 No Pure Cosmetics | aligns @ template schema | Each new field has a concrete consumer (filter scoring, explain rendering, state-update checklist, prompt guidance section). No field is added for documentation alone. |
| §Story Bundles §Storylet Pool | N/A @ no-engine-import | Manual Studio's templates are not SLTs; the report explicitly excludes the SLT predicate DSL. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | No canon facts engaged. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` runs the new tests alongside the existing template suite. The migration script is committed but invoked only once (during this spec's implementation); a regression test confirms its mapping produces valid templates against the representative fixtures.

Manual verification: open Beat Templates page; create a new template; verify the form has fields for the 7 new fields; save; verify validation rejects an invalid `pressure_type`. Open Moment Composer with a current-context naming a relationship axis `trust`; verify candidate templates whose `pressure_type` is `intimacy` or `debt` rank higher; verify the "why" sentence references the pressure-type match.

## 7. Acceptance criteria

1. `BeatTemplatePressureType` enum has exactly 11 values matching the spec list. (verified by test)
2. `BeatTemplateTurnType` enum has exactly 11 values; renamed `reversal_turn` and `discovery_turn` documented in the type comment. (verified by test)
3. `BeatTemplate` interface includes all 7 new fields, all required. (verified by typecheck)
4. `validateBeatTemplate` rejects: invalid `pressure_type`, invalid `turn_type`, invalid `expected_state_review` record class entry — each with a distinct finding code. (acceptance tests)
5. The migration script transforms every existing fixture template to a schema-valid form. (acceptance test)
6. With SPEC-109 current-context present and active relationship axis `trust`, the filter ranks templates with `pressure_type ∈ {intimacy, debt, trust_test-like}` above otherwise-equal templates. (acceptance test — covers the tie-breaker)
7. `explain` output for a candidate template includes a one-line "why" sentence referencing the matched `pressure_type` when the match fires. (acceptance test)
8. The `BeatTemplateForm` UI exposes form controls for all 7 new fields; saving a template with all fields populated round-trips through the backend without data loss. (manual verification)
9. The `BeatTemplateCandidates` card surfaces `pressure_type` and `turn_type` chips and shows `do_not_resolve` / `anti_patterns` / `expected_state_review` in an expanded view. (manual verification)
10. The `web/` `tsc --noEmit` step remains green; existing template tests pass.

## 8. Assumption reassessment

- **Assumption:** No `mtemplate-N.yaml` fixtures exist *outside* `tools/manual-story-studio/test/templates/fixtures/`. → Verify via `find . -name 'mtemplate-*.yaml' -not -path './node_modules/*'` from repo root before running the migration. If any are found in production worlds (e.g., a real `worlds/<slug>/manual-stories/<slug>/records/beat-templates/`), the migration must include those paths.
- **Assumption:** Adding required fields to `BeatTemplate` does not break the `RecordForm.tsx` generic record-rendering scaffold. → Verify the form scaffold consults a per-class schema map; if the beat-template form is custom (BeatTemplateForm.tsx), the form-scaffold concern is moot. Either way, the addition is form-fields-only.
- **Assumption:** The migration mapping from `move_family` to `pressure_type`/`turn_type` is one-to-one. → The mapping is a *default* — some move families fit multiple pressures (`bargaining` → `debt` or `temptation`). The migration picks one per move family; the author refines later. Documented in the migration script's top comment.
- **Assumption:** Filter determinism is preserved. → Verified: the new tie-breaker is deterministic (string-equality match on a pre-existing enum-valued field), not stochastic. Templates ordered identically under the existing filter remain ordered identically under the extended filter; only ties are broken by the new criterion.
