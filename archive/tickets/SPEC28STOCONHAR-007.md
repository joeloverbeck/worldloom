# SPEC28STOCONHAR-007: Context-packet and STORY_KERNEL.md frontmatter reconciliation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `branching-story-bootstrap` skill SKILL.md (STORY_KERNEL.md contract gained a frontmatter block); `docs/CONTEXT-PACKET-CONTRACT.md` §6 (dropped stale "shape/intensity counts" line; clarified `story_bootstrap` task-type behavior); `tools/world-mcp` story-bundle context assembly/payload shape (replaced retired storylet-pool `shape` / `content_intensity` summary fields with current `move_family` / `saliency.urgency` fields, and kept `story_bootstrap` world-canon-only); `archive/specs/SPEC-28-story-contract-hardening.md` D7 implementation note.
**Deps**: None

## Problem

At intake, `docs/CONTEXT-PACKET-CONTRACT.md` §6 and `tools/world-mcp/src/context-packet/story-bundle-context.ts` both read STORY_KERNEL.md *YAML frontmatter* fields `mysteries_in_play`, `cast_bind_list`, and `invariants_acknowledged` (the contract specified it; the code's `parseStoryKernelFrontmatter` parsed it). But `.claude/skills/branching-story-bootstrap/SKILL.md` produced STORY_KERNEL.md as eight ordered markdown sections with **no frontmatter at all** — so `parseStoryKernelFrontmatter` returned `{}` and every `story_turn_cycle` / `branching_story_health_audit` / `story_fact_promotion_to_canon` context packet silently reported zero mysteries, zero cast bindings, and zero acknowledged invariants. SPEC-28 D7.

The same §6 paragraph also listed "storylet pool totals, shape/intensity counts, and capped visible storylet records" — `shape` / `intensity` are retired storylet vocabulary (the greenfield SLT schema uses `move_family` / `saliency.urgency`), so the contract paragraph was internally stale.

## Assumption Reassessment (2026-05-15)

1. Verified against `.claude/skills/branching-story-bootstrap/SKILL.md`: at intake, the STORY_KERNEL.md contract specified eight ordered markdown sections (`# <Story Title>`, `## Story Identity`, `## Player Agency Contract`, `## Cast and Roles`, `## Opening Situation`, `## Canon Grounding`, `## Protected Mystery and Invariant Boundaries`, `## Initial Continuation Contract`) with no YAML frontmatter. Verified against `tools/world-mcp/src/context-packet/story-bundle-context.ts`: `parseStoryKernelFrontmatter` already extracts a leading `---`-delimited YAML block from STORY_KERNEL.md and parses it; absence yields `{}` and downstream `buildMysteriesInPlay` / `buildCastBindList` / `invariants_acknowledged` arrays default to empty. No parser change was needed, but package reassessment found same-seam storylet-pool payload drift requiring a focused tools change.
2. Verified against `docs/CONTEXT-PACKET-CONTRACT.md` §6 (lines ~124-133): the contract explicitly names `mysteries_in_play`, `cast_bind_list`, and `invariants_acknowledged` as STORY_KERNEL.md frontmatter fields the story-bundle context layer reads, AND still lists "storylet pool totals, shape/intensity counts, and capped visible storylet records" — the latter cites retired storylet vocabulary. SPEC-27 D6 edited a *different* part of this file (the `canon_revision` phantom-feature correction); D7's §6 edits rebase against the post-SPEC-27 state and do not collide.
3. Cross-artifact shared boundary: STORY_KERNEL.md is the boundary — produced by `branching-story-bootstrap`, consumed by `tools/world-mcp/src/context-packet/story-bundle-context.ts` via the `docs/CONTEXT-PACKET-CONTRACT.md` §6 contract. No JSON-schema validator exists for STORY_KERNEL.md frontmatter (confirmed: `tools/validators/src/schemas/` has no `story-kernel.schema.json`); the parse path tolerates missing frontmatter by defaulting to `{}`, so the additive frontmatter block does not break any existing bundle. The `## Cast and Roles` markdown section and the proposed `cast_bind_list` frontmatter field are paired surfaces; D7 declares the frontmatter authoritative for machine retrieval and the markdown section its human rendering, kept in sync — the same dual-surface discipline the CF templates carry.
4. Schema extension: D7 establishes a STORY_KERNEL.md YAML frontmatter as a new structured output surface — `story_id`, `story_slug`, `root_branch_id`, `root_page_id`, `cast_bind_list`, `player_agency_surface`, `mysteries_in_play`, `invariants_acknowledged`. Consumer is `tools/world-mcp/src/context-packet/story-bundle-context.ts` (already expects these fields). The extension is additive — bundles authored before D7 lands (none exist in production; zero production bundles) would simply have no frontmatter and the parser would default to `{}`; the new bootstrap contract is forward-only.
5. Adjacent contradiction surfaced at reassessment: the stale "shape/intensity counts" line in `docs/CONTEXT-PACKET-CONTRACT.md` §6 is the one genuine residue of the source report's P0.10 (purge legacy ARC vocabulary). SPEC-28 explicitly folds this sliver into D7. Live package reassessment found the same stale vocabulary in the `tools/world-mcp` story-bundle context response shape (`ContextPacketStoryBundleContext.storylet_pool_summary.by_shape`, `.by_content_intensity`, and `visible_records[].shape` / `visible_records[].content_intensity`), and found that `assembleContextPacket` still built a story-bundle context object for `story_bootstrap` when `story_slug` was supplied. Classified as required same-seam fallout because §6 is the public contract for that payload; the narrower truthful owner is context-packet assembly/payload and its focused tests, not the broader `list_records` story-bundle filter vocabulary or unrelated ARC_TRACE surfaces.

## Architecture Check

1. Adding a YAML frontmatter block to STORY_KERNEL.md (rather than restructuring it as a pure machine-readable artifact, or moving the machine-read fields into a separate file) is cleaner because it preserves the human-readable markdown sections that operators read at the bundle level and gives a dual-surface sync discipline (frontmatter authoritative for machine retrieval; markdown sections the human rendering) that matches the existing CF / character / diegetic-artifact template precedents.
2. No backwards-compatibility shims or alias paths — the bootstrap STORY_KERNEL.md contract is updated in place; bundles without frontmatter (zero production bundles exist) would simply produce empty context-packet arrays, identical to today's behavior. The stale storylet-pool response fields are corrected in place; no parallel old-vocabulary response aliases are added.

## Verification Layers

1. Bootstrap contract carries the frontmatter -> codebase grep-proof: `grep -nE "story_id:|story_slug:|root_branch_id:|root_page_id:|cast_bind_list:|player_agency_surface:|mysteries_in_play:|invariants_acknowledged:" .claude/skills/branching-story-bootstrap/SKILL.md` returns hits in the STORY_KERNEL.md contract section; the contract documents that the frontmatter precedes the eight markdown sections.
2. CONTEXT-PACKET-CONTRACT §6 reconciled -> codebase grep-proof: `grep -nE "shape/intensity counts|shape.intensity" docs/CONTEXT-PACKET-CONTRACT.md` returns no hits in §6; the §6 prose enumerates only fields and counts that the greenfield SLT / story-bundle schemas actually carry.
3. story_bootstrap behavior clarified -> codebase grep-proof / manual review: `docs/CONTEXT-PACKET-CONTRACT.md` §6 explicitly states that for the `story_bootstrap` task type the bundle does not exist yet, `story_slug` is accepted as the *target* slug, and `story_bundle_context` is `null` (a world-canon-only packet).
4. Storylet-pool payload uses current SLT fields -> package test / grep-proof: `tools/world-mcp/src/context-packet/story-bundle-context.ts` and `tools/world-mcp/src/context-packet/shared.ts` expose `by_move_family`, `by_urgency`, `visible_records[].move_family`, and `visible_records[].urgency`; focused context-packet tests assert those fields.
5. story_bootstrap is world-canon-only -> package test: `tools/world-mcp/src/context-packet/assemble.ts` leaves `story_bundle_context` null for `task_type: "story_bootstrap"` even when `story_slug` supplies the target slug; focused context-packet test asserts this behavior.
6. No parser change required for kernel frontmatter -> manual review: `parseStoryKernelFrontmatter` already reads the three fields the contract names plus tolerates the additional fields D7 introduces (`story_id`, `story_slug`, `root_branch_id`, `root_page_id`, `player_agency_surface`).

## Landed Changes

### 1. Added a YAML frontmatter block to the bootstrap STORY_KERNEL.md contract

In `.claude/skills/branching-story-bootstrap/SKILL.md`, the STORY_KERNEL.md section contract now requires a leading YAML frontmatter block preceding the eight markdown sections. The frontmatter carries the machine-read fields:

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

The skill now includes an explicit dual-surface note: the frontmatter is authoritative for machine retrieval (`tools/world-mcp/src/context-packet/story-bundle-context.ts` reads it for `mysteries_in_play`, `cast_bind_list`, `invariants_acknowledged`); the `## Cast and Roles` and `## Protected Mystery and Invariant Boundaries` markdown sections are the human rendering of the same data, kept in sync by the bootstrap skill.

### 2. Reconciled `docs/CONTEXT-PACKET-CONTRACT.md` §6 and the MCP payload

In `docs/CONTEXT-PACKET-CONTRACT.md` §6, the stale "shape/intensity counts" item is replaced with the greenfield SLT fields the shared contract and JSON Schema actually carry: `move_family` distribution and `saliency.urgency` counts, plus capped visible storylet records exposing `move_family`, `urgency`, and visibility.

The `tools/world-mcp` story-bundle context payload now matches that public contract: `storylet_pool_summary.by_shape` became `by_move_family`, `by_content_intensity` became `by_urgency`, and visible storylet records carry `move_family` / `urgency` instead of `shape` / `content_intensity`. `assembleContextPacket` also leaves `story_bundle_context` null for `story_bootstrap`, because that task uses `story_slug` as a target slug before the bundle exists. This is a same-seam context-packet correction, not a broad `list_records` vocabulary cleanup.

The contract now clarifies the `story_bootstrap` task-type behavior: because the bundle does not yet exist when bootstrap runs, `story_slug` is accepted as the *target* slug and `story_bundle_context` is `null` — the packet returned for `story_bootstrap` is world-canon-only.

### 3. Truthed the explicit SPEC-28 reference

`archive/specs/SPEC-28-story-contract-hardening.md` now has a 2026-05-15 D7 implementation note naming the landed frontmatter contract, `story_bootstrap` clarification, and same-seam MCP payload update.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify)
- `archive/specs/SPEC-28-story-contract-hardening.md` (modify; archived during post-ticket review after all D1-D7 tickets were complete)

