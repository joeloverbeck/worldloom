# VALENH-036: `observer_firewall` accepts cross-actor STEMO/STPLAN choice grounding only through a holder-observability BEL route

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/observer-firewall.ts`, `tools/validators/tests/structural/observer-firewall.test.ts`, plus a doc note on the choice-grounding contract under `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` so authoring matches the validator's enforced semantics.
**Deps**: none.

## Problem

At intake, `actorCanUsePlanOrEmotion` (`tools/validators/src/structural/observer-firewall.ts:213-235` before this ticket) short-circuited the moment `stringValue(parsed.holder) !== actor`:

```ts
function actorCanUsePlanOrEmotion(actor, referenceId, maps): boolean {
  const record = maps.byId.get(referenceId);
  if (record === undefined) return false;
  const parsed = asPlainRecord(record.parsed);
  if (stringValue(parsed.holder) !== actor) {
    return false;  // <-- cross-actor STEMO/STPLAN always rejected here
  }
  // ... actor-is-holder basis-belief checks (only reached when actor === holder)
}
```

There was no fall-back path. Any CHC whose `grounded_in.records[]` included a STEMO or STPLAN held by a different STENT than the SE actor failed with:

```
observer_firewall_violation_no_access_route:
  SE-<n> actor STENT-<a> lacks BEL.basis.access_records route to STEMO-<m> grounded in CHC-<c>
