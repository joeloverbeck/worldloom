# BSBOOT-009: Make CNSQ creation explicitly conditional at bootstrap

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap` skill prose only. The patch-engine `create_cnsq_record` op already supports the conditional case; it remains the runtime page-cycle's primary CNSQ producer, and bootstrap now documents the conditional intent.
**Deps**: none

## Problem

At intake, the skill carried contradictory statements about whether CNSQ records were created at bootstrap:

- `SKILL.md` output tree comment said "CNSQ-NNNN.yaml (initialized empty at PG-0001)" — implied CNSQ records were emitted.
- `SKILL.md` Phase 11 step 3 op list included `create_cnsq_record` in the default envelope op set — implied always emitted.
- `references/phase-5-threads-and-obligations.md`: "emit `_source/consequences/` as an empty directory at this phase" — implied no records emitted by default.
- `references/engine-envelope-shape.md` target_file mapping annotated `create_cnsq_record` with "(rare at bootstrap; runtime page-cycle JIT-creates)" — confirmed the conditional intent but contradicted the old `SKILL.md` default op list.
- `references/engine-envelope-shape.md` envelope-splitting fallback listed `create_cnsq_record` as part of "Envelope B — Story state" — again as if always emitted.

At intake, `expected_id_allocations` in `references/engine-envelope-shape.md` omitted `cnsq_ids` and `da_ids` from its example, even though `create_cnsq_record` and `append_story_diegetic_artifact_record` appeared in the same file's op-mapping table. This was the same shape — the allocation list said one thing, the op list said another.

## Assumption Reassessment (2026-05-06)

1. `SKILL.md` output-tree prose, Phase 11 op-list prose, and `phase-5-threads-and-obligations.md` — verified divergent at intake.
2. `references/engine-envelope-shape.md` says `create_cnsq_record` is "rare at bootstrap" — verified; this is the closest documented intent.
3. `references/engine-envelope-shape.md` — `expected_id_allocations` example omitted `cnsq_ids` and `da_ids` at intake. Verified.
4. Cross-skill / cross-artifact boundary: the patch-engine `create_cnsq_record` op is shared between bootstrap and page-cycle. Page-cycle is the primary CNSQ producer at runtime. Bootstrap's job is to *initialize* the ledger as empty (directory + empty `consequences_pending` + empty `consequences_addressed`); only premises that explicitly start after a consequence has already landed warrant CNSQ emission at PG-0001.
5. FOUNDATIONS / hard-gate principle: this is documentation alignment, not a hard-gate change. The patch-engine `expected_id_allocations` check rejects ops whose `record.id` is not in the allocation list; a bootstrap that emits a `create_cnsq_record` op without listing `cnsq_ids` will fail at validate time, so the documented contract must match what bootstrap actually produces.
6. Schema-extension classification: this is an example/contract-documentation alignment, not a schema extension. The `create_cnsq_record` op exists; only the SKILL.md and engine-envelope-shape.md documentation needs to be made internally consistent.
7. `.gitkeep` discipline already documented in Phase 11 for "subdirectories that do NOT receive a record at this bootstrap (typically `consequences/`, `objects/`, `artifacts/` — runtime page-cycle JIT-creates records here)" — this is the existing pattern; CNSQ falls cleanly into it for the default-empty case.
8. Required same-seam fallout: `templates/story-records.yaml` also describes `CNSQ-NNNN` as "initialized empty at bootstrap; runtime populates". That template heading is not a separate schema change, but it must be made conditional so the schema exemplar does not reintroduce the default-record implication.

## Architecture Check

1. **Why cleaner**: making CNSQ explicitly conditional removes the false default from the op list, makes `expected_id_allocations` self-consistent, and aligns with the Phase 5 reference's "empty directory" intent. Bootstrap-time CNSQ emission becomes an opt-in driven by the premise (e.g., "the story opens after the protagonist's brother has already been killed — install the body-discovery consequence at PG-0001").
2. No backwards-compatibility shim. The change is documentation-level; the engine op accepts the same shape regardless.

## Verification Layers

1. SKILL.md output tree, Phase 11 op list, and references agree: CNSQ creation is conditional → codebase grep-proof.
2. `expected_id_allocations` examples conditionally include `cnsq_ids` and `da_ids` → codebase grep-proof + manual review.
3. `.gitkeep` discipline preserved for `consequences/` when no records emitted → codebase grep-proof.
4. Engine submit semantics: a bootstrap envelope that omits `create_cnsq_record` ops AND omits `cnsq_ids` from `expected_id_allocations` validates cleanly → manual review (no engine code change required).

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Output tree now says `CNSQ-NNNN.yaml (NOT emitted at default bootstrap; .gitkeep preserves directory; runtime page-cycle JIT-creates)`.
- Phase 11 step 3 now excludes `create_cnsq_record` and `append_story_diegetic_artifact_record` from the default op list and states that CNSQ/story-local DA records are emitted only when the premise establishes a pre-PG-0001 consequence or story-local diegetic artifact at bootstrap; otherwise both the ops and `expected_id_allocations` keys are omitted.

### 2. `.claude/skills/branching-story-bootstrap/references/phase-5-threads-and-obligations.md`

- The consequences ledger initialization retains the "empty directory" wording and now says CNSQ records are emitted only when the premise explicitly starts after a pre-existing consequence has already landed; otherwise the directory holds only `.gitkeep`.

### 3. `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`

- `expected_id_allocations` prose now states allocation keys are added only when corresponding ops appear, and bootstrap typically omits `cnsq_ids` and `da_ids`.
- Envelope-splitting fallback now marks `create_cnsq_record` and `append_story_diegetic_artifact_record` as optional/premise-driven in Envelope B.
- The file-class mapping now marks story-local DA records as rare/premise-driven at bootstrap, matching the existing CNSQ annotation.

### 4. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- CNSQ exemplar heading now says "conditional at bootstrap; runtime usually populates" so the template remains available for premise-driven CNSQ creation without implying a default empty CNSQ record.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-5-threads-and-obligations.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)

## Out of Scope

- Engine-side change. `create_cnsq_record` already exists; the op-list-and-allocation-list shape check already covers the contract.
- Editing `branching-story-page-cycle`'s CNSQ emission discipline. Its CNSQ ops are runtime-driven, not bootstrap-driven; no change needed.
- Migration of existing bundles. Forward-only for new bootstrap runs.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "CNSQ.*(NOT emitted|conditional|premise.*establish)" .claude/skills/branching-story-bootstrap/SKILL.md` returns matches in the output tree comment and Phase 11 op list.
2. `grep -nE "cnsq_ids.*conditional\|allocations are conditional\|omit.*cnsq" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns at least one match.
3. `grep -n "empty directory" .claude/skills/branching-story-bootstrap/references/phase-5-threads-and-obligations.md` still returns the existing match (Phase 5's default-empty intent preserved).
4. The .gitkeep convention in Phase 11 for `consequences/`, `objects/`, `artifacts/` is unchanged.
5. `grep -n "CNSQ-NNNN" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` shows the CNSQ exemplar as conditional rather than default-empty.

### Invariants

1. The default bootstrap envelope omits `create_cnsq_record` ops AND omits `cnsq_ids` from `expected_id_allocations`.
2. The default bootstrap envelope omits `append_story_diegetic_artifact_record` ops AND omits `da_ids` from `expected_id_allocations`.
3. A premise-driven CNSQ emission opts in by adding both the op and the allocation key — they are coupled.
4. `_source/consequences/` remains in the directory tree via `.gitkeep` when no records are emitted.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn "create_cnsq_record\|cnsq_ids" .claude/skills/branching-story-bootstrap/` — confirms every reference is qualified as conditional.
2. `grep -rn "create_cnsq_record\|cnsq_ids" .claude/skills/branching-story-page-cycle/` — confirms page-cycle's runtime CNSQ ops are unchanged.
3. (Manual) construct a sample envelope without CNSQ ops and without `cnsq_ids`; run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan>` against it; expected: validates cleanly.

## Outcome

Completion date: 2026-05-06.

Outcome amended: 2026-05-06 — downstream consumer reflection updated page-cycle allocation guidance and storylet-pool bootstrap seed context so conditional CNSQ / story-local DA records remain coupled to their allocation keys and can be used as optional PG-0001 root-state inputs.

Bootstrap CNSQ and story-local DA creation are now documented as premise-driven opt-ins, not default bootstrap records. The default bootstrap op list omits `create_cnsq_record` and `append_story_diegetic_artifact_record`, `expected_id_allocations` explicitly omits `cnsq_ids` / `da_ids` unless the matching ops appear, Phase 5 keeps the default empty consequences directory, and the CNSQ schema exemplar no longer implies a default empty CNSQ record.

## Verification Result

1. `grep -nE 'CNSQ.*(NOT emitted|conditional|premise.*establish)' .claude/skills/branching-story-bootstrap/SKILL.md` — passed; matched the output tree and Phase 11 conditional op prose.
2. `grep -nE 'cnsq_ids.*conditional|allocations are conditional|omit.*cnsq' .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` — passed; matched the allocation-key guidance.
3. `grep -n 'empty directory' .claude/skills/branching-story-bootstrap/references/phase-5-threads-and-obligations.md` — passed; Phase 5 default-empty intent remains present.
4. `grep -n 'CNSQ-NNNN' .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — passed; CNSQ exemplar is conditional at bootstrap.
5. `grep -rn 'create_cnsq_record\|cnsq_ids' .claude/skills/branching-story-bootstrap/` — passed by manual classification; bootstrap hits are conditional.
6. `grep -rn 'create_cnsq_record\|cnsq_ids' .claude/skills/branching-story-page-cycle/` — passed by manual classification; the remaining page-cycle hit is runtime-driven and unchanged.
7. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/bsboot-009-no-cnsq-plan.json` — passed before the temp file was deleted; the sample bootstrap-shaped plan omitted `create_cnsq_record` and `cnsq_ids`, and `id_allocation_race` reported `pass`.

## Deviations

- Reassessment absorbed same-seam wording in `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` because its CNSQ exemplar heading preserved the old default-bootstrap implication. No engine code or page-cycle behavior changed.
