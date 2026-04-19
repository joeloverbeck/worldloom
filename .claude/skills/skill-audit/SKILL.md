---
name: skill-audit
description: "Use when a skill was exercised during the current session and you want to evaluate its quality, find gaps, or identify improvements. Triggers: end of session, after implementing with a skill, after encountering skill friction."
user-invocable: true
arguments:
  - name: skill-path
    description: "Path to skill directory (e.g., .claude/skills/brainstorm)"
    required: true
---

# Skill Audit

Analyze a skill file against the work done in the current Claude Code session to determine whether the skill has issues, could be improved, or needs new features. Report only — never modify the target skill.

## Invocation

```
/skill-audit <path-to-skill-directory>
```

Example: `/skill-audit .claude/skills/brainstorm`

The argument is the skill directory path. The framework automatically resolves `SKILL.md` within it.

## Checklist

1. **Read the target skill** — Read the SKILL.md file at the provided path. Parse its name, description, and full content. If the exact path does not resolve, glob for `<path>*/SKILL.md` (appending wildcard + `/SKILL.md`). If that also fails, try `<path>**/SKILL.md`. If exactly one match is found, use it and note the correction. If zero or multiple matches, stop and report the error.

   **Auxiliary investigation (permitted, with required announcement).** Beyond reading the target SKILL.md, you may additionally: (a) list contents of the target skill's directory and of any directly-referenced sibling directories; (b) diff files against named reference sources when the target's text claims a reference-source relationship (e.g., "copy from skill-creator's own templates" — check whether those templates actually ship and whether sibling skills have drifted from them); (c) glob for shared-surface files (`archive/*/`, `brainstorming/*.md`, `worlds/*/`) when a potential finding hinges on their presence or naming. Each auxiliary investigation must support a specific hypothesis about the target skill's behavior — do not probe speculatively.

   **Announcement rule** (applies to any tool call beyond the target Read): announce hypothesis-first as user-facing text IMMEDIATELY BEFORE the tool call. Format: `Investigating <hypothesis>: <grep/read/diff/list> <target> to verify.` Examples:

   - `Investigating whether templates/ actually ship in this skill: listing the skill directory.` (setup-feeling action — routine directory listing at audit start still counts as auxiliary investigation and needs announcement)
   - `Investigating whether sibling meta-tooling skills reference changed terminology: grepping .claude/skills/*/SKILL.md for the affected tokens.` (substantive follow-up investigation mid-audit)

   Routine setup actions (listing the target directory, loading sibling files referenced from SKILL.md) require announcement just as substantive investigations do — the rule draws no line between "interesting" and "boring" auxiliary calls. Tool `description` fields do NOT satisfy this rule — they don't render in the transcript where reproducibility needs them. Hypothesis-first phrasing makes the audit trail reproducible; a reader can reconstruct what was being tested vs. which tool answered it.
2. **Read alignment documents** — Read `docs/FOUNDATIONS.md` — skip only if read earlier in this session (fully or via partial reads that cumulatively covered the document), not from memory or training knowledge. If the file exceeds the Read tool's token limit, read the first 200 lines (preamble + principle listing) using offset/limit, or read relevant sections targeted to the audit topic. Multiple partial reads that cumulatively cover the full document satisfy this requirement. If `CLAUDE.md` exists at the repository root, also read it (if `CLAUDE.md` is absent — e.g., a subdirectory or worktree without one — treat its absence as normal and skip the CLAUDE.md alignment check in that case). For meta-tooling skill targets (e.g., brainstorm, skill-creator, skill-audit, and similar process/tooling skills), this FOUNDATIONS.md read may be skipped — alignment will be N/A per Step 4.
3. **Session reflection** — Review the current conversation context to identify the items below. If the target skill is skill-audit itself (self-audit), use session evidence from any prior audit invocation(s) in this session. Session evidence spans both the audit phase (Steps 1-7) and any user-directed follow-up implementation flow (per Guardrails §Follow-up implementation) — friction in either phase is in-scope for a self-audit. The self-audit invocation provides no independent session evidence beyond confirming the skill's flow works. If no prior audit invocation exists in this session, report "No session evidence available — self-audit with no prior invocations produces no findings beyond confirming the skill's flow parses correctly." and skip steps 3-6. If skill-audit itself was modified during the current session (via user-directed follow-up implementation on an earlier audit, or any other in-session edit), base the self-audit on the CURRENT skill content — re-read the file at Step 1 regardless of prior reads. Session evidence then spans both pre- and post-modification behavior; explicitly mark any prior-session observation that an intervening edit already resolved as "resolved — no action needed" rather than re-raising it as a fresh finding.
   - Moments where the skill's instructions were unclear or ambiguous
   - Steps that were skipped, reordered, or worked around
   - Behaviors the skill didn't anticipate (edge cases, unexpected inputs)
   - Places where Claude had to improvise because the skill didn't provide guidance
   - Outcomes that diverged from what the skill intended
   - Steps that were not exercised this session (mark as "not exercised" — do not speculate about issues)