```

Three pieces of intake evidence made the strict `holder == actor` branch look like an oversight rather than a deliberate design choice:

1. **The error message and the actual check disagreed.** The text said `"lacks BEL.basis.access_records route to STEMO-<m>"` — i.e., it told the author that some `BEL.basis.access_records` configuration would have satisfied the rule. The intake code never consulted `access_records` on this path. The user-facing message described a code path that did not exist.

2. **The validator's own constants advertised an STPLAN/STEMO access route.** `STATIC_ACCESS_RECORD_ID` (`tools/validators/src/structural/observer-firewall.ts:17` at intake) was `/^(?:STENT|STSTAT|STLOC|STOBJ|DA|BEL|SF|SE|CLK|STSEC|STQ|STPLAN|STEMO)-\d+$/` — it included `STPLAN` and `STEMO`. The peer function `actorHasAccessRecord` (`tools/validators/src/structural/observer-firewall.ts:247-258` at intake) walked `BEL.basis.access_records` and accepted any id matching `STATIC_ACCESS_RECORD_ID`. So the validator's data model contemplated `STPLAN-<n>` / `STEMO-<n>` appearing inside `BEL.basis.access_records`, but `actorCanUsePlanOrEmotion` never called into that path, and the BEL schema (`tools/validators/src/schemas/story-belief.schema.json` `basis.properties.access_records.items.pattern`) is `^(STENT|STLOC|STOBJ|DA|BEL|SF|SE)-[0-9]+$` — *narrower* than the validator's regex. This ticket resolved the practical route through schema-legal holder-STENT observability rather than widening BEL schema ids.

3. **The cross-actor branch had zero test coverage.** At intake, `tools/validators/tests/structural/observer-firewall.test.ts` exercised four STPLAN/STEMO cases (`actorCanUsePlanOrEmotion` body):
   - actor IS holder, basis belief held by actor → accepts
   - actor IS holder, basis belief held by another → rejects (via the `basisIds.some(...)` check, not the early-return)
   - actor IS holder for STEMO with accessible appraisal basis → accepts
   - `actorCanUseStatus` has both an actor-is-entity case AND an `actorHasAccessRecord` fall-back case

   No test existed where `actorCanUsePlanOrEmotion` was called with `holder !== actor`. The early-return-`false` branch was untested behavior, not an asserted contract. The peer `actorCanUseStatus` had an observability fall-back via `actorHasAccessRecord` (`tools/validators/src/structural/observer-firewall.ts:237-245` at intake) — STSTAT could be cited by a non-entity actor when a BEL granted access. STEMO/STPLAN had no equivalent path even though they have the same observability character (visible behavior, posture, depletion are the manifestation of the underlying internal state — see STCHAR-2 `Pressure Behavior` and `Prose Rendering Constraints`, which both treat affective state as readable from outside).

In-fiction consequence at intake: `worlds/erotica-world/stories/red-bunny/_source/choices/CHC-11.yaml` was authored by the PG-3 turn-cycle with `grounded_in.records: [STENT-1, STENT-2, STCHAR-1, STEMO-2, BEL-7, BEL-9, STLOC-1]`. STENT-1 (Jon) is the actor; STEMO-2 is held by STENT-2 (Ane). The narrative justification is plain (Jon's choice to sit with her in silence answers her visible depletion), and Jon has an active observability BEL — BEL-7 — whose `basis.access_records` is `[STENT-2]` with `access_route: direct_observation`. The validator's intended-but-unimplemented route would accept this; the strict branch rejects it and blocks the PG-4 turn cycle (`branching-story-turn-cycle --world_slug erotica-world --story_slug red-bunny --parent_page_id PG-3 --chosen_choice_id CHC-11`, dry-run failure surfaced at Phase 9).

## Assumption Reassessment (2026-05-23)

1. **Codebase reassessment.** At intake, `actorCanUsePlanOrEmotion` at `tools/validators/src/structural/observer-firewall.ts:223-246` returned `false` immediately when `parsed.holder !== actor`; after this ticket it accepts cross-actor STEMO/STPLAN only through `actorHasObservabilityRouteTo` at `tools/validators/src/structural/observer-firewall.ts:271-286`. Verified `actorCanUseStatus` at `tools/validators/src/structural/observer-firewall.ts:248-255`: returns `entity === actor || actorHasAccessRecord(actor, referenceId, maps)`. Verified `actorHasAccessRecord` at `tools/validators/src/structural/observer-firewall.ts:257-269`: iterates actor-held BELs, checks `STATIC_ACCESS_RECORD_ID.test(id) && id === referenceId`. STSTAT direct-record access and STEMO/STPLAN holder-observability access are now traceable by separate helpers.
2. **Test coverage reassessment.** At intake, `tools/validators/tests/structural/observer-firewall.test.ts` only exercised actor-is-holder STPLAN/STEMO paths (`page("PG-1","CHC-1") / event("SE-1","STENT-1","PG-1") / plan("STPLAN-1","STENT-1",[...])`). This ticket added cross-actor STEMO coverage at `tools/validators/tests/structural/observer-firewall.test.ts:113-156`: accept with holder-observability BEL, reject without BEL, and reject with non-observability route.
3. **Schema reassessment.** Verified `tools/validators/src/schemas/story-belief.schema.json` `basis.properties.access_records.items.pattern` excludes `STPLAN`/`STEMO`. Verified `STATIC_ACCESS_RECORD_ID` regex at `tools/validators/src/structural/observer-firewall.ts:17` includes them. The two source-of-truth surfaces disagree.
4. **Cross-skill boundary under audit.** The choice-grounding contract between (a) the choice-generation phase of `branching-story-turn-cycle` (Phase 8, documented at `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md`, with the schema-allowed `grounded_in.records` union enumerated in `tools/validators/src/schemas/story-choice.schema.json` and the shared contract at `.claude/skills/_shared-templates/story-state-contract.md` §6) and (b) the `observer_firewall` validator that gates consumption of those grounded choices at SE-resolution time. The pre-fix validator behavior (cross-actor STEMO/STPLAN always rejected) is stricter than both the schema-allowed grounding union and the error message advertise. This ticket aligns the three surfaces.
5. **FOUNDATIONS principle restated.** `docs/FOUNDATIONS.md` §Story Bundles §6a (belief and visibility coverage) and §6b (the observer firewall) treat private holder-interior records as accessible to other actors only via documented observability routes (direct_observation, testimony, surveillance, institutional_channel, document, object_trace, location_trace). STEMO/STPLAN manifest as observable behavior (per STCHAR `Prose Rendering Constraints` and the `branching-story-turn-cycle` Phase 7 plan §9c, which explicitly directs prose to render emotional pressure through behavior and not through label). The intended firewall rule is "actor can ground in another actor's STEMO/STPLAN if and only if the actor holds a BEL granting an observability route to that STEMO/STPLAN's holder entity," matching the STSTAT pattern.
6. **Adjacent contradictions surfaced.**
   - `STATIC_ACCESS_RECORD_ID` includes `STSTAT`/`CLK`/`STSEC`/`STQ`/`STPLAN`/`STEMO`, but `story-belief.schema.json` `access_records` pattern only allows `STENT|STLOC|STOBJ|DA|BEL|SF|SE` — handled by this ticket via the "access via holder STENT" route, which keeps the schema as-is. Whether to widen the BEL schema's `access_records` pattern to admit STPLAN/STEMO ids directly is **out of scope** for this ticket and routed to a future cleanup ticket.
   - The error message `"lacks BEL.basis.access_records route to <id>"` was misleading for STEMO/STPLAN because no `access_records` check actually fired on that path. Post-fix the message is accurate: the route is via `BEL.basis.access_records` to the holder STENT. Updated wording is part of this ticket.
7. **Cross-skill safety check.** The fix is more permissive than the current rule, not more restrictive — it converts current `fail` outcomes (cross-actor STEMO/STPLAN with observability BEL present) into `ok`, and leaves all current `ok` outcomes unchanged. No CHC that passes today fails after the fix. The Mystery Reserve firewall is unaffected: this is about actor observability of other actors' interior, not about world-canon mystery resolution.

## Architecture Check

1. **Mirror the STSTAT pattern.** `actorCanUseStatus` already implements the intended shape: `entity === actor || actorHasAccessRecord(actor, referenceId, maps)`. The cleanest fix is to extend `actorCanUsePlanOrEmotion` with an exactly-parallel fall-back: if `holder !== actor`, accept when the actor holds an active BEL whose `basis.access_records` contains the holder STENT id via a real observability `access_route`. This re-uses the existing `actorHasAccessRecord` shape (resolved against the holder STENT id, not against the STEMO/STPLAN id) and keeps the BEL schema unchanged. Alternatives rejected: (a) widening the BEL schema's `access_records` pattern to admit STPLAN/STEMO ids directly is an additive schema change with no current authoring need (no authored BEL today references a STEMO/STPLAN in `access_records`, and the schema change introduces a second route that has to be tested and documented alongside the STENT-route); (b) gating the rule by `access_route` enum membership is the simplest observability check and avoids inventing a per-class taxonomy.
2. **No backwards-compatibility shims.** The change is to one function plus its tests plus one skill-doc note. No alias path, no dual-read flag, no migration. The current `actor === holder` behavior remains the fast accept path; the new fall-back only fires when that fails. Authoring that already complied (actor citing its own STEMO/STPLAN, or never citing cross-actor STEMO/STPLAN) is unaffected.
3. **Author-side discipline preserved.** The fix does NOT make STEMO/STPLAN grounding trivially universal — without an active observability BEL covering the holder STENT, cross-actor grounding still fails. This is the same shape STSTAT uses today and is the documented epistemic model.

## Verification Layers

1. **Cross-actor STEMO grounding with observability BEL is accepted** → schema validation via new `observer-firewall.test.ts` case: `plan(STPLAN-1, STENT-2, [BEL-1])` + `event(SE-1, STENT-1, PG-1)` + `belief(BEL-1, STENT-1, "private", [STENT-2])` with `access_route: direct_observation` → `verdicts: []`.
2. **Cross-actor STEMO grounding without observability BEL is rejected** → schema validation via new `observer-firewall.test.ts` case: same as above without the BEL → `verdicts.length === 1, code === "observer_firewall_violation_no_access_route"`.
3. **Cross-actor STEMO grounding with a non-observability `access_route` BEL is rejected** → schema validation via new `observer-firewall.test.ts` case: BEL with `access_route: rumor` or `authorial_initialization` and `access_records: [STENT-2]` → rejected (the route enum membership check rejects non-observability routes).
4. **Existing actor-is-holder paths continue to pass** → schema validation via the existing four STPLAN/STEMO tests in `observer-firewall.test.ts` (no regression).
5. **Schema authoring contract narrowed in the skill doc** → codebase grep-proof: `grep -n 'cross-actor STEMO/STPLAN grounding' .claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` returns ≥1 match, and the doc names the observability-BEL route as the only valid means of cross-actor STEMO/STPLAN grounding.
6. **Error message accurately names the holder-STENT route** → grep-proof: `grep -n 'BEL.basis.access_records route via the holder entity' tools/validators/src/structural/observer-firewall.ts` returns 1 match (post-edit).
7. **Historical red-bunny PG-4 validate-patch-plan envelope reaches `observer_firewall` PASS** → repo-root CLI proof: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/red-bunny-pg4-envelope.json` returns `status: "pass"` and `validators_run[]` includes `observer_firewall` with `status: "pass"`. The result still includes compatibility-drift info verdicts for optional directory absence; those are non-failing and outside this ticket.

