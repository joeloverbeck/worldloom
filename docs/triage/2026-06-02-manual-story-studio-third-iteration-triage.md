# Triage — Manual Story Studio Third Iteration

**Date:** 2026-06-02
**Source report:** `reports/manual-story-studio-third-iteration.md` (ChatGPT-Pro, produced after the second implementation pass)
**Classification:** tooling-adjacent (`tools/manual-story-studio`; package declares no LLM, no MCP, no patch engine; writes only under `worlds/<slug>/manual-stories/`)
**Deliverables:** `specs/SPEC-112` … `specs/SPEC-116`, `specs/IMPLEMENTATION-ORDER.md`
**Prior triage:** `docs/triage/2026-06-01-manual-story-studio-second-iteration-triage.md` (produced SPEC-100…SPEC-111, all landed/archived)

## Verification method

ChatGPT-Pro's report admitted (§2) it never verified live `main` — the GitHub connector "behaved inconsistently" and it fetched blob URLs at commit `e22ccd4f` rather than cloning. Per diagnostic-reference discipline, every codebase-state claim was treated as a hypothesis and verified against the actual tree via four parallel Explore passes (schema/lifecycle, prompt compose/lint, web UI, world-browsing/health/segment/sandbox). **Result: the report's structural claims are almost entirely VERIFIED.** Two analytic corrections and one out-of-report finding are recorded below.

## Two corrections to ChatGPT-Pro

1. **§7 "Foundations alignment audit" is overstated.** The report claims the tool "drifts" from FOUNDATIONS via archive/force-delete and engine-grade class spread. This is incorrect: FOUNDATIONS line 105 / §598 / §614 governs *world canon not encoding story-bundle execution state*, and Manual Studio writes only under `manual-stories/` — outside both world canon and the story-bundle `_source/` pipeline. The tool is already correctly outside canon authority; that *is* the alignment, and it is satisfied. The delete/archive-lifecycle problem (accepted as SPEC-114) is real but is a **product-coherence** issue (the "records are mutable current truth" brief), not a canon-integrity violation. SPEC-114 is justified on that basis.

2. **The §14 five-value `prompt_mode` redesign is partly redundant scope-creep.** `pinned_next` duplicates the working-set's existing `pinned_records`; `never_prompt` overlaps `only_if_pinned`. The genuine gaps are explicit *exclude* + explainability. SPEC-113 takes the minimal form (working-set `excluded_records` + inclusion ledger) and declines the per-record enum rewrite.

## Verdicts

### ACCEPT → spec

| Report § | Finding | Verdict basis (verified) | → |
|---|---|---|---|
| §12, §24, §31, Stage 2 | Reference selectors / record pickers replace ID entry | VERIFIED: `EditCurrentContext` IdTextArea, `RecordForm` ChipInput, `CurrentStatePanel` raw-ID chips, `MomentComposer` ID toggles; no combobox exists. Headline "without touching an ID" gap. SPEC-111 hid *display* IDs, never built picker *input* — clean delta. | **SPEC-112** |
| §13, §14, §19, §32, §33, Stages 1/3/4 | Explicit exclude + inclusion ledger + Prompt Preview inspector + UI relabel | VERIFIED: `composePrompt()` returns only `{markdown, lint, sidecar_draft}` (no ledger); PromptPreview is `<pre>` + lint badge + toolbar. Deterministic, no engine. | **SPEC-113** |
| §10, §30, Stage 5 | Delete = block-on-referrer; force-delete/`active:false` repair-only | VERIFIED: normal Delete archives referenced records `active:false` then offers "Force delete anyway." Contradicts "records are mutable current truth" brief. | **SPEC-114** |
| §15, §34, Stage 6 | Read-only world source browser + copy-into-story-record | VERIFIED: world read layer enumerates only slugs with `WORLD_KERNEL.md`; zero `_source/`/char/artifact browsing. "Largest underbuilt area." Read-only direct reads correct (no MCP). | **SPEC-115** |
| §22 | Dependency-scoped health gating + content-policy/prose-craft presence validation | VERIFIED: health blocks all 4 actions on any blocking finding; no validation of compose-required docs. | **SPEC-116** (+ O1) |

### ACCEPT-WITH-MODIFICATION (folded, reduced)

| Report § | Finding | Modification | → |
|---|---|---|---|
| §14 | 5-value per-record `prompt_mode` | Take only working-set `excluded_records` + ledger; **decline** the per-record enum rewrite (redundant with `pinned_records` / `only_if_pinned`). Revisit only if real use proves `only_if_pinned` insufficient. | SPEC-113 |
| §9, §13, Stage 1 | Rename `current-context.yaml` → `prompt-working-set.yaml` | Take the **UI label** reframe ("Current State" → "Prompt Working Set"); **decline** the on-disk file rename + migration shim (churn, zero functional gain, adds coupling to a freely-editable artifact). | SPEC-113 |

### DEFER (with lift-conditions)

| Report § | Finding | deferred_to / lift-condition |
|---|---|---|
| §11 | Schema deepening (belief/emotion/plan/relationship/consequence/clock/secret/question/fact fields) | After SPEC-112/113 land and real use surfaces concrete gaps. Consistent with landed SPEC-109's own deferral and the report's own Stage 9. |
| §17, §35 | Beat-template global library / field demotion | After the core loop is validated (report Stage 9). |
| §24, Stage 7 | Post-segment record workbench (inline-edit, quick-add, side-by-side segment+records) | Follow-up after SPEC-112 pickers + card patterns exist; lift-condition: pickers validated in use. (User declined promoting to a 6th spec in this batch.) |
| §23, Stage 8 | One-real-story browser-like acceptance test | Each feature spec carries its own acceptance criteria; dedicated capstone test spec defers until feature specs land. |

### CONFIRMS-EXISTING-POSITION (no action — verified already correct)

| Report § | Finding |
|---|---|
| §6, §8 | Package boundary / no-MCP / no-patch-engine — verified correct; keep. |
| §20 | Prose/state hard boundary, no auto-extraction, no internal LLM — verified correct. |
| §21 | Segment append-only + manuscript-from-`segment_order`; referenced-segment delete removes-from-order/preserves-files; force-delete repair-log-gated — verified already handled (SPEC-108). |

### Out-of-report findings

| ID | Finding | Disposition |
|---|---|---|
| **O1** | **SECURITY — path traversal / arbitrary file read.** The prompts compose route accepts `included_template_path` as a free-form filesystem path and reads it in `composePrompt()` (`src/server/routes/prompts.ts` → `src/prompt/compose.ts`) **without** `assertInsideSandbox()`, accepting absolute and `..` paths. `{"included_template_path":"/etc/passwd"}` reads any server-readable file into the prompt + sidecar. The report §25 gestured generically ("audit every route so no route takes arbitrary filesystem paths"); this is the concrete vuln. | **SPEC-116**, ordered first. |

## Deliverable shape

User pre-authorized specs + `IMPLEMENTATION-ORDER.md`; confirmed (AskUserQuestion, 2026-06-02) the full 5-spec set and this companion triage record. Post-segment workbench declined as a 6th spec (deferred). Implementation order: SPEC-116 → SPEC-112 → SPEC-113 → SPEC-114 → SPEC-115 (SPEC-112 is the linchpin the others reuse; SPEC-116 is independent and first for the security fix). See `specs/IMPLEMENTATION-ORDER.md`.
