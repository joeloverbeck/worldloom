# SPEC26STOCOHHAR-001: Reconcile drifted schema-reference prose in turn-cycle and health-audit skills

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `branching-story-turn-cycle` and `branching-story-health-audit` skill prose, plus SPEC-26 D1/ticket truthing. No machine-layer change (schemas already correct).
**Deps**: None

## Problem

At intake, `branching-story-turn-cycle/SKILL.md` Phase 3 death/incapacity reconciliation bullets instructed operations against fields that do not exist in the landed story-state schemas: `STINT` "supersede to abandoned/transferred" (STINT has no `status` field), `SREL` "status becomes severed or mourning" (SREL has no `status` field), `STOBJ.controlled_by` (STOBJ has `owner`/`current_location`, no `controlled_by`). `branching-story-health-audit/SKILL.md:186` named a finding `relationship_change_without_basis` against an `SREL.basis` field that does not exist (the schema uses `derived_from`). SPEC-24 finalized these schemas but the turn-cycle/health-audit skill prose was not reconciled until this ticket.

## Assumption Reassessment (2026-05-14)

1. Verified verbatim against the current codebase at SPEC-26 decomposition Step 2: `branching-story-turn-cycle/SKILL.md:243` reads "- Their open `STINT` (supersede to `abandoned` / `transferred`)."; `:245` reads "- `SREL` (supersede; status becomes `severed` or `mourning` per context)."; `:247` reads "- `STOBJ.controlled_by` they controlled (supersede)."; `branching-story-health-audit/SKILL.md:186` reads "- `relationship_change_without_basis` — `SREL` supersessions whose `basis` doesn't trace to an `SE` or `BEL`. WARNING; `repair_kind: turn_repair`."
2. Verified against `.claude/skills/_shared-templates/story-state-contract.md` §4 and `tools/validators/src/schemas/story-relationship.schema.json` / `story-object.schema.json`: SREL fields are `axis` / `value` / `valence` / `description` / `derived_from` (no `status`, no `basis`); STOBJ fields are `owner` / `current_location` (no `controlled_by`); STINT has no `status` field. SPEC-24's per-property audit explicitly rejected adding `status` to `STINT` and `SREL` (decision recorded in `archive/specs/SPEC-24-story-state-contract-property-audit.md`).
3. Cross-skill boundary under audit: the story-state schemas in `.claude/skills/_shared-templates/story-state-contract.md` §4 and the corresponding `tools/validators/src/schemas/story-*.schema.json` files — the canonical source the skill prose must conform to. This ticket changes only skill prose; it does NOT touch the schemas (they are already correct), so the boundary is one-directional: skills conform to the schema, never the reverse.
4. Renamed-finding blast radius (per `tickets/_TEMPLATE.md` menu item 7): the rename `relationship_change_without_basis` → `relationship_change_without_derived_from_trace` was grepped pipeline-wide at SPEC-26 Step 2. `relationship_change_without_basis` appears ONLY in `branching-story-health-audit/SKILL.md:186`. `controlled_by` appears ONLY in `branching-story-turn-cycle/SKILL.md:247`. No `STINT`/`SREL` `status` token appears elsewhere in the seven story skills, the two shared templates, or `tools/validators/`. Blast radius is confined to the two files this ticket touches — no validator test, sibling-skill finding table, or RSP-handling prose references the old finding name.
5. Mismatch + correction: turn-cycle Phase 3 prose and health-audit finding `:186` reference fields the schemas do not define. Correction — rewrite the four prose sites to the operations the schemas actually support: STINT closure via `SE.state_delta.close` plus a replacement STINT for transfers using `supersedes` to link the closed/replaced intention; SREL supersession via `axis`/`value`/`valence`/`description`; STOBJ supersession via `owner`/`current_location`; the finding renamed to `relationship_change_without_derived_from_trace` referencing `SREL.derived_from`.
6. Live reassessment correction before implementation: SPEC-26 D1 and this ticket originally proposed creating a replacement `STINT` with `derived_from` linking the closed record. Current `.claude/skills/_shared-templates/story-state-contract.md` §4.5.2 and `tools/validators/src/schemas/story-intention.schema.json` define no `derived_from` field on `STINT`; the available append-only lineage field is `supersedes`. The owned wording is corrected to use `supersedes`, while `SREL.derived_from` remains correct for the health-audit finding.

## Architecture Check

1. Reconciling skill prose to the already-correct schemas is cleaner than the rejected alternative (adding `status` fields to STINT/SREL): SPEC-24 already evaluated and rejected those fields, append-only supersession is the established discipline, and the bug is the prose — not a missing field. Fixing the prose keeps a single source of truth (the contract §4 / JSON schemas) rather than introducing a second.
2. No backwards-compatibility aliasing or shims — the stale field names are removed outright, not aliased to the real fields.

## Verification Layers

1. No story-pipeline skill instruction names a non-existent schema field -> codebase grep-proof: a sweep for `controlled_by` / `relationship_change_without_basis` / `STINT.*status` / `SREL.*status` across the seven story skills, the two shared templates, and `tools/validators/` returns no matches.
2. The renamed finding resolves against a real field -> codebase grep-proof: `relationship_change_without_derived_from_trace` is present in `branching-story-health-audit/SKILL.md` and references `SREL.derived_from`, which exists in `tools/validators/src/schemas/story-relationship.schema.json`.
3. Corrected reconciliation operations conform to the schemas -> FOUNDATIONS alignment check: the rewritten Phase 3 bullets route closure through `SE.state_delta.close`, transfer through `STINT.supersedes`, and change through supersession of documented SREL/STOBJ fields, consistent with `story-state-contract.md` §4 and the append-only discipline of FOUNDATIONS §Story Bundles §8.

