---
name: branching-story-prose-attach
description: "Use when validating and attaching user-supplied rendered prose to an already-committed page in a branching-story bundle. Produces: pages-prose-receipts/PG-<integer>.yaml receipt + bundle INDEX.md update + optional SE-<integer> event (only when emit_attach_event=true). Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: page_id
    description: "PG-<integer> whose plan + prose pair is being validated"
    required: true
  - name: strict
    description: "true | false; default false. When true, a FAIL verdict blocks the bundle INDEX publication marker; the receipt is still written."
    required: false
  - name: run_craft_critic
    description: "true | false; default false. When true, runs an LLM-based qualitative craft critic over the prose; verdict contributes to receipt's craft_critic field."
    required: false
  - name: accept_plan_drift
    description: "true | false; default false. When false, a mismatch between PG.plan.plan_hash / state_hash and computed values fails the receipt; when true, drift is recorded in receipt notes without forcing fail. Drift is NEVER written to the PG record."
    required: false
  - name: emit_attach_event
    description: "true | false; default false. When true, emits one SE-<integer> with event_kind: prose_attach. This is the ONLY way prose-attach mutates atomic story-bundle records, and it is opt-in."
    required: false
---

# Branching Story Prose Attach

Validate user-supplied rendered prose against an already-committed page's plan + state and emit a structured receipt; never mutate the page record or create ARC_TRACE.

<HARD-GATE>
Do NOT write `pages-prose-receipts/<page_id>.yaml`, update `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, OR submit any patch plan to `mcp__worldloom__submit_patch_plan` (when `emit_attach_event: true`), until:

(a) Pre-flight Check has completed: bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; `STORY_KERNEL.md` loaded, including `## Player Agency Contract`; page loaded from `_source/pages/<page_id>.yaml`; plan + prose pair verified at `pages-prose-plans/<page_id>.md` + `pages-prose/<page_id>.md`; `pages-prose-receipts/` directory present (idempotent `mkdir -p` if absent); `SE` id allocated via `mcp__worldloom__allocate_next_id` only when `emit_attach_event: true`.

(b) Phases 1-5 have completed in working memory: plan body + prose body + PG record + `STORY_KERNEL.md` Player Agency Contract + forbidden mysteries (from plan §11) loaded; computed `plan_hash` + `state_hash` + `prose_hash` derived; `hash_integrity` check applied per `accept_plan_drift`; 8 deterministic checks complete per `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 (hash_integrity, engine_jargon_leak, forbidden_mystery_resolution, required_event_rendered, choice_consequence_visibility, entity_status_consistency, invented_structural_fact, canon_claim_without_authority), including the required_event_rendered CLK tick and STSEC reveal subchecks below; optional craft critic complete (7 axes) only when `run_craft_critic: true`; roll-up `verdict` (PASS | WARN | FAIL) derived; `repair_recommendation` derived per the four-outcome ladder.

(c) The user has explicitly approved the deliverable summary (receipt path, per-check verdict table, roll-up verdict, repair_recommendation, strict-mode publication-blocking decision if applicable, optional SE-<integer> id + patch op preview when `emit_attach_event: true`).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contract; resolve bundle;
  load STORY_KERNEL.md Player Agency Contract; resolve page; verify plan
  + prose pair; ensure pages-prose-receipts/ exists; allocate SE id only
  if emit_attach_event=true)
        |
        v
Phase 1: Pair plan + page + prose (load PG, STORY_KERNEL.md Player Agency
                                   Contract, plan body, prose body, forbidden
                                   mysteries from plan §11, recorded hashes;
                                   compute fresh hashes)
        |
        v
Phase 2: Hash integrity check (computed vs recorded plan_hash + state_hash;
                               hash_integrity FAIL unless
                               accept_plan_drift=true; record drift in
                               receipt notes, never in PG)
        |
        v
Phase 3: Deterministic checks (8 checks per shared contract §4.6)
        |
        v
Phase 4: [optional] Craft critic (7 axes; only when run_craft_critic=true)
        |
        v
Phase 5: Compute verdict + repair_recommendation
        |
        v
Phase 6: HARD-GATE fires → write receipt + update INDEX
                          (+ optional create_se_record patch)
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`
- `page_id` — `PG-<integer>` — page whose plan + prose pair is validated

### Optional

- `strict` — `true | false` — default `false`. Blocks INDEX publication marker on FAIL.
- `run_craft_critic` — `true | false` — default `false`. Engages qualitative craft critic.
- `accept_plan_drift` — `true | false` — default `false`. Tolerates plan_hash / state_hash mismatch.
- `emit_attach_event` — `true | false` — default `false`. Emits one `SE-<integer>` with `event_kind: prose_attach`.

