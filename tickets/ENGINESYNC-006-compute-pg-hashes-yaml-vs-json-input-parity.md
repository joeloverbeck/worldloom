# ENGINESYNC-006: `compute-pg-hashes` CLI produces divergent state_hash for equivalent YAML and JSON inputs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/cli/compute-pg-hashes.ts` (and/or the shared `@worldloom/world-index/hash/content` helpers it depends on); possibly `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` after build.
**Deps**: VALENH-016 (PG hash sha256 enforcement — completed); the engine path that consumes the hashes (`snapshot_replay_equality` in `tools/validators/`) is the authoritative comparison surface and is correct.

## Problem

The `compute-pg-hashes` CLI is documented as accepting both YAML and JSON PG record drafts, with the help text claiming the YAML and JSON paths are equivalent ("YAML is parsed with the standard 'yaml' package; JSON is a subset"). In practice the two parsing paths produce structurally different JS objects for what authors expect to be the same content, and the resulting canonical-JSON hashes diverge.

Concrete encounter: while running `branching-story-turn-cycle` to commit `worlds/erotica-world/stories/red-bunny/_source/pages/PG-5.yaml` (2026-05-23), the CLI invoked against `/tmp/red-bunny-PG-5-draft.yaml` returned `state_hash: 1444fa9360cd7cb8ea04b5e43600b400f8bdd1479f84a84a8b7c8be187375d2f` while `snapshot_replay_equality` computed `state_hash: ccafbd08777c537e8a94ce7aebe60e53a06d2e1cf6f284d6b98223c89b1aa343` against the JSON record embedded in the patch envelope. The two PG records were structurally equivalent — same field set, same nested object shapes, same string contents (the validation_trace strings, branch_isolation arrow style, etc. were synced). Re-running the CLI against an extracted JSON copy of the envelope's PG record produced `ccafbd08...`, matching the validator. The divergence is therefore between the YAML and JSON parsing paths inside the CLI, not between author intent and disk content.

This breaks the contract's stated tooling guarantee — `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` line 24 calls compute-pg-hashes "single source of truth across authoring and validation paths." The single source is correct only when callers feed it the JSON-from-the-envelope (the same shape the engine will write). Authoring against a hand-written YAML draft diverges silently.

Author-time workaround used in the 2026-05-23 commit: extract the PG record from the patch envelope JSON to its own file (`/tmp/red-bunny-PG-5-from-envelope.json`) and run compute-pg-hashes against that. This worked but is not documented anywhere in the skill or the CLI help.

## Assumption Reassessment (2026-05-23)

1. **CLI source under audit**: `tools/world-mcp/src/cli/compute-pg-hashes.ts`. The CLI reads the file path, branches on extension or content sniff to YAML vs JSON parsing, then calls the shared `computePgStateHash` / `canonicalJsonStringify` helpers. The divergence point is in the YAML→JS-object step, not in the canonicalization step (the canonicalizer is shared and deterministic).

2. **Shared canonicalization source**: `@worldloom/world-index/hash/content` exports `canonicalJsonStringify`, `computePgStateHash`, `computePlanHash`. These are consumed by:
   - `tools/world-mcp/src/cli/compute-pg-hashes.ts` (authoring path)
   - `tools/validators/src/structural/snapshot-replay-equality.ts` (validation path)
   Both paths use the same canonicalizer, so the divergence is upstream of canonicalization — i.e., in how YAML scalars and JSON scalars become JS objects. Confirmed by running compute-pg-hashes against an extracted JSON copy of the envelope's PG record: that produces the validator's hash, proving the YAML parse step is the culprit.

3. **Shared boundary under audit**: `compute-pg-hashes` YAML-parse path ↔ `compute-pg-hashes` JSON-parse path. Both must produce identical JS objects for equivalent inputs OR the CLI must document that they don't and require JSON input.

4. **FOUNDATIONS / contract alignment**: the contract `.claude/skills/_shared-templates/story-state-contract.md` §4.2a names the deterministic hash computation as a load-bearing invariant ("single source of truth across authoring and validation paths"). The current CLI breaks that invariant when invoked with YAML; this ticket restores it.

