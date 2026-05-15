# SPEC30STOCONHAR-009: `SREL.direction` Structured Form (Hard Cutover, Trimmed)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — contract §4.5.7, `story-relationship.schema.json`, `recursive-reference-closure.ts` + test, bootstrap + turn-cycle skill prose (world-index parse layer + MCP context-packet rendering trimmed to no-op per Step 2 disposition)
**Deps**: None

## Problem

`tools/validators/src/schemas/story-relationship.schema.json:36` defines `direction: type: string, minLength: 1` with two example formats in the comment but no enforcement. Free-string semantics are fragile for validators: SPEC30STOCONHAR-010 (motivation grounding) wants to match an SREL by actor (`from`/`to`) but cannot do so against an unstructured string. Pre-production is the lowest-cost migration moment — zero `_source/relationships/*.yaml` story bundle records exist anywhere in the repo (verified via `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` returning empty). This ticket lands the hard cutover.

**Scope trim vs. spec D10 as written**: spec items 5 (world-index SREL edge extraction in `tools/world-index/src/parse/semantic.ts`) and 6 (MCP SREL direction rendering in `tools/world-mcp/src/context-packet/story-bundle-context.ts`) reference surfaces that do not currently exist. `parse/semantic.ts` (292 lines) handles only canon-level CF/CH/M attribution edges; SREL records are stored as opaque YAML via `parse/atomic.ts`. `parse/structured-edges.ts` extracts edges only for `diegetic_artifact_record` / `proposal_batch` / `proposal_card` / `character_proposal_card`. `story-bundle-context.ts` (371 lines) has zero SREL/relationship/direction references. Per the user disposition at SPEC-30 decomposition time, items 5+6 are trimmed to no-op (the schema/validator/contract changes are the load-bearing hard cutover; net-new SREL edge extraction and context-packet rendering are a follow-up if needed).

## Assumption Reassessment (2026-05-15)

1. Verified `_shared-templates/story-state-contract.md:486` carries `direction: string*` with the comment `# "STENT-<from> -> STENT-<to>" | "bidirectional"` exactly as the spec asserts.
2. Verified `tools/validators/src/schemas/story-relationship.schema.json:36` carries `direction: { type: string, minLength: 1 }` with `required: [..., direction, ...]` at line 5.
3. Verified `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` returns ZERO matches — no production story bundle has any SREL record to migrate. Hard cutover is lawful per spec key design decisions.
4. Verified `tools/world-index/src/parse/semantic.ts` (292 lines) handles only CF / CH / M / DA / CHAR / PR / BATCH / NCP / NCB / AU / RP edges — no SREL handling. `tools/world-index/src/parse/atomic.ts:76` registers SREL records as `relationship_record_story` but does not parse `direction`. `tools/world-index/src/parse/structured-edges.ts` extracts edges only for `diegetic_artifact_record` / `proposal_batch` / `proposal_card` / `character_proposal_card` — no SREL. Conclusion: there is no existing "free string SREL edge extraction" to update; spec D10 item 5 is no-op.
5. Verified `tools/world-mcp/src/context-packet/story-bundle-context.ts` (371 lines) has zero `SREL` / `relationship` / `direction` matches — no existing rendering. Conclusion: spec D10 item 6 is no-op.
6. Cross-skill / cross-artifact boundary under audit: the SREL `direction` contract spans (a) the shared contract §4.5.7 prose schema, (b) the JSON schema `story-relationship.schema.json`, (c) the `recursive-reference-closure` validator (which needs to closure-walk `direction.from` / `direction.to` STENT references), (d) skill prose in bootstrap + turn-cycle SREL-authoring sections.
7. FOUNDATIONS principle under audit: Rule 4 (No Capability Creep) per spec FOUNDATIONS Alignment — the structured form is a schema tightening, not a new capability; no new SREL field is added beyond restructuring `direction`. Rule 6 (No Silent Retcons): hard cutover with no production bundles is by definition not a retcon (no retconned facts exist).
8. HARD-GATE / Mystery Reserve firewall verification: this ticket modifies the SREL JSON schema (a `record_schema_compliance` surface) and the closure validator. It does NOT touch Mystery Reserve firewall logic.
9. Schema extension classification: this IS a schema extension AND a breaking change to the `direction` field shape. Per FOUNDATIONS extension rules, breaking changes are lawful only when no consumer is affected — verified by the zero-bundles count above. Consumers: `record_schema_compliance` validator (updated by virtue of the JSON schema swap), `recursive-reference-closure` (updated here), bootstrap + turn-cycle authoring (updated here).
10. Adjacent contradictions classification: spec items 5+6 reference absent code. Classified as **required consequence of the spec itself being aspirational about those surfaces**; trimmed to no-op per user disposition. Net-new SREL edge extraction in world-index and net-new SREL direction rendering in MCP context-packet are documented as cross-spec follow-ups (separate follow-up spec if needed; not part of this ticket).