## Landed Changes

### 1. Add an observability fall-back to `actorCanUsePlanOrEmotion`

In `tools/validators/src/structural/observer-firewall.ts`, the intake early-return now falls through to a holder-STENT observability check when `holder !== actor`. The landed shape:

```ts
const OBSERVABILITY_ACCESS_ROUTES = new Set([
  "direct_observation",
  "testimony",
  "document",
  "object_trace",
  "location_trace",
  "surveillance",
  "institutional_channel"
]);

function actorCanUsePlanOrEmotion(actor, referenceId, maps): boolean {
  const record = maps.byId.get(referenceId);
  if (record === undefined) return false;
  const parsed = asPlainRecord(record.parsed);
  const holder = stringValue(parsed.holder);
  if (holder === actor) {
    // existing actor-is-holder basis-belief check (unchanged)
    ...
  }
  if (holder === undefined || !/^STENT-\d+$/.test(holder)) {
    return false;  // group/public/narrator holders are not actor-observable via STENT route
  }
  return actorHasObservabilityRouteTo(actor, holder, maps);
}

function actorHasObservabilityRouteTo(actor, holderStentId, maps): boolean {
  for (const belief of maps.byType.get("belief_record") ?? []) {
    const parsed = asPlainRecord(belief.parsed);
    if (stringValue(parsed.holder) !== actor) continue;
    const basis = asPlainRecord(parsed.basis);
    const accessRoute = stringValue(basis.access_route);
    if (!OBSERVABILITY_ACCESS_ROUTES.has(accessRoute ?? "")) continue;
    const accessRecords = stringArray(basis.access_records);
    if (accessRecords.includes(holderStentId)) return true;
  }
  return false;
}
```

