# PGHASHCLI-001: Constrain `compute-pg-hashes` to JSON input and enforce envelope-record provenance

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/cli/compute-pg-hashes.ts`, `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (new), `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` (new), `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/branching-story-turn-cycle/SKILL.md` workflow notes; `_shared-templates/story-record-schemas.md` §4.2a CLI-invocation paragraph; no validator or patch-engine change. No backwards-compat shim path.
**Deps**: None.

## Problem

`tools/world-mcp/src/cli/compute-pg-hashes.ts` reads `--pg <path>` as either YAML or JSON via `YAML.parse(raw)` (line 150). Its inline documentation (lines 39-49) claims:

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

1. `tools/world-mcp/src/cli/compute-pg-hashes.ts` accepts either YAML or JSON via `YAML.parse(raw)` (line 150). The inline help text (lines 39-49) promises parity but does not enforce it. The CLI is consumed by `branching-story-bootstrap` Phase 7 (`.claude/skills/branching-story-bootstrap/SKILL.md` references the CLI) and `branching-story-turn-cycle` Phase 9 (`.claude/skills/branching-story-turn-cycle/SKILL.md` step 7). `branching-story-prose-attach` is carved out from CLI usage per `_shared-templates/story-record-schemas.md` §4.2a (it uses `computePgStateHash` directly from `@worldloom/world-index`).

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
5. Existing-bundle regression → skill dry-run (the red-bunny PG-2 envelope (`/tmp/pg2-staging/envelope.json` or equivalent fresh fixture) re-validates clean against the new CLI when its PG-2 record is extracted via `jq '.patches[5].payload.record' > /tmp/PG-2-from-envelope.json` and passed as `--pg`).
6. Full-suite regression → codebase verification command (`cd tools/world-mcp && npm test` passes; `bash scripts/check-all.sh` passes).

## What to Change

### 1. Restrict `compute-pg-hashes` CLI to JSON input

In `tools/world-mcp/src/cli/compute-pg-hashes.ts`:

- Remove the `import YAML from "yaml"` line.
- Replace `parsed = YAML.parse(raw)` with `parsed = JSON.parse(raw)`.
- Wrap `JSON.parse` in a try/catch that emits a clear failure message:

  ```ts
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `PG file ${filePath} must be valid JSON. ${cause}. The CLI no longer accepts YAML input: build your patch envelope first, extract the PG record via \`jq '.patches[N].payload.record' envelope.json > PG-record.json\`, then pass that file as --pg. See _shared-templates/story-record-schemas.md §4.2a.`
    };
  }
  ```

- Update the `HELP_TEXT` to document JSON-only input and the canonical envelope-record extraction pattern.

### 2. Update help text and inline docs

Replace the lines 39-49 paragraph in `HELP_TEXT` with:

```
  --pg <path>             Path to a JSON file containing the PG record draft.
                          YAML input is rejected — the patch engine validates
                          JSON, so the CLI must hash the same JSON the engine
                          will validate. Recommended workflow: build the patch
                          envelope first; extract the PG record with
                            jq '.patches[N].payload.record' envelope.json > PG-record.json
                          and pass PG-record.json as --pg. The 'state_hash'
                          field on the input is IGNORED (it is the value being
                          computed); the 'plan.plan_hash' field, if present,
                          is REPLACED in the canonical payload by the value
                          computed from --plan.
```

### 3. Update `_shared-templates/story-record-schemas.md` §4.2a

Replace the paragraph that names "JSON and YAML inputs are both supported" with the constrained version:

> JSON-only input. The CLI accepts only JSON for `--pg`; YAML drafts are rejected. The canonical workflow: skill assembles the patch envelope JSON first; extracts `patches[N].payload.record` to a JSON file (e.g., via `jq`); passes that JSON file as `--pg`. This guarantees the hashed bytes are byte-identical to the bytes the engine will canonically serialize at validate-patch-plan and submit-patch-plan time. Drafting a PG record in YAML and hashing the YAML separately admits parity drift between the YAML→object and JSON→object code paths and is structurally forbidden.

Also update the §4.2a "Tooling" paragraph to remove the "JSON and YAML inputs are both supported" sentence and replace it with the JSON-only constraint.

### 4. Update SKILL.md workflow notes

In `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/branching-story-turn-cycle/SKILL.md`, the existing CLI-invocation paragraphs reference `--pg <path>` as accepting YAML or JSON. Replace with the JSON-only canonical pattern:

```
1. Assemble the patch envelope JSON in working memory (all create / supersede ops
   with record bodies inline as JSON objects).
2. Extract the PG record to its own JSON file:
     jq '.patches[<PG-OP-INDEX>].payload.record' envelope.json > PG-N-record.json
3. Hash via the canonical CLI:
     node tools/world-mcp/dist/src/cli/compute-pg-hashes.js \
       --plan pages-prose-plans/PG-N.md \
       --pg   PG-N-record.json
