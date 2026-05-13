# branching-story-bootstrap

## Purpose

Create a new branching-story bundle inside an existing worldloom world. Bootstrap initializes the root causal state (entities, intentions, facts, beliefs, debts), commits the root event and root page snapshot, authors the root page's comprehensive prose plan, and emits the first choices. The skill does not render prose and does not establish any prose-rendering lifecycle.

Bootstrap is the first skill in the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`. Every state-changing decision in this skill references the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` for record schemas, predicate DSL, action-routing, the eight shared hard gates, the page-plan minimum contract, and the shared write order.

## Inputs

Required:

- `world_slug` — existing world directory under `worlds/`.
- `story_slug` — kebab-case slug; must not collide with an existing story bundle in the target world.
- `premise` — one-to-three-paragraph natural-language premise.
- `selected_cast[]` — list of `CHAR-NNNN` ids from the world's `characters/INDEX.md`.

Optional:

- `pov` — perspective convention (e.g., first-person, close third, omniscient). Default: close third.
- `tone` — tonal contract (e.g., grim, lyrical, dry comic, pulp). Default: inherit from `WORLD_KERNEL.md` tonal contract.
- `content_intensity` — `tame | mature | explicit`. Default: `mature`.
- `initial_location` — `STLOC` candidate (label and grounding canon).
- `opening_pressure` — natural-language statement of the pressure that puts the cast into motion at the opening.
- `seed_commitment_blocks` — `none | minimal | standard`. Default `minimal`.

`seed_commitment_blocks: none` defers all commitment blocks to runtime JIT (created by `branching-story-turn-cycle`). `minimal` seeds 4–8 broad blocks (one each for aftermath, confrontation, information-seeking, relationship-pressure, movement / escape, fallback continuation, plus optional reveal / refusal blocks). `standard` seeds 8–14 blocks (cap).

## Output Bundle

Patch-engine story records (submitted via `mcp__worldloom__submit_patch_plan` per shared contract §10):

- `STENT-NNNN` mirrors for every entry in `selected_cast[]`.
- Initial `STINT-NNNN` records — one per cast member with at least one active intention at the opening.
- `SF-NNNN` records for load-bearing world facts (those required by the premise, cast, initial location, or opening action logic).
- `BEL-NNNN` records for private knowledge, public claims, misconceptions, and deceptions in play at the opening.
- `THR-NNNN` records — 1–3 active threads tracking the opening pressure.
- `OBL-NNNN` and `CNSQ-NNNN` records as needed to make the opening pressure actionable.
- `STLOC-NNNN`, `STOBJ-NNNN`, optional `DA-NNNN` as the opening situation requires.
- `SREL-NNNN` records for relationships between cast members that constrain choice at the opening.
- `BR-0001` — the root branch.
- `SE-0001` with `event_kind: story_start`.
- `PG-0001` with full state snapshot (per shared contract §4.2).
- 3–5 `CHC-NNNN` records emitted by `PG-0001` plus the write-in slot.
- Optional `SLT-NNNN` commitment blocks per `seed_commitment_blocks` mode (per shared contract §4.4).

Direct-write markdown artifacts (per shared contract §10 step 5):

- `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` — primary-authored narrative root for the bundle.
- `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-0001.md` — comprehensive prose plan for the root page (per shared contract §8 page-plan minimum contract).
- `worlds/<world_slug>/stories/<story_slug>/INDEX.md` — bundle-local index.
- `worlds/<world_slug>/stories/INDEX.md` — per-world story index; first-bundle creation or append.

No `pages-prose/PG-0001.md` is written by this skill. No prose-receipt is written. No ARC_TRACE record exists in this pipeline.

## Pre-Flight

1. **Load FOUNDATIONS** — `docs/FOUNDATIONS.md` must be loaded into context before any record is drafted. The §Story Bundles subsection governs this skill.
2. **Load the shared contract** — `.claude/skills/_shared-templates/story-state-contract.md` for schemas, gates, write order, and the 19-section page-plan contract.
3. **Resolve the world** — confirm `worlds/<world_slug>/` exists with a `WORLD_KERNEL.md` and `ONTOLOGY.md`. Load the world's `characters/INDEX.md` and verify every entry in `selected_cast[]` resolves to a CHAR dossier.
4. **Reject slug collisions** — `worlds/<world_slug>/stories/<story_slug>/` must not exist. If it does, abort with a clear error.
5. **Allocate ids** — through `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)` for every class to be created in this bootstrap. Allocate `STORY-NNNN` (per-world), `BR-0001`, `SE-0001`, `PG-0001`, plus class-specific ids for every STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / DA / CHC / SLT to be created.
6. **Load relevant world canon** — context packet via `mcp__worldloom__get_context_packet(task_type="story_bootstrap", seed_nodes=[...], token_budget=...)` seeded with the cast's CHAR ids, the initial location's name (if provided), and any premise-derived seed nodes.
7. **HARD-GATE** — present the proposal (premise summary, cast, initial location, opening pressure, seed-commitment-blocks mode, output bundle inventory) to the user for explicit approval before any write. Auto Mode does not override the gate.

