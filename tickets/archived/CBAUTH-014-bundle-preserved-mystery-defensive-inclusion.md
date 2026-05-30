# CBAUTH-014: Extend the `forbidden_resolutions[]` defensive-inclusion heuristic and pre-flight firewall load to cover bundle-policy-preserved (mysteries_in_play status=preserved) M whose world status is passive/active rather than forbidden

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` + `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` (no validator, tool, hook, schema, or new patch-op surface)
**Deps**: CBAUTH-001 (firewall load), CBAUTH-004 (defensive-inclusion heuristic)

## Problem

CBAUTH-004 landed the `forbidden_resolutions[]` per-block defensive-inclusion heuristic on the Phase 2 authoring side, instructing the operator to "include `M-<integer>` for any **forbidden-status M** whose territory the block's `move_family` thematically touches". CBAUTH-001 landed the per-block firewall whole-class load on the pre-flight side, instructing the operator to load "the **forbidden Mystery Reserve bodies**" via `list_records(record_type='mystery_record', ...)` or a targeted `get_records` over the bundle's `forbidden`-status `mysteries_in_play` ids.

Both surfaces reference **"forbidden-status M"** as the inclusion target. But the worked examples and the actual on-bundle convention require defensive inclusion of a broader set: **bundle-policy-preserved M whose world status is `passive` or `active`** (not just world-`forbidden`). Specifically:

- A world `M` record carries `status: forbidden | active | passive` per FOUNDATIONS §Canon Layers §5 + the `rule7_mystery_reserve_preservation` validator's `future_resolution_safety` coupling. Only `forbidden`-status M binds the engine's hard firewall.
- A bundle's `STORY_KERNEL.md` `mysteries_in_play` list separately tracks `status: preserved | resolved | narrowed | held_for_promotion` per `m_id`, AND a separate `future_resolution_safety: forbidden | low | medium | high` field. A bundle MAY set `mysteries_in_play[m_id].future_resolution_safety: forbidden` even when the world `M-<id>.status: passive` (this is the bundle binding itself to preserve a world-passive M for this story's scope).
- The CBAUTH-004 worked example explicitly includes `[M-5, M-6]` in SLT-7's `forbidden_resolutions[]`. M-5 and M-6 are **world-passive** (`_source/mystery-reserve/M-5.yaml` has `status: passive`, `future_resolution_safety: medium`; M-6 likewise) but **bundle-preserved** in red-bunny's STORY_KERNEL `mysteries_in_play`. The worked example contradicts the heuristic prose by including world-passive M in `forbidden_resolutions[]`.

Observed on the 2026-05-30 red-bunny SLB-5 run: SLT-33 (disclosure of an information_source's guarded knowledge touching CF-0005/CF-0006 territory) needed `forbidden_resolutions: [M-5, M-6]` defensively per the SLB-4 SLT-7 / SLT-26 convention, even though M-5/M-6 are world-passive. My own pre-flight `list_records(record_type='mystery_record', filters={"status": "forbidden"})` call narrowed to world-`forbidden`-only and returned only M-3 + M-4 (M-4 is not in red-bunny's `mysteries_in_play` either) — M-5 and M-6 bodies were not loaded from `_source/mystery-reserve/`. I knew enough from `STORY_KERNEL.md mysteries_in_play` summary + `INDEX.md` Mystery Reserve section to defensively include them, but the FULL bodies (with `domains_touched`, `disallowed_cheap_answers`, `knowns`/`unknowns`) needed for the heuristic's "territory the block's `move_family` thematically touches" judgment were not in context.

The end-to-end gap covers two surfaces:
- **Pre-flight (CBAUTH-001 follow-up)**: the firewall load step should load `_source/mystery-reserve/M-<id>.yaml` bodies for every M in the bundle's `mysteries_in_play` (both world-`forbidden` AND world-non-forbidden-but-bundle-preserved), not only world-`forbidden` M.
- **Phase 2 (CBAUTH-004 follow-up)**: the heuristic prose should say "forbidden-status M (world-status) OR bundle-policy-preserved M (mysteries_in_play status=preserved or future_resolution_safety=forbidden at bundle scope)", and the worked-example list should explicitly call out M-5 and M-6 as the bundle-preserved case (currently the SLB-4 conversion is implicit — the operator reads `[M-5, M-6]` next to "captivity-network-structure boundedness" without the heuristic's prose explicitly licensing the inclusion of world-passive M).

## Assumption Reassessment (2026-05-30)

1. `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` §"`forbidden_resolutions[]` defensive-inclusion heuristic" reads "include `M-<integer>` for any forbidden-status M ..." — verified by direct Read this session. The worked-example list at the bottom of the same paragraph reads "SLT-7 (disclosure of concealed truth grounded in CF-0005/CF-0006) → `forbidden_resolutions: [M-5, M-6]` (M-5 covers captivity-network-structure boundedness; M-6 covers cross-population CF-0007 demographic claim boundedness)" — also verified. M-5 and M-6 are world-passive (`worlds/erotica-world/_source/mystery-reserve/M-5.yaml` carries `status: passive, future_resolution_safety: medium`; M-6 likewise — verified by direct grep this session). The heuristic prose and the worked example are inconsistent.
2. `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` §Pre-flight Check step 6 firewall-load sub-step reads "whole-class load every world Invariant via `mcp__worldloom__list_records(record_type='invariant_record', world_slug=<world_slug>, include_full_body=true)` and the **forbidden** Mystery Reserve bodies via `mcp__worldloom__list_records(record_type='mystery_record', world_slug=<world_slug>, include_full_body=true)` (or a targeted `mcp__worldloom__get_records` over the bundle's `forbidden`-status `mysteries_in_play` ids)" — verified. The primary `list_records` form is ambiguous between "all M bodies" and "filter to forbidden"; the parenthetical narrows to `forbidden`-status `mysteries_in_play` ids. Neither path systematically loads world-passive-but-bundle-preserved M.
3. Shared boundary under audit: the `mystery_record` body schema (`worlds/<slug>/_source/mystery-reserve/M-<id>.yaml`) fields `domains_touched`, `knowns`, `disallowed_cheap_answers`, and `future_resolution_safety`, and the `STORY_KERNEL.md mysteries_in_play[m_id]` schema fields `status`, `future_resolution_safety`. The Phase 2 heuristic consumes `M.domains_touched` against the block's `move_family` thematic territory. The pre-flight load step must deliver those bodies for the heuristic to make a non-trivial inclusion judgment.
4. FOUNDATIONS principle under audit: §Rule 7 (Preserve Mystery Deliberately) + §Canon Layers §5 Mystery Reserve. Rule 7 binds the engine to "no resolution of forbidden-status M" at the firewall gate; the Phase 2 defensive-inclusion heuristic is the authoring-side hardening that surfaces thematic-touch matches the gate cannot detect from effects alone. Bundle-policy-preserved M (mysteries_in_play status=preserved) is the bundle's own commitment to preserving an M it has scoped into its narrative — defensively listing it in per-block `forbidden_resolutions[]` is the authoring-side analogue of the world-`forbidden`-status case.
5. Mystery Reserve firewall enforcement-surface note: this ticket does NOT relax the Phase 3 gate 4 check (which still validates `forbidden_resolutions[]` against actual effects). It strengthens the authoring side by ensuring the operator's defensive-inclusion list is exhaustive for the bundle's full M preservation policy, not only the world's forbidden subset. No firewall weakening.
6. Adjacent contradiction classification: the SLB-1..SLB-4 worked-example conventions already include world-passive bundle-preserved M (e.g., red-bunny SLT-7's `[M-5, M-6]`); the current heuristic prose's "forbidden-status M" framing is a documentation gap that the worked examples implicitly already correct. Required-consequence cleanup of CBAUTH-001 + CBAUTH-004 documentation symmetry, not a separate bug uncovered in unrelated scope.

## Architecture Check

1. Cleaner than alternatives: extending the existing pre-flight firewall load sub-step (CBAUTH-001) and the existing Phase 2 heuristic paragraph (CBAUTH-004) to reference the bundle's `mysteries_in_play` policy in addition to world `M.status` is the minimum-blast-radius fix and reuses inputs already loaded (the bundle's STORY_KERNEL `mysteries_in_play` list is in context from pre-flight step 6 already; the world M bodies for `mysteries_in_play[*].m_id` come from the same `_source/mystery-reserve/` directory the firewall load already targets). The alternative — adding a new pre-flight sub-step that separately loads "bundle-preserved M" bodies — fragments the firewall-load discipline and risks the operator running one load but skipping the other.
2. No backwards-compatibility aliasing/shims introduced: the heuristic-prose extension is additive (the worked examples already work under the extended reading); the pre-flight load extension is additive (loading more M bodies cannot break a downstream consumer; the firewall gate ignores M bodies it does not act on). Existing pool blocks' `forbidden_resolutions[]` values remain valid without retrofit.

## Verification Layers

1. Invariant: pre-flight firewall load delivers full bodies for every M named in the bundle's `STORY_KERNEL.md mysteries_in_play` regardless of the world `M.status` value → codebase grep-proof (`pre-flight-and-prerequisites.md` step 6 firewall-load sub-step contains a sentence like "load full bodies for every M whose id appears in `STORY_KERNEL.md mysteries_in_play` — both world-`forbidden`-status and world-`passive`/`active`-but-bundle-preserved — via `mcp__worldloom__get_records(record_ids=<mysteries_in_play[*].m_id>)` or `list_records(record_type='mystery_record', world_slug=<world_slug>, include_full_body=true)` without a status filter").
2. Invariant: Phase 2 heuristic explicitly licenses bundle-preserved M inclusion → codebase grep-proof (`phase-2-draft-blocks.md` §"`forbidden_resolutions[]` defensive-inclusion heuristic" paragraph contains the extended target language naming "world-`forbidden`-status M OR bundle-policy-preserved M (mysteries_in_play `status: preserved` or `future_resolution_safety: forbidden` at bundle scope)").
3. Invariant: the SLB-1..SLB-4 worked-example convention is the documented case for the extended reading → manual review (re-read the worked-example list in `phase-2-draft-blocks.md` and confirm the SLT-7 / SLT-26 `[M-5, M-6]` cases are explicitly annotated as bundle-policy-preserved M, not silently included).
4. Invariant: Rule 7 firewall is unchanged at Phase 3 gate 4 → FOUNDATIONS alignment check (Phase 3 gate 4 prose at `phase-3-4-validation.md` continues to reference the existing `mystery_policy.forbidden_resolutions[]` check; no semantic change).

## What to Change

### 1. Pre-flight firewall-load step extension

In `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` §Pre-flight Check step 6 firewall-load sub-step (the unconditional whole-class load paragraph), replace the line "the forbidden Mystery Reserve bodies via `mcp__worldloom__list_records(record_type='mystery_record', world_slug=<world_slug>, include_full_body=true)` (or a targeted `mcp__worldloom__get_records` over the bundle's `forbidden`-status `mysteries_in_play` ids)" with:

> the full Mystery Reserve bodies for every M relevant to the bundle's firewall posture — both **world-`forbidden`-status** M (the engine-bound Rule 7 firewall target) AND **bundle-policy-preserved** M whose world `M.status` is `passive` or `active` but whose `STORY_KERNEL.md mysteries_in_play[m_id].status == preserved` or `mysteries_in_play[m_id].future_resolution_safety == forbidden` (the bundle's own narrative-scope preservation commitment that the Phase 2 defensive-inclusion heuristic consumes). Load via `mcp__worldloom__get_records(record_ids=<every mysteries_in_play[*].m_id from STORY_KERNEL.md>)` for a targeted load, OR `mcp__worldloom__list_records(record_type='mystery_record', world_slug=<world_slug>, include_full_body=true)` without a status filter for the whole-class load when the bundle's `mysteries_in_play` covers most of the world's M.

### 2. Phase 2 defensive-inclusion heuristic extension

In `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` §"`forbidden_resolutions[]` defensive-inclusion heuristic" paragraph, replace the opening sentence "include `M-<integer>` for any forbidden-status M whose territory the block's `move_family` thematically touches" with:

> include `M-<integer>` for any M whose territory the block's `move_family` thematically touches AND that the bundle is policy-committed to preserve — i.e., the M is **world-`forbidden`-status** (the engine-bound Rule 7 firewall target) OR **bundle-policy-preserved** in the bundle's `STORY_KERNEL.md mysteries_in_play[m_id]` (either `status: preserved` or `future_resolution_safety: forbidden` at the bundle scope, which binds the bundle to preserve a world-passive/active M for this story's narrative scope). The heuristic uses the M's `domains_touched` (loaded whole-class at pre-flight step 6 per CBAUTH-014 — including both world-`forbidden`-status and bundle-policy-preserved M bodies) against the block's beats and exit-options.

### 3. Worked-example annotations

Below the heuristic, update the worked-example list to explicitly annotate the bundle-preserved cases:

- "SLT-7 disclosure of concealed truth grounded in CF-0005/CF-0006 → `forbidden_resolutions: [M-5, M-6]` (M-5 and M-6 are **world-passive** with `future_resolution_safety: medium`, but red-bunny's `mysteries_in_play` binds them as `status: preserved` for this bundle's narrative scope; defensive inclusion preserves the bundle's narrative-scope commitment alongside any thematic-territory match)"
- (Keep the M-3 saturation-substrate examples — those are world-`forbidden`-status; no annotation change needed.)
- (Keep the `forbidden_resolutions: []` worked example for moves with no thematic-territory match — explicitly note that the empty default applies when neither world-`forbidden` nor bundle-preserved M territories are touched.)

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` (modify)

