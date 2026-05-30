# Pre-flight & World-State Prerequisites

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles §5 (Validation Rules At Story Scope), §5a (Commitment Blocks Are Causal Moves), §5b (Schema-Minimalism), §6a (Belief vs. Fact), §9 (Prose Length Discipline) govern this skill
- `.claude/skills/_shared-templates/story-state-contract.md` — §5 closed predicate DSL, §10 shared write order, §11 mystery and canon authority
- `.claude/skills/_shared-templates/story-record-schemas.md` — §4.4 SLT schema (canonical)
- `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.17 / §4.5.18, `.claude/skills/_shared-templates/story-state-contract.md` §5, `docs/CONTEXT-PACKET-CONTRACT.md`, and `docs/MACHINE-FACING-LAYER.md` — STPLAN/STEMO record and retrieval surfaces that inform plan/emotion-aware SLT predicates without adding a new SLT schema family
- `.claude/skills/_shared-templates/story-state-contract.md` §5, §6.1 story-local character authority, and the Character-Fit Selection Contract — predicate legality, story-local STCHAR authority, and character-fit branch-scope discipline; `any_story_character_active(...)` is deferred and not part of the closed DSL
- `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` — bundle root context
- pool-wide SLT inventory via `mcp__worldloom__list_records` keyed by `move_family`, `grounding.compatible_turn_drivers`, predicate classes computed from `preconditions.hard[]` / `preconditions.soft[]`, and action families from `exit_options[]` (`direct_batch` only; may be empty post-bootstrap if `seed_commitment_blocks: none`) — primary input for Phase 1's 17-target coverage-gap diagnosis. When existing-block mutation planning is in scope, per-page eligibility shortlist additionally via `mcp__worldloom__select_storylet_candidates` for `replace` / `extend` mutation targeting. Full retrieval calls and the pool-inventory-vs-per-page-eligibility distinction live at §Pre-flight Check step 4 and `references/phase-1-coverage-diagnosis.md` §Read paths.
- Moment-signature inputs (`direct_batch` only; consumed at pre-flight step 4(iii) to produce the `moment_signature` working-memory artifact for Phase 1 Pass B):
  - Latest committed PG state snapshot (`active_high_salience_records` by class — threads / obligations / consequences / clocks / secrets / story_questions / relationships / beliefs — filtered by per-class urgency / salience / status thresholds documented at §Pre-flight Check step 4(iii).3).
  - Parent SE body (kind, resolution_kind, effects), resolved from the latest committed PG's `resolved_event` field.
  - Just-emitted CHC ids at the latest PG (action_family distribution → `forward_affordance_fingerprint`).
  - Recent supersession records across the configured `supersession_window_pages` window per record class (threads, beliefs, relationships, obligations, consequences, clocks).
- `worlds/<world_slug>/stories/<story_slug>/audits/<audit_id>-*.md` + `audits/<audit_id>/remediation-storylet-proposals/RSP-*.md` — source audit + RSP cards (`audit_repair` only; abort with audit-not-found or rsp-not-found error if any reference missing)
- Per-block firewall authority — the world `INV` bodies and the Mystery Reserve `M` bodies for every M relevant to the bundle's firewall posture loaded **whole-class** via `mcp__worldloom__list_records(record_type='invariant_record', world_slug=<world_slug>, include_full_body=true)` and `mcp__worldloom__list_records(record_type='mystery_record', world_slug=<world_slug>, include_full_body=true)` (or a targeted `get_records` over every `mysteries_in_play[*].m_id` from `STORY_KERNEL.md`). The relevant-M set covers BOTH world-`forbidden`-status M (engine-bound Rule 7 firewall target) AND bundle-policy-preserved M whose world `M.status` is `passive`/`active` but whose `STORY_KERNEL.md mysteries_in_play[m_id].status == preserved` or `future_resolution_safety == forbidden` (bundle's own narrative-scope preservation that the Phase 2 defensive-inclusion heuristic consumes). This is the authoritative firewall load: `get_context_packet` returns these classes at `governing_full_body_priority: "reserve"` for this task type (id-lists only, no bodies inline — see the next bullet), so the whole-class `list_records` calls are the primary path that delivers gate-4 firewall content, not a conditional fallback.
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='commitment_block_authoring', story_slug=<story_slug>, seed_nodes=<Mystery Reserve forbidden-status entries + world INV records + other world-scope canon anchors>, token_budget=<default>)` — consumed for governing rules, the seed-graph context, and the `story_bundle_context` surface. For this task type the packet delivers invariants and Mystery Reserve at `"reserve"` priority (`full_body_classes_delivered: []`; the seeded ids surface only under `governing_summary.dropped_node_ids_by_class`); do NOT rely on the packet to deliver the firewall bodies — the whole-class `list_records` bullet above is the firewall authority. Load active cast and open obligations / threads in the bundle through `story_slug` + `story_bundle_context` or targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records`; do not pass story-local ids in world-scope `seed_nodes`.

Targeted retrieval discipline: `story_bundle_context` is an index and summary surface, not full authoring authority. When it identifies a material `STPLAN` / `STEMO` / `STSEC` / `STQ` / `CLK` record, retrieve the full body with `mcp__worldloom__get_record`, `mcp__worldloom__get_records`, or a filtered `mcp__worldloom__list_records(..., include_full_body=true)` before authoring SLT predicates/effects, CHC grounding assumptions for remediation blocks, page-plan §9b / §9c / §10b expectations, prose-receipt expectations, or health-audit-style findings that depend on basis, blockers, appraisal, orientation, clue, payoff, or clock payload detail. When `story_bundle_context.active_story_characters` identifies an STCHAR whose persona, pressure behavior, relationship conduct, appraisal, agency, or voice is load-bearing for a planned block, retrieve the relevant full or projected STCHAR sections via `mcp__worldloom__get_record(record_id='STCHAR-<integer>', section_path='body.<section-name>')` (parallel to the STPLAN/STEMO/STSEC/STQ/CLK retrieval named earlier in this paragraph) before authoring the block. Do not read world `CHAR-*` dossiers for runtime characterization; `STCHAR.source_char_id` is provenance only.

The bundle MUST exist (non-bootstrap variant); for `audit_repair`, the audit + all named RSP cards MUST exist. For `direct_batch`, the current SLT pool MAY be empty (post-bootstrap with `seed_commitment_blocks: none`).

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md` and `.claude/skills/_shared-templates/story-state-contract.md` into working context — skip only if read earlier in this session (fully or via partial reads that cumulatively covered the documents), not from memory or training knowledge. When skipping because content was loaded earlier in the session, name the load mechanism explicitly in the user-facing skip announcement (e.g., `FOUNDATIONS already in context via direct Read at <Nth-message-or-tool-call>` / `via <sibling-skill-name>'s pre-flight at message N which executed the Read`). Abort with clear missing-file error on unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if missing.
3. Validate `mode`: must be `direct_batch` or `audit_repair`; for `direct_batch`, validate `target_count` (1–12 inclusive, default 6); for `audit_repair`, validate `audit_id` matches the `SAU-<integer>` pattern and `finding_ids` is non-empty.
4. Mode-specific load:
   - `direct_batch`: (i) load the pool-wide SLT inventory via `mcp__worldloom__list_records(record_type='storylet_record', story_slug=<story_slug>, filters={'scope.visibility': ['global_author_pool', 'branch_prefix_scoped']}, fields=['move_family', 'grounding.compatible_turn_drivers', 'preconditions', 'exit_options'])` and key the returned entries into a current-pool inventory by `move_family`, the dotted `grounding.compatible_turn_drivers` response key, predicate classes computed from `preconditions.hard[]` / `preconditions.soft[]`, and action families computed from `exit_options[]` — this is the primary input for Phase 1's pool-wide coverage-gap diagnosis across all 17 coverage targets; all bundle SLTs appear regardless of any single parent page's eligibility filter. (ii) When existing-block mutation planning is in scope, ALSO resolve the latest committed parent `PG-<integer>` and invoke `mcp__worldloom__select_storylet_candidates(world_slug=<world_slug>, story_slug=<story_slug>, parent_page_id=<latest committed PG>, turn_driver=<derived_or_player_default>, max_candidates=<pool_size>)` for the per-page eligibility shortlist, preserving `filter_trace` as eligibility-diagnostic evidence and `requires_full_body_ids[]` for batch follow-up. Retrieve full SLT bodies via `mcp__worldloom__get_records(record_ids=<subset>, story_slug=<story_slug>)` only for blocks selected for `replace` / `extend` mutation planning; no per-file `Read` fallback is required. If the inventory response, projection response, or targeted full-body response is wrapped in `<persisted-output>` tags with a saved file path (Claude Code harness output-cap, distinct from MCP-server `delivery_status: persisted_with_summary`), retrieve the saved payload before proceeding — the harness cap is environmental and may fire on any MCP tool whose response exceeds the harness's inline limit, regardless of MCP-server delivery mode.
   - `audit_repair`: load `audits/<audit_id>-*.md` (verify exists); for each `RSP-<integer>` in `finding_ids`, load `audits/<audit_id>/remediation-storylet-proposals/RSP-*.md`. Abort with rsp-not-found error on any missing card.
