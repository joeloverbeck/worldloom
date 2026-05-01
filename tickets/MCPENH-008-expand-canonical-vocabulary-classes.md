# MCPENH-008: Expand get_canonical_vocabulary classes to cover invariant_category, entity_kind, sec_file_class, change_type, revision_difficulty

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extend `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` `VOCABULARY_CLASSES`; tests in `tools/world-mcp/tests/`; defensive ripple to `.claude/skills/create-base-world/SKILL.md` Pre-flight step 4 (add the new classes); `.claude/skills/canon-addition/SKILL.md` Pre-flight (similar extension); `docs/MACHINE-FACING-LAYER.md` (canonical-vocabulary section update).
**Deps**: None (extension to an existing MCP tool's enum-class list).

## Problem

`mcp__worldloom__get_canonical_vocabulary` currently exposes 4 classes per `tools/world-mcp/src/tools/get-canonical-vocabulary.ts:1`:

```ts
export const VOCABULARY_CLASSES = ["domain", "verdict", "mystery_status", "mystery_resolution_safety"] as const;
```

These cover: canonical domain values (per `docs/FOUNDATIONS.md` Rule 2 + extensions), verdict values (per canon-addition outcomes), Mystery Reserve status, and Mystery Reserve resolution safety (per FOUNDATIONS §Resolution-safety semantics). Skills use these via `mcp__worldloom__get_canonical_vocabulary({class: <name>})` to bind canonical enum values at synthesis time so emitted records use canonical-form values from the start.

But several other controlled vocabularies are required at canon-record construction time and are NOT exposed:

- **`invariant_category`** — the FOUNDATIONS §Invariants enum: `ontological`, `causal`, `distribution`, `social`, `aesthetic_thematic`. Required for the `category` field of every `inv_record` op.
- **`entity_kind`** — the FOUNDATIONS §Ontology Categories enum: `entity`, `species`, `person`, `faction`, `institution`, `polity`, `place`, `region`, `route`, `resource`, `craft`, `technology`, `magic_practice`, `belief`, `ritual`, `law`, `taboo`, `artifact`, `hazard`, `event`, `historical_process`, `social_role`, `text_tradition`, `ecological_system`, `bodily_condition`, `metaphysical_rule`. Required for every `ent_record`'s `entity_kind` field.
- **`sec_file_class`** — the SPEC-13 file-class enum: `GEOGRAPHY`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `MAGIC_OR_TECH_SYSTEMS`, `EVERYDAY_LIFE`, `TIMELINE`. Required for every `sec_record`'s `file_class` field and every CF's `required_world_updates[]` entries.
- **`change_type`** — the FOUNDATIONS §Change Control Policy enum: `addition`, `scope_retcon`, `cost_retcon`, `perspective_retcon`, `chronology_retcon`, `ontology_retcon`, `clarification`, `de_canonization`. Required for every `ch_record`'s `change_type` field.
- **`revision_difficulty`** — the FOUNDATIONS §Invariants schema enum: `low`, `medium`, `high`. Required for every `inv_record`'s `revision_difficulty` field.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: I had to grep `worlds/animalia/_source/invariants/AES-1.yaml` to discover the `category: aesthetic_thematic` field name and value — `invariant_category` is not exposed via `get_canonical_vocabulary`. `entity_kind` was deduced from the create-base-world skill's prose example; the full FOUNDATIONS §Ontology Categories enum was not retrievable through the MCP. `sec_file_class` was inferred from SKILL.md Phase 4 prose. `revision_difficulty` was inferred from the example values in the same SKILL.md prose. None of these are currently retrievable through a single canonical pattern.

The pattern is the same friction surface ENGINESYNC-002 named (skills operating on prose-driven assumptions) applied to FOUNDATIONS-level controlled vocabularies that should be machine-readable. Each missing class is a separate prose-vs-deployed drift risk — if FOUNDATIONS adds an ontology category or invariant category in a future spec, skills currently cannot programmatically discover the new value; they re-derive from FOUNDATIONS prose at synthesis time.

The fix is mechanical: extend `VOCABULARY_CLASSES` with the five new classes, sourcing canonical values from the existing single-source-of-truth modules.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/src/tools/get-canonical-vocabulary.ts:1` currently lists `["domain", "verdict", "mystery_status", "mystery_resolution_safety"]`. Confirmed via direct grep on 2026-05-01.
2. Single-source-of-truth modules for each new class:
   - `invariant_category`, `revision_difficulty` — `tools/validators/src/structural/record-schema-compliance.ts` invariant-record schema (verify exact location at implementation time).
   - `entity_kind` — FOUNDATIONS §Ontology Categories (the enum is mirrored in the Zod schema for `ent_record` per `tools/patch-engine/src/ops/create-ent-record.ts`; verify whether the canonical list lives there or in `tools/world-index/src/public/canonical-vocabularies.ts`).
   - `sec_file_class` — `tools/world-index/src/public/canonical-vocabularies.ts` (verify; the SPEC-13 file-class enum is centralized in this module per the create-base-world audit's review of SEC record handling).
   - `change_type` — `tools/validators/src/structural/record-schema-compliance.ts` change-log-record schema (verify exact location).
3. Cross-tool boundary under audit: the contract between (a) the deployed MCP server's `get_canonical_vocabulary` API surface and (b) every skill that binds canonical enum values at synthesis time (`create-base-world` Pre-flight step 4 currently calls 4 classes; `canon-addition` Pre-flight similarly). After this ticket lands, both Pre-flight calls extend to cover the new classes.
4. **FOUNDATIONS principle motivating this ticket**: §Tooling Recommendation — "skills should always receive [X] with completeness guarantees." The completeness guarantee includes canonical controlled vocabularies; restricting it to 4 of N controlled vocabularies leaves the rest as prose-driven assumptions. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 9: this ticket touches a Canon Safety Check enforcement surface (canonical-vocabulary binding feeds into validator enums) but does NOT weaken any rule — it expands the coverage of the existing canonical-vocabulary surface to align with FOUNDATIONS principles already documented elsewhere.
5. Schema extension: additive — `VOCABULARY_CLASSES` is extended with new string-literal values. Existing callers passing `class: "domain"` etc. continue to work unchanged. New callers can pass the new classes. No breaking change.
6. Pipeline-wide grep for current callers of `get_canonical_vocabulary`: `.claude/skills/create-base-world/SKILL.md` Pre-flight step 4 (4 classes); `.claude/skills/canon-addition/SKILL.md` Pre-flight (verify exact location and class list at implementation time). After this ticket, both files' Pre-flight blocks should extend to call the new classes alongside the existing ones.
7. Adjacent contradiction surfaced during reassessment: ENGINESYNC-002's `describe_capabilities` already exposes `input_schema_enums` for tool parameters that ARE Zod enums. `get_canonical_vocabulary({class: <X>})` is itself a tool whose `class` parameter is an enum; ENGINESYNC-002's introspection therefore already exposes the LIST of vocabulary classes. After this ticket lands, that list grows; ENGINESYNC-002's response will reflect the new classes automatically because it walks the deployed Zod schema. So this ticket extends the *set* of accessible canonical vocabularies but does NOT require ENGINESYNC-002 changes.

## Architecture Check

1. Extending `VOCABULARY_CLASSES` is the minimal change. The existing API shape (`get_canonical_vocabulary({class: <name>})`) handles all known controlled vocabularies uniformly — adding new classes preserves operational uniformity for skills.
2. Alternative — adding 5 separate MCP tools (`get_invariant_categories`, `get_entity_kinds`, etc.) — fragments the introspection surface and breaks the single-pattern access skills already use. Rejected.
3. No backwards-compatibility shims — the extension is purely additive.
4. Single-source-of-truth principle: each new class's values come from the existing canonical module (validator schemas, public canonical-vocabulary module). No second-source authoring; the new vocabulary calls return live values from the deployed schema modules.

## Verification Layers

1. After fix: `mcp__worldloom__get_canonical_vocabulary({class: "invariant_category"})` returns `{canonical_values: ["ontological", "causal", "distribution", "social", "aesthetic_thematic"]}` → MCP test (`tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`).
2. After fix: `get_canonical_vocabulary({class: "entity_kind"})` returns the FOUNDATIONS §Ontology Categories enum (26 elements per current FOUNDATIONS) → same test file.
3. After fix: `get_canonical_vocabulary({class: "sec_file_class"})` returns `["GEOGRAPHY", "PEOPLES_AND_SPECIES", "INSTITUTIONS", "ECONOMY_AND_RESOURCES", "MAGIC_OR_TECH_SYSTEMS", "EVERYDAY_LIFE", "TIMELINE"]` → same test file.
4. After fix: `get_canonical_vocabulary({class: "change_type"})` returns the FOUNDATIONS §Change Control Policy enum → same test file.
5. After fix: `get_canonical_vocabulary({class: "revision_difficulty"})` returns `["low", "medium", "high"]` → same test file.
6. After fix: skill Pre-flight blocks cite all relevant new classes alongside existing ones → grep-proof: `rg -n "get_canonical_vocabulary.*invariant_category|get_canonical_vocabulary.*entity_kind|get_canonical_vocabulary.*sec_file_class" .claude/skills/` returns hits in `create-base-world/SKILL.md` and `canon-addition/SKILL.md`.

## What to Change

### 1. Extend `VOCABULARY_CLASSES`

In `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`:

```ts
export const VOCABULARY_CLASSES = [
  "domain",
  "verdict",
  "mystery_status",
  "mystery_resolution_safety",
  "invariant_category",
  "entity_kind",
  "sec_file_class",
  "change_type",
  "revision_difficulty",
] as const;
```

Add per-class value lookups that import from the existing canonical modules:

```ts
case "invariant_category":
  return { canonical_values: ["ontological", "causal", "distribution", "social", "aesthetic_thematic"] };
case "entity_kind":
  return { canonical_values: ENTITY_KIND_VALUES };  // import from canonical-vocabularies module
case "sec_file_class":
  return { canonical_values: SEC_FILE_CLASS_VALUES };
case "change_type":
  return { canonical_values: CHANGE_TYPE_VALUES };
case "revision_difficulty":
  return { canonical_values: ["low", "medium", "high"] };
```

The exact import sources depend on where the canonical lists currently live; verify and import rather than duplicate.

### 2. Tests

`tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`:
- Per-class assertion: each new class returns the expected enum value list.
- Schema parity: the values match the Zod enums in the relevant validator / engine modules (single-source-of-truth check).
- Backward-compat: existing 4 classes still return the same values.

### 3. Skill prose update

`.claude/skills/create-base-world/SKILL.md` Pre-flight step 4:
- Currently calls 4 classes (`domain`, `verdict`, `mystery_resolution_safety`); add `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `revision_difficulty` to the call list. The skill's Phase 3 / Phase 4 / Phase 7 / Phase 8 emit records using these enums; binding canonical values at Pre-flight prevents synthesis-time drift.

`.claude/skills/canon-addition/SKILL.md` Pre-flight:
- Same extension — add the new classes alongside existing ones. The skill's accept-path emits CF / CH / INV / SEC modifications using these enums.

### 4. Documentation

`docs/MACHINE-FACING-LAYER.md`:
- Update the canonical-vocabulary section to enumerate all current classes (4 existing + 5 new). Cite this ticket as the source of the extension.

`tools/world-mcp/README.md`:
- Update the `get_canonical_vocabulary` tool entry to list all current classes.

## Files to Touch

- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify — extend VOCABULARY_CLASSES + per-class lookups)
- `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` (modify — add per-class tests)
- `.claude/skills/create-base-world/SKILL.md` (modify — Pre-flight step 4 call list extension)
- `.claude/skills/canon-addition/SKILL.md` (modify — Pre-flight call list extension; verify exact phase reference at implementation time)
- `docs/MACHINE-FACING-LAYER.md` (modify — canonical-vocabulary section)
- `tools/world-mcp/README.md` (modify — tool entry update)

