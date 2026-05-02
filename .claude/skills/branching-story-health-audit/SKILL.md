---
name: branching-story-health-audit
description: "Use when auditing the narrative health of an existing branching story bundle inside an existing worldloom world — branch-isolation invariant compliance, snapshot-replay equality, mystery firewall integrity, obligation/consequence/thread/relationship coverage, repetition, and narrative-debt drift — without mutating any story state. Produces: a consolidated audit report at worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN-<date>.md, optional remediation-storylet-proposal cards at audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md (directly consumable as storylet-pool-authoring's source_audit_path), and an auto-updated audits/INDEX.md. Mutates: only worlds/<world-slug>/stories/<story-slug>/audits/ (never WORLD_KERNEL.md, ONTOLOGY.md, any worlds/<world-slug>/_source/<world-subdir>/*.yaml record, or any other file inside worlds/<world-slug>/stories/<story-slug>/)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if missing."
    required: true
  - name: story_slug
    description: "Directory slug of an existing story bundle under worlds/<world-slug>/stories/<story-slug>/. Pre-flight aborts if missing."
    required: true
  - name: branch_path_filter
    description: "Comma-separated leaf PG-NNNN ids identifying specific branches to audit. Optional. Default: every distinct leaf-bearing branch in the bundle."
    required: false
  - name: audit_focus
    description: "One of: obligation_payoff_coverage | thread_coverage | character_motivation_coverage | mystery_firewall | branch_isolation_recursive | snapshot_integrity | consequence_coverage | relationship_continuity | storylet_scope_leakage | terminal_health | content_intensity_drift | canon_baseline_drift | repetition | debt_level | all. Default: all."
    required: false
  - name: severity_threshold
    description: "info | warning | error. Default: warning. Findings below threshold are suppressed in the report body but still counted in the severity summary; error-class findings are always reported regardless of threshold."
    required: false
  - name: emit_remediation_proposals
    description: "true | false. Default: true. When false, the audit produces report-only output (no RSP cards)."
    required: false
  - name: cross_story_scope
    description: "true | false. Default: false. When true, the audit also flags potential conflicts with other story bundles in the same world (read-only enumeration of sibling STORY_KERNEL.md files + promotion-ledger references)."
    required: false
---

# Branching Story Health Audit

Audits an existing branching story bundle for narrative health issues — branch-isolation invariant compliance (recursive reference closure on every story-local record reachable from each page's snapshot), snapshot-replay equality + state-hash chain integrity, mystery-firewall integrity (per-claim resolution-authority routing), obligation / thread / consequence / relationship coverage and continuity, storylet-scope leakage, terminal-branch health, content-intensity drift from baseline, canon-baseline drift, repetition, and narrative-debt evolution — and emits a consolidated severity-classified findings report plus optional remediation-storylet-proposal cards (RSP-NNNN) directly consumable by `storylet-pool-authoring` (mode=audit), without mutating any story state.

<HARD-GATE>
Do NOT write any file — audit report (`SAU-NNNN-<date>.md`), remediation-storylet-proposal card (`RSP-NNNN-<slug>.md`), or `audits/INDEX.md` update — until: (a) Pre-flight resolves `worlds/<world-slug>/stories/<story-slug>/`, allocates the next `SAU-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)`, reads `STORY_KERNEL.md` and the bundle's `_source/<class>/` records into working memory along the in-scope branches only (never sibling-branch reads during state assembly), loads world canon (whole-class M + INV records via `mcp__worldloom__list_records`; `task_type='branching_story_health_audit'` context packet for governing CFs), reads any prior `audits/SAU-*.md` reports for prior-audit-delta cross-reference, and resolves `branch_path_filter` against the bundle's actual leaf-bearing branches; (b) every Phase 2-6 finding records its `finding_id`, severity (with one-line rationale; bare severity is FAIL), category, branch, pages affected, records affected, and description; AND every emitted RSP card records its target obligation/thread/consequence/relationship, proposed shape, target_branch, proposed_visibility, and routing intent (consumable as `storylet-pool-authoring`'s `source_audit_path`); (c) Phase 7 self-check passes for every finding (citation, severity rationale, branch-isolation findings classified as `error`, snapshot-drift findings classified as `error`, forbidden-M leakage classified as `error`, no RSP card proposes resolving a `forbidden`-status M, RSP cards are valid `storylet-pool-authoring` `source_audit_path` inputs); (d) Phase 8 validation passes at per-finding, per-card, and audit-level layers; (e) the user has explicitly approved the Phase 9 deliverable summary (full audit report body, every RSP card's full content, severity counts by category, target write paths, any drop-list of finding-IDs and/or RSP-NNNN ids the user is excluding from write). Drop-list semantics: surviving items retain originally-allocated F-NN / RSP-NNNN ids (no renumbering — gaps are permanent and append-only); dropped findings persist in the report body marked `(dropped by user at Phase 9)` with the user's optional one-line reason — audits are epistemic artifacts; honesty about what was surfaced is load-bearing; dropped cards are never written and appear only in `dropped_card_ids` frontmatter and as `(dropped by user at Phase 9)` entries in the Remediation Proposals Index. The gate is absolute under Auto Mode — invoking the skill is not approval of the deliverable.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS; resolve worlds/<slug>/stories/<story-slug>/;
                  allocate SAU-NNNN via allocate_next_id; load
                  STORY_KERNEL.md; load whole-class M + INV records via
                  list_records; load `task_type='branching_story_health_audit'`
                  context packet for governing CFs; read prior
                  audits/SAU-*.md for prior-audit-delta; resolve
                  branch_path_filter against actual leaves)
      |
      v
Phase 1: Branch Scope Resolution        (parse _source/pages/ → branch tree;
                                         identify leaves; validate or
                                         enumerate scoped branches)
      |
      v
Phase 2: Per-Branch State Assembly      (walk each branch_path PG-0001 → leaf;
                                         build evolution timeline of facts /
                                         obligations / threads / intentions /
                                         storylets / JIT events; NEVER read
                                         sibling-branch pages)
      |
      v
Phase 3: Coverage Analysis              (obligation-payoff coverage; thread
                                         escalation/closure; character
                                         motivation; mystery firewall
                                         per-claim resolution-authority;
                                         consequence-ledger coverage;
                                         relationship continuity;
                                         storylet-scope leakage;
                                         terminal-branch health;
                                         optional cross-story conflict)
      |
      v
Phase 4: Drift Detection                (snapshot-replay equality + state-hash
                                         chain; canon-baseline drift trail;
                                         recursive cross-branch reference-
                                         closure leakage; content-intensity
                                         drift)
      |
      v
Phase 5: Repetition + Thinness Analysis (storylet reuse; similar-scene
                                         clustering; narrative-debt evolution)
      |
      v
Phase 6: Cross-Branch Consistency       (longest-common-prefix audit between
                                         every branch pair — structural
                                         only, never content-cross-reading)
      |
      v
Phase 7: Findings Consolidation         (group by severity; per-finding
       + Per-Finding Self-Check          fields recorded with one-line
                                         rationale; structural floor:
                                         branch-isolation/snapshot-drift/
                                         forbidden-M leakage = error;
                                         self-check FAIL routes to
                                         responsible diagnostic phase)
      |
      v
