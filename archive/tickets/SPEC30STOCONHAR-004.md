# SPEC30STOCONHAR-004: `promotion_claims.source_record` Enum Expansion (+SREL; +STSTAT Additive)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — contract §4.3, `story-event.schema.json`, `recursive-reference-closure.ts` + tests, `story-fact-promotion-to-canon/SKILL.md`, `branching-story-turn-cycle/SKILL.md`, `story-promotion-closeout/SKILL.md`, SPEC-30 D4 note
**Deps**: None

## Problem

At intake, `_shared-templates/story-state-contract.md:220` enumerated `source_record: SF | BEL | DA | STENT`. Promotion source kinds in `.claude/skills/story-fact-promotion-to-canon/SKILL.md` included `relationship_or_institutional_outcome` (SREL absent from enum — a relationship promotion had no lawful source record) and `character_outcome` (where status changes happen on STSTAT supersession chains, but only STENT was citable). The triage's framing — "character outcomes often live in STSTAT" — misread the deliberate identity/status separation at `_shared-templates/story-state-contract.md:582-596`; the correct framing is *STSTAT-additive supporting evidence*, not STENT replacement.

## Assumption Reassessment (2026-05-15)

1. Verified `_shared-templates/story-state-contract.md:220` carries `source_record: SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer>` exactly as the spec asserts; STSTAT and SREL absent.
2. Verified `tools/validators/src/schemas/story-event.schema.json:115` carries `"source_record": { "type": "string", "pattern": "^(SF|BEL|DA|STENT)-[0-9]+$" }`; STSTAT and SREL absent.
3. Verified `.claude/skills/story-fact-promotion-to-canon/SKILL.md` source-kind table already maps `relationship_or_institutional_outcome → SREL-<integer> (plus supersession chain + supporting events)` on the promotion authoring side, but the schema enum rejects that SREL emission today — the promotion skill produces records the schema then refuses.
4. Reassessment correction: `tools/validators/src/structural/recursive-reference-closure.ts` walks closure roots from PG records into story-local refs, but `STORY_LOCAL_ID` includes SREL and omits STSTAT. This ticket therefore owns adding STSTAT to the closure regex, adding the explicit `promotion_claims` traceability comment, and locking both STSTAT and SREL through tests.
5. Verified the STSTAT / STENT identity-vs-status separation at `_shared-templates/story-state-contract.md:582-596`: STSTAT is a derived life/agency/location projection of a STENT; STENT carries identity. Folding STSTAT into the `character_outcome` source-of-truth slot would conflate the two; STSTAT-additive (STENT required, STSTAT supporting) preserves the separation.
6. Cross-skill / cross-artifact boundary under audit: the promotion contract spans (a) the shared contract §4.3 `promotion_claims` schema, (b) the JSON schema `story-event.schema.json` pattern, (c) the validator closure check, (d) the promotion authoring skill's per-kind requirements, (e) the turn-cycle SE drafting template, (f) the closeout skill's supersession set, and (g) the explicit SPEC-30 D4 status note.
7. FOUNDATIONS principle under audit: §Story Bundles — Phase 4.5 promotion routing — SREL absence in the source enum is a routing gap, not a rule weakening; this ticket closes the gap without introducing new authority levels. The accepted/canon-linked authority discipline is unchanged.
8. HARD-GATE / Mystery Reserve firewall verification: this ticket modifies `record_schema_compliance` (via the JSON schema swap) and `recursive_reference_closure`. It does NOT touch Mystery Reserve firewall logic or weaken any canon-safety check.
9. Schema extension classification: this IS a schema extension (story-event schema, `source_record` pattern). The extension is additive (new enum members; existing SF/BEL/DA/STENT still accepted), not breaking. Existing story-event records validating against the old enum continue to validate. Consumers: `record_schema_compliance` (validator) + `recursive-reference-closure` (validator) + downstream promotion + closeout skills; all named in scope.
10. Baseline: from `tools/validators`, `npm run test` passed before source edits (217 tests). Existing ignored package artifacts `tools/validators/dist/` and `tools/validators/node_modules/` were present before verification; `dist/` may be refreshed by this ticket's build/test lane.
11. Producer-surface inventory found one current operational stale enum outside the drafted file list: `.claude/skills/branching-story-turn-cycle/SKILL.md` embeds the old `promotion_claims.source_record` line in its SE draft template. This is same-seam required fallout because turn-cycle authors the SE records later consumed by promotion.