5. **Cross-skill impact**:
   - `branching-story-bootstrap` Phase 7 — invokes compute-pg-hashes for the genesis PG.
   - `branching-story-turn-cycle` Phase 9 — invokes compute-pg-hashes for every new page.
   - `branching-story-prose-attach` — does NOT call compute-pg-hashes (it uses the prose-hash validator path); not affected.
   Both PG-authoring skills currently hand authors a draft-YAML pattern that risks the same divergence I hit. This ticket also requires updating those skills' references to recommend the JSON-extracted form OR to depend on a fixed YAML path.

6. **No HARD-GATE semantics or Mystery Reserve firewall change**: the patch engine still rejects mismatched hashes via `snapshot_replay_equality`. This ticket cannot weaken HARD-GATE; it only fixes the authoring-path tool that pre-computes the values the engine will check.

7. **Adjacent contradictions**: archived SCAUD-005 and archived `archive/tickets/SCAUD-006-document-witness-trigger-conditions-and-public-bel-requirement.md` address contract-vs-validator drift in `expected_witness_coverage`; this ticket addresses tool-vs-engine drift in `compute-pg-hashes`. Independent. All three improve the validate-patch-plan first-pass success rate but each is its own concern.

## Architecture Check

1. **Cleanest approach** — two viable options, pick at implementation:

   **Option A (preferred): make YAML and JSON paths produce identical JS objects.** Audit the YAML parsing for scalar-style normalization differences. Specifically:
   - Em-dashes (`—`, U+2014), smart quotes (`'`, `'`, `"`, `"`), and other Unicode characters that YAML may normalize differently than JSON.
   - Multi-line string folding (block scalars `>` vs `|`) producing different newline/trailing-whitespace artifacts than JSON string literals.
   - Number/string coercion (e.g., a string `"3"` in YAML being parsed as the number 3 when JSON would keep it as a string).
   - Boolean/null sentinel coercion (YAML's `yes`/`no`/`on`/`off`/`null` vs JSON's strict `true`/`false`/`null`).
   - Trailing whitespace on string values.

   Fix root cause: configure the YAML parser to behave like JSON.parse for the subset of inputs compute-pg-hashes accepts (strings stay strings, multi-line strings preserve exact whitespace, no implicit type coercion). Add a unit test in `tools/world-mcp/tests/` that round-trips a representative PG record through both formats and asserts hash equality.

   **Option B (fallback): restrict the CLI to JSON-only input.** If the YAML→JSON parity audit is too costly, remove the YAML code path entirely and update the CLI help, skill references, and skill examples to require JSON input. Authors compute hashes against either the JSON envelope's PG record (the common case) or a hand-rolled JSON draft.

   Option A is cleaner because authors prefer YAML for human-edited drafts. Option B is acceptable as a fallback if the YAML parity audit uncovers more parsing-difference points than are tractable to align. Implementation should attempt A first and fall back to B only if A is intractable.

2. **No backwards-compatibility shims**: if Option A succeeds, the CLI behavior is silently improved (existing YAML drafts that already round-trip correctly are unaffected; previously-divergent drafts now produce the correct hash). If Option B is chosen, the CLI emits a clear error when given YAML input directing the caller to convert to JSON; no fallback to the broken YAML path is supported.

## Verification Layers

1. **YAML and JSON inputs produce identical hashes for equivalent PG records** -> automated test: new unit test in `tools/world-mcp/tests/compute-pg-hashes.test.ts` (or equivalent) that takes a representative PG record draft, serializes it in both YAML and JSON, runs compute-pg-hashes against each, and asserts `plan_hash` and `state_hash` match exactly.

2. **Authoring path matches validation path** -> integration test: take the 2026-05-23 red-bunny PG-5 record (or equivalent), build a patch envelope, run `compute-pg-hashes` against the authoring YAML draft AND `validate-patch-plan` against the envelope, assert both report the same `state_hash`.

3. **CLI help and skill references stay accurate** -> codebase grep-proof: `grep -n "YAML\|JSON" tools/world-mcp/src/cli/compute-pg-hashes.ts` returns the updated help text; `grep -n "compute-pg-hashes" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/*.md` returns updated guidance consistent with the chosen Option (A or B).

4. **No HARD-GATE weakening** -> manual review: the patch engine still rejects mismatched hashes; the CLI fix only changes the pre-submission hash computation, never the submission-time validation.

## What to Change

### 1. Audit and fix `tools/world-mcp/src/cli/compute-pg-hashes.ts` (Option A)

