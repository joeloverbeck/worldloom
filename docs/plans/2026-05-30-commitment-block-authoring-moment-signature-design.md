# Commitment-Block-Authoring Moment-Signature Design

**Date**: 2026-05-30
**Classification**: story-canon-related (modifies a story-pipeline skill whose output is SLT records under `_source/storylets/`)
**Source brainstorm**: in-conversation brainstorm on adding moment-aware diagnostic to `commitment-block-authoring` Phase 1
**Target skill**: `.claude/skills/commitment-block-authoring`

## Context

`commitment-block-authoring` runs `direct_batch` Phase 1 as a *pool-wide* coverage projection across 17 targets (14 causal-function + cast-role + 2 SPEC-80 composition) with a depth-criteria checklist of 6 lanes that fires only when the pool is target-saturated. All passes compute from the pool projection alone — none reads the latest committed PG, the parent SE's resolution kind, the just-emitted CHCs, or the just-superseded records.

The user's invocation pattern — "run this skill regularly whenever something happens in a story that isn't exactly the kind of thing that has happened already" — names an *adaptive trigger* the current Phase 1 does not support. Concrete example: when Jon offers Ane a restaurant in Puiana with a listening door (red-bunny PG-6), THR-1 → THR-4 supersession collapses protect/possess into a single face, BEL-12 → BEL-14 re-frames the offer as door-or-leash, and CHC-26..30 emit a `communicate + protect`-dominant affordance set. The current Phase 1 has no way to ask whether the existing 31-SLT pool fits THAT moment specifically.

The chosen approach (Approach C from the brainstorm) computes a **moment signature** at pre-flight and feeds it into Phase 1 as a third input pass — composing with the existing 17-target diagnosis and depth-criteria checklist rather than displacing them. When the pool is well-fit to the moment, an actionable early-termination verdict short-circuits the skill.

## 1. Overview

Phase 1 of `commitment-block-authoring` becomes moment-aware: pre-flight computes a moment signature from the latest committed PG, and the signature flows into Phase 1's existing 17-target gap diagnosis as a third input pass. Output is a single Phase 1 diagnostic reporting both pool-wide gaps (unchanged) AND moment-fit gaps (new), with depth-criteria lanes augmented by a `moment_fit:<lane>` family. When the pool is already well-fit to the moment, the saturated-pool advisory escalates to an actionable "moment-already-covered" verdict that emits early-termination through the Phase 6 HARD-GATE.

## 2. Architecture / Structure

The change is bounded to two extension points:

**(a) Pre-flight Check** — add step `4(iii) compute moment signature` between step 4(ii)'s eligibility-shortlist load and step 5's id allocation. Reads the latest committed PG + parent SE + just-emitted CHCs + the supersession set across recent records. Output: working-memory `moment_signature` object consumed by Phase 1. Pure projection from already-loaded state plus 1-3 targeted MCP retrievals; no new schema, no patch ops.

**(b) Phase 1 diagnosis** — extends `coverage_diagnosis` output (per `references/phase-1-coverage-diagnosis.md` §Output shape) with three new fields: `moment_signature` (echoed for audit-trail), `moment_fit_lanes: [...]`, and `pool_saturation` becomes a three-state enum (`false | pool_only | moment_and_pool`) where the third value drives the §5 actionable early-exit.

The skill's `mode` argument is unchanged. `audit_repair` is unaffected — the signature is computed only for `direct_batch`. The moment-fit pass is *skipped with a logged reason* when no committed PG exists yet (immediately after `branching-story-bootstrap` before the first `turn-cycle` commits PG-2).

## 3. Moment-signature shape

Working-memory YAML, centered on the present configuration at the latest committed PG, with two auxiliary subsystems for supersession evidence and forward-pointing affordances:

