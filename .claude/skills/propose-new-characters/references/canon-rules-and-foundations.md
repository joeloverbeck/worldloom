# Canon Rules Upheld, Record Schemas, and FOUNDATIONS Alignment

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 2 (institutional embedding checklist mandatory on every registry entry) + Phase 5 (17 negative-space probes each guard against a class / institution / profession being present only as abstraction) + Phase 7 (forced-choice rule rejects biography fragments) + Phase 12 rejection triggers 6, 7, 10, 13 + Phase 15 Tests 1, 2.
- **Rule 3: No Specialness Inflation** — Phase 7 (every capability has `capability_path` + `cost_of_competence`) + Phase 10e repair stabilizers must name concrete mechanisms + Phase 12 rejection triggers 5, 12 + Phase 15 Test 3.
- **Rule 4: No Globalization by Accident** — Phase 4 (hard-duplicate classification blocks silent niche-universalization) + Phase 10c (hard gate: every implied capability checked against CF distribution blocks; `canon-requiring` tag surfaces implied universalization for user review) + Phase 15 Test 4.
- **Rule 7: Preserve Mystery Deliberately** — Phase 8 (epistemic position includes explicit `cannot_know` + first Rule-7 gate catching disallowed-answer leaks cheaply) + Phase 10b (formal per-seed MR firewall with complete audit list) + Phase 10d (batch-level joint-closure check — two seeds jointly closing an MR entry fails even when neither alone would) + Phase 15 Tests 5, 6.

## Record Schemas

- **NCP Proposal Card** → `templates/proposal-card.md` — hybrid YAML frontmatter (character-generation-compatible required + optional inputs + NCP-specific keys) + markdown body (character-generation dossier sections + Niche Analysis + Canon Safety Check Trace). Original to this skill; structurally parallel to `character-generation`'s dossier schema for downstream consumability via `character_brief_path`.
- **NCB Batch Manifest** → `templates/batch-manifest.md` — hybrid frontmatter (batch metadata + `card_ids` + `dropped_card_ids` + `user_approved`) + markdown body (Registry Summary, Constellation + Mosaic audit, Niche-Occupancy Map, Phase 5 Diagnosis, Phase 6 Seed Log, Phase 11 Score Matrix, Phase 12 Rejected-Candidate Log, Phase 13 Diversification Audit, Phase 10d / 10e traces, Phase 15 Test Results). Original to this skill.

No Canon Fact Record emitted. No Change Log Entry emitted. This skill does not mutate world-level canon.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | `docs/FOUNDATIONS.md` + `WORLD_KERNEL.md` + `ONTOLOGY.md` (direct Read at world root) + atomic-record world-state slice via `mcp__worldloom__get_context_packet(task_type='propose_new_characters', ...)` (Kernel concepts + INV records + relevant CFs + named-entity neighbors + section context); Person Registry from `characters/` + `diegetic-artifacts/` frontmatter + `adjudications/PA-NNNN-accept*` frontmatter; on-demand `get_record` / `search_nodes` / `get_neighbors` / `find_named_entities` retrieval during Phases 1–10 |
| Multi-world directory discipline | Pre-flight + Phase 16 | Required `world_slug` argument; all reads/writes rooted at `worlds/<world-slug>/` |
| Canon Layers §Hard / Soft / Contested | Phase 1 + Phase 10c | Registry `source_type` discriminates dossiers (hard-identified personas) from artifact-author voices (contested-canon gravity); `canon_assumption_flags.status` classifies each card's canon posture |
| Canon Layers §Mystery Reserve | Phase 8 + Phase 10b + Phase 10d | Explicit `cannot_know` field + per-seed firewall audit + batch-level joint-closure check |
| Invariants §full schema | Phase 10a | Every invariant tested per seed; `break_conditions` and `revision_difficulty` guide Phase 10e repair paths |
| Ontology Categories | Phase 2 + Phase 7 | Registry essence profiles attach to declared categories; per-seed capabilities classified |
| Rule 1 (No Floating Facts) | Phase 14 | Proposal card schema structurally enforces domain / scope / prerequisites / limits / consequences fields |
| Rule 2 (No Pure Cosmetics) | Phases 2, 5, 7, 12, 15 | Institutional embedding + negative-space probes + forced-choice rule + rejection triggers + Tests 1–2 |
| Rule 3 (No Specialness Inflation) | Phases 7, 10e, 15 | Capability path with cost + no hand-wave repair stabilizers + Test 3 |
| Rule 4 (No Globalization by Accident) | Phases 4, 10c, 15 | Hard-duplicate classification + CF distribution discipline + canon-requiring surfacing + Test 4 |
| Rule 5 (No Consequence Evasion) | N/A | Not applicable — canon-reading skill emits candidate character cards, not canon facts. Downstream: if `canon_assumption_flags.status` is canon-requiring, `implied_new_facts` routes to `canon-addition` / `propose-new-canon-facts`, where Rule 5 enforcement lives. |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — canon-reading skill does not mutate existing canon. Downstream: if an accepted canon-addition adjudication requires amending a CF or section record, `canon-addition` emits the Change Log Entry there. |
| Rule 7 (Preserve Mystery Deliberately) | Phases 8, 10b, 10d, 15 | First-gate epistemic `cannot_know` + per-seed formal firewall audit + batch-level joint-closure + Tests 5–6 |
| World Kernel §Core Pressures | Phase 7 | Per-seed `central_contradiction` instantiates world core pressures at individual scale |
| World Kernel §Tonal Contract | Phase 9 | Voice calibrated to world tonal register; voice tests include artifact-author register |
| Change Control Policy | N/A | Not applicable — canon-reading skill does not emit Change Log Entries. Handoff: canon-requiring cards route to `canon-addition`, which emits the Change Log Entry on adjudication acceptance. |
| Canonical Storage Layer (SPEC-13) | Pre-flight + Phase 1 | All `_source/<subdir>/*.yaml` reads via MCP retrieval — no bulk reads of atomic-record subdirectories. Hybrid-file artifacts (`characters/`, `diegetic-artifacts/`, `adjudications/`, `character-proposals/`) load via direct Read; Hook 3's hybrid-file allowlist permits direct writes to `character-proposals/`. |
| Acceptance Tests §10 world queries | Phase 16 deliverable | Registry Summary + Constellation/Mosaic audit + Niche-Occupancy Map + Negative-Space Diagnosis collectively answer queries 6 ("What kinds of people can plausibly exist here?") and 7 ("What can ordinary people actually do all day?") |
