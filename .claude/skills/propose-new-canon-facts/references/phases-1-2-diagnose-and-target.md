# Phases 1-2: Diagnose the Current World + Identify Enrichment Targets

Phase 1 scans the world's atomic-record state for thinness / overstability / overcomplexity and produces a cited diagnosis dossier. Phase 2 maps each `high`-value diagnosis finding to enrichment categories (A–J) and Proposal Families (1–10), applying user parameters.

## Phase 1: Diagnose the Current World

Execute three scans across the world's atomic records via record-addressed retrieval (`mcp__worldloom__search_nodes`, `mcp__worldloom__get_record`). Each finding cites the specific record id (e.g., `SEC-INS-007`, `CF-0042`, `M-0003`) and the concern (file class) it sits under.

**Per-concern scan pattern**:

```
mcp__worldloom__search_nodes(node_type='section', filters={file_class: '<concern>'})
```

For each of the seven prose concerns — `everyday-life`, `institutions`, `magic-or-tech-systems`, `geography`, `economy-and-resources`, `peoples-and-species`, `timeline` — enumerate the `SEC-*` ids, then `get_record` selectively for the indicators below. Pair with `search_nodes(node_type='canon_fact')` for cross-CF redundancy / pressure-system coverage, and with `get_record` on cited `M-NNNN` / `OQ-NNNN` / `INV-*` ids when an indicator implicates them.

**Thinness scan** — 12 indicators:

| # | Indicator | Primary record class to inspect |
|---|---|---|
| 1 | species-without-material-consequence | `SEC-PAS-*` + `SEC-ELF-*` (does species inventory show up in daily-life records?) |
| 2 | magic-without-institutional-response | `SEC-MTS-*` + `SEC-INS-*` |
| 3 | geography-without-trade-implication | `SEC-GEO-*` + `SEC-ECR-*` |
| 4 | religion-without-law-or-daily-life impact | `SEC-INS-*` + `SEC-ELF-*` |
| 5 | catastrophe-with-weak-residue | `SEC-TML-*` + `SEC-GEO-*` + `SEC-ELF-*` |
| 6 | well-modeled-class-with-blank-others | `SEC-INS-*` + `SEC-ELF-*` |
| 7 | taboo-without-ritual | `SEC-INS-*` + `SEC-ELF-*` |
| 8 | corruption-without-containment | `SEC-INS-*` |
| 9 | war-without-logistics | `SEC-TML-*` + `SEC-ECR-*` + `SEC-INS-*` |
| 10 | cities-without-food-systems | `SEC-GEO-*` + `SEC-ECR-*` + `SEC-ELF-*` |
| 11 | relics-without-salvage-economies | `SEC-TML-*` + `SEC-ECR-*` |
| 12 | multilingual-coexistence-without-language-politics | `SEC-PAS-*` + `SEC-INS-*` |

**Overstability scan** — 6 indicators: no pressure systems (cross-CF coverage of `SEC-INS-*` tensions); no unresolved tensions (`OQ-*` density relative to CF count); too few local anomalies (CF distribution skew); frictionless institutions (`SEC-INS-*` failure-mode coverage); mystery reserve too thin (`M-*` count + breadth); everything important already known (low `OQ-*` + `M-*` ratio).

**Overcomplexity scan** — 4 indicators: too many disconnected facts (CFs without `derived_from_cfs` or `prerequisites`); lore branches with low story yield (`SEC-*` records with no `touched_by_cf` entries); exotic detail without structural relevance (CFs whose `domains_affected` covers <2 domains); mysteries that are actually clutter (`M-*` entries with no `disallowed_cheap_answers` discipline).

Output: **diagnosis dossier** — each finding ranked `high` / `medium` / `low` remediation-value based on how many downstream gaps it creates, citing record ids. If `upstream_audit_path` was loaded, merge its findings — skip scan types it already covers but do not skip the phase wholesale.

**Rule**: Every finding cites at least one record id. A finding that cannot be record-cited is not a finding — it is a hunch, and hunches are disallowed.

**FOUNDATIONS cross-ref**: Tooling Recommendation + §Mandatory World Files §atomic-source classification — diagnosis operates on indexed atomic records, not on retired monolithic prose.

## Phase 2: Identify Enrichment Targets

For each `high`-value diagnosis finding from Phase 1, map to one or more enrichment categories (A–J from the proposal's Phase 1) AND one or more Proposal Families (1–10 from the proposal's Reference).

**Category ↔ Family mapping**:
- A: Structural Clarification → Families 2, 5, 9
- B: Constraint / Cost Deepening → Families 1, 7
- C: Institutional Response → Families 2, 9
- D: Historical Residue → Family 3
- E: Everyday-Life Texture → Families 4, 10
- F: Cross-Domain Coupling → any combination of 1–10
- G: Regional Differentiation → Families 4, 5, 10
- H: Contested Knowledge → Family 6
- I: Story Engine Injection → Families 2, 9
- J: Mystery Seeding → opens new unknowns rather than filling existing gaps

**Proposal Families (1–10)** — the 10 named families used to tag each seed's `proposal_family` frontmatter field. Source: the skill's reference brainstorming doc, archived at `archive/brainstorming/propose-new-canon-facts.md`.

1. **Hidden Cost Facts** — prevent systems from becoming frictionless.
2. **Institutionalization Facts** — show how the world adapts to its own realities.
3. **Residue Facts** — make history visible.
4. **Local Practice Facts** — make settings feel inhabited.
5. **Boundary Facts** — define who can and cannot do something.
6. **Misinterpretation Facts** — introduce useful false beliefs.
7. **Scarcity Facts** — clarify why something has not gone universal.
8. **Cross-Species Consequence Facts** — make embodiment socially real.
9. **Ritual / Law Coupling Facts** — bind metaphysics to governance.
10. **Material Culture Facts** — show values and constraints through objects and habits.

A seed may legitimately carry multiple family tags when its intent spans families (e.g., a local artisanal-guild subsection that encodes cross-species embodiment touches families 4, 10, and 8). The `proposal_family` frontmatter field accepts an integer or a list of integers.

**User label → A–J mapping** — Phase 0 extracts `enrichment_types` using the 10-value user-facing taxonomy declared in the arguments frontmatter (`darker`, `stranger`, etc.); Phase 2 maps each user label to the internal A–J analytical framework via the table below. Free-form user labels outside this table should be mapped by lexical-semantic fit or routed to Category F (Cross-Domain Coupling) by default.

| User label (`enrichment_types`) | Activates A–J categories |
|---|---|
| `darker` | B, I |
| `stranger` | H, J, D |
| `more_political` | C, I |
| `more_local_texture` | E, G |
| `more_danger` | B, I |
| `more_religious_depth` | H, I |
| `more_economic_realism` | B, C, F |
| `more_archaeology` | D, H |
| `more_species_differentiation` | A, E, G |
| `more_travel_texture` | E, G |

Apply user parameters: filter to `enrichment_types` if specified (map each label per the table above, then union the resulting A–J set); exclude findings touching `taboo_areas`; honor `novelty_range` (conservative favors A/C; bold favors H/J; moderate balances).

**Rule**: At least one target per `high`-value finding unless that finding is in `taboo_areas`. `medium`-value findings are targeted only if `batch_size` permits after high-value slots are filled.
