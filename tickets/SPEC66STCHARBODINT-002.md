# SPEC66STCHARBODINT-002: Contingent hash-recompute check (profile_hash / voice_block_hash)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extends the `stchar_body_integrity` validator (`tools/validators/src/structural/stchar-body-integrity.ts`) with a recompute-and-compare check; may add a shared canonicalization util under `tools/validators/src/structural/` consumed by the validator. No impact on existing validators.
**Deps**: SPEC66STCHARBODINT-001

## Problem

The audit's strongest STCHAR-integrity claim ("frontmatter hashes match canonical section projections") requires *recomputing* the frontmatter hashes from the body and comparing — catching a stale hash left behind when a body section was edited without regenerating. This is only sound if the exact canonicalization the producer uses is deterministic and reproducible from a pinned, shared input projection; a recompute that guesses the canonicalization emits false mismatches and is worse than no check. This ticket implements the recompute *only if* a pinned shared canonicalization can be established, and otherwise records why it was held back.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: the hash canonicalization is documented at `story-character-profile/SKILL.md` Phase 5 (lines 303-311): `profile_hash` = SHA-256 of the complete body markdown; `voice_block_hash` = SHA-256 of `## Page-Plan Voice Block`; `page_packet_hash` = SHA-256 of the *projected page-plan packet fields* the profile authorizes for section 16a. A `tools/` grep finds **no shared hashing util** — Phase 5 line 311 instructs the generator to "use a deterministic byte-for-byte SHA-256 over UTF-8 text and record the exact source slices in `## Validation / Audit Anchors`," so the exact byte boundaries are recorded per-record, not pinned in reusable code. `page_packet_hash` hashes a field projection, not a raw body slice, so it is **not** recomputable from the STCHAR body alone.
2. **Spec**: §2.2 frames the work as an ordered implementer task — (1) the canonicalization is at Phase 5 (no shared util exists); (2) decide whether a deterministic, reusable canonicalization can be extracted into a shared util consumed by BOTH the producer's hashing step and this validator, without changing the producer's output; (3) if yes, add recompute-and-compare for `profile_hash`/`voice_block_hash` + a stale-hash negative fixture; if not, record the gap in closeout.
3. **Cross-skill boundary**: the recompute correctness depends on the producer (`story-character-profile` Phase 5) and this validator sharing the *exact same* canonicalization. The shared-util extraction is that boundary — if the validator's canonicalization diverges from the producer's by even a trailing newline or heading-line inclusion, every real record emits a false mismatch. The producer is an LLM-instruction skill (no existing code util to refactor), so "without changing the producer's output" means the extracted util must reproduce the byte boundaries Phase 5's instructions already produce.
4. **FOUNDATIONS**: Rule 1 (No Floating Facts) — the recompute check, if shipped, declares its scope (`profile_hash`/`voice_block_hash` only), its limit (`page_packet_hash` excluded — field projection), and its failure consequence (`severity_mode: "fail"` on a stale hash). The contingent posture itself is Rule-1-aligned: a check that cannot be grounded in a pinned canonicalization is not shipped rather than shipped with floating (guessed) semantics.
5. **Canon Safety surface**: this ticket modifies the `stchar_body_integrity` structural validator (created by SPEC66STCHARBODINT-001) — a story-scope validator firing at engine pre-apply. The recompute check resolves no Mystery Reserve entry and mediates no world-canon reads/writes (FOUNDATIONS §Rule 7 preserved; §3.9 story-scope-validator carve-out applies).

## Architecture Check

1. Gating the recompute on a pinned, shared canonicalization (rather than shipping a best-guess recompute in 001) is the clean choice: a false-mismatch validator erodes trust in the whole suite. Extracting one shared util consumed by both the producer's hashing step and the validator is the only way to keep recompute correctness from depending on two independently-maintained canonicalizations drifting apart. `page_packet_hash` recompute is correctly left to the existing downstream `page-plan-stchar-packet-integrity` (which already fails when a page-plan packet's declared hash diverges from the STCHAR frontmatter hash in use).
2. No backwards-compatibility shims: the extracted canonicalization util, if added, is net-new and reproduces existing producer output rather than aliasing a prior code path.

## Verification Layers