```yaml
moment_signature:
  parent_page: PG-N
  parent_event: SE-N
  parent_event_kind: turn_resolution
  parent_event_resolution: player_write_in     # player_action | player_write_in | npc_action | clock_fire | offstage_action | secret_reveal | world_pressure | multi_actor_collision

  active_high_salience_records:                # the present configuration the next block will hard-gate on
    threads: [THR-4]                           # urgency >= high
    obligations: [OBL-1]                       # urgency >= medium
    consequences: []                           # urgency >= high
    clocks: [CLK-2]                            # salience >= high
    secrets: [STSEC-1]                         # salience >= high AND status == hidden
    story_questions: []                        # salience >= high AND status == open
    relationships_high: [SREL-1, SREL-2, SREL-3]
    beliefs_active: [BEL-14, BEL-13, BEL-7]    # currently-authoritative BEL (post-supersession)

  supersession_set:                            # first-class: the just-shifted topology
    - {old: THR-1, new: THR-4, shifted_at: PG-6, axis: "protect/possess collapse"}
    - {old: BEL-12, new: BEL-14, shifted_at: PG-6, axis: "door-or-leash framing"}
    - {old: SREL-5, new: SREL-6, shifted_at: PG-4, axis: "fear re-set on disclosed desire"}
  supersession_window_pages: 3                 # how far back the scan walks (configurable arg; min 1, max 8)

  forward_affordance_fingerprint:              # forward-looking: what the just-emitted CHCs allow next
    parent_page_choices: [CHC-26, CHC-27, CHC-28, CHC-29, CHC-30]
    action_family_distribution:
      communicate: 5
      protect: 3
      negotiate: 1
      persuade: 2
      control: 1
      bond: 1
      investigate: 1
      evade: 1
      move: 1
    dominant_action_families: [communicate, protect]      # >= 40% of emitted CHCs
    outlier_action_families: [persuade, control, bond, evade, move]

  cast_role_engagement_at_moment:              # which STENT roles the present configuration is exercising
    pressure_source: [STENT-3]                 # via THR-2 / SREL-3
    opposing_actor: []
    authority: [STENT-3]
    dependent: [STENT-2]
    information_source: [STENT-2]
```

**Discipline**: shape extraction, not id binding. Downstream Phase 1 / Phase 2 use the signature to compute existential-predicate shapes (`any_thread_active(urgency=high)`, `any_belief(holder_role=primary_actor, mode=believes, truth_relation=partly_true)`); they do NOT bind THR-4 / BEL-14 / SREL-6 directly into `global_author_pool` SLT preconditions. Branch-scoped SLTs may still use exact-id predicates per the Character-Fit Selection Contract — the signature does not change that rule.

## 4. Phase 1 modifications

Phase 1's two existing passes gain a third between them:

**Pass A (unchanged)** — 17-target coverage diagnosis against pool projection. Output: `coverage_diagnosis` array (existing schema).

**Pass B (new) — moment-fit gap diagnosis:**

1. For each `move_family` value, count pool SLTs that hard-fire on the signature's `active_high_salience_records` (hard precondition referencing one of those record's classes, urgencies, or role-filters).
2. For each `supersession_set` entry, check whether the pool carries a block whose hard preconditions match the *new* record's shape (e.g., for THR-4: any pool SLT hard-gating on `any_thread_active(tag~="protect", urgency=high)` AND `any_relationship_axis(axis=desire, value=high)`). If zero, emit a `moment_fit_lane` named after the supersession axis (`protect_possess_collapse_under_desire`).
3. For each `dominant_action_family` in `forward_affordance_fingerprint`, check pool SLTs whose `exit_options[].action_family` includes that family AND whose hard preconditions intersect the active high-salience set. If under-represented, emit a `moment_fit_lane`.
4. For each non-empty `cast_role_engagement_at_moment` entry, check whether a pool SLT names that role in a precondition role-filter (per existing cast-role determinism rule). Augments target #15 with moment-anchored urgency — a role exercised by the signature with no engaging SLT IS a moment-fit gap; a role unengaged-by-the-moment that has a pool block hard-gating on it elsewhere is NOT.

**Pass C (modified) — depth-criteria checklist + saturation verdict:**

- Existing 6 depth lanes still apply (`action_family_combo` / `specific_pressure_shape` / `single_block_move_family` / `action_family_single_block` / `paired_pressure_shape` / `hard_grounding_lane`).
- New `moment_fit:<lane>` family populated from Pass B.
- `pool_saturation` becomes `false` (Pass A or B found gaps), `pool_only` (Pass A clean, Pass B clean, depth lanes available but no moment-anchored need), or `moment_and_pool` (everything clean) — the third value triggers §5 actionable early-exit.

