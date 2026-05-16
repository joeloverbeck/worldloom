# SPEC33STOPIPSEV-009: Adjudicate "now landed" integration-debt claims with archived-ticket links

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — skill-prose updates across 4 consuming skills, 18 sites total; no tool/validator/patch-engine changes.
**Deps**: None

## Problem

Multiple skills cite ticket IDs (PEENH-007, PEENH-008, MCPENH-040, MCPENH-041, VALENH-011) as "now landed" without linking to a verification artifact. A future audit cannot validate the landed claim without external research, and a future drift (e.g., a tool re-rolled under a different name) would not be flagged. Per SPEC-33 §D9, every "now landed" claim must link to a specific archived ticket path (option a), archived spec section (option b), or be replaced with a runtime `describe_capabilities` check (option c). Codebase verification confirms all 5 referenced IDs have archived ticket files — so D9 routing is **option (a)** for every claim across all 18 sites.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of archived tickets**: live `ls archive/tickets/` confirms all five referenced IDs have archived ticket files:
   - `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md`
   - `archive/tickets/MCPENH-041-rename-legacy-story-pipeline-task-types.md`
   - `archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`
   - `archive/tickets/PEENH-008-add-create-da-record-patch-op.md`
   - `archive/tickets/VALENH-011-register-bel-record-schema-compliance-and-drop-arc-trace-validators.md`
2. **Site enumeration** (resolves SPEC-33 §Risks "D9 site enumeration" open question): live grep across the seven consuming story-pipeline skills returns 18 sites in 4 skills (the other 3 — `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach` — have zero "now landed" claims):
   - `commitment-block-authoring/SKILL.md` lines 357, 358, 359, 360 — 4 sites (MCPENH-041, MCPENH-040, PEENH-007, VALENH-011)
   - `branching-story-health-audit/SKILL.md` lines 473, 474, 475, 476 — 4 sites (MCPENH-040, PEENH-007, VALENH-011, MCPENH-041)
   - `story-fact-promotion-to-canon/SKILL.md` lines 382, 383, 384, 385 — 4 sites (MCPENH-040, PEENH-007, VALENH-011, MCPENH-041)
   - `story-promotion-closeout/SKILL.md` line 297 (inline PEENH-007 citation in Phase 5 op list text) + lines 370, 371, 372, 373, 374 — 6 sites (PEENH-007 inline, then MCPENH-040, PEENH-007, VALENH-011, PEENH-008, MCPENH-041)
3. **Specs/docs cross-reference**: SPEC-33 §D9 names the canonical fix (archived-ticket links per option a); the 5 archived ticket paths exist for every cited ID, so options (b) and (c) are not needed.
4. **Cross-skill boundary**: the shared boundary under audit is the integration-debt note convention across the 4 consuming skills. Each skill's "Known integration debt" block (typically a short bulleted list naming MCPENH-* / PEENH-* / VALENH-* IDs as "Now landed") must be converted to link each ID to its archived ticket path.
5. **FOUNDATIONS principle restatement**: §Canonical Storage Layer (audit-trail discipline — claims must link to verification artifacts). Today's prose grounds each claim in "verified at `tools/X`" — a real codebase path — but the auditor wants archived-ticket links because the codebase path could be renamed/refactored while the archived ticket remains a stable historical record.
6. **Same-file co-location with 004 and 005**: this ticket touches `story-promotion-closeout/SKILL.md` at line 297 (inline PEENH-007 citation in Phase 5 op list prose) and lines 370-374 (Known integration debt block). Per SPEC33STOPIPSEV-005's Out of Scope note, **005 must land first** because 005's Phase 5 op list change adds `create_ststat_record` to the op enumeration at line 297; this ticket's line 297 edit (replace "PEENH-007 inheritance — now landed" with "per archive/tickets/PEENH-007-...md") then applies to the modified line. Verified ordering captured in Test Plan command sequencing.

## Architecture Check

1. Archived-ticket links are the lower-cost audit-trail backstop the auditor's A11 proposed in heavier form (runtime `describe_capabilities` calls). Per SPEC-33's key design decision, the link form is sufficient under no-trust-deficit conditions; stronger drift constraints (future MCP-server major version) would justify capability calls. Cleaner than alternatives that would (a) add `describe_capabilities` to every skill's Pre-flight (heavyweight; bloats 4 skills' Pre-flight sections) or (b) leave the static prose claims without provenance (continues opaque audit trail).
2. No backwards-compatibility aliasing/shims introduced — the existing prose is replaced with archived-ticket links; no parallel legacy claim retained.

## Verification Layers

1. Every "now landed" / "Now landed" match across the 4 affected skills is followed by an `archive/tickets/` path → codebase grep-proof.
2. The 5 archived ticket files exist (unchanged precondition) → `test -f` per file.
3. Other 3 consuming skills (`bootstrap`, `turn-cycle`, `prose-attach`) remain unchanged (no "now landed" claims) → codebase grep-proof returns zero matches in those files.
4. Same-file co-location with 005: this ticket lands AFTER 005 (line 297 region in closeout) → landing-order discipline verified manually.

## What to Change

### 1. commitment-block-authoring SKILL.md (4 sites)

In `.claude/skills/commitment-block-authoring/SKILL.md` lines 357-360, replace each "Now landed" verification phrasing with an archived-ticket link. Example pattern for line 357 (MCPENH-041):

