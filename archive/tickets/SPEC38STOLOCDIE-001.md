# SPEC38STOLOCDIE-001: Create `_shared-templates/da-authoring-reference.md`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new shared template `.claude/skills/_shared-templates/da-authoring-reference.md` (no impact on existing `_shared-templates/` files)
**Deps**: None

## Problem

At intake, the story-bundle pipeline carried a full machine substrate for story-local diegetic artifacts (DA schema, `append_story_diegetic_artifact_record` patch op, `story_da_ids` allocation, `expected_witness_coverage` validator, `artifact_accessible` predicate) but no single source of truth defined when a story-local DA should be created versus another record class, what field-semantic rules govern its components, what patch obligations follow from creating a DA, or what anti-patterns to avoid. This ticket created the canonical shared reference that tickets 002-009 cross-reference inline.

## Assumption Reassessment (2026-05-17)

1. Verified `.claude/skills/_shared-templates/` houses cross-skill shared content (`story-state-contract.md`, `story-record-schemas.md`, `clothing-consistency-vocabulary.md`, `persisted-packet-recovery.md`) per `ls .claude/skills/_shared-templates/`; new file `da-authoring-reference.md` follows the established convention.
2. Verified SPEC-38 §D1 lists 6 required sections (Triage rubric, Decision matrix, Field semantics, Patch obligations checklist, 3 inline examples, Anti-patterns) with cross-references to `story-record-schemas.md` §4.5.10 (DA schema definition, fields verified per brainstorm agent quote of lines 554-571) and `story-state-contract.md` §4.1 + §5 (BEL access_route enum + predicate DSL `artifact_accessible(STENT, DA)` at line 140).
3. Cross-skill boundary: this shared reference is consumed inline by 7 sibling SKILL.md files (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`, `branching-story-prose-attach`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) via tickets 002-009. The file path `.claude/skills/_shared-templates/da-authoring-reference.md` must remain stable across the batch — tickets 002-009 hardcode it in their cross-references.
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §6a Belief vs. Fact (DA claim ≠ reader belief), §Story Bundles §6b Information / Observer Firewall (DA access via valid route), §Story Bundles §5b Schema-Minimalism (no schema additions; reference documents existing 12-field schema only), §Canon Layers §4 Contested Canon (DA is the story-local analogue), Rule 1 No Floating Facts (DA needs author / audience / circulation / truth-relation / downstream-use). The reference codifies the decision matrix that operationalizes Rule 1 at story scope.

## Architecture Check

1. Shared-reference convention (cleaner than standalone skill): SPEC-38 §Key design decision #1 — `_shared-templates/` is worldloom's established cross-skill content pattern; a standalone skill would add HARD-GATE ceremony, ID allocation, `<system-reminder>` listing, and SKILL.md prose-budget overhead for content with no independent invocation path. Reference is consumed inline by consumer skills, not via the Skill tool.
2. No backwards-compatibility aliasing or shims; net-new file with no prior content.

## Verification Layers

1. File exists at canonical path → codebase grep-proof: `test -f .claude/skills/_shared-templates/da-authoring-reference.md` returns success.
2. All 6 required sections present → codebase grep-proof: `grep -cE '^## (Triage|Decision matrix|Field semantics|Patch obligations|Worked examples|Anti-patterns)' .claude/skills/_shared-templates/da-authoring-reference.md` returns ≥6.
3. Cross-references to canonical sources concrete → codebase grep-proof: `grep -nE 'story-record-schemas\.md.*§4\.5\.10|story-state-contract\.md.*§(4\.1|5)' .claude/skills/_shared-templates/da-authoring-reference.md` returns matches.
4. Single-layer ticket: documentation-only deliverable; verification is structural completeness (sections present, cross-references resolve at exact-string match) rather than runtime behavior. Runtime correctness of the discipline this reference codifies lands in consumer tickets 002-009 (skill amendments) + 010-012 (validators).

## Landed Changes

### 1. Created new shared-reference file

Path: `.claude/skills/_shared-templates/da-authoring-reference.md`. Six sections landed per SPEC-38 §D1 Change list:

1. **Triage rubric** — the 8-property test from SPEC-38 §D1 (diegetic authorship + recoverable content + belief-impact + choice-grounding + mystery-progression + circulation-mattering + truth-status-mattering + likely-cross-page-reference). Create when ≥2 properties hold.
2. **Decision matrix** — tabular DA vs STOBJ vs SF vs BEL vs prose-only, covering 8 common confusions (physical possession vs content; branch truth vs claim; belief vs knowledge; atmospheric vs load-bearing; one-turn vs persistent; world-level vs story-local; accepted canon vs candidate; durable text vs rumor) per SPEC-38 §D1 §Section 2.
3. **Field semantics commentary** — per SPEC-38 §D1 §Section 3:
   - `truth_relation`: relation of artifact content to branch/canon truth (NOT reader belief); enum `true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent`; per-value usage table.
   - `circulation`: access/distribution state (NOT intended audience); enum `private | factional | public | concealed | suppressed`; trigger for `expected_witness_coverage` when `public` or `factional`.
   - `body`: full text for short/central artifacts; excerpt for long; transcript/description for non-text; material-uncertainty conventions (`[redacted]`, `[illegible]`, `[torn away]`, `[translation uncertain: ...]`); "never write 'contains a clue', write the clue" rule.
   - `derived_from`: provenance/dependency; permitted reference types (`SE-*`, `DA-*`, `STOBJ-*`, `BEL-*`, `SF-*`); ambiguity note for cross-namespace `DA-*` (world-level vs story-local) — prefer body annotation until namespace resolution per SPEC-38 §Risks #1.
   - `supersedes`: same logical artifact replaced by a later version; contrast with `derived_from` (separate communicative object).
4. **Patch obligations checklist** — full obligation list per SPEC-38 §D1 §Section 4 (allocate `DA-*` via `mcp__worldloom__allocate_next_id(world_slug, "DA", story_slug=<slug>)`; write via `append_story_diegetic_artifact_record` with `expected_id_allocations.story_da_ids: ["DA-<N>"]`; include in `SE.state_delta.create[]` / supersession and `PG.state_snapshot.active_records.DA[]`; include in `CHC.grounded_in.records[]` when CHC depends; create/supersede BEL with appropriate `basis.access_route` from the 11-route enum at `story-record-schemas.md` §4.1; create/supersede STOBJ when custody matters; satisfy `expected_witness_coverage` for `public`/`factional` circulation via same-event indirect-route BEL OR `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` tag in `SE.world_logic_rationale`; use `artifact_accessible(...)` for future DA-gated SLT/page-plan access).
5. **Worked examples (3)** — private letter at bootstrap, public proclamation, found forged document (source: `reports/story-local-diegetic-artifacts.md` §13 Examples 1, 2, 3 — the bootstrap-vs-turn-cycle and private-vs-public-vs-concealed circulation axes). Each example shows full DA + SE.state_delta + PG.state_snapshot + BEL + CHC.grounded_in bundle with correct field syntax matching the §4.5.10 schema.
6. **Anti-patterns** — 8 items per SPEC-38 §D1 §Section 6 (creating DA for trivial signs; treating body as branch truth; `truth_relation: true` without canon/branch support; missing propagation; inaccessible choice grounding; modeling physical letter only as DA when custody matters; duplicating instead of superseding/BEL; promoting DA claims without `story-fact-promotion-to-canon`).

### 2. Cross-references concrete

Every cross-reference cites file path + section identifier, including `story-record-schemas.md` §4.5.10, `story-record-schemas.md` §4.1, and `story-state-contract.md` §5. The live `story-state-contract.md` §4 is a pointer to `story-record-schemas.md`, so the BEL access-route enum is cited at the live schema section that owns it.

## Files to Touch

- `.claude/skills/_shared-templates/da-authoring-reference.md` (new)

## Out of Scope

- Schema changes (SPEC-38 §Out of Scope; deferred to §Risks #1)
- Standalone skill structure (rejected per SPEC-38 §Key design decision #1)
- Modifications to existing `_shared-templates/` files (D2 handles `story-state-contract.md` separately in ticket 002)
- More than 3 worked examples (SPEC-38 §Key design decision #4 — 3 cover the axes adequately)
- World-level DA generation (out of scope; lives under `.claude/skills/diegetic-artifact-generation/`)

## Acceptance Criteria

### Tests That Must Pass

1. `test -f .claude/skills/_shared-templates/da-authoring-reference.md` returns success.
2. `grep -cE '^## (Triage|Decision matrix|Field semantics|Patch obligations|Worked examples|Anti-patterns)' .claude/skills/_shared-templates/da-authoring-reference.md` returns ≥6.
3. `grep -nE 'story-record-schemas\.md|story-state-contract\.md|expected_witness_coverage|non_propagation|append_story_diegetic_artifact_record' .claude/skills/_shared-templates/da-authoring-reference.md` returns matches confirming concrete cross-references.

### Invariants

1. The file lives under `_shared-templates/` (not as a standalone skill directory) per SPEC-38 §Key design decision #1.
2. No new schema fields proposed; the reference documents existing 12-field DA schema (per `story-record-schemas.md` §4.5.10 lines 554-571) rules of use only.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based against post-implementation file structure and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `test -f .claude/skills/_shared-templates/da-authoring-reference.md`
2. `grep -cE '^## ' .claude/skills/_shared-templates/da-authoring-reference.md`
3. The reference is consumed inline by sibling tickets 002-009; no separate validator runs because the file is documentation, not code.

## Outcome

Completed: 2026-05-17

What changed:
- Created `.claude/skills/_shared-templates/da-authoring-reference.md` as the shared story-local DA authoring reference.
- Landed the six required sections: `Triage`, `Decision matrix`, `Field semantics`, `Patch obligations`, `Worked examples`, and `Anti-patterns`.
- Included three compact DA + SE + PG + BEL + CHC examples for a bootstrap private letter, public proclamation, and found forged document.
- Cited the live schema and predicate authorities: `story-record-schemas.md` §4.5.10 and §4.1, plus `story-state-contract.md` §5.

Deviations from original plan:
- The live BEL access-route enum authority is `story-record-schemas.md` §4.1; `story-state-contract.md` §4 is a pointer to the split schema file. The reference therefore cites the enum at the live owning section while still citing `story-state-contract.md` §5 for `artifact_accessible(...)`.
- The patch-obligations checklist includes an explicit `artifact_accessible(...)` obligation for future SLT/page-plan access, preserving the same contract in the shared predicate DSL.

## Verification Result

Commands run:

```bash
test -f .claude/skills/_shared-templates/da-authoring-reference.md
```

Result: passed.

```bash
grep -cE '^## (Triage|Decision matrix|Field semantics|Patch obligations|Worked examples|Anti-patterns)' .claude/skills/_shared-templates/da-authoring-reference.md
```

Result: `6`.

```bash
grep -nE 'story-record-schemas\.md.*§4\.5\.10|story-state-contract\.md.*§(4\.1|5)' .claude/skills/_shared-templates/da-authoring-reference.md
```

Result: matched `story-record-schemas.md` §4.5.10 and `story-state-contract.md` §5 references.

```bash
grep -nE 'story-record-schemas\.md|story-state-contract\.md|expected_witness_coverage|non_propagation|append_story_diegetic_artifact_record' .claude/skills/_shared-templates/da-authoring-reference.md
```

Result: matched all required contract anchors.

```bash
git diff --check -- .claude/skills/_shared-templates/da-authoring-reference.md .codex/run-state/implement-spec-tickets.json
```

Result: passed.
