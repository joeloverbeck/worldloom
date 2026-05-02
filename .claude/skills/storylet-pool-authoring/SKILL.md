---
name: storylet-pool-authoring
description: "Use when authoring or expanding the storylet reservoir of an existing branching story bundle inside an existing worldloom world — `seed` mode (~20 storylets, invoked by branching-story-bootstrap Phase 6), `focus` mode (10-15 storylets in a named focus_area), or `audit` mode (deferred until branching-story-health-audit ships). Produces: SLT-NNNN.yaml records under worlds/<world-slug>/stories/<story-slug>/_source/storylets/ + an SLB-NNNN.md batch manifest under worlds/<world-slug>/stories/<story-slug>/storylet-batches/ + an updated worlds/<world-slug>/stories/<story-slug>/INDEX.md storylet-pool summary. Mutates: only worlds/<world-slug>/stories/<story-slug>/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any worlds/<world-slug>/_source/<world-subdir>/*.yaml record); world-canon mutation routes through story-fact-promotion-to-canon (HARD-GATE preserved)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if missing."
    required: true
  - name: story_slug
    description: "Directory slug of an existing story bundle under worlds/<world-slug>/stories/<story-slug>/. Pre-flight aborts if missing — this skill never bootstraps a story bundle; use branching-story-bootstrap for that."
    required: true
  - name: mode
    description: "One of: seed | focus | audit. Default: inferred from inputs (source_audit_path → audit; focus_area → focus; otherwise → seed). Audit mode is deferred and aborts at Pre-flight until branching-story-health-audit ships."
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
    description: "Path to a SAU-NNNN audit report under worlds/<world-slug>/stories/<story-slug>/audits/. Required when mode=audit. DEFERRED — Pre-flight aborts until branching-story-health-audit ships."
    required: false
  - name: tone_override
    description: "Free-form tone hint (overrides the story kernel's default tone weighting for this batch). Optional."
    required: false
  - name: content_intensity_override
    description: "One of: tame | mature | explicit. Overrides the story's content_intensity_baseline ±1 band for this batch. Never lifts the NC-21 content_policy."
    required: false
---

# Storylet Pool Authoring

Authors or expands the structured-content reservoir for an existing branching story bundle by generating per-mode batches (seed, focus, or — once branching-story-health-audit ships — audit) of `SLT-NNNN` storylets that satisfy the Predicate DSL, the per-storylet validation gates (mystery firewall, resolution-authority declaration, invariant compatibility, consequence capacity, dedup, content-intensity coherence, predicate parsability, branch-contamination, schema completeness), and the batch-level diversity audit (shape, tone, content_intensity, OBL-engagement, theme, cast usage), then atomically writes the approved storylets, a batch manifest, and an updated per-bundle index after explicit user approval at the HARD-GATE.

<HARD-GATE>
Do NOT write any file under `worlds/<world-slug>/stories/<story-slug>/_source/storylets/`, do NOT create any file under `worlds/<world-slug>/stories/<story-slug>/storylet-batches/`, and do NOT `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` until: (a) Pre-flight resolves `worlds/<world-slug>/stories/<story-slug>/`, validates the parent story bundle exists with a readable `STORY_KERNEL.md`, refuses with a specific-sibling-missing error if `mode=audit` (deferred until `branching-story-health-audit` ships), allocates the next `SLB-NNNN` and the next available `SLT-NNNN` range via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`, loads the current storylet pool + open OBLs + active THRs + recent page history along the longest active branch_path, loads world canon (whole-class M + INV records and a `task_type='storylet_pool_authoring'` context packet for governing CFs), and confirms the content_policy block (NC-21 verbatim) is loaded for downstream LLM prompt assembly; (b) every surviving candidate SLT in the batch records PASS with a one-line rationale across all nine Phase 4 per-storylet gates (mystery firewall, resolution-authority declaration, invariant compatibility, consequence capacity, dedup, content-intensity coherence, predicate DSL parsability, branch-contamination, schema completeness) AND the batch as a whole records PASS with a one-line rationale across all six Phase 5 diversity-audit checks (shape distribution, tone distribution, content_intensity distribution, OBL-engagement distribution, theme distribution, cast usage) plus the Phase 5 batch-level branch-contamination audit; (c) the user has explicitly approved the Phase 6 batch manifest deliverable summary (per-storylet titles + shape + intensity + OBL/THR engagement + mystery_safety verdict, plus the diversity summary, the rejected-candidates count, and the target write paths). The gate is absolute under Auto Mode — invoking the skill is not approval of the deliverable. The Phase 4 mystery-firewall hard-reject of any storylet whose `M_resolution_claims` carry `canon_candidate` authority is a separate, never-elided refusal that fires before the user-facing HARD-GATE — author-pool storylets MAY NOT carry `canon_candidate` authority because they are globally visible across branches and would launder a runtime canon-promotion handoff into authoring time. The runtime page-cycle's `story-fact-promotion-to-canon` handoff remains the sole legitimate canon-promotion path; this skill never makes that handoff.
</HARD-GATE>

## Process Flow

```
Pre-flight (resolve worlds/<world-slug>/stories/<story-slug>/;
            refuse mode=audit until branching-story-health-audit ships;
            allocate next SLB-NNNN + reserve SLT-NNNN range via
            allocate_next_id; determine mode; load STORY_KERNEL.md;
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
                                 driving Phase 2)
      |
      v
Phase 2: Generation Seeds       (produce target_pool_size + ~30% seeds —
                                 each names: target OBL/THR engaged, shape,
                                 tone register, content_intensity band,
                                 implied state preconditions, core
                                 dramatic transaction; seeds are proposals,
                                 not yet structured records)
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
                                 correction iterations before escalating)
      |
      v