## Output

- `pages-prose-receipts/<page_id>.yaml` — Always (the receipt; direct-write YAML per shared contract §4.6)
- Bundle `INDEX.md` — Always (updated with prose status + receipt verdict)
- `SE-<integer>.yaml` — IF `emit_attach_event: true` (single-op patch plan via `create_se_record`)

Atomic-record writes (the optional `SE-<integer>`) route through `mcp__worldloom__submit_patch_plan`. Receipt and INDEX writes are direct after HARD-GATE approval.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles §4a (Plan-Authority Boundary), §5b (Schema-Minimalism), §9 (Prose Length Discipline) govern this skill
- `.claude/skills/_shared-templates/story-state-contract.md` — §7 hard gates (gate 3 redundantly enforced on rendered prose); §8 page plan minimum contract (the 19 numbered sections plus optional §9b / §9c / §10b that prose-attach reads when present)
- `.claude/skills/_shared-templates/story-record-schemas.md` — §4.6 receipt schema (canonical and mirrored by `prose_receipt_schema_compliance`)
- `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.17 / §4.5.18 and `.claude/skills/_shared-templates/story-state-contract.md` §5a / §8 — STPLAN/STEMO record labels, tag grammar, and page-plan §9b / §9c constraints prose-attach validates when present
- `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` — bundle root contract; `## Player Agency Contract` is load-bearing for agency-surface consistency
- `worlds/<world_slug>/stories/<story_slug>/_source/pages/<page_id>.yaml` — PG record; MUST exist
- `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/<page_id>.md` — comprehensive prose plan; MUST exist
- `worlds/<world_slug>/stories/<story_slug>/pages-prose/<page_id>.md` — user-supplied rendered prose; MUST exist
- Optional: `worlds/<world_slug>/stories/<story_slug>/pages-prose/<recent-N>.md` (prior 1-2 prose pages, only when `run_craft_critic: true`)

The bundle MUST exist (non-bootstrap variant); the page MUST exist; the plan + prose pair MUST exist. No context-packet retrieval is normally needed because the plan body inlines the load-bearing canon per shared contract §8 §4. Targeted `mcp__worldloom__get_firewall_content` retrieval is required when plan §11 does not inline the Mystery Reserve firewall fields used by the `forbidden_mystery_resolution` check (Phase 3 check 3). Persisted-summary recovery still applies if retrieval returns `delivery_status: persisted_with_summary` (see `.claude/skills/_shared-templates/persisted-packet-recovery.md`).

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md` and `.claude/skills/_shared-templates/story-state-contract.md` into working context. Abort with clear missing-file error on unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if missing.
3. Load `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` and its `## Player Agency Contract` section. Abort with agency-contract-missing error if the section is absent or does not name the agency surface, write-in envelope, and viewpoint limits.
4. Load `worlds/<world_slug>/stories/<story_slug>/_source/pages/<page_id>.yaml`. Abort with page-not-found error if missing.
5. Verify the required artifact pair: `pages-prose-plans/<page_id>.md` and `pages-prose/<page_id>.md` both exist. Abort with missing-artifact error if either is absent.
6. Create `worlds/<world_slug>/stories/<story_slug>/pages-prose-receipts/` directory if absent (idempotent `mkdir -p`).
7. Allocate `SE` id via `mcp__worldloom__allocate_next_id(world_slug, 'SE', story_slug=<story_slug>)` only when `emit_attach_event: true`. Skip otherwise.

Persisted-summary recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. If
`get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
`delivery_status: persisted_with_summary`, retrieve required slices via
`mcp__worldloom__get_persisted_packet_slice` before continuing.

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Pair plan, page, and prose

Load into working memory:

- The `PG-<page_id>` record from `_source/pages/<page_id>.yaml` — including `plan.plan_hash`, `state_hash`, and `SE.promotion_claims[]` if any.
- The `## Player Agency Contract` section from `STORY_KERNEL.md` — agency surface, write-in envelope, and viewpoint limits.
- The page plan body from `pages-prose-plans/<page_id>.md` — all 19 sections per shared contract §8.
- The rendered prose body from `pages-prose/<page_id>.md`.
- The forbidden-mystery list from plan §11 `forbidden_resolutions[]`.
- Plan §4 (world-canon excerpts) — load-bearing reference for `canon_claim_without_authority` and `invented_structural_fact` checks.
- Plan §5 (active cast + entity statuses) — load-bearing for `entity_status_consistency`; these statuses are the `STSTAT`-derived projection from `PG.state_snapshot`, not an independently-authored block.
- Plan §7 (selected event + state delta) — load-bearing for `required_event_rendered` and `invented_structural_fact`.
- Plan §8 (required beats) — supplements `required_event_rendered` check.
- Optional plan §9b (active actor plans / tactical agency) — load-bearing for plan-relation rendering: prose must show required plan movement and must not imply plan state beyond the committed STPLAN records.
- Optional plan §9c (emotional causality / affective transition) — load-bearing for affective-state rendering: prose must render required affective transitions and must avoid ungrounded emotion shifts or engine terminology.
- Plan §15 (frontmatter, including engine fields) — load-bearing for `engine_jargon_leak` (engine vocabulary may legitimately appear in plan §15 but NOT in the rendered prose body).
- `PG.state_snapshot.active_records` — the at-commit state the prose must respect.
- If `run_craft_critic: true`, optional prior 1-2 prose pages from `pages-prose/<recent-N>.md` for continuity checks.

