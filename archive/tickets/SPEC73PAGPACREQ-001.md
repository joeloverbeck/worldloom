# SPEC73PAGPACREQ-001: Multi-label `required_because` parsing in page-plan validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modified `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (existing registered validator at `tools/validators/src/public/registry.ts`), `.claude/skills/_shared-templates/story-state-contract.md` (shared contract template consumed by story-pipeline skills per FOUNDATIONS §Story Bundles §5b), `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts`, and same-seam status/proof notes in `archive/specs/SPEC-73-page-packet-required-because-label-parsing.md`. No new public surface introduced; existing live diagnostic ids preserved.
**Deps**: None

## Problem

At intake, the §16a packet contract at `.claude/skills/_shared-templates/story-state-contract.md:466` documented a composite pipe-vocabulary for `Required because:` (`viewpoint | speaker | major_actor | direct_target | emotionally_salient | behavior_shapes_page | voice_shapes_page | offstage_causal`). VALSTCHAR-001 codified that prose receipts must carry the **verbatim composite** at `.claude/skills/_shared-templates/story-record-schemas.md` ("including every comma-separated qualifier"). But the page-plan validator at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` did not parse the composite — `requiredBecause` was captured as a single raw string (the `Required because:` regex match), and the voice-block requirement was an exact-match `SPEAKER_VOICE_REQUIRED.has(packet.requiredBecause)` against `new Set(["speaker", "viewpoint"])`. Historical consequences verified during intake:

- `Required because: speaker, direct_target` for an actual speaker → `"speaker, direct_target"` ∉ `SPEAKER_VOICE_REQUIRED` → **voice-block requirement silently skipped**.
- `Required because: voice_shapes_page` (single label, fully in the documented vocabulary at `story-state-contract.md:466`) → no validator ever checks for a voice block.
- `Required because: offstage_causal, direct_target` for a non-offstage STENT → exact-match `packet.requiredBecause === OFFSTAGE_REQUIRED_BECAUSE` evaluates false → locational guard silently skipped.

This was contract-drift correctness: the validator now enforces the already-documented contract. The source report (`archive/reports/character-bridge-consolidation-second-iteration.md` §11 path #4) rated this the only false-confidence path *"Preventable: yes"* without caveat. SPEC-73 (this ticket's source spec) is the validator-side closure.

## Assumption Reassessment (2026-05-23)

1. Verified against current codebase: the validator at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` now uses `PACKET_ROLE_VOCABULARY`, `VOICE_REQUIRING_LABELS`, and `requiredBecauseLabels` while preserving the raw `requiredBecause: string`. The validator remains registered through `tools/validators/src/public/registry.ts`; `unknown_role_label` flows through the existing framework wiring, so no registry change was needed.
2. Verified against `archive/specs/SPEC-73-page-packet-required-because-label-parsing.md` §4 Changes (parser + closed-vocabulary warning + contract one-liner + 8 tests) and §3 Out of Scope (no schema enforcement; no role-demand matrix; no `source_operational_fact_map` extension; no §16a overlay; no `packet_coverage` block; no repair-routing changes). The shared contract template at `.claude/skills/_shared-templates/story-state-contract.md:466` is verified to still document the eight-label vocabulary verbatim. The receipt-side verbatim-composite clause at `.claude/skills/_shared-templates/story-record-schemas.md` is verified to still mandate *"including every comma-separated qualifier"* — the receipt validator at `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` consumes the per-packet `requiredBecause` field byte-for-byte, so this ticket MUST preserve the raw `requiredBecause: string` field unchanged on the per-packet record type.
3. Cross-artifact boundary: this ticket touches three boundaries — the structural validator (`tools/validators/src/structural/`), the shared story-state contract template (`.claude/skills/_shared-templates/story-state-contract.md`, consumed by all story-pipeline skills per FOUNDATIONS §Story Bundles §5b), and the validator's test file (`tools/validators/tests/structural/`). The shared contract is the source of truth for the documented vocabulary; the validator enforces it; the tests pin the enforcement. The contract one-liner addition documents what the validator now enforces and MUST NOT introduce new vocabulary beyond the eight labels already at line 466. The receipt-side validator (`tools/validators/src/structural/prose-receipt-stchar-integrity.ts`) and its tests are out of scope — the per-packet `requiredBecause: string` field preservation per item 2 ensures no cross-boundary impact.
4. FOUNDATIONS §Tooling Recommendation (the "non-negotiable" section): the principle requires that LLM agents receive structured authority cited from canonical surfaces, not prose impression alone, and that "a validation judgment must cite the record id, packet layer, validator result, retrieved field, or named loaded authority it rests on, not model memory or impression alone." The fix moves the validator from prose-impression matching (exact-string equality on a captured raw string that may contain a comma-separated label set) to structural parsing (label-set membership against the documented enum). This realigns the validator with the §Tooling Recommendation principle SPEC-73 §6 alignment table cites. The fix does NOT validate literary adequacy (judgment remains in prose-attach `profile_fidelity[]` per SPEC-73 §6 row 3 rationale).
5. Canon Safety surface: the page-plan validator is a structural validator under `tools/validators/src/structural/` — per `tickets/README.md` Mandatory Pre-Implementation Check 9, the change must not weaken the Mystery Reserve firewall or silently resolve an MR entry. The validator does not touch `M-<integer>` records, does not read CF / OQ records, and does not gate canon writes — it gates story-bundle page-plan integrity (§16a packet structure). The change tightens an existing structural gate (catches composite labels that previously evaded voice-block enforcement) without introducing any new canon-pipeline surface; the Mystery Reserve firewall is unaffected. The diagnostic id `page_plan_stchar_packet_integrity.unknown_role_label` is a strict addition emitted at WARN severity; the existing live `missing_voice_block` and `offstage_packet_for_present_character` ids are preserved verbatim. SPEC-73 draft text said `missing_voice_block_for_speaker`, but live code and tests use `page_plan_stchar_packet_integrity.missing_voice_block`; this ticket preserves the live id to maintain audit-trail data-shape continuity.

