# Proposed Additions to FOUNDATIONS.md

## Add to Core Principle

A fully realized story world is not one in which everything is specified.

It is one in which every unspecified area has a declared status:
- inherited from a baseline reference model
- intentionally left indeterminate
- bounded as Mystery Reserve
- left unmodeled because it is genuinely non-critical

Silence is never free license.
An omitted fact must have a status, not merely an absence.

The goal is inferential robustness, not exhaustive enumeration.

---

## Add to Mandatory World Files

For repositories that support character creation and diegetic artifact generation, also maintain:

- `EPISTEMICS_AND_INFORMATION.md`
- `ARTIFACTS_AND_MEDIA.md`
- `CHARACTERS_AND_AGENCY.md` *(required once named recurring characters exist)*

---

## New Section: Default Reality and Indeterminacy Policy

Use a declared baseline reference model.

In most worlds this will mean:
- baseline reality
- plus the world's explicit genre contract
- plus the world's explicit ontological deviations

Every unanswered question must resolve to one of:

- `baseline_default`
- `bounded_indeterminacy`
- `mystery_reserve`
- `noncritical_unmodeled`

Definitions:

- **baseline_default**  
  The world inherits the baseline reference model unless canon says otherwise.

- **bounded_indeterminacy**  
  Multiple answers remain compatible with canon and the system intentionally refuses to choose.

- **mystery_reserve**  
  The unknown is important, bounded, and tracked.

- **noncritical_unmodeled**  
  The question is genuinely not worth canonizing at present and is explicitly marked as such.

Rules:

- No operation may treat silence as permission to invent later.
- No answer may be retroactively canonized from an undeclared gap.
- Any later canonization of a previously unmodeled area must acknowledge that the area was previously unmodeled.

---

## New Section: Epistemic Architecture

World truth and in-world knowability are separate axes.

For every major canon fact, the system must be able to answer:

- who can directly observe it
- who can infer it
- who can record it
- who can suppress it
- who can distort it
- how quickly it propagates
- what evidence it leaves behind
- what classes of artifact may mention it plausibly
- what classes of actor are structurally excluded from knowing it

This section governs:
- secrecy
- rumor
- archives
- censorship
- priestly monopolies
- classified institutions
- oral tradition
- taboo knowledge
- broken chains of transmission
- false consensus

---

## New Section: Exception Governance

Any actor, capability, artifact, institution, bloodline, divine force, magical discipline, technology, or creature that can decisively alter outcomes must have an explicit containment model.

Required questions:

- Why is it not always present?
- Why is it not universally replicated?
- What does it cost?
- What are its rate limits?
- What is it bad at?
- What can counter it?
- What institutions monitor or constrain it?
- What happens if rivals imitate it?
- What happens if incumbents optimize around it?
- Why does its existence not collapse the world into an easier nearby configuration?

If these questions cannot be answered, the world is not ready to absorb that exception.

### Exception Governance Principle

Extraordinary power is never complete world justification by itself.
Its deployment logic, non-deployment logic, diffusion barriers, and counterforces must also be modeled.

### Action-Space Integrity

If exceptional actors exist, ordinary and mid-tier actors must still retain meaningful forms of leverage.

Possible leverage includes:
- locality
- secrecy
- legitimacy
- bureaucracy
- numbers
- ritual authority
- domain expertise
- access
- timing
- social trust
- deniability
- infrastructural control

A world fails if most actors become spectators to a tiny exceptional tier.

---

## New Section: Counterfactual Stress Testing

Every major canon addition must be stress-tested against nearby alternatives.

Minimum tests:

- **Immediate:** what changes now?
- **Near-term:** what changes within one year?
- **Long-term:** what changes within ten years?
- **Incumbent optimization:** what happens if current powers exploit this intelligently?
- **Rival imitation:** what happens if enemies copy or counterfeit it?
- **Diffuse adoption:** what happens if it leaks into black markets, folk practice, or schisms?
- **Failure mode:** what breaks first if the fact is taken seriously by the world?

If the world collapses into a nearby easier configuration, either:
- revise the canon fact
- add limiting structure
- or revise the world premise explicitly

---

## New Section: Artifact Provenance and Redundancy

Diegetic artifacts are not flavor objects.
They are evidence objects inside the world's epistemic system.

Every diegetic artifact must define:

- author or originating force
- commissioner or sponsor, if any
- date or era
- place of origin
- material substrate
- intended audience
- actual audience
- distribution path
- gatekeepers
- preservation conditions
- censorship or redaction risk
- truth relation to canon
- epistemic blind spots
- distortion pressures
- dependency on other texts, institutions, or events

### Artifact Truth Rules

