---
name: skill-consolidate
description: "Consolidates a skill's SKILL.md by removing redundancies, regrouping fragmented topics, improving readability, and clarifying decision paths — while preserving every unique instruction."
user-invocable: true
arguments:
  - name: skill-path
    description: "Path to a skill directory (targets its SKILL.md) or a direct path to a markdown file under a skill's references/ subdirectory (e.g., .claude/skills/canon-addition or .claude/skills/canon-addition/references/example.md)"
    required: true
---

# Skill Consolidate

Structural consolidation for skill files that have grown organically through iterative skill-audit improvement cycles. Removes redundancy, regroups fragmented topics, restructures for readability, and clarifies scattered decision paths — while preserving every unique instruction.

Complements skill-audit: skill-audit reports issues and suggests additions (growth). skill-consolidate removes structural entropy (pruning). Together they form a quality cycle.

## Invocation

```
/skill-consolidate <skill-path>
```

**Arguments** (required, positional):
- `<skill-path>` — path to either a skill directory (targets `<skill-path>/SKILL.md`, e.g., `.claude/skills/canon-addition` or `.claude/skills/brainstorm`) OR a direct path to a markdown file under `<skill-path>/references/` (e.g., `.claude/skills/canon-addition/references/example.md`). Reference files are valid consolidation targets; the frontmatter-preservation guardrail is vacuous for them since reference files have no frontmatter.

If the argument is missing, ask the user to provide it before proceeding.

## Worktree Awareness

If working inside a worktree (e.g., `.claude/worktrees/<name>/`), ALL file paths — reads, writes, globs, greps — must use the worktree root as the base path.

## Process

Follow these 9 steps in order. Do not skip any step.

---

### Step 1: Read & Parse

Resolve the target file from `<skill-path>`:
- If `<skill-path>` ends in `.md`, treat it as a direct file target and read that file. The frontmatter-preservation guardrail is vacuous (reference files have no frontmatter); all other process steps apply normally.
- Otherwise, treat `<skill-path>` as a skill directory and read `<skill-path>/SKILL.md`.
- If the resolved file does not exist, stop and report the error.

