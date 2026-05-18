<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-42: Story-State Debt, Secret, and Clock Records

**Status**: COMPLETED
**Phase**: wave-1 story-bundle schema additions (debt / secret / clock layer)
**Depends on**: SPEC-13 (atomic-source migration — establishes per-record-per-file `_source/<class>/<ID>.yaml`); PEENH-001 (story-bundle records use the same pattern); SPEC-34 (validator hardening sets the registry pattern the new validators register into)
**Blocks**: follow-up specs for `STPLAN` (character plan / motive chain) and `CONV` (branch convergence contract), neither in this spec's scope
**Source**: `reports/new-narrative-features-first-iteration.md` (ChatGPT-Pro deep-research proposal, 2026-05-17); brainstorm-triage cross-checked against `docs/FOUNDATIONS.md` §Story Bundles §4a / §5a / §5b / §5c, `.claude/skills/_shared-templates/story-state-contract.md`, archived SPEC-19 through SPEC-22 (scene-commitment-arc, rolled back), and `tools/validators/src/`, `tools/patch-engine/src/`, `tools/world-mcp/src/` verified codebase state.

---

## Problem Statement

Worldloom's story-bundle pipeline produces a mature causal-engine state surface (17 record classes per the verified inventory in `.claude/skills/_shared-templates/story-state-contract.md` §3-4, eight shared hard gates per §7, 22-predicate closed DSL at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`), but three categories of present-causal state are absent:

1. **Staged pressure.** `THR` has 8 fields (`id`, `story_id`, `created_at_page`, `supersedes`, `status`, `title`, `summary`, `urgency`, `derived_from`) with no progress value, no threshold ladder, no driver, no firing condition, no offscreen advancement. `OBL` carries `urgency: low | medium | high` and a natural-language `trigger_to_close: string` but no timer. `CNSQ` carries a 4-value `status: pending | resolved | escalated | abandoned` enum but no stepwise escalation. Authors approximating staged pressure (a danger that mounts page by page; a deadline that matures; a faction moving offscreen) must repeatedly supersede `THR` or `CNSQ` records — fragile, hard to validate, hard to predicate against in storylet preconditions.

2. **Story-local hidden truth.** `BEL` records what a holder claims/believes/suspects/denies/witnesses; `SF` records branch truth; `DA` preserves diegetic-artifact content; `unresolved_mystery_claims[].status` (`preserved | clue_added | narrowed | apparent_resolution | held_for_promotion`) tracks accretion against world-level Mystery Reserve (`M-*`). What is missing is a *story-local* binding: a `BEL` records "Captain Sera lied about the manifests"; another `BEL` records "the margin nickname is her brother's"; nothing in the schema says "these point at the same hidden truth," so storylets cannot precondition on `revelation_ready`, validators cannot flag premature revelation, and health-audit cannot detect a critical revelation arriving without clue support.

3. **Open setup state.** No record class encodes "this Chekhov's gun is still on the wall" — a present-causal claim about an introduced element that licenses certain future state transitions. `THR` is the closest existing class but conflates active narrative tension with open-setup tracking and lacks the typed setup→payoff link needed for terminal-debt validation.

The proposal at `reports/new-narrative-features-first-iteration.md` recommends five new record classes (`STQ`, `STSEC`+`STCLUE`, `CLK`, `STPLAN`, `CONV`); the brainstorm-triage accepts three of them (with `STCLUE` dropped and `STQ` reduced) and defers `STPLAN` and `CONV` to follow-up specs.

### Key design decisions

- **Considered Path B (extend `THR` with thread_type + payoff_link extensions); chose Path A (new `STQ` class with stripped schema).** Reason: `THR`'s field set is shaped for "active narrative tension across pages" (status enum: `active | resolved | escalated | abandoned`; urgency scalar); adding a typed `payoff_of` link and the open-setup status transitions (`open | complicated | answered | paid_off | abandoned | inherited | superseded`) overloads the class beyond its current discipline. A separate class with strict §5c discipline is cleaner.
- **Considered Path B (STSEC + parallel STCLUE class as proposed); chose Path A (STSEC only, with `clue_carriers[]` as a sub-array on STSEC).** Reason: STCLUE largely duplicates existing `BEL.basis.access_route` + `BEL.basis.access_records[]` (verified at story-state-contract.md §4.1) and `PG.state_snapshot.unresolved_mystery_claims[].status` (already includes `clue_added`, verified at `tools/validators/src/schemas/story-page.schema.json`). Concentrating clue-carrier semantics in one place (on the STSEC they support) avoids a parallel class and avoids the two-way binding maintenance cost.
- **Considered proposal-order (STQ → STSEC → CLK); chose reverse-order (CLK → STSEC → STQ).** Reason: CLK is the cleanest §5c-aligned addition (pressure value/max is straightforwardly present-causal). STQ carries the highest §5c risk (open-setup discipline vs. promise-debt encoding), so it should land after the architectural pattern is proven on CLK and STSEC. Pragmatic ordering — risk-stratified — not structural.
- **Considered including `STPLAN` and/or `CONV` in this spec; chose to defer both.** Reason: STPLAN's "what plan is this agent pursuing" carries §5c risk that needs its own §5c discipline statement and a careful interaction with the existing `motivation_ungrounded` audit signal; CONV depends on wave-1 records being present to know what to reconcile. Pragmatic deferral — folding either into this spec would roughly double its scope; not structural — both follow-up specs would each justify their own surface area.
- **Considered `expected_payoff_mode` field on STQ as proposed; rejected outright.** Reason: the 7-value enum (`answer | reversal | cost_paid | choice_forced | relationship_shift | revelation | consequence_fires`) is structurally analogous to the rejected `allowed_outcome_band` from archived SPEC-19; encoding a categorical expectation of future state transitions violates §5c ("It never asks: are we before or after the midpoint, has the protagonist refused the call, is this the climax, does this choice preserve a planned act"). The spec instead names the field as an explicit §5c prohibition.

