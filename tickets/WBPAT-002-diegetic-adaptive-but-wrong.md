# WBPAT-002: diegetic-artifact-generation — "Adaptive-But-Wrong" Claim Axis

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — skill prose only (`.claude/skills/diegetic-artifact-generation/SKILL.md` + `.claude/skills/diegetic-artifact-generation/references/phases-4-6-text-composition.md` + `.claude/skills/diegetic-artifact-generation/references/phase-8-validation-tests.md`); claim-map structure gains an additive optional tag
**Deps**: none

## Problem

`reports/worldbuilding-patterns.md` Pattern #80 distills a load-bearing diegetic-document property:

> A local record should not simply say: "The toxic jungle cleans the planet."
> It might say: "The Holy Rot is the breath of the dead, and only fools enter it without masks."
> That belief is wrong in mechanism but right in practice.
> **Documents should preserve adaptive behavior even when their explanations are false.**

This is the **adaptive-but-wrong** axis: a claim where the in-world explanation diverges from canon truth, but the prescribed behavior is correct survival behavior under canon truth. Examples from worldbuilding-patterns.md: Nausicaä's Holy Rot (toxic jungle = planetary medicine, but masks-and-fear behavior is correct), Bloodborne's blood healing (sacrament-and-incense framing wraps real plague-vector behavior), Numenera's malfunction-as-curse (treating ancient tech as cursed produces correct avoid-handling behavior).

`diegetic-artifact-generation/SKILL.md` Phase 5 (Bias and Distortion Pass) and the Phase 3 claim-map structure (`canon_status`, `narrator_belief`, `source`, `contradiction_risk`, `mode`) tag claims along orthogonal axes — canon-truth, narrator-belief, source-tag, contradiction-risk, mode. These axes capture *whether the narrator believes a claim* and *whether the claim matches canon* INDEPENDENTLY, but they do not capture the **adaptive correctness** axis: when the narrator-belief is wrong AND the prescribed behavior is correct.

A claim tagged `narrator_belief: true, canon_status: false, mode: explanatory` reads as straightforward unreliable narration. The adaptive-but-wrong claim is structurally distinct: the wrong explanation accompanies correct behavior — the document's reader / hearer / follower is led into right-action via wrong-belief. This is what makes diegetic artifacts in works like Nausicaä, Bloodborne, Numenera, Roadside Picnic richer than mere unreliable-narrator framing.

The skill's narrator-belief tagging is necessary but insufficient for this richness. Without the explicit adaptive-but-wrong axis, generated artifacts default to one of two thinner shapes: (a) the narrator's beliefs match canon (boring), or (b) the narrator's beliefs diverge from canon and the prescribed behavior is therefore wrong (catastrophist). The third, richest shape — wrong belief that produces right behavior — is structurally absent unless the artifact author explicitly composes for it.

## Assumption Reassessment (2026-04-28)

1. **Phase 5 distortion pass currently lacks the adaptive-but-wrong prompt** — verified at `.claude/skills/diegetic-artifact-generation/SKILL.md:64-67` (Phase 5 prose: "author's omissions, overstatements, moralizations, unthinkables, audience-shaped pressures, institutions to flatter or fear"). The detailed Phase 5 prose lives at `.claude/skills/diegetic-artifact-generation/references/phases-4-6-text-composition.md` (ticket implementer must read this reference file before authoring the new prompt). The new prompt fires within Phase 5 alongside the existing distortion axes.

2. **Phase 3 claim-map already has a `mode` field** — verified at `.claude/skills/diegetic-artifact-generation/SKILL.md:131` ("Phase 3: build the tagged claim list (`canon_status`, `narrator_belief`, `source`, `contradiction_risk`, `mode`, `cf_id`, `mr_id`, `repair_trace`)"). The new tag `adaptive_behavior_preserved_under_wrong_ontology: true | false` is additive, defaulted to false, and is structurally compatible with the existing claim-map shape. The detailed schema lives at `.claude/skills/diegetic-artifact-generation/references/phases-1-3-claim-planning.md` (ticket implementer must read this reference file before adding the tag).

3. **Phase 8 currently has 11 tests** — verified at `.claude/skills/diegetic-artifact-generation/SKILL.md:88` ("Phase 8: Validation and Rejection Tests (11 tests)"). The detailed test list lives at `.claude/skills/diegetic-artifact-generation/references/phase-8-validation-tests.md`. The new conditional Test 12 fires after Test 11 and before the Phase 9 commit gate.

