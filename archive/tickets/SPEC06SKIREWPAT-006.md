# SPEC06SKIREWPAT-006: canon-facts-from-diegetic-artifacts — pre-flight migration

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md` rewritten; pre-flight world-state load via `get_context_packet`; proposal cards and INDEX.md remain direct-Edit on hybrid files (Hook 3 hybrid-file allowlist)
**Deps**: None — SPEC-01..SPEC-05 Part B + SPEC-13 + SPEC-14 archived. Independent of sibling tickets. Same pattern as SPEC06SKIREWPAT-005 (propose-new-canon-facts) and SPEC06SKIREWPAT-004 (diegetic-artifact-generation).

## Problem

`canon-facts-from-diegetic-artifacts/SKILL.md` (156 lines) mines existing diegetic artifacts for candidate canon facts, emitting proposal cards directly consumable by canon-addition. It currently reads world state via inherited "Large-file method" patterns and writes proposal cards via direct `Write`. Per SPEC-06 §Migration plan canon-facts-from-diegetic-artifacts subsection (line 171: "same pattern as propose-new-canon-facts"), pre-flight load shifts to `mcp__worldloom__get_context_packet(task_type='canon-facts-from-diegetic-artifacts', ...)`; writes to `proposals/PR-NNNN-*.md` STAY direct-Edit (Hook 3 hybrid-file allowlist).

Target: SKILL.md ~120 lines.

## Assumption Reassessment (2026-04-26)

1. Current `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md` (156 lines) references retired monolithic files; uses inherited "Large-file method" pattern. The retired files are gone post-SPEC-13.
2. SPEC-06 §Migration plan subsection (line 171) prescribes "same pattern as propose-new-canon-facts" with target 156 → ~120 lines.
3. Cross-skill / cross-artifact boundary: this skill READS existing diegetic artifacts (`worlds/<slug>/diegetic-artifacts/<da-slug>.md`) — hybrid files — and EMITS proposal cards (`proposals/PR-NNNN-*.md`). The diegetic-to-world laundering firewall is the load-bearing semantic boundary.
4. FOUNDATIONS principles under audit: **Rule 6 (No Silent Retcons)** — diegetic-to-world laundering firewall prevents narrator-voice claims from being inflated into world-level canon without explicit `source_basis.derived_from` attribution to the source DA. Firewall judgment STAYS in-skill (semantic).
5. **Contradiction segregation**: contradictions between artifact claims and existing canon are NOT emitted as proposal cards — they are segregated into a `flagged-contradictions` list and handed off to `continuity-audit` (per CLAUDE.md §Skill Architecture). This routing logic STAYS in-skill.

## Architecture Check

1. Thin-orchestrator pattern: pre-flight allocates `PR-NNNN`, `BATCH-NNNN` via `allocate_next_id`; `get_context_packet(task_type='canon-facts-from-diegetic-artifacts', seed_nodes=[<source-DA>, <related-CFs>], token_budget=12000)` provides context; claim-extraction phase (parse narrator voice; classify each claim as world-level / narrator-belief / propagandistic / unreliable per the source artifact's `world_relation` block) retains judgment; diegetic-to-world laundering firewall judgment retains judgment; contradiction segregation logic retains judgment; cards composed; HARD-GATE before write; direct-Edit of card + batch + index files.
2. No backwards-compatibility shims.

## Verification Layers

1. Pre-flight uses MCP retrieval → grep-proof: skill text uses MCP tools, not raw `Read` of `_source/`
2. Direct-Edit on hybrid files succeeds → Hook 3 trace: `proposals/`, `audits/` allowed; `_source/*.yaml` blocked
3. Diegetic-to-world firewall preserved → manual review: emitted cards include `source_basis.derived_from` attribution to the source DA; narrator-voice claims that should NOT become world canon are excluded with a one-line rationale in the batch manifest
4. Contradiction segregation correct → manual review: flagged contradictions are routed to a `flagged-contradictions.md` file (or batch-manifest section) for `continuity-audit` consumption, not emitted as proposal cards

## What to Change

### 1. Rewrite SKILL.md as thin orchestrator (target ~120 lines)

Replace pre-flight world-state load with `allocate_next_id` + `get_context_packet`. Drop §World-State Prerequisites file enumeration referencing retired monolithic files.

### 2. Preserve claim extraction + laundering firewall

Phase: parse the source diegetic artifact (`worlds/<slug>/diegetic-artifacts/<da-slug>.md`) into claims; classify each claim by `world_relation` block (world_level / narrator_belief / propagandistic / unreliable) inherited from the source artifact's truth-status discipline (per SPEC06SKIREWPAT-004); the laundering firewall is: only `world_level` claims may become candidate proposal cards; `narrator_belief` / `propagandistic` / `unreliable` claims are excluded with a one-line rationale. STAYS in-skill.

### 3. Preserve contradiction segregation

When an extracted claim contradicts existing canon, the claim is NOT emitted as a proposal card. Instead, it's added to a `flagged-contradictions` list in the batch manifest with the contradicting CF cited; `continuity-audit` later examines and may produce a retcon-proposal if appropriate. STAYS in-skill.

### 4. Card composition

Each proposal card carries `source_basis.derived_from: [DA-NNNN]` attribution + the standard frontmatter shape from SPEC06SKIREWPAT-005 (`pr_id`, `topic`, `angle`, `canon_safety_check`).

### 5. HARD-GATE → direct-Edit batch

Present batch summary (cards + flagged contradictions) to user; user approves; skill writes via direct-Edit.

## Files to Touch

- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md` (modify — rewrite ~156 → ~120 lines)
- `.claude/skills/canon-facts-from-diegetic-artifacts/references/` (modify — refresh retrieval-mechanism files)
- `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md` (if exists; otherwise inherit from sibling)

## Out of Scope

- Migration of OTHER skills
- Engine-routed proposal-card writes (proposals stay direct-Edit)
- Proposal-card schema changes
- continuity-audit changes for flagged-contradictions consumption (SPEC06SKIREWPAT-008 owns)
- Token-reduction measurement (SPEC06SKIREWPAT-009)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run mining a diegetic artifact on animalia: pre-flight uses `allocate_next_id` + `get_context_packet`; zero raw `Read` of `_source/`; HARD-GATE fires before write.
2. Direct-Edit on `proposals/` succeeds; direct-Edit on `_source/` from within this skill is blocked.
3. Diegetic-to-world firewall: synthetic test where a `propagandistic` narrator claim would otherwise become a proposal card; skill excludes it with rationale.
4. Contradiction segregation: synthetic test where an extracted claim contradicts an existing CF; skill routes it to flagged-contradictions, not to a proposal card.
5. Emitted cards carry `source_basis.derived_from: [DA-NNNN]` attribution.

### Invariants

1. HARD-GATE absoluteness.
2. Hybrid-file write discipline: only `proposals/` paths.
3. Diegetic-to-world firewall: no silent elevation of narrator claims.
4. Contradiction segregation: contradictions never become silent proposal cards.

## Test Plan

### New/Modified Tests

1. `None — skill rewrite; verification is skill-dry-run + Hook 3 trace command-based.`

### Commands

1. `cd tools/world-mcp && npm test` — confirm MCP retrieval surface unchanged
2. `cd tools/hooks && npm test` — confirm Hook 3 unchanged
3. Manual skill dry-run mining a test diegetic artifact on animalia; review claim extraction + laundering firewall + contradiction segregation. Manual review is the correct boundary for narrator-voice analysis.