---

## Approach

Three additive record classes plus their validator, predicate, MCP, and skill integrations. All additions are **append-only** — no existing schema is changed, no existing record class is supplanted, no existing validator is altered. Bundles without these classes remain valid.

### A. `CLK` — Pressure Clock Record

A `CLK` record tracks pressure that advances over time or through events: danger clocks, faction activity, countdowns, pursuit, exposure, deadlines, worsening conditions. Each clock has a present-causal value between 0 and a configured max; threshold entries (each below the max) name effects that fire when the value crosses them; tick history records every advancement with its source event and cause.

**Schema** (atomic YAML at `worlds/<slug>/stories/<story-slug>/_source/clocks/CLK-<integer>.yaml`):

```yaml
id: CLK-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: CLK-<integer> | null
title: string*
clock_kind: danger | racing | mission | faction | exposure | pursuit | deadline*
driver: STENT-<integer> | group:<name> | system | unknown*
linked_records: [THR-<integer> | OBL-<integer> | CNSQ-<integer> | STINT-<integer> | SREL-<integer> | STLOC-<integer> | STOBJ-<integer> | STQ-<integer>]*
value: <integer 0..max>*
max: <integer ≥ 1>*
salience: low | medium | high*
visibility: hidden | holder_specific | public | factional*
thresholds:
  - at: <integer 1..max>*
    label: string*
    effects:
      create: [<record_id> | bound:<alias>]
      supersede: [<record_id> | bound:<alias>]
      close: [<record_id>]
tick_history:
  - event: SE-<integer>*
    delta: <integer ≠ 0>*
    cause: string*
status: active | paused | resolved | fired | abandoned | superseded*
resolution_event: SE-<integer> | null
```

**Field count: 16.** Each load-bearing per §5b: `title` / `clock_kind` / `driver` for human and predicate scoping; `linked_records[]` for traceability and terminal-debt audit; `value` / `max` for present-causal state and threshold tests; `salience` / `visibility` for storylet preconditioning and witness-firewall integration; `thresholds[]` for staged-consequence firing (mirroring `SE.state_delta` and `SLT.effects` triple); `tick_history[]` for replay determinism; `status` and `resolution_event` for lifecycle.

**Explicit drops from the proposal**: (1) `deadline.natural_language` — not validator-readable (§5b violation); deadline-driven clocks use `clock_kind: deadline` plus thresholds tied to PG-anchor effects. (2) `clock_kind: front` — too plot-rail-flavored; absorbed by `faction`. (3) `visibility: audience_only` — fourth-wall-breaking; conflicts with §5c posture that the engine tracks present causal state, not authorial dramatic framing.

### B. `STSEC` — Story Secret Record

A `STSEC` record binds together the multiple `BEL` records and optional `SF`/`DA` anchors that all point at the same hidden truth, names the secret's criticality and firewall posture, and tracks revelation state. `STSEC.clue_carriers[]` absorbs the clue-tracking concept proposed as a parallel `STCLUE` class.

**Schema** (atomic YAML at `worlds/<slug>/stories/<story-slug>/_source/secrets/STSEC-<integer>.yaml`):

```yaml
id: STSEC-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STSEC-<integer> | null
secret_kind: identity | motive | location | event_cause | artifact_truth | relationship | institutional*
secret_claim: string*
truth_anchor: SF-<integer> | BEL-<integer> | DA-<integer> | null
holders: [STENT-<integer> | group:<name> | narrator]*
salience: low | medium | high*
protected_mystery_refs: [M-<integer>]
clue_carriers:
  - kind: DA | STOBJ | STLOC | BEL | SF | SE*
    record: <record_id>*
    clue_text: string*
    clue_strength: weak | suggestive | confirming | decisive | misleading*
    discovered_by: [STENT-<integer> | group:<name> | public]
    audience_visible: hidden | visible | ambiguous*
    status: available | discovered | destroyed | suppressed | superseded*
source_records: [<record_id>]*
status: hidden | partially_revealed | revealed | disproven | abandoned*
reveal_event: SE-<integer> | null
reveal_records: [BEL-<integer> | SF-<integer> | DA-<integer> | STQ-<integer>]
```

