# Story Character Dossier Retrieval Concerns

Date: 2026-05-20

## Purpose

This report records a concern about how branching-story skills consume upgraded character dossiers, especially files such as `worlds/erotica-world/characters/*.md`.

The immediate worry is whether story workflows read the rich `CHAR-<integer>` dossiers only during bootstrap, distill selected character data into story-local state, and then stop consulting the dossiers; or whether runtime workflows such as `.claude/skills/branching-story-turn-cycle` continue to consult the bound `CHAR-*` files at meaningful points.

This matters because the recent character-dossier upgrades made the dossiers much richer. If story skills only see a small preview or stale story-local projection, runtime turns can drift away from the current character authority.

## User Concern

The concern can be stated as:

- Are character dossiers read once during story bootstrap and then converted into story-local structures that are not refreshed?
- Are `CHAR-*` dossiers re-read during the branching story turn-cycle?
- If they are re-read, are they read deeply enough to include the newly upgraded material?
- If they are not read deeply, do story-local records carry enough projected character authority to preserve voice, pressure behavior, contradictions, desires, fears, and continuity?
- Do the current skills or validators catch drift between a bound story entity and its current dossier?

## Investigation Summary

I reviewed the live story skills and the MCP/index retrieval layer. The key files examined were:

- `.claude/skills/branching-story-bootstrap/SKILL.md`
- `.claude/skills/branching-story-turn-cycle/SKILL.md`
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md`
- `.claude/skills/branching-story-health-audit/SKILL.md`
- `.claude/skills/_shared-templates/story-record-schemas.md`
- `tools/world-mcp/src/context-packet/assemble.ts`
- `tools/world-mcp/src/context-packet/full-body-delivery.ts`
- `tools/world-mcp/src/context-packet/shared.ts`
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`
- `tools/world-mcp/src/tools/get-record.ts`
- `tools/world-mcp/src/tools/get-records.ts`
- Existing bundles under `worlds/erotica-world/stories/red-bunny*`

I also checked the live index for `worlds/erotica-world/_index/world.db`. The indexed character records are large:

| Record | Approx indexed body length |
|---|---:|
| `CHAR-0001` | 95,405 chars |
| `CHAR-0002` | 83,727 chars |
| `CHAR-0003` | 100,092 chars |
| `CHAR-0004` | 120,280 chars |
| `CHAR-0005` | 72,759 chars |

That size is important because context packets do not automatically carry full hybrid character bodies for story tasks.

## Current Behavior

### Bootstrap

`branching-story-bootstrap` requires `selected_cast` as `CHAR-<integer>` ids from the world's `characters/INDEX.md`.

The skill says bootstrap must:

- Load `worlds/<world_slug>/characters/INDEX.md`.
- Verify every selected cast id resolves to an existing dossier.
- Load a world canon context packet with `task_type='story_bootstrap'`.
- Include selected cast `CHAR-<integer>` ids in `seed_nodes`.
- Create `STENT` records with `bound_char_id`.
- Write `STORY_KERNEL.md.cast_bind_list`.

This means bootstrap is intended to use character dossiers as input authority. However, the actual context-packet delivery path does not guarantee full dossier bodies.

### Turn-Cycle

`branching-story-turn-cycle` does not re-open `characters/INDEX.md`.

Instead, its pre-flight derives world-scope seeds from schema-backed story-local anchors, including:

- active `STENT.bound_char_id` values when non-null;
- active `STLOC.bound_ent` values;
- unresolved mystery ids;
- parent CF ids named by active mirrored `SF.derived_from[]`;
- other already-known world-scope anchors.

It then calls `get_context_packet(... task_type='story_turn_cycle', story_slug=<story_slug>, seed_nodes=<resolved world-scope ids only>, ...)`.

So turn-cycle can re-seed the context packet with active bound character ids, but the practical amount of dossier content delivered depends on the MCP context-packet rules.

### Story-Local Entity Mirror

The story record schema defines `STENT` as a story-local mirror of a world-level `CHAR` dossier, or a wholly story-local entity:

```yaml
id: STENT-<integer>
story_id: STORY-<integer>
created_at_page: PG-<integer>
supersedes: STENT-<integer> | null
display_name: string
bound_char_id: CHAR-<integer> | null
role_in_story: [<role>]
```

No richer character payload is stored in `STENT`.

In the live `red-bunny` bundle, each `STENT` carries only:

- `bound_char_id`
- `created_at_page`
- `display_name`
- `id`
- `role_in_story`
- `story_id`
- `supersedes`

For example, `STENT-2` binds Ane Arrieta through `bound_char_id: CHAR-0003`, but it does not embed Ane's dramatic core, pressure behavior, voice-under-pressure, major local pressures, or upgraded dossier sections.

Those details are instead selectively projected into story-local records such as `BEL`, `STINT`, `SREL`, `STEMO`, `SF`, `STSEC`, and `THR` during bootstrap or later turns.

