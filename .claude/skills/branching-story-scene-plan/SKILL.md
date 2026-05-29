---
name: branching-story-scene-plan
description: "Use when selecting or refreshing a scene render unit over a contiguous committed PG range in a branching-story bundle. Produces: one SCN record through the patch engine, scene-prose-plans/SCN-<integer>.md, scene-prose/ and scene-prose-receipts/ directories, and a bundle INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: start_page_id
    description: "PG-<integer> at the first committed page in the scene range"
    required: true
  - name: end_page_id
    description: "PG-<integer> at the final committed page in the scene range"
    required: true
  - name: existing_scene_id
    description: "Optional SCN-<integer> to supersede when refreshing an existing scene range"
    required: false
  - name: manual_boundary_rationale
    description: "Optional author-provided boundary rationale; must describe committed continuity facts, not future narrative shape"
    required: false
---

# Branching Story Scene Plan

Select or refresh a reader-facing scene over a committed `PG` range, create the non-authoritative `SCN` membership record, and author a renderer-clean scene prose plan. `PG` records remain the causal authority. `SCN` records decide which committed causal ticks are rendered together; they never create state, alter choices, or carry act/arc obligations.

<HARD-GATE>
Do NOT write `scene-prose-plans/SCN-<integer>.md`, create or update `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, create scene directories, OR submit any patch plan to `mcp__worldloom__submit_patch_plan` until:

(a) Pre-flight Check has completed: `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `.claude/skills/_shared-templates/story-record-schemas.md` loaded; bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; `STORY_KERNEL.md` loaded; `start_page_id` and `end_page_id` resolved through `mcp__worldloom__get_record` / `get_records`; the complete candidate `PG` range loaded through typed retrieval; `SCN` id allocated via `mcp__worldloom__allocate_next_id(world_slug, 'SCN', story_slug=<story_slug>)` unless superseding an existing `SCN`; and the current end page's emitted choices loaded.

(b) Phases 1-6 have completed in working memory: the proposed `pg_ids` are an ordered contiguous slice of one `PG.branch_path`; every included `PG` belongs to the same `branch_id`; no sibling alternative is included; the end page is the `choice_surface_page_id`; `emitted_choice_ids` exactly match the end page's emitted choices; the `SCN` record contains only membership, artifact paths, factual `scene_descriptor`, and factual `boundary_rationale`; the scene plan is derived from committed `PG` records and relevant story-state records, never from sibling prose plans; the scene plan body is renderer-facing and free of record IDs, hashes, schema, validator, patch-engine, lifecycle, and state-delta vocabulary outside verbatim contract blocks.

(c) The SPEC-92 §5c judgment affirmation has been made explicitly: the operator confirms `scene_descriptor` and `boundary_rationale` describe what the committed range depicts and why the boundary is factual for POV/time/location/cast/exchange continuity. They must not state future dramatic obligation, act position, arc shape, midpoint, climax, rising action, or target narrative shape. The deterministic `scn_no_narrative_shape_language` validator is a backstop, not a replacement for this judgment.

(d) Validation has completed with zero FAIL verdicts for the SCN patch plan and candidate scene plan: `record_schema_compliance`, `scene_range_integrity`, `scene_plan_structural`, `scene_plan_verbatim_section_integrity`, `scene_plan_body_engine_vocabulary_cleanliness`, and `scn_no_narrative_shape_language`. If the available MCP/CLI validate path cannot pass a candidate scene-plan draft as an in-memory file, run the validator package directly with the candidate draft bytes as an explicit file input, or write to a temporary copied world root; do not write the live bundle path before approval just to make validators see it.

(e) The user has explicitly approved the deliverable summary: target bundle, `SCN` id, supersession target if any, `pg_ids`, branch id, previous scene id, scene descriptor, boundary rationale, end-page choice surface, scene-plan section preview, validation result table, and exact files to be written.

This gate is authoritative under Auto Mode or any other autonomous-execution context. Invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contracts; resolve bundle;
  retrieve committed PG range; allocate SCN id; load end-page choices)
        |
        v
Phase 1: Select and validate range (contiguous, one branch, no siblings)
        |
        v
Phase 2: Draft SCN membership record (paths, factual descriptor)
        |
        v
Phase 3: Derive renderer-facing scene plan from committed PGs
        |
        v
Phase 4: Inline canonical prose contract blocks
        |
        v
Phase 5: Validate SCN + candidate plan
        |
        v
