---
name: continuity-audit
description: "Use when auditing an existing worldloom world's canon for contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, or diegetic leakage. Produces: a consolidated audit report at worlds/<world-slug>/audits/AU-NNNN-<date>.md, optional retcon-proposal cards at worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md (directly consumable as canon-addition's proposal_path), and an auto-updated audits/INDEX.md. Mutates: only worlds/<world-slug>/audits/ (never WORLD_KERNEL.md, INVARIANTS.md, CANON_LEDGER.md, or any other world-level canon file)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any of the 12 mandatory world files is unreadable, or if worlds/<world-slug>/characters/, diegetic-artifacts/, proposals/, or adjudications/ directory listings are unreadable when present."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: audit scope (`all` or a subset of categories 1-10); severity floor for retcon-card emission (integer 1-5, default 3); focus domain(s) (optional); audit trigger context (`post-canon-addition` / `pre-publication` / `periodic` / `user-suspected-contradiction`); optional `recent_canon_addition_cutoff` (a CH-NNNN id or ISO date bounding the change-log delta window). If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Continuity Audit

Audits an existing worldloom world for contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, and diegetic leakage — then writes a consolidated audit report and, for every finding at or above the configured severity floor, a retcon-proposal card whose path is directly consumable by `canon-addition`. This skill **proposes** retcons; it does not apply them. Canonization of any recommended retcon happens only through a separate `canon-addition` run on the emitted RP-NNNN card.

<HARD-GATE>
Do NOT write any file — audit report, retcon-proposal card, INDEX.md update — until: (a) pre-flight check confirms worlds/<world-slug>/ exists, all 12 mandatory world files are readable, and no AU-NNNN / RP-NNNN slug-collision would occur; (b) Phase 9 Self-Check Rejection Tests pass for every finding with zero unrepaired violations across finding-citation completeness, severity-justification presence, and repair-type conformance; (c) Phase 12 Validation and Rejection Tests pass with zero failures at both per-finding, per-retcon-card, and audit-level layers; (d) the user has explicitly approved the Phase 13 deliverable summary (full audit report body, every retcon card's full content, per-card Retcon Policy checklist, any Phase 9 repairs that fired, any findings or cards the user is dropping). The user's approval response may include a drop-list of finding-IDs AND/OR retcon-card-IDs to exclude from the write; dropped findings are never written and are recorded in the audit report's `dropped_finding_ids` / `dropped_card_ids` frontmatter fields. This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (resolve worlds/<world-slug>/; verify 12 mandatory
                  world files readable; verify characters/,
                  diegetic-artifacts/, proposals/, adjudications/
                  directory listings readable when present;
                  load FOUNDATIONS.md; scan audits/ for AU-NNNN collision;
                  allocate next AU-NNNN and reserve RP-NNNN range)
      |
      v
Phase 0: Normalize Audit Parameters (parse parameters_path OR interview;
          bind audit scope, severity floor, focus domains, trigger context,
          recent_canon_addition_cutoff)
      |
      v
Phase 1: Scope the Audit (map parameters to active categories 1-10;
          load required world files; record deferred categories + rationale)
      |
      v
Phase 2: Change Log Delta Analysis (enumerate CH-NNNN entries newer than
          cutoff OR full log if no cutoff; produce per-change risk profile:
          affected CFs, invariants touched, mystery-reserve interactions,
          required_world_updates status)
      |
      v
Phase 3: Continuity Lint Sweep (mechanical pass over the 10 lint questions
          from the proposal; each question produces zero or more candidate
          findings with cited CFs)
      |
      v
Phase 4: Audit Category Passes (one sub-pass per active category)
         4a: Ontological Contradictions       (vs INVARIANTS ontological)
         4b: Causal Contradictions            (vs INVARIANTS causal)
         4c: Distribution Contradictions      (Rule 4)
         4d: Timeline Contradictions          (vs TIMELINE)
         4e: Institutional Contradictions     (Rule 5 — missing reactions)
         4f: Everyday-Life Contradictions     (Rule 2 — cosmetic additions)
         4g: Tone / Identity Drift            (vs WORLD_KERNEL)
         4h: Mystery Corruption               (Rule 7 — overexposure / incoherence)
         4i: Diegetic Leakage                 (Rule 7 — knowledge impossible
                                               for the author; scans characters/
                                               and diegetic-artifacts/)
         4j: Local/Global Drift               (Rule 4 — local silently universal)
      |
      v
Phase 5: Severity Classification (assign 1-5 per finding per proposal's
          severity levels; record cited rationale)
      |
      v
Phase 6: Burden Debt Analysis (Rule 3 — scan accepted capabilities for
          post-acceptance consequence-free drift; cross-reference against
          recent change-log delta)
      |
      v
Phase 7: Repair Menu Application (for each finding ≥ severity floor,
          select lightest viable repair from the 8-item Repair Menu;
          classify resulting change as Retcon Type A-F)
      |
      v
Phase 8: Retcon Card Drafting (per repair requiring canon change, draft
          RP-NNNN-<slug>.md with frontmatter parallel to CF schema and
          a body naming: target CFs, proposed statement revision,
          retcon_type, severity_before/after, downstream_updates,
          Retcon Policy checklist)
      |
      v
Phase 9: Self-Check Rejection Tests (every finding has cited CF(s);
          every severity has rationale; every retcon card's retcon_type
          matches its repair operation; Retcon Policy checklist populated;
          no retcon creates >1 new contradiction)
      |
      v                             fail --> loop to responsible phase
Phase 10: Update Priority List (rank findings + proposed retcons by
          severity × domain-weight; bucket into now / next-batch / deferred)
      |
      v
Phase 11: Draft Audit Report (assemble AU-NNNN-<date>.md: frontmatter +
          change-log delta trace + per-category findings + burden debt
          trace + Update Priority List + Retcon Proposals index + audit
          self-check trace)
      |
      v
Phase 12: Validation and Rejection Tests (per-finding, per-retcon-card,
          and audit-level tests; any FAIL halts and loops)
      |
    pass
      |
      v
Phase 13: Commit (HARD-GATE approval with drop-list --> atomic write of
          audit report + surviving retcon cards + audits/INDEX.md update;
          partial-failure-safe write order: retcon cards first,
          then report, then INDEX.md)
