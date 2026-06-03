# Triage — Manual Story Studio Fifth Iteration

**Date:** 2026-06-03
**Source report:** `reports/manual-story-studio-fifth-iteration.md` (ChatGPT-Pro, produced after the fourth implementation pass; 38 sections, 936 lines, with a 7-item priority list + 7-stage staged strategy).
**Classification:** tooling-adjacent (`tools/manual-story-studio`; package declares "No LLM, no MCP, no patch engine"; writes only under `worlds/<slug>/manual-stories/`). The parallel-writing-cockpit tie-break routes this here regardless of the `manual-story` record vocabulary.
**Deliverables:** `archive/specs/SPEC-122-manual-story-studio-post-segment-prose-state-boundary.md`, `archive/specs/SPEC-123-manual-story-studio-prompt-working-set-rename.md`, `archive/specs/SPEC-124-manual-story-studio-source-browser-narrowing.md`, `archive/specs/IMPLEMENTATION-ORDER-2026-06-03-2.md`.
**Prior triages:** `docs/triage/2026-06-01-…-second-iteration-triage.md` (SPEC-100…111), `docs/triage/2026-06-02-…-third-iteration-triage.md` (SPEC-112…116), `docs/triage/2026-06-02-…-fourth-iteration-triage.md` (SPEC-117…121). All prior specs landed/archived; `specs/` was empty before this batch.

## Verification method

ChatGPT-Pro again disclosed (§2) it never cloned the repo — it worked from an uploaded manifest + exact-blob fetches at SHA `ed6e2ab8`, with explicit uncertainty that `main` resolves to that SHA. Per diagnostic-reference discipline, every code-state claim was treated as a hypothesis and verified against the live tree via **four parallel Explore passes** (post-segment workbench; prompt layer + inspector; source-browser + nav + paste-prose + `current-context` rename scope; non-cast translators + schema + cards + picker). **Result: the verifiable claims hold almost entirely — but the report's *big* proposals re-tread multiply-deferred decisions, and three of its complaints are already-resolved by SPEC-117/119/120.**

## Delta against prior iterations (lift-condition check)

This is iteration 5. The report's headline priorities map onto prior decisions:

| Item | Prior disposition | Lift-condition | Iter-5 resolution |
|---|---|---|---|
| `current-context` → `prompt-working-set` **on-disk** rename | DECLINED iter-3 ("churn, adds coupling to editable artifact"); confirmed-defer iter-4 (report itself agreed) | — (no shim ⇒ coupling objection gone) | **Lifted → SPEC-123.** Reframed as a clean break (no shim; no on-disk data to migrate; the half-rename split-brain *is* the smell). User confirmed reversal via `AskUserQuestion`. |
| Broad non-cast schema + translator enrichment (~30 fields) | DEFER iter-2 (T5b), iter-3, iter-4 (D1) | "real authoring use names recurring field gaps" | **Kept deferred (D-schema) — FOURTH deferral.** Report supplies no use evidence (ChatGPT-Pro never ran the tool). Thrice-prior-unmet lift is stronger evidence to keep deferring. |
| Source-browser creation narrowing | DEFER iter-4 (D3) | "when source-distillation friction is observed" | **Lifted → SPEC-124.** User confirmed via `AskUserQuestion` they hit the friction in real use. |
| Full Writing Cockpit | DEFER iter-2 (SPEC-111 shipped load-bearing pieces only) | "foundational pieces validate in use" | **Kept deferred (D-cockpit).** Author hasn't run a real linear story; lift unmet. |
| Browser-like E2E tests | REJECT-standalone iter-2; DEFER iter-3; backend capstone landed iter-4 (SPEC-121) | demand-driven | **Kept deferred (D-e2e).** No browser harness; follow-up tooling. |

## Verdicts

### ACCEPT → spec

