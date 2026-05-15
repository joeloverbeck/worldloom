# SPEC30STOCONHAR-004: `promotion_claims.source_record` Enum Expansion (+SREL; +STSTAT Additive)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — contract §4.3, `story-event.schema.json`, `recursive-reference-closure.ts` + test, `story-fact-promotion-to-canon/SKILL.md`, `story-promotion-closeout/SKILL.md`
**Deps**: None

## Problem

`_shared-templates/story-state-contract.md:220` enumerates `source_record: SF | BEL | DA | STENT`. Promotion source kinds in `.claude/skills/story-fact-promotion-to-canon/SKILL.md` include `relationship_or_institutional_outcome` (SREL absent from enum — a relationship promotion has no lawful source record) and `character_outcome` (where status changes happen on STSTAT supersession chains, but only STENT is currently citable). The triage's framing — "character outcomes often live in STSTAT" — misreads the deliberate identity/status separation at `_shared-templates/story-state-contract.md:582-596`; the correct framing is *STSTAT-additive supporting evidence*, not STENT replacement.

## Assumption Reassessment (2026-05-15)

1. Verified `_shared-templates/story-state-contract.md:220` carries `source_record: SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer>` exactly as the spec asserts; STSTAT and SREL absent.
2. Verified `tools/validators/src/schemas/story-event.schema.json:115` carries `"source_record": { "type": "string", "pattern": "^(SF|BEL|DA|STENT)-[0-9]+$" }`; STSTAT and SREL absent.
3. Verified `.claude/skills/story-fact-promotion-to-canon/SKILL.md` source-kind table already maps `relationship_or_institutional_outcome → SREL-<integer> (plus supersession chain + supporting events)` on the promotion authoring side, but the schema enum rejects that SREL emission today — the promotion skill produces records the schema then refuses.
4. Verified `tools/validators/src/structural/recursive-reference-closure.ts` walks closure roots from PG records into story-local refs (`storyLocalReferences` traversal at `:142-155`, `STORY_LOCAL_ID` regex at `:11` already includes STSTAT and SREL). `promotion_claims[].source_record` ids referenced via SE records are already closure-walked through this traversal; the change is the schema admission, not the walk itself. Add an explicit comment naming STSTAT and SREL as lawful `promotion_claims` source classes for traceability.
5. Verified the STSTAT / STENT identity-vs-status separation at `_shared-templates/story-state-contract.md:582-596`: STSTAT is a derived life/agency/location projection of a STENT; STENT carries identity. Folding STSTAT into the `character_outcome` source-of-truth slot would conflate the two; STSTAT-additive (STENT required, STSTAT supporting) preserves the separation.
6. Cross-skill / cross-artifact boundary under audit: the promotion contract spans (a) the shared contract §4.3 `promotion_claims` schema, (b) the JSON schema `story-event.schema.json` pattern, (c) the validator closure check (already correct; comment-only update), (d) the promotion authoring skill's per-kind requirements, (e) the closeout skill's supersession set.
7. FOUNDATIONS principle under audit: §Story Bundles — Phase 4.5 promotion routing — SREL absence in the source enum is a routing gap, not a rule weakening; this ticket closes the gap without introducing new authority levels. The accepted/canon-linked authority discipline is unchanged.
8. HARD-GATE / Mystery Reserve firewall verification: this ticket modifies `record_schema_compliance` (via the JSON schema swap) and `recursive_reference_closure`. It does NOT touch Mystery Reserve firewall logic or weaken any canon-safety check.
9. Schema extension classification: this IS a schema extension (story-event schema, `source_record` pattern). The extension is additive (new enum members; existing SF/BEL/DA/STENT still accepted), not breaking. Existing story-event records validating against the old enum continue to validate. Consumers: `record_schema_compliance` (validator) + `recursive-reference-closure` (validator) + downstream promotion + closeout skills; all named in scope.

## Architecture Check

1. Enum expansion + per-kind requirement table is structurally cleaner than overloading existing kinds: `character_outcome` keeps STENT-required (identity), STSTAT becomes additive supporting evidence (status); `relationship_or_institutional_outcome` gets its rightful SREL source. The alternative — replacing STENT with STSTAT for `character_outcome` — would conflate the identity/status separation at `:582-596` and force downstream consumers to know which kind of STSTAT actually carries the outcome.
2. No backwards-compatibility shim: SF/BEL/DA/STENT remain in the enum exactly as before; STSTAT and SREL are added. No alias path.

## Verification Layers

