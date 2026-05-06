# BSBOOT-010: Default `visible_to_reader: false` for SF; add `reader_visibility_basis`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap` skill prose + `templates/story-records.yaml` + same-seam page-cycle prose. The patch-engine SF schema (`tools/validators/src/schemas/story-fact.schema.json`) is permissive, so adding an optional `reader_visibility_basis` field requires no validator change.
**Deps**: none

## Problem

`templates/story-records.yaml:77-78` defaults SF `visible_to_reader: true` in the example. `references/phases-1-3-premise-cast-facts.md:46` correctly says "A CF that is canonical-but-secret (e.g., a buried truth) does NOT auto-populate `known_by`" but does NOT extend the same protection to reader visibility.

For mystery-heavy bootstraps, an objective-class SF imported with `visible_to_reader: true` and `known_by: []` means the **reader knows** what **no character knows** — accidental dramatic-irony promotion of a buried truth. The runtime page-cycle's `state_snapshot.reader_known_facts` (described at `templates/story-records.yaml:300` and `branching-story-page-cycle/references/record-schemas.md:27` as "SF ids with `visible_to_reader: true`") then surfaces the SF in any prose-assembly context that consumes `reader_known_facts`. This is exactly the surface a Phase 7 prose render or a future runtime page can leak through.

The default should be flipped: SFs whose visibility is reader-facing must justify it. Other records that carry `visible_to_reader` (OBL, CNSQ, SREL) keep their `true` default — the leak risk is specific to SF, where objective truth and reader knowledge can decouple.

## Assumption Reassessment (2026-05-06)

1. `templates/story-records.yaml:77-78` — verified SF default is `visible_to_reader: true`.
2. `templates/story-records.yaml:128, 158, 190` — verified OBL / CNSQ / SREL also use `visible_to_reader: true`. These are NOT in scope (their reader visibility is structurally tied to the runtime's pressure-management surface, not to dramatic-irony leaks).
3. `templates/story-records.yaml:300` and `branching-story-page-cycle/references/record-schemas.md:27` — verified `reader_known_facts` is the consumer; the relationship `reader_known_facts := SFs with visible_to_reader: true` stays valid under the new default.
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

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- SF example block (lines 60-89):
  - Change `visible_to_reader: true` (line 77) to `visible_to_reader: false`.
  - Add a new field `reader_visibility_basis: unrevealed_objective_truth   # one of: shown_in_pg0001 | known_to_pov | dramatic_irony | diegetic_artifact_visible | unrevealed_objective_truth` immediately below `visible_to_reader`.
  - Add a note in the SF block header comment: "Reader visibility defaults to false. Set `visible_to_reader: true` only with a positive `reader_visibility_basis` (one of: shown_in_pg0001, known_to_pov, dramatic_irony, diegetic_artifact_visible, unrevealed_objective_truth — `unrevealed_objective_truth` is the canonical basis when `visible_to_reader: false`)."

### 2. `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md`

- Phase 3 §Import rules (lines 42-49): add a new bullet immediately after the `derived_from_cf` rule:

  > - Each imported SF defaults `visible_to_reader: false` and `reader_visibility_basis: unrevealed_objective_truth`. Set `visible_to_reader: true` and override the basis (`shown_in_pg0001` | `known_to_pov` | `dramatic_irony` | `diegetic_artifact_visible`) only when the opening prose, POV horizon, or a deliberate dramatic-irony anchor justifies it. Defaulting to false prevents an objective-but-secret fact from accidentally surfacing in `reader_known_facts` at PG-0001.

### 3. `.claude/skills/branching-story-page-cycle/references/record-schemas.md`

- Line 27 (`reader_known_facts` description): retain the existing "`SFs with visible_to_reader: true`" wording — the description is unchanged; only the population is smaller under the new default. Add a one-line follow-up: "Each SF in this list carries a positive `reader_visibility_basis` distinguishing the visibility source (PG-0001 prose, POV horizon, dramatic irony, or diegetic-artifact exposure)."

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

1. `grep -nE "visible_to_reader: false" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns the SF example match (and no other record's example match — OBL/CNSQ/SREL defaults stay `true`).
2. `grep -nE "reader_visibility_basis" .claude/skills/branching-story-bootstrap/templates/story-records.yaml .claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` returns matches in both files.
3. `grep -nE "OBL.*visible_to_reader: true|CNSQ.*visible_to_reader: true|SREL.*visible_to_reader: true" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` shows the OBL / CNSQ / SREL defaults unchanged (the value `true` still appears on those examples).
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

1. `grep -nE "visible_to_reader" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — confirms SF `false`, OBL/CNSQ/SREL still `true`.
2. `grep -rn "reader_visibility_basis" .claude/skills/` — confirms the new field is documented in the bootstrap skill's template and Phase 3 reference and (optionally) noted in page-cycle's `record-schemas.md`.
3. (Manual) read the SF example block; confirm comment guidance reads naturally.
