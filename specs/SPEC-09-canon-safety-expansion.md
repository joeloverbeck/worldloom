<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-09: Canon-Safety Expansion — Epistemic Profile, Exception Governance, Action-Space Integrity, Redundancy Rule

**Phase**: Independent; targets post-Phase-2 landing
**Depends on**: SPEC-04 (Validator Framework — houses new validators), SPEC-06 (canon-addition rewrite — where Tests 11 & 12 attach)
**Blocks**: none; retroactive audits of existing worlds are user-choice and not gated on this spec

## Problem Statement

FOUNDATIONS.md and the skills in `.claude/skills/*` together enforce substantial structural worldbuilding discipline: scope detection, diffusion analysis, counterfactual pressure testing, mystery-reserve firewalls, narrator epistemic-horizon conformance. Seven validation rules govern canon additions; all 17 animalia adjudications exercise them. This coverage is stronger than it looks from FOUNDATIONS.md alone — but it has four specific failure modes unaddressed:

1. **Spectator-caste drift.** When exceptional actors exist (magical lineages, artifact-holders, anointed heroes), ordinary and mid-tier actors can quietly become narrative spectators. Rule 3 (No Specialness Inflation) catches superlative claims at the CF level but does not test whether the *rest of the action space* still has leverage. Re:Zero's NPCs becoming bystanders to the protagonist's looping is this failure mode.

2. **Information-propagation incoherence.** Skills enforce per-narrator epistemic horizons (character-generation Phase 3; diegetic-artifact-generation Phase 1) and the Mystery Reserve firewall. But CF records themselves do not document who-can-observe / who-can-suppress / who-can-distort the fact, nor what evidence it leaves. At small world scale this is implicit; at 200+ CFs the implicit model fractures. Re:Zero's Return-by-Death operates without a coherent epistemic model: who knows, who infers, how it leaks, how propagation would rewrite the setting if it did leak.

3. **Premise-collapsing exceptions in prose-only form.** Phase 5 (Diffusion Analysis) and Phase 7 (Counterfactual Stress Test) already guard against incumbent optimization and rival imitation — but the containment model (activation conditions, rate limits, mobility limits, diffusion barriers, non-deployment logic) lives in prose across `distribution.why_not_universal`, `costs_and_limits`, and `notes`. Prose scattered across three fields is hard to audit systematically and skips critical questions quietly.

4. **Single-trace canon.** Nothing checks that core world truths leave traces in multiple registers (law AND ritual AND architecture AND slang AND ledgers AND funerary practice). A core truth surviving in exactly one artifact is fragile; a core truth with scattered corroboration across registers is robust. This is the redundancy register that makes real worlds feel inhabited rather than scaffolded.

**Source context**: `brainstorming/foundational-improvements.md` (external review) proposed eleven additions to FOUNDATIONS.md. Critical reassessment against the full skill set — not just FOUNDATIONS.md, which is what the external reviewer had access to — concluded seven of the eleven were redundant (counterfactual testing, artifact provenance, diegetic artifact schema, most new relation types, most new acceptance tests, new world files), and four represented real gaps. Coverage decisions are detailed under Out of Scope.

**Design trajectory**: initial triage proposed the two new CF schema blocks as "optional at author's discretion." User course-correction noted that optionality leaks into future worlds and would weaken them to avoid retrofit pain for animalia. The accepted posture is **conditionally mandatory with a genesis-world / append-only grandfather clause**: new worlds adopt the full schema from `CF-0001`; existing worlds' historical CFs remain valid; new CFs appended post-SPEC-09 meet the strict regime regardless of world age.

## Approach

Close the four gaps with minimal schema expansion and no new world-file types. Four moves:

**Move 1 — Two new validation rules in FOUNDATIONS.md**, enforced as new canon-addition validation tests and as new validators in the SPEC-04 framework:

