# SPEC57STCHARPIPINT-004: Turn-cycle STCHAR consumption + block-and-route

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `branching-story-turn-cycle` (SKILL.md + 4 reference files) to consume active STCHAR and to block-and-route mid-story complex characters; no new tool/schema.
**Deps**: archive/tickets/SPEC57STCHARPIPINT-001.md (routes to the authoring skill), archive/tickets/SPEC57STCHARPIPINT-002.md (emits the §16a page-plan packet).

## Problem

At intake, turn-cycle still derived world `CHAR` seeds from `STENT.bound_char_id` — a field SPEC-56 removed from the STENT schema. This ticket updates turn-cycle to load active STCHAR, stop reading world `CHAR` for runtime characterization, emit a `blocked_requires_stchar` routing result for mid-story complex characters without STCHAR, and carry STCHAR into page-plan / choice grounding guidance.

## Assumption Reassessment (2026-05-21)

1. At intake, `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` still read `active STENT.bound_char_id values when non-null`; the field no longer exists on `story-entity.schema.json` (SPEC-56 replaced it with `bound_stchar_id`). This ticket replaced that stale seed derivation with active STCHAR loading via `story_bundle_context.active_story_characters`, `PG.state_snapshot.active_records.STCHAR`, and targeted story-scoped retrieval. The context packet exposes `active_story_characters` summaries (id, status, bound_stent_ids, source_kind, source_char_id, profile_revision, three hashes, packet_preview) with full bodies available through `get_record(section_path)`.
2. SPEC-57 §Phase 3 specifies: pre-flight loads active STCHAR before resolving action / selecting-or-JIT storylets / creating-or-superseding BEL/STINT/SREL/STPLAN/STEMO / generating choices / writing page plans; derives authority from `bound_stchar_id` + `active_records.STCHAR`; the M6 `blocked_requires_stchar` routing result; trivial background entities commit with `role_in_story: [background]`, `bound_stchar_id: null`.
3. Cross-skill boundary under audit: turn-cycle's FOUNDATIONS Alignment table lives in `references/governance-and-foundations.md` (not inline) — it must be updated to reference STCHAR per the spec's Definition of Done. The §16a packet contract (archive/tickets/SPEC57STCHARPIPINT-002.md) and the `active_story_characters` context-packet surface (SPEC-56) are the shared boundaries consumed here.
4. FOUNDATIONS §6.1: runtime characterization reads STCHAR, never world `CHAR`; the `no_char_authority_in_story_runtime` validator enforces this on page plans + receipts.
5. Canon-write ordering: the M6 rule gates state creation — turn-cycle must not commit meaningful STENT/SE/PG/CHC state for a complex new individual without a bound active STCHAR; instead it emits a `blocked_requires_stchar` routing result (`required_skill: story-character-profile`, mode, proposed display name, emergence context records, source records, intended roles, rerun instruction). This gating preserves the shared eight hard gates by stopping before record-write drafting when STCHAR authority is missing.
6. Field-rename blast radius: the `STENT.bound_char_id` → `STENT.bound_stchar_id` correction in `pre-flight-and-prerequisites.md` is a fix to a dangling reference (the field was already removed by SPEC-56). Pipeline grep after implementation shows no `bound_char_id` hits under `.claude/skills/branching-story-turn-cycle`.

## Architecture Check

1. Block-and-route (rather than inline STCHAR authoring) honors the "story-pipeline skills don't chain" convention — only bootstrap (bundle owner) authors inline; turn-cycle emits a routing result the user actions via `story-character-profile`, then re-runs. This keeps the firewall exception isolated to the authoring skill.
2. No backwards-compatibility shim: the dangling `bound_char_id` reference is replaced outright with `bound_stchar_id` + `active_records.STCHAR`; no dual-path read is retained.

## Verification Layers

1. Pre-flight loads active STCHAR before any state derivation → manual contract review plus grep-proof over turn-cycle pre-flight and HARD-GATE wording.
2. No runtime characterization from `CHAR` → `no_char_authority_in_story_runtime` over emitted page plan + receipt; grep-proof that `bound_char_id` is gone from pre-flight.
3. Complex new characters block on STCHAR → manual contract review that turn-cycle emits `blocked_requires_stchar` before meaningful record writes when a complex new individual lacks STCHAR.
4. Page plan carries §16a STCHAR packets; grounding references STCHAR → grep-proof of `pages-prose-plans/PG-<n>.md`.

## Landed Changes

### 1. Pre-flight (references/pre-flight-and-prerequisites.md)

Replaced the stale `STENT.bound_char_id` derivation with active STCHAR loading via `story_bundle_context.active_story_characters`, `PG.state_snapshot.active_records.STCHAR`, and targeted story-scoped retrieval; STCHAR ids are explicitly story-local and not context-packet `seed_nodes`.

### 2. Mid-story complex-character rule (SKILL.md + phase references)

