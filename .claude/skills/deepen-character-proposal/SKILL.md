---
name: deepen-character-proposal
description: "Use when deepening one user-authored character seed or one existing NCP proposal card into a stronger protagonist-grade NCP proposal card. Produces one improved NCP card; never writes canon; never writes a CHAR dossier."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: input_path
    description: "Path to a markdown seed brief or existing NCP proposal card to deepen."
    required: true
  - name: upgrade_intensity
    description: "Optional: tempered | radical | feral. Default: radical."
    required: false
  - name: canon_risk_tolerance
    description: "Optional: conservative | open_to_edge | open_to_canon_requiring. Default: open_to_edge."
    required: false
  - name: output_mode
    description: "Optional: preview_only | write_after_approval. Default: write_after_approval."
    required: false
---

# Deepen Character Proposal

Deepens one user seed or one existing NCP card into a stronger protagonist-grade NCP proposal card. This is a single-seed radicalizer, not a batch generator and not character realization. It reuses the existing `propose_new_characters` MCP context profile and writes only under `worlds/<world-slug>/character-proposals/` after explicit approval.

<HARD-GATE>
Do NOT write any file until: (a) pre-flight resolves `worlds/<world-slug>/` and the `input_path`; (b) `docs/FOUNDATIONS.md`, `worlds/<world-slug>/WORLD_KERNEL.md`, `worlds/<world-slug>/ONTOLOGY.md`, and `.claude/skills/_shared-references/protagonist-grade-character-engine.md` have been loaded; (c) context has been loaded with `task_type='propose_new_characters'` seeded on the input brief or NCP; (d) existing CHAR/NCP registry overlap has been checked; (e) invariant and Mystery Reserve firewall surfaces have been loaded; (f) at least five mutation candidates have been generated, scored, and filtered, with rejected directions recorded; (g) the upgraded NCP preview has been shown to the user; and (h) the user explicitly approves the write. This gate is absolute under Auto Mode. Skill invocation is not approval.
</HARD-GATE>

## Inputs

- `world_slug`: existing world directory slug. Strip a leading `worlds/` prefix, then require `[a-z0-9-]+`.
- `input_path`: markdown seed brief or existing NCP card. Resolve from the worktree root; abort if missing.
- `upgrade_intensity`: `tempered`, `radical`, or `feral`; default `radical`.
- `canon_risk_tolerance`: `conservative`, `open_to_edge`, or `open_to_canon_requiring`; default `open_to_edge`.
- `output_mode`: `preview_only` or `write_after_approval`; default `write_after_approval`.

## Output

- One upgraded NCP card at `worlds/<world-slug>/character-proposals/NCP-<integer>-<slug>.md`.
- One `character-proposals/INDEX.md` update.
- No NCB manifest. Single-seed upgrades omit `batch_id`; `upgrade_lineage.origin_kind` is `upgraded_seed` for existing NCP input or `user_seed` for seed briefs.

The output card uses `templates/upgraded-proposal-card.md`. Its `memorability_profile` field names must match `.claude/skills/_shared-references/protagonist-grade-character-engine.md` and the `propose-new-characters` proposal-card template. It is directly consumable by `character-generation` as `character_brief_path`.

## Process Flow

```
Pre-flight (world, input, doctrine, context, registries, firewall)
      |
      v
Seed Essence Extraction
      |
      v
Blandness Diagnosis + World-Pressure Map
      |
      v
5-8 Mutations Across Required Spread
      |
      v
Two-Layer Scoring + Rejection Triggers
      |
      v
Select Strongest Surviving Candidate
      |
      v
Canon Routing + Card Composition
      |
      v
Deterministic Validation + Critic Passes
      |
      v
Preview --> explicit approval --> write NCP + INDEX
```

## Procedure

1. **Pre-flight.** Resolve `world_slug`; verify `worlds/<world-slug>/` exists. Resolve `input_path`; classify it as `markdown_brief` or `existing_ncp_card`. Load `docs/FOUNDATIONS.md`, `worlds/<world-slug>/WORLD_KERNEL.md`, `worlds/<world-slug>/ONTOLOGY.md`, `.claude/skills/_shared-references/protagonist-grade-character-engine.md`, and this skill's upgraded-card template. Read `worlds/<world-slug>/character-proposals/INDEX.md` if present. Abort on missing world or input. Do not write.

2. **Context and registry overlap.** Load context with `mcp__worldloom__get_context_packet(task_type='propose_new_characters', seed_nodes=[<input-derived canonical ids>], token_budget=15000)`. Resolve display names through `mcp__worldloom__find_named_entities` before using them as packet seeds. Load the existing character/proposal registry with `mcp__worldloom__list_records` over `character_record`, `diegetic_artifact_record`, `adjudication_record`, and available `character_proposal_card` records; if the proposal-card record type is unavailable before the validator/index tickets land, read `character-proposals/INDEX.md` and the input NCP directly as the fallback registry surface. Check slug, name, role, species/body premise, institutional niche, and dramatic-engine overlap. Existing overlap can narrow the mutation but must not silently overwrite another card.

3. **Seed essence extraction.** Separate non-negotiables from negotiables. Non-negotiables can include world location, species/body premise, institutional slot, user constraints, taboo limits, relationship constraints, and any NCP `memorability_profile.seed_essence_preserved` entries. Negotiables can include profession expression, rank, wound, shame, appetite, moral edge, relationship shape, canon posture, voice, and pressure behavior. Preserve the seed's core promise; mutate the engine around it.

