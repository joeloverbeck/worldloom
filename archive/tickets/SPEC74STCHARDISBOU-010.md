# SPEC74STCHARDISBOU-010: page-plan-stchar-packet-integrity.ts current-state grounding extension

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (2 new checks + 2 new diagnostic ids); `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (extend with new cases)
**Deps**: `archive/tickets/SPEC74STCHARDISBOU-003.md`

## Problem

At intake, `page-plan-stchar-packet-integrity.ts` already validated §16a packets for `Required because:` multi-token parsing (SPEC-73), voice-block requirement, and `offstage_causal` locational guards, but did not check whether current-state record ids cited in the packet body actually resolved in the bundle and were active in the page's snapshot. Without this check, a §16a packet could cite a stale `STEMO-5` that had already been superseded — the prose would render against a no-longer-active record, breaking the projection-vs-authority contract SPEC74STCHARDISBOU-003 establishes. A second missing check: when the packet declared `Current-state grounding records: none; stable STCHAR authority only.`, no enforcement prevented the packet body from contradictorily citing current-state record ids elsewhere.

## Assumption Reassessment (2026-05-23)

1. Verified current `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` shape: SPEC-73's `Required because:` multi-token parsing at lines 215, 222-229; voice-block requirement via set intersection at lines 169-184; `offstage_causal` locational guard via set membership; `unknown_role_label` WARN-only diagnostic. No `stale_current_state_reference` or `grounding_records_none_with_citations` checks currently exist (per SPEC-74 §4.12 these are net-new).
2. Verified SPEC-74 §4.12 specifies the 2 new checks + their diagnostic ids; §3 Out of Scope explicitly drops the source-report's §6.12 (5) check (the hash-stability assertion is refuted by SPEC-71). The new checks depend on the `Current-state grounding records:` field convention established by `archive/tickets/SPEC74STCHARDISBOU-003.md` — without that contract in place, the new field is unrecognized and the second check has nothing to gate on. **This structural dependency is now satisfied by `archive/tickets/SPEC74STCHARDISBOU-003.md`.**
3. Cross-skill boundary under audit: this validator gates §16a packet integrity at the validator-framework run-loop; the new diagnostic ids (`stale_current_state_reference`, `grounding_records_none_with_citations`) feed downstream consumers (health-audit, prose-attach receipts). The packet contract being enforced IS the contract defined by `_shared-templates/story-state-contract.md` §16a (SPEC74STCHARDISBOU-003).
4. FOUNDATIONS principle restated: §Tooling Recommendation ("LLM agents should never operate on prose alone") — both new checks are structural: check (1) resolves cited record ids against the bundle's known records and `PG.state_snapshot.active_records[]`; check (2) parses the explicit `Current-state grounding records:` field value and grep-checks for record-id references elsewhere in the packet text. Neither parses free-prose semantics.
5. HARD-GATE / Canon Safety Check surface touched: this is a structural validator under `tools/validators/src/structural/`; modifying it engages this item. The new checks strengthen the §16a packet gate by enforcing the cited-current-state-records ⇄ bundle-records ⇄ page-active-records resolution chain.
6. Reassessment correction: the drafted record-id list in the implementation plan omitted `PG` and `SE`, but SPEC-74 §4.12, SPEC-74 §7, the §16a shared template from `archive/tickets/SPEC74STCHARDISBOU-003.md`, and this ticket's own Architecture Check all name the own-page `PG` / own-event `SE` exception. The implementation therefore treats `PG-*` and `SE-*` references as in-scope structural references: they pass only for the current page id or the page's `input.resolved_event_id` unless they are otherwise active in `PG.state_snapshot.active_records[]`.

## Architecture Check

1. The new checks extend the existing validator with two structural rules; preserve SPEC-73's parsing logic (lines 215, 222-229) and existing checks (voice-block + offstage_causal). The check (1) record-id resolution requires reading `PG.state_snapshot.active_records[]` from the page record — this data is already loaded by the validator framework for adjacent checks. Check (2) is a string-comparison on the `Current-state grounding records:` field value against record-id grep findings in the rest of the packet text — no new data dependency.
2. The own-page SE/PG exception in check (1) is structurally correct: a §16a packet on page PG-N may naturally cite its own page PG-N as context (e.g., "as of PG-N, the protagonist is in <location>"), and the event SE-M that the page records in `input.resolved_event_id` is the page's own event by definition. Excluding these from the active_records lookup prevents false positives without weakening the gate.
3. No backwards-compatibility shims; existing packets that cite stale records will fail. The migration covers existing red-bunny prose-plans (SPEC74STCHARDISBOU-013).

## Verification Layers

1. **New checks present in the validator code** → codebase grep-proof: `grep -nE 'stale_current_state_reference|grounding_records_none_with_citations' tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` returns ≥2 matches (one per diagnostic id).
2. **SPEC-73 parsing logic preserved** → grep-proof: `grep -n 'requiredBecauseLabels\|VOICE_REQUIRING_LABELS' tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` returns ≥2 matches (the SPEC-73 surface remains intact).
3. **Tests cover positive + negative cases** → `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` extended with the cases enumerated in SPEC-74 §7.

## Landed Changes

### 1. Added check (1): stale-current-state-reference detection

When a §16a packet body cites a current-state or page/event grounding record id (`PG-N`, `SE-N`, `STEMO-N`, `BEL-N`, `STPLAN-N`, `SREL-N`, `STSTAT-N`, `STOBJ-N`, `STLOC-N`, `THR-N`, `OBL-N`, `CNSQ-N`, `CLK-N`, `STSEC-N`, `STQ-N`) in any field other than the `Current-state grounding records:` line, each cited record must:

- (a) resolve in the same story bundle;
- (b) be present in `PG.state_snapshot.active_records[]` for that page UNLESS the cited record is the page's own `SE` or `PG`;
- (c) be in an allowed current-state record class (NEVER world `CHAR-*`).

Violations fail with diagnostic id `stale_current_state_reference`. The failure message names the page id, STCHAR id, cited record id, and packet field.

### 2. Added check (2): grounding-records-none-with-citations detection

When the packet's `Current-state grounding records:` field reads `none; stable STCHAR authority only` (case-insensitive, optional trailing period), the packet body must not cite any current-state record id elsewhere. Violations fail with diagnostic id `grounding_records_none_with_citations`.

### 3. Preserved post-SPEC-71 no-hash behavior

The validator still ignores legacy `profile_hash`, `voice_block_hash`, and `page_packet_hash` text in packet fixtures. No STCHAR hash-stability check was added.

## Files to Touch

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify — extend with new test cases)

## Out of Scope

- Re-spec'ing SPEC-73's multi-token parsing (already-landed; SPEC-74 §3 Out of Scope explicitly drops §6.12 (1) and (2)).
- Any STCHAR hash-stability assertion (refuted by SPEC-71; SPEC-74 §3 explicitly drops §6.12 (5)).
- The `Current-state grounding records:` field convention itself (`archive/tickets/SPEC74STCHARDISBOU-003.md` — this ticket's completed dependency).
- Migration of existing red-bunny prose-plans that don't yet carry the field (SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'stale_current_state_reference|grounding_records_none_with_citations' tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` returns ≥2 matches.
2. From `tools/validators`: `npm test` PASSES with all new test cases AND existing SPEC-73-introduced test cases (no regression).
3. A representative §16a packet citing `STEMO-1` where `STEMO-1` IS active in `PG.state_snapshot.active_records[]` PASSES.
4. A representative §16a packet citing `BEL-2` where `BEL-2` is NOT active in the page snapshot FAILS with `stale_current_state_reference`.
5. A representative §16a packet with `Current-state grounding records: none; stable STCHAR authority only.` but body cites `STPLAN-1` FAILS with `grounding_records_none_with_citations`.
6. Two pages projecting different active `STEMO` records from the same STCHAR PASS (no hash check, no stability requirement — the post-SPEC-71 packet has no hash fields to be stable across).

