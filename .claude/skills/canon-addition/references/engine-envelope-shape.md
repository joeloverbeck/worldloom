# Patch Engine Envelope Shape — Reference

Reference for `canon-addition` Phase 13a patch-plan assembly and Phase 15a submission. Covers the JSON envelope shape the patch engine accepts, the per-op payload convention for the canon-addition op mix, the `expected_id_allocations` format, the `approval_token` placeholder convention, the `required_world_updates` SEC-only restriction, the bidirectional pointer's op-level vs final-state semantics, submit-path selection by envelope size, and common failure-mode response codes (including retrieval freshness diagnostics).

Query `mcp__worldloom__describe_envelope_schema(op_kind?)` for the deployed envelope schema and per-op payload wrappers before assembling or debugging a patch plan. Prefer passing `op_kind` when the phase needs one operation wrapper. If an unfiltered response returns `delivery_status: "persisted_with_summary"`, use `summary.available_op_kinds` to narrow the next call or recover a persisted schema slice with `mcp__worldloom__get_persisted_packet_slice(persisted_path, "op_schemas.<op_kind>")`. The canonical schema source-of-truth remains `tools/patch-engine/src/envelope/schema.ts` (operation payload types) and the JSON schemas under `tools/validators/src/schemas/` (authored-record schemas: `canon-fact-record.schema.json`, `change-log-entry.schema.json`, `mystery-reserve.schema.json`, `open-question.schema.json`, `invariant.schema.json`, `section.schema.json`, `adjudication-frontmatter.schema.json`, `_shared/extension-entry.schema.json`).

A third valid pattern is schema-by-example: direct `Read` of a representative existing record under `worlds/<world-slug>/_source/<class>/<ID>.yaml` or an indexed hybrid record that the plan will mirror. Use this when envelope construction needs both the structural shape and realistic field population in one lightweight read, especially for soft-required-by-discipline fields that the JSON schemas do not require. This requires an existing representative record of the target class; if the world has no such record yet, use live MCP schema retrieval or the offline schema-file fallback instead.

This file documents the operationally-relevant subset and the discovered workarounds. The parallel reference for the genesis-world skill is `.claude/skills/create-base-world/references/engine-envelope-shape.md`; canon-addition's op mix and verdict enum differ, so the per-op shapes documented below take precedence here.

---

## 1. Envelope skeleton

Every patch plan submitted to `mcp__worldloom__submit_patch_plan` (or its CLI equivalent) MUST be a JSON object with the following top-level fields:

```json
{
  "plan_id": "pa-NNNN-<slug>",
  "target_world": "<world-slug>",
  "approval_token": "placeholder",
  "verdict": "ACCEPT_AS_LOCAL_EXCEPTION",
  "originating_skill": "canon-addition",
  "originating_cf_ids": ["CF-<integer>"],
  "originating_ch_id": "CH-<integer>",
  "originating_pa_id": "PA-<integer>",
  "expected_id_allocations": { ... },
  "patches": [ ... ]
}
```

Every field is required. `approval_token` is a placeholder string in the JSON (see §4); the real signed token is computed from the envelope bytes and passed alongside the envelope at submit time. `verdict` is one of the canonical verdict-enum values (`ACCEPT` / `ACCEPT_WITH_REQUIRED_UPDATES` / `ACCEPT_AS_LOCAL_EXCEPTION` / `ACCEPT_AS_CONTESTED_BELIEF` / `REVISE_AND_RESUBMIT` / `REJECT`); query the live enum via `mcp__worldloom__get_canonical_vocabulary({class: 'verdict'})`. `originating_skill` is `"canon-addition"` literally. `originating_cf_ids` is empty for non-accept and clarificatory-retcon (`retcon_type: A`) plans that emit no `create_cf_record`.

---

## 2. Per-op payload shape

Each entry in `patches[]` is a `PatchOperationEnvelope` with this shape:

```json
{
  "op": "create_cf_record",
  "target_world": "<world-slug>",
  "target_file": "_source/canon/CF-<integer>.yaml",
  "payload": { "cf_record": { "id": "CF-<integer>", ... } }
}
```

Required fields on every op: `op`, `target_world`, **`target_file`**, **`payload`**. The typed-record key (`cf_record`, `ch_record`, `m_record`, `oq_record`, `extension`, `target_sec_id` + `cf_id`, etc.) lives **inside `payload`**, not at the op's top level.

### `target_file` is required on every op despite being typed optional

The TypeScript interface in `tools/patch-engine/src/envelope/schema.ts` declares `target_file?: string` (optional). The shape validator in `tools/world-mcp/src/tools/_shared.ts:375-380` (`validatePatchPlanEnvelopeShape`) rejects any patch op whose `target_file` is missing or empty with `invalid_input: patch_plan.patches[N].target_file must be a non-empty string`. Operators reading the typed interface alone will reasonably omit `target_file` and hit this failure mode at validation time. **Always populate `target_file` on every op.**

### `target_file` semantics differ by op kind

Two distinct semantics apply, neither obvious from the typed interface:

- **Hybrid-file ops** (`append_adjudication_record`, `append_character_record`, `append_diegetic_artifact_record`) — `target_file` is the actual write path the engine will create. It must be **world-relative** (relative to `worlds/<world-slug>/`, NOT workspace-relative) and must start with the expected directory prefix. The engine's `resolveHybridFilePath` in `tools/patch-engine/src/ops/types.ts:35-68` enforces this: a workspace-relative path like `worlds/erotica-world/adjudications/PA-1-<slug>.md` fails with `target_file_outside_world: "<path> must resolve under adjudications/"`.
- **Atomic-record ops** (all `create_*_record`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`, `update_record_field`) — `target_file` is shape-validation-only. The engine derives the actual write path from the record's id (per `tools/patch-engine/src/ops/create-cf-record.ts`, `create-ch-record.ts`, and siblings — they construct paths like `path.join(ctx.worldRoot, "worlds", env.target_world, "_source", "canon", "${record.change_id}.yaml")`). The shape validator still requires a non-empty string; the canonical convention is `_source/<subdir>/<ID>.yaml` so atomic-record `target_file` values match the file-class-to-directory mapping below.

### File-class → directory mapping for `target_file` paths

| Op kind | `target_file` |
|---|---|
| `create_cf_record` | `_source/canon/CF-<integer>.yaml` |
| `create_ch_record` | `_source/change-log/CH-<integer>.yaml` |
| `create_m_record` | `_source/mystery-reserve/M-<integer>.yaml` |
| `create_oq_record` | `_source/open-questions/OQ-<integer>.yaml` |
| `create_inv_record` | `_source/invariants/<ID>.yaml` (where `<ID>` is `ONT-N` / `CAU-N` / `DIS-N` / `SOC-N` / `AES-N`) — rare in canon-addition; mostly used by `create-base-world` |
| `create_ent_record` | `_source/entities/ENT-<integer>.yaml` — rare in canon-addition |
| `create_sec_record` | per file class: `_source/peoples-and-species/SEC-PAS-<integer>.yaml` (PEOPLES_AND_SPECIES) · `_source/everyday-life/SEC-ELF-<integer>.yaml` (EVERYDAY_LIFE) · `_source/institutions/SEC-INS-<integer>.yaml` (INSTITUTIONS) · `_source/economy-and-resources/SEC-ECR-<integer>.yaml` (ECONOMY_AND_RESOURCES) · `_source/magic-or-tech-systems/SEC-MTS-<integer>.yaml` (MAGIC_OR_TECH_SYSTEMS) · `_source/geography/SEC-GEO-<integer>.yaml` (GEOGRAPHY) · `_source/timeline/SEC-TML-<integer>.yaml` (TIMELINE) — rare in canon-addition; mostly `append_extension` / `append_touched_by_cf` against existing SEC records |
| `append_extension` | the existing record's path (atomic record's `_source/<subdir>/<ID>.yaml`) |
| `append_touched_by_cf` | the existing SEC's path (`_source/<subdir>/SEC-<PREFIX>-<integer>.yaml`) |
| `append_modification_history_entry` | the target CF's path (`_source/canon/CF-<integer>.yaml`) |
| `update_record_field` | the target record's path |
| `append_adjudication_record` | `adjudications/PA-<integer>-<slug>.md` (world-relative, must start with `adjudications/`) |
| `append_character_record` | `characters/<char-slug>.md` (world-relative, must start with `characters/`) |
| `append_diegetic_artifact_record` | `diegetic-artifacts/<da-slug>.md` (world-relative, must start with `diegetic-artifacts/`) |

The directory portion is lowercase-kebab-case; the file class inside the SEC record is UPPER_SNAKE (e.g., `file_class: PEOPLES_AND_SPECIES` for files under `_source/peoples-and-species/`).

### Retrieval-time `record_kind` discriminator is accepted but not written

MCP retrieval tools inject `record_kind` into parsed-record responses for consumer-side discrimination (for example, `record_kind: "canon_fact"` on retrieved CF records, `record_kind: "change_log"` on CH records, and corresponding values for invariant, mystery reserve, open question, named entity, and section records). On-disk records under `_source/<subdir>/*.yaml` do NOT carry this field, and the patch engine does NOT add it at write time. The authored-record JSON schemas under `tools/validators/src/schemas/` accept `record_kind` as an optional const-validated discriminator so payloads copied from retrieval responses validate when the discriminator matches the record class. The engine still writes exactly the record body supplied by the op payload, so omit `record_kind` when constructing records from scratch and do not expect it to appear in YAML after submit. The §10 worked example omits the field; that omission is the preferred clean authored shape, not a validation requirement.

### CH-record `affected_fact_ids` is required for any plan modifying an existing CF

PATCHENG-003 unified the CH-record schema on `affected_fact_ids` as the single canonical CF-reference field. The retired `affected_cf_ids` alias is rejected by `tools/validators/src/schemas/change-log-entry.schema.json`.

For any plan that modifies an existing CF — `append_modification_history_entry`, `append_extension` against an existing CF, `update_record_field` on an existing CF, or any other op that touches a pre-existing `_source/canon/CF-<integer>.yaml` — the CH-record's `affected_fact_ids` array MUST list every modified CF id alongside any newly-created CF ids. This matches the field read by `rule6_no_silent_retcons`, the genesis CH-1 template in `create-base-world`, and the worked example at `examples/accept-with-required-updates.md`.

---

## 3. `expected_id_allocations` per-class format

The engine's pre-apply check has two layers that both run on `expected_id_allocations`:

1. **Per-op check** (`tools/patch-engine/src/ops/shared.ts` `stageNewRecordFile`): every `create_*_record` op verifies its `record.id` appears in the corresponding allocation list via `.includes()`.
2. **Verifier check** (`tools/patch-engine/src/apply.ts` `verifyExpectedIdAllocations`): verifies that allocated IDs match the engine's next-id calculation for that class. Multi-prefix classes (`inv_ids`, `sec_ids`) are checked per prefix.

For canon-addition's typical accept-branch envelope, the relevant classes are `cf_ids` (1 entry — the new CF), `ch_ids` (1 — the new CH), `pa_ids` (1 — the adjudication), and optionally `m_ids` / `oq_ids` if the run creates new mystery-reserve or open-question records. `cf_ids` uses `CF-<integer>` (unpadded natural-integer), `ch_ids` uses `CH-<integer>`, `pa_ids` uses `PA-<integer>`, `m_ids` uses `M-<integer>`, `oq_ids` uses `OQ-<integer>`.

### Typical canon-addition accept-branch shape

```json
{
  "cf_ids": ["CF-2"],
  "ch_ids": ["CH-2"],
  "pa_ids": ["PA-1"],
  "m_ids": ["M-4"],
  "oq_ids": ["OQ-8"]
}
```

For non-accept and clarificatory-retcon plans, omit `cf_ids` (no CF created); `ch_ids` and `pa_ids` are still populated for the audit-trail entries.

Allocate each ID via `mcp__worldloom__allocate_next_id(world_slug, id_class)` at pre-flight before envelope assembly; the next-id calculation is per-class (and per-prefix for `inv_ids` / `sec_ids` if those are touched).

---

## 4. `approval_token` placeholder convention

The envelope JSON itself carries an `approval_token` field, but its value at envelope-construction time is a **placeholder string** (e.g., `"placeholder"` or `"pending"`). The real signed approval token is computed from the envelope bytes by the `sign-approval-token` CLI and passed alongside the envelope at submit time:

```bash
node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/<plan-id>.json
node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/<plan-id>.json > /tmp/<plan-id>.token
node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/<plan-id>.json /tmp/<plan-id>.token
```

Or via MCP:

```
mcp__worldloom__submit_patch_plan(envelope, approval_token)
```

The envelope-shape validator requires `approval_token` to be a non-empty string, so omitting the field fails with `invalid_input: patch_plan.approval_token must be a non-empty string`. The placeholder satisfies this requirement; the real token is verified server-side at submit time against the envelope bytes (HMAC binding, single-use, expiry-bound default 20 minutes — see `docs/HARD-GATE-DISCIPLINE.md` §Approval token discipline). If the envelope content changes between validate and submit, re-sign the token; the unchanged-envelope-after-validate case requires no re-sign.

---

## 5. Validate / submit path selection by envelope size

| Envelope size | Validate path | Submit path |
|---|---|---|
| ≤ 50KB (small accept branches, all non-accept branches) | MCP path: `mcp__worldloom__validate_patch_plan(envelope)` | MCP path: `mcp__worldloom__submit_patch_plan(envelope, approval_token)` |
| > 50KB (typical accept branches with many section updates, modification-history appends, or the full PA `body_markdown` carrying verbatim critic reports) | CLI path: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` | CLI path: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` |

Both validate paths route through the same `validate_patch_plan` handler and return the same `pass` / `fail` / `skipped` status object. Pass/fail responses include `validators_run[]` entries (`validator_name`, `status`, `duration_ms`, optional `detail`); skipped responses use `validators_run: []` because no validator ran. Both submit paths route through the same `submitPatchPlan` engine code (`tools/patch-engine/src/apply.ts`) and produce the same `PatchReceipt`. The CLIs exist to bypass MCP transport size constraints for large envelopes; canon-addition accept-branch envelopes carrying a verbatim six-critic-report PA `body_markdown` typically land at 60-80KB, so the CLI paths are the default for accept-branch validation and submit. See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan: MCP path (default) and CLI path (size-constrained bypass) for the canonical write-up.

When using the submit CLI path, persist the envelope JSON to `/tmp/<plan-id>.json` and the signed token to `/tmp/<plan-id>.token` (single line, base64) before invoking the CLI. The validate CLI requires only the envelope JSON.

Invoke both patch-plan CLIs from the project root or active git worktree root (the directory containing `worlds/`, `tools/`, and `docs/`). The CLI/engine path resolves world state from `process.cwd()` and opens the index at `worlds/<slug>/_index/world.db` via `tools/world-index/src/index/open.ts` `indexDirectoryForWorld`; running from another cwd can surface as `Index missing for world '<slug>'` even when the index exists under the repo root.

---

## 6. Common failure-mode response codes

The patch engine and retrieval tools surface these failure modes; map each to the appropriate skill response.

### Pre-validation envelope-shape errors

| Code | Meaning | Response |
|---|---|---|
| `invalid_input` | Envelope or op field missing / malformed (e.g., empty `approval_token`, missing `target_file`, missing `payload`). The error's `details.field` names the first offending path. When multiple shape errors are present, `details.additional_errors[]` lists the remaining invalid-input errors for the same call. | Fix the envelope; re-validate. The signed approval token does NOT need to be re-signed if the envelope content does not change — but if the envelope IS changed, re-sign before submit. |
| `envelope_shape_invalid` | Same family as `invalid_input`; structural shape rejected before per-op validation. | Same as `invalid_input`. |
| `target_file_missing` / `target_file_outside_world` | Op's `target_file` is empty, missing, or escapes the world root (or for hybrid-file ops, doesn't start with the expected directory prefix). | Fix the op's `target_file` per §2; re-validate. |
| `op_target_class_mismatch` | Typed payload key (e.g., `cf_record`) doesn't match `op` kind (e.g., `create_inv_record`). | Fix the op's payload key to match the op kind; re-validate. |
| `record_already_exists` | A `create_*_record` op's record-id already exists on disk. | Abort and investigate — the world is not actually in the expected state, or the IDs are stale. Do not blindly re-allocate. |
| `id_allocation_race` | Verifier sees an allocation that does not match the engine's next-id calculation for that class or per-prefix class. Either another plan landed concurrently or the allocation list is malformed. | Re-allocate IDs against current world state via `allocate_next_id` and rebuild the envelope. |
| `missing_expected_id_allocation` | Per-op check found a `record.id` not listed in the corresponding allocation array. | Add the missing ID to the allocation list; re-validate. |

### Approval-token errors

| Code | Meaning | Response |
|---|---|---|
| `approval_expired` | Token is past its expiry window (default 20 minutes). | Re-sign the unchanged envelope; resubmit immediately. |
| `approval_replayed` | Token already consumed by a prior successful submit (single-use enforcement). | Do NOT resubmit. The prior submit already applied; check the receipt path and verify world state. |

### Pre-apply / commit errors

| Code | Meaning | Response |
|---|---|---|
| `index_stale` (submit-time) | Engine detected the world index has diverged from on-disk content (typically a prior direct-`Edit` to hybrid-file frontmatter without index sync). `detail.divergent_files[].file_path` names the divergent files. | Run `node tools/world-index/dist/src/cli.js sync <world-slug>`; resubmit with the same approval token if it has not expired. |
| `validator_failed` | A pre-apply validator (Rule 1-7 + 11-12 + structural) returned a failing verdict. `detail.verdicts[].location.file` names the offending file. Common canon-addition cases: `rule5_no_consequence_evasion` (see §7 — non-SEC entries in `required_world_updates`); `record_schema_compliance` (CF schema violation, often missing `epistemic_profile` / `exception_governance` for taxonomy types); `touched_by_cf_completeness` (bidirectional pointer mismatch — see §8). | If the cited file is one of the records this plan is creating or extending (per `expected_id_allocations`, extension targets, or the PA target), the violation is in this skill's output — fix and resubmit. **If the cited file is unrelated existing world state, pause and escalate to the user — this skill must not silently modify other canon-adjacent files.** |
| `Index missing for world '<slug>'` | The validate/submit CLI was likely invoked from the wrong cwd. The CLI/engine path derives `worldRoot` from `process.cwd()` before opening `worlds/<slug>/_index/world.db`. | Re-invoke from the project root or active git worktree root. If it still fails from that cwd, rebuild or inspect the world index. |

After any user-authorized direct-`Edit` to a hybrid-file frontmatter under `worlds/<slug>/characters/`, `diegetic-artifacts/`, or `adjudications/` (the surfaces under `record_schema_compliance` validator scope), run `node tools/world-index/dist/src/cli.js sync <world-slug>` before resubmitting — the validator runs against the indexed world state, not against on-disk content. INDEX.md edits do not require sync (not under validator scope).

### Retrieval-time errors

| Code | Meaning | Response |
|---|---|---|
| `freshness_audit.pre_call_index_was_stale: true` (retrieval-time) | Retrieval detected a stale explicit world index, ran `world-index sync` in-process, retried once, and recovered transparently. `freshness_audit.drifted_files_synced[]` names the stale paths that triggered the sync. | Record the audit field if it matters for diagnostics; continue the retrieval flow. No manual retry is required. |
| `stale_index` (retrieval-time persistent) | Returned by `mcp__worldloom__get_context_packet`, `get_record`, `find_named_entities`, and other retrieval tools only when auto-sync cannot run or one retry still leaves the world stale. The error's `details.drifted_files[]` (or `divergent_files[]`) names the stale paths, and `details.recovery_attempted` / `details.recovery_outcome` may describe the failed recovery. | Treat as a diagnostic blocker: inspect the paths, run `node tools/world-index/dist/src/cli.js sync <world-slug>` manually if appropriate, and retry only after the underlying index issue is understood. Submit-time `index_stale` remains governed by the pre-apply table above. |

---

## 7. `required_world_updates` discipline — SEC file classes only

A CF's `required_world_updates` field lists the prose concerns whose initial SEC records cite the CF in `touched_by_cf` (bidirectional pointer per §8). The validator `rule5_no_consequence_evasion` (`tools/validators/src/rules/rule5-no-consequence-evasion.ts`) requires every entry to have a matching SEC operation in the patch plan and recognizes ONLY the seven SEC file classes:

- `GEOGRAPHY` (matches `SEC-GEO-<integer>`)
- `PEOPLES_AND_SPECIES` (matches `SEC-PAS-<integer>`)
- `INSTITUTIONS` (matches `SEC-INS-<integer>`)
- `ECONOMY_AND_RESOURCES` (matches `SEC-ECR-<integer>`)
- `MAGIC_OR_TECH_SYSTEMS` (matches `SEC-MTS-<integer>`)
- `EVERYDAY_LIFE` (matches `SEC-ELF-<integer>`)
- `TIMELINE` (matches `SEC-TML-<integer>`)

Listing any non-SEC file class (notably `INVARIANTS`, but also `CANON_LEDGER`, `MYSTERY_RESERVE`, `OPEN_QUESTIONS`, `ENTITIES`) fails validation with `rule5.required_update_not_patched: "<CF-id> requires <FILE-CLASS>, but the patch plan has no matching SEC operation"`.

**Track non-SEC mutations elsewhere:**

- Invariant extensions (`append_extension` against `_source/invariants/<ID>.yaml`): record in CH `downstream_updates[]` (free prose) but NOT in CF `required_world_updates`. The audit trail is preserved via the invariant's `extensions[]` array (which the engine populates from the `append_extension` op) plus the CH entry's `downstream_updates` text.
- Mystery-reserve creations / extensions: record in CH `downstream_updates[]`. New M records carry their own `originating_cf` link inside the engine-applied extension entries; existing M records receive `extensions[]` entries linking back to the originating CF.
- Open-question creations / extensions: record in CH `downstream_updates[]`. New OQ records cite the originating CF; existing OQ records receive extensions.
- CF modification_history appends (`append_modification_history_entry`): record in CH `downstream_updates[]`. The Phase 12a axis-(c) judgment governs which CFs are touched; the mechanical layer is `rule6_no_silent_retcons`.

The CH `downstream_updates[]` field is a free-prose array; entries are typically one-line descriptions like `"extension to ONT-2 (single named exception clause)"` or `"new mystery-reserve entry M-4 (forbidden status; cause-of-variant-prevalence)"`. This preserves Rule 6 audit-trail completeness without polluting CF's `required_world_updates` with non-SEC entries the validator can't parse.

---

## 8. Bidirectional pointer semantics — final-state, not op-level

The §Output discipline states: *"every `append_touched_by_cf` op MUST be preceded in the same plan by an `update_record_field` op extending the target CF's `required_world_updates`."* The strict reading suggests an op-level pairing requirement — emit an `update_record_field` op before each `append_touched_by_cf`. The actual validator behavior (`tools/validators/src/structural/touched-by-cf-completeness.ts`) is **final-state**: it checks that for each SEC's final `touched_by_cf` entry citing a CF, that CF's final `required_world_updates` lists the SEC's file class.

Two operational implications:

- **For CFs created in the same plan**: the `create_cf_record` op's initial `required_world_updates` value satisfies the bidirectional precondition without a separate `update_record_field` op. Omit the redundant pre-pair update_record_field; the validator is happy with the create-op's listed file classes.
- **For existing CFs receiving new touched_by_cf entries**: emit an `update_record_field` op (with `operation: "append_list"`) extending the existing CF's `required_world_updates` to include the new file class BEFORE (in document order) the `append_touched_by_cf` op. The op-level ordering preserves replay-time monotonicity even if the validator only checks final state.

**`append_touched_by_cf` alone does NOT satisfy `rule5_no_consequence_evasion`.** The rule5 validator (`tools/validators/src/rules/rule5-no-consequence-evasion.ts`'s `hasMatchingPatchForFileClass`) credits only three op kinds against a CF's `required_world_updates` entry: `create_sec_record`, `append_extension`, and `update_record_field` on a SEC record. `append_touched_by_cf` is NOT in that list — even though it satisfies the bidirectional pointer's final-state check via `touched_by_cf_completeness`, rule5 will reject the plan with `rule5.required_update_not_patched: "<CF-id> requires <FILE-CLASS>, but the patch plan has no matching SEC operation"` if no `append_extension` (or `create_sec_record` / `update_record_field`) op exists on a SEC of that file class.

**The canon-addition convention is to emit BOTH ops on every affected SEC**: `append_touched_by_cf` for the index-level cite (so `find_sections_touched_by(cf_id)` reverse-lookup works) AND `append_extension` for the prose annotation (so rule5 credits the SEC-side patch AND so the SEC carries the documented contribution this CF makes to that file class). Pair every `append_touched_by_cf` with an `append_extension` on the same SEC. Using only `append_extension` is sufficient for validator compliance (rule5 credits it; bidirectional check is satisfied via the `extensions[]` entry's `originating_cf`) but loses the index-level `touched_by_cf` discoverability — the worked example at `examples/accept-with-required-updates.md` (line 156: "Refused to call `submit_patch_plan` until every affected section had a concrete `append_extension` op paired with the bidirectional `update_record_field` + `append_touched_by_cf` ops") is the canonical pairing pattern.

---

## 9. Recommended construction — programmatic, not raw JSON

For canon-addition envelopes (typically 10-15 ops with multi-paragraph string fields in CF `notes`, `visible_consequences`, `costs_and_limits`, and PA `body_markdown`), prefer programmatic construction over hand-writing JSON via the Write tool:

```javascript
const fs = require("fs");
const envelope = {
  plan_id: "pa-NNNN-<slug>",
  target_world: "<world-slug>",
  approval_token: "placeholder",
  verdict: "ACCEPT_AS_LOCAL_EXCEPTION",
  originating_skill: "canon-addition",
  originating_cf_ids: ["CF-<integer>"],
  originating_ch_id: "CH-<integer>",
  originating_pa_id: "PA-<integer>",
  expected_id_allocations: { cf_ids: ["CF-<integer>"], ch_ids: ["CH-<integer>"], pa_ids: ["PA-<integer>"] },
  patches: [
    {
      op: "create_cf_record",
      target_world: "<world-slug>",
      target_file: "_source/canon/CF-<integer>.yaml",
      payload: { cf_record: { id: "CF-<integer>", /* ... */ } }
    },
    // ...
  ]
};
fs.writeFileSync("/tmp/<plan-id>.json", JSON.stringify(envelope, null, 2));
```

The structured form catches op-payload shape errors at language level (typo in a key name, missing brace) rather than at JSON-parse time, where the validator's error message points at the parser's recovery position rather than the actual mistake. For envelopes with many string fields containing escape characters, em-dashes, or quotes, programmatic construction is materially more reliable than hand-edited JSON.

If amending an existing envelope (e.g., adding `target_file` to every op after a first-validation failure), use a small Node script over the JSON file:

```javascript
const plan = JSON.parse(fs.readFileSync("/tmp/<plan-id>.json", "utf8"));
for (const op of plan.patches) {
  if (!op.target_file) op.target_file = derivePathFromOp(op);
}
fs.writeFileSync("/tmp/<plan-id>.json", JSON.stringify(plan, null, 2) + "\n");
```

---

## 10. Worked example: minimal accept-branch op set

A complete `create_cf_record` op for a new soft-canon CF:

```json
{
  "op": "create_cf_record",
  "target_world": "<world-slug>",
  "target_file": "_source/canon/CF-<integer>.yaml",
  "payload": {
    "cf_record": {
      "id": "CF-<integer>",
      "title": "...",
      "status": "soft_canon",
      "type": "local_anomaly",
      "statement": "...",
      "scope": { "geographic": "global", "temporal": "current", "social": "restricted_group" },
      "truth_scope": { "world_level": true, "diegetic_status": "objective" },
      "domains_affected": ["..."],
      "prerequisites": ["..."],
      "distribution": { "who_can_do_it": ["..."], "who_cannot_easily_do_it": ["..."], "why_not_universal": ["..."] },
      "costs_and_limits": ["..."],
      "visible_consequences": ["..."],
      "required_world_updates": ["PEOPLES_AND_SPECIES", "EVERYDAY_LIFE"],
      "source_basis": { "direct_user_approval": true, "derived_from": ["CF-1"] },
      "contradiction_risk": { "hard": false, "soft": true },
      "notes": "...",
      "epistemic_profile": { "n_a": "<rationale tied to fact-type keyword>" },
      "exception_governance": { "n_a": "<rationale tied to fact-type keyword>" },
      "modification_history": []
    }
  }
}
```

Note: `required_world_updates` lists ONLY SEC file classes (per §7). The CH record's `downstream_updates[]` covers any invariant extensions, mystery-reserve entries, open-question entries, and other non-SEC mutations.

A complete `append_adjudication_record` op for the PA:

```json
{
  "op": "append_adjudication_record",
  "target_world": "<world-slug>",
  "target_file": "adjudications/PA-<integer>-<verdict-slug>.md",
  "payload": {
    "adjudication_frontmatter": {
      "pa_id": "PA-<integer>",
      "verdict": "ACCEPT_AS_LOCAL_EXCEPTION",
      "date": "YYYY-MM-DD",
      "originating_skill": "canon-addition",
      "change_id": "CH-<integer>",
      "mystery_reserve_touched": ["M-3", "M-4"],
      "invariants_touched": ["ONT-2"],
      "cf_records_touched": ["CF-1", "CF-<integer>"],
      "open_questions_touched": ["OQ-<integer>"]
    },
    "body_markdown": "# Discovery\n\n... full Phase 0–11 analysis ..."
  }
}
```

Note: `target_file` is **world-relative** (starts with `adjudications/`), NOT workspace-relative. The frontmatter's required fields per `tools/validators/src/schemas/adjudication-frontmatter.schema.json` are `pa_id`, `date`, `verdict`, `mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, and `change_id` (the change_id is required even though the SPEC-14 frontmatter docs sometimes describe it as optional).

The other op kinds canon-addition uses (`create_ch_record`, `create_m_record`, `create_oq_record`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`) follow the same outer shape (`op` / `target_world` / `target_file` / `payload`); the inner record schemas live in the engine-owned source files cited at the top of this document. Query the canonical vocabularies via `mcp__worldloom__get_canonical_vocabulary({class})` for `domain` / `verdict` / `mystery_status` / `mystery_resolution_safety` / `invariant_category` / `entity_kind` / `sec_file_class` / `change_type` / `mystery_reserve_effect` / `revision_difficulty` / `cf_type` before populating constrained fields.
