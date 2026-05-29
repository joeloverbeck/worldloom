# SPEC94SCNPUBSTA-003: `branching-story-scene-plan` — drop status, rework `previous_scene_id`, derived INDEX indicator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-scene-plan/SKILL.md` prose. No change to the patch op vocabulary (`create_scn_record` / `supersede_scn_record` unchanged) or to any tool/validator.
**Deps**: SPEC94SCNPUBSTA-001

## Problem

`branching-story-scene-plan` writes `status: planned` into the `SCN` draft on every create and supersede (the only value the field ever holds), describes the `existing_scene_id` argument as "refreshing an existing scene range/status", resolves `previous_scene_id` by "choosing the latest attached/planned scene" (a publication-status disjunct that is now inert), and renders the `SCN.status` value into `INDEX.md`. With `status` removed from the contract (001) and schema (002), the skill must stop writing the field, drop the status vocabulary from the arg description and the previous-scene resolution, and render the derived publication indicator instead.

## Assumption Reassessment (2026-05-29)

1. `.claude/skills/branching-story-scene-plan/SKILL.md`: arg description `existing_scene_id` at L19 ("…refreshing an existing scene range/status"); Phase 2 "Draft SCN membership record (planned status, …)" at L56; SCN record draft `status: planned` at L138–139; `previous_scene_id` resolution "choosing the latest **attached**/planned scene" at L111; INDEX update "Update `INDEX.md` with the scene row/status" at L237. Verified by reading the SKILL.md this session.
2. SPEC-94 §2 item 3 specifies: drop `status` from the SCN draft; reword `previous_scene_id` to branch-path + `end_page_id` adjacency on the same `branch_id`, excluding superseded `SCN`s (per `supersedes`), with no publication-status reference; render the derived indicator (SPEC-94 §3) at the INDEX step. The reassessed §6 added L19 to the edit list.
3. Cross-skill boundary under audit: the skill consumes the derived publication indicator defined in `story-state-contract.md` by SPEC94SCNPUBSTA-001; the SCN it drafts is validated against `story-scene.schema.json` (SPEC94SCNPUBSTA-002). The `previous_scene_id` field itself remains in the schema (the skill computes what to store).
4. FOUNDATIONS principle motivated: "Rendered prose is non-authoritative; publication state is derived, not stored" — the INDEX render switches from a stored field to a read-time projection, and `previous_scene_id` resolution drops a state that can never be reached (the `attached` disjunct), consistent with the spec's observation that the previous pointer is "a convenience, not authority."

## Architecture Check

1. Resolving `previous_scene_id` by branch-path + `end_page_id` adjacency + supersession is strictly more correct than the status-based rule (the old `attached` disjunct was unreachable); it relies only on durable membership fields already on `SCN`.
2. No backwards-compatibility shim: the skill stops writing `status` outright; it does not write a transitional default.

## Verification Layers

1. Skill writes no `status` on create or refresh → codebase grep-proof (`grep -n "status" SKILL.md` shows no SCN publication-status write).
2. `previous_scene_id` resolution references branch-path/end-page adjacency + supersession with no publication-status disjunct → manual review of the reworded L111 step.
3. INDEX rendering uses the derived indicator → manual review (the L237 step names the §3 derivation, not `SCN.status`).
4. Skill dry-run not required for a prose-only contract edit; the §6 completeness sweep (006) is the cross-cutting proof that no in-scope `SCN.status` reference survives in this skill.

## What to Change

### 1. `existing_scene_id` argument description (L19)

- "Optional SCN-<integer> to supersede when refreshing an existing scene range/status" → "…refreshing an existing scene **range**" (drop "/status").

### 2. Phase 2 + SCN draft (L56, L138–139)

- Phase 2 description "Draft SCN membership record (planned status, …)" → drop the "planned status" clause.
- Remove the `status: planned` line from the SCN record draft (L138–139).

### 3. `previous_scene_id` resolution (L111)

- Reword: resolve by selecting the adjacent prior scene by branch path + `end_page_id` adjacency on the same `branch_id`, excluding superseded `SCN`s (per `supersedes`/supersession), with no reference to a publication status. Keep the "stop for user input if ambiguous" behavior.

### 4. INDEX update (L237)

- Reword "Update `INDEX.md` with the scene row/status" → render the **derived** publication indicator (SPEC-94 §3 / the definition added to `story-state-contract.md` by SPEC94SCNPUBSTA-001) computed from `prose_path`/`receipt_path` presence + receipt `verdict`, not the (now-removed) `SCN.status`.

## Files to Touch

- `.claude/skills/branching-story-scene-plan/SKILL.md` (modify)

## Out of Scope

- The contract markdown (001), the JSON schema + tests (002), prose-attach (004), docs/fixtures (005).
- Any change to the SCN membership fields the skill writes, the patch op vocabulary, or the scene-range validation Phase.
- Any change to the verbatim scene-plan §2/§3/render-time inlining contract (explicitly preserved per SPEC-94 §1).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "status: planned\|range/status\|attached/planned" .claude/skills/branching-story-scene-plan/SKILL.md` returns zero in-scope matches.
2. The reworded `previous_scene_id` step (L111-area) references branch-path/end-page adjacency + supersession and contains no publication-status disjunct.
3. The INDEX step (L237-area) renders the derived indicator, not `SCN.status`.

### Invariants

1. The skill still drafts a valid `SCN` membership record (all required fields except the removed `status`).
2. `previous_scene_id` resolution remains deterministic and stops for user input on ambiguity.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is grep-based and the cross-cutting §6 sweep in SPEC94SCNPUBSTA-006 is the acceptance boundary.`

### Commands

1. `grep -n "status" .claude/skills/branching-story-scene-plan/SKILL.md` (expect no SCN publication-status write/read)
2. The §6 completeness sweep (SPEC94SCNPUBSTA-006) confirms no in-scope `SCN.status` reference survives skill-wide.
