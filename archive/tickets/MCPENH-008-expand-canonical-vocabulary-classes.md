# MCPENH-008: Expand get_canonical_vocabulary classes to cover invariant_category, entity_kind, sec_file_class, change_type, revision_difficulty

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extend `tools/world-index/src/public/canonical-vocabularies.ts`; extend `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` `VOCABULARY_CLASSES`; tests in `tools/world-mcp/tests/`; defensive ripple to `.claude/skills/create-base-world/SKILL.md`, `.claude/skills/canon-addition/SKILL.md`, `.claude/skills/canon-addition/references/retrieval-tool-tree.md`, and `.claude/skills/continuity-audit/SKILL.md`; `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` canonical-vocabulary updates.
**Deps**: None (extension to an existing MCP tool's enum-class list).

## Problem

At intake, `mcp__worldloom__get_canonical_vocabulary` exposed 4 classes per `tools/world-mcp/src/tools/get-canonical-vocabulary.ts:1`:

```ts
export const VOCABULARY_CLASSES = ["domain", "verdict", "mystery_status", "mystery_resolution_safety"] as const;
```

These cover: canonical domain values (per `docs/FOUNDATIONS.md` Rule 2 + extensions), verdict values (per canon-addition outcomes), Mystery Reserve status, and Mystery Reserve resolution safety (per FOUNDATIONS §Resolution-safety semantics). Skills use these via `mcp__worldloom__get_canonical_vocabulary({class: <name>})` to bind canonical enum values at synthesis time so emitted records use canonical-form values from the start.

But several other controlled vocabularies were required at canon-record construction time and were not exposed:

- **`invariant_category`** — the FOUNDATIONS §Invariants enum: `ontological`, `causal`, `distribution`, `social`, `aesthetic_thematic`. Required for the `category` field of every `inv_record` op.
- **`entity_kind`** — the FOUNDATIONS §Ontology Categories enum: `entity`, `species`, `person`, `faction`, `institution`, `polity`, `place`, `region`, `route`, `resource`, `craft`, `technology`, `magic_practice`, `belief`, `ritual`, `law`, `taboo`, `artifact`, `hazard`, `event`, `historical_process`, `social_role`, `text_tradition`, `ecological_system`, `bodily_condition`, `metaphysical_rule`. Required for every `ent_record`'s `entity_kind` field.
- **`sec_file_class`** — the SPEC-13 file-class enum: `GEOGRAPHY`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `MAGIC_OR_TECH_SYSTEMS`, `EVERYDAY_LIFE`, `TIMELINE`. Required for every `sec_record`'s `file_class` field and every CF's `required_world_updates[]` entries.
- **`change_type`** — the FOUNDATIONS §Change Control Policy enum: `addition`, `scope_retcon`, `cost_retcon`, `perspective_retcon`, `chronology_retcon`, `ontology_retcon`, `clarification`, `de_canonization`. Required for every `ch_record`'s `change_type` field.
- **`revision_difficulty`** — the FOUNDATIONS §Invariants schema enum: `low`, `medium`, `high`. Required for every `inv_record`'s `revision_difficulty` field.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: At intake, I had to grep `worlds/animalia/_source/invariants/AES-1.yaml` to discover the `category: aesthetic_thematic` field name and value — `invariant_category` was not exposed via `get_canonical_vocabulary`. `entity_kind` was deduced from the create-base-world skill's prose example; the full FOUNDATIONS §Ontology Categories enum was not retrievable through the MCP. `sec_file_class` was inferred from SKILL.md Phase 4 prose. `revision_difficulty` was inferred from the example values in the same SKILL.md prose. None of these were retrievable through a single canonical pattern.

The pattern was the same friction surface ENGINESYNC-002 named (skills operating on prose-driven assumptions) applied to FOUNDATIONS-level controlled vocabularies that should be machine-readable. Each missing class was a separate prose-vs-deployed drift risk — before this ticket, if FOUNDATIONS added an ontology category or invariant category in a future spec, skills could not programmatically discover the new value through the canonical-vocabulary API and had to re-derive from FOUNDATIONS prose at synthesis time.

The fix was mechanical: extend `VOCABULARY_CLASSES` with the five new classes, sourcing canonical values from the existing single-source-of-truth modules.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/src/tools/get-canonical-vocabulary.ts:1` currently lists `["domain", "verdict", "mystery_status", "mystery_resolution_safety"]`. Confirmed via direct grep on 2026-05-01.
2. Single-source-of-truth modules for each new class:
   - `invariant_category`, `revision_difficulty`, `sec_file_class`, and `change_type` are enforced by JSON Schemas in `tools/validators/src/schemas/{invariant,section,change-log-entry}.schema.json`. `change_type` currently includes `addition_with_qualification` in addition to the draft list below.
   - `entity_kind` is authoritative in `docs/FOUNDATIONS.md` §Ontology Categories; the current `tools/validators/src/schemas/entity.schema.json` only requires a non-empty string, so this ticket exposes the FOUNDATIONS category list through `tools/world-index/src/public/canonical-vocabularies.ts` rather than claiming validator-enum parity.
   - The MCP handler should import all exposed lists from `tools/world-index/src/public/canonical-vocabularies.ts`; this ticket may extend that public canonical module with the missing lists so the MCP handler and tests do not hand-author separate copies.
3. Cross-tool boundary under audit: the contract between (a) the deployed MCP server's `get_canonical_vocabulary` API surface and (b) every skill that binds canonical enum values at synthesis time (`create-base-world` Pre-flight step 4 currently calls 4 classes; `canon-addition` Pre-flight similarly). After this ticket lands, both Pre-flight calls extend to cover the new classes.
4. **FOUNDATIONS principle motivating this ticket**: §Tooling Recommendation — "skills should always receive [X] with completeness guarantees." The completeness guarantee includes canonical controlled vocabularies; restricting it to 4 of N controlled vocabularies leaves the rest as prose-driven assumptions. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 9: this ticket touches a Canon Safety Check enforcement surface (canonical-vocabulary binding feeds into validator enums) but does NOT weaken any rule — it expands the coverage of the existing canonical-vocabulary surface to align with FOUNDATIONS principles already documented elsewhere.
5. Schema extension: additive — `VOCABULARY_CLASSES` is extended with new string-literal values. Existing callers passing `class: "domain"` etc. continue to work unchanged. New callers can pass the new classes. No breaking change.
6. Pipeline-wide grep for current callers of `get_canonical_vocabulary`: `.claude/skills/create-base-world/SKILL.md` Pre-flight step 4 (4 classes), `.claude/skills/canon-addition/SKILL.md` Pre-flight, `.claude/skills/canon-addition/references/retrieval-tool-tree.md`, and `.claude/skills/continuity-audit/SKILL.md`. After this ticket, those Pre-flight / retrieval references extend to call the new classes alongside the existing ones.
7. Adjacent contradiction surfaced during reassessment: ENGINESYNC-002's `describe_capabilities` already exposes `input_schema_enums` for tool parameters that ARE Zod enums. `get_canonical_vocabulary({class: <X>})` is itself a tool whose `class` parameter is an enum; ENGINESYNC-002's introspection therefore already exposes the LIST of vocabulary classes. After this ticket lands, that list grows; ENGINESYNC-002's response will reflect the new classes automatically because it walks the deployed Zod schema. So this ticket extends the *set* of accessible canonical vocabularies but does NOT require ENGINESYNC-002 changes.
8. Verification-surface correction: the external `mcp__worldloom__get_canonical_vocabulary` tool is not exposed as a callable Codex tool in this session. Acceptance will use package-local tests and a compiled handler probe after `npm test`; direct MCP invocation remains operational smoke after rebuilding/restarting a real MCP client session.

## Architecture Check

1. Extending `VOCABULARY_CLASSES` is the minimal change. The existing API shape (`get_canonical_vocabulary({class: <name>})`) handles all known controlled vocabularies uniformly — adding new classes preserves operational uniformity for skills.
2. Alternative — adding 5 separate MCP tools (`get_invariant_categories`, `get_entity_kinds`, etc.) — fragments the introspection surface and breaks the single-pattern access skills already use. Rejected.
3. No backwards-compatibility shims — the extension is purely additive.
4. Single-source-of-truth principle: each new class's values come from the public canonical-vocabulary module, which is extended here from the live validator schemas where those schemas have enums and from FOUNDATIONS where the live schema intentionally remains string-shaped (`entity_kind`). The MCP handler does not carry a second hand-authored copy.

## Verification Layers

1. After fix: `mcp__worldloom__get_canonical_vocabulary({class: "invariant_category"})` returns `{canonical_values: ["ontological", "causal", "distribution", "social", "aesthetic_thematic"]}` → MCP test (`tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`).
2. After fix: `get_canonical_vocabulary({class: "entity_kind"})` returns the FOUNDATIONS §Ontology Categories enum (26 elements per current FOUNDATIONS) → same test file.
3. After fix: `get_canonical_vocabulary({class: "sec_file_class"})` returns `["GEOGRAPHY", "PEOPLES_AND_SPECIES", "INSTITUTIONS", "ECONOMY_AND_RESOURCES", "MAGIC_OR_TECH_SYSTEMS", "EVERYDAY_LIFE", "TIMELINE"]` → same test file.
4. After fix: `get_canonical_vocabulary({class: "change_type"})` returns the live change-log schema enum, including `addition_with_qualification` → same test file.
5. After fix: `get_canonical_vocabulary({class: "revision_difficulty"})` returns `["low", "medium", "high"]` → same test file.
6. After fix: skill Pre-flight blocks cite all relevant new classes alongside existing ones → grep-proof: `rg -n "get_canonical_vocabulary.*invariant_category|get_canonical_vocabulary.*entity_kind|get_canonical_vocabulary.*sec_file_class" .claude/skills/` returns hits in `create-base-world/SKILL.md` and `canon-addition/SKILL.md`.

## What to Change

### 1. Extend the public canonical-vocabulary module and `VOCABULARY_CLASSES`

In `tools/world-index/src/public/canonical-vocabularies.ts`, add public readonly tuples for `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, and `REVISION_DIFFICULTY_VALUES`.

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

Add per-class value lookups that import from the public canonical-vocabulary module:

```ts
case "invariant_category":
  return { canonical_values: [...INVARIANT_CATEGORY_VALUES] };
case "entity_kind":
  return { canonical_values: [...ENTITY_KIND_VALUES] };
case "sec_file_class":
  return { canonical_values: [...SEC_FILE_CLASS_VALUES] };
case "change_type":
  return { canonical_values: [...CHANGE_TYPE_VALUES] };
case "revision_difficulty":
  return { canonical_values: [...REVISION_DIFFICULTY_VALUES] };
```

The MCP handler imports these lists rather than duplicating them locally.

### 2. Tests

`tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts`:
- Per-class assertion: each new class returns the expected enum value list.
- Schema parity: the values match the relevant public canonical-vocabulary exports. For schema-enforced classes, also assert representative values from the live schema enum, including `addition_with_qualification`.
- Backward-compat: existing 4 classes still return the same values.

### 3. Skill prose update

`.claude/skills/create-base-world/SKILL.md` Pre-flight step 4:
- Calls the expanded class set (`domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `revision_difficulty`). The skill's Phase 3 / Phase 4 / Phase 7 / Phase 8 emit records using these enums; binding canonical values at Pre-flight prevents synthesis-time drift.

`.claude/skills/canon-addition/SKILL.md` Pre-flight:
- Same extension — add the new classes alongside existing ones. The skill's accept-path emits CF / CH / INV / SEC modifications using these enums.

### 4. Documentation

`docs/MACHINE-FACING-LAYER.md`:
- Update the canonical-vocabulary section to enumerate all current classes (4 existing + 5 new). Cite this ticket as the source of the extension.

`tools/world-mcp/README.md`:
- Update the `get_canonical_vocabulary` tool entry to list all current classes.

## Files to Touch

- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify — extend VOCABULARY_CLASSES + per-class lookups)
- `tools/world-index/src/public/canonical-vocabularies.ts` (modify — add public canonical tuples consumed by MCP)
- `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` (modify — add per-class tests)
- `.claude/skills/create-base-world/SKILL.md` (modify — Pre-flight step 4 call list extension)
- `.claude/skills/canon-addition/SKILL.md` (modify — Pre-flight call list extension; verify exact phase reference at implementation time)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — retrieval-tool decision tree vocabulary list extension)
- `.claude/skills/continuity-audit/SKILL.md` (modify — same-surface Pre-flight call list extension found during pipeline-wide grep)
- `docs/MACHINE-FACING-LAYER.md` (modify — canonical-vocabulary section)
- `tools/world-mcp/README.md` (modify — tool entry update)

## Out of Scope

- Adding additional canonical vocabularies beyond the five classes landed here (for example, a future `cf_status` vocabulary) is a separate ticket.
- Schema introspection for nested objects (covered by ENGINESYNC-003).
- Per-record-schema introspection (covered by existing `get_record_schema`).
- Per-skill prose redesign — only the Pre-flight call list is extended, not the skill flow.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build`, then `cd tools/world-mcp && npm test` passes including new per-class tests for `get_canonical_vocabulary`.
2. A package-local compiled handler probe confirms `getCanonicalVocabulary({class: "invariant_category"})` returns the FOUNDATIONS §Invariants enum.
3. A package-local compiled handler probe confirms `getCanonicalVocabulary({class: "entity_kind"})` returns the FOUNDATIONS §Ontology Categories enum.
4. A package-local compiled handler probe confirms `getCanonicalVocabulary({class: "sec_file_class"})` returns the SPEC-13 file-class enum.
5. A package-local compiled handler probe confirms `getCanonicalVocabulary({class: "change_type"})` returns the live change-log schema enum, including `addition_with_qualification`.
6. A package-local compiled handler probe confirms `getCanonicalVocabulary({class: "revision_difficulty"})` returns `["low", "medium", "high"]`.

### Invariants

1. `get_canonical_vocabulary` is the single canonical retrieval API for the currently exposed controlled vocabularies in this ticket's canon-construction stack — no per-vocabulary tools fragment the surface.
2. Each canonical vocabulary's values match the deployed Zod enum / canonical module values — single source of truth, no second-source authoring.
3. Skills citing canonical-vocabulary binding extend uniformly to all relevant classes; partial coverage (only some classes bound) becomes a smell visible at audit time.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` — extend with per-class tests for the 5 new classes.

### Commands

1. `cd tools/world-index && npm run build` — refresh producer public exports consumed through the package export map.
2. `cd tools/world-mcp && npm test` — package-local pass.
3. `cd tools/world-mcp && node -e "const { getCanonicalVocabulary } = require('./dist/src/tools/get-canonical-vocabulary.js'); Promise.all(['invariant_category','entity_kind','sec_file_class','change_type','revision_difficulty'].map(async (c) => [c, (await getCanonicalVocabulary({class: c})).canonical_values])).then((rows) => console.log(JSON.stringify(rows)))"` — package-local compiled handler probe for the new classes.
4. Full pipeline: a `create-base-world` dry-run reads all relevant canonical vocabularies at Pre-flight and uses the values at synthesis time — no source reads of validator schemas or canonical-module files required.

## Outcome

Implemented the MCP vocabulary expansion by adding public canonical tuples in `tools/world-index/src/public/canonical-vocabularies.ts` and wiring `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` to return the five new classes: `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, and `revision_difficulty`.

Updated `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` for the new classes and unsupported-class details. Updated the package README, `docs/MACHINE-FACING-LAYER.md`, and the live skill consumers found by grep (`create-base-world`, `canon-addition`, `canon-addition/references/retrieval-tool-tree.md`, and `continuity-audit`) so Pre-flight vocabulary binding names the expanded class set.

## Verification Result

1. `cd tools/world-index && npm run build` — pass; refreshed the producer `dist/src/public/canonical-vocabularies.{js,d.ts}` exports used by the symlinked `@worldloom/world-index` package.
2. `cd tools/world-mcp && npm test` — pass; 223 tests passed, including the expanded `getCanonicalVocabulary` tests.
3. `cd tools/world-mcp && node -e "const { getCanonicalVocabulary } = require('./dist/src/tools/get-canonical-vocabulary.js'); Promise.all(['invariant_category','entity_kind','sec_file_class','change_type','revision_difficulty'].map(async (c) => [c, (await getCanonicalVocabulary({class: c})).canonical_values])).then((rows) => console.log(JSON.stringify(rows)))"` — pass; returned the expected value lists, including `addition_with_qualification` for `change_type`.
4. `rg -n 'get_canonical_vocabulary.*invariant_category|get_canonical_vocabulary.*entity_kind|get_canonical_vocabulary.*sec_file_class|get_canonical_vocabulary.*change_type|get_canonical_vocabulary.*revision_difficulty' .claude/skills/create-base-world .claude/skills/canon-addition .claude/skills/continuity-audit` — pass; all updated skill references cite the expanded class set.
5. Stale limited-class wording grep over `.claude/skills`, `docs`, and `tools/world-mcp` — pass; no `domain/verdict/mystery enums` wording or old four-class README wording remains in the checked surfaces.
6. `git diff --check` — pass.

Ignored/generated artifact state: `tools/world-index/dist/` and `tools/world-mcp/dist/` were refreshed as expected by build/test commands; `tools/world-index/node_modules/`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/.secret` were pre-existing ignored package/runtime artifacts.

## Deviations

The draft expected a direct external `mcp__worldloom__get_canonical_vocabulary` invocation as manual proof, but that MCP tool is not exposed in this Codex session. The accepted proof uses package-local tests plus a compiled handler probe against `dist/src/tools/get-canonical-vocabulary.js`; direct MCP invocation remains operational smoke after rebuilding/restarting a real MCP client session.

The live `change-log-entry` schema includes `addition_with_qualification`, so the landed `change_type` vocabulary intentionally includes that value. `entity_kind` remains string-shaped in the current entity schema; its canonical list is sourced from FOUNDATIONS §Ontology Categories through the public canonical-vocabulary module.
