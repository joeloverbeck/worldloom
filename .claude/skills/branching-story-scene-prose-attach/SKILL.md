---
name: branching-story-scene-prose-attach
description: "Use when validating and attaching user-supplied rendered scene prose to an already-planned SCN range in a branching-story bundle. Produces: scene-prose-receipts/SCN-<integer>.yaml receipt + bundle INDEX.md update. Mutates: only direct-write publication artifacts under worlds/<world_slug>/stories/<story_slug>/; never mutates PG, SCN, SE, or other _source story state."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: scene_id
    description: "SCN-<integer> whose scene plan + rendered prose pair is being validated"
    required: true
  - name: strict
    description: "true | false; default false. When true, a FAIL verdict blocks the bundle INDEX publication marker; the receipt is still written."
    required: false
  - name: run_craft_notes
    description: "true | false; default false. When true, records advisory craft notes in receipt notes only; craft notes never affect story state."
    required: false
---

# Branching Story Scene Prose Attach

Validate user-supplied rendered prose for a planned `SCN` range, emit a structured scene-prose receipt, and update bundle navigation. This skill is downstream of state: `PG` records remain the causal authority and `SCN` remains the render-unit membership record. Scene attach never mutates `PG`, `SCN`, `SE`, or any other `_source` story record.

<HARD-GATE>
Do NOT write `scene-prose-receipts/<scene_id>.yaml`, update `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, create or edit `scene-prose/`, OR submit any patch plan to `mcp__worldloom__submit_patch_plan` until:

(a) Pre-flight Check has completed: `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `.claude/skills/_shared-templates/story-record-schemas.md` loaded; bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; `STORY_KERNEL.md` loaded; `scene_id` resolved through `mcp__worldloom__get_record(world_slug, story_slug, scene_id)`; every `PG` named by `SCN.pg_ids` loaded through typed retrieval; every end-surface `CHC` named by `SCN.emitted_choice_ids` loaded; `scene-prose-plans/<scene_id>.md` and `scene-prose/<scene_id>.md` verified present; and `scene-prose-receipts/` verified or planned for idempotent creation after approval.

(b) Phases 1-5 have completed in working memory: the `SCN` record, all included `PG` records, end-page choices, scene plan, and rendered scene prose loaded; advisory `included_pages[].state_hash_at_attach` values copied from the current committed `PG.state_hash` values; all eight scene prose receipt checks evaluated across the full `SCN.pg_ids` range; `verdict` and `repair_recommendation` derived; strict-mode publication-blocking decision derived; and the no-state-mutation audit confirmed this skill will write only the scene receipt and bundle `INDEX.md`.

(c) The user has explicitly approved the deliverable summary: target bundle, `scene_id`, ordered `pg_ids`, receipt path, per-check verdict table, roll-up `verdict`, `repair_recommendation`, strict-mode publication decision, INDEX update summary, and the explicit statement that no `PG`, `SCN`, `SE`, or other `_source` state record will be written.

This gate is authoritative under Auto Mode or any other autonomous-execution context. Invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contracts; resolve bundle;
  retrieve SCN, included PGs, and end-page CHCs; verify plan/prose pair)
        |
        v
Phase 1: Pair SCN, scene plan, and rendered prose
        |
        v
Phase 2: Range authority and freshness audit
        |
        v
Phase 3: Scene prose receipt checks
        |
        v
Phase 4: Compute verdict + repair_recommendation
        |
        v
Phase 5: Present deliverable summary
        |
        v
Phase 6: HARD-GATE fires -> write receipt + update INDEX
        |
        v