4. **Cross-check alignment** — For each finding from step 3, check whether the skill contradicts or fails to implement:
   - Principles from `docs/FOUNDATIONS.md` (reference by foundation number)
   - Conventions from `CLAUDE.md` (reference by section name) — skip this bullet entirely if `CLAUDE.md` is absent from the repo root
   - For meta/tooling skills that do not touch canon/world-model design (e.g., brainstorm, skill-creator, skill-audit), note "N/A — meta-tooling skill, FOUNDATIONS principles do not apply" and move on. Reserve detailed alignment analysis for skills that govern canon-pipeline proposals, specs, or tickets.
5. **Classify findings** — Categorize each finding into one of three buckets:
   - **Issue**: Something broken, misleading, or contradictory in the skill
   - **Improvement**: A refinement to existing behavior that would make the skill more effective
   - **Feature**: A new capability that aligns with the skill's stated intent but is currently missing
6. **Severity-tag each finding** — CRITICAL / HIGH / MEDIUM / LOW. Use this rubric:
   - **CRITICAL**: Skill produces wrong output, corrupts state, or violates a FOUNDATIONS principle. Must fix before the skill is used again.
   - **HIGH**: Missing guardrail or instruction that has already caused rework or wrong output in this session, or a plausibly near-term failure mode on the next use.
   - **MEDIUM**: Friction that cost non-trivial improvisation or required non-obvious judgment to work around. The skill still produced the right outcome, but the path was not smooth. MEDIUM examples include: (a) skill's literal rule contradicts established precedent, forcing you to invoke precedent to satisfy validation (following the skill literally would produce incorrect output); (b) skill's documented enum or convention is missing values the operational world uses, forcing you to choose between skill compliance and correct output; (c) a skill step's format constraint doesn't fit the delivery shape without restructuring.
   - **LOW**: Wording refinement, coverage gap, or polish. Did not block progress and a competent operator could work past it without guidance. LOW examples include: wording that is slightly confusing but parseable on second read; an example that could be richer; a cross-reference that is valid but indirect; a convention drift between paired documentation that doesn't affect output correctness.
7. **Present the report** — Output the structured report using the template below.

## Report Template

Output this structure to the conversation (do not write to a file):

```markdown
# Skill Audit: <skill-name>

**Skill path**: <path>
**Session date**: YYYY-MM-DD
**Session summary**: <1-2 sentence description of the session work that exercised the target skill>

## Alignment Check

- **FOUNDATIONS.md**: <aligned / N violations found / N/A — meta-tooling skill>
- **CLAUDE.md**: <aligned / N deviations found / skipped — not present>
[If violations: bullet list with specific foundation # or CLAUDE.md section + what conflicts]

## Issues

[If none: "No issues identified."]

1. **[SEVERITY]** <title>
   - **What happened**: <session evidence — what went wrong or was confusing>
   - **Skill gap**: <what the skill says or fails to say that caused this>
   - **Suggestion**: <how to fix the skill>

## Improvements

[If none: "No improvements identified."]

1. **[SEVERITY]** <title>
   - **Current behavior**: <what the skill currently says>
   - **Why improve**: <session evidence or reasoning>
   - **Suggestion**: <proposed change>

## Features

[If none: "No features identified."]

1. **[SEVERITY]** <title>
   - **What's missing**: <gap description>
   - **Why it fits**: <how this aligns with the skill's stated intent>
   - **Suggestion**: <proposed addition>

## Not Exercised This Session

[Optional section. Omit entirely when all skill steps and branches were exercised. Otherwise list one-line bullets naming skill steps or branches that the session did not trigger — this surfaces coverage gaps without speculating about them as issues.]

- <one-line description of skill step or branch not exercised>

## Cross-Skill Scan

**Default**: OMIT this section when no finding affects shared surfaces with sibling skills. Never use `Scan not performed — <reason>` in an audit report — that form is reserved for implementation-phase announcements (see Guardrails §Cross-skill consistency). Include this section ONLY when a sibling scan was executed or a cross-skill cascade was identified.

[When included, use one of three forms depending on what actually happened during the audit phase: (1) "Scanned: <sibling-skill-list> — no inconsistencies." when a scan was executed and found no drift; (2) "Scanned: <list> — adjusted X in Y." when a scan was executed and surfaced an inconsistency to fix; (3) "Cascade planned for implementation: <sibling-file> per <structural-identity claim or shared-surface trigger>." when a finding identifies a required cross-skill cascade (e.g., a paired template with a 'structurally identical to <sibling>/...' claim) that will be applied at implementation time rather than during the audit — this form fits non-meta-tooling targets where the sibling-scan operation doesn't apply but the finding nonetheless implicates a shared surface. Consult Guardrails §Cross-skill consistency triggers for the list of shared surfaces that qualify.]

## Summary

**Total**: N issues, N improvements, N features (N findings total) — N CRITICAL, N HIGH, N MEDIUM, N LOW
```

Double-check severity counts against findings before presenting. If a correction is needed after presenting, strike the incorrect line and restate.

