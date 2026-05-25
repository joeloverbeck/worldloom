# Triage — `specs/IMPLEMENTATION-ORDER.md` deferred / rejected items reassessment

**Date:** 2026-05-25
**Source file:** [`specs/IMPLEMENTATION-ORDER.md`](../../specs/IMPLEMENTATION-ORDER.md) (iteration-3 sequence; the file is being archived to `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-3.md` in the same operation as this triage write).
**Prior triage:** [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](2026-05-25-slt-chc-overhaul-third-iteration-triage.md) — the originating triage that produced the iteration-3 §Out-of-Scope list whose lift-conditions are reassessed here.
**Trigger:** User-supplied request: "Please analyze specs/IMPLEMENTATION-ORDER.md . The specs are already implemented and archived, but the IMPLEMENTATION-ORDER.md mentions stuff that maybe could be worth doing apart from those specs (deferred stuff, etc.) Please analyze it carefully and see if there are specs that are worth creating, aligned with docs/FOUNDATIONS.md"
**Deliverables produced:** none (no specs warrant creation). This triage file is the durable decision record; `specs/IMPLEMENTATION-ORDER.md` was archived to `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-3.md` as a separate housekeeping action requested by the user after triage presentation.

## Triage summary

**Overall verdict: no new specs warrant creation.** Every deferred and rejected item from the iteration-3 §Out-of-Scope list has a tight, falsifiable lift-condition naming concrete empirical evidence. Codebase reassessment confirms none of those lift-conditions are met. Iteration 3 was a hardening pass; nothing has run *against* the hardened surface yet (no playtests, no production bundles, no narrative-prose renderer). Re-proposing any deferred item now would be silent re-proposal in the sense the §Out-of-Scope discipline exists to prevent.

The right next move on the SLT/CHC stream is **content work** — authoring real story bundles and generating playtests — which then either confirms the deferrals were correct OR produces the empirical evidence that flips one or more lift-conditions. Until then the spec backlog is empty by design.

## Verification ground truth

The IMPLEMENTATION-ORDER.md §Out-of-Scope items each name a concrete lift-condition. Current state vs each condition (verified 2026-05-25):

| Indicator | Current state | Verification source |
|---|---|---|
| Production worlds with story bundles | 0 SLTs / 0 CHCs / 0 PGs across `worlds/` | `find worlds -name "SLT-*" -o -name "CHC-*" -o -name "PG-*"` returns empty; only `worlds/animalia/` and `worlds/erotica-world/` exist, and `worlds/erotica-world/stories/` contains only an empty `INDEX.md` |
| Largest fixture SLT pool | 5 SLTs (`tools/validators/tests/fixtures/spec84-replay-and-branch-scope`) | `jq` over `records[]` filtering on `file_path` containing `/storylets/` |
| Prose renderer for non-player driver pages | None exists. `tools/world-index/src/commands/render.ts` is a YAML-record dumper for indexed `nodes`, not a narrative-prose generator | `tools/world-index/src/commands/render.ts:1-60` |
| Fixture with global SLT carrying a genesis-record predicate ref | None | `grep -rln "bundle_genesis_record\|genesis_record" tools/validators/tests/fixtures/` returns empty |
| Recorded playtests producing outcome-promise / hidden-mind-leak / audit-trail failures | None in `git log` since the iteration-3 triage; commits between triage and now are SPEC-84 / SPEC-85 fixture-implementation work only | `git log --oneline` over the last 25 commits |

No new schema, validator, or renderer surfaces have landed between the iteration-3 triage (2026-05-25 earlier same day) and this reassessment. The codebase state the iteration-3 triage evaluated against is unchanged on every surface load-bearing for the deferred items.

## Verdicts — deferred items

### Report SPEC-87 — page-plan §7a candidate-filter prose + `candidate_filter_trace_shape` validator (non-cooldown portion)

