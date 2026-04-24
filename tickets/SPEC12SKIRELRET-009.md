# SPEC12SKIRELRET-009: Docs updates (FOUNDATIONS, CONTEXT-PACKET-CONTRACT, MACHINE-FACING-LAYER, CLAUDE.md)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — documentation updates across four files (`docs/FOUNDATIONS.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `CLAUDE.md`). No code changes.
**Deps**: SPEC12SKIRELRET-008

## Problem

Per SPEC-12 D8, when the new retrieval surface lands, four documentation surfaces must update in the same pass or they will silently misrepresent the live pipeline: (i) `docs/FOUNDATIONS.md` §Tooling Recommendation currently implies that `mcp__worldloom__get_context_packet` alone guarantees downstream sufficiency — tightening is needed to acknowledge that completeness also depends on the authoring surfaces (canonical entity declarations, scoped-reference frontmatter blocks); (ii) `docs/CONTEXT-PACKET-CONTRACT.md` documents the v1 packet shape with example YAML, all now obsolete; (iii) `docs/MACHINE-FACING-LAYER.md` lists the localization surfaces without mentioning the new trust tiers; (iv) `CLAUDE.md` §Machine-facing-layer integration enumerates the current localization tools without the scoped-reference middle tier. Rule 6 (No Silent Retcons) requires these updates to ship alongside the code.

## Assumption Reassessment (2026-04-24)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. `docs/FOUNDATIONS.md:422` currently says `mcp__worldloom__get_context_packet` is "the machine-facing mechanism for delivering this set with completeness guarantees" — wording that implies current sufficiency regardless of authoring-surface state. SPEC-12 D8 flags this for tightening.
2. `docs/CONTEXT-PACKET-CONTRACT.md:9-36` contains the v1 example YAML with keys `nucleus, envelope, constraints, suggested_impact_surfaces` and `packet_version: 1`. Per SPEC-12 D8, this document is regenerated (not amended) against ticket 008's v2 shape.
3. Cross-artifact contract under audit: the docs must reflect the code actually shipped by ticket 008 in the same delivery. Out-of-sync docs between ticket 008's branch and this ticket's branch are a Rule 6 retcon risk — a future reader who lands on the v2 code but reads v1 docs would silently mis-learn the contract.

## Architecture Check

1. Regenerating `docs/CONTEXT-PACKET-CONTRACT.md` against the code in ticket 008's branch (not from memory) prevents drift — the example YAML must byte-match the TypeScript shape.
2. A single sentence addition to `CLAUDE.md` + a short section in `docs/MACHINE-FACING-LAYER.md` is minimal surface area; preserves existing doc skeletons.
3. `docs/FOUNDATIONS.md` §Tooling Recommendation wording is tightened, not restructured — the principle is unchanged; only the completeness-guarantee phrasing shifts.
4. No backwards-compatibility aliasing.

## Verification Layers

1. `docs/CONTEXT-PACKET-CONTRACT.md` shows v2 shape exclusively -> codebase grep-proof (`grep -c 'packet_version: 2' docs/CONTEXT-PACKET-CONTRACT.md` returns ≥1; `grep -c 'nucleus\|envelope' docs/CONTEXT-PACKET-CONTRACT.md` returns 0).
2. `CLAUDE.md` contains the scoped-reference middle-tier sentence -> codebase grep-proof (`grep -n 'scoped.reference' CLAUDE.md` matches in §Machine-facing-layer integration).
3. `docs/MACHINE-FACING-LAYER.md` localization table or section includes scoped-reference tier -> codebase grep-proof.
4. `docs/FOUNDATIONS.md:422` wording reflects the revised completeness-guarantee framing -> manual review (single-sentence diff).

## What to Change

### 1. Tighten `docs/FOUNDATIONS.md` §Tooling Recommendation wording

