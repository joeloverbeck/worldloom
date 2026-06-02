# Triage — Manual Story Studio Second Iteration Report

**Date:** 2026-06-01
**Source report:** `reports/manual-story-studio-second-iteration.md` (ChatGPT-Pro, 2026-06-01; 31 sections, 1103 lines).
**Triage classification:** tooling-adjacent (`tools/manual-story-studio` explicitly disclaims `No LLM, no MCP, no patch engine`; no canon-pipeline integration).
**Deliverables produced:** SPEC-105 through SPEC-111 (7 specs) + `specs/IMPLEMENTATION-ORDER.md` + this companion triage file.

---

## Lead

The source report is a critical audit of the first Manual Story Studio implementation (the SPEC-100–SPEC-104 cohort, now archived). Its verdict — "strong scaffold, not the right final tool yet" — is well-founded: package boundary, deterministic prompt composition, write sandbox, and cast profile model survive; state-integrity, prompt-leakage, prose/state contract, segment lifecycle, current-context layer, beat-template authoring depth, and UX cockpit consolidation need work. The report's 10-stage implementation strategy (§31) is mostly sound but over-broad in two places (Stage 6 schema deepening, Stage 9 standalone test-layer spec); the present triage accepts 7 of the 10 stages as scoped specs and defers / re-folds the rest.

Verification anchor (against the live tree at `876463c9`):

- `readManualStoryMetadata` returns `null` on missing/malformed/parse failure (`tools/manual-story-studio/src/read/manual-story-metadata.ts:8-21`).
- `listRecords` silently skips parse failures (`tools/manual-story-studio/src/read/records.ts:32-43`).
- `readRecord` returns `null` for invalid ID / missing file / parse failure (`records.ts:50-69`).
- Prompt lint splits leakage rules into a `soft` tier with copy-anyway override (`tools/manual-story-studio/src/prompt/lint.ts:5-15`).
- `docs/manual-story-studio/prose-craft-contract.md:68` carries the "should not narrate state changes that have not happened in the record store yet" wording the report flags as neutering.
- `docs/manual-story-studio/manual-render-instruction.md` is missing despite the README claim.
- `scripts/build-all.sh` and `scripts/check-all.sh` make no reference to `manual-story-studio` (verified by grep).
- Frontend silent error swallowing: 7× `.catch(() => {})` across Dashboard.tsx + MomentComposer.tsx.
- `deleteSegment` exposes three distinct outcomes (`hard_deleted` / `force_deleted` / `segment_order_removed_files_preserved`) plus `editSegment` — over-rich lifecycle (`tools/manual-story-studio/src/write/segments.ts:60-78, 129-188, 190-246`).
- World-index excludes `manual-stories` at `tools/world-index/src/enumerate.ts:120`.
- All MSSUX-* tickets are archived; `specs/` was empty before this batch.

The report's repository-access caveat (§2 — GitHub connector mis-resolved `joeloverbeck/worldloom` as `joeloverbeck/one-more-branch`) is acknowledged; all claims taken from the report were re-verified against the live tree before triaging.

---

## Per-finding verdicts

Identifiers are local to this triage. `T<N>` for triage items derived from the report; `O<N>` for out-of-report findings discovered during verification.

### ACCEPT (foundational fixes — each spawns a focused spec)

#### T1 — Fail-fast state integrity

**Verdict:** ACCEPT.
**Source:** report §§5 / 16 / 31 Stage 1.
**Rationale:** Verified silent-null read layer + 7× silent frontend catches. Foundations Rule 6 (No Silent Retcons) and §Core Principle frame silence-as-absence as a discipline failure; Manual Studio's read layer applies the same discipline to local truth. The cockpit cannot distinguish "no records exist" from "all records malformed" without a structured health surface.
**Deliverable:** `archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md`. Adds `/health` endpoint with structured findings; replaces silent-null returns with a `ReadResult<T>` discriminated union; replaces frontend `.catch(() => {})` with surfaced errors; adds `tools/manual-story-studio` to `scripts/build-all.sh` and `scripts/check-all.sh` (T10 bundled).
**Modification scope:** Bundles T10 (`build-all.sh` / `check-all.sh` inclusion) — "local all-green covers Manual Studio" is integrity discipline, not a separate concern.

#### T2 — Prompt leakage hard-tier promotion

