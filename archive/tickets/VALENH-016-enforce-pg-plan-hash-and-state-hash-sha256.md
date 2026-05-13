# VALENH-016: Enforce PG record `plan_hash` and `state_hash` as sha256-shaped required fields

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-page.schema.json` (modify), `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify), `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify current-contract PG fixtures)
**Deps**: none

## Problem

At intake, `tools/validators/src/schemas/story-page.schema.json` declared only `id`, `story_id`, and `prose_plan_path` as required, with `additionalProperties: true`. The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §4.2 declares `plan.plan_hash: sha256*` and `state_hash: sha256*` as required PG fields. Because the JSON schema did not declare these properties and `additionalProperties` was permissive, the pipeline accepted PG records whose `plan_hash` and `state_hash` were literal placeholder strings.

This surfaced in a `/branching-story-prose-attach` session on `worlds/erotica-world/stories/red-bunny/PG-1`: the committed PG record carried `plan: { plan_hash: PLACEHOLDER_TO_BE_COMPUTED }` and `state_hash: PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE`. The prose-attach skill's Phase 2 drift logic absorbed the placeholder as receipt-level drift, but the next `/branching-story-turn-cycle` from that page would inherit `PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE` as its `state_hash_parent` and fail Gate 2 (parent snapshot compatibility) on the new page. The validator-side gate now catches this class of malformed PG record.

This ticket owns ONLY the validator-side gate. Who computes the hashes (the bootstrap skill, the patch engine on submit, or a hook) is a separate writer-side ticket scoped at the emitting skill's audit — see §Out of Scope.

## Assumption Reassessment (2026-05-13)

1. **Codebase reassessment** — at intake, `tools/validators/src/schemas/story-page.schema.json` lines 5 + 9-130 confirmed `required: ["id", "story_id", "prose_plan_path"]` and `additionalProperties: true`; `plan_hash`, `state_hash`, and `plan` were undeclared. `grep -rn 'plan_hash' tools/` returned zero hits across `tools/validators/src/`, `tools/world-mcp/src/`, `tools/world-index/src/`, and `tools/patch-engine/src/` — meaning no validator, retrieval surface, or engine op referenced the field. `tools/validators/src/structural/snapshot-replay-equality.ts:30-32` short-circuited when `parent_page_id === undefined`, so the only validator that touched `state_hash` (and only by cross-reference to the last SE's `state_hash_after`, not by sha256-shape check) did not fire on root pages. The literal string `PLACEHOLDER_TO_BE_COMPUTED` appeared nowhere in `tools/` or `.claude/`. The existing test file `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` defined `validPagePayload()` without `plan_hash` or `state_hash`, and the schema accepted it — the test fixture itself ratified the gap and was updated.
2. **Doc reassessment** — `.claude/skills/_shared-templates/story-state-contract.md` §4.2 declares the PG schema's `plan` block as `{ path: pages-prose-plans/PG-<integer>.md*, plan_hash: sha256* }` and `state_hash: sha256*` as required fields. Shared contract §7 hard gate 2 (parent snapshot compatibility) reads `PG.state_hash_parent` and compares against the parent page's `state_hash`; with placeholder strings, that comparison is meaningless. `docs/FOUNDATIONS.md` §Story Bundles §4a (Plan-Authority Boundary) makes the page snapshot authoritative at commit; an authoritative snapshot whose hash is a placeholder breaks the contract. No `docs/*.md` file documents a placeholder-hash convention or names a sha256-resolution step.
3. **Cross-skill / shared-boundary identification** — the shared boundary is the `story-page` record schema as the contract between (a) skills that emit `create_pg_record` patch envelopes (`branching-story-bootstrap`, `branching-story-turn-cycle`) and (b) skills that read PG records and depend on hash semantics (`branching-story-prose-attach` reads `plan.plan_hash` + `state_hash`; `branching-story-turn-cycle` reads parent `state_hash` for Gate 2). The retcon is on the validator's accept-set: a schema permissive enough to admit placeholder strings is silently broadening every consumer's read contract.
4. **FOUNDATIONS principle / Validation Rule motivator** — Rule 6 (No Silent Retcons) is the motivating rule. The retcon justification on the validator's accept-set: existing behavior is "schema accepts any string-or-anything for the hash fields"; new behavior is "schema requires both as 64-char lowercase-hex strings"; the warrant is the shared contract §4.2 declaration that has been in force since the greenfield reset (`docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`) but never enforced at the validator layer. The retcon attaches to a fix-side change, not a content-side change — it tightens an over-permissive surface.
5. **Schema extension** — this is an additive-only extension to `story-page.schema.json`: declare `plan` as a required object property with `path` (existing string-shape pattern) and `plan_hash` (sha256 pattern `^[0-9a-f]{64}$`), and declare `state_hash` as a required top-level property with the same sha256 pattern. Consumers of this schema: `tools/validators/src/structural/record-schema-compliance.ts` (the validator that loads the schema) — already wired; `tools/world-mcp/src/tools/describe-envelope-schema.ts:404-405` (`create_pg_record` envelope schema lookup via `story-page.schema.json`) — already wired. No consumer change needed because the schema is loaded by reference, not by enumeration of fields.
6. **Same-package fixture fallout** — `tools/validators/tests/integration/validate-patch-plan.test.ts` contains current-contract positive `create_pg_record` fixtures (`replaySafePagePlan()` and derived pending-page plans) that flow through `record_schema_compliance` during pre-apply validation. Those fixtures must gain valid `prose_plan_path`, `plan`, and `state_hash` values with the schema change so broad validators tests do not preserve the old permissive accept-set. Page fixtures that are only local inputs to non-schema structural validators remain outside this ticket because those tests do not execute `record_schema_compliance`.
7. **Adjacent contradictions** — three were uncovered during reassessment and must be classified:
   - **Existing `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` carries placeholder strings**: this becomes invalid under the new schema. **Separate bug, not a consequence of this ticket.** Root cause is on the emitting side (the bootstrap pipeline did not compute hashes before submit). The repair pathway is either (a) a manual `update_record_field` patch plan recomputing the hashes from canonical state-snapshot bytes and plan-file bytes, or (b) re-bootstrap once the writer-side ticket lands. Routes to a follow-on audit on `branching-story-bootstrap` via `/skill-audit` or `/mcp-integration-audit` once that skill is exercised again.
   - **Writer-side responsibility is undecided**: neither `tools/patch-engine/src/` nor any bootstrap skill prose currently computes these hashes. **Separate ticket needed**, scoped at the writer audit. This validator-side ticket is the load-bearing fix because without it a writer-side fix could regress silently; the writer-side ticket should land second.
   - **Zero-padded vs unpadded ID drift in the same bundle** (e.g., `PG-1` on disk vs allocator returning `PG-<unpadded>` per `tools/world-mcp/src/tools/allocate-next-id.ts:11-62`): **separate observation, out of scope for this ticket**, surfaced in the same audit session, routes to `/skill-audit .claude/skills/branching-story-bootstrap` follow-up.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** Three alternatives were considered. (a) Adding a dedicated structural validator that scans `state_hash` and `plan_hash` for sha256 shape — duplicates the JSON-schema enforcement that already covers other PG fields and creates a second authority for the same invariant. (b) Adding hash computation to the patch engine on submit — useful but orthogonal; the validator-side gate is the load-bearing one because it prevents malformed records from landing regardless of who computes the hashes. (c) Adding the sha256 declaration as a description-only doc note — leaves the invariant unenforced and matches the current broken state. Declaring `plan_hash` / `state_hash` in the JSON schema with the standard sha256 pattern routes the enforcement through the validator surface that already loads `story-page.schema.json` and runs at every patch-plan dry-run / apply, with zero new code paths.
2. **No backwards-compatibility aliasing/shims introduced.** The schema becomes strictly stricter — no opt-in flag, no transitional placeholder accept-set, no `format: optional-sha256` carve-out. Existing records that currently carry placeholder strings will fail validation; that exposure is the intended pressure on the writer-side follow-up ticket. The ticket explicitly documents this in §Out of Scope.

## Verification Layers

1. **Schema-declares-and-requires invariant** → codebase grep-proof: `grep -E '"plan_hash"|"state_hash"' tools/validators/src/schemas/story-page.schema.json` returns the two property declarations, and the schema's `required` array contains both `plan_hash` (under `plan`) and `state_hash` (top-level).
2. **Placeholder-string rejection invariant** → schema validation via `record_schema_compliance` unit test: a PG payload with `plan.plan_hash: "PLACEHOLDER_TO_BE_COMPUTED"` produces a `record_schema_compliance.pattern` verdict on `/plan/plan_hash`; same payload with `state_hash: "PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE"` produces the same verdict shape on `/state_hash`.
3. **Missing-field rejection invariant** → schema validation via `record_schema_compliance` unit test: a PG payload missing `plan` produces a `record_schema_compliance.required` verdict naming `plan`; a payload missing `state_hash` produces the same verdict shape naming `state_hash`.
4. **Valid-sha256 acceptance invariant** → schema validation via `record_schema_compliance` unit test: a PG payload with two 64-char lowercase-hex strings passes `record_schema_compliance` with zero verdicts.
5. **FOUNDATIONS / shared-contract alignment** → manual review against `.claude/skills/_shared-templates/story-state-contract.md` §4.2 to confirm the schema's `plan` and `state_hash` shapes match the canonical declaration; cited in the ticket Outcome.

## Landed Changes

### 1. Declared `plan` and `state_hash` in `tools/validators/src/schemas/story-page.schema.json`

The `required` array now includes `plan` and `state_hash` while preserving existing entries `id`, `story_id`, and `prose_plan_path`. `plan` is now a property of type `object` with `additionalProperties: false`, `required: ["path", "plan_hash"]`, and nested properties:
- `path`: type `string`, pattern `^pages-prose-plans/PG-[0-9]+\\.md$`
- `plan_hash`: type `string`, pattern `^[0-9a-f]{64}$`

`state_hash` is now a top-level property of type `string` with pattern `^[0-9a-f]{64}$`.

Description strings on both properties cite `_shared-templates/story-state-contract.md` §4.2 so future readers know the authority.

### 2. Updated PG schema tests and pre-apply integration fixtures

`tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` now has `validPagePayload()` include:
```ts
plan: {
  path: "pages-prose-plans/PG-1.md",
  plan_hash: "0000000000000000000000000000000000000000000000000000000000000001"
},
state_hash: "0000000000000000000000000000000000000000000000000000000000000002",
```
(Test-fixture hex values; not derived from any real plan/state bytes.)

Four new tests were added:
- `record_schema_compliance rejects PG record missing plan` — delete `parsed.plan`; assert `record_schema_compliance.required` verdict naming `plan`.
- `record_schema_compliance rejects PG record missing state_hash` — delete `parsed.state_hash`; assert `record_schema_compliance.required` verdict naming `state_hash`.
- `record_schema_compliance rejects PG record with placeholder plan_hash` — set `parsed.plan.plan_hash = "PLACEHOLDER_TO_BE_COMPUTED"`; assert a `record_schema_compliance.pattern` verdict whose message contains `/plan/plan_hash`.
- `record_schema_compliance rejects PG record with placeholder state_hash` — set `parsed.state_hash = "PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE"`; assert a `record_schema_compliance.pattern` verdict whose message contains `/state_hash`.

The existing positive tests continue to assert the new `validPagePayload()` is accepted. `tools/validators/tests/integration/validate-patch-plan.test.ts` now supplies valid `prose_plan_path`, `plan.path`, `plan.plan_hash`, and `state_hash` values on current-contract PG patch fixtures so pre-apply integration tests exercise the stricter schema without preserving the old accept-set.

## Files to Touch

- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify current-contract PG fixtures)

## Out of Scope

- **Who computes `plan_hash` and `state_hash`** — the writer-side fix (bootstrap skill computes before submit, OR patch engine computes on submit, OR a hook stamps on commit) belongs to a separate ticket scoped at whichever surface owns the computation. This ticket's purpose is exclusively the validator gate that prevents malformed records from landing regardless of who computes.
- **Repair of `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml`** — the existing placeholder-bearing PG record requires a separate `update_record_field` patch plan (or full re-bootstrap) to bring it into compliance with the new schema. Tracking that repair is downstream of the writer-side ticket landing.
- **ID padding convention** (`PG-1` zero-padded on disk vs `allocate_next_id` returning unpadded `PG-N`) — surfaced in the same audit session but routes to `/skill-audit .claude/skills/branching-story-bootstrap` follow-up; this ticket touches no allocator or naming convention.
- **Other story-bundle schemas (`story-event`, `story-branch`, etc.)** — they may have parallel under-declaration issues but each requires independent audit; this ticket is scoped strictly to `story-page.schema.json`.
- **`snapshot_replay_equality` validator's pre-greenfield-reset architecture references** (`applied_event_ops`, `state_hash_after`, `arc_trace_emitted`) — that validator predates the rebuilt story-skill family; refactor / replace is a separate concern.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validators test suite passes, including the four new negative tests and the updated `validPagePayload()`-based positive tests in `record-schema-compliance-story-page.test.ts`.
2. `cd tools/validators && node --test --test-name-pattern='record_schema_compliance.*PG' dist/tests/structural/record-schema-compliance-story-page.test.js` — the focused PG schema tests run and pass after `npm run build`.
3. `cd tools/validators && npm run build` — schema is loadable; no TypeScript compile errors from the schema-loader path.

### Invariants

1. Every PG record committed via `create_pg_record` must carry `plan.plan_hash` and `state_hash` as 64-char lowercase-hex strings, structurally enforced by `record_schema_compliance` ahead of patch-engine apply.
2. The accept-set of `story-page.schema.json` strictly contracts (no records that previously passed but should not pass now silently). The reverse — records that previously failed but should now pass — is empty by construction (sha256 is a tighter constraint than no constraint).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` — update `validPagePayload()` to include a valid `plan` block and `state_hash`; add four negative tests (missing `plan`, missing `state_hash`, placeholder `plan_hash`, placeholder `state_hash`) per the §Verification Layers contract.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` — update current-contract positive PG patch fixtures to include `prose_plan_path`, `plan.path`, `plan.plan_hash`, and `state_hash`, preserving the integration validator checks while exercising the new schema accept-set.

### Commands

1. `cd tools/validators && npm run build` — compile the package and refresh `dist/`.
2. `cd tools/validators && node --test --test-name-pattern='record_schema_compliance.*PG' dist/tests/structural/record-schema-compliance-story-page.test.js` — targeted: confirms the new hash tests pass and the existing PG record-schema-compliance tests still pass.
3. `cd tools/validators && npm test` — full-pipeline: confirms no other validator test regressed from the schema tightening. Current-contract positive `create_pg_record` integration fixtures are updated with valid hash fields so this broad run exercises the new schema accept-set.

## Outcome

`story-page.schema.json` now requires PG records to carry `plan.path`, `plan.plan_hash`, and `state_hash`, with both hashes constrained to 64-character lowercase hex sha256 shape. The structural PG schema tests now prove valid-hash acceptance, missing-field rejection, and placeholder-string rejection. The `validate-patch-plan` integration fixtures that represent current-contract PG creates now include valid hash fields so pre-apply validation exercises the stricter schema.

## Verification Result

1. `cd tools/validators && npm run build` — passed; TypeScript compiled and `dist/src/cli/world-validate.js` was refreshed.
2. `cd tools/validators && node --test --test-name-pattern='record_schema_compliance.*PG' dist/tests/structural/record-schema-compliance-story-page.test.js` — passed; 12 focused PG schema subtests passed, including missing `plan`, missing `state_hash`, placeholder `plan_hash`, and placeholder `state_hash`.
3. `cd tools/validators && npm test` — passed; 183 compiled validators tests passed.
4. Manual review: `docs/FOUNDATIONS.md` §Story Bundles §4a and `.claude/skills/_shared-templates/story-state-contract.md` §4.2 align with the landed validator shape: page snapshots are authoritative at page-plan commit, and PG records require `plan.plan_hash` plus `state_hash`.

## Deviations

- The drafted targeted command `npm test -- --test-name-pattern='record_schema_compliance.*PG'` was not retained as the targeted proof because the package wrapper still executed the broad compiled suite. The accepted targeted proof is the direct compiled `node --test --test-name-pattern='record_schema_compliance.*PG' dist/tests/structural/record-schema-compliance-story-page.test.js` command after `npm run build`.
- The ticket did not repair existing placeholder-bearing live world content or implement writer-side hash computation; both remain the explicitly out-of-scope follow-up surfaces named above.
