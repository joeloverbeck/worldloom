# Phase 7: Engine Submit and INDEX.md Edit

Phase 7 is the only writing phase. It assembles a single patch envelope, validates it, signs the approval token, submits to the engine, and (after a successful submit) edits `INDEX.md` to flip the page row's prose_status. The INDEX edit is intentionally LAST so a partial state never appears in the bundle index.

## Op Inventory

The envelope contains exactly these ops, in this order:

1. **`update_record_field`** — five (or seven) ops, all targeting the existing PG record:

   | Field path | Operation | new_value |
   |---|---|---|
   | `["prose_path"]` | `set` | `"pages-prose/PG-NNNN.md"` |
   | `["prose_status"]` | `set` | `"rendered"` |
   | `["deferred_validation_trace", "prose_ledger_consistency"]` | `set` | the Phase 5 PASS rationale string |
   | `["deferred_validation_trace", "arc_trace_evidence_alignment"]` | `set` | the Phase 5 PASS rationale string |
   | `["deferred_validation_trace", "prose_critic_8_axis"]` | `set` | the Phase 5 PASS rationale string |
   | `["state_snapshot", "arc_trace_emitted"]` | `set` | `true` — **only when Phase 4 ran** |
   | `["state_snapshot", "arc_trace_id"]` | `set` | `"ARCTRACE-NNNN"` — **only when Phase 4 ran** |

   Each op carries `target_record_id: PG-NNNN`, `target_world: <world-slug>`, `expected_content_hash: <pg-current-content-hash>` (read from `mcp__worldloom__get_record` at pre-flight and cached). The `target_file` field is shape-validation only; the engine derives the actual path from the record id. Set `target_file` to the canonical path `worlds/<world-slug>/stories/<story-slug>/_source/pages/PG-NNNN.yaml` to satisfy the envelope-shape validator.

   No `retcon_attestation` is required on these ops. The PG transitional state fields (`prose_path`, `prose_status`, `deferred_validation_trace.{prose_ledger_consistency, arc_trace_evidence_alignment, prose_critic_8_axis}`, `state_snapshot.{arc_trace_emitted, arc_trace_id}`) are recognized by the engine's `update_record_field` op as freely-settable transitional state fields (the same way `notes` is freely-appendable). The SE event in Op 2 provides the Rule 6 audit trail.

2. **`create_se_record`** — one op, always:

   ```yaml
   op: create_se_record
   target_world: <world-slug>
   target_file: worlds/<world-slug>/stories/<story-slug>/_source/events/SE-NNNN.yaml
   payload:
     story_slug: <story-slug>
     record:
       id: SE-NNNN
       story_id: STORY-NNNN
       branch_id: <PG.branch_id>
       created_at_page: PG-NNNN
       action: prose_finalized
       actor: system
       source:
         parent_page_id: <PG.parent_page_id | null at PG-0001>
       target: PG-NNNN
       ops: []
       state_hash_before: <PG.state_hash>
       state_hash_after: <PG.state_hash>   # no state mutation; finalize is a documentation transition, not a state event
       notes: <SE.notes string composed at Phase 6>
   ```

   The SE record's `ops: []` (empty) signals "no state mutation" — finalize is a documentation transition, not an event-applied-to-state. The `state_hash_before == state_hash_after` invariant is structural for this action.

3. **`create_arc_trace_record`** — one op, **only when Phase 4 ran**:

   ```yaml
   op: create_arc_trace_record
   target_world: <world-slug>
   target_file: worlds/<world-slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml
   payload:
     story_slug: <story-slug>
     record: <Phase 4 Layer 2 ARCTRACE record body>
   ```

   The record body is the structurally-validated Layer 2 output with `semantic_critic_verdict.status` set per Phase 4 Layer 3.

## `expected_id_allocations`

```yaml
expected_id_allocations:
  se_ids: [SE-NNNN]
  arc_trace_ids: [ARCTRACE-NNNN]   # OMIT this key entirely when Phase 4 didn't run
```

If `expected_id_allocations` omits the `se_ids` or `arc_trace_ids` keys when ops in the envelope cite them, the engine's `id_allocation_race` pre-apply check fails. Always include keys for ids the envelope emits.

## Envelope Assembly Procedure

Submit-path selection by envelope size (`wc -c <plan-path>`): ordinary finalize envelopes (5 update ops + 1 SE + at most 1 ARCTRACE) are small and easily fit the MCP transport limit (≤50KB); the MCP path is the default. Use the CLI path only if `wc -c` reports >50KB.

The five sub-steps mirror `branching-story-page-cycle` Phase 11 §1a-§1e:

