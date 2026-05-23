# SPEC75BRAAWASTCHAR-001: Replace `stchar_supersession_integrity` ordinal-only reachability with `branch_path`-based check + multi-branch tests

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/stchar-supersession-integrity.ts` (mechanism change: ordinal compare → `branch_path` set-inclusion; new failure sub-code; extended diagnostic context object); `tools/validators/src/structural/stchar-utils.ts` (optional `branchPath(page)` accessor paralleling sibling-utils); new test file `tools/validators/tests/structural/stchar-supersession-integrity.test.ts`; bundled-overview test `tools/validators/tests/structural/stchar-structural-validators.test.ts` (remove or update the supersession test block — see What to Change item 4).
**Deps**: None

## Problem

The current `stchar_supersession_integrity` validator at `tools/validators/src/structural/stchar-supersession-integrity.ts:33-44` reasons by page ordinal only: a STCHAR is considered live on every page whose ordinal precedes the supersession event, dead on every page whose ordinal exceeds it. This silently couples sibling branch state — when branch A at PG-6 regenerates `STCHAR-1` to `STCHAR-2`, the validator forces sibling branch B at PG-8 to use `STCHAR-2` even though PG-8's ancestor chain does not include PG-6.

The failure mode prevents safe use of `regeneration_reason_class: durable_branch_transformation` (the branch-local lifecycle reason established by archived SPEC-74). Per FOUNDATIONS Rule 4 (No Globalization by Accident), a local capability — here, a branch-local STCHAR regeneration — must not be silently treated as universal. Branch-ancestry-aware reachability via the existing PG `branch_path` field is the explicit fix.

(See SPEC-75 §2.1 for the full failure-mode walkthrough.)

## Assumption Reassessment (2026-05-23)

1. The validator's ordinal-only logic lives at `tools/validators/src/structural/stchar-supersession-integrity.ts:33-44`; the failure-emit block follows at lines 45-58 with sub-code `stchar_supersession_integrity.inactive_stchar_active_on_page` (line 48); the local `supersessionOrdinal()` helper at lines 67-74 reads `successor.generated_at_page` or `stchar.retired_at_page`. The PG record schema declares `branch_path: string[]` as required (minItems 1) at `tools/validators/src/schemas/story-page.schema.json:9-31`. The sibling-validator consumption pattern for `branch_path` — read directly via `stringArray(asPlainRecord(page.parsed).branch_path)` — is established at `tools/validators/src/structural/stemo-utils.ts:232`, `stplan-utils.ts:225`, `secret-utils.ts:156-167`, `recursive-reference-closure.ts:19-39`, `story-question-utils.ts:159`. `stchar-utils.ts` already exports the helper family (`pageId`, `recordPageOrdinal`, `generatedAtPageOrdinal`, etc.); adding `branchPath(page)` follows that pattern.
2. SPEC-75 §4.2 prescribes the new sub-code `stchar_supersession_integrity.inactive_stchar_active_on_descendant` (replacing the retired form) and the extended diagnostic context object (existing fields `page_id`, `stchar_id`, `status`, `reference_path` plus new `supersession_page_id` and `successor_stchar_id`). §7 enumerates the five test cases (two positive currently-failing → now-passing, two positive must-still-pass, two negative). §5 prescribes inline fixture construction per the `chc-slt-selected-commitment-trace.test.ts` builder pattern (not YAML fixtures under `tools/validators/tests/fixtures/`). `specs/IMPLEMENTATION-ORDER.md:14` schedules this as Priority 1 with `Deps: _none_ — SPEC-74 has landed`. Archived `SPEC-74` provides the `regeneration_reason_class: durable_branch_transformation` enum value that names the branch-local-transformation reason class this ticket makes operationally safe.
3. **Cross-skill / contract boundary**: the validator framework's structural-validator contract at `tools/validators/src/framework/types.ts` (`Validator` interface — `name`, `severity_mode`, `applies_to`, `run`). The validator continues to satisfy `severity_mode: "fail"`, `applies_to: appliesToStcharStoryState`, and the `run(input, ctx): Promise<Verdict[]>` shape. No framework changes; only the validator body's reachability mechanism shifts. Downstream verdict consumers depend on the context object's existing field names; extension MUST be additive (item 6 below enforces).
4. **FOUNDATIONS Rule 4 (No Globalization by Accident)** is the directly motivating principle: "A local capability must not be silently treated as universal." The current ordinal-only check IS the silent globalization — a branch-local STCHAR regeneration is silently applied to every page with a higher ordinal regardless of branch. The new mechanism reads the PG schema's serialized ancestry and tests set-inclusion of the supersession page id, restricting the verdict to genuine descendants and preserving Rule 4 by construction. Rule 6 (No Silent Retcons) governs the sub-code retirement audit trail captured in item 6 below.
5. **Canon Safety surface**: this ticket modifies a structural validator under `tools/validators/src/structural/` — per the spec-to-tickets §Step 6.2(c) per-ticket-type granularity rule, structural-validator modifications gate canon and story-bundle record writes at engine pre-apply time, so the Canon Safety surface engages. The mechanism shift (ordinal → `branch_path`) is strictly more precise: descendant pages still FAIL (correctly), non-descendant pages now PASS (correctly). The Mystery Reserve firewall is not consulted by this validator and is not weakened by the change. No `forbidden_*` enum or `_source/` write path is altered.
6. **Sub-code retirement + bundled-test blast radius** (was template item 7 — rename/remove blast radius). The retired sub-code `stchar_supersession_integrity.inactive_stchar_active_on_page` appears at: (a) `tools/validators/src/structural/stchar-supersession-integrity.ts:48` — the validator emit site this ticket replaces; (b) `tools/validators/tests/structural/stchar-structural-validators.test.ts:75` — the bundled-overview single-case test that asserts the old sub-code (addressed via What to Change item 4 — the spec-to-tickets Step 2 spot-check (e) routed this as expand-scope-in-place); (c) `tools/validators/dist/...` — compiled output that auto-regenerates on `npm run build` (no source edit needed); (d) `specs/SPEC-75-branch-aware-stchar-supersession.md:109` — the spec describing the retirement (informational; preserved as Rule 6 audit-trail). A pipeline-wide grep across `tools/`, `.claude/skills/`, `docs/`, `specs/`, `archive/specs/` returns no other consumers of the old sub-code; the blast radius is bounded to (a) + (b) within this ticket's scope.

## Architecture Check

1. **Reuses already-serialized ancestry rather than introducing a new traversal primitive.** Every committed PG record carries `branch_path` — the schema-required ordered chain of `PG-<integer>` ids tracing the bundle's root page through every ancestor down to self. Seven sibling validators already consume `branch_path` directly. The supersession reachability check becomes a single set-inclusion test (`supersession_page_id ∈ target_page.branch_path`); no recursion, no walker, no defensive cycle-detection. Adding a separate `pageAncestry` walker would duplicate serialized data and introduce a defensive surface for a problem the schema already prevents — strictly worse than reading the field.
2. **No backwards-compatibility aliasing/shims introduced.** The old sub-code `inactive_stchar_active_on_page` is retired outright, not aliased. The retirement is audited in Assumption Reassessment item 6 per Rule 6 (No Silent Retcons). The bundled-overview test that asserts the old sub-code is updated or removed in the same ticket (item 4 of What to Change), eliminating dangling references at landing time rather than carrying a transitional state.

## Verification Layers

1. **Branch-ancestry reachability semantics** → codebase grep-proof: the validator body at `stchar-supersession-integrity.ts` reads `branchPath(page)` (or inline `stringArray(asPlainRecord(page.parsed).branch_path)`) and tests `supersession_page_id ∈ branch_path` for each page carrying an inactive STCHAR; the new sub-code `stchar_supersession_integrity.inactive_stchar_active_on_descendant` fires only on descendants.
2. **Sibling-branch sibling-page passes** → skill dry-run via test execution: the new dedicated test file's sibling-branch case (branch A regenerates at PG-6; branch B at PG-8 whose `branch_path` excludes PG-6 still uses STCHAR-1) returns zero verdicts under the new logic, fails under the old logic.
3. **Linear-story descendant fails with new diagnostic** → skill dry-run via test execution: the new test file's negative cases assert the new sub-code AND the extended context fields (`supersession_page_id`, `successor_stchar_id`) alongside the preserved existing fields (`page_id`, `stchar_id`, `status`, `reference_path`).
4. **FOUNDATIONS Rule 4 alignment** → FOUNDATIONS alignment check: per SPEC-75 §6's FOUNDATIONS Alignment table, Rule 4's central thesis is honored — branch-local supersession is no longer silently globalized; the `branch_path` mechanism makes the descendant set explicit.
5. **No bundle-wide regression** → command-based: `cd tools/validators && npm test` exercises every existing structural and rule validator test under the new validator body. SPEC-75 §5 confirms the 3 red-bunny STCHAR profiles do not have sibling-branch regeneration events, so the strict relaxation cannot break red-bunny fixtures; the test suite is the regression backstop for any other bundle that gains STCHAR profiles after this ticket lands.

## What to Change

### 1. Add optional `branchPath(page)` helper to `stchar-utils.ts`

In `tools/validators/src/structural/stchar-utils.ts`, add an accessor paralleling the established sibling-utils pattern (`stemo-utils.ts:232`, `stplan-utils.ts:225`, `secret-utils.ts:156-167`):

```ts
export function branchPath(page: IndexedRecord): string[] {
  return stringArray(asPlainRecord(page?.parsed).branch_path);
}
```

The helper is optional for readability. If inline `stringArray(asPlainRecord(page.parsed).branch_path)` reads more clearly inside the new validator body, that is equally compliant — sibling utils files demonstrate both patterns. Choose whichever pairs cleanly with the validator body composed in step 2.

### 2. Replace the ordinal compare in `stchar-supersession-integrity.ts`

Replace the ordinal-compare block at lines 33-44 of `tools/validators/src/structural/stchar-supersession-integrity.ts` with a `branch_path`-based reachability check:

1. **Resolve the successor STCHAR id** before the reachability test: `const successorId = stringValue(parsed.superseded_by);` (the value the existing `supersessionOrdinal()` helper already reads at line 68 — surface it as a named local for the diagnostic context).
2. **Resolve the supersession page id**: `const successorRecord = maps.byId.get(successorId ?? "");` then `const supersessionPageId = stringValue(asPlainRecord(successorRecord?.parsed).generated_at_page) ?? null;` — identical to the path the current `supersessionOrdinal()` helper takes at line 71, but the page id is surfaced directly rather than reduced to an ordinal.
3. **Replace the ordinal compare**: instead of `if (pageOrdinal !== null && supersededAt !== null && pageOrdinal < supersededAt) { continue; }`, test set-inclusion against `branch_path`: `if (supersessionPageId === null || !branchPath(page).includes(supersessionPageId)) { continue; }`. The `continue` keeps the page passing when it is NOT a descendant of the supersession page (sibling branch or pre-supersession ancestor); the FAIL path below fires only on genuine descendants.
4. **Update the failure diagnostic**: change the sub-code from `"stchar_supersession_integrity.inactive_stchar_active_on_page"` to `"stchar_supersession_integrity.inactive_stchar_active_on_descendant"`. Replace the diagnostic message body with `${pageId(page)} active_records.STCHAR[${index}] references ${id}, but that STCHAR is ${status} and ${pageId(page)} is a descendant of supersession page ${supersessionPageId}. The successor STCHAR ${successorId} must be active here.` Extend the context object with `supersession_page_id: supersessionPageId` and `successor_stchar_id: successorId` alongside the existing fields (`page_id`, `stchar_id`, `status`, `reference_path`). The existing `superseded_at_page` field may be retired in this same edit since it's now redundant with `supersession_page_id`; implementer's judgment based on whether any downstream verdict consumer reads it (grep for `superseded_at_page` across `tools/` and `.claude/skills/` to confirm before deletion).
5. **Preserve the `INACTIVE_STATUSES` filter and structural checks** at the top of the loop unchanged. The change is scoped to the reachability compare; do not refactor adjacent logic.
6. **Delete the now-unused `supersessionOrdinal()` helper** at lines 67-74. The helper has no other consumer in the codebase (grep `supersessionOrdinal` returns only the one definition and the one call site, both inside this file); deleting it in the same edit prevents dead-code accumulation.

### 3. Create the new dedicated test file

Create `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` from scratch. Follow the inline-fixture-builder pattern at `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts:265-307` (the `parentPage(...)` builder + `page(...)` builder) and `branch-isolation.test.ts:168-176` (multi-branch `parent_page_id` + `branch_path` construction). Do NOT add YAML page fixtures under `tools/validators/tests/fixtures/` (that directory holds individual record fixtures — `cf-*.yaml`, `patch-plan-*.json` — not multi-page bundle scenarios, per SPEC-75 §5).

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

Each test must construct page fixtures with explicit `branch_path` arrays. The minimal builder shape needs `id`, `node_type: "page_record"`, and `parsed` carrying `id`, `branch_path`, `state_snapshot.active_records.STCHAR` at minimum (other PG schema fields can use sane defaults — `turn_index`, `story_id`, `branch_id`, `state_hash`, etc. — per the sibling test files' helpers).

### 4. Update or remove the bundled-overview supersession test (expand-scope-in-place from Step 2 Issue 1)

In `tools/validators/tests/structural/stchar-structural-validators.test.ts:66-77`, the existing single-case supersession test asserts the retired sub-code (line 75: `stchar_supersession_integrity.inactive_stchar_active_on_page`). The new dedicated test file authored in item 3 fully covers this scenario (the linear-story positive case plus the negative case). Choose one of two paths:

- **Preferred — remove**: delete the test block at lines 66-77 of `stchar-structural-validators.test.ts` entirely. The new dedicated file is the authoritative supersession-validator test surface going forward; carrying a duplicate single-case test in the bundled-overview file creates split-coverage drift risk. Removal is a Rule 6 (No Silent Retcons) edit — the sub-code retirement audit-trail is captured in this ticket's Assumption Reassessment item 6.
- **Alternative — update**: change the assertion at line 75 to `assert.equal(verdicts[0]?.code, "stchar_supersession_integrity.inactive_stchar_active_on_descendant");` AND ensure the `page()` fixture-helper sets `branch_path` for PG-3 such that PG-2 ∈ PG-3.branch_path (the test's existing fixture has `page("PG-3", { STCHAR: ["STCHAR-1"] })` — the helper's current `branch_path` behavior must be verified before this path is chosen; if the helper doesn't populate `branch_path` correctly for the new validator, the helper itself needs extension, expanding this ticket's scope further).

Removal is preferred — the new dedicated file's coverage subsumes the bundled case, and removing the duplicate prevents the split-coverage drift the alternative would carry forward.

## Files to Touch

- `tools/validators/src/structural/stchar-utils.ts` (modify) — add optional `branchPath(page): string[]` accessor
- `tools/validators/src/structural/stchar-supersession-integrity.ts` (modify) — replace ordinal compare at lines 33-44 with `branch_path` set-inclusion check; new sub-code; extended diagnostic context object; delete `supersessionOrdinal()` helper at lines 67-74
- `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` (new) — multi-branch test scenarios per SPEC-75 §7 with inline fixture construction
- `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify) — remove or update the supersession test block at lines 66-77 (expand-scope-in-place per spec-to-tickets Step 2 Issue 1; preferred path: remove)

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

