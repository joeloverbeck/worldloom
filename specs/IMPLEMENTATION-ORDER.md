# Implementation Order — Manual Story Studio Fourth Iteration

**Date:** 2026-06-02
**Source:** triage of `reports/manual-story-studio-fourth-iteration.md` (ChatGPT-Pro) → `docs/triage/2026-06-02-manual-story-studio-fourth-iteration-triage.md`
**Specs:** SPEC-117 … SPEC-121 (all `tools/manual-story-studio`, tooling-adjacent).

## Dependency graph

```
SPEC-120 (vocabulary)        independent, trivial — land first to clear the lifecycle-language smell
SPEC-118 (prompt visibility) independent — adds never_prompt, 3-5 beats, wires existing fields
SPEC-119 (inspector cockpit) independent (reads SPEC-118's new reason if present; not blocking)
SPEC-117 (post-segment workbench)  largest; removes checklist + last_reviewed_after_segment
SPEC-121 (acceptance flow)   LAST — exercises SPEC-117 (workbench) + SPEC-118 (exclusion/3-5 beats)
```

Only **SPEC-121** has hard prerequisites (SPEC-117 and SPEC-118). SPEC-117/118/119/120 are mutually independent and may be implemented or parallelized in any order; the sequence below is risk-ordered (trivial → contained → large → end-to-end).

## Recommended landing order

1. **SPEC-120 — Lifecycle vocabulary cleanup.** Smallest, no behavior change; lands the "inactive" model immediately.
2. **SPEC-118 — Prompt visibility & language.** Adds `never_prompt`, `3-5` beat default, removes engine jargon, wires `confidence`/`answer_known` translators. Independent; needed by SPEC-121.
3. **SPEC-119 — Prompt Inspector confidence cockpit.** Cardifies the two raw-ID panels + real reasons + why-here/why-missing. Independent; benefits from (but does not require) SPEC-118's `never_prompt` reason.
4. **SPEC-117 — Post-segment record workbench.** Replaces the checklist modal, removes `last_reviewed_after_segment`, adopts the broad referrer scan. Largest blast radius; needed by SPEC-121.
5. **SPEC-121 — Synthetic acceptance flow.** End-to-end Glass-Orchard test exercising the completed loop. Lands last.

## Deferred (not in this batch — see triage)

- **D1** full non-cast schema field expansion (~30 fields) — deferred pending real authoring use that names the fields (twice-deferred; user kept deferred).
- **D3** source-browser primary/secondary button hierarchy — deferred (low-priority polish; user kept deferred).
