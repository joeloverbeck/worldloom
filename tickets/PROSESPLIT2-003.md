# PROSESPLIT2-003: Update `docs/FOUNDATIONS.md`, `specs/IMPLEMENTATION-ORDER.md`, brainstorm worked precedent — propagate new canonical paths

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `docs/FOUNDATIONS.md` §Prose Length Discipline At Story Scope hosting reference; modifies `specs/IMPLEMENTATION-ORDER.md` SPEC-91 row; modifies `.claude/skills/brainstorm/references/triage-workflow-rules.md` worked-precedent narrative
**Deps**: archive/tickets/PROSESPLIT2-001.md (canonical paths must exist), archive/tickets/PROSESPLIT2-002.md (skill-side refs migrated; this ticket completes the non-skill propagation)

## Problem

After PROSESPLIT2-001/002 land, the canonical-source files exist at `docs/prose-renderer-contract/*` and all skill-side references point at the new paths. Three non-skill live references still point at the old `reports/prose-quality-instructions.md` path:

1. **`docs/FOUNDATIONS.md:714`** — the canonical hosting reference for the Prose Craft Contract under §9 Prose Length Discipline At Story Scope. This is the FOUNDATIONS-level audit-trail anchor that every canon-mutating story-pipeline skill audit cites.
2. **`specs/IMPLEMENTATION-ORDER.md:18`** — the SPEC-91 row notes "`reports/prose-quality-instructions.md` cleanup" as part of SPEC-91's scope. Updating to the new path preserves traceability after the file moves.
3. **`.claude/skills/brainstorm/references/triage-workflow-rules.md:92`** — a worked precedent narrative that cites both a non-existent `.claude/skills/_shared-templates/page-plan.md:11-14` (stale; the actual canonical template is `_shared-templates/story-state-contract.md` §8) AND `reports/prose-quality-instructions.md`. The lesson is forever-relevant (don't propose compacting §3 across page plans); the citations need pointer-updates so future readers can follow them.

References in `docs/triage/*`, `docs/plans/*`, `archive/*`, and `reports/page-plans-improvements-first-iteration.md` are **historical decision records** documenting past work at the file's prior path — they are NOT updated by this ticket (out of scope). After PROSESPLIT2-001..004 the report at `reports/prose-quality-instructions.md` will be deleted; historical references will still resolve via git history for anyone investigating the path lineage.

## Assumption Reassessment (2026-05-26)

1. `docs/FOUNDATIONS.md` exists; §Prose Length Discipline At Story Scope hosting reference is at line 714 verbatim: `The Prose Craft Contract is hosted at reports/prose-quality-instructions.md §Prose Craft Contract and inlined verbatim as page-plan §3 per .claude/skills/_shared-templates/story-state-contract.md §8.` (verified).
2. `specs/IMPLEMENTATION-ORDER.md:18` contains the SPEC-91 row with `reports/prose-quality-instructions.md cleanup` in the description column (verified).
3. `.claude/skills/brainstorm/references/triage-workflow-rules.md:92` contains the worked precedent narrative with both stale citations: `.claude/skills/_shared-templates/page-plan.md:11-14` (file does not exist; confirmed via `find .claude/skills/_shared-templates -name "page-plan.md"` returning empty) and `reports/prose-quality-instructions.md` (verified).
4. Cross-artifact boundary: this ticket touches three independent authoritative surfaces — FOUNDATIONS (the design contract), the spec-order ledger, and a brainstorm worked-precedent narrative. The invariant under audit is that no live-document reference to the contract's canonical-source path remains stale after PROSESPLIT2-001..002 establish the new paths.
5. FOUNDATIONS principle motivating the rewire: §9 Prose Length Discipline At Story Scope explicitly hosts the contract path. Updating the path is mechanical; the principle's content is unchanged.
6. **Historical-reference preservation policy**: `docs/triage/2026-05-10-...md`, `docs/triage/2026-05-12-...md`, `docs/triage/2026-05-15-...md`, `docs/triage/2026-05-26-...md`, `docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md`, and `reports/page-plans-improvements-first-iteration.md` are dated decision records and analysis artifacts. Their references record the file's location at the time of writing and must NOT be retroactively updated — doing so misrepresents the historical state. PROSESPLIT2-003 updates only the three live-canon references above.
7. `AGENTS.md` does NOT contain a literal `reports/prose-quality-instructions` reference (verified via `grep -n "prose-quality" AGENTS.md` returning empty). The mgrep-style semantic match scored 37.75% similarity but the file holds no literal citation. AGENTS.md is removed from the ticket scope.

## Architecture Check

1. Single-cut migration of the three live-canon references is cleaner than per-file rolling migration because the surfaces are independent — no ordering constraint, no shared boundary, but a single grep-proof at the end of this ticket confirms the post-condition (no live-canon reference to `reports/prose-quality-instructions.md` remains; archived / historical refs may remain).
2. No backwards-compatibility aliasing/shims — the new paths point at files created by PROSESPLIT2-001 and validated by PROSESPLIT2-002's skill-side migration. The FOUNDATIONS update is a pure string swap on one cell.

## Verification Layers

1. `docs/FOUNDATIONS.md:714` hosting reference now names the three new canonical files → manual review + codebase grep-proof.
2. `specs/IMPLEMENTATION-ORDER.md:18` SPEC-91 row description column references the new path → manual review.
3. `.claude/skills/brainstorm/references/triage-workflow-rules.md:92` worked precedent now cites `.claude/skills/_shared-templates/story-state-contract.md` §8 (correct canonical template) AND `docs/prose-renderer-contract/prose-craft-contract.md` → manual review + grep-proof on the corrected citations.
4. After PROSESPLIT2-001..003 land, all live-canon-document references resolve to `docs/prose-renderer-contract/*`; remaining `reports/prose-quality-instructions.md` references live only in dated `docs/triage/*` / `docs/plans/*` / `archive/*` / `reports/page-plans-improvements-first-iteration.md` decision records → codebase grep-proof: `grep -rn "reports/prose-quality-instructions" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements"` returns only the report itself (which is deleted by PROSESPLIT2-004).

## What to Change

### 1. `docs/FOUNDATIONS.md` line 714

Replace the hosting reference cell:

**Old (line 714 tail)**: `The Prose Craft Contract is hosted at reports/prose-quality-instructions.md §Prose Craft Contract and inlined verbatim as page-plan §3 per .claude/skills/_shared-templates/story-state-contract.md §8.`

**New**: `The Prose Craft Contract is hosted at docs/prose-renderer-contract/prose-craft-contract.md and inlined verbatim as page-plan §3 per .claude/skills/_shared-templates/story-state-contract.md §8. The Content Policy and Render-Time Instruction Template are hosted alongside at docs/prose-renderer-contract/content-policy.md and docs/prose-renderer-contract/render-time-instruction.md respectively, inlined as page-plan §2 and §19.`

The expanded form names all three canonical-source files so the FOUNDATIONS audit-trail captures the full §2 / §3 / §19 contract, not just §3.

### 2. `specs/IMPLEMENTATION-ORDER.md` line 18 SPEC-91 row

Replace the description cell's `reports/prose-quality-instructions.md` reference with the new location, preserving historical accuracy by noting the path migration:

**Old (line 18 cell)**: `Page-plan body renderer cleanliness & structural enforcement (extends PPLAN-005/006 to §7/§7a/§9/§9b/§9c/§10b/§14; new plan-body engine-vocabulary validator; reports/prose-quality-instructions.md cleanup)`

**New**: `Page-plan body renderer cleanliness & structural enforcement (extends PPLAN-005/006 to §7/§7a/§9/§9b/§9c/§10b/§14; new plan-body engine-vocabulary validator; reports/prose-quality-instructions.md cleanup — file since relocated to docs/prose-renderer-contract/ by PROSESPLIT2-001..004)`

The parenthetical preserves SPEC-91's historical scope (it cleaned the file at the old path) while pointing readers at the current location.

### 3. `.claude/skills/brainstorm/references/triage-workflow-rules.md` line 92

Replace both stale citations in the worked precedent narrative:

**Old (line 92)**: `Worked precedent: a brainstorm proposed compacting §3 Prose Craft Contract across page plans, contradicting .claude/skills/_shared-templates/page-plan.md:11-14 which explicitly commits §2 / §3 / §19 as inlined verbatim from reports/prose-quality-instructions.md; the operator had read the canonical template during exploration but did not run an upstream-commitment check at approach-proposal time, so the contradiction reached the user who pushed back with the operational constraint (the external prose renderer has no cross-plan state). Catching this at approach-proposal time would have prevented the round-trip.`

**New**: `Worked precedent: a brainstorm proposed compacting §3 Prose Craft Contract across page plans, contradicting .claude/skills/_shared-templates/story-state-contract.md §8 which explicitly commits §2 / §3 / §19 as inlined verbatim from docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md; the operator had read the canonical template during exploration but did not run an upstream-commitment check at approach-proposal time, so the contradiction reached the user who pushed back with the operational constraint (the external prose renderer has no cross-plan state). Catching this at approach-proposal time would have prevented the round-trip.`

The correction simultaneously fixes the stale `_shared-templates/page-plan.md:11-14` non-existent-file citation (correct target: `_shared-templates/story-state-contract.md` §8) AND updates the canonical-source path. The worked-precedent lesson is unchanged.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify line 714)
- `specs/IMPLEMENTATION-ORDER.md` (modify line 18)
- `.claude/skills/brainstorm/references/triage-workflow-rules.md` (modify line 92)

