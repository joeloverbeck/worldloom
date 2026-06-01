# SPEC-106 — Manual Story Studio: Prompt Leakage Hard-Tier Promotion

**Status:** PROPOSED
**Date:** 2026-06-01
**Classification:** tooling-adjacent (no canon-pipeline integration; affects only the external-LLM prompt boundary).
**Depends on:** — (independent; can land in parallel with SPEC-107).
**Blocks:** — (no downstream spec depends on the lint tier change).
**Related:** `tools/manual-story-studio/src/prompt/lint.ts`, `tools/manual-story-studio/src/prompt/types.ts`, `tools/manual-story-studio/web/src/pages/PromptPreview.tsx`.
**Source:** critical triage of `reports/manual-story-studio-second-iteration.md` §§5 / 13 / 22 / 26 / 31 Stage 2 (ChatGPT-Pro, 2026-06-01). Accepted: the four leakage rules (`no_internal_record_ids` / `no_engine_jargon` / `no_schema_validator_terms` / `no_record_class_narrator_voice`) move from `soft` to `hard`; the `lint_override` "copy anyway" path is removed for them.

---

## 1. Context & Motivation

The current prompt lint splits eight rules across two tiers (verified at `tools/manual-story-studio/src/prompt/lint.ts:3-15`):

- **Hard tier** (4 rules, block clipboard copy): `moment_directive_present`, `content_policy_byte_equal`, `selected_cast_exists`, `selected_records_exist`.
- **Soft tier** (4 rules, UI shows "copy anyway"): `no_internal_record_ids`, `no_engine_jargon`, `no_schema_validator_terms`, `no_record_class_narrator_voice`.

The Prompt Preview page exposes a copy-anyway override at `tools/manual-story-studio/web/src/pages/PromptPreview.tsx:94-112` that persists soft-tier violations as a `lint_override: { findings, copied_anyway_at }` field on the prompt sidecar. The copy button is `disabled={lint.blockingForCopy}` — which only fires on hard-tier findings — so the four leakage rules are warnings the author can dismiss.

This is the wrong tier choice for an external-LLM cockpit. The package's identity (per `package.json:4`) is *deterministic local writing cockpit*; its safety posture (per the report §22 OWASP synthesis and FOUNDATIONS §Tooling Recommendation) is *least agency*. Internal record IDs, branching-engine vocabulary, schema/validator terms, and record-class narrator voice are not stylistic warnings — they are surfaces the external LLM should never see. Concretely:

- Internal IDs (`mchar-3`, `mbel-7`, `PROMPT-12`) and engine IDs (`STENT-`, `PG-`, `SE-`, `SLT-`, ... — 44 entries in the `ENGINE_JARGON_DENYLIST`) are meaningless to the external LLM and dangerous to the author's frame: the LLM may treat them as fictional jargon and incorporate them into prose.
- Schema/validator terms (`state_snapshot`, `patch_plan`, `supersession`, `append_only`, ... — 15 entries in `SCHEMA_VALIDATOR_DENYLIST`) leak the engine's authoring vocabulary into a packet the external LLM might reflect back into prose as if those concepts were diegetic.
- Record-class narrator voice (`SF authority`, `BEL records`, `STCHAR profile`, ... — 10 entries in `RECORD_CLASS_NARRATOR_PHRASES`) is implementation taxonomy the LLM should never see at all, let alone weave into the narrator's voice.

The author cannot in practice judge per-finding whether a soft violation is safe; the architectural answer is to deny clipboard copy when any of these four rules fire. The `lint_override` field on the sidecar (an audit trail of the author having clicked through a warning) is the wrong abstraction — the right abstraction is "this prompt cannot be copied; fix the source content."

Soft tier is preserved for the qualitatively-different *quality* warnings the report calls out in §26 (prompt too long, weak directive, too many selected records) — these are author judgment calls. The leakage rules are not.

## 2. Scope

### In scope

1. **Promote 4 leakage rules to `hard` tier.** In `tools/manual-story-studio/src/prompt/lint.ts`, change the `tier: "soft"` literal to `tier: "hard"` at the four emission sites for `no_internal_record_ids` (line 212), `no_engine_jargon` (line 231), `no_schema_validator_terms` (line 249), `no_record_class_narrator_voice` (line 266). Mirror the change at the four corresponding emission sites in the beat-template scan helper (lines 311, 326, 338, 349 — the helper that scans `beat_guidance.instruction` strings).

