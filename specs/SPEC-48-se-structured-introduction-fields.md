<!-- spec-drafting-rules.md not present; using SPEC-47's structure (Status / Phase / Depends on / Blocks / Source header + Problem Statement + Key Design Decisions + Approach + per-phase sections + FOUNDATIONS Alignment + Out of Scope + Deliverables + Risks & Open Questions + Test Plan + Outcome). -->

# SPEC-48: `SE` Structured Introduction / Relation / Non-Propagation Fields (Tag-Grammar Replacement)

**Status**: Draft (ready for `reassess-spec` + `spec-to-tickets`)
**Phase**: Wave 3 — supersedes the parseable-tag grammar with structured `SE` fields.
**Depends on**: SPEC-43 (deterministic tag grammar baseline being replaced), SPEC-46 (story-pipeline machine-facing foundation), SPEC-47 (`STPLAN`/`STEMO` schemas + `plan_relation:` tag + per-class trigger vocabularies the structured fields will preserve verbatim).
**Blocks**: All Priority 2 packet specs (present-causal-situation, dramatic-irony, reader-expectation/payoff, social-pressure, branch-possibility-space, pressure-texture, `get_page_render_packet`) — they must be drafted against the structured representation, not the deprecated tag grammar.
**Source**: `reports/new-story-structures-proposal.md` §Sharpen `SE` (proposed `record_introductions[]` + `state_relations[]`); SPEC-46 §Out of Scope item 11; SPEC-47 §Out of Scope item 8; `docs/plans/2026-05-19-spec47-followup-routing.md` Group 3 routing recommendation; brainstorm-resolved decisions verified against `tools/world-index/src/parse/intro-tag-parser.ts`, `tools/validators/src/structural/midstory-introduction-utils.ts`, `tools/validators/src/structural/non-propagation-tag-shape.ts`, `tools/validators/src/structural/stplan-utils.ts`, `tools/validators/src/structural/stemo-utils.ts`, `.claude/skills/_shared-templates/story-state-contract.md` §5a, and `docs/FOUNDATIONS.md` §Story Bundles §4 / §5b / §5c / §6b + Rule 4 / Rule 7.

## Problem Statement

`SE.world_logic_rationale` is a prose field that currently carries three parseable tag patterns:

- `intro:<CLASS>(id=..., trigger=..., evidence=[...], distinct_from=[...])` — 8 classes (`CLK`, `STSEC`, `STQ`, `THR`, `STENT`, `SREL`, `STPLAN`, `STEMO`), per-class closed trigger vocabularies (5-7 triggers each).
- `plan_relation:<relation>(plan=STPLAN-N)` — 7 relations (`advances`, `tests`, `blocks`, `revises`, `fulfills`, `abandons`, `ignores`).
- `non_propagation:<reason>(group=<label>, records=[<ids>])` — closed reason set.

SPEC-43 hardened these patterns from "stringly typed" to "deterministic" by adding closed regex + closed per-class vocabularies + 12 enforcing validators (8 introduction-grounding + 3 plan-relation + 1 non-propagation). The grammar **works**: it parses reliably, the validators ground it correctly, and the contract documents the surface in §5a.

But the architecture is **inferior to first-class structured fields**:

- The structured WHAT (which record was introduced, which relation an event has to a plan, which non-propagation fact an event asserts) rides on a prose-shaped string that also carries the human-readable WHY. Two roles, one field.
- LLM authors must compose the tag grammar character-by-character inside an otherwise free-form prose field — a representation choice that introduces a class of failure modes (malformed tags, position-sensitive composition, escape-character ambiguity) that vanish under first-class structured fields validated by JSON-schema.
- Every new mid-story class addition (CLK → STSEC → STQ → THR → STENT → SREL → STPLAN → STEMO, via SPEC-42 and SPEC-47) extends the parser regex and adds a per-class vocabulary constant. The pattern compounds.
- Validators read parsed-out-of-string content, not typed fields. Refactoring is friction; new validators consuming introduction provenance must learn the parser surface.

SPEC-46 §Out of Scope item 11 and SPEC-47 §Out of Scope item 8 both deferred this replacement to a focused brainstorm + spec on the grounds that the deferral was non-urgent (the grammar works) and the migration involves cross-skill prose churn. The deferral is now lifted: SPEC-47 just landed (adding the 8th class, 13 new triggers, and the `plan_relation:` pattern); deferring once more would only accumulate more patterns to migrate.

