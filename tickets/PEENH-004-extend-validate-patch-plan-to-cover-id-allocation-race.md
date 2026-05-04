# PEENH-004: Extend `validate_patch_plan` to cover `id_allocation_race` (currently submit-only, leaks to operator as a re-validate / re-sign / re-submit recovery cycle)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (new — shared check function extracted from `apply.ts`), `tools/patch-engine/src/apply.ts` (modify — replace inline race-check returns at lines 209/218/224/233/238/267/272 with calls into the new shared module while preserving exact error-message format), `tools/world-mcp/src/cli/validate-patch-plan.ts` (modify — call the shared check after the existing structural validators), `tools/world-mcp/src/tools/validate-patch-plan.ts` (or equivalent MCP tool surface — modify — same wiring), `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` (new), `tools/world-mcp/tests/integration/validate-patch-plan-id-allocation-race.test.ts` (new).
**Deps**: `archive/tickets/PEENH-001.md` (the patch-engine skill-bundle ops baseline that established the engine-routed write surface and the standard pre-apply check discipline; the id-allocation-race check is part of that pre-apply check vocabulary).

## Problem

At Phase 11 of every patch-engine consumer skill (`branching-story-page-cycle`, `branching-story-bootstrap`, `canon-addition`, `create-base-world`, `character-generation`, `diegetic-artifact-generation`, `storylet-pool-authoring`), `mcp__worldloom__validate_patch_plan(envelope)` returns `status: pass` for envelopes that the subsequent `submit_patch_plan` rejects with `id_allocation_race`. The operator-visible recovery cost per mismatch is: re-allocate the offending id-class via `mcp__worldloom__allocate_next_id`, re-edit the envelope (often at multiple sites because the wrong id appears in record body, target_file, expected_id_allocations, supersession references, and validation-trace narratives), re-validate (PASSes again — same incomplete coverage), re-sign (envelope bytes changed, so HMAC re-binding is required), re-submit. ~5 minutes of operator work + one cycle of avoidable rework per submit-time mismatch.

Concrete session evidence (2026-05-04): during `branching-story-page-cycle` execution against `worlds/erotica-world/stories/red-bunny`, advancing PG-0003 → PG-0004 via CHC-0012, the operator constructed `expected_id_allocations: { ..., obl_ids: ["OBL-0014"], ... }` based on filesystem-counting (12 OBL files visible on disk: `OBL-0001.yaml`..`OBL-0012.yaml`; supersession chains OBL-0007→OBL-0010, OBL-0008→OBL-0011, OBL-0009→OBL-0012 leave no filename gaps, but the operator's mental count of "supersession-resolved logical state" produced an off-by-one when extrapolating to the next id). Validate-plan returned:

```json
{ "status": "pass", "verdicts": [], "validators_run": [/* 11 validators all pass */] }
```

Submit returned:

```json
{
  "ok": false,
  "code": "id_allocation_race",
  "message": "obl_ids allocation race for story 'red-bunny': expected OBL-0014, current next id is OBL-0013."
}
```

The operator re-allocated via `mcp__worldloom__allocate_next_id(world_slug='erotica-world', id_class='OBL', story_slug='red-bunny')` (returned `OBL-0013`), edited the build script to rename OBL-0014 → OBL-0013 across 8 sites (record id, target_file, `expected_id_allocations.obl_ids`, supersession references in OBL/THR/SLT/SE/PG state_snapshot, validation_trace narratives), re-ran the build, re-validated (PASS), re-signed (envelope bytes had changed so HMAC re-binding was required), re-submitted (success).

The page-cycle skill's prose was subsequently tightened (via the same session's `/skill-audit` follow-up implementation) to require per-class pre-allocation via `mcp__worldloom__allocate_next_id` for every id-class the envelope will populate (`SF` / `OBL` / `THR` / `SREL` / `STINT` / `SE` / `SLT` / `CHC` plus `PG` / `BR`), parallel to `branching-story-bootstrap`'s long-standing per-class pre-allocation discipline. Operator discipline correctly applied avoids the gap. **But the id_allocation_race check at validate-time would catch the case structurally — via the engine's own canonical next-id calculation — without depending on operator discipline.** This is the same shape as PEENH-003 (which made the engine error self-document a recovery path), but for an earlier surface: catch the mismatch BEFORE signing, not after submit.

The skill prose at `branching-story-page-cycle/SKILL.md` line 351 acknowledges the gap: *"Does NOT cover approval-token verification or id-allocation race (both submit-only); treat as a defensive pre-submit check, not a complete gate."* The disclosure is descriptive but does not link to a planned-remediation ticket; the same wording appears in `branching-story-bootstrap/references/engine-envelope-shape.md` §1c.