- **Rule 11: No Spectator Castes by Accident.** When a CF introduces or depends on exceptional capability, it must name ≥3 forms of leverage remaining to ordinary or mid-tier actors. Permissible forms include locality, secrecy, legitimacy, bureaucracy, numbers, ritual authority, domain expertise, access, timing, social trust, deniability, infrastructural control.
- **Rule 12: No Single-Trace Truths.** Hard-canon core truths must leave traces in ≥2 distinct registers (law, ritual, architecture, slang, ledgers, funerary practice, landscape, bodily scars, supply chains, songs, maps, educational customs, bureaucratic forms) unless the truth is intentionally hidden and the hiding mechanism is itself canonized.

**Move 2 — Two conditionally-mandatory CF schema blocks**, documented in FOUNDATIONS.md §Canon Fact Record Schema and in `canon-addition/templates/canon-fact-record.yaml`:

- **`epistemic_profile`** — required for CFs where knowability is non-trivial: capability, institution-with-secrecy, artifact-dependent truth, knowledge-asymmetric fact, any fact whose propagation can be accelerated, suppressed, or distorted by actors. `n_a`-with-one-line-rationale permitted only for pure-ontology / pure-geography / pure-physics facts.
- **`exception_governance`** — required for CFs that introduce or depend on high-leverage exception: capability, bloodline power, high-leverage artifact, magical or tech discipline, divine action, anything that alters outcomes decisively. `n_a`-with-one-line-rationale permitted only for structural, geographic, or institutional-plumbing facts.

Conditionally-mandatory means the block MUST appear. Either populated, or explicitly marked `n_a` with a one-line rationale tied to fact-type. Unjustified `n_a` (e.g., `n_a: "not applicable"` with no fact-type grounding) is FAIL, matching existing skills' convention that unjustified PASS entries are treated as FAIL.

**Move 3 — A short "Default Reality" principle paragraph in FOUNDATIONS.md §Core Principle** restating Rule 6 (No Silent Retcons) with finer teeth: silence is not license to invent later; previously-unmodeled areas must be acknowledged as such when first canonized. `continuity-audit` gains a check that flags canonization of previously-silent areas that lack acknowledgment. This is the lightweight form of the rejected 4-category status taxonomy — a principle paragraph plus an audit surface, not a per-fact tag.

**Move 4 — Six new epistemic/exception relation types in FOUNDATIONS.md §Relation Types**: `observed_by`, `recorded_in`, `suppressed_by`, `distorted_by`, `countered_by`, `rate_limited_by`. Load-bearing for the two schema blocks; no current FOUNDATIONS equivalent.

### Strictness by world age (grandfather policy)

- **New worlds** (any CANON_LEDGER created after SPEC-09 lands): Rules 11 & 12 apply to `CF-0001` onward. Both schema blocks apply from `CF-0001` onward under the conditional-mandate regime. `create-base-world` enforces this at genesis.
- **Existing worlds** (e.g., animalia): CANON_LEDGER is append-only. Historical CFs are not retroactively invalidated or re-evaluated. New CFs appended post-SPEC-09 meet the strict regime regardless of world age. Retroactive retrofit of historical CFs is a separate user-choice action via `continuity-audit` and is not triggered automatically by this spec.

This matches worldloom's existing skill-evolution pattern: the pipeline improves, past artifacts are historical, new artifacts meet the new bar.

## Deliverables

### FOUNDATIONS.md edits

Seven discrete edits, all additive or refinement:

1. **§Core Principle** — append a "Default Reality" paragraph (≤120 words) stating that silence is not license to invent later; previously-unmodeled areas, when first canonized, must be acknowledged as previously unmodeled. Cross-reference Rule 6.

2. **§Canon Fact Record Schema** — extend the YAML example to include the two new optional-but-conditionally-mandatory blocks with a header comment explaining the regime. Example form:

   ```yaml
   # epistemic_profile: required when knowability is non-trivial; n_a permitted
   # only with one-line rationale tied to fact-type.
   epistemic_profile:
     directly_observable_by: []
     inferable_by: []
     recorded_by: []
     suppressed_by: []
     distortion_vectors: []
     propagation_channels: []
     evidence_left: []
     knowledge_exclusions: []
   # OR
   epistemic_profile:
     n_a: "Pure geography fact; no knowability axis."

   # exception_governance: required when CF introduces or depends on high-leverage
   # exception; n_a permitted only with one-line rationale tied to fact-type.
   exception_governance:
     activation_conditions: []
     rate_limits: []
     mobility_limits: []
     diffusion_barriers: []
     countermeasures: []
     nondeployment_reasons: []
   # OR
   exception_governance:
     n_a: "Structural-institutional fact; no exception axis."
   ```

