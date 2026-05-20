# STEMOACC-001: STEMO orientation-target accessibility diverges from FOUNDATIONS §6b and from the real record schemas

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`src/structural/stemo-utils.ts`, `src/structural/stemo-orientation-records-exist.ts`), validator tests (`tests/structural/stemo-helpers.ts`, `tests/structural/stemo-orientation-records-exist.test.ts`, `tests/integration/spec47-stplan-stemo-integration.test.ts`), schema annotation (`src/schemas/story-emotion.schema.json`), and the schema contract doc (`.claude/skills/_shared-templates/story-record-schemas.md` §4.5.18). No skill prose changes required.
**Deps**: None. SPEC-47 (STPLAN/STEMO introduction) and SPEC-49 (STPLAN/STEMO hardening) are already landed; this corrects a defect in the landed `stemo_orientation_records_exist` validator.

## Problem

At intake, the `stemo_orientation_records_exist` validator decided whether each `STEMO.orientation.toward_records[]` entry was "accessible to the holder" via a context-free field-name allowlist in `isRecordAccessibleToHolder`. That function accepted `story_fact_record`/`story_location_record` unconditionally, or targets carrying a matching `holder`/`owner`/`participants`/`owed_by`/`owed_to`/`basis.access_records` field equal to the emotion's holder. Every other class fell through to `false`.

Consequences observed before this ticket in a real `branching-story-bootstrap` run (world `erotica-world`, bundle `red-bunny`):

1. **The single most natural orientation target — a visible person (`STENT`) — is unreachable.** A `STENT` record has no `holder`/`owner`/`participants` field (its schema is closed; see below), so `isRecordAccessibleToHolder` always returns `false` for it. An emotion oriented at the entity it is *about* (`desire toward Ane`, `fear of the man`) is rejected with `stemo_orientation_records_active.inaccessible_target`. Authors are forced to indirect through a `SREL`/`BEL`/`SF` instead, with no schema or doc signal that this is required.

2. **FOUNDATIONS §6b was under-implemented.** §6b enumerates the lawful access routes for the observer firewall: "active `BEL` state, page-state affordances, accessible artifacts, **direct observation**, testimony, documents, inference, surveillance, institutional channels, magic/tech, or another canonically valid mechanism." The validator modeled `BEL`/artifact/`SF`/`STLOC` routes but did not model direct observation — i.e., co-location of holder and target at the emotion's page. A holder feeling something toward a person they can plainly see is the textbook §6b "direct observation" route, and the validator had no path for it.

3. **`STSEC` orientation was a latent bug.** `isRecordAccessibleToHolder` checked singular `parsed.holder` and `parsed.participants`; the `STSEC` schema exposes the secret's keepers as the plural array `holders` (see `tools/validators/src/schemas/story-secret.schema.json`). A secret-holder therefore could not orient an emotion toward their own secret ("dread toward the lie I'm keeping"), even though that is exactly the kind of state STEMO exists to track.

4. **The green unit test passed only against a schema-illegal fixture.** `tests/structural/stemo-helpers.ts` made its orientation target accessible by writing `holder: "public"` onto a `STENT` record. The real `STENT` schema (`tools/validators/src/schemas/story-entity.schema.json`) is `additionalProperties: false` with no `holder` field, so `record_schema_compliance` would reject that record. The orientation validator's "accepts known orientation records" test thus depended on a record shape the rest of the pipeline forbids — masking defect (1) with false confidence.

5. **Schema/validator/doc incoherence.** At intake, `story-emotion.schema.json` typed `orientation.toward_records[]` items as a generic `recordId` (`^[A-Z]+-...`), i.e., "any record id"; §4.5.18 of the schema contract said only "`orientation.toward_records` feeds observer-firewall checks." Neither stated the accessibility routes, so the constraint was discoverable only by triggering a runtime FAIL.

This was not a pure-strictness choice: fail-closed on un-modeled classes is the right firewall direction, but the intake allowlist (a) excluded the most natural lawful target, (b) omitted a §6b-named access route, (c) could not read `STSEC.holders`, and (d) was "proven" by an illegal fixture. The landed end-state aligns orientation accessibility with the §6b access-route enumeration and with the real record schemas.

## Assumption Reassessment (2026-05-20)

