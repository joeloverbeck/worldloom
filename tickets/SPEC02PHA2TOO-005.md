# SPEC02PHA2TOO-005: Cross-ticket Deps update — SPEC03PATENG-009 references SPEC02PHA2TOO tickets

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — edits `tickets/SPEC03PATENG-009.md` (single-line `Deps:` field update). No code changes; ticket-metadata-only.
**Deps**: archive/tickets/SPEC02PHA2TOO-001.md, SPEC02PHA2TOO-002, SPEC02PHA2TOO-003

## Problem

SPEC-02-PHASE2's load-bearing Ticket-decomposition directive (spec lines 17-25) mandates that when this spec is decomposed via `/spec-to-tickets`, the resulting ticket IDs MUST be added as `Deps` entries to `tickets/SPEC03PATENG-009.md` (and conditionally to `tickets/SPEC03PATENG-005.md` when token issuance lands here — it does not, so 005 is left unchanged).

Today `tickets/SPEC03PATENG-009.md:7` reads: `**Deps**: SPEC03PATENG-007 (transitive head — ticket 007 composes tickets 001–006 via the world-mcp rewire; the full DAG is reconstructible from the upstream tickets' own Deps fields)`. 009's acceptance criterion enumerates bullet 12 "Post-apply sync integration" which explicitly exercises `mcp__worldloom__get_record(new_cf_id)` and `find_sections_touched_by(new_cf_id)` — both delivered by tickets 001 and 002 here. 009's plan-creation test matrix also exercises the extended `allocate_next_id` classes — delivered by ticket 003. Without the cross-ref update, 009 will surface the missing prerequisite only at implementation time, defeating the directive's explicit Rule-5 intent ("the dependency chain must be visible in BOTH directions once tickets exist on both sides").

## Assumption Reassessment (2026-04-25)

1. `tickets/SPEC03PATENG-009.md:7` currently declares `**Deps**: SPEC03PATENG-007 (transitive head — ...)`. Confirmed via pre-flight grep (`grep -n "Deps" tickets/SPEC03PATENG-009.md` at Step 2 of this batch's spec-to-tickets run). The edit adds `archive/tickets/SPEC02PHA2TOO-001.md` plus SPEC02PHA2TOO-002/003 to this line without removing the existing SPEC03PATENG-007 anchor. Reassessment correction from post-ticket review: ticket 001 is now archived, so the dependency should resolve to its archived path.
2. `tickets/SPEC03PATENG-005.md:7` declares `**Deps**: SPEC03PATENG-001`. SPEC-02-PHASE2 §Out of Scope explicitly says token issuance is NOT delivered here, so 005's Deps weakens only to "shared HMAC contract definition" (already implicit in 005's existing architectural notes). 005 is left unchanged per the spec's directive; this ticket does NOT edit 005.
3. Shared boundary: the ticket-level dependency graph. `Deps:` fields are the audit trail for cross-ticket ordering; a missing cross-ref means future implementation of 009 has no machine-readable signal that 001/002/003 must land first. Updating the line preserves graph integrity.
4. FOUNDATIONS principle under audit: Rule 5 (No Consequence Evasion). The spec's directive cites Rule 5 by name: "the dependency chain must be visible in BOTH directions once tickets exist on both sides." This ticket is the execution of that directive — declining to land it would leave a Rule-5 gap the spec author explicitly flagged.
5. Rename/removal blast radius: this ticket does NOT rename or remove any ticket, skill, tool, or schema field. It adds 3 cross-references. Pipeline-wide grep for SPEC03PATENG-009 (`grep -rn "SPEC03PATENG-009" tickets/ specs/ .claude/skills/ docs/`) confirms no downstream consumer would be broken by the Deps-line extension — they reference the ticket by ID, not by its specific Deps list.

## Architecture Check

