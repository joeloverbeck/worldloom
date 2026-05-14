# SPEC25STOCOHHAR-003: STSTAT skill integration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies four story-pipeline skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`, `branching-story-prose-attach`); no tool / schema change.
**Deps**: archive/tickets/SPEC25STOCOHHAR-001.md, archive/tickets/SPEC25STOCOHHAR-002.md

## Problem

At intake, with the `STSTAT` record class defined (archive/tickets/SPEC25STOCOHHAR-001.md) and replay-enforced (archive/tickets/SPEC25STOCOHHAR-002.md), the four story-pipeline skills that produce or consume page snapshots still needed to emit `STSTAT` records and stop authoring `entity_status` directly. Until they did, the new replay enforcement had nothing skill-authored to verify against — the machine layer was live but unused by the skills.

## Assumption Reassessment (2026-05-14)

1. At intake, `branching-story-bootstrap` built `PG-1` and seeded the initial cast; `branching-story-turn-cycle` advanced pages and still routed life / agency / location status through `STENT` / `entity_status` wording; `branching-story-health-audit`'s structural sub-phase relied on `snapshot_replay_equality`; `branching-story-prose-attach`'s `entity_status_consistency` deterministic check read "plan §5 entity statuses" and `STENT.entity_status` (`branching-story-prose-attach/SKILL.md:134`, `:180`). All four are Skill Category 2c per FOUNDATIONS §Story Bundles §7.
2. SPEC-25 D1 §Skills prescribes the four skill changes (bootstrap emits one `STSTAT` per active `STENT` at `PG-1`; turn-cycle supersedes `STSTAT` on status change and includes ids in `SE.state_delta`; health-audit replay now covers `entity_status`; prose-attach's `entity_status_consistency` reads the `STSTAT`-derived projection). This work depends on the class existing (archive/tickets/SPEC25STOCOHHAR-001.md) and the replay derivation landing (archive/tickets/SPEC25STOCOHHAR-002.md).
3. Cross-skill boundary under audit: the `PG.state_snapshot` schema (shared story state contract §4.2, as amended by archive/tickets/SPEC25STOCOHHAR-002.md) and the `entity_status`-derived-projection contract — shared across all four skills that read or write page snapshots.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): the page snapshot remains the fork primitive; emitting one `STSTAT` per active `STENT` keeps every committed page replayable from any committed parent.
5. Rename awareness: archive/tickets/SPEC25STOCOHHAR-002.md renames the `entity_status` predicate argument `axis`→`field`. `branching-story-prose-attach` SKILL.md:173 lists `entity_status(` as an engine-jargon-leak literal — that literal names the predicate, not its argument, so the rename requires no prose-attach literal-list edit. No skill-side rename fallout.
6. Verification boundary correction: the drafted skill dry-runs require invoking the target story skills through a Skill tool, but this Codex session has no executable story-skill runner. Because this ticket changes workflow prose rather than package code, the truthful proof surface is manual contract review plus grep/stale-anchor checks over the four edited skills. The validator/package-backed structural proof remains the completed `snapshot-replay-equality` coverage from archive/tickets/SPEC25STOCOHHAR-002.md.

## Architecture Check

1. `STSTAT` emission lives in the skills that already own page-snapshot construction (`branching-story-bootstrap`, `branching-story-turn-cycle`) — no new skill, no new orchestration layer. `entity_status` becomes read-only derived state everywhere it is consumed.
2. No shims: `branching-story-turn-cycle` stops authoring `entity_status` outright rather than writing both the block and the `STSTAT` records during a transition period.

## Verification Layers

1. `branching-story-bootstrap` emits one `STSTAT` per active `STENT` at `PG-1` -> manual contract review of the bootstrap output table, allocation step, `SE-1.state_delta.create`, `PG-1.state_snapshot`, and patch-plan op list.
2. `branching-story-turn-cycle` supersedes the affected `STSTAT` on death / captivity / movement and includes the ids in `SE.state_delta` -> manual contract review of the turn-cycle output table, Phase 3 delta rules, `SE.state_delta`, `PG.state_snapshot`, and patch-plan op list.
3. `branching-story-health-audit`'s structural replay covers `entity_status` -> manual review of Phase 2a replay wording plus dependency on SPEC25STOCOHHAR-002's strengthened `snapshot_replay_equality`.
4. `branching-story-prose-attach`'s `entity_status_consistency` reads the `STSTAT`-derived projection -> manual review of the revised SKILL.md check description.

## Landed Changes

### 1. branching-story-bootstrap

