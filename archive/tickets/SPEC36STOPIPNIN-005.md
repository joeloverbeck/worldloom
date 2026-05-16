# SPEC36STOPIPNIN-005: Implement `causal_dependency_threat_scan` validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/structural/causal-dependency-threat-scan.ts` (new structural validator); `tools/validators/src/public/registry.ts` (registration); `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, and `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` (test updates); `tools/validators/README.md` (inventory count/name truthing); `.claude/skills/branching-story-turn-cycle/SKILL.md` and `.claude/skills/branching-story-health-audit/SKILL.md` (skill prose)
**Deps**: `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md`

## Problem

`tools/validators/src/public/registry.ts` exposes 20 structural validators; `causal_dependency_threat_scan` is not among them. Both `.claude/skills/branching-story-turn-cycle/SKILL.md:443` and `.claude/skills/branching-story-health-audit/SKILL.md:236` explicitly state *"Full deterministic `causal_dependency_threat_scan` validator implementation deferred — see SPEC-35 §Risks & Open Questions"*. The deferred work covers four named subcases — `choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer`, `slt_precondition_clobbered` — that protect against turns clobbering the dependency surface visible CHC, OBL, and SLT records rely on. The ninth-iteration audit (`reports/story-related-improvements-ninth-iteration.md` §WL-N9-P1-001) flags the still-open gap; SPEC-36 §D1 closes it.

## Assumption Reassessment (2026-05-16)

1. `causal_dependency_threat_scan` absent from `tools/validators/src/public/registry.ts:33-54` (20 structural validators listed, none with this name) — verified by parallel-Explore-agent quote during SPEC-36 brainstorm session and re-verified at codebase validation. The four subcases operate on existing fields: `CHC.grounded_in.records[]` at `tools/validators/src/schemas/story-choice.schema.json:57-67`; `STSTAT.life/agency/location` at `tools/validators/src/schemas/story-status.schema.json` (enum values include `dead`, `incapacitated`, `captive`, `offstage`); `OBL.owed_by/owed_to` at `tools/validators/src/schemas/story-obligation.schema.json:5-17`; `SLT.preconditions.hard[]` at `tools/validators/src/schemas/story-storylet.schema.json:113-127`. No schema changes required.
2. `specs/SPEC-36-story-pipeline-ninth-iteration-fixes.md` §D1 specifies the validator (`severity_mode: "fail"`, four verdict codes), 8 tests (one per subcase + one accept-path per subcase), registry registration, registry test extension, and skill-prose updates at the two named sites. SPEC-35's §Risks & Open Questions explicitly defers validator-hardening-II's two items (D1, D2) — this spec discharges that cluster.
3. Cross-artifact boundary under audit: the structural-validator framework contract at `tools/validators/src/structural/utils.ts` and the consumer surfaces in `branching-story-turn-cycle` Phase 9 and `branching-story-health-audit` Phase 2g. The validator framework's `Validator` type (per `tools/validators/src/framework/types.ts`) is the contract the new validator must satisfy; the skill-prose consumers must be updated to reflect "validator-backed" status rather than "deferred".
4. FOUNDATIONS principles: Rule 5 (No Consequence Evasion) per `docs/FOUNDATIONS.md:452-453` — *"If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest"*. Clobbering a dependency a visible CHC / OBL / SLT relies on without closing the dependent record IS consequence evasion. §Story Bundles §4a (Plan-Authority Boundary) per `docs/FOUNDATIONS.md:590-594` — *"Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine."* — the page snapshot's authority over what the player can act on is broken when a visible record's grounding has been clobbered.
5. Canon Safety surface: new structural validator gates patch-engine pre-apply via `validate_patch_plan` / `submit_patch_plan` for patch plans containing `create_se_record | create_pg_record | create_chc_record | create_slt_record` ops. The validator does NOT weaken the Mystery Reserve firewall (Rule 7) or silently resolve a Mystery Reserve entry — it adds enforcement for an orthogonal concern (causal dependency integrity) without touching MR firewall logic.
6. Live same-package inventory scan found same-seam registry-count surfaces beyond the drafted file list: `tools/validators/tests/integration/spec04-verification.test.ts` asserted `20` structural / `30` total validators; `tools/validators/tests/integration/validate-patch-plan.test.ts` enumerated skipped structural validators for a clean non-story pre-apply plan; `tools/validators/README.md` still said `19 structural validators` and omitted `canon_baseline_drift` from its inventory. These are validator-registry truthing fallout, so they moved with this ticket rather than remaining stale after registration.

