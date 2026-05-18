# SPEC45STOSTAPRO-005: cross-file-reference validator extension for creation_evidence dangling-ref detection

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/validators/src/structural/cross-file-reference.ts` (or adds a sibling validator file) to detect dangling references in the new `creation_evidence` edges introduced by `archive/tickets/SPEC45STOSTAPRO-002.md`; extends test coverage at `tools/validators/tests/structural/cross-file-reference.test.ts`; conditionally updates `tools/validators/src/public/registry.ts` if a new sibling validator file is added.
**Deps**: `archive/tickets/SPEC45STOSTAPRO-002.md`

## Problem

The new `creation_evidence` edges introduced by `archive/tickets/SPEC45STOSTAPRO-002.md` carry record ids parsed from `intro:<CLASS>(... evidence=[...])` tags in `SE.world_logic_rationale`. If an evidence id in a tag references a record that doesn't exist (typo, dangling reference, deleted record), the indexer emits an unresolved edge to the non-existent evidence id — there is currently no validator check against this case for indexed edges specifically. Per SPEC-45 §Approach Phase 3, a hygiene validator extension catches the issue at validation time, surfaced initially as a `warn`-level diagnostic so latent issues can be audited without blocking the validator pass, then upgraded to `fail` after one validator-pass cycle confirms no false positives on known-good bundles.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/structural/cross-file-reference.ts` exists and exports `crossFileReference` validator at the top of the file (validator name `cross_file_reference`, with codes `cross_file_reference.unknown_file_class` and `cross_file_reference.orphan_reference` already in place). `tools/validators/tests/structural/cross-file-reference.test.ts` exists. `tools/validators/src/public/registry.ts` already imports `crossFileReference` from `../structural/cross-file-reference.js`. Verified via Read.
2. SPEC-45 §Approach Phase 3 D12 specifies the extension target (or sibling file); D13 specifies new test fixture; D14 specifies conditional registry update only if a new validator file is added (not if extending the existing one). Spec also notes that state_delta_* edge dangling refs are *"already covered by the existing `cross_file_reference` validator's id-based check, but verify coverage explicitly during implementation"* — implementation MUST verify and document this coverage claim before drafting code.
3. Cross-skill / cross-package boundary under audit: this validator runs against the world-index database edges produced by `archive/tickets/SPEC45STOSTAPRO-002.md`. The validator-to-indexer contract is the `edges(source_node_id, target_node_id, target_unresolved_ref, edge_type)` shape and the specific `edge_type` strings (`state_delta_create`, `state_delta_supersede`, `creation_evidence`). Validator must query the edges by exact edge_type string.
4. FOUNDATIONS principle under audit: §Story Bundles §8 — *"atomic YAML records remain append-only at the filesystem level, following the same record-append-only discipline that governs `_source/<world-subdir>/*.yaml`."* The validator extension supports this principle by catching reference-integrity drift between indexed edges and the underlying YAML records; without it, dangling refs could accumulate as bundles age and gradually corrupt graph queries.
5. HARD-GATE / Canon Safety surface: this ticket modifies a structural validator under `tools/validators/src/structural/` (per per-ticket-type granularity in skill-audit's `references/cascade-and-summary-discipline.md` §Step 6.2(c)). Structural validators gate canon and story-bundle record validation at engine pre-apply and post-commit time; modifying one is a Canon Safety surface change. The change does not weaken the Mystery Reserve firewall (the validator extension is purely additive — catching MORE drift, not fewer cases).

## Architecture Check

1. **Extending existing validator preserves single-source-of-truth for reference-integrity checks**: `cross_file_reference` is the natural home for "this id references a record that doesn't exist" diagnostics. Adding a sibling validator file (`cross-file-reference-indexed-edges.ts`) would create two validators with overlapping reference-integrity concerns; extending the existing one keeps the responsibility consolidated. Default: extend existing; only add sibling if implementation reveals a structurally-cleaner separation (e.g., if indexed-edge dangling-ref detection requires substantially different db-query patterns than file-content dangling-ref detection).
2. **No backwards-compatibility shims introduced**: the extension is additive; existing `cross_file_reference` diagnostics remain unchanged. The new diagnostic emits a new code (`cross_file_reference.dangling_creation_evidence` or analogous; final code name decided at implementation) at `warn` severity initially.

## Verification Layers

1. **Validator extension exists at the chosen location** → codebase grep-proof: `grep -n "creation_evidence" tools/validators/src/structural/cross-file-reference.ts` (or the sibling file path if that route is chosen) returns matches confirming the new logic is in place.
2. **Validator fires on synthetic fixture with dangling creation_evidence** → schema validation: new test in `cross-file-reference.test.ts` constructs a synthetic indexed edge `creation_evidence` pointing to a record id that doesn't exist in the index; validator emits the expected `warn`-level diagnostic with the correct code.
3. **Validator passes on synthetic fixture with valid creation_evidence** → schema validation: same test but with valid target record id present in the index; validator emits zero diagnostics for that edge.
4. **State_delta_* dangling-ref coverage verified** → codebase manual review: read existing `cross-file-reference.ts` and confirm whether the existing id-based check covers `state_delta_create` / `state_delta_supersede` edge targets; if yes, document the coverage in the ticket's PR description; if no, extend coverage at the same time as creation_evidence (per spec's *"verify coverage explicitly during implementation"* directive).

