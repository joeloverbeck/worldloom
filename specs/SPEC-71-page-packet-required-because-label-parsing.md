# SPEC-71 — page-packet `required_because` multi-label parsing

**Status:** active
**Authored:** 2026-05-23
**Source triage:** [`docs/triage/2026-05-23-character-bridge-consolidation-second-iteration-triage.md`](../docs/triage/2026-05-23-character-bridge-consolidation-second-iteration-triage.md)
**Source report:** `reports/character-bridge-consolidation-second-iteration.md` §11 path #4, §15 Proposal 1 (parsing core only — the role-demand matrix is rejected; see Out of Scope §3)
**Prior lineage:** `archive/specs/SPEC-70-char-stchar-semantic-preservation.md`, `archive/tickets/VALSTCHAR-001-fix-page-packet-hash-contract.md`

## 1. Overview

Align the `page_plan_stchar_packet_integrity` validator to the §16a packet contract's already-documented composite label vocabulary so that voice-requiring labels (`speaker`, `viewpoint`, `voice_shapes_page`) trigger the voice-block requirement even when they appear inside a comma-separated `Required because:` value. Also fix the parallel exact-match drift in the `offstage_causal` locational check. Add a closed-vocabulary warning for labels outside the documented set. No new vocabulary. No new role-demand matrix. No schema change.

## 2. Context — verified contract drift

The §16a packet contract documents a composite pipe-vocabulary at `.claude/skills/_shared-templates/story-state-contract.md:466`:

```
- Required because: viewpoint | speaker | major_actor | direct_target | emotionally_salient | behavior_shapes_page | voice_shapes_page | offstage_causal.
```

VALSTCHAR-001 codified that prose receipts must carry the **verbatim composite** at `.claude/skills/_shared-templates/story-record-schemas.md:948`:

> the `required_because` must be the verbatim value the page-plan §16a packet declares for that STCHAR, including every comma-separated qualifier (e.g. `direct_target, emotionally_salient, behavior_shapes_page`), not an abbreviation to the first qualifier.

But the page-plan validator never parses the composite. At `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:218` the value is captured as a single raw string:

```ts
const required = packetText.match(/^\s+- Required because:\s*([^.\n]+)\.?/m)?.[1]?.trim() ?? "";
```

And at `:188` the voice-block requirement is an exact-match Set membership:

```ts
const SPEAKER_VOICE_REQUIRED = new Set(["speaker", "viewpoint"]);
// ...
if (SPEAKER_VOICE_REQUIRED.has(packet.requiredBecause) && !packet.hasVoiceBlock) { /* FAIL */ }
```

Consequences (verified on `main`):

- `Required because: speaker, direct_target` for an actual speaker → `requiredBecause = "speaker, direct_target"` ∉ `SPEAKER_VOICE_REQUIRED` → **voice-block requirement is silently skipped**.
- `Required because: voice_shapes_page` (single label, fully in the documented vocabulary) → no validator ever checks for a voice block.
- `Required because: offstage_causal, direct_target` for a non-offstage STENT → at `:141` the exact-match `packet.requiredBecause === OFFSTAGE_REQUIRED_BECAUSE` evaluates false, so the locational guard against an offstage-causal label on a present character is silently skipped.

This is the report's false-confidence path #4 — the only false-confidence path it rates "Preventable: yes" without caveat. The fix is contract-drift correctness: the validator should enforce the *already-documented* contract.

## 3. Out of Scope (deliberate)

