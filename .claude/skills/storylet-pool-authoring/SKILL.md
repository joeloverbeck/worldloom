---
name: storylet-pool-authoring
description: "Use when authoring or expanding the storylet reservoir of an existing branching story bundle inside an existing worldloom world — `seed` mode (~20 storylets, invoked by branching-story-bootstrap Phase 6 as a no-write sub-routine), `focus` mode (10-15 storylets in a named focus_area), `jit` mode (one runtime branch-scoped storylet invoked by branching-story-page-cycle Phase 4 as a no-write sub-routine), or `audit` mode (consumes RSP cards from branching-story-health-audit's audits/SAU-NNNN/remediation-storylet-proposals/ output). Direct invocation produces: SLT-NNNN.yaml records under worlds/<world-slug>/stories/<story-slug>/_source/storylets/ + an SLB-NNNN.md batch manifest under worlds/<world-slug>/stories/<story-slug>/storylet-batches/ + an updated worlds/<world-slug>/stories/<story-slug>/INDEX.md storylet-pool summary. Mutates: only worlds/<world-slug>/stories/<story-slug>/ on direct invocation (never WORLD_KERNEL.md, ONTOLOGY.md, or any worlds/<world-slug>/_source/<world-subdir>/*.yaml record); world-canon mutation routes through story-fact-promotion-to-canon (HARD-GATE preserved)."
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
    description: "Number of approved storylets to emit. Default: ~20 in seed mode, 10-15 in focus mode."
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
Do NOT write any file under `worlds/<world-slug>/stories/<story-slug>/_source/storylets/`, do NOT create any file under `worlds/<world-slug>/stories/<story-slug>/storylet-batches/`, and do NOT `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` until: (a) Pre-flight resolves `worlds/<world-slug>/stories/<story-slug>/`, validates the parent story bundle exists with a readable `STORY_KERNEL.md`, validates and binds every RSP card named by `source_audit_path` when `mode=audit`, refuses direct `mode=jit` invocation unless `parent_skill_invocation=true` from `branching-story-page-cycle`, allocates the next `SLB-NNNN` and the next available `SLT-NNNN` range via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)` for direct batches, loads the current storylet pool + open OBLs + active THRs + recent page history along the longest active branch_path, loads world canon (whole-class M + INV records and a `task_type='storylet_pool_authoring'` context packet for governing CFs), and confirms the content_policy block (NC-21 verbatim) is loaded for downstream LLM prompt assembly; (b) every surviving candidate SLT in the batch records PASS with a one-line rationale across all nine Phase 4 per-storylet gates (mystery firewall, resolution-authority declaration, invariant compatibility, consequence capacity, dedup, content-intensity coherence, predicate DSL parsability, branch-contamination, schema completeness) AND every direct seed/focus batch records PASS with a one-line rationale across all six Phase 5 diversity-audit checks (shape distribution, tone distribution, content_intensity distribution, OBL-engagement distribution, theme distribution, cast usage) plus the Phase 5 batch-level branch-contamination audit, while every direct audit batch records PASS for Phase 5 batch-level branch-contamination and RSP visibility-match checks; (c) the user has explicitly approved the Phase 6 batch manifest deliverable summary (per-storylet titles + shape + intensity + OBL/THR/RSP engagement + mystery_safety verdict, plus the diversity or audit-mode validation summary, the rejected-candidates count, and the target write paths). The gate is absolute under Auto Mode — invoking the skill is not approval of the deliverable. `parent_skill_invocation: true` is a documented no-write sub-routine path: for bootstrap seed generation and page-cycle JIT generation, this skill may return an internal validation packet and approved SLT records to the caller, but it must not write storylet files, create SLB manifests, or edit indexes; the parent skill's own HARD-GATE/write transaction is then the user-facing approval surface. The Phase 4 mystery-firewall hard-reject of any storylet whose `M_resolution_claims` carry `canon_candidate` authority is a separate, never-elided refusal that fires before the user-facing HARD-GATE — author-pool storylets MAY NOT carry `canon_candidate` authority because they are globally visible across branches and would launder a runtime canon-promotion handoff into authoring time. Runtime JIT storylets MAY carry `canon_candidate` authority only when `visibility.scope: branch_scoped` and `requires_canon_promotion: true`, and the runtime page-cycle's `story-fact-promotion-to-canon` handoff remains the sole legitimate canon-promotion path; this skill never makes that handoff.
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
                                 JIT SLTs in its Phase 11 transaction;
                                 NO git commit)
```

## Inputs

### Required

- `world_slug` — directory slug of an existing world under `worlds/<world-slug>/`.
- `story_slug` — directory slug of an existing story bundle under `worlds/<world-slug>/stories/<story-slug>/`. Pre-flight aborts if missing, except for `parent_skill_invocation: true` bootstrap seed generation where `branching-story-bootstrap` is constructing the bundle in memory.

### Optional

- `mode` — `seed | focus | audit | jit`. Default: inferred from inputs (`source_audit_path` → audit; `focus_area` → focus; otherwise → seed). Audit mode consumes RSP cards from `branching-story-health-audit`. JIT mode is the runtime sub-routine for `branching-story-page-cycle` Phase 4 and requires `parent_skill_invocation: true`.
- `focus_area` — one of {`bootstrap_mix`, `entry_pressure`, `threat_escalation`, `relational_dynamics`, `aftermath_consequences`, `mystery_edge_brushes`, `fork_recovery`, `thread_resolution_options`, `aftermath_residue`, `content_intensity_lift`}. Required when `mode=focus`; ignored when `mode=seed` (uses `bootstrap_mix` implicitly).
- `target_pool_size` — default ~20 in seed mode, 10–15 in focus mode. The seed-mode default is calibrated for fresh story bundles (existing pool size 0 — the `parent_skill_invocation: true` bootstrap sub-routine path). For seed-mode top-up batches against an existing pool of N>0 storylets, prefer `target_pool_size = max(10, ceil(N × 0.5))` when `source_obligations` or `source_threads` are supplied (focused top-up — narrow scope absorbs fewer storylets without re-saturating the pool); prefer `target_pool_size = N` (pool-doubling refresh) when neither is supplied AND the user explicitly intends a broad re-seed against a stale pool. The default ~20 remains the recommendation when neither override condition holds.
- `source_obligations` — comma-separated `OBL-NNNN` ids the new storylets should engage.
- `source_threads` — comma-separated `THR-NNNN` ids.
- `source_audit_path` — path to an `RSP-NNNN-<slug>.md` remediation-storylet-proposal card produced by `branching-story-health-audit` (or its containing `audits/SAU-NNNN/remediation-storylet-proposals/` directory). Required when `mode=audit`; directory input consumes every `RSP-*.md` card in deterministic path order.
- `created_at_page` — `PG-NNNN`. Required when `mode=jit`; ignored otherwise. Used for `provenance.created_at_page` and branch-scoped visibility.
- `caller_state_snapshot` — inline page-cycle `state_snapshot`. Required when `mode=jit` and `parent_skill_invocation=true`; ignored otherwise. Supplies the current branch state and continuation-failure reason for reduced diagnosis and seed generation.
- `tone_override` — free-form tone hint per batch.
- `content_intensity_override` — `tame | mature | explicit`; ±1 band override.
- `parent_skill_invocation` — boolean, default `false`. When `true`, this skill runs as a no-write sub-routine for a parent skill. Documented shapes: `branching-story-bootstrap` Phase 6 uses `mode=seed`, `focus_area=bootstrap_mix`, and bootstrap-supplied in-memory Phases 1-5 context for a story bundle that may not exist on disk yet; `branching-story-page-cycle` Phase 4 uses `mode=jit`, `target_pool_size=1`, `created_at_page=<this_PG_id>`, and `caller_state_snapshot=<this_state_snapshot>`.

## Output

- `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-NNNN.yaml` — one per approved storylet (count = surviving candidates after Phases 4-5, capped by `target_pool_size`). Schema in `templates/storylet-record.yaml`.
- `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-NNNN.md` — batch manifest summarizing the run (mode, focus area, source obligations/threads, approved storylets table, diversity summary, rejected-candidates breakdown). Schema in `templates/storylet-batch-manifest.md`.
- `worlds/<world-slug>/stories/<story-slug>/INDEX.md` — updated in place; storylet-pool section receives new total count + per-shape distribution + per-content_intensity distribution.

