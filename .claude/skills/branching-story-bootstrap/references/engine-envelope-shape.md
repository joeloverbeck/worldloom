# Patch Engine Envelope Shape — Reference

Reference for `branching-story-bootstrap` Phase 11 patch-plan assembly and submission. Covers the JSON envelope shape the patch engine accepts, the per-op payload convention for the bootstrap op mix, the `expected_id_allocations` format for story-bundle classes, the `approval_token` placeholder convention, validate / submit path selection by envelope size (a typical bootstrap envelope is 75+ records and routinely exceeds the MCP transport's inline limit), envelope-splitting fallback when even the CLI submit hits limits, and common failure-mode response codes.

Query `mcp__worldloom__describe_envelope_schema(op_kind?)` for the deployed envelope schema and per-op payload wrappers before assembling or debugging a patch plan. Prefer passing `op_kind` when the phase needs one operation wrapper. If an unfiltered response returns `delivery_status: "persisted_with_summary"`, use `summary.available_op_kinds` to narrow the next call or recover a persisted schema slice with `mcp__worldloom__get_persisted_packet_slice(persisted_path, "op_schemas.<op_kind>")`. For per-record-class JSON-schema discovery (e.g., to verify the validator schema for a `storylet_record` / `page_record` / `choice_record` / `story_entity_record` / `story_fact_record` / `story_event_record` / `obligation_record` / `consequence_record` / `thread_record` / `relationship_record_story` / `intention_record` / `story_location_record` / `story_object_record` / `branch_record` / `story_diegetic_artifact_record`), query `mcp__worldloom__get_record_schema(node_type=<X>)` — `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` at `tools/world-mcp/src/tools/get-record-schema.ts:226-251` enumerates every supported `node_type` including all 14 story-bundle record types. The canonical schema source-of-truth remains `tools/patch-engine/src/envelope/schema.ts` (operation payload types) and the JSON schemas under `tools/validators/src/schemas/` (story-bundle-record schemas: `story-entity.schema.json`, `story-fact.schema.json`, `story-event.schema.json`, `story-obligation.schema.json`, `story-thread.schema.json`, `story-relationship.schema.json`, `story-intention.schema.json`, `story-location.schema.json`, `story-object.schema.json`, `story-branch.schema.json`, `story-page.schema.json`, `story-choice.schema.json`, `story-storylet.schema.json`, `story-diegetic-artifact.schema.json`); operationally use the MCP `get_record_schema` and `describe_envelope_schema` tools for live retrieval — direct `Read` of the schema files is a fallback for offline / debugging contexts only.

A third valid pattern is schema-by-example: direct `Read` of a representative existing record under `worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml`. Use this when envelope construction needs both the structural shape and realistic field population in one lightweight read, especially for soft-required-by-discipline fields that the permissive JSON schemas do not require. This requires a committed record of the target class in the target story bundle or a close same-world example; if no representative record exists yet, use live MCP schema retrieval or the offline schema-file fallback instead.

This file documents the operationally-relevant subset and the discovered workarounds. The parallel references for sibling engine-routing skills are `.claude/skills/canon-addition/references/engine-envelope-shape.md` and `.claude/skills/create-base-world/references/engine-envelope-shape.md`; the bootstrap op mix and verdict differ from canon-addition's, so the per-op shapes documented below take precedence here.

---

## 1. Envelope skeleton

Every patch plan submitted to `mcp__worldloom__submit_patch_plan` (or its CLI equivalent) MUST be a JSON object with the following top-level fields:

```json
{
  "plan_id": "STORY-NNNN-bootstrap-<story-slug>",
  "target_world": "<world-slug>",
  "approval_token": "placeholder",
  "verdict": "bootstrap_accept",
  "originating_skill": "branching-story-bootstrap",
  "expected_id_allocations": { ... },
  "patches": [ ... ]
}
```

Every field is required. `approval_token` is a placeholder string in the JSON (see §4); the real signed token is computed from the envelope bytes and passed alongside the envelope at submit time. `verdict` is `"bootstrap_accept"` for this skill (a freeform string the engine accepts; the canon-addition verdict-enum constraints do not bind story-bundle plans). `originating_skill` is `"branching-story-bootstrap"` literally.

A typical bootstrap envelope contains ~75-80 ops (4 STENT + 19-22 SF + 1 SE + 8 OBL + 4 THR + 2 SREL + 3 STINT + 5 STLOC + 3 STOBJ + 20 SLT + 1 BR + 1 PG + 5 CHC). At ~155KB compact JSON / ~5,800 lines pretty-printed, this is structurally too large for the MCP transport's inline parameter limits — the CLI submit path (§5) is the default for bootstrap envelopes.

---

## 2. Per-op payload shape

Each entry in `patches[]` is a `PatchOperationEnvelope` with this shape:

```json
{
  "op": "create_stent_record",
  "target_world": "<world-slug>",
  "target_file": "worlds/<world-slug>/stories/<story-slug>/_source/entities/STENT-NNNN.yaml",
  "target_record_id": "STENT-NNNN",
  "failure_mode": "strict",
  "payload": {
    "story_slug": "<story-slug>",
    "record": { "id": "STENT-NNNN", "story_id": "STORY-NNNN", ... }
  }
}
```

Required fields on every op: `op`, `target_world`, **`target_file`**, **`payload`**. `target_record_id` and `failure_mode` are recommended.

### `payload.story_slug` is required for every story-bundle op

Every story-bundle op's payload carries `story_slug` alongside `record`. This is distinct from canon-addition's payload shape (which uses typed-record keys like `cf_record` directly). The engine uses `story_slug` to resolve the bundle root before applying the op.

### `target_file` semantics for story-bundle ops

`target_file` is the workspace-relative path the engine writes to. For story-bundle records the canonical convention is `worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml`. The shape validator requires a non-empty string; the engine derives the actual write path from the record's id but the shape check still enforces the field.

### File-class → directory mapping for `target_file` paths

| Op kind | `target_file` (under `worlds/<world-slug>/stories/<story-slug>/`) |
|---|---|
| `create_stent_record` | `_source/entities/STENT-NNNN.yaml` |
| `create_sf_record` | `_source/facts/SF-NNNN.yaml` |
| `create_se_record` | `_source/events/SE-NNNN.yaml` |
| `create_obl_record` | `_source/obligations/OBL-NNNN.yaml` |
| `create_cnsq_record` | `_source/consequences/CNSQ-NNNN.yaml` (rare at bootstrap; runtime page-cycle JIT-creates) |
| `create_thr_record` | `_source/threads/THR-NNNN.yaml` |
| `create_srel_record` | `_source/relationships/SREL-NNNN.yaml` |
| `create_stint_record` | `_source/intentions/STINT-NNNN.yaml` (bare-numeric id per the engine's `^STINT-\d{4}$` regex; per-character semantics carried via `record.stent_id`, with `record.world_character_id` as the optional world CHAR anchor, not via id suffix) |
| `create_stloc_record` | `_source/locations/STLOC-NNNN.yaml` |
| `create_stobj_record` | `_source/objects/STOBJ-NNNN.yaml` |
| `append_story_diegetic_artifact_record` | `_source/artifacts/DA-NNNN.yaml` (rare at bootstrap; premise-driven story-local artifacts only) |
| `create_br_record` | `_source/branches/BR-NNNN.yaml` |
| `create_pg_record` | `_source/pages/PG-NNNN.yaml` |
| `create_chc_record` | `_source/choices/CHC-NNNN.yaml` |
| `create_slt_record` | `_source/storylets/SLT-NNNN.yaml` |

### Story-bundle record schemas are permissive

The story-bundle record schemas at `tools/validators/src/schemas/story-*.schema.json` require only `id` and `story_id` with `additionalProperties: true` — every other field documented in `templates/story-records.yaml` and the storylet-pool-authoring template is operator-discipline rather than schema-enforced. The validators (rule1-7, record_schema_compliance, etc.) check semantic correctness of the operational fields; the JSON schema itself is intentionally lenient to allow the rich record bodies the bootstrap produces.

---

## 3. `expected_id_allocations` per-class format

The engine's pre-apply check verifies that `expected_id_allocations` matches the engine's next-id calculation per story-bundle class. Allocation keys are added only when the corresponding ops appear in the envelope. Bootstrap envelopes typically omit `cnsq_ids` and `da_ids` because CNSQ and story-local DA records are conditional, premise-driven records at bootstrap, not defaults. Bootstrap envelopes typically populate the following allocation classes:

```json
{
  "stent_ids": ["STENT-0001", "STENT-0002", "STENT-0003", "STENT-0004"],
  "sf_ids": ["SF-0001", ..., "SF-NNNN"],
  "se_ids": ["SE-0001"],
  "obl_ids": ["OBL-0001", ..., "OBL-NNNN"],
  "thr_ids": ["THR-0001", ..., "THR-NNNN"],
  "srel_ids": ["SREL-0001", ..., "SREL-NNNN"],
  "stint_ids": ["STINT-0001", ..., "STINT-NNNN"],
  "stloc_ids": ["STLOC-0001", ..., "STLOC-NNNN"],
  "stobj_ids": ["STOBJ-0001", ..., "STOBJ-NNNN"],
  "br_ids": ["BR-0001"],
  "pg_ids": ["PG-0001"],
  "chc_ids": ["CHC-0001", ..., "CHC-NNNN"],
  "slt_ids": ["SLT-0001", ..., "SLT-NNNN"]
}
```

Each id class uses `<PREFIX>-NNNN` (4-digit zero-padded). The per-op check rejects any `create_*_record` op whose `record.id` is not in the corresponding allocation list.

Allocate each ID via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story-slug>)` at pre-flight before envelope assembly. Story-bundle id classes require `story_slug`; bundle-scoped IDs are independent across bundles (a STENT-0001 in story A and story B do not collide).

---

## 4. `approval_token` placeholder convention

The envelope JSON itself carries an `approval_token` field, but its value at envelope-construction time is a **placeholder string** (e.g., `"placeholder"` or any free string). The real signed approval token is computed from the envelope bytes by the `sign-approval-token` CLI and passed alongside the envelope at submit time.

```bash
node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/<plan-id>.json
node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/<plan-id>.json > /tmp/<plan-id>.token
node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/<plan-id>.json /tmp/<plan-id>.token
```

Or via MCP (only practical for envelopes ≤50KB, see §5):

```
mcp__worldloom__submit_patch_plan(envelope, approval_token)
```

The envelope-shape validator requires `approval_token` to be a non-empty string, so omitting the field fails with `invalid_input: patch_plan.approval_token must be a non-empty string`. The placeholder satisfies this requirement; the real token is verified server-side at submit time against the envelope bytes (HMAC-SHA256 binding, single-use, expiry-bound default 20 minutes — see `docs/HARD-GATE-DISCIPLINE.md` §Approval token discipline).

The signed token is base64-encoded with the structure `<base64-payload>.<hex-signature>`. The payload is a JSON object with `plan_id`, `world_slug`, `patch_hashes[]`, `issued_at`, and `expires_at`; the signature is HMAC-SHA256 of the payload bytes using the secret at `tools/world-mcp/.secret`. If the envelope content changes between sign and submit, re-sign the token; the unchanged-envelope case requires no re-sign. The most common bootstrap-time failure mode is `approval_malformed: token must contain a signature separator` from omitting the signing step entirely (passing a freeform string as `approval_token`); always sign via the CLI.

---

## 5. Validate / submit path selection by envelope size

| Envelope size | Validate path | Submit path |
|---|---|---|
| ≤ 50KB (rare for bootstrap; only when bundle has <~25 records) | MCP path: `mcp__worldloom__validate_patch_plan(envelope)` | MCP path: `mcp__worldloom__submit_patch_plan(envelope, approval_token)` |
| > 50KB (typical bootstrap envelopes — full bundle with 75+ records routinely lands at 100KB-200KB) | CLI path: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` | CLI path: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` |

Both validate paths route through the same `validate_patch_plan` handler and return the same `pass | fail | skipped` status object plus per-validator verdicts (`validators_run[]`). Both submit paths route through the same `submitPatchPlan` engine code (`tools/patch-engine/src/apply.ts`) and produce the same `PatchReceipt`. The CLIs exist to bypass MCP transport size constraints. **Bootstrap envelopes are typically submitted via the CLI path** because the full bundle (cast + state + storylets + page) routinely exceeds 100KB. See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan: MCP path (default) and CLI path (size-constrained bypass) for the canonical write-up.

When using the CLI submit path, persist the envelope JSON to `/tmp/<plan-id>.json` and the signed token to `/tmp/<plan-id>.token` (single line, base64) before invoking the CLI. The validate CLI requires only the envelope JSON.

Invoke both patch-plan CLIs from the project root or active git worktree root (the directory containing `worlds/`, `tools/`, and `docs/`). The CLI/engine path resolves world state from `process.cwd()` and opens the index at `worlds/<slug>/_index/world.db` via `tools/world-index/src/index/open.ts` `indexDirectoryForWorld`; running from another cwd can surface as `Index missing for world '<slug>'` even when the index exists under the repo root.

### Envelope-splitting fallback (when even the CLI submit hits limits)

For exceptionally large bundles where even the CLI submit path's transport hits limits (rare; the CLI path is the established escape hatch for the MCP transport's smaller cap), the bootstrap may fall back to splitting the single envelope into multiple sequential envelopes. Atomicity is best preserved by the single-envelope-via-CLI path; envelope splitting trades structural atomicity for operator-managed sequential commits.

Recommended split order if forced:

1. **Envelope A — Cast architecture**: `create_stent_record`, `create_stint_record`, `create_stloc_record`, `create_stobj_record`, `create_srel_record` ops (story-local entities + intentions + locations + objects + relationships).
2. **Envelope B — Story state**: `create_sf_record`, `create_se_record`, `create_thr_record`, `create_obl_record` ops, plus `create_cnsq_record` and `append_story_diegetic_artifact_record` only when the premise actually emits CNSQ / story-local DA records at PG-0001 (facts + genesis event + threads + obligations + optional consequences + optional story-local diegetic artifacts).
3. **Envelope C — Storylets**: `create_slt_record` ops (the seed pool — the largest single class, ~20 records each routinely 3-5KB).
4. **Envelope D — Page architecture**: `create_br_record`, `create_pg_record`, `create_chc_record` ops (root branch + root page + emitted choices). PG-0001's `state_snapshot` references every prior class, so this envelope must land last.

Each envelope must be signed independently — `sign-approval-token` binds the token to the envelope bytes, and each envelope has different bytes. **Partial-failure recovery**: if envelope N fails after envelopes 1..N-1 succeeded, the bundle is in inconsistent state on disk; manually clean up the partial bundle's `_source/` files (or `git checkout -- worlds/<world-slug>/stories/<story-slug>/_source/`) before resubmitting from envelope 1. Do NOT attempt to resume mid-sequence — the per-op `expected_id_allocations` checks may pass-or-fail differently when the world-index reflects partially-applied state. The §6 failure-mode table covers per-envelope error response.

The single-envelope-via-CLI path is preferred whenever transport limits permit; envelope splitting is a documented fallback for the rare case where CLI submit also hits limits.

### Pre-submit validation step

The `validate_patch_plan` step (MCP or CLI) is **optional but recommended** before any submit. The validator runs the same pre-apply checks the engine runs at submit time (yaml_parse_integrity, id_uniqueness, cross_file_reference, record_schema_compliance, rule1-rule12) without mutating state. On `pass`, proceed to signing + submit with high confidence the submit will land cleanly. On `fail`, inspect `verdicts[].location.file` to identify the failing record, fix the envelope, and re-validate before signing. For multi-envelope (split) submissions, validate each envelope independently before its sign + submit cycle.

---

## 6. Common failure-mode response codes

The patch engine and retrieval tools surface these failure modes; map each to the appropriate skill response.

### Pre-validation envelope-shape errors

| Code | Meaning | Response |
|---|---|---|
| `invalid_input` | Envelope or op field missing / malformed (e.g., empty `approval_token`, missing `target_file`, missing `payload.story_slug`). The error's `details.field` names the first offending path. When multiple shape errors are present, `details.additional_errors[]` lists the remaining invalid-input errors for the same call. | Fix the envelope; re-validate. The signed approval token does NOT need to be re-signed if the envelope content does not change — but if the envelope IS changed, re-sign before submit. |
| `envelope_shape_invalid` | Same family as `invalid_input`; structural shape rejected before per-op validation. | Same as `invalid_input`. |
| `target_file_missing` | Op's `target_file` is empty or missing. | Fix the op's `target_file` per §2; re-validate. |
| `record_already_exists` | A `create_*_record` op's record-id already exists on disk. For bootstrap, this typically means the story bundle was partially committed by a prior failed run (per §5 envelope-splitting partial-failure). | Abort and investigate — the bundle is not in a fresh state. Clean up the partial `_source/` files before resubmitting. Do NOT blindly re-allocate. |
| `id_allocation_race` | Verifier sees an allocation that does not match the engine's next-id calculation for that class. Either another plan landed concurrently or the allocation list is malformed. For bootstrap this is rare unless multiple bootstrap runs raced; for split envelopes it can fire if envelope N's allocations were computed before envelope N-1 committed. | Re-allocate IDs against current world state via `allocate_next_id` and rebuild the envelope. For split envelopes, re-sign each remaining envelope after fixing allocations. |
| `missing_expected_id_allocation` | Per-op check found a `record.id` not listed in the corresponding allocation array. | Add the missing ID to the allocation list; re-validate. |
| `Index missing for world '<slug>'` | The validate/submit CLI was likely invoked from the wrong cwd. The CLI/engine path derives `worldRoot` from `process.cwd()` before opening `worlds/<slug>/_index/world.db`. | Re-invoke from the project root or active git worktree root. If it still fails from that cwd, rebuild or inspect the world index. |

### Approval-token errors

| Code | Meaning | Response |
|---|---|---|
| `approval_malformed` | Token is not in the `<base64-payload>.<hex-signature>` format. Most commonly fires when the operator passed a freeform string as `approval_token` instead of running `sign-approval-token.js` on the envelope. | Run `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` to produce a properly signed token; resubmit with the signed token. |
| `approval_invalid_hmac` | Token's signature does not verify against the envelope bytes — typically because the envelope changed between sign and submit. | Re-sign the current envelope; resubmit. |
| `approval_hash_mismatch` | Token's `plan_id` / `world_slug` / `patch_hashes[]` do not match the envelope. Typically an operator error: signing one envelope and submitting a different one. | Verify the envelope and token correspond; re-sign if needed; resubmit. |
| `approval_expired` | Token is past its expiry window (default 20 minutes). | Re-sign the unchanged envelope; resubmit immediately. |
| `approval_replayed` | Token already consumed by a prior successful submit (single-use enforcement). | Do NOT resubmit. The prior submit already applied; check the receipt path and verify world state. |

### Pre-apply / commit errors

| Code | Meaning | Response |
|---|---|---|
| `index_stale` (submit-time) | Engine detected the world index has diverged from on-disk content (typically a prior direct-`Edit` to hybrid-file frontmatter without index sync, or a prior `_source/` modification outside the engine path). `detail.divergent_files[].file_path` names the divergent files. | Run `node tools/world-index/dist/src/cli.js sync <world-slug>`; resubmit with the same approval token if it has not expired. |
| `validator_failed` | A pre-apply validator (yaml_parse_integrity, id_uniqueness, cross_file_reference, record_schema_compliance, touched_by_cf_completeness, rule1-rule7-rule11-rule12, storylet_predicate_dsl_parsability) returned a failing verdict. `detail.verdicts[].location.file` names the offending file. Common bootstrap cases: `record_schema_compliance` (a story-bundle record missing its required `id` or `story_id` field, or with a mistyped value); `cross_file_reference` (a record references a story-local id that doesn't exist in this envelope or any prior committed envelope); `rule1_no_floating_facts` (an SF missing `epistemic_class`); `rule5_no_consequence_evasion` (an OBL missing `salience` / `urgency` / `possible_payoff_modes`); `rule7_mystery_reserve_preservation` (a storylet's `mystery_safety` resolves a forbidden-status M); `storylet_predicate_dsl_parsability` (a storylet's `hard_preconds` / `soft_preconds` use predicates not in the DSL grammar). | If the cited file is one of the records this plan is creating (per `expected_id_allocations`), the violation is in this skill's output — fix and resubmit. **If the cited file is unrelated existing world state, pause and escalate to the user — this skill must not silently modify other canon-adjacent files.** |

After any user-authorized direct-`Edit` to a hybrid-file frontmatter under `worlds/<slug>/characters/`, `diegetic-artifacts/`, or `adjudications/` (the surfaces under `record_schema_compliance` validator scope), run `node tools/world-index/dist/src/cli.js sync <world-slug>` before resubmitting — the validator runs against the indexed world state, not against on-disk content. INDEX.md edits do not require sync (not under validator scope).

### Retrieval-time errors

| Code | Meaning | Response |
|---|---|---|
| `freshness_audit.pre_call_index_was_stale: true` (retrieval-time) | Retrieval detected a stale explicit world index, ran `world-index sync` in-process, retried once, and recovered transparently. `freshness_audit.drifted_files_synced[]` names the stale paths that triggered the sync. | Record the audit field if it matters for diagnostics; continue the retrieval flow. No manual retry is required. |
| `stale_index` (retrieval-time persistent) | Returned by `mcp__worldloom__get_context_packet`, `get_record`, `find_named_entities`, and other retrieval tools only when auto-sync cannot run or one retry still leaves the world stale. The error's `details.drifted_files[]` names the stale paths. | Treat as a diagnostic blocker: inspect the paths, run `node tools/world-index/dist/src/cli.js sync <world-slug>` manually if appropriate, and retry only after the underlying index issue is understood. |

---

## 7. Recommended construction — programmatic, not raw JSON

For bootstrap envelopes (typically 75+ ops with multi-paragraph string fields in STENT `notes`, SF `notes`, SLT `notes`, and verbose CHC `choice_contract` blocks), prefer programmatic construction over hand-writing JSON via the Write tool:

```javascript
const fs = require("fs");

const WORLD = "<world-slug>";
const STORY_ID = "STORY-NNNN";
const STORY_SLUG = "<story-slug>";

function op(kind, subdir, recId, record) {
  return {
    op: kind,
    target_world: WORLD,
    target_file: `worlds/${WORLD}/stories/${STORY_SLUG}/_source/${subdir}/${recId}.yaml`,
    target_record_id: recId,
    failure_mode: "strict",
    payload: { story_slug: STORY_SLUG, record },
  };
}

const patches = [];

patches.push(op("create_stent_record", "entities", "STENT-0001", {
  id: "STENT-0001",
  story_id: STORY_ID,
  // ...
}));

// ... build all 75+ ops via the same helper ...

const envelope = {
  plan_id: `${STORY_ID}-bootstrap-${STORY_SLUG}`,
  target_world: WORLD,
  approval_token: "placeholder",
  verdict: "bootstrap_accept",
  originating_skill: "branching-story-bootstrap",
  expected_id_allocations: { /* per §3 */ },
  patches,
};

fs.writeFileSync(`/tmp/${envelope.plan_id}.json`, JSON.stringify(envelope, null, 2));
```

The structured form catches op-payload shape errors at language level (typo in a key name, missing brace) rather than at JSON-parse time, where the validator's error message points at the parser's recovery position rather than the actual mistake. For envelopes with many string fields containing escape characters, em-dashes, or quotes, programmatic construction is materially more reliable than hand-edited JSON.

---

## 8. Worked example: minimal bootstrap submit sequence

```bash
# 1. Build the envelope JSON via the Phase 11 builder script (per §7)
python3 /tmp/build-bootstrap-plan.py
# → /tmp/STORY-NNNN-bootstrap-<story-slug>.json

# 2. Validate (recommended; catches schema errors before commit)
node tools/world-mcp/dist/src/cli/validate-patch-plan.js \
  /tmp/STORY-NNNN-bootstrap-<story-slug>.json

# 3. Sign the approval token (binds to the current envelope bytes)
node tools/world-mcp/dist/src/cli/sign-approval-token.js \
  /tmp/STORY-NNNN-bootstrap-<story-slug>.json \
  > /tmp/STORY-NNNN-bootstrap-<story-slug>.token

# 4. Submit via CLI (default for bootstrap envelopes; bypasses MCP transport limits)
node tools/world-mcp/dist/src/cli/submit-patch-plan.js \
  /tmp/STORY-NNNN-bootstrap-<story-slug>.json \
  /tmp/STORY-NNNN-bootstrap-<story-slug>.token
```

The CLI submit returns the same `PatchReceipt` object as `mcp__worldloom__submit_patch_plan`: `applied_at`, `files_written[]`, `new_nodes[]`, `id_allocations_consumed`, `index_sync_duration_ms`, and `validators_run[]`. Verify the receipt before proceeding to the post-engine markdown writes (STORY_KERNEL.md, pages-prose-plans/PG-0001.md, INDEX.md, stories/INDEX.md per Phase 11 steps 4-6).
