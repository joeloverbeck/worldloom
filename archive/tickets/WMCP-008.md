# WMCP-008: Expose CF `type` taxonomy as a `cf_type` canonical vocabulary class

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/`, `tools/world-index/src/public/canonical-vocabularies.ts`, `tools/validators/src/structural/record-schema-compliance.ts`, `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/canon-addition/`
**Deps**: WMCP-001 (canonical_vocabulary tool exists), WMCP-007 (latest enum surface)

## Problem

At intake, when a canon-addition (or any CF-emitting) skill needed to choose an accurate `type:` value for a new Canon Fact Record AND determine whether `epistemic_profile` / `exception_governance` blocks were engine-required for that type, the only source of truth was `tools/validators/src/structural/record-schema-compliance.ts` — specifically the `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` and `EPISTEMIC_PROFILE_REQUIRED_TYPES` arrays plus the `requiresEpistemicProfile(cf.type)` / `requiresExceptionGovernance(cf.type)` helpers. There was no MCP-exposed enumeration of these CF `type` values.

The previous canon-addition flow's documented workaround (per `.claude/skills/canon-addition/SKILL.md` Procedure step 7) told the operator to treat the exported validator helpers as the source-of-truth taxonomy for conditional presence. This forced every canon-addition run that needed a non-common type (e.g., `institution_with_secrecy`, `knowledge_asymmetric_fact`) to grep validator source mid-run — a documented friction point captured during the GazteluFit canon-addition session (PA-0002, 2026-05-01) and surfaced in the canon-addition skill audit's Improvement 1 finding.

The `get_canonical_vocabulary` MCP tool already exposed the parallel enums (`domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `revision_difficulty`) for exactly this use case — runtime-canonical taxonomy lookup so skills don't have to grep source. Adding `cf_type` closed the last gap in the CF-record vocabulary surface.

## Assumption Reassessment (2026-05-01)

