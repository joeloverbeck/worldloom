# SPEC33STOPIPSEV-001: Replace turn-cycle seed derivation with schema-backed anchors

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-turn-cycle/SKILL.md` skill-prose update; no tool/validator/patch-engine changes.
**Deps**: None

## Problem

At intake, `.claude/skills/branching-story-turn-cycle/SKILL.md` derived world-scope `seed_nodes` via field names that do not exist in the shared story-state contract — `STENT.bound_ent_id` (only `STENT.bound_char_id` is defined at story-state-contract §4.5.1) and `STLOC.governing_section_id` (only `STLOC.bound_ent` is defined at §4.5.8). The skill prose was therefore un-executable as written. The MCP server's defensive guard (`STORY_LOCAL_SEED_NODE_PATTERN` + the `story_local_seed_nodes_ignored` warning per SPEC-31 D14, at `tools/world-mcp/src/tools/get-context-packet.ts:29-40`) bounds runtime damage by discarding any story-local IDs accidentally passed, but the skill prose needed to stop presenting invalid fields as the source of truth for skill authors and future audits.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of unsupported fields**: live grep of `branching-story-turn-cycle/SKILL.md` confirms line 147 names `STENT.bound_char_id ... or STENT.bound_ent_id` and `STLOC.bound_ent or STLOC.governing_section_id`; live read of `_shared-templates/story-state-contract.md` §4.5.1 (STENT) defines only `bound_char_id`, and §4.5.8 (STLOC) defines only `bound_ent`. The `bound_ent_id` and `governing_section_id` field names exist nowhere in the contract.
2. **Specs/docs cross-reference**: SPEC-31 D14 (archived) landed the MCP server-side `story_local_seed_nodes_ignored` warning at `tools/world-mcp/src/tools/get-context-packet.ts`; this ticket completes the discipline at the skill-prose layer.
3. **Cross-skill boundary**: the shared boundary under audit is `_shared-templates/story-state-contract.md` §4 record schemas. The skill prose must cite only fields defined there; deviation requires contract amendment first.
4. **FOUNDATIONS principle restatement**: §5 Validation Rules at Story Scope (Rule 1 — No Floating Facts grounds the schema-backed-fields-only discipline; skill prose must name real schema fields per the shared story-state contract); §3 Read Discipline (story-local records load through `story_slug`-scoped tools, not through context-packet `seed_nodes`).

## Architecture Check

1. The replacement paragraph cites only schema-backed anchors per the shared story-state contract — the canonical source of truth for story-record schemas per FOUNDATIONS §Story Bundles §5b (Schema-Minimalism). This approach is cleaner than alternatives that would (a) add `bound_ent_id` / `governing_section_id` to the schemas to legitimize the skill prose (would violate Schema-Minimalism without a load-bearing consumer) or (b) leave the prose ambiguous (continues to mislead authors).
2. No backwards-compatibility aliasing/shims introduced — the unsupported fields are removed from prose without legacy aliases.

## Verification Layers

1. Schema-backed-fields-only invariant → codebase grep-proof (`grep -n 'bound_ent_id\|governing_section_id'` returns zero matches in turn-cycle SKILL.md).
2. Replacement paragraph cites only contract-§4 fields → manual review against `_shared-templates/story-state-contract.md` §4.5.1 + §4.5.8.
3. MCP server defensive guard unchanged → no edit to `tools/world-mcp/src/tools/get-context-packet.ts`; backstop preserved.

## Landed Changes

### 1. Replace seed-derivation paragraph in turn-cycle SKILL.md §World-State Prerequisites

In `.claude/skills/branching-story-turn-cycle/SKILL.md` §World-State Prerequisites, replaced the old seed-derivation paragraph with:

```
Derive world-scope `seed_nodes` only from schema-backed anchors per the
shared story-state contract §4 schemas:

- active `STENT.bound_char_id` values when non-null;
- active `STLOC.bound_ent` values when non-null;
- parent `PG.state_snapshot.unresolved_mystery_claims[].mystery_id`;
- parent `CF-<integer>` ids named by active mirrored `SF.derived_from[]`;
- active-period `CH-<integer>` / `SEC-*` / `CF-<integer>` / `ENT-<integer>`
  anchors when already known from loaded world-canon context.

