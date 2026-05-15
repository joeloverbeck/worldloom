# SPEC30STOCONHAR-009: `SREL.direction` Structured Form (Hard Cutover, Trimmed)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — contract §4.5.7, `story-relationship.schema.json`, `recursive-reference-closure.ts` + tests, bootstrap + turn-cycle skill prose, and SPEC-30 implementation note (world-index parse layer + MCP context-packet rendering trimmed to no-op per Step 2 disposition)
**Deps**: None

## Problem

At intake, `tools/validators/src/schemas/story-relationship.schema.json` defined `direction: type: string, minLength: 1` with two example formats in the shared contract but no enforcement. Free-string semantics were fragile for validators: SPEC30STOCONHAR-010 (motivation grounding) wants to match an SREL by actor (`from`/`to`) but cannot do so against an unstructured string. Pre-production was the lowest-cost migration moment — zero `_source/relationships/*.yaml` story bundle records exist anywhere in the repo (verified via `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` returning empty). This ticket landed the hard cutover.

**Scope trim vs. spec D10 as written**: spec items 5 (world-index SREL edge extraction in `tools/world-index/src/parse/semantic.ts`) and 6 (MCP SREL direction rendering in `tools/world-mcp/src/context-packet/story-bundle-context.ts`) reference surfaces that do not currently exist. `parse/semantic.ts` (292 lines) handles only canon-level CF/CH/M attribution edges; SREL records are stored as opaque YAML via `parse/atomic.ts`. `parse/structured-edges.ts` extracts edges only for `diegetic_artifact_record` / `proposal_batch` / `proposal_card` / `character_proposal_card`. `story-bundle-context.ts` (371 lines) has zero SREL/relationship/direction references. Per the user disposition at SPEC-30 decomposition time, items 5+6 are trimmed to no-op (the schema/validator/contract changes are the load-bearing hard cutover; net-new SREL edge extraction and context-packet rendering are a follow-up if needed).

## Assumption Reassessment (2026-05-15)

1. Historical intake: `_shared-templates/story-state-contract.md` carried `direction: string*` with the comment `# "STENT-<from> -> STENT-<to>" | "bidirectional"` exactly as the spec asserted. Landed state: §4.5.7 now uses structured `direction.kind/from/to`.
2. Historical intake: `tools/validators/src/schemas/story-relationship.schema.json` carried `direction: { type: string, minLength: 1 }` with `required: [..., direction, ...]`. Landed state: `direction` is now a required object with `kind`, `from`, and `to` plus conditional endpoint legality.
3. Verified `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` returns ZERO matches — no production story bundle has any SREL record to migrate. Hard cutover is lawful per spec key design decisions.
4. Verified `tools/world-index/src/parse/semantic.ts` (292 lines) handles only CF / CH / M / DA / CHAR / PR / BATCH / NCP / NCB / AU / RP edges — no SREL handling. `tools/world-index/src/parse/atomic.ts:76` registers SREL records as `relationship_record_story` but does not parse `direction`. `tools/world-index/src/parse/structured-edges.ts` extracts edges only for `diegetic_artifact_record` / `proposal_batch` / `proposal_card` / `character_proposal_card` — no SREL. Conclusion: there is no existing "free string SREL edge extraction" to update; spec D10 item 5 is no-op.
5. Verified `tools/world-mcp/src/context-packet/story-bundle-context.ts` (371 lines) has zero `SREL` / `relationship` / `direction` matches — no existing rendering. Conclusion: spec D10 item 6 is no-op.
6. Cross-skill / cross-artifact boundary under audit: the SREL `direction` contract spans (a) the shared contract §4.5.7 prose schema, (b) the JSON schema `story-relationship.schema.json`, (c) the `recursive-reference-closure` validator (which needs to closure-walk `direction.from` / `direction.to` STENT references), (d) skill prose in bootstrap + turn-cycle SREL-authoring sections.
7. FOUNDATIONS principle under audit: Rule 4 (No Capability Creep) per spec FOUNDATIONS Alignment — the structured form is a schema tightening, not a new capability; no new SREL field is added beyond restructuring `direction`. Rule 6 (No Silent Retcons): hard cutover with no production bundles is by definition not a retcon (no retconned facts exist).
8. HARD-GATE / Mystery Reserve firewall verification: this ticket modifies the SREL JSON schema (a `record_schema_compliance` surface) and the closure validator. It does NOT touch Mystery Reserve firewall logic.
9. Schema extension classification: this IS a schema extension AND a breaking change to the `direction` field shape. Per FOUNDATIONS extension rules, breaking changes are lawful only when no consumer is affected — verified by the zero-bundles count above. Consumers: `record_schema_compliance` validator (updated by virtue of the JSON schema swap), `recursive-reference-closure` (updated here), bootstrap + turn-cycle authoring (updated here).
10. Adjacent contradictions classification: spec items 5+6 reference absent code. Classified as **required consequence of the spec itself being aspirational about those surfaces**; trimmed to no-op per user disposition. Net-new SREL edge extraction in world-index and net-new SREL direction rendering in MCP context-packet are documented as cross-spec follow-ups (separate follow-up spec if needed; not part of this ticket).
11. Package public-surface check: `tools/validators/README.md` lists SREL only as a covered story-bundle record class and has no direction-shape example to update. Repo docs hits in `docs/WORKFLOWS.md` and `docs/MACHINE-FACING-LAYER.md` are generic SREL retrieval/workflow references, not same-seam `direction` contract prose.
12. Explicit SPEC-30 reference truthing: `archive/specs/SPEC-30-story-contract-hardening-ii.md` received a dated D10 implementation note. The old D10 item bullets remain historical spec context; the note records that world-index/MCP rendering bullets are follow-up material because the live repo has no current SREL parsing/rendering surface.

