# BSBOOT-009: Make CNSQ creation explicitly conditional at bootstrap

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap` skill prose only. The patch-engine `create_cnsq_record` op already supports the conditional case (it is the runtime page-cycle's primary CNSQ producer per `branching-story-page-cycle/SKILL.md:352`); bootstrap simply documents the conditional intent.
**Deps**: none

## Problem

The skill carries three contradictory statements about whether CNSQ records are created at bootstrap:

- `SKILL.md:179` (output tree comment): "CNSQ-NNNN.yaml (initialized empty at PG-0001)" — implies CNSQ records ARE emitted.
- `SKILL.md:285` (Phase 11 step 3 op list): includes `create_cnsq_record` in the default envelope op set — implies always emitted.
- `references/phase-5-threads-and-obligations.md:31`: "emit `_source/consequences/` as an empty directory at this phase" — implies NO records emitted by default.
- `references/engine-envelope-shape.md:71` (target_file mapping): annotates `create_cnsq_record` with "(rare at bootstrap; runtime page-cycle JIT-creates)" — confirms the conditional intent but contradicts the SKILL.md default op list.
- `references/engine-envelope-shape.md:159` (envelope-splitting fallback) lists `create_cnsq_record` as part of "Envelope B — Story state" — again as if always emitted.

`expected_id_allocations` per `references/engine-envelope-shape.md:94-108` omits `cnsq_ids` and `da_ids` from its example, even though `create_cnsq_record` and `append_story_diegetic_artifact_record` appear in the same file's op-mapping table. This is the same shape — the allocation list says one thing, the op list says another.

## Assumption Reassessment (2026-05-06)

1. `SKILL.md:179` + `:285` + `phase-5-threads-and-obligations.md:31` — verified divergent.
2. `references/engine-envelope-shape.md:71` says "rare at bootstrap" — verified; this is the closest documented intent.
3. `references/engine-envelope-shape.md:94-108` — `expected_id_allocations` example omits `cnsq_ids` and `da_ids`. Verified.
4. Cross-skill / cross-artifact boundary: the patch-engine `create_cnsq_record` op is shared between bootstrap and page-cycle. Page-cycle is the primary CNSQ producer at runtime (`branching-story-page-cycle/SKILL.md:352`). Bootstrap's job is to *initialize* the ledger as empty (directory + empty `consequences_pending` + empty `consequences_addressed`); only premises that explicitly start after a consequence has already landed warrant CNSQ emission at PG-0001.
5. FOUNDATIONS / hard-gate principle: this is documentation alignment, not a hard-gate change. The patch-engine `expected_id_allocations` check rejects ops whose `record.id` is not in the allocation list (per `engine-envelope-shape.md:111`); a bootstrap that emits a `create_cnsq_record` op without listing `cnsq_ids` will fail at validate time, so the documented contract must match what bootstrap actually produces.
6. Schema-extension classification: this is an example/contract-documentation alignment, not a schema extension. The `create_cnsq_record` op exists; only the SKILL.md and engine-envelope-shape.md documentation needs to be made internally consistent.
7. `.gitkeep` discipline already documented at `SKILL.md:283` for "subdirectories that do NOT receive a record at this bootstrap (typically `consequences/`, `objects/`, `artifacts/` — runtime page-cycle JIT-creates records here)" — this is the existing pattern; CNSQ falls cleanly into it for the default-empty case.

## Architecture Check

1. **Why cleaner**: making CNSQ explicitly conditional removes the false default from the op list, makes `expected_id_allocations` self-consistent, and aligns with the Phase 5 reference's "empty directory" intent. Bootstrap-time CNSQ emission becomes an opt-in driven by the premise (e.g., "the story opens after the protagonist's brother has already been killed — install the body-discovery consequence at PG-0001").
2. No backwards-compatibility shim. The change is documentation-level; the engine op accepts the same shape regardless.

## Verification Layers

1. SKILL.md output tree, Phase 11 op list, and references agree: CNSQ creation is conditional → codebase grep-proof.
2. `expected_id_allocations` examples conditionally include `cnsq_ids` and `da_ids` → codebase grep-proof + manual review.
3. `.gitkeep` discipline preserved for `consequences/` when no records emitted → codebase grep-proof (existing convention at `SKILL.md:283`).
4. Engine submit semantics: a bootstrap envelope that omits `create_cnsq_record` ops AND omits `cnsq_ids` from `expected_id_allocations` validates cleanly → manual review (no engine code change required).

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Output tree (line 179): replace the comment with `CNSQ-NNNN.yaml (NOT emitted at default bootstrap; .gitkeep preserves directory; runtime page-cycle JIT-creates)`.
- Phase 11 step 3 op list (line 285): annotate `create_cnsq_record` and `append_story_diegetic_artifact_record` as conditional, with one short clause: "`create_cnsq_record` and `append_story_diegetic_artifact_record` are emitted ONLY when the premise establishes a pre-PG-0001 consequence or a story-local diegetic artifact present at bootstrap; otherwise omitted from both the op list AND the `expected_id_allocations` keys".

### 2. `.claude/skills/branching-story-bootstrap/references/phase-5-threads-and-obligations.md`

- Line 31 (consequences ledger init): retain the "empty directory" wording; add a one-sentence note: "CNSQ records ARE emitted at this phase only when the premise explicitly starts after a pre-existing consequence has already landed (e.g., 'the story opens with the protagonist's brother already buried' — emit the body-discovery CNSQ at PG-0001). Otherwise the directory holds only `.gitkeep`."

### 3. `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`

- §3 `expected_id_allocations` example (lines 94-108): add a comment line above the example: "Allocation keys are added ONLY when the corresponding ops appear in the envelope. Bootstrap envelopes typically OMIT `cnsq_ids` and `da_ids` because CNSQ + story-local DA records are conditional (premise-driven) at bootstrap, not default."
- §5 envelope-splitting fallback (line 159): annotate "Envelope B" entry — "`create_cnsq_record` and `append_story_diegetic_artifact_record` ops appear here only when the premise actually emits CNSQ / story-local DA records at PG-0001."
- §2 file-class → directory mapping (line 71): the existing "(rare at bootstrap; runtime page-cycle JIT-creates)" annotation already says this for `create_cnsq_record`. Extend the same annotation pattern to `append_story_diegetic_artifact_record`'s row.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-5-threads-and-obligations.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` (modify)

## Out of Scope

- Engine-side change. `create_cnsq_record` already exists; the op-list-and-allocation-list shape check already covers the contract.
- Editing `branching-story-page-cycle`'s CNSQ emission discipline (its CNSQ ops at `SKILL.md:352` are runtime-driven, not bootstrap-driven; no change needed).
- Migration of existing bundles. Forward-only for new bootstrap runs.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "CNSQ.*(NOT emitted|conditional|premise.*establish)" .claude/skills/branching-story-bootstrap/SKILL.md` returns matches in the output tree comment and Phase 11 op list.
2. `grep -nE "cnsq_ids.*conditional\|allocations are conditional\|omit.*cnsq" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns at least one match.
3. `grep -n "empty directory" .claude/skills/branching-story-bootstrap/references/phase-5-threads-and-obligations.md` still returns the existing match (Phase 5's default-empty intent preserved).
4. The .gitkeep convention at `SKILL.md:283` for `consequences/`, `objects/`, `artifacts/` is unchanged.

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