```

## Inputs

### Required
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists, all 12 mandatory world files are readable, and any present sub-directories (characters/, diegetic-artifacts/, proposals/, adjudications/) are listable. This skill *audits* existing canon; it does not create worlds.

### Optional
- `parameters_path` — filesystem path — markdown file declaring: `audit_scope` (`all` or a subset of the 10 categories); `severity_floor` (integer 1-5, default 3 — findings at or above this level emit retcon-proposal cards); `focus_domains` (optional list, narrows Phase 4 to specific domain files); `trigger_context` (`post-canon-addition` / `pre-publication` / `periodic` / `user-suspected-contradiction`); `recent_canon_addition_cutoff` (a CH-NNNN id or ISO date bounding the Phase 2 delta window). If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

- **Audit report** at `worlds/<world-slug>/audits/AU-NNNN-<YYYY-MM-DD>.md` — hybrid YAML frontmatter (`audit_id`, `world_slug`, `date`, `parameters`, `trigger_context`, `severity_floor`, `categories_audited`, `categories_deferred`, `finding_count_by_severity`, `retcon_card_ids`, `dropped_finding_ids`, `dropped_card_ids`, `user_approved`) + markdown body (Phase 2 change-log delta trace, per-category Phase 4 findings with cited CFs, Phase 5 severity classifications, Phase 6 burden debt trace, Phase 10 Update Priority List, Retcon Proposals index linking to each RP-NNNN card, Phase 9 self-check trace, Phase 12 validation trace). Matches `templates/audit-report.md`.

- **Retcon-proposal cards** (zero or more) at `worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md` — one file per surviving finding at or above the severity floor. Hybrid YAML frontmatter structurally parallel to `templates/canon-fact-record.yaml` (so `canon-addition` can field-copy rather than field-re-derive) plus retcon-specific fields (`retcon_type: A|B|C|D|E|F`, `target_cf_ids`, `severity_before_fix`, `severity_after_fix`, `audit_origin: AU-NNNN`, `finding_id`). Markdown body includes: the cited finding from the audit, the proposed canonical revision, a Retcon Policy checklist (per proposal §Retcon Policy), and a downstream-updates list matching `required_world_updates` semantics. Each card's filesystem path is directly consumable as `canon-addition`'s `proposal_path`. Matches `templates/retcon-proposal-card.md`.

- **INDEX.md update** at `worlds/<world-slug>/audits/INDEX.md` — one line per non-dropped audit run in the form `- [AU-NNNN](AU-NNNN-<date>.md) — <trigger_context> / sev-max <N> / <finding_count> findings / <retcon_card_count> retcon cards`, sorted by AU-NNNN ascending. Created with header `# Continuity Audits — <World-Slug-TitleCased>` if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. No Canon Fact Record emitted. No Change Log Entry emitted. Each retcon card is a *candidate*; canonization happens only when `canon-addition` accepts it in a separate run.

## World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

- `docs/FOUNDATIONS.md` — cited throughout (Canon Layers at Phase 4 interpretation of each CF; Validation Rules 1-7 at Phases 3, 4, 6, 9; Change Control Policy at Phase 2 delta analysis; Canon Fact Record Schema at Phase 8 retcon-card frontmatter parity).
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 4g tone/identity drift check against kernel's tonal contract, chronotope, primary difference.
- `worlds/<world-slug>/INVARIANTS.md` — Phase 4a/4b invariant-conformance check (ontological + causal); Phase 9 self-check for retcon cards that would touch invariants.
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 4 ontology-category integrity for every CF's cited type.
- `worlds/<world-slug>/TIMELINE.md` — Phase 4d timeline-contradiction check (event order, diffusion, age impossibility).
- `worlds/<world-slug>/GEOGRAPHY.md` — Phase 4c distribution-contradiction check (plausibility of facts-in-place); Phase 4j local/global drift check.
- `worlds/<world-slug>/PEOPLES_AND_SPECIES.md` — Phase 4c distribution (species-gated capabilities); Phase 4f everyday-life check per species cluster.
- `worlds/<world-slug>/INSTITUTIONS.md` — Phase 4e institutional-reaction check (Rule 5); Phase 6 burden debt (institutional stabilizers drifted).
- `worlds/<world-slug>/ECONOMY_AND_RESOURCES.md` — Phase 4c/4e (economic reactions missing); Phase 6 (capability creep into economic assumptions).
- `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` — Phase 4a/4b (system rule violations); Phase 6 (stabilizer erosion).
- `worlds/<world-slug>/EVERYDAY_LIFE.md` — Phase 4f cosmetic-additions check (Rule 2); Phase 4e (ordinary life ignoring world-shaping conditions).
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 2 full change-log delta analysis; Phase 3 + Phase 4 full CF cross-referencing; Phase 6 capability-acceptance-date lookup; Phase 8 retcon target CF verification. Use the Large-file method (below) when the ledger exceeds tool token budget (≥1500 lines); the pattern was borrowed from `canon-addition` §Pre-flight Check and generalizes to any mature-world file that exceeds the Read tool's default budget.
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 4h mystery corruption check (mysteries that silently became open questions); Phase 10 priority list (unresolved questions affecting finding severity).
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 4h forbidden-answer collision audit; Phase 4i diegetic-leakage check (does an in-world text reveal a reserved answer?); Phase 8 retcon cards that would touch the reserve.
- `worlds/<world-slug>/characters/` — directory listing + every dossier's frontmatter — Phase 4i diegetic leakage (a character's known/believed data must respect their diegetic epistemic reach).
- `worlds/<world-slug>/diegetic-artifacts/` — directory listing + every artifact's frontmatter — Phase 4i diegetic leakage (an in-world text's content cannot exceed its author's plausible knowledge).
- `worlds/<world-slug>/proposals/` — directory listing + any BATCH-NNNN manifests + open (non-adjudicated) cards — Phase 2 delta context (proposals under consideration affect audit scope); Phase 10 priority interaction (recommending a retcon that conflicts with an open proposal).
- `worlds/<world-slug>/adjudications/` — directory listing + recent PA-NNNN records — Phase 2 delta (adjudication rationale clarifies why a CH happened); Phase 6 burden debt (what stabilizers were promised at acceptance).
- `worlds/<world-slug>/audits/` — directory listing — pre-flight AU-NNNN allocation + delta against prior audits (did a prior audit recommend a retcon that was never applied?).
- `parameters_path` contents (if provided) — read once at Phase 0 as raw parameter declaration.
- Optional `recent_canon_addition_cutoff` resolution — if the cutoff is a CH-NNNN id, verify the id exists in CANON_LEDGER.md's change log before using it as a delta boundary.

