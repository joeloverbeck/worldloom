---
name: storylet-pool-authoring
description: "Use when authoring or expanding the storylet reservoir of an existing branching story bundle inside an existing worldloom world — `seed` mode (direct seed/top-up sizing is local to this skill; branching-story-bootstrap Phase 6 supplies its computed target_pool_size when invoking as a no-write sub-routine), `focus` mode (10-15 storylets in a named focus_area), `jit` mode (one runtime branch-scoped storylet invoked by branching-story-page-cycle Phase 4 as a no-write sub-routine), or `audit` mode (consumes RSP cards from branching-story-health-audit's audits/SAU-NNNN/remediation-storylet-proposals/ output). Direct invocation produces: SLT-NNNN.yaml records under worlds/<world-slug>/stories/<story-slug>/_source/storylets/ + an SLB-NNNN.md batch manifest under worlds/<world-slug>/stories/<story-slug>/storylet-batches/ + an updated worlds/<world-slug>/stories/<story-slug>/INDEX.md storylet-pool summary. Mutates: only worlds/<world-slug>/stories/<story-slug>/ on direct invocation (never WORLD_KERNEL.md, ONTOLOGY.md, or any worlds/<world-slug>/_source/<world-subdir>/*.yaml record); world-canon mutation routes through story-fact-promotion-to-canon (HARD-GATE preserved)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if missing."
    required: true
  - name: story_slug
    description: "Directory slug of an existing story bundle under worlds/<world-slug>/stories/<story-slug>/. Pre-flight aborts if missing, except for parent_skill_invocation=true bootstrap seed generation where branching-story-bootstrap is constructing the bundle in memory."
    required: true
  - name: mode
    description: "One of: seed | focus | audit | jit. Default: inferred from inputs (source_audit_path → audit; focus_area → focus; otherwise → seed). Audit mode consumes RSP cards from branching-story-health-audit's audits/SAU-NNNN/remediation-storylet-proposals/ output. JIT mode is sub-routine-only for branching-story-page-cycle Phase 4."
    required: false
  - name: focus_area
    description: "One of: bootstrap_mix | entry_pressure | threat_escalation | relational_dynamics | aftermath_consequences | mystery_edge_brushes | fork_recovery | thread_resolution_options | aftermath_residue | content_intensity_lift. Required when mode=focus; ignored when mode=seed (uses bootstrap_mix implicitly)."
    required: false
  - name: target_pool_size
    description: "Number of approved storylets to emit. Direct seed mode defaults to the local seed/top-up rules in Inputs §target_pool_size; bootstrap parent invocation requires the caller-supplied computed target_pool_size; focus mode defaults to 10-15."
    required: false
  - name: target_slt_ids
    description: "List of pre-allocated SLT-NNNN ids in deterministic order. Required when parent_skill_invocation=true and mode=seed for the bootstrap-seed sub-routine path; ignored otherwise."
    required: false
  - name: source_obligations
    description: "Comma-separated OBL-NNNN ids the new storylets should engage with (pay off / complicate / transfer). Optional in seed mode; recommended in focus mode."
    required: false
  - name: source_threads
    description: "Comma-separated THR-NNNN ids the new storylets should advance. Optional."
    required: false
  - name: source_audit_path
    description: "Path to one RSP-NNNN-<slug>.md remediation-storylet-proposal card (or its containing audits/SAU-NNNN/remediation-storylet-proposals/ directory) produced by branching-story-health-audit. Required when mode=audit; directory input consumes all RSP-*.md cards in deterministic path order."
    required: false
  - name: created_at_page
    description: "PG-NNNN. Required when mode=jit; ignored otherwise. Populates provenance.created_at_page and anchors branch_scoped visibility for the returned runtime storylet."
    required: false
  - name: caller_state_snapshot
    description: "Inline page-cycle state_snapshot. Required when mode=jit and parent_skill_invocation=true; ignored otherwise. Drives the reduced Phase 1 diagnosis and Phase 2 single seed."
    required: false
  - name: tone_override
    description: "Free-form tone hint (overrides the story kernel's default tone weighting for this batch). Optional."
    required: false
  - name: content_intensity_override
    description: "One of: tame | mature | explicit. Overrides the story's content_intensity_baseline ±1 band for this batch. Never lifts the NC-21 content_policy."
    required: false
  - name: parent_skill_invocation
    description: "Boolean. Default false. When true, this skill runs as a no-write sub-routine for a parent skill. Documented for branching-story-bootstrap Phase 6 seed generation and branching-story-page-cycle Phase 4 JIT generation; the parent skill supplies in-memory context and owns the user-facing HARD-GATE/write transaction."
    required: false
---

# Storylet Pool Authoring