## Architecture Check

1. Set-membership intersection is the minimal idiomatic fix that aligns the validator with the documented contract: parse `required_because` as a comma-separated label set (already the receipt-side contract per VALSTCHAR-001), then check set membership against the voice-requiring sub-set (`{speaker, viewpoint, voice_shapes_page}`) and against `{offstage_causal}` for the locational guard. Alternative approaches considered and rejected: (a) **schema-level enum enforcement** on the raw string — premature, no consumer demands it, breaks legacy plans (deferred to a future spec per SPEC-73 §3 Out of Scope); (b) **full role-demand matrix** (capability_mechanism / relationship_mechanism / promise_thread_carrier / consequence_carrier / plan_holder / emotion_holder / absence_matters / continuity_mention) — re-proposes the broad §16a role taxonomy the first-iteration character-bridge triage already rejected per SPEC-73 §3; (c) **refactor `requiredBecause` field shape** from `string` to `string[]` — breaks the VALSTCHAR-001 receipt contract that expects verbatim composite copy at `story-record-schemas.md`, and is unnecessary because parsing is internal to the validator. The chosen approach keeps the per-packet record's existing `requiredBecause: string` field (receipt-contract-preserving) and adds a parallel internal `requiredBecauseLabels: Set<string>` (or equivalent — e.g., the parser helper returns the set inline at each check site, no field stored on the per-packet record) for the set-membership checks.
2. No backwards-compatibility aliasing/shims introduced. Existing single-label packets continue to pass unchanged: single-label `speaker` parses to `{"speaker"}` which still intersects the voice-requiring set; single-label `offstage_causal` parses to `{"offstage_causal"}` which still trips the locational guard; single-label `emotionally_salient` parses to `{"emotionally_salient"}` which does not intersect the voice-requiring set (correctly no FAIL). Composite packets that newly FAIL are exactly the contract-drift cases the fix is designed to catch — they were always intended to require a voice block under the documented `story-state-contract.md:466` vocabulary. Legacy unknown-label packets emit `unknown_role_label` WARN (not FAIL) for one release per SPEC-73 §5 Migration; promotion to FAIL is reserved for a future spec that introduces schema-level enum enforcement.

## Verification Layers

