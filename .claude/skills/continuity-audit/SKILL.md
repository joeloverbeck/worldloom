---
name: continuity-audit
description: "Use when auditing an existing worldloom world's canon for contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, or diegetic leakage. Produces: a consolidated audit report at worlds/<world-slug>/audits/AU-NNNN-<date>.md, optional retcon-proposal cards at worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md (directly consumable as canon-addition's proposal_path), and an auto-updated audits/INDEX.md. Mutates: only worlds/<world-slug>/audits/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any other world-level canon file)."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: parameters_path
    description: "Optional markdown file declaring: audit_scope (`all` or a subset of categories 1-10); severity_floor (integer 1-5, default 3 — findings at or above this level emit retcon cards); focus_domains; trigger_context (`post-canon-addition` / `pre-publication` / `periodic` / `user-suspected-contradiction`); recent_canon_addition_cutoff (a CH-NNNN id or ISO date bounding the change-log delta window). If omitted, Phase 0 interviews the user. If thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Continuity Audit

Audits an existing world for the eight audit categories — contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, diegetic leakage — plus the SPEC-09 Silent-Area Canonization check, and writes a consolidated audit report plus, for every finding at or above the configured severity floor, a retcon-proposal card whose path is directly consumable by `canon-addition`. This skill **proposes** retcons; it does not apply them. Canonization happens only when `canon-addition` runs on the emitted RP-NNNN card.

<HARD-GATE>
Do NOT write any file — audit report, retcon-proposal card, INDEX.md update — until: (a) pre-flight allocates `AU-NNNN` via `mcp__worldloom__allocate_next_id`, loads the world-state context packet via `get_context_packet(task_type='continuity_audit', ...)`, and confirms `worlds/<world-slug>/` exists; (b) Phase 9 self-check passes for every finding (citation, severity rationale, retcon-type/repair conformance, repair-policy justification, schema parity); (c) Phase 12 validation passes at per-finding, per-card, and audit-level layers; (d) the user has explicitly approved the Phase 13 deliverable summary (full audit report body, every retcon card's full content, per-card Retcon Policy checklist, any Phase 9 repairs that fired, any findings or cards the user is dropping). The user's approval may include a drop-list of finding-IDs and/or RP-NNNN ids to exclude. Dropped findings are recorded in the audit report's `dropped_finding_ids` / `dropped_card_ids` frontmatter. The gate is absolute under Auto Mode — invoking the skill is not approval of the deliverable.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id AU; get_context_packet for world state;
            get_canonical_vocabulary for domain/verdict/mystery enums)
      |
      v
Phase 0:  Normalize Parameters (parse OR interview; verify cutoff CH-id)
      |
      v
Phase 1:  Scope (map parameters to active categories 1-10;
                 record deferred categories with rationale)
      |
      v
Phase 2:  Change Log Delta Analysis (per-CH risk profile via search_nodes
                                     + get_record + get_neighbors)
      |
      v
Phase 3:  Continuity Lint Sweep (10 lint questions, candidate findings only)
      |
      v
Phase 4:  Audit Category Passes 4a-4k (typed-query enumeration; semantic
                                       judgment per references/audit-categories.md)
      |
      v
Phase 5:  Severity Classification (1-5 with cited rationale)
      |
      v
Phase 6:  Burden Debt Analysis (Rule 3 post-acceptance drift)
      |
      v
Phase 7:  Repair Menu Application (lightest viable; classify Type A-F)
      |
      v
Phase 8:  Retcon Card Drafting (one RP-NNNN per repair requiring CF change)
      |
      v
Phase 9:  Self-Check Rejection Tests (loop back to responsible phase on FAIL)
      |
      v
Phase 10: Update Priority List (severity × domain_weight; reproducible)
      |
      v
Phase 11: Draft Audit Report (named sections per templates/audit-report.md)
      |
      v
Phase 12: Validation Tests (per-finding, per-card, audit-level)
      |
      v