Compute fresh hashes:

- `computed_plan_hash`: sha256 over the plan file's bytes.
- `computed_state_hash`: produced by the canonical CLI per shared contract §4.2a — run `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/<page_id>.md --pg _source/pages/<page_id>.yaml`, parse the JSON `{plan_hash, state_hash}` from stdout, and use the `state_hash` value as `computed_state_hash`. The CLI applies the canonical-JSON serializer the contract mandates (sorted keys, no insignificant whitespace, `state_hash` excluded from the payload by construction). Hand-rolling the serializer at verification time is forbidden — it produces drift that the receipt would misclassify as `hash_integrity: FAIL` when no actual drift exists. The same CLI invocation's `plan_hash` matches the `computed_plan_hash` above (sha256 over plan file bytes), so one CLI call can replace both the `computed_plan_hash` and `computed_state_hash` steps if preferred.
- `computed_prose_hash`: sha256 over the prose file's bytes.

## Phase 2: Hash integrity check

Compare:

- `PG.plan.plan_hash` vs `computed_plan_hash`.
- `PG.state_hash` vs `computed_state_hash`.

If both recorded hash fields are lowercase sha256-shaped and both match their computed values: set `checks.hash_integrity: PASS`.

If either hash differs AND `accept_plan_drift: false`: set `checks.hash_integrity: FAIL` and record the drift in the receipt's `notes` field, e.g. `"plan_hash drift: PG.plan.plan_hash=<recorded> computed=<computed>"` and/or `"state_hash drift: PG.state_hash=<recorded> computed=<computed>"`. The mismatch is verdict-driving through `hash_integrity: FAIL`.

If either hash differs AND `accept_plan_drift: true`: set `checks.hash_integrity: WARN`, record the drift in `notes`, and continue. The warning is still visible in the roll-up verdict.

If either `PG.plan.plan_hash` or `PG.state_hash` is missing, placeholder (`PLACEHOLDER_TO_BE_COMPUTED*`), or non-sha256-shaped: set `checks.hash_integrity: FAIL` regardless of `accept_plan_drift`. The receipt records the invalid value in `notes`; the repair path is upstream PG repair, not silent acceptance.

Hook 6 blocks direct `Edit` / `Write` drift on `pages-prose-plans/PG-<integer>.md` and bundle `INDEX.md` between prose-attach invocations when the stamped `PG.plan.plan_hash` does not match the plan body; this Phase 2 check still runs because receipt truth must not depend only on hook installation.

**Drift is recorded in the receipt, NEVER in the `PG` record.** The PG is committed state per FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary).

## Phase 3: Deterministic checks

Run the 8 deterministic checks defined in shared contract §4.6, each producing `PASS | WARN | FAIL` (or `PASS | FAIL` where the schema names only two states):

1. **`hash_integrity`** (`PASS | WARN | FAIL`) — produced by Phase 2. It is verdict-driving: `FAIL` forces the receipt `verdict: FAIL`; `WARN` contributes to `verdict: WARN`.