2. **Update the in-source SPEC-102 comment header.** The header comment at `lint.ts:1-15` documents the 4/4 tier split as the SPEC-102 design intent. Replace it with a SPEC-106 update note: 4 hard rules become 8 hard rules; soft tier now reserved for quality warnings introduced in **SPEC-111**-adjacent UX work or kept empty until then.

3. **Remove the `lint_override` clipboard-override path in PromptPreview.** At `tools/manual-story-studio/web/src/pages/PromptPreview.tsx:94-112`, eliminate the `lint_override` construction. The `onCopy` handler returns early if `lint.blockingForCopy` is `true` (the disabled button is the primary guard; the early return is defense-in-depth against a programmatic click). The Save button (line 160) follows the same discipline.

4. **Remove the `lint_override` field from `PromptRunSidecar` writes.** At `tools/manual-story-studio/src/write/prompts.ts` (and any consumer that reads `lint_override`), eliminate the field from the write path. Reading existing sidecars that carry `lint_override` remains tolerant for backward compatibility (the field is ignored on read), but no new sidecar will carry it.

5. **Hard-tier the recent-segment availability rule when policy requires it.** The report §26 calls out `Recent segment unavailable: hard if policy requires it, soft if optional`. Manual-story metadata's `prompt_policy.include_recent_segments` (verified at `src/schema/manual-story.ts:71`) controls inclusion. When `include_recent_segments > 0` and the existing recent-segment composer fallback (`loadRecentSegmentLastParagraph` at `tools/manual-story-studio/src/prompt/compose.ts:354-392`) yields `null` for any reason (segments dir missing, no `SEG-<n>.md` files, file unreadable, or no paragraphs after parse), the lint emits a new `recent_segment_required_but_unavailable` finding at `hard` tier. When `include_recent_segments === 0`, missing segments are not a finding at all.

6. **Acceptance tests** under `tools/manual-story-studio/test/prompt-lint.test.ts` (extend, do not replace):
   - a prompt markdown containing `mchar-3` in the directive section → lint emits `no_internal_record_ids` at `hard` tier; `blockingForCopy` is `true`.
   - a prompt markdown containing `STENT-7` anywhere → `no_engine_jargon` at `hard` tier.
   - a prompt markdown containing `state_snapshot` → `no_schema_validator_terms` at `hard` tier.
   - a prompt markdown containing `SF authority` in a narrator-voice section → `no_record_class_narrator_voice` at `hard` tier.
   - a beat template's `beat_guidance.instruction` containing any of the above → corresponding `hard` finding from the beat-template scan helper, and `lintBeatTemplateGuidance` returns `blockingForCopy: true` (per Q1=(a) — flip the helper's hardcoded `blockingForCopy: false` to derive from the same `findings.some(f => f.tier === "hard")` formula as the main lint). See §4 *Test surface updates* for the existing `test/prompt/beat-template-lint.test.ts` cases (lines 39 / 50 / 61 / 70 / 79) that change as part of this work.
   - `include_recent_segments: 1` with no segments → `recent_segment_required_but_unavailable` at `hard` tier.
   - `include_recent_segments: 0` with no segments → no finding emitted for the recent-segment surface.
   - all eight existing hard-tier tests (the four original plus the four newly-promoted) collectively assert `blockingForCopy === true` and `cleanForCopy === false`.

7. **Frontend test (typecheck-only level)** — the removal of `lint_override` construction at `PromptPreview.tsx:94-112` must compile cleanly under the package's existing `tsc --noEmit` web test step.

### Out of scope

