---
name: skill-extract-references
description: Extract logically grouped content from a bloated SKILL.md into references/ docs, rewriting the skill as a thin entry point. Argument: path to the skill directory (e.g., .claude/skills/canon-addition or .claude/skills/propose-new-canon-facts).
---

# Skill Extract References

Refactor a skill by extracting large, logically grouped content blocks into `references/` docs and rewriting the SKILL.md as a thin orchestration entry point.

**Argument**: A skill directory path (e.g., `.claude/skills/canon-addition`). The skill locates `SKILL.md` inside it automatically.

## Procedure

### 1. Read Inputs

- Resolve the argument to an absolute path. Confirm `<skill-dir>/SKILL.md` exists before proceeding. If the skill directory contains no SKILL.md, stop and report the error.
- Read `<skill-dir>/SKILL.md` in full. If the file exceeds Read tool limits, read in chunks using offset/limit. Ensure complete coverage before proceeding to Step 3.
- List `<skill-dir>/references/` if it exists. Read every existing reference doc to understand what is already extracted.

### 2. Early Exit Check

If the SKILL.md is under 60 lines, output "Nothing to extract — SKILL.md is already thin (N lines)." and stop. Also exit if the SKILL.md already contains 3+ load instructions pointing to `references/` — it is already in thin form.

### 3. Parse into Blocks

Split the SKILL.md into logical blocks using markdown structure:
- H2 (`##`) and H3 (`###`) headers define block boundaries.
- **Bold-text bullet-list items as effective block boundaries**: when an H2 section is dominated by bold-text bullet-list items that each carry multiple paragraphs of sub-content (typical pattern in Guardrails sections that grew organically rather than as planned H3 sub-sections), treat each bold-text bullet as an effective block boundary, parallel to H3. Apply the same classification (Step 4) and grouping (Step 5) rules to these synthetic blocks.
- Numbered list groups and fenced code blocks within a header section belong to that block.
- The YAML frontmatter is always **core** — never extracted.
- The top-level title (H1) and any immediately following paragraph before the first H2 is **core**.

### 4. Classify Each Block

For each block, determine one of three categories:

- **Core** — stays inline in the thin SKILL.md. This includes:
  - The frontmatter and H1 title.
  - The top-of-file `<HARD-GATE>` block (when present in canon-mutating or content-generating skills) — appears immediately after the H1 + intro paragraph and encodes approval-token discipline; stays inline as core, parallel to the Step 7 §Commit / HARD-GATE phases stay inline rule. Distinct from procedure-step HARD-GATE phases (which Step 7 also keeps inline as a separate sub-bullet) — this is the structural top-of-file block that hooks reference and that Hook 3 ties to the approval-token machinery; extracting it to a reference doc would weaken the safety contract's visibility in the thin SKILL.md by the same rationale that keeps Phase-N HARD-GATE phases inline.
  - The top-level workflow/procedure steps (the numbered orchestration sequence).
  - Universal hard rules that are short and apply to every invocation.

- **Always-loaded reference** — a self-contained block that applies to every invocation but is large enough (roughly 20+ lines) to warrant extraction. Examples: verification checklists, guardrails sections, outcome definitions.

- **Conditional reference** — a block gated by a **section-level loading condition** in the original text. Look for headers or introductory sentences that gate an entire section's applicability:
  - "If the change touches X, ...", "Only when Y applies, ...", "For tickets that involve Z, ..."
  - Blocks nested under a conditional header or prefaced by a section-level conditional sentence.
  - The condition from the original text becomes the loading instruction in the thin SKILL.md.
  - Note: Individual bullets that start with "When..." inside an always-applicable checklist are domain-specific conditional logic, not loading-condition gates. Do not classify an entire section as conditional just because its bullets use "when" language.

**When ambiguous**: default to always-loaded. It is safer to load too much than to miss instructions that should have applied.

### 5. Group and Name

