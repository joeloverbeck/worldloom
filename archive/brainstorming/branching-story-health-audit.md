# Branching story health audit

## Purpose

Audit an existing branching story for narrative health issues without mutating any story state.

This pipeline is the diagnostic counterpart of `branching-story-page-cycle`. It walks the pages of one or more branches, assembles per-branch state via the snapshot-per-page semantics (never crossing branches), and reports findings on:

- open obligations without payoff routes
- contradiction risk (fact invalidations, abandoned high-salience promises)
- dangling threads (active threads with no recent attention)
- character motivation coverage (actions explicable by current STINT)
- narrative debt level (open / paid_off ratio over time)
- repetition (over-used storylets, similar-scene clustering)
- mystery firewall integrity (no `forbidden` M leakage; resolution-authority routing — apparent / branch_local_counterfactual / canon_candidate — correctly applied)
- branch-isolation invariant compliance (recursive reference closure on all story-local records reachable from each page's snapshot)
- snapshot-replay equality (parent.snapshot + applied_event_ops == this_page.snapshot; state_hash chain integrity for every page)
- consequence-ledger coverage (CNSQs pending without addressing storylets; CNSQs orphaned without source events)
- relationship continuity (SREL chains coherent; relationship_effects produced superseding records)
- storylet-scope leakage (global_author_pool storylets that reference branch-local records; audit-mode storylets with mismatched visibility)
- terminal-branch health (BR records with `status: terminal` whose terminal pages satisfy closure-readiness criteria; non-terminal branches that are de-facto dead-ended)
- content_intensity drift from baseline
- canon-baseline drift (audit trail: `state_snapshot.canon_revision` per page, useful for forensic reconstruction when promotions land between branch ticks)

Findings are reported by severity (info / warning / error). Optional remediation outputs include:
- `RSP-NNNN` storylet-proposal cards directly consumable as `storylet-pool-authoring`'s `source_audit_path` input
- flags for manual user intervention (e.g., "obligation OBL-0042 has been open for 23 pages with zero compatible storylets — author one or close the obligation")

This pipeline is read-only. It never mutates `_source/`. It writes only to `audits/` under the story directory.

This document is intentionally standalone and repeats repository assumptions on purpose.

---

## Inputs

### Required

- `world_slug`
- `story_slug`

### Optional

- `branch_path_filter` — audit a specific branch_path OR all leaf-bearing branches (default: all)
- `audit_focus` — one of:
  - `obligation_payoff_coverage` — which open OBLs lack compatible storylets
  - `contradiction_risk` — fact invalidations, abandoned promises, retcon density
  - `dangling_threads` — active threads with no recent attention
  - `character_motivation_coverage` — actions unjustified by STINT
  - `debt_level` — narrative-debt evolution over time
  - `repetition` — over-used storylets, similar-scene clustering
  - `mystery_firewall` — firewall integrity (per-claim resolution-authority routing)
  - `branch_isolation_recursive` — recursive reference-closure compliance (replaces the prior shallow `cross_branch_consistency` check)
  - `snapshot_integrity` — replay-equality validation; state_hash chain integrity
  - `consequence_coverage` — CNSQ-pending without addressing storylet; orphaned CNSQs
  - `relationship_continuity` — SREL chain coherence; relationship_effects produced superseding records
  - `storylet_scope_leakage` — global_author_pool storylets referencing branch-local records; audit-mode visibility mismatches
  - `terminal_health` — terminal-branch pages satisfy closure-readiness; non-terminal branches that look dead-ended
  - `content_intensity_drift` — drift from STORY_KERNEL baseline
  - `canon_baseline_drift` — audit-trail review of `state_snapshot.canon_revision` over the branch's history
  - `all` (default)
- `severity_threshold` — `info` | `warning` | `error` (default: `warning`; findings below threshold are suppressed in the report but still counted)
- `emit_remediation_proposals` — `true` | `false` (default: `true`)
- `cross_story_scope` — `false` | `true` (default: `false`; if true, also flags potential conflicts with other stories in the same world)

### Reads

- `STORY_KERNEL.md`
- all pages in scope (`_source/pages/PG-*.yaml`)
- all records cited by those pages' `state_snapshot`s
- current storylet pool (`_source/storylets/SLT-*.yaml`)
- `pages-prose/PG-*.md` (for repetition + content-intensity analysis)
- world canon (M-NNNN, INVs) via MCP
- if `cross_story_scope: true`: other stories' STORY_KERNEL + facts touched in promotion ledgers

---

## Output

### Files Written

- `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN-<date>.md` — consolidated audit report
- (optional) `audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md` — proposal cards
- `worlds/<world-slug>/stories/<story-slug>/audits/INDEX.md` — audit index update

### ID Conventions

- `SAU-NNNN` — story audit report ID (allocated per-story append-only)
- `RSP-NNNN` — remediation storylet proposal (under `audits/SAU-NNNN/remediation-storylet-proposals/`)

---

## Phase 0: Pre-flight

- Load `STORY_KERNEL.md`
- Allocate next `SAU-NNNN`
- Load world canon (M-NNNN, INVs) via MCP
- If `cross_story_scope: true`: enumerate sibling stories under `worlds/<world-slug>/stories/`

---

## Phase 1: Branch Scope Resolution

Determine which branches to audit.

- Parse `_source/pages/` to build the branch tree (parent_page_id → children)
- Identify all leaves (pages with no descendants)
- If `branch_path_filter` provided: validate it; audit only that path
- Otherwise: audit every distinct leaf-bearing branch

For each branch in scope, the audit walks `branch_path` from root to leaf, reading per-page state_snapshots.

---

## Phase 2: Per-Branch State Assembly

For each branch in scope:

- Walk `branch_path` from `PG-0001` to leaf
- For each page, load its `state_snapshot` and the records it cites
- Cross-check: every cited record's `created_at_page` must be in this `branch_path` (defense check on branch-isolation invariant — captured here as an explicit audit finding if violated)
- Build a per-branch evolution timeline:
  - facts created and invalidated (with introducing events and superseder chains)
  - obligations opened, paid_off, complicated, transferred, abandoned (with status timeline)
  - threads' pressure / status changes per page
  - intentions' refresh history per character
  - storylet selections per page (which SLT realized at each PG)
  - JIT-expansion events per page

The timeline becomes the input to all subsequent diagnostics.

**Rule**: this phase NEVER reads pages outside this branch's `branch_path`. Sibling branches are invisible. Cross-branch comparison happens only in Phase 6 (cross-branch consistency) and even then is structural-prefix-only — never content cross-reading.

---

## Phase 3: Coverage Analysis

### Obligation Payoff Coverage

For every open OBL on the branch's leaf state_snapshot:
- Find compatible storylets in the pool (storylets whose `pays_off_obligations` matcher matches this OBL)
- If zero matches AND zero JIT-probable matches (brief LLM check) AND OBL.salience >= 5 → finding `error`: "OBL-NNNN has no payoff route"
- If 1-2 matches AND OBL has been open for ≥10 pages → finding `warning`: "OBL-NNNN payoff routes are thin"
- If many matches but OBL is `required_closure: true` and salience >= 7 and age >= 15 pages → finding `warning`: "OBL-NNNN is overdue for closure"

### Thread Payoff / Escalation Coverage

For every active THR:
- Find storylets whose effects raise this thread's pressure (escalation candidates)
- Find storylets whose effects close or partially resolve this thread (closure candidates)
- If THR is `pressured` or `critical` and zero closure candidates → finding `error`: "THR-NNNN has no closure path"
- If THR's `current_pressure` has not changed in ≥10 pages → finding `warning`: "THR-NNNN is dormant; consider escalation or graceful closure"

### Character Motivation Coverage

For every page on the branch:
- Identify the actor of the applied event
- Verify the actor's STINT at that page would justify the action (goals or fears or pressure-thresholds match)
- If unjustified → finding `warning`: "Page PG-NNNN: <actor> performed <action> without STINT support; missing pressure or belief change"

### Mystery Firewall Integrity

For every M-NNNN declared in `mysteries_in_play[]`:
- Walk the prose: did any page resolve this M without authorization? → `error`
- Walk the events: did any applied_event_op resolve this M with `resolution_authority: canon_candidate` that did NOT pause for `story-fact-promotion-to-canon`? → `error`
- Walk the events: did any applied_event_op produce an `apparent` or `branch_local_counterfactual` resolution whose resulting SF carries the wrong `epistemic_class` (e.g., apparent claim landed as `objective`)? → `error`
- For `forbidden`-status Ms: any touch beyond the storylet's declared `mystery_safety.M_touched` is `error`

### Consequence-Ledger Coverage

For every CNSQ-NNNN with `status: pending` on any branch's leaf state_snapshot:
- Find storylets whose `fact_effects` or `relationship_effects` would address this CNSQ kind
- If zero compatible storylets AND zero JIT-probable AND `urgency >= 7` → finding `error`: "CNSQ-NNNN (<kind>) cannot be addressed; aftermath is dead"
- If pending for ≥10 pages with rising salience → finding `warning`: "CNSQ-NNNN has been pending for <count> pages without addressing"
- For each CNSQ: verify `source_event` and `subjects[]` resolve to records on this branch_path (otherwise the CNSQ is orphaned) → `error` if violated

### Relationship Continuity

For every SREL-NNNN cited in any page's `relationships_current`:
- Verify the supersession chain from the SREL at branch root to the current SREL is contiguous (each superseder cites the prior as `supersedes:`)
- Verify every storylet selected on this branch whose `relationship_effects` named these parties produced a corresponding superseding SREL record (no dropped effects) → `warning` if violated
- Flag SRELs whose axes have not changed in ≥10 pages despite the parties being co-present in active scenes — possible relational stagnation → `info`

### Storylet-Scope Leakage

For every storylet in the pool with `visibility.scope: global_author_pool`:
- Recursively inspect its predicates, fact_templates, obligation_matchers, and relationship_effects for direct references to story-local records whose `created_at_page` is non-null → `error`: "Global storylet SLT-NNNN references branch-local <record_id>; should be branch_prefix_scoped or branch_scoped"

For every audit-mode storylet (provenance.origin == audit_remediation):
- Verify `visibility` matches the source RSP's `target_branch` → `warning` if mismatched

### Terminal-Branch Health

For every BR-NNNN with `status: terminal`:
- Verify the terminal page's `state_snapshot.branch_terminal == true` and `terminal_reason` is set → `error` if violated
- Verify closure-readiness criteria were met at terminal-page time (no required-closure OBL open without acknowledgment, no high-urgency CNSQ pending, contradiction_risk below threshold) → `warning` if violated

For every non-terminal active branch whose latest 5 pages show: zero state delta, no choices that materially advance any thread, and `narrative_health.agency_score < 0.3`:
- Finding `warning`: "BR-NNNN appears de-facto dead-ended without explicit terminal marking; consider terminal acknowledgment or remediation storylets"

---

## Phase 4: Drift Detection

### Snapshot-Replay Equality + State Hash Chain

For every page on the branch (except root):
- Compute: `parent.state_snapshot + applied_event_ops` (the SE record's structured ops drive the replay)
- Compare to: `this_page.state_snapshot`
- If unequal → finding `error`: "PG-NNNN snapshot drift; engine bug or corrupt data"
- Verify `this_page.parent_state_hash == parent.state_hash` and `this_page.state_hash == hash(canonicalize(this_page.state_snapshot))`
- Verify the SE chain: for each SE in `applied_event_ops`, `SE.state_hash_before` == prior op's `state_hash_after` (or parent.state_hash for the first op), and the last op's `state_hash_after == this_page.state_hash`
- Any chain break → `error`: "PG-NNNN state-hash chain broken at op <op_id>"

### Canon-Baseline Drift (Audit Trail)

For every page on the branch:
- Record `state_snapshot.canon_revision` value
- Plot the chain over the branch's history; expected pattern is monotonic-non-decreasing (canon revisions only increase as the world's canon ledger grows)
- A page whose `canon_revision` is older than its parent → `error`: "PG-NNNN regressed canon_revision below parent (engine bug or manual edit)"
- For each transition where `canon_revision` jumped (one or more new CFs became visible to this branch since parent): if any of those new CFs contradicts an SF in this page's snapshot, cross-reference `story-fact-promotion-to-canon`'s adjudication record (`PA-NNNN`) — the contradiction handling preference should have been applied. If the branch's INDEX entry was not flagged or archived per the preference → `warning`: "Canon contradiction at PG-NNNN not surfaced via promotion handling"

This is a forensic-trail check, not a structural failure: world canon propagation IS the design; the audit just makes the propagation visible.

### Cross-Branch Reference Closure Leakage (Recursive)

The prior shallow check — "every record cited in `state_snapshot` has `created_at_page ∈ branch_path`" — is necessary but insufficient. A record created on the current branch can carry internal references (in `dependent_facts`, `coverage_cache.compatible_storylets`, `subjects`, `payoff_event`, `input_records`, `output_records`, etc.) to records on sibling branches. The top-level check passes; the dependency leaks.

For every story-local record reachable from any page's `state_snapshot`, recursively walk all story-local ID references inside that record's body:
- `OBL.dependent_facts[]`, `OBL.coverage_cache.compatible_storylets[]`
- `SF.evidence[].event_id`, `SF.evidence[].page_id`
- `SE.input_records[]`, `SE.output_records[]`, `SE.source.parent_page_id`, `SE.source.storylet_realized`
- `CNSQ.source_event`, `CNSQ.source_choice`, `CNSQ.subjects[]`, `CNSQ.addressable_by_storylets[]`
- `THR.obligations[]`, `THR.owner_cast[]`
- `SREL.party_a`, `SREL.party_b`, `SREL.source_events[]`
- `STINT.beliefs[]`, `STINT.secrets[]`, `STINT.relationships{}`
- `SLT-JIT` predicates that name story-local IDs
- `CHC.uses_fact`, `CHC.actor`, `CHC.target`
- `STOBJ` and `STLOC` references
- `DA.creator`, `DA.current_holder`, `DA.source_events[]`
- `BR.forked_from_branch_id`, `BR.forked_from_page_id`, `BR.forked_from_choice_id`

Every referenced ID must satisfy ONE of:
- the referenced record has `created_at_page == null` AND globally legal (author-pool storylets only — verified against the storylet's `visibility.scope: global_author_pool` declaration)
- the referenced record's `created_at_page ∈ this_page.branch_path`

Any sibling-branch reference at any depth → finding `error`: "PG-NNNN reaches <record_id> via <path> whose created_at_page is on sibling branch (recursive reference closure violated)".

This is the **primary structural check** for the user's "no cross-contamination between branches" requirement. Top-level provenance alone misses dependencies.

### Content Intensity Drift

For every page on the branch:
- Compare `this_page.content_intensity` to `STORY_KERNEL.content_intensity_baseline`
- Allow ±1 band (the runtime's filter)
- If a page sits 2+ bands away from baseline → finding `warning`: "PG-NNNN drifted from baseline (<baseline> → <intensity>)"
- If multiple consecutive pages drift in the same direction → finding `warning`: "Sustained drift detected over PG-X..PG-Y"

---

## Phase 5: Repetition + Thinness Analysis

### Storylet Reuse

- Tabulate SLT-NNNN selection counts across the branch
- If any SLT was selected in >25% of pages → finding `warning`: "SLT-NNNN over-used"
- If <30% of the pool was ever selected on this branch → finding `info`: "Pool under-utilized; many storylets never realized"

### Similar-Scene Clustering

For every consecutive page pair on the branch:
- Compute prose similarity (vector embedding distance OR shared-tone+shape+cast match)
- If similarity > threshold → finding `warning`: "Pages PG-X and PG-Y read as variations of the same scene"

### Narrative-Debt Evolution

- Plot `open_obligation_count` and `high_salience_unpaid_count` per page
- If `high_salience_unpaid_count` has been ≥4 for ≥10 pages → finding `warning`: "Narrative debt is sustainedly high; story risks losing coherence"
- If `open_obligation_count` is monotonically rising with no payoffs in ≥15 pages → finding `error`: "Story is accumulating debt without payoff; structural problem"

---

## Phase 6: Cross-Branch Consistency Check

This phase audits across multiple branches in the story (NOT cross-branch state reads — only structural-prefix consistency).

For every pair of branches (A, B) in scope:
- Find their longest common prefix in `branch_path` (the divergence point)
- The shared prefix MUST refer to the SAME page records (same PG IDs, same applied_event_ops, same state_snapshots)
- If A and B's branch_path[0..shared_len] arrays differ → finding `error`: "Branches A and B claim divergent shared prefix — engine inconsistency"

This is defense-in-depth against branch-isolation invariant violations: if the engine ever wrote a fork with a corrupted shared prefix, this catches it.

For cross-branch state contradictions on shared prefix: this is NOT a finding, since branch divergence is the entire point. The audit only checks that the SHARED prefix was identical — divergence after the fork point is correct.

---

## Phase 7: Findings Consolidation

Group findings by severity (info / warning / error).

Severity rubric:
- **error**: structural violations, dead-ending obligations, firewall breaches, snapshot drift, branch-isolation breaches. Always reported regardless of `severity_threshold`.
- **warning**: thinness, drift, repetition, dangling threads, motivation gaps, debt accumulation. Reported if `severity_threshold ≤ warning`.
- **info**: pool under-utilization, low-impact patterns. Reported if `severity_threshold ≤ info`.

For each finding, record:
- finding_id (sequential within this audit)
- severity
- category (one of the audit_focus categories)
- branch (or `all-branches` if shared)
- pages affected
- records affected
- description
- proposed remediation (if applicable)

---

## Phase 8: Remediation Proposals (optional)

If `emit_remediation_proposals: true`, for each remediable finding produce one of:

### A. Remediation Storylet Proposal Card (RSP-NNNN)

Used for findings where a new storylet would close the gap (e.g., "OBL-NNNN has no payoff route" → propose a storylet that pays it off).

```yaml
---
rsp_id: RSP-NNNN
audit_id: SAU-NNNN
story_id: STORY-001
finding_ids: [F-NN, ...]                 # findings this RSP addresses
target_obligation: OBL-NNNN | null
target_thread: THR-NNNN | null
target_consequence: CNSQ-NNNN | null
target_relationship: SREL-NNNN | null
proposed_shape: entry_pressure | cast_introduction | threat_escalation |
                relational_dynamics | routine_disruption | aftermath_sequel |
                reflection_dilemma | mystery_edge_brush | fork_recovery |
                thread_resolution | aftermath_residue | intimacy | confrontation | other
proposed_intensity: tame | mature | explicit
target_branch: <branch_path | "all branches" | "global pool">
proposed_visibility:
  scope: global_author_pool | branch_scoped | branch_prefix_scoped
  visible_branch_path_prefix: [PG-NNNN, ...] | null
sketch:
  hard_preconds: [...]                    # predicates per the storylet-pool-authoring DSL
  fact_effects: [...]                      # fact_templates with epistemic_class
  pays_off_obligations: [...]
  opens_obligations: [...]
  addresses_consequences: [...]            # CNSQ kind matchers
  choice_templates: [...]
rationale: >
  <why this storylet would address the finding>
---

# Body

## Diagnosis
<what the finding identified>

## Proposed remediation
<the storylet shape and effects>

## Routing
<consume this card as `storylet-pool-authoring`'s `source_audit_path` input>
```

These cards are directly consumable by `storylet-pool-authoring` (run with `mode: audit`).

### B. Manual-Intervention Flag (in-report)

Used for findings that don't have a clean storylet remediation:
- "Mystery M-NNNN was resolved at PG-X without canon promotion — review and decide whether to retroactively promote (via `story-fact-promotion-to-canon`) or roll back the branch"
- "Branch-isolation invariant violated at PG-Y — engine bug; investigate before continuing this branch"
- "Snapshot drift at PG-Z — recompute and replace, or roll back to prior coherent page"

These are inline in the report, not RSP cards.

---

## Phase 9: HARD-GATE Approval

Present consolidated findings + RSP cards to user:

```
AUDIT REPORT: SAU-NNNN-<date>

Story: <story_slug> in <world_slug>
Branches audited: <count> (paths: <list of leaf IDs>)
Pages walked: <count>

FINDINGS BY SEVERITY:
- ERROR: <count>
- WARNING: <count>
- INFO: <count>

ERRORS:
- F-01 [branch_isolation] PG-0042 cites OBL-0066 whose created_at_page is on a sibling branch
- F-02 [obligation_payoff] OBL-0007 (salience 9) has no payoff route in current pool

WARNINGS:
- F-03 [debt_level] high_salience_unpaid_count has been >=4 for 12 pages on branch <leaf>
- F-04 [repetition] SLT-0019 selected in 7 of last 20 pages
- ...

INFO:
- F-12 [pool_utilization] 14 of 38 pool storylets never realized on this branch
- ...

REMEDIATION PROPOSALS:
- RSP-0001: Storylet to pay off OBL-0007 (relational_dynamics, mature) → consume via storylet-pool-authoring
- RSP-0002: Storylet to escalate THR-0003 (threat_escalation, mature) → consume via storylet-pool-authoring
- ...

MANUAL INTERVENTION FLAGS:
- F-01: Branch-isolation breach. Action required: investigate engine bug; do not continue this branch until resolved.
```

User options:
- ACCEPT REPORT → write SAU + RSP files; halt
- REVISE — different focus → re-run with different `audit_focus`
- REVISE — narrower scope → re-run on specific branch_path
- REJECT → no writes; halt

---

## Phase 10: Atomic Write

Single transaction:

1. Write `audits/SAU-NNNN-<date>.md`
2. Write each `audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md`
3. Update `audits/INDEX.md`

Do NOT git commit.

---

## SAU Report Template

```markdown
# Story Audit SAU-NNNN

**Story**: <story_slug> in <world_slug>
**Date**: <iso8601>
**Audit focus**: <focus_area>
**Severity threshold**: <threshold>
**Branches audited**: <count>
**Pages walked**: <count>

## Summary

| Severity | Count |
|---|---|
| ERROR | N |
| WARNING | N |
| INFO | N |

## Findings

### Errors

#### F-01: <title>
- **Category**: <category>
- **Branch**: <branch_path>
- **Pages affected**: <list>
- **Records affected**: <list>
- **Description**: <what was detected>
- **Proposed remediation**: <RSP-NNNN | manual flag | none>

(repeat per error)

### Warnings

(same structure)

### Info

(same structure)

## Remediation proposals

### RSP-0001: <title>
- File: `audits/SAU-NNNN/remediation-storylet-proposals/RSP-0001-<slug>.md`
- Addresses findings: F-NN, F-NN
- Routing: `storylet-pool-authoring --source_audit_path=...`

(repeat per RSP)

## Manual intervention flags

- F-NN: <description>; action required: <recommendation>
- ...

## Health snapshot at audit time

| Branch | Open OBL | High-salience unpaid | Avg OBL age | Tension | Agency |
|---|---|---|---|---|---|
| <leaf-id> | N | N | N pages | 0..1 | 0..1 |

## Notes

<free-form rationale; what the audit revealed; recommended next moves>
```

---

## Rules (load-bearing)

- **Read-only against story state.** Never mutates `_source/`. Writes only to `audits/`
- **May produce RSP cards** under `audits/SAU-NNNN/remediation-storylet-proposals/`, consumable by `storylet-pool-authoring`
- **May NOT produce CF / CH / INV / M proposals** — those route through `canon-addition` / `propose-new-canon-facts` at the world level, not from a story audit
- **Branch-isolation invariant violations are ALWAYS `error`**, never `warning` — structural violations
- **Snapshot-replay equality failures are ALWAYS `error`**
- **A `forbidden` M-NNNN brushed-against without proper declaration is `error`**
- **The audit walks each branch independently.** Sibling-branch reads are forbidden during state assembly. Cross-branch checks (Phase 6) compare branch_path arrays only — never content
- **The audit is invokable repeatedly.** Multiple SAU-NNNN reports can coexist; each is a snapshot in time
- **The audit never mutates pages.** If a finding implies a page should be rolled back, that's a manual user action

---

## Acceptance Tests

An audit succeeds only if all of these hold.

### Read-Only Tests
- The audit makes zero modifications to `_source/`, `pages-prose/`, or any record outside `audits/`
- The audit reads only pages in scope (no sibling-branch reads during state assembly)

### Coverage Tests
- Every active obligation on every leaf is checked for payoff routes
- Every active thread is checked for closure / escalation candidates
- Every page is checked for snapshot-replay equality + state_hash chain integrity
- Every record reachable from any page's state_snapshot is checked for recursive reference closure (not just top-level)
- Every CNSQ-pending is checked for addressing-storylet coverage
- Every SREL chain is checked for continuity
- Every storylet's visibility scope is verified (global_author_pool storylets do not touch branch-local records)
- Every BR with `status: terminal` is verified against closure-readiness
- Every M-NNNN in `mysteries_in_play[]` is checked for firewall integrity (per resolution_authority)
- Every page's canon_revision is recorded and chain-checked for monotonic-non-decreasing progression

### Severity Tests
- Branch-isolation breaches reported as `error`, never `warning`
- Snapshot drift reported as `error`
- Forbidden-M leakage reported as `error`

### Remediation Tests
- Every remediable finding produces either an RSP card or a manual-intervention flag
- RSP cards are valid storylet-pool-authoring `source_audit_path` inputs (schema verified)
- No RSP card proposes a storylet that would resolve a `forbidden` M-NNNN

---

## Mandatory LLM Roles

Run the audit through at least these critics:

- Continuity Critic (snapshot integrity, fact invalidation chains)
- Mystery Curator (firewall integrity)
- Pacing Critic (debt-level evolution, narrative-health trends)
- Storylet Diversity Critic (pool utilization, repetition)
- Character Motivation Critic (STINT-justified actions)
- Branch-Isolation Auditor (structural prefix consistency, cross-branch leakage)

Then synthesize.

---

## Final Rule

A branching story is healthy not when it is long, but when:

- every salient obligation has at least one viable closure route
- every pending consequence has at least one addressing storylet (CNSQs are not orphaned)
- every active thread is either advancing, closing gracefully, or visibly stalled by world logic
- every applied event is justified by character intention OR by external pressure
- every mystery declared in play is preserved (or properly promoted with audit trail; or branch-locally / apparently resolved with the correct epistemic_class)
- every branch is structurally isolated from siblings (recursive reference closure holds, not merely top-level provenance)
- every relationship state is coherent through its supersession chain
- every page is replay-coherent from its parent (state_hash chain unbroken)
- every storylet's visibility scope matches its scope of dependence (global_author_pool storylets do not depend on branch-local state)
- every terminal branch satisfies the closure-readiness criteria its terminal page claims

This pipeline tells you whether your story is healthy by those standards. It does not fix the story — it produces the diagnosis and the remediation proposal cards. Fixing the story is the user's choice and routes through `storylet-pool-authoring`, `branching-story-page-cycle` (rollback / re-render), or — for canon-level retroactive moves — `story-fact-promotion-to-canon`.
