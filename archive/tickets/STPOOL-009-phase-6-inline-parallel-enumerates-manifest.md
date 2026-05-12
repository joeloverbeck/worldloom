# STPOOL-009: Add Phase 6 HARD-GATE / manifest alignment markers

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — skill/template prose edit only.
**Deps**: archive/tickets/STPOOL-006-phase-6-rejected-candidates-off-by-5.md (the immediate F-05 correctness fix has landed; this ticket addresses the architectural drift hazard that F-05 materialized).

## Problem

At intake, `.claude/skills/storylet-pool-authoring/SKILL.md` ("Phase 6: Approval / Return" inline section) re-enumerated the same structural shape that `templates/storylet-batch-manifest.md` already owns: per-storylet summary lines, diversity-summary rows, rejected-candidates breakdowns, validation verdicts, target write paths.

The two surfaces are not identical (the SKILL.md block is the HARD-GATE summary the user sees at decision time; the manifest is the persisted artifact), but their per-storylet / diversity / rejected-candidates rows drift independently. STPOOL-006 (audit F-05) is the materialized form of this drift: the SKILL.md block had 9 rejection categories while the manifest had 14. The same drift pattern can recur on diversity-axis names, per-storylet column order, or validation-verdict line ordering whenever either surface evolves.

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-08.

## Assumption Reassessment (2026-05-12)

