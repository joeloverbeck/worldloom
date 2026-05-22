# SPEC71STRSTCHARTAM-001: Validators stop checking the four STCHAR/packet hashes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` structural validators (`stchar-body-integrity`, `page-plan-stchar-packet-integrity`, `prose-receipt-stchar-integrity`, `stchar-source-fact-coverage`); deletes `stchar-source-hash-matches-source`; `registry.ts` deregister.
**Deps**: None

## Problem

The story-bundle "hash integrity" layer treats every author edit of an STCHAR body, §16a packet, or source CHAR as corruption (SPEC-71 §1.2). This ticket removes the **read side** — the validators that recompute and compare `profile_hash` / `voice_block_hash` / `page_packet_hash` / `source_char_hash` — while keeping every non-hash structural check those validators also enforce. It must land before 002 (schema/producer removal): if the schema drops the fields while a validator still recomputes-and-compares, the validator compares a fresh hash against an absent stored value and FAILs every STCHAR.

## Assumption Reassessment (2026-05-22)

1. Codebase: all four validators exist at `tools/validators/src/structural/{stchar-body-integrity,page-plan-stchar-packet-integrity,prose-receipt-stchar-integrity,stchar-source-fact-coverage}.ts`; `stchar-source-hash-matches-source.ts` exists (to delete); `registry.ts:107 structuralValidators[]` imports/registers them. `stchar-body-integrity.ts:231/242` recompute profile/voice; `page-plan-stchar-packet-integrity.ts:170` and `prose-receipt-stchar-integrity.ts:239` recompute `page_packet_hash`; `stchar-source-fact-coverage.ts:66,85-88` use `source_char_hash` as a `source_char_hash_mismatch` staleness gate.
2. Specs/docs: SPEC-71 §1.3 validator rows + §2.1; the reassessment (this session) mapped the full consumer set and confirmed these are the read-side validators.
3. Cross-artifact boundary under audit: the hash-field contract shared between STCHAR frontmatter, the §16a page-plan packet, and the prose receipt — this ticket severs the validators' dependency on that contract without touching the contract's producers (002) or the docs (005).
4. FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority): STCHAR authority drift is no longer hash-detected after this change — mitigated because the structural packet checks (active-STCHAR membership, `required_because`, voice-block-presence, `CHAR-*` leak) and SPEC-70's `stchar_source_fact_coverage` (source-fact-map coverage off `source_char_id`) remain. §Story Bundles §5b (Schema-Minimalism) motivates the removal.
5. Canon-Safety surface: these are structural validators under `tools/validators/src/structural/` (they gate story-bundle record writes at engine pre-apply). Confirmed the change does NOT weaken the Mystery Reserve firewall or silently resolve an `M` — the four hashes are content-tamper detectors unrelated to mystery preservation; `rule7`-bearing validators are untouched.
6. Removed-validator blast radius: `grep -rn stcharSourceHashMatchesSource tools/ .claude/skills/ docs/ specs/` → registry import + array entry only (no other consumer); the validator id `stchar_source_hash_matches_source` in any fixture/doc must be removed alongside.

## Architecture Check

1. Severing the validators' hash dependency first (before schema/producer removal) keeps every intermediate tree state coherent: records still carry the hashes, the validators simply stop recomputing them — no broken validation pass between this ticket and 002.
2. No backwards-compatibility shim: the hash recompute branches are deleted outright, not feature-flagged. Non-hash checks are preserved in place.

## Verification Layers

1. `stchar_body_integrity` still fails a missing/duplicate/empty required section → unit test on the 13-section + SPEC-70 subsection model (no hash assertion).
2. `page_plan_stchar_packet_integrity` still fails a `CHAR-*` leak / missing `required_because` / absent speaker voice block → unit test.
3. `prose_receipt_stchar_integrity` still fails a `required_because` mismatch → unit test.
4. `stchar_source_fact_coverage` still fails missing source-fact-map coverage keyed off `source_char_id` (no `source_char_hash` gate) → unit test.
5. `stchar_source_hash_matches_source` no longer registered → `grep -n stcharSourceHashMatchesSource tools/validators/src/public/registry.ts` returns zero.

## What to Change

### 1. Remove hash recompute from the three recompute validators
`stchar-body-integrity.ts`: delete the `profile_hash`/`voice_block_hash` recompute+compare (lines ~231-242); retain the 13-section + SPEC-70 subsection presence/non-empty checks. `page-plan-stchar-packet-integrity.ts`: delete the `page_packet_hash` recompute+compare (~170) and the profile/voice packet-vs-STCHAR comparisons; retain active-STCHAR membership, `required_because`, voice-block-for-speaker, `CHAR-*`-leak. `prose-receipt-stchar-integrity.ts`: delete the `page_packet_hash` recompute (~239) and profile/voice hash comparisons; retain `required_because` verbatim match + `packet_present`/`active_in_snapshot`.

### 2. Drop the source-hash staleness gate from SPEC-70's coverage validator
`stchar-source-fact-coverage.ts`: remove the `source_char_hash_mismatch` sub-check (~85-88) and the `source_char_hash` read (~66); coverage continues keyed off `source_char_id` resolution.

### 3. Delete the source-hash validator + deregister
Delete `stchar-source-hash-matches-source.ts`; remove its import + `structuralValidators[]` entry in `registry.ts`.

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (modify)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify)
- `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` (modify)
- `tools/validators/src/structural/stchar-source-fact-coverage.ts` (modify)
- `tools/validators/src/structural/stchar-source-hash-matches-source.ts` (delete)
- `tools/validators/src/public/registry.ts` (modify)
- existing validator unit tests under `tools/validators/tests/structural/` (modify — drop hash assertions, keep structural)

## Out of Scope

- The schema field removal + producer stamping (002).
- The `computeStchar*` helper deletion (004) — these validators stop *importing* the helpers here, but the helpers are deleted only after producers also stop importing.
- §16a / receipt contract docs (005); skill prose (007).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all four amended validators pass their structural fixtures; no hash assertion remains.
2. `grep -rn "computeStcharProfileHash\|computeStcharVoiceBlockHash\|computeStcharPagePacketHash" tools/validators/src/structural/` → zero matches (recompute removed).
3. `grep -n "stcharSourceHashMatchesSource" tools/validators/src/public/registry.ts` → zero.

### Invariants

1. Every non-hash structural check (sections, subsections, `required_because`, `CHAR-*` leak, source-fact coverage) still fires.
2. No validator recomputes or compares any of the four hashes after this ticket.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` — drop hash-mismatch cases, keep section cases.
2. `tools/validators/tests/structural/{page-plan-stchar-packet-integrity,prose-receipt-stchar-integrity,stchar-source-fact-coverage}.test.ts` — drop hash cases, keep structural/coverage cases; delete `stchar-source-hash-matches-source.test.ts`.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (tsc — confirms no dangling references to the deleted validator)
