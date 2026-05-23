# ENGINESYNC-006: `compute-pg-hashes` documents and proves YAML/JSON input parity boundary

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/cli/compute-pg-hashes.ts` help text, `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts`, rebuilt `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`, and same-seam story-skill hash guidance.
**Deps**: VALENH-016 (PG hash sha256 enforcement — completed); the engine path that consumes the hashes (`snapshot_replay_equality` in `tools/validators/`) is the authoritative comparison surface and is correct.

## Problem

At intake, the `compute-pg-hashes` CLI help text documented both YAML and JSON PG record drafts without stating the exact equivalence boundary. A 2026-05-23 authoring session saw different `state_hash` output when a hand-written YAML draft and the patch envelope's JSON payload were treated as equivalent.

Intake encounter: while running `branching-story-turn-cycle` to commit `worlds/erotica-world/stories/red-bunny/_source/pages/PG-5.yaml` (2026-05-23), the CLI invoked against `/tmp/red-bunny-PG-5-draft.yaml` returned `state_hash: 1444fa9360cd7cb8ea04b5e43600b400f8bdd1479f84a84a8b7c8be187375d2f` while `snapshot_replay_equality` computed `state_hash: ccafbd08777c537e8a94ce7aebe60e53a06d2e1cf6f284d6b98223c89b1aa343` against the JSON record embedded in the patch envelope. The intake report treated the two PG records as structurally equivalent and suspected YAML-vs-JSON parser divergence. Re-running the CLI against an extracted JSON copy of the envelope's PG record produced `ccafbd08...`, matching the validator.

Live reassessment disproved the initial parser-defect premise. The CLI parses both JSON and YAML through the same `yaml` package path. The checkout-local PG-5 repro files were not structurally equivalent: after parsing, they still differed in validation-trace string text (`→` vs `->`, changed rationale wording) while object-key order differences were harmless because canonical JSON sorts keys. The real contract gap was documentation and skill guidance: the CLI is the single source of truth only when `--pg` parses to the same PG object that will be submitted.

The landed fix keeps YAML support, adds a regression test proving YAML/JSON parity for equivalent parsed PG objects, updates CLI help, and updates story-skill guidance to prevent separate hash-only and submission-only drafts from drifting.

## Assumption Reassessment (2026-05-23)

1. **CLI source under audit**: `tools/world-mcp/src/cli/compute-pg-hashes.ts`. Live source does not branch on extension or content sniff; it parses both JSON and YAML through `YAML.parse(raw)`, then calls the shared `computePgStateHash` / `computePlanHash` helpers. The drafted "separate JSON path" premise was stale.

2. **Shared canonicalization source**: `@worldloom/world-index/hash/content` exports `canonicalJsonStringify`, `computePgStateHash`, `computePlanHash`. These are consumed by:
   - `tools/world-mcp/src/cli/compute-pg-hashes.ts` (authoring path)
   - `tools/validators/src/structural/snapshot-replay-equality.ts` (validation path)
   Both paths use the same canonicalizer. The checkout-local repro showed the YAML and JSON authoring files parsed to different content, not parser-normalized equivalents: validation-trace strings differed (`→` vs `->`, plus changed rationale text), while object-key order differed only in harmless ways.

3. **Shared boundary under audit**: `compute-pg-hashes` accepts YAML and JSON drafts; equivalent parsed PG objects must produce identical hashes. The CLI must also document that it cannot reconcile separate hash-only and submission-only drafts whose actual string content or field set differs.

4. **FOUNDATIONS / contract alignment**: the contract `.claude/skills/_shared-templates/story-state-contract.md` §4.2a names the deterministic hash computation as a load-bearing invariant ("single source of truth across authoring and validation paths"). Live proof showed YAML input itself does not break that invariant; duplicate hash-only drafts do. This ticket restores the operator contract by documenting and testing the same-parsed-payload boundary.

5. **Cross-skill impact**:
   - `branching-story-bootstrap` Phase 7 — invokes compute-pg-hashes for the genesis PG.
   - `branching-story-turn-cycle` Phase 9 — invokes compute-pg-hashes for every new page.
   - `branching-story-prose-attach` — does NOT call compute-pg-hashes (it uses the prose-hash validator path); not affected.
   Both PG-authoring skills need guidance that `--pg` must be the same parsed object that will be submitted. YAML remains supported; JSON extraction from the final envelope is a safe pattern when the envelope is assembled separately.

6. **No HARD-GATE semantics or Mystery Reserve firewall change**: the patch engine still rejects mismatched hashes via `snapshot_replay_equality`. This ticket cannot weaken HARD-GATE; it only fixes the authoring-path tool that pre-computes the values the engine will check.

7. **Adjacent contradictions**: archived SCAUD-005 and archived `archive/tickets/SCAUD-006-document-witness-trigger-conditions-and-public-bel-requirement.md` address contract-vs-validator drift in `expected_witness_coverage`; this ticket addresses authoring-tool guidance drift around `compute-pg-hashes`. Independent. All three improve the validate-patch-plan first-pass success rate but each is its own concern.

8. **Implementation correction**: Option A was already true for equivalent parsed objects, so no parser reconfiguration was needed. This ticket landed the missing executable parity guard and corrected the CLI/skill contract language. Option B (JSON-only input) was rejected because YAML support is live, tested, and safe when the parsed payload matches the submitted payload.

## Architecture Check

1. **Cleanest approach** — keep YAML support, because the live CLI already uses one parser path and already produces matching hashes for equivalent parsed YAML/JSON objects. The missing piece was an executable regression test plus operator guidance that the `--pg` file must be the same parsed payload that will be submitted. This avoids narrowing author ergonomics to JSON-only while still preventing the real failure mode: separate drafts drifting in string content or field set.

2. **No backwards-compatibility shims**: no alias path, alternate canonicalizer, or JSON-only fallback was introduced. The canonicalizer remains `@worldloom/world-index/hash/content`; the CLI help and skill references now state the exact input-equivalence contract.

## Verification Layers

1. **YAML and JSON inputs produce identical hashes for equivalent PG records** -> automated test: `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` now takes a representative PG record draft, represents it as both YAML and JSON, runs compute-pg-hashes against each, and asserts `plan_hash` and `state_hash` match exactly.

2. **Authoring path matches validation path** -> manual repro/classification: the 2026-05-23 PG-5 checkout-local YAML/JSON files produced different hashes because their parsed PG content differed, not because equivalent YAML/JSON parser paths diverged. The skill contract now requires hashing the same file used to build the envelope or extracting the final envelope payload.

3. **CLI help and skill references stay accurate** -> codebase grep-proof: `rg -n "JSON and YAML|same parsed|hash-only|separate.*draft|compute-pg-hashes" tools/world-mcp/src/cli/compute-pg-hashes.ts .claude/skills/_shared-templates/story-record-schemas.md .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle` returns the updated guidance.

4. **No HARD-GATE weakening** -> manual review: the patch engine still rejects mismatched hashes; the CLI fix only changes the pre-submission hash computation, never the submission-time validation.

## Landed Changes

### 1. Audited and clarified `tools/world-mcp/src/cli/compute-pg-hashes.ts`

The CLI help now states that JSON and YAML produce identical hashes only when they parse to the same PG object. It also states that the CLI does not reconcile content drift between separate draft files and that `--pg` must match the payload that will be validated/submitted.

### 2. Update CLI help text

The help text reflects the corrected behavior: both formats are accepted and share one parser path, but equivalence is defined by parsed PG object content, not by author intent.

### 3. Update skill references

- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` — adjusts the "single source of truth" wording to require the same parsed submitted payload.
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` — replaces the JSON-only workaround framing with the same-payload rule and names JSON extraction from the final envelope as one safe pattern.
- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` — adds the same no-duplicate-drafts rule for genesis PG hash computation.
- `.claude/skills/_shared-templates/story-record-schemas.md` — updates the shared §4.2a tooling contract used by both skills.

