# red-bunny — Validation Remediation Report

**Status**: COMPLETED
**Date**: 2026-05-18
**Bundle**: `worlds/erotica-world/stories/red-bunny/`
**Validator state at report time**: `fail_count: 0`, `warn_count: 15`, `info_count: 10` (25 verdicts total)
**Command run**: `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json`

## Executive summary

All 25 verdicts trace to **two root causes**, both about `state_snapshot.active_records` shape completeness:

1. **PG-1 through PG-5 each omit three of the 15 documented active-record class keys**: `CLK`, `STSEC`, `STQ`. This produces 15 warn + 5 info verdicts (20 of 25).
2. **Four optional `_source/` subdirectories don't exist**: `_source/clocks/`, `_source/secrets/`, `_source/story-questions/`, `_source/artifacts/`. This produces 4 info verdicts (4 of 25).

The 25th verdict (`compatibility_drift.classification`) is an always-emitted bundle-classification info — it is metadata, not a complaint, and cannot be eliminated.

**Realistic minimum-floor**: `fail_count: 0`, `warn_count: 0`, `info_count: 1` (just the always-emitted classification, which would then read `current_contract`).

## Verdict decomposition (all 25)

| Validator | Code | Severity | Count | Origin |
|---|---|---|---|---|
| `active_records_full_shape` | `active_records_class_key_missing` | warn | 15 | 5 PGs × 3 missing keys each (CLK, STSEC, STQ) |
| `compatibility_drift` | `compat_missing_active_record_key` | info | 5 | 5 PGs (one per PG, lists all missing keys together) |
| `compatibility_drift` | `compat_optional_directory_absent` | info | 4 | 4 missing optional subdirs (clocks, secrets, story-questions, artifacts) |
| `compatibility_drift` | `compatibility_drift.classification` | info | 1 | Always-emitted bundle classification (currently `compatible_optional_absence, grandfathered_snapshot_shape`) |

Every other validator (44 listed in `validators_run`) PASSED. The pipeline is structurally sound; only the SPEC-44 shape-completeness check and SPEC-43 compatibility-drift advisory are firing.

## Root cause 1 — per-PG missing keys

### What's wrong

`tools/validators/src/structural/active-records-full-shape.ts` (SPEC-44 deliverable) emits warn-level diagnostics when any of the 15 documented record-class keys is absent from `PG.state_snapshot.active_records`. SPEC-44's `Out of Scope` defers upgrade to `fail` until the Wave 3 `branching-story-compatibility-repair` skill lands; `warn` is the current bridge severity.

`tools/validators/src/structural/compatibility-drift.ts` (SPEC-43 deliverable) independently emits info-level diagnostics for the same condition — but only for the four "optional" classes (`CLK`, `STSEC`, `STQ`, `DA`). Since red-bunny already materializes `DA: []` (PG-1 line 33), only CLK/STSEC/STQ trip the per-PG info as well.

### What red-bunny currently has

Every PG materializes 12 of the 15 keys: `BEL`, `CNSQ`, `DA`, `OBL`, `SF`, `SREL`, `STENT`, `STINT`, `STLOC`, `STOBJ`, `STSTAT`, `THR`. Missing: `CLK`, `STSEC`, `STQ`.

### Exact change required

For each of the 5 files (`PG-1.yaml`, `PG-2.yaml`, `PG-3.yaml`, `PG-4.yaml`, `PG-5.yaml`) under `worlds/erotica-world/stories/red-bunny/_source/pages/`, insert the following three keys into the `state_snapshot.active_records` map. They are array-of-string fields and should be `[]` (empty arrays) since the bundle currently has no `CLK`, `STSEC`, or `STQ` records.