- Adding *new* soft-tier quality warnings (prompt-too-long, weak-directive, too-many-records) — those land alongside **SPEC-111**'s cockpit UX work, where the in-banner quality affordances live. This spec leaves the soft tier empty after the promotions.
- Renaming or restructuring the four newly-promoted rules — the rule names persist; only the tier changes.
- Changing the denylist contents (the 45 engine-jargon entries, 15 schema-validator entries, 10 narrator-voice phrases) — out of scope.
- Tightening the `INTERNAL_ID_REGEX` (`/\bm[a-z]+-[0-9]+\b/g`) — out of scope; current regex catches the documented identity-discipline lowercase IDs.
- Frontend health banner integration — **SPEC-105**.
- Adding a "lint history" view for debugging — defer; the structured findings are visible in PromptPreview already.
- Retiring AC #9 of the archived SPEC-102 capstone (`tools/manual-story-studio/test/capstone-spec102.test.ts:329` — "savePrompt with lint_override persists the override into the sidecar") is handled inline by §4 *Test surface updates* and §6 acceptance criteria; recorded here for Rule-6 retcon traceability against the archived SPEC-102.

## 3. Key decisions

- **Tier change, not denylist expansion.** The four denylists are already authored to catch the right surfaces; the question this spec answers is *what to do when they fire*. Conflating the decisions (extending denylists in the same diff) would muddy review and risk over-correction.

- **No deprecation period for `lint_override`.** The field exists in some on-disk sidecars (any prompt the author copied via the override path). The change is *write-side*: no new sidecar carries the field. Read-side remains tolerant — the field is silently ignored. No migration is needed because nothing else in the package consumes `lint_override` for behavior; it is purely an audit-trail breadcrumb.

- **Disabled-button is the primary guard; early return is defense-in-depth.** The disabled button at `PromptPreview.tsx:154` prevents click via standard UI; the `onCopy` early return at the top of the handler guards against programmatic clicks (e.g., a future test or keyboard shortcut that fires the handler bypassing disabled state).

- **`recent_segment_required_but_unavailable` is the only new rule added.** The report §26 lint table proposes several new soft rules ("Overlong prompt", "Weak directive", "Too many selected records"). Those are quality-of-life features that belong with cockpit UX — not safety. This spec defers them to **SPEC-111**.

