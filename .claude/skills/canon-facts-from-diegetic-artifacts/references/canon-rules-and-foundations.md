# Canon Rules and FOUNDATIONS Alignment

Load this reference when checking canon alignment, record schemas, or FOUNDATIONS cross-references. Contains the Validation Rules this skill upholds, the output record schemas, and the full FOUNDATIONS Alignment table.

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 4 scoring (`ordinary_life_relevance` dimension), Phase 5 R5/R10 (aesthetic flourish + mere texture rejection), Phase 7 Test T1 (14-domain check).
- **Rule 3: No Specialness Inflation** — Phase 3 narrator-reliability mapping (caps sole-source at soft_canon), Phase 4 `integration_burden` dim, Phase 7 Test T4 (stabilizer presence).
- **Rule 4: No Globalization by Accident** — four-phase defense-in-depth: Phase 3 scope cap, Phase 6c distribution discipline, Phase 6d.1 evidence-breadth test (three pathways: full-support / partial / sole-source), Phase 7 Test T2.
- **Rule 5: No Consequence Evasion** — Phase 4 `propagation_value` dim, Phase 7 Test T3 (both consequence orders, ≥ 2 domains).
- **Rule 7: Preserve Mystery Deliberately** — three-layer firewall: Phase 6b per-card MR content check (every MR id recorded), Phase 6d.3 positional check (mining-specific), Phase 6e joint-closure. **6d.3 is mining-specific Rule 7 strengthening** — diegetic artifacts inherit their author's epistemic position, making positional leakage a mining-specific vulnerability the sibling doesn't face.

## Record Schemas

- **Proposal Card** → `templates/proposal-card.md`. Structurally parallel to `propose-new-canon-facts/templates/proposal-card.md` with mining-specific additions: `source_artifact_id`, `source_basis.derived_from_artifact_path`, `canon_safety_check.diegetic_to_world_laundering` sub-block. CF-schema parity preserved for `canon-addition` field-copy compatibility.
- **Batch Manifest** → `templates/batch-manifest.md`. Structurally parallel to sibling with mining-specific additions: `source_artifact_id`, `source_artifact_path`, `classification_counts` (five buckets including `partially_grounded`), `flagged_contradictions`, `mr_positional_flags`, `single_narrator_concentration_flag`.

No Canon Fact Record emitted. No Change Log Entry emitted. These appear only when `canon-addition` accepts a card in a separate run.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (§"non-negotiable") | Pre-flight | Load FOUNDATIONS + all 13 mandatory world files + source artifact before any classification work. Selective-load pattern for oversize files (CANON_LEDGER, INSTITUTIONS, EVERYDAY_LIFE, ECONOMY when large); file is "readable" when reachable + permissioned, full content loads as Phase 2 needs it. |
| Rule 1: No Floating Facts | Output schema (structural) | Every emitted card's required frontmatter fields (`domains_touched`, `recommended_scope`, `why_not_universal` or rumor-scope, `immediate_consequences`, `longer_term_consequences`, `canon_safety_check.*`) enforce Rule 1 at schema level. Phase 7 Tests T1/T2/T3/T4/T5 check field presence. A card missing any required field fails Phase 7 and cannot be written. |
| Rule 2: No Pure Cosmetics | Phase 4 + Phase 5 + Phase 7 T1 | 8-dim scoring includes `ordinary_life_relevance`; Phase 5 R5 + R10 reject texture; T1 requires ≥ 1 of 14 Rule-2 domains. |
| Rule 3: No Specialness Inflation | Phase 3 + Phase 4 + Phase 7 T4 | Narrator-reliability mapping caps sole-source at soft_canon; Phase 4 `integration_burden` dim; T4 stabilizer-presence check. |
| Rule 4: No Globalization by Accident | Phase 3 + Phase 6c + Phase 6d.1 + Phase 7 T2 | Four-layer scope discipline: mapping cap, distribution discipline, evidence-breadth three-pathway demotion (full-support / partial / sole-source), explicit scope-declaration check. |
| Rule 5: No Consequence Evasion | Phase 4 + Phase 7 T3 | Phase 4 `propagation_value` dim; T3 requires both consequence orders, longer-term tracing ≥ 2 domains. |
| Rule 6: No Silent Retcons | N/A | Not applicable — canon-reading skill emits no Canon Fact Records and no Change Log Entries; world-level canon changes are `canon-addition`'s authority. Handoff path: a surviving card becomes a CF only when `canon-addition` accepts it. The `flagged_contradictions` list is the handoff signal to `continuity-audit` for retcon adjudication, which itself hands off to `canon-addition`. |
| Rule 7: Preserve Mystery Deliberately | Phase 6b + Phase 6d.3 + Phase 6e | Three-layer MR firewall: 6b per-card content check; 6d.3 per-card positional check (mining-specific); 6e batch-level joint-closure. |
| Canon Layering (§"Canon Layers") | Phase 3 | Narrator-reliability mapping forces explicit canon-layer selection per card: hard_canon / soft_canon / contested_canon. No card is written without an explicit `proposed_status`. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no canon changes. Handoff path: accepted cards emit Change Log Entries only when `canon-addition` writes them on adjudication. |
| Multi-world directory discipline | Pre-flight + every phase | Single-world scope declared; all reads/writes rooted at `worlds/<world-slug>/`. `artifact_path` pre-flight check rejects cross-world references. |
| Acceptance Tests (§"World Queries Every Tool Must Answer") | Phase 4 | Coherence scoring implicitly tests whether candidates preserve the world's "why it looks like this", "what keeps extraordinary capabilities from becoming mundane", and "what contradictions are permitted because they are diegetic rather than ontological". Scored, not gated. |
