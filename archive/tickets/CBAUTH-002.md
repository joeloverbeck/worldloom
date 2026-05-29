# CBAUTH-002: Phase 6 lacks a worked create_slt_record envelope skeleton; verdict/approval_token values are guesswork

**Status**: ✅ COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/SKILL.md` (Phase 6) and/or a new `references/` snippet; docs only.
**Deps**: None

## Problem

Phase 6 sub-step 1 points to `describe_envelope_schema(op_kind='create_slt_record')` for "the full envelope and per-op payload schemas," but the schema alone leaves three concrete authoring decisions unspecified, forcing guesswork during this run:

1. **`verdict`** — the envelope schema types it as `{string, minLength: 1}` with no enum and no prescribed value. I used `"approve"`; it passed `approval_semantics`, but the correct/expected token string is not documented anywhere in the skill.
2. **`approval_token` before signing** — the build-then-dry-run flow needs a value in the envelope's required `approval_token` field before `sign-approval-token.js` runs. I used a `"PENDING"` placeholder; it validated and the signer/submit accepted it, but the skill never states what to place there during the dry-run, nor that the signer issues the real token out-of-band (to a token file consumed by the submit CLI's `<token-path>` arg) rather than by editing the envelope.
3. **`expected_id_allocations`** — for a 6-SLT batch the correct key is `slt_ids: [...]` and the `SLB` id is NOT listed (it is a markdown manifest, not a patch-consumed id). This is inferable but not stated; an author could wrongly add an `slb_ids` allocation.

A short worked skeleton would remove all three ambiguities and reduce the risk of a malformed envelope reaching submit.

## Assumption Reassessment (2026-05-29)

1. **Codebase/skill**: `.claude/skills/commitment-block-authoring/SKILL.md` Phase 6 sub-step 1 references `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` and the `describe_envelope_schema` tool for envelope shape, but neither prescribes a `verdict` string nor the placeholder-token convention. `describe_envelope_schema(op_kind='create_slt_record')` output confirms `verdict` is an unconstrained non-empty string and `approval_token` is required (`minLength: 1`).
2. **Specs/docs**: `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token documents the signer/submit CLI flow but (per this run) does not give a copy-pasteable envelope skeleton with a known-good `verdict` and the pre-sign placeholder. The two existing batch manifests (`SLB-1.md`, this run's `SLB-2.md`) record the *submit result* but not the envelope authoring values.
3. **Shared boundary under audit**: the patch-plan envelope contract (`tools/patch-engine/src/envelope/schema.ts`) and `approval_semantics` validator vs. the skill's Phase 6 authoring instructions. The skill should make the minimum legal `create_slt_record` envelope reproducible without reverse-engineering accepted values.
6. **Schema reference (read-only)**: this ticket does not extend the envelope schema; it documents known-good values for existing required fields (`verdict`, `approval_token`, `expected_id_allocations.slt_ids`). Additive doc only.

## Architecture Check

1. Cleaner than leaving authors to infer values from a passing run: a single canonical skeleton in the skill removes guesswork and makes dry-run/submit reproducible, lowering the chance of a malformed envelope. It documents existing behavior; it does not add a new field or mechanism.
2. No backwards-compatibility shim: pure documentation; the skeleton mirrors what the engine already accepts.

## Verification Layers

1. Skeleton produces a validate-clean envelope -> skill dry-run (`validate-patch-plan.js` on an envelope built from the documented skeleton returns `status: pass`).
2. Documented `verdict`/placeholder-token match accepted values -> codebase grep-proof (the skeleton's `verdict` and token handling are consistent with `approval_semantics` and `sign-approval-token.js` behavior).
3. `SLB` correctly excluded from `expected_id_allocations` -> manual review (skeleton lists only `slt_ids`).

## What to Change

### 1. Add a worked create_slt_record envelope skeleton to Phase 6

Add (in `SKILL.md` Phase 6 sub-step 1 or a small `references/phase-6-envelope-skeleton.md`) a minimal commented envelope: `plan_id`, `target_world`, the pre-sign `approval_token` placeholder convention, a known-good `verdict` value, `originating_skill: "commitment-block-authoring"`, `expected_id_allocations: { slt_ids: [...] }` (note: no `slb_ids`), and one example `create_slt_record` patch op with `target_file` set to the `_source/storylets/SLT-<n>.yaml` path.

### 2. State the placeholder-token → sign → submit sequencing explicitly

One sentence clarifying that the envelope carries a placeholder `approval_token` through the dry-run, and the real token is issued by `sign-approval-token.js` to a token file consumed by the submit CLI's `<token-path>` argument (not by editing the envelope).

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify) and/or `.claude/skills/commitment-block-authoring/references/phase-6-envelope-skeleton.md` (new)

## Out of Scope

- Changing the envelope schema, `verdict` semantics, or token lifecycle.
- Other skills' envelope docs (open a sibling ticket if the same skeleton gap exists in turn-cycle/bootstrap).

## Acceptance Criteria

### Tests That Must Pass

1. An envelope assembled verbatim from the documented skeleton (substituting real SLT ids) passes `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root <root> <plan>` with `status: pass`.
2. The skeleton's `expected_id_allocations` contains `slt_ids` only (no `slb_ids`).

### Invariants

1. The skill documents a reproducible, validate-clean minimal `create_slt_record` envelope without requiring an author to reverse-engineer accepted `verdict`/`approval_token` values.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based via the existing validate-patch-plan CLI named below.`

### Commands

1. Build a throwaway envelope from the skeleton and run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom <plan>.json 2>/dev/null`.
2. `jq '.expected_id_allocations | keys' <plan>.json` → confirms `["slt_ids"]`.


## Outcome

**Completed**: 2026-05-29

### What changed

- New `.claude/skills/commitment-block-authoring/references/phase-6-envelope-skeleton.md`: a worked, validate-clean `create_slt_record` envelope skeleton resolving the three non-schema authoring decisions — `verdict: "approve"`; the `approval_token: "PENDING"` dry-run placeholder with explicit placeholder->sign->submit sequencing (the real token is issued out-of-band by `sign-approval-token.js` to a token file consumed by submit `<token-path>`, never edited into the envelope); and `expected_id_allocations: { slt_ids: [...] }` with an explicit note that `SLB` carries NO id allocation (markdown manifest, not a patch-consumed record). Includes a full minimal envelope JSON with one `create_slt_record` op, `target_file` pointing at `_source/storylets/SLT-<n>.yaml`, and `originating_skill: "commitment-block-authoring"`.
- `SKILL.md` Phase 6 sub-step 1: added a pointer to the new skeleton reference, naming the three fixed values inline.

### Deviations

- Implemented as a dedicated `references/` snippet (the ticket offered SKILL.md inline OR a reference; the reference keeps the already-dense Phase 6 lean and matches the skill’s reference-extraction pattern).

### Verification

- Built a throwaway envelope verbatim from the skeleton (substituting `target_world: erotica-world`, `story_slug: red-bunny`, `story_id: STORY-1`, and the real next id `SLT-20`).
- `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom <plan>.json 2>/dev/null` -> `status: pass`, zero fail verdicts (record_schema_compliance, approval_semantics, slt_grounding_minimal_integrity, storylet_predicate_dsl_parsability, and all rule validators PASS). Acceptance criterion 1 met.
- `jq ".expected_id_allocations | keys"` -> `["slt_ids"]` (no `slb_ids`). Acceptance criterion 2 met.
- Confirming the placeholder/verdict claims: a first run with a non-next id (SLT-900) failed ONLY on `id_allocation_race` while `approval_semantics` still PASSED with `verdict: "approve"` + `approval_token: "PENDING"`, proving those two values are accepted independently of id allocation (verification layer 2).
