# SPEC31STOCONHAR-006: Split CF-shaped candidate from `proposal_evidence`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml`, `.claude/skills/canon-addition/SKILL.md`, new `tools/validators/src/structural/proposal-package-shape.ts`, `tools/validators/src/public/registry.ts`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

`story-fact-promotion-to-canon/SKILL.md:169` declares the candidate "matches FOUNDATIONS §Canon Fact Record Schema strictly," but `:197-210` embeds promotion-only fields inside `candidate:` — `source_basis.story_branch`, `source_basis.story_evidence`, and top-level (under candidate) `promotion_provenance`. A `record_schema_compliance` check on `candidate:` alone would reject these fields. The "stripped at accept by canon-addition" convention at `:121` works in practice but the "strictly CF" claim is misleading and the design accumulates strip-on-accept fragility (canon-addition must remember which fields to drop).

The template at `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` confirms the impurity; many `proposal_evidence`-shaped fields already exist at top level (promotion_id, story_slug, source_records, supporting_pages, etc.). The split is partially done; D6 completes it.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: `story-fact-promotion-to-canon/SKILL.md:169,121,197-210,213,285-296` confirmed during brainstorm verification. Template file at `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` confirmed to contain `candidate.source_basis.story_branch`, `candidate.source_basis.story_evidence`, and `candidate.promotion_provenance`.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D6 specifies the restructure. Validator file `tools/validators/src/structural/proposal-package-shape.ts` does NOT currently exist — confirmed new file.
3. **Cross-skill / cross-artifact boundary under audit**: promotion skill (producer) ↔ proposal-package.yaml template (schema) ↔ canon-addition (consumer). Canon-addition must update its consumption to read `candidate` as pure CF body and `proposal_evidence` as top-level audit trail.
4. **FOUNDATIONS principle under audit (restated)**: Rule 1 (No Floating Facts) — the CF candidate must conform to the CF schema; promotion-only fields contaminate the schema-compliance check. Splitting into pure-candidate + proposal_evidence preserves schema compliance.
5. **Schema extension impact**: the proposal-package YAML template is the schema for proposal packages. The restructure REMOVES fields from `candidate:` and REORGANIZES them under a new top-level `proposal_evidence:` wrapper. Canon-addition is the consumer; its parsing logic must be updated to read the new shape. No production proposal packages exist anywhere (no story bundles, no completed promotions).

## Architecture Check

1. **Cleaner than alternative**: keeping the candidate strictly CF-compatible and lifting promotion-only fields to top-level `proposal_evidence` makes the schema-compliance check pass on `candidate` directly and removes the strip-on-accept fragility. Canon-addition no longer needs to remember which sub-fields to drop.
2. **No backwards-compatibility shims**: no production proposal packages; clean cutover.

## Verification Layers

1. **Proposal package with `candidate.source_basis.story_branch` is rejected** → schema validation (validator test: `proposal_package_candidate_impurity` FAIL).
2. **Proposal package with proper split passes** → schema validation.
3. **Skill dry-run: promotion skill emits package in new shape** → skill dry-run (parse the emitted file and confirm `candidate` field set is CF-compatible only).
4. **Canon-addition consumes `candidate` block as CF body** → skill dry-run (canon-addition Phase 2 reads the new package, emits a clean `create_cf_record` op).

## What to Change

### 1. Promotion skill `story-fact-promotion-to-canon/SKILL.md` Phase 2

Replace the candidate template at `:172-211` with a CF-compatible-only shape:
```yaml
candidate:
  title: ...
  status: hard_canon | derived_canon | soft_canon | contested_canon
  type: ...
  statement: ...
  scope: ...
  truth_scope: ...
  domains_affected: ...
  prerequisites: ...
  distribution: ...
  costs_and_limits: ...
  visible_consequences: ...
  required_world_updates: ...
  contradiction_risk: ...
  source_basis:
    direct_user_approval: false   # pre-acceptance; canon-addition sets true on accept
    derived_from: []              # empty for novel candidate; [<parent CF id>] for mirrored
```

NO `story_branch`, `story_evidence`, or `promotion_provenance` inside `candidate`.

### 2. Promotion skill Phase 6 (`:285-296` area)

