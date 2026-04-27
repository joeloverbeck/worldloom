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

**Move 2 — Two conditionally-mandatory CF schema blocks**, documented in FOUNDATIONS.md §Canon Fact Record Schema and structurally enforced via `tools/validators/src/schemas/canon-fact-record.schema.json` (the canonical CF schema; `additionalProperties: false` requires explicit declaration of new top-level fields):

- **`epistemic_profile`** — required for CFs where knowability is non-trivial: capability, institution-with-secrecy, artifact-dependent truth, knowledge-asymmetric fact, any fact whose propagation can be accelerated, suppressed, or distorted by actors. `n_a`-with-one-line-rationale permitted only for pure-ontology / pure-geography / pure-physics facts.
- **`exception_governance`** — required for CFs that introduce or depend on high-leverage exception: capability, bloodline power, high-leverage artifact, magical or tech discipline, divine action, anything that alters outcomes decisively. `n_a`-with-one-line-rationale permitted only for structural, geographic, or institutional-plumbing facts.

Conditionally-mandatory means the block MUST appear. Either populated, or explicitly marked `n_a` with a one-line rationale tied to fact-type. Unjustified `n_a` (e.g., `n_a: "not applicable"` with no fact-type grounding) is FAIL, matching existing skills' convention that unjustified PASS entries are treated as FAIL. Block-presence and `n_a`-rationale shape are enforced by `record_schema_compliance` (structural); leverage / trace semantics are enforced by Rule 11 / Rule 12 validators.

**Move 3 — A short "Default Reality" principle paragraph in FOUNDATIONS.md §Core Principle** restating Rule 6 (No Silent Retcons) with finer teeth: silence is not license to invent later; previously-unmodeled areas must be acknowledged as such when first canonized. `continuity-audit` gains a check that flags canonization of previously-silent areas that lack acknowledgment. This is the lightweight form of the rejected 4-category status taxonomy — a principle paragraph plus an audit surface, not a per-fact tag.

**Move 4 — Six new epistemic/exception relation types in FOUNDATIONS.md §Relation Types**: `observed_by`, `recorded_in`, `suppressed_by`, `distorted_by`, `countered_by`, `rate_limited_by`. Load-bearing for the two schema blocks; no current FOUNDATIONS equivalent. The world-index parser is already permissive on YAML field names; no parser deliverable is required. There is no `relation_type` canonical-vocabulary surface today (`VOCABULARY_CLASSES` in `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` covers `domain | verdict | mystery_status | mystery_resolution_safety`), so the FOUNDATIONS.md prose list is the canonical surface and no MCP-vocabulary deliverable is needed.

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

