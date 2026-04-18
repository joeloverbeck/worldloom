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

   **Auxiliary investigation (permitted).** Beyond reading the target SKILL.md, you may additionally: (a) list contents of the target skill's directory and of any directly-referenced sibling directories; (b) diff files against named reference sources when the target's text claims a reference-source relationship (e.g., "copy from skill-creator's own templates" — check whether those templates actually ship and whether sibling skills have drifted from them); (c) glob for shared-surface files (`archive/*/`, `brainstorming/*.md`, `worlds/*/`) when a potential finding hinges on their presence or naming. Each auxiliary investigation must support a specific hypothesis about the target skill's behavior — do not probe speculatively. Announce the investigation briefly so the user sees what's being checked and why.
2. **Read alignment documents** — Read `docs/FOUNDATIONS.md` — skip only if read earlier in this session (fully or via partial reads that cumulatively covered the document), not from memory or training knowledge. If the file exceeds the Read tool's token limit, read the first 200 lines (preamble + principle listing) using offset/limit, or read relevant sections targeted to the audit topic. Multiple partial reads that cumulatively cover the full document satisfy this requirement. If `CLAUDE.md` exists at the repository root, also read it (worldloom currently ships without one — treat its absence as normal and skip the CLAUDE.md alignment check in that case). For meta-tooling skill targets (e.g., brainstorm, skill-creator, skill-audit, and similar process/tooling skills), this FOUNDATIONS.md read may be skipped — alignment will be N/A per Step 4.
3. **Session reflection** — Review the current conversation context to identify the items below. If the target skill is skill-audit itself (self-audit), use session evidence from any prior audit invocation(s) in this session. The self-audit invocation provides no independent session evidence beyond confirming the skill's flow works. If no prior audit invocation exists in this session, report "No session evidence available — self-audit with no prior invocations produces no findings beyond confirming the skill's flow parses correctly." and skip steps 3-6. If skill-audit itself was modified during the current session (via user-directed follow-up implementation on an earlier audit, or any other in-session edit), base the self-audit on the CURRENT skill content — re-read the file at Step 1 regardless of prior reads. Session evidence then spans both pre- and post-modification behavior; explicitly mark any prior-session observation that an intervening edit already resolved as "resolved — no action needed" rather than re-raising it as a fresh finding.
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
   - **MEDIUM**: Friction that cost non-trivial improvisation or required non-obvious judgment to work around. The skill still produced the right outcome, but the path was not smooth.
   - **LOW**: Wording refinement, coverage gap, or polish. Did not block progress and a competent operator could work past it without guidance.
7. **Present the report** — Output the structured report using the template below.

## Report Template

Output this structure to the conversation (do not write to a file):

```markdown
# Skill Audit: <skill-name>

**Skill path**: <path>
**Session date**: YYYY-MM-DD
**Session summary**: <1-2 sentence description of the session work that exercised the target skill>

## Alignment Check

- **FOUNDATIONS.md**: <aligned / N violations found>
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

[Optional section. Omit when no finding affects shared surfaces with sibling skills (per Guardrails §Cross-skill consistency triggers). Otherwise: "Scanned: <sibling-skill-list> — no inconsistencies." or "Scanned: <list> — adjusted X in Y."]

## Summary

**Total**: N issues, N improvements, N features (N findings total) — N CRITICAL, N HIGH, N MEDIUM, N LOW
```

Double-check severity counts against findings before presenting. If a correction is needed after presenting, strike the incorrect line and restate.

