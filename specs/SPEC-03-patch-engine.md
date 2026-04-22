<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-03: Patch Engine & Edit Contract

**Phase**: 2
**Depends on**: SPEC-01 (anchor data), SPEC-02 (MCP `submit_patch_plan` delegates here), SPEC-04 (validator gate)
**Blocks**: SPEC-05 Phase 2 hooks (Hook 3 enforces engine-only writes), SPEC-06 Phase 2 skills (all writes through engine)

## Problem Statement

Large canon-addition deliveries fire 25+ Edit tool calls per run, each vulnerable to anchor drift (file changed between Read and Edit), and partial failures leave `CANON_LEDGER.md` and domain files in inconsistent states with no structured rollback. Rule 6 (No Silent Retcons) attribution stamping (`<!-- added by CF-NNNN -->`, `<!-- clarified by CH-NNNN -->`, notes-field `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN):` lines) is hand-formatted per-skill and drifts over time. The current `canon-addition/SKILL.md` carries explicit Phase 15a inter-step checkpoint grep commands (per `references/phase-15a-checkpoint-grep-reference.md`) as a band-aid for the lack of engine-level atomicity.

**Source context**: `brainstorming/structure-aware-retrieval.md` §4 (deterministic patch engine), §13 (edit contract). Brainstorm decision: skills emit structured patch plans; code applies; engine fails closed on stale anchors.

## Approach