Authors or expands the structured-content reservoir for an existing branching story bundle by generating per-mode batches (seed, focus, or audit) of `SLT-NNNN` storylets, or a single runtime JIT storylet when invoked by `branching-story-page-cycle`. Every produced storylet satisfies the Predicate DSL and the per-storylet validation gates (mystery firewall, resolution-authority declaration, invariant compatibility, consequence capacity, dedup, content-intensity coherence, predicate parsability, branch-contamination, schema completeness). Direct seed/focus batches satisfy the batch-level diversity audit (shape, tone, content_intensity, OBL-engagement, theme, cast usage); direct audit batches satisfy the audit-mode Phase 5 branch-contamination and RSP visibility-match checks. Direct batches then route approved storylet YAML records through `mcp__worldloom__submit_patch_plan`, write the markdown batch manifest directly, and update the per-bundle index after explicit user approval at the HARD-GATE. When `branching-story-bootstrap` invokes this skill as a `parent_skill_invocation: true` seed sub-routine, or `branching-story-page-cycle` invokes it as a `parent_skill_invocation: true` JIT sub-routine, this skill returns approved SLT records in memory and performs no writes; the parent skill's HARD-GATE/write transaction governs the resulting bundle.

<HARD-GATE>
Do NOT write any file under `worlds/<world-slug>/stories/<story-slug>/_source/storylets/`, do NOT create any file under `worlds/<world-slug>/stories/<story-slug>/storylet-batches/`, and do NOT `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` until: (a) Pre-flight resolves `worlds/<world-slug>/stories/<story-slug>/`, validates the parent story bundle exists with a readable `STORY_KERNEL.md`, validates and binds every RSP card named by `source_audit_path` when `mode=audit`, refuses direct `mode=jit` invocation unless `parent_skill_invocation=true` from `branching-story-page-cycle`, allocates the next `SLB-NNNN` and the next available `SLT-NNNN` range via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)` for direct batches, loads `docs/FOUNDATIONS.md` into working context (the Validation Rules that govern Phase 4 gates 1, 3, 4, and 9 — Rules 7, 4, 5, and 1 — and §Story Bundles §5 Validation Rules at Story Scope all live there; CLAUDE.md §Non-Negotiables explicitly forbids skipping this load), loads the current storylet pool + open OBLs + active THRs + recent page history along the longest active branch_path, loads world canon (whole-class M + INV records and a `task_type='storylet_pool_authoring'` context packet for governing CFs — packet call elidable under §Top-up-mode elision conditions per `references/pre-flight-and-prerequisites.md`), and confirms the content_policy block (NC-21 verbatim) is loaded for downstream LLM prompt assembly; (b) every surviving candidate SLT in the batch records PASS with a one-line rationale across all nine Phase 4 per-storylet gates (mystery firewall, resolution-authority declaration, invariant compatibility, consequence capacity, dedup, content-intensity coherence, predicate DSL parsability, branch-contamination, schema completeness) AND every direct seed/focus batch records PASS with a one-line rationale across all six Phase 5 diversity-audit checks (shape distribution, tone distribution, content_intensity distribution, OBL-engagement distribution, theme distribution, cast usage) plus the Phase 5 batch-level branch-contamination audit, while every direct audit batch records PASS for Phase 5 batch-level branch-contamination and RSP visibility-match checks; (c) the user has explicitly approved the Phase 6 batch manifest deliverable summary (per-storylet titles + shape + intensity + OBL/THR/RSP engagement + mystery_safety verdict, plus the diversity or audit-mode validation summary, the rejected-candidates count, and the target write paths). The gate is absolute under Auto Mode — invoking the skill is not approval of the deliverable. `parent_skill_invocation: true` is a documented no-write sub-routine path: for bootstrap seed generation and page-cycle JIT generation, this skill may return an internal validation packet and approved SLT records to the caller, but it must not write storylet files, create SLB manifests, or edit indexes; the parent skill's own HARD-GATE/write transaction is then the user-facing approval surface. The Phase 4 mystery-firewall hard-reject of any storylet whose `M_resolution_claims` carry `canon_candidate` authority is a separate, never-elided refusal that fires before the user-facing HARD-GATE — author-pool storylets MAY NOT carry `canon_candidate` authority because they are globally visible across branches and would launder a runtime canon-promotion handoff into authoring time. Runtime JIT storylets MAY carry `canon_candidate` authority only when `visibility.scope: branch_scoped` and `requires_canon_promotion: true`, and the runtime page-cycle's `story-fact-promotion-to-canon` handoff remains the sole legitimate canon-promotion path; this skill never makes that handoff.
</HARD-GATE>

## Process Flow

```
Pre-flight (resolve worlds/<world-slug>/stories/<story-slug>/;
            validate and bind RSP cards when mode=audit;
            refuse mode=jit unless parent_skill_invocation=true from
            branching-story-page-cycle with created_at_page +
            caller_state_snapshot;
            allocate next SLB-NNNN + reserve SLT-NNNN range via
            allocate_next_id for direct batches; determine mode; load STORY_KERNEL.md;
            load current storylet pool filtered by visibility;
            load open OBLs + active THRs from this bundle's _source/;
            load recent page history — last ~10 pages along the longest
            active branch_path only, not sibling branches;
            assemble retrieval — context_packet for premise-relevant
            world canon via task_type='storylet_pool_authoring' +
            whole-class M + INV record loads;
            confirm content_policy block (NC-21 verbatim) loaded)
      |
      v
Phase 1: Coverage Diagnosis     (scan current pool + open-state for
                                 thinness: open OBLs without compatible
                                 storylet; active THRs without escalation
                                 storylet; under-represented content_intensity
                                 bands relative to story baseline; over- or
                                 under-represented shape distribution;
                                 mysteries_in_play[] entries with no
                                 touching storylet; recent-history
                                 repetition signal; emit diagnosis matrix
                                 driving Phase 2; audit mode uses RSP
                                 targeting fields as diagnosis rows;
                                 jit mode reduces to
                                 one continuation-failure row from the
                                 caller_state_snapshot)
      |
      v