If `worlds/<world-slug>/` is missing, or any of the 12 mandatory world files is unreadable, the skill aborts before Phase 0 and instructs the user to supply a valid `world_slug` or run `create-base-world` first. Missing sub-directories (characters/, diegetic-artifacts/, proposals/, adjudications/, audits/) are NOT abort conditions — the skill treats their absence as "no artifacts of this type yet" and records this in the audit report so findings in those surfaces are legitimately out-of-scope rather than silently skipped.

## Pre-flight Check

Runs before any pipeline phase; aborts the skill on failure.

1. Derive absolute path from `world_slug`: resolve `worlds/<world-slug>/`. If the directory is absent, abort: "World directory not found. Supply a valid `world_slug` or run `create-base-world` first."
2. Verify all 12 mandatory world files are readable. If any is missing or unreadable, abort naming the specific file.
3. Verify sub-directory listings are readable when present: `characters/`, `diegetic-artifacts/`, `proposals/`, `adjudications/`, `audits/`. Missing directories are non-abort — the skill records their absence in the audit report's `categories_deferred` justification.
4. Load `docs/FOUNDATIONS.md` into working context.
5. Scan `worlds/<world-slug>/audits/` for existing `AU-NNNN` ids; allocate `next_au_id`. Scan `worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/` across all prior audits for existing `RP-NNNN` ids; reserve an `RP-NNNN` range (allocate 20 ids forward from the highest existing; excess reservations become permanent gaps per `propose-new-canon-facts` precedent — never reused).
6. Read existing `audits/INDEX.md` if present; record its current content for Phase 13 append.
7. Load the skill's own templates: `templates/canon-fact-record.yaml` (for Phase 8 parity), `templates/change-log-entry.yaml` (for Phase 2 delta interpretation), `templates/audit-report.md`, `templates/retcon-proposal-card.md`.

**Large-file method**: per `canon-addition` §Pre-flight Check, mature worlds accumulate files exceeding the Read tool's default budget — not only `CANON_LEDGER.md` but also, at scale, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `INSTITUTIONS.md`, `EVERYDAY_LIFE.md`, `ECONOMY_AND_RESOURCES.md`, and any other domain file whose accumulated annotations push it past budget.

- For **CANON_LEDGER.md**: use `Grep -n` on `^id: CF-\d+` and `^change_id: CH-\d+` to enumerate ids with line offsets in a single call per pattern; Phase 2 and Phase 4 use targeted `Read offset/limit` calls anchored at grepped offsets rather than full-file reads.
- For **domain files** (MYSTERY_RESERVE, OPEN_QUESTIONS, INSTITUTIONS, EVERYDAY_LIFE, ECONOMY_AND_RESOURCES, and similar): use section-header grep (`^##\s|^###\s`) to enumerate structure in a single call, then targeted `Read offset/limit` on Phase-4-relevant sections. The audit report's Categories Deferred section MUST disclose which files were sampled and which section regions were targeted — silent full-file-skip is a Phase 1 `categories_deferred` violation. Phase 1's "no category silently skipped" rule extends to sub-regions of large files: a sampled file is not a deferred category, but an un-sampled Phase-4-relevant region of a large file must be named in the disclosure.

## Phase 0: Normalize Audit Parameters

Parse `parameters_path` if provided, otherwise interview the user one question at a time. Bind the following parameters:

- `audit_scope`: `all` (default) or a list of categories from 1-10
- `severity_floor`: integer 1-5, default 3 (findings at or above this level emit retcon cards)
- `focus_domains`: optional list narrowing Phase 4 to specific domain files (e.g., `[INSTITUTIONS, EVERYDAY_LIFE]`)
- `trigger_context`: one of `post-canon-addition`, `pre-publication`, `periodic`, `user-suspected-contradiction`
- `recent_canon_addition_cutoff`: a CH-NNNN id or ISO date bounding Phase 2's delta window

**Cutoff verification**: if `recent_canon_addition_cutoff` is a CH-NNNN id, grep `CANON_LEDGER.md` for `^change_id: <cutoff>` before proceeding. If the id is absent, abort: "Cutoff change_id not found in ledger — supply a valid CH-NNNN or remove the parameter."

**Cutoff semantics (disambiguation)**: if `recent_canon_addition_cutoff` equals the latest CH in the ledger (as enumerated by pre-flight), treat it as **inclusive anchor** — Phase 2 analyzes all CHs up to and including the cutoff. Users who intended a strict delta window on most-recent-only should omit the parameter (full-log analysis) or set the cutoff to the id BEFORE the window's start. Record the disambiguation outcome in the audit report body — either as a standalone "Parameters Interpretation Note" section placed between frontmatter and the Change Log Delta Trace, or folded into the Delta Trace's opening paragraph — so a reader can reconstruct which interpretation was applied. Strict "newer than" semantics (Phase 2 default) applies only when the cutoff is NOT the latest CH.

**Rule**: parameters declare *search space*, not findings. Reject any parameter attempting to dictate that a specific CF "should" be retconned — that's canon-addition's territory, not this skill's.

## Phase 1: Scope the Audit

Map `audit_scope` + `focus_domains` to active Phase 4 sub-categories. Load only the world files required for active categories; record any category that would be active under `all` but is deferred by the user's parameters, along with its one-line rationale (for the audit report's `categories_deferred` frontmatter field).

**Rule**: deferred categories must be named explicitly in the audit report. A category silently skipped would produce a false "no findings" read — "no findings in category 5" must be unambiguous about whether category 5 was audited and clean or never audited.

## Phase 2: Change Log Delta Analysis

Enumerate `CH-NNNN` entries in `CANON_LEDGER.md`'s change log section per the cutoff's semantics: **newer than (strict)** when `recent_canon_addition_cutoff` is NOT the latest CH; **newer than OR equal to (inclusive)** when the cutoff equals the latest CH per Phase 0's disambiguation rule; **full log** when no cutoff is supplied. For each CH in the window, produce a risk profile recording:

- `affected_fact_ids` — the CFs the CH names
- `invariants_touched` — which invariants the CH's affected CFs reference (ONT-N / CAU-N / DIS-N / SOC-N / AES-N)
- `mystery_reserve_interactions` — whether the CH narrowed, expanded, or left the reserve untouched
- `required_world_updates` — list from the CH entry itself
- `patch_attribution_status` — for each file in `required_world_updates`, does that file actually contain an `<!-- added by CF-NNNN -->` or equivalent attribution trail? Missing attribution is a Phase 4 category 9 (Diegetic Leakage) or category 10 (Local/Global Drift) candidate finding depending on scope.

