<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-03: Patch Engine & Edit Contract

**Phase**: 2
**Depends on**:
- SPEC-01 (record-level index data)
- archived SPEC-02 retrieval MCP server (the `submit_patch_plan` tool is stubbed at `tools/world-mcp/src/tools/submit-patch-plan.ts`; see `archive/specs/SPEC-02-retrieval-mcp-server.md`)
- **SPEC-02 Phase 2 tooling update per SPEC-13 §C (scheduled in `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 2; not a separate spec file): enables `submit_patch_plan` delegation to the engine, adds `mcp__worldloom__get_record` / `find_sections_touched_by` / `get_compiled_view`, and extends `allocate_next_id` to INV per-category / OQ / ENT / SEC per-file-class. Pre-apply step 4 (envelope allocation verification) cannot succeed for INV/OQ/ENT/SEC creates until this update lands — `tools/world-mcp/src/tools/allocate-next-id.ts` currently supports only CF, CH, PA, CHAR, DA, PR, BATCH, NCP, NCB, AU, RP, M.**
- SPEC-04 (validator gate)
- **SPEC-13 (atomic-source storage contract — patch engine writes atomic records, not monolithic files)**

**Blocks**: SPEC-05 Phase 2 hooks (Hook 3 enforces engine-only writes on `_source/`), SPEC-06 Phase 2 skills (all writes through engine)

## Problem Statement

Large canon-addition deliveries fire 25+ Edit tool calls per run, each vulnerable to anchor drift (file changed between Read and Edit), and partial failures leave world files in inconsistent states with no structured rollback. Rule 6 (No Silent Retcons) attribution stamping was hand-formatted per-skill in the pre-SPEC-13 form and drifted over time. The pre-SPEC-13 `canon-addition/SKILL.md` carried explicit Phase 15a inter-step checkpoint grep commands (per `references/phase-15a-checkpoint-grep-reference.md`) as a band-aid for the lack of engine-level atomicity.

**Post-SPEC-13 context**: canonical storage is atomic YAML under `worlds/<slug>/_source/` (one file per CF / CH / INV / M / OQ / ENT / SEC record). The 11 monolithic mandatory-markdown files are retired; no compiled views exist. The patch engine operates on atomic records directly — markdown-anchor navigation is replaced by record-ID addressing, and attribution is a structured field on the target record rather than an HTML-comment inserted into prose.

**Source context**: `brainstorming/structure-aware-retrieval.md` §4 (deterministic patch engine), §13 (edit contract), and SPEC-13 §C (amendments to this spec). Brainstorm decision: skills emit structured patch plans; code applies; engine fails closed on missing/malformed records.

## Approach

A deterministic Node.js patch applier, invoked via `mcp__worldloom__submit_patch_plan` (SPEC-02), that consumes a JSON patch-plan envelope and writes atomic YAML files (plus the hybrid character / diegetic-artifact / adjudication markdown files) directly via `fs.writeFile` (bypassing Claude's Edit/Write tools, so SPEC-05 Hook 3 does not fire on engine writes). Two-phase commit: validate-all then apply-all; atomic per file via temp-write + rename. Any failed op aborts the entire plan and leaves disk unchanged. No compile step — atomic records are the canonical form.

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
│   │   ├── create-cf-record.ts
│   │   ├── create-ch-record.ts
│   │   ├── create-inv-record.ts
│   │   ├── create-m-record.ts
│   │   ├── create-oq-record.ts
│   │   ├── create-ent-record.ts
│   │   ├── create-sec-record.ts
│   │   ├── update-record-field.ts
│   │   ├── append-extension.ts
│   │   ├── append-touched-by-cf.ts
│   │   ├── append-modification-history-entry.ts
│   │   ├── append-adjudication-record.ts
│   │   ├── append-character-record.ts
│   │   └── append-diegetic-artifact-record.ts
│   ├── envelope/
│   │   ├── schema.ts                # envelope + per-op schema
│   │   └── validate.ts              # structural envelope validation
│   ├── commit/
│   │   ├── order.ts                 # 3-tier apply-order enforcement
│   │   ├── temp-file.ts             # per-file temp-write
│   │   └── rename.ts                # atomic rename orchestration
│   └── approval/
│       └── verify-token.ts          # consumes SPEC-02 approval_token
├── tests/
│   ├── ops/                         # per-op unit tests
│   └── integration/
│       └── end-to-end-canon-addition.test.ts
```

### Record-type TypeScript interfaces

The create-ops and hybrid-file ops below type their payloads against record-class interfaces colocated with the existing `NODE_TYPES` enum in `tools/world-index/src/schema/types.ts` and re-exported from `tools/world-index/src/public/types.ts`. This placement (chosen over defining them inside the patch-engine package) keeps the definitions shared with SPEC-04 validators (`record_schema_compliance` loads the same types) and with SPEC-02 MCP retrieval tools (e.g., `get_record`), and respects the package-boundary rule that `tools/patch-engine` consumes `tools/world-index`'s public API.

| Interface | Status | Corresponding atomic file | Corresponding `NODE_TYPES` entry |
|---|---|---|---|
| `CanonFactRecord` | already present at `tools/world-index/src/schema/types.ts:131` | `_source/canon/CF-NNNN.yaml` | `canon_fact_record` |
| `ChangeLogEntry` | already present at `tools/world-index/src/schema/types.ts:180` | `_source/change-log/CH-NNNN.yaml` | `change_log_entry` |
| `InvariantRecord` | **added by SPEC-03 delivery** | `_source/invariants/<INV-ID>.yaml` | `invariant` |
| `MysteryRecord` | **added by SPEC-03 delivery** | `_source/mystery-reserve/M-NNNN.yaml` | `mystery_reserve_entry` |
| `OpenQuestionRecord` | **added by SPEC-03 delivery** | `_source/open-questions/OQ-NNNN.yaml` | `open_question_entry` |
| `NamedEntityRecord` | **added by SPEC-03 delivery** | `_source/entities/ENT-NNNN.yaml` | `named_entity` |
| `SectionRecord` | **added by SPEC-03 delivery** | `_source/<file-subdir>/SEC-<PREFIX>-NNN.yaml` | `section` |
| `CharacterDossier` | **added by SPEC-03 delivery** (frontmatter shape) | `characters/<char-slug>.md` frontmatter | `character_record` |
| `DiegeticArtifactFrontmatter` | **added by SPEC-03 delivery** | `diegetic-artifacts/<da-slug>.md` frontmatter | `diegetic_artifact_record` |

Field shapes mirror the atomic YAML schemas per SPEC-13 §B 1:1 (CF, CH, INV, M, OQ, ENT, SEC); hybrid-file frontmatter interfaces mirror the YAML frontmatter block above the `---` fence in each per-file artifact. These interfaces are the compile-time surface the ops below reference (`{cf_record: CanonFactRecord}`, `{inv_record: InvariantRecord}`, etc.). Runtime schema compliance is enforced by SPEC-04's `record_schema_compliance` validator against the corresponding JSON Schemas.

### Operation vocabulary (post-SPEC-13)

Atomization under SPEC-13 simplifies the op surface substantially. Retired ops were artifacts of monolithic-file storage (markdown-anchor navigation, HTML-comment attribution authoring); atomic records replace those with ID addressing and structured fields.

**Retired ops** (pre-SPEC-13): `insert_before_node`, `insert_after_node`, `replace_node`, `insert_under_heading`, `append_bullet_cluster`, `append_heading_section`, `insert_attribution_comment`, `append_cf_record`, `append_change_log_entry`, `replace_yaml_field`, `append_list_item` — all retired. Markdown-anchor navigation disappears with atomic records. Attribution-comment generation is retired because attribution is now a first-class field on records (`extensions[].originating_cf`, etc.). The legacy `append_cf_record` / `append_change_log_entry` ops are replaced by `create_cf_record` / `create_ch_record`. `replace_yaml_field` / `append_list_item` merge into the generic `update_record_field`.

**Create ops** (one per atomic record class; writes a new `_source/*.yaml` file):

| Op | Semantics | Payload |
|---|---|---|
| `create_cf_record` | Write a new CF record to `_source/canon/CF-NNNN.yaml` | `{cf_record: CanonFactRecord}` |
| `create_ch_record` | Write a new CH record to `_source/change-log/CH-NNNN.yaml` | `{ch_record: ChangeLogEntry}` |
| `create_inv_record` | Write a new invariant to `_source/invariants/<ID>.yaml` | `{inv_record: InvariantRecord}` |
| `create_m_record` | Write a new Mystery Reserve entry to `_source/mystery-reserve/M-NNNN.yaml` | `{m_record: MysteryRecord}` |
| `create_oq_record` | Write a new Open Question to `_source/open-questions/OQ-NNNN.yaml` | `{oq_record: OpenQuestionRecord}` |
| `create_ent_record` | Write a new Named Entity to `_source/entities/ENT-NNNN.yaml` | `{ent_record: NamedEntityRecord}` |
| `create_sec_record` | Write a new Prose Section to `_source/<file-subdir>/SEC-<PREFIX>-NNN.yaml` | `{sec_record: SectionRecord}` |

**Update ops** (mutate an existing atomic record):

| Op | Semantics | Payload |
|---|---|---|
| `update_record_field` | Set or append a field on an existing record by ID + field path | `{target_record_id, field_path: string[], operation: 'set' \| 'append_list' \| 'append_text', new_value: any, retcon_attestation?: RetconAttestation}` |
| `append_extension` | Append an entry to any record's `extensions[]` array (uniform Rule 6 attribution surface across INV / M / OQ / SEC) | `{target_record_id, extension: {originating_cf, change_id, date, label, body}}` |
| `append_touched_by_cf` | Append a CF-ID to a SEC record's `touched_by_cf[]` array | `{target_sec_id, cf_id}`. **Engine auto-adds** this op whenever `append_extension` targets a SEC with a new `originating_cf`; the op is also callable directly during migration or retrofit. |
| `append_modification_history_entry` | Append a typed entry to a CF's `modification_history` array | `{target_cf_id, change_id, originating_cf, date, summary}` |

**Retcon discipline on `update_record_field`**: the `notes` field and `modification_history` array are freely appendable on accepted CFs without retcon attestation. The `extensions` array on any record is freely appendable. Any other structural-field mutation (e.g., changing `statement`, `scope`, `domains_affected`, `distribution`, `visible_consequences`) requires `retcon_attestation` with `{retcon_type: <A-F per continuity-audit taxonomy>, originating_ch: CH-NNNN, rationale: string}`. Validator `rule6_no_silent_retcons` enforces.

**Hybrid-file ops** (per-file artifacts; unchanged from pre-SPEC-13 behavior):

| Op | Semantics | Payload |
|---|---|---|
| `append_adjudication_record` | Write a new `adjudications/PA-NNNN-<verdict>.md` file | `{verdict, body, filename}` |
| `append_character_record` | Write a new `characters/<char-slug>.md` file (YAML frontmatter + prose body) | `{char_record: CharacterDossier, body_markdown: string, filename}` |
| `append_diegetic_artifact_record` | Write a new `diegetic-artifacts/<da-slug>.md` file | `{da_record: DiegeticArtifactFrontmatter, body_markdown: string, filename}` |

**Not included (deliberate)**: no `replace_*` op, no `delete_*` op, no `move_*` op for atomic records. Append-only discipline is structural: a CF's YAML file is never removed or wholesale-replaced; updates happen only through `update_record_field` / `append_extension` / `append_modification_history_entry`. The only legitimate delete is via `git revert`.

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
    inv_ids?: string[];
    m_ids?: string[];
    oq_ids?: string[];
    ent_ids?: string[];
    sec_ids?: string[];
    pa_ids?: string[];
    char_ids?: string[];
    da_ids?: string[];
  };
  patches: PatchOperation[];
}

