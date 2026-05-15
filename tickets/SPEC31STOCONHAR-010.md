# SPEC31STOCONHAR-010: Closeout uses MCP retrieval for linked CF/CH/PA

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/story-promotion-closeout/SKILL.md`, conditional `tools/world-mcp/src/tools/get-records.ts` (PA hybrid support — out of scope per spec)
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

`story-promotion-closeout/SKILL.md:140-141,:155,:167` instructs raw filesystem reads of `worlds/<slug>/_source/canon/CF-<integer>.yaml`, `_source/change-log/CH-<integer>.yaml`, and `adjudications/PA-<integer>-*.md`. Every other canon-reading skill goes through MCP. The reads are read-only and Hook 3 only blocks writes, so this is safe in practice — but inconsistent with the retrieval-contract discipline.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: closeout `:140-141,:155,:167` confirmed raw `_source/` filesystem reads. `tools/world-mcp/src/tools/get-records.ts` does not currently support hybrid PA records (confirmed at codebase validation; spec §Out of Scope acknowledged the gap with fallback to per-PA `get_record`).
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D10 reframes severity to P2; spec §Out of Scope flags PA hybrid retrieval as a follow-up.
3. **Cross-skill / cross-artifact boundary under audit**: closeout (consumer) ↔ MCP retrieval surface. The skill change is prose-only; the MCP server's PA retrieval shape is not modified here.
4. **FOUNDATIONS principle under audit (restated)**: §Tooling Recommendation — every canon-reading skill should route through MCP for retrieval-contract consistency.

## Architecture Check

1. **Cleaner than alternative**: routing closeout reads through MCP unifies the retrieval contract across all canon-reading skills. The "safety" argument is moot (Hook 3 only blocks writes; reads are safe) but consistency is the real win.
2. **No backwards-compatibility shims**: no production closeouts exist; clean cutover.

## Verification Layers

1. **Closeout instructs MCP retrieval for CF / CH** → codebase grep-proof (closeout prose references `get_records(record_ids=<linked_cf_ids + linked_ch_ids>)`).
2. **Closeout dry-run** → skill dry-run (closeout on an accepted promotion: each linked CF / CH resolves through MCP; PA path uses per-PA `get_record` fallback).
3. **No raw `_source/canon/` or `_source/change-log/` reads in closeout** → codebase grep-proof.

## What to Change

### 1. Closeout `story-promotion-closeout/SKILL.md` Pre-flight step 5 (`:155`)

Replace with:
```
On accepted-flavored verdicts: verify each linked CF / CH / PA id resolves
through MCP retrieval. Abort with `linked_record_not_found` on any miss.
Do not raw-read world-canon `_source/` paths.
```

### 2. Closeout Pre-flight step at `:140-141` and World-State Prerequisites at `:167`

Replace direct path enumerations with retrieval calls:
```
- mcp__worldloom__get_records(
      record_ids=<linked_cf_ids + linked_ch_ids>,
      world_slug=<world_slug>
  )
- For PA records: per-PA mcp__worldloom__get_record(record_id=<linked_pa_id>, world_slug=<world_slug>)
  iterated over `linked_pa_ids` (hybrid PA batch via get_records is a follow-up — see Out of Scope).
```

### 3. MCP retrieval (`tools/world-mcp/src/tools/get-records.ts`)

Out of scope for this ticket (per spec §Out of Scope). If hybrid PA batch support is added in a follow-up ticket, closeout's PA loop becomes a single `get_records` call. The fallback path keeps closeout functional in the meantime.

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — `:140-141`, `:155`, `:167`)

## Out of Scope

- `get_records` hybrid PA support (spec §Out of Scope; follow-up MCP ticket).
- Other canon-reading skills' direct-read patterns (if any) — closeout-only fix here.

## Acceptance Criteria

### Tests That Must Pass

1. Closeout dry-run on an accepted promotion: each linked CF / CH resolves through MCP retrieval; PA path uses per-PA `get_record` fallback.
2. Closeout prose contains no raw `_source/canon/` or `_source/change-log/` reads.

### Invariants

1. Closeout's read surface routes through MCP for CF / CH.
2. PA hybrid fallback (per-PA `get_record`) remains functional until the follow-up MCP ticket lands hybrid batch support.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "_source/canon/\|_source/change-log/" .claude/skills/story-promotion-closeout/SKILL.md` → 0 matches in active prose (historical-reference contexts permitted).
2. `grep -n "get_records\|get_record" .claude/skills/story-promotion-closeout/SKILL.md` → matches reflect MCP routing.