2. **`engine_jargon_leak`** (`PASS | WARN | FAIL`) — scan the prose body for engine-vocabulary tokens. The closed engine-vocabulary list (inline below) includes record-ID patterns and engine-domain terms. Engine vocabulary legitimately appears in plan §15 frontmatter and verbatim-inlined plan §2 / §3 / §19 — those are NOT scanned. Hits in the rendered prose body are `WARN` if isolated (single occurrence), `FAIL` if pervasive (≥3 occurrences across different tokens).

   **Closed engine-vocabulary list** (inline; promote to `.claude/skills/_shared-templates/engine-vocabulary.md` only if list grows beyond ~30 tokens OR another skill consumes it):

   - Record-ID patterns: `PG-\d+`, `SE-\d+`, `BEL-\d+`, `SF-\d+`, `STENT-\d+`, `STINT-\d+`, `OBL-\d+`, `CNSQ-\d+`, `THR-\d+`, `SREL-\d+`, `STLOC-\d+`, `STOBJ-\d+`, `STPLAN-\d+`, `STEMO-\d+`, `DA-\d+`, `BR-\d+`, `CHC-\d+`, `SLT-\d+`, `STORY-\d+`
   - Gate names (literal): `input legality`, `parent snapshot compatibility`, `mystery firewall`, `branch isolation`, `append-only delta`, `consequence capacity`, `plan grounding`, `canon promotion hold`
   - Predicate-DSL terms (literal): `fact_true(`, `belief_record(`, `entity_status(`, `relationship_axis(`, `obligation_open(`, `consequence_pending(`, `thread_active(`, `any_belief(`, `plan_active(`, `plan_blocked(`, `emotion_active(`, `emotion_pressure(`, `location(`, `has_affordance(`, `all[`, `any[`, `not[`
   - Routing terms in engine register: `outcome_route`, `state_delta`, `promotion_claims`, `validation_trace`, `state_snapshot`, `forbidden_resolutions`, `truth_relation`, `branch_local_counterfactual`, `canon_candidate`

3. **`forbidden_mystery_resolution`** (`PASS | FAIL`) — retrieve firewall fields for every `M-<integer>` named in plan §11 via `mcp__worldloom__get_firewall_content(world_slug, m_ids=<plan §11 ids>)`, unless plan §11's per-mystery `forbidden_resolutions[]` already enumerates concrete forbidden-resolution strings collapsing both the firewall's `disallowed_cheap_answers[]` AND the protected-question entries from `unknowns[]` (the typical case when bootstrap or turn-cycle authored the plan from a firewall-aware seed pool — the inlining IS the plan-authority equivalence, not a deferred retrieval step). Derive deterministic patterns from `disallowed_cheap_answers[]` (each entry is a forbidden resolution string and is compared by case-insensitive substring match) and from `unknowns[]` collapsed to plan §11 `forbidden_resolutions[]` (each entry names a protected question whose surface-level resolution is forbidden).

   Any direct assertion matching a `disallowed_cheap_answers[]` entry is `FAIL` and routes to `repair_recommendation: revise_prose`. Cumulative semantic narrowing of a protected `unknowns[]` entry that does not match a `disallowed_cheap_answers[]` string is recorded as a judgment-assisted note in `notes[]` and routed to `branching-story-health-audit` mystery-accretion review (see Phase 2e); do not fail the receipt for cumulative narrowing alone.

   Do not reference undocumented Mystery Reserve fields; the check uses only firewall fields exposed by `get_firewall_content` or already inlined into the page plan.

4. **`required_event_rendered`** (`PASS | WARN | FAIL`) — verify plan §7 (selected event + outcome_route) is dramatized in the prose. If the event is implied but ambiguous (the reader could miss it on first read), `WARN`. If absent or actively contradicted, `FAIL`. Verification scans for plan §8 beat keywords + plan §7 actor / target references appearing in the prose body.

   SPEC-42 new-class subchecks are part of this check rather than new receipt-schema fields:

   - **`clock_tick_undisclosed`** — for each `tick_pressure_clock` op in plan §7 / `SE.state_delta`, verify the prose mentions the pressure shift using the clock title, the tick cause, or another unmistakable pressure cue from the plan. If the tick is omitted but the selected event is otherwise rendered, set `required_event_rendered: WARN` and add a `notes[]` entry beginning `clock_tick_undisclosed:`. If the prose actively contradicts the tick or hides a load-bearing threshold firing, set `required_event_rendered: FAIL`.
   - **`secret_reveal_undisclosed`** — for each `reveal_story_secret` op or STSEC status transition to `revealed` in plan §7 / `SE.state_delta`, verify the prose discloses the secret using keywords from `secret_claim`, `reveal_records[]`, or `clue_carriers[].clue_text` when those details are present in the page plan. If the reveal is omitted but the surrounding event is otherwise rendered, set `required_event_rendered: WARN` and add a `notes[]` entry beginning `secret_reveal_undisclosed:`. If the prose actively contradicts the reveal or implies the secret remains hidden after the committed reveal, set `required_event_rendered: FAIL`.

   These subchecks are receipt observations only. They do not reject or rewrite the already-committed page state; repair still routes through the existing prose-attach disposition ladder (`revise_prose`, `run_turn_cycle_repair`, or `run_story_fact_promotion_to_canon` as applicable).

   SPEC-47 plan / emotion subchecks are part of this check rather than new receipt-schema fields:

   - **`plan_relation_undisclosed`** — when plan §9b names this page's `plan_relation` for an active `STPLAN`, verify the prose dramatizes the relation through the plan holder, objective, current step, blockers, resources, or success condition named in §9b. If the selected event is otherwise rendered but the plan movement is easy to miss, set `required_event_rendered: WARN` and add a `notes[]` entry beginning `plan_relation_undisclosed:`. If prose contradicts the committed relation, set `required_event_rendered: FAIL`.
   - **`affective_transition_undisclosed`** — when plan §9c marks a transition or required affective rendering for an active `STEMO`, verify the prose renders the affect kind / intensity / behavioral pressure in character-facing language without record ids or engine terms. If present but weak, set `required_event_rendered: WARN` and add a `notes[]` entry beginning `affective_transition_undisclosed:`. If absent or contradictory, set `required_event_rendered: FAIL`.

