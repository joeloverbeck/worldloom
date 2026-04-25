# SPEC14PAVOC-005: Animalia CF Cleanup — Domain Re-tags, Mystery Enum Normalizations, required_world_updates Extensions

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: No code changes — content-only migration. Uses `update_record_field` and `append_extension` ops landed in archived SPEC-03; relies on the validator changes from `SPEC14PAVOC-001`.
**Deps**: SPEC-14, `archive/tickets/SPEC14PAVOC-001.md` (validator's status-coupled mystery rule + `geography` domain in canonical enum + retired adjudication_discovery_fields), **SPEC14PAVOC-002** (engine's bidirectional `append_touched_by_cf` — relevant for verifying the bidirectional fix on CFs being touched here)

## Problem

Three classes of GF findings are CF-side data integrity issues that close via factual edits to `_source/canon/CF-NNNN.yaml`:

- **GF-0010 (45 findings)**: 14 CFs are cited by sections in their `touched_by_cf` arrays, but the CFs' own `required_world_updates` fields don't list the section's file_class. Per Decision D (engine fail-fast), this is the bidirectional integrity gap; this ticket extends the CFs so the post-fix state is consistent.
- **GF-0006 (17 findings)**: 7 CFs use `history`/`memory`/`geography` in `domains_affected` — non-canonical (pre-`SPEC14PAVOC-001` enum). Per Decision F: re-tag `history`/`memory` → `memory_and_myth`; keep `geography` (now canonical post-`SPEC14PAVOC-001`).
- **GF-0008 (8 findings)**: 8 Mystery records use `zero`/`medium-low`/`LOW`/`very` in `future_resolution_safety`. Per Decision G (status-coupled): `forbidden`-status mysteries → `none`; `active`/`passive` → `low|medium|high` (case-by-case judgment).

Total: 70 of 224 grandfathered findings closed by this ticket.

## Assumption Reassessment (2026-04-25)

1. CF-0010 inventory (extracted from grandfathering YAML, 2026-04-25 baseline run):
   - CF-0006: missing `PEOPLES_AND_SPECIES`, `TIMELINE`
   - CF-0009: missing `TIMELINE`
   - CF-0017: missing `GEOGRAPHY`, `TIMELINE`
   - CF-0020: missing `GEOGRAPHY`
   - CF-0023: missing `GEOGRAPHY`, `TIMELINE`
   - CF-0025: missing `GEOGRAPHY`, `TIMELINE`
   - CF-0026: missing `ECONOMY_AND_RESOURCES`, `GEOGRAPHY`, `MAGIC_OR_TECH_SYSTEMS`, `TIMELINE`
   - CF-0027: missing `ECONOMY_AND_RESOURCES`, `INSTITUTIONS`
   - CF-0029: missing `ECONOMY_AND_RESOURCES`, `GEOGRAPHY`, `TIMELINE`
   - CF-0030: missing `GEOGRAPHY`, `MAGIC_OR_TECH_SYSTEMS`
   - CF-0031: missing `GEOGRAPHY`
   - CF-0034: missing `MAGIC_OR_TECH_SYSTEMS`, `PEOPLES_AND_SPECIES`
   - CF-0042: missing `MAGIC_OR_TECH_SYSTEMS`
   - CF-0044: missing `PEOPLES_AND_SPECIES`
   - **Total file_class extensions to apply: 28 across 14 CFs.**
