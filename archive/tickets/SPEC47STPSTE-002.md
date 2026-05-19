# SPEC47STPSTE-002: Update record-class inventory + backfill FOUNDATIONS §Story Bundles §6

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `.claude/skills/_shared-templates/story-state-contract.md` §3 record-class inventory and `docs/FOUNDATIONS.md` §Story Bundles §6 (Story-Bundle ID Classes); no code changes
**Deps**: None

## Problem

SPEC-47 introduces two new active record classes (`STPLAN`, `STEMO`). Both must be added to the canonical record-class inventory at story-state-contract.md §3 (consumed by every story-pipeline skill at pre-flight) and to FOUNDATIONS.md §Story Bundles §6 (the project-wide design contract enumerating story-bundle ID classes). FOUNDATIONS §6 also carries pre-existing drift inherited from SPEC-42 (missing `CLK`, `STSEC`, `STQ`) and SPEC-38 (missing story-local `DA`) — SPEC-47 D-A3b opportunistically backfills these 4 missing classes in one pass so the canonical FOUNDATIONS list reflects the actual set of story-bundle record classes after this spec lands (post-SPEC-47 should list 23 classes: 17 existing + 4 backfill + 2 new = 23).

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `.claude/skills/_shared-templates/story-state-contract.md` §3 currently lists 24 record classes (20 core page-cycle state records + 4 auxiliary: SLB, SAU, SP, RSP), per the reassess-spec session's earlier verification (line count 428 lines on the contract; §3 record class inventory at lines starting around line 27). Verified `docs/FOUNDATIONS.md` §Story Bundles §6 currently lists exactly 17 classes (STENT, STSTAT, SF, BEL, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, SLT, SLB) and is missing CLK/STSEC/STQ/story-local DA per the reassess-spec I3 finding.
2. Verified SPEC-47 §Approach §A specifies adding STPLAN/STEMO to story-state-contract §3 inventory (D-A3) and FOUNDATIONS §6 (D-A3b added by reassessment); D-A3b also enumerates the backfill scope (CLK + STSEC + STQ from SPEC-42; story-local DA from SPEC-38).
3. Cross-skill boundary under audit: FOUNDATIONS.md is the project-wide design contract (consumed by every meta-tooling skill and indirectly by every canon-pipeline-adjacent skill); story-state-contract.md is the shared contract for the seven Skill Category 2c story-pipeline skills. Both surfaces are normative; drift on either causes downstream skills to operate against stale assumptions about which classes exist.
4. FOUNDATIONS §Story Bundles §6 (Story-Bundle ID Classes) — the canonical enumeration of per-bundle ID classes used by `mcp__worldloom__allocate_next_id` and by every story-bundle-scoped allocator. Adding STPLAN/STEMO + backfilling the 4 missing classes restores §6 to truthfulness relative to the actual record-class set after SPEC-47 lands.

## Architecture Check

1. The §3 inventory and §6 list are paired contracts — same record-class semantic, two reader audiences (skills via story-state-contract; FOUNDATIONS readers via design-doc surface). Keeping them synchronized in one ticket prevents the audit-trail-defect failure mode where §3 is updated and §6 silently drifts (the failure mode the reassess-spec I3 finding surfaced). Both edits land together or neither.
2. No backwards-compatibility aliasing/shims introduced — additions only. The backfill of CLK/STSEC/STQ/story-local DA is documentation drift correction, not retcon (those classes have been live since SPEC-42 / SPEC-38; FOUNDATIONS §6 simply never reflected them).

## Verification Layers

1. story-state-contract.md §3 record-class inventory contains STPLAN and STEMO entries → codebase grep-proof for the new table rows after edit lands
2. FOUNDATIONS.md §Story Bundles §6 enumeration contains all 23 classes (17 existing + 4 backfill + 2 new) → codebase grep-proof + manual count
3. Cross-skill boundary preserved: §3 existing 24 entries are unchanged (only STPLAN + STEMO appended); §6 existing 17 entries are unchanged (only CLK + STSEC + STQ + story-local DA + STPLAN + STEMO appended) → codebase grep-proof of each existing class name

## What to Change

### 1. Add STPLAN and STEMO to story-state-contract.md §3 record-class inventory

Append two rows to the "Core page-cycle state records" table:

```text
| `STPLAN` | Actor-owned tactical plan over multiple pages; carries belief basis, resource basis, blockers, current step, fallback steps. |
| `STEMO` | Actor-owned transient affective state; carries closed-enum affect_kind, intensity, behavioral_pressure, appraisal basis. |
```

### 2. Update FOUNDATIONS.md §Story Bundles §6 (Story-Bundle ID Classes)

Replace the current per-bundle records enumeration with the post-SPEC-47 list. Current text:

```text
Per-bundle records include STENT, STSTAT, SF, BEL, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, SLT, and SLB.
```

Replace with:

```text
Per-bundle records include STENT, STSTAT, SF, BEL, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, CLK, STSEC, STQ, DA (story-local), BR, PG, CHC, SLT, STPLAN, STEMO, and SLB.
```

(The 4 backfill classes — CLK, STSEC, STQ, story-local DA — close pre-existing drift inherited from archived SPEC-42 and SPEC-38; STPLAN and STEMO are the SPEC-47 additions.)

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `docs/FOUNDATIONS.md` (modify)

## Out of Scope

- Schema content for STPLAN and STEMO — covered by ticket 001.
- Per-class auxiliary records (SLB, SAU, SP, RSP) are unchanged.
- Other FOUNDATIONS §Story Bundles subsections (§5a, §5b, §5c, §6a, §6b, §7, §8, §9) are unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c "^| \`ST\(PLAN\|EMO\)\`" .claude/skills/_shared-templates/story-state-contract.md` returns 2.
2. `awk '/^### 6\. Story-Bundle ID Classes/,/^### 6a\./' docs/FOUNDATIONS.md | grep -oE "STPLAN|STEMO|CLK|STSEC|STQ" | sort -u | wc -l` returns 5 (the 5 newly-listed class names).
3. Manual review confirms the FOUNDATIONS §6 enumeration lists all 23 classes in a single coherent sentence.

### Invariants

1. Existing story-state-contract.md §3 entries (24 records: 20 core + 4 auxiliary) are unchanged.
2. Existing FOUNDATIONS §Story Bundles §6 prose around the per-bundle records sentence (the §STORY-<integer>, allocation routing, §6a, §6b context) is unchanged — only the per-bundle records enumeration sentence is replaced.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `awk '/^## 3\. Record Class Inventory/,/^## 4\. Record Schemas/' .claude/skills/_shared-templates/story-state-contract.md | grep -c "^| \`[A-Z]"` (returns 26 = original 24 + STPLAN + STEMO)
2. `awk '/^### 6\. Story-Bundle ID Classes/,/^### 6a\./' docs/FOUNDATIONS.md | grep -oE "STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|CLK|STSEC|STQ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|SLB" | sort -u | wc -l` (returns 23)
3. `grep -nE "STPLAN|STEMO" docs/FOUNDATIONS.md` (returns matches only inside §Story Bundles §6, no spurious matches elsewhere)

## Outcome

Completed: 2026-05-19.

- Added `STPLAN` and `STEMO` rows to `.claude/skills/_shared-templates/story-state-contract.md` §3 as core page-cycle state records.
- Updated `docs/FOUNDATIONS.md` §Story Bundles §6 to enumerate the post-SPEC-47 per-bundle record set: the 17 existing classes, the inherited `CLK` / `STSEC` / `STQ` / story-local `DA` backfill, and the new `STPLAN` / `STEMO` classes.
- Left the surrounding allocation-route prose, §6a, and §6b unchanged.

## Verification Result

1. `awk '/^## 3\. Record Class Inventory/,/^## 4\. Record Schemas/' .claude/skills/_shared-templates/story-state-contract.md | grep -c '^| `[A-Z]'` returned `26`.
2. `awk '/^### 6\. Story-Bundle ID Classes/,/^### 6a\./' docs/FOUNDATIONS.md | grep -oE 'STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|CLK|STSEC|STQ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|SLB' | sort -u | wc -l` returned `23`.
3. `grep -nE 'STPLAN|STEMO' docs/FOUNDATIONS.md` returned only the §Story Bundles §6 per-bundle records sentence.

## Deviations

- None. This ticket remained documentation/contract-only; JSON schemas, patch-engine wiring, validators, predicate/tag grammar, MCP summaries, world-index edges, page-plan sections, and downstream skill prose remain with the active follow-up tickets named in the SPEC-47 queue.
