# Patch Engine Envelope Shape — Reference

Reference for `create-base-world` Phase 11 patch-plan assembly and submission. Covers the JSON envelope shape the patch engine accepts, the per-op payload convention, the `expected_id_allocations` format, the `approval_token` placeholder convention, submit-path selection by envelope size, and common failure-mode response codes.

Query `mcp__worldloom__describe_envelope_schema(op_kind?)` for the deployed envelope schema and per-op payload wrappers before assembling or debugging a genesis patch plan. The canonical schema source-of-truth remains `tools/world-mcp/src/tools/_shared.ts` (`PatchOperationEnvelope` and `PatchPlanEnvelope` interfaces), `tools/patch-engine/src/envelope/schema.ts` (operation payload types), and validator JSON schemas for authored records under `tools/validators/src/schemas/`.

A third valid pattern is schema-by-example: direct `Read` of a representative existing record under another world's `worlds/<world-slug>/_source/<class>/<ID>.yaml`. Use this when genesis envelope construction needs both the structural shape and realistic field population in one lightweight read, especially for soft-required-by-discipline fields that the JSON schemas do not require. This pattern is usually unavailable inside the new target world because genesis creates the first records of each class; when no representative same-class record exists, use live MCP schema retrieval or the offline schema-file fallback instead.

This file documents the operationally-relevant subset and the discovered workarounds.

---

## 1. Envelope skeleton

Every patch plan submitted to `mcp__worldloom__submit_patch_plan` (or its CLI equivalent) MUST be a JSON object with the following top-level fields:

```json
{
  "plan_id": "PLAN-CBW-<world-slug>-0001",
  "target_world": "<world-slug>",
  "approval_token": "placeholder",
  "verdict": "APPROVED",
  "originating_skill": "create-base-world",
  "originating_cf_ids": ["CF-1"],
  "originating_ch_id": "CH-1",
  "expected_id_allocations": { ... },
  "patches": [ ... ]
}
```

Every field is required. `approval_token` is a placeholder string in the JSON (see §4); the real signed token is computed from the envelope bytes and passed alongside the envelope at submit time. `verdict: "APPROVED"` is the only legal value for a `create-base-world` genesis plan. `originating_skill` is `"create-base-world"` literally.

Use `mcp__worldloom__describe_envelope_schema()` as the operational introspection path for the envelope shape; the engine source files cited above remain the canonical authority.

---

## 2. Per-op payload shape

Each entry in `patches[]` is a `PatchOperationEnvelope` with this shape:

```json
{
  "op": "create_cf_record",
  "target_world": "<world-slug>",
  "target_file": "_source/canon/CF-1.yaml",
  "payload": { "cf_record": { "id": "CF-1", ... } }
}
```

Required fields: `op`, `target_world`, **`target_file`**, **`payload`**. The typed-record key (`cf_record`, `ch_record`, `inv_record`, etc.) lives **inside `payload`**, not at the op's top level. `target_file` is a relative path under `worlds/<world-slug>/`; the engine resolves it against `target_world`. No `expected_content_hash` (creates), no `expected_anchor_checksum` (atomic-record ops).

For a focused per-op view, call `mcp__worldloom__describe_envelope_schema({op_kind: "create_cf_record"})`. The per-op payload types live in `tools/patch-engine/src/envelope/schema.ts` and the per-record JSON schemas under `tools/validators/src/schemas/`.

### File-class → directory mapping for `target_file` paths

| Op kind | `target_file` |
|---|---|
| `create_cf_record` | `_source/canon/CF-<integer>.yaml` |
| `create_ch_record` | `_source/change-log/CH-<integer>.yaml` |
| `create_inv_record` | `_source/invariants/<ID>.yaml` (where `<ID>` is `ONT-N` / `CAU-N` / `DIS-N` / `SOC-N` / `AES-N`) |
| `create_m_record` | `_source/mystery-reserve/M-<integer>.yaml` |
| `create_oq_record` | `_source/open-questions/OQ-<integer>.yaml` |
| `create_ent_record` | `_source/entities/ENT-<integer>.yaml` |
| `create_sec_record` (per file class) | `_source/geography/SEC-GEO-<integer>.yaml` (GEOGRAPHY) · `_source/peoples-and-species/SEC-PAS-<integer>.yaml` (PEOPLES_AND_SPECIES) · `_source/institutions/SEC-INS-<integer>.yaml` (INSTITUTIONS) · `_source/economy-and-resources/SEC-ECR-<integer>.yaml` (ECONOMY_AND_RESOURCES) · `_source/magic-or-tech-systems/SEC-MTS-<integer>.yaml` (MAGIC_OR_TECH_SYSTEMS) · `_source/everyday-life/SEC-ELF-<integer>.yaml` (EVERYDAY_LIFE) · `_source/timeline/SEC-TML-<integer>.yaml` (TIMELINE) |