Added the M6 `blocked_requires_stchar` routing-result pattern to the HARD-GATE, process flow, Phase 2-3 procedure, and guardrails. Trivial background entities may commit directly only with `role_in_story: [background]`, `bound_stchar_id: null`, and no character-specific choices / voice / pressure-behavior grounding.

### 3. Page plan + grounding (references/phase-7-page-plan.md, phase-8-choice-generation.md)

Turn-cycle page-plan guidance now emits mandatory §16a STCHAR packets for relevant characters. Choice-generation guidance now cites active STCHAR when persona, pressure behavior, relationship conduct, or persona-specific risk materially shapes the choice, and blocks instead of emitting character-specific CHC when a complex new individual lacks STCHAR.

### 4. FOUNDATIONS Alignment (references/governance-and-foundations.md)

Updated the alignment table and guardrails to reference FOUNDATIONS §6.1 runtime character authority, including the `blocked_requires_stchar` routing result and the no-world-`CHAR` runtime boundary.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` (modify)

## Out of Scope

- The STCHAR authoring skill (archive/tickets/SPEC57STCHARPIPINT-001.md) — turn-cycle routes to it, does not author.
- The §16a contract definition (archive/tickets/SPEC57STCHARPIPINT-002.md).
- Prose-attach validation (SPEC57STCHARPIPINT-006).

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'bound_char_id' .claude/skills/branching-story-turn-cycle` returns zero matches; `rg -n 'bound_stchar_id|active_records\\.STCHAR|active_story_characters|blocked_requires_stchar' .claude/skills/branching-story-turn-cycle` returns the new derivation and routing guidance.
2. Manual contract review confirms a mid-story complex-character introduction emits `blocked_requires_stchar` before meaningful STENT/SE/PG/CHC state is committed; a `[background]` entity may commit directly with `bound_stchar_id: null` only when no character-specific authority is required.
3. `grep -n "STCHAR" .claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` shows the updated FOUNDATIONS table.

### Invariants

1. Turn-cycle reads no world `CHAR` for characterization at runtime.
2. No meaningful STENT/SE/PG is committed for a complex new individual without a bound active STCHAR.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; behavior is LLM-executed and verified by manual contract review + grep-proof. The bound_stchar_id schema field and STCHAR grounding validators are covered by existing SPEC-56 validator tests.`

### Commands

1. `rg -n 'bound_char_id' .claude/skills/branching-story-turn-cycle`
2. `rg -n 'bound_stchar_id|active_records\.STCHAR|active_story_characters|blocked_requires_stchar|§16a|Story-Local Character Authority' .claude/skills/branching-story-turn-cycle`
3. Manual review of `.claude/skills/branching-story-turn-cycle/SKILL.md`, `references/pre-flight-and-prerequisites.md`, `references/phase-7-page-plan.md`, `references/phase-8-choice-generation.md`, and `references/governance-and-foundations.md` against SPEC-57 Phase 3 / Phase 7 and FOUNDATIONS §6.1.

## Outcome

Completed: 2026-05-21

Turn-cycle now consumes STCHAR as runtime character authority. The skill HARD-GATE, pre-flight reference, Phase 2-3 procedure, page-plan guidance, choice-generation guidance, and FOUNDATIONS alignment all route character persona/voice/pressure behavior through active STCHAR, remove the stale `STENT.bound_char_id` seed path, require §16a page-plan packets for relevant characters, and block-and-route complex new characters to `story-character-profile` via `blocked_requires_stchar`.

## Verification Result

- `rg -n 'bound_char_id' .claude/skills/branching-story-turn-cycle` — PASS; no stale turn-cycle hits remain.
- `rg -n 'bound_stchar_id|active_records\.STCHAR|active_story_characters|blocked_requires_stchar|§16a|Story-Local Character Authority' .claude/skills/branching-story-turn-cycle` — PASS; the edited skill surfaces expose STCHAR loading, active-record grounding, block-and-route, §16a packets, and FOUNDATIONS §6.1 alignment.
- `grep -n "STCHAR" .claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` — PASS; the alignment table and guardrails now reference STCHAR runtime authority.
- Manual review against SPEC-57 Phase 3 / Phase 7, `docs/FOUNDATIONS.md` §6.1, and `docs/HARD-GATE-DISCIPLINE.md` — PASS; turn-cycle stops before meaningful record writes when a complex new character lacks STCHAR, does not read world `CHAR-*` for runtime characterization, and preserves explicit approval before writes.

## Deviations

- The drafted dry-run proof was replaced with manual contract review plus grep proof because this repo has no executable runner for `.claude/skills/<slug>/` dry-runs in Codex. This ticket changes LLM-facing skill instructions; schema-level `bound_stchar_id`, `active_records.STCHAR`, and STCHAR grounding behavior are covered by existing validator tests from SPEC-56.