The user has additionally established a load-bearing scoping constraint: **no production story bundles exist**. The spec ships as a clean architectural break — no migration tooling, no co-existence window, no backward-compatibility shim, no class-gated validator dispatch by bundle age.

## Key Design Decisions

- **D1. Three separate fields, not one merged.** `record_introductions[]`, `state_relations[]`, and `non_propagation_facts[]` are three semantically distinct categories (introduction provenance vs relation-to-existing-record vs non-propagation assertion). Three parallel JSON-schema fields read cleaner than one discriminated-union `provenance[]` field.
- **D2. `world_logic_rationale` becomes prose-only.** No structured content rides on the string field after this spec. The string carries the human-readable WHY ("Mara declares the seven-day quarantine, opening a deadline clock"); the structured fields carry the machine-readable WHAT. §5a rewrite documents this as an explicit prose-field discipline: validators MUST NOT attempt to parse `world_logic_rationale` for structural facts.
- **D3. Per-class trigger vocabularies preserved verbatim.** The 8 vocabularies currently exported from `intro-tag-parser.ts` (`CLK_TRIGGERS` … `STEMO_TRIGGERS`) move into JSON-schema as closed enums plus per-class `oneOf` constraint. The vocabularies themselves are unchanged.
- **D4. `non_propagation_facts[]` schema derived, not invented.** The structured shape is `{reason, group, records[]}` per the existing `non-propagation-tag-shape.ts` parser regex at `non-propagation-tag-shape.ts:85` (`/^non_propagation:([A-Za-z_]+)\(group=([^,()[\]\s]+), records=\[([^\]]*)\]\)$/`). The accepted reason set is migrated verbatim from the existing validator's closed list.
- **D5. No migration tooling; no `migration_attestation` op.** Per the user's "no production stories" clarification, this spec ships as a clean break: delete the parser, refactor validators, deprecate tag syntax in the contract. No Rule 4 / Rule 6 defense is required because no SE records are rewritten — there are none to rewrite.
- **D6. `record_introductions[].rationale?` is optional prose, not structured.** Origin report's example includes a per-introduction `rationale` field. Keep it as optional prose for the case where the author wants per-introduction context beyond the SE-level `world_logic_rationale`. NOT a schema vehicle for structured content.
- **D7. Closed-vocabulary updates remain a separate concern.** Adding a new class to `record_introductions[].class`, a new trigger to a per-class vocabulary, a new relation to `state_relations[].relation`, or a new reason to `non_propagation_facts[].reason` is a future spec under the same "named §5b-class consumer" discipline as SPEC-47 §Out of Scope items 1-2. This spec freezes the current vocabularies in the new structured form.
- **D8. Parser file deletion is a CI gate, not a soft signal.** A static-analysis test asserts no source file imports from `tools/world-index/src/parse/intro-tag-parser.ts` (post-deletion target). The same gate prevents re-introduction. A parallel gate over SKILL.md files prevents `intro:<CLASS>` / `plan_relation:` / `non_propagation:` tag-syntax strings from drifting back into skill prose.
- **Implementation note (2026-05-19 / SPEC48SESTRINT-001, amended by SPEC48SESTRINT-014):** Standard JSON Schema `uniqueItems` compares whole array items; it does not enforce uniqueness by a dynamic object property such as `record_introductions[].record_id` when other fields differ. SPEC48SESTRINT-001 lands the additive schema fields and exact-duplicate object rejection. Keyed `record_id` uniqueness is now enforced by `archive/tickets/SPEC48SESTRINT-014.md` through the `record_introduction_uniqueness` structural validator before final capstone archival.

## Approach

Five-phase decomposition mirroring SPEC-47's structure.

### Phase A: Schemas, structured field definitions, contract rewrite

Author the three new optional fields in the `SE` schema; rewrite the contract section that documents the deprecated tag grammar.