- Merge blocks that share a logical theme into a single reference doc. Do not create one reference per H3 — group by coherent topic. If two adjacent original steps share a reference doc and form a natural unit, they may be merged into a single thin step. Preserve the original step or phase numbers in the heading (e.g., "Steps 5-6", "Phase 12a: Required Update List") for traceability.
- Cross-cutting meta-sections (FOUNDATIONS Alignment tables, Validation Rules This Skill Upholds, Record Schemas, Guardrails) are typically grouped into a single `governance-and-foundations.md` reference rather than split per section, since they serve the same audit-trail reading mode.
- Use kebab-case descriptive filenames: `canon-layer-validation.md`, `hard-gate-discipline.md`, `id-allocation.md`.
- If an existing reference doc in `references/` covers the same theme, merge the extracted content into it rather than creating a duplicate.

### 6. Write Reference Docs

- Create `<skill-dir>/references/` if it does not exist.
- Write each reference doc with:
  - An H1 title describing its purpose.
  - The extracted content, preserving its original structure (headers, lists, code blocks). When the extracted section's original top-level was H2 and becomes H1 in the reference doc, promote its H3 sub-sections to H2 so the hierarchy stays continuous — do not leave H1→H3 gaps.
- Do not add frontmatter to reference docs — they are plain markdown loaded by the thin SKILL.md.
- When extracted content contains **true relative paths** (e.g., `./foo.png`, `../sibling-dir/bar.md`), prepend `../` to account for the extra `references/` depth. Conceptual anchors like `templates/...`, `worlds/<slug>/...`, and `docs/FOUNDATIONS.md` are understood as skill-root or repo-root relative — leave them unchanged.
- **Update inter-block §-anchor cross-references when blocks move to different reference docs.** When extracted content contains §-anchor cross-references that previously pointed to other H2/H3 sections in the same SKILL.md (e.g., "see Guardrails §Cross-skill consistency", "per the §Cascade edits sub-rule"), rewrite each to point to the reference doc the target now lives in (e.g., "see `references/cross-skill-consistency.md`", "per `references/cascade-and-summary-discipline.md` §Cascade edits"). Do the rewrite AFTER all reference docs are written and named (the rest of this Step completes), so each cross-reference can resolve to a known destination. A single-pass sweep at the end of Step 6 catches drift before Step 8's content-preservation verification, where the standard scan won't catch it (Step 8 verifies header presence, not anchor resolvability).
- **Oversized reference docs (polish step, not a correctness requirement).** If a reference doc grows large after extraction (e.g., >150 lines), consider whether it should be further sub-split into 2 thematically-coherent files. Common pattern: a "discipline" reference doc combining Quick-reference tables and Worked examples may benefit from splitting into `<theme>-discipline.md` (rules + tables) plus `<theme>-worked-examples.md` (case-by-case examples). Defer this when the larger file's content is tightly interleaved or when a future skill-audit / skill-consolidate cycle would naturally split it.

### 7. Rewrite Thin SKILL.md

- **Preserve** the YAML frontmatter exactly as-is.
- **Preserve** the H1 title.
- Write the core workflow as a numbered list of steps. Each step is either:
  - An inline instruction (for core content that stayed), or
  - A load instruction pointing to a reference file:
    - Unconditional: "Load `references/verification-and-closeout.md`."
    - Conditional: "If the skill mutates canon-level files, load `references/hard-gate-discipline.md`."
