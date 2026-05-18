# SPEC42STOSTADEB-003: STQ story question — class foundation + §5c discipline statement

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds new story-bundle record class `STQ` (Story Question / Open Setup) end-to-end across `tools/world-index/`, `tools/world-mcp/`, `tools/patch-engine/`, `tools/validators/`, and the canonical story state contract; introduces two new custom patch-engine ops (`answer_story_question`, `abandon_story_question`); extends `record_schema_compliance` validator with §5c prohibited-field HARD-REJECT enforcement (the structural defense against re-introducing the rejected scene-commitment-arc encoding); no impact on existing record classes
**Deps**: None

## Problem

Worldloom's story-bundle pipeline has no record class encoding "this Chekhov's gun is still on the wall" — a present-causal claim about an introduced element that licenses certain future state transitions. `THR` is the closest existing class but conflates active narrative tension with open-setup tracking and lacks the typed setup→payoff link needed for terminal-debt validation. SPEC-42 introduces `STQ` to fill this gap — with explicit **§5c discipline** enforcement to prevent the schema from drifting into "future dramatic obligation" encoding (the failure mode that motivated rolling back archived SPEC-19 through SPEC-22 scene-commitment-arc work, and the consequence of which is the §4a / §5a / §5c additions to FOUNDATIONS). This ticket is the class's machine-layer foundation, including the `record_schema_compliance` HARD-REJECT extension that structurally enforces the §5c discipline by rejecting any STQ record carrying a prohibited field (`expected_payoff_mode`, `kind: moral_question`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`, `holders[]`).

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified during implementation (2026-05-17): all spec-cited foundation files exist; `tools/validators/src/structural/record-schema-compliance.ts` verified present (this ticket extends it); existing CLK/STSEC class foundations are the live parity baseline; archived SPEC-19 through SPEC-22 (scene-commitment-arc) verified at `archive/specs/SPEC-19-scene-commitment-arc-schema.md` through `archive/specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (all rolled back; their `arc_contract` / `dramatic_unit` / `execution_envelope` / `ARC_TRACE` patterns are structurally forbidden by current `.claude/skills/_shared-templates/story-state-contract.md` §5a).
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §C (STQ schema, 13 fields), §C §5c discipline statement (load-bearing — enumerates prohibited fields), §D (active_records extension), §E Phase 3 (STQ ships last because it carries highest §5c risk); ChatGPT-Pro proposal at `reports/new-narrative-features-first-iteration.md` §Feature 1 (STQ source) with the reduced-scope `expected_payoff_mode` removal documented in SPEC-42 §Key design decisions (the 7-value enum is structurally analogous to rejected archived-SPEC-19 `allowed_outcome_band`).
3. Cross-skill / cross-tool shared boundary: same five machine-layer registration sites as CLK/STSEC; plus the **`record_schema_compliance` validator** at `tools/validators/src/structural/record-schema-compliance.ts` is the structural-defense surface where the §5c prohibited-field HARD-REJECT lives. This validator already runs against every story-bundle record at engine pre-apply; extending it with STQ-specific HARD-REJECTs preserves the validator's role as the single canonical structural-compliance gate. Live contract split correction: the schema detail no longer lives inline in `.claude/skills/_shared-templates/story-state-contract.md` §4; §4 now points to `.claude/skills/_shared-templates/story-record-schemas.md`, so this ticket updates `story-state-contract.md` only for §3 inventory / §4 pointer counts and puts the STQ schema body in `story-record-schemas.md`.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) + §5b (Schema-Minimalism) motivate this ticket. §5c: STQ tracks PRESENT open-setup state ("what setups are currently open, what state do they license, what would close them") — not FUTURE dramatic obligation ("are we before or after the midpoint, what shape should the eventual payoff take, what arc position are we at"). The prohibited-field list IS the discipline; without HARD-REJECT enforcement, authoring patterns will naturally drift toward narrative-shape framing (SPEC-42 §Risks explicitly flags this slippage temptation). §5b: 13-field schema is tight (`id`, `story_id`, `created_at_page`, `supersedes`, `setup_kind`, `question_or_setup`, `salience`, `audience_visibility`, `source_event`, `source_records`, `payoff_of`, `status`, `answer_event`, `answer_records`, `abandonment_rationale` — minus those marked optional). Drops: `expected_payoff_mode` (§5c violation), `kind: moral_question` (authorial/subjective; §5b violation), `character_visibility` (audience-vs-character distinction already covered by `audience_visibility` + `source_records[]` grounding), `holders[]` (re-encodes the same distinction).
5. HARD-GATE engine surfaces touched: `tools/patch-engine/src/envelope/schema.ts` + `tools/patch-engine/src/commit/order.ts` (same as -001 / -002) PLUS `tools/validators/src/structural/record-schema-compliance.ts` (the validator that HARD-REJECTs malformed records at engine pre-apply). The §5c HARD-REJECT extension strengthens the Canon Safety surface (rejects schemas that smuggle narrative-shape encoding into a present-causal class). Mystery Reserve firewall: not directly touched (STQ does not interact with `M-*` records). Hook 3 path-pattern coverage: the new `_source/story-questions/` subdirectory is covered by the existing pattern without modification.
6. Existing output schema extended in TWO places: (a) `tools/validators/src/schemas/story-page.schema.json` — `state_snapshot.active_records[]` enum extended to add `STQ` (co-edit with SPEC42STOSTADEB-001 / -002); (b) the `record_schema_compliance` validator's per-class HARD-REJECT registry extended with STQ-specific prohibited-field rules. Both are additive-only — existing entries and rules unchanged.
7. Validator rename / structural-defense extension: `record_schema_compliance` gains new STQ-specific HARD-REJECT logic. The validator is NOT renamed; the change is an extension of its per-class rule set. Grep pipeline-wide for `record_schema_compliance` shows references in `tools/validators/src/public/registry.ts` (registration), `tools/validators/src/structural/record-schema-compliance.ts` (implementation), test files (per the existing test structure), and downstream skill documentation citing the validator. The extension is internal to the validator's rule-table; no consumer code needs migration.

## Architecture Check

1. **Per-class machine-layer cohesion**: matches SPEC42STOSTADEB-001 / -002 pattern.
2. **No backwards-compatibility shims**: existing bundles without STQ records remain valid.
3. **§5c discipline lives in the schema AND the validator**: the schema's JSON Schema explicitly omits the prohibited fields (so they cannot validate even as optional); the `record_schema_compliance` HARD-REJECT catches the case where someone adds a prohibited field via direct YAML editing (Hook 3 blocks raw Edit, but the HARD-REJECT also fires on any patch-engine op that would smuggle a prohibited field through). The two-layer defense is intentional — schema omission catches authoring-time mistakes; HARD-REJECT catches engine-bypass attempts.
4. **Mirrors the canonical SLT pattern**: same five machine-layer registration sites as CLK/STSEC. The custom ops (`answer_story_question`, `abandon_story_question`) follow the `update_record_field.ts` pattern.
5. **`record_schema_compliance` extension preserves single-canonical-gate property**: extending the existing validator rather than creating a new `stq_prohibited_field_check` validator keeps structural-compliance enforcement in ONE place per record class. Future per-class HARD-REJECTs can follow the same extension pattern.

## Verification Layers

1. STQ schema validates representative record cleanly → schema validation via `npm test --prefix tools/validators`
2. `record_schema_compliance` HARD-REJECTs an STQ record carrying any prohibited field (positive HARD-REJECT for `expected_payoff_mode`, `kind: moral_question`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`, `holders[]`) → validator HARD-REJECT test
3. `_source/story-questions/STQ-1.yaml` file emission survives Hook 3 write-discipline check → engine pre-apply test via `npm test --prefix tools/patch-engine`
4. `mcp__worldloom__allocate_next_id(world_slug, id_class="STQ", story_slug)` returns next integer → MCP retrieval test via `npm test --prefix tools/world-mcp`
5. `answer_story_question` op sets STQ.status = answered, binds answer_event + answer_records → patch-engine op test
6. `abandon_story_question` op sets STQ.status = abandoned, sets abandonment_rationale → patch-engine op test
7. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) alignment → FOUNDATIONS alignment check (the prohibited-field HARD-REJECT is THE structural defense; manual review confirms each prohibited field maps to a §5c clause)

