# EROTICA-002: Repair red-bunny PG-1 padded CHAR runtime-authority leak

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — local story-bundle world-content repair applied directly by the user, plus derived index sync.
**Deps**: `archive/tickets/VALENH-027.md`

## Problem

`archive/tickets/VALENH-027.md` widened `no_char_authority_in_story_runtime` so padded world CHAR ids are no longer invisible to the Rule 4 runtime-authority firewall. The post-fix live-corpus command now exposes one real local story-bundle content violation:

- `world_slug`: `erotica-world`
- `story_slug`: `red-bunny`
- `record`: `red-bunny:PG-1`
- `file`: `stories/red-bunny/_source/pages/PG-1.yaml`
- `reference_path`: `PG-1.validation_trace.branch_isolation`
- `reference_id`: `CHAR-0003`
- `validator code`: `no_char_authority_in_story_runtime.char_authority_leak`

`FOUNDATIONS.md` §Story Bundles §6.1 says world `CHAR-*` provenance may remain in STCHAR frontmatter, but normal story runtime consumes `STCHAR` profiles, not world `CHAR` dossiers. A `CHAR-0003` citation inside `PG.validation_trace.branch_isolation` is therefore story-runtime authority leakage and keeps `erotica-world --structural` red after the validator fix.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: `tools/validators/src/structural/stchar-utils.ts` now defines `CHAR_ID = /\bCHAR-[0-9]+\b/`, and `tools/validators/src/structural/no-char-authority-in-story-runtime.ts` uses that matcher for both structured record strings and page-plan/prose-receipt text surfaces. The validator is correctly detecting the padded `CHAR-0003` leak; this ticket must not weaken or special-case that validator.
2. **Docs**: `docs/FOUNDATIONS.md` §Story Bundles §4 requires story-bundle `_source/<class>/*.yaml` writes to route through the patch engine. §6.1 requires runtime character authority to flow through STCHAR, with `CHAR` allowed only as STCHAR provenance.
3. **Shared boundary under audit**: this is local story-bundle content repair exposed by a validator package change. The validator behavior is complete in `archive/tickets/VALENH-027.md`; this ticket owns only correcting the local `red-bunny` PG-1 content so the now-correct validator can pass.
4. **FOUNDATIONS principle**: Rule 4 (No Globalization by Accident) applies at story scope. The repair must replace the operational `CHAR-0003` runtime-authority wording with a story-local STCHAR reference or neutral validation rationale that does not rely on world CHAR authority.
5. **Canon Safety surface**: this ticket mutates a story-bundle `_source` record. The original ticket specified the story-bundle patch-engine route. The user explicitly chose to apply this one-line local repair directly instead; this closeout records that deviation rather than pretending an engine receipt exists.
6. **Adjacent findings**: the same `world-validate` run emits three `compatibility_drift` info verdicts for optional missing `red-bunny` directories. Those are non-failing informational compatibility classifications and are out of scope for this repair.

## Architecture Check

1. Repair the existing local story-bundle record without weakening the validator or broadening VALENH-027. The normal route would be patch-engine submission; this run records the user's explicit direct-edit override as a deviation while preserving the validator's forward contract.
2. No backwards-compatibility aliasing/shims: the content is brought into the current STCHAR authority contract; the validator remains strict.

## Verification Layers

1. The exact padded CHAR leak is gone -> `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` reports no `no_char_authority_in_story_runtime.char_authority_leak` for `red-bunny:PG-1`.
2. Story-bundle write discipline deviation is explicit -> ticket closeout records that the user chose a direct one-line edit and that no patch-engine receipt exists.
3. The remaining optional-directory compatibility information is not treated as failure -> verification result records any remaining `compatibility_drift` info verdicts separately from fail count.

## Landed Changes

### 1. Repaired PG-1 validation_trace branch isolation wording

The user directly updated `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` `validation_trace.branch_isolation` so it no longer cites `CHAR-0003/0004/0005` as runtime authority. The replacement names the story-local STCHAR profiles (`STCHAR-2/STCHAR-3/STCHAR-1`) and states that world-CHAR provenance is carried only in STCHAR frontmatter.

### 2. Refreshed the derived world index

The first validation run after the file edit still reported the old `CHAR-0003` value from the derived index. `node tools/world-index/dist/src/cli.js sync erotica-world` refreshed `worlds/erotica-world/_index/`, after which the same validator command passed.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` (modified directly by user)
- `worlds/erotica-world/_index/` (refreshed derived ignored artifact)

## Out of Scope

- Validator code, tests, schemas, and package docs; completed by `archive/tickets/VALENH-027.md`.
- STCHAR `source_char_hash` correctness; owned by `tickets/VALENH-028.md`.
- The three `compatibility_drift` info verdicts for optional directory absence.
- Rebootstrapping or deleting the whole `red-bunny` story bundle.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` has `fail_count: 0`.
2. `no_char_authority_in_story_runtime` reports `pass`.
3. Remaining `compatibility_drift` info verdicts, if any, are recorded as non-failing and out of scope.

### Invariants

1. The direct edit was explicitly user-applied and is recorded as a deviation from normal patch-engine discipline.
2. No world `CHAR-*` id remains in PG-1 story-runtime authority fields unless it is on a documented exempt provenance surface.

## Test Plan

### New/Modified Tests

1. `None — local gitignored story-bundle content repair; verification is command/manual-review based.`

### Commands

1. `node tools/world-index/dist/src/cli.js sync erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json`

## Outcome

Completed: 2026-05-22.

`worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` no longer cites padded world `CHAR-*` ids in `validation_trace.branch_isolation`. The trace now names the active story-local STCHAR profiles and keeps world-CHAR provenance confined to STCHAR frontmatter. The derived `erotica-world` index was refreshed so validators read the updated record.

## Verification Result

1. Direct file review confirmed `validation_trace.branch_isolation` now says `STCHAR-2/STCHAR-3/STCHAR-1 carry world-CHAR provenance only in STCHAR frontmatter.`
2. Initial `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` still failed because the derived index retained the old `CHAR-0003` parsed value.
3. `node tools/world-index/dist/src/cli.js sync erotica-world` — passed and refreshed the derived index.
4. Final `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` — passed with `fail_count: 0`, `warn_count: 0`, `info_count: 3`; `no_char_authority_in_story_runtime` reported `pass`. The remaining three info verdicts are the known non-failing `compatibility_drift` optional-directory classifications for `red-bunny`.

## Deviations

- The user explicitly chose a direct one-line edit instead of the normal patch-engine route for this local story-bundle `_source` repair. This is recorded here as an explicit deviation; no patch-engine validation/submission receipt exists for this ticket.
- The first post-edit validator run proved that the on-disk file was updated but the derived `_index` was stale. The accepted proof includes `world-index sync erotica-world` before the final validator run.
