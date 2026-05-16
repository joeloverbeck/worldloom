# SPEC33STOPIPSEV-005: Propagate STSTAT closeout support through prerequisites / Phase 2 / Phase 3 / Phase 5

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/story-promotion-closeout/SKILL.md` skill-prose updates across 4 sections plus a SPEC-33 D5 implementation note; no patch-engine changes (`create_ststat_record` already exists).
**Deps**: None

## Problem

At intake, `.claude/skills/story-promotion-closeout/SKILL.md` output table listed STSTAT supersession as a closeout output kind: "IF a source STSTAT in the promotion's source-record set needs an amended-schema update after becoming canon-linked, such as character-outcome supersession-chain evidence." But STSTAT was omitted from:

- **World-State Prerequisites** (line ~137): lists "SF, BEL, STENT, SREL, DA, SE" as closeout output classes; STSTAT is absent.
- **Phase 2 `character_outcome` subsection** (line ~181): "For `source_kind: character_outcome`, supersede `STENT` only if a §4.5.1 field changes"; no STSTAT mention.
- **Phase 5 operation list** (line ~297): lists `create_sf_record`, `create_bel_record`, `create_stent_record`, `create_srel_record`, `append_story_diegetic_artifact_record`; `create_ststat_record` is absent.
- **Phase 3 disposition map template**: no STSTAT disposition value.

The patch engine already implemented `create_ststat_record` (verified at `tools/patch-engine/src/envelope/schema.ts:76` in `OPERATION_KINDS`, dispatch at `tools/patch-engine/src/ops/create-story-record.ts`). The gap was purely skill-prose propagation and is now closed.

## Assumption Reassessment (2026-05-16)

1. **Codebase verification of STSTAT gap**: live grep of `story-promotion-closeout/SKILL.md` confirms the output table at line 122 names STSTAT as a possible supersession output; the Prerequisites schema-list line at ~137 lists "SF, BEL, STENT, SREL, DA, SE" without STSTAT; Phase 2 character_outcome subsection at ~181 mentions only STENT supersession; Phase 5 op list at ~297 omits `create_ststat_record`. Live grep of `tools/patch-engine/src/envelope/schema.ts` confirms `create_ststat_record` exists at line 76 in `OPERATION_KINDS`.
2. **Specs/docs cross-reference**: SPEC-33 §D5 names the gap and the canonical fix; `_shared-templates/story-state-contract.md` §4.5.13 (STSTAT) defines the schema; FOUNDATIONS §5 grounds the `entity_status` derivation.
   - Closeout update: SPEC-33 now carries a D5 implementation note documenting the landed closeout skill changes and unchanged patch-engine boundary.
3. **Cross-skill boundary**: the shared boundary under audit is the patch-engine `OPERATION_KINDS` enum (in `tools/patch-engine/src/envelope/schema.ts`) and the story-state contract §4.5.13 STSTAT schema. Both are canonical and unchanged; the closeout's prose must reflect them.
4. **FOUNDATIONS principle restatement**: §4 Write Discipline (canon-addition outputs must be reflected in story-local records via the closeout's patch plan); §5 Validation Rules at Story Scope (STSTAT carries `entity_status` derivation). Closeout's role is to record canon-addition verdicts on story-local supersession-chain records; omitting STSTAT propagation leaves character-outcome canon-linking evidence incomplete.
5. **HARD-GATE / canon-write ordering**: closeout Phase 5's op list is the canon-write surface for the closeout patch plan; this ticket adds `create_ststat_record` to the enumerated ops alongside the existing STENT/SF/BEL/SREL/DA/SE ops. The Mystery Reserve firewall is not weakened — STSTAT carries `entity_status` derivation per story-state contract §4.5.13, not Mystery Reserve content; closeout's existing Phase 3 gate 6 disposition-completeness check continues to govern which records are superseded.

## Architecture Check

1. The additions propagate STSTAT consistently across all closeout phases that name supersession output classes — Prerequisites, Phase 2 character_outcome, Phase 3 disposition map, Phase 5 op list. Cleaner than alternatives that would (a) remove STSTAT from the output table at line 122 (would lose character-outcome supersession-chain evidence handling) or (b) leave the propagation gap (closeout would reject any proposal package with STSTAT in `source_records[]` due to disposition-incompleteness).
2. No backwards-compatibility aliasing/shims introduced — STSTAT is added to the existing closeout output discipline without legacy paths.

## Verification Layers

1. Closeout Prerequisites schema-list line names STSTAT → codebase grep-proof.
2. Closeout Phase 2 character_outcome subsection mentions STSTAT alongside STENT → codebase grep-proof.
3. Closeout Phase 3 disposition map template covers STSTAT → codebase grep-proof.
4. Closeout Phase 5 op list contains `create_ststat_record` → codebase grep-proof.
5. Patch-engine `create_ststat_record` exists and is unchanged → codebase grep-proof on `tools/patch-engine/src/envelope/schema.ts`.

## Landed Changes

### 1. World-State Prerequisites — add STSTAT to the schema-list line

In `.claude/skills/story-promotion-closeout/SKILL.md` §World-State Prerequisites, the schema-list reference now includes STSTAT and §4.5.13:

```
`.claude/skills/_shared-templates/story-state-contract.md` — §4 record
schemas (SF, BEL, STENT, STSTAT, SREL, DA, SE — closeout output classes for
superseded or audit-emitted records); §4.3a (audit-only SE events); §10
(shared write order); §4.5.13 (STSTAT — character-outcome supersession-chain
evidence).
```

### 2. Phase 2 `character_outcome` subsection — add STSTAT clause

Phase 2's `character_outcome` subsection now has an STSTAT clause adjacent to the existing STENT clause:

```
For `source_kind: character_outcome`, supersede `STENT` only if a §4.5.1
field changes; supersede `STSTAT` only if a source STSTAT in
`proposal_evidence.source_records[]` needs an amended-schema update after
the canon-addition verdict (e.g., character-outcome status evidence becoming
canon-linked, or explicitly retained as branch-local after rejection).
```

### 3. Phase 3 disposition map template — add STSTAT disposition values

The closeout ledger disposition template now includes STSTAT in the disposition value set:

```yaml
STSTAT-<integer>: superseded | ledger_only | unchanged_no_schema_field_changed
```

### 4. Phase 5 operation list — add `create_ststat_record`

Phase 5's operation list now includes `create_ststat_record`, limited to the case where a source STSTAT in `proposal_evidence.source_records[]` needs amended-schema supersession.

### 5. SPEC-33 D5 implementation note

`specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` now carries a D5 implementation note so the active spec no longer reads as if this gap is still current.

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)
- `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` (modify — D5 implementation note)

## Out of Scope

- Patch-engine `create_ststat_record` implementation — already exists at `tools/patch-engine/src/envelope/schema.ts:76`; no engine changes required.
- STSTAT schema at story-state-contract §4.5.13 — already canonical and unchanged.
- Closeout output table (line 122) — already lists STSTAT correctly; not modified.
- Other closeout sections (proposal-package paths, "now landed" provenance) — proposal-package paths are covered by archive/tickets/SPEC33STOPIPSEV-004.md (D4), and provenance is covered by SPEC33STOPIPSEV-009 (D9). Same-file co-location: this ticket touches Phase 5 op list at line 297 region; SPEC33STOPIPSEV-009's closeout-portion touches line 297's inline PEENH-007 citation. Implementer must land 005 first so 009's edit applies to the modified op list (which now includes `create_ststat_record`).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'STSTAT' .claude/skills/story-promotion-closeout/SKILL.md` returns matches in the Prerequisites schema-list line, Phase 2 character_outcome subsection, Phase 3 disposition map, and Phase 5 op list.
2. `grep -n 'create_ststat_record' .claude/skills/story-promotion-closeout/SKILL.md` returns a match in the Phase 5 op list region.
3. `grep -n 'create_ststat_record' tools/patch-engine/src/envelope/schema.ts` returns the existing line 76 match (unchanged — sanity check that the patch-engine op still exists).
4. Phase 3 disposition map template visually contains the `STSTAT-<integer>: superseded | ledger_only | unchanged_no_schema_field_changed` line.