**FOUNDATIONS cross-ref**: Rule 6 (No Silent Retcons). The delta analysis is the structural enforcement of the rule — a CH whose prose summary doesn't match its actual downstream effects is a silent retcon surface even when the ledger entry exists.

## Phase 3: Continuity Lint Sweep

Run the proposal's 10 lint questions mechanically as a candidate-finding generator. For each question, enumerate CFs/files/frontmatter fields triggering the question:

- What changed recently that should now appear elsewhere? (cross-reference Phase 2 delta vs domain-file patches)
- What capability has become suspiciously consequence-free? (feeds Phase 6)
- What institution has failed to respond to a world-changing development? (feeds 4e)
- Which facts are now redundant? (feeds 4j)
- Which facts silently imply broader adoption? (feeds 4c/4j)
- Which regions are under-updated after a global change? (feeds 4c)
- Which species or classes are absent from consequences they should feel? (feeds 4e/4f)
- Which earlier facts now need scoping, limiting, or reclassification? (feeds Phase 7)
- Which diegetic texts should now be re-read as biased or incomplete? (feeds 4i)
- Which mysteries should be protected from accidental overexposure? (feeds 4h)

**Rule**: Phase 3 output is a *candidate list*, not a findings list. Each entry must cite at least one CF id or concrete file anchor (e.g., `GEOGRAPHY.md §Eastern Reach, ¶3`) — un-anchored flags are discarded. Phase 4 sub-passes consume the candidate list as input alongside direct file reads.

## Phase 4: Audit Category Passes

One sub-pass per active category. Each sub-pass produces zero or more **findings** with a within-audit `finding_id` (`F-NN`) and explicit citations to the CFs / files / frontmatter fields involved. A sub-pass whose category is deferred per Phase 1 produces no findings and is recorded in `categories_deferred`.

- **4a Ontological Contradictions** — a CF asserts X exists while an invariant or another CF asserts X cannot exist. Scan: all CFs with `type` in {species, entity, metaphysical_rule, hidden_truth} vs INVARIANTS.md ontological invariants. **FOUNDATIONS cross-ref**: Rule 1 and INVARIANTS §Ontological.
- **4b Causal Contradictions** — stated costs, prerequisites, or dependencies are violated by another CF. Scan: all CFs with populated `costs_and_limits` vs CFs that would use the capability without paying the cost. **FOUNDATIONS cross-ref**: Rule 1 and INVARIANTS §Causal.
- **4c Distribution Contradictions** — a capability with `scope.geographic: local` is used as universal in downstream facts. Scan: all CFs with non-`global` geographic scope + non-`public` social scope; enumerate how they are referenced by other CFs and domain files. **FOUNDATIONS cross-ref**: Rule 4 (No Globalization by Accident). Distinct from 4j: 4c checks scope conflict at the CF level; 4j checks drift at the prose level in domain files.
- **4d Timeline Contradictions** — historical order, age, diffusion impossibilities. Scan: all CFs with temporal markers vs TIMELINE.md layering.
- **4e Institutional Contradictions** — major powers fail to react to facts that should affect them. Scan: INSTITUTIONS.md institution entries vs CFs citing `domains_affected` institutional domains but lacking institutional-response content. **FOUNDATIONS cross-ref**: Rule 5 (No Consequence Evasion).
- **4f Everyday-Life Contradictions** — ordinary life ignores world-shaping conditions. Scan: EVERYDAY_LIFE.md per-cluster entries vs CFs whose `visible_consequences` claims would reshape ordinary life. **FOUNDATIONS cross-refs**: Rule 2 (No Pure Cosmetics) and Rule 5.
- **4g Tone / Identity Drift** — accumulated additions drift from kernel. Scan: recent N CHs' affected CFs' `notes` and prose against WORLD_KERNEL.md `tonal_contract`, `primary_difference`, `what is ordinary / wonder / taboo`. **FOUNDATIONS cross-ref**: World Kernel §Tonal Contract.
- **4h Mystery Corruption** — mystery-reserve entries being explained too fast or becoming incoherent. Scan: MYSTERY_RESERVE.md entries vs recent CF `statement` and `notes` fields; flag any accidental resolution OR drift from "disallowed cheap answers" list. **FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately).
- **4i Diegetic Leakage** — in-world texts or characters reveal knowledge impossible for their author/person. Scan: every file in `characters/` and `diegetic-artifacts/` frontmatter — does any character's `knowledge` or any artifact's body reveal a fact from MYSTERY_RESERVE.md's "forbidden answers" OR a CF whose `scope.social` is `restricted_group` / `secret` without diegetic justification? **FOUNDATIONS cross-ref**: Rule 7. This category is the single largest reason the skill reads `characters/` and `diegetic-artifacts/` — treat those reads as load-bearing.
    - **Sub-pattern — dossier MR-firewall staleness**: for each dossier/artifact whose `generated_date` predates a subsequent CH that added Mystery Reserve entries, record the MR-list gap as a low-severity (sev-2 Soft Contradiction) audit-trail finding. Verify the dossier/artifact's body, `known_firsthand`, `wrongly_believes`, and `epistemic_horizon` against the NEWER MR entries' `disallowed cheap answers` lists; if no actual leakage is present, the finding stays at sev-2 (below default floor of 3) and is report-only — surfaced for audit-trail completeness without retcon card. If actual leakage IS present against a newer MR entry, severity escalates per normal Phase 5 classification. This is a recurring pattern in mature worlds where MR entries accumulate; naming it as a sub-pattern prevents it being re-discovered ad-hoc per audit run.
- **4j Local/Global Drift** — a local practice or anomaly is repeatedly treated as universal world truth in domain-file prose. Scan: CFs with `scope.geographic: local` OR `scope.social: restricted_group` and grep domain files for prose that speaks of them without scope qualification. **FOUNDATIONS cross-ref**: Rule 4. Distinct from 4c: 4j is the *prose-level* drift detection — a scoped CF whose downstream prose has dropped the scope qualifier.

**Rule**: every finding records its `finding_id`, the triggering category (`4a`-`4j`), cited CF ids and/or file anchors, a one-paragraph description, and feeds forward to Phase 5 for severity.

## Phase 5: Severity Classification

Assign severity 1-5 per finding per the proposal's levels:

- **1: Cosmetic Mismatch** — minor wording / emphasis inconsistency
- **2: Soft Contradiction** — lore now feels underexplained
- **3: Structural Tension** — a domain file must be revised
- **4: World-Identity Risk** — the world's core logic or feel is degrading
- **5: Canon Break** — hard contradiction or catastrophic drift

