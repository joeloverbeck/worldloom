# SPEC25STOCOHHAR-009: story-promotion-closeout BR-supersession cleanup

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/story-promotion-closeout/SKILL.md`, `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, and `specs/SPEC-25-story-coherence-hardening.md` only; no schema, MCP, or validator change.
**Deps**: None

## Problem

At intake, `story-promotion-closeout` SKILL.md referenced "supersede a `BR`" in Phase 2 branch-handling (the `flag` and `archive` bullets), listed `BR-<integer>` (supersession) in its Output table, and listed `create_br_record` for branch supersession in Phase 5. But `BR`'s schema (contract §4.5.11) has no `supersedes` field, and the contract states "Branches fork; they do not supersede." This was dead / impossible logic.

## Assumption Reassessment (2026-05-14)

1. `.claude/skills/story-promotion-closeout/SKILL.md` references the BR-supersession path in the frontmatter description (`SF/BEL/STENT/SREL/DA/BR` supersessions), the HARD-GATE / pre-flight allocation wording ("supersession ids allocated per source_records count" and "branch-handling count"), the Output-table `BR-<integer>` (supersession) row, Phase 2 `flag` / `archive` bullets ("supersede a `BR` only if an existing §4.5.11 field such as `description` must change"), the `none` bullet ("no branch supersessions"), and the Phase 5 op list (`create_br_record` "for branch supersessions"). The skill already states the lawful alternative: branch disposition is ledger / INDEX-only.
2. Contract §4.5.11 `BR` schema has fields `id`, `story_id`, `created_at_page`, `label`, `description`, `parent_branch_id`, `forked_at_page_id`, `root_page_id` — no `supersedes` field. The contract states "Branches fork; they do not supersede." Confirmed against SPEC-25 D6.
3. Cross-skill boundary under audit: `story-promotion-closeout` is the only skill referencing BR-*supersession*. `create_br_record` itself remains a valid patch-engine op (registered in `tools/patch-engine/src/ops/create-story-record.ts` and the `envelope/schema.ts` op-kind enum) — used for branch *forking* by `branching-story-turn-cycle`. This ticket removes only `story-promotion-closeout`'s use of `create_br_record` for *supersession*, not the op.
4. FOUNDATIONS Rule 6 (No Silent Retcons): restated before trusting the spec — this is a retcon of skill behavior, removing a documented-but-impossible code path. Retcon justification: the BR-supersession path was never executable (`BR` has no `supersedes` field; the contract forbids branch supersession), so striking it removes dead instructions and aligns the skill with the §4.5.11 schema and the "branches fork; they do not supersede" contract statement. New behavior: branch disposition under `flag` / `archive` is recorded in the closeout ledger and `INDEX.md` (and per-world `stories/INDEX.md` for `archive`) — a path the skill already supports.
5. Rename / removal blast radius (FOUNDATIONS Rule 6 enforcement — confirming the removal is fully scoped): grepping the pipeline for `create_br_record` in a closeout / supersession context — only `story-promotion-closeout` uses it for supersession; `branching-story-bootstrap`, `branching-story-turn-cycle`, and the patch engine use `create_br_record` for branch creation / *forking*, which is unaffected. No schema, MCP, or validator surface references BR-supersession.
6. HARD-GATE read: `docs/HARD-GATE-DISCIPLINE.md` confirms story-bundle `_source` record writes are engine-routed and approval-gated. This ticket does not weaken the gate; it narrows the closeout skill's patch-plan vocabulary so branch disposition cannot allocate or submit a non-schema BR supersession.
7. Explicit SPEC-25 reference check: D6 in `specs/SPEC-25-story-coherence-hardening.md` is the governing implementation slice. The spec's D6 verification/status wording must be updated after the skill prose lands so it no longer reads as a still-open current-state defect.
8. Cross-skill same-seam consumer check: `.claude/skills/story-fact-promotion-to-canon/SKILL.md` has one handoff sentence saying `story-promotion-closeout` may supersede `BR` records after adjudication. That sentence is the upstream recommendation for this same closeout contract, so this ticket owns narrowing it to SF / BEL / DA / STENT / SREL and ledger / INDEX branch disposition.

