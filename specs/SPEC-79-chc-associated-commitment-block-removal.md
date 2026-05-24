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

`PG.input.choice_id` is the authoritative source of "which CHC the player selected" (`story-page.schema.json` lines 13, 36, 38; required field; pattern `^CHC-(0|[1-9][0-9]*)$`). The validator `chc_slt_selected_commitment_trace` (at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:388`) currently uses `CHC.associated_commitment_block` in BOTH its primary lookup (line 388: filter `inputChoice.associated_commitment_block === selectedSltId`) AND its fallback scan of `parent_page.emitted_choices` (line 397: same filter). Neither current path is load-bearing without the field; the replacement mechanism is structurally new — match `PG.input.choice_id` against `parent_page.emitted_choices`. That match is unambiguous by construction because CHC ids are unique per page (the `^CHC-(0|[1-9][0-9]*)$` pattern plus per-page id allocation), so the new resolver returns at most one CHC without consulting `associated_commitment_block` at all. The field therefore fails FOUNDATIONS §Story Bundles §5b's load-bearing test: "Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline." Once the resolver moves to `PG.input.choice_id`, the field's absence breaks no validation gate, replay primitive, predicate, fork operation, or audit-trail discipline that a working replacement cannot already cover.

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

### §3.3 World-index edge schema and parser

**Files:**
- `tools/world-index/src/schema/types.ts:108-168` — `STORY_EDGE_TYPES` enum carries `"choice_associated_storylet"` at line 111.
- `tools/world-index/src/parse/atomic.ts:795-801` — the CHC parser emits the `choice_associated_storylet` edge by reading `stringField(record, "associated_commitment_block")`.

**Current state:** the edge is one of the four CHC-emitted edges (`choice_grounded_in`, `choice_associated_storylet`, `choice_affordance_ordinal`, plus `created_at_page`). It points from a CHC node to the SLT named by `associated_commitment_block` (when non-null). It is the indexed-graph form of the field being removed.

**Proposed state:**
- Remove `"choice_associated_storylet"` from `STORY_EDGE_TYPES` in `types.ts`.
- Remove the `pushStoryEdgeIfReference(edges, node.node_id, "choice_associated_storylet", storySlug, stringField(record, "associated_commitment_block"))` call (the entire 7-line block at `atomic.ts:795-801`).
- Update the world-index test surface to match the new 3-edge CHC parity:
  - `tools/world-index/tests/types.test.ts:88` — drop the `STORY_EDGE_TYPES.includes("choice_associated_storylet")` assertion.
  - `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts:40` — drop the `edge("CHC-2", "SLT-3", "choice_associated_storylet")` expected entry.
  - `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts:31` — drop `"choice_associated_storylet"` from the expected edge-type list.

**Acceptance:** the world-index build emits no `choice_associated_storylet` edges; the three tests pass against the new 3-edge CHC parity (the original 4 was `created_at_page` + `choice_grounded_in` + `choice_associated_storylet` + `choice_affordance_ordinal`; the new 3 is `created_at_page` + `choice_grounded_in` + `choice_affordance_ordinal`). The retired-edge consumer at archived SPEC-51 §A.1 (which relied on `page_emitted_choice ∩ choice_associated_storylet` for selected-CHC resolution) is superseded by the new `PG.input.choice_id` resolver per §2.2; no live consumer remains.

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
- Remove both the primary `associated_commitment_block` lookup branch (line 388) AND the fallback `associated_commitment_block === selectedSltId` filter on `parent_page.emitted_choices` (line 397). Both currently use the field; neither survives.
- Replace `selectedChoiceForEvent()` with a structurally new resolver: look up `PG.input.choice_id` (on the child page) in the parent page's `emitted_choices`. Per-page CHC-id uniqueness makes the match unambiguous by construction — return the matching CHC or `undefined`. The `"ambiguous"` return shape is no longer reachable from the CHC-side resolution.
- The `ambiguous`-resolution → WARN downgrade (line 214, code `turn_resolution_unresolvable`) becomes structurally unreachable for the CHC-side and should be removed unless SLT-side resolution still produces ambiguity (review at implementation time; the existing code has no separate SLT-side ambiguity surface, so the WARN code is expected to be removable).
- The rest of the validator (SLT precondition evaluation against parent-page active records, `alias_bindings` validation against `SE.commitment.alias_bindings`) is unchanged.
- The verdict detail key `associated_commitment_block: recordId(storylet)` in `choiceVerdict()` (line 501) is a JSON-output debugging field, not a record-field read. Rename it to `selected_slt_id: recordId(storylet)` for accuracy.

**Acceptance:** The validator passes against any well-formed bundle whose CHCs lack the dropped field. The validator fails predictably (with a clear error code) on any bundle where `PG.input.choice_id` is missing or its referent is not in the parent's `emitted_choices`.

### §4.2 Other validators

Grep `tools/validators/src/` for `associated_commitment_block` and remove every reference. Per the SPEC-79 reassessment, TWO registered validators read the field: `chc_slt_selected_commitment_trace` (handled in §4.1 above) and `rule_choice_set_noncollapse` (handled in §4.3 below). Any other reference (test fixtures, scratch tests, generator templates) is repaired in §5, §6.1, and §6.3.

### §4.3 `rule_choice_set_noncollapse`

**File:** `tools/validators/src/rules/rule_choice_set_noncollapse.ts`.

**Current state:** the rule's `materialSignature()` (lines 115-129) builds a per-choice signature from FOUR axes — `target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, and `likely_state_pressure` — and flags page-emitted choice sets whose members all share an identical signature. The verdict message at line 203 names the four axes in its error string.

**Proposed state:**
- Drop the `associated_commitment_block` key from the `materialSignature()` return object (lines 120-123). The signature becomes a 3-axis stableStringify over `target_or_action_families`, `grounded_in_records`, and `likely_state_pressure`.
- Update the verdict message at line 203 to enumerate the 3 remaining axes: *"…with no material difference across `target_or_action_families`, `grounded_in.records`, or `likely_state_pressure`."*
- Update the regression fixture at `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts:176` to drop the `associated_commitment_block: "SLT-1"` key (handled with the broader test-file enumeration in §6.3).

**Acceptance:** the rule's collapse-detection power is reduced from 4 axes to 3, but `grounded_in.records` carries the storylet-grounding intent the dropped axis formerly hinted at. The remaining 3 axes remain sufficient to distinguish meaningfully different choices in well-formed bundles. The rule's other behavior (rhetorical-mark detection, `choice_set_collapse_observed` vs `choice_set_rhetorical_unmarked` codes) is unchanged.

## §5 Skill Changes

### §5.1 `branching-story-bootstrap`

**File:** `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (and any sibling files emitting CHC drafts).

**Current state (per iteration-2 verification):** "Each CHC carries the shared contract §4.5.12 shape: ... associated_commitment_block (SLT-<integer> if known, else null — turn-cycle will JIT)" at line 25.

**Proposed state:** Replace the parenthetical and remove the bullet. CHC emission no longer names an SLT. Replacement language: "Each CHC carries the shared contract §4.5.12 shape: id, story_id, created_at_page, surface_label, player_visible_intent, target_or_action_families, likely_state_pressure, grounded_in.records (from PG-1.state_snapshot.active_records). Selection happens at turn-cycle resolution time against the live pool."

Bootstrap's patch-plan op `create_chc_record` payloads drop the `associated_commitment_block` key.

### §5.2 `branching-story-turn-cycle`

**Files:** the turn-cycle `SKILL.md` itself does NOT reference `associated_commitment_block` (verified by grep at reassessment time). Three reference files do:
- `.claude/skills/branching-story-turn-cycle/references/phase-1-action-resolution.md:3` — Phase 1 reads the CHC's `associated_commitment_block` as one of the routing inputs.
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md:7` (CHC field enumeration mirroring bootstrap §4.5.12) and `:19` (the `choice_set_noncollapse` material-axis list).
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md:28` — describes the `choice_set_collapse` ERROR check and enumerates the 4 material axes.

**Current state:**
- Phase 1 routes the action by reading `CHC.action_family + associated_commitment_block + success_policy`. The named SLT id is one of the routing inputs.
- Phase 8 emits CHCs with the field populated when a likely SLT is pre-identifiable.
- Phase 9 enumerates the 4-axis material signature for the `choice_set_collapse` gate.

**Proposed state:**
- `phase-1-action-resolution.md:3`: rewrite so Phase 1 routes on `action_family` plus `grounded_in.records` (per Q2(a) in the SPEC-79 reassessment). Replace *"its action-family list, `associated_commitment_block`, and `success_policy` (if any) drive the routing"* with *"its action-family list, `grounded_in.records`, and `success_policy` (if any) drive the routing"*. The cleaner separation treats Phase 1 as intent-routing and Phase 2 as commitment-block-selection; SLT identity is no longer carried across the phase boundary.
- `phase-8-choice-generation.md:7`: drop `associated_commitment_block (SLT-<integer> or null — turn-cycle will JIT next turn if null)` from the §4.5.12 CHC-shape enumeration. Add the same one-line FOUNDATIONS-aligned note as §3.2 ("CHCs do not name a specific SLT; selection happens at resolution time").
- `phase-8-choice-generation.md:19`: drop `associated_commitment_block` from the material-axes list naming what `choice_set_noncollapse` checks (mirrors §4.3's 4→3 axis reduction).
- `phase-9-validation-gates.md:28`: drop `associated_commitment_block` from the same material-axes enumeration in the gate description (mirrors §4.3 and `phase-8-choice-generation.md:19`).
- Phase 8 generation: continue to emit CHCs without `associated_commitment_block`. The CHC's `grounded_in.records` (sourced from `PG-N.state_snapshot.active_records`) carries the binding intent the field formerly hinted at.
- No new fields added to CHC; the existing required fields are sufficient.

### §5.3 `commitment-block-authoring`

No direct change required. The skill emits SLTs, not CHCs; `associated_commitment_block` is a CHC field.

### §5.4 `branching-story-health-audit`

**File:** `.claude/skills/branching-story-health-audit/SKILL.md:185` (Phase 2 step 8, `choice_set_collapse_observed` finding).

**Current state:** line 185 enumerates four material axes that mirror the `rule_choice_set_noncollapse` validator: *"`target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, and `likely_state_pressure`."*. (Iteration-2's claim that the audit "reads `SE.commitment.selected_slt_id` and `selection_source` but not `CHC.associated_commitment_block` directly" is refuted by this line.)

**Proposed state:** rewrite line 185's material-axes list to drop `associated_commitment_block`, matching §4.3's 4→3 reduction. The corrected phrase reads: *"`target_or_action_families`, `grounded_in.records`, and `likely_state_pressure`."*. Keep the rest of the step (rhetorical-mark handling, `choice_set_collapse_observed` / `choice_set_rhetorical_unmarked` codes, ERROR severity, `turn_repair` repair_kind) unchanged.

**No stale-binding audit needed.** Any "stale binding" audit that this spec might be expected to add is structurally unnecessary post-removal — there is no field to go stale.

### §5.5 `branching-story-prose-attach`

No direct change required.

### §5.6 `docs/MACHINE-FACING-LAYER.md`

(Not a skill — included here under §5 for atomic-landing convenience; this is a documentation edit.)

**File:** `docs/MACHINE-FACING-LAYER.md:137`.

**Current state:** the world-index story-edge table includes a row for `choice_associated_storylet`: *"| `CHC` | `choice_associated_storylet` | `SLT` | The source commitment block named by `associated_commitment_block`. |"*.

**Proposed state:** delete the entire table row. The §3.3 edge-class removal makes the row stale; leaving it would document an edge type that no longer exists.

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

The fixture's `pages-prose-plans/PG-2.md` content (which contains the §7a turn-driver trace including "Player response mode: responds") is page-plan content, not CHC content; it remains unchanged because `player_response_mode` is canonical on the page-level turn-driver trace per SPEC-76.

**Implementation note (SPEC79CHCREM-009):** Red Kiln closeout exposed one same-seam validator consumer of the old per-CHC response-mode placement: `turn-cycle-output-grounding-integrity` checked response mode on CHC records before deciding whether to enforce CHC topical grounding. The landed repair moved response-mode authority to `SE.turn_driver.player_response_mode` while leaving the CHC grounding check on `grounded_in.records`.

### §6.2 Other fixtures

Grep `tools/validators/tests/fixtures/` for `associated_commitment_block`. Repair any other fixture with the same pattern (drop the key from CHC entries).

### §6.3 Test files referencing `associated_commitment_block`

Eleven non-fixture test files include CHC objects carrying `associated_commitment_block`. Each is repaired explicitly:

**Schema-shape assertions (must be updated, not just fixture-stripped):**
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts:81-82` — asserts the `story-choice` schema's `required[]` and `properties` lists byte-exactly. Remove `"associated_commitment_block"` from both arrays so the assertion matches the new shape. Also drop the `associated_commitment_block: null` keys in the CHC test fixtures at lines 310 and 460.
- `tools/world-mcp/tests/tools/get-record-schema.test.ts:299,306` — asserts CHC schema's `required[]` membership and `properties.associated_commitment_block` presence. Remove `"associated_commitment_block"` from the expected required-array and remove the `assert.ok(properties.associated_commitment_block)` line.

**Validator regression rewrite:**
- `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts:65,347` — these fixtures use `associated_commitment_block: "SLT-1"` to drive the validator's pre-removal soft-resolution path. Rewrite each case to exercise the new `PG.input.choice_id` resolver: the test bundle's PG must carry `input.choice_id: CHC-N` matching an emitted CHC on the parent page.

**Fixture key drops (schema-conformance fixtures, no behavioral logic at stake):**
- `tools/validators/tests/structural/record-schema-compliance-story-choice.test.ts:18` — drop `associated_commitment_block: null`.
- `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts:306` — drop `associated_commitment_block: null`.
- `tools/validators/tests/structural/stchar-structural-validators.test.ts:236` — drop `associated_commitment_block: null`.
- `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts:176` — drop `associated_commitment_block: "SLT-1"` (the fixture must still trigger the rule under the new 3-axis material signature; rewrite the test's choice-set construction to differ-or-collapse on the 3 surviving axes).
- `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts:150` — drop `associated_commitment_block: "SLT-1"`.
- `tools/validators/tests/integration/spec34-integration.test.ts:412` — drop `associated_commitment_block: "SLT-1"`.

**World-index parser tests (handled in §3.3, listed here for completeness):**
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts:21,40` — drop the `"associated_commitment_block: SLT-3"` line from the test CHC YAML AND drop the `edge("CHC-2", "SLT-3", "choice_associated_storylet")` expected entry.
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts:26,31` — drop the `"associated_commitment_block: SLT-3"` line AND drop `"choice_associated_storylet"` from the expected edge-type list.

## §7 Out of Scope

- **CHC `binding` object** (iteration-2 SPEC-79). Rejected; this spec is the SIMPLER repair the user redirected toward. Adding any new structural binding surface would reintroduce the temptation through the back door.
- **`CHC.late_bound: bool` flag** (iteration-1 R1 alternative path). Subsumed; the field's absence IS the late-bound default.
- **SSEL persistent selection-trace record** (iteration-2 SPEC-81). Unchanged rejection per `docs/triage/2026-05-24-slt-chc-overhaul-second-iteration-triage.md` and SPEC-51 §FOUNDATIONS Alignment §5b.
- **Rich SLT grounding fields** (iteration-2 SPEC-80). Unchanged rejection (re-tread of SPEC-77 §4 explicit cut).
- **Replay/fork live global pool as a separate spec** (iteration-2 SPEC-83). Subsumed by this removal — the live global pool semantics is automatic once the field is gone.
- **Storylet generation matrix** (iteration-2 SPEC-85). Narrowed and reassigned to SPEC-80 (storylet pool coverage diagnostics) per the iteration-2 redirection.
- **Indexed candidate retrieval** (iteration-2 SPEC-82). Reassigned to SPEC-81 per the iteration-2 redirection.
- **Per-CHC `player_response_mode` schema field**. The Red Kiln fixture's misuse of this field on CHC is repaired by §6.1, and SPEC79CHCREM-009 repaired the same-seam validator consumer to read `SE.turn_driver.player_response_mode`. Adding it to the CHC schema remains out of scope. If a future consumer truly needs per-CHC response-mode authority, that is a schema-change spec.
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
6. **Grep negative test**: `grep -r associated_commitment_block tools/ .claude/skills/ docs/ specs/SPEC-79*.md` returns matches only inside SPEC-79's own documentation (and inside this spec); no consumer surface retains the reference. Archived-spec matches under `archive/specs/` (e.g., SPEC-50, SPEC-51, SPEC-30, SPEC-24, SPEC-76) are acceptable historical retention and are intentionally excluded from the negative-test grep.

## §10 Implementation Notes

- The change is breaking at the schema level, but no production consumers exist. Migration burden is zero outside the in-repo test fixtures.
- Ship as a single atomic landing: schema + validator + bootstrap + turn-cycle + fixtures + contract. Splitting the surfaces risks a window where the schema rejects the field but consumers still emit it (or vice versa).
- After landing, the iteration-1 R1 alternative path (`CHC.late_bound: bool` flag) is closed permanently — its prerequisite was that the field remained.
- The iteration-2 SPEC-83 "live global pool replay" framing is automatically operationalized by this removal; SPEC-83 does not need to be written as a separate spec.