4. **Test 12 is conditional, not universal** — adaptive-but-wrong is load-bearing for in-world explanatory texts (folk myth, religious tract, propaganda, herbal, settlement law, oral history, sermon, prayer, folk tale) but NOT for texts where the author is a trained scholar / objective recorder / first-hand witness whose explanations match canon (after-action report, scholarly chronicle by educated observer, expedition journal by trained naturalist, primary-source legal decree). The conditional firing avoids forcing adaptive-but-wrong claims into artifacts where they would be artificial.

5. **Cross-skill boundary: `canon-facts-from-diegetic-artifacts` and `diegetic-artifact-generation`** — `canon-facts-from-diegetic-artifacts/SKILL.md` mines existing diegetic artifacts for canon-fact proposals with an explicit Diegetic-to-World laundering firewall. Adding the adaptive-but-wrong tag to claim-map output is consumed by this sibling skill: a claim tagged `adaptive_behavior_preserved_under_wrong_ontology: true` is an explicit signal that the narrator-belief should NOT be laundered to canon at face value, but the prescribed-behavior CAN be (the behavior is right; the explanation isn't). This ticket's tag flows through the existing firewall logic without requiring a sibling-skill amendment.

6. **FOUNDATIONS principle motivating the ticket**: §Canon Layers (Contested Canon — "claims present in-world but not world-level truth; legends, propaganda, false scholarship, conflicting chronicles, folk explanations, court lies, priestly doctrine"). The adaptive-but-wrong axis is a sub-shape of contested canon: a contested claim whose in-world function is correct prescriptive behavior. FOUNDATIONS already permits and encourages contested canon; this ticket equips the diegetic-artifact-generation skill to compose for it explicitly.

7. **Schema impact**: ADDITIVE-ONLY. The new tag `adaptive_behavior_preserved_under_wrong_ontology` is an optional boolean defaulted to false. Existing artifacts in `worlds/<slug>/diegetic-artifacts/` parse cleanly without the tag (omitted = default false). No frontmatter field added at the top-level artifact frontmatter; the tag rides inside the `claim_map[].entries[]` shape that already permits per-claim tags.

8. **Pattern-signal embedding (per user direction — skills self-contained)**: The new Phase 5 prompt and Test 12 prose enumerate the load-bearing pattern (Pattern #80) inline and cite the FOUNDATIONS §Canon Layers / Contested Canon section by name; no external pattern catalog is referenced.

## Architecture Check

1. **Why Phase 5 + Phase 8 (composition + validation) and not Phase 3 (planning)?** Phase 3 plans the claim list; Phase 5 introduces distortion; Phase 6 drafts text. Adaptive-but-wrong is fundamentally a *distortion shape* — the wrong explanation IS the distortion, and the right behavior is what the distortion preserves. Embedding the prompt at Phase 5 follows the existing distortion-pass discipline. Phase 8 validates that conditional artifact types actually carry the shape (or explicitly justify NONE).

2. **Why a single conditional Test 12 and not a universal one?** Adaptive-but-wrong is structurally load-bearing for explanatory in-world genres but artificial for objective-record genres. A universal test would force the prompt onto scholarly chronicles by trained authors, where wrong-explanation-with-right-behavior would itself be a canon-safety violation (the trained scholar shouldn't get explanations wrong). Conditional firing on `artifact_type ∈ {folk myth, religious tract, propaganda, herbal, settlement law, oral history, sermon, prayer, folk tale}` matches the genre-convention discipline already in Phase 2. NONE-with-rationale is permitted within the conditional set when the artifact's specific narrator (e.g., a literate temple scribe who happens to author a sermon but is canonically informed) does not fit the adaptive-but-wrong shape.

3. **No backwards-compatibility shims introduced.** The new tag is additive; existing artifacts parse cleanly. Test 12 is judgment-only (not validator-bound) per Phase 8's existing discipline.

## What to Change

1. **`.claude/skills/diegetic-artifact-generation/references/phase-0-normalize-and-author.md` OR `phases-1-3-claim-planning.md`** — extend the claim-map per-entry schema documentation to include the new optional tag:

   > `adaptive_behavior_preserved_under_wrong_ontology: true | false` (optional, default false). When `true`, the claim's narrator-belief diverges from canon AND the prescribed behavior the claim implies is the correct survival / social / ritual behavior under canon truth. Pattern #80 from `reports/worldbuilding-patterns.md`. Examples: a folk-myth claim "the Rot is the breath of the dead, mask yourself" where canon-truth is "the Rot is planetary medicine, masking is correct because the spores are still toxic to humans"; a religious-tract claim "blood healing is sacrament, attend ministration only at consecrated hours" where canon-truth is "the blood is contaminated, the consecrated-hours scheduling slows infection-vector saturation."

2. **`.claude/skills/diegetic-artifact-generation/references/phases-4-6-text-composition.md` §Phase 5** — add a new prompt within the existing distortion-axis enumeration:

   > **Adaptive-but-wrong distortion** (Pattern #80). Ask: *Does any claim in this artifact preserve correct adaptive behavior under a wrong ontology / explanation?* If the artifact is composed for an in-world explanatory genre (folk myth, religious tract, propaganda, herbal, settlement law, oral history, sermon, prayer, folk tale) AND the author is plausibly mistaken about mechanism while plausibly correct about prescribed action, tag the relevant claim's `adaptive_behavior_preserved_under_wrong_ontology: true`. The wrong explanation IS the distortion; the right behavior is what the distortion preserves. NOT every claim needs the tag; tag only claims where the divergence between explanation and behavior is the load-bearing rhetorical shape. For artifacts whose author is canonically informed (trained scholar, primary witness), this prompt may yield zero tagged claims — that is acceptable and is captured at Phase 8 Test 12 via the NONE-with-rationale path.

3. **`.claude/skills/diegetic-artifact-generation/references/phase-8-validation-tests.md`** — append Test 12:

   > **12. Adaptive-But-Wrong Coverage (FOUNDATIONS §Canon Layers / Contested Canon — Pattern #80)** — judgment only. Conditional: fires when `artifact_type ∈ {folk myth, religious tract, propaganda, herbal, settlement law, oral history, sermon, prayer, folk tale}`. PASS requires either:
   >
   > - **(a) Adaptive-but-wrong claim present** — ≥1 claim in the artifact's `claim_map` carries `adaptive_behavior_preserved_under_wrong_ontology: true`. PASS rationale cites the claim, its wrong-ontology framing, and the canon-true-behavior the framing produces. Example rationale: "Claim 4 ('the Rot is the breath of the dead'): wrong ontology = animist haunting; canon-true behavior = wear masks, avoid still air, do not enter without escort. Adaptive correctness preserved under false explanation."
   > - **(b) NONE-with-rationale** — no adaptive-but-wrong claim is present, AND the rationale explains why the artifact's specific narrator / audience / purpose makes the shape inappropriate. Example rationale: "NONE — narrator is a temple scribe trained at the Aer Citadel; explanations match the temple's canonical doctrine which itself matches CF-0023; no wrong-mechanism layer."
   >
   > FAIL trigger: artifact_type matches the conditional set, AND no claim carries the tag, AND no NONE-rationale is provided. FAIL routes back to Phase 5 distortion pass.

4. **`.claude/skills/diegetic-artifact-generation/SKILL.md` §Procedure step 6 (Phase 8)** — change the test count from "11 tests" to "12 tests" in the prose. Cross-reference to `references/phase-8-validation-tests.md`.

5. **`.claude/skills/diegetic-artifact-generation/SKILL.md` §HARD-GATE block** — verify the existing "Phase 8 Validation and Rejection Tests record PASS with a one-line rationale for every test" prose remains accurate (the `every test` clause already covers Test 12 once the count moves to 12).

## Verification Layers

| Invariant | Verification surface |
|---|---|
| Phase 8 has 12 tests (not 11) | codebase grep-proof — `.claude/skills/diegetic-artifact-generation/SKILL.md` Procedure step 6 contains "12 tests" |
| Test 12 prose lives in the reference file | codebase grep-proof — `references/phase-8-validation-tests.md` contains "Adaptive-But-Wrong Coverage" literal phrase |
| Phase 5 prompt lives in the reference file | codebase grep-proof — `references/phases-4-6-text-composition.md` contains "Adaptive-but-wrong distortion" literal phrase |
| New tag is documented | codebase grep-proof — `references/phases-1-3-claim-planning.md` (or `phase-0-normalize-and-author.md`) contains `adaptive_behavior_preserved_under_wrong_ontology` literal token |
| Test 12 fails on a folk-myth artifact lacking the tag | skill dry-run — generate a folk-myth artifact against `worlds/animalia/` with no adaptive-but-wrong claim and no NONE-rationale; Test 12 must FAIL |
| Test 12 passes on a folk-myth artifact with the tag | skill dry-run — generate a folk-myth artifact with ≥1 tagged claim; Test 12 must PASS with the claim cited |
| Test 12 passes on a scholarly chronicle via NONE-rationale | skill dry-run — generate a scholarly chronicle (artifact_type outside the conditional set, OR artifact_type within the set but with NONE-rationale documented); Test 12 must PASS |
| Test 12 does not fire on artifact types outside the conditional set | skill dry-run — generate an after-action report; Test 12 must report N/A or PASS-trivially with rationale "artifact_type outside conditional set" |
| Existing artifacts parse cleanly | schema validation — existing `worlds/animalia/diegetic-artifacts/*.md` files parse without the new tag (additive-only, default false) |
| Cross-skill compatibility with `canon-facts-from-diegetic-artifacts` | manual review — confirm the new tag does not cause false-positive proposal-card emission when the sibling skill mines an artifact whose narrator-belief is wrong but whose behavior is right |
| Diegetic-to-world firewall preserved | manual review — confirm the tag's presence does NOT itself trigger canon-fact creation; the tag is metadata on a contested claim, not a canon-fact promotion signal |

## Tests

1. **Targeted skill dry-run (folk myth, missing tag)**:
   ```
   # Brief: artifact_type=folk myth, place=Brinewick, audience=fishing crews,
   #        communicative_purpose=warn against the salt-fog,
   #        relation_to_truth=mythic-but-functionally-protective
   # Expected: Phase 5 prompt fires; if author skips the tag, Test 12 FAILS
   ```
   Invoke `diegetic-artifact-generation` against `worlds/animalia/` with the brief above; inspect the Canon Safety Check Trace.

2. **Targeted skill dry-run (folk myth, with tag)**:
   ```
   # Same brief; author tags claim 3 as adaptive_behavior_preserved_under_wrong_ontology: true
   # (claim 3: "the salt-fog carries drowned-soul whispers; sing the Anchor Hymn before sailing")
   # Canon-true behavior: the hymn timing maps to slack-tide departure windows
   # which are the only safe sailing times. Wrong ontology preserves right schedule.
   # Expected: Test 12 PASSES with claim 3 cited
   ```

3. **Targeted skill dry-run (scholarly chronicle, NONE-rationale)**:
   ```
   # Brief: artifact_type=scholarly chronicle, author=trained naturalist,
   #        relation_to_truth=careful-objective-recording
   # Expected: Test 12 PASSES via NONE-rationale citing trained-author / canon-aligned-doctrine
   ```

4. **Full-pipeline grep**:
   ```
   grep -n "Adaptive-But-Wrong Coverage" .claude/skills/diegetic-artifact-generation/references/phase-8-validation-tests.md
   grep -n "Adaptive-but-wrong distortion" .claude/skills/diegetic-artifact-generation/references/phases-4-6-text-composition.md
   grep -n "adaptive_behavior_preserved_under_wrong_ontology" .claude/skills/diegetic-artifact-generation/references/
   grep -n "12 tests" .claude/skills/diegetic-artifact-generation/SKILL.md
   ```

5. **Cross-skill regression check**:
   ```
   # Verify canon-facts-from-diegetic-artifacts does not silently launder
   # adaptive-but-wrong claims into proposal cards
   grep -nE "adaptive_behavior_preserved" .claude/skills/canon-facts-from-diegetic-artifacts/
   # Expect: no false-positive matches; the firewall logic is unaffected because
   # the tag rides on contested-canon claims that the firewall already handles
   ```

6. **Schema-validation (additive-only confirmation)**:
   ```
   # Validate every existing artifact still passes record_schema_compliance
   # after the optional tag is documented (existing artifacts do not carry it,
   # default false, no schema break)
   node tools/validators/dist/cli/world-validate.js worlds/animalia
   ```

## Out of Scope

- Retrofitting existing artifacts in `worlds/<slug>/diegetic-artifacts/` to carry the new tag. Existing artifacts remain at their original substrate; Test 12 fires only on artifacts generated after this ticket lands.
- Promoting Test 12 to a mechanical validator. Phase 8 is judgment-only by design.
- Introducing a top-level frontmatter field for adaptive-but-wrong artifacts. The tag rides per-claim inside `claim_map`; top-level frontmatter is unchanged.
- Amending `canon-facts-from-diegetic-artifacts/SKILL.md` to recognize the tag. The sibling skill's existing Diegetic-to-World firewall already handles contested-canon claims; the tag is consumed metadata, not a new firewall surface. If sibling-skill behavior surfaces a gap during dry-runs, file a follow-up ticket.
