# Governance and FOUNDATIONS Alignment

Covers original §Record Schemas, §FOUNDATIONS Alignment, and §Guardrails (full list — the thin SKILL.md carries an abbreviated summary).

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-record-schemas.md`:

- `STCHAR` (§4.5.19), `STENT`, `STSTAT`, `STINT`, `SF`, `BEL` (§4.1), `OBL`, `CNSQ`, `THR`, `CLK` (§4.5.14), `STSEC` (§4.5.15), `STQ` (§4.5.16), `SREL`, `STLOC`, `STOBJ`, `DA` — story-bundle record classes
- `PG` (§4.2) — page snapshot
- `SE` (§4.3) — event
- `SLT` (§4.4) — commitment block
- `BR` — branch
- `CHC` — emitted choice

The shared contract is the canonical schema reference. This skill does not duplicate schemas locally.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | mirror-facts, choices, validation | Shared contract §4 record schemas; validation step's state-delta grounding gate (gate 7). |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — bootstrap mirrors existing world canon; it does not introduce new species / rituals / technology / artifacts to world canon. Handoff to `canon-addition` when a story claim is promoted via `story-fact-promotion-to-canon`. |
| Rule 3 (No Specialness Inflation) | N/A | Not applicable — same handoff as Rule 2; bootstrap does not add exceptional capabilities to world canon. |
| Rule 4 (No Globalization by Accident) | stchar-distillation, mirror-facts, validation | STCHAR keeps selected-cast `CHAR` as provenance only; mirrored SF records carry parent CF ids in `derived_from`; validation step's bootstrap-additional check 3 rejects scope-widening. |
| Rule 5 (No Consequence Evasion) | debts, validation | Good-debt-vs-bad-debt filter at the debts phase; optional CLK / STSEC / STQ seeds must be present-causal and root-choice-relevant; validation step's gate 6 (consequence capacity / terminal proof). |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — bootstrap creates new story-bundle records; it does not mutate world canon. World canon mutation routes through `canon-addition` (the only Rule-6-enforcing skill). |
| Rule 7 (Preserve Mystery Deliberately) | state-seed, validation | `forbidden_mystery_resolutions` enumerated in state seed; validation step's gate 3 (mystery firewall). |
| Rule 11 (No Spectator Castes) | N/A | Not applicable — Rule 11 governs new exceptional capabilities at world canon; bootstrap does not add them. |
| Rule 12 (No Single-Trace Truths) | N/A | Not applicable — Rule 12 governs hard-canon core truths; bootstrap operates at story-bundle scope, not world canon. |
| Canon Layers | Pre-flight, stchar-distillation, mirror-facts | Bootstrap reads world canon (layers 1-4 + Mystery Reserve) via context packet; story-bundle records carry story-local truths per FOUNDATIONS §Story Bundles §1. |
| Mystery Reserve | Pre-flight, state-seed, validation | World mysteries loaded via context packet; `forbidden_mystery_resolutions` enumerated; validation step's gate 3 enforces firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | root-event-and-page, commit | Story state is authoritative at PG-1 commit; no prose plan or rendered prose is written by this skill; the page snapshot is the fork primitive. No ARC_TRACE record emitted. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | commitment-blocks | Seed `SLT` records follow the §4.4 schema discipline; no `arc_contract` / `dramatic_unit` / `execution_envelope` / nested `effect_model` / `stop_policy` / `shape:` / `record_version` discriminators. |
| §Story Bundles §5b (Schema-Minimalism) | All record-drafting phases | Every drafted record (STCHAR/STENT/STSTAT/STINT/SF/BEL/SE/OBL/CNSQ/THR/CLK/STSEC/STQ/SREL/STLOC/STOBJ/DA/BR/PG/CHC/SLT) conforms to the shared contract §4 schemas; nice-to-have fields are not added at this skill. |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape) | debts, commitment-blocks | Optional STQ seeds track present open-setup state only; optional CLK/STSEC/STQ seeds must not encode act structure, expected payoff modes, dramatic curve positions, or global drama-manager targets. |
| §Story Bundles §6a (Belief vs. Fact) | beliefs | Initial belief state uses `BEL` (not `SF`) for false beliefs / suspicions / rumors / lies / private assumptions; `truth_relation` and `visibility` set per shared contract §4.1. |
| §Story Bundles §6.1 (Story-Local Character Authority) | stchar-distillation, beliefs, root-event-and-page, validation | Bootstrap distills selected cast `CHAR` into STCHAR before state creation; non-background `STENT` uses `bound_stchar_id`; `PG.active_records.STCHAR` carries runtime authority; `source_char_id` remains provenance only. |
| Change Control Policy | N/A | Not applicable — canon-reading skill does not emit Change Log Entries. Handoff to `canon-addition` when story claims promote to canon. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet` per FOUNDATIONS §Tooling Recommendation. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<subdir>/*.yaml` (CF / CH / INV / M / OQ / ENT / SEC); this skill NEVER attempts such writes. Story-bundle records under `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` are this skill's exclusive write surface, routed through the patch engine.
- **Never write rendered prose or render plans at bootstrap.** Prose is planned and rendered by downstream scene-layer workflows. Bootstrap writes only state records, `STORY_KERNEL.md`, and indexes.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every field in every record drafted by this skill conforms to the shared contract §4 schemas. No nice-to-have fields, no derived rollups, no legacy lifecycle fields (no `prose_status`, no `state_delta_summary`, no `record_version`, no `shape:` discriminator, no `stop_policy`). Each retained field is consumed by a validation gate, replay primitive, predicate, fork operation, or audit-trail record.
- **No word-count targets.** Pacing is expressed structurally via records, choices, and stop conditions, not as a per-page or per-arc word quota.
- **Skills do not chain.** Bootstrap never invokes `branching-story-turn-cycle`, `branching-story-scene-plan`, `branching-story-scene-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. Bootstrap writes its outputs to disk; the user separately invokes downstream siblings with the bundle path as input.
- **No runtime `CHAR` authority after bootstrap distillation.** `selected_cast[]` remains a bootstrap input and `source_char_id` remains STCHAR provenance. Runtime records, choices, scene plans, and downstream skills consume `STCHAR` / `STENT.bound_stchar_id` / `PG.active_records.STCHAR`, not world `CHAR` dossiers.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root, not the main repo root.
