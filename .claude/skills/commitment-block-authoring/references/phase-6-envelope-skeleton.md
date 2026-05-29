# Phase 6: Worked `create_slt_record` Envelope Skeleton

`describe_envelope_schema(op_kind='create_slt_record')` gives the full machine-readable shape, but three authoring decisions are not expressed by the schema alone. This skeleton fixes known-good values for all three so the dry-run / sign / submit flow is reproducible without reverse-engineering accepted values.

## The three non-schema decisions

1. **`verdict`** — the schema types this as `{string, minLength: 1}` with no enum. Use the literal string **`"approve"`**; `approval_semantics` accepts it. (It is the operator's accept verdict for the plan, not a per-record field.)
2. **`approval_token`** — required (`minLength: 1`), but during the **dry-run** the real token does not exist yet. Carry the placeholder **`"PENDING"`** through `validate_patch_plan`; it validates. The real token is issued **out-of-band** by `sign-approval-token.js` to a **token file**, which the submit CLI reads via its `<token-path>` argument — you do **not** edit the issued token back into the envelope. (For MCP `submit_patch_plan`, pass the issued token as the `approval_token` argument alongside the same envelope object.) See `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token.
3. **`expected_id_allocations`** — for an SLT batch the only key is **`slt_ids: [...]`**. Do **not** add an `slb_ids` (or `slb`) allocation: the `SLB-<integer>` manifest is a direct-write markdown artifact, not a patch-consumed atomic record, so it carries no id allocation. Each listed `SLT-<n>` must equal the engine's current next id for the story (see `allocate_next_id` / `allocate_many_ids`), or `id_allocation_race` fails the dry-run.

## Minimal validate-clean envelope

One `create_slt_record` op shown; real batches list one op per surviving block and one `slt_ids` entry per op. `target_file` is the on-disk write path `worlds/<world_slug>/stories/<story_slug>/_source/storylets/SLT-<n>.yaml`.

```json
{
  "plan_id": "<unique-plan-id>",
  "target_world": "<world_slug>",
  "approval_token": "PENDING",
  "verdict": "approve",
  "originating_skill": "commitment-block-authoring",
  "expected_id_allocations": {
    "slt_ids": ["SLT-<n>"]
  },
  "patches": [
    {
      "op": "create_slt_record",
      "target_world": "<world_slug>",
      "target_file": "worlds/<world_slug>/stories/<story_slug>/_source/storylets/SLT-<n>.yaml",
      "payload": {
        "story_slug": "<story_slug>",
        "record": {
          "id": "SLT-<n>",
          "story_id": "STORY-<k>",
          "scope": { "visibility": "global_author_pool", "branch_id": null },
          "title": "<block title>",
          "move_family": "recovery",
          "preconditions": {
            "hard": [
              { "pred": "has_affordance", "action_family": "recover" }
            ]
          },
          "beats": [
            { "beat_id": "B1", "function": "setup", "instruction": "<setup beat>" },
            { "beat_id": "B2", "function": "exit", "instruction": "<exit beat>" }
          ],
          "exit_options": [
            { "action_family": "recover", "surface_hint": "<surface hint>" }
          ],
          "saliency": { "urgency": "medium", "cooldown_pages": 0, "tags": ["recovery"] },
          "mystery_policy": { "allowed_authority": "none", "forbidden_resolutions": [] },
          "provenance": { "origin": "author_batch" },
          "grounding": {
            "compatible_turn_drivers": ["player_action", "player_write_in"],
            "reason_to_exist": "<≥16 chars naming the active/reusable pressure logic the block captures>"
          }
        }
      }
    }
  ]
}
```

Notes:
- `provenance.origin` MUST be `author_batch` for `direct_batch` and `audit_repair` for `audit_repair` (per Phase 3 gate 1). This skill never emits `runtime_jit`, so `created_at_page` MAY be omitted/null.
- The `payload.record` body conforms to `story-storylet.schema.json` (retrievable via `get_record_schema(node_type='storylet_record')`); the predicate objects conform to the closed DSL grammar. The above is a recovery-family example with a record-free `has_affordance` precondition so it has no dangling references; real blocks ground on the bundle's active records and predicates per `references/phase-2-draft-blocks.md`.

## Sequencing (dry-run → sign → submit)

1. **Dry-run** with `approval_token: "PENDING"`: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js [--world-root <path>] <plan-path>` → expect `status: pass`.
2. **Sign** (after HARD-GATE approval): `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path> 2>/dev/null > <token-path>` — issues the real token to the token file; the envelope's `approval_token` is left at the `"PENDING"` placeholder.
3. **Submit**: CLI `submit-patch-plan.js <plan-path> <token-path>`, or MCP `submit_patch_plan(plan, approval_token)` passing the issued token. See SKILL.md Phase 6 sub-step 5 for path selection by envelope size.