**Verdict:** ACCEPT.
**Source:** report §§5 / 13 / 22 / 26 / 31 Stage 2.
**Rationale:** Verified four leakage rules emit at `soft` tier (`lint.ts:211, 230, 248, 265`) with a `lint_override` "copy anyway" path in `PromptPreview.tsx:94-112`. For an external-LLM cockpit, OWASP LLM01 (prompt injection) / LLM08 (excessive agency) treat internal-ID/jargon leakage as exactly the surface that must be denied, not warned about. FOUNDATIONS §Tooling Recommendation's least-agency posture maps directly to the prompt boundary.
**Deliverable:** `archive/specs/SPEC-106-manual-story-studio-prompt-leakage-hard-tier.md`. Promotes 4 leakage rules to hard tier; removes the lint_override path; adds `recent_segment_required_but_unavailable` rule when `include_recent_segments > 0`.
**Modification scope:** Keep length/weak-directive/too-many-records as `soft` (quality, not safety); promote only the four leakage rules. Quality-warning rules land alongside SPEC-111's cockpit UX.

#### T3 — Prose/state contract correction

**Verdict:** ACCEPT.
**Source:** report §§14 / 21 / 26 / 31 Stage 3.
**Rationale:** Verified `prose-craft-contract.md:68` reads "the prose should not narrate state changes that have not happened in the record store yet" — this neuters the LLM's ability to render meaningful turns, which defeats the cockpit. The correct boundary (per the report §14): LLM may write prose where something meaningfully happens; app must not infer state from prose. Stop rule at `section-14-stop-rule.ts:4` is directionally right but too vague; report §26 wording is sharper. README's missing `manual-render-instruction.md` claim resolves via "fewer docs, not more" (report §21).
**Deliverable:** `archive/specs/SPEC-107-manual-story-studio-prose-state-contract-correction.md`. Revises the contract paragraph; replaces the stop-rule string; removes the README claim.
**Modification scope:** Bundles T11 (manual-render-instruction.md mismatch) — "fewer docs" applies to the same surface.

#### T4 — Segment lifecycle append-only by default

**Verdict:** ACCEPT WITH MODIFICATION.
**Source:** report §§5 / 15 / 31 Stage 4.
**Rationale:** Verified three delete modes + `editSegment` in `tools/manual-story-studio/src/write/segments.ts`. The report's instinct is correct — append-only matches the writer's cockpit model. But removing the code paths outright would (a) regress existing tests, (b) eliminate the legitimate corrupted-file repair path, (c) preclude the "replace latest accepted segment" workflow the report itself acknowledges as legitimate.
**Deliverable:** `specs/SPEC-108-manual-story-studio-segment-lifecycle-append-only.md`. Gates `editSegment`/`deleteSegment` behind explicit `mode=repair` route flag; introduces a dedicated repair-mode UI page with a warning banner; adds client-side `discardBeforeSave` path. Code paths preserved, primary UX append-only.
**Modification scope:** *Gate* don't *delete*; preserve repair-mode escape valve. The "state-review-marked-complete" precondition the report §15 names depends on SPEC-109's state-review tracking surface, now landed in `archive/specs/SPEC-109-manual-story-studio-current-context-layer.md`.

#### T5a — Current-context selector layer

**Verdict:** ACCEPT.
**Source:** report §§9 / 13 / 18 / 24 / 29 / 31 Stage 5.
**Rationale:** The composer's importance/centrality heuristics over the full record corpus produce a selection but not the *current* selection. An explicit `current-context.yaml` selector (current location, POV holder, current cast, active pressure clocks, active secrets, pinned records, must-not-reveal, current handoff summary, last-accepted-segment, last-reviewed-after-segment) is qualitatively better and unblocks both the dashboard cockpit and SPEC-108's `force_replace` precondition.
**Deliverable:** `archive/specs/SPEC-109-manual-story-studio-current-context-layer.md`. Adds the schema, read/write/validate paths, GET/PUT routes, prompt composer plumbing (additive — heuristic fallback when context absent), and Dashboard + Edit Current Context UI.

#### T6 — Beat template pressure/turn card fields

**Verdict:** ACCEPT WITH MODIFICATION.
**Source:** report §§11 / 12 / 27 / 31 Stage 7.
**Rationale:** Verified current `BeatTemplate` schema lacks explicit pressure-type / turn-type axes; rich on classification/constraint, thin on pressure semantics. Adding the seven proposed fields deepens authoring without importing storylet engine effects (the report correctly resists SLT predicate DSL).
**Deliverable:** `specs/SPEC-110-manual-story-studio-beat-template-pressure-turn-fields.md`. Adds 7 fields with closed-enum types where applicable; migrates existing fixtures with a one-shot script; extends filter "why" rendering.
**Modification scope:** Drop `cooldown_segments` — the report itself classifies it as "advisory only", and `recent_template_advisory_window` already provides story-level cooldown. YAGNI under brainstorm Guardrails.

#### T7 — UX cockpit consolidation (load-bearing pieces only)