Compare YAML vs JSON parsing of representative PG records that have triggered divergence. Likely suspects (validate empirically before deciding):
- Multi-line string fields (`world_logic_rationale`, `validation_trace.*`, `label` fields with em-dashes or long descriptions).
- String content that YAML may interpret as another type (the parsed string `"3"` becoming the number 3, etc.).
- Unicode normalization differences (NFC vs NFD on combining characters, smart-quote vs straight-quote normalization).
- Trailing/leading whitespace artifacts in folded block scalars.

Configure the YAML parser to behave as a strict superset of JSON for the subset of inputs the CLI accepts. Add unit-test coverage that locks the parity.

### 2. Update CLI help text

Reflect the corrected behavior. If Option A: state that YAML and JSON inputs produce identical hashes when content is equivalent. If Option B: state that only JSON is accepted, and direct authors to extract the PG record from their patch envelope JSON if they have one.

### 3. Update skill references

- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` line 24 — adjust the "single source of truth" wording to reflect the implementation. (If Option A: keep wording; the truth-guarantee is restored. If Option B: add a sentence directing authors to use JSON.)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` — Phase 9 hash-computation guidance.
- `.claude/skills/branching-story-bootstrap/SKILL.md` — Phase 7 hash-computation guidance.

### 4. Rebuild distributed CLI

After source change, run the build step that regenerates `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`. Skill calls the dist path; both source and dist must be in sync.

## Files to Touch

- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (modify)
- `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` (rebuilt from source — confirm build pipeline)
- `tools/world-mcp/tests/compute-pg-hashes.test.ts` (new — or extend existing test file if one exists)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify wording)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify Phase 9 guidance)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify Phase 7 guidance)

## Out of Scope

- Changing `snapshot_replay_equality` or the canonicalizer in `@worldloom/world-index/hash/content`. Those are correct; the divergence is upstream.
- Adding hash precomputation to MCP server tools (the CLI is the authoring contract).
- Auditing previously-committed PG records that may have been authored against the YAML path. If they passed validation at submission time, their state_hash and plan_hash are already correct against the engine's canonical computation. This ticket affects future authoring, not historical records.
- Replacing the `yaml` library with another parser. Configuration of the existing library is the first attempt; library swap is an Option-C escalation that should be its own ticket if Option A and B both fail.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test in `tools/world-mcp/tests/` round-trips a representative PG record through YAML and JSON and asserts hash equality (Option A) OR rejects YAML input with a clear error (Option B).
2. `cd tools/world-mcp && npm test` passes.
3. `cd tools/validators && npm test` passes (no validator behavior changed).
4. Smoke test: take a known-good envelope (e.g., the structure of the 2026-05-23 PG-5 commit), build the corresponding authoring YAML draft, run `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-md> --pg <yaml-draft>` and confirm the result matches what `validate-patch-plan` reports against the JSON envelope. With Option A this is the central proof; with Option B the smoke test exercises the JSON path.

### Invariants

1. The contract's "single source of truth across authoring and validation paths" guarantee (story-state-contract §4.2a and `pre-flight-and-prerequisites.md`) holds for all supported input formats.
2. Authors do not need to extract JSON from their patch envelope to obtain a correct hash; the CLI works against their authoring draft directly (Option A) OR the CLI emits a clear error directing them to JSON (Option B), never silently produces a hash that diverges from the engine's canonical computation.
3. The canonicalizer at `@worldloom/world-index/hash/content` remains the single canonicalization surface; this ticket does not introduce a second.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/compute-pg-hashes.test.ts` — new (or extended) test asserting YAML/JSON parity (Option A) or YAML-rejection clarity (Option B). Test fixture should include the categories of content that triggered divergence in the 2026-05-23 encounter: em-dashes in `validation_trace` strings, multi-line `world_logic_rationale`, ASCII-arrow vs Unicode-arrow normalization, label fields with em-dashes.
2. `tools/world-mcp/tests/compute-pg-hashes-integration.test.ts` (or equivalent) — round-trip against a representative envelope.

### Commands

1. `cd tools/world-mcp && npm test` — confirm CLI unit tests pass, including the new parity test.
2. `cd tools/validators && npm test` — confirm validators still pass; no behavior change expected.
3. Smoke test (Option A): `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <known-plan.md> --pg <equivalent-pg-draft.yaml>` and `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <known-plan.md> --pg <equivalent-pg-draft.json>` produce identical output.
4. Smoke test (Option B): the YAML invocation in step 3 exits non-zero with a clear "JSON only" error; the JSON invocation succeeds.