| ID | Report § | Finding | Verdict basis (verified) | → |
|---|---|---|---|---|
| **R1** | §1.3/§5/§13/§17/§24/§35 | Remove post-segment prose-seeding (`summary = last_paragraph`, `details = full body`). | VERIFIED `PostSegmentWorkbench.tsx:95-108` + `post-segment-workbench.ts:63-68,202`. Prose→record inference; tensions FOUNDATIONS §Tooling Recommendation + prose/state boundary. Regression introduced by SPEC-117. | **SPEC-122** |
| **R2** | §17/§35 | `touched_records` → `linked_record_candidates`; UI heading + reason lines; cards not raw IDs in segment meta. | VERIFIED payload key `:206`, heading `:351-352`, raw `.join(", ")` IDs `:334-345`. "Touched" implies inferred prose effects; the scan is link-derived. | **SPEC-122** |
| **R10** | §7/§24 | Paste Prose placeholder "Paste or draft…" → "Paste accepted prose". | VERIFIED `PasteProse.tsx:115`. Boundary-clarity; same prose-acceptance surface. | **SPEC-122** |
| **R3** | §1.1/§14/§30 | Full `current-context` → `prompt-working-set` rename (storage/schema/API/type/fns/routes). | VERIFIED half-renamed split (UI vs code); 35 files, mechanical; **no on-disk `current-context.yaml` to migrate**. Lifts prior deferral (clean break, no shim). User-confirmed reversal. | **SPEC-123** |
| **R7** | §1.2/§9/§34 | Narrow source-derived creation to Cast + Fact; remove Belief; Location/Object → advanced note path. | VERIFIED 5-class dropdown `SourceBrowser.tsx:17-23`. Lifts iter-4 D3; user confirmed real friction. | **SPEC-124** |

### DEFER (lift-conditions unmet — no new use evidence)

| ID | Report § | Finding | deferred_to / lift-condition |
|---|---|---|---|
| **D-schema** | §1.5/§12/§31 | Broad non-cast schema + translator enrichment. | VERIFIED schemas thin (3 fields each) + translators shallow (2–9 fields). **Fourth deferral.** Until real authoring use names recurring field gaps; ChatGPT-Pro never ran the tool. |
| **D-cockpit** | §8/§29, Stage 2 | Single Writing Cockpit route (report centerpiece). | Deferred since iter-2; lift = foundational pieces validate in real-story use. Large speculative rewrite. |
| **D-brief** | §1.4/§13/§32 | Two-layer writer-facing brief renderer. | PARTIALLY-TRUE (no renderer exists; current prompt is hybrid — §13 prose-craft is already writer-facing). Lift = a concrete brief-quality failure surfaced in real-story use. |
| **D-e2e** | §37 | Browser-like end-to-end UX tests. | No browser harness; demand-driven follow-up tooling. Backend Glass-Orchard already landed (SPEC-121). |
| **D-scale** | §10 | Source-browser grouping/snippets/lazy backend. | Frontend already lazy-loads detail on selection (verified). Premature for one small world (YAGNI). |
| **D-misc** | §15/§20/§21/§22/§36 | Bloat-meter; quick-edit-card + drawer rewrite; manuscript tweaks; segment-repair outcome renames; selector/editing rewrite. | No observed pain; bundles with deferred cockpit/record-UX vision. §22 matches iter-4 C3 (cosmetic-only). |

### REFUTED-BY-VERIFICATION / ALREADY-RESOLVED (report items, no warranted action)

| ID | Report § | Finding | Disposition |
|---|---|---|---|
| **R11-core** | §16 | "PromptPreview leads with raw prompt; confidence is an aside." | **REFUTED.** SPEC-119 made the inspector a co-equal confidence cockpit (`PromptPreview.tsx:248-453`, two-column grid, lint badge + 7 panels). Only the brittle exact-title "Why is this missing?" lookup survives (R11-sub) — **skipped at user request** with R6/R16. |
| **R12** | §18 | "Remove checklist UX if any remains." | **ALREADY-RESOLVED.** SPEC-117 replaced the checklist with the workbench and removed `last_reviewed_after_segment`. |
| **R13** | §11 | Lifecycle vocabulary (Current/Hidden, "Still used by", no archive/supersede). | **ALREADY-RESOLVED.** SPEC-120 (archived → inactive). The report's recommendations match landed state. |
| **R20** | §19 | Author-first cards with tiny IDs. | **ALREADY mostly done.** `RecordCard.tsx` shows title/ID/class/visibility/cast/summary/reason/tags (SPEC-111/112/119). Residual raw-ID display is the post-segment surface, covered by R2. |