**Verdict:** confirms-existing-position (defer holds).
**Rationale:** The iteration-3 lift-condition is "a real audit-trail or replay-debugging failure cannot be diagnosed from existing `filter_trace` + `SE.commitment` fields." No such failure has been recorded; no production bundles even exist to exercise replay-debugging. The proposed §7a obligation remains consumer-circular (the proposed validator IS the only consumer). FOUNDATIONS §Story Bundles §5b (every field must be load-bearing) continues to govern.
**Re-evaluate when:** unchanged from the existing iteration-3 record.

### Report SPEC-88 — choice promise / non-player response language validators

**Verdict:** confirms-existing-position (defer holds).
**Rationale:** The iteration-3 lift-condition requires a concrete playtest example the existing `choice_set_noncollapse` + `chc_slt_selected_commitment_trace` validators miss. No playtests have run; no production CHCs exist. Heuristic-language validators remain false-positive-prone; FOUNDATIONS §Story Bundles §5c judgment-territory boundary on choice quality still applies.
**Re-evaluate when:** unchanged.

### Report SPEC-89 — authored large-pool fixture

**Verdict:** confirms-existing-position (defer holds — strongly).
**Rationale:** The iteration-3 lift threshold is "production bundle reaches 100+ SLTs AND retrieval-correctness regression escapes the SPEC-81 synthetic proof." Current state is 0 SLTs in any production bundle and 5 SLTs in the largest test fixture — two orders of magnitude below the threshold. YAGNI gate per `brainstorm` skill Guardrails continues to apply.
**Re-evaluate when:** unchanged.

### Report §10 Player Agency Modes contract amendment (STORY_KERNEL)

**Verdict:** confirms-existing-position (defer holds).
**Rationale:** The iteration-3 lift gates on the prose-attach hidden-mind-leak check lifting, which itself gates on a non-player-driver narrative-prose renderer existing. No renderer change since the iteration-3 triage. 4 of 5 proposed modes still live as the `player_response_mode` enum on `SE.turn_driver` (`tools/validators/src/schemas/story-event.schema.json:114-116`); the contract bullet would obligate page-plan / prose-attach authors without a structural reader.
**Re-evaluate when:** unchanged.

### SPEC-84 §9 Risks #1 — `matchesSourceRecordIds` retrieval-time over-rejection

**Verdict:** confirms-existing-position (defer holds).
**Rationale:** The iteration-3 lift requires "a real fixture or production bundle authors a global SLT with a genesis-record (`created_at_page == PG-1`) predicate ref AND the over-rejection becomes a visible bug." No fixture or production bundle does this. The static `branch-isolation` validator (failure code `global_storylet_references_branch_local`) continues to catch genuinely-bad cases pre-retrieval, so retrieval-time over-rejection remains a belt-and-suspenders defense, not a primary gate. SPEC-84's landed fixture continues to pass because STPLAN-99 has `created_at_page: PG-4` (BR-2 leaf, not genesis), so it is branch-local from BR-1 under both `isStoryLocalRecordId` (current) and `isBranchLocal` (proposed) checks.
**Re-evaluate when:** unchanged.

## Verdicts — rejected items

### Report §10 `branching-story-prose-attach` non-player-driver hidden-mind-leak validator

**Verdict:** confirms-existing-position (reject holds).
**Rationale:** Direct re-tread of iteration-2 §Out-of-Scope; the renderer-prose lift-condition remains unmet (same gate as the Player Agency Modes contract amendment above). The page-commit-time `turn_driver_pov_observer_firewall` validator continues to absorb the structural risk.

### 9 persistent inherited rejections from iteration-2

The 9 items inherited from iteration-2 §Out-of-Scope and re-listed in iteration-3 IMPLEMENTATION-ORDER (hybrid `CHC.binding` object; `CHC.late_bound: bool` flag; rich SLT grounding fields; SSEL persistent selection-trace; replay/fork as separate structural spec; 8-axis storylet generation matrix; pool-level pressure-distribution scoring / drama-manager; embeddings as legality filters; server-side full predicate evaluation; per-CHC `player_response_mode` schema field) all remain rejected on architectural grounds (FOUNDATIONS §Story Bundles §5b / §5c, archived SPEC-77 / SPEC-79 / SPEC-80 commitments, schema-minimalism, embeddings-as-filter prohibition).