Replace:
```
- **MCPENH-041** (task_type rename: `storylet_pool_authoring` -> `commitment_block_authoring`) — **Now landed** (verified at `tools/world-mcp/src/ranking/profiles/index.ts`: `commitment_block_authoring` is registered in `TASK_TYPES`). Pre-flight step 6 uses `task_type='commitment_block_authoring'`.
```

with:
```
- **MCPENH-041** (task_type rename: `storylet_pool_authoring` -> `commitment_block_authoring`) — landed per `archive/tickets/MCPENH-041-rename-legacy-story-pipeline-task-types.md`. Pre-flight step 6 uses `task_type='commitment_block_authoring'`.
```

Apply the same pattern at lines 358 (MCPENH-040), 359 (PEENH-007), 360 (VALENH-011), substituting each archived ticket path. Preserve the contextual descriptive phrasing about how each landed feature is used by this skill (the trailing sentence after the dash); only the "Now landed (verified at tools/...)" parenthetical is replaced.

### 2. branching-story-health-audit SKILL.md (4 sites)

In `.claude/skills/branching-story-health-audit/SKILL.md` lines 473-476, apply the same pattern. Each line cites a different archived ticket (MCPENH-040, PEENH-007, VALENH-011, MCPENH-041).

### 3. story-fact-promotion-to-canon SKILL.md (4 sites)

In `.claude/skills/story-fact-promotion-to-canon/SKILL.md` lines 382-385, apply the same pattern. Each line cites a different archived ticket (MCPENH-040, PEENH-007, VALENH-011, MCPENH-041).

### 4. story-promotion-closeout SKILL.md (6 sites — 1 inline + 5 block)

Two distinct edit shapes in closeout:

**(a) Line 297 inline citation in Phase 5 op list prose** (post-SPEC33STOPIPSEV-005 line numbering may differ; locate by content):

Replace the inline phrase:
```
`create_bel_record` (via PEENH-007 inheritance — now landed)
```

with:
```
`create_bel_record` (via PEENH-007 inheritance per `archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md`)
```

**(b) Known-integration-debt block at lines 370-374** — five sites (MCPENH-040, PEENH-007, VALENH-011, PEENH-008, MCPENH-041). Apply the same archived-ticket-link replacement pattern as the other 3 skills.

### 5. Final cross-skill sweep

After all edits, run:
```
grep -rnE 'now landed|Now landed' .claude/skills/
```

Confirm every remaining match is immediately followed by `per archive/tickets/<filename>.md`. Any unprovenance'd "now landed" / "Now landed" claim is a miss and must be corrected before this ticket is considered complete.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — lines 357-360)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — lines 473-476)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — lines 382-385)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — line 297 inline + lines 370-374)

## Out of Scope

- The 5 archived ticket files (`archive/tickets/MCPENH-040-*.md`, `MCPENH-041-*.md`, `PEENH-007-*.md`, `PEENH-008-*.md`, `VALENH-011-*.md`) — already exist; not modified.
- The 3 consuming skills with zero "now landed" claims (`bootstrap`, `turn-cycle`, `prose-attach`) — not modified.
- Runtime `describe_capabilities` checks (option c in SPEC-33 §D9 — heavier discipline) — deferred per SPEC-33's key design decision; archived-ticket links are sufficient under current trust conditions.
- Other closeout SKILL.md changes (proposal-package paths, STSTAT propagation) — covered by SPEC33STOPIPSEV-004 (D4) and SPEC33STOPIPSEV-005 (D5). Same-file co-location: this ticket's line 297 edit must land AFTER 005's Phase 5 op list expansion.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rnE 'now landed|Now landed' .claude/skills/` returns matches that are each followed by `per archive/tickets/` (or `archive/tickets/`) — no bare claims remain.
2. `grep -c 'archive/tickets/' .claude/skills/commitment-block-authoring/SKILL.md` returns 4 (one per affected line).
3. `grep -c 'archive/tickets/' .claude/skills/branching-story-health-audit/SKILL.md` returns 4.
4. `grep -c 'archive/tickets/' .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns 4.
5. `grep -c 'archive/tickets/' .claude/skills/story-promotion-closeout/SKILL.md` returns 6 (one inline + five in the Known-integration-debt block).
6. `ls archive/tickets/{MCPENH-040,MCPENH-041,PEENH-007,PEENH-008,VALENH-011}-*.md` succeeds (sanity check: archived files unchanged).

### Invariants

1. Every "now landed" claim across the 4 affected skills links to a stable archived-ticket path under `archive/tickets/`.
2. The archived ticket files remain unchanged historical records.
3. The contextual descriptive phrasing about how each landed feature is used by the skill is preserved; only the "verified at tools/..." parenthetical is replaced.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rnE 'now landed|Now landed' .claude/skills/ | grep -v 'archive/tickets/'` — must return zero matches (every "now landed" claim is provenance-linked).
2. `grep -rn 'archive/tickets/(MCPENH-040|MCPENH-041|PEENH-007|PEENH-008|VALENH-011)' .claude/skills/` — must return 18 matches (4+4+4+6) across the 4 affected skills.
3. `ls archive/tickets/MCPENH-040*.md archive/tickets/MCPENH-041*.md archive/tickets/PEENH-007*.md archive/tickets/PEENH-008*.md archive/tickets/VALENH-011*.md` — all 5 files must exist.
4. A pipeline-wide grep is the right verification boundary because the discipline is cross-skill (all 4 skills must conform consistently); per-skill grep would miss inter-skill divergence.
