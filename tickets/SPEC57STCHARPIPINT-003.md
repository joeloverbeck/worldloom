# SPEC57STCHARPIPINT-003: Bootstrap STCHAR distillation + cast_bind_list reshape

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `branching-story-bootstrap` to distill STCHAR for every selected cast member before story state and to write the reshaped `cast_bind_list`; no new tool/schema (machine layer landed in SPEC-56).
**Deps**: archive/tickets/SPEC57STCHARPIPINT-001.md (STCHAR authoring shape mirrored inline), archive/tickets/SPEC57STCHARPIPINT-002.md (emits the §16a page-plan packet).

## Problem

Bootstrap owns bundle creation but currently binds cast via operational `char_id` and never produces STCHAR, so the runtime firewall (no world `CHAR` for characterization) cannot hold. This ticket makes bootstrap distill an STCHAR per selected cast member before any meaningful story state, reshape `cast_bind_list`, bind STENT via `bound_stchar_id`, and emit the §16a page-plan packet (SPEC-57 Phase 2 + Phase 7 bootstrap emission).

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/branching-story-bootstrap/SKILL.md` currently writes `cast_bind_list` with operational `char_id` and creates STENT without `bound_stchar_id`; it reads `worlds/<slug>/characters/INDEX.md` and resolves `CHAR-*` via context-packet seed nodes. STENT schema (`tools/validators/src/schemas/story-entity.schema.json`) requires `bound_stchar_id` non-null for any `role_in_story` other than `[background]`.
2. SPEC-57 §Phase 2 specifies the new sequence (distill all STCHAR → only then create STENT/temporal records/PG-1/SE-1/CHC/SLT → abort before any state if a required STCHAR fails) and the `cast_bind_list` shape (`stchar_id` + `stent_id` + non-operational `source_char_id` + `role_in_story`).
3. Cross-skill boundary under audit: the `cast_bind_list` shape in `STORY_KERNEL.md` frontmatter is the data-producer side; the parser `buildCastBindList` + `cast_bind_list` type in `tools/world-mcp/src/context-packet/{story-bundle-context.ts,shared.ts}` is the consumer. The parser already reads `stchar_id` + `source_char_id` (no `char_id`) per **SPEC-56 Phase 6, ticket `archive/tickets/SPEC56STCHARMACFOU-006.md`** (landed) — so this reshape does not strand the parser.
4. FOUNDATIONS §6.1 (runtime reads STCHAR, not `CHAR`) and Rule 4 (story-local STCHAR never auto-promotes). `BEL` does not use STCHAR as epistemic basis. Grounding rules: `STINT` from STCHAR appetite/refusals/pressure; `SREL`/`STPLAN`/`STEMO` include STCHAR in `derived_from` when load-bearing; `CHC` includes STCHAR in `grounded_in.records` when character-specific; `PG` includes `active_records.STCHAR`.
5. Canon-write ordering (HARD-GATE / story-bundle write order): the new sequence introduces an abort gate — no story-bundle record is written until every required STCHAR passes. This must not weaken the Mystery Reserve firewall (gate 3 of the shared eight hard gates) and must preserve the existing write-ordering discipline of the patch plan.
6. Schema reshape: `cast_bind_list` (a `STORY_KERNEL.md` frontmatter structure) changes from `char_id`-keyed to `stchar_id` + `source_char_id`. Consumer = `buildCastBindList` (already updated, SPEC-56). The change is breaking but co-sequenced; no compatibility shim.
7. Rename/remove blast radius: `char_id` is removed as operational authority from `cast_bind_list`. Pipeline-wide grep — the only operational consumer was `buildCastBindList`, already migrated by SPEC-56; bootstrap is the sole producer. No other `cast_bind_list.char_id` reader exists.

## Architecture Check

1. Distilling all STCHAR before any state, with an abort-on-failure gate, guarantees no half-built bundle binds a cast member to missing character authority — cleaner than lazily creating STCHAR on first use, which would leave already-written records dangling on failure.
2. No backwards-compatibility aliasing: `char_id` is dropped outright (the parser already moved); no dual-read shim is introduced.

## Verification Layers

1. Selected cast converted to STCHAR before state creation → skill dry-run; inspect bundle ordering.
2. STENT uses `bound_stchar_id` (non-null for non-background roles) → schema validation (`story-entity.schema.json`).
3. `cast_bind_list` uses `stchar_id` + non-operational `source_char_id`, no `char_id` → grep-proof of emitted `STORY_KERNEL.md`.
4. No runtime characterization from `CHAR` → `no_char_authority_in_story_runtime` over emitted records + page plan.
5. Initial page plan includes §16a STCHAR packets → grep-proof of `pages-prose-plans/PG-1.md`.

## What to Change

### 1. New bootstrap sequence

Load contracts → resolve `selected_cast` `CHAR` ids → for each: targeted MCP retrieval of the dossier (or required sections), allocate STCHAR id, draft + validate the hybrid profile → only after **all** STCHAR pass: create STENT bound via `bound_stchar_id`, initial temporal records, PG-1/SE-1/CHC/SLT, and the page plan with §16a STCHAR packets. Abort before any story state is created if a required STCHAR fails.

### 2. cast_bind_list reshape + grounding rules

Update the `cast_bind_list` block to `stchar_id` / `stent_id` / `source_char_id` (provenance only) / `role_in_story`; remove `char_id`. Add the §Phase 2 grounding rules for STINT / SREL / STPLAN / STEMO / CHC / PG and the `BEL`-is-not-STCHAR-basis note. Update bootstrap's FOUNDATIONS Alignment table to reference STCHAR.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)

## Out of Scope

- The STCHAR authoring skill itself (archive/tickets/SPEC57STCHARPIPINT-001.md).
- The §16a contract definition (archive/tickets/SPEC57STCHARPIPINT-002.md).
- The parser side (`buildCastBindList`) — landed in SPEC-56.
- Turn-cycle / prose-attach / health-audit consumption.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "stchar_id\|source_char_id" .claude/skills/branching-story-bootstrap/SKILL.md` shows the reshaped `cast_bind_list`; `grep -n "char_id:" ...` shows no operational `char_id`.
2. Dry-run over a small fixture cast: STCHAR authored before STENT; a forced STCHAR failure aborts before any story-bundle record is written.
3. `npm test --prefix tools/validators` passes (STENT `bound_stchar_id` conformance unaffected).

### Invariants

1. No story-bundle record is created before every required STCHAR passes validation.
2. Bootstrap writes no operational `CHAR-*` reference into any story-bundle record or page plan; `source_char_id` is provenance-only.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; behavior is LLM-executed and verified by dry-run + grep-proof. Machine-checkable conformance (STENT bound_stchar_id) is covered by existing SPEC-56 validator tests named in Assumption Reassessment.`

### Commands

1. `grep -n "stchar_id\|source_char_id\|char_id" .claude/skills/branching-story-bootstrap/SKILL.md`
2. Bootstrap dry-run over a fixture cast (inspect ordering + abort behavior, no commit).
3. The dry-run + grep boundary is correct because bootstrap is LLM-executed; the only machine surface (STENT schema) is exercised by the validators package.