At intake (2026-05-04), `grep -rn 'id_allocation_race' tools/world-mcp/src/` returned zero hits — confirming the check is patch-engine-internal and not currently surfaced through any validate-plan path (CLI or MCP).

## Assumption Reassessment (2026-05-04)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. **Codebase reassessment** — `id_allocation_race` returns are confirmed at HEAD only inside `tools/patch-engine/src/apply.ts` at seven call sites (lines 209, 218, 224, 233, 238, 267, 272), covering CF/CH world classes, INV per-category, SEC per-prefix, and story-bundle classes (the per-key story-scoped check at line 272 is the one that fired in the session-evidence case). The schema enum entry lives at `tools/patch-engine/src/envelope/schema.ts:142`. Zero occurrences in `tools/world-mcp/src/` — confirming the check is not surfaced through the validate-plan path. The check is structurally pre-apply (it depends only on the world-index next-id state, not on token verification or write side-effects), so factoring it out into a separately-callable function is mechanically straightforward. No state-mutation logic intermixed with the check; the existing call sites are pure conditional returns immediately after a next-id query.

2. **Doc reassessment** — `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan documents the validate-plan + sign + submit sequence; current text doesn't claim validate-plan covers id_allocation_race, but doesn't disclaim it either — the docs are silent on this specific coverage gap. After this ticket lands, the docs section should explicitly note that validate-plan now also catches id-allocation race (additive update; no contradiction with prior text). `docs/MACHINE-FACING-LAYER.md` does not mention id_allocation_race; no edit needed there. The per-package README at `tools/patch-engine/README.md` documents `validate_patch_plan` coverage and will need a one-line addition naming the new check.

3. **Cross-skill / cross-artifact shared boundary** — the validate-plan flow is consumed by every patch-engine submitter: `branching-story-page-cycle`, `branching-story-bootstrap`, `canon-addition`, `create-base-world`, `character-generation`, `diegetic-artifact-generation`, `storylet-pool-authoring`. The skill-prose disclosures of "submit-only id-allocation race" (page-cycle SKILL.md line 351, plus the parallel passages in bootstrap's `references/engine-envelope-shape.md` §1c, and any equivalent passages in canon-addition / create-base-world) all need updating once the check moves to validate-time — but those updates are skill-audit follow-up via `/skill-audit <skill-path>`, NOT patch-engine work, and are explicitly out of scope for this ticket. The shared boundary under audit is the **validate-plan PASS contract**: today PASS means "the structural validators (yaml_parse_integrity, id_uniqueness, cross_file_reference, record_schema_compliance, Rules 1-7) ran and passed; submit may still fail on token verification OR id-allocation race"; after this ticket PASS means "all of the above PLUS id-allocation race is clean; submit may still fail on token verification (the only remaining submit-only check, structurally required because token-binding includes single-use enforcement)".

4. **FOUNDATIONS principle Rule 6 (No Silent Retcons)** — applied at pipeline scope: the existing validate-plan PASS contract is being narrowed (a previously-PASSing envelope with an allocation mismatch will now FAIL at validate-time). The session-evidence one-liner above IS the retcon justification: the existing behavior is the operator-friction-causing PASS-then-submit-fails sequence, the new behavior is PASS-fails-correctly-at-validate, the warrant is the audit's emergence + the parallel landing of skill-prose tightening that makes operator-discipline avoidance the primary defense (with this ticket as the structural backstop). No silent change; the docs and per-package README updates above name the contract change explicitly.

5. **Output schema extension** — the `validate_patch_plan` response shape extends additively: a new entry `{ validator_name: "id_allocation_race", status: "pass" | "fail", duration_ms: <number> }` is added to the existing `validators_run[]` array, parallel to the existing entries (yaml_parse_integrity, id_uniqueness, cross_file_reference, record_schema_compliance, rule1-rule7, storylet_predicate_dsl_parsability, rule11, rule12). On `fail`, the response's `verdicts[]` array gains a verdict entry naming the offending key (e.g., `obl_ids`) and the expected-vs-current next id, parallel to the existing verdict shape (file-path location + structured details). Consumers parsing `validators_run` see one new entry; consumers checking the top-level `status` field continue to work unchanged (the field flips PASS→FAIL on the new check's failure, which is the intended semantic). Existing consumers parsing only the `code === "id_allocation_race"` shape (which only the submit path returns) continue to work unchanged because the submit path remains a defense-in-depth backstop.

## Architecture Check

1. **Cleaner than alternatives** — extracting the existing submit-time check into a reusable pre-apply function and calling it from BOTH validate-plan AND submit is the idiomatic fix and matches PEENH-003's pattern (single source-of-truth ergonomics improvement). Alternatives considered and rejected: (a) duplicating the check at validate-plan — fails DRY; allocation-race semantics evolve (e.g., MCPENH-028's STINT regex tightening) and two copies would diverge; (b) leaving the check submit-only and adding stronger skill-prose discipline — fails because operator discipline lapses (this very session's evidence) and the check is structural; (c) auto-allocating ids when expected_id_allocations is incomplete — rejected because explicit allocations are a load-bearing defensive contract per the patch-engine envelope schema (the operator declares what they intend to write; the engine verifies); (d) adding a new validator under `tools/validators/src/` — rejected because the check is patch-plan-shape-specific (uses the envelope's `expected_id_allocations` field), not a record-content validator, and the existing pre-apply infrastructure is the better fit.
2. **No backwards-compatibility shims** — the validate-plan response shape extends additively (one new validators_run entry); the submit path's id_allocation_race return is preserved unchanged as defense-in-depth for the validate→sign→submit race window; no aliasing, no flag-gated behavior, no deprecation cycle.

## Verification Layers

1. **Validate-plan now returns FAIL on envelopes with id-allocation race** → integration test at `tools/world-mcp/tests/integration/validate-patch-plan-id-allocation-race.test.ts` (codebase grep-proof: assert exit code + structured failure + verdict naming the offending key for a deliberately-mismatched envelope).
2. **Submit-time id-allocation race check still fires on the validate→sign→submit race window** → existing patch-engine integration tests at `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` continue to pass unchanged (codebase grep-proof: no removal of submit-time check).
3. **The pre-apply check is implemented in exactly one source location** → codebase grep-proof: `grep -rn 'id_allocation_race' tools/patch-engine/src/` returns one definition site (the new shared module) plus call sites at apply.ts and (transitively, via the MCP wrapper) validate-plan; no inline duplicate logic.
4. **Skill-prose disclosures of "submit-only" gap are flagged for cross-skill cleanup** → manual review: this ticket's Out of Scope explicitly defers the skill-prose updates to `/skill-audit` follow-up; no patch-engine work depends on those updates landing.

## What to Change

### 1. Extract `id_allocation_race` check into shared pre-apply module

Create `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` exposing a function with this signature:

```typescript
export interface IdAllocationRaceResult {
  ok: boolean;
  code?: "id_allocation_race";
  message?: string;
  /** Per-key breakdown for verdicts */
  failures?: Array<{ key: string; expected: string; current: string; story_slug?: string }>;
}

