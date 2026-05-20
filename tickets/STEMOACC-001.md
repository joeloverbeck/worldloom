# STEMOACC-001: STEMO orientation-target accessibility diverges from FOUNDATIONS §6b and from the real record schemas

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`src/structural/stemo-utils.ts`, `src/structural/stemo-orientation-records-exist.ts`), validator tests (`tests/structural/stemo-helpers.ts`, `tests/structural/stemo-orientation-records-exist.test.ts`, `tests/integration/spec47-stplan-stemo-integration.test.ts`), schema annotation (`src/schemas/story-emotion.schema.json`), and the schema contract doc (`.claude/skills/_shared-templates/story-record-schemas.md` §4.5.18). No skill prose changes required.
**Deps**: None. SPEC-47 (STPLAN/STEMO introduction) and SPEC-49 (STPLAN/STEMO hardening) are already landed; this corrects a defect in the landed `stemo_orientation_records_exist` validator.

## Problem

The `stemo_orientation_records_exist` validator decides whether each `STEMO.orientation.toward_records[]` entry is "accessible to the holder" via `isRecordAccessibleToHolder` (`tools/validators/src/structural/stemo-utils.ts:183`). That function is a context-free **field-name allowlist**: it returns `true` for `story_fact_record`/`story_location_record` unconditionally, or when the target carries a matching `holder`/`owner`/`participants`/`owed_by`/`owed_to`/`basis.access_records` field equal to the emotion's holder. Every other class falls through to `false`.

Consequences observed in a real `branching-story-bootstrap` run (world `erotica-world`, bundle `red-bunny`):

1. **The single most natural orientation target — a visible person (`STENT`) — is unreachable.** A `STENT` record has no `holder`/`owner`/`participants` field (its schema is closed; see below), so `isRecordAccessibleToHolder` always returns `false` for it. An emotion oriented at the entity it is *about* (`desire toward Ane`, `fear of the man`) is rejected with `stemo_orientation_records_active.inaccessible_target`. Authors are forced to indirect through a `SREL`/`BEL`/`SF` instead, with no schema or doc signal that this is required.

2. **FOUNDATIONS §6b is under-implemented.** §6b enumerates the lawful access routes for the observer firewall: "active `BEL` state, page-state affordances, accessible artifacts, **direct observation**, testimony, documents, inference, surveillance, institutional channels, magic/tech, or another canonically valid mechanism." The validator models `BEL`/artifact/`SF`/`STLOC` routes but **never models direct observation** — i.e., co-location of holder and target at the emotion's page. A holder feeling something toward a person they can plainly see is the textbook §6b "direct observation" route, and the validator has no path for it.

3. **`STSEC` orientation is a latent bug.** `isRecordAccessibleToHolder` checks singular `parsed.holder` and `parsed.participants`; the `STSEC` schema exposes the secret's keepers as the plural array `holders` (see `tools/validators/src/schemas/story-secret.schema.json`). A secret-holder therefore cannot orient an emotion toward their own secret ("dread toward the lie I'm keeping"), even though that is exactly the kind of state STEMO exists to track.

4. **The green unit test passes only against a schema-illegal fixture.** `tests/structural/stemo-helpers.ts` makes its orientation target accessible by writing `holder: "public"` onto a `STENT` record. The real `STENT` schema (`tools/validators/src/schemas/story-entity.schema.json`) is `additionalProperties: false` with no `holder` field, so `record_schema_compliance` would reject that record. The orientation validator's "accepts known orientation records" test thus depends on a record shape the rest of the pipeline forbids — masking defect (1) with false confidence.

5. **Schema/validator/doc incoherence.** `story-emotion.schema.json` types `orientation.toward_records[]` items as a generic `recordId` (`^[A-Z]+-...`), i.e., "any record id"; §4.5.18 of the schema contract says only "`orientation.toward_records` feeds observer-firewall checks." Neither states that most classes are silently un-pointable, so the constraint is discoverable only by triggering a runtime FAIL.

This is not a pure-strictness choice: fail-closed on un-modeled classes is the right firewall direction, but the allowlist (a) excludes the most natural lawful target, (b) omits a §6b-named access route, (c) can't read `STSEC.holders`, and (d) is "proven" by an illegal fixture. The honest end-state aligns orientation accessibility with the §6b access-route enumeration and with the real record schemas.

## Assumption Reassessment (2026-05-20)