3. **§Relation Types** — append six new relations with one-line definitions each: `observed_by`, `recorded_in`, `suppressed_by`, `distorted_by`, `countered_by`, `rate_limited_by`.

4. **§Validation Rules** — add Rule 11 (No Spectator Castes by Accident) and Rule 12 (No Single-Trace Truths) in the same shape as existing rules (name, statement, one-sentence rationale if non-obvious).

5. **§Validation Rules** — add brief cross-reference notes under new Rules 11 and 12 pointing to existing enforcement for the rejected-as-redundant rules from the external proposal: "Rule 9 (No Impossible Knowledge) is enforced by character-generation Phase 7b and diegetic-artifact-generation Phase 7c distribution conformance checks; Rule 10 (No Premise-Collapsing Exceptions) is enforced by canon-addition Phase 5 Diffusion Analysis and Phase 7 Counterfactual Pressure Test with Validation Tests 3 and 8 on stabilizer concreteness."

6. **§Acceptance Tests** — add one new test: "When an exceptional capability exists, what leverage remains to ordinary, mid-tier, and institutional actors respectively?" No other acceptance tests are added; the remaining external proposals are redundant with existing Phase 7 tests.

7. **§Canon Fact Record Schema** — append a short policy paragraph at the end:
   > *Genesis-world rule.* New worlds adopt the full schema from `CF-0001`. Existing worlds honor the append-only ledger — historical CFs predating a schema extension remain valid; new CFs appended after a schema extension meet the current schema.

### canon-addition skill updates

- **`canon-addition/SKILL.md` Phase 13 (Validation Tests)** — append Test 11 and Test 12 to the existing test suite. Each follows the existing PASS-with-rationale convention; bare PASS without rationale is treated as FAIL.

  - **Test 11 — Action-Space Integrity.** PASS requires: (a) identify whether the CF introduces or depends on exceptional capability; if not, PASS trivially with rationale; (b) if yes, name ≥3 distinct forms of leverage remaining to ordinary or mid-tier actors from the permissible-forms list, each tied to a concrete in-world mechanism.
  - **Test 12 — Redundancy.** PASS requires: (a) classify CF status (hard / derived / soft / contested / mystery-reserve); (b) if hard-canon core truth, name ≥2 distinct trace registers and the concrete in-world form each trace takes; (c) hidden-truth carve-out applies only when the hiding mechanism itself is canonized (cite the relevant CF or invariant).

- **`canon-addition/references/`** — add or update the validation-tests reference doc with detailed criteria for Tests 11 and 12 (block formatting, rationale patterns, failure examples). Follow the existing pattern in `references/counterfactual-and-verdict.md`.

- **`canon-addition/templates/canon-fact-record.yaml`** — add the two conditionally-mandatory blocks with inline comments explaining when `n_a` is permissible.

- **Phase 12 (CF authoring)** — update skill to emit one of {populated block, `n_a` + rationale} for each block before Phase 13 can pass. If the skill cannot decide whether a block applies, it must surface the ambiguity to the user rather than defaulting to `n_a`.

### continuity-audit skill updates

- **`continuity-audit/SKILL.md`** — add a new audit check: **Silent-Area Canonization.** When a new CF touches a domain previously with no CF coverage, the CF must acknowledge the domain was previously unmodeled (one-line `notes` entry or explicit `source_basis` annotation naming the previously-silent area). Audit flags missing acknowledgment as a retcon-proposal candidate.

### diegetic-artifact-generation skill updates

Minor cleanup (not a standalone spec):