5. **`choice_consequence_visibility`** (`PASS | WARN | FAIL`) — verify the prose realizes `SE.resolution.player_visible_feedback` from plan §7 and stays within `STORY_KERNEL.md` `## Player Agency Contract`. `PASS` means the selected action, route, and immediate consequence are legible to a first-time reader and do not imply player control outside the agency surface / write-in envelope / viewpoint limits. `WARN` means the action occurred but the route outcome, consequence feedback, or agency boundary is easy to miss. `FAIL` means the prose obscures, contradicts, or omits the consequence, or implies a broader/narrower agency surface than the contract permits, especially for `attempt`, `accommodate`, `world_block`, `promotion_hold`, or `terminal` routes. For `accept` routes with no `resolution`, pass this check when the selected event and consequence remain legible under `required_event_rendered` and the agency implication remains within the contract.

6. **`entity_status_consistency`** (`PASS | WARN | FAIL`) — verify the prose does not contradict plan §5 entity statuses, which are the derived projection of active `STSTAT` records on `PG.state_snapshot`, and does not grant player-facing agency that conflicts with the `## Player Agency Contract`. Pattern: dead characters should not speak, incapacitated characters should not act with full agency, characters in location X should not appear in location Y mid-page without a transition beat, and non-controlled `STENT` records should not read as player-controlled unless the agency surface permits it. Soft contradictions (e.g., a character's emotional state nuanced beyond §5's life/agency/location declarations) are `WARN`; hard contradictions (dead character speaks, location-X character takes action at location-Y, or prose assigns control outside the Player Agency Contract) are `FAIL`.