The directory portion is lowercase-kebab-case; the file class inside the SEC record is UPPER_SNAKE (e.g., `file_class: GEOGRAPHY` for files under `_source/geography/`).

---

## 3. `expected_id_allocations` per-class format

The engine's pre-apply check has **two layers** that both run on `expected_id_allocations`:

1. **Per-op check** (`tools/patch-engine/src/ops/shared.ts` `stageNewRecordFile`): every `create_*_record` op verifies its `record.id` appears in the corresponding allocation list via `.includes()`.
2. **Verifier check** (`tools/patch-engine/src/apply.ts` `verifyExpectedIdAllocations`): verifies that allocated IDs match the engine's next-id calculation for that class. Multi-prefix classes (`inv_ids`, `sec_ids`) are checked per prefix.

Most classes are consistent across both layers — `cf_ids` uses `CF-<integer>` (unpadded natural-integer), `ch_ids` uses `CH-<integer>`, `m_ids` uses `M-<integer>`, `oq_ids` uses `OQ-<integer>`, `ent_ids` uses `ENT-<integer>`. These pass both layers when populated with their natural format.

`sec_ids` uses `SEC-<PREFIX>-<integer>` (e.g., `SEC-GEO-1`); the verifier scans nodes per-prefix, so each SEC ID is checked against the next-id for that specific prefix. Lay them out in the order ops are emitted (`SEC-GEO-1`, `SEC-PAS-1`, `SEC-INS-1`, ...).

`inv_ids` uses category-prefix IDs directly (`ONT-N`, `CAU-N`, `DIS-N`, `SOC-N`, `AES-N`). The verifier scans per category prefix just like `sec_ids`; do not include any `INV-N` sentinel. For multiple new invariants under the same category, list them in monotonic order (`ONT-1`, `ONT-2`, ...).

### Full `expected_id_allocations` shape

```json
{
  "cf_ids": ["CF-1"],
  "ch_ids": ["CH-1"],
  "inv_ids": ["ONT-1", "ONT-2", "CAU-1", "CAU-2", "DIS-1", "DIS-2", "SOC-1", "SOC-2", "AES-1", "AES-2"],
  "m_ids": ["M-1", "M-2", "M-3"],
  "oq_ids": ["OQ-1", "OQ-2", "OQ-3", "OQ-4", "OQ-5", "OQ-6", "OQ-7"],
  "ent_ids": ["ENT-1", "ENT-2", ...],
  "sec_ids": ["SEC-GEO-1", "SEC-PAS-1", "SEC-INS-1", "SEC-ECR-1", "SEC-MTS-1", "SEC-ELF-1", "SEC-TML-1"]
}
```

---

## 4. `approval_token` placeholder convention

The envelope JSON itself carries an `approval_token` field, but its value at envelope-construction time is a **placeholder string** (e.g., `"placeholder"`). The real signed approval token is computed from the envelope bytes by the `sign-approval-token` CLI and passed alongside the envelope at submit time:

```bash
node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/<plan-id>.json
node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/<plan-id>.json > /tmp/<plan-id>.token
node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/<plan-id>.json /tmp/<plan-id>.token > /tmp/<plan-id>.receipt.json
```

Or via MCP:

```
mcp__worldloom__submit_patch_plan(envelope, approval_token)
```

The envelope-shape validator requires `approval_token` to be a non-empty string, so omitting the field fails with `invalid_input: patch_plan.approval_token must be a non-empty string`. The placeholder satisfies this requirement; the real token is verified server-side at submit time against the envelope bytes (HMAC binding, single-use, expiry-bound — see `docs/HARD-GATE-DISCIPLINE.md` §Approval token discipline).

---

## 5. Validate/submit path selection by envelope size

| Envelope size | Validate path | Submit path |
|---|---|---|
| ≤ 50KB | MCP path: `mcp__worldloom__validate_patch_plan(envelope)` | MCP path: `mcp__worldloom__submit_patch_plan(envelope, approval_token)` |
| > 50KB (typical genesis) | CLI path: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` | CLI path: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` |

