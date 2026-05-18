# SPEC42STOSTADEB-010: branching-story-bootstrap optional seeding for CLK/STSEC/STQ

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `branching-story-bootstrap` SKILL.md with an optional Phase 4 step for seeding initial CLK/STSEC/STQ records when the premise warrants them (deadline-flavored premise → seed CLK; conspiracy/betrayal-flavored premise → seed STSEC; explicitly-introduced-setup premise → seed STQ); no new phases introduced; CLK/STSEC/STQ are NOT mandatory at bundle creation
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md

## Problem

At intake, the CLK/STSEC/STQ classes existed (SPEC42STOSTADEB-001 / -002 / -003), but `branching-story-bootstrap` did not yet tell authors when a root bundle needed optional seed records. Bundles bootstrapped under premise types that naturally call for the new classes now have explicit guidance: a deadline-flavored premise can seed a CLK; a conspiracy-flavored premise can seed a STSEC; an explicit-setup premise can seed a STQ. The missing guidance risk was authors either skipping the new classes entirely or struggling to discover when they apply.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/branching-story-bootstrap/SKILL.md` exists; existing bootstrap creates STENT/STSTAT/STINT/SF/BEL/SE/OBL/CNSQ/THR/SREL/STLOC/STOBJ/optional DA/BR/PG/optional CHC/optional SLT per FOUNDATIONS §Story Bundles §7 — new bootstrap step extends this with optional CLK/STSEC/STQ seeding. The existing Player Agency Contract section (verified in SPEC-42 brainstorm agent reports as load-bearing — bootstrap requires three bullets) is unchanged by this ticket.
2. Spec verified at `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 4 (Skill integration tier): "`branching-story-bootstrap` optional Phase 4 step for seeding CLK/STSEC/STQ when the premise calls for them (deadline-flavored premise → seed CLK; conspiracy/betrayal-flavored premise → seed STSEC; explicitly-introduced-setup premise → seed STQ)"; spec emphasizes "CLK/STSEC/STQ are NOT mandatory at bundle creation — premises that warrant them get them."
3. Cross-skill / cross-tool shared boundary: `branching-story-bootstrap` depends on the same patch-engine ops, allocator registrations, and validators as `branching-story-turn-cycle` — the seeding step uses the same `create_clk_record` / `create_stsec_record` / `create_stq_record` ops landed in -001 / -002 / -003. The shared `STORY_KERNEL.md` document is unchanged by this ticket (no new section required for the optional seeding guidance).
4. Live reassessment on 2026-05-18 found the ticket's schema-section references stale: the canonical class schemas now live in `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.14 / §4.5.15 / §4.5.16, while `.claude/skills/_shared-templates/story-state-contract.md` §4 is a pointer. The implementation cites the live schema sections.
5. HARD-GATE discipline was read on 2026-05-18 because `branching-story-bootstrap` is a content-generating story skill and the implementation updates record inventories inside its `<HARD-GATE>` block. The landed edit is non-semantic inventory/guidance: it preserves approval timing, gate order, PASS/FAIL criteria, validation flow, submit/approval-token behavior, and patch-engine write discipline.
6. The drafted skill dry-run / fixture harness was not present as an executable repo command. Verification was narrowed to manual contract review plus grep-proof over the edited skill and this ticket; the SPEC42STOSTADEB-015 capstone remains the owner for full-pipeline integration proof.

## Architecture Check

1. **Optional seeding preserves backwards-compatibility**: bundles bootstrapped without premise-flavored seeding cues continue to work exactly as today (no CLK/STSEC/STQ records emitted, no skill flow change).
2. **Premise-flavored heuristics keep authoring lightweight**: the skill suggests when to seed but doesn't force it; the author decides based on the proposal's premise text. This matches the existing optional-DA / optional-CHC / optional-SLT seeding pattern.
3. **No new bootstrap phase**: extends the existing Phase 4 (state-record seeding); does NOT introduce a new "Phase 4b — debt/secret/clock seeding" phase. Keeps the bootstrap flow simple.

## Verification Layers

1. Bootstrap guidance maps deadline-flavored premises to optional CLK seed records → manual contract review + grep-proof over `branching-story-bootstrap`
2. Bootstrap guidance maps conspiracy / betrayal premises to optional STSEC seed records → manual contract review + grep-proof over `branching-story-bootstrap`
3. Bootstrap guidance maps explicitly introduced setup premises to optional STQ seed records → manual contract review + grep-proof over `branching-story-bootstrap`
4. Bootstrap guidance keeps CLK/STSEC/STQ non-mandatory for neutral premises → grep-proof over the Phase 4 non-mandatory boundary

## Landed Changes

### 1. Bootstrap Phase 4 extension — optional CLK/STSEC/STQ seeding

