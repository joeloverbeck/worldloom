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
- Domain-file edits to every file in `required_world_updates` — prose additions and targeted revisions, each carrying an inline `<!-- added by CF-NNNN -->` attribution (markdown prose only; for in-place YAML CF modifications, use the `notes`-field convention in Phase 13a).
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
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 2 (forbidden-answer collision?) and Phase 9 (two distinct repair operations: move fact *into* the reserve, OR create a *new* MR entry holding a bounded unknown the proposal manufactures).
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
8. **Large-ledger method (steps 5 and 7)**: mature worlds accumulate ledgers that exceed the Read tool's default token budget (≥1500 lines is a practical threshold, though the tool's exact cap varies). When the ledger is large, do NOT attempt a full-file read for ID allocation. Instead, use `Grep` with `-n` on the patterns `^id: CF-\d+` and `^change_id: CH-\d+` to enumerate every id and its line offset in a single call per pattern; take the highest numeric suffix as the scan result. When subsequent phases need the text of specific CF records (e.g., the records named in the proposal's `derived_from` list), use targeted `Read offset/limit` calls anchored at the grepped line offsets rather than full-file reads. Apply the same grep-then-targeted-read pattern to `adjudications/*.md` scanning (step 6) when that directory has grown beyond readability. On small worlds, full-file reads remain acceptable; the grep method is the canonical large-ledger fallback, not the default.
9. Load the skill's own templates into working context: `templates/canon-fact-record.yaml`, `templates/change-log-entry.yaml`, `templates/adjudication-report.md`. Also load `templates/critic-prompt.md` and `templates/critic-report-format.md` when escalation is likely (>3 domains named in the proposal, user-stated novelty level is high, or the proposal's underlying world-change touches an invariant). Loading templates upfront avoids mid-flow template reads and keeps the reference schema visible during drafting. If escalation turns out not to fire, the critic templates remain unused — cost is a single extra read.

## Phase 0: Normalize the Proposal

Parse `proposal_path` if provided; otherwise interview the user. Extract: **statement** (one paragraph), **underlying world-change** (operational change, not surface sentence), **canon fact type(s)** (ontological rule / capability / artifact / species trait / institution / ritual / law / historical event / social practice / taboo / technology / metaphysical claim / resource distribution / hidden truth / local anomaly / contested belief), **user-stated constraints** (preferred scope, rarity, access pattern, novelty, dramatic purpose, revision appetite).

**Template `type` mapping**: The Phase 0 conceptual labels above feed into a single `type` value in the `canon-fact-record.yaml` template. The common enum is `capability | artifact | law | belief | event | institution | species | ritual | taboo | technology | resource_distribution | hidden_truth | local_anomaly | metaphysical_rule`; additional values are permitted when drawn from FOUNDATIONS.md §Ontology Categories and are in use in the existing ledger (notably `historical_process`, `text_tradition`, `hazard`, `craft`). Mapping:

- `ontological rule` / `metaphysical claim` → `metaphysical_rule`
- `capability` → `capability`
- `artifact` → `artifact`
- `species trait` → `species`
- `institution` → `institution`
- `ritual` → `ritual`
- `law` → `law`
- `historical event` → `event` (for a discrete occurrence); use `historical_process` when the fact is an ongoing process or residue of past events rather than a single event
- `taboo` → `taboo`
- `technology` → `technology`
- `craft` → `craft` (the learned production-skill sense; FOUNDATIONS.md §Ontology Categories)
- `resource distribution` → `resource_distribution`
- `hidden truth` → `hidden_truth`
- `local anomaly` → `local_anomaly`
- `contested belief` → `belief` (with `status: contested_canon`)
- `social practice` → one of `belief` (doctrinal), `ritual` (ceremonial), `institution` (organized), or `law` (codified) — choose by the practice's dominant expression
- `text / tradition` → `text_tradition` (for a fact about texts, fragmentary corpora, translation status; FOUNDATIONS.md §Ontology Categories)
- `hazard` → `hazard` (for a recurring environmental or bodily danger fact; FOUNDATIONS.md §Ontology Categories)