Both validate paths route through the same `validate_patch_plan` handler and return the same `pass` / `fail` / `skipped` status object. Both submit paths route through the same `submitPatchPlan` engine code (`tools/patch-engine/src/apply.ts`) and produce the same `PatchReceipt`. The CLIs exist to bypass MCP transport size constraints for large envelopes; the genesis envelope for `create-base-world` typically lands at 80-100KB (42 ops with full prose bodies), so the CLI paths are the default for genesis validation and submit. See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan: MCP path (default) and CLI path (size-constrained bypass) for the canonical write-up.

When using the submit CLI path, persist the envelope JSON to `/tmp/<plan-id>.json` and the signed token to `/tmp/<plan-id>.token` (single line, base64) before invoking the CLI. The validate CLI requires only the envelope JSON.

Invoke both patch-plan CLIs from the project root or active git worktree root (the directory containing `worlds/`, `tools/`, and `docs/`). The CLI/engine path resolves world state from `process.cwd()` and opens the index at `worlds/<slug>/_index/world.db` via `tools/world-index/src/index/open.ts` `indexDirectoryForWorld`; running from another cwd can surface as `Index missing for world '<slug>'` even when the index exists under the repo root.

---

## 6. Common failure-mode response codes

The patch engine surfaces these failure modes; map each to the appropriate skill response:

### Pre-validation envelope-shape errors

| Code | Meaning | Response |
|---|---|---|
| `invalid_input` | Envelope or op field missing / malformed (e.g., empty `approval_token`, missing `target_file`, missing `payload`). The error's `details.field` names the offending path. | Fix the envelope; resubmit. The signed approval token does NOT need to be re-signed if the envelope content does not change — but if the envelope IS changed, re-sign. |
| `envelope_shape_invalid` | Same family as `invalid_input`; structural shape rejected before per-op validation. | Same as `invalid_input`. |
| `target_file_missing` / `target_file_outside_world` | Op's `target_file` is empty or escapes the world root. | Fix the op's `target_file` path; resubmit. |
| `op_target_class_mismatch` | Typed payload key (e.g., `cf_record`) doesn't match `op` kind (e.g., `create_inv_record`). | Fix the op's payload key to match the op kind; resubmit. |
| `record_already_exists` | A `create_*_record` op's record-id already exists on disk. | Abort and investigate — the world is not actually empty, or the IDs are stale. Do not blindly re-allocate. |
| `id_allocation_race` | Verifier sees an allocation that does not match the engine's next-id calculation for that class or per-prefix class. Either another plan landed concurrently or the allocation list is malformed (for example, `inv_ids` contains an `INV-N` sentinel or skips the next category-prefix ID). | Re-allocate IDs against current world state and rebuild the envelope; or fix the malformed list per §3. |
| `missing_expected_id_allocation` | Per-op check found a `record.id` not listed in the corresponding allocation array. | Add the missing ID to the allocation list; resubmit. |

### Approval-token errors

| Code | Meaning | Response |
|---|---|---|
| `approval_expired` | Token is past its expiry window (default 20 minutes). | Re-sign the unchanged envelope; resubmit immediately. |
| `approval_replayed` | Token already consumed by a prior successful submit (single-use enforcement). | Do NOT resubmit. The prior submit already applied; check the receipt path. |

### Pre-apply / commit errors