`.claude/skills/branching-story-bootstrap/SKILL.md` now adds a sub-step under existing Phase 4 (state-record seeding) describing the optional CLK/STSEC/STQ seeding decision. The sub-step text:
- Names the three premise-flavor heuristics: deadline-flavored → CLK; conspiracy/betrayal-flavored → STSEC; explicitly-introduced-setup → STQ.
- Provides a brief example for each class.
- Explicitly states that CLK/STSEC/STQ are not mandatory at bundle creation and are seeded only when the premise warrants them.
- References the per-class schemas at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.14 / §4.5.15 / §4.5.16 for full field reference.
- Notes the ID-allocation pattern: use `mcp__worldloom__allocate_next_id(world_slug, id_class="CLK"|"STSEC"|"STQ", story_slug=<story_slug>)` at seeding time.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 4 sub-step addition for optional CLK/STSEC/STQ seeding)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Turn-cycle integration consuming new classes during page commits — landed in `archive/tickets/SPEC42STOSTADEB-009.md`
- Commitment-block-authoring extension consuming new class predicates — owned by archive/tickets/SPEC42STOSTADEB-011.md
- Health-audit checks for stalled clocks / under-supported revelations / dropped setups — landed in `archive/tickets/SPEC42STOSTADEB-012.md`
- Prose-attach verification for clock-tick / revealed-secret prose — owned by SPEC42STOSTADEB-013
- Cross-class contract doc updates — landed in archive/tickets/SPEC42STOSTADEB-014.md

## Acceptance Criteria

### Tests That Must Pass

1. Manual contract review confirms a deadline-flavored premise has optional CLK seeding guidance.
2. Manual contract review confirms a conspiracy/betrayal-flavored premise has optional STSEC seeding guidance.
3. Manual contract review confirms an explicitly introduced setup premise has optional STQ seeding guidance.
4. Grep-proof confirms the skill states CLK/STSEC/STQ are not mandatory at bundle creation and are seeded only when the premise warrants them.

### Invariants

1. CLK/STSEC/STQ are NOT mandatory at bundle creation — bootstrap on a premise without flavored cues produces a valid bundle with zero new-class records
2. When seeded, new-class records use the standard allocation pattern (`allocate_next_id` per class) — no ID collisions
3. Seeded records pass per-class validators (-005 / -006 / -007) and shared validators (-008)

## Test Plan

### New/Modified Tests

1. None — skill-prose integration ticket; no executable bootstrap dry-run harness or skill-fixture test structure is present in this repo.

### Commands

1. `rg -n 'CLK|STSEC|STQ|deadline-flavored|conspiracy|betrayal|explicitly introduced setup|not mandatory at bundle creation|create_clk_record|create_stsec_record|create_stq_record' .claude/skills/branching-story-bootstrap/SKILL.md`
2. `rg -n 'story-record-schemas.md.*4\\.5\\.14|story-record-schemas.md.*4\\.5\\.15|story-record-schemas.md.*4\\.5\\.16|allocate_next_id\\(world_slug, id_class=\"CLK\"\\|\"STSEC\"\\|\"STQ\"' .claude/skills/branching-story-bootstrap/SKILL.md archive/tickets/SPEC42STOSTADEB-010.md`
3. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md archive/tickets/SPEC42STOSTADEB-010.md`
4. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone.

## Outcome

Completed on 2026-05-18.

`branching-story-bootstrap` now optionally seeds CLK/STSEC/STQ records during existing Phase 4 when the premise warrants them. The skill's pre-flight allocator list, HARD-GATE in-memory inventory, output inventory, Phase 4 guidance, root `SE.state_delta`, root `PG.state_snapshot`, patch-plan operation list, index inventory, schema references, and FOUNDATIONS alignment table all recognize the optional new classes. The edit keeps CLK/STSEC/STQ non-mandatory at bundle creation and preserves the existing hard-gate approval flow.

## Verification Result

1. `rg -n 'CLK|STSEC|STQ|deadline-flavored|conspiracy|betrayal|explicitly introduced setup|not mandatory at bundle creation|create_clk_record|create_stsec_record|create_stq_record' .claude/skills/branching-story-bootstrap/SKILL.md` — passed; the skill names the optional class guidance, premise heuristics, non-mandatory boundary, and patch ops.
2. `rg -n 'story-record-schemas.md.*4\.5\.14|story-record-schemas.md.*4\.5\.15|story-record-schemas.md.*4\.5\.16|allocate_next_id\(world_slug, id_class="CLK"\|"STSEC"\|"STQ"' .claude/skills/branching-story-bootstrap/SKILL.md archive/tickets/SPEC42STOSTADEB-010.md` — passed; live schema sections and allocation guidance are cited.
3. `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md archive/tickets/SPEC42STOSTADEB-010.md` — passed.

## Deviations

- The drafted skill dry-run / fixture proof was replaced with manual contract review plus grep-proof because the repo does not expose an executable `branching-story-bootstrap` dry-run harness. SPEC42STOSTADEB-015 remains the capstone owner for full-pipeline integration proof.
- The drafted schema references to `story-state-contract.md` §4.6 / §4.7 / §4.8 were corrected to the live split contract sections in `story-record-schemas.md` §4.5.14 / §4.5.15 / §4.5.16.
