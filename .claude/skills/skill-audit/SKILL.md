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

The audit phase runs steps 1-7. Step 8 is conditional — only fires if the user requests follow-up implementation after the report is presented.

1. **Read the target skill and load discipline reference** — split into two sub-steps:
   - **1a. Read the target skill** — Read the SKILL.md file at the provided path. Parse its name, description, and full content.
   - **1b. Load discipline reference** — Read `references/audit-execution-discipline.md`. These rules govern every tool call announcement and batching discipline from here through Step 8 (announcement rule, cascade-scan batching, recommended-at-audit-start, site-counting sub-rule, pre-finalization verification triggers). **Required regardless of whether the target SKILL.md is already in context from a slash-command invocation** — skipping this load means missing rules whose violations only surface mid-audit (e.g., umbrella cascade-scan announcements that break per-finding reconcilability) or mid-implementation (e.g., implicit primary-edit scope-expansion that audit-time site-counting would have foreclosed).

2. **Read alignment documents** — Read `docs/FOUNDATIONS.md` — skip only if read earlier in this session (fully or via partial reads that cumulatively covered the document), not from memory or training knowledge. "Read earlier in this session" includes FOUNDATIONS content loaded into this session's context by any prior operation — direct Read tool invocations, skill-invocation-embedded content (when a prior skill's Phase read the file as part of its own procedure), or system-reminder inclusions all satisfy this criterion. Re-read only when the content is not in context (e.g., after a compaction or context rotation — or when the earlier read covered only unrelated sections and this audit's topic requires a different section). If the file exceeds the Read tool's token limit, read the first 200 lines (preamble + principle listing) using offset/limit, or read relevant sections targeted to the audit topic. Multiple partial reads that cumulatively cover the full document satisfy this requirement. If `CLAUDE.md` exists at the repository root, also read it (if `CLAUDE.md` is absent — e.g., a subdirectory or worktree without one — treat its absence as normal and skip the CLAUDE.md alignment check in that case). For meta-tooling skill targets (e.g., brainstorm, skill-creator, skill-audit, and similar process/tooling skills), this FOUNDATIONS.md read may be skipped — alignment will be N/A per Step 4.

3. **Session reflection** — Review the current conversation context to identify the items below. If the target skill is skill-audit itself (self-audit), use session evidence from any prior audit invocation(s) in this session. Session evidence spans both the audit phase (Steps 1-7) and any user-directed follow-up implementation flow (Step 8) — friction in either phase is in-scope for a self-audit. The self-audit invocation provides no independent session evidence beyond confirming the skill's flow works. If no prior audit invocation exists in this session, report "No session evidence available — self-audit with no prior invocations produces no findings beyond confirming the skill's flow parses correctly." and skip steps 3-6. If skill-audit itself was modified during the current session (via user-directed follow-up implementation on an earlier audit, or any other in-session edit), base the self-audit on the CURRENT skill content — re-read the file at Step 1 regardless of prior reads. Session evidence then spans both pre- and post-modification behavior; explicitly mark any prior-session observation that an intervening edit already resolved as "resolved — no action needed" rather than re-raising it as a fresh finding.
   - Moments where the skill's instructions were unclear or ambiguous
   - Steps that were skipped, reordered, or worked around
   - Behaviors the skill didn't anticipate (edge cases, unexpected inputs)
   - Places where Claude had to improvise because the skill didn't provide guidance
   - Outcomes that diverged from what the skill intended
   - Steps that were not exercised this session (mark as "not exercised" — do not speculate about issues)

4. **Cross-check alignment** — For each finding from step 3, check whether the skill contradicts or fails to implement:
   - Principles from `docs/FOUNDATIONS.md` (reference by foundation number)
   - Conventions from `CLAUDE.md` (reference by section name) — skip this bullet entirely if `CLAUDE.md` is absent from the repo root
   - Apply the Skill Category Classification (Categories 1, 2, 2b, 2c, 3) from `references/cross-skill-consistency.md` to determine whether FOUNDATIONS-alignment is N/A (Category 1, meta-tooling) or detailed alignment is required (Categories 2 / 2b / 2c / 3).

5. **Classify findings** — Categorize each finding into one of three buckets:
   - **Issue**: Something broken, misleading, or contradictory in the skill
   - **Improvement**: A refinement to existing behavior that would make the skill more effective
   - **Feature**: A new capability that aligns with the skill's stated intent but is currently missing

6. **Severity-tag each finding** — CRITICAL / HIGH / MEDIUM / LOW. Use this rubric:
   - **CRITICAL**: Skill produces wrong output, corrupts state, or violates a FOUNDATIONS principle. Must fix before the skill is used again.
   - **HIGH**: Missing guardrail or instruction that has already caused rework or wrong output in this session, or a plausibly near-term failure mode on the next use.
   - **MEDIUM**: Friction that cost non-trivial improvisation or required non-obvious judgment to work around. The skill still produced the right outcome, but the path was not smooth. MEDIUM examples include: (a) skill's literal rule contradicts established precedent, forcing you to invoke precedent to satisfy validation (following the skill literally would produce incorrect output); (b) skill's documented enum or convention is missing values the operational world uses, forcing you to choose between skill compliance and correct output; (c) a skill step's format constraint doesn't fit the delivery shape without restructuring.
   - **LOW**: Wording refinement, coverage gap, or polish. Did not block progress and a competent operator could work past it without guidance. LOW examples include: wording that is slightly confusing but parseable on second read; an example that could be richer; a cross-reference that is valid but indirect; a convention drift between paired documentation that doesn't affect output correctness.

   **Pre-finalization verification trigger check** — for each finding tagged MEDIUM or higher, scan its Suggestion and Skill-gap fields for the absence-claim trigger phrasings enumerated in `references/audit-execution-discipline.md` §Pre-finalization verification (`"Add X"`, `"Document the missing Y"`, `"There is no documented Z"`, `"no fallback exists"`, `"the skill never mentions W"`, `"undefined"`, `"doesn't reference"`, `"not documented"`, mis-cited section/line at MEDIUM-or-higher). When any trigger fires, run the verification (Read or grep of the cited file/section) BEFORE finalizing the finding's wording. The 30-second-per-finding cost prevents the implementation-phase Re-evaluation retraction cycle the rule warns about: catching a falsified premise at audit time keeps the audit report's premise true to current state, while catching it at implementation phase forces a Re-evaluation amendment that the user reads only after they have already authorized implementation. Pre-finalization verification is the prevention; Re-evaluation is the recovery.

   **Site-counting trigger** — when a Suggestion field's wording implies parallel instantiation (phrasings like "mirror this in all class-specific checks", "apply at every site that documents X", "extend the same rule to the canon-reading and meta-tooling sub-sections", "add a parallel line at the meta-tooling section for symmetry"), grep for the underlying convention's terminology to enumerate the actual site count BEFORE finalizing — see `references/audit-execution-discipline.md` §Site-counting for parallel-instantiation Suggestions. Each parallel site discovered should appear in the Suggestion as `<finding>.a / <finding>.b / ...` rather than left implicit. Audit-time site enumeration prevents implementation-phase scope-expansion that the existing `Mid-implementation primary-edit scope-narrowing` rule cannot cover (per `references/follow-up-implementation.md` §Mid-implementation primary-edit scope-expansion).

7. **Present the report** — Output the structured report using the template below. Apply the conventions from `references/report-conventions.md` (suggestion specificity, restructure-encompassing audit suggestions, severity-count double-check, "implement all" tagging defaults).

8. **Follow-up implementation (conditional, on user request)** — After the report is presented, the user may request implementation of specific suggestions. At that point edit the target skill file directly — the "report only" guardrail applies only to the audit phase, not to user-directed follow-up. Load the references that govern this phase:
   - `references/follow-up-implementation.md` — common-path checklist, re-evaluation, partial implementation, finding identifier convention, edit ordering, restructure-encompassing findings, mid-implementation primary-edit scope-narrowing.
   - `references/cascade-and-summary-discipline.md` — cascade scanning, scan-outcome patterns, post-implementation summary structure, row-keying, worked examples.
   - `references/post-edit-verification.md` — the verification checks to run after all edits.
   - `references/cross-skill-consistency.md` — Skill Category Classification, sibling-scan operations, shared-surface triggers, scan methods. Required when any edit touches shared terminology / consumer-side schema / sibling-affecting conventions, or when the target is a meta-tooling skill.

## Report Template

Output this structure to the conversation (do not write to a file):

```markdown
# Skill Audit: <skill-name>

**Skill path**: <path>
**Session date**: YYYY-MM-DD
**Session summary**: <1-2 sentence description of the session work that exercised the target skill — for self-audits, include both audit-phase and any user-directed follow-up-implementation flow, since friction in either is in-scope evidence per Step 3>

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

> **AUDIT PHASE ONLY** — these two rules govern this section's contents; read both before consulting the form enumeration below:
>
> 1. **Default: OMIT this section** when no finding affects shared surfaces with sibling skills. Include it ONLY when a sibling scan was executed or a cross-skill cascade was identified.
> 2. **`Scan not performed — <reason>` is IMPLEMENTATION-PHASE-ONLY** — never use it in an audit report. That form is reserved for the post-implementation summary (see `references/cross-skill-consistency.md`).

[When the section IS included, use one of six forms depending on what actually happened during the audit phase: (1) "Scanned: <sibling-skill-list> via <method> — no inconsistencies[; <optional rationale naming what was checked and why no drift>]." when a scan was executed and found no drift (the bracketed clause permits trailing rationale parallel to form (2)'s extensible "adjusted X in Y" — useful when audit-trail reproducibility benefits from naming the specific schema, convention, or terminology that was scanned); (2) "Scanned: <list> — adjusted X in Y." when a scan was executed and surfaced an inconsistency to fix; (3) "Cascade planned for implementation: <sibling-file> per <structural-identity claim or shared-surface trigger>." when a finding identifies a required cross-skill cascade (e.g., a paired template with a 'structurally identical to <sibling>/...' claim) that will be applied at implementation time rather than during the audit — this form fits non-meta-tooling targets where the sibling-scan operation doesn't apply but the finding nonetheless implicates a shared surface. **Before drafting form (3) for any finding, perform per-finding sibling investigation (Read the sibling's parallel section, or grep the sibling's SKILL.md for the relevant terminology) per `references/audit-execution-discipline.md` §Pre-finalization verification — naming a finding as a cascade candidate without verifying the sibling actually has the parallel content produces audit-trail over-naming (cascades the audit listed but no cascade exists at sibling) and under-naming (cascades that DO exist but the audit didn't list).**; (4) "Scanned: <list> via <method> — cascade-target candidates found; per-sibling investigation narrowed scope (<reason per excluded sibling>); no sibling cascade planned." when a sibling scan ran during the audit phase's Auxiliary investigation window, found initial cascade-target candidates, and scope-narrowed to zero cascades (uncommon at audit phase; more often the Mid-implementation cascade scope-narrowing sub-rule fires at implementation phase — see `references/cross-skill-consistency.md` — but when scope-narrowing happens at audit phase the same reasoning applies: categorical-different surface shape, absent parallel section, or sibling-coherence-breaking content); (5) "Cross-reference to sibling convention noted: <sibling-file>/<section>; no cascade or drift to address — finding cites the sibling's existing convention rather than dictating a sibling edit." when a finding's primary edit will introduce a cross-reference to an existing sibling skill's documented convention without modifying the sibling's content. Distinct from form (3), which dictates a sibling edit at implementation time, and from form (1), which describes a scan that ran and found nothing — form (5) records that no scan was needed because the relationship is a forward reference rather than a drift risk, while still preserving the audit-trail evidence that the cross-reference was deliberate. The cross-reference itself is the citation; form (5) is its audit-trail entry; (6) "Scanned: <list> via <method> — <N> sibling(s) clean; <M> sibling(s) found cascade target(s) at <site-list>; cascade(s) keyed `<finding>.cascade` for implementation." when an audit-phase scan ran (typically because the target is meta-tooling and §Skill Category Classification requires defensive scanning, but also valid as defensive scanning on Category 2 / 2b targets) AND found one or more cascade targets AND other siblings clean. Distinct from form (1) (scan found nothing across all siblings), form (3) (no audit-phase scan ran — cascade was identified through finding-shape alone without sibling investigation), and form (4) (scan ran but scope-narrowed-to-zero cascades). The cascade itself is keyed `<finding>.cascade` in the post-implementation summary; this audit-phase line records the discovery scope and confirms the scan's positive cascade outcome. Use the literal `cascade(s) keyed <finding>.cascade for implementation` phrasing for grep-searchability parallel to forms (3)–(5). Consult `references/cross-skill-consistency.md` §Concrete shared-surface triggers for the list of shared surfaces that qualify.]

## Summary

**Total**: N issues, N improvements, N features (N findings total) — N CRITICAL, N HIGH, N MEDIUM, N LOW
```

## Guardrails

- **Report only** — Never modify the target skill file during the audit phase. Output the report to the conversation only. (Step 8 follow-up implementation modifies the target file — that's the only exception, scoped to user-directed implementation requests.)
- **No false positives** — If a step in the skill wasn't exercised during the session, note "not exercised this session" rather than speculating about potential issues.
- **FOUNDATIONS alignment is mandatory** — Any suggestion that would violate a principle in `docs/FOUNDATIONS.md` must be flagged and rejected, even if it would otherwise be an improvement.
- **Scope discipline** — Do not propose expanding the skill's scope beyond its stated intent. The audit evaluates the skill as written, not what it could become.
- **Session evidence required** — Every Issue and Improvement must cite specific session evidence (what happened, what was expected). Findings based purely on hypothetical scenarios belong in Features, not Issues.
- **Repeated audit shortcut** — If the same skill has been audited *as the target* 2+ times in the current session and the most recent audit found 0 findings, note "Skill stable — no new session evidence since last audit" and skip the full checklist unless the skill was modified between audits. If the skill was modified since the last audit (including by follow-up implementation from a prior audit), treat the next audit as fresh — do not use the shortcut. **Self-audit tie-break**: when the target is skill-audit itself (self-audit), this shortcut DOES apply if the prior self-audit found 0 findings AND no intervening edits to skill-audit — the shortcut phrasing becomes "Skill stable — no new session evidence since last self-audit." Step 3's session-evidence-from-prior-invocations rule governs what evidence a NEW self-audit (one that is NOT covered by the shortcut) draws on; it does not override the shortcut when the shortcut's conditions are met.