Phase 7: Post-write validation and no-state-mutation audit
```

## Inputs

### Required

- `world_slug` — existing world directory slug under `worlds/`
- `story_slug` — existing story bundle slug under `worlds/<world_slug>/stories/`
- `scene_id` — `SCN-<integer>` planned scene record to attach

### Optional

- `strict` — `true | false`, default `false`; blocks the human-facing INDEX publication marker on `FAIL`
- `run_craft_notes` — `true | false`, default `false`; records advisory prose notes in `notes[]` only

## Outputs

| Surface | Path | Write route |
|---|---|---|
| Scene prose receipt | `scene-prose-receipts/SCN-<integer>.yaml` | Direct write after approval |
| Bundle index | `INDEX.md` | Direct update after approval |

This skill does not submit a patch plan by default and has no `emit_attach_event` option. If a future workflow needs an audit event, that is a separate ticket because it would add an atomic story-state mutation.

## Required Reads

Before Phase 1, load:

- `docs/FOUNDATIONS.md` for Story Bundles §4a, §6b, §9, Rule 1, Rule 7, and Tooling Recommendation.
- `.claude/skills/_shared-templates/story-state-contract.md` for the scene render layer, page-plan/prose boundary, and downstream non-authoritative attach model.
- `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.20 for `SCN` and §4.7 for the scene prose receipt schema.
- `STORY_KERNEL.md` for the target story bundle, including `## Player Agency Contract` when present.
- Focused references in this skill:
  - `references/receipt-checks.md`
  - `references/write-and-validation.md`

Do not bulk-read story `_source/` directories. Use `mcp__worldloom__get_record`, `get_records`, `list_records`, or `get_context_packet(story_slug=...)` to retrieve `SCN`, the bounded `PG` range, end-surface `CHC` records, and any named active story records needed for check rationales.

## Pre-flight Check

1. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort if missing.
2. Load required contracts above. Abort if any required contract is unreadable.
3. Retrieve `scene_id` through MCP record retrieval. Abort if missing or if its `status` is not `planned`, `rendered`, or `attached`.
4. Confirm `SCN.prose_plan_path`, `SCN.prose_path`, and `SCN.receipt_path` are shaped as `scene-prose-plans/<scene_id>.md`, `scene-prose/<scene_id>.md`, and `scene-prose-receipts/<scene_id>.yaml`.
5. Verify `scene-prose-plans/<scene_id>.md` and `scene-prose/<scene_id>.md` both exist. Abort with `missing-artifact` if either is absent.
6. Retrieve every `PG` named in `SCN.pg_ids` through `mcp__worldloom__get_records` or equivalent bounded typed retrieval. Abort if any page is missing.
7. Retrieve every `CHC` named by `SCN.emitted_choice_ids`; these are the only playable choices at the scene end.
8. Confirm `SCN.choice_surface_page_id` equals `SCN.end_page_id`, and that the end `PG.emitted_choices` exactly match `SCN.emitted_choice_ids`.
9. Plan to create `scene-prose-receipts/` after approval if absent. Do not create it before the HARD-GATE.

Packet recovery: if retrieval returns `delivery_status: persisted_with_summary`, retrieve required slices before continuing. If required full bodies cannot fit, use bounded per-class `list_records(..., include_full_body=true)` plus targeted `get_records` for named seeds rather than reading `_source/` directories in bulk.

## Phase 1: Pair SCN, Plan, And Prose

Load into working memory:

- The `SCN` record, including `pg_ids`, `start_page_id`, `end_page_id`, `choice_surface_page_id`, `emitted_choice_ids`, `story_id`, and `branch_id`.
- Each included `PG` record in `SCN.pg_ids`, in order.
- The end-page `CHC` records that define the playable choice surface.
- The scene plan body from `scene-prose-plans/<scene_id>.md`.
- The rendered scene prose body from `scene-prose/<scene_id>.md`.
- Any forbidden mystery ids or forbidden-resolution language included in the scene plan.
- Any STCHAR, STSTAT, STLOC, STOBJ, STSEC, STQ, STPLAN, STEMO, or DA records named by the included PG snapshots when needed to produce a check rationale.

The scene plan and prose are publication artifacts. Do not derive state from them, and do not write back into `PG` or `SCN` to "fix" drift.

## Phase 2: Range Authority And Freshness Audit

Use the committed `SCN` and `PG` records as authority:

1. Confirm `SCN.pg_ids` is the range being checked. Do not infer a different range from prose headings or plan text.
2. Copy each included `PG.state_hash` into the receipt as `included_pages[].state_hash_at_attach`. This is advisory freshness evidence only.
3. Confirm the end-page choice surface still matches the SCN fields. A mismatch is `final_scene_choice_surface_visibility: FAIL` and usually `repair_recommendation: run_turn_cycle_repair` or a scene-plan refresh.
4. Treat any later drift between receipt `state_hash_at_attach` and current PG state as receipt staleness, never as story-state invalidation.