### 4. Rebuild distributed CLI

`npm run build` in `tools/world-mcp` refreshed `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` from source.

## Files to Touch

- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (modify help text)
- `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` (rebuilt generated artifact)
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (modify existing CLI test)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify shared contract)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify wording)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify Phase 9 guidance)
- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` (modify Phase 10 guidance)

## Out of Scope

- Changing `snapshot_replay_equality` or the canonicalizer in `@worldloom/world-index/hash/content`. Those are correct; the intake divergence was upstream authoring-draft content drift, not canonicalizer drift.
- Adding hash precomputation to MCP server tools (the CLI is the authoring contract).
- Auditing previously-committed PG records that may have been authored against the YAML path. If they passed validation at submission time, their state_hash and plan_hash are already correct against the engine's canonical computation. This ticket affects future authoring, not historical records.
- Replacing or reconfiguring the `yaml` library. Live proof showed equivalent parsed payloads already hash identically.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test in `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` round-trips a representative PG record through YAML and JSON and asserts hash equality.
2. `cd tools/world-mcp && npm test` passes.
3. Focused compiled CLI proof passes: `cd tools/world-mcp && node --test dist/tests/cli/compute-pg-hashes.test.js`.
4. Manual repro classification confirms the 2026-05-23 PG-5 YAML/JSON files were not the same parsed PG payload; the landed guidance prevents that duplicate-draft failure mode.

### Invariants

1. The contract's "single source of truth across authoring and validation paths" guarantee (story-state-contract §4.2a and `pre-flight-and-prerequisites.md`) holds for all supported input formats when `--pg` parses to the same PG object that will be submitted.
2. Authors do not need to extract JSON from their patch envelope if the patch envelope is built from the same PG draft passed to the CLI. If the envelope is assembled separately, the skill must hash the final envelope's PG payload rather than a near-duplicate scratch draft.
3. The canonicalizer at `@worldloom/world-index/hash/content` remains the single canonicalization surface; this ticket does not introduce a second.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` — extended with a YAML/JSON parity test containing em-dashes, Unicode arrows, a multi-line `validation_trace` rationale, and nested PG state fields.
2. No separate integration test was added; the focused compiled CLI test proves the live invariant, and the PG-5 repro showed duplicate draft content drift rather than parser drift.