- Add `statement_of_existence` field to the artifact frontmatter template — a one-line description of what physically exists in-world (paper, stone, tablet, wax seal, oral performance record, etc.).
- Add explicit `world_relation: { corroborates, contests, conceals, mythologizes, ritualizes }` structured block. Currently this is implicit in `claim_map` + `desired_relation_to_truth`; making it explicit enables future cross-artifact queries (e.g., "which artifacts corroborate CF-0024?").

### SPEC-04 validator additions

Two new validators ship as part of the SPEC-04 validator suite — not as separate infrastructure:

- **`validator-rule-11-action-space`** — parses CF YAML, applies Test 11 criteria, reports PASS/FAIL with the block-level detail identical to the skill-embedded Test 11.
- **`validator-rule-12-redundancy`** — parses CF YAML, cross-references the world-index for trace-register coverage (SPEC-01 world index is required here), reports PASS/FAIL.

Both invocable via `world-validate <slug> --rule=11` / `--rule=12`; both run automatically via Hook 5 (SPEC-05) post-patch.

### Documentation

- `docs/FOUNDATIONS.md` — edits enumerated above.
- `docs/WORKFLOWS.md` — one-paragraph pointer explaining new Tests 11 & 12 and the conditional-mandate regime.
- No new docs files created.

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 3 (No Specialness Inflation) | aligns | Rule 11 extends Rule 3's specialness check from "exceptional element lacks impact on ordinary world" to "exceptional element has impact but ordinary actors lose leverage." Complementary, not duplicative. |
| Rule 5 (No Consequence Evasion) | aligns | Rule 12 forces consequences to leave multiple traces, directly instantiating Rule 5 at the canon level. |
| Rule 6 (No Silent Retcons) | aligns | Default Reality paragraph + silent-area-canonization audit check give Rule 6 teeth at the moment a previously-silent area becomes canon. |
| Rule 7 (Preserve Mystery Deliberately) | aligns | `epistemic_profile.knowledge_exclusions` makes mystery-adjacent knowledge gates explicit at CF level rather than distributed across dossiers and artifacts. |
| Canon Layers | aligns | No changes to layer semantics. New blocks attach to facts within existing layers. |
| Canon Fact Record Schema | extends | Two new blocks under conditional mandate with `n_a` carve-out; append-only for existing worlds; full for new worlds. |
| Change Control Policy | aligns | New CFs adopting the blocks generate the same `CH-NNNN` change-log entries as today; no new change-control surface. |
| Core Principle (constrained model) | aligns | The two blocks make epistemic and exception-governance axes explicit parts of the constrained model rather than leaving them implicit. |

No tensions identified. The spec is additive and compatible with the existing SPEC-01…SPEC-08 bundle.

## Verification

### Structural

1. FOUNDATIONS.md edits land and render as valid markdown; the two new blocks in §Canon Fact Record Schema are valid YAML when extracted from the code block.
2. `canon-addition/templates/canon-fact-record.yaml` parses cleanly as YAML and renders both populated and `n_a` variants.
3. SPEC-04 validators `validator-rule-11-action-space` and `validator-rule-12-redundancy` ship and exit `0` on animalia's 47 existing CFs (grandfather clause: historical CFs pass-through, no retroactive evaluation).

### Functional

4. Dry-run `canon-addition` on a synthetic exceptional-capability CF **without** an `exception_governance` block → Test 12 (validator-rule-12) FAILS with clear rationale; canon-addition refuses to advance to Phase 14.
5. Dry-run `canon-addition` on a synthetic exceptional-capability CF **with** `exception_governance` populated but `action_space_impact` unspecified and no ordinary-actor leverage described → Test 11 (validator-rule-11) FAILS.
6. Dry-run `canon-addition` on a geography-only CF with `exception_governance: { n_a: "Pure geography; no exception axis." }` → both tests PASS with the N/A-with-rationale form.
7. Dry-run `canon-addition` on a CF with bare `n_a: "not applicable"` (no fact-type grounding) → validator FAILS; rationale regex check requires fact-type keyword from the ontology categories list.
8. Dry-run `continuity-audit` on a synthetic world where a new CF canonizes a silent domain without acknowledgment → audit flags a retcon-proposal candidate.

