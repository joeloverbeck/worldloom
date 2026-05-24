# SPEC80STOPOODRI-001: Bootstrap Phase 6 four-axis pool coverage + Phase 10 HARD-GATE enumeration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-bootstrap/` (references/phase-6-commitment-blocks.md adds three new pool-coverage paragraphs + SPEC-77 relation paragraph + Phase 10 enumeration-extension commitment; SKILL.md line 49 enumeration extended with one new bootstrap-additional check)
**Deps**: None

## Problem

`branching-story-bootstrap` currently enforces a Phase 6 cast-role coverage rule on seeded SLT pools, but the rule is positioned as authoring discipline only — it is not enumerated in Phase 10's 5 bootstrap-additional HARD-GATE checks at `branching-story-bootstrap/SKILL.md:49`. Three additional coverage axes the world's active records demand are absent entirely: (a) driver-kind coverage (the pool must contain a `secret_reveal`-compatible SLT when active STSEC records exist; a `clock_fire`-compatible SLT when active CLK records exist; an `npc_action`-compatible SLT when NPC STPLAN/STEMO exist; etc., per SPEC-80 §3.1's trigger map), (b) pressure-source-class coverage (the pool must reference each active record class via an existential predicate or literal record-id, per SPEC-80 §3.2's trigger map), and (c) composition coverage (for each demanded (driver-kind, source-class) pair, at least one SLT must satisfy BOTH, per SPEC-80 §3.3). Without pool-level coverage discipline at bootstrap, bundles seed without enough breadth to express the pressures the world naturally produces, and the iteration-1 reactivity problem reappears at runtime: active high-urgency non-player records sit inert because turn-cycle has nothing in the pool to select for non-player drivers.

This ticket extends `phase-6-commitment-blocks.md` with the three new coverage rules + a SPEC-77 relation paragraph framing how the pool-level rules compose with the existing per-block authoring discipline, escalates cast-role coverage from Phase 6 authoring rule to Phase 10 HARD-GATE check alongside the three new axes, and extends `branching-story-bootstrap/SKILL.md` line 49 enumeration with one new combined bootstrap-additional Phase 10 check naming the four-axis pool coverage as a single gate.

## Assumption Reassessment (2026-05-24)

