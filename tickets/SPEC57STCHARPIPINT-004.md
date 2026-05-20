# SPEC57STCHARPIPINT-004: Turn-cycle STCHAR consumption + block-and-route

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `branching-story-turn-cycle` (SKILL.md + 4 reference files) to consume active STCHAR and to block-and-route mid-story complex characters; no new tool/schema.
**Deps**: SPEC57STCHARPIPINT-001 (routes to the authoring skill), SPEC57STCHARPIPINT-002 (emits the §16a page-plan packet).

## Problem

Turn-cycle currently derives world `CHAR` seeds from `STENT.bound_char_id` — a field SPEC-56 removed from the STENT schema, so the reference is already dangling. Turn-cycle must instead load active STCHAR, stop reading world `CHAR` at runtime, and block-and-route when a mid-story complex character has no bound STCHAR (SPEC-57 Phase 3 + Phase 7 turn-cycle emission).

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` line 17 reads `active STENT.bound_char_id values when non-null` — but `bound_char_id` no longer exists on `story-entity.schema.json` (SPEC-56 replaced it with `bound_stchar_id`). The context packet exposes `story_bundle_context.active_story_characters` (id, status, bound_stent_ids, source_kind, source_char_id, profile_revision, three hashes, packet_preview) with full bodies via `get_record(section_path)`.
2. SPEC-57 §Phase 3 specifies: pre-flight loads active STCHAR before resolving action / selecting-or-JIT storylets / creating-or-superseding BEL/STINT/SREL/STPLAN/STEMO / generating choices / writing page plans; derives authority from `bound_stchar_id` + `active_records.STCHAR`; the M6 `blocked_requires_stchar` routing result; trivial background entities commit with `role_in_story: [background]`, `bound_stchar_id: null`.
3. Cross-skill boundary under audit: turn-cycle's FOUNDATIONS Alignment table lives in `references/governance-and-foundations.md` (not inline) — it must be updated to reference STCHAR per the spec's Definition of Done. The §16a packet contract (SPEC57STCHARPIPINT-002) and the `active_story_characters` context-packet surface (SPEC-56) are the shared boundaries consumed here.
4. FOUNDATIONS §6.1: runtime characterization reads STCHAR, never world `CHAR`; the `no_char_authority_in_story_runtime` validator enforces this on page plans + receipts.
5. Canon-write ordering: the M6 rule gates state creation — turn-cycle must not commit a meaningful STENT/SE/PG for a complex new individual without a bound active STCHAR; instead it emits a `blocked_requires_stchar` routing result (`required_skill: story-character-profile`, mode, proposed display name, emergence context, source records, intended roles). This gating must preserve the shared eight hard gates (esp. the mystery/invariant firewall).
6. Field-rename blast radius: the `STENT.bound_char_id` → `STENT.bound_stchar_id` correction in `pre-flight-and-prerequisites.md` is a fix to a dangling reference (the field was already removed by SPEC-56). Pipeline grep: only turn-cycle's pre-flight prose still names `bound_char_id`; no production code reads it.

## Architecture Check

1. Block-and-route (rather than inline STCHAR authoring) honors the "story-pipeline skills don't chain" convention — only bootstrap (bundle owner) authors inline; turn-cycle emits a routing result the user actions via `story-character-profile`, then re-runs. This keeps the firewall exception isolated to the authoring skill.
2. No backwards-compatibility shim: the dangling `bound_char_id` reference is replaced outright with `bound_stchar_id` + `active_records.STCHAR`; no dual-path read is retained.

## Verification Layers

1. Pre-flight loads active STCHAR before any state derivation → skill dry-run; inspect pre-flight ordering.
2. No runtime characterization from `CHAR` → `no_char_authority_in_story_runtime` over emitted page plan + receipt; grep-proof that `bound_char_id` is gone from pre-flight.
3. Complex new characters block on STCHAR → dry-run of a mid-story complex-character introduction emits `blocked_requires_stchar`.
4. Page plan carries §16a STCHAR packets; grounding references STCHAR → grep-proof of `pages-prose-plans/PG-<n>.md`.

## What to Change

### 1. Pre-flight (references/pre-flight-and-prerequisites.md)

Replace the `STENT.bound_char_id` derivation with active STCHAR loading via `story_bundle_context.active_story_characters` + targeted `get_record(section_path)`; derive authority from `bound_stchar_id` + `active_records.STCHAR`.

### 2. Mid-story complex-character rule (SKILL.md + phase references)

Add the M6 `blocked_requires_stchar` routing-result pattern (criteria list, routing fields, user re-run flow); trivial background entities commit directly with `role_in_story: [background]`, `bound_stchar_id: null`.

### 3. Page plan + grounding (references/phase-7-page-plan.md, phase-8-choice-generation.md)

Emit the mandatory §16a STCHAR packets; CHC/STPLAN/STEMO grounding references STCHAR as in Phase 2.

### 4. FOUNDATIONS Alignment (references/governance-and-foundations.md)

Update the alignment table to reference STCHAR (§6.1 runtime firewall; §7 skills-don't-chain routing result).

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` (modify)

## Out of Scope

- The STCHAR authoring skill (SPEC57STCHARPIPINT-001) — turn-cycle routes to it, does not author.
- The §16a contract definition (SPEC57STCHARPIPINT-002).
- Prose-attach validation (SPEC57STCHARPIPINT-006).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "bound_char_id" .claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` returns zero matches; `grep -n "bound_stchar_id\|active_records.STCHAR\|active_story_characters" ...` returns the new derivation.
2. Dry-run: a mid-story complex-character introduction emits `blocked_requires_stchar` and does not commit a meaningful STENT/SE/PG; a `[background]` entity commits directly.
3. `grep -n "STCHAR" .claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` shows the updated FOUNDATIONS table.

### Invariants

1. Turn-cycle reads no world `CHAR` for characterization at runtime.
2. No meaningful STENT/SE/PG is committed for a complex new individual without a bound active STCHAR.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; behavior is LLM-executed and verified by dry-run + grep-proof. The bound_stchar_id schema field is covered by existing SPEC-56 validator tests.`

### Commands

1. `grep -n "bound_char_id\|bound_stchar_id\|active_records.STCHAR\|blocked_requires_stchar" .claude/skills/branching-story-turn-cycle/references/*.md .claude/skills/branching-story-turn-cycle/SKILL.md`
2. Turn-cycle dry-run for a complex-character introduction (inspect routing-result emission, no commit).
3. Dry-run + grep is the correct boundary because turn-cycle is LLM-executed; the only schema surface (`bound_stchar_id`) is validator-covered.
