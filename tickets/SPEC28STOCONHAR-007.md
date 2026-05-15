# SPEC28STOCONHAR-007: Context-packet and STORY_KERNEL.md frontmatter reconciliation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-bootstrap` skill SKILL.md (STORY_KERNEL.md contract gains a frontmatter block); `docs/CONTEXT-PACKET-CONTRACT.md` §6 (drop stale "shape/intensity counts" line; clarify `story_bootstrap` task-type behavior).
**Deps**: None

## Problem

`docs/CONTEXT-PACKET-CONTRACT.md` §6 and `tools/world-mcp/src/context-packet/story-bundle-context.ts` both read STORY_KERNEL.md *YAML frontmatter* fields `mysteries_in_play`, `cast_bind_list`, and `invariants_acknowledged` (the contract specifies it; the code's `parseStoryKernelFrontmatter` parses it). But `.claude/skills/branching-story-bootstrap/SKILL.md` produces STORY_KERNEL.md as eight ordered markdown sections with **no frontmatter at all** — so `parseStoryKernelFrontmatter` returns `{}` and every `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` context packet silently reports zero mysteries, zero cast bindings, and zero acknowledged invariants. SPEC-28 D7.

The same §6 paragraph also still lists "storylet pool totals, shape/intensity counts, and capped visible storylet records" — `shape` / `intensity` are retired storylet vocabulary (the greenfield SLT schema uses `move_family` / `saliency.urgency`), so the contract paragraph is internally stale.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/branching-story-bootstrap/SKILL.md`: the STORY_KERNEL.md contract specifies eight ordered markdown sections (`# <Story Title>`, `## Story Identity`, `## Player Agency Contract`, `## Cast and Roles`, `## Opening Situation`, `## Canon Grounding`, `## Protected Mystery and Invariant Boundaries`, `## Initial Continuation Contract`) — confirmed during SPEC-28's brainstorm verification. **No YAML frontmatter is required or specified** in the current contract. Verified against `tools/world-mcp/src/context-packet/story-bundle-context.ts`: `parseStoryKernelFrontmatter` extracts a leading `---`-delimited YAML block from STORY_KERNEL.md and parses it; absence yields `{}` and downstream `buildMysteriesInPlay` / `buildCastBindList` / `invariants_acknowledged` arrays default to empty. **No tools change is needed** — the code already correctly parses the frontmatter that bootstrap will start producing.
2. Verified against `docs/CONTEXT-PACKET-CONTRACT.md` §6 (lines ~124-133): the contract explicitly names `mysteries_in_play`, `cast_bind_list`, and `invariants_acknowledged` as STORY_KERNEL.md frontmatter fields the story-bundle context layer reads, AND still lists "storylet pool totals, shape/intensity counts, and capped visible storylet records" — the latter cites retired storylet vocabulary. SPEC-27 D6 edited a *different* part of this file (the `canon_revision` phantom-feature correction); D7's §6 edits rebase against the post-SPEC-27 state and do not collide.
3. Cross-artifact shared boundary: STORY_KERNEL.md is the boundary — produced by `branching-story-bootstrap`, consumed by `tools/world-mcp/src/context-packet/story-bundle-context.ts` via the `docs/CONTEXT-PACKET-CONTRACT.md` §6 contract. No JSON-schema validator exists for STORY_KERNEL.md frontmatter (confirmed: `tools/validators/src/schemas/` has no `story-kernel.schema.json`); the parse path tolerates missing frontmatter by defaulting to `{}`, so the additive frontmatter block does not break any existing bundle. The `## Cast and Roles` markdown section and the proposed `cast_bind_list` frontmatter field are paired surfaces; D7 declares the frontmatter authoritative for machine retrieval and the markdown section its human rendering, kept in sync — the same dual-surface discipline the CF templates carry.
4. Schema extension: D7 establishes a STORY_KERNEL.md YAML frontmatter as a new structured output surface — `story_id`, `story_slug`, `root_branch_id`, `root_page_id`, `cast_bind_list`, `player_agency_surface`, `mysteries_in_play`, `invariants_acknowledged`. Consumer is `tools/world-mcp/src/context-packet/story-bundle-context.ts` (already expects these fields). The extension is additive — bundles authored before D7 lands (none exist in production; zero production bundles) would simply have no frontmatter and the parser would default to `{}`; the new bootstrap contract is forward-only.
5. Adjacent contradiction surfaced at reassessment: the stale "shape/intensity counts" line in `docs/CONTEXT-PACKET-CONTRACT.md` §6 is the one genuine residue of the source report's P0.10 (purge legacy ARC vocabulary). SPEC-28 explicitly folds this sliver into D7. Classified as a required consequence of this ticket; the broader tools-layer arc-vocabulary cleanup remains flagged in `docs/triage/2026-05-15-story-related-improvements-triage.md` as an out-of-report finding, not actioned here.

## Architecture Check

1. Adding a YAML frontmatter block to STORY_KERNEL.md (rather than restructuring it as a pure machine-readable artifact, or moving the machine-read fields into a separate file) is cleaner because it (a) requires no tools change — `story-bundle-context.ts` already parses the frontmatter; (b) preserves the human-readable markdown sections that operators read at the bundle level; (c) gives a dual-surface sync discipline (frontmatter authoritative for machine retrieval; markdown sections the human rendering) that matches the existing CF / character / diegetic-artifact template precedents.
2. No backwards-compatibility shims or alias paths — the bootstrap STORY_KERNEL.md contract is updated in place; bundles without frontmatter (zero production bundles exist) would simply produce empty context-packet arrays, identical to today's behavior. The stale "shape/intensity counts" line is corrected in place; no parallel "the old vocabulary was X" note is added.

## Verification Layers

1. Bootstrap contract carries the frontmatter -> codebase grep-proof: `grep -nE "story_id:|story_slug:|root_branch_id:|root_page_id:|cast_bind_list:|player_agency_surface:|mysteries_in_play:|invariants_acknowledged:" .claude/skills/branching-story-bootstrap/SKILL.md` returns hits in the STORY_KERNEL.md contract section; the contract documents that the frontmatter precedes the eight markdown sections.
2. CONTEXT-PACKET-CONTRACT §6 reconciled -> codebase grep-proof: `grep -nE "shape/intensity counts|shape.intensity" docs/CONTEXT-PACKET-CONTRACT.md` returns no hits in §6; the §6 prose enumerates only fields and counts that the greenfield SLT / story-bundle schemas actually carry.
3. story_bootstrap behavior clarified -> codebase grep-proof / manual review: `docs/CONTEXT-PACKET-CONTRACT.md` §6 explicitly states that for the `story_bootstrap` task type the bundle does not exist yet, `story_slug` is accepted as the *target* slug, and `story_bundle_context` is empty (a world-canon-only packet).
4. No tools change required -> manual review: `tools/world-mcp/src/context-packet/story-bundle-context.ts` is unchanged; `parseStoryKernelFrontmatter` already reads the three fields the contract names plus tolerates the additional fields D7 introduces (`story_id`, `story_slug`, `root_branch_id`, `root_page_id`, `player_agency_surface`).

## What to Change

### 1. Add a YAML frontmatter block to the bootstrap STORY_KERNEL.md contract

In `.claude/skills/branching-story-bootstrap/SKILL.md`, amend the STORY_KERNEL.md section contract to require a leading YAML frontmatter block preceding the eight markdown sections. The frontmatter carries the machine-read fields:

```
---
story_id: STORY-<integer>
story_slug: <slug>
root_branch_id: BR-1
root_page_id: PG-1
cast_bind_list:
  - char_id: CHAR-<integer> | null
    stent_id: STENT-<integer>
    role_in_story: [<role_in_story enum values>]
player_agency_surface:
  - STENT-<integer>
mysteries_in_play:
  - m_id: M-<integer>
    status: <unresolved_mystery_claims.status enum>
    future_resolution_safety: <safety label>
    domain_overlap: <domain or "—">
invariants_acknowledged:
  - <invariant id or label>
---
```

Add an explicit dual-surface note: the frontmatter is authoritative for machine retrieval (`tools/world-mcp/src/context-packet/story-bundle-context.ts` reads it for `mysteries_in_play`, `cast_bind_list`, `invariants_acknowledged`); the `## Cast and Roles` and `## Protected Mystery and Invariant Boundaries` markdown sections are the human rendering of the same data, kept in sync by the bootstrap skill.

### 2. Reconcile `docs/CONTEXT-PACKET-CONTRACT.md` §6

In `docs/CONTEXT-PACKET-CONTRACT.md` §6 (the story-bundle context layer description, lines ~124-133), drop the stale "shape/intensity counts" item from the layer's content list. Replace it with whatever count(s) the greenfield SLT / story-bundle schemas actually carry (e.g., `move_family` distribution, `saliency.urgency` counts — implementer confirms current canonical counts against `story-bundle-context.ts`'s build functions).

