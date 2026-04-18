---
name: create-base-world
description: "Use when starting a new worldloom world from a user premise. Produces: full initial world bundle (13 mandatory world files including the genesis CANON_LEDGER.md) at worlds/<world-slug>/. Mutates: creates worlds/<world-slug>/ directory and all its contents."
user-invocable: true
arguments:
  - name: world_name
    description: "Human-readable display name for the world (e.g., 'Ashen Dunes'). Kebab-cased to derive the directory slug worlds/<world-slug>/."
    required: true
  - name: premise_path
    description: "Path to a freeform markdown brief containing the user's premise, genre, mood, exclusions, intended use case, and optional inspirations/red lines. If omitted, Phase 0 interviews the user to elicit the same information."
    required: false
---

# Create Base World

Transforms a user premise into a self-consistent initial world model: writes the 13 mandatory world files (including the genesis `CANON_LEDGER.md`) at `worlds/<world-slug>/`, validated against FOUNDATIONS.md before any file is committed.

<HARD-GATE>
Do NOT write any file under `worlds/<world-slug>/` until: (a) pre-flight check confirms the directory does not already exist; (b) Phase 15 validation passes with zero rejection-test failures; (c) the user has explicitly approved the final deliverable summary. If `worlds/<world-slug>/` already exists, the skill MUST abort and require the user to supply a different `world_name` — overwriting an existing world is forbidden. This gate is authoritative even under Auto Mode or any other autonomous-execution context — the user's invocation of this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (world_name → slug; verify worlds/<slug>/ absent; load FOUNDATIONS.md)
      |
      v
Phase 0:  Normalize the User Premise (parse premise_path OR interview)
      |
      v
Phase 1:  Establish Baseline via Minimal Departure (per-domain unchanged/altered/unknown)
      |
      v
Phase 2:  Draft the World Kernel
      |
      v
Phase 3:  Build Invariants (ontological / causal / distribution / social / aesthetic)
      |
      v
Phase 4:  Define the Chronotope
      |
      v
Phase 5:  Define Ontological Systems (species embodiment, magic/tech operational model)
      |
      v
Phase 6:  Build Geography and Ecology
      |
      v
Phase 7:  Build Institutions
      |
      v
Phase 8:  Build Everyday Life (mandatory — per region/class/species cluster)
      |
      v
Phase 9:  Build History as Pressure (deep → remembered → recent → present)
      |
      v
Phase 10: Cross-Domain Consistency Passes (ecology / economy / political /
          warfare / religion / language / daily-life — in order)
      |
      v