Phase 6: HARD-GATE Approval     (deliverable summary: SLB header +
                                 mode/focus_area + per-storylet line
                                 (title, shape, intensity, OBL/THR
                                 engagement, mystery_safety verdict) +
                                 diversity summary + rejected-candidates
                                 count + target write paths;
                                 --user options-->
                                 ACCEPT BATCH / ACCEPT WITH SELECTIONS /
                                 REVISE-diversity / REVISE-focus / REJECT)
      |
   accept (or accept with selections)
      |
      v
Phase 7: Atomic Write           (single transaction: each SLT-NNNN.yaml
         + INDEX Update         to _source/storylets/; SLB-NNNN.md to
                                 storylet-batches/; INDEX.md updated
                                 LAST so partial failure leaves index
                                 unmutated; NO git commit)
```

## Inputs

### Required

- `world_slug` — directory slug of an existing world under `worlds/<world-slug>/`.
- `story_slug` — directory slug of an existing story bundle under `worlds/<world-slug>/stories/<story-slug>/`. Pre-flight aborts if missing — this skill never bootstraps a story; use `branching-story-bootstrap` for that.

### Optional

- `mode` — `seed | focus | audit`. Default: inferred from inputs (`source_audit_path` → audit; `focus_area` → focus; otherwise → seed). Audit mode aborts at Pre-flight until `branching-story-health-audit` ships.
- `focus_area` — one of {`bootstrap_mix`, `entry_pressure`, `threat_escalation`, `relational_dynamics`, `aftermath_consequences`, `mystery_edge_brushes`, `fork_recovery`, `thread_resolution_options`, `aftermath_residue`, `content_intensity_lift`}. Required when `mode=focus`; ignored when `mode=seed` (uses `bootstrap_mix` implicitly).
- `target_pool_size` — default ~20 in seed mode, 10–15 in focus mode.
- `source_obligations` — comma-separated `OBL-NNNN` ids the new storylets should engage.
- `source_threads` — comma-separated `THR-NNNN` ids.
- `source_audit_path` — path to a `SAU-NNNN` audit report. Required when `mode=audit`. **Deferred until `branching-story-health-audit` ships.**
- `tone_override` — free-form tone hint per batch.
- `content_intensity_override` — `tame | mature | explicit`; ±1 band override.

## Output

- `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-NNNN.yaml` — one per approved storylet (count = surviving candidates after Phases 4-5, capped by `target_pool_size`). Schema in `templates/storylet-record.yaml`.
- `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-NNNN.md` — batch manifest summarizing the run (mode, focus area, source obligations/threads, approved storylets table, diversity summary, rejected-candidates breakdown). Schema in `templates/storylet-batch-manifest.md`.
- `worlds/<world-slug>/stories/<story-slug>/INDEX.md` — updated in place; storylet-pool section receives new total count + per-shape distribution + per-content_intensity distribution.

### No canon-file mutations

This skill never writes `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. SLT records do not promote to world-canon — promotion is `story-fact-promotion-to-canon`'s job (HARD-GATE preserved).

### ID Allocation

`SLT-NNNN` (per-story append-only, shared with runtime JIT-generated storylets — Phase 4 of `branching-story-page-cycle` may write the next-numbered SLT between batches) and `SLB-NNNN` (per-story append-only batch manifests). Both allocated via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`. `SLT` is supported as of MCPENH-011; `SLB` is **new** — see Guardrails for the deferred-integration ticket and the Pre-flight fallback.

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
  - **task_type registration debt**: `task_type='storylet_pool_authoring'` is **not yet registered** in the context-packet profile registry. Until the relevant MCPENH ticket lands, this skill ships with `task_type='other'` as a fallback (per Shape A integration posture); see Guardrails for the deferred-integration ticket. The fallback returns a generic packet — seed_node assembly remains explicit in Pre-flight, so retrieval is correct but lower-priority for the per-task-class layer.
  - **Packet-too-large fallback**: if the packet returns `delivery_status='persisted_with_summary'` OR `packet_incomplete_required_classes` OR non-empty `truncation_summary.dropped_layers`, reduce `seed_nodes` and retry; use `governing_summary` inline; `get_records(record_ids=[...])` for known-id sets; `get_persisted_packet_slice` for structured persisted-packet recovery.
- **Whole-class Mystery Reserve firewall load** via `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` — every M record body is needed at Phase 4 to (a) hard-reject any seed whose `M_resolution_claims` resolves a `forbidden`-status M, and (b) validate every `M_resolution_claims[].resolution_safety_per_M[m_id]` against the M's actual `future_resolution_safety` field. Whole-class enumeration is authorized for skills "whose firewall is class-bounded" per FOUNDATIONS §Tooling Recommendation.
- **Whole-class Invariant audit load** via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` — every INV record body is needed at Phase 4 to audit each candidate SLT's `fact_effects` and `relationship_effects` against every INV's `break_conditions`.

### Mandatory Current Storylet Pool — always loaded at Pre-flight

A conceptual aggregate assembled by reading `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-*.yaml` filtered by the storylet's `visibility` block, scoped to what the new batch must see for dedup and coverage diagnosis:

- All SLT records with `visibility.scope: global_author_pool` (always loaded — they apply to every branch).
- All SLT records with `visibility.scope: branch_prefix_scoped` whose `visibility.visible_branch_path_prefix` is a prefix of the **longest active branch_path** (the same scoping rule the runtime page-cycle uses for selection).
- All SLT records with `visibility.scope: branch_scoped` whose `provenance.created_at_page` is in the **longest active branch_path**.

Sibling-branch SLT records are NOT loaded — cross-branch dedup would homogenize divergent branches at authoring time and silently corrupt branch isolation. The aggregate drives Phase 1 coverage diagnosis (over- and under-represented shapes), Phase 4 dedup (`hard_preconds + tone_tags + theme_tags + shape` similarity threshold), and Phase 5 diversity audit (current pool composition feeds the target-distribution arithmetic).

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first. If `worlds/<world-slug>/stories/<story-slug>/` is missing, abort and instruct the user to run `branching-story-bootstrap` first. If `mode=audit`, abort with "audit mode requires `branching-story-health-audit`, which is not yet shipping; use `mode=seed` or `mode=focus` until it lands."

