# SPEC42STOSTADEB-010: branching-story-bootstrap optional seeding for CLK/STSEC/STQ

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `branching-story-bootstrap` SKILL.md with an optional Phase 4 step for seeding initial CLK/STSEC/STQ records when the premise warrants them (deadline-flavored premise → seed CLK; conspiracy/betrayal-flavored premise → seed STSEC; explicitly-introduced-setup premise → seed STQ); no new phases introduced; CLK/STSEC/STQ are NOT mandatory at bundle creation
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, SPEC42STOSTADEB-003

## Problem

Once the CLK/STSEC/STQ classes exist (SPEC42STOSTADEB-001 / -002 / -003), bundles bootstrapped under premise types that naturally call for the new classes should optionally seed them at bundle creation — a deadline-flavored premise (e.g., "the city must evacuate before the dam breaks") naturally seeds a CLK; a conspiracy-flavored premise (e.g., "Captain Sera lied about the ferry manifests to protect her brother") naturally seeds a STSEC; an explicit-setup premise (e.g., "the sealed letter implies betrayal but the player doesn't know who") naturally seeds a STQ. Without optional seeding guidance, authors will either skip the new classes entirely or struggle to discover when they apply.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/branching-story-bootstrap/SKILL.md` exists; existing bootstrap creates STENT/STSTAT/STINT/SF/BEL/SE/OBL/CNSQ/THR/SREL/STLOC/STOBJ/optional DA/BR/PG/optional CHC/optional SLT per FOUNDATIONS §Story Bundles §7 — new bootstrap step extends this with optional CLK/STSEC/STQ seeding. The existing Player Agency Contract section (verified in SPEC-42 brainstorm agent reports as load-bearing — bootstrap requires three bullets) is unchanged by this ticket.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 4 (Skill integration tier): "`branching-story-bootstrap` optional Phase 4 step for seeding CLK/STSEC/STQ when the premise calls for them (deadline-flavored premise → seed CLK; conspiracy/betrayal-flavored premise → seed STSEC; explicitly-introduced-setup premise → seed STQ)"; spec emphasizes "CLK/STSEC/STQ are NOT mandatory at bundle creation — premises that warrant them get them."
3. Cross-skill / cross-tool shared boundary: `branching-story-bootstrap` depends on the same patch-engine ops, allocator registrations, and validators as `branching-story-turn-cycle` — the seeding step uses the same `create_clk_record` / `create_stsec_record` / `create_stq_record` ops landed in -001 / -002 / -003. The shared `STORY_KERNEL.md` document is unchanged by this ticket (no new section required for the optional seeding guidance).

## Architecture Check

1. **Optional seeding preserves backwards-compatibility**: bundles bootstrapped without premise-flavored seeding cues continue to work exactly as today (no CLK/STSEC/STQ records emitted, no skill flow change).
2. **Premise-flavored heuristics keep authoring lightweight**: the skill suggests when to seed but doesn't force it; the author decides based on the proposal's premise text. This matches the existing optional-DA / optional-CHC / optional-SLT seeding pattern.
3. **No new bootstrap phase**: extends the existing Phase 4 (state-record seeding); does NOT introduce a new "Phase 4b — debt/secret/clock seeding" phase. Keeps the bootstrap flow simple.

## Verification Layers

1. Bootstrap on a deadline-flavored premise emits at least one seed CLK record → skill dry-run (manual or fixture-driven)
2. Bootstrap on a conspiracy/betrayal-flavored premise emits at least one seed STSEC record → skill dry-run
3. Bootstrap on an explicitly-introduced-setup premise emits at least one seed STQ record → skill dry-run
4. Bootstrap on a premise with NO flavored cues for any new class emits zero CLK/STSEC/STQ records (backwards-compat) → skill dry-run

## What to Change

### 1. Bootstrap Phase 4 extension — optional CLK/STSEC/STQ seeding

Modify `.claude/skills/branching-story-bootstrap/SKILL.md`. Add a sub-step under the existing Phase 4 (state-record seeding) describing the optional CLK/STSEC/STQ seeding decision. The sub-step text should:
- Name the three premise-flavor heuristics: deadline-flavored → CLK; conspiracy/betrayal-flavored → STSEC; explicitly-introduced-setup → STQ.
- Provide a brief example for each (one or two sentences per class).
- Explicitly state: CLK/STSEC/STQ are NOT mandatory at bundle creation — they are seeded only when the premise warrants them.
- Reference the per-class schemas at `.claude/skills/_shared-templates/story-state-contract.md` §4.6 / §4.7 / §4.8 for full field reference (these sections are added by SPEC42STOSTADEB-001 / -002 / -003).
- Note the ID-allocation pattern: use `mcp__worldloom__allocate_next_id(world_slug, id_class="CLK"|"STSEC"|"STQ", story_slug)` at seeding time.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 4 sub-step addition for optional CLK/STSEC/STQ seeding)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Turn-cycle integration consuming new classes during page commits — owned by SPEC42STOSTADEB-009
- Commitment-block-authoring extension consuming new class predicates — owned by SPEC42STOSTADEB-011
- Health-audit checks for stalled clocks / under-supported revelations / dropped setups — owned by SPEC42STOSTADEB-012
- Prose-attach verification for clock-tick / revealed-secret prose — owned by SPEC42STOSTADEB-013
- Cross-class contract doc updates — owned by SPEC42STOSTADEB-014

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run on a deadline-flavored fixture premise emits at least one seed CLK record
2. Skill dry-run on a conspiracy/betrayal-flavored fixture premise emits at least one seed STSEC record
3. Skill dry-run on an explicit-setup fixture premise emits at least one seed STQ record
4. Skill dry-run on a neutral premise (no flavored cues) emits zero new-class records (backwards-compat)

### Invariants

1. CLK/STSEC/STQ are NOT mandatory at bundle creation — bootstrap on a premise without flavored cues produces a valid bundle with zero new-class records
2. When seeded, new-class records use the standard allocation pattern (`allocate_next_id` per class) — no ID collisions
3. Seeded records pass per-class validators (-005 / -006 / -007) and shared validators (-008)

## Test Plan

### New/Modified Tests

1. Skill-level fixture tests (path depends on existing bootstrap test structure; confirm at edit time) — fixtures covering the four premise-flavor cases (deadline / conspiracy / setup / neutral)

### Commands

1. `npm test --prefix tools/validators` (regression — confirms seeded records pass validators)
2. `npm test --prefix tools/patch-engine` (regression — confirms seeded records pass engine pre-apply)
3. Skill dry-run (manual or via skill-test harness if available): invoke `branching-story-bootstrap` on each fixture premise and inspect the produced bundle
4. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
