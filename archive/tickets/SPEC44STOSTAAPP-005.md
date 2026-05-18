# SPEC44STOSTAAPP-005: Turn-cycle skill — append-only state lifecycle docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — updates `.claude/skills/branching-story-turn-cycle/SKILL.md` Output table and Phase 10 operation guidance for CLK/STSEC/STQ to remove references to the deleted lifecycle ops; introduces a new reference file `.claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` documenting the create-with-supersedes semantics for CLK/STSEC/STQ lifecycle transitions; truths same-skill references that still described retired lifecycle ops.
**Deps**: archive/tickets/SPEC44STOSTAAPP-002.md

## Problem

At intake, after archived ticket `archive/tickets/SPEC44STOSTAAPP-002.md` removed the 7 patch-engine lifecycle ops (`tick_pressure_clock` / `resolve_pressure_clock` / `append_secret_clue_carrier` / `mark_secret_clue_discovered` / `reveal_story_secret` / `answer_story_question` / `abandon_story_question`), the `branching-story-turn-cycle` skill's documented authoring path for CLK / STSEC / STQ lifecycle transitions still pointed at op kinds that no longer existed. Specifically:

- The SKILL.md Output table's rows for CLK / STSEC / STQ framed lifecycle transitions in terms of the deleted ops (e.g., "tick CLK via `tick_pressure_clock`"); after ticket 002, those rows were stale.
- The reference file authoring path (under `references/`) did not document the create-with-supersedes semantics that replace the deleted ops. Operators authoring story moves needed to understand that ticking a clock, revealing a secret, or answering a question now requires authoring a NEW record with `supersedes: <prior_id>` via the existing `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` ops (which, despite the name, route to `stageCreateStoryRecord` and emit new files — they're create-with-supersedes, not in-place edits).

A new dedicated reference file (`append-only-state-lifecycle.md`) now co-locates the supersession authoring guidance for all three classes in one navigable surface, parallel to the existing `mid-story-record-introduction.md` reference file's per-class structure.

## Assumption Reassessment (2026-05-18)

1. `.claude/skills/branching-story-turn-cycle/SKILL.md` exists and contains an Output table; the table's CLK / STSEC / STQ rows reference the lifecycle ops being removed in ticket 002. `.claude/skills/branching-story-turn-cycle/references/` exists with 10 sibling reference files (governance-and-foundations.md, mid-story-record-introduction.md, phase-1-action-resolution.md, phase-2-3-commitment-and-state-delta.md, phase-4-5-belief-and-mystery.md, phase-6-page-snapshot.md, phase-7-page-plan.md, phase-8-choice-generation.md, phase-9-validation-gates.md, pre-flight-and-prerequisites.md). The new `append-only-state-lifecycle.md` follows the same per-reference-file convention.
2. SPEC-44 §Approach Phase 2 step 9 (skill text amendments) + §Risks & Open Questions (open question about new dedicated reference file vs folding into existing `phase-4-5-belief-and-mystery.md`) — chose new dedicated file per the spec's default assumption ("new dedicated file for surface area"). The existing `mid-story-record-introduction.md` is the structural precedent: per-class supersession authoring guidance lives in its own reference file rather than folding into a phase-keyed reference.
3. **Cross-skill boundary under audit**: turn-cycle skill prose references the patch-engine's op vocabulary as a contract surface. The Output table and reference-file authoring path are the documented authoring contract; updates here keep the contract surface coherent with the engine op vocabulary post-ticket-002.
4. **FOUNDATIONS principle**: §Story Bundles §8 (atomic YAML records append-only at the filesystem level) — the new reference file documents the structural pattern by which the skill produces append-only state changes. The skill prose is the operator-facing manifestation of the same rule the validator (ticket 003) enforces structurally.
5. Live reassessment found same-skill stale references beyond the drafted `SKILL.md` Output table: `SKILL.md` Phase 10 still listed `tick_pressure_clock` / `resolve_pressure_clock` / secret / question lifecycle ops, `references/phase-4-5-belief-and-mystery.md` still instructed operators to emit those retired ops, and `references/mid-story-record-introduction.md` still referred to `tick_pressure_clock` semantics. Those references are same-seam required fallout because they directly guide the lifecycle authoring path this ticket owns.
6. **HARD-GATE surface touched**: `branching-story-turn-cycle` carries a `<HARD-GATE>` and Phase 10 operation guidance controls the patch-plan submitted after approval. `docs/HARD-GATE-DISCIPLINE.md` was read. This ticket preserves the gate and approval semantics while replacing retired in-place lifecycle operations with append-only create-with-supersedes operations.

## Architecture Check

1. **Dedicated reference file is cleaner than inline append to existing phase-4-5-belief-and-mystery.md.** The supersession authoring discipline applies to CLK / STSEC / STQ uniformly (and could extend to other classes in the future); a dedicated reference file lets operators find the guidance by topic rather than by phase. Parallel to `mid-story-record-introduction.md`, which documents per-class introduction guidance independent of any single phase.
2. **No backwards-compatibility shim.** The skill prose updates remove references to the deleted ops entirely; there is no "legacy mode" or alternative-authoring-path documentation. Operators authoring under the new contract use the supersession ops only.

## Verification Layers

1. **Turn-cycle skill and references no longer advertise retired lifecycle op kinds** → codebase grep-proof: `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/*.md` returns no matches.
2. **`append-only-state-lifecycle.md` exists** → codebase grep-proof: `ls .claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` succeeds.
3. **`append-only-state-lifecycle.md` documents the per-class supersession authoring path** → manual review of the new reference file: the file describes (a) the supersession discipline (create-new with `supersedes: <prior_id>`), (b) the per-class authoring path naming the correct `supersede_<class>_record` op, and (c) the explicit clarification that the "supersede" op name describes intent, not in-place edit (the ops route to `stageCreateStoryRecord`).

## Landed Changes

### 1. Update SKILL.md Output table

Edited `.claude/skills/branching-story-turn-cycle/SKILL.md` Output table rows for CLK / STSEC / STQ and the Phase 10 operation inventory. Each row now describes create or supersede operations as the authoring vehicle for lifecycle transitions:

- **CLK row**: "create or supersede via `create_clk_record` / `supersede_clk_record`. Lifecycle transitions (tick, threshold-fire, resolve) author a new CLK record with `supersedes: <prior_clk_id>` and updated value / status / resolution_event; the prior record is preserved on disk unchanged."
- **STSEC row**: "create or supersede via `create_stsec_record` / `supersede_stsec_record`. Lifecycle transitions (clue-carrier append, clue-discovery, reveal) author a new STSEC record with `supersedes: <prior_stsec_id>` and updated clue_carriers / status / reveal_event / reveal_records; the prior record is preserved on disk unchanged."
- **STQ row**: "create or supersede via `create_stq_record` / `supersede_stq_record`. Lifecycle transitions (answer, abandon) author a new STQ record with `supersedes: <prior_stq_id>` and updated status / answer_event / answer_records / abandonment_rationale; the prior record is preserved on disk unchanged."

Preserved the row structure and cross-references the Output table already used.

### 1a. Truth existing phase references

Updated same-skill reference prose that still named the retired lifecycle ops:

- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` now instructs operators to author CLK / STSEC / STQ lifecycle transitions by creating a new record with `supersedes: <prior_id>` via `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record`.
- `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` now describes same-event tick / lifecycle advancement as a create-with-supersedes record, not `tick_pressure_clock` semantics.

### 2. Author the new reference file

Created `.claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md`. The file documents:
- **Section §Overview**: the append-only contract per FOUNDATIONS §Story Bundles §8 — story-bundle `_source/<class>/*.yaml` records are append-only at the filesystem level; lifecycle transitions for CLK / STSEC / STQ are authored as create-new + supersedes-link, not in-place edits.
- **Section §Op-naming clarification**: `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` route to `stageCreateStoryRecord` and emit new record files (`<class>-<N+1>.yaml`). The name "supersede" describes intent (the new record supersedes a prior one); the mechanism is create-with-supersedes. The new record's body carries `supersedes: <prior_id>`.
- **Section §CLK lifecycle authoring**: how to tick a clock (new CLK-N+1 with `value: new_value`, `tick_history: [...prior, new_entry]`, `supersedes: CLK-N`), threshold-fire (new CLK-N+1 with `value: threshold_at`, fire event in `tick_history`), resolve (new CLK-N+1 with `status: "resolved"`, `resolution_event: SE-X`).
- **Section §STSEC lifecycle authoring**: how to append a clue carrier (new STSEC-N+1 with extended `clue_carriers: [...prior, new_carrier]`), mark a clue discovered (new STSEC-N+1 with the carrier's `status: "discovered"` and `discovered_by: [...holders]`), reveal a secret (new STSEC-N+1 with `status: "revealed"`, `reveal_event: SE-X`, `reveal_records: [BEL/SF/DA/STQ ids]`).
- **Section §STQ lifecycle authoring**: how to answer a question (new STQ-N+1 with `status: "answered"`, `answer_event: SE-X`, `answer_records: [...]`), abandon (new STQ-N+1 with `status: "abandoned"`, `abandonment_rationale: "..."`).
- **Section §Cross-references**: link to `tools/patch-engine/src/ops/create-story-record.ts` for the `supersede_<class>_record` STORY_RECORD_SPECS definitions; link to FOUNDATIONS §Story Bundles §8; link to `archive/tickets/SPEC44STOSTAAPP-003.md`'s `no_story_state_in_place_mutation` validator as the structural enforcement.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — update Output table rows for CLK / STSEC / STQ)
- `.claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` (new)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify — replace retired lifecycle-op authoring guidance)
- `.claude/skills/branching-story-turn-cycle/references/mid-story-record-introduction.md` (modify — replace retired tick/lifecycle semantics)

## Out of Scope

- Broadly rewriting phase-keyed reference files beyond the same-skill stale lifecycle-op anchors. `phase-4-5-belief-and-mystery.md` and `mid-story-record-introduction.md` are in scope only where they still instruct operators to use retired lifecycle ops.
- Renaming the `supersede_<class>_record` ops to reflect their create-with-supersedes semantics (per SPEC-44 §Out of Scope — cosmetic clarity at high downstream cost).
- Adding new ops for the other 17 story-bundle classes — the spec's Out of Scope explicitly defers any uniform `supersede_<class>` op rollout.

## Acceptance Criteria

### Tests That Passed

1. None — documentation-only ticket; verification was command-based and existing pipeline coverage is named in Assumption Reassessment.

### Invariants

1. `branching-story-turn-cycle/SKILL.md` and turn-cycle reference files contain no active references to the 7 deleted patch-engine lifecycle op kinds.
2. `branching-story-turn-cycle/references/append-only-state-lifecycle.md` exists and documents the per-class supersession authoring path for CLK / STSEC / STQ.
3. The new reference file explicitly names the create-with-supersedes semantics of the `supersede_<class>_record` ops (the ops route to `stageCreateStoryRecord` and emit new files, not in-place edits).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification was command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/*.md` — confirms zero current-skill matches.
2. `ls .claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` — confirms new reference file exists.
3. `grep -nE "supersede_clk_record|supersede_stsec_record|supersede_stq_record" .claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` — confirms the new reference file documents all three supersession op names.

## Outcome

Completed 2026-05-18. The turn-cycle skill no longer advertises the seven retired in-place lifecycle operations for CLK / STSEC / STQ authoring. The Output table, Phase 4-5 procedure pointer, Phase 10 patch-plan operation inventory, and same-skill lifecycle references now describe append-only create-with-supersedes authoring through `supersede_clk_record`, `supersede_stsec_record`, and `supersede_stq_record`.

The new `append-only-state-lifecycle.md` reference centralizes the operator-facing lifecycle discipline: ticking or resolving a clock, discovering or revealing a secret, and answering or abandoning a story question all create a fresh record file with `supersedes: <prior_id>` while preserving the prior YAML file unchanged.

## Verification Result

1. `grep -nE "tick_pressure_clock|resolve_pressure_clock|append_secret_clue_carrier|mark_secret_clue_discovered|reveal_story_secret|answer_story_question|abandon_story_question" .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-turn-cycle/references/*.md` — exited 1 with no matches, the expected negative-grep proof.
2. `ls .claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` — passed.
3. `grep -nE "supersede_clk_record|supersede_stsec_record|supersede_stq_record" .claude/skills/branching-story-turn-cycle/references/append-only-state-lifecycle.md` — passed; all three operation names are documented.

## Deviations

- Live reassessment found same-skill stale lifecycle-op guidance outside the drafted Output table: `SKILL.md` Phase 10, `references/phase-4-5-belief-and-mystery.md`, and `references/mid-story-record-introduction.md`. Those references were updated because leaving them active would have preserved an invalid authoring path after ticket 002.
- No executable skill dry-run was available or required for this documentation-only ticket; closeout uses stale-anchor grep proof plus manual contract review against FOUNDATIONS §Story Bundles §8 and `docs/HARD-GATE-DISCIPLINE.md`.