**Tie-break criteria for overlapping types**: Some proposals straddle `institution` / `law` / `ritual` / `resource_distribution` / `craft` / `technology` without a clear single answer (e.g., a welfare registry is simultaneously an organized body, a statute, and a distribution mechanism; a ceremonial apprenticeship is simultaneously a ritual and a craft). Apply this rubric before falling through to the Phase 9 split option:

1. **Choose the type of the PRIMARY ENTITY — the thing that EXISTS**, not its operational effects. The registry IS an institution; the statute codifying it and the supplement it distributes are consequences, not the entity. The apprenticeship IS a craft; the initiation rite prescribing its start is a subordinate aspect.
2. **Subordinate aspects become `visible_consequences` rather than separate CFs.** A welfare institution's pension-distribution mechanism, its enrollment ceremony, and its governing statute all belong in one CF's `visible_consequences` list unless a sub-fact passes the Phase 9 split rubric (materially distinct CF types, Mystery Reserve exposure, distribution shape, or domains_affected).
3. **Preferred type defaults for common overlaps**:
   - Organized civic/guild body with operational effects → `institution` (not `law` or `resource_distribution`)
   - Statute whose primary existence is codification-of-a-rule → `law` (not `institution`)
   - Bounded ceremonial performance with no independent institutional housing → `ritual` (not `institution`)
   - Standing allocation pattern whose administering body is already committed elsewhere → `resource_distribution`
   - Learned production skill with empirical technique → `craft` (not `technology`)
   - Built/engineered apparatus whose operation doesn't require learned technique → `technology`

If the rubric still yields two defensible types after these checks, fall through to the Phase 9 split option; unnecessary splitting without the split rubric's material criteria fragments the fact's integrity (see Phase 9).

Each CF record gets exactly one `type` value. If the proposal straddles categories, split into multiple CFs (see Phase 9 split rubric). When using a value outside the common enum, draw it verbatim from FOUNDATIONS.md §Ontology Categories so ledger-wide grep discovery works across CFs.

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

Each sub-agent receives: the full proposal, the Phase 0–6 outputs, `docs/FOUNDATIONS.md`, and the specific world-state slice its role needs. Each returns a concise critique report. Sub-agents never write files. Use `templates/critic-prompt.md` to construct each per-role prompt and `templates/critic-report-format.md` to specify the required report structure — this keeps critic outputs uniform across runs and across roles.

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

If promising but destabilizing, propose repairs: reduce scope / reduce reproducibility / add cost / add side effects / add bottlenecks / localize geographically or temporally / make it recent / make it heritable to a narrow group / make it taboo / shift to contested belief / split into narrower facts / move into Mystery Reserve / create a *new* Mystery Reserve entry to hold a bounded unknown the proposal manufactures (Rule 7 obligation — distinct from "move into Mystery Reserve"; used when the fact itself enters open canon but its existence creates a new bounded unknown — typical patterns: a numeric parameter, a mechanism, or a reading whose resolution would destabilize the new fact's stabilizers).

**Split rubric** (for the "split into narrower facts" option): Choose a split when sub-facts have materially distinct (a) canon-fact-types under the template enum (see Phase 0 mapping), (b) Mystery Reserve exposure profiles requiring different firewall commitments, (c) `distribution` shapes that cannot share a single `who_can_do_it` / `who_cannot_easily_do_it` / `why_not_universal` block, or (d) `domains_affected` sets that would force an overly-broad coverage on a bundled record. Otherwise keep as a single CF with subtypes documented in `statement` and `visible_consequences` — unnecessary splitting fragments the fact's integrity and produces redundant `source_basis.derived_from` chains.

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

Produce a verifiable one-line-per-file checklist. For every file in the new CF record's `required_world_updates` plus every file modified by an existing-CF qualification, write a single line of the form:

```
- <FILE.md> — <one-sentence summary of what changes>
```

For files with multiple distinct subsection updates, the line may be extended with a trailing semicolon-separated subsection list:

```
- <FILE.md> — <one-sentence summary>; <subsection-1>: <change>; <subsection-2>: <change>; ...
```

The summary remains a single sentence; the subsection list is optional structured detail that preserves audit-trail granularity for large deliveries without fragmenting the checklist into multi-line entries.

The checklist is the *gate* that opens Phase 13a: drafting may only begin once every required-updates entry has a corresponding one-sentence summary present *somewhere* in the accept-branch artifacts. This separation prevents both silent merging (drafting without enumerating) and duplicated drafting (writing prose twice).

**Placement flexibility**: The Phase 12a "checklist" is a discipline, not a mandated standalone artifact. The required information content — one-sentence summary per affected file — may be carried by any of the following, drafter's choice:

- (a) a dedicated "Phase 12a Checklist" block in the adjudication record or deliverable summary (the most explicit form);
- (b) the Phase 15a deliverable summary's per-artifact one-paragraph summaries (when those summaries name-and-describe each file's patch);
- (c) an expanded `required_world_updates` list in the CF record where each entry carries a trailing "— <one-sentence summary>" after the filename.

