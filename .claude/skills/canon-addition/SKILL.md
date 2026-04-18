---
name: canon-addition
description: "Use when evaluating a proposed new canon fact against an existing worldloom world. Produces: adjudication verdict + (on accept outcomes) new Canon Fact Record(s) appended to CANON_LEDGER.md + Change Log Entry + required domain-file updates + adjudication record under worlds/<world-slug>/adjudications/; (on non-accept outcomes) adjudication report only. Mutates: worlds/<world-slug>/CANON_LEDGER.md, its change log section, affected domain files, and adjudications/ on accept; only adjudications/ on non-accept."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any mandatory world file (WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, CANON_LEDGER.md, OPEN_QUESTIONS.md, MYSTERY_RESERVE.md) is unreadable."
    required: true
  - name: proposal_path
    description: "Path to a markdown file containing the proposed canon fact and optionally: user intention, desired dramatic effect, preferred scope, desired rarity, revision appetite. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Canon Addition

Evaluates a proposed canon fact against an existing world's Kernel, Invariants, Ledger, and Mystery Reserve. On accept outcomes, appends the new fact to canon and applies all required domain-file updates atomically. On non-accept outcomes, writes a durable adjudication report inside the world.

<HARD-GATE>
Do NOT write any file — CF record, Change Log Entry, domain-file update, or adjudication report — until: (a) pre-flight check confirms worlds/<world-slug>/ exists and all mandatory world files are readable; (b) Phase 11 adjudication produces an explicit verdict; (c) for accept outcomes, Phase 12a required-updates list is complete and Phase 13a deliverable assembly is coherent; (d) Phase 14a (or 13b for non-accept) Validation and Rejection Tests pass with zero failures; (e) the user has explicitly approved the final deliverable summary. This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (resolve worlds/<world-slug>/; verify readability;
                  load FOUNDATIONS.md + 6 mandatory world files;
                  allocate next PA-NNNN / CF-NNNN / CH-NNNN)
      |
      v
Phase 0:  Normalize the Proposal (parse proposal_path OR interview;
          extract underlying world-change; classify fact type(s);
          selectively load additional domain files)
      |
      v
Phase 1:  Scope Detection (stated vs logical scope)
      |
      v
Phase 2:  Invariant Check (compatible / local-only / belief-only /
          requires-invariant-revision / incompatible)
      |
      v
Phase 3:  Underlying Capability / Constraint Analysis
      |
      v
Phase 4:  Prerequisites and Bottlenecks (common -> extinct)
      |
      v
Phase 5:  Diffusion and Copycat Analysis
      |
      v
Phase 6:  Consequence Propagation (1st / 2nd / 3rd order x 13 domains)
      |
      v
Escalation Gate: invariant revision OR >3 domains OR new invariant rule?
      |                                                   |
      | no                                                yes
      |                                                   v
      |                              Phase 6a: 6 parallel critic sub-agents
      |                                 (Continuity Archivist, Systems/Economy,
      |                                  Politics/Institution, Everyday-Life,
      |                                  Theme/Tone, Mystery Curator)
      |                                                   |
      |                                                   v
      |                              Phase 6b: Multi-Critic Synthesis
      |                                                   |
      +<--------------------------------------------------+
      v
Phase 7:  Counterfactual Pressure Test (no hand-wave stabilizers)
      |
      v
Phase 8:  Contradiction Classification (hard / soft / latent / drift / tone)
      |
      v
Phase 9:  Repair Pass (preserve dramatic intent)
      |
      v
Phase 10: Narrative and Thematic Fit
      |
      v
Phase 11: Adjudication (verdict + phase-cited justification)
      |
      +------------------------------+
      |                              |
     accept                      non-accept
      |                              |
      v                              v
Phase 12a: Required Update List   Phase 12b: Draft Adjudication Report
      |                              |
      v                              v
Phase 13a: Deliverable Assembly   Phase 13b: Validation Tests
      |                              |
      v                          fail->loop | pass
Phase 14a: Validation and            |
           Rejection Tests            v
      |                          Phase 14b: Commit (HARD-GATE -> atomic
   fail->loop | pass                       write of adjudication report only)
      v
Phase 15a: Commit (HARD-GATE -> atomic write of
           CF record(s) + Change Log Entry +
           domain-file patches + adjudication record)
