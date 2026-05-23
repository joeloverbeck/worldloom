# SPEC75BRAAWASTCHAR-001: Replace `stchar_supersession_integrity` ordinal-only reachability with `branch_path`-based check + multi-branch tests

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/stchar-supersession-integrity.ts` (mechanism changed from ordinal compare to `branch_path` set-inclusion; new failure sub-code; extended diagnostic context object); `tools/validators/src/structural/stchar-utils.ts` (`branchPath(page)` accessor); new test file `tools/validators/tests/structural/stchar-supersession-integrity.test.ts`; bundled-overview test `tools/validators/tests/structural/stchar-structural-validators.test.ts` (duplicate supersession block removed); `archive/specs/SPEC-75-branch-aware-stchar-supersession.md` and `archive/specs/IMPLEMENTATION-ORDER-2026-05-23-3.md` truthed to the landed no-walker implementation.
**Deps**: None

## Problem

At intake, the `stchar_supersession_integrity` validator at `tools/validators/src/structural/stchar-supersession-integrity.ts` reasoned by page ordinal only: a STCHAR was considered live on every page whose ordinal preceded the supersession event, dead on every page whose ordinal exceeded it. This silently coupled sibling branch state — when branch A at PG-6 regenerated `STCHAR-1` to `STCHAR-2`, the validator forced sibling branch B at PG-8 to use `STCHAR-2` even though PG-8's ancestor chain did not include PG-6.

The failure mode prevented safe use of `regeneration_reason_class: durable_branch_transformation` (the branch-local lifecycle reason established by archived SPEC-74). Per FOUNDATIONS Rule 4 (No Globalization by Accident), a local capability — here, a branch-local STCHAR regeneration — must not be silently treated as universal. Branch-ancestry-aware reachability via the existing PG `branch_path` field is the implemented fix.

(See SPEC-75 §2.1 for the full failure-mode walkthrough.)

## Assumption Reassessment (2026-05-23)

1. The validator's ordinal-only logic lives at `tools/validators/src/structural/stchar-supersession-integrity.ts:33-44`; the failure-emit block follows at lines 45-58 with sub-code `stchar_supersession_integrity.inactive_stchar_active_on_page` (line 48); the local `supersessionOrdinal()` helper at lines 67-74 reads `successor.generated_at_page` or `stchar.retired_at_page`. The PG record schema declares `branch_path: string[]` as required (minItems 1) at `tools/validators/src/schemas/story-page.schema.json:9-31`. The sibling-validator consumption pattern for `branch_path` — read directly via `stringArray(asPlainRecord(page.parsed).branch_path)` — is established at `tools/validators/src/structural/stemo-utils.ts:232`, `stplan-utils.ts:225`, `secret-utils.ts:156-167`, `recursive-reference-closure.ts:19-39`, `story-question-utils.ts:159`. `stchar-utils.ts` already exports the helper family (`pageId`, `recordPageOrdinal`, `generatedAtPageOrdinal`, etc.); adding `branchPath(page)` follows that pattern.
2. SPEC-75 §4.2 prescribes the new sub-code `stchar_supersession_integrity.inactive_stchar_active_on_descendant` (replacing the retired form) and the extended diagnostic context object (existing fields `page_id`, `stchar_id`, `status`, `reference_path` plus new `supersession_page_id` and `successor_stchar_id`). §7 enumerates six scenarios (two positive currently-failing -> now-passing, two positive must-still-pass, two negative). §5 prescribes inline fixture construction per the `chc-slt-selected-commitment-trace.test.ts` builder pattern (not YAML fixtures under `tools/validators/tests/fixtures/`). `archive/specs/IMPLEMENTATION-ORDER-2026-05-23-3.md` has been moved to complete status for this sprint and now records that SPEC-75 landed without adding a traversal primitive. Archived `SPEC-74` provides the `regeneration_reason_class: durable_branch_transformation` enum value that names the branch-local-transformation reason class this ticket makes operationally safe.
3. **Cross-skill / contract boundary**: the validator framework's structural-validator contract at `tools/validators/src/framework/types.ts` (`Validator` interface — `name`, `severity_mode`, `applies_to`, `run`). The validator continues to satisfy `severity_mode: "fail"`, `applies_to: appliesToStcharStoryState`, and the `run(input, ctx): Promise<Verdict[]>` shape. No framework changes; only the validator body's reachability mechanism shifts. Downstream verdict consumers depend on the context object's existing field names; extension MUST be additive (item 6 below enforces).
4. **FOUNDATIONS Rule 4 (No Globalization by Accident)** is the directly motivating principle: "A local capability must not be silently treated as universal." The current ordinal-only check IS the silent globalization — a branch-local STCHAR regeneration is silently applied to every page with a higher ordinal regardless of branch. The new mechanism reads the PG schema's serialized ancestry and tests set-inclusion of the supersession page id, restricting the verdict to genuine descendants and preserving Rule 4 by construction. Rule 6 (No Silent Retcons) governs the sub-code retirement audit trail captured in item 6 below.
5. **Canon Safety surface**: this ticket modifies a structural validator under `tools/validators/src/structural/` — per the spec-to-tickets §Step 6.2(c) per-ticket-type granularity rule, structural-validator modifications gate canon and story-bundle record writes at engine pre-apply time, so the Canon Safety surface engages. The mechanism shift (ordinal → `branch_path`) is strictly more precise: descendant pages still FAIL (correctly), non-descendant pages now PASS (correctly). The Mystery Reserve firewall is not consulted by this validator and is not weakened by the change. No `forbidden_*` enum or `_source/` write path is altered.
6. **Sub-code retirement + bundled-test blast radius** (was template item 7 — rename/remove blast radius). The retired sub-code `stchar_supersession_integrity.inactive_stchar_active_on_page` appears at: (a) `tools/validators/src/structural/stchar-supersession-integrity.ts:48` — the validator emit site this ticket replaces; (b) `tools/validators/tests/structural/stchar-structural-validators.test.ts:75` — the bundled-overview single-case test that asserts the old sub-code (addressed via What to Change item 4 — the spec-to-tickets Step 2 spot-check (e) routed this as expand-scope-in-place); (c) `tools/validators/dist/...` — compiled output that auto-regenerates on `npm run build` (no source edit needed); (d) `archive/specs/SPEC-75-branch-aware-stchar-supersession.md:109` — the spec describing the retirement (informational; preserved as Rule 6 audit-trail). A pipeline-wide grep across `tools/`, `.claude/skills/`, `docs/`, `specs/`, `archive/specs/` returns no other consumers of the old sub-code; the blast radius is bounded to (a) + (b) within this ticket's scope.
7. **Same-seam spec-order truthing.** User supplied `specs/SPEC-75*` as implementation authority. The live spec rejected any `pageAncestry` or traversal walker and prescribed direct `branch_path` set-inclusion, but at intake `specs/IMPLEMENTATION-ORDER.md:14` still said this slice would add a branch-ancestry traversal primitive and labelled risk around a "new traversal primitive." That row was same-seam current-state prose and has been updated to match the landed no-walker implementation, then archived as `archive/specs/IMPLEMENTATION-ORDER-2026-05-23-3.md`.
8. **Pre-edit package baseline.** From `tools/validators`, `npm test` passed before source edits (`960` tests passing). Pre-existing ignored package artifacts were present before the run: `tools/validators/dist/` and `tools/validators/node_modules/`.

## Architecture Check

1. **Reuses already-serialized ancestry rather than introducing a new traversal primitive.** Every committed PG record carries `branch_path` — the schema-required ordered chain of `PG-<integer>` ids tracing the bundle's root page through every ancestor down to self. Seven sibling validators already consume `branch_path` directly. The supersession reachability check becomes a single set-inclusion test (`supersession_page_id ∈ target_page.branch_path`); no recursion, no walker, no defensive cycle-detection. Adding a separate `pageAncestry` walker would duplicate serialized data and introduce a defensive surface for a problem the schema already prevents — strictly worse than reading the field.
2. **No backwards-compatibility aliasing/shims introduced.** The old sub-code `inactive_stchar_active_on_page` is retired outright, not aliased. The retirement is audited in Assumption Reassessment item 6 per Rule 6 (No Silent Retcons). The bundled-overview test that asserted the old sub-code was removed in the same ticket, eliminating dangling references rather than carrying a transitional state.

## Verification Layers

1. **Branch-ancestry reachability semantics** → codebase grep-proof: the validator body at `stchar-supersession-integrity.ts` reads `branchPath(page)` (or inline `stringArray(asPlainRecord(page.parsed).branch_path)`) and tests `supersession_page_id ∈ branch_path` for each page carrying an inactive STCHAR; the new sub-code `stchar_supersession_integrity.inactive_stchar_active_on_descendant` fires only on descendants.
2. **Sibling-branch sibling-page passes** → package test execution: the new dedicated test file's sibling-branch case (branch A regenerates at PG-6; branch B at PG-8 whose `branch_path` excludes PG-6 still uses STCHAR-1) returns zero verdicts under the new logic and would fail under the old ordinal-only logic.
3. **Linear-story descendant fails with new diagnostic** → package test execution: the new test file's negative cases assert the new sub-code AND the extended context fields (`supersession_page_id`, `successor_stchar_id`) alongside the preserved existing fields (`page_id`, `stchar_id`, `status`, `reference_path`).
4. **FOUNDATIONS Rule 4 alignment** → FOUNDATIONS alignment check: per SPEC-75 §6's FOUNDATIONS Alignment table, Rule 4's central thesis is honored — branch-local supersession is no longer silently globalized; the `branch_path` mechanism makes the descendant set explicit.
5. **No bundle-wide regression** → command-based: `cd tools/validators && npm test` exercises every existing structural and rule validator test under the new validator body. SPEC-75 §5 confirms the 3 red-bunny STCHAR profiles do not have sibling-branch regeneration events, so the strict relaxation cannot break red-bunny fixtures; the test suite is the regression backstop for any other bundle that gains STCHAR profiles after this ticket lands.

## Landed Changes

### 1. Added `branchPath(page)` helper to `stchar-utils.ts`

In `tools/validators/src/structural/stchar-utils.ts`, added an accessor paralleling the established sibling-utils pattern (`stemo-utils.ts`, `stplan-utils.ts`, `secret-utils.ts`):

```ts
export function branchPath(page: IndexedRecord): string[] {
  return stringArray(asPlainRecord(page?.parsed).branch_path);
}
```

The validator uses this helper directly.

### 2. Replaced the ordinal compare in `stchar-supersession-integrity.ts`

The ordinal-compare block in `tools/validators/src/structural/stchar-supersession-integrity.ts` now uses a `branch_path`-based reachability check:

1. **Resolved the successor STCHAR id** before the reachability test with `stringValue(parsed.superseded_by)`.
2. **Resolved the supersession page id** from the successor STCHAR's `generated_at_page`, with `retired_at_page` preserved as the no-successor retired-STCHAR fallback.
3. **Replaced the ordinal compare** with `if (supersessionPageId === null || !branchPath(page).includes(supersessionPageId)) { continue; }`, so sibling branches and pre-supersession ancestors pass.
4. **Updated the failure diagnostic** from `stchar_supersession_integrity.inactive_stchar_active_on_page` to `stchar_supersession_integrity.inactive_stchar_active_on_descendant`. The context object retains `page_id`, `stchar_id`, `status`, and `reference_path`, and adds `supersession_page_id` plus `successor_stchar_id`.
5. **Preserved the `INACTIVE_STATUSES` filter and structural checks**.
6. **Deleted the now-unused `supersessionOrdinal()` helper**.

### 3. Created the new dedicated test file

Created `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` with inline fixture construction and no YAML page fixtures under `tools/validators/tests/fixtures/`.

Test cases per SPEC-75 §7:

**Positive (currently failing under ordinal-only, will pass under new logic):**
- Branch A regenerates `STCHAR-2` from `STCHAR-1` at PG-6. Descendant PG-7 in branch A uses `STCHAR-2` (PG-7's `branch_path` includes PG-6) → PASS — zero verdicts.
- Sibling branch B's page PG-8 (`branch_path` does not include PG-6) still uses `STCHAR-1` → PASS — zero verdicts (was failing under ordinal-only because PG-8 ordinal > PG-6 ordinal).

**Positive (currently passing, must still pass):**
- Linear story: PG-5 supersedes `STCHAR-1` with `STCHAR-2`. PG-6 (descendant; PG-6's `branch_path` includes PG-5) uses `STCHAR-2` → PASS — zero verdicts.
- PG-4 (pre-supersession ancestor of the supersession page; PG-4's `branch_path` does not include PG-5) uses `STCHAR-1` → PASS — zero verdicts.

**Negative (must fail with the new diagnostic):**
- Branch A at PG-6 supersedes `STCHAR-1` → `STCHAR-2`. Descendant PG-7 (branch A; PG-6 ∈ PG-7.branch_path) still carries `STCHAR-1` as active → FAIL with one verdict; assert `verdicts[0].code === "stchar_supersession_integrity.inactive_stchar_active_on_descendant"`, `verdicts[0].detail.supersession_page_id === "PG-6"`, `verdicts[0].detail.successor_stchar_id === "STCHAR-2"`, `verdicts[0].detail.page_id === "PG-7"`, `verdicts[0].detail.stchar_id === "STCHAR-1"`.
- Successor `STCHAR-2` not active on a descendant page where the superseded `STCHAR-1` is active → FAIL — same sub-code, same context-object shape.

The tests construct page fixtures with explicit `branch_path` arrays. The fixture builder includes `id`, `node_type: "page_record"`, and `parsed` carrying `id`, `branch_path`, `state_snapshot.active_records.STCHAR`, plus sane defaults for `turn_index`, `story_id`, `branch_id`, `parent_page_id`, and `emitted_choices`.

### 4. Removed the bundled-overview supersession test

Removed the duplicate supersession block from `tools/validators/tests/structural/stchar-structural-validators.test.ts`. The dedicated test file is now the authoritative supersession-validator test surface.

### 5. Truthed same-seam SPEC-75 docs

Updated `archive/specs/SPEC-75-branch-aware-stchar-supersession.md` with a dated implementation note and moved `archive/specs/IMPLEMENTATION-ORDER-2026-05-23-3.md` to complete status for this sprint. The implementation-order row no longer claims a new traversal primitive.

## Files to Touch

- `tools/validators/src/structural/stchar-utils.ts` (modify) — add `branchPath(page): string[]` accessor
- `tools/validators/src/structural/stchar-supersession-integrity.ts` (modify) — replace ordinal compare at lines 33-44 with `branch_path` set-inclusion check; new sub-code; extended diagnostic context object; delete `supersessionOrdinal()` helper at lines 67-74
- `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` (new) — multi-branch test scenarios per SPEC-75 §7 with inline fixture construction
- `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify) — remove the supersession test block
- `archive/specs/IMPLEMENTATION-ORDER-2026-05-23-3.md` (modify) — mark the SPEC-75 sprint complete and remove the traversal-primitive claim
- `archive/specs/SPEC-75-branch-aware-stchar-supersession.md` (modify) — add implementation note and status truthing

