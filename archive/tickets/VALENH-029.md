# VALENH-029: Recompute STCHAR body-content hashes and assert they match stored frontmatter

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`stchar-body-integrity.ts` and its tests); reads helper exports from `@worldloom/world-index/hash/content`.
**Deps**: `archive/tickets/VALENH-026.md` (SF.derived_from at-creation referential integrity), `archive/tickets/VALENH-028.md` (STCHAR source_char_hash match) — same author-time-hash-integrity family; this ticket is the body-content-hash sibling.

## Problem

At intake, a STCHAR record stamped three content-derived hashes in its frontmatter — `profile_hash` (sha256 of the body markdown), `voice_block_hash` (sha256 of the `## Page-Plan Voice Block` section), and `page_packet_hash` (sha256 of the §16a page-plan packet projection). No validator recomputed the body-owned hashes from the actual content and compared them against the stored value. `stchar_body_integrity` only asserted each field matched the `^sha256:[0-9a-f]{64}$` SHAPE; `prose_receipt_stchar_integrity` and `page_plan_stchar_packet_integrity` only asserted §16a-declared == STCHAR-stored CONSISTENCY. The result was that a STCHAR whose stored `profile_hash` or `voice_block_hash` did not reproduce from its body — because a buggy author-time hasher stamped it, or because the body was edited after stamping — passed every validator, and those hashes' tamper-detection purpose was silently defeated.

This surfaced during a `branching-story-prose-attach` run on `worlds/erotica-world/stories/red-bunny/` PG-1 this session: the skill produced a clean PASS receipt with `stchar_authority` PASS for all three STCHARs, while the stored `profile_hash`/`voice_block_hash` for STCHAR-1/2/3 did NOT reproduce under the canonical `compute-stchar-hashes` CLI (e.g. STCHAR-1 body recomputes to `737239cc…`/`d02a3ebb…` vs stored `a006f0bf…`/`b279814b…`). The divergence was caught only by a manual CLI recompute — the exact post-hoc hand-verification step VALENH-026 and VALENH-028 were filed to eliminate for their sibling hashes. prose-attach's `stchar_authority` PASS is therefore a hollow integrity guarantee: it confirms the page plan copied the frontmatter faithfully, not that the frontmatter describes the body.

## Assumption Reassessment (2026-05-22)

