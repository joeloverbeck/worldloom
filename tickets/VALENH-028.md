# VALENH-028: Pre-apply validator for STCHAR `source_char_hash` matching the source CHAR content hash

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (new `src/structural/stchar-source-hash-matches-source.ts`, `src/public/registry.ts`, new test)
**Deps**: None

## Problem

A `world_char` STCHAR's `source_char_hash` is meant to pin the source CHAR dossier's content hash so health-audit `source_drift` (Phase 2n) can later detect divergence. Nothing at patch-engine pre-apply verifies the pinned value actually matches the referenced source CHAR at creation. During a `branching-story-bootstrap` run this session, the three STCHARs were authored with `source_char_hash` computed by a naïve standalone-file sha256 that did NOT equal the world-index `content_hash` (`contentHashForProse`) of the source CHAR; the dry-run `validate-patch-plan` returned `status: pass` across all 102 validators, and the wrong values were caught only by a later manual recompute and hand-correction of the three files.

Because a freshly-created STCHAR cannot have legitimately drifted from its source, an at-creation match check has zero false-positive risk and would have caught the error immediately. Post-creation cross-time drift remains the domain of the opt-in advisory health-audit `source_drift` mode and is intentionally NOT a hard gate; this ticket adds only the at-creation correctness check that closes the silent-incorrect-output gap.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: no validator compares STCHAR `source_char_hash` to the source CHAR content hash. `stchar_resolves` (`tools/validators/src/structural/stchar-resolves.ts:15`) checks only `bound_stchar_id` resolution; `story_kernel_cast_bind_list_integrity` (`story-kernel-cast-bind-list-integrity.ts:121`) checks cross-surface `source_char_id` consistency, not the hash; `record_schema_compliance` enforces only the `sha256:[0-9a-f]{64}` shape. The world index exposes the source content hash as the CHAR node's `content_hash` (`tools/world-index/src/parse/atomic.ts:335` `contentHashForProse(source)` for hybrid records; surfaced by `get_record`). The new validator wires into `structuralValidators` (`tools/validators/src/public/registry.ts:104`, alongside `noCharAuthorityInStoryRuntime` at line 136 and `stcharBodyIntegrity` at 135).
2. **Doc**: FOUNDATIONS §Story Bundles §6.1 (STCHAR source-provenance integrity); `branching-story-health-audit` Phase 2n compares `source_char_hash` against "the current content hash of the referenced world `CHAR-*` dossier", establishing the index `content_hash` as the canonical comparand. This ticket enforces that same comparand at creation, where correctness is unambiguous.
3. **Shared boundary under audit**: the source-provenance hash contract shared by STCHAR authoring (`branching-story-bootstrap` Phase 2 / `story-character-profile` Phase 5), the world-index CHAR `content_hash`, and health-audit `source_drift`. Precedent: completed `archive/tickets/VALENH-026.md` filed the sibling at-creation referential-integrity check for `SF.derived_from` parent CFs from the same bootstrap surface; this ticket is the STCHAR source-hash analogue.
4. **FOUNDATIONS principle**: §Story Bundles §6.1 + §Tooling Recommendation — provenance integrity should be machine-enforced at the pre-apply gate, not left solely to an opt-in post-hoc audit, for the at-creation case. Restated before trusting the spec narrative: a `world_char` STCHAR claims to be distilled from a specific source dossier; `source_char_hash` is the auditable proof of that claim, and an unverified proof is a floating provenance fact.
5. **Canon Safety surface**: adds a new `tools/validators/src/structural/` validator registered in `structuralValidators`. Confirm it is additive coverage that does not touch the Mystery Reserve firewall and does not false-positive on legitimate post-creation drift — scope it to STCHAR records present in the submitted patch plan (`shouldCheckRecordInPreApply`, the pattern already used by `stchar_body_integrity`) and whose `source_char_id` resolves in the same index, so existing already-drifted STCHARs are not retro-failed (that case stays owned by advisory `source_drift`).

## Architecture Check

1. A dedicated structural validator (`stchar_source_hash_matches_source`) that, for each in-scope `source_kind: world_char` STCHAR being created, resolves `source_char_id` in the index and asserts `source_char_hash === "sha256:" + <source node content_hash>`. Cleaner than (a) folding the cross-record index lookup into `record_schema_compliance` (which is schema-shape-only by design) or (b) relying solely on advisory `source_drift` (post-hoc, opt-in, structurally misses author-time errors). Scoping to created records is what makes the at-creation match a hard check with no legitimate-drift false-positive.
2. No backwards-compatibility aliasing/shims: a new additive validator plus one import + array entry in `registry.ts`; no existing validator behavior changes, and existing already-drifted STCHARs are not retro-failed because the check is scoped to records in the submitted plan.

## Verification Layers

1. Created STCHAR whose `source_char_hash` matches the source content hash passes → new validator unit test with a fixture whose hash equals `sha256:` + the source node `content_hash`.
2. Created STCHAR with a mismatched `source_char_hash` fails → new validator unit test asserting the mismatch verdict, with `source_char_id` resolved in the fixture index.
3. `source_kind: story_local` STCHAR (null `source_char_id`) is skipped, and a pre-existing already-drifted STCHAR in a full-world run is not retro-failed → new validator unit test + manual review of the `shouldCheckRecordInPreApply` scoping.

## What to Change

### 1. New structural validator

Add `tools/validators/src/structural/stchar-source-hash-matches-source.ts`. For each `story_character_authority_record` in scope (`shouldCheckRecordInPreApply`) with `source_kind == "world_char"`: resolve `source_char_id` against the indexed CHAR node; if resolvable, assert `source_char_hash === "sha256:" + node.content_hash`; emit a `fail` verdict on mismatch (and on an unresolvable `source_char_id`). Skip `source_kind: story_local` (null source). Reuse the `appliesToStcharStoryState` / `shouldCheckRecordInPreApply` helpers from `stchar-utils.ts`.

### 2. Register the validator

Import and add the new validator to `structuralValidators` in `tools/validators/src/public/registry.ts`.

### 3. Tests

Add `tools/validators/tests/structural/stchar-source-hash-matches-source.test.ts` covering match / mismatch / story_local-skip / unresolved-source cases.

## Files to Touch

- `tools/validators/src/structural/stchar-source-hash-matches-source.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/stchar-source-hash-matches-source.test.ts` (new)

## Out of Scope

- Post-creation cross-time drift detection — owned by `branching-story-health-audit` `source_drift` mode; intentionally advisory, not a hard gate.
- `source_kind: story_local` STCHARs — `source_char_id` is null; nothing to match.
- Changing the source CHAR `content_hash` semantics or the `compute-stchar-hashes` CLI (which deliberately does not produce `source_char_hash`).
- Retro-failing existing STCHARs whose source legitimately drifted after creation.

## Acceptance Criteria

### Tests That Must Pass

1. New validator unit test: a created `world_char` STCHAR with `source_char_hash != "sha256:" + source.content_hash` → fail verdict.
2. New validator unit test: matching hash → pass; `story_local` (null `source_char_id`) → skipped; unresolvable `source_char_id` → fail.
3. `cd tools/validators && npm test` (build + full structural/rule suite) passes.

### Invariants

1. A created `world_char` STCHAR's `source_char_hash` equals `sha256:` + the resolved source CHAR's index `content_hash`.
2. Legitimate post-creation source drift is NOT failed by this validator (scoped to created records / pre-apply; advisory `source_drift` retains ownership of cross-time drift).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-source-hash-matches-source.test.ts` (new) — match / mismatch / story_local-skip / unresolved-source cases.

### Commands

1. `cd tools/validators && npm test`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json`