## What to Change

### 1. STQ JSON Schema (new file)

Create `tools/validators/src/schemas/story-question.schema.json` with the 13-field schema per SPEC-42 §C. Required fields: `id`, `story_id`, `created_at_page`, `setup_kind`, `question_or_setup`, `salience`, `audience_visibility`, `source_event`, `source_records`, `status`. Optional fields: `supersedes`, `payoff_of`, `answer_event`, `answer_records`, `abandonment_rationale`. Enum constraints: `setup_kind ∈ {setup, dramatic_question, promise}` (note: `moral_question` excluded per §5c discipline); `salience ∈ {low, medium, high}`; `audience_visibility ∈ {hidden, implied, explicit}`; `status ∈ {open, complicated, answered, paid_off, abandoned, inherited, superseded}`. **The schema MUST use `"additionalProperties": false`** to structurally reject any prohibited field that might be smuggled in. The prohibited-field list is enforced both at JSON Schema validation time (by `additionalProperties: false`) AND at `record_schema_compliance` HARD-REJECT time (per change area 12 below); the two-layer defense is intentional.

### 2. Contract document update — story-state-contract.md

Modify `.claude/skills/_shared-templates/story-state-contract.md` and `.claude/skills/_shared-templates/story-record-schemas.md`:
- `story-state-contract.md` §3 (class catalog): add row `STQ | Story question / open setup — present-causal open-setup state; tracks Chekhov's-gun-style introduced elements with typed setup->payoff link; subject to §5c discipline statement.`
- `story-state-contract.md` §4 pointer text: update the split-template count and SPEC-42 note to include STQ as §4.5.16.
- `story-record-schemas.md` §4.2 (PG.state_snapshot.active_records): add `STQ: [STQ-<integer>]` (co-edit with SPEC42STOSTADEB-001 / -002).
- `story-record-schemas.md`: insert new §4.5.16 (Story Question — STQ) with canonical schema text PLUS the §5c discipline statement reproduced from SPEC-42 §C (the prohibited-field table is load-bearing canonical content — it must live in the contract document, not just in the spec).