1. **Codebase at intake**: `stchar_body_integrity` checked only hash shape — `tools/validators/src/structural/stchar-body-integrity.ts` iterated `["profile_hash","voice_block_hash","page_packet_hash"]` and tested `HASH_PATTERN` only; it extracted the body but never recomputed a hash from it. No file under `tools/validators/src` imported `computeStcharProfileHash`/`computeStcharVoiceBlockHash`/`computeStcharPagePacketHash` at intake. The canonical helpers existed in `tools/world-index/src/hash/content.ts` (`sha256Hex ∘ normalizeProseWhitespace`) and were exported via the `@worldloom/world-index/hash/content` package subpath that `tools/validators/package.json` already depends on (`@worldloom/world-index: file:../world-index`). `tools/world-mcp/src/cli/compute-stchar-hashes.ts` was the precedent consumer.
2. **Doc at intake**: FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority) makes STCHAR the operative story-runtime character authority; `story-record-schemas.md` §4.5.19 defines the three STCHAR hashes; `branching-story-prose-attach` SKILL.md check 10 relies on those hashes to validate the rendered receipt. None of these was served by a body-content-recompute validator before this ticket.
3. **Shared boundary under audit**: the STCHAR content-hash integrity contract shared by STCHAR authoring (`branching-story-bootstrap` Phase 2 / `story-character-profile` Phase 5 stamping), the world-index content helpers (`hash/content.ts`), `branching-story-prose-attach`'s `stchar_authority` check, and `prose_receipt_stchar_integrity`. The shape-only and consistency-only checks form a chain that never closes the loop back to the body bytes.
4. **FOUNDATIONS principle**: §Story Bundles §6.1 — STCHAR is the authority normal story runtime consumes; its integrity hashes are load-bearing only if they actually pin content. A hash that is never recomputed is decorative. This ticket makes `stchar_body_integrity` enforce what its name already promises.
5. **Canon Safety surface**: modifies `tools/validators/src/structural/` validators. This is additive fail-closed coverage: it adds a content-recompute equality assertion, does not touch the Mystery Reserve firewall, does not alter approval-token or HARD-GATE semantics, and does not weaken any existing check. Scope the recompute to records present in the relevant run (matching the existing `shouldCheckRecordInPreApply` / structural-mode handling already in `stchar-body-integrity.ts`) so legitimate, separately-tracked drift is handled by the same mode the validator already runs in.
6. **Adjacent contradictions**: (a) `page_packet_hash` is computed over a §16a packet projection text that is not stored inside the STCHAR body. Live §16a page-plan packets include a `Hashes:` line containing `page_packet_hash` itself, so recomputing from the whole parsed packet would be self-referential and cannot be trusted as the canonical CLI input. The contract does not yet name a validator-stable slice that excludes or placeholders the hash line. This run therefore descopes `page_packet_hash` recompute to a follow-up and lands only `profile_hash`/`voice_block_hash` body recompute. Existing `page_plan_stchar_packet_integrity` still checks plan-declared hash values against the stored STCHAR frontmatter hashes. (b) The canonical computation was misdocumented in `tools/world-mcp/src/cli/compute-stchar-hashes.ts` ("no normalization") before `archive/tickets/MCPENH-062.md`; the validator must use the real `normalizeProseWhitespace`-applying helpers, not the old help text's historical claim.
7. **Baseline and proof surface**: pre-edit `cd tools/validators && npm test` passed with 856 tests. Post-implementation full-suite proof exposed one same-seam positive fixture with placeholder STCHAR hashes in `tools/validators/tests/integration/spec34-integration.test.ts`; updating that fixture to canonical helper-derived hashes is proof-surface fallout required by the new validator contract. The package has pre-existing ignored artifacts under `tools/validators/dist/`, `tools/validators/node_modules/`, `tools/world-index/dist/`, `tools/world-index/node_modules/`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/.secret`; this ticket only refreshes validator `dist/` through the normal build/test lane.

## Architecture Check

1. Extending `stchar_body_integrity` to recompute `profile_hash` and `voice_block_hash` from the body (importing the canonical `@worldloom/world-index/hash/content` helpers) is cleaner than (a) a brand-new validator, because the existing validator already extracts the body and owns the "body integrity" name and surface; and cleaner than (b) folding the recompute into `record_schema_compliance`, which is schema-shape-only by design. Reusing the single canonical helper module (the same one the CLI uses) guarantees the validator and the author-time stamper cannot diverge. `page_packet_hash` remains with existing STCHAR-frontmatter-to-page-plan consistency checks until the canonical non-self-referential packet projection slice is specified.
2. No backwards-compatibility shims: the equality assertion is added directly; there is no legacy "shape-only" mode preserved behind a flag. Records whose stored hashes do not reproduce are meant to fail.

## Verification Layers

1. Stored `profile_hash` not equal to `computeStcharProfileHash(body)` → `fail` verdict → codebase grep-proof (new equality branch in `stchar-body-integrity.ts`) + new unit test in `stchar-body-integrity.test.ts`.
2. Stored `voice_block_hash` not equal to `computeStcharVoiceBlockHash(body)` → `fail` verdict → same validator + test.
3. Existing `page_packet_hash` plan/STCHAR consistency remains unchanged → manual review of `page-plan-stchar-packet-integrity.ts`; true recompute is follow-up scope because the live page-plan packet contains its own hash line.
4. Helper-source parity: validator and `compute-stchar-hashes` CLI both call the same `@worldloom/world-index/hash/content` exports → FOUNDATIONS alignment check (single canonical computation module) + grep-proof that the validator imports from that subpath, not a hand-rolled sha256.

## Landed Changes

### 1. Recomputed profile_hash and voice_block_hash in `stchar_body_integrity`

`stchar_body_integrity` now imports `computeStcharProfileHash` and `computeStcharVoiceBlockHash` from `@worldloom/world-index/hash/content`. For each in-scope STCHAR record, after the existing shape check passes, it recomputes both body-owned hashes from the STCHAR content and emits `stchar_body_integrity.hash_mismatch` when a stored value differs from its canonical recompute. The existing shape check remains the precondition for recompute.

### 2. Updated current-contract fixtures

`stchar-body-integrity.test.ts` now uses canonical helper-derived hashes for valid fixtures and has negative coverage for mismatched `profile_hash` and `voice_block_hash`. `spec34-integration.test.ts` now stamps its positive STCHAR fixture with canonical helper-derived body hashes so the full package suite proves the new validator without preserving placeholder hashes.

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (modify)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify)

## Out of Scope

- Restamping any existing world/bundle's stale STCHAR hashes (data repair, not validator work) — e.g. `worlds/erotica-world/stories/red-bunny/`; that is a separate bootstrap-restamp activity.
- `source_char_hash` verification (already delivered by VALENH-028).
- `page_packet_hash` recompute; existing page-plan/STCHAR consistency checks stay in place, but a future ticket must define the canonical validator slice before recomputing from §16a text.
- Changing the canonical hash computation itself in `tools/world-index/src/hash/content.ts`.
- Correcting the `compute-stchar-hashes` help text (completed in `archive/tickets/MCPENH-062.md`).

## Acceptance Criteria

### Tests That Must Pass

1. A STCHAR whose stored `profile_hash` differs from `computeStcharProfileHash(body)` → `stchar_body_integrity` emits `fail` (new unit test with a fixture whose stored hash is wrong).
2. A STCHAR whose stored `voice_block_hash` differs from the recompute of its `## Page-Plan Voice Block` section → `fail` (new unit test).
3. A STCHAR whose stored `profile_hash` and `voice_block_hash` reproduce from content → all pass (regression fixtures using canonical helper values).
4. Full validator suite green: `cd tools/validators && npm test`.

