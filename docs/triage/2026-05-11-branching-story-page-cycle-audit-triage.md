# branching-story-page-cycle skill audit — triage (2026-05-11)

## Source

User-commissioned skill-streamlining-audit run via `/skill-streamlining-audit --target_skill_path .claude/skills/branching-story-page-cycle --sibling_skill_paths branching-story-bootstrap,branching-story-health-audit,branching-story-page-prose-finalize,story-fact-promotion-to-canon,storylet-pool-authoring --rework_motivation "post-overhaul + post-prose-extraction-to-external-LLM + post-bootstrap-page-plan-changes" --produce_tickets_on_approval true`.

The audit cross-checked the page-cycle skill (`SKILL.md` + 14 references + 1 template = 2138 lines / ~200KB) against the named siblings, the canonical shared template at `.claude/skills/_shared-templates/page-plan.md`, FOUNDATIONS.md, and the prior bootstrap-audit triage at `docs/triage/2026-05-11-bootstrap-skill-audit-triage.md`. The audit report is the conversational deliverable; this file persists the action items.

## Decision summary

Nothing in the page-cycle skill should be deleted wholesale — the post-overhaul state is structurally sound, and the load-bearing surfaces (`prose-craft-contract.md`, `record-schemas.md`, `phase-5-state-mutation.md`, the per-phase contracts, the bicameral HARD-GATE) are correctly preserved across the rework. The detrimental content is concentrated in **template/schema drift** (HIGH — gate-count mismatch and two phase-description / ticket-path drift sites) and **plan-template re-enumeration** (MEDIUM — exact mirror of the bootstrap finding the user has already fixed via BSBOOT-027).

The Process Flow vs Procedure duplication (M5) and Final Rule paraphrase (L3) are flagged for **parity decision with the bootstrap-audit precedent** (the bootstrap audit dismissed both as cosmetic; the recommendation is to dismiss for page-cycle too unless the user wants stricter consistency).

## Accepted items (6 tickets)

| Ticket | Audit finding | Severity | Effort | Rationale |
|---|---|---|---|---|
| [BSPAGE-002](../../tickets/BSPAGE-002-add-plan-completeness-check-to-record-schemas-validation-trace.md) | F-01 — `record-schemas.md` validation_trace missing gate 18 (`plan_completeness_check`); header says `Phase 9 gates 1-17` while skill has 18 gates | HIGH | Small | A maintainer hand-authoring a PG record from `record-schemas.md` would silently omit gate 18 and fail Phase 9 / `record_schema_compliance` at submit time. Pure correctness fix; no contract change. Parallels BSBOOT-025 (archived). |
| [BSPAGE-003](../../tickets/BSPAGE-003-fix-stale-phase-7-prose-render-language-in-phase-4-reference.md) | F-02 — `phase-4-storylet-and-mystery-authority.md:64` says `"before Phase 7 prose render fires"`; Phase 7 no longer renders prose post-PROSESPLIT-007 | HIGH | Small | One-noun edit (`prose render` → `plan authoring`) brings the sentence in line with `SKILL.md:481`, `phase-7-page-plan.md:2,5`, and `governance-and-foundations.md:49`. |
| [BSPAGE-004](../../tickets/BSPAGE-004-resolve-stale-sfpc-001-ticket-path-in-phase-4-reference.md) | F-03 — `phase-4-storylet-and-mystery-authority.md:89` cites `tickets/SFPC-001-...` but file is at `archive/tickets/SFPC-001-...` | HIGH | Small | Implementer reads the archived ticket first, then chooses path-correction (`archive/tickets/...`) or qualifier-removal per the ticket's current state. |
| [BSPAGE-005](../../tickets/BSPAGE-005-refactor-phase-7-page-plan-as-delta-over-canonical-template.md) | F-04 — `phase-7-page-plan.md:31-159` re-enumerates the §1-§19 plan body that lives in canonical `_shared-templates/page-plan.md` | MEDIUM | Medium | Refactor to a delta-only description of the selected-arc case, citing the canonical template as source of truth. Mirrors the BSBOOT-027 bootstrap-side fix; the 2026-05-11 bootstrap triage explicitly named this as the natural BSPAGE-NN follow-up. ~50-70 line net reduction. |
| [BSPAGE-006](../../tickets/BSPAGE-006-decide-skill-md-process-flow-vs-procedure-duplication.md) | F-05 — `SKILL.md:56-211` Process Flow (~155 lines, 31.5%) restates Procedure (~190 lines) | MEDIUM | Small (dismiss) / Medium (shrink) | Parity decision with bootstrap audit's dismissal of analogous M3 as cosmetic. Recommendation: dismiss; close ticket as wontfix. Optional Option B (shrink) requires a paired BSBOOT-NN ticket to maintain family parity. |
| [BSPAGE-007](../../tickets/BSPAGE-007-janitorial-sweep-five-fields-stale-markers-final-rule.md) | F-06 + F-07 + F-08 bundled — `phase-7-page-plan.md:148` "five fields" off-by-one; 8 stale `(NEW)` / `(post-PROSESPLIT-007)` / `(per PROSESPLIT-002)` annotations; Final Rule paraphrase parity decision | LOW | Small | One-word edit (F-06) + 8-site annotation strip (F-07) + F-08 parity-dismiss (recommendation). Mirrors BSBOOT-029 janitorial sweep. |

