# SPEC-92 — Scene-Range Prose Rendering Layer

**Status:** COMPLETED
**Date:** 2026-05-28
**Classification:** story-canon-related (introduces a new story-bundle record class `SCN`, two story-pipeline skills, story-bundle directories, a patch-engine op, world-index enumeration + edges, and story-scope validators; amends FOUNDATIONS §Story Bundles and the shared story state contract).
**Depends on:** none for logic; additive to the existing page-plan pipeline. Pairs with **SPEC-93** (which removes page-plan authoring and retires the page-plan-era surfaces *after* this layer can carry prose). Land SPEC-92 first.
**Related:** `specs/IMPLEMENTATION-ORDER.md`, `specs/SPEC-93-decouple-state-turn-from-prose-plan-authoring.md`
**Source:** triage of `reports/scene-prose-planning-first-iteration.md` (2026-05-28), Approach B (engine change now, scene-first Story Explorer deferred). Companion triage decision: this file + SPEC-93 are the decision record (no separate `docs/triage/` file — see IMPLEMENTATION-ORDER.md "Origin").

---

## 1. Context & Motivation

Today the prose render unit is the page (`PG`). Every `PG` — one causal tick / commitment block — gets its own 19-section `pages-prose-plans/PG-<integer>.md` plan and its own rendered prose page. Two problems follow, both confirmed against current `main` (`7df56b24`):

1. **Wrong prose unit.** A `PG` is a causal *beat*, not a reader-facing *scene*. The uploaded sample (red-bunny `PG-5..PG-8`) is **one continuous bench scene** split across four causal ticks; per-`PG` rendering forces every page plan to carry its own "do not reuse the prior page's anchors" anti-repetition block — a workaround for rendering at the wrong granularity.
2. **Cost.** Each page plan re-inlines the Content Policy (§2), Prose Craft Contract (§3, ~2k words), and Render-Time Instruction (§19) **verbatim** (the external renderer is cold-context), plus STCHAR packets and full state context — authored on **every** turn.

This spec introduces a **scene/render-unit layer**: external prose is planned and rendered over a contiguous range of committed `PG`s (one continuous reader scene) instead of per-`PG`. `PG`s remain the authoritative causal ticks; scenes are a derived, non-authoritative literary rendering over `PG` ranges. Rendering once per scene (over N pages) instead of once per page cuts render events ~Nx; the verbatim-inlining cold-context contract is **preserved** (the user renders by cold-paste per scene — see SPEC-93 §Verbatim-sections note), now amortized across the scene.

This spec is **additive**: the page-plan pipeline (`branching-story-bootstrap`/`branching-story-turn-cycle` page-plan authorship, `branching-story-prose-attach`, the page-plan validators, Hook 6/7) remains functional and untouched here. SPEC-93 performs the subtractive half once this layer exists.

**Architectural north star (adopted from the report):** *PGs decide what happened; scenes decide how the reader experiences what happened.*

## 2. Scope

### In scope

