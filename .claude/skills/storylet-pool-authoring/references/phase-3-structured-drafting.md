# Phase 3: Structured Drafting

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
- `provenance.origin`: `bootstrap_seed` when invoked by `branching-story-bootstrap` Phase 6 (detected by `parent_skill_invocation: true` + `mode=seed` + `focus_area=bootstrap_mix` against a fresh story bundle being constructed in memory); `runtime_jit` when invoked by `branching-story-page-cycle` Phase 4 with `mode=jit`; `focus_authoring` for ALL direct-user authoring outside bootstrap/jit/audit contexts — covering both `mode=focus` (focused-area expansion against a named `focus_area`) AND direct-user `mode=seed` top-up (against an existing pool of N>0 storylets, governed by Pre-flight Inputs §`target_pool_size`'s top-up arithmetic); `audit_remediation` for `mode=audit`. The `focus_authoring` value covers user-driven authoring more broadly than just `mode=focus` — the storylet schema is open at `provenance.origin` (the validator does not enforce a closed enum), and the SLB-NNNN.md batch manifest's `Mode:` field carries the seed-vs-focus distinction in the audit trail, so a separate `seed_topup` enum value would be redundant. The `bootstrap_seed` value is reserved exclusively for the parent-skill-invoked bootstrap path; direct-user `mode=seed` top-up against an existing pool MUST use `focus_authoring` rather than `bootstrap_seed` to preserve the audit-trail distinction between bundle-creation seeding and post-bundle authoring.
- For `mode=audit`, every generated SLT also carries `provenance.source_audit: <RSP.audit_id>` and `provenance.source_rsp: <RSP.rsp_id>`. Non-audit modes keep both fields null.

**Engine wraps the LLM output**:

- Validates schema against `templates/storylet-record.yaml`: every required field present, types correct. The candidate is held under its candidate-index label (`Cn`) in the run's allocation buffer; the LLM's structured proposal is held against the next reserved SLT range without committing to a specific `SLT-NNNN` id until Phase 5 cull selects survivors. This avoids the manual-renumber failure mode when Phase 5 cull drops candidates between draft time and write time.
- Validates predicate syntax against the Predicate DSL (in `templates/predicate-dsl.md`); free-form prose predicates fail here and route back to LLM with the DSL grammar inlined as the failure message.
- Generates the `obligation_template` / `fact_template` / `cast_role` machinery from the LLM's structured proposal, normalizing role-vs-STENT references.
- Records the LLM's `choice_templates` verbatim — they are runtime-overridable scaffolds, not prescriptions.

**Failure handling**: if the LLM produces malformed output (non-YAML, missing required fields, wrong types), engine re-prompts with the specific failure inlined. Up to 2 retries per seed before the seed is dropped from the batch and replaced with a fresh seed drawn from Phase 1's next-priority gap.