A deterministic Node.js patch applier, invoked via `mcp__worldloom__submit_patch_plan` (SPEC-02), that consumes a JSON patch-plan envelope and writes files directly via `fs.writeFile` (bypassing Claude's Edit/Write tools, so SPEC-05 Hook 3 does not fire on engine writes). Two-phase commit: validate-all then apply-all; atomic per file via temp-write + rename. Any failed op aborts the entire plan and leaves disk unchanged.

## Deliverables

### Package location

`tools/patch-engine/` — TypeScript package; imported by `tools/world-mcp/`.

```
tools/patch-engine/
├── package.json
├── tsconfig.json
├── src/
│   ├── apply.ts                     # top-level two-phase commit
│   ├── ops/
│   │   ├── insert-before-node.ts
│   │   ├── insert-after-node.ts
│   │   ├── replace-node.ts
│   │   ├── insert-under-heading.ts
│   │   ├── replace-yaml-field.ts
│   │   ├── append-list-item.ts
│   │   ├── append-modification-history-entry.ts
│   │   ├── append-cf-record.ts
│   │   ├── append-bullet-cluster.ts
│   │   ├── append-heading-section.ts
│   │   ├── insert-attribution-comment.ts
│   │   ├── append-change-log-entry.ts
│   │   └── append-adjudication-record.ts
│   ├── envelope/
│   │   ├── schema.ts                # envelope + per-op schema
│   │   └── validate.ts              # structural envelope validation
│   ├── attribution/
│   │   ├── stamp.ts                 # auto-generate HTML comments + notes lines
│   │   └── templates.ts             # canonical attribution formats
│   ├── commit/
│   │   ├── order.ts                 # apply-order enforcement
│   │   ├── temp-file.ts             # per-file temp-write
│   │   └── rename.ts                # atomic rename orchestration
│   └── approval/
│       └── verify-token.ts          # consumes SPEC-02 approval_token
├── tests/
│   ├── ops/                         # per-op unit tests
│   └── integration/
│       └── end-to-end-canon-addition.test.ts
```

### Operation vocabulary (13)

**Generic structural ops**

| Op | Semantics | Payload |
|---|---|---|
| `insert_before_node` | Insert content immediately before target node | `{body: string, attribution?: {kind, id}}` |
| `insert_after_node` | Insert content immediately after target node | same |
| `replace_node` | Replace target node's body (**not** used for CF records — ledger is append-only) | same |
| `insert_under_heading` | Insert a new section under an existing heading | `{new_heading_level, new_heading_text, body, attribution?}` |

**YAML-record ops**

| Op | Semantics | Payload |
|---|---|---|
| `replace_yaml_field` | Update a single field in a YAML record's parsed tree (e.g., CF notes) | `{field_path: string[], new_value: any}` |
| `append_list_item` | Append to a YAML list field (e.g., `visible_consequences`) | `{field_path, new_item}` |
| `append_modification_history_entry` | Append a typed entry to a CF's `modification_history` array | `{change_id, originating_cf, date, summary}` |
| `append_cf_record` | Append a new CF YAML block to `CANON_LEDGER.md`'s CFs section, before `## Change Log` header | `{cf_record: CanonFactRecord}` |

**Markdown prose ops**

| Op | Semantics | Payload |
|---|---|---|
| `append_bullet_cluster` | Append a sub-bullet to a named bullet cluster | `{body, attribution?}` |
| `append_heading_section` | Append a new heading + body at a prescribed location within a file | `{heading_level, heading_text, body, attribution?}` |
| `insert_attribution_comment` | Engine-internal op — inserts `<!-- added by CF-NNNN -->` at payload-specified location (normally auto-generated from the `attribution` field of other ops, but callable directly when retrofitting) | `{kind: 'added' \| 'clarified' \| 'modified', id: string}` |

**Cross-file ops**

| Op | Semantics | Payload |
|---|---|---|
| `append_change_log_entry` | Append a CH entry at the tail of `CANON_LEDGER.md`'s Change Log section | `{change_log_entry: ChangeLogEntry}` |
| `append_adjudication_record` | Write a new `adjudications/PA-NNNN-<verdict>.md` file | `{verdict, body, filename}` |

**Not included (deliberate)**: there is no `replace_cf_record` op, no `delete_*` op, no `move_*` op. The ledger is append-only; mutation of an accepted CF happens only via `replace_yaml_field` on its `notes` or `modification_history` — never on its structural fields.

### Edit contract envelope

```typescript
interface PatchPlanEnvelope {
  plan_id: string;                      // opaque, client-generated
  target_world: string;
  approval_token: string;               // issued by SPEC-02 at HARD-GATE approval
  verdict: string;                      // e.g., "ACCEPT_WITH_REQUIRED_UPDATES"
  originating_skill: string;            // e.g., "canon-addition"
  originating_cf_ids?: string[];        // new CFs this plan creates (if any)
  originating_ch_id?: string;           // new CH this plan creates (if any)
  originating_pa_id?: string;           // new PA this plan creates (if any)
  expected_id_allocations: {
    cf_ids?: string[];
    ch_ids?: string[];
    pa_ids?: string[];
    char_ids?: string[];
    da_ids?: string[];
    // etc.
  };
  patches: PatchOperation[];
}

interface PatchOperation {
  op: OperationKind;                    // one of the 13
  target_world: string;
  target_file: string;                  // path relative to worlds/<slug>/
  target_node_id?: string;              // for ops that target an existing node
  expected_content_hash?: string;       // content_hash from index at plan-authoring time
  expected_anchor_checksum?: string;    // anchor_checksum from index at plan-authoring time
  payload: OperationPayload;            // shape varies per op
  attribution?: {
    kind: 'added' | 'clarified' | 'modified';
    id: string;                         // CF-NNNN or CH-NNNN
    date?: string;                      // ISO date; engine defaults to today
  };
  failure_mode?: 'strict' | 'relocate_on_miss';  // default 'strict'
}
```

### Write-order discipline (engine-enforced)

The current `canon-addition/SKILL.md` Phase 15a sub-step order is load-bearing for partial-failure recovery semantics (see `docs/HARD-GATE-DISCIPLINE.md`). The engine preserves it **by reordering patches internally** before apply, regardless of the plan's patch-list order:

1. **All domain-file ops** — `append_bullet_cluster`, `insert_under_heading`, `append_heading_section`, `insert_before_node`, `insert_after_node`, `replace_node`, and their auto-stamped attribution comments (not including the ledger or adjudication record)
2. **`append_adjudication_record`** — write the PA-NNNN file (per-file artifact, side-effect-free w.r.t. existing world state)
3. **`CANON_LEDGER.md` operations** in strict sub-order:
   - **3a**: `replace_yaml_field` + `append_modification_history_entry` — in-place CF qualifications (touches existing CF notes / arrays)
   - **3b**: `append_cf_record` — new CFs appended to CFs section (before `## Change Log` header)
   - **3c**: `append_change_log_entry` — new CH at tail of Change Log

If the engine crashes between steps 2 and 3a, the ledger reflects pre-operation state; future runs recover cleanly. Inverse ordering (CF-first, domain-patches-last) would leave orphaned references — hence the internal reorder is non-negotiable.

### Atomicity model (two-phase commit)

**Phase A — Validate (no writes)**:
1. Verify `approval_token` (signature + expiry + single-use-not-yet-consumed)
2. Verify every op's `expected_content_hash` and `expected_anchor_checksum` match current index state
3. Verify every op's `expected_id_allocations` still match `allocate_next_id` for the relevant classes (detect race)
4. Delegate to SPEC-04 validator framework with `mode: 'pre-apply'`
5. Any failure → abort; return structured error; no write

**Phase B — Apply**:
1. For each unique `target_file`, create a temp file: `<file>.patch-engine.<plan_id>.tmp`
2. Build the final content for each temp file by applying all ops targeting it (in engine-order)
3. For each temp file, fsync and `rename()` to final path (atomic on POSIX)
4. For new files (`append_adjudication_record`), write directly + fsync + rename from temp
5. Mark `approval_token` consumed
6. Return patch receipt + trigger index sync (`world-index sync <world-slug>`)

If step 2 or 3 fails for any file, unlink all `.patch-engine.<plan_id>.tmp` files and return error; disk is unchanged from Phase A start.

### Anchor-miss handling

On `expected_anchor_checksum` mismatch:
- `failure_mode: 'strict'` (default): return structured error `{code: 'anchor_drift', node_id, expected_checksum, actual_checksum, drift_size_estimate}`. No fuzzy match; skill's recourse is to re-call `get_context_packet` / `find_edit_anchors` for fresh anchors and resubmit.
- `failure_mode: 'relocate_on_miss'`: reserved for future use; not implemented in Phase 2

### Attribution auto-stamping

Every op carrying an `attribution` field causes the engine to auto-generate the correct artifact:

| `attribution.kind` | Generated artifact |
|---|---|
| `added` (domain file, new prose) | `<!-- added by CF-NNNN -->` inserted immediately after the new prose node |
| `clarified` (domain file, correction) | `<!-- clarified by CH-NNNN -->` |
| `modified` (CF's notes field) | Appends line: `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): <summary>` |

Skills never hand-format these. If a skill submits a plan with manually-written attribution markers in the body, the validator framework (`attribution_comment_validator`) rejects it.

### Integration with SPEC-02 approval token

`submit_patch_plan` (SPEC-02) forwards the envelope + token to engine. Engine verifies token via HMAC check against local secret; token's `patch_hashes` array must match the hash of each op in the envelope (tamper detection). Tokens are single-use (recorded in `approval_tokens_consumed` table).

### Patch receipt shape

```typescript
interface PatchReceipt {
  plan_id: string;
  applied_at: string;                  // ISO timestamp
  files_written: {
    file_path: string;
    prior_hash: string;
    new_hash: string;
    ops_applied: number;
  }[];
  new_nodes: {
    node_id: string;
    node_type: string;
    file_path: string;
  }[];
  id_allocations_consumed: {
    cf_ids?: string[];
    ch_ids?: string[];
    pa_ids?: string[];
  };
  index_sync_duration_ms: number;
}
```

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| Rule 6 No Silent Retcons | Every mutation carries explicit `attribution`; engine stamps the audit trail deterministically; append-only op vocabulary encodes the invariant |
| §Change Control Policy | Patch plan IS the downstream-updates commitment; receipt IS the completion record |
| §Mandatory World Files | Preserved; engine writes to existing files, creates new per-file artifacts only for PA/CHAR/DA/PR/etc. |
| §Canon Fact Record Schema | `append_cf_record` payload typed against `CanonFactRecord` TypeScript interface; schema drift caught at compile time |
| HARD-GATE discipline | `approval_token` ties user consent to specific plan bytes; no unsigned submission succeeds |

## Verification

- **Unit**: each of 13 ops tested against fixture files (before/after snapshots)
- **Integration**: replay a historical `canon-addition` delivery (e.g., CH-0013's five parallel named-polity-instance commitments on animalia) as a patch plan; verify byte-identical output to the hand-written version
- **Atomicity**: inject failure at various points (Phase A validate, Phase B temp-write, Phase B rename); verify no partial write on disk
- **Anchor drift**: mutate target file between plan authoring and submit; verify engine rejects with `anchor_drift` code
- **Approval token**: unsigned, expired, tampered, replayed tokens all rejected
- **Write-order**: submit a plan with patches in pathological order (ledger ops first, domain ops last); verify engine reorders internally and final state matches canonical order
- **Append-only**: attempt to construct a `replace_cf_record` payload; verify compile-time rejection (op not in union) and runtime rejection (schema validator)
- **Attribution**: submit a plan; verify all `<!-- added by CF-NNNN -->` and notes-field lines are engine-generated; hand-written attribution in body rejected by validator

## Out of Scope

- Rollback / undo history — writes are forward-only; restoration via git
- Time-travel / snapshot queries — index reflects current state only
- Patch review UI — patch plans reviewed as part of HARD-GATE deliverable summary
- `relocate_on_miss` failure mode implementation (reserved for future)
- Multi-world transactions — one plan targets one world
- Cross-plan merge — concurrent plans targeting overlapping nodes serialize (second plan fails anchor check)

## Risks & Open Questions

- **Cross-plan race**: two skills submit plans simultaneously. Mitigation: engine takes a per-world write lock (file-based) for the duration of Phase B; second plan waits or errors with `world_locked`.
- **Approval token replay vs legitimate retry**: a network failure between `submit_patch_plan` and receipt may leave the skill unsure whether the plan applied. Mitigation: tokens are single-use but receipts are queryable by `plan_id` via a new `mcp__worldloom__get_patch_receipt` tool (added if needed in Phase 2 retrospection).
- **Attribution canonicalization**: date format across skills must match. Mitigation: engine owns the date format (`YYYY-MM-DD`, UTC); skills never supply dates.
- **Large-plan performance**: a canon-addition delivery with 6 domain files + 4 modification_history + 3 MR firewalls = ~13 ops. Target apply time <2s. If slower, profile hot paths.