An artifact may:
- corroborate canon
- localize canon
- distort canon
- contest canon
- ritualize canon
- conceal canon
- preserve partial evidence of canon

An artifact must not silently generate world-level truth merely by existing.

### Redundancy Rule

No core world truth should depend on a single artifact unless explicitly approved.

Important truths should leave more than one trace when plausible:
- law
- slang
- architecture
- ritual
- landscape
- scars on bodies
- ledgers
- bureaucratic forms
- supply chains
- funerary practice
- songs
- maps
- educational customs

---

## Extend Relation Types

Add:

- observed_by
- inferable_by
- recorded_in
- transmitted_by
- distorted_by
- suppressed_by
- forgotten_by
- inaccessible_to
- leaks_to
- leaves_trace_in
- countered_by
- rate_limited_by
- legitimized_by
- bottlenecked_by
- depends_on_secrecy
- depends_on_scarcity

---

## Extend Canon Fact Record Schema

Add:

default_inference:
  status: baseline_default | bounded_indeterminacy | mystery_reserve | noncritical_unmodeled
  baseline_reference: reality | genre_baseline | prior_world_state
  notes: >

epistemic_profile:
  directly_observable_by: []
  inferable_by: []
  recorded_by: []
  suppressed_by: []
  distortion_vectors: []
  propagation_channels: []
  evidence_left: []
  knowledge_exclusions: []

exception_governance:
  exceptional: false
  activation_conditions: []
  rate_limits: []
  mobility_limits: []
  training_and_logistics: []
  detection_signature: []
  countermeasures: []
  collateral_costs: []
  diffusion_barriers: []
  nondeployment_reasons: []
  premise_preservation_notes: >

action_space_impact:
  ordinary_actors: []
  institutional_actors: []
  exceptional_actors: []
  spectator_risk: low | medium | high

artifact_footprint:
  expected_traces: []
  suitable_artifact_types: []
  single_source_risk: low | medium | high

counterfactual_tests:
  immediate_effects: >
  one_year_effects: >
  ten_year_effects: >
  incumbent_optimization: >
  rival_imitation: >
  diffusion_pathways: >
  first_failure_mode: >

---

## New Diegetic Artifact Record Schema

Use this for every artifact intended to exist inside the world.

id: DA-0001
title: ""
kind: letter | decree | sermon | diary | map | ledger | ballad | inscription | trial_record | folk_tale | field_report | prayer_text | propaganda_sheet | artifact_object
statement_of_existence: >
  What physically exists in the world.

provenance:
  author: ""
  commissioner: ""
  date_or_era: ""
  place_of_origin: ""
  material: ""

audience:
  intended: []
  actual: []

circulation:
  channels: []
  reach: local | regional | transregional | restricted | secret
  gatekeepers: []
  preservation_conditions: []

world_relation:
  corroborates: []
  contests: []
  conceals: []
  mythologizes: []
  ritualizes: []

epistemic_limits:
  access_basis: ""
  blind_spots: []
  distortion_pressures: []
  reliability: low | medium | high | mixed

dependency:
  depends_on_artifacts: []
  depends_on_institutions: []
  depends_on_events: []

notes: >

---

## Add Validation Rules

### Rule 8: No Ambiguous Silence
Every unspecified area must be declared as baseline default, bounded indeterminacy, mystery reserve, or noncritical unmodeled.

### Rule 9: No Impossible Knowledge
No character, institution, artifact, archive, narrator, rumor network, or doctrine may know more than its access path allows.

### Rule 10: No Premise-Collapsing Exceptions
Any high-leverage capability must include containment, diffusion barriers, and non-deployment logic.

### Rule 11: No Spectator Castes by Accident
Ordinary and mid-tier actors must retain consequential leverage even in worlds with exceptional actors.

### Rule 12: No Single-Trace Truths
Core truths must have more than one plausible trace unless they are intentionally hidden and the hiding mechanism is modeled.

---

## Add Acceptance Tests

A world model is not ready until all these can be answered cleanly:

- What does this world inherit from its baseline reference model by default?
- What is intentionally indeterminate rather than merely neglected?
- Who can know each major fact, and how?
- What evidence would exist if this fact were true?
- What artifacts could mention this fact honestly, dishonestly, or partially?
- If the strongest actor optimized this fact for a decade, why would the world still resemble itself?
- If rivals copied this capability, what stops diffusion from rewriting the setting?
- What meaningful action remains available to ordinary, institutional, and exceptional actors respectively?
- What traces would this fact leave in bodies, buildings, paperwork, ritual, slang, or scars on the landscape?
- If this fact vanished, what second-order effects would vanish with it?