# SPEC44STOSTAAPP-005: Turn-cycle skill — append-only state lifecycle docs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — updates `.claude/skills/branching-story-turn-cycle/SKILL.md` Output table rows for CLK/STSEC/STQ to remove references to the deleted lifecycle ops; introduces a new reference file `.claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` documenting the create-with-supersedes semantics for CLK/STSEC/STQ lifecycle transitions.
**Deps**: archive/tickets/SPEC44STOSTAAPP-002.md

## Problem

After archived ticket `archive/tickets/SPEC44STOSTAAPP-002.md` removed the 7 patch-engine lifecycle ops (`tick_pressure_clock` / `resolve_pressure_clock` / `append_secret_clue_carrier` / `mark_secret_clue_discovered` / `reveal_story_secret` / `answer_story_question` / `abandon_story_question`), the `branching-story-turn-cycle` skill's documented authoring path for CLK / STSEC / STQ lifecycle transitions points at op kinds that no longer exist. Specifically:

- The SKILL.md Output table's rows for CLK / STSEC / STQ currently frame lifecycle transitions in terms of the deleted ops (e.g., "tick CLK via `tick_pressure_clock`"); after ticket 002, the rows are stale.
- The reference file authoring path (under `references/`) does not yet document the create-with-supersedes semantics that replace the deleted ops. Operators authoring story moves need to understand that ticking a clock, revealing a secret, or answering a question now requires authoring a NEW record with `supersedes: <prior_id>` via the existing `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` ops (which, despite the name, route to `stageCreateStoryRecord` and emit new files — they're create-with-supersedes, not in-place edits).

A new dedicated reference file (`append-only-state-lifecycle.md`) co-locates the supersession authoring guidance for all three classes in one navigable surface, parallel to the existing `mid-story-record-introduction.md` reference file's per-class structure.

## Assumption Reassessment (2026-05-18)

1. `.claude/skills/branching-story-turn-cycle/SKILL.md` exists and contains an Output table; the table's CLK / STSEC / STQ rows reference the lifecycle ops being removed in ticket 002. `.claude/skills/branching-story-turn-cycle/references/` exists with 10 sibling reference files (governance-and-foundations.md, mid-story-record-introduction.md, phase-1-action-resolution.md, phase-2-3-commitment-and-state-delta.md, phase-4-5-belief-and-mystery.md, phase-6-page-snapshot.md, phase-7-page-plan.md, phase-8-choice-generation.md, phase-9-validation-gates.md, pre-flight-and-prerequisites.md). The new `append-only-state-lifecycle.md` follows the same per-reference-file convention.
2. SPEC-44 §Approach Phase 2 step 9 (skill text amendments) + §Risks & Open Questions (open question about new dedicated reference file vs folding into existing `phase-4-5-belief-and-mystery.md`) — chose new dedicated file per the spec's default assumption ("new dedicated file for surface area"). The existing `mid-story-record-introduction.md` is the structural precedent: per-class supersession authoring guidance lives in its own reference file rather than folding into a phase-keyed reference.
3. **Cross-skill boundary under audit**: turn-cycle skill prose references the patch-engine's op vocabulary as a contract surface. The Output table and reference-file authoring path are the documented authoring contract; updates here keep the contract surface coherent with the engine op vocabulary post-ticket-002.
4. **FOUNDATIONS principle**: §Story Bundles §8 (atomic YAML records append-only at the filesystem level) — the new reference file documents the structural pattern by which the skill produces append-only state changes. The skill prose is the operator-facing manifestation of the same rule the validator (ticket 003) enforces structurally.

## Architecture Check

1. **Dedicated reference file is cleaner than inline append to existing phase-4-5-belief-and-mystery.md.** The supersession authoring discipline applies to CLK / STSEC / STQ uniformly (and could extend to other classes in the future); a dedicated reference file lets operators find the guidance by topic rather than by phase. Parallel to `mid-story-record-introduction.md`, which documents per-class introduction guidance independent of any single phase.
2. **No backwards-compatibility shim.** The skill prose updates remove references to the deleted ops entirely; there is no "legacy mode" or alternative-authoring-path documentation. Operators authoring under the new contract use the supersession ops only.

## Verification Layers

1. **SKILL.md Output table rows for CLK / STSEC / STQ are updated** → codebase grep-proof: `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" .claude/skills/branching-story-turn-cycle/SKILL.md` returns no matches.
2. **`append-only-state-lifecycle.md` exists** → codebase grep-proof: `ls .claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` succeeds.
3. **`append-only-state-lifecycle.md` documents the per-class supersession authoring path** → manual review of the new reference file: the file describes (a) the supersession discipline (create-new with `supersedes: <prior_id>`), (b) the per-class authoring path naming the correct `supersede_<class>_record` op, and (c) the explicit clarification that the "supersede" op name describes intent, not in-place edit (the ops route to `stageCreateStoryRecord`).

## What to Change

### 1. Update SKILL.md Output table

Edit `.claude/skills/branching-story-turn-cycle/SKILL.md` Output table rows for CLK / STSEC / STQ. Each row currently references the deleted lifecycle op as the authoring vehicle for the transition (e.g., "tick CLK → patch op `tick_pressure_clock`"). After this edit:

- **CLK row**: "create or supersede via `create_clk_record` / `supersede_clk_record`. Lifecycle transitions (tick, threshold-fire, resolve) author a new CLK record with `supersedes: <prior_clk_id>` and updated value / status / resolution_event; the prior record is preserved on disk unchanged."
- **STSEC row**: "create or supersede via `create_stsec_record` / `supersede_stsec_record`. Lifecycle transitions (clue-carrier append, clue-discovery, reveal) author a new STSEC record with `supersedes: <prior_stsec_id>` and updated clue_carriers / status / reveal_event / reveal_records; the prior record is preserved on disk unchanged."
- **STQ row**: "create or supersede via `create_stq_record` / `supersede_stq_record`. Lifecycle transitions (answer, abandon) author a new STQ record with `supersedes: <prior_stq_id>` and updated status / answer_event / answer_records / abandonment_rationale; the prior record is preserved on disk unchanged."

Preserve the row structure and any cross-references the Output table currently uses.

### 2. Author the new reference file

Create `.claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md`. The file documents:
- **Section §Overview**: the append-only contract per FOUNDATIONS §Story Bundles §8 — story-bundle `_source/<class>/*.yaml` records are append-only at the filesystem level; lifecycle transitions for CLK / STSEC / STQ are authored as create-new + supersedes-link, not in-place edits.
- **Section §Op-naming clarification**: `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` route to `stageCreateStoryRecord` and emit new record files (`<class>-<N+1>.yaml`). The name "supersede" describes intent (the new record supersedes a prior one); the mechanism is create-with-supersedes. The new record's body carries `supersedes: <prior_id>`.
- **Section §CLK lifecycle authoring**: how to tick a clock (new CLK-N+1 with `value: new_value`, `tick_history: [...prior, new_entry]`, `supersedes: CLK-N`), threshold-fire (new CLK-N+1 with `value: threshold_at`, fire event in `tick_history`), resolve (new CLK-N+1 with `status: "resolved"`, `resolution_event: SE-X`).
- **Section §STSEC lifecycle authoring**: how to append a clue carrier (new STSEC-N+1 with extended `clue_carriers: [...prior, new_carrier]`), mark a clue discovered (new STSEC-N+1 with the carrier's `status: "discovered"` and `discovered_by: [...holders]`), reveal a secret (new STSEC-N+1 with `status: "revealed"`, `reveal_event: SE-X`, `reveal_records: [BEL/SF/DA/STQ ids]`).
- **Section §STQ lifecycle authoring**: how to answer a question (new STQ-N+1 with `status: "answered"`, `answer_event: SE-X`, `answer_records: [...]`), abandon (new STQ-N+1 with `status: "abandoned"`, `abandonment_rationale: "..."`).
- **Section §Cross-references**: link to `tools/patch-engine/src/ops/create-story-record.ts:198-232` for the `supersede_<class>_record` STORY_RECORD_SPECS definitions; link to FOUNDATIONS §Story Bundles §8; link to `archive/tickets/SPEC44STOSTAAPP-003.md`'s `no_story_state_in_place_mutation` validator as the structural enforcement.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — update Output table rows for CLK / STSEC / STQ)
- `.claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` (new)

## Out of Scope

- Updating other phase-keyed reference files (e.g., `phase-4-5-belief-and-mystery.md`) — those reference files describe the phase workflow; the new dedicated reference file is the topical companion that the phase files can cross-reference if needed.
- Renaming the `supersede_<class>_record` ops to reflect their create-with-supersedes semantics (per SPEC-44 §Out of Scope — cosmetic clarity at high downstream cost).
- Adding new ops for the other 17 story-bundle classes — the spec's Out of Scope explicitly defers any uniform `supersede_<class>` op rollout.

## Acceptance Criteria

### Tests That Must Pass

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Invariants

1. `branching-story-turn-cycle/SKILL.md` Output table contains no references to the 7 deleted patch-engine lifecycle op kinds.
2. `branching-story-turn-cycle/references/append-only-state-lifecycle.md` exists and documents the per-class supersession authoring path for CLK / STSEC / STQ.
3. The new reference file explicitly names the create-with-supersedes semantics of the `supersede_<class>_record` ops (the ops route to `stageCreateStoryRecord` and emit new files, not in-place edits).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" .claude/skills/branching-story-turn-cycle/SKILL.md` — confirms zero matches.
2. `ls .claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` — confirms new reference file exists.
3. `grep -nE "supersede_clk_record|supersede_stsec_record|supersede_stq_record" .claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` — confirms the new reference file documents all three supersession op names.