**Verdict:** confirms-existing-position (rejections hold).
**Rationale:** No architectural shift since the iteration-3 triage. The iteration-3 report itself did not re-propose any of them — that discipline remains intact and the rejections do not require renewed justification.

## Refuted by verification

None — no item's verdict reverses on reassessment.

## Out-of-report finding — housekeeping observation

The iteration-3 `specs/IMPLEMENTATION-ORDER.md` was structurally **stale** at the time of this reassessment: rows 1 and 2 (SPEC-84, SPEC-85) were marked "completed" inline but still appeared under "## Active sequence" rather than "## Shipped in this sequence." Per the file's own §Notes convention ("The first iteration's IMPLEMENTATION-ORDER (now at `archive/specs/IMPLEMENTATION-ORDER-2026-05-24.md`) shipped SPEC-76 / SPEC-77 / SPEC-78. The second iteration's IMPLEMENTATION-ORDER (now at `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md`) shipped SPEC-79 / SPEC-80 / SPEC-81 / SPEC-82."), the iteration-3 sequence is complete and the file warranted archiving.

This was actioned in the same operation as this triage write: `specs/IMPLEMENTATION-ORDER.md` was updated to mark the sequence COMPLETED and move SPEC-84 / SPEC-85 rows to the shipped section, then `git mv`-d to `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-3.md`. No new spec was created. `specs/` is intentionally empty post-archive until iteration 4 emerges.

## Implementation note

Per the User pre-authorization clause in the originating request ("see if there are specs that are worth creating, aligned with docs/FOUNDATIONS.md"), the triage recommendation was presented in chat as a confirms-existing-position verdict with no spec creation. The user then explicitly authorized persisting the triage and archiving the stale IMPLEMENTATION-ORDER.md in the same turn.

Per the `brainstorm` skill's `references/deliverable-classification.md`, a triage producing zero specs and no companion deliverables is a chat-only-by-default flow; persistence to `docs/triage/` was opt-in selected by the user as a durable decision record for iteration-4 visibility.

## Open questions (for iteration 4 visibility)

1. **First-real-content trigger**: the most informative single signal for re-evaluating the deferred items as a group is the first real authored story bundle reaching production state (any non-zero `SLT-*` / `CHC-*` / `PG-*` count under `worlds/<slug>/stories/`). Iteration 4 should re-run this deferred-items reassessment when that trigger fires — at that point the playtest-based lift-conditions (SPEC-87 non-cooldown, SPEC-88) acquire empirical input for the first time.

2. **100-SLT threshold confirmation**: the SPEC-89 large-pool fixture defer rests on the 100-SLT real-bundle threshold from iteration-3. If iteration-4 authoring proves that threshold is the wrong cutoff (production bundles routinely cross it, or routinely stay well below it), the defer should be re-evaluated under the revised threshold rather than mechanically re-applied at 100.

3. **Narrative-prose renderer scope**: deferral items #4 (Player Agency Modes contract) and the rejected hidden-mind-leak validator both gate on "a real narrative-prose renderer for non-player-driver pages." When such a renderer is designed, the two items should land as one package (per the iteration-3 triage's §Open Questions point 3) — they share a single consumer surface, and splitting their delivery would create a rendering-without-validation window.

4. **Sequencing-file lifecycle**: this is the second consecutive iteration where the IMPLEMENTATION-ORDER.md file ended up needing post-completion housekeeping (status line + active/shipped section reshuffle) before archive. If iteration 4 produces another IMPLEMENTATION-ORDER, consider whether the per-spec "shipped" row promotion should happen at archive-the-spec time rather than batch-deferred to archive-the-sequence time — the current pattern leaves the file in an inconsistent state between the last spec's archive and the sequence's archive.