```

## Inputs

### Required
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists and all mandatory world files are readable. This skill *extends* existing canon; overwrites are rejected.

### Optional
- `proposal_path` — filesystem path — markdown brief containing the proposed canon fact and optionally: user intention, desired dramatic purpose, novelty level, preferred scope, desired rarity, implied access pattern, user-stated constraints, and revision appetite. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

**Accept branch** (ACCEPT / ACCEPT_WITH_REQUIRED_UPDATES / ACCEPT_AS_LOCAL_EXCEPTION / ACCEPT_AS_CONTESTED_BELIEF):
- New Canon Fact Record(s) appended to `worlds/<world-slug>/CANON_LEDGER.md` — one per accepted fact, matching `templates/canon-fact-record.yaml`. `ACCEPT_AS_LOCAL_EXCEPTION` → `status: soft_canon`; `ACCEPT_AS_CONTESTED_BELIEF` → `status: contested_canon`.
- New Change Log Entry appended to the change log section of `CANON_LEDGER.md`, matching `templates/change-log-entry.yaml`, linking to new CF ids.
- Domain-file edits to every file in `required_world_updates` — prose additions and targeted revisions, each carrying an inline `<!-- added by CF-NNNN -->` attribution.
- Adjudication record: `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md` with full phase-by-phase analysis.

**Non-accept branch** (REVISE_AND_RESUBMIT / REJECT):
- Adjudication record only: `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md`. Contains original proposal + full Phase 0–11 analysis + verdict + (for REVISE) a resubmission menu OR (for REJECT) a why-this-cannot-be-repaired section.
- No canon mutated. No domain files touched.

## World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

- `docs/FOUNDATIONS.md` — cited throughout (Canon Layers at Phase 2 and 11; Validation Rules at Phase 14a/13b; Canon Fact Record Schema at Phase 13a; Change Control Policy at Phase 15a; Rule 7 at Phase 9/10).
- `worlds/<world-slug>/WORLD_KERNEL.md` — tonal/genre/primary-difference checks at Phase 2 and Phase 10.
- `worlds/<world-slug>/INVARIANTS.md` — Phase 2 invariant check and Phase 9 repair pass.
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 0 fact-type classification and Phase 3 capability analysis.
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 2 contradiction detection, Phase 8 classification, and pre-flight `CF-NNNN` / `CH-NNNN` allocation.
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 2 (resolves an open question?) and Phase 10 (creates new ones?).
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 2 (forbidden-answer collision?) and Phase 9 (move fact *into* the reserve as a repair?).
- Domain-specific files selectively loaded at Phase 0 based on fact type. Examples: proposed institution → `INSTITUTIONS.md` + `EVERYDAY_LIFE.md` + `ECONOMY_AND_RESOURCES.md`; proposed magic practice → `MAGIC_OR_TECH_SYSTEMS.md` + `INVARIANTS.md` + `EVERYDAY_LIFE.md`; proposed historical event → `TIMELINE.md` + `INSTITUTIONS.md` + `GEOGRAPHY.md`.
- `worlds/<world-slug>/adjudications/` directory listing — for pre-flight `PA-NNNN` allocation. Directory is created at commit time if absent.
- `proposal_path` contents (if provided) — read once at Phase 0.

If `worlds/<world-slug>/` is missing, or any of the six mandatory world files is unreadable, the skill aborts before Phase 0 and instructs the user to supply a valid `world_slug` or run `create-base-world` first.

## Pre-flight Check

1. Verify `worlds/<world-slug>/` exists. If absent, abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
2. Verify all six mandatory world files above are readable. If any is missing or unreadable, abort naming the specific file.
3. Load `docs/FOUNDATIONS.md` into working context.
4. Load the six mandatory world files.
5. Scan `worlds/<world-slug>/CANON_LEDGER.md` for the highest existing `CF-NNNN`; allocate `next_cf_id = highest + 1`.
6. Scan `worlds/<world-slug>/adjudications/*.md` (if the directory exists) for the highest existing `PA-NNNN`; allocate `next_pa_id = highest + 1`. If absent, `next_pa_id = PA-0001`.
7. Scan the Change Log section of `CANON_LEDGER.md` for the highest existing `CH-NNNN`; allocate `next_ch_id = highest + 1`.

## Phase 0: Normalize the Proposal

Parse `proposal_path` if provided; otherwise interview the user. Extract: **statement** (one paragraph), **underlying world-change** (operational change, not surface sentence), **canon fact type(s)** (ontological rule / capability / artifact / species trait / institution / ritual / law / historical event / social practice / taboo / technology / metaphysical claim / resource distribution / hidden truth / local anomaly / contested belief), **user-stated constraints** (preferred scope, rarity, access pattern, novelty, dramatic purpose, revision appetite).

Then selectively load additional world files based on fact type (see World-State Prerequisites for the mapping).

**Rule**: Never evaluate a surface sentence only. Always identify the underlying world-change before advancing.

**FOUNDATIONS cross-ref**: Ontology Categories and Relation Types.

## Phase 1: Scope Detection

Determine actual scope, not stated scope: geographic, temporal, social, visibility, reproducibility, institutional awareness, secrecy level, diffusion risk.

**Rule**: Many proposals appear local but logically tend toward larger scope. Catch that gap here.

**FOUNDATIONS cross-ref**: Rule 4 (No Globalization by Accident) — this phase IS the Scope Detection step.

## Phase 2: Invariant Check

Test the proposal against every invariant in `INVARIANTS.md` plus the tonal/genre contract in `WORLD_KERNEL.md`. Classify: compatible / compatible-only-if-scoped-locally / compatible-only-if-reclassified-as-belief / compatible-only-if-invariant-revised / incompatible.

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

Run three layers across the 13 required domains (everyday life, economy, law, religion, warfare, status order, kinship, architecture, mobility, environment, taboo/pollution, language/slang, memory/myth):

- **First-order** — immediate direct effects.
- **Second-order** — institutional and social responses.
- **Third-order** — world equilibrium shifts.

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

Each sub-agent receives: the full proposal, the Phase 0–6 outputs, `docs/FOUNDATIONS.md`, and the specific world-state slice its role needs. Each returns a concise critique report. Sub-agents never write files.

**Phase 6b: Multi-Critic Synthesis** — the main agent reads all six reports, resolves conflicts (noting productive tensions), and produces an integrated critique that feeds Phases 7–10. Sub-agent reports are appended to the adjudication record at commit time.

**If no trigger fires**: the main agent runs the remaining phases alone, adopting each critic lens inline at the appropriate phase.

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

If promising but destabilizing, propose repairs: reduce scope / reduce reproducibility / add cost / add side effects / add bottlenecks / localize geographically or temporally / make it recent / make it heritable to a narrow group / make it taboo / shift to contested belief / split into narrower facts / move into Mystery Reserve.

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

## Branch: Accept Path

### Phase 12a: Required Update List

For every file in the new CF record's `required_world_updates`, specify: what must be added; what must be revised; what new questions arise (route to `OPEN_QUESTIONS.md`); what ordinary-life consequences must now be visible (route to `EVERYDAY_LIFE.md`).

**Rule**: No canon addition is complete until these updates are drafted as concrete patches against the current file contents. "TODO: update INSTITUTIONS.md" is not acceptable.

**FOUNDATIONS cross-ref**: Change Control Policy.

### Phase 13a: Deliverable Assembly

1. **CF Record(s)** matching `templates/canon-fact-record.yaml`. `source_basis.direct_user_approval: false` until Phase 15a. Repair-splits produce multiple records linked via `source_basis.derived_from`.
2. **Change Log Entry** matching `templates/change-log-entry.yaml`. `change_id: CH-NNNN`. `affected_fact_ids` lists all new CF ids. `downstream_updates` lists every Phase 12a file. If Phase 2 routed to invariant-revision, `change_type` is `ontology_retcon` / `cost_retcon` / `perspective_retcon` / `chronology_retcon` / `scope_retcon`; otherwise `addition`. `retcon_policy_checks` all true.
3. **Domain-file patches** — concrete prose edits, each carrying `<!-- added by CF-NNNN -->` attribution.
4. **Adjudication record** at `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md` — original proposal + full Phase 0–11 analysis + verdict + phase-cited justifications + declined repair options + (if escalation fired) six critic sub-agent reports verbatim.

### Phase 14a: Validation and Rejection Tests

Halt and loop if any holds:
- new fact's `domains_affected` is empty (Rule 2).
- new fact has no `prerequisites`, `costs_and_limits`, or `visible_consequences` (Rule 1).
- capability/artifact fact has empty `distribution.why_not_universal` (Rule 4).
- Phase 6 second- or third-order consequences absent from `visible_consequences` or `required_world_updates` (Rule 5).
- Change Log Entry `retcon_policy_checks` has any false value (Rule 6).
- Phase 10 flagged a forbidden-answer collision that was not repaired (Rule 7).
- `required_world_updates` lists a file but Phase 12a provides no concrete patch for it.
- stated stabilizer (Phase 7) is a hand-wave with no named mechanism.
- verdict reasoning does not cite specific phase findings.

### Phase 15a: Commit (accept branch)

Present the deliverable summary to the user:
1. Verdict + phase-cited justification
2. CF Record summary (id, title, status, scope, domains, key consequences, key stabilizers)
3. Change Log Entry summary (id, change type, affected fact ids, downstream updates, retcon policy checks)
4. One-paragraph summary of each domain-file patch
5. Repair options considered and why the chosen repair won (if Phase 9 fired)
6. Critic synthesis summary (if escalation gate fired)
7. Adjudication record filename

**HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve, (b) request specific revisions (loop back to named phase), (c) reject and convert to non-accept branch.

On approval, atomic write of: CF record(s) to `CANON_LEDGER.md`; Change Log Entry to `CANON_LEDGER.md`; every domain-file patch to its target; `adjudications/PA-NNNN-<verdict>.md`. Set each CF's `source_basis.direct_user_approval: true` before write. All writes happen or none do. Report paths. Do NOT commit to git.

## Branch: Non-Accept Path

### Phase 12b: Draft Adjudication Report

Compose `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md`:
- Proposal (copied)
- Phase 0–11 analysis (full outputs, not summaries)
- Verdict + phase-cited justifications
- For `REVISE_AND_RESUBMIT`: a "what would need to change for resubmission" section (scope narrowings, cost additions, reclassifications, splits).
- For `REJECT`: a "why this cannot be repaired within the current world" section naming the invariants / genre-contract elements / mystery-reserve entries that forbid it. May recommend Mystery Reserve placement.
- If escalation fired, the six critic reports verbatim.

### Phase 13b: Validation Tests

Loop back to Phase 12b if: any phase's output is missing; verdict is not cited to specific phase findings; REVISE resubmission menu is empty or vague; REJECT does not name an invariant / genre-contract element / mystery-reserve entry as the cause.

### Phase 14b: Commit (non-accept branch)

Present verdict + report summary to the user.

**HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve, (b) request report revisions, (c) override the verdict and convert to accept branch (returns to Phase 11 with user-provided verdict override; override is logged in the adjudication record per Rule 6).

On approval, atomic write of `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md` only. No canon mutated. Report path. Do NOT commit to git.

## Validation Rules This Skill Upholds

- **Rule 1: No Floating Facts** — Phase 13a (CF schema required fields) + Phase 14a (rejection test: prerequisites, costs_and_limits, visible_consequences all required).
- **Rule 2: No Pure Cosmetics** — Phase 0 (ontology attachment at classification) + Phase 14a (rejection test: `domains_affected` non-empty).
- **Rule 3: No Specialness Inflation** — Phase 7 (Counterfactual Pressure Test refuses hand-wave stabilizers) + Phase 14a (rejection test: stabilizer must name concrete mechanism).
- **Rule 4: No Globalization by Accident** — Phase 1 (Scope Detection) + Phase 14a (rejection test: capability/artifact facts must specify `distribution.why_not_universal`).
- **Rule 5: No Consequence Evasion** — Phase 6 (three-layer propagation) + Phase 14a (rejection test: 2nd/3rd-order consequences must appear in CF or `required_world_updates`).
- **Rule 6: No Silent Retcons** — Phase 13a (Change Log Entry) + Phase 14a (`retcon_policy_checks` all true) + Phase 15a (inline `<!-- added by CF-NNNN -->` attribution).
- **Rule 7: Preserve Mystery Deliberately** — Phase 2 (`MYSTERY_RESERVE.md` loaded; forbidden-answer collisions detected) + Phase 10 (trivialization flagged) + Phase 14a (unrepaired collision halts).

## Record Schemas

- **Canon Fact Record** → `templates/canon-fact-record.yaml` (same schema as create-base-world; FOUNDATIONS §Canon Fact Record Schema).
- **Change Log Entry** → `templates/change-log-entry.yaml` (same schema as create-base-world; FOUNDATIONS §Change Control Policy).
- **Adjudication Report** → `templates/adjudication-report.md` (original to this skill). Named sections: `# Proposal`, `# Phase 0–11 Analysis`, `# Verdict`, `# Justification`, `# Critic Reports` (if escalation fired), `# Resubmission Menu` (for REVISE) OR `# Why This Cannot Be Repaired` (for REJECT).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | FOUNDATIONS.md + 6 mandatory world files loaded before any phase; domain files loaded selectively per Phase 0 classification |
| Canon Layers §Hard / Soft / Contested | Phase 11 | Verdict determines CF `status`: ACCEPT→hard_canon; ACCEPT_AS_LOCAL_EXCEPTION→soft_canon; ACCEPT_AS_CONTESTED_BELIEF→contested_canon |
| Canon Layers §Mystery Reserve | Phase 9 | Repair pass may move fact into `MYSTERY_RESERVE.md` rather than open canon |
| Invariants §full schema | Phase 2 | Every invariant tested; repair pass may recommend invariant revision (routes to `change_type: ontology_retcon`) |
| Canon Fact Record Schema | Phase 13a | Every accepted fact becomes a full CF record matching the schema |
| Rule 1 (No Floating Facts) | Phase 13a, Phase 14a | CF schema fields + rejection test |
| Rule 2 (No Pure Cosmetics) | Phase 0, Phase 14a | Ontology attachment + non-empty domains test |
| Rule 3 (No Specialness Inflation) | Phase 7, Phase 14a | Stabilizer requirement + hand-wave rejection test |
| Rule 4 (No Globalization by Accident) | Phase 1, Phase 14a | Scope Detection + `distribution.why_not_universal` test |
| Rule 5 (No Consequence Evasion) | Phase 6, Phase 14a | Three-layer propagation + consequence-reflection test |
| Rule 6 (No Silent Retcons) | Phase 13a, Phase 14a, Phase 15a | Change Log Entry + `retcon_policy_checks` + inline attribution |
| Rule 7 (Preserve Mystery Deliberately) | Phase 2, Phase 10, Phase 14a | Mystery Reserve load + collision detection + unrepaired-collision test |
| Change Control Policy | Phase 15a | Change Log Entry written atomically with CF record(s) and domain-file patches; `downstream_updates` lists affected files |

## Guardrails

- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `proposal_path`. Repo-root writes are forbidden.
- If a pre-flight `next_cf_id` collides with an existing CF record (indicating a concurrent or interrupted prior run), abort and ask the user to resolve the collision before retrying. Never overwrite an existing CF record.
- Domain-file patches are **additions and targeted revisions**, never wholesale rewrites. If a patch would remove more than a paragraph of existing prose, route to `change_type: scope_retcon` / `cost_retcon` / etc. and surface the removal explicitly in the Phase 15a summary — the user must see what is being cut before approving.
- The six critic sub-agents (when the escalation gate fires) are invoked in parallel via the Agent tool and receive only the minimum world-state slice their role needs — not the entire world. Large `CANON_LEDGER.md` files should be pre-filtered to relevant domains before dispatch. Sub-agents never write files; they return text reports only.
- The HARD-GATE at the top of this file is absolute. No `Write` or `Edit` to `worlds/<world-slug>/` until Phase 14a (or 13b) passes clean AND the user approves the deliverable summary. Auto Mode does not override this — skill invocation is not deliverable approval.
- Do NOT commit to git. Writes land in the working tree; the user reviews and commits.
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root.
- This skill never produces diegetic artifacts (in-world texts); those belong to a future canon-reading skill. If the user supplies a proposal shaped like a diegetic text rather than a canon claim, Phase 0 must normalize it into an operational canon claim before proceeding, or abort with a pointer to the eventual diegetic-text skill.

## Final Rule

A canon fact is not added until it has a scope, a consequence web, a visible ordinary-life signature, a stated stabilizer against universalization, an attribution trail in every file it touches, and a change log entry the world can be audited against — and once added, the ledger is append-only; the only way to change an accepted fact is another run of this skill that produces an explicit retcon entry.
