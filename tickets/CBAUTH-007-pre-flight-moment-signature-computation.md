# CBAUTH-007: Add pre-flight moment-signature computation (step 4(iii)) and `supersession_window_pages` arg

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/SKILL.md` + `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: None (CBAUTH-008/009/010 depend on this)

## Problem

`commitment-block-authoring`'s `direct_batch` Phase 1 runs as a *pool-wide* coverage projection across 17 targets (14 causal-function + cast-role + 2 SPEC-80 composition) plus a 6-lane depth-criteria checklist (CBAUTH-005). All passes compute from the pool projection alone — none reads the latest committed PG, the parent SE's resolution kind, the just-emitted CHCs, or the just-superseded records. The operator's intended invocation pattern — running this skill regularly after each meaningful story moment — requires the skill to be moment-aware so it can ask "does the pool fit the moment that just happened?", not only "does the pool cover the 17 targets?".

Design `docs/plans/2026-05-30-commitment-block-authoring-moment-signature-design.md` Approach C resolves this by computing a **moment signature** at pre-flight and feeding it into Phase 1 as a third input pass. The signature is the local-salience read of the present configuration at the latest committed PG, with two auxiliary subsystems for supersession evidence (just-shifted topology) and forward-pointing affordances (just-emitted CHCs).

This ticket lands the foundational change: the pre-flight step 4(iii) procedure that computes the moment-signature working-memory artifact, plus the new optional `supersession_window_pages` skill arg that controls how far back the supersession scan walks. Phase 1 consumption of the signature (Pass B + three-state saturation verdict + early-termination) lands in CBAUTH-008. Phase 2 authoring guidance lands in CBAUTH-009. Phase 5 manifest section lands in CBAUTH-010.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/SKILL.md:40` (Pre-flight Check HARD-GATE clause) names step 4 as the pool-wide SLT inventory load; step 4(i) (full retrieval) and step 4(ii) (per-page eligibility shortlist when mutation planning is in scope) are documented at `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` §Pre-flight Check. Verified by direct Read this session. This ticket adds step 4(iii) between 4(ii) and step 5 (id allocation).
2. `.claude/skills/commitment-block-authoring/SKILL.md:90-101` Inputs § Mode-specific § `direct_batch` lists `target_count` (default 6, max 12) and `focus` (natural-language hint). This ticket adds an optional `supersession_window_pages` arg (default 3, min 1, max 8) to the same section. `branching-story-health-audit`'s recent-activity scan defaults at 3 pages are the precedent (verify against `.claude/skills/branching-story-health-audit/SKILL.md` recent-activity prose during implementation).
3. Shared boundary under audit: the pre-flight retrieval-budget envelope and the existing `mcp__worldloom__list_records` filter contract. This ticket adds up to 8 retrievals worst case (1 SE body + 1 CHC list + 6 supersession-scan list calls), realistically 4-6 (most bundles supersede records in 2-3 classes per turn). No new MCP capability is introduced — only existing-surface use with documented fallbacks.
4. FOUNDATIONS principle under audit: §Story Bundles §5c (Present Causal State, Not Narrative Shape — "Driver salience is local"). The moment-signature is a local-salience read of the present configuration at the latest committed PG — explicitly NOT a target-narrative-shape lookahead or arc-position score. This is the authoring-time analogue of §5c's prior local-salience-ranking pass for driver selection at runtime.
5. HARD-GATE semantics under audit: pre-flight step 4(iii) is an addition to the HARD-GATE pre-requisite list, not a relaxation. Step 4(iii) MUST complete before HARD-GATE fires; the moment-signature artifact MUST be present in the deliverable summary surfaced to the user at HARD-GATE time (echoed by CBAUTH-008 Phase 6 summary work). Mystery Reserve firewall (Phase 3 gate 4) is unchanged — signature consumption does not bypass per-block mystery/invariant firewalls.
6. The two existing-MCP-surface dependencies need verification before implementation: (i) `mcp__worldloom__list_records(record_type=<class>, filter={supersedes_not_null: ..., shifted_at_page_range: ...})` — confirm filter-shape support; fallback is `list_records(record_type=<class>)` + client-side filter for short windows; (ii) `mcp__worldloom__list_records(record_type='choice_record', filter={parent_page: PG-N})` — confirm parent_page filter support; fallback is to read CHC ids from the latest PG's `state_snapshot` and `get_records` with explicit id list. Both fallbacks are operationally equivalent at small windows (window <= 8 pages, < 30 records per class typical).
7. Adjacent contradiction classification: CBAUTH-002/003/005 progressively elaborated the saturated-pool advisory and depth-criteria checklist on the pool-projection axis. None of them reached the moment-anchored axis this ticket opens. Required-consequence sequencing for the design's Approach C, not a separate bug.

## Architecture Check

1. Cleaner than alternatives: a new mode (`moment_specific`) would split operator intent across two `direct_batch`-shaped invocations and require a new `provenance.origin` value (`moment_batch`) plus an SLB-manifest schema extension. The pre-flight digest approach keeps a single execution path, leaves the SLT/SLB schemas unchanged, and lets the operator's regular invocation pattern work without choosing a mode. Approach A (Phase 1 additive lens with no pre-flight digest) would force every Phase 1 invocation to recompute the signature inline, fragmenting the diagnostic loop across passes. Approach C — pre-flight computes once, Phase 1 consumes — is the cleanest separation.
2. No backwards-compatibility aliasing/shims introduced: the new pre-flight step and new arg are additive. The `supersession_window_pages` arg is optional with a default; existing `direct_batch` invocations remain valid unchanged. `audit_repair` mode is unaffected (signature is computed only for `direct_batch`).

## Verification Layers

1. Invariant: pre-flight step 4(iii) is documented as a 7-step procedure in the pre-flight reference, with each step naming its retrieval call (or fallback) and its working-memory output → codebase grep-proof (the reference file enumerates steps 4(iii).1 through 4(iii).7 with explicit MCP call signatures).
2. Invariant: the new `supersession_window_pages` arg is documented in SKILL.md Inputs § Mode-specific § `direct_batch` with default 3, min 1, max 8, and a one-line rationale → codebase grep-proof.
3. Invariant: the Process Flow ASCII diagram in SKILL.md surfaces the moment-signature computation as a visible step within the Pre-flight box → codebase grep-proof.
4. Invariant: the moment-signature working-memory shape is documented in the pre-flight reference with all six top-level fields (`parent_page`, `parent_event`, `parent_event_kind`, `parent_event_resolution`, `active_high_salience_records`, `supersession_set`, `forward_affordance_fingerprint`, `cast_role_engagement_at_moment`) and the supersession_window_pages field → codebase grep-proof.
5. Invariant: when no committed PG exists yet (post-bootstrap, pre-PG-2), step 4(iii) skips computation with an explicit logged reason and Phase 1 runs as today → manual review (the reference subsection documents the no-committed-PG case with the `moment_signature_skipped: true` working-memory flag).
6. Invariant: `audit_repair` mode is not affected; signature is computed only for `direct_batch` → codebase grep-proof (the reference subsection scopes the procedure to `direct_batch`).

## What to Change

### 1. Add new pre-flight step 4(iii) procedure

In `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` §Pre-flight Check, add a new sub-section between the existing step 4 elaboration and step 5 (id allocation). Sub-section titled "**Pre-flight Check step 4(iii) — compute moment signature** (`direct_batch` only)".

Content covers the 7-step procedure:

```
4(iii).1 resolve parent_event_id from latest committed PG-N.resolved_event   (no MCP call; field already loaded at step 4)
4(iii).2 mcp__worldloom__get_record(record_id=parent_event_id)               1 retrieval → SE body
                                                                              extract kind, resolution_kind, effects