Phase 2: Generation Seeds       (produce target_pool_size + ~30% seeds —
                                 each names: target OBL/THR engaged, shape,
                                 tone register, content_intensity band,
                                 implied state preconditions, core
                                 dramatic transaction; seeds are proposals,
                                 not yet structured records; audit mode
                                 seeds from RSP sketch/rationale; jit mode
                                 produces exactly one seed from the
                                 continuation-failure context)
      |
      v
Phase 3: Structured Drafting    (per seed: assemble LLM prompt with
                                 content_policy verbatim FIRST + story
                                 kernel + seed brief + state context +
                                 predicate DSL grammar; LLM produces
                                 structured SLT proposal; engine wraps
                                 with schema scaffolding, validates field
                                 types, generates obligation_template /
                                 fact_template / cast_role machinery;
                                 records LLM's choice_templates verbatim
                                 as scaffolds)
      |
      v
Phase 4: Per-Storylet           (each candidate SLT runs all 9 gates
         Validation Gates       — mystery firewall, resolution-authority
         (Canon Safety Check    declaration, invariant compatibility,
          phase, per-storylet)  consequence capacity, dedup,
                                 content-intensity coherence, predicate
                                 DSL parsability, branch-contamination,
                                 schema completeness; HARD-REJECT removes
                                 from pool + replaces with under-represented
                                 seed; revise re-prompts up to 2 retries)
      |
      v
Phase 5: Diversity Audit        (across surviving SLTs: shape
         (Canon Safety Check    distribution ≤40% per shape; tone
          phase, batch-level)   ≤40%; content_intensity matches baseline;
                                 OBL-engagement ≥60% in seed mode or
                                 source_obligations hit in focus mode;
                                 theme ≤50%; no major cast member with
                                 zero engagement; PLUS batch-level
                                 branch-contamination audit verifying
                                 no global_author_pool storylet leaks
                                 branch-local IDs; up to 2 diversity-
                                 correction iterations before escalating;
                                 jit mode bypasses batch diversity)
      |
      v
Phase 5b: Engine Pre-Validation (direct invocation only: assemble draft
                                 patch plan with approval_token=
                                 "placeholder" and call
                                 mcp__worldloom__validate_patch_plan;
                                 coverage: yaml_parse_integrity, id_
                                 uniqueness, cross_file_reference,
                                 record_schema_compliance, Rules 1-7,
                                 storylet_predicate_dsl_parsability,
                                 rule11_action_space, rule12_redundancy;
                                 fold verdict into Phase 6 VALIDATION
                                 VERDICTS block; FAIL routes back to
                                 Phase 3 or 4 per failure mode; skip
                                 entirely when parent_skill_invocation:
                                 true)
      |
      v
Phase 6: Approval / Return      (direct invocation: HARD-GATE summary
                                 with SLB header +
                                 mode/focus_area + per-storylet line
                                 (title, shape, intensity, OBL/THR
                                 engagement, mystery_safety verdict) +
                                 diversity or audit-mode validation summary + rejected-candidates
                                 count + target write paths;
                                 parent_skill_invocation: internal
                                 validation packet returned to caller
                                 with approved SLT records;
                                 --user options-->
                                 ACCEPT BATCH / ACCEPT WITH SELECTIONS /
                                 REVISE-diversity / REVISE-focus / REJECT)
      |
   accept (or accept with selections)
      |
      v
Phase 7: Engine Submit          (direct invocation only: submit a patch plan
         + Markdown Writes      with create_slt_record ops for each
                                 SLT-NNNN.yaml under _source/storylets/;
                                 SLB-NNNN.md to
                                 storylet-batches/; INDEX.md updated
                                 LAST so partial failure leaves index
                                 unmutated; parent_skill_invocation
                                 returns before write; page-cycle writes
                                 JIT SLTs during its Phase 11 staged commit;
                                 NO git commit)