When `parent_skill_invocation: true`, no files are written by this skill. The output is an in-memory return packet containing approved SLT records, rejected-candidate counts, Phase 4 validation verdicts, and any applicable Phase 5 diversity summaries. `branching-story-bootstrap` assigns final SLT ids and writes seed records during its Phase 11 transaction. `branching-story-page-cycle` receives one `runtime_jit` SLT and writes it during its Phase 11 page-tick transaction.

### No canon-file mutations

This skill never writes `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. SLT records do not promote to world-canon — promotion is `story-fact-promotion-to-canon`'s job (HARD-GATE preserved).

### ID Allocation

Direct invocation allocates `SLT-NNNN` (per-story append-only, shared with runtime JIT-generated storylets — Phase 4 of `branching-story-page-cycle` may write the next-numbered SLT between batches) and `SLB-NNNN` (per-story append-only batch manifests) via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`.

For `parent_skill_invocation: true` bootstrap seed generation, this skill does not allocate `SLB` and does not reserve the SLT range itself. `branching-story-bootstrap` owns final SLT id assignment because it is constructing a new story bundle and writes the returned storylets inside its Phase 11 transaction.

For `parent_skill_invocation: true` page-cycle JIT generation, this skill does not allocate `SLB`. `branching-story-page-cycle` allocates or reserves the next SLT id as part of its page-tick write set and passes that id in the caller context; the returned SLT must carry `provenance.origin: runtime_jit`, `provenance.created_at_page: <created_at_page>`, and `visibility.scope: branch_scoped`.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation and §Canonical Storage Layer):