### CONFIRMS-EXISTING-POSITION (verified correct — keep)

| Report § | Finding |
|---|---|
| §6/§26/§30 | Package boundary (no LLM/MCP/patch-engine), prose/state hard boundary, write sandbox — verified correct; keep. |
| §27 | Keep Story Explorer separate (no shared write surfaces) — correct. |
| §28 | Stay deterministic + file-transparent; external-LLM-outside-app is a strength — correct. |

### Skipped at user request (this batch)

| ID | Report § | Finding | Disposition |
|---|---|---|---|
| **R6** | §1.6/§23 | Demote Beat Templates + Repair out of primary nav. | VERIFIED flat peer nav (`StoryPageNav.tsx:5-19`). Legitimate, minor; user chose to skip the polish bundle for now. |
| **R11-sub** | §16 | Fuzzy "Why is this missing?" lookup (currently exact-title `===`, `PromptPreview.tsx:223-244`). | VERIFIED brittle; minor; skipped with the bundle. |
| **R16** | §19/§36 | RecordPicker `aria-activedescendant` (combobox/listbox + keyboard already present). | VERIFIED gap; small a11y fix; skipped with the bundle. |

## Deliverable shape

User pre-authorized "create specs in specs/*" + `IMPLEMENTATION-ORDER.md` contingent on the triage verdict. Presenting the triage activated the pre-authorization (HARD-GATE satisfied). Because (a) R3 reverses a twice-deferred decision, (b) R7's lift-condition turns on user-only-observable friction, and (c) the answers changed the spec count (1 → 3), a composite `AskUserQuestion` (3 questions) was posed before writing — satisfying both the user-decision-reversal gate and the material-deliverable-shape fork at once:

- **Q1 → "Write the rename spec"**: SPEC-123 written.
- **Q2 → "Yes — narrow it (I hit this)"**: SPEC-124 written.
- **Q3 → "Skip for now"**: minor-UX-polish bundle (R6/R11-sub/R16) not written.

SPEC-122 was written unconditionally (the one clearly-warranted, FOUNDATIONS-aligned, verified-regression fix).

Implementation order: SPEC-123 → SPEC-122 → SPEC-124 (all independent / disjoint file sets; the order is a tidiness preference, not a hard dependency). See `archive/specs/IMPLEMENTATION-ORDER-2026-06-03-2.md`.

Spec-ID allocation: prior batch ended at SPEC-121 (archived); `specs/` was empty; this batch starts at SPEC-122.

## Named assumptions

1. **Spec granularity:** 3 one-PR-shaped specs on disjoint surfaces (post-segment / rename / source-browser).
2. **SPEC-123 is a rename only** — speculative new working-set fields and `active_secrets_questions` → `active_reveal_controls` are deferred; only `current_handoff_summary` → `handoff_summary` is taken.
3. **SPEC-123 has no on-disk migration** — no `current-context.yaml` exists under `worlds/*/manual-stories/` (verified); the clean break loses no data; historical doc/triage references to `current-context` are intentionally NOT renamed.
4. **D-schema is deferred, not abandoned** — a follow-up spec lands when real authoring use names recurring field gaps. This is the fourth deferral; the chain is load-bearing.
5. **Test/build commands are package-local `npm`** (no pnpm workspace): `npm run test:backend`, `npm --prefix web test`, `npm test` from `tools/manual-story-studio/`. Verified against both `package.json` files (no `typecheck` script — web `test` is the typecheck).
6. **R11-core / R12 / R13 / R20 generate no specs** — already-resolved or refuted by verification; recorded as corrections to the report.