## Landed Changes

### 1. turn-cycle Phase 3 death/incapacity reconciliation bullets

In `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 3:
- `:243` — replaced "Their open `STINT` (supersede to `abandoned` / `transferred`)." with schema-conformant closure/transfer wording: close each in `SE.state_delta.close`; for transfer, create a replacement `STINT` with the new `holder` and `supersedes` linking the closed/replaced intention.
- `:245` — replaced "`SREL` (supersede; status becomes `severed` or `mourning` per context)." with schema-conformant supersession of `axis` / `value` / `valence` / `description`.
- `:247` — replaced the obsolete STOBJ control-field wording with schema-conformant supersession of `owner` and/or `current_location`.

### 2. health-audit finding rename

In `.claude/skills/branching-story-health-audit/SKILL.md:186`, renamed the finding `relationship_change_without_basis` → `relationship_change_without_derived_from_trace` and changed its condition from "`SREL` supersessions whose `basis` doesn't trace to an `SE` or `BEL`" to "`SREL` supersessions whose `derived_from` doesn't trace to an `SE` or `BEL`". Severity (`WARNING`) and `repair_kind: turn_repair` are unchanged.

### 3. Cross-skill grep sweep (completion gate)

Re-ran the Step 2 sweep after edits; `controlled_by`, `relationship_change_without_basis`, and `STINT`/`SREL` `status` returned zero matches across the seven story skills, the two shared templates, and `tools/validators/`.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `archive/tickets/SPEC26STOCOHHAR-001.md` (modify after archival)
- `specs/SPEC-26-story-coherence-hardening-ii.md` (modify)

## Out of Scope

- Any change to `tools/validators/src/schemas/story-*.schema.json` or `story-state-contract.md` §4 — the schemas are already correct; this ticket only conforms prose to them.
- Adding `status` fields to `STINT` or `SREL` (explicitly rejected by SPEC-24).
- The causal-dependency threat scan (SPEC26STOCOHHAR-005) and expected-witness discipline (SPEC26STOCOHHAR-006), which touch adjacent turn-cycle Phase 9 / health-audit Phase 2 sections.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn 'controlled_by' .claude/skills/ tools/validators/` returns no matches.
2. `grep -rn 'relationship_change_without_basis' .claude/skills/ tools/validators/` returns no matches; `grep -n 'relationship_change_without_derived_from_trace' .claude/skills/branching-story-health-audit/SKILL.md` returns the renamed finding.
3. `grep -rnE 'STINT[^a-z]*status|SREL[^a-z]*status' .claude/skills/ .claude/skills/_shared-templates/` returns no matches.

### Invariants

1. No story-pipeline skill instruction names a story-state schema field absent from `story-state-contract.md` §4 / `tools/validators/src/schemas/story-*.schema.json`.
2. Skill prose stays append-only-discipline-conformant: closure routes through `SE.state_delta.close`; transfer routes through `STINT.supersedes`; change routes through supersession of real fields — never a mutated `status` field.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rnE 'controlled_by|relationship_change_without_basis|STINT[^a-z]*status|SREL[^a-z]*status' .claude/skills/branching-story-turn-cycle/ .claude/skills/branching-story-health-audit/ .claude/skills/commitment-block-authoring/ .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-prose-attach/ .claude/skills/story-fact-promotion-to-canon/ .claude/skills/story-promotion-closeout/ .claude/skills/_shared-templates/ tools/validators/`
2. `grep -n 'relationship_change_without_derived_from_trace' .claude/skills/branching-story-health-audit/SKILL.md`
3. A narrower command is the correct verification boundary: this ticket touches only skill prose with no machine-layer surface, so the grep sweep against the seven story skills + two shared templates + `tools/validators/` is the full verification — there is no validator binary or skill dry-run to exercise.

## Outcome

Implemented the schema-reference reconciliation in the two owned story skills. Turn-cycle Phase 3 now routes STINT closure through `SE.state_delta.close`, STINT transfer through `supersedes`, SREL changes through documented relationship fields, and STOBJ custody changes through `owner` / `current_location`. Health-audit Phase 2d now names `relationship_change_without_derived_from_trace` and checks `SREL.derived_from`.

SPEC-26 D1 and this ticket were also truthed to the live STINT schema: replacement STINT records use `supersedes`, not a non-existent `derived_from` field.

## Verification Result

1. `! grep -rnE 'controlled_by|relationship_change_without_basis|STINT[^a-z]*status|SREL[^a-z]*status' .claude/skills/branching-story-turn-cycle/ .claude/skills/branching-story-health-audit/ .claude/skills/commitment-block-authoring/ .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-prose-attach/ .claude/skills/story-fact-promotion-to-canon/ .claude/skills/story-promotion-closeout/ .claude/skills/_shared-templates/ tools/validators/` — passed with zero stale operational hits.
2. `grep -n 'relationship_change_without_derived_from_trace' .claude/skills/branching-story-health-audit/SKILL.md` — passed; the renamed finding is present at line 186 and references `SREL.derived_from`.
3. Manual FOUNDATIONS/story-state alignment check — passed; `.claude/skills/_shared-templates/story-state-contract.md` §4.5.2 defines `STINT.supersedes` and no `STINT.derived_from`; §4.5.7 defines `SREL.derived_from`; §4.5.9 defines `STOBJ.owner` / `current_location`.

## Deviations

The drafted SPEC-26/ticket replacement wording for transferred `STINT` records used `derived_from`, but live reassessment proved `STINT` has no such field. The landed wording uses `supersedes` instead, and `specs/SPEC-26-story-coherence-hardening-ii.md` now records that D1 correction.
