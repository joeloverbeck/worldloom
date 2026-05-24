# SPEC-79 — Remove `CHC.associated_commitment_block`

**Spec ID:** SPEC-79
**Date:** 2026-05-24
**Source brainstorm:** `reports/slt-chc-overhaul-second-iteration.md` triaged at `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md`.
**Status:** active
**Supersedes:** the original SPEC-79 draft (story-bundle schema drift repairs) — the schema-drift content other than the Red Kiln CHC repair migrates to SPEC-82. The Red Kiln CHC repair is absorbed here because the fixture must be schema-conformant under the post-removal CHC shape regardless.

## §1 Goal

Remove the `CHC.associated_commitment_block` field from the story-choice schema and from every consumer (validator, bootstrap, turn-cycle, fixtures, contracts). The field is redundant with `PG.input.choice_id` for the validator's CHC-resolution purpose; its presence tempts turn-cycle into locking onto a stale SLT named at CHC-emission time when a now-grown live pool would yield a better selection. Removal eliminates the temptation structurally and makes branch-safe live-global-pool behavior the unconditional default.

## §2 Background

### §2.1 The user's iteration-1 concern, now operational

Iteration-1 R1 (`docs/triage/2026-05-23-slt-chc-overhaul-first-iteration-triage.md`) deferred the CHC-binding question pending playtest pain, with `CHC.late_bound: bool` as the minimal-flag alternative if pain emerged. The originating user redirected at iteration-2 triage: the operational pain is the field's mere presence (it locks turn-cycle's selection to an SLT named at emission time, even after the pool has grown). The minimal-flag alternative (`late_bound: bool`) is itself a temptation surface — it suggests there is some authorial benefit to NOT being late-bound. The cleaner repair is field removal.

### §2.2 Why removal is FOUNDATIONS-aligned