Whatever form is chosen, the reader of the deliverable summary must be able to point at a specific location where each required-update file is named AND described in one sentence. "The filename appears in `required_world_updates`" alone does not satisfy the discipline; the description sentence is load-bearing. When the affected file gets multiple distinct subsection updates, the trailing semicolon-separated subsection list from the one-line-per-file format above may be applied to whichever placement (a / b / c) is chosen.

For each summary, the content must name: what is added; what is revised; what new questions arise (route to `OPEN_QUESTIONS.md`); what ordinary-life consequences must now be visible (route to `EVERYDAY_LIFE.md`).

**Rule**: No canon addition is complete until these updates are drafted as concrete patches against the current file contents in Phase 13a. "TODO: update INSTITUTIONS.md" is not acceptable in either Phase 12a checklist or Phase 13a patch.

**FOUNDATIONS cross-ref**: Change Control Policy.

### Phase 13a: Deliverable Assembly

Phase 13a may begin only after the Phase 12a discipline is satisfied — every file in `required_world_updates` has an identified one-sentence summary in whichever placement the drafter has chosen per Phase 12a (a / b / c). For placement (c) where the summary lives in the CF record's `required_world_updates` list, the Phase 12a discipline is satisfied as part of Phase 13a artifact class 1 drafting itself; the checklist and the CF record converge in the same artifact. Drafting produces five artifact classes:

1. **New CF Record(s)** matching `templates/canon-fact-record.yaml`. The `source_basis.direct_user_approval` flag is a logical gate: it must NOT be `true` in any file on disk until the user has explicitly approved the Phase 15a deliverable summary. In practice: if drafts are persisted to disk before approval (e.g., scratch files, preview commits), set `direct_user_approval: false`; if the CF is assembled only in working memory and written once at Phase 15a after approval, setting `true` in that single atomic write is compliant. What is forbidden is persisting a CF with `true` to any file (especially `CANON_LEDGER.md`) before the HARD-GATE has been released. Repair-splits produce multiple records linked via `source_basis.derived_from`.

2. **Modifications to Existing CF Records** (when Phase 8 / Phase 9 require qualifying or extending an existing CF rather than appending a new one):
   - Edit the existing YAML record in place. Update affected fields (statement, distribution, costs_and_limits, visible_consequences, contradiction_risk) to reflect the qualification.
   - Append a standardized line to the modified CF's `notes` field, in the form: `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): <one-sentence summary of the qualification and its rationale>.` Use the new CF's id (the one that prompted the modification) inside the parentheses.
   - Optionally, if richer modification trace is desired, populate the optional `modification_history` array (see template).
   - YAML CF records do NOT carry `<!-- added by CF-NNNN -->` HTML-comment attribution — that syntax is invalid inside YAML and is reserved for markdown prose patches in domain files (see artifact 4 below).