`actorHasObservabilityRouteTo` is intentionally a sibling of `actorHasAccessRecord`, not a re-use: `actorHasAccessRecord` matches the BEL's `access_records` entry against the same referenceId, while the new helper matches against the resolved holder STENT id and additionally filters by `access_route` membership in `OBSERVABILITY_ACCESS_ROUTES`. Naming the helper distinctly keeps the STSTAT route (currently `actorHasAccessRecord`) and the STEMO/STPLAN route (this new helper) traceable by separate symbols.

### 2. Update the validator's error message to name the holder-STENT route

`noAccessRoute` still emits `"lacks BEL.basis.access_records route to <referenceId>"` for direct-reference paths. For the STEMO/STPLAN code path, the route is "via the holder entity," not "to the STEMO/STPLAN id directly." This ticket split a second emitter, `noObservabilityRoute`, whose message reads:

`"<eventId> actor <actor> lacks BEL.basis.access_records route via the holder entity of <referenceId> grounded in <choiceId>"`

This keeps `noAccessRoute`'s wording correct for the STSTAT/SF paths (where the access_records entry IS the referenceId) and gives the STEMO/STPLAN path an accurate, actionable message.

### 3. Add observer-firewall tests for the cross-actor case

In `tools/validators/tests/structural/observer-firewall.test.ts`, this ticket added the three cases enumerated in **Verification Layers** items 1-3. The landed helper is `beliefWithRoute(id, holder, visibility, accessRoute, accessRecords)`, because the existing `belief` helper did not set `basis.access_route`. The actor-is-holder cases continue to pass unchanged.

