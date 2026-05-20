# SPEC57STCHARPIPINT-003: Bootstrap STCHAR distillation + cast_bind_list reshape

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `branching-story-bootstrap` to distill STCHAR for every selected cast member before story state and to write the reshaped `cast_bind_list`; no new tool/schema (machine layer landed in SPEC-56).
**Deps**: archive/tickets/SPEC57STCHARPIPINT-001.md (STCHAR authoring shape mirrored inline), archive/tickets/SPEC57STCHARPIPINT-002.md (emits the §16a page-plan packet).

## Problem

At intake, bootstrap owned bundle creation but still bound cast via operational `char_id` and never produced STCHAR, so the runtime firewall (no world `CHAR` for characterization) could not hold. This ticket made bootstrap distill an STCHAR per selected non-background cast member before story state, reshape `cast_bind_list`, bind STENT via `bound_stchar_id`, and emit the §16a page-plan packet (SPEC-57 Phase 2 + Phase 7 bootstrap emission).

## Assumption Reassessment (2026-05-21)

1. At intake, `.claude/skills/branching-story-bootstrap/SKILL.md` wrote `cast_bind_list` with operational `char_id` and created STENT without `bound_stchar_id`; it read `worlds/<slug>/characters/INDEX.md` and resolved `CHAR-*` via context-packet seed nodes. STENT schema (`tools/validators/src/schemas/story-entity.schema.json`) requires `bound_stchar_id` non-null for any `role_in_story` other than `[background]`.
2. SPEC-57 §Phase 2 specifies the new sequence (distill all STCHAR → only then create STENT/temporal records/PG-1/SE-1/CHC/SLT → abort before any state if a required STCHAR fails) and the `cast_bind_list` shape (`stchar_id` + `stent_id` + non-operational `source_char_id` + `role_in_story`).
3. Cross-skill boundary under audit: the `cast_bind_list` shape in `STORY_KERNEL.md` frontmatter is the data-producer side; the parser `buildCastBindList` + `cast_bind_list` type in `tools/world-mcp/src/context-packet/{story-bundle-context.ts,shared.ts}` is the consumer. The parser already reads `stchar_id` + `source_char_id` (no `char_id`) per **SPEC-56 Phase 6, ticket `archive/tickets/SPEC56STCHARMACFOU-006.md`** (landed) — so this reshape does not strand the parser.
4. FOUNDATIONS §6.1 (runtime reads STCHAR, not `CHAR`) and Rule 4 (story-local STCHAR never auto-promotes). `BEL` does not use STCHAR as epistemic basis. Grounding rules: `STINT` from STCHAR appetite/refusals/pressure; `SREL`/`STPLAN`/`STEMO` include STCHAR in `derived_from` when load-bearing; `CHC` includes STCHAR in `grounded_in.records` when character-specific; `PG` includes `active_records.STCHAR`.
5. Canon-write ordering (HARD-GATE / story-bundle write order): the new sequence introduces an abort gate — no story-bundle record is written until every required STCHAR passes. This must not weaken the Mystery Reserve firewall (gate 3 of the shared eight hard gates) and must preserve the existing write-ordering discipline of the patch plan.
6. Schema reshape: `cast_bind_list` (a `STORY_KERNEL.md` frontmatter structure) changes from `char_id`-keyed to `stchar_id` + `source_char_id`. Consumer = `buildCastBindList` (already updated, SPEC-56). The change is breaking but co-sequenced; no compatibility shim.
7. Rename/remove blast radius: `char_id` is removed as operational authority from `cast_bind_list`. Pipeline-wide grep — the only operational consumer was `buildCastBindList`, already migrated by SPEC-56; bootstrap is the sole producer. No other `cast_bind_list.char_id` reader exists.
8. Reassessment correction: this repo does not expose an executable runner for `.claude/skills/<slug>/` dry-runs in Codex. The accepted proof surface is therefore grep/manual contract review of the live bootstrap skill plus `npm test --prefix tools/validators`, not a claimed live bootstrap invocation. The negative `char_id` proof also needs an anchored operational-field search (`^\s*-\s*char_id:`), because the valid `source_char_id` provenance field intentionally contains the substring `char_id`.

## Architecture Check

1. Distilling all STCHAR before any state, with an abort-on-failure gate, guarantees no half-built bundle binds a cast member to missing character authority — cleaner than lazily creating STCHAR on first use, which would leave already-written records dangling on failure.
2. No backwards-compatibility aliasing: `char_id` is dropped outright (the parser already moved); no dual-read shim is introduced.

## Verification Layers

1. Selected cast converted to STCHAR before state creation → manual contract review of bootstrap's HARD-GATE, process flow, and Phase 2 ordering.
2. STENT uses `bound_stchar_id` (non-null for non-background roles) → schema validation (`story-entity.schema.json`).
3. `cast_bind_list` uses `stchar_id` + non-operational `source_char_id`, no `char_id` → grep-proof of emitted `STORY_KERNEL.md`.
4. No runtime characterization from `CHAR` → `no_char_authority_in_story_runtime` over emitted records + page plan.
5. Initial page plan includes §16a STCHAR packets → grep-proof of `pages-prose-plans/PG-1.md`.

## Landed Changes

### 1. New bootstrap sequence