### 3. PG state-snapshot schema extension

Modify `tools/validators/src/schemas/story-page.schema.json`: add `STQ` to the `state_snapshot.active_records[]` enum (co-edit with SPEC42STOSTADEB-001 / -002).

### 4. Allocator registration

Modify `tools/world-mcp/src/tools/allocate-next-id.ts:81-102`: add `STQ` row. Subdirectory: `story-questions/`.

### 5. World-index parser registration

Modify `tools/world-index/src/parse/atomic.ts`: register `STQ-<integer>` ID prefix and the `story-questions/` subdirectory.

### 6. Patch-engine OPERATION_KINDS extension

Modify `tools/patch-engine/src/envelope/schema.ts`: add four new operation kinds:
- `create_stq_record` — generic create-story-record handler
- `supersede_stq_record` — generic supersede pattern
- `answer_story_question` — custom op: sets `STQ.status = answered` (or `paid_off`), binds `answer_event` + `answer_records[]`
- `abandon_story_question` — custom op: sets `STQ.status = abandoned`, sets `abandonment_rationale`

### 7. Generic create-story-record class mapping

Modify `tools/patch-engine/src/ops/create-story-record.ts`: register `STQ` in the class-prefix-to-subdirectory mapping.

### 8. Custom op implementations (two new files)

Create `tools/patch-engine/src/ops/answer-story-question.ts`:
- Sets `STQ.status = answered` OR `STQ.status = paid_off` (depending on op argument)
- Binds `STQ.answer_event = SE-<integer>`
- Appends to `STQ.answer_records[]`
- Writes updated STQ record back

Create `tools/patch-engine/src/ops/abandon-story-question.ts`:
- Sets `STQ.status = abandoned`
- Sets `STQ.abandonment_rationale = <string>`
- Writes updated STQ record back

Both follow the existing `update_record_field.ts` pattern.

### 9. Commit-ordering registration