**Field count: 13** (one of which is the `clue_carriers[]` sub-array). Each load-bearing per §5b: `secret_kind` for predicate filtering; `secret_claim` for human readability; `truth_anchor` for branch-truth vs. believed-only distinction; `holders[]` for visibility-firewall enforcement; `salience` and `protected_mystery_refs[]` for criticality-gated validators and Mystery Reserve firewall; `clue_carriers[]` for revelation-readiness predicates and audit; `source_records[]` for grounding integrity; `status` / `reveal_event` / `reveal_records[]` for lifecycle.

**Explicit drops from the proposal**: (1) `audience_state: misled` — encodes authorial framing; the truth-vs-claim mismatch is derivable from `truth_anchor` + holders' `BEL.truth_relation`. (2) `criticality` as a parallel enum to `salience` — collapse to `salience` for consistency with other record classes (`SLT.saliency`, `THR.urgency`, etc.). (3) `secret_kind: other` — anti-pattern; force categorization or expand the closed enum. (4) Parallel `STCLUE` class — absorbed into `clue_carriers[]` sub-array.

**Story-local vs. world Mystery Reserve.** `STSEC` is strictly story-local. When a story secret touches a world `M-*` Mystery Reserve entry, `protected_mystery_refs[]` references the affected `M-*` ids and the existing mystery firewall (gate 3 of the eight shared hard gates per story-state-contract §7; `rule7_mystery_reserve_preservation` validator per `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts`) remains authoritative — `STSEC.status: revealed` cannot resolve a `M-*` entry with `status: forbidden`, regardless of clue coverage.

### C. `STQ` — Story Question / Open-Setup Record

A `STQ` record encodes present-causal open-setup state: an element introduced into the branch (a dramatic question, an explicit narrative setup) that remains active until answered, paid off, abandoned, or intentionally inherited. **STQ is not narrative-debt tracking and not promise-fulfillment expectation.** The line is enforced by the schema's deliberate field omissions (see §5c discipline statement below).

**Schema** (atomic YAML at `worlds/<slug>/stories/<story-slug>/_source/story-questions/STQ-<integer>.yaml`):

```yaml
id: STQ-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STQ-<integer> | null
setup_kind: setup | dramatic_question | promise*
question_or_setup: string*
salience: low | medium | high*
audience_visibility: hidden | implied | explicit*
source_event: SE-<integer>*
source_records: [SF-<integer> | BEL-<integer> | DA-<integer> | THR-<integer> | OBL-<integer> | CNSQ-<integer> | STINT-<integer> | SREL-<integer> | STLOC-<integer> | STOBJ-<integer> | CLK-<integer> | STSEC-<integer>]*
payoff_of: STQ-<integer> | null
status: open | complicated | answered | paid_off | abandoned | inherited | superseded*
answer_event: SE-<integer> | null
answer_records: [<record_id>]
abandonment_rationale: string | null
```

**Field count: 13.** Each load-bearing per §5b.

#### §5c discipline statement (load-bearing)

`STQ` tracks **present open-setup state**, not **future dramatic obligation**. The distinction is operationally tested by what the engine asks at each page: it asks *"what setups are currently open, what state do they license, what would close them"* — not *"are we before or after the midpoint, what shape should the eventual payoff take, what arc position are we at."* This is the story-scope analogue of FOUNDATIONS §5c (Present Causal State, Not Narrative Shape). The following fields are **explicitly prohibited** in `STQ` schemas, validators, predicates, and skill integrations, regardless of authoring convenience:

| Prohibited field | Reason |
|---|---|
| `expected_payoff_mode` (enum) | Encodes future shape — categorical prediction of how an eventual resolution would be structured. Structurally analogous to `allowed_outcome_band` from archived SPEC-19 (rejected per §5a). |
| `act_position` / `midpoint` / `climax` | Per §5c "It never asks: are we before or after the midpoint." |
| `dramatic_curve_position` / `tension_arc` | Same — encodes narrative shape, not present state. |
| `kind: moral_question` | Authorial/subjective; not validator-readable; risks slipping into theme tracking which §5b/§5c reject. |
| `expected_chapter` / `scene_sequence` | Per §5a (no `arc_contract`, `dramatic_unit`, `execution_envelope`). |
| `holders[]` (audience-vs-character) | The audience-vs-character distinction is already covered by `audience_visibility` (audience side) + `source_records[]` grounding (character side via BEL/STENT links). A separate `holders[]` array re-encodes the same distinction. |

Validators MUST HARD-REJECT any `STQ` record carrying a prohibited field at the `record_schema_compliance` gate.

### D. `PG.state_snapshot.active_records[]` enumeration extension