interface PatchOperation {
  op: OperationKind;
  target_world: string;
  target_record_id?: string;            // for update / append_* ops targeting an existing record
  target_file?: string;                 // for hybrid-file ops (adjudication, character, diegetic-artifact)
  expected_content_hash?: string;       // content_hash of the target record at plan-authoring time (atomic records)
  expected_anchor_checksum?: string;    // retained only for hybrid-file ops (body-prose anchor integrity)
  payload: OperationPayload;            // shape varies per op
  retcon_attestation?: {                // required on update_record_field against structural fields of accepted CFs
    retcon_type: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    originating_ch: string;             // CH-NNNN
    rationale: string;
  };
  failure_mode?: 'strict' | 'relocate_on_miss';  // default 'strict'
}
```

### Write-order discipline (engine-enforced, 3 tiers)

Atomization collapses the pre-SPEC-13 write-order from the 3-sub-step ledger-sequence into a simpler 3-tier order. Because there's no monolithic ledger to serialize writes against, the tiers are commutative within; only the inter-tier order is constrained.

The engine preserves tier order **by reordering patches internally** before apply, regardless of the plan's patch-list order:

1. **Tier 1 — All `create_*` ops** (in parallel; independent per-file writes). Includes `create_cf_record`, `create_ch_record`, `create_inv_record`, `create_m_record`, `create_oq_record`, `create_ent_record`, `create_sec_record`.
2. **Tier 2 — All `update_record_field` / `append_extension` / `append_touched_by_cf` / `append_modification_history_entry` ops** (in parallel; targets created in Tier 1 or pre-existing records). The engine auto-adds `append_touched_by_cf` for any `append_extension` targeting a SEC where the extension's `originating_cf` isn't already in `touched_by_cf[]`.
3. **Tier 3 — `append_adjudication_record` / `append_character_record` / `append_diegetic_artifact_record` ops** (per-file hybrid artifacts). Written last because their content references Tier 1/2 record IDs; writing them after the referenced records exist keeps the on-disk graph consistent.

If the engine crashes between Tier 2 and Tier 3, the atomic records reflect post-operation state but the adjudication / character / artifact references to them have not yet been written; future runs recover cleanly (reference-free ids are acceptable pre-state). Inverse ordering (adjudication-first) would leave orphaned references and is structurally forbidden.

Within a tier, ops are independent and apply in parallel — there's no inter-op dependency within Tier 1 (each op writes a different new file), within Tier 2 (each op targets a distinct record or a distinct field path), or within Tier 3 (each op writes a different new per-file artifact).

### Atomicity model (two-phase commit)

**Phase A — Validate (no writes)**:
1. Verify `approval_token` (signature + expiry + single-use-not-yet-consumed)
2. Verify every op's `expected_content_hash` matches current index state (for atomic records, hash is computed over the record's canonical-YAML serialization; for hybrid files, over the full file contents)
3. Verify every hybrid-file op's `expected_anchor_checksum` matches (atomic-record ops don't use anchor checksums — the `target_record_id` is itself the anchor)
4. Verify every op's `expected_id_allocations` still match `allocate_next_id` for the relevant classes (detect race)
5. Delegate to SPEC-04 validator framework with `mode: 'pre-apply'`
6. Any failure → abort; return structured error; no write

**Phase B — Apply**:
1. For each unique `target_file` (atomic record path or hybrid-file path), create a temp file: `<file>.patch-engine.<plan_id>.tmp`
2. Build the final content for each temp file by applying all ops targeting it (in engine-order per the 3-tier write order; within a tier, ops on the same file are sequenced deterministically by op insertion order in the envelope)
3. For each temp file, fsync and `rename()` to final path (atomic on POSIX)
4. Mark `approval_token` consumed
5. Return patch receipt + trigger index sync (`world-index sync <world-slug>`)

If step 2 or 3 fails for any file, unlink all `.patch-engine.<plan_id>.tmp` files and return error; disk is unchanged from Phase A start. Note: no Phase B compile step is needed — atomic records are the canonical form; there are no compiled views to regenerate.

### Anchor-miss handling (hybrid files only)

Atomic-record ops don't have anchor drift because the target is a whole record addressed by ID. Content-hash mismatch on an atomic record means another plan mutated the record between plan-authoring and submission, triggering `{code: 'record_hash_drift', target_record_id, expected_hash, actual_hash}` — skill re-retrieves and resubmits.

For hybrid-file ops (character / diegetic-artifact / adjudication, which mix YAML frontmatter with prose body), anchor-miss handling retains the pre-SPEC-13 semantics:
- `failure_mode: 'strict'` (default): return structured error `{code: 'anchor_drift', target_file, expected_checksum, actual_checksum, drift_size_estimate}`. No fuzzy match; skill re-fetches and resubmits.
- `failure_mode: 'relocate_on_miss'`: reserved for future use; not implemented.

### Attribution (structural, not generated)

Attribution is a field on the target record, not an HTML-comment generated into prose. The engine does not auto-stamp HTML comments.

- New CF records carry their own `source_basis.direct_user_approval` and `source_basis.derived_from` fields per the CF schema.
- Modifications to an existing record append to `extensions[]` (for INV / M / OQ / SEC) or `modification_history[]` (for CF) or `notes` (for CF, via `update_record_field` on the `notes` field with `operation: 'append_text'` and a standardized `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): <summary>` format). The engine does not format these lines; the skill assembles them from the CH record.
- The legacy `<!-- added by CF-NNNN -->` / `<!-- clarified by CH-NNNN -->` HTML-comment pattern is no longer an authoring surface. On pre-SPEC-13 worlds (none exist post-migration), the patterns were generated by the engine; on atomic-source worlds, they exist only in the rendered output of `world-index render` (read-only compile for human review), assembled from `extensions[]` entries at render time.

Validator `rule6_no_silent_retcons` (SPEC-04) enforces: every CF modification has a CH entry with matching `affected_fact_ids`, a `modification_history` entry on the modified CF, and an extension entry (for INV / M / OQ / SEC) or notes-field append (for CF) — all structural, all checkable against parsed YAML.

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
    inv_ids?: string[];
    m_ids?: string[];
    oq_ids?: string[];
    ent_ids?: string[];
    sec_ids?: string[];
    pa_ids?: string[];
    char_ids?: string[];
    da_ids?: string[];
  };
  index_sync_duration_ms: number;
}
```

