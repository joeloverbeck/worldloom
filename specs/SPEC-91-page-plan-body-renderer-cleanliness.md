# SPEC-91 — Page-Plan Body Renderer Cleanliness & Structural Enforcement

**Status**: draft
**Depends on**: PROSESPLIT-001..009 (landed 2026-05-10), PPLAN-001..007 (landed 2026-05-12)
**Related**: `reports/page-plans-improvements-first-iteration.md`, `docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md`
**Source brainstorm**: 2026-05-26 — triage of the ChatGPT-Pro first-iteration page-plan analysis

---

## 1. Purpose

Complete the engine-vocabulary cleanup of the renderer-facing page-plan body and add the structural enforcement layer the existing contract assumed but never grew. The shared story-state contract has stated since the rebuild that "the plan must not expose engine jargon to prose; engine terms confined to §15 frontmatter only" (`.claude/skills/_shared-templates/story-state-contract.md` §8 line 571). PPLAN-005/006 translated §15 SLT schema and §10 OBL/CNSQ/THR engine vocabulary into prose direction. This spec extends the same translation pattern to §7 (selected event + state delta), §7a (turn driver / initiative trace), §9 (relationship/belief context), §9b (active actor plans), §9c (emotional causality), §10b (CLK/STSEC/STQ), and §14 (recent prose continuity), and adds a new structural validator that scans the plan body for engine-vocabulary leakage so the contract rule is enforceable rather than aspirational.

The work also removes two renderer-prompt pathologies in the verbatim-inlined sections of `reports/prose-quality-instructions.md`: the diagnostic-token enumeration in §Render-Time Instruction Template ("the post-render prose critic will flag `filter_word_saturation`...") that trains the model to think about a rubric rather than write fiction, and the 30+-prefix engine-vocabulary enumeration inside Prose Craft Contract Rule 9 that paradoxically teaches the model the very vocabulary it is supposed to avoid.

The single-artifact architecture (one `pages-prose-plans/PG-<integer>.md` that serves as both engine-readable plan and external-renderer prompt, per FOUNDATIONS §Story Bundles §4) is preserved. The ChatGPT-Pro report's proposal to split into two artifacts (internal audit packet + renderer prose packet with a source map) is intentionally rejected here — see §3 Background.

## 2. Scope

### In scope

- §7 "Selected Event and State Delta" body translation: prose-direction equivalent of `state_delta.create/supersede/close` arrays, `record_introductions`, `state_relations`, `non_propagation_facts`. Engine YAML moves to §15 frontmatter (where it already partially lives).
- §7a "Turn driver / initiative trace" body translation: keep the closed-vocabulary `Driver kind:` / `Initiator:` / `Player response mode:` / `POV visibility:` / `Observer-firewall note:` lines (validator-enforced), but rewrite the `Active-pressure disposition` table to use prose anchors instead of raw record-ID rows where possible; preserve the closed-set `disposition` and `Reason / expiry` cell shape per `active_pressure_handling_discipline` validator.
- §9 "Relationship and Belief Context" body translation: rewrite from "SREL-1 active; BEL-3 active (Jon believes X); BEL-7 active (Ane believes Y)" enumerations into prose statements; preserve enough record-ID hooks for `Current-state grounding records:` use (which lives in §16a, not §9).
- §9b "Active actor plans / tactical agency" body translation: keep the structural sub-bullet template per shared-contract §8 (`STPLAN-<integer> — Holder: STENT-<integer>` is mandatory per validator), but reword `This page's SE.state_relations[]:` from raw verb-list to prose statement of plan movement.
- §9c "Emotional causality / affective transition" body translation: keep the structural sub-bullet template (`STEMO-<integer> — Holder: STENT-<integer>`), rewrite `Behavioral pressure:` from closed-enum citation into prose direction.
- §10b "Open Setups, Active Clocks, Hidden Secrets" body translation: keep per-class subsection structure, rewrite from "CLK-1 value: 2/4, salience: high, threshold at 3" to prose pressure description; numeric value/max/threshold stays in §15 frontmatter.
- §14 "Recent Prose Continuity" restructure: replace the optional verbatim prior-prose dump with a structured 4-subsection packet (continuity bullets / facts to preserve / "do not reuse" anchors list / fresh anchor opportunities). Verbatim prior-prose quotation allowed only on explicit trigger (1-3 lines max).
- `reports/prose-quality-instructions.md` cleanup:
  - §Render-Time Instruction Template: remove the diagnostic-token enumeration paragraph ("The post-render prose critic will flag `filter_word_saturation`...") and replace with plain-language craft guidance.
  - §Anti-Pathology Checklist: keep the eight axis names internally as validator vocabulary; rewrite the renderer-facing presentation as plain "avoid X" prose without naming the axes as citation tokens.
  - §Prose Craft Contract Rule 9: replace the 30+-prefix engine-vocabulary enumeration with a category-level rule. The full enumeration moves to a validator-only file (`tools/validators/src/structural/_engine-vocabulary-tokens.ts` or equivalent) that the renderer prompt never sees.
  - §External-Renderer Usage Guide lines 264-267: fix stale section labels (currently references the pre-SPEC-72 section layout `§4 POV / §5 world canon / §6 invariants / §7 mysteries`; should match the current 19-section contract `§4 world canon / §5 active cast / §6 location / §7 selected event / §11 forbidden mystery / §15 frontmatter`).
