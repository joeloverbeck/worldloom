# VALENH-029: Recompute STCHAR body-content hashes and assert they match stored frontmatter

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (`stchar-body-integrity.ts`, `page-plan-stchar-packet-integrity.ts` and their tests); reads helper exports from `@worldloom/world-index/hash/content`.
**Deps**: `archive/tickets/VALENH-026.md` (SF.derived_from at-creation referential integrity), `archive/tickets/VALENH-028.md` (STCHAR source_char_hash match) — same author-time-hash-integrity family; this ticket is the body-content-hash sibling.

## Problem

A STCHAR record stamps three content-derived hashes in its frontmatter — `profile_hash` (sha256 of the body markdown), `voice_block_hash` (sha256 of the `## Page-Plan Voice Block` section), and `page_packet_hash` (sha256 of the §16a page-plan packet projection). No validator recomputes any of them from the actual content and compares against the stored value. `stchar_body_integrity` (`tools/validators/src/structural/stchar-body-integrity.ts:124-126`) only asserts each field matches the `^sha256:[0-9a-f]{64}$` SHAPE; `prose_receipt_stchar_integrity` and `page_plan_stchar_packet_integrity` only assert §16a-declared == STCHAR-stored CONSISTENCY. The result: a STCHAR whose stored hashes do not reproduce from its body — because a buggy author-time hasher stamped them, or because the body was edited after stamping — passes every validator, and the hashes' tamper-detection purpose is silently defeated.

This surfaced during a `branching-story-prose-attach` run on `worlds/erotica-world/stories/red-bunny/` PG-1 this session: the skill produced a clean PASS receipt with `stchar_authority` PASS for all three STCHARs, while the stored `profile_hash`/`voice_block_hash` for STCHAR-1/2/3 did NOT reproduce under the canonical `compute-stchar-hashes` CLI (e.g. STCHAR-1 body recomputes to `737239cc…`/`d02a3ebb…` vs stored `a006f0bf…`/`b279814b…`). The divergence was caught only by a manual CLI recompute — the exact post-hoc hand-verification step VALENH-026 and VALENH-028 were filed to eliminate for their sibling hashes. prose-attach's `stchar_authority` PASS is therefore a hollow integrity guarantee: it confirms the page plan copied the frontmatter faithfully, not that the frontmatter describes the body.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: `stchar_body_integrity` checks only hash shape — `tools/validators/src/structural/stchar-body-integrity.ts:124-126` iterates `["profile_hash","voice_block_hash","page_packet_hash"]` and tests `HASH_PATTERN` only; it extracts the body (`bodyMarkdown`, line ~168) but never recomputes a hash from it. No file under `tools/validators/src` imports `computeStcharProfileHash`/`computeStcharVoiceBlockHash`/`computeStcharPagePacketHash` (grep returns zero). The canonical helpers exist at `tools/world-index/src/hash/content.ts:146-160` (`sha256Hex ∘ normalizeProseWhitespace`) and are exported via the `@worldloom/world-index/hash/content` package subpath that `tools/validators/package.json` already depends on (`@worldloom/world-index: file:../world-index`). `tools/world-mcp/src/cli/compute-stchar-hashes.ts:7-9,163-169` is the precedent consumer.
2. **Doc**: FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority) makes STCHAR the operative story-runtime character authority; `story-record-schemas.md` §4.5.19 defines the three STCHAR hashes; `branching-story-prose-attach` SKILL.md check 10 relies on those hashes to validate the rendered receipt. None of these is served by a content-recompute validator today.
3. **Shared boundary under audit**: the STCHAR content-hash integrity contract shared by STCHAR authoring (`branching-story-bootstrap` Phase 2 / `story-character-profile` Phase 5 stamping), the world-index content helpers (`hash/content.ts`), `branching-story-prose-attach`'s `stchar_authority` check, and `prose_receipt_stchar_integrity`. The shape-only and consistency-only checks form a chain that never closes the loop back to the body bytes.
4. **FOUNDATIONS principle**: §Story Bundles §6.1 — STCHAR is the authority normal story runtime consumes; its integrity hashes are load-bearing only if they actually pin content. A hash that is never recomputed is decorative. This ticket makes `stchar_body_integrity` enforce what its name already promises.
5. **Canon Safety surface**: modifies `tools/validators/src/structural/` validators. This is additive fail-closed coverage: it adds a content-recompute equality assertion, does not touch the Mystery Reserve firewall, does not alter approval-token or HARD-GATE semantics, and does not weaken any existing check. Scope the recompute to records present in the relevant run (matching the existing `shouldCheckRecordInPreApply` / structural-mode handling already in `stchar-body-integrity.ts`) so legitimate, separately-tracked drift is handled by the same mode the validator already runs in.
6. **Adjacent contradictions**: (a) `page_packet_hash` is computed over the §16a packet projection text, which lives in the PAGE PLAN, not the STCHAR body — so it cannot be recomputed inside `stchar_body_integrity`; its recompute belongs in `page_plan_stchar_packet_integrity`, which already extracts the §16a packet text (`parsePackets`, lines ~190-197), but the extracted slice's exact byte boundaries must be reconciled with the canonical projection the CLI/bootstrap hashed before the equality assertion can be trusted — if that reconciliation proves non-trivial, the `page_packet_hash` recompute is a follow-up and only `profile_hash`/`voice_block_hash` land here. (b) The canonical computation was misdocumented in `tools/world-mcp/src/cli/compute-stchar-hashes.ts` ("no normalization") before `archive/tickets/MCPENH-062.md`; the validator must use the real `normalizeProseWhitespace`-applying helpers, not the old help text's historical claim.