**All findings implement by default**. "Implement all" and "implement recommended" are synonymous: both apply every numbered Issue/Improvement/Feature in the report. The baseline assumption is that any finding worth numbering and presenting is worth implementing.

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
  4. Re-read all edited files; run the **5-check post-edit verification** pass.
  5. Present the **post-implementation summary** table (Finding | Severity | Status).
  6. If cross-skill terminology or convention changed, run the **cross-skill sibling scan** and document it in the summary.

  The sub-rules below are the full specification — use this checklist to orient, then consult the sub-rules (Re-evaluation, Partial implementation, Edit ordering, Cascade edits, Post-implementation summary, Post-edit verification) for edge cases and worked examples.

  **Re-evaluation**: If the target file changed between the audit report and any follow-up-implementation batch — whether from an external edit (a different session or user action outside the audit flow), a previous partial-implementation batch in this same session, or a user-directed edit to the target between report and follow-up — re-evaluate each finding against the current state before applying edits. Discard obsolete findings, adapt shifted ones, and renumber survivors. Announce the re-evaluation explicitly before applying any edits in the new batch: "Re-evaluating N remaining findings against the modified target file..." followed by a one-line outcome per finding (`still-valid` / `target-shifted — adapted` / `now-moot — discarded`). Skip the announcement only when no edits have touched the target file between the report and the current batch.

  **Partial implementation**: If the user requests specific findings (e.g., "implement 1 and 3"), check whether skipped findings depend on implemented ones. If so, note the dependency and ask whether to include the dependent finding. If the user requests "implement all" or "implement recommended" (synonymous under the default semantics), skip dependency checking and apply every finding in document order except those explicitly tagged `— skip`, `— informational`, or `— no change needed` in the audit report.

  **Edit ordering**: Apply edits in document order (top to bottom) to minimize line-number shifts invalidating later edits. If applying an earlier finding renders a later finding moot (e.g., the target text no longer exists), skip the moot finding and note it in the post-edit verification as "superseded by finding N." If an Edit call fails because a prior edit changed the target text, re-read the file to find the updated text and retry with the corrected `old_string`. If an edit inserts a new numbered step, renumber all subsequent steps and verify that the output summary or other sections referencing step numbers are updated accordingly. When an edit inserts or removes a numbered item, scan preceding edits in the same batch for cross-references to the shifted numbers and fix them in the same edit or immediately after.

  **Cascade edits**: After planning the primary edit(s) for a finding, scan the rest of the file for related text that uses the same terminology, references the same concept, or would become inconsistent if only the finding's target text is changed. Apply cascade edits alongside the finding's primary edit. Cascade discovery may happen at two valid points: (a) per-finding during planning (preferred — matches the scan-after-planning flow above and keeps cascade + primary in the same batch step), or (b) during post-edit verification as a backstop when the per-finding scan missed something. When a cascade is discovered in post-edit verification, apply it immediately and note it in the post-implementation summary as usual. The verification backstop is not a replacement for per-finding scanning — it catches misses; it does not absolve the planning step. Note cascade edits in the post-implementation summary as "cascade from finding N."

  **Post-implementation summary**: After all edits, present a summary table or list showing the status of each finding: "implemented", "superseded by finding N", "cascade from finding N", "co-edit with finding N", or "skipped (reason)". This gives the user a clear per-finding status rather than requiring them to infer outcomes from the edit sequence. List cascade edits as separate table rows keyed `N.cascade` (where N is the originating finding's number); the status column contains `cascade from finding N — <one-line reason>`. If a single finding requires multiple primary edits in different sections of the target skill (neither edit is a cascade of the other — both are co-equal owners of the suggestion), key them `N.a`, `N.b`, etc. Reserve `N.cascade` for edits that merely keep related text consistent with a primary change. When two or more separate findings are resolved by a single shared text edit (their Suggestions collapse onto the same passage), keep each finding as a distinct row in the summary table — key each by its original finding number and use the status `implemented (co-edit with finding M)` on each row to name the partners. Do NOT re-key them as sub-letters; `N.a`/`N.b` is reserved for one-finding-multiple-edits only. This preserves the finding-to-edit relationship so a reader of the status table can reconcile it against the audit's finding count. This keeps per-edit granularity consistent across audits.

  Worked example — status field by case:
  - One finding, three edits: row `1.a` → status `implemented`; row `1.b` → `implemented`; row `1.c` → `implemented`. The keying itself signals co-equality; do NOT add `(co-edit with finding 1.b/1.c)` to the status field.
  - Three findings, one shared edit: row `1` → `implemented (co-edit with findings 4, 7)`; row `4` → `implemented (co-edit with findings 1, 7)`; row `7` → `implemented (co-edit with findings 1, 4)`. Each row names the other partners.

  **Post-edit verification**: After all edits are applied, re-read all edited files (the main SKILL.md and any reference files that were modified) and verify as a single pass:
  1. **No overlap or contradiction** — edits don't conflict with each other
  2. **Cross-references valid**:
     - (a) **Numbering continuity** — step, phase, and section numbers are sequential with no gaps or duplicates. If the file has >150 lines OR >10 numbered references across multiple levels AND the file uses a single consistent numbering convention, prefer grep pattern search (e.g., grep for `Step [0-9]`, `### [0-9]`) to confirm. If the file mixes numbering conventions (numbered top-level steps combined with checkbox items, numbered sub-lists, and bulleted items in the same file — no single grep pattern catches all of them), visual scan via targeted Reads of each numbered block is acceptable. For shorter files with consistent conventions, a visual scan suffices. Adapt grep patterns to the target skill's convention (numbered items, lettered sub-steps, or markdown headers).
     - (b) **File paths valid** — all referenced file paths still exist and point to correct targets.
     - (c) **New cross-references** — references introduced by new text point to content that actually exists. When the target skill uses nested numbering (sub-steps within steps), verify that cross-references disambiguate between levels (e.g., "Step 1, sub-step 5" vs. "Step 5").
     - (d) **Overview diagrams** — high-level overviews that become slightly inaccurate due to new branching logic are acceptable if the detailed step text handles the nuance. Note the discrepancy but do not force-update overview text that would become harder to scan.
  3. **Sequential flow coherent** — the skill reads coherently end-to-end after all edits
  4. **Contextual consistency** — numbering, terminology, and cross-references are consistent with adjacent unchanged text
  5. **Frontmatter integrity** — if any edit touched the YAML frontmatter, verify `---` delimiters are intact and the YAML parses correctly (name, description, and arguments are present and properly quoted)

  If any check fails, fix the offending edit(s), then re-run the full 5-check pass. Do not selectively re-check — a fix in one area can introduce issues in another.
- **Cross-skill consistency** — If the target skill is part of a multi-skill workflow AND any finding affects interfaces shared with sibling skills, scan sibling skills for inconsistencies. Report cross-skill inconsistencies as Issues. Skip when all findings are internal to the target skill.

  **Concrete shared-surface triggers**: A finding affects a shared surface when it changes any of the following:
  - `docs/plans/*.md` design-doc output path or frontmatter conventions (produced by `brainstorm`)
  - `docs/triage/*.md` triage-file format (produced by `brainstorm` for multi-deliverable triages)
  - `brainstorming/*.md` canon-pipeline proposal structure (produced by `skill-creator` in fresh mode; consumed by `skill-creator` in compile mode)
  - `archive/*/` archival destination paths or naming conventions
  - `specs/*.md` or `tickets/*.md` structure and numbering conventions — worldloom does not yet ship with these directories; check for presence before flagging, and if absent, skip this bullet
  - Shared terminology that appears in multiple skills
  - Output format consumed by a downstream skill in the same pipeline (e.g., `brainstorming/*.md` proposals consumed by `skill-creator`; `docs/plans/*.md` design docs consumed by follow-up implementation skills)

  When triggered, list the scanned sibling skills in the audit report alongside what (if anything) was adjusted. If no inconsistency was found, state "Scanned: <skill list> — no inconsistencies." This makes the scan auditable.

  **Scan methods** — pick one based on the finding's shape:
  - (a) **Grep** for the changed terminology or convention across `.claude/skills/*/SKILL.md` when the finding changes a word-level convention (a tag name, a section heading, a keyword, a status label).
  - (b) **Read** a sibling's SKILL.md end-to-end when the finding touches that sibling's declared interfaces or outputs (inputs the sibling consumes, artifacts it produces, templates it references).
  - (c) **Glob + check** when the finding changes a shared-path convention (`archive/*/`, `brainstorming/*.md`, `worlds/<slug>/`, `docs/plans/*.md`, `docs/triage/*.md`).

  Name the method used in the scan announcement so the result is reproducible (e.g., "Scanned `brainstorm`, `skill-creator` via grep for `templates/` references — no inconsistencies" or "Scanned `create-base-world` via read of `templates/*.yaml` + diff against generic source — no inconsistencies"). A scan announcement without a named method is not auditable.

  **Extends to user-directed edits on meta-tooling skills**: The sibling-scan discipline also applies when user-directed follow-up implementation modifies a meta-tooling skill itself (e.g., brainstorm, skill-creator, skill-audit) and the edit touches shared terminology, conventions, or tag semantics — even when the edit is not driven by a finding in the current audit report. Before finalizing such an edit, grep sibling meta-tooling skills for references to the changed terminology or convention, and document the scan in the post-implementation summary ("Scanned siblings: <list> — no inconsistencies" or "<list> — adjusted X in Y").
- **Repeated audit shortcut** — If the same skill has been audited *as the target* 2+ times in the current session and the most recent audit found 0 findings, note "Skill stable — no new session evidence since last audit" and skip the full checklist unless the skill was modified between audits. If the skill was modified since the last audit (including by follow-up implementation from a prior audit), treat the next audit as fresh — do not use the shortcut.