- New story-bundle record class **`SCN`** at `worlds/<slug>/stories/<story-slug>/_source/scenes/SCN-<integer>.yaml` (engine-routed; append-only with supersession for range/status changes).
- New patch-engine op `create_scn_record` (+ the standard `supersede_*` path) and a new `SCN` story-bundle ID class in the allocator and FOUNDATIONS §Story Bundles §6.
- New skill **`branching-story-scene-plan`**: select or refresh a contiguous single-branch `PG` range; create/supersede the `SCN` record; derive a renderer-clean novelist-facing scene plan at `scene-prose-plans/SCN-<integer>.md`.
- New skill **`branching-story-scene-prose-attach`**: validate `scene-prose/SCN-<integer>.md` against every included `PG`; write `scene-prose-receipts/SCN-<integer>.yaml`; mutate no `PG`/story state.
- New story-bundle directories: `_source/scenes/`, `scene-prose-plans/`, `scene-prose/`, `scene-prose-receipts/`.
- World-index: enumerate the new directories + `SCN` class; index `SCN→PG` (membership), `SCN→CHC` (scene-ending choices), `SCN→BR`, and `SCN.previous_scene_id` edges.
- Story-scope validators: scene-range contiguity / single-branch / no-sibling; scene-plan structural completeness; scene-plan verbatim-section integrity (§2/§3/§19 cold-paste); scene-plan body engine-vocabulary cleanliness; `scn_no_narrative_shape_language` (the §5c guard); `scene-prose-receipt.schema.json` with the `scene_range_*` content checks.
- Contract amendments: add the `SCN` schema + scene-plan structure to `.claude/skills/_shared-templates/story-record-schemas.md` and `story-state-contract.md` (parallel to the page-plan §8).
- FOUNDATIONS amendments: §Story Bundles §6 (`SCN` ID class), §7 (two skills added to Skill Category 2c), §9 (prose-length discipline applies to scene plans), and a new §Story Bundles sub-section describing the scene render layer as a derived non-authoritative rendering with an explicit §5a/§5c non-narrative-shape guard.

### Out of scope (and where it lives)

- Removing page-plan authoring from bootstrap/turn-cycle; removing `plan.plan_hash`/`prose_plan_path` from `PG`; retiring the page-plan validators, `branching-story-prose-attach`, Hook 6/7 → **SPEC-93**.
- **Scene-first Story Explorer** (scene routes, PGs-as-x-ray, scene branch map). Deferred to a future spec; SPEC-90 stays page-first. Story Explorer is not modified here.
- Migrating existing bundles (e.g. red-bunny) to scenes. Existing `PG`/page-plan/page-prose artifacts remain as legacy; this layer applies going forward and to any bundle the author chooses to scene-plan.
- `RU`/`render_kind` polymorphism. The `SCN` record is scene-only — no `render_kind` field now. If non-scene render units (prologue / interstitial / recap) are ever needed, a future spec adds the field then (report §8: add it later, not speculatively).

## 3. The `SCN` record

`SCN` is a **render-unit membership record**, not a causal-state record and not a narrative-shape record. It records *which committed `PG`s form one continuous reader scene*, the scene's publication status, and its artifact paths. It carries **no** act/arc structure, no target narrative shape, and no future dramatic obligation (FOUNDATIONS §5a/§5c). Causal authority stays entirely on `PG`/`SE`.

Schema (authored canonical list lands in `story-record-schemas.md`; all fields load-bearing per §5b):

```yaml
id: SCN-<integer>
story_id: STORY-<integer>
branch_id: BR-<integer>
supersedes: SCN-<integer> | null
status: planned | rendered | attached   # publication status ONLY; never causal
pg_ids: [PG-<integer>, ...]   # ordered, contiguous along one PG.branch_path
start_page_id: PG-<integer>   # == pg_ids[0]
end_page_id: PG-<integer>     # == pg_ids[-1]
previous_scene_id: SCN-<integer> | null
choice_surface_page_id: PG-<integer>     # normally == end_page_id
emitted_choice_ids: [CHC-<integer>, ...] # the end PG's playable choices
title: <string>
slug: <kebab-string>
scene_descriptor: >           # SHORT descriptive label of what this committed range DEPICTS
                              # (past/present, factual). MUST NOT state future dramatic
                              # obligation, act position, or target narrative shape.
boundary_rationale: >         # why the range was cut here: POV / time / location / cast / exchange continuity
prose_plan_path: scene-prose-plans/SCN-<integer>.md
prose_path: scene-prose/SCN-<integer>.md
receipt_path: scene-prose-receipts/SCN-<integer>.yaml
```

**No hash field couples the scene plan or prose bytes to state.** Advisory PG-freshness — whether the included PGs changed since the scene was planned — lives in the scene-prose receipt as included PG ids + their `state_hash`es at attach time (per report §12), never as a stored field on the `SCN` record; it never blocks editing or invalidates state (per [[feedback-author-rejects-hash-coupling]] and FOUNDATIONS §4a). The scene-plan and scene-prose markdown are freely editable, direct-write surfaces (FOUNDATIONS §Story Bundles §4 write discipline); only the `SCN` record itself (membership/status) is engine-routed.