1. The new test file `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` passes all five cases per SPEC-75 §7 (two positive currently-failing → now-passing, two positive must-still-pass, two negative with the new sub-code).
2. The bundled-overview test file `tools/validators/tests/structural/stchar-structural-validators.test.ts` continues to pass — either the supersession test block (lines 66-77) is removed (preferred), or it is updated to assert the new sub-code with a corrected `branch_path`-populating fixture.
3. The full validator test suite passes: `cd tools/validators && npm test` exercises every existing structural and rule validator test under the new validator body; no regression elsewhere.
4. Red-bunny regression check passes: `cd tools/validators && node dist/src/cli/world-validate.js worlds/erotica-world` (or the equivalent CLI invocation per the validators package's current CLI surface) reports no new failures against the 3 red-bunny STCHAR profiles — SPEC-75 §5 confirms no sibling-branch regeneration → the strict relaxation cannot break red-bunny.

### Invariants

1. **Architectural — Reachability via existing schema field**: the supersession validator MUST read `branch_path` from each PG record's parsed body; it MUST NOT introduce any new ancestry-walking primitive (no `pageAncestry`, no recursive parent-page chase, no defensive cycle-detection). The `branch_path` field is the schema's serialized ancestry; the validator consumes it.
2. **Data-contract — Sub-code retirement is total**: the old sub-code `stchar_supersession_integrity.inactive_stchar_active_on_page` MUST NOT appear in any source file under `tools/validators/src/` or `tools/validators/tests/` after this ticket lands. Compiled output under `tools/validators/dist/` auto-regenerates on `npm run build` and is not subject to source-edit discipline. Spec citations under `specs/` and `archive/specs/` are preserved as Rule 6 audit-trail.
3. **Data-contract — Diagnostic context object is additive**: the new failure context object MUST retain the existing fields (`page_id`, `stchar_id`, `status`, `reference_path`) AND include the new fields (`supersession_page_id`, `successor_stchar_id`). Removing any existing field is a breaking change to downstream verdict consumers and is forbidden. The existing `superseded_at_page` field may be retired only if a pipeline-wide grep confirms no consumer reads it.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` (new) — multi-branch fixture builder + 5 test cases per SPEC-75 §7; inline fixture construction following the `chc-slt-selected-commitment-trace.test.ts:265-307` and `branch-isolation.test.ts:168-176` patterns.
2. `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify) — remove the supersession test block at lines 66-77 (preferred path) OR update its sub-code assertion + ensure the `page()` fixture-helper sets `branch_path` for the descendant page (alternative path; verify the helper before choosing).

### Commands

1. `cd tools/validators && npm test` — full validator test suite under the new validator body. The package's `test` script runs `npm run build && node --test dist/tests/**/*.test.js`, exercising both the new dedicated test file and every existing test in one invocation. This is the canonical full-pipeline verification command for this ticket.
2. `cd tools/validators && npm run build` — TypeScript build (typecheck + compile). Catches any type-level issues from the extended diagnostic context object's new fields before the tests run; faster feedback loop than `npm test` during iteration.
3. `grep -rn "inactive_stchar_active_on_page" tools/validators/src/ tools/validators/tests/` — sub-code retirement grep-proof: zero matches under `src/` and `tests/` after this ticket lands. `tools/validators/dist/` auto-regenerates from source; `specs/SPEC-75-…md` retains the retirement description as Rule 6 audit-trail. This grep replaces a narrower file-by-file check because the sub-code's literal string is grep-stable across the package and pipeline-wide grep (`tools/`, `.claude/skills/`, `docs/`, `specs/`, `archive/specs/`) confirmed at audit time that only the four sites listed in Assumption Reassessment item 6 reference the old sub-code.