HARD-GATE → Phase 13 Commit (cards-first → report → INDEX.md; partial-failure-safe order)
```

## Output

- **Audit report** at `worlds/<world-slug>/audits/AU-NNNN-<YYYY-MM-DD>.md` — hybrid YAML frontmatter + markdown body matching `templates/audit-report.md`. Frontmatter: `audit_id`, `world_slug`, `date`, `parameters`, `trigger_context`, `severity_floor`, `categories_audited`, `categories_deferred`, `finding_count_by_severity`, `retcon_card_ids`, `dropped_finding_ids`, `dropped_card_ids`, `user_approved`. Body: Phase 2 delta trace, per-category findings, Burden Debt trace, Update Priority List, Retcon Proposals Index, Phase 9 Self-Check trace, Phase 12 Validation trace, Categories Deferred. Direct-`Edit` write — Hook 3 allows `audits/` because the file lives outside `_source/`.
- **Retcon-proposal cards** (zero or more) at `worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md` — one file per surviving finding at or above the severity floor. Hybrid YAML frontmatter parallel to `templates/canon-fact-record.yaml` plus retcon-specific fields (`retcon_type: A|B|C|D|E|F`, `target_cf_ids`, `severity_before_fix`, `severity_after_fix`, `audit_origin: AU-NNNN`, `finding_id`). Each card's path is directly consumable as `canon-addition`'s `proposal_path`. Direct-`Edit` write.
- **INDEX.md** at `worlds/<world-slug>/audits/INDEX.md` — one line per non-dropped audit run: `- [AU-NNNN](AU-NNNN-<date>.md) — <trigger_context> / sev-max <N> / <finding_count> findings / <retcon_card_count> retcon cards`, sorted by AU-NNNN ascending. Created with header `# Continuity Audits — <World-Slug-TitleCased>` if absent. Direct-`Edit`.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/*.yaml`. No CF emitted. No CH emitted. Each retcon card is a *candidate*; canonization happens only when `canon-addition` accepts it in a separate run.

## World-State Prerequisites

`docs/FOUNDATIONS.md` plus the world-state slice the audit touches arrive via `mcp__worldloom__get_context_packet(task_type='continuity_audit', seed_nodes=[<world-overview-seeds>], token_budget=20000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. The audit packet is wider than canon-addition's because the categories are intrinsically cross-cutting; if a category sub-pass needs more than the packet's `body_preview` carries, follow up with `mcp__worldloom__get_record(record_id)`. Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read.

For per-phase retrieval-tool selection, see `references/retrieval-tool-tree.md`. Every Phase 4 sub-pass, the Phase 2 delta scan, and the Phase 6 burden-debt scan name the typed query they consume.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first. Missing sub-directories (`characters/`, `diegetic-artifacts/`, `proposals/`, `adjudications/`, `audits/`) are NOT abort conditions — the skill records absence in the audit report's `categories_deferred` justification so 4i diegetic-leakage findings in those surfaces are legitimately out-of-scope rather than silently skipped.

## Procedure

1. **Pre-flight.** Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`). Allocate `AU-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, 'AU')`; do NOT pre-allocate RP ids — allocate lazily at Phase 8 per emitted card. Load the context packet (per §World-State Prerequisites). Look up canonical vocabularies via `mcp__worldloom__get_canonical_vocabulary({class})` for `domain`, `verdict`, `mystery_resolution_safety` so any retcon card's `domains_affected` and any narrowed-mystery extension reference is validated at reasoning time. Read existing `audits/INDEX.md` if present; record its current content for Phase 13 append.

2. **Phase 0: Normalize Parameters.** Parse `parameters_path` if provided, otherwise interview the user one question at a time. Bind `audit_scope`, `severity_floor` (default 3), `focus_domains`, `trigger_context`, `recent_canon_addition_cutoff`. **Cutoff verification**: if `recent_canon_addition_cutoff` is a CH-NNNN id, search the index for it before proceeding. If absent, abort: "Cutoff change_id not found in ledger." **Cutoff semantics**: if the cutoff equals the latest CH, treat as inclusive anchor (Phase 2 includes it); otherwise apply strict newer-than. Record the disambiguation in the audit report body. Reject any parameter trying to dictate that a specific CF "should" be retconned — that is canon-addition's territory.

3. **Phase 1: Scope.** Map `audit_scope` + `focus_domains` to active Phase 4 sub-passes. Categories deferred under `all` get a one-line rationale recorded in `categories_deferred` for the report. **Rule**: a category silently skipped would produce a false "no findings" read — `categories_deferred` is the disambiguation surface.