- Extend `tools/validators/src/schemas/story-event.schema.json` with three new optional properties:
  - `record_introductions`: array of `{record_id (RECORD_ID pattern), class (8-value enum), trigger (string), evidence (array of RECORD_ID), distinct_from (array of RECORD_ID), rationale? (string)}` with exact duplicate object rejection via JSON Schema `uniqueItems` and a per-class `oneOf` constraint enforcing trigger-vocabulary-per-class. Dynamic uniqueness by `record_id` is enforced by SPEC48SESTRINT-014, not by the schema alone.
  - `state_relations`: array of `{relation (7-value enum: advances/tests/blocks/revises/fulfills/abandons/ignores), target_record (RECORD_ID pattern)}`. Plan-relation domain is implicit (target_record currently restricted to STPLAN-* by validator consistency check, not by schema).
  - `non_propagation_facts`: array of `{reason (closed enum, set discovered from `non-propagation-tag-shape.ts` accepted-reason list), group (string), records (array of RECORD_ID)}`.
- Update `.claude/skills/_shared-templates/story-record-schemas.md` SE entry to document the three new fields, their semantics, the closed enums, and one worked YAML example per field.
- Rewrite `.claude/skills/_shared-templates/story-state-contract.md` §5a from "Mid-Story Introduction Tag Grammar and Closed Trigger Vocabularies" to "Mid-Story Introduction Structured Fields." The 8 per-class trigger tables move verbatim under the structured-field schema. The `plan_relation:` pattern documentation moves to a §5a-`state_relations` sub-section. The `non_propagation:` pattern documentation moves to a §5a-`non_propagation_facts` sub-section. The closed-regex specifications are deleted (replaced by the JSON-schema as the source of truth).
- Add an explicit prose-field-discipline statement to §5a: "`SE.world_logic_rationale` is prose-only. Validators MUST NOT attempt to parse `world_logic_rationale` for structural facts. The structured WHAT lives in `record_introductions[]`, `state_relations[]`, and `non_propagation_facts[]`."

### Phase B: Validator refactor (no semantics change)

Refactor every validator that currently consumes parseable tags to consume the structured fields directly. Validator semantics — what each validator checks, which inputs trigger which verdicts, what severity is emitted — are unchanged. The **verdict-prose surface** does change: `suggested_fix` strings and `message` strings that reference the tag grammar verbatim MUST be rewritten to reference the structured-field form. Verified sites where this applies include `midstory-record-introduction-grounding.ts:209` (`"Carry every mid-story-created CLK/STSEC/STQ/THR/STENT/SREL/STPLAN/STEMO as a parseable intro:<CLASS>(...) tag in SE.world_logic_rationale"`), `non-propagation-tag-shape.ts:119,131` (and successor `non_propagation_facts_completeness` validator messages), and `stplan-closure-status-requires-closure-event.ts:15` (`"plan_status ${status} requires an SE world_logic_rationale plan_relation closure tag"`). These strings are downstream-consumed by LLMs reading verdicts; leaving them verbatim would point authors at a deprecated grammar after the clean-break.

- **8 introduction-grounding validators** read `SE.record_introductions[]` directly:
  - `clock-introduction-grounding-integrity.ts` (per-class for CLK)
  - `entity-introduction-status-pairing.ts` (per-class for STENT)
  - `relationship-introduction-grounding-integrity.ts` (per-class for SREL)
  - `secret-introduction-anchor-integrity.ts` (per-class for STSEC)
  - `story-question-introduction-grounding-integrity.ts` (per-class for STQ)
  - `thread-introduction-grounding-integrity.ts` (per-class for THR)
  - `midstory-record-introduction-grounding.ts` (unified cross-class grounding; SPEC-47 D-B6 extended this validator to recognize the 2 new STPLAN/STEMO `class` enum values added to `MIDSTORY_TRIGGERS_BY_CLASS`)
  - `introduction-observer-firewall.ts` (cross-class observer-firewall gate)
- **3 plan-relation consumers** read `SE.state_relations[]` directly:
  - `stplan-event-plan-relation-consistency.ts`
  - `stplan-closure-status-requires-closure-event.ts`
  - `stemo-agency-effect-compatibility.ts` (drops the `rationale.includes("plan_relation:")` shortcut).
- **1 non-propagation consumer** reads `SE.non_propagation_facts[]` directly:
  - `expected-witness-coverage.ts` (drops the regex-extract pass at line 34).
- **Shared utility refactor**:
  - `tools/validators/src/structural/midstory-introduction-utils.ts`: drop parser re-exports; keep per-class trigger constants as TypeScript exports for schema-parity tests; expose typed reader `readSeIntroductions(event: StoryEvent): ParsedIntroduction[]` over the structured field. This is the only utility that validators call.
  - `tools/validators/src/structural/stplan-utils.ts`: drop `PLAN_CLOSURE_RELATION` and `PLAN_ADVANCES_RELATION` regex constants; expose typed reader over `state_relations[]`.
  - `tools/validators/src/structural/stemo-utils.ts`: drop the `rationale.includes(...)` shortcut function at line 322; replace with typed reader.

