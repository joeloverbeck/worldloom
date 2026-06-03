# Triage — Manual Story Studio Fourth Iteration

**Date:** 2026-06-02
**Source report:** `reports/manual-story-studio-fourth-iteration.md` (ChatGPT-Pro, produced after the third implementation pass; 47 sections, 997 lines)
**Classification:** tooling-adjacent (`tools/manual-story-studio`; package declares "No LLM, no MCP, no patch engine"; writes only under `worlds/<slug>/manual-stories/`). The parallel-writing-cockpit tie-break routes this here regardless of the `manual-story` record vocabulary.
**Deliverables:** `specs/SPEC-117` … `specs/SPEC-121`, `specs/IMPLEMENTATION-ORDER.md`
**Prior triages:** `docs/triage/2026-06-01-manual-story-studio-second-iteration-triage.md` (SPEC-100…111), `docs/triage/2026-06-02-manual-story-studio-third-iteration-triage.md` (SPEC-112…116, all landed/archived).

## Verification method

ChatGPT-Pro again disclosed (§2) it never cloned the repo — it fetched blobs at SHA `ededf175` (which happens to be the current HEAD merge commit). Per diagnostic-reference discipline every code-state claim was treated as a hypothesis and verified against the live tree via four parallel Explore passes (non-cast schema + translators; post-segment checklist flow; prompt visibility/`must_not_reveal`/IDs/beat-count; inspector + source-browser + vocabulary + segment-repair + recent-segment fallback). **Result: the report's code-state claims verify almost entirely.** Four corrections are recorded as out-of-report findings (C1–C4); they are reframing corrections, not new bugs.

## Delta against prior iterations (lift-condition check)

This is iteration 4. Several proposals re-tread iteration-3 decisions:

| Item | Iter-3 disposition | Lift-condition | Iter-4 resolution |
|---|---|---|---|
| Post-segment workbench | DEFER | "pickers validated in use" (SPEC-112 landed) | **Lifted → SPEC-117.** Checklist defects are design-level and verified, not use-gated. User confirmed reversal (AskUserQuestion). |
| `never_prompt` per-record mode | DECLINED ("redundant with `only_if_pinned`") | "real use proves `only_if_pinned` insufficient" | **Reversed → SPEC-118.** Prior rationale was *incomplete*: `only_if_pinned` still permits pinning→inclusion, and `must_not_reveal` renders the title. Genuine missing primitive. |
| Broad non-cast schema expansion (~30 fields) | DEFER | "real authoring use surfaces concrete gaps" | **Kept deferred (D1).** Report supplies no use evidence. Only the *already-present-but-ignored* fields (`confidence`, `answer_known`) are wired now (A5 → SPEC-118). User kept deferred. |
| Synthetic acceptance test | DEFER (iter-3) / REJECT-standalone (iter-2) | "until feature specs land" | **Lifted → SPEC-121.** Loop features landed; user selected it for this batch. |
| Source-browser button hierarchy | (new framing) | — | **Deferred (D3).** Low-priority polish; user kept deferred. |
| On-disk `current-context.yaml` rename | DECLINED | — | **Confirms prior** — report itself agrees to defer the file rename. |

## Verdicts

### ACCEPT → spec

| ID | Report § | Finding | Verdict basis (verified) | → |
|---|---|---|---|---|
| A1 | §13/14/42, Stage 2 | Replace post-segment checklist modal with a record workbench; remove `last_reviewed_after_segment` | VERIFIED: checklist scans only `refs.characters` (`state-update-checklist.ts:96-102`) while a broader referrer scanner exists for delete (`records.ts:248-291`); review-debt stamped into the prompt working set (`current-context.ts:14-16`). Reverses iter-3 DEFER (lift met + design-level). | **SPEC-117** |
| A2 | §18/39, Stage 4 | Add `never_prompt` per-record visibility | VERIFIED: enum is 3 values (`manual-story.ts:135-138`); `must_not_reveal` renders titles into the prompt (`section-10…:63-71`); `only_if_pinned` permits inclusion. Genuine permanent-suppression gap. | **SPEC-118** |
| A3 | §20/40, Stage 5 | Inspector → confidence cockpit (cards for selected-cast + working-set; real reasons; why-here/why-missing) | VERIFIED + scoped per C4: only those two panels show raw IDs; `ledgerSummary()` fabricates `"Reason: …"` (`PromptPreview.tsx:29-41,284,296`). | **SPEC-119** |
| A4 | §5/11/35, Stage 1 | Lifecycle vocabulary cleanup (archived → inactive) | VERIFIED: user-facing "archived" at `RecordCard.tsx:88`, `Records.tsx:258`, `BeatTemplates.tsx:189`. SPEC-114 fixed logic, left vocabulary. | **SPEC-120** |
| A-test | §28/45, Stage 8 | Synthetic one-real-story acceptance flow (Glass Orchard) | Lift-condition met (loop landed); user selected it. Hermetic, world-agnostic. | **SPEC-121** |

### ACCEPT-WITH-MODIFICATION

