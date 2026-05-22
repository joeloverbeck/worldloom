# MCPENH-062: Correct compute-stchar-hashes --help text that wrongly claims "no normalization"

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (CLI help text in `compute-stchar-hashes.ts`); documentation-only, no behavior change.
**Deps**: None.

## Problem

At intake, the `compute-stchar-hashes` CLI help text claimed the three STCHAR hashes were computed with no normalization: `tools/world-mcp/src/cli/compute-stchar-hashes.ts` read *"All three use raw UTF-8 byte sha256 (no normalization), matching compute-pg-hashes plan_hash."* The actual implementation normalizes: `computeStcharProfileHash`/`computeStcharVoiceBlockHash`/`computeStcharPagePacketHash` (`tools/world-index/src/hash/content.ts`) each apply `normalizeProseWhitespace` before `sha256Hex`. The "matching compute-pg-hashes plan_hash" comparison was also misleading: `plan_hash` genuinely IS raw bytes (`compute-pg-hashes.ts` "no normalization, no trimming", true for plan bytes), so the old help wrongly equated the normalized STCHAR hashes with the raw-byte plan hash.

This surfaced during a `branching-story-prose-attach` session: while hand-verifying STCHAR hashes (because no validator recomputes them — see VALENH-029), the operator read `--help`, which described a computation the code does not perform. An operator hand-checking STCHAR hashes against the old help text would compute the wrong value and misdiagnose drift.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: the false claim was a single source site — `tools/world-mcp/src/cli/compute-stchar-hashes.ts` (the `dist/` copy is a build artifact). The implementation it contradicted is `tools/world-index/src/hash/content.ts` (all three helpers `sha256Hex ∘ normalizeProseWhitespace`); the in-code comment in `content.ts` already documents this correctly. The adjacent `compute-pg-hashes.ts` "no normalization, no trimming" is ACCURATE for `plan_hash` (raw plan bytes) and was not changed.
2. **Doc**: no `docs/*.md` or `tools/world-mcp/README.md` repeats the false claim. After the fix, grep for "no normalization" across current source/docs finds only `compute-pg-hashes.ts`, where that wording is correct for `plan_hash`. `story-record-schemas.md` §4.5.19 describes the hashes without asserting raw-bytes.
3. **Shared boundary under audit**: the CLI `--help` is the operator-facing contract for the canonical STCHAR hash computation, consumed by `branching-story-bootstrap` / `story-character-profile` operators stamping hashes and by anyone hand-verifying them. The help must describe the same `normalizeProseWhitespace`-applying computation the helpers perform.
4. **Dirty worktree**: `tickets/MCPENH-062.md` was already untracked at intake. `.claude/skills/_shared-templates/story-record-schemas.md` had a pre-existing same-topic but non-owned edit about prose receipt `required_because`; that file already stated the STCHAR hash normalization correctly and was left untouched. `tickets/VALENH-029.md` was also pre-existing untracked sibling scope and was left untouched.

## Architecture Check

1. Correcting the help string in place is the minimal, cleanest fix — the behavior is correct; only its self-description is wrong. No alternative (e.g., removing normalization to match the help) is acceptable, since normalization is the intended canonical behavior shared with the validators and CLI.
2. No backwards-compatibility shims: this is a text correction with no API or output change.

## Verification Layers

1. Help text no longer claims "no normalization" for the STCHAR hashes and accurately states `normalizeProseWhitespace` is applied → codebase grep-proof on `compute-stchar-hashes.ts` + manual `--help` review.
2. `compute-pg-hashes` help is unchanged (its raw-bytes claim stays) → grep-proof that `compute-pg-hashes.ts` still contains the raw-bytes help text.

## Landed Changes

### 1. Fix the STCHAR hash help text

Replaced the old "raw UTF-8 byte sha256 (no normalization), matching compute-pg-hashes plan_hash" sentence with an accurate description: all three hashes are `sha256` over `normalizeProseWhitespace`-normalized content (body markdown / `## Page-Plan Voice Block` section / §16a packet projection respectively). The help now explicitly contrasts this with `compute-pg-hashes` `plan_hash`, which is raw bytes, so the two are deliberately not the same normalization regime.

## Files to Touch

- `tools/world-mcp/src/cli/compute-stchar-hashes.ts` (modify)

## Out of Scope

- The `compute-pg-hashes` help text (its raw-bytes claim is correct).
- Any change to the hash computation itself in `tools/world-index/src/hash/content.ts`.
- The missing body-content-recompute validator (filed as VALENH-029).

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/world-mcp/dist/src/cli/compute-stchar-hashes.js --help | grep -i 'normaliz'` shows the new `normalizeProseWhitespace` wording.
2. `if node tools/world-mcp/dist/src/cli/compute-stchar-hashes.js --help | grep -i 'no normalization'; then exit 1; fi` passes, proving the STCHAR help no longer contains the old claim.
3. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --help | grep -i 'no normalization'` still finds the accurate raw-bytes description for `plan_hash`.

### Invariants

1. The CLI help text describes the same normalization regime the implementation performs.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and the implementation behavior is unchanged (existing `tools/world-index` hash coverage is the behavior's test surface).`

### Commands

1. `npm run build` from `tools/world-mcp`
2. `node tools/world-mcp/dist/src/cli/compute-stchar-hashes.js --help | grep -i 'normaliz'`
3. `if node tools/world-mcp/dist/src/cli/compute-stchar-hashes.js --help | grep -i 'no normalization'; then exit 1; fi`
4. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --help | grep -i 'no normalization'`

## Outcome

`tools/world-mcp/src/cli/compute-stchar-hashes.ts` now describes the actual STCHAR hash contract: `profile_hash`, `voice_block_hash`, and `page_packet_hash` are computed from `normalizeProseWhitespace`-normalized content. The help also says this intentionally differs from `compute-pg-hashes` `plan_hash`, which hashes raw page-plan bytes.

No hash computation logic changed, and `compute-pg-hashes` help was left unchanged.

## Verification Result

1. `npm run build` from `tools/world-mcp` — PASS; refreshed the compiled `dist/` CLI artifact.
2. `node tools/world-mcp/dist/src/cli/compute-stchar-hashes.js --help | grep -i 'normaliz'` — PASS; output contains `normalizeProseWhitespace-normalized content`.
3. `if node tools/world-mcp/dist/src/cli/compute-stchar-hashes.js --help | grep -i 'no normalization'; then exit 1; fi` — PASS; the STCHAR help no longer contains the stale phrase.
4. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --help | grep -i 'no normalization'` — PASS; output still contains `read as raw bytes (no normalization, no trimming);` for `plan_hash`.

## Deviations

- The active ticket file was untracked before this run, so closeout hygiene treats it as a pre-existing untracked same-seam file rather than a newly created file.
- Existing ignored package artifacts under `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, `tools/world-mcp/.secret`, `tools/world-index/dist/`, and `tools/world-index/node_modules/` were present before verification. `tools/world-mcp/dist/` was refreshed by `npm run build`; ignored artifacts are not tracked owned edits.
