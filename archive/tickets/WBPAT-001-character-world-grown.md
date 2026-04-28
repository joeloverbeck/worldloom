# WBPAT-001: character-generation — Phase 8 "World-Grown Specificity" Rejection Test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — skill prose only (`.claude/skills/character-generation/SKILL.md`, `.claude/skills/character-generation/references/phase-8-validation-tests.md`, `.claude/skills/character-generation/templates/character-dossier.md`, `.claude/skills/character-generation/references/governance-and-foundations.md`)
**Deps**: none

## Problem

`reports/worldbuilding-patterns.md` Patterns #4 (professions born from premise), #27 (body politics), #29 (visible interiority), #30 (character niche density), #72 (small-scale life + cosmic metaphysics), #82 (institutional smell) collectively define **world-grown character**: a character whose profession + capability + institutional embedding + voice metaphors + body / personhood condition + epistemic position collectively make them implausible in any other world.

This is the FOUNDATIONS §World Queries question "What kinds of people can plausibly exist here?" applied per-character.

At intake, `character-generation/SKILL.md` Phase 7 (Canon Safety Check) verified invariant conformance, Mystery Reserve firewall, and distribution / scope conformance against capability CFs. Phase 8 ran 9 validation and rejection tests. None of the 9 tests asked the inverse: **could this character be lifted into another world without rewriting?**

A dossier can pass all current Phase 7 + 8 tests while being world-portable: profession=`blacksmith`, capability=`swordsmanship`, institutional embedding=`local guild member`, voice metaphors=`generic medieval-fantasy register`, body=`unmodified human`, epistemic position=`trusts village elders`. None of those bindings violates any current check, but the character is structurally a generic-fantasy stand-in bolted onto the world rather than grown by it. This produces dossiers that satisfy the canon-safety contract while failing the worldbuilding-richness contract — exactly the gap `reports/worldbuilding-patterns.md` Pattern #30 identifies.

## Assumption Reassessment (2026-04-28)

1. **At intake, Phase 8 had 9 tests** — verified before implementation at `.claude/skills/character-generation/SKILL.md` ("Run all 9 tests and record each as PASS / FAIL with a one-line rationale") and `.claude/skills/character-generation/references/phase-8-validation-tests.md`. This ticket adds Test 10 after Test 9 and before the Phase 9 commit gate.

2. **Phase 1–6 binding to world entities is already mandatory** — verified at `.claude/skills/character-generation/SKILL.md:114` ("Each phase cites the world-state nodes it draws from (CFs, INVs, SEC records, ENT records, M entries)"). World-Grown Specificity does NOT add new binding requirements; it adds a structural test that the bindings collectively achieve world-specificity. Existing Phase 5 capability validation already enforces capability-CF distribution conformance per binding; Test 10 reasons over the assembled binding set.

3. **Cross-skill boundary: `propose-new-characters` and `character-generation`** — `propose-new-characters/SKILL.md` (canon-reading skill) emits character-proposal cards consumed as `character-generation`'s `character_brief_path`. Test 10 runs at the `character-generation` Phase 8 stage, AFTER the brief is consumed and Phase 1–6 have constructed the dossier. `propose-new-characters` is unaffected by this ticket — its proposal cards already contain niche / essence audit material that becomes Phase 1–6 input. The shared boundary is the brief; this ticket changes the consumer, not the producer.

4. **FOUNDATIONS principle motivating the ticket**: §World Queries #6 ("What kinds of people can plausibly exist here?") and §Mandatory World Files (the world is "a constrained model of ... embodiment, institutions, ... daily life"). A character that could exist anywhere does not exercise the world's constraints; a character that exercises the constraints is by definition world-grown.

5. **Schema impact**: NONE. Test 10 reads existing dossier fields (`profession`, `world_consistency.canon_facts_consulted`, `world_consistency.invariants_respected`, body section content) and emits a single PASS / FAIL line in the Canon Safety Check Trace section per Phase 8's existing format. No frontmatter field added; no new YAML key emitted.

6. **Pattern-signal embedding (per user direction — skills self-contained)**: SPEC-18 brainstorming established that no separate `references/worldbuilding-patterns-checklist.md` doc is created. Test 10's rationale prose enumerates the load-bearing patterns inline and the FOUNDATIONS §World Queries #6 citation; the test does not reference an external pattern catalog.

7. **Reassessment correction**: the exact "What kinds of people can plausibly exist here?" phrase lives in `docs/FOUNDATIONS.md` §World Queries Every Tool Must Be Able To Answer, not the later §Acceptance Tests list. The implemented Test 10 and this ticket cite §World Queries #6. Same-seam "9 tests" wording in the character dossier template and governance reference was owned fallout and is updated with the skill prose.

## Architecture Check

