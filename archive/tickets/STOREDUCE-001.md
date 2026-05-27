# STOREDUCE-001: Stop appending `## Validation Trace on PG-X` sections to bundle `INDEX.md`

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — skill-prose-only change. `branching-story-bootstrap/SKILL.md`, `branching-story-turn-cycle/SKILL.md`.
**Deps**: None

## Problem

At intake, both `branching-story-bootstrap` and `branching-story-turn-cycle` instructed the LLM to append a `## Validation Trace on PG-<integer>` section to bundle `INDEX.md` on every page commit. The section projected the nine-key `PG.validation_trace` mapping as a multi-row markdown table with per-gate rationale prose.

This projection had **zero programmatic consumers**:

- At intake, `grep -rn "Validation Trace" tools/ docs/ specs/` returned no matches in production code, validators, MCP retrieval, or documentation outside the two skill prose lines that emitted it and unrelated `continuity-audit` template surfaces.
- The authoritative consumer of `PG.validation_trace` is the YAML field on `PG-<integer>.yaml`, which is schema-required (`record_schema_compliance`), shape-validated (`validation_trace_shape_compliance`), included in the canonical-JSON state-hash payload, and replayed by `snapshot_replay_equality`.
- The MCP `story_bundle_context` packet is assembled from indexed `_source/` records — bundle `INDEX.md` markdown is not parsed for state extraction.
- `branching-story-health-audit`'s phases (`Phase 2a` replay events through `Phase 2o` storylet pool coverage) all operate on `_source/` YAML records; no phase parses `## Validation Trace` markdown.

The visible intake cost was bundle-INDEX bloat: `worlds/erotica-world/stories/red-bunny/INDEX.md` lines 307-389 carried six nine-row tables of multi-sentence prose (6 pages × ~80 lines per section), and the file grew by another `## Validation Trace on PG-<integer>` section every turn-cycle invocation. The author also paid LLM authoring time per page to compose the projection table.

The user identified this surface directly as write-only LLM work and asked whether anything processes it. The answer is nothing does.

## Assumption Reassessment (2026-05-27)

1. At intake, `branching-story-bootstrap/SKILL.md` contained the substring `` `## Validation Trace on PG-1` (the latter populated from `PG-1.validation_trace` per the shared eight hard gates) `` in the bullet that enumerated first-run bundle `INDEX.md` sections; this ticket removed that section from the first-run convention.
2. At intake, `branching-story-turn-cycle/SKILL.md` contained the substring `` add a new `## Validation Trace on PG-<integer>` section per the shared eight hard gates `` in step 8 of the Phase 10 commit/write block; this ticket removed that per-turn append instruction.
3. `.claude/skills/_shared-templates/story-state-contract.md` §10 gives the cross-skill INDEX.md write order but does NOT itself enumerate the per-section convention; the convention lived only in the two SKILL.md files. The shared contract reference therefore needed no edit.
4. `.claude/skills/_shared-templates/story-record-schemas.md:110` carries the canonical `validation_trace:` schema slot with the explicit comment `# * one entry per shared gate with PASS + one-line rationale` and per-gate `"PASS: <rationale>"` shape. The YAML field is unaffected by this change — only the markdown projection is removed.
5. **FOUNDATIONS principle under audit**: §Story Bundles §2 — "A per-bundle `INDEX.md` is a derived rendering of the bundle's branch, thread, mystery, cast, pool, and page state." Validation Trace projections fit none of those enumerated categories. §Story Bundles §5b (Schema-Minimalism) — "Every field in every story-bundle record schema must be load-bearing"; the same discipline argues against a derived markdown projection with no consumer.
6. **Blast-radius grep** (`rg -n 'Validation Trace on PG|## Validation Trace' .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle .claude/skills/continuity-audit`): after the change, the edited bootstrap and turn-cycle skills have zero `Validation Trace on PG` hits; the remaining `continuity-audit/templates/audit-report.md:221` hit is the unrelated `## Validation Trace (Phase 12)` continuity-audit section. No cross-impact.
7. **Adjacent contradictions discovered**: none — this is a clean removal of a write-only projection; the YAML field, validators, and replay surfaces are unchanged.

## Architecture Check

1. The change removes a derived markdown projection whose source-of-truth lives in the canonical YAML record. This is structurally cleaner: one home for the data (PG.validation_trace field) rather than two (field + markdown).
2. Alternative considered — keep an abbreviated projection (e.g., one-line "all gates PASS at PG-X"): rejected. Either consumers want structured access (they get it from the YAML field via `mcp__worldloom__get_record(record_id='PG-N')`) or they want human scan value (none has emerged across all consuming skills). A summary line preserves the bloat dynamic without consumer justification.
3. No backwards-compatibility shim introduced. Existing `worlds/<slug>/stories/<slug>/INDEX.md` files retain their historical `## Validation Trace on PG-X` sections as inert historical record; only future skill executions stop appending. The skill prose change is the entire intervention.

## Verification Layers