**Write/edit discipline (report Open Question 15.2, resolved):** range/status changes to a committed `SCN` route through the patch engine as a supersession (because `pg_ids` membership is index- and validator-load-bearing); the scene plan and scene prose are freely edited in place with zero state consequence.

## 4. Scene boundary selection

`branching-story-scene-plan` proposes boundaries automatically and accepts manual override (report Q6 / Open Question 15.4: generated suggestion + explicit acceptance).

**Default boundary policy.** A scene continues while POV, time continuity, location, cast, dramatic purpose, active exchange/conflict, and reader expectation remain coherent. A scene ends on a material change: time jump, location jump, POV change, major cast shift, purpose reset, full player-choice hinge, terminal surface, or a fork point where sibling alternatives become reader-visible. Prefer ending at the latest playable `PG` so the reader sees one clear current choice surface.

**Hard constraints (validator-enforced, §6):**

- `pg_ids` is ordered and contiguous along a single `PG.branch_path`.
- All `pg_ids` lie on one branch path; **no sibling alternatives** in one scene.
- Multiple *historical* (already-resolved) choice surfaces on the branch path are allowed; the scene exposes only the **final** `PG`'s emitted choices as playable (`choice_surface_page_id` / `emitted_choice_ids`). Intermediate choices are historical/x-ray.

## 5. Renderer-facing scene plan structure

`scene-prose-plans/SCN-<integer>.md` is a clean novelist packet. Its body MUST be zero-ID, zero-hash, zero-schema, zero-validator, zero-lifecycle (no record IDs, no "state delta", no "supersedes", no "validator", no patch-engine language). Recommended sections (adapted from report §10):