1. **Codebase.** `isRecordAccessibleToHolder` in `tools/validators/src/structural/stemo-utils.ts` is shared by orientation and appraisal validators, so the holder-scoped/branch-public policy landed there while entity direct-observation stayed in `stemo_orientation_records_exist`, where page context via `maps` and `isActiveAtEmotionPage` exists. `stemo_appraisal_basis_accessible_to_holder` remains belief-only and passed its focused regression test.
2. **Specs/docs.** FOUNDATIONS §6b (Information / Observer Firewall) names "direct observation" as a lawful access route; §6a (Belief vs. Fact) and §5b (Schema-Minimalism At Story Scope) bound what state classes mean. The schema contract `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.18 documents `orientation.toward_records` only as "observer-firewall input." `docs/plans/2026-05-19-spec47-followup-routing.md:87` deferred a free-form `orientation.toward_claim` on the grounds that the closed `toward_records[]` list "already covers the observer-firewall input use case" — which is only true if the list can actually express orienting toward a perceivable entity.
3. **Shared boundary under audit.** The contract under audit was *story-emotion orientation accessibility*: the triangle of `story-emotion.schema.json` (what targets are well-typed), `isRecordAccessibleToHolder` (what targets are accessible), and FOUNDATIONS §6b (what access routes are lawful). The landed implementation aligns those surfaces. The same boundary also touched `story-entity.schema.json` (closed; no `holder`) and `story-secret.schema.json` (`holders` plural), which the intake accessibility predicate mishandled.
4. **FOUNDATIONS principle restated (§6b).** An actor-bound piece of state is "accessible" to a holder when the holder has a canonically valid access route to it — including direct observation. The orientation firewall now accepts the implemented §6b routes without weakening into "any record id is fine."
5. **Mystery Reserve firewall (FOUNDATIONS §Rule 7 / §6b interaction).** Orientation toward a `STSEC` is accessible only to that secret's `holders` or another generic recorded access route; the `holders` read does not make a concealed secret orient-able by a non-holder and does not resolve or expose any `protected_mystery_refs[]`. The fix is read-only over `holders`; it changes accessibility, never secret status.
6. **Schema extension classification.** No new fields are added. `story-emotion.schema.json` `orientation.toward_records` item type is unchanged (still `recordId`); the change is to the *validator policy* plus a clarifying schema `description` and a §4.5.18 doc note. This is behavior-narrowing-then-correcting on the validator side and additive (comment/description) on the schema/doc side — not a breaking schema change.
7. **Blast radius of touched symbols.** `isRecordAccessibleToHolder` is referenced by `stemo-orientation-records-exist.ts` and `stemo-appraisal-basis-accessible-to-holder.ts` (grep `tools/validators/src` for the symbol). The appraisal path only ever passes `belief_record` targets, so entity co-location stayed confined to the orientation path while shared per-class route fixes landed in the shared helper. The appraisal regression test passed.
8. **Adjacent contradictions classified.**
   - *Required consequence of this ticket:* the `STENT`-unreachable defect and the `story-emotion.schema.json` ↔ validator divergence (the headline fix).
   - *Separate bug uncovered during reassessment, folded in because it lives in the same predicate:* `STSEC.holders` (plural) is never read.
   - *Required consequence (consistency):* `SF`/`STLOC` are unconditionally accessible but equally branch-public `THR`/`CNSQ`/`STQ` are not. The fix must state an explicit, principled per-class policy rather than the current incidental allowlist; `STQ` accessibility must respect its `audience_visibility` so a `hidden` setup is not leaked.
   - *Test-hygiene defect, in scope and fixed:* the illegal `holder: "public"` `STENT` fixture in `stemo-helpers.ts` (and the `STENT-2` orientation fixture in the SPEC-47 integration test) was replaced with real §6b active co-location evidence.

## Architecture Check

1. **Per-`node_type` accessibility policy aligned to §6b beats the field-name allowlist.** The current function infers accessibility from whichever access-bearing field name happens to be present, which silently fails-closed on any class whose access model uses a different field name (`STENT` none; `STSEC` `holders`; `STSTAT` `entity`). Replacing it with an explicit per-class policy keyed to FOUNDATIONS §6b access routes makes the firewall's coverage auditable against a named contract and removes the "new class ⇒ silently un-pointable" failure mode. Direct-observation accessibility for entities is computed in the validator (which already has page/`maps` context) so the context-free shared helper stays pure for the appraisal path.
2. **No backwards-compatibility shims.** The illegal `holder: "public"`-on-`STENT` fixture pattern is deleted, not aliased; the corrected validator and corrected fixtures land together. No legacy "tolerate `holder` on entity" path is introduced. The schema item type is left as-is (no field added, no field removed).

## Verification Layers

1. *Entity orientation is accepted via direct observation (§6b)* -> package-local structural/integration tests: synthetic STEMO fixtures orient `toward_records: [STENT-x]` where holder and target are active and co-located at the page, and `stemo_orientation_records_exist` returns no `stemo_orientation_records_active.inaccessible_target`. The drafted `/tmp/<bundle>/envelope.json` dry-run is not a portable acceptance gate in this checkout; use the focused validator tests as the required proof and leave a real-bundle `validate-patch-plan` smoke as optional operator follow-through when a live envelope exists.
2. *A non-perceivable entity is still rejected* -> schema validation / unit test: a STEMO oriented at an offstage or non-co-located `STENT` still yields `inaccessible_target`.
3. *`STSEC.holders` is honored* -> unit test: a secret-holder orienting toward their own `STSEC` passes; a non-holder orienting toward a `hidden` `STSEC` fails `inaccessible_target`.
4. *No Mystery Reserve leak* -> FOUNDATIONS alignment check (§Rule 7 / §6b): confirm the `STSEC` accessibility change reads `holders` only and never mutates `status` or `protected_mystery_refs`; manual review of the diff confirms read-only.
5. *Branch-public consistency* -> FOUNDATIONS alignment check (§6a/§6b): `THR`/`CNSQ` accessible as branch-public causal state; `STQ` accessibility gated by `audience_visibility`; policy stated in code comments citing §6b.
6. *Fixtures match real schemas* -> codebase grep-proof + schema validation: grep the validator test tree for `holder: "public"` (and any `holder:` on a `story_entity_record` fixture); confirm zero remaining, and add an integration assertion that orientation fixtures pass `record_schema_compliance` so a STEMO test fixture can never again use a schema-illegal record shape.
7. *Appraisal path unchanged* -> unit test: existing `stemo_appraisal_basis_accessible_to_holder` tests pass byte-for-byte; the belief-only accessibility semantics are untouched.

## Landed Changes

1. **`tools/validators/src/structural/stemo-utils.ts` — explicit shared accessibility policy.**
   - `SF`, `STLOC`, `THR`, and `CNSQ` are branch-public orientation targets.
   - `STSEC` now honors `holders[]` membership.
   - `STQ` is accessible when `audience_visibility` is not `hidden`; hidden STQ records still fail closed unless another holder-grounded route exists.
   - Existing holder, basis, custody, obligation, and relationship routes remain available for `BEL`/`STINT`/`STPLAN`/`STEMO`/`STOBJ`/`OBL`/`SREL`.
2. **`tools/validators/src/structural/stemo-orientation-records-exist.ts` — direct-observation branch.** `story_entity_record` targets are accessible when both the STEMO holder and target entity are active at the emotion page and have active `STSTAT.location` records with the same non-hidden/non-offstage location. The existing missing, inaccessible, inactive, and imagined false-BEL behaviors were preserved.
3. **`tools/validators/src/schemas/story-emotion.schema.json` — clarified intent.** `orientation.toward_records` now describes the lawful accessibility routes without adding or removing fields.
4. **`.claude/skills/_shared-templates/story-record-schemas.md` §4.5.18 — documented the orientation accessibility contract.** The shared schema contract now names entity direct observation, secret holder access, branch-public state, and STQ visibility.
5. **Tests.** The illegal `holder: "public"`-on-`STENT` fixtures were removed. Structural tests now cover co-located entity acceptance, non-co-located entity rejection, STSEC holder/non-holder behavior, THR/CNSQ branch-public accessibility, STQ visibility gating, false-BEL carve-out preservation, and appraisal regression. SPEC-47 integration now asserts the STEMO orientation fixture's `STEMO-1` and `STENT-2` records pass `record_schema_compliance`.

## Files to Touch

- `tools/validators/src/structural/stemo-utils.ts` (modify)
- `tools/validators/src/structural/stemo-orientation-records-exist.ts` (modify)
- `tools/validators/src/schemas/story-emotion.schema.json` (modify)
- `tools/validators/tests/structural/stemo-helpers.ts` (modify)
- `tools/validators/tests/structural/stemo-orientation-records-exist.test.ts` (modify)
- `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)