1. **Why Phase 8 (validation) and not Phase 1–6 (construction)?** Test 10 reasons over the assembled binding set, which only exists after Phase 1–6 finish. Embedding world-grownness as a Phase 1–6 construction prompt would force premature decisions; embedding it as a Phase 8 validation lets construction proceed naturally and rejects insufficiently-grown dossiers as a final gate.

2. **Why a single Test 10 and not 6 separate tests (one per pattern)?** Pattern #4 / #27 / #29 / #30 / #72 / #82 are facets of the same structural property (the dossier exercises world constraints). A single test with an enumerated PASS-rationale (≥3 of 6 specificity axes named) is a stricter check than 6 weak tests because it forces the implementer to count specificities collectively rather than score them individually. Mirrors the SPEC-18 Track A2 "Rule 11 leverage at genesis" pattern: one test, multiple permissible leverage forms, ≥3 required.

3. **No backwards-compatibility shims introduced.** Test 10 is additive; existing dossiers in `worlds/<slug>/characters/` are not retrofitted. The Final Rule's "append-only by construction" property is preserved.

## What to Change

1. **`.claude/skills/character-generation/SKILL.md` §Procedure step 5 (Phase 8)** — change the test count from "9 tests" to "10 tests" in the prose. Cross-reference to `references/phase-8-validation-tests.md` for the new test definition.