3. **Change Log Entry** matching `templates/change-log-entry.yaml`. `change_id: CH-NNNN`. `affected_fact_ids` lists every CF id touched (new + modified); document each id's role (added / qualified / extended) in the `summary` and `notes` fields. `downstream_updates` lists every Phase 12a checklist file. `change_type` is `addition` for any change whose dominant action is appending new CFs (even when paired with qualifications to existing CFs); use `*_retcon` only when the dominant action is modifying an existing CF's scope, cost, perspective, chronology, or ontology. `retcon_policy_checks` all true. Populate `latent_burdens_introduced` (see template) with one-line entries for every Phase 8 "Latent Burden" classification — these become the searchable trace of mandatory future lore work this change creates.

4. **Domain-file patches** — concrete prose edits to the files named in the Phase 12a discipline (whether carried as a dedicated checklist, per-artifact summary, or expanded `required_world_updates` list). Each markdown-prose addition or revision carries an inline `<!-- added by CF-NNNN -->` HTML-comment attribution. **Placement convention**: place the attribution comment at the START of the bullet, paragraph, table row, or section it introduces — not mid-sentence, not end-of-line. For new bullets in existing bullet lists, the attribution opens the bullet immediately after the list marker and whitespace. For new paragraphs inside existing prose blocks, the attribution opens the paragraph. For new sections (H2/H3 headings) inside an existing file, the attribution immediately precedes the heading on its own line. For tabular rows that already carry a prior-CF attribution, append the new attribution inside the existing comment block in chronological order (e.g., `<!-- added by CF-0025; annotated by CF-0031 -->`) rather than adding a second comment to the same row. The attribution applies to markdown prose only; YAML CF modifications use the `notes`-field convention from artifact 2 above.

5. **Adjudication record** at `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md` — original proposal + full Phase 0–11 analysis + verdict + phase-cited justifications + declined repair options + (if escalation fired) six critic sub-agent reports verbatim. Populate the Discovery section at the top of the report (see `templates/adjudication-report.md`) with the lists of `mystery_reserve_touched`, `invariants_touched`, and `cf_records_touched` — these enable future canon-addition runs to grep `worlds/<world-slug>/adjudications/*.md` for prior guidance on the same surfaces. Populate the Phase 14a Validation Checklist section (see template) before the verdict; this becomes the auditable record of validation pass/fail per test.

### Phase 14a: Validation and Rejection Tests

Run all 9 tests below and record each as PASS / FAIL with a one-line rationale into the adjudication record's "Phase 14a Validation Checklist" section (see `templates/adjudication-report.md`). The checklist becomes the auditable record of validation. Any FAIL halts and loops back to the originating phase; do NOT proceed to Phase 15a until every test records PASS.

1. New fact's `domains_affected` is non-empty (Rule 2).
2. New fact has populated `costs_and_limits` and `visible_consequences` (Rule 1). `prerequisites` is populated for `capability`, `artifact`, `technology`, `institution`, `ritual`, `event`, `craft`, and `resource_distribution` types whose manifestation has operational preconditions; it may be empty for `metaphysical_rule`, `belief`, `hazard`, `historical_process`, `text_tradition`, `local_anomaly`, `hidden_truth`, `species`, `law`, and `taboo` types whose truth-value has no operational precondition — but empty `prerequisites: []` must be accompanied either by an inline comment stating why (e.g., `# metaphysical rule; no operational precondition`) OR by an explicit `notes`-field sentence naming the type-based exemption. Existing ledger precedent for empty prerequisites includes CF-0002, CF-0003, CF-0005, CF-0014, CF-0016, CF-0022.
3. Any CF whose `scope.geographic` is non-`global` OR whose `scope.social` is non-`public` has populated `distribution.why_not_universal` with at least one concrete stabilizer (Rule 4). The test applies regardless of `type` — capability, artifact, institution, law, ritual, technology, craft, resource_distribution, event, hazard, species, taboo, text_tradition, historical_process, belief, and metaphysical_rule are all subject to it when scope is regional / local / restricted_group / elite / secret / rumor. Rule 4 concerns scope, not category; type-based exemption is not available. A fact with `scope.geographic: global` AND `scope.social: public` may leave `why_not_universal` empty, but an explicit `notes`-field sentence or inline comment confirming "universal by stated scope" is recommended.
4. Phase 6 second- and third-order consequences appear either in the CF record's `visible_consequences` list OR in at least one Phase 13a patch targeting a file named in `required_world_updates` (Rule 5). A consequence merely implied by a filename in `required_world_updates` without a corresponding drafted patch does NOT satisfy this test; the consequence must be expressed in prose that will reach the working tree at Phase 15a.
5. Change Log Entry `retcon_policy_checks` are all true (Rule 6).
6. Phase 10 flagged no forbidden-answer collision, OR every flagged collision was repaired in Phase 9 (Rule 7).
7. Every file in `required_world_updates` has a corresponding one-sentence summary somewhere in the accept-branch artifacts (dedicated Phase 12a checklist block, Phase 15a per-artifact summary, or expanded `required_world_updates` list — see Phase 12a) AND a concrete Phase 13a patch. Test 7 passes when BOTH conjuncts are satisfied; a file with a checklist entry but no patch fails Test 7 equally as a file with a patch but no described summary.
8. Every stated stabilizer (Phase 7) names a concrete mechanism; no hand-waves.
9. Verdict reasoning cites specific phase findings; vague verdicts fail.

