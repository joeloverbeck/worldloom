# VALENH-048: Allow STCHAR provenance in THR / CNSQ / SF `derived_from` (parity with SREL / STPLAN / STEMO)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — schema-only widening on three story-bundle record classes (`tools/validators/src/schemas/story-thread.schema.json`, `story-consequence.schema.json`, `story-fact.schema.json`); validator-package rebuild required so the pre-apply gate, MCP dry-run, and patch-engine submit all see the widened pattern.
**Deps**: None

## Problem

At intake, three story-bundle record schemas — `THR` (`story-thread.schema.json`), `CNSQ` (`story-consequence.schema.json`), and `SF` (`story-fact.schema.json`) — defined `derived_from.items.pattern` with a class union that **excluded** `STCHAR`. The comparable schemas for SREL (inline pattern), STPLAN (`$defs.provenanceRecordId`), and STEMO (`$defs.provenanceRecordId`) all **included** `STCHAR`, with the shared story state contract (`.claude/skills/_shared-templates/story-record-schemas.md`) explicitly instructing authors to "Use `STCHAR` in `derived_from[]` when stable persona authority shapes ..." the relevant pattern.

The asymmetry was hit empirically during a `branching-story-turn-cycle` advance_initiative turn on `red-bunny` PG-5, where the authoring move "Ane's STCHAR shapes how the help-offering register takes the probe-test form" naturally wanted to ground `THR-6.derived_from` in `[STCHAR-1, STENT-3, STENT-1, STEMO-10, STEMO-11, STEMO-12, BEL-12, BEL-14, BEL-15]`. The validator rejected this with `record_schema_compliance.pattern` against `STCHAR-1`. The authoring intent — stable-persona-authority grounding the ongoing causal concern — is exactly the case the SREL/STPLAN/STEMO schemas were widened to support.

This is a schema oversight, not a design decision. The widening of THR.derived_from to admit `CLK / STSEC / STQ / STSTAT / STPLAN / STEMO` was landed earlier (per the existing `record-schema-compliance-story-thread.test.ts` comment: "the THR derived_from union predated SPEC-42. The widened canonical pattern now admits CLK/STSEC/STQ/STSTAT/STPLAN/STEMO as legitimate provenance"). STCHAR was added later (SPEC-56) and the parallel widening for THR / CNSQ / SF was not propagated.

