# VALENH-039: `causal_dependency_threat_scan`'s `AFFORDANCE_DEPENDENCY` regex includes `STENT` but `story-page.schema.json` `$defs.PageAffordance.grounded_in` pattern excludes it — codify the deliberate field-split by narrowing the validator regex to match the schema, and document the STLOC/STOBJ-only scope in the shared contract

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/causal-dependency-threat-scan.ts` (one-character regex narrowing), `.claude/skills/_shared-templates/story-state-contract.md` (one-paragraph clarification of `visible_affordances.grounded_in` scope).
**Deps**: none.

## Problem

At intake, three surfaces disagreed about whether `PG.state_snapshot.visible_affordances[].grounded_in[]` may include `STENT-<integer>` ids:

1. **The schema forbids STENT.** `tools/validators/src/schemas/story-page.schema.json` `$defs.PageAffordance.grounded_in.items.pattern` is `^(STLOC|STOBJ)-[0-9]+$`. STENT entries fail `record_schema_compliance` at pre-apply time.
2. **The `page_affordance_integrity` validator enforces the schema scope.** `tools/validators/src/structural/page-affordance-integrity.ts:60-61` builds the active-set lookup as `[...activeRecords.STLOC, ...activeRecords.STOBJ]` and emits the verdict message `"references <id>, but it is not active in state_snapshot.active_records.STLOC or STOBJ"` — STENT is not considered. STENT entries (if any reached this validator) would surface as inactive-grounding fails.
3. **The `causal_dependency_threat_scan` validator's regex included STENT before this ticket.** `tools/validators/src/structural/causal-dependency-threat-scan.ts` defined `AFFORDANCE_DEPENDENCY = /^(?:STENT|STLOC|STOBJ)-\d+$/`. The validator's `validateAffordances` and `hasReplacementDependency` call this regex to scan each affordance's `grounded_in[]` for tracked dependencies. The regex anticipated an STENT entry the schema (and the page-affordance-integrity validator) would never permit through.

This was the classic code/schema drift pattern surfaced by VALENH-036 — a constant whose membership set was broader than the schema-enforced runtime, leaving dead defensive code that suggested an unfinished design pass. History: `causal-dependency-threat-scan.ts` landed in **SPEC36** (commit `91988c33`) before SPEC44 froze the `$defs.PageAffordance` shape. SPEC44STOSTAAPP-001 (commit `ef5645da`, May 18 2026) explicitly framed the `$defs.PageAffordance` extraction as *byte-equivalent* — the STLOC/STOBJ scope was carried forward as deliberate. SPEC44STOSTAAPP-006 (commit `0ba0f1ee`) added `page_affordance_integrity` and codified the schema scope at the validator layer. The SPEC44 series did not reach back to narrow the SPEC36 regex; the two surfaces drifted until this ticket aligned them.

The deliberate-design reading is clear in the SPEC44 archive: SPEC44STOSTAAPP-006 cites **FOUNDATIONS §Story Bundles §5b (Schema-Minimalism At Story Scope)** as the principle, and the implementation splits the affordance fields cleanly — `grounded_in` answers "what physical scene element makes this action possible" (STLOC = location, STOBJ = object); `available_to` answers "who can take this action" (STENT = actor). The field-split is the design; STENT is reachable through `available_to`, not through `grounded_in`. Letting STENT also live in `grounded_in` would create double-counting (the actor STENT-1 in `available_to` could also appear in `grounded_in` for an affordance "Jon stays where he is"), making the field semantics ambiguous.

In-session evidence at intake (the worked precedent that surfaced this finding): the PG-3 turn-cycle's affordance ordinal 0 reads:

```yaml
- ordinal: 0
  label: "Ane on the bench, the words just spoken still in the air — stand by them, soften them, ask after her, sit beside her, or wait"
  grounded_in: [STLOC-1]
  available_to: [STENT-1]
  action_families: [communicate, perceive, bond, wait]
