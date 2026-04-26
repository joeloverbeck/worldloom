# Phases 14–16: Compose, Validate, Commit

## Phase 14: Compose Proposal Cards

Materialize each surviving seed into the `NCP-NNNN-<slug>.md` card schema. No new content is generated here — this is format only.

**Frontmatter**:

- `character-generation`'s required inputs: `current_location`, `place_of_origin`, `date`, `species`, `age_band`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`.
- `character-generation`'s optional inputs: `central_contradiction`, `desired_emotional_tone`, `desired_arc_type`, `taboo_limit_themes`.
- NCP-specific keys: `proposal_id`, `batch_id`, `slug`, `title`, `niche_summary`, `occupancy_strength` (`current_state`, `nearest_existing_occupants`, `overlap_type`, `decisive_differences`), `depth_class`, `proposal_family`, `diagnosis_target`, `scores`, `score_aggregate`, `canon_assumption_flags`, `recommended_next_step` (`generate_immediately` / `reserved_future_seed` / `generate_after_canon_adjudication`), `critic_pass_trace` (template slots: `phase_1_continuity_archivist`, `phase_2_essence_extractor`, `phase_3_constellation_mosaic`, `phase_5_institutional_everyday`, `phase_8_epistemic_focalization`, `phase_9_voice_critic`, `phase_9_artifact_authorship`, `phase_11_theme_tone`), `canon_safety_check`, `source_basis`, `notes`.

The first frontmatter block (character-generation compatibility fields) MUST mirror `character-generation`'s `character_brief_path` shape byte-for-byte so the card path is directly consumable downstream.

**Body** — `character-generation` dossier sections, each populated from Phase 7–9 outputs:

- Material Reality
- Institutional Embedding
- Epistemic Position
- Goals and Pressures
- Capabilities
- Voice and Perception
- Contradictions and Tensions
- Likely Story Hooks

PLUS a **Niche Analysis** section (7-layer essence trace + occupancy-strength justification + nearest occupants + decisive differences) PLUS a **Canon Safety Check Trace** section (Phase 10a / 10b / 10c / 10d audit prose).

**Defense-in-depth — frontmatter AND body both required**: The body's `## Niche Analysis` and `## Canon Safety Check Trace` sections are NARRATIVE-PROSE expansions of the frontmatter's structured `occupancy_strength` and `canon_safety_check` fields. Both the frontmatter structured metadata AND the body prose sections are REQUIRED — populating only the frontmatter (treating the structured fields as satisfying the body requirement) leaves the card schema-incomplete. Phase 15 Test 8 (schema completeness) catches frontmatter-only or body-only populations as failures.

**Slug derivation**: personal-name-first kebab-case for consistency with `character-generation`. Place-locator epithets that follow a personal name (e.g., "Namahan of the Third Gate") are preserved in the kebab-case slug (`namahan-of-the-third-gate`); the personal-name-first rule still holds.

**Critic-pass trace — two levels**: Phases 1, 2, 3, 5, 8, 9, 11 mandatory critic passes are recorded at TWO levels:

1. **Per-card** — one-line notes in the card's `critic_pass_trace` frontmatter at the template slots. The Phase 5 note captures what this specific seed addresses from the Phase 5 negative-space diagnosis; the Phase 11 note captures the theme/tone score-rationale for this seed.
2. **Per-batch** — full audit prose in the batch manifest's respective sections: Phase 1 in Registry Summary, Phase 3 in Constellation + Mosaic Audit, Phase 5 in Negative-Space Diagnosis, Phase 11 in Score Matrix, etc.

Both levels are required. Per-card slots provide seed-specific attribution; per-batch sections provide the full audit trail.

## Phase 15: Final Validation Tests

Run all 12 tests. Any FAIL halts and loops to the responsible phase. Record each as PASS / FAIL with one-line rationale in the batch manifest's Phase 15 Test Results section. **PASS without rationale = FAIL.**

**Per-card** (run over every card):

