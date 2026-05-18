# SPEC42STOSTADEB-014: Cross-class contract doc + CLAUDE.md inventory updates

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: No new production code; documentation-only ticket landing the remaining cross-class story-state-contract.md updates (§5 predicate list and §8 page-plan §10b section), the CLAUDE.md Story Bundles inventory update, and the active SPEC-42 deliverables truthing for the retired §6 integration-matrix wording. Per the spec-to-tickets §Cross-Cutting Docs Ticket Shape, this is a cross-cutting docs ticket that lands atomically once all upstream implementation tickets have shipped
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md, archive/tickets/SPEC42STOSTADEB-005.md, archive/tickets/SPEC42STOSTADEB-006.md, archive/tickets/SPEC42STOSTADEB-007.md

## Problem

At intake, the per-class foundation tickets (SPEC42STOSTADEB-001 / -002 / -003) each touched `.claude/skills/_shared-templates/story-state-contract.md` or `.claude/skills/_shared-templates/story-record-schemas.md` for their class-specific §3 row + §4 schema text + §4.2 active_records enum extension. The per-class validator+predicate tickets (-005 / -006 / -007) extended `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`. Live reassessment found the §3 class inventory already lists CLK/STSEC/STQ and live §6 is Action Routing, not a story-pipeline integration matrix; the remaining cross-class docs surfaces are §5 (predicate-DSL grammar table — 12 new entries: 4 CLK + 4 STSEC + 4 STQ), §8 (page-plan minimum contract — new optional §10b section description), `CLAUDE.md` Story Bundles inventory wording, and the active SPEC-42 deliverables row that still named the removed §6 matrix.

## Assumption Reassessment (2026-05-18)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified during live reassessment (2026-05-18): `.claude/skills/_shared-templates/story-state-contract.md` exists and already lists CLK/STSEC/STQ in §3; `.claude/skills/_shared-templates/story-record-schemas.md` exists and carries the §4 schema split; `CLAUDE.md` exists but still described the story-bundle `_source/` layout and skill record inventories without CLK/STSEC/STQ; live §6 in `story-state-contract.md` is Action Routing, not an integration matrix.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables "Canonical contract updates" section. Live reassessment found the spec's §6 integration-matrix deliverable stale because the main contract no longer owns such a matrix; this ticket truths that spec row while landing the live §5 predicate table and §8 §10b contract. SPEC-42 §Risks "Phase 4 page-plan section addition" recommendation remains current: §10b is per-page-computed (not inlined verbatim like §2 / §3 / §19) — this ticket documents the §10b SECTION DESCRIPTION in §8, while the per-page-computed RENDERING landed in `archive/tickets/SPEC42STOSTADEB-009.md`.
3. Cross-skill / cross-tool shared boundary: the shared `story-state-contract.md` is the canonical reference for Skill Category 2c story-pipeline skills for predicate DSL (§5), action routing (§6), hard gates (§7), and page-plan minimum contract (§8). Integration behavior is now owned by the skill-specific surfaces that already landed in archived tickets -009 through -013; this ticket does not reintroduce a duplicate integration matrix.

## Architecture Check