Threads, consequences, and facts frequently depend on durable persona authority the same way relationships, plans, and emotions do: a thread's escalation register often takes the specific shape it does *because of* the actor's stable persona pattern; a consequence's debt-pressure curve often follows from durable character conduct; a derived branch-local fact about an actor's voice or appraisal often grounds in their STCHAR. Forcing authors to drop STCHAR from `derived_from[]` on these classes loses durable-authority provenance the audit trail should carry.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** `tools/validators/src/schemas/story-thread.schema.json`, `story-consequence.schema.json`, and `story-fact.schema.json` each define `derived_from.items.pattern` inline with the class union `^((STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|OQ|ENT|ONT|CAU|DIS|SOC|AES)-[0-9]+|SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-[0-9]+)$` — `STCHAR` absent. Verified by `jq '.properties.derived_from.items' <schema>.json` on each of the three files. The comparable schemas `story-relationship.schema.json` (inline pattern), `story-plan.schema.json` (`$defs.provenanceRecordId`), and `story-emotion.schema.json` (`$defs.provenanceRecordId`) all include `STCHAR` in the same union slot. The widening is precedented; only the propagation is incomplete.
2. **Specs/docs reassessment.** `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.6 (THR), §4.5.5 (CNSQ), and §4.5.3 (SF) document `derived_from: [<record_id>]                    # default []` without explicit class restrictions in prose. §4.5.7 (SREL) explicitly says "Use `STCHAR` in `derived_from[]` when a relationship's stable conduct, voice, pressure behavior, or appraisal pattern depends on story-local character authority rather than only on present-causal state." §4.5.17 (STPLAN) says "Use `STCHAR` in `derived_from[]` when stable persona authority shapes the plan's conduct pattern." §4.5.18 (STEMO) says "Use `STCHAR` in `derived_from[]` when stable persona authority shapes the appraisal or behavioral pressure." The contract narrative is consistent across SREL/STPLAN/STEMO; THR/CNSQ/SF narratives carry the same `derived_from` framing but the schema does not match.
3. **Cross-skill / cross-artifact boundary.** The shared boundary is the JSON Schema enum union used by `record_schema_compliance` to validate `derived_from.items` on the affected classes. The patch engine (`tools/patch-engine/src/`), MCP validate path (`tools/world-mcp/dist/src/cli/validate-patch-plan.js`), and Hook 3 all consume the same compiled validator package; widening the schema unifies all three call sites at once. No skill prose change needed (the contract narrative already permits STCHAR).
4. **FOUNDATIONS principle restatement.** FOUNDATIONS §Tooling Recommendation says LLM agents should always receive "current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain" — and on the story-pipeline side, §Story Bundles §5b mandates that "every field in every story-bundle record schema must be load-bearing." `derived_from` is load-bearing for audit-trail discipline; the STCHAR exclusion silently loses durable-authority grounding when authors try to record it, which weakens the audit surface FOUNDATIONS prescribes. FOUNDATIONS §Rule 6 (No Silent Retcons) also rests on derived_from chains carrying truthful provenance — excluding a legitimate provenance class undermines that.
5. **Schema extension consumer audit.** The schemas under audit are read by `tools/validators/src/structural/record-schema-compliance.ts` (the only consumer; AJV-compiled at runtime). No other validator file decodes `derived_from` against a hard-coded class list — every dependent validator that needs to test class membership uses `recordClass = id.split("-")[0]` on the actual id string, not a schema-driven enum. So the extension is fully additive: existing CNSQ / SF / THR records that lack STCHAR in `derived_from` continue to validate; new records that include STCHAR start passing where they previously failed. No consumer schema patch.
6. **Adjacent contradictions.** None surfaced beyond the three named schemas. Inspection of every other `derived_from` field in `tools/validators/src/schemas/*.schema.json` shows that SREL/STPLAN/STEMO/CHC's `grounded_in.records` already admit STCHAR; CHC's grounded_in pattern was widened in a prior ticket. No other class has the same gap.
7. **Proof-surface reassessment.** `tools/validators/package.json` runs `npm test` as `npm run build && node --test dist/tests/**/*.test.js`; targeted acceptance must therefore build first and run the compiled `dist/tests/structural/...` files, not source `.ts` files directly. Baseline `cd tools/validators && npm test` passed before edits (1054 passing tests). The optional `/tmp/red-bunny-pg5-envelope.json` smoke input exists in this checkout, so it remains a post-build smoke proof, but the portable acceptance surface is the focused schema tests plus full validators suite.

## Architecture Check

1. **Minimal additive change.** Adding `STCHAR` to the existing inline alternation on three schemas is the lowest-risk, highest-clarity fix. The class is already part of the runtime story-state model; the schema just needs to acknowledge it. Alternatives considered: (a) extract a shared `provenanceRecordId` `$defs` block in each schema mirroring STPLAN/STEMO's pattern — this is cleaner long-term but introduces three new local `$defs` blocks where one inline pattern works fine today; deferred as a separate consolidation ticket if/when a fourth class needs widening. (b) introduce a single shared schemas file with a top-level `provenanceRecordId` — out of scope for this ticket because the AJV pipeline does not currently use a multi-file `$ref` resolver beyond per-schema local `$defs`; touching the loader is a larger change. The cleanest immediate fix is the inline addition, which is precedented by `story-relationship.schema.json` already using inline-with-STCHAR.
2. **No backwards-compatibility aliasing/shims introduced.** Existing records that lack STCHAR in `derived_from` continue to validate (set membership widening is monotonic). Existing tests continue to pass without modification. The patch engine's append-only ledger discipline is preserved: a previously-committed record's derived_from is never re-validated against the new schema; only newly-committed records are subject to it.
3. **Strengthened validation surface.** This ticket also adds explicit positive-case tests for THR / CNSQ / SF accepting `STCHAR-<integer>` in `derived_from`, plus negative-case tests confirming unknown classes (e.g., `NOPE-1`) still fail. This brings these three classes to test-parity with SREL's existing positive STCHAR coverage, closing a documentation-only gap.

## Verification Layers