1. Verified `phase-6-commitment-blocks.md:11` already prescribes cast-role coverage (the existing first axis); verified `phase-6-commitment-blocks.md:15` already prescribes the SPEC-77 per-block `compatible_turn_drivers[]` authoring discipline mapping predicates to driver-kinds (`npc_action` ↔ `any_plan_active`/`any_emotion_active`; `clock_fire` ↔ `any_clock_active`; `secret_reveal` ↔ `any_secret_unrevealed`; etc.); verified `bootstrap/SKILL.md:49` enumerates exactly 5 bootstrap-additional Phase 10 checks (cast resolution to existing CHAR; STCHAR creation; SF non-globalization; root page plan completeness incl. §16a; continuation capacity; terminal-root-rejected — note the prose says "5" but lists 6 sub-items, an existing pre-SPEC-80 minor discrepancy outside this ticket's scope). The new pool-coverage check becomes a 6th (or 7th if the existing miscounting is preserved) bootstrap-additional check.
2. Verified SPEC-80 §3.1 trigger map's STSEC row uses schema-grounded enum values `{hidden, partially_revealed}` per `tools/validators/src/schemas/story-secret.schema.json:88` (the broader enum is `["hidden", "partially_revealed", "revealed", "disproven", "abandoned"]`). Verified SPEC-80 §3.1 driver-kind enum matches `story-event.schema.json:96-103` and `story-storylet.schema.json:254-261` exactly.
3. **Cross-skill boundary under audit**: the bootstrap-author-side coverage rule must remain symmetrically paralleled by `commitment-block-authoring`'s Phase 1 #15 cast-role coverage criterion (already at `commitment-block-authoring/SKILL.md:159`) and by the new Phase 1 targets #16/#17 that SPEC80STOPOODRI-002 introduces. The bootstrap-author-side rule guards the GENESIS pool at story creation; the Phase 1 targets guard pool EVOLUTION during direct_batch additions. Both must use the same §3.1/§3.2/§3.3 trigger maps so the two enforcement points stay consistent. The shared contract surface: SPEC-80 §3 trigger maps (single source of truth).
4. **FOUNDATIONS principles under audit**: Validation Rule 5 (No Consequence Evasion) — active high-urgency pressure records without any pool storylet that can resolve through them are a pool-level consequence-evasion risk; this rule motivates the coverage diagnostic. §Story Bundles §5c (Present Causal State, Not Narrative Shape) — the coverage check decides presence/absence of expressive SLTs only, never relative weighting; this is the load-bearing distinction from the drama-manager pattern §5c rejects (per SPEC-80 §2.1 and §3 framing).
5. **HARD-GATE enforcement surface**: `branching-story-bootstrap` Phase 10 HARD-GATE flow (per `branching-story-bootstrap/SKILL.md:42-54` HARD-GATE block + line 49 enumeration). This ticket adds one new bootstrap-additional check to the Phase 10 gate. The new check is read-only over the seeded SLT pool against the bundle's active records; it does NOT introspect any record's hidden state, does NOT touch the Mystery Reserve firewall (story state contract §7 gate 3 continues to gate any actual `secret_reveal` event against forbidden-status M overlap independently), and does NOT modify any canon-write path. The HARD-GATE failure semantics (abort before commit) follow the existing Phase 10 partial-failure discipline documented at `docs/HARD-GATE-DISCIPLINE.md`.

## Architecture Check

1. **Single combined check, not four**: the four coverage axes (cast-role + driver-kind + pressure-source-class + composition) are validated as ONE pool-coverage gate, not as four separate enumerated checks. Pool coverage is the conceptual unit; the four axes are facets of the same gate's pass/fail decision. This keeps Phase 10's enumeration tight and avoids visual proliferation.
2. **Per-block discipline (SPEC-77) and pool-level discipline (SPEC-80) compose, do not overlap**: SPEC-77's per-block rule at `phase-6-commitment-blocks.md:15` ensures each seeded SLT declares the right drivers in `grounding.compatible_turn_drivers[]`; SPEC-80's pool-level rule ensures the UNION of seeds covers every driver-kind the bundle's active records demand. The two rules together form a two-layer check; neither replaces the other. The new SPEC-77-relation paragraph in `phase-6-commitment-blocks.md` makes the composition explicit.
3. **Single source of truth for trigger maps**: SPEC-80 §3 trigger maps are the canonical reference for both the bootstrap-author-side rule and the `commitment-block-authoring` Phase 1 #16/#17 targets that SPEC80STOPOODRI-002 introduces. The Phase 6 reference cites the spec's §3 sections rather than restating the maps in skill prose (which would create dual-maintenance burden).
4. No backwards-compatibility aliasing or shims introduced. The existing cast-role authoring-rule prose at `phase-6-commitment-blocks.md:11` remains; the SPEC-77 grounding-population prose at line 15 remains; the three new coverage paragraphs are additive after them.

## Verification Layers

1. Cast-role coverage rule still present in `phase-6-commitment-blocks.md` after edits → codebase grep-proof: `grep -n "Cast-role coverage" .claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` returns the existing rule unchanged.
2. Three new coverage paragraphs (Driver-kind coverage, Pressure-source coverage, Composition) and SPEC-77 relation paragraph added to `phase-6-commitment-blocks.md` → codebase grep-proof: `grep -n "Driver-kind coverage\|Pressure-source coverage\|Composition\|Relation to SPEC-77 per-block" .claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` returns 4 matches.
3. Bootstrap SKILL.md line 49 enumeration extended with the new pool-coverage check → codebase grep-proof: `grep -n "pool coverage (cast-role + driver-kind" .claude/skills/branching-story-bootstrap/SKILL.md` returns 1 match.
4. Phase 10 HARD-GATE pool-coverage check fires correctly on positive case → skill dry-run: invoke `/branching-story-bootstrap` with `seed_commitment_blocks: minimal` against a fixture bundle containing two NPC STENT + one STPLAN + one STEMO + one CLK; verify Phase 10 PASS with the new pool-coverage check rationale on `PG-1.validation_trace` covering `[player_action, npc_action, clock_fire]` driver-kinds + `[STPLAN, STEMO, CLK]` source-classes + their composition pairs (SPEC-80 §8 test 1).
5. Phase 10 HARD-GATE pool-coverage check fires correctly on negative case → skill dry-run: same fixture but with seed blocks restricted to `player_action`-only; verify Phase 10 FAIL naming the uncovered driver-kinds, source-classes, and composition gaps (SPEC-80 §8 test 2).
6. `none` mode bypasses the coverage check → skill dry-run: invoke `/branching-story-bootstrap` with `seed_commitment_blocks: none` against the same fixture; verify Phase 10 passes without invoking the pool-coverage check (the runtime JIT path is the explicit alternative) (SPEC-80 §8 test 5).
7. Mystery Reserve firewall preservation → FOUNDATIONS alignment check: SPEC-80 §7 Rule 7 row asserts the coverage check surfaces expressive capacity only and does not enable any reveal; story state contract §7 gate 3 continues to gate every actual STSEC reveal independently. Verify no edits to `phase-6-commitment-blocks.md` or `bootstrap/SKILL.md` weaken or bypass gate 3.

## What to Change

### 1. Add three new coverage paragraphs to `phase-6-commitment-blocks.md`

After the existing Cast-role coverage paragraph (line 11) and the SPEC-77 grounding-population paragraph (line 15), insert three new paragraphs verbatim from SPEC-80 §4.1:

> **Driver-kind coverage**: enumerate the bundle's active records per the §3.1 trigger map above and ensure at least one seed block exists with `grounding.compatible_turn_drivers[]` containing each triggered driver kind. The closed enum is `[player_action, player_write_in, npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision]`; seed-block authors pick the kinds the block's predicates structurally support.

> **Pressure-source coverage**: enumerate the bundle's load-bearing record classes per the §3.2 trigger map and ensure at least one seed block's `preconditions.hard[]` or `preconditions.soft[]` references each class via the appropriate existential predicate (`any_plan_active`, `any_emotion_active`, `any_clock_active`, etc.) or a literal record-id reference.

> **Composition**: for each (driver-kind, source-class) pair the bundle demands, at least one seed block must satisfy both axes simultaneously. The simplest case: bundles with active NPC STPLAN records need at least one seed block with `compatible_turn_drivers` containing `npc_action` AND a precondition referencing STPLAN.

### 2. Add SPEC-77 relation paragraph to `phase-6-commitment-blocks.md`

Immediately following the three coverage paragraphs above, add a paragraph framing how the per-block SPEC-77 discipline composes with the pool-level SPEC-80 rule (verbatim from SPEC-80 §4.1):

> **Relation to SPEC-77 per-block driver-kind authoring discipline.** SPEC-77 §3.4 (already prescribed at `phase-6-commitment-blocks.md:15`) requires every seeded SLT to populate `grounding.compatible_turn_drivers[]` with the closed driver-kind enum entries the block's predicates structurally support, mapping per-predicate. That is the per-block correctness rule. The §3.1 trigger map above is the pool-level coverage rule — the inverse direction: which active-record class implies which driver-kind must be expressible somewhere in the seeded pool. The two compose: per-block SPEC-77 authoring ensures each seed declares the right drivers; pool-level SPEC-80 coverage ensures the union of seeds covers every driver-kind the bundle's active records demand.

### 3. Add four-axes HARD-GATE summary paragraph to `phase-6-commitment-blocks.md`

After the SPEC-77 relation paragraph, add the four-axes HARD-GATE summary (verbatim from SPEC-80 §4.1):

> These additions extend the existing cast-role coverage rule; they do not replace it. The bootstrap HARD-GATE flow at Phase 10 fails if any of the **four coverage axes** (cast-role + driver-kind + pressure-source-class + composition) is unmet at minimal-or-standard `seed_commitment_blocks`. The `none` mode bypasses the coverage check because runtime JIT is the explicit alternative.

### 4. Extend `branching-story-bootstrap/SKILL.md` Phase 10 enumeration (line 49)

Edit the Phase 10 HARD-GATE block's bootstrap-additional-checks enumeration at `SKILL.md:49` to add one new check after the existing list. The line currently reads (truncated for brevity):

> (c) Phase 10 has validated all 8 shared hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7 with a one-line PASS rationale per gate on `PG-1.validation_trace`, plus the 5 bootstrap-additional checks (cast resolution …; … ; terminal root rejected as authoring error).

Append the new check to the parenthetical list:

> … ; terminal root rejected as authoring error; pool coverage (cast-role + driver-kind + pressure-source-class + composition per SPEC-80 §3) — fails when any axis is unmet at `seed_commitment_blocks: minimal | standard`, bypassed at `seed_commitment_blocks: none`.

Update the count word in the same line from "5 bootstrap-additional checks" to "6 bootstrap-additional checks" (preserving the existing prose-vs-list discrepancy is acceptable; the literal change is to bump the count by one).

### 5. Implement the Phase 10 pool-coverage check

Wire the new check into the Phase 10 validation flow. The check reads (a) the bundle's just-drafted active records (STPLAN, STEMO, CLK, STSEC, STQ, THR, OBL, CNSQ, STENT, plus STCHAR-bound STENT classifications) from working memory, (b) the just-drafted seeded SLT pool from working memory, applies the §3.1/§3.2/§3.3 trigger maps + composition rule, and records PASS or FAIL with the one-line rationale per `PG-1.validation_trace` discipline. On FAIL, surface the uncovered driver-kinds, source-classes, and composition gaps. On `seed_commitment_blocks: none`, the check is skipped (records N/A rationale).

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` (modify) — append three coverage paragraphs + SPEC-77 relation paragraph + four-axes HARD-GATE summary after the existing cast-role and SPEC-77 grounding paragraphs.
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify) — Phase 10 enumeration extension at line 49 (add the new bootstrap-additional pool-coverage check; bump count from 5 to 6) and Phase 10 implementation wiring for the check.

## Out of Scope

- Schema changes to SLT, STSEC, STPLAN, STEMO, CLK, STQ, THR, OBL, CNSQ, BEL, STINT, SREL, or STENT records (SPEC-80 §5 explicitly forbids).
- Runtime pool-level SLT ranking by pressure-source priority (SPEC-80 §6 explicit non-goal — runtime selection remains local salience ranking per FOUNDATIONS §Story Bundles §5c).
- Auto-generation of SLTs to close coverage gaps (SPEC-80 §6 explicit non-goal — authoring remains human-supervised through `commitment-block-authoring`'s existing HARD-GATE flow).
- Editing `commitment-block-authoring/SKILL.md` Phase 1 — that surface is owned by SPEC80STOPOODRI-002.
- Adding Phase 2o to `branching-story-health-audit/SKILL.md` — that surface is owned by SPEC80STOPOODRI-003.
- Resolving the existing pre-SPEC-80 prose-vs-list miscount at `bootstrap/SKILL.md:49` (the prose says "5" but the parenthetical lists 6 sub-items today) — bump the prose count by one in lockstep with the new check addition, but do not retroactively reconcile the prior miscount.

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run: `/branching-story-bootstrap` against a fixture bundle with `seed_commitment_blocks: minimal`, two NPC STENT + one STPLAN + one STEMO + one CLK; Phase 10 HARD-GATE passes with pool-coverage check rationale on `PG-1.validation_trace` confirming union covers `[player_action, npc_action, clock_fire]` driver-kinds + `[STPLAN, STEMO, CLK]` source-classes + composition pairs (SPEC-80 §8 test 1).
2. Skill dry-run: same fixture with seed blocks restricted to `player_action`-only; Phase 10 HARD-GATE FAILS with a clear error naming the uncovered driver-kinds, source-classes, and composition gaps (SPEC-80 §8 test 2).
3. Skill dry-run: `/branching-story-bootstrap` against the same fixture with `seed_commitment_blocks: none`; Phase 10 HARD-GATE passes WITHOUT invoking the pool-coverage check (rationale: bypassed due to `none` mode; runtime JIT is the alternative) (SPEC-80 §8 test 5).
4. Codebase grep-proof: `grep -n "Driver-kind coverage\|Pressure-source coverage\|^**Composition**\|Relation to SPEC-77 per-block\|four coverage axes" .claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` returns ≥5 matches.
5. Codebase grep-proof: `grep -n "pool coverage (cast-role + driver-kind" .claude/skills/branching-story-bootstrap/SKILL.md` returns 1 match in the Phase 10 enumeration.

### Invariants

1. Cast-role coverage rule (existing) remains in `phase-6-commitment-blocks.md` unchanged structurally; the escalation is to enforcement layer (Phase 10 HARD-GATE) not to authoring prose.
2. Mystery Reserve firewall (story state contract §7 gate 3) continues to gate every actual STSEC reveal against forbidden-status M overlap independently of the new coverage check. The coverage check tests EXPRESSIVE CAPACITY of the seeded pool; it does not enable, weaken, or bypass any reveal-time gate.
3. Per-block SPEC-77 grounding-population rule at `phase-6-commitment-blocks.md:15` remains unchanged. The pool-level rule is additive; it does not replace per-block correctness.
4. `seed_commitment_blocks: none` mode bypasses pool-coverage check unconditionally — runtime JIT pool generation is the explicit alternative documented at `branching-story-bootstrap/SKILL.md:162`.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is skill-dry-run based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n "Driver-kind coverage\|Pressure-source coverage\|Relation to SPEC-77 per-block\|four coverage axes" .claude/skills/branching-story-bootstrap/references/phase-6-commitment-blocks.md` — verify the three new coverage paragraphs + SPEC-77 relation paragraph + four-axes summary all landed.
2. `grep -n "pool coverage (cast-role + driver-kind" .claude/skills/branching-story-bootstrap/SKILL.md` — verify the new bootstrap-additional check landed in Phase 10's enumeration.
3. `/branching-story-bootstrap` skill dry-run against the SPEC-80 §8 test 1 / test 2 / test 5 fixtures — verifies Phase 10 HARD-GATE pass/fail/bypass behavior. The skill is LLM-driven and not invokable from test-suite code; manual dry-run is the verification surface, per `tickets/README.md` §3 valid verification surfaces (skill dry-run).
