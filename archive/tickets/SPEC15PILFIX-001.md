# SPEC15PILFIX-001: rule5_no_consequence_evasion must recognize `append_extension` as a SEC mutation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — validator-only change in `@worldloom/validators`. No engine, MCP, or skill changes.
**Deps**: SPEC-15 (`archive/specs/SPEC-15-pilot-feedback-fixes.md`)

## Problem

`tools/validators/src/rules/rule5-no-consequence-evasion.ts` enforces FOUNDATIONS Rule 5 (No Consequence Evasion) by walking each CF's `required_world_updates[]` file_class entries and asserting the patch plan contains a matching SEC operation for that file_class. The current implementation (`hasMatchingPatchForFileClass`, lines 115–133) recognizes only:

- `create_sec_record` ops with matching `payload.sec_record.file_class`
- `update_record_field` ops whose `target_record_id` has the matching SEC prefix

The patch engine emits `append_extension` as a distinct, first-class op-kind for SEC extension appends (`tools/patch-engine/src/ops/append-extension.ts`). The op auto-adds the originating CF to `touched_by_cf[]` and validates the bidirectional pointer (CF's `required_world_updates` must include the SEC's file_class) at engine apply time. Despite being a structurally complete SEC mutation, `append_extension` is invisible to rule5.

Live confirmation: 2026-04-26 PR-0015 first-canon-addition run. Initial patch plan used `append_extension` for each of the 4 SEC content extensions (SEC-MTS-002, SEC-ECR-002, SEC-INS-006, SEC-ELF-001). `validate_patch_plan` returned 4 `rule5.required_update_not_patched` failures, one per file_class. Workaround: replace each `append_extension` with `update_record_field { field_path: ["extensions"], operation: "append_list", new_value: ExtensionPayload }`. Both produce byte-identical on-disk output, but rule5 only sees the `update_record_field` form.

Effect: skill authors following the canon-addition SKILL.md guidance who reach for the more specialized `append_extension` op hit a confusing 4-fail block with no clear remediation path. The op is also bypassed for engine-level bidirectional-pointer validation that would otherwise catch a CF whose `required_world_updates` doesn't list the touched SEC's file_class — a load-bearing safety check.

## Assumption Reassessment (2026-04-26)

1. `tools/validators/src/rules/rule5-no-consequence-evasion.ts` lines 115–133 (`hasMatchingPatchForFileClass`) currently match only `create_sec_record` and `update_record_field` against SEC mutations. Confirmed by direct read of the file and by the 2026-04-26 PR-0015 validate_patch_plan output (4 verdicts of `rule5.required_update_not_patched` despite each file_class having an `append_extension` op).
2. `tools/patch-engine/src/ops/append-extension.ts` exports `stageAppendExtension` and is dispatched by the engine's apply-time op router. The op writes to the SEC record's `extensions[]` array and auto-adds the originating CF to `touched_by_cf[]`. Confirmed by direct read.
3. The cross-package boundary under audit: `@worldloom/validators` rule5 vs `@worldloom/patch-engine` `append_extension` op semantics. Both packages share the `PatchOperation` type from `tools/patch-engine/src/envelope/schema.ts`. The validator imports `PatchPlanEnvelope` and walks the `patches[]` array by op-kind string; expanding the rule's match set is type-safe.
4. FOUNDATIONS Rule 5 principle ("No Consequence Evasion") is the rule under audit. The principle requires that every CF's stated downstream impact actually be patched. `append_extension` IS a downstream patch in the engine's eyes; the validator's narrower match set under-enforces the rule, not over-enforces.
5. This ticket touches a Canon Safety Check surface (Rule 5 enforcement). Confirmed: change does not weaken the Mystery Reserve firewall (rule5 is orthogonal to MR / Rule 7). The change strengthens Rule 5 enforcement by closing a coverage gap, not weakening it.
6. No schema extension. No CF / CH / SEC field added or modified. Pure additive validator-logic change.
7. No skill, tool, hook, or schema field renamed or removed. Blast radius is limited to `tools/validators/src/rules/rule5-no-consequence-evasion.ts` plus its test file.
8. Adjacent contradiction surfaced during reassessment: `rule6_no_silent_retcons` already imports and recognizes `append_extension` (`tools/validators/src/rules/rule6-no-silent-retcons.ts:118`). So the validator framework's design already endorses `append_extension` as a structural mutation worth tracking; rule5 is the outlier, not the precedent. This is a required consequence of the intended fix (bring rule5 to parity), not a separate bug.
9. Live test-layout correction: `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` already exists and owns rule5 unit coverage. This ticket extends that file instead of creating the drafted `tools/validators/tests/rules/rule5.test.ts`.
10. Pre-change proof-surface drift: `cd tools/validators && npm test` failed before implementation because `tools/validators/tests/integration/spec04-verification.test.ts` still expected the pre-pilot Animalia fixture counts (47 CF YAML files, 20 CH YAML files, 17 adjudication markdown files) while the live fixture now contains 48 CFs (`CF-0048.yaml`), 21 CHs (`CH-0021.yaml`), and 18 adjudications from the 2026-04-26 pilot. Updating that package-local capstone count is required fallout for the ticket's required full test lane, not a rule5 behavior change.