## Out of Scope

- Any change to `parseStoryKernelFrontmatter` — the code already parses the frontmatter correctly (confirmed at decomposition).
- Broader `tools/world-mcp` `list_records` storylet filter vocabulary cleanup — this ticket owns the `get_context_packet` story-bundle context payload and contract text only.
- The broader tools-layer arc-vocabulary cleanup (`tools/world-mcp/`, `tools/validators/`, `docs/MACHINE-FACING-LAYER.md` retention of `arc_archetype` / `narrative_point` / `arc_trace_record`) — flagged in `docs/triage/2026-05-15-story-related-improvements-triage.md` as an out-of-report finding, not actioned here.
- A JSON-schema validator for STORY_KERNEL.md frontmatter — none exists today; D7 does not introduce one.
- Migration of existing STORY_KERNEL.md files — zero production bundles exist.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "^story_id:|^story_slug:|^root_branch_id:|^root_page_id:|^cast_bind_list:|^player_agency_surface:|^mysteries_in_play:|^invariants_acknowledged:" .claude/skills/branching-story-bootstrap/SKILL.md` returns hits in the STORY_KERNEL.md contract section showing the frontmatter block.
2. `! grep -nE "shape/intensity counts|shape\.intensity" docs/CONTEXT-PACKET-CONTRACT.md` returns no hits.
3. `grep -nE "story_bootstrap|target slug|world-canon-only" docs/CONTEXT-PACKET-CONTRACT.md` returns at least one hit in §6 documenting the `story_bootstrap` task-type behavior (bundle does not yet exist; `story_slug` is the target slug; `story_bundle_context` is `null`).
4. `(cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/context-packet/story-bundle-budget.test.js)` passes and proves the updated `storylet_pool_summary` shape plus `story_bootstrap` null context behavior.

### Invariants

1. Every STORY_KERNEL.md authored by `branching-story-bootstrap` carries the YAML frontmatter block listed in §1; the frontmatter precedes the eight markdown sections.
2. The frontmatter is authoritative for machine retrieval; the `## Cast and Roles` and `## Protected Mystery and Invariant Boundaries` markdown sections are kept in sync with `cast_bind_list` and `mysteries_in_play` / `invariants_acknowledged` respectively.
3. `parseStoryKernelFrontmatter` is unchanged — the existing parser handles the new frontmatter without code modification.
4. `docs/CONTEXT-PACKET-CONTRACT.md` §6 carries no `shape` / `intensity` legacy storylet vocabulary.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — asserts `by_move_family`, `by_urgency`, visible storylet `move_family` / `urgency` fields, and `story_bootstrap` null `story_bundle_context` behavior.
2. `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` — updates the large-pool fixture to current SLT fields so persisted-summary proof remains current.
3. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` — updates the shared context-packet storylet fixture to current SLT fields.

### Commands

1. `grep -nE "story_id:|cast_bind_list:|mysteries_in_play:|invariants_acknowledged:" .claude/skills/branching-story-bootstrap/SKILL.md`
2. `! grep -nE "shape/intensity counts|shape\.intensity" docs/CONTEXT-PACKET-CONTRACT.md`
3. `grep -nE "story_bootstrap|target slug|world-canon-only" docs/CONTEXT-PACKET-CONTRACT.md`
4. `(cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/context-packet/story-bundle-budget.test.js)`
5. A narrower package command is the correct verification boundary: D7 owns the story-bundle context payload, not the unrelated `list_records` storylet filter vocabulary or the full MCP suite's live-world/index surfaces.

## Outcome

D7 is implemented. `branching-story-bootstrap` now emits a machine-read `STORY_KERNEL.md` frontmatter contract before the human markdown sections, `docs/CONTEXT-PACKET-CONTRACT.md` §6 now reflects the bootstrap target-slug / empty-bundle behavior, and `tools/world-mcp` story-bundle context summaries now expose current SLT `move_family` / `saliency.urgency` fields while leaving `story_bootstrap` world-canon-only. The explicit SPEC-28 reference has a dated implementation note for the landed D7 seam; post-ticket review marked the completed SPEC-28 spec complete and archived it after confirming all seven SPEC28STOCONHAR tickets were archived.

## Verification Result

1. `npm run build` from `tools/world-mcp` — passed.
2. `node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/context-packet/story-bundle-budget.test.js` from `tools/world-mcp` — passed (4 tests).
3. `grep -nE "^story_id:|^story_slug:|^root_branch_id:|^root_page_id:|^cast_bind_list:|^player_agency_surface:|^mysteries_in_play:|^invariants_acknowledged:" .claude/skills/branching-story-bootstrap/SKILL.md` — passed; all required frontmatter fields are present in the STORY_KERNEL.md contract.
4. `! grep -nE "shape/intensity counts|shape\.intensity" docs/CONTEXT-PACKET-CONTRACT.md` — passed; no stale §6 contract anchors remain.
5. `grep -nE "story_bootstrap|target slug|world-canon-only" docs/CONTEXT-PACKET-CONTRACT.md` — passed; §6 records the target-slug / empty-bundle behavior.

## Deviations

- Reassessment widened the ticket from docs/skill prose to include focused `tools/world-mcp` context-packet assembly/payload edits because the same retired storylet-pool vocabulary existed in the live public response shape and `story_bootstrap` needed to remain world-canon-only in code. This stayed inside the D7 context-packet seam.
- `parseStoryKernelFrontmatter` remained unchanged; the package code change only updated storylet-pool summary fields and focused tests.
- The broader `list_records` storylet filter vocabulary and unrelated ARC_TRACE / legacy ARC surfaces remain out of scope.