## Architecture Check

1. Extending `stchar_body_integrity` to recompute `profile_hash` and `voice_block_hash` from the body (importing the canonical `@worldloom/world-index/hash/content` helpers) is cleaner than (a) a brand-new validator, because the existing validator already extracts the body and owns the "body integrity" name and surface; and cleaner than (b) folding the recompute into `record_schema_compliance`, which is schema-shape-only by design. `page_packet_hash` recompute goes into `page_plan_stchar_packet_integrity` because that validator is the only one with the §16a packet text in hand. Reusing the single canonical helper module (the same one the CLI uses) guarantees the validator and the author-time stamper cannot diverge.
2. No backwards-compatibility shims: the equality assertion is added directly; there is no legacy "shape-only" mode preserved behind a flag. Records whose stored hashes do not reproduce are meant to fail.

## Verification Layers

1. Stored `profile_hash` not equal to `computeStcharProfileHash(body)` → `fail` verdict → codebase grep-proof (new equality branch in `stchar-body-integrity.ts`) + new unit test in `stchar-body-integrity.test.ts`.
2. Stored `voice_block_hash` not equal to `computeStcharVoiceBlockHash(body)` → `fail` verdict → same validator + test.
3. Stored `page_packet_hash` not equal to `computeStcharPagePacketHash(<extracted §16a packet text>)` → `fail` verdict → `page-plan-stchar-packet-integrity.ts` recompute branch + `page-plan-stchar-packet-integrity.test.ts` (contingent on the boundary reconciliation in Assumption Reassessment item 6a).
4. Helper-source parity: validator and `compute-stchar-hashes` CLI both call the same `@worldloom/world-index/hash/content` exports → FOUNDATIONS alignment check (single canonical computation module) + grep-proof that the validator imports from that subpath, not a hand-rolled sha256.

## What to Change

### 1. Recompute profile_hash and voice_block_hash in `stchar_body_integrity`

Import `computeStcharProfileHash` and `computeStcharVoiceBlockHash` from `@worldloom/world-index/hash/content`. For each in-scope STCHAR record, after the existing shape check passes, recompute both hashes from the already-extracted body and emit a `fail` verdict when a stored value differs from its recompute (message naming stored vs recomputed, parallel to `stchar-source-hash-matches-source.ts`'s mismatch message). Keep the shape check as the precondition (a non-sha256 value fails on shape before recompute is attempted).

### 2. Recompute page_packet_hash in `page_plan_stchar_packet_integrity` (contingent)

Import `computeStcharPagePacketHash`. Reconcile the validator's existing §16a packet-text extraction (`parsePackets` slice) with the canonical projection text the CLI/bootstrap hashes; once the extraction yields the same bytes the stamper used, recompute and assert equality against the declared/stored `page_packet_hash`, emitting `fail` on mismatch. If the boundary reconciliation is non-trivial, descope to a follow-up ticket and land only change 1 here (record the descope in this ticket's Out of Scope at implementation time).

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (modify)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify)

## Out of Scope

- Restamping any existing world/bundle's stale STCHAR hashes (data repair, not validator work) — e.g. `worlds/erotica-world/stories/red-bunny/`; that is a separate bootstrap-restamp activity.
- `source_char_hash` verification (already delivered by VALENH-028).
- Changing the canonical hash computation itself in `tools/world-index/src/hash/content.ts`.
- Correcting the `compute-stchar-hashes` help text (completed in `archive/tickets/MCPENH-062.md`).

## Acceptance Criteria

### Tests That Must Pass

1. A STCHAR whose stored `profile_hash` differs from `computeStcharProfileHash(body)` → `stchar_body_integrity` emits `fail` (new unit test with a fixture whose stored hash is wrong).
2. A STCHAR whose stored `voice_block_hash` differs from the recompute of its `## Page-Plan Voice Block` section → `fail` (new unit test).
3. A STCHAR whose three stored hashes all reproduce from content → all pass (regression fixture using values from `compute-stchar-hashes`).
4. Full validator suite green: `npm --prefix tools/validators test`.

### Invariants

1. Every in-scope STCHAR's stored `profile_hash`/`voice_block_hash` equals the canonical recompute of its body content, or the record fails validation.
2. The validator and the `compute-stchar-hashes` CLI compute these hashes through the same `@worldloom/world-index/hash/content` module (no hand-rolled sha256 in the validator).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` — add wrong-`profile_hash` and wrong-`voice_block_hash` fail fixtures plus a reproduces-cleanly pass fixture.
2. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — add wrong-`page_packet_hash` fail fixture (contingent on change 2 landing).

### Commands

1. `npm --prefix tools/validators run build`
2. `node --test tools/validators/dist/tests/structural/stchar-body-integrity.test.js tools/validators/dist/tests/structural/page-plan-stchar-packet-integrity.test.js`
3. `npm --prefix tools/validators test` — full validator suite (the test script globs `dist/tests/**/*.test.js`; there is no per-test `--` filter flag, so the targeted form in command 2 runs the compiled files directly after build).