Updated bootstrap's HARD-GATE, process flow, pre-flight, output inventory, and phases so it resolves `selected_cast` `CHAR` ids, allocates STCHAR ids, drafts and validates one schema-valid `stchar.v1` profile per selected non-background cast member, and aborts before STENT/temporal/page/choice/direct-write artifacts if any required STCHAR fails. The patch plan now includes `append_story_character_authority_record` with `expected_id_allocations.stchar_ids`.

### 2. cast_bind_list reshape + grounding rules

Reshaped the `STORY_KERNEL.md` `cast_bind_list` block to `stchar_id` / `stent_id` / `source_char_id` (provenance only) / `role_in_story`; removed operational `char_id`. Added STENT `bound_stchar_id`, `PG.active_records.STCHAR`, STCHAR grounding for STINT / SREL / STPLAN / STEMO / CHC, the `BEL`-is-not-STCHAR-basis note, §16a page-plan packet emission, STCHAR entries in bundle `INDEX.md`, and a bootstrap FOUNDATIONS Alignment row for Story-Local Character Authority.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)

## Out of Scope

- The STCHAR authoring skill itself (archive/tickets/SPEC57STCHARPIPINT-001.md).
- The §16a contract definition (archive/tickets/SPEC57STCHARPIPINT-002.md).
- The parser side (`buildCastBindList`) — landed in SPEC-56.
- Turn-cycle / prose-attach / health-audit consumption.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'stchar_id|source_char_id|bound_stchar_id|append_story_character_authority_record|active_records.STCHAR|§16a|Story-Local Character Authority|story-character-authority.schema.json' .claude/skills/branching-story-bootstrap/SKILL.md` shows the reshaped `cast_bind_list`, STENT binding, patch op, active-record, §16a, FOUNDATIONS, and schema guidance; `rg -n '^\s*-\s*char_id:' .claude/skills/branching-story-bootstrap/SKILL.md` returns no operational `char_id` field.
2. Manual contract review confirms STCHAR is authored and validated before STENT/story-state creation and that failure aborts before any story-bundle record or direct-write artifact is written.
3. `npm test --prefix tools/validators` passes (STENT `bound_stchar_id` conformance unaffected).

### Invariants

1. No story-bundle record is created before every required STCHAR passes validation.
2. Bootstrap writes no operational `CHAR-*` reference into any story-bundle record or page plan; `source_char_id` is provenance-only.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; behavior is LLM-executed and verified by manual contract review + grep-proof. Machine-checkable conformance (STENT bound_stchar_id) is covered by existing SPEC-56 validator tests named in Assumption Reassessment.`

### Commands

1. `rg -n 'stchar_id|source_char_id|bound_stchar_id|append_story_character_authority_record|active_records.STCHAR|§16a|Story-Local Character Authority|story-character-authority.schema.json' .claude/skills/branching-story-bootstrap/SKILL.md`
2. `rg -n '^\s*-\s*char_id:' .claude/skills/branching-story-bootstrap/SKILL.md`
3. `npm test --prefix tools/validators`
4. Manual contract review is the correct substitute for a bootstrap dry-run because bootstrap is a `.claude/skills/` prose workflow with no executable Codex runner; the machine surface (STENT/STCHAR schema validation) is exercised by the validators package.

## Outcome

Completed: 2026-05-21

Updated `.claude/skills/branching-story-bootstrap/SKILL.md` so bootstrap now distills selected cast into STCHAR before story state, writes the `cast_bind_list` data-producer shape expected by the SPEC-56 parser, binds non-background STENT records through `bound_stchar_id`, includes STCHAR in page snapshots and choice/relationship/plan/emotion grounding where load-bearing, emits §16a page-plan STCHAR packets, and records STCHAR in the bundle index and FOUNDATIONS alignment.

## Verification Result

- `rg -n 'stchar_id|source_char_id|bound_stchar_id|append_story_character_authority_record|active_records.STCHAR|§16a|Story-Local Character Authority|story-character-authority.schema.json' .claude/skills/branching-story-bootstrap/SKILL.md` — PASS; the skill names the new producer shape, STENT binding, STCHAR patch op, page snapshot/packet surfaces, alignment row, and schema authority.
- `rg -n '^\s*-\s*char_id:' .claude/skills/branching-story-bootstrap/SKILL.md` — PASS by returning no matches; no operational `cast_bind_list` `char_id` field remains.
- `git diff --check -- .claude/skills/branching-story-bootstrap/SKILL.md` — PASS; no whitespace errors in the skill edit.
- `npm test --prefix tools/validators` — PASS; 768 tests passed.
- Manual contract review against SPEC-57 Phase 2/7, `docs/FOUNDATIONS.md` §6.1, `docs/HARD-GATE-DISCIPLINE.md`, `.claude/skills/story-character-profile/SKILL.md`, `.claude/skills/_shared-templates/story-state-contract.md` §16a, and `tools/validators/src/schemas/story-entity.schema.json` — PASS; bootstrap authors STCHAR before story state, preserves `source_char_id` as provenance only, keeps BEL epistemic basis separate, and waits for explicit HARD-GATE approval before writes.

## Deviations

- The drafted bootstrap dry-run proof was replaced with manual contract review plus grep proof because Codex has no executable `.claude/skills/<slug>` dry-runner in this repo.
- The drafted broad `grep ... char_id` proof was replaced with anchored `rg -n '^\s*-\s*char_id:'` because `source_char_id` is an intentional provenance field and should remain present.
