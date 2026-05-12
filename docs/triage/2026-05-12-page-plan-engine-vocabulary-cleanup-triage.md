# 2026-05-12 — Page-plan engine-vocabulary cleanup triage

## Source

User-reported failure in `worlds/erotica-world/stories/red-bunny/pages-prose/PG-0003.md` line 1 ("Her sleeve moved.") contradicting Ane Arrieta's crop-top wardrobe in `worlds/erotica-world/characters/ane-arrieta.md:89`. User also flagged broader concern: page-plan bodies contain engine-vocabulary content that is unnecessary or counterproductive for the external prose renderer.

Analysis (see brainstorm transcript 2026-05-12) traced the failure to four sites inside `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-0003.md` (SLT-0012 `notes:` field at §15 lines 742-746; frontmatter `declared_visible_affordances[0]` at line 31; §8 cast intentions at line 378; §19 render-time instruction beat 1 at line 814) and one upstream structural gap (the bootstrap CHAR pre-flight projection at `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md:15` does NOT project `body.Material Reality`, where the dossier's clothing data lives).

Approach B (recommended; renderer-facing body cleanup + Material Reality projection + clothing-consistency gate; preserve §2 / §3 / §19 verbatim per the operational constraint that the external LLM has no cross-plan state) was selected by the user 2026-05-12.

## Accepted (7 tickets)

- `archive/tickets/PPLAN-001-cast-material-reality-projection.md` — completed; adds `body.Material Reality` to CHAR-dossier projection in bootstrap + page-cycle pre-flight + canonical template + both phase-7 references. Blocks archived PPLAN-003 and completed PPLAN-004.
- `archive/tickets/PPLAN-002-mystery-enumeration-restriction.md` — completed; restricts §7 / §18 body mystery enumeration to engaged mysteries; non-engaged forbidden mysteries stay in `frontmatter.forbidden_resolutions[]` only.
- `archive/tickets/PPLAN-003-clothing-consistency-check.md` — completed; adds Phase-7-post-LLM deterministic gate `cast_material_reality_consistency` validating body-part affordances/intentions against projected Material Reality clothing summary. Depends on archived PPLAN-001 projection landing.
- `archive/tickets/PPLAN-004-storylet-notes-character-agnostic-gestures.md` — completed; storylet-pool-authoring discipline: cast-agnostic storylet `notes:` use character-agnostic body language; cast-locked storylets may carry character-specific clothing detail after Material Reality verification.
- `tickets/PPLAN-005-slt-schema-to-prose-translation.md` — §15 (Selected scene-commitment arc) replaces verbatim SLT YAML inlining with prose-direction translation (storylet `notes`, `user_intent`, `scene_question`, `natural_close_definition`, chosen variant `required_effects` paraphrase). Engine fields stay in frontmatter for validator readback.
- `tickets/PPLAN-006-obligations-threads-consequences-prose-translation.md` — §10 / §11 / §12 body replaces engine-narrative vocabulary ("Salience 6, urgency 7", "current_pressure 8", "consequence_address ops") with prose-direction translation. Numeric values stay in atomic records + state_snapshot.
- `tickets/PPLAN-007-forbidden-engine-vocabulary-body-cleanup.md` — drop the 28-prefix `forbidden_engine_vocabulary[]` enumeration from §18 / §19 body view; one-line negative discipline replaces it. Frontmatter list unchanged; Phase 2 finalize regex scan unchanged.

## Dismissed (1 item)

- **§3 Prose Craft Contract compaction across pages** (proposed in brainstorm Approach B item 4: "keep inlined for bootstrap PG-0001, reduce to a compact 6-8-bullet recap for subsequent pages"). Dismissed by user 2026-05-12 — operationally load-bearing constraint: the user renders each page by copy/pasting the plan to an external LLM (manual or API). The external LLM has no cross-plan state; every page render is a cold context. Compacting §3 on later pages forces manual re-paste of the full Prose Craft Contract every page, defeating the self-contained-plan contract. Captured as feedback memory `feedback_page_plan_verbatim_sections.md` for future brainstorms on this pipeline.

## Follow-ups (no tickets; surfaced for awareness)

- **Audit existing storylet pool for character-specific clothing detail.** SLT-0012 is the named historical case; other storylets in `worlds/erotica-world/stories/red-bunny/_source/storylets/` and other story bundles may carry similar character-specific gestural anchors. PPLAN-004 prevents new occurrences; PPLAN-003 catches symptoms at runtime; an explicit audit pass over existing storylet pools is a separate workflow (`branching-story-health-audit` is the natural home; could be a future audit-mode invocation).
- **`branching-story-health-audit` could add a new audit check** that scans each storylet's `notes:` for closed-wordlist garment kinds + verifies the words match wardrobe data for any cast member the storylet has been or will be selected against. This is a future ticket if it becomes a recurring concern; currently the upstream discipline (PPLAN-004) + the runtime gate (PPLAN-003) are the two-layer defense.
- **`reports/prose-quality-instructions.md` ownership.** PPLAN-007 routes the §19 update through this file. If the file is structured as a single canonical source for §2 / §3 / §19 (per the canonical template's verbatim-inlining commitment), confirm the file's editing discipline is stable; future cleanup tickets that touch §19 should always route through this upstream rather than per-skill modification.
