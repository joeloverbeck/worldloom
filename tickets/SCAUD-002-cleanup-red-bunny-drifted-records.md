# SCAUD-002: Cleanup red-bunny drifted CHC and OBL records via patch engine

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — pure data cleanup via patch engine; no skill, tool, hook, or schema changes.
**Deps**: SPEC-24, archive/tickets/SCAUD-001-apply-audit-verdicts-to-story-state-contract.md

## Problem

The red-bunny bundle at `worlds/erotica-world/stories/red-bunny/_source/` carries drifted records that violate the amended `story-state-contract.md` §4 (per SPEC-24 and SCAUD-001):

- `CHC-1.yaml` through `CHC-4.yaml` (emitted by `branching-story-bootstrap` at PG-1) carry 13+ legacy/dropped fields: `record_version: 2`, `choice_contract`, `choice_kind`, `choice_worthiness.{expected_state_delta, foreseeable_difference, strategic_question_answered, strong_axes, why_not_microbeat}`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity.{guaranteed_continuation_slts_eligible_after, terminal_risk}`, `likely_effects`, `strategy_cluster`, `emitted_at_branch`, `emitted_by_page`. They also carry the plural `target_or_action_families` form — which the SPEC-24 audit promoted to canonical, so this form is preserved.
- `CHC-5.yaml` through `CHC-8.yaml` (emitted by `branching-story-turn-cycle` at PG-2) carry the singular `target_or_action_family` (replaced by the plural form per SPEC-24) plus `emitted_at_branch` and `emitted_by_page` (dropped).
- `OBL-1.yaml` carries both `created_at_page: PG-1` and `introduced_at_page: PG-1` (duplicate fields; SPEC-24 §4.5.4 keeps only `created_at_page`).

The drift is non-blocking — Hook 3 + the current JSON validators tolerate `additionalProperties: true` for the affected classes — but it violates the schema-minimalism doctrine (contract §2 / FOUNDATIONS §Story Bundles §5b) and inflates retrieval-time tokens. This ticket supersedes the affected records with conforming replacements via the patch engine.

## Assumption Reassessment (2026-05-14)

1. The current state of `worlds/erotica-world/stories/red-bunny/_source/` matches what SPEC-24 audited (verified at audit time; this ticket re-confirms by reading each affected file before drafting supersession records). 8 CHC records (CHC-1 through CHC-8) and 1 OBL record (OBL-1) require supersession.
2. SCAUD-001 has landed before this ticket runs. The amended `story-state-contract.md` §4 is the canonical schema source for the new records. SPEC-24's per-class YAML schema blocks (§4.5.4 OBL, §4.5.12 CHC) are the literal field set.
3. Shared boundary: `worlds/erotica-world/stories/red-bunny/_source/{choices,obligations,events,pages}/*.yaml` plus `INDEX.md`. Story-bundle records under `_source/` are engine-only writes per Hook 3; the patch engine via `mcp__worldloom__submit_patch_plan` is the only lawful path. `INDEX.md` is a direct-write surface.
4. FOUNDATIONS §Story Bundles §3 (Append-Only / Supersession Discipline) is the motivating principle. Cleanup is performed by writing new record files with `supersedes:` links, not by editing the existing CHC-1..8 / OBL-1 files in place.
5. HARD-GATE: this ticket performs a state-changing operation routed through the patch engine. The skill that authors this ticket's plan (this implementer, executing the ticket) must produce a deliverable summary for explicit user approval before submitting. No auto-mode bypass.
6. Schema extension: this ticket extends NO schema; it produces records conforming to the amended §4.5.4 OBL and §4.5.12 CHC schemas. Additive-only relative to the post-SCAUD-001 contract.
7. Rename/remove blast radius: this ticket touches only red-bunny. No other bundle is affected. The dropped property names (per SPEC-24 audit) appear in the historical CHC-1..8 and OBL-1 files but those remain on disk per §3; the active records (CHC-9..16, OBL-2) carry only conforming fields.
8. Adjacent contradiction: SPEC-24 promoted the plural `target_or_action_families` as canonical (replacing the singular `target_or_action_family`). CHC-1..4 already carry the plural form; CHC-5..8 carry the singular. The supersessions for CHC-1..4 preserve the plural list; the supersessions for CHC-5..8 convert the singular value to a single-element plural list. This is captured in the per-record supersession plan below.
9. Mismatch + correction: none; the audit's verdicts on red-bunny records are unambiguous.

## Architecture Check

1. The clean approach is one `audit_repair` SE record + supersession records for each affected CHC + supersession for OBL-1 + a new `audit_repair`-marked PG snapshot reflecting the rewritten `active_records`. All in a single patch envelope per shared write order (§10).
2. No backwards-compatibility shims. The superseded records' fields are translated to the amended schema; dropped fields are removed from the new records. The original files remain on disk unchanged per §3 append-only discipline.

## Verification Layers

1. **Supersession lineage** → patch engine validates each supersession op against the prior record's existence; `supersedes:` field in each new record names the prior id.
2. **Schema conformance** → after SCAUD-003 lands, the new records pass `record_schema_compliance`. Pre-SCAUD-003 (which is the case at this ticket's execution time), validation is permissive (additionalProperties:true); manual inspection ensures field-set conformance.
3. **Health-audit replay** → `branching-story-health-audit` on red-bunny in structural mode returns clean.
4. **Active-record sweep** → `grep -lE '(record_version|choice_contract|introduced_at_page|target_or_action_family:|emitted_by_page|emitted_at_branch)' worlds/erotica-world/stories/red-bunny/_source/**/*.yaml` returns only the (now-historical) superseded files; the active records (those without a `supersedes:` link pointing to them) carry none of these property names.

## What to Change

### 1. Allocate ids via the worldloom MCP

Pre-flight allocation via `mcp__worldloom__allocate_next_id(world_slug='erotica-world', id_class=<class>, story_slug='red-bunny')`:

- `SE-3` (audit_repair event)
- `CHC-9` through `CHC-16` (one supersession per CHC-1..8)
- `OBL-2` (supersession of OBL-1)
- `PG-3` (audit_repair page snapshot)

Allocation order does not matter; the allocator scans the directory at each call.

### 2. Draft the audit_repair SE-3 record

```yaml
id: SE-3
story_id: STORY-1
created_at_page: PG-3
parent_page_id: PG-2
event_kind: audit_repair
actor: system
outcome_route: accept
targets: []
world_logic_rationale: >
  Per SPEC-24 (story-state-contract property audit) and SCAUD-001 (contract amendment applied),
  the CHC records emitted at PG-1 (CHC-1 through CHC-4) carried legacy fields outside the amended
  §4.5.12 schema (record_version, choice_contract, choice_worthiness, commitment_class/detail/family,
  continuation_capacity, likely_effects, strategy_cluster, emitted_at_branch, emitted_by_page).
  The CHC records emitted at PG-2 (CHC-5 through CHC-8) carried the singular target_or_action_family
  form which the audit replaced with the plural target_or_action_families list. OBL-1 carried both
  created_at_page and introduced_at_page as a duplicate-field pattern; the amended §4.5.4 schema
  keeps only created_at_page. This audit_repair event supersedes all 9 affected records with
  conforming replacements. No story-state change beyond the schema cleanup; the new PG-3 snapshot
  reflects the rewritten active_records set with PG-2 as parent.
