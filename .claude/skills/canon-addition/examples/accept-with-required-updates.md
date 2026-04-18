# Example: ACCEPT_WITH_REQUIRED_UPDATES

Walks through a proposal that yields ACCEPT_WITH_REQUIRED_UPDATES — the most common "this is good but multiple files must update" outcome. Adapted from the canonical example in the source proposal (PA-0012: buried magical artifacts).

## Scenario

Target world: a low-fantasy agrarian setting with ancient ruins in its mountainous regions. The world's Kernel establishes: magic is rare and dangerous, civilization is institutionally thin, frontier regions are hazardous.

## Proposal

> Magic artifacts are sometimes found buried, and they can cause corruption and wildly different and dangerous effects.

## Walkthrough

### Phase 0: Normalize

- **Statement**: buried magical artifacts exist and can corrupt on contact.
- **Underlying world-change**: recurring relic emergence exists; relics remain active across time; contact risks corruption; effects are variable and difficult to predict; relic discovery is a repeating phenomenon producing treasure economies, ritual quarantines, black markets, cults, contamination zones, salvage specialists, and political struggles over containment.
- **Canon fact types**: artifact + hazard + metaphysical effect.
- **User-stated constraints**: no explicit scope preference; implicit "regional at most."
- **Additional files loaded**: `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `INSTITUTIONS.md`, `EVERYDAY_LIFE.md`, `TIMELINE.md`.

### Phase 1: Scope Detection

- Geographic: regional (specific geologies — mountain ruins only).
- Temporal: current, recurring.
- Social: uneven visibility — miners and scavengers aware, farmers not.
- Diffusion risk: **high**. Treasure is portable; without limiting mechanisms, relics spread to every trade node.

### Phase 2: Invariant Check

Tested against the Kernel invariants *magic is rare and dangerous* and *civilization is institutionally thin*. **Result**: compatible with repairs. The rarity invariant is honored if active relics are geographically clustered and most finds are inert. The institutional-thinness invariant is compatible because containment systems are patchwork, not state-run.

### Phase 3: Capability / Constraint Analysis

- Now possible: relic-sickness as a diagnosable hazard; ruin-quarantine as an institutional practice; relic-smuggling as a criminal industry.
- No longer safely assumed: that abandoned ruins are harmless; that graves are undisturbed; that border trade goods are metaphysically inert.

### Phase 4: Prerequisites and Bottlenecks

Ancient burial sites (rare), survivable relic persistence (rare material property), discoverability by scavengers/miners/grave robbers (uncommon), activation via disturbance + blood contact (uncommon), ritual containment knowledge (rare — held by specialists). All rare or uncommon. Good news: diffusion is naturally throttled.

### Phase 5: Diffusion and Copycat

- Primary adopters: scavenger crews, desperate peasants, ruin-hunters.
- Secondary adopters: black-market relic brokers.
- Suppressors: local priests, landowners, state ruin-wardens.
- Skeptics: educated urban populations.
- Profiteers: licensed relic identifiers, cleanup specialists.
- Victims: families of the corrupted; communities downstream of contaminated ruins.
- Non-adopters: farmers (no tools, no knowledge, reflexive ruin-avoidance).

### Phase 6: Consequence Propagation

**First-order**: relic sickness outbreaks near disturbed ruins; salvage cults emerge; fear of disturbed graves concentrates in ruin-adjacent regions.

**Second-order**: quarantine law codifies in affected regions; licensed relic wardens staff cleanup; anti-smuggling patrols form at borders between relic-heavy and relic-free zones; folk taxonomies of relic effects develop; churches integrate relic-sickness into pollution doctrine.

**Third-order**: funerary reform — some regions shift from burial to cremation or ritual disarticulation; border regions depopulate in extreme cases; prestige economy forms around safe relic identification; a new prejudice emerges — "ruin-touched" people are distrusted.

### Escalation Gate

Domains touched in Phase 6: economy, law, religion, architecture (ruin management), everyday-life, status order, kinship (funerary), mobility (border controls). **Eight domains — exceeds the 3-domain trigger.** Dispatch six critic sub-agents.

**Critic synthesis (abbreviated)**:
- **Continuity Archivist**: no existing CF records conflict. Latent burden — existing TIMELINE.md "fall of the Ancient Kingdoms" now inherits a plausibility test: did the ancients know about relic activation?
- **Systems/Economy Critic**: relic black market creates inflationary pressure on containment materials. Watch for second-order scarcity in cleansing incense, blessed salt, or whatever the containment economy settles on.
- **Politics/Institution Critic**: state ruin-wardens imply a state capable of regional enforcement — tension with "civilization is institutionally thin." Resolve: wardens are contract-based, not state-salaried; accountable to landowners, not crowns.
- **Everyday-Life Critic**: good coverage; relic-sickness penetrates daily life. No "only affects heroes" drift.
- **Theme/Tone Critic**: matches grim low-fantasy register. Enhances rather than violates the Kernel's "frontier is hazardous" frame.
- **Mystery Curator**: relics' origin is a natural Mystery Reserve expansion vector — "who made them, and why did it end" is a forbidden-answer candidate. Flag for future OPEN_QUESTIONS.md entry.

### Phase 7: Counterfactual Pressure Test

Why hasn't this already reshaped the world? Stabilizers: (1) active relics are rare and clustered in specific geologies (mountain ruins only); (2) disturbance + blood contact required for activation — most finds are inert; (3) high mortality among relic handlers — expertise is scarce and dies young; (4) containment knowledge is held by specialists, not institutionalized. No hand-waves.

### Phase 8: Contradiction Classification

- **Soft**: prior GEOGRAPHY.md mentioned "the Bitter Range ruins" without hazard notation. Requires retroactive annotation.
- **Latent**: ruin-containment economy begs questions about who the ancients were (routes to MYSTERY_RESERVE.md).

### Phase 9: Repair Pass

Applied: (a) active artifacts rare and clustered in specific geologies (Phase 7 stabilizer #1); (b) activation requires disturbance + blood contact (Phase 7 stabilizer #2); (c) effects decay after exposure (new, added so salvage cults are a real but limited phenomenon).

### Phase 10: Narrative and Thematic Fit

- Deepens identity: yes — the world's "frontier is hazardous" frame now has a named, ritualized hazard.
- Creates tensions: yes — landowner vs warden, peasant vs priest, smuggler vs patrol.
- Universalizes specialness: no (rare, clustered, costly).
- Undermines mystery: no — in fact, expands Mystery Reserve.
- Enriches ordinary life: yes — rural folklore, funerary change, prejudice.

### Phase 11: Adjudication

**Verdict**: `ACCEPT_WITH_REQUIRED_UPDATES`

**Phase-cited justification**: Phase 2 (compatible with repairs); Phase 7 (stabilizers hold without hand-waving); Phase 10 (identity deepened, tensions generated); Phase 6 (eight domains touched — updates required across multiple files).

### Phase 12a: Required Update List

- `MAGIC_OR_TECH_SYSTEMS.md` — add relic-effect system (source, access path, training, cost, reliability, failure states, social perception, regulation).
- `INSTITUTIONS.md` — add relic-warden contract institution; extend religious pollution doctrine.
- `EVERYDAY_LIFE.md` — add relic-sickness to ordinary-life fears in ruin-adjacent regions; add funerary reform to death-disposal section.
- `TIMELINE.md` — annotate Bitter Range ruin events with relic-hazard notation.
- `OPEN_QUESTIONS.md` — add "who were the ancients and why did relics persist?"
- (`MYSTERY_RESERVE.md` is not modified here — Mystery Curator's flag is noted for a future dedicated mystery-installation run.)

### Phase 13a: Deliverable Assembly

- `CF-0047` — "Buried magical artifacts corrupt on disturbed contact" (status: hard_canon; scope: regional; domains: 8).
- `CH-0012` — `change_type: addition`; `affected_fact_ids: [CF-0047]`; `downstream_updates`: 5 files.
- Domain-file patches drafted for each of the 5 files, each carrying `<!-- added by CF-0047 -->` attribution.
- Adjudication record: `worlds/<slug>/adjudications/PA-0012-accept-with-required-updates.md`.

### Phase 14a: Validation

All rejection tests pass.

### Phase 15a: Commit

User approves summary. Atomic write of CF record + change log entry + 5 domain-file patches + adjudication record. World committed.

## Takeaway

This is the typical "good addition with scope" verdict. The skill did three things that matter:
1. Caught the high diffusion risk at Phase 1 and narrowed it at Phase 4 and Phase 9.
2. Required six critic sub-agents at the escalation gate because 8 domains exceeded the 3-domain trigger.
3. Refused to accept until every affected file had a concrete patch — not a "TODO" placeholder.