`PG.input.choice_id` is the authoritative source of "which CHC the player selected" (`story-page.schema.json` lines 13, 36, 38; required field; pattern `^CHC-(0|[1-9][0-9]*)$`). The validator `chc_slt_selected_commitment_trace` (at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:388`) currently uses `CHC.associated_commitment_block` as a soft primary lookup, falling back to scanning `parent_page.emitted_choices` when the soft lookup fails (line 397). The fallback path is the load-bearing one — it works without the field. The field therefore fails FOUNDATIONS §Story Bundles §5b's load-bearing test: "Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline." A field whose absence does not break any of those surfaces is by definition not load-bearing.

The behavior ChatGPT-Pro iteration-2 SPEC-83 ("live global pool replay") seeks is automatic once the field is removed: with no SLT named on the CHC, turn-cycle filters the live pool against the parent PG snapshot at resolution time. No `replay_policy` schema field is needed.

### §2.3 What is NOT being added

This spec deliberately does NOT add `binding`, `intent_signature`, `replay_policy`, `promise_limits`, `binding.mode`, `exact_slt_id`, or any other structural surface from ChatGPT-Pro iteration-2 SPEC-79. The straightforward removal is sufficient; adding new structural surface to express what the absent field expressed would re-introduce the temptation through the back door.

## §3 Schema Changes

### §3.1 `tools/validators/src/schemas/story-choice.schema.json`

**Current state (per iteration-2 verification, lines 5-15 + 54-57):**
- Required list: `["id", "story_id", "created_at_page", "surface_label", "player_visible_intent", "target_or_action_families", "likely_state_pressure", "associated_commitment_block", "grounded_in"]`
- `associated_commitment_block` type: `["string", "null"]`, pattern `^SLT-(0|[1-9][0-9]*)$`
- `additionalProperties: false`

**Proposed state:**
- Drop `associated_commitment_block` from `required[]`.
- Drop the `associated_commitment_block` property definition.
- No new properties added. `additionalProperties: false` remains.

**New required list:** `["id", "story_id", "created_at_page", "surface_label", "player_visible_intent", "target_or_action_families", "likely_state_pressure", "grounded_in"]`.

### §3.2 Shared story state contract

**File:** `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.12 (the CHC schema entry) and `.claude/skills/_shared-templates/story-state-contract.md` (any §4 or §6b reference to `associated_commitment_block`).

**Change:** Remove the `associated_commitment_block` line from the CHC schema entry. Add a one-line FOUNDATIONS-aligned note: "CHCs do not name a specific SLT. Selection happens at resolution time against the live pool filtered by `grounded_in.records`, `target_or_action_families`, and parent PG active records."

## §4 Validator Changes

### §4.1 `chc_slt_selected_commitment_trace`

**File:** `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`.

**Current state (per iteration-2 verification, line 388):**

```ts
if (inputChoice !== undefined && stringValue(asPlainRecord(inputChoice.parsed).associated_commitment_block) === selectedSltId) {
  return inputChoice;
}
```

Falls back at line 397 to scanning `parent_page.emitted_choices`.

**Proposed state:**
- Remove the primary `associated_commitment_block` lookup branch entirely.
- The fallback CHC resolution path becomes the primary path: resolve the selected CHC by matching `PG.input.choice_id` (on the child PG) against the emitted CHCs on the parent PG. This is unambiguous by construction (`PG.input.choice_id` is a single CHC id, not a set).
- The `ambiguous`-resolution → WARN downgrade (line 214, code `turn_resolution_unresolvable`) becomes structurally unreachable for the CHC-side of the resolution and may be retained only for the SLT-side ambiguity if any; or removed if the SLT-side resolution is also unambiguous after the simplification.
- The rest of the validator (SLT precondition evaluation against parent-page active records, `alias_bindings` validation against `SE.commitment.alias_bindings`) is unchanged.

**Acceptance:** The validator passes against any well-formed bundle whose CHCs lack the dropped field. The validator fails predictably (with a clear error code) on any bundle where `PG.input.choice_id` is missing or unresolvable.

### §4.2 Other validators

Grep `tools/validators/src/` for `associated_commitment_block` and remove every reference. Per iteration-2 verification the only registered validator that reads the field is `chc_slt_selected_commitment_trace`; any other reference (test fixtures, scratch tests, generator templates) is repaired in §5 and §6.

## §5 Skill Changes

### §5.1 `branching-story-bootstrap`

**File:** `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (and any sibling files emitting CHC drafts).

**Current state (per iteration-2 verification):** "Each CHC carries the shared contract §4.5.12 shape: ... associated_commitment_block (SLT-<integer> if known, else null — turn-cycle will JIT)" at line 25.

**Proposed state:** Replace the parenthetical and remove the bullet. CHC emission no longer names an SLT. Replacement language: "Each CHC carries the shared contract §4.5.12 shape: id, story_id, created_at_page, surface_label, player_visible_intent, target_or_action_families, likely_state_pressure, grounded_in.records (from PG-1.state_snapshot.active_records). Selection happens at turn-cycle resolution time against the live pool."

Bootstrap's patch-plan op `create_chc_record` payloads drop the `associated_commitment_block` key.

### §5.2 `branching-story-turn-cycle`

**Files:** `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 2 + Phase 8, plus any reference under `references/` that mentions `associated_commitment_block`.

**Current state:** turn-cycle Phase 2 currently uses `CHC.associated_commitment_block` as one of the eligibility hints when resolving the selected commitment. Phase 8 emits CHCs with the field populated when a likely SLT is pre-identifiable.

**Proposed state:**
- Phase 2: drop the `associated_commitment_block` eligibility hint. Filtering proceeds as today against `CHC.grounded_in.records`, `target_or_action_families`, plus the existing 10-step filter pipeline (`references/phase-2-3-commitment-and-state-delta.md` lines 5-17) and the SPEC-77 driver-compatibility filter.
- Phase 8: emit CHCs without `associated_commitment_block`. The CHC's `grounded_in.records` (sourced from `PG-N.state_snapshot.active_records`) carries the binding intent the field formerly hinted at.
- No new fields added to CHC; the existing required fields are sufficient.

### §5.3 `commitment-block-authoring`

No direct change required. The skill emits SLTs, not CHCs; `associated_commitment_block` is a CHC field.

### §5.4 `branching-story-health-audit`

If any audit phase references `associated_commitment_block` (per iteration-2 verification, the replay audit Phase 2a reads `SE.commitment.selected_slt_id` and `selection_source` but not `CHC.associated_commitment_block` directly), the references are dropped. Any "stale binding" audit that this spec might be expected to add is structurally unnecessary post-removal — there is no field to go stale.

### §5.5 `branching-story-prose-attach`

No direct change required.

## §6 Test Fixture Changes

### §6.1 Red Kiln Ambush fixture

**File:** `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` lines 180-253 (five CHC entries: CHC-21 through CHC-25).

**Current state (per iteration-2 verification):** Each entry has `id, story_id, created_at_page, choice_text, player_response_mode, grounded_in.records`. `choice_text` is not a schema field; `player_response_mode` belongs on `SE.turn_driver` per SPEC-76, not CHC; required CHC fields are missing.

**Proposed state:** Each CHC entry has the new required field set:

```json
{
  "id": "CHC-21",
  "story_id": "STORY-76",
  "created_at_page": "PG-2",
  "surface_label": "Protect Mara from the shot line.",
  "player_visible_intent": "Intervene to absorb or redirect the incoming shot.",
  "target_or_action_families": ["protect"],
  "likely_state_pressure": "Jon reacts to Varro's shot line under STPLAN-9 pressure.",
  "grounded_in": { "records": ["STPLAN-9"] }
}
```

Apply the same shape to CHC-22 through CHC-25 with their respective `target_or_action_families` and `likely_state_pressure` derived from the existing `grounded_in.records` and the surrounding fixture context (Varro ambush at the kiln). Drop `player_response_mode` from every CHC entry. Drop `choice_text` (replaced by `surface_label`).

The fixture's `pages-prose-plans/PG-2.md` content at JSON line 258 (which contains the §7a turn-driver trace including "Player response mode: responds") is page-plan content, not CHC content; it remains unchanged because `player_response_mode` IS canonical on the page-level turn-driver trace per SPEC-76.

### §6.2 Other fixtures

Grep `tools/validators/tests/fixtures/` for `associated_commitment_block`. Repair any other fixture with the same pattern (drop the key from CHC entries).

## §7 Out of Scope

- **CHC `binding` object** (iteration-2 SPEC-79). Rejected; this spec is the SIMPLER repair the user redirected toward. Adding any new structural binding surface would reintroduce the temptation through the back door.
- **`CHC.late_bound: bool` flag** (iteration-1 R1 alternative path). Subsumed; the field's absence IS the late-bound default.
- **SSEL persistent selection-trace record** (iteration-2 SPEC-81). Unchanged rejection per `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md` and SPEC-51 §FOUNDATIONS Alignment §5b.
- **Rich SLT grounding fields** (iteration-2 SPEC-80). Unchanged rejection (re-tread of SPEC-77 §4 explicit cut).
- **Replay/fork live global pool as a separate spec** (iteration-2 SPEC-83). Subsumed by this removal — the live global pool semantics is automatic once the field is gone.
- **Storylet generation matrix** (iteration-2 SPEC-85). Narrowed and reassigned to SPEC-80 (storylet pool coverage diagnostics) per the iteration-2 redirection.
- **Indexed candidate retrieval** (iteration-2 SPEC-82). Reassigned to SPEC-81 per the iteration-2 redirection.
- **Per-CHC `player_response_mode` schema field**. The Red Kiln fixture's misuse of this field on CHC is repaired by §6.1; adding it to the CHC schema is out of scope. If a future consumer surfaces, that is a schema-change spec.
- **Migration of legacy story bundles** containing `associated_commitment_block`. No production story bundles exist (per the user's redirection note that the prior production story was deleted before this overhaul); the only consumers of the field in the repo are the test fixtures repaired in §6.

## §8 FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5b (Schema-Minimalism) | aligns | This spec REMOVES a non-load-bearing field. The field's CHC-resolution purpose is already covered by `PG.input.choice_id` + the validator's fallback path. Removing the field is the schema-minimalism action the principle prescribes. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | aligns | Removing the CHC→SLT name removes a temptation to author a CHC AS a specific commitment block (which would invert the §5a abstraction: SLTs are reusable causal moves authored separately from the CHCs that may select them). |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape) | aligns | The field's removal makes SLT selection unconditionally local at resolution time, against present state. There is no longer a way to encode a future-directed "this CHC will resolve to this SLT" promise at CHC-emission time. |
| Validation Rule 1 (No Floating Facts) | aligns | The CHC's binding "fact" (which active record is being pressed against) is now expressed exclusively through `grounded_in.records` and `target_or_action_families`, both already required. No fact floats. |
| Validation Rule 6 (No Silent Retcons) | aligns | This spec is the explicit retcon of iteration-1 R1's deferral, with the iteration-2 redirection recorded in the source-brainstorm triage file. The decision reversal is auditable. |

## §9 Validation Tests

1. **Schema-validator integration**: After §3.1 change, validating a CHC without `associated_commitment_block` passes; validating a CHC WITH `associated_commitment_block` set fails with the standard `additionalProperties: false` error.
2. **`chc_slt_selected_commitment_trace` behavior**: A bundle with a SE.commitment.selected_slt_id, child PG with `input.choice_id: CHC-N`, and parent PG with emitted CHC-N (whose `grounded_in.records` and predicates the selected SLT satisfies) passes the validator. A bundle whose child PG's `input.choice_id` references a CHC not in the parent's `emitted_choices` fails with a clear code.
3. **Red Kiln Ambush fixture**: After §6.1, the fixture validates against the new CHC schema with zero errors. The integration test that mutates the fixture to trigger `turn_driver_hidden_state_leak` continues to pass.
4. **Bootstrap end-to-end**: A bootstrap run produces CHCs without `associated_commitment_block`; the produced bundle passes all 8 shared hard gates including the (updated) trace closure gate.
5. **Turn-cycle end-to-end on a synthetic bundle**: Phase 2 selects an SLT from the live pool without consulting any per-CHC SLT hint; Phase 8 emits CHCs without the field; the resulting state is replay-equivalent under `snapshot_replay_equality`.
6. **Grep negative test**: `grep -r associated_commitment_block tools/ .claude/skills/ specs/SPEC-79*.md` returns matches only inside SPEC-79's own §3 and §4 documentation (and inside this spec); no consumer surface retains the reference.

## §10 Implementation Notes

- The change is breaking at the schema level, but no production consumers exist. Migration burden is zero outside the in-repo test fixtures.
- Ship as a single atomic landing: schema + validator + bootstrap + turn-cycle + fixtures + contract. Splitting the surfaces risks a window where the schema rejects the field but consumers still emit it (or vice versa).
- After landing, the iteration-1 R1 alternative path (`CHC.late_bound: bool` flag) is closed permanently — its prerequisite was that the field remained.
- The iteration-2 SPEC-83 "live global pool replay" framing is automatically operationalized by this removal; SPEC-83 does not need to be written as a separate spec.