## What to Change

### 1. Verify state_delta_* coverage

Before drafting the creation_evidence extension, verify whether the existing `cross_file_reference` validator's id-based check already covers `state_delta_create` and `state_delta_supersede` edge dangling refs. Run a synthetic-fixture test with intentionally-dangling `state_delta_create` target id; observe whether the existing validator emits a diagnostic.

- If yes: document the coverage in the ticket's PR description; no `state_delta_*` extension needed.
- If no: extend coverage at the same time as creation_evidence (same diagnostic shape, same severity escalation path); the work composes naturally since both edges live in the same db table.

### 2. Extend cross-file-reference for creation_evidence

In `tools/validators/src/structural/cross-file-reference.ts`, add logic to query indexed `creation_evidence` edges and verify each edge's target record id exists in the index (or in the staged patch plan, per existing `cross_file_reference` patterns). For each edge whose target doesn't resolve:

- Emit a diagnostic with validator name `cross_file_reference`, severity `warn`, code `cross_file_reference.dangling_creation_evidence` (or similar — operator chooses final name matching existing convention), and a clear message naming the source record (the created record), the target record id (the missing evidence), and the SE that authored the introduction (resolvable via reverse `state_delta_create` lookup).

Severity is `warn` initially per SPEC-45 §Risks: ship as warn first, audit findings on known-good bundles, upgrade to `fail` once a validator-pass cycle confirms no false positives.

### 3. Conditional registry update

If the implementation chooses to add a new sibling validator file (`cross-file-reference-indexed-edges.ts`) instead of extending the existing one, register the new validator in `tools/validators/src/public/registry.ts` per the existing registration convention (import + entry in the validator array). If extending the existing file, no registry change is needed.

### 4. Extend tests

In `tools/validators/tests/structural/cross-file-reference.test.ts`, add test cases covering:

- Dangling `creation_evidence` target: synthetic indexed edge where `tgt` is a record id not present in the index → validator emits expected `warn`-level diagnostic.
- Valid `creation_evidence` target: synthetic indexed edge where `tgt` is a record id present in the index → validator emits zero diagnostics for that edge.
- Mixed batch: 5 valid + 3 dangling `creation_evidence` edges in one fixture → validator emits exactly 3 diagnostics.
- (If state_delta_* coverage extension landed): parallel test cases for `state_delta_create` and `state_delta_supersede` dangling refs.

## Files to Touch

- `tools/validators/src/structural/cross-file-reference.ts` (modify) — extend with creation_evidence dangling-ref detection; possibly also state_delta_* coverage per step 1's verification outcome.
- `tools/validators/tests/structural/cross-file-reference.test.ts` (modify) — add new test fixtures.
- `tools/validators/src/public/registry.ts` (modify — conditional, only if step 3 adds a new sibling validator file).

## Out of Scope

- Upgrading severity to `fail` — SPEC-45 §Approach Phase 3 explicitly stages this for a follow-up after one validator-pass cycle confirms no false positives. Ticket scope is the initial `warn`-level extension only.
- Adding a `supersession-chain-acyclic` validator — SPEC-45 §Out of Scope (deferred; ships with `supersedes_record` edge which is also out of scope).
- Refactoring the existing `cross_file_reference` validator's structure — operator can refactor for clarity if the extension forces it, but a refactor for refactoring's sake is out of scope.
- Repairing existing bundles with dangling refs that the new validator surfaces — SPEC-45 §Risks names per-bundle followup as the cleanup path, not blocking this spec.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/validators` passes after the extension lands.
2. New test cases pass: `npm test --prefix tools/validators` (running `cross-file-reference.test.ts` plus full validator suite for regression).
3. Full validator suite passes against red-bunny (post-Codex remediation): `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` exits 0; if `creation_evidence` warns surface, document them per SPEC-45 §Risks (red-bunny has no intro tags currently per consolidated validator output, so no creation_evidence edges → no dangling-ref warns expected on red-bunny specifically).

### Invariants

1. The validator extension emits diagnostics with severity `warn` (not `fail`) in this iteration.
2. The validator extension does NOT weaken the Mystery Reserve firewall (FOUNDATIONS §Rule 7) — the extension is purely additive (catches more drift, not fewer cases).
3. Existing `cross_file_reference` diagnostic codes (`unknown_file_class`, `orphan_reference`) continue to emit unchanged.
4. The extension's diagnostic code is grep-discoverable and matches existing naming convention (`cross_file_reference.*`).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/cross-file-reference.test.ts` (modify) — add fixtures for dangling and valid `creation_evidence` edges; possibly parallel fixtures for `state_delta_*` edges per step 1's verification outcome.

### Commands

1. `npm run build --prefix tools/validators` — type-checking + compilation.
2. `npm test --prefix tools/validators` — full validator test suite.
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` — end-to-end against the actively-maintained red-bunny bundle.