## Architecture Check

1. New structural validator file + registry registration + dedicated test file is the standard validator-addition pattern in worldloom (matches the shape of every existing structural validator under `tools/validators/src/structural/`). Alternative — splitting the four subcases across separate validators — was rejected: each subcase maps cleanly to one existing schema relationship; splitting would force four registry registrations, four sets of skill-prose updates, and four CLI-integration sanity passes for marginal benefit. The four-verdict-code shape lets `validate_patch_plan` consumers distinguish which subcase fired per the existing verdict-code surfacing pattern.
2. No backwards-compatibility aliasing/shims introduced; the validator is a new addition that registers alongside existing validators without renaming or removing anything. Skill prose updates at consumer sites flip "deferred" pointers to "validator-backed" pointers — additive prose, no semantic shifts to existing prose.

## Verification Layers

1. `causal_dependency_threat_scan` appears in `structuralValidators` array exports → codebase grep-proof: `grep -n 'causal_dependency_threat_scan\\|causalDependencyThreatScan' tools/validators/src/public/registry.ts` returns at least two hits (import + array entry).
2. `tools/validators/tests/structural/registry.test.ts` expected validator-name list includes `"causal_dependency_threat_scan"` → schema validation: registry test passes under updated expected list.
3. Four subcase verdicts emit correctly under failure fixtures → schema validation: 8 tests (4 reject-cases + 4 accept-paths) pass.
4. Skill-prose pointers flipped at both consumer sites → codebase grep-proof: `grep -n 'causal_dependency_threat_scan.*deferred\\|deferred.*causal_dependency_threat_scan' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returns ZERO hits.
5. Cross-artifact ticket — four distinct invariants (validator presence + registry shape + verdict-code coverage + skill prose alignment) mapped to four distinct verification surfaces.

## What to Change

### 1. Create `tools/validators/src/structural/causal-dependency-threat-scan.ts`

Implement the validator with:

- `name: "causal_dependency_threat_scan"`
- `severity_mode: "fail"`
- `applies_to`: returns true when `ctx.run_mode === "full-world"` OR the patch plan contains any of `create_se_record | create_pg_record | create_chc_record | create_slt_record`
- Imports: `Context, IndexedRecord, Validator, Verdict` from `../framework/types.js`; helper functions from `./utils.js` (e.g., `asPlainRecord`, `queryStructuralRecords`, `stringValue`, `touchedFilesInclude`) per the established sibling-validator pattern (see `tools/validators/src/structural/observer-firewall.ts` as the template)

Emit four verdict codes:

- **`choice_dependency_clobbered`**: for each CHC visible in the child PG snapshot (those listed in `PG.snapshot.active_records.CHC` after the SE resolves), check each ID in `CHC.grounded_in.records[]`. If the resolving SE's `state_delta.close[]`, `state_delta.supersede[]` (when the supersession changes life/agency/location), or any STSTAT supersession by the same SE renders the grounded record inactive/unavailable, AND the CHC is not itself superseded or closed by the same SE, emit verdict with the offending CHC id + the clobbered grounded-record id.

- **`affordance_dependency_clobbered`**: for each STLOC/STOBJ/STENT referenced in active CHC grounded_in records or in `PG.snapshot.affordances[]` (if the snapshot carries them), check whether the resolving SE's `state_delta` invalidates the source per the conditions in SPEC-36 §D1. Emit verdict naming the affordance + the clobbered grounding record.

- **`obligation_counterparty_unavailable_without_transfer`**: for each active OBL in the snapshot, check `OBL.owed_by` and `OBL.owed_to` STENT references. If the resolving SE supersedes any of those STENTs' STSTAT with `life: dead` OR `agency` in {incapacitated, captive, dead, unconscious} OR `location` in {unknown, concealed, offstage}, AND the same SE does not close the OBL AND does not transfer it (no superseding OBL with the same `owed_by`/`owed_to` but different counterparty), emit verdict.

- **`slt_precondition_clobbered`**: for each SLT whose `preconditions.hard[]` evaluated true against the parent PG snapshot, check whether the resolving SE's `state_delta` invalidates any precondition record. High-salience SLTs (per SPEC-36 §D1: operator judgment at implementation time — see §Risks for the predicate-aware-vs-overapproximation decision) trigger the verdict when a precondition is clobbered AND no replacement SLT is emitted in the same patch plan AND the depending OBL/CNSQ/THR is not closed.

### 2. Register the validator in `tools/validators/src/public/registry.ts`

Add `import { causalDependencyThreatScan } from "../structural/causal-dependency-threat-scan.js";` near the top (alphabetical-by-export-name with other imports). Append `causalDependencyThreatScan` to the `structuralValidators` readonly array (after the existing 20 entries, maintaining the logical-grouping order the existing array uses).

### 3. Update `tools/validators/tests/structural/registry.test.ts`

Added `"causal_dependency_threat_scan"` to the expected validator-name list; the list became 21 after this ticket and is 22 after `archive/tickets/SPEC36STOPIPNIN-006.md`.

### 4. Create `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts`

8 tests minimum following the established structural-validator test pattern (`observer-firewall.test.ts` as the template):

- `causal_dependency_threat_scan_rejects_choice_dependency_clobbered` — fixture: PG parent with CHC grounded in STOBJ-1; SE state_delta.close includes STOBJ-1; child PG still emits the CHC. Expect verdict `choice_dependency_clobbered`.
- `causal_dependency_threat_scan_accepts_clobbered_dependency_when_choice_also_closed` — same fixture but child PG snapshot drops the CHC. Expect no verdict.
- `causal_dependency_threat_scan_rejects_affordance_dependency_clobbered` — fixture: visible affordance tied to STLOC; SE supersedes STLOC. Expect verdict.
- `causal_dependency_threat_scan_accepts_affordance_when_destination_provided` — fixture with replacement STLOC and CHC re-grounding. Expect no verdict.
- `causal_dependency_threat_scan_rejects_obligation_counterparty_unavailable_without_transfer` — fixture: active OBL with `owed_to: STENT-1`; SE supersedes STSTAT-for-STENT-1 with `life: dead`; OBL not closed. Expect verdict.
- `causal_dependency_threat_scan_accepts_obligation_transferred` — fixture with new OBL created and original closed. Expect no verdict.
- `causal_dependency_threat_scan_warns_slt_precondition_clobbered` — fixture: high-urgency OBL with eligible SLT; SE invalidates precondition without SLT replacement. Expect verdict.
- `causal_dependency_threat_scan_accepts_slt_precondition_clobbered_when_replacement_emitted` — fixture with replacement SLT emitted in same patch plan. Expect no verdict.

Use unpadded mock IDs per FOUNDATIONS-002 (and per the schema regex tightening landed in `archive/tickets/SPEC36STOPIPNIN-004.md`; the test fixtures should use unpadded IDs regardless of this ticket's position in the queue).

### 5. Update skill prose at `.claude/skills/branching-story-turn-cycle/SKILL.md:443`

Replace *"Causal dependency threat scan (judgment-based pre-apply review; full deterministic `causal_dependency_threat_scan` validator implementation deferred — see SPEC-35 §Risks & Open Questions)"* with *"Causal dependency threat scan (deterministic validator `causal_dependency_threat_scan`; see `tools/validators/src/structural/causal-dependency-threat-scan.ts` and SPEC-36 D1)"*. Preserve the rest of the bullet (the four-subcase enumeration is still informative for skill readers).

### 6. Update skill prose at `.claude/skills/branching-story-health-audit/SKILL.md:236`

Replace *"Full deterministic `causal_dependency_threat_scan` validator implementation is deferred; see SPEC-35 §Risks & Open Questions"* with *"Full deterministic `causal_dependency_threat_scan` validator is registered; see `tools/validators/src/structural/causal-dependency-threat-scan.ts` and SPEC-36 D1. Replay sub-checks listed here remain in place to surface the same verdicts during health-audit replay even when patch-plan validation was bypassed during initial commit"*.

### 7. Also update the Phase-9 Rule 5 alignment row at `branching-story-turn-cycle/SKILL.md:510`

The Rule 5 alignment row mentions `causal_dependency_threat_scan` (judgment-based) — flip "judgment-based" to "validator-backed" with a forward-pointer to SPEC-36 D1.

## Files to Touch

- `tools/validators/src/structural/causal-dependency-threat-scan.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` (new)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean-plan skipped execution list)
- `tools/validators/README.md` (modify — structural validator count and inventory)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — lines 443, 510)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — line 236)

## Out of Scope

- Schema additions or field expansions. Per SPEC-36 §13 Anti-recommendations and §Key design decisions, all four subcases operate over existing CHC/OBL/SLT/STSTAT/STLOC/STOBJ schema fields; no new fields needed.
- Health-audit Phase 2g implementation changes beyond the prose-pointer update at line 236. The replay sub-checks the audit lists remain in place; flipping the validator from "deferred" to "registered" does not alter the audit's replay flow.
- SLT-precondition predicate evaluation architecture decisions. Per SPEC-36 §Risks, the `slt_precondition_clobbered` subcheck may use either the existing `storylet_predicate_dsl` evaluator OR an overapproximation ("any reference to a clobbered record id in any hard precondition counts as clobbered"). Operator judgment at implementation time.
- `expected_witness_coverage` validator (SPEC-36 §D2 / `archive/tickets/SPEC36STOPIPNIN-006.md`). Independent of this ticket; now completed separately.

## Acceptance Criteria

### Tests That Must Pass

1. All 8 new test cases in `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` pass under `npm run build && npm test` in `tools/validators/`.
2. `tools/validators/tests/structural/registry.test.ts` expected validator-name list includes `causal_dependency_threat_scan` and the test passes.
3. Full `npm test` in `tools/validators/` is green (no regression in the existing 20 structural / 10 rule validators, and the new 21st structural validator is included in registry/capstone coverage).
4. `grep -n 'causal_dependency_threat_scan.*deferred\\|deferred.*causal_dependency_threat_scan' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returns ZERO hits (the "deferred" wording has been removed from both consumer sites).

