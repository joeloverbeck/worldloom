# BSBOOT-005: Use `null` (not `""`) for `canon_revision` in BR + PG examples

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/templates/story-records.yaml` only.
**Deps**: none

## Problem

At intake, the pre-flight reference established the canonical "no CH yet" value as `null`:

> `references/pre-flight-and-prerequisites.md:46` — "If the world has no CH records yet (genesis world without first canonization), set `canon_revision: null`."

But the BR and PG examples in `templates/story-records.yaml` used empty strings instead:

- `templates/story-records.yaml:269` — `canon_revision: ""` on BR-0001 example.
- `templates/story-records.yaml:296` — `canon_revision: ""` on PG-0001 `state_snapshot` example.

`""` is neither a valid `CH-NNNN` id nor an intentional absence value. Two distinct values in the template encode the same intent ("no CH revision pinned") and a downstream reader that distinguishes empty-string from null (e.g. a strict validator, a TypeScript consumer with a typed nullable field, or an audit tool checking for absence) will see them as different.

## Assumption Reassessment (2026-05-06)

1. `references/pre-flight-and-prerequisites.md:46` says set `null`. Verified.
2. At intake, `templates/story-records.yaml:269` and `:296` used `""`. Corrected to `null`.
3. Cross-skill / cross-artifact boundary: the `canon_revision` field appears on both BR records and PG records' `state_snapshot`. `branching-story-page-cycle` reads these on every page tick to decide whether the branch's view of canon has drifted; the field's null/non-null check should be type-safe.
4. Schema-extension classification: this is a value-default change to documentation examples. The JSON schema at `tools/validators/src/schemas/story-branch.schema.json` and `story-page.schema.json` is permissive (`additionalProperties: true`); empty string and null both satisfy any non-strict pattern.
5. No local branch-record bundles to migrate. `find worlds -path "*/stories/*/_source/branches/*.yaml" -exec grep -l "canon_revision: \"\"" {} \;` returned no matches. If historical local bundles later contain this value, those bundles remain valid as-is and this change is forward-only.

## Architecture Check

1. **Why cleaner**: a single canonical absence value eliminates the empty-string-vs-null fork. The pre-flight reference is the upstream authority; the template should follow.
2. No backwards-compatibility shim. New bootstrap runs emit `null`; old bundles are not migrated.

## Verification Layers

1. BR + PG `state_snapshot` examples use `null` → codebase grep-proof.
2. Pre-flight + template aligned → codebase grep-proof (both surfaces show `null`, neither shows `""` for canon_revision).

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- BR-0001 example block now uses `canon_revision: null   # CH-id visible at branch root; null if world has no CH yet`.
- PG-0001 `state_snapshot` example block now uses `canon_revision: null   # CH-id; null if world has no CH yet`.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `archive/tickets/BSBOOT-005.md` (closeout/archive record)

## Out of Scope

- Migration of any committed bundle.
- Adding a JSON-schema constraint to enforce null-vs-empty-string at validation time. Permissive schemas remain permissive.
- Editing `branching-story-page-cycle` templates (a follow-up sweep may identify the same issue there; if so, that becomes its own ticket per the cross-skill scope rule).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn 'canon_revision: ""' .claude/skills/branching-story-bootstrap/` returns no matches.
2. `grep -rn 'canon_revision: null' .claude/skills/branching-story-bootstrap/` returns the BR and PG `state_snapshot` example matches plus the pre-flight authority.

### Invariants

1. Empty-string `canon_revision` is not a documented value anywhere in the bootstrap skill.
2. The pre-flight reference and the template agree on `null` as the absence value.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn 'canon_revision: ""' .claude/skills/branching-story-bootstrap/` — confirms no surviving empty-string defaults.
2. `grep -rn 'canon_revision: null' .claude/skills/branching-story-bootstrap/` — confirms new null defaults are present in templates.

## Outcome

Completed: 2026-05-06.

Updated `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` so the BR-0001 `canon_revision` example and PG-0001 `state_snapshot.canon_revision` example both use `null` for the no-CH-yet case. The bootstrap template now matches the pre-flight reference's absence-value contract.

## Verification Result

Passed:

1. `grep -rn 'canon_revision: ""' .claude/skills/branching-story-bootstrap/` — no matches.
2. `grep -rn 'canon_revision: null' .claude/skills/branching-story-bootstrap/` — found the two template examples and the pre-flight authority.
3. `find worlds -path '*/stories/*/_source/branches/*.yaml' -exec grep -l 'canon_revision: ""' {} \;` — no matches.

## Deviations

None. The implementation stayed forward-only and did not migrate world content or tighten permissive JSON schemas.
