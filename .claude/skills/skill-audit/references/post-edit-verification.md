# Post-Edit Verification

After all edits are applied, re-read each edited file — full file for short files; targeted Reads of edited regions with flanking context for longer files — and verify as a single pass. For numbering-continuity check 2(a) on files >150 lines, prefer grep per that check's guidance; targeted-read coverage of each edited region satisfies the remaining checks. A strict end-to-end re-read of an unchanged 400-line file is not required when the verification-check items can be satisfied from the edited regions alone.

## "Each edited file" includes cascade targets

Intra-skill cascade targets (`references/*.md`, `templates/*.md`, and similar files under the target skill's own directory) and cross-skill cascade targets (sibling-skill files edited per `N.cascade` rows in the summary) BOTH count as edited files for verification purposes. Apply checks 1-5 below to every cascade target just as you would to the target skill's SKILL.md; check 6 remains meta-tooling-gated for the target only. A malformed cascade edit to a sibling reference file is otherwise silent — it will not surface at verification if verification is interpreted as "target-only" — and the failure mode (broken cross-reference in a sibling skill that will only trigger on that sibling's next invocation, possibly weeks later) is exactly the kind of drift the cascade discipline exists to prevent.

## Checks

1. **No overlap or contradiction** — edits don't conflict with each other
2. **Cross-references valid**:
   - (a) **Numbering continuity** — step, phase, and section numbers are sequential with no gaps or duplicates. If the file has >150 lines OR >10 numbered references across multiple levels AND the file uses a single consistent numbering convention, prefer grep pattern search (e.g., grep for `Step [0-9]`, `### [0-9]`) to confirm. If the file mixes numbering conventions (numbered top-level steps combined with checkbox items, numbered sub-lists, and bulleted items in the same file — no single grep pattern catches all of them), visual scan via targeted Reads of each numbered block is acceptable. For shorter files with consistent conventions, a visual scan suffices. Adapt grep patterns to the target skill's convention (numbered items, lettered sub-steps, or markdown headers).
   - (b) **File paths valid** — all referenced file paths still exist and point to correct targets.
   - (c) **New cross-references** — references introduced by new text point to content that actually exists. When the target skill uses nested numbering (sub-steps within steps), verify that cross-references disambiguate between levels (e.g., "Step 1, sub-step 5" vs. "Step 5").
   - (d) **Overview diagrams** — high-level overviews that become slightly inaccurate due to new branching logic are acceptable if the detailed step text handles the nuance. Note the discrepancy but do not force-update overview text that would become harder to scan.
3. **Sequential flow coherent** — the skill reads coherently end-to-end after all edits
4. **Contextual consistency** — numbering, terminology, and cross-references are consistent with adjacent unchanged text
5. **Frontmatter integrity** — if any edit touched the YAML frontmatter, verify `---` delimiters are intact and the YAML parses correctly (name, description, and arguments are present and properly quoted)
6. **Cross-skill sibling scan** (meta-tooling targets only) — if the target is a meta-tooling skill (brainstorm, skill-creator, skill-audit, or similar process/tooling skill) AND any edit touched shared terminology, conventions, or tag semantics (per `references/cross-skill-consistency.md` §Concrete shared-surface triggers), confirm the sibling scan has been run and documented in the post-implementation summary. Skip this check when the target is not a meta-tooling skill, OR when no edits touched shared surfaces. This is the gate that catches the "Extends to user-directed edits on meta-tooling skills" rule before it slips — the scan itself lives in `references/cross-skill-consistency.md`, but the confirmation lives here.

If any check fails, fix the offending edit(s), then re-run the full verification pass. Do not selectively re-check — a fix in one area can introduce issues in another.