**Verdict:** ACCEPT WITH MODIFICATION.
**Source:** report §§18 / 29 / 31 Stage 8.
**Rationale:** Verified one-link nav at `App.tsx:37-41` + ID-leaking dashboard + absent unsaved-change handling. The full single-cockpit-page rewrite is scope-large; the load-bearing pieces are health banner persistence + sibling-page nav + ID hiding + unsaved-change handling.
**Deliverable:** `specs/SPEC-111-manual-story-studio-ux-cockpit-pieces.md`. Ships the four load-bearing pieces; defers keyboard shortcuts, `/` quick-search, and the full single-page cockpit to a follow-up spec when the foundational pieces validate in use.
**Modification scope:** Bundles T_dashboard_IDs (report §5) under the ID-hiding piece; bundles T7's MSSUX-006 sibling-nav into the systematic `StoryPageNav` component.

### DEFER (real concerns; not now)

#### T5b — Schema deepening (relationship, emotion, belief, plan, clock, secret, question, consequence)

**Verdict:** DEFER.
**Source:** report §§9 / 25 / 31 Stage 6.
**Deferred to:** a follow-up spec after archived SPEC-109 (current-context) and the author's first round of cockpit use surface concrete schema gaps.
**Rationale:** The report itself orders schema deepening *after* current-context. Adding all 8 class-specific field expansions now would couple SPEC-109 to a much larger surface. Once SPEC-109 forces the author to confront "what matters now", the right schema shape becomes clearer.
**Reversal condition:** if SPEC-109's first round of cockpit use surfaces concrete schema gaps the author hits repeatedly, file a follow-up spec capturing those.

#### T9 — Optional world-canon import

**Verdict:** DEFER.
**Source:** report §31 Stage 10.
**Deferred to:** a future iteration after the cockpit loop and integrity are solid.
**Rationale:** The report itself explicitly defers this to "after cockpit loop and integrity are solid." Not a fix; a new capability. Adding it before the foundational fixes settle would amplify any unaddressed integrity bug across the new import surface.

### REJECT (real proposals; not warranted)

#### T8 — Acceptance test layer as standalone spec

**Verdict:** REJECT as standalone.
**Source:** report §§17 / 31 Stage 9.
**Alternative path:** Each accept-spec carries its own acceptance tests in its §7 Acceptance Criteria section. Existing capstone tests cover the architectural surface; per-feature acceptance belongs with the feature spec. A standalone "test-layer" spec without specific feature scope would be a tooling-infrastructure spec, not a Manual Studio spec. The web-acceptance-harness recommendation (browser-like tests) IS warranted but is a follow-up tooling concern, not blocking.

#### T12 — Lowercase ID rename (`seg-1` instead of `SEG-1`)

**Verdict:** REJECT.
**Source:** report §§15 / 30.
**Alternative path:** SPEC-111's ID hiding from primary UI addresses the visibility concern; lowercase rename across every test, sidecar, and order array is cosmetic churn the report itself acknowledges as optional ("uppercase is acceptable if hidden"). Pure churn without functional benefit.

#### T13 — Same-basename sidecars (collapse `prompts/PROMPT-*.md` + `prompt-runs/PROMPT-*.yaml`)

**Verdict:** REJECT.
**Source:** report §8.
**Alternative path:** Current split works; tests assume the split; no functional benefit to collapsing. Pure layout-style preference.

#### T14 — Move beat templates from `records/beat-templates/` to `templates/`

**Verdict:** REJECT.
**Source:** report §§8 / 30.
**Alternative path:** The report itself says "Keeping them under records is simpler but conceptually muddier." Conceptual muddiness alone does not justify migration churn. SPEC-111's ID hiding from primary UI addresses the naming-visibility concern indirectly.

### OUT-OF-REPORT FINDINGS

#### O1 — All MSSUX-* tickets are archived

**Source:** verified during exploration (`tickets/` contains only `README.md` and `_TEMPLATE.md`; `archive/tickets/` contains MSSUX-001 through MSSUX-006 plus MSSUX004STOCONEDI-001/-002).
**Significance:** the report's framing implies in-progress UX work; in practice the current backlog is empty. The seven specs in this batch form the next implementation push from a clean slate.
**Action:** no deliverable change; reframing clarification only.

#### O2 — `specs/` was empty before this batch

**Source:** verified during exploration.
**Significance:** these are the first new specs since archive/SPEC-104. ID allocation starts at SPEC-105.
**Action:** the new `specs/IMPLEMENTATION-ORDER.md` is the first such file under `specs/` since prior batches' files were archived. The companion implementation-order file pattern continues.

#### O3 — Bundled subordinate findings

The following report sub-findings did not get a top-level T<N> identifier because they bundled into a parent accept:

- T10 `build-all.sh` / `check-all.sh` exclusion (report §§7 / 17) → bundled into SPEC-105.
- T11 `manual-render-instruction.md` mismatch (report §21) → bundled into SPEC-107 via the "fewer docs, not more" path.
- Dashboard exposes IDs (report §5) → bundled into SPEC-111's ID-hiding piece.
- Health endpoint API addition (report §16) → core of SPEC-105.
- Frontend `.catch(() => {})` pattern (report §5) → core of SPEC-105 backend hygiene + SPEC-111 frontend hygiene.