Pass B working-memory output:

```yaml
moment_fit_diagnosis:
  signature: <embedded moment_signature>
  moment_fit_lanes:
    - {lane_id: "protect_possess_collapse_under_desire", source: supersession_set, addressed_by_blocks: [SLT-NEW-2]}
    - {lane_id: "negotiation_under_door_or_leash_belief", source: forward_affordance + active_high_salience, addressed_by_blocks: [SLT-NEW-4]}
    - {lane_id: "authority_reach_at_offstage_pressure_source", source: cast_role_engagement, addressed_by_blocks: []}
  moment_signature_skipped: false
  moment_signature_skip_reason: null
```

## 5. Adaptive early-exit semantics

When Pass C's `pool_saturation` resolves to `moment_and_pool`, Phase 1 emits an early-termination verdict rather than auto-reducing `target_count` to 0 and round-tripping through empty Phases 2-5:

```yaml
early_termination:
  fired: true
  reason: moment_already_covered            # | pool_saturated_no_focus (existing advisory escalated)
  examined:
    pool_targets_covered_hard: 17
    moment_fit_lanes_examined: [...]
    moment_fit_lanes_already_covered: [...]
  suggested_overrides:
    - {invocation: "focus='<lane-name>'", effect: "author depth blocks targeting that moment lane"}
    - {invocation: "target_count=<N>", effect: "author N depth blocks despite moment coverage"}
```

**Firing conditions**: (a) `pool_saturation == "moment_and_pool"`, AND (b) no `focus` hint supplied, AND (c) `target_count` either defaulted to 6 OR not supplied. If the operator supplied `target_count` explicitly OR supplied `focus`, they have signaled intent; the skill proceeds normally with a strong advisory in the Phase 6 deliverable summary.

**Phase 6 behavior under early-termination**: HARD-GATE still fires, but the deliverable summary shows the verdict, examined lanes, and suggested-override invocations — no SLT records drafted, no SLB manifest, no patch envelope. User approval at this gate means "acknowledge the no-batch verdict and end the skill cleanly"; user rejection (or counter-instruction with override) re-runs the skill with the override args. The HARD-GATE remains the single approval surface, avoiding implicit no-op writes.

## 6. Data flow at pre-flight

New pre-flight step `4(iii) compute moment signature`:

```
4(iii).1 resolve parent_event_id from latest committed PG-N.resolved_event       # no MCP call; field already loaded
4(iii).2 mcp__worldloom__get_record(record_id=parent_event_id)                   # 1 retrieval -> SE body
                                                                                  # extract kind, resolution_kind, effects
4(iii).3 filter PG-N state snapshot (already loaded) for active_high_salience_records:
           - threads:       urgency >= high
           - obligations:   urgency >= medium
           - consequences:  urgency >= high
           - clocks:        salience >= high
           - secrets:       salience >= high AND status == hidden
           - story_questions: salience >= high AND status == open
           - relationships: value >= high
           - beliefs:       currently-authoritative (no superseded_by)
         (filter operates on context_packet surface; if a field is absent,
          fall back to targeted get_records for the needed urgency/salience values)
4(iii).4 mcp__worldloom__list_records(record_type='choice_record',                # 1 retrieval -> just-emitted CHCs
           filter={parent_page: PG-N})
         compute action_family_distribution from CHC.action_families[];
         compute dominant_action_families (>= 40% threshold) and outlier_action_families
4(iii).5 supersession scan across window:
         for each record class in {threads, beliefs, relationships, obligations, consequences, clocks}:
           mcp__worldloom__list_records(record_type=<class>,                      # 1 retrieval per class (6 max)
             filter={supersedes_not_null: true,
                     shifted_at_page in [PG-(N-window) .. PG-N]})
           emit {old, new, shifted_at, axis: <inferred from new record's title|kind>}
         supersession_window_pages defaults to 3
4(iii).6 compute cast_role_engagement_at_moment by walking active_high_salience_records:
         for each record, resolve participants[] -> STENT ids -> STCHAR.role_in_story
         (uses STCHAR summaries already loaded at pre-flight step 5; no new retrieval)
4(iii).7 assemble moment_signature working-memory object; emit to Phase 1 input
```

