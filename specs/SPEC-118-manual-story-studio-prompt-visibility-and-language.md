# SPEC-118 — Manual Story Studio: Prompt Visibility (`never_prompt`), Language, and Translator Wiring

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (`tools/manual-story-studio`; no LLM/MCP/patch-engine; touches the per-record visibility enum, deterministic composer, prompt section emitters, and existing translators).
**Depends on:** archive/specs/SPEC-113-manual-story-studio-inclusion-ledger-inspector.md (the resolution ledger this spec extends with the `never_prompt` reason).
**Blocks:** SPEC-121 (the acceptance test excludes the true answer from the prompt at step 13, exercising `never_prompt`/exclusion).
**Related:** `tools/manual-story-studio/src/schema/manual-story.ts`, `tools/manual-story-studio/src/prompt/compose.ts`, `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts`, `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts`, `tools/manual-story-studio/src/prompt/translators/beliefs.ts`, `.../translators/questions.ts`.
**Source:** critical triage of `reports/manual-story-studio-fourth-iteration.md` §§18 / 19 / 39 + Stages 3/4 (ChatGPT-Pro, 2026-06-02). Bundles three cohesive, low-risk prompt-layer fixes.

---

## 1. Context & Motivation

Three verified, related gaps in the deterministic prompt layer:

**(A) `never_prompt` visibility mode (§18/§39).** The per-record visibility enum is exactly three values — `always | include_when_relevant | only_if_pinned` (`manual-story.ts:135-138`). There is **no** way to mark a record as "must never reach the external LLM in any form." The iteration-3 triage declined this as "redundant with `only_if_pinned`," but that rationale was **incomplete**: `only_if_pinned` still *permits* inclusion once the record is pinned, and the `must_not_reveal` mechanism is *not* a substitute — must-not-reveal records have their **titles rendered into the prompt** under a "Must not reveal:" block (`section-10-beliefs-secrets-questions.ts:63-71`), by design (telling the LLM what not to reveal requires naming it). So author-only answers, the true resolution of a mystery, spoiler metadata, abandoned concepts, and private notes have **no permanent guard**: the author must remember to exclude them in every working set (`excluded_records` is per-focus, not per-record). `never_prompt` is the missing per-record permanent suppression primitive.

**(B) Beat-count default (§19).** `section-5-required-beat-cluster.ts:5` sets `DEFAULT_BEAT_COUNT = "2-5"`; the clarified product target is **3-5** meaningful beats. One-line default change (author override preserved).

**(C) Author-facing engine jargon (§19).** `section-14-stop-rule.ts:7` reads "Do not declare durable **machine-state conclusions** unless the directive explicitly asks for that wording." "Machine-state conclusions" is internal-engine language leaking into author-facing prompt text. Replace with plain wording: *"Do not declare durable continuity changes outside the prose. The author will update story records manually after accepting or rejecting this segment."*

**(D) Translator wiring of existing-but-ignored fields (A5, from §12).** The broad schema expansion is deferred (triage D1), but two **already-defined** typed fields are read by the schema yet never emitted by their translators: `confidence` on belief (`beliefs.ts` reads `holder/truth_relation` only) and `answer_known` on question (`questions.ts` ignores it in output). Wiring these is a pure translator fix independent of any new fields.

## 2. Scope

### In scope

1. **Add `never_prompt` to `PromptVisibility`** (`manual-story.ts:135-138`) as a fourth value. Update the schema validator and `ManualRecordSummary`.
2. **Composer enforcement (`compose.ts`).** A `never_prompt` record is **excluded from `SectionEmitterInput.records` entirely** — it must not reach any section emitter, including section-10's "Must not reveal:" block. It is recorded in the resolution ledger as `excluded` with reason `never_prompt`. `never_prompt` **overrides** pin/relevance/`active`: even an explicitly pinned or `included_records`-seeded `never_prompt` record is suppressed (with a distinct ledger reason so the inspector can explain it).
3. **Deterministic precedence (documented + tested):** `never_prompt` (per-record, absolute) → `excluded_records` (per working set) → `must_not_reveal` (rendered-but-flagged) → inclusion logic (`always`/relevant/pinned). No record that is `never_prompt` appears anywhere in the markdown.
4. **Beat default `"2-5"` → `"3-5"`** (`section-5-required-beat-cluster.ts:5`); author override path unchanged.
5. **Replace the "machine-state conclusions" sentence** (`section-14-stop-rule.ts:7`) with the plain-wording replacement above.
6. **Wire existing typed fields into translators:** `beliefs.ts` emits a confidence clause when `confidence` is set; `questions.ts` reflects `answer_known` (e.g., flags author-known vs open) in its emitted guidance. Both remain graceful when the field is absent.