5. Allocate ids: one `SLT` per planned block (`target_count` for `direct_batch`; `len(finding_ids)` for `audit_repair` — actual usage may be fewer if Phase 1 skips RSP cards) via `mcp__worldloom__allocate_next_id(world_slug, 'SLT', story_slug=<story_slug>)`. Allocate one `SLB` id for the batch manifest.
6. Load story-local context first via `story_slug` scoped retrieval: active cast `STENT` ids, active STCHAR summaries from `story_bundle_context.active_story_characters`, and the bundle's currently-open obligations / consequences / threads with `urgency` (for `direct_batch` gap diagnosis weighting) come from `story_bundle_context` or targeted `mcp__worldloom__get_records` / `mcp__worldloom__list_records`. Enumerate every active STCHAR's `role_in_story` proactively during Phase 1 gap diagnosis (including offstage STCHARs whose `entity_status.location: offstage` — see Phase 1 cast-role coverage criterion), then retrieve full or projected STCHAR sections via `mcp__worldloom__get_record(record_id='STCHAR-<integer>', section_path='body.<section-name>')` (or whole-class via `mcp__worldloom__list_records(record_type='story_character_authority_record', world_slug=<world_slug>, story_slug=<story_slug>, include_full_body=true)`) for each character whose pressure-bearing role surfaces as an unrepresented authoring lane OR when character-specific eligibility, beats, effects, persona, voice, appraisal, pressure behavior, relationship conduct, perception, embodiment, or agency matters to a planned block.

   Then load the per-block firewall authority as an **unconditional** sub-step (runs every time, before Phase 1, regardless of any later packet `delivery_status`): whole-class load every world Invariant via `mcp__worldloom__list_records(record_type='invariant_record', world_slug=<world_slug>, include_full_body=true)` and the full Mystery Reserve bodies for every M relevant to the bundle's firewall posture — both **world-`forbidden`-status** M (the engine-bound Rule 7 firewall target) AND **bundle-policy-preserved** M whose world `M.status` is `passive` or `active` but whose `STORY_KERNEL.md mysteries_in_play[m_id].status == preserved` or `mysteries_in_play[m_id].future_resolution_safety == forbidden` (the bundle's own narrative-scope preservation commitment that the Phase 2 defensive-inclusion heuristic consumes). Load via `mcp__worldloom__get_records(record_ids=<every mysteries_in_play[*].m_id from STORY_KERNEL.md>)` for a targeted load, OR `mcp__worldloom__list_records(record_type='mystery_record', world_slug=<world_slug>, include_full_body=true)` without a status filter for the whole-class load when the bundle's `mysteries_in_play` covers most of the world's M. These whole-class bodies are the authority for the per-block mystery / invariant firewall (Phase 3 gate 4) and the Phase 2 defensive-inclusion heuristic.

   Then load the world canon context packet with `story_slug=<story_slug>` and world-scope seeds only: every Mystery Reserve `M-<integer>` with `status: forbidden`, every world INV record, and any other world-canon anchors needed by the batch — seeding these classes scopes the packet's governing summary and seed graph, but for this task type the packet returns them at `governing_full_body_priority: "reserve"` (id-lists only, `full_body_classes_delivered: []`); their bodies come from the whole-class `list_records` sub-step above, not from the packet. Do not pass `STCHAR` or world `CHAR-*` ids as world-scope `seed_nodes`.