In PG-1.yaml, the current block runs from line 21 to line 69 (per the file's `state_snapshot.active_records` section). Add anywhere alphabetically — recommended placement matches the existing alphabetical-ish ordering:

```yaml
state_snapshot:
  active_records:
    BEL: [ ... ]            # existing
    CLK: []                 # ADD
    CNSQ: [ ... ]           # existing
    DA: []                  # existing
    OBL: [ ... ]            # existing
    SF: [ ... ]             # existing
    SREL: [ ... ]           # existing
    STENT: [ ... ]          # existing
    STINT: [ ... ]          # existing
    STLOC: [ ... ]          # existing
    STOBJ: [ ... ]          # existing
    STQ: []                 # ADD
    STSEC: []               # ADD
    STSTAT: [ ... ]         # existing
    THR: [ ... ]            # existing
```

Repeat identically in PG-2, PG-3, PG-4, PG-5. The three new keys are all `[]` because red-bunny has zero `CLK`, `STSEC`, or `STQ` records in `_source/`.

### Schema validation

Confirmed safe via `tools/validators/src/schemas/story-page.schema.json:64-66`:

```json
"CLK":   { "type": "array", "items": { "type": "string", "pattern": "^CLK-[0-9]+$"   } },
"STSEC": { "type": "array", "items": { "type": "string", "pattern": "^STSEC-[0-9]+$" } },
"STQ":   { "type": "array", "items": { "type": "string", "pattern": "^STQ-[0-9]+$"   } }
```

Empty arrays are valid (no minItems constraint, no `additionalProperties: false` issue).

### What this clears

- 15 warn (`active_records_full_shape/active_records_class_key_missing`)
- 5 info (`compatibility_drift/compat_missing_active_record_key`)

**Net after step 1**: `fail_count: 0`, `warn_count: 0`, `info_count: 5` (4 dir-absent + 1 classification, now reads `compatible_optional_absence`).

## Root cause 2 — missing optional subdirectories

### What's wrong

`tools/validators/src/structural/compatibility-drift.ts:82-101` checks whether `_source/clocks/`, `_source/secrets/`, `_source/story-questions/`, and `_source/artifacts/` exist on disk. If absent AND no records of the corresponding class are indexed, emits info-level `compat_optional_directory_absent`.

### Validator's own guidance

From `compatibility-drift.ts:99`:

> "No fiction repair is required. Create the directory only when a future accepted record of that class is written."

The validator explicitly classifies these as `compatible_optional_absence` and does not consider their absence a problem. The Wave 2 design intent (per SPEC-43 §Approach E) is for these infos to remain as benign advisory until a real consumer materializes.

### Exact change required (optional — only if you want zero-info)

Two valid paths:

**Path A — leave alone (recommended per validator guidance)**. The 4 dir-absent infos remain; bundle classification stays `compatible_optional_absence`.

**Path B — create empty placeholder directories with `.gitkeep`**. Run from the repo root:

```bash
mkdir -p worlds/erotica-world/stories/red-bunny/_source/clocks
mkdir -p worlds/erotica-world/stories/red-bunny/_source/secrets
mkdir -p worlds/erotica-world/stories/red-bunny/_source/story-questions
mkdir -p worlds/erotica-world/stories/red-bunny/_source/artifacts
touch worlds/erotica-world/stories/red-bunny/_source/clocks/.gitkeep
touch worlds/erotica-world/stories/red-bunny/_source/secrets/.gitkeep
touch worlds/erotica-world/stories/red-bunny/_source/story-questions/.gitkeep
touch worlds/erotica-world/stories/red-bunny/_source/artifacts/.gitkeep
```

The `.gitkeep` files preserve the empty directories under git tracking (git ignores truly empty dirs). The validator only checks `existsSync` (line 163) — the contents are irrelevant. Subsequent record creation in these dirs proceeds normally; `.gitkeep` does not interfere.

### What this clears

- Path A: nothing — 4 infos remain. End state: `fail_count: 0`, `warn_count: 0`, `info_count: 5`.
- Path B: 4 info (`compat_optional_directory_absent`). End state: `fail_count: 0`, `warn_count: 0`, `info_count: 1`.

## The always-emitted classification info (cannot be cleared)

`compatibility-drift.ts:145` unconditionally pushes a `compatibility_drift.classification` info verdict regardless of bundle state. Its only purpose is to record the bundle's compatibility classification in the validator output as metadata. After both root causes above are resolved, this verdict's message becomes:

```
red-bunny compatibility-drift classification: current_contract
```

This is the minimum-floor info. To suppress it would require modifying `compatibility-drift.ts` itself, which is out of scope for any per-bundle remediation effort.

## Step-by-step execution plan

If your goal is the minimum-floor (`fail=0, warn=0, info=1`):

1. **Edit each of the 5 PG files** (PG-1.yaml through PG-5.yaml under `_source/pages/`) to add `CLK: []`, `STSEC: []`, `STQ: []` to the `state_snapshot.active_records` map.
2. **Run** `mkdir -p` + `touch .gitkeep` for the 4 optional subdirs (Path B above).
3. **Verify**: `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json | python3 -c "import json, sys; d = json.load(sys.stdin); print(d['summary'])"`

   Expected output: `{'fail_count': 0, 'warn_count': 0, 'info_count': 1, ...}`

If your goal is just-clear-the-warns (`fail=0, warn=0, info=5`), do only step 1.

## Open question — should the bundle classify as `current_contract`?

Once the PG edits land, red-bunny will classify as `current_contract` from the validator's perspective. This has one downstream implication: any future PG created from a `current_contract` parent that omits the same keys will trigger `compat_requires_migration_patch` (warn) — the trigger condition for the Wave 3 compatibility-repair skill spec deferral. In other words, **fixing red-bunny's shape is the cleanest way to ensure any future authoring bug surfaces as a `requires_migration_patch` warning** rather than being absorbed silently as another `grandfathered_snapshot_shape` info.

This is a side benefit, not a hazard: it means the SPEC-43-era deferral trigger becomes testable by any subsequent turn-cycle invocation on red-bunny, rather than requiring a fresh v2-native bundle to surface the condition.

## Cross-reference

- `tools/validators/src/structural/active-records-full-shape.ts` — origin of the 15 warns
- `tools/validators/src/structural/compatibility-drift.ts` — origin of the 10 infos
- `tools/validators/src/schemas/story-page.schema.json:49-68` — schema definition for `active_records` keys
- `tools/validators/src/_helpers/state-snapshot-replay.ts` — defines `OPTIONAL_ACTIVE_RECORDS_CLASSES = [DA, CLK, STSEC, STQ]`
- `archive/specs/SPEC-43-present-causal-mid-story-state-introduction.md` §Approach E — compatibility-drift design intent
- `archive/specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md` §Phase 3 — `active_records_full_shape` validator origin

## Outcome

Completed: 2026-05-18

What changed:
- Added `CLK: []`, `STSEC: []`, and `STQ: []` to `state_snapshot.active_records` in `PG-1.yaml` through `PG-5.yaml`.
- Created the optional `_source/clocks/`, `_source/secrets/`, `_source/story-questions/`, and `_source/artifacts/` directories with `.gitkeep` placeholders.
- Rebuilt the `erotica-world` index after story-source edits.
- Added the missing parseable `intro:SREL(...)` rationale tags for `SREL-3` in `SE-2.yaml` and `SREL-4` in `SE-5.yaml`, which the fresh index surfaced as source-level validation failures.

Deviations from original plan:
- The report's remediation plan was sufficient for the stale-index warnings and optional-directory infos. After rebuilding the derived index, validation additionally exposed two missing mid-story relationship introduction tags; those were repaired to make the production story validate cleanly.

Verification:

```bash
node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json
```

Result after remediation and index rebuild: `fail_count: 0`, `warn_count: 0`, `info_count: 1`. The remaining info is the expected always-emitted `compatibility_drift.classification` verdict with `current_contract`.