**Retrieval-budget impact**: +8 MCP calls worst case (1 SE + 1 CHC list + 6 supersession scans), realistically 4-6.

**New optional skill argument** (added to `direct_batch` mode):

- `supersession_window_pages` — integer; default 3, min 1, max 8. Controls how far back the supersession scan walks. Defaults match `branching-story-health-audit`'s recent-activity scan defaults.

## 7. Edge cases

- **No committed PG (post-bootstrap)**: skip moment-signature computation; Phase 1 runs as today (pool-wide only); deliverable summary notes `moment_signature_skipped: true, reason: "no committed PG (post-bootstrap)"`. No early-termination possible — bootstrap-time pools are by definition under-covered.
- **Bundle has only PG-1 (root only)**: PG-1 carries `story_start` SE; supersession_set is empty; forward_affordance_fingerprint reflects PG-1's initial CHC set. Signature still computes; Pass B step 2 emits no lanes; steps 1 / 3 / 4 still operate.
- **Supersession scan crosses a branch fork**: when latest PG is on BR-2 (forked from BR-1), walk BR-2's ancestor chain into BR-1 if window depth requires. Use bundle's branch graph (already loaded via `story_bundle_context`).
- **Multiple competing supersessions on the same record** (e.g., CLK-1 → CLK-2 at PG-2, then CLK-2 → CLK-3 at PG-5 within window): emit each transition as a separate `supersession_set` entry.
- **CHCs not yet emitted at the latest PG**: rare; if `list_records` returns empty, `forward_affordance_fingerprint` is empty and Pass B step 3 has no input. Log and continue.
- **Multi-branch bundles**: signature computed for the latest committed PG across all branches. When multiple branches have parallel recent commits, prefer the branch the operator's invocation context most recently touched (derivable from latest SE). Note chosen branch in deliverable summary for transparency.
- **`focus` overrides moment-signature**: when operator supplies `focus="..."` AND moment-signature suggests a different lane is more urgent, `focus` wins. Phase 6 summary surfaces both: chosen focus AND a "moment-signature would have recommended `<lane>`" audit-trail note.
- **Saturated-and-moment-covered with explicit `target_count`**: early-termination does NOT fire — operator signaled depth-fill intent. Strong advisory in Phase 6 summary noting pure depth-fill against moment-covered pool.
- **Phase 2 / 3 / 4 implications**: signature is *input* to Phase 2 (authoring draws on `moment_fit_lanes` as guidance) and to the Phase 6 deliverable-summary's lane labels; it is NOT input to Phase 3 validation (the 6 schema/predicate gates are lens-agnostic) and does NOT relax Phase 4 batch-diversity requirements (move-family / recovery / belief-or-relationship coverage still enforced).
- **`audit_repair` mode**: signature not computed; RSP cards already prescribe authoring targets.

## 8. Testing strategy

Skill-design deliverables have no unit-test infrastructure; testing is by invocation against story bundles with known state, with verification by human inspection of Phase 6 deliverable summaries.

| # | Test case | Expected behavior |
|---|---|---|
| 1 | Red-bunny PG-6 replay, no args | Signature populates: supersession_set [THR-1→THR-4, BEL-12→BEL-14, SREL-5→SREL-6], dominant_action_families [communicate, protect], active high-salience [THR-4, OBL-1, CLK-2, STSEC-1, SREL-1..3, BEL-14, BEL-13, BEL-7]. Either early_termination fires (verify verdict, examined lanes, suggested overrides) OR moment_fit_lanes emit and Phase 2 drafts against them (verify deliverable summary labels). |
| 2 | Bootstrap-only bundle (no committed PG) | `moment_signature_skipped: true`; Phase 1 runs as today. |
| 3 | PG-1-only bundle | Signature computes; supersession_set empty; forward_affordance reflects PG-1's CHC set; Pass B steps 1/3/4 operate; step 2 emits no lanes. |
| 4 | Multi-branch supersession (BR-2 forked from BR-1) | Supersession scan walks BR-2 ancestor chain into BR-1 when window depth requires; entries carry correct `shifted_at_page` across fork. |
| 5 | Explicit `focus="negotiation under door-or-leash belief"` on red-bunny PG-6 | Focus wins; deliverable summary surfaces moment-signature's recommendation as audit-trail note; no early-termination. |
| 6 | Explicit `target_count=4`, moment-covered pool | Early-termination does NOT fire; advisory in deliverable summary notes pure depth-fill intent. |
| 7 | `audit_repair` mode | Signature not computed; behavior identical to today. |
| 8 | `supersession_window_pages=1` on red-bunny PG-6 | Only PG-6's own supersessions (THR-1→THR-4, BEL-12→BEL-14) in set; SREL-5→SREL-6 (shifted at PG-4) excluded. |