1. Contract enum widening → codebase grep-proof: `grep -n "source_record:" .claude/skills/_shared-templates/story-state-contract.md` shows the widened enum line.
2. Schema admission → schema validation: `SE.promotion_claims[].source_record: STSTAT-3` validates cleanly against `story-event.schema.json`; `SREL-2` validates cleanly.
3. Closure walk → validator unit test: `recursive_reference_closure` resolves `STSTAT-3` / `SREL-2` referenced via `promotion_claims` against the bundle's STSTAT / SREL records and emits no `missing_record` finding when they exist; emits `missing_record` when absent.
4. Promotion skill dry-run → skill dry-run: `story-fact-promotion-to-canon` with `source_kind: character_outcome` + STENT-1 + STSTAT-2/STSTAT-3 supersession chain produces a valid proposal package; with `source_kind: relationship_or_institutional_outcome` + SREL-4 produces a valid proposal package; without SREL emits the per-kind validation error.
5. Closeout skill prose → manual review: closeout supersedes STSTAT records when the promotion's source_record set includes STSTAT (e.g., character outcome where the STSTAT chain becomes canon-linked).

## What to Change

### 1. Contract §4.3 promotion_claims enum

In `.claude/skills/_shared-templates/story-state-contract.md` around line 220, expand the `source_record` enum to `SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer> | STSTAT-<integer> | SREL-<integer>`.

### 2. Contract §4.3 per-source-kind requirement table

Immediately after the enum, add a table listing the per-kind requirements:

```
| source_kind | Required | Permitted supporting |
|---|---|---|
| `story_fact` | SF | — |
| `mystery_resolution` | SF OR BEL | — |
| `character_outcome` | STENT | STSTAT (as supersession-chain evidence; STENT alone is sufficient) |
| `artifact_canonization` | DA | — |
| `relationship_or_institutional_outcome` | SREL | BEL, SF |
| `other_branch_claim` | any of enum | — |
```

### 3. JSON schema enum

In `tools/validators/src/schemas/story-event.schema.json:115`, replace the pattern `^(SF|BEL|DA|STENT)-[0-9]+$` with `^(SF|BEL|DA|STENT|STSTAT|SREL)-[0-9]+$`.

### 4. Validator closure check — comment + traceability

In `tools/validators/src/structural/recursive-reference-closure.ts`, add an explicit comment naming STSTAT and SREL as lawful `promotion_claims` source classes per the contract change. The closure walk already covers these classes via `STORY_LOCAL_ID` (verified — both classes match the existing regex); no logic change is required. Add a test case to lock the behavior.

### 5. Promotion skill per-kind requirements

In `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (the source-kind record-class mapping table area, currently around lines 114-116), update the table rows to match the contract per-kind requirements above. For `character_outcome`, document that the supersession chain MAY include STSTAT references showing the outcome's accumulation. For `relationship_or_institutional_outcome`, ensure SREL-required + BEL/SF allowed supporting is stated explicitly (the table already names SREL; lock the wording).

### 6. Closeout skill STSTAT supersession note

In `.claude/skills/story-promotion-closeout/SKILL.md` (the supersession table area, currently around lines 119-123), add a row or note that closeout supersedes STSTAT records when the promotion's source_record set includes STSTAT — e.g., a character outcome where the STSTAT chain becomes canon-linked. Pattern matches the existing SF/BEL/STENT/SREL/DA supersession rows.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.3 enum + per-kind requirement table)
- `tools/validators/src/schemas/story-event.schema.json` (modify — `source_record` pattern)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — comment naming STSTAT/SREL as lawful classes)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — new test cases for STSTAT/SREL `source_record` resolution)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — per-kind table)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — STSTAT supersession note)

## Out of Scope

- Replacing STENT with STSTAT for `character_outcome` (deliberately rejected per spec key design decisions; STSTAT is additive supporting evidence).
- Any change to the six `source_kind` enum values.
- Any change to `canon-addition`'s adjudication routing.
- Schema admission for STENT/STSTAT/SREL as `derived_from` targets in other record classes (out of scope; this ticket scopes only `promotion_claims[].source_record`).

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds.
2. `npm --prefix tools/validators run test` — all validator tests pass including new STSTAT/SREL `source_record` cases in `recursive-reference-closure` and `record-schema-compliance` for story-event records.
3. `grep -nE "STSTAT|SREL" tools/validators/src/schemas/story-event.schema.json` returns the widened pattern hit.
4. `grep -n "source_record:" .claude/skills/_shared-templates/story-state-contract.md` shows the widened enum line.

### Invariants

1. Every lawful promotion source kind has a lawful source-record class with closure-walkable id resolution.
2. The STENT/STSTAT identity/status separation at contract `:582-596` is preserved — STSTAT is supporting evidence for `character_outcome`, never the sole source.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — new test cases: (a) SE with `promotion_claims[].source_record: STSTAT-3` resolves when STSTAT-3 exists; (b) SE with `source_record: SREL-2` resolves when SREL-2 exists; (c) SE with `source_record: STSTAT-9` emits `missing_record` when STSTAT-9 is absent (regression on closure walk).
2. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — new cases asserting `source_record: STSTAT-N` and `SREL-N` validate cleanly under the widened schema.

### Commands

1. `npm --prefix tools/validators run build && npm --prefix tools/validators run test`
2. `grep -nE "STSTAT-|SREL-" tools/validators/src/schemas/story-event.schema.json`
3. The full validator `test` command is the correct boundary because the schema change cascades through `record_schema_compliance` and `recursive_reference_closure` in the same run.