2. **`.claude/skills/character-generation/references/phase-8-validation-tests.md`** — append Test 10 with the format matching existing tests:

   > **10. World-Grown Specificity (FOUNDATIONS §World Queries #6 "What kinds of people can plausibly exist here?")** — judgment only. This test carries the worldbuilding-pattern signal from Pattern #4 / #27 / #29 / #30 / #72 / #82: the dossier's profession + capability + institutional embedding + voice metaphors + body / personhood condition + epistemic position collectively make this character implausible in another world. PASS rationale MUST enumerate ≥3 of the following six specificity axes, citing the specific world-state record or dossier-section that grounds each:
   >
   > - **Profession premise-specificity** (Pattern #4 / #82) — the character's profession exists because of the world's premise; it cannot be lifted into a generic-fantasy or generic-modern setting unchanged. Cite the SEC-INS / CF that grounds the profession.
   > - **Capability gating by world-specific CF** (Pattern #26) — the character's capability is exercised within the distribution / cost / stabilizer envelope of a specific CF. Cite the CF and the binding rationale.
   > - **Institutional embedding via world-specific records** (Pattern #38 / #82) — the character's institutional axes (family, law, religion, employer, military, taboo) cite world-specific INV / SEC / ENT records by id. Cite ≥1 such binding.
   > - **Voice metaphors from world-specific sources** (Pattern #29 / #97) — the character's metaphors and idioms draw from world-specific environmental / social / metaphysical material (not generic-register). Cite ≥1 metaphor and its world-source.
   > - **Body / personhood condition** (Pattern #27 / #28) — the character's body is shaped by world-specific embodiment rules (species traits / body modifications / aging rules / kinship marks). Cite the SEC-PAS / CF / INV that grounds the condition.
   > - **Epistemic position grounded in world-specific information topology** (Pattern #19 / #69) — what the character knows / believes / cannot know is structured by the world's information environment (literacy distribution / propaganda / managed ignorance / forbidden knowledge). Cite the M / CF / INV that grounds the position.
   >
   > FAIL trigger: <3 specificity axes can be cited, OR the cited bindings are nominal (e.g., "profession=blacksmith" without explaining why the world's smelting / metallurgy / labor distribution makes the role specifically world-grown). FAIL routes back to the responsible Phase 1–6 phase (Phase 5 for capability, Phase 2 for institutional, Phase 6 for voice, Phase 1 for body, Phase 3 for epistemic, Phase 0 for profession).

3. **`.claude/skills/character-generation/SKILL.md` §HARD-GATE block** — verify the existing "Phase 8 Validation and Rejection Tests record PASS with one-line rationale for every test" prose remains accurate (the `every test` clause already covers Test 10 once the count moves to 10; no edit needed).

## Verification Layers

| Invariant | Verification surface |
|---|---|
| Phase 8 has 10 tests (not 9) | codebase grep-proof — `.claude/skills/character-generation/SKILL.md` Procedure step 5 contains "10 tests" |
| Test 10 prose lives in the reference file | codebase grep-proof — `.claude/skills/character-generation/references/phase-8-validation-tests.md` contains "World-Grown Specificity" literal phrase |
| Test 10 rejects a deliberately generic dossier shape | manual review — Test 10 contains the `<3 specificity axes` and nominal-binding FAIL trigger, with phase routing back to construction |
| Test 10 accepts a world-specific dossier shape | manual review — Test 10 requires PASS rationale to enumerate ≥3 cited specificity axes |
| FOUNDATIONS alignment | FOUNDATIONS alignment check — Test 10's prose cites §World Queries #6 by name |
| No regression on Tests 1–9 | manual review — confirm Test 10's addition does not alter Tests 1–9 prose; existing PASS/FAIL behavior on `worlds/animalia/characters/` unchanged |

## Tests

1. **Targeted rejection-contract review**:
   ```
   grep -n "FAIL trigger: fewer than 3 specificity axes" .claude/skills/character-generation/references/phase-8-validation-tests.md
   ```
   Expected: Test 10 rejects a generic dossier shape with <3 cited specificity axes or nominal bindings.

2. **Targeted pass-contract review**:
   ```
   grep -n "PASS rationale MUST enumerate at least 3" .claude/skills/character-generation/references/phase-8-validation-tests.md
   ```
   Expected: Test 10 requires a world-specific PASS rationale with at least 3 cited axes.

3. **Full-pipeline grep**:
   ```
   grep -n "World-Grown Specificity" .claude/skills/character-generation/references/phase-8-validation-tests.md
   grep -n "10 tests" .claude/skills/character-generation/SKILL.md
   ```

4. **Pattern-signal grep** (verify inline pattern citations land):
   ```
   grep -nE "Pattern #(4|27|29|30|72|82)" .claude/skills/character-generation/references/phase-8-validation-tests.md
   ```

## Out of Scope

- Retrofitting existing dossiers in `worlds/<slug>/characters/` against Test 10. Existing dossiers remain at their original substrate; Test 10 fires only on dossiers generated after this ticket lands.
- Promoting Test 10 to a mechanical validator. Phase 8 is judgment-only by design.
- Adding a `world_grown_specificity_axes[]` frontmatter field to the dossier schema. The Canon Safety Check Trace prose is sufficient; schema extension is future-cleanup if false-pass rates surface.

## Files to Touch

- `.claude/skills/character-generation/SKILL.md` (modify)
- `.claude/skills/character-generation/references/phase-8-validation-tests.md` (modify)
- `.claude/skills/character-generation/templates/character-dossier.md` (modify)
- `.claude/skills/character-generation/references/governance-and-foundations.md` (modify)
- `archive/tickets/WBPAT-001-character-world-grown.md` (modify after archival closeout)

## Outcome

Completion date: 2026-04-28.

Implemented Phase 8 Test 10 as a judgment-only world-grown specificity rejection test. The skill now requires 10 Phase 8 tests and the Phase 9 deliverable summary reports 10 test results. The Phase 8 reference defines Test 10's six specificity axes, the fail trigger, and phase routing for repairs. Same-seam template and governance prose now reflect the 10-test contract and the Rule 2 / FOUNDATIONS World Queries #6 alignment.

## Verification Result

1. `grep -n "World-Grown Specificity" .claude/skills/character-generation/references/phase-8-validation-tests.md` — passed; Test 10 is present in the Phase 8 reference.
2. `grep -n "10 tests" .claude/skills/character-generation/SKILL.md` — passed; Procedure step 5 now requires 10 tests.
3. `grep -n "FAIL trigger: fewer than 3 specificity axes" .claude/skills/character-generation/references/phase-8-validation-tests.md` — passed; the generic-dossier rejection contract is explicit.
4. `grep -n "PASS rationale MUST enumerate at least 3" .claude/skills/character-generation/references/phase-8-validation-tests.md` — passed; the world-specific PASS contract is explicit.
5. `grep -nE "Pattern #(4|27|29|30|72|82)" .claude/skills/character-generation/references/phase-8-validation-tests.md` — passed for the pattern-signal proof; the implemented axes cite the relevant pattern family and include additional adjacent patterns from the ticket's drafted axis text.
6. `grep -n "Record each of the 10 tests" .claude/skills/character-generation/templates/character-dossier.md` — passed; the dossier template no longer preserves the stale 9-test instruction.
7. `grep -n "World Queries #6" .claude/skills/character-generation/references/governance-and-foundations.md .claude/skills/character-generation/references/phase-8-validation-tests.md archive/tickets/WBPAT-001-character-world-grown.md` — passed; the FOUNDATIONS citation is corrected to the live authority section.
8. `git diff --check` — passed.
9. Manual review — Tests 1-9 in `phase-8-validation-tests.md` were left unchanged; the HARD-GATE block already said "every test" and did not need semantic weakening or approval-token changes.

## Deviations

- The ticket originally drafted skill dry-runs against `worlds/animalia/`, but reassessment kept this ticket on the prose-only skill validation checklist. No character dossier was generated or written because doing so would trigger the content-generation HARD-GATE workflow and require user deliverable approval. The truthful proof boundary is grep/manual review of the skill contract.
- The ticket's original FOUNDATIONS citation named §Acceptance Tests for the "What kinds of people can plausibly exist here?" phrase. Live `docs/FOUNDATIONS.md` places that exact phrase under §World Queries Every Tool Must Be Able To Answer, so implementation and closeout use §World Queries #6.
