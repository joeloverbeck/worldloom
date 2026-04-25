# SPEC14PAVOC-006: Animalia One-Off Integrity Fixes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes (schema-only) — extend `diegetic-artifact-frontmatter.schema.json` and `character-frontmatter.schema.json` to permit `scoped_references` (per SPEC-11 design intent). No engine code changes. Animalia content fixes go through patch engine ops.
**Deps**: SPEC-14, `archive/tickets/SPEC14PAVOC-001.md` (status-coupled mystery rule active so M-5's `disallowed_cheap_answers` fix is verifiable; geography in canonical enum)

## Problem

Six small-scale animalia data integrity findings remain after `SPEC14PAVOC-004` and `SPEC14PAVOC-005`. Each is independent of the others and resolves with a targeted fix:

- **GF-0002 (1 finding — CF-0003)**: `notes` mentions "Modified 2026-04-18 by CH-0002" but `modification_history[]` lacks the entry. Resolution: append the missing modification history entry.
- **GF-0003 (2 findings — DA-0002)**: `record_schema_compliance.additionalProperties` — frontmatter has `scoped_references` field not in `diegetic-artifact-frontmatter.schema.json`. Per SPEC-11, `scoped_references` IS a first-class authority surface. Resolution: extend the schema to include `scoped_references` as optional (consistent with SPEC-11 design intent).
- **GF-0005 (2 findings — CHAR-0002)**: `major_local_pressures[0]` is a YAML dict (not a string) because the source content includes an unescaped colon in a parenthetical (`(CF-0024 Value Stores: portable reputation)`), which YAML parses as a key:value pair. Resolution: quote the affected string in the frontmatter so YAML treats it as a single string scalar.
- **GF-0007 (1 finding — CF-0020)**: `modification_history` references CH-0004, but CH-0004 doesn't list CF-0020 in its affected-record set. Resolution: investigate which side is correct — either remove the spurious modification_history entry from CF-0020, or extend CH-0004 to actually affect CF-0020 (judgment-required at implementation time).
- **GF-0009 (1 finding — M-5)**: `disallowed_cheap_answers` is empty `[]`, despite M-5 being a load-bearing forbidden mystery (Is Sentience Itself an Artifact Effect?) with multiple cross-application firewalls. Resolution: author at least one entry — likely several, since M-5's existing extensions name forbidden cheap answers in their bodies (e.g., "Mutated-beast lineage reinterpreted as proto-animal-folk evolutionary precursor — forbidden reveal").

Total: 7 of 224 grandfathered findings closed by this ticket.

## Assumption Reassessment (2026-04-25)

1. CF-0003's missing modification_history entry: `notes` mention "Modified 2026-04-18 by CH-0002". CH-0002's affected-record set includes CF-0003 (per the existing `_source/change-log/CH-0002.yaml` — verify at implementation time). The fix is `append_modification_history_entry` op against CF-0003 with `change_id: CH-0002`, `originating_cf: CF-0003`, `date: 2026-04-18`, `summary: <derive from CH-0002.notes or CF-0003.notes content>`.
2. DA-0002's `scoped_references` is per SPEC-11 §Canonical Entity Authority Surfaces. The validator schema at `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` was authored before SPEC-11 finalized this field as a first-class surface. Extending the schema is additive (`scoped_references` becomes an optional array property); no required-field change. Cross-skill blast: the character-frontmatter schema may have the same gap — confirm and extend symmetrically if so.
3. CHAR-0002's first list item has an embedded colon. YAML parses `- Age-and-body decline set against top-tier contractor reputation (CF-0024 Value Stores: portable reputation) — every slower...` as a mapping `{Age-and-body decline...Value Stores: portable reputation) — every slower...}`. Fix: quote the string with `- "Age-and-body decline...portable reputation) — every slower..."` or use `- |\n  Age-and-body...`. The ENTIRE list of bullet items in `major_local_pressures` should be audited for similar issues at implementation time.
4. CF-0020's dangling reference: `worlds/animalia/_source/canon/CF-0020.yaml` modification_history references CH-0004; `worlds/animalia/_source/change-log/CH-0004.yaml` does not list CF-0020 in its `affected_canon_facts` (or equivalent field). Read both files at implementation time; the resolution is judgment-required:
   - If CH-0004 SHOULD affect CF-0020 (the modification_history entry on CF-0020 is correct, CH-0004 is incomplete) → extend CH-0004 to add CF-0020.
   - If CH-0004 does NOT affect CF-0020 (the modification_history entry is spurious) → remove it from CF-0020.
5. M-5's `disallowed_cheap_answers`: M-5 has 5 extensions naming forbidden reveals in their bodies. Extract the explicit "*Added to disallowed cheap answers:*" quoted strings from each extension's body and consolidate into the top-level `disallowed_cheap_answers` array. Per spot-check at 2026-04-25:
   - From CF-0031 extension: `"Registry-family patterns reinterpreted as Maker-lineage markers — forbidden reveal."`
   - From CF-0035 extension: `"A mutated beast encountered by a surviving prospector that communicates meaningfully with the hunter — forbidden reveal."`, `"Mutated-beast lineage reinterpreted as proto-animal-folk evolutionary precursor — forbidden reveal."`, `"Artifact-exposure produced sentience in a non-sentient beast — forbidden reveal."`
   - From CF-0036 extension: 4 more forbidden reveals.
   - **Total candidates: ~8 strings.** Authoritative consolidation at implementation time.
6. Schema extension (DA + CHAR `scoped_references`) is additive and does NOT need a new SPEC; it's a small consistency fix folded into this ticket per SPEC-14 §Risks ("`scoped_references` schema gap").
7. Pipeline-wide grep: `scoped_references` is referenced in `tools/world-index/src/parse/scoped.ts` (existing parser) and `tools/world-mcp/src/context-packet/` consumers (existing readers). The schema gap is the only inconsistency — runtime code already handles the field.

## Architecture Check

1. The 5 fix categories are independent; bundling them in one ticket is justified by their small individual scope and their shared "one-off" character. Each could be its own micro-ticket, but the operational cost of 5 separate ticket lifecycles outweighs the benefit.
2. Schema extension for `scoped_references` is the right scope — adding a real authority surface to the schema, not loosening validation.
3. Investigation-required CF-0020 case is genuinely judgment-required; bundling it here keeps the migration coherent (rather than spawning a deeper investigation ticket).

## Verification Layers

1. CF-0003 modification_history → `world-validate animalia` reports zero `modification_history_retrofit.missing_entry` findings.
2. DA-0002 frontmatter → `world-validate animalia` reports zero `record_schema_compliance.additionalProperties` findings against `diegetic-artifacts/*.md`.
3. CHAR-0002 type fix → `world-validate animalia` reports zero `record_schema_compliance.type` findings against `characters/*.md`.
4. CF-0020 dangling fix → `world-validate animalia` reports zero `rule6.dangling_modification_history` findings.
5. M-5 disallowed_cheap_answers → `world-validate animalia` reports zero `rule7.missing_disallowed_cheap_answers` findings.
6. Schema sanity → `tools/validators/tests/structural/record-schema-compliance.test.ts` extended with a fixture asserting a DA frontmatter with `scoped_references` passes.

## What to Change

### 1. Extend DA + CHAR frontmatter schemas to include `scoped_references`

In `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`, add to `properties`:

```json
"scoped_references": {
  "type": "array",
  "items": {
    "type": "object",
    "additionalProperties": false,
    "required": ["name", "kind", "relation"],
    "properties": {
      "name": { "type": "string" },
      "kind": { "type": "string" },
      "relation": { "type": "string" },
      "aliases": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

(Note: the inner schema may need refinement based on `tools/world-index/src/parse/scoped.ts:194` `ParsedScopedReferenceEntry` — confirm at implementation time and align.)

Apply the same extension to `tools/validators/src/schemas/character-frontmatter.schema.json`.

### 2. CF-0003 modification_history entry

Build a patch plan with one `append_modification_history_entry` op:

```typescript
{
  op: "append_modification_history_entry",
  payload: {
    target_cf_id: "CF-0003",
    change_id: "CH-0002",
    originating_cf: "CF-0003",
    date: "2026-04-18",
    summary: "<derive from CH-0002.notes or CF-0003.notes>"
  }
}
```

Submit via `mcp__worldloom__submit_patch_plan`.

### 3. CHAR-0002 YAML quoting

Direct edit to `worlds/animalia/characters/melissa-threadscar.md` frontmatter: re-quote each `major_local_pressures` list item that contains an unescaped `:` to use double-quoted string form. Audit the entire frontmatter for similar issues (other list-of-strings fields). This is a hybrid file (`characters/`) — currently writable directly per Hook 3 not being active; future canon-aware Hook 3 will block, but not in this Phase.

### 4. CF-0020 dangling modification_history investigation

1. Read `worlds/animalia/_source/canon/CF-0020.yaml` — locate the modification_history entry referencing CH-0004.
2. Read `worlds/animalia/_source/change-log/CH-0004.yaml` — check `affected_canon_facts` (or equivalent) for CF-0020.
3. Cross-reference with CF-0020's `notes` and CH-0004's `notes` to determine intent:
   - If CH-0004's narrative says it affects CF-0020 → extend CH-0004's `affected_canon_facts` via `update_record_field` op (operation: append_list).
   - If CH-0004's narrative does not affect CF-0020 → remove the spurious modification_history entry. The patch engine has `update_record_field` with `set` operation as the available mutation; constructing a set operation that excludes the spurious entry is the mechanism.
4. Apply the chosen fix via patch plan.

### 5. M-5 disallowed_cheap_answers consolidation

1. Read `worlds/animalia/_source/mystery-reserve/M-5.yaml`. Extract the explicit "Added to disallowed cheap answers:" strings from each extension body.
2. Build an `update_record_field` op with `operation: set`, `field_path: ["disallowed_cheap_answers"]`, `new_value: [<extracted strings>]`.
3. Submit via patch plan.

### 6. Update grandfathering YAML

Remove entries `GF-0002`, `GF-0003`, `GF-0005`, `GF-0007`, `GF-0009` from `worlds/animalia/audits/validation-grandfathering.yaml`.

After this ticket and its sibling Tier 3 tickets land, the grandfathering file should contain ZERO entries. If so, archive it (rename to `audits/validation-grandfathering-pre-spec14.yaml`) for audit-trail value.

## Files to Touch

- `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json` (modify — add `scoped_references` property)
- `tools/validators/src/schemas/character-frontmatter.schema.json` (modify — add `scoped_references` property if needed)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — add scoped_references fixture)
- `worlds/animalia/_source/canon/CF-0003.yaml` (modify via engine — append modification_history entry)
- `worlds/animalia/_source/canon/CF-0020.yaml` (modify via engine — investigation-dependent)
- `worlds/animalia/_source/change-log/CH-0004.yaml` (possibly modify via engine — investigation-dependent)
- `worlds/animalia/_source/mystery-reserve/M-5.yaml` (modify via engine — disallowed_cheap_answers)
- `worlds/animalia/characters/melissa-threadscar.md` (modify directly — frontmatter YAML quoting)
- `worlds/animalia/audits/validation-grandfathering.yaml` (modify — remove closed entries; possibly archive if emptied)

## Out of Scope

- PA migration (lands in `SPEC14PAVOC-004`).
- CF cleanup at scale (lands in `SPEC14PAVOC-005`).
- Re-reading the entire animalia corpus for other latent integrity issues — out of scope; only the named GF entries above.
- Refactoring the patch-engine `update_record_field` op to support more granular list mutations (e.g., remove a specific list element by index/value). The existing `set` operation suffices for the CF-0020 case.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — schema extension passes existing tests + new scoped_references fixture passes.
2. `node tools/validators/dist/src/cli/world-validate.js animalia --json | jq '.summary.info_count + .summary.fail_count + .summary.warn_count'` returns `0`.
3. Each one-off finding's specific code returns count `0`:
   - `modification_history_retrofit.missing_entry` → 0
   - `record_schema_compliance.additionalProperties` (DA scope) → 0
   - `record_schema_compliance.type` (CHAR scope) → 0
   - `rule6.dangling_modification_history` → 0
   - `rule7.missing_disallowed_cheap_answers` → 0

### Invariants

1. After this ticket lands (alongside Tier 3 siblings `-004` and `-005`), the grandfathering file contains zero `entries` (or is archived to `pre-spec14` filename).
2. CHAR-0002's `major_local_pressures` is a list of pure strings (no embedded YAML mappings).
3. M-5's `disallowed_cheap_answers` has at least 1 entry (per Rule 7 `rule7.missing_disallowed_cheap_answers` requirement); ideally consolidated from existing extension bodies (~8 entries).
4. CF-0020's modification_history is consistent with CH-0004's affected-record set (bidirectional integrity).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — add fixture: DA frontmatter with `scoped_references` array passes; assert no `additionalProperties` error.

### Commands

1. `cd tools/validators && npm run build && npm test` — schema + tests.
2. Build patch plan with all engine-mediated fixes (CF-0003, CF-0020, M-5); submit.
3. Direct edit CHAR-0002 frontmatter; reindex.
4. `node tools/world-index/dist/src/cli/world-index.js build animalia`.
5. `node tools/validators/dist/src/cli/world-validate.js animalia --json > /tmp/post-spec14-006.json`.
6. `jq '.summary' /tmp/post-spec14-006.json` — confirm zero findings (combined with prior Tier 3 ticket completion).
