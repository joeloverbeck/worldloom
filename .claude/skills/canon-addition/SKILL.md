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
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists and all mandatory world files are readable. This skill *extends* existing canon; overwrites are rejected. Pre-flight normalizes the input: if the argument begins with `worlds/`, the prefix is stripped so both `animalia` and `worlds/animalia` resolve identically.

### Optional
- `proposal_path` — filesystem path — markdown brief containing the proposed canon fact. Two input shapes are supported: (1) **new-fact proposal** — optionally carries user intention, desired dramatic purpose, novelty level, preferred scope, desired rarity, implied access pattern, user-stated constraints, and revision appetite; (2) **retcon-proposal card** — emitted by the `continuity-audit` skill per `continuity-audit/templates/retcon-proposal-card.md`, carrying retcon-specific frontmatter (`retcon_type: A | B | C | D`, `target_cf_ids`, `severity_before_fix`, `severity_after_fix`, `audit_origin`, `finding_id`). Phase 0 classifies which shape is present and routes accordingly — see `proposal-normalization.md` §Retcon-Proposal Inputs. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

**Accept branch** (ACCEPT / ACCEPT_WITH_REQUIRED_UPDATES / ACCEPT_AS_LOCAL_EXCEPTION / ACCEPT_AS_CONTESTED_BELIEF):
- New Canon Fact Record(s) appended to `worlds/<world-slug>/CANON_LEDGER.md` — one per accepted fact, matching `templates/canon-fact-record.yaml`. `ACCEPT_AS_LOCAL_EXCEPTION` → `status: soft_canon`; `ACCEPT_AS_CONTESTED_BELIEF` → `status: contested_canon`. **Clarificatory retcons** (`change_type: clarification`, typically `retcon_type: A` — see `proposal-normalization.md` §Retcon-Proposal Inputs) produce no new CF; this artifact is skipped and the verdict still takes the `ACCEPT_WITH_REQUIRED_UPDATES` form when domain-file patches are required. See `accept-path.md` §Clarificatory-Retcon Variant for the full variant flow.
- New Change Log Entry appended to the change log section of `CANON_LEDGER.md`, matching `templates/change-log-entry.yaml`, linking to new CF ids (or to `affected_fact_ids` naming qualified CFs for clarificatory retcons).
- Domain-file edits to every file in `required_world_updates` — prose additions and targeted revisions, each carrying an inline `<!-- added by CF-NNNN -->` attribution for new-fact accepts OR `<!-- clarified by CH-NNNN -->` for clarificatory retcons (markdown prose only; YAML CF modifications use the `notes`-field convention — see Phase 13a artifact 2).
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

## Procedure