1. **Schema validation** → AJV-compiled `story-thread.schema.json` accepts `STCHAR-<integer>` in `derived_from`. Proven by new positive-case test in `tools/validators/tests/structural/record-schema-compliance-story-thread.test.ts`.
2. **Schema validation** → AJV-compiled `story-consequence.schema.json` accepts `STCHAR-<integer>` in `derived_from`. Proven by new dedicated test file `tools/validators/tests/structural/record-schema-compliance-story-consequence.test.ts`.
3. **Schema validation** → AJV-compiled `story-fact.schema.json` accepts `STCHAR-<integer>` in `derived_from`. Proven by new dedicated test file `tools/validators/tests/structural/record-schema-compliance-story-fact.test.ts`.
4. **Codebase grep-proof** → `grep "STCHAR" tools/validators/src/schemas/story-thread.schema.json tools/validators/src/schemas/story-consequence.schema.json tools/validators/src/schemas/story-fact.schema.json` returns a hit per file after the edit.
5. **FOUNDATIONS alignment check** → FOUNDATIONS §Story Bundles §6.1 ("Story-Local Character Authority") plus §Rule 6 (No Silent Retcons): durable-persona-authority provenance must be expressible in `derived_from` chains for any story-bundle class whose causal state can depend on stable character authority. THR / CNSQ / SF qualify.
6. **Historical envelope diagnostic** → re-running a sandbox copy of the red-bunny PG-5 turn-cycle envelope (`/tmp/red-bunny-pg5-envelope.json`) with `THR-6.derived_from: [STCHAR-1, ...]` restored shows `record_schema_compliance` passes under `node tools/world-mcp/dist/src/cli/validate-patch-plan.js`; the whole envelope now fails on append-only/id-allocation drift because those PG-5 records already exist in the checkout.

## Landed Changes

### 1. `tools/validators/src/schemas/story-thread.schema.json`

Added `STCHAR` to the `derived_from.items.pattern` class union. Former pattern:

```json
"pattern": "^((STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|OQ|ENT|ONT|CAU|DIS|SOC|AES)-[0-9]+|SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-[0-9]+)$"
```

Current pattern (inserting `STCHAR` after `STENT`, matching SREL precedent):

```json
"pattern": "^((STENT|STCHAR|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|OQ|ENT|ONT|CAU|DIS|SOC|AES)-[0-9]+|SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-[0-9]+)$"
```

### 2. `tools/validators/src/schemas/story-consequence.schema.json`

Same change landed: `STCHAR` inserted after `STENT` in `derived_from.items.pattern`.

### 3. `tools/validators/src/schemas/story-fact.schema.json`

Same change landed: `STCHAR` inserted after `STENT` in `derived_from.items.pattern`.

### 4. `tools/validators/tests/structural/record-schema-compliance-story-thread.test.ts`

Added a positive-case test asserting STCHAR is accepted in THR.derived_from. Kept the existing unknown-class rejection test as a regression guard.

### 5. `tools/validators/tests/structural/record-schema-compliance-story-consequence.test.ts` (new file)

Created a dedicated test file mirroring `record-schema-compliance-story-thread.test.ts` structure. Three tests cover complete CNSQ acceptance, STCHAR + other provenance classes in `derived_from`, and unknown-class rejection.

### 6. `tools/validators/tests/structural/record-schema-compliance-story-fact.test.ts` (new file)

Same pattern as #5, for SF.

### 7. Rebuild

Ran `npm run build` under `tools/validators/` so `dist/` reflects the new schemas (the MCP `validate_patch_plan` and CLI consume the compiled `dist/` output).

## Files to Touch

- `tools/validators/src/schemas/story-thread.schema.json` (modify)
- `tools/validators/src/schemas/story-consequence.schema.json` (modify)
- `tools/validators/src/schemas/story-fact.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-thread.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-consequence.test.ts` (new)
- `tools/validators/tests/structural/record-schema-compliance-story-fact.test.ts` (new)
- `tools/validators/dist/**` (rebuild artifact; not authored by hand)

## Out of Scope