- New structural validator: `page_plan_body_engine_vocabulary_cleanliness`.
- Bootstrap and turn-cycle phase references updated to reflect the new section-content patterns.
- Existing in-bundle plans (PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/`) are NOT retroactively rewritten; the new contract applies to plans authored after the spec lands.

### Out of scope

- **Two-artifact split** (internal audit packet + renderer prose packet + source map + dual hash basis). Rejected per §3 Background — reverses PROSESPLIT and adds synchronization risk for diagnosis already solvable inside the single-artifact contract.
- **Removing record IDs from §16a `Current-state grounding records:` field.** The field is a comma-separated record-ID list by contract design; validators (`page_plan_stchar_packet_integrity` and downstream `stchar-temporal-reference-boundary`) depend on the ID-list shape.
- **Adding `internal_packet_hash` / `renderer_packet_hash` / `source_map_hash` to the PG record schema.** Not needed under the single-artifact framing.
- **Modifying the closed enums** governing `SE.state_delta.create/supersede/close` lifecycle, `record_introductions[].trigger` taxonomies, or the predicate DSL. Body rendering is changing; underlying record schemas are not.
- **Word-count enforcement** of any kind, including for the new §14 continuity packet (per FOUNDATIONS §Story Bundles §9).
- **Rewriting completed plans.** PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/` remain as-is; the new contract is forward-only.
- **Changes to the eight-axis prose critic in prose-attach Phase 4.** The diagnostic axis names remain validator-side vocabulary; only their appearance in the renderer-facing prompt is removed.
- **Compaction of §2 / §3 / §19 across pages.** User-confirmed operationally load-bearing 2026-05-12 (feedback memory `page_plan_verbatim_sections`); these sections stay inlined verbatim every page.

## 3. Background — prior decisions this extends

| Date | Decision | Reference |
|---|---|---|
| 2026-05-10 | The plan IS the renderer prompt (single artifact). Plan rendering is OUT of skill; external renderer reads `pages-prose-plans/PG-<integer>.md` cold. | PROSESPLIT-001..009; `docs/triage/2026-05-10-prose-rendering-out-of-skill-triage.md`; FOUNDATIONS §Story Bundles §4 |
| 2026-05-12 | Translate SLT schema (§15) and OBL/CNSQ/THR (§10) engine vocabulary into prose direction. Drop `forbidden_engine_vocabulary[]` enumeration from §18/§19 body. Add Cast Material Reality projection + clothing consistency gate. | PPLAN-001..007; `docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md` (PPLAN-008 is repair work on red-bunny PG-2, not pattern extension; tangentially related but out of SPEC-91 scope) |
| 2026-05-12 | §2 / §3 / §19 stay inlined verbatim every page. Cross-page compaction rejected — external LLM has no cross-plan state, every render is cold context. | User decision; feedback memory `page_plan_verbatim_sections` |

This spec extends the 2026-05-12 translation pattern to the sections PPLAN didn't reach (§7, §7a, §9, §9b, §9c, §10b, §14) and adds the structural enforcement (validator) that the engine-jargon contract rule has lacked.

The ChatGPT-Pro report's two-artifact split proposal is rejected because (a) it reverses PROSESPLIT's architectural direction; (b) it introduces a source-map synchronization problem (the internal packet's state truth must stay in sync with the renderer packet's prose translation, or the validator surface fragments); (c) the diagnosed pathology (engine vocabulary in the body that the prose imports) is fully addressable within the single-artifact contract by completing the translation pattern + adding structural enforcement. The split's diagnostic value (a clean renderer-facing artifact) is preserved here as the cleaned single artifact.

## 4. Empirical evidence — the diagnosed pathology

Verified from `worlds/erotica-world/stories/red-bunny/`:

- Plan body sizes: PG-1 71 KB, PG-2 91 KB, PG-3 124 KB, PG-4 134 KB, PG-5 79 KB.
- Rendered prose sizes: PG-1 4.8 KB, PG-2 7.6 KB, PG-3 4.3 KB, PG-4 3.6 KB, PG-5 4.1 KB. Plans are 15-30× larger than the prose they prompt.
- Record-ID token counts in plans: PG-1 234, PG-2 413, PG-3 597, PG-4 636, PG-5 414. Record-ID token counts in prose: 0 across all pages — the existing `engine_jargon_leak` check (prose-attach Phase 3 check 2) is doing its job for prose. The leak is upstream, in the plan body the renderer reads.
- PG-2 §7 (lines 203-247) contains literal `state_delta.create`, `state_delta.supersede`, `state_delta.close` headings followed by YAML-flavored bullets, plus a verbatim YAML fragment for `record_introductions` and an enumerated `non_propagation_facts` entry. This is engine machinery the prose renderer doesn't need.
- PG-3 prose lines 25 and 29 import plan vocabulary verbatim: "the way a file loads the header" and "a search query moving through a lookup table" — the plan tells the renderer about Jon's "sort-grid" as an active interpretive metaphor, and the prose dutifully renders the metaphor as if it were the character's interior. This is the abstract-noun-saturation pathology the prose-attach craft critic targets — but it originates upstream in the plan.

The pathology is not the existence of internal state. It is the body's failure to translate that state into prose-facing direction.

## 5. Architecture — single artifact, two registers

The page-plan file (`pages-prose-plans/PG-<integer>.md`) continues to be the single source of truth read both by validators and the external prose renderer. Internal to the file:

- **§15 (Plan frontmatter)** is the engine-register section. Record IDs, hashes, branch path, input fields, emitted-choice IDs, canon-revision baseline — engine vocabulary is lawful here by contract design.
- **§16a `Current-state grounding records:` field** is the only in-body location where bare record-ID lists are lawful (comma-separated, validator-enforced shape).
- **§2 (Content Policy), §3 (Prose Craft Contract), §19 (Render-Time Instruction Template)** are verbatim-inlined canonical content from `reports/prose-quality-instructions.md`; their content is curated upstream, not validator-enforced section-by-section.
- **Every other section body** is renderer-facing prose-direction language. Record IDs, raw YAML, schema field names, validator vocabulary, hash references, and lifecycle bookkeeping are forbidden in those sections.

The new validator (§8) enforces this allow-list: §15 frontmatter content, §16a `Current-state grounding records:` field, and the §2/§3/§19 verbatim blocks are excluded from the engine-vocabulary scan; everything else in the body is scanned.

## 6. Section-by-section changes

### §7 — Selected Event and State Delta (body translation)

**Current shape (PG-2 example, lines 203-247):**

> **state_delta.create** (state-record classes only — per shared contract §4.3 the `state_delta.create / supersede / close` arrays accept the lifecycle-managed story-state classes...):
> - `STINT-4` — Jon's superseding intent: observe Ane...
> - `STEMO-5` — Jon's superseding dread: moral-self-awareness intensifies...
> - `BEL-9` — Jon's new private belief from sustained observation...
> - `CLK-1` — Jon's observation window: a present-causal exposure clock...
>
> **state_delta.supersede:**
> - `STINT-3` — Jon's prior intent... is now superseded by the more specific STINT-4.

**Target shape (post-SPEC-91):**

> What changed in Jon's interior this page:
> - His intent has narrowed from "decide what to do about this girl on the bench" to "observe her more closely before committing to approach or walk past."
> - His moral self-awareness has crystallized: the deferred deferral is itself a moral position, and the prose must render the deferral as a chosen stance, not as paralysis.
> - He has formed a new private belief from sustained observation (the four-finger bruise pattern resolved at sustained look; the absence of phone-fiddling; the hands tight around the purse strap; the wet platform-sneaker soles; the small near-sob breath).
> - An observation-window pressure has begun: each additional minute he stays in stationary-observation posture increases the chance Ane notices the watcher, a third party enters the privacy of the scene, or his fantasy template contaminates his perceptual read. The pressure registers as situational sense, not as a visible counter.

The engine record-IDs (STINT-3, STINT-4, STEMO-2, STEMO-5, BEL-9, CLK-1) move to §15 frontmatter where they already partially live. The body explains what changed in renderer-usable prose.

`record_introductions[]`, `state_relations[]`, `non_propagation_facts[]`, and `world_logic_rationale` move entirely to §15 frontmatter. The renderer does not need to see the YAML.

### §7a — Turn driver / initiative trace (table cell translation)

The fixed-line frontmatter rows (`Driver kind:`, `Initiator:`, `Driver records:`, `Player response mode:`, `POV visibility:`, `Observer-firewall note:`) are validator-enforced and kept as-is per `active_pressure_handling_discipline`. Reword the Reason / expiry cells to use prose anchors instead of bare record-ID rationale where possible. The closed-set `disposition` vocabulary (`selected | deferred | rejected`) and the closed `Reason / expiry` cell shape (literal `PG-<integer>` reference OR conditional connective `after | before | if | once | until | when`) remain validator-enforced.

### §9 — Relationship and Belief Context (body translation)

Replace "active SREL-1 between STENT-1 and STENT-3; active BEL-3 (Jon believes Ane has not noticed him); active BEL-7 (Ane believes she is alone)" enumerations with prose statements: "Jon and Ane have no prior shared history; she has still not noticed him. Jon privately believes she has been on the bench for hours; Ane believes she is alone in the park." Engine IDs (SREL-1, BEL-3, BEL-7) move to §15.

### §9b — Active actor plans / tactical agency (sub-bullet content rewrite)

Per shared-contract §8 the structural sub-bullet template is mandatory and validator-enforced. The sub-bullet labels (`Objective:`, `Root intention:`, `Current step:`, `Belief basis:`, `Resources/leverage:`, `Blockers:`, `Fallbacks currently available:`) are preserved. Content rewriting: replace `This page's SE.state_relations[]: advances` with prose statement of how this page advances the plan; replace `action_family: investigation` engine vocabulary with prose direction ("the actor's next move is investigatory in shape").

### §9c — Emotional causality / affective transition (sub-bullet content rewrite)

Structural sub-bullets preserved per shared-contract §8 (`Affect (kind + intensity):`, `Trigger event:`, `Appraisal basis:`, `Behavioral pressure:`, `Transition this page (if any):`, `Prose must render:`, `Prose must avoid:`). Content rewriting: `Behavioral pressure: conceal, freeze` → "the actor pulls toward staying out of notice and toward physical stillness"; `Affect (kind + intensity): dread, extreme` → "an extreme moral dread that crystallizes the deferred-deferral as itself a moral position."

### §10b — Open Setups, Active Clocks, Hidden Secrets (per-class body rewrite)

Subsection labels per shared-contract §8 preserved. Per-class content rewriting: instead of "CLK-1 value: 2/4, salience: high, threshold at 3 (third party enters)", write "the observation-window pressure has reached the halfway mark; the next noticeable shift comes when a third party enters the privacy of the scene." Numeric value/max/threshold remain in §15 frontmatter for validator readback.

### §14 — Recent Prose Continuity (4-subsection restructure)

Replace the optional verbatim prior-prose dump with a structured 4-subsection packet. The current shape (when present) inlines parent prose verbatim; the verified pathology is that this keeps prior anchors highly salient in context and the renderer orbits the same stocks ("bookshop bag", "pigtails", "four fingers", "strawberry", "pressure", "shape", "choosing").

Target shape:

```
## 14. Recent prose continuity

### Where the previous page ended
- [3-8 concise continuity bullets — what happened, where the cast is, what is held]

### Facts to preserve
- [Object / position / body / relationship facts the next page must honor]

### Do not reuse these exact prior phrases, anchors, or metaphor stocks
- [Phrase / anchor / metaphor 1]
- [Phrase / anchor / metaphor 2]
- [Phrase / anchor / metaphor 3]

### Fresh anchor opportunities
- [Concrete sensory / material opportunity 1]
- [Concrete behavioral opportunity 2]
- [Dialogue / subtext opportunity 3]
```

Verbatim prior-prose quotation permitted only when ALL of:
- the page begins mid-dialogue and a prior exact line must be answered, OR
- a clue phrase was spoken whose exact wording carries legal / social weight, OR
- the renderer must preserve a precise lie / promise / accusation / question.

Hard cap when permitted: 1-3 lines of prior prose, not full pages. The skill authors §14 explicitly cite which trigger condition justifies any verbatim quotation.

§14 remains optional (omitted entirely when no parent prose is available, i.e., bootstrap PG-1 and turn-cycle pages whose parent prose has not yet been rendered).

## 7. `reports/prose-quality-instructions.md` edits

Single canonical source of §2 / §3 / §19 across all page plans. Edits land in this file; the next bootstrap or turn-cycle invocation inlines the updated content verbatim.

### 7.1 §Render-Time Instruction Template (inlined as plan §19)

Remove the paragraph (current line 214-217):

> Honor the PROSE CRAFT CONTRACT above. The post-render prose critic will flag `filter_word_saturation`, `recurring_metaphor_across_pages`, `identical_anchor_recurrence`, `self_narrating_self`, `bracket_paraphrasing_dialogue`, `ledger_jargon_leakage`, `abstract_noun_saturation`, and `padding_or_truncation`.

Replace with:

> Honor the Prose Craft Contract above. Stay in close POV; cut filter words; put action in the verb; anchor abstraction to concrete sensory specifics; vary anchors and metaphor stocks across pages; trust subtext; use record-id-free language throughout.

The eight axis names (`filter_word_saturation` etc.) remain prose-attach internal validator vocabulary. The renderer does not see them.

### 7.2 §Prose Craft Contract Rule 9 (inlined as plan §3 Rule 9)

Current Rule 9 enumerates 30+ record-ID prefixes verbatim in the renderer prompt — paradoxically teaching the model the engine vocabulary it is supposed to avoid. Replace with category-level rule:

> No record-id-shaped tokens (uppercase class prefix followed by a hyphen and digits), no schema field names, no validator vocabulary, no hash language, no append-only / supersession / lifecycle terminology, no patch / engine / op vocabulary. The character does not know they live inside a ledger.

The full token enumeration moves to a validator-only source file (`tools/validators/src/structural/_engine-vocabulary-tokens.ts`) consumed by the new plan-body cleanliness validator (§8) and by the existing prose-attach `engine_jargon_leak` check.

### 7.3 §Anti-Pathology Checklist

Reword from "Avoid `filter_word_saturation`..." with the axis-name-as-citation-token framing to plain "Avoid X" prose without naming the axes. Example:

> Avoid high density of `I saw / heard / felt / noticed / knew / realized / clocked / named` constructions. Cut filter words and use free indirect discourse. Keep a filter only when the perceiving IS the load-bearing event.

The axis names remain in the diagnostic vocabulary table (which is internal-facing) and as prose-attach validator output tokens.

### 7.4 §External-Renderer Usage Guide (landed inline 2026-05-26)

The stale section-numbering paragraph (`§4 POV / §5 world canon / §6 invariants / §7 mysteries-in-play firewall / §15 selected arc`) was corrected to match the current 19-section contract by a direct edit on 2026-05-26, ahead of SPEC-91 landing. The same edit fixed two adjacent pre-rebuild references in the same section: `branching-story-page-cycle Phase 7` → `branching-story-turn-cycle Phase 7`, and the `branching-story-page-prose-finalize` / `prose_ledger_consistency` / `arc_trace_evidence_alignment` / `prose_critic_8_axis` / "3-attempt budget" / `SOFT_FAIL`/`HARD_FAIL` paragraph → the current `branching-story-prose-attach` 8-deterministic-check + STCHAR + optional 7-axis craft critic + PASS/WARN/FAIL roll-up + `repair_recommendation` shape per the canonical receipt contract.

SPEC91-004 (per §11 below) is therefore reduced to the §Render-Time Instruction Template / §Anti-Pathology Checklist / §Prose Craft Contract Rule 9 edits described in §7.1 / §7.2 / §7.3 above. The §External-Renderer Usage Guide bullet is dropped from the ticket scope.

## 8. New structural validator — `page_plan_body_engine_vocabulary_cleanliness`

A new validator at `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` (file path follows the existing structural-validator convention). Consumed by `branching-story-bootstrap` Phase 10 and `branching-story-turn-cycle` Phase 9 as a deterministic gate at page-plan commit (alongside the existing nine shared hard gates).

### 8.1 Scan target

The plan body as parsed by `page-plan-section-parser.ts`. The validator scans every section body EXCEPT the following allow-listed regions:

- §15 "Plan Frontmatter" (entire body)
- §16a "Current-state grounding records:" sub-bullet field content (per packet)
- §2 "Content Policy" verbatim block (entire body — content sourced verbatim from `reports/prose-quality-instructions.md`)
- §3 "Prose Craft Contract" verbatim block (entire body — same source)
- §19 "Render-Time Instruction Block" verbatim block (entire body — same source)

### 8.2 Engine-vocabulary token sources

Three token sources scanned (loaded from `tools/validators/src/structural/_engine-vocabulary-tokens.ts`, the shared source file the §7.2 cleanup creates):

- **Record-ID patterns**: case-sensitive regex matching `(PG|SE|BEL|SF|STENT|STINT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STPLAN|STEMO|DA|BR|CHC|SLT|STORY|STSTAT|STCHAR|CLK|STSEC|STQ|M|CF|CH|INV|ENT|SEC|CHAR|SAU|SP|RSP|SLB|PA|NCP|NCB|EPE|NWP|NWB|AU|PR|RP)-[0-9]+`.
- **Schema field names** (literal substring): `state_delta`, `state_delta.create`, `state_delta.supersede`, `state_delta.close`, `record_introductions`, `state_relations`, `non_propagation_facts`, `world_logic_rationale`, `outcome_route`, `promotion_claims`, `validation_trace`, `state_snapshot`, `forbidden_resolutions`, `truth_relation`, `branch_local_counterfactual`, `canon_candidate`, `expected_witness_coverage`, `mystery_policy`, `alias_bindings`, `commitment.selection_source`, `commitment.selected_slt_id`, `derived_from`, `supersedes`, `plan_hash`, `state_hash`, `prose_hash`, `plan.plan_hash`, `state_hash_parent`.
- **Predicate-DSL terms** (literal substring): `pred:`, `fact_true(`, `belief_record(`, `entity_status(`, `relationship_axis(`, `obligation_open(`, `consequence_pending(`, `thread_active(`, `any_belief(`, `plan_active(`, `plan_blocked(`, `emotion_active(`, `emotion_pressure(`, `location(`, `has_affordance(`, `clock_at_least(`, `clock_below(`, `clock_full(`, `secret_unrevealed(`, `secret_revealed(`, `revelation_ready(`, `story_question_open(`, `story_question_status(`, `promise_due(`, `object_accessible(`, `artifact_accessible(`, `affordance_available_to(`, `intention_active(`, `record_active(`, `record_age(`.

### 8.3 Verdict shape

| Hit count in any single non-allow-listed section | Verdict |
|---|---|
| 0 | `PASS` |
| 1-2 | `WARN` (reported with the offending section, line numbers, and matched tokens) |
| ≥3 | `FAIL` (blocks the patch envelope at Phase 9; the skill must repair the body before re-submitting) |

The §16a packet's `Current-state grounding records:` field is parsed as a comma-separated id list (existing rule per shared-contract §16a); IDs in that field are not scanned. Any record-ID appearing in §16a OUTSIDE that field is treated by `page_plan_stchar_packet_integrity` (existing validator); this new validator does NOT duplicate that scan, but it does scan §16a body content other than `Current-state grounding records:` for the schema-field-name and predicate-DSL token classes (those are not §16a-validator territory).

### 8.4 Configuration / extension

The token source file (`_engine-vocabulary-tokens.ts`) is shared with prose-attach's `engine_jargon_leak` check. The single source ensures the two scanners stay in lockstep when new record classes or schema fields land. Adding a new record class to the system requires updating one file; both validators pick it up.

## 9. Migration / scope

- **No retroactive plan rewrite.** Existing PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/` remain as-is. The new contract applies to plans authored after the spec lands.
- **Forward-only enforcement.** The new validator runs on plans authored at bootstrap Phase 10 and turn-cycle Phase 9. Pre-existing plans do not pass through this validator (they pre-date the contract change).
- **Mid-bundle continuation works.** A bundle whose PG-1 through PG-N were authored under the old contract can author PG-(N+1) under the new contract; the §14 "Where the previous page ended" subsection summarizes the parent prose in structured form regardless of the parent plan's own §7 / §9 / §10b shape.

## 10. Test plan

| Layer | Test |
|---|---|
| Validator unit (positive) | A canonical post-SPEC-91 plan body with engine-vocabulary tokens only in §15 / §16a-grounding / §2 / §3 / §19 passes with `verdict: PASS`. |
| Validator unit (negative — WARN) | A plan body with 1-2 record-ID tokens in §7 body produces `verdict: WARN` and reports the matched tokens + section + line numbers. |
| Validator unit (negative — FAIL) | A plan body with ≥3 engine-vocabulary tokens in §7 body produces `verdict: FAIL`. |
| Validator unit (allow-list) | Engine-vocabulary tokens in §15 / §16a `Current-state grounding records:` / §2 / §3 / §19 do NOT contribute to the verdict. |
| Validator unit (token-source sync) | The `_engine-vocabulary-tokens.ts` token list contains every record class in the §Story Bundles §6 enumeration (regression test against future schema additions). |
| Skill integration (bootstrap) | `branching-story-bootstrap` Phase 10 invokes the new validator and reports a FAIL as a structural gate before patch submission. |
| Skill integration (turn-cycle) | `branching-story-turn-cycle` Phase 9 invokes the new validator and reports a FAIL as a structural gate before patch submission. |
| Skill integration (prose-attach) | `branching-story-prose-attach` Phase 3 check 2 `engine_jargon_leak` continues to scan rendered prose (unchanged surface), now using the shared `_engine-vocabulary-tokens.ts` token source instead of an inline list. |
| Contract sync | `.claude/skills/_shared-templates/story-state-contract.md` §8 updated to reference the new validator alongside the existing `page_plan_stchar_packet_integrity` and `active_pressure_handling_discipline` validators; the existing line 571 prose rule ("engine jargon to prose; engine terms confined to §15 frontmatter only") is preserved verbatim and a parenthetical names the structural enforcement. |
| Prose-quality-instructions sync | The updated `reports/prose-quality-instructions.md` §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template still inline verbatim as plan §2 / §3 / §19; a plan generated post-SPEC-91 carries the new wording. |
| End-to-end | Authoring a new PG-6 in red-bunny under the new contract produces a plan whose body sections (other than the allow-listed regions) contain zero engine-vocabulary tokens; the new validator returns PASS; rendered prose from that plan does not import "sort-grid"-style plan-vocabulary tics. |

## 11. Implementation tickets

Five ticket-sized chunks. Each is reviewable independently; they should land roughly in this order because each subsequent ticket benefits from the prior one's contract clarifications, but no ticket strictly blocks another (any subset can land first if convenient).

1. **SPEC91-001 — §7 / §7a body translation in bootstrap + turn-cycle phase references**
   - Edit `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` and `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` to describe the new §7 / §7a content shape (per §6 above).
   - Edit `.claude/skills/_shared-templates/story-state-contract.md` §8 row for §7 and §7a to reflect the body-translation contract.
   - Add canonical template snippets showing the "what changed in [actor]'s interior this page" prose form.

2. **SPEC91-002 — §9 / §9b / §9c / §10b body translation in bootstrap + turn-cycle phase references**
   - Edit the same phase references to describe the new §9, §9b, §9c, §10b content shape (per §6 above).
   - Edit `.claude/skills/_shared-templates/story-state-contract.md` §8 rows for §9 / §9b / §9c / §10b.
   - The structural sub-bullet templates for §9b and §9c remain validator-enforced (per shared-contract §8 lines 467-498); only the per-bullet content shape changes.

3. **SPEC91-003 — §14 continuity packet restructure**
   - Edit `.claude/skills/_shared-templates/story-state-contract.md` §8 row for §14 and add a new sub-section describing the 4-subsection structured packet.
   - Edit `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` to describe the new §14 authoring procedure: when the parent prose has been rendered (`PG-(N-1).prose_status: rendered` per PROSESPLIT-002), generate the structured 4-subsection packet; when not yet rendered, omit §14 entirely.
   - Add canonical template snippet.
   - Bootstrap PG-1 omits §14 (no parent prose).

4. **SPEC91-004 — `reports/prose-quality-instructions.md` cleanup (§19, §Anti-Pathology Checklist, §Prose Craft Contract Rule 9)**
   - Apply the §7.1 (Render-Time Instruction Template diagnostic-token enumeration removal), §7.2 (Rule 9 30+-prefix enumeration replacement), and §7.3 (Anti-Pathology Checklist axis-name-as-citation-token rewrite) edits described in §7 above.
   - The §7.4 §External-Renderer Usage Guide cleanup was landed inline on 2026-05-26 ahead of SPEC-91 (per §7.4 above) and is NOT part of this ticket's scope.
   - Update the file's revision history at the top to record the change.
   - Verify no other skill or doc references the removed diagnostic-token enumeration phrasing.

5. **SPEC91-005 — New `page_plan_body_engine_vocabulary_cleanliness` validator + shared token source**
   - Create `tools/validators/src/structural/_engine-vocabulary-tokens.ts` with the three token classes (record-ID regex, schema field names, predicate-DSL terms) per §8.2.
   - Create `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` implementing the scan, the allow-list, and the WARN/FAIL thresholds per §8.3.
   - Wire the new validator into bootstrap Phase 10 and turn-cycle Phase 9 deterministic gates.
   - Update prose-attach Phase 3 check 2 `engine_jargon_leak` to import from the shared token source (replaces the inline list in `branching-story-prose-attach/SKILL.md` Phase 3 check 2).
   - Add validator unit tests per §10.
   - Update `.claude/skills/_shared-templates/story-state-contract.md` §8 to name the new validator alongside `page_plan_stchar_packet_integrity` and `active_pressure_handling_discipline`.

## 12. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
|---|---|---|
| §Story Bundles §4 — Pipeline shape: plan + (optional) prose-attach; the plan body inlines all canonical context the external renderer needs | aligns @ contract preservation | Single-artifact architecture preserved; the cleaned plan body continues to inline all canonical context the renderer needs, now without engine vocabulary in the body. The two-artifact split that would have tensioned this principle is explicitly rejected. |
| §Story Bundles §4a — Plan-Authority Boundary (page state is authoritative at plan commit; rendered prose is renderable receipt) | aligns @ no schema change | No PG record schema fields are added; the engine state truth in §15 frontmatter and `PG.state_snapshot.active_records` remains the authoritative state. Only the body's prose-direction translation shape changes. |
| §Story Bundles §5b — Schema-Minimalism (every field load-bearing; nice-to-have fields dropped) | aligns @ validator design | The new validator's allow-list is minimal (§15 / §16a-grounding / verbatim §2/§3/§19); no new schema fields are added; the shared token source file replaces duplicated inline lists in two places. |
| §Story Bundles §9 — Prose Length Discipline (no word-count targets on rendered prose) | aligns @ §14 structure | The new §14 structured continuity packet uses bullets, not word counts. Verbatim prior-prose quotation is hard-capped (1-3 lines), but the cap is a leakage-prevention rule, not a length target. |
| §Tooling Recommendation — LLM agents should never operate on prose alone; receive the documented context-packet + targeted retrieval | aligns @ renderer's context shape | The external prose renderer continues to receive the comprehensive plan body cold; the cleanup makes that body more render-usable by removing payload the renderer must actively suppress. |
| Rule 1 — No Floating Facts (and the FOUNDATIONS §Rule 1 carve-out for plan-as-load-bearing-engine-output) | aligns @ §15 frontmatter | The engine-readable plan content (record IDs, hashes, state-delta machinery, validation trace) remains in §15 frontmatter where Rule 1's grounding requirements operate. Moving prose-direction translation into the body does not remove grounding — it changes presentation register. |
| Rule 7 — Preserve Mystery Deliberately (mystery firewall enforcement) | aligns @ §11 unchanged | §11 "Forbidden mystery resolutions" is not modified; the mystery firewall surface and the `forbidden_mystery_resolution` validator continue to operate as today. |
| §Story Bundles §6.1 — Story-Local Character Authority (§16a packet shape) | aligns @ §16a preservation | The §16a `Current-state grounding records:` field stays as a comma-separated record-ID list; `page_plan_stchar_packet_integrity` continues to enforce the existing rules. The new validator allow-lists this field explicitly so the two validators do not collide. |
| §Story Bundles §6b — Information / Observer Firewall | N/A @ this spec | Firewall enforcement happens at SLT selection / CHC emission / page-plan commit through the existing predicate DSL and §7 gates. This spec changes presentation register only; it does not change firewall mechanics. |
| §Canon Layers — Hard Canon / Derived Canon / Soft Canon / Mystery Reserve | N/A @ this spec | No canon mutation; no canon-record schema change. |
| Change Control Policy | N/A @ this spec | Not a canon-mutating change; no CH-<integer> required. |
