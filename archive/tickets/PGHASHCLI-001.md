# PGHASHCLI-001: Constrain `compute-pg-hashes` to JSON input and enforce envelope-record provenance

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/cli/compute-pg-hashes.ts`, `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (modify), `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` (new), `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md`, and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` workflow notes; `_shared-templates/story-record-schemas.md` §4.2a CLI-invocation paragraph; `_shared-templates/story-state-contract.md` §10 step 5a post-write verification wording; no validator or patch-engine change. No backwards-compat shim path.
**Deps**: None.

## Problem

At intake, `tools/world-mcp/src/cli/compute-pg-hashes.ts` read `--pg <path>` as either YAML or JSON via `YAML.parse(raw)` and its inline documentation claimed:

> JSON and YAML inputs are both supported and produce identical hashes when they parse to the same PG object.

In the 2026-05-25 red-bunny PG-2 turn-cycle session, this invariant did not hold:

- `compute-pg-hashes --plan PG-2.md --pg PG-2.yaml` returned `state_hash=985ee5df3d95…` (with the YAML draft of the PG-2 record).
- `compute-pg-hashes --plan PG-2.md --pg PG-2-from-envelope.json` (the same PG-2 record extracted from the patch envelope via `jq '.patches[5].payload.record'`) returned `state_hash=d9eb4b4e73a1…`.

These differed despite parsing to logically-equivalent objects. The `validate-patch-plan` engine then failed with `snapshot_replay_equality.state_hash_mismatch` against the envelope-derived expected hash. The skill operator had stamped the YAML-derived hash onto the envelope's PG-2 record, and the engine recomputed canonically from the JSON.

Two compounding problems:

1. **CLI permissiveness invites authoring drift.** The CLI accepts a YAML draft because YAML is convenient for hand-authoring, but the patch engine always validates from the JSON envelope. Authoring skills that draft PG records in YAML, compute hashes from that YAML, and then assemble a JSON envelope are *guaranteed* to risk drift whenever YAML→JSON serialization round-trips through any tool (`yaml` package version differences, scalar quoting heuristics, multi-line string normalization, integer-vs-float typing). The CLI's documentation contract ("identical hashes when they parse to the same PG object") is therefore impossible to honor across all valid inputs.

2. **Operator-error footgun.** A `state_hash` mismatch at `validate-patch-plan` time produces a clear error, but only after every other step has been completed (hashes stamped, envelope assembled, defensive non_propagation_facts added, etc.). The cost is a full hash-recompute + envelope-rebuild cycle for what should be a structural impossibility. SKILL.md §10 step 5a names the post-write recomputation as a belt-and-suspenders check, but offers no guidance against the pre-commit drift class observed here.

The FOUNDATIONS-aligned principle under audit is the §Tooling Recommendation paragraph: "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — ... canonical authority artifacts." The corollary at hash-stamping time: the CLI must hash the exact bytes the engine will validate, not a separate draft.

## Assumption Reassessment (2026-05-25)

Implementation reassessment (2026-05-26): package baseline was green before edits (`cd tools/world-mcp && npm test --silent`, 469 passing tests). The active test surface already contains `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts`, so this ticket modifies that file rather than creating it. Live stale-consumer inventory found same-seam YAML-acceptance or generic `--pg <pg-record-path>` wording in `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md`, `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md`, `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`, and `.claude/skills/_shared-templates/story-state-contract.md`; those references are absorbed into the owned file set with the parent `SKILL.md` summaries. Package README and repo docs mention the helper only as a world-root/escape-valve CLI, not the `--pg` input-format contract, so they remain out of scope.

1. At intake, `tools/world-mcp/src/cli/compute-pg-hashes.ts` accepted either YAML or JSON via `YAML.parse(raw)`, and the inline help text promised parity but did not enforce it. The CLI is consumed by `branching-story-bootstrap` Phase 7 (`.claude/skills/branching-story-bootstrap/SKILL.md` references the CLI) and `branching-story-turn-cycle` Phase 9 (`.claude/skills/branching-story-turn-cycle/SKILL.md` step 7). `branching-story-prose-attach` is carved out from CLI usage per `_shared-templates/story-record-schemas.md` §4.2a (it uses `computePgStateHash` directly from `@worldloom/world-index`).

2. `_shared-templates/story-record-schemas.md` §4.2a is the FOUNDATIONS-aligned source-of-truth for PG hash computation. It documents the CLI invocation but does not specify which input format is canonical. The 2026-05-25 session demonstrated that the CLI's "YAML and JSON identical-hash" claim is empirically false.

3. Cross-skill boundary under audit: every PG-authoring skill consumes this CLI. The canonical end-state path is: skill assembles the envelope JSON first → extracts `patches[N].payload.record` to a JSON file → hashes that file → stamps the result back into the envelope record. The current path (skill drafts a YAML PG file, hashes it, separately assembles JSON envelope) admits drift. After this ticket, the CLI rejects YAML input outright, forcing the canonical path.

4. FOUNDATIONS §Tooling Recommendation principle: "LLM agents should never operate on prose alone." The corollary for hash-stamping: agents must hash the exact bytes the engine validates. Restricting the CLI to JSON enforces this structurally at the tooling boundary.

5. Schema-extension audit: no schema field is added or removed. The CLI's output shape `{plan_hash, state_hash}` is unchanged. Only the input-format contract narrows.

6. Adjacent contradictions exposed during reassessment: `_shared-templates/story-record-schemas.md` §4.2a names YAML as a permitted CLI input ("Pass a draft PG record that contains placeholder values for both hashes (or omits them entirely); the CLI ignores the input's `state_hash` field and overwrites the input's `plan.plan_hash` in the canonical payload with the value computed from `--plan`, so callers may pass a draft that has placeholders for both hashes. JSON and YAML inputs are both supported and produce identical hashes when they parse to the same PG object."). This sentence must be revised in lockstep with the CLI change. The §4.2a "Tooling" paragraph mentions both `tools/world-mcp/src/cli/compute-pg-hashes.ts` (TS source) and `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` (runtime); both remain valid references.

## Architecture Check

1. **Why this is cleaner than alternatives.** Four alternatives considered:

   - *Fix YAML/JSON parity in the CLI.* Requires deep normalization of the parsed object before canonical serialization (strip `undefined`, coerce numeric strings, normalize multi-line strings) — a recurring maintenance burden, and the parity test surface is combinatorial.
   - *Accept the drift; document it loudly.* Loses operator trust in the tool; the failure mode is post-validate-patch-plan, which is expensive to repair.
   - *Auto-extract from a passed envelope path.* Adds a second CLI flag (`--envelope <path> --patch-index <N>`). Useful but orthogonal to the parity question. Track as follow-up.
   - *Restrict CLI to JSON input only.* The patch engine always validates JSON. The CLI hashing the same JSON the engine validates eliminates the parity question by construction. Authoring tools that want YAML drafts run a separate YAML→JSON conversion step first.

   The chosen design — restrict CLI input to JSON — eliminates the divergence class entirely. The CLI surface narrows; the authoring skill workflow gains a single deterministic step (build envelope first, hash envelope record, stamp).

2. **No backwards-compatibility shims.** The CLI's `--pg` flag continues to accept a file path; only the parser narrows from YAML-or-JSON to JSON-only. YAML input produces a clear error message naming the constraint and pointing the operator at the conversion step. No silent acceptance of YAML; no fallback path.

## Verification Layers

1. CLI rejects YAML input correctly → unit-test grep-proof (`grep -n "YAML.parse" tools/world-mcp/src/cli/compute-pg-hashes.ts` returns zero matches after the change; `grep -n "JSON.parse" tools/world-mcp/src/cli/compute-pg-hashes.ts` returns the new parser call site).
2. CLI accepts JSON input and produces canonical hashes → unit-test invariants: (a) valid JSON PG record produces the expected hashes; (b) YAML input fails with a clear error message naming the constraint; (c) malformed JSON fails with a JSON-parse error; (d) missing fields fail with a clear message; (e) the produced hashes match `computePgStateHash` / `computePlanHash` from `@worldloom/world-index/hash/content` for the same parsed object.
3. Parity regression closed → integration test (`tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts`): asserts the CLI now rejects YAML input outright, eliminating the parity class.
4. Documentation updated → manual review (`_shared-templates/story-record-schemas.md` §4.2a + `.claude/skills/branching-story-{bootstrap,turn-cycle}/SKILL.md` reference the JSON-only constraint and the canonical envelope-record extraction pattern).
5. Existing-bundle regression substitute → direct compiled CLI smoke with an envelope-shaped JSON PG record passed as `--pg`, plus a direct YAML rejection smoke; no checkout-local red-bunny envelope was available or needed for the owned invariant.
6. Full-suite regression → package verification command (`cd tools/world-mcp && npm test --silent`) passes. `bash scripts/check-all.sh` was attempted and failed before reaching the owned package on two `tools/world-index` CLI test files that passed when isolated; see Deviations.

## Landed Changes

### 1. Restrict `compute-pg-hashes` CLI to JSON input

`tools/world-mcp/src/cli/compute-pg-hashes.ts` now parses `--pg` with `JSON.parse`, rejects YAML with an explicit envelope-extraction diagnostic, requires a top-level `plan` object, and keeps stdout `{plan_hash, state_hash}` unchanged.

### 2. Update help text and inline docs

The CLI help text now names `--pg <pg-record-json-path>`, rejects YAML, and points operators at `jq '.patches[N].payload.record' envelope.json > PG-record.json`.

### 3. Update `_shared-templates/story-record-schemas.md` §4.2a

The shared schema/contract text now requires JSON-only `--pg` input and the envelope-record extraction pattern; the post-write plan-hash check now also says to pass the committed PG payload JSON, not a YAML draft.

### 4. Update SKILL.md workflow notes

`branching-story-bootstrap` and `branching-story-turn-cycle` parent/references now instruct operators to assemble the patch envelope first, extract the PG payload to JSON, hash that file, and stamp the returned hashes back into the envelope record before validation.

### 5. Add unit + integration tests

`tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` now covers JSON success, YAML rejection, malformed JSON, missing plan block, direct-helper parity, and post-write plan drift with JSON input. `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` documents the closed parity class by rejecting YAML and hashing the envelope-extracted JSON payload.

## Files to Touch

- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (modify — drop YAML import, JSON-only parse, updated error message and help text)
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (modify)
- `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` (new)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.2a JSON-only constraint)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §10 step 5a JSON-only post-write verification wording)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — CLI-invocation workflow)
- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` (modify — JSON-only invocation workflow)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — CLI-invocation workflow)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify — CLI prerequisite wording)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify — JSON-only invocation workflow)

