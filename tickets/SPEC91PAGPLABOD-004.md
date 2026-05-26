# SPEC91PAGPLABOD-004: `reports/prose-quality-instructions.md` cleanup (§Render-Time Instruction Template + Anti-Pathology Checklist + Prose Craft Contract Rule 9)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `reports/prose-quality-instructions.md` (the canonical source bundle for plan §2 / §3 / §19 inlined verbatim into every page plan).
**Deps**: None

## Problem

`reports/prose-quality-instructions.md` is the canonical source for the Content Policy (plan §2), Prose Craft Contract (plan §3), and Render-Time Instruction Template (plan §19), inlined verbatim every page per the user-confirmed operationally-load-bearing constraint (feedback memory `page_plan_verbatim_sections`, dated 2026-05-12). Three renderer-prompt pathologies live in the canonical source:

1. **§Render-Time Instruction Template** (currently at lines 214-217) contains the paragraph "Honor the PROSE CRAFT CONTRACT above. The post-render prose critic will flag `filter_word_saturation`, `recurring_metaphor_across_pages`, `identical_anchor_recurrence`, `self_narrating_self`, `bracket_paraphrasing_dialogue`, `ledger_jargon_leakage`, `abstract_noun_saturation`, and `padding_or_truncation`." — this trains the external renderer to think about being judged by a rubric rather than to write fiction.
2. **§Prose Craft Contract Rule 9** (currently at line 115) enumerates 30+ engine-vocabulary prefixes verbatim — `CF-NNNN`, `M-N`, `CAU-N`, `SOC-N`, `AES-N`, `ONT-N`, `DIS-N`, `OBL-NNNN`, `SF-NNNN`, `STENT-NNNN`, `SE-NNNN`, `THR-NNNN`, `CHC-NNNN`, `INV-N`, `SLT-NNNN`, `STINT-NNNN`, `SREL-NNNN`, `CNSQ-NNNN`, `STLOC-NNNN`, `STOBJ-NNNN`, `DA-NNNN`, `BR-NNNN`, `PG-NNNN`, `ENT-NNNN`, `SEC-*`, `ARCTRACE-NNNN`, `SAU-NNNN`, `RSP-NNNN`, `SP-NNNN`, `SLB-NNNN`, `PA-NNNN`, `CHAR-NNNN`, `STORY-NNNN` — paradoxically teaching the model the very engine vocabulary it is supposed to avoid.
3. **§Anti-Pathology Checklist** (currently at lines 229+) repeats the same axis-name-as-citation-token framing in the renderer-facing prose, re-introducing the same rubric-thinking pathology pattern (1) addresses.

This ticket reworks all three sites so the renderer-facing prompt carries craft guidance in plain language; the diagnostic axis names and the full engine-vocabulary token enumeration remain prose-attach internal validator vocabulary (no behavior change at the validator side). The §External-Renderer Usage Guide stale section-numbering cleanup was already landed inline on 2026-05-26 per SPEC-91 §7.4 and is OUT of scope for this ticket.

## Assumption Reassessment (2026-05-26)

<!-- Items 1-3 always required. Items 4+ from menu, renumbered sequentially. -->

