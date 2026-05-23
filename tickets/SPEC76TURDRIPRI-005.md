# SPEC76TURDRIPRI-005: Validator — `page_plan_turn_driver_consistency`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/page-plan-turn-driver-consistency.ts`; new registry entry at `tools/validators/src/public/registry.ts`
**Deps**: SPEC76TURDRIPRI-002

## Problem

Page-plan §7a (introduced by SPEC76TURDRIPRI-002 in the shared contract) is the render-side projection of `SE.turn_driver`. Per FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary), the page plan is a projection of state — not a second state engine — and must be validated for consistency with the SE record that backs it. SPEC-76 §3.6.3 prescribes a new structural validator `page_plan_turn_driver_consistency` that parses page-plan §7a as structured text per the contract amendment in SPEC76TURDRIPRI-002 and confirms the §7a content matches `SE.turn_driver`, that every record in `SE.turn_driver.driver_records[]` appears in §7a's `Driver records:` line, and that an active-pressure disposition table is present whenever the parent PG has ≥1 high-urgency active record.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` currently exports the §16a structured-text parser at lines 161-164 with the validator name `page_plan_stchar_packet_integrity`; the parser is parameterized for reuse (the parsing logic is the shared infrastructure SPEC-73 established). PG record schema at `tools/validators/src/schemas/story-page.schema.json:33-42` defines `PG.input.resolved_event_id` as `string` matching `^SE-(0|[1-9][0-9]*)$`; `PG.state_snapshot.active_records` at lines 50-73 defines per-record-class active-record arrays. Page-plan body is located via the PG record's prose-plan path convention (`pages-prose-plans/PG-<integer>.md`). Verified via reassess-spec Agent 1 + Agent 2 in this session.
2. SPEC-76 §3.6.3 prescribes the validator's severity (`fail`), inputs (`PG, SE (via PG.input.resolved_event_id), page-plan §7a (textual)`), and 4 error codes verbatim: `page_plan_driver_section_missing`, `page_plan_driver_kind_mismatch`, `page_plan_driver_record_omitted`, `page_plan_active_pressure_table_missing`. The validator parses page-plan §7a as structured text per the contract amendment in SPEC76TURDRIPRI-002; the parser is shared with §16a label parsing (already structured per SPEC-73).
3. **Cross-skill / cross-artifact boundary**: this validator consumes (a) PG records, (b) the SE record referenced by `PG.input.resolved_event_id`, (c) the page-plan body at `pages-prose-plans/PG-<integer>.md` containing §7a. The shape under audit is the PG ↔ SE.turn_driver ↔ page-plan §7a triangle: all three must agree on driver kind, initiator, driver_records, response mode, POV visibility. The §7a parser is shared with the existing §16a parser at `page_plan_stchar_packet_integrity.ts`; this ticket's validator reuses the parser infrastructure for the new §7a section.
4. **FOUNDATIONS principle**: §Story Bundles §4a (Plan-Authority Boundary) governs this ticket. Per §4a, "story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine." The §7a section is a render-side projection of `SE.turn_driver`; this validator ensures the projection is faithful — the plan does not become a second state engine by allowing §7a content to drift from the SE record. This is the Rule 1 / Rule 6 grounding for the validator: page-plan §7a cites the SE record's driver shape, and the citation must be byte-correct.
5. **HARD-GATE / Canon Safety Check surface**: this is a new structural validator under `tools/validators/src/structural/`. Per the per-ticket-type granularity rule, item 5 fires because the structural validator gates story-bundle PG record writes at engine pre-apply time. The validator does not weaken any Mystery Reserve firewall — its scope is plan-vs-SE consistency; the firewall remains the domain of `turn_driver_pov_observer_firewall` (SPEC76TURDRIPRI-004).

## Architecture Check

1. **Plan-authority-boundary enforcement via structural validator**: the §7a section is a render-side projection; without this validator, page-plan §7a content could drift from the SE record it claims to render — a Rule 6 (No Silent Retcons) risk at the story-pipeline level. The structural-validator framework is the natural home: receives the world map + commit context, parses page-plan body per the shared §7a parser, cross-references PG/SE/page-plan §7a, emits verdicts. Alternatives considered and rejected: (a) put consistency checking in `branching-story-turn-cycle` SKILL.md at Phase 7 (page plan authoring) — rejected, the SKILL.md is authoring guidance, not engine pre-apply enforcement; the structural validator is the canonical enforcement surface; (b) hand the check to `branching-story-prose-attach` — rejected, prose-attach runs at rendering time, not page-plan-commit time; the firewall must fire before the page-plan is accepted.
2. **No backwards-compatibility aliasing**: the validator emits 4 closed error codes per SPEC-76 §3.6.3; no fallback or "partial-match" tolerance for §7a content drift is introduced.

## Verification Layers

1. **Invariant**: `turn_resolution` event with no §7a section in the page plan → `page_plan_driver_section_missing` verdict → structural validator test with inline-fixture-builder.
2. **Invariant**: §7a `Driver kind:` line ≠ `SE.turn_driver.kind` → `page_plan_driver_kind_mismatch` verdict → structural validator test.
3. **Invariant**: record present in `SE.turn_driver.driver_records[]` but absent from §7a `Driver records:` line → `page_plan_driver_record_omitted` verdict → structural validator test.
4. **Invariant**: parent PG has ≥1 high-urgency active record but no `Active-pressure disposition` table in §7a → `page_plan_active_pressure_table_missing` verdict → structural validator test.
5. **Invariant**: §7a parser shares the SPEC-73-established label-parsing convention used by `page_plan_stchar_packet_integrity` → code-reuse grep confirming the shared parser module/utilities.