## Dismissed items (audit findings NOT actioned)

| Item | Audit finding | Why dismissed |
|---|---|---|
| (none) | All 8 findings are accepted | The user selected ACCEPT-all at the Phase 8 disposition step. F-05 and F-08 are accepted as tickets but each carries an explicit parity-with-bootstrap dismissal recommendation that the implementer may choose. |

## Follow-up considerations

- **Hard Rules vs Guardrails partial overlap (not raised as a finding).** `SKILL.md:474-485` Hard Rules and `references/governance-and-foundations.md:42-62` Guardrails partially overlap. The relationship is explicitly documented at `governance-and-foundations.md:3` ("The thin SKILL.md surfaces a short Hard Rules summary; this file is the authoritative full version"), and the bootstrap audit accepted the analogous pattern. Not actioned; intentional summary/full-version split.
- **`Phase 7 produces a plan` claim duplication (not raised as a finding).** The statement appears in `SKILL.md:40,303,481,489-491`, `governance-and-foundations.md:49`, `phase-7-page-plan.md:2,5,60,161`. This is deliberate post-rework reinforcement of the new contract — the duplication is doing its job of keeping every reader's eye on the new Phase 7 deliverable. Not actioned.
- **BSPAGE-006 Option B propagation to bootstrap.** If the user chooses Option B (shrink the Process Flow), a parallel BSBOOT-NN ticket must be opened so the story-skill family maintains structural parity. The default Option A (dismiss) needs no such follow-up.
- **BSPAGE-004 follow-up depending on archived ticket state.** If reading `archive/tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` reveals the refactor has been re-scoped to a different active ticket, BSPAGE-004 should cite the replacement; if it's obsolete, the citation should be removed entirely. The ticket's "Option A vs Option B" structure handles both cases.

## Implementation order recommendation

**Tier 1 (correctness — do first)**: BSPAGE-002, BSPAGE-003, BSPAGE-004. Three independent one/few-line edits; can be done in any order. Each is grep-proof verifiable.

**Tier 2 (clarity — do after Tier 1 settles)**: BSPAGE-005. Mid-size documentation refactor; should follow the BSBOOT-027 pattern closely. BSPAGE-006 is a decision-only ticket and can be resolved in parallel.

**Tier 3 (polish — do whenever)**: BSPAGE-007. Janitorial sweep; can be done at any time after Tier 1.

No hard dependencies across tickets — each can be merged independently.

## Total scope

- 6 ticket files at `tickets/BSPAGE-002.md` through `tickets/BSPAGE-007.md`.
- 1 triage manifest at `docs/triage/2026-05-11-branching-story-page-cycle-audit-triage.md` (this file).
- Files touched across all 6 tickets (worst case, if all accept paths chosen): 7 unique files inside `.claude/skills/branching-story-page-cycle/`. No edits to `.claude/skills/_shared-templates/page-plan.md`, sibling skill directories, `docs/FOUNDATIONS.md`, `tools/`, or any world bundle.
- Estimated net line reduction across all 6 tickets (if all act paths chosen): ~60-110 lines, primarily from BSPAGE-005.
- Estimated net line reduction (if recommended parity-dismissals taken on F-05 and F-08): ~50-70 lines, primarily from BSPAGE-005.

## Audit metadata

- Audit invocation: `/skill-streamlining-audit` at 2026-05-11.
- Target file count: 16 (SKILL.md + 14 references + 1 template).
- Target byte size: ~200KB (2138 lines).
- Sibling skills cross-checked: 5.
- Cross-skill citations cataloged: 9 load-bearing references to page-cycle files (mostly to `references/prose-craft-contract.md` and `references/record-schemas.md`) — none recommended for removal.
- Standard negative-catalog items judged "keep": 8 (template content-policy.txt, HARD-GATE block, prose-craft-contract.md, record-schemas.md, phase-5-state-mutation.md, phase-8-choice-generation.md PG-0001 special case, per-phase reference files, governance-and-foundations.md Guardrails).
- Auditor: `skill-streamlining-audit` v1 (the audit skill itself).
