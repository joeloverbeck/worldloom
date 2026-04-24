---
name: skill-audit
description: "Audit a skill under `.codex/skills/` or `.claude/skills/` against the current Codex session's actual work. Use when asked to review skill quality, missing guidance, unclear steps, or repo-rule alignment without editing the target skill."
user-invocable: true
arguments:
  - name: skill_path
    description: "Path to the target skill directory or its `SKILL.md`."
    required: true
---

# Skill Audit

Audit a Worldloom skill against the work done in the current Codex session and report where the skill is unclear, incomplete, inconsistent, or misaligned with repo rules. Report only. Do not edit the target skill unless the user explicitly asks for follow-up changes after the audit.

Read `AGENTS.md` and `docs/FOUNDATIONS.md` before producing findings if they were not already read earlier in this session.

## Workflow

### 1. Load the target skill

1. Resolve `skill_path` to the exact skill directory and read its `SKILL.md`.
2. Parse the skill's `name`, `description`, workflow steps, and guardrails.
3. If the path is not a skill directory and does not point to a `SKILL.md`, stop and report the error.

### 2. Load alignment context

1. Read `AGENTS.md` if it was not already read earlier in this session.
2. Read `docs/FOUNDATIONS.md` if it was not already read earlier in this session.
3. If the target is a workflow skill, keep `docs/WORKFLOWS.md` in mind as the repo's quick-reference contract.
4. For Codex skills under `.codex/skills/`, check basic fit:
   - concise `SKILL.md`
   - trigger text that clearly states when to use the skill
   - references or scripts only when they reduce repeated agent work

### 3. Reflect on session evidence

Review the current session and extract only evidence-backed observations:
- places where the skill's instructions were unclear, ambiguous, or missing
- steps that had to be skipped, reordered, or improvised
- edge cases or inputs the skill did not anticipate
- outcomes that diverged from what the skill appeared to intend
- steps that were not exercised this session

If auditing `skill-audit` itself, treat the current invocation as weak evidence. Do not invent findings that were not observed.
For self-audits, default to `No issues identified` unless a gap was directly observed in a previous non-self invocation during the same session.

### 4. Cross-check alignment

For each observed gap, check whether the skill:
- contradicts or omits repo rules from `AGENTS.md`
- suggests behavior that would violate `docs/FOUNDATIONS.md`
- uses stale Claude-specific assumptions when the target is meant for Codex
- weakens hard-gate or canon-mutation discipline for workflows that touch world canon

Reference concrete rule sources for alignment or rule-risk findings:
- `AGENTS.md` section names
- `docs/FOUNDATIONS.md` section names
- relevant repo paths when the hazard is operational rather than purely textual

For purely operational skill-quality findings that do not implicate repo rules, cite concrete session behavior and relevant repo paths instead of forcing an `AGENTS.md` or `docs/FOUNDATIONS.md` citation.

### 5. Classify findings

Place each finding in exactly one bucket:
- **Issue**: broken, misleading, contradictory, or likely to cause incorrect behavior
- **Improvement**: existing guidance works but should be refined
- **Feature**: missing capability that fits the skill's stated scope

Also tag severity:
- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`

### 6. Present the audit

Return the report in the conversation using this structure:

```markdown
# Skill Audit: <skill-name>

**Skill path**: <path>
**Session date**: YYYY-MM-DD
**Session summary**: <1-2 sentences on how the skill was used or evaluated>

## Alignment Check

- **AGENTS.md**: <aligned / N deviations found>
- **FOUNDATIONS.md**: <aligned / N violations found>
- **Codex fit**: <aligned / N Codex-specific mismatches found>

## Issues

[If none: "No issues identified."]

1. **[SEVERITY]** <title>
   - **What happened**: <specific session evidence>
   - **Skill gap**: <what the skill says or fails to say>
   - **Why it matters**: <behavioral or alignment impact>
   - **Suggestion**: <specific skill change>

## Improvements

[If none: "No improvements identified."]

1. **[SEVERITY]** <title>
   - **Current behavior**: <what the skill currently says>
   - **Why improve**: <session evidence or tight reasoning>
   - **Suggestion**: <specific refinement>

## Features

[If none: "No features identified."]

1. **[SEVERITY]** <title>
   - **What's missing**: <missing guidance or capability>
   - **Why it fits**: <why this stays inside the skill's stated scope>
   - **Suggestion**: <specific addition>

## Not Exercised

- <step or area not exercised this session>

## Summary

**Total**: N issues, N improvements, N features - N CRITICAL, N HIGH, N MEDIUM, N LOW
```

## Guardrails

- Report only during the audit phase. Do not edit the target skill unless the user explicitly asks for implementation after seeing the report.
- Do not speculate. If a step was not exercised this session, place it under `Not Exercised` instead of turning it into a finding.
- Every Issue and Improvement must be backed by concrete session evidence.
- Reject any proposed suggestion that would violate `docs/FOUNDATIONS.md`.
- Keep scope discipline. Audit the skill as written; do not expand it into a different tool.
- If the skill participates in a multi-skill workflow, check sibling skills for conflicting terminology, paths, or handoff assumptions and report concrete inconsistencies.
- When follow-up edits are requested, snapshot `git status --short`, distinguish pre-existing dirty work from the skill-edit ownership, apply suggestions in document order, and then re-read the changed sections to confirm the workflow still reads coherently. Final-report only the skill files changed by the follow-up, while noting any pre-existing unrelated dirt was left untouched.
