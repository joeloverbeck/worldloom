# SPEC25STOCOHHAR-004: SF.authority field

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/validators/src/schemas/story-fact.schema.json` and adds a structural validator; amends `.claude/skills/_shared-templates/story-state-contract.md` (§4.5.3); modifies `branching-story-bootstrap`, `branching-story-turn-cycle`, `story-fact-promotion-to-canon`, `story-promotion-closeout`.
**Deps**: None

## Problem

`story-fact-promotion-to-canon` branches on `SF` `branch_local_counterfactual` authority — its scope-inflation cap (`SKILL.md:218`) and its mystery-firewall counterfactual check (`SKILL.md:248`) both read it — but `story-fact.schema.json` has no `authority` field (`required: ["id", "story_id", "created_at_page", "statement"]`). The promotion pipeline's counterfactual safeguards are dead logic today. This ticket adds the authority field the pipeline already reads.

## Assumption Reassessment (2026-05-14)

1. `story-fact-promotion-to-canon/SKILL.md:218` ("Branch-local-counterfactual cap" — counterfactual `SF` caps the candidate at `contested_canon`) and `:248` ("Branch-local counterfactual presented as objective canon" — `firewall_verdict: ABORT` unless `desired_canon_status: contested_canon`) both read `SF` `branch_local_counterfactual` authority. `tools/validators/src/schemas/story-fact.schema.json` has `derived_from` in `properties` (line 12) but no `authority`, and `required` (line 5) omits it.
2. SPEC-25 D2 prescribes `authority: branch_local | branch_local_counterfactual | canon_candidate | canon_linked` (required; default `branch_local`) at contract §4.5.3, with the CF link riding the existing `SF.derived_from` (which already accepts `CF-<integer>`) — no separate canon-link field is added.
3. Cross-skill boundary under audit: the `SF` schema (contract §4.5.3 ↔ `story-fact.schema.json`) consumed by `branching-story-bootstrap` / `branching-story-turn-cycle` (write side — set `authority` on every `SF` creation), `story-fact-promotion-to-canon` (read side — Phase 3.1 / 4.3), and `story-promotion-closeout` (write side — Phase 2 `accepted` supersedes the source `SF` with `authority: canon_linked`).
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately) + §Story Bundles §11 (Mystery and Canon Authority): restated before trusting the spec — `branch_local_counterfactual` keeps deliberate canon contradictions from being laundered into hard canon. This ticket makes that firewall *schema-backed* rather than aspirational; it does not weaken the Mystery Reserve firewall and does not resolve any Mystery Reserve entry — it strengthens the promotion pipeline's existing counterfactual cap by giving it a real field to read.
5. Schema extension: `story-fact.schema.json` is extended. Consumers — the four skills above plus `record_schema_compliance`. The extension is a **required** field (every new `SF` must carry `authority`), not additive-only-with-default at the schema level; however, because there are zero production story bundles (SPEC-25 §Problem), there is no existing-record migration cost — this is greenfield. The skill writers (`branching-story-bootstrap`, `branching-story-turn-cycle`) are updated in this same ticket to emit it.

## Architecture Check

1. Reusing `SF.derived_from` for the CF link — rather than adding a separate `canon_link` field — keeps a promoted fact self-honest with one field, consistent with `story-promotion-closeout` Phase 2, and satisfies §5b schema-minimalism.
2. No shims: `authority` is a required field with a documented default of `branch_local`; no optional-with-fallback aliasing, no compatibility path for `authority`-less records.

## Verification Layers

1. `story-fact.schema.json` carries `authority` (the four-value enum) in `properties` and in `required` -> schema validation / grep-proof.
2. `story-fact-promotion-to-canon` Phase 3.1 / 4.3 read a schema-backed field -> manual review: the SKILL.md text matches the four-value enum exactly.
3. A `branch_local_counterfactual` source `SF` is correctly capped at `contested_canon` -> skill dry-run of `story-fact-promotion-to-canon`.
4. An `SF` with `authority: canon_linked` carries at least one `CF-<integer>` in `derived_from` -> validator test (the new structural check).

## What to Change

### 1. Contract §4.5.3

Add `authority: branch_local | branch_local_counterfactual | canon_candidate | canon_linked*` (required; default `branch_local`) to the `SF` schema. Document that on canon acceptance the CF link rides the existing `SF.derived_from`, consistent with `story-promotion-closeout` Phase 2 — no separate canon-link field.

### 2. story-fact.schema.json

Add `authority` (enum of the four values) to `properties` and to `required`.

### 3. Structural check — canon_linked requires a CF parent

Add a structural validator: an `SF` with `authority: canon_linked` must carry at least one `CF-<integer>` id in `derived_from`. (SPEC-25 D2 marks this check "optional"; it is included here because it is small and squarely within D2's stated scope — without it, `canon_linked` could be set with no canon backing.) The implementer locates the structural-validators home (`tools/validators/src/structural/`).

### 4. Skills — write side

`branching-story-bootstrap` + `branching-story-turn-cycle`: set `authority` on every `SF` creation — `branch_local` by default, `branch_local_counterfactual` for deliberate canon contradictions, `canon_candidate` when paired with `SE.promotion_claims`.

### 5. Skills — read side

`story-fact-promotion-to-canon`: verify Phase 3.1 / 4.3 text matches the four-value enum (it now reads a schema-backed field). `story-promotion-closeout`: Phase 2 `accepted` supersedes the source `SF` with `authority: canon_linked` and the parent CF id in `derived_from` — now schema-backed rather than aspirational.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.5.3)
- `tools/validators/src/schemas/story-fact.schema.json` (modify)
- `tools/validators/src/structural/` (new structural validator for the `canon_linked` → `derived_from` check; implementer confirms the exact filename and registry wiring against the existing structural-validators layout)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)

## Out of Scope

- A separate canon-link field on `SF` — the CF link rides `derived_from` per SPEC-25 D2.
- P0 #4 `SCX` crosslink record — rejected by SPEC-25 §Out of Scope (structural).
- Any change to `canon-addition` adjudication logic — `story-fact-promotion-to-canon` still hands the candidate off; this ticket only makes the `SF`-side authority field real.
- The `story-promotion-closeout` BR-supersession cleanup — SPEC25STOCOHHAR-009.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` — `record_schema_compliance` rejects an `SF` missing `authority` and one with an out-of-enum value; the new structural check fails a `canon_linked` `SF` with no `CF-<integer>` in `derived_from` and passes one with a CF parent.
2. Skill dry-run: `story-fact-promotion-to-canon` caps a `branch_local_counterfactual` source `SF` at `contested_canon` (no hard-canon promotion).
3. `grep -n "authority" tools/validators/src/schemas/story-fact.schema.json` shows `authority` in both `properties` and `required`.

### Invariants

1. Every `SF` record carries `authority` drawn from `{branch_local, branch_local_counterfactual, canon_candidate, canon_linked}`.
2. An `SF` with `authority: canon_linked` carries at least one `CF-<integer>` in `derived_from`; the promotion pipeline never branches on an unbacked `authority` value.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — add `SF`-with-`authority` and `SF`-without-`authority` cases.
2. `tools/validators/tests/structural/` (new test) — the `canon_linked` → `derived_from` structural check: a `canon_linked` `SF` with a CF parent passes; one without fails.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. Skill dry-run of `story-fact-promotion-to-canon` with a `branch_local_counterfactual` source `SF`, inspecting the capped `desired_canon_status` / `firewall_verdict`.