Direct `Read` of `worlds/<world-slug>/_source/<world-subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read world canon. Direct `Read` of `worlds/<world-slug>/stories/<story-slug>/_source/<story-subdir>/` is the correct surface (Hook 2's match pattern is `worlds/<slug>/_source/...` which does NOT match the nested story bundle).

## Pre-flight Check

Run before Phase 1; abort if any precondition fails.

- Load `docs/FOUNDATIONS.md` into working context.
- Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`); resolve `worlds/<world-slug>/`. Abort if missing — instruct the user to run `create-base-world` first.
- Validate `story_slug` is kebab-case (`[a-z0-9-]+`); resolve `worlds/<world-slug>/stories/<story-slug>/`. Abort if missing — instruct the user to run `branching-story-bootstrap` first.
- Resolve `mode`: explicit input override → inferred (`source_audit_path` → audit; `focus_area` → focus; otherwise → seed).
- **If `mode=audit`: abort immediately** with the deferred-sibling error message. This is the Shape (c) fail-fast — `source_audit_path` is read for the error message but no `audits/SAU-NNNN-*.md` resolution is attempted.
- If `mode=focus` and `focus_area` is absent: abort and instruct the user to supply a `focus_area` from the documented enum.
- Allocate `SLB-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, id_class='SLB', story_slug=<story_slug>)`.
  - **Defensive recovery**: if the allocator returns `Unsupported id_class 'SLB'` from a pre-MCPENH-014 server, fall back to scanning `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-*.md` for the highest existing id and incrementing.