Phase 8: Remediation Proposals          (per remediable finding: draft
       + Per-Card Validation             RSP-NNNN via allocate_next_id
        (optional)                       with story_slug + audit_id)
                                         OR manual-intervention flag;
                                         per-card schema parity check
                                         against storylet-pool-authoring's
                                         source_audit_path consumer)
      |
      v
Phase 9: HARD-GATE Approval             (deliverable summary: full report
                                         body + every RSP card + severity
                                         counts + drop-list intake;
                                         --user options-->
                                         ACCEPT / ACCEPT WITH DROPLIST /
                                         REVISE-narrower-scope /
                                         REVISE-different-focus / REJECT)
      |
   accept
      |
      v
Phase 10: Atomic Write                  (cards-first → report → INDEX.md;
                                         partial-failure-safe order;
                                         dropped finding-IDs and
                                         RSP-NNNN ids recorded as
                                         permanent gaps; NO git commit)
```

## Inputs

### Required
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight aborts if missing (instruct: run `create-base-world` first).
- `story_slug` — string — directory slug of an existing story bundle under `worlds/<world-slug>/stories/<story-slug>/`. Pre-flight aborts if missing (instruct: run `branching-story-bootstrap` first).

### Optional
- `branch_path_filter` — comma-separated `PG-NNNN` leaf ids — restricts the audit to specified branches. Default: every distinct leaf-bearing branch.
- `audit_focus` — enum `obligation_payoff_coverage | thread_coverage | character_motivation_coverage | mystery_firewall | branch_isolation_recursive | snapshot_integrity | consequence_coverage | relationship_continuity | storylet_scope_leakage | terminal_health | content_intensity_drift | canon_baseline_drift | repetition | debt_level | all` — default `all`. When narrowed, Phases 3-5 skip non-matching sub-checks; Phase 4's snapshot-integrity and recursive-reference-closure checks run regardless of focus when focus is `all` OR when focus matches.
- `severity_threshold` — `info | warning | error` — default `warning`. Findings below threshold are suppressed in the report body but still counted in `finding_count_by_severity`. Error-class findings (branch-isolation, snapshot drift, forbidden-M leakage, dead-end obligations, orphaned consequences) are ALWAYS reported regardless of threshold.
- `emit_remediation_proposals` — boolean — default `true`. When `false`, Phase 8 produces no RSP cards; remediable findings carry an inline "manual remediation" hint instead.
- `cross_story_scope` — boolean — default `false`. When `true`, Pre-flight enumerates sibling stories under `worlds/<world-slug>/stories/`; Phase 3 adds an inter-story-conflict sub-check (read-only enumeration of sibling `STORY_KERNEL.md` + any promotion-ledger references; never reads sibling-bundle `_source/`).

## Output

| Class | File path | Created when |
|---|---|---|
| `SAU-NNNN-<date>.md` | `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN-<YYYY-MM-DD>.md` | Always — one per accepted Phase 9 invocation. |
| `RSP-NNNN-<slug>.md` | `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md` | IF `emit_remediation_proposals: true` AND ≥1 finding above `severity_threshold` is remediable-by-storylet AND the finding survived the user's drop-list at Phase 9. |
| `audits/INDEX.md` | `worlds/<world-slug>/stories/<story-slug>/audits/INDEX.md` | Always — created on first audit per bundle (header `# Story Audits — <Story-Slug-TitleCased>` + blank line); appended-and-resorted on subsequent audits. |

### No canon-file mutations

This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record, any other story-bundle file (`STORY_KERNEL.md`, `_source/<class>/*.yaml`, `pages-prose/*.md`, `storylet-batches/*.md`, `INDEX.md` outside `audits/`), or any sibling story bundle even when `cross_story_scope: true`. Hook 3 enforces the world-canon side; the story-bundle and sibling-bundle restrictions are enforced by skill discipline. No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted. No SF, OBL, THR, SREL, STINT, SLT, SE, PG, CHC, BR, STENT, STLOC, STOBJ, CNSQ, or DA record is created or modified. Each RSP card is a *candidate* for `storylet-pool-authoring` (mode=audit); it does not create a storylet.

### ID Allocation
- `SAU-NNNN` — per-story-bundle, append-only. Allocated at Pre-flight via `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)`; the skill composes the returned bare id into `SAU-NNNN-<YYYY-MM-DD>.md`.
- `RSP-NNNN` — per-SAU, append-only. Allocated lazily at Phase 8 per emitted card via `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)`; for the first card in a fresh SAU, starts at `RSP-0001`.
- ID-collision abort: if pre-flight `next_sau_id` or any per-card `next_rsp_id` allocation would collide with an existing file, abort. Never overwrite an existing audit report, RSP card, or INDEX row.
- Dropped-at-HARD-GATE ids become permanent gaps and are never reused (append-only ID discipline; parallels `continuity-audit` and `storylet-pool-authoring`).

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation and §Canonical Storage Layer):