```

## Inputs

### Required

- `world_slug` — directory slug of an existing world under `worlds/<world-slug>/`.
- `story_slug` — directory slug of an existing story bundle under `worlds/<world-slug>/stories/<story-slug>/`. Pre-flight aborts if missing, except for `parent_skill_invocation: true` bootstrap seed generation where `branching-story-bootstrap` is constructing the bundle in memory.

### Optional

- `mode` — `seed | focus | audit | jit`. Default: inferred from inputs (`source_audit_path` → audit; `focus_area` → focus; otherwise → seed). Audit mode consumes RSP cards from `branching-story-health-audit`. JIT mode is the runtime sub-routine for `branching-story-page-cycle` Phase 4 and requires `parent_skill_invocation: true`.
- `focus_area` — one of {`bootstrap_mix`, `entry_pressure`, `threat_escalation`, `relational_dynamics`, `aftermath_consequences`, `mystery_edge_brushes`, `fork_recovery`, `thread_resolution_options`, `aftermath_residue`, `content_intensity_lift`}. Required when `mode=focus`; ignored when `mode=seed` (uses `bootstrap_mix` implicitly).
- `target_pool_size` — direct seed mode uses this skill's local seed/top-up sizing; focus mode defaults to 10–15. For `parent_skill_invocation: true` bootstrap seed generation, `branching-story-bootstrap` supplies the computed `target_pool_size` from `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` §Computing `target_pool_size`, or the explicit `storylet_pool_seed_size` override. For direct seed-mode top-up batches against an existing pool of N>0 storylets, prefer `target_pool_size = max(10, ceil(N × 0.5))` when `source_obligations` or `source_threads` are supplied (focused top-up — narrow scope absorbs fewer storylets without re-saturating the pool); prefer `target_pool_size = N` (pool-doubling refresh) when neither is supplied AND the user explicitly intends a broad re-seed against a stale pool. For direct seed invocation when neither override condition holds, the local recommendation remains ~20. Worked example: existing pool N=20, `source_obligations` supplied → `target_pool_size = max(10, ceil(20 × 0.5)) = max(10, 10) = 10`; Phase 2 then produces 10 + ceil(10 × 0.30) = 13 candidate seeds (per `references/phase-2-generation-seeds.md`'s +30% replacement buffer rule), of which 10 enter the pool after Phase 4 rejections and replacement-seed iterations. The +30% buffer applies to `target_pool_size`'s OUTPUT, not its input — the top-up arithmetic determines `target_pool_size`, then the buffer rule produces the candidate-seed count.
- `source_obligations` — comma-separated `OBL-NNNN` ids the new storylets should engage.
- `source_threads` — comma-separated `THR-NNNN` ids.
- `source_audit_path` — path to an `RSP-NNNN-<slug>.md` remediation-storylet-proposal card produced by `branching-story-health-audit` (or its containing `audits/SAU-NNNN/remediation-storylet-proposals/` directory). Required when `mode=audit`; directory input consumes every `RSP-*.md` card in deterministic path order.
- `created_at_page` — `PG-NNNN`. Required when `mode=jit`; ignored otherwise. Used for `provenance.created_at_page` and branch-scoped visibility.
- `caller_state_snapshot` — inline page-cycle `state_snapshot`. Required when `mode=jit` and `parent_skill_invocation=true`; ignored otherwise. Supplies the current branch state and continuation-failure reason for reduced diagnosis and seed generation.
- `target_slt_ids` — list of pre-allocated `SLT-NNNN` ids in deterministic order. Required when `parent_skill_invocation: true` AND `mode=seed` (the bootstrap-seed sub-routine path). The sub-routine consumes ids from the head of the list as it produces records; survivors after Phase 4 rejections and Phase 5 culling are emitted with the consumed ids. Unused tail ids are returned to the caller in the response packet so the caller can verify the full range against the consumed prefix.
- `tone_override` — free-form tone hint per batch.
- `content_intensity_override` — `tame | mature | explicit`; ±1 band override.
- `parent_skill_invocation` — boolean, default `false`. When `true`, this skill runs as a no-write sub-routine for a parent skill. Documented shapes: `branching-story-bootstrap` Phase 6 uses `mode=seed`, `focus_area=bootstrap_mix`, and bootstrap-supplied in-memory Phases 1-5 context for a story bundle that may not exist on disk yet; `branching-story-page-cycle` Phase 4 uses `mode=jit`, `target_pool_size=1`, `created_at_page=<this_PG_id>`, and `caller_state_snapshot=<this_state_snapshot>`.

## Output

- `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-NNNN.yaml` — one per approved storylet (count = surviving candidates after Phases 4-5, capped by `target_pool_size`). Schema in `templates/storylet-record.yaml`.
- `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-NNNN.md` — batch manifest summarizing the run (mode, focus area, source obligations/threads, approved storylets table, diversity summary, rejected-candidates breakdown). Schema in `templates/storylet-batch-manifest.md`.
- `worlds/<world-slug>/stories/<story-slug>/INDEX.md` — updated in place; storylet-pool section receives new total count + per-shape distribution + per-content_intensity distribution.

When `parent_skill_invocation: true`, no files are written by this skill. The output is an in-memory return packet containing approved SLT records, rejected-candidate counts, Phase 4 validation verdicts, and any applicable Phase 5 diversity summaries. `branching-story-bootstrap` pre-allocates the SLT range in Phase 6 before delegation, supplies `target_slt_ids[]`, and writes the final-id seed records during its Phase 11 staged commit. `branching-story-page-cycle` receives one `runtime_jit` SLT and writes it during its Phase 11 page-tick staged commit.

### No canon-file mutations

This skill never writes `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. SLT records do not promote to world-canon — promotion is `story-fact-promotion-to-canon`'s job (HARD-GATE preserved).

### ID Allocation

