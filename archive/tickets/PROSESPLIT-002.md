# PROSESPLIT-002: Extend PG record schema with prose_plan_path / prose_status / deferred_validation_trace + index pages-prose-plans/

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-page.schema.json` schema extension; `tools/world-index/src/enumerate.ts` directory list extension. No runtime patch-engine code change required (`create_pg_record` is a generic record-creation op; payload-level validation flows through `record-schema-compliance.ts`).
**Deps**: None (precedes PROSESPLIT-005, PROSESPLIT-006, PROSESPLIT-007 which depend on the new fields existing).

## Problem

The plan-and-finalize rework requires three new fields on every `_source/pages/PG-NNNN.yaml` record:

- `prose_plan_path: string` (required) — relative path to the comprehensive plan file at `pages-prose-plans/PG-NNNN.md`.
- `prose_status: "pending" | "rendered" | "superseded"` (required) — transitional state field. `pending` at bundle commit; `rendered` after `branching-story-page-prose-finalize` runs; `superseded` if a later run replaces a prior finalize verdict.
- `deferred_validation_trace: object` (required) — three keys (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`) each carrying a string verdict (`"DEFERRED — awaiting prose render"` at bundle commit; `"PASS — <rationale>"` or `"FAIL — <reason>"` after finalize).

The existing `prose_path` field is currently used by the validator at `tools/validators/src/rules/arc_trace_evidence_alignment.ts` to read rendered prose. After this rework, `prose_path` becomes nullable (null until finalize lands). Validators that consume `prose_path` need to handle null gracefully (PROSESPLIT-004 covers `arc_trace_evidence_alignment.ts`).

A new direct-write story-bundle markdown directory `pages-prose-plans/` must be enumerated by `tools/world-index/src/enumerate.ts` so MCP retrieval surfaces the plan files alongside the existing `pages-prose/`, `storylet-batches/`, etc.

## Assumption Reassessment (2026-05-10)

1. PG record JSON schema lives at `tools/validators/src/schemas/story-page.schema.json`. Verified: 11-line schema currently requires only `id` and `story_id`, with `additionalProperties: true`. Field additions are non-breaking at the JSON-schema level for existing bundles unless the new fields are marked required.
2. Schema is consumed by `tools/validators/src/structural/record-schema-compliance.ts` via the `RECORD_TYPE_TO_SCHEMA` map at `tools/validators/src/structural/utils.ts` (referenced from `record-schema-compliance.ts:23`). Schema is also referenced by `tools/world-mcp/src/tools/get-record-schema.ts:82` and `tools/world-mcp/src/tools/describe-envelope-schema.ts:96` — those references resolve dynamically and do not embed field lists, so no MCP-tool code change is needed for the field extension.
3. `prose_ledger_consistency` is NOT a TS validator — there is no `tools/validators/src/rules/prose_ledger_consistency.ts` file. The gate is skill-resident only (lives in `branching-story-page-cycle/references/phase-9-validation-gates.md` and `branching-story-bootstrap/references/phase-9-validation-gates.md`). The design doc's "or equivalent" hedge resolves to: PROSESPLIT-004 covers only `arc_trace_evidence_alignment.ts`; the `prose_ledger_consistency` deferral is skill-prose-only and lives in PROSESPLIT-006 and PROSESPLIT-007.
4. `tools/world-index/src/enumerate.ts:61` currently lists `pages-prose` in the indexable story-bundle directories. Adding `pages-prose-plans` is a one-line array extension. Verified directory list location.
5. `create_pg_record` op at `tools/patch-engine/src/ops/create-story-record.ts:142` is a generic record-creation op (allocation key + id pattern + node type + source dir). No payload-specific TS validation embedded in the op — payload validation flows through `record-schema-compliance.ts`. No patch-engine code change required.
6. Cross-skill / cross-artifact boundary under audit: the PG record schema is consumed by `record-schema-compliance` (validator), `world-mcp/get-record-schema` (MCP tool), `world-mcp/describe-envelope-schema` (MCP tool), and indirectly by every story-pipeline skill that emits or reads PG records. Schema additions are additive (new required fields plus `prose_path` becoming nullable); no consumer needs to drop or rename fields.
7. FOUNDATIONS principle under audit: Rule 1 (No Cosmetic Output) — the new fields are load-bearing once finalize is implemented (PROSESPLIT-005 reads `prose_status`, writes the deferred_validation_trace verdicts, sets `prose_path` post-finalize). They are not cosmetic.
8. Schema extension classification: additive-only at the field level; semi-breaking at the validation level because the new required fields would fail validation against existing bundles. Mitigation: existing bundles grandfather via per-world `audits/validation-grandfathering.yaml` entries (pattern at `tools/validators/src/framework/grandfathering.ts`). The rework's flag-day assumption is that all new PG records (post-rework) carry these fields; pre-rework PG records remain valid via grandfathering or a separate one-shot migration ticket (out of scope here).
9. Adjacent contradiction: `prose_path` was a required string in implicit-schema usage (existing PG records always had it). Making it nullable is a breaking change for any consumer that assumes a non-null value. Verified consumers: `tools/validators/src/rules/arc_trace_evidence_alignment.ts:178` calls `path.join(worldRoot, "stories", storySlug, "pages-prose", \`${pageId}.md\`)` — this is path-construction from `pageId`, not from `prose_path`, so the validator does not actually read the field. Other consumers (health-audit skill, story-fact-promotion-to-canon skill) read prose by page id, not by `prose_path` field. Confirming: making `prose_path` nullable is safe; the validator's null-handling is covered in PROSESPLIT-004 via its conditional `prose_status` skip.

