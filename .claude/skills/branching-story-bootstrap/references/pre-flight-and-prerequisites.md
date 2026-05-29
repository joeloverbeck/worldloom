# Pre-flight and World-State Prerequisites

Covers original §World-State Prerequisites and §Pre-flight Check.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles governs this skill's record discipline; §Tooling Recommendation mandates the retrieval surface
- `.claude/skills/_shared-templates/story-state-contract.md` — predicate DSL (§5), structured SE fields (§5a), action routing (§6), eight hard gates (§7), and shared write order (§10)
- `.claude/skills/_shared-templates/story-record-schemas.md` — §4 record schemas, including §4.5.17 `STPLAN`, §4.5.18 `STEMO`, and §4.5.19 `STCHAR`
- `tools/validators/src/schemas/story-character-authority.schema.json` — canonical STCHAR frontmatter fields and hash requirements
- `docs/CONTEXT-PACKET-CONTRACT.md` and `docs/MACHINE-FACING-LAYER.md` — machine-facing retrieval / edge surfaces for story-bundle context, including SPEC-47 STPLAN/STEMO summaries and graph edges when the bundle later becomes indexed
- `worlds/<world_slug>/WORLD_KERNEL.md` and `worlds/<world_slug>/ONTOLOGY.md` — world identity, invariants, ontology categories the bundle's records must respect
- `worlds/<world_slug>/characters/INDEX.md` — every entry in `selected_cast[]` must resolve to an existing `CHAR-<integer>` dossier; bootstrap reads these only to distill STCHAR before story runtime state exists
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', story_slug=<story_slug>, seed_nodes=<world-scope seed ids>, token_budget=<default>)` — relevant CF / INV / M / OQ / ENT / SEC records bearing on the cast and opening situation. `seed_nodes` may include selected cast `CHAR-<integer>` ids and any location-related world-scope anchors already identified by `initial_location` grounding, such as existing `ENT`, `SEC`, `CF`, `M`, or `OQ` ids. Do not pass a proposed `STLOC` label or free-text location label as a seed; omit the location seed when no world-scope anchor exists. If a supplied world-scope seed is unresolved, the context packet skips it and reports the unresolved seed in `task_header.warnings` rather than treating it as local authority. The `story_slug` is the target bundle slug; `story_bundle_context` is `null` because the bundle does not exist yet.
- `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` — canonical CLI for deterministic PG state-hash computation per shared contract §4.2a "Tooling" subsection; consumed at the validation step. See `references/phase-10-validation.md` step 1 for the shared-helper contract and the no-hand-rolling rule.

Targeted retrieval discipline: bootstrap's target bundle has no `story_bundle_context` yet, but the Index + Follow-Up contract still applies to any story-bundle summary or indexed story-local record surfaced while adapting existing material, sibling bundles, or operator-supplied context. If such a summary identifies a material `STPLAN` / `STEMO` / `STSEC` / `STQ` / `CLK` record, retrieve the full body with `mcp__worldloom__get_record`, `mcp__worldloom__get_records`, or a filtered `mcp__worldloom__list_records(..., include_full_body=true)` before authoring CHC grounding, SLT predicate/effect use, scene-plan handoff notes, or health-audit-style findings that depend on basis, blockers, appraisal, orientation, clue, payoff, or clock payload detail.

Bundle-target collision discipline (per-nested-scope bootstrap variant): `worlds/<world_slug>/stories/<story_slug>/` MUST NOT exist; the parent world directory MUST exist. Absence of the bundle target IS the prerequisite — collision aborts at Pre-flight.

## Pre-flight Check

Before the state-seed step:

1. Load `docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `.claude/skills/_shared-templates/story-record-schemas.md` into working context. Abort with clear missing-file error on any unreadable path.
2. Resolve `worlds/<world_slug>/`. Abort if the directory does not exist, or if `WORLD_KERNEL.md` / `ONTOLOGY.md` are absent.
3. Verify `worlds/<world_slug>/stories/<story_slug>/` does NOT exist. Abort with a slug-collision error if it does.
4. Load `worlds/<world_slug>/characters/INDEX.md`. For every entry in `selected_cast[]`, verify it resolves to an existing `CHAR` dossier in the world. Abort with a cast-resolution error on any miss.
5. Build one ordered allocation list for every id the bootstrap will draft, then call `mcp__worldloom__allocate_many_ids(world_slug, allocations=[...])` when the running MCP server exposes it. Include one `{id_class: "STCHAR", story_slug: <story_slug>}` entry for every selected non-background cast member; these ids are reserved for the inline bootstrap distillation pass and later become each non-background `STENT.bound_stchar_id`. Do not allocate or emit an operational `char_id` binding. If the running server has not been restarted with `allocate_many_ids`, fall back to equivalent ordered `mcp__worldloom__allocate_next_id` calls and preserve the same request order.
6. The allocation list must also include every remaining class to be created: `STORY` (per-world; omit `story_slug`), `BR` (will be `BR-1`), `SE` (will be `SE-1`), `PG` (will be `PG-1`), and class-specific ids for every STENT / STSTAT / STINT / SF / **BEL** / OBL / CNSQ / THR / SREL / STLOC / STOBJ / (optional CLK / STSEC / STQ / STPLAN / STEMO / DA) / CHC / (optional SLT) record to be drafted in the in-memory drafting phases. For optional new-class roots, include `{id_class: "CLK"|"STSEC"|"STQ"|"STPLAN"|"STEMO", story_slug: <story_slug>}` entries when those records are premise-warranted. The allocator returns `<CLASS>-1` for fresh story-bundle scopes when the named bundle directory does not yet exist under an existing world; no skill-side hard-coding of pre-bundle ids is required. `STORY` is the per-world bundle identifier: it is allocated here and carried as every record's `story_id` and in `STORY_KERNEL.md` frontmatter, but it has no `create_*_record` op and is not named in the submission's `expected_id_allocations` (there is no `story_ids` field). If a batch error includes `details.successful_allocations`, reconcile those ids before retrying rather than reusing or overwriting an already-reserved id.
7. Load world canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', story_slug=<story_slug>, seed_nodes=<world-scope seed ids>, token_budget=<default>)`. Include selected cast `CHAR-<integer>` ids, plus location-related world-scope anchors only when `initial_location` grounding already identifies existing `ENT`, `SEC`, `CF`, `M`, or `OQ` ids; do not pass a proposed `STLOC` label or free-text location label as a seed. Omit the location seed when no world-scope anchor exists, and treat any unresolved-seed `task_header.warnings` as a signal to reroute or continue without that location anchor rather than using the missing label as local authority. Confirm `story_bundle_context: null`; bootstrap uses the slug as the target bundle identifier before indexed story-bundle records exist.

Packet recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. Two failure
modes are covered there — if `get_context_packet` (or `get_records` /
`describe_envelope_schema`) returns `delivery_status: persisted_with_summary`,
retrieve required slices via `mcp__worldloom__get_persisted_packet_slice`
before continuing; if `get_context_packet` errors with
`code: packet_incomplete_required_classes` (required full bodies exceed the
harness ceiling), follow the shared template's §When Required Classes Cannot
Fit fallback (per-class `list_records(..., include_full_body=true)` plus
targeted `get_records` for named seeds).

If any precondition fails, the skill aborts before the state-seed step.
