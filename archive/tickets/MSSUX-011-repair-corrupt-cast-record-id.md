# MSSUX-011: Repair the corrupt `mchar-1` cast record id (Ane Arrieta)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None. Data-only repair of one Manual Story Studio record file under `worlds/erotica-world/manual-stories/red-bunny/`. Not a `_source/` canon record, so not engine-routed; manual-story records are studio-owned files.
**Deps**: None to stand alone (a direct field edit is sufficient). `archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md` has landed, so the studio write path now prevents recurrence.

## Problem

At intake, `worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml` had been written with an empty `id` field:

```yaml
id: ""              # corrupt — must be "mchar-1" to match the filename
title: Ane Arrieta
```

`archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md` fixes the code that allowed this, but a code fix does **not** retroactively repair already-persisted data. Until this ticket's repair, Ane Arrieta remained unselectable across all four surfaces (prompt working set "Invalid cast IDs:", cast card no-op, records card no-op, moment-composer 400).

Historical live confirmation of the broken state (server on :5176, before this repair):
- `GET /api/worlds/erotica-world/manual-stories/red-bunny/records?class=cast` → `{"id":"","title":"Ane Arrieta",…}`
- `POST …/moment-composer/template-candidates {"selected_cast":[""]}` → `400 {"error":"bad_request","reason":"invalid_id_shape"}`

## Assumption Reassessment (2026-06-04)

1. The corrupt record is exactly one file: `worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml`, the only file under `records/cast/`. Its filename (`mchar-1`) is correct; only the body `id` field (`""`) is wrong. The required value is `mchar-1` (filename stem), per FOUNDATIONS-002 "Filenames match the `id` field exactly."
2. This is a Manual Story Studio record, **not** a `worlds/<slug>/_source/` canon record. Hook 3 (engine-only `_source/<subdir>/*.yaml` guard) does not cover `manual-stories/`, so a direct `Edit`/`Write` is permitted and is not a HARD-GATE/patch-engine bypass. (CLAUDE.md write-boundary rules name `_source/` and the hybrid `characters/`, `diegetic-artifacts/`, `adjudications/` surfaces — manual-stories records are none of these.)
3. Cross-artifact boundary: only the `id` field changes. `cast_order` in `manual-story.yaml` is currently `[]`; that is author-controlled cast ordering and is **not** part of this defect (the studio reads selectable cast from the `records/cast/` directory, not from `cast_order`). Leave `cast_order` untouched.
4. FOUNDATIONS principle: FOUNDATIONS-002 (filename ≡ `id`). The repair restores that invariant for this record.
5. No other corrupt records: a scan of `worlds/erotica-world/manual-stories/red-bunny/records/` shows `cast/mchar-1.yaml` is the only record file present, so the blast radius of the corruption is this single file.

## Architecture Check

1. Repairing the data is orthogonal to the completed code fix (`archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md`) and must happen regardless — MSSUX-010 prevents recurrence but cannot heal existing files. Keeping it a separate, data-only ticket preserves a clean reviewable diff (one YAML field vs. backend logic).
2. No shim/migration framework: this is a single-field, single-file correction. A general "scan-and-repair-all-empty-ids" migration is unwarranted (only one corrupt file exists); if MSSUX-012's read-path guard later surfaces others, repair them individually then.

## Verification Layers

1. Record id correct on disk -> `id: mchar-1` in `mchar-1.yaml` (and the file still validates under the tightened `validateRecord` from `archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md`).
2. List API surfaces a valid id -> `GET …/records?class=cast` returns `"id":"mchar-1"` for Ane Arrieta.
3. Cast selectable in moment-composer -> `POST …/moment-composer/template-candidates {"selected_cast":["mchar-1"]}` returns `200` with candidates (no `invalid_id_shape`).
4. UI surfaces work -> manual/Puppeteer: the cast card and records card open on click; `EditPromptWorkingSet` selecting Ane shows no "Invalid cast IDs" warning.

## Landed Changes

### 1. Repair the `id` field

`worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml` was repaired by changing only the top-level `id` field from `""` to `mchar-1`. The repair was committed in the nested `worlds` content repo as `c1bcef1`.

## Files to Touch

- `worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml` (modify — `id` field only)

## Out of Scope

- Any code change (write path / validator / read path — MSSUX-010 is complete; MSSUX-012 remains active).
- `cast_order` population in `manual-story.yaml` (author-controlled; not part of this defect).
- A generalized empty-id repair migration (only one corrupt file exists).

## Acceptance Criteria

### Tests That Must Pass

1. `worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml` has `id: mchar-1`.
2. `curl -s '…/records?class=cast'` returns `"id":"mchar-1"` for Ane Arrieta (no empty id).
3. `curl -s -X POST '…/moment-composer/template-candidates' -d '{"selected_cast":["mchar-1"]}'` returns HTTP 200.

### Invariants

1. The cast record's `id` field equals its filename stem (`mchar-1`).
2. No other field of the record is altered by the repair.

## Test Plan

### New/Modified Tests

1. `None — data-only repair; verification is command-based (curl against the running studio) plus the regression coverage added by archive/tickets/MSSUX-010-cast-record-id-integrity-and-fail-closed-validation.md, which prevents the corruption from recurring.`

### Commands

1. `rg -n '^id:' worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml` → `id: mchar-1`
2. `curl -s 'http://localhost:5176/api/worlds/erotica-world/manual-stories/red-bunny/records?class=cast'` → id is `mchar-1`
3. `curl -s -o /dev/null -w '%{http_code}\n' -X POST 'http://localhost:5176/api/worlds/erotica-world/manual-stories/red-bunny/moment-composer/template-candidates' -H 'Content-Type: application/json' -d '{"selected_cast":["mchar-1"]}'` → `200`

## Outcome

Completed on 2026-06-04.

- Repaired `worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml` so its body `id` equals the filename stem `mchar-1`.
- Left `manual-story.yaml` / `cast_order` and all non-`id` record fields unchanged during the local repair.
- Committed the world-content repair in the nested `worlds` repo as `c1bcef1` (`Repair MSSUX-011 cast record id`).

## Verification Result

- `rg -n '^id:' worlds/erotica-world/manual-stories/red-bunny/records/cast/mchar-1.yaml` returned `1:id: mchar-1`.
- `curl -s 'http://localhost:5176/api/worlds/erotica-world/manual-stories/red-bunny/records?class=cast'` returned the Ane Arrieta summary with `"id":"mchar-1"`.
- `curl -s -o /tmp/mssux-011-template-candidates.out -w '%{http_code}\n' -X POST 'http://localhost:5176/api/worlds/erotica-world/manual-stories/red-bunny/moment-composer/template-candidates' -H 'Content-Type: application/json' -d '{"selected_cast":["mchar-1"]}'` returned `200`; the response body was `{"candidates":[]}`.

## Deviations

- The repaired record lives in the nested `worlds` content repo, not the public pipeline repo. The pipeline repo ignores `worlds/*`, so this ticket archive commit records the handoff while the actual data repair is committed separately in `worlds` as `c1bcef1`.