## Phase 3: Scene Prose Receipt Checks

Use `references/receipt-checks.md`.

Emit the eight required checks:

1. `included_pg_events_rendered`
2. `final_scene_choice_surface_visibility`
3. `scene_range_entity_status_consistency`
4. `scene_range_invented_structural_fact`
5. `scene_range_forbidden_mystery_resolution`
6. `scene_prose_stchar_fidelity`
7. `engine_jargon_leak`
8. `canon_claim_without_authority`

Each `PASS` must include a one-line rationale in the deliverable summary that cites an authority: included `PG`, `SCN`, end `CHC`, scene-plan section, retrieved story record, validator result, or loaded FOUNDATIONS rule. A bare `PASS` is a failure of this skill.

The checks are range-wide. Do not validate only `SCN.end_page_id`.

## Phase 4: Compute Verdict And Repair Recommendation

Roll up:

- Any `FAIL` check -> `verdict: FAIL`
- Else any `WARN` check -> `verdict: WARN`
- Else -> `verdict: PASS`

Choose `repair_recommendation`:

- `none` when all checks pass or only advisory craft notes exist.
- `revise_scene_prose` when the prose can be corrected without changing committed state or the SCN range.
- `revise_scene_plan` when the plan omitted or mistranslated load-bearing committed PG material.
- `run_turn_cycle_repair` when committed PG/choice/state records are internally inconsistent or the scene range needs state-authoring repair.
- `run_story_fact_promotion_to_canon` when the prose contains a world-canon claim that may be worth canon promotion.

Strict mode does not change the receipt write. It changes whether `INDEX.md` may mark the scene prose as publishable when the verdict is `FAIL`.

## Phase 5: Present Deliverable Summary

Before approval, present:

- bundle path
- `scene_id`, `pg_ids`, `branch_id`, `start_page_id`, `end_page_id`
- receipt path
- per-check verdict table with one-line rationales
- roll-up `verdict`
- `repair_recommendation`
- strict-mode INDEX decision
- direct-write file list
- no-state-mutation statement: no `PG`, `SCN`, `SE`, or other `_source` story record will be written

Wait for explicit user approval. Do not treat skill invocation as approval.

## Phase 6: Write Receipt And Update INDEX

Use `references/write-and-validation.md`.

After approval only:

1. Create `scene-prose-receipts/` if absent.
2. Write `scene-prose-receipts/<scene_id>.yaml` with the schema in shared story-record schemas §4.7.
3. Update `INDEX.md` with the scene prose status, receipt path, verdict, and strict-mode publication marker.
4. Do not submit a patch plan.
5. Do not create, supersede, or edit `PG`, `SCN`, `SE`, or any other `_source` story record.

## Phase 7: Post-write Validation And No-state Audit

Run or request the strongest available validation:

```bash
node tools/validators/dist/src/cli/world-validate.js <world_slug> --structural --file worlds/<world_slug>/stories/<story_slug>/scene-prose-receipts/<scene_id>.yaml --json
```

If the compiled validator CLI is stale or unavailable, build `tools/validators` first or run the equivalent package-local structural validation over the receipt and scene prose.

Then audit the write surface:

- Confirm `scene-prose-receipts/<scene_id>.yaml` exists.
- Confirm `INDEX.md` carries the intended status.
- Confirm no `_source/pages/`, `_source/scenes/`, `_source/events/`, or other story `_source/` path changed.
- Record ignored or generated artifacts separately.

## Guardrails

- `docs/FOUNDATIONS.md` wins over stale scene prose, scene plan prose, or convenience.
- Never read story `_source/` directories in bulk; use typed retrieval.
- Never mutate `PG`, `SCN`, `SE`, or any other `_source` story record.
- Never emit an `SE` by default.
- Never use a receipt to bless a forbidden Mystery Reserve resolution.
- Never record a bare `PASS`; each PASS needs a one-line authority-cited rationale.
- Receipt freshness is advisory. It is not a state hash and never invalidates story state.