### Phase C: Parser deletion and CI gates

Delete the parser files and add CI gates to prevent reintroduction.

- **Delete** `tools/world-index/src/parse/intro-tag-parser.ts` (entire file).
- **Delete** `tools/validators/src/structural/non-propagation-tag-shape.ts` (entire file). Replace with a thin `non_propagation_facts_completeness` structural validator that checks required-when-cited semantics against `SE.non_propagation_facts[]` directly (preserving the existing validator's required-when-cited check semantics; details discovered during implementation by reading the deleted validator's check logic).
- Add `tools/validators/src/structural/__tests__/parser-deletion-completeness.test.ts` (CI gate): static-analysis test that asserts no source file under `tools/`, `.claude/skills/`, or `docs/` imports from the deleted parser path.
- Add `tools/validators/src/structural/__tests__/skill-prose-tag-syntax-absence.test.ts` (CI gate): grep test asserting no `.claude/skills/**/*.md` file (SKILL.md plus references/ docs plus shared templates under `_shared-templates/`) contains the substrings `intro:<CLASS>` / `intro:CLK(` / `intro:STSEC(` / `intro:STQ(` / `intro:THR(` / `intro:STENT(` / `intro:SREL(` / `intro:STPLAN(` / `intro:STEMO(` / `plan_relation:` / `non_propagation:` (the substring set is the closed list of deprecated patterns).

### Phase D: World-index and MCP refactor

The parser file currently lives under `tools/world-index/src/parse/` and is re-exported into `tools/validators/`. Refactor world-index and MCP consumers to read structured fields.

- **World-index edge extraction**: known refactor target at `tools/world-index/src/parse/atomic.ts:971` — `edgesForStoryEvent` invokes `extractIntroTags(rationale)` to derive introduction edges from parsed tags. The refactor reads `SE.record_introductions[]` directly and emits the equivalent edges; the parser-import at `atomic.ts:10` is removed alongside the parser file deletion. The rest of world-index edge extraction is driven by structured fields already (per-class helpers from SPEC-46/47) and needs no further refactor.
- **MCP context-packet builders**: audit `tools/world-mcp/src/context-packet/story-bundle-context.ts` for any builder that reads parsed tags. Refactor any tag-consumer to structured-field consumer.
- **Capability descriptions**: update `tools/world-mcp/src/tools/describe-capabilities.ts` to mention the three new SE fields if it currently mentions the tag grammar.
- **Context-packet contract doc**: update `docs/CONTEXT-PACKET-CONTRACT.md` if it documents tag-grammar provenance; replace with structured-field references.

### Phase E: Skill prose update + cross-phase integration

Update all SE-authoring skill prose; run the integration test.

- Update SE-authoring examples in all 7 story-pipeline `SKILL.md` files:
  - `branching-story-bootstrap`
  - `branching-story-turn-cycle`
  - `branching-story-prose-attach`
  - `branching-story-health-audit`
  - `commitment-block-authoring`
  - `story-fact-promotion-to-canon`
  - `story-promotion-closeout`

  Each file replaces every occurrence of `intro:<CLASS>(...)` / `plan_relation:<...>(...)` / `non_propagation:<...>(...)` tag-syntax in YAML or prose examples with the equivalent structured-field shape. Skill discipline statements that reference "parseable tag in `world_logic_rationale`" are rewritten to reference the structured fields.