- `docs/FOUNDATIONS.md` — read at Pre-flight; the Validation Rules that govern Phase 3 (Rule 4 + 5 + 7), Phase 4 (Rule 4 recursive-closure), and Phase 8 (Rule 7 — RSP cards must not propose forbidden-M resolution) all live there.
- `worlds/<world-slug>/WORLD_KERNEL.md` — primary-authored; read directly. Provides genre/tonal/chronotope contract for content-intensity-drift baseline reasoning and for cross-story-conflict heuristics when `cross_story_scope: true`.
- `worlds/<world-slug>/ONTOLOGY.md` — primary-authored; read directly. Categories + Relation Types ground the audit's understanding of which story-local STENT records mirror which world ENT records (Phase 4 canon-baseline drift trail).
- `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` — direct Read. Provides `designing_principle`, `content_intensity_baseline`, `mysteries_in_play[]` (with each M's status + future_resolution_safety), `invariants_acknowledged[]`, and cast bind list — load-bearing for Phases 2, 3, 4, and 8.
- `worlds/<world-slug>/stories/<story-slug>/_source/pages/PG-*.yaml` — direct Read of every page (initially) for Phase 1 branch-tree assembly; subsequent phases read pages selectively along scoped `branch_path` arrays only. NEVER bulk-read other branches' pages during state assembly.
- `worlds/<world-slug>/stories/<story-slug>/_source/<class>/*.yaml` for every record cited by an in-scope page's `state_snapshot` — direct Read. Classes touched: `events`, `obligations`, `consequences`, `threads`, `relationships`, `intentions`, `storylets`, `locations`, `objects`, `artifacts`, `branches`, `choices`, `entities`, `facts`. Phase 4 recursive-reference-closure check walks the IDs cited inside each loaded record.
- `worlds/<world-slug>/stories/<story-slug>/pages-prose/PG-*.md` for every in-scope page — direct Read. Used by Phase 5 repetition + similar-scene clustering, by Phase 3 mystery-firewall-vs-prose check, and by Phase 4 content-intensity drift signals.
- `worlds/<world-slug>/stories/<story-slug>/audits/SAU-*.md` — direct Read of every prior audit report (skip if directory absent) for prior-audit-delta cross-reference: re-surfaced findings cite the prior SAU id to prevent recommendation thrash.
- **Whole-class Mystery Reserve firewall load** via `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)` — every M record body is needed at Phase 3's mystery-firewall sub-check to verify per-claim `resolution_authority` against each M's `status` and `future_resolution_safety`, and at Phase 8 to reject any RSP card proposing resolution of a `forbidden`-status M. Whole-class enumeration is authorized for skills "whose firewall is class-bounded" per FOUNDATIONS §Tooling Recommendation.
- **Whole-class Invariant audit load** via `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)` — every INV record body is needed at Phase 3 to interpret cast-action plausibility against world INVs and at Phase 4 canon-baseline drift to reason about whether a `canon_revision` jump introduced a new INV that contradicts an active branch SF.
- **Premise-bounded world-canon retrieval** via `mcp__worldloom__get_context_packet(world_slug, task_type='branching_story_health_audit', seed_nodes=[<resolved entity:slug ids from cast-bound STENTs' world_ent_id + recent page-history named entities>])` — supplies governing CFs the audit cross-references for Phase 4 canon-baseline drift. The registered profile uses a 12000-token default budget and prioritizes governing CFs touching cast/location/period, recent change-log context for the bundle's `canon_revision` baseline, governing invariants, Mystery Reserve records, and ontology-grounding context.
  - **Packet-too-large fallback**: if the packet returns `delivery_status='persisted_with_summary'` OR `packet_incomplete_required_classes` OR non-empty `truncation_summary.dropped_layers`, reduce `seed_nodes` and retry; use `governing_summary` inline; `get_records(record_ids=[...])` for known-id sets.
- **Sibling-story enumeration (conditional)** via direct enumeration of `worlds/<world-slug>/stories/*/STORY_KERNEL.md` ONLY when `cross_story_scope: true`. Sibling-bundle `_source/<class>/` is NEVER bulk-read; Phase 3's cross-story-conflict sub-check operates on STORY_KERNEL declarations + any promotion-ledger reference indices only.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first. If `worlds/<world-slug>/stories/<story-slug>/` is missing, abort and instruct the user to run `branching-story-bootstrap` first. If the bundle has zero pages (only PG-0001), the audit runs but Phase 5 (repetition) is a degenerate no-op recorded as such in the report.

Direct `Read` of `worlds/<world-slug>/_source/<world-subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read world canon. Direct `Read` of `worlds/<world-slug>/stories/<story-slug>/_source/<story-subdir>/` IS the correct surface (Hook 2's match pattern is `worlds/<slug>/_source/...` which does NOT match the nested story bundle).

## Pre-flight Check

Run before Phase 1; abort if any precondition fails.

- Load `docs/FOUNDATIONS.md` into working context.
- Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`); resolve `worlds/<world-slug>/`. Abort if missing.
- Validate `story_slug` is kebab-case; resolve `worlds/<world-slug>/stories/<story-slug>/`. Abort if missing.
- Allocate next `SAU-NNNN` with `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)`.
  - Collision abort: if the resulting filename `SAU-NNNN-<date>.md` would overwrite an existing file (concurrent invocation on the same date), abort with "SAU-NNNN-<date> already exists; concurrent audit detected — re-invoke."
- Read `worlds/<world-slug>/WORLD_KERNEL.md`, `worlds/<world-slug>/ONTOLOGY.md`, and `worlds/<world-slug>/stories/<story-slug>/STORY_KERNEL.md` directly.
- Read every `worlds/<world-slug>/stories/<story-slug>/_source/pages/PG-*.yaml` for Phase 1 branch-tree assembly.
- Read every prior `worlds/<world-slug>/stories/<story-slug>/audits/SAU-*.md` for prior-audit-delta lookup; skip if `audits/` is absent (this is the first audit on the bundle).
- Resolve `branch_path_filter` (if provided) against the assembled leaf set; abort with the missing-leaves list if any specified leaf is not a real PG id.
- Resolve premise-relevant entities to canonical `entity:<slug>` ids via `mcp__worldloom__find_named_entities(names)` BEFORE the context-packet call. Names sourced from `STORY_KERNEL.cast_bind_list` (each STENT's `world_ent_id`) and recent in-scope page-history named entities.
- Load premise-bounded world-canon retrieval via `mcp__worldloom__get_context_packet(world_slug, task_type='branching_story_health_audit', seed_nodes=[<resolved ids>])`. Apply the packet-too-large fallback per §World-State Prerequisites if signal-overflow.
- Load whole-class Mystery Reserve firewall: `mcp__worldloom__list_records(world_slug, record_type='mystery_record', include_full_body=true)`.
- Load whole-class Invariant audit: `mcp__worldloom__list_records(world_slug, record_type='invariant_record', include_full_body=true)`.
- If `cross_story_scope: true`: enumerate `worlds/<world-slug>/stories/*/STORY_KERNEL.md` (read each directly); record sibling-bundle list for Phase 3's inter-story-conflict sub-check. Sibling `_source/` is NOT loaded.

This skill has no documented sub-routine paths. It is always direct-user-invoked (parallels `continuity-audit` — audits are reviewer-facing artifacts, not pipelines).

## Phase 1: Branch Scope Resolution

Determine which branches to audit.

- Parse the `_source/pages/PG-*.yaml` records loaded at Pre-flight to build the branch tree (`parent_page_id` → children).
- Identify all leaves (pages with no descendants).
- If `branch_path_filter` was provided: use the Pre-flight-validated leaf set.
- Otherwise: audit every distinct leaf-bearing branch.
- For each branch in scope, derive its full `branch_path` from `PG-0001` to leaf as the working state for Phase 2's walk.

**Rule**: phase output is the scoped-branches structure feeding all subsequent phases. No findings emitted at this phase.

## Phase 2: Per-Branch State Assembly

For each branch in scope, walk its `branch_path` from `PG-0001` to leaf, building an evolution timeline.

- Per page, load `state_snapshot` and the records it cites.
- Cross-check: every cited record's `created_at_page` must be in this `branch_path` (defense check on the branch-isolation invariant — Phase 4's recursive-closure check classifies; this phase records but does not classify).
- Build per-branch timeline:
  - facts created and invalidated (with introducing events and superseder chains)
  - obligations opened / paid_off / complicated / transferred / abandoned (status timeline)
  - threads' pressure / status changes per page
  - intentions' refresh history per character
  - storylet selections per page (which SLT realized at each PG)
  - JIT-expansion events per page

The timeline becomes the input to Phases 3-5.

**Rule**: this phase NEVER reads pages outside this branch's `branch_path`. Sibling branches are invisible during state assembly. Cross-branch comparison happens only at Phase 6 (structural-prefix-only).

## Phase 3: Coverage Analysis

Each sub-check produces zero or more candidate findings; severity classification finalized at Phase 7.