state_delta:
  create:
    - SE-3
    - CHC-9
    - CHC-10
    - CHC-11
    - CHC-12
    - CHC-13
    - CHC-14
    - CHC-15
    - CHC-16
    - OBL-2
    - PG-3
  supersede:
    - CHC-1
    - CHC-2
    - CHC-3
    - CHC-4
    - CHC-5
    - CHC-6
    - CHC-7
    - CHC-8
    - OBL-1
  close: []
promotion_claims: []
```

### 3. Draft supersession CHC records (CHC-9 through CHC-12, replacing CHC-1..4)

For each of CHC-1..4, draft a new record `CHC-<9..12>.yaml` carrying:

- `id: CHC-<9..12>`
- `story_id: STORY-1`
- `created_at_page: PG-1` (same provenance as the original; the audit_repair preserves the page-of-emission lineage)
- `supersedes: CHC-<1..4>`
- `surface_label`, `player_visible_intent`, `target_or_action_families` (preserved from the original — already plural), `likely_state_pressure` (translated from `choice_contract.expected_state_pressure` — the existing field of equivalent semantic), `associated_commitment_block` (preserved), `success_policy` (null unless the original had a non-null value)

Dropped fields are not written: `record_version`, `choice_contract`, `choice_kind`, `choice_worthiness.*`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity.*`, `likely_effects`, `strategy_cluster`, `emitted_at_branch`, `emitted_by_page`.