4. **Phase 2: Change Log Delta Analysis.** Enumerate `CH-NNNN` records in the cutoff window via `search_nodes(node_types=['change_log_entry'])`. For each: `get_record(CH-NNNN)` and `get_neighbors(CH-NNNN, edge_types=['affects_cf','touches_invariant','touches_mystery_reserve'])`. Per-CH risk profile records `affected_fact_ids`, `invariants_touched`, `mystery_reserve_interactions`, `required_world_updates`, and `patch_attribution_status` (cross-check via `find_sections_touched_by(cf_id)` — does each named SEC actually carry the CF in its `touched_by_cf[]`?). Missing bidirectional pointers feed Phase 4 4j and Hidden Retcons candidate findings. **FOUNDATIONS cross-ref**: Rule 6 (No Silent Retcons). Empty-window deltas are legitimate, not bugs.

5. **Phase 3: Continuity Lint Sweep.** Run the 10 lint questions mechanically (see `templates/audit-report.md` §Continuity Lint Sweep Summary for the question list). Each question produces zero or more candidate anchors. Un-anchored flags are discarded; every candidate cites at least one CF id or concrete record/section anchor (e.g., `SEC-GEO-007 ¶3`). Phase 3 output is a candidate list, not findings.

6. **Phase 4: Audit Category Passes.** Load `references/audit-categories.md`. One sub-pass per active category/check. Each sub-pass uses the typed MCP query named in `references/retrieval-tool-tree.md` §Phase 4 to enumerate candidates, then applies the semantic judgment described per category. Findings carry `finding_id` (`F-NN`), triggering category/check (`4a`–`4k`), cited CF ids and/or record anchors, one-paragraph description, and feed forward to Phase 5. **A category or check with no findings produces an explicit "no findings — audited and clean" entry; silent skipping is a Phase 1 violation.**

   **4k — Silent-Area Canonization (SPEC-09 / Default Reality).**
   - **Trigger**: any CF added since the previous audit cycle, or every CF in scope for a full-history audit, whose `domains_affected` introduces at least one domain not previously covered by another CF in the audited set.
   - **Detection inputs**: enumerate CF records through `mcp__worldloom__search_nodes(node_types=['canon_fact_record'])`, then use `mcp__worldloom__get_record(CF-NNNN)` for any body or frontmatter fields not present in the search result. For each candidate CF, compute the union of `domains_affected` across all other CFs in the comparison set. Mark a domain as previously silent if it appears in the candidate's `domains_affected` but is absent from that union.
   - **Delta ordering**: when `recent_canon_addition_cutoff` is present, compare candidate CFs from the Phase 2 delta window against prior CFs outside that delta window. For full-history audits with no delta window, compare each candidate against all other CFs and treat the result as an audit finding candidate rather than a historical hard failure.
   - **Acknowledgment surface**: accept a one-line acknowledgment in `cf.notes` or an explicit `cf.source_basis` annotation matching any of these case-insensitive patterns: `previously unmodeled`, `previously silent`, `first canonization of <domain>`, `silent area`, or `default reality`.
   - **Output**: when acknowledgment is missing, emit a retcon-proposal candidate at `audits/AU-NNNN/retcon-proposals/RP-NNNN-<slug>.md`. The candidate's body cites the CF, names the silent domain, and proposes adding an acknowledgment line to `cf.notes` or `source_basis` in the Default Reality posture. Never hard-fail: the audit surfaces the gap; only `canon-addition` can apply the retcon.
   - **Firewall**: this check reads `domains_affected`, `notes`, and `source_basis` only. It never reads or writes Mystery Reserve entries and never treats a previously silent domain as permission to resolve a mystery.

7. **Phase 5: Severity Classification.** Assign 1–5 with one-line rationale per `references/repair-and-retcon.md` §Severity. Bare "Severity 4" without rationale fails Phase 9.

8. **Phase 6: Burden Debt Analysis.** Per `references/repair-and-retcon.md` §Burden Debt cross-cut. `search_nodes` for capabilities/artifacts/technologies/institutions/rituals/magic_practice CFs; for each, `find_impacted_fragments(CF)` to enumerate later references; flag drift from declared `costs_and_limits` and `distribution.why_not_universal`. Distinct from Phase 4c in time horizon. **FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation), post-hoc.

9. **Phase 7: Repair Menu Application.** For each finding ≥ `severity_floor`, select the lightest viable repair from the 8-item menu in `references/repair-and-retcon.md` §Repair Menu and classify the resulting change as Type A–F per the §Retcon Taxonomy mapping. Split-the-Fact emits two RP cards (B+A pair). No-CF-target findings escalate to "requires user design decision" — no RP id consumed.

