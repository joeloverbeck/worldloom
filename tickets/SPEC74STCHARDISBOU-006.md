# SPEC74STCHARDISBOU-006: story-character-authority.schema.json regeneration_reason_class field + conditional + patch-engine fixture updates

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/story-character-authority.schema.json` (new property + conditional rule); `tools/patch-engine/tests/ops/create-story-record.test.ts` (STCHAR-fixture updates to pass null/valid value per source_kind)
**Deps**: None

## Problem

The `story-character-authority.schema.json` JSON Schema does not currently define a `regeneration_reason_class` field. Without the field, STCHAR records cannot structurally encode the durable profile-change reason that distinguishes valid regenerations (the 5 named reasons) from invalid ones (ordinary state-record updates without durable consolidation). The downstream validator `stchar_regeneration_reason_integrity` (SPEC74STCHARDISBOU-011) requires the field to exist; existing patch-engine STCHAR-op fixtures will fail the schema's conditional once the field becomes required for `source_kind: regenerated` / `supersedes` non-null records, so fixtures must be updated to pass null for non-regenerated profiles and a valid enum value for regenerated profiles.

## Assumption Reassessment (2026-05-23)

1. Verified current `tools/validators/src/schemas/story-character-authority.schema.json` shape: `source_kind` enum is `["world_char", "story_local", "hybrid", "regenerated"]` (line 27); `source_char_id` pattern `^CHAR-[0-9]+$` (line 28); `supersedes` / `superseded_by` pattern `^STCHAR-(0|[1-9][0-9]*)$` (lines 82-83); `additionalProperties: false` (line 92). `regeneration_reason_class` field is absent (0 grep matches confirmed at Step 2 spot-check).
2. Verified SPEC-74 §4.7 specifies the property add (5-value enum + nullable) and the conditional rule (non-null when `source_kind: regenerated` OR `supersedes` non-null); §8 Stage 2 specifies the patch-engine fixture updates that must accompany the schema change.
3. Cross-skill boundary under audit: this schema is the canonical structural validation surface for STCHAR records; it is consumed by (a) the validator framework's `stchar_*` validators (all of which load via this schema), (b) the patch-engine's STCHAR-record op (`tools/patch-engine/src/ops/create-story-record.ts` unified handler), and (c) the future `stchar_regeneration_reason_integrity` validator (SPEC74STCHARDISBOU-011). The conditional rule's JSON Schema shape (`if/then/anyOf`) must compose correctly with the existing `additionalProperties: false` and any other STCHAR conditionals — the implementing developer must verify composition via a schema-validation dry-run before merging.
4. FOUNDATIONS principle restated: §Story Bundles §5b ("Schema-Minimalism At Story Scope" — every field load-bearing) + Rule 6 (No Silent Retcons — `regeneration_reason_class` is itself a retcon-audit field). The new field passes §5b's load-bearing test: it is consumed by `stchar_regeneration_reason_integrity` (SPEC74STCHARDISBOU-011) for lifecycle classification, by the regenerate-mode skill instructions (SPEC74STCHARDISBOU-001) for authoring discipline, by the health-audit Phase 2m `stchar_regeneration_reason_invalid` finding (SPEC74STCHARDISBOU-012), and by the patch-engine STCHAR-op fixtures (this ticket).
5. HARD-GATE / Canon Safety Check surface touched: this schema is the structural pre-apply gate for STCHAR record writes through the patch engine. The new conditional rule strengthens (not weakens) the gate by requiring durable-reason classification for regenerations. The change does NOT weaken the Mystery Reserve firewall (STCHAR is story-local; MR firewall is canon-pipeline scope).
6. Schema extension: this ticket adds the `regeneration_reason_class` field as an additive extension (nullable, with conditional non-null requirement on regenerated/superseding records). Existing in-flight STCHAR records without the field remain valid until the conditional fires; the migration of red-bunny STCHAR profiles to add the field for any regenerated entries is covered by SPEC74STCHARDISBOU-013. Consumers named above (Assumption Reassessment item 3); patch-engine fixtures (a known consumer) are updated in this same ticket.

## Architecture Check

1. JSON Schema's `if/then/anyOf` is the canonical mechanism for conditional field requirements; using it here (per the source report §6.7 draft cited by SPEC-74 §4.7) preserves the schema's declarative structure. Alternative (custom validator logic) would split the schema contract across the schema file + the validator, making the contract harder to reason about.
2. No backwards-compatibility shims. The schema's `additionalProperties: false` continues to enforce closed shape; adding `regeneration_reason_class` as a recognized property (nullable, conditionally required) is the only valid additive path.

## Verification Layers

1. **`regeneration_reason_class` property declared in the schema** → codebase grep-proof: `grep -n 'regeneration_reason_class' tools/validators/src/schemas/story-character-authority.schema.json` returns ≥2 matches (property declaration + conditional rule reference).
2. **5-value enum present** → grep-proof: `grep -nE 'source_world_char_material_change|durable_branch_transformation|profile_fidelity_failure|story_local_character_promotion|stable_source_material_omission_repair' tools/validators/src/schemas/story-character-authority.schema.json` returns ≥5 matches.
3. **Conditional rule composes correctly with `additionalProperties: false`** → schema validation dry-run: a representative STCHAR record with `source_kind: regenerated`, `supersedes: STCHAR-1`, and a valid `regeneration_reason_class` value PASSES validation; the same record with `regeneration_reason_class: null` FAILS validation; a `source_kind: world_char` record with `regeneration_reason_class: null` PASSES validation.
4. **Patch-engine STCHAR fixtures updated** → codebase grep-proof: `grep -n 'regeneration_reason_class' tools/patch-engine/tests/ops/create-story-record.test.ts` returns ≥1 match (fixture STCHAR records explicitly set the field per source_kind).

## What to Change

### 1. Add the `regeneration_reason_class` property to STCHAR schema

In the schema's properties block:

```json
"regeneration_reason_class": {
  "type": ["string", "null"],
  "enum": [
    "source_world_char_material_change",
    "durable_branch_transformation",
    "profile_fidelity_failure",
    "story_local_character_promotion",
    "stable_source_material_omission_repair",
    null
  ]
}
```

### 2. Add the conditional rule

Require `regeneration_reason_class` to be non-null with a string enum value when `source_kind: regenerated` OR `supersedes` is non-null. The conditional MAY be expressed via JSON Schema `if/then/anyOf` (source report §6.7 supplies a draft):

```json
{
  "if": {
    "anyOf": [
      { "properties": { "source_kind": { "const": "regenerated" } }, "required": ["source_kind"] },
      { "properties": { "supersedes": { "type": "string" } }, "required": ["supersedes"] }
    ]
  },
  "then": {
    "properties": {
      "regeneration_reason_class": {
        "type": "string",
        "enum": [
          "source_world_char_material_change",
          "durable_branch_transformation",
          "profile_fidelity_failure",
          "story_local_character_promotion",
          "stable_source_material_omission_repair"
        ]
      }
    },
    "required": ["regeneration_reason_class"]
  }
}
```

The implementing developer MUST verify the conditional composes correctly with the existing `additionalProperties: false` and any other STCHAR conditionals — run a schema-validation dry-run on representative STCHAR records before merging.

### 3. Update patch-engine STCHAR-op fixtures

In `tools/patch-engine/tests/ops/create-story-record.test.ts` (and any other patch-engine test file that constructs STCHAR records as fixtures), update the STCHAR test fixtures to:
- Pass `regeneration_reason_class: null` for `source_kind: world_char` / `story_local` / `hybrid` profiles with no `supersedes`.
- Pass a valid string enum value for `source_kind: regenerated` profiles or profiles with `supersedes` non-null.

Grep for additional patch-engine test files that construct STCHAR records and apply the same fixture update there.

## Files to Touch

- `tools/validators/src/schemas/story-character-authority.schema.json` (modify)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify)
- Any additional patch-engine fixture file that constructs STCHAR records (grep for `story_character_authority\|STCHAR` under `tools/patch-engine/tests/` and update each)

## Out of Scope

- The validator that enforces the field rule's evidence requirements (SPEC74STCHARDISBOU-011 — `stchar_regeneration_reason_integrity`).
- Skill regenerate-mode wording (SPEC74STCHARDISBOU-001).
- Shared schema prose for the field (SPEC74STCHARDISBOU-004 — `story-record-schemas.md`).
- Migration of existing red-bunny STCHAR profiles (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'regeneration_reason_class' tools/validators/src/schemas/story-character-authority.schema.json` returns ≥2 matches (property + conditional).
2. `grep -nE 'source_world_char_material_change|durable_branch_transformation|profile_fidelity_failure|story_local_character_promotion|stable_source_material_omission_repair' tools/validators/src/schemas/story-character-authority.schema.json` returns ≥5 matches.
3. Schema-validation dry-run on the three representative records described in Verification Layers item 3 produces the expected pass/fail pattern.
4. `npm test --prefix tools/validators` PASSES (existing schema-validation tests continue to pass with the additive change).
5. `npm test --prefix tools/patch-engine` PASSES (fixture updates produce conforming STCHAR records).

### Invariants

1. The schema's `additionalProperties: false` remains intact; the new `regeneration_reason_class` is the only recognized addition.
2. STCHAR records with `source_kind: regenerated` OR `supersedes` non-null MUST have a non-null `regeneration_reason_class` value from the 5-value enum.
3. STCHAR records with `source_kind: world_char` / `story_local` / `hybrid` AND `supersedes: null` MAY have `regeneration_reason_class: null` (the field is optional in the non-regeneration case).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-character-authority.test.ts` (extend if exists; create if not) — add positive and negative cases for the conditional rule.
2. `tools/patch-engine/tests/ops/create-story-record.test.ts` — update STCHAR fixtures to pass null/valid value per source_kind.

### Commands

1. `npm test --prefix tools/validators` (confirms schema validation passes for all positive cases; fails for negative cases per the conditional)
2. `npm test --prefix tools/patch-engine` (confirms patch-engine STCHAR ops produce schema-conforming records)
3. Schema-validation dry-run on three representative records (positive: regenerated with valid enum value; negative: regenerated with null; positive: world_char with null) — confirms `if/then/anyOf` composes correctly with `additionalProperties: false`.