```

The label centers on Ane (STENT-2). The schema makes the author ground in STLOC-1 (the park) — the bench location — because Ane cannot appear in `grounded_in`. The pattern works (the bundle's PG-1, PG-2, PG-3 affordances all honor it without expressive contortion), but before this ticket the dead `STENT` entry in `AFFORDANCE_DEPENDENCY` falsely advertised a path the schema disallows. Codifying the deliberate split aligned code with intent.

There remains a real expressivity gap that this ticket explicitly does NOT close — see **Out of Scope** for the framing.

## Assumption Reassessment (2026-05-23)

1. **Codebase check.** Before implementation, `tools/validators/src/structural/causal-dependency-threat-scan.ts` defined `AFFORDANCE_DEPENDENCY = /^(?:STENT|STLOC|STOBJ)-\d+$/`. The regex was consumed at two sites by `validateAffordances` and `hasReplacementDependency` to scan `affordance.grounded_in[]` for tracked dependencies. `tools/validators/src/schemas/story-page.schema.json` `$defs.PageAffordance.grounded_in.items.pattern` is `^(STLOC|STOBJ)-[0-9]+$`. `tools/validators/src/structural/page-affordance-integrity.ts` builds its active-set lookup as `[...activeRecords.STLOC, ...activeRecords.STOBJ]` — STENT is absent. The implemented narrowing target was `AFFORDANCE_DEPENDENCY` itself (one regex constant, both consumers inherit the narrowed pattern through the single-site fix).
2. **Doc check.** Before implementation, `.claude/skills/_shared-templates/story-state-contract.md` (the central cross-skill authority on story-state semantics) said "Every declared affordance ... is grounded in `state_snapshot.active_records` or world canon" in shared hard gate 7 — generic, never explicitly restricting `visible_affordances[].grounded_in[]` to STLOC/STOBJ. Some per-skill references already stated the narrower rule (`.claude/skills/branching-story-bootstrap/references/phase-10-validation.md`, `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md`, and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`), but the central shared contract lacked the normative sentence. The active fix was therefore central-contract truthing, not per-skill duplication.
3. **Shared boundary under audit.** The `visible_affordances.grounded_in` scope contract between (a) `tools/validators/src/schemas/story-page.schema.json` `$defs.PageAffordance` (schema enforcement), (b) `tools/validators/src/structural/page-affordance-integrity.ts` (active-set enforcement), (c) `tools/validators/src/structural/causal-dependency-threat-scan.ts` (dependency-tracking enforcement), and (d) `.claude/skills/_shared-templates/story-state-contract.md` (central authoring discipline). The schema, page-affordance-integrity validator, and several per-skill references agree on STLOC/STOBJ-only; surface (c)'s regex is the lone STENT-admitting code outlier; surface (d) lacks the central normative sentence. This ticket aligns (c) with (a) + (b) and adds an explicit normative line to (d).
4. **FOUNDATIONS principle restated.** `docs/FOUNDATIONS.md` §Story Bundles §5b (Schema-Minimalism At Story Scope) is the load-bearing principle: affordances are page-local projections of durable records (STLOC / STOBJ / STENT), implemented as a field-split — STLOC/STOBJ in `grounded_in` (perceptual/physical scene referents); STENT in `available_to` (actors who can act). The schema and the page-affordance-integrity validator already enforce this split; narrowing `AFFORDANCE_DEPENDENCY` to match removes the dead-code drift that misrepresents the principle as half-implemented.
5. **Adjacent contradictions surfaced during reassessment.** There is a real expressivity gap that this ticket explicitly does NOT close: affordances whose label describes another actor's presence in the scene (e.g., "Ane on the bench") have no mechanical dependency-tracking on that actor's STSTAT.location. If Ane's status changes to a different location, the affordance label is broken but `page_affordance_integrity` cannot detect it (the grounded_in STLOC-1 is still active for the acting actor) and `causal_dependency_threat_scan` has nothing STENT-shaped to track (the schema rejected it). The author must manually rewrite affordance labels when an actor's STSTAT changes. Closing this gap requires the opposite-direction fix — widen the schema to admit STENT in `grounded_in`, extend `page_affordance_integrity`'s active-set lookup, and resolve the authoring-decision question of "when does another actor go in `grounded_in` vs being implicit in state_snapshot.STENT plus their STSTAT.location". That is a substantially larger change with compounding decisions, classified as future-cleanup-if-needed and explicitly out of scope here (see **Out of Scope** item 1). This ticket is the codify-the-deliberate-split path; a future ticket may revisit the expressivity gap if real authoring patterns make the gap load-bearing.
6. **Pre-edit baseline.** `npm test` in `tools/validators` passed before source edits on 2026-05-23 (911 tests passed), so the broad validators package lane was green at intake.