1. **Codebase reference check**: `reports/prose-quality-instructions.md` exists (277 lines as of the SPEC-91 reassessment, post-§7.4 inline cleanup). Line 115 still contains the 30+-prefix engine-vocabulary enumeration in Rule 9 (verified via `grep -n "CF-NNNN" reports/prose-quality-instructions.md`); lines 214-217 still contain the "post-render prose critic will flag" diagnostic enumeration paragraph; line 229+ still contains the Anti-Pathology Checklist axis-name-as-citation-token framing. The §External-Renderer Usage Guide at line 261+ has already been cleaned per SPEC-91 §7.4's inline-landed fix — that section is NOT touched by this ticket.
2. **Spec reference**: SPEC-91 §7.1 (Render-Time Instruction Template cleanup), §7.2 (Rule 9 enumeration replacement), and §7.3 (Anti-Pathology Checklist axis-name rewrite) specify the three edits with verbatim replacement text. The full engine-vocabulary token enumeration is preserved and moves to a validator-only source file (`tools/validators/src/structural/_engine-vocabulary-tokens.ts`) created by SPEC91PAGPLABOD-005 — this ticket does NOT create that file; it only references SPEC-91's design that the enumeration will live there once 005 lands.
3. **Cross-skill boundary**: `reports/prose-quality-instructions.md` is the SINGLE canonical source consumed by `branching-story-bootstrap` Phase 8 and `branching-story-turn-cycle` Phase 7 for inlining as plan §2 / §3 / §19. Per the user-confirmed §2/§3/§19 verbatim-inlining contract (feedback memory `page_plan_verbatim_sections`), edits to this file propagate to every subsequently-authored plan via the next bootstrap/turn-cycle invocation. No cross-page compaction is permissible (user decision 2026-05-12) — these sections stay inlined verbatim every page.
4. **FOUNDATIONS principle restatement**: §Tooling Recommendation (LLM agents should receive comprehensive context for the task) governs this ticket — the renderer's cold-context prompt should carry render-useful guidance, not validator-vocabulary that trains the renderer to think about a critic rubric. Rewording the renderer-facing prose to use plain "avoid X" language preserves the prompt's instructional payload while removing the rubric-thinking pathology.

## Architecture Check

1. **Why category-level Rule 9 replacement is cleaner than verbatim enumeration**: enumerating 30+ engine-vocabulary prefixes inline teaches the renderer the very tokens it should avoid — a self-defeating prompt-engineering pattern. The replacement category-level rule ("no record-id-shaped tokens, no schema field names, no validator vocabulary, no hash language, no append-only / supersession / lifecycle terminology, no patch / engine / op vocabulary") describes the prohibited shape without naming any specific token, breaking the teach-by-counter-example pathology. The full enumeration moves to a validator-only file (consumed by `engine_jargon_leak` and the new `page_plan_body_engine_vocabulary_cleanliness` validator from SPEC91PAGPLABOD-005) where it does its actual job — pattern-matching against rendered prose without being shown to the renderer.
2. **No backwards-compatibility shims**: the per-ticket edits land in `reports/prose-quality-instructions.md` directly; the next bootstrap/turn-cycle invocation inlines the updated content verbatim into the next page plan. Existing pre-SPEC-91 page plans with the old §2/§3/§19 content remain as-is per SPEC-91 §9 Migration / scope.

## Verification Layers

1. **§Render-Time Instruction Template diagnostic enumeration removed** → codebase grep-proof: `grep -E "post-render prose critic will flag|filter_word_saturation.*recurring_metaphor_across_pages" reports/prose-quality-instructions.md` returns ZERO matches.
2. **§Prose Craft Contract Rule 9 enumeration replaced with category-level rule** → codebase grep-proof: `grep -n "CF-NNNN" reports/prose-quality-instructions.md` returns matches ONLY in the Diagnostic Vocabulary table (line 158, where `ledger_jargon_leakage` cites example tokens for the internal-facing validator-vocabulary description); the renderer-facing Rule 9 prose at line 115 region carries the category-level wording instead.
3. **§Anti-Pathology Checklist axis-name framing reworded** → manual review confirming the per-bullet form changes from "Avoid `filter_word_saturation`. High density of..." to plain-language "Avoid high density of `I saw / heard / felt / noticed / knew / realized / clocked / named` constructions..."; axis names remain in the internal-facing Diagnostic Vocabulary table.
4. **Internal validator-vocabulary preservation** → codebase grep-proof: the Diagnostic Vocabulary table (lines ~149-160) and the eight axis names remain unchanged for prose-attach's `craft_critic` consumption.

## What to Change

### 1. Rewrite §Render-Time Instruction Template (currently lines 214-217)