## Out of Scope

- Adding a `--envelope <path> --patch-index <N>` shortcut flag to auto-extract the PG record. Useful but orthogonal; track as PGHASHCLI-002 if desired.
- Touching `validate-patch-plan` or `submit-patch-plan` CLIs (they already accept only JSON envelopes; no change needed).
- The `branching-story-prose-attach` carve-out from CLI usage (it uses `computePgStateHash` directly per §4.2a; this ticket does not affect that path).
- Removing the `yaml` package from `tools/world-mcp/package.json` (it is consumed by other CLI tools and the MCP server; only the `compute-pg-hashes` CLI surface narrows).

## Acceptance Criteria

### Tests That Must Pass

1. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build && npm test --silent` reports all tests passing including the updated `compute-pg-hashes.test.ts` and new `yaml-vs-json-parity.test.ts`.
2. `if rg -n 'YAML\\.parse' tools/world-mcp/src/cli/compute-pg-hashes.ts; then exit 1; fi` exits 0.
3. `rg -n 'JSON\\.parse' tools/world-mcp/src/cli/compute-pg-hashes.ts` returns the parser call site.
4. CLI accepts JSON: direct compiled CLI smoke with an envelope-shaped `/tmp/PG-1-test.json` exits 0 with a valid `{plan_hash, state_hash}` JSON object.
5. CLI rejects YAML: passing a YAML-only `--pg` file fails with exit code 1 and the new error message.
6. End-to-end parity with engine is covered at the owned boundary by the integration test and direct helper assertion; full patch-plan validation is outside this ticket because no validator or patch-engine semantics changed.

### Invariants

1. `compute-pg-hashes` accepts only JSON input for `--pg`. YAML and other formats produce a clear error and a non-zero exit code.
2. The CLI's `state_hash` output, when computed against `jq '.patches[N].payload.record' envelope.json > PG-record.json`, is byte-identical to the value the patch-engine `snapshot_replay_equality` validator computes for the same envelope record. This invariant is the structural fix for the 2026-05-25 drift class.
3. The `--plan` flag continues to accept any UTF-8 byte stream (plan markdown is byte-hashed directly; no parse step on the plan).
4. The CLI's stdout output schema (`{plan_hash, state_hash}` as 64-lowercase-hex sha256 values) is unchanged. Exit codes remain `0` on success, `1` on I/O or parse error, `2` on CLI argument error.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` — modified test cases covering JSON acceptance, YAML rejection, malformed JSON, missing plan block, plan_hash stamping correctness, and parity with `computePgStateHash` / `computePlanHash` direct calls.
2. `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` — exhibits a YAML file and an envelope-extracted JSON file; asserts the CLI rejects the YAML and produces hashes for the JSON that match the engine's expected values.
3. Existing `tools/world-mcp/tests/cli/*` files — verify no regression in `validate-patch-plan`, `submit-patch-plan`, `sign-approval-token` test suites.

