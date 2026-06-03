# CBAUTH-010: Add Moment-signature inline-prose section to Phase 5 batch-manifest template

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: CBAUTH-007 (consumes the `moment_signature` working-memory artifact); composes with CBAUTH-008 (the manifest can also reference `moment_fit_lanes` addressed by this batch, when CBAUTH-008's Pass B emits them)

## Problem

CBAUTH-007 lands the pre-flight `moment_signature` working-memory artifact and CBAUTH-008 lands Phase 1's `moment_fit_lanes[]` and `early_termination` outputs. CBAUTH-008's Phase 6 deliverable-summary surfacing makes those artifacts visible at the HARD-GATE moment, but the persisted `storylet-batches/SLB-<integer>.md` manifest (written at Phase 6 step 6 after HARD-GATE approval) currently has no section recording the source moment — so a future operator browsing the bundle's storylet-batches directory cannot reconstruct WHY a given SLB was authored (what moment in the story it was anchored to, which supersession axes / dominant action families / moment-fit lanes drove it).

Design `docs/plans/2026-05-30-commitment-block-authoring-moment-signature-design.md` §10 (Implementation notes — file 5) specifies a new inline-prose "Moment signature" section in the manifest template summarizing source PG, parent SE, supersession axes, dominant action families, and moment_fit_lanes addressed. The section is **inline prose**, not embedded YAML — preserving the existing manifest convention (per the file's current note: "Keep the manifest prose + tables. Do not embed a ```yaml fence for the Phase-1 coverage diagnosis — record coverage as inline prose"). This ticket lands the manifest-template extension.

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` documents the target shape for `storylet-batches/SLB-<integer>.md` with markdown sections (H1 SLB title + identity bullets + Blocks table + Skipped RSP cards table + Per-block validation traces + Per-block rejection traces). Verified by direct Read this session. The file is 36 lines, single H1, four H2 sections. This ticket adds one new H2 section ("Moment signature").
2. The file explicitly enforces inline-prose convention for Phase 1 coverage diagnosis (line 36): "Keep the manifest prose + tables. Do not embed a ```yaml fence for the Phase-1 coverage diagnosis — record coverage as inline prose." This ticket follows the same convention — the new Moment-signature section is inline prose, NOT an embedded YAML fence.
3. Shared boundary under audit: the persisted SLB manifest is direct-write markdown (no `create_slb_record` patch op exists; the file is direct-write per shared contract §10). This ticket extends the markdown template, not any schema. The world-index parser's `storylet-batches/` exemption from the canonical-ledger `unexpected_yaml_section` scan (per the existing line 36 parenthetical) remains relevant but unchanged.
4. FOUNDATIONS principle under audit: §Story Bundles §5b (Schema-Minimalism). The new section is inline prose — no field on any record schema is added. The persistence is in a markdown manifest, not a record schema; §5b's "every field load-bearing" discipline applies to record schemas, not manifest sections, but the same spirit applies: the new section MUST surface load-bearing information (the source moment that motivated the batch), not decorative metadata.
5. Adjacent contradiction classification: existing SLB-1..SLB-4 manifests in red-bunny (verified in worlds/erotica-world/stories/red-bunny/storylet-batches/) predate moment-signature computation. Existing manifests remain valid without retrofit — the new section is additive for batches authored after this ticket lands. Worked precedent: CBAUTH-005's depth-criteria lane labeling did not retrofit existing manifests either; the new vocabulary applied forward to subsequent batches only.
6. Composition with CBAUTH-008: when CBAUTH-008's Pass B emits moment_fit_lanes that the batch addresses, the manifest's Moment-signature section references those lanes. When Pass B emits no lanes (e.g., pool fit to moment but operator supplied `target_count` for depth-fill — early_termination did not fire because of explicit override), the section omits the lanes line and notes "moment_fit_lanes: none (pool fit to moment; batch is depth-fill per operator override)".

## Architecture Check

1. Cleaner than alternatives: a separate `worlds/<slug>/stories/<slug>/moment-signatures/` directory (one file per moment per SLB) would scatter the moment-signature record across two locations (the manifest references the moment-signature file by id). Inlining the moment-signature summary into the manifest itself keeps the batch-authoring decision and the moment context co-located — the operator reading the manifest sees both in one scroll. The full moment_signature artifact is working-memory only and is not persisted in YAML form anywhere; only the prose summary in the manifest persists.
2. No backwards-compatibility aliasing/shims introduced: existing SLB-1..SLB-N manifests remain valid without retrofit. New manifests authored after this ticket include the new section. The world-index parser's `storylet-batches/` exemption from `unexpected_yaml_section` scanning means even if a future ticket adds an embedded YAML fence to the manifest, it would not trigger spurious parser warnings — but this ticket does NOT add a YAML fence, consistent with the file's existing inline-prose convention.

## Verification Layers

1. Invariant: the new "Moment signature" section is documented in the manifest template with all five inline-prose elements (source PG, parent SE, supersession axes, dominant action families, moment_fit_lanes addressed) → codebase grep-proof.
2. Invariant: the section follows inline-prose convention (no embedded YAML fence); the existing line 36 prose-convention note explicitly extends to the new section → manual review (the template's prose convention is restated or cross-referenced when the new section is added).
3. Invariant: when pre-flight step 4(iii) skipped computation (`moment_signature_skipped: true` from CBAUTH-007), the manifest's Moment-signature section surfaces the skip reason ("no committed PG (post-bootstrap)") rather than the signature contents → manual review.
4. Invariant: when early-termination fired (CBAUTH-008 verdict), no SLB manifest is written at all (Phase 6 step 6 is skipped because there are no records to commit) — this invariant is enforced by CBAUTH-008's early-termination semantics, not by this ticket; cross-reference only.
5. Invariant: when CBAUTH-008's Pass B emitted no moment_fit_lanes but the batch proceeded under operator override (`target_count` or `focus` supplied), the manifest's Moment-signature section omits the moment_fit_lanes addressed line and notes the override → manual review.

## What to Change

### 1. Add §"Moment signature" section to the manifest template

In `.claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md`, extend the manifest template (around line 5-33). Insert a new H2 section between the identity bullets (around line 11 after `**Records**`) and the `## Blocks` table (line 13). Updated template excerpt:

```markdown
# SLB-<integer>: <mode> batch

**Mode**: direct_batch | audit_repair
**Source**: <focus hint, if direct_batch> | <audit_id + finding_ids, if audit_repair>
**Created**: <iso8601 date>
**Records**: <count> SLT records

## Moment signature (direct_batch only)

(Inline prose, not embedded YAML. Summarize the moment context from pre-flight step 4(iii) and Phase 1 Pass B output. Omit this entire section for audit_repair mode. When pre-flight step 4(iii) skipped computation, surface the skip reason instead of the signature contents.)

- **Source moment**: PG-<integer> (parent_event SE-<integer>, kind=<turn_resolution|...>, resolution=<player_action|player_write_in|npc_action|...>)
- **Supersession set** (within <window_pages>-page window): <prose enumeration of supersession transitions, each as `<old_id> → <new_id> @ PG-<integer> (axis: <inferred-axis>)`>. When supersession_set is empty (e.g., bundle has only PG-1), write "none within window".
- **Active high-salience configuration**: <prose summary of the active_high_salience_records counts by class — threads (urgency >= high), obligations (urgency >= medium), consequences (urgency >= high), clocks (salience >= high), secrets (salience >= high AND status == hidden), story_questions (salience >= high AND status == open), relationships (value >= high), beliefs (currently-authoritative)>.
- **Forward affordance fingerprint**: dominant action families <[family, family]>; outlier action families <[family, family, ...]>; from parent-page choices <[CHC-N, CHC-N+1, ...]>.
- **Cast-role engagement at moment**: <prose summary of which STENT roles the present configuration is exercising — pressure_source, opposing_actor, authority, dependent, information_source — naming the STENT ids per role>.
- **Moment-fit lanes addressed by this batch**: <prose enumeration of moment_fit_lanes from Pass B whose addressed_by_blocks intersect this batch's SLT ids, each as `<lane_id> (source: <supersession_set|forward_affordance+active_high_salience|cast_role_engagement|move_family_under_represented_at_moment>) — addressed by SLT-<N>, SLT-<M>`>. When Pass B emitted no lanes (pool fit to moment; batch is depth-fill per operator override of `target_count` or `focus`), write "none — pool fit to moment; this batch is depth-fill per operator override".

(When `moment_signature_skipped: true` from pre-flight step 4(iii) — e.g., no committed PG yet because the bundle is post-bootstrap before PG-2 — replace the bullets above with a single line: "Moment signature skipped: <reason from pre-flight, e.g., 'no committed PG (post-bootstrap)'>".)

## Blocks

| SLT id | move_family | scope | source RSP (if audit_repair) | validation |
|---|---|---|---|---|
| SLT-<integer> | <move_family> | global_author_pool | RSP-<integer> | PASS (6/6 gates) |
| ... | | | | |

## Skipped RSP cards (audit_repair only)

| RSP id | repair_kind | recommended sibling | skip reason |
|---|---|---|---|

## Per-block validation traces

(One section per surviving block; per-gate one-line PASS rationale.)

## Per-block rejection traces (if any)

(One section per rejected block; per-gate failure summary.)
```

### 2. Update prose-convention note

Extend the existing prose-convention note (line 36) to explicitly cover the new section:

```
Keep the manifest prose + tables. Do **not** embed a ` ```yaml ` fence for either the Phase-1 coverage diagnosis OR the Moment signature section — record coverage and moment-signature contents as inline prose (count + ids of pool coverage and gaps addressed; per-bullet narrative for moment signature). The Phase-1 `coverage_diagnosis` and the pre-flight `moment_signature` working-memory shapes are diagnosis / pre-flight artifacts, not verbatim manifest content. (The world-index parser exempts `storylet-batches/` manifests from the canonical-ledger `unexpected_yaml_section` scan, so an embedded fence would not produce a spurious info-warning; prose remains the preferred form for readability.)
```

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` (modify — new H2 "Moment signature" section in the template, extended prose-convention note)

## Out of Scope

- Pre-flight step 4(iii) and the `moment_signature` artifact — CBAUTH-007 lands those.
- Phase 1 Pass B and the `moment_fit_lanes[]` working-memory output — CBAUTH-008 lands those.
- Phase 2 authoring guidance against moment-fit lanes — CBAUTH-009 lands that.
- Retrofitting existing SLB-1..SLB-N manifests with Moment-signature sections. Existing manifests remain valid without retrofit; the new section applies forward to batches authored after this ticket lands. (CBAUTH-005's depth-criteria lane labeling did not retrofit either; same convention.)
- A separate persisted-record class for moment signatures (e.g., a `MSG-<integer>` story-bundle record). The signature is working-memory only; only the prose summary in the manifest persists. Adding a persisted-record class would require a new patch-op + validator + index field, out of scope for the design's Approach C.
- `audit_repair` mode. The new section is documented as `direct_batch` only; `audit_repair` manifests do not include it (signature is not computed for `audit_repair`).
- Changes to the world-index `storylet-batches/` parser. The new section is inline prose; the parser's existing `unexpected_yaml_section` exemption already covers any future YAML fences in this directory.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Moment signature\|Source moment\|Supersession set\|Active high-salience configuration\|Forward affordance fingerprint\|Cast-role engagement at moment\|Moment-fit lanes addressed" .claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` returns the new section title and all six inline-prose bullets (5 content + 1 lanes-addressed bullet) in the template.
2. `grep -n "direct_batch only\|Moment signature skipped\|moment_signature_skipped" .claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` returns the scope-restriction prose ("direct_batch only"), the skip-case prose, and the cross-reference to pre-flight step 4(iii)'s `moment_signature_skipped` working-memory flag.
3. `grep -n "Phase-1 coverage diagnosis OR the Moment signature\|inline prose\|unexpected_yaml_section" .claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` returns the extended prose-convention note covering both Phase-1 coverage and the new Moment signature section.
4. Skill dry-run on `erotica-world / red-bunny` (PG-6 baseline) with `direct_batch` defaults: when CBAUTH-008's Pass B emits lanes and the batch proceeds, verify the written `storylet-batches/SLB-<N>.md` manifest includes the Moment signature section with all six inline-prose bullets populated from the pre-flight artifact + Pass B output; verify NO embedded ```yaml fence in the section.
5. Skill dry-run on a post-bootstrap bundle with no PG-2 committed yet (if CBAUTH-007 / CBAUTH-008 allow `direct_batch` invocation in this state — typically not, because Phase 1 still runs but with `moment_signature_skipped: true`): verify the manifest's Moment signature section contains only the skip-reason line, not the bullet enumeration.
6. Skill dry-run on a representative `audit_repair` invocation: verify the manifest does NOT include the Moment signature section (scope restriction to `direct_batch` only).

### Invariants

1. The Moment signature section is inline prose; no embedded ```yaml fence is added (preserves the file's existing prose-convention discipline).
2. When `moment_signature_skipped: true` from pre-flight step 4(iii), the section surfaces the skip reason instead of bullet contents (no half-populated section).
3. The section's "Moment-fit lanes addressed by this batch" bullet references CBAUTH-008's Pass B output; when Pass B emitted no lanes (operator-override-with-depth-fill case), the bullet explicitly notes the override rather than being omitted (audit-trail discipline).
4. Existing SLB-1..SLB-N manifests in red-bunny (and any other bundle) are not retrofitted; the section applies forward only.
5. The section is `direct_batch`-only; `audit_repair` manifests do not include it (signature is not computed for `audit_repair`).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and skill-dry-run-based per Acceptance Criteria. The new section is a markdown template extension consuming existing working-memory artifacts from CBAUTH-007/008; no automated test surface is added.`

### Commands

1. `grep -n "Moment signature\|Source moment\|Supersession set\|Active high-salience configuration\|Forward affordance fingerprint\|Cast-role engagement at moment\|Moment-fit lanes addressed\|direct_batch only\|Moment signature skipped\|Phase-1 coverage diagnosis OR the Moment signature" .claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md`
2. Skill dry-run on `erotica-world / red-bunny` (PG-6 baseline) with `direct_batch` defaults; after HARD-GATE approval and SLB write, inspect the written manifest file for the new Moment signature section with all six bullets populated; verify no embedded YAML fence.
3. Skill dry-run on a representative `audit_repair` invocation; verify the manifest does NOT include the Moment signature section.
4. Spot-check existing manifests (`worlds/erotica-world/stories/red-bunny/storylet-batches/SLB-{1,2,3,4}.md`) remain unmodified after this ticket lands (no retrofit).
