<!--
Critic Report Format — template

Defines the required structure each critic sub-agent returns at the Escalation
Gate. The main agent reads all six reports during Phase 6b synthesis and
appends them verbatim to the adjudication record at Phase 13a.

Sections marked (required) appear in every critic's report.
Sections marked (role-specific) appear only for the named critic.

Word budget: each report should fit under 600 words. Conciseness is a feature.
-->

# Critique: {ROLE_NAME}

## Direct Contradictions (required)

<!-- Specific facts the proposal would falsify. Cite CF ids, invariant ids,
     or file/section refs. One bullet per contradiction. If none, write
     "None identified." -->

## Soft Conflicts and Required Annotations (required)

<!-- Facts that would need clarifying notes or status changes. Cite specific
     text that requires annotation. One bullet per conflict. -->

## Required Updates to Owned Files (required)

<!-- Concrete prose changes the proposal forces in the file(s) this critic
     owns. List per-file. The format used here is what the main agent will
     translate into Phase 12a checklist entries and Phase 13a patches. -->

## Critical Risks (required)

<!-- Risks the main agent has not yet flagged but that this critic, in its
     role, would flag. One numbered item per risk; severity-ordered. -->

---

## Role-Specific Sections

The section(s) below are required only for the named critic. Other critics
should omit them. They capture the role's distinctive contribution.

### Continuity Archivist

#### Timeline Updates Required

<!-- Which timeline layers need revision; how. -->

#### Latent Burdens

<!-- Future questions the world will now have to answer; what these create.
     One bullet per burden. These feed the change-log-entry's
     latent_burdens_introduced field. -->

#### Retcon Framing Recommendation

<!-- Is ontology_retcon the right change_type? If not, what is? Recommend
     the cleanest framing (qualification + addition, scope_retcon, etc.). -->

### Systems/Economy Critic

#### Economic Plausibility of Stated Stabilizers

<!-- Are the stabilizers strong enough? Where are they weak? -->

#### Missed Economic Consequences

<!-- 2nd / 3rd order effects not yet captured (labor market, substitution,
     market structure, distributional). -->

#### Market Structure Risks

<!-- Hidden incentives, arbitrage, regulatory capture, substitution. -->

### Politics/Institution Critic

#### Guild Response Plausibility

<!-- How do existing guilds / institutions respond? Coherent institutional history? -->

#### Civic / Legal Pressure

<!-- Charter Era stress points; case-law evolution. -->

#### Religious Pressure

<!-- Sectarian and pantheon impact. -->

#### Archive / Knowledge-Custody Pressure

<!-- Custody-contest implications. -->

### Everyday-Life Critic

#### AES-2 Compliance

<!-- Does this change ordinary life enough? -->

#### Per-Cluster Signatures

<!-- One bullet per cluster present in EVERYDAY_LIFE.md. Note where the
     signature is weak or absent and explain. -->

#### Hero-Drift Risk

<!-- Is this only-affecting-adventurers or does it touch ordinary trades? -->

#### Concrete Ordinary-Life Touch Points

<!-- New fears, gossip, drills, precautions, norms — be specific. -->

### Theme/Tone Critic

#### Primary Difference Preservation

<!-- Eroded, intact, or strengthened? -->

#### Tonal Contract Compatibility

<!-- Does this fit the kernel's stated tone? -->

#### Genre Drift Risk

<!-- Toward what would this drift if not handled carefully? -->

#### Tonally-Risky Framings

<!-- Recommend in-register language and forbid out-of-register language. -->

#### Story Engine Coherence

<!-- Does this generate stories that fit the kernel's natural engines? -->

### Mystery Curator

#### Per-Entry Mystery Status

<!-- For each Mystery Reserve entry: enriched / preserved / narrowed /
     forbidden-cheap-answer-touched. -->

#### Required Scope Commitments

<!-- What must the CF record explicitly say to preserve each at-risk M-N? -->

#### Firewall Adequacy

<!-- For each cross-application risk: is the firewall present and explicit? -->

#### OPEN_QUESTIONS Items Now Pressured

<!-- Which can no longer be cleanly deferred; what implications. -->

#### New Mystery Reserve Entries Recommended

<!-- Bounded unknowns the proposal manufactures (Rule 7 obligation). -->
