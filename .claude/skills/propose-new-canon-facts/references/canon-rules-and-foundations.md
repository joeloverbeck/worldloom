# Canon Rules Upheld, Record Schemas, and FOUNDATIONS Alignment

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 5 (trigger 5 rejects aesthetic flourishes) + Phase 6 card template (every card populates `domains_touched`) + Phase 8 Test 1 (14-domain check on each card's statement).
- **Rule 3: No Specialness Inflation** — Phase 4 scoring (`integration_burden` weighted against gain) + Phase 5 (trigger 2 rejects universalized rare powers) + Phase 7c (`why_not_universal` required for capability cards) + Phase 7e (repairs add concrete stabilizers, no hand-waves) + Phase 8 Test 2.
- **Rule 4: No Globalization by Accident** — Phase 7c (`recommended_scope` + `why_not_universal` required; rumor carve-out explicit) + Phase 7e (narrowing is the least-destructive repair) + Phase 8 Test 3.
- **Rule 5: No Consequence Evasion** — Phase 3 generation prompts favor multi-fact connections + Phase 6 card template requires `immediate_consequences` + `longer_term_consequences` + `likely_required_downstream_updates` + Phase 8 Test 4.
- **Rule 7: Preserve Mystery Deliberately** — Phase 5 (trigger 3 rejects overexplained mysteries) + Phase 7b (per-card firewall with inverted check for Family J) + Phase 7d (batch-level joint-closure detection) + Phase 8 Tests 5–6.

## Record Schemas

- **Proposal Card** → `templates/proposal-card.md` (hybrid YAML frontmatter + markdown body; original to this skill). Frontmatter fields: `proposal_id`, `batch_id`, `slug`, `title`, `canon_fact_statement`, `proposed_status` (`hard_canon` | `soft_canon` | `contested_canon` | `mystery_reserve` | `invariant_revision` — note: no separate `derived_canon` status; FOUNDATIONS's Derived Canon layer is represented by populating `source_basis.derived_from_cfs` with parent CFs while using `hard_canon` or `soft_canon` per the derivation's layer weight. The derivation audit trail is the field, not the status), `type` (capability | artifact | law | belief | event | institution | species | ritual | taboo | technology | resource_distribution | hidden_truth | local_anomaly | metaphysical_rule), `enrichment_category` (A–J), `proposal_family` (1–10), `domains_touched`, `recommended_scope` (geographic / temporal / social), `why_not_universal`, `scores` (coherence, propagation_value, story_yield, distinctiveness, ordinary_life_relevance, mystery_preservation, integration_burden, redundancy_risk — each 1–5), `score_aggregate`, `immediate_consequences`, `longer_term_consequences`, `likely_required_downstream_updates`, `risks`, `canon_safety_check` (with `invariants_respected`, `mystery_reserve_firewall`, `distribution_discipline.canon_facts_consulted`), `source_basis` (with `world_slug`, `batch_id`, `generated_date`, `user_approved`, `derived_from_cfs`), `notes`. Markdown body sections: What It Deepens, Why It Fits This World, Immediate Consequences (prose), Longer-Term Consequences (prose), Risks, Likely Burden If Accepted, Likely Story Yield, Would This Be Better As, Canon Safety Check Trace.

- **Batch Manifest** → `templates/batch-manifest.md` (hybrid YAML frontmatter + markdown body; original to this skill). Frontmatter fields: `batch_id`, `world_slug`, `generated_date`, `parameters` (with `batch_size`, `novelty_range`, `enrichment_types`, `taboo_areas`, `upstream_audit_path`), `diagnosis_summary`, `card_ids`, `dropped_card_ids`, `user_approved`. Markdown body sections: Diagnosis Dossier, Enrichment Targets, Seed Generation Log, Phase 4 Score Matrix, Phase 5 Rejected-Seed Log, Phase 6 Diversification Audit (slot × card table), Phase 7d Batch-level Check Trace, Phase 7e Repair Log, Phase 8 Test Results.

No Canon Fact Record emitted. No Change Log Entry emitted. This skill does not mutate world-level canon.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | `docs/FOUNDATIONS.md` + `WORLD_KERNEL.md` + `ONTOLOGY.md` (direct Read at world root) + atomic-record world-state slice via `mcp__worldloom__get_context_packet(task_type='propose_new_canon_facts', ...)` (Kernel concepts + INV records + relevant CFs + named-entity neighbors + section context); on-demand `get_record` / `search_nodes` / `get_neighbors` retrieval during diagnosis (Phases 1-2), seed generation (Phase 3), and the Phase 7 sub-checks |
| Canon Layers §Hard / Soft / Contested / Mystery Reserve | Phases 6, 7 | Each card declares `proposed_status`; 7a respects invariants; 7b firewalls MR; Family J opens new MR entries rather than closing old ones |
| Canon Layers §Derived Canon | Phases 3, 4, 6 | Seed generation + scoring's `propagation_value` favor seeds deriving from existing facts; card's `source_basis.derived_from_cfs` cites parent CFs explicitly |
| Ontology Categories | Phases 2, 6 | Enrichment categories map to ontology categories via card's `type` field |
| Invariants §full schema | Phases 7a, 7e | Every invariant tested; `break_conditions` and `revision_difficulty` guide 7e repairs; explicit `invariant_revision` pathway for proposals that legitimately propose revisions |
| Canon Fact Record Schema | Phase 6 | Card frontmatter is structurally compatible with the CF Record Schema — `canon-addition` accepting a card can emit a CF that borrows the card's fields rather than re-deriving them |
| Rule 1 (No Floating Facts) | Phases 6, 8 | Card template requires `domains_touched`, `recommended_scope`, `why_not_universal`, `immediate_consequences`, `longer_term_consequences`, `likely_required_downstream_updates` — the Rule 1 required-field set — enforced by Phase 8 Tests 1-4 |
| Rule 2 (No Pure Cosmetics) | Phases 5, 6, 8 | Phase 5 trigger 5 + Phase 6 `domains_touched` + Phase 8 Test 1 (14-domain check) |
| Rule 3 (No Specialness Inflation) | Phases 4, 5, 7c, 7e, 8 | Scoring penalty + Phase 5 trigger 2 + `why_not_universal` + concrete-mechanism repairs + Test 2 |
| Rule 4 (No Globalization by Accident) | Phases 7c, 7e, 8 | `recommended_scope` + `why_not_universal` + narrowing repairs + Test 3 |
| Rule 5 (No Consequence Evasion) | Phases 3, 6, 8 | Multi-fact seed preference + both-order consequences + downstream updates + Test 4 |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — canon-reading skill emits no Change Log Entry. Retcon discipline is `canon-addition`'s responsibility when a card is accepted and its Change Log Entry is emitted there. |
| Rule 7 (Preserve Mystery Deliberately) | Phases 5, 7b, 7d, 8 | Phase 5 trigger 3 + per-card firewall with inverted check for Family J + batch-level joint-closure + Tests 5–6 |
| World Kernel §Tonal Contract | Phases 4, 5 | Scoring's `coherence` dimension + Phase 5 trigger 7 (tonal contract break) |
| World Kernel §Core Pressures | Phase 6 | Diversification slot priority references world's core pressures |
| Change Control Policy | N/A | Not applicable — canon-reading skill; Change Log Entry is `canon-addition`'s responsibility when a card is accepted. |
