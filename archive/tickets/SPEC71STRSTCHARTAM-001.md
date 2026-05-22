# SPEC71STRSTCHARTAM-001: Validators stop checking the four STCHAR/packet hashes

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` structural validators (`stchar-body-integrity`, `page-plan-stchar-packet-integrity`, `prose-receipt-stchar-integrity`, `stchar-source-fact-coverage`); deletes `stchar-source-hash-matches-source`; `registry.ts` deregister.
**Deps**: None

## Problem

At intake, the story-bundle "hash integrity" layer treated every author edit of an STCHAR body, §16a packet, or source CHAR as corruption (SPEC-71 §1.2). This ticket removed the **read side** — the validators that recomputed and compared `profile_hash` / `voice_block_hash` / `page_packet_hash` / `source_char_hash` — while keeping every non-hash structural check those validators also enforce. It landed before 002 (schema/producer removal), so the next ticket can remove schema/producer fields without recompute-vs-absent validator failures.

## Assumption Reassessment (2026-05-22)

1. Historical intake evidence: all four validators existed at `tools/validators/src/structural/{stchar-body-integrity,page-plan-stchar-packet-integrity,prose-receipt-stchar-integrity,stchar-source-fact-coverage}.ts`; `stchar-source-hash-matches-source.ts` existed and was deleted; `registry.ts` imported/registered it. The landed code no longer imports `computeStcharProfileHash`, `computeStcharVoiceBlockHash`, or `computeStcharPagePacketHash` from `tools/validators/src/structural/`, and `stchar_source_fact_coverage` no longer emits `source_char_hash_mismatch`.
2. Specs/docs: SPEC-71 §1.3 validator rows + §2.1; the reassessment (this session) mapped the full consumer set and confirmed these are the read-side validators.
3. Cross-artifact boundary under audit: the hash-field contract shared between STCHAR frontmatter, the §16a page-plan packet, and the prose receipt — this ticket severs the validators' dependency on that contract without touching the contract's producers (002) or the docs (005).
4. FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority): STCHAR authority drift is no longer hash-detected after this change — mitigated because the structural packet checks (active-STCHAR membership, `required_because`, voice-block-presence, `CHAR-*` leak) and SPEC-70's `stchar_source_fact_coverage` (source-fact-map coverage off `source_char_id`) remain. §Story Bundles §5b (Schema-Minimalism) motivates the removal.
5. Canon-Safety surface: these are structural validators under `tools/validators/src/structural/` (they gate story-bundle record writes at engine pre-apply). Confirmed the change does NOT weaken the Mystery Reserve firewall or silently resolve an `M` — the four hashes are content-tamper detectors unrelated to mystery preservation; `rule7`-bearing validators are untouched.
6. Removed-validator blast radius: `stcharSourceHashMatchesSource` was removed from `tools/validators/src/public/registry.ts`; same-seam inventory surfaces also moved with it (`tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts`). Broader schema/fixture hash-field references remain intentionally present for sibling tickets 002, 006, and 008.

## Architecture Check

1. Severing the validators' hash dependency first (before schema/producer removal) keeps every intermediate tree state coherent: records still carry the hashes, the validators simply stop recomputing them — no broken validation pass between this ticket and 002.
2. No backwards-compatibility shim: the hash recompute branches are deleted outright, not feature-flagged. Non-hash checks are preserved in place.

## Verification Layers

1. `stchar_body_integrity` still fails a missing/duplicate/empty required section → unit test on the 13-section + SPEC-70 subsection model (no hash assertion).
2. `page_plan_stchar_packet_integrity` still fails a `CHAR-*` leak / missing `required_because` / absent speaker voice block → unit test.
3. `prose_receipt_stchar_integrity` still fails a `required_because` mismatch → unit test.
4. `stchar_source_fact_coverage` still fails missing source-fact-map coverage keyed off `source_char_id` (no `source_char_hash` gate) → unit test.
5. `stchar_source_hash_matches_source` no longer registered → `grep -n stcharSourceHashMatchesSource tools/validators/src/public/registry.ts` returns zero.

## Landed Changes

### 1. Remove hash recompute from the three recompute validators
`stchar-body-integrity.ts` deleted the `profile_hash`/`voice_block_hash` recompute+compare and retained the 13-section + SPEC-70 subsection presence/non-empty checks. `page-plan-stchar-packet-integrity.ts` deleted the `page_packet_hash` recompute and the profile/voice packet-vs-STCHAR comparisons; it retains active-STCHAR membership, `required_because`, voice-block-for-speaker, and `CHAR-*`-leak checks. `prose-receipt-stchar-integrity.ts` deleted the `page_packet_hash` recompute and profile/voice hash comparisons; it retains `required_because` verbatim match plus `packet_present`/`active_in_snapshot` consistency.

### 2. Drop the source-hash staleness gate from SPEC-70's coverage validator
`stchar-source-fact-coverage.ts` removed the `source_char_hash_mismatch` sub-check and the `source_char_hash` read; coverage continues keyed off `source_char_id` resolution.

### 3. Delete the source-hash validator + deregister
Deleted `stchar-source-hash-matches-source.ts`; removed its import + `structuralValidators[]` entry in `registry.ts`; updated validator inventory/count assertions.

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (modify)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify)
- `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` (modify)
- `tools/validators/src/structural/stchar-source-fact-coverage.ts` (modify)
- `tools/validators/src/structural/stchar-source-hash-matches-source.ts` (delete)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify)
- `tools/validators/tests/structural/prose-receipt-stchar-integrity.test.ts` (modify)
- `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (modify)
- `tools/validators/tests/structural/stchar-source-hash-matches-source.test.ts` (delete)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- The schema field removal + producer stamping (002).
- The `computeStchar*` helper deletion (004) — these validators stop *importing* the helpers here, but the helpers are deleted only after producers also stop importing.
- §16a / receipt contract docs (005); skill prose (007).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all four amended validators pass their structural fixtures; no hash assertion remains in validator logic.
2. `grep -rn "computeStcharProfileHash\|computeStcharVoiceBlockHash\|computeStcharPagePacketHash" tools/validators/src/structural/` → zero matches (recompute removed).
3. `grep -n "stcharSourceHashMatchesSource" tools/validators/src/public/registry.ts` → zero.