## Phases

### Phase 1: Normalize the premise into a state seed

Produce a structured seed that captures only the information required to initialize causal state. Do not author dramatic acts, act obligations, plot milestones, mandatory midpoint reversals, climax structures, or fixed ending paths.

```yaml
story_seed:
  premise: <verbatim user premise>
  pov: <inherited or supplied>
  tone: <inherited or supplied>
  content_intensity: tame | mature | explicit
  initial_location: <STLOC label + grounding canon>
  initial_pressure: <natural-language statement>
  starting_cast: [STENT-NNNN]   # one entry per cast member
  initial_public_situation: <what is publicly known or visible at the opening>
  private_knowledge: [<short label>]  # things one or more cast members know that the public does not
  contested_claims: [<short label>]   # claims one cast member holds that another denies
  forbidden_mystery_resolutions: [M-NNNN]   # forbidden mysteries that could plausibly be triggered by this premise's pressures
```

### Phase 2: Mirror load-bearing world facts

Create `SF` records for facts the opening state actually depends on. Each mirrored `SF` must record `derived_from_cf: CF-NNNN` (the world canon fact it mirrors), branch / story scope, certainty, who knows it (cross-reference to `BEL` if epistemic asymmetry exists), and a one-line `why_it_matters_at_opening` note.

Do not mirror broad world background that is retrievable later. The mirror exists so the turn-cycle does not re-query the world index for facts already known to constrain opening choices.

### Phase 3: Create initial belief state

For every cast member, create only the `BEL` records that affect immediate choice logic at the opening:

- What they want (covered by `STINT` if it is an active goal; `BEL` if it is a felt belief about possibility).
- What they think is happening.
- What they know or misunderstand about other cast members.
- What they can plausibly perceive at the opening (grounded in `state_snapshot.visible_affordances`).

Use `BEL` (not `SF`) for false beliefs, suspicions, rumors, lies, and private assumptions. `BEL.truth_relation` and `BEL.visibility` must be set per the shared contract §4.1.

### Phase 4: Create initial debts

Create 1–3 `THR-NNNN` records tracking the opening pressure. Create enough `OBL-NNNN` and `CNSQ-NNNN` records to make the opening pressure actionable.

**Good debt** constrains a choice, demands a response, tracks a promise / risk / threat / cost, or creates a future consequence if ignored.

**Bad debt** restates the premise, names a theme, encodes an act structure, or predicts a future plot beat.

If creating a debt does not change what a cast member can actually do at the opening, do not create it.

### Phase 5: Create seed commitment blocks (optional)

If `seed_commitment_blocks: none`, skip. The turn-cycle will create branch-scoped JIT blocks at runtime.

If `seed_commitment_blocks: minimal`, create 4–8 broad `SLT` records covering: aftermath, confrontation / refusal, information-seeking, relationship-pressure, movement / escape, fallback continuation. Add reveal and / or repair blocks only if the opening pressure plausibly calls for them within the first few turns.

If `seed_commitment_blocks: standard`, create 8–14 blocks (cap). Do not exceed.

All seed blocks have `scope.visibility: author_pool`, `scope.branch_id: null`, `created_at_page: null`, `provenance.origin: bootstrap_seed`. Predicate preconditions reference only world canon, mirrored `SF`, and bootstrap-created `BEL` / `SREL` / `STENT` ids (no branch-local records — there is no branch-local state yet at bootstrap time).

### Phase 6: Commit root event and root page snapshot

Create `SE-0001` with:

```yaml
event_kind: story_start
actor: system
outcome_route: accept
world_logic_rationale: >
  The opening situation as established by the premise, cast positions, and
  initial pressure. Names how each cast member's opening location, intention,
  and belief state arises from the premise.
state_delta:
  create: [<every STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / DA id created in Phases 1-4>]
```

Create `PG-0001` with:

- `parent_page_id: null`, `state_hash_parent: null`.
- `turn_index: 0`.
- `input.choice_id: null`, `input.manual_action_text: null`, `input.resolved_event_id: SE-0001`.
- Full `state_snapshot` per shared contract §4.2 (active records, entity statuses, visible affordances, unresolved mystery claims, continuation status, state hash).
- `plan.path: pages-prose-plans/PG-0001.md`, `plan.plan_hash: <computed>`.
- `rendered_prose.path: null`, `rendered_prose.receipt_path: null`.
- `validation_trace` populated per Phase 8.

### Phase 7: Author the root page plan

Write `worlds/<world_slug>/stories/<story_slug>/pages-prose-plans/PG-0001.md` with the 19-section page-plan minimum contract per shared contract §8.

**Verbatim sections.** §2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from `reports/prose-quality-instructions.md`. This is operationally load-bearing — the external prose renderer has no cross-plan state, so every page render must be self-contained.