- **Obligation Payoff Coverage** — for every open OBL on each branch's leaf `state_snapshot`: find compatible storylets in pool. Zero matches AND zero JIT-probable AND `salience ≥ 5` → `error`. 1-2 matches AND age ≥ 10 pages → `warning`. Many matches but `required_closure: true` AND `salience ≥ 7` AND age ≥ 15 pages → `warning` (overdue).
- **Thread Payoff / Escalation Coverage** — for every active THR: find escalation candidates and closure candidates. `pressured` or `critical` AND zero closure candidates → `error`. `current_pressure` unchanged for ≥ 10 pages → `warning` (dormant).
- **Character Motivation Coverage** — for every page on the branch: actor's STINT at that page must justify the action (goals / fears / pressure-thresholds match). If unjustified → `warning`.
- **Mystery Firewall Integrity (Rule 7)** — for every M-NNNN in `mysteries_in_play[]`: walk prose for unauthorized resolution → `error`; walk events for `resolution_authority: canon_candidate` resolution that did NOT pause for `story-fact-promotion-to-canon` → `error`; walk events for `apparent` / `branch_local_counterfactual` resolution whose resulting SF carries the wrong `epistemic_class` → `error`; for `forbidden`-status M, any touch beyond the storylet's declared `mystery_safety.M_touched` → `error`. **Whole-class M load powers this sub-check.**
- **Consequence-Ledger Coverage (Rule 5)** — for every CNSQ-NNNN with `status: pending` on any branch's leaf: find addressing storylets via `fact_effects` / `relationship_effects`. Zero compatible AND zero JIT-probable AND `urgency ≥ 7` → `error` (aftermath dead). Pending ≥ 10 pages with rising salience → `warning`. `source_event` / `subjects[]` not on this branch_path → `error` (orphaned).
- **Relationship Continuity** — for every SREL chain cited in any page's `relationships_current`: supersession contiguous from branch root to current SREL? Each storylet whose `relationship_effects` named these parties produced a corresponding superseding SREL → `warning` if violated. Stagnant axes (no change for ≥ 10 pages despite parties co-present) → `info`.
- **Storylet-Scope Leakage (Rule 4 at story scope)** — for every SLT with `visibility.scope: global_author_pool`: predicates / fact_templates / obligation_matchers / relationship_effects directly reference story-local records whose `created_at_page` is non-null → `error`. For every audit-mode storylet (`provenance.origin == audit_remediation`): `visibility` matches source RSP `target_branch` → `warning` if mismatched.
- **Terminal-Branch Health** — for every BR with `status: terminal`: terminal page's `state_snapshot.branch_terminal == true` AND `terminal_reason` set → `error` if violated. Closure-readiness criteria met at terminal-page time (no required-closure OBL open without acknowledgment, no high-urgency CNSQ pending, contradiction_risk below threshold) → `warning` if violated. Non-terminal active branch with zero state delta in last 5 pages, no thread-advancing choices, AND `narrative_health.agency_score < 0.3` → `warning` (de-facto dead-ended).
- **Cross-Story Conflict (conditional)** — only when `cross_story_scope: true`. Flag potential conflicts between this bundle's `mysteries_in_play[]` / `invariants_acknowledged[]` and sibling bundles' STORY_KERNEL declarations or promotion-ledger references → `info` or `warning` depending on overlap depth. Reads sibling STORY_KERNEL only — never sibling `_source/`.

## Phase 4: Drift Detection

- **Snapshot-Replay Equality + State-Hash Chain** — for every page (except root): compute `parent.state_snapshot + applied_event_ops`; compare to `this_page.state_snapshot`; unequal → `error` ("PG-NNNN snapshot drift; engine bug or corrupt data"). Verify `parent_state_hash == parent.state_hash` and `state_hash == hash(canonicalize(state_snapshot))`. Verify per SE op chain: each `state_hash_before` matches prior op's `state_hash_after` (or `parent.state_hash` for first op); last op's `state_hash_after == this_page.state_hash`. Any chain break → `error` ("PG-NNNN state-hash chain broken at op <op_id>").
- **Canon-Baseline Drift (forensic trail)** — for every page: record `state_snapshot.canon_revision`. Expected pattern is monotonic-non-decreasing. Regression below parent → `error`. For `canon_revision` jumps where new CFs contradict an SF in this page's snapshot: cross-reference the `PA-NNNN` adjudication record from `story-fact-promotion-to-canon`; if the branch's INDEX entry was not flagged or archived per the contradiction-handling preference → `warning`. **NOT a structural failure** — world-canon propagation IS the design; this sub-check makes it visible.
- **Cross-Branch Reference Closure Leakage (Recursive) — Rule 4 at story scope** — for every story-local record reachable from any page's `state_snapshot`, recursively walk all story-local ID references inside that record's body. Per the proposal's exhaustive list: `OBL.dependent_facts[]`, `OBL.coverage_cache.compatible_storylets[]`, `SF.evidence[].event_id`, `SF.evidence[].page_id`, `SE.input_records[]`, `SE.output_records[]`, `SE.source.parent_page_id`, `SE.source.storylet_realized`, `CNSQ.source_event`, `CNSQ.source_choice`, `CNSQ.subjects[]`, `CNSQ.addressable_by_storylets[]`, `THR.obligations[]`, `THR.owner_cast[]`, `SREL.party_a`, `SREL.party_b`, `SREL.source_events[]`, `STINT.beliefs[]`, `STINT.secrets[]`, `STINT.relationships{}`, JIT-SLT predicates that name story-local IDs, `CHC.uses_fact`, `CHC.actor`, `CHC.target`, `STOBJ` and `STLOC` references, `DA.creator`, `DA.current_holder`, `DA.source_events[]`, `BR.forked_from_branch_id`, `BR.forked_from_page_id`, `BR.forked_from_choice_id`. Every referenced ID must satisfy ONE of: `created_at_page == null` AND globally legal (author-pool storylets only — verified against `visibility.scope: global_author_pool`); OR `created_at_page ∈ this_page.branch_path`. Sibling-branch reference at any depth → `error` ("PG-NNNN reaches <record_id> via <path> whose created_at_page is on sibling branch — recursive reference closure violated"). **This is the proposal's primary structural check** for branch isolation; top-level provenance alone misses dependencies.
- **Content Intensity Drift** — per page: compare `content_intensity` to `STORY_KERNEL.content_intensity_baseline`. ±1 band tolerated. 2+ bands away → `warning`. Multiple consecutive same-direction drift → `warning` ("Sustained drift detected over PG-X..PG-Y").

## Phase 5: Repetition + Thinness Analysis

Per-branch.

- **Storylet Reuse** — tabulate SLT selection counts. Any SLT selected in > 25% of pages → `warning`. < 30% of the pool ever selected → `info` (pool under-utilized).
- **Similar-Scene Clustering** — for every consecutive page pair: compute prose similarity (vector embedding distance OR shared-tone+shape+cast match). Above threshold → `warning` ("Pages PG-X and PG-Y read as variations of the same scene").
- **Narrative-Debt Evolution (Rule 5)** — plot `open_obligation_count` and `high_salience_unpaid_count` per page. `high_salience_unpaid_count ≥ 4` for ≥ 10 pages → `warning`. `open_obligation_count` monotonically rising with no payoffs in ≥ 15 pages → `error` (structural problem).

For zero-page bundles (only `PG-0001`), Phase 5 is a degenerate no-op recorded as such in the report ("Repetition + thinness — N/A; bundle has only the root page").

## Phase 6: Cross-Branch Consistency Check

Structural-prefix-only audit between branch pairs in scope.

- For every pair (A, B) in scope: find the longest common prefix in `branch_path` (the divergence point).
- The shared prefix MUST refer to the SAME page records (same PG IDs, same `applied_event_ops`, same `state_snapshots` — all of which are already in memory from Phase 2).
- If A's and B's `branch_path[0..shared_len]` arrays differ → `error` ("Branches A and B claim divergent shared prefix — engine inconsistency").
- Cross-branch state contradictions on the shared prefix are NOT findings — branch divergence after the fork point is correct (the entire point of forking).