export function checkIdAllocationRace(
  envelope: PatchPlanEnvelope,
  worldIndex: WorldIndexHandle
): IdAllocationRaceResult;
```

The function performs the same per-class scans currently inlined in `apply.ts:200-280` (CF, CH, INV per-category, SEC per-prefix, plus per-story-bundle key) and returns either `{ ok: true }` or `{ ok: false, code: "id_allocation_race", message: <first-mismatch> }`. The `failures` array enables validate-plan to report all mismatches in one pass (apply.ts can continue to short-circuit on first mismatch via `failures[0]` per current behavior).

### 2. Refactor `tools/patch-engine/src/apply.ts` to call the shared module

Replace the inline race-check returns at lines 209/218/224/233/238/267/272 with a single call to `checkIdAllocationRace` near the top of the apply flow (after envelope validation but before token verification). On a mismatch, return the same error shape as today: `error("id_allocation_race", failures[0].message)`. Preserve exact wording of the existing per-key error messages so consumers parsing the `message` string continue to work.

### 3. Wire the new check into `validate_patch_plan`

Update `tools/world-mcp/src/cli/validate-patch-plan.ts` and the MCP tool surface at `tools/world-mcp/src/tools/validate-patch-plan.ts` (or equivalent — verify exact file at implementation time) to call `checkIdAllocationRace` after the existing structural validators (yaml_parse_integrity, id_uniqueness, cross_file_reference, record_schema_compliance, Rules 1-7, storylet_predicate_dsl_parsability, rule11, rule12). Add the result to the `validators_run` array as `{ validator_name: "id_allocation_race", status: <"pass" | "fail">, duration_ms: <elapsed> }`. On `fail`, push a verdict to the response's `verdicts[]` array naming the offending key and the expected-vs-current next id; flip the top-level `status` to `fail`.

### 4. Add tests

New test file `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` covering: (a) fresh envelope with matching allocations across all classes — pass; (b) envelope with one off-by-one allocation in obl_ids — fail with the correct per-key error message; (c) envelope with deliberate over-allocation across multiple keys — fail with the first mismatch reported and `failures[]` listing all mismatches. New integration test at `tools/world-mcp/tests/integration/validate-patch-plan-id-allocation-race.test.ts` confirming validate-plan now returns `status: fail` for an envelope that reproduces the session-evidence shape (story-bundle obl_ids off-by-one against world-index state); assert the validators_run entry and the verdict shape.

## Files to Touch

- `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (new — shared check function)
- `tools/patch-engine/src/apply.ts` (modify — replace inline checks with shared-function call; preserve exact error-message format)
- `tools/world-mcp/src/cli/validate-patch-plan.ts` (modify — wire the new check into the validators sequence)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` or equivalent MCP tool wrapper (modify — same wiring; verify exact file at implementation time)
- `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` (new — unit tests for the shared function)
- `tools/world-mcp/tests/integration/validate-patch-plan-id-allocation-race.test.ts` (new — integration test for the validate-plan surface)
- `tools/patch-engine/README.md` (modify — add one-line note that `validate_patch_plan` now covers id-allocation race; the existing "Does NOT cover ..." disclaimer if present should be updated to drop id-allocation race from the not-covered list)

## Out of Scope

- **Skill-prose updates** removing the "submit-only" disclosure from `branching-story-page-cycle/SKILL.md` line 351, `branching-story-bootstrap/references/engine-envelope-shape.md` §1c, and any parallel passages in canon-addition / create-base-world / character-generation / diegetic-artifact-generation / storylet-pool-authoring are NOT part of this ticket. Those are cross-skill cleanup that runs via `/skill-audit <skill-path>` follow-up implementation after this ticket lands. Filing a sibling ticket for the skill-prose work is also acceptable; either path preserves the audit trail.
- **The submit-time id-allocation race check IS retained** as a defense-in-depth backstop for the validate→sign→submit race window (a parallel plan can theoretically allocate the same id between this plan's validate and submit). Removing it is explicitly out of scope; this ticket adds validate-time coverage as additive defense, not as replacement.
- **Auto-allocation of ids when `expected_id_allocations` is missing values** is explicitly out of scope. The explicit-allocation contract is load-bearing per the patch-engine envelope schema (the operator declares intent; the engine verifies), and removing the explicit-allocation requirement would weaken the audit trail.
- **Approval-token verification at validate-time** is explicitly out of scope. Token verification depends on submit-time single-use enforcement (the token is consumed on accept); validate-time check would require either accepting that the token is verified twice or refactoring single-use semantics, both of which exceed this ticket's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <envelope-with-mismatched-obl-id>` returns exit code != 0 with `status: "fail"` in the response, validators_run includes an `id_allocation_race` entry with `status: "fail"`, and verdicts includes an entry naming the offending key (e.g., `obl_ids`) and the expected-vs-current next id.
2. `mcp__worldloom__submit_patch_plan(<envelope-with-mismatched-obl-id>, <signed-token>)` continues to return `{ ok: false, code: "id_allocation_race", message: <same-format-as-current> }` for envelopes that bypass validate-plan or where a parallel plan landed between validate and submit (defense-in-depth backstop preserved).
3. Existing patch-engine integration test suite passes unchanged (`pnpm --filter @worldloom/patch-engine test`).
4. Existing world-mcp integration test suite passes unchanged except for the new file added in §4 (`pnpm --filter @worldloom/world-mcp test`).