## Architecture Check

1. **Narrowing the validator regex is structurally cleaner than schema widening.** The schema and the page-affordance-integrity validator have already settled on STLOC/STOBJ-only for `grounded_in`. SPEC44STOSTAAPP-006's archived rationale explicitly cites FOUNDATIONS §5b's schema-minimalism as the justification. The `causal_dependency_threat_scan` regex including STENT is the lone outlier; narrowing it codifies the design instead of leaving dead defensive code that misleads future readers. The alternative (widening the schema and extending the page-affordance-integrity validator) closes a real expressivity gap but introduces an authoring-decision question (when does another actor belong in `grounded_in` vs being implicit in state_snapshot.STENT plus STSTAT.location) that the current design intentionally sidesteps.
2. **No backwards-compatibility shims.** The change narrows the regex's accepted character class from `(?:STENT|STLOC|STOBJ)` to `(?:STLOC|STOBJ)`. Existing `grounded_in[]` entries (all of which are STLOC or STOBJ by schema construction) continue to be tracked as dependencies by the validator. No alias, no dual-pattern compat, no migration. The only behavior change is that a hypothetical STENT entry (which the schema would already reject before reaching this validator) is no longer matched by the regex — and the consumer code at lines 234 and 270 simply continues to not match STENT entries, exactly as it does today in the absence of any STENT-grounding-in author practice.
3. **The shared-contract clarification is normative, not retroactive.** The current bundle's PG-1, PG-2, PG-3, PG-4 affordances all use STLOC/STOBJ-only `grounded_in` without contortion — the practice is already correct; the prose addition just makes the contract explicit so future authors don't reach for STENT/STEMO/CLK and discover the restriction only at submit time. The added line names the field-split: `grounded_in` is STLOC/STOBJ only; STENT is reachable through `available_to`; other actors' presence in the scene is implicit through `state_snapshot.STENT` plus their `STSTAT.location`.

## Verification Layers

1. **`AFFORDANCE_DEPENDENCY` narrowed to `^(?:STLOC|STOBJ)-\d+$`** → codebase grep-proof: `grep -n 'AFFORDANCE_DEPENDENCY = ' tools/validators/src/structural/causal-dependency-threat-scan.ts` returns one match whose regex body lacks `STENT`.
2. **Existing affordance-related causal-dependency-threat-scan tests continue to pass** → schema validation via `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts`: all existing fixtures use STLOC-only `grounded_in` (verified by `grep -E "grounded_in.*STENT" tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` returning zero matches), so the narrowing is backward-compatible with the existing test suite.
3. **Shared contract names the STLOC/STOBJ-only `grounded_in` scope** → codebase grep-proof: `grep -nE 'grounded_in.*STLOC.*STOBJ-only|STLOC/STOBJ-only|STLOC or STOBJ only|STLOC-<integer>.*STOBJ-<integer>' .claude/skills/_shared-templates/story-state-contract.md` returns the new §2 paragraph.
4. **Full validator suite remains green** → `cd tools/validators && npm test` exits 0 (no regression).

## Landed Changes

### 1. Narrow `AFFORDANCE_DEPENDENCY` in `causal-dependency-threat-scan.ts`

In `tools/validators/src/structural/causal-dependency-threat-scan.ts`, changed:

```ts
const AFFORDANCE_DEPENDENCY = /^(?:STENT|STLOC|STOBJ)-\d+$/;
```

to:

```ts
const AFFORDANCE_DEPENDENCY = /^(?:STLOC|STOBJ)-\d+$/;
```

No other validator code changed — the two consumer sites (`validateAffordances` and `hasReplacementDependency`) inherit the narrowing through the single-site regex update. Both consumers test `AFFORDANCE_DEPENDENCY.test(dependencyId)` and continue to behave identically for all STLOC/STOBJ entries; the STENT branch was unreachable in practice (the schema would have rejected any STENT entry in `grounded_in` before this validator ran), so the narrowing is dead-code removal at the consumer side.

### 2. Add a normative paragraph to `.claude/skills/_shared-templates/story-state-contract.md`