Each severity gets a one-line cited rationale written inline into the finding. The rationale must reference the specific drift mechanism ("CF-0042's `scope.geographic: local` is treated as regional in GEOGRAPHY.md ¶7 without diffusion history — this is structural tension, not yet world-identity risk, because no other CF depends on the regional reading").

**Rule**: bare "Severity 4" without rationale is treated as FAIL at Phase 9. This mirrors `canon-addition`'s Validation Test discipline (PASS-without-rationale = FAIL).

## Phase 6: Burden Debt Analysis

Scan accepted capabilities (CFs with `type` in {capability, artifact, technology, institution, ritual, magic_practice}) for post-acceptance consequence-free drift:

- For each such CF, read its `costs_and_limits` as declared at acceptance.
- Cross-reference: do subsequent CFs that reference this CF actually pay those costs? Do domain-file prose passages treating this CF respect the `distribution.why_not_universal` stabilizers?
- Flag capabilities whose subsequent references treat them as consequence-free.

Distinct from Phase 4c (Distribution Contradictions) in **time horizon**: 4c checks new facts *at adoption* for scope conflict; 6 checks *old* facts for drift since adoption. A CF accepted with stabilizers can silently become consequence-free over many subsequent CFs that each individually seemed innocent — Phase 6 is the only surface that catches this cumulative drift.

**FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation). Burden Debt is Rule 3's post-hoc check; acceptance-time Rule 3 enforcement lives in `canon-addition`'s Phase 11 (Equilibrium Explanation).

## Phase 7: Repair Menu Application

For each finding at or above `severity_floor`, select the **lightest viable repair** from the proposal's 8-item Repair Menu:

- Clarify Scope — the fact was true only in one dynasty / region / species / century
- Add Limiting Condition — the power works only under specific conditions / materials / cost
- Reclassify as Diegetic Belief — reframe an accepted fact as propaganda, sectarian claim, or myth
- Add Institutional Response — a guild / church / office / taboo now explains why consequences were not previously visible
- Insert Historical Change — this became possible recently due to excavation / plague / reform / war
- Narrow Adoption — only one order / bloodline / biome / lineage can do this
- Split the Fact — separate one oversized canon claim into two smaller truths
- Full De-Canonization — use only when necessary; do not hide it; log it

Then classify the resulting change per the proposal's §Retcon Taxonomy:

| Retcon Type | Meaning | Typical Repair Menu Item |
|---|---|---|
| A: Clarificatory | Makes explicit what was already implicitly true | Clarify Scope (when no new constraint is added) |
| B: Scope | Limits what had been spoken too broadly | Narrow Adoption / Clarify Scope (when constraint added) |
| C: Perspective | Reframes prior statements as incomplete, biased, or local | Reclassify as Diegetic Belief |
| D: Cost | Adds a missing burden or failure mode | Add Limiting Condition / Add Institutional Response |
| E: Chronology | Moves when something became true | Insert Historical Change |
| F: Ontology | Changes what the world fundamentally allows | Full De-Canonization (or Split the Fact when an ontology shift is forced) |