2. CF domain re-tags (from inspection of `domains_affected` arrays — confirmed via `grep -A 5 "domains_affected" worlds/animalia/_source/canon/CF-*.yaml` at 2026-04-25):
   - `history`: 3 CFs → CF-0004 (`magic`/`religion`/`history`/`settlement_life`), CF-0023 (`magic`/`economy`/`religion`/`law`/`history`), CF-0027 (`history`/`geography`/`magic`/`memory`)
   - `memory`: 4 CFs → CF-0021 (`magic`/`economy`/`law`/`settlement_life`/`religion` — wait, doesn't actually use `memory`; need to recheck via grep at implementation time), and others per the grep at SPEC14PAVOC-005 implementation
   - `geography`: 1 CF → CF-0027 (kept as-is post-`SPEC14PAVOC-001` canonical addition)
   - **Re-tag policy**: `history` → `memory_and_myth`; `memory` → `memory_and_myth`. Where both exist on the same CF after rename, dedupe.
3. Mystery `future_resolution_safety` fixes (from grandfathering YAML, GF-0008):
   - M-2: `medium-low` → `low` (status: `active`)
   - M-4: `very` → `low` (status: `active`; "very" is truncated, likely meant "very low")
   - M-5: `zero` → `none` (status: `forbidden`)
   - M-7: `medium-low` → `low` (status: `active`)
   - M-15: `zero` → `none` (status: `forbidden`)
   - M-16: `zero` → `none` (status: `forbidden`)
   - M-17: `zero` → `none` (status: `forbidden`)
   - M-20: `LOW` → `low` (status: TBD — confirm at implementation time)
   - **Status-coupled validation**: each fix must check that the M record's `status` field matches the chosen `future_resolution_safety` value per the SPEC14PAVOC-001 rule (`forbidden` → `none`; `active`/`passive` → `low|medium|high`).
4. The 70 fixes go through patch engine `update_record_field` ops (single op per CF / per M record), batched into a single patch plan per record class. Per CLAUDE.md, `_source/` writes MUST go through engine.
5. CF `required_world_updates` is a list field; the appropriate op is `update_record_field` with `operation: append_list`. Existing op exists per archived SPEC-03 §Operations — no new op needed.
6. CF `domains_affected` re-tag is a `update_record_field` with `operation: set` (replacing the entire list with the renamed values). Alternative: two ops (one to remove the old value, one to append the new) — but `set` is cleaner and atomic.
7. Mystery `future_resolution_safety` fix is `update_record_field` with `operation: set`.
8. After the patch plans land, `world-index build animalia` reindexes; `world-validate animalia` reports zero GF-0006/0008/0010 findings.
9. Cross-skill blast: none — this is one-shot historical data migration, no skill or schema changes.

## Architecture Check

1. Closing the bidirectional CF↔SEC drift at the source means subsequent canon-addition runs (post `SPEC14PAVOC-002`) won't be able to re-introduce the drift (engine fail-fast). The 45 GF-0010 findings disappear permanently.
2. Domain re-tag to `memory_and_myth` collapses redundant vocabulary (`history` ≈ time-shape captured by `temporal scope`; `memory` is a subset of `memory_and_myth`). The single canonical token is more semantically coherent.
3. Status-coupled mystery enum normalization aligns animalia content with SPEC-14's structural rule. M-5 in particular gains the `none` value that signals "this is a forbidden mystery, not a low-resolution-safety one" — a real semantic improvement.

## Verification Layers

1. `required_world_updates` extensions → `world-validate animalia` reports zero `touched_by_cf_completeness.sec_to_cf_miss` findings.
2. Domain re-tags → `world-validate animalia` reports zero `rule2.non_canonical_domain` findings.
3. Mystery enum normalizations → `world-validate animalia` reports zero `rule7.future_resolution_safety_status_mismatch` findings (the new code from `SPEC14PAVOC-001`).
4. Engine integrity → each `update_record_field` op carries the correct `expected_content_hash` per archived SPEC-03; engine succeeds atomically; on-disk YAML reflects the change; world index reindex picks up the new state.

## What to Change

### 1. Build the patch plan for `required_world_updates` extensions

For each of the 14 CFs in the GF-0010 inventory, build an `update_record_field` op:

```typescript
{
  op: "update_record_field",
  payload: {
    target_record_id: "CF-0006",
    field_path: ["required_world_updates"],
    operation: "append_list",
    new_value: "PEOPLES_AND_SPECIES"
  }
}
// + a second op for "TIMELINE", and so on
```

Total ops: 28 (sum of missing file_classes per CF). Batch into a single patch plan envelope; engine applies all atomically.

### 2. Build the patch plan for domain re-tags

For each affected CF (3 with `history`, 4 with `memory`, possibly overlapping), build an `update_record_field` op:

```typescript
{
  op: "update_record_field",
  payload: {
    target_record_id: "CF-0004",
    field_path: ["domains_affected"],
    operation: "set",
    new_value: ["magic", "religion", "memory_and_myth", "settlement_life"]  // history → memory_and_myth
  }
}
```

Run dedup if a CF already has `memory_and_myth` after the rename.

### 3. Build the patch plan for mystery enum normalizations

For each of the 8 M records:

```typescript
{
  op: "update_record_field",
  payload: {
    target_record_id: "M-5",
    field_path: ["future_resolution_safety"],
    operation: "set",
    new_value: "none"
  }
}
```

For non-`forbidden`-status mysteries (M-2, M-4, M-7, M-20), the new value is `low` (per the inventory above; some may warrant `medium` based on closer reading — judgment call at implementation time).

### 4. Submit and verify

Submit each batch via `mcp__worldloom__submit_patch_plan`. After all three batches land:

```bash
cd /home/joeloverbeck/projects/worldloom
node tools/world-index/dist/src/cli/world-index.js build animalia
node tools/validators/dist/src/cli/world-validate.js animalia --json > /tmp/post-spec14-005.json
```

Confirm:
- Zero `touched_by_cf_completeness.sec_to_cf_miss`
- Zero `rule2.non_canonical_domain`
- Zero `rule7.future_resolution_safety_status_mismatch`

### 5. Update grandfathering YAML

Remove entries `GF-0006`, `GF-0008`, `GF-0010` from `worlds/animalia/audits/validation-grandfathering.yaml`.

## Files to Touch

- `worlds/animalia/_source/canon/CF-0006.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0009.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0017.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0020.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0023.yaml` (modify via engine — `required_world_updates` extension + domain re-tag)
- `worlds/animalia/_source/canon/CF-0025.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0026.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0027.yaml` (modify via engine — `required_world_updates` extension + domain re-tag)
- `worlds/animalia/_source/canon/CF-0029.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0030.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0031.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0034.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0042.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0044.yaml` (modify via engine — `required_world_updates` extension)
- `worlds/animalia/_source/canon/CF-0004.yaml` (modify via engine — domain re-tag `history` → `memory_and_myth`)
- `worlds/animalia/_source/canon/CF-0021.yaml` (modify via engine — domain re-tag `memory` → `memory_and_myth`; verify at implementation time)
- `worlds/animalia/_source/canon/CF-0024.yaml` (modify via engine — domain re-tag `memory` → `memory_and_myth`; verify at implementation time)
- `worlds/animalia/_source/canon/CF-0028.yaml` (modify via engine — domain re-tag `memory` → `memory_and_myth`; verify at implementation time)
- `worlds/animalia/_source/mystery-reserve/M-2.yaml` (modify via engine — `medium-low` → `low`)
- `worlds/animalia/_source/mystery-reserve/M-4.yaml` (modify via engine — `very` → `low`)
- `worlds/animalia/_source/mystery-reserve/M-5.yaml` (modify via engine — `zero` → `none`)
- `worlds/animalia/_source/mystery-reserve/M-7.yaml` (modify via engine — `medium-low` → `low`)
- `worlds/animalia/_source/mystery-reserve/M-15.yaml` (modify via engine — `zero` → `none`)
- `worlds/animalia/_source/mystery-reserve/M-16.yaml` (modify via engine — `zero` → `none`)
- `worlds/animalia/_source/mystery-reserve/M-17.yaml` (modify via engine — `zero` → `none`)
- `worlds/animalia/_source/mystery-reserve/M-20.yaml` (modify via engine — `LOW` → `low`)
- `worlds/animalia/audits/validation-grandfathering.yaml` (modify — remove GF-0006, GF-0008, GF-0010 entries)

## Out of Scope

- PA file migration (lands in `SPEC14PAVOC-004`).
- One-off integrity fixes — CHAR-0002, DA-0002, M-5 disallowed_cheap_answers (M-5 future_resolution_safety IS in scope here, but `disallowed_cheap_answers` is not), CF-0003 modification_history retrofit, CF-0020 dangling reference (CF-0020 `required_world_updates` extension IS in scope; the dangling reference fix is separate) — all land in `SPEC14PAVOC-006`.
- Re-evaluating CF authoring decisions (e.g., should CF-0027 actually have `geography` as a domain? — out of scope; keep authorial intent).
- Any change to invariants, sections, or character/DA frontmatter.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js animalia --json | jq '.verdicts | map(select(.code == "touched_by_cf_completeness.sec_to_cf_miss")) | length'` returns `0`.
2. `... | jq '.verdicts | map(select(.code == "rule2.non_canonical_domain")) | length'` returns `0`.
3. `... | jq '.verdicts | map(select(.code == "rule7.future_resolution_safety_status_mismatch")) | length'` returns `0`.
4. `world-index build animalia` succeeds; on-disk `_source/canon/CF-NNNN.yaml` files for each modified CF reflect the new `required_world_updates` and `domains_affected` arrays.
5. On-disk `_source/mystery-reserve/M-NNNN.yaml` files for each modified M record reflect the new `future_resolution_safety` value.

### Invariants

1. Every section's `touched_by_cf` reference resolves to a CF whose `required_world_updates` includes the section's file_class (post-this-ticket; future canon-addition runs maintain via engine fail-fast).
2. No CF in `worlds/animalia/_source/canon/` uses `history`, `memory`, or any other non-canonical domain (per `tools/world-index/src/public/canonical-vocabularies.ts` post-`SPEC14PAVOC-001` + `archive/tickets/SPEC14PAVOC-003.md`).
3. Every Mystery record in `worlds/animalia/_source/mystery-reserve/` satisfies the status-coupled `future_resolution_safety` rule.

## Test Plan

### New/Modified Tests

1. None — content migration; verification is the validator-pass acceptance criterion.

### Commands

1. Build patch plans (see §What to Change steps 1-3).
2. `mcp__worldloom__submit_patch_plan(...)` for each batch (3 batches: required_world_updates, domain re-tags, mystery enum).
3. `node tools/world-index/dist/src/cli/world-index.js build animalia`.
4. `node tools/validators/dist/src/cli/world-validate.js animalia --json > /tmp/post-spec14-005.json`.
5. `jq '.summary' /tmp/post-spec14-005.json` — confirm post-this-ticket validator state.
6. Spot-check: `cat worlds/animalia/_source/canon/CF-0006.yaml | grep -A 5 required_world_updates` confirms PEOPLES_AND_SPECIES and TIMELINE are present.
