---
name: story-fact-promotion-to-canon
description: "Use when promoting a story-local fact (SF-NNNN), mystery resolution (M-NNNN with `canon_candidate`-authority resolving event), character-arc outcome (STENT-NNNN), or in-story diegetic artifact (story-local DA-NNNN) into world-level canon — the ONLY lawful path by which a branching story may mutate world canon. Produces: SP-NNNN.md promotion-ledger entry under worlds/<world-slug>/stories/<story-slug>/story-promotions/ + a structured proposal package handed to canon-addition (which assembles the actual CF/CH/PA patch plan); on accept-flavored adjudication, also writes a superseding story-local source record adding `promoted_to_cf: CF-NNNN`. Mutates: worlds/<world-slug>/stories/<story-slug>/ directly (story-promotion ledger + superseding story records) plus, transitively via canon-addition, worlds/<world-slug>/_source/canon/CF-NNNN.yaml + worlds/<world-slug>/_source/change-log/CH-NNNN.yaml + extension/touched_by_cf appends to affected M/OQ/SEC/CF records + worlds/<world-slug>/adjudications/PA-NNNN-*.md (and, for source_kind=artifact_canonization on accept, a new world-level worlds/<world-slug>/diegetic-artifacts/DA-NNNN.md routed via append_diegetic_artifact_record); story-bundle records via direct Write (Hook 3 does not match worlds/<slug>/stories/<slug>/...); world-canon mutations via canon-addition's mcp__worldloom__submit_patch_plan."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: story_slug
    description: "Directory slug of an existing story bundle under worlds/<world-slug>/stories/<story-slug>/. Pre-flight aborts if the bundle is missing."
    required: true
  - name: source_kind
    description: "One of: story_fact | mystery_resolution | character_arc_outcome | artifact_canonization. Selects the source-loading branch in Phase 1 and the source-record-update shape in Phase 10."
    required: true
  - name: promotion_branch_path
    description: "The canonical branch from which this is being promoted, expressed as the page chain (e.g., [PG-0001, PG-0007, PG-0042]). Provenance is mandatory — the SP ledger and the proposal_package's source_basis trail both cite it."
    required: true
  - name: source_sf_id
    description: "Required when source_kind=story_fact. The SF-NNNN being promoted."
    required: false
  - name: source_m_id
    description: "Required when source_kind=mystery_resolution. The M-NNNN whose in-story resolution is being canonized."
    required: false
  - name: resolving_page_id
    description: "Required when source_kind=mystery_resolution. The PG-NNNN at which the resolving event applied; the storylet that fired must have declared M_resolution_claims with resolution_authority: canon_candidate for this M."
    required: false
  - name: source_stent_id
    description: "Required when source_kind=character_arc_outcome. The STENT-NNNN (story-local entity mirror) whose arc evolved across the branch. Distinct from the world-level CHAR-NNNN: the STENT is what evolved; the CHAR dossier remains the durable world record."
    required: false
  - name: source_branch_leaf_page
    description: "Required when source_kind ∈ {character_arc_outcome, artifact_canonization}. The PG-NNNN at the leaf of promotion_branch_path (or specified non-leaf), where the arc/artifact reached the state being canonized."
    required: false
  - name: arc_outcome_summary
    description: "Required when source_kind=character_arc_outcome. One-paragraph natural-language statement of the load-bearing transformation across STINT-0001 → STINT-leaf for this character."
    required: false
  - name: source_diegetic_artifact_id
    description: "Required when source_kind=artifact_canonization. The story-local DA-NNNN under worlds/<world-slug>/stories/<story-slug>/_source/artifacts/."
    required: false
  - name: contradiction_handling_preference
    description: "One of: flag_contradicting_branches (default) | leave_branches_alone | archive_contradicting_branches. Governs Phase 10's handling of other branches whose state would contradict the new CF after promotion."
    required: false
  - name: cross_story_impact_scan
    description: "Boolean (default false). When true, Phase 5 scans other stories under worlds/<world-slug>/stories/ for state that would contradict the new CF (cross-story impacts are always handled with `flag` — never auto-archive across stories)."
    required: false
  - name: execution_mode
    description: "One of: authoring (default) | interactive_runtime | batch_generation. Affects only secondary ergonomics (proposal-package presentation density, mandatory-critic-output verbosity). The Phase 8 HARD-GATE is preserved in EVERY mode — world-canon mutation is always an explicit user act per FOUNDATIONS §Default Reality + Rule 6."
    required: false
---

# Story Fact Promotion to Canon

The lawful, traceable, append-only bridge by which a story-local fact, mystery resolution, character-arc outcome, or in-story diegetic artifact becomes world-level canon — assembling a structured proposal package whose laundering firewall, scope-inflation check, mystery firewall, and downstream-impact analysis are all preconditions, and routing the package to `canon-addition` for the actual CF/CH adjudication and patch plan.

<HARD-GATE>
Do NOT write `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-NNNN.md`, do NOT write any superseding story-local source record (SF / STENT / story-local DA), do NOT `Edit` `worlds/<world-slug>/stories/<story-slug>/INDEX.md` or `worlds/<world-slug>/stories/INDEX.md`, and do NOT invoke `canon-addition` (which would itself fire its own HARD-GATE for world-canon mutation) until ALL of:

(a) Pre-flight resolves `worlds/<world-slug>/stories/<story-slug>/`, validates the source ID exists in this story's `_source/` per `source_kind` (story_fact → `_source/facts/SF-<id>.yaml`; mystery_resolution → world `_source/mystery-reserve/M-<id>.yaml` exists AND a resolving `SE-NNNN` at `resolving_page_id` whose storylet declared `M_resolution_claims.resolution_authority: canon_candidate` for this M; character_arc_outcome → `_source/entities/STENT-<id>.yaml` exists AND `source_branch_leaf_page` exists; artifact_canonization → `_source/artifacts/DA-<id>.yaml` exists), validates `promotion_branch_path` is a real chain ending at a real page, allocates the next `SP-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, 'SP', story_slug=<story_slug>)`, and confirms the content_policy block is loaded for downstream prompt assembly;

(b) Phase 4 Mystery Firewall hard-rejects any source whose target M is `status: forbidden` AND any `mystery_resolution` source whose resolving storylet's `resolution_authority` is NOT `canon_candidate` (a defense-in-depth re-check; storylet-pool-authoring Phase 4 gate 2 + branching-story-page-cycle Phase 4.5 are the upstream gates) — the rejection produces an SP-NNNN ledger entry with `outcome: REJECT (firewall)` and halts;

(c) Phase 7 Mandatory LLM Critics record PASS with a one-line rationale for every one of the five critics (Provenance, Scope-Inflation, Mystery-Firewall, Downstream-Impact, Rule 12 Two-Trace if `proposed_status: hard_canon`); bare PASS without justification is treated as FAIL per the project-wide skills contract;

(d) the user has explicitly approved the Phase 8 deliverable summary — promotion_id, source_kind, source ID, promotion_branch_path, the CF candidate (statement, scope, status, type), the scope-inflation analysis, the mystery-firewall verdict, the downstream-impact summary (this-story contradicting-branch count + cross-story contradicting-story count if scanned), the Rule 12 trace list (if hard_canon), and the contradiction-handling preference that will be applied on accept.

This gate is **absolute in EVERY `execution_mode`** (`authoring`, `interactive_runtime`, `batch_generation`) per FOUNDATIONS §Default Reality + Rule 6 — world-canon mutation is always an explicit user act; the player momentarily becomes the author at the moment of promotion. Auto Mode does not relax the gate. Mode affects only secondary ergonomics (proposal-package presentation density at Phase 8; mandatory-critic-output verbosity at Phase 7).

