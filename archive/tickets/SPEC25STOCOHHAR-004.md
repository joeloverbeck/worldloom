# SPEC25STOCOHHAR-004: SF.authority field

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/schemas/story-fact.schema.json`, adds/registers `story_fact_authority`, updates validator tests/README; amends `.claude/skills/_shared-templates/story-state-contract.md` (§4.5.3 / §11), `docs/FOUNDATIONS.md`, SPEC-25, and the four story-pipeline skill consumers.
**Deps**: None

## Problem

At intake, `story-fact-promotion-to-canon` branched on `SF` `branch_local_counterfactual` authority — its scope-inflation cap (`SKILL.md:218`) and its mystery-firewall counterfactual check (`SKILL.md:248`) both read it — but `story-fact.schema.json` had no `authority` field (`required: ["id", "story_id", "created_at_page", "statement"]`). This ticket added the authority field the pipeline already reads and backed `canon_linked` with a structural validator.

## Assumption Reassessment (2026-05-14)

1. At intake, `story-fact-promotion-to-canon/SKILL.md:218` ("Branch-local-counterfactual cap" — counterfactual `SF` caps the candidate at `contested_canon`) and `:248` ("Branch-local counterfactual presented as objective canon" — `firewall_verdict: ABORT` unless `desired_canon_status: contested_canon`) both read `SF` `branch_local_counterfactual` authority while `tools/validators/src/schemas/story-fact.schema.json` had `derived_from` in `properties` but no `authority`, and `required` omitted it. This ticket added the schema field and validator backing.
2. SPEC-25 D2 prescribes `authority: branch_local | branch_local_counterfactual | canon_candidate | canon_linked` (required; default `branch_local`) at contract §4.5.3, with the CF link riding the existing `SF.derived_from` (which already accepts `CF-<integer>`) — no separate canon-link field is added.
3. Cross-skill boundary under audit: the `SF` schema (contract §4.5.3 ↔ `story-fact.schema.json`) consumed by `branching-story-bootstrap` / `branching-story-turn-cycle` (write side — set `authority` on every `SF` creation), `story-fact-promotion-to-canon` (read side — Phase 3.1 / 4.3), and `story-promotion-closeout` (write side — Phase 2 `accepted` supersedes the source `SF` with `authority: canon_linked`).
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately) + §Story Bundles §5 (Validation Rules At Story Scope): restated before trusting the spec — `branch_local_counterfactual` keeps deliberate canon contradictions from being laundered into hard canon. This ticket makes that firewall *schema-backed* rather than aspirational; it does not weaken the Mystery Reserve firewall and does not resolve any Mystery Reserve entry — it strengthens the promotion pipeline's existing counterfactual cap by giving it a real field to read. HARD-GATE read: `docs/HARD-GATE-DISCIPLINE.md` was required/read because `story_fact_authority` participates in pre-apply structural validation for story-bundle record patch plans.
5. Schema extension: `story-fact.schema.json` is extended. Consumers — the four skills above plus `record_schema_compliance`. The extension is a **required** field (every new `SF` must carry `authority`), not additive-only-with-default at the schema level; however, because there are zero production story bundles (SPEC-25 §Problem), there is no existing-record migration cost — this is greenfield. The skill writers (`branching-story-bootstrap`, `branching-story-turn-cycle`) are updated in this same ticket to emit it.

## Architecture Check

1. Reusing `SF.derived_from` for the CF link — rather than adding a separate `canon_link` field — keeps a promoted fact self-honest with one field, consistent with `story-promotion-closeout` Phase 2, and satisfies §5b schema-minimalism.
2. No shims: `authority` is a required field with a documented default of `branch_local`; no optional-with-fallback aliasing, no compatibility path for `authority`-less records.

## Verification Layers

1. `story-fact.schema.json` carries `authority` (the four-value enum) in `properties` and in `required` -> schema validation / grep-proof.
2. `story-fact-promotion-to-canon` Phase 3.1 / 4.3 read a schema-backed field -> manual review: the SKILL.md text matches the four-value enum exactly.
3. A `branch_local_counterfactual` source `SF` is still capped at `contested_canon` / `ABORT` in `story-fact-promotion-to-canon` -> manual contract review + grep-proof (no executable skill dry-run harness exists).
4. An `SF` with `authority: canon_linked` carries at least one `CF-<integer>` in `derived_from` -> validator test (the new structural check).

## Landed Changes

### 1. Contract §4.5.3

Added `authority: branch_local | branch_local_counterfactual | canon_candidate | canon_linked*` (required; default `branch_local`) to the `SF` schema. Documented that on canon acceptance the CF link rides the existing `SF.derived_from`, consistent with `story-promotion-closeout` Phase 2 — no separate canon-link field.

### 2. story-fact.schema.json

Added `authority` (enum of the four values) to `properties` and to `required`.

### 3. Structural check — canon_linked requires a CF parent

Added `story_fact_authority`: an `SF` with `authority: canon_linked` must carry at least one `CF-<integer>` id in `derived_from`. The validator is registered in `structuralValidators`, so it participates in pre-apply, incremental, and full-world structural runs.

### 4. Skills — write side

`branching-story-bootstrap` + `branching-story-turn-cycle`: set `authority` on every `SF` creation — `branch_local` by default, `branch_local_counterfactual` for deliberate canon contradictions, `canon_candidate` when paired with `SE.promotion_claims`.

### 5. Skills — read side

`story-fact-promotion-to-canon`: Phase 3.1 / 4.3 text now names the four-value enum and reads a schema-backed field. `story-promotion-closeout`: Phase 2 `accepted` supersedes the source `SF` with `authority: canon_linked` and the parent CF id in `derived_from` — now schema-backed rather than aspirational.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.5.3)
- `tools/validators/src/schemas/story-fact.schema.json` (modify)
- `tools/validators/src/structural/story-fact-authority.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/story-fact-authority.test.ts` (new)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/cli/world-validate.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)
- `docs/FOUNDATIONS.md` (modify — same-seam Story Bundles authority wording)
- `tools/validators/README.md` (modify — validator inventory)
- `specs/SPEC-25-story-coherence-hardening.md` (modify — implementation note)

## Out of Scope

- A separate canon-link field on `SF` — the CF link rides `derived_from` per SPEC-25 D2.
- P0 #4 `SCX` crosslink record — rejected by SPEC-25 §Out of Scope (structural).
- Any change to `canon-addition` adjudication logic — `story-fact-promotion-to-canon` still hands the candidate off; this ticket only makes the `SF`-side authority field real.
- The `story-promotion-closeout` BR-supersession cleanup — SPEC25STOCOHHAR-009.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` — `record_schema_compliance` rejects an `SF` missing `authority` and one with an out-of-enum value; the new structural check fails a `canon_linked` `SF` with no `CF-<integer>` in `derived_from` and passes one with a CF parent.
2. Manual contract review + grep-proof: `story-fact-promotion-to-canon` Phase 3 / Phase 4 still caps `branch_local_counterfactual` source `SF` records at `contested_canon` / `ABORT` for hard-canon promotion attempts. There is no executable story-skill dry-run harness in this repo, so the proof is skill-text inspection plus the schema-backed validator lane.
3. `grep -n "authority" tools/validators/src/schemas/story-fact.schema.json` shows `authority` in both `properties` and `required`.