### Commands

1. `cd tools/world-mcp && npm test` — full package suite.
2. `cd tools/world-mcp && npm run build` — refresh generated `dist/`.
3. `cd tools/world-mcp && node --test dist/tests/cli/compute-pg-hashes.test.js` — focused compiled CLI proof.
4. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan /tmp/red-bunny-PG-5-plan.md --pg /tmp/red-bunny-PG-5-draft.yaml` and the same command with `/tmp/red-bunny-PG-5-from-envelope.json` — checkout-local diagnostic reproducing the historical mismatch before classifying parsed-object differences.

## Outcome

Completed: 2026-05-23.

`compute-pg-hashes` now has an explicit regression test proving equivalent YAML and JSON PG drafts produce identical `plan_hash` and `state_hash` output. The CLI help text now states the exact equivalence boundary: both formats are accepted, but they must parse to the same PG object that will be submitted. The shared story-state contract and the bootstrap / turn-cycle hash guidance now forbid separate hash-only and submission-only drafts unless the hash input is extracted from the final envelope payload.

Live reassessment corrected the ticket premise: no parser reconfiguration was needed because both input formats already use the same `YAML.parse(raw)` path. The historical PG-5 mismatch was caused by actual content drift between `/tmp/red-bunny-PG-5-draft.yaml` and `/tmp/red-bunny-PG-5-from-envelope.json`.

## Verification Result

1. `cd tools/world-mcp && npm test` — pre-edit baseline passed; 434 tests passed.
2. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan /tmp/red-bunny-PG-5-plan.md --pg /tmp/red-bunny-PG-5-draft.yaml` — reproduced historical `state_hash: 1444fa9360cd7cb8ea04b5e43600b400f8bdd1479f84a84a8b7c8be187375d2f`.
3. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan /tmp/red-bunny-PG-5-plan.md --pg /tmp/red-bunny-PG-5-from-envelope.json` — reproduced historical `state_hash: ccafbd08777c537e8a94ce7aebe60e53a06d2e1cf6f284d6b98223c89b1aa343`.
4. Direct parsed-object comparison of the PG-5 YAML and JSON files — classified the mismatch as real content drift in `validation_trace` strings; object key order was the only harmless structural-order difference.
5. `cd tools/world-mcp && npm run build` — passed; refreshed `dist/src/cli/compute-pg-hashes.js`.
6. `cd tools/world-mcp && node --test dist/tests/cli/compute-pg-hashes.test.js` — passed; 7 CLI subtests passed, including the new YAML/JSON parity subtest.
7. `cd tools/world-mcp && npm test` — final package proof passed; 435 tests passed, including the new parity subtest, and refreshed `dist/`.
8. `rg -n "JSON and YAML|same parsed|hash-only|separate.*draft|compute-pg-hashes" tools/world-mcp/src/cli/compute-pg-hashes.ts .claude/skills/_shared-templates/story-record-schemas.md .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle` — passed; current CLI and skill guidance contain the corrected same-payload contract.
9. `git diff --check` — passed.
10. Manual review: `snapshot_replay_equality`, `computePgStateHash`, and `computePlanHash` remain unchanged; the patch changes authoring-time help/guidance and regression coverage only, not submission-time validation.

## Deviations

- The original draft assumed separate YAML and JSON parsing paths and a YAML parser defect. Live source and the PG-5 repro disproved that; the ticket was narrowed to parity coverage plus contract guidance.
- No `tools/validators` test run was retained as an acceptance gate because validator behavior did not change. The validator package remains a consumer of the same canonicalizer, but this ticket did not edit validator code or schemas.
- No separate envelope integration test was added. The focused CLI parity test proves the supported-format invariant, and the checkout-local PG-5 diagnostic proved the reported failure was duplicate-draft content drift rather than equivalent-input parser divergence.
