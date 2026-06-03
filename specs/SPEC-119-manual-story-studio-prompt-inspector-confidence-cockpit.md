# SPEC-119 — Manual Story Studio: Prompt Inspector Confidence Cockpit

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (`tools/manual-story-studio`; frontend-only rendering change to the Prompt Preview/Inspector + a read-only payload enrichment; no LLM/MCP/patch-engine).
**Depends on:** archive/specs/SPEC-113-manual-story-studio-inclusion-ledger-inspector.md (the inspector + resolution ledger this spec upgrades), archive/specs/SPEC-112-manual-story-studio-record-pickers.md (reuses `RecordCard`).
**Blocks:** —
**Related:** `tools/manual-story-studio/web/src/pages/PromptPreview.tsx`, `tools/manual-story-studio/src/prompt/compose.ts` (resolution ledger), `tools/manual-story-studio/web/src/components/RecordCard.tsx`.
**Source:** critical triage of `reports/manual-story-studio-fourth-iteration.md` §§20 / 40 + Stage 5 (ChatGPT-Pro, 2026-06-02). Scope corrected against verification (triage C4): the report's "still raw-ID-heavy" is **partly overstated** — included/excluded/suppressed already render `RecordCard`s. This spec targets the two panels that still show raw IDs plus the fabricated reason summaries.

---

## 1. Context & Motivation

Verified state of the Prompt Inspector (`PromptPreview.tsx`):

- **Already cards:** included (`:303-317`), excluded (`:324-337`), suppressed (`:344-351`) render `RecordCard`s.
- **Still raw IDs:** **selected cast** (`:284`, `.join(", ")`) and **working set** (`:296`, `.join(", ")`) are raw ID strings; section map is raw ID lists in a `<dl>` (`:359-365`).
- **Fabricated summaries:** `ledgerSummary()` (`:29-41`) synthesizes `ManualRecordSummary` objects whose `summary` is `"Reason: <label>"` (`:38`) rather than the record's real identity, so the cards display the *reason* in place of the record's proposition/state.