Modify `tools/patch-engine/src/commit/order.ts`: add `STQ` to the per-class commit ordering list.

### 10. Commit temp-file registration

Modify `tools/patch-engine/src/commit/temp-file.ts`: register `STQ` in the per-class temp-file handling.

### 11. Pre-apply ID-allocation race check

Modify `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts`: add `STQ` to the enumeration.

### 12. `record_schema_compliance` HARD-REJECT extension — §5c discipline enforcement

Modify `tools/validators/src/structural/record-schema-compliance.ts` to extend the per-class HARD-REJECT registry with STQ-specific prohibited-field rules. The validator must HARD-REJECT any STQ record carrying any of the following fields, with a clear error message naming the §5c discipline:

| Prohibited field | HARD-REJECT message |
|---|---|
| `expected_payoff_mode` | "STQ records prohibit `expected_payoff_mode` per FOUNDATIONS §Story Bundles §5c — encodes future shape (structurally analogous to rejected `allowed_outcome_band` from archived SPEC-19)." |
| `kind: moral_question` (any STQ with `setup_kind: moral_question`) | "STQ.setup_kind enum prohibits `moral_question` per §5c — authorial/subjective; not validator-readable." |
| `act_position`, `midpoint`, `climax` | "STQ prohibits act-position fields per §5c — engine tracks present causal state, not narrative shape." |
| `dramatic_curve_position`, `tension_arc` | "STQ prohibits dramatic-curve fields per §5c." |
| `expected_chapter`, `scene_sequence` | "STQ prohibits scene-sequence fields per §5a (no `arc_contract`, `dramatic_unit`, `execution_envelope`)." |
| `holders[]` (as a separate field) | "STQ prohibits separate `holders[]` field — audience-vs-character distinction is covered by `audience_visibility` + `source_records[]` grounding." |

The HARD-REJECT runs at engine pre-apply (alongside other `record_schema_compliance` rules). Test fixtures: an STQ with each prohibited field individually + a combined fixture with multiple prohibited fields.

## Files to Touch