- `docs/FOUNDATIONS.md` — read at Pre-flight; the rules that govern Phase 4's mystery firewall (Rule 7), invariant compatibility (Rule 4), consequence-capacity gate (Rule 5), and schema-completeness gate (Rule 1) all live there.
- `worlds/<world-slug>/WORLD_KERNEL.md` — primary-authored; read directly per FOUNDATIONS §Canonical Storage Layer §Authored-primary surfaces. Provides genre/tonal/chronotope contract that grounds Phase 3 LLM prompt assembly.
- `worlds/<world-slug>/ONTOLOGY.md` — primary-authored; read directly. Categories + Relation Types ground Phase 2 seed generation's "core dramatic transaction" framing and Phase 3 fact-effect / relationship-effect vocabulary.
- `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` — direct Read (story-bundle root, not under Hook 3's `worlds/<slug>/_source/` match pattern). Provides `designing_principle`, `content_intensity_baseline`, `mysteries_in_play[]`, `invariants_acknowledged[]`, cast bind list, and active threads — all load-bearing for Phases 1, 2, 3, and 4.
- `worlds/<world-slug>/stories/<story-slug>/_source/obligations/OBL-*.yaml` — direct Read filtered to `status: open`. Drives Phase 1 coverage diagnosis (which OBLs lack a payoff route?) and Phase 5 OBL-engagement diversity check.
- `worlds/<world-slug>/stories/<story-slug>/_source/threads/THR-*.yaml` — direct Read filtered to `status` ∈ {`active`, `pressured`, `critical`, `dormant`}. Drives Phase 1 (which threads lack escalation storylets?) and Phase 2 seed-target selection.
- Recent page history — last ~10 `worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-NNNN.md` files **along the longest active branch_path only**, never sibling branches. Used as repetition-avoidance signal in Phase 1 / Phase 2. Cross-branch reads at authoring time would corrupt the recursive branch-isolation invariant that `branching-story-page-cycle` Phase 9 enforces.
- **Premise-and-state-bounded world-canon retrieval** via `mcp__worldloom__get_context_packet(world_slug, task_type='storylet_pool_authoring', seed_nodes=[...], token_budget=18000)`. Seed nodes are resolved from `STORY_KERNEL.cast_bind_list` (each STENT's `world_ent_id`) + recent-history-named entities + the active period via `mcp__worldloom__find_named_entities(names)` BEFORE the packet call. The packet prioritizes premise-relevant CFs, governing invariants, mystery-edge M records, and ontology-grounding context.
  - **Packet-too-large fallback**: if the packet returns `delivery_status='persisted_with_summary'` OR `packet_incomplete_required_classes` OR non-empty `truncation_summary.dropped_layers`, reduce `seed_nodes` and retry; use `governing_summary` inline; `get_records(record_ids=[...])` for known-id sets; `get_persisted_packet_slice` for structured persisted-packet recovery.
- **Whole-class Mystery Reserve firewall load** via `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` — every M record body is needed at Phase 4 to (a) hard-reject any seed whose `M_resolution_claims` resolves a `forbidden`-status M, and (b) validate every `M_resolution_claims[].resolution_safety_per_M[m_id]` against the M's actual `future_resolution_safety` field. Whole-class enumeration is authorized for skills "whose firewall is class-bounded" per FOUNDATIONS §Tooling Recommendation.
- **Whole-class Invariant audit load** via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` — every INV record body is needed at Phase 4 to audit each candidate SLT's `fact_effects` and `relationship_effects` against every INV's `break_conditions`.

### Mandatory Current Storylet Pool — always loaded at Pre-flight

A conceptual aggregate assembled by reading `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-*.yaml` filtered by the storylet's `visibility` block, scoped to what the new batch must see for dedup and coverage diagnosis:

- All SLT records with `visibility.scope: global_author_pool` (always loaded — they apply to every branch).
- All SLT records with `visibility.scope: branch_prefix_scoped` whose `visibility.visible_branch_path_prefix` is a prefix of the **longest active branch_path** (the same scoping rule the runtime page-cycle uses for selection).
- All SLT records with `visibility.scope: branch_scoped` whose `provenance.created_at_page` is in the **longest active branch_path**.

Sibling-branch SLT records are NOT loaded — cross-branch dedup would homogenize divergent branches at authoring time and silently corrupt branch isolation. The aggregate drives Phase 1 coverage diagnosis (over- and under-represented shapes), Phase 4 dedup (`hard_preconds + tone_tags + theme_tags + shape` similarity threshold), and Phase 5 diversity audit (current pool composition feeds the target-distribution arithmetic).

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first. If `worlds/<world-slug>/stories/<story-slug>/` is missing, abort and instruct the user to run `branching-story-bootstrap` first, except for the documented `parent_skill_invocation: true` + `mode=seed` + `focus_area=bootstrap_mix` path where bootstrap is currently constructing that bundle in memory. If `mode=audit`, require `source_audit_path` and validate every resolved RSP card before Phase 1. If `mode=jit` without `parent_skill_invocation: true` and a page-cycle caller context, abort with "jit mode is available only as a branching-story-page-cycle Phase 4 sub-routine."

Direct `Read` of `worlds/<world-slug>/_source/<world-subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read world canon. Direct `Read` of `worlds/<world-slug>/stories/<story-slug>/_source/<story-subdir>/` is the correct surface (Hook 2's match pattern is `worlds/<slug>/_source/...` which does NOT match the nested story bundle).

## Pre-flight Check

Run before Phase 1; abort if any precondition fails.

- Load `docs/FOUNDATIONS.md` into working context.
- Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`); resolve `worlds/<world-slug>/`. Abort if missing — instruct the user to run `create-base-world` first.
- Validate `story_slug` is kebab-case (`[a-z0-9-]+`); resolve `worlds/<world-slug>/stories/<story-slug>/`. Abort if missing — instruct the user to run `branching-story-bootstrap` first, except when `parent_skill_invocation: true`, `mode=seed`, and `focus_area=bootstrap_mix` are all present.
- Resolve `mode`: explicit input override → inferred (`source_audit_path` → audit; `focus_area` → focus; otherwise → seed).
- If `mode=audit`: require `source_audit_path`. Resolve it relative to the repo root unless absolute. It MUST be either:
  - a single `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md` file, or
  - the containing `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/` directory, in which case consume every `RSP-*.md` card in deterministic path order.
- If `mode=audit` and `source_audit_path` is missing, nonexistent, outside the selected story bundle's `audits/SAU-NNNN/remediation-storylet-proposals/` tree, not an RSP file/directory, or resolves to zero RSP cards, abort with the specific path reason. Do not allocate `SLB` or `SLT` ids on those failures.
- For each resolved RSP card, parse YAML frontmatter and validate the consumer schema mirrored by `branching-story-health-audit/templates/remediation-storylet-proposal-card.md`: `rsp_id`, `audit_id`, `story_id`, non-empty `finding_ids`, at least one non-null targeting field among `target_obligation | target_thread | target_consequence | target_relationship`, `proposed_shape`, `proposed_intensity`, `target_branch`, `proposed_visibility.scope`, `proposed_visibility.visible_branch_path_prefix`, `sketch.hard_preconds`, `sketch.fact_effects`, `sketch.pays_off_obligations`, `sketch.opens_obligations`, `sketch.addresses_consequences`, `sketch.choice_templates`, and `rationale`. Abort if any card is malformed.
- Bind the validated RSP card context into the run as `audit_cards[]`. Phase 1 reads targeting fields, Phase 2 reads `sketch` and `rationale`, Phase 3 reads `proposed_visibility` and provenance ids, and Phase 5 checks RSP visibility-match.
- If `mode=jit`: require `parent_skill_invocation: true`, `target_pool_size=1`, `created_at_page=PG-NNNN`, and `caller_state_snapshot`. The caller must be `branching-story-page-cycle` Phase 4 and must supply the page-tick context: the allocated/next SLT id, the current branch's state snapshot, open OBLs, pending CNSQs, active THRs, cast_present, recent branch prose context, whole-class M/INV loads, and loaded content_policy. This path is no-write and returns exactly one approved SLT plus validation verdicts to the parent; it does not create an SLB manifest or edit INDEX.md.
- If `mode=focus` and `focus_area` is absent: abort and instruct the user to supply a `focus_area` from the documented enum.
- If `parent_skill_invocation: true` and `mode=seed`: require `focus_area=bootstrap_mix`. The parent must provide bootstrap Phases 1-5 in-memory context: normalized premise/designing principle, bound STENT/STINT records, imported SFs, initial THRs/OBLs, whole-class M/INV loads, and loaded content_policy. This path is no-write and returns approved SLTs to the parent; it does not create an SLB manifest or edit INDEX.md.
- If `parent_skill_invocation: true` with any mode other than `seed` or `jit`, abort; no other sub-routine shapes are documented.
- For direct invocation only, allocate `SLB-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, id_class='SLB', story_slug=<story_slug>)`.
- For direct invocation only, reserve next `SLT-NNNN` range via `mcp__worldloom__allocate_next_id(world_slug, id_class='SLT', story_slug=<story_slug>)` — this is the starting point; subsequent allocations within the run advance from this base sequentially as candidates pass Phase 4. The runtime page-cycle's JIT-generated SLT records share this namespace, so a re-scan at Phase 7 confirms no collision before write.
- Read `worlds/<world-slug>/WORLD_KERNEL.md`, `worlds/<world-slug>/ONTOLOGY.md`, and `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` directly.
- Determine the **longest active branch_path** by scanning `_source/pages/PG-*.yaml` for the longest `branch_path` array among pages whose `branch_terminal: false`. Ties broken by most-recent `created_at`.
- Assemble the Mandatory Current Storylet Pool aggregate (per §World-State Prerequisites scoping rule).
- Direct Read of all `_source/obligations/OBL-*.yaml` filtered to `status: open`.
- Direct Read of all `_source/threads/THR-*.yaml` filtered to `status` ∈ {`active`, `pressured`, `critical`, `dormant`}.
- Direct Read of last ~10 `pages-prose/PG-NNNN.md` files along the longest active branch_path (in branch_path order; most-recent last).
- Resolve premise-relevant entities to `entity:<slug>` ids via `mcp__worldloom__find_named_entities(names)` BEFORE the context-packet call. Names sourced from `STORY_KERNEL.cast_bind_list` (each STENT's `world_ent_id`), recent page-history entity mentions, and the active story period.
- Load premise-bounded world-canon retrieval via `mcp__worldloom__get_context_packet(world_slug, task_type='storylet_pool_authoring', seed_nodes=[<resolved ids>], token_budget=18000)`. Apply the packet-too-large fallback per §World-State Prerequisites if the response signals overflow.
- Load whole-class Mystery Reserve firewall: `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)`.
- Load whole-class Invariant audit: `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)`.
- Confirm content_policy block (NC-21 verbatim text from `templates/content-policy.txt`) is loaded for downstream prompt assembly. Without it, Phase 3 cannot legitimately render storylet content. This is the FIRST condition of the HARD-GATE.

For `parent_skill_invocation: true`, skip direct-invocation-only file-system steps that the parent already owns.

- Bootstrap seed sub-routine: skip SLB allocation, current-pool load, longest-branch page-history load, and `STORY_KERNEL.md` read. Use the parent-supplied bootstrap context instead. Bootstrap owns SLT id assignment because this is a new story bundle; SLT records returned by this sub-routine must carry `provenance.origin: bootstrap_seed`, `provenance.created_at_page: null`, and `visibility.scope: global_author_pool`.
- Page-cycle JIT sub-routine: skip SLB allocation and batch-manifest setup, but use the parent-supplied page-cycle context for current pool, branch-local state, recent branch prose, whole-class M/INV loads, and content_policy. Page-cycle owns the Phase 11 write transaction; the returned SLT must carry `provenance.origin: runtime_jit`, `provenance.created_at_page: <created_at_page>`, and `visibility.scope: branch_scoped`.

## Phase 1: Coverage Diagnosis

Scan the current pool and the open-state for thinness. Emit a structured diagnosis matrix that drives Phase 2 seed generation.

For `parent_skill_invocation: true` from `branching-story-bootstrap`, the "current pool" is empty because the story bundle is not on disk yet. Diagnose against the parent-supplied bootstrap state instead: initial THRs/OBLs, cast-bound STENT/STINT records, imported SFs, premise tone/themes, `mysteries_in_play[]`, and the loaded whole-class M/INV context. The bootstrap-mix weighting in Phase 2 supplies the shape-distribution target.

For `mode=audit`, the validated RSP card frontmatter IS the primary diagnosis. Emit one diagnosis-matrix row per RSP card:

```yaml
gap_kind: <obl_payoff_coverage | thr_coverage | cnsq_coverage | srel_continuity>
target_record_id: <RSP.target_obligation | RSP.target_thread | RSP.target_consequence | RSP.target_relationship>
priority_weight: max
source_rsp: <RSP.rsp_id>
source_audit: <RSP.audit_id>
finding_ids: <RSP.finding_ids>
```

Derive `gap_kind` from the first non-null target field in this priority order: `target_obligation` -> `obl_payoff_coverage`, `target_thread` -> `thr_coverage`, `target_consequence` -> `cnsq_coverage`, `target_relationship` -> `srel_continuity`. If multiple target fields are non-null, keep them all in the row as secondary targets, but use the first target for `target_record_id` and the row's primary `gap_kind`.

For `parent_skill_invocation: true` from `branching-story-page-cycle` with `mode=jit`, diagnosis is reduced to the single continuation failure that triggered JIT. Emit one row:

```yaml
gap_kind: continuation_failure
target_record_id: <caller_state_snapshot.current_storylet_eligibility_failure_reason.record_id | null>
priority_weight: max
```

Use `caller_state_snapshot.current_storylet_eligibility_failure_reason` when present; otherwise derive the row from page-cycle's Phase 3 consequence-capacity result and the failed Phase 4 eligibility/scoring context. Do not run a full pool-health scan or longest-branch recent-history scan inside this sub-routine; page-cycle has already assembled the relevant branch-local state.

**Diagnose**:

- **OBL coverage gaps**: which open OBLs have NO compatible storylet (no SLT in the current pool whose `pays_off_obligations`, `complicates_obligations`, or `transfers_obligations` matches the OBL by `type` + `subjects` + `constraints`)? Each uncovered OBL becomes a Phase 2 seed target.
- **THR escalation gaps**: which active THRs (status ∈ {`active`, `pressured`, `critical`}) have NO escalation storylet (no SLT whose `fact_effects` or `relationship_effects` raise this thread's `current_pressure`)? Each uncovered THR becomes a seed target.
- **Content_intensity gaps**: which `content_intensity` bands are under-represented relative to the story's `content_intensity_baseline`? Targets per baseline: `tame` baseline → 60% tame / 30% mature / 10% explicit; `mature` baseline → 30% / 50% / 20%; `explicit` baseline → 20% / 30% / 50%. `content_intensity_override`, when supplied, shifts the target distribution ±1 band.
- **Shape distribution**: which shapes are over-represented (>40% of pool)? Under-represented (<5%)? Over-represented shapes are deprioritized in Phase 2; under-represented shapes are prioritized.
- **Mystery-edge gaps**: which `mysteries_in_play[]` entries declared in `STORY_KERNEL.md` have NO storylet whose `mystery_safety.M_touched` or `M_progressed` cites them? Each gap is a candidate seed (subject to mystery firewall — `forbidden`-status M entries are NEVER seeded for resolution).
- **Recent-history repetition signal**: scan the last ~10 pages along the longest active branch_path; if any `shape` was used in 3 consecutive pages, mark it for Phase 2 deprioritization (avoid pool homogenization at the recently-active branch tip).

**Output**: a diagnosis matrix with rows {gap_kind, target_record_id, priority_weight, source_rsp?, source_audit?, finding_ids?} feeding Phase 2 seed selection.

## Phase 2: Generation Seeds

Produce N seeds where N = `target_pool_size + ceil(target_pool_size * 0.30)` for seed/focus batches (the +30% buffer absorbs Phase 4 rejections). JIT and audit mode use their mode-specific seed sizing below.

Each seed names:

- **target OBL or THR engaged** (drawn from Phase 1's diagnosis matrix; `source_obligations`/`source_threads`, when supplied, override Phase 1 priority — those OBLs/THRs become mandatory targets).
- **shape** — one of the SLT shape enum (entry_pressure / cast_introduction / threat_escalation / relational_dynamics / routine_disruption / aftermath_sequel / reflection_dilemma / mystery_edge_brush / fork_recovery / thread_resolution / aftermath_residue / intimacy / confrontation / other), biased toward Phase 1's under-represented shapes.
- **tone register** — drawn from `STORY_KERNEL.tone_constraints` + Phase 1's tone-distribution gaps; `tone_override`, when supplied, biases the batch by ±1 register.
- **content_intensity band** — drawn from Phase 1's content_intensity gap analysis.
- **state preconditions** — implied predicates that must hold for the storylet to be eligible (Phase 3 will formalize them into the Predicate DSL).
- **core dramatic transaction** — what changes between the entry-state and exit-state of a page that realizes this storylet (one sentence).

Seeds are proposals, not yet structured records. They live only in the in-memory batch context until Phase 3 turns each into an SLT record.

**Bootstrap-mix shape weighting** (when `mode=seed` or `focus_area=bootstrap_mix`): apply the weighting from the proposal's bootstrap mix table — entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3.

**Precedence when both source-OBL/THR targeting and bootstrap-mix shape weighting apply** (typical seed-mode top-up shape — user supplied `source_obligations` or `source_threads` AND `mode=seed` triggers bootstrap-mix weighting). Mandatory targeting takes precedence: every seed must engage at least one of the supplied source ids via `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `opens_obligations`, or (for source_threads) `fact_effects` / `relationship_effects` that raise the thread's `current_pressure`. Bootstrap-mix shape proportions become advisory rather than required — if mandatory targeting forces a shape skew (e.g., source-OBL targeting a `secret`-type OBL pulls toward `relational_dynamics` / `intimacy` / `confrontation` shapes and away from `entry_pressure` / `cast_introduction`), Phase 5 §Shape distribution checks the batch alone (≤40% per shape) rather than the bootstrap-mix targets. The bootstrap-mix proportions remain authoritative ONLY for fresh-bundle seed mode (the `parent_skill_invocation: true` bootstrap sub-routine path) where no source-OBL/THR targeting is supplied.

