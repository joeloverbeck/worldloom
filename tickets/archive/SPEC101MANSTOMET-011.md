# SPEC101MANSTOMET-011: README documentation for record classes + hybrid delete policy

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — updates `tools/manual-story-studio/README.md` documentation (no production code).
**Deps**: SPEC101MANSTOMET-002, SPEC101MANSTOMET-005, SPEC101MANSTOMET-006, SPEC101MANSTOMET-007

## Problem

After SPEC-101's backend tickets (001-007) land, the Manual Studio package supports 18 record classes, a hybrid delete policy with three outcomes (hard_deleted / inactive_default / force_deleted), a shallow ref validator with a documented `source_world_character` skip rule, and an ID allocator with documented gap-preservation discipline. `tools/manual-story-studio/README.md` (last touched by SPEC-100 for the package boundary scaffold) does not yet document any of these surfaces. Without a README update, future implementers of SPEC-102/103/104 and any auditor of the Manual Studio package would have to derive the surface from source code; the README is the canonical entry-point doc for the package and must reflect SPEC-101's landed state.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/README.md` exists at HEAD (verified via `ls tools/manual-story-studio/`); SPEC-100 authored it with the package-boundary scaffold (banner intent, write sandbox posture, world-index exclusion). This ticket modifies it ADDITIVELY — existing SPEC-100 content stays; new sections describe SPEC-101's added surfaces.
2. SPEC-101 §4 Files to touch line 161 names this modification: *"`tools/manual-story-studio/README.md` — document the record class list and the hybrid delete policy."* The 18 record class list lives canonically at `docs/ID-ALLOCATION.md §Manual-story-scoped` (added during in-session reassess-spec edit 2026-05-30); the README references that section rather than duplicating the full list. The hybrid delete policy is described in SPEC-101 §2.5 and implemented in SPEC101MANSTOMET-006.
3. Cross-artifact boundary under audit: README is a docs surface that coordinates multiple SPEC-101 implementation tickets (002, 005, 006, 007). The cross-cutting docs ticket shape (per spec-to-tickets §Cross-Cutting Docs Ticket Shape) is the right shape here: README documents post-implementation state of the four upstream tickets; verification is grep-proofs against the post-implementation README content rather than test commands.

## Architecture Check

1. README documents the SHAPE of the surfaces (the 18-class list at `docs/ID-ALLOCATION.md`; the three hybrid-delete outcomes; the ref-validator scope including the `source_world_character` skip) without duplicating the canonical sources (SPEC-101, the SPEC101MANSTOMET tickets themselves, `docs/ID-ALLOCATION.md`). Cross-references are by file path so future readers chase the canonical source.
2. No backwards-compatibility shims. README is a markdown doc; SPEC-100's content is preserved.

## Verification Layers

1. README references the 18-class list canonical source → grep-proof: `grep -n "docs/ID-ALLOCATION.md" tools/manual-story-studio/README.md` returns ≥ 1 match.
2. README documents the three hybrid-delete outcomes → grep-proof for `hard_deleted`, `inactive_default`, `force_deleted`.
3. README documents the ref-validator's `source_world_character` skip → grep-proof.
4. README documents the ID allocator's gap-preservation discipline → grep-proof.

## What to Change

### 1. Modify `tools/manual-story-studio/README.md`

Add new sections (placement: after the existing SPEC-100 boundary scaffold sections; preserve the SPEC-100 content unchanged). Suggested additions:

- **## Record Classes** — One-paragraph intro naming the 18 MVP classes (cast, entities, statuses, locations, objects, facts, beliefs, intentions, plans, emotions, relationships, threads, obligations, consequences, clocks, secrets, questions, artifacts) with the explicit deferred `beat-templates` (SPEC-104). Reference: *"Canonical prefix list and per-class file layout: `docs/ID-ALLOCATION.md §Manual-story-scoped`."* One-paragraph intro to common fields (id, title, active, importance, tags, summary, details, refs, prompt_visibility, last_reviewed_after_segment, notes, retired_reason) with reference to SPEC-101 §2.2 for per-class additions.

- **## Hybrid Delete Policy** — Description per SPEC-101 §2.5:
  - *Unreferenced record*: hard delete via `DELETE` endpoint; allocator preserves the gap (next allocation does NOT reuse the freed ID).
  - *Referenced record (default)*: PUT to `active: false` with `retired_reason: "force-delete-blocked-by-referrers: <id-list>"`; record stays on disk; refs to it remain valid (the ref validator accepts refs to archived records per SPEC-101 §2.4).
  - *Force-delete*: `?force=true` query OR confirmation body flag; hard-deletes the file regardless of referrers; response body returns an audit entry with timestamp + deleted ID + referrer list (persistent audit log is M6 deferral per SPEC-101 §7 AC #5).

- **## Reference Validation Scope** — One paragraph describing the shallow one-hop ref check per SPEC-101 §3 Key decisions. Explicitly note the `source_world_character: CHAR-*` skip: *"The `source_world_character: CHAR-*` field on Manual Character Profile records is informational provenance only — the ref validator does not inspect it. World-canon resolution is M6 deferral."*

- **## ID Allocation** — One paragraph: per-class append-only natural integer suffix; `max(existing) + 1`; gaps from hard-delete preserved (the allocator does NOT reuse deleted IDs). Reference: *"Full convention: `docs/ID-ALLOCATION.md §Manual-story-scoped`."*

### 2. Preserve SPEC-100 content

Do not edit or remove any existing SPEC-100 README content (banner, write sandbox posture, world-index exclusion, etc.). The modification is ADDITIVE.

## Files to Touch

- `tools/manual-story-studio/README.md` (modify)

## Out of Scope

- Frontend documentation (Dashboard / Records / Cast & Profiles screens) — SPEC101MANSTOMET-009 / 010 (the pages themselves are the discoverable surface; README mention is sufficient).
- Prompt composer / segment / manuscript documentation — SPEC-102 / 103 (deferred).
- Beat-template documentation — SPEC-104.
- Updating `docs/ID-ALLOCATION.md` — already landed during in-session reassess-spec edit (2026-05-30); this ticket only cross-references it.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "docs/ID-ALLOCATION.md" tools/manual-story-studio/README.md` returns ≥ 1 match (cross-reference to the canonical ID list).
2. `grep -n "hard_deleted\|inactive_default\|force_deleted" tools/manual-story-studio/README.md` returns 3 matches (all three hybrid-delete outcomes documented).
3. `grep -n "source_world_character" tools/manual-story-studio/README.md` returns ≥ 1 match (the ref-validator skip is documented).
4. `grep -n "gap" tools/manual-story-studio/README.md` returns ≥ 1 match (gap-preservation discipline documented).
5. The existing SPEC-100 content (banner intent, write sandbox posture, world-index exclusion) is preserved — manual review confirming no SPEC-100 paragraph was removed or substantively rewritten.

### Invariants

1. README does NOT duplicate the canonical 18-class list — it references `docs/ID-ALLOCATION.md §Manual-story-scoped`. Duplicating the list would create a drift risk (two sources of truth for prefix-to-class mapping).
2. README documents the SHAPES of the new surfaces (hybrid delete outcomes, ref validator scope, ID allocator behavior), not the implementations. Source-code-derived details belong in source-code comments, not in README.
3. Modification is purely additive; SPEC-100 content unchanged.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "(docs/ID-ALLOCATION|hard_deleted|inactive_default|force_deleted|source_world_character|gap)" tools/manual-story-studio/README.md` — single-command verification of all 4 grep-proofs in Acceptance Criteria.
2. `git diff tools/manual-story-studio/README.md` — manual review confirming the diff is purely additive (no SPEC-100 content lost).