**Rule**: the repair-menu → retcon-type mapping must be *consistent*. Split the Fact typically produces a B+A pair (one narrower, one clarificatory), not a single retcon card; Phase 8 emits two RP-NNNN cards in that case. Cost Retcon (D) can issue from either Add Limiting Condition or Add Institutional Response because both add post-hoc burden — but the difference shows up in the card body (D via limiting condition targets the CF's `costs_and_limits`; D via institutional response targets a domain-file patch to INSTITUTIONS.md). Misclassifying D-via-institutional as "Type D on the CF directly" is a Phase 9 self-check trigger.

**FOUNDATIONS cross-ref**: Rule 6 (No Silent Retcons). The retcon-type classification is the semantic framing the Change Log Entry's `change_type` field will carry *when* `canon-addition` later processes this card — field parity preserves the traceability chain.

## Phase 8: Retcon Card Drafting

For each repair requiring a canon change, draft `RP-NNNN-<slug>.md` with:

**Frontmatter** (structurally parallel to `templates/canon-fact-record.yaml` for downstream canon-addition field-copy plus retcon-specific fields):

- CF-schema-parallel fields: `id` (RP-NNNN), `title`, `proposed_status` (what the fact's `status` would become after retcon; use `unchanged` when the retcon is Type A Clarificatory and does not change the target CF's status — e.g., domain-file-patch clarifications or modification_history-only retcons), `type`, `statement` (the proposed revised statement), `scope`, `truth_scope`, `domains_affected`, `prerequisites`, `distribution`, `costs_and_limits`, `visible_consequences`, `required_world_updates`, `source_basis`, `contradiction_risk`, `notes`
- Retcon-specific fields: `retcon_type: A|B|C|D|E|F`, `target_cf_ids` (existing CFs being modified), `severity_before_fix` (from Phase 5), `severity_after_fix` (projected if accepted), `audit_origin: AU-NNNN`, `finding_id: F-NN` (the audit finding this card responds to)

**Body**:
1. **Cited Finding** — the finding_id + one-paragraph description from the audit
2. **Proposed Revision** — precise text of what the target CF's statement should become, and which other CFs (if any) need cross-referenced `modification_history` entries at `canon-addition` time
3. **Retcon Policy Checklist** (per proposal §Retcon Policy — each must be recorded with a one-line justification, not just `true`/`false`):
   - `no_silent_edit`
   - `replacement_noted` (if anything is deleted, what replaces it is named)
   - `no_stealth_diegetic_rewrite` (world-level truth is not being changed via diegetic text alone)
   - `no_net_contradiction_increase` (this retcon does not solve one contradiction by creating more)
   - `world_identity_preserved` (this retcon does not weaken world identity for convenience)
4. **Downstream Updates** — files requiring patches if this retcon is accepted (matches `canon-addition`'s `required_world_updates` semantics)
5. **Operator Notes for Canon-Addition** — a brief paragraph the downstream `canon-addition` adjudicator will see explaining the audit origin, the severity calculus, and any critical-path decisions

**Rule**: if the Retcon Policy checklist records any `false`, the card cannot be emitted. The finding escalates to "requires user design decision" status in the audit report, and no RP-NNNN id is consumed. This is the structural enforcement that the skill does not smuggle weakened canon through under the guise of a repair.

**No-CF-target escalation**: a finding whose repair is NOT a CF modification — e.g., ledger schema harmonization (field-set drift in a CH entry), cross-audit workflow recommendation (inter-audit convention change), or any other meta-level finding whose resolution lives outside CF records — ALSO escalates to "requires user design decision" and emits no RP-NNNN id. The retcon-card workflow requires a `target_cf_ids` that `canon-addition` can field-copy against; findings without that target are surfaced in the audit report body with explicit escalation framing and a list of user options (typical options: emit a harmonization Change Log Entry via a future `canon-addition` run; accept the non-CF drift as recorded state; manual patch with Rule 6 risk explicitly accepted). Phase 10 priority list ranks these findings alongside retcon-backed findings using the same sort key; the bucket remains the same but the "retcon card" column reads "escalated" instead of the RP-NNNN id.

**FOUNDATIONS cross-ref**: Rule 6 (No Silent Retcons) — the checklist is the inline version of the Change Log Entry's `retcon_policy_checks` field; `canon-addition` will re-verify them at acceptance time.

## Phase 9: Self-Check Rejection Tests (Mid-Pipeline)

Run these structural tests across every finding and every retcon card drafted in Phase 4-8. Each test records PASS with one-line rationale OR FAIL with the responsible loop-back phase. A bare PASS is treated as FAIL. Any FAIL halts and loops.

1. **Every finding cites anchor** — `finding_id` carries at least one CF id OR a concrete file anchor (e.g., `GEOGRAPHY.md §Eastern Reach ¶3`). No un-anchored findings. (Loop → Phase 4)
2. **Every severity has rationale** — bare severity numbers fail. The rationale must reference the specific drift mechanism. (Loop → Phase 5)
3. **Retcon type matches repair** — per the Phase 7 mapping table. (Loop → Phase 7)
4. **Retcon policy checklist is justified** — every entry is a one-line rationale, not a bare boolean. (Loop → Phase 8)
5. **No retcon increases net contradictions** — scan the proposed revision against existing CFs. If the revision would introduce >1 new conflict, escalate the finding to "requires user design decision" and do not emit a card. (Loop → Phase 7 to pick a lighter repair, or escalate)
6. **CF-schema parity preserved** — retcon card frontmatter contains every required field from the CF schema (`id`, `title`, `status`→`proposed_status`, `type`, `statement`, `scope`, `truth_scope`, `domains_affected`, `source_basis`, `required_world_updates`). (Loop → Phase 8)

**Why this phase is distinct from Phase 12**: Phase 9 is a **structural pre-assembly gate** — catches bad inputs to the report and cards before they congeal into written artifacts. Phase 12 is a **post-assembly gate** — catches systemic issues that only appear after the priority list and the report body have been drafted (e.g., frontmatter-body mismatches, finding_count_by_severity drift from count errors, retcon_card_ids matching actual card files).

## Phase 10: Update Priority List

Rank surviving findings and proposed retcons by `severity × domain_weight`:

- `domain_weight` heuristic: `invariants_touching` (3x) > `mystery_reserve_touching` (2.5x) > `core_pressure_touching` (2x) > `ledger_integrity_touching` (1.5x) > `single_domain` (1x). Findings that don't match any named class default to `single_domain` (1x) — a consistent fallback preserves Phase 10 reproducibility when a new finding type surfaces that the heuristic doesn't yet name.

Bucket into:

- **now** — severity ≥ 4, OR `trigger_context: pre-publication` with severity ≥ 3
- **next-batch** — severity 3 (not pre-publication)
- **deferred** — severity 2 (surfaced in report only; no retcon card unless `severity_floor` was lowered to ≤ 2)
- **cosmetic** — severity 1 (surfaced in report body, no action recommended)

**Rule**: the priority list must be **reproducible** — two audits against the same world-state with the same parameters must produce the same priority order. The sort key (severity × domain_weight) is deterministic; ties break on `finding_id` ascending.

## Phase 11: Draft Audit Report

Assemble `AU-NNNN-<YYYY-MM-DD>.md` per `templates/audit-report.md`. Named sections in order:

- **Frontmatter** — per Output section (`audit_id`, `world_slug`, `date`, `parameters`, `trigger_context`, `severity_floor`, `categories_audited`, `categories_deferred`, `finding_count_by_severity`, `retcon_card_ids`, `dropped_finding_ids`, `dropped_card_ids`, `user_approved`)
- **Change Log Delta Trace** — Phase 2 output, one subsection per audited CH-NNNN
- **Continuity Lint Sweep Summary** — Phase 3 candidate list with cited anchors
- **Per-Category Findings** — Phase 4 sub-passes 4a-4j; each finding with `finding_id`, cited CFs/anchors, description, severity, severity rationale
- **Burden Debt Trace** — Phase 6 findings separated because they cross-cut categories
- **Update Priority List** — Phase 10 bucketed list
- **Retcon Proposals Index** — one line per surviving RP-NNNN card with relative-path link (`./AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md`), `retcon_type`, `target_cf_ids`, `severity_before_fix → severity_after_fix`
- **Self-Check Trace** — Phase 9 test-by-test PASS/FAIL with rationale
- **Validation Trace** — Phase 12 test-by-test PASS/FAIL with rationale (populated after Phase 12 runs)
- **Categories Deferred** — Phase 1 deferrals with rationale (prevents "no findings" misread)

## Phase 12: Validation and Rejection Tests (Pre-Commit Gate)

Run all tests below and record each as PASS with one-line rationale OR FAIL in the audit report's "Validation Trace" section. Bare PASS is FAIL. Any FAIL halts and loops to the responsible phase; Phase 13 (commit) is blocked until every test records PASS.

**Per-finding tests**:

1. **Citation completeness** — every finding_id has cited CF ids or file anchors (re-check Phase 9 invariant holds after report assembly).
2. **Severity rationale** — every severity has a rationale that references a specific mechanism.

**Per-retcon-card tests**:

3. **CF-schema parity** — retcon card frontmatter carries every required CF-schema field (structural parity preserved).
4. **Retcon policy checklist complete** — every checklist entry has a one-line justification, no bare booleans.
5. **Retcon type conformance** — `retcon_type` matches the Phase 7 repair-menu mapping.
6. **target_cf_ids exist** — every id in `target_cf_ids` is verifiable in the current `CANON_LEDGER.md` (prevents a card targeting a CF that was never in the ledger).

**Audit-level tests**:

7. **AU-NNNN uniqueness** — pre-flight-allocated id is still unclaimed (re-grep audits/ in case of concurrent invocation; abort on collision).
8. **finding_count_by_severity accuracy** — frontmatter counts match the actual finding count per severity bucket in the body.
9. **retcon_card_ids matches card files** — every id in `retcon_card_ids` has a corresponding drafted card; every drafted card has its id in `retcon_card_ids`.
10. **categories_deferred accuracy** — frontmatter list matches Phase 1 deferrals.
11. **Report body internal consistency** — every finding_id referenced in the priority list is present in the Per-Category Findings section; every RP-NNNN referenced in the Retcon Proposals Index is present in `retcon_card_ids`.

## Phase 13: Commit (HARD-GATE)

Present the deliverable summary:

1. **Audit report body**: full prose
2. **Every retcon card**: full frontmatter + body
3. **Retcon Policy checklists**: per card
4. **Phase 9 self-check trace + Phase 12 validation trace**
5. **Categories deferred**: with rationale
6. **Target write paths**: report path, per-card paths, INDEX.md path

**HARD-GATE fires here**: no file is written until user approves. User may (a) approve as-is, (b) approve with a drop-list of finding-IDs AND/OR retcon-card-IDs to exclude, (c) request specific revisions (loop to named phase), (d) reject and abort.

### Drop-list behavior

If the user's approval includes a drop-list:

- **Surviving findings and cards retain originally-allocated ids**. No renumbering. Dropped ids become permanent gaps in the monotonic sequence (F-NN and RP-NNNN). Matches `propose-new-canon-facts`'s drop-list convention for identical reasons: audit-trail traceability between Phase 3/4/7/8 and the report's `dropped_finding_ids` / `dropped_card_ids`.
- **Dropped findings persist in the report body** as historical record of what was surfaced but deemed non-issues by the user — this is a *deliberate* difference from sibling drop-list semantics (where dropped cards simply never exist). An audit is an epistemic artifact: dropped findings' presence in the report, flagged as dropped-by-user, preserves the audit's honesty about what it surfaced.
- **Dropped retcon cards are never written** to disk; their ids appear only in `dropped_card_ids` and as entries in the Retcon Proposals Index marked `(dropped by user at Phase 13)`.
- **Phase 9 self-check and Phase 12 validation traces** retain entries for all findings and cards tested at generation time, including dropped ones. Drops are editorial selection at Phase 13, not Phase 9/12 rejection; the distinction is audit-trail-load-bearing.

On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity:

1. **Retcon cards first** (non-dropped only): `worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md`. Create the `AU-NNNN/` and `AU-NNNN/retcon-proposals/` subdirectories if absent. Set `source_basis.direct_user_approval: true` on each card before writing (the field name matches FOUNDATIONS §Canon Fact Record Schema and the shipped `templates/retcon-proposal-card.md`; CF-schema parity per Phase 9 test 6 and Phase 12 test 3). (This `direct_user_approval: true` on a retcon card means "reviewed and kept in the audit's recommendations" — NOT "accepted as canon". Canonization happens only when `canon-addition` runs on the card.)
2. **Audit report second**: `worlds/<world-slug>/audits/AU-NNNN-<YYYY-MM-DD>.md`. Populate `dropped_finding_ids`, `dropped_card_ids`, `user_approved: true`.
3. **INDEX.md last**: read existing (create with header `# Continuity Audits — <World-Slug-TitleCased>` + blank line if absent), append one line in the form `- [AU-NNNN](AU-NNNN-<date>.md) — <trigger_context> / sev-max <N> / <finding_count> findings / <retcon_card_count> retcon cards`, sort by AU-NNNN ascending, write back.

Cards-first sequencing means a partial-failure state has either orphaned cards (detectable by grepping INDEX for AU-NNNN) or a report without INDEX row (detectable by grepping INDEX for the AU). **Recovery is manual**: either update INDEX.md manually, or delete the orphaned files and re-run with the same parameters (which allocates fresh ids).

Report all written paths. Do NOT commit to git.

## Validation Rules This Skill Upholds

This skill is a validator of all 7 Validation Rules — the full FOUNDATIONS rule set maps to Phase 4 sub-categories and adjacent phases:

- **Rule 1: No Floating Facts** — enforced at Phases 4a/4b (invariant/causal check surfaces CFs missing domain/scope/prerequisites/limits/consequences) and Phase 12 test 3 (CF-schema parity on emitted retcon cards).
- **Rule 2: No Pure Cosmetics** — enforced at Phase 4f (Everyday-Life Contradictions — cosmetic additions that fail to change labor/kinship/law/ecology).
- **Rule 3: No Specialness Inflation** — enforced at Phase 6 (Burden Debt Analysis — capability creep since acceptance).
- **Rule 4: No Globalization by Accident** — enforced at Phase 4c (CF-level scope conflict) and Phase 4j (prose-level scope drift).
- **Rule 5: No Consequence Evasion** — enforced at Phase 4e (Institutional Contradictions) and Phase 4f (Everyday-Life Contradictions — ordinary life ignoring world-shaping conditions).
- **Rule 6: No Silent Retcons** — enforced at Phase 2 (Change Log Delta Analysis — silent-edit surface detection) and Phase 8 (Retcon Policy checklist per retcon card).
- **Rule 7: Preserve Mystery Deliberately** — enforced at Phase 4h (Mystery Corruption — overexposure / incoherence) and Phase 4i (Diegetic Leakage — in-world texts revealing forbidden answers).

## Record Schemas

- **Retcon-Proposal Card** → `templates/retcon-proposal-card.md` (original to this skill; frontmatter structurally parallel to `templates/canon-fact-record.yaml` for downstream canon-addition field-copy compatibility + retcon-specific fields `retcon_type`, `target_cf_ids`, `severity_before_fix`, `severity_after_fix`, `audit_origin`, `finding_id`).
- **Audit Report** → `templates/audit-report.md` (original to this skill; hybrid YAML frontmatter + markdown body with named sections — Change Log Delta Trace, Continuity Lint Sweep Summary, Per-Category Findings, Burden Debt Trace, Update Priority List, Retcon Proposals Index, Self-Check Trace, Validation Trace, Categories Deferred).
- **Canon Fact Record** (consumed, not emitted) → `templates/canon-fact-record.yaml` (matches FOUNDATIONS §Canon Fact Record Schema; bundled for Phase 4/6/8 schema-parity reference).
- **Change Log Entry** (consumed, not emitted) → `templates/change-log-entry.yaml` (matches FOUNDATIONS §Change Control Policy; bundled for Phase 2 delta-interpretation reference).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | Loads FOUNDATIONS.md + all 12 world files + 4 sibling-populated directories before any phase; Large-file method (grep-then-targeted-read, generalized from `canon-addition`'s ledger pattern to domain files) when files exceed Read budget |
| Canon Layers §All | Phase 4 | Each CF is interpreted through its `status` (hard / derived / soft / contested / mystery-reserve); category passes apply different tests to each layer |
| Invariants §full schema | Phase 4a/4b | Ontological + causal invariant conformance checked per-CF |
| Canon Fact Record Schema | Phase 8 | Retcon card frontmatter preserves CF-schema parity for canon-addition field-copy; Phase 12 test 3 enforces parity structurally |
| Rule 1 (No Floating Facts) | Phase 4a/4b, Phase 12 | Invariant/causal checks; CF-schema parity gate |
| Rule 2 (No Pure Cosmetics) | Phase 4f | Everyday-life check against world-shaping conditions |
| Rule 3 (No Specialness Inflation) | Phase 6 | Burden Debt Analysis — post-acceptance drift detection |
| Rule 4 (No Globalization by Accident) | Phase 4c, Phase 4j | CF-level scope-conflict + prose-level scope-drift |
| Rule 5 (No Consequence Evasion) | Phase 4e, Phase 4f | Institutional + everyday-life response checks |
| Rule 6 (No Silent Retcons) | Phase 2, Phase 8 | Delta analysis surfaces silent edits; Retcon Policy checklist per card |
| Rule 7 (Preserve Mystery Deliberately) | Phase 4h, Phase 4i | Mystery corruption + diegetic leakage audits |
| Change Control Policy | N/A | Not applicable — this skill does NOT emit Change Log Entries (Rule 6 enforcement here is *detection* of silent retcons and *recommendation* of new CH entries via retcon cards). Handoff: `canon-addition` emits the CH entry when an RP-NNNN card is accepted. |
| Canon Fact Record emission | N/A | Not applicable — this skill does NOT emit Canon Fact Records. It consumes CF records as input and recommends modifications via retcon cards. Handoff: `canon-addition` emits modified/new CF records when an RP-NNNN card is accepted. |

## Guardrails

- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- This skill **never writes to world-level canon files** — not `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. All writes are confined to `worlds/<world-slug>/audits/` (the audit report, `AU-NNNN/retcon-proposals/` subdirectory, and `INDEX.md`).
- This skill **never writes to canon-adjacent sibling directories** — not `worlds/<world-slug>/characters/`, `diegetic-artifacts/`, `proposals/`, or `adjudications/`. It reads those directories to detect diegetic leakage and change-log interactions, but writes only to `audits/`.
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `parameters_path`. Repo-root writes are forbidden.
- This skill **proposes retcons; it does not apply them**. Every emitted RP-NNNN card is a candidate for `canon-addition`'s separate adjudication. A card's existence on disk is NOT equivalent to an accepted canon retcon. Downstream users (both human and other skills) must verify that a proposal card's `source_basis.direct_user_approval: true` refers to *inclusion-in-audit-recommendations*, not *canonization*.
- If a pre-flight `next_au_id`, `next_rp_id`, or any card slug would collide with an existing file, the skill aborts. Never overwrite an existing audit report, retcon card, or INDEX row. Once written, an audit is treated as existing state; re-running with the same parameters produces a new `AU-NNNN` with new `RP-NNNN` ids.
- **Interop seam with `canon-addition` is one-way, deliberate, and card-level**: this skill produces retcon-proposal cards; `canon-addition` consumes one card at a time (via `proposal_path`). This skill does not batch-submit cards, does not assume adjudication will succeed, and does not update its cards after adjudication. Adjudication outcomes are `canon-addition`'s territory; stale cards are the operator's cleanup concern, not this skill's.
- **Interop seam with `propose-new-canon-facts` is indirect**: a parameters file may declare `upstream_audit_path: <AU-NNNN report>` pointing to a prior audit of this skill, which that sibling then uses as a diagnosis short-circuit. This skill does not invoke or depend on that sibling; the interop is consumer-initiated.
- **Prior audit delta**: pre-flight reads `audits/INDEX.md` and prior `AU-NNNN` reports to detect recommendations never applied. A prior audit's retcon card that was never accepted by `canon-addition` is not automatically re-surfaced — it's the user's call whether to re-recommend or let it lapse. If a new audit would re-surface the same finding, the finding body cites the prior AU to prevent recommendation thrash.
- **Empty findings in an active category are diagnostic signals, not bugs**. A category that was audited and returned zero findings is a legitimate clean-audit outcome — the deliverable summary names the category as audited-and-clean rather than suppressing it. This mirrors `propose-new-canon-facts`'s empty-slot discipline.
- Phase 4h (Mystery Corruption) and Phase 4i (Diegetic Leakage) are the two Rule 7 enforcement points. A future maintainer adding a phase that exposes the audit to Mystery Reserve content between Phase 3 and Phase 9 must either extend both checks or explicitly classify the phase as out-of-scope for Rule 7 (documented in the audit report notes).
- **Inherited-drift handling**: if Phase 4 finds a pre-existing ledger inconsistency that was inherited from prior CFs (e.g., a counting drift where the ledger's prose says "three" but names four items), the skill surfaces the finding but does NOT recommend a silent-rewrite retcon. The retcon card (if emitted) explicitly names the drift as inherited-from-CH-NNNN, mirroring `canon-addition`'s inherited-drift discipline. Silently correcting old prose via an audit-originated retcon violates Rule 6 even when factually right; the retcon must log the drift explicitly.
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root (so `worlds/<slug>/audits/` is under the worktree, not the main repo).
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.
- The HARD-GATE at the top of this file is absolute. No `Write` or `Edit` to `worlds/<world-slug>/audits/` until Phase 9 self-check passes clean, Phase 12 validation passes clean, AND the user approves the Phase 13 deliverable summary (including any drop-list). Auto Mode does not override this — skill invocation is not deliverable approval.

## Final Rule

A continuity audit is not written until every finding has a cited CF or file anchor and a severity with stated rationale; every proposed retcon has a repair-menu-derived type, a complete Retcon Policy checklist, and CF-schema-parallel frontmatter; the priority list is deterministically ranked; and the user has approved the complete deliverable — and once written, the audit report is immutable evidence of the world's state at that moment, and each retcon card is a candidate for `canon-addition`'s separate adjudication, not a completed change.