**Focus-mode shape weighting** (when `mode=focus` and `focus_area` is a non-bootstrap_mix value): all seeds match the requested `focus_area`'s implied shape, with a 20% off-shape allowance for diversity (e.g., `focus_area=threat_escalation` → ~80% threat_escalation seeds + ~20% adjacent shapes per Phase 1's gap analysis).

**JIT-mode single seed** (when `mode=jit` and `parent_skill_invocation: true`): produce exactly ONE seed sized to the caller's continuation-failure context. `target_pool_size` must be 1. Shape distribution and +30% replacement buffering are bypassed because this is not a batch; the seed should address the failed eligibility / pending-consequence / required-aftermath condition that made page-cycle Phase 3 pass only by JIT-generatable continuation.

**Audit-mode RSP seeds** (when `mode=audit`): default `target_pool_size` to the number of validated RSP cards (one seed per card). If the user supplies a larger `target_pool_size`, distribute extra seeds across the RSP cards in deterministic card order so wide gaps can receive multiple variants without merging unrelated RSPs into one storylet. Each seed carries:

- `source_rsp` and `source_audit` from the RSP card.
- `shape` from `RSP.proposed_shape`.
- `content_intensity` from `RSP.proposed_intensity`, still constrained by Phase 4 gate 6 against the story baseline.
- target fields copied from the RSP card's non-null `target_obligation`, `target_thread`, `target_consequence`, and `target_relationship`.
- state preconditions seeded from `RSP.sketch.hard_preconds`; Phase 3 may elaborate but must preserve the RSP's intended conditions.
- fact/obligation/consequence/choice scaffolds seeded from `RSP.sketch.fact_effects`, `pays_off_obligations`, `opens_obligations`, `addresses_consequences`, and `choice_templates`.
- core dramatic transaction synthesized from `RSP.rationale` plus the `sketch` block, grounded in `STORY_KERNEL.tone_constraints`.

## Phase 3: Structured Drafting

For each seed, generate the full SLT record per the schema in `templates/storylet-record.yaml`. The LLM proposes the structured content; the engine wraps the LLM output with the schema scaffolding, validates field types, and records `choice_templates` verbatim as runtime scaffolds.

**LLM Prompt Assembly** (the order matters; content_policy is FIRST so it binds the model before any other instruction):

```
[content_policy block — verbatim from templates/content-policy.txt, NC-21]

[story kernel — designing_principle + tone_constraints + content_intensity_baseline
                + invariants_acknowledged + mysteries_in_play (with each M's status
                + future_resolution_safety from the whole-class M load)]

[seed brief — shape, tone, content_intensity, target OBL/THR/CNSQ/SREL id + body,
              source RSP/audit ids when mode=audit, core dramatic transaction]

[state context — currently open OBLs (id + type + salience + urgency + payoff_modes),
                 active THRs (id + type + status + current_pressure), cast bind list
                 (each STENT's role + intention summary)]

[predicate DSL grammar — verbatim from templates/predicate-dsl.md so the LLM
                          generates parsable preconds, not free-form prose]

[tone/theme tag dictionary — verbatim from templates/tone-theme-tag-dictionary.md
                              as recommended-but-non-binding vocabulary so tone_tags
                              and theme_tags converge across the pool's lifetime
                              rather than fragmenting per-batch]

INSTRUCTION:
Produce a structured storylet record matching the SLT schema. Define hard_preconds
and soft_preconds as predicates from the supplied DSL — free-form prose predicates
will be hard-rejected at Phase 4. Define fact_effects and relationship_effects as
structured ops (op + template + epistemic_class). Provide 4-6 choice_templates that
the runtime LLM proposer can use as anchors — each carries operation + target_role
+ likely_effects + choice_mode + poetic_effect.

Mystery safety: do NOT touch any forbidden-status M-NNNN. If you brush a low /
medium / high M without resolving it, declare it in mystery_safety.M_touched (or
M_progressed if a clue or partial reveal advances it). If your effects propose to
RESOLVE any M, declare an M_resolution_claims entry naming the M, the
resolution_authority (apparent | branch_local_counterfactual | canon_candidate),
and claim_strength. Author-pool storylets MAY NOT use canon_candidate authority
— that route is reserved for runtime page-cycle's story-fact-promotion-to-canon
handoff. Use apparent or branch_local_counterfactual to let branches explore
mystery resolutions without canonizing them.

Content intensity: <band>. Match the band consistently — do not write a tame
storylet whose hidden effects only land at explicit content.

Visibility: <global_author_pool | branch_prefix_scoped | branch_scoped> per the
mode-and-source-driven rule below.
```