Direct invocation allocates `SLT-NNNN` (per-story append-only, shared with runtime JIT-generated storylets — Phase 4 of `branching-story-page-cycle` may write the next-numbered SLT between batches) and `SLB-NNNN` (per-story append-only batch manifests) via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`.

For `parent_skill_invocation: true` bootstrap seed generation, this skill does not allocate `SLB` and does not reserve the SLT range itself. `branching-story-bootstrap` pre-allocates the SLT range and supplies it via `target_slt_ids[]`. This skill consumes ids from the head of the supplied list in deterministic order; the bootstrap writes the returned storylets with their final ids during its Phase 11 staged commit. Unused tail ids are returned in the internal validation packet and are not written or reused.

For `parent_skill_invocation: true` page-cycle JIT generation, this skill does not allocate `SLB`. `branching-story-page-cycle` allocates or reserves the next SLT id as part of its page-tick write set and passes that id in the caller context; the returned SLT must carry `provenance.origin: runtime_jit`, `provenance.created_at_page: <created_at_page>`, and `visibility.scope: branch_scoped`.

## Procedure

The procedure below collapses the original Pre-flight + Phases 1-7 into a phase-router orchestration spine. Reference docs preserve the original phase numbers in their headings for traceability.

1. **Pre-flight & World-State Prerequisites** — load `references/pre-flight-and-prerequisites.md` and execute every step before Phase 1; abort if any precondition fails. Hook 2 redirects bulk world-canon reads to MCP retrieval; story-bundle reads remain direct.
2. **Phase 1: Coverage Diagnosis** — load `references/phase-1-coverage-diagnosis.md`. Emit the structured diagnosis matrix that drives Phase 2 seed selection (audit mode rows from RSP cards; jit mode reduces to one continuation-failure row).
3. **Phase 2: Generation Seeds** — load `references/phase-2-generation-seeds.md`. Produce `target_pool_size + ceil(target_pool_size × 0.30)` seeds for seed/focus batches (the buffer is structural — it absorbs Phase 4 rejections without forcing a stop-and-redraft cycle, so produce all N+30% upfront rather than lazy-deferring alternates until needed); mode-specific sizing for jit/audit.
4. **Phase 3: Structured Drafting** — load `references/phase-3-structured-drafting.md` and the three Phase 3 templates it consumes: `templates/content-policy.txt` (NC-21 verbatim — MUST be loaded; first in the prompt assembly so it binds before any drafting instruction), `templates/predicate-dsl.md` (closed grammar for `hard_preconds` / `soft_preconds` / `cast_requirements` / `location_requirements` — MUST be loaded; Phase 4 gate 7 hard-rejects free-form predicates), and `templates/tone-theme-tag-dictionary.md` (recommended tag vocabulary — load for tag-convergence across the pool's lifetime; novel tags are allowed but should be deliberate rather than ad-hoc, since fragmentary tags undermine the lifetime-convergence promise the dictionary exists to deliver). For each seed, assemble the LLM prompt (content_policy FIRST), produce a structured SLT proposal, and let the engine wrap with schema scaffolding + DSL parsability + visibility-scope assignment.
5. **Phases 4-5: Canon Safety Checks** — load `references/phase-4-5-canon-safety-checks.md`. Run all 9 Phase 4 per-storylet gates against every candidate (HARD-REJECT or revise per gate); then run Phase 5's six diversity-axis checks + batch-level branch-contamination audit + audit-mode RSP visibility-match for direct seed/focus batches and the audit-mode subset for direct audit batches; bypass diversity for jit/audit per the rules in the reference.
6. **Phase 5b: Engine Pre-Validation** — execute the inline §Phase 5b block below for direct invocation only. Assemble the draft patch plan with `approval_token: "placeholder"` and call `mcp__worldloom__validate_patch_plan(envelope)`. Coverage: `yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `record_schema_compliance`, `touched_by_cf_completeness`, `id_allocation_race` for `expected_id_allocations`, Rules 1-7, `storylet_predicate_dsl_parsability`, `rule11_action_space`, `rule12_redundancy`. For storylet records, `record_schema_compliance` is the VALENH-002 engine-side backstop for Phase 4 gate 9: it requires the template's load-bearing structural fields, including `mystery_safety`, `provenance`, `visibility`, and 4-6 `choice_templates`. Treat as a defensive pre-submit check, not a complete gate: approval-token verification remains submit-only, and submit keeps the `id_allocation_race` defense-in-depth backstop for the validate-to-submit race window. Fold the validators' verdict into the Phase 6 HARD-GATE summary's VALIDATION VERDICTS block. Skip when `parent_skill_invocation: true`; the parent skill's own pre-write validation surface governs.
7. **Phase 6: Approval / Return** — execute the inline §Phase 6 block below (direct-invocation HARD-GATE) or the inline §Sub-routine invocation block (no-write packet return). The HARD-GATE fires here for direct invocation; the parent skill's own HARD-GATE governs `parent_skill_invocation: true`.
8. **Phase 7: Engine Submit + Markdown Writes** — execute the inline §Phase 7 block below for direct invocation only. Storylet YAML records route through the patch engine; SLB manifest and INDEX.md are direct markdown writes; INDEX.md is the LAST write so partial failure leaves the index unmutated.

For governance reference (Validation Rules This Skill Upholds, Record Schemas, FOUNDATIONS Alignment, full Guardrails) — load `references/governance-and-foundations.md` whenever an audit-trail or rule-mapping context is needed.

## Phase 5b: Engine Pre-Validation

For direct user invocation only, after Phases 4-5 produce the surviving SLT records and before the Phase 6 HARD-GATE deliverable summary, run a no-mutation engine-side validation pass against the assembled draft patch plan. Skip entirely when `parent_skill_invocation: true`; the parent skill (bootstrap or page-cycle) owns its own pre-write validation surface, and this skill's no-write sub-routine packet is then the parent's input to its own dry-run.

