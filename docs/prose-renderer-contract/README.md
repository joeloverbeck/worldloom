# Prose Renderer Contract

This folder is the canonical source for the three renderer-bound blocks inlined verbatim into every scene-plan body authored by the story-skill family:

| File | Inlined as | Authored by |
|---|---|---|
| `content-policy.md` | scene-plan Content Policy | `branching-story-scene-plan` |
| `prose-craft-contract.md` | scene-plan Prose Craft Contract | `branching-story-scene-plan` |
| `render-time-instruction.md` | scene-plan Render-Time Instruction | `branching-story-scene-plan` |

The scene-plan structure is documented beside the `SCN` contract in the shared story-state templates and operationalized by `.claude/skills/branching-story-scene-plan/`.

## External-Renderer Usage Guide

**The scene plan IS the prompt.** `branching-story-scene-plan` inlines §Content Policy, §Prose Craft Contract, and §Render-Time Instruction Template from this folder into the per-scene plan body. The rendered plan at `worlds/<world-slug>/stories/<story-slug>/scene-prose-plans/SCN-<integer>.md` is therefore self-contained.

Send the full per-scene plan body verbatim as the user-facing prompt to your renderer (manual or automated — e.g., OpenRouter Opus 4.7). **Do not concatenate these source files at render time** — doing so duplicates §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template, which are already inlined into the plan.

The scene plan body supplies every block the renderer needs: story kernel excerpt, Content Policy, Prose Craft Contract, relevant world-canon excerpt, active cast and entity statuses, current location and affordances, selected events with state deltas, turn-driver / initiative trace where relevant, required beats from the committed `PG` range and selected commitment blocks, relationship and belief context, active actor plans and emotional causality where relevant, open obligations / consequences / threads, open setups / active clocks / hidden secrets, scene-range forbidden mystery resolutions, stopping point, next choices from the final `PG`, scene frontmatter with engine fields, STCHAR-derived character authority packets when relevant, style and register notes, anti-pathology checklist, and the trailing Render-Time Instruction block.

Expected output:

- **Continuous prose only.** No commentary on the rendering process, no chain-of-thought, no critique of the plan, no questions back to the user.
- **No markdown headers.** No `# Beat 1` / `## Beat 2` / `### Stage` enumeration of the beat plan. Beat structure lives in the prompt; the rendered prose embodies the beats as scene movement.
- **No engine vocabulary.** Record ids, axis names, rule numbers, and contract terminology stay in the prompt and the critic verdicts; they never appear in narration, dialogue, or interiority.

Scene rendered prose lands at `scene-prose/SCN-<integer>.md`. Run `branching-story-scene-prose-attach` to validate and attach it against every `PG` in `SCN.pg_ids`; that skill writes `scene-prose-receipts/SCN-<integer>.yaml`, updates the bundle index, and never mutates `PG`, `SCN`, `SE`, or other story `_source` state. The external renderer does not own the validation loop; it owns only the production of one prose draft per invocation.

Per-story `forbidden_resolutions[]` and scene-range forbidden-resolution material are inlined into each plan file at plan-authoring time, not into this folder. This folder is the canonical source bundle for the shared renderer-bound blocks — it carries no per-story or per-bundle context.

## Forbidden compaction

The renderer-bound blocks are inlined verbatim on every scene plan. This is operationally load-bearing: the external prose renderer has no cross-plan state — every render is a cold context. Compacting these sections on subsequent scenes would force the user to manually re-paste the canonical content on every render, defeating the self-contained-plan contract. Skills must not propose compacting these sections across scenes. Byte-equality between the post-framing payloads in this folder and the inlined scene-plan sections is enforced by `scene_plan_verbatim_section_integrity`.

## Diagnostic Vocabulary dual-purpose note

The Diagnostic Vocabulary table at the end of `prose-craft-contract.md` is consumed in two distinct modes:

1. As part of the verbatim Prose Craft Contract block shipped with every scene plan.
2. As the internal citation vocabulary for scene-prose qualitative craft review. The eight axis names are the citation tokens used in verdicts.

Edits to the table must preserve both consumption modes.

## Sections dropped from the pre-2026-05-26 bundle

The pre-relocation bundle at `reports/prose-quality-instructions.md` (deleted 2026-05-26 by PROSESPLIT2-004) contained three additional sub-sections that were dropped in the relocation as redundant duplicates of content elsewhere in this folder:

- **§Anti-Pathology Checklist**: reformulation of the Diagnostic Vocabulary table at the end of `prose-craft-contract.md`. The scene-plan anti-pathology checklist is per-skill populated; no live consumer cited the bundle's §Anti-Pathology Checklist by file path. SPEC-91 (archived 2026-05-26) already directed plain-language craft framing rather than axis-name enumeration in renderer prompts.
- **§Voice and Register Guidance**: standalone restatement of Prose Craft Contract Rule 7. The substance lives verbatim at `prose-craft-contract.md` §Rule 7; no live consumer cited the bundle's §Voice and Register Guidance by file path.
- **§External-Renderer Usage Guide**: operator documentation for how the rendered plan body is consumed. Absorbed into this README's earlier section by PROSESPLIT2-001.

The bytes of all three sections remain recoverable via `git show b0955a8da4e89716067d63c4aaf805aacfb69bfc:reports/prose-quality-instructions.md`. If a future workflow surfaces a need for any dropped section as a standalone file, recovery is a follow-up ticket, not a backwards-compatibility concern of this folder's contract.
