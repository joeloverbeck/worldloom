---
name: branching-story-bootstrap
description: "Use when creating a new branching-story bundle inside an existing worldloom world. Produces: STCHAR profiles plus story-bundle records (STENT/STSTAT/STINT/SF/BEL/SE/OBL/CNSQ/THR/SREL/STLOC/STOBJ/optional CLK/STSEC/STQ/STPLAN/STEMO/DA/BR/PG/CHC/optional SLT) via patch engine + STORY_KERNEL.md + pages-prose-plans/PG-1.md + per-bundle INDEX.md + per-world stories/INDEX.md first-run create-or-append. Mutates: only worlds/<world_slug>/stories/<story_slug>/ plus worlds/<world_slug>/stories/INDEX.md."
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

(a) Pre-flight Check has completed: world resolved, story-slug collision-free against `worlds/<world_slug>/stories/<story_slug>/`, selected cast resolved to existing `CHAR-*` dossiers, all bootstrap ids allocated in one ordered `mcp__worldloom__allocate_many_ids(world_slug, allocations=[...])` call when available (including one `STCHAR` id for every selected non-background cast member, optional root pressure / secret / open-setup ids when premise-warranted, `STORY`, and every remaining story-bundle class to be drafted), falling back to equivalent ordered `mcp__worldloom__allocate_next_id` calls only if the running server has not been restarted with `allocate_many_ids`, context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', ...)`, and the canonical prose-quality sources (`docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, `tools/validators/src/schemas/story-character-authority.schema.json`, `reports/prose-quality-instructions.md`) are loaded.

(b) Phases 1-9 have completed in working memory: state seed normalized; Phase 1b Distillation Boundary Ledger drafted and checked before any STCHAR or opening state record is finalized; one schema-valid `STCHAR` profile drafted from the ledger's Stable -> STCHAR row and validated for every selected non-background cast member before any STENT, temporal, page, choice, or direct-write artifact is finalized; one `STENT` per cast member drafted with `bound_stchar_id` for every non-background role; one `STSTAT` per active `STENT` plus STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / (optional CLK / STSEC / STQ / STPLAN / STEMO / DA) / (optional SLT) seed records drafted from the ledger's opening-current routing rows; `SE-1` drafted; `PG-1` drafted with full `state_snapshot`, `active_records.STCHAR`, and `validation_trace`; `STORY_KERNEL.md` drafted with the required section set including `## Player Agency Contract`; `pages-prose-plans/PG-1.md` drafted with all 19 numbered sections plus optional §9b / §9c / §10b when relevant story-state records are active, plus mandatory §16a STCHAR packets when relevant and current-state mentions grounded in active state records, including verbatim §2 / §3 / §19 inlined from `reports/prose-quality-instructions.md`; 3-5 `CHC` records drafted.

(c) Phase 10 has validated all 8 shared hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 with a one-line PASS rationale per gate on `PG-1.validation_trace`, plus the 6 bootstrap-additional checks (cast resolution to existing `CHAR` dossiers; every required STCHAR generated and validated before any story state is created; no mirrored SF globalizes its parent CF scope; root page plan is self-contained per shared contract §8 including §16a STCHAR packets; continuation capacity satisfied — at least one eligible seed SLT or a planned runtime JIT path; terminal root rejected as authoring error; pool coverage (cast-role + driver-kind + pressure-source-class + composition per SPEC-80 §3) — fails when any axis is unmet at `seed_commitment_blocks: minimal | standard`, bypassed at `seed_commitment_blocks: none`).

(d) The user has explicitly approved the deliverable summary (bundle path, cast roster with `STENT` / `STCHAR` / source-`CHAR` provenance, record inventory by class, STCHAR profile inventory, page plan structural preview including §16a packet summary, emitted choices list).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (FOUNDATIONS + contract + prose-quality sources loaded;
  world resolved; cast verified; bundle-target collision-free;
  STCHAR ids + all other ids allocated; context packet loaded)
        |
        v
Phase 1: Normalize premise → state_seed
        |
        v
Phase 1b: Extract opening temporal state and build Distillation Boundary Ledger
        |
        v
Phase 2: Distill selected cast → STCHAR profiles (in memory)
        |
        v
Phase 3: Mirror load-bearing world facts → SF records (in memory)
        |
        v
Phase 4: Create initial beliefs → BEL records (in memory)
        |
        v
Phase 5: Create initial debts + optional CLK / STSEC / STQ / STPLAN / STEMO seeds → OBL / CNSQ / THR / SREL / optional new-class records (in memory)
        |
        v
Phase 6: [optional] Seed commitment blocks → SLT author-pool records (in memory)
        |
        v