The 12-class enumeration in `PG.state_snapshot.active_records[]` (verified at story-state-contract.md §4.2, line 62-74) is extended to 15 classes:

```yaml
active_records:
  STENT: [STENT-<integer>]
  STINT: [STINT-<integer>]
  SF: [SF-<integer>]
  BEL: [BEL-<integer>]
  OBL: [OBL-<integer>]
  CNSQ: [CNSQ-<integer>]
  THR: [THR-<integer>]
  SREL: [SREL-<integer>]
  STLOC: [STLOC-<integer>]
  STOBJ: [STOBJ-<integer>]
  DA: [DA-<integer>]
  STSTAT: [STSTAT-<integer>]
  CLK: [CLK-<integer>]      # NEW (SPEC-42)
  STSEC: [STSEC-<integer>]  # NEW (SPEC-42)
  STQ: [STQ-<integer>]      # NEW (SPEC-42)
```

`branching-story-turn-cycle` materializes the active-record lists for the three new classes when computing the next page snapshot; `stateSnapshotIntegrity` validator (per `tools/validators/src/structural/state-snapshot-integrity.ts`) extends to enforce non-stale CLK/STSEC/STQ entries.

### E. Phased implementation order

**Phase 1 — `CLK` foundation tier.** Ships first as the cleanest §5c-aligned addition. Includes: schema file, patch ops, allocator registration, MCP retrieval support, `clk_*` predicate DSL entries, `clock_value_in_range` / `clock_threshold_ordering` / `clock_tick_provenance` / `clock_firing_threshold_integrity` validators, `PG.state_snapshot.active_records[]` extension for CLK, `branching-story-turn-cycle` tick integration, `branching-story-health-audit` stalled-clock check.

