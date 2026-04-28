<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-18: Genesis-CF Fertility and Misrecognition Alignment

**Status**: PROPOSED
**Phase**: post-pilot world-creation hardening (independent of SPEC-09 / SPEC-15 / SPEC-16 / SPEC-17 — touches different skill surfaces)
**Depends on**: none (additive-only changes to two skills)
**Blocks**: none
**Source**: `reports/worldbuilding-patterns.md` (ChatGPT-Pro distillation of user worldbuilding preferences; already integrated into `propose-new-worlds-from-preferences`); cross-checked against `docs/FOUNDATIONS.md` §Acceptance Tests.

## Problem Statement

Two structural gaps in canon-mutating skills mean that worldloom worlds can pass current skill validation while failing FOUNDATIONS' own §Acceptance Tests, and can accept canon facts that ignore one of FOUNDATIONS' load-bearing acceptance questions ("what do people falsely believe?").

### Gap 1: Worlds born via `create-base-world` are structurally thinner at genesis than worlds born from a `propose-new-worlds-from-preferences` NWP card

`propose-new-worlds-from-preferences/SKILL.md` Phase 7 enforces a 3-order consequence skeleton and ≥3 spectator-caste leverage forms; Phase 10 enforces ≥7 institution categories, ≥4 factions, ≥10 ordinary-life consequences, and an equilibrium explanation per NWP card; Phase 12 backstops with 19 tests including One-Sentence Fertility (Test 1), Minimal Departure (Test 2), and Spectator-Caste Leverage (Test 18).

`create-base-world/SKILL.md` Phase 4–9 emit one minimal section per prose concern, a CF-0001 with no required propagation breadth, and a Phase 9 self-validation list of ~10 inline rejection tests. Cross-checked against FOUNDATIONS §Acceptance Tests (11 questions), Phase 9 covers ~6 of 11. Five FOUNDATIONS Acceptance Tests are absent or partial:

1. **Counterfactual** — "Why does the world currently look like this and not some nearby alternative?"
2. **Inequality structure** — "What forms of inequality are structurally produced?"
3. **Embodiment-forces** — "What does embodiment force?"
4. **Scarcity-forces** — "What does scarcity force?"
5. **Multi-perspective** — "What would a child, a laborer, a priest, a smuggler, and a ruler each think the world fundamentally is?"

Additionally absent at genesis but present in the NWP-card pipeline:

- **One-Sentence Fertility** (Pattern #1, #98 — concrete impossibility vs. vague wonder; "dragons exist" is weak, "dragon bones anchor cities against earthquakes" is fertile).
- **3-order consequence propagation** (Pattern #2, #67 — first / second / third-order effects across ≥N domains required at genesis, not deferred to subsequent canon-addition runs).
- **Native Story Procedures** (Pattern #66, #71 — story types impossible elsewhere; the world's "native mode of investigation").
- **Rule 11 leverage at genesis** (FOUNDATIONS §Validation Rules Rule 11; if CF-0001 introduces or depends on exceptional capability, ≥3 leverage forms for ordinary / mid-tier actors).

The asymmetry matters because `create-base-world` is the genesis surface for every worldloom world; if a world is born without these tests passing, every later `canon-addition` run inherits a thin substrate that the per-CF rigor cannot retroactively repair (Rule 6 No Silent Retcons makes substrate retrofit costly).

### Gap 2: `canon-addition` Phase 0 doesn't probe the FOUNDATIONS Acceptance Test "What do people falsely believe?"

The CF Record Schema's `truth_scope.diegetic_status` enum (`objective | believed | disputed | propagandistic | legendary`) and `epistemic_profile.distortion_vectors[]` / `knowledge_exclusions[]` blocks already support misrecognition layering — a fact can be world-level true while the broader population believes a coherent and adaptive falsehood about it (Pattern #19 old catastrophe misunderstood by present, #54 misrecognition as worldbuilding, #69 distorted self-explanation, #80 documents preserve adaptive behavior under wrong explanation, #81 multi-truth layers).

`canon-addition/SKILL.md` Phase 0 normalizes the proposal and classifies fact type but does not actively probe the misrecognition layer. The FOUNDATIONS Acceptance Test "What do people falsely believe?" is currently exercised only at world creation (and even there, only partially per Gap 1) — not at per-fact addition where it is most actionable. Proposers can canonize facts as `diegetic_status: objective` without ever being asked whether the fact has a public misrecognition layer, even when the in-world population's belief is materially divergent from the canonical truth.

This is not a schema gap (the schema supports it) — it is a flow-blindness gap. The misrecognition layer rides for free in the schema; the skill flow does not invite proposers to populate it.

## Approach

Two tracks, each additive to existing skill prose. No engine changes, no validator changes, no schema changes — both tracks land in skill SKILL.md prose and consume schema fields that already exist.

### Track A: `create-base-world` Genesis-CF Fertility Hardening

Three sub-changes to `create-base-world/SKILL.md`:

**A1. Phase 4 — substantive initial-section materialization.** Currently Phase 4 emits one minimal section per prose concern with `touched_by_cf: [CF-0001]` for sections whose file class appears in CF-0001's `required_world_updates`. The bidirectional pointer holds, but the section bodies are not required to materialize CF-0001's first-order consequences in prose — the body can be a stub with the pointer carrying all the weight. Track A1 amends Phase 4 to require each touched section's body to enumerate ≥1 first-order consequence of CF-0001 in concrete prose (food / labor / law / mourning / class / etc., domain-appropriate to the section's file class). Stubs that defer materialization to later `canon-addition` runs are rejected at Phase 9.

**A2. Phase 8 — CF-0001 propagation breadth + Rule 11 leverage at genesis.** Before SPEC18GENFER-002, Phase 8 required `domains_affected[]` to be populated with canonical-domain values but set no minimum spread. Track A2 amends Phase 8 to:

- Require `domains_affected[]` to span ≥4 canonical domains (mirroring NWP-card Phase 12 Test 3's ≥8-domain bar, scaled down for atomic CF — the genesis bar is fact-level breadth, not world-level breadth).
- Require `visible_consequences[]` to enumerate first / second / third-order consequences explicitly, distinguishing immediate effects (first-order) from cascade effects through institutions / professions / taboos (second-order) from far-edge effects on language / mourning / childhood (third-order). Three orders is the genesis bar; weaker propagation routes back to Phase 0.
- If CF-0001's structure introduces or depends on exceptional capability (per existing `requiresExceptionGovernance(cf.type)` taxonomy), require Rule 11 leverage block populated with ≥3 distinct ordinary- / mid-tier-actor leverage forms (locality / secrecy / legitimacy / bureaucracy / numbers / ritual authority / domain expertise / access / timing / social trust / deniability / infrastructural control). The leverage forms MUST land in CF-0001's `notes` field as a `leverage:`-prefixed comma-separated line (matching the `rule11_action_space` validator's parsing convention used by canon-addition Phase 14a Test 11; the validator scans `cf.notes` for lines containing the word "leverage" and splits on `,`/`;`/`|`). Track A2 names this the **genesis spectator-caste check** so it parallels the NWP card's Phase 12 Test 18.

**A3. Phase 9 — five new FOUNDATIONS Acceptance Tests + One-Sentence Fertility + Native Story Procedures + genesis spectator-caste check.** Track A3 amends Phase 9's rejection-test list to add eight new tests; each fires as judgment-only (consistent with Phase 9's existing test discipline — none are validator-bound at Phase-9 time, though the eighth test mirrors the mechanical `rule11_action_space` validator's logic so Phase 9 catches a malformed leverage block before the Phase 10 HARD-GATE rather than at the Phase 11 engine pre-apply pass). The new tests, in order:

| Test | FOUNDATIONS / Pattern source | What it asks |
|---|---|---|
| Counterfactual | FOUNDATIONS §Acceptance Tests #1 | Why this world and not a nearby alternative? Name ≥1 nearby alternative the world rejected and the constraint that forced it. |
| Inequality structure | FOUNDATIONS §Acceptance Tests #4 | What forms of inequality are structurally produced (not merely culturally permitted)? Name ≥2. |
| Embodiment-forces | FOUNDATIONS §Acceptance Tests #6 | What does embodiment force? Name ≥1 species / body-class / kinship consequence the embodiment-departures impose. |
| Scarcity-forces | FOUNDATIONS §Acceptance Tests #7 | What does scarcity force? Name the scarcest survival variable and ≥1 institutional / cultural consequence it produces. |
| Multi-perspective | FOUNDATIONS §Acceptance Tests #11 | Would a child / laborer / priest / smuggler / ruler each think the world fundamentally is the same thing? If they would all agree, the world has insufficient social-class divergence. |
| One-Sentence Fertility | Pattern #1, #98 | Can the world be reduced to one impossible sentence that GENERATES consequences in every direction? Vague wonders ("magic exists", "technology is advanced") fail; concrete impossibilities ("dragons anchor cities against earthquakes", "women dissolve at twenty") pass. |
| Native Story Procedures | Pattern #66, #71 | Name ≥3 story procedures (case / heist / expedition / hunt / dive / scavenge / pilgrimage / audit / ritual / patrol) impossible to reskin into another world. The world's native mode of investigation. |
| Genesis spectator-caste check | FOUNDATIONS §Acceptance Tests #8 / Rule 11 (No Spectator Castes by Accident) | If `requiresExceptionGovernance(CF-0001.type)` is true (capability / bloodline / magic_practice / technology / divine_action / artifact_dependent_truth / exception_introducing_fact), verify CF-0001's `notes` field contains a `leverage:`-prefixed line enumerating ≥3 forms drawn from the permissible enum (`locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`). PASS rationale must name the leverage forms. If `requiresExceptionGovernance(CF-0001.type)` is false, PASS trivially with the rationale citing the type and noting the test is conditional. Phase 9 catches the malformed leverage block before the Phase 10 HARD-GATE; the mechanical `rule11_action_space` validator backstops at Phase 11 engine pre-apply. |

Each new test follows Phase 9's existing format: a one-line failure trigger and a one-line repair direction. PASS requires a one-line rationale citing the world's specific element that satisfies the test (bare PASS without rationale is FAIL per CLAUDE.md skill discipline; Track A3 introduces this PASS/FAIL+rationale format to Phase 9 alongside the existing rejection-trigger format — Phase 9's pre-SPEC-18 discipline used rejection triggers only).

### Track B: `canon-addition` Phase 0 Misrecognition Probe + Test 13

Two sub-changes to `canon-addition/SKILL.md`:

**B1. Phase 0 — misrecognition probe sub-step.** Currently Phase 0 normalizes the proposal (parse OR interview; classify fact type). Track B1 adds an explicit sub-step after fact-type classification:

> **Misrecognition probe.** Ask: *Does this fact have a public misrecognition layer? What does the broader world believe vs. what is canon-true?* If yes, capture the layer in two surfaces: (a) set `truth_scope.diegetic_status` per the FOUNDATIONS enum (`objective | believed | disputed | propagandistic | legendary`); (b) populate `epistemic_profile.distortion_vectors[]` (named actors who systematically misrepresent the fact) and `epistemic_profile.knowledge_exclusions[]` (groups deliberately kept ignorant). If no, the proposal must record `misrecognition_probe: NONE` in the PA `body_markdown` Phase 0 section with a one-line rationale (e.g., "this fact is a pure geographic distribution; no observation-perspective asymmetry").

The probe captures BOTH directions (presence and explicit absence-with-rationale) — the skill-flow gap is closed by making the question mandatory, not by requiring the answer to always be "yes." Many facts are symmetric across observation perspectives; the probe makes that symmetry an explicit decision rather than an unexamined default.

**B2. Phase 14a Test 13 — Misrecognition probe addressed.** Track B2 adds a 13th test to Phase 14a's existing 12-test checklist (parallel to the SPEC-09-introduced Tests 11 / 12). Test 13 is **judgment only** (no validator binding):

> **13. Misrecognition probe addressed (FOUNDATIONS §Acceptance Tests #9)** — judgment only. The PA `body_markdown` Phase 0 section either declares a misrecognition layer (with `truth_scope.diegetic_status` and at minimum one `epistemic_profile.distortion_vectors[]` or `knowledge_exclusions[]` entry on the new CF) OR states `misrecognition_probe: NONE` with a one-line rationale. Bare absence fails.

PASS rationale formats:
- "Misrecognition layer captured: locals believe X, canon-true is Y; `diegetic_status: legendary`; `distortion_vectors: [Marleyan_propaganda_apparatus, Wall_Religion_clergy]`."
- "Misrecognition probe NONE: this fact is a structural geographic distribution; no observation-perspective asymmetry."

## Deliverables

### Track A: `create-base-world/SKILL.md` amendments

1. **`.claude/skills/create-base-world/SKILL.md` §Phase 4** — two-part amendment:
   - **Add prose**: "Each touched section's body MUST materialize ≥1 first-order consequence of CF-0001 in domain-appropriate prose; stubs that defer materialization to later `canon-addition` runs are rejected at Phase 9."
   - **Amend the existing closing line**: "The world starts thin and grows via `canon-addition`; one section per concern is sufficient." → "The world starts **thin in coverage, not in concrete commitment** — each touched section's body materializes first-order consequences of CF-0001, while second / third-order consequences accumulate via `canon-addition`. One section per concern is sufficient at the structural level."
2. **`.claude/skills/create-base-world/SKILL.md` §Phase 8** — amend the CF-0001 schema-population paragraph to add three requirements:
   - "`domains_affected[]` MUST span ≥4 canonical domains."
   - "`visible_consequences[]` MUST enumerate first / second / third-order consequences explicitly (three orders is the genesis bar)."
   - "If CF-0001 introduces or depends on exceptional capability per `requiresExceptionGovernance(cf.type)`, populate Rule 11 leverage with ≥3 distinct ordinary- / mid-tier-actor leverage forms in CF-0001's `notes` field as a `leverage:`-prefixed comma-separated line, drawing forms from the permissible enum (`locality`, `secrecy`, `legitimacy`, `bureaucracy`, `numbers`, `ritual_authority`, `domain_expertise`, `access`, `timing`, `social_trust`, `deniability`, `infrastructural_control`) — matches the `rule11_action_space` validator's parsing convention used by canon-addition Phase 14a Test 11 (genesis spectator-caste check)."
3. **`.claude/skills/create-base-world/SKILL.md` §Phase 9** — amend the rejection-test list to append eight new tests in the order specified in §Approach Track A3. Inline the FOUNDATIONS / Pattern source citation per test.
4. **`.claude/skills/create-base-world/SKILL.md` §Validation Rules This Skill Upholds** — add a new entry: "**FOUNDATIONS §Acceptance Tests** — Phase 9 exercises 9 of 11 Acceptance Tests inline (6 net-new in this SPEC: AT #1 Counterfactual, AT #4 Inequality structure, AT #6 Embodiment-forces, AT #7 Scarcity-forces, AT #8 Genesis spectator-caste check / Rule 11, AT #11 Multi-perspective; 3 partial holdovers via existing rejection triggers: AT #2 powers not optimized away, AT #3 capabilities not mundane, AT #5 geography forces). AT #9 ('What do people falsely believe?') is enforced at canon-addition Phase 14a Test 13 (Track B). AT #10 ('What contradictions are permitted because they are diegetic rather than ontological?') is N/A at fact-creation time and emerges only at world-growth time — currently unchecked, deferred to a future spec. Failure on any test routes back to the responsible upstream phase (Phase 2 / 4 / 8 typically)."

### Track B: `canon-addition/SKILL.md` amendments

1. **`.claude/skills/canon-addition/SKILL.md` §Procedure step 2 (Phase 0)** OR **`.claude/skills/canon-addition/references/proposal-normalization.md`** — add the misrecognition probe sub-step prose. Author chooses landing surface; the SKILL.md must reference whichever surface receives it.
2. **`.claude/skills/canon-addition/SKILL.md` §Procedure step 8 (Phase 14a)** — extend the 12-test checklist to 13 tests by appending Test 13 per §Approach Track B2.
3. **`.claude/skills/canon-addition/SKILL.md` §PA `body_markdown` Structure** — within the existing `# Phase 0–11 Analysis` section, require a `## Phase 0 — Proposal Normalization and Misrecognition Probe` sub-heading carrying the `misrecognition_probe:` outcome (either layer-captured details OR `NONE` with one-line rationale). Update the §PA `body_markdown` Structure description so the Phase 0 sub-heading and its `misrecognition_probe:` content are explicitly named as required, paralleling the existing structural enforcement of named top-level sections.

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Acceptance Tests (11 questions) | aligns | Track A3 adds 5 missing Acceptance Tests to Phase 9; Track B2 adds the 9th Acceptance Test ("What do people falsely believe?") to canon-addition Phase 14a. |
| §Canon Layers (Hard / Derived / Soft / Contested / Mystery-Reserve) | aligns | Track B uses the existing `truth_scope.diegetic_status` enum to capture contested / legendary / propagandistic layers; no new layer is introduced. |
| §Canon Fact Record Schema | aligns | Both tracks consume schema fields that already exist (`truth_scope.diegetic_status`, `epistemic_profile.distortion_vectors`, `epistemic_profile.knowledge_exclusions`, `domains_affected`, `visible_consequences`); no schema extension. |
| Rule 11 (No Spectator Castes by Accident) | aligns | Track A2 brings the Rule 11 leverage check forward to genesis (before SPEC18GENFER-002, it was first applied in the per-CF Phase 14a Test 11). |
| Rule 7 (Preserve Mystery Deliberately) | aligns | Misrecognition layer is contested-canon, not mystery-reserve; Phase 5 mystery seeds (active / passive / forbidden) are unchanged. The probe distinguishes "the population is wrong about a known canon fact" from "the canon doesn't know either" cleanly. |
| Rule 6 (No Silent Retcons) | aligns | Track B's misrecognition probe outcome lands in the PA `body_markdown` Phase 0 section, which is part of the audit trail; no silent retcon surface. |
| Rule 2 (No Pure Cosmetics) | aligns | Track A1's substantive-section requirement enforces Rule 2 at genesis (a section whose body is a stub fails Rule 2 by construction). |

## Verification

| Invariant | Verification surface |
|---|---|
| Phase 9 covers 9 of 11 FOUNDATIONS Acceptance Tests (6 by name, 3 via existing rejection triggers); ATs #9 / #10 land at canon-addition Phase 14a Test 13 / deferred respectively | codebase grep-proof — `.claude/skills/create-base-world/SKILL.md` §Phase 9 contains the 6 net-new test names verbatim (Counterfactual, Inequality structure, Embodiment-forces, Scarcity-forces, Multi-perspective, Genesis spectator-caste check); existing rejection triggers cover AT #2, #3, #5 |
| Phase 4 substantive-section requirement is enforceable | skill dry-run — invoke `create-base-world` with a deliberately stub-only initial-section attempt; Phase 9 must reject |
| Phase 8 propagation-breadth requirement fires | skill dry-run — submit a CF-0001 with `domains_affected: [magic]` only (1 domain); Phase 9 must reject |
| Genesis spectator-caste check fires for capability-bearing CF-0001 | skill dry-run — CF-0001 of type `capability` with empty leverage block; Phase 9 must reject. Equivalently: CF-0001 of type `geography` with empty leverage block — Phase 9 must PASS (capability test conditional, not universal) |
| One-Sentence Fertility test rejects vague wonders | skill dry-run — CF-0001 statement "magic exists" (Pattern #98 weak example); Phase 9 must reject |
| Native Story Procedures test rejects worlds without procedures | skill dry-run — world without enumerated story procedures; Phase 9 must reject |
| Phase 0 misrecognition probe is mandatory | skill dry-run — invoke `canon-addition` and inspect PA `body_markdown` Phase 0 section; either layer-captured or NONE-with-rationale must be present |
| Test 13 fires when probe is absent | skill dry-run — bypass the probe (force-skip Phase 0 sub-step); Phase 14a Test 13 must FAIL with rationale |
| FOUNDATIONS alignment is documented per Acceptance Test | FOUNDATIONS alignment check — Phase 9 covers ATs #1, #2, #3, #4, #5, #6, #7, #8, #11 (6 by name via Track A3, 3 via existing rejection triggers); Phase 14a Test 13 covers AT #9 via Track B2; AT #10 ('diegetic contradictions permitted') is deferred to a future spec |

## Out of Scope

- **Settlement-as-verb structural enforcement** (Pattern #15). Stylistic; create-base-world Phase 4 already permits geography prose to express this. Not mechanizable without false-positive risk.
- **Faction internal-contradiction requirement** (Pattern #84). Already enforced in `propose-new-worlds-from-preferences` Phase 10 (≥4 factions × 7 sub-fields including internal contradiction). `canon-addition` operates on single facts, not faction-wholesale design.
- **Tonal-contradiction tests** (Pattern #51). Aesthetic; resists mechanization.
- **A separate `references/worldbuilding-patterns-checklist.md` doc.** Per user direction, skills must be self-contained. Pattern signals are inlined in skill prose at each amended phase rather than referenced out.
- **Promotion of Phase 9 self-validation to a mechanical validator** (`tools/validators/`). Current Phase 9 is judgment-only by design (consistent with existing self-validation discipline). Validator promotion can be considered in a follow-up if false-pass rates emerge from skill dry-runs.
- **Backfilling existing worlds against the new Phase 9 tests.** `worlds/animalia/` (the only currently-existing world) was created pre-SPEC-18 and is not retrofitted. Future worlds born after SPEC-18 lands carry the genesis bar; existing worlds remain at their original substrate.
- **Retroactive misrecognition probes on previously-accepted CFs.** PA records are append-only; no existing PA gains a Phase 0 misrecognition section after the fact. Only PA records produced after SPEC-18 lands carry Test 13.

## Risks & Open Questions

1. **Interview burden on canon-addition for misrecognition-irrelevant facts.** Many facts (geographic distributions, ontology-of-physics rules, language-vocabulary additions) are symmetric across observation perspectives — the misrecognition probe answer is NONE-with-rationale. The probe still adds a Phase 0 question to every run. Mitigation: the NONE path is a one-line answer; the cost is a few sentences in the PA `body_markdown`. If post-landing observation shows >70% NONE rate with stereotyped rationales, consider deprecating the probe to fact-type-conditional invocation (skip for `geography` / `language` / `physics` types). Not an SPEC-18 deliverable.
2. **Genesis bar may be too high for "small" or "minimalist-by-design" worlds.** Some worlds the user wants to author may be deliberately thin (e.g., a single-village setting for a one-shot campaign). The new Phase 9 tests assume the world wants to support institutional / faction / multi-perspective depth. Mitigation: Phase 9 is judgment-only; the user can override with rationale documented in the world's WORLD_KERNEL.md. If override frequency is high, consider a Phase 0 scope-declaration parameter (genesis-scope: `full` / `compact`) — out of SPEC-18 scope.
3. **Three-orders-of-consequence at genesis competes with FOUNDATIONS' "world starts thin and grows" stance.** The current `create-base-world` SKILL.md §Phase 4 reads: "The world starts thin and grows via `canon-addition`; one section per concern is sufficient." Track A1 partially contradicts this. Resolution: thin-but-rooted, not stub-and-defer. The world still grows; Phase 4 sections still seed forward. The SPEC-18 amendment sharpens "thin" from "stubs allowed" to "first-order consequences materialized; second / third-order can grow via canon-addition." **Resolved by Track A1's two-part deliverable**: the existing "thin and grows" line is rewritten to "thin in coverage, not in concrete commitment" alongside the new substantive-section requirement; both edits land in the same Track A1 deliverable so the two prose surfaces remain coherent.
4. **Misrecognition probe may surface a layer the user doesn't want canonized.** A proposer answering "yes, the population believes X" is committing to a population belief as part of the CF. If the user wants the misrecognition layer left implicit / undocumented, the probe forces an explicit commitment. Resolution: the NONE-with-rationale path covers "I don't want to commit to a misrecognition layer right now"; the rationale documents the intentional deferral. Future canon-addition can revisit.
5. **`misrecognition_probe` body-prose convention is grep-only, not query-typed.** The probe outcome lands as `misrecognition_probe: NONE` (or layer-captured prose) inside the PA `body_markdown` Phase 0 sub-section rather than in PA frontmatter. Future audits asking "show all PAs where misrecognition was probed and found symmetric" must grep across PA bodies; structured retrieval via `mcp__worldloom__search_nodes` or PA frontmatter projection is unavailable. Mitigation: out-of-scope for SPEC-18 per §Approach (no schema changes); a follow-up spec could elevate the probe outcome to PA frontmatter (e.g., `misrecognition_probe: layer_captured | none`, optional `misrecognition_rationale`) once enough probe-bearing PAs accumulate to justify the schema extension. Tracked here as future-improvement seed.