## Architecture Check

1. The structured `direction: { kind, from, to }` form lets validators do exact-id closure walks and lets motivation-grounding (ticket 010) match SREL by actor without text parsing. The alternative — keeping the string and adding a parser — would put a regex-based grammar between every consumer and the data; the structured form is one decisive change, no consumer-side parser needed.
2. No backwards-compatibility shim: pre-production cutover, zero records to migrate. The schema enforces the new form strictly; the parser path does not exist.

## Verification Layers

1. Schema admission → schema validation: SREL with `direction: { kind: directed, from: STENT-1, to: STENT-3 }` validates cleanly; SREL with `direction: { kind: bidirectional, from: null, to: null }` validates cleanly; SREL with `direction: { kind: directed, from: null, to: STENT-3 }` emits a schema error; SREL with `direction: { kind: bidirectional, from: STENT-1, to: STENT-3 }` emits a schema error.
2. Closure walk → validator unit test: `recursive_reference_closure` resolves `direction.from` / `direction.to` STENT ids against the bundle; missing STENTs emit `missing_record`.
3. Contract sync → codebase grep-proof: `grep -nE "kind: directed|kind: bidirectional" .claude/skills/_shared-templates/story-state-contract.md` shows the structured-form yaml block in §4.5.7.
4. Skill prose sync → codebase grep-proof: SREL-authoring examples in bootstrap + turn-cycle use the structured form.
5. No production migration → codebase grep-proof: `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` returns ZERO matches at acceptance time (re-verify).

## Landed Changes

### 1. Contract §4.5.7

In `.claude/skills/_shared-templates/story-state-contract.md` §4.5.7, replaced `direction: string*` (with the example-formats comment) with the structured form:

```yaml
direction:
  kind: directed | bidirectional       # *
  from: STENT-<integer> | null         # required when kind == directed; null when bidirectional
  to: STENT-<integer> | null           # required when kind == directed; null when bidirectional
```

Added legality rule prose: if `kind: directed`, both `from` and `to` MUST be non-null and reference STENT records in the bundle; if `kind: bidirectional`, both endpoints MUST be null and mutual participants are documented in `participants[]`.

### 2. JSON schema

In `tools/validators/src/schemas/story-relationship.schema.json`, replaced the string `direction` with an object schema:

```json
"direction": {
  "type": "object",
  "required": ["kind", "from", "to"],
  "properties": {
    "kind": { "type": "string", "enum": ["directed", "bidirectional"] },
    "from": { "type": ["string", "null"], "pattern": "^STENT-[0-9]+$" },
    "to": { "type": ["string", "null"], "pattern": "^STENT-[0-9]+$" }
  },
  "additionalProperties": false,
  "allOf": [
    {
      "if": { "properties": { "kind": { "const": "directed" } }, "required": ["kind"] },
      "then": { "properties": { "from": { "type": "string" }, "to": { "type": "string" } } }
    },
    {
      "if": { "properties": { "kind": { "const": "bidirectional" } }, "required": ["kind"] },
      "then": { "properties": { "from": { "type": "null" }, "to": { "type": "null" } } }
    }
  ]
}
```

### 3. Validator closure check

In `tools/validators/src/structural/recursive-reference-closure.ts`, the existing recursive collector already walked into `direction.from` and `direction.to`; this run added a clarifying comment and tests proving both clean and missing-endpoint behavior.

### 4. Skill prose updates

In `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/branching-story-turn-cycle/SKILL.md`, updated SREL-authoring prose to use the structured form. Authoring examples now show both `kind: directed` (with `from`/`to`) and `kind: bidirectional` (with `from: null, to: null`) cases.

### 5. World-index parse layer (item 5) — explicitly no-op

Per Step 2 Issue D10-A disposition, no edits in `tools/world-index/src/parse/`. The world-index does not currently parse SREL `direction`; net-new edge extraction reading the structured form is a cross-spec follow-up tracked in the Step 6 summary.

### 6. MCP context-packet rendering (item 6) — explicitly no-op

