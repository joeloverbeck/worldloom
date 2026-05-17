---
name: branching-story-bootstrap
description: "Use when creating a new branching-story bundle inside an existing worldloom world. Produces: story-bundle records (STENT/STSTAT/STINT/SF/BEL/SE/OBL/CNSQ/THR/SREL/STLOC/STOBJ/optional DA/BR/PG/CHC/optional SLT) via patch engine + STORY_KERNEL.md + pages-prose-plans/PG-1.md + per-bundle INDEX.md + per-world stories/INDEX.md first-run create-or-append. Mutates: only worlds/<world_slug>/stories/<story_slug>/ plus worlds/<world_slug>/stories/INDEX.md."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Kebab-case slug for the new bundle; must not collide with an existing story in the target world"
    required: true
  - name: premise
    description: "One-to-three-paragraph natural-language premise establishing the situation"
    required: true
  - name: selected_cast
    description: "List of CHAR-<integer> ids from the world's characters/INDEX.md"
    required: true
  - name: pov
    description: "Perspective convention (first-person | close third | omniscient); default: close third"
    required: false
  - name: tone
    description: "Tonal contract; default: inherit from WORLD_KERNEL.md tonal contract"
    required: false
  - name: content_intensity
    description: "tame | mature | explicit; default: mature"
    required: false
  - name: initial_location
    description: "STLOC candidate (label and grounding canon)"
    required: false
  - name: opening_pressure
    description: "Natural-language statement of the pressure that puts the cast into motion at the opening"
    required: false
  - name: seed_commitment_blocks
    description: "none | minimal | standard; default: minimal"
    required: false
---

# Branching Story Bootstrap

Bootstrap a new branching-story bundle inside an existing worldloom world — initialize root causal state, commit the root page snapshot, author the comprehensive root prose plan, and emit the first choices. Bootstrap does not render prose and does not establish any prose-rendering lifecycle.