## Retrieval-Layer Finding

The main technical finding is that story task context packets rank character records but do not require full-body delivery for them.

In `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`, the story profiles include `character_record` in file-class priority:

- `story_bootstrap`: `character_record: 1.15`
- `story_turn_cycle`: `character_record: 0.95`
- `commitment_block_authoring`: `character_record: 1.0`

This helps ranking, but it is not the same as full dossier delivery.

In `tools/world-mcp/src/context-packet/full-body-delivery.ts`, `story_bootstrap` only forces full bodies for:

- `invariant`
- `mystery_reserve_entry`

And `story_turn_cycle` forces full bodies for:

- `canon_fact_record`
- `invariant`
- `mystery_reserve_entry`

`character_record` is absent from the story-task full-body rules.

In `tools/world-mcp/src/context-packet/shared.ts`, ordinary context-packet nodes receive a `body_preview` with a default maximum of 280 characters. For upgraded dossiers in the 70k-120k char range, this is not enough to preserve the new dossier substance.

`get_record` and `get_records` can retrieve hybrid character records with parsed frontmatter and body sections, including section-path projections and oversize handling. But the story skills do not currently require a targeted follow-up retrieval for bound `CHAR-*` dossiers before authoring character motivation, voice, choices, or page-plan details.

## Live Bundle Observation

The current `worlds/erotica-world/stories/red-bunny/STORY_KERNEL.md` binds:

- `STENT-1` to `CHAR-0005` Jon Ureña
- `STENT-2` to `CHAR-0003` Ane Arrieta
- `STENT-3` to `CHAR-0004` Marisa Arrieta

The root story state clearly uses selected dossier-derived facts and pressures. For example, the `SE-1.world_logic_rationale` references Jon, Ane, Marisa, Ane's adult sex work, the mother's abuse, the Irún station-area danger, and Jon's fused protectiveness/desire.

However, this is a bootstrap projection into story-local state. Once projected, the active story machinery primarily advances from `PG.state_snapshot.active_records` and the story-local records. Later changes or upgrades to the source `CHAR-*` dossier do not automatically update that projection.

## Risk Assessment

### Risk 1: Thin Character Authority at Runtime

Turn-cycle may include active `STENT.bound_char_id` values as context-packet seeds, but it likely sees only summaries/previews unless the operator manually follows up with `get_record`.

For upgraded dossiers, this means runtime authoring may miss:

- pressure behavior;
- voice under pressure;
- irreconcilable contradiction;
- moral-psychological edge;
- signature scene behaviors;
- relational charge;
- major local pressures;
- canon-consistency notes;
- continuity constraints introduced after bootstrap.

### Risk 2: Bootstrap Projection Becomes Stale

If a character dossier is improved after a story has been bootstrapped, the story-local records remain unchanged unless someone explicitly repairs or supersedes them.

This is not automatically wrong: story bundles are branch-local state, and append-only story records should not mutate behind the branch's back. But the workflow needs an explicit doctrine for when a dossier upgrade should or should not trigger a story-bundle compatibility review.

### Risk 3: No Dedicated Dossier-Drift Audit

`branching-story-health-audit` checks many story-health surfaces, including replay, branch isolation, belief/visibility health, mystery/canon safety, continuation capacity, clocks/secrets/questions, STPLAN/STEMO health, and active-state underuse.

I did not find a dedicated audit check for:

- active `STENT.bound_char_id` resolves to current dossier;
- story-local projection is materially complete relative to current dossier;
- story-local beliefs/intentions/emotions contradict current dossier authority;
- upgraded dossier sections should trigger a compatibility warning;
- page plans or prose are using stale pre-upgrade character understanding.

### Risk 4: False Confidence from `bound_char_id`

The presence of `bound_char_id: CHAR-0003` can make the story look strongly linked to the dossier, but the runtime record itself contains only a pointer. If the follow-up retrieval is shallow, the pointer may not carry enough operational authority into the turn.

## Possible Solutions

### Option A: Skill-Only Targeted Retrieval Requirement

Patch the story skills to require explicit targeted retrieval of every selected or active bound character.

For bootstrap:

- After selected cast resolution, call `get_record` / `get_records` for each selected `CHAR-*`.
- If the full record is oversized, retrieve explicit sections or frontmatter paths.
- Do not author `STENT`, `BEL`, `STINT`, `SREL`, `STEMO`, `STSEC`, CHC, page plan, or `SE.world_logic_rationale` until the required character slices are loaded.

For turn-cycle:

- After loading active `STENT` records, collect active non-null `bound_char_id`.
- Retrieve a bounded current-dossier slice for every active actor, direct target, witness, information source, pressure source, and player-controlled entity relevant to the turn.
- Treat `story_bundle_context` and context-packet previews as index surfaces, not character authority.

Potential required sections / fields:

- `frontmatter.dramatic_core`
- `frontmatter.major_local_pressures`
- `frontmatter.world_consistency`
- `frontmatter.kinship_situation`
- `frontmatter.profession`
- `frontmatter.current_location`
- body sections for goals, fears, voice, institutional embedding, relationships, and validation notes if present

Pros:

- Low tool-code risk.
- Aligns with existing "targeted retrieval discipline" prose pattern.
- Makes behavior explicit to operators.

Cons:

- Depends on skill compliance.
- May be inconsistently applied by different story-related skills.

### Option B: Add Character Full-Body or Projection Delivery for Story Tasks

Extend `tools/world-mcp` context-packet delivery so story tasks can deliver character material more reliably.

Possible implementations:

- Add `character_record` to full-body rules for `story_bootstrap`, perhaps only for local authority seed nodes.
- Add a story-task-specific character projection function, analogous to the existing character-generation projection path.
- Add a `bound_character_context` section to `story_bundle_context`, derived from `STENT.bound_char_id`.

Pros:

- Centralizes behavior in MCP.
- Reduces operator burden.
- Gives all story skills the same character surface.

Cons:

- Full dossiers are huge, so raw full-body delivery could blow budgets.
- Needs careful projection design to avoid arbitrary truncation.

### Option C: Introduce a Character Projection Record or Snapshot

At bootstrap, create a story-local character projection record per bound `CHAR-*`, separate from `STENT`.

This record would capture the story-relevant slice of the dossier at the time of story genesis:

- source `CHAR-*`;
- source content hash;
- projection date;
- dramatic core summary;
- active appetite / contradiction;
- pressure behavior;
- voice constraints;
- story-relevant continuity constraints;
- omissions explicitly accepted.

Turn-cycle would use the projection as stable branch-local authority. If the source dossier changes, a health audit could compare hashes and decide whether the branch should stay grandfathered or receive a repair turn.

Pros:

- Honest about branch-local snapshotting.
- Preserves append-only story semantics.
- Makes drift detectable.

Cons:

- Adds a new story record class or schema extension.
- Requires validator and index support.
- Needs a policy for updating projections without silently retconning story state.

### Option D: Add a Dossier-Drift Mode to Branching Story Health Audit

Extend `branching-story-health-audit` with a check over active `STENT.bound_char_id` values:

- Verify the bound `CHAR-*` exists.
- Compare stored source hash or projection hash, if present.
- If no hash/projection exists, emit an info or warning finding that the bundle lacks a durable dossier snapshot.
- Compare selected story-local fields against current dossier fields where mechanically possible.
- Emit `character_projection_stale`, `character_projection_missing`, or `character_projection_contradiction` findings.

Pros:

- Good diagnosis tool even if no immediate schema changes are made.
- Useful for existing bundles such as `red-bunny`.

Cons:

- Without a stored source hash or projection, audit must be judgment-assisted.
- It can identify drift but not automatically repair it.

### Option E: Add a Dedicated Character Sync / Compatibility Workflow

Create a workflow for "bound character compatibility review" that:

- takes `world_slug`, `story_slug`, and one or more `CHAR-*` ids;
- retrieves current dossier sections;
- compares to story-local state;
- recommends no-op, grandfathering, repair turn, or story-local supersession;
- optionally drafts repair-turn inputs or remediation cards.

Pros:

- Keeps bootstrap/turn-cycle lean.
- Gives the user an explicit review path after dossier upgrades.

Cons:

- Another workflow to remember.
- Does not prevent shallow retrieval during normal runtime turns unless paired with Option A or B.

## Recommended Brainstorming Direction

The cleanest direction may be a two-layer fix:

1. Short-term: patch story skills with explicit targeted `CHAR-*` retrieval requirements.
2. Medium-term: add a stable story-local character projection/snapshot with source hash, plus a health-audit check for drift.

That preserves the branch-local nature of stories while making dossier authority real instead of implied by a pointer.

## Open Questions

- Should story bundles snapshot character authority at bootstrap, or should they always prefer the latest `CHAR-*` dossier during turn-cycle?
- If a dossier changes after a story starts, is the old story branch grandfathered, repaired, or considered stale?
- Which dossier sections are operationally required for runtime authoring?
- Should `STENT` remain minimal, or should there be a separate `STCHAR` / `character_projection` record?
- Should context packets include a `bound_character_context` projection automatically for story tasks?
- How strict should health-audit drift findings be: info, warning, or error?
- Should rendered prose validation check against character dossier/projection voice constraints, or only against page plans and story-local state?

## Bottom Line

The story system does bind story entities to `CHAR-*` dossiers, and turn-cycle has a route to include those ids as world-scope seeds. But current context-packet delivery does not guarantee meaningful access to the upgraded dossier content, and current story-local `STENT` records do not store that content.

The current system is therefore vulnerable to shallow character authority at runtime and stale bootstrap projections after dossier upgrades. This is fixable, but it likely needs explicit workflow and/or MCP support rather than relying on `bound_char_id` alone.