### Invariants

1. The validate-plan `validators_run[]` array includes an `id_allocation_race` entry for every patch plan with story-bundle or world-canon create ops; the entry's `status` reflects the per-key check outcome.
2. The id-allocation-race check is implemented in exactly one source location (`tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts`); both apply.ts and the validate-plan path call into it; no inline duplicate logic at the prior call sites.
3. The submit-time check at apply.ts is preserved as a defense-in-depth backstop; removing it would weaken the validate→sign→submit race-window guarantee.
4. The error-message format for `id_allocation_race` is preserved verbatim across both surfaces; consumers parsing `message: "<key> allocation race: expected <id>, current next id is <id>."` (or the story-scoped variant) continue to work unchanged.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` — new — unit tests for the shared `checkIdAllocationRace` function across the per-class allocation surfaces (CF, CH, INV per-category, SEC per-prefix, story-bundle per-key); cases (a) all-matching pass, (b) single-key off-by-one fail with correct message, (c) multi-key over-allocation fail with first-mismatch + `failures[]` populated.
2. `tools/world-mcp/tests/integration/validate-patch-plan-id-allocation-race.test.ts` — new — integration test reproducing the session-evidence shape: build an envelope with a story-bundle `obl_ids` off-by-one against world-index state, call validate-plan, assert `status: "fail"`, assert the `validators_run` entry, assert the verdict naming the offending key.
3. `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` — modify only if the validate→submit sequence's expected outputs shift (e.g., a test that previously asserted validate-plan PASS for an envelope that this ticket's new check would now FAIL needs updated assertions). No removal of submit-time race-check assertions.

### Commands

1. `pnpm --filter @worldloom/patch-engine test` — runs patch-engine pre-apply check unit tests including the new file in §4.1.
2. `pnpm --filter @worldloom/world-mcp test` — runs MCP wrapper integration tests including validate-plan, including the new file in §4.2.
3. `pnpm test` — full-pipeline verification confirming no regression across the worldloom test suite.