Phase 7: Commit root event + page snapshot → SE-1 + PG-1 (in memory)
        |
        v
Phase 8: Author root page plan → pages-prose-plans/PG-1.md (in memory)
        |
        v
Phase 9: Generate first choices → CHC records (in memory)
        |
        v
Phase 10: Validate against shared 8 hard gates + 6 bootstrap-additional checks;
  compute final PG hashes per shared contract §4.2a
        |
        v
Phase 11: HARD-GATE fires → atomic patch + markdown writes
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
| `STCHAR-<integer>` | `story-characters/STCHAR-<integer>.md` | Always for every selected non-background cast member, before STENT/story-state creation |
| `STENT-<integer>` | `_source/entities/STENT-<integer>.yaml` | Always (one per cast member; `role_in_story` uses canonical list values such as `[viewpoint, primary_actor]`) |
| `STSTAT-<integer>` | `_source/status/STSTAT-<integer>.yaml` | Always (one active status record per active `STENT`; `entity_status` is derived from these records) |
| `STINT-<integer>` | `_source/intentions/STINT-<integer>.yaml` | Always (≥1 per cast member) |
| `SF-<integer>` | `_source/facts/SF-<integer>.yaml` | Always (load-bearing mirrored world facts) |
| `BEL-<integer>` | `_source/beliefs/BEL-<integer>.yaml` | Always (initial belief state per cast member) |
| `OBL-<integer>` | `_source/obligations/OBL-<integer>.yaml` | IF opening pressure demands explicit obligation |
| `CNSQ-<integer>` | `_source/consequences/CNSQ-<integer>.yaml` | IF opening pressure demands explicit consequence |
| `THR-<integer>` | `_source/threads/THR-<integer>.yaml` | Always (1-3 threads tracking opening pressure) |
| `CLK-<integer>` | `_source/clocks/CLK-<integer>.yaml` | IF a deadline, pursuit, exposure, faction, or other staged pressure should start ticking at root |
| `STSEC-<integer>` | `_source/secrets/STSEC-<integer>.yaml` | IF the premise starts with a story-local hidden truth that should bind BEL / SF / DA evidence |
| `STQ-<integer>` | `_source/story-questions/STQ-<integer>.yaml` | IF the premise explicitly introduces an open setup, promise, or dramatic question |
| `STPLAN-<integer>` | `_source/plans/STPLAN-<integer>.yaml` | IF a cast member's medium-range tactical agency is load-bearing at story start |
| `STEMO-<integer>` | `_source/emotions/STEMO-<integer>.yaml` | IF an affective pressure is load-bearing for choice, prose interpretation, or state interpretation at story start |
| `SREL-<integer>` | `_source/relationships/SREL-<integer>.yaml` | IF cast relationships constrain opening choice |
| `STLOC-<integer>` | `_source/locations/STLOC-<integer>.yaml` | Always (initial location) |
| `STOBJ-<integer>` | `_source/objects/STOBJ-<integer>.yaml` | IF an object is grounded in the opening situation |
| `DA-<integer>` | `_source/artifacts/DA-<integer>.yaml` | IF an in-story diegetic artifact is in play at opening; see Phase 4 DA triage |
| `BR-1` | `_source/branches/BR-1.yaml` | Always (root branch) |
| `SE-1` | `_source/events/SE-1.yaml` | Always (event_kind: story_start) |
| `PG-1` | `_source/pages/PG-1.yaml` | Always (root page snapshot) |
| `CHC-<integer>` | `_source/choices/CHC-<integer>.yaml` | Always (3-5 concrete, selectable choices emitted by PG-1; no placeholder write-in CHC — write-in is a turn-cycle skill input, not a CHC pool entry) |
| `SLT-<integer>` | `_source/storylets/SLT-<integer>.yaml` | IF `seed_commitment_blocks != 'none'` (4-8 for `minimal`; 8-14 cap for `standard`) |
| STORY_KERNEL.md | `STORY_KERNEL.md` | Always (direct write after patch submission) |
| Root page plan | `pages-prose-plans/PG-1.md` | Always (direct write after patch submission) |
| Bundle INDEX | `INDEX.md` | Always (direct write after patch submission) |
| Per-world stories INDEX | `worlds/<world_slug>/stories/INDEX.md` | Always (first-run create; append thereafter) |

Bootstrap does NOT write `pages-prose/PG-1.md` (rendered prose is supplied externally) and does NOT write any prose receipt.

## Procedure