**Oversize-file handling.** If the file exceeds the Read tool's token limit (currently 25000 tokens), read it in sequential offset/limit chunks that cumulatively cover the full file. Track the cumulative line range across reads to ensure complete coverage — partial reads that silently miss content undermine Step 8's preservation check (which can only verify content the consolidator knows existed in the original). Consolidation requires complete coverage; topic-targeted partial reads (acceptable for skill-audit Step 2's FOUNDATIONS.md scan) are not sufficient here.

Parse into logical blocks:
- **Frontmatter**: YAML metadata between `---` delimiters (SKILL.md targets only)
- **Sections**: Top-level headings (`##`) and their content
- **Subsections**: Nested headings (`###`, `####`)
- **Instruction lists**: Bullet points, numbered lists, inline directives
- **Guardrails**: Typically the final section with constraint bullets

Measure baseline with `wc -lc <target-file>` (or equivalent) and record the exact line and character counts. These numbers feed the Step 9 summary verbatim; do not estimate.

The "before" baseline for Step 9 metrics is the file content as read in this step, regardless of git state.

**Recommended at consolidate start.** When the target skill ships a `references/` or `templates/` subdirectory, list the directory contents alongside reading SKILL.md. This surfaces content that may already live in a template (informing factor-out moves to template references rather than tightening duplicated inline content) and lets you verify cited paths actually resolve. Skip this recommendation only when the target is structurally a single SKILL.md with no subdirectories.

---

### Step 2: Redundancy Detection

Scan for instructions that appear in multiple locations with the same semantic content. Two instructions are redundant if removing either would leave the other sufficient — even if the wording differs.

For each redundancy cluster:
1. **Identify all instances**: Note the instruction text and its location (section + approximate position)
2. **Pick the canonical location**: Where the instruction is most contextually relevant (e.g., a "reassess before coding" instruction belongs in the reassessment section, not in guardrails). When wordings differ, select the version whose surrounding context is most natural.
3. **Check for unique details**: Before discarding non-canonical copies, verify they contain no unique detail (a qualifier, an example, a caveat) that the canonical version lacks — if they do, fold that detail into the canonical version.
4. **Mark non-canonical instances for removal**
5. **Record** the cluster for the diff summary

Common redundancy patterns to watch for:
- Principle restated in introduction, section body, AND guardrails
- The same corrective action described in multiple workflow phases
- "Do not X" warnings scattered across unrelated sections
- File/field lists repeated in multiple contexts (e.g., "update Files to Touch, Verification Layers, Test Plan" appearing 3+ times)
- Table rows duplicated across multiple summary tables (e.g., a "Validation Rules This Skill Upholds" table and a broader "FOUNDATIONS Alignment" table both mapping the same Rule X to the same Phase Y mechanism — the per-rule/per-principle decomposition causes overlap that's easily missed in a sequential read but detectable by row-key scan)

When the same technique or surface list appears at multiple workflow phases with genuinely different purposes (check vs. include in scope vs. implement), define the shared content once at its most natural location and replace other instances with cross-references. This is not pure redundancy removal — it is factoring out a shared reference.

---

### Step 3: Topic Regrouping

Identify instructions about the same topic that are scattered across multiple sections. A topic is fragmented when a reader must jump between multiple sections to get the full picture — typically 3+, but 2 sections suffice when one location is clearly the wrong home.

Clusters often exhibit both redundancy (Step 2) and fragmentation. Classify by the dominant feature; the Step 9 category counts are descriptive, not exclusive — a single cluster reported under Redundancies Merged need not also appear under Topics Regrouped.

For each fragmented topic:
1. **Collect all instructions** related to that topic from all sections
2. **Choose the natural home**: The workflow phase where the topic is most relevant
3. **Create a dedicated subsection** (or extend an existing one) at that location
4. **Move instructions** from their scattered locations into the consolidated subsection
5. **Record** the regrouping for the diff summary

Do not change the overall section ordering (workflow phases stay in sequence). Only move content within or between sections.

---

### Step 4: Readability Restructuring

Identify wall-of-text patterns that hurt scannability:
- **Long flat lists**: 20+ consecutive bullets without sub-headings or grouping
- **Dense paragraphs**: Paragraphs with 5+ distinct instructions packed together
- **Missing hierarchy**: Sections that mix high-level principles with low-level details at the same indent level

For each pattern:
1. **Introduce sub-headings** that group related bullets by theme (e.g., "Type-change checks", "Serialization checks", "Test fixture checks")
2. **Add tiered structure**: High-level summary first, details nested beneath
3. **Break dense paragraphs** into focused bullets or numbered steps
4. **Record** the restructuring for the diff summary

**Within a list item**: when the wall-of-text is itself a numbered- or bulleted-list item, markdown headings (`###`) are unavailable — adding them would break the enclosing list. Achieve the same tiered structure with a lead summary line (or short paragraph) followed by nested bold-led bullets, so the restructure does not disturb the list's numbering.

---

### Step 5: Decision Path Clarification

Identify escalation or branching instructions that are mentioned repeatedly without unified guidance. Signs: the same "when you hit X" pattern appears in 3+ places, each with slightly different advice or no clear resolution path.

For each scattered decision path:
1. **Collect all mentions** of the decision/escalation pattern
2. **Unify** into a single explicit structure: a decision table, a "when X → do Y" list, or a flowchart-style description
3. **Place** the unified structure at the most relevant workflow phase
4. **Replace scattered mentions** with brief cross-references to the unified structure. Use descriptive section references (e.g., "see Section 3, Escalation decision tree") over bare section numbers, since numbers may shift in future consolidation passes.
5. **Record** the clarification for the diff summary

**Cross-reference hygiene**: Repairing broken or obsolete cross-references (e.g., a "see Section 1" pointer to a section that no longer exists in the current file, or references to content that has moved to another file) AND adding new cross-references when factoring out a shared reference (Step 2's cross-reference replacement pattern) are both in-scope consolidation hygiene, not scope expansion. Log each repair or addition in the Step 9 summary under "Cross-reference Hygiene" so the change is visible in the diff surface.

---

### Step 6: Tighten Wording

For non-redundant instructions (those surviving Steps 2-5), tighten prose:
- Shorten sentences without losing meaning
- Remove filler words ("it is important to note that" → remove)
- Prefer active voice ("The ticket should be updated" → "Update the ticket")
- Eliminate hedging where the instruction is unconditional ("You should always check" → "Check")
- Compress repeated structural patterns ("When X, do Y. When X2, do Y2." → table or compact list)

**Critical constraint**: Never change the meaning of an instruction. If unsure whether tightening alters meaning, keep the original wording.

---

### Step 7: Rewrite

Before writing, briefly summarize planned changes in the conversation so the user sees what will change before the file is overwritten. The pre-write summary is an abbreviated version of the Step 9 categories: one short bullet per category, optionally with sub-bullets when multiple distinct changes within the category warrant explicit listing. Match Step 9's zero-count convention — include any category with no findings as a brief one-line note so the reader sees the category was considered. Keep total pre-write summary under ~15 lines. Not the full diff summary.

The summary is presentational, not approval-gating — proceed to writes immediately. The user can interrupt if they want changes (Auto Mode applies).

Write the consolidated file in-place at the path resolved in Step 1 — `<skill-path>` directly when `<skill-path>` ends in `.md`, otherwise `<skill-path>/SKILL.md`.

**Tool preference**: Use the Edit tool with targeted `old_string` / `new_string` pairs for surgical consolidations (the common case — most consolidations remove redundancies and restructure specific regions while leaving the bulk of the file unchanged). Reserve the Write tool for full rewrites where the file structure changes wholesale (uncommon — typically only when consolidation amounts to extraction-style restructuring parallel to skill-extract-references workflows). Edit calls preserve unaltered regions byte-for-byte and reduce the risk of accidentally dropping content that Step 8's sampled spot-check might miss; full Write rewrites require reconstructing every line from memory and concentrate that risk into a single tool call.

**Major-rewrite preserve list**: For major rewrites — defined as either (a) ≥50 lines being restructured wholesale (e.g., entire ASCII diagrams, full sections collapsed), OR (b) any source block carrying ≥~8 distinct instructions being restructured, regardless of line count (a dense mega-bullet — one or a few "lines" packing many instructions, the characteristic shape of heavily-audited skills — is the common low-line-count / high-instruction-count case) — enumerate the distinctive terms / load-bearing phrases from the source block as an explicit preserve list BEFORE writing the new version. Step 8's spot-check grep then verifies each item; the pre-write enumeration prevents drops rather than detecting them.

The rewritten file must:
1. **Preserve frontmatter exactly** — do not modify name, description, arguments, or any YAML field
2. **Maintain workflow phase ordering** — if the original has phases 1-7 in sequence, the consolidated version keeps the same logical sequence
3. **Contain every unique instruction** — deduplicated, regrouped, tightened, but present
4. **Use the same markdown conventions** — heading levels, list styles, code block formatting consistent with the original

---

### Step 8: Spot-Check Preservation

After writing, spot-check 3-5 unique instructions from the original (preferring instructions from different sections) to confirm each survives in the consolidated output. Prefer `Grep` with an alternation pattern of distinctive phrases over re-reading — one call can verify several unique instructions at once. Inspect the alternation grep's matched lines per-phrase (e.g., `grep -n`), not merely its match count — an aggregate `-c` count can mask a dropped phrase (another phrase matching an extra line yields the same total) and does not satisfy the per-element preservation check. For restructured passages (e.g., a paragraph broken into bullets), grep a distinctive phrase from each element to confirm per-element preservation. If any instruction was lost, restore it before presenting the diff summary.

Also verify frontmatter byte-identical: re-read the frontmatter from the rewritten file and confirm every YAML field (name, description, arguments, user-invocable, and any others) matches the original character-for-character. Any difference fails the preservation check and must be repaired before Step 9.

---

### Step 9: Diff Summary

After writing, present a structured summary in the conversation:

```
## Consolidation Summary: <skill-name>

**Size**: <before chars> → <after chars> (±X.X%) — use `−` for shrink, `+` for grow
**Lines**: <before> → <after> (±N) — use `−` for shrink, `+` for grow (lines may increase when dense paragraphs are broken into structured lists)

### Redundancies Merged (<count>)
- "<instruction summary>" — was in <N> locations, canonical: <section name>

### Topics Regrouped (<count>)
- "<topic>" — consolidated from <source sections> into <target section>

### Sections Restructured (<count>)
- "<section>" — <what changed> (e.g., "53 bullets → 5 themed sub-groups")

### Decision Paths Clarified (<count>)
- "<topic>" — unified from <N> mentions into <structure type>

### Wording Tightened (<count>)
- Examples: 2-3 representative samples (no semantic changes) — literal "<before>" → "<after>" when the change is a single-string substitution, or descriptive ("<phrase> — <what changed and why>") when the change is a multi-sentence restructure.

### Cross-reference Hygiene (<count>)
- "<before>" → "<after>" — reason (e.g., "Section 1 no longer exists in this file; target now lives in SKILL.md Step 1", or "added 'see Output § Diegetic artifact file' when removing duplicated canon-file list from Guardrails")

### Observations (if any)
[Notable observations not captured elsewhere — gaps not filled (per No Scope Expansion guardrail), residual redundancies retained by judgment, structural trade-offs, candidates for a future consolidation pass.]
```

**Cross-reference Hygiene counts**: This category counts both (a) repairs of broken or obsolete cross-references and (b) new cross-references added when factoring out a shared reference per Step 5 §Cross-reference hygiene. A factor-out edit that introduces a "see §X" pointer to replace inlined content counts as one Cross-reference Hygiene entry — it is the visible cost of the factor-out, not a free byproduct. Counting only repairs (omitting added forward-references) understates the diff surface and breaks audit-trail reconstructibility for future consolidation passes. Cross-reference Hygiene is an edit-counting axis, not a cluster-classification axis: a factor-out reported under Redundancies Merged (or Topics Regrouped) STILL contributes its introduced pointer to the Cross-reference Hygiene count. The "descriptive, not exclusive" rule in Step 3 governs cluster-category overlap (Redundancies Merged vs. Topics Regrouped) only — it does not exempt the edit-counting categories.

Categories with 0 findings: include the heading with `(0)` and a one-line note explaining why the category didn't apply (preserves audit trail showing the category was considered, not skipped).

Do NOT commit. Leave the file for user review via `git diff`.

---

## Guardrails

- **Semantic preservation**: Every unique instruction in the original must survive in the output. Redundant copies are removed; the canonical instance remains. When in doubt about whether two instructions are truly redundant, keep both.
- **Frontmatter untouched**: Never modify the YAML frontmatter (name, description, arguments, user-invocable, or any other field).
- **No scope expansion**: Do not add new instructions, features, guardrails, or edge-case handling. This is consolidation, not improvement. If you notice a gap, mention it in the diff summary under a "Observations" section but do not fill it.
- **No commit**: Write the file and stop. The user handles the file lifecycle.
- **Worktree discipline**: If working in a worktree, ALL file operations use the worktree root path.
- **Path-agnostic**: Works on skills at any user-provided path (typically under `.claude/skills/`).
- **Idempotency**: Running the skill twice on the same file should produce minimal or no further changes. If a skill is already well-consolidated, say so and make no edits.