1. Dedicated ticket for the cross-ref update (vs. inlining the edit into spec-to-tickets skill execution) keeps the audit trail clean: every edit to a file in the working tree is a reviewable ticket. A reviewer seeing this ticket in the batch understands both the WHAT (update 009's Deps) and the WHY (spec directive citation + Rule 5 rationale).
2. Keeping the existing `SPEC03PATENG-007 (transitive head — ...)` anchor in place and appending the new Deps preserves the DAG structure 009 already documents. Removing the transitive-head anchor would break 009's own Architecture Check item 1.
3. No backwards-compatibility aliasing/shims introduced. The edit is pure text-addition on an existing ticket's metadata field.

## Verification Layers

1. 009's Deps line includes all three new prerequisites → codebase grep-proof (`grep -n "archive/tickets/SPEC02PHA2TOO-001.md\|SPEC02PHA2TOO-002\|SPEC02PHA2TOO-003" tickets/SPEC03PATENG-009.md` returns ≥3 matches on the `**Deps**:` line).
2. 009's existing SPEC03PATENG-007 transitive-head anchor is preserved → codebase grep-proof (`grep -n "SPEC03PATENG-007" tickets/SPEC03PATENG-009.md` still returns ≥1 match on the `**Deps**:` line).
3. 005 is NOT edited → codebase grep-proof (`git diff tickets/SPEC03PATENG-005.md` returns empty after this ticket lands).
4. Rule 5 alignment → FOUNDATIONS alignment check: SPEC-02-PHASE2's Ticket-decomposition directive citation resolves; 009's prerequisite chain is now bidirectionally visible.

## What to Change

### 1. Edit `tickets/SPEC03PATENG-009.md:7` (modify)

Replace (current):
> **Deps**: SPEC03PATENG-007 (transitive head — ticket 007 composes tickets 001–006 via the world-mcp rewire; the full DAG is reconstructible from the upstream tickets' own `Deps` fields)

With (target):
> **Deps**: SPEC03PATENG-007 (transitive head — ticket 007 composes tickets 001–006 via the world-mcp rewire; the full DAG is reconstructible from the upstream tickets' own `Deps` fields), SPEC02PHA2TOO-001, SPEC02PHA2TOO-002, SPEC02PHA2TOO-003 (MCP retrieval-tool prerequisites: `get_record` / `find_sections_touched_by` power the post-apply sync integration assertion; extended `allocate_next_id` powers the plan-creation test matrix for INV/OQ/ENT/SEC creates)

Post-ticket-review correction: because ticket 001 is archived, use:
> **Deps**: SPEC03PATENG-007 (transitive head — ticket 007 composes tickets 001–006 via the world-mcp rewire; the full DAG is reconstructible from the upstream tickets' own `Deps` fields), archive/tickets/SPEC02PHA2TOO-001.md, SPEC02PHA2TOO-002, SPEC02PHA2TOO-003 (MCP retrieval-tool prerequisites: `get_record` / `find_sections_touched_by` power the post-apply sync integration assertion; extended `allocate_next_id` powers the plan-creation test matrix for INV/OQ/ENT/SEC creates)

## Files to Touch

- `tickets/SPEC03PATENG-009.md` (modify — single-line Deps-field update)

## Out of Scope

- Editing `tickets/SPEC03PATENG-005.md`. Per SPEC-02-PHASE2 §Out of Scope, token issuance is NOT delivered by SPEC-02-PHASE2's ticket decomposition, so 005's Deps remains unchanged.
- Editing `tickets/SPEC03PATENG-006.md`. Per SPEC-02-PHASE2 §Blocks, 006's per-op unit tests don't require the extended `allocate_next_id`; its runtime consumption is caught via 009 (the integration capstone). 006's Deps remains unchanged.
- Updating `specs/IMPLEMENTATION-ORDER.md` to cross-reference this batch's tickets — that is a separate IMPLEMENTATION-ORDER maintenance concern, not a cross-ticket Deps update.
- Editing this spec's own tickets (SPEC02PHA2TOO-001..004) to add SPEC03PATENG-009 as a downstream — this ticket only documents the 009-side dependency; the SPEC02PHA2TOO tickets need no reciprocal edit.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "archive/tickets/SPEC02PHA2TOO-001.md\|SPEC02PHA2TOO-002\|SPEC02PHA2TOO-003" tickets/SPEC03PATENG-009.md` returns ≥3 matches on `**Deps**:` line 7.
2. `grep -n "SPEC03PATENG-007" tickets/SPEC03PATENG-009.md` still returns ≥1 match on line 7 (existing transitive-head anchor preserved).
3. `git diff tickets/SPEC03PATENG-005.md` returns empty (005 NOT edited).
4. `git diff tickets/SPEC03PATENG-006.md` returns empty (006 NOT edited).
5. `grep -n "SPEC02PHA2TOO" tickets/SPEC03PATENG-*.md` returns matches ONLY in `tickets/SPEC03PATENG-009.md` (no accidental cross-refs elsewhere).

### Invariants

1. 009's existing SPEC03PATENG-007 transitive-head reference is preserved — not replaced.
2. 005 and 006 are untouched by this ticket — only 009 is modified.
3. The cross-reference direction is one-way: 009 (the consumer) gains Deps on 001/002/003 (the prerequisites). The prerequisite tickets do NOT gain reciprocal Deps on 009.
4. Rule-5 bidirectional visibility is achieved: tickets 001/002/003 already declare Blocks context via SPEC-02-PHASE2's Blocks section prose; 009 now declares the reciprocal Deps at the machine-readable ticket-metadata level.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "Deps" tickets/SPEC03PATENG-009.md` — expect the line-7 match including all three new ticket IDs.
2. `grep -c "SPEC02PHA2TOO-00[123]" tickets/SPEC03PATENG-009.md` — expect 3, with ticket 001 represented as `archive/tickets/SPEC02PHA2TOO-001.md`.
3. `git diff --stat tickets/SPEC03PATENG-005.md tickets/SPEC03PATENG-006.md tickets/SPEC03PATENG-009.md` — expect modifications ONLY in 009; 005 and 006 must show zero changes.
