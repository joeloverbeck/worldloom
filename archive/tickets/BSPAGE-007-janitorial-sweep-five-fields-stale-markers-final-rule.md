# BSPAGE-007: Janitorial sweep — "five fields" off-by-one, stale `(NEW)` / `(post-PROSESPLIT-007)` markers, Final Rule paraphrase

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — documentation cleanup across `.claude/skills/branching-story-page-cycle/`.
**Deps**: None.

## Problem

Three LOW-severity audit findings bundled as one janitorial sweep. Each is independently minor; bundling avoids ticket noise. Parallels the bootstrap janitorial sweep fixed by **BSBOOT-029** (archived).

### F-06 — Off-by-one in §18 field count

`references/phase-7-page-plan.md:148` reads `"§18 Scene direction — AUTHOR-WRITTEN five fields:"` then lists six (ENTRY PRESSURE, SCENE QUESTION, VALUE DELTA TARGET, REQUIRED TURN, STOPPING POINT, DO NOT REVEAL). The canonical shared template at `.claude/skills/_shared-templates/page-plan.md:198` authoritatively states `"AUTHOR-WRITTEN, not record-inlined. Six fields:"`. Page-cycle's reference contradicts the canonical template.

### F-07 — Stale `(NEW)` and rework-marker annotations

Multiple sites carry annotations from the PROSESPLIT-007 / PROSESPLIT-002 reworks that have shipped (both tickets are in `archive/tickets/`). These markers convey nothing operational to a reader of the current contract and imply the content is still in flux:

- `references/phase-9-validation-gates.md:5` — `"Post-PROSESPLIT-007, three gates are split..."`
- `references/phase-9-validation-gates.md:26` — `"| 18 | plan_completeness_check (NEW) |"` (the `(NEW)` marker)
- `references/governance-and-foundations.md:17` — `"Prose Renderer is NOT a page-cycle role post-PROSESPLIT-007"`
- `references/pre-flight-and-prerequisites.md:55` — `"ARCTRACE-NNNN is NOT pre-allocated at page-cycle pre-flight post-PROSESPLIT-007"`
- `references/record-schemas.md:104` — `"Post-PROSESPLIT-007, page-cycle always sets arc_trace_emitted: false at plan-commit"`
- `references/phase-7-6-arc-trace-extraction.md:3` — `"Post-PROSESPLIT-007, Phase 7.6 at plan-commit runs ONLY Layer 1..."`
- `references/phase-7-6-arc-trace-extraction.md:52` — `"Post-rework, page-cycle DOES NOT emit ARC_TRACE"` (the `Post-rework` qualifier)
- `references/phase-7-page-plan.md:183` — `"The new schema fields (per PROSESPLIT-002) carry the plan-vs-prose split"`

Recommendation: rewrite each affected sentence to state the current contract in plain prose without the `(NEW)` / `post-<TICKET>` qualifier. The contract is permanent now; the rework is historical.

### F-08 — Final Rule paraphrases Phase 7 / Phase 7.6 / Phase 9 gate routing

`SKILL.md:487-491` reads:

> A page is not a passage of prose. It is a transaction against narrative state — it must change at least one of: a fact, an obligation's status, a thread's pressure, a character's intention, a relationship, the cast (entry / exit / death), or the location. If a page changes none of these, it is filler — and the engine MUST reject it at Phase 7 plan-completeness check, at Phase 7.6 Layer 1 deterministic check, at Phase 9 gate 12 (consequence persistence), or at gate 4 (snapshot-replay equality). The plan is authored at Phase 7; the prose is finalized externally and merged via `branching-story-page-prose-finalize`. Pages that change state are the only currency the branching-story system trades in. Choices that don't lead to such pages are fake agency, and the runtime exists precisely to make agency structural rather than aspirational.

The middle sentence paraphrases the routing already documented in the HARD-GATE block and Phase 9 gate table. The prior bootstrap audit explicitly **dismissed** the analogous bootstrap Final Rule (M4) as cosmetic. This sub-finding is included here for parity decision: the recommendation is **dismiss (parity with bootstrap)** unless the user wants the philosophical close trimmed to its first and last sentences.

## Assumption Reassessment (2026-05-11)

1. F-06: `references/phase-7-page-plan.md:148` says `"five fields"`; the six fields are enumerated immediately below. Confirmed by direct read.
2. F-06: Canonical template `.claude/skills/_shared-templates/page-plan.md:198` says `"Six fields"`. Confirmed by direct read.
3. F-07: Stale `(NEW)` / `(post-PROSESPLIT-007)` / `(per PROSESPLIT-002)` annotations appear at the 8 sites enumerated above. Confirmed by `grep -n "(NEW)\|post-PROSESPLIT\|per PROSESPLIT" .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-page-cycle/references/*.md`.
4. F-07: PROSESPLIT-002 and PROSESPLIT-007 are in `archive/tickets/` (verified by `find tickets archive/tickets -name "PROSESPLIT-*"`). Both reworks have shipped.
5. F-08: `SKILL.md:487-491` Final Rule paraphrases routing from `SKILL.md:48,184,311` and `references/phase-9-validation-gates.md`. Confirmed by direct read.
6. Shared boundary: all three sub-findings are page-cycle-internal documentation; no sibling skill citations affected.
7. Bootstrap parallel: BSBOOT-029 (archived) addressed the bootstrap-side equivalents — same "five fields" off-by-one + same stale annotations + same Final Rule sub-finding dismissal. Confirmed by reading `docs/triage/2026-05-11-bootstrap-skill-audit-triage.md`.
8. Mismatch + correction: F-06 is a typo (replace `five` → `six` on one line); F-07 is annotation strip across 8 sites; F-08 is parity dismissal (no edit) by default.

