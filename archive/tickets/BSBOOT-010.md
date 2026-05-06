# BSBOOT-010: Default `visible_to_reader: false` for SF; add `reader_visibility_basis`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap` skill prose + `templates/story-records.yaml` + same-seam page-cycle prose. The patch-engine SF schema (`tools/validators/src/schemas/story-fact.schema.json`) is permissive, so adding an optional `reader_visibility_basis` field requires no validator change.
**Deps**: none

## Problem

At intake, `templates/story-records.yaml` defaulted SF `visible_to_reader: true` in the example. `references/phases-1-3-premise-cast-facts.md` correctly said "A CF that is canonical-but-secret (e.g., a buried truth) does NOT auto-populate `known_by`" but did not extend the same protection to reader visibility.

For mystery-heavy bootstraps, an objective-class SF imported with `visible_to_reader: true` and `known_by: []` meant the **reader knows** what **no character knows** — accidental dramatic-irony promotion of a buried truth. The runtime page-cycle's `state_snapshot.reader_known_facts` is still "SF ids with `visible_to_reader: true`"; this ticket changed only the bootstrap default and documentation around deliberate reader visibility.

The default is now flipped: SFs whose visibility is reader-facing must justify it. Other records that carry `visible_to_reader` (OBL, CNSQ, SREL) keep their `true` default — the leak risk is specific to SF, where objective truth and reader knowledge can decouple.

## Assumption Reassessment (2026-05-06)