## Architecture Check

1. Enum expansion + per-kind requirement table is structurally cleaner than overloading existing kinds: `character_outcome` keeps STENT-required (identity), STSTAT becomes additive supporting evidence (status); `relationship_or_institutional_outcome` gets its rightful SREL source. The alternative — replacing STENT with STSTAT for `character_outcome` — would conflate the identity/status separation at `:582-596` and force downstream consumers to know which kind of STSTAT actually carries the outcome.
2. No backwards-compatibility shim: SF/BEL/DA/STENT remain in the enum exactly as before; STSTAT and SREL are added. No alias path.

## Verification Layers

1. Contract enum widening → codebase grep-proof: `grep -n "source_record:" .claude/skills/_shared-templates/story-state-contract.md` shows the widened enum line.
2. Schema admission → schema validation: `SE.promotion_claims[].source_record: STSTAT-3` validates cleanly against `story-event.schema.json`; `SREL-2` validates cleanly.
3. Closure walk → validator unit test: `recursive_reference_closure` resolves `STSTAT-3` / `SREL-2` referenced via `promotion_claims` against the bundle's STSTAT / SREL records and emits no `missing_record` finding when they exist; emits `missing_record` when absent.
4. Promotion and turn-cycle skill prose → manual review + grep-proof: `story-fact-promotion-to-canon` documents STENT-required/STSTAT-supporting `character_outcome` and SREL-required/BEL/SF-supporting `relationship_or_institutional_outcome`; `branching-story-turn-cycle` drafts SE `promotion_claims.source_record` with the widened enum. No executable skill dry-run runner is available in this repo.
5. Closeout skill prose → manual review: closeout supersedes STSTAT records when the promotion's source_record set includes STSTAT (e.g., character outcome where the STSTAT chain becomes canon-linked).

## Landed Changes

### 1. Contract §4.3 promotion_claims enum

In `.claude/skills/_shared-templates/story-state-contract.md`, expanded the `source_record` enum to `SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer> | STSTAT-<integer> | SREL-<integer>`.

### 2. Contract §4.3 per-source-kind requirement table

Immediately after the enum, added a table listing the per-kind requirements:

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

In `tools/validators/src/schemas/story-event.schema.json`, replaced the pattern `^(SF|BEL|DA|STENT)-[0-9]+$` with `^(SF|BEL|DA|STENT|STSTAT|SREL)-[0-9]+$`.

### 4. Validator closure check — comment + traceability

In `tools/validators/src/structural/recursive-reference-closure.ts`, added STSTAT to `STORY_LOCAL_ID` and added an explicit comment naming STSTAT and SREL as lawful `promotion_claims` source classes per the contract change. Added tests to lock the behavior.

### 5. Promotion skill per-kind requirements