1. At intake, `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` lines 15-25 declared the supported `VOCABULARY_CLASSES` tuple and switched on it at lines 56-81. Adding `cf_type` was a tuple-extension + switch-arm addition. The existing module imported its data from `@worldloom/world-index/public/canonical-vocabularies` — that import boundary was the canonical injection point.
2. At intake, `tools/world-index/src/public/canonical-vocabularies.ts` exported `CANONICAL_DOMAINS`, `VERDICT_ENUM`, `MYSTERY_STATUS_ENUM`, `MYSTERY_RESOLUTION_SAFETY_ENUM`, `INVARIANT_CATEGORY_VALUES`, `ENTITY_KIND_VALUES`, `SEC_FILE_CLASS_VALUES`, `CHANGE_TYPE_VALUES`, `REVISION_DIFFICULTY_VALUES`, but not `CF_TYPE_VALUES`. This ticket added the CF-type constants there so both `world-mcp` and `validators` consume one source-of-truth.
3. Cross-artifact boundary: this ticket touched the MCP-side tool, the world-index public-vocabulary module, the validators-side schema-compliance module (`EXCEPTION_GOVERNANCE_REQUIRED_TYPES` / `EPISTEMIC_PROFILE_REQUIRED_TYPES` at intake), and the canon-addition skill's `references/proposal-normalization.md`. Shared boundary under audit: the CF-`type` taxonomy must have ONE canonical definition source that all three layers read; before this ticket the validator hardcoded its own list and FOUNDATIONS used `etc.` — the new `CF_TYPE_VALUES` is the convergence point.
4. FOUNDATIONS principle under audit: §Canon Fact Record Schema (lines 271-353 in `docs/FOUNDATIONS.md`) enumerates `type: capability | artifact | law | belief | event | institution | species | etc` (informally) and the conditional-presence comment for `epistemic_profile` ("required when knowability is non-trivial; n_a permitted only with one-line rationale tied to fact-type"). The taxonomy is operationally enforced by the validator but not enumerated in FOUNDATIONS. This ticket does NOT propose amending FOUNDATIONS — the canonical_vocabulary surface is the right runtime-discoverability mechanism, leaving FOUNDATIONS as the design contract that delegates per-type semantics to the canonical_vocabulary module.
5. This ticket extends `get_canonical_vocabulary`'s response surface: existing class arms remain unchanged; the new `cf_type` arm adds a new return shape variant. The extension is additive-only — no breaking change to existing callers. FOUNDATIONS-aligned schema audit per `tickets/README.md` Pre-Implementation Check 10: the `GetCanonicalVocabularyResponse` interface (line 38-41) already supports an optional `coupling` field that's well-suited to expose per-`cf_type` coupling info (which type triggers which block); no breaking field rename required.
6. Pipeline-wide blast radius for the new `cf_type` class identifier: grep `.claude/skills/*/SKILL.md` and `.claude/skills/*/references/*.md` for `cf_type` returned zero hits at intake; introducing this class as a new tag is safe. Operator-side guidance update (canon-addition's `references/proposal-normalization.md` §Specialized institution / asymmetric-knowledge types) replaces the source-grep guidance with an MCP-query path.
7. Package-command correction: this repo has no root `package.json` / pnpm workspace. The truthful proof surface is package-local `npm run build` / `npm test` from `tools/world-index/`, `tools/validators/`, and `tools/world-mcp/`. `tools/validators/node_modules/@worldloom/world-index` and `tools/world-mcp/node_modules/@worldloom/{world-index,validators}` are symlinks, so producer builds refresh the consumer-resolved package artifacts without reinstall.
8. Same-package doc surface: `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` both enumerate the current canonical-vocabulary classes. They are same-seam consumers of the new public class and are owned by this ticket.

## Architecture Check

1. Surfacing the CF-`type` taxonomy through `get_canonical_vocabulary` is structurally consistent with the nine existing vocabulary classes — no new tool, no new endpoint, just an additional class on the existing tool. The alternative ("hardcode the list in skill prose") drifts the moment the validator adds a new specialized type and creates the source-grep workaround that PA-0002's audit already flagged.
2. No backwards-compatibility aliasing/shims introduced. The validator's `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` / `EPISTEMIC_PROFILE_REQUIRED_TYPES` arrays at `tools/validators/src/structural/record-schema-compliance.ts:21-35` move to `tools/world-index/src/public/canonical-vocabularies.ts` as the single source-of-truth; the validator imports the shared `CF_TYPE_*` constants and re-exports the existing public names for current package consumers.

## Verification Layers

1. `cf_type` class is a recognized vocabulary class -> codebase grep-proof in `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` `VOCABULARY_CLASSES` tuple.
2. Returned values match the validator's `EPISTEMIC_PROFILE_REQUIRED_TYPES` + common-enum union -> schema validation against the test fixture `mcp__worldloom__get_canonical_vocabulary({class: 'cf_type'})`.
3. Validator-side taxonomy now imports from canonical-vocabularies (not redeclares) -> codebase grep-proof: the old validator-side `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` / `EPISTEMIC_PROFILE_REQUIRED_TYPES` arrays are no longer locally declared; `tools/world-index/src/public/canonical-vocabularies.ts` declares the shared `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` / `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED` constants, and `tools/validators/src/structural/record-schema-compliance.ts` imports them while re-exporting the prior public names for consumers.
4. End-to-end skill consumer can replace source-grep with MCP query -> manual/grep proof: canon-addition guidance points operators at `get_canonical_vocabulary({class: 'cf_type'})` and no longer preserves the source-grep workaround wording.
5. FOUNDATIONS alignment check: §Canon Fact Record Schema continues to delegate per-type semantics to canonical_vocabulary (no FOUNDATIONS edit required); §Validation Rules Rule 1 still binds because every CF carries one of the enumerated `type` values.

## Landed Changes

### 1. Moved `CF_TYPE_VALUES` to canonical-vocabularies module

In `tools/world-index/src/public/canonical-vocabularies.ts`, added three new exports:

- `CF_TYPE_COMMON_VALUES`: a frozen tuple of the common-enum types (`capability`, `artifact`, `law`, `belief`, `event`, `institution`, `species`, `ritual`, `taboo`, `technology`, `resource_distribution`, `hidden_truth`, `local_anomaly`, `metaphysical_rule`, `historical_process`, `text_tradition`, `hazard`, `craft`, `place`, `polity`, `route`, `social_role`, `ecological_system`).
- `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED`: the existing `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` array values (`capability`, `bloodline`, `magic_practice`, `technology`, `divine_action`, `artifact_dependent_truth`, `exception_introducing_fact`).
- `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED`: the existing `EPISTEMIC_PROFILE_REQUIRED_TYPES` superset (`...EXCEPTION_GOVERNANCE_REQUIRED`, plus `institution_with_secrecy`, `knowledge_asymmetric_fact`).

Defined `CF_TYPE_VALUES` as the deduplicated union of all three.

### 2. Updated the validators-side module to import (not redeclare)

In `tools/validators/src/structural/record-schema-compliance.ts`, replaced the local `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` and `EPISTEMIC_PROFILE_REQUIRED_TYPES` array declarations with imports from `@worldloom/world-index/public/canonical-vocabularies`. Kept `requiresExceptionGovernance` and `requiresEpistemicProfile` exported as before; their bodies use the imported arrays.

### 3. Added `cf_type` arm to `get_canonical_vocabulary`

In `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`:

- Appended `"cf_type"` to `VOCABULARY_CLASSES`.
- Added a new switch arm returning:
  ```ts
  case "cf_type":
    return {
      canonical_values: [...CF_TYPE_VALUES],
      coupling: {
        field: "type",
        rule: "Types in CF_TYPE_EPISTEMIC_PROFILE_REQUIRED require populated epistemic_profile. Types in CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED additionally require populated exception_governance. Validator: record_schema_compliance."
      }
    };
  ```
- Imported `CF_TYPE_VALUES` and the per-required subsets from the world-index public module.

Included per-type coupling metadata in a new `per_value_coupling: Array<{ value: string; requires_epistemic_profile: boolean; requires_exception_governance: boolean }>` field. This keeps existing single-`coupling` consumers working while adding richer detail.

### 4. Rebuilt dist and propagated

Rebuilt `tools/world-index/dist/`, then `tools/validators/dist/`, then `tools/world-mcp/dist/` with package-local `npm run build` commands so consumer packages see fresh producer declaration/runtime artifacts.

### 5. Updated canon-addition skill guidance

In `.claude/skills/canon-addition/references/proposal-normalization.md` §Specialized institution / asymmetric-knowledge types triggering engine-level `epistemic_profile` requirement, replaced the source-grep reference with an MCP-query reference (`mcp__worldloom__get_canonical_vocabulary({class: 'cf_type'})`). Also updated SKILL.md Procedure step 7's `requiresEpistemicProfile` / `requiresExceptionGovernance` mention to point to the MCP query as the primary lookup path, with the source helper functions named only as the validator-internal definition.

In `.claude/skills/canon-addition/SKILL.md` Procedure step 1 (pre-flight), added `cf_type` to the `get_canonical_vocabulary` enumeration of pre-flight queries.

### 6. Updated public tool inventories

Updated `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` so the documented `get_canonical_vocabulary` class list includes `cf_type`.

## Files to Touch

- `tools/world-index/src/public/canonical-vocabularies.ts` (modify — add CF_TYPE_* exports)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify — replace local declarations with imports)
- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify — add cf_type arm)
- `tools/world-mcp/dist/**` (rebuilt)
- `tools/world-index/dist/**` (rebuilt)
- `tools/validators/dist/**` (rebuilt)
- `tools/world-mcp/README.md` (modify — public tool inventory includes `cf_type`)
- `docs/MACHINE-FACING-LAYER.md` (modify — machine-facing tool table includes `cf_type`)
- `.claude/skills/canon-addition/SKILL.md` (modify — Procedure step 1 + step 7)
- `.claude/skills/canon-addition/references/proposal-normalization.md` (modify — §Specialized institution / asymmetric-knowledge types)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — pre-flight vocabulary list includes `cf_type`)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify — constrained-field vocabulary list includes `cf_type`)