**Rule**: this phase NEVER reads sibling-branch content. It operates only on `branch_path` arrays already assembled at Phase 2. This is defense-in-depth against branch-isolation violations: if the engine ever wrote a fork with a corrupted shared prefix, this catches it.

## Phase 7: Findings Consolidation + Per-Finding Self-Check

Group findings by severity (`info` / `warning` / `error`). Per-finding fields recorded:

- `finding_id` (sequential within this audit, e.g., `F-01`, `F-02`, ...)
- `severity` (with one-line rationale; bare severity is FAIL)
- `category` (one of the `audit_focus` values)
- `branch` (or `all-branches` when shared)
- `pages_affected` (list)
- `records_affected` (list)
- `description` (one paragraph)
- `proposed_remediation` (`RSP-NNNN` | manual flag | none — populated at Phase 8)
- `prior_audit_reference` (the prior `SAU-NNNN` if this finding re-surfaces from an earlier audit; null otherwise)

**Severity rubric** (per proposal):
- **error**: structural violations, dead-ending obligations, firewall breaches, snapshot drift, branch-isolation breaches. ALWAYS reported regardless of `severity_threshold`.
- **warning**: thinness, drift, repetition, dangling threads, motivation gaps, debt accumulation. Reported if `severity_threshold ≤ warning`.
- **info**: pool under-utilization, low-impact patterns. Reported if `severity_threshold ≤ info`.

**Structural severity floors** (load-bearing):
- Branch-isolation invariant violations: ALWAYS `error`, never `warning`.
- Snapshot-replay equality failures: ALWAYS `error`.
- `forbidden`-status M leakage: ALWAYS `error`.

**Per-Finding Self-Check** (each test records PASS with one-line rationale OR FAIL with the responsible loop-back phase; bare PASS is FAIL):

1. Every finding cites at least one record / page / branch anchor. (Loop → originating diagnostic phase)
2. Every severity carries a one-line rationale. (Loop → Phase 7 classification)
3. Branch-isolation findings are classified as `error` (not `warning` or `info`). (Loop → Phase 4 / Phase 7)
4. Snapshot-drift findings are classified as `error`. (Loop → Phase 4 / Phase 7)
5. Forbidden-M leakage findings are classified as `error`. (Loop → Phase 3 / Phase 7)
6. Re-surfaced findings cite their prior `SAU-NNNN` via `prior_audit_reference`. (Loop → Phase 7)

Any FAIL halts and routes; Phase 8 is blocked until Self-Check is clean.

## Phase 8: Remediation Proposals + Per-Card Validation (optional)

Skip this phase entirely when `emit_remediation_proposals: false`; remediable findings carry an inline "manual remediation" hint in the report instead.

For each remediable finding above `severity_threshold`, produce one of:

### A. Remediation Storylet Proposal Card (RSP-NNNN)

Used when a new storylet would close the gap (e.g., "OBL-NNNN has no payoff route" → propose a storylet that pays it off).