1. **Cross-cutting docs ticket per §Cross-Cutting Docs Ticket Shape**: the remaining docs surfaces require all upstream implementation tickets to have shipped for the docs to land coherently. Without atomic landing, individual ticket-level docs updates would create staleness windows where the §5 predicate list or §8 page-plan contract partially describe the post-SPEC-42 state.
2. **`Deps: lists every upstream implementation ticket**: unlike §Spec-Integration Ticket Shape (which uses transitive-head dep), docs tickets reference each surface independently per the §Cross-Cutting Docs Ticket Shape guidance — the §5 predicate list grows by 4 entries per upstream predicate ticket (-005 / -006 / -007), while the §8 and CLAUDE.md inventory changes depend on the full CLK/STSEC/STQ class family. Enumerating every upstream ticket in Deps makes the docs-to-surface relationship explicit.
3. **§10b page-plan section: description here, rendering elsewhere**: this ticket adds the §10b section DESCRIPTION to §8 of the contract; `archive/tickets/SPEC42STOSTADEB-009.md` implements the per-page-computed RENDERING in turn-cycle Phase 7. The two-ticket split keeps the docs canonical description (§8) separate from the skill-implementation logic (Phase 7).

## Verification Layers

1. Grep-proof: `grep -nE 'clock_at_least|clock_below|clock_full|any_clock_active|secret_unrevealed|secret_revealed|revelation_ready|any_secret_unrevealed|story_question_open|story_question_status|any_story_question_open|promise_due' .claude/skills/_shared-templates/story-state-contract.md` returns 12 hits in §5 — verifies the predicate list grew by 12 entries
2. Grep-proof: §8 has a new optional §10b section description → grep for `§10b` or "Open Setups, Active Clocks, Hidden Secrets" in §8
3. Grep-proof: CLAUDE.md Story Bundles inventory list includes CLK / STSEC / STQ → grep for the class names in CLAUDE.md
4. Grep-proof: SPEC-42 no longer names the old actionable §6 deliverable phrase (`§6 — add CLK/STSEC/STQ to story-pipeline integration matrix`) → grep for that exact stale phrase in the active spec
5. No production code changes — verified by `git diff --stat -- tools/`

## Landed Changes

### 1. story-state-contract.md §5 — predicate-DSL grammar table extension

Modified `.claude/skills/_shared-templates/story-state-contract.md` §5 (the closed predicate DSL list). Added 12 entries:
- CLK predicates (4): `clock_at_least(CLK-<int>, value)`, `clock_below(CLK-<int>, value)`, `clock_full(CLK-<int>)`, `any_clock_active(alias, kind?, salience?)`
- STSEC predicates (4): `secret_unrevealed(STSEC-<int>)`, `secret_revealed(STSEC-<int>)`, `revelation_ready(STSEC-<int>)`, `any_secret_unrevealed(alias, salience?, kind?)`
- STQ predicates (4): `story_question_open(STQ-<int>)`, `story_question_status(STQ-<int>, status)`, `any_story_question_open(alias, salience?, setup_kind?)`, `promise_due(STQ-<int>, age_pages)`

Each entry follows the existing §5 format (predicate signature + one-line semantics). The §5 predicate-DSL grammar grows from 22 entries (verified at SPEC-42 brainstorm) to 34 entries.

### 2. story-state-contract.md §8 — page-plan §10b section description

Modified §8 (page-plan minimum contract). Added optional §10b: "**Open Setups, Active Clocks, Hidden Secrets**" as a per-page-computed section, not inlined verbatim. The contract records the rendered content shape for active CLK / STSEC / STQ records and the omission rule when no relevant new-class state is active.

### 3. CLAUDE.md Story Bundles inventory extension

Modified `CLAUDE.md` Story Bundles section. The story `_source/` layout now names the CLK / STSEC / STQ subdirectories and the bootstrap / turn-cycle summaries now include optional or as-needed CLK / STSEC / STQ records.

### 4. SPEC-42 deliverables truthing

Updated the active spec deliverables row that still named `.claude/skills/_shared-templates/story-state-contract.md` §6 as a story-pipeline integration matrix. Live §6 is Action Routing; integration details now live in the already-landed skill-specific surfaces and the shared §5 / §8 contracts.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5 grammar table 12 new entries; §8 §10b section description)
- `CLAUDE.md` (modify — Story Bundles section inventory list 3 new class entries)
- `specs/SPEC-42-story-state-debt-secret-clock-records.md` (modify — truth stale §6 integration-matrix deliverable row)
- `archive/tickets/SPEC42STOSTADEB-014.md` (modify — reassessment and closeout truthing after archival)

## Out of Scope

- CLK/STSEC/STQ class foundations (incl. §3 catalog rows, §4.6 / §4.7 / §4.8 per-class schemas, §4.2 active_records enum extension) — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class validators + predicate-grammar parser extensions — owned by SPEC42STOSTADEB-005 / -006 / -007
- Shared validator extensions — owned by archive/tickets/SPEC42STOSTADEB-008.md
- §10b per-page-computed RENDERING in turn-cycle Phase 7 — landed in `archive/tickets/SPEC42STOSTADEB-009.md`
- MCP retrieval surface — owned by archive/tickets/SPEC42STOSTADEB-004.md
- Other skill integrations — owned by SPEC42STOSTADEB-010 through -013

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: `grep -cE '(clock_at_least|clock_below|clock_full|any_clock_active|secret_unrevealed|secret_revealed|revelation_ready|any_secret_unrevealed|story_question_open|story_question_status|any_story_question_open|promise_due)' .claude/skills/_shared-templates/story-state-contract.md` returns at least 12 (the 12 new predicate names in §5; may also appear elsewhere in the doc)
2. Grep-proof: §8 has §10b section (`grep -n '§10b\|10b\|Open Setups, Active Clocks' .claude/skills/_shared-templates/story-state-contract.md` shows hits in §8)
3. Grep-proof: `grep -n 'CLK\|STSEC\|STQ' CLAUDE.md` shows hits in the Story Bundles section inventory list
4. Grep-proof: active SPEC-42 no longer carries the old actionable deliverable phrase (`! grep -nF '§6 — add CLK/STSEC/STQ to story-pipeline integration matrix' specs/SPEC-42-story-state-debt-secret-clock-records.md`)
5. No production code changes — `git diff --stat -- tools/` shows no modifications

### Invariants

1. The §5 predicate list grows from 22 entries (pre-SPEC-42) to 34 entries (12 new) — purely additive
2. The §8 page-plan minimum contract grows by 1 optional section description (§10b) — purely additive
3. CLAUDE.md inventory grows by 3 entries — purely additive
4. The active spec no longer directs maintainers to add rows to a non-existent §6 integration matrix
5. No production code is altered

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based (grep-proofs) and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -cE '(clock_at_least|clock_below|clock_full|any_clock_active|secret_unrevealed|secret_revealed|revelation_ready|any_secret_unrevealed|story_question_open|story_question_status|any_story_question_open|promise_due)' .claude/skills/_shared-templates/story-state-contract.md` — verify §5 predicate-list growth
2. `grep -n '§10b\|Open Setups, Active Clocks' .claude/skills/_shared-templates/story-state-contract.md` — verify the new §10b section exists
3. `grep -n 'CLK\|STSEC\|STQ' CLAUDE.md` — verify the inventory extension landed
4. `! grep -nF '§6 — add CLK/STSEC/STQ to story-pipeline integration matrix' specs/SPEC-42-story-state-debt-secret-clock-records.md` — verify the active spec no longer names the retired §6 matrix as a current deliverable
5. `git diff --stat -- tools/` — verify no production code changes (output should show zero file modifications under tools/)
6. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone

## Outcome

Completed on 2026-05-18.

The shared story-state contract now documents the 12 SPEC-42 predicate forms in §5 and the optional per-page-computed §10b page-plan section in §8. `CLAUDE.md` now names CLK / STSEC / STQ in the story-bundle `_source/` layout and story-pipeline skill summaries. The active SPEC-42 deliverables list was corrected so it no longer asks maintainers to add rows to a non-existent §6 integration matrix; §6 remains Action Routing, and integration ownership stays in the already-landed skill-specific surfaces plus the shared §5 / §8 contracts.

## Verification Result

1. `grep -cE '(clock_at_least|clock_below|clock_full|any_clock_active|secret_unrevealed|secret_revealed|revelation_ready|any_secret_unrevealed|story_question_open|story_question_status|any_story_question_open|promise_due)' .claude/skills/_shared-templates/story-state-contract.md` — passed; returned `12`.
2. `grep -n '§10b\|Open Setups, Active Clocks' .claude/skills/_shared-templates/story-state-contract.md` — passed; found the §10b intro, table row, and per-page-computed explanation.
3. `grep -n 'CLK\|STSEC\|STQ' CLAUDE.md` — passed; found the story `_source/` layout and bootstrap / turn-cycle summaries.
4. `grep -nF '§6 — add CLK/STSEC/STQ to story-pipeline integration matrix' specs/SPEC-42-story-state-debt-secret-clock-records.md` — passed as a negative proof; exited 1 with no matches.
5. `git diff --stat -- tools/` — passed; no output, so this ticket changed no production code under `tools/`.
6. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md CLAUDE.md specs/SPEC-42-story-state-debt-secret-clock-records.md tickets/SPEC42STOSTADEB-014.md` — passed before archival. After archival, the equivalent archived-path hygiene was `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md CLAUDE.md specs/SPEC-42-story-state-debt-secret-clock-records.md archive/tickets/SPEC42STOSTADEB-014.md`.

## Deviations

- The drafted §6 integration-matrix work was not performed because live `story-state-contract.md` §6 is Action Routing and the contract's §12 says per-skill workflows live in each skill, not in the shared contract. The stale deliverable was truthed in the active spec and this ticket instead of reintroducing a duplicate integration matrix.
- The §3 class inventory was already partially landed before this run, so this ticket did not duplicate those rows.