### Invariants

1. Every closeout output class named in the output table (line 122) is propagated to Prerequisites schema-list, Phase 2 disposition guidance, Phase 3 disposition map, and Phase 5 op list — including STSTAT.
2. The closeout disposition-completeness gate at Phase 3 gate 6 can resolve every source record in `proposal_evidence.source_records[]`, including STSTAT records.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -cn 'STSTAT' .claude/skills/story-promotion-closeout/SKILL.md` — count must be ≥5 (Prerequisites, Phase 2, Phase 3 disposition map, Phase 5, plus the existing output table line 122).
2. `grep -n 'create_ststat_record' .claude/skills/story-promotion-closeout/SKILL.md` — must return a match in Phase 5 op list.
3. `grep -n '"create_ststat_record"' tools/patch-engine/src/envelope/schema.ts` — must return the existing `OPERATION_KINDS` match, confirming the patch-engine op exists.
4. A narrower per-skill grep is the right verification boundary because the patch-engine op is unchanged and the only mutating surface is closeout prose.

## Outcome

Completed on 2026-05-16.

- `.claude/skills/story-promotion-closeout/SKILL.md` now propagates STSTAT through the World-State Prerequisites, Phase 2 `character_outcome` guidance, the Phase 4 closeout ledger disposition template, and the Phase 5 patch-plan operation list.
- `create_ststat_record` remains an existing patch-engine operation; no `tools/patch-engine` source changed.
- `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` now carries a D5 implementation note documenting the landed skill-prose propagation.

## Verification Result

- `grep -n 'STSTAT' .claude/skills/story-promotion-closeout/SKILL.md` — passed with matches in the output table, World-State Prerequisites, Phase 2 `character_outcome` clause, Phase 4 disposition template, and Phase 5 operation-list condition.
- `grep -n 'create_ststat_record' .claude/skills/story-promotion-closeout/SKILL.md` — passed with the Phase 5 operation-list match.
- `grep -n '"create_ststat_record"' tools/patch-engine/src/envelope/schema.ts` — passed with the existing `OPERATION_KINDS` match.
- Manual review confirmed the Phase 4 closeout ledger template contains `STSTAT-<integer>: superseded | ledger_only | unchanged_no_schema_field_changed`.

## Deviations

- The original ticket touched only `.claude/skills/story-promotion-closeout/SKILL.md`; closeout added a same-seam SPEC-33 D5 implementation note so the active originating spec no longer preserves the fixed gap as current-state prose.