- **Beat-template scan helper mirrors main-lint discipline.** The 4 leakage rules fire in two contexts: the main prompt markdown, and the beat-template `beat_guidance.instruction` strings (because the beat template's guidance text inlines into the prompt). Both emission sites must move to `hard` together; an asymmetry would leave the helper's API self-inconsistent. (Note: `lintBeatTemplateGuidance` has no `src/` consumer today — `tools/manual-story-studio/src/server/routes/beat-templates.ts` does not call it; the operational protection against template leakage is the main `lintPrompt` over section 6's inlined template body. Hard-tier symmetry here keeps the helper's API self-consistent and preserves the option for a future CRUD-route to gate beat-template saves on hard findings.)

- **No new lint test fixtures.** The existing `test/prompt-lint.test.ts` already exercises the soft-tier emissions; the test changes are tier-assertion changes plus a small number of new cases for the `recent_segment_required_but_unavailable` rule.

## 4. Files to touch

**Modify:**

- `tools/manual-story-studio/src/prompt/lint.ts`:
  - Header comment (lines 1-15) — update SPEC-102 4/4 documentation to reflect SPEC-106 8/0 split.
  - Line 212 — `tier: "soft" as const` → `tier: "hard"` for `no_internal_record_ids`.
  - Line 231 — `tier: "soft"` → `tier: "hard"` for `no_engine_jargon`.
  - Line 249 — `tier: "soft"` → `tier: "hard"` for `no_schema_validator_terms`.
  - Line 266 — `tier: "soft"` → `tier: "hard"` for `no_record_class_narrator_voice`.
  - Lines 311, 326, 338, 349 — same four tier promotions in the beat-template scan helper.
  - Add `recent_segment_required_but_unavailable` emission: when `input.prompt_policy.include_recent_segments > 0` and no segments are available, emit `{rule, tier: "hard", message}` finding. (Input shape change to `PromptLintInput` to carry `prompt_policy` and `latest_segment_available` may be needed — see types update below.)
  - Lines 288-289 — `cleanForCopy` and `blockingForCopy` computations in the main `lintPrompt` remain correct under the new tier distribution (no change needed; `blockingForCopy` already derives from `findings.some((f) => f.tier === "hard")`).
  - Line 359 — `lintBeatTemplateGuidance` currently hardcodes `blockingForCopy: false`; flip to the same derivation as line 289: `blockingForCopy: findings.some((f) => f.tier === "hard")`. This keeps the helper's API self-consistent with the main lint after the four rules become hard tier; `cleanForCopy` at line 358 is already structurally correct.
- `tools/manual-story-studio/src/prompt/types.ts` — extend `PromptLintInput` (or its surrounding context type) with `latest_segment_available: boolean` and `prompt_policy: Pick<ManualStoryPromptPolicy, "include_recent_segments">`, fed by the prompt composer at call time.
- `tools/manual-story-studio/src/prompt/compose.ts` — pass `latest_segment_available` and the relevant `prompt_policy` slice into `lintPrompt`.
- `tools/manual-story-studio/src/write/prompts.ts` — remove construction of `lint_override` on write; field omitted from sidecar.
- `tools/manual-story-studio/src/prompt/types.ts` — mark `PromptRunSidecar.lint_override?` as legacy (read-tolerant, write-omitted); add a one-line code comment explaining the SPEC-106 deprecation.
- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx`:
  - Lines 94-112 — remove `lint_override` construction.
  - Top of `onCopy` handler — add early return `if (lint.blockingForCopy) return;`.
  - Same early return at the top of the Save handler.
- `tools/manual-story-studio/src/server/routes/prompts.ts`:
  - Lines 59-62 — remove the `SaveBody.lint_override?` field declaration.
  - Line 8 — update the header comment that mentions `lint_override for soft-finding saves` to reflect the SPEC-106 removal.
  - Line 324 — simplify the lint-blocking guard from `if (result.lint.blockingForCopy && !body.lint_override)` to `if (result.lint.blockingForCopy)`. Any hard finding now blocks save unconditionally; the override-acceptance branch is retired.
  - Lines 331-332 — remove the `body.lint_override`-branched `writePrompt` call; pass only `{ root, composeResult: result }` (no `lint_override` argument).
- `tools/manual-story-studio/web/src/api/prompts.ts`:
  - Lines 75-78 — remove the `lint_override?` field from the save request type used by `savePrompt`; the frontend never sends the field after SPEC-106.
- `tools/manual-story-studio/web/src/types/manual-story.ts`:
  - Lines 292-295 — mark the frontend's duplicate `PromptRunSidecar.lint_override?` field as legacy (read-tolerant, write-omitted), matching the backend treatment in `src/prompt/types.ts`. Add a one-line comment naming the SPEC-106 deprecation.
- `tools/manual-story-studio/test/prompt-lint.test.ts` — update existing soft-tier assertions to expect `hard` tier; add four new test cases for `recent_segment_required_but_unavailable` (policy on/off × segments present/absent matrix).

**Test surface updates** (consumers of the removed `lint_override` write path and the promoted-tier helper):

- `tools/manual-story-studio/test/write/prompts.test.ts`:
  - Line 138 — invert the "lint_override field round-trips when provided" test to assert `lint_override` is **omitted** on write even when supplied (regression guard against re-introducing the removed code path); OR delete the test if the field is fully retired from the `WritePromptInput` shape.
- `tools/manual-story-studio/test/server/prompts-routes.test.ts`:
  - Line 207 — invert "POST /prompts with lint_override persists the override into the sidecar" to assert the route no longer accepts/forwards `lint_override` (the field is silently dropped or the request returns a typed error).
- `tools/manual-story-studio/test/capstone-spec102.test.ts`:
  - Line 329 — AC #9 "savePrompt with lint_override persists the override into the sidecar" was the archived-SPEC-102 acceptance witness for the override path. Rewrite as a regression guard that asserts the override path is gone (recommended — preserves the SPEC-102 capstone surface), or retire with a `test.skip` + retirement comment citing SPEC-106.
- `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts`:
  - Lines 39, 50, 61, 70 — flip the four `tier === "soft"` assertions to `tier === "hard"`, mirroring the SPEC-106 promotion.
  - Line 79 — retire the "lintBeatTemplateGuidance: never produces hard findings (override always works)" test entirely; with Q1=(a) the helper now produces hard findings and derives `blockingForCopy` accordingly. Replace with a positive guard asserting `blockingForCopy === true` when leakage is present.

**No modification to:**

- The denylist arrays (`ENGINE_JARGON_DENYLIST`, `SCHEMA_VALIDATOR_DENYLIST`, `RECORD_CLASS_NARRATOR_PHRASES`, `INTERNAL_ID_REGEX`) — content unchanged.
- The hard-tier rules already in place (`moment_directive_present`, `content_policy_byte_equal`, `selected_cast_exists`, `selected_records_exist`).
- Backend route layer — the lint result shape is unchanged; only the tier distribution shifts.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Tooling Recommendation (least-agency LLM packets) | aligns @ prompt boundary | The external LLM receives a packet that cannot contain internal IDs, engine jargon, schema/validator terms, or record-class narrator voice; the boundary becomes denial-by-default for those surfaces. |
| Rule 2 No Pure Cosmetics | aligns @ prompt boundary | Leakage of internal IDs into the external prompt is structurally meaningless to the LLM (cosmetic to the request payload) and dangerous to the prose; promoting to hard removes the cosmetic-warning gap. |
| §Story Bundles §4 Write Discipline (deterministic write surface) | aligns by analogy @ clipboard | The prompt clipboard is the external-LLM equivalent of a write; making it deterministic (clean prompts only) mirrors the determinism FOUNDATIONS expects from canon-write surfaces. |
| §Tooling Recommendation §"agents never operate on prose alone" | aligns @ leakage denial | The external agent operating on prose receives a packet curated by the cockpit; the leakage rules guarantee the cockpit does not poison that packet with implementation taxonomy. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | This spec engages no canon facts. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` runs the updated `prompt-lint.test.ts`. The web test step (`tsc --noEmit`) must pass after the `PromptPreview.tsx` simplification.

Manual verification: in a worktree with a manual story whose prompt composer would emit `mchar-3` into the directive section (e.g., the moment-directive draft contains the literal substring `mchar-3`), open Prompt Preview. The lint badge shows a hard finding; the Copy button is disabled with no "copy anyway" affordance; the Save button is disabled.

## 7. Acceptance criteria

1. The four leakage rules (`no_internal_record_ids`, `no_engine_jargon`, `no_schema_validator_terms`, `no_record_class_narrator_voice`) emit at `tier: "hard"` from both the main prompt lint and the beat-template scan helper. (acceptance test)
2. A prompt whose markdown contains any of the four leakage surfaces returns `blockingForCopy: true` and `cleanForCopy: false`. (acceptance test)
3. The `PromptPreview` Copy and Save buttons are disabled when any of the four leakage rules fire; no "copy anyway" override path exists in the source. (verified by grep: `grep -n "lint_override" tools/manual-story-studio/web/src/pages/PromptPreview.tsx` returns zero matches; `grep -n "copied_anyway" tools/manual-story-studio/src/write/prompts.ts` returns zero matches.)
4. New prompt sidecar writes do not contain a `lint_override` field. (acceptance test: simulate a hard-lint-violation copy attempt and assert the save path either rejects or does not include the field on success.)
5. `include_recent_segments: 1` with no segments emits a `recent_segment_required_but_unavailable` hard finding; `include_recent_segments: 0` with no segments emits no finding for that surface. (acceptance test)
6. Existing tests under `tools/manual-story-studio/test/` continue to pass after the tier-distribution and input-shape changes. The web `tsc --noEmit` step remains green.

## 8. Assumption reassessment

- **Assumption:** The 4 main-lint emission sites and the 4 beat-template-scan emission sites are the only sites in the package emitting these four rule names. → Verify via `grep -n 'rule: "no_internal_record_ids"\|rule: "no_engine_jargon"\|rule: "no_schema_validator_terms"\|rule: "no_record_class_narrator_voice"' tools/manual-story-studio/src/`. If additional sites exist, include them in the tier promotion.
- **Assumption:** The composer can supply `latest_segment_available` cheaply (a boolean derived from listing the segments directory). → Verified: the composer already reads segment data for the recent-prose section; reusing that data for the lint input is a no-cost addition.
- **Assumption (closed at reassessment, 2026-06-01):** No on-disk sidecar consumer downstream of the package reads `lint_override` to drive behavior. → Verified via `grep -rn lint_override` from repo root: zero non-package, non-test consumers exist. The field is purely a per-package audit-trail breadcrumb. No deprecation period needed; the read-tolerant path on the type is sufficient for the few on-disk sidecars that may carry the field from the legacy write path.