## Architecture Check

1. The sweep aligns the page-cycle surface to the same standard as the bootstrap surface (post-BSBOOT-029).
2. No backwards-compatibility aliasing introduced. Stale markers carry no contractual weight; removing them does not change semantics.

## Verification Layers

1. F-06: `grep -c "five fields" .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` returns `0` post-edit; `grep -c "six fields\|Six fields" .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` returns ≥1 → codebase grep-proof.
2. F-07: `grep -c "(NEW)" .claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` returns `0` post-edit → codebase grep-proof.
3. F-07: `grep -rn "post-PROSESPLIT\|per PROSESPLIT" .claude/skills/branching-story-page-cycle/` returns `0` matches post-edit → codebase grep-proof. (Each affected sentence rewritten to state the current contract without the rework qualifier.)
4. F-08 (if dismiss): no edit; rationale recorded in commit message that closes this ticket.
5. F-08 (if act): `SKILL.md:487-491` reduced to the philosophical first + last sentences only; manual review confirms the trim preserves the close's rhetorical purpose.

## What to Change

### 1. F-06: Fix `"five fields"` typo

`.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md:148`: change

```
- §18 Scene direction — AUTHOR-WRITTEN five fields:
```

to:

```
- §18 Scene direction — AUTHOR-WRITTEN six fields:
```

### 2. F-07: Strip stale rework-marker annotations

For each affected site (`SKILL.md` + the 7 reference-file sites enumerated above plus the `(NEW)` marker on gate 18), rewrite the sentence to state the current contract in plain prose without the `(NEW)` / `post-PROSESPLIT-007` / `per PROSESPLIT-002` / `Post-rework` qualifier. Examples:

- `references/phase-9-validation-gates.md:5`: replace `"Post-PROSESPLIT-007, three gates are split between plan-commit (this skill) and prose-finalize..."` with `"Three gates are split between plan-commit (this skill) and prose-finalize..."`.
- `references/phase-9-validation-gates.md:26`: drop the `(NEW)` marker on gate 18 — `"| 18 | plan_completeness_check (NEW) |"` becomes `"| 18 | plan_completeness_check |"`.
- `references/governance-and-foundations.md:17`: replace `"The Prose Renderer is NOT a page-cycle role post-PROSESPLIT-007 — rendered prose is supplied externally..."` with `"The Prose Renderer is NOT a page-cycle role — rendered prose is supplied externally..."`.
- Similar plain-prose rewrites at `references/pre-flight-and-prerequisites.md:55`, `references/record-schemas.md:104`, `references/phase-7-6-arc-trace-extraction.md:3,52`, `references/phase-7-page-plan.md:183`.

### 3. F-08: Final Rule decision

**Recommended**: dismiss (parity with the bootstrap-audit decision on M4). No edit to `SKILL.md:487-491`. Record the dismissal rationale in the implementing commit message: *"Parity with BSBOOT-029's dismissal of the analogous bootstrap Final Rule paraphrase. The Final Rule's middle sentence operational-paraphrase is acceptable rhetorical close."*

**Alternative (if user wants stricter consistency)**: trim `SKILL.md:487-491` to the philosophical opener + closing sentences only, removing the middle sentence's gate-routing paraphrase.

## Files to Touch

- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` (F-06: one-word edit on line 148; F-07: rewrite on line 183).
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (F-07: rewrite on line 5; drop `(NEW)` on line 26).
- `.claude/skills/branching-story-page-cycle/references/governance-and-foundations.md` (F-07: rewrite on line 17).
- `.claude/skills/branching-story-page-cycle/references/pre-flight-and-prerequisites.md` (F-07: rewrite on line 55).
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (F-07: rewrite on line 104).
- `.claude/skills/branching-story-page-cycle/references/phase-7-6-arc-trace-extraction.md` (F-07: rewrite on lines 3 and 52).
- (Optional, if F-08 acted on): `.claude/skills/branching-story-page-cycle/SKILL.md` lines 487-491.

## Acceptance Criteria

- F-06: `grep -c "five fields" .claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` returns `0`.
- F-07: `grep -rn "post-PROSESPLIT\|per PROSESPLIT\|Post-PROSESPLIT" .claude/skills/branching-story-page-cycle/` returns `0` matches.
- F-07: `grep -rn "(NEW)" .claude/skills/branching-story-page-cycle/references/` returns `0` matches.
- F-07: each rewritten sentence reads as plain contract prose; manual review confirms semantics unchanged.
- F-08 (dismiss path): no edit to SKILL.md; rationale in commit message.
- F-08 (act path, if chosen): `SKILL.md:487-491` trimmed to opener + closing; middle paraphrase removed.

## Test Plan

- A future skill-streamlining-audit re-run does not surface F-06, F-07, or the F-08 act path (if taken).
- Manual diff: confirm each F-07 rewrite preserves the surrounding sentence semantics without the rework qualifier.