10. **Phase 8: Retcon Card Drafting.** For each repair requiring a CF change: allocate `RP-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, 'RP')`. Verify each `target_cf_ids` entry exists via `get_record(CF-NNNN)`. Validate `domains_affected` values against `get_canonical_vocabulary({class: 'domain'})`. Compose the card per `templates/retcon-proposal-card.md`. The Retcon Policy Checklist must carry one-line justifications per item; bare booleans fail Phase 9 test 4. If ANY checklist entry would be `false`, the card cannot be emitted — escalate to "requires user design decision" instead.

11. **Phase 9: Self-Check Rejection Tests.** Run structural tests across every finding and every drafted retcon card. Each test records PASS with one-line rationale OR FAIL with the responsible loop-back phase; bare PASS is FAIL.
    1. Every finding cites anchor — `finding_id` carries at least one CF id or concrete record/section anchor. (Loop → Phase 4)
    2. Every severity has rationale — bare numbers fail. (Loop → Phase 5)
    3. Retcon type matches repair — per the `references/repair-and-retcon.md` mapping. (Loop → Phase 7)
    4. Retcon Policy Checklist is justified — every entry is a one-line rationale, not a bare boolean. (Loop → Phase 8)
    5. No retcon increases net contradictions — if the proposed revision would introduce >1 new conflict, escalate; do not emit. (Loop → Phase 7 for a lighter repair, or escalate)
    6. CF-schema parity preserved — retcon card frontmatter carries every required CF field per `templates/retcon-proposal-card.md`. (Loop → Phase 8)

12. **Phase 10: Update Priority List.** Rank surviving findings + retcons by `severity × domain_weight` per `references/repair-and-retcon.md` §Update Priority List Sort Key. Bucket into `now` / `next-batch` / `deferred` / `cosmetic`. Reproducible; ties break on `finding_id` ascending.

13. **Phase 11: Draft Audit Report.** Assemble the report per `templates/audit-report.md`. Named sections are load-bearing — preserve verbatim so future audits' cross-audit grep continues to work.

14. **Phase 12: Validation Tests.** Each test records PASS with one-line rationale OR FAIL. Bare PASS is FAIL. Any FAIL halts and loops; Phase 13 is blocked until every test passes.
    - **Per-finding**: (1) citation completeness; (2) severity rationale.
    - **Per-card**: (3) CF-schema parity; (4) Retcon Policy Checklist complete; (5) Retcon type conformance; (6) `target_cf_ids` exist (each id verifiable via `get_record`).
    - **Audit-level**: (7) AU-NNNN uniqueness (re-confirm via `allocate_next_id` if there is any risk of concurrent invocation); (8) `finding_count_by_severity` matches body counts; (9) `retcon_card_ids` matches drafted card files; (10) `categories_deferred` accuracy; (11) Report body internal consistency — every finding_id in the priority list is in Per-Category Findings; every RP-NNNN in the Retcon Proposals Index is in `retcon_card_ids`.

15. **HARD-GATE → Phase 13 Commit.** Present the deliverable summary: full report body, every card's full frontmatter + body, every Retcon Policy Checklist, Phase 9 self-check + Phase 12 validation traces, deferred categories with rationale, target write paths. **HARD-GATE fires here**: no file written until user approves. User may (a) approve as-is, (b) approve with a drop-list (finding-IDs and/or RP-NNNN ids), (c) request revisions (loop to named phase), (d) reject and abort. **Drop-list semantics**: surviving items retain originally-allocated ids (no renumbering — F-NN and RP-NNNN gaps are permanent). Dropped findings persist in the report body marked `(dropped by user at Phase 13)` — audits are epistemic artifacts; honesty about what was surfaced is load-bearing. Dropped cards are never written; their ids appear only in `dropped_card_ids` and as `(dropped by user at Phase 13)` entries in the Retcon Proposals Index. On approval, write in this order — partial-failure recovery is procedural here because writes are direct-Edit, not engine-routed:
    1. **Retcon cards first** (non-dropped only): create `audits/AU-NNNN/` and `audits/AU-NNNN/retcon-proposals/` if absent; write each card. Set `source_basis.direct_user_approval: true` on each card before writing — this means "kept in audit's recommendations", NOT "accepted as canon".
    2. **Audit report second**: write `audits/AU-NNNN-<YYYY-MM-DD>.md` with `dropped_finding_ids`, `dropped_card_ids`, `user_approved: true`.
    3. **INDEX.md last**: read existing (create with header `# Continuity Audits — <World-Slug-TitleCased>` if absent), append the AU row, sort by AU-NNNN ascending, write back.

    Cards-first sequencing means a partial-failure state is detectable: orphaned cards (grep INDEX for AU-NNNN absence) or report without INDEX row (grep INDEX for AU absence). Recovery is manual: update INDEX.md by hand, or delete orphaned files and re-run with the same parameters (which allocates fresh ids).

    Report all written paths. Do NOT commit to git.