## Architecture Check

1. The structured `direction: { kind, from, to }` form lets validators do exact-id closure walks and lets motivation-grounding (ticket 010) match SREL by actor without text parsing. The alternative — keeping the string and adding a parser — would put a regex-based grammar between every consumer and the data; the structured form is one decisive change, no consumer-side parser needed.
2. No backwards-compatibility shim: pre-production cutover, zero records to migrate. The schema enforces the new form strictly; the parser path does not exist.

## Verification Layers

1. Schema admission → schema validation: SREL with `direction: { kind: directed, from: STENT-1, to: STENT-3 }` validates cleanly; SREL with `direction: { kind: bidirectional, from: null, to: null }` validates cleanly; SREL with `direction: { kind: directed, from: null, to: STENT-3 }` emits a schema error; SREL with `direction: { kind: bidirectional, from: STENT-1, to: STENT-3 }` emits a schema error.
2. Closure walk → validator unit test: `recursive_reference_closure` resolves `direction.from` / `direction.to` STENT ids against the bundle; missing STENTs emit `missing_record`.
3. Contract sync → codebase grep-proof: `grep -nE "kind: directed|kind: bidirectional" .claude/skills/_shared-templates/story-state-contract.md` shows the structured-form yaml block in §4.5.7.
4. Skill prose sync → codebase grep-proof: SREL-authoring examples in bootstrap + turn-cycle use the structured form.
5. No production migration → codebase grep-proof: `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` returns ZERO matches at acceptance time (re-verify).

## What to Change

### 1. Contract §4.5.7

In `.claude/skills/_shared-templates/story-state-contract.md` §4.5.7 (around line 486), replace `direction: string*` (with the example-formats comment) with the structured form:

```yaml
direction:
  kind: directed | bidirectional       # *
  from: STENT-<integer> | null         # required when kind == directed; null when bidirectional
  to: STENT-<integer> | null           # required when kind == directed; null when bidirectional
```

Add the legality rule prose: *"if `kind: directed`, both `from` and `to` MUST be non-null and reference STENT records in the bundle; if `kind: bidirectional`, both `from` and `to` MUST be null (the relationship is mutual; participants are documented in the `participants[]` field)."*

### 2. JSON schema

In `tools/validators/src/schemas/story-relationship.schema.json:36`, replace the string `direction` with an object schema:

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

In `tools/validators/src/structural/recursive-reference-closure.ts`, ensure the `storyLocalReferences` collector walks into `direction.from` and `direction.to` of SREL records. The existing collector traverses object values recursively (`collectStoryLocalReferences` at `:214-240`) and matches `^STENT-\d+$` via the `STORY_LOCAL_ID` regex at `:11`; verify by adding a test case. Modify the collector only if the test reveals a gap.

### 4. Skill prose updates

In `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/branching-story-turn-cycle/SKILL.md`, update every SREL-authoring example and prose reference to use the structured form. Authoring examples should show both `kind: directed` (with `from`/`to`) and `kind: bidirectional` (with `from: null, to: null`) cases.

### 5. World-index parse layer (item 5) — explicitly no-op

Per Step 2 Issue D10-A disposition, no edits in `tools/world-index/src/parse/`. The world-index does not currently parse SREL `direction`; net-new edge extraction reading the structured form is a cross-spec follow-up tracked in the Step 6 summary.

### 6. MCP context-packet rendering (item 6) — explicitly no-op

Per Step 2 Issue D10-A disposition, no edits in `tools/world-mcp/src/context-packet/story-bundle-context.ts`. The context packet does not currently render SREL `direction`; net-new rendering using the structured form is a cross-spec follow-up tracked in the Step 6 summary.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.5.7 schema + legality rule)
- `tools/validators/src/schemas/story-relationship.schema.json` (modify — `direction` object schema)
- `tools/validators/src/structural/recursive-reference-closure.ts` (modify — verify collector traversal; add comment naming `direction.from`/`direction.to` as closure roots if logic untouched)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts` (modify — new test cases for SREL `direction.from`/`direction.to` closure)
- `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` (modify — schema-admission cases for the structured form)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify — update SREL fixture(s) to the new structured form if covered)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — SREL-authoring prose + examples)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — SREL-authoring prose + examples)

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
3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — update SREL fixture(s) to the new structured form if covered.

### Commands

1. From `tools/validators`: `npm run test`
2. `find worlds/ -path '*/_source/relationships/*' -name '*.yaml'` (re-verify zero bundles pre-merge)
3. `grep -nE "kind: directed|kind: bidirectional" .claude/skills/_shared-templates/story-state-contract.md`
4. The full validator `test` command is the correct boundary because three structural test files share the SREL schema and closure surface.