Restructure the proposal package to lift promotion-only fields out of `candidate`:
```yaml
promotion_id: SP-<integer>
story_slug: <story_slug>
source_kind: <source_kind>
candidate: <CF-compatible shape per Phase 2>
proposal_evidence:
  story_branch: BR-<integer>
  source_kind: <source_kind>
  source_records: [<source_record_ids>]
  supporting_pages: [<supporting_page_ids>]
  authoring_events: [SE-<integer>]
  belief_witnesses: [BEL-<integer>]
  rendered_prose_receipts: [pages-prose-receipts/PG-<integer>.yaml]
  rationale: <natural-language>
scope_inflation_report: ...
mystery_firewall_report: ...
downstream_impact_report: ...
```

### 3. Promotion skill prose at `:213` and `:121`

Reword to remove the "strictly CF-shaped" claim — the candidate IS strictly CF-shaped after this change; surrounding `proposal_evidence` is the strip-on-accept boundary. Restate canon-addition's consumption: accept the `candidate` block as a CF-compatible record body; ignore the top-level `proposal_evidence` block at canon-creation time (it remains in the file as proposal-time audit trail).

### 4. Template `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml`

Regenerate to match the new shape. Existing top-level fields (`promotion_id`, `story_slug`, `source_kind`, scope_inflation_report, mystery_firewall_report, downstream_impact_report, contradiction_preference, user_decision, prose_receipt_failures_accepted) remain where they are; consolidate the evidence-set fields (`source_records`, `branch_path`, `supporting_pages`, `authoring_events`, `belief_witnesses`, `resolution_feedback_evidence`, `claim_visibility`) into the new `proposal_evidence:` block.

### 5. New validator `tools/validators/src/structural/proposal-package-shape.ts`

Structural check:
- `candidate` block contains only CF-schema fields (per `tools/validators/src/schemas/canon-fact-record.schema.json` field set).
- Promotion-only fields (`story_branch`, `story_evidence`, `promotion_provenance`) under `candidate` → `proposal_package_candidate_impurity` (severity: fail).
- `proposal_evidence` is a top-level field; its presence is required for accepted-flavored verdicts (verify post-D11).

Register in `tools/validators/src/public/registry.ts`.

### 6. Canon-addition (`.claude/skills/canon-addition/SKILL.md`)

Update the proposal-consumption prose (Phase 2 or wherever proposal packages are parsed) to read `candidate` as the CF body and `proposal_evidence` as audit-only context. Verify no current canon-addition code path references the soon-to-be-removed `candidate.source_basis.story_branch` / `candidate.source_basis.story_evidence` / `candidate.promotion_provenance` paths.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — Phase 2, Phase 6, `:121`, `:213`)
- `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (modify — regenerate)
- `.claude/skills/canon-addition/SKILL.md` (modify — proposal-consumption prose)
- `tools/validators/src/structural/proposal-package-shape.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register)
- `tools/validators/tests/structural/proposal-package-shape.test.ts` (new)

## Out of Scope

- `mystery_resolution` source-record mapping clarification — D11 territory (and depends on this ticket's validator).
- Per-PA hybrid retrieval — D10 territory.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: proposal package with `candidate.source_basis.story_branch` → `proposal_package_candidate_impurity` FAIL.
2. Validator test: proposal package with proper split (`candidate` pure CF; `proposal_evidence` top-level) → PASS.
3. Skill dry-run: `story-fact-promotion-to-canon` produces a package with the new shape.
4. Skill dry-run: `canon-addition` consumes the `candidate` field directly as the CF body; emits a clean `create_cf_record` op.

### Invariants

1. Every `candidate` block under a proposal package validates against `canon-fact-record.schema.json` (modulo `direct_user_approval: false` and `derived_from: []` defaults).
2. Canon-addition never reads `candidate.source_basis.story_branch` or `candidate.promotion_provenance`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/proposal-package-shape.test.ts` — new fixtures: impure-candidate FAIL + clean-split PASS.

### Commands

1. `pnpm --filter @worldloom/validators test -t "proposal_package_shape"` → green.
2. `grep -n "candidate.source_basis.story_branch\|candidate.promotion_provenance" .claude/skills/` → 0 matches post-edit.
