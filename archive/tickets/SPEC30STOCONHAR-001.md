# SPEC30STOCONHAR-001: PG-1 `story_start` Input Legality Carve-Out

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `_shared-templates/story-state-contract.md` §4.2 + §Gates table, `tools/validators/src/schemas/story-page.schema.json`, `tools/validators/src/structural/state-snapshot-integrity.ts`, `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 6/9, `specs/SPEC-30-story-contract-hardening-ii.md` D1 note
**Deps**: `specs/SPEC-30-story-contract-hardening-ii.md` (D1 authority supplied by user)

## Problem

At intake, `_shared-templates/story-state-contract.md:100-101` enforced "exactly one of `choice_id` / `manual_action_text` is non-null"; Gate 1 required "exactly one source action (chosen CHC or write-in). Parent page exists and belongs to the named story bundle." For PG-1 the resolved event is `story_start`: there is no parent page, no chosen `CHC`, and no write-in. This ticket landed the explicit `story_start` carve-out instead of requiring bootstrap to silently violate the contract or diluting the gate everywhere.

## Assumption Reassessment (2026-05-15)

1. Verified `_shared-templates/story-state-contract.md:100-101` carries the exact `# exactly one of choice_id / manual_action_text is non-null` comment SPEC-30 D1 targets, and `:693-694` carries Gate 1 + Gate 2 text exactly as quoted in the spec.
2. Verified `tools/validators/src/schemas/story-page.schema.json:32-41` defines `input` as an object with `choice_id` (pattern `^CHC-[0-9]+$` allowing null), `manual_action_text` (string with `minLength: 1` or null), and `resolved_event_id` (required `SE-[0-9]+`). JSON-schema-level enforcement of "exactly one non-null" is absent; that legality lives elsewhere (or nowhere, per this ticket's premise). Preferred fix per spec: keep schema permissive at the JSON level and enforce in `state-snapshot-integrity.ts` where `resolved_event_id` is already in scope.
3. Cross-skill / cross-artifact boundary under audit: the input-legality contract spans (a) the shared contract prose §4.2 + §Gate 1, (b) the JSON schema for `PG`, (c) the `state_snapshot_integrity` validator (which already resolves snapshot-internal references at `tools/validators/src/structural/state-snapshot-integrity.ts:38-96` over `create_pg_record` patches), and (d) the bootstrap skill's Phase 6 prose that authors PG-1.
4. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons) — at intake, bootstrap produced a PG-1 whose `input.choice_id` and `input.manual_action_text` were both null, which silently violated the old §4.2 line-100-101 invariant unless the contract carve-out landed. The Rule-6 surface is the contract itself: a legitimate-by-design bundle genesis must not require silent contract violation to land.
5. HARD-GATE / Mystery Reserve firewall verification: this ticket extends `state_snapshot_integrity` (a fail-severity validator) with a new check code (`state_snapshot_integrity.pg_input_legality_violation`). It does NOT touch Mystery Reserve firewall logic or weaken any canon-safety check. No existing M-record `status: forbidden` resolution path is added or removed.
6. Path correction (per §Codebase truth): the existing test file lives at `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (under `tests/`), not at the spec's `src/.../state-snapshot-integrity.test.ts` path. Tickets use the actual layout.
7. Package baseline: root-launched `npm --prefix tools/validators run test` was red before source edits because compiled CLI tests resolved `dist/src/cli/world-validate.js` from the repo root. Post-review correction: the truthful broad package lane is package-root `npm run test` from `tools/validators`, which passes.
8. Bootstrap dry-run correction: no executable runner exists for `.claude/skills/branching-story-bootstrap/SKILL.md` in this repo session. The implemented proof substitutes manual contract review plus grep over the bootstrap PG-1/input-legality prose; package proof covers the validator/schema behavior.

## Architecture Check

1. Conditional enforcement at the validator layer (where `input.resolved_event_id → SE.event_kind` is already in scope) is structurally cleaner than schema-level `oneOf` over `input` because the legality depends on a sibling record's `event_kind`, not on the PG record alone. `oneOf` at the JSON-schema layer would either over-permit (drop the constraint entirely) or duplicate the SE lookup. Validator-layer enforcement keeps the schema declarative and the conditional rule in the place that already knows about SE resolution.
2. No backwards-compatibility shims: the contract change replaces the comment outright; the schema stays permissive (no field-removal); the validator adds a new check code (`state_snapshot_integrity.pg_input_legality_violation`) without retiring existing checks.

## Verification Layers

1. Contract↔gate consistency → codebase grep-proof: after the edits, `grep -n "exactly one of choice_id" .claude/skills/_shared-templates/story-state-contract.md` returns only the new conditional form; `grep -n "story_start" .claude/skills/_shared-templates/story-state-contract.md` returns hits in both §4.2 and §Gate 1.
2. Schema admission → schema validation: a draft PG-1 record with `input: {choice_id: null, manual_action_text: null, resolved_event_id: SE-1}` passes `record_schema_compliance` against `story-page.schema.json`.
3. Validator carve-out → validator unit test: PG-1 with both input fields null + resolving event kind `story_start` PASSES `state_snapshot_integrity`; PG-N (N>1) with both null + non-`story_start` event emits `state_snapshot_integrity.pg_input_legality_violation`; PG-1 with non-null `choice_id` + `story_start` emits `state_snapshot_integrity.pg_input_legality_violation`.
4. Bootstrap authoring alignment → manual contract review + grep: `branching-story-bootstrap` PG-1 prose now states that both-null input fields are lawful only for `SE-1.event_kind: story_start`, and its Phase 9 input-legality PASS rationale cites the shared contract §4.2 PG-1 carve-out.

## Landed Changes

### 1. Contract §4.2 input legality

`.claude/skills/_shared-templates/story-state-contract.md` §4.2 now replaces the unconditional inline comment with the conditional form:

```yaml
# Input legality:
# - If resolved_event.event_kind == story_start (i.e., parent_page_id == null, only PG-1):
#     choice_id == null
#     manual_action_text == null
# - Otherwise:
#     exactly one of choice_id / manual_action_text is non-null
```

### 2. Contract §Gates table — Gate 1

Gate 1 now reads: *"Exactly one source action (chosen CHC or write-in) UNLESS the resolved event is `story_start`. Parent page exists and belongs to the named story bundle UNLESS the resolved event is `story_start` (PG-1). The chosen CHC, if any, was emitted by the parent page and not retired."*

### 3. JSON schema — permissive + cross-validator note

`tools/validators/src/schemas/story-page.schema.json` leaves `input.choice_id` / `input.manual_action_text` unchanged (both nullable) and adds a description documenting that exactly-one legality is enforced by `state_snapshot_integrity` conditional on the resolved event kind, with a carve-out for `event_kind: story_start`.

### 4. Validator carve-out

`tools/validators/src/structural/state-snapshot-integrity.ts` now:
- Reads `parsed.input.choice_id`, `parsed.input.manual_action_text`, and resolves `parsed.input.resolved_event_id` against the records collection in scope.
- If the resolved SE record's `event_kind` is `story_start`: both fields MUST be null. Otherwise: exactly one MUST be non-null.
- Emits `state_snapshot_integrity.pg_input_legality_violation` with `severity: fail` and a message/detail naming the offending PG id, the resolved SE id, the SE's `event_kind`, and the offending input field state. Suggested fix string names shared contract §4.2.

### 5. Bootstrap Phase 6 prose

`.claude/skills/branching-story-bootstrap/SKILL.md` Phase 6 now cites the §4.2 `story_start` carve-out beside the PG-1 input fields, and Phase 9's input-legality PASS rationale names the both-null PG-1 carve-out explicitly.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.2 input legality comment + §Gates table Gate 1 text)
- `tools/validators/src/schemas/story-page.schema.json` (modify — `description` on `input` documenting cross-validator dependency)
- `tools/validators/src/structural/state-snapshot-integrity.ts` (modify — add `state_snapshot_integrity.pg_input_legality_violation` check)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (modify — add three new test cases)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 6 prose adds carve-out citation)
- `specs/SPEC-30-story-contract-hardening-ii.md` (modify — D1 implementation note + corrected test path/severity wording)

## Out of Scope

- Schema-level `oneOf` enforcement of input legality (deliberately rejected per Architecture Check item 1).
- Any change to `event_kind` enum or SE schema.
- Any change to gate numbering or other gates.
- Migration of any production PG-1 record (none exist).

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds (TypeScript compiles).
2. `node --test tools/validators/dist/tests/structural/state-snapshot-integrity.test.js tools/validators/dist/tests/structural/record-schema-compliance-story-page.test.js` passes, including the three new `state_snapshot_integrity` cases and the existing PG schema-admission tests.
3. `grep -n "story_start" .claude/skills/_shared-templates/story-state-contract.md` returns hits in §4.2 (input legality comment) AND §Gates table (Gate 1).
4. `grep -c "exactly one of choice_id / manual_action_text is non-null" .claude/skills/_shared-templates/story-state-contract.md` returns `1` and only inside the new conditional form (not as the old unconditional comment).
5. Package-root `npm run test` from `tools/validators` passes and is the broad validator package lane; root-launched `npm --prefix tools/validators run test` is a known wrong-cwd command shape for CLI tests that derive `dist/` from `process.cwd()`.

### Invariants

1. PG-1 with `input: {choice_id: null, manual_action_text: null, resolved_event_id: SE-1}` and SE-1 of `event_kind: story_start` is a structurally lawful record after this ticket.
2. Bootstrap is not required to silently violate the §4.2 input legality contract to produce a lawful PG-1.
3. Non-`story_start` events still require exactly one of `choice_id` / `manual_action_text` to be non-null (regression invariant on the existing rule).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — three new test cases: (a) PG-1 + null inputs + `story_start` SE -> PASS; (b) PG-1 + non-null `choice_id` + `story_start` SE -> `state_snapshot_integrity.pg_input_legality_violation`; (c) PG-N + null inputs + non-`story_start` SE -> `state_snapshot_integrity.pg_input_legality_violation`. One existing minimal PG fixture was updated to include valid input/event context now required by this validator.

### Commands

1. `npm --prefix tools/validators run build`
2. `grep -nE "story_start|exactly one of choice_id" .claude/skills/_shared-templates/story-state-contract.md`
3. `grep -c "exactly one of choice_id / manual_action_text is non-null" .claude/skills/_shared-templates/story-state-contract.md`
4. `node --test tools/validators/dist/tests/structural/state-snapshot-integrity.test.js tools/validators/dist/tests/structural/record-schema-compliance-story-page.test.js`
5. `npm run test` from `tools/validators` (broad validator package suite)

## Outcome

Implemented the SPEC-30 D1 carve-out. PG-1 may now lawfully use both-null `choice_id` / `manual_action_text` when its resolved SE has `event_kind: story_start`; all other resolved event kinds still require exactly one source action. The shared contract, Gate 1 text, PG schema description, validator logic, focused tests, bootstrap PG-1 prose, and SPEC-30 D1 note now agree on that boundary.

## Verification Result

1. `npm --prefix tools/validators run build` — PASS.
2. `node --test tools/validators/dist/tests/structural/state-snapshot-integrity.test.js tools/validators/dist/tests/structural/record-schema-compliance-story-page.test.js` — PASS, 24/24 tests.
3. `grep -nE "story_start|exactly one of choice_id" .claude/skills/_shared-templates/story-state-contract.md` — PASS; hits include the §4.2 conditional input comment and Gate 1 `story_start` carve-out.
4. `grep -c "exactly one of choice_id / manual_action_text is non-null" .claude/skills/_shared-templates/story-state-contract.md` — PASS; returned `1`.
5. `npm run test` from `tools/validators` — PASS, 216/216 tests.
6. `node --test tools/validators/dist/tests/cli/world-validate.story-bundle.test.js tools/validators/dist/tests/cli/world-validate.test.js` from repo root — diagnostic only; FAILS because compiled CLI tests resolve `/home/joeloverbeck/projects/worldloom/dist/src/cli/world-validate.js`, proving the earlier root-launched `npm --prefix` red lane was a cwd/command-shape issue rather than a D1 implementation failure.

## Deviations

- The drafted broad `npm --prefix tools/validators run test` command was corrected to package-root `npm run test`. The root-launched form leaves `process.cwd()` at the repo root, which makes compiled CLI tests look for `dist/src/cli/world-validate.js` under the wrong directory.
- The drafted bootstrap dry-run was replaced with manual contract review plus grep because this repo session exposes no executable runner for `.claude/skills/branching-story-bootstrap/SKILL.md`.
- SPEC-30's D1 test path and `severity: error` wording were corrected in the spec note to the live test path and validator severity vocabulary.