## Validation Rules This Skill Upholds

This skill is the post-acceptance enforcer of the original 7 Validation Rules plus SPEC-09's audit-side Default Reality check:

- **Rule 1 (No Floating Facts)** — Phases 4a/4b; Phase 12 test 3 (CF-schema parity on emitted retcon cards).
- **Rule 2 (No Pure Cosmetics)** — Phase 4f.
- **Rule 3 (No Specialness Inflation)** — Phase 6 (acceptance-time enforcement is canon-addition's Phase 11).
- **Rule 4 (No Globalization by Accident)** — Phase 4c (CF-level) + Phase 4j (prose-level).
- **Rule 5 (No Consequence Evasion)** — Phase 4e + Phase 4f.
- **Rule 6 (No Silent Retcons)** — Phase 2 delta detection + Phase 4k Silent-Area Canonization + Phase 8 Retcon Policy Checklist per card.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 4h + Phase 4i.

## Guardrails

- **Single existing world per invocation.** Never creates a world (`create-base-world` does that), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, `archive/`, or `brainstorming/`.
- **No canon-file mutations.** All writes confined to `worlds/<world-slug>/audits/`. The skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, any `_source/*.yaml`, `characters/`, `diegetic-artifacts/`, `proposals/`, or `adjudications/`. It reads those surfaces (via MCP retrieval) for diegetic leakage and change-log interaction; it writes only `audits/`.
- **No bulk-read of `_source/`.** Hook 2 redirects oversized `_source/` directory reads to MCP retrieval. Use `get_record`, `get_context_packet`, `find_sections_touched_by`, `search_nodes` per `references/retrieval-tool-tree.md` instead.
- **Direct-Edit allowed under `audits/`.** Hook 3 only blocks `_source/*.yaml` writes; audit reports, retcon-proposal cards, and INDEX.md are direct-`Edit`. No engine op required for these files.
- **Empty findings are diagnostic.** A category audited and clean is named in Per-Category Findings as such; silent suppression is a guardrail violation.
- **Proposes; does not apply.** Every emitted RP-NNNN card is a candidate for canon-addition's separate adjudication. `source_basis.direct_user_approval: true` on a retcon card means "reviewed and kept in the audit's recommendations" — NOT "accepted as canon".
- **ID-collision abort.** If pre-flight `next_au_id` or any per-card `next_rp_id` allocation would collide with an existing file, abort. Never overwrite an existing audit report, retcon card, or INDEX row.
- **Interop seam with canon-addition is one-way and card-level.** This skill produces RP cards; canon-addition consumes one card at a time via `proposal_path`. This skill does not batch-submit and does not update its cards after adjudication. Stale cards are operator cleanup, not this skill's concern.
- **Prior audit delta.** Pre-flight reads `audits/INDEX.md` and recent AU reports. A prior audit's recommendation that was never adjudicated is the user's call whether to re-recommend; if a new audit re-surfaces the same finding, the finding body cites the prior AU to prevent recommendation thrash.
- **Inherited-drift handling.** Per `references/repair-and-retcon.md` §Inherited-Drift Discipline. Silent retroactive prose correction violates Rule 6 even when factually right.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **No git commit.** Writes land in the working tree; the user reviews and commits.
- **HARD-GATE absoluteness.** Auto Mode does not relax the gate.

## Final Rule

A continuity audit is not written until every finding has a cited CF or record anchor and a severity with stated rationale; every proposed retcon has a repair-menu-derived type, a justified Retcon Policy checklist, and CF-schema-parallel frontmatter; the priority list is deterministically ranked; and the user has approved the complete deliverable — and once written, the audit report is immutable evidence of the world's state at that moment, and each retcon card is a candidate for `canon-addition`'s separate adjudication, not a completed change.
