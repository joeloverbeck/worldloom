# SPEC31STOCONHAR-006: Split CF-shaped candidate from `proposal_evidence`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml`, `.claude/skills/canon-addition/SKILL.md`, new `tools/validators/src/structural/proposal-package-shape.ts`, `tools/validators/src/public/registry.ts`
**Deps**: `archive/specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

`story-fact-promotion-to-canon/SKILL.md:169` declares the candidate "matches FOUNDATIONS §Canon Fact Record Schema strictly," but `:197-210` embeds promotion-only fields inside `candidate:` — `source_basis.story_branch`, `source_basis.story_evidence`, and top-level (under candidate) `promotion_provenance`. A `record_schema_compliance` check on `candidate:` alone would reject these fields. The "stripped at accept by canon-addition" convention at `:121` works in practice but the "strictly CF" claim is misleading and the design accumulates strip-on-accept fragility (canon-addition must remember which fields to drop).

The template at `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` confirms the impurity; many `proposal_evidence`-shaped fields already exist at top level (promotion_id, story_slug, source_records, supporting_pages, etc.). The split is partially done; D6 completes it.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: At intake, `story-fact-promotion-to-canon/SKILL.md` and `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` contained `candidate.source_basis.story_branch`, `candidate.source_basis.story_evidence`, and `candidate.promotion_provenance`. This ticket removed those fields from the current producer/template shape and replaced them with top-level `proposal_evidence`.
2. **Spec assumptions verified**: `archive/specs/SPEC-31-story-contract-hardening-iii.md` §D6 specifies the restructure. Validator file `tools/validators/src/structural/proposal-package-shape.ts` does NOT currently exist — confirmed new file. The live registry path is `tools/validators/src/public/registry.ts`, not the spec's older `tools/validators/src/registry.ts` shorthand.
3. **Cross-skill / cross-artifact boundary under audit**: promotion skill (producer) ↔ proposal-package.yaml template (schema) ↔ canon-addition (consumer). Canon-addition must update its consumption to read `candidate` as pure CF body and `proposal_evidence` as top-level audit trail.
4. **FOUNDATIONS principle under audit (restated)**: Rule 1 (No Floating Facts) — the CF candidate must conform to the CF schema; promotion-only fields contaminate the schema-compliance check. Splitting into pure-candidate + proposal_evidence preserves schema compliance.
5. **Schema extension impact**: the proposal-package YAML template is the schema for proposal packages. The restructure REMOVES fields from `candidate:` and REORGANIZES them under a new top-level `proposal_evidence:` wrapper. Canon-addition is the consumer; its parsing logic must be updated to read the new shape. No production proposal packages exist anywhere (no story bundles, no completed promotions).
6. **Verification command shape corrected**: the repository has no root `package.json` or `pnpm-workspace.yaml`; validators proof must run from `tools/validators` with package-local `npm` scripts, not the drafted root `pnpm --filter @worldloom/validators ...` command.
7. **Skill dry-run proof substituted**: there is no executable dry-run runner for the prose workflow skills in this checkout. The producer/consumer skill claims were proved by manual contract review plus stale-anchor grep over the edited skill/template surfaces, while the machine-checkable package contract was proved by the validators test lane.

## Architecture Check

1. **Cleaner than alternative**: keeping the candidate strictly CF-compatible and lifting promotion-only fields to top-level `proposal_evidence` makes the schema-compliance check pass on `candidate` directly and removes the strip-on-accept fragility. Canon-addition no longer needs to remember which sub-fields to drop.
2. **No backwards-compatibility shims**: no production proposal packages; clean cutover.

## Verification Layers

1. **Proposal package with `candidate.source_basis.story_branch` is rejected** → schema validation (validator test: `proposal_package_candidate_impurity` FAIL).
2. **Proposal package with proper split passes** → schema validation.
3. **Promotion skill emits package in new shape** → manual contract review + stale-anchor grep over the skill and template.
4. **Canon-addition consumes `candidate` block as CF body** → manual contract review + stale-anchor grep over canon-addition handoff prose.

## Landed Changes

### 1. Promotion skill `story-fact-promotion-to-canon/SKILL.md` Phase 2

Replaced the candidate template with a CF-compatible-only shape:
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

Restructured the proposal package to lift promotion-only fields out of `candidate`:
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

Reworded the handoff: the candidate is CF-shaped after this change, surrounding `proposal_evidence` is the proposal-time audit boundary, and canon-addition copies only `candidate` into the accepted CF payload.

### 4. Template `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml`

Regenerated to match the new shape. Existing top-level package fields (`promotion_id`, `story_slug`, `source_kind`, scope_inflation_report, mystery_firewall_report, downstream_impact_report, contradiction_preference, user_decision, prose_receipt_failures_accepted) remain where they are; evidence-set fields moved into the new `proposal_evidence:` block.

### 5. New validator `tools/validators/src/structural/proposal-package-shape.ts`

Added structural check:
- `candidate` block contains only CF-schema fields (per `tools/validators/src/schemas/canon-fact-record.schema.json` field set).
- Promotion-only fields (`story_branch`, `story_evidence`, `promotion_provenance`) under `candidate` → `proposal_package_candidate_impurity` (severity: fail).
- `proposal_evidence` is a required top-level field for proposal packages.

Register in `tools/validators/src/public/registry.ts`.

### 6. Canon-addition (`.claude/skills/canon-addition/SKILL.md`)

Updated proposal-consumption prose to read `candidate` as the CF body and `proposal_evidence` as audit-only context. Confirmed canon-addition does not reference the removed `candidate.source_basis.story_branch` / `candidate.source_basis.story_evidence` / `candidate.promotion_provenance` paths as current consumption fields.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — Phase 2, Phase 6, `:121`, `:213`)
- `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (modify — regenerate)
- `.claude/skills/canon-addition/SKILL.md` (modify — proposal-consumption prose)
- `tools/validators/src/structural/proposal-package-shape.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register)
- `tools/validators/tests/structural/proposal-package-shape.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — registry inventory)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator count)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply skip inventory)

