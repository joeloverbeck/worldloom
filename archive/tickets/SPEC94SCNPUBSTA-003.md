# SPEC94SCNPUBSTA-003: `branching-story-scene-plan` — drop status, rework `previous_scene_id`, derived INDEX indicator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-scene-plan/SKILL.md` prose, including one HARD-GATE content sentence. No change to the patch op vocabulary (`create_scn_record` / `supersede_scn_record` unchanged), approval timing, validator list, write order, or any tool/validator.
**Deps**: archive/tickets/SPEC94SCNPUBSTA-001.md

## Problem

At intake, `branching-story-scene-plan` wrote `status: planned` into the `SCN` draft on every create and supersede (the only value the field ever held), described the `existing_scene_id` argument as "refreshing an existing scene range/status", resolved `previous_scene_id` by "choosing the latest attached/planned scene" (a publication-status disjunct that was inert), and rendered scene row/status language into `INDEX.md`. With `status` removed from the contract (001) and schema (002), the skill now stops writing the field, drops status vocabulary from the arg description and previous-scene resolution, and renders the derived publication indicator instead.

## Assumption Reassessment (2026-05-29)

1. `.claude/skills/branching-story-scene-plan/SKILL.md`: arg description `existing_scene_id` at L19 ("…refreshing an existing scene range/status"); Phase 2 "Draft SCN membership record (planned status, …)" at L56; SCN record draft `status: planned` at L138–139; `previous_scene_id` resolution "choosing the latest **attached**/planned scene" at L111; INDEX update "Update `INDEX.md` with the scene row/status" at L237. Verified by reading the SKILL.md this session.
2. SPEC-94 §2 item 3 specifies: drop `status` from the SCN draft; reword `previous_scene_id` to branch-path + `end_page_id` adjacency on the same `branch_id`, excluding superseded `SCN`s (per `supersedes`), with no publication-status reference; render the derived indicator (SPEC-94 §3) at the INDEX step. The reassessed §6 added L19 to the edit list.
3. Cross-skill boundary under audit: the skill consumes the derived publication indicator defined in `story-state-contract.md` by SPEC94SCNPUBSTA-001; the SCN it drafts is validated against `story-scene.schema.json` (SPEC94SCNPUBSTA-002). The `previous_scene_id` field itself remains in the schema (the skill computes what to store).
4. FOUNDATIONS principle motivated: "Rendered prose is non-authoritative; publication state is derived, not stored" — the INDEX render switches from a stored field to a read-time projection, and `previous_scene_id` resolution drops a state that can never be reached (the `attached` disjunct), consistent with the spec's observation that the previous pointer is "a convenience, not authority."
5. HARD-GATE surface checked: the edited Phase 1-6 gate sentence now says the `SCN` record contains only membership, artifact paths, factual `scene_descriptor`, and factual `boundary_rationale`. `docs/HARD-GATE-DISCIPLINE.md` and `references/hard-gate-read-triage.md` were read before editing because this sentence lives inside `<HARD-GATE>`. The edit preserves gate order, approval timing, validation requirements, patch-engine routing, and failure handling; it only removes a now-forbidden stored-status field from the gate's content checklist.

## Architecture Check

1. Resolving `previous_scene_id` by branch-path + `end_page_id` adjacency + supersession is strictly more correct than the status-based rule (the old `attached` disjunct was unreachable); it relies only on durable membership fields already on `SCN`.
2. No backwards-compatibility shim: the skill stops writing `status` outright; it does not write a transitional default.

## Verification Layers

1. Skill writes no `status` on create or refresh → codebase grep-proof (`grep -n "status" SKILL.md` shows no SCN publication-status write).
2. `previous_scene_id` resolution references branch-path/end-page adjacency + supersession with no publication-status disjunct → manual review of the reworded L111 step.
3. INDEX rendering uses the derived indicator → manual review (the L237 step names the §3 derivation, not `SCN.status`).
4. Skill dry-run not required for a prose-only contract edit; the §6 completeness sweep (006) is the cross-cutting proof that no in-scope `SCN.status` reference survives in this skill.

## Landed Changes

### 1. `existing_scene_id` argument description