1. **Assemble** the envelope as `{plan_id, target_world, approval_token: "placeholder", verdict, originating_skill: "branching-story-page-prose-finalize", expected_id_allocations, patches: [...]}`. Generate a `plan_id` like `PLAN-PROSE-FINALIZE-<world-slug>-<story-slug>-PG-NNNN-<ISO-timestamp>` to avoid collisions with concurrent or replayed plans.

2. **Persist** the envelope to `/tmp/<plan-id>.json` with `approval_token: "placeholder"` (the envelope-shape validator rejects empty `approval_token`; the placeholder is required at construction). Always write the file from zero — if `/tmp/<plan-id>.json` (or its `.token` sibling) exists from a prior run, delete it first via `rm -f /tmp/<plan-id>.json /tmp/<plan-id>.token`. NEVER read or edit a pre-existing envelope at this path; editing a leftover is the dominant source of envelope-shape drift and byte-mismatch token-binding failures.

3. **Dry-run validate** via `mcp__worldloom__validate_patch_plan(envelope)` (envelope ≤50KB; ordinary finalize fits) OR `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` (envelope >50KB — rare for finalize). Coverage: `yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `record_schema_compliance`, `id_allocation_race` for `expected_id_allocations`, Rules 1-7 + structural validators. Treat validate as a defensive pre-submit check, not a complete gate — approval-token verification remains submit-only.

4. **Sign** the approval token via `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` (HMAC-bound to the envelope's exact bytes). Persist the signed token to `/tmp/<plan-id>.token` if the CLI submit path will be used. Always write the token file from zero — if a prior `.token` exists, step 2's `rm -f` already deleted it. A stale token bound to different envelope bytes will be rejected as `approval_signature_invalid`.

5. **Submit**: pass the signed token as the separate `approval_token` parameter to `mcp__worldloom__submit_patch_plan(plan, approval_token)`, leaving the envelope's `approval_token: "placeholder"` field unchanged — the engine verifies the token's HMAC against the envelope bytes that were signed. The MCP path fits ordinary finalize envelopes; the CLI alternative is `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>`. On successful submit, the engine returns a `PatchReceipt` with `files_written[]` and `validators_run[]`; report `files_written`. On `approval_replayed`, the prior submit already applied — inspect the prior receipt rather than re-submitting.

## INDEX.md Edit (LAST)

After successful Phase 7 §5 submit (and after the engine's PatchReceipt confirms the YAML records landed), `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` to flip the page row's `prose_status`:

- Find the row referencing `PG-NNNN` in the bundle's `## Pages` (or equivalent) section.
- Replace the `prose_status: pending` field on that row with `prose_status: rendered`.
- If the bundle's INDEX uses a different convention (e.g., a status emoji or a "(pending)" suffix on the page label), follow the existing convention; the structural intent is to surface that this page is now rendered.

`INDEX.md` is NOT under `_source/`, so Hook 3 does not block direct `Edit`.

## Cleanup

ONLY after the INDEX.md edit succeeds, delete the temp envelope and token:

```
rm -f /tmp/<plan-id>.json /tmp/<plan-id>.token
```

Cleanup is conditional on full success. If Phase 7 step 3 (validate), step 5 (submit), or the INDEX edit failed, do NOT delete the temp files — they are the operator's triage surface.

## Partial-Failure Recovery

| Failure point | State on disk | Recovery |
|---|---|---|
| Phase 7 §3 validate fails | No `_source/` writes; no INDEX edit; temp envelope persists | Inspect validate output; revise the envelope assembly bug; re-run the skill. |
| Phase 7 §4 sign fails | Same as above; temp envelope persists; no token | Inspect sign-approval-token error; verify the world-mcp secret is in place; re-run the skill. |
| Phase 7 §5 submit fails | No `_source/` writes (engine is atomic); no INDEX edit; temp envelope + token persist | Inspect submit error; on `approval_replayed`, prior submit applied — manually verify the PG record state and INDEX, then complete the INDEX edit by hand if needed. On `id_allocation_race`, the pre-allocated id collided with a concurrent allocator — re-run pre-flight to allocate fresh ids. |
| INDEX edit fails after submit success | `_source/` writes landed (authoritative); INDEX not updated; temp envelope + token persist | The engine YAML is the source of truth. The user hand-edits INDEX to match, or re-runs a separate INDEX-rebuild flow. Do NOT re-submit — that would be `approval_replayed`. |

## No git commit

The skill writes records and an INDEX edit to the working tree. **Do NOT `git commit`.** The user reviews the diff and commits.
