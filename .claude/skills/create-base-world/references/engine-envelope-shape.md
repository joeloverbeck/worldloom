# Patch Engine Envelope Shape — Reference

Reference for `create-base-world` Phase 11 patch-plan assembly and submission. Covers the JSON envelope shape the patch engine accepts, the per-op payload convention, the `expected_id_allocations` format, the `approval_token` placeholder convention, submit-path selection by envelope size, and common failure-mode response codes.

The canonical schema source-of-truth is the deployed `mcp__worldloom__describe_envelope_schema(op_kind?)` introspection tool, backed by `tools/world-mcp/src/tools/_shared.ts` (`PatchOperationEnvelope` and `PatchPlanEnvelope` interfaces), `tools/patch-engine/src/envelope/schema.ts` (operation payload types), and validator JSON schemas for authored records. This file documents the operationally-relevant subset and the discovered workarounds.

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
  "originating_cf_ids": ["CF-0001"],
  "originating_ch_id": "CH-0001",
  "expected_id_allocations": { ... },
  "patches": [ ... ]
}
```

Every field is required. `approval_token` is a placeholder string in the JSON (see §4); the real signed token is computed from the envelope bytes and passed alongside the envelope at submit time. `verdict: "APPROVED"` is the only legal value for a `create-base-world` genesis plan. `originating_skill` is `"create-base-world"` literally.

For machine-readable retrieval of the current deployed envelope shape, call `mcp__worldloom__describe_envelope_schema()`. This reference is a human-readable supplement.

---

## 2. Per-op payload shape

Each entry in `patches[]` is a `PatchOperationEnvelope` with this shape:

```json
{
  "op": "create_cf_record",
  "target_world": "<world-slug>",
  "target_file": "_source/canon/CF-0001.yaml",
  "payload": { "cf_record": { "id": "CF-0001", ... } }
}
```

Required fields: `op`, `target_world`, **`target_file`**, **`payload`**. The typed-record key (`cf_record`, `ch_record`, `inv_record`, etc.) lives **inside `payload`**, not at the op's top level. `target_file` is a relative path under `worlds/<world-slug>/`; the engine resolves it against `target_world`. No `expected_content_hash` (creates), no `expected_anchor_checksum` (atomic-record ops).

For machine-readable retrieval of a current per-op payload shape, call `mcp__worldloom__describe_envelope_schema({op_kind: "create_cf_record"})` or the relevant op kind before assembly.

### File-class → directory mapping for `target_file` paths

| Op kind | `target_file` |
|---|---|
| `create_cf_record` | `_source/canon/CF-NNNN.yaml` |
| `create_ch_record` | `_source/change-log/CH-NNNN.yaml` |
| `create_inv_record` | `_source/invariants/<ID>.yaml` (where `<ID>` is `ONT-N` / `CAU-N` / `DIS-N` / `SOC-N` / `AES-N`) |
| `create_m_record` | `_source/mystery-reserve/M-N.yaml` |
| `create_oq_record` | `_source/open-questions/OQ-NNNN.yaml` |
| `create_ent_record` | `_source/entities/ENT-NNNN.yaml` |
| `create_sec_record` (per file class) | `_source/geography/SEC-GEO-NNN.yaml` (GEOGRAPHY) · `_source/peoples-and-species/SEC-PAS-NNN.yaml` (PEOPLES_AND_SPECIES) · `_source/institutions/SEC-INS-NNN.yaml` (INSTITUTIONS) · `_source/economy-and-resources/SEC-ECR-NNN.yaml` (ECONOMY_AND_RESOURCES) · `_source/magic-or-tech-systems/SEC-MTS-NNN.yaml` (MAGIC_OR_TECH_SYSTEMS) · `_source/everyday-life/SEC-ELF-NNN.yaml` (EVERYDAY_LIFE) · `_source/timeline/SEC-TML-NNN.yaml` (TIMELINE) |

The directory portion is lowercase-kebab-case; the file class inside the SEC record is UPPER_SNAKE (e.g., `file_class: GEOGRAPHY` for files under `_source/geography/`).

---

## 3. `expected_id_allocations` per-class format

The engine's pre-apply check has **two layers** that both run on `expected_id_allocations`:

1. **Per-op check** (`tools/patch-engine/src/ops/shared.ts` `stageNewRecordFile`): every `create_*_record` op verifies its `record.id` appears in the corresponding allocation list via `.includes()`.
2. **Verifier check** (`tools/patch-engine/src/apply.ts` `verifyExpectedIdAllocations`): verifies that allocated IDs match the engine's next-id calculation for that class. Multi-prefix classes (`inv_ids`, `sec_ids`) are checked per prefix.

Most classes are consistent across both layers — `cf_ids` uses `CF-NNNN` (4-digit zero-padded), `ch_ids` uses `CH-NNNN`, `m_ids` uses `M-N`, `oq_ids` uses `OQ-NNNN`, `ent_ids` uses `ENT-NNNN`. These pass both layers when populated with their natural format.

`sec_ids` uses `SEC-<PREFIX>-NNN` (e.g., `SEC-GEO-001`); the verifier scans nodes per-prefix, so each SEC ID is checked against the next-id for that specific prefix. Lay them out in the order ops are emitted (`SEC-GEO-001`, `SEC-PAS-001`, `SEC-INS-001`, ...).

`inv_ids` uses category-prefix IDs directly (`ONT-N`, `CAU-N`, `DIS-N`, `SOC-N`, `AES-N`). After PATCHENG-001, the verifier scans per category prefix just like `sec_ids`; do not include any `INV-N` sentinel. For multiple new invariants under the same category, list them in monotonic order (`ONT-1`, `ONT-2`, ...).

### Full `expected_id_allocations` shape

```json
{
  "cf_ids": ["CF-0001"],
  "ch_ids": ["CH-0001"],
  "inv_ids": ["ONT-1", "ONT-2", "CAU-1", "CAU-2", "DIS-1", "DIS-2", "SOC-1", "SOC-2", "AES-1", "AES-2"],
  "m_ids": ["M-1", "M-2", "M-3"],
  "oq_ids": ["OQ-0001", "OQ-0002", "OQ-0003", "OQ-0004", "OQ-0005", "OQ-0006", "OQ-0007"],
  "ent_ids": ["ENT-0001", "ENT-0002", ...],
  "sec_ids": ["SEC-GEO-001", "SEC-PAS-001", "SEC-INS-001", "SEC-ECR-001", "SEC-MTS-001", "SEC-ELF-001", "SEC-TML-001"]
}
```

---

## 4. `approval_token` placeholder convention

The envelope JSON itself carries an `approval_token` field, but its value at envelope-construction time is a **placeholder string** (e.g., `"placeholder"`). The real signed approval token is computed from the envelope bytes by the `sign-approval-token` CLI and passed alongside the envelope at submit time:

```bash
node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/<plan-id>.json > /tmp/<plan-id>.token
node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/<plan-id>.json /tmp/<plan-id>.token
```

Or via MCP:

```
mcp__worldloom__submit_patch_plan(envelope, approval_token)
```

The envelope-shape validator requires `approval_token` to be a non-empty string, so omitting the field fails with `invalid_input: patch_plan.approval_token must be a non-empty string`. The placeholder satisfies this requirement; the real token is verified server-side at submit time against the envelope bytes (HMAC binding, single-use, expiry-bound — see `docs/HARD-GATE-DISCIPLINE.md` §Approval token discipline).

---

## 5. Submit-path selection by envelope size

| Envelope size | Submit path |
|---|---|
| ≤ 50KB | MCP path: `mcp__worldloom__submit_patch_plan(envelope, approval_token)` |
| > 50KB (typical genesis) | CLI path: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` |