**Phase 2 — `STSEC` foundation tier.** Ships after CLK proves the pattern. Includes: schema file (with `clue_carriers[]` sub-array), patch ops (`create_stsec_record`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`, `supersede_stsec_record`), allocator registration, MCP retrieval support, `secret_*` predicate entries, `secret_carrier_existence` / `critical_secret_clue_coverage_when_revealed` / `secret_mystery_firewall_compliance` validators, `PG.state_snapshot.active_records[]` extension for STSEC, `branching-story-turn-cycle` secret-reveal integration with existing witness-propagation phase, `branching-story-health-audit` under-supported-revelation check.

**Phase 3 — `STQ` foundation tier.** Ships last (highest §5c risk). Includes: schema file (with the §5c discipline statement enforced by `record_schema_compliance` HARD-REJECT on prohibited fields), patch ops, allocator registration, MCP retrieval support, `story_question_*` predicate entries, `story_question_payoff_integrity` / `story_question_setup_predates_payoff` / `story_question_grounding_integrity` validators, `PG.state_snapshot.active_records[]` extension for STQ, `branching-story-turn-cycle` open-setup integration, `branching-story-health-audit` dropped-setup check (high-salience STQ open at terminal without explicit rationale).

**Phase 4 — Skill integration tier.** After Phases 1-3 land. Includes: `branching-story-bootstrap` optional seeding (CLK/STSEC/STQ are not mandatory at bundle creation — premises that warrant them get them), `commitment-block-authoring` 11-target coverage extension (add `clock_advancing`, `clue_discovering`, `setup_paying_off` as four-target additions where applicable), `branching-story-prose-attach` rendered-prose verification (when SE has clock-tick effect, prose mentions tick; when secret status flips to `revealed`, prose discloses), page-plan section additions (a new §10b "Open Setups, Active Clocks, Hidden Secrets" computed per page from the current active CLK/STSEC/STQ records, not inlined verbatim like §2 / §3 / §19).

**Phase 5 — Migration.** No forced migration. Existing bundles without these classes remain valid; `branching-story-health-audit` does not flag their absence. Optional backfill: a new mode of `branching-story-health-audit` (`backfill_proposal`) can scan a mature bundle for `THR` records that look like dramatic questions (proposing `STQ` candidates), `DA`/`BEL`/`SF` clusters that look like secret/clue networks (proposing `STSEC` candidates), and high-urgency `THR`/`CNSQ`/`OBL` patterns that look like clocks (proposing `CLK` candidates). Backfill is operator-driven; the skill emits RSP-style proposal cards.

---

## Deliverables

### Schema files

- `tools/validators/src/schemas/story-pressure-clock.schema.json` — CLK JSON Schema
- `tools/validators/src/schemas/story-secret.schema.json` — STSEC JSON Schema (with `clue_carriers[]` sub-array)
- `tools/validators/src/schemas/story-question.schema.json` — STQ JSON Schema (with §5c prohibited-field HARD-REJECT)
- Extension to `tools/validators/src/schemas/story-page.schema.json` — `state_snapshot.active_records[]` enum extension to include `CLK | STSEC | STQ`

### Canonical contract updates

- `.claude/skills/_shared-templates/story-state-contract.md` §3 (class catalog) — add CLK, STSEC, STQ rows
- `.claude/skills/_shared-templates/story-state-contract.md` §4 — add §4.6 (CLK), §4.7 (STSEC), §4.8 (STQ) with canonical schema text matching the JSON Schemas
- `.claude/skills/_shared-templates/story-state-contract.md` §4.2 — extend `PG.state_snapshot.active_records[]` enumeration from 12 to 15 classes
- `.claude/skills/_shared-templates/story-state-contract.md` §5 — add new predicate entries (12 new predicates total: 4 clock, 4 secret, 4 story-question)
- `.claude/skills/_shared-templates/story-state-contract.md` §6 — no longer owns a story-pipeline integration matrix in the live contract; SPEC-42 integration lives in skill-specific surfaces (`branching-story-bootstrap`, `branching-story-turn-cycle`, `commitment-block-authoring`, `branching-story-health-audit`, and `branching-story-prose-attach`) plus the shared §5 predicate and §8 page-plan contracts
- `.claude/skills/_shared-templates/story-state-contract.md` §8 — add optional §10b page-plan section ("Open Setups, Active Clocks, Hidden Secrets")

### Patch-engine ops (added to `tools/patch-engine/src/envelope/schema.ts` `OPERATION_KINDS`)

CLK: `create_clk_record`, `supersede_clk_record`, `tick_pressure_clock`, `resolve_pressure_clock`
STSEC: `create_stsec_record`, `supersede_stsec_record`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`
STQ: `create_stq_record`, `supersede_stq_record`, `answer_story_question`, `abandon_story_question`

### Allocator registration (added to `tools/world-mcp/src/tools/allocate-next-id.ts:81-102`)

`CLK`, `STSEC`, `STQ` added to the story-scoped class registry, each with their own subdirectory (`clocks/`, `secrets/`, `story-questions/`).

### Predicate DSL extensions (added to `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`)

CLK predicates (4): `clock_at_least(CLK-<int>, value)`, `clock_below(CLK-<int>, value)`, `clock_full(CLK-<int>)`, `any_clock_active(alias, kind?, salience?)`

STSEC predicates (4): `secret_unrevealed(STSEC-<int>)`, `secret_revealed(STSEC-<int>)`, `revelation_ready(STSEC-<int>)`, `any_secret_unrevealed(alias, salience?, kind?)`

STQ predicates (4): `story_question_open(STQ-<int>)`, `story_question_status(STQ-<int>, status)`, `any_story_question_open(alias, salience?, setup_kind?)`, `promise_due(STQ-<int>, age_pages)`

### Validators (added to `tools/validators/src/structural/` and registered in `tools/validators/src/public/registry.ts`)

CLK validators (5):
- `clock_value_in_range` — `value` between 0 and `max`
- `clock_threshold_ordering` — thresholds[].at strictly ascending, all ≤ max
- `clock_tick_provenance` — every `tick_history[]` entry references a valid `SE` and explains the delta
- `clock_firing_threshold_integrity` — `status: fired` requires the value to have crossed the highest threshold via the tick history
- `clock_terminal_debt_integrity` — high-salience active clocks at terminal must be resolved, fired, inherited, or explicitly abandoned with rationale

STSEC validators (3):
- `secret_carrier_existence` — every `clue_carriers[].record` references an existing, branch-active record
- `critical_secret_clue_coverage_when_revealed` — when `salience: high` and `status: revealed`, at least N (default 2) `clue_carriers[].status: discovered` entries must precede the `reveal_event` in the branch path
- `secret_mystery_firewall_compliance` — `protected_mystery_refs[]` may not resolve forbidden `M-*` entries; defers to `rule7_mystery_reserve_preservation`

STQ validators (4):
- `story_question_payoff_integrity` — `status: answered | paid_off` requires `answer_event`; `payoff_of` must reference a `STQ` whose `created_at_page` precedes this STQ's
- `story_question_setup_predates_payoff` — branch path validation
- `story_question_grounding_integrity` — `source_records[]` are branch-active at `created_at_page`
- `story_question_terminal_debt` — high-salience open `STQ` at terminal must be answered, paid off, abandoned with rationale, inherited, or explicitly left open with terminal-proof rationale

Shared:
- `record_schema_compliance` (extended at `tools/validators/src/structural/record-schema-compliance.ts`) — adds HARD-REJECT for STQ records carrying prohibited fields enumerated in the §5c discipline statement
- `state_snapshot_integrity` (extended at `tools/validators/src/structural/state-snapshot-integrity.ts`) — handles new CLK/STSEC/STQ slots in `PG.state_snapshot.active_records[]`
- `snapshot_replay_equality` (extended at `tools/validators/src/structural/snapshot-replay-equality.ts`) — replays CLK ticks, STSEC reveals, STQ status transitions deterministically

### MCP retrieval (added to `tools/world-mcp/src/tools/`)

`get_record` / `get_records` / `list_records` extended to recognize `record_type: pressure_clock_record | story_secret_record | story_question_record` with `story_slug` scoping (parallel to existing story-bundle record-type handling at the get-record.ts:34 / get-records.ts story_slug param).

`get_context_packet` story-pipeline task-type templates extended to include CLK / STSEC / STQ in the story-bundle context layer.

### Skill updates

- `.claude/skills/branching-story-bootstrap/SKILL.md` — optional Phase 4 step for seeding CLK/STSEC/STQ when the premise calls for them (deadline-flavored premise → seed CLK; conspiracy/betrayal-flavored premise → seed STSEC; explicitly-introduced-setup premise → seed STQ)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` — Phase 4 extension to tick clocks, reveal secrets, advance/answer story questions as part of SE state-delta computation; Phase 7 plan extension to include new §10b section
- `.claude/skills/commitment-block-authoring/SKILL.md` — extend the 11-target coverage list to a 14-target list (add `clock_advancing`, `clue_discovering`, `setup_paying_off`)
- `.claude/skills/branching-story-health-audit/SKILL.md` — Phase 2 structural checks extended with `stalled_clock_check`, `under_supported_critical_revelation_check`, `dropped_high_salience_setup_check`; new optional mode `backfill_proposal` for Phase 5
- `.claude/skills/branching-story-prose-attach/SKILL.md` — Phase 4 prose-vs-state checks extended for clock-tick prose verification and revealed-secret prose disclosure

### Documentation

- `docs/FOUNDATIONS.md` — no edits required (the §5c discipline statement lives in the spec and in the schemas, not in FOUNDATIONS; FOUNDATIONS §5c remains the load-bearing principle that the spec cites)
- `CLAUDE.md` — Story Bundles record-class inventory list updated to include CLK / STSEC / STQ

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 1 (No Floating Facts) | aligns | Every CLK / STSEC / STQ record carries domain (via `linked_records[]` / `source_records[]`), scope (story-bundle + branch via `created_at_page` + branch path), prerequisites (predicate DSL preconditions on storylet selection), limits (status enums, salience tiers, firewall fields), and consequences (state-delta effects, threshold firings, validator gates) |
| Rule 2 (No Pure Cosmetics) | aligns | Each new class must change branch state: CLK threshold effects use the `create / supersede / close` triple that mirrors `SE.state_delta`; STSEC reveal events produce BEL/SF/DA records; STQ status transitions tie to `answer_event` SE records |
| Rule 4 (No Globalization by Accident) | aligns | All three classes are branch-scoped (each carries `created_at_page`); branch-isolation validator (`tools/validators/src/structural/branch-isolation.ts`) extends to enforce no sibling-branch CLK/STSEC/STQ references in PG snapshots |
| Rule 5 (No Consequence Evasion) | aligns | CLK explicitly tracks delayed-consequence maturation; STSEC reveal events route through promotion when canon-bearing; STQ open-setup tracking prevents dropped setups via `story_question_terminal_debt` validator |
| Rule 6 (No Silent Retcons) | aligns | All canon-bearing claims (a STSEC reveal that asserts world canon; a STQ answer that asserts world canon; a CLK firing that asserts world canon) route through `SE.promotion_claims[]` → `story-fact-promotion-to-canon` → `canon-addition`, never via direct world-canon mutation |
| Rule 7 (Preserve Mystery Deliberately) | aligns | STSEC.protected_mystery_refs[] integrates with existing mystery firewall (gate 3 of the eight shared hard gates; `rule7_mystery_reserve_preservation` validator); forbidden `M-*` entries cannot be resolved by STSEC reveal regardless of clue coverage |
| §Story Bundles §4a (Plan-Authority Boundary) | aligns | New classes commit at page-plan commit (the moment the patch engine accepts the page-cycle plan); rendered prose is a receipt, not a second state engine; no ARC_TRACE-style parallel state-transition pass for any of the three new classes |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | aligns | No new class introduces `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminators above 1, or `shape:` discriminators; effects use the canonical `create / supersede / close` triple |
| §Story Bundles §5b (Schema-Minimalism) | aligns | Field inventories are deliberately tight (CLK 16 fields, STSEC 13 fields + clue-carriers sub-array, STQ 13 fields); explicit drops enumerated in the Approach section for each class; STQ §5c discipline statement HARD-REJECTs prohibited fields |
| §Story Bundles §5c (Present Causal State, Not Narrative Shape) | aligns | CLK encodes present pressure value; STSEC encodes present hidden-truth state; STQ encodes present open-setup state. §5c discipline statement on STQ explicitly forbids `expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `kind: moral_question`, `expected_chapter`, `scene_sequence`, and `holders[]` (audience-vs-character re-encoding) |
| §Story Bundles §5 (Mystery Accretion) | aligns | STSEC complements existing `PG.state_snapshot.unresolved_mystery_claims[].status: clue_added | narrowed | apparent_resolution` — story-local secrets that touch world `M-*` entries cross-reference via `protected_mystery_refs[]`, while pure story-local secrets (e.g., "Captain Sera's motive") use STSEC alone without touching the world Mystery Reserve surface |
| §Story Bundles §6b (Information / Observer Firewall) | aligns | CLK.visibility / STSEC.holders[] / STQ.audience_visibility integrate with the existing `observer-firewall.ts` validator surface; storylet selection cannot precondition on a hidden CLK / STSEC / STQ for an actor who has no access route |

---

## Verification

### Schema-level verification

- Each new schema file (`.json`) validates a representative example record cleanly (one positive + one negative test per validator)
- `record_schema_compliance` HARD-REJECTs an STQ record carrying any prohibited field (verification fixture: STQ with `expected_payoff_mode`, `kind: moral_question`, `act_position`, etc.)
- `record_schema_compliance` HARD-REJECTs a CLK record with thresholds out of range, with value > max, or with a `tick_history[]` entry lacking SE provenance
- `record_schema_compliance` HARD-REJECTs a STSEC record with `clue_carriers[].record` pointing at a non-existent or branch-inactive record

### Validator-level verification

- `clock_terminal_debt_integrity` FAILS for a terminal branch leaf snapshot with a high-salience `CLK.status: active` and no terminal rationale; PASSES with explicit abandonment in `terminal_rationale`
- `critical_secret_clue_coverage_when_revealed` FAILS for a `STSEC` with `salience: high`, `status: revealed`, and fewer than 2 `clue_carriers[].status: discovered` entries preceding `reveal_event`; PASSES with sufficient discovered carriers
- `story_question_payoff_integrity` FAILS for a STQ with `status: answered` and `answer_event: null`; FAILS for a `payoff_of` link to a STQ whose `created_at_page` is later than this STQ's; PASSES otherwise
- `snapshot_replay_equality` reproduces CLK value progression deterministically across a branch path with mixed tick directions (positive deltas plus rare negative deltas for pause/de-escalation)
- `state_snapshot_integrity` flags a `PG.state_snapshot.active_records[CLK]` listing a CLK whose `status: resolved` precedes this snapshot

### MCP-level verification

- `mcp__worldloom__get_record(record_id="CLK-1", story_slug="<bundle>")` returns the CLK record with full body
- `mcp__worldloom__list_records(record_type="pressure_clock_record", story_slug="<bundle>")` enumerates all CLK records in the bundle
- `mcp__worldloom__allocate_next_id(world_slug, id_class="CLK", story_slug)` returns the next free CLK integer scoped to the bundle
- `mcp__worldloom__get_context_packet(task_type="branching_story_turn_cycle", seed_nodes=["PG-<N>"], story_slug)` includes active CLK / STSEC / STQ in the story-bundle context layer

### Skill-level verification

- `branching-story-bootstrap` on a deadline-flavored premise emits at least one seed `CLK` record
- `branching-story-turn-cycle` on an SE that crosses a CLK threshold materializes the threshold's `effects.create[]` / `supersede[]` / `close[]` records in `SE.state_delta`
- `branching-story-health-audit` `structural` mode detects: (a) a stalled CLK (no tick in N pages for a high-salience active clock), (b) an under-supported critical revelation, (c) a dropped high-salience setup at terminal
- `commitment-block-authoring` `direct_batch` mode includes coverage targets for `clock_advancing`, `clue_discovering`, `setup_paying_off`
- `branching-story-prose-attach` flags rendered prose that omits a clock-tick event present in the page's SE state-delta

### Backwards-compatibility verification

- Existing story bundles (containing zero CLK / STSEC / STQ records) pass all validators with no warnings
- `branching-story-health-audit` does not flag the absence of CLK / STSEC / STQ in mature bundles
- `branching-story-turn-cycle` advances bundles without these classes without surfacing CLK/STSEC/STQ-related plan sections

---

## Out of Scope

- **`STPLAN` (Character Plan / Motive Chain).** Deferred to a follow-up spec. The thinness of `STINT` and the audit-only status of the `motivation_ungrounded` signal are real gaps, but a `STPLAN` schema needs its own §5c discipline pass (the "what plan is this agent pursuing" framing carries §5c risk parallel to STQ's "what payoff does the story owe") and a careful interaction design with the existing audit signal. **(pragmatic — folding STPLAN into this spec would roughly double its scope without proving the wave-1 design pattern first; not structural — STPLAN warrants a standalone spec on its own merits.)**
- **`CONV` (Branch Convergence Contract).** Deferred to a follow-up spec. Convergence is meaningful only once wave-1 records (CLK / STSEC / STQ debt state) are present to be reconciled. **(structural — CONV depends on wave-1 records existing; cannot be designed independently.)**
- **Arc / act / scene / episode / midpoint / climax structures.** Rejected. These were attempted as scene-commitment-arc in archived SPEC-19 through SPEC-22 and rolled back; the §4a / §5a / §5c additions to FOUNDATIONS are the consequence of that rollback. Re-introducing them via STQ's `expected_payoff_mode` (rejected here) would re-walk the same path.
- **Theme / motif / tone meters / pacing curves / emotional state.** Rejected. Per the proposal §7 and FOUNDATIONS §5b — these are abstract narrative labels without sufficient deterministic payoff to justify schema cost.
- **Reputation / faction-state systems.** Deferred. `BEL`, `SREL`, `OBL`, `STENT` groups, and world `INS` records can cover most of the surface; a future `STFACTION_STATE` may be warranted if faction-heavy stories repeatedly surface gaps.
- **Location topology / pathfinding access constraints.** Deferred. `STLOC`, `STSTAT.location`, visible affordances, and `object_accessible` predicates already cover core movement/access.
- **POV / discourse / presentation-order layer (focalization).** Deferred. Story state correctly treats prose as rendering, not state (§4a Plan-Authority Boundary); POV limits already live in the Player Agency Contract.

---

## Risks & Open Questions

- **Author abuse — clock proliferation. (pragmatic — `branching-story-health-audit` can warn on high CLK counts per bundle; the schema cannot prevent over-modeling.)** Too many CLK records turn fiction into board-game state. CLK should be reserved for pressure that can actually change choices or consequences. `commitment-block-authoring` and `branching-story-health-audit` should warn (not block) when CLK count exceeds a threshold per bundle.
- **STQ §5c slippage temptation. (structural — the §5c discipline statement and `record_schema_compliance` HARD-REJECT on prohibited fields prevent the schema from drifting; the risk is in skill prose and authoring patterns.)** Authoring patterns will naturally drift toward narrative-shape framing ("this STQ is owed a payoff by the climax"). The §5c discipline statement in the schema and the prohibited-field HARD-REJECT in `record_schema_compliance` are the structural defenses; skill prose, validator messages, and audit reports must reinforce the present-causal framing.
- **STSEC `critical_secret_clue_coverage_when_revealed` minimum threshold. (open question — current proposal: minimum 2 discovered carriers; alternative: per-secret `coverage_policy: minimum_clues_required: <integer>` field.)** The proposal's "Three Clue Rule" (Alexandrian) defaults to 3 but the report's spec suggests "minimum clue coverage or explicit override." Recommendation: default to 2 discovered carriers as a structural minimum, with an optional per-STSEC `coverage_policy.minimum_clues_required: <integer ≥ 1>` override field.
- **`PG.state_snapshot.active_records[]` LLM-token cost. (pragmatic — current 12 classes already produce substantial snapshot text; adding 3 more classes adds proportional cost.)** The snapshot is loaded into every storylet-selection decision; adding three more record-class slots adds proportional LLM-token cost. Page-plan §10b includes only currently-active CLK/STSEC/STQ; the active_records[] entries are bare ID lists per existing convention.
- **Phase 4 page-plan section addition. (open question — should the new §10b section be inlined verbatim per the §2/§3/§19 inlining convention, or computed per-page?)** The existing §2 Content Policy / §3 Prose Craft Contract / §19 Render-Time Instruction Block are inlined verbatim per `.claude/skills/_shared-templates/story-state-contract.md` §8 because the external LLM renderer has no cross-plan state. §10b is per-page content (different active CLK/STSEC/STQ per page), so it should be computed per-page like §5 (active cast) and §6 (location/affordances). Recommendation: §10b is per-page-computed, not inlined verbatim.
- **Backfill mode scope. (pragmatic — Phase 5 backfill could become its own spec.)** The proposed `branching-story-health-audit` `backfill_proposal` mode at Phase 5 is a substantial pattern-recognition workflow; it may warrant its own spec rather than living inside this one. Recommendation: ship Phase 5 as RSP-style proposal-card emission within the existing `branching-story-health-audit` mode taxonomy; if the pattern-recognition complexity grows, extract.

---

## Outcome

Completion date: 2026-05-18.

SPEC-42 completed across archived tickets `archive/tickets/SPEC42STOSTADEB-001.md` through `archive/tickets/SPEC42STOSTADEB-015.md`. The implementation added the CLK, STSEC, and STQ story-bundle record surfaces across validators, patch-engine operation schemas, world-mcp retrieval/allocation/context/envelope surfaces, story-pipeline skill contracts, and documentation handoffs.

The final capstone landed in `tools/world-mcp/tests/integration/spec42-capstone.test.ts` and verifies the executable composition boundary for schema/envelope discovery, indexed retrieval/listing/allocation/context packets, validate-patch-plan behavior, and story-pipeline skill contract surrogates.

Verification completed:

1. `npm test` from `tools/validators` — passed, 416 tests.
2. `npm test` from `tools/world-mcp` — passed, 399 tests.
3. `node --test dist/tests/integration/spec42-capstone.test.js` from `tools/world-mcp` — passed, 4 tests.

Deviation: `.claude/skills/` story-pipeline flows remain prose workflows rather than executable programs, so skill-level capstone coverage is represented by executable contract-surface surrogate checks instead of live skill dry-runs.