## Out of Scope

- Editing `docs/triage/2026-05-10-prose-rendering-out-of-skill-triage.md`, `docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md`, `docs/triage/2026-05-15-story-related-improvements-sixth-iteration-triage.md`, `docs/triage/2026-05-26-page-plans-improvements-first-iteration-triage.md`, `docs/plans/2026-05-10-prose-rendering-out-of-skill-design.md`, or `reports/page-plans-improvements-first-iteration.md` — these are dated historical decision records / analysis artifacts; their references record the file's location at the time of writing and must NOT be retroactively rewritten.
- Editing `archive/specs/*`, `archive/tickets/*`, `archive/brainstorming/*` — frozen by archival policy.
- Editing `AGENTS.md` — no literal `reports/prose-quality-instructions` reference exists there (verified).
- Deleting `reports/prose-quality-instructions.md`. Belongs to PROSESPLIT2-004.
- Touching the §Prose Length Discipline At Story Scope content itself beyond the hosting-reference cell — the principle's substance is unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "reports/prose-quality-instructions" docs/FOUNDATIONS.md` returns empty after this ticket lands.
2. `grep -n "reports/prose-quality-instructions" specs/IMPLEMENTATION-ORDER.md` returns one line containing the parenthetical historical note `(file since relocated to docs/prose-renderer-contract/ by PROSESPLIT2-001..004)` — the verbatim historical-reference + forward pointer is preserved.
3. `grep -n "reports/prose-quality-instructions\|_shared-templates/page-plan.md" .claude/skills/brainstorm/references/triage-workflow-rules.md` returns empty after this ticket lands (both stale citations replaced).
4. `grep -rn "docs/prose-renderer-contract" docs/FOUNDATIONS.md specs/IMPLEMENTATION-ORDER.md .claude/skills/brainstorm/references/triage-workflow-rules.md` returns the three new citations.
5. Post-PROSESPLIT2-003 codebase-wide audit: `grep -rn "reports/prose-quality-instructions" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-"` returns only `/home/joeloverbeck/projects/worldloom/reports/prose-quality-instructions.md` itself (the file deleted by PROSESPLIT2-004) and possibly the historical-note line in `specs/IMPLEMENTATION-ORDER.md`. No live-canon reference remains.

### Invariants

1. After PROSESPLIT2-001..003, every live-canon reference to the canonical-source contract resolves to `docs/prose-renderer-contract/*`. Historical decision records continue to cite the prior path; this is correct.
2. The §Prose Length Discipline At Story Scope principle is unchanged in substance — only the hosting-reference cell moves.
3. The triage-workflow-rules.md worked precedent's lesson is preserved verbatim; only the two stale file citations are corrected (one to the right canonical template, one to the new canonical-source path).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is the grep-proof in Acceptance Criteria Tests That Must Pass §1-§5, plus existing pipeline coverage (FOUNDATIONS.md is exercised by every story-pipeline skill that loads it at pre-flight; the spec-order ledger is read by spec-to-tickets routing; the brainstorm worked precedent is exercised by every brainstorm-skill invocation).`

### Commands

1. `grep -rn "reports/prose-quality-instructions\|_shared-templates/page-plan.md" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-"` — should return only the deleted-by-PROSESPLIT2-004 source file + IMPL-ORDER's preserved historical note.
2. `pnpm turbo lint && pnpm turbo typecheck` — full-pipeline confirmation that the markdown-only changes break nothing.
