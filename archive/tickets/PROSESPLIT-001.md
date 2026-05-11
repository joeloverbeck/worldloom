# PROSESPLIT-001: Extract reports/prose-quality-instructions.md from canonical skill references

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — new derivative artifact at `reports/`; canonical sources unchanged.
**Deps**: None

## Problem

The plan-and-finalize rework (`docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md`) relocates creative prose generation outside Claude Code. External rendering — manual or OpenRouter Opus 4.7 — needs a self-contained instruction artifact bundling the content_policy block, the Prose Craft Contract, the render-time instruction template, and the anti-pathology checklist. Without this artifact, the prose-quality discipline currently embedded in the two prose-producing skills' Phase 7 references is the only authoritative source, and it is not in a form an external prompt can consume.

This ticket extracts that material into `reports/prose-quality-instructions.md` as a derivative artifact while preserving the canonical sources unchanged. The report becomes the user's external-renderer prompt body; the skills' references remain source-of-truth for in-skill consumers (plan §3 inlining, finalize Phase 3 critic).

## Assumption Reassessment (2026-05-10)

1. Canonical Prose Craft Contract lives at `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md`. Verified file exists with 11 numbered rules + Diagnostic Vocabulary table.
2. Canonical content_policy block is embedded verbatim at `.claude/skills/branching-story-page-cycle/templates/content-policy.txt` and `.claude/skills/branching-story-bootstrap/templates/content-policy.txt`. Verified both files are byte-identical NC-21 blocks; either is a valid extraction source.
3. Render-time instruction body is split between `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-render.md` and `.claude/skills/branching-story-page-cycle/references/phase-7-page-render.md`. Both files contain the LLM-facing instruction prose between the prompt-assembly block and the post-render-critic block. Extraction must deduplicate (the bootstrap version is scene-setter-flavored; the page-cycle version is multi-beat-arc-flavored) into one canonical render-time instruction template that works for both contexts.
4. 8-axis Diagnostic Vocabulary table at `prose-craft-contract.md` §Diagnostic Vocabulary is the source for the report's "anti-pathology checklist." Reformatting from "what the critic flags" to "what to avoid" is a presentation change only; rule numbers (1-11) remain the citation index.
5. Cross-skill / cross-artifact boundary under audit: the prose-craft-contract-as-canonical-source stays inside the page-cycle skill; the report is a separate file with no upstream consumers, so the contract's edit history remains the authoritative changelog.
6. FOUNDATIONS principles under audit: Rule 1 (No Cosmetic Output) — the report is load-bearing once the skills stop producing prose, since it becomes the external renderer's discipline contract. Rule 7 (Mystery Reserve Preservation) — the report does not enumerate forbidden M for any specific story; per-story forbidden_resolutions are inlined into each plan file at plan-authoring time, never into this report.
7. Schema extension classification: not applicable — no record schema is touched.
8. Adjacent contradictions: the design doc's "Rule 7 firewall split" (plan-time vs finalize-time) does not require any change to the report; the report just describes the prose-quality discipline, not the firewall mechanism.

## Architecture Check

1. Single-source-of-truth posture preserved: the report extracts FROM the skill references, never inverts the dependency. Skill references stay editable; the report is regenerated when material drifts.
2. No backwards-compatibility shims. The report is a brand new file; no aliasing.
3. Alternative considered: symlink the report to one of the existing references. Rejected because (a) the report consolidates THREE source surfaces (contract + content_policy + render-time instruction) into one artifact, (b) external consumers would not understand a symlink, (c) the report's framing (external-renderer-facing prose) differs from the references' framing (in-skill phase prose).

## Verification Layers

1. Report contains verbatim content_policy block → grep-proof for the NC-21 block's literal string in `reports/prose-quality-instructions.md`.
2. Report contains verbatim Prose Craft Contract Rules 1-11 → grep-proof per rule heading (`## 1.`, `## 2.`, ... `## 11.`) in the report file.
3. Report contains the 8-axis Diagnostic Vocabulary terms (`filter_word_saturation`, `recurring_metaphor_across_pages`, `identical_anchor_recurrence`, `self_narrating_self`, `bracket_paraphrasing_dialogue`, `ledger_jargon_leakage`, `abstract_noun_saturation`, `padding_or_truncation`) → grep-proof.
4. Report's render-time instruction block deduplicates the bootstrap and page-cycle phase-7 instruction prose into a single canonical block → manual review against both source files.
5. Canonical sources at `prose-craft-contract.md` and `templates/content-policy.txt` are byte-unchanged → git diff inspection shows the report is the only modified file in this ticket's scope.

