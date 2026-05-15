<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-29: Legacy Tools-Layer Vocabulary Cleanup

**Status**: IN PROGRESS — produced 2026-05-15; decomposed into completed `archive/tickets/SPEC29LEGTOOVOC-001.md` plus active `tickets/SPEC29LEGTOOVOC-002.md` through `tickets/SPEC29LEGTOOVOC-005.md`.
**Supersedes**: the "retain as independent storylet/arc vocabulary metadata" rationale from `archive/tickets/SCAUD-003-tighten-json-validator-schemas.md` lines 162 / 246 (Deviation note: "`get_canonical_vocabulary` still exposes `commitment_class` and `commitment_family`; reassessment found they are independent storylet/arc vocabulary metadata"). Codebase recon (2026-05-15) confirmed zero live skill consumers for any of the retained classes — the SCAUD-003 deviation was speculative retention.
**Source**: SPEC-28 follow-up 1 — `docs/triage/2026-05-15-story-related-improvements-triage.md` §"Follow-ups identified (not actioned)" bullet 1. Originally framed by the third-iteration external report (`reports/story-related-improvements-third-iteration.md` P0.10) as "purge legacy ARC vocabulary"; SPEC-28's triage rejected the P0.10 framing because the live story skills and `story-state-contract.md` were already clean (greenfield rebuild), but the tools-layer residue remained and SPEC-28 deferred it as an out-of-report finding. SPEC-29 actions the deferred work.

**Implementation Note (2026-05-15)**: `archive/tickets/SPEC29LEGTOOVOC-001.md` completed D1 plus the same-seam producer registry cleanup in `tools/world-index/src/public/canonical-vocabularies.ts` and focused test residue cleanup in `tools/world-index`, `tools/world-mcp`, and `tools/validators`. Remaining D2-D5 surfaces stay owned by active `SPEC29LEGTOOVOC-002` through `SPEC29LEGTOOVOC-005` tickets; older broad-scope prose below remains historical planning context until those tickets land.

## Problem Statement