In `.claude/skills/_shared-templates/story-state-contract.md`, added a short normative paragraph under §2 Schema-Minimalism Doctrine naming the `visible_affordances[].grounded_in[]` STLOC/STOBJ-only scope:

> **`visible_affordances[].grounded_in[]` is STLOC/STOBJ-only.** Page affordance grounding names the physical scene referents that make an action available, so `grounded_in[]` accepts only active `STLOC-<integer>` or `STOBJ-<integer>` ids. Actors are carried by the same affordance's `available_to[]` field as active `STENT-<integer>` ids. Other actors' presence in the scene is represented through active `STENT` records plus their `STSTAT.location`; affordances whose label mentions another actor still ground in the relevant scene location or object, not in that actor's STENT. Interior or temporal state classes such as `STEMO`, `STPLAN`, `CLK`, `STSEC`, and `STQ` belong in choice grounding or page-plan prose, not in page-affordance grounding.

The shared contract is the right home for this clarification because the same restriction applies across `branching-story-bootstrap`, `branching-story-turn-cycle`, and any future story-pipeline skill that authors a PG record — adding it once in the cross-skill authority avoids per-skill prose duplication.

## Files to Touch

- `tools/validators/src/structural/causal-dependency-threat-scan.ts` (modify — narrow `AFFORDANCE_DEPENDENCY` regex)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — add the normative paragraph naming the STLOC/STOBJ-only scope)

## Out of Scope

