# Prose Renderer Contract

This folder is the canonical source for the three renderer-bound blocks inlined verbatim into every per-page plan body and every scene-plan body authored by the story-skill family:

| File | Inlined as | Authored by |
|---|---|---|
| `content-policy.md` | page-plan §2; scene-plan Content Policy | `branching-story-bootstrap` Phase 8, `branching-story-turn-cycle` Phase 7, `branching-story-scene-plan` |
| `prose-craft-contract.md` | page-plan §3; scene-plan Prose Craft Contract | `branching-story-bootstrap` Phase 8, `branching-story-turn-cycle` Phase 7, `branching-story-scene-plan` |
| `render-time-instruction.md` | page-plan §19; scene-plan Render-Time Instruction | `branching-story-bootstrap` Phase 8, `branching-story-turn-cycle` Phase 7, `branching-story-scene-plan` |

The page-plan minimum contract — what each of the 19 sections is and where each comes from — is documented at `.claude/skills/_shared-templates/story-state-contract.md` §8. The scene-plan structure is documented beside the `SCN` contract in the shared story-state templates and operationalized by `.claude/skills/branching-story-scene-plan/`.

## External-Renderer Usage Guide

**The plan IS the prompt.** The plan-authoring skills (`branching-story-bootstrap` Phase 8, `branching-story-turn-cycle` Phase 7, and `branching-story-scene-plan`) inline §Content Policy, §Prose Craft Contract, and §Render-Time Instruction Template from this folder into the per-page or per-scene plan body. The rendered plan at `worlds/<world-slug>/stories/<story-slug>/pages-prose-plans/PG-<integer>.md` or `worlds/<world-slug>/stories/<story-slug>/scene-prose-plans/SCN-<integer>.md` is therefore self-contained.

Send the full per-page or per-scene plan body verbatim as the user-facing prompt to your renderer (manual or automated — e.g., OpenRouter Opus 4.7). **Do not concatenate these source files at render time** — doing so duplicates §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template, which are already inlined into the plan.

The plan body §1-§19 supplies every block the renderer needs: story kernel excerpt (§1), Content Policy (§2), Prose Craft Contract (§3), relevant world-canon excerpt (§4), active cast and entity statuses (§5), current location and affordances (§6), selected event with state delta (§7), optional turn driver / initiative trace (§7a) on turn_resolution pages, required beats from the commitment block (§8), relationship and belief context (§9), optional active actor plans (§9b) and emotional causality (§9c), open obligations / consequences / threads (§10), optional open setups / active clocks / hidden secrets (§10b), forbidden mystery resolutions (§11), stopping point (§12), next choices (§13), optional recent prose continuity (§14), plan frontmatter with engine fields (§15), optional cast material reality projection (§16), STCHAR-derived character authority packets (§16a) when relevant, optional style and register notes (§17), anti-pathology checklist (§18), and the trailing Render-Time Instruction block (§19).

Expected output:

- **Continuous prose only.** No commentary on the rendering process, no chain-of-thought, no critique of the plan, no questions back to the user.
- **No markdown headers.** No `# Beat 1` / `## Beat 2` / `### Stage` enumeration of the beat plan. Beat structure lives in the prompt; the rendered prose embodies the beats as scene movement.
- **No engine vocabulary.** Record ids, axis names, rule numbers, and contract terminology stay in the prompt and the critic verdicts; they never appear in narration, dialogue, or interiority.

Page rendered prose lands at `pages-prose/PG-<integer>.md`. Run `branching-story-prose-attach` to validate and attach — that skill runs the eight deterministic prose/state checks per `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 (`hash_integrity`, `engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `choice_consequence_visibility`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority`), the `char_authority_leak` surface, the STCHAR packet integrity checks, and the optional 7-axis qualitative craft critic (when `run_craft_critic: true`), against the rendered prose. The skill emits a `pages-prose-receipts/PG-<integer>.yaml` receipt with a PASS / WARN / FAIL roll-up plus a `repair_recommendation` of `none | revise_prose | run_turn_cycle_repair | run_story_fact_promotion_to_canon` that routes back to the named lawful repair path on the next invocation.

Scene rendered prose lands at `scene-prose/SCN-<integer>.md`. Run `branching-story-scene-prose-attach` to validate and attach it against every `PG` in `SCN.pg_ids`; that skill writes `scene-prose-receipts/SCN-<integer>.yaml`, updates the bundle index, and never mutates `PG`, `SCN`, `SE`, or other story `_source` state. The external renderer does not own either validation loop; it owns only the production of one prose draft per invocation.

Per-story `forbidden_resolutions[]` and scene-range forbidden-resolution material are inlined into each plan file at plan-authoring time, not into this folder. This folder is the canonical source bundle for the shared renderer-bound blocks — it carries no per-story or per-bundle context.

## Forbidden compaction

The renderer-bound blocks are inlined verbatim on every page plan and every scene plan. This is operationally load-bearing: the external prose renderer has no cross-plan state — every render is a cold context. Compacting these sections on subsequent pages or scenes would force the user to manually re-paste the canonical content on every render, defeating the self-contained-plan contract. Skills must not propose compacting these sections across pages or scenes. Byte-equality between the post-framing payloads in this folder and the inlined page-plan sections is enforced by the `page_plan_verbatim_section_integrity` structural validator; scene plans use `scene_plan_verbatim_section_integrity`.

## Diagnostic Vocabulary dual-purpose note

The Diagnostic Vocabulary table at the end of `prose-craft-contract.md` is consumed in two distinct modes:

1. As part of the verbatim §3 block shipped with every page plan.
2. As the internal citation vocabulary for `branching-story-prose-attach` Phase 4's qualitative craft critic. The eight axis names are the citation tokens used in verdicts.

Edits to the table must preserve both consumption modes.

## Sections dropped from the pre-2026-05-26 bundle

The pre-relocation bundle at `reports/prose-quality-instructions.md` (deleted 2026-05-26 by PROSESPLIT2-004) contained three additional sub-sections that were dropped in the relocation as redundant duplicates of content elsewhere in this folder:

- **§Anti-Pathology Checklist**: reformulation of the Diagnostic Vocabulary table at the end of `prose-craft-contract.md`. Page-plan §18 ("Anti-pathology checklist") is per-skill populated; no live consumer cited the bundle's §Anti-Pathology Checklist by file path. SPEC-91 (archived 2026-05-26) already directed plain-language craft framing rather than axis-name enumeration in renderer prompts.
- **§Voice and Register Guidance**: standalone restatement of Prose Craft Contract Rule 7. The substance lives verbatim at `prose-craft-contract.md` §Rule 7; no live consumer cited the bundle's §Voice and Register Guidance by file path.
- **§External-Renderer Usage Guide**: operator documentation for how the rendered plan body is consumed. Absorbed into this README's earlier section by PROSESPLIT2-001.

The bytes of all three sections remain recoverable via `git show b0955a8da4e89716067d63c4aaf805aacfb69bfc:reports/prose-quality-instructions.md`. If a future workflow surfaces a need for any dropped section as a standalone file, recovery is a follow-up ticket, not a backwards-compatibility concern of this folder's contract.