Recording format per test (one row of the checklist section):

```
- Test N (Rule R / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL. The recorded checklist is what the user reads at Phase 15a HARD-GATE; absent or undocumented validation breaks the audit trail.

### Phase 15a: Commit (accept branch)

Present the deliverable summary to the user:
1. Verdict + phase-cited justification
2. CF Record summary (id, title, status, scope, domains, key consequences, key stabilizers)
3. Change Log Entry summary (id, change type, affected fact ids, downstream updates, retcon policy checks)
4. One-paragraph summary of each domain-file patch
5. Repair options considered and why the chosen repair won (if Phase 9 fired)
6. Critic synthesis summary (if escalation gate fired)
7. Adjudication record filename

**Large-change two-tier presentation**: For large deliveries (>3 new CFs OR >7 downstream files OR escalation gate fired), present a two-tier summary:

- **Tier 1 (overview)**: verdict + phase-cited justification + totals (new CFs, qualified CFs, downstream files, new Mystery Reserve entries, latent burdens introduced) + the three-to-five most load-bearing Phase 9 tradeoffs. Enough for an informed approve / revise / reject decision on its own.
- **Tier 2 (per-artifact detail)**: the full 7-item list above, rendered per artifact. Presented immediately if the user asks for it, or if the Tier 1 overview leaves material ambiguity (e.g., a load-bearing firewall is named but not explained).

**Combined-response form is allowed at the large-change threshold.** When the large-change trigger fires, the operator may present Tier 1 and Tier 2 in a single response (both sections labeled and visible) OR may present Tier 1 first and defer Tier 2 until the user asks. Prefer the combined form when Tier 1 relies on Tier 2 content for material context (e.g., the 3–5 most load-bearing Phase 9 tradeoffs are hard to describe without naming the affected artifacts). Prefer deferred Tier 2 when Tier 1 is self-contained and the user is likely to approve on overview alone. Either form satisfies the HARD-GATE requirement that the user receive enough information to make an informed approve / revise / reject decision.

For smaller deliveries, Tier 1 and Tier 2 collapse into a single summary matching the 7-item list above — no staging needed.

**HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve, (b) request specific revisions (loop back to named phase), (c) reject and convert to non-accept branch.

On approval, write the deliverable in this order — sequencing matters because the tool environment cannot guarantee true transactional atomicity, and a deterministic order makes partial-state recovery tractable:

1. **Domain-file patches first**. Apply every Phase 13a patch to its target file. Each markdown-prose addition or revision carries its inline `<!-- added by CF-NNNN -->` HTML-comment attribution. (HTML-comment attribution applies only to markdown prose; YAML CF modifications use the `notes`-field convention from Phase 13a.)
2. **Adjudication record next**. Write `worlds/<world-slug>/adjudications/PA-NNNN-<verdict>.md`, including the populated Discovery section and Phase 14a Validation Checklist.
3. **CANON_LEDGER.md last**. Within this file, apply the three sub-steps in strict order — this makes partial-failure detection tractable, because an interrupted run at any sub-step leaves the ledger in a predictable state:
   1. **CF qualifications first** — apply all in-place YAML edits with `notes`-field modification trace and `modification_history` entries. Completing this sub-step before appending new CFs means an interrupted run has consistent qualifications without unresolved new CFs referencing them.
   2. **Append new CF record(s)** — to the CFs section, before the `## Change Log` header. Set each new CF's `source_basis.direct_user_approval: true` immediately before these appends — this is the moment of canon mutation, and the flag must reflect that the user has approved the deliverable.
   3. **Append the Change Log Entry last** — at the tail of the change log section. The newest change entry is always the last YAML block in the file, which makes grep-and-tail discovery of "what changed most recently" a one-liner for future canon-addition runs.