4. **Blandness diagnosis.** Name why the seed or NCP is currently weak, predictable, generic, over-polite, cosmetically strange, under-pressured, relationship-neutral, canon-avoidant, or interchangeable. Tie each diagnosis to a missing or flattened engine field.

5. **World-pressure map.** Map relevant world pressures onto the seed: canon facts, section records, institutions, species/body logic, economy, geography, law, taboo, religion, kinship, resource scarcity, epistemic limits, invariants, and Mystery Reserve boundaries. Do not invent canon to solve the character. If a strong mutation implies new facts, record the implication for routing.

6. **Generate mutations.** Produce 5-8 mutation candidates using the shared reference's spread: darker, more pathetic or humiliating, more institutionally dangerous, more ordinary but sharper, canon-edge or canon-requiring if world-valid, and premise-reversal preserving essence. Each candidate states the seed essence preserved, the engine fields changed, and the world pressure that makes the change plausible.

7. **Score and reject.** Score candidates on the two-layer rubric from the shared reference: world validity plus memorability, using `aggregate = validity_total + 1.5 * memorability_total - canon_burden - overlap_risk`. Apply the rejection triggers, including valid-but-dull, abstract contradiction, missing appetite, missing self-mythology, interchangeable pressure behavior, cosmetic weirdness, relationship-neutrality, sanded-off moral edge, timid mutation, suppressed canon-requiring brilliance, vocabulary-only voice, and unexplained exceptionality. Record at least three rejected directions in `upgrade_lineage.rejected_directions_audit[]`.

8. **Select and route canon posture.** Select the strongest surviving candidate, not the safest one. Classify `canon_assumption_flags.status` as `canon-safe`, `canon-edge`, or `canon-requiring`. For `canon-requiring`, list each implied fact with `{ statement, reason_needed, preferred_route }`, where `preferred_route` is `canon-addition` for precise local implications or `propose-new-canon-facts` for systemic clusters. Never write CF, CH, INV, M, OQ, ENT, SEC, WORLD_KERNEL, ONTOLOGY, or any `_source/` record.

9. **Compose the upgraded NCP card.** Allocate `NCP-<integer>` with `mcp__worldloom__allocate_next_id(world_slug, 'NCP')`. Derive a non-colliding slug from the title/name. Fill `templates/upgraded-proposal-card.md`, including the character-generation compatibility fields, `memorability_profile`, `upgrade_lineage`, two-layer `scores`, `critic_pass_trace.blandness_executioner`, `critic_pass_trace.protagonist_grade_critic`, `canon_safety_check`, and `source_basis`. Omit `batch_id` for single-seed upgrades.

10. **Deterministic validation.** Before preview, check that required fields are non-empty; `memorability_profile` contains all 10 canonical fields; `pressure_behavior` has all five keys; `voice_under_pressure` has all four keys; `relational_charge` has at least one charged relation with need plus likely harm or betrayal; `signature_scene_behaviors` has at least three entries; canon-requiring cards have non-empty `implied_new_facts`; upgraded-seed cards include a `## Rejected Directions Audit` body section with at least three entries; no TODO or placeholder remains.

11. **Critic passes.** Run the Blandness Executioner and Protagonist-Grade Critic from the shared reference. Each PASS must include a one-line rationale. A bare PASS is FAIL. If either critic fails, loop to the responsible phase before preview.

12. **Preview.** Show the upgraded NCP card, rejected-directions audit, scores, canon routing, overlap check, validation results, and target paths. If `output_mode=preview_only`, stop here with no write.

13. **Write after approval.** Only after explicit user approval, write the NCP card to `worlds/<world-slug>/character-proposals/NCP-<integer>-<slug>.md` and update `worlds/<world-slug>/character-proposals/INDEX.md`. Create `character-proposals/` if absent. The INDEX line format is `- [<title>](NCP-<integer>-<slug>.md) - <depth_class> / <intended_narrative_role> / <canon_assumption_flags.status>, upgraded from <input_path>`, sorted by NCP id ascending.

## Guardrails

- Mutates only `worlds/<world-slug>/character-proposals/`.
- Never writes canon, `_source/`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, `characters/`, `characters/INDEX.md`, or an NCB manifest.
- Never overwrites an existing proposal card or INDEX row. If allocation or slug collision occurs, abort and ask the user to resolve it.
- Does not introduce a dedicated upgrade task type, a new ranking profile, a new token budget, or a new context-packet contract row. Use `task_type='propose_new_characters'`.
- Does not create an `NCU-<integer>` upgrade-audit record. The compact audit lives in `upgrade_lineage.rejected_directions_audit[]`.
- Keeps story-system-specific fields out of NCP. No arc beat, act position, plot destiny, or companion quest fields.
- Canon-requiring brilliance is routed, not flattened and not asserted.
- Worktree paths resolve from the current worktree root.
- Do NOT commit to git.

## Final Rule

An upgraded NCP is not written until the seed essence is preserved, the selected mutation is world-produced, the protagonist-grade engine is fully populated, rejected directions and critic rationales are recorded, canon posture is routed, registry overlap is checked, and the user approves the preview. Once written, the card is a proposal for `character-generation` or canon-routing follow-up, never an established character and never canon by itself.