### Pre-flight Check step 4(iii) — compute moment signature (`direct_batch` only)

Runs after step 4's mode-specific load and before step 5 (id allocation). Skipped entirely for `audit_repair` (RSP cards already prescribe targets). When no committed PG exists yet — post-bootstrap, pre-PG-2 — the entire procedure is skipped: emit `moment_signature_skipped: true` with `reason: "no committed PG (post-bootstrap)"` to the working-memory artifact, log the skip in the pre-flight trace, and let Phase 1 run as today. The artifact MUST be present (populated or skip-marked) in the deliverable summary surfaced at HARD-GATE time.

The 7-step procedure:

```
4(iii).1 resolve parent_event_id from latest committed PG-N.resolved_event   (no MCP call; field already loaded at step 4)
4(iii).2 mcp__worldloom__get_record(record_id=parent_event_id)               1 retrieval → SE body
                                                                              extract kind, resolution_kind, effects
4(iii).3 filter PG-N state snapshot (already loaded) for active_high_salience_records:
           - threads:         urgency >= high
           - obligations:     urgency >= medium
           - consequences:    urgency >= high
           - clocks:          salience >= high
           - secrets:         salience >= high AND status == hidden
           - story_questions: salience >= high AND status == open
           - relationships:   value >= high
           - beliefs:         currently-authoritative (no superseded_by)
         (operates on the context_packet surface; falls back to targeted
          get_records when a field is absent from the packet)
4(iii).4 mcp__worldloom__list_records(record_type='choice_record',           1 retrieval → just-emitted CHCs
           filter={parent_page: PG-N})
         compute action_family_distribution from CHC.action_families[];
         compute dominant_action_families (a family is dominant when >= 40%
           of the parent page's CHCs contain it in their action_families[]
           list — i.e., the family appears in at least ceil(0.4 * len(parent_page_choices))
           distinct CHCs; the denominator is the CHC count, NOT the pooled
           count of action_family entries across CHCs) and outlier_action_families
           (a family is an outlier when it appears in exactly one CHC's
           action_families[] list, a singleton against the parent_page CHC set)
4(iii).5 supersession scan across window:
         for each record class in {threads, beliefs, relationships,
                                   obligations, consequences, clocks}:
           mcp__worldloom__list_records(record_type=<class>,                  1 retrieval per class (max 6)
             filter={supersedes_not_null: true,
                     shifted_at_page in [PG-(N-window) .. PG-N]})
           emit {old, new, shifted_at, axis: <inferred from new record's title|kind>}
         supersession_window_pages defaults to 3
4(iii).6 compute cast_role_engagement_at_moment by walking active_high_salience_records:
         for each record, resolve participants[] → STENT ids → STCHAR.role_in_story
         (uses STCHAR summaries already loaded at pre-flight step 5; no new retrieval)
4(iii).7 assemble moment_signature working-memory object; emit to Phase 1 input
```

