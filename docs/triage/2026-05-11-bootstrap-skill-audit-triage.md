# Bootstrap skill audit — triage (2026-05-11)

## Source

User-commissioned audit of `.claude/skills/branching-story-bootstrap/` (SKILL.md + 11 references + 4 templates) following the post-prose-strip overhaul. Audit cross-checked sibling skills `branching-story-page-cycle`, `branching-story-page-prose-finalize`, `storylet-pool-authoring`, `story-fact-promotion-to-canon`, and `branching-story-health-audit` for whether bootstrap's content is actually load-bearing across the pipeline. The audit report is the conversational deliverable; this triage file persists the action items.

## Decision summary

Nothing in the bootstrap skill should be deleted wholesale — the post-prose-strip rework is structurally sound. The detrimental content is concentrated in **template/yaml drift** (HIGH — gate-count mismatches and one prose-strip leftover) and **section-level duplication** (MEDIUM — plan-template re-enumeration and triple-documented cadence policy).

The Process Flow diagram + Final Rule polish (M3, M4 in the audit) were classified as optional cosmetic shrink and are NOT actioned here.

## Accepted items (5 tickets)

| Ticket | Audit finding | Severity | Effort | Rationale |
|---|---|---|---|---|
| [BSBOOT-025](../../tickets/BSBOOT-025.md) | H1+H2+H3 — template gate/check drift | HIGH | Small | `templates/story-kernel.md` lists 17 Phase 9 gates and 10 Phase 9.5 checks; SKILL.md + references say 19 and 11. `templates/story-records.yaml` PG-0001 example missing `plan_completeness_check`. Bootstrap runs faithful to the template would silently fail the new gates. Pure correctness fix; no contract change. |
| [BSBOOT-026](../../tickets/BSBOOT-026.md) | H4 — prose-strip leftover | HIGH | Small | `references/engine-envelope-shape.md` line 288 says `pages-prose/PG-0001.md` in the post-engine markdown writes list. Bootstrap no longer writes that file (PROSESPLIT-007/008/009). One-line edit changes path to `pages-prose-plans/PG-0001.md`. |
| [BSBOOT-027](../../tickets/BSBOOT-027.md) | M1 — phase-7 plan-template duplication | MEDIUM | Medium | `references/phase-7-root-page-plan.md` lines 87-138 re-enumerate the full §1-§19 plan body that already lives in canonical `_shared-templates/page-plan.md`. Refactor to describe the root-case delta only (~50 lines removed). |
| [BSBOOT-028](../../tickets/BSBOOT-028.md) | M2 — cadence/menu policy triple-documented | MEDIUM | Small | `cadence_policy` + `menu_policy` literal yaml + "no word-count fields" justification appears in `templates/story-kernel.md`, `SKILL.md` Phase 11 step 2, AND `references/phases-1-3-premise-cast-facts.md`. Single-source to the template; references become pointers (~40-50 lines removed across two files). |
| [BSBOOT-029](../../tickets/BSBOOT-029.md) | L1-L5 — janitorial nits | LOW | Small | "five fields" off-by-one in two files, "~75 ops" arithmetic, "(NEW)" vestigial markers, opaque `(post-BSBOOT-NNN)` ticket refs, CHC schema yaml-vs-prose inconsistency. Bundled as one sweep. |

## Dismissed items (audit findings NOT actioned)

| Item | Audit finding | Why dismissed |
|---|---|---|
| M3 — Process Flow diagram size | SKILL.md lines 64-212 ASCII diagram restates the Procedure section at ~150 lines. | Audit explicitly classified as "cosmetic" (pragmatic — the diagram has orientation value for new readers; the cost of shrinking it is materially higher than the gain). User wording on the audit confirmed M3/M4 as optional polish; not picked up. |
| M4 — "Final Rule" close section | SKILL.md lines 396-398 paraphrase the HARD-GATE condition list as a rhetorical close. | Same rationale as M3; flagged as optional polish in the audit. |
| Architecture question — rename `engine-envelope-shape.md` | The file lives in bootstrap/ but is cited by storylet-pool-authoring and page-cycle as the canonical envelope authority for the whole story pipeline. The audit flagged the file's location as architecturally awkward. | Out of scope for a janitorial pass. If the user wants this, it becomes its own architecture ticket (rename target would likely be `.claude/skills/_shared-templates/engine-envelope-shape.md` with citation updates across siblings). Deferred. |

## Follow-up considerations

- **Page-cycle mirror nits.** `branching-story-page-cycle/references/phase-7-page-plan.md` has the same "five fields" off-by-one and a similar plan-template duplication (audit Assumption Reassessment item 3 in BSBOOT-027). A BSPAGE-NN ticket is the natural follow-up if the user wants the page-cycle surface cleaned to the same standard.
- **`tools/world-mcp/.secret` / approval-token signing CLI cross-references.** The audit confirmed `references/engine-envelope-shape.md` is load-bearing for storylet-pool-authoring and page-cycle. If BSBOOT-029 leaves the file's structure intact, no follow-up is needed; if a future architecture ticket moves the file, those cross-skill citations need coordinated updates.

## Implementation order recommendation

Tier 1 (correctness — do first): BSBOOT-025, BSBOOT-026. Independent; can be done in either order.

Tier 2 (clarity — do after Tier 1 settles): BSBOOT-027, BSBOOT-028. Independent (different files); can be done in parallel or either order.

Tier 3 (polish — do whenever): BSBOOT-029.

No hard dependencies across tickets — each can be merged independently.

## Total scope

- 5 ticket files at `tickets/BSBOOT-025.md` through `tickets/BSBOOT-029.md`.
- Files touched across all 5 tickets: 7 unique files inside `.claude/skills/branching-story-bootstrap/` plus 1 file at `.claude/skills/_shared-templates/page-plan.md` (BSBOOT-029 L1 only).
- Estimated net line reduction across all 5 tickets: ~100-130 lines, primarily from BSBOOT-027 and BSBOOT-028.