- Consolidating the three inline patterns into a shared `provenanceRecordId` `$defs` block (long-term consolidation; deferred).
- Widening other classes' `derived_from` patterns to include STCHAR. Audited: SREL/STPLAN/STEMO already include STCHAR. No other story-bundle class has the same gap.
- Updating shared contract prose. The contract narrative already permits STCHAR for these classes; the schema-vs-narrative drift is the bug.
- Re-validating already-committed records. Existing records that didn't use STCHAR in derived_from continue to validate without modification.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript compile + dist refresh completes cleanly.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-thread.test.js dist/tests/structural/record-schema-compliance-story-consequence.test.js dist/tests/structural/record-schema-compliance-story-fact.test.js` — all focused compiled tests pass, including the new positive STCHAR cases and preserved unknown-class rejection.
3. `cd tools/validators && npm test` — full validator test suite passes with no regressions.
4. Historical-envelope diagnostic: use a sandbox copy of `/tmp/red-bunny-pg5-envelope.json`, ensure `STCHAR-1` is present in `THR-6.derived_from`, and confirm `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <sandbox-envelope>` reports `record_schema_compliance: pass`. The whole envelope is not an active pass gate because the historical PG-5 records now exist and correctly trip append-only/id-allocation validators.

### Invariants

1. **Append-only schema widening.** No existing valid record becomes invalid. Set-membership widening is monotonic; the change only admits more provenance ids, never rejects previously-valid ones.
2. **STCHAR provenance grounding consistency.** Every story-bundle record class named in this ticket whose causal state can depend on stable persona authority now has a schema that admits STCHAR in derived_from. After this ticket, THR/CNSQ/SF join SREL/STPLAN/STEMO in this provenance guarantee.
3. **Unknown-class rejection preserved.** `record_schema_compliance.pattern` still fails for ids that don't match the closed class union (e.g., `NOPE-1`, made-up classes, malformed ids).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-thread.test.ts` — added a positive-case test "accepts STCHAR in THR derived_from" using the same pattern as the existing CLK/STSEC test.
2. `tools/validators/tests/structural/record-schema-compliance-story-consequence.test.ts` — new file with three tests: complete CNSQ accepted, STCHAR + mixed provenance accepted, unknown class rejected.
3. `tools/validators/tests/structural/record-schema-compliance-story-fact.test.ts` — new file with three tests parallel to the CNSQ file (using SF-specific required-fields fixture).

### Commands

1. **Targeted (new tests):** `cd tools/validators && npm run build && node --test dist/tests/structural/record-schema-compliance-story-thread.test.js dist/tests/structural/record-schema-compliance-story-consequence.test.js dist/tests/structural/record-schema-compliance-story-fact.test.js`
2. **Full validator suite:** `cd tools/validators && npm test`
3. **Build refresh:** `cd tools/validators && npm run build`
4. **Historical-envelope diagnostic (post-build):** sandbox-restore THR-6.derived_from to include STCHAR-1, run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <sandbox-envelope-path>`, expect `record_schema_compliance` to report `pass`; classify append-only/id-allocation failures as historical-envelope drift.

## Outcome

Completed on 2026-05-26. `STCHAR` is now admitted in `derived_from[]` for `THR`, `CNSQ`, and `SF` JSON Schemas. Focused structural tests cover positive STCHAR provenance and unknown-class rejection for all three classes. The validators package was rebuilt so ignored `tools/validators/dist/**` reflects the source/test changes.

## Verification Result

1. `cd tools/validators && npm test` — pre-edit baseline passed with 1054 passing tests.
2. `cd tools/validators && npm run build` — passed after schema/test edits.
3. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-thread.test.js dist/tests/structural/record-schema-compliance-story-consequence.test.js dist/tests/structural/record-schema-compliance-story-fact.test.js` — passed, 10/10 focused tests.
4. `cd tools/validators && npm test` — passed after edits with 1061 passing tests.
5. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/red-bunny-pg5-envelope-valenh-048-smoke.json` — overall `status: fail` because the historical PG-5 records now exist and append-only/id-allocation validators correctly fail; `record_schema_compliance` reported `pass`, proving the restored `THR-6.derived_from: [STCHAR-1, ...]` no longer fails the owned schema gate.

## Deviations

- The drafted source-`.ts` targeted test command was replaced with the package's compiled-test lane: build first, then `node --test dist/tests/structural/...`.
- The red-bunny PG-5 smoke is no longer a whole-envelope pass gate because the envelope is historical current-state evidence, not a fresh submit candidate. It remains useful only as a diagnostic that `record_schema_compliance` accepts the restored `STCHAR-1` provenance.