(Note: the report's separate worry that internal IDs reach the *external LLM prompt* is already foreclosed by the hard `no_internal_record_ids` lint — triage C1. This spec is purely about the author-facing inspector UI.)

Target (report §40): the inspector should read as an **author confidence panel** — "these records will shape the prompt," "these were deliberately excluded," "these secrets are protected," "this is safe to copy" — with every record row showing real identity (title, class, concise state/proposition, involved cast, prompt mode) **and** its inclusion/exclusion reason, plus a "why is this here? / why is this missing?" affordance.

## 2. Scope

### In scope

1. **Real record identity in every panel.** Replace the fabricated `ledgerSummary()` `"Reason: …"` summary with the record's actual summary/proposition + class + involved cast + prompt mode (the data already exists in the record store; the composer payload should carry enough identity per ledger entry, or the inspector fetches it). The **reason** becomes a separate labeled line/badge on the card, not the card's summary.
2. **Cards for selected-cast and working-set panels.** Replace the raw `.join(", ")` ID lists (`:284`, `:296`) with `RecordCard` (or a compact identity chip rendering title + class), so no raw `mXXX-n` strings are shown as primary evidence. A small copyable technical-ID chip is acceptable (report §16 compromise), but not the primary line.
3. **"Why is this here?" per record row.** Each included/excluded/suppressed row shows its deterministic reason in author-readable form (e.g., "included because pinned," "included because active pressure clock," "excluded because working-set excluded," "suppressed because must-not-reveal," "excluded because `never_prompt`" once SPEC-118 lands, "blocked because missing/unsafe").
4. **"Why is this missing?" lookup.** A search affordance: type a record title and the inspector reports why it was not included (inactive / not relevant / not pinned / `never_prompt` / excluded), using the same deterministic resolution data.
5. **Collapse section-map detail by default** (keep it available); render its entries with record identity rather than bare ID lists.
6. **Confidence-panel framing copy** for the panel headers per report §40.

### Out of scope

- Any change to the deterministic resolution logic in `compose.ts` beyond ensuring each ledger entry carries (or the inspector can resolve) the record's real identity. No new inclusion rules.
- The `never_prompt` value itself (SPEC-118); this spec only renders its reason when present.
- Backend prompt-leakage changes (already correct).

## 3. Key decisions

- **Identity first, reason second, ID last.** Cards lead with title/proposition/class/cast; the inclusion reason is a labeled badge; the technical ID is a small copyable chip. This is the report §16/§37 compromise, applied uniformly.
- **Reuse `RecordCard`.** No new card component; extend it minimally if a "reason badge" slot is needed.
- **Deterministic explanations only.** "Why here / why missing" is rendered straight from the existing resolution ledger reasons — no inference, no scoring narrative.
- **Scope honestly to the gap.** Per C4, only the two raw-ID panels + fabricated summaries are in scope; the already-card panels get the reason-line/identity-fix, not a rewrite.

## 4. Files to touch

**Modify:**
- `tools/manual-story-studio/web/src/pages/PromptPreview.tsx` — replace `ledgerSummary()` fabricated summary with real identity + separate reason line; cardify selected-cast (`:284`) and working-set (`:296`); cardify section-map entries (`:359-365`) and collapse by default; add "why here / why missing"; confidence-panel header copy.
- `tools/manual-story-studio/web/src/components/RecordCard.tsx` — minimal extension for a reason-badge slot + de-emphasized copyable ID chip, if needed.
- `tools/manual-story-studio/src/prompt/compose.ts` and/or the prompt route — ensure each resolution ledger entry carries (or is resolvable to) the record's real summary/class/cast/prompt-mode for the inspector (read-only enrichment; no logic change).

**Create / extend tests:**
- `tools/manual-story-studio/web` typecheck-level test coverage where present; and
- `tools/manual-story-studio/test/prompt/inspector-payload.test.ts` — the resolution payload exposes, per entry, real record identity (not just a reason label) and the deterministic reason; "why missing" lookup resolves a known-excluded record to its reason.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Explainability / no-silent-state (mirrored to the tooling boundary) | aligns @ inspector rendering | Showing real identity + deterministic reason per record lets the author verify the prompt carries the right story truth, instead of a reason-label standing in for the record. |
| Determinism | aligns @ "why here/missing" | Explanations are rendered directly from the deterministic resolution ledger; no heuristic narrative is invented. |
| §Tooling Recommendation (author confidence over validator tone) | aligns @ panel framing | The confidence-panel framing serves the author's "did the right truth get in?" question rather than a pass/fail validator readout. |
| Prompt-boundary ID hygiene | N/A @ external prompt | IDs reaching the external LLM are already blocked by the hard lint (triage C1); this spec only de-emphasizes IDs in the *author-facing* inspector, so the prompt-boundary principle is not engaged here. |

## 6. Acceptance criteria

1. No inspector panel renders a raw `mXXX-n` ID list as primary evidence; selected-cast and working-set panels show record identity (cards/chips). A copyable technical-ID chip may appear as a de-emphasized detail.
2. Record cards in the inspector show the record's **real** summary/proposition (not `"Reason: …"`); the inclusion/exclusion reason appears as a separate labeled line/badge.
3. Each included/excluded/suppressed/blocked row carries an author-readable deterministic reason; when SPEC-118 has landed, `never_prompt` exclusions render their reason.
4. A "why is this missing?" search returns the deterministic reason a named record was not included.
5. Section-map detail is collapsed by default and renders identity, not bare IDs.
6. `cd tools/manual-story-studio && npm --prefix web test` passes; `npm run test:backend` passes for the payload-enrichment test; full `npm test` green.

## 7. Test plan

- Web typecheck: `cd tools/manual-story-studio && npm --prefix web test`
- Backend (payload enrichment): `cd tools/manual-story-studio && npm run test:backend`
- Full: `cd tools/manual-story-studio && npm test`