### Invariants

1. Every in-scope STCHAR's stored `profile_hash`/`voice_block_hash` equals the canonical recompute of its body content, or the record fails validation.
2. The validator and the `compute-stchar-hashes` CLI compute these hashes through the same `@worldloom/world-index/hash/content` module (no hand-rolled sha256 in the validator).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` — add wrong-`profile_hash` and wrong-`voice_block_hash` fail fixtures plus a reproduces-cleanly pass fixture.
2. `tools/validators/tests/integration/spec34-integration.test.ts` — update the current-contract positive STCHAR fixture to stamp canonical `profile_hash` and `voice_block_hash` values.
3. No `page-plan-stchar-packet-integrity.test.ts` change in this ticket; `page_packet_hash` recompute is follow-up scope.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/stchar-body-integrity.test.js dist/tests/integration/spec34-integration.test.js`
3. `cd tools/validators && npm test` (the validators `test` script chains `npm run build` then `node --test dist/tests/**/*.test.js`)

## Outcome

Completion date: 2026-05-22.

Implemented. `stchar_body_integrity` now fails an in-scope STCHAR when stored `profile_hash` or `voice_block_hash` differs from the canonical recompute over the STCHAR body content. The implementation uses the shared `@worldloom/world-index/hash/content` helpers rather than local SHA-256 logic, preserving parity with `compute-stchar-hashes`.

`page_packet_hash` recompute did not land in this ticket because the live page-plan packet text includes the `page_packet_hash` value itself. Existing `page_plan_stchar_packet_integrity` plan/STCHAR consistency remains unchanged.

Package README/user-facing surfaces were inspected. No README update was needed because no validator was added or renamed and no CLI/user-facing command shape changed.

## Verification Result

1. Baseline before edits: `cd tools/validators && npm test` — pass, 856 tests.
2. Producer build: `cd tools/validators && npm run build` — pass.
3. Focused proof before fixture fallout: `cd tools/validators && node --test dist/tests/structural/stchar-body-integrity.test.js` — pass, 9 tests.
4. First full package proof: `cd tools/validators && npm test` — failed in `SPEC-34 validators run together through world-validate CLI with pass and fail worlds` because the positive fixture still used placeholder STCHAR body hashes; this was same-seam proof-surface fallout.
5. Focused proof after fixture correction: `cd tools/validators && node --test dist/tests/structural/stchar-body-integrity.test.js dist/tests/integration/spec34-integration.test.js` — pass, 10 tests.
6. Final full package proof: `cd tools/validators && npm test` — pass, 858 tests.
7. Hygiene: `git diff --check` — pass.

## Deviations

- `page_packet_hash` recompute was descoped. The live §16a packet includes the hash line itself, so a validator-stable non-self-referential projection slice must be specified before a trustworthy recompute can land.
- The full package proof exposed same-seam fixture fallout in `spec34-integration.test.ts`; the positive STCHAR fixture now stamps canonical helper-derived `profile_hash` and `voice_block_hash` values.