- `tools/validators/src/schemas/story-question.schema.json` (new)
- `tools/patch-engine/src/ops/answer-story-question.ts` (new)
- `tools/patch-engine/src/ops/abandon-story-question.ts` (new)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §3 row and §4 pointer/count text)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — §4.2 enum extension and §4.5.16 new STQ sub-section incl. §5c discipline statement; co-edit with SPEC42STOSTADEB-001 / -002)
- `tools/validators/src/schemas/story-page.schema.json` (modify — state_snapshot.active_records enum extension; co-edit)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — STQ class registry row)
- `tools/world-index/src/parse/atomic.ts` (modify — STQ class-prefix + story-questions/ subdirectory registration)
- `tools/patch-engine/src/envelope/schema.ts` (modify — OPERATION_KINDS adds 4 entries)
- `tools/patch-engine/src/ops/create-story-record.ts` (modify — STQ class-prefix mapping)
- `tools/patch-engine/src/commit/order.ts` (modify — STQ class ordering)
- `tools/patch-engine/src/commit/temp-file.ts` (modify — STQ class temp-file handling)
- `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (modify — STQ class registration)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify — adds STQ-specific HARD-REJECT registry for §5c prohibited fields)

## Out of Scope

- STQ validators (`story_question_payoff_integrity`, `story_question_setup_predates_payoff`, `story_question_grounding_integrity`, `story_question_terminal_debt`) — owned by SPEC42STOSTADEB-007
- STQ predicate DSL entries (`story_question_open`, `story_question_status`, `any_story_question_open`, `promise_due`) — owned by SPEC42STOSTADEB-007
- MCP retrieval extensions — owned by `archive/tickets/SPEC42STOSTADEB-004.md`
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- Skill integrations — owned by SPEC42STOSTADEB-009 through -013
- CLK and STSEC class foundations — owned by SPEC42STOSTADEB-001 / -002

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — story-question.schema.json validates representative STQ records (positive: minimal STQ + STQ with payoff_of link; negative: invalid setup_kind including `moral_question`, missing required fields, ANY prohibited field present); `record_schema_compliance` HARD-REJECTs each prohibited field individually with the correct error message
2. `npm test --prefix tools/patch-engine` — `create_stq_record`, `supersede_stq_record`, `answer_story_question`, `abandon_story_question` ops produce correct YAML records
3. `npm test --prefix tools/world-mcp` — `allocate_next_id(id_class="STQ")` returns next STQ integer
4. `npm run build --prefix tools/world-index` — parser builds cleanly

### Invariants

1. STQ records are stored exclusively at `worlds/<slug>/stories/<story-slug>/_source/story-questions/STQ-<integer>.yaml` — Hook 3 enforces engine-only writes
2. §5c discipline is structurally enforced: NO STQ record can persist a prohibited field, whether via direct YAML editing (blocked by Hook 3) or via patch-engine op (HARD-REJECTed by `record_schema_compliance`)
3. `STQ.setup_kind` enum has exactly 3 values: `setup`, `dramatic_question`, `promise` — `moral_question` is rejected at both schema level and validator level
4. No existing record class is altered; existing bundles without STQ records pass all validators with no warnings

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-question.test.ts` (new) — schema-level positive + negative tests plus STQ-specific HARD-REJECT tests covering every prohibited field individually
2. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify — co-edit with SPEC42STOSTADEB-001 / -002) — `state_snapshot.active_records[STQ]` enum entry test
3. `tools/patch-engine/tests/ops/answer-story-question.test.ts` (new) — answer op test
4. `tools/patch-engine/tests/ops/abandon-story-question.test.ts` (new) — abandon op test
5. `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify — co-edit) — `create_stq_record` test
6. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — co-edit) — `id_class="STQ"` test

### Commands

1. `npm test --prefix tools/validators`
2. `npm test --prefix tools/patch-engine`
3. `npm test --prefix tools/world-mcp`
4. `npm run build --prefix tools/world-index`
5. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone

## Outcome (2026-05-17)

Implemented the STQ class foundation across the machine layer and shared story-state contract:

- Added `story-question.schema.json`, registered `story_question_record`, and extended `record_schema_compliance` with STQ-specific HARD-REJECTs for all §5c prohibited fields, including `setup_kind: moral_question`.
- Extended `PG.state_snapshot.active_records` with `STQ`.
- Registered STQ allocation and indexing through `tools/world-mcp`, `tools/world-index`, and patch-engine ID-race checks.
- Added `create_stq_record`, `supersede_stq_record`, `answer_story_question`, and `abandon_story_question` envelope/commit support with focused patch-engine tests.
- Updated `.claude/skills/_shared-templates/story-state-contract.md` for the STQ catalog row and split-template count/pointer, and updated `.claude/skills/_shared-templates/story-record-schemas.md` with the canonical STQ schema plus the §5c discipline table.

## Verification Result (2026-05-17)

Passing:

1. `npm test --prefix tools/validators` — 380 tests passed.
2. `npm test --prefix tools/patch-engine` — 95 tests passed.
3. `npm test --prefix tools/world-mcp` — 392 tests passed.
4. `npm run build --prefix tools/world-index` — TypeScript build passed.

## Deviations / Scope Notes

- The live shared contract is split: `story-state-contract.md` owns the §3 class catalog and §4 pointer/count text, while `story-record-schemas.md` owns the detailed §4.5.16 STQ schema. This ticket was updated before implementation to match that live split.
- Same-seam registration required additional files beyond the initial file list: `tools/validators/src/structural/utils.ts`, `tools/world-mcp/src/server.ts`, `tools/world-mcp/src/tools/describe-envelope-schema.ts`, `tools/patch-engine/src/ops/shared.ts`, and focused tests for the registration/proof surfaces.
- `CLAUDE.md`, cross-class §5 predicate list, and §8 page-plan §10b docs landed in `archive/tickets/SPEC42STOSTADEB-014.md`; the active SPEC-42 deliverables row was also truthed so the retired §6 integration-matrix wording no longer directs future work.
- STQ semantic validators, predicate DSL entries, MCP retrieval, shared validators, and skill integrations remain out of scope and are owned by the later SPEC42STOSTADEB tickets listed above.