## Architecture Check

1. Striking the dead logic outright — rather than leaving it behind the "only if an existing §4.5.11 field must change" caveat — aligns the skill with the §4.5.11 schema reality: a `BR` carries only fork-lineage fields, none of which a supersession would meaningfully amend, so the caveat described an impossible case.
2. No shims: the BR-supersession path is removed outright, not left behind a feature flag, conditional, or deprecation note.

## Verification Layers

1. `story-promotion-closeout` SKILL.md contains no "supersede a `BR`", `BR-<integer>` supersession row, branch-supersession wording, or `create_br_record` closeout op -> grep-proof.
2. Cross-skill `create_br_record` references remain only in branch creation / forking surfaces, not closeout supersession, and no story skill says closeout supersedes `BR` records -> grep-proof + manual classification.
3. Branch disposition under `flag` / `archive` is ledger / `INDEX.md`-only -> manual review of the revised Phase 2 bullets and Phase 5 op list.
4. SPEC-25 D6 is marked landed without leaving the same current-state defect text as active implementation guidance -> manual review / grep-proof.

## Landed Changes

### 1. Phase 2 flag / archive bullets

Struck the "supersede a `BR` only if ..." clauses from the `flag` and `archive` bullets. Branch disposition is recorded in the closeout ledger and bundle `INDEX.md` (and the per-world `stories/INDEX.md` for `archive`).

### 2. Output table

Removed the `BR-<integer>` (supersession) row from the Output table.

### 3. Phase 5 op list

Removed `create_br_record` from the Phase 5 patch-plan op list.

### 4. Same-seam summary / pre-flight wording

Removed BR from the frontmatter supersession-class summary and removed branch-handling from supersession-id allocation wording. Branch ids remain inputs for ledger / INDEX disposition, not output ids for superseding records.

### 5. SPEC-25 D6 current-state truthing

Updated the SPEC-25 implementation note and D6 verification wording to record this ticket as landed. Historical D6 rationale remains, but current verification text no longer implies the skill still contains the stale BR-supersession path.

### 6. Upstream handoff prose

Updated `story-fact-promotion-to-canon`'s no-post-adjudication-closeout handoff so it no longer promises `BR` record supersession.

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `specs/SPEC-25-story-coherence-hardening.md` (modify)

## Out of Scope

- The `create_br_record` patch-engine op itself — it remains valid for branch *forking* (`branching-story-turn-cycle`).
- P0 #4 `SCX` crosslink record and P0 #5 `BRSTAT` branch-status record — rejected by SPEC-25 §Out of Scope (structural).
- Any `BR` schema change — `BR` correctly has no `supersedes` field; the schema is already right.

## Acceptance Criteria

### Tests That Must Pass

1. ``grep -nE 'supersede a `BR`|BR-<integer>.*supersession|branch supersession|branch supersessions|create_br_record|SF/BEL/STENT/SREL/DA/BR|branch-handling count|all classes that may be superseded' .claude/skills/story-promotion-closeout/SKILL.md`` returns no matches.
2. Manual review: the Phase 2 `flag` / `archive` bullets describe ledger / `INDEX.md`-only branch disposition with no supersession path.
3. `grep -rn "create_br_record" .claude/skills/` — branch creation / forking usage remains; `story-promotion-closeout` has none.
4. ``grep -rnE 'BR-<integer> \(supersession\)|supersede a `BR`|branch supersessions|branch supersession|SF / BEL / DA / STENT / SREL / BR|SF/BEL/STENT/SREL/DA/BR|BR records that the canon-addition outcome implicates' .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md`` returns no matches.
5. ``grep -nE 'SPEC25STOCOHHAR-009 landed|D6.*landed|no remaining "supersede a `BR`"' specs/SPEC-25-story-coherence-hardening.md`` shows the D6 current-state note and no stale active verification claim.