Do not derive seeds from story-local ids or from fields not defined in the
shared story-state contract. In particular, do not pass `STENT`, `STLOC`,
`STSTAT`, `SF`, `BEL`, `PG`, `SE`, `CHC`, `SLT`, `OBL`, `CNSQ`, `THR`, `SREL`,
`STINT`, `STOBJ`, `BR`, `SLB`, `SAU`, `SP`, or `RSP` ids as context-packet
`seed_nodes`; story-local records are loaded through `story_slug` +
`story_bundle_context`, `mcp__worldloom__get_records(record_ids=...,
story_slug=<story_slug>)`, or `mcp__worldloom__list_records(record_type=...,
story_slug=<story_slug>)`. The MCP server-side `story_local_seed_nodes_ignored`
warning is a defensive backstop, not a substitute for this discipline.
```

### 2. Add verification note at foot of §World-State Prerequisites

Added a one-line note immediately after the replaced paragraph:

```
Seed derivation conforms to story-state contract §4.5.1 (STENT) and §4.5.8
(STLOC); deviation requires contract amendment first.
```

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)

## Out of Scope

- MCP server-side `STORY_LOCAL_SEED_NODE_PATTERN` regex or `story_local_seed_nodes_ignored` warning — already landed via SPEC-31 D14; this ticket complements but does not modify the runtime guard.
- Schema amendments to add `bound_ent_id` or `governing_section_id` to STENT/STLOC — forbidden by FOUNDATIONS §Schema-Minimalism without a load-bearing consumer; not proposed.
- Other turn-cycle SKILL.md sections (Phase 1-6 logic, hard gates, etc.) — out of scope; this ticket only modifies §World-State Prerequisites seed-derivation paragraph.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'bound_ent_id\|governing_section_id' .claude/skills/branching-story-turn-cycle/SKILL.md` returns zero matches. In shell terms, exit 1 with no output is the expected success signal for this negative grep.
2. `grep -n 'STENT.bound_char_id\|STLOC.bound_ent' .claude/skills/branching-story-turn-cycle/SKILL.md` returns matches in the replaced paragraph naming both canonical fields.
3. Visual review confirms the new paragraph cites only fields defined in `_shared-templates/story-state-contract.md` §4.

### Invariants

1. Every field name in the seed-derivation paragraph resolves to a field defined in the shared story-state contract §4.
2. The MCP server-side `story_local_seed_nodes_ignored` warning remains the defensive backstop, not the primary discipline.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'bound_ent_id\|governing_section_id' .claude/skills/branching-story-turn-cycle/SKILL.md` — must return zero matches.
2. `grep -n 'STENT.bound_char_id\|STLOC.bound_ent' .claude/skills/branching-story-turn-cycle/SKILL.md` — must return matches in the §World-State Prerequisites region.
3. Narrower command is appropriate because the fix is a single-paragraph prose edit; no functional code path executes seed-derivation prose, so no test runner exercises it. The full-pipeline verification surface is the shared story-state contract — its §4 schemas remain unchanged and authoritative.

## Outcome

Completed on 2026-05-16. The turn-cycle World-State Prerequisites now derive context-packet `seed_nodes` only from schema-backed anchors: `STENT.bound_char_id`, `STLOC.bound_ent`, parent unresolved mystery ids, parent CF ids from active mirrored `SF.derived_from[]`, and already-known active-period world-canon anchors. The invalid `STENT.bound_ent_id` and `STLOC.governing_section_id` references were removed. The paragraph now states that story-local IDs load through `story_slug`-scoped story-bundle retrieval and that the MCP `story_local_seed_nodes_ignored` warning is only a defensive backstop.

## Verification Result

1. `grep -n 'bound_ent_id\|governing_section_id' .claude/skills/branching-story-turn-cycle/SKILL.md` produced no output and exited 1, which is the expected success signal for this negative grep.
2. `grep -n 'STENT.bound_char_id\|STLOC.bound_ent' .claude/skills/branching-story-turn-cycle/SKILL.md` returned the canonical field references in the replaced paragraph.
3. Manual review checked `.claude/skills/_shared-templates/story-state-contract.md` §4.5.1 and §4.5.8: STENT defines `bound_char_id`, and STLOC defines `bound_ent`; neither unsupported field is part of the contract.
4. Manual review checked `tools/world-mcp/src/tools/get-context-packet.ts`; the `story_local_seed_nodes_ignored` warning remains unchanged as the defensive runtime backstop.

## Deviations

None. The landed change stayed within the documented skill-prose boundary; no tool, validator, schema, patch-engine, or MCP runtime code changed.