1. **(Rule 2, Phase 2 + 7)** Card has populated `institutional_embedding_checklist` with at least one non-"none" relation; card has non-empty `central_contradiction` tied to a world pressure.
2. **(Rule 2, Phase 7)** Card has populated `repeated_forced_choice` — not a biography fragment.
3. **(Rule 3, Phase 7)** Every capability has populated `how_learned` / `cost_to_acquire` / `teachers_institutions` / `unusual_or_ordinary` / `body_class_place_shape`.
4. **(Rule 4, Phase 10c)** Card's `canon_assumption_flags.status` ∈ {canon-safe, canon-edge, canon-requiring}; if canon-requiring, `implied_new_facts` non-empty with routing tag.
5. **(Rule 7, Phase 10b)** `canon_safety_check.mystery_reserve_firewall` lists every MR entry checked; non-empty MR with empty firewall list fails.
6. **(Rule 7, Phase 8 + 10b)** Card's `known_firsthand` + `wrongly_believes` contain no MR `disallowed cheap answers` match.
7. **(Phase 10a)** `canon_safety_check.invariants_respected` lists every invariant tested; no silent skips.
8. **(Phase 14 schema completeness)** No card field left TODO / placeholder / empty where the schema requires content.
9. **(Voice distinctiveness, Phase 9)** No two cards in the batch share the same voice family unless deliberate contrast is explicitly noted in the card's `notes`.

**Batch-level**:

10. **(Phase 13 diversification)** Diversification audit table is complete; empty slots have rationale; no silent empties.
11. **(Phase 10d)** Phase 10d check trace is complete for all pairs tested at generation time (including pairs involving seeds later dropped at Phase 10e).
12. **(Phase 12 audit)** Rejected-candidate log complete; each rejection cites trigger + diagnosis target.

## Phase 16: Commit

Present the deliverable summary:

1. Registry summary (Phase 1 count + Phase 2 essence-profile coverage)
2. Constellation + Mosaic audit (Phase 3 outputs)
3. Niche-occupancy map (Phase 4 filled / crowded / open)
4. Phase 5 Negative-Space Diagnosis (probes fired + remediation priorities)
5. Full batch — every surviving card's frontmatter + body. Full body prose on disk is mandatory per Phase 14; review-presentation may compress prose when batch size makes full-prose unwieldy.
6. Batch manifest (Phase 6 seed count + Phase 11 score matrix + Phase 12 rejected log + Phase 13 diversification audit + Phase 10d/e traces)
7. Canon Safety Check traces per card (Phase 10 audit)
8. Phase 15 test results with rationales
9. Per-card `canon_assumption_flags.status` + `recommended_next_step` (so the user can decide routing before accepting)
10. Target write paths

**HARD-GATE fires here.** User may: (a) approve as-is; (b) approve with drop-list of NCP-IDs; (c) request revisions (loop to named phase); (d) reject and abort.

### Drop-list behavior

- Surviving cards retain originally-allocated `NCP-NNNN` IDs (no renumbering); dropped IDs become permanent gaps.
- Slots formerly filled by dropped cards become empty in the written Phase 13 Diversification Audit with `user-drop at Phase 16` cited; no regeneration fires.
- Phase 10d trace in the written manifest covers all pairs tested at generation time, including pairs involving dropped cards (audit evidence that the full batch passed before drop).
- Phase 12 Rejected-Candidate Log is not affected by drops (different audit trail).

### Write order

On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity:

1. **Each non-dropped card first** — `worlds/<world-slug>/character-proposals/NCP-NNNN-<slug>.md` via direct `Write`. Set `source_basis.user_approved: true` immediately before each write. `user_approved: true` here means "kept in batch after review", NOT "accepted as a character".
2. **Batch manifest second** — `worlds/<world-slug>/character-proposals/batches/NCB-NNNN.md` via direct `Write` with `dropped_card_ids` populated and `user_approved: true`. Create `batches/` if absent.
3. **INDEX.md last** — `Read` existing file (create with header `# Character Proposal Cards — <World-Slug-TitleCased>` followed by a blank line if absent), append one line per non-dropped card in the form `- [<title>](NCP-NNNN-<slug>.md) — <depth_class> / <intended_narrative_role> / <canon_assumption_flags.status>, batch NCB-NNNN`, sort by NCP-NNNN ascending, write back via direct `Edit`.

All three paths sit under `worlds/<slug>/character-proposals/`, which Hook 3's hybrid-file allowlist permits for direct `Write` / `Edit`. Cards-first sequencing means a partial-failure state has either cards-without-index (detectable by grepping INDEX.md for card slugs) or a manifest-without-INDEX-row (detectable by grepping INDEX.md for the batch). **Recovery is manual.**

Report all written paths. Do NOT commit to git.