| ID | Report § | Finding | Modification | → |
|---|---|---|---|---|
| A5 | §12/36, Stage 3 | Non-cast schema depth | **Split.** Wire the already-defined-but-unemitted fields (`confidence` on belief, `answer_known` on question) into translators now; **defer** the ~30 new fields (D1). | SPEC-118 |
| A6 | §19 | Prompt language | Accept beat default `2-5`→`3-5` (`section-5…:5`) + replace author-facing "machine-state conclusions" (`section-14-stop-rule.ts:7`). Folded into SPEC-118. | SPEC-118 |

### DEFER (lift-conditions)

| ID | Report § | Finding | deferred_to / lift-condition |
|---|---|---|---|
| D1 | §12/36, Stage 3 | Full ~30-field non-cast schema expansion | Until real authoring use names the fields repeatedly reached for. Twice-deferred (iter-2 T5b, iter-3); report supplies no use evidence (ChatGPT-Pro never ran the tool). User kept deferred. |
| D3 | §21/41, Stage 6 | Source-browser primary/secondary creation buttons | Low-priority polish (currently 5 classes in one dropdown, `SourceBrowser.tsx:17-23`); revisit when source-distillation friction is observed. User kept deferred. |

### CONFIRMS-EXISTING-POSITION (no action — verified correct)

| Report § | Finding |
|---|---|
| §6/§8/§9 | Package boundary / no-MCP / no-patch-engine / view-models-not-new-engines — correct; keep. §8's "canon append-only; manual records mutable local truth" matches the iter-3 correction: product-coherence, not a FOUNDATIONS change. |
| §26/§30/§31 | Prose/state hard boundary, write sandbox, Story-Explorer separation — correct. |
| §10/§34 | Storage model + "rename `current-context.yaml` later" — matches the iter-3 decline of the on-disk rename. |

### Out-of-report findings (corrections to ChatGPT-Pro)

| ID | Finding | Disposition |
|---|---|---|
| **C1** | §16/§40 "prompts must never include internal IDs" is **already enforced** — hard-tier `no_internal_record_ids` lint (`lint.ts:207-219`, `INTERNAL_ID_REGEX` `:90`) blocks copy if any `mXXX-n` reaches the prompt markdown. The report conflates inspector-UI ID display with prompt leakage. | No spec for the prompt boundary; only the inspector-UI cosmetic survives → folded into SPEC-119. |
| **C2** | §27 recent-segment "silent null" is **already resolved (SPEC-106)** — loader returns null (`compose.ts:564-602`) but `lint.ts:280-292` fires a hard `recent_segment_required_but_unavailable` finding when `include_recent_segments > 0`. | No action. |
| **C3** | §24/§44 referenced-segment deletion **already blocks by default (SPEC-108)** — `segments.ts:251-280`; only `force=true` bypasses. Only the outcome *name* (`segment_order_removed_files_preserved`) is cosmetic. | No spec; cosmetic-only, not warranted. |
| **C4** | §20 "inspector still raw-ID-heavy" is **partly overstated** — included/excluded/suppressed already render `RecordCard`s (`PromptPreview.tsx:303-351`); only selected-cast (`:284`) + working-set (`:296`) show raw IDs. | Scopes SPEC-119 to the real gap. |

## Deliverable shape

User pre-authorized "create specs in specs/*" + `IMPLEMENTATION-ORDER.md` contingent on the triage verdict. Presenting the triage activated the pre-authorization (HARD-GATE satisfied). Because A1 (workbench) and the D1 portion of schema **reverse iteration-3 user-committed deferrals**, a direction-confirmation `AskUserQuestion` was posed before writing (per the user-decision-reversal exception):

- **Q1 → "Workbench now, schema stays deferred"**: SPEC-117 written; broad schema (D1) kept deferred; only existing-but-ignored fields wired (A5 → SPEC-118).
- **Q2 → "Glass-Orchard acceptance test"** selected (→ SPEC-121); source-browser hierarchy (D3) kept deferred.

Implementation order: SPEC-120 → SPEC-118 → SPEC-119 → SPEC-117 → SPEC-121 (only SPEC-121 has hard prerequisites: SPEC-117 + SPEC-118). See `specs/IMPLEMENTATION-ORDER.md`.

Spec-ID allocation: prior batch ended at SPEC-116 (archived); `specs/` was empty; this batch starts at SPEC-117.

## Named assumptions

1. **Spec granularity:** 5 one-PR-shaped specs. A1/A3/A4 are independent surfaces; A2+A5+A6 bundle as the cohesive prompt-layer spec (SPEC-118); the acceptance flow (SPEC-121) lands last.
2. **D1 schema expansion is deferred, not abandoned** — a follow-up spec lands when real authoring use names recurring field gaps.
3. **C1/C2/C3 generate no specs** — they are already-resolved or cosmetic-only; recorded as corrections to the report.
4. **`never_prompt` is added narrowly** — only that one enum value; the rest of the iter-3-declined five-value rewrite stays declined.
5. **Test/build commands are package-local `npm`** (no pnpm workspace): `npm run test:backend`, `npm --prefix web test`, `npm test` from `tools/manual-story-studio/`. Verified against both `package.json` files.
6. **`current-context.yaml` is NOT renamed on disk** — SPEC-117 removes `last_reviewed_after_segment` but keeps the filename (matches iter-3 decline + report §10/§34 "later").