## Out of Scope

- `mystery_resolution` source-record mapping clarification — D11 territory (and depends on this ticket's validator).
- Per-PA hybrid retrieval — D10 territory.

## Acceptance Criteria

### Tests That Must Pass

1. Validator test: proposal package with `candidate.source_basis.story_branch` → `proposal_package_candidate_impurity` FAIL.
2. Validator test: proposal package with proper split (`candidate` pure CF; `proposal_evidence` top-level) → PASS.
3. Manual contract review: `story-fact-promotion-to-canon` now documents and templates a package with the new shape.
4. Manual contract review: `canon-addition` consumes the `candidate` field directly as the CF body and preserves `proposal_evidence` as audit context.

### Invariants

1. Every `candidate` block under a proposal package is checked for CF field-set purity (modulo pre-acceptance `direct_user_approval: false` semantics).
2. Canon-addition never reads `candidate.source_basis.story_branch`, `candidate.source_basis.story_evidence`, or `candidate.promotion_provenance` as current package inputs.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/proposal-package-shape.test.ts` — new fixtures: impure-candidate FAIL, clean-split PASS, missing `proposal_evidence` FAIL, and incremental applies_to scoping.
2. `tools/validators/tests/structural/registry.test.ts` — structural registry includes `proposal_package_shape`.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — validator count updated to 13 structural / 23 total.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — clean pre-apply plan records `proposal_package_shape` as skipped.

### Commands

1. From `tools/validators`: `npm run build` → green.
2. From `tools/validators`: `node --test dist/tests/structural/proposal-package-shape.test.js` → green.
3. From `tools/validators`: `npm test` → green (`258` tests).
4. `rg -n 'candidate\.source_basis\.(story_branch|story_evidence)|candidate\.promotion_provenance|source_basis\.story_branch|source_basis\.story_evidence|promotion_provenance' .claude/skills/story-fact-promotion-to-canon .claude/skills/canon-addition tools/validators/src tools/validators/tests` → remaining hits are intentional negative guidance, validator constants, rejection-test fixtures, and `promotion_provenance_narrative` downstream-impact fields; no stale current consumer path remains.

## Outcome

Completed 2026-05-15.

This ticket split story-promotion proposal packages so `candidate:` stays CF-field-shaped and branch-local evidence lives under top-level `proposal_evidence:`. The producer skill and YAML template now emit the split shape, canon-addition treats `candidate:` as the accepted-CF body and preserves `proposal_evidence` as audit context, and `tools/validators` registers `proposal_package_shape` to reject promotion-only fields inside candidates.

The validator scans proposal-package file inputs and full-world story-promotion package files when available, rejects impure candidate fields, requires top-level `proposal_evidence`, and stays skipped for unrelated pre-apply canon plans.

## Verification Result

- `npm run build` from `tools/validators` — passed.
- `node --test dist/tests/structural/proposal-package-shape.test.js` from `tools/validators` — passed (`4/4` tests).
- `npm test` from `tools/validators` — passed (`258/258` tests). The first broad run exposed same-seam stale validator inventory assertions; those were corrected and the lane was rerun green.
- Stale-anchor sweep over story-promotion, canon-addition, and validators surfaces found only intentional negative guidance, validator constants, rejection-test fixtures, and `promotion_provenance_narrative` fields; no stale current consumer path remains.

## Deviations

- Replaced the drafted root `pnpm --filter @worldloom/validators ...` command with package-local `npm` commands because the repo has no root package/workspace manifest.
- Replaced prose-skill dry-run acceptance with manual contract review plus grep/stale-anchor proof because this checkout has no executable runner for `.claude/skills/` workflows.
- The new validator proves CF field-set purity rather than full `canon-fact-record.schema.json` acceptance, because proposal candidates intentionally use pre-acceptance `source_basis.direct_user_approval: false`; canon-addition transforms that to `true` only after its own HARD-GATE.