- **Closing the STENT-presence expressivity gap by widening the schema.** Letting affordances express STENT-presence dependencies (so `causal_dependency_threat_scan` can detect "the other actor left the scene"-shaped clobbering) is a substantially larger change: it requires widening `story-page.schema.json` `$defs.PageAffordance.grounded_in.items.pattern`, extending `page_affordance_integrity`'s active-set lookup to include STENT, and resolving the authoring-decision question of "when does another actor belong in `grounded_in` vs being implicit in state_snapshot". The current pattern works in practice across the red-bunny bundle (PG-1 through PG-4); if a future authoring need surfaces a recurring "another actor left, the affordance is now broken, and the validator didn't catch it" failure mode, that ticket can revisit the gap with concrete evidence in hand. This ticket explicitly codifies the deliberate-split design instead of pre-emptively closing the gap.
- **Widening to admit STEMO/STPLAN/CLK/STSEC/STQ in `grounded_in`.** These are interior or temporal state classes — not perceptual scene referents — and have no architectural fit with the `grounded_in` semantic ("what physical scene element makes this action possible"). They remain reachable through CHC grounding per `story-choice.schema.json` `grounded_in.records` and through page-plan §10b prose.
- **Skill-prose updates beyond the shared contract.** Per-skill phase docs already contain some STLOC/STOBJ-only references and now inherit the central shared-contract clarification. This ticket intentionally did not duplicate the new paragraph into per-skill docs. If a future audit surfaces a per-skill confusion that the shared-contract clarification did not prevent, that ticket can add the per-skill prose then.
- **Regenerating existing affordances.** All current PG-1 through PG-4 affordances in the red-bunny bundle already use STLOC/STOBJ-only `grounded_in` (the schema enforced this from intake); no retroactive edits are needed.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/structural/causal-dependency-threat-scan.test.js` — PASS, all existing affordance-related test cases continue to pass without modification.
2. `cd tools/validators && npm test` — PASS, full validator suite, no regression in any other structural / integration / schema test.
3. `grep -n 'AFFORDANCE_DEPENDENCY = ' tools/validators/src/structural/causal-dependency-threat-scan.ts` returns one match whose regex body is `/^(?:STLOC|STOBJ)-\d+$/` (STENT absent).
4. `grep -nE 'grounded_in.*STLOC.*STOBJ-only|STLOC/STOBJ-only|STLOC or STOBJ only|STLOC-<integer>.*STOBJ-<integer>' .claude/skills/_shared-templates/story-state-contract.md` returns the new §2 paragraph proving the constraint is explicit in the cross-skill authority.

### Invariants

1. The `AFFORDANCE_DEPENDENCY` regex in `causal-dependency-threat-scan.ts` matches the `story-page.schema.json` `$defs.PageAffordance.grounded_in.items.pattern` exactly — both are `(?:STLOC|STOBJ)-<integer>` shapes. Future schema or regex changes must keep these in sync; the shared-contract paragraph documents the canonical scope.
2. The `page_affordance_integrity` validator's active-set lookup (`activeRecords.STLOC` + `activeRecords.STOBJ`), the schema pattern, the `causal_dependency_threat_scan` regex, and the shared-contract prose all agree on STLOC/STOBJ-only. No surface admits STENT/STEMO/CLK/STSEC/STQ/STPLAN/STSTAT in `visible_affordances.grounded_in`.
3. Authors are reachable through `visible_affordances.available_to` (STENT only); the field-split is preserved.

## Test Plan

### New/Modified Tests

1. **None required.** The narrowing is dead-code removal at the consumer side (the STENT branch of `AFFORDANCE_DEPENDENCY` was already unreachable because the schema rejects STENT in `grounded_in` before this validator runs). All existing affordance-related test fixtures in `tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` use STLOC-only `grounded_in` (verified via `grep -E "grounded_in.*STENT" tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` returning zero matches), so no test fixture change is required and no new test case adds observable verification beyond the regex grep-proof in Acceptance Criteria item 3.

### Commands

1. Targeted: `cd tools/validators && npm run build && node --test dist/tests/structural/causal-dependency-threat-scan.test.js` — confirms all existing affordance-related causal-dependency-threat-scan cases remain green after the regex narrowing.
2. Full-pipeline: `cd tools/validators && npm test` — confirms no regression across the structural, integration, schema, and CLI suites.
3. Regex grep-proof: `grep -n 'AFFORDANCE_DEPENDENCY = ' tools/validators/src/structural/causal-dependency-threat-scan.ts` returns exactly one match whose body is `/^(?:STLOC|STOBJ)-\d+$/`.
4. Shared-contract grep-proof: `grep -nE 'grounded_in.*STLOC.*STOBJ-only|STLOC/STOBJ-only|STLOC or STOBJ only|STLOC-<integer>.*STOBJ-<integer>' .claude/skills/_shared-templates/story-state-contract.md` returns the new §2 paragraph confirming the normative paragraph landed.

## Outcome

Completed. `AFFORDANCE_DEPENDENCY` now matches the `story-page.schema.json` `PageAffordance.grounded_in` schema surface by accepting only `STLOC` / `STOBJ` ids. The shared story-state contract now explicitly states that `visible_affordances[].grounded_in[]` is STLOC/STOBJ-only, while `available_to[]` carries STENT actors.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/validators` — PASS; 911 tests passed before source edits.
2. Build: `npm run build` from `tools/validators` — PASS.
3. Targeted proof: `node --test dist/tests/structural/causal-dependency-threat-scan.test.js` from `tools/validators` — PASS; 9 tests passed.
4. Full validator package: `npm test` from `tools/validators` — PASS; 911 tests passed after the change.
5. Regex grep-proof: `grep -n 'AFFORDANCE_DEPENDENCY = ' tools/validators/src/structural/causal-dependency-threat-scan.ts` — PASS; one match, `const AFFORDANCE_DEPENDENCY = /^(?:STLOC|STOBJ)-\d+$/;`.
6. Shared-contract grep-proof: `grep -nE 'grounded_in.*STLOC.*STOBJ-only|STLOC/STOBJ-only|STLOC or STOBJ only|STLOC-<integer>.*STOBJ-<integer>' .claude/skills/_shared-templates/story-state-contract.md` — PASS; one match in the new §2 paragraph.
7. Existing fixture compatibility: `grep -E 'grounded_in.*STENT' tools/validators/tests/structural/causal-dependency-threat-scan.test.ts` — expected no-match result; current focused fixtures contain no STENT grounded_in examples.

Generated/ignored artifacts refreshed: `tools/validators/dist/` was regenerated by `npm run build` / `npm test`. Pre-existing ignored `tools/validators/node_modules/` was left in place.

## Deviations

1. Reassessment corrected the drafted doc claim. The central shared contract was silent, but several per-skill references already stated the STLOC/STOBJ-only rule. The implemented prose edit stayed on the central shared contract rather than duplicating text into per-skill references.
2. No test file was modified. Existing compiled causal-dependency tests plus grep-proof cover the narrowed regex because STENT in `visible_affordances[].grounded_in[]` is already rejected by the schema before this validator can treat it as a runtime dependency.