A separate, downstream HARD-GATE fires inside `canon-addition` itself when this skill hands off the proposal at Phase 9; that gate is canon-addition's responsibility, not this skill's. If `canon-addition` returns a non-accept verdict (REVISE_AND_RESUBMIT or REJECT), Phase 10 still writes the SP-NNNN ledger entry recording the outcome but performs no story-local source mutation.
</HARD-GATE>

## Process Flow

```
Pre-flight (validate world+story; per source_kind validate source ID exists;
            validate promotion_branch_path; allocate SP-NNNN; load context
            packet over relevant world canon; whole-class M load; load
            content_policy block)
      |
      v
Phase 1: Source Extraction
         (story_fact: load SF + walk branch_path + capture supporting prose)
         (mystery_resolution: load M + locate SE@resolving_page_id + verify
                              storylet's resolution_authority: canon_candidate)
         (character_arc_outcome: load STENT + STINT history along branch_path)
         (artifact_canonization: load story-local DA + creation/modification events)
      |
      v
Phase 2: CF Candidate Translation (laundering firewall)
         — assemble CF candidate matching FOUNDATIONS §CF Schema
         — source_basis.derived_from holds parent CF ids only (Option A);
           promotion provenance flows through SP ledger + CH reason + PA body
      |
      v
Phase 3: Distribution / Scope Inflation Check (Rule 4)
         — flag accidental globalization; user-justified widening allowed
           with cited additional evidence
      |
      v
Phase 4: Mystery Firewall Check (Rule 7, defense-in-depth)
         — HARD-REJECT M.status == forbidden
         — HARD-REJECT mystery_resolution where resolving storylet's
           resolution_authority != canon_candidate
         — verify resolution doesn't contradict M.disallowed_cheap_answers
         — reject prose that resolves an M-NNNN unintentionally
      |
      v
Phase 5: Downstream-Impact Analysis
         — within this story: scan every BR != promotion_branch_path;
           record contradiction list per branch
         — across stories (if cross_story_impact_scan: true): scan every
           other story's STORY_KERNEL + leaf state_snapshots
         — produces downstream_impact summary attached to proposal
      |
      v
Phase 6: Build Proposal Package
         (assembles proposal_package with cf_candidate, provenance,
          scope_inflation_check, mystery_firewall, downstream_impact,
          rule_12_two_trace_check, contradiction_handling_preference,
          content_policy)
      |
      v
Phase 7: Mandatory LLM Critics
         — Provenance Critic; Scope-Inflation Critic; Mystery-Firewall
           Critic; Downstream-Impact Critic; Rule 12 Two-Trace Critic
           (conditional on proposed_status: hard_canon)
         — synthesize critic reports into proposal_package
      |
      v
Phase 8: HARD-GATE Approval (this pipeline) → user accept/revise/reject
      |
      +--- accept ---> Phase 9: Hand Off to canon-addition
      |                         (writes proposal_package to
      |                          worlds/<slug>/stories/<slug>/story-promotions/
      |                          SP-NNNN-proposal-package.yaml; user separately
      |                          invokes canon-addition with that path —
      |                          worldloom skills are non-chaining)
      |                              |
      |                              v
      |                         (canon-addition runs Phases 0-15a; its own
      |                          HARD-GATE fires; on accept the engine writes
      |                          CF/CH + extensions + PA via patch plan)
      |                              |
      |                              v
      |                Phase 10: Post-Adjudication Ledger + Story-Side Effects
      |                         — write SP-NNNN.md (always)
      |                         — on accept: write superseding story-local
      |                           source record adding promoted_to_cf: CF-NNNN
      |                           (SF-NNNN superseder for story_fact;
      |                            STENT-NNNN superseder for character_arc;
      |                            story-local DA-NNNN superseder for artifact;
      |                            no superseding M record — M is world-level)
      |                         — apply contradiction_handling_preference to
      |                           contradicting branches (flag / leave / archive)
      |                              |
      |                              v
      |                         Phase 11: INDEX Updates
      |
      +--- revise --> loop to relevant Phase (1, 2, 3, or 5) per critique
      |
      +--- reject --> Phase 10: write SP-NNNN.md with outcome: REJECT;
                      no story-local mutation; halt (do NOT update INDEX
                      branch entries; SP entry still appears in INDEX
                      Promotions section per audit-trail integrity)
```

## Inputs

See frontmatter `arguments`. Per-source-kind required-set enforced at Pre-flight, not in YAML frontmatter (YAML has no per-source-kind required-set syntax).

## Output

| Class | File path | Created when |
|---|---|---|
| `SP-NNNN.md` (promotion ledger) | `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-NNNN.md` | Always — every Phase 8 outcome (accept / revise / reject / firewall-reject) writes a ledger entry. The ledger is the load-bearing audit trail. |
| `SP-NNNN-proposal-package.yaml` (canon-addition input) | `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-NNNN-proposal-package.yaml` | IF Phase 8 user-accept fires (the user separately invokes `canon-addition` with this path). |
| Superseding `SF-NNNN.yaml` | `worlds/<world-slug>/stories/<story-slug>/_source/facts/SF-NNNN.yaml` | IF source_kind == `story_fact` AND canon-addition returns an accept-flavored verdict (ACCEPT / ACCEPT_WITH_REQUIRED_UPDATES / ACCEPT_AS_LOCAL_EXCEPTION / ACCEPT_AS_CONTESTED_BELIEF). The superseder cites `supersedes: <original SF id>`, `promoted_to_cf: CF-NNNN`. |
| Superseding `STENT-NNNN.yaml` | `worlds/<world-slug>/stories/<story-slug>/_source/entities/STENT-NNNN.yaml` | IF source_kind == `character_arc_outcome` AND canon-addition returns accept-flavored. |
| Superseding story-local `DA-NNNN.yaml` | `worlds/<world-slug>/stories/<story-slug>/_source/artifacts/DA-NNNN.yaml` | IF source_kind == `artifact_canonization` AND canon-addition returns accept-flavored. The superseder carries `canon_status: promoted` + `promoted_to_world_da: DA-NNNN`. |
| World-level `DA-NNNN.md` | `worlds/<world-slug>/diegetic-artifacts/DA-NNNN.md` | IF source_kind == `artifact_canonization` AND canon-addition returns accept-flavored. Routed through canon-addition's `append_diegetic_artifact_record` patch op — NOT written directly by this skill. |
| Updated `worlds/<world-slug>/stories/<story-slug>/INDEX.md` | (existing file) | Always (per audit-trail integrity — even rejected SP entries appear in the Promotions section). New "Promotions" section + per-promotion entry; on accept, contradicting-branch entries flagged per `contradiction_handling_preference`. |
| Branch supersession (`BR-NNNN.yaml`) | `worlds/<world-slug>/stories/<story-slug>/_source/branches/BR-NNNN.yaml` | IF accept AND `contradiction_handling_preference ∈ {flag_contradicting_branches, archive_contradicting_branches}` for any contradicting branch — supersedes prior branch with `status: contradicted_by_promoted_canon` (flag) or `status: archived` (archive). |
| World-canon mutation transitively via canon-addition | `_source/canon/CF-NNNN.yaml`, `_source/change-log/CH-NNNN.yaml`, `adjudications/PA-NNNN-*.md`, plus `append_extension` / `append_touched_by_cf` / `append_modification_history_entry` ops on affected M/OQ/SEC/CF records | Routed by canon-addition through `mcp__worldloom__submit_patch_plan`. This skill never calls `submit_patch_plan` directly. |

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — read at Pre-flight; CF Record Schema (Phase 2 translation), Rule 4 (Phase 3 scope), Rule 7 (Phase 4 mystery firewall), Rule 6 (CH lineage in Phase 9 handoff), Rule 12 (Phase 7 two-trace critic), Default Reality clause (HARD-GATE absoluteness across execution_modes) all live there.
- `worlds/<world-slug>/WORLD_KERNEL.md` — read at Pre-flight; the world's narrative summary frames the CF candidate's plausibility for downstream LLM critics.
- `worlds/<world-slug>/ONTOLOGY.md` — read at Pre-flight; categories + relation types govern the CF candidate's `type` and the proposal's domain framing.
- `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` — read at Pre-flight; story-bundle context (counterfactual_mystery_mode, premise, cast) frames Phase 5 downstream-impact analysis.
- The source story-bundle record (per `source_kind`):
  - `worlds/<world-slug>/stories/<story-slug>/_source/facts/SF-<id>.yaml` (story_fact)
  - `worlds/<world-slug>/stories/<story-slug>/_source/entities/STENT-<id>.yaml` (character_arc_outcome)
  - `worlds/<world-slug>/stories/<story-slug>/_source/artifacts/DA-<id>.yaml` (artifact_canonization)
  - `worlds/<world-slug>/stories/<story-slug>/_source/events/SE-<resolving>.yaml` + the resolving page's selected `SLT-NNNN.yaml` (mystery_resolution — to verify `M_resolution_claims.resolution_authority: canon_candidate`)