**Working-memory shape.** The `moment_signature` artifact carries seven top-level fields (six content + one window arg echo):

```yaml
moment_signature:
  parent_page: PG-<integer>                       # latest committed PG
  parent_event: SE-<integer>                      # from PG-N.resolved_event
  parent_event_kind: <turn_resolution | fork_branch | continuation_advance | ...>
  parent_event_resolution: <player_action | player_write_in | npc_action | clock_fire | ...>
  active_high_salience_records:                   # filtered per-class per step 4(iii).3
    threads: [THR-<integer>, ...]
    obligations: [OBL-<integer>, ...]
    consequences: [CNSQ-<integer>, ...]
    clocks: [CLK-<integer>, ...]
    secrets: [STSEC-<integer>, ...]
    story_questions: [STQ-<integer>, ...]
    relationships: [SREL-<integer>, ...]
    beliefs: [BEL-<integer>, ...]
  supersession_set:                                # from step 4(iii).5; empty list when window covers no supersessions
    - {old: <record_id>, new: <record_id>, shifted_at: PG-<integer>, axis: <inferred-axis-string>}
  forward_affordance_fingerprint:                  # from step 4(iii).4
    parent_page_choices: [CHC-<integer>, ...]
    action_family_distribution: {<action_family>: <count>, ...}
    dominant_action_families: [<action_family>, ...]   # >= 40% of parent_page CHCs contain this family (per-CHC presence ratio; denominator is the CHC count)
    outlier_action_families: [<action_family>, ...]    # appears in exactly one CHC's action_families[] (singleton against the parent_page CHC set)
  cast_role_engagement_at_moment:                  # from step 4(iii).6; non-empty roles only
    pressure_source: [STENT-<integer>, ...]
    opposing_actor: [STENT-<integer>, ...]
    authority: [STENT-<integer>, ...]
    dependent: [STENT-<integer>, ...]
    information_source: [STENT-<integer>, ...]
  supersession_window_pages: <integer>             # echoed from the skill arg (default 3)
```