### Regression

9. `world-validate animalia --json` post-SPEC-09 reports zero new failures on the 47 existing CFs. Grandfather clause must hold structurally, not just by policy: historical CFs are not evaluated against Rules 11/12 or the new schema blocks by the validator.
10. A post-SPEC-09 `canon-addition` run on animalia producing a new CF (e.g., a next-in-sequence capability addition) exercises the new blocks and tests end-to-end without regression in the existing Phase 0–12 flow.
11. `create-base-world` genesis on a synthetic new world produces `CF-0001` with both blocks populated or correctly `n_a`'d per fact-type. Synthetic test world must include at least one capability CF and one geography CF to exercise both populated and N/A paths.

### Measurement

12. No measurable token-budget regression on canon-addition runs. Block sizes are bounded (6–8 fields each, mostly short lists); validators are pre-apply gates with no heavy compute.

## Out of Scope

Items from `brainstorming/foundational-improvements.md` deliberately excluded after critical review:

- **Three new mandatory world files** (`EPISTEMICS_AND_INFORMATION.md`, `ARTIFACTS_AND_MEDIA.md`, `CHARACTERS_AND_AGENCY.md`) — rejected. Content is already distributed across existing mandatory files (INSTITUTIONS, EVERYDAY_LIFE, MYSTERY_RESERVE, OPEN_QUESTIONS), and auto-generated `characters/INDEX.md` + `diegetic-artifacts/INDEX.md` cover the registry function. Forcing them would break animalia's compliance without adding capability.
- **Four-category Default Reality status tag per silence** (`baseline_default | bounded_indeterminacy | mystery_reserve | noncritical_unmodeled`) — rejected as a mandate. Adopted in lightweight form: a principle paragraph in FOUNDATIONS §Core Principle plus a single audit check in `continuity-audit`. Per-fact tagging would require massive retrofit for marginal Re:Zero-prevention value; the principle plus audit catches the real failure mode (silent-area canonization) without the tax.
- **Full six-block CF schema extension** — rejected. Only two blocks (`epistemic_profile`, `exception_governance`) carry clear ROI. Specifically rejected:
  - `default_inference` — superseded by the Default Reality paragraph.
  - `counterfactual_tests` — already persisted in PA-NNNN adjudication records; duplicating in CFs adds no new surface.
  - `action_space_impact` — covered by Rule 11 validation test; no need to persist in CF structure.
  - `artifact_footprint` — covered by Rule 12 validation test; no need to persist in CF structure.
- **Counterfactual Stress Testing as a new FOUNDATIONS section** — redundant with canon-addition Phase 7 and `canon-addition/references/counterfactual-and-verdict.md`. All 17 animalia adjudications exercise this workflow.
- **Artifact Provenance as a new FOUNDATIONS section** — redundant with `diegetic-artifact-generation/SKILL.md` template, which already mandates author, commissioner, date, place, material, audience, circulation, epistemic horizon, bias profile, and claim map. Minor additions (`statement_of_existence`, explicit `world_relation` block) handled within this spec.
- **Diegetic Artifact Record Schema as a new FOUNDATIONS section** — redundant. The skill template IS the schema. No new FOUNDATIONS entry needed.
- **Ten of sixteen proposed relation types** — rejected. Reverse-direction duplicates (`legitimized_by` = reverse of existing `legitimizes`), narrow parameterizations of existing relations (`depends_on_secrecy`, `depends_on_scarcity` are `depends_on` with narrow objects), or low-value additions. Six accepted: `observed_by`, `recorded_in`, `suppressed_by`, `distorted_by`, `countered_by`, `rate_limited_by`.
- **Proposed new Validation Rules 8, 9, 10** — Rule 8 (No Ambiguous Silence) rejected as mandate; replaced by Default Reality principle paragraph. Rules 9 and 10 are substantially enforced by skill-level distribution checks, Phase 5 Diffusion Analysis, and Phase 7 Counterfactual Test; added as cross-reference notes in FOUNDATIONS rather than new rules.
- **Ten new Acceptance Tests** — nine of ten redundant with existing Phase 7 tests or the new Rules 11/12. One new test (action-space leverage query) adopted.
- **Retroactive animalia CF retrofit** — deferred to user-choice `continuity-audit` cycle. Not auto-triggered by SPEC-09.