### Commands

1. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build`
2. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && node --test dist/tests/cli/compute-pg-hashes.test.js dist/tests/integration/yaml-vs-json-parity.test.js`
3. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm test --silent`
4. CLI JSON smoke and YAML rejection smoke from the repo root using `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`.
5. `bash scripts/check-all.sh` was attempted as a broad regression and failed before the owned package in `tools/world-index`; see Deviations.
6. The narrower accepted verification boundary is the CLI's own test suite plus the integration parity test and package suite because no validator or patch-engine semantics changed; only the CLI input contract narrows.

## Outcome

Completion date: 2026-05-26.

`compute-pg-hashes` now accepts only JSON PG records for `--pg`, rejects YAML with a clear operator recovery message, and requires the PG payload to include a top-level `plan` object. The package tests now cover the narrowed input contract, and the authoring skills/templates now direct operators to hash the exact JSON PG payload extracted from the patch envelope.

## Verification Result

1. `cd tools/world-mcp && npm run build` — PASS.
2. `cd tools/world-mcp && node --test dist/tests/cli/compute-pg-hashes.test.js dist/tests/integration/yaml-vs-json-parity.test.js` — PASS, 10 tests.
3. Repo-root JSON CLI smoke with `tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan /tmp/... --pg /tmp/PG-1-test.json` — PASS, emitted 64-hex `plan_hash` and `state_hash`.
4. Repo-root YAML CLI smoke with `--pg /tmp/PG-1.yaml` — expected FAIL, exit 1 with `must be valid JSON` and `no longer accepts YAML input`.
5. `if rg -n 'YAML\\.parse' tools/world-mcp/src/cli/compute-pg-hashes.ts; then exit 1; fi` — PASS, no `YAML.parse` remains.
6. `rg -n 'JSON\\.parse' tools/world-mcp/src/cli/compute-pg-hashes.ts` — PASS, parser call site present.
7. Stale-anchor sweeps for old YAML/parity contract phrases across the owned CLI/tests/skills/templates — PASS, no current operational stale hits.
8. `cd tools/world-mcp && npm test --silent` — PASS, 472 tests.
9. `bash scripts/check-all.sh` — attempted broad regression; FAILED in `tools/world-index` before the owned `world-mcp` package, with `dist/tests/cli-init.test.js` and `dist/tests/cli-smoke.test.js` reported failed under the broad runner. Direct diagnostic runs of both files passed.

## Deviations

1. The drafted ticket said `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` was new or extendable; live reassessment found it already existed, so this run modified it.
2. The same-seam stale-consumer sweep found additional skill/template references beyond the initial file list: `.claude/skills/_shared-templates/story-state-contract.md` and `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md`.
3. The red-bunny PG-2 checkout-local envelope was not available as a durable fixture; the accepted proof uses temp synthetic envelope-shaped JSON plus direct helper parity and package tests.
4. `bash scripts/check-all.sh` is not accepted as green for this ticket because it failed in `tools/world-index` before exercising the owned package. The reported failing `world-index` files passed when run directly, and the owned `world-mcp` suite passed after the change.