**Worked example (red-bunny PG-8, 5 CHCs)**: CHC-36 [communicate, protect, wait]; CHC-37 [communicate, protect]; CHC-38 [perceive, bond, control]; CHC-39 [communicate, persuade, bond]; CHC-40 [evade, protect, wait]. Per-CHC presence: communicate 3/5=60%, protect 3/5=60%, wait 2/5=40%, bond 2/5=40%, perceive 1/5=20%, control 1/5=20%, persuade 1/5=20%, evade 1/5=20%. ⌈0.4 × 5⌉ = 2 CHCs threshold. `dominant_action_families: [communicate, protect, wait, bond]`. `outlier_action_families: [perceive, control, persuade, evade]`.

When `moment_signature_skipped: true` (no committed PG yet), the artifact carries only `moment_signature_skipped: true`, `moment_signature_skip_reason: "no committed PG (post-bootstrap)"`, and `supersession_window_pages` (echoed for traceability); the six content fields are omitted.

**MCP-filter fallbacks.** Two existing-surface filter shapes are used; both have documented fallback paths that produce operationally equivalent results at small windows (<= 8 pages; < 30 records per class typical):

- Step 4(iii).4 `mcp__worldloom__list_records(record_type='choice_record', filter={parent_page: PG-N})` — if the `parent_page` filter is unsupported, fall back to reading CHC ids from `PG-N.state_snapshot.choices` (already loaded at step 4) and `mcp__worldloom__get_records(record_ids=<list>)` for the bodies.
- Step 4(iii).5 `mcp__worldloom__list_records(record_type=<class>, filter={supersedes_not_null: true, shifted_at_page in [PG-(N-window) .. PG-N]})` — if either filter shape is unsupported, fall back to `mcp__worldloom__list_records(record_type=<class>, story_slug=<story_slug>)` plus client-side filtering on the returned `supersedes` and `shifted_at` fields. The window is small enough that the client-side filter is cheap.

**FOUNDATIONS alignment.** The moment-signature is a local-salience read of the present configuration at the latest committed PG — the authoring-time analogue of FOUNDATIONS §Story Bundles §5c's runtime local-salience-ranking pass for driver selection. It is explicitly NOT a target-narrative-shape lookahead, dramatic-arc-position score, or read beyond the just-emitted CHCs. The signature is shape extraction, not id binding; downstream Phase 1 / Phase 2 use of the signature MUST compute existential-predicate shapes for `global_author_pool` SLT preconditions per the Character-Fit Selection Contract §11a, never bind branch-local record ids directly. Mystery Reserve firewall (Phase 3 gate 4) is unchanged — signature consumption does not bypass per-block mystery / invariant firewalls.

**Retrieval budget.** Worst-case 8 retrievals (1 SE body + 1 CHC list + 6 supersession-scan list calls); realistically 4–6 (most bundles supersede records in 2–3 classes per turn). No new MCP capability is introduced — only existing-surface use with the fallbacks above.

Packet recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. The firewall
bodies (Mystery Reserve + Invariants) are **not** recovered from the packet at
all — they are loaded unconditionally by the whole-class
`list_records(..., include_full_body=true)` sub-step in step 6 above, which is
the per-block firewall authority regardless of the packet's `delivery_status`.
The recovery template still governs the packet's other surfaces: if
`get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
`delivery_status: persisted_with_summary`, retrieve required slices (governing
rules, seed-graph context, `story_bundle_context`) via
`mcp__worldloom__get_persisted_packet_slice` before continuing; and the shared
template's §When Required Classes Cannot Fit fallback documents the same
whole-class `list_records` pattern step 6 already runs.

If any precondition fails, the skill aborts before Phase 1.