1. Verified `.claude/skills/storylet-pool-authoring/SKILL.md` Phase 6 is a structurally-shaped HARD-GATE summary block with header / per-storylet summary / diversity summary / rejected candidates / validation verdicts / target write paths sub-blocks.
2. Verified `templates/storylet-batch-manifest.md` has corresponding sections: Approved storylets table, Diversity summary, Rejected candidates, Dropped at HARD-GATE, Validation verdicts, Authoring warnings, Notes.
3. The two surfaces SHOULD differ in one principled way: the HARD-GATE summary is decision-time information (what the user is approving), the manifest is post-decision persistence (what was approved, including the user's HARD-GATE response).
4. Before this ticket, the SKILL.md block conflated these two roles by re-enumerating the manifest's structural shape inline without an explicit reciprocal alignment marker.
5. Refactoring options:
   - (a) Replace the SKILL.md inline block with a one-paragraph contract + a reference to `templates/storylet-batch-manifest.md` for the structural shape (most aggressive; loses readability for someone reading SKILL.md in isolation).
   - (b) Keep the inline block but explicitly mark it as "summary view of the manifest fields below; the manifest at `templates/storylet-batch-manifest.md` is the structural authority — keep aligned" + add a structural cross-citation comment in both files (less aggressive; preserves readability while creating an alignment marker).
   - (c) Extract the shared structure to a third reference doc (e.g., `references/batch-manifest-and-hardgate-summary.md`) that both surfaces cite (most aggressive structural change; reduces both files to thin references).

   Landed option: (b). This preserves the inline block's readability for users reading SKILL.md without recursing into templates/ and adds explicit alignment markers so the drift hazard is structurally surfaced.
6. Read `docs/HARD-GATE-DISCIPLINE.md` because the edited prose sits on a user-facing HARD-GATE summary surface; the landed change adds cross-artifact alignment notes only and does not weaken approval, validation, Mystery Reserve, or write-order behavior.

## Architecture Check

1. Within-skill cross-referencing between SKILL.md and templates/ is already used elsewhere (e.g., SKILL.md cites `templates/predicate-dsl.md`, `templates/storylet-record.yaml` as schema authorities). The same pattern applies here: the manifest template owns the structural shape; the SKILL.md inline block is a summary view annotated with the alignment requirement.
2. No backwards-compatibility shim — within-skill prose edit.

## Verification Layers

1. **Alignment markers present** — both `SKILL.md` Phase 6 and `templates/storylet-batch-manifest.md` carry inline notes naming the other surface as the alignment partner.
2. **No structural divergence** — the rejection-categories enumeration, diversity-axis names, per-storylet column order, and validation-verdict line order match across the two surfaces. (STPOOL-006 landed the rejection-categories alignment as the immediate fix.)
3. **Reader experience preserved** — a user reading SKILL.md without opening the manifest template can still understand what the HARD-GATE summary contains.

## Landed Changes

### 1. Annotated the SKILL.md Phase 6 inline block with the alignment requirement

In `SKILL.md`, above the inline ASCII block, added a paragraph:

```
The summary block below shows the HARD-GATE decision view; its per-storylet, diversity, rejected-candidates, validation-verdicts, and target-write-paths sub-blocks are aligned with the SLB manifest template at `templates/storylet-batch-manifest.md`. If the manifest's structural shape changes, update this summary in lockstep; STPOOL-006 documents the rejection-categories alignment as a worked example.
```

### 2. Added a cross-citation comment in the manifest template

At the top of `templates/storylet-batch-manifest.md`, added a note:

```
<!-- Sibling alignment: this manifest's section structure is mirrored by the HARD-GATE
deliverable summary at .claude/skills/storylet-pool-authoring/SKILL.md Phase 6. Keep
aligned across edits; see STPOOL-009 for the alignment rationale. -->
```

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (modify)

## Out of Scope

- The immediate F-05 correctness fix (STPOOL-006); this ticket runs after that one lands.
- Extracting a shared reference doc per option (c) above.
- Compressing the SKILL.md inline block; this ticket landed alignment markers only.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "templates/storylet-batch-manifest.md" .claude/skills/storylet-pool-authoring/SKILL.md` shows the cross-citation in the Phase 6 section.
2. `grep -n "SKILL.md.*Phase 6" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` shows the reciprocal cross-citation.
3. The rejection-categories enumeration matches between the SKILL.md Phase 6 `REJECTED CANDIDATES (info)` block and the manifest's `## Rejected candidates` block (14 rows), as landed by `archive/tickets/STPOOL-006-phase-6-rejected-candidates-off-by-5.md`.

### Invariants

1. Both SKILL.md Phase 6 summary block and `templates/storylet-batch-manifest.md` carry explicit alignment markers naming the other surface.
2. Future edits to either surface trigger a documented alignment check (the markers themselves are the structural surface for that check).

## Test Plan

### New/Modified Tests

1. None — SKILL.md and template prose edits.

### Commands

1. The grep commands from Acceptance Criteria.
2. Visual review of the Phase 6 inline block to confirm alignment notes are present and readable.

## Outcome

Completion date: 2026-05-12.

`.claude/skills/storylet-pool-authoring/SKILL.md` Phase 6 now names `templates/storylet-batch-manifest.md` as the structural alignment partner for the HARD-GATE decision summary's per-storylet, diversity, rejected-candidates, validation-verdicts, and target-write-paths sub-blocks.

`.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` now carries a reciprocal top-of-file comment naming the Phase 6 HARD-GATE deliverable summary as the mirrored surface and STPOOL-009 as the rationale.

## Verification Result

1. `grep -n "templates/storylet-batch-manifest.md" .claude/skills/storylet-pool-authoring/SKILL.md` showed the Phase 6 cross-citation at line 277.
2. `grep -n "SKILL.md.*Phase 6" .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` showed the reciprocal template comment at line 2.
3. `diff <(awk '/REJECTED CANDIDATES \(info\):/,/VALIDATION VERDICTS:/' .claude/skills/storylet-pool-authoring/SKILL.md | grep -oE '<count>.*$') <(awk '/## Rejected candidates/,/## Dropped at HARD-GATE/' .claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md | grep -oE '<count>`? .*$' | sed 's/`//g')` exited `0`.
4. Manual review confirmed the Phase 6 inline block remains readable in SKILL.md without opening the manifest template.

## Deviations

The ticket metadata originally said "SKILL.md edit only" while the planned and landed scope also modifies `templates/storylet-batch-manifest.md`; closeout corrected the metadata to "skill/template prose edit only." No source or engine behavior changed.