### Invariants

1. Every non-hash structural check (sections, subsections, `required_because`, `CHAR-*` leak, source-fact coverage) still fires.
2. No validator recomputes or compares any of the four hashes after this ticket.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` — replaced hash-mismatch cases with an ignore-legacy-hashes assertion; kept section/subsection cases.
2. `tools/validators/tests/structural/{page-plan-stchar-packet-integrity,prose-receipt-stchar-integrity,stchar-source-fact-coverage}.test.ts` — replaced hash-failure cases with ignore-legacy-hashes assertions; kept structural/coverage cases; deleted `stchar-source-hash-matches-source.test.ts`.
3. `tools/validators/tests/{structural/registry,integration/spec04-verification,integration/validate-patch-plan}.test.ts` — updated validator inventory and pre-apply execution counts after deleting one structural validator.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (tsc — confirms no dangling references to the deleted validator)

## Outcome

Completed: 2026-05-22.

The validators package no longer performs content-tamper hash recompute/compare on STCHAR body content, §16a STCHAR packets, prose receipts, or `source_char_hash` coverage staleness. The dedicated `stchar_source_hash_matches_source` structural validator and its test were deleted, and registry/inventory/count surfaces were updated from 92 to 91 structural validators / 104 to 103 total mechanized validators where applicable.

Non-hash structural checks remain in place: STCHAR body section/subsection checks, packet presence and active-STCHAR membership, `required_because`, speaker voice-block presence, receipt packet/snapshot consistency, profile-fidelity presence, source CHAR resolution, and source operational fact-map coverage.

## Verification Result

- `npm run build` from `tools/validators` — PASS.
- `node --test dist/tests/integration/spec04-verification.test.js` from `tools/validators` — PASS after registry count truthing.
- `node --test dist/tests/integration/validate-patch-plan.test.js` from `tools/validators` — PASS after STCHAR-family pre-apply execution count truthing.
- `node --test --test-concurrency=1 dist/tests/**/*.test.js` from `tools/validators` — PASS, 887/887.
- `npm test` from `tools/validators` — PASS, 887/887.
- `rg -n "computeStcharProfileHash|computeStcharVoiceBlockHash|computeStcharPagePacketHash|stcharSourceHashMatchesSource|stchar_source_hash_matches_source|source_char_hash_mismatch|hash_mismatch|hash_shape" tools/validators/src/structural tools/validators/tests/structural tools/validators/src/public/registry.ts tools/validators/README.md` — no owned stale hits; only unrelated `snapshot_replay_equality.state_hash_mismatch` hits when the broader `hash_mismatch` token is included.

## Deviations

- Same-seam package inventory surfaces were broader than the drafted file list: `tools/validators/README.md`, `spec04-verification.test.ts`, and `validate-patch-plan.test.ts` also needed updates because deleting one registered structural validator changes public inventory/count proof.
- The ticket intentionally does not remove schema-level hash requirements, producer stamping, receipt schema hash comparison fields, live/story fixtures carrying the fields, MCP projections, docs, or skills. Those are owned by sequenced sibling tickets 002-008.