## Architecture Check

1. The three new fields explicitly model the plan-then-finalize lifecycle in the PG record itself, making `prose_status` queryable directly without joining against external state. Consumers can filter rendered-vs-pending pages with one field read.
2. Choosing `update_record_field` semantics for `prose_status` transitions (rather than supersession-via-new-PG-record) preserves PG identity in `branch_path` references. PG record id IS the page's identity; a new PG record with a different id would break thousands of existing branch_path entries.
3. No backwards-compatibility shims. The new fields are additive; existing bundles grandfather via the standard pattern; migrating pre-rework bundles to the new schema is a separate operational concern, not a code shim.
4. Alternative considered: store prose_status on a sibling record class (e.g., `PGFIN-NNNN`) rather than mutating PG. Rejected because (a) querying "is this page rendered?" would require joining PG with PGFIN, (b) the design intentionally makes prose_status a PG-record state field, (c) introducing a new ID class for one boolean transition is over-engineering.

## Verification Layers

1. JSON schema additions correctly enforce field presence and enum values → schema validation: invoke `record_schema_compliance` against a fixture PG record with valid/invalid combinations of the three new fields.
2. `prose_path` nullable update accepted by schema → schema validation: PG record fixture with `prose_path: null` validates; PG record fixture with `prose_path: "pages-prose/PG-0001.md"` also validates.
3. `pages-prose-plans/` directory is enumerated → codebase grep-proof: `rg -n "pages-prose-plans" tools/world-index/src/enumerate.ts` matches; existing tests at `tools/world-index/tests/enumerate.test.ts` exercise the directory list and pass after the addition.
4. No patch-engine TS code changed → git diff inspection shows changes confined to `tools/validators/src/schemas/story-page.schema.json`, `tools/world-index/src/enumerate.ts`, and their build artifacts under `dist/`.
5. FOUNDATIONS Rule 1 alignment → manual review: the new fields' purpose is documented in the schema's description-field metadata (added inline) and they're used by finalize (PROSESPLIT-005).

## What to Change

### 1. Extend `tools/validators/src/schemas/story-page.schema.json`

