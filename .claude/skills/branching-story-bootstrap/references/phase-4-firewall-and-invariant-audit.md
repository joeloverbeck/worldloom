# Phase 4: Mystery Firewall + Invariant Audit

Reference for `branching-story-bootstrap` Phase 4 — the canon-safety check that runs the normalized premise + cast bindings + imported SFs (Phases 1-3 outputs) against every world Mystery Reserve and Invariant record loaded at Pre-flight. Hard-rejection routes back to the responsible upstream phase (or to the user with a premise-revision request) before any structural setup begins at Phase 5.

---

## Mystery firewall (Rule 7 enforcement)

For each `M-NNNN` in the whole-class load whose domain overlaps the premise OR whose narrative orbit includes any cast member:

> **Narrative orbit** is satisfied when (a) the cast member's world-canonical CHAR dossier `world_consistency.mystery_reserve_firewall` lists the M, OR (b) the M's `domains_touched` overlap a domain the cast member structurally engages per their dossier `major_local_pressures` or `intended_narrative_role`. Declare both classes in `mysteries_in_play[]`; the dossier-listing path is the conservative default and accounts for most declarations in practice.

- Declare it in `STORY_KERNEL.md`'s `mysteries_in_play[]` with the M's `status` and `future_resolution_safety`.
- **Hard reject** (abort the bootstrap) if any premise element, imported SF, planned thread, or planned obligation resolves a `forbidden`-status M.
- For `low | medium | high`-resolution-safety M entries: note that in-story resolution requires routing through `story-fact-promotion-to-canon`.

**M-id 4-digit-padding convention for story-bundle references.** The canonical `M-NNNN` shape used throughout this reference and the FOUNDATIONS ID class enumeration is 4-digit zero-padded. The SLT validator at `tools/validators/src/schemas/story-storylet.schema.json` enforces `^M-[0-9]{4}$` strictly on `mystery_preservation.forbidden_resolutions[]`, `mystery_safety.M_touched[]`, `mystery_safety.M_progressed[]`, `mystery_safety.M_resolution_claims[].m_id`, the `mystery_safety.resolution_safety_per_M` dict keys, and any stop-policy predicate args referencing M-ids (e.g., `forbidden_mystery_resolution_risk.args.mystery_id`). World-canon Mystery Reserve records, however, may have been emitted in non-conforming shorter forms (`M-1.yaml` through `M-9.yaml`) by older `create-base-world` runs predating the strict padding convention — the canon record's filename and `id` field carry the world's actual format, which may not match the 4-digit shape. When the world's M-records use a shorter ID format (verifiable by listing `worlds/<slug>/_source/mystery-reserve/`), pad references in story-bundle records to the canonical 4-digit form (e.g., `M-1` → `M-0001`, `M-3` → `M-0003`) when emitting SLT / CHC / PG records so the SLT validator regex matches. Record the canonical 4-digit form in `STORY_KERNEL.md.mysteries_in_play[].id` for consistency with the SLT references (the kernel's mysteries_in_play is not regex-validated, but matching the SLT references keeps the bundle internally consistent). Flag the underlying world-ID-format divergence as a potential `create-base-world` audit item — but the bootstrap-side fix is the padding-on-reference convention documented here.

---

## Invariant audit (Rule 4 enforcement)

Run premise + cast + imported initial SFs + sketched initial threads/obligations against every INV record from the whole-class load:

> **Phase ordering note**: Threads + obligations are not yet emitted at Phase 4; sketch their intended shape during the audit so the audit can reason against them, then formalize in Phase 5. If Phase 5 produces threads/obligations that diverge materially from the Phase 4 sketch (e.g., a thread that introduces a distribution claim the sketch did not anticipate), re-run the relevant INV audit branches before proceeding to Phase 6. Phase 9 gate 2 finalizes the same Rule 4 surface after later bootstrap artifacts exist by checking SLT preconditions, PG-0001 `state_snapshot`, and CHC `likely_effects` against the same loaded INV `break_conditions`.

- Flag tensions: does the premise assume a capability that violates an INV's `break_conditions`? Does an obligation imply a distribution change that breaks Rule 4?
- **Hard reject** (or revise premise with user) if any tension is unresolvable.

**Output to STORY_KERNEL.md (Rule 4 anchor)**: populate `audited_thread_obligation_sketch` on the kernel frontmatter for every new bootstrap — a structured snapshot of the threads + obligations the audit reasoned against (each entry: `id` (provisional), `type`, `salience`, `urgency`, `payoff_modes_sketch`, `INV_branches_audited[]`). Phase 9 gate 2 compares the Phase 5 emitted records against this sketch; if a Phase 5 thread or obligation diverges materially (different INV branches engaged, different distribution claims), re-run the relevant audit branches before proceeding to Phase 6.

---

**Output to STORY_KERNEL.md**: `mysteries_in_play[]` populated; `invariants_acknowledged[]` populated (cite the INV ids the story will respect — anchors later validation); `audited_thread_obligation_sketch` populated for the required Phase 5-vs-Phase 4 divergence check on new bootstrap runs.

---

## Rule 11 delegation note

Rule 11 (No Spectator Castes by Accident) is NOT enforced at this Phase 4 firewall — it is delegated to Phase 6 storylet-pool-authoring's per-SLT gate 14 (see `storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` gate 14). The trigger fires when an SLT's `effect_model.variants[].required_effects[]` includes a `fact_create` op with `args.truth_scope.world_level == true` AND `args.exception_governance` populated. Bootstrap Phase 4 audits premise / cast / threads / obligations against INV `break_conditions`; per-SLT Rule 11 leverage runs downstream when the seed pool is generated.