<HARD-GATE>
Do NOT write any of `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md`, `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-1.md`, `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, or `worlds/<world_slug>/stories/INDEX.md`, AND do NOT submit any patch plan to `mcp__worldloom__submit_patch_plan`, until:

(a) Pre-flight Check has completed: world resolved, story-slug collision-free against `worlds/<world_slug>/stories/<story_slug>/`, all ids allocated via `mcp__worldloom__allocate_next_id`, context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', ...)`, and the canonical prose-quality sources (`docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `reports/prose-quality-instructions.md`) are loaded.

(b) Phases 1-9 have completed in working memory: state seed normalized; one `STSTAT` per active `STENT` plus SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / (optional DA) / (optional SLT) seed records drafted; `SE-1` drafted; `PG-1` drafted with full `state_snapshot` and `validation_trace`; `STORY_KERNEL.md` drafted with the required section set including `## Player Agency Contract`; `pages-prose-plans/PG-1.md` drafted with all 19 sections including verbatim §2 / §3 / §19 inlined from `reports/prose-quality-instructions.md`; 3-5 `CHC` records drafted.

(c) Phase 9 has validated all 8 shared hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 with a one-line PASS rationale per gate on `PG-1.validation_trace`, plus the 4 bootstrap-additional checks (cast resolution to existing CHAR dossiers; no mirrored SF globalizes its parent CF scope; root page plan is self-contained per shared contract §8; continuation capacity satisfied — at least one eligible seed SLT or a planned runtime JIT path; terminal root rejected as authoring error).

(d) The user has explicitly approved the deliverable summary (bundle path, cast roster, record inventory by class, page plan structural preview, emitted choices list).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (FOUNDATIONS + contract + prose-quality sources loaded;
  world resolved; cast verified; bundle-target collision-free;
  ids allocated; context packet loaded)
        |
        v
Phase 1: Normalize premise → state_seed
        |
        v
Phase 2: Mirror load-bearing world facts → SF records (in memory)
        |
        v
Phase 3: Create initial beliefs → BEL records (in memory)
        |
        v
Phase 4: Create initial debts → OBL / CNSQ / THR / SREL records (in memory)
        |
        v
Phase 5: [optional] Seed commitment blocks → SLT author-pool records (in memory)
        |
        v
Phase 6: Commit root event + page snapshot → SE-1 + PG-1 (in memory)
        |
        v
Phase 7: Author root page plan → pages-prose-plans/PG-1.md (in memory)
        |
        v
Phase 8: Generate first choices → CHC records (in memory)
        |
        v
Phase 9: Validate against shared 8 hard gates + 4 bootstrap-additional checks;
  compute final PG hashes per shared contract §4.2a
        |
        v
Phase 10: HARD-GATE fires → atomic patch + markdown writes
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — kebab-case slug for the new bundle
- `premise` — string — 1-3 paragraph natural-language premise
- `selected_cast` — list[CHAR-<integer>] — cast member ids from the world's `characters/INDEX.md`

### Optional

- `pov` — string — perspective convention; default: close third
- `tone` — string — tonal contract; default: inherit from `WORLD_KERNEL.md`
- `content_intensity` — enum — `tame | mature | explicit`; default: `mature`
- `initial_location` — string — STLOC candidate (label and grounding canon)
- `opening_pressure` — string — natural-language pressure statement
- `seed_commitment_blocks` — enum — `none | minimal | standard`; default: `minimal`

## Output

Atomic story-bundle records (via `mcp__worldloom__submit_patch_plan`) + direct-write markdown artifacts. All `_source/*.yaml` paths below are relative to `worlds/<world_slug>/stories/<story_slug>/`.

| Class | File path | Created when |
|---|---|---|
| `STORY-<integer>` | (per-world identifier; resolved at allocation) | Always |
| `STENT-<integer>` | `_source/entities/STENT-<integer>.yaml` | Always (one per cast member; `role_in_story` uses canonical list values such as `[viewpoint, primary_actor]`) |
| `STSTAT-<integer>` | `_source/status/STSTAT-<integer>.yaml` | Always (one active status record per active `STENT`; `entity_status` is derived from these records) |
| `STINT-<integer>` | `_source/intentions/STINT-<integer>.yaml` | Always (≥1 per cast member) |
| `SF-<integer>` | `_source/facts/SF-<integer>.yaml` | Always (load-bearing mirrored world facts) |
| `BEL-<integer>` | `_source/beliefs/BEL-<integer>.yaml` | Always (initial belief state per cast member) |
| `OBL-<integer>` | `_source/obligations/OBL-<integer>.yaml` | IF opening pressure demands explicit obligation |
| `CNSQ-<integer>` | `_source/consequences/CNSQ-<integer>.yaml` | IF opening pressure demands explicit consequence |
| `THR-<integer>` | `_source/threads/THR-<integer>.yaml` | Always (1-3 threads tracking opening pressure) |
| `SREL-<integer>` | `_source/relationships/SREL-<integer>.yaml` | IF cast relationships constrain opening choice |
| `STLOC-<integer>` | `_source/locations/STLOC-<integer>.yaml` | Always (initial location) |
| `STOBJ-<integer>` | `_source/objects/STOBJ-<integer>.yaml` | IF an object is grounded in the opening situation |
| `DA-<integer>` | `_source/artifacts/DA-<integer>.yaml` | IF an in-story diegetic artifact is in play at opening; see Phase 3 DA triage |
| `BR-1` | `_source/branches/BR-1.yaml` | Always (root branch) |
| `SE-1` | `_source/events/SE-1.yaml` | Always (event_kind: story_start) |
| `PG-1` | `_source/pages/PG-1.yaml` | Always (root page snapshot) |
| `CHC-<integer>` | `_source/choices/CHC-<integer>.yaml` | Always (3-5 choices emitted by PG-1 + write-in slot) |
| `SLT-<integer>` | `_source/storylets/SLT-<integer>.yaml` | IF `seed_commitment_blocks != 'none'` (4-8 for `minimal`; 8-14 cap for `standard`) |
| STORY_KERNEL.md | `STORY_KERNEL.md` | Always (direct write after patch submission) |
| Root page plan | `pages-prose-plans/PG-1.md` | Always (direct write after patch submission) |
| Bundle INDEX | `INDEX.md` | Always (direct write after patch submission) |
| Per-world stories INDEX | `worlds/<world_slug>/stories/INDEX.md` | Always (first-run create; append thereafter) |

Bootstrap does NOT write `pages-prose/PG-1.md` (rendered prose is supplied externally) and does NOT write any prose receipt.

## STORY_KERNEL.md Section Contract

Draft `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` as the bundle's compact primary-authored story contract. It MUST begin with a YAML frontmatter block carrying the machine-read fields consumed by `tools/world-mcp/src/context-packet/story-bundle-context.ts`, followed by these sections in this order unless the user explicitly approves a clearer order for the specific bundle:

```yaml
---
story_id: STORY-<integer>
story_slug: <story_slug>
root_branch_id: BR-1
root_page_id: PG-1
cast_bind_list:
  - char_id: CHAR-<integer> | null
    stent_id: STENT-<integer>
    role_in_story: [<role_in_story values>]
player_agency_surface:
  - STENT-<integer>
mysteries_in_play:
  - m_id: M-<integer>
    status: <unresolved_mystery_claims.status value>
    future_resolution_safety: <safety label>
    domain_overlap: <domain or "none">
invariants_acknowledged:
  - <invariant id or label>
---
```

1. `# <Story Title>`
2. `## Story Identity` — world slug, story slug, `STORY-<integer>`, root branch, root page, premise summary, POV, tone, and content intensity.
3. `## Player Agency Contract` — exactly these three bullets:
   - **Agency surface** — which `STENT` record(s) the player primarily controls.
   - **Write-in envelope** — what kinds of manual actions are admissible.
   - **Viewpoint limits** — whether the player may act on knowledge the viewpoint character lacks.
4. `## Cast and Roles` — active `STENT` ids, parent `CHAR` ids, display names, and `role_in_story` values.
5. `## Opening Situation` — the public situation, private/contested knowledge labels, initial location, and opening pressure.
6. `## Canon Grounding` — the load-bearing parent-world canon excerpts and mirrored `SF` ids the opening depends on.
7. `## Protected Mystery and Invariant Boundaries` — forbidden mystery resolutions and invariant constraints that Phase 9 gate 3 must preserve.
8. `## Initial Continuation Contract` — expected first hinge, emitted choice surface, and seed/JIT continuation posture.

The `## Player Agency Contract` is load-bearing. Downstream `branching-story-turn-cycle` uses it as the stable routing input for write-in action-source legality, and `branching-story-prose-attach` uses it to flag rendered prose that implies a broader or narrower player agency surface than the bundle permits.

The frontmatter is authoritative for machine retrieval. Keep `cast_bind_list` in sync with `## Cast and Roles`, and keep `mysteries_in_play` / `invariants_acknowledged` in sync with `## Protected Mystery and Invariant Boundaries`; those markdown sections are the human rendering of the same data.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles governs this skill's record discipline; §Tooling Recommendation mandates the retrieval surface
- `.claude/skills/_shared-templates/story-state-contract.md` — predicate DSL (§5), action routing (§6), eight hard gates (§7), page-plan minimum contract (§8), shared write order (§10)
- `.claude/skills/_shared-templates/story-record-schemas.md` — §4 record schemas (all 17 story-bundle record classes plus §4.6 prose receipt)
- `reports/prose-quality-instructions.md` — canonical source for the page plan's verbatim §2 (Content Policy), §3 (Prose Craft Contract), §19 (Render-Time Instruction Template)
- `worlds/<world_slug>/WORLD_KERNEL.md` and `worlds/<world_slug>/ONTOLOGY.md` — world identity, invariants, ontology categories the bundle's records must respect
- `worlds/<world_slug>/characters/INDEX.md` — every entry in `selected_cast[]` must resolve to an existing CHAR-<integer> dossier
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', story_slug=<story_slug>, seed_nodes=<cast CHAR ids + initial_location label if provided>, token_budget=<default>)` — relevant CF / INV / M / OQ / ENT / SEC records bearing on the cast and opening situation. The `story_slug` is the target bundle slug; `story_bundle_context` is `null` because the bundle does not exist yet.
- `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` — canonical CLI for deterministic PG hash computation per shared contract §4.2a "Tooling" subsection; consumed at Phase 9. Reuses the shared `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` helpers exported from `@worldloom/world-index/hash/content` that the validator's `snapshot_replay_equality` consumes — single source of truth across authoring and validation paths. Hand-rolling the canonical-JSON serializer is forbidden.

Bundle-target collision discipline (per-nested-scope bootstrap variant): `worlds/<world_slug>/stories/<story_slug>/` MUST NOT exist; the parent world directory MUST exist. Absence of the bundle target IS the prerequisite — collision aborts at Pre-flight.

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `reports/prose-quality-instructions.md` into working context. Abort with clear missing-file error on any unreadable path.
2. Resolve `worlds/<world_slug>/`. Abort if the directory does not exist, or if `WORLD_KERNEL.md` / `ONTOLOGY.md` are absent.
3. Verify `worlds/<world_slug>/stories/<story_slug>/` does NOT exist. Abort with a slug-collision error if it does.
4. Load `worlds/<world_slug>/characters/INDEX.md`. For every entry in `selected_cast[]`, verify it resolves to an existing CHAR dossier in the world. Abort with a cast-resolution error on any miss.
5. Allocate ids via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)` for every class to be created: `STORY` (per-world; no story_slug param needed), `BR` (will be `BR-1`), `SE` (will be `SE-1`), `PG` (will be `PG-1`), and class-specific ids for every STENT / STSTAT / STINT / SF / **BEL** / OBL / CNSQ / THR / SREL / STLOC / STOBJ / (optional DA) / CHC / (optional SLT) record to be drafted in Phases 1-8. The allocator returns `<CLASS>-1` for fresh story-bundle scopes when the named bundle directory does not yet exist under an existing world; no skill-side hard-coding of pre-bundle ids is required.
6. Load world canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', story_slug=<story_slug>, seed_nodes=<cast CHAR ids + initial_location label if provided>, token_budget=<default>)`. Confirm `story_bundle_context: null`; bootstrap uses the slug as the target bundle identifier before indexed story-bundle records exist.

