# Phases 1-6: Scope, Invariants, Capability, Prerequisites, Diffusion, Consequence Propagation

This reference covers the six phases that expand the normalized proposal into its full world-impact analysis, plus the Escalation Gate that dispatches multi-critic review when triggers fire.

## Phase 1: Scope Detection

Determine actual scope, not stated scope: geographic, temporal, social, visibility, reproducibility, institutional awareness, secrecy level, diffusion risk.

**Rule**: Many proposals appear local but logically tend toward larger scope. Catch that gap here.

**FOUNDATIONS cross-ref**: Rule 4 (No Globalization by Accident) — this phase IS the Scope Detection step.

## Phase 2: Invariant Check

Test the proposal against every invariant in `INVARIANTS.md` plus the tonal/genre contract in `WORLD_KERNEL.md`. Classify: compatible / compatible-only-if-scoped-locally / compatible-only-if-reclassified-as-belief / compatible-only-if-invariant-revised / incompatible.

**Mystery Reserve coverage check**: If the proposal declares a `mystery_reserve_firewall` list (e.g., "M-1 through M-10") in its self-trace, verify that the list covers every CURRENT entry in `MYSTERY_RESERVE.md`. Proposals are often authored before later MR entries were committed (e.g., a proposal naming M-1 through M-10 may predate M-11). Flag any omission as an audit-hygiene concern in the adjudication record even when the omitted entry is untouched by the proposal — a self-trace that silently omits a newer MR entry is a signal the proposal may not have considered it. Phase 2's own invariant check must test the proposal against the full current MR set regardless of what the self-trace covers.

**Hard rejection triggers** (force REJECT at Phase 11 unless user wants a world rewrite): direct violation of non-negotiable ontology; collapse of primary genre contract; contradiction of world-defining scarcity/distribution logic; world-scale destabilization without plausible stabilizers; retroactive invalidation of too much established canon.

**FOUNDATIONS cross-refs**: Canon Layers (determines which layer the fact lands in) and Invariants §full schema.

## Phase 3: Underlying Capability / Constraint Analysis

Enumerate: what can now be done; what can no longer be safely assumed; what becomes easier / harder / more valuable / more feared / politically useful.

## Phase 4: Prerequisites and Bottlenecks

List every requirement (knowledge, training, tools, infrastructure, bodily, environmental, ritual, materials, permission, secrecy, time, maintenance, recovery) and classify each: common / uncommon / rare / monopolized / forbidden / extinct / region-locked.

**Rule**: This phase often converts a world-breaking proposal into a viable limited one — the output seeds Phase 9 repair options.

## Phase 5: Diffusion and Copycat Analysis

Produce: primary adopters, secondary adopters, suppressors, skeptics, profiteers, victims, non-adopters and why not.

**Rule**: If a capability is useful and reproducible, diffusion pressure must be assumed — or an explicit stabilizer must be stated in Phase 7.

## Phase 6: Consequence Propagation

Run three layers across the 13 required **exposition** domains (everyday life, economy, law, religion, warfare, status order, kinship, architecture, mobility, environment, taboo/pollution, language/slang, memory/myth):

- **First-order** — immediate direct effects.
- **Second-order** — institutional and social responses.
- **Third-order** — world equilibrium shifts.

**Domain label convention** (for CF `domains_affected`): Phase 6's 13 exposition domains are the investigation guide — they name where to LOOK. The CF `domains_affected` field uses a separate canonical enum from FOUNDATIONS §Rule 2 normalized to snake_case: `labor | embodiment | social_norms | architecture | mobility | law | trade | war | kinship | religion | language | status_signaling | ecology | daily_routine`. Ledger precedent extends this with domain labels in active use (notably `economy` as alias for `trade`, `settlement_life` for lived-in texture, `memory_and_myth` for bardic/memorial surface, `magic` for artifact-economy adjacency, `medicine` for clinical practice). New CFs SHOULD prefer canonical Rule 2 labels and may use established extensions when canonical labels do not cover the attachment surface. Do NOT retrofit existing CF labels (ledger is append-only). See `templates/canon-fact-record.yaml` for the canonical list comment.

**FOUNDATIONS cross-ref**: Rule 5 (No Consequence Evasion) — this phase IS the Consequence Propagation step.

## Escalation Gate

Evaluate triggers from Phase 2 and Phase 6:
- Invariant revision required?
- More than 3 of 13 domains touched in Phase 6?
- New invariant-level rule introduced (ontological / causal / distribution / social / aesthetic)?

**If any trigger fires**: dispatch six parallel sub-agents via the Agent tool, one per critic role:
- **Continuity Archivist** — `CANON_LEDGER.md` + `TIMELINE.md` contradictions and latent burdens.
- **Systems/Economy Critic** — Phase 6 economic/trade/labor consequences against `ECONOMY_AND_RESOURCES.md`.
- **Politics/Institution Critic** — Phase 6 institutional consequences against `INSTITUTIONS.md`.
- **Everyday-Life Critic** — Phase 6 ordinary-life consequences against `EVERYDAY_LIFE.md`; flags "only affects heroes" drift.
- **Theme/Tone Critic** — `WORLD_KERNEL.md` genre/tonal contract.
- **Mystery Curator** — `MYSTERY_RESERVE.md` and `OPEN_QUESTIONS.md`; flags forbidden-answer collisions and mystery-trivialization risks.

Each sub-agent receives: the full proposal, the Phase 0–6 outputs, `docs/FOUNDATIONS.md`, and the specific world-state slice its role needs. Each returns a concise critique report. Sub-agents never write files. Use `templates/critic-prompt.md` to construct each per-role prompt and `templates/critic-report-format.md` to specify the required report structure — this keeps critic outputs uniform across runs and across roles.

**Phase 6b: Multi-Critic Synthesis** — the main agent reads all six reports, resolves conflicts (noting productive tensions), and produces an integrated critique that feeds Phases 7–10. Sub-agent reports are appended to the adjudication record at commit time.

**If no trigger fires**: the main agent runs the remaining phases alone, adopting each critic lens inline at the appropriate phase.