- Reserve next `SLT-NNNN` range via `mcp__worldloom__allocate_next_id(world_slug, id_class='SLT', story_slug=<story_slug>)` — this is the starting point; subsequent allocations within the run advance from this base sequentially as candidates pass Phase 4. The runtime page-cycle's JIT-generated SLT records share this namespace, so a re-scan at Phase 7 confirms no collision before write.
- Read `worlds/<world-slug>/WORLD_KERNEL.md`, `worlds/<world-slug>/ONTOLOGY.md`, and `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` directly.
- Determine the **longest active branch_path** by scanning `_source/pages/PG-*.yaml` for the longest `branch_path` array among pages whose `branch_terminal: false`. Ties broken by most-recent `created_at`.
- Assemble the Mandatory Current Storylet Pool aggregate (per §World-State Prerequisites scoping rule).
- Direct Read of all `_source/obligations/OBL-*.yaml` filtered to `status: open`.
- Direct Read of all `_source/threads/THR-*.yaml` filtered to `status` ∈ {`active`, `pressured`, `critical`, `dormant`}.
- Direct Read of last ~10 `pages-prose/PG-NNNN.md` files along the longest active branch_path (in branch_path order; most-recent last).
- Resolve premise-relevant entities to `entity:<slug>` ids via `mcp__worldloom__find_named_entities(names)` BEFORE the context-packet call. Names sourced from `STORY_KERNEL.cast_bind_list` (each STENT's `world_ent_id`), recent page-history entity mentions, and the active story period.
- Load premise-bounded world-canon retrieval via `mcp__worldloom__get_context_packet(world_slug, task_type='storylet_pool_authoring', seed_nodes=[<resolved ids>], token_budget=18000)`. Apply the packet-too-large fallback per §World-State Prerequisites if the response signals overflow.
  - **Until the registration ticket lands**: substitute `task_type='other'` and surface a one-line console note ("retrieval profile not yet registered — using generic; see Guardrails").
- Load whole-class Mystery Reserve firewall: `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)`.
- Load whole-class Invariant audit: `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)`.
- Confirm content_policy block (NC-21 verbatim text from `templates/content-policy.txt`) is loaded for downstream prompt assembly. Without it, Phase 3 cannot legitimately render storylet content. This is the FIRST condition of the HARD-GATE.

## Phase 1: Coverage Diagnosis

Scan the current pool and the open-state for thinness. Emit a structured diagnosis matrix that drives Phase 2 seed generation.

**Diagnose**:

- **OBL coverage gaps**: which open OBLs have NO compatible storylet (no SLT in the current pool whose `pays_off_obligations`, `complicates_obligations`, or `transfers_obligations` matches the OBL by `type` + `subjects` + `constraints`)? Each uncovered OBL becomes a Phase 2 seed target.
- **THR escalation gaps**: which active THRs (status ∈ {`active`, `pressured`, `critical`}) have NO escalation storylet (no SLT whose `fact_effects` or `relationship_effects` raise this thread's `current_pressure`)? Each uncovered THR becomes a seed target.
- **Content_intensity gaps**: which `content_intensity` bands are under-represented relative to the story's `content_intensity_baseline`? Targets per baseline: `tame` baseline → 60% tame / 30% mature / 10% explicit; `mature` baseline → 30% / 50% / 20%; `explicit` baseline → 20% / 30% / 50%. `content_intensity_override`, when supplied, shifts the target distribution ±1 band.
- **Shape distribution**: which shapes are over-represented (>40% of pool)? Under-represented (<5%)? Over-represented shapes are deprioritized in Phase 2; under-represented shapes are prioritized.
- **Mystery-edge gaps**: which `mysteries_in_play[]` entries declared in `STORY_KERNEL.md` have NO storylet whose `mystery_safety.M_touched` or `M_progressed` cites them? Each gap is a candidate seed (subject to mystery firewall — `forbidden`-status M entries are NEVER seeded for resolution).
- **Recent-history repetition signal**: scan the last ~10 pages along the longest active branch_path; if any `shape` was used in 3 consecutive pages, mark it for Phase 2 deprioritization (avoid pool homogenization at the recently-active branch tip).

**Output**: a diagnosis matrix with rows {gap_kind, target_record_id, priority_weight} feeding Phase 2 seed selection.

## Phase 2: Generation Seeds

Produce N seeds where N = `target_pool_size + ceil(target_pool_size * 0.30)` (the +30% buffer absorbs Phase 4 rejections).

Each seed names:

- **target OBL or THR engaged** (drawn from Phase 1's diagnosis matrix; `source_obligations`/`source_threads`, when supplied, override Phase 1 priority — those OBLs/THRs become mandatory targets).
- **shape** — one of the SLT shape enum (entry_pressure / cast_introduction / threat_escalation / relational_dynamics / routine_disruption / aftermath_sequel / reflection_dilemma / mystery_edge_brush / fork_recovery / thread_resolution / aftermath_residue / intimacy / confrontation / other), biased toward Phase 1's under-represented shapes.
- **tone register** — drawn from `STORY_KERNEL.tone_constraints` + Phase 1's tone-distribution gaps; `tone_override`, when supplied, biases the batch by ±1 register.
- **content_intensity band** — drawn from Phase 1's content_intensity gap analysis.
- **state preconditions** — implied predicates that must hold for the storylet to be eligible (Phase 3 will formalize them into the Predicate DSL).
- **core dramatic transaction** — what changes between the entry-state and exit-state of a page that realizes this storylet (one sentence).

Seeds are proposals, not yet structured records. They live only in the in-memory batch context until Phase 3 turns each into an SLT record.

**Bootstrap-mix shape weighting** (when `mode=seed` or `focus_area=bootstrap_mix`): apply the weighting from the proposal's bootstrap mix table — entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3.

**Focus-mode shape weighting** (when `mode=focus` and `focus_area` is a non-bootstrap_mix value): all seeds match the requested `focus_area`'s implied shape, with a 20% off-shape allowance for diversity (e.g., `focus_area=threat_escalation` → ~80% threat_escalation seeds + ~20% adjacent shapes per Phase 1's gap analysis).

## Phase 3: Structured Drafting

For each seed, generate the full SLT record per the schema in `templates/storylet-record.yaml`. The LLM proposes the structured content; the engine wraps the LLM output with the schema scaffolding, validates field types, and records `choice_templates` verbatim as runtime scaffolds.

**LLM Prompt Assembly** (the order matters; content_policy is FIRST so it binds the model before any other instruction):

```
[content_policy block — verbatim from templates/content-policy.txt, NC-21]

[story kernel — designing_principle + tone_constraints + content_intensity_baseline
                + invariants_acknowledged + mysteries_in_play (with each M's status
                + future_resolution_safety from the whole-class M load)]

[seed brief — shape, tone, content_intensity, target OBL/THR id + body, core
              dramatic transaction]

[state context — currently open OBLs (id + type + salience + urgency + payoff_modes),
                 active THRs (id + type + status + current_pressure), cast bind list
                 (each STENT's role + intention summary)]

[predicate DSL grammar — verbatim from templates/predicate-dsl.md so the LLM
                          generates parsable preconds, not free-form prose]

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
- `mode=audit` (deferred): visibility inherits from the source RSP card's `target_branch` field — `global pool` → `global_author_pool`; concrete branch path → `branch_prefix_scoped` with that prefix; branch-local-fact-dependent → `branch_scoped`.
- `provenance.origin`: `bootstrap_seed` when invoked by `branching-story-bootstrap` Phase 6 (detected by `mode=seed` + `focus_area=bootstrap_mix`); `focus_authoring` for user-driven `mode=focus`; `audit_remediation` deferred.

**Engine wraps the LLM output**:

- Validates schema against `templates/storylet-record.yaml`: every required field present, types correct, `id` matches the next reserved SLT in the run's allocation range.
- Validates predicate syntax against the Predicate DSL (in `templates/predicate-dsl.md`); free-form prose predicates fail here and route back to LLM with the DSL grammar inlined as the failure message.
- Generates the `obligation_template` / `fact_template` / `cast_role` machinery from the LLM's structured proposal, normalizing role-vs-STENT references.
- Records the LLM's `choice_templates` verbatim — they are runtime-overridable scaffolds, not prescriptions.

**Failure handling**: if the LLM produces malformed output (non-YAML, missing required fields, wrong types), engine re-prompts with the specific failure inlined. Up to 2 retries per seed before the seed is dropped from the batch and replaced with a fresh seed drawn from Phase 1's next-priority gap.

## Phase 4: Per-Storylet Validation Gates (Canon Safety Check phase, per-storylet)

Each candidate SLT runs all **9** gates. A failed gate either HARD-REJECTs the candidate (replaced with a fresh seed from Phase 1's next-priority gap) or routes to revise (LLM re-prompted with the failure inlined; up to 2 retries per gate).

| # | Gate | Check | On fail |
|---|---|---|---|
| 1 | Mystery firewall (Rule 7) | `mystery_safety.forbidden_M_resolved == false` AND no entry in `M_resolution_claims` whose `resolution_safety_per_M[m_id] == forbidden` per the whole-class M load | HARD-REJECT |
| 2 | Resolution-authority declaration (Rule 7) | For every `M_resolution_claims` entry: if `resolution_authority == canon_candidate` then `requires_canon_promotion == true` AND visibility scope MUST be `branch_scoped` (NEVER `global_author_pool`); if `apparent` or `branch_local_counterfactual` then `requires_canon_promotion == false` AND `resolution_safety_per_M[m_id] ∈ {low, medium, high}` matching the M record's actual `future_resolution_safety` | HARD-REJECT |
| 3 | Invariant compatibility (Rule 4) | Every entry in `fact_effects` and `relationship_effects` respects every INV record's `break_conditions` from the whole-class INV load | HARD-REJECT |
| 4 | Consequence capacity (Rule 5) | Applying the storylet's exit state to the bundle's current state leaves at least one continuation storylet eligible (in the current pool OR JIT-generatable per a brief LLM probe). Verified by a deterministic eligibility check over the post-application state-snapshot shape | HARD-REJECT or revise |
| 5 | Dedup | Candidate is not a near-duplicate of an existing pool entry. Similarity threshold: ≥80% overlap across the union of `hard_preconds` predicate-form set + `tone_tags` + `theme_tags` + `shape` + cast_required STENT ids | reject; replace with under-represented seed from Phase 1's gap matrix |
| 6 | Content-intensity coherence | Storylet's `content_intensity` is within the story's allowed range — `STORY_KERNEL.content_intensity_baseline` ± 1 band, further constrained by `content_intensity_override` when supplied. A `tame`-tagged storylet whose `fact_effects` describe explicit-band content fails here | HARD-REJECT or downgrade content_intensity |
| 7 | Predicate DSL parsability (Rule 1) | Every predicate in `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions parses against the Predicate DSL grammar in `templates/predicate-dsl.md` | HARD-REJECT (re-prompt LLM with grammar inlined) |
| 8 | Branch-contamination (Rule 4 at story scope) | If `visibility.scope == global_author_pool`, the storylet may NOT directly reference any story-local record id (`SF-NNNN`, `OBL-NNNN`, `STENT-NNNN`, `STOBJ-NNNN`, `STLOC-NNNN`, `SREL-NNNN`) whose `created_at_page` is non-null. Global storylets may use abstract role-matchers (`role:protagonist`), world/root facts, and STENT ids declared at bootstrap (i.e., `created_at_page == PG-0001` is permitted; later pages are not) | HARD-REJECT (force `visibility.scope: branch_prefix_scoped` or revise to abstract matchers) |
| 9 | Schema completeness (Rule 1) | All mandatory fields per `templates/storylet-record.yaml` are present, including the `mystery_safety`, `provenance`, and `visibility` blocks | revise (re-prompt LLM with explicit constraint) |

**HARD-REJECT vs revise**:

- **HARD-REJECT** → candidate does not enter pool; replaced with a fresh seed drawn from Phase 1's next-priority gap. Replacement seeds re-enter Phase 3.
- **revise** → LLM re-prompted with the failed gate's reason inlined; up to 2 retries per gate. After 2 failed retries on the same gate, the candidate is HARD-REJECTed.

**Whole-class loads from Pre-flight power gates 1, 2, and 3**: M-record full bodies for the `forbidden`-status check (gate 1) and the `resolution_safety_per_M[m_id]` cross-check against each M's `future_resolution_safety` (gate 2); INV-record full bodies for the `break_conditions` audit (gate 3). Without those whole-class loads, Phase 4 cannot honor its canon-safety contract.

## Phase 5: Diversity Audit (Canon Safety Check phase, batch-level)

Across the surviving SLT records in this batch, verify diversity. **Six diversity-axis checks plus one batch-level branch-contamination audit must pass before the batch can advance to Phase 6.**

### Diversity-axis checks

- **Shape distribution**: no single `shape` exceeds 40% of the batch (seed mode allows `entry_pressure + cast_introduction` combined up to 50% per the bootstrap-mix loading concentration).
- **Tone distribution**: no single dominant tone tag exceeds 40%.
- **Content_intensity distribution**: matches the requested distribution per Phase 1's content_intensity gap targets (typically 30/50/20 for `mature` baseline, biased per `tame` or `explicit` baselines, ±1 band per `content_intensity_override`).
- **OBL-engagement distribution**: in seed mode, batch must engage ≥60% of currently-open OBLs across `pays_off_obligations + complicates_obligations + transfers_obligations + opens_obligations`. In focus mode, batch MUST hit every `source_obligations` id at least once.
- **Theme distribution**: no single theme tag exceeds 50%.
- **Cast usage**: no `protagonist` or `major` cast member is engaged by zero storylets in the batch (engagement = appearance in `cast_required` or `cast_optional`).

### Batch-level branch-contamination audit

Beyond per-storylet branch-contamination (Phase 4 gate 8), the batch as a whole is audited:

- For every storylet with `visibility.scope: global_author_pool`: confirm that none of its `hard_preconds`, `soft_preconds`, `fact_templates`, `obligation_matchers`, `relationship_effects`, or `location_requirements` name a record id whose `created_at_page` is non-null.
- For every storylet with `visibility.scope: branch_prefix_scoped`: confirm `visibility.visible_branch_path_prefix` is a real prefix of at least one current branch's `branch_path`.
- For audit-mode batches (deferred): confirm every storylet's `visibility` block matches the visibility implied by the source RSP card's `target_branch` — no audit-mode storylet silently defaults to `global_author_pool` when the RSP requested branch-local scope.

### On diversity failure

- Replace overrepresented entries with under-represented shape/tone/intensity seeds drawn from Phase 1's gap matrix.
- Re-run Phase 3 + Phase 4 on the replacement seeds.
- Up to 2 diversity-correction iterations before escalating to the user with the failed axes inlined.

## Phase 6: HARD-GATE Approval

Present the batch manifest deliverable summary to the user:

```
STORYLET BATCH: SLB-NNNN
Story: <story_slug> in <world_slug>
Mode: <seed | focus>          Focus area: <focus_area>
Source obligations: [OBL-NNNN, ...]      Source threads: [THR-NNNN, ...]

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
- Phase 5 diversity (6 axes): PASS — <one-line rationale>
- Phase 5 batch-level branch-contamination: PASS — <one-line rationale>

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

## Phase 7: Atomic Write + INDEX Update

Single transaction. Write order matters — `INDEX.md` is the LAST write so partial failure leaves the per-bundle index unmutated:

1. `mkdir -p worlds/<world-slug>/stories/<story-slug>/storylet-batches/` if not present (the directory is created on first invocation per bundle; subsequent invocations no-op).
2. `Write` each approved `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-NNNN.yaml` in deterministic id-ascending order. Each record carries the `dropped_at_hardgate` id-skip pattern when ACCEPT WITH SELECTIONS dropped intermediate ids — Phase 7 honors the gap (no renumbering).
3. `Write` `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-NNNN.md` (template at `templates/storylet-batch-manifest.md`). Manifest records mode, focus area, source obligations/threads, approved-storylets table, diversity summary, rejected-candidates breakdown, dropped-at-hardgate ids, and the validation verdicts inlined from Phase 6.
4. `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` storylet-pool section: update total count, per-shape distribution table, per-content_intensity distribution. The INDEX.md edit is the LAST write — `INDEX.md` is NOT under `_source/`, so direct `Edit` is the correct surface (Hook 3's match pattern doesn't cover it).

**Direct `Write` is the correct mutation surface for story-bundle records under the Shape A integration posture** (per the same posture as `branching-story-bootstrap` and `branching-story-page-cycle`). Hook 3's match pattern is `worlds/<slug>/_source/...` which does NOT match `worlds/<slug>/stories/<slug>/_source/...`. No engine ops exist for SLT/SLB records, and the deferred-integration ticket for engine-routing story-bundle classes lives outside this skill's scope.

**Partial-failure recovery**: if any write in steps 1-3 fails, the user receives the failure with the specific path and instruction to (a) manually clean up partial SLT writes, (b) re-invoke the skill (which will allocate the next SLB-NNNN beyond the failed-write's gap, and Pre-flight's allocator scan correctly skips gaps). The INDEX.md edit at step 4 is intentionally LAST so a partial batch never appears in the per-bundle index.

Report all written paths. **Do NOT commit to git.** The user reviews the diff and commits.

## Validation Rules This Skill Upholds

| Rule | Phase enforced | Mechanism |
|---|---|---|
| Rule 1: No Floating Facts | Phase 4 gates 7 + 9; structural via SLT schema | Every SLT carries `mystery_safety`, `content_intensity`, `provenance`, `visibility`, `cast_required`, `hard_preconds`, `fact_effects`, and `choice_templates` (no null-pres-and-effects shortcuts allowed). Every predicate in `hard_preconds` / `soft_preconds` / `cast_requirements` / `location_requirements` / choice-template preconditions parses against the Predicate DSL grammar (gate 7 HARD-REJECT on parse failure). Gate 9 (schema completeness) is the structural backstop. |
| Rule 4: No Globalization by Accident | Phase 4 gates 3 + 8; Phase 5 batch-level branch-contamination audit | Gate 3 audits every `fact_effects` and `relationship_effects` entry against every INV record's `break_conditions` from the whole-class INV load (HARD-REJECT). Gate 8 enforces branch-isolation at story scope: `global_author_pool` storylets may NOT directly reference any story-local record id whose `created_at_page` is non-null (post-PG-0001) — preventing branch-local invention from silently leaking across branches. Phase 5's batch-level audit catches systemic visibility-scope errors that gate 8 may have missed for indirect references. |
| Rule 5: No Consequence Evasion | Phase 4 gate 4; Phase 5 OBL-engagement diversity check | Gate 4 verifies that applying a candidate storylet's exit state to the bundle's current state leaves at least one continuation storylet eligible (in current pool OR JIT-generatable per a brief LLM probe) — HARD-REJECT a storylet whose exit state would produce a dead-end branch. Phase 5's OBL-engagement check (≥60% of open OBLs engaged in seed mode; every `source_obligations` id hit in focus mode) prevents the proposal's "thin pool produces brittle story" failure mode at batch granularity. |
| Rule 7: Preserve Mystery Deliberately | Phase 4 gates 1 + 2; Phase 6 HARD-GATE | Gate 1 hard-rejects any storylet whose `M_resolution_claims` resolves a `forbidden`-status M from the whole-class M load. Gate 2 enforces resolution-authority discipline: `canon_candidate` authority requires `requires_canon_promotion: true` AND `visibility.scope: branch_scoped` (never `global_author_pool` — would launder a runtime canon-promotion handoff into authoring time); `apparent` and `branch_local_counterfactual` require the cited M's `resolution_safety_per_M[m_id]` to match the M record's actual `future_resolution_safety`. Phase 6 HARD-GATE summary surfaces the count of `canon_candidate`-claim storylets so the user sees the firewall verdict explicitly (count is always 0 for author-pool batches per gate 2's structural refusal). |

## Record Schemas

This skill's outputs are story-bundle records and a markdown manifest. None are Canon Fact Records or Change Log Entries (canon-reading skill — explicit N/A in the FOUNDATIONS Alignment table below).

- **SLT-NNNN** (storylet record, atomic-YAML, one file per record) → `templates/storylet-record.yaml`. Required fields per the proposal's §Storylet Schema: `id`, `story_id`, `title`, `shape`, `content_intensity`, `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, `opens_obligations`, `pays_off_obligations`, `complicates_obligations`, `transfers_obligations`, `fact_effects`, `relationship_effects`, `tone_tags`, `theme_tags`, `tension_delta`, `aftermath_weight`, `mystery_safety` (with `forbidden_M_resolved`, `M_touched`, `M_progressed`, `M_resolution_claims`, `resolution_safety_per_M`), `choice_templates` (4-6 entries; each with `operation`, `target_role`, `uses_fact_role`, `likely_effects`, `choice_mode`, `poetic_effect`), `provenance` (with `origin`, `source_audit`, `source_rsp`, `created_at_page`), `visibility` (with `scope`, `visible_from_page`, `visible_branch_path_prefix`, `allowed_branch_ids`), `notes`.
- **SLB-NNNN** (batch manifest, markdown with frontmatter) → `templates/storylet-batch-manifest.md`. Required sections: header (story, mode, focus area, source obligations/threads, date), Approved storylets table (id, title, shape, intensity, engages, mystery), Diversity summary, Rejected candidates breakdown, Dropped-at-hardgate ids (with reason), Validation verdicts (Phase 4 + Phase 5), Notes.
- **Predicate DSL grammar** (engine-checkable predicate forms) → `templates/predicate-dsl.md`. Verbatim from the proposal's §Predicate DSL section: `fact_true`, `fact_matches`, `entity_state`, `relationship`, `consequence_pending`, `obligation_open`, `location`, `epistemic`, `not`, `all`, `any`. The DSL is closed: LLM proposers may NOT invent new `pred` types. Inlined into Phase 3's LLM prompt and consulted by Phase 4 gate 7.
- **Content policy block** (NC-21 verbatim) → `templates/content-policy.txt`. Embedded into every Phase 3 LLM prompt as the FIRST block. Phase 6 deliverable surfaces it via the validation verdicts. Reuses the same content as `branching-story-bootstrap/templates/content-policy.txt` and `branching-story-page-cycle/templates/content-policy.txt` — single source of truth per skill, copied (not symlinked) so each skill remains self-contained.

## FOUNDATIONS Alignment

| Principle | Phase / Mechanism | Notes |
|---|---|---|
| Tooling Recommendation (§"non-negotiable") | Pre-flight loads `docs/FOUNDATIONS.md` + `WORLD_KERNEL.md` + `ONTOLOGY.md` + `STORY_KERNEL.md`; whole-class M + INV record loads via `list_records(... include_full_body=true)`; premise-bounded retrieval via `get_context_packet(task_type='storylet_pool_authoring')` (with `task_type='other'` fallback until the registered profile lands). | Direct `Read` of `worlds/<slug>/_source/<world-subdir>/` redirected to MCP retrieval by Hook 2; nested story-bundle reads are direct. |
| Multi-world directory discipline | Single-world, nested-in-existing-bundle scope; required `world_slug` + `story_slug` arguments; ALL world-state reads rooted at `worlds/<world-slug>/`; ALL writes rooted at `worlds/<world-slug>/stories/<story-slug>/`. | Pre-flight aborts if either parent directory is missing. |
| Rule 1: No Floating Facts | Phase 4 gates 7 + 9; structural via SLT schema requiring `mystery_safety`, `provenance`, `visibility`, predicate-DSL preconds, structured fact/relationship effects. | Free-form prose predicates / effects fail gate 7 / gate 9. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — canon-reading skill produces story-local content scaffolds (storylets), NOT new world-level species / rituals / technologies / artifacts / institutions. The Rule 2 enforcement surface is `canon-addition` Phase 5 (Diffusion Analysis) and `propose-new-canon-facts` Phase 4 (Domain Coverage); SLT records are not Rule-2-eligible because they are story-scoped content scaffolds, not world-canon. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — canon-reading skill produces no new world-level capability, artifact, or species. The enforcement surface is `canon-addition` (CF stabilizers + Rule-3 audit). Storylet capability assertions inherit from the story's already-imported world-canon SFs (per `branching-story-bootstrap` Phase 3); they do not inflate world-level specialness. |
| Rule 4: No Globalization by Accident | Phase 4 gates 3 + 8; Phase 5 batch-level branch-contamination audit. | INV `break_conditions` enforced against every storylet's effects; story-scope branch-isolation enforced against author-pool storylets. |
| Rule 5: No Consequence Evasion | Phase 4 gate 4 (consequence-capacity); Phase 5 OBL-engagement diversity check. | A storylet with no continuation path is dead-end; a batch that engages <60% of open OBLs is brittle. |
| Rule 6: No Silent Retcons | N/A | Not applicable — canon-reading skill emits no Change Log Entries because it does not mutate world canon. Storylet-pool changes are append-only at the file-system level (new SLT-NNNN records with `provenance` declared); the Rule 6 enforcement surface for any later promotion of story-local facts to world canon is `canon-addition` (via the future `story-fact-promotion-to-canon` skill). |
| Rule 7: Preserve Mystery Deliberately | Phase 4 gates 1 + 2; Phase 6 HARD-GATE summary; whole-class M load. | `forbidden`-status M resolutions hard-rejected; `canon_candidate` authority forbidden on author-pool storylets (laundering firewall). |
| Rule 11: No Spectator Castes by Accident | N/A | Not applicable — canon-reading skill introduces no new exceptional capability that could create spectator castes. The enforcement surface is `canon-addition` Phase 5 + `propose-new-canon-facts` (CF leverage-enumeration). Storylet `cast_required` and `cast_optional` rosters draw from the bundle's existing STENT pool whose dossiers' world-CFs are already enumerated. |
| Rule 12: No Single-Trace Truths | N/A | Not applicable — same reasoning as Rule 2 / 3 / 11; the trace-multiplicity discipline applies to new world-level hard-canon truths, not to story-local content scaffolds. The enforcement surface is `canon-addition` + `propose-new-canon-facts`. |
| Canon Layering | Phase 4 gate 2 enforces resolution-authority discipline (apparent / branch_local_counterfactual / canon_candidate) preserving the contested vs hard vs mystery layer separation; gate 1 preserves the Mystery Reserve layer. Storylets carry `provenance.origin` (`bootstrap_seed | focus_authoring | audit_remediation`) marking their layer-of-origin. | Storylet pool is its own per-story layer below world canon — not promoted to any world canon layer without explicit `story-fact-promotion-to-canon`. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entries. Per FOUNDATIONS §Change Control Policy, "every approved change must get a record" applies to world-level canon mutations; storylet-pool authoring mutates story-bundle state, not world canon. The handoff is `canon-addition` for any later promotion via `story-fact-promotion-to-canon`. |

## Guardrails

- **HARD-GATE is absolute** (see top of file). No file is written until Phase 4 records 9 PASSes per surviving SLT (with one-line rationale per gate per storylet) AND Phase 5 records 6 diversity-axis PASSes plus the batch-level branch-contamination PASS AND the user explicitly approves the Phase 6 batch manifest deliverable. Auto Mode does not override.
- **Never write world-level canon.** This skill never `Write`s or `Edit`s `worlds/<world-slug>/WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted by this skill.
- **Never promote to world canon by storylet authority.** A storylet's `M_resolution_claims` with `canon_candidate` authority is ONLY legal on `branch_scoped` runtime-JIT storylets (emitted by `branching-story-page-cycle` Phase 4 JIT expansion). This skill produces author-pool batches in `seed` and `focus` modes; Phase 4 gate 2 hard-rejects any author-pool candidate carrying `canon_candidate` authority. The runtime page-cycle's `story-fact-promotion-to-canon` handoff (HARD-GATE preserved, never elided in any execution_mode) is the sole legitimate canon-promotion path.
- **Never overwrite an existing storylet.** SLT records are append-only at the file-system level: each invocation allocates fresh SLT-NNNN ids beyond the highest existing id (allocator scan + reserved range). To revise an existing storylet, the discipline is to author a new SLT with a `provenance.origin: focus_authoring` (or future `audit_remediation`) and the same gap target, NOT edit the prior SLT. Dropped-at-HARD-GATE ids become permanent allocation gaps.
- **Direct `Write` is the correct mutation surface for story-bundle records under the Shape A integration posture.** Hook 3's match pattern is `worlds/<slug>/_source/...` which does NOT match `worlds/<slug>/stories/<slug>/_source/...`. SLT/SLB records are not world canon and no engine ops exist for them. A future maintainer who "upgrades" the skill to engine routing must FIRST land patch-engine ops + Hook 3 namespace extension + record-schema validators for the SLT/SLB classes (deferred-integration tickets named below).
- **Known integration debt** (deferred per Shape A; design exploits these once landed):
  - **MCPENH-013: register `storylet_pool_authoring` context-packet task_type** — until landed, Pre-flight uses `task_type='other'` fallback. The fallback is correct (seed_nodes are explicit) but lower-priority for the per-task-class ranking layer. Ticket follows the MCPENH-009 / MCPENH-012 precedent (TaskType tuple + ranking profile + default budget + governing-world-context + full-body delivery + reserve policy + tests + README + skill prose revert).
  - **MCPENH-014: add `SLB` id-class to `allocate_next_id`** — until landed, Pre-flight falls back to scanning `worlds/<world-slug>/stories/<story-slug>/storylet-batches/SLB-*.md` for the highest existing id. `SLT` is already supported by MCPENH-011. Ticket follows the same compound-key (`world_slug` + `id_class` + `story_slug`) pattern.
  - **`branching-story-health-audit` (future skill)** — Pre-flight aborts on `mode=audit` until this skill ships. The audit skill is expected to produce SAU-NNNN reports whose `target_branch` and `remediation_storylets[]` fields drive this skill's audit-mode visibility-inheritance and seed-generation logic. Filing the audit-skill ticket is out of scope for the current ticket batch; the deferral is disclosed here for maintainability.
  - **BSBOOT-002: refactor `branching-story-bootstrap` Phase 6 to delegate to `storylet-pool-authoring` seed mode** — bootstrap currently inlines a minimal SLT seed shape with explicit seam markers in `templates/story-records.yaml` and SKILL.md Phase 6. Once this skill lands, bootstrap's Phase 6 becomes a delegation call (`focus_area: bootstrap_mix`, `target_pool_size: <seed-size>`).
  - **BSPAG-001: extend `storylet-pool-authoring` with a `jit` mode and refactor `branching-story-page-cycle` Phase 4 JIT expansion to delegate to it** — page-cycle currently inlines minimal JIT SLT shape with seam references in SKILL.md Phase 4. This skill does NOT currently expose a `jit` mode — that's part of the BSPAG-001 scope; today, Phase 4 JIT expansion stays inlined in page-cycle, and the JIT-shape seams stay open until BSPAG-001 lands.
- **Sibling interop**:
  - **Consumes (existing)**: `branching-story-bootstrap` outputs (story bundle structure including STORY_KERNEL.md, _source/obligations/, _source/threads/, _source/storylets/ initial seed pool); `branching-story-page-cycle` outputs (page records, JIT-generated SLTs sharing the SLT-NNNN namespace).
  - **Consumes (deferred)**: `branching-story-health-audit` (SAU-NNNN reports for audit mode — abort-until-shipping per Shape (c)).
  - **Produces inputs for**: `branching-story-page-cycle` Phase 4 storylet selection (the runtime reads SLT records by visibility scope and salience-scores them); `branching-story-bootstrap` Phase 6 (post-BSBOOT-002, bootstrap delegates to this skill rather than inlining).
- **Content policy is a contract, not a setting.** The NC-21 block in `templates/content-policy.txt` is the skill's discipline floor. It is prepended to every Phase 3 LLM prompt as the FIRST block. `content_intensity` (`tame | mature | explicit`) is a routing tag for tone consistency within branches — never a censor. `content_intensity_override` shifts the band ±1 for a given batch but never lifts the NC-21 policy.
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews the diff and commits.

## Final Rule

A storylet pool is not authored because storylets were generated. It is authored only when the firewall is intact (every M's `forbidden` status respected; no `canon_candidate` authority on author-pool storylets), the diversity axes meet target distribution, the open obligations have payoff routes, the active threads have escalation storylets, every predicate parses against the engine-checkable Predicate DSL, the branch-isolation invariant holds (no `global_author_pool` storylet leaks branch-local IDs), and the user has explicitly approved the batch — because the runtime page-cycle's salience scoring is only as good as the pool it scores, and a brittle pool produces a brittle story.