### 4. Draft supersession CHC records (CHC-13 through CHC-16, replacing CHC-5..8)

For each of CHC-5..8, draft a new record `CHC-<13..16>.yaml` carrying:

- `id: CHC-<13..16>`
- `story_id: STORY-1`
- `created_at_page: PG-2`
- `supersedes: CHC-<5..8>`
- `surface_label`, `player_visible_intent`, `target_or_action_families: [<original singular value>]` (the singular `target_or_action_family` becomes a single-element list), `likely_state_pressure` (preserved), `associated_commitment_block` (preserved), `success_policy` (null unless non-null on original)

Dropped fields: `emitted_at_branch`, `emitted_by_page`, `target_or_action_family` (singular).

### 5. Draft supersession OBL-2 (replacing OBL-1)

```yaml
id: OBL-2
story_id: STORY-1
created_at_page: PG-1
supersedes: OBL-1
status: open                                  # preserved from OBL-1
obligation_kind: informal_dependency          # preserved
description: >
  Ane has nowhere to live except Marisa's apartment; the residence-of-default obligation pulls
  her back to the apartment as the only roof she has, even after this morning's attack.
owed_by: STENT-2                              # preserved
owed_to: STENT-3                              # preserved
trigger_to_close: Ane secures alternative shelter for the night or returns to the apartment.   # preserved
```

Dropped fields: `introduced_at_page` (duplicate of `created_at_page`).

### 6. Draft PG-3 (audit_repair page snapshot)

Per shared contract §4.2 (amended per SCAUD-001), build a new PG record carrying:

- `id: PG-3`
- `branch_id: BR-1`
- `parent_page_id: PG-2`
- `branch_path: [PG-1, PG-2, PG-3]`
- `turn_index: 2`
- `input.choice_id: null` (audit_repair has no player choice)
- `input.manual_action_text: null`
- `input.resolved_event_id: SE-3`
- `state_hash_parent`: PG-2's `state_hash` value copied exactly
- `state_hash`: computed via `tools/world-mcp/dist/src/cli/compute-pg-hashes.js` against the finalized PG-3 + page-plan bytes per §4.2a (new payload definition post-SCAUD-001)
- `plan.plan_hash`: computed via the canonical CLI
- `prose_plan_path: pages-prose-plans/PG-3.md` (the audit_repair page plan)
- `prose_path: null`, `prose_receipt_path: null`
- `state_snapshot.active_records`: copied from PG-2 but with the CHC list updated to `[CHC-9, CHC-10, CHC-11, CHC-12, CHC-13, CHC-14, CHC-15, CHC-16]` (the superseded CHC-1..8 are removed from active records; the new CHCs are listed), and `OBL: [OBL-2]` replacing `[OBL-1]`.
- `state_snapshot.entity_status`: copied from PG-2 unchanged
- `state_snapshot.visible_affordances`: copied from PG-2 unchanged
- `state_snapshot.unresolved_mystery_claims`: copied from PG-2 unchanged
- `state_snapshot.continuation`: `{has_eligible_commitment_block: true, terminal_status: open, terminal_rationale: null}`
- `emitted_choices: []` (audit_repair does not emit new player-facing choices; the next turn-cycle's parent is PG-3 and operates on the rewritten CHC set as if it were emitted by PG-2)

NOTE on `emitted_choices` empty list: the canonical PG schema requires `emitted_choices: [CHC-<integer>]*` (non-empty when the page has emissions). For an audit_repair page that does not emit new choices, an empty list is semantically correct. SCAUD-003's JSON schema must allow an empty list for `emitted_choices` when the page's `input.choice_id` is null (audit_repair / system_repair shape). Flag this to SCAUD-003 implementer; this ticket assumes `emitted_choices: []` is acceptable.

### 7. Draft the page plan for PG-3

`worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` is a direct-write artifact authored per shared contract §8. For an audit_repair page, the 19 sections are populated as:

- §1 STORY_KERNEL excerpt: same as PG-2.
- §2 / §3 / §19: verbatim from `reports/prose-quality-instructions.md` per the operational-load-bearing rule (even though the page will likely not be rendered as prose, the §2/§3/§19 verbatim discipline is per-skill — and an audit_repair page that ever IS rendered should not lack these sections).
- §4 World-canon excerpt: same as PG-2.
- §5 Active cast: same as PG-2.
- §6 Current location and affordances: same as PG-2.
- §7 Selected event and state delta: SE-3 audit_repair, dramatized as a meta-event (no in-world action; the state delta is the schema cleanup).
- §8 Required beats: none (audit_repair has no beats).
- §9 Relationship and belief context: same as PG-2.
- §10 Open obligations / consequences / threads: OBL-2 (replacing OBL-1), all others same as PG-2.
- §11 Forbidden mystery resolutions: same as PG-2.
- §12 Stopping point: "audit-repair non-rendering — no prose to write."
- §13 Next choices: the rewritten CHC-9..16 set is what the next turn-cycle parent (PG-3) presents.
- §14 Recent prose continuity: omitted (audit_repair).
- §15 Frontmatter: engine fields, hashes, PG-3 id, audit_repair marker.
- §16-§18: omitted (audit_repair).

The plan is short. Most sections are unchanged from PG-2's plan; §7, §10, §12, §13 differ. Reuse PG-2's plan as a base and edit those sections.

### 8. Update bundle INDEX.md

Append rows under the appropriate tables for SE-3, CHC-9..16, OBL-2, PG-3. Add a new audit-trail entry noting the SPEC-24 / SCAUD-001 / SCAUD-002 cleanup. Validation Trace section gets a new sub-section `## Validation Trace on PG-3` listing all 8 hard-gate passes (gates 1-8 pass trivially for audit_repair: no player input, parent_snapshot_compatibility holds, no mystery resolution, no sibling-branch, append-only deltas, continuation capacity holds, plan grounding holds for the rewritten CHC set, canon_promotion_hold NOT_APPLICABLE).

### 9. Submit the patch envelope

All record drafts (SE-3, CHC-9..16, OBL-2, PG-3) are bundled into one patch envelope. Validate via `mcp__worldloom__validate_patch_plan`. On success, persist the plan JSON to `/tmp/<plan-id>.json`, sign via `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>`, then submit via `mcp__worldloom__submit_patch_plan(plan, approval_token)` OR via the CLI submit path `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` if envelope size exceeds 50KB.

Per HARD-GATE discipline, the deliverable summary must be presented to the user for explicit approval before submission. Summary includes: superseded record ids, new record ids, the rewritten CHC field-set (with the dropped field names explicitly listed), new PG-3 state_hash, page plan path.

### 10. Write direct-markdown artifacts

Post-patch-success: write `pages-prose-plans/PG-3.md` (using exact bytes hashed into plan_hash), update `INDEX.md`. Per shared contract §10 write order.

## Files to Touch

(Patch engine creates these; not raw Edits.)

- `worlds/erotica-world/stories/red-bunny/_source/events/SE-3.yaml` (new, via patch engine)
- `worlds/erotica-world/stories/red-bunny/_source/choices/CHC-9.yaml` through `CHC-16.yaml` (new, via patch engine)
- `worlds/erotica-world/stories/red-bunny/_source/obligations/OBL-2.yaml` (new, via patch engine)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` (new, via patch engine)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-3.md` (new, direct write after patch success)
- `worlds/erotica-world/stories/red-bunny/INDEX.md` (modify, direct write after patch success)

Original CHC-1..8 and OBL-1 files remain on disk unchanged per §3 append-only.

## Out of Scope

- Cleanup of other red-bunny classes (SF, BEL, SE-1, SE-2, STENT, STINT, STLOC, STOBJ, SREL, CNSQ, THR, BR) where field sets are within-skill consistent and drift from the amended schema is non-blocking. New records authored in those classes after SCAUD-001 conform.
- Re-computing state_hash on PG-1 or PG-2 to align with the post-SCAUD-001 payload definition. Per SPEC-24 §Risks "PG state_hash continuity", existing PG records retain their original hashes (treated as opaque strings).
- Any non-red-bunny bundle.
- Authoring rendered prose for PG-3. Audit_repair pages are typically not rendered.
- Updating any world-level canon record.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__validate_patch_plan` on the assembled envelope returns success.
2. `mcp__worldloom__submit_patch_plan` succeeds with a valid approval token.
3. Post-submission: `worlds/erotica-world/stories/red-bunny/_source/choices/CHC-9.yaml` through `CHC-16.yaml` exist; `worlds/erotica-world/stories/red-bunny/_source/obligations/OBL-2.yaml` exists; `worlds/erotica-world/stories/red-bunny/_source/events/SE-3.yaml` exists; `worlds/erotica-world/stories/red-bunny/_source/pages/PG-3.yaml` exists; `pages-prose-plans/PG-3.md` exists.
4. Each new CHC record carries `supersedes: CHC-<n>` linking to the original.
5. OBL-2 carries `supersedes: OBL-1`.
6. `grep -lE '(record_version|choice_contract|introduced_at_page|emitted_by_page|emitted_at_branch)' worlds/erotica-world/stories/red-bunny/_source/{choices,obligations}/*.yaml` returns only the historical files (CHC-1..8, OBL-1), not the new ones (CHC-9..16, OBL-2).
7. `grep -E 'target_or_action_family:' worlds/erotica-world/stories/red-bunny/_source/choices/CHC-{9,10,11,12,13,14,15,16}.yaml` returns zero hits (singular form not present on new records).
8. `grep -E 'target_or_action_families:' worlds/erotica-world/stories/red-bunny/_source/choices/CHC-{9,10,11,12,13,14,15,16}.yaml` returns hits on all 8 new records.

### Invariants

1. The historical CHC-1..8 and OBL-1 files remain on disk unchanged (Hook 3 + §3 append-only).
2. Hook 3 blocks any raw `Edit` / `Write` attempt on `_source/<class>/*.yaml`; all record creates route through the patch engine.
3. The audit_repair event preserves the supersession lineage required by Rule 6 (No Silent Retcons applied to story state): every replaced record has an explicit `supersedes:` link and is referenced in SE-3's `state_delta.supersede:` list.

## Test Plan

### New/Modified Tests

1. `None — data-cleanup ticket; verification is patch-engine-driven and command-based.` Existing pipeline tests (`record_schema_compliance`, `recursive-reference-closure`, branching-story-health-audit structural mode) cover the conformance check.

### Commands

1. `mcp__worldloom__validate_patch_plan(<envelope>)` — dry-run validation of the assembled patch plan.
2. `mcp__worldloom__submit_patch_plan(<envelope>, <approval_token>)` — submission after HARD-GATE user approval.
3. `grep -lE '(record_version|choice_contract|introduced_at_page|emitted_by_page|emitted_at_branch)' worlds/erotica-world/stories/red-bunny/_source/{choices,obligations}/*.yaml` — post-submission sweep; must return only the historical files.
4. (Optional, recommended) `Skill mcp:branching-story-health-audit world_slug=erotica-world story_slug=red-bunny mode=structural` — replay-and-snapshot audit; must return clean.