- **Phase-structured source skills**: If the source skill is structured as numbered phases (Phase 0 / Phase 1 / ... as H2 sections) instead of a pre-existing Procedure list, collapse contiguous phases into a small number of Procedure steps — each carrying a load instruction to the reference doc covering those phases. Reference docs preserve the original phase H2 headers for traceability (see Step 5). Example: `"Phases 7-11: Counterfactual, Contradiction, Repair, Narrative Fit, Adjudication. Load \`references/counterfactual-and-verdict.md\`."` Renumbering happens only at the thin SKILL.md orchestration layer; reference doc body prose continues to use the original phase/step labels per the Step-numbering continuity rule below.
- Non-workflow core sections (e.g., invocation details, argument/output declarations including file-class tables and ID-convention blocks, background context, diagrams) stay inline as regular markdown sections. The numbered step list covers only the procedural/orchestration flow.
- **Procedural content nested in Guardrails should be lifted to the numbered Procedure list.** When the source SKILL.md has procedural content nested under Guardrails as a sub-rule (organic-growth pattern, typically when an originally-pure guardrail accumulated workflow logic over time), lift it to a numbered Step in the thin SKILL.md's Procedure list when it represents a distinct procedural phase. Common case: a conditional follow-up phase (e.g., "After the report is presented, if the user requests implementation, ...") belongs as a numbered Step with conditional language, not as a Guardrails sub-rule whose load instructions only fire when the reader recurses into the guardrail. The Procedure list is the orchestration spine; conditional follow-up phases live there.
- **Commit / HARD-GATE phases stay inline**: phases encoding HARD-GATE approval + deterministic write-ordering (typically the Commit / Phase-N step in canon-mutating and content-generating skills) stay inline — the skill's safety-and-sequencing contract must be visible in the thin SKILL.md, not loaded from a reference doc. Drop-list behavior, partial-failure recovery notes, and the ordered write sequence belong in the thin SKILL's procedure list, even when the step runs 20+ lines. This parallels skill-creator's convention that the Commit / Write phase is a distinct structural element following the final validation phase.
- **Step-numbering continuity**: If the thin SKILL's orchestration list renumbers the original steps (e.g., original Steps 0–8 collapsed to 1–7, or original Phases 0–15 collapsed to Procedure steps 1–5), avoid numeric cross-references in reference doc *body prose* that would point at the *old* numbering. Prefer descriptive phrasing ("the dump-reading step", "the triage checkpoint") over numeric references ("Step 2", "Step 3"). If a numeric reference is unavoidable, tie it to the thin SKILL's numbering so readers toggling between files see consistent step numbers. (This does not conflict with Step 5's guidance on preserving original step or phase numbers in reference doc *section headings* for traceability — headings label source provenance, body prose should track current structure.) Process Flow ASCII diagrams (and similar inline orchestration overviews) preserve the original Step/Phase labels for traceability — the Procedure list maps each procedure step to original Steps via citation in load-instruction prose, so the diagram-vs-procedure mismatch is intentional. Do not renumber the diagram to match the Procedure. Worked example: original "Step 4 §HARD-GATE need" inside an extracted reference doc → "the gap-filler interview §HARD-GATE need" (descriptive name based on the original step's primary activity, preserved §-anchor).
- **Diagrams stay inline regardless of size**: Process Flow ASCII diagrams and similar inline orchestration overviews stay inline in the thin SKILL.md regardless of size — they are the canonical orchestration overview readers consult on every invocation, so do not extract a Process Flow diagram to a separate reference doc even when it occupies a substantial fraction of the thin SKILL.md. This is a Core classification decision that overrides the "always-loaded reference for blocks ≥20 lines" heuristic from Step 4. Worked precedent: the branching-story-page-cycle refactor's ~108-line diagram occupied ~28% of the resulting 381-line thin SKILL.md and was correctly kept inline. Second worked precedent: the storylet-pool-authoring refactor's ~110-line Process Flow diagram occupied ~33% of the resulting 333-line thin SKILL.md and was correctly kept inline by the same rationale.
- **Size targets**: typical thin SKILL.md targets 30–50% of the original line count for canon-mutating / content-generating skills (where the inline Process Flow diagram + top-of-file `<HARD-GATE>` block + Commit/HARD-GATE phases form a substantial structural floor). For meta-tooling skills with no diagram and no HARD-GATE block, target ≤30% of the original. These are calibration anchors, not hard limits — diagram-heavy or HARD-GATE-heavy skills correctly land higher; checklist-heavy skills correctly land lower. The structural drivers (diagram, HARD-GATE block, Commit/HARD-GATE phases) determine where on the range a given skill should land. Worked precedents: branching-story-page-cycle 1140 → 381 lines (~33%, diagram + HARD-GATE drove the floor); storylet-pool-authoring 637 → 333 lines (~52%, ~110-line diagram + HARD-GATE block + inline Phase 6/7 drove a higher proportion).
- **Preserve** universal hard rules as a short section at the bottom. If the original Guardrails section is too long to fit as a short section, keep a summary of the 4-6 load-bearing rules inline and place the full list in a reference doc (commonly the `governance-and-foundations.md` reference when one exists). The inline summary must include any HARD-GATE enforcement, path-scope constraints, and any rule whose violation would corrupt the skill's primary contract or bound destructive actions. Operational style rules (interview cadence, rationale-bullet counts, size targets), citation-discipline rules (do-not-duplicate-FOUNDATIONS, cross-reference rather than inline), and exit-handling rules typically belong in the full reference rather than the inline summary.
- The thin SKILL.md should read as a clear, scannable orchestration sequence — not a wall of checklists.
- Each step may include a brief framing sentence (1-2 sentences) before or after the load instruction to preserve workflow context (e.g., what the step's purpose is, what to do with results). For steps where the load instruction is the primary content, integrate it naturally (e.g., "Load `references/codebase-validation.md`. Validate every reference from Step 2.") rather than making it a standalone directive.

#### Worked example — Phase-router pattern

When a source skill is structured as Pre-flight + Phases 1-N (with optional half-phases like Phase N.5 for sub-phases), the result of skill-extract-references is essentially a phase-router thin SKILL.md: each Procedure step loads a phase reference doc. Worked precedent: the branching-story-page-cycle refactor (1140 lines → 381 lines + 11 reference docs).

**Source structure**: Pre-flight + Phase 1, 2, 3, 4, 4.5, 5, 6, 6.5, 7, 8, 9, 10, 11 (14 numbered phases counting half-phases).

**Resulting thin SKILL.md Procedure** (11 steps):

| Procedure Step | Original phase(s) collapsed | Reference doc |
|---|---|---|
| 1 | Pre-flight + World-State Prerequisites | `references/pre-flight-and-prerequisites.md` |
| 2 | Phase 1 | `references/phase-1-choice-resolution.md` |
| 3 | Phases 2-3 | `references/phase-2-3-impact-and-feasibility.md` |
| 4 | Phases 4 + 4.5 | `references/phase-4-storylet-and-mystery-authority.md` |
| 5 | Phase 5 | `references/phase-5-state-mutation.md` |
| 6 | Phases 6 + 6.5 | `references/phase-6-governor-and-closure.md` |
| 7 | Phase 7 | `references/phase-7-page-render.md` |
| 8 | Phase 8 | `references/phase-8-choice-generation.md` |
| 9 | Phase 9 | `references/phase-9-validation-gates.md` |
| 10 | Phase 10 (HARD-GATE approval) | INLINE per the Commit / HARD-GATE phases stay inline rule above |
| 11 | Phase 11 (atomic write transaction) | INLINE per same rule |

**Plus cross-cutting references** (extracted alongside the phase-router):
- `references/record-schemas.md` — Record Schemas section (PG / SE / CHC + per-turn emission rules)
- `references/governance-and-foundations.md` — FOUNDATIONS Alignment + Mandatory LLM Roles + full Guardrails

**Collapsing decisions** (Step 5 grouping rule applied):
- Adjacent phases collapsed into one Procedure step when they form a natural unit AND share a reference doc: Phases 2-3 (impact analysis feeds continuation feasibility), Phases 4 + 4.5 (storylet selection produces M_resolution_claims that 4.5 routes per claim), Phases 6 + 6.5 (narrative governor recompute feeds closure-readiness detection).
- Standalone phases kept as their own Procedure step when topically distinct (Phase 5 state mutation, Phase 7 page render, Phase 8 choice generation, Phase 9 validation gates).
- Phase 10 + Phase 11 stay INLINE per the Commit / HARD-GATE phases rule — the safety-and-sequencing contract must be visible in the thin SKILL.md, not loaded from a reference doc.

The phase-router pattern is the most common shape for canon-mutating and content-generating skills, which typically have 8-15 numbered phases. Use this worked example as the template when refactoring such skills.

### 8. Verify Content Preservation

Before overwriting `<skill-dir>/SKILL.md` in Step 7, capture the list of H2/H3 headers from the original — a single `grep -nE '^##? '` over the in-context content suffices; stash the list in your working notes. After Step 7's writes complete, run the verification: for each captured header, grep against `<skill-dir>/references/*.md` + the new `<skill-dir>/SKILL.md` and report any header that no file contains. The pre-overwrite capture is load-bearing — Step 7's `Write` overwrites SKILL.md, so the original header list is gone after the rewrite and cannot be reconstructed from disk.

### 9. Cross-Skill Reference Check

Run two separate greps across `.claude/skills/*/SKILL.md`: (a) for the target skill's name verbatim (e.g., `canon-addition`), (b) for its directory path prefix (e.g., `.claude/skills/canon-addition/`). Report each result independently — two zero-match lines are more auditable than a single compound alternation negative. If the target skill has uniquely named sections, run a third grep for those. Skip generic headers (e.g., "Hard Rules", "Procedure") that would produce false positives. Always record the result in the Step 10 output summary, not just when matches are found: zero-match runs produce a `Cross-skill references: 0 matches` line so the audit trail reflects that the scan ran; match runs list the files (e.g., `Cross-skill references: 3 matches in foo/SKILL.md, bar/SKILL.md`) and flag them as references that may need updating so the user can fix external pointers. Name-only matches (grep (a)) in sibling YAML frontmatter descriptions are pipeline-documentation references and typically do NOT require action on internal refactors; path-prefix matches (grep (b)) usually do require attention since they cite internal file structure. State the distinction in the Step 10 summary when the two grep results diverge.

**§-anchor citation investigation for path-prefix matches** (parallel to Step 6's internal §-anchor cross-reference rule, applied to EXTERNAL §-anchors from sibling skills): when grep (b) produces matches, for each matching sibling file, additionally grep that file for §-anchor citation patterns referencing the target's structure — `§<SectionName>`, `§Phase N`, `§<bold-rule-name>`, or quoted phase / sub-section labels paired with the target's path prefix. For each cited section, cross-check whether it still resolves in (i) the new thin SKILL.md or (ii) one of the new `references/*.md` files. Report each broken §-anchor in the Step 10 summary as a sibling pointer requiring update, naming the sibling file, the cited section, and the reference doc the section now lives in (e.g., `branching-story-bootstrap/SKILL.md cites §Phase 2 §Bootstrap-mix shape weighting which now lives in references/phase-2-generation-seeds.md`). The investigation prevents the audit-trail-defect where the audit reports "1 path-prefix match" but doesn't surface the concrete breakage the user needs to fix; siblings that cite specific §-anchors of the refactored skill are exactly the case where path-prefix attention pays off most. When a path-prefix match exists but no §-anchor citations are found inside it (e.g., the sibling only references `<target>/templates/<file>.yaml` or the bare `<target>/SKILL.md` path without naming sections), report the path-prefix match alone in Step 10 — no §-anchor breakage to enumerate.

### 10. Output Summary

Print a brief summary:
```
Extracted N reference docs. SKILL.md: X lines → Y lines.

References:
- references/foo.md (always)
- references/bar.md (conditional: when X)
- references/baz.md (always)

Cross-skill references: N matches [in <file-list>].
```

When grep (a) name-matches and grep (b) path-matches diverge — the typical case when a skill is referenced by name in sibling YAML frontmatter descriptions but has no internal-path dependents — split the single line into two: `Cross-skill name references: N matches in <file-list> (sibling frontmatter descriptions — typically no action needed).` and `Cross-skill path references: N matches [in <file-list>].`

## Hard Rules

- Never modify the YAML frontmatter (name, description).
- Never discard content — every instruction from the original SKILL.md must appear either in the thin SKILL.md or in a reference doc.
- Merge into existing reference docs when themes overlap; do not create duplicates.
- Keep nested conditionals together in one reference doc — do not split below the natural grouping level.
- Default ambiguous blocks to always-loaded.