## Out of Scope

- Adding NEW canonical vocabularies that don't currently exist as Zod enums (e.g., a `cf_status` vocabulary if `cf_record.status` isn't already a Zod enum at the engine level — verify; if it is, include; if not, that's a separate ticket).
- Schema introspection for nested objects (covered by ENGINESYNC-003).
- Per-record-schema introspection (covered by existing `get_record_schema`).
- Per-skill prose redesign — only the Pre-flight call list is extended, not the skill flow.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes including new per-class tests for `get_canonical_vocabulary`.
2. `mcp__worldloom__get_canonical_vocabulary({class: "invariant_category"})` returns the FOUNDATIONS §Invariants enum.
3. `mcp__worldloom__get_canonical_vocabulary({class: "entity_kind"})` returns the FOUNDATIONS §Ontology Categories enum.
4. `mcp__worldloom__get_canonical_vocabulary({class: "sec_file_class"})` returns the SPEC-13 file-class enum.
5. `mcp__worldloom__get_canonical_vocabulary({class: "change_type"})` returns the FOUNDATIONS §Change Control Policy enum.
6. `mcp__worldloom__get_canonical_vocabulary({class: "revision_difficulty"})` returns `["low", "medium", "high"]`.

### Invariants

1. `get_canonical_vocabulary` is the single canonical retrieval API for ALL controlled vocabularies in the canon stack — no per-vocabulary tools fragment the surface.
2. Each canonical vocabulary's values match the deployed Zod enum / canonical module values — single source of truth, no second-source authoring.
3. Skills citing canonical-vocabulary binding extend uniformly to all relevant classes; partial coverage (only some classes bound) becomes a smell visible at audit time.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` — extend with per-class tests for the 5 new classes.

### Commands

1. `cd tools/world-mcp && npm test` — package-local pass.
2. Manual: invoke each new class via MCP and confirm the returned value list matches the expected FOUNDATIONS / SPEC-13 / canonical-module enum.
3. Full pipeline: a `create-base-world` dry-run reads all relevant canonical vocabularies at Pre-flight and uses the values at synthesis time — no source reads of validator schemas or canonical-module files required.