Phase 11: Equilibrium Explanation (why hasn't the world drifted?)
      |
      v
Phase 12: Generate Pressure Systems and Story Engines
      |
      v
Phase 13: Install Mystery Reserve (active / passive / forbidden)
      |
      v
Phase 14: Draft Initial Canon Ledger (one CF record per hard fact)
      |
      v
Phase 15: Validation and Rejection Tests  --fail--> halt + report + user loop
      |
    pass
      |
      v
Phase 16: Commit World State (HARD-GATE approval → atomic write of 13 mandatory
          world files (incl. CANON_LEDGER.md) + CH-0001 genesis change log entry)
```

## Inputs

### Required
- `world_name` — string — human-readable display name; kebab-cased to derive `<world-slug>` and the directory `worlds/<world-slug>/`.

### Optional
- `premise_path` — filesystem path — markdown brief containing: premise, genre, exclusions/dislikes, target mood/tone, realism vs mythic preference, intended use case (novel / RPG setting / open-world game / anthology / transmedia / lore sandbox), and any of the optional items from the proposal (inspirations, anti-inspirations, mystery level, ethical red lines, cultural complexity preference, audience age band, lore density preference, story scale). If omitted, Phase 0 interviews the user to elicit the same items. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

Atomic write to `worlds/<world-slug>/`:
- `WORLD_KERNEL.md` — one-paragraph kernel + expanded kernel fields (genre/tone contract, chronotope, primary difference, core pressures, natural story engines, what is ordinary/wonder/taboo)
- `INVARIANTS.md` — identified invariants by type, each with identifier, statement, rationale, examples, non-examples, break conditions, revision difficulty
- `ONTOLOGY.md` — populated ontology categories + declared relation types
- `TIMELINE.md` — deep / remembered / recent / present layers; each event with material + institutional + symbolic residues
- `GEOGRAPHY.md` — terrain, climate, choke points, trade corridors, migration routes, predator zones, disease ecologies, sacred/cursed terrain, extractive zones, food baselines, settlement limits
- `PEOPLES_AND_SPECIES.md` — per species: body plan, diet, movement, senses, vulnerability, reproduction, lifespan, social density, relations to clothing/tools/architecture/warfare/taboo/religion/law/environment
- `INSTITUTIONS.md` — per institution: function, legitimacy source, material base, violence capacity, recruitment, succession, internal contradictions
- `ECONOMY_AND_RESOURCES.md` — scarcity map, trade flows, value stores, wealth creation, breakage points
- `MAGIC_OR_TECH_SYSTEMS.md` — per system: source, access path, training, cost, reliability, failure states, material requirements, social perception, regulation, mundane substitutes, visible signs, long-term consequences
- `EVERYDAY_LIFE.md` — per region/class/species cluster: food, water, sanitation, housing, clothing, heating, childbirth, childrearing, aging, courtship/marriage, labor rhythm, leisure, intoxication, prayer, cleanliness, injuries, medicine, death disposal, oral storytelling, fears, aspirations
- `OPEN_QUESTIONS.md` — unresolved design choices explicitly deferred
- `MYSTERY_RESERVE.md` — active / passive / forbidden mysteries, each with knowns, unknowns, in-world interpretations, disallowed cheap answers, domains touched, future-resolution safety
- `CANON_LEDGER.md` — one Canon Fact Record per hard canon fact (see `templates/canon-fact-record.yaml`) + `CH-0001` genesis Change Log Entry (see `templates/change-log-entry.yaml`)

## World-State Prerequisites

This skill **bootstraps** world state — by definition, no prior `WORLD_KERNEL.md` / `INVARIANTS.md` / `CANON_LEDGER.md` exists for this world. The Tooling Recommendation in FOUNDATIONS still applies; it is honored as follows:

- `docs/FOUNDATIONS.md` — **mandatory read** before any phase runs. The skill cites it throughout phases (Canon Layers at Phase 2, Invariants schema at Phase 3, Canon Fact Record Schema at Phase 14, Validation Rules at Phase 15, Change Control Policy at Phase 16).
- `worlds/<world-slug>/` directory listing — **mandatory pre-flight check**. If the directory exists, the skill aborts before Phase 0.
- `premise_path` contents (if provided) — **read once at Phase 0** as raw user input.
- No existing world files are read, because none exist for this world.

## Pre-flight Check

1. Derive `<world-slug>` from `world_name` (kebab-case, lowercase, punctuation-stripped).
2. If `worlds/<world-slug>/` already exists, **abort** and instruct the user to rerun with a different `world_name`. Overwriting is forbidden.
3. Load `docs/FOUNDATIONS.md` into working context.

## Phase 0: Normalize the User Premise

Parse `premise_path` if provided; otherwise interview the user. Extract: genre identity, implied baseline reality, intended ontological departures, power fantasy level, social density, violence level, cosmological scale, likely focal conflicts, what excites the user, what must not happen.

If the premise does not state "what excites the user" or "what must not happen" explicitly (most won't — most premises are positive-fact lists organized by domain), infer them from the positive facts present and from the exclusions implied by the genre choice. Surface every inferred item in the Phase 16 deliverable summary so the user can confirm or correct.

## Phase 1: Establish Baseline via Minimal Departure

For each of 23 domains (physics, cosmology, biology, reproduction, lifespan, sentience, language, religion, governance, warfare, medicine, metallurgy, agriculture, labor, family structure, sexuality/kinship, trade, literacy, death, afterlife, weather, disease, ecology), mark **unchanged / altered / unknown**.

**Rule**: Do not begin by inventing differences — begin by locating exactly where difference enters.

## Phase 2: Draft the World Kernel

Write a one-paragraph kernel first, then expand to full fields (genre contract, tonal contract, chronotope, primary difference, core pressures, natural story engines, what is ordinary / wonder / taboo).

**Rule**: The kernel must distinguish what is common, what is rare, what is impossible. If it cannot, the kernel is not ready.

**FOUNDATIONS cross-ref**: Canon Layers §Hard Canon — kernel facts are the seed hard canon.

## Phase 3: Build Invariants

Define non-negotiable truths in each invariant type (ontological, causal, distribution, social, aesthetic). Each invariant gets: identifier, statement, rationale, examples, non-examples, break conditions, revision difficulty (per FOUNDATIONS §Invariants).

## Phase 4: Define the Chronotope

Define travel speeds, communication speeds, seasonal/ritual rhythms, war/harvest/migration seasons, urban vs rural temporalities, ruin-depth, how ancient the past feels in ordinary life.

## Phase 5: Define Ontological Systems

**Per sentient species**: body plan, diet, movement, senses, vulnerability, reproduction, lifespan, social density, relations to clothing/tools/architecture/warfare/taboo/religion/law/environment.

**Per magic/tech system**: source, access path, training, cost, reliability, failure states, material requirements, social perception, regulation, mundane substitutes, visible signs, long-term consequences.

**Rule**: Species cannot be cosmetic reskins — embodiment must matter. A "low-magic" world must define low-magic operationally (rare practitioners / weak effects / high cost / secrecy / low public visibility / relic-not-skill / civilization-poor).

**FOUNDATIONS cross-ref**: Rule 2 (No Pure Cosmetics) enforced here.

## Phase 6: Build Geography and Ecology

Define terrain zones, climate bands, choke points, trade corridors, migration routes, predator zones, disease ecologies, sacred/cursed terrain, extractive zones, food baselines, settlement limits.

**Rule**: No polity, species distribution, or trade pattern may be invented before geography and ecology make it plausible.

## Phase 7: Build Institutions

For each mandatory institutional domain (family/clan/household, law/custom/judgment, religion/ritual authority, landholding/resource control, military/defense, trade/guilds/caravans/shipping, healing/medicine, burial/death management, education/apprenticeship, recordkeeping/archives/myth transmission): function, legitimacy source, material base, violence capacity, recruitment, succession, internal contradictions, relations to literacy/religion/economy/war.

**Rule**: A world with no institutional thinking is not a world — it is a sketch.

## Phase 8: Build Everyday Life (mandatory)

For each major region / class / species cluster: food, water, sanitation, housing, clothing, heating/cooling, childbirth, childrearing, aging, courtship/marriage, labor rhythm, leisure, intoxication, prayer/ritual, cleanliness concepts, common injuries, medicine access, death disposal, oral storytelling/songs/sayings, common fears, common aspirations.

**Rule**: If the world is only designed from the perspective of rulers, adventurers, and cosmology, it will feel fake.

## Phase 9: Build History as Pressure

Create four layers: **deep past, remembered past, recent past, current unstable present**. For each major event: what changed materially/institutionally/symbolically, who benefited, who still tells the story, what scars remain in architecture/law/prejudice/ritual/landscape/economy.

**Rule**: Past events must leave residues. No history should vanish without a trace.

## Phase 10: Cross-Domain Consistency Passes (in order)

1. **Ecology Pass** — species, food chains, settlement density, monsters, resources
2. **Economy Pass** — scarcity, goods movement, value stores, inequality, trade breakage
3. **Political Pass** — taxation, violence coordination, legitimacy, formal vs real power
4. **Warfare Pass** — fighters, logistics, species/terrain/season effects, force projection
5. **Religion Pass** — sacred, interpretation authority, ritual-legitimacy interaction, life-cycle rites
6. **Language / Communication Pass** — languages, dialects, scripts, trade tongues, species-embodiment effects on speech/writing
7. **Daily-Life Pass (gate)** — would an ordinary person recognize this as a livable world rather than a concept-art portfolio?

## Phase 11: Equilibrium Explanation (Scope Detection)

Explain why the world has not already drifted into a nearby obvious arrangement. Produce: stabilizers, bottlenecks, taboos, monopolies, ecological checks, ideological checks, infrastructural limits, failure costs.

**Rule**: Every extraordinary capability must meet resistance from reality.

**FOUNDATIONS cross-refs**: Rule 3 (No Specialness Inflation) and Rule 4 (No Globalization by Accident) enforced here. This is the **Scope Detection phase** required of canon-mutating skills.

## Phase 12: Generate Pressure Systems and Story Engines

Pressures under: class, species coexistence, law vs custom, scarcity, ritual pollution, migration, catastrophe memory, ruins/relic extraction, contested borders, splinter faiths, succession, trade asymmetry, ecological collapse, military transition, disease, forbidden knowledge.

Story engines: what naturally produces conflict / journey / betrayal / intimacy-across-divisions / myth and lies.

## Phase 13: Install Mystery Reserve

Three categories: **active** (characters care now), **passive depths** (atmospheric), **forbidden** (long-term unresolved). Each mystery: known facts, unknown facts, common in-world interpretations, disallowed cheap answers, domains touched, future-resolution safety.

**Rule**: Mystery must be bounded, not mushy.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) enforced here.

## Phase 14: Draft Initial Canon Ledger (Consequence Propagation)

Record every accepted baseline fact as a Canon Fact Record matching `templates/canon-fact-record.yaml` and FOUNDATIONS §Canon Fact Record Schema. Each record specifies scope, status, source, prerequisites, distribution, costs-and-limits, **visible consequences**, affected files.

**FOUNDATIONS cross-refs**: Rule 1 (No Floating Facts) — every record carries domain, scope, prerequisites, limits, consequences. This phase IS the Consequence Propagation phase — at minimum first-order consequences (`visible_consequences`) and second-order distribution effects (`distribution`, `costs_and_limits`) are required per record, per Rule 5 (No Consequence Evasion).

**Coverage check**: After drafting the CF list, cross-check it against the user's premise. Every bullet (or distinct fact) in the premise must map to ≥1 of: a Canon Fact Record, an OPEN_QUESTIONS entry, a MYSTERY_RESERVE entry, or an explicit invariant. Any uncovered premise fact must be either folded into an existing CF, deferred explicitly to OPEN_QUESTIONS, or surfaced in the Phase 16 deliverable summary as "unmapped — please confirm intent." This is the inverse of Rule 1: no premise fact may exit Phase 14 without a disposition.

## Phase 15: Validation and Rejection Tests

Reject or revise if any are true:
- species are cosmetic
- magic has no cost, limit, or social consequence
- institutions do not explain how power persists
- geography has no effect on culture or politics
- history leaves no residue
- daily life is absent
- every mystery is actually vagueness
- world tone and ontology are mismatched
- the world supports only heroes, not populations
- there is no explanation for why extraordinary facts have not transformed everything

**On failure**: halt, report failed tests, loop back to the responsible phase(s).
**On pass**: advance to Phase 16.

## Phase 16: Commit World State

Present the final deliverable summary to the user:
1. One-paragraph world kernel
2. One-page invariant summary
3. One-page everyday-life summary
4. Species / peoples table (columns: cluster, exemplar species, population scale, distinguishing embodiment notes)
5. Geography-pressure map summary
6. Institutional summary
7. Historical pressure summary
8. Pressure systems list
9. Mystery reserve list
10. Canon ledger entry count + sample

**HARD-GATE fires here**: do NOT write any file until the user explicitly approves the summary.

On approval, atomic write to `worlds/<world-slug>/` of all 13 mandatory world files (`CANON_LEDGER.md` is one of them), followed by a `CH-0001` genesis **Change Log Entry** per `templates/change-log-entry.yaml` (`change_type: addition`, `scope.local_or_global: global` within world scope, `severity_before_fix: 0`, `severity_after_fix: 0`, `downstream_updates: []` since this is genesis). Report paths written. Do NOT commit to git.

## Validation Rules This Skill Upholds

- **Rule 1: No Floating Facts** — enforced at Phase 14 via the Canon Fact Record schema (domain, scope, prerequisites, limits, consequences all required fields per record).
- **Rule 2: No Pure Cosmetics** — enforced at Phase 5 (species embodiment mandates) and Phase 15 rejection test "species are cosmetic".
- **Rule 3: No Specialness Inflation** — enforced at Phase 11 (Equilibrium Explanation) and Phase 15 rejection test "extraordinary facts transform everything".
- **Rule 4: No Globalization by Accident** — enforced at Phase 11 (Scope Detection via stabilizers/bottlenecks/monopolies) and Phase 14 via each CF record's `distribution` block.
- **Rule 5: No Consequence Evasion** — enforced at Phase 14 via `visible_consequences` + `costs_and_limits` + `required_world_updates` fields; Phase 10 cross-domain passes surface missed second-order effects.
- **Rule 6: No Silent Retcons** — enforced at Phase 16 via the `CH-0001` genesis Change Log Entry; future edits to this world are required to link back to this genesis entry.
- **Rule 7: Preserve Mystery Deliberately** — enforced at Phase 13 (Mystery Reserve structure — bounded unknowns with disallowed cheap answers and future-resolution safety).

## Record Schemas

- Canon Fact Record → `templates/canon-fact-record.yaml` (matches FOUNDATIONS §Canon Fact Record Schema)
- Change Log Entry → `templates/change-log-entry.yaml` (matches FOUNDATIONS §Change Control Policy)

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | FOUNDATIONS.md loaded before any phase; world-state bootstrapped under `worlds/<slug>/` — the absence of prior state is itself the prerequisite |
| Canon Layers §Hard Canon | Phase 2, 3 | Kernel + Invariants seed the hard-canon layer |
| Canon Layers §Mystery Reserve | Phase 13 | Bounded unknowns with forbidden-resolution rules |
| Invariants §full schema | Phase 3 | Each invariant gets identifier/statement/rationale/examples/non-examples/break-conditions/revision-difficulty |
| Canon Fact Record Schema | Phase 14 | Every baseline fact is a full CF record |
| Rule 1 (No Floating Facts) | Phase 14 | CF schema required fields |
| Rule 2 (No Pure Cosmetics) | Phase 5, Phase 15 | Embodiment-must-matter rule + cosmetic rejection test |
| Rule 3 (No Specialness Inflation) | Phase 11 | Equilibrium Explanation required |
| Rule 4 (No Globalization by Accident) | Phase 11, Phase 14 | Scope Detection + per-fact distribution block |
| Rule 5 (No Consequence Evasion) | Phase 14, Phase 10 | Consequence Propagation in CF records + cross-domain passes |
| Rule 6 (No Silent Retcons) | Phase 16 | Genesis Change Log Entry `CH-0001` |
| Rule 7 (Preserve Mystery Deliberately) | Phase 13 | Mystery Reserve structure |
| Change Control Policy | Phase 16 | Change Log Entry schema applied at genesis; subsequent edits must extend this log |

## Guardrails

- This skill bootstraps a new world; it **never** writes to an existing `worlds/<slug>/` directory.
- This skill writes **only** under `worlds/<world-slug>/`. It never edits `docs/FOUNDATIONS.md`, never edits other worlds, never touches `archive/` or `brainstorming/`.
- **Multi-role passes via the Agent tool** are recommended when the world is large or contested — specifically: more than 5 species clusters, more than 3 distinct climate bands, contested cosmology, or any premise the operator judges too large to hold in a single synthesis. In those cases, delegate Phases 5 (Ontological Systems), 6 (Geography & Ecology), 7 (Institutions), 8 (Everyday Life), and 13 (Mystery Reserve) to role-tagged sub-agents (Ontology Architect, Geography/Ecology Analyst, Institutions Analyst, Everyday Life Analyst, Mystery Curator) before re-entering Phase 10 for cross-domain synthesis. For ordinary-scale worlds, monolithic synthesis by the main agent is acceptable.
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root (so `worlds/<slug>/` is under the worktree, not the main repo).
- The HARD-GATE at the top of this file is absolute. No file writes before user approval of the Phase 16 deliverable summary AND Phase 15 passing clean.

## Final Rule

A base world is not committed until every hard canon fact has a Canon Fact Record, every extraordinary capability meets a stabilizer, every mystery is bounded rather than vague, and the user has approved the complete deliverable — and once committed, `worlds/<world-slug>/` is treated as existing-world state that this skill will refuse to overwrite.