Add an explicit clarification of the `story_bootstrap` task-type behavior: because the bundle does not yet exist when bootstrap runs, `story_slug` is accepted as the *target* slug and `story_bundle_context` is empty — the packet returned for `story_bootstrap` is world-canon-only.

**Rebase note**: SPEC-27 D6 (SPEC27FOUCAN-006) edited the `change_log_entry` / `canon_revision` region of this file (lines ~246, 258, 264). D7's §6 edits are in a different region (lines ~124-133) and do not collide; rebase against the post-SPEC-27 file state at implementation time.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)

## Out of Scope

- Any change to `tools/world-mcp/src/context-packet/story-bundle-context.ts` — the code already parses the frontmatter correctly (confirmed at decomposition).
- The broader tools-layer arc-vocabulary cleanup (`tools/world-mcp/`, `tools/validators/`, `docs/MACHINE-FACING-LAYER.md` retention of `arc_archetype` / `narrative_point` / `arc_trace_record`) — flagged in `docs/triage/2026-05-15-story-related-improvements-triage.md` as an out-of-report finding, not actioned here.
- A JSON-schema validator for STORY_KERNEL.md frontmatter — none exists today; D7 does not introduce one.
- Migration of existing STORY_KERNEL.md files — zero production bundles exist.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "^story_id:|^story_slug:|^root_branch_id:|^root_page_id:|^cast_bind_list:|^player_agency_surface:|^mysteries_in_play:|^invariants_acknowledged:" .claude/skills/branching-story-bootstrap/SKILL.md` returns hits in the STORY_KERNEL.md contract section showing the frontmatter block.
2. `grep -nE "shape/intensity counts|shape.intensity" docs/CONTEXT-PACKET-CONTRACT.md` returns no hits in the §6 region.
3. `grep -nE "story_bootstrap|target slug|world-canon-only" docs/CONTEXT-PACKET-CONTRACT.md` returns at least one hit in §6 documenting the `story_bootstrap` task-type behavior (bundle does not yet exist; `story_slug` is the target slug; `story_bundle_context` is empty).

### Invariants

1. Every STORY_KERNEL.md authored by `branching-story-bootstrap` carries the YAML frontmatter block listed in §1; the frontmatter precedes the eight markdown sections.
2. The frontmatter is authoritative for machine retrieval; the `## Cast and Roles` and `## Protected Mystery and Invariant Boundaries` markdown sections are kept in sync with `cast_bind_list` and `mysteries_in_play` / `invariants_acknowledged` respectively.
3. `tools/world-mcp/src/context-packet/story-bundle-context.ts` is unchanged — the existing parser handles the new frontmatter without code modification.
4. `docs/CONTEXT-PACKET-CONTRACT.md` §6 carries no `shape` / `intensity` legacy storylet vocabulary.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "story_id:|cast_bind_list:|mysteries_in_play:|invariants_acknowledged:" .claude/skills/branching-story-bootstrap/SKILL.md`
2. `grep -nE "shape/intensity|shape\.intensity|story_bootstrap" docs/CONTEXT-PACKET-CONTRACT.md`
3. A narrower command is the correct verification boundary: D7 touches two files (one skill SKILL.md + one doc) with no code counterpart (`story-bundle-context.ts` already parses correctly); grep-proofs against the two edited files fully cover the change.