- Allocate `RSP-NNNN` lazily per emitted card with `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)` (first card in a fresh SAU = `RSP-0001`).
- Compose the card per `templates/remediation-storylet-proposal-card.md`. Required frontmatter (parallels `storylet-pool-authoring`'s `source_audit_path` parse-time consumer schema): `rsp_id`, `audit_id`, `story_id`, `finding_ids[]`, `target_obligation` (or null), `target_thread` (or null), `target_consequence` (or null), `target_relationship` (or null), `proposed_shape` (per the SLT shape enum), `proposed_intensity` (`tame | mature | explicit`), `target_branch` (a branch_path | `"all branches"` | `"global pool"`), `proposed_visibility` (with `scope: global_author_pool | branch_scoped | branch_prefix_scoped` and `visible_branch_path_prefix`), `sketch` (with `hard_preconds`, `fact_effects`, `pays_off_obligations`, `opens_obligations`, `addresses_consequences`, `choice_templates`), `rationale`. Body sections: Diagnosis / Proposed remediation / Routing.

### B. Manual-Intervention Flag (in-report)

Used when no clean storylet remediation exists. Examples:
- "Mystery M-NNNN was resolved at PG-X without canon promotion — review and decide whether to retroactively promote via `story-fact-promotion-to-canon` or roll back the branch."
- "Branch-isolation invariant violated at PG-Y — engine bug; investigate before continuing this branch."
- "Snapshot drift at PG-Z — recompute and replace, or roll back to prior coherent page."

Inline in the report's Manual Intervention Flags section, NOT RSP cards.

### Per-Card Validation

Each emitted RSP card runs all checks; bare PASS is FAIL.

1. Card frontmatter satisfies `storylet-pool-authoring`'s `source_audit_path` parse-time schema (every required field present).
2. Card does NOT propose resolution of any `forbidden`-status M (cross-checked against the whole-class M load).
3. Card's `target_branch` is a real branch_path in this bundle, OR `"all branches"`, OR `"global pool"`.
4. Card's `proposed_visibility.scope` matches `target_branch` semantics: `"global pool"` → `global_author_pool`; specific branch → `branch_prefix_scoped` or `branch_scoped` (with matching `visible_branch_path_prefix`).
5. Every `finding_ids[]` entry exists in the consolidated findings list.
6. Card's `proposed_intensity` is within the bundle's `STORY_KERNEL.content_intensity_baseline ± 1` band.

Failed card validation: re-draft the card OR escalate to a manual-intervention flag instead. Cards that cannot be made valid are downgraded to manual-intervention flags rather than emitted broken.

## Phase 9: HARD-GATE Approval

Present the deliverable summary to the user:

```
AUDIT REPORT: SAU-NNNN-<date>

Story: <story_slug> in <world_slug>
Audit focus: <focus>
Severity threshold: <threshold>
Branches audited: <count> (paths: <list of leaf IDs>)
Pages walked: <count>

FINDINGS BY SEVERITY:
- ERROR:   <count>
- WARNING: <count>
- INFO:    <count>

ERRORS:
- F-01 [<category>] <description>
- ...

WARNINGS:
- F-NN [<category>] <description>
- ...

INFO (when severity_threshold ≤ info):
- F-NN [<category>] <description>
- ...

REMEDIATION PROPOSALS:
- RSP-0001: <title> (<shape>, <intensity>, target: <branch>) → consume via storylet-pool-authoring
- ...

MANUAL INTERVENTION FLAGS:
- F-NN: <description>; action required: <recommendation>
- ...

PRIOR-AUDIT DELTA:
- F-NN re-surfaced from SAU-NNNN (originally dropped by user / not yet remediated)
- ...

TARGET WRITE PATHS:
- worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN-<date>.md
- worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md × <count>
- worlds/<world-slug>/stories/<story-slug>/audits/INDEX.md (create or append)
```

User options:

- **ACCEPT** → all surviving findings + RSP cards proceed to Phase 10 write.
- **ACCEPT WITH DROPLIST** → user supplies a comma-separated list of finding-IDs and/or `RSP-NNNN` ids to drop, optionally with one-line reasons. Surviving items keep originally-allocated ids (no renumbering — gaps are permanent). Dropped findings persist in the report body marked `(dropped by user at Phase 9)` with the user's optional reason; their ids appear in `dropped_finding_ids` frontmatter. Dropped cards are never written; their ids appear in `dropped_card_ids` frontmatter and as `(dropped by user at Phase 9)` entries in the Remediation Proposals Index.
- **REVISE — narrower scope** → user supplies a new `branch_path_filter`; loop to Phase 1. Allocated SAU-NNNN persists (no re-allocation); allocated RSP-NNNN ids from this run are released to the next-available pool (the lazy-allocate-at-Phase-8 pattern means no permanent gap is consumed for this run).
- **REVISE — different focus** → user supplies a new `audit_focus`; loop to Phase 3. Same allocation handling as narrower-scope.
- **REJECT** → no writes; halt the audit. Allocated `SAU-NNNN` becomes a permanent allocation gap (the reverse of REVISE — REJECT is terminal).

**HARD-GATE fires here**: no file is written until the user explicitly ACCEPTs (with or without droplist). Auto Mode does not override.

## Phase 10: Atomic Write

Single transaction. Write order matters — RSP cards first → audit report → INDEX.md last so partial failure leaves the per-bundle audit index unmutated:

1. **RSP cards first** (non-dropped only): create `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/` and `audits/SAU-NNNN/remediation-storylet-proposals/` if absent. `Write` each `RSP-NNNN-<slug>.md` per `templates/remediation-storylet-proposal-card.md`. Lazy-allocated RSP-NNNN ids honored verbatim — dropped intermediate ids are NEVER renumbered (append-only ID discipline).
2. **Audit report second**: `Write` `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN-<YYYY-MM-DD>.md` per `templates/story-audit-report.md`. Frontmatter carries `audit_id`, `story_slug`, `world_slug`, `date`, `audit_focus`, `severity_threshold`, `branches_audited`, `pages_walked`, `finding_count_by_severity`, `rsp_card_ids`, `dropped_finding_ids`, `dropped_card_ids`, `prior_sau_referenced`, `cross_story_scope`, `user_approved: true`. Body matches the Phase 9 deliverable summary structure plus a Health Snapshot table per branch (open OBL count / high-salience unpaid / avg OBL age / tension / agency).
3. **INDEX.md last**: read existing `worlds/<world-slug>/stories/<story-slug>/audits/INDEX.md` (create with header `# Story Audits — <Story-Slug-TitleCased>` followed by one blank line if absent). Append the new SAU row in the form `- [SAU-NNNN](SAU-NNNN-<date>.md) — <focus> / sev-max <N> / <finding_count> findings / <rsp_card_count> RSP cards`. Re-sort by SAU-NNNN ascending. Write back via direct `Edit`.

**Direct `Write`/`Edit` is the correct mutation surface for `audits/`** — `audits/` lives outside `_source/`, so Hook 3 doesn't apply. Parallels `continuity-audit`'s direct-Edit posture.

**Partial-failure recovery**: if any write in steps 1-2 fails, the user receives the failure with the specific path and instruction to either manually clean up the partial audit (delete `audits/SAU-NNNN-<date>.md` and the partial `audits/SAU-NNNN/` sub-directory if present) or re-invoke the skill (which will allocate fresh SAU/RSP ids — the failed run's ids become permanent allocation gaps). The INDEX.md edit at step 3 is intentionally LAST so a partial audit never appears in the per-bundle index.

Report all written paths. **Do NOT commit to git.** The user reviews the diff and commits.

## Validation Rules This Skill Upholds

This skill is the in-bundle post-bootstrap enforcer of structural and narrative-health invariants. As meta-tooling, it does not emit canon — it surfaces violations and proposes RSP cards consumable by `storylet-pool-authoring`.

| Rule | Phase enforced | Mechanism |
|---|---|---|
| Rule 1: No Floating Facts | Phase 7 Self-Check test 1; Phase 8 Per-Card Validation tests 1 + 5 | Every finding must cite at least one record / page / branch anchor (bare unanchored findings fail Self-Check). Every emitted RSP card must satisfy `storylet-pool-authoring`'s `source_audit_path` parse-time schema (every required frontmatter field present); `finding_ids[]` entries must exist in the consolidated findings list (no floating remediation pointing at a hallucinated finding). |
| Rule 4: No Globalization by Accident (story scope) | Phase 3 Storylet-Scope Leakage; Phase 4 Cross-Branch Reference Closure Leakage (Recursive); Phase 6 Cross-Branch Consistency Check | Phase 3 flags `global_author_pool` storylets directly referencing branch-local records as `error`. Phase 4's recursive walk of every story-local ID reference inside every record reachable from each page's `state_snapshot` is the **primary structural check** for branch isolation — a sibling-branch reference at any depth is `error`. Phase 6 audits the longest-common-prefix between every branch pair for divergent shared-prefix arrays. The whole-class INV load also informs Phase 3's character-motivation reasoning where world-INV `break_conditions` would forbid an action. |
| Rule 5: No Consequence Evasion | Phase 3 Obligation Payoff Coverage + Thread Coverage + Consequence-Ledger Coverage; Phase 5 Narrative-Debt Evolution | Phase 3's three coverage sub-checks flag dead-end obligations (zero payoff routes + salience ≥ 5 → `error`), uncloseable critical threads (`error`), unaddressable pending consequences (`error`), and orphaned consequences whose `source_event` / `subjects[]` aren't on the branch_path (`error`). Phase 5's debt-evolution check flags `high_salience_unpaid_count ≥ 4` for ≥ 10 pages (`warning`) and monotonically rising `open_obligation_count` with no payoffs in ≥ 15 pages (`error` — structural problem). Phase 8 emits RSP cards proposing storylets that close the gaps. |
| Rule 7: Preserve Mystery Deliberately | Phase 3 Mystery Firewall Integrity; Phase 8 Per-Card Validation test 2 | Phase 3 walks every M-NNNN in `mysteries_in_play[]` against prose, applied event ops, and `M_resolution_claims` for: unauthorized prose resolution (`error`); `canon_candidate` resolution that didn't pause for `story-fact-promotion-to-canon` (`error`); `apparent`/`branch_local_counterfactual` resolution with wrong `epistemic_class` (`error`); any touch of a `forbidden`-status M beyond declared `mystery_safety.M_touched` (`error`). The whole-class M load (`mcp__worldloom__list_records(record_type='mystery_record', include_full_body=true)`) powers per-claim cross-checks. Phase 8 Per-Card Validation test 2 hard-rejects any RSP card proposing resolution of a `forbidden`-status M; failed cards are downgraded to manual-intervention flags rather than emitted. |

## Record Schemas

This skill's outputs are an audit report and remediation-storylet-proposal cards. None are Canon Fact Records or Change Log Entries (meta-tooling — explicit N/A in the FOUNDATIONS Alignment table below).

- **`SAU-NNNN-<date>.md`** (audit report, hybrid YAML frontmatter + markdown body) → `templates/story-audit-report.md`. Frontmatter: `audit_id`, `story_slug`, `world_slug`, `date`, `audit_focus`, `severity_threshold`, `branches_audited` (count + leaf id list), `pages_walked`, `finding_count_by_severity`, `rsp_card_ids[]`, `dropped_finding_ids[]`, `dropped_card_ids[]`, `prior_sau_referenced[]`, `cross_story_scope`, `user_approved: true`. Body sections: Summary table; Per-Severity Findings (Errors → Warnings → Info, each finding with `F-NN`, category, branch, pages affected, records affected, description, proposed remediation); Remediation Proposals Index (one row per non-dropped RSP plus `(dropped by user at Phase 9)` rows); Manual Intervention Flags; Prior-Audit Delta; Health Snapshot table (per-branch open OBL count / high-salience unpaid / avg OBL age / tension / agency); Notes.
- **`RSP-NNNN-<slug>.md`** (remediation-storylet-proposal card, hybrid YAML frontmatter + markdown body) → `templates/remediation-storylet-proposal-card.md`. Frontmatter mirrors `storylet-pool-authoring`'s `source_audit_path` parse-time consumer schema byte-for-byte: `rsp_id`, `audit_id`, `story_id`, `finding_ids[]`, `target_obligation`, `target_thread`, `target_consequence`, `target_relationship`, `proposed_shape` (per the SLT shape enum), `proposed_intensity` (`tame | mature | explicit`), `target_branch` (branch_path | `"all branches"` | `"global pool"`), `proposed_visibility` (`scope` + `visible_branch_path_prefix`), `sketch` (`hard_preconds`, `fact_effects`, `pays_off_obligations`, `opens_obligations`, `addresses_consequences`, `choice_templates`), `rationale`. Body sections: Diagnosis / Proposed remediation / Routing.

No Canon Fact Record template; no Change Log Entry template. The skill emits no world-level canon and no Change Log Entries — both are explicit N/A in §FOUNDATIONS Alignment.

## FOUNDATIONS Alignment

| Principle | Phase / Mechanism | Notes |
|---|---|---|
| Tooling Recommendation (§"non-negotiable") | Pre-flight loads `docs/FOUNDATIONS.md` + `WORLD_KERNEL.md` + `ONTOLOGY.md` + `STORY_KERNEL.md`; whole-class M + INV record loads via `list_records(... include_full_body=true)`; premise-bounded retrieval via `get_context_packet(task_type='branching_story_health_audit')`. | Whole-class enumeration authorized for skills "whose firewall is class-bounded" per FOUNDATIONS §Tooling Recommendation. Direct `Read` of `worlds/<slug>/_source/<world-subdir>/` redirected to MCP retrieval by Hook 2; nested story-bundle reads are direct (Hook 2's match pattern doesn't cover the nested path). |
| Multi-world directory discipline | Single-world, nested-in-existing-bundle scope; required `world_slug` + `story_slug` arguments; ALL world-state reads rooted at `worlds/<world-slug>/`; ALL writes rooted at `worlds/<world-slug>/stories/<story-slug>/audits/`. Sibling-bundle reads under `cross_story_scope: true` are STORY_KERNEL-only and never widen to sibling `_source/`. | Pre-flight aborts if either parent directory is missing. The cross-story-scope sub-rule prevents the audit's locality guarantee from eroding into deep cross-bundle reads. |
| Rule 1: No Floating Facts | Phase 7 Self-Check test 1; Phase 8 Per-Card Validation tests 1 + 5; structural via finding + RSP card schemas. | Every finding cites a record / page / branch anchor; every RSP card carries every required schema field; bare unanchored findings or unfielded cards fail validation. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — meta-tooling skill produces audit reports + remediation-storylet-proposal cards, NOT new world-level species / rituals / technologies / artifacts / institutions. The Rule 2 enforcement surface is `canon-addition` Phase 5 (Diffusion Analysis) and `propose-new-canon-facts` Phase 4 (Domain Coverage). |
| Rule 3: No Specialness Inflation | N/A | Not applicable — meta-tooling skill produces no new world-level capability, artifact, or species. The enforcement surface is `canon-addition` (CF stabilizers + Rule-3 audit) and `continuity-audit` Phase 6 (Burden Debt Analysis) at world scope. |
| Rule 4: No Globalization by Accident (story scope) | Phase 3 Storylet-Scope Leakage; Phase 4 Cross-Branch Reference Closure Leakage (Recursive); Phase 6 Cross-Branch Consistency Check. | Phase 4's recursive walk is the primary structural check for branch isolation. World-level Rule 4 enforcement is `canon-addition` + `continuity-audit`'s cross-domain audit. |
| Rule 5: No Consequence Evasion | Phase 3 (three coverage sub-checks); Phase 5 Narrative-Debt Evolution. | Story-scope consequence enforcement. Dead-end obligations and orphaned consequences are `error`; sustained debt accumulation is `warning` or `error` depending on severity. World-level Rule 5 is `canon-addition` Phase 5 (visible_consequences) and `continuity-audit` Phase 4e + 4f. |
| Rule 6: No Silent Retcons | N/A (literal); spirit honored via Phase 9 drop-list discipline + Phase 10 frontmatter `dropped_finding_ids` / `dropped_card_ids` + report-body `(dropped by user at Phase 9)` markers + prior-audit-delta cross-reference. | Not literally applicable — meta-tooling skill emits no Change Log Entries because it does not mutate canon. The Rule 6 spirit ("no silent edits; audits as honest epistemic artifacts") is structurally enforced: surviving items keep originally-allocated ids (no renumbering), dropped items persist in the report body and frontmatter as visible gaps, re-surfaced findings cite their prior `SAU-NNNN`. World-level Rule 6 enforcement is `canon-addition` (Change Log emission) and `continuity-audit` Phase 4j + 4k + Phase 8 (Retcon Policy Checklist). |
| Rule 7: Preserve Mystery Deliberately | Phase 3 Mystery Firewall Integrity (per-claim resolution-authority routing); Phase 8 Per-Card Validation test 2 (RSP cards may not propose `forbidden`-status M resolution); whole-class M load. | `forbidden`-status M leakage is ALWAYS `error`; `canon_candidate` resolution that didn't pause for `story-fact-promotion-to-canon` is `error`; mismatched `epistemic_class` for `apparent` / `branch_local_counterfactual` resolution is `error`. The audit is the post-runtime enforcer of `branching-story-page-cycle`'s Phase 4.5 firewall and `storylet-pool-authoring`'s Phase 4 gate 2. |
| Rule 11: No Spectator Castes by Accident | N/A | Not applicable — meta-tooling skill introduces no new exceptional capability that could create spectator castes. The enforcement surface is `canon-addition` Phase 5 + `propose-new-canon-facts` (CF leverage-enumeration). |
| Rule 12: No Single-Trace Truths | N/A | Not applicable — same reasoning as Rule 2 / 3 / 11; the trace-multiplicity discipline applies to new world-level hard-canon truths, not to meta-tooling diagnostic reports. The enforcement surface is `canon-addition` + `propose-new-canon-facts`. |
| Canon Layering | Phase 3 Mystery Firewall and Phase 4 Canon-Baseline Drift preserve the contested vs hard vs mystery layer separation by classifying any leakage between them as `error` or `warning`. The audit's RSP cards inherit `proposed_visibility.scope` from the source finding's branch context, preserving the per-story layer below world canon. | The audit reads layer information; it does not promote or demote any layer. World-canon mutation routes through `canon-addition` (and through `story-fact-promotion-to-canon` once it ships). |
| Change Control Policy | N/A | Not applicable — meta-tooling skill emits no Change Log Entries. Per FOUNDATIONS §Change Control Policy, "every approved change must get a record" applies to world-level canon mutations; the audit produces diagnostic reports + candidate remediation cards, not changes. The handoff is `canon-addition` for any later world-canon promotion via `story-fact-promotion-to-canon`. |

## Guardrails

- **HARD-GATE is absolute** (see top of file). No file is written until Phase 7 Self-Check passes for every finding, Phase 8 Per-Card Validation passes for every emitted RSP card, AND the user explicitly approves (or accepts-with-droplist) the Phase 9 deliverable summary. Auto Mode does not override.
- **Read-only against story state.** This skill never `Write`s or `Edit`s `worlds/<world-slug>/WORLD_KERNEL.md`, `ONTOLOGY.md`, any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record, `STORY_KERNEL.md`, any `worlds/<world-slug>/stories/<story-slug>/_source/<class>/*.yaml` record, any `pages-prose/*.md` file, any `storylet-batches/*.md` file, or the bundle's top-level `INDEX.md`. All writes confined to `worlds/<world-slug>/stories/<story-slug>/audits/`. Hook 3 enforces the world-canon side; the story-bundle restriction is skill discipline.
- **Sibling-bundle reads under `cross_story_scope: true` are STORY_KERNEL-only.** The audit reads `worlds/<world-slug>/stories/*/STORY_KERNEL.md` for inter-story-conflict heuristics; sibling `_source/<class>/*.yaml` records are NEVER bulk-read. Widening this surface would create new branch-isolation analogs at the inter-bundle level and require its own audit category.
- **Branch-isolation severity floors are structural, not preferential.** Branch-isolation invariant violations are ALWAYS `error`, never `warning`. Snapshot-replay equality failures are ALWAYS `error`. `forbidden`-status M leakage is ALWAYS `error`. Phase 7 Self-Check tests 3 + 4 + 5 enforce this; bypassing the floors would silently weaken the audit's value as evidence of structural integrity.
- **Drop-list discipline is load-bearing.** Surviving items at Phase 9 keep originally-allocated `F-NN` and `RSP-NNNN` ids — no renumbering, ever. Dropped findings persist in the report body marked `(dropped by user at Phase 9)` with the user's optional one-line reason; their ids appear in `dropped_finding_ids` frontmatter. Dropped cards are never written; their ids appear in `dropped_card_ids` frontmatter and in the Remediation Proposals Index. This realizes FOUNDATIONS Rule 6's spirit ("audits as honest epistemic artifacts") even though the skill emits no Change Log Entries.
- **Append-only ID discipline.** SAU-NNNN and RSP-NNNN ids are append-only. Dropped ids at HARD-GATE become permanent gaps. REJECT at Phase 9 burns the SAU-NNNN as a permanent gap. REVISE at Phase 9 releases this run's lazy-allocated RSP-NNNN ids back to the next-available pool because they were never consumed by a write.
- **Proposes; does not apply.** Every emitted `RSP-NNNN` card is a candidate for `storylet-pool-authoring` (mode=audit) — it does not create a storylet. Every manual-intervention flag is a recommendation — it does not mutate the bundle. The skill never invokes `storylet-pool-authoring`, `branching-story-page-cycle`, or `story-fact-promotion-to-canon`; the user separately invokes them with the audit's outputs as input.
- **Direct `Write`/`Edit` is the correct mutation surface for `audits/`.** `audits/` lives outside `_source/`, so Hook 3's match pattern doesn't apply. Parallels `continuity-audit`'s direct-Edit posture for its world-level `audits/` surface.
- **No bulk-read of `worlds/<slug>/_source/<world-subdir>/`.** Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. Use `get_record`, `get_context_packet`, `find_sections_touched_by`, `search_nodes`, `list_records(... include_full_body=true)` instead. Direct `Read` of `worlds/<slug>/stories/<slug>/_source/<story-subdir>/` IS the correct surface (Hook 2's match pattern doesn't cover nested story bundles).
- **Cross-story scope is opt-in and bounded.** `cross_story_scope: true` enables Phase 3's inter-story-conflict sub-check by reading sibling STORY_KERNEL files only; it never widens to deep sibling-bundle reads, never widens to writing under sibling bundles' `audits/`, and never produces RSP cards targeting sibling bundles.
- **Empty findings are diagnostic, not silence.** A category audited and clean is named in Per-Category Findings as such ("no findings — audited and clean"); silently omitting a category whose `audit_focus` matched is a Phase 1 violation. A bundle whose audit produces zero findings overall is a legitimate clean audit, recorded as such with `finding_count_by_severity: {error: 0, warning: 0, info: 0}`.
- **Sibling interop**:
  - **Consumes (existing)**: `branching-story-bootstrap` outputs (story bundle structure including STORY_KERNEL.md, `_source/<class>/`, `pages-prose/`); `branching-story-page-cycle` outputs (PG / SE / CHC records and `narrative_health` flags including `flagged_for_audit`); `storylet-pool-authoring` outputs (SLT records — visibility scopes audited at Phase 3 Storylet-Scope Leakage).
  - **Produces inputs for**: `storylet-pool-authoring` mode=audit (RSP cards directly consumable as `source_audit_path` — wired post-STPOOL-001).
  - **Future consumers (deferred)**: `story-fact-promotion-to-canon` — manual-intervention flags about unauthorized canon promotion route to it manually until that skill ships.
- **Known integration debt** (deferred — see filed tickets):
  - **BSPAG-002**: Wire `branching-story-page-cycle`'s `narrative_health.flagged_for_audit` and high-JIT-rate signals into this audit's branch-prioritization input AND replace page-cycle's "deferred sibling" / "Until shipping..." prose with factual references to this skill.
  - **STPOOL-001**: Implement audit mode in `storylet-pool-authoring` — currently aborts at Pre-flight. Once landed: audit-mode storylet generation consumes `source_audit_path` and applies RSP-driven seed generation, replacing storylet-pool-authoring's "audit mode... deferred until branching-story-health-audit ships" prose with factual references.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **No git commit.** Writes land in the working tree only; the user reviews the diff and commits.

## Final Rule

A branching story is healthy not when it is long, but when every salient obligation has at least one viable closure route, every pending consequence has at least one addressing storylet, every active thread is either advancing or visibly stalled by world logic, every applied event is justified by character intention or external pressure, every mystery declared in play is preserved (or properly promoted with audit trail; or branch-locally / apparently resolved with the correct epistemic_class), every branch is structurally isolated from siblings (recursive reference closure holds, not merely top-level provenance), every relationship state is coherent through its supersession chain, every page is replay-coherent from its parent, every storylet's visibility scope matches its scope of dependence, and every terminal branch satisfies the closure-readiness criteria its terminal page claims — and this skill produces the diagnosis and the remediation proposal cards that reveal that health (or its absence), but never fixes the story itself; fixing routes through `storylet-pool-authoring` (mode=audit, consuming this skill's RSP cards), `branching-story-page-cycle` (rollback / re-render), or `story-fact-promotion-to-canon` (for canon-level retroactive moves).