Phase 6: Present deliverable summary and §5c affirmation
        |
        v
Phase 7: HARD-GATE fires -> submit SCN patch, write plan, update INDEX
```

## Outputs

| Surface | Path | Write route |
|---|---|---|
| `SCN-<integer>` | `_source/scenes/SCN-<integer>.yaml` | Patch engine: `create_scn_record` or `supersede_scn_record` |
| Scene plan | `scene-prose-plans/SCN-<integer>.md` | Direct write after approval and SCN patch success |
| Scene prose directory | `scene-prose/` | Direct mkdir after approval |
| Scene receipt directory | `scene-prose-receipts/` | Direct mkdir after approval |
| Bundle index | `INDEX.md` | Direct update after approval and plan write |

Scene prose itself is not written by this skill. It is supplied externally and validated later by `branching-story-scene-prose-attach`.

## Required Reads

Before Phase 1, load:

- `docs/FOUNDATIONS.md` for Story Bundles §4a, §5a, §5b, §5c, §6b, §9, Rule 1, Rule 7, and Tooling Recommendation.
- `.claude/skills/_shared-templates/story-state-contract.md` for the authority model, `SCN` inventory entry, and page-plan / prose boundary.
- `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.20 for the `SCN` schema and §4.7 for the downstream receipt.
- `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md`.
- `STORY_KERNEL.md` for the target story bundle.
- Focused references in this skill:
  - `references/boundary-and-range.md`
  - `references/scene-plan-structure.md`
  - `references/validation-and-write-order.md`

Do not bulk-read story `_source/` directories. Use `mcp__worldloom__get_record`, `get_records`, `list_records`, or `get_context_packet(story_slug=...)` to retrieve the bounded PG range and named active records.

## Pre-flight Check

1. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort if missing.
2. Load the required contracts above. Abort if any required contract is unreadable.
3. Retrieve `start_page_id` and `end_page_id` through MCP record retrieval. Abort if either is missing.
4. Derive `pg_ids` as the inclusive slice of `end_page_id.branch_path` beginning at `start_page_id`. Abort if the start page is not on the end page branch path.
5. Retrieve every `PG` in `pg_ids` through `mcp__worldloom__get_records` or equivalent bounded typed retrieval. Abort if any page is missing.
6. Confirm every retrieved `PG.branch_id` equals the end page branch id and no included page is a sibling alternative.
7. Retrieve the final emitted `CHC` records named by `end_page_id.emitted_choices`; these become the scene's playable choice surface.
8. Resolve `previous_scene_id` by listing existing `SCN` records for the story and choosing the adjacent prior scene whose `end_page_id` is immediately before the new range on the same `branch_id` and branch path, excluding superseded `SCN`s from consideration. Use `null` when none exists. If ambiguous, stop for user input instead of guessing.
9. Allocate a new `SCN` id through `mcp__worldloom__allocate_next_id(world_slug, 'SCN', story_slug=<story_slug>)`. If `existing_scene_id` was supplied, retrieve it and set the new record's `supersedes` to that id.

## Phase 1: Select And Validate Range

Use `references/boundary-and-range.md`.

The default policy is auto-suggest plus explicit operator acceptance. A scene continues while POV, time, location, cast, active exchange, and reader expectation remain coherent. It ends on a material change: time jump, location jump, POV change, major cast shift, purpose reset, full player-choice hinge, terminal surface, or a fork point where sibling alternatives become reader-visible.

Hard constraints:

- `pg_ids` is ordered and contiguous along the end page's `branch_path`.
- All pages have one `branch_id`.
- No sibling alternative appears in the same scene.
- `choice_surface_page_id` is `end_page_id`.
- `emitted_choice_ids` exactly matches the end page's emitted choices.

Multiple historical choice surfaces inside the range are allowed, but only the final page's choices are playable at scene end.

## Phase 2: Draft The SCN Record

Draft a single `SCN` record:

```yaml
id: SCN-<integer>
story_id: STORY-<integer>
branch_id: BR-<integer>
supersedes: SCN-<integer> | null
pg_ids: [PG-<integer>, ...]
start_page_id: PG-<integer>
end_page_id: PG-<integer>
previous_scene_id: SCN-<integer> | null
choice_surface_page_id: PG-<integer>
emitted_choice_ids: [CHC-<integer>, ...]
title: <short title>
slug: <kebab-slug>
scene_descriptor: <factual depiction label>
boundary_rationale: <factual boundary rationale>
prose_plan_path: scene-prose-plans/SCN-<integer>.md
prose_path: scene-prose/SCN-<integer>.md
receipt_path: scene-prose-receipts/SCN-<integer>.yaml
```

