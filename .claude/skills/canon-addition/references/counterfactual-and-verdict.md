# Phases 7-11: Counterfactual Pressure, Contradiction Classification, Repair, Narrative Fit, Adjudication

This reference covers the four phases that stress-test the proposal and classify its conflicts, the repair pass that preserves dramatic intent, the narrative fit evaluation, and the synthesizing Phase 11 verdict step.

## Phase 7: Counterfactual Pressure Test

Ask: if this were true, why does the world not look more different already? Answer with explicit limiting conditions from Phase 4's bottlenecks plus any new stabilizers.

Typical stabilizers: rarity, secrecy, high mortality, unreliability, expensive prerequisites, monopoly control, taboo, hard-to-transport materials, activation conditions, geographic isolation, incompatibility with ordinary labor, short effect lifespan, self-destructive side effects, elite suppression, recent discovery, mistaken public understanding.

**Rule**: Do not hand-wave with "people just don't use it much." State *why*. Failed counterfactual → Phase 9 must repair or Phase 11 must reject.

**FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation).

## Phase 8: Contradiction Classification

Using Phase 2 + Phase 6 output, classify every detected conflict:
- **Hard** — cannot coexist without changing established truths.
- **Soft** — can coexist, but existing canon owes explanation or visible consequences (seeds `required_updates`).
- **Latent Burden** — mandatory future lore work (tracked in CF `notes`; may seed `OPEN_QUESTIONS.md`).
- **Scope Drift Risk** — acceptable only if kept local/temporary/secret (routes toward `ACCEPT_AS_LOCAL_EXCEPTION`).
- **Tone/Thematic Mismatch** — logic intact but world feels unlike itself (routes to REVISE/REJECT or `ACCEPT_AS_CONTESTED_BELIEF`).

## Phase 9: Repair Pass

If promising but destabilizing, propose repairs: reduce scope / reduce reproducibility / add cost / add side effects / add bottlenecks / localize geographically or temporally / make it recent / make it heritable to a narrow group / make it taboo / shift to contested belief / split into narrower facts / move into Mystery Reserve / create a *new* Mystery Reserve entry to hold a bounded unknown the proposal manufactures (Rule 7 obligation — distinct from "move into Mystery Reserve"; used when the fact itself enters open canon but its existence creates a new bounded unknown — typical patterns: a numeric parameter, a mechanism, or a reading whose resolution would destabilize the new fact's stabilizers).

**Split rubric** (for the "split into narrower facts" option): Choose a split when sub-facts have materially distinct (a) canon-fact-types under the template enum (see Phase 0 mapping), (b) Mystery Reserve exposure profiles requiring different firewall commitments, (c) `distribution` shapes that cannot share a single `who_can_do_it` / `who_cannot_easily_do_it` / `why_not_universal` block, or (d) `domains_affected` sets that would force an overly-broad coverage on a bundled record. Otherwise keep as a single CF with subtypes documented in `statement`, `notes`, and `visible_consequences` — unnecessary splitting fragments the fact's integrity and produces redundant `source_basis.derived_from` chains.

**Composite-CF positive criteria** (mirror image of the split rubric — when these are true, prefer ONE composite CF with primary type in the `type:` field and sub-types documented in `notes` and `statement`, per `proposal-normalization.md` §"Composite facts"):

- Sub-facts share the same stabilizer chain (one diffusion-prevention mechanism-set governs all sub-facts; no sub-fact has a stabilizer the others lack).
- Sub-facts share the same invariant-firewall set (the same ONT / CAU / SOC / AES firewalls apply to all sub-facts; no sub-fact manufactures a firewall the others don't need).
- Sub-facts share a near-identical `required_world_updates` footprint (splitting would produce CFs with almost-identical file lists).
- Splitting would force each split CF to list the others as `derived_from`, producing cross-referencing stubs rather than self-contained records.
- User-stated dramatic purpose treats the sub-facts as one phenomenon (the proposal describes them in one breath, not as separable threads).

**Ledger precedent** (Animalia):

- **Composite pattern (one CF with sub-types)**: CF-0021 (crafter-creation, primary `craft` with capability + artifact + taboo-pressure sub-aspects); CF-0029 (guardian constructions, primary `artifact` with hazard + non-sentience-firewall sub-aspects); CF-0034 (endemic banditry, primary `historical_process` with capability + law + distribution-asymmetry sub-aspects); CF-0035 (artifact-mutated non-sentient beasts, primary `hazard` with species + local_anomaly + historical_process sub-aspects).
- **Honest-split pattern (two or more paired CFs introduced in one CH)**: CF-0027 + CF-0028 (a single ruin-expedition proposal yielded two CFs — the enterable-ruin category and the patron-funded expedition mode — because each sub-fact carries its own stabilizer chain, `required_world_updates` footprint, and Mystery Reserve exposure profile; the pair is coordinated via `derived_from` without being fragmented into cross-referencing stubs).

**Rule of thumb**: if splitting would force you to write "see also CF-X, CF-Y, CF-Z" three times in a single CF's `notes` field, the phenomenon is tightly coupled and wants one composite CF. If the split CFs naturally diverge at Phase 6 consequence propagation (touching different files with little overlap), the split is honest.

**Rule**: Repairs must preserve the user's dramatic intent. Surface each option with its trade-off (preserved vs sacrificed) in the Phase 15a summary.

## Phase 10: Narrative and Thematic Fit

Evaluate: deepens identity? creates tensions? trivializes struggle? universalizes specialness? undermines mystery? enriches ordinary life or only exceptional scenes? creates story engines or clutter?

**Rule**: Reject technically consistent but dramatically flattening facts.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — collision with `MYSTERY_RESERVE.md` `disallowed cheap answers` → REJECT or repair toward Mystery Reserve placement.

## Phase 11: Adjudication

Synthesize Phases 0–10 into one verdict:

- **ACCEPT** — invariant-safe, consequences manageable, scope clear, burden acceptable, world identity strengthened.
- **ACCEPT_WITH_REQUIRED_UPDATES** — good addition, but multiple files must update.
- **ACCEPT_AS_LOCAL_EXCEPTION** — globally destabilizing but valuable as regional anomaly / cult / hidden order / one-time event / bounded technology. CF `status: soft_canon`.
- **ACCEPT_AS_CONTESTED_BELIEF** — valuable for atmosphere / ideology / mystery / politics / diegetic texture but not wanted as objective truth. CF `status: contested_canon`.
- **REVISE_AND_RESUBMIT** — promising but underspecified.
- **REJECT** — breaks invariants / destroys genre contract / creates implausible omissions / weakens identity / imposes excessive retcon burden.

The verdict must cite the specific phase findings that drove it. Vague verdicts are themselves a failure.