| Item | Why excluded |
|---|---|
| Closed-enum **schema** enforcement of `required_because` (hard-rejecting unknown labels at schema validation) | Conservative warn-only path in §4.2 below avoids breaking legacy/experimental usage; promote to schema enum only when a consumer demands it. |
| Role-demand matrix beyond voice — `capability_mechanism`, `relationship_mechanism`, `promise_thread_carrier`, `consequence_carrier`, `plan_holder`, `emotion_holder`, `absence_matters`, `continuity_mention` | Re-proposes the broad §16a role taxonomy the first-iteration character-bridge triage already rejected (no named consumer; YAGNI; assigning these labels is itself author judgment). Folded into SPEC-70 lineage as out-of-scope. |
| Extending `source_operational_fact_map` beyond the 10 `dramatic_core` fields (`operational_class`, `source_anchor`) | Already deliberately out-of-scope per SPEC-70 §4. Body-capability coverage is contract + non-empty operational-home subsections (authoring discipline), not validator-gated, to avoid fragile prose parsing. |
| §16a `current_story_state_overlays` field | Deferred — see triage record. Real gap but coupled to the rejected role-demand matrix; revisit when a demonstrated stale-self rendering case appears with a concrete consumer. |
| `packet_coverage` manifest block | Rejected as the "checklist machine" the source report's own §12 warns against; coupled to rejected role labels; high authoring burden for marginal value. |
| Staleness-triage repair-routing changes | Already-resolved — prose-attach Phase 5 has the four-way ladder (`revise_prose` / `revise_page_plan` / `regenerate_stchar` / `run_turn_cycle_repair`); health-audit Phase 2m already distinguishes missing/stale/split/fidelity-drift authority. |

## 4. Changes

### 4.1 Validator — multi-label parsing

In `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`:

1. Parse `required_because` into a label set: split the captured string on commas, trim each entry, lowercase, drop empties. Store the set alongside the existing `requiredBecause` string field on the per-packet record (do **not** remove `requiredBecause` — downstream consumers still compare it verbatim against the receipt's `required_because`, per VALSTCHAR-001's contract).
2. Change the voice-block requirement to set-membership intersection: voice block required when the parsed set ∩ `{speaker, viewpoint, voice_shapes_page}` ≠ ∅. Add `voice_shapes_page` to the requiring set (already in the documented vocabulary but never checked).
3. Change the `offstage_causal` locational guard at `:141` to set-membership: trigger when the parsed set contains `offstage_causal` (so composite `offstage_causal, direct_target` still trips for present STENTs).
4. **Diagnostic ids unchanged.** Keep `page_plan_stchar_packet_integrity.missing_voice_block_for_speaker` and `page_plan_stchar_packet_integrity.offstage_packet_for_present_character` to avoid churning audit-trail data shape. Diagnostic message names the actual triggering label(s) found in the set (e.g., `"… omits the voice/dialogue authority block (voice-requiring labels in set: speaker, voice_shapes_page)."`).

### 4.2 Closed-vocabulary warning

Define the closed packet-role vocabulary in the validator as a module-level constant matching the eight labels already documented at `story-state-contract.md:466`:

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

Emit `page_plan_stchar_packet_integrity.unknown_role_label` at **WARN** severity (not FAIL) when the parsed set contains a label outside `PACKET_ROLE_VOCABULARY`. Warning message names the unknown label(s) and the §16a packet's STCHAR id. Rationale: legacy plans may carry experimental or pre-vocabulary labels; a warn window lets authors migrate without breaking existing bundles. Promote to FAIL only if a future spec adopts schema-level enum enforcement.

### 4.3 Contract one-line confirmation

Add one sentence to `.claude/skills/_shared-templates/story-state-contract.md` immediately following the `Required because:` template line at `:466`:

> `Required because:` is parsed as a comma-separated label set drawn from the closed vocabulary above. The `page_plan_stchar_packet_integrity` validator requires a voice/dialogue authority block when the set contains any of `speaker`, `viewpoint`, or `voice_shapes_page`, and forbids `offstage_causal` for any STENT whose `location` is not `offstage`. Labels outside the closed vocabulary emit a warning. The receipt-side verbatim-composite contract in `story-record-schemas.md` §4.6 is unchanged.

No new labels introduced. The note documents what §4.1 / §4.2 enforce.

### 4.4 Tests

Add to `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts`:

| Test | Expected | Purpose |
|---|---|---|
| `Required because: direct_target, speaker` + no voice block | **FAIL** `missing_voice_block_for_speaker` | Composite containing `speaker` must trigger voice requirement (regression-pin for the verified bug). |
| `Required because: viewpoint, behavior_shapes_page` + voice block | **PASS** | Composite voice-requiring label with proper voice block must not regress. |
| `Required because: voice_shapes_page` (single label) + no voice block | **FAIL** `missing_voice_block_for_speaker` | The documented but previously-unchecked label now correctly gates voice. |
| `Required because: speaker` (single label, legacy) + voice block | **PASS** | Existing single-label packets unchanged. |
| `Required because: offstage_causal, direct_target` for present (non-offstage) STENT | **FAIL** `offstage_packet_for_present_character` | Composite offstage-causal still trips locational guard. |
| `Required because: offstage_causal` for offstage STENT + no voice block | **PASS** | Single-label legacy offstage path unchanged. |
| `Required because: speaker, custom_unknown_label` + voice block | **PASS** + **WARN** `unknown_role_label` | Unknown labels warn without failing; structural checks proceed. |
| `Required because: emotionally_salient` (single, documented, non-voice-requiring) + no voice block | **PASS** | Non-voice-requiring labels are not regressed into requiring voice. |

The receipt-side tests in `prose-receipt-stchar-integrity.test.ts` need no change — the verbatim-composite contract VALSTCHAR-001 added is already correct.

## 5. Migration

- No record mutation. No schema change.
- Page plans with single-label `Required because:` values: **unchanged**.
- Page plans whose composite `Required because:` values include `speaker`, `viewpoint`, or `voice_shapes_page` and currently lack a voice block: **newly FAIL**. These are exactly the contract-drift cases the fix is designed to catch — they were always intended to require a voice block under the documented contract. Operator repair: add the voice block (or correct the label if the packet is genuinely non-voice).
- Page plans whose composite includes `offstage_causal` on a non-offstage STENT: **newly FAIL**. Same repair pattern — fix the label or fix the STENT location.
- Page plans using labels outside the documented vocabulary: **newly WARN** for one release; no FAIL. Authors should migrate to documented labels (or this spec's successor may promote unknown-label to FAIL with schema-enum enforcement, but that is explicitly out of scope here).

No `page_packet_hash` recomputation needed — the parsing is internal to the validator; the packet text is unchanged.

## 6. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles — state authority lives in records, not prose | aligns | The fix tightens an existing contract enforcement; no new state surface; no prose-as-state. |
| §Canonical Storage Layer — append-only, no silent retcon | aligns | Validator-only change; no record mutation; legacy single-label packets continue to pass. |
| §Tooling Recommendation — deterministic gates where they're cheap, judgment where they're not | aligns | Moves an already-documented label set into deterministic enforcement (cheap); does not validate literary adequacy (judgment remains in prose-attach `profile_fidelity[]`). |
| §Story Bundles — STCHAR is stable persona authority; volatile state is elsewhere | N/A | Defensive disclosure — the fix touches §16a packet structure but introduces no volatile-state material into STCHAR or §16a. |

## 7. Sequencing

Single-spec sprint; no inter-spec dependency. Ticket decomposition via `spec-to-tickets` will likely produce two tickets (validator + parser; tests + contract one-liner) or one combined ticket depending on diff size.

## 8. References

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:31, 141, 188, 218`
- `.claude/skills/_shared-templates/story-state-contract.md:466`
- `.claude/skills/_shared-templates/story-record-schemas.md:916, 948`
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts`
- `archive/specs/SPEC-70-char-stchar-semantic-preservation.md` §4 (lineage of deliberately out-of-scope items)
- `archive/tickets/VALSTCHAR-001-fix-page-packet-hash-contract.md` (receipt-side verbatim-composite contract)
- `reports/character-bridge-consolidation-second-iteration.md` §11 path #4, §15 Proposal 1 (parsing core only)
- `docs/triage/2026-05-23-character-bridge-consolidation-second-iteration-triage.md`