- Update `docs/MACHINE-FACING-LAYER.md` if it documents the tag-grammar parser surface.
- Cross-phase integration test: bootstrap a representative fixture bundle with seeded structured-field SE records exercising all three new fields; run turn-cycle, prose-attach, and health-audit; assert all 8 hard gates pass, the schema rejects malformed structured fields, the CI parser-deletion gate fires green, and the skill-prose tag-absence gate fires green.

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| `docs/FOUNDATIONS.md` §Story Bundles §4 (Write Discipline) | aligns | All structured-field writes route through the existing `mcp__worldloom__submit_patch_plan` `create_se_record` op. Hook 3 continues to block raw edits on `_source/events/*.yaml`. No new bypass surface. |
| `docs/FOUNDATIONS.md` §Story Bundles §5b (Schema-Minimalism At Story Scope) | aligns | The 3 new fields each have closed-enum constraints. Every field has named §5b-class consumers: the 12 refactored validators (8 introduction-grounding + 3 plan-relation + 1 non-propagation) are validation gates + replay primitives + predicate-input sources. No speculative fields added. Future vocabulary extensions deferred under the same named-consumer discipline used by SPEC-47 §Out of Scope items 1-2. |
| `docs/FOUNDATIONS.md` §Story Bundles §5c (Present Causal State, Not Narrative Shape) | aligns | The structured fields preserve the existing trigger vocabularies verbatim — event-shape anchors (`deadline_declared`, `tactical_approach_committed`, etc.), not narrative-shape framings (no `setup_for_midpoint`, no `climax_planted`). |
| `docs/FOUNDATIONS.md` Rule 4 (No Globalization by Accident) | aligns | Story-scope. Structured fields are local to each SE record; no cross-bundle visibility added. |
| `docs/FOUNDATIONS.md` Rule 6 (No Silent Retcons) | N/A under clean-break design | No SE records are rewritten. The "no production stories" constraint eliminates the migration that would have tensioned this rule. Documented here defensively because a reader familiar with worldloom's standard "no-mandatory-migration" discipline would reasonably expect Rule 6 to be engaged. |
| `docs/FOUNDATIONS.md` Rule 7 (Preserve Mystery Deliberately) | aligns | The `introduction-observer-firewall.ts` validator continues to enforce observer-firewall semantics — refactored to read structured fields directly; no semantics change. |
| `docs/FOUNDATIONS.md` §Story Bundles §6b (Information / Observer Firewall) | aligns | Same surface as Rule 7. The structured `record_introductions[].evidence[]` and `distinct_from[]` arrays continue to enable observer-firewall validators to operate; refactor is mechanical. |

## Out of Scope

The following items are **explicitly out of scope** for SPEC-48 and routed as named below:

1. **Migration tooling for existing bundles.** No migration tool, no `migration_attestation` op, no in-place rewriting of existing SE records. Premise: no production stories exist. Clean-break design.
2. **Co-existence window between tag grammar and structured fields.** Not supported. Validators consume structured fields only; tag-syntax in `world_logic_rationale` is treated as inert prose (no parsing, no rejection — pure prose).
3. **Closed-vocabulary expansion** (new class in `record_introductions[].class`, new trigger in a per-class vocabulary, new relation in `state_relations[].relation`, new reason in `non_propagation_facts[].reason`) — deferred to follow-up specs under the same named-§5b-class-consumer discipline as SPEC-47 §Out of Scope items 1-2.
4. **Priority 2 packet specs** (present-causal-situation, dramatic-irony, reader-expectation/payoff, social-pressure, branch-possibility-space, pressure-texture, `get_page_render_packet`) — these are deferred per the routing recommendation in `docs/plans/2026-05-19-spec47-followup-routing.md`. Each is its own brainstorm + spec when authoring-evidence trigger fires.
5. **`state_relations[].relation` domain expansion beyond plan-related relations.** The 7-value enum currently captures plan-related relations (`advances`/`tests`/`blocks`/`revises`/`fulfills`/`abandons`/`ignores`). If a future spec introduces a new SE-to-record relation domain (e.g., scene-relation, payoff-relation), it adds new enum values under §Out of Scope item 3's discipline.
6. **Rewriting `world_logic_rationale`'s prose discipline beyond the "no structured content" rule.** Free-form prose quality, length norms, voice — out of scope; the spec adds one discipline (no parseable tags) and leaves the rest to the existing skill prose.
7. **Schema-driven autocomplete or LLM-prompt tooling for the structured fields.** Useful future work; out of scope for this spec.
8. **Audit / health-audit additions** that consume the structured fields for new checks (e.g., "high-evidence introductions correlate with prose density"). Out of scope; existing audit checks are preserved with semantics unchanged.

---

## Deliverables

Per-phase deliverables that will be decomposed into implementation tickets by a subsequent `spec-to-tickets` invocation:

### Phase A: Schemas, structured field definitions, contract rewrite