| Code | Meaning | Response |
|---|---|---|
| `index_stale` (submit-time) | Engine detected the world index has diverged from on-disk content (typically a prior direct-`Edit` to hybrid-file frontmatter without index sync). `detail.divergent_files[].file_path` names the divergent files. | Run `node tools/world-index/dist/src/cli.js sync <world-slug>`; resubmit with the same approval token if it has not expired. |
| `freshness_audit.pre_call_index_version_was_old: true` (retrieval-time) | Retrieval detected an explicit-world index schema-version mismatch, ran `world-index build` in-process, retried once, and recovered transparently. `freshness_audit.index_version_rebuilt_from` / `index_version_rebuilt_to` name the schema-version transition. | Record the audit field if it matters for diagnostics; continue the retrieval flow. No manual retry is required. If `pre_call_index_was_stale` is also true, the rebuilt index was then synced before the successful retry. |
| `freshness_audit.pre_call_index_was_stale: true` (retrieval-time) | Retrieval detected a stale explicit world index, ran `world-index sync` in-process, retried once, and recovered transparently. `freshness_audit.drifted_files_synced[]` names the stale paths that triggered the sync. | Record the audit field if it matters for diagnostics; continue the retrieval flow. No manual retry is required. |
| `index_version_mismatch` (retrieval-time persistent) | Returned by `mcp__worldloom__get_context_packet`, `get_record`, `find_named_entities`, and other index-backed tools only when auto-build cannot run or one retry still leaves the world on an incompatible schema version. `details.expected` / `details.actual` name the versions, and `details.recovery_attempted: "build"` / `details.recovery_outcome` may describe the failed recovery. | Treat as a diagnostic blocker: inspect the recovery outcome, run `node tools/world-index/dist/src/cli.js build <world-slug>` manually if appropriate, and retry only after the underlying index issue is understood. |
| `stale_index` (retrieval-time persistent) | Returned by `mcp__worldloom__get_context_packet`, `get_record`, `find_named_entities`, and other retrieval tools only when auto-sync cannot run or one retry still leaves the world stale. `details.drifted_files[]` (or `divergent_files[]`) names the stale paths, and `details.recovery_attempted` / `details.recovery_outcome` may describe the failed recovery. | Treat as a diagnostic blocker: inspect the paths, run `node tools/world-index/dist/src/cli.js sync <world-slug>` manually if appropriate, and retry only after the underlying index issue is understood. Submit-time `index_stale` remains governed by the row above. |
| `validator_failed` | A pre-apply validator (Rule 1-7 + structural) returned a failing verdict. `detail.verdicts[].location.file` names the offending file. | If the cited file is one of the genesis records this plan is creating (per `expected_id_allocations`), the schema violation is in this skill's output — fix and resubmit. **If the cited file is unrelated existing world state, pause and escalate to the user — this skill must not silently modify other canon-adjacent files.** |
| `Index missing for world '<slug>'` | The validate/submit CLI was likely invoked from the wrong cwd. The CLI/engine path derives `worldRoot` from `process.cwd()` before opening `worlds/<slug>/_index/world.db`. | Re-invoke from the project root or active git worktree root. If it still fails from that cwd, rebuild or inspect the world index. |

After any user-authorized direct-`Edit` to a hybrid-file frontmatter under `worlds/<slug>/characters/`, `diegetic-artifacts/`, or `adjudications/` (the surfaces under `record_schema_compliance` validator scope), run `node tools/world-index/dist/src/cli.js sync <world-slug>` before resubmitting — the validator runs against the indexed world state, not against on-disk content. INDEX.md edits do not require sync (not under validator scope).

---

## 7. Worked example: minimal genesis op

A complete `create_cf_record` op for CF-1:

```json
{
  "op": "create_cf_record",
  "target_world": "<world-slug>",
  "target_file": "_source/canon/CF-1.yaml",
  "payload": {
    "cf_record": {
      "id": "CF-1",
      "title": "...",
      "status": "hard_canon",
      "type": "metaphysical_rule",
      "statement": "...",
      "scope": { "geographic": "global", "temporal": "current", "social": "public" },
      "truth_scope": { "world_level": true, "diegetic_status": "objective" },
      "domains_affected": ["..."],
      "prerequisites": ["..."],
      "distribution": { "who_can_do_it": ["..."], "who_cannot_easily_do_it": ["..."], "why_not_universal": ["..."] },
      "costs_and_limits": ["..."],
      "visible_consequences": ["..."],
      "required_world_updates": ["GEOGRAPHY", "PEOPLES_AND_SPECIES", "INSTITUTIONS", "ECONOMY_AND_RESOURCES", "MAGIC_OR_TECH_SYSTEMS", "EVERYDAY_LIFE", "TIMELINE"],
      "source_basis": { "direct_user_approval": true, "derived_from": [] },
      "contradiction_risk": { "hard": false, "soft": true },
      "notes": "...",
      "epistemic_profile": { "n_a": "<rationale tied to fact-type keyword>" },
      "exception_governance": { "n_a": "<rationale tied to fact-type keyword>" },
      "modification_history": []
    }
  }
}
```

The other op kinds (`create_ch_record`, `create_inv_record`, etc.) follow the same outer shape (`op` / `target_world` / `target_file` / `payload`); the inner record schema differs per type (see `templates/canon-fact-record.yaml`, `templates/change-log-entry.yaml`, and the engine-owned schemas section of `SKILL.md`).