**Visibility scope assignment** (per the proposal's Visibility Scope Semantics):

- `mode=seed` or `mode=focus`: `visibility.scope: global_author_pool`, `provenance.created_at_page: null` — these batches are author-pool storylets visible across every branch.
- `mode=jit`: `visibility.scope: branch_scoped`, `provenance.created_at_page: <created_at_page>`, `provenance.origin: runtime_jit` — runtime JIT storylets are visible only on the branch containing the calling page and are never added to the global author pool.
- `mode=audit`: visibility inherits from the source RSP card's `proposed_visibility` block. `global_author_pool` requires `visible_branch_path_prefix: null` and `provenance.created_at_page: null`. `branch_prefix_scoped` requires a non-empty `visible_branch_path_prefix` copied from the RSP card and `provenance.created_at_page: null`. `branch_scoped` requires a non-empty `visible_branch_path_prefix`; set `provenance.created_at_page` to the leaf `PG-NNNN` in that prefix unless the RSP card names a more specific leaf page in `target_branch`. The older `target_branch` string is advisory prose; `proposed_visibility.scope` is the structural authority.
- `provenance.origin`: `bootstrap_seed` when invoked by `branching-story-bootstrap` Phase 6 (detected by `mode=seed` + `focus_area=bootstrap_mix`); `runtime_jit` when invoked by `branching-story-page-cycle` Phase 4 with `mode=jit`; `focus_authoring` for user-driven `mode=focus`; `audit_remediation` for `mode=audit`.
- For `mode=audit`, every generated SLT also carries `provenance.source_audit: <RSP.audit_id>` and `provenance.source_rsp: <RSP.rsp_id>`. Non-audit modes keep both fields null.

**Engine wraps the LLM output**:

- Validates schema against `templates/storylet-record.yaml`: every required field present, types correct, `id` matches the next reserved SLT in the run's allocation range.
- Validates predicate syntax against the Predicate DSL (in `templates/predicate-dsl.md`); free-form prose predicates fail here and route back to LLM with the DSL grammar inlined as the failure message.
- Generates the `obligation_template` / `fact_template` / `cast_role` machinery from the LLM's structured proposal, normalizing role-vs-STENT references.
- Records the LLM's `choice_templates` verbatim — they are runtime-overridable scaffolds, not prescriptions.

**Failure handling**: if the LLM produces malformed output (non-YAML, missing required fields, wrong types), engine re-prompts with the specific failure inlined. Up to 2 retries per seed before the seed is dropped from the batch and replaced with a fresh seed drawn from Phase 1's next-priority gap.

## Phase 4: Per-Storylet Validation Gates (Canon Safety Check phase, per-storylet)

Each candidate SLT runs all **9** gates. A failed gate either HARD-REJECTs the candidate (replaced with a fresh seed from Phase 1's next-priority gap) or routes to revise (LLM re-prompted with the failure inlined; up to 2 retries per gate).

For `mode=jit`, run this structural precondition before gate 1: `visibility.scope` MUST be `branch_scoped`, `provenance.origin` MUST be `runtime_jit`, and `provenance.created_at_page` MUST equal the supplied `created_at_page`. Failure is a structural HARD-REJECT and re-prompt, not a new 10th gate. Gate 8 remains the general branch-contamination enforcement surface.

| # | Gate | Check | On fail |
|---|---|---|---|
| 1 | Mystery firewall (Rule 7) | `mystery_safety.forbidden_M_resolved == false` AND no entry in `M_resolution_claims` whose `resolution_safety_per_M[m_id] == forbidden` per the whole-class M load | HARD-REJECT |
| 2 | Resolution-authority declaration (Rule 7) | For every `M_resolution_claims` entry: if `resolution_authority == canon_candidate` then `requires_canon_promotion == true` AND visibility scope MUST be `branch_scoped` (NEVER `global_author_pool`); if `apparent` or `branch_local_counterfactual` then `requires_canon_promotion == false` AND `resolution_safety_per_M[m_id] ∈ {low, medium, high}` matching the M record's actual `future_resolution_safety` | HARD-REJECT |
| 3 | Invariant compatibility (Rule 4) | Every entry in `fact_effects` and `relationship_effects` respects every INV record's `break_conditions` from the whole-class INV load | HARD-REJECT |
| 4 | Consequence capacity (Rule 5) | Applying the storylet's exit state to the bundle's current state leaves at least one continuation storylet eligible (in the current pool OR JIT-generatable per a brief LLM probe). Verified by a deterministic eligibility check over the post-application state-snapshot shape | HARD-REJECT or revise |
| 5 | Dedup | Candidate is not a near-duplicate of an existing pool entry. Similarity threshold: ≥80% overlap across the union of `hard_preconds` predicate-form set + `tone_tags` + `theme_tags` + `shape` + cast_required STENT ids | reject; replace with under-represented seed from Phase 1's gap matrix |
| 6 | Content-intensity coherence | Storylet's `content_intensity` is within the story's allowed range — `STORY_KERNEL.content_intensity_baseline` ± 1 band, further constrained by `content_intensity_override` when supplied. A `tame`-tagged storylet whose `fact_effects` describe explicit-band content fails here | HARD-REJECT or downgrade content_intensity |
| 7 | Predicate DSL parsability (Rule 1) | Every predicate in `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions parses against the Predicate DSL grammar in `templates/predicate-dsl.md` (core forms + documented extensions; closed predicate forms/operators/enums plus documented open typed values) | HARD-REJECT (re-prompt LLM with grammar inlined) |
| 8 | Branch-contamination (Rule 4 at story scope) | If `visibility.scope == global_author_pool`, the storylet may NOT directly reference any story-local record id (`SF-NNNN`, `OBL-NNNN`, `STENT-NNNN`, `STOBJ-NNNN`, `STLOC-NNNN`, `SREL-NNNN`) whose `created_at_page` is non-null. Global storylets may use abstract role-matchers (`role:protagonist`), world/root facts, and STENT ids declared at bootstrap (i.e., `created_at_page == PG-0001` is permitted; later pages are not) | HARD-REJECT (force `visibility.scope: branch_prefix_scoped` or revise to abstract matchers) |
| 9 | Schema completeness (Rule 1) | All mandatory fields per `templates/storylet-record.yaml` are present, including the `mystery_safety`, `provenance`, and `visibility` blocks | revise (re-prompt LLM with explicit constraint) |

**HARD-REJECT vs revise**:

- **HARD-REJECT** → candidate does not enter pool; replaced with a fresh seed drawn from Phase 1's next-priority gap. Replacement seeds re-enter Phase 3.
- **revise** → LLM re-prompted with the failed gate's reason inlined; up to 2 retries per gate. After 2 failed retries on the same gate, the candidate is HARD-REJECTed.

**Whole-class loads from Pre-flight power gates 1, 2, and 3**: M-record full bodies for the `forbidden`-status check (gate 1) and the `resolution_safety_per_M[m_id]` cross-check against each M's `future_resolution_safety` (gate 2); INV-record full bodies for the `break_conditions` audit (gate 3). Without those whole-class loads, Phase 4 cannot honor its canon-safety contract.

## Phase 5: Diversity Audit (Canon Safety Check phase, batch-level)

Across the surviving SLT records in this batch, verify the batch-level checks that apply to its mode. **Seed/focus batches require six diversity-axis checks plus one batch-level branch-contamination audit before Phase 6. Audit batches bypass the six diversity axes but still require batch-level branch-contamination and RSP visibility-match PASS.**

For `mode=jit`, bypass Phase 5 diversity audit. A single runtime storylet has no meaningful batch diversity surface; Phase 4 gate 8 already covers the only branch-contamination check meaningful for one branch-scoped record. Record the bypass in the internal validation packet as `Phase 5: BYPASSED — single-storylet runtime JIT sub-routine`.

For `mode=audit`, bypass the six diversity-axis checks because the batch is target-shaped by RSP cards and often has one storylet per audit finding. Still run the batch-level branch-contamination audit and the audit-mode RSP visibility-match check below. Record the bypass as `Phase 5 diversity axes: BYPASSED — audit remediation batch shaped by RSP cards`.

### Diversity-axis checks

- **Shape distribution**: no single `shape` exceeds 40% of the batch (seed mode allows `entry_pressure + cast_introduction` combined up to 50% per the bootstrap-mix loading concentration).
- **Tone distribution**: no single dominant tone tag exceeds 40%.
- **Content_intensity distribution**: matches the per-band gap targets emitted by Phase 1 §Content_intensity gaps (NOT the abstract baseline distribution). A batch may legitimately be 0% in a band the existing pool already over-represents and heavily-biased toward a band the existing pool under-represents, provided the batch + existing-pool combined distribution converges toward the abstract baseline target (20/30/50 for `explicit` baseline, 30/50/20 for `mature` baseline, 60/30/10 for `tame` baseline; ±1 band per `content_intensity_override`). The baseline distribution is the convergence target across the pool's full lifetime; this batch's standalone distribution can deviate sharply from that target when Phase 1 diagnoses an over-representation in the existing pool that needs to be counter-biased.
- **OBL-engagement distribution**: in seed mode, batch must engage ≥60% of currently-open OBLs across `pays_off_obligations + complicates_obligations + transfers_obligations + opens_obligations`. In focus mode, batch MUST hit every `source_obligations` id at least once.
- **Theme distribution**: no single theme tag exceeds 50%.
- **Cast usage**: no STENT whose `STORY_KERNEL.cast_bind_list` `role_in_story` is `protagonist`, `major`, or `antagonist` is engaged by zero storylets in the batch (engagement = appearance in `cast_required` or `cast_optional`). The `role_in_story` enum is defined by `branching-story-bootstrap` Phase 2 STENT binding as `protagonist | major | supporting | antagonist | foil`; the three load-bearing roles (`protagonist | major | antagonist`) are subject to this rule, while `supporting | foil` STENTs are exempt — supporting and foil cast can be engaged by zero storylets in a given batch without failing the diversity audit, because the pool's lifetime composition (across multiple batches) handles their coverage rather than any single batch.

### Batch-level branch-contamination audit

Beyond per-storylet branch-contamination (Phase 4 gate 8), the batch as a whole is audited:

- For every storylet with `visibility.scope: global_author_pool`: confirm that none of its `hard_preconds`, `soft_preconds`, `fact_templates`, `obligation_matchers`, `relationship_effects`, or `location_requirements` name a record id whose `created_at_page` is non-null.
- For every storylet with `visibility.scope: branch_prefix_scoped`: confirm `visibility.visible_branch_path_prefix` is a real prefix of at least one current branch's `branch_path`.
- For audit-mode batches: confirm every storylet's `visibility` block matches its source RSP card's `proposed_visibility` block — no audit-mode storylet silently defaults to `global_author_pool` when the RSP requested branch-local scope.

### Audit-mode RSP visibility-match check

For every `mode=audit` storylet:

- `provenance.origin` is `audit_remediation`.
- `provenance.source_audit` equals the source card's `audit_id`.
- `provenance.source_rsp` equals the source card's `rsp_id`.
- `visibility.scope` equals `RSP.proposed_visibility.scope`.
- `visibility.visible_branch_path_prefix` equals `RSP.proposed_visibility.visible_branch_path_prefix` whenever the RSP scope is `branch_prefix_scoped` or `branch_scoped`.
- `provenance.created_at_page` is null for `global_author_pool` and `branch_prefix_scoped`; for `branch_scoped`, it is the leaf page from the RSP-visible branch prefix or the specific leaf named in `target_branch`.

### On diversity failure

- Replace overrepresented entries with under-represented shape/tone/intensity seeds drawn from Phase 1's gap matrix.
- Re-run Phase 3 + Phase 4 on the replacement seeds.
- Up to 2 diversity-correction iterations before escalating to the user with the failed axes inlined.

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
- Phase 4 per-storylet 9-gate verdicts with one-line rationales
- Phase 5 diversity and branch-contamination verdicts
- rejected-candidate counts
- shape/content/OBL/cast coverage summaries

For the bootstrap path, the caller is `branching-story-bootstrap` Phase 6. Bootstrap includes this validation packet in its own Phase 10 deliverable summary and writes the returned SLTs in Phase 11 only after the user approves the complete bootstrap bundle.

For the JIT path, the caller is `branching-story-page-cycle` Phase 4. Page-cycle includes the returned SLT and validation packet in its own Phase 10 deliverable summary when that gate is visible, applies the SLT in Phase 5, rechecks it through Phase 9, and writes it in Phase 11 only if the page tick commits.

## Phase 7: Engine Submit + Markdown Writes

Skip this phase entirely when `parent_skill_invocation: true`; this skill has already returned the approved SLTs to the caller and must perform no writes. For JIT mode, `branching-story-page-cycle` Phase 11 writes the returned `SLT-NNNN.yaml` and updates `INDEX.md` inside the page tick's single transaction.

Single transaction for `_source/storylets/*.yaml`, followed by markdown writes. The storylet YAML records route through `mcp__worldloom__submit_patch_plan` with `create_slt_record` ops and the approval token from the HARD-GATE. `INDEX.md` is the LAST direct markdown write so partial failure leaves the per-bundle index unmutated:

1. `mkdir -p worlds/<world-slug>/stories/<story-slug>/storylet-batches/` if not present (the directory is created on first invocation per bundle; subsequent invocations no-op).
2. Assemble and submit one patch-plan envelope with one `create_slt_record` op per approved `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-NNNN.yaml`, in deterministic id-ascending order. Each record carries the `dropped_at_hardgate` id-skip pattern when ACCEPT WITH SELECTIONS dropped intermediate ids — Phase 7 honors the gap (no renumbering).
3. `Write` `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-NNNN.md` (template at `templates/storylet-batch-manifest.md`). Manifest records mode, focus area, source obligations/threads, approved-storylets table, diversity summary, rejected-candidates breakdown, dropped-at-hardgate ids, and the validation verdicts inlined from Phase 6.
4. `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` storylet-pool section: update total count, per-shape distribution table, per-content_intensity distribution. The INDEX.md edit is the LAST write — `INDEX.md` is NOT under `_source/`, so direct `Edit` is the correct surface (Hook 3's match pattern doesn't cover it).

Direct `Write` is forbidden for story-bundle `_source/storylets/*.yaml` records. Hook 3 now covers `worlds/<slug>/stories/<slug>/_source/...`; storylet YAML writes must route through `create_slt_record`. `SLB-NNNN.md` and `INDEX.md` remain direct markdown writes because they are not atomic `_source/*.yaml` records.

**Partial-failure recovery**: if patch-engine submission fails, no storylet YAML should land; report the engine error and do not write the SLB manifest or INDEX.md. If a later markdown write fails, report the specific path and leave the accepted YAML records as the authoritative source; re-invocation allocates the next SLB-NNNN beyond the failed-write's gap, and Pre-flight's allocator scan correctly skips gaps. The INDEX.md edit at step 4 is intentionally LAST so a partial batch never appears in the per-bundle index.

Report all written paths. **Do NOT commit to git.** The user reviews the diff and commits.

**Git-tracking convention for storylet-batches/**: `SLB-NNNN.md` manifests are tracked alongside `SLT-NNNN.yaml` records — both are first-class story-bundle source files (audit-trail-bearing artifacts of the authoring history), not derived artifacts like `_index/world.db`. The per-bundle `storylet-batches/` directory is the canonical audit-trail surface for batch-by-batch authoring history; future runs of `storylet-pool-authoring` (and the `branching-story-health-audit`'s SAU reports that reference batch ids) depend on this history being preserved in the version-controlled tree. The world-content `.gitignore` convention that gitignores `worlds/<slug>/_index/` does NOT extend to `storylet-batches/` — the manifests are tracked content, not derived state.

## Validation Rules This Skill Upholds

| Rule | Phase enforced | Mechanism |
|---|---|---|
| Rule 1: No Floating Facts | Phase 4 gates 7 + 9; structural via SLT schema | Every SLT carries `mystery_safety`, `content_intensity`, `provenance`, `visibility`, `cast_required`, `hard_preconds`, `fact_effects`, and `choice_templates` (no null-pres-and-effects shortcuts allowed). Every predicate in `hard_preconds` / `soft_preconds` / `cast_requirements` / `location_requirements` / choice-template preconditions parses against the Predicate DSL grammar (gate 7 HARD-REJECT on parse failure). Gate 9 (schema completeness) is the structural backstop. |
| Rule 4: No Globalization by Accident | Phase 4 gates 3 + 8; Phase 5 batch-level branch-contamination audit | Gate 3 audits every `fact_effects` and `relationship_effects` entry against every INV record's `break_conditions` from the whole-class INV load (HARD-REJECT). Gate 8 enforces branch-isolation at story scope: `global_author_pool` storylets may NOT directly reference any story-local record id whose `created_at_page` is non-null (post-PG-0001) — preventing branch-local invention from silently leaking across branches. Phase 5's batch-level audit catches systemic visibility-scope errors that gate 8 may have missed for indirect references. |
| Rule 5: No Consequence Evasion | Phase 4 gate 4; Phase 5 OBL-engagement diversity check | Gate 4 verifies that applying a candidate storylet's exit state to the bundle's current state leaves at least one continuation storylet eligible (in current pool OR JIT-generatable per a brief LLM probe) — HARD-REJECT a storylet whose exit state would produce a dead-end branch. Phase 5's OBL-engagement check (≥60% of open OBLs engaged in seed mode; every `source_obligations` id hit in focus mode) prevents the proposal's "thin pool produces brittle story" failure mode at batch granularity. |
| Rule 7: Preserve Mystery Deliberately | Phase 4 gates 1 + 2; Phase 6 HARD-GATE / internal return packet | Gate 1 hard-rejects any storylet whose `M_resolution_claims` resolves a `forbidden`-status M from the whole-class M load. Gate 2 enforces resolution-authority discipline: `canon_candidate` authority requires `requires_canon_promotion: true` AND `visibility.scope: branch_scoped` (never `global_author_pool` — would launder a runtime canon-promotion handoff into authoring time); `apparent` and `branch_local_counterfactual` require the cited M's `resolution_safety_per_M[m_id]` to match the M record's actual `future_resolution_safety`. Phase 6 surfaces the count of `canon_candidate`-claim storylets either in the direct-invocation HARD-GATE summary or, for `parent_skill_invocation: true`, in the internal return packet consumed by the parent skill's HARD-GATE. In `mode=jit`, the parent is page-cycle, and page-cycle Phase 4.5 remains the canon-promotion handoff owner. |

## Record Schemas

This skill's outputs are story-bundle records and a markdown manifest. None are Canon Fact Records or Change Log Entries (canon-reading skill — explicit N/A in the FOUNDATIONS Alignment table below).

- **SLT-NNNN** (storylet record, atomic-YAML, one file per record) → `templates/storylet-record.yaml`. Required fields per the proposal's §Storylet Schema: `id`, `story_id`, `title`, `shape`, `content_intensity`, `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, `opens_obligations`, `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `fact_effects`, `relationship_effects`, `tone_tags`, `theme_tags`, `tension_delta`, `aftermath_weight`, `mystery_safety` (with `forbidden_M_resolved`, `M_touched`, `M_progressed`, `M_resolution_claims`, `resolution_safety_per_M`), `choice_templates` (4-6 entries; each with `operation`, `target_role`, `uses_fact_role`, `likely_effects`, `choice_mode`, `poetic_effect`), `provenance` (with `origin`, `source_audit`, `source_rsp`, `created_at_page`), `visibility` (with `scope`, `visible_from_page`, `visible_branch_path_prefix`, `allowed_branch_ids`), `notes`.
- **SLB-NNNN** (batch manifest, markdown with frontmatter) → `templates/storylet-batch-manifest.md`. Required sections: header (story, mode, focus area, source obligations/threads, date), Approved storylets table (id, title, shape, intensity, engages, mystery), Diversity summary, Rejected candidates breakdown, Dropped-at-hardgate ids (with reason), Validation verdicts (Phase 4 + Phase 5), Notes.
- **Predicate DSL grammar** (engine-checkable predicate forms) → `templates/predicate-dsl.md`. Documents the **core DSL** (`fact_true`, `fact_matches`, `entity_state`, `relationship`, `consequence_pending`, `obligation_open`, `location`, `epistemic`, `not`, `all`, `any`) plus a set of **documented extensions** (`relationship_state`, `time_of_day`, `time_of_week`, `time_in_story`, `time_since_event`, `world_property`, `obligation_state`, `location_kind`, `location_id`, `location_class`) used by the existing pool and supported by the runtime page-cycle's Phase 4 selection. New predicate types added by LLM proposers continue to be HARD-REJECTed at gate 7; the DSL grammar in `templates/predicate-dsl.md` is the authoritative enumeration of closed predicate forms, required fields, operators, and fixed small enums. Story/world-local labels remain open typed values when the document names them as such; they are not universal enums and are not free-form prose. Inlined into Phase 3's LLM prompt and consulted by Phase 4 gate 7.
- **Tone/theme tag dictionary** (recommended-but-non-binding tag vocabulary) → `templates/tone-theme-tag-dictionary.md`. Documents recommended tag families (POV register, emotional charge, structural beat, class/cultural, and others) for `tone_tags` and `theme_tags` to converge cross-batch tag analysis across the pool's lifetime. Free-form tags remain allowed; the dictionary is guidance, not gate enforcement. Inlined into Phase 3's LLM prompt as a recommended vocabulary alongside the predicate DSL grammar.
- **Content policy block** (NC-21 verbatim) → `templates/content-policy.txt`. Embedded into every Phase 3 LLM prompt as the FIRST block. Phase 6 deliverable surfaces it via the validation verdicts. Reuses the same content as `branching-story-bootstrap/templates/content-policy.txt` and `branching-story-page-cycle/templates/content-policy.txt` — single source of truth per skill, copied (not symlinked) so each skill remains self-contained.

## FOUNDATIONS Alignment

| Principle | Phase / Mechanism | Notes |
|---|---|---|
| Tooling Recommendation (§"non-negotiable") | Pre-flight loads `docs/FOUNDATIONS.md` + `WORLD_KERNEL.md` + `ONTOLOGY.md` + `STORY_KERNEL.md`; whole-class M + INV record loads via `list_records(... include_full_body=true)`; premise-bounded retrieval via `get_context_packet(task_type='storylet_pool_authoring')`. | Direct `Read` of `worlds/<slug>/_source/<world-subdir>/` redirected to MCP retrieval by Hook 2; nested story-bundle reads are direct. |
| Multi-world directory discipline | Single-world, nested-in-existing-bundle scope; required `world_slug` + `story_slug` arguments; ALL world-state reads rooted at `worlds/<world-slug>/`; ALL writes rooted at `worlds/<world-slug>/stories/<story-slug>/`. | Pre-flight aborts if either parent directory is missing. |
| Rule 1: No Floating Facts | Phase 4 gates 7 + 9; structural via SLT schema requiring `mystery_safety`, `provenance`, `visibility`, predicate-DSL preconds, structured fact/relationship effects. | Free-form prose predicates / effects fail gate 7 / gate 9. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — canon-reading skill produces story-local content scaffolds (storylets), NOT new world-level species / rituals / technologies / artifacts / institutions. The Rule 2 enforcement surface is `canon-addition` Phase 5 (Diffusion Analysis) and `propose-new-canon-facts` Phase 4 (Domain Coverage); SLT records are not Rule-2-eligible because they are story-scoped content scaffolds, not world-canon. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — canon-reading skill produces no new world-level capability, artifact, or species. The enforcement surface is `canon-addition` (CF stabilizers + Rule-3 audit). Storylet capability assertions inherit from the story's already-imported world-canon SFs (per `branching-story-bootstrap` Phase 3); they do not inflate world-level specialness. |
| Rule 4: No Globalization by Accident | Phase 4 gates 3 + 8; Phase 5 batch-level branch-contamination audit for direct batches; JIT structural precondition for runtime branch-scoped storylets. | INV `break_conditions` enforced against every storylet's effects; story-scope branch-isolation enforced against author-pool storylets and runtime JIT storylets. |
| Rule 5: No Consequence Evasion | Phase 4 gate 4 (consequence-capacity); Phase 5 OBL-engagement diversity check. | A storylet with no continuation path is dead-end; a batch that engages <60% of open OBLs is brittle. |
| Rule 6: No Silent Retcons | N/A | Not applicable — canon-reading skill emits no Change Log Entries because it does not mutate world canon. Storylet-pool changes are append-only at the file-system level (new SLT-NNNN records with `provenance` declared); the Rule 6 enforcement surface for any later promotion of story-local facts to world canon is `canon-addition` (via `story-fact-promotion-to-canon`). |
| Rule 7: Preserve Mystery Deliberately | Phase 4 gates 1 + 2; Phase 6 direct HARD-GATE summary or parent internal return packet; whole-class M load. | `forbidden`-status M resolutions hard-rejected; `canon_candidate` authority forbidden on author-pool storylets and allowed for runtime JIT only when branch-scoped and routed back through page-cycle Phase 4.5. |
| Rule 11: No Spectator Castes by Accident | N/A | Not applicable — canon-reading skill introduces no new exceptional capability that could create spectator castes. The enforcement surface is `canon-addition` Phase 5 + `propose-new-canon-facts` (CF leverage-enumeration). Storylet `cast_required` and `cast_optional` rosters draw from the bundle's existing STENT pool whose dossiers' world-CFs are already enumerated. |
| Rule 12: No Single-Trace Truths | N/A | Not applicable — same reasoning as Rule 2 / 3 / 11; the trace-multiplicity discipline applies to new world-level hard-canon truths, not to story-local content scaffolds. The enforcement surface is `canon-addition` + `propose-new-canon-facts`. |
| Canon Layering | Phase 4 gate 2 enforces resolution-authority discipline (apparent / branch_local_counterfactual / canon_candidate) preserving the contested vs hard vs mystery layer separation; gate 1 preserves the Mystery Reserve layer. Storylets carry `provenance.origin` (`bootstrap_seed | focus_authoring | audit_remediation | runtime_jit`) marking their layer-of-origin. | Storylet pool is its own per-story layer below world canon. Runtime JIT storylets are branch-scoped and are not promoted to any world canon layer without explicit `story-fact-promotion-to-canon` through page-cycle Phase 4.5. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entries. Per FOUNDATIONS §Change Control Policy, "every approved change must get a record" applies to world-level canon mutations; storylet-pool authoring mutates story-bundle state, not world canon. The handoff is `canon-addition` for any later promotion via `story-fact-promotion-to-canon`. |

## Guardrails

- **HARD-GATE is absolute for direct invocation** (see top of file). No file is written until Phase 4 records 9 PASSes per surviving SLT (with one-line rationale per gate per storylet) AND Phase 5 records the mode-appropriate batch checks (seed/focus: 6 diversity-axis PASSes plus batch-level branch-contamination PASS; audit: batch-level branch-contamination PASS plus RSP visibility-match PASS) AND the user explicitly approves the Phase 6 batch manifest deliverable. Auto Mode does not override. `parent_skill_invocation: true` is a no-write sub-routine exception: this skill returns validated SLTs to the parent without writing, and the parent skill's HARD-GATE governs the eventual write.
- **Never write world-level canon.** This skill never `Write`s or `Edit`s `worlds/<world-slug>/WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted by this skill.
- **Never promote to world canon by storylet authority.** A storylet's `M_resolution_claims` with `canon_candidate` authority is ONLY legal on `branch_scoped` runtime-JIT storylets (emitted by `branching-story-page-cycle` Phase 4 JIT expansion). This skill produces author-pool batches in `seed` and `focus` modes; Phase 4 gate 2 hard-rejects any author-pool candidate carrying `canon_candidate` authority. The runtime page-cycle's `story-fact-promotion-to-canon` handoff (HARD-GATE preserved, never elided in any execution_mode) is the sole legitimate canon-promotion path.
- **JIT mode is sub-routine only.** `mode=jit` requires `parent_skill_invocation: true`, `target_pool_size=1`, `created_at_page`, and `caller_state_snapshot` from `branching-story-page-cycle` Phase 4. Direct user invocation with `mode=jit` aborts before allocation or write. The returned SLT is branch-scoped, carries `provenance.origin: runtime_jit`, and is written only by page-cycle Phase 11 if the page tick commits.
- **Never overwrite an existing storylet.** SLT records are append-only at the file-system level: each invocation allocates fresh SLT-NNNN ids beyond the highest existing id (allocator scan + reserved range). To revise an existing storylet, the discipline is to author a new SLT with a `provenance.origin: focus_authoring` or `audit_remediation` and the same gap target, NOT edit the prior SLT. Dropped-at-HARD-GATE ids become permanent allocation gaps.
- **Storylet YAML writes are engine-routed.** Direct `Write` to `worlds/<slug>/stories/<story-slug>/_source/storylets/SLT-NNNN.yaml` is forbidden by Hook 3. Use `mcp__worldloom__submit_patch_plan` with `create_slt_record` ops after HARD-GATE approval. `SLB-NNNN.md`, `storylet-batches/`, and `INDEX.md` remain direct markdown surfaces.
- **Sibling interop**:
  - **Consumes (existing)**: `branching-story-bootstrap` outputs (story bundle structure including STORY_KERNEL.md, _source/obligations/, _source/threads/, _source/storylets/ initial seed pool); `branching-story-page-cycle` outputs (page records, JIT-generated SLTs sharing the SLT-NNNN namespace); `branching-story-health-audit` RSP-NNNN cards for `mode=audit` under `audits/SAU-NNNN/remediation-storylet-proposals/`.
  - **Produces inputs for**: `branching-story-page-cycle` Phase 4 storylet selection (the runtime reads SLT records by visibility scope and salience-scores them); `branching-story-page-cycle` Phase 4 JIT fallback (page-cycle invokes this skill with `mode=jit`, `parent_skill_invocation: true`, `target_pool_size=1`, and writes the returned branch-scoped SLT in Phase 11); `branching-story-bootstrap` Phase 6 (bootstrap uses this skill's seed mode with `parent_skill_invocation: true` and writes the returned SLTs in its own Phase 11 transaction).
- **Content policy is a contract, not a setting.** The NC-21 block in `templates/content-policy.txt` is the skill's discipline floor. It is prepended to every Phase 3 LLM prompt as the FIRST block. `content_intensity` (`tame | mature | explicit`) is a routing tag for tone consistency within branches — never a censor. `content_intensity_override` shifts the band ±1 for a given batch but never lifts the NC-21 policy.
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews the diff and commits.

## Final Rule

A storylet pool is not authored because storylets were generated. It is authored only when the firewall is intact (every M's `forbidden` status respected; no `canon_candidate` authority on author-pool storylets), the mode-appropriate batch checks pass (seed/focus diversity axes, audit RSP visibility-match, and branch-contamination for every direct batch), the open obligations have payoff routes, the active threads have escalation storylets, every predicate parses against the engine-checkable Predicate DSL, the branch-isolation invariant holds (no `global_author_pool` storylet leaks branch-local IDs), and the user has explicitly approved the batch through this skill's direct HARD-GATE or through the parent skill's HARD-GATE when `parent_skill_invocation: true`. A runtime JIT storylet is valid only when the same per-storylet firewall and predicate gates pass, it is branch-scoped to the calling page, and page-cycle commits it through Phase 11 — because the runtime page-cycle's salience scoring is only as good as the pool it scores, and a brittle pool produces a brittle story.