**All findings implement by default**. "Implement all", "implement recommended", "implement suggestions", and any similar inclusive phrasing (any "implement" request that does not name specific findings by number) are synonymous: all apply every numbered Issue/Improvement/Feature in the report. The baseline assumption is that any finding worth numbering and presenting is worth implementing.

If a finding is worth surfacing but NOT worth auto-applying, tag it explicitly on the title line:
- ` — skip` — the auditor considered applying this and decided against it (e.g., two valid directions with no clear winner, user preference needed before choosing)
- ` — informational` — context the user should know, but it does not translate to a concrete code change
- ` — no change needed` — append to the Suggestion line (not the title) when the finding's conclusion is that the current behavior is already sufficient

Explicitly-tagged findings are excluded from "implement all" / "implement recommended" scope. Everything else is applied.

Example: `1. **[LOW]** Tighten batching threshold` (applied by default); `2. **[LOW]** Alternate naming convention — informational` (surfaced for awareness, not applied).

Rationale for this default: the previous "tag to include" pattern created inconsistency — the same finding might be tagged recommended in one session and untagged in another, depending on auditor judgment with no rubric. Flipping the default aligns the skill's behavior with user expectation ("implement recommended" = "implement all") and removes the tagging-judgment burden unless the auditor has a specific reason to hold back.

## Guardrails