## Out of Scope

- Any STCHAR distillation-boundary, source-preservation, regeneration-reason, or page-packet work (consolidated in archived SPEC-74; landed 2026-05-23)
- Reintroducing any STCHAR tamper hash to track supersession events (SPEC-71 removed all four hashes; the `forbidden_stchar_tamper_hash_fields` validator at `tools/validators/src/structural/forbidden-stchar-tamper-hash-fields.ts` structurally prevents reintroduction)
- Cross-bundle or cross-world STCHAR supersession (STCHAR is per-bundle per FOUNDATIONS §Story Bundles §6.1; supersession across bundles is not a defined operation)
- Changes to the `supersedes` / `superseded_by` STCHAR schema fields themselves (this ticket only changes how the validator interprets reachability — the schema fields stay as currently defined)
- Adding a `scope: global | branch_local` discriminator field on STCHAR (explicitly rejected in SPEC-75 §4.3 — global supersession is operationally achieved by superseding on the bundle's root branch where every page is a descendant by construction; ancestry semantics make the distinction implicit)
- Building a `pageAncestry(pageId, maps): string[]` or `isAncestor(...)` walker primitive (rejected per SPEC-75 §4.1 — `branch_path` is already the schema-serialized ancestry; a walker would duplicate the required PG field and introduce defensive cycle-detection for a problem the schema already prevents)
- Fixture remediation against red-bunny STCHAR profiles (SPEC-75 §5 confirms no sibling-branch regeneration in the 3 red-bunny STCHAR profiles; the strict relaxation cannot invalidate any current fixture)

## Acceptance Criteria

### Tests That Must Pass

1. The new test file `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` passes all six scenarios per SPEC-75 §7 (two positive currently-failing → now-passing, two positive must-still-pass, two negative with the new sub-code).
2. The bundled-overview test file `tools/validators/tests/structural/stchar-structural-validators.test.ts` continues to pass with the old supersession block removed.
3. The full validator test suite passes: `cd tools/validators && npm test` exercises every existing structural and rule validator test under the new validator body; no regression elsewhere.
4. Red-bunny regression check passes: `node tools/validators/dist/src/cli/world-validate.js erotica-world` from the repo root reports no fail or warn verdicts against the red-bunny STCHAR profiles. The drafted `worlds/erotica-world` argument was stale for the current CLI because it double-prefixed the world path.

### Invariants

1. **Architectural — Reachability via existing schema field**: the supersession validator MUST read `branch_path` from each PG record's parsed body; it MUST NOT introduce any new ancestry-walking primitive (no `pageAncestry`, no recursive parent-page chase, no defensive cycle-detection). The `branch_path` field is the schema's serialized ancestry; the validator consumes it.
2. **Data-contract — Sub-code retirement is total**: the old sub-code `stchar_supersession_integrity.inactive_stchar_active_on_page` MUST NOT appear in any source file under `tools/validators/src/` or `tools/validators/tests/` after this ticket lands. Compiled output under `tools/validators/dist/` auto-regenerates on `npm run build` and is not subject to source-edit discipline. Spec citations under `specs/` and `archive/specs/` are preserved as Rule 6 audit-trail.
3. **Data-contract — Diagnostic context object is additive**: the new failure context object MUST retain the existing fields (`page_id`, `stchar_id`, `status`, `reference_path`) AND include the new fields (`supersession_page_id`, `successor_stchar_id`). Removing any existing field is a breaking change to downstream verdict consumers and is forbidden. The existing `superseded_at_page` field may be retired only if a pipeline-wide grep confirms no consumer reads it.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` (new) — multi-branch fixture builder + 6 scenarios per SPEC-75 §7.
2. `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modified) — removed the supersession test block.

