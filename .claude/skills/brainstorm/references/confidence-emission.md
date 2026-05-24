# Confidence Emission Discipline

Confidence-emission rules fire at six interlocking sites across Steps 1, 2, and 3. This file consolidates them into one firing matrix so the cluster is scannable in one place rather than reconstructable from six sites in SKILL.md.

## Firing matrix

| Site | Trigger | Format | Required when |
|---|---|---|---|
| **Step 1 sub-step 5 — Directed-design carve-out** | Initial confidence 85-94% AND user-framed problem | Announce confidence level; name remaining gaps as assumptions | Carve-out fires (skip the discovery interview and go directly to Step 3) |
| **Step 1 sub-step 8 — Post-exploration checkpoint** | All context reading complete, before Step 2 decision | One sentence on its own line (e.g., "Post-exploration confidence: ~90% — reference file is exhaustive, scope fully specified by user request") | ALWAYS (drives Step 2 skip decision; also serves as audit-trail anchor before the triage recommendation when the triage carve-out has already settled the skip) |
| **Step 2 §The Protocol — Per-answer block** | After each user answer during the discovery interview | Block format: `Confidence: X% / Gaps: [list]` | Interview actually runs (1+ question) in non-auto-mode; OR interview runs 3+ questions in any mode |
| **Step 2 §The Protocol — Auto-mode prose alternative** | 0-2-question interview in auto mode | Inline prose ("Confidence: ~90% — gaps listed as named assumptions in the approach proposal below") | Auto mode AND interview ≤2 questions (provided gaps are surfaced in the very next message as named assumptions per §Canonical-format) |
| **Step 2 §Plan Mode Interview — Transition marker** | Moving from interview to approach proposal in plan mode | Confidence + gaps statement with visually distinct transition marker (bold heading, horizontal rule, or "I'm at 95% confidence. Moving to approaches.") | Plan mode active AND confidence reaches 95%; may be folded into approach-proposal message when the interview question IS the approach-selection question |
| **Step 3 §Pre-recommendation confidence anchor** | Before emitting the triage recommendation | Standalone sentence on its own line (Step 1 sub-step 8's post-exploration announcement) | Triage brainstorm (every Step 3 triage emission, regardless of auto-mode / pre-authorization) |
| **Post-redirection re-recommendation anchor** | When a user redirection causes a re-triage (verdicts reversed, deliverable shape changed, scope adjusted) | Standalone sentence on its own line, format unchanged: `Post-exploration confidence: ~X% — [revised basis naming what changed]` | Re-triage cycle (fires once per redirection-triggered re-triage, not once per individual verdict reversal); the original Step 3 §Pre-recommendation confidence anchor's audit-trail role is stale once user-identified errors surface, and this row records the operator's updated confidence in the corrected position |

## Interaction matrix

- **Step 1 sub-step 5 fires + Step 1 sub-step 8 fires + Step 3 §Pre-recommendation fires** → triple-overlap is normal for triage brainstorms with pre-authorization; one Step-1-sub-step-8-style sentence satisfies all three (the carve-out's Step-2-skip settles the skip decision; sub-step 8's standalone-announcement requirement stands; Step 3's anchor reuses the same sentence).
- **Step 2 §The Protocol fires (interview runs)** → per-answer blocks intervene; Step 2 §Plan Mode Interview's transition marker is the closing confidence emission for the interview.
- **Step 2 fully skipped via Step 1 sub-step 5** → no per-answer block to format; Step 1 sub-step 8's one-sentence post-exploration announcement, paired with named-gap assumptions in the next message, IS the confidence announcement in every mode. No separate formal block is additionally required.
- **Auto mode with 0-question interview** → Step 2 §Auto mode prose alternative applies provided gaps surface as named assumptions. The Step 2 prose alternative is the auto-mode form of the per-answer block format; the Step 1 sub-step 8 anchor and any Step 3 anchor still fire independently.
- **User redirection triggers re-triage** → The post-redirection re-recommendation anchor row of §Firing matrix fires; the original Step 3 §Pre-recommendation confidence anchor becomes stale once user-identified errors surface, and the re-anchor records the operator's updated confidence in the corrected position. The format is identical to the Step 3 anchor (Step 1 sub-step 8 post-exploration sentence); the trigger is the redirection event, not a routine triage emission. Fires once per redirection-triggered re-triage cycle, regardless of how many individual verdicts within the re-triage shifted.

## Canonical format for named-gap assumptions

When the confidence announcement is paired with named-gap assumptions (the directed-design carve-out, fast-track flows, the auto-mode prose alternative), use this literal shape — `(N) X — assuming Y` with parenthesized index, the unknown stated as X, the assumption stated after `— assuming` — so user redirection ("you assumed Y; actually it's Z") is one-line correctable:

```
Assumptions (unresolved gaps): (1) the existing test bundle's discard timing — assuming it lands in Tier 2 of the implementation order, not before; (2) RSP id-class preservation — assuming the audit sub-directory paths must remain stable, so we keep RSP-<integer> even though the semantic name shifts; (3) effect_model.variants[] semantics — assuming a list of effect rows per outcome-band entry, with Phase 4b weighted-pick selection.
```

**Audit-failing form to avoid**: a numbered list of full-sentence assumptions (e.g., `1. The existing test bundle is discarded as part of rollout`) merges "the unknown" with "what is assumed" and forces the user to parse each sentence to identify what they could redirect.

## Confidence Scoring Guide

Confidence increases from **both user answers AND research findings**. If external research (Step 1 sub-step 6) narrows the solution space before or during the interview, factor that into the confidence score and note which gaps were closed by research vs. which require user input.

| Range | Meaning | Action |
|-------|---------|--------|
| 0-30% | Don't understand the problem yet | Ask about the problem, not the solution |
| 30-60% | Understand the problem, unclear on constraints | Ask about constraints, success criteria, scope |
| 60-80% | Understand problem + constraints, unclear on priorities | Ask about tradeoffs, what matters most |
| 80-95% | Clear picture, a few edge cases or preferences unknown | Ask targeted questions about specific gaps |
| 95%+ | Ready to propose | Transition to Step 3 |

## Why these rules cluster

The six sites are mutually-reinforcing rather than redundant — they cover distinct lifecycle moments: pre-interview calibration (sub-step 5), pre-Step-2-decision anchor (sub-step 8), per-answer progression (Protocol block), mode-adapted alternative (Auto-mode prose), gate transition (Plan Mode Interview marker + Pre-recommendation anchor), and post-redirection re-anchor (Post-redirection re-recommendation anchor — refresh of the Pre-recommendation anchor when user redirection invalidates a prior triage). The cluster preserves audit-trail anchors at every gate the user might want to redirect from. The shared discipline: confidence is visibly recorded at each branch point so the user can see what drove the next action.

## Plan-mode fast-track interactions

**Fast-track plan-mode flow**: When all three conditions are met — plan mode active, initial confidence ≥85%, single viable approach — Steps 2-4 may collapse into a single message sequence: confidence announcement, approach rationale, key design decisions, and plan file write. The Step 3 "wait for user to choose" gate is also collapsed — when there's a single viable approach, presenting it and proceeding to the plan file write is one flow. The user's approval comes via ExitPlanMode, not a separate approach-selection step. This is the expected flow for well-specified diagnostic-to-spec brainstorms where the user provides root cause analysis, evidence, and a clear deliverable type.

**Fast-track assumption disclosure**: When initial confidence is 85-94% (high but not complete), list remaining gaps as **named assumptions** in the design presentation — not just in the confidence block — using the canonical format above. The user can correct them before ExitPlanMode. At 95%+ no assumption disclosure is needed since all gaps are resolved.