**Supersession note**: `PatchReceipt` is owned by `tools/patch-engine` and re-exported by `tools/world-mcp` as part of SPEC-03 delivery. The shape declared above supersedes the Phase 1 stub at `tools/world-mcp/src/tools/submit-patch-plan.ts:8–28`, which declares only the narrow `{cf_ids?, ch_ids?, pa_ids?}` variant under `id_allocations_consumed`. On SPEC-03 landing, the stub's local type declaration is replaced by an import from `@worldloom/patch-engine` (matching the existing TODO at `submit-patch-plan.ts:61–63`), and `id_allocations_consumed` mirrors the ten-class surface of `expected_id_allocations` in the envelope.

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| Rule 6 No Silent Retcons | Every mutation carries explicit structural attribution (`extensions[].originating_cf`, `modification_history[].change_id`); append-only op vocabulary encodes the invariant; retcon on structural CF fields requires explicit `retcon_attestation` |
| §Change Control Policy | Patch plan IS the downstream-updates commitment; receipt IS the completion record |
| §Canonical Storage Layer (SPEC-13) | Engine writes atomic records to `_source/`; preserves per-file append-only discipline; compiled views don't exist to maintain |
| §Mandatory World Files | Preserved; engine creates atomic YAML records under `_source/` subdirectories and per-file hybrid artifacts (characters, diegetic artifacts, adjudications) |
| §Canon Fact Record Schema | `create_cf_record` payload typed against `CanonFactRecord` TypeScript interface; schema drift caught at compile time + runtime via `record_schema_compliance` validator |
| Rule 7 Preserve Mystery Deliberately | MR firewall enforced pre-apply via SPEC-04 `rule7_mystery_reserve_preservation`; engine exposes no MR-resolution op; append-only `extensions[]` on M records preserves Mystery Reserve entries structurally |
| HARD-GATE discipline | `approval_token` ties user consent to specific plan bytes; no unsigned submission succeeds |