Persisted-summary recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. If
`get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
`delivery_status: persisted_with_summary`, retrieve required slices via
`mcp__worldloom__get_persisted_packet_slice` before continuing.

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Normalize the premise into a state seed

Produce a structured seed capturing only the information required to initialize causal state. Do NOT author dramatic acts, act obligations, plot milestones, mandatory midpoint reversals, climax structures, or fixed ending paths.

```yaml
story_seed:
  premise: <verbatim user premise>
  pov: <inherited or supplied>
  tone: <inherited or supplied>
  content_intensity: tame | mature | explicit
  initial_location: <STLOC label + grounding canon>
  initial_pressure: <natural-language statement>
  starting_cast: [STENT-<integer>]   # one entry per cast member
  initial_public_situation: <what is publicly known or visible at the opening>
  private_knowledge: [<short label>]   # things one or more cast members know that the public does not
  contested_claims: [<short label>]    # claims one cast member holds that another denies
  forbidden_mystery_resolutions: [M-<integer>]   # forbidden mysteries plausibly triggered by this premise's pressures
```

## Phase 2: Mirror load-bearing world facts

Create `SF` records for facts the opening state actually depends on. Each mirrored `SF` follows shared contract §4.5.3: `id`, `story_id`, `created_at_page`, `supersedes`, `statement`, `authority`, and `derived_from`. For ordinary mirrored world facts, set `authority: branch_local` and keep `derived_from` as a non-empty list containing the parent `CF-<integer>` ids. Use `authority: branch_local_counterfactual` only for deliberate branch-local contradictions that must not be laundered into world canon, and `authority: canon_candidate` only when the opening state intentionally creates a held-for-promotion claim. Record epistemic asymmetry with `BEL` records, not fact-side knowledge fields.

Do NOT mirror broad world background. The mirror exists so the turn-cycle does not re-query the world index for facts already known to constrain opening choices.

## Phase 3: Create initial belief state

For every cast member, create only the `BEL` records that affect immediate choice logic at the opening (per shared contract §4.1 schema, FOUNDATIONS §Story Bundles §6a Belief vs. Fact):

- What they want (use `STINT` if active goal; `BEL` if felt belief about possibility).
- What they think is happening.
- What they know or misunderstand about other cast members.
- What they can plausibly perceive at the opening (grounded in `state_snapshot.visible_affordances`).

Use `BEL` (not `SF`) for false beliefs, suspicions, rumors, lies, and private assumptions. `BEL.truth_relation` and `BEL.visibility` set per shared contract §4.1 — these are consumed by the social-state firewall per FOUNDATIONS §Story Bundles §6a.

For every cast-member `STENT`, set `role_in_story` as a list from the closed shared contract §4.4b values: `viewpoint`, `player_proxy`, `primary_actor`, `opposing_actor`, `allied_actor`, `authority`, `dependent`, `witness`, `information_source`, `pressure_source`, `social_bridge`, `background`. Use multiple values only when both are operationally true.

For every active cast-member `STENT`, create exactly one initial `STSTAT` record carrying the opening life / agency / location state per shared contract §4.5.13. Use `life: alive` unless the premise explicitly starts with a dead or unknown-status entity; choose `agency` from the contract enum; set `location` to the opening `STLOC` when known, otherwise `unknown` / `concealed` / `offstage` as appropriate. `PG-1.state_snapshot.entity_status` is derived from these active `STSTAT` records; do not author an independent status block.

**DA triage at opening.** Scan the user premise, opening scene, starting inventory, faction briefings, rumors, public notices, private letters, requested clues, maps, recordings, inscriptions, object-with-text, and existing world-level DA references. For each candidate, apply the triage rubric and decision matrix at `.claude/skills/_shared-templates/da-authoring-reference.md` §Triage and §Decision matrix. Create a DA only when content / authorship / circulation / truth relation has persistent state value. For every bootstrap DA, satisfy the patch obligations at `.claude/skills/_shared-templates/da-authoring-reference.md` §Patch obligations: allocate via `story_da_ids`; create via `append_story_diegetic_artifact_record`; include it in `SE-1.state_delta.create[]` and `PG-1.state_snapshot.active_records.DA[]`; create BEL for initial readers with an appropriate `basis.access_route`; create STOBJ when physical custody, location, damage, or sealing matters; and satisfy `expected_witness_coverage` for `public` / `factional` circulation with same-event indirect-route BEL propagation or a parseable `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` tag in `SE-1.world_logic_rationale`.

## Phase 4: Create initial debts

Create 1–3 `THR` records tracking the opening pressure. Create `OBL` / `CNSQ` records only when they constrain a choice, demand response, track promise / risk / threat / cost, or create a future consequence if ignored. Every `OBL`, `CNSQ`, and `THR` record must set `urgency: low | medium | high` so later debt-salience checks can rank them uniformly. Create `SREL` records for relationships that constrain opening choice. Each `SREL.direction` uses the structured form from shared contract §4.5.7: `kind: directed` requires non-null `from` and `to` STENT ids, while `kind: bidirectional` requires `from: null` and `to: null`.

```yaml
direction:
  kind: directed
  from: STENT-1
  to: STENT-2