4(iii).3 filter PG-N state snapshot (already loaded) for active_high_salience_records:
           - threads:         urgency >= high
           - obligations:     urgency >= medium
           - consequences:    urgency >= high
           - clocks:          salience >= high
           - secrets:         salience >= high AND status == hidden
           - story_questions: salience >= high AND status == open
           - relationships:   value >= high
           - beliefs:         currently-authoritative (no superseded_by)
         (operates on the context_packet surface; falls back to targeted
          get_records when a field is absent from the packet)
4(iii).4 mcp__worldloom__list_records(record_type='choice_record',           1 retrieval → just-emitted CHCs
           filter={parent_page: PG-N})
         compute action_family_distribution from CHC.action_families[];
         compute dominant_action_families (>= 40% threshold) and outlier_action_families
4(iii).5 supersession scan across window:
         for each record class in {threads, beliefs, relationships,
                                   obligations, consequences, clocks}:
           mcp__worldloom__list_records(record_type=<class>,                  1 retrieval per class (max 6)
             filter={supersedes_not_null: true,
                     shifted_at_page in [PG-(N-window) .. PG-N]})
           emit {old, new, shifted_at, axis: <inferred from new record's title|kind>}
         supersession_window_pages defaults to 3
4(iii).6 compute cast_role_engagement_at_moment by walking active_high_salience_records:
         for each record, resolve participants[] → STENT ids → STCHAR.role_in_story
         (uses STCHAR summaries already loaded at pre-flight step 5; no new retrieval)
4(iii).7 assemble moment_signature working-memory object; emit to Phase 1 input
```

Sub-section also documents the working-memory `moment_signature` object shape (all six top-level fields plus `supersession_window_pages`), the no-committed-PG skip case (`moment_signature_skipped: true`, reason "no committed PG (post-bootstrap)"), and the fallback paths for both MCP-filter shapes (per Assumption Reassessment item 6).

### 2. Add `supersession_window_pages` arg to SKILL.md Inputs

In `.claude/skills/commitment-block-authoring/SKILL.md` Inputs § Mode-specific § `direct_batch` (after the existing `target_count` and `focus` args), add:

```
- `supersession_window_pages` — integer; default 3, min 1, max 8. Controls how far back the moment-signature supersession scan walks. Defaults match branching-story-health-audit's recent-activity scan defaults; raise for bundles with long turn cadences where superseded records may sit older than 3 pages.
```

Also mirror in the frontmatter `arguments:` list as an optional arg.

### 3. Add pre-flight step 4(iii) bullet to SKILL.md HARD-GATE

In `.claude/skills/commitment-block-authoring/SKILL.md` HARD-GATE clause (a) Pre-flight Check (around line 40), add a new bullet after the existing step 4 bullet:

```
- for `direct_batch`: moment signature computed via pre-flight step 4(iii) (latest PG state + parent SE + just-emitted CHCs + supersession scan across window); working-memory artifact emitted to Phase 1 input (full procedure: see `references/pre-flight-and-prerequisites.md` §Pre-flight Check step 4(iii)); skipped with explicit logged reason when no committed PG exists yet (post-bootstrap, pre-PG-2);
```

### 4. Update Process Flow ASCII diagram

In `.claude/skills/commitment-block-authoring/SKILL.md` Process Flow diagram (around lines 56-81), extend the Pre-flight Check box's caption to surface moment-signature computation as a visible step:

```
Pre-flight Check (load FOUNDATIONS + shared contract; resolve bundle;
  validate mode; load current SLT pool [direct_batch] OR RSP cards
  [audit_repair]; allocate SLT + SLB ids; load world canon context
  packet; compute moment signature [direct_batch only — step 4(iii)])
```

### 5. Update §World-State Prerequisites list

In `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` §World-State Prerequisites (around line 3), add the moment-signature inputs:

- Latest committed PG state snapshot (active high-salience records by class + urgency/salience filter)
- Parent SE body (kind, resolution_kind, effects)
- Just-emitted CHC ids at the latest PG (action_family distribution)
- Recent supersession records across the configured window per record class

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — frontmatter `arguments:`, Inputs §Mode-specific §`direct_batch`, HARD-GATE clause (a), Process Flow diagram)
- `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (modify — §World-State Prerequisites, new §Pre-flight Check step 4(iii) sub-section)

## Out of Scope

- Phase 1 consumption of the moment signature (Pass B, three-state saturation verdict, early-termination) — lands in CBAUTH-008.
- Phase 6 deliverable-summary updates surfacing `moment_signature` echo, `moment_fit_lanes`, and `early_termination` state — lands in CBAUTH-008.
- Phase 2 authoring against moment-fit lanes — lands in CBAUTH-009.
- Phase 5 batch-manifest moment-signature inline-prose section — lands in CBAUTH-010.
- New schema fields on SLT, SLB, PG, SE, or any other story-bundle record class. The signature is working-memory only.
- New patch-op kinds, new validators, new MCP capability. The two MCP-filter dependencies (supersedes_not_null and parent_page filters) have client-side fallbacks; no new MCP surface is added.
- `audit_repair` mode behavior. Signature is computed only for `direct_batch`.
- Heuristic for choosing among moment-fit lanes when multiple apply (authorial in Phase 2; lane discovery is the only Pass B output).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "step 4(iii)\|moment_signature\|supersession_window_pages\|forward_affordance_fingerprint\|cast_role_engagement_at_moment" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` returns the new sub-section with all six top-level signature fields, the 7-step procedure with explicit MCP-call signatures, and the no-committed-PG skip case.
2. `grep -n "supersession_window_pages\|step 4(iii)\|compute moment signature" .claude/skills/commitment-block-authoring/SKILL.md` returns the new arg in Inputs + arguments frontmatter, the new HARD-GATE bullet, and the Process Flow diagram caption update.
3. Skill dry-run on `erotica-world / red-bunny` (PG-6 committed): re-invoke `direct_batch` with defaults; confirm the deliverable summary (or pre-flight trace if surfaced) shows the moment_signature working-memory artifact populated with the expected supersession_set (THR-1 → THR-4, BEL-12 → BEL-14, SREL-5 → SREL-6 within the default 3-page window), the active_high_salience_records reflecting PG-6's state, and the forward_affordance_fingerprint from CHC-26..30. CBAUTH-008 will land the Phase 1 consumption and deliverable surfacing; for this ticket's dry-run, confirming the signature is computed (visible in working memory or logged trace) is sufficient.
4. Skill dry-run on a post-bootstrap bundle with no PG-2 committed yet: confirm `moment_signature_skipped: true` with reason "no committed PG (post-bootstrap)"; Phase 1 runs as today.
5. Skill dry-run with `supersession_window_pages=1` on red-bunny PG-6: confirm only PG-6's own supersessions (THR-1 → THR-4, BEL-12 → BEL-14) populate `supersession_set`; SREL-5 → SREL-6 (shifted at PG-4) is excluded.

### Invariants

1. Pre-flight step 4(iii) MUST complete (or skip with explicit logged reason) before the HARD-GATE fires; the moment_signature artifact MUST be present (or explicitly marked skipped) in the deliverable summary surfaced at HARD-GATE time.
2. The moment-signature is a local-salience read of the present configuration at the latest committed PG; it MUST NOT compute target narrative shape, dramatic arc position, or look-ahead beyond the just-emitted CHCs (FOUNDATIONS §Story Bundles §5c "Driver salience is local"; authoring-time analogue).
3. The signature is shape extraction, not id binding; downstream Phase 1/Phase 2 use of the signature MUST compute existential-predicate shapes for `global_author_pool` SLT preconditions, never bind branch-local record ids directly (preserves Character-Fit Selection Contract §11a; CBAUTH-008/009 enforce this at consumption sites).
4. `audit_repair` mode is unaffected; signature is computed only for `direct_batch`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and skill-dry-run-based per Acceptance Criteria. The pre-flight retrieval calls are existing MCP-surface invocations with documented fallbacks; no new MCP capability is added to test.`

### Commands

1. `grep -n "step 4(iii)\|moment_signature\|supersession_window_pages\|active_high_salience_records\|forward_affordance_fingerprint\|cast_role_engagement_at_moment\|moment_signature_skipped" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md`
2. `grep -n "supersession_window_pages\|step 4(iii)\|compute moment signature" .claude/skills/commitment-block-authoring/SKILL.md`
3. Skill dry-run on `erotica-world / red-bunny` (PG-6 baseline) with `direct_batch` defaults; inspect pre-flight working-memory output for the moment_signature artifact; verify supersession_set entries, active_high_salience_records contents, and forward_affordance_fingerprint dominant/outlier action families match the PG-6 state.
4. Skill dry-run on `erotica-world / red-bunny` with `supersession_window_pages=1`; verify SREL-5 → SREL-6 (shifted at PG-4) is excluded from supersession_set.
5. Verify MCP-filter dependencies before implementation:
   - `mcp__worldloom__list_records(record_type='choice_record', filter={parent_page: 'PG-6', story_slug: 'red-bunny', world_slug: 'erotica-world'})` returns CHC-26..30; if not, fall back to reading PG-6.state_snapshot.choices and `get_records`.
   - `mcp__worldloom__list_records(record_type='thread_record', filter={supersedes_not_null: true, world_slug: 'erotica-world', story_slug: 'red-bunny'})` returns THR-4 (which supersedes THR-1); if filter unsupported, fall back to `list_records(record_type='thread_record', ...)` + client-side filter on the returned `supersedes` field.