In `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, updated the source-kind record-class mapping table to state STENT-required/STSTAT-supporting `character_outcome`, SREL-required/BEL/SF-supporting `relationship_or_institutional_outcome`, and the `mystery_resolution` split between M audit input and SF/BEL SE promotion claims.

### 6. Turn-cycle SE drafting template

In `.claude/skills/branching-story-turn-cycle/SKILL.md`, widened the Phase 6 SE draft template's `promotion_claims[].source_record` line to include STSTAT and SREL so the producer skill matches the shared contract.

### 7. Closeout skill STSTAT supersession note

In `.claude/skills/story-promotion-closeout/SKILL.md`, added a supersession row for STSTAT records when the promotion's source-record set includes STSTAT — e.g., a character outcome where the STSTAT chain becomes canon-linked.

### 8. SPEC-30 implementation note

Added a dated D4 implementation note to `archive/specs/SPEC-30-story-contract-hardening-ii.md`, leaving the original D4 prose as historical specification context.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.3 enum + per-kind requirement table)
- `tools/validators/src/schemas/story-event.schema.json` (modify — `source_record` pattern)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — comment naming STSTAT/SREL as lawful classes)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — new test cases for STSTAT/SREL `source_record` resolution)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — per-kind table)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — SE drafting template enum)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — STSTAT supersession note)
- `archive/specs/SPEC-30-story-contract-hardening-ii.md` (modify — D4 implementation note)

## Out of Scope

- Replacing STENT with STSTAT for `character_outcome` (deliberately rejected per spec key design decisions; STSTAT is additive supporting evidence).
- Any change to the six `source_kind` enum values.
- Any change to `canon-addition`'s adjudication routing.
- Schema admission for STENT/STSTAT/SREL as `derived_from` targets in other record classes (out of scope; this ticket scopes only `promotion_claims[].source_record`).

## Acceptance Criteria

### Tests Passed

1. From `tools/validators`, `npm run test` passed (220 tests), including new STSTAT/SREL `source_record` cases in `recursive-reference-closure` and `record-schema-compliance` for story-event records.
2. `grep -nE "STSTAT|SREL" tools/validators/src/schemas/story-event.schema.json` returned the widened pattern hit at `source_record`.
3. `grep -n "source_record:" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md` showed the widened enum line in both current producer/contract surfaces.

### Invariants

1. Every lawful promotion source kind has a lawful source-record class with closure-walkable id resolution.
2. The STENT/STSTAT identity/status separation at contract `:582-596` is preserved — STSTAT is supporting evidence for `character_outcome`, never the sole source.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — new test cases: (a) SE with `promotion_claims[].source_record: STSTAT-3` resolves when STSTAT-3 exists; (b) SE with `source_record: SREL-2` resolves when SREL-2 exists; (c) SE with `source_record: STSTAT-9` emits `missing_record` when STSTAT-9 is absent (regression on closure walk).
2. `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` — new cases asserting `source_record: STSTAT-N` and `SREL-N` validate cleanly under the widened schema.

### Commands

1. From `tools/validators`: `npm run test`
2. `grep -nE "STSTAT|SREL" tools/validators/src/schemas/story-event.schema.json`
3. The full validator `test` command is the correct boundary because the schema change cascades through `record_schema_compliance` and `recursive_reference_closure` in the same run.

## Outcome

Completed on 2026-05-15. `promotion_claims[].source_record` now lawfully admits STSTAT and SREL in the shared contract, JSON schema, closure validator, and current story-pipeline producer/consumer prose. STSTAT remains supporting evidence for `character_outcome`; STENT remains the required identity source. SREL is now the required source for `relationship_or_institutional_outcome`, with BEL/SF as supporting evidence.

## Verification Result

1. Pre-edit baseline: from `tools/validators`, `npm run test` passed (217 tests).
2. Final package proof: from `tools/validators`, `npm run test` passed (220 tests).
3. Schema grep: `grep -nE "STSTAT|SREL" tools/validators/src/schemas/story-event.schema.json` returned the widened `promotion_claims[].source_record` pattern.
4. Contract/producer grep: `grep -n "source_record:" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/SKILL.md` returned widened enum lines in both files.
5. Stale-anchor sweep: `rg -n '^\s*- source_record: SF-<integer> \| BEL-<integer> \| DA-<integer> \| STENT-<integer>$' .claude/skills docs specs tickets tools/validators/src tools/validators/tests` returned no hits (expected exit 1), proving no current old-only enum line remains.

## Deviations

1. Reassessment corrected the drafted closure claim: `STORY_LOCAL_ID` did not include STSTAT, so this ticket made a real closure regex change instead of a comment-only validator edit.
2. Same-seam producer drift was absorbed: `.claude/skills/branching-story-turn-cycle/SKILL.md` contained the old SE draft enum and was updated.
3. The drafted promotion-skill dry-run was replaced by manual review plus grep/package proof because this repo has no executable skill dry-run runner. Package tests and explicit producer/consumer grep cover the mechanized and prose contract surfaces.
4. `tools/validators/dist/` and `tools/validators/node_modules/` were pre-existing ignored package artifacts; `dist/` was refreshed by `npm run test`.