**Bootstrap-specific section content.** §1 inlines a short excerpt from `STORY_KERNEL.md`. §4 inlines world-canon excerpts directly relevant to the opening (faction stances, taboos, hazards that constrain opening choices). §5 enumerates active cast and entity statuses. §6 names the initial location and the grounded affordances available there. §7 dramatizes the `story_start` event without inventing structural facts. §8 names the required opening beats (typically: establish situation, surface the pressure, set up the first hinge). §9 names the load-bearing relationships and beliefs at play. §10 lists open obligations / consequences / threads. §11 names forbidden mystery resolutions. §12 names the intended stopping point (the first commitment hinge). §13 previews the emitted choices.

No word-count target appears in the plan. No engine jargon appears outside §15 frontmatter.

### Phase 8: Generate first choices

Emit 3–5 `CHC` records that represent different commitments, not variants of the same wording. Each `CHC` must include:

- `surface_label` — what the player sees.
- `player_visible_intent` — the cast member's intended outcome, in their voice.
- `target_or_action_family` — the action family the choice maps to (per shared contract §6).
- `likely_state_pressure` — short label of which debts / beliefs the choice engages.
- `associated_commitment_block` — `SLT-NNNN` if known, else null (turn-cycle will JIT).
- `success_policy` — only when the action family is `attempt`.

Always allow a write-in slot unless the branch is somehow already terminal at root (which should never happen in bootstrap — a terminal root is an authoring error and aborts the skill).

Choices should sample different axes — action vs. restraint, truth vs. deception, intimacy vs. distance, risk vs. safety, public vs. private, duty vs. desire — at the user's discretion within the opening's plausibility envelope.

### Phase 9: Validate

Run the shared eight hard gates per shared contract §7. Populate `PG-0001.validation_trace` with a one-line rationale per gate.

Bootstrap-additional checks:

- Every `selected_cast[]` entry resolves to an actual CHAR dossier and has at least one `STINT` at the opening.
- No mirrored `SF` globalizes local canon. (A canon fact scoped `regional` in the world cannot be mirrored as if `global` in the story bundle.)
- The root page plan is self-contained per the page-plan minimum contract.
- Continuation capacity is satisfied: either at least one seed `SLT` is eligible at `PG-0001`, OR the turn-cycle's JIT path is the planned continuation (`seed_commitment_blocks: none`). Bootstrap never emits a terminal root.

### Phase 10: Write

Follow shared contract §10 write order:

1. Build the patch plan covering all story-bundle records from Phases 1–6 and the seed `SLT` records from Phase 5.
2. Dry-run validate via `mcp__worldloom__validate_patch_plan`.
3. Obtain approval token (re-confirm with the user; the Phase 1 HARD-GATE approval covers the proposal, but execution-mode token acquisition follows the patch-engine contract).
4. Submit the patch plan via `mcp__worldloom__submit_patch_plan`.
5. Write `STORY_KERNEL.md`, then `pages-prose-plans/PG-0001.md`, then `INDEX.md`.
6. Update bundle `INDEX.md` last in the bundle directory.
7. Update per-world `stories/INDEX.md` — append a new row for this bundle (first invocation creates the file).

Do not write `pages-prose/PG-0001.md`. Do not create a prose receipt. Do not run any prose validators.

## Failure Behavior

- If validation fails before patch submission, **write nothing**. Surface the failure to the user with the failed gate and the corrective action.
- If patch submission succeeds but a direct-write markdown artifact fails (typically a filesystem error or anchor conflict), the story-bundle `_source/` records are authoritative. The skill surfaces the partial-failure state to the user and writes a one-paragraph diagnostic to chat. The user can repair the failed artifact directly. **Silent retry is forbidden.**
- A terminal root (a root page whose continuation status is `terminal_closed`) is an authoring error. Abort the skill before patch submission.

## References

- `.claude/skills/_shared-templates/story-state-contract.md` — schemas (§4), predicate DSL (§5), action routing (§6), eight hard gates (§7), page-plan minimum contract (§8), branching procedure (§9), shared write order (§10), mystery / canon authority (§11).
- `reports/prose-quality-instructions.md` — canonical source for the §2 / §3 / §19 verbatim sections of the page plan.
- `docs/FOUNDATIONS.md` — §Story Bundles (Rules 1 / 4 / 5 / 7 at story scope) governs this skill.
- `reports/streamlined-story-pipelines/02-branching-story-bootstrap.md` — the streamlined-pipeline source report for this skill's design intent.
- `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` — the greenfield plan that motivates this proposal; §C.1 is the blueprint summary for this skill.

## What is intentionally NOT in this skill

- No `prose_status` field on `PG-0001` (no prose-rendering lifecycle).
- No deferred prose validators.
- No ARC_TRACE record emission.
- No large pre-authored storylet pool (4–8 default; 14 cap).
- No embedded predicate-DSL re-definition (the contract owns the DSL).
- No repeated patch-engine token mechanics (the contract owns the write order).
- No 19-gate per-phase validation ledger (the eight shared gates are the only gates).
- No bootstrap discipline trace as a separate artifact.