## What to Change

### 1. Create `reports/prose-quality-instructions.md`

Six sections in this order:

1. **Content Policy** — verbatim from `.claude/skills/branching-story-page-cycle/templates/content-policy.txt` wrapped in a `<content_policy>...</content_policy>` block (matching the existing template's tag wrap).
2. **Prose Craft Contract** — verbatim from `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md` (all 11 rules + Diagnostic Vocabulary table). Preserve exact rule numbering and worked examples.
3. **Render-time instruction template** — deduplicated extraction of the LLM-facing instruction prose from both phase-7 references. Generic enough to cover both root scene-setter and multi-beat arc rendering.
4. **Anti-pathology checklist** — the 8-axis table reformatted as "what to avoid" prose, preserving the diagnostic vocabulary terms as verbatim citation tokens.
5. **Voice / register guidance** — Rule 7 (substrate, not checklist) extracted into a standalone caveat addressed to the external renderer.
6. **External-renderer usage guide** — concatenation order: plan body (§1-§19 of `pages-prose-plans/PG-NNNN.md`) followed by §3 of this report; expect continuous prose output only; no commentary, no markdown headers, no engine vocabulary.

Top-of-file block notes the report is a derivative artifact regenerated by re-extracting from the canonical sources; cite the canonical source paths.

### 2. No changes to canonical sources

`.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md`, `.claude/skills/branching-story-bootstrap/templates/content-policy.txt`, `.claude/skills/branching-story-page-cycle/templates/content-policy.txt`, and the two phase-7 reference files are unchanged in this ticket. Canonical-source modifications happen in PROSESPLIT-006 / PROSESPLIT-007 when the skill phases are reworked.

## Files to Touch

- `reports/prose-quality-instructions.md` (new)

## Out of Scope

- Any change to skill files, validator code, hooks, or schemas.
- Any change to the canonical Prose Craft Contract or content_policy.
- Adding a re-extraction script or automation; manual re-extraction is acceptable since the contract changes infrequently.
- Per-story forbidden_resolutions enumeration; that lives in per-page plan files, not in this report.

## Acceptance Criteria

### Tests That Must Pass

1. `test -f reports/prose-quality-instructions.md` succeeds.
2. `rg -n "RATING: NC-21" reports/prose-quality-instructions.md` matches at least once.
3. `rg -nc "^## (\d+|\d+\.) " reports/prose-quality-instructions.md` shows ≥11 rule headings (the 11 Prose Craft Contract rules).
4. `rg -n "filter_word_saturation|recurring_metaphor_across_pages|identical_anchor_recurrence|self_narrating_self|bracket_paraphrasing_dialogue|ledger_jargon_leakage|abstract_noun_saturation|padding_or_truncation" reports/prose-quality-instructions.md` matches all 8 axes.
5. `git diff --name-only HEAD` lists `reports/prose-quality-instructions.md` as the only added file.

### Invariants

1. The canonical Prose Craft Contract at `.claude/skills/branching-story-page-cycle/references/prose-craft-contract.md` remains byte-unchanged.
2. The canonical content_policy templates at `.claude/skills/*/templates/content-policy.txt` remain byte-unchanged.
3. The report does not contain per-story forbidden_resolutions or per-bundle context — it is render-discipline only.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based.

### Commands

1. `rg -n "RATING: NC-21" reports/prose-quality-instructions.md`
2. `rg -nc "^## (\\d+\\.) " reports/prose-quality-instructions.md`
3. `rg -n "filter_word_saturation|recurring_metaphor_across_pages|identical_anchor_recurrence|self_narrating_self|bracket_paraphrasing_dialogue|ledger_jargon_leakage|abstract_noun_saturation|padding_or_truncation" reports/prose-quality-instructions.md`
4. `git diff --stat .claude/skills/branching-story-page-cycle/references/prose-craft-contract.md` — must show no changes.
5. `git diff --stat .claude/skills/branching-story-bootstrap/templates/content-policy.txt .claude/skills/branching-story-page-cycle/templates/content-policy.txt` — must show no changes.