## 9. FOUNDATIONS alignment

| Principle | Stance | Mechanism |
|---|---|---|
| §Story Bundles §5b (Schema-Minimalism) | aligns | Moment-fit lens introduces no new SLT schema fields; signature is working-memory only. Early-termination verdict guards against authoring non-load-bearing depth blocks against an already-moment-covered pool — directly serves §5b's "every field load-bearing → every block load-bearing" generalization. Surface: authoring time + schema-constraint. |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape — "Driver salience is local") | aligns | The moment-signature is a *local-salience read of the present configuration* at the latest committed PG. It explicitly does NOT compute a target narrative shape, look ahead to dramatic obligations, or score against arc position. This is the authoring-time analogue of §5c's prior local-salience-ranking pass for driver selection at runtime. Surface: authoring time (Phase 1 diagnosis). |
| Rule 5 (No Consequence Evasion) | aligns | Supersession set's first-class status makes shifted-topology records visible to Phase 1; the just-superseded record's NEW shape gets evaluated for hard-firing pool coverage. Foundational-capacity targets (recovery, consequence-resolution) keep their existing carve-out — under-representation is still gap-eligible regardless of momentary activity. Surface: authoring time. |
| Rule 7 (Preserve Mystery Deliberately) | aligns | The `active_high_salience_records.secrets[]` field surfaces hidden STSEC ids as moment-anchored authoring lanes when the pool under-covers them, advancing reveal-discipline rather than retracting it. Mystery Reserve firewall (Phase 3 gate 4) and `mystery_policy.allowed_authority` per-block discipline unchanged. Surface: authoring time. |
| §Story Bundles §6.1 (Story-Local Character Authority) + Character-Fit Selection Contract §11a | aligns | Signature is shape-extraction not id-binding; Phase 2 uses signature to compute existential predicates, never binds THR-4 / BEL-14 / SREL-6 directly into `global_author_pool` SLT preconditions. The `cast_role_engagement_at_moment` field reads STCHAR `role_in_story` (story-local authority); world CHAR records are not touched. Surface: schema constraint preserved. |
| §Tooling Recommendation (machine-facing retrieval) | aligns | All moment-signature inputs come through MCP retrieval surfaces (`get_record`, `list_records`, `story_bundle_context`); no raw `Read` of `_source/` records. Surface: pre-flight discipline. |
| HARD-GATE discipline | aligns | Phase 6 HARD-GATE behavior unchanged. Early-termination's no-write verdict is still a HARD-GATE-blocked moment — user explicitly approves "no batch" rather than the skill silently terminating. Surface: HARD-GATE prose. |
| Rule 4 (No Globalization by Accident) | N/A (defensive disclosure) | Signature includes branch-local record ids (THR-4, BEL-14, etc.) in working memory only; these never reach `global_author_pool` SLT preconditions per the existential-predicate discipline above. The signature itself is per-invocation working memory, not a written artifact. |

## 10. Implementation notes

**Files to touch:**

1. `.claude/skills/commitment-block-authoring/SKILL.md` —
   - Pre-flight Check section: add bullet for step `4(iii) compute moment signature` (cross-reference `references/pre-flight-and-prerequisites.md`).
   - Inputs § Mode-specific § `direct_batch`: add new optional `supersession_window_pages` arg (default 3, min 1, max 8).
   - Process Flow ASCII diagram: insert "compute moment signature" caption inside the Pre-flight box.
   - Phase 6 HARD-GATE deliverable-summary bullet list: add `moment_signature` echo, `moment_fit_lanes`, and `early_termination` state as required summary items.

