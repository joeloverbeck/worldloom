# SPEC-118 — Manual Story Studio: Prompt Visibility (`never_prompt`), Language, and Translator Wiring

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (`tools/manual-story-studio`; no LLM/MCP/patch-engine; touches the per-record visibility enum, deterministic composer, prompt section emitters, and existing translators).
**Depends on:** archive/specs/SPEC-113-manual-story-studio-prompt-inclusion-ledger.md (the resolution ledger this spec extends with the `never_prompt` reason).
**Blocks:** SPEC-121 (the acceptance test excludes the true answer from the prompt at step 13, exercising `never_prompt`/exclusion).
**Related:** `tools/manual-story-studio/src/schema/manual-story.ts`, `tools/manual-story-studio/src/prompt/compose.ts`, `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts`, `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts`, `tools/manual-story-studio/src/prompt/translators/beliefs.ts`, `.../translators/questions.ts`.
**Source:** critical triage of `reports/manual-story-studio-fourth-iteration.md` §§18 / 19 / 39 + Stages 3/4 (ChatGPT-Pro, 2026-06-02). Bundles three cohesive, low-risk prompt-layer fixes.

**Implementation note (2026-06-03):** `archive/tickets/SPEC118MANSTOSTU-001.md` completed the `never_prompt` slice: backend/web `PromptVisibility`, validator enum, backend/web `PromptExcludedReason`, composer suppression of emitter records and `must_not_reveal`, RecordForm option, and focused prompt/schema/web mirror tests. `archive/tickets/SPEC118MANSTOSTU-002.md` completed the beat-count default slice: section-5 fallback and newly-created manual-story metadata now default to `3-5`, while explicit metadata overrides still win. `archive/tickets/SPEC118MANSTOSTU-003.md` completed the stop-rule wording slice: section 14 now uses plain durable-continuity wording and no Manual Studio source emits "machine-state conclusions". Remaining current-state prose in this draft is historical intake context until the full SPEC-118 bundle is archived.

---

## 1. Context & Motivation

Three verified, related gaps in the deterministic prompt layer:

**(A) `never_prompt` visibility mode (§18/§39).** The per-record visibility enum is exactly three values — `always | include_when_relevant | only_if_pinned` (`manual-story.ts:135-138`). There is **no** way to mark a record as "must never reach the external LLM in any form." The iteration-3 triage declined this as "redundant with `only_if_pinned`," but that rationale was **incomplete**: `only_if_pinned` still *permits* inclusion once the record is pinned, and the `must_not_reveal` mechanism is *not* a substitute — must-not-reveal records have their **titles rendered into the prompt** under a "Must not reveal:" block (`section-10-beliefs-secrets-questions.ts:63-71`), by design (telling the LLM what not to reveal requires naming it). So author-only answers, the true resolution of a mystery, spoiler metadata, abandoned concepts, and private notes have **no permanent guard**: the author must remember to exclude them in every working set (`excluded_records` is per-focus, not per-record). `never_prompt` is the missing per-record permanent suppression primitive.

**(B) Beat-count default (§19).** `section-5-required-beat-cluster.ts:5` sets `DEFAULT_BEAT_COUNT = "2-5"`; the clarified product target is **3-5** meaningful beats. One-line default change (author override preserved).

**(C) Author-facing engine jargon (§19).** `section-14-stop-rule.ts:7` reads "Do not declare durable **machine-state conclusions** unless the directive explicitly asks for that wording." "Machine-state conclusions" is internal-engine language leaking into author-facing prompt text. Replace with plain wording: *"Do not declare durable continuity changes outside the prose. The author will update story records manually after accepting or rejecting this segment."*

**(D) Translator wiring of existing-but-ignored fields (A5, from §12).** The broad schema expansion is deferred (triage D1), but two **already-defined** typed fields are read by the schema yet never emitted by their translators: `confidence` on belief (`beliefs.ts` reads `holder/truth_relation` only) and `answer_known` on question (`questions.ts` ignores it in output). Wiring these is a pure translator fix independent of any new fields.

## 2. Scope

### In scope