## Risks & Open Questions

### Risks

1. **`n_a` rationale-quality risk.** Conditional mandate lets authors opt out of blocks with a one-line rationale. Low-effort rationales (`n_a: "not applicable"`) would defeat the purpose. **Mitigation**: Tests 11 and 12 validators require the rationale to reference a fact-type keyword drawn from FOUNDATIONS §Ontology Categories (entity, species, person, faction, institution, polity, place, region, route, resource, craft, technology, magic practice, belief, ritual, law, taboo, artifact, hazard, event, historical process, social role, text/tradition, ecological system, bodily condition, metaphysical rule). Bare "not applicable" fails regex-and-taxonomy check.

2. **SPEC-04 ordering dependency.** Tests 11 and 12 are defined as validators in the SPEC-04 framework. If SPEC-09 lands before SPEC-04 ships, the validators run as in-skill checks inside `canon-addition/SKILL.md` until SPEC-04 lands. **Mitigation**: in-skill fallback is specified; when SPEC-04 lands, the same test logic migrates to validator form without changing the pass/fail contract.

3. **SPEC-07 conflict risk.** SPEC-07 Part C plans FOUNDATIONS.md schema updates for the Phase 3 atomic-source migration. SPEC-09's FOUNDATIONS.md edits and SPEC-07 Part C edits may touch overlapping sections. **Mitigation**: SPEC-09 lands its edits before SPEC-07 Part C enters FOUNDATIONS; SPEC-07 Part C rebases onto SPEC-09's extended schema.

4. **Schema-growth risk.** Even with conditional mandate, the two new blocks add ~20 lines to a typical capability-type CF. **Mitigation**: accepted; capability CFs are where the biggest coherence wins live, and the size cost is proportional to the CF's downstream complexity.

5. **Retcon interaction with Rule 11.** An existing CF that implicitly introduces spectator-caste drift (pre-SPEC-09) may surface during a future `continuity-audit` as a Rule 11 violation even though it predates Rule 11. **Mitigation**: the grandfather policy explicitly protects historical CFs from retroactive hard-fail. Audits surface violations as retcon-proposal candidates, never as hard fails.

### Open Questions

1. **Should Rule 11 apply to soft-canon facts?** Current draft applies it only to hard-canon CFs that introduce or depend on exceptional capability. Soft canon (local scope) may also exhibit spectator-caste drift within its own scope. **Deferred**: treat as a future audit-only check if patterns emerge; not gating in v1.

2. **Trace-register taxonomy for Rule 12.** The deliverable lists registers as examples (law, ritual, architecture, slang, ledgers, funerary, landscape, bodily scars, supply chains, songs, maps, educational customs, bureaucratic forms). Should the taxonomy be canonical in FOUNDATIONS.md or left descriptive? **Current draft**: descriptive list; validator accepts any two distinct registers from the example list plus "other (named)". If validator false-positive or false-negative rates are high in production, canonicalize the taxonomy later.

3. **Interaction with `propose-new-canon-facts` batches.** The skill generates candidate CFs. Post-SPEC-09, should proposal cards include the two blocks, or only their accepted CFs? **Current draft**: proposal cards include a fact-type hint (sufficient for adjudication); `canon-addition` populates blocks at acceptance time. Revisit if proposal-to-adjudication round trips suffer.

4. **Canon-facts-from-diegetic-artifacts interaction.** When the skill mines CFs from diegetic artifacts, the resulting proposal card may not have enough information to populate `epistemic_profile`. **Current draft**: mined proposals default to `n_a` with rationale `"Mined from diegetic artifact; epistemic axis populated at canon-addition time."` Canon-addition then has authoritative responsibility to populate or N/A the block.
