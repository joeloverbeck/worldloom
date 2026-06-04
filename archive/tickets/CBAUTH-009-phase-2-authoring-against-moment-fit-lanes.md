# CBAUTH-009: Add Phase 2 authoring guidance for moment-fit lanes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: CBAUTH-008 (consumes the `moment_fit_lanes[]` working-memory artifact produced by Phase 1 Pass B)

## Problem

CBAUTH-008 lands Phase 1 Pass B emitting `moment_fit_lanes[]` (each with `lane_id`, `source`, and `addressed_by_blocks[]`). Phase 2 draws on Phase 1's planned-block list to author SLT records — but Phase 2's existing prose (`references/phase-2-draft-blocks.md`) does not document how moment-fit lanes inform drafting, only how the legacy pool-wide gap-diagnosis outputs do. Without explicit guidance, an operator authoring against moment-fit lanes will improvise the mapping from `lane_id` to predicate-shape, risking either (a) over-specific blocks that bind branch-local record ids into `global_author_pool` SLT preconditions (Character-Fit Selection Contract §11a violation), or (b) under-specific blocks whose hard preconditions do not actually fire on the moment-signature configuration the lane was named for.

Design `docs/plans/2026-05-30-commitment-block-authoring-moment-signature-design.md` §4 specifies that moment-fit lanes are *shape names* (e.g., `protect_possess_collapse_under_desire`, `negotiation_under_door_or_leash_belief`, `authority_reach_at_offstage_pressure_source`) — each implies a predicate-class + urgency + role + axis shape that the authored block's hard preconditions should match via existential predicates rather than direct record-id binding. This ticket lands the authoring-guidance prose so the operator has a documented translation pattern from lane_id to predicate shape.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` is a flat reference document (H1 only, with bold-labeled paragraphs for each discipline cluster: "Predicate DSL discipline", "Plan / emotion authoring patterns", "Affect-predicate brittleness", "Alias-binding discipline", "Beat discipline", "Schema-minimalism discipline", "Effects-field convention", "allowed_authority default heuristic", "forbidden_resolutions[] defensive-inclusion heuristic"). Verified by direct grep this session. The new authoring-guidance paragraph follows the same bold-label convention.
2. CBAUTH-008's `moment_fit_lanes[]` working-memory shape carries `lane_id` (string, naming the predicate-class+urgency+role+axis shape), `source` (one of `supersession_set | forward_affordance+active_high_salience | cast_role_engagement | move_family_under_represented_at_moment`), and `addressed_by_blocks[]` (SLT ids the operator plans to use to address the lane). Verified by reading CBAUTH-008 draft in this session. This ticket consumes these three fields as drafting inputs.
3. Shared boundary under audit: the existing Character-Fit Selection Contract §11a discipline (in `.claude/skills/_shared-templates/story-state-contract.md`) governing `global_author_pool` SLT existential-predicate usage. This ticket reinforces that discipline at the moment-fit-lane authoring site — the moment-signature is shape extraction, not id binding, and Phase 2 MUST preserve that boundary when translating `lane_id` into hard preconditions.
4. FOUNDATIONS principle under audit: §Story Bundles §5b (Schema-Minimalism — every field load-bearing) + Rule 4 (No Globalization by Accident). The authoring-guidance ensures that moment-anchored depth blocks remain load-bearing (preconditions narrow to the moment's predicate shape, not to a generic move_family that fires on everything) AND remain globally scoped (no branch-local record ids leak into `global_author_pool` preconditions).
5. Adjacent contradiction classification: the existing "Predicate DSL discipline" paragraph already documents that `affordance_available_to` / existential `any_*` predicates are the author-pool / branch-prefix prefilters. The new authoring-guidance paragraph extends this by showing how to translate moment-fit `lane_id` shapes specifically into those existential-predicate forms. Required-consequence elaboration, not a separate bug.
6. The four `source` values from CBAUTH-008 Pass B (`supersession_set | forward_affordance+active_high_salience | cast_role_engagement | move_family_under_represented_at_moment`) each map to a distinct predicate-shape pattern: supersession sources map to `any_<class>_active(<axis-derived filter>)` patterns over the new (post-supersession) record's shape; forward_affordance sources map to predicates that intersect the dominant action_family with the active high-salience configuration; cast_role_engagement sources map to role-keyed predicates (`participant_role` / `holder_role` / `owed_to_role`); move_family_under_represented sources map to predicates that hard-gate the under-represented move_family on the active high-salience record class.

## Architecture Check

1. Cleaner than alternatives: the new guidance lives in the same `phase-2-draft-blocks.md` reference that operators read when drafting blocks. Splitting it into a separate `phase-2b-moment-fit-authoring.md` file would fragment Phase 2 across two references and force the operator to load both — the existing Phase 2 reference is single-file by design (one H1, multiple bold-labeled paragraphs).
2. No backwards-compatibility aliasing/shims introduced: the new paragraph is additive. Existing Phase 2 disciplines (Predicate DSL, alias-binding, beat, schema-minimalism, effects, allowed_authority, forbidden_resolutions) are preserved unchanged.

## Verification Layers

1. Invariant: the new authoring-guidance paragraph documents the lane_id → predicate-shape translation for all four `source` values from CBAUTH-008 Pass B → codebase grep-proof (each of `supersession_set`, `forward_affordance+active_high_salience`, `cast_role_engagement`, `move_family_under_represented_at_moment` is named with at least one worked example predicate shape).
2. Invariant: the guidance reinforces the existential-predicate discipline for `global_author_pool` blocks; branch-scoped blocks (rare in this skill's primary output) may use exact-id predicates per the Character-Fit Selection Contract → codebase grep-proof (the paragraph explicitly cites the existential-predicate discipline and contrasts it with the branch-scoped exact-id carve-out).
3. Invariant: at least one worked example uses a red-bunny-grounded `lane_id` (e.g., `protect_possess_collapse_under_desire`) showing the predicate-shape translation, so an operator authoring against the red-bunny PG-6 baseline can directly apply the pattern → manual review.

## What to Change

### 1. Add §"Authoring against moment-fit lanes" paragraph to phase-2-draft-blocks.md

In `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md`, after the existing "**Alias-binding discipline**" paragraph (around line 51) and before "**Beat discipline**" (around line 53), add a new bold-labeled paragraph titled "**Authoring against moment-fit lanes**". Content covers:

(a) The `moment_fit_lanes[]` working-memory artifact from CBAUTH-008 Pass B carries `lane_id` (predicate-class+urgency+role+axis shape name), `source` (one of four values), and `addressed_by_blocks[]` (planned SLT ids targeting the lane). Phase 2 reads each lane and translates its shape into the authored block's hard preconditions.

(b) Per-source translation patterns:

- **`supersession_set` source** (lane named after a just-shifted topology axis, e.g., `protect_possess_collapse_under_desire`): translate to existential predicates over the *new* (post-supersession) record's shape. Example for THR-4 (supersedes THR-1, axis "protect/possess collapse"): hard preconditions `any_thread_active(alias=collapse_thread, tag~="protect", urgency=high)` + `any_relationship_axis(axis=desire, value=high, participant_role=primary_actor)`. The new record's id (THR-4) is NOT bound directly into the precondition — the existential predicate matches any active thread whose shape fits the supersession axis. Branch-scoped variants may use exact-id predicates per Character-Fit Selection Contract §11a.

- **`forward_affordance+active_high_salience` source** (lane named after a dominant action_family + active pressure axis, e.g., `negotiation_under_door_or_leash_belief`): translate to existential predicates that intersect the named action_family with the active high-salience set. Example: `any_belief(alias=door_or_leash, holder_role=primary_actor, mode=believes, truth_relation=partly_true)` + `any_intention(alias=open_intent, holder_role=primary_actor)`. Then populate `exit_options[]` with at least one entry whose `action_family` matches the dominant family the lane named (`negotiate` in this example).

- **`cast_role_engagement` source** (lane named after an STENT role exercised by the moment with no engaging SLT, e.g., `authority_reach_at_offstage_pressure_source`): translate to role-keyed predicates. Example for an `authority` role unengaged at moment: hard preconditions `any_relationship_axis(axis=obligation, comparator=">=", value=medium, participant_role=authority)` OR `any_obligation_open(alias=authority_debt, owed_to_role=authority)`. The role-filter is the load-bearing element; the predicate matches any active record fitting the role.

- **`move_family_under_represented_at_moment` source** (lane named `move_family_under_represented_at_moment:<move_family>`, e.g., `move_family_under_represented_at_moment:disclosure`): translate by setting the block's `move_family` to the named value AND adding hard preconditions that intersect the under-represented move_family with the active high-salience record class. Example for disclosure: `move_family: disclosure` + hard `any_secret_unrevealed(alias=hidden_secret, salience=high)`.

(c) Discipline reminders: the moment-signature is shape extraction, NOT id binding. `global_author_pool` SLT preconditions MUST use existential predicates (`any_*`, role-filter forms) — never `record_active(THR-4)` or `belief_record(holder, BEL-14, ...)` against a branch-local record id. Branch-scoped (`branch_scoped` / `branch_prefix_scoped`) SLTs may use exact-id predicates when the specific record's stable authority is the reason the block exists; the Character-Fit Selection Contract §11a is authoritative. The `addressed_by_blocks[]` field is a planning artifact — the actual SLT records' shape is what makes them load-bearing for the lane.

(d) When multiple moment-fit lanes apply to one block, prefer authoring against the highest-source-priority lane (cast_role_engagement > supersession_set > forward_affordance+active_high_salience > move_family_under_represented_at_moment) and add the secondary lane's shape as a soft precondition or an `exit_options[]` shape touch. Author judgment overrides the priority when the block's intended runtime semantics dictate.

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` (modify — new "**Authoring against moment-fit lanes**" bold-labeled paragraph between "**Alias-binding discipline**" and "**Beat discipline**")

## Out of Scope

- Pre-flight step 4(iii) and the moment_signature artifact — CBAUTH-007 lands those.
- Phase 1 Pass B and the moment_fit_lanes[] working-memory output — CBAUTH-008 lands those.
- Phase 5 batch-manifest moment-signature inline-prose section — CBAUTH-010 lands that.
- Phase 3 validation gates. The 6 gates are lens-agnostic; moment-fit-lane authored blocks pass or fail by the same schema/predicate/branch-scope/firewall/effect-legality/exit-grounding checks as any other block.
- Phase 4 batch-diversity gates. The 4 checks are not relaxed for moment-fit-lane authoring; move-family / recovery / belief-or-relationship / no-branch-local-dependencies enforcement is preserved.
- A new heuristic that scores moment-fit lanes against pool-wide depth-criteria lanes (CBAUTH-005's depth-criteria lanes are computed from the pool projection; moment-fit lanes are computed from the pool projection + moment signature; the two can co-exist as labels per CBAUTH-008's per-block label vocabulary extension).
- `audit_repair` mode. Moment-fit-lane authoring is `direct_batch`-only; `audit_repair` consumes RSP cards which already prescribe targets.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Authoring against moment-fit lanes\|moment_fit_lane\|lane_id" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` returns the new paragraph with the title, the working-memory artifact reference, and the lane_id field reference.
2. `grep -n "supersession_set source\|forward_affordance+active_high_salience\|cast_role_engagement source\|move_family_under_represented_at_moment source" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` returns the per-source translation pattern for all four `source` values from CBAUTH-008.
3. `grep -n "protect_possess_collapse_under_desire\|any_thread_active.*protect\|any_belief.*door_or_leash\|any_relationship_axis.*authority\|any_secret_unrevealed.*high" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` returns at least one red-bunny-grounded worked example predicate-shape translation per source value.
4. Skill dry-run on `erotica-world / red-bunny` (PG-6 baseline) with `direct_batch` defaults: when Phase 1 Pass B emits moment_fit_lanes, confirm the authored SLT records' hard preconditions use existential predicates matching the lane_id shapes, with NO branch-local record ids (THR-4 / BEL-14 / SREL-6) bound directly into `global_author_pool` block preconditions. Verify by reading the authored SLT YAML files' `preconditions.hard[]` against the lane_id-to-predicate-shape patterns documented in the new paragraph.

### Invariants

1. `global_author_pool` SLT preconditions authored against moment-fit lanes MUST use existential predicates (`any_*`, role-filter forms); branch-local record ids MUST NOT be bound directly (Character-Fit Selection Contract §11a; FOUNDATIONS Rule 4 No Globalization by Accident).
2. Each authored moment-fit-lane block's hard preconditions MUST narrow to the moment's predicate shape (predicate-class + urgency + role + axis); generic move_family-only gating without precondition narrowing is NOT a moment-fit authoring (FOUNDATIONS §Story Bundles §5b — every record load-bearing).
3. The new paragraph documents lane_id → predicate-shape translation for all four `source` values from CBAUTH-008 Pass B; an operator authoring against any Pass B output can find the matching translation pattern in the reference (no improvisation required).
4. The `addressed_by_blocks[]` field from Pass B is a planning artifact (Phase 1 output); the load-bearing element is the authored SLT records' precondition shape (Phase 2 output) — these MUST agree (the planned-block id appears in the lane's addressed_by_blocks AND the authored block's preconditions fire on the lane's shape).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and skill-dry-run-based per Acceptance Criteria. The new paragraph is prose elaboration consuming an existing working-memory artifact from CBAUTH-008; no automated test surface is added.`

### Commands

1. `grep -n "Authoring against moment-fit lanes\|lane_id\|supersession_set source\|forward_affordance+active_high_salience\|cast_role_engagement source\|move_family_under_represented_at_moment source" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md`
2. `grep -n "protect_possess_collapse_under_desire\|any_thread_active.*protect\|any_belief.*door_or_leash\|any_relationship_axis.*authority\|any_secret_unrevealed.*high" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md`
3. Skill dry-run on `erotica-world / red-bunny` (PG-6 baseline) with `direct_batch` defaults; inspect authored SLT records' `preconditions.hard[]` field for existential-predicate usage matching the lane_id shapes; verify no branch-local record ids (THR-4 / BEL-14 / SREL-6) bound directly in `global_author_pool` SLT preconditions.