Add the three new required fields, relax `prose_path` to nullable, retain `additionalProperties: true` for forward compatibility:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://worldloom.local/schemas/story-page.schema.json",
  "type": "object",
  "required": ["id", "story_id", "prose_plan_path", "prose_status", "deferred_validation_trace"],
  "properties": {
    "id": { "type": "string", "pattern": "^PG-[0-9]{4}$" },
    "story_id": { "type": "string", "pattern": "^STORY-[0-9]{3,4}$" },
    "prose_path": {
      "type": ["string", "null"],
      "pattern": "^pages-prose/PG-[0-9]{4}\\.md$",
      "description": "Relative path to rendered prose; null when prose_status != 'rendered'."
    },
    "prose_plan_path": {
      "type": "string",
      "pattern": "^pages-prose-plans/PG-[0-9]{4}\\.md$",
      "description": "Relative path to the comprehensive plan; always present after this rework."
    },
    "prose_status": {
      "enum": ["pending", "rendered", "superseded"],
      "description": "Transitional state field; pending at bundle commit, rendered after finalize."
    },
    "deferred_validation_trace": {
      "type": "object",
      "required": ["prose_ledger_consistency", "arc_trace_evidence_alignment", "prose_critic_8_axis"],
      "properties": {
        "prose_ledger_consistency": { "type": "string" },
        "arc_trace_evidence_alignment": { "type": "string" },
        "prose_critic_8_axis": { "type": "string" }
      },
      "additionalProperties": false,
      "description": "Per-gate verdicts; DEFERRED string at plan-commit; PASS/FAIL string after finalize."
    }
  },
  "additionalProperties": true
}
```

The `pattern` on `prose_path` (when string) requires the canonical relative path; null is permitted. The `pattern` on `prose_plan_path` requires the canonical relative path. The enum on `prose_status` is closed (three values). The `deferred_validation_trace` object requires exactly the three gate keys; `additionalProperties: false` on this sub-object prevents drift.

### 2. Extend `tools/world-index/src/enumerate.ts`

At line 61, add `"pages-prose-plans"` to the `STORY_BUNDLE_DIRS` array (or whatever the array is named — verified at implementation time):

```ts
const STORY_BUNDLE_DIRS = [
  "pages-prose",
  "pages-prose-plans",  // added per PROSESPLIT-002
  "storylet-batches",
  // ... rest unchanged
];
```

### 3. Update `tools/world-index/tests/enumerate.test.ts` fixture

Add a `pages-prose-plans/PG-0001.md` fixture entry alongside the existing `pages-prose/PG-0001.md` fixtures (lines 88, 108) so the enumerate test exercises the new directory.

### 4. Build dist artifacts

Run `pnpm --filter @worldloom/validators build` and `pnpm --filter @worldloom/world-index build` (or whatever the project's build command is — verified at implementation time) to refresh the `dist/` artifacts. The build output is gitignored per existing convention but must compile cleanly.

### 5. No CLAUDE.md / FOUNDATIONS.md / hooks/README.md changes in this ticket

Documentation cascade is consolidated in PROSESPLIT-009; this ticket is schema/code only.

## Files to Touch

- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/tests/enumerate.test.ts` (modify — add fixture entry)

## Out of Scope

- Adding `pages-prose-plans/` discoverability to MCP retrieval tools beyond the world-index enumerate. (`get_context_packet` and friends derive their directory list from world-index, so this lands transitively.)
- Migrating existing pre-rework bundles' PG records to include the new fields. Existing bundles either grandfather or are migrated in a follow-up operational ticket.
- Touching `tools/patch-engine/src/ops/create-story-record.ts`. The op is generic and does not need a code change.
- Updating `tools/hooks/README.md` Row 3 to mention the new directory — covered in PROSESPLIT-009.
- Updating `branching-story-bootstrap/templates/story-records.yaml` PG-NNNN field documentation — covered in PROSESPLIT-006.
- Updating `branching-story-page-cycle/references/record-schemas.md` PG section — covered in PROSESPLIT-007.

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter @worldloom/validators test -- --grep "story-page"` (or equivalent) — record_schema_compliance tests exercise the three new required fields and the enum/pattern constraints; existing tests remain green.
2. `pnpm --filter @worldloom/world-index test -- --grep "enumerate"` — enumerate tests include the `pages-prose-plans/PG-0001.md` fixture and assert it is enumerated.
3. `rg -n "pages-prose-plans" tools/world-index/src/enumerate.ts` matches.
4. `rg -n '"prose_plan_path"|"prose_status"|"deferred_validation_trace"' tools/validators/src/schemas/story-page.schema.json` matches all three new field names.

### Invariants

1. `additionalProperties: true` is preserved on the top-level PG record schema (the rework adds REQUIRED fields, not a closed schema).
2. `prose_path` accepts both string-matching-pattern and null.
3. `deferred_validation_trace` has exactly three keys (`additionalProperties: false`).
4. PG record id pattern (`^PG-[0-9]{4}$`) is unchanged.
5. No new ID class is introduced; the SE event for finalize and ARCTRACE for arc-trace extraction use existing ID classes.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.story-page.test.ts` — add cases for the three new required fields (presence and absence), the prose_status enum (valid values + invalid value), the deferred_validation_trace object shape, and the prose_path nullable case.
2. `tools/world-index/tests/enumerate.test.ts` — add fixture entry for `pages-prose-plans/PG-0001.md` and assert enumerate returns it.

### Commands

1. `pnpm --filter @worldloom/validators test`
2. `pnpm --filter @worldloom/world-index test`
3. `rg -n "pages-prose-plans" tools/world-index/src/enumerate.ts tools/world-index/tests/`
4. `node -e "console.log(JSON.parse(require('fs').readFileSync('tools/validators/src/schemas/story-page.schema.json','utf8')).required)"` — must list `id, story_id, prose_plan_path, prose_status, deferred_validation_trace`.