Do not add hash fields, render-kind polymorphism, act/arc labels, target narrative shape, or future obligation language.

## Phase 3: Derive The Scene Plan

Use `references/scene-plan-structure.md`.

The scene plan must be a clean novelist packet. Derive it from committed `PG` records and their relevant active story-state records, not from `pages-prose-plans/`, `pages-prose/`, or another scene plan.

Required section order:

1. `# Scene: <Title>`
2. `## 2. Content Policy`
3. `## 3. Prose Craft Contract`
4. `## 4. Render Mission`
5. `## 5. What Changes in This Scene`
6. `## 6. Where the Scene Begins / Must End`
7. `## 7. Beat Chain`
8. `## 8. POV / Observer Firewall`
9. `## 9. Cast & Voice`
10. `## 10. Emotional / Relationship Throughline`
11. `## 11. Physical Continuity`
12. `## 12. Secrets & Forbidden Reveals`
13. `## 13. Choice Surface`
14. `## 19. Render-Time Instruction`

Sections 2, 3, and 19 are inlined verbatim from the canonical prose-renderer files. The rest of the body must not expose record IDs, schema fields, hashes, validator names, patch-engine language, lifecycle terms, or raw state-delta vocabulary.

## Phase 4: Inline Canonical Prose Blocks

Before validation, splice the canonical bodies from:

- `docs/prose-renderer-contract/content-policy.md`
- `docs/prose-renderer-contract/prose-craft-contract.md`
- `docs/prose-renderer-contract/render-time-instruction.md`

Use the same framing-stripping semantics as `scene_plan_verbatim_section_integrity`, which shares the canonical source loader with page plans. The candidate plan bytes that pass validation are the bytes to write after approval.

## Phase 5: Validate

Use `references/validation-and-write-order.md`.

Validate both:

- the patch plan containing `create_scn_record` or `supersede_scn_record`
- the exact candidate scene-plan bytes for `stories/<story_slug>/scene-prose-plans/SCN-<integer>.md`

Required zero-FAIL validators:

- `record_schema_compliance`
- `scene_range_integrity`
- `scene_plan_structural`
- `scene_plan_verbatim_section_integrity`
- `scene_plan_body_engine_vocabulary_cleanliness`
- `scn_no_narrative_shape_language`

If `scene_plan_body_engine_vocabulary_cleanliness` flags useful grounding IDs in the body, rewrite them into human language. The plan is for a prose renderer, not for an operator debugging state.

## Phase 6: Present Deliverable Summary

Before approval, present:

- bundle path
- `SCN` id and `supersedes`, if any
- `pg_ids`, branch id, start/end page ids
- previous scene id
- title, slug, `scene_descriptor`, and `boundary_rationale`
- end-page choice surface
- scene-plan section preview
- validator result table
- §5c affirmation text
- exact patch op and direct-write file list

Then wait for explicit user approval.

## Phase 7: Commit / Write

After approval:

1. Submit the SCN patch plan with an approval token through the normal patch-engine flow.
2. If patch submission fails, write nothing else. Surface the failure.
3. On patch success, create `scene-prose-plans/`, `scene-prose/`, and `scene-prose-receipts/` if absent.
4. Write `scene-prose-plans/SCN-<integer>.md` using the exact validated bytes.
5. Update `INDEX.md` with the scene row, derived publication indicator, and artifact paths. Derive the indicator from `prose_path` / `receipt_path` file presence plus the scene-prose receipt `verdict`; do not read or write publication status on `SCN`.
6. Run post-write validation over the committed SCN record and scene plan.
7. Report the scene id, written paths, receipt target, validation results, and next step: render `scene-prose/SCN-<integer>.md`, then invoke `branching-story-scene-prose-attach`.

Do not `git commit` from inside this skill.

## Guardrails

- Never mutate world canon.
- Never direct-write story-bundle `_source` records. `SCN` writes route through the patch engine.
- Never read story `_source` directories in bulk. Use typed retrieval for the bounded page range and named supporting records.
- Never derive scene plans from prose plans or rendered prose.
- Never include sibling alternatives in one scene.
- Never encode act/arc/future-shape language in `SCN` or the scene plan.
- Never write rendered scene prose in this skill.
- Never treat advisory freshness as state invalidation.