## Out of Scope

- Any change to the Phase 3 gate 4 `mystery_policy.forbidden_resolutions[]` check semantics. The gate continues to validate `forbidden_resolutions[]` against the block's effects; it does not consume bundle-policy-preservation as a hard signal (defensive inclusion is authoring-side hardening, not a hard gate).
- Any change to the `M` world-canon record schema or the `mysteries_in_play` STORY_KERNEL schema.
- Generalization of bundle-policy-preservation to non-mystery world records (e.g., INV). World invariants are world-bound; bundles inherit them but do not selectively preserve them.
- Automated auto-detection of "thematic-territory match" from CF cross-reference. Thematic touch is the operator's authorial judgment per CBAUTH-004 §6 out-of-scope creep guard.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "bundle-policy-preserved\|mysteries_in_play\[m_id\]" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` returns the extended firewall-load sub-step.
2. `grep -n "bundle-policy-preserved\|mysteries_in_play\[m_id\]" .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` returns the extended heuristic paragraph and the annotated worked-example list.
3. Re-running `commitment-block-authoring` against red-bunny SLB-N+1 produces a deliverable summary in which any block whose `move_family` thematically touches CF-0005 / CF-0006 territory carries `forbidden_resolutions: [M-5, M-6]` with the bundle-policy-preserved rationale cited in the per-block validation trace.
4. `grep -n "status: forbidden\|status: passive" worlds/erotica-world/_source/mystery-reserve/M-5.yaml worlds/erotica-world/_source/mystery-reserve/M-6.yaml` confirms the world-passive status of M-5/M-6 still anchors the worked-example correctness.

### Invariants

1. Rule 7 firewall enforcement at Phase 3 gate 4 is unchanged (effect-resolution check only).
2. The defensive-inclusion list grows from "world-forbidden M" to "world-forbidden M ∪ bundle-policy-preserved M"; the inclusion criterion is structurally checkable from `M.status` + `STORY_KERNEL.mysteries_in_play[*].status / future_resolution_safety`.
3. The pre-flight load delivers full M bodies for the extended set without adding a new MCP capability (the load uses existing `get_records` / `list_records` surfaces).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "bundle-policy-preserved\|mysteries_in_play\[m_id\]" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md .claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md`
2. `grep -E "^status:|^future_resolution_safety:|^id:" worlds/erotica-world/_source/mystery-reserve/M-{3,5,6}.yaml` — confirms the worked-example M classification (M-3 world-forbidden; M-5/M-6 world-passive + bundle-preserved).
3. Re-invoke `commitment-block-authoring --world_slug erotica-world --story_slug red-bunny --mode direct_batch --target_count 1 --focus 'investigation'` and confirm the deliverable summary's defensive-inclusion column cites both the heuristic clause (world-forbidden vs bundle-preserved) and the matched `domains_touched` field for any M included.
