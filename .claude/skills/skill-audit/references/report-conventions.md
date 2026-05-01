# Report Conventions

These conventions govern how the audit report (Step 7) is formatted and how findings are tagged. They apply to every audit report.

## Suggestion specificity

When a finding's primary edit could land in either `SKILL.md` or a `references/` / `templates/` file, cite the exact file path in the Suggestion field (e.g., `Add to references/X.md §Section` rather than just `§Section`). When the section name is unique across the skill's files, the bare `§Section` form is acceptable. The audit-phase directory listing recommended in `references/audit-execution-discipline.md` §Recommended at audit start surfaces which case applies — running it at audit start makes this contract verifiable rather than ambiguous, and prevents the implementation phase from re-keying primary/cascade rows when a section name turns out to live in a deeper reference file the audit didn't see.

## Suggestion specificity for restructure-encompassing audits

When the audit includes both a Feature-level restructure (per the Restructure-encompassing findings sub-rule in `references/follow-up-implementation.md` §Edit ordering) AND findings whose primary edit would be encompassed by that restructure if implemented, two additional Suggestion-field conventions apply.

**(a)** The encompassed findings' Suggestion field should cite the conditional placement explicitly: `Update the inline location at <Phase X / Section Y> (default) OR §<Z> of the new <file-name> file created by Feature N (if Feature N is implemented)` — naming both the inline-fallback location and the restructure-destination location. This makes the audit self-describing about restructure scope and prevents the audit-phase Suggestion text from going stale at implementation phase when the encompassed content actually lands in the new file (per the implementation-phase status-row format documented in the Restructure-encompassing findings sub-rule and its Worked example for `Feature-level architectural restructure encompassing other findings' content`).

**(b)** The Feature's own Suggestion field should explicitly enumerate the encompassed findings using the canonical phrase `Encompasses: Issues N1, N2, ... and Improvements M1, M2, ...; their primary content lives in §X1, §X2, ... of the new file respectively` — paralleling the implementation-phase status row's `encompasses findings M1, M2, ...` notation. Use the literal `Encompasses:` label for grep-searchability parallel to the post-implementation summary's `encompasses findings` phrasing.

Both conventions are optional when the audit has a Feature-level restructure with NO other findings whose content the restructure absorbs, but become recommended whenever the restructure-encompassing relationship is in play. Worked precedent: the create-base-world audit in this session emitted Feature 1 (`references/engine-envelope-shape.md` creation) alongside Issues 2/3/4/5 + Improvement 1 whose primary content was absorbed into the new file at implementation phase; the encompassed findings' audit-phase Suggestions named only the inline Phase 11 step 4 / step 6 locations, and the Feature's "Why it fits" / "Suggestion" fields described the encompassed scope in prose rather than via the canonical `Encompasses:` label — both conventions above would have made that audit self-describing.

## Severity-count double-check

Double-check severity counts against findings before presenting. If a correction is needed after presenting, strike the incorrect line and restate.

## All findings implement by default

"Implement all", "implement recommended", "implement suggestions", and any similar inclusive phrasing (any "implement" request that does not name specific findings by number) are synonymous: all apply every numbered Issue/Improvement/Feature in the report. The baseline assumption is that any finding worth numbering and presenting is worth implementing.

If a finding is worth surfacing but NOT worth auto-applying, tag it explicitly on the title line:
- ` — skip` — the auditor considered applying this and decided against it (e.g., two valid directions with no clear winner, user preference needed before choosing)
- ` — informational` — context the user should know, but it does not translate to a concrete code change
- ` — no change needed` — append to the Suggestion line (not the title) when the finding's conclusion is that the current behavior is already sufficient

Explicitly-tagged findings are excluded from "implement all" / "implement recommended" scope. Everything else is applied.

Example: `1. **[LOW]** Tighten batching threshold` (applied by default); `2. **[LOW]** Alternate naming convention — informational` (surfaced for awareness, not applied).

Rationale for this default: the previous "tag to include" pattern created inconsistency — the same finding might be tagged recommended in one session and untagged in another, depending on auditor judgment with no rubric. Flipping the default aligns the skill's behavior with user expectation ("implement recommended" = "implement all") and removes the tagging-judgment burden unless the auditor has a specific reason to hold back.
