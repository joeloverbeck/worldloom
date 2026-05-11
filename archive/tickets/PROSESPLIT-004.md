# PROSESPLIT-004: Conditional skip on arc_trace_evidence_alignment when prose_status != rendered

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/rules/arc_trace_evidence_alignment.ts` adds a conditional skip; new test cases. No other validator code changes.
**Deps**: PROSESPLIT-002 (the `prose_status` field must exist on PG records before this validator can read it).

## Problem

The plan-and-finalize rework defers ARC_TRACE record emission from `branching-story-page-cycle` Phase 7.6 (today: emits at plan-commit) to `branching-story-page-prose-finalize` Phase 4 (post-rework: emits only when prose is rendered). Under the new discipline, an ARC_TRACE record's existence implies its referenced PG record has `prose_status: rendered` and its prose file exists at `pages-prose/PG-NNNN.md`.

The validator at `tools/validators/src/rules/arc_trace_evidence_alignment.ts` validates ARC_TRACE evidence spans by reading the referenced page's prose file. If for any reason an ARC_TRACE exists but its referenced PG has `prose_status != "rendered"` (data inconsistency, partial-failure recovery edge case, or grandfathered pre-rework bundle), the validator should record a DEFERRED verdict rather than fail with confusing prose-missing errors.

The design doc also referenced `prose_ledger_consistency` as needing a similar skip; verification during ticket authoring (PROSESPLIT-002 §3) confirmed there is NO `prose_ledger_consistency.ts` validator file in `tools/validators/src/rules/`. The gate is skill-resident only and lives in PROSESPLIT-006 / PROSESPLIT-007 reference rewrites. This ticket is therefore scoped to the single existing validator that needs prose_status awareness.

## Assumption Reassessment (2026-05-10)

1. `tools/validators/src/rules/arc_trace_evidence_alignment.ts` is the sole TS validator that reads rendered prose. Verified by `find tools/validators/src/rules` listing — only `arc_trace_evidence_alignment.ts` references prose files (line 178 path construction, line 226 path predicate).
2. `prose_ledger_consistency` is NOT a TS validator. Verified: no file with that name exists under `tools/validators/src/`. The gate is referenced in `branching-story-page-cycle/references/phase-9-validation-gates.md` and `branching-story-bootstrap/references/phase-9-validation-gates.md` as a skill-level Phase 9 gate; PROSESPLIT-006 and PROSESPLIT-007 update those references to record DEFERRED at plan-commit.
3. `arc_trace_evidence_alignment` validator entry point at line 10 (`export const arcTraceEvidenceAlignment: Validator`). The `run()` method iterates `arc_trace_record` instances and validates each via `validateTrace(verdicts, trace, pagesById, storyletsById, input, ctx)` (line 51). The skip is best inserted at the top of `validateTrace` after the referenced PG record is resolved.
4. PG record's `prose_status` field is added by PROSESPLIT-002 to `tools/validators/src/schemas/story-page.schema.json`. This ticket depends on that field existing on indexed page records; the field is read via `IndexedRecord` lookup in `pagesById`.
5. Cross-skill / cross-artifact boundary under audit: the validator's `applies_to` filter at lines 13-21 lists `create_arc_trace_record`, `create_pg_record`, `create_slt_record` as pre-apply triggers. After the rework, only finalize emits `create_arc_trace_record` ops, and only finalize updates PG records with `prose_status: rendered`. The validator's pre-apply triggering is unchanged; only its per-trace validation logic adds the prose_status skip.
6. FOUNDATIONS principle under audit: Rule 7 (Mystery Reserve Preservation) — the validator does not enforce M-firewall directly; that is `rule7-mystery-reserve-preservation.ts`. This ticket does not touch the M firewall.
7. Schema extension classification: not applicable — this ticket consumes the schema field added in PROSESPLIT-002 but does not modify the schema.
8. Adjacent contradictions: the validator's `applies_to` lists `create_pg_record` as a trigger. After the rework, `create_pg_record` ops at plan-commit time produce PG records with `prose_status: pending` and no associated prose file. The validator's `run()` method iterates ARC_TRACE records (not PG records), so a `create_pg_record` trigger fires the validator only when an ARC_TRACE exists referencing the new PG — which under the rework would only happen at finalize, not plan-commit. The pre-apply trigger list does not need changes.
9. `proseForPage()` (line 211) constructs the prose path from `pageId`, not from the PG record's `prose_path` field, so the nullable-prose_path change in PROSESPLIT-002 does not affect this validator's path construction.

## Architecture Check

1. The conditional skip is defense-in-depth: under correct rework operation, an ARC_TRACE record's existence implies prose is rendered. The skip catches the inconsistency case (ARC_TRACE exists but PG.prose_status != "rendered") with an explicit DEFERRED verdict rather than a confusing "prose file missing" failure.
2. Skip-with-rationale is consistent with the existing `Verdict` shape (`status: "pass" | "fail"` plus rationale message). The skip emits a single PASS verdict with rationale `"DEFERRED — referenced page <PG-NNNN> has prose_status=<status>; rule re-runs at finalize"`.
3. No backwards-compatibility shims. The skip is additive and does not change behavior for the well-behaved case (PG.prose_status == "rendered").
4. Alternative considered: change the validator's `applies_to` to skip when the patch plan has no `create_arc_trace_record` op AND incremental-mode touched files include no ARC_TRACE files. Rejected because the existing `applies_to` already covers the no-fire case via its three-trigger filter; the issue is per-trace validation behavior when ARC_TRACE exists but its page is pending.

## Verification Layers

1. Validator emits PASS-with-rationale for ARC_TRACE referencing a PG with `prose_status: pending` → unit test on `validateTrace` with fixture page records.
2. Validator emits PASS-with-rationale for ARC_TRACE referencing a PG with `prose_status: superseded` → unit test (defensive — if a PG transitions back to superseded for any reason, validator should not run downstream span checks).
3. Validator unchanged behavior for ARC_TRACE referencing a PG with `prose_status: rendered` → existing test suite remains green.
4. Validator emits a verdict (not a crash) when the PG referenced by an ARC_TRACE is missing entirely → existing `missing_referenced_page` failure path is unchanged.
5. Schema validation pre-flight does not fire this validator on PG records lacking `prose_status` (i.e., grandfathered pre-rework bundles); validator skip looks for `prose_status` and treats missing field as "rendered" by default to preserve grandfathered behavior — manual review of grandfathering policy at `tools/validators/src/framework/grandfathering.ts`.

## What to Change

### 1. Add conditional skip in `tools/validators/src/rules/arc_trace_evidence_alignment.ts`

Inside `validateTrace()` (line 51-onward), after the referenced PG record is resolved from `pagesById`, before any evidence-span validation:

```ts
function validateTrace(
  verdicts: Verdict[],
  trace: IndexedRecord,
  pagesById: ReadonlyMap<string, IndexedRecord>,
  storyletsById: ReadonlyMap<string, IndexedRecord>,
  input: unknown,
  ctx: Context
): void {
  // ... existing PG resolution logic ...
  const page = pagesById.get(referencedPageId);
  if (!page) {
    addFailure(verdicts, trace, "arc_trace_evidence_alignment.missing_referenced_page", ...);
    return;
  }

  // NEW: prose_status skip. Defense-in-depth — under correct rework operation,
  // ARC_TRACE existence implies prose_status: rendered. Skip with rationale when
  // not rendered. Missing prose_status field (pre-rework grandfathered bundles)
  // is treated as "rendered" to preserve historical behavior.
  const proseStatus = (page.frontmatter?.prose_status as string | undefined) ?? "rendered";
  if (proseStatus !== "rendered") {
    verdicts.push({
      validator: VALIDATOR,
      severity: "info",
      status: "pass",
      record_id: recordId(trace),
      file_path: trace.file_path,
      message: `DEFERRED — referenced page ${recordId(page)} has prose_status="${proseStatus}"; rule re-runs at finalize when prose is rendered`,
      code: "arc_trace_evidence_alignment.deferred_prose_pending"
    });
    return;
  }

  // ... existing evidence-span validation continues ...
}
```

The `severity: "info"` flag distinguishes the deferred verdict from a fail-mode pass. The exact field shape (`severity`, `status`, `code`) must match the project's `Verdict` type at `tools/validators/src/framework/types.ts`; verify at implementation time that the chosen shape is correct.

### 2. Add test cases in `tools/validators/tests/rules/arc-trace-evidence-alignment.test.ts`

Three new fixtures:
- ARC_TRACE referencing PG with `prose_status: pending` → expect PASS-with-DEFERRED-message verdict.
- ARC_TRACE referencing PG with `prose_status: superseded` → expect PASS-with-DEFERRED-message verdict.
- ARC_TRACE referencing PG with no `prose_status` field (grandfathered pre-rework bundle) → expect existing behavior (proceed with evidence-span validation).

### 3. No changes to other validators

`prose_ledger_consistency` is skill-resident and gets its DEFERRED treatment in PROSESPLIT-006 / PROSESPLIT-007.

`record_schema_compliance` is updated transitively via the schema change in PROSESPLIT-002.

## Files to Touch

- `tools/validators/src/rules/arc_trace_evidence_alignment.ts` (modify — add conditional skip in `validateTrace`)
- `tools/validators/tests/rules/arc-trace-evidence-alignment.test.ts` (modify — add three new test cases) — exact filename verified at implementation time; if test file does not exist, create it.

## Out of Scope

- Updating `prose_ledger_consistency` (skill-resident gate; covered in PROSESPLIT-006 / PROSESPLIT-007).
- Updating `record_schema_compliance` (covered transitively in PROSESPLIT-002).
- Changing the validator's `applies_to` triggers.
- Refactoring `proseForPage()` to read `prose_path` field instead of constructing from `pageId`.
- Adding a new "deferred-validation-trace alignment" structural validator. The deferred-trace lives on the PG record (PROSESPLIT-002) and is consumed by the finalize skill (PROSESPLIT-005); a structural validator over the trace's enum values is not required at this stage.

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter @worldloom/validators test -- --grep "arc.trace.evidence.alignment"` (or equivalent; exact grep verified at implementation) — includes the three new fixtures plus all existing tests, all green.
2. `rg -n "prose_status" tools/validators/src/rules/arc_trace_evidence_alignment.ts` matches at least once.
3. `rg -n "deferred_prose_pending" tools/validators/src/rules/arc_trace_evidence_alignment.ts` matches the new verdict code.

### Invariants

1. Existing well-behaved case (ARC_TRACE references PG with `prose_status: rendered`) is byte-identical in validator output before and after this change.
2. Grandfathered pre-rework bundles (PG records missing the `prose_status` field) continue to validate as if `prose_status: rendered`.
3. The skip emits a verdict with `status: "pass"`, not "fail" — DEFERRED is a passing-with-rationale state.
4. No new ID class or record class is introduced.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/arc-trace-evidence-alignment.test.ts` — add three fixtures (pending, superseded, missing-field) per §2 of What to Change.

### Commands

1. `pnpm --filter @worldloom/validators test`
2. `rg -n "prose_status" tools/validators/src/rules/arc_trace_evidence_alignment.ts`
3. `rg -n "DEFERRED" tools/validators/src/rules/arc_trace_evidence_alignment.ts tools/validators/tests/rules/arc-trace-evidence-alignment.test.ts`