- **Report only** — Never modify the target skill file. Output the report to the conversation only.
- **No false positives** — If a step in the skill wasn't exercised during the session, note "not exercised this session" rather than speculating about potential issues.
- **FOUNDATIONS alignment is mandatory** — Any suggestion that would violate a principle in `docs/FOUNDATIONS.md` must be flagged and rejected, even if it would otherwise be an improvement.
- **Scope discipline** — Do not propose expanding the skill's scope beyond its stated intent. The audit evaluates the skill as written, not what it could become.
- **Session evidence required** — Every Issue and Improvement must cite specific session evidence (what happened, what was expected). Findings based purely on hypothetical scenarios belong in Features, not Issues.
- **Follow-up implementation** — After the report is presented, the user may request implementation of specific suggestions. At that point, edit the target skill file directly — the "report only" guardrail applies only to the audit phase, not to user-directed follow-up.

  **Common path (checklist)**:
  1. Check if target file changed since the audit report → if yes, run **Re-evaluation** (below).
  2. Read user request: partial ("implement 1, 3") vs. full ("implement all" / "implement recommended" — synonymous).
  3. Apply edits in document order (top → bottom); scan each for **cascades** before applying.
  4. Re-read all edited files; run the **post-edit verification** pass (5 checks for non-meta-tooling targets; 6 checks when the target is a meta-tooling skill).
  5. Present the **post-implementation summary**: per-batch cascade-scan line FIRST — confirms the scan ran even when it found nothing; see the `Per-finding cascade scan visibility` sub-rule below — THEN the table (Finding | Severity | Status). Placing the cascade-scan line AFTER the table breaks the audit-trail ordering: readers should see scan discipline confirmed before they interpret table rows.
  6. If a stated structural-identity claim in the target forces a sibling-file mirror, apply the **cross-skill cascade** (keyed `N.cascade` in the summary). AND, separately, if the target is meta-tooling and any edit touched shared terminology or conventions, run the **cross-skill sibling scan** (with a named scan method) and document both in the summary. The two operations are independent — see Guardrails §Cross-skill consistency for the distinction.

  The sub-rules below are the full specification — use this checklist to orient, then consult the sub-rules (Re-evaluation, Partial implementation, Edit ordering, Cascade edits, Post-implementation summary, Post-edit verification) for edge cases and worked examples.

  **Re-evaluation**: If the target file changed between the audit report and any follow-up-implementation batch — whether from an external edit (a different session or user action outside the audit flow), a previous partial-implementation batch in this same session, or a user-directed edit to the target between report and follow-up — re-evaluate each finding against the current state before applying edits. Discard obsolete findings, adapt shifted ones, and renumber survivors. Announce the re-evaluation explicitly before applying any edits in the new batch: "Re-evaluating N remaining findings against the modified target file..." followed by a one-line outcome per finding (`still-valid` / `target-shifted — adapted` / `now-moot — discarded`). When no edits have touched the target file between the report and the current batch, the full per-finding announcement may be replaced by a single confirmation line (e.g., "No target edits since audit; proceeding without re-evaluation.") or omitted entirely. The full per-finding announcement is required only when the target file has actually changed.

  **Partial implementation**: If the user requests specific findings (e.g., "implement 1 and 3"), check whether skipped findings depend on implemented ones. If so, note the dependency and ask whether to include the dependent finding. If the user requests implementation without naming specific findings (e.g., "implement all", "implement recommended", "implement suggestions", or any similar inclusive phrasing — all synonymous under the default semantics), skip dependency checking and apply every finding in document order except those explicitly tagged `— skip`, `— informational`, or `— no change needed` in the audit report.

  **Finding identifier convention**: Findings are identified by section-prefixed numbering from the Report Template (`Issue 1`, `Issue 2`, ...; `Improvement 1`, `Improvement 2`, ...; `Feature 1`, ...). Each section has its own 1-based counter. When the user requests "implement 1 and 3", default interpretation is "Issue 1 and Issue 3"; if the audit has fewer Issues than the requested number, confirm the section before proceeding ("did you mean Improvement 1 and Improvement 3?"). For the post-implementation summary table, prefer section-prefixed row keys (`Issue 1`, `Improvement 1`, `Feature 1`) so the reader can reconcile row counts to the audit's per-section counts at a glance; flat-continued numbering (1–N across all sections) fuses two schemes and is discouraged.

  **Edit ordering**: Apply edits in document order (top to bottom) to minimize line-number shifts invalidating later edits. If applying an earlier finding renders a later finding moot (e.g., the target text no longer exists), skip the moot finding and note it in the post-edit verification as "superseded by finding N." If an Edit call fails because a prior edit changed the target text, re-read the file to find the updated text and retry with the corrected `old_string`. If an edit inserts a new numbered step, renumber all subsequent steps and verify that the output summary or other sections referencing step numbers are updated accordingly. When an edit inserts or removes a numbered item, scan preceding edits in the same batch for cross-references to the shifted numbers and fix them in the same edit or immediately after.

  **Cascade edits**: After planning the primary edit(s) for a finding, scan the rest of the file for related text that uses the same terminology, references the same concept, or would become inconsistent if only the finding's target text is changed. Apply cascade edits alongside the finding's primary edit. Cascade discovery may happen at two valid points: (a) per-finding during planning (preferred — matches the scan-after-planning flow above and keeps cascade + primary in the same batch step), or (b) during post-edit verification as a backstop when the per-finding scan missed something. When a cascade is discovered in post-edit verification, apply it immediately and note it in the post-implementation summary as usual. The verification backstop is not a replacement for per-finding scanning — it catches misses; it does not absolve the planning step. Note cascade edits in the post-implementation summary as "cascade from finding N."

  **Per-finding cascade scan visibility**: When per-finding scanning produces no related text for any finding in the batch, report the absence as a single per-batch line BEFORE the post-implementation summary table (e.g., "Per-finding cascade scans: no cascades needed for any of N findings.") so the audit trail records that the scan happened. When some findings produced cascades and others did not, the cascade rows (`N.cascade`) cover the affirmative cases and the per-batch line need only mention the findings whose scans found nothing (e.g., "Per-finding cascade scans: findings 2 and 5 produced no cascades."). The line is procedural, not a status row — it confirms the scan was run, parallel to the cross-skill scan's "Scanned via grep — no inconsistencies" announcement.

  **Primary-site confirmation pattern**: A scan may find hits that are ALREADY-PLANNED primary edit sites rather than new cascades. This is distinct from both "scan found nothing" and "scan found cascade N.cascade." Example: a terminology-harmonization finding (Improvement N) is planned as N parallel instantiations (`N.a`, `N.b`, ...); the cascade scan for that finding greps the same term and finds exactly those N sites — no extras. Another example: a primary edit's cascade scan for related terminology finds one hit, but that hit IS the co-equal primary already keyed elsewhere in the summary. Report this pattern as `Finding N: <count> hits found, all accounted for as primary sites (<optional brief site list>); no extraneous cascade.` This preserves audit-trail visibility that the scan ran AND that the hits were reviewed and confirmed as planned primaries, without creating spurious `N.cascade` rows or misreporting "scan found nothing" when it actually found the expected sites.

  **Complementary-hit confirmation pattern**: A scan may also find hits that are NEITHER planned primary sites NOR cascade requirements — they are related existing content that happens to be consistent with (not modified by) the planned change. This is distinct from all three prior outcomes: "scan found nothing" (no hits), "primary-site confirmation" (hits are planned primaries), and "scan found cascade N.cascade" (hits require mirroring the primary). Example: a finding that tightens a rule in one section scans related terminology across the file and finds the same terminology used correctly in a sibling section where the existing text remains valid under the new rule — the sibling text is complementary, not a primary site, not a cascade target. Report this pattern as `Finding N: <count> hits found in <file-list>, confirmed complementary (<one-phrase reason, e.g., "definitional comment, not operational rule" or "parallel register, already consistent with the new rule">); no cascade.` This preserves audit-trail visibility that the scan ran and that the hits were reviewed and verified consistent, distinguishing from (a) the "no hits" per-batch line (scan found nothing at all), (b) primary-site confirmation (hits ARE the planned primaries), and (c) cascade rows (hits require modification). The four scan-outcome patterns together — no-hits / primary-site / complementary-hit / cascade — cover the full space of scan results and keep the audit trail reconstructible.

  **Cascade-scan discipline — search for semantic variants, not just exact strings**: When the primary change is a count, a renamed term, or a structured label, grep BOTH the exact old string AND its semantic variants. For a count change (e.g., "11 → 12"), also search for the number rendered elsewhere: tabular summary rows, alignment tables, process-flow diagrams, prose paraphrases that state the count in different phrasing, ordinal forms ("twelfth"), and word-form spellings ("twelve"). For a renamed term, also search for its plural, its adjective form, hyphenated variants, and compound constructions. For a structured label (e.g., `cf_id`), also search for prior names it may have used, its singular/plural siblings (`cf_ids`, `cf_refs`), and prose references that name the concept without the exact label. Over-scan is cheap; under-scan pushes the miss to the verification backstop, where the skill explicitly disallows it as a substitute for per-finding scanning.

  **Post-implementation summary**: After all edits, present a summary table or list showing the status of each finding: "implemented", "superseded by finding N", "cascade from finding N", "co-edit with finding N", or "skipped (reason)". Additionally, for meta-findings whose suggestion is realized by other findings' primary edits rather than by a dedicated edit, use `implemented (realized via findings M, N, ...)` naming the contributing findings explicitly. This gives the user a clear per-finding status rather than requiring them to infer outcomes from the edit sequence.

  **Quick-reference — row-keying by shape** (consult the Worked example block below for edge cases and rationale):

  | Shape | Row keys | Status field |
  |---|---|---|
  | 1 finding → 1 edit | `N` | `implemented` |
  | 1 finding → multiple co-equal parallel edits (same semantic change applied at N sites) | `N.a`, `N.b`, ... | `implemented` on each (do NOT add co-edit notation) |
  | 1 finding → primary edit + cascade(s) | `N` + `N.cascade` (or `N.cascade-a` / `N.cascade-b` for multiple cascades) | `implemented` on primary; `cascade from finding N — <reason>` on cascade rows |
  | Multiple findings → one shared edit | one row per finding, each keyed by its own number | `implemented (co-edit with finding M)` on each row, naming partners |
  | Meta-finding → no dedicated edit; realized by other findings' primary edits | `N` (finding keyed by its own number; no sub-keys) | `implemented (realized via findings M1, M2, ...)` naming the contributing findings |

  Rule of thumb: condensing multiple parallel edits into a single summary row with a bulleted list of sites is non-compliant — use one row per edit. The sub-letter keying IS the co-equality signal; do not add redundant co-edit notation to it.

  List cascade edits as separate table rows keyed `N.cascade` (where N is the originating finding's number); the status column contains `cascade from finding N — <concise reason: one or two lines max, naming both the touched location and the substantive change>`. If a single finding requires multiple primary edits in different sections of the target skill (neither edit is a cascade of the other — both are co-equal owners of the suggestion), key them `N.a`, `N.b`, etc. Reserve `N.cascade` for edits that merely keep related text consistent with a primary change. When two or more separate findings are resolved by a single shared text edit (their Suggestions collapse onto the same passage), keep each finding as a distinct row in the summary table — key each by its original finding number and use the status `implemented (co-edit with finding M)` on each row to name the partners. Do NOT re-key them as sub-letters; `N.a`/`N.b` is reserved for one-finding-multiple-edits only. This preserves the finding-to-edit relationship so a reader of the status table can reconcile it against the audit's finding count. This keeps per-edit granularity consistent across audits.

  Worked example — status field by case:
  - Baseline (N findings, N independent edits): row `Improvement 1` → status `implemented`; row `Improvement 2` → `implemented`; row `Improvement 3` → `implemented`. No sub-lettering, no co-edit notation, no cascades. This is the default shape when each finding has its own independent text change and nothing cross-cuts.
  - One finding, three edits: row `Improvement 1.a` → status `implemented`; row `Improvement 1.b` → `implemented`; row `Improvement 1.c` → `implemented`. The keying itself signals co-equality; do NOT add `(co-edit with Improvement 1.b/1.c)` to the status field.
  - One finding, N parallel instantiations of the same semantic change (no primary): row `Improvement N.a` → `implemented`; row `Improvement N.b` → `implemented`; ...; row `Improvement N.g` → `implemented`. When a single finding's suggestion ("standardize phrasing X across the file") is applied to multiple parallel locations of the same target text, the edits are co-equal — none is "primary" with the others as "cascades." `N.cascade` requires a primary semantic change at one location with related-text fixups elsewhere; parallel instantiations of the same change lack that primary/cascade relationship and use `N.a`/`N.b`/... instead. Rule of thumb: if you can swap the order of any two edits without changing the meaning of the others, they are parallel co-equals, not primary-plus-cascade.
  - Three findings, one shared edit: row `Improvement 1` → `implemented (co-edit with Improvements 4, 7)`; row `Improvement 4` → `implemented (co-edit with Improvements 1, 7)`; row `Improvement 7` → `implemented (co-edit with Improvements 1, 4)`. Each row names the other partners.
  - One finding, two cascades in different sections: row `Improvement 3` → `implemented`; row `Improvement 3.cascade-a` → `cascade from Improvement 3 — <reason A>`; row `Improvement 3.cascade-b` → `cascade from Improvement 3 — <reason B>`. The `cascade-a / cascade-b` suffixes mirror the `N.a / N.b` pattern for primary edits and preserve per-edit granularity. When two cascades from the same finding are tightly coupled (the same conceptual change in adjacent text), it is acceptable to merge into a single `N.cascade` row instead.
  - One finding, two co-equal primaries with one cascade each: row `Improvement N.a` → `implemented`; row `Improvement N.b` → `implemented`; row `Improvement N.cascade-a` → `cascade from Improvement N — <reason dependent on N.a>`; row `Improvement N.cascade-b` → `cascade from Improvement N — <reason dependent on N.b>`. When a finding has multiple co-equal primaries AND each primary has its own cascade(s), compose the `N.a/N.b` pattern with the `N.cascade-a/N.cascade-b` pattern. The `cascade-a`/`cascade-b` suffixes DO NOT have to align with the primary suffixes — a cascade's letter ordering reflects its own dependency position, not the primary it follows. Name the dependency explicitly in the reason field (e.g., "cascade from Improvement N — mirrored to sibling template per structural-identity claim; follows N.b primary") so a reader can reconstruct which primary each cascade depends on. Worked instantiation: a finding whose suggestion applies to two co-equal locations (the target skill's main file AND a paired sibling template) where each primary has its own dependent fixup — the main-file primary (`N.a`) has a cascade in a validation section (`N.cascade-a`) that cross-references the new content, and the template primary (`N.b`) has a cascade in a structurally-paired sibling template (`N.cascade-b`) that mirrors the change per a structural-identity claim. Either cascade could be applied before or after its companion primary; what matters is that each cascade's reason field names the primary it depends on so the reader can reconstruct the dependency graph from the status table alone.
  - Two findings, same file but different lines: row `Improvement 2` → `implemented`; row `Improvement 5` → `implemented`. Both rows are baseline `implemented`; do NOT use co-edit notation. Co-edit is reserved for a single shared text edit resolving multiple findings, not separate edits at different locations in the same file. If a reader wants to see that two findings touched the same file, that relationship is discoverable from the status-row reasons (which name the touched locations), not from the status field itself. Attempting to repurpose co-edit for same-file-different-lines conflates "shared text" with "shared file" and breaks the reader's ability to reconcile row counts against the audit's finding count.
  - Two findings, adjacent passages batched into one Edit tool call: row `Improvement 2` → `implemented`; row `Improvement 3` → `implemented`. Both rows are baseline `implemented`; do NOT use co-edit notation. A single Edit tool call can replace one old_string with a new_string that inserts two or more distinct semantic blocks (e.g., a definition list for finding A and a table for finding B at the same insertion point). Tool-call granularity is NOT the co-edit criterion — passage granularity is. If the two new blocks could be described in independent sentences ("Improvement 2 added the family enumeration; Improvement 3 added the user-label mapping table"), they are separate edits despite being co-located and tool-batched. Co-edit is reserved for cases where one continuous passage simultaneously serves multiple findings (e.g., a subsection whose prose covers two findings in one breath, or a table whose rows collectively answer two findings). Rule of thumb: if you can point at distinct text fragments and say "this fragment resolves A, that fragment resolves B," they are separate edits; if the same fragment resolves both, it is co-edit.
  - Cross-skill cascade vs cross-skill parallel: when a primary change in the target skill MUST be mirrored to a sibling skill's parallel file to preserve a stated structural-identity claim (e.g., "structurally identical to `<sibling>/templates/...`"), the sibling's edit is a cascade — key `N.cascade` (single mirror) or `N.cascade-a` / `N.cascade-b` (multiple mirrors). The sibling edit lacks primary semantic authority; it follows the target. In contrast, when a Finding's Suggestion explicitly names the sibling as a co-equal target ("update both paired templates"), the sibling edits are parallel primary edits — key `N.a`, `N.b`, `N.c`, `N.d` across all co-equal locations. Decision rule: if the sibling edit's content is dictated by the target edit's content (the sibling just copies the new text), it is a cascade; if both edits instantiate a shared semantic change independently of each other, they are parallel primary edits. When in doubt, prefer cascade keying — it preserves the finding-to-primary-edit relationship and makes the target-skill's authoritative role explicit.
  - Meta-finding resolved by other findings' primary edits: row `Issue 1` → `implemented (realized via Improvement 1 and Issue 2)`; row `Improvement 1` → `implemented` (baseline); row `Issue 2` → `implemented` (baseline). When a finding's suggestion is strategic or architectural (e.g., "inline load-bearing content," "unify terminology across sections," "reduce duplication") and its implementation is emergent from the primary edits of OTHER findings rather than a dedicated edit of its own, use this shape. The row uses the finding's own number with no sub-keys — it has no dedicated edit to key. Distinct from co-edit: co-edit requires one shared passage resolving multiple findings; here multiple DIFFERENT passages, each for its own finding, collectively resolve the meta-finding. Decision rule: if finding N has no text uniquely attributable to it, and the edits that resolve N are all primary edits for other findings, use the meta-finding shape. If finding N has at least one text fragment uniquely attributable to it (even if tiny), use `N.a` + co-edit or `N.cascade` instead. The status's parenthetical MUST name every contributing finding by its section-prefixed key so the audit trail is reconstructible from the status table alone.

  **Post-edit verification**: After all edits are applied, re-read each edited file — full file for short files; targeted Reads of edited regions with flanking context for longer files — and verify as a single pass. For numbering-continuity check 2(a) on files >150 lines, prefer grep per that check's guidance; targeted-read coverage of each edited region satisfies the remaining checks. A strict end-to-end re-read of an unchanged 400-line file is not required when the verification-check items can be satisfied from the edited regions alone.
  1. **No overlap or contradiction** — edits don't conflict with each other
  2. **Cross-references valid**:
     - (a) **Numbering continuity** — step, phase, and section numbers are sequential with no gaps or duplicates. If the file has >150 lines OR >10 numbered references across multiple levels AND the file uses a single consistent numbering convention, prefer grep pattern search (e.g., grep for `Step [0-9]`, `### [0-9]`) to confirm. If the file mixes numbering conventions (numbered top-level steps combined with checkbox items, numbered sub-lists, and bulleted items in the same file — no single grep pattern catches all of them), visual scan via targeted Reads of each numbered block is acceptable. For shorter files with consistent conventions, a visual scan suffices. Adapt grep patterns to the target skill's convention (numbered items, lettered sub-steps, or markdown headers).
     - (b) **File paths valid** — all referenced file paths still exist and point to correct targets.
     - (c) **New cross-references** — references introduced by new text point to content that actually exists. When the target skill uses nested numbering (sub-steps within steps), verify that cross-references disambiguate between levels (e.g., "Step 1, sub-step 5" vs. "Step 5").
     - (d) **Overview diagrams** — high-level overviews that become slightly inaccurate due to new branching logic are acceptable if the detailed step text handles the nuance. Note the discrepancy but do not force-update overview text that would become harder to scan.
  3. **Sequential flow coherent** — the skill reads coherently end-to-end after all edits
  4. **Contextual consistency** — numbering, terminology, and cross-references are consistent with adjacent unchanged text
  5. **Frontmatter integrity** — if any edit touched the YAML frontmatter, verify `---` delimiters are intact and the YAML parses correctly (name, description, and arguments are present and properly quoted)
  6. **Cross-skill sibling scan** (meta-tooling targets only) — if the target is a meta-tooling skill (brainstorm, skill-creator, skill-audit, or similar process/tooling skill) AND any edit touched shared terminology, conventions, or tag semantics (per Guardrails §Concrete shared-surface triggers), confirm the sibling scan has been run and documented in the post-implementation summary. Skip this check when the target is not a meta-tooling skill, OR when no edits touched shared surfaces. This is the gate that catches the "Extends to user-directed edits on meta-tooling skills" rule before it slips — the scan itself lives in Guardrails §Cross-skill consistency, but the confirmation lives here.

  If any check fails, fix the offending edit(s), then re-run the full verification pass. Do not selectively re-check — a fix in one area can introduce issues in another.
