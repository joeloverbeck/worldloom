# Canon Rules Upheld, Record Schemas, and FOUNDATIONS Alignment

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 0 (every HARD input must bind to a specific named world entity; "generic" bindings rejected) + Phase 4 (every texture element cites source file and world-embedded reason; decorative texture fails) + Phase 8 Tests 1 + 2. A diegetic artifact whose details could be dropped into any world has failed Rule 2.

- **Rule 3: No Specialness Inflation** — Phase 7c (Author capabilities that fit a CF's `who_cannot_easily_do_it` need a stabilizer-cited Phase 0b institutional embedding) + Phase 7f (repairs must name concrete mechanisms — "the author just happens to know the guild's inner vocabulary" fails). Enforcement is narrower than in `character-generation` because a diegetic artifact rarely declares long capability lists; fires mostly when artifact content presumes specialist Author access.

- **Rule 4: No Globalization by Accident** — Phase 7c (world-fact claims' CF distribution + Author access conformance; a claim cannot be asserted as direct + canonically_true by an author the CF places outside `who_can_do_it`) + Phase 7d.3 (no local-as-global UNLESS the author would plausibly make that mistake, in which case the overgeneralization is tagged and permitted) + Phase 8 Test 8. Rule 4 has two enforcement points — one on Author access, one on claim scope — because a text can fail Rule 4 two different ways.

- **Rule 7: Preserve Mystery Deliberately** — Phase 1 (`never_know` list derived from M-NNNN records + OQ-NNNN records + CAU-N-style restricted-vocabulary CFs) + Phase 3 (`prohibited_for_this_artifact` pre-filtering — Rule 7 enforced by commission prevention, not post-hoc detection) + Phase 7b (firewall audit against every M record retrieved, overlap or not; body + claim_map + three epistemic_horizon fields all tested) + Phase 8 Tests 5 + 6. This skill has more Rule 7 enforcement points than any other canon-reading skill because a text is the primary vector for forbidden-answer leakage. **Maintainer note**: Phases 1 / 3 / 7b are the three Rule 7 enforcement points; if a future phase is added that exposes the artifact to Mystery Reserve content, that phase must either extend the firewall audit or be explicitly classified out-of-scope in `notes`.

## Record Schemas

- **Diegetic Artifact File** → `templates/diegetic-artifact.md` (hybrid YAML frontmatter + markdown body; original to this skill). Frontmatter fields listed in the thin SKILL.md § Output. Markdown body: the artifact text as in-world prose + a demarcated Canon Safety Check Trace section.

No Canon Fact Record and no Change Log Entry are emitted (rationale in the thin SKILL.md § Output). If the user later wants an artifact claim canonized, that runs through `canon-addition`, whose proposal may cite `DA-<id>` and a specific `claim_map` entry.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | docs/FOUNDATIONS.md (direct Read) + WORLD_KERNEL.md + ONTOLOGY.md (direct Read) + atomic-record context packet via `mcp__worldloom__get_context_packet(task_type='diegetic_artifact_generation', ...)` + `templates/diegetic-artifact.md` loaded before any phase; SEC-MTS records selectively retrieved at Phase 0 via `search_nodes` if magic-or-tech-adjacent |
| Canon Layers §Hard / Soft / Contested | Phase 3 | Every claim tagged with `canon_status` mapping to a layer; `canonically_true` claims must cite a CF; `contested` claims are the artifact's natural register; `partially_true` is available for plausible author overgeneralizations |
| Canon Layers §Contested Canon | Output + Phase 6 | The artifact body is declared contested canon by class; "No canon-file mutations" paragraph states this inline so future readers cannot mistake artifact claims for world-level truth |
| Canon Layers §Mystery Reserve | Phases 1, 3, 7b | Never_know derivation + prohibited pre-filter + firewall audit; three-layer Rule 7 enforcement |
| Invariants §full schema | Phase 7a | Every invariant tested against artifact body and Author capabilities; invariant-breaking FALSE claims permitted (narrator error), invariant-breaking OBJECTIVE-DIRECT claims forbidden |
| Ontology Categories | Phase 3 | Every claim attaches to declared ontology categories so canon_status is resolvable against the ledger's typed facts |
| Canon Fact Record Schema | Phase 3, 7c | CF references in claim_map must resolve via `mcp__worldloom__get_record`; CF distribution blocks are the literal test material at Phase 7c |
| Rule 2 (No Pure Cosmetics) | Phases 0, 4, 8 | Input binding + texture citation + Tests 1-2 |
| Rule 3 (No Specialness Inflation) | Phases 7c, 7f | Author capability exceptions need stabilizers; repair moves cannot hand-wave |
| Rule 4 (No Globalization by Accident) | Phases 7c, 7d.3, 8 | Author access distribution + claim scope enforcement + narrator-plausible overgeneralization gate + Test 8 |
| Rules 5, 6, and Change Control Policy | N/A | Not applicable — this is a canon-reading skill: no canon mutation (Rule 5 second-order consequences out-of-scope), no retcons (Rule 6, no Change Log Entry emitted), no Change Log Entries. Future canonization of an artifact claim runs through `canon-addition`, which handles consequence propagation, retcon discipline, and Change Log emission |
| Rule 7 (Preserve Mystery Deliberately) | Phases 1, 3, 7b, 8 | Never_know derivation + prohibited pre-filter + firewall audit + Tests 5-6 |
| World Kernel §Genre + Tonal Contract | Phases 2, 6 | Genre convention derivation tied to world-tradition institutions + voice calibration against tonal register |
