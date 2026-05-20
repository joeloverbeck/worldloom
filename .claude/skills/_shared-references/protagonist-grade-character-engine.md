# Protagonist-Grade Character Engine

Use this reference when a Worldloom skill proposes, deepens, or realizes a kept character. The standard is not screen time or theatrical intensity: even a background figure should feel like the protagonist of their own life because world pressure has been made personal. Engine density matters more than loudness.

This reference is a shared doctrine for `propose-new-characters`, `deepen-character-proposal`, and `character-generation`. NCP cards expose it as `memorability_profile`; CHAR dossiers expose it as `dramatic_core`. Field names are canonical and must stay byte-for-byte aligned across templates, schemas, validators, and skill prose.

## Rule 2 Constraint

Memorability must be world-produced. Every wound, appetite, contradiction, edge, behavior, relationship charge, and voice choice must arise from at least one modeled world pressure: institution, body or species condition, economy, geography, taboo, law, religion, history, material scarcity, craft, ecology, kinship, or epistemic limit.

Cosmetic eccentricity is a failure. A strange trait that does not change access, labor, status, risk, obligation, belief, intimacy, survival, or knowledge is decoration, not character construction.

## Required Engine Fields

- `world_produced_wound`: The durable hurt, humiliation, loss, debt, bodily constraint, exclusion, or witnessed wrong that the world plausibly inflicted; name the world mechanism that produced it.
- `active_appetite`: The thing the character keeps wanting in behavior, not abstraction; root the appetite in material need, status pressure, bodily condition, belief, kinship, taboo, scarcity, or institutional promise.
- `self_mythology`: The story the character tells about themselves to make survival, guilt, desire, shame, failure, obedience, or ambition bearable; show which local values or institutions make that self-story available.
- `irreconcilable_contradiction`: The recurring conflict that cannot be solved cleanly without betraying something real; both sides must be world-valid rather than a generic virtue/flaw pairing.
- `pressure_behavior`: How the character behaves when cornered, tempted, humiliated, offered power, and protecting an attachment; each response must come from world-trained habits, risks, language, obligations, or bodily limits.
- `relational_charge`: The charged relation or relation type where need, resentment, fear, debt, devotion, rivalry, dependence, or likely harm is concentrated; name why the world makes that relation costly.
- `moral_psychological_edge`: The uncomfortable line the character may cross, defend, rationalize, or refuse; tie the edge to a real pressure such as law, piety, hunger, rank, grief, inheritance, secrecy, contamination, or survival.
- `signature_scene_behaviors`: Repeated visible behaviors that could only belong to this character in this world; each behavior should reveal body, work, status, fear, appetite, institution, taboo, or environment under pressure.
- `voice_under_pressure`: How speech changes when the character lies, begs, threatens, teaches, grieves, hides ignorance, performs status, writes formally, or speaks intimately; ground the shift in education, region, class, craft, religion, body, or fear.
- `cannot_be_swapped_out_because`: The world-specific reason this person cannot be replaced by a generic member of their profession, species, class, or faction without losing the engine.

## Mutation Rule

When a seed is weak, mutate the social, institutional, bodily, moral, or epistemic engine. Do not merely intensify adjectives, add quirks, make the figure more competent, or attach trauma without changing how the world forces choices.

A good mutation preserves the seed's essential promise while altering what pressure can do to the person. It should produce new behavior, not just sharper description.

## Single-Seed Mutation Spread

Generate several directions before choosing. Cover a spread like this when world-valid and within user constraints:

1. Darker: raises the moral cost or hidden harm without adding arbitrary cruelty.
2. More pathetic or humiliating: makes need, dependence, shame, or failed status specific and playable.
3. More institutionally dangerous: gives the character leverage, access, liability, or corruptibility inside a real system.
4. More ordinary but sharper: removes melodrama while making daily pressure, voice, and repeated choices more exact.
5. Canon-edge or canon-requiring if world-valid: lets the best version name implied canon needs and route them instead of suppressing them.
6. Premise reversal preserving essence: flips profession, status, relation, belief, or public mask while preserving the seed's core function.