7. **§Canon Fact Record Schema** — append a short policy paragraph at the end. Land **after** the existing `pre_figured_by[]` paragraph and **before** the SPEC-13 Canonical-storage blockquote (the section's tail order today: schema example → `pre_figured_by[]` paragraph → SPEC-13 storage blockquote; the new paragraph slots between the last two):
   > *Genesis-world rule.* New worlds adopt the full schema from `CF-0001`. Existing worlds honor the append-only ledger — historical CFs predating a schema extension remain valid; new CFs appended after a schema extension meet the current schema.

### canon-addition skill updates

- **`canon-addition/SKILL.md` Phase 14a (Validation)** — append Test 11 and Test 12 to the existing 10-test contiguous block. Phase 14a already anticipates this attachment: line 97 reads *"SPEC-09 Phase 2.5 will append Tests 11 (action-space) and 12 (redundancy) atop this contiguous block — preserve the numbering."* Each new test follows the existing PASS-with-rationale convention; bare PASS without rationale is treated as FAIL.

  - **Test 11 — Action-Space Integrity.** PASS requires: (a) identify whether the CF introduces or depends on exceptional capability; if not, PASS trivially with rationale; (b) if yes, name ≥3 distinct forms of leverage remaining to ordinary or mid-tier actors from the permissible-forms list, each tied to a concrete in-world mechanism.
  - **Test 12 — Redundancy.** PASS requires: (a) classify CF status (hard / derived / soft / contested / mystery-reserve); (b) if hard-canon core truth, name ≥2 distinct trace registers and the concrete in-world form each trace takes; (c) hidden-truth carve-out applies only when the hiding mechanism itself is canonized (cite the relevant CF or invariant).

- **`canon-addition/references/counterfactual-and-verdict.md`** — extend with detailed criteria for Tests 11 and 12 (block formatting, rationale patterns, failure examples). The file already anticipates SPEC-09 at line 97 (*"SPEC-09 will append Tests 11/12 here"*); the extension lands at the existing 10-test reference block.

- **Phase 13a (patch plan assembly)** — update skill to populate `epistemic_profile` and `exception_governance` (or `n_a` with fact-type rationale) on every `create_cf_record` op before Phase 14a runs. If the skill cannot decide whether a block applies, it must surface the ambiguity to the user rather than defaulting to `n_a`.

### Validator framework structural schema update

Block presence, `n_a`-or-populated form, and the fact-type-keyword rationale check are all structural concerns — they live in the structural-schema layer, not in the new rule validators. Three sub-deliverables:

- **`tools/validators/src/schemas/canon-fact-record.schema.json`** — extend with two new optional top-level properties: `epistemic_profile` and `exception_governance`. Each declared as `oneOf: [populated-shape, n_a-shape]` where the populated shape enumerates the fields shown in FOUNDATIONS edit #2 and the `n_a` shape requires a non-empty `n_a` string property. Required because the schema's `additionalProperties: false` would otherwise reject CFs declaring the new blocks.
- **`tools/validators/src/structural/record-schema-compliance.ts`** — extend with conditional-presence enforcement keyed off the CF `type` field. Capability / institution-with-secrecy / artifact-dependent-truth types require `epistemic_profile`; capability / bloodline / high-leverage-artifact / magic-or-tech-discipline / divine-action types require `exception_governance`. Pure-ontology / geography / physics types pass with `n_a`-form; structural / geographic / institutional-plumbing types pass with `n_a`-form for `exception_governance`.
- **`n_a` rationale regex check** — the `n_a` rationale string must contain a fact-type keyword from FOUNDATIONS §Ontology Categories (entity, species, person, faction, institution, polity, place, region, route, resource, craft, technology, magic practice, belief, ritual, law, taboo, artifact, hazard, event, historical process, social role, text/tradition, ecological system, bodily condition, metaphysical rule). Bare `n_a: "not applicable"` FAILS structural validation.

### continuity-audit skill updates

- **`continuity-audit/SKILL.md`** — add a new audit check: **Silent-Area Canonization.**
  - **Detection inputs**: compare each new CF's `domains_affected` array against the union of `domains_affected` across all prior CFs in `_source/canon/`. A domain is "previously silent" if it is absent from that union at the moment the new CF is added.
  - **Acknowledgment surface**: a one-line `notes` entry naming the previously-silent domain, OR an explicit `source_basis` annotation referencing the silent-area canonization explicitly.
  - **Output shape**: when acknowledgment is missing, audit emits a **retcon-proposal candidate** (matching Rule 11/12 retcon-proposal posture per Risks §3 below). Never hard-fail; always surface as a proposal under `audits/AU-NNNN/retcon-proposals/`.

### diegetic-artifact-generation skill updates

Minor cleanup (not a standalone spec):

- Add `statement_of_existence` field to the artifact frontmatter template — a one-line description of what physically exists in-world (paper, stone, tablet, wax seal, oral performance record, etc.).
- Add explicit `world_relation: { corroborates, contests, conceals, mythologizes, ritualizes }` structured block. Currently this is implicit in `claim_map` + `desired_relation_to_truth`; making it explicit enables future cross-artifact queries (e.g., "which artifacts corroborate CF-0024?").

### SPEC-04 validator additions

Two new validators ship as part of the SPEC-04 validator suite — not as separate infrastructure:

- **`validator-rule-11-action-space`** — parses CF YAML, applies Test 11 criteria, reports PASS/FAIL.
  - **Mechanizable surface**: leverage entries are read from a CF-attached structured field (or, transitionally, parsed from the leverage-list block in `notes`); the validator checks ≥3 entries, each non-empty, each drawn from the permissible-forms enum (locality, secrecy, legitimacy, bureaucracy, numbers, ritual authority, domain expertise, access, timing, social trust, deniability, infrastructural control).
  - **Judgment surface (retained in skill prose, not validator-mechanized)**: each leverage entry must be tied to a concrete in-world mechanism. This mirrors the Phase 14a Test 8 split (mechanical: stabilizers named; judgment: hand-wave detection).
- **`validator-rule-12-redundancy`** — parses CF YAML, cross-references the world-index for trace-register coverage (SPEC-01 world index is required here), reports PASS/FAIL.

Both invocable via `world-validate <slug> --rules=11` / `--rules=12` (or combined: `--rules=11,12`). Pre-apply enforcement runs through `mcp__worldloom__validate_patch_plan`, which already invokes all rule validators per the SPEC-04 contract — no Hook 5 change is required (Hook 5's structural-only scope is preserved by deliberate design).

### CLI surface extension

- **`tools/validators/src/cli/_helpers.ts`** — extended `RULE_FILTER_PATTERN` to accept `11` and `12`; the `--rules` help-text rule list now includes `1,2,4,5,6,7,11,12`.

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
| Canon Fact Record Schema | extends | Two new blocks under conditional mandate with `n_a` carve-out; structurally enforced by `record_schema_compliance` + the JSONSchema; append-only for existing worlds; full for new worlds. |
| Change Control Policy | aligns | New CFs adopting the blocks generate the same `CH-NNNN` change-log entries as today; no new change-control surface. |
| Core Principle (constrained model) | aligns | The two blocks make epistemic and exception-governance axes explicit parts of the constrained model rather than leaving them implicit. |

No tensions identified. The spec is additive and compatible with the existing SPEC-01…SPEC-08 bundle.

## Verification

### Structural

1. FOUNDATIONS.md edits land and render as valid markdown; the two new blocks in §Canon Fact Record Schema are valid YAML when extracted from the code block.
2. `tools/validators/src/schemas/canon-fact-record.schema.json` parses cleanly and validates both populated and `n_a` variants for `epistemic_profile` and `exception_governance`.
3. SPEC-04 validators `validator-rule-11-action-space` and `validator-rule-12-redundancy` ship and exit `0` on animalia's 48 existing CFs (grandfather clause: historical CFs pass-through, no retroactive evaluation).

### Functional

4. Dry-run `canon-addition` on a synthetic exceptional-capability CF **without** an `exception_governance` block → `record_schema_compliance` (structural) FAILS with clear rationale; canon-addition refuses to advance to Phase 15a.
5. Dry-run `canon-addition` on a synthetic exceptional-capability CF **with** `exception_governance` populated but fewer than 3 ordinary-actor leverage entries (or entries not from the permissible-forms enum) → `validator-rule-11-action-space` FAILS.
6. Dry-run `canon-addition` on a geography-only CF with `epistemic_profile: { n_a: "Pure geography fact; no knowability axis." }` and `exception_governance: { n_a: "Structural-geographic fact; no exception axis." }` → `record_schema_compliance` PASSes (n_a-with-fact-type-rationale form satisfies the regex), and Tests 11/12 PASS trivially with the not-applicable-with-rationale form.
7. Dry-run `canon-addition` on a CF with `epistemic_profile: { n_a: "not applicable" }` (no fact-type grounding) → `record_schema_compliance` FAILS the regex-and-taxonomy check (rationale must contain a keyword from FOUNDATIONS §Ontology Categories).
8. Dry-run `continuity-audit` on a synthetic world where a new CF canonizes a silent domain (a domain absent from the union of `domains_affected` across prior CFs) without acknowledgment in `notes` or `source_basis` → audit emits a retcon-proposal candidate (never hard-fails).

### Regression

9. `world-validate animalia --json` post-SPEC-09 reports zero new failures on the 48 existing CFs. Grandfather clause must hold structurally, not just by policy: historical CFs are not evaluated against Rules 11/12 or the new schema blocks by the validator.
10. A post-SPEC-09 `canon-addition` run on animalia producing a new CF (e.g., a next-in-sequence capability addition) exercises the new blocks and tests end-to-end without regression in the existing Phase 0–14a flow.
11. `create-base-world` genesis on a synthetic new world produces `CF-0001` with both blocks populated or correctly `n_a`'d per fact-type. Synthetic test world must include at least one capability CF and one geography CF to exercise both populated and N/A paths.

### Measurement

12. No measurable token-budget regression on canon-addition runs. Block sizes are bounded (6–8 fields each, mostly short lists); validators are pre-apply gates with no heavy compute.

## Out of Scope

Items from `brainstorming/foundational-improvements.md` deliberately excluded after critical review:

- **Three new mandatory world files** (`EPISTEMICS_AND_INFORMATION.md`, `ARTIFACTS_AND_MEDIA.md`, `CHARACTERS_AND_AGENCY.md`) — rejected. Content is already distributed across existing atomized concerns (`_source/institutions/`, `_source/everyday-life/`, `_source/mystery-reserve/`, `_source/open-questions/`), and auto-generated `characters/INDEX.md` + `diegetic-artifacts/INDEX.md` cover the registry function. Forcing them would break animalia's compliance without adding capability.
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
- **`relation_type` canonical-vocabulary class** — not added. The `mcp__worldloom__get_canonical_vocabulary` tool's `VOCABULARY_CLASSES` does not currently include `relation_type`, and the world-index parser is permissive on YAML field names. The FOUNDATIONS.md §Relation Types prose list is the canonical surface; surfacing relation types as a queryable vocabulary class is a separate, out-of-scope refinement.
- **Retroactive animalia CF retrofit** — deferred to user-choice `continuity-audit` cycle. Not auto-triggered by SPEC-09.

## Risks & Open Questions

### Risks

1. **`n_a` rationale-quality risk.** Conditional mandate lets authors opt out of blocks with a one-line rationale. Low-effort rationales (`n_a: "not applicable"`) would defeat the purpose. **Mitigation**: `record_schema_compliance` (structural) enforces a regex requiring the rationale to reference a fact-type keyword drawn from FOUNDATIONS §Ontology Categories (entity, species, person, faction, institution, polity, place, region, route, resource, craft, technology, magic practice, belief, ritual, law, taboo, artifact, hazard, event, historical process, social role, text/tradition, ecological system, bodily condition, metaphysical rule). Bare "not applicable" fails regex-and-taxonomy check. (Q2-resolved: regex enforcement lives in the structural validator, not in Tests 11/12.)

2. **SPEC-04 ordering — closed.** SPEC-04 landed 2026-04-25 (archived at `archive/specs/SPEC-04-validator-framework.md`); validators 11/12 ship at `tools/validators/src/rules/rule11-action-space.ts` and `tools/validators/src/rules/rule12-redundancy.ts` as part of the existing rule-validator package surface. No in-skill fallback is required.

3. **Schema-growth risk.** Even with conditional mandate, the two new blocks add ~20 lines to a typical capability-type CF. **Mitigation**: accepted; capability CFs are where the biggest coherence wins live, and the size cost is proportional to the CF's downstream complexity.

4. **Retcon interaction with Rule 11.** An existing CF that implicitly introduces spectator-caste drift (pre-SPEC-09) may surface during a future `continuity-audit` as a Rule 11 violation even though it predates Rule 11. **Mitigation**: the grandfather policy explicitly protects historical CFs from retroactive hard-fail. Audits surface violations as retcon-proposal candidates, never as hard fails. The same posture applies to the silent-area-canonization check (Q1-resolved).

### Open Questions

1. **Should Rule 11 apply to soft-canon facts?** Current draft applies it only to hard-canon CFs that introduce or depend on exceptional capability. Soft canon (local scope) may also exhibit spectator-caste drift within its own scope. **Deferred**: treat as a future audit-only check if patterns emerge; not gating in v1.

2. **Trace-register taxonomy for Rule 12.** The deliverable lists registers as examples (law, ritual, architecture, slang, ledgers, funerary, landscape, bodily scars, supply chains, songs, maps, educational customs, bureaucratic forms). Should the taxonomy be canonical in FOUNDATIONS.md or left descriptive? **Current draft**: descriptive list; validator accepts any two distinct registers from the example list plus "other (named)". If validator false-positive or false-negative rates are high in production, canonicalize the taxonomy later.

3. **Interaction with `propose-new-canon-facts` batches.** The skill generates candidate CFs. Post-SPEC-09, should proposal cards include the two blocks, or only their accepted CFs? **Current draft**: proposal cards include a fact-type hint (sufficient for adjudication); `canon-addition` populates blocks at acceptance time. Revisit if proposal-to-adjudication round trips suffer.

4. **Canon-facts-from-diegetic-artifacts interaction.** When the skill mines CFs from diegetic artifacts, the resulting proposal card may not have enough information to populate `epistemic_profile`. **Current draft**: mined proposals default to `n_a` with rationale `"Mined from diegetic artifact; epistemic axis populated at canon-addition time."` Canon-addition then has authoritative responsibility to populate or N/A the block.