When building `PG-1`, the skill now emits one `STSTAT` per active `STENT`, allocates STSTAT ids, includes those records in `SE-1.state_delta.create`, includes the STSTAT key in `PG-1.state_snapshot.active_records`, and states that `entity_status` is the derived projection rather than an independent authored block. Its patch-plan op list now names `create_ststat_record`.

### 2. branching-story-turn-cycle

On death / captivity / incapacity / unconsciousness / escape / concealment / movement, the skill now supersedes the affected active `STSTAT`, records the old id in `SE.state_delta.supersede` and the new id in `SE.state_delta.create`, and recomputes `PG.state_snapshot.entity_status` from active `STSTAT` records. It no longer routes life / agency / location changes through `STENT`.

### 3. branching-story-health-audit

The structural replay phase now states that replay includes `entity_status` through the active `STSTAT` projection enforced by `snapshot_replay_equality`, and the record inventory includes `STSTAT`.

### 4. branching-story-prose-attach

The `entity_status_consistency` receipt-check description now reads the `STSTAT`-derived projection from `PG.state_snapshot` rather than an independently-authored `entity_status` block. The pass / warn / fail algorithm is unchanged; only the source of the entity-status data changed.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- The `STSTAT` schema / machine layer — archive/tickets/SPEC25STOCOHHAR-001.md.
- The replay validator logic (`snapshot_replay_equality`, `ACTIVE_RECORDS_CLASSES`) — archive/tickets/SPEC25STOCOHHAR-002.md.
- Any change to the `entity_status_consistency` *algorithm* beyond pointing it at the derived projection.
- `SF.authority`, `OBL` / `CNSQ` `urgency`, predicate DSL v2, `CHC.grounded_in` — separate deliverables.

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review: `branching-story-bootstrap` output/allocation/delta/snapshot/patch-plan prose emits one `create_ststat_record` per active `STENT` in the `PG-1` patch plan.
2. Manual contract review: `branching-story-turn-cycle` status-change prose supersedes the affected `STSTAT`, records the old/new ids through `SE.state_delta`, and does not route status through `STENT`.
3. The stale-anchor `rg` command in the Test Plan returns no hits for legacy `STENT.entity_status`, `STENT` status-supersession, old snapshot wording, or invalid `STSTAT-<integer>+1` example wording.
4. `rg -n 'create_ststat_record|STSTAT|entity_status' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` shows only the landed STSTAT/projection references.

### Invariants

1. Every active `STENT` on every committed page has exactly one active `STSTAT` record.
2. No story skill authors `entity_status` directly; it is always the derived projection of active `STSTAT` records.

## Test Plan

### New/Modified Tests

None — skill-prose ticket (no automated test files change); verification is manual contract review + grep-proof, and the strengthened structural-replay coverage that backs this ticket is the `snapshot-replay-equality` test added in archive/tickets/SPEC25STOCOHHAR-002.md, named in Assumption Reassessment item 3.

### Commands

1. Manual review of `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, and `.claude/skills/branching-story-prose-attach/SKILL.md`.
2. Stale-anchor check:
   ```bash
   if rg -n 'STENT\.entity_status|via `STENT` supersession|entity_status per active STENT|active_records including the BEL key|STSTAT-<integer>\+1' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md; then exit 1; fi
   ```
3. `rg -n 'create_ststat_record|STSTAT|entity_status' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md`
4. `git diff --check`

## Outcome

Completed on 2026-05-14. The four target story-pipeline skills now treat entity life / agency / location as `STSTAT`-backed state: bootstrap creates the initial active statuses, turn-cycle supersedes statuses on status changes, health-audit replay points at the `STSTAT` projection, and prose-attach checks rendered prose against the `STSTAT`-derived projection.

## Verification Result

- PASS: manual review of the four edited skill files confirms bootstrap/turn-cycle producer wording and health-audit/prose-attach consumer wording match the shared `STSTAT` projection contract.
- PASS: stale-anchor check returned no stale-authoring hits:
  ```bash
  if rg -n 'STENT\.entity_status|via `STENT` supersession|entity_status per active STENT|active_records including the BEL key|STSTAT-<integer>\+1' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md; then exit 1; fi
  ```
- PASS: `rg -n 'create_ststat_record|STSTAT|entity_status' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/branching-story-prose-attach/SKILL.md` shows the landed STSTAT/projection references.
- PASS: `git diff --check`

## Deviations

- The drafted skill dry-runs were not executable in this Codex session because no story-skill runner / Skill tool is exposed. Verification used the truthful prose-ticket boundary: manual contract review plus grep/stale-anchor proof over the edited skills.