## Out of Scope

- Live world/story content repair and any direct writes under `worlds/`.
- Adding `orientation.toward_claim`; `docs/plans/2026-05-19-spec47-followup-routing.md` continues to defer that field until a §5b-class consumer exists.
- A real-bundle `validate-patch-plan` dry-run without a portable checked-in envelope.

## Tests

- New/modified unit tests in `tools/validators/tests/structural/stemo-orientation-records-exist.test.ts`:
  - `accepts entity orientation when holder and target are co-located` (rationale: encodes the §6b direct-observation route, the headline fix).
  - `rejects entity orientation when target is offstage / not co-located` (rationale: firewall must not leak; co-location is required, not assumed).
  - `accepts STSEC orientation by a holder listed in holders[]` and `rejects hidden STSEC orientation by a non-holder` (rationale: closes the `holders` plural bug without weakening Rule 7).
  - `branch-public THR/CNSQ accessible; hidden STQ inaccessible to non-grounded holder` (rationale: principled per-class policy).
- Modified fixtures: `tools/validators/tests/structural/stemo-helpers.ts` and `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` — remove `holder` from `story_entity_record` fixtures; ground orientation via co-located `STSTAT`.
- New integration assertion (in the spec47 integration test): each STEMO orientation fixture validates clean under `record_schema_compliance` (rationale: prevents fixtures from drifting from the production schema again — the root cause of the false-green).
- Regression guard: existing `stemo_appraisal_basis_accessible_to_holder` tests stayed green (rationale: the belief-only appraisal path did not change).