### Invariants

1. Every `SF` record carries `authority` drawn from `{branch_local, branch_local_counterfactual, canon_candidate, canon_linked}`.
2. An `SF` with `authority: canon_linked` carries at least one `CF-<integer>` in `derived_from`; the promotion pipeline never branches on an unbacked `authority` value.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — added `SF`-with-`authority`, missing-`authority`, and out-of-enum cases.
2. `tools/validators/tests/structural/story-fact-authority.test.ts` — added the `canon_linked` → `derived_from` structural check: a `canon_linked` `SF` with a CF parent passes; one without fails.
3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/cli/world-validate.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` — updated same-seam schema, registry, selector, and pre-apply expectations.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. Manual review / grep-proof of `story-fact-promotion-to-canon` with a `branch_local_counterfactual` source `SF`, inspecting the capped `desired_canon_status` / `firewall_verdict` wording. No executable story-skill dry-run harness exists in the live repo.

## Outcome

Completed. `SF.authority` is now required in the shared story contract and `story-fact.schema.json`; `record_schema_compliance` rejects missing or invalid authority values; `story_fact_authority` rejects `canon_linked` SF records without a parent `CF-<integer>` in `derived_from`. Bootstrap, turn-cycle, promotion, and closeout skill prose now write/read the four-value SF authority enum. Same-seam FOUNDATIONS, SPEC-25, and validator README/status surfaces were truthed.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/structural/story-fact-authority.test.js dist/tests/structural/contract-schema-roundtrip.test.js dist/tests/integration/spec04-verification.test.js dist/tests/integration/validate-patch-plan.test.js` — passed, 52 tests.
3. `cd tools/validators && npm run test` — passed, 199 tests.
4. Manual/grep review confirmed `story-fact-promotion-to-canon` Phase 3 / Phase 4 still caps `SF.authority == branch_local_counterfactual` at `contested_canon` / `ABORT`, and `story-promotion-closeout` writes `authority: canon_linked` with parent CF ids.

## Deviations

1. The drafted skill dry-run was replaced with manual contract review plus package validator proof because this repo has no executable story-skill dry-run harness.
2. `docs/HARD-GATE-DISCIPLINE.md` was read because the new structural validator participates in pre-apply validation signals for story-bundle patch plans.
3. Same-seam closeout added `docs/FOUNDATIONS.md`, `tools/validators/README.md`, `specs/SPEC-25-story-coherence-hardening.md`, registry expectation tests, and CLI selector expectation tests to the owned file set.