### Commands

1. `cd tools/validators && npm test` — full validator test suite under the new validator body. The package's `test` script runs `npm run build && node --test dist/tests/**/*.test.js`, exercising both the new dedicated test file and every existing test in one invocation. This is the canonical full-pipeline verification command for this ticket.
2. `cd tools/validators && npm run build` — TypeScript build (typecheck + compile). Catches any type-level issues from the extended diagnostic context object's new fields before the tests run; faster feedback loop than `npm test` during iteration.
3. `grep -rn "inactive_stchar_active_on_page" tools/validators/src/ tools/validators/tests/` — sub-code retirement grep-proof: zero matches under `src/` and `tests/` after this ticket lands. `tools/validators/dist/` auto-regenerates from source; `specs/SPEC-75-…md` retains the retirement description as Rule 6 audit-trail. This grep replaces a narrower file-by-file check because the sub-code's literal string is grep-stable across the package and pipeline-wide grep (`tools/`, `.claude/skills/`, `docs/`, `specs/`, `archive/specs/`) confirmed at audit time that only the four sites listed in Assumption Reassessment item 6 reference the old sub-code.

## Outcome

Implemented branch-aware STCHAR supersession reachability. `stchar_supersession_integrity` now treats a supersession as applicable only to pages whose `branch_path` contains the supersession page id, so sibling branches can keep the predecessor STCHAR while descendants must use the successor. The old failure sub-code was retired from source/tests, the diagnostic context remains additive, and SPEC-75 status/order prose was truthed to the landed no-walker implementation.