In `docs/FOUNDATIONS.md:422`, tighten the sentence about `mcp__worldloom__get_context_packet` to acknowledge that completeness guarantees depend on BOTH the retrieval surface AND the authoring surfaces (canonical entity declarations in `ONTOLOGY.md`'s Named Entity Registry; scoped-reference frontmatter blocks on authority-bearing records). Minimal edit — one sentence reworded or a qualifying clause appended. Preserve the "non-negotiable" framing.

### 2. Regenerate `docs/CONTEXT-PACKET-CONTRACT.md`

Rewrite the entire file against ticket 008's v2 shape:

- **Packet Shape** section: v2 YAML example with the five completeness classes + `task_header` with `packet_version: 2`.
- **Layer Semantics** section: rewrite one subsection per class — `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, `impact_surfaces` — each describing what belongs, what does not, and how budget pressure trims.
- **Assembly Discipline** section: rewrite to reflect locality-first ordering + the `packet_incomplete_required_classes` error (replacing the old `budget_exhausted_nucleus`).
- **Example Shapes** section: rewrite `canon_addition`, `character_generation`, `continuity_audit` example packet compositions for v2 classes.
- **Non-Goals** section: preserve existing three items (packet is not a hidden full-world snapshot; does not replace user approval or HARD-GATE discipline; does not decide truth).

### 3. Update `docs/MACHINE-FACING-LAYER.md`

In the localization-surfaces table (lines 47-56), add a row for scoped-reference retrieval covering `find_named_entities.scoped_matches`, `get_node.scoped_references`, `search_nodes` with `reference_name` or `include_scoped_references`.

Add a short "Trust tiers" section (3-5 lines) naming the four tiers (canonical entity, exact structured record edge, scoped reference, lexical evidence) with one-line descriptions each.

### 4. Update `CLAUDE.md` §Machine-facing-layer integration

Add a sentence naming the scoped-reference middle tier alongside the existing localization surfaces (`search_nodes`, `get_node`, `get_neighbors`, `find_named_entities`, `find_impacted_fragments`) so future readers of the CLAUDE.md project-level file understand the tier layering. Placement: append after the existing "Localization" bullet in the §Machine-facing-layer integration block.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — single-sentence tightening at line 422)
- `docs/CONTEXT-PACKET-CONTRACT.md` (regenerate)
- `docs/MACHINE-FACING-LAYER.md` (modify — add table row + short section)
- `CLAUDE.md` (modify — add single sentence)

## Out of Scope

- `docs/WORKFLOWS.md` updates (not named in SPEC-12 D8)
- `docs/HARD-GATE-DISCIPLINE.md` updates (not named in SPEC-12 D8; no HARD-GATE semantics changed in this spec)
- Skill-level prose rewrites in `.claude/skills/` (SPEC-06 Part A work, not this ticket; forward-compat note in SPEC-12 D8 explicitly defers this)
- Updating archived spec docs (`archive/specs/*`)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'packet_version: 2' docs/CONTEXT-PACKET-CONTRACT.md` returns a match in the Packet Shape example.
2. `grep -n 'local_authority\|exact_record_links\|scoped_local_context\|governing_world_context\|impact_surfaces' docs/CONTEXT-PACKET-CONTRACT.md` returns matches for all five class names.
3. `grep -E '(nucleus|envelope):' docs/CONTEXT-PACKET-CONTRACT.md` returns 0 matches (v1 layer terms removed from the YAML example).
4. `grep -n 'scoped_references\|reference_name\|scoped_matches' docs/MACHINE-FACING-LAYER.md` returns matches in the localization table and the new Trust tiers section.
5. `grep -n 'scoped.reference' CLAUDE.md` returns a match in the §Machine-facing-layer integration block.
6. `docs/FOUNDATIONS.md:422` wording tightened (manual review — single-sentence diff).

### Invariants

1. Documentation shape matches code shape in ticket 008's branch (byte-for-byte example YAML resolves against the TypeScript `ContextPacket` interface).
2. No v1 terminology leaks into the regenerated docs.
3. `docs/FOUNDATIONS.md` §Tooling Recommendation's "non-negotiable" framing is preserved; only the completeness-guarantee wording is tightened.
4. `docs/CONTEXT-PACKET-CONTRACT.md`'s three Non-Goals are preserved.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'packet_version: 2' docs/CONTEXT-PACKET-CONTRACT.md`
2. `grep -cE '(nucleus|envelope):' docs/CONTEXT-PACKET-CONTRACT.md` (expect 0)
3. `grep -n 'scoped' CLAUDE.md`
4. `grep -n 'Trust tiers' docs/MACHINE-FACING-LAYER.md`