- World canon retrieval via `mcp__worldloom__get_context_packet(task_type='story_fact_promotion_to_canon', world_slug=<slug>, seed_nodes=[<source-relevant CFs+Ms+INVs+OQs>], token_budget=8000)` — the registered profile delivers reserve-priority full bodies for invariants and mystery_reserve (mystery firewall is a hard-reject gate; partial reads cannot meet that bar). If the packet returns `delivery_status='persisted_with_summary'`, use `governing_summary` inline, `mcp__worldloom__get_records(record_ids=[...], world_slug=<slug>)` for known CF / INV / M / OQ id sets, and `mcp__worldloom__get_persisted_packet_slice(persisted_path=task_header.persisted_output_path, slice_path='<dot-path>')` when the persisted packet's ranked layer context is needed.
- Whole-class M load via `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` at Phase 4 — Mystery Firewall is class-bounded by this skill's Canon Safety Check commitments (per FOUNDATIONS §Tooling Recommendation §Whole-class enumeration is a legitimate primary loading pattern); every `forbidden`-status M must be tested against the source whether or not the source mentions it.
- Page-prose retrieval along `promotion_branch_path` via direct `Read` of `worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-*.md` — Phase 1 gathers supporting prose excerpts that the proposal_package surfaces as evidence (the page-prose surface is not under any `_source/` and not under context-packet retrieval; direct read is the established pattern from `branching-story-page-cycle` Phase 1).
- Branch-leaf state_snapshots via `mcp__worldloom__get_record(record_id)` for each `BR-NNNN.yaml` and the leaf `PG-NNNN.yaml` it cites — Phase 5 walks every BR != `promotion_branch_path` to detect contradictions.
- (Conditional) cross-story state_snapshots: when `cross_story_impact_scan: true`, enumerate `worlds/<world-slug>/stories/*/` directories at Phase 5 and load each story's STORY_KERNEL + leaf BRs via the same pattern.
- `content_policy` block (NC-21 verbatim from §Phase 1 prompt-assembly framing) loaded into the prompt-assembly context for downstream LLM critics (Phase 7) and for the proposal_package handoff (canon-addition runs its own LLM critics that inherit the policy).

## Pre-flight Check

Before any pipeline phase:

1. Load `docs/FOUNDATIONS.md` into working context — CF schema, Rules 4/6/7/12, Default Reality, Change Control Policy.
2. Resolve `worlds/<world-slug>/` from the `world_slug` argument. Abort if missing → instruct user to run `create-base-world` first.
3. Resolve `worlds/<world-slug>/stories/<story-slug>/` from the `story_slug` argument. Abort if missing → instruct user to run `branching-story-bootstrap` first.
4. Validate the source ID exists per `source_kind`:
   - `story_fact` → require `source_sf_id`; `worlds/<world-slug>/stories/<story-slug>/_source/facts/SF-<id>.yaml` exists.
   - `mystery_resolution` → require `source_m_id` AND `resolving_page_id`; `worlds/<world-slug>/_source/mystery-reserve/M-<id>.yaml` exists in world canon AND a resolving `SE-NNNN` at `resolving_page_id` exists AND its selected storylet declared `M_resolution_claims` with `resolution_authority: canon_candidate` for this M (verified by loading the page's `selected_storylet_id` → `worlds/<world-slug>/stories/<story-slug>/_source/storylets/SLT-<id>.yaml`).
   - `character_arc_outcome` → require `source_stent_id` AND `source_branch_leaf_page` AND `arc_outcome_summary`; `worlds/<world-slug>/stories/<story-slug>/_source/entities/STENT-<id>.yaml` exists; the leaf PG exists.
   - `artifact_canonization` → require `source_diegetic_artifact_id` AND `source_branch_leaf_page`; `worlds/<world-slug>/stories/<story-slug>/_source/artifacts/DA-<id>.yaml` exists; the leaf PG exists.
5. Validate `promotion_branch_path` is a real chain — every `PG-NNNN` exists; the chain is parent-traversable; the terminal page exists (leaf or specified non-leaf).
6. Allocate `SP-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, 'SP', story_slug=<story_slug>)`.
7. Load world canon via `mcp__worldloom__get_context_packet(task_type='story_fact_promotion_to_canon', world_slug=<slug>, seed_nodes=[<source-relevant CFs+Ms+INVs+OQs>], token_budget=8000)`. If it returns `delivery_status='persisted_with_summary'`, recover through `governing_summary`, `get_records(record_ids=[...])`, and `get_persisted_packet_slice(persisted_path=task_header.persisted_output_path, slice_path='<dot-path>')` instead of reading the raw persisted JSON into the main context.
8. Load whole-class M for the Phase 4 mystery firewall: `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)`. Mystery Firewall is class-bounded — partial loads cannot satisfy the `forbidden`-status hard-reject discipline.
9. Confirm the content_policy block (NC-21 verbatim per the source proposal §Content Policy) is loaded for downstream LLM critic prompts and the proposal-package handoff.

If any step fails, the skill aborts before Phase 1 and emits no SP ledger entry (the failure is a pre-flight failure, not a promotion outcome).

## Phase 1: Source Extraction

Load the source record and its provenance per `source_kind`. The content_policy block (NC-21 verbatim) is loaded into the prompt-assembly context — propagates to Phase 7 critics and to the proposal_package handed to canon-addition.

### `source_kind == story_fact`
- Load `SF-<id>.yaml`: `subject`, `predicate`, `object`, `epistemic_class`, `truth_value`, `certainty`, `known_by`, `believed_by`, `derived_from_cf`, `canon_relation`, `evidence`.
- Walk the SF's branch_path via `created_at_page` → `parent_page_id` chain (cross-checked against `promotion_branch_path` argument; mismatch → abort with "source SF was not introduced on the cited promotion branch — supersession history may have moved it; re-confirm").
- Capture supporting prose excerpts from `worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-*.md` along the branch — the LLM-rendered moments where this fact was established / corroborated / acted upon.

### `source_kind == mystery_resolution`
- Load `M-<id>.yaml` from world canon: `status`, `future_resolution_safety`, `known_facts`, `unknown_facts`, `disallowed_cheap_answers`.
- Locate `SE-NNNN` at `resolving_page_id` whose effects resolved the M; verify the selected storylet's `M_resolution_claims` for this M declared `resolution_authority: canon_candidate` (defense-in-depth re-check; Phase 4 hard-rejects if `apparent` or `branch_local_counterfactual`).
- Capture the resolution event details + supporting prose excerpts from the resolving page and the page that emitted the choice.

### `source_kind == character_arc_outcome`
- Load `STENT-<id>.yaml` (story-local entity record) and its full `STINT` history along `promotion_branch_path` (one STINT per PG where the character's intentions/beliefs/relationships shifted — load via `mcp__worldloom__get_record` per STINT id).
- Identify the load-bearing transformation (what changed from STINT-0001 to STINT-leaf): goals shifted, secrets exposed, relationships inverted, social position changed, etc.
- Capture the events along the branch that drove the change.
- The world-level `CHAR-NNNN` dossier remains the durable world record; the STENT is what evolved. The `arc_outcome_summary` argument carries the user's natural-language framing.

### `source_kind == artifact_canonization`
- Load the in-story `DA-<id>.yaml` from `worlds/<world-slug>/stories/<story-slug>/_source/artifacts/`: `artifact_type`, `title`, `in_world_author`, `in_world_date`, `truth_register`, `content`, `known_by`, `created_at_page`, plus any superseding records.
- Identify what makes this artifact canon-worthy (it influenced narrative outcomes; it has clear authorship; it would plausibly persist in-world after the branch's events).
- Capture the events that created or modified it.
- On accept (Phase 10): a new world-level `worlds/<world-slug>/diegetic-artifacts/DA-NNNN.md` is created via canon-addition's `append_diegetic_artifact_record` patch op; the story-local DA gets a superseding record with `canon_status: promoted` and `promoted_to_world_da: <new world-DA id>`.

## Phase 2: CF Candidate Translation (Laundering Firewall)

The branch is **EVIDENCE**, not **AUTHORITY**. The fact happened in a particular branch of a particular story. World canon may now want to incorporate it because the user (the world's author) has decided this branch's outcome reflects the world's truth. The translation must explicitly carry that framing without inflating the source record into world authority.

Convert the source into a CF candidate matching `templates/canon-fact-record.yaml` and FOUNDATIONS §Canon Fact Record Schema. The CF YAML literal carries `source_basis.derived_from: []` (CF id list ONLY per FOUNDATIONS schema — the promotion provenance does NOT inflate this field).

**Schema reconciliation (Option A)**: the promotion provenance (story_slug, branch_path, source_record id, supporting_pages) does NOT inflate `source_basis.derived_from`. Provenance flows through three load-bearing surfaces instead:

1. The SP-NNNN ledger (Phase 10 — full structured record).
2. The CH Change Log Entry's `reason` and `notes` fields (canon-addition emits the CH on accept).
3. The PA adjudication record's `body_markdown` Phase 0 sub-section (canon-addition's standard pattern).

Rule 6 (No Silent Retcons) is satisfied through the SP+CH+PA triad — losing any one breaks Rule 6 enforcement; the triad is structurally redundant. The CF `notes` field carries the structured promotion paragraph as a human-readable cross-reference; the structured trail lives in SP+CH+PA.

See `templates/canon-fact-record.yaml` for the full CF candidate schema and field conventions.

## Phase 3: Distribution / Scope Inflation Check (Rule 4)

FOUNDATIONS Rule 4: No Globalization by Accident. A story-local outcome must not silently become world-global.

### Checks
- If the source SF was branch-local (`canon_relation: not_applicable` AND `known_by` ≤ 2 STENTs), the proposed CF MUST NOT carry `scope.geographic: global` unless the user explicitly elevates AND the elevation cites additional world-state evidence in the proposal.
- If the source involved cast members from a single faction / region / period, the proposed CF must reflect that scoping.
- If the source SF's `known_by` was small (≤ 2 cast), the CF's `truth_scope.diegetic_status` should be `believed` or `disputed`, not `objective` — unless evidence in the story established broader awareness.
- For `character_arc_outcome`: the CF's scope MUST reflect the cast member's actual social/geographic reach, not the dramatic weight of the arc.

### Auto-Adjustment
The pipeline proposes scope adjustments. The user reviews in Phase 8 HARD-GATE.

### Hard Cases
- **Scope expansion request** (user wants the source promoted at broader scope than the story established): permitted, but the proposal MUST cite the additional evidence the user is providing for the wider scope. canon-addition's Phase 1 Scope Detection re-runs and adjudicates whether the evidence is sufficient.
- **Scope inflation by accident** (the source supports only narrow scope but the proposal claims wider): rejected at this phase; the user is asked to either narrow the scope OR provide additional evidence (loop to Phase 2).

## Phase 4: Mystery Firewall Check (Rule 7, defense-in-depth)

For `source_kind == mystery_resolution`:
- Verify `M.status ∈ {active, passive}` AND `M.future_resolution_safety ∈ {low, medium, high}` — `forbidden` is HARD-REJECT (writes SP-NNNN with `outcome: REJECT (firewall — forbidden M)` and halts).
- Verify the resolution event's storylet declared `M_resolution_claims` with `resolution_authority: canon_candidate` for this M. If `apparent` or `branch_local_counterfactual`: HARD-REJECT with "the storylet that fired claimed branch-local authority; canon promotion requires re-routing through a `canon_candidate`-authority storylet first" (writes SP-NNNN with `outcome: REJECT (firewall — wrong authority)` and halts).
- Verify the resolution does not contradict the M's `disallowed_cheap_answers` list — semantic check (LLM critic at Phase 7 re-verifies; Phase 4 catches the obvious cases).

For other `source_kind` values, scan the source for accidental M-NNNN touch (using the whole-class M load from Pre-flight):
- If the source SF or character arc or artifact is described in a way that resolves an M-NNNN unintentionally → HARD-REJECT with "the source implies resolution of M-NNNN unintentionally; remove the implication OR explicitly route as `mystery_resolution`" (writes SP-NNNN with `outcome: REJECT (firewall — accidental M touch)` and halts).

### Branch-Local Resolutions Stay Local

A branch-local resolution (storylet declared `apparent` or `branch_local_counterfactual` authority) does NOT route through this pipeline. Such resolutions remain in the branch as SFs with `epistemic_class: apparent` or `canon_relation: canon_divergent`. They are valid story-engine state but they do not become world canon.

If the user later decides a branch's apparent resolution should become world canon, they must invoke this pipeline explicitly with `source_kind: mystery_resolution`, naming a resolving event whose storylet authorized canon-candidate resolution. (If no such event exists in the branch's history, the user must run `branching-story-page-cycle` again on a chosen page with a new storylet that declares canon-candidate authority — a deliberate authorial act, not a side effect of routine play.)

## Phase 5: Downstream-Impact Analysis

Scan all OTHER branches in this story (and optionally other stories in this world) for state that would contradict the new CF.

### Within This Story

For every `BR-NNNN` in this story bundle (other than the branch ending at `promotion_branch_path`):
- Walk the branch's leaf state_snapshot (load via `get_record(<leaf PG-id>)` and read `state_snapshot`).
- For each SF in `objective_facts`, `apparent_facts`, `disputed_facts`, and `belief_state_by_actor[*]`: would the new CF contradict it? (Apparent and belief contradictions are typically softer — the branch may legitimately contain a false belief or apparent claim that contradicts the world's now-canonical fact; the user can choose `flag` rather than `archive` for these cases.)
- For each open `OBL-NNNN`: does the new CF resolve it inconsistently with how this branch is resolving it?
- For each pending `CNSQ-NNNN`: does the new CF make the consequence incoherent or pre-emptively addressed?
- For each `SREL-NNNN` in `relationships_current`: does the new CF make the relationship state incoherent?
- For each cast member's `STINT-NNNN`: does the new CF make their goals or beliefs incoherent?

For each contradicting branch, record:
- branch leaf ID
- nature of contradiction
- recommended handling (per `contradiction_handling_preference`)

### Across Stories (if `cross_story_impact_scan: true`)

For every other story under `worlds/<world-slug>/stories/`:
- Enumerate via `worlds/<world-slug>/stories/*/STORY_KERNEL.md` glob.
- For each: load STORY_KERNEL + leaf state_snapshots.
- Check for contradictions.
- Record findings (cross-story contradictions are always handled with `flag` — never auto-archive across stories).

### Output

`downstream_impact` summary attached to the proposal_package (per the Phase 6 schema in `templates/proposal-package.yaml`).

## Phase 6: Build Proposal Package

Assemble the package canon-addition will receive at Phase 9 handoff. See `templates/proposal-package.yaml` for the full schema; required sections:

- `promotion_id`, `source_kind`, `source_record`, `promotion_branch_path`
- `cf_candidate` — full CF candidate from Phase 2 (matches `templates/canon-fact-record.yaml` + FOUNDATIONS schema)
- `provenance` — story id, story_slug, world_slug, branch_path, supporting_pages, supporting_prose_excerpts
- `scope_inflation_check` — proposed_scope, source_scope, inflation_detected, user_justification_for_widening
- `mystery_firewall` — is_mystery_resolution, M_resolved, M_resolution_safety, M_disallowed_cheap_answers_check
- `downstream_impact` — full Phase 5 summary (this_story + cross_story)
- `rule_12_two_trace_check` — proposed_status, if_hard_canon, traces_required, traces_provided, rule_12_check
- `contradiction_handling_preference`
- `cross_story_impact_scan_performed`
- `execution_mode`
- `content_policy` — NC-21 block (propagates to canon-addition's downstream LLM critics)

The package is assembled in memory at this phase; it is NOT yet written to disk (the disk write happens at Phase 9 only on Phase 8 user-accept).

## Phase 7: Mandatory LLM Critics

Run five critics (Rule 12 critic conditional on `proposed_status: hard_canon`):

| Critic | Question | PASS condition |
|---|---|---|
| **Provenance Critic** | Is the branch_path complete? Are supporting pages cited? Does each cited page exist on this branch? Does the source record's `created_at_page` lie on the branch? | All evidence cited; chain validates; source on-branch. |
| **Scope-Inflation Critic** | Is the proposed scope justified by the source? If wider, is the user's justification sufficient? Does the proposed `truth_scope.diegetic_status` match the source's `known_by` reach? | No silent inflation; widening (if any) is cited and credible. |
| **Mystery-Firewall Critic** | Is the resolution authorized? Does it overlap any M's `disallowed_cheap_answers` list semantically (not just exact-string)? Does any other M (not the resolution target) get touched accidentally? | No semantic overlap with disallowed answers; no accidental M touch. |
| **Downstream-Impact Critic** | Are contradicting branches all enumerated? Are recommended_handling choices appropriate (not over-archiving, not under-flagging)? Cross-story scan complete (if requested)? | Enumeration matches the actual scan; handling recommendations appropriate. |
| **Rule 12 Two-Trace Critic** (conditional on `proposed_status: hard_canon`) | If hard_canon, are sufficient register-traces provided? Are the registers structurally distinct (e.g., not "law" + "decree" — both bureaucratic)? | ≥ 2 distinct registers cited with concrete in-world evidence. |

Each critic produces a `verdict: PASS | FAIL` with a one-line rationale (bare PASS treated as FAIL). The synthesis appends critic reports to the proposal_package in a `critic_reports[]` field. Any FAIL → loop back to the relevant earlier phase (Provenance fail → Phase 1; Scope-Inflation fail → Phase 3; Mystery-Firewall fail → Phase 4; Downstream-Impact fail → Phase 5; Rule 12 fail → Phase 2 to downgrade `status` OR Phase 8 to accept the trace risk explicitly).

The synthesized proposal_package (with critic reports) is the input to Phase 8.

## Phase 8: HARD-GATE Approval (this pipeline)

Present the proposal_package summary to the user. **The HARD-GATE fires here, absolute in every `execution_mode`** (per the top-of-file HARD-GATE block).

### Presentation Format

Under `execution_mode: authoring` (default), present the full summary:

```
PROMOTION PROPOSAL: SP-NNNN

Source: <source_kind> — <source ID>
Branch: <promotion_branch_path> (leaf: <PG-NNNN>)
Story: <story_slug> in <world_slug>

CF CANDIDATE:
- Title: <title>
- Statement: <statement>
- Type: <type>
- Status: <hard_canon | soft_canon | contested_canon | mystery_reserve>
- Scope: geographic=<...> / temporal=<...> / social=<...>
- Truth scope: world_level=<...> / diegetic_status=<...>
- Domains affected: [...]
- Distribution: who_can_do_it=[...] / who_cannot_easily=[...] / why_not_universal=[...]
- Costs and limits: [...]
- Visible consequences: [...]
- Required world updates: [...]

SCOPE INFLATION CHECK:
- Source supports: <inferred scope>
- Proposal claims: <proposed scope>
- Inflation: <detected | none>
- Justification (if widening): <user-provided text>

MYSTERY FIREWALL:
- Is mystery resolution: <yes | no>
- M target: <M-NNNN | n/a>
- M resolution safety: <low | medium | high | n/a>
- Disallowed-cheap-answers semantic check: <pass | fail>
- Firewall verdict: <pass | hard-rejected — <reason>>

DOWNSTREAM IMPACT:
- This story:
  - <count> contradicting branches: <list with leaf + nature>
  - Affected threads: [THR-NNNN, ...]
  - Recommended handling: <flag | leave | archive> (per contradiction_handling_preference)
- Cross-story:
  - Scan performed: <yes | no>
  - <count> contradicting stories: <list>
  - Recommended handling: flag (always — never auto-archive across stories)

RULE 12 TWO-TRACE CHECK (if hard_canon):
- Traces provided: <list of (register, evidence) pairs>
- Verdict: <pass | fail | n/a>

CRITIC REPORTS:
- Provenance: <PASS — rationale>
- Scope-Inflation: <PASS — rationale>
- Mystery-Firewall: <PASS — rationale>
- Downstream-Impact: <PASS — rationale>
- Rule 12 Two-Trace: <PASS — rationale | n/a>

NEXT: hand off to canon-addition. The proposal_package will be written to:
  worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-NNNN-proposal-package.yaml
And you will then invoke canon-addition with that path:
  canon-addition world_slug=<slug> proposal_path=<path>
canon-addition runs its own HARD-GATE before any world-canon mutation.
```

Under `execution_mode: interactive_runtime`: collapse the per-section detail into a 5-line summary (CF statement + scope + status + downstream-impact count + critic-PASS roll-up); the HARD-GATE itself fires identically. Under `execution_mode: batch_generation`: same compressed presentation; the HARD-GATE fires identically.

### User Options

- **ACCEPT** → proceed to Phase 9.
- **REVISE — narrower scope** → re-run Phase 3 with adjusted CF candidate; re-emit Phase 6 package; re-run Phase 7 critics; re-present Phase 8.
- **REVISE — change status** (e.g., `contested_canon` instead of `hard_canon`) → adjust CF candidate at Phase 2; if `hard_canon` → other, the Rule 12 critic becomes n/a; re-emit Phase 6 package; re-present Phase 8.
- **REVISE — different source** (e.g., promote a different SF instead) → restart from Phase 1 with new source argument.
- **REJECT** → write SP-NNNN ledger entry recording the rejection (Phase 10 still fires for ledger-write-only path); halt.

## Phase 9: Hand Off to canon-addition

This phase fires only on Phase 8 ACCEPT.

### Step 1: Persist the proposal_package

Write the proposal_package to `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-NNNN-proposal-package.yaml`. This is a direct `Write` (the path is not under `_source/<subdir>/*.yaml`, so Hook 3 does not match — same posture as `branching-story-page-cycle` Phase 11).

### Step 2: Tell the user to invoke canon-addition

Present the canon-addition invocation command and the proposal_path:

```
HANDOFF TO canon-addition:

Run the following command separately to invoke canon-addition with this proposal:

  /canon-addition world_slug=<slug> proposal_path=worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-NNNN-proposal-package.yaml

canon-addition will:
  - Run its own Phases 0-11 (Normalize, Scope, Invariants, Capability,
    Prerequisites, Diffusion, Consequence Propagation, Counterfactual,
    Contradiction Classification, Repair, Narrative Fit, Verdict)
  - Fire its own HARD-GATE before submitting the patch plan
  - On accept: assemble and submit the patch plan creating CF/CH + extensions
    + PA via mcp__worldloom__submit_patch_plan
  - On non-accept: emit a PA-only patch plan with verdict and rationale

After canon-addition completes, return here with the canon-addition outcome
(verdict + resulting CF id if accepted + PA id) so this skill can run Phase 10
(SP ledger + story-side-effects + INDEX updates).
```

### Step 3: Pause for user

Worldloom skills are non-chaining — this skill does NOT invoke canon-addition itself. The user runs canon-addition separately. When the user returns with the canon-addition outcome (verdict + CF id + PA id), the skill resumes at Phase 10.

## Phase 10: Post-Adjudication Ledger + Story-Side Effects

This phase fires regardless of canon-addition outcome (accept-flavored, REVISE_AND_RESUBMIT, or REJECT) AND regardless of Phase 8 outcome (the firewall-reject path from Phase 4 also enters Phase 10 to write the ledger). The ledger is the load-bearing audit trail — `branching-story-health-audit`'s Phase 3 Mystery Firewall Integrity check + Phase 4 Canon-Baseline Drift check both rely on SP entries existing for every promotion attempt.

### Step 1: Write SP-NNNN.md (always)

Direct `Write` to `worlds/<world-slug>/stories/<story-slug>/story-promotions/SP-NNNN.md` per `templates/story-promotion-ledger.md`. Required sections: outcome (this-pipeline + canon-addition), provenance, scope and status, downstream impact handling, story-local source record reference, mandatory critic verdicts, canon-addition adjudication summary, notes.

### Step 2: Story-Local Source Update (on accept-flavored verdicts only)

If canon-addition returned ACCEPT / ACCEPT_WITH_REQUIRED_UPDATES / ACCEPT_AS_LOCAL_EXCEPTION / ACCEPT_AS_CONTESTED_BELIEF, append a new superseding record to the story's source. The story-local source is NEVER deleted; story-local truth and world-level truth are tracked separately even after promotion. Per source_kind:

**story_fact**: write `worlds/<world-slug>/stories/<story-slug>/_source/facts/SF-<new-id>.yaml` allocated via `mcp__worldloom__allocate_next_id(world_slug, 'SF', story_slug=<story_slug>)`:

```yaml
id: SF-<new-id>
story_id: STORY-NNNN
logical_id: <original SF logical_id>
supersedes: <original SF id>
created_at_page: <leaf of promotion_branch_path>
promoted_to_cf: CF-NNNN
# all other fields inherited from original SF
```

**character_arc_outcome**: write `worlds/<world-slug>/stories/<story-slug>/_source/entities/STENT-<new-id>.yaml` allocated via the same allocator pattern:

```yaml
id: STENT-<new-id>
story_id: STORY-NNNN
supersedes: <original STENT id>
created_at_page: <source_branch_leaf_page>
promoted_to_cf: CF-NNNN
arc_outcome_promoted_summary: "<arc_outcome_summary argument>"
# all other fields inherited from original STENT
```

**artifact_canonization**: write `worlds/<world-slug>/stories/<story-slug>/_source/artifacts/DA-<new-story-id>.yaml`:

```yaml
id: DA-<new-story-id>
story_id: STORY-NNNN
supersedes: <original story-local DA id>
created_at_page: <source_branch_leaf_page>
canon_status: promoted
promoted_to_cf: CF-NNNN
promoted_to_world_da: <new world-DA id from canon-addition's append_diegetic_artifact_record op>
# all other fields inherited from original story-local DA
```

**mystery_resolution**: NO superseding M record (M-NNNN is world-level, not story-local — canon-addition's CF/CH already extends the M's `extensions[]` via `append_extension` op). The promotion link is preserved in the SP ledger + the new CF's `notes` + the PA adjudication.

### Step 3: Contradiction Handling (on accept-flavored verdicts only)

If accepted AND `contradiction_handling_preference != leave_branches_alone`:

**For each contradicting branch in this story** (per Phase 5 enumeration):
- `flag_contradicting_branches`: write a superseding `BR-NNNN.yaml` allocated via `mcp__worldloom__allocate_next_id(world_slug, 'BR', story_slug=<story_slug>)` with `supersedes: <original BR id>`, `status: contradicted_by_promoted_canon`, `contradicted_by_sp: SP-NNNN`, `contradicted_by_cf: CF-NNNN`. The branch may continue (page-cycle ticks remain valid) but every subsequent INDEX render shows the flag.
- `archive_contradicting_branches`: write a superseding `BR-NNNN.yaml` with `status: archived`, `archived_by_sp: SP-NNNN`, `archived_by_cf: CF-NNNN`. Future page-cycle invocations on this branch are blocked (`branching-story-page-cycle` Pre-flight reads BR.status and aborts on `archived`). Use sparingly per the source proposal — branches are usually preserved as counterfactuals rather than archived.

**For each contradicting cross-story** (if scan was performed): always emit a `flag` action via the cross-story's own BR supersession (write a superseding BR in the OTHER story's `_source/branches/`); never auto-archive across stories.

### Step 4: World-Canon Propagation Note (informational, not a write action)

Once a CF is accepted, it becomes part of world canon and propagates freely to every branch's subsequent page-cycle ticks via `branching-story-page-cycle`'s Pre-flight world-canon retrieval. This is the design: world canon is universal across branches because canon is what the *world* is.

Promotion does NOT mutate any existing page's `state_snapshot` in place (records are append-only). It does NOT add a `canon_sync` event op to any branch retroactively. It DOES change what world canon any branch's *next* page-cycle tick will retrieve. Branches whose existing SFs contradict the new CF remain valid as branch-local counterfactuals; the contradiction is surfaced via the contradiction-handling preference above (Step 3), not silently masked.

### Step 5: On Rejection

If Phase 4 firewall-rejected OR Phase 8 user-rejected OR canon-addition returned REJECT:
- SP-NNNN.md is written (Step 1) with the appropriate `outcome` field.
- Steps 2 and 3 are skipped (no story-local mutation; no contradicting-branch flagging).
- Story may continue as before.

## Phase 11: INDEX Updates

Update `worlds/<world-slug>/stories/<story-slug>/INDEX.md` (direct `Edit` — not under any HARD-GATE-protected surface):

- Add or extend a top-level `## Promotions` section listing this SP-NNNN entry with its outcome (linked to the SP file).
- For each contradicting branch flagged or archived in Phase 10 Step 3: add a marker to the branch's existing INDEX entry ("⚠ contains state contradicting CF-NNNN promoted at SP-NNNN" for flagged; "⊘ archived per SP-NNNN canon promotion" for archived).
- For accept-flavored outcomes that created a world-level DA-NNNN (artifact_canonization): cross-link to `worlds/<world-slug>/diegetic-artifacts/INDEX.md` (canon-addition's downstream emission updates that index automatically; this skill records the cross-reference in the story INDEX).

If `cross_story_impact_scan: true` AND a top-level `worlds/<world-slug>/stories/INDEX.md` exists: append the SP-NNNN entry there too with cross-story-impact note.

For firewall-reject and user-reject outcomes: SP-NNNN appears in the `## Promotions` section (the audit trail must be visible) but no contradicting-branch flagging happens.

Do NOT `git commit`.

## Validation Rules This Skill Upholds

- **Rule 1: No Floating Facts** — enforced at Phase 2 — the CF candidate template requires every structural field (`statement`, `scope`, `truth_scope`, `domains_affected`, `prerequisites`, `distribution`, `costs_and_limits`, `visible_consequences`, `required_world_updates`, `source_basis`); a candidate missing any of these is rejected before Phase 7. Re-enforced downstream by canon-addition's Phase 14a Test 2 (`rule1_no_floating_facts` validator).
- **Rule 4: No Globalization by Accident** — enforced at Phase 3 (Distribution / Scope Inflation Check) — branch-local sources cannot silently elevate to `scope.geographic: global` without user-cited additional evidence; the Scope-Inflation Critic at Phase 7 re-verifies. Re-enforced downstream by canon-addition's Phase 1 Scope Detection + Phase 14a Test 3.
- **Rule 6: No Silent Retcons** — enforced at Phase 9 + Phase 10 — every promotion flows through canon-addition's CH Change Log Entry (canon-addition's accept branch emits `create_ch_record`); the SP-NNNN ledger is a parallel story-side audit trail; the PA adjudication record carries the full proposal_package as evidence. The promotion provenance triad (SP + CH + PA) makes silent retcon structurally impossible — no story-local fact reaches world canon without three independent audit surfaces. Re-enforced downstream by canon-addition's Phase 14a Test 5 (`rule6_no_silent_retcons` + `modification_history_retrofit`).
- **Rule 7: Preserve Mystery Deliberately** — enforced at Phase 4 (Mystery Firewall Check) AND Phase 7 (Mystery-Firewall Critic) — `forbidden`-status M is HARD-REJECT (writes SP ledger with firewall-reject outcome and halts); non-`canon_candidate` resolution authority is HARD-REJECT; `disallowed_cheap_answers` semantic check fires twice (Phase 4 structural, Phase 7 semantic). Whole-class M load at Pre-flight powers per-claim cross-checks. Re-enforced downstream by canon-addition's Phase 14a Test 6 (`rule7_mystery_reserve_preservation` validator).
- **Rule 12: No Single-Trace Truths** — enforced at Phase 7 (Rule 12 Two-Trace Critic, conditional on `proposed_status: hard_canon`) — at least two distinct register traces required from the permissible enum (law / ritual / architecture / slang / ledgers / funerary / landscape / scars / songs / maps / educational / bureaucratic), structurally distinct (not "law" + "decree"). Re-enforced downstream by canon-addition's Phase 14a Test 12 (`rule12_redundancy` validator).

## Record Schemas

- Canon Fact Record (CF candidate at Phase 2) → see `templates/canon-fact-record.yaml` (structurally identical to FOUNDATIONS §Canon Fact Record Schema). canon-addition emits the actual `_source/canon/CF-NNNN.yaml` via `create_cf_record` patch op.
- Change Log Entry (CH at canon-addition Phase 13a) → see `templates/change-log-entry.yaml`. This skill does NOT emit CH records directly — canon-addition emits them via `create_ch_record` patch op on accept. The promotion provenance flows into CH `reason` and `notes` via the proposal_package handoff at Phase 9.
- Story Promotion Ledger (SP-NNNN.md) → see `templates/story-promotion-ledger.md` (markdown template; this skill writes directly via `Write` since the path is outside Hook 3's `_source/<subdir>/*.yaml` pattern).
- Proposal Package (SP-NNNN-proposal-package.yaml) → see `templates/proposal-package.yaml` (the Phase 6 schema serialized as canon-addition's `proposal_path` input; downstream-consumer parity preserved — canon-addition's Phase 0 parses the embedded `cf_candidate` block directly).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (§"non-negotiable") | Pre-flight | Loads FOUNDATIONS.md + WORLD_KERNEL.md + ONTOLOGY.md + STORY_KERNEL.md + source story-bundle record + world canon via `mcp__worldloom__get_context_packet(task_type='story_fact_promotion_to_canon')`. Whole-class M load via `mcp__worldloom__list_records(record_type='mystery_record', include_full_body=true)` powers Phase 4 firewall (per FOUNDATIONS §Whole-class enumeration is a legitimate primary loading pattern — Mystery Firewall is class-bounded). |
| Default Reality (FOUNDATIONS §Core Principle) | HARD-GATE (Phase 8) | The Phase 8 HARD-GATE is **absolute in EVERY `execution_mode`** — world-canon mutation is always an explicit user act per FOUNDATIONS §Default Reality. Auto Mode does not relax the gate. |
| Canon Layering | Phase 2 + Phase 3 | The CF candidate's `status` (hard / soft / contested / mystery_reserve) and `truth_scope.diegetic_status` (objective / believed / disputed / propagandistic / legendary) are explicitly chosen at Phase 2; Phase 3 enforces the appropriate layer for the source's reach (small `known_by` → `believed`/`disputed`, not `objective`). The story-bundle layer remains story-local; promotion is the lawful bridge to the world layer. |
| Rule 1: No Floating Facts | Phase 2 | CF candidate template enforces every structural field; canon-addition's `rule1_no_floating_facts` validator re-checks at Phase 14a Test 2. |
| Rule 2: No Pure Cosmetics | Phase 2 | CF candidate's `domains_affected` requires at least one entry from FOUNDATIONS §Rule 2 enumeration (extended runtime via `mcp__worldloom__get_canonical_vocabulary({class: 'domain'})`); canon-addition's `rule2_no_pure_cosmetics` validator re-checks at Phase 14a Test 1. |
| Rule 3: No Specialness Inflation | Phase 7 (Scope-Inflation Critic) | Per FOUNDATIONS §Rule 3, "do not repeatedly add exceptional elements that behave as if they have no impact on the ordinary world." The Scope-Inflation Critic catches CF candidates whose statement leans on unmotivated `#1`/`most`/`world-first` claims; canon-addition's Phase 14a Test 10 (judgment-only) is the downstream catchment. |
| Rule 4: No Globalization by Accident | Phase 3 + Phase 7 (Scope-Inflation Critic) | Phase 3 structural check + Phase 7 semantic critic. canon-addition's Phase 1 Scope Detection + Phase 14a Test 3 re-check. |
| Rule 5: No Consequence Evasion | Phase 2 + Phase 5 | CF candidate's `visible_consequences` field is required (first-order); Phase 5 Downstream-Impact Analysis enumerates second-order effects across branches. canon-addition's Phase 6 Consequence Propagation across 13 exposition domains is the load-bearing downstream world-scope enforcement. |
| Rule 6: No Silent Retcons | Phase 9 + Phase 10 + (downstream) canon-addition Phase 13a | Triple-redundant audit: SP-NNNN ledger (Phase 10) + CH-NNNN Change Log (canon-addition) + PA-NNNN adjudication (canon-addition). The story-local source record's superseding entry adds `promoted_to_cf: CF-NNNN` (Phase 10 Step 2) — the link is recorded, not erased. Story-local truth and world-level truth are tracked separately even after promotion. |
| Rule 7: Preserve Mystery Deliberately | Phase 4 + Phase 7 (Mystery-Firewall Critic) | Phase 4 hard-rejects `forbidden`-status M and non-`canon_candidate` resolution authority. Phase 7 Mystery-Firewall Critic semantically checks `disallowed_cheap_answers` overlap. Whole-class M load at Pre-flight (per FOUNDATIONS §Whole-class enumeration). canon-addition's `rule7_mystery_reserve_preservation` validator re-checks downstream. |
| Rule 11: No Spectator Castes by Accident | (downstream) canon-addition Phase 14a Test 11 | This skill does not enforce Rule 11 directly — the CF candidate carries `distribution.who_can_do_it` / `who_cannot_easily_do_it` / `why_not_universal` (which Rule 11 evaluates), but the per-CF leverage-form audit lives in canon-addition's `rule11_action_space` validator (mechanical) + judgment layer. |
| Rule 12: No Single-Trace Truths | Phase 7 (Rule 12 Two-Trace Critic) | Conditional on `proposed_status: hard_canon`; ≥ 2 distinct registers required, structurally distinct. canon-addition's `rule12_redundancy` validator re-checks at Phase 14a Test 12. |
| Change Control Policy | Phase 9 (handoff) + Phase 10 (ledger) + (downstream) canon-addition CH emission | Per FOUNDATIONS §Change Control Policy, "every approved change must get a record." This skill emits the SP-NNNN ledger (always); canon-addition emits the CH-NNNN Change Log Entry (on accept) carrying `affected_fact_ids`, `change_type`, `summary`, `reason`, `scope`, `downstream_updates`, `retcon_policy_checks`. The promotion provenance flows from this skill's proposal_package into canon-addition's CH `reason` field. |
| Multi-world directory discipline | Pre-flight + every phase | This skill is **single-world** — required `world_slug` argument identifies the target; ALL world-file reads and writes rooted at `worlds/<world-slug>/`. Story-bundle reads/writes scoped to `worlds/<world-slug>/stories/<story-slug>/`. Cross-story scan (when `cross_story_impact_scan: true`) is bounded to `worlds/<world-slug>/stories/*/` — never crosses world boundaries. |
| Canonical Storage Layer (post-SPEC-13) | Phase 9 + Phase 10 | World-canon mutation routes exclusively through canon-addition's `mcp__worldloom__submit_patch_plan` (engine-only writes to `_source/<subdir>/*.yaml`). Story-bundle records (SP ledger, superseding SF/STENT/story-DA, BR supersession) are written via direct `Write` — outside Hook 3's regex match. Hybrid `worlds/<slug>/diegetic-artifacts/DA-NNNN.md` (created on artifact_canonization accept) routes through canon-addition's `append_diegetic_artifact_record` op. |

## Guardrails

- **HARD-GATE absolute under Auto Mode + every `execution_mode`.** The Phase 8 gate is the only canon-mutation handoff this skill controls; Auto Mode + `interactive_runtime` + `batch_generation` do not relax it. World-canon mutation is always an explicit user act per FOUNDATIONS §Default Reality + Rule 6.
- **The ONLY lawful path from story-local fact to world canon.** No other skill may promote SF / STENT / story-local DA to world-level canon. `branching-story-page-cycle` Phase 4.5 hands `canon_candidate` resolutions HERE; `branching-story-health-audit`'s "Mystery resolved without canon promotion" warnings recommend invoking THIS skill (manually); no skill silently elevates story-local truth.
- **Non-chaining handoff to canon-addition.** This skill writes the proposal_package YAML at Phase 9 and tells the user to invoke `canon-addition` separately. It does NOT call canon-addition itself — worldloom skills are non-chaining (matches `branching-story-health-audit` and `storylet-pool-authoring` precedent). The user's separate invocation is what makes canon-addition's downstream HARD-GATE individually accountable.
- **Story-local source records are NEVER deleted.** Phase 10 Step 2 writes a SUPERSEDING record adding `promoted_to_cf: CF-NNNN`; the original SF / STENT / story-local DA remains in `_source/` per the story-bundle append-only discipline. Story-local truth and world-level truth are tracked separately even after promotion.
- **Branch-isolation invariant preserved.** Promotion does not mutate any existing page's `state_snapshot` in place; promotion does not add a `canon_sync` op to any branch retroactively. World canon propagates freely to every branch's *next* page-cycle tick via `branching-story-page-cycle` Pre-flight retrieval — that IS the design (per FOUNDATIONS §Default Reality clause). Contradicting branches surface via `contradiction_handling_preference`, not via silent retroactive mutation.
- **Cross-story scan is opt-in.** `cross_story_impact_scan` defaults to `false`. When `true`, the scan is bounded to `worlds/<world-slug>/stories/*/` (never crosses world boundaries), and recommended_handling is always `flag` for cross-story contradictions — never auto-archive across stories (the user explicitly handles cross-story interactions per the source proposal's invariant).
- **Defense-in-depth mystery firewall.** Phase 4's hard-reject of `forbidden`-status M and non-`canon_candidate` resolution authority is structurally redundant with `storylet-pool-authoring` Phase 4 gate 2 + `branching-story-page-cycle` Phase 4.5 — the redundancy is intentional. If an upstream gate is bypassed (skill not yet shipping; user direct-invokes this skill with arbitrary M id), Phase 4 still rejects.
- **No git commit from inside this skill.** Writes land in the working tree; the user reviews and commits.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **Single-skill-per-invocation.** This skill promotes one source per invocation. If the user wants to promote multiple SFs / STENTs / artifacts as a batch, each requires a separate invocation (each gets its own SP-NNNN ledger; each fires its own HARD-GATE; each routes through its own canon-addition adjudication). Refuse "promote everything from branch X" as out-of-scope.

## Final Rule

A story-local fact does not become canon by accident. It becomes canon only when the user explicitly decides this branch's outcome is the world's truth, the proposal carries provenance (which branch, which leaf, which source), scope inflation is detected and addressed (or justified), the mystery firewall is intact (no `forbidden`-M promotion, no non-`canon_candidate` resolution), contradicting branches are enumerated and handled by user choice, the five mandatory critics PASS with rationale, AND canon-addition's full pipeline adjudicates and accepts. The branch is evidence. The world is authority. This skill is the lawful, traceable, append-only bridge between them.