**Reference and template load discipline (mandatory).** Each "Load `references/X.md`" and "Load the skill's own templates" instruction below is a gate, not a hint. The reference files carry load-bearing specifics NOT fully replicated in SKILL.md — examples: `proposal-normalization.md` carries the CF-id reference verification rule, the fact-type tie-break rubric, and the composite-facts primary-type convention; `accept-path.md` carries the Mystery Reserve extension canonical form block template, the domain-file patch attribution placement convention, and the Phase 12a placement-flexibility (a/b/c) discipline. The templates carry schema specifics — notably `templates/adjudication-report.md` defines the Discovery-section canonical field names (`mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, `change_id`) that future canon-addition runs grep to locate prior adjudications on the same surfaces. Skipping a Load instruction and relying on pattern-precedent from existing ledger records is skill non-compliance: drift is invisible at runtime and only surfaces when a future run fails to grep-find a prior adjudication whose Discovery fields were invented rather than canonical. When reading a referenced file is genuinely redundant for the current phase (e.g., proposal-normalization when the current invocation already skipped Phase 0's interview fork because `proposal_path` is thin-but-parseable), the main agent states that reasoning explicitly in working text before advancing — the audit trail must record deliberate-skip vs silent-skip.

1. **Pre-flight Check.** **Normalize the `world_slug` input first**: if the argument begins with `worlds/`, strip the prefix so both `animalia` and `worlds/animalia` resolve identically. Validate that the normalized slug matches `[a-z0-9-]+` before proceeding; if not, abort naming the malformed input. Then verify `worlds/<world-slug>/` exists; if absent, abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`." Verify all six mandatory world files are readable; if any is missing or unreadable, abort naming the specific file. Load `docs/FOUNDATIONS.md` and the six mandatory world files. Scan `CANON_LEDGER.md` for the highest existing `CF-NNNN` and `CH-NNNN`; allocate `next_cf_id` and `next_ch_id`. Scan `worlds/<world-slug>/adjudications/*.md` (if the directory exists) for the highest existing `PA-NNNN`; allocate `next_pa_id` (or `PA-0001` if absent).

    **Large-file method**: mature worlds accumulate not only ledgers but also any domain file whose accumulated annotations push it past the Read tool's default token budget. Line count is a weak proxy (≥1500 lines is a practical threshold for `CANON_LEDGER.md`, but files with very dense lines may exceed budget at much lower line counts — `INSTITUTIONS.md` at ~260 dense lines, `MYSTERY_RESERVE.md` and `EVERYDAY_LIFE.md` at ~300+ lines have all exceeded budget on the Animalia ledger); rely on the actual Read failure as the trigger. The same grep-then-targeted-read pattern applies across the file class: where a full-file read would fail or waste budget, use `Grep -n` on a structural anchor pattern appropriate to the file, then issue targeted `Read offset/limit` calls anchored at the grepped offsets rather than full-file reads. Anchor patterns by file:

    - `CANON_LEDGER.md` — `^id: CF-\d+` and `^change_id: CH-\d+` for ID enumeration; targeted reads anchored at line offsets when subsequent phases need specific CF records (e.g., records named in the proposal's `derived_from` list, or CFs identified by the Phase 12a modification_history scan).
    - `adjudications/*.md` — file-listing the directory (Glob or `ls`) for PA-id allocation when the directory has grown beyond per-file readability; targeted reads of specific PA records when prior adjudications on the same surface are relevant (grep-discoverable via the Discovery section's canonical fields — `mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, `change_id`).
    - `MYSTERY_RESERVE.md` — `^## M-` for entry enumeration; targeted reads when checking forbidden-answer collisions (Phase 2) or drafting firewall extensions for specific M-N entries (Phase 9 / Phase 13a).
    - `INSTITUTIONS.md` — `^## ` for top-level section enumeration (Family/Household, Law/Custom/Judgment, Religion, Landholding, Military/Defense, Trade/Guilds, Healing/Medicine, Burial, Education/Apprenticeship, Recordkeeping); targeted reads of sections named in the fact-type → file mapping (per World-State Prerequisites selective-loading examples).
    - `EVERYDAY_LIFE.md` — `^## ` for regional subsection enumeration (`(a)` Heartland, `(b)` Estate, `(c)` Highland, `(d)` Drylands, `(e)` Fenlands); targeted reads of subsections relevant to the proposal's geographic scope.
    - `ECONOMY_AND_RESOURCES.md` — `^## ` for section enumeration (Currency, Wage Spreads, Scarcity Map, Trade Flows, Value Stores, Wealth Creation, Inequality Patterns, Breakage Points, Specialist Resources); targeted reads of sections affected by the proposal.
    - `OPEN_QUESTIONS.md` — `^## ` for entry enumeration; targeted reads of items pressured by the proposal (Phase 2 / Phase 10).
    - `TIMELINE.md` / `GEOGRAPHY.md` / `PEOPLES_AND_SPECIES.md` / `WORLD_KERNEL.md` / `INVARIANTS.md` / `ONTOLOGY.md` — `^## ` (or `^### ` for nested sections) when these files cross the threshold; the structural-anchor approach is general.

    On small worlds, full-file reads remain acceptable; the grep-then-targeted-read method is the canonical large-file fallback, not the default. The pattern was first documented here for the ledger and has since been adopted by sibling skills — `continuity-audit/SKILL.md` §Pre-flight ("Large-file method"; explicitly cites canon-addition as origin) and `diegetic-artifact-generation/references/preflight-and-prerequisites.md` §Reading mature world files. The three skills should be kept aligned on the convention; future canon-addition runs that discover additional anchor patterns for new file shapes should update this section so siblings can mirror.

    Load the skill's own templates into working context: `templates/canon-fact-record.yaml`, `templates/change-log-entry.yaml`, `templates/adjudication-report.md`. Also load `templates/critic-prompt.md` and `templates/critic-report-format.md` when escalation is likely (>3 domains named in the proposal, user-stated novelty level is high, or the proposal's underlying world-change touches an invariant). Loading templates upfront avoids mid-flow template reads and keeps the reference schema visible during drafting. If escalation turns out not to fire, the critic templates remain unused — cost is a single extra read.

2. **Phase 0: Normalize the Proposal.** Load `references/proposal-normalization.md`. Parse `proposal_path` if provided, otherwise interview the user; classify fact type(s) per the mapping and tie-break rubric in the reference; selectively load additional domain files based on the classification.

    **Proposal self-assessment is advisory, not authoritative.** Many proposals (especially those generated by `propose-new-canon-facts`) include a `canon_safety_check` or equivalent frontmatter block listing invariants-respected and mystery-reserve firewall status. Treat these lists as input to Phase 2 (invariant check) and Phase 6b Mystery Curator (when escalation fires), NOT as findings. The skill's independent verification MAY override the proposal's self-assessment — and in practice frequently does for Mystery Reserve firewalls, where proposal-side self-checks tend toward optimism.

3. **Phases 1-6: Scope, Invariants, Capability, Prerequisites, Diffusion, Consequence Propagation.** Load `references/consequence-analysis.md`. Execute Phases 1 through 6 in order, ending with the Escalation Gate evaluation. If any escalation trigger fires (invariant revision required, >3 of 13 domains touched, or new invariant-level rule introduced), dispatch the six parallel critic sub-agents per the reference and produce Phase 6b multi-critic synthesis before Phase 7.

    **Critic-prompt construction.** `templates/critic-prompt.md` provides the shared structure (Common Preamble + Your Specific Concern + Reference Files + Output Contract) and six per-role briefs (one each for Continuity Archivist, Systems/Economy, Politics/Institution, Everyday-Life, Theme/Tone, Mystery Curator) that supply per-role `{ROLE_FOCUS}`, `{ROLE_CONCERNS}`, and `{ROLE_FILES}` values. The main agent composes six concrete prompts by substituting those placeholders with per-role content plus `{PROPOSAL_TEXT}` and `{PHASE_0_6_OUTPUTS}` (the Phase 0–6 analysis summary, verbatim or condensed), then dispatches each via the Agent tool in parallel (one `Agent` invocation per critic). Do NOT render the template as a single literal document and pass it to all six critics; each critic receives a per-role-substituted prompt. The template's Output Contract section specifies the report format each critic must return (per `templates/critic-report-format.md`).

4. **Phases 7-11: Counterfactual, Contradiction, Repair, Narrative Fit, Adjudication.** Load `references/counterfactual-and-verdict.md`. Execute Phases 7 through 10, then synthesize the Phase 11 verdict from Phases 0-10 findings. The verdict must cite specific phase findings.

5. **Branch on verdict.**
   - **Accept outcomes** (ACCEPT / ACCEPT_WITH_REQUIRED_UPDATES / ACCEPT_AS_LOCAL_EXCEPTION / ACCEPT_AS_CONTESTED_BELIEF): load `references/accept-path.md` and execute Phases 12a → 13a → 14a → 15a. **Clarificatory-retcon routing**: when the Phase 0 classification (per `proposal-normalization.md` §Retcon-Proposal Inputs) identified the proposal as `retcon_type: A` (Clarificatory) — i.e., no new CF is created, only domain-file patches and `modification_history` qualifications on existing CFs — follow the Clarificatory-Retcon Variant section in `accept-path.md` alongside the main Phase 12a-15a flow. The variant adapts Phase 13a artifact 1 (skipped), Phase 14a test applicability (tests 1/2/3/8 are N/A-adapted), and Phase 15a sub-step 3.ii (skipped when no new CF). The main flow (domain-file patches, adjudication record, Change Log Entry, Phase 12a modification_history scan) still applies. Two sub-disciplines are load-bearing and therefore inlined here rather than left to the reference:
     - **Phase 12a modification_history scan (mandatory)**: enumerate CFs requiring modification_history entries along three axes — (a) every CF in the proposal's `derived_from_cfs`; (b) every CF named in Phase 8 soft-contradiction findings; (c) every CF whose stabilizer, scope, consequence, or standing role is substantively extended by the new CF per Phase 9 repairs. Missing this scan produces silent qualification gaps; a CF that should have received a modification_history entry but didn't is a Rule 6 (No Silent Retcons) violation even when the underlying prose change was correctly attributed.

        **Pre-scan verification for axis (a) (mandatory)**: before axis (a) consumes `derived_from_cfs`, verify each entry names a genuine parent — the new CF semantically EXTENDS, NARROWS, or is a REPAIR-SPLIT of that parent. Mere conceptual adjacency (same domain, shared vocabulary, reference to the parent's territory without extending its content) does NOT qualify as derivation. A spurious `derived_from` entry propagates into `affected_fact_ids` on the Change Log Entry and forces a mod_history entry on a CF that isn't actually being modified, producing "cross-reference annotation only" entries that cost audit-trail clarity. Remove unqualified entries from `derived_from` before axis (a) runs; capture genuine-but-non-derivational relationships (shared vocabulary, adjacent territory, parallel phenomena) in the new CF's `notes` field instead.

        **Threshold for axis (c) "substantively extended"**: a CF qualifies under axis (c) when the new CF ADDS content to the existing CF — a new scope clause, stabilizer mechanism, visible consequence, cost form, firewall clause, or qualification to standing role. Cross-references that merely acknowledge the existing CF's territory without adding content to it do NOT qualify as substantive extensions and do NOT receive `modification_history` entries; their relationship is captured in the new CF's `derived_from` (when genuine per the pre-scan verification above) or in cross-cutting notes elsewhere in the deliverable. This threshold prevents mod_history noise from borderline-adjacency CFs.

        **Worked example** (cross-reference vs substantive extension at the firewall-clause boundary — exemplar from CH-0010 / CF-0036 adjudication):

        - *Cross-reference only (no modification_history)*: CF-0036 notes mention CF-0032's existing "older bloods" firewall to acknowledge that supremacist doctrine's cross-cluster rhetorical exploitation of Cluster C "older bloods" sectarian framing does NOT cross-validate. The firewall language lives in CF-0036's own notes — it acknowledges CF-0032's existing content without ADDING anything to CF-0032's record. CF-0032's standing role is unchanged; a future reader of CF-0032 alone does not need to know CF-0036 exists to read CF-0032 correctly. → Cross-reference only; CF-0032 does NOT receive `modification_history`.
        - *Substantive extension (modification_history required)*: CF-0035 carnivore-folk progenitor-cult trophy-taboo (CH-0009 PEOPLES extension) and CF-0036 supremacist-cannibal doctrine are inverse-valence sectarian registers within the same carnivore-folk progenitor-cult surface territory. CF-0036 ADDS a new firewall constraint on how CF-0035 may be read — the two must NOT be conflated as ends of a single spectrum. This is a new firewall clause constraining CF-0035's future readings. A future reader of CF-0035 alone DOES need to know about this constraint to avoid the category error. → Substantive extension; CF-0035 receives `modification_history`.
        - *Decision test*: after the new CF exists, does a future reader of the existing CF alone need to know about the relationship to read the existing CF correctly? If YES → substantive extension (`modification_history` required). If NO → cross-reference only (captured in the new CF's notes, not in the existing CF's `modification_history`).

        **Clarificatory-retcon variant of the decision test (no new CF):** when the scan runs for a clarificatory retcon (`change_type: clarification`, typically `retcon_type: A` — see `accept-path.md` §Clarificatory-Retcon Variant), there is no "new CF" to compare against. The axis-(c) framing shifts from "does the new CF ADD content to the existing CF?" to "does the correction change how a future reader should interpret the target CF's domain-file annotations?" A target CF receives `modification_history` when the correction propagates into the reader's understanding of that CF's domain-file text — e.g., a count-accuracy correction inside a domain-file patch the target CF originally generated, an enumeration extension in such a patch, or an ordinal adjustment cascading from an inherited drift the target CF inherited. Typos and cosmetic fixes with no semantic shift do NOT qualify. Under the clarificatory variant the target CF is almost always the CF(s) whose domain-file patches are being corrected — confirmed by axis (a) (`derived_from` naming the target CFs) and axis (b) (Phase 8 contradictions located in the target CFs' annotations). The three axes converge on the same CF set for well-scoped clarificatory retcons.
     - **Phase 15a CANON_LEDGER.md sub-step order (load-bearing; partial-failure recovery semantics)**: write domain-file patches first, then the adjudication record, then `CANON_LEDGER.md` last. Within `CANON_LEDGER.md`, apply three sub-steps in strict order: (i) apply in-place CF qualifications (notes-field modification trace and `modification_history` entries) on every CF identified by the Phase 12a scan; (ii) append new CF record(s) to the CFs section, before the `## Change Log` header; (iii) append the Change Log Entry last at the tail of the change log section. This order means an interrupted run between (i) and (ii) leaves qualifications consistent without unresolved new-CF references; the inverse ordering (appending the new CF first, qualifying later) produces harder-to-detect inconsistency where a new CF references modifications that don't yet exist on the CFs it names.
     - **Phase 15a deliverable-summary scale discipline**: large canon additions (≥6 required_world_updates files OR ≥4 modification_history entries OR ≥3 new Mystery Reserve entries) produce deliverable summaries whose full-inline form runs dozens of screens. Present such deliveries in thematic chunks rather than as a single monolithic block, in this order: (1) verdict and phase-cited justification; (2) the new CF record (full YAML) and the Change Log Entry (full YAML) — the primary canon artifacts; (3) modification_history entries on existing CFs (summarized per CF with one-line change summary; full YAML text available on request); (4) domain-file patches summarized per file with a one-sentence description of what each patch adds (full prose text available on request); (5) Mystery Reserve firewall extensions and new MR entries summarized per entry; (6) adjudication record file path (the report itself lives on disk, reviewable independently). The HARD-GATE still fires on a SINGLE approval moment covering the entire deliverable — chunking is for review legibility, not for incremental approval. If the user requests full text of any chunk before approving, present it and re-prompt for approval on the whole. Reserve the monolithic-inline form for small deliveries (<6 files, <4 mod_history, <3 new MR entries) where chunking adds more friction than it saves.
     - The HARD-GATE at the top of this file fires at Phase 15a: no write happens until the user explicitly approves the deliverable summary.
   - **Non-accept outcomes** (REVISE_AND_RESUBMIT / REJECT): load `references/non-accept-path.md` and execute Phases 12b → 13b → 14b. The HARD-GATE fires at Phase 14b: no write happens until the user approves.

## Record Schemas

- **Canon Fact Record** → `templates/canon-fact-record.yaml` (same schema as create-base-world; FOUNDATIONS §Canon Fact Record Schema).
- **Change Log Entry** → `templates/change-log-entry.yaml` (same schema as create-base-world; FOUNDATIONS §Change Control Policy).
- **Adjudication Report** → `templates/adjudication-report.md` (original to this skill). Named sections: `# Discovery` (top-of-file index for grep-searchability), `# Proposal`, `# Phase 0–11 Analysis`, `# Phase 14a Validation Checklist`, `# Verdict`, `# Justification`, `# Critic Reports` (if escalation fired), `# New Canon Fact Records` (accept only — per-CF summary), `# Change Log Entry` (accept only — CH-id and affected_fact_ids summary), `# Required World Updates Applied` (accept only — one-paragraph-per-file patch summary), `# Resubmission Menu` (for REVISE) OR `# Why This Cannot Be Repaired` (for REJECT).

    **Discovery-section canonical fields (load-bearing — future canon-addition runs grep adjudications by these exact names).** Populate the Discovery block with the following five fields, using these literal names (underscored, no variation): `mystery_reserve_touched` (list of M-N ids), `invariants_touched` (list of invariant ids — ONT-N, CAU-N, DIS-N, SOC-N, AES-N), `cf_records_touched` (list of CF-NNNN ids — new + modified), `open_questions_touched` (list of OPEN_QUESTIONS.md sections committed or newly added), `change_id` (the CH-NNNN id this adjudication produced, accept branches only). Ad-hoc field names (e.g., `New CF`, `Modifications`, `Critics dispatched`) do NOT substitute — the purpose of the Discovery section is cross-adjudication grep discoverability, which breaks when field names drift. The template (`templates/adjudication-report.md`) is the authoritative source if it evolves; field additions there supersede this list.
- **Critic Prompt** → `templates/critic-prompt.md` (used at Escalation Gate when dispatching the six parallel sub-agents).
- **Critic Report Format** → `templates/critic-report-format.md` (specifies the required report structure each critic returns).

## Validation Tests (Phase 14a)

At Phase 14a, run all 9 tests below and record each as PASS or FAIL with a one-line rationale in the adjudication record's "Phase 14a Validation Checklist" section. A PASS without rationale is treated as FAIL. Any FAIL halts and loops back to the originating phase; Phase 15a (commit) is blocked until every test records PASS. Full rubric and test-language specifics in `references/accept-path.md` §Phase 14a.

1. **Domains populated (Rule 2)** — new fact's `domains_affected` is non-empty; labels drawn from the canonical enum plus established ledger extensions where possible.
2. **Fact structure complete (Rule 1)** — `costs_and_limits` and `visible_consequences` populated; `prerequisites` populated for operationally-conditioned types (`capability`, `artifact`, `technology`, `institution`, `ritual`, `event`, `craft`, `resource_distribution`); may be empty with inline justification for types whose truth-value has no operational precondition (`metaphysical_rule`, `belief`, `hazard`, `historical_process`, `text_tradition`, `local_anomaly`, `hidden_truth`, `species`, `law`, `taboo`).
3. **Stabilizers for non-universal scope (Rule 4)** — any CF with non-`global` geographic OR non-`public` social scope has `distribution.why_not_universal` populated with at least one concrete stabilizer.
4. **Consequences materialized (Rule 5)** — Phase 6 second- and third-order consequences appear either in the CF record's `visible_consequences` list OR in at least one Phase 13a patch targeting a `required_world_updates` file. A filename in `required_world_updates` without a corresponding drafted patch does NOT satisfy this test.
5. **Retcon policy observed (Rule 6)** — Change Log Entry `retcon_policy_checks` are all true.
6. **Mystery Reserve preserved (Rule 7)** — Phase 10 flagged no forbidden-answer collision, OR every flagged collision was repaired in Phase 9.
7. **Required updates enumerated AND patched** — every file in `required_world_updates` has a corresponding one-sentence summary somewhere in the accept-branch artifacts AND a concrete Phase 13a patch. Both conjuncts required.
8. **Stabilizer mechanisms named** — every stated Phase 7 stabilizer names a concrete mechanism; no hand-waves.
9. **Verdict cites phases** — verdict reasoning cites specific phase findings; vague verdicts fail.

## FOUNDATIONS Alignment and Validation Rules

Load `references/foundations-and-rules-alignment.md` for the full Rule-1-through-7 → phase mapping and the FOUNDATIONS principle → phase → mechanism table.

## Guardrails

Load `references/guardrails.md` for the operational constraints this skill respects on every invocation (single-world scope, forbidden writes, CF-id collision handling, additive-only patch rule, sub-agent dispatch constraints, HARD-GATE absoluteness, no-git-commit, worktree discipline, no-diegetic-artifact rule).

**Inherited-drift handling.** If a Phase 6b critic (typically Continuity Archivist) flags a pre-existing ledger inconsistency inherited from prior CFs — e.g., a counting drift where the ledger's prose says "three" but names four items, or a naming drift between parallel sections — resolve by counting/stating correctly in NEW prose only. Retroactive cleanup of pre-existing prose is out-of-scope for this skill and requires a separate retcon workflow. Log the inherited drift in the adjudication record's Justification or Critic Reports section to preserve the audit trail. Silently correcting old prose to match new prose violates Rule 6 (No Silent Retcons) even when the correction would be factually right; perpetuating old drift into new prose squanders the opportunity to count honestly.

## Final Rule

A canon fact is not added until it has a scope, a consequence web, a visible ordinary-life signature, a stated stabilizer against universalization, an attribution trail in every file it touches, and a change log entry the world can be audited against — and once added, the ledger is append-only; the only way to change an accepted fact is another run of this skill that produces an explicit retcon entry.