1. At intake, `templates/story-records.yaml` had the SF example default at `visible_to_reader: true`; the landed template now has exactly one line-anchored `visible_to_reader: false` field in the SF example.
2. `templates/story-records.yaml` still has exactly three line-anchored `visible_to_reader: true` fields for OBL / CNSQ / SREL. These are NOT in scope (their reader visibility is structurally tied to the runtime's pressure-management surface, not to dramatic-irony leaks).
3. `templates/story-records.yaml` and `branching-story-page-cycle/references/record-schemas.md` still define `reader_known_facts` as SFs with `visible_to_reader: true`; the relationship `reader_known_facts := SFs with visible_to_reader: true` stays valid under the new default.
4. Cross-skill / cross-artifact boundary: SF is the bootstrap's contribution to the world-fact import, but page-cycle reads `reader_known_facts` on every tick. If the bootstrap changes the SF default, the page-cycle's understanding of `reader_known_facts` does not change — only the population shrinks (fewer SFs are reader-visible by default; those that ARE reader-visible carry an explicit basis).
5. FOUNDATIONS / hard-gate principle: this is a Rule-7-adjacent tightening (Mystery Reserve preservation). It does not weaken the gate-1 mystery firewall — it strengthens prose-assembly safety. Phase 9 gate 1 still hard-rejects any premise element that resolves a `forbidden`-status M; the new default just removes a vector by which an objective-but-secret fact could leak through `reader_known_facts` without resolving an M.
6. Schema-extension classification: `reader_visibility_basis` is a NEW optional field on SF. The story-fact JSON schema is permissive; the new field needs no validator change. Page-cycle consumers do not require the field to exist (they continue to read `reader_known_facts` exactly as before; the new field is metadata explaining *why* a given SF appears there).
7. Worked check: a bootstrap that imports a CF describing "the High Steward poisoned the late king" as an objective fact NOT yet revealed → under the old default, `visible_to_reader: true` would put it in `reader_known_facts` even though no character knows. Under the new default, the bootstrap author must positively assert `visible_to_reader: true` AND state a `reader_visibility_basis` (e.g. `dramatic_irony` if PG-0001 has the steward smile during the king's funeral) — otherwise the SF stays out of `reader_known_facts`.

## Architecture Check

1. **Why cleaner**: defaults should be conservative for safety-relevant fields. Reader visibility is exactly that — the difference between "the reader knows" and "the reader doesn't yet" is the difference between dramatic irony done deliberately and dramatic irony done by accident. Making the operator type the basis when the answer is "yes, the reader knows because X" is the right shape.
2. No backwards-compatibility shim. Existing committed bundles' SFs remain valid (their `visible_to_reader: true` is preserved as a value); only new bootstrap runs default to false. The new `reader_visibility_basis` field is optional and additive.

## Verification Layers

1. SF template default flipped to `false` → codebase grep-proof.
2. `reader_visibility_basis` enum documented in template and Phase 3 reference → codebase grep-proof.
3. `reader_known_facts` consumer description still valid under the new default → manual review (the description is `SF ids with visible_to_reader: true`; the change reduces the population, not the membership criterion).
4. Mystery Reserve firewall unchanged → FOUNDATIONS alignment check (Rule 7 enforcement at gate 1 is untouched).
5. OBL / CNSQ / SREL defaults unchanged → codebase grep-proof.
6. Same-seam page-cycle prose: page-cycle `references/record-schemas.md:27` describes `reader_known_facts` consistently → codebase grep-proof.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- SF example block now defaults `visible_to_reader: false`.
- SF example block now includes `reader_visibility_basis: unrevealed_objective_truth`.
- SF block header comment documents that `visible_to_reader: true` requires one of `shown_in_pg0001`, `known_to_pov`, `dramatic_irony`, or `diegetic_artifact_visible`; `unrevealed_objective_truth` pairs with `visible_to_reader: false`.

### 2. `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md`

- Phase 3 import rules now say each imported SF defaults `visible_to_reader: false` and `reader_visibility_basis: unrevealed_objective_truth`, with positive visibility bases limited to opening prose, POV horizon, dramatic irony, or diegetic-artifact exposure.

### 3. `.claude/skills/branching-story-page-cycle/references/record-schemas.md`

- The `reader_known_facts` description retains "`SFs with visible_to_reader: true`" and now adds a follow-up note that entries carry a positive `reader_visibility_basis`.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify)

## Out of Scope

- Changing OBL / CNSQ / SREL `visible_to_reader` defaults. Those records' reader-visibility ties to runtime pressure management, not to objective-truth leakage.
- JSON-schema enforcement of the `reader_visibility_basis` enum. Permissive schemas remain permissive; the enum is operator discipline.
- Migration of existing bundles' SFs.
- Changing `reader_known_facts` semantics. The state-snapshot field continues to mean "SF ids with `visible_to_reader: true`"; the population shrinks under the new default but membership criterion is unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "^visible_to_reader: false$" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns the SF example match only.
2. `grep -nE "reader_visibility_basis" .claude/skills/branching-story-bootstrap/templates/story-records.yaml .claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` returns matches in both files.
3. `grep -nE "^visible_to_reader: true$" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns three matches for the remaining OBL / CNSQ / SREL example defaults.
4. `grep -n "reader_known_facts" .claude/skills/branching-story-page-cycle/references/record-schemas.md` returns the existing line plus the new follow-up line.
5. Phase 9 gate 1 (Rule 7 mystery firewall) wording is unchanged.

### Invariants

1. SF default is `visible_to_reader: false` with `reader_visibility_basis: unrevealed_objective_truth`.
2. Setting `visible_to_reader: true` requires a positive `reader_visibility_basis` other than `unrevealed_objective_truth`.
3. OBL / CNSQ / SREL `visible_to_reader` defaults are unchanged at `true`.
4. `reader_known_facts` continues to mean "SF ids with `visible_to_reader: true`".

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "^visible_to_reader: false$" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — confirms the SF example default.
2. `grep -nE "^visible_to_reader: true$" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — confirms OBL/CNSQ/SREL remain true.
3. `grep -rn "reader_visibility_basis" .claude/skills/` — confirms the new field is documented in the bootstrap skill's template, Phase 3 reference, and page-cycle `record-schemas.md`.
4. (Manual) read the SF example block; confirm comment guidance reads naturally.

## Outcome

Completion date: 2026-05-06.

Completed. The bootstrap SF template now defaults reader visibility to false and carries `reader_visibility_basis: unrevealed_objective_truth`. Phase 3 import guidance now requires a positive basis before putting a story fact into reader-facing knowledge, and the page-cycle record schema now documents that `reader_known_facts` entries have such a basis. OBL / CNSQ / SREL defaults remain `visible_to_reader: true`.

## Verification Result

1. `grep -nE "^visible_to_reader: false$" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — passed; returned only the SF example field.
2. `grep -nE "^visible_to_reader: true$" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — passed; returned exactly three remaining true defaults for OBL / CNSQ / SREL.
3. `grep -rn "reader_visibility_basis" .claude/skills/` — passed; returned the bootstrap template, Phase 3 import reference, and page-cycle record-schema note.
4. `grep -n "reader_known_facts" .claude/skills/branching-story-page-cycle/references/record-schemas.md` — passed; returned the original membership line plus the new basis note.
5. Manual review — Phase 9 gate 1 / mystery firewall wording was not edited; Rule 7 firewall behavior is unchanged.

## Deviations

The drafted OBL/CNSQ/SREL acceptance grep used `OBL.*visible_to_reader`, but the template record headers and fields are on separate lines. Closeout replaced it with the line-anchored `^visible_to_reader: true$` proof and classified the three remaining true defaults by manual record-position review.