direction:
  kind: bidirectional
  from: null
  to: null
```

**Good debt** changes what a cast member can actually do at the opening. **Bad debt** restates the premise, names a theme, encodes an act structure, or predicts a future plot beat. Do not create bad debt.

## Phase 5: Seed commitment blocks (optional)

Conditional on the `seed_commitment_blocks` argument:

- `none`: skip; the turn-cycle will create branch-scoped JIT blocks at runtime.
- `minimal`: create 4-8 broad `SLT` records covering recovery / conflict-or-evasion / investigation / bond_shift-or-status_shift / movement-or-protection / fallback-continuation. Add disclosure and/or recovery blocks only if the opening pressure plausibly calls for them within the first few turns.
- `standard`: create 8–14 blocks (cap).

All seed blocks: `scope.visibility: global_author_pool`, `scope.branch_id: null`, `created_at_page: null`, `provenance.origin: bootstrap_seed`. Predicate preconditions reference only world canon, mirrored `SF` from Phase 2, and bootstrap-created `BEL` / `SREL` / `STENT` ids from Phases 3-4 — no branch-local records (there is no branch-local state yet at bootstrap; including any would fail Phase 9 gate 4 branch isolation).

Use the existential predicates in the predicate DSL for seed-block social-state coverage when the opening seed includes matching state. The function-call forms below are notation only; emitted `SLT.preconditions.hard | soft` entries are flat predicate objects per shared contract §5. Prefer actor-unbound existential predicates such as `any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)`, `any_consequence_pending(alias, kind?, urgency?, derived_from?)`, `any_thread_active(alias, tag?, urgency?)`, `any_relationship_axis(alias, axis, comparator, value, participant_role?)`, `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)`, and `any_intention(alias, holder_role?, urgency?)` to prefilter broad `global_author_pool` blocks without naming branch-local ids. Pick stable aliases that describe the matched record's role in the seed block, for example `urgent_debt`, `pending_fallout`, `trust_edge`, `public_belief`, or `open_intent`.

`effects.create`, `effects.supersede`, `effects.close`, and `exit_options[].likely_effects` may reference a matched record as `bound:<alias>` only when a hard or soft precondition on the same seed `SLT` introduces that alias with one of the `any_*` predicates. Do not use `bound:<alias>` as a prose label or as a placeholder for a record the seed block did not bind.

Commitment blocks are causal moves, not dramatic acts, arcs, or plot rails — the schema discipline at shared contract §4.4 plus FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves) forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, and shape discriminators.

## Phase 6: Commit root event and root page snapshot

In working memory, draft `SE-1`:

```yaml
id: SE-1
event_kind: story_start
actor: system
outcome_route: accept
world_logic_rationale: >
  <how each cast member's opening location, intention, and belief state
   arises from the premise + world canon>