1. **Composite voice-requiring labels gate correctly** → codebase grep-proof + new tests: `grep -n "VOICE_REQUIRING_LABELS\|PACKET_ROLE_VOCABULARY\|requiredBecauseLabels" tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` confirms the new constant + the set-membership refactor; new test cases per SPEC-73 §4.4 table rows 1, 3 assert FAIL on composite-with-speaker and single voice_shapes_page when no voice block is present, with diagnostic id `missing_voice_block`; row 2 asserts PASS on composite voice-requiring + voice block.
2. **Offstage_causal locational guard handles composites** → new test per SPEC-73 §4.4 row 5 asserts FAIL on `Required because: offstage_causal, direct_target` for a present (non-offstage) STENT with diagnostic id `offstage_packet_for_present_character`; row 6 asserts PASS on single-label `offstage_causal` for offstage STENT.
3. **Closed-vocabulary WARN-only** → new test per SPEC-73 §4.4 row 7 asserts PASS + WARN diagnostic `unknown_role_label` on `Required because: speaker, custom_unknown_label` + voice block (structural checks proceed; the unknown label does not block).
4. **Shared contract template documents the enforcement** → grep-proof `grep -n "comma-separated label set\|page_plan_stchar_packet_integrity validator requires" .claude/skills/_shared-templates/story-state-contract.md` confirms the one-sentence addition immediately after line 466. The cross-skill / cross-artifact mapping is preserved: contract → validator → tests, each layer verified by a distinct proof surface.
5. **FOUNDATIONS §Tooling Recommendation alignment** → manual review against `docs/FOUNDATIONS.md` §Tooling Recommendation: the fix moves a documented label vocabulary from prose-impression matching to deterministic set-membership; the principle is honored by tightening structural enforcement at a surface the contract already documents, without expanding what the validator gates beyond its existing §16a structural scope.

## Landed Changes

### 1. Parser helper in `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`

Added a module-internal parser helper that takes the captured raw string (the `Required because:` regex match result) and returns a `Set<string>` of parsed labels:

- Split on `,`, trim each entry, lowercase, drop empties.
- The parsed set is stored as `requiredBecauseLabels` on the internal packet record and consumed by the voice-block gate, offstage_causal locational guard, and unknown-label warning. The existing `requiredBecause: string` field is preserved for the receipt validator's byte-for-byte comparison contract.

### 2. Voice-block set-membership gate

Updated the voice-block requirement check from exact raw-string matching to set-intersection:

- Voice block required when the parsed set intersects `{speaker, viewpoint, voice_shapes_page}` (add `voice_shapes_page` to the requiring set — already in the documented vocabulary at `story-state-contract.md:466` but never previously checked).
- Diagnostic id `page_plan_stchar_packet_integrity.missing_voice_block` **UNCHANGED** (preserves the live audit-trail data shape; SPEC-73's `missing_voice_block_for_speaker` wording was draft drift).
- Diagnostic message updated to name the triggering label(s) found in the set (e.g., `"… 16a packet for STCHAR-<id> omits the voice/dialogue authority block (voice-requiring labels in set: speaker, voice_shapes_page)."`).
- Replaced `SPEAKER_VOICE_REQUIRED` with `VOICE_REQUIRING_LABELS = new Set(["speaker", "viewpoint", "voice_shapes_page"])`.

### 3. Offstage_causal locational guard set-membership refactor

Updated the existing `if (packet.requiredBecause === OFFSTAGE_REQUIRED_BECAUSE && stentLocation !== "offstage")` site to set-membership:

- Trigger when the parsed set contains `"offstage_causal"` (so composite `offstage_causal, direct_target` for a present STENT still trips the guard).
- Diagnostic id `page_plan_stchar_packet_integrity.offstage_packet_for_present_character` **UNCHANGED** (preserves audit-trail data shape per SPEC-73 §4.1 item 4).
- Retained the `OFFSTAGE_REQUIRED_BECAUSE` constant.

### 4. Closed-vocabulary warning

Defined the closed packet-role vocabulary in the validator as a module-level constant matching the eight labels already documented at `story-state-contract.md:466`:

```ts
const PACKET_ROLE_VOCABULARY = new Set([
  "viewpoint",
  "speaker",
  "major_actor",
  "direct_target",
  "emotionally_salient",
  "behavior_shapes_page",
  "voice_shapes_page",
  "offstage_causal",
] as const);
```

Emits `page_plan_stchar_packet_integrity.unknown_role_label` at **WARN** severity (not FAIL) when the parsed set contains a label outside `PACKET_ROLE_VOCABULARY`. Warning messages name the unknown label(s) and the §16a packet's STCHAR id; multiple unknown labels in one packet are enumerated in a single WARN.

### 5. Contract one-line confirmation in `.claude/skills/_shared-templates/story-state-contract.md`

Inserted one sentence immediately following the `Required because:` template line in `story-state-contract.md`:

```
`Required because:` is parsed as a comma-separated label set drawn from the closed vocabulary above. The `page_plan_stchar_packet_integrity` validator requires a voice/dialogue authority block when the set contains any of `speaker`, `viewpoint`, or `voice_shapes_page`, and forbids `offstage_causal` for any STENT whose `location` is not `offstage`. Labels outside the closed vocabulary emit a warning. The receipt-side verbatim-composite contract in `story-record-schemas.md` §4.6 is unchanged.
```

No new labels introduced; the note documents what §4.1 / §4.2 enforce. The insertion was anchored by the verbatim `Required because:` template line content, not by line number.

### 6. Test additions in `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts`

Added 8 new test cases per SPEC-73 §4.4 table, using the existing test file's fixture-setup conventions:

| Test fixture | Expected | Asserts |
|---|---|---|
| `Required because: direct_target, speaker.` + no voice block | FAIL `missing_voice_block` | Composite containing `speaker` triggers voice requirement (regression-pin for the verified bug) |
| `Required because: viewpoint, behavior_shapes_page.` + voice block | PASS | Composite voice-requiring label with proper voice block does not regress |
| `Required because: voice_shapes_page.` (single, documented, previously-unchecked) + no voice block | FAIL `missing_voice_block` | Documented-but-previously-unchecked label now correctly gates voice |
| `Required because: speaker.` (single, legacy) + voice block | PASS | Existing single-label packets unchanged |
| `Required because: offstage_causal, direct_target.` for present (non-offstage) STENT | FAIL `offstage_packet_for_present_character` | Composite offstage-causal still trips locational guard |
| `Required because: offstage_causal.` for offstage STENT + no voice block | PASS | Single-label legacy offstage path unchanged |
| `Required because: speaker, custom_unknown_label.` + voice block | PASS + WARN `unknown_role_label` | Unknown labels warn without failing; structural checks proceed |
| `Required because: emotionally_salient.` (single, documented, non-voice-requiring) + no voice block | PASS | Non-voice-requiring labels are not regressed into requiring voice |

The receipt-side tests in `prose-receipt-stchar-integrity.test.ts` need no change — the verbatim-composite contract VALSTCHAR-001 added is already correct (verified at Assumption Reassessment item 2).

## Files to Touch

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify) — parser helper, voice-block set-membership gate, offstage_causal set-membership refactor, `PACKET_ROLE_VOCABULARY` constant, `unknown_role_label` WARN-emitter
- `.claude/skills/_shared-templates/story-state-contract.md` (modify) — one-sentence contract addition immediately after the `Required because:` template line (currently at line 466; anchor by verbatim content)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify) — 8 new test cases per SPEC-73 §4.4 table
- `archive/specs/SPEC-73-page-packet-required-because-label-parsing.md` (modify) — implementation status note, live diagnostic-id correction, and archival outcome
- `archive/tickets/SPEC73PAGPACREQ-001.md` (modify) — truthful closeout