1. **Assemble the draft envelope**: Before constructing the envelope, call `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` to confirm the deployed per-op payload shape — story-bundle ops use `payload.story_slug` + `payload.record` rather than the world-canon `payload.cf_record` shape documented in `create-base-world/references/engine-envelope-shape.md` §2; the introspection result is the live source-of-truth for envelope construction. Then build the same patch-plan envelope shape Phase 7 will submit — `plan_id`, `target_world`, `originating_skill: "storylet-pool-authoring"`, `verdict: "accept"`, `expected_id_allocations.slt_ids`, and one `create_slt_record` op per surviving SLT. Set `approval_token: "placeholder"` per the placeholder convention (per `branching-story-bootstrap/references/engine-envelope-shape.md` §4 — the envelope-shape validator rejects an empty `approval_token` field, so a placeholder string is required at construction time; the validator does NOT verify the placeholder, only that the field is non-empty).
2. **Call `mcp__worldloom__validate_patch_plan(envelope)`** (envelope ≤50KB) OR `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` (envelope >50KB — same engine code, bypasses MCP transport size constraints, per `branching-story-bootstrap/references/engine-envelope-shape.md` §5). Check envelope size with `wc -c <plan-file>` before validate; storylet-pool-authoring batches with 12+ ops carrying rich `notes` / `fact_effects` / `relationship_effects` typically exceed 50KB. The validator runs without mutating world state.
3. **Coverage**: `yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `record_schema_compliance`, `touched_by_cf_completeness`, `modification_history_retrofit`, `id_allocation_race` for `expected_id_allocations`, Rules 1-7 (`rule1_no_floating_facts`, `rule2_no_pure_cosmetics`, `rule4_no_globalization_by_accident`, `rule5_no_consequence_evasion`, `rule6_no_silent_retcons`, `rule7_mystery_reserve_preservation`), `storylet_predicate_dsl_parsability`, `rule11_action_space`, `rule12_redundancy`. For storylet records, `record_schema_compliance` is the VALENH-002 engine-side backstop for Phase 4 gate 9: it requires the template's load-bearing structural fields, including `mystery_safety`, `provenance`, `visibility`, and 4-6 `choice_templates`. Treat as a defensive pre-submit check, not a complete gate: approval-token verification remains submit-only, and submit keeps the `id_allocation_race` defense-in-depth backstop for the validate-to-submit race window.
4. **Fold the verdict into Phase 6's VALIDATION VERDICTS block**: append a row `Phase 5b engine pre-validation: PASS` (or `FAIL — <validator name>: <error message>`) so the user's HARD-GATE decision is informed by full validator outcome rather than only the operator's mental Phase 4 / Phase 5 gate verdicts. On FAIL, route back to Phase 3 (re-prompt the LLM with the validator's exact error inlined) or Phase 4 (force-reject the candidate that triggered the failure) per the failure mode; do NOT proceed to Phase 6 with a FAIL verdict.

The Phase 5b dry-run mirrors the convention `branching-story-page-cycle/SKILL.md` Phase 11 step 1c documents for runtime page-tick patches; both Category 2c skills now use `validate_patch_plan` as the defensive pre-submit check before the user-facing HARD-GATE / write transaction.

## Phase 6: Approval / Return

For direct user invocation, present the batch manifest deliverable summary to the user:

```
STORYLET BATCH: SLB-NNNN
Story: <story_slug> in <world_slug>
Mode: <seed | focus | audit>          Focus area: <focus_area | n/a>
Source obligations: [OBL-NNNN, ...]      Source threads: [THR-NNNN, ...]
Source audit/RSPs: <SAU-NNNN: RSP-NNNN, RSP-NNNN | n/a>

Total approved: N storylets
Shape distribution:        entry_pressure: A | cast_introduction: B |
                           threat_escalation: C | relational_dynamics: D |
                           routine_disruption: E | aftermath_sequel: F |
                           reflection_dilemma: G | mystery_edge_brush: H |
                           thread_resolution: I | aftermath_residue: J |
                           other: K
Content intensity:         tame: X | mature: Y | explicit: Z
OBL coverage:              <count of currently-open OBLs engaged> / <total open>
Mystery safety:            pass (X storylets touch M; Y declare M_resolution_claims
                                  with apparent/branch_local_counterfactual authority;
                                  0 with canon_candidate authority — author-pool firewall intact)
Visibility breakdown:      global_author_pool: P | branch_prefix_scoped: Q |
                           branch_scoped: R

PER-STORYLET SUMMARY:
- SLT-NNNN: <title> [<shape>, <intensity>] — engages <OBL-X opens, OBL-Y complicates>;
            mystery: <M-N touched | none>; visibility: <scope>
- ...

REJECTED CANDIDATES (info):
- <count> mystery-firewall rejects (forbidden M resolution attempted)
- <count> resolution-authority rejects (canon_candidate on author-pool storylet)
- <count> invariant-compatibility rejects
- <count> consequence-capacity rejects
- <count> dedup rejects
- <count> content-intensity rejects
- <count> predicate-DSL rejects
- <count> branch-contamination rejects
- <count> schema-completeness drops (after 2 revise retries)