---

## Deliverable summary

| Deliverable | Path | Purpose |
|---|---|---|
| SPEC-105 | `archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md` | Integrity foundation; `/health` endpoint; typed-error reads; build-script inclusion |
| SPEC-106 | `archive/specs/SPEC-106-manual-story-studio-prompt-leakage-hard-tier.md` | 4 leakage rules to hard tier; remove copy-anyway override |
| SPEC-107 | `archive/specs/SPEC-107-manual-story-studio-prose-state-contract-correction.md` | Contract paragraph + stop rule + missing-doc cleanup |
| SPEC-108 | `specs/SPEC-108-manual-story-studio-segment-lifecycle-append-only.md` | Append-only primary UX; `mode=repair` gate on lifecycle ops |
| SPEC-109 | `archive/specs/SPEC-109-manual-story-studio-current-context-layer.md` | `current-context.yaml` selector; composer + Dashboard plumbing |
| SPEC-110 | `specs/SPEC-110-manual-story-studio-beat-template-pressure-turn-fields.md` | 7 new fields on BeatTemplate schema |
| SPEC-111 | `specs/SPEC-111-manual-story-studio-ux-cockpit-pieces.md` | Health banner persistence + sibling nav + ID hiding + unsaved-change hook |
| Implementation order | `specs/IMPLEMENTATION-ORDER.md` | Dependency graph + recommended landing waves |
| This triage | `docs/triage/2026-06-01-manual-story-studio-second-iteration-triage.md` | Verdict + rationale per finding |

---

## Named assumptions

The deliverables ship under these assumptions, surfaced explicitly so the author can redirect before implementation begins:

1. **Spec granularity:** 7 one-PR-shaped specs (chosen via `AskUserQuestion` at triage time over 4-bundled and 3-broad alternatives). If the team prefers fewer/larger specs after seeing the seven drafts, bundling can happen at implementation-PR time.
2. **Stage 6 schema deepening is deferred, not abandoned.** A follow-up spec lands when SPEC-109 surfaces concrete schema gaps.
3. **Stage 9 acceptance-test-layer is rejected as standalone.** Each spec carries its own acceptance criteria; a separate web-acceptance-harness tooling spec can land later as pure tooling work if browser-like tests become demand-driven.
4. **Stage 10 world-canon import is deferred until after the cockpit loop is solid.** No specific date; reversible when the author decides import is the next priority.
5. **Lowercase ID rename, sidecar-pairing collapse, and beat-template directory move are rejected.** If the author disagrees, any of the three can be re-raised as a focused spec; the rejection rationale (churn without functional benefit) remains documented here.
6. **SPEC-105 is the hard prerequisite for SPEC-108 / SPEC-109 / SPEC-110 / SPEC-111.** The dependency is on the `ReadResult<T>` discriminated union and the `/health` endpoint scaffold; implementing the dependents without SPEC-105 first would mean shipping silent-null-tolerant downstream code that immediately needs rework.
7. **SPEC-106 and SPEC-107 are fully independent.** They can land in parallel with SPEC-105 or with each other without coordination.
8. **`docs/manual-story-studio/manual-render-instruction.md` will NOT be created.** SPEC-107 removes the README claim instead. If the author later decides the render-time-instruction surface is warranted, it can be added as a focused doc spec; the present triage takes the "fewer docs, not more" position.

---

## Triage process notes

- **Pre-authorization satisfied the HARD-GATE:** the user's initial request ("If changes aligned with docs/FOUNDATIONS.md are warranted, create specs in specs/*") contingently authorized the deliverable. Presenting the triage recommendation activated that pre-authorization. The `AskUserQuestion` on spec granularity (7 / 4 / 3) was added because the 7-spec count is a material-deliverable-shape choice and the user had asked for critical reassessment, not because pre-authorization was insufficient.
- **Classification:** tooling-adjacent per the brainstorm parallel-writing-cockpit tie-break — `tools/manual-story-studio/package.json` explicitly disclaims `No LLM, no MCP, no patch engine`. The brainstorm skill's worked-precedent in that tie-break names this exact package, so the routing is unambiguous.
- **FOUNDATIONS read:** carried out because the user's request explicitly conditions deliverable creation on FOUNDATIONS alignment, even though tooling-adjacent optional. Each spec's §5 Alignment table is included for discipline.
- **All 7 specs' acceptance criteria carry concrete verification mechanisms** (grep assertions on file contents, fixture-based acceptance tests, route-status assertions, schema-validation rejection tests). No "verify manually" gates on the load-bearing claims.