1. **Codebase.** `isRecordAccessibleToHolder` at `tools/validators/src/structural/stemo-utils.ts:183-205` is the sole accessibility predicate; `isOrientationTargetAccessibleToHolder` (`:207`) is a thin holder-undefined guard around it. `stemo_orientation_records_exist` (`tools/validators/src/structural/stemo-orientation-records-exist.ts:14`) is the only orientation consumer; it already holds page context via `maps` and `isActiveAtEmotionPage`, so a co-location check can live there without changing the validator framework signature. Note `isRecordAccessibleToHolder` is also reused by `stemo_appraisal_basis_accessible_to_holder` (appraisal_basis is BEL-only, so that consumer is unaffected by entity/STSEC changes) — confirm no behavior change to the appraisal path when refactoring.
2. **Specs/docs.** FOUNDATIONS §6b (Information / Observer Firewall) names "direct observation" as a lawful access route; §6a (Belief vs. Fact) and §5b (Schema-Minimalism At Story Scope) bound what state classes mean. The schema contract `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.18 documents `orientation.toward_records` only as "observer-firewall input." `docs/plans/2026-05-19-spec47-followup-routing.md:87` deferred a free-form `orientation.toward_claim` on the grounds that the closed `toward_records[]` list "already covers the observer-firewall input use case" — which is only true if the list can actually express orienting toward a perceivable entity.
3. **Shared boundary under audit.** The contract under audit is *story-emotion orientation accessibility*: the triangle of `story-emotion.schema.json` (what targets are well-typed), `isRecordAccessibleToHolder` (what targets are accessible), and FOUNDATIONS §6b (what access routes are lawful). The three must agree. The same boundary also touches `story-entity.schema.json` (closed; no `holder`) and `story-secret.schema.json` (`holders` plural), which the accessibility predicate currently mishandles.
4. **FOUNDATIONS principle restated (§6b).** An actor-bound piece of state is "accessible" to a holder when the holder has a canonically valid access route to it — including direct observation. The orientation firewall must accept exactly the §6b routes, no fewer (the current defect) and no more (it must not leak hidden state). It must not weaken into "any record id is fine."
5. **Mystery Reserve firewall (FOUNDATIONS §Rule 7 / §6b interaction).** Orientation toward a `STSEC` must be accessible only to that secret's `holders` (or via a recorded access route); fixing the `holders` read must NOT make a concealed secret orient-able by a non-holder, and must NOT resolve or expose any `protected_mystery_refs[]`. The fix is read-only over `holders`; it changes accessibility, never secret status.
6. **Schema extension classification.** No new fields are added. `story-emotion.schema.json` `orientation.toward_records` item type is unchanged (still `recordId`); the change is to the *validator policy* plus a clarifying schema `description` and a §4.5.18 doc note. This is behavior-narrowing-then-correcting on the validator side and additive (comment/description) on the schema/doc side — not a breaking schema change.
7. **Blast radius of touched symbols.** `isRecordAccessibleToHolder` is referenced by `stemo-orientation-records-exist.ts` and `stemo-appraisal-basis-accessible-to-holder.ts` (grep `tools/validators/src` for the symbol). The appraisal path only ever passes `belief_record` targets, so the entity/STSEC/co-location changes must be confined to the orientation path (preferably a new `isOrientationTargetAccessibleToHolder` body that composes the shared per-class checks plus orientation-only co-location), leaving the appraisal path's belief-only semantics byte-for-byte unchanged.
8. **Adjacent contradictions classified.**
   - *Required consequence of this ticket:* the `STENT`-unreachable defect and the `story-emotion.schema.json` ↔ validator divergence (the headline fix).
   - *Separate bug uncovered during reassessment, folded in because it lives in the same predicate:* `STSEC.holders` (plural) is never read.
   - *Required consequence (consistency):* `SF`/`STLOC` are unconditionally accessible but equally branch-public `THR`/`CNSQ`/`STQ` are not. The fix must state an explicit, principled per-class policy rather than the current incidental allowlist; `STQ` accessibility must respect its `audience_visibility` so a `hidden` setup is not leaked.
   - *Test-hygiene defect, in scope:* the illegal `holder: "public"` `STENT` fixture in `stemo-helpers.ts` (and the `STENT-2` orientation fixture in the SPEC-47 integration test) must be replaced with a real §6b access route.

## Architecture Check

1. **Per-`node_type` accessibility policy aligned to §6b beats the field-name allowlist.** The current function infers accessibility from whichever access-bearing field name happens to be present, which silently fails-closed on any class whose access model uses a different field name (`STENT` none; `STSEC` `holders`; `STSTAT` `entity`). Replacing it with an explicit per-class policy keyed to FOUNDATIONS §6b access routes makes the firewall's coverage auditable against a named contract and removes the "new class ⇒ silently un-pointable" failure mode. Direct-observation accessibility for entities is computed in the validator (which already has page/`maps` context) so the context-free shared helper stays pure for the appraisal path.
2. **No backwards-compatibility shims.** The illegal `holder: "public"`-on-`STENT` fixture pattern is deleted, not aliased; the corrected validator and corrected fixtures land together. No legacy "tolerate `holder` on entity" path is introduced. The schema item type is left as-is (no field added, no field removed).

## Verification Layers

1. *Entity orientation is accepted via direct observation (§6b)* -> skill dry-run: re-run `branching-story-bootstrap` for a bundle whose STEMO orients `toward_records: [STENT-x]` where holder and target are co-located/active at the page; `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <envelope>` returns `status: pass` with no `stemo_orientation_records_active.inaccessible_target`.
2. *A non-perceivable entity is still rejected* -> schema validation / unit test: a STEMO oriented at an offstage or non-co-located `STENT` still yields `inaccessible_target`.
3. *`STSEC.holders` is honored* -> unit test: a secret-holder orienting toward their own `STSEC` passes; a non-holder orienting toward a `hidden` `STSEC` fails `inaccessible_target`.
4. *No Mystery Reserve leak* -> FOUNDATIONS alignment check (§Rule 7 / §6b): confirm the `STSEC` accessibility change reads `holders` only and never mutates `status` or `protected_mystery_refs`; manual review of the diff confirms read-only.
5. *Branch-public consistency* -> FOUNDATIONS alignment check (§6a/§6b): `THR`/`CNSQ` accessible as branch-public causal state; `STQ` accessibility gated by `audience_visibility`; policy stated in code comments citing §6b.
6. *Fixtures match real schemas* -> codebase grep-proof + schema validation: grep the validator test tree for `holder: "public"` (and any `holder:` on a `story_entity_record` fixture); confirm zero remaining, and add an integration assertion that orientation fixtures pass `record_schema_compliance` so a STEMO test fixture can never again use a schema-illegal record shape.
7. *Appraisal path unchanged* -> unit test: existing `stemo_appraisal_basis_accessible_to_holder` tests pass byte-for-byte; the belief-only accessibility semantics are untouched.

## What to Change

1. **`tools/validators/src/structural/stemo-utils.ts` — split the predicate.**
   - Keep a shared per-class accessibility core for the holder-scoped/branch-public/custody routes (`BEL`/`STINT`/`STPLAN`/`STEMO` via `holder`; `SF`/`STLOC`/`THR`/`CNSQ` as branch-public; `STOBJ` via `owner`/`carried_by`; `OBL` via `owed_by`/`owed_to`; `SREL` via `participants`; `basis.access_records`). **Add `STSEC` via `holders[]` membership** and `STQ` gated by `audience_visibility` (`explicit`/`implied` accessible; `hidden` requires holder grounding).
   - Give `isOrientationTargetAccessibleToHolder` an orientation-only extension that additionally accepts a `story_entity_record` target when the holder can perceive it. Because this needs page context, move the entity branch into the validator (step 2) or pass the needed page/`maps` projection in; the shared core stays context-free for the appraisal consumer.
2. **`tools/validators/src/structural/stemo-orientation-records-exist.ts` — direct-observation branch.** When the target is a `story_entity_record`, treat it as accessible iff both the holder entity and the target are active at the emotion's `created_at_page` and co-located (compatible active `STSTAT.location`) — the §6b "direct observation" route — falling back to the shared core otherwise. Preserve the existing `missing_orientation_record`, `inaccessible_target`, and `inactive_target` codes and the `isBelievedFalseTarget` imagined-object carve-out.
3. **`tools/validators/src/schemas/story-emotion.schema.json` — clarify intent.** Add a `description` on `orientation.toward_records` naming the lawful target classes/routes (per §6b) so the generic `recordId` type is not read as "any class is accessible." Do not add or remove fields.
4. **`.claude/skills/_shared-templates/story-record-schemas.md` §4.5.18 — document the orientation accessibility contract.** State that an orientation target must be accessible to the holder per FOUNDATIONS §6b (entities via direct observation/co-location; secrets via `holders`; branch-public state via SF/STLOC/THR/CNSQ; STQ via `audience_visibility`), and that bare-entity orientation is lawful when the holder can perceive the entity.
5. **Tests.** Replace the illegal `holder: "public"`-on-`STENT` fixtures in `tools/validators/tests/structural/stemo-helpers.ts` and `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` with co-located active entities (real `STENT` + `STSTAT` shape). Add: (a) entity-orientation accepted via co-location; (b) entity-orientation rejected when offstage/non-co-located; (c) `STSEC` holder accepted / non-holder-on-hidden rejected; (d) an integration assertion that every STEMO orientation fixture conforms to `record_schema_compliance`.

## Tests

- New/modified unit tests in `tools/validators/tests/structural/stemo-orientation-records-exist.test.ts`:
  - `accepts entity orientation when holder and target are co-located` (rationale: encodes the §6b direct-observation route, the headline fix).
  - `rejects entity orientation when target is offstage / not co-located` (rationale: firewall must not leak; co-location is required, not assumed).
  - `accepts STSEC orientation by a holder listed in holders[]` and `rejects hidden STSEC orientation by a non-holder` (rationale: closes the `holders` plural bug without weakening Rule 7).
  - `branch-public THR/CNSQ accessible; hidden STQ inaccessible to non-grounded holder` (rationale: principled per-class policy).
- Modified fixtures: `tools/validators/tests/structural/stemo-helpers.ts` and `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` — remove `holder` from `story_entity_record` fixtures; ground orientation via co-located `STSTAT`.
- New integration assertion (in the spec47 integration test): each STEMO orientation fixture validates clean under `record_schema_compliance` (rationale: prevents fixtures from drifting from the production schema again — the root cause of the false-green).
- Regression guard: existing `stemo_appraisal_basis_accessible_to_holder` tests must stay green (rationale: the belief-only appraisal path must not change).

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
End-to-end dry-run (a real bundle with entity-oriented STEMOs validates clean):
```
node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/<bundle>/envelope.json
```