- D-A1: Extend `tools/validators/src/schemas/story-event.schema.json` with `record_introductions[]` field per the §A schema specification (8-value class enum, per-class trigger `oneOf`, RECORD_ID patterns on `record_id` / `evidence[*]` / `distinct_from[*]`, exact duplicate object rejection via JSON Schema `uniqueItems`). Keyed `record_id` uniqueness is enforced by SPEC48SESTRINT-014.
- D-A2: Extend the same schema with `state_relations[]` field (7-value relation enum, RECORD_ID pattern on `target_record`).
- D-A3: Extend the same schema with `non_propagation_facts[]` field. Closed reason enum migrated verbatim from `non-propagation-tag-shape.ts:9-14` — the 5 values are `no_witness | witness_incapacitated | evidence_concealed | institution_suppresses_report | event_leaves_no_accessible_trace`. RECORD_ID pattern on `records[*]`. `group` is a free-form string label (no closed enum; see `non-propagation-tag-shape.ts:85` regex group pattern `[^,()[\]\s]+`).
- D-A4: Update `.claude/skills/_shared-templates/story-record-schemas.md` SE entry: document the three new fields, the closed enums, and one worked YAML example per field.
- D-A5: Rewrite `.claude/skills/_shared-templates/story-state-contract.md` §5a from tag-grammar specification to structured-field specification. The 8 per-class trigger tables move verbatim under the structured-field schema. `plan_relation:` pattern documentation moves to a §5a-`state_relations` sub-section. `non_propagation:` pattern documentation moves to a §5a-`non_propagation_facts` sub-section. Closed-regex specifications deleted (JSON-schema is the source of truth).
- D-A6: Add prose-field-discipline statement to §5a: "`SE.world_logic_rationale` is prose-only. Validators MUST NOT parse `world_logic_rationale` for structural facts."
- D-A7: Verify patch-engine `STORY_RECORD_SPECS` for SE — confirm the three new fields are structurally allowed at `create_se_record` op time. No code change expected if the SE op is schema-driven; explicit verification ticket.

### Phase B: Validator refactor

- D-B1: Refactor 8 introduction-grounding validators (6 per-class — clock / entity-pairing / relationship / secret / story-question / thread — + 1 unified `midstory-record-introduction-grounding.ts` + 1 cross-class `introduction-observer-firewall.ts`) to consume `SE.record_introductions[]` directly via the new typed reader. Per-validator: drop parser-call site, add structured-field-read site, preserve every existing positive and negative test case (same inputs expressed structurally, same outputs). Note: `midstory-record-introduction-grounding.ts:2` currently imports `extractIntroTags` directly from `@worldloom/world-index/parse/intro-tag-parser` (cross-package import to the soon-deleted module); the refactor must retarget this import to the structured-field reader at `tools/validators/src/structural/midstory-introduction-utils.ts`.
- D-B2: Refactor 3 plan-relation consumers (`stplan-event-plan-relation-consistency.ts`, `stplan-closure-status-requires-closure-event.ts`, `stemo-agency-effect-compatibility.ts`) to consume `SE.state_relations[]` directly.
- D-B3: Refactor `expected-witness-coverage.ts` to consume `SE.non_propagation_facts[]` directly; drop regex-extract pass at line 34.
- D-B4: Refactor `tools/validators/src/structural/midstory-introduction-utils.ts`: drop parser re-exports; keep per-class trigger constants as TypeScript exports (for D-T6 schema-parity test); expose typed reader `readSeIntroductions(event: StoryEvent): ParsedIntroduction[]` and matching readers for `state_relations[]` / `non_propagation_facts[]`.
- D-B5: Refactor `tools/validators/src/structural/stplan-utils.ts`: drop `PLAN_CLOSURE_RELATION` and `PLAN_ADVANCES_RELATION` regex constants; expose typed reader.
- D-B6: Refactor `tools/validators/src/structural/stemo-utils.ts`: drop the `rationale.includes(...)` shortcut function at line 322; replace with typed reader.
- D-B7: Replace `tools/validators/src/structural/non-propagation-tag-shape.ts` with a thin `non_propagation_facts_completeness` structural validator preserving the required-when-cited semantics of the deleted validator.

### Phase C: Parser deletion and CI gates

- D-C1: Delete `tools/world-index/src/parse/intro-tag-parser.ts`.
- D-C2: Delete the old `tools/validators/src/structural/non-propagation-tag-shape.ts` (replaced by the D-B7 validator).
- D-C3: Add CI gate `tools/validators/src/structural/__tests__/parser-deletion-completeness.test.ts` — static-analysis test asserting no source file imports from the deleted parser paths.
- D-C4: Add CI gate `tools/validators/src/structural/__tests__/skill-prose-tag-syntax-absence.test.ts` — grep test over `.claude/skills/**/*.md` asserting no occurrence of the closed deprecated-pattern substring list (D8).