## Architecture Check

1. **Why this is cleaner than alternatives**:
   - Alternative A (deprecate `append_extension` in favor of `update_record_field` for SEC extensions): would require a one-shot pass updating every skill that uses or might use `append_extension`, plus removing the engine op or marking it deprecated. Larger blast radius; introduces backwards-compatibility shims if not done atomically; conflicts with `tools/patch-engine/src/ops/append-extension.ts` engine-level bidirectional-pointer validation that does NOT exist on `update_record_field` (the engine-level safety check would be lost).
   - Alternative B (chosen): extend `hasMatchingPatchForFileClass` to recognize `append_extension`. Single-file change, single-test addition, preserves both op forms as semantically equivalent first-class options.
   - Alternative B is cleaner because it keeps rule5 in lockstep with engine reality, which already endorses both ops via rule6's existing pattern.
2. **No backwards-compatibility shims introduced.** Pure additive recognition. Existing patch plans using `update_record_field` continue to match exactly as before; new (or restored) plans using `append_extension` now also match.

## Verification Layers

1. Rule 5 enforcement covers `append_extension` SEC mutations -> codebase grep-proof (`hasMatchingPatchForFileClass` references `"append_extension"`) + schema validation (test fixture replays a SEC-`append_extension`-only patch and `validate_patch_plan` returns `verdicts: []`)
2. Existing `update_record_field` recognition is preserved -> codebase grep-proof (the existing match arm remains) + schema validation (existing rule5 tests pass)
3. FOUNDATIONS Rule 5 principle alignment -> FOUNDATIONS alignment check (`docs/FOUNDATIONS.md` §Validation Rules §Rule 5 — every CF's required-update list must be patched; the fix brings the validator to parity with the principle's plain reading)
4. Cross-package coherence (validator rule5 vs engine op vocabulary) -> codebase grep-proof (`grep -rn "append_extension" tools/validators/ tools/patch-engine/` shows rule5 + rule6 + engine all reference the op)

## What to Change

### 1. Extend `hasMatchingPatchForFileClass` to match `append_extension` ops

`tools/validators/src/rules/rule5-no-consequence-evasion.ts` — within `hasMatchingPatchForFileClass`, add a third match arm for `patch.op === "append_extension"`. The op's `payload.target_record_id` is the SEC id; resolve `<PREFIX>` to file_class via the existing `sectionIdMatchesFileClass(targetId, fileClass)` helper. Pseudocode:

```ts
return patches.some((patch) => {
  if (patch.op === "create_sec_record") {
    return asPlainRecord(patch.payload.sec_record).file_class === fileClass;
  }

  if (patch.op === "append_extension") {
    const targetId =
      typeof patch.payload.target_record_id === "string"
        ? patch.payload.target_record_id
        : patch.target_record_id ?? patch.target_node_id;
    return typeof targetId === "string" && sectionIdMatchesFileClass(targetId, fileClass);
  }

  if (patch.op !== "update_record_field") {
    return false;
  }
  // existing update_record_field arm unchanged
});
```

The `append_extension` arm intentionally requires the target be a SEC id (matches `sectionIdMatchesFileClass`'s prefix check). Engine-side, `append_extension` against a non-SEC target (INV / M / OQ) is also valid — those targets are NOT subject to rule5 because rule5's `required_world_updates` enumeration only covers SEC file_classes (`SECTION_FILE_CLASSES` set in the structural validator). Non-SEC `append_extension` ops are correctly ignored by rule5 just as they are today.

### 2. Add test coverage

`tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` — extend the existing rule5 test file with cases covering:

- Patch plans with one `create_cf_record` plus one `append_extension` against each SEC file_class prefix (ELF / INS / MTS / GEO / ECR / PAS / TML) → rule5 returns `verdicts: []`.
- The same plan with the `append_extension` removed → rule5 returns one `rule5.required_update_not_patched` failure.
- A patch plan with `append_extension` against a non-SEC target (e.g., `INV-ONT-1` invariant) plus a CF requiring `INSTITUTIONS` → rule5 returns the expected failure (because INV is not a SEC file_class match and INSTITUTIONS has no matching op); confirms non-SEC `append_extension` ops are correctly ignored by rule5.
- One existing-pattern case using `update_record_field` for a SEC extension → rule5 returns `verdicts: []` (regression guard).
 
### 3. Truth stale package-local capstone count

`tools/validators/tests/integration/spec04-verification.test.ts` — update the Animalia source count assertion from the pre-pilot 47 CF / 20 CH / 17 adjudication counts to the current 48 CF / 21 CH / 18 adjudication fixture so the package's full `npm test` lane matches the current post-pilot world fixture.

## Files to Touch

- `tools/validators/src/rules/rule5-no-consequence-evasion.ts` (modify)
- `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — package-local proof-surface count correction)
- `tools/validators/dist/...` (regenerated by `npm run build`; not committed manually)

## Out of Scope

- Modifying the engine's `append_extension` op behavior. The op is correct as-designed.
- Modifying `update_record_field` recognition. Existing match arm stays.
- Extending `rule4` / `rule6` / `rule7` to also recognize `append_extension`. `rule6` already does (per Assumption Reassessment item 8); other rules either don't gate on per-op SEC matching or have separate concerns. Each is a separate decision; scope creep here would obscure the rule5-specific defect.
- Re-running the 2026-04-26 PR-0015 envelope with `append_extension` ops restored. The on-disk result is byte-identical to what landed; re-running would generate a no-op CH entry without canon impact. Skipped per SPEC-15 §Out of Scope.
- Documentation of the `append_extension` op vocabulary. Lives under SPEC15PILFIX-002 (Track B — retrieval-tool decision tree references engine ops).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes after the rule5 change, including the modified `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` cases.
2. `node tools/validators/dist/src/cli/world-validate.js animalia --json` from the repo root — animalia world-state validation continues to report exactly the same fail count as before this change (no new failures introduced; no existing failures masked). Animalia's current `world-validate` baseline is "zero findings" per SPEC-14 closeout.
3. End-to-end replay smoke test: assemble a synthetic patch plan with one `create_cf_record` + one `append_extension` SEC mutation, call `validatePatchPlan(plan)` against animalia, verify `verdicts: []`. (Documented as a one-off command; not a permanent test fixture.)

### Invariants

1. **rule5 enforcement parity with engine op vocabulary**: every op-kind the engine emits as a SEC mutation is recognized by rule5 when it satisfies a `required_world_updates` file_class entry. Currently in scope: `create_sec_record`, `update_record_field`, `append_extension`. Future SEC mutation ops added to the engine require rule5 expansion in the same PR.
2. **No false-positive matches**: `append_extension` against non-SEC targets (INV / M / OQ) does not satisfy `required_world_updates` SEC file_class entries. Maintained by the `sectionIdMatchesFileClass` prefix gate.
3. **No schema or contract breakage**: `tools/validators/src/schemas/canon-fact-record.schema.json` and the `PatchOperation` type are unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts` — modified — covers the test cases enumerated under §Verification Layers and §What to Change item 2; rationale: verifies the recognition expansion plus regression guards on existing recognition arms.
2. `tools/validators/tests/integration/spec04-verification.test.ts` — modified — updates the Animalia capstone fixture counts to the current 48 CF / 21 CH / 18 adjudication state so the package full-test lane is truthful after the pilot canon addition.

### Commands

1. `cd tools/validators && npm test` — full test run after the change.
2. `cd tools/validators && npm run build` — confirms TypeScript compile is clean.
3. `node tools/validators/dist/src/cli/world-validate.js animalia --json` from repo root — confirms animalia's validation count is unchanged. The package-local cwd form is intentionally not used because the CLI resolves `worlds/<slug>` from `process.cwd()`.
4. `node -e "<synthetic validatePatchPlan append_extension smoke>"` from repo root — confirms a synthetic `create_cf_record` + `append_extension` SEC mutation returns `{"verdicts":[]}`.

## Outcome

Implemented. `rule5_no_consequence_evasion` now recognizes `append_extension` operations whose `payload.target_record_id` maps to the required SEC file_class prefix. Existing `create_sec_record` and `update_record_field` recognition remains unchanged.

Test coverage was added to the existing rule5 test file for all seven SEC file_class prefixes, plus the non-SEC `append_extension` rejection path. The package-local SPEC-04 capstone fixture counts were also corrected to the current post-pilot Animalia source shape (48 CF / 21 CH / 18 adjudication files) so the required full `npm test` lane is truthful.

## Verification Result

1. `cd tools/validators && npm test` — passed (54/54 tests). Historical intake run failed before implementation on stale SPEC-04 capstone counts: expected 47/20/17, live fixture was 48/21/18.
2. `cd tools/validators && npm run build` — passed.
3. `node tools/validators/dist/src/cli/world-validate.js animalia --json` — passed from repo root with `fail_count: 0`, `warn_count: 0`, `info_count: 0`; `rule5_no_consequence_evasion` remains skipped as `pre-apply-only` in full-world mode.
4. Synthetic repo-root `validatePatchPlan` smoke with `create_cf_record` + `append_extension` targeting `SEC-MTS-002` — passed with `{"verdicts":[]}`.
5. Codebase grep-proof: `append_extension` now appears in `tools/validators/src/rules/rule5-no-consequence-evasion.ts`, `tools/validators/src/rules/rule6-no-silent-retcons.ts`, and `tools/patch-engine/src/ops/append-extension.ts`.

## Deviations

1. The drafted test path `tools/validators/tests/rules/rule5.test.ts` was not created because the live package already had `tools/validators/tests/rules/rule5-no-consequence-evasion.test.ts`; extending the existing file is the cleaner package-local proof surface.
2. The drafted CLI command `cd tools/validators && node dist/src/cli/world-validate.js animalia --json` was not used for acceptance because it fails by resolving `worlds/animalia` under `tools/validators`. The truthful command is repo-root `node tools/validators/dist/src/cli/world-validate.js animalia --json`.
3. `npm test` and `npm run build` regenerated ignored package artifacts under `tools/validators/dist/`; `tools/validators/node_modules/` was already present and remains ignored. No generated artifacts were committed manually.