- **Cross-skill consistency** — If the target skill is part of a multi-skill workflow AND any finding affects interfaces shared with sibling skills, scan sibling skills for inconsistencies. Report cross-skill inconsistencies as Issues. Skip when all findings are internal to the target skill.

  **Two distinct sibling-skill operations are governed by this guardrail — they are independent and either, both, or neither may apply on any given implementation:**

  - **Cross-skill cascade** applies to ANY target skill (meta-tooling or canon-mutating) when a stated structural-identity claim in the target (e.g., a template comment reading "structurally identical to `<sibling>/templates/...`") makes a sibling edit mandatory to preserve the claim. Keyed `N.cascade` in the post-implementation summary; sub-rule lives in the Quick-Reference row-keying section under `Cross-skill cascade vs cross-skill parallel`. The sibling edit follows the target edit's content — no independent drift-check is needed because the content is dictated.
  - **Cross-skill sibling scan** applies ONLY to meta-tooling targets (brainstorm, skill-creator, skill-audit, skill-consolidate, and similar) as a defensive drift-check across sibling meta-tooling skills. Runs grep / read / diff across meta-tooling siblings to confirm the change doesn't leave sibling skills inconsistent with the target. Scan method must be named in the announcement; an unexecuted scan must be announced as `Scan not performed — <reason>`, not fabricated as executed.

  A single implementation may require cross-skill cascade, cross-skill sibling scan, both, or neither. The two are operationally independent: cascade is about mirroring dictated content to preserve a claim; scan is about verifying the absence of drift. Confusing them — escalating a simple cascade into a full sibling-scan protocol, or skipping a mandatory cascade because "scan is meta-tooling only" — has been a real source of friction. The sub-rules below elaborate each operation.

  **Concrete shared-surface triggers**: A finding affects a shared surface when it changes any of the following:
  - `docs/plans/*.md` design-doc output path or frontmatter conventions (produced by `brainstorm`)
  - `docs/triage/*.md` triage-file format (produced by `brainstorm` for multi-deliverable triages)
  - `brainstorming/*.md` canon-pipeline proposal structure (produced by `skill-creator` in fresh mode; consumed by `skill-creator` in compile mode)
  - `archive/*/` archival destination paths or naming conventions
  - `specs/*.md` or `tickets/*.md` structure and numbering conventions — worldloom does not yet ship with these directories; check for presence before flagging, and if absent, skip this bullet
  - Shared terminology that appears in multiple skills
  - Output format consumed by a downstream skill in the same pipeline (e.g., `brainstorming/*.md` proposals consumed by `skill-creator`; `docs/plans/*.md` design docs consumed by follow-up implementation skills)
  - Shared template files referenced by multiple sibling skills — especially when a template carries an explicit "structurally identical to `<other-skill>/templates/...`" claim or comment. Schema drift between such templates is the failure mode: if finding N adds, removes, or repurposes a field in one skill's template, the sibling's matching template needs the same change to preserve the structural-identity claim. Catch this at per-finding planning time, not via the post-edit verification backstop.

  When triggered, list the scanned sibling skills in the audit report alongside what (if anything) was adjusted. If no inconsistency was found, state "Scanned: <skill list> — no inconsistencies." This makes the scan auditable. When a finding identifies a required cross-skill cascade but no sibling SCAN was run during the audit phase (typical of non-meta-tooling targets where the sibling-scan operation doesn't apply), use the Cross-Skill Scan section's third form — "Cascade planned for implementation: <sibling-file> per <structural-identity claim>" — and keep the cascade itself as an `N.cascade` row in the post-implementation summary once implementation runs.

  **Scan methods** — pick one based on the finding's shape:
  - (a) **Grep** for the changed terminology or convention across `.claude/skills/*/SKILL.md` when the finding changes a word-level convention (a tag name, a section heading, a keyword, a status label).
  - (b) **Read** a sibling's SKILL.md end-to-end when the finding touches that sibling's declared interfaces or outputs (inputs the sibling consumes, artifacts it produces, templates it references).
  - (c) **Glob + check** when the finding changes a shared-path convention (`archive/*/`, `brainstorming/*.md`, `worlds/<slug>/`, `docs/plans/*.md`, `docs/triage/*.md`).
  - (d) **Diff** a shared template or structured file byte-by-byte against the sibling's parallel file when verifying a "structurally identical to `<other-skill>/templates/...`" identity claim or detecting schema drift. Prefer this over Read when the two files are parallel enough that line-by-line comparison is more informative than end-to-end reading — common for YAML templates and structured reference files.

  **Scan target — meta-tooling targets only**: When the target is a meta-tooling skill (skill-creator, skill-audit, skill-consolidate, brainstorm, and similar), the scan's audit target is *other meta-tooling siblings*, not *generated skills that instantiate the meta-tooling skill's template* (character-generation, diegetic-artifact-generation, propose-new-canon-facts, etc.). Matches in generated skills are confirmations that the generated skill correctly instantiates the meta-tooling convention — they are NOT sibling inconsistencies. If a grep matches a generated skill, spot-check that the generated usage is consistent with the convention being edited; do not cascade the edit to the generated skill (that's the meta-tooling skill's job at its next invocation, when it re-authors generated files from the updated template).

  Name the method used in the scan announcement so the result is reproducible (e.g., "Scanned `brainstorm`, `skill-creator` via grep for `templates/` references — no inconsistencies" or "Scanned `create-base-world` via read of `templates/*.yaml` + diff against generic source — no inconsistencies"). A scan announcement without a named method is not auditable.

  **The announcement must reflect work actually performed.** Writing "Scanned via grep for X" when no grep was executed violates the audit-trail discipline — even when the auditor's reasoning about the terms being skill-internal turns out to be correct. If the auditor concludes a scan is unnecessary without running the named method, the announcement must read `Scan not performed — <reason>` (e.g., "Scan not performed — changed terms are load-bearing only for skill-creator's internal guidance; no sibling meta-tooling skill documents these conventions"). A scan-not-performed announcement surfaces the possibility that the reasoning is wrong and a sibling DOES use the term; a fabricated "Scanned via grep" announcement buries that possibility under a false method claim that a future reader, trusting the trail, will not re-verify.

  **Extends to user-directed edits on meta-tooling skills**: The sibling-scan discipline also applies when user-directed follow-up implementation modifies a meta-tooling skill itself (e.g., brainstorm, skill-creator, skill-audit) and the edit touches shared terminology, conventions, or tag semantics — even when the edit is not driven by a finding in the current audit report. Before finalizing such an edit, grep sibling meta-tooling skills for references to the changed terminology or convention, and document the scan in the post-implementation summary ("Scanned siblings: <list> — no inconsistencies" or "<list> — adjusted X in Y").
- **Repeated audit shortcut** — If the same skill has been audited *as the target* 2+ times in the current session and the most recent audit found 0 findings, note "Skill stable — no new session evidence since last audit" and skip the full checklist unless the skill was modified between audits. If the skill was modified since the last audit (including by follow-up implementation from a prior audit), treat the next audit as fresh — do not use the shortcut.