VALIDATION VERDICTS:
- Phase 4 per-storylet (9 gates × N storylets): PASS — <one-line rationale>
- Phase 5 diversity (6 axes): PASS or BYPASSED for audit/JIT — <one-line rationale>
- Phase 5 batch-level branch-contamination: PASS — <one-line rationale>
- Phase 5 audit-mode RSP visibility-match: PASS or N/A — <one-line rationale>

TARGET WRITE PATHS:
- worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-NNNN.yaml × N
- worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-NNNN.md
- worlds/<world-slug>/stories/<story-slug>/INDEX.md (edit; storylet-pool section)
```

User options:

- **ACCEPT BATCH** → all surviving storylets enter the pool; proceed to Phase 7.
- **ACCEPT WITH SELECTIONS** → user supplies a comma-separated SLT-id allowlist. Dropped SLTs become permanent allocation gaps and are NEVER reused (append-only ID discipline). Batch manifest records the dropped ids in a `dropped_at_hardgate` field for audit.
- **REVISE — diversity** → user specifies which axis to redirect (e.g., "more relational, less threat"). Phase 5 re-runs with adjusted target-distribution arithmetic.
- **REVISE — focus** → user redirects `focus_area` (e.g., from `threat_escalation` to `aftermath_consequences`). Loops to Phase 1.
- **REJECT** → no writes; halt the batch. Allocated SLB and SLT ids become permanent gaps.

**HARD-GATE fires here**: no file is written until the user explicitly ACCEPTs or ACCEPTs WITH SELECTIONS. Auto Mode does not override. The Phase 4 mystery-firewall hard-rejection of `canon_candidate`-on-author-pool storylets is a separate, structurally-prior refusal — it never reaches this gate.

### Sub-routine invocation

When `parent_skill_invocation: true`, do not present a user-facing HARD-GATE and do not request direct user approval inside this skill. Return an internal validation packet to the caller containing:

- approved SLT records (without writing them)
- consumed `target_slt_ids[]` and unused tail ids, when invoked by bootstrap seed mode
- Phase 4 per-storylet 9-gate verdicts with one-line rationales
- Phase 5 diversity and branch-contamination verdicts
- rejected-candidate counts
- shape/content/OBL/cast coverage summaries

For the bootstrap path, the caller is `branching-story-bootstrap` Phase 6. Bootstrap includes this validation packet in its own Phase 10 deliverable summary and writes the returned SLTs in Phase 11 only after the user approves the complete bootstrap bundle.

For the JIT path, the caller is `branching-story-page-cycle` Phase 4. Page-cycle includes the returned SLT and validation packet in its own Phase 10 deliverable summary when that gate is visible, applies the SLT in Phase 5, rechecks it through Phase 9, and writes it in Phase 11 only if the page tick commits.

## Phase 7: Engine Submit + Markdown Writes

Skip this phase entirely when `parent_skill_invocation: true`; this skill has already returned the approved SLTs to the caller and must perform no writes. For JIT mode, `branching-story-page-cycle` Phase 11 writes the returned `SLT-NNNN.yaml` during the page tick's engine YAML transaction and updates `INDEX.md` as a later sequenced markdown write.

Single transaction for `_source/storylets/*.yaml`, followed by markdown writes. The storylet YAML records route through `mcp__worldloom__submit_patch_plan` with `create_slt_record` ops; `INDEX.md` is the LAST direct markdown write so partial failure leaves the per-bundle index unmutated.

**Submit-path convention** — see [`branching-story-bootstrap/references/engine-envelope-shape.md`](../branching-story-bootstrap/references/engine-envelope-shape.md) for the canonical envelope shape (§1 envelope skeleton, §2 per-op payload shape including the `target_file` directory mapping for `_source/storylets/`, §3 `expected_id_allocations.slt_ids` format), the `approval_token` signing CLI (§4 — `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>`; the user's HARD-GATE acceptance is approval-in-prose, NOT a signed token, so the signed HMAC token must be minted via the CLI before submit), validate / submit path selection by envelope size (§5 — small envelopes (~10-20 ops) typically fit `mcp__worldloom__submit_patch_plan`'s inline path; larger envelopes use the CLI submit path `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` to bypass MCP transport size constraints), and failure-mode response codes (§6). Storylet-pool-authoring batches are typically 10-20 ops; envelope size scales with `notes` / `fact_effects` / `relationship_effects` richness, so a 15-op batch with rich notes can land at 70-80KB even though a 10-op batch with sparse notes lands well under 50KB. Check `wc -c <plan-file>` before submit — envelopes under 50KB use the inline `mcp__worldloom__submit_patch_plan` path; envelopes ≥50KB (commonly batches of 12+ ops with rich notes) use the CLI submit path per `branching-story-bootstrap/references/engine-envelope-shape.md` §5.

1. `mkdir -p worlds/<world-slug>/stories/<story-slug>/storylet-batches/` if not present (the directory is created on first invocation per bundle; subsequent invocations no-op).
2. Assemble and submit one patch-plan envelope with one `create_slt_record` op per approved `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-NNNN.yaml`, in deterministic id-ascending order — per the envelope shape documented at `branching-story-bootstrap/references/engine-envelope-shape.md` §1-§3. Sign the envelope via the §4 CLI to produce the HMAC-bound `approval_token`; submit via `mcp__worldloom__submit_patch_plan(plan, approval_token)` (or the §5 CLI submit path for oversize envelopes, both paths run identical engine code). Each record carries the `dropped_at_hardgate` id-skip pattern when ACCEPT WITH SELECTIONS dropped intermediate ids — Phase 7 honors the gap (no renumbering).
3. `Write` `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-NNNN.md` (template at `templates/storylet-batch-manifest.md`). Manifest records mode, focus area, source obligations/threads, approved-storylets table, diversity summary, rejected-candidates breakdown, dropped-at-hardgate ids, and the validation verdicts inlined from Phase 6.
4. `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` storylet-pool section: update total count, per-shape distribution table, per-content_intensity distribution. The INDEX.md edit is the LAST write — `INDEX.md` is NOT under `_source/`, so direct `Edit` is the correct surface (Hook 3's match pattern doesn't cover it).

Direct `Write` is forbidden for story-bundle `_source/storylets/*.yaml` records. Hook 3 now covers `worlds/<slug>/stories/<slug>/_source/...`; storylet YAML writes must route through `create_slt_record`. `SLB-NNNN.md` and `INDEX.md` remain direct markdown writes because they are not atomic `_source/*.yaml` records.

**Partial-failure recovery**: if patch-engine submission fails, no storylet YAML should land; report the engine error and do not write the SLB manifest or INDEX.md. If a later markdown write fails, report the specific path and leave the accepted YAML records as the authoritative source; re-invocation allocates the next SLB-NNNN beyond the failed-write's gap, and Pre-flight's allocator scan correctly skips gaps. The INDEX.md edit at step 4 is intentionally LAST so a partial batch never appears in the per-bundle index.

Report all written paths. **Do NOT commit to git.** The user reviews the diff and commits.

**Git-tracking convention for storylet-batches/**: `SLB-NNNN.md` manifests are tracked alongside `SLT-NNNN.yaml` records — both are first-class story-bundle source files (audit-trail-bearing artifacts of the authoring history), not derived artifacts like `_index/world.db`. The per-bundle `storylet-batches/` directory is the canonical audit-trail surface for batch-by-batch authoring history; future runs of `storylet-pool-authoring` (and the `branching-story-health-audit`'s SAU reports that reference batch ids) depend on this history being preserved in the version-controlled tree. The world-content `.gitignore` convention that gitignores `worlds/<slug>/_index/` does NOT extend to `storylet-batches/` — the manifests are tracked content, not derived state.

## Guardrails (summary)

The full Guardrails set, the §Validation Rules This Skill Upholds table, the §Record Schemas section, and the §FOUNDATIONS Alignment table all live in `references/governance-and-foundations.md`. The load-bearing rules below are inlined here so the safety contract is visible without recursing into the reference doc:

- **HARD-GATE is absolute for direct invocation** (see HARD-GATE block at top of file for the full PASS-set + Auto Mode + `parent_skill_invocation` no-write sub-routine semantics).
- **Never write world-level canon.** No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted by this skill (per Output §No canon-file mutations; Hook 3 enforces this for `_source/<world-subdir>/*.yaml`).
- **Never promote to world canon by storylet authority.** A storylet's `M_resolution_claims` with `canon_candidate` authority is ONLY legal on `branch_scoped` runtime-JIT storylets (emitted by `branching-story-page-cycle` Phase 4 JIT expansion). This skill produces author-pool batches in `seed` and `focus` modes; Phase 4 gate 2 hard-rejects any author-pool candidate carrying `canon_candidate` authority. The runtime page-cycle's `story-fact-promotion-to-canon` handoff (HARD-GATE preserved, never elided in any execution_mode) is the sole legitimate canon-promotion path.
- **JIT mode is sub-routine only.** `mode=jit` requires `parent_skill_invocation: true` from `branching-story-page-cycle` Phase 4; direct user invocation aborts.
- **Never overwrite an existing storylet.** SLT records are append-only at the file-system level. Dropped-at-HARD-GATE ids become permanent allocation gaps.
- **Storylet YAML writes are engine-routed.** SLT records route through `mcp__worldloom__submit_patch_plan` with `create_slt_record` ops; SLB manifest and `INDEX.md` are direct markdown writes (per Phase 7; Hook 3 blocks direct `Write` to story-bundle `_source/storylets/`).

## Final Rule

A storylet pool is not authored because storylets were generated. It is authored only when the firewall is intact (every M's `forbidden` status respected; no `canon_candidate` authority on author-pool storylets), the mode-appropriate batch checks pass (seed/focus diversity axes, audit RSP visibility-match, and branch-contamination for every direct batch), the open obligations have payoff routes, the active threads have escalation storylets, every predicate parses against the engine-checkable Predicate DSL, the branch-isolation invariant holds (no `global_author_pool` storylet leaks branch-local IDs), and the user has explicitly approved the batch through this skill's direct HARD-GATE or through the parent skill's HARD-GATE when `parent_skill_invocation: true`. A runtime JIT storylet is valid only when the same per-storylet firewall and predicate gates pass, it is branch-scoped to the calling page, and page-cycle commits it through Phase 11 — because the runtime page-cycle's salience scoring is only as good as the pool it scores, and a brittle pool produces a brittle story.