## Out of Scope

- **Closed-enum schema enforcement** of `required_because` (hard-rejecting unknown labels at JSON Schema validation) — conservative WARN-only path here; promote to schema-level enum only when a consumer demands it. Per SPEC-73 §3.
- **Role-demand matrix beyond voice** — `capability_mechanism`, `relationship_mechanism`, `promise_thread_carrier`, `consequence_carrier`, `plan_holder`, `emotion_holder`, `absence_matters`, `continuity_mention` — re-proposes the broad §16a role taxonomy the first-iteration character-bridge triage already rejected (SPEC-70 lineage). Per SPEC-73 §3.
- **Extending `source_operational_fact_map`** beyond the 10 `dramatic_core` fields — out-of-scope per SPEC-70 §4. Per SPEC-73 §3.
- **§16a `current_story_state_overlays` field** — deferred per SPEC-73 §3 + the triage record.
- **`packet_coverage` manifest block** — rejected per SPEC-73 §3.
- **Staleness-triage repair-routing changes** — already-resolved per SPEC-73 §3.
- **No record mutation, no `page_packet_hash` recomputation, no schema field changes, no other validator changes.** Parsing is internal to the validator; packet text is unchanged.
- **No edits to `tools/validators/src/structural/prose-receipt-stchar-integrity.ts`** or its tests — the receipt-side verbatim-composite contract VALSTCHAR-001 added is already correct.

## Acceptance Criteria

### Tests That Must Pass

1. All 8 new test cases per SPEC-73 §4.4 table pass: FAIL on composite voice-evading (row 1), single `voice_shapes_page` no-voice-block (row 3), composite offstage-on-present (row 5); PASS on composite-with-voice (row 2), legacy single-label `speaker` with voice (row 4), single-label `offstage_causal` on offstage STENT (row 6), single-label `emotionally_salient` no-voice-block (row 8); PASS + WARN on unknown-label-with-voice (row 7). Voice-block FAIL rows preserve the live diagnostic id `page_plan_stchar_packet_integrity.missing_voice_block`.
2. All existing tests in `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` continue to pass (no regression on legacy single-label packets).
3. From `tools/validators`, `npm test` passes (full validator suite — confirms no sibling structural validator regresses on the per-packet `requiredBecause: string` field preservation).