7. **`invented_structural_fact`** (`PASS | WARN | FAIL`) — scan prose for statements that would introduce a structural fact not present in plan §4 (canon excerpts), §5 (cast statuses), §7 (selected event), or `PG.state_snapshot`.

   `invented_structural_fact` has deterministic and judgment-assisted subchecks.

   Deterministic FAIL cases (regex or state-projection-driven):
   - prose contradicts active STSTAT life/agency/location (for example, a dead actor speaks; a located actor appears in a different STLOC; an incapacitated actor performs a complex action);
   - prose asserts a named record id or canon-fact id absent from the plan's §4 / §7 / state snapshot;
   - prose states a mystery resolution that the plan's §11 marks as forbidden.

   Judgment-assisted WARN/FAIL cases (semantic):
   - implied faction alignment shifts not present in the plan;
   - new capability or magical/technological affordance not present in the plan's §4 or active state;
   - institutional rule or law invoked but not present in active canon (CF / INV) or plan §4.

   Decorative inventions (a minor object name, a weather detail, an unmentioned NPC's name) are `WARN`. The roll-up `invented_structural_fact` receipt field records the worst verdict across both sub-categories. Judgment-assisted findings are flagged in `notes` so the user can review and decide on `revise_prose` vs. `run_turn_cycle_repair` vs. canon-promotion.

   **`prose_load_bearing_artifact_mention_without_da`**: scan rendered prose
   for load-bearing artifact phrases (letter, map, diary, decree, log,
   recording, inscription, confession, notice, ledger, transcript, briefing,
   proclamation, seal, codex, marginalia, redaction) used in a way that
   grounds knowledge, choice availability, mystery progression, or character
   action. If such a phrase appears AND the emitting PG's
   `state_snapshot.active_records.DA[]` contains no DA matching the artifact's
   diegetic role, emit validator verdict
   `prose_load_bearing_artifact_mention_without_da` (WARN-level by default;
   FAIL when the prose explicitly quotes the artifact's content or describes
   the protagonist's access to it). Record the worst result under
   `invented_structural_fact` in the receipt. For DA field semantics and the
   repair bundle shape, see
   `.claude/skills/_shared-templates/da-authoring-reference.md` §Field
   semantics and §Patch obligations. Recommended repair: route the deviation
   through the prose-attach disposition table (structural-fact issue: run a
   repair turn that creates the DA + BEL + optional STOBJ).

8. **`canon_claim_without_authority`** (`PASS | FAIL`) — scan prose for assertions that would make a world-level canon claim absent from plan §4. Examples: asserting a historical date that plan §4 does not list; stating a metaphysical rule (e.g., "magic is fundamentally entropic") that plan §4 does not include; declaring a faction's secret identity that plan §4 leaves to Mystery Reserve. Any such assertion without corresponding `SE.promotion_claims[]` evidence on the resolving event (loaded via `PG.input.resolved_event_id`) is `FAIL` and routes to `repair_recommendation: run_story_fact_promotion_to_canon`.

## Phase 4: Optional craft critic

Conditional on `run_craft_critic: true`. When `false`, set `checks.craft_critic: NOT_RUN` and skip to Phase 5.

When `true`, run a 7-axis qualitative critic over the prose; produce a `PASS | WARN | FAIL` verdict on `checks.craft_critic`, with per-axis findings recorded in receipt `notes`:

1. **Point-of-view stability** — does the POV stay close to plan §15 frontmatter POV declaration (e.g., close-third / first-person)?
2. **Sensory grounding** — does the prose anchor in concrete sensory detail rather than abstraction?
3. **Character interiority** — does the prose surface active cast's interior states per the active `STSTAT`-derived status projection + active `STINT` + active `BEL`?
4. **Rhythm / repetition** — does the prose vary sentence rhythm and avoid mechanical repetition?
5. **Dialogue clarity** — does dialogue advance the scene and stay legible per speaker?
6. **Continuity with recent prose** — when prior 1-2 prose pages are available, does this page maintain tonal continuity?
7. **Choice handling** — does the prose stop at the commitment hinge named in plan §12 without over-explaining or hiding the emitted choices?

The craft critic does NOT mutate story state — it only contributes to the receipt's verdict.

No word-count enforcement appears in this phase (per FOUNDATIONS §Story Bundles §9). All 7 axes are qualitative.

## Phase 5: Compute verdict + repair_recommendation

Roll up per-check verdicts to top-level `verdict`:

- Any `FAIL` → `verdict: FAIL`
- Otherwise any `WARN` → `verdict: WARN`
- Otherwise → `verdict: PASS`

Derive `repair_recommendation` per the shared contract §4.6 enum:

| Condition | `repair_recommendation` |
|---|---|
| `verdict: PASS` | `none` |
| `verdict: WARN` only (no `FAIL`) | `revise_prose` |
| `verdict: FAIL` with `forbidden_mystery_resolution: FAIL` | `revise_prose` (forbidden mysteries cannot be resolved by any path) |
| `verdict: FAIL` with `choice_consequence_visibility: FAIL` | `revise_prose` |
| `verdict: FAIL` with `invented_structural_fact: FAIL` or `entity_status_consistency: FAIL` | `run_turn_cycle_repair` |
| `verdict: FAIL` with `canon_claim_without_authority: FAIL` | `run_story_fact_promotion_to_canon` |

If multiple FAIL conditions co-occur, prefer the most-severe repair (`run_story_fact_promotion_to_canon` > `run_turn_cycle_repair` > `revise_prose`), and record the additional repair signals in receipt `notes`.

## Phase 6: Commit / Write — HARD-GATE fires

1. Draft the receipt YAML per shared contract §4.6 schema:

   ```yaml
   page_id: <page_id>
   story_id: <story_id>
   plan_path: pages-prose-plans/<page_id>.md
   prose_path: pages-prose/<page_id>.md
   plan_hash: <computed_plan_hash>
   prose_hash: <computed_prose_hash>
   state_hash_at_plan_time: <PG.state_hash>
   checked_at: <iso8601 now>
   strict: <input strict flag>
   verdict: PASS | WARN | FAIL
   checks:
     hash_integrity: PASS | WARN | FAIL
     engine_jargon_leak: PASS | WARN | FAIL
     forbidden_mystery_resolution: PASS | FAIL
     required_event_rendered: PASS | WARN | FAIL
     choice_consequence_visibility: PASS | WARN | FAIL
     entity_status_consistency: PASS | WARN | FAIL
     invented_structural_fact: PASS | WARN | FAIL
     canon_claim_without_authority: PASS | FAIL
     craft_critic: PASS | WARN | FAIL | NOT_RUN
   notes: [<per-finding short string>]
   repair_recommendation: none | revise_prose | run_turn_cycle_repair | run_story_fact_promotion_to_canon
   ```

2. Present deliverable summary to user: receipt path, per-check verdict table, roll-up verdict, `repair_recommendation`, strict-mode publication-blocking decision (if `strict: true` AND `verdict: FAIL`, INDEX will mark the page "rendered (FAILED receipt — publication blocked)"; otherwise "rendered" with a verdict glyph), optional `SE-<integer>` id + patch op preview when `emit_attach_event: true`.

3. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.

4. On approval:
   a. If `emit_attach_event: true`: build a single-op patch envelope with `create_se_record` for `event_kind: prose_attach` conforming to story-state contract §4.3a (audit-only SE events); the op requires a `target_file` field (`worlds/<world_slug>/stories/<story_slug>/_source/events/SE-<integer>.yaml`); see `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` or invoke `mcp__worldloom__describe_envelope_schema(op_kind='create_se_record')` for the machine-readable shape. Dry-run validate via `mcp__worldloom__validate_patch_plan`, obtain the approval token, and submit via `mcp__worldloom__submit_patch_plan`. If this optional patch fails, abort: write no receipt and no INDEX update for this invocation; surface the patch failure and allow the user to re-run with `emit_attach_event=false` or repair the patch shape.
   b. Write `pages-prose-receipts/<page_id>.yaml` (direct write, not patch-engine routed — the receipt is not a `_source/` record).
   c. Update bundle `INDEX.md` to reflect prose status + receipt verdict. Append a `## Rendered Prose` section if not already present, with columns: `PG | Status | Receipt verdict | Receipt`. Status values per receipt outcome: `rendered` (verdict PASS or WARN; or non-strict FAIL); `rendered (FAILED receipt — publication blocked)` (strict=true AND verdict=FAIL only). The Receipt verdict column contains the receipt's roll-up verdict literally (PASS / WARN / FAIL). The Receipt column contains the relative path to the receipt file (e.g., `pages-prose-receipts/PG-<integer>.yaml`). When the section already exists from prior page attachments, add a new row under the existing header — do not duplicate the header.

5. Report receipt path + verdict + `repair_recommendation` to the user. If `repair_recommendation` is non-`none`, surface the named lawful repair path (revise prose, invoke `branching-story-turn-cycle` with repair-action semantics, or invoke `story-fact-promotion-to-canon` with the asserted canon claim). Do NOT `git commit`.

**Failure behavior**: `emit_attach_event` patch fail → abort before receipt or INDEX writes; surface to user with a one-paragraph diagnostic and no partial direct artifacts. Receipt-write fail (filesystem error) → surface to user with one-paragraph diagnostic; the receipt was the deliverable, so this is a hard fail with no partial direct-artifact state. INDEX update fail (after receipt write succeeded) → receipt is authoritative; the index can be repaired directly.

## Validation Rules This Skill Upholds

- **Rule 7 (Preserve Mystery Deliberately)** — enforced at Phase 3 check 3 (`forbidden_mystery_resolution`). Mechanism: deterministic scan of rendered prose against firewall fields retrieved via `get_firewall_content` or already inlined into plan §11. Direct assertions matching `disallowed_cheap_answers[]` are `FAIL`; cumulative semantic narrowing of protected `unknowns[]` is recorded for health-audit review. Forbidden-status `M-<integer>` is not resolved here.

Rules 1 / 4 / 5 are upstream-enforced at bootstrap and turn-cycle Phase 9 (the eight shared hard gates). Prose-attach is a downstream validator over rendered prose; it confirms prose respects state, not the inverse.

## Record Schemas

The prose receipt schema lives in `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 (canonical; extracted from the main `story-state-contract.md` per its §4 pointer stub). The validator-side mirror is `prose_receipt_schema_compliance` in `tools/validators`; after a receipt exists, a receipt-specific structural smoke can run:

```bash
node tools/validators/dist/src/cli/world-validate.js <world_slug> --structural --file worlds/<world_slug>/stories/<story_slug>/pages-prose-receipts/<page_id>.yaml --json
```

No skill-local templates — the shared contract is the canonical reference per sub-class (d) of skill-creator's template-derivation discipline.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | N/A | Not applicable at this skill — upstream-enforced at bootstrap / turn-cycle Phase 9 gate 7 (plan grounding). Prose-attach validates prose against state, not state shape. |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — prose-attach does not mutate canon. |
| Rule 3 (No Specialness Inflation) | N/A | Same as Rule 2. |
| Rule 4 (No Globalization by Accident) | N/A | Upstream-enforced at bootstrap / turn-cycle Phase 9 gate 4 (branch isolation). |
| Rule 5 (No Consequence Evasion) | N/A | Upstream-enforced at bootstrap / turn-cycle Phase 9 gate 6. |
| Rule 6 (No Silent Retcons) | N/A | Prose-attach does not mutate canon; world-canon retcon routes through `canon-addition`. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 3 check 3 | Deterministic forbidden-mystery-resolution scan on rendered prose using firewall fields from `get_firewall_content` or plan §11. |
| Rule 11 (No Spectator Castes) | N/A | World-canon-only principle. |
| Rule 12 (No Single-Trace Truths) | N/A | World-canon-only principle. |
| Canon Layers | Pre-flight, Phase 1 | Plan §4 canon excerpts read as load-bearing reference for checks 5 and 6. |
| Mystery Reserve | Pre-flight, Phase 1, 3 | Plan §11 `forbidden_resolutions[]` loaded; Phase 3 check 3 enforces the rendered-prose firewall from existing Mystery Reserve fields. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | Prose-attach NEVER mutates `PG`; drift is recorded in receipt only; no ARC_TRACE emitted; the page snapshot remains the authoritative state. |
| §Story Bundles §5b (Schema-Minimalism) | Phase 6 | Receipt schema conforms strictly to shared contract §4.6; no extras beyond the canonical receipt schema. |
| §Story Bundles §6a (Belief vs. Fact) | N/A | Prose-attach reads `PG.state_snapshot.active_records.BEL` references alongside the `STSTAT`-derived status projection for entity-status-consistency checks but does not create or supersede BEL or STSTAT records. |
| §Story Bundles §9 (Prose Length Discipline) | Phase 4 craft critic | Craft critic uses 7 qualitative axes; no word-count enforcement. |
| Change Control Policy | N/A | Canon-reading skill emits no Change Log Entries. |
| Tooling Recommendation | N/A | No context-packet retrieval is normally needed because the plan body inlines the load-bearing canon per shared contract §8. Targeted `mcp__worldloom__get_firewall_content` retrieval is required when plan §11 does not inline the Mystery Reserve firewall fields used by the `forbidden_mystery_resolution` check (Phase 3 check 3). Persisted-summary recovery still applies if retrieval returns `delivery_status: persisted_with_summary` (see `.claude/skills/_shared-templates/persisted-packet-recovery.md`). |

## Guardrails

- **Never mutate the `PG` record.** Plan-authority boundary per FOUNDATIONS §Story Bundles §4a. Drift, missing required events, and prose inventions are recorded in the receipt's `notes` and `checks` fields; they NEVER write to the page record.
- **Never create ARC_TRACE.** The class is removed per the greenfield plan; the receipt's verdict + `repair_recommendation` are the audit-trail substitute.
- **Never write rendered prose.** `pages-prose/<page_id>.md` is user-supplied; prose-attach reads it as input.
- **`emit_attach_event` is the ONLY way prose-attach mutates atomic story-bundle records.** Opt-in. Default off. When enabled, emits exactly one §4.3a-conformant `create_se_record` op with `event_kind: prose_attach`; never alters page state.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Receipt schema conforms strictly to §4.6 and is structurally checked by `prose_receipt_schema_compliance`. No nice-to-have fields.
- **No word-count enforcement.** Craft critic axes are qualitative per FOUNDATIONS §Story Bundles §9. The receipt records no word counts.
- **Silent acceptance forbidden for structural inventions.** Every `invented_structural_fact: FAIL` or `canon_claim_without_authority: FAIL` routes through `repair_recommendation` to one of three lawful repair paths: `revise_prose`, `run_turn_cycle_repair`, `run_story_fact_promotion_to_canon`.
- **Skills do not chain.** Prose-attach does not invoke `branching-story-turn-cycle`, `story-fact-promotion-to-canon`, or `branching-story-health-audit`. When `repair_recommendation` is non-`none`, the receipt records the recommendation; the user separately invokes the named sibling.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.
- **No deferred-integration tickets named by this skill** — prose-attach is structurally simple. It inherits the rebuilt-family infrastructure from bootstrap and turn-cycle without adding its own deferred surfaces. `tools/validators/src/schemas/story-page.schema.json` requires `plan_hash` + `state_hash` as sha256-shaped fields; prose-attach treats missing, placeholder, or non-sha256 PG hash fields as `hash_integrity: FAIL`. The shared contract §4.6 receipt schema is the canonical prose shape, and `prose_receipt_schema_compliance` is the validator-side structural backstop for receipt YAML.

## Final Rule

Prose-attach validates rendered prose against a committed page's plan + state, emits a structured receipt, and never mutates page state — drift, inventions, and forbidden-mystery hits route through `repair_recommendation` to lawful repair paths, not through silent acceptance or PG-record alteration.