2. `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` —
   - Add new sub-section §"Pre-flight Check step 4(iii) — compute moment signature" with the 7-step procedure from §6 above.
   - Update §World-State Prerequisites list to include moment-signature inputs (latest PG state snapshot, parent SE body, just-emitted CHC ids).

3. `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` —
   - Add new §"Pass B — Moment-fit gap diagnosis" with the 4-step Pass B procedure.
   - Update §"Saturated-pool advisory" → §"Saturation verdict (three-state)" describing the new `pool_saturation` enum and the early-termination escalation.
   - Extend §"Output shape" YAML to include `moment_signature`, `moment_fit_diagnosis`, and `early_termination` blocks.
   - Cross-reference §"Depth-criteria checklist for saturated-pool authoring" to note the new `moment_fit:<lane>` lane family alongside the existing 6 lanes.

4. `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` —
   - Add §"Authoring against moment-fit lanes" describing how `moment_fit_lanes[].lane_id` is used as drafting guidance, with the existential-predicate discipline preserved per the Character-Fit Selection Contract.

5. `.claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` —
   - Add to manifest template a "Moment signature" inline-prose section (prose, not YAML) summarizing: source PG, parent SE, supersession axes, dominant action families, and the `moment_fit_lanes` addressed by this batch.

6. `.claude/skills/commitment-block-authoring/references/governance-and-foundations.md` (optional) —
   - Add §Story Bundles §5c row to the FOUNDATIONS Alignment table noting the authoring-time analogue of the local-salience-ranking principle.

**Files NOT touched (explicit non-scope):**

- `.claude/skills/_shared-templates/story-state-contract.md` — SLT schema and predicate DSL unchanged.
- `.claude/skills/_shared-templates/story-record-schemas.md` — record schemas unchanged.
- `tools/world-mcp/`, `tools/world-index/`, `tools/validators/` — no new patch op, no new validator, no new schema, no new index field. Design rests entirely on existing MCP surfaces.
- `docs/FOUNDATIONS.md` — no new principle introduced.
- `.claude/skills/commitment-block-authoring/references/phase-3-4-validation.md`, `phase-6-envelope-skeleton.md` — Phase 3 / Phase 4 validation gates are lens-agnostic.

**Dependencies to verify before implementation:**

- `mcp__worldloom__list_records(record_type=<class>, filter={supersedes_not_null: true, ...})` — confirm supersedes-filter shape. Fallback if unsupported: `list_records(record_type=<class>)` + client-side filter.
- `mcp__worldloom__list_records(record_type='choice_record', filter={parent_page: PG-N})` — confirm parent_page filter shape. Fallback: read CHC ids from latest PG's state snapshot and `get_records` with explicit id list.

Neither dependency adds new MCP capability — both are existing-surface verifications with client-side fallbacks.

**Invocation example (red-bunny post-implementation):**

```
/commitment-block-authoring world_slug=erotica-world story_slug=red-bunny mode=direct_batch

# Phase 6 deliverable summary preview (illustrative):
#   moment_signature.parent_page: PG-6
#   moment_signature.parent_event: SE-6 (turn_resolution, player_write_in)
#   moment_signature.supersession_set:
#     - THR-1 -> THR-4 @ PG-6 (axis: protect/possess collapse)
#     - BEL-12 -> BEL-14 @ PG-6 (axis: door-or-leash framing)
#     - SREL-5 -> SREL-6 @ PG-4 (axis: fear re-set on disclosed desire)
#   moment_signature.dominant_action_families: [communicate, protect]
#   moment_fit_lanes_examined: [protect_possess_collapse_under_desire,
#                               negotiation_under_door_or_leash_belief,
#                               authority_reach_at_offstage_pressure_source]
#   pool_saturation: pool_only
#   target_count: 6
#   early_termination: not fired
#   recommendation: author 3-6 blocks targeting the named moment_fit_lanes,
#                   weighted toward communicate+protect dominant families
```

## Out of scope

- Story-state schema or predicate-DSL extensions.
- Changes to `audit_repair` mode.
- Cross-skill chaining (this skill still never invokes `turn-cycle`, `health-audit`, etc.).
- Automated validator support for the moment-signature shape (it is working-memory only).
- Persistence of the moment-signature artifact to disk (echoed in the Phase 6 deliverable summary; not written to SLB manifest schema beyond inline prose).