Reject the safest direction when it only preserves bland plausibility. Prefer the strongest direction that remains FOUNDATIONS-aligned and properly routed.

## High-Yield Mutation Families

Use these as prompts, not archetypes. Every output still needs the required engine fields and Rule 2 grounding.

- self-mythologizer
- shame-defender
- corrupted caretaker
- sincere fanatic
- failed prodigy
- beloved institutional monster
- pathetic gatekeeper
- bodily taboo carrier
- erotic or status transgressor, only when world-valid and inside user taboo limits
- impossible witness
- humiliated expert
- dangerous innocent
- obsolete loyalist
- contaminating saint

## Rejection Triggers

Reject or rework a candidate when any of these are true:

1. Valid but dull: the card is a good Worldloom citizen but cannot carry pressure.
2. Contradiction is abstract rather than behavioral.
3. Appetite is generic, polite, missing, or only stated in nouns.
4. Self-mythology is absent, generic, or merely a slogan.
5. Pressure behavior is absent, interchangeable, or a set of synonyms.
6. Weirdness is cosmetic rather than world-produced.
7. Relationships are neutral, frictionless, or purely descriptive.
8. Moral or psychological edge has been sanded off to avoid discomfort.
9. Mutation is timid and restates the original premise.
10. Canon-requiring brilliance is suppressed instead of routed.
11. Voice distinction is vocabulary-only.
12. The character is "special" by exception without cost, bottleneck, secrecy, taboo, distribution limit, or institutional mechanism.
13. Capability ignores cost, access, teacher, practice, body, law, or distribution.
14. Species, body, class, region, or belief is used as costume rather than a constraint.
15. The figure exists only to dump lore.
16. The figure can be swapped with another member of the same role without changing the scene engine.

## Two-Layer Scoring Rubric

Score surviving candidates only after canon-safety and registry-overlap checks.

### Layer A: World Validity

Use 1-5 unless noted:

- `world_rootedness`
- `niche_distinctiveness`
- `institutional_embedding`
- `ordinary_life_relevance`
- `capability_cost_integrity`
- `canon_safety`
- `canon_burden` (lower is better)
- `overlap_risk` (lower is better)

### Layer B: Memorability

Use 1-5:

- `protagonist_grade_force`
- `contradiction_irreconcilability`
- `appetite_specificity`
- `self_mythology_strength`
- `pressure_behavior_distinctiveness`
- `voice_pressure_distinction`
- `relational_charge`
- `moral_psychological_edge`
- `world_specific_surprise`
- `cannot_be_swapped_out`

### Aggregate

`aggregate = validity_total + 1.5 * memorability_total - canon_burden - overlap_risk`

A canon-safe but weak-memorability candidate must not survive on validity alone. A canon-requiring candidate may survive only when the implied facts are precisely routed and the payoff is worth the burden.

## Critic Prompts

### Blandness Executioner

Question: "Is this merely valid, or is it behaviorally memorable under world pressure?"

Fail the candidate if the answer is valid-but-dull, generic appetite, abstract contradiction, polite voice, neutral relationships, cosmetic weirdness, or no repeated forced choice. A PASS requires a one-line rationale naming the concrete world-produced behavior that prevents flattening.

### Protagonist-Grade Critic

Question: "Could this person carry a compelling story under the world's pressure without becoming story-system-specific?"

Fail the candidate if they need plot destiny, act structure, authorial favoritism, or unexplained exceptionality to matter. A PASS requires a one-line rationale naming the engine field or relation that would generate scenes naturally.

## Canon Routing Discipline

Strong candidates may be canon-safe, canon-edge, or canon-requiring. Do not flatten a strong candidate solely to avoid canon work. Route implied facts explicitly:

- precise local implications can route to `canon-addition`
- systemic clusters can route to `propose-new-canon-facts`
- Mystery Reserve-adjacent implications must preserve the firewall and never answer forbidden unknowns

The character pipeline reads canon and may write proposal or character hybrid files through its normal approved surfaces. It does not silently mutate world-level canon records.