### Invariants

1. `story-promotion-closeout` describes no BR-supersession path.
2. `create_br_record` is referenced by the pipeline only for branch forking, never for supersession.

## Test Plan

### New/Modified Tests

None — skill-prose ticket (no automated test files change); verification is grep-proof + manual review of the revised Phase 2 bullets.

### Commands

1. ``grep -nE 'supersede a `BR`|BR-<integer>.*supersession|branch supersession|branch supersessions|create_br_record|SF/BEL/STENT/SREL/DA/BR|branch-handling count|all classes that may be superseded' .claude/skills/story-promotion-closeout/SKILL.md``
2. `grep -rn "create_br_record" .claude/skills/`
3. ``grep -rnE 'BR-<integer> \(supersession\)|supersede a `BR`|branch supersessions|branch supersession|SF / BEL / DA / STENT / SREL / BR|SF/BEL/STENT/SREL/DA/BR|BR records that the canon-addition outcome implicates' .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md``
4. ``grep -nE 'SPEC25STOCOHHAR-009 landed|D6.*landed|no remaining "supersede a `BR`"' specs/SPEC-25-story-coherence-hardening.md``
5. A grep-proof is the correct verification boundary — this is a skill-prose deletion plus same-seam spec truthing with no schema, MCP, or validator surface, and FOUNDATIONS Rule 6 attribution lives in this ticket's Assumption Reassessment item 4.

## Outcome

`story-promotion-closeout` no longer describes `BR` as a supersession output, no longer allocates supersession ids for branch handling, and no longer includes `create_br_record` in closeout patch plans. Phase 2 branch handling now records `flag` / `archive` dispositions only in the closeout ledger and INDEX surfaces while leaving BR records unchanged. The upstream `story-fact-promotion-to-canon` handoff and SPEC-25 D6 status text were truthed to the landed contract.

## Verification Result

Completed on 2026-05-14:

1. ``grep -nE 'supersede a `BR`|BR-<integer>.*supersession|branch supersession|branch supersessions|create_br_record|SF/BEL/STENT/SREL/DA/BR|branch-handling count|all classes that may be superseded' .claude/skills/story-promotion-closeout/SKILL.md`` -> no matches.
2. `grep -n "create_br_record" .claude/skills/story-promotion-closeout/SKILL.md` -> no matches.
3. ``grep -rnE 'BR-<integer> \(supersession\)|supersede a `BR`|branch supersessions|branch supersession|SF / BEL / DA / STENT / SREL / BR|SF/BEL/STENT/SREL/DA/BR|BR records that the canon-addition outcome implicates' .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md`` -> no matches.
4. `grep -rn "create_br_record" .claude/skills/` -> only `branching-story-bootstrap` branch creation and `branching-story-turn-cycle` fork usage remain; `story-promotion-closeout` has none.
5. ``grep -nE 'SPEC25STOCOHHAR-009 landed|D6.*landed|no remaining "supersede a `BR`"' specs/SPEC-25-story-coherence-hardening.md`` -> shows the implementation note, landed D6 skill note, and landed D6 verification row.
6. Manual review of `story-promotion-closeout` Phase 2 / Phase 5 confirms branch disposition is ledger / INDEX-only and closeout patch plans cannot include a BR record op.

## Deviations

The live stale-anchor sweep found same-seam wording outside the drafted three edit sites: the `story-promotion-closeout` frontmatter, pre-flight allocation wording, record-schema reference, FOUNDATIONS-alignment table, the upstream `story-fact-promotion-to-canon` handoff, and SPEC-25 D6 current-state notes. These were absorbed because they describe the same impossible closeout BR-supersession path. No schema, MCP, validator, or patch-engine code changed.