1. **Add `never_prompt` to `PromptVisibility`** (`manual-story.ts:135-138`) as a fourth value. Update `ManualRecordSummary`, the schema validator (`src/validate/schema.ts:65` value enum; the required-field list at `:43` is unchanged), and the web-side `PromptVisibility` mirror (`web/src/types/manual-story.ts:162-165`). The validator literal — **not** `manual-story.ts` — is where the closed enum is enforced.
2. **Composer enforcement (`compose.ts`).** A `never_prompt` record is **excluded from `SectionEmitterInput.records` entirely** — it must not reach any section emitter. Crucially, excluding from `records` alone is **insufficient**: section-10's "Must not reveal:" block renders titles from the working-set `must_not_reveal` ID list passed at `compose.ts:354` (→ `section-10:63-71`), **independent of `records`**. The composer must therefore **also strip `never_prompt` record IDs from the `must_not_reveal` list** (`mustNotRevealIds` at `compose.ts:190` and the list passed at `:354`), which requires reading each `must_not_reveal`-listed record's `prompt_visibility`. The suppression is recorded in the resolution ledger as `excluded` with reason `never_prompt` (extend the `PromptExcludedReason` union at `src/prompt/types.ts:92`). `never_prompt` **overrides** pin/relevance/`active`/`must_not_reveal`: even an explicitly pinned, `included_records`-seeded, or `must_not_reveal`-listed `never_prompt` record is suppressed (with a distinct ledger reason so the inspector can explain it).
3. **Deterministic precedence (documented + tested):** `never_prompt` (per-record, absolute) → `excluded_records` (per working set) → `must_not_reveal` (rendered-but-flagged) → inclusion logic (`always`/relevant/pinned). No record that is `never_prompt` appears anywhere in the markdown.
4. **Beat default `"2-5"` → `"3-5"`** (`section-5-required-beat-cluster.ts:5`); author override path unchanged.
5. **Replace the "machine-state conclusions" sentence** (`section-14-stop-rule.ts:7`) with the plain-wording replacement above.
6. **Wire existing typed fields into translators:** `beliefs.ts` emits a confidence clause for every `confidence` value (`low | medium | high | certain`), with phrasing **scaled to the value** (e.g., tentative for `low` → with-certainty for `certain`); `questions.ts` reflects `answer_known` (boolean: author-known vs open) in its emitted guidance. Both fields are **required** on valid records (`manual-story.ts:350`, `:463`), so there is no absent-field path — the translators handle every enum/boolean value rather than a missing field.

### Out of scope

- The broad non-cast schema field expansion (deferred — triage D1). Only the two already-present fields are wired.
- Any change to the existing hard ID-leakage lint (`no_internal_record_ids`) — already correct (triage C1); not touched.
- A per-record UI redesign beyond exposing the new enum value in the record form's visibility selector.
- **The source report's rename of the existing enum values** (§18.2 / §39: `relevant_by_default`, `only_when_pinned`) is **declined** — renaming live enum values is a breaking change across the backend type, web mirror, validator literal, and test fixtures; only the additive `never_prompt` value is adopted. The report's §18.1 lifecycle-gate clarification and the Stage-5 Inspector-explainability upgrade (§18.5 / §39.2) are **deferred to the spec bundle** (later stages), not addressed here.

## 3. Key decisions

- **`never_prompt` is absolute and per-record.** It is the only suppression that survives pinning and lives on the record, not the working set — which is exactly the safety property author-only/spoiler content needs.
- **Distinct from `must_not_reveal`.** Both are kept: `must_not_reveal` tells the LLM "don't reveal X" (X is named); `never_prompt` means "X is never mentioned at all." They are complementary, not redundant.
- **Reverses an incomplete prior rejection, narrowly.** Only the `never_prompt` value is added; the rest of the iteration-3-declined five-value enum rewrite (`pinned_next`, etc.) stays declined (still redundant with `pinned_records`).
- **Bundle by layer.** (A)–(D) are all single-file-ish prompt-layer edits with shared tests; one spec keeps them coherent and avoids a churny multi-PR split for trivial changes.

## 4. Files to touch