### Invariants

1. **Audit-trail data-shape invariant**: diagnostic ids `page_plan_stchar_packet_integrity.missing_voice_block` and `page_plan_stchar_packet_integrity.offstage_packet_for_present_character` are unchanged across the refactor. The new diagnostic id `page_plan_stchar_packet_integrity.unknown_role_label` is a strict addition emitted at WARN severity.
2. **Receipt-verbatim invariant**: the per-packet `requiredBecause: string` field is preserved verbatim (not removed, not normalized to a Set type) — `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` compares it byte-for-byte against the receipt's `required_because` per VALSTCHAR-001's contract at `.claude/skills/_shared-templates/story-record-schemas.md`.
3. **Documented-vocabulary invariant**: the `PACKET_ROLE_VOCABULARY` constant matches the eight labels at `.claude/skills/_shared-templates/story-state-contract.md:466` exactly; the contract addition in change §5 introduces no new vocabulary; promotion to schema-level enum enforcement is reserved for a future spec.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify) — 8 new test cases per SPEC-73 §4.4 table verify composite parsing + voice-requiring set membership + offstage_causal set membership + unknown-label WARN behavior. Mirror the existing file's fixture-setup conventions (packet text + STENT state + page state); Read the file before adding tests to ground the fixture patterns.

### Commands

1. From `tools/validators`: `npm test` — runs the full validator suite (includes the new 8 test cases + every existing structural validator test for regression coverage; also confirms invariant 2 by exercising any sibling test that consumes the per-packet `requiredBecause: string` field).
2. From `tools/validators`: `npm run build` — verifies TypeScript compilation (the `build` script runs `tsc -p tsconfig.json && chmod +x dist/src/cli/world-validate.js`; serves as the typecheck surface since the package exposes no separate `typecheck` script).
3. From `tools/validators`: `node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` after `npm run build` — runs only the modified validator's compiled test file for fast iteration on the new cases.

## Outcome

Implemented the SPEC-73 parser closure. `page_plan_stchar_packet_integrity` now parses `Required because:` into `requiredBecauseLabels` while preserving the raw `requiredBecause` string, applies voice-block and offstage checks by set membership, emits WARN-only `unknown_role_label` diagnostics for labels outside the documented vocabulary, and preserves the existing `missing_voice_block` / `offstage_packet_for_present_character` diagnostic ids. The shared story-state contract now documents the set parsing and receipt-side verbatim-composite invariant. The SPEC-73 spec now records the implementation and the corrected live diagnostic id.

## Verification Result

1. Pre-edit baseline: from `tools/validators`, `npm test` passed with 893 tests before implementation.
2. Typecheck/build: from `tools/validators`, `npm run build` passed after implementation.
3. Focused compiled test: from `tools/validators`, `node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` passed with 18 tests, including the 8 new SPEC-73 cases.
4. Grep proof: `grep -n "VOICE_REQUIRING_LABELS\|PACKET_ROLE_VOCABULARY\|requiredBecauseLabels" tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` found the closed vocabulary, voice-requiring set, internal parsed-label field, and set-membership consumers.
5. Contract proof: `grep -n "comma-separated label set\|page_plan_stchar_packet_integrity.*validator requires" .claude/skills/_shared-templates/story-state-contract.md` found the new §16a contract sentence.
6. Manual FOUNDATIONS / HARD-GATE review: `docs/FOUNDATIONS.md` and `docs/HARD-GATE-DISCIPLINE.md` were checked. This is a story-bundle structural validator tightening; it does not mutate canon, weaken Mystery Reserve handling, or bypass patch-engine/HARD-GATE write discipline.
7. Final package proof: from `tools/validators`, `npm test` passed with 901 tests after ticket closeout edits.

## Deviations

- SPEC-73 and the draft ticket named `page_plan_stchar_packet_integrity.missing_voice_block_for_speaker`, but the live validator and tests already used `page_plan_stchar_packet_integrity.missing_voice_block`. This ticket preserved the live id and truthed the spec/ticket wording instead of introducing a diagnostic-id rename.
- Package ignored artifacts `tools/validators/dist/` and `tools/validators/node_modules/` were already present before implementation. `dist/` was refreshed by the build/test commands and remains an expected ignored generated artifact.