4. Stamp the returned plan_hash and state_hash back into the envelope record.
5. Validate via tools/world-mcp/dist/src/cli/validate-patch-plan.js envelope.json.
```

### 5. Add unit + integration tests

- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (new or extend existing). Cases:
  - Valid JSON input produces deterministic `{plan_hash, state_hash}` matching `computePgStateHash` / `computePlanHash` for the same parsed object.
  - YAML input fails with the new error message and a non-zero exit code.
  - Malformed JSON fails with a clear parse error.
  - Missing `plan` block produces a sensible error.
  - The CLI's stamped `plan_hash` matches the value the engine computes for the resulting envelope (parity assertion).
- `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` (new). Cases:
  - YAML input (even when its parsed object is logically equivalent to a JSON input) is rejected with the new error message.
  - The integration test documents WHY parity is not attempted (links to this ticket and §4.2a paragraph).

## Files to Touch

- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (modify — drop YAML import, JSON-only parse, updated error message and help text)
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (new or modify)
- `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` (new)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.2a JSON-only constraint)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — CLI-invocation workflow)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — CLI-invocation workflow)

## Out of Scope

- Adding a `--envelope <path> --patch-index <N>` shortcut flag to auto-extract the PG record. Useful but orthogonal; track as PGHASHCLI-002 if desired.
- Touching `validate-patch-plan` or `submit-patch-plan` CLIs (they already accept only JSON envelopes; no change needed).
- The `branching-story-prose-attach` carve-out from CLI usage (it uses `computePgStateHash` directly per §4.2a; this ticket does not affect that path).
- Removing the `yaml` package from `tools/world-mcp/package.json` (it is consumed by other CLI tools and the MCP server; only the `compute-pg-hashes` CLI surface narrows).

## Acceptance Criteria

### Tests That Must Pass

1. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build && npm test --silent 2>&1 | tail -5` reports all tests passing including the new `compute-pg-hashes.test.ts` and `yaml-vs-json-parity.test.ts`.
2. `grep -n "YAML.parse" tools/world-mcp/src/cli/compute-pg-hashes.ts` returns zero matches.
3. `grep -n "JSON.parse" tools/world-mcp/src/cli/compute-pg-hashes.ts` returns the new parser call site.
4. CLI accepts JSON: `echo '{"id":"PG-1","story_id":"STORY-1","branch_id":"BR-1","parent_page_id":null,"branch_path":["PG-1"],"turn_index":0,"input":{"choice_id":null,"manual_action_text":null,"resolved_event_id":"SE-1"},"state_hash_parent":null,"state_hash":"placeholder","state_snapshot":{"canon_revision":null,"active_records":{"STCHAR":[]},"entity_status":{},"unresolved_mystery_claims":[],"visible_affordances":[],"continuation":{"has_eligible_commitment_block":false,"terminal_status":"open","terminal_rationale":null}},"plan":{"plan_hash":"placeholder"},"prose_plan_path":"pages-prose-plans/PG-1.md","emitted_choices":[],"validation_trace":{}}' > /tmp/PG-1-test.json && echo "test plan body" > /tmp/PG-1-plan.md && node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan /tmp/PG-1-plan.md --pg /tmp/PG-1-test.json` exits 0 with a valid `{plan_hash, state_hash}` JSON object.
5. CLI rejects YAML: passing a YAML-only `--pg` file fails with exit code 1 and the new error message.
6. End-to-end parity with engine: assembling a synthetic envelope JSON, extracting its PG record, hashing via the CLI, stamping back into the envelope, and running `validate-patch-plan` on the envelope returns `status: pass` with no `snapshot_replay_equality.state_hash_mismatch` verdict.

### Invariants

1. `compute-pg-hashes` accepts only JSON input for `--pg`. YAML and other formats produce a clear error and a non-zero exit code.
2. The CLI's `state_hash` output, when computed against `jq '.patches[N].payload.record' envelope.json > PG-record.json`, is byte-identical to the value the patch-engine `snapshot_replay_equality` validator computes for the same envelope record. This invariant is the structural fix for the 2026-05-25 drift class.
3. The `--plan` flag continues to accept any UTF-8 byte stream (plan markdown is byte-hashed directly; no parse step on the plan).
4. The CLI's stdout output schema (`{plan_hash, state_hash}` as 64-lowercase-hex sha256 values) is unchanged. Exit codes remain `0` on success, `1` on I/O or parse error, `2` on CLI argument error.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` — 6+ test cases covering JSON acceptance, YAML rejection, malformed JSON, missing plan block, plan_hash stamping correctness, and parity with `computePgStateHash` / `computePlanHash` direct calls.
2. `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` — exhibits a YAML file and a JSON file representing the same logical PG record; asserts the CLI rejects the YAML and produces hashes for the JSON that match the engine's expected values.
3. Existing `tools/world-mcp/tests/cli/*` files — verify no regression in `validate-patch-plan`, `submit-patch-plan`, `sign-approval-token` test suites.

### Commands

1. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build && npm test --silent 2>&1 | tail -10` (targeted package test).
2. `cd /home/joeloverbeck/projects/worldloom && bash scripts/check-all.sh` (full-pipeline regression).
3. End-to-end synthetic-envelope flow: assemble `/tmp/test-envelope.json` with one `create_pg_record` op; extract the PG record via `jq`; hash via the new CLI; stamp the returned hashes back into the envelope; run `validate-patch-plan` and assert `status: pass`. (Documented as a test-plan step in the new integration test.)
4. The narrower verification boundary is the CLI's own test suite plus one end-to-end parity test — full validator-package regression is not required because no validator semantic changes; only the CLI input contract narrows.
