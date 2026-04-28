# Governance and FOUNDATIONS Alignment

Cross-cutting reference material: which validation rules this skill upholds, the full phase-to-principle alignment table, the dossier record schema, and the complete guardrails list. The thin SKILL.md keeps the short "Hard Rules" summary; this doc holds the exhaustive version.

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 1 (every material-reality fact must cite a loaded file) + Phase 2 (institutional embedding required; "modern individual in costume" rejected) + Phase 5 (capabilities grounded in world mechanisms) + Phase 6 (voice shaped by embedding, not chosen as flavor) + Phase 8 Tests 1-2 and 10.
- **Rule 3: No Specialness Inflation** — Phase 5 (every capability has `how_learned` / `cost_to_acquire` / `teachers_institutions` / `unusual_or_ordinary` / `body_class_place_shape`) + Phase 7d (repair stabilizers must name concrete mechanisms — no "they just don't use it much") + Phase 8 Test 3.
- **Rule 4: No Globalization by Accident** — Phase 5 (first-pass CF distribution check) + Phase 7c (hard gate: every capability either fits `distribution.who_can_do_it` or has a Phase-2-embedded exception recorded in `world_consistency.distribution_exceptions`) + Phase 8 Tests 4 + 7.
- **Rule 7: Preserve Mystery Deliberately** — Phase 3 (epistemic position includes explicit `cannot know` and `wrongly believes` fields) + Phase 7b (firewall with explicit `world_consistency.mystery_reserve_firewall` audit list) + Phase 8 Tests 5-6 (empty firewall with non-empty Mystery Reserve fails; forbidden-answer leakage into `known_firsthand` or `wrongly_believes` fails).

## Record Schemas

- **Character Dossier** → `templates/character-dossier.md` (hybrid YAML frontmatter + markdown body; original to this skill). Frontmatter fields: `character_id`, `slug`, `name`, `species`, `age_band`, `place_of_origin`, `current_location`, `date`, `social_position`, `profession`, `kinship_situation`, `religious_ideological_environment`, `major_local_pressures`, `intended_narrative_role`, `world_consistency` (with `canon_facts_consulted`, `invariants_respected`, `mystery_reserve_firewall`, `distribution_exceptions`, `continuity_checked_with`), `source_basis` (with `world_slug`, `generated_date`, `user_approved`), `notes`. Markdown body sections: Material Reality, Institutional Embedding, Epistemic Position, Goals and Pressures, Capabilities, Voice and Perception, Contradictions and Tensions, Likely Story Hooks, Canon Safety Check Trace.

No Canon Fact Record or Change Log Entry is emitted — see the thin SKILL.md's Output section for the full canon-reading posture.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | docs/FOUNDATIONS.md (direct Read) + WORLD_KERNEL.md + ONTOLOGY.md (direct Read) + atomic-record context packet via `mcp__worldloom__get_context_packet(task_type='character_generation', ...)`; SEC-MTS records selectively retrieved at Phase 0 via `search_nodes` if magical/tech capability is implicated |
| Canon Layers §Hard / Soft / Contested | Phase 7 | Character beliefs classified against their source: hard canon in `known_firsthand` only if observably true; folk beliefs and propaganda routed to `known_by_rumor` or `wrongly_believes`; no character silently promotes contested canon to objective truth |
| Canon Layers §Mystery Reserve | Phase 7b | Explicit firewall with audit list in `world_consistency.mystery_reserve_firewall` |
| Invariants §full schema | Phase 7a | Every invariant tested; `break conditions` and `revision difficulty` fields guide Phase 7d repair paths |
| Ontology Categories | Phase 5 | Every capability attaches to declared ontology categories per `ONTOLOGY.md` |
| Rule 2 (No Pure Cosmetics) | Phases 1, 2, 5, 6, 8 | Material-reality citation requirement + institutional embedding + capability grounding + voice-from-embedding + Tests 1-2 |
| Rule 3 (No Specialness Inflation) | Phases 5, 7d, 8 | Stabilizer-required + no-hand-wave repairs + Test 3 |
| Rule 4 (No Globalization by Accident) | Phases 5, 7c, 8 | First-pass CF check + hard-gate distribution conformance + Tests 4 + 7 |
| Rule 7 (Preserve Mystery Deliberately) | Phases 3, 7b, 8 | Epistemic position with explicit cannot-know + firewall audit + Tests 5-6 |
| World Queries #6 ("What kinds of people can plausibly exist here?") | Phase 8 | Test 10 requires at least 3 cited world-grown specificity axes across profession, capability, institution, voice, body/personhood, and epistemic position |
| World Kernel §Core Pressures | Phase 4 | Character internal contradictions instantiate world core pressures at individual scale |
| World Kernel §Tonal Contract | Phase 6 | Voice calibrated to world tonal register |
| Change Control Policy | N/A | Not applicable — this skill is canon-reading; no Change Log Entry emitted. Future canonization of a specific NPC is handled by `canon-addition`, which emits the Change Log Entry there. |

## Full Guardrails

- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- This skill **never writes to world-level canon records** — not `WORLD_KERNEL.md`, `ONTOLOGY.md`, nor any `_source/<subdir>/*.yaml` record (CF / CH / INV / M / OQ / ENT / SEC). Hook 3 enforces. All writes are confined to `worlds/<world-slug>/characters/`: the dossier file lands via the engine's `append_character_record` op through `submit_patch_plan`; `INDEX.md` is maintained via direct `Edit` (Hook 3's hybrid-file allowlist permits it).
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `character_brief_path`. Repo-root writes are forbidden.
- If a pre-flight `next_char_id` or `<char-slug>.md` would collide with an existing file, the skill aborts. Never overwrite an existing dossier. Character dossiers, once committed, are treated as existing state.
- This skill **proposes characters; it does not canonize them**. If the user later wants a specific NPC to become world-level hard canon (a named faction leader, a ruler whose existence is a fact the world tracks), that is a separate `canon-addition` run whose proposal cites the existing dossier. The character's existence is *not* hard canon merely by virtue of a dossier existing.
- Phase 3 and Phase 7b are the two Rule 7 enforcement points. If a future maintainer adds a phase between them that exposes the character to Mystery Reserve content, that phase must either extend the firewall audit or be explicitly classified as out-of-scope for Rule 7 (documented in `notes`).
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root (so `worlds/<slug>/characters/` is under the worktree, not the main repo).
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.
- The HARD-GATE at the top of the thin SKILL.md is absolute. No `Write` or `Edit` to `worlds/<world-slug>/characters/` until Phase 7 Canon Safety Check passes clean, Phase 8 validation tests pass clean, AND the user approves the Phase 9 deliverable summary. Auto Mode does not override this — skill invocation is not deliverable approval.