### Invariants

1. `causal_dependency_threat_scan` is a registered structural validator with `severity_mode: "fail"` that runs against patch plans containing `create_se_record | create_pg_record | create_chc_record | create_slt_record` ops.
2. Four verdict codes (`choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer`, `slt_precondition_clobbered`) emit correctly under their respective failure fixtures.
3. Skill prose at the two named consumer sites no longer claims the validator is deferred; it now points to the registered validator's location and this spec's D1.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` (new) — 8 tests covering all four verdict codes + their accept paths; rationale per change list step 4.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — extend expected validator-name list with the new entry.
3. `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — update structural/total validator counts to 21/31.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — assert the new validator is skipped for clean non-story pre-apply plans.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/causal-dependency-threat-scan.test.js` — targeted test-file run.
2. `cd tools/validators && npm test` — full-suite proof.
3. `grep -n 'causal_dependency_threat_scan.*deferred\\|deferred.*causal_dependency_threat_scan' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — confirm skill-prose pointers flipped.

## Outcome

Completed: 2026-05-16

What changed:

- Added and registered `causal_dependency_threat_scan` as a structural validator with fail severity, full-world coverage, pre-apply coverage for `create_se_record`, `create_pg_record`, `create_chc_record`, and `create_slt_record`, plus incremental touched-file coverage for the same story surfaces.
- Implemented the four verdict families: `choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer`, and `slt_precondition_clobbered`.
- Added focused structural tests for the four rejection paths, four accept paths, and run-mode selector behavior.
- Updated registry/capstone/pre-apply execution-list tests and the validators README inventory so same-package surfaces now report 21 structural validators and include `causal_dependency_threat_scan`.
- Updated the turn-cycle and health-audit skill prose from "deferred/judgment-based" to the registered validator-backed status.

## Verification Result

- `cd tools/validators && npm run build` — PASS.
- `cd tools/validators && node --test dist/tests/structural/causal-dependency-threat-scan.test.js` — PASS; 9 tests passed.
- `cd tools/validators && npm test` — PASS; 315 tests passed.
- `grep -n 'causal_dependency_threat_scan\\|causalDependencyThreatScan' tools/validators/src/public/registry.ts` — PASS; import and array entry found.
- `grep -n 'causal_dependency_threat_scan.*deferred\\|deferred.*causal_dependency_threat_scan' .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — PASS; command exited 1 with zero stale deferred hits.

## Deviations

- The landed SLT-precondition subcheck uses the ticket's allowed overapproximation path: hard preconditions are scanned for explicit clobbered record ids rather than fully evaluating the storylet predicate DSL. This keeps the validator deterministic over existing record fields and leaves predicate-aware refinement out of scope.
- Same-package inventory/capstone surfaces were added to `Files to Touch` after live reassessment. The README also gained the already-registered `canon_baseline_drift` entry because its absence made the validator inventory stale before this ticket; leaving it omitted while updating the count to 21 would have produced an internally inconsistent handoff.