## Verification

- **Unit**: each op tested against fixture files (before/after snapshots)
- **Integration**: replay a historical `canon-addition` delivery (e.g., CH-0013's five parallel named-polity-instance commitments on animalia, post-migration) as a patch plan; verify the resulting `_source/` tree state matches the expected post-delivery state record-by-record
- **Atomicity**: inject failure at various points (Phase A validate, Phase B temp-write, Phase B rename); verify no partial write on disk
- **Record-hash drift**: mutate a target atomic record between plan authoring and submit; verify engine rejects with `record_hash_drift` code
- **Hybrid anchor drift**: mutate a target character / diegetic-artifact / adjudication file between plan authoring and submit; verify engine rejects with `anchor_drift` code
- **Approval token**: unsigned, expired, tampered, replayed tokens all rejected
- **Write-order**: submit a plan with patches in pathological order (Tier 3 ops first, Tier 1 ops last); verify engine reorders internally and final state matches canonical 3-tier order
- **Post-apply sync integration**: apply a patch plan creating a new CF record and a new SEC record; run `world-index sync <world-slug>`; verify both records appear in the index with correct `node_type`, `content_hash`, and `file_path`; verify a subsequent `find_sections_touched_by(<new-cf-id>)` (per SPEC-02 Phase 2 update) returns the new SEC
- **Append-only**: attempt to construct a hypothetical `replace_cf_record` or `delete_cf_record` op; verify compile-time rejection (op not in union) and runtime rejection (schema validator)
- **Retcon attestation**: attempt `update_record_field` against a CF's `statement` field without `retcon_attestation`; verify engine rejects
- **Attribution**: submit a plan creating a CF and appending extensions to three SEC records; verify all `extensions[]` entries are structurally present with correct `originating_cf` / `change_id` / `date` / `label` / `body`; verify `touched_by_cf[]` auto-updated on each SEC
- **`append_touched_by_cf` auto-add**: submit an `append_extension` op targeting a SEC without an explicit `append_touched_by_cf` op; verify engine auto-adds the `append_touched_by_cf` op into the applied plan

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
- **Hook 3 coordination (SPEC-05 Phase 2 Part B)**: the engine writes atomic records to `_source/` via `fs.writeFile` (bypassing Claude's Edit/Write tools, per §Approach). SPEC-05 Hook 3 is absent today (Phase 1 landed Hooks 1, 2, 4 only) and must be designed to exclude engine `fs.writeFile` calls from interception. If Hook 3's eventual implementation intercepts by file-path-pattern without a caller-process carve-out, engine writes break. Mitigation: SPEC-05 Part B design reviews this spec's `fs.writeFile` target list (`_source/<subdir>/*.yaml`, `characters/*.md`, `diegetic-artifacts/*.md`, `adjudications/*.md`) before finalizing Hook 3 block rules; the carve-out discriminator can be either process-identity (Hook 3 runs in Claude's tool-use lifecycle, engine runs out-of-process) or a per-write marker file, whichever SPEC-05 Part B selects.