1. Load `references/pre-flight-and-prerequisites.md` and run the Pre-flight Check (FOUNDATIONS + shared contract + prose-quality sources loaded; world resolved; cast verified; bundle-target collision-free; STCHAR + all other ids allocated; context packet loaded). Abort on any precondition failure before drafting begins.
2. Load `references/phase-1-2-state-seed-and-stchar-distillation.md`. Normalize the premise into a structured `story_seed` (Phase 1), extract opening temporal state into the Distillation Boundary Ledger (Phase 1b), then distill every selected non-background `CHAR-*` into a schema-valid `STCHAR-*` profile from the ledger's Stable -> STCHAR row (Phase 2) before any STENT / temporal / page / choice / direct-write artifact is finalized.
3. Load `references/phase-3-4-facts-beliefs-da.md`. Mirror load-bearing world facts into `SF` records (Phase 3); consume the Distillation Boundary Ledger to create initial `BEL` records, one `STENT` per cast member with the canonical `role_in_story` and `bound_stchar_id`, and one initial `STSTAT` per active STENT; apply DA triage at opening, including shared contract §5a.3 witness-trigger and public-BEL coverage rules for public/factional DA propagation (Phase 4).
4. Load `references/phase-5-debts-and-optional-seeds.md`. Consume the Distillation Boundary Ledger to create 1-3 `THR` plus the constrained `OBL` / `CNSQ` / `SREL` records, applying the cross-class-provenance rule and the good-debt-vs-bad-debt filter; seed any premise-warranted optional CLK / STSEC / STQ / STPLAN / STEMO records (Phase 5). When a seeded `STEMO` uses `agency_effect: constraining`, satisfy FOUNDATIONS Rule 1 and Rule 5 with a matching downstream artifact in the same opening envelope or already-active bundle state: an emitted `CHC.grounded_in.records[]` entry naming that `STEMO`, a holder-matched active `STPLAN.derived_from[]` entry, or an active `SREL.derived_from[]` entry whose `participants[]` includes the holder. Do not use `SE-1.non_propagation_facts[]` or `SE-1.state_relations[]` as the affective-constraint receipt; those fields remain witness-coverage and plan-relation surfaces.
5. If `seed_commitment_blocks != 'none'`, load `references/phase-6-commitment-blocks.md` and seed 4-8 (`minimal`) or 8-14 (`standard`) broad `SLT` author-pool blocks (Phase 6). Otherwise skip — runtime JIT will create branch-scoped blocks.
6. Load `references/phase-7-root-event-and-page.md`. Draft `SE-1` (`event_kind: story_start`) and `PG-1` (root page snapshot with `branch_path: ["PG-1"]`, full `state_snapshot`, `prose_plan_path: pages-prose-plans/PG-1.md`, placeholder hashes to be finalized at Phase 10) in working memory (Phase 7). In parallel, draft `STORY_KERNEL.md` per `references/story-kernel-contract.md`.
   - PG-1 `SE-1` keeps `event_kind: story_start` for the standard opening pattern where PG-1 emits choices and waits for player input. Because `story_start` forbids `turn_driver`, the root page plan omits shared-contract §7a Turn driver / initiative trace in this standard case.
   - The only edge case where opening initiative appears immediately is an `advance_initiative` continuation after `story_start`; the continuation event carries `event_kind: turn_resolution` plus `turn_driver`, not SE-1 itself.
   - Seeded SLTs populate `grounding.compatible_turn_drivers[]` and `grounding.reason_to_exist` per SPEC-77 (see Phase 6 reference). The `compatible_turn_drivers[]` enum entries describe which `SE.turn_driver.kind` values the block is eligible for; pick the kinds the block's predicates structurally support.