Both paths route through the same `submitPatchPlan` engine code (`tools/patch-engine/src/apply.ts`) and produce the same `PatchReceipt`. The CLI exists to bypass MCP transport size constraints for large envelopes; the genesis envelope for `create-base-world` typically lands at 80-100KB (42 ops with full prose bodies), so the CLI path is the default. See `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan: MCP path (default) and CLI path (size-constrained bypass) for the canonical write-up.

When using the CLI path, persist the envelope JSON to `/tmp/<plan-id>.json` and the signed token to `/tmp/<plan-id>.token` (single line, base64) before invoking the CLI.

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
| `index_stale` | Engine detected the world index has diverged from on-disk content (typically a prior direct-`Edit` to hybrid-file frontmatter without index sync). `detail.divergent_files[].file_path` names the divergent files. | Run `node tools/world-index/dist/src/cli.js sync <world-slug>`; resubmit with the same approval token if it has not expired. |
| `validator_failed` | A pre-apply validator (Rule 1-7 + structural) returned a failing verdict. `detail.verdicts[].location.file` names the offending file. | If the cited file is one of the genesis records this plan is creating (per `expected_id_allocations`), the schema violation is in this skill's output — fix and resubmit. **If the cited file is unrelated existing world state, pause and escalate to the user — this skill must not silently modify other canon-adjacent files.** |

After any user-authorized direct-`Edit` to a hybrid-file frontmatter under `worlds/<slug>/characters/`, `diegetic-artifacts/`, or `adjudications/` (the surfaces under `record_schema_compliance` validator scope), run `node tools/world-index/dist/src/cli.js sync <world-slug>` before resubmitting — the validator runs against the indexed world state, not against on-disk content. INDEX.md edits do not require sync (not under validator scope).

---

## 7. Worked example: minimal genesis op

A complete `create_cf_record` op for CF-0001:

```json
{
  "op": "create_cf_record",
  "target_world": "<world-slug>",
  "target_file": "_source/canon/CF-0001.yaml",
  "payload": {
    "cf_record": {
      "id": "CF-0001",
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