**Modify:**
- `tools/manual-story-studio/src/schema/manual-story.ts` — add `never_prompt` to `PromptVisibility` (lines ~135-138) + `ManualRecordSummary` summary type.
- `tools/manual-story-studio/src/validate/schema.ts` — add `never_prompt` to the `prompt_visibility` value enum (`:65`); required-field list at `:43` unchanged. (This is the validator AC #1 depends on.)
- `tools/manual-story-studio/web/src/types/manual-story.ts` — add `never_prompt` to the web-side `PromptVisibility` mirror (`:162-165`) so the web typecheck (`npm --prefix web test`) and the form selector accept it.
- `tools/manual-story-studio/src/prompt/types.ts` — extend `PromptExcludedReason` (`:92`) with `never_prompt` for the ledger reason.
- `tools/manual-story-studio/src/prompt/compose.ts` — exclude `never_prompt` records from emitter input **and** strip `never_prompt` IDs from the `must_not_reveal` list (`:190`, `:354`; requires reading each listed record's `prompt_visibility`), with override precedence + ledger reason `never_prompt`.
- `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts` — default `"2-5"` → `"3-5"`.
- `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` — replace the "machine-state conclusions" sentence.
- `tools/manual-story-studio/src/prompt/translators/beliefs.ts` — emit `confidence` clause when present.
- `tools/manual-story-studio/src/prompt/translators/questions.ts` — reflect `answer_known` in emitted guidance.
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` — add `never_prompt` to `PROMPT_VISIBILITY_VALUES` (`:30-34`); the selector at `:628` then offers it.

**Create / extend tests:**
- `tools/manual-story-studio/test/prompt/never-prompt.test.ts` — a `never_prompt` record that is also pinned/seeded/`active`, **and** a `never_prompt` record also listed in the working-set `must_not_reveal`, both appear nowhere in the composed markdown (incl. section-10's "Must not reveal:" block), and are logged `excluded`/`never_prompt`; a `must_not_reveal` (non-`never_prompt`) record still renders its title in the "Must not reveal:" block (precedence intact).
- update `tools/manual-story-studio/test/validate/schema.test.ts` — the enum-membership assertion at `:433` (`["always", "include_when_relevant", "only_if_pinned"]`) must include `never_prompt`, or `npm test` fails.
- extend prompt-section tests for the `"3-5"` default and the new stop-rule wording.
- extend translator tests: belief emits a confidence clause scaled per `confidence` value; question reflects `answer_known` (author-known vs open).

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Prose/state separation + prompt-boundary safety | aligns @ composer suppression | `never_prompt` guarantees author-only/spoiler records never cross into the external-LLM prompt, strengthening the instruction/data boundary the report (§32) cites; deterministic, no inference. |
| §Tooling Recommendation (least-agency at the prompt boundary) | aligns @ per-record absolute guard | A permanent per-record suppression is the least-surprising mechanism for "this never leaves the tool," vs. relying on the author to re-exclude each focus. |
| Determinism (composer is a pure deterministic resolver) | aligns @ documented precedence | The four-layer precedence is fully deterministic and ledger-explained; no heuristic/LLM judgment added. |
| §Soft Canon / Local Truth | aligns @ translator wiring | Emitting `confidence`/`answer_known` surfaces author-asserted local truth more faithfully to the prose engine without inventing data. |

## 6. Acceptance criteria

1. `PromptVisibility` includes `never_prompt`; the validator accepts it and rejects unknown values.
2. A `never_prompt` record — even when pinned, `active`, or listed in the working-set `must_not_reveal` — appears **nowhere** in the composed markdown (asserted incl. section-10's "Must not reveal:" block) and is logged `excluded` with reason `never_prompt`.
3. A `must_not_reveal` (non-`never_prompt`) record still renders its title in the "Must not reveal:" block — precedence test confirms the two mechanisms coexist.
4. Composed prompt default beat language reads `3-5` (not `2-5`); author override still works.
5. The phrase "machine-state conclusions" no longer appears in any author-facing section; the plain replacement is present. (`grep -rn "machine-state conclusions" tools/manual-story-studio/src` returns nothing.)
6. The belief translator emits a confidence clause scaled to each `confidence` value (`low | medium | high | certain`); the question translator reflects `answer_known` (author-known vs open). Both fields are required, so every value is handled (no absent-field path).
7. `cd tools/manual-story-studio && npm run test:backend` and `npm --prefix web test` pass; full `npm test` green.

## 7. Test plan

- Backend: `cd tools/manual-story-studio && npm run test:backend`
- Web typecheck: `cd tools/manual-story-studio && npm --prefix web test`
- Full: `cd tools/manual-story-studio && npm test`

## 8. Risks & Open Questions

- **Dual `PromptVisibility` mirror.** The enum lives in four places that must change together: backend type (`src/schema/manual-story.ts:135-138`), validator literal (`src/validate/schema.ts:65`), web mirror (`web/src/types/manual-story.ts:162-165`), and the form options array (`RecordForm.tsx:30-34`). A missed mirror passes backend tests but fails `npm --prefix web test` or silently hides the new option in the selector.
- **`must_not_reveal` precedence (load-bearing).** `never_prompt` suppression must strip IDs from the working-set `must_not_reveal` list, not only from `SectionEmitterInput.records` — section-10's "Must not reveal:" block reads that list directly (`compose.ts:354` → `section-10:63-71`). This is the correctness case the never-prompt test must cover; see §2.2 and AC #2.
- No open questions: confidence-clause phrasing resolved to per-value scaling (every value emits a clause).