### 4. Document the cross-actor STEMO/STPLAN grounding rule in the choice-generation skill reference

In `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md`, this ticket added a short normative paragraph in the grounding-rules section naming:

- Cross-actor STEMO/STPLAN grounding is valid only when the actor holds an active BEL whose `basis.access_records` contains the STEMO/STPLAN holder's STENT id and whose `basis.access_route` is one of `{direct_observation, testimony, document, object_trace, location_trace, surveillance, institutional_channel}`.
- The author should prefer grounding cross-actor affective/tactical pressure in a BEL the actor holds about the other actor (e.g., `BEL-X: "She is depleted"`), citing the BEL in `grounded_in.records[]` directly, with the STEMO/STPLAN cited as the canonical record only when the actor has the observability route required by this rule.

This keeps prose authority aligned with validator enforcement.

## Files to Touch

- `tools/validators/src/structural/observer-firewall.ts` (modify — add observability fall-back; update error message)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify — add three cross-actor cases)
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify — document the cross-actor STEMO/STPLAN grounding rule)

## Out of Scope

- Widening `tools/validators/src/schemas/story-belief.schema.json` `basis.access_records` pattern to admit `STPLAN`/`STEMO`/`CLK`/`STSEC`/`STQ`/`STSTAT` ids directly. The validator's `STATIC_ACCESS_RECORD_ID` regex already admits them, but no current authoring pattern needs the second route, and adding it without test/doc coverage would create the same schema-vs-validator drift this ticket is fixing. Route to a future ticket if authoring need surfaces.
- Tightening `actorHasAccessRecord` (the STSTAT/SF path) with an `access_route` enum filter. The STSTAT path already has the actor-is-entity fast path AND an access_records check; whether to add the same `access_route` observability gate is a separate consistency question and out of scope here.
- Repairing existing CHC records that were authored before this ticket landed (e.g., `worlds/erotica-world/stories/red-bunny/_source/choices/CHC-11.yaml`). Under the post-fix validator, CHC-11 with observability BEL-7 present passes without repair. Future authoring discipline (per change #4 above) keeps choice grounding aligned with the enforced rule.
- Cross-actor `BEL` grounding (the existing `beliefAccessVerdict` path), which already has its own access logic with `private` / `shared` / `public` visibility semantics. STEMO/STPLAN are not BELs and have a different access model.
- Modifying the world-mcp retrieval layer (`tools/world-mcp/src/tools/*`) — no retrieval contract changes.

## Acceptance Criteria

### Tests That Passed

1. `cd tools/validators && npm run build && node --test dist/tests/structural/observer-firewall.test.js` — PASS, including the three new cross-actor cases (accept-with-observability-BEL, reject-without-BEL, reject-with-non-observability-route-BEL).
2. `cd tools/validators && npm test` — PASS, full validator suite, no regression in any of the four pre-existing STPLAN/STEMO actor-is-holder tests.
3. From repo root: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/red-bunny-pg4-envelope.json` — `status: "pass"` (or, if any orthogonal pre-existing data issue exists in the bundle, only those — `observer_firewall_violation_no_access_route` for STEMO-2 grounded in CHC-11 no longer fires).
4. Direct `branching-story-turn-cycle --world_slug erotica-world --story_slug red-bunny --parent_page_id PG-3 --chosen_choice_id CHC-11` interactive dry-run was not exercised in this implementation run; the available same-envelope proof is the repo-root validate-patch-plan CLI over `/tmp/red-bunny-pg4-envelope.json`, which returns `status: "pass"` with `observer_firewall` passing.

### Invariants

1. Cross-actor STEMO/STPLAN grounding succeeds **only** when the actor holds an active BEL whose `basis.access_records` includes the holder's STENT id AND whose `basis.access_route` is in `{direct_observation, testimony, document, object_trace, location_trace, surveillance, institutional_channel}`. Without such a BEL, cross-actor grounding still fails — the rule narrows actor-knowledge to documented observability routes, exactly as STSTAT does today.
2. Actor-is-holder STEMO/STPLAN grounding behavior is unchanged (the existing belief-basis check on line 224-234 still gates the actor's own internal-state grounding).
3. The validator's user-facing error message names the route the author can fix (`"via the holder entity"` for STEMO/STPLAN), distinct from the STSTAT/SF message wording. No message says `"BEL.basis.access_records route to <id>"` for a path that does not actually consult `access_records`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/observer-firewall.test.ts` — add three cross-actor STPLAN/STEMO cases (accept-with-observability-BEL, reject-without-BEL, reject-with-non-observability-route-BEL); confirm existing actor-is-holder cases unchanged. Rationale: the cross-actor branch is the previously-untested behavior; these cases lock in the contract this ticket is asserting.
2. None for the schema side (`story-belief.schema.json` is unchanged in this ticket per Out of Scope item 1).
3. Skill-doc grep-proof for the new normative paragraph in `phase-8-choice-generation.md`. Rationale: keeps authoring discipline aligned with validator enforcement, so future CHCs do not rely on the new permissive path without an active observability BEL.

### Commands

1. Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/observer-firewall.test.js` — confirms the three new cases pass and the four pre-existing STPLAN/STEMO actor-is-holder cases remain green.
2. Full-pipeline: `cd tools/validators && npm test` — confirms no regression across the structural, integration, schema, and CLI suites.
3. End-to-end smoke: from repo root, `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/red-bunny-pg4-envelope.json` — confirms the dry-run that motivated this ticket now reaches `status: "pass"` (or whatever residual orthogonal verdicts remain, with the targeted `observer_firewall_violation_no_access_route` for `STEMO-2 grounded in CHC-11` no longer present).

## Outcome

Completed: 2026-05-23.

Implemented the holder-observability route for cross-actor STEMO/STPLAN grounding in `observer_firewall`. Cross-actor plan/emotion records now pass only when the actor has an active BEL whose `basis.access_records[]` names the holder `STENT` and whose `basis.access_route` is in the observability set (`direct_observation`, `testimony`, `document`, `object_trace`, `location_trace`, `surveillance`, `institutional_channel`). Actor-is-holder STPLAN/STEMO behavior remains on the existing basis-belief path.

Added three focused structural tests for the cross-actor STEMO branch and documented the authoring rule in the turn-cycle Phase 8 choice-generation reference. Split the STEMO/STPLAN no-access message so it names the actual holder-entity route instead of implying direct access to the STEMO/STPLAN id.

## Verification Result

Baseline before source edits:

1. `cd tools/validators && npm test` — PASS, 901 tests.

Post-fix proof:

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/observer-firewall.test.js` — PASS, 19 tests, including the three new cross-actor STEMO cases.
3. `cd tools/validators && npm test` — PASS, 904 tests.
4. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/red-bunny-pg4-envelope.json` from repo root — PASS with `status: "pass"`; `observer_firewall` reported `status: "pass"`. The output included non-failing `compatibility_drift` info verdicts for optional `red-bunny` directories `_source/plans` and `_source/artifacts` being absent.
5. `grep -n 'cross-actor STEMO/STPLAN grounding' .claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` — PASS, one current authoring-rule hit.
6. `grep -n 'BEL.basis.access_records route via the holder entity' tools/validators/src/structural/observer-firewall.ts` — PASS, one current message hit.

## Deviations

- The direct interactive `branching-story-turn-cycle` dry-run was not exercised because this run stayed at the package/CLI validation boundary. The historical `/tmp/red-bunny-pg4-envelope.json` validate-patch-plan envelope is the executable substitute and proves the owned validator invariant.
- The BEL schema `basis.access_records` pattern remains unchanged; this ticket intentionally uses the existing schema-legal holder-`STENT` route rather than widening BEL access records to admit STEMO/STPLAN ids directly.
- Post-ticket review created `tickets/VALENH-037-observer-firewall-access-record-schema-parity.md` to own the broader direct-access-record parity issue: `actorHasAccessRecord` still accepts some direct ids that the BEL schema excludes, and existing structural tests can bypass `record_schema_compliance`.