### Invariants

1. Every current-state record id cited in a §16a packet (outside the `Current-state grounding records:` line) MUST resolve in the bundle AND be active in the page snapshot (with own-page SE/PG exception).
2. The `Current-state grounding records: none; stable STCHAR authority only.` declaration is binding — the packet body MUST NOT cite current-state record ids elsewhere.
3. No STCHAR hash field is checked anywhere in this validator; SPEC-71's strip is preserved.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — extended with representative active, inactive, unresolved, no-grounding contradiction, own-page PG/SE, and two-page/same-STCHAR projection cases.

### Commands

1. From `tools/validators`: `node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` after `npm run build` (focused compiled test for the modified validator)
2. From `tools/validators`: `npm test` (confirms all validator tests pass, including new + existing)
3. `grep -nE 'stale_current_state_reference|grounding_records_none_with_citations' tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (confirms new diagnostic ids present)

## Outcome

Completed: 2026-05-23

- Extended `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` so §16a packet fields outside `Current-state grounding records:` fail when they cite unresolved or inactive current-state/page-event grounding records.
- Added the explicit `Current-state grounding records: none; stable STCHAR authority only` contradiction check.
- Preserved SPEC-73 role-label parsing and voice-block checks, and preserved SPEC-71 no-hash behavior.
- Extended `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` from 18 to 24 tests.

## Verification Result

1. Pre-edit baseline from `tools/validators`: `npm test` passed with 925 tests.
2. `npm run build` from `tools/validators` passed after implementation.
3. `node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` from `tools/validators` passed with 24 tests.
4. `npm test` from `tools/validators` passed with 931 tests.
5. `grep -nE 'stale_current_state_reference|grounding_records_none_with_citations' tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` returned the two landed diagnostic-id sites.
6. `grep -n 'requiredBecauseLabels\|VOICE_REQUIRING_LABELS' tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` confirmed the SPEC-73 parsing and voice-block surfaces remain present.

## Deviations

- The drafted red-bunny prose-plan dry-run was not executed because `tickets/SPEC74STCHARDISBOU-013.md` still owns red-bunny migration/capstone fixture work. This ticket proves the validator behavior with focused synthetic structural fixtures.
- The drafted current-state record-id list omitted `PG` and `SE`; reassessment corrected the implementation boundary to match SPEC-74 §4.12, SPEC-74 §7, and the §16a template established by `archive/tickets/SPEC74STCHARDISBOU-003.md`.