### Phase D: World-index and MCP refactor

- D-D1: Refactor `tools/world-index/src/parse/atomic.ts` — verified consumer at line 10 (`import { extractIntroTags } from "./intro-tag-parser.js"`) and line 971 (`for (const tag of extractIntroTags(stringField(record, "world_logic_rationale") ?? "")) { ... }` inside `edgesForStoryEvent`). Replace the parser invocation with a read over `SE.record_introductions[]` to emit the equivalent introduction-derived edges; remove the parser import.
- D-D2: Audit `tools/world-mcp/src/context-packet/story-bundle-context.ts` for any builder that reads parsed tags; refactor.
- D-D3: Update `tools/world-mcp/src/tools/describe-capabilities.ts` to reference the three new SE fields if it currently references the tag grammar.
- D-D4: Update `docs/CONTEXT-PACKET-CONTRACT.md` if it documents tag-grammar provenance; replace with structured-field references.

### Phase E: Skill prose update + cross-phase integration

- D-E1: Update SE-authoring examples in all 7 story-pipeline `SKILL.md` files (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, `story-promotion-closeout`): replace every tag-syntax occurrence with structured-field shape; rewrite skill-discipline statements that reference "parseable tag in `world_logic_rationale`."
- D-E1.5: Update `.claude/skills/_shared-templates/da-authoring-reference.md` line 157 — replace the `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` syntax example with the structured-field equivalent (`SE.non_propagation_facts[]` entry: `{reason: event_leaves_no_accessible_trace, group: <label>, records: [DA-<N>]}`). This shared template is read by `diegetic-artifact-generation` and the story-bundle DA workflow; leaving deprecated grammar here defeats the migration goal.
- D-E2: Update `docs/MACHINE-FACING-LAYER.md` if it documents the tag-grammar parser surface.
- D-E3: Cross-phase integration test: bootstrap a representative fixture bundle with seeded structured-field SE records exercising all three new fields; run turn-cycle, prose-attach, and health-audit; assert all 8 hard gates pass; assert schema rejects malformed structured fields (trigger-class mismatch, duplicate `record_id` in same SE, malformed RECORD_ID); assert the D-C3 CI parser-deletion gate fires green; assert the D-C4 skill-prose tag-absence gate fires green.

---

## Risks & Open Questions

- **R-1: An additional parser consumer surfaces during implementation beyond the known set.** Verified consumers at reassessment time: `tools/world-index/src/parse/atomic.ts:10,971` (D-D1); `tools/validators/src/structural/midstory-record-introduction-grounding.ts:2,78` (cross-package import, covered by D-B1); the 11 validators in Phase B; the parser's own re-exports through `midstory-introduction-utils.ts`. **Mitigation**: the D-C3 parser-deletion CI gate is the definitive check — if any consumer was missed at audit time, the gate fires on the first build after parser deletion and the consumer is flagged for refactor before the spec lands. If the consumer is non-trivial, the Phase D / Phase B ticket expands; the deletion still lands in the same spec.
- **R-2: A trigger vocabulary is incorrectly migrated.** The 8 per-class vocabularies + 7 relation enum + non-propagation reason enum must transit verbatim from parser constants to JSON-schema enums. **Mitigation**: D-T6 schema-vs-vocabulary parity test asserts the schema enums match the TypeScript constants exported from `midstory-introduction-utils.ts` post-refactor.
- **R-3: `world_logic_rationale` accidentally contains tag-like prose that downstream consumers misinterpret.** Edge case E5: under the clean-break design, no parser runs on `world_logic_rationale`, so accidental tag-like substrings are inert prose. **Mitigation**: explicit §5a prose-field-discipline statement (D-A6); test case in D-E3 fixture bundle includes a `world_logic_rationale` containing the substring `intro:` to confirm inertness.
- **R-4: Skill prose contains tag-syntax in non-obvious places.** D-E1's grep-and-replace pass must catch every occurrence; partial replacement leaves drift surface. **Mitigation**: D-C4 CI gate detects missed sites post-implementation; the gate is the definitive check, not the grep-and-replace pass.
- **R-5: Patch-engine SE op rejects the new optional fields.** D-A7's verification ticket exists exactly to catch this. **Mitigation**: if patch-engine `STORY_RECORD_SPECS` requires explicit field allow-listing, D-A7 expands to update the spec list.
- **R-6: A reader-of-the-future treats the deprecated tag grammar as still-supported because old commit history mentions it.** **Mitigation**: D-A5 contract rewrite + D-C4 CI gate are the discoverable signals. The contract is the authoritative source.