state_delta:
  create: [<every STENT / STSTAT / STINT / SF / BEL / OBL / CNSQ / THR / SREL /
           STLOC / STOBJ / DA id created in Phases 1-4>]
```

Draft `PG-1` per shared contract §4.2:

- `parent_page_id: null`, `state_hash_parent: null`, `turn_index: 0`
- `branch_path: ["PG-1"]` — the ordered list of pages in this branch from root to here; for the root page the list contains exactly the root id. Required by §4.2 of the shared contract; §4.4 documents the cross-reference into `SLT.scope.visible_branch_path_prefix` and the `recursive_reference_closure` validator's authorization rule. Subsequent pages emitted by `branching-story-turn-cycle` extend the parent's `branch_path` by appending the new PG id.
- `input.choice_id: null`, `input.manual_action_text: null`, `input.resolved_event_id: SE-1`
  - This both-null input pair is lawful only for PG-1 because `SE-1.event_kind: story_start`; per shared contract §4.2 input legality, all non-`story_start` pages must name exactly one source action (`choice_id` or `manual_action_text`).
- Full `state_snapshot` (active_records including the BEL and STSTAT keys; `entity_status` derived from active `STSTAT` records, one entry per active `STENT`; visible_affordances with ordinal indices; unresolved_mystery_claims; continuation status)
- `plan.plan_hash: <final sha256 computed per shared contract §4.2a after the page plan bytes are finalized>`
- `prose_plan_path: pages-prose-plans/PG-1.md` (canonical top-level plan address; see `mcp__worldloom__describe_envelope_schema(op_kind='create_pg_record')` for the current machine-readable op shape).
- `state_hash`: final sha256 computed per shared contract §4.2a after `plan.plan_hash` and `validation_trace` are finalized.
- `validation_trace`: populated in Phase 9

## Phase 7: Author the root page plan

Draft `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-1.md` per shared contract §8 — 19 sections.

The drafted plan bytes are the future direct-write artifact. Keep the complete UTF-8 bytes stable in working memory so Phase 9 can compute `PG-1.plan.plan_hash` over exactly the bytes that will be written after patch submission.

**§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from `reports/prose-quality-instructions.md`.** This is operationally load-bearing — the external prose renderer has no cross-plan state, so every page render is cold context. Compacting these sections would defeat the self-contained-plan contract.

Bootstrap-specific section content: §1 inlines a short `STORY_KERNEL.md` excerpt; §4 inlines world-canon excerpts directly relevant to the opening (faction stances, taboos, hazards constraining opening choices); §5 enumerates active cast and entity statuses; §6 names the initial location and the grounded affordances available there; §7 dramatizes the `story_start` event without inventing structural facts; §8 names the required opening beats (typically: establish situation, surface the pressure, set up the first hinge); §9 names the load-bearing relationships and beliefs at play; §10 lists open obligations / consequences / threads with `urgency`; §11 names forbidden mystery resolutions; §12 names the intended stopping point (the first commitment hinge); §13 previews the emitted choices.

No word-count target anywhere in the plan. Engine jargon (record ids, gate names) confined to §15 frontmatter only.

## Phase 8: Generate first choices

Emit 3-5 `CHC` records representing different commitments — not variants of the same wording. Sample different axes: action vs restraint, truth vs deception, intimacy vs distance, risk vs safety, public vs private, duty vs desire (at authorial discretion within the opening's plausibility envelope). Always emit a write-in slot.

Each `CHC` carries the shared contract §4.5.12 shape: `id`, `story_id`, `created_at_page`, `supersedes`, `surface_label`, `player_visible_intent`, `target_or_action_families` (a non-empty list using the §4.4a `action_family` taxonomy), `likely_state_pressure`, `associated_commitment_block` (`SLT-<integer>` if known, else null — turn-cycle will JIT), `grounded_in`, and optional `success_policy` when a later `SE.outcome_route` resolves the choice through `attempt`.

For every emitted `CHC`, populate `grounded_in.records` with at least one active record id from the drafted `PG-1.state_snapshot.active_records` that makes the choice available or meaningful (for example the actor `STENT`, location `STLOC`, relevant `STOBJ`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, or story-local `DA`). When the choice directly exposes one or more visible affordances, also populate `grounded_in.affordance_ordinals` with the corresponding `PG-1.state_snapshot.visible_affordances[].ordinal` values. Do not use `target_or_action_families` alone as grounding evidence.

## Phase 9: Validate

Run the 8 shared hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 against the drafted records. Populate `PG-1.validation_trace` with one-line PASS rationale per gate:

1. **input legality** — `story_start` has no parent page and uses the shared contract §4.2 PG-1 carve-out: `choice_id: null`, `manual_action_text: null`, `resolved_event_id: SE-1`.
2. **parent snapshot compatibility** — no parent snapshot; `state_hash_parent: null` matches.
3. **mystery / invariant firewall** — no forbidden `M-<integer>` resolved; no INV violated; `forbidden_mystery_resolutions` properly enumerated in state seed.
4. **branch isolation** — no sibling-branch state in `state_snapshot.active_records`; no seed SLT references branch-local records (none exist at bootstrap).
5. **append-only delta** — `SE-1.state_delta` is creates-only; no supersessions or closes at root.
6. **consequence capacity or terminal proof** — at least one eligible commitment block (seed or JIT-able); terminal root rejected as authoring error.
7. **plan grounding** — every required beat and every emitted `CHC` is grounded in active records or world canon. (a) Each `PG-1.state_snapshot.visible_affordances[].grounded_in[]` resolves to active `STLOC` or `STOBJ` records ONLY per shared contract `_shared-templates/story-record-schemas.md` §4.2 schema pattern `^(STLOC|STOBJ)-[0-9]+$` — `STENT`, `CNSQ`, `OBL`, `BEL`, and other story-bundle ids are NOT valid grounding for `visible_affordances[].grounded_in[]` and the `record_schema_compliance` validator rejects them at dry-run. (b) Each emitted `CHC.grounded_in.records[]` resolves to `PG-1.state_snapshot.active_records` (any active record class is permissible — STENT, STOBJ, STLOC, CNSQ, OBL, BEL, SREL, THR, DA, etc. per shared contract §4.5.12). (c) Each emitted `CHC.grounded_in.affordance_ordinals[]` resolves to `PG-1.state_snapshot.visible_affordances[].ordinal`.
8. **canon promotion hold** — `NOT_APPLICABLE: bootstrap does not assert canon-level truths at root; no SE.promotion_claims drafted`.

Plus 4 bootstrap-additional checks (recorded in working memory; not on `PG.validation_trace`):

1. **Cast resolution** — every `selected_cast[]` entry resolved to an existing CHAR dossier (covered by Pre-flight step 4; re-verified here).
2. **No SF globalization** — every mirrored `SF` carries parent CF ids in `derived_from`, and its branch-local statement does not widen the parent CF's geographic / temporal / social scope.
3. **Root page plan self-containment** — the plan body contains all 19 sections including the verbatim §2 / §3 / §19, with no external-renderer-undefined references.
4. **Continuation capacity** — at least one seed `SLT` is eligible at `PG-1` (`seed_commitment_blocks != 'none'`) OR the turn-cycle's JIT path is the planned continuation (`seed_commitment_blocks: 'none'`). Terminal root rejected as authoring error.

After all gates and additional checks pass, compute final PG hashes per shared contract §4.2a:

1. Compute `PG-1.plan.plan_hash` and `PG-1.state_hash` via the canonical CLI at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-path> --pg <pg-draft-path>` per shared contract §4.2a "Tooling" subsection. The CLI emits `{plan_hash, state_hash}` as JSON to stdout: stamp the `plan_hash` output onto `PG-1.plan.plan_hash` (covering the exact UTF-8 bytes of the finalized `pages-prose-plans/PG-1.md` draft) and the `state_hash` output onto `PG-1.state_hash` (covering the deterministic canonical JSON fork-state payload after `plan.plan_hash` and `validation_trace` are final, excluding only `state_hash` itself). Hand-rolling the canonical-JSON serializer is forbidden — the CLI reuses the shared `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` helpers exported from `@worldloom/world-index/hash/content` that the validator's `snapshot_replay_equality` consumes, so authoring-time and validation-time hashes are byte-identical by construction. Pass a draft PG record that contains placeholder values for both hashes (or omits them entirely); the CLI ignores the input's `state_hash` field and overwrites the input's `plan.plan_hash` in the canonical payload with the value computed from `--plan`.
2. Verify both values are 64-character lowercase hex sha256 strings. Missing, placeholder, uppercase, non-hex, or stale values are hard-stop authoring errors before Phase 10.