1. Recompute-and-compare correctness (if shipped) → unit test: a stale-`profile_hash` and a stale-`voice_block_hash` negative fixture fail; a current-hash fixture passes.
2. Canonicalization fidelity (if a shared util is extracted) → codebase grep-proof that the util is the single source of the byte projection AND a round-trip test confirming the util reproduces hashes for a known-good STCHAR fixture (no false mismatch on a correctly-generated record).
3. Held-back path (if recompute is NOT shipped) → manual review: the closeout records why (canonicalization not pinnable without altering producer output), and `page-plan-stchar-packet-integrity` is named as the partial downstream coverage. No code change ships in that branch; the §2.1 checks from 001 stand alone.

## What to Change

### 1. Locate-and-decide (mandatory first step)

- Confirm the canonicalization at `story-character-profile/SKILL.md` Phase 5 and that no shared `tools/` hashing util exists (per Assumption Reassessment item 1). Decide whether a deterministic, reusable canonicalization for `profile_hash` (complete body markdown) and `voice_block_hash` (`## Page-Plan Voice Block` slice) can be extracted into a shared util — e.g., `tools/validators/src/structural/stchar-hash-canonicalization.ts` — that pins the exact byte boundaries (heading-line inclusion, trailing-newline handling, UTF-8 encoding) without changing the producer's emitted output.

### 2a. If canonicalization is pinnable (recompute branch)

- Add the shared canonicalization util and have `stchar_body_integrity` recompute `profile_hash` and `voice_block_hash` from the body and compare against frontmatter; fail on mismatch.
- Add a stale-hash negative fixture (and a current-hash positive fixture) to `tools/validators/tests/structural/stchar-body-integrity.test.ts`.
- Leave `page_packet_hash` recompute unimplemented (field projection, not a body slice) — covered downstream by `page-plan-stchar-packet-integrity`.

### 2b. If canonicalization is NOT pinnable (held-back branch)

- Do not add the recompute check. Record in this ticket's closeout why it was held back (canonicalization implicit/non-reproducible without altering producer output) and name `page-plan-stchar-packet-integrity` as the partial downstream hash-staleness coverage.

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (modify — created by SPEC66STCHARBODINT-001)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify — created by SPEC66STCHARBODINT-001; recompute branch only)
- `tools/validators/src/structural/stchar-hash-canonicalization.ts` (new — recompute branch only, if a shared util is extracted)

## Out of Scope

- `page_packet_hash` recompute — definitionally not reproducible from the STCHAR body (field projection); covered downstream by `page-plan-stchar-packet-integrity`.
- The §2.1 section-presence + hash-shape checks (delivered by SPEC66STCHARBODINT-001) — this ticket only adds the recompute-and-compare.
- Changing the producer's (`story-character-profile`) emitted hash output — the extracted util must reproduce, not alter, current producer behavior.

## Acceptance Criteria

### Tests That Must Pass

1. **Recompute branch**: `node --test dist/tests/structural/stchar-body-integrity.test.js` — the stale-`profile_hash` and stale-`voice_block_hash` fixtures fail; a correctly-generated STCHAR fixture passes with no false mismatch.
2. **Held-back branch**: this ticket's closeout records why the recompute was held back; `npm test` stays green with no recompute logic added.
3. Either branch: `cd tools/validators && npm test` passes.

### Invariants

1. The recompute check (if shipped) covers `profile_hash` and `voice_block_hash` only; `page_packet_hash` is never recomputed from the body.
2. If a shared canonicalization util is extracted, it is the single source of the byte projection for both producer-intent reproduction and validator recompute — no second canonicalization exists.
3. A correctly-generated STCHAR never produces a false hash mismatch (the gate on shipping the check at all).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify, recompute branch only) — add stale-hash negative fixtures for `profile_hash` and `voice_block_hash` plus a current-hash positive fixture.
2. `None — held-back branch is documentation-only (closeout note); verification is that npm test stays green with no recompute added and existing pipeline coverage (page-plan-stchar-packet-integrity) is named in Assumption Reassessment.`

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/stchar-body-integrity.test.js` — targeted: recompute fixtures (recompute branch).
2. `cd tools/validators && npm test` — full validator suite (both branches).
3. The targeted `node --test` is the correct narrow boundary for the recompute branch; for the held-back branch the verification is the closeout note plus a green `npm test` proving no recompute logic was added.