Targeted run:
```
cd tools/validators && npm run build && \
  node --test dist/tests/structural/stemo-orientation-records-exist.test.js \
                dist/tests/structural/stemo-appraisal-basis-accessible-to-holder.test.js \
                dist/tests/integration/spec47-stplan-stemo-integration.test.js
```
Full-pipeline guard (no regressions across the validator suite):
```
cd tools/validators && npm test
```
Optional operator follow-through when a real envelope exists:
```
node tools/world-mcp/dist/src/cli/validate-patch-plan.js <real-envelope-path>
```

## Outcome

Completed. STEMO orientation accessibility now accepts §6b direct observation of co-located visible entities, honors `STSEC.holders[]`, treats `THR`/`CNSQ` as branch-public causal state, and gates `STQ` by `audience_visibility`. The schema and shared story-record contract now describe the same policy, and the old schema-illegal `holder: "public"` STENT fixtures were removed.

## Verification Result

1. Pre-edit package baseline: `npm run build` from `tools/validators` passed.
2. Targeted proof: `node --test dist/tests/structural/stemo-orientation-records-exist.test.js dist/tests/structural/stemo-appraisal-basis-accessible-to-holder.test.js dist/tests/integration/spec47-stplan-stemo-integration.test.js` from `tools/validators` passed (`21` tests).
3. Stale illegal-fixture proof: `rg -n 'holder: "public"|holder: public|holder: ''public''' tools/validators/tests/structural tools/validators/tests/integration` returned no matches, which is the expected success signal.
4. Full package guard: `npm test` from `tools/validators` passed (`696` tests).
5. Manual FOUNDATIONS/HARD-GATE review: the change is read-only validator policy/schema description work, does not mutate `status` or `protected_mystery_refs`, and preserves fail-closed behavior for hidden `STSEC` non-holders and hidden `STQ` targets.

## Deviations

- The drafted `/tmp/<bundle>/envelope.json` end-to-end dry-run was replaced with portable package-local structural/integration tests because no stable checked-in or user-supplied live envelope exists in this checkout. A real-bundle `validate-patch-plan` smoke remains optional operator follow-through when an actual envelope path is available.
- `tools/validators/dist/` and `tools/validators/node_modules/` were pre-existing ignored package artifacts. `dist/` was refreshed by the build/test proof and remains an expected ignored artifact, not a tracked ticket edit.
