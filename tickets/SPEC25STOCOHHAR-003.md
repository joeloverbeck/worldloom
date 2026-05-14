# SPEC25STOCOHHAR-003: STSTAT skill integration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies four story-pipeline skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`, `branching-story-prose-attach`); no tool / schema change.
**Deps**: archive/tickets/SPEC25STOCOHHAR-001.md, SPEC25STOCOHHAR-002

## Problem

With the `STSTAT` record class defined (SPEC25STOCOHHAR-001) and replay-enforced (SPEC25STOCOHHAR-002), the four story-pipeline skills that produce or consume page snapshots must emit `STSTAT` records and stop authoring `entity_status` directly. Until they do, the new replay enforcement has nothing to verify against — the machine layer is live but unused by the skills.

## Assumption Reassessment (2026-05-14)

1. `branching-story-bootstrap` builds `PG-1` and seeds the initial cast; `branching-story-turn-cycle` advances pages and currently authors `entity_status` directly; `branching-story-health-audit`'s structural sub-phase relies on `snapshot_replay_equality`; `branching-story-prose-attach`'s `entity_status_consistency` deterministic check reads "plan §5 entity statuses" and `STENT.entity_status` (`branching-story-prose-attach/SKILL.md:134`, `:180`). All four are Skill Category 2c per FOUNDATIONS §Story Bundles §7.
2. SPEC-25 D1 §Skills prescribes the four skill changes (bootstrap emits one `STSTAT` per active `STENT` at `PG-1`; turn-cycle supersedes `STSTAT` on status change and includes ids in `SE.state_delta`; health-audit replay now covers `entity_status`; prose-attach's `entity_status_consistency` reads the `STSTAT`-derived projection). This work depends on the class existing (SPEC25STOCOHHAR-001) and the replay derivation landing (SPEC25STOCOHHAR-002).
3. Cross-skill boundary under audit: the `PG.state_snapshot` schema (shared story state contract §4.2, as amended by SPEC25STOCOHHAR-002) and the `entity_status`-derived-projection contract — shared across all four skills that read or write page snapshots.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): the page snapshot remains the fork primitive; emitting one `STSTAT` per active `STENT` keeps every committed page replayable from any committed parent.
5. Rename awareness: SPEC25STOCOHHAR-002 renames the `entity_status` predicate argument `axis`→`field`. `branching-story-prose-attach` SKILL.md:173 lists `entity_status(` as an engine-jargon-leak literal — that literal names the predicate, not its argument, so the rename requires no prose-attach literal-list edit. No skill-side rename fallout.

## Architecture Check

1. `STSTAT` emission lives in the skills that already own page-snapshot construction (`branching-story-bootstrap`, `branching-story-turn-cycle`) — no new skill, no new orchestration layer. `entity_status` becomes read-only derived state everywhere it is consumed.
2. No shims: `branching-story-turn-cycle` stops authoring `entity_status` outright rather than writing both the block and the `STSTAT` records during a transition period.

## Verification Layers

1. `branching-story-bootstrap` emits one `STSTAT` per active `STENT` at `PG-1` -> skill dry-run: inspect the `PG-1` plan + the patch plan for one `create_ststat_record` per active `STENT`.
2. `branching-story-turn-cycle` supersedes the affected `STSTAT` on death / captivity / movement and includes the ids in `SE.state_delta` -> skill dry-run on a status-change event.
3. `branching-story-health-audit`'s structural replay covers `entity_status` -> skill dry-run against a fixture bundle (relies on SPEC25STOCOHHAR-002's strengthened `snapshot_replay_equality`).
4. `branching-story-prose-attach`'s `entity_status_consistency` reads the `STSTAT`-derived projection -> manual review of the revised SKILL.md check description.

## What to Change

### 1. branching-story-bootstrap

When building `PG-1`: emit one `STSTAT` per active `STENT`, include them in `PG.state_snapshot.active_records` and in `SE.state_delta.create`. `entity_status` is the derived projection, not authored.

### 2. branching-story-turn-cycle

On death / captivity / incapacity / unconsciousness / escape / concealment / movement: supersede the affected `STSTAT` and include the ids in `SE.state_delta`. Stop authoring `entity_status` directly anywhere in the skill.

### 3. branching-story-health-audit

Note that the structural sub-phase's replay now covers `entity_status` via the strengthened `snapshot_replay_equality` — a dependency note, no procedural change to the audit's own logic.

### 4. branching-story-prose-attach

Update the `entity_status_consistency` receipt-check description so it reads the `STSTAT`-derived projection rather than an independently-authored `entity_status` block. The check's pass / warn / fail algorithm is unchanged; only the source of the entity-status data changes.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- The `STSTAT` schema / machine layer — archive/tickets/SPEC25STOCOHHAR-001.md.
- The replay validator logic (`snapshot_replay_equality`, `ACTIVE_RECORDS_CLASSES`) — SPEC25STOCOHHAR-002.
- Any change to the `entity_status_consistency` *algorithm* beyond pointing it at the derived projection.
- `SF.authority`, `OBL` / `CNSQ` `urgency`, predicate DSL v2, `CHC.grounded_in` — separate deliverables.

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: `branching-story-bootstrap` on a representative premise emits one `create_ststat_record` per active `STENT` in the `PG-1` patch plan.
2. Skill dry-run: `branching-story-turn-cycle` on a death event supersedes the dead entity's `STSTAT` and lists the id in `SE.state_delta`.
3. `grep -rn "entity_status" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` shows only derived-projection / read references — no instruction to author `entity_status` as an independent block.

### Invariants

1. Every active `STENT` on every committed page has exactly one active `STSTAT` record.
2. No story skill authors `entity_status` directly; it is always the derived projection of active `STSTAT` records.

## Test Plan

### New/Modified Tests

None — skill-prose ticket (no automated test files change); verification is skill dry-run + grep-proof, and the strengthened structural-replay coverage that backs this ticket is the `snapshot-replay-equality` test added in SPEC25STOCOHHAR-002, named in Assumption Reassessment item 3.

### Commands

1. Skill dry-run of `branching-story-bootstrap` and `branching-story-turn-cycle` (invoke via the `Skill` tool, inspect emitted plans / patch plans, do not commit).
2. `grep -rn "entity_status" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md`
3. Skill dry-runs are the correct verification boundary — story-pipeline skills have no unit-test harness; the structural correctness of the emitted `STSTAT` records is covered by SPEC25STOCOHHAR-001's and SPEC25STOCOHHAR-002's validator tests.