## What to Change

### 1. Create the validator module

Create `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` exporting `pagePlanTurnDriverConsistency: Validator` with:

- `name: "page_plan_turn_driver_consistency"`
- `severity: "fail"`
- `appliesTo: <full-world | pre-apply modes>` per existing sibling-validator pattern.
- `run(...)` implementation iterating PG records, locating the corresponding SE via `PG.input.resolved_event_id`, parsing the page-plan body at `pages-prose-plans/PG-<integer>.md` for §7a, and emitting verdicts.

For each PG with a `turn_resolution` SE event:

1. Locate the page-plan body file at `worlds/<slug>/stories/<story-slug>/pages-prose-plans/PG-<integer>.md`.
2. Parse the §7a section using the shared structured-text parser established by SPEC-73 (extend the existing `page_plan_stchar_packet_integrity` parser or factor out a shared utility).
3. If §7a section is absent → emit `page_plan_driver_section_missing`.
4. If §7a `Driver kind:` value ≠ `SE.turn_driver.kind` → emit `page_plan_driver_kind_mismatch`.
5. For each record in `SE.turn_driver.driver_records[]`, verify the id appears in §7a `Driver records:` → emit `page_plan_driver_record_omitted` per missing record.
6. If parent PG's `state_snapshot.active_records` contains ≥1 high-urgency active record AND §7a lacks the `Active-pressure disposition` table → emit `page_plan_active_pressure_table_missing`. (High-urgency classification is per SPEC-76 §3.6.4's high-tier definition; the active-pressure handling validator in SPEC76TURDRIPRI-006 enforces the table's content; THIS validator only checks for the table's presence.)

### 2. Share the §7a parser with §16a

Factor the §7a structured-text parser as a shared utility (e.g., `tools/validators/src/structural/page-plan-section-parser.ts` or co-located helper module) and have both `page_plan_stchar_packet_integrity` (for §16a) and `page_plan_turn_driver_consistency` (for §7a) consume the same parser. The shared parser handles structured key-value-and-table extraction from markdown sections; per SPEC-73's established convention, the parser is permissive about whitespace and label capitalization variants.

### 3. Register the validator

Add to `tools/validators/src/public/registry.ts`:

```typescript
import { pagePlanTurnDriverConsistency } from "../structural/page-plan-turn-driver-consistency.js";
```

Append to `structuralValidators` array alongside the existing sibling registrations.

### 4. Inline-fixture-builder tests

Per SPEC-76 §6.2 and the established convention at `tools/validators/tests/structural/`, add `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` with:

- **Positive cases**: page plan §7a matches SE.turn_driver exactly; active-pressure table present when parent PG has high-urgency records; active-pressure table absent when parent PG has none.
- **Negative cases**:
  - §7a missing entirely → `page_plan_driver_section_missing`.
  - §7a `Driver kind:` ≠ SE.turn_driver.kind → `page_plan_driver_kind_mismatch`.
  - driver record present in SE but omitted from §7a → `page_plan_driver_record_omitted`.
  - parent PG has high-urgency active records but no active-pressure disposition table → `page_plan_active_pressure_table_missing`.

## Files to Touch

- `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` (new)
- `tools/validators/src/structural/page-plan-section-parser.ts` (new — shared §7a / §16a parser utility, OR added as exported helpers within an existing parser module)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify — refactor to consume the shared parser utility)
- `tools/validators/src/public/registry.ts` (modify — single import + single array append)
- `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` (new)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-003.
- Observer-firewall semantics for non-player drivers — ship in SPEC76TURDRIPRI-004.
- Active-pressure handling discipline (enforcement of the table's CONTENT — selected/deferred/rejected dispositions) — ship in SPEC76TURDRIPRI-006. THIS validator only checks the table's PRESENCE.
- `page_plan_stchar_packet_integrity` validator's warn → fail behavior change for unknown §16a labels — covered by the contract amendment in SPEC76TURDRIPRI-002; the validator source-change for that behavior is outside this ticket's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — all tests in `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` pass.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds including the new validator module, the shared §7a/§16a parser utility, and the registry import.
3. The existing `page_plan_stchar_packet_integrity` tests continue to pass after the refactor to consume the shared parser.
4. Red Kiln Ambush canonical fixture (SPEC76TURDRIPRI-011) passes this validator end-to-end — page plan §7a lists Varro's STPLAN-9, STEMO-12, CLK-3, THR-4 matching the SE record.

### Invariants

1. The validator emits exactly one verdict per failure case (no double-reporting, no missing reports).
2. The validator's error codes are closed and exactly match the 4 codes named in SPEC-76 §3.6.3.
3. The §7a parser is shared with §16a parsing (single source of truth for structured-text section extraction).
4. The validator checks §7a PRESENCE + key-match consistency; it delegates §7a CONTENT enforcement (selected/deferred/rejected dispositions on the active-pressure table) to `active_pressure_handling_discipline` (SPEC76TURDRIPRI-006).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` (new) — inline-fixture-builder suite per SPEC-76 §6.2: positive cases + 4 negative cases (one per failure code).

### Commands

1. `cd tools/validators && npm test` — runs the validator package's full test suite including the new structural test file.
2. `cd tools/validators && npm run build` — verifies TypeScript compilation of the new validator module, the shared parser utility, and the registry import.
