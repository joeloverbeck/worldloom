# Prose Renderer Contract

This folder is the canonical source for the three renderer-bound blocks inlined verbatim into every per-page plan body authored by the story-skill family:

| File | Inlined as | Authored by |
|---|---|---|
| `content-policy.md` | page-plan §2 | `branching-story-bootstrap` Phase 8, `branching-story-turn-cycle` Phase 7 |
| `prose-craft-contract.md` | page-plan §3 | `branching-story-bootstrap` Phase 8, `branching-story-turn-cycle` Phase 7 |
| `render-time-instruction.md` | page-plan §19 | `branching-story-bootstrap` Phase 8, `branching-story-turn-cycle` Phase 7 |

The page-plan minimum contract — what each of the 19 sections is and where each comes from — is documented at `.claude/skills/_shared-templates/story-state-contract.md` §8.

## External-Renderer Usage Guide

**The plan IS the prompt.** The plan-authoring skills (`branching-story-bootstrap` Phase 8 and `branching-story-turn-cycle` Phase 7) inline §Content Policy, §Prose Craft Contract, and §Render-Time Instruction Template from this folder into the per-page plan body as §2, §3, and §19 respectively. The rendered plan at `worlds/<world-slug>/stories/<story-slug>/pages-prose-plans/PG-<integer>.md` is therefore self-contained.

Send §1 through §19 of the per-page plan body verbatim as the user-facing prompt to your renderer (manual or automated — e.g., OpenRouter Opus 4.7). **Do not concatenate these source files at render time** — doing so duplicates §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template, which are already inlined as plan §2 / §3 / §19.

The plan body §1-§19 supplies every block the renderer needs: story kernel excerpt (§1), Content Policy (§2), Prose Craft Contract (§3), relevant world-canon excerpt (§4), active cast and entity statuses (§5), current location and affordances (§6), selected event with state delta (§7), optional turn driver / initiative trace (§7a) on turn_resolution pages, required beats from the commitment block (§8), relationship and belief context (§9), optional active actor plans (§9b) and emotional causality (§9c), open obligations / consequences / threads (§10), optional open setups / active clocks / hidden secrets (§10b), forbidden mystery resolutions (§11), stopping point (§12), next choices (§13), optional recent prose continuity (§14), plan frontmatter with engine fields (§15), optional cast material reality projection (§16), STCHAR-derived character authority packets (§16a) when relevant, optional style and register notes (§17), anti-pathology checklist (§18), and the trailing Render-Time Instruction block (§19).

Expected output:

- **Continuous prose only.** No commentary on the rendering process, no chain-of-thought, no critique of the plan, no questions back to the user.
- **No markdown headers.** No `# Beat 1` / `## Beat 2` / `### Stage` enumeration of the beat plan. Beat structure lives in the prompt; the rendered prose embodies the beats as scene movement.
- **No engine vocabulary.** Record ids, axis names, rule numbers, and contract terminology stay in the prompt and the critic verdicts; they never appear in narration, dialogue, or interiority.

The rendered prose lands at `pages-prose/PG-<integer>.md`. Run `branching-story-prose-attach` to validate and attach — that skill runs the eight deterministic prose/state checks per `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 (`hash_integrity`, `engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `choice_consequence_visibility`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority`), the `char_authority_leak` surface, the STCHAR packet integrity checks, and the optional 7-axis qualitative craft critic (when `run_craft_critic: true`), against the rendered prose. The skill emits a `pages-prose-receipts/PG-<integer>.yaml` receipt with a PASS / WARN / FAIL roll-up plus a `repair_recommendation` of `none | revise_prose | run_turn_cycle_repair | run_story_fact_promotion_to_canon` that routes back to the named lawful repair path on the next invocation. The external renderer does not own the validation loop; it owns only the production of one prose draft per invocation.

Per-story `forbidden_resolutions[]` are inlined into each plan file at plan-authoring time, not into this folder. This folder is the canonical source bundle for plan §2 / §3 / §19 — it carries no per-story or per-bundle context.

## Forbidden compaction

§2, §3, and §19 are inlined verbatim on every page plan. This is operationally load-bearing: the external prose renderer has no cross-plan state — every page render is a cold context. Compacting these sections on subsequent pages would force the user to manually re-paste the canonical content on every render, defeating the self-contained-plan contract. Skills must not propose compacting these sections across pages.

## Diagnostic Vocabulary dual-purpose note

The Diagnostic Vocabulary table at the end of `prose-craft-contract.md` is consumed in two distinct modes:

1. As part of the verbatim §3 block shipped with every page plan.
2. As the internal citation vocabulary for `branching-story-prose-attach` Phase 4's qualitative craft critic. The eight axis names are the citation tokens used in verdicts.

Edits to the table must preserve both consumption modes.