- Reworded the argument description from "refreshing an existing scene range/status" to "refreshing an existing scene range".

### 2. HARD-GATE, Phase 2, and SCN draft

- Removed `status` from the HARD-GATE's list of allowed `SCN` record content.
- Reworded "Draft SCN membership record (planned status, …)" to remove the "planned status" clause.
- Removed the `status: planned` line from the SCN record draft.

### 3. `previous_scene_id` resolution

- Reworded resolution to choose the adjacent prior scene whose `end_page_id` is immediately before the new range on the same `branch_id` and branch path, excluding superseded `SCN`s. The "stop for user input if ambiguous" behavior remains.

### 4. INDEX update

- Reworded the INDEX step to render the derived publication indicator from `prose_path` / `receipt_path` file presence plus the scene-prose receipt `verdict`, and to not read or write publication status on `SCN`.

## Files to Touch

- `.claude/skills/branching-story-scene-plan/SKILL.md` (modify)

## Out of Scope

- The contract markdown (001), the JSON schema + tests (002), prose-attach (004), docs/fixtures (005).
- Any change to the SCN membership fields the skill writes, the patch op vocabulary, or the scene-range validation Phase.
- Any change to the verbatim scene-plan §2/§3/render-time inlining contract (explicitly preserved per SPEC-94 §1).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "status: planned\|range/status\|attached/planned\|scene row/status\|SCN.status\|planned status" .claude/skills/branching-story-scene-plan/SKILL.md` returns zero matches.
2. The reworded `previous_scene_id` step (L111-area) references branch-path/end-page adjacency + supersession and contains no publication-status disjunct.
3. The INDEX step (L237-area) renders the derived indicator, not `SCN.status`.

### Invariants

1. The skill still drafts a valid `SCN` membership record (all required fields except the removed `status`).
2. `previous_scene_id` resolution remains deterministic and stops for user input on ambiguity.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is grep-based and the cross-cutting §6 sweep in SPEC94SCNPUBSTA-006 is the acceptance boundary.`

### Commands

1. `grep -n "status: planned\|range/status\|attached/planned\|scene row/status\|SCN.status\|planned status" .claude/skills/branching-story-scene-plan/SKILL.md` (expect zero)
2. The §6 completeness sweep (SPEC94SCNPUBSTA-006) confirms no in-scope `SCN.status` reference survives skill-wide.

## Outcome

Completed: 2026-05-29

`branching-story-scene-plan` no longer authors or consumes stored publication status for `SCN`. The skill's `existing_scene_id` argument, HARD-GATE content checklist, Phase 2 label, SCN YAML draft, `previous_scene_id` resolution, and INDEX update now align with the SPEC-94 contract: scene publication is derived at read time from artifact presence plus receipt verdict, while `SCN` remains an append-only membership record.

## Verification Result

1. `grep -n "status: planned\|range/status\|attached/planned\|scene row/status\|SCN.status\|planned status" .claude/skills/branching-story-scene-plan/SKILL.md` returned zero matches.
2. `grep -n "previous_scene_id\|derived publication indicator\|SCN.*status\|status" .claude/skills/branching-story-scene-plan/SKILL.md` showed the `previous_scene_id` step now uses adjacency + same `branch_id`/branch path + supersession exclusion, and the INDEX step uses the derived publication indicator. The only remaining `status` phrase in this result is the explicit prohibition "do not read or write publication status on `SCN`".
3. Manual HARD-GATE alignment check: gate order, approval timing, validation list, patch-engine route, and write-failure behavior are unchanged; the gate's content checklist no longer permits the removed `SCN.status` field.
4. `git diff --check -- .claude/skills/branching-story-scene-plan/SKILL.md tickets/SPEC94SCNPUBSTA-003.md` passed before archival; post-archive hygiene used `archive/tickets/SPEC94SCNPUBSTA-003.md`.

## Deviations

The ticket also updated a HARD-GATE sentence inside the same skill, because leaving the gate's "`SCN` record contains only membership, status, artifact paths..." wording would have preserved a stale current contract. This stayed inside the ticket's owned seam and did not change approval, validation, or write behavior.