7. Load `references/phase-8-9-page-plan-and-choices.md`. Author the root page plan as future `pages-prose-plans/PG-1.md` bytes — all 19 numbered sections plus optional §9b / §9c / §10b when relevant active records exist, mandatory §16a STCHAR packets that project stable STCHAR authority through active opening state, verbatim §2 / §3 / §19 from `reports/prose-quality-instructions.md` (Phase 8); then emit 3-5 `CHC` records covering distinct commitment axes (no placeholder write-in CHC — write-in is a turn-cycle skill input via `manual_action_text`, orthogonal to the CHC pool), each with `grounded_in.records` populated from `PG-1.state_snapshot.active_records` (Phase 9).
8. Load `references/phase-10-validation.md`. Run the 8 shared hard gates (record one-line PASS rationale per gate on `PG-1.validation_trace`) plus the 6 bootstrap-additional checks, including shared contract §5a.3 public-BEL / non-propagation discharge for triggered witness coverage and SPEC-80 pool coverage (recorded in working memory). After every gate and check passes, compute final `PG-1.plan.plan_hash` and `PG-1.state_hash` via `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` (Phase 10). Abort before commit on any gate, additional-check, or hash failure.
9. **Phase 11: Commit / Write — HARD-GATE fires.**

   1. Build the patch plan covering every record drafted in Phases 1-9 as a single envelope. Operations: `append_story_character_authority_record` (per STCHAR, with `expected_id_allocations.stchar_ids`), `create_stent_record`, `create_ststat_record`, `create_stint_record`, `create_sf_record`, `create_bel_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stloc_record`, `create_stobj_record`, `create_clk_record` (if optional CLK seeds are applicable), `create_stsec_record` (if optional STSEC seeds are applicable), `create_stq_record` (if optional STQ seeds are applicable), `append_story_diegetic_artifact_record` (if story-local DA records are applicable, with `expected_id_allocations.story_da_ids`), `create_br_record`, `create_se_record`, `create_pg_record`, `create_chc_record` (per choice), `create_slt_record` (per seed block if `seed_commitment_blocks != 'none'`). Each op requires a `target_file` field naming the on-disk write path (e.g., `worlds/<world_slug>/stories/<story_slug>/_source/<class>/<ID>.yaml` or `worlds/<world_slug>/stories/<story_slug>/story-characters/<ID>.md`); see `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` or invoke `mcp__worldloom__describe_envelope_schema(op_kind?)` at pre-flight for the machine-readable per-op shape.
   2. Dry-run via `mcp__worldloom__validate_patch_plan`. This run also exercises `record_schema_compliance` for `BEL`, `PG`, `STENT`, and STCHAR; placeholder or malformed PG/STCHAR hashes must not reach this step.

      **Validate-path selection by envelope shape** — prefer the CLI path that reads `envelope.json` directly: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js [--world-root <path>] <plan-path>`.
      - **Why CLI over inline MCP**: bootstrap envelopes are built from disk YAML files by construction (step 1's persist-envelope-as-JSON + the on-disk records the engine ops reference); inline JSON pasted into the MCP tool call is a separate buffer from `envelope.json` on disk, and any divergence produces a dry-run that passes the inline version while the disk version is what actually submits. Bootstrap envelopes routinely exceed the size where inline-paste-drift becomes a real risk (a full cast + standard seed pool easily reaches 70KB+ per step 5).
      - **Equivalence**: same engine code, same `{ status, verdicts, validators_run }` response shape, same validator coverage; this is the dry-run analogue of the submit-path CLI named in step 5.
      - **Fresh-process escape valve**: also use the CLI path when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory.
      - See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan and `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix for the equivalent submit-path treatment.
   3. Present the complete deliverable summary to the user: bundle path, cast roster (`STENT`, bound `STCHAR`, source `CHAR` provenance, role), record inventory by class with counts, STCHAR profile inventory, page plan structural preview (§1 / §5 / §6 / §12 / §13 / §16a — the engine-readable sections; §2 / §3 / §19 are too long to inline in preview), emitted choices list.
   4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
   5. On approval, run the submit sequence:

      **Submit sequence**:
      1. Persist the patch plan envelope as JSON (e.g., `/tmp/<plan-id>.json`).
      2. Issue the `approval_token` via the canonical signer: `node tools/world-mcp/dist/src/cli/sign-approval-token.js [--world-root <path>] <plan-path>` — see `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token.
      3. Call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and the issued token.

      Approval tokens are single-use, plan-bound, default-20-minute-expiry.

      **Submit-path selection by envelope size** — for envelopes >50KB submit via the CLI path: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js [--world-root <path>] <plan-path> <token-path>` (persist the signed token to a text file first). Bootstrap envelopes routinely exceed 50KB (a full cast + standard seed-pool bundle produces 50+ records with full snapshot fields, easily 70KB+). The signer, validate CLI, and submit CLI resolve the project root by explicit flag, `WORLDLOOM_ROOT`, then marker auto-discovery from cwd.
      - **Equivalence**: same engine code, same `PatchReceipt`, same failure-mode codes; bypasses MCP transport size constraints. See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan.
      - **Fresh-process escape valve**: also switch to the CLI submit path — regardless of envelope size — when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory and a full Claude Code session restart is not immediately available (see `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix).

      **Reading CLI output** — the CLI submit emits a `PatchReceipt` object to **stdout** on success (exit code 0) and an `EngineError` / `McpError` object to **stderr** (not stdout) on failure (exit code 1) — confirmed by `tools/world-mcp/src/cli/submit-patch-plan.ts` stream separation.
      - **Success JSON**: `PatchReceipt` with NO `ok` field; starts with `plan_id`, `applied_at`, `files_written`, etc.
      - **Failure JSON**: has `ok: false` and `code: ...` at the top.
      - **Success/fail discriminators**: exit code OR stream separation OR top-line key presence (`plan_id` on success vs `code` / `ok: false` on failure) — NOT the absent-on-success `ok` field.
      - **Inspecting success**: `echo $?` after the command, `jq -r .plan_id` (returns the plan id on success, `null` on failure), or capture stdout and stderr to separate buffers.
      - **Do not use `jq -r .ok`** for success detection — the key is missing on success and returns `null`, which an operator may misread as a failure signal.
      - **Do not tail-truncate** the output and infer status from the validator dump alone; validator-PASS rows appear in both success and pre-apply-failure responses, so the top-line keys (or the exit code) are the discriminator.

      **Recovery** — if the success header may have been missed, do not re-run submit just to recover a receipt. Reusing the same consumed token returns `approval_replayed`; a genuinely fresh token over an already-applied plan is not the replay gate and may attempt duplicate writes or hit later engine protections. Inspect the target story `_source/` records and receipt/log output before any further submit attempt.
   6. On patch success, write `STORY_KERNEL.md`, then write `pages-prose-plans/PG-1.md` using the exact bytes hashed into `PG-1.plan.plan_hash`.
   7. Run post-write plan-hash verification (shared contract §10 step 5a) before any `INDEX.md` update: `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/PG-1.md --pg <PG-1 record file>`, then confirm the emitted `plan_hash` equals the committed `PG-1.plan.plan_hash`. If they differ, do not update `INDEX.md`; surface the mismatch and both hashes (committed vs recomputed); treat it as a direct-artifact partial failure per `docs/HARD-GATE-DISCIPLINE.md`. The patch plan is not re-submitted; only the disk artifact is reconciled to the already-approved bytes.
   8. After post-write verification passes, update bundle `INDEX.md`, then per-world `stories/INDEX.md` (first-run create or append). The bundle `INDEX.md` at first run contains: a Bundle Identity table (World / Story slug / Story ID / Root branch / Root page / Genesis event / Created), a Cast Roster table (STENT / STCHAR / source CHAR provenance / Display name / Role in story), a Story Character Authority table (STCHAR / status / source kind / source CHAR provenance / bound STENT / profile revision / hashes), and one section per non-empty record class — Branches / Pages / Active Threads / Open Obligations / Pending Consequences / Active Clocks / Story Secrets / Open Setups / Relationships / Story-Local Facts / Story-Local Beliefs / Locations / Objects / Commitment Block Pool / `## Emitted Choices at PG-1` / Mystery Reserve at Bundle Scope / `## Validation Trace on PG-1` (the latter populated from `PG-1.validation_trace` per the shared eight hard gates). The per-world `stories/INDEX.md` at first run contains a Bundles table listing the new bundle's slug, story_id, root page, and created date; subsequent bundles append rows. Bootstrap defines this convention; downstream skills (`branching-story-turn-cycle` and others) inherit and extend it.
   9. Report bundle path + record inventory to the user. Do NOT `git commit`.

   **Failure behavior**: patch fail → write nothing; surface failed gate and the corrective action. Patch success + markdown write fail → story-bundle `_source/` records are authoritative; surface the partial-failure to the user with a one-paragraph diagnostic; do not silently retry. Terminal root → authoring error, abort before patch submission.

For governance — Record Schemas, FOUNDATIONS Alignment, and the full Guardrails list — see `references/governance-and-foundations.md`.

## Guardrails (Summary)

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<subdir>/*.yaml`; story-bundle records under `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` are this skill's exclusive write surface, routed through the patch engine.
- **Never write rendered prose at bootstrap.** `pages-prose/PG-1.md` is supplied externally; bootstrap writes only the plan at `pages-prose-plans/PG-1.md`.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** No nice-to-have fields, no derived rollups, no legacy lifecycle fields.
- **Verbatim §2 / §3 / §19 of the page plan** — inlined from `reports/prose-quality-instructions.md` so each cold-context render is self-contained.
- **Skills do not chain.** Bootstrap never invokes downstream siblings; the user invokes them separately with the bundle path as input.
- **No runtime `CHAR` authority after bootstrap distillation.** Runtime consumes `STCHAR` / `STENT.bound_stchar_id` / `PG.active_records.STCHAR`, never world `CHAR` dossiers.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.

Full guardrails list lives in `references/governance-and-foundations.md`.

## Final Rule

Bootstrap initializes a story bundle's root causal state without rendering prose and without establishing any prose-rendering lifecycle — the page snapshot is the fork primitive, and rendered prose is the external renderer's authorial artifact, not bootstrap's responsibility.
