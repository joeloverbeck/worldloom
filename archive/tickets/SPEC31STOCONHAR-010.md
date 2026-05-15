# SPEC31STOCONHAR-010: Closeout uses MCP retrieval for linked CF/CH/PA

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/story-promotion-closeout/SKILL.md` (MCP `get_records` PA hybrid support remains out of scope per spec)
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

At intake, `story-promotion-closeout/SKILL.md` instructed raw filesystem reads of linked CF / CH / PA records. Every other canon-reading skill goes through MCP. The reads were read-only and Hook 3 only blocks writes, so this was safe in practice — but inconsistent with the retrieval-contract discipline.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: closeout `:140-141,:155,:167` confirmed raw `_source/` filesystem reads at intake. `tools/world-mcp/src/tools/get-records.ts` does not currently support hybrid PA records (confirmed at codebase validation; spec §Out of Scope acknowledged the gap with fallback to per-PA `get_record`).
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D10 reframes severity to P2; spec §Out of Scope flags PA hybrid retrieval as a follow-up.
3. **Cross-skill / cross-artifact boundary under audit**: closeout (consumer) ↔ MCP retrieval surface. The skill change is prose-only; the MCP server's PA retrieval shape is not modified here.
4. **FOUNDATIONS principle under audit (restated)**: §Tooling Recommendation — every canon-reading skill should route through MCP for retrieval-contract consistency.
5. **Reassessment correction**: the live closeout `<HARD-GATE>` also names raw CF / CH / PA path verification as the pre-flight prerequisite. Because that gate text is active operational guidance, this ticket owns updating the gate summary to MCP retrieval wording while preserving the same abort-before-write behavior.

## Architecture Check

1. **Cleaner than alternative**: routing closeout reads through MCP unifies the retrieval contract across all canon-reading skills. The "safety" argument is moot (Hook 3 only blocks writes; reads are safe) but consistency is the real win.
2. **No backwards-compatibility shims**: no production closeouts exist; clean cutover.

## Verification Layers

1. **Closeout instructs MCP retrieval for CF / CH** → codebase grep-proof (closeout prose references `get_records(record_ids=<linked_cf_ids + linked_ch_ids>)`).
2. **Accepted-flavored closeout path uses MCP retrieval** → manual contract review (closeout on an accepted promotion resolves linked CF / CH through MCP; PA path uses per-PA `get_record` fallback).
3. **No raw `_source/canon/` or `_source/change-log/` reads in closeout** → codebase grep-proof.

## Landed Changes

### 1. Closeout `<HARD-GATE>` and Process Flow

The HARD-GATE pre-flight summary and process flow now require accepted-flavored linked CF / CH / PA existence verification through MCP retrieval before any write.

### 2. Closeout `story-promotion-closeout/SKILL.md` Pre-flight step 5 (`:155`)

Use `get_records` for linked CF / CH ids and per-PA `get_record` for linked PA ids. Abort with `linked-record-not-found` when any MCP response reports a miss.

### 3. Closeout Pre-flight step at `:140-141` and World-State Prerequisites at `:167`

Direct path enumerations now use retrieval calls:
```
- mcp__worldloom__get_records(
      record_ids=<linked_cf_ids + linked_ch_ids>,
      world_slug=<world_slug>
  )
- For PA records: per-PA mcp__worldloom__get_record(record_id=<linked_pa_id>, world_slug=<world_slug>)
  iterated over `linked_pa_ids` (hybrid PA batch via get_records is a follow-up — see Out of Scope).
```

### 4. MCP retrieval (`tools/world-mcp/src/tools/get-records.ts`)

Out of scope for this ticket (per spec §Out of Scope). If hybrid PA batch support is added in a follow-up ticket, closeout's PA loop can become a single `get_records` call. The fallback path keeps closeout functional in the meantime.

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — `:140-141`, `:155`, `:167`)

## Out of Scope

- `get_records` hybrid PA support (spec §Out of Scope; follow-up MCP ticket).
- Other canon-reading skills' direct-read patterns (if any) — closeout-only fix here.

## Acceptance Criteria

### Tests That Must Pass

1. Manual closeout contract review on an accepted-flavored promotion path: each linked CF / CH resolves through `get_records`; PA path uses per-PA `get_record` fallback.
2. Closeout operational prose contains no raw `_source/canon/` or `_source/change-log/` reads.

### Invariants

1. Closeout's read surface routes through MCP for CF / CH.
2. PA hybrid fallback (per-PA `get_record`) remains functional until the follow-up MCP ticket lands hybrid batch support.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "_source/canon/\|_source/change-log/" .claude/skills/story-promotion-closeout/SKILL.md` → 0 matches in active operational prose (historical-reference contexts permitted).
2. `grep -n "get_records\|get_record" .claude/skills/story-promotion-closeout/SKILL.md` → matches reflect MCP routing.

## Outcome

Completed on 2026-05-15. `.claude/skills/story-promotion-closeout/SKILL.md` now routes accepted-flavored linked CF / CH verification through `mcp__worldloom__get_records(...)` and linked PA verification through per-PA `mcp__worldloom__get_record(...)`. The HARD-GATE summary, process flow, world-state prerequisites, pre-flight step 5, Phase 1, and Phase 3 gate 2 now agree on MCP retrieval while preserving fail-closed `linked-record-not-found` behavior.

## Verification Result

1. `rg -n '_source/canon/|_source/change-log/|adjudications/PA' .claude/skills/story-promotion-closeout/SKILL.md archive/tickets/SPEC31STOCONHAR-010.md` — the edited skill has no raw linked CF / CH / PA path hits; remaining hits are historical intake/proof text in this ticket.
2. `rg -n 'get_records|get_record|linked-record-not-found|linked_record_not_found' .claude/skills/story-promotion-closeout/SKILL.md archive/tickets/SPEC31STOCONHAR-010.md` — confirms the skill's accepted-flavored path uses `get_records` for CF / CH, per-PA `get_record` for PA, and the existing `linked-record-not-found` abort wording.
3. Manual contract review confirmed no direct MCP server code was needed for this ticket because PA batch retrieval remains out of scope and the fallback per-PA `get_record` path is already documented.

## Deviations

- Replaced the drafted skill dry-run with manual contract review plus grep proof. The repo has no executable dry-run harness for `.claude/skills/story-promotion-closeout`; the edited surface is prose guidance, not runtime code.
- Expanded the owned prose from the originally cited pre-flight/world-state lines to include the live `<HARD-GATE>` and process-flow summary because they carried the same operational raw-path prerequisite.