## Out of Scope

- FOUNDATIONS amendments enumerating CF type values explicitly (delegated to canonical_vocabulary; out of scope here).
- Changing validator behavior — `requiresExceptionGovernance` / `requiresEpistemicProfile` semantics stay identical.
- Adding new CF type values beyond the existing union.
- Changing the schema of `epistemic_profile` / `exception_governance` blocks.
- Cross-skill propagation of the new `cf_type` class to non-canon-addition skills (a follow-up if/when those skills emit CF records directly; currently only canon-addition and create-base-world do, and create-base-world's CF-0001 is a `metaphysical_rule` — the existing taxonomy already covers it).

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__get_canonical_vocabulary({class: 'cf_type'})` returns a `canonical_values` array containing all union members, including `institution_with_secrecy` and `knowledge_asymmetric_fact`.
2. `mcp__worldloom__get_canonical_vocabulary({class: 'cf_type'})` returns a `coupling` field naming `record_schema_compliance` validator and the per-block requirement rule.
3. The CF-type required-block taxonomy is declared in `tools/world-index/src/public/canonical-vocabularies.ts`; validators-side `record-schema-compliance.ts` imports the shared `CF_TYPE_*` constants and only re-exports the existing public names.
4. `requiresExceptionGovernance("institution_with_secrecy")` returns `false`; `requiresEpistemicProfile("institution_with_secrecy")` returns `true` (semantics preserved).
5. Canon-addition guidance reads `cf_type` from `mcp__worldloom__get_canonical_vocabulary({class: 'cf_type'})` rather than directing operators to source grep.
6. Existing nine canonical-vocabulary classes continue to return their existing values unchanged (regression check).

### Invariants

1. CF `type` taxonomy has exactly one canonical-source declaration (in `tools/world-index/src/public/canonical-vocabularies.ts`); validators consume it by import.
2. `get_canonical_vocabulary` is the runtime discoverability layer for skill operators; source-file grep for CF-type values is no longer the documented workaround.
3. Additive-only change: no consumer of the existing nine classes sees a breaking response shape change.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-canonical-vocabulary.test.ts` (modified test cases) — assert `cf_type` class returns the expected union and coupling field; assert all nine prior classes' responses remain unchanged.
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` (existing tests rerun) — assert no behavior regression after the import-source change.

### Commands

1. `cd tools/world-index && npm run build` — refreshes the producer package export and declarations for `CF_TYPE_*`.
2. `cd tools/validators && npm test` — confirms validator semantics unchanged after importing the taxonomy.
3. `cd tools/world-mcp && npm test` — runs the MCP handler, dispatch, describe-capabilities, and regression tests after the producer builds.

## Outcome

Completion date: 2026-05-01.

Implemented `cf_type` as an additive `get_canonical_vocabulary` class:

- Added `CF_TYPE_COMMON_VALUES`, `CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED`, `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED`, and `CF_TYPE_VALUES` to `tools/world-index/src/public/canonical-vocabularies.ts`.
- Updated `record_schema_compliance` to consume the shared `CF_TYPE_*` constants while preserving the validators package's existing public export names for current consumers.
- Extended `get_canonical_vocabulary` with `cf_type`, including `coupling` and `per_value_coupling[]` so operators can see exactly which CF types require `epistemic_profile` and which additionally require `exception_governance`.
- Updated MCP tests, package docs, machine-facing docs, and canon-addition guidance so `cf_type` is queried through MCP rather than by source grep.

No world content, `_source/*.yaml` records, approval-token behavior, submit ordering, or validator semantics were changed.

## Verification Result

Passed:

1. `cd tools/world-index && npm run build`
2. `cd tools/validators && npm test` — 84 tests passed.
3. `cd tools/world-mcp && npm test` — 253 tests passed.
4. `rg -n 'export const (EXCEPTION_GOVERNANCE_REQUIRED_TYPES|EPISTEMIC_PROFILE_REQUIRED_TYPES)' tools -g '!dist'` returned no matches, confirming the old validator-side arrays are no longer locally declared.
5. `rg -n 'source-module reference|not a package export|Current classes are|revision_difficulty.*cf_type|revision_difficulty.*This catches|revision_difficulty.*before populating' .claude/skills/canon-addition tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` confirmed same-seam docs now include `cf_type` and no longer preserve the source-grep workaround wording.
6. `git diff --check` passed.

Ignored artifact state after verification is expected/pre-existing generated package state under `tools/world-index/dist/`, `tools/world-index/node_modules/`, `tools/validators/dist/`, `tools/validators/node_modules/`, `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

- Direct external `mcp__worldloom__get_canonical_vocabulary({class: 'cf_type'})` invocation was not used as acceptance because this Codex session does not expose the live external `mcp__worldloom__...` tool calls. Package-local handler tests plus in-memory MCP dispatch / describe-capabilities tests are the truthful post-build proof surface.
- The initial `tools/world-mcp` full suite exposed a ticket-owned assertion issue: the richer `per_value_coupling[]` follows `CF_TYPE_VALUES` display order, so the test now compares required subsets as sets rather than imposing the validator subset order on the display list.
- The validators package still exposes the existing `EXCEPTION_GOVERNANCE_REQUIRED_TYPES` and `EPISTEMIC_PROFILE_REQUIRED_TYPES` public names for current imports, but they are re-exported from the shared world-index constants rather than locally declared arrays.
