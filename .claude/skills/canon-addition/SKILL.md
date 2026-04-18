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
- Domain-file edits to every file in `required_world_updates` — prose additions and targeted revisions, each carrying an inline `<!-- added by CF-NNNN -->` attribution (markdown prose only; YAML CF modifications use the `notes`-field convention — see Phase 13a artifact 2).
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

1. **Pre-flight Check.** Verify `worlds/<world-slug>/` exists; if absent, abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`." Verify all six mandatory world files are readable; if any is missing or unreadable, abort naming the specific file. Load `docs/FOUNDATIONS.md` and the six mandatory world files. Scan `CANON_LEDGER.md` for the highest existing `CF-NNNN` and `CH-NNNN`; allocate `next_cf_id` and `next_ch_id`. Scan `worlds/<world-slug>/adjudications/*.md` (if the directory exists) for the highest existing `PA-NNNN`; allocate `next_pa_id` (or `PA-0001` if absent).

    **Large-ledger method**: mature worlds accumulate ledgers that exceed the Read tool's default token budget (≥1500 lines is a practical threshold, though the tool's exact cap varies). When the ledger is large, do NOT attempt a full-file read for ID allocation. Instead, use `Grep` with `-n` on the patterns `^id: CF-\d+` and `^change_id: CH-\d+` to enumerate every id and its line offset in a single call per pattern; take the highest numeric suffix as the scan result. When subsequent phases need the text of specific CF records (e.g., the records named in the proposal's `derived_from` list), use targeted `Read offset/limit` calls anchored at the grepped line offsets rather than full-file reads. Apply the same grep-then-targeted-read pattern to `adjudications/*.md` scanning when that directory has grown beyond readability. On small worlds, full-file reads remain acceptable; the grep method is the canonical large-ledger fallback, not the default.

    Load the skill's own templates into working context: `templates/canon-fact-record.yaml`, `templates/change-log-entry.yaml`, `templates/adjudication-report.md`. Also load `templates/critic-prompt.md` and `templates/critic-report-format.md` when escalation is likely (>3 domains named in the proposal, user-stated novelty level is high, or the proposal's underlying world-change touches an invariant). Loading templates upfront avoids mid-flow template reads and keeps the reference schema visible during drafting. If escalation turns out not to fire, the critic templates remain unused — cost is a single extra read.

2. **Phase 0: Normalize the Proposal.** Load `references/proposal-normalization.md`. Parse `proposal_path` if provided, otherwise interview the user; classify fact type(s) per the mapping and tie-break rubric in the reference; selectively load additional domain files based on the classification.

3. **Phases 1-6: Scope, Invariants, Capability, Prerequisites, Diffusion, Consequence Propagation.** Load `references/consequence-analysis.md`. Execute Phases 1 through 6 in order, ending with the Escalation Gate evaluation. If any escalation trigger fires (invariant revision required, >3 of 13 domains touched, or new invariant-level rule introduced), dispatch the six parallel critic sub-agents per the reference and produce Phase 6b multi-critic synthesis before Phase 7.

4. **Phases 7-11: Counterfactual, Contradiction, Repair, Narrative Fit, Adjudication.** Load `references/counterfactual-and-verdict.md`. Execute Phases 7 through 10, then synthesize the Phase 11 verdict from Phases 0-10 findings. The verdict must cite specific phase findings.

5. **Branch on verdict.**
   - **Accept outcomes** (ACCEPT / ACCEPT_WITH_REQUIRED_UPDATES / ACCEPT_AS_LOCAL_EXCEPTION / ACCEPT_AS_CONTESTED_BELIEF): load `references/accept-path.md` and execute Phases 12a → 13a → 14a → 15a. The HARD-GATE at the top of this file fires at Phase 15a: no write happens until the user explicitly approves the deliverable summary.
   - **Non-accept outcomes** (REVISE_AND_RESUBMIT / REJECT): load `references/non-accept-path.md` and execute Phases 12b → 13b → 14b. The HARD-GATE fires at Phase 14b: no write happens until the user approves.

## Record Schemas

- **Canon Fact Record** → `templates/canon-fact-record.yaml` (same schema as create-base-world; FOUNDATIONS §Canon Fact Record Schema).
- **Change Log Entry** → `templates/change-log-entry.yaml` (same schema as create-base-world; FOUNDATIONS §Change Control Policy).
- **Adjudication Report** → `templates/adjudication-report.md` (original to this skill). Named sections: `# Discovery` (top-of-file index for grep-searchability), `# Proposal`, `# Phase 0–11 Analysis`, `# Phase 14a Validation Checklist`, `# Verdict`, `# Justification`, `# Critic Reports` (if escalation fired), `# Resubmission Menu` (for REVISE) OR `# Why This Cannot Be Repaired` (for REJECT).
- **Critic Prompt** → `templates/critic-prompt.md` (used at Escalation Gate when dispatching the six parallel sub-agents).
- **Critic Report Format** → `templates/critic-report-format.md` (specifies the required report structure each critic returns).

## FOUNDATIONS Alignment and Validation Rules

Load `references/foundations-and-rules-alignment.md` for the full Rule-1-through-7 → phase mapping and the FOUNDATIONS principle → phase → mechanism table.

## Guardrails

Load `references/guardrails.md` for the operational constraints this skill respects on every invocation (single-world scope, forbidden writes, CF-id collision handling, additive-only patch rule, sub-agent dispatch constraints, HARD-GATE absoluteness, no-git-commit, worktree discipline, no-diegetic-artifact rule).

## Final Rule

A canon fact is not added until it has a scope, a consequence web, a visible ordinary-life signature, a stated stabilizer against universalization, an attribution trail in every file it touches, and a change log entry the world can be audited against — and once added, the ledger is append-only; the only way to change an accepted fact is another run of this skill that produces an explicit retcon entry.