The greenfield rebuild of the seven story-pipeline skills (per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`) purged the SPEC-22-era scene-commitment-arc vocabulary (`arc_archetype`, `narrative_point`, `commitment_family`, `commitment_class`, `strong_axis`, `strong_outcome`, `stop_predicate`, `arc_trace_record`) from the skill layer and `story-state-contract.md`. The tools layer was not migrated in lockstep, and `archive/tickets/SCAUD-003-tighten-json-validator-schemas.md` explicitly retained the `get_canonical_vocabulary` surface on the rationale that the retired classes were "independent vocabulary metadata for storylet/arc surfaces."

Codebase recon on 2026-05-15 verified that rationale is **operationally false**:

1. **No live skill consumes any of the retained classes via `get_canonical_vocabulary`.** Confirmed empty — `grep -rnE "get_canonical_vocabulary.*commitment_family|get_canonical_vocabulary.*commitment_class|get_canonical_vocabulary.*arc_archetype|get_canonical_vocabulary.*narrative_point" .claude/skills/` returns zero hits.
2. **The "storylet surface" SCAUD-003 named uses different vocabulary.** `story-state-contract.md` §4.4 SLT schema requires `move_family` (16 closed values), NOT `commitment_family` or `commitment_class`. `tools/validators/src/schemas/story-storylet.schema.json` requires `move_family`; `commitment_*` are absent.
3. **The "arc surface" is itself legacy.** `tools/world-mcp/tests/integration/spec22-capstone.test.ts`'s first test is `"greenfield story contract rejects legacy ARC_TRACE create ops before patch submission"` — the arc system is what current tests assert the new contracts reject, not a live consumer.
4. **The legacy-rejection fixture is a negative test.** `tools/validators/tests/fixtures/story-storylet-complete.yaml` carries `commitment_class: offer_practical_help` only because it is the input to `record-schema-compliance-arc.test.ts`'s `record_schema_compliance rejects legacy v2 scene-commitment storylets` assertion — it proves the new schema rejects the legacy field, not that the legacy field is in use.
5. **`strong_axis`, `strong_outcome`, `stop_predicate` are pure orphans.** Each appears only in `tools/world-mcp/src/tools/get-canonical-vocabulary.ts`; zero live consumers in any skill or tools/src file.

All seven retained classes are now legacy. They linger in `tools/` because the greenfield rebuild's tools-layer migration was incomplete; SCAUD-003 inherited the assumption that "some storylet/arc surface" consumed them without verifying which surface.

### Key design decisions

- **Considered retiring vocabulary classes piecemeal (retain `commitment_family` / `commitment_class` because SCAUD-003 named them, retire the others); chose to retire all seven uniformly** because the criterion is identical for each (zero live skill consumers, verified by grep) and piecemeal retention re-creates the SCAUD-003 ambiguity for the next reader.
- **Considered keeping the legacy-rejection regression tests (`record-schema-compliance-arc.test.ts`, `spec22-capstone.test.ts`, the `arc_trace_record` rejection in `create-bel-record.test.ts`) as forward sentinels; chose to retire them** because the JSON schemas' `additionalProperties: false` posture already structurally rejects unknown fields generically — the named-token rejection tests are reverse coupling to a vocabulary the cleanup is trying to forget. Once the named tokens are gone from `get_canonical_vocabulary`, the legacy-rejection tests cannot regress in a meaningful way (no schema accepts the tokens; no skill produces them).
- **Considered retiring the `arc_contract` / `dramatic_unit` / `execution_envelope` / `record_version` / `effect_model` / `stop_policy` prohibition text in `story-state-contract.md` §4.4; chose to KEEP it.** *(structural)* FOUNDATIONS §Story Bundles §5a explicitly cites these as forbidden ("The schema ... explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminators above `1`, and `shape:` discriminators"). The prohibition IS the design contract, not legacy residue — it documents the boundary the rebuild established. Distinct from the retired vocabulary surface above: those are *exposed* classes that nothing consumes; the prohibition text *documents the rejection* that the design rests on.
- **Considered keeping `arc_trace_record` in `list-records.ts` as a read surface for hypothetical legacy records; chose to retire it.** Verified zero `arc_trace_record` records exist anywhere in the repository (`worlds/*/`, fixtures, archives). A read surface for records that cannot exist is dead code; retaining it costs maintenance attention without benefit.

## Approach

Mechanical cleanup, no behavior change to live skill flows. Organized by surface:

### 1. Retire 7 orphan classes from `get_canonical_vocabulary`

In `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (lines 183–205), remove the `case` clauses for `commitment_family`, `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`. The endpoint returns an error for retired classes (the existing default-case error path already handles this — verify before removing).

### 2. Retire `arc_trace_record` from `list-records.ts`

In `tools/world-mcp/src/tools/list-records.ts`, drop `arc_trace_record` from the supported record types (and any mapping it has to a node-type constant). Zero records exist, so no data migration is needed.

### 3. Update consumer tests in `tools/world-mcp/tests/tools/`

- `get-canonical-vocabulary.test.ts` — drop test cases for retired classes; keep the structure for the remaining classes.
- `get-record-schema.test.ts` — drop assertions about retired CHC schema properties that SCAUD-003 already removed (those assertions become tautological once the schema no longer mentions them).
- `list-records.story-bundle.test.ts` — drop `arc_trace_record` from any supported-type assertion.
- `validate-patch-plan.test.ts` — drop `narrative_point` and any `arc_trace_record` references.

### 4. Retire legacy-rejection regression tests

- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts` — delete the file. The rejection it asserted (`additionalProperties` on legacy storylet fields) is structurally guaranteed by `story-storylet.schema.json`'s `additionalProperties: false` posture; no named-token coverage is lost in a meaningful sense.
- `tools/validators/tests/fixtures/story-storylet-complete.yaml` — delete the file (it was the input to the test deleted above; no other test consumes it — verify).
- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` — delete the file. Its three tests (greenfield rejection of legacy ARC_TRACE, schema-coverage assertions on the retired ARC nodes, the SPEC-22 fixture-world test) become moot once `arc_trace_record` is gone from `list-records.ts` and the retired schemas are gone from `get-record-schema`.
- `tools/patch-engine/tests/integration/create-bel-record.test.ts` — drop the `create_arc_trace_record is rejected by envelope validation` sub-test. Same rationale: structural rejection by `additionalProperties: false` makes the named-token test redundant.

### 5. Update documented MCP surface

- `docs/MACHINE-FACING-LAYER.md:80` — drop the retired classes (`commitment_family`, `commitment_class`, `arc_archetype`, `narrative_point`, `strong_axis`, `strong_outcome`, `stop_predicate`) and `arc_trace_record` from the `get_canonical_vocabulary` line; remove the prose explanation of retired classes ("`commitment_family` returns the closed 16-family routing layer..." through "`arc_archetype` returns the recommended starter library...").
- `tools/world-mcp/README.md` — drop retired classes from the vocabulary list; drop `arc_trace_record` from any supported-record-type table.
- `tools/world-index/README.md` — drop retired classes from any documented vocabulary surface; verify whether the indexer references `arc_trace_record` and remove if so.

### 6. Preserve `story-state-contract.md` §4.4 prohibition text

No edit to `.claude/skills/_shared-templates/story-state-contract.md` §4.4. The line "No `target_or_action_family` singular field, `choice_contract`, `choice_worthiness`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity`, `likely_effects`, `record_version`, `strategy_cluster`, `emitted_at_branch`, or `emitted_by_page` fields" and the §5a prohibition list (`arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version`, `shape:`) are FOUNDATIONS §Story Bundles §5a's design contract — retained.

## Deliverables

| ID | Deliverable | Primary surfaces |
|---|---|---|
| D1 | Retire 7 orphan classes from `get_canonical_vocabulary` | `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` |
| D2 | Retire `arc_trace_record` from `list-records.ts` | `tools/world-mcp/src/tools/list-records.ts` |
| D3 | Update consumer tests in `tools/world-mcp/tests/tools/` | `get-canonical-vocabulary.test.ts`, `get-record-schema.test.ts`, `list-records.story-bundle.test.ts`, `validate-patch-plan.test.ts` |
| D4 | Retire legacy-rejection regression tests | `tools/validators/tests/structural/record-schema-compliance-arc.test.ts`, `tools/validators/tests/fixtures/story-storylet-complete.yaml`, `tools/world-mcp/tests/integration/spec22-capstone.test.ts`, `tools/patch-engine/tests/integration/create-bel-record.test.ts` (sub-test only) |
| D5 | Update documented MCP surface | `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, `tools/world-index/README.md` |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Story Bundles §5a — Commitment Blocks Are Causal Moves | aligns (preserves) | The §4.4 / §5a prohibition text remains untouched; SPEC-29's cleanup retires *exposed orphan vocabulary*, not the contract that documents what the schema forbids. The two surfaces are operationally distinct: a `case "arc_archetype"` in `get_canonical_vocabulary` serves a label list to no one; the §5a prohibition text governs what the SLT schema rejects. |
| Story Bundles §5b — Schema-Minimalism At Story Scope | aligns | The vocabulary-class registry in `get-canonical-vocabulary.ts` is the §5b principle applied to the MCP surface: every exposed class must be load-bearing (consumed by at least one skill). Retiring zero-consumer classes brings the registry into §5b compliance for the surface it governs. |
| Story Bundles §7 — Story-Pipeline Skill Category | aligns | The seven story-pipeline skills (FOUNDATIONS §7) do not consume any of the retired classes — verified by grep. No skill-side migration is needed; the cleanup is tools-side only. |

## Verification

- **D1**: `grep -nE "case \"(commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate)\"" tools/world-mcp/src/tools/get-canonical-vocabulary.ts` returns no hits; the file's remaining `case` branches cover the still-live vocabulary classes (`domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `mystery_reserve_effect`, `revision_difficulty`, `cf_type`).
- **D2**: `grep -n "arc_trace_record" tools/world-mcp/src/tools/list-records.ts` returns no hits; the supported-record-type list does not include `arc_trace_record`.
- **D3**: `npm --prefix tools/world-mcp test` — the `tools/world-mcp` test lane passes with the retired-class assertions removed.
- **D4**: the four retired test files / sub-tests are gone or modified; `npm --prefix tools/validators test` and `npm --prefix tools/patch-engine test` (or equivalent test commands; verify at ticket time) pass.
- **D5**: `grep -nE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record" docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-index/README.md` returns no hits.
- Cross-surface guard: `grep -rnE "commitment_family|commitment_class|arc_archetype|narrative_point|strong_axis|strong_outcome|stop_predicate|arc_trace_record" tools/ docs/ .claude/skills/` returns hits only in (a) `story-state-contract.md` §4.4 / §5a prohibition text (retained), (b) `archive/` files (historical record), (c) `docs/triage/` files (historical record). No live `tools/src/` or `.claude/skills/` hits.

## Out of Scope

- **The SPEC-22 ARC system at the conceptual level.** SPEC-29 retires the TOOLS-LAYER vocabulary surface that exposed the ARC tokens; it does NOT retire the FOUNDATIONS §5a prohibition that documents the design's rejection of arc-contract / dramatic-unit semantics. Those prohibitions are load-bearing design contract.
- **Hostile test-fixture suite (SPEC-28 follow-up 3).** Deferred indefinitely per the SPEC-28 triage file's 2026-05-15 revision — the load-bearing assertions require skill runs which are not cost-justified at zero-production-bundles posture; structural invariants are already enforced by the validator lane on every bundle.
- **CF-schema-level `direct_user_approval` redesign (SPEC-28 follow-up 2).** Resolved via `archive/tickets/FOUNDATIONS-005.md`.
- **Migration of existing data.** Zero `arc_trace_record` records, zero `commitment_class` SLT records, zero `strong_axis` references exist anywhere — there is no data to migrate.
- **Public versioning / deprecation notice.** Worldloom is single-user pre-production; the MCP surface has no external consumers requiring a deprecation cycle.
- **Ticket decomposition and implementation.** SPEC-29 amends contracts and prose; the implementation tickets are produced by a separate decomposition step (`/spec-to-tickets`).

## Risks & Open Questions

- **MCP-surface public-behavior change.** `get_canonical_vocabulary` will return an error (or whatever the default-case path produces) for the seven retired classes after SPEC-29 lands. *(pragmatic — would warrant a deprecation cycle in a multi-consumer system)* Worldloom is single-user pre-production with no external MCP consumers, so the change is safe to land in one step; flag if a future consumer scenario emerges.
- **`spec22-capstone.test.ts` may carry test infrastructure (fixture-world setup, helper imports) that other tests depend on.** Verify at ticket time before deleting wholesale — extract reusable helpers to `tests/_helpers/` if so.
- **`docs/MACHINE-FACING-LAYER.md` is read by the meta-tooling layer.** Confirm at ticket time that the file's read pattern is just-prose (no machine consumer parses the vocabulary-class list); if a machine consumer exists, it must be updated in lockstep with D5.
- **Cross-pollination with `story-state-contract.md` §4.4 prohibition text.** D4's deletion of `record-schema-compliance-arc.test.ts` removes the test that exercised the prohibition. Confirm at ticket time that some other test (e.g., `record-schema-compliance.test.ts` or `contract-schema-roundtrip.test.ts`) provides equivalent generic `additionalProperties: false` coverage, so the prohibition remains test-backed even after the named-token test retires.