Remove the paragraph beginning "Honor the PROSE CRAFT CONTRACT above. The post-render prose critic will flag..." and replace with the SPEC-91 §7.1 verbatim replacement:

> Honor the Prose Craft Contract above. Stay in close POV; cut filter words; put action in the verb; anchor abstraction to concrete sensory specifics; vary anchors and metaphor stocks across pages; trust subtext; use record-id-free language throughout.

The eight axis names (`filter_word_saturation` etc.) remain in the internal Diagnostic Vocabulary table for prose-attach's consumption; the renderer does not see them.

### 2. Rewrite §Prose Craft Contract Rule 9 (currently line 115)

Replace the 30+-prefix engine-vocabulary enumeration (`CF-NNNN, M-N, CAU-N, SOC-N, AES-N, ONT-N, DIS-N, OBL-NNNN, SF-NNNN, STENT-NNNN, SE-NNNN, THR-NNNN, CHC-NNNN, INV-N, SLT-NNNN, STINT-NNNN, SREL-NNNN, CNSQ-NNNN, STLOC-NNNN, STOBJ-NNNN, DA-NNNN, BR-NNNN, PG-NNNN, ENT-NNNN, SEC-*, ARCTRACE-NNNN, SAU-NNNN, RSP-NNNN, SP-NNNN, SLB-NNNN, PA-NNNN, CHAR-NNNN, STORY-NNNN`) with the SPEC-91 §7.2 verbatim replacement:

> No record-id-shaped tokens (uppercase class prefix followed by a hyphen and digits), no schema field names, no validator vocabulary, no hash language, no append-only / supersession / lifecycle terminology, no patch / engine / op vocabulary. The character does not know they live inside a ledger.

The full token enumeration will land in `tools/validators/src/structural/_engine-vocabulary-tokens.ts` per SPEC91PAGPLABOD-005 (out of scope for this ticket; this ticket only removes the inline enumeration from the renderer-facing prompt).

### 3. Rewrite §Anti-Pathology Checklist axis-name framing (currently lines 229+)

Replace each "Avoid `filter_word_saturation`..."-style bullet with the SPEC-91 §7.3 plain-language rewording. Example for the filter-word bullet:

> Avoid high density of `I saw / heard / felt / noticed / knew / realized / clocked / named` constructions. Cut filter words and use free indirect discourse. Keep a filter only when the perceiving IS the load-bearing event.

Apply the same rewording pattern to each axis-name-prefixed bullet — the axis names remain in the Diagnostic Vocabulary table (which is internal-facing) and as prose-attach validator output tokens.

### 4. Update file's revision history (top of file)

Add a line to the file's revision history at the top noting "2026-05-26: SPEC-91 cleanup — renderer-facing diagnostic-enumeration / engine-vocabulary-enumeration / axis-name-citation framing replaced with plain-language equivalents; internal Diagnostic Vocabulary table preserved for prose-attach consumption."

### 5. Verify no other skill or doc references the removed phrasings

Grep `.claude/skills/` and `docs/` for the removed phrasings (`post-render prose critic will flag`, the verbatim 30+-prefix list, the `Avoid \`filter_word_saturation\`` form). If any sibling consumer references these phrasings, surface the cross-spec follow-up at Step 6 per SPEC-91's spec-level scope; do not silently break sibling references.

## Files to Touch

- `reports/prose-quality-instructions.md` (modify)

## Out of Scope