The "ledger-last" sequencing means a partial-failure state has domain-file edits + an adjudication record but no canon-ledger commit — easy to detect (the new CF id is missing from `CANON_LEDGER.md`) and easy to roll back (revert the domain files; delete the orphan adjudication). The inverse — canon record without supporting consequence web — would silently fail Rule 5 and be much harder to detect.

Report all written paths. Do NOT commit to git.

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
- **Rule 4: No Globalization by Accident** — Phase 1 (Scope Detection) + Phase 14a (rejection test: any fact with non-global geographic scope OR non-public social scope must specify `distribution.why_not_universal` with at least one concrete stabilizer, regardless of `type`).
- **Rule 5: No Consequence Evasion** — Phase 6 (three-layer propagation) + Phase 14a (rejection test: 2nd/3rd-order consequences must appear in the CF record's `visible_consequences` OR in at least one Phase 13a patch targeting a file named in `required_world_updates`; a filename alone without a drafted patch does not satisfy).
- **Rule 6: No Silent Retcons** — Phase 13a (Change Log Entry + CF modification `notes`-field trace) + Phase 14a (`retcon_policy_checks` all true) + Phase 15a (inline `<!-- added by CF-NNNN -->` attribution on markdown prose; `notes`-field convention on YAML CF modifications).
- **Rule 7: Preserve Mystery Deliberately** — Phase 2 (`MYSTERY_RESERVE.md` loaded; forbidden-answer collisions detected) + Phase 10 (trivialization flagged) + Phase 14a (unrepaired collision halts).

## Record Schemas

- **Canon Fact Record** → `templates/canon-fact-record.yaml` (same schema as create-base-world; FOUNDATIONS §Canon Fact Record Schema).
- **Change Log Entry** → `templates/change-log-entry.yaml` (same schema as create-base-world; FOUNDATIONS §Change Control Policy).
- **Adjudication Report** → `templates/adjudication-report.md` (original to this skill). Named sections: `# Discovery` (top-of-file index for grep-searchability), `# Proposal`, `# Phase 0–11 Analysis`, `# Phase 14a Validation Checklist`, `# Verdict`, `# Justification`, `# Critic Reports` (if escalation fired), `# Resubmission Menu` (for REVISE) OR `# Why This Cannot Be Repaired` (for REJECT).
- **Critic Prompt** → `templates/critic-prompt.md` (used at Escalation Gate when dispatching the six parallel sub-agents).
- **Critic Report Format** → `templates/critic-report-format.md` (specifies the required report structure each critic returns).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | FOUNDATIONS.md + 6 mandatory world files loaded before any phase; domain files loaded selectively per Phase 0 classification |
| Canon Layers §Hard / Soft / Contested | Phase 11 | Verdict determines CF `status`: ACCEPT→hard_canon; ACCEPT_AS_LOCAL_EXCEPTION→soft_canon; ACCEPT_AS_CONTESTED_BELIEF→contested_canon |
| Canon Layers §Mystery Reserve | Phase 9 | Repair pass may move fact *into* `MYSTERY_RESERVE.md` rather than open canon; OR may create a *new* MR entry to hold a bounded unknown the proposal manufactures (Rule 7) |
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
