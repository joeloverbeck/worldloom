# Implementation Order — Manual Story Studio Fourth Iteration

**Date:** 2026-06-02
**Source:** triage of `reports/manual-story-studio-fourth-iteration.md` (ChatGPT-Pro) → `docs/triage/2026-06-02-manual-story-studio-fourth-iteration-triage.md`
**Specs:** SPEC-117 … SPEC-121 (all `tools/manual-story-studio`, tooling-adjacent).

## Dependency graph

```
SPEC-120 (vocabulary)        completed + archived — cleared lifecycle-language smell
SPEC-118 (prompt visibility) completed + archived — added never_prompt, 3-5 beats, plain stop-rule wording, and translator field wiring
SPEC-119 (inspector cockpit) completed + archived — confidence panel, real ledger identity, reasons, and why-missing lookup
SPEC-117 (post-segment workbench)  largest; removes checklist + last_reviewed_after_segment
SPEC-121 (acceptance flow)   LAST — exercises SPEC-117 (workbench) + archived SPEC-118 (exclusion/3-5 beats)
```

Only **SPEC-121** has hard prerequisites (SPEC-117 and archived SPEC-118). SPEC-117 is currently active and may be implemented before SPEC-121; SPEC-118, SPEC-119, and SPEC-120 are completed and archived.

## Recommended landing order

1. **SPEC-120 — Lifecycle vocabulary cleanup.** Completed and archived as `archive/specs/SPEC-120-manual-story-studio-lifecycle-vocabulary-cleanup.md`; inactive vocabulary is now landed.
2. **SPEC-118 — Prompt visibility & language.** Completed and archived as `archive/specs/SPEC-118-manual-story-studio-prompt-visibility-and-language.md`; `never_prompt`, `3-5` beat default, plain stop-rule wording, and `confidence`/`answer_known` translator wiring are now landed.
3. **SPEC-119 — Prompt Inspector confidence cockpit.** Completed and archived as `archive/specs/SPEC-119-manual-story-studio-prompt-inspector-confidence-cockpit.md`; cardified the raw-ID panels, added real ledger identity, deterministic reasons, collapsed section-map identity, and why-missing lookup.
4. **SPEC-117 — Post-segment record workbench.** Replaces the checklist modal, removes `last_reviewed_after_segment`, adopts the broad referrer scan. Largest blast radius; needed by SPEC-121.
5. **SPEC-121 — Synthetic acceptance flow.** End-to-end Glass-Orchard test exercising the completed loop, including archived SPEC-118 behavior. Lands last.

## Deferred (not in this batch — see triage)

- **D1** full non-cast schema field expansion (~30 fields) — deferred pending real authoring use that names the fields (twice-deferred; user kept deferred).
- **D3** source-browser primary/secondary button hierarchy — deferred (low-priority polish; user kept deferred).