---

## Test Plan

Test cases that the implementation must satisfy. Numbered for traceability with deliverables.

- **T-1: Schema validation — `record_introductions[]` happy path.** A valid record-introduction shape passes schema validation.
- **T-2: Schema validation — class-trigger mismatch rejection.** `class: CLK` paired with a STPLAN trigger (`tactical_approach_committed`) rejects at schema validation with a per-class `oneOf` failure message.
- **T-3: Structured validation — duplicate `record_id` rejection.** Identical duplicate `record_introductions[]` objects reject via JSON Schema `uniqueItems`; duplicate `record_id` entries with differing fields reject through the SPEC48SESTRINT-014 validator/typed-reader layer.
- **T-4: Schema validation — malformed RECORD_ID rejection.** `record_id: "foo"` rejects via RECORD_ID pattern.
- **T-5: Validator refactor regression — all 12 refactored validators.** Every existing positive and negative test case in `tools/validators/src/structural/__tests__/` for the refactored validators (8 introduction-grounding + 3 plan-relation + 1 non-propagation) continues to pass with the same input semantics (now structurally expressed) and the same output (PASS / FAIL with same error messages, including the rewritten `suggested_fix` strings per M2).
- **T-6: Schema-vs-vocabulary parity.** Per-class trigger enums in `story-event.schema.json` match the TypeScript exports `MIDSTORY_TRIGGERS_CLK` … `MIDSTORY_TRIGGERS_STEMO` from `midstory-introduction-utils.ts` post-refactor; parity check is a unit test that compares the two sets and fails on divergence.
- **T-7: Parser-deletion completeness.** Static-analysis test asserts no source file under `tools/` or `.claude/skills/` or `docs/` imports from `tools/world-index/src/parse/intro-tag-parser` (or any sibling path). Fails build if any reintroduction occurs.
- **T-8: Skill-prose tag-syntax absence.** Grep test over `.claude/skills/**/*.md` asserts no occurrence of the closed deprecated-pattern substring list. Fails build on any drift.
- **T-9: Integration — bundle bootstrap + turn-cycle.** Fixture bundle bootstrapped with structured-field SE records covering all three new fields. Turn-cycle adds a new SE with `record_introductions[]` introducing a CLK + `state_relations[]` advancing an STPLAN + `non_propagation_facts[]` asserting non-propagation. All 8 hard gates pass; snapshot replay equality holds.
- **T-10: Integration — `world_logic_rationale` containing tag-like substrings is inert.** SE created with `world_logic_rationale: "Mara wonders if the intro: section will resolve."` (substring `intro:` appears in prose). No parser runs; SE validates successfully; no downstream consumer mis-attributes structural meaning to the prose.
- **T-11: `non_propagation_facts_completeness` validator preserves D-B7 semantics.** Required-when-cited check from the deleted `non-propagation-tag-shape.ts` continues to fire with the same conditions and the same failure messages.

---

## Outcome

After SPEC-48 ships:

- `SE` records carry their causal WHAT in three first-class structured fields and their human-readable WHY in prose-only `world_logic_rationale`.
- The parser file is deleted; the parser surface is gone.
- 12 validators read typed fields directly; the shared utility module is a thin reader, not a parser.
- The `.claude/skills/_shared-templates/story-state-contract.md` §5a documents structured-field schema, not tag grammar.
- All 7 story-pipeline SKILL.md files author SE records in the structured form.
- Two CI gates (parser-deletion-completeness, skill-prose-tag-syntax-absence) prevent regression.
- Future mid-story class additions (new triggers, new relations, new reasons) extend JSON-schema enums under the named-§5b-class-consumer discipline — no parser regex extension.
- Priority 2 packet specs (present-causal-situation, dramatic-irony, etc.) become unblocked: each can be drafted against the structured representation per the routing recommendation in `docs/plans/2026-05-19-spec47-followup-routing.md`.
