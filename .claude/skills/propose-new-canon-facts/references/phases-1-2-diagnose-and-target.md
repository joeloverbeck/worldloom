# Phases 1-2: Diagnose the Current World + Identify Enrichment Targets

Phase 1 scans all 12 loaded world files for thinness / overstability / overcomplexity and produces a cited diagnosis dossier. Phase 2 maps each `high`-value diagnosis finding to enrichment categories (A–J) and Proposal Families (1–10), applying user parameters.

## Phase 1: Diagnose the Current World

Execute three scans across all 12 loaded world files. Each finding must cite the specific file (and ideally section) demonstrating it.

**Thinness scan** — per the reference proposal's 12 indicators: species-without-material-consequence; magic-without-institutional-response; geography-without-trade-implication; religion-without-law-or-daily-life impact; catastrophe-with-weak-residue; well-modeled-class-with-blank-others; taboo-without-ritual; corruption-without-containment; war-without-logistics; cities-without-food-systems; relics-without-salvage-economies; multilingual-coexistence-without-language-politics.

**Overstability scan** — 6 indicators: no pressure systems; no unresolved tensions; too few local anomalies; frictionless institutions; mystery reserve too thin; everything important already known.

**Overcomplexity scan** — 4 indicators: too many disconnected facts; lore branches with low story yield; exotic detail without structural relevance; mysteries that are actually clutter.

Output: **diagnosis dossier** — each finding ranked `high` / `medium` / `low` remediation-value based on how many downstream gaps it creates. If `upstream_audit_path` was loaded, merge its findings — but do not skip this phase entirely, only skip scan-types the upstream report already covers.

**Rule**: Every finding must cite at least one loaded world file by name. A finding that cannot be cited is not a finding — it is a hunch, and hunches are disallowed here.

**FOUNDATIONS cross-ref**: Tooling Recommendation (diagnosis operates on loaded structured state, not prose intuition).

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