### Out of scope

- The broad non-cast schema field expansion (deferred — triage D1). Only the two already-present fields are wired.
- Any change to the existing hard ID-leakage lint (`no_internal_record_ids`) — already correct (triage C1); not touched.
- A per-record UI redesign beyond exposing the new enum value in the record form's visibility selector.

## 3. Key decisions

- **`never_prompt` is absolute and per-record.** It is the only suppression that survives pinning and lives on the record, not the working set — which is exactly the safety property author-only/spoiler content needs.
- **Distinct from `must_not_reveal`.** Both are kept: `must_not_reveal` tells the LLM "don't reveal X" (X is named); `never_prompt` means "X is never mentioned at all." They are complementary, not redundant.
- **Reverses an incomplete prior rejection, narrowly.** Only the `never_prompt` value is added; the rest of the iteration-3-declined five-value enum rewrite (`pinned_next`, etc.) stays declined (still redundant with `pinned_records`).
- **Bundle by layer.** (A)–(D) are all single-file-ish prompt-layer edits with shared tests; one spec keeps them coherent and avoids a churny multi-PR split for trivial changes.

## 4. Files to touch

**Modify:**
- `tools/manual-story-studio/src/schema/manual-story.ts` — add `never_prompt` to `PromptVisibility` (lines ~135-138) + validator + summary type.
- `tools/manual-story-studio/src/prompt/compose.ts` — exclude `never_prompt` records from emitter input with override precedence + ledger reason `never_prompt`.
- `tools/manual-story-studio/src/prompt/sections/section-5-required-beat-cluster.ts` — default `"2-5"` → `"3-5"`.
- `tools/manual-story-studio/src/prompt/sections/section-14-stop-rule.ts` — replace the "machine-state conclusions" sentence.
- `tools/manual-story-studio/src/prompt/translators/beliefs.ts` — emit `confidence` clause when present.
- `tools/manual-story-studio/src/prompt/translators/questions.ts` — reflect `answer_known` in emitted guidance.
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (or the visibility selector component) — offer `never_prompt`.

**Create / extend tests:**
- `tools/manual-story-studio/test/prompt/never-prompt.test.ts` — a `never_prompt` record that is also pinned/seeded/`active` never appears in the composed markdown (incl. section-10), and is logged `excluded`/`never_prompt`; a `must_not_reveal` record still renders its title in the "Must not reveal:" block (precedence intact).
- extend prompt-section tests for the `"3-5"` default and the new stop-rule wording.
- extend translator tests: belief with `confidence` emits the clause; question reflects `answer_known`.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Prose/state separation + prompt-boundary safety | aligns @ composer suppression | `never_prompt` guarantees author-only/spoiler records never cross into the external-LLM prompt, strengthening the instruction/data boundary the report (§32) cites; deterministic, no inference. |
| §Tooling Recommendation (least-agency at the prompt boundary) | aligns @ per-record absolute guard | A permanent per-record suppression is the least-surprising mechanism for "this never leaves the tool," vs. relying on the author to re-exclude each focus. |
| Determinism (composer is a pure deterministic resolver) | aligns @ documented precedence | The four-layer precedence is fully deterministic and ledger-explained; no heuristic/LLM judgment added. |
| §Soft Canon / Local Truth | aligns @ translator wiring | Emitting `confidence`/`answer_known` surfaces author-asserted local truth more faithfully to the prose engine without inventing data. |

## 6. Acceptance criteria

1. `PromptVisibility` includes `never_prompt`; the validator accepts it and rejects unknown values.
2. A `never_prompt` record — even when pinned and `active` — appears **nowhere** in the composed markdown (asserted incl. section-10) and is logged `excluded` with reason `never_prompt`.
3. A `must_not_reveal` (non-`never_prompt`) record still renders its title in the "Must not reveal:" block — precedence test confirms the two mechanisms coexist.
4. Composed prompt default beat language reads `3-5` (not `2-5`); author override still works.
5. The phrase "machine-state conclusions" no longer appears in any author-facing section; the plain replacement is present. (`grep -rn "machine-state conclusions" tools/manual-story-studio/src` returns nothing.)
6. A belief with `confidence` set emits a confidence clause; a question reflects `answer_known`; both degrade gracefully when absent.
7. `cd tools/manual-story-studio && npm run test:backend` and `npm --prefix web test` pass; full `npm test` green.

## 7. Test plan

- Backend: `cd tools/manual-story-studio && npm run test:backend`
- Web typecheck: `cd tools/manual-story-studio && npm --prefix web test`
- Full: `cd tools/manual-story-studio && npm test`