Per Step 2 Issue D10-A disposition, no edits in `tools/world-mcp/src/context-packet/story-bundle-context.ts`. The context packet does not currently render SREL `direction`; net-new rendering using the structured form is a cross-spec follow-up tracked in the Step 6 summary.

### 7. SPEC-30 implementation note

Added a dated D10 implementation note to `archive/specs/SPEC-30-story-contract-hardening-ii.md` so the explicit spec reference records the landed schema/validator/skill contract and the trimmed world-index/MCP follow-up boundary.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.5.7 schema + legality rule)
- `tools/validators/src/schemas/story-relationship.schema.json` (modify — `direction` object schema)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — added comment naming `direction.from`/`direction.to` as closure roots; traversal logic already handled nested values)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — new test cases for SREL `direction.from`/`direction.to` closure)
- `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` (modify — schema-admission cases for the structured form)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify — updated representative SREL fixture to the new structured form)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — SREL-authoring prose + examples)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — SREL-authoring prose + examples)
- `archive/specs/SPEC-30-story-contract-hardening-ii.md` (modify — D10 implementation note)

## Out of Scope

- World-index SREL edge extraction (`tools/world-index/src/parse/`) — spec D10 item 5, trimmed to no-op per user disposition (no existing surface to update; net-new is a follow-up).
- MCP SREL direction rendering (`tools/world-mcp/src/context-packet/story-bundle-context.ts`) — spec D10 item 6, trimmed to no-op per user disposition (same rationale).
- Migration script for production SREL records (deliberately rejected — zero records exist; hard cutover is lawful).
- Any change to `participants[]`, `axis`, `value`, `valence`, `description`, or `derived_from` fields.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds.
2. From `tools/validators`, `npm run test` — all validator tests pass including SREL structured-direction admission, the four schema-error cases (directed-with-null-from, directed-with-null-to, bidirectional-with-from, bidirectional-with-to), and closure walks over `direction.from` / `direction.to`.
3. `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` returns ZERO matches (re-verify pre-merge that no production bundle landed mid-flow).
4. `grep -nE "kind: directed|kind: bidirectional" .claude/skills/_shared-templates/story-state-contract.md` returns hits in §4.5.7.

### Invariants

1. SREL records require structured `direction` with kind-conditional from/to legality.
2. No existing SREL record migration is needed (verified empty migration set at merge time).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` — new cases: directed-valid, bidirectional-valid, directed-with-null-from (error), directed-with-null-to (error), bidirectional-with-from (error), bidirectional-with-to (error).
2. `tools/validators/tests/structural/recursive-reference-closure.test.ts` — new case: SREL `direction.from: STENT-1, direction.to: STENT-3` resolves cleanly when both STENTs exist; missing STENT-3 emits `missing_record`.
3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — updated the representative SREL fixture to the new structured form.

### Commands

1. From `tools/validators`: `npm run test`
2. `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` (re-verify zero bundles pre-merge)
3. `grep -nE "kind: directed|kind: bidirectional" .claude/skills/_shared-templates/story-state-contract.md`
4. The full validator `test` command is the correct boundary because three structural test files share the SREL schema and closure surface.

## Outcome

Completed. `SREL.direction` is now a structured object in the shared contract and JSON schema; validator tests cover valid directed/bidirectional forms and four illegal endpoint combinations. `recursive_reference_closure` now has explicit proof that `direction.from` / `direction.to` participate in story-local closure, including missing-STENT failure. Bootstrap and turn-cycle authoring prose now show the structured form, and SPEC-30 carries a D10 implementation note documenting the trimmed world-index/MCP boundary.

## Verification Result

1. Baseline before edits: from `tools/validators`, `npm run test` passed (`238` tests).
2. `npm run build` from `tools/validators` passed after schema/source edits.
3. Focused compiled proof passed: `node --test dist/tests/structural/record-schema-compliance-story-relationship.test.js dist/tests/structural/recursive-reference-closure.test.js dist/tests/structural/contract-schema-roundtrip.test.js` (`32` tests).
4. Final full package proof passed: from `tools/validators`, `npm run test` (`242` tests).
5. `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` returned zero matches.
6. `grep -nE "kind: directed|kind: bidirectional" .claude/skills/_shared-templates/story-state-contract.md` returned the structured §4.5.7 hits.
7. Same-seam stale-shape sweep over active contract/source/test/skill surfaces found no remaining `direction: "bidirectional"` / `direction: string` current-contract hits; remaining old-shape hits are historical intake/spec/ticket text.
8. `git diff --check` passed.

## Deviations

1. The `recursive-reference-closure.ts` implementation did not need traversal logic changes; the existing recursive object walker already follows `direction.from` and `direction.to`. This run added a clarifying comment and explicit tests instead.
2. `archive/specs/SPEC-30-story-contract-hardening-ii.md` keeps the old D10 deliverable bullets as historical proposal text. The new implementation note is the current authority for the landed boundary and records world-index/MCP rendering as follow-up material.