If any gate, additional check, or hash check fails, abort before Phase 10 — write nothing.

## Phase 10: Commit / Write — HARD-GATE fires

1. Build the patch plan covering every record drafted in Phases 1-8 as a single envelope. Operations: `create_stent_record`, `create_ststat_record`, `create_stint_record`, `create_sf_record`, `create_bel_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stloc_record`, `create_stobj_record`, `append_story_diegetic_artifact_record` (if story-local DA records are applicable, with `expected_id_allocations.story_da_ids`), `create_br_record`, `create_se_record`, `create_pg_record`, `create_chc_record` (per choice), `create_slt_record` (per seed block if `seed_commitment_blocks != 'none'`). Each op requires a `target_file` field naming the on-disk write path (e.g., `worlds/<world_slug>/stories/<story_slug>/_source/<class>/<ID>.yaml`); see `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` or invoke `mcp__worldloom__describe_envelope_schema(op_kind?)` at pre-flight for the machine-readable per-op shape.
2. Dry-run via `mcp__worldloom__validate_patch_plan`. This run also exercises `record_schema_compliance` for `BEL` and `PG`; placeholder or malformed PG hashes must not reach this step. **Validate-path selection by envelope shape**: bootstrap envelopes are built from disk YAML files by construction (Phase 10 step 1's persist-envelope-as-JSON + the on-disk records the engine ops reference), and inline JSON pasted into the MCP tool call is a separate buffer from `envelope.json` on disk — any divergence between the two produces a dry-run that passes the inline version while the disk version is what actually submits. Bootstrap envelopes routinely exceed the size where inline-paste-drift becomes a real risk (a full cast + standard seed pool easily reaches 70KB+ per step 5); prefer the equivalent CLI path that reads `envelope.json` directly: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>`. The CLI path is functionally equivalent — same engine code, same `{ status, verdicts, validators_run }` response shape, same validator coverage — and is the dry-run analogue of the submit-path CLI named in step 5. The CLI path also serves as the fresh-process escape valve when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory. See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan and `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix for the equivalent submit-path treatment.
3. Present the complete deliverable summary to the user: bundle path, cast roster, record inventory by class with counts, page plan structural preview (§1 / §5 / §6 / §12 / §13 — the engine-readable sections; §2 / §3 / §19 are too long to inline in preview), emitted choices list.
4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
5. On approval: persist the patch plan envelope as JSON (e.g., `/tmp/<plan-id>.json`), invoke the canonical signer to issue the `approval_token` (`node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` — see `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token), then call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and the issued token. Approval tokens are single-use, plan-bound, default-20-minute-expiry. **Submit-path selection by envelope size**: bootstrap envelopes routinely exceed 50KB (a full cast + standard seed-pool bundle produces 50+ records with full snapshot fields, easily 70KB+); for envelopes >50KB submit via the CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` (persist the signed token to a text file first). The CLI path is functionally equivalent — same engine code, same `PatchReceipt`, same failure-mode codes — but bypasses MCP transport size constraints; see `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan. The CLI path also serves as the fresh-process escape valve when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory and a full Claude Code session restart is not immediately available; in that case, switch to the CLI submit path regardless of envelope size (see `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix). **Reading CLI output**: the CLI submit's JSON output starts with `{ "ok": true|false, "code": ..., ... }` at the top of stdout, followed by a verbose `validators_run[]` array. Inspect the top-line `ok` field (e.g., via `jq -r .ok` or `head -10`) to determine success; do not tail-truncate the output and infer status from the validator dump alone, since validator-PASS rows appear in both success and pre-apply-failure responses and the success/fail discriminator is the top-line header. If the success header may have been missed, do not re-run submit just to recover a receipt. Reusing the same consumed token returns `approval_replayed`; a genuinely fresh token over an already-applied plan is not the replay gate and may attempt duplicate writes or hit later engine protections, so inspect the target story `_source/` records and receipt/log output before any further submit attempt.
6. On patch success, write `STORY_KERNEL.md`, then write `pages-prose-plans/PG-1.md` using the exact bytes hashed into `PG-1.plan.plan_hash`.
7. Run post-write plan-hash verification (shared contract §10 step 5a) before any `INDEX.md` update: `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/PG-1.md --pg <PG-1 record file>`, then confirm the emitted `plan_hash` equals the committed `PG-1.plan.plan_hash`. If they differ, do not update `INDEX.md`; surface the mismatch and both hashes (committed vs recomputed); treat it as a direct-artifact partial failure per `docs/HARD-GATE-DISCIPLINE.md`. The patch plan is not re-submitted; only the disk artifact is reconciled to the already-approved bytes.
8. After post-write verification passes, update bundle `INDEX.md`, then per-world `stories/INDEX.md` (first-run create or append). The bundle `INDEX.md` at first run contains: a Bundle Identity table (World / Story slug / Story ID / Root branch / Root page / Genesis event / Created), a Cast Roster table (STENT / CHAR / Display name / Role in story), and one section per non-empty record class — Branches / Pages / Active Threads / Open Obligations / Pending Consequences / Relationships / Story-Local Facts / Story-Local Beliefs / Locations / Objects / Commitment Block Pool / `## Emitted Choices at PG-1` / Mystery Reserve at Bundle Scope / `## Validation Trace on PG-1` (the latter populated from `PG-1.validation_trace` per the shared eight hard gates). The per-world `stories/INDEX.md` at first run contains a Bundles table listing the new bundle's slug, story_id, root page, and created date; subsequent bundles append rows. Bootstrap defines this convention; downstream skills (`branching-story-turn-cycle` and others) inherit and extend it.
9. Report bundle path + record inventory to the user. Do NOT `git commit`.

**Failure behavior**: patch fail → write nothing; surface failed gate and the corrective action. Patch success + markdown write fail → story-bundle `_source/` records are authoritative; surface the partial-failure to the user with a one-paragraph diagnostic; do not silently retry. Terminal root → authoring error, abort before patch submission.

## Validation Rules This Skill Upholds

- **Rule 1 (No Floating Facts)** — enforced at Phase 2 + Phase 7. Mechanism: every drafted record conforms to the shared contract §4 schemas (required fields per record class); Phase 9 gate 7 (plan grounding) requires every required beat and every emitted `CHC` to be grounded in active records or world canon, with `visible_affordances[].grounded_in[]` restricted to active `STLOC` / `STOBJ` records only and `CHC.grounded_in.records[]` permitting any active record class — see gate 7's per-surface enumeration for the precise pattern.
- **Rule 4 (No Globalization by Accident)** — enforced at Phase 2 + Phase 9 bootstrap-additional check 2. Mechanism: each mirrored `SF` records parent CF ids in `derived_from`; the bootstrap-additional check rejects scope-widening (a regional CF cannot be mirrored as a globally-scoped `SF`).
- **Rule 5 (No Consequence Evasion)** — enforced at Phase 4 + Phase 9 gate 6. Mechanism: the good-debt-vs-bad-debt filter at Phase 4 rejects debt that does not change what a cast member can do; Phase 9 gate 6 requires continuation capacity (at least one eligible commitment block) or terminal proof (which is itself rejected at root).
- **Rule 7 (Preserve Mystery Deliberately)** — enforced at Phase 1 + Phase 9 gate 3. Mechanism: `forbidden_mystery_resolutions` enumerated in the state seed during Phase 1 (drawn from the loaded Mystery Reserve); Phase 9 gate 3 (mystery / invariant firewall) verifies no forbidden `M` is resolved and no `mystery_policy.forbidden_resolutions` are breached by any drafted seed `SLT`.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-record-schemas.md`:

- `STENT`, `STSTAT`, `STINT`, `SF`, `BEL` (§4.1), `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA` — story-bundle record classes
- `PG` (§4.2) — page snapshot
- `SE` (§4.3) — event
- `SLT` (§4.4) — commitment block
- `BR` — branch
- `CHC` — emitted choice

The shared contract is the canonical schema reference. This skill does not duplicate schemas locally.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 2, 7 | Shared contract §4 record schemas; Phase 7 plan-grounding (gate 7). |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — bootstrap mirrors existing world canon; it does not introduce new species / rituals / technology / artifacts to world canon. Handoff to `canon-addition` when a story claim is promoted via `story-fact-promotion-to-canon`. |
| Rule 3 (No Specialness Inflation) | N/A | Not applicable — same handoff as Rule 2; bootstrap does not add exceptional capabilities to world canon. |
| Rule 4 (No Globalization by Accident) | Phase 2, 9 | Mirrored SF records carry parent CF ids in `derived_from`; Phase 9 bootstrap-additional check 2 rejects scope-widening. |
| Rule 5 (No Consequence Evasion) | Phase 4, 9 | Good-debt-vs-bad-debt filter at Phase 4; Phase 9 gate 6 (consequence capacity / terminal proof). |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — bootstrap creates new story-bundle records; it does not mutate world canon. World canon mutation routes through `canon-addition` (the only Rule-6-enforcing skill). |
| Rule 7 (Preserve Mystery Deliberately) | Phase 1, 9 | `forbidden_mystery_resolutions` enumerated in state seed; Phase 9 gate 3 (mystery firewall). |
| Rule 11 (No Spectator Castes) | N/A | Not applicable — Rule 11 governs new exceptional capabilities at world canon; bootstrap does not add them. |
| Rule 12 (No Single-Trace Truths) | N/A | Not applicable — Rule 12 governs hard-canon core truths; bootstrap operates at story-bundle scope, not world canon. |
| Canon Layers | Pre-flight, Phase 2 | Bootstrap reads world canon (layers 1-4 + Mystery Reserve) via context packet; story-bundle records carry story-local truths per FOUNDATIONS §Story Bundles §1. |
| Mystery Reserve | Pre-flight, Phase 1, 9 | World mysteries loaded via context packet; `forbidden_mystery_resolutions` enumerated; Phase 9 gate 3 enforces firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | Phase 6, 7, 10 | Story state is authoritative at PG-1 commit; no `pages-prose/PG-1.md` is written by this skill; the page snapshot is the fork primitive. No ARC_TRACE record emitted. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 5 | Seed `SLT` records follow the §4.4 schema discipline; no `arc_contract` / `dramatic_unit` / `execution_envelope` / nested `effect_model` / `stop_policy` / `shape:` / `record_version` discriminators. |
| §Story Bundles §5b (Schema-Minimalism) | All record-drafting phases | Every drafted record (STENT/STSTAT/STINT/SF/BEL/SE/OBL/CNSQ/THR/SREL/STLOC/STOBJ/DA/BR/PG/CHC/SLT) conforms to the shared contract §4 schemas; nice-to-have fields are not added at this skill. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 3 | Initial belief state uses `BEL` (not `SF`) for false beliefs / suspicions / rumors / lies / private assumptions; `truth_relation` and `visibility` set per shared contract §4.1. |
| Change Control Policy | N/A | Not applicable — canon-reading skill does not emit Change Log Entries. Handoff to `canon-addition` when story claims promote to canon. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet` per FOUNDATIONS §Tooling Recommendation. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<subdir>/*.yaml` (CF / CH / INV / M / OQ / ENT / SEC); this skill NEVER attempts such writes. Story-bundle records under `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` are this skill's exclusive write surface, routed through the patch engine.
- **Never write rendered prose at bootstrap.** `pages-prose/PG-1.md` is supplied externally by the user (manual or LLM) and validated by `branching-story-prose-attach`. Bootstrap writes only the plan at `pages-prose-plans/PG-1.md`.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every field in every record drafted by this skill conforms to the shared contract §4 schemas. No nice-to-have fields, no derived rollups, no legacy lifecycle fields (no `prose_status`, no `state_delta_summary`, no `record_version`, no `shape:` discriminator, no `stop_policy`). Each retained field is consumed by a validation gate, replay primitive, predicate, fork operation, or audit-trail record.
- **Verbatim §2 / §3 / §19 of the page plan.** Phase 7 inlines `reports/prose-quality-instructions.md` §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template verbatim. The external LLM has no cross-plan state; every page render is cold context. Compacting these sections would defeat the self-contained-plan contract.
- **No word-count targets** anywhere in the plan (per FOUNDATIONS §Story Bundles §9). Pacing is expressed structurally via beats and stop conditions, not as a per-page or per-arc word quota.
- **Skills do not chain.** Bootstrap never invokes `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. Bootstrap writes its outputs to disk; the user separately invokes downstream siblings with the bundle path as input.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root, not the main repo root.

## Final Rule

Bootstrap initializes a story bundle's root causal state without rendering prose and without establishing any prose-rendering lifecycle — the page snapshot is the fork primitive, and rendered prose is the external renderer's authorial artifact, not bootstrap's responsibility.