1. `# Scene: <Title>`
2. **Content Policy** — inlined verbatim from `docs/prose-renderer-contract/content-policy.md` (cold-paste; once per scene).
3. **Prose Craft Contract** — inlined verbatim from `docs/prose-renderer-contract/prose-craft-contract.md`.
4. **Render Mission** — natural-language opening state → stopping point.
5. **What Changes in This Scene** — the emotional/relational/practical turn, prose-facing.
6. **Where the Scene Begins / Must End** — concrete image, cast positions, final dramatic condition + reader-facing choice surface.
7. **Beat Chain** — natural-language beats (the included `PG`s' required moves, translated out of record language).
8. **POV / Observer Firewall** — what the POV may know, infer, misread, or not know (FOUNDATIONS §6b).
9. **Cast & Voice** — scene-local voice constraints (STCHAR-derived, translated; no STCHAR record IDs in the body).
10. **Emotional / Relationship Throughline**, **Physical Continuity**, **Secrets & Forbidden Reveals** (the included `PG`s' `forbidden_resolutions`).
11. **Choice Surface** — what the reader now has available at scene end.
12. **Render-Time Instruction** — inlined verbatim from `docs/prose-renderer-contract/render-time-instruction.md`.

The verbatim §2/§3/§Render-Time blocks preserve the cold-context contract (FOUNDATIONS §9, [[feedback-page-plan-verbatim-sections]]) at scene granularity. The scene plan is derived from the **committed `PG` records** via MCP retrieval (`get_record`/`get_records`/`get_context_packet` with `story_slug`), satisfying FOUNDATIONS §Tooling Recommendation — never from a sibling prose plan.

## 6. Validation & integrity

**Hard checks (block scene plan / receipt):**

- `scene_range_contiguity` — `pg_ids` ordered + contiguous on one `branch_path`.
- `scene_range_single_branch` / `scene_range_no_sibling` — no sibling alternatives.
- `scene_plan_structural` — required sections present; `choice_surface_page_id`/`emitted_choice_ids` resolve to the end `PG`'s emitted choices.
- `scene_plan_verbatim_section_integrity` — §2/§3/§Render-Time byte-equal to their canonical sources (reuses the page-plan verbatim-canonical-sources mechanism, retargeted).
- `scene_plan_body_engine_vocabulary_cleanliness` — renderer body free of engine jargon (reuses `page-plan-body-engine-vocabulary-cleanliness` logic, retargeted).
- `scn_no_narrative_shape_language` — the `SCN` record (`scene_descriptor`, `boundary_rationale`) and scene-plan body contain no act/arc/target-narrative-shape tokens (act, midpoint, climax, rising action, "preserve Act", etc.). This is the deterministic §5a/§5c backstop that keeps `SCN` from drifting into a second state/drama engine. Because a token blocklist cannot catch paraphrased narrative-shape framing ("the scene builds toward the confrontation"), `branching-story-scene-plan`'s HARD-GATE additionally carries a judgment-level §5c affirmation: the author confirms `scene_descriptor` / `boundary_rationale` describe what the committed `PG` range *depicts* (past/present, factual), not a future dramatic obligation or target arc position. The token validator is the backstop; the affirmation is the semantic guard.

**Scene-prose-attach checks** (`scene-prose-receipt.schema.json`, scene-level analogues of the page prose-receipt checks):

- `included_pg_events_rendered` — every included `PG`'s required event/effect is dramatized (compression allowed; skipping load-bearing causality not).
- `final_scene_choice_surface_visibility` — the scene's playable choice surface matches the end `PG`.
- `scene_range_entity_status_consistency`, `scene_range_invented_structural_fact`, `scene_range_forbidden_mystery_resolution` (FOUNDATIONS Rule 7 / §6b), `scene_prose_stchar_fidelity`, `engine_jargon_leak`, `canon_claim_without_authority`.

**Advisory only (never block, never touch state):** craft quality, repetition, pacing, omitted minor beats, stale-scene-plan-after-edit, included-PG freshness drift (receipt-level: included PG ids + their `state_hash`es at attach). Receipt drift means "this receipt may be stale relative to the current prose/plan," never "story state is invalid."

`branching-story-scene-prose-attach` writes only the receipt + INDEX update (direct writes); it never mutates the `PG` or any `_source/` state record, and emits no `SE` by default.

## 7. Files to touch

- **New skills:** `.claude/skills/branching-story-scene-plan/SKILL.md` (+ references as needed); `.claude/skills/branching-story-scene-prose-attach/SKILL.md`.
- **Patch engine:** `tools/patch-engine/src/` — add `create_scn_record` op (+ `SCN` supersession) and its compile-reject coverage; `tools/world-mcp/` — envelope schema + dispatch for the op; `list_records` `record_type` registration + `get_record` dispatch for the `SCN` class (distinct from the op dispatch — acceptance #6 + the test plan depend on SCN retrieval); allocator support for the `SCN` ID class.
- **World-index:** `tools/world-index/src/enumerate.ts` (add the four scene directories + `_source/scenes`); `tools/world-index/src/parse/story-directories.ts` (add `scenes`); `SCN` node-type parsing (register `SCN` so `list_records` / `get_record` resolve it); `SCN` edge parsing (`SCN→PG`/`CHC`/`BR`/`previous_scene`).
- **Validators:** `tools/validators/src/structural/` — `scene-range-integrity.ts`, `scene-plan-structural.ts`, `scene-plan-verbatim-section-integrity.ts`, `scene-plan-body-engine-vocabulary-cleanliness.ts`, `scn-no-narrative-shape-language.ts`; `tools/validators/src/schemas/story-scene.schema.json` (the `SCN` record), `scene-prose-receipt.schema.json`; registry wiring; reuse `page-plan-verbatim-canonical-sources.ts` retargeted.
- **Contract:** `.claude/skills/_shared-templates/story-record-schemas.md` (SCN schema + scene-receipt fields), `.claude/skills/_shared-templates/story-state-contract.md` (scene-plan structure section + scene-scope validation rules + nine-gate note that scene attach is downstream/non-authoritative like prose-attach).
- **FOUNDATIONS:** `docs/FOUNDATIONS.md` §Story Bundles §6 (SCN ID class), §7 (Skill Category 2c roster → 10 skills), §9 (scene plans host §2/§3/§render-time), new §Story Bundles sub-section "Scene Render Layer" with the §5a/§5c guard.
- **Docs:** `docs/WORKFLOWS.md` (invoke the two new skills), `docs/REPOSITORY-MAP.md` (skill taxonomy + scene directories), `docs/prose-renderer-contract/README.md` (the contract blocks now inline into scene plans too).

## 8. FOUNDATIONS Alignment

| Principle | Stance | Rationale (mechanism @ surface) |
|---|---|---|
| §Story Bundles §4 / §4a (Plan-Authority Boundary) | aligns | Scene prose is a non-authoritative literary rendering over committed `PG` snapshots; scene attach creates no state and forks nothing @ skill prose + schema. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | aligns (guarded) | `SCN` carries membership/status/paths only — no `arc_contract`, `dramatic_unit`, or stop-policy semantics @ schema constraint. |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape) | aligns (guarded) | Two-layer guard: `scn_no_narrative_shape_language` validator (deterministic backstop) bars act/arc/target-shape tokens, AND `branching-story-scene-plan`'s HARD-GATE judgment affirmation (semantic guard) requires `scene_descriptor` / `boundary_rationale` describe committed beats, never future-prescriptive @ validator gate + authoring time. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | Every `SCN` field is consumed by the index (membership/edges), a validator (contiguity/choice-surface), or scene attach; no nice-to-have fields @ schema constraint. |
| §Story Bundles §6b (Observer Firewall) | aligns | Scene plan §POV block + `scene_range_forbidden_mystery_resolution` enforce POV knowledge and mystery firewall across the range @ validator gate. |
| §Story Bundles §9 (Prose Length Discipline) | aligns | No word quotas introduced; pacing remains structural (beats + scene boundary); §2/§3/§render-time stay verbatim, now per scene @ skill prose. |
| §Tooling Recommendation | aligns | Scene plan derived from committed `PG` records via MCP retrieval, not from prose @ skill prose. |
| Rule 1 (No Floating Facts) | aligns | The `SCN` record and scene plan declare membership, beats, stop condition, and `forbidden_resolutions` grounded in committed `PG`s @ schema + validator gate. |
| Rule 7 (Preserve Mystery Deliberately) | aligns | `scene_range_forbidden_mystery_resolution` is the scene-level mystery firewall on rendered prose @ validator gate. |

## 9. Acceptance criteria

1. `SCN` record class exists with a `create_scn_record` patch op + supersession; an `SCN` ID class is allocatable via `allocate_next_id(world_slug, 'SCN', story_slug=...)`.
2. An `SCN` maps an ordered, contiguous `PG` range on **one** branch path; `scene_range_*` validators reject non-contiguous ranges, cross-branch ranges, and sibling-inclusive ranges (rationale, not bare PASS).
3. `SCN` (and scene plan) carry no act/arc/target-narrative-shape language; `scn_no_narrative_shape_language` fails on injected narrative-shape tokens.
4. `branching-story-scene-plan` produces a renderer-clean `scene-prose-plans/SCN-<n>.md` (no record IDs/hashes/schema/validator/lifecycle language) with §2/§3/§render-time inlined verbatim and byte-equal to canonical sources.
5. `branching-story-scene-prose-attach` validates scene prose against every included `PG`, writes `scene-prose-receipts/SCN-<n>.yaml`, and mutates no `PG`/`_source/` state record (verified: no patch plan submitted, no `SE` emitted by default).
6. World-index enumerates `_source/scenes`, `scene-prose-plans`, `scene-prose`, `scene-prose-receipts` and indexes `SCN→PG/CHC/BR/previous_scene` edges.
7. Scene plan/prose markdown are freely editable: editing them produces no validation FAIL and no state-hash effect; only advisory freshness may be noted.
8. Only the end `PG`'s emitted choices are recorded as the scene's playable surface; intermediate choices are not.
9. The existing page-plan pipeline (bootstrap/turn-cycle page plans, `branching-story-prose-attach`, page-plan validators, Hook 6/7) is unchanged and green — coexistence holds.
10. Affected `tools/` packages build + test green.

## 10. Test plan

Per-package (no workspace; per-package npm — verified): from each package dir run `npm run build` (tsc = typecheck) then `npm test`; `tools/patch-engine` also `npm run test:integration`.

- `tools/patch-engine`: `create_scn_record` op apply + ordering + compile-reject; supersession of `SCN` range/status. PASS rationale: op writes a well-formed `SCN`, append-only.
- `tools/world-index`: enumeration of the four scene directories; `SCN` edge parity (membership/choice/branch/previous_scene). PASS rationale: scene records and edges appear in the index identically to disk.
- `tools/validators`: contiguity / single-branch / no-sibling fixtures; scene-plan structural + verbatim + body-cleanliness; `scn_no_narrative_shape_language` positive + negative; `scene-prose-receipt.schema.json` round-trip + each `scene_range_*` check. PASS rationale: each validator fires on its violation fixture and passes a clean fixture.
- `tools/world-mcp`: `SCN` retrieval (`get_record`/`list_records`) + `allocate_next_id('SCN')`. PASS rationale: SCN allocatable and retrievable with `story_slug`.
- Skill contract checks: `branching-story-scene-plan` / `branching-story-scene-prose-attach` SKILL.md pre-flight loads FOUNDATIONS + the shared contract; HARD-GATE present; scene-plan body cleanliness asserted.

## 11. Open questions (defaulted; user may override on review)

1. **Root scene at bootstrap?** Default: **no** — `SCN-1` is created only when the author invokes `branching-story-scene-plan` (keeps bootstrap state-only, report Q5/15.5).
2. **`SCN` vs `RU` prefix?** Default: **`SCN`**, scene-only. Non-scene render kinds (prologue / interstitial / recap) are deferred to a future spec that adds a `render_kind` field when a concrete consumer exists (report §8).
3. **Does scene attach emit an audit `SE`?** Default: **no** (report Open Question 15.3).

## Outcome

Completed: 2026-05-28

Implemented and archived through tickets `archive/tickets/SPEC92SCERANPRO-001.md` through `archive/tickets/SPEC92SCERANPRO-011.md`.

The additive scene-range prose rendering layer now exists across the shared story contracts, validators, patch engine, world index, world MCP retrieval/allocation surfaces, scene planning and scene prose attach skills, FOUNDATIONS, workflow docs, and the capstone integration test. `SCN` is a non-authoritative story-bundle render-membership record over committed `PG` ranges; scene plans and scene prose remain direct-write render artifacts; scene attach writes receipt/prose surfaces and does not mutate `PG` or other `_source` state.

Final verification:

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/integration/spec92-scene-layer-capstone.test.js` — PASS: 3 capstone subtests passed.
3. `cd tools/validators && npm test` — PASS: full validators package rebuilt and passed 1134 tests.
4. `cd tools/world-index && npm test` — PASS: package test runner passed 135 tests.
5. `cd tools/patch-engine && npm test` — PASS: package build + test passed 106 tests.
6. `cd tools/world-mcp && npm test` — PASS: package build + test passed 516 tests.

Deviations: the LLM-owned `branching-story-scene-plan` and `branching-story-scene-prose-attach` flow is documented as a manual temp-root runbook in the capstone test rather than executed from `node:test`; deterministic package surfaces cover coexistence, schema/validator composition, retrieval/allocation, and no-state-mutation assertions.