1. **No remaining authoring instruction in skill prose** → codebase grep-proof: `grep -rn "## Validation Trace on PG\|Validation Trace on PG" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` returns no matches after this change.
2. **`PG.validation_trace` field discipline unchanged** → schema validation: `validation_trace_shape_compliance` continues to enforce the flat nine-key mapping; `record_schema_compliance` for `story_page_record` continues to require the field. No test changes.
3. **Health-audit input contract unaffected** → manual review: `branching-story-health-audit/SKILL.md:627` lists `bundle INDEX.md` as one of several inputs alongside `_source/` records and prose files; the audit's `Phase 2a` replay reads `PG.validation_trace` from the YAML record. Removing the markdown projection does not weaken health-audit's information access.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/SKILL.md`

Removed the trailing `` / `## Validation Trace on PG-1` (the latter populated from `PG-1.validation_trace` per the shared eight hard gates) `` clause from the bullet enumerating bundle `INDEX.md` first-run sections. The preceding section list remains intact through Mystery Reserve at Bundle Scope.

### 2. `.claude/skills/branching-story-turn-cycle/SKILL.md`

Removed the sentence `` add a new `## Validation Trace on PG-<integer>` section per the shared eight hard gates. `` from step 8 of the Phase 10 commit/write block. The surrounding instructions for appending a Pages-table row, Story-Local Facts / Beliefs rows, and the `## Emitted Choices at PG-<integer>` section remain unchanged.

### 3. `.claude/skills/_shared-templates/story-state-contract.md`

No edit. Reassessment confirmed the shared write-order contract does not name the `## Validation Trace on PG-*` projection.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — single-clause removal from the bundle `INDEX.md` first-run section list)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — single-sentence removal from Phase 10 step 8)
- `archive/tickets/STOREDUCE-001.md` (archived completed ticket with closeout evidence)

## Out of Scope

- Retroactive cleanup of existing `## Validation Trace on PG-X` sections in committed `worlds/<slug>/stories/<slug>/INDEX.md` files. Historical entries remain as inert audit-trail prose; only future skill executions stop appending. If retroactive cleanup is later desired, it becomes its own ticket.
- Changes to the `PG.validation_trace` YAML field schema, the `validation_trace_shape_compliance` validator, or the canonical-JSON state-hash payload definition. The field stays load-bearing in its YAML form.
- Removal of any other `INDEX.md` section (`## Emitted Choices at PG-X`, `## Active Threads`, `## Story-Local Beliefs`, etc.). Those are tracked separately if pursued.
- `STOREDUCE-002` (one-line rationale enforcement) — coordinated but independent; either ticket alone is a coherent improvement.

## Acceptance Criteria

### Tests That Must Pass

1. `! grep -rn "Validation Trace on PG" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` returns success with no matches.
2. `cd tools/validators && npm test` passes — no validator covers the markdown projection, so removal is a no-op for the validator suite.

### Additional Broad Check

1. `cd tools/world-mcp && npm test` was attempted as broad confirmation; it remains red on a pre-existing SPEC-42 skill-contract surrogate unrelated to this ticket (`commitment-block-authoring` missing `clock_advancing`). This is recorded under `## Deviations` rather than accepted as a current-ticket gate.

### Invariants

1. `PG.validation_trace` YAML field remains schema-required and shape-validated; only the markdown projection in `INDEX.md` is removed.
2. Bundle `INDEX.md` retains every section the change does not name (Bundle Identity, Cast Roster, Story Character Authority, Branches, Pages, Active Threads, Open Obligations, Pending Consequences, Active Clocks, Story Secrets, Open Setups, Relationships, Story-Local Facts, Story-Local Beliefs, Story-Local Intentions, Story-Local Emotions, Pressure Clocks, Locations, Objects, Commitment Block Pool, Storylet Batches, Mystery Reserve at Bundle Scope, `## Emitted Choices at PG-X`, `## Rendered Prose`).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; the only change is to skill prose. The deterministic validators in tools/validators/ that govern PG.validation_trace continue to enforce the YAML-field surface unchanged.`

### Commands

1. `! grep -rn "Validation Trace on PG" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` — returns success with no matches.
2. `cd tools/validators && npm test` — passes.
3. `cd tools/world-mcp && npm test` — attempted broad confirmation; see `## Deviations` for the unrelated existing failure.

## Outcome

Future `branching-story-bootstrap` and `branching-story-turn-cycle` runs no longer instruct agents to project `PG.validation_trace` into bundle `INDEX.md` as `## Validation Trace on PG-*` markdown sections. `PG.validation_trace` remains required and shape-validated in the YAML page record.

## Verification Result

1. `! grep -rn "Validation Trace on PG" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` — passed with no matches.
2. Manual review of `.claude/skills/_shared-templates/story-state-contract.md` §10 — no active `## Validation Trace on PG-*` convention remained there; no edit needed.
3. Manual review of `branching-story-health-audit` guardrails — audit reads `_source/` records, prose artifacts, receipts, and bundle `INDEX.md`, and does not depend on an INDEX validation-trace projection.
4. `cd tools/validators && npm test` — passed: 1093 passing tests, 0 failures.
5. `cd tools/world-mcp && npm test` — broad suite attempted; 494 passing tests, 1 failure unrelated to this ticket. The failing subtest was `SPEC-42 capstone covers story-skill contract surfaces as executable surrogates`, expecting `clock_advancing` in `.claude/skills/commitment-block-authoring/SKILL.md`.

## Deviations

The drafted `tools/world-mcp` broad-suite acceptance gate is not claimed green. Its single failure is outside the `Validation Trace on PG-*` INDEX projection seam and checks `commitment-block-authoring` SPEC-42 vocabulary, not bootstrap/turn-cycle INDEX authoring. The active ticket closes on the focused no-hit grep, manual contract review, and passing validators suite.