- **§External-Renderer Usage Guide cleanup** — already landed inline on 2026-05-26 per SPEC-91 §7.4 ahead of this ticket. The stale section-numbering paragraph + two adjacent pre-rebuild references (`branching-story-page-cycle Phase 7` and the `branching-story-page-prose-finalize` paragraph) are already fixed; this ticket does NOT re-touch them.
- **Creating `tools/validators/src/structural/_engine-vocabulary-tokens.ts`** — covered by SPEC91PAGPLABOD-005.
- **Compacting §2/§3/§19 across pages** — explicitly prohibited per user decision 2026-05-12 + feedback memory `page_plan_verbatim_sections`; these sections stay verbatim every page.
- **Modifying the eight diagnostic axis names** (`filter_word_saturation`, `recurring_metaphor_across_pages`, `identical_anchor_recurrence`, `self_narrating_self`, `bracket_paraphrasing_dialogue`, `ledger_jargon_leakage`, `abstract_noun_saturation`, `padding_or_truncation`) — these remain as internal validator vocabulary and prose-attach `craft_critic` output tokens; this ticket only removes their appearance in the renderer-facing prompt.
- **Modifying the prose-attach 7-axis craft critic** at `tools/validators/`'s prose-attach surface — per SPEC-91 §2 Out of Scope.

## Acceptance Criteria

### Tests That Must Pass

1. **Diagnostic-token enumeration removed from renderer prompt**: `grep -E "post-render prose critic will flag|filter_word_saturation, recurring_metaphor_across_pages" reports/prose-quality-instructions.md` returns ZERO matches in the §Render-Time Instruction Template section (the surrounding Diagnostic Vocabulary table preserves the axis-name list separately).
2. **Rule 9 30+-prefix enumeration removed from renderer prompt**: `grep -n "CF-NNNN.*M-N.*CAU-N" reports/prose-quality-instructions.md` returns ZERO matches in the Rule 9 section (the Diagnostic Vocabulary table's `ledger_jargon_leakage` description preserves a smaller example-citation set, which is internal-facing).
3. **Anti-Pathology Checklist axis-name-as-citation framing reworded**: `grep -E "^\\s*-\\s+\\*\\*Avoid \`[a-z_]+\`" reports/prose-quality-instructions.md` returns ZERO matches; the bullets now lead with plain-language descriptions ("Avoid high density of...").
4. **Diagnostic Vocabulary table preserved**: `grep -B1 -A2 "filter_word_saturation\|recurring_metaphor_across_pages" reports/prose-quality-instructions.md` returns the table rows unchanged.

### Invariants

1. **Renderer-facing prompt contains no axis-name-as-citation framing or engine-vocabulary enumeration**: every reference to the eight axis names or the 30+-prefix token list either (a) lives in the internal Diagnostic Vocabulary table or (b) is removed entirely from the renderer-facing §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template sections.
2. **§2 / §3 / §19 verbatim-inlining contract preserved**: bootstrap Phase 8 and turn-cycle Phase 7 continue to inline §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template verbatim into per-page plan §2 / §3 / §19 — no compaction, no per-page abridgment.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "post-render prose critic will flag" reports/prose-quality-instructions.md` — should return ZERO matches.
2. `grep -n "CF-NNNN.*M-N.*CAU-N" reports/prose-quality-instructions.md` — should return ZERO matches (the Diagnostic Vocabulary table's smaller `CF-NNNN, M-N, CAU-N, SOC-N, OBL-NNNN, etc.` example set at line ~158 is internal-facing and remains; the renderer-facing Rule 9 prose's 30+-prefix enumeration is gone).
3. `grep -nE "^- \\*\\*Avoid \`(filter_word_saturation|recurring_metaphor_across_pages|identical_anchor_recurrence|self_narrating_self|bracket_paraphrasing_dialogue|ledger_jargon_leakage|abstract_noun_saturation|padding_or_truncation)\`" reports/prose-quality-instructions.md` — should return ZERO matches (axis-name-as-bullet-leader framing replaced with plain-language leaders).
4. `grep -B1 -A2 "filter_word_saturation\|recurring_metaphor_across_pages\|padding_or_truncation" reports/prose-quality-instructions.md` — should return Diagnostic Vocabulary table rows intact (internal validator vocabulary preserved).
5. `grep -rl "post-render prose critic will flag\|the prose critic will flag" .claude/skills/ docs/` — verifies no sibling consumer breaks when the renderer-facing phrasing is removed.