## Verification Result

- `cd tools/validators && npm run build` — PASS.
- `cd tools/validators && node --test dist/tests/structural/stchar-supersession-integrity.test.js` — PASS, 6/6 tests.
- `cd tools/validators && npm test` — PASS, 965/965 tests.
- `cd tools/validators && if grep -R "inactive_stchar_active_on_page" src tests; then exit 1; fi` — PASS, zero old sub-code hits in source/tests.
- `node tools/validators/dist/src/cli/world-validate.js erotica-world` from repo root — PASS for acceptance boundary: 0 fail, 0 warn, 3 compatibility info verdicts.
- Manual review — PASS: `tools/validators/README.md` only inventories the unchanged validator name, so no package README update was required.

## Deviations

- SPEC-75 and the ticket describe six concrete scenarios while one drafted acceptance sentence said "five cases"; closeout corrected the count to six.
- The drafted red-bunny command used `worlds/erotica-world` as the positional argument. The current CLI expects the world slug from the repo root; the stale path form failed with a double-prefix lookup, and the accepted proof used `node tools/validators/dist/src/cli/world-validate.js erotica-world`.
- The implementation preserves retired-STCHAR handling by falling back to `retired_at_page` when no successor id is recorded; `successor_stchar_id` is `null` in that no-successor retired path.
