# BSBOOT-003: Disambiguate STENT/STINT `character_id` field semantics

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap` / `branching-story-page-cycle` skill prose + bootstrap `templates/story-records.yaml` only. No engine, validator, or schema change (the engine `^STINT-\d{4}$` regex governs id format, not field names; permissive JSON schemas already allow any field set).
**Deps**: none

## Problem

At intake, two distinct story-bundle record classes used the same field name `character_id` to mean different things:

- `STENT.character_id` → world-level `CHAR-NNNN` id (e.g. `CHAR-0007`).
- `STINT.character_id` → story-local `STENT-NNNN` id (e.g. `STENT-0001`) — i.e. the story entity this snapshot drives.

Same name, different referent types. Phase 9 gate 6 inherits the ambiguity ("Every protagonist + major has a non-empty bare-numeric `STINT-NNNN` record linked by `character_id`" — without saying *whose* `character_id`). The STENT example in `templates/story-records.yaml` is itself self-contradictory: it populates `world_ent_id: ENT-0042` AND `character_id: CHAR-0007`, while the inline comment says "STENTs whose character_id is set ALWAYS take world_ent_id: null".

## Assumption Reassessment (2026-05-06)

1. `templates/story-records.yaml:29` — STENT.character_id example value is `CHAR-0007` (world char id); inline comment says `null` for non-CHAR entities. Verified.
2. `templates/story-records.yaml:44` — STINT.character_id example value is `STENT-0001` (story entity id). Verified — the same field name carries a different referent type than on STENT.
3. Cross-skill / cross-artifact boundary: STENT and STINT are emitted by `branching-story-bootstrap` Phase 2, validated by `branching-story-bootstrap` Phase 9 gate 6, and consumed by `branching-story-page-cycle` (every page tick reads `intentions_current`). Field rename must be agreed by both skills' templates and any reference that names the field.
4. FOUNDATIONS / hard-gate principle: this does not weaken the Phase 9 validation gate or Mystery Reserve firewall. It makes gate 6's cast-intention coverage check more precise by naming the story-local link field (`STINT.stent_id`) instead of overloading `character_id`; `docs/HARD-GATE-DISCIPLINE.md` still requires every Phase 9 gate to record PASS with rationale before Phase 10 approval.
5. STENT example self-contradiction at `templates/story-records.yaml:28-29`: `world_ent_id: ENT-0042` is set while the comment forbids it when `character_id: CHAR-0007` is set. Trivial — set `world_ent_id: null` in the example.
6. Schema-extension classification: this is a field rename + an additive new optional field on STINT (`world_character_id`). Existing pre-rename bundles are unaffected because no committed world content is migrated by this prose/template ticket; the local gitignored `worlds/erotica-world/stories/red-bunny/_source/intentions/STINT-*.yaml` records currently use `character_id: STENT-*` and are intentionally left as historical/local content.
7. Same-seam widening: live grep found two additional STINT prose consumers outside the original file list: `branching-story-bootstrap/references/engine-envelope-shape.md` and `branching-story-page-cycle`'s record-emission prose. Those are same-contract references and are absorbed into this ticket so bootstrap and runtime page-cycle do not keep split field semantics.

## Architecture Check

1. **Why cleaner**: Disambiguating the field names removes a load-bearing source of confusion for downstream readers, validators, and any future strict bootstrap validator (BSBOOT-015). The fix preserves the engine `id` regex contract (`^STINT-\d{4}$`) — only field *names* and example values change, not id format.
2. No backwards-compatibility aliasing introduced. STINT records use the new field names directly; the old `character_id`-on-STINT name is removed wholesale from the template and skill prose.

## Verification Layers

1. STENT example shape consistency → schema validation (manual: read `templates/story-records.yaml` STENT example; confirm `world_ent_id: null` is set when `character_id: CHAR-NNNN`).
2. STINT example uses `stent_id` and `world_character_id` → codebase grep-proof (`grep -n "^character_id:" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns the STENT match only; the STINT block contains `stent_id:` and `world_character_id:` instead).
3. Phase 9 gate 6 wording references the new field → codebase grep-proof (`grep -n "stent_id" .claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`).
4. Bootstrap SKILL.md and engine-envelope prose reference the new field → codebase grep-proof.
5. Cross-skill consistency — `branching-story-page-cycle` STINT emission/schema prose references `stent_id` + `world_character_id` and no longer describes STINT per-character semantics as `character_id` → codebase grep-proof.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`

- STENT example now uses `world_ent_id: null` when `character_id: CHAR-0007` is set.
- STENT `intention_snapshot_id` now explains that per-character STINTs are distinguished by the STINT record's `stent_id` field, not by id suffix.
- STINT example now uses `stent_id: STENT-0001` plus `world_character_id: CHAR-0007`.
- STINT block header names `stent_id` and `world_character_id` semantics directly.

### 2. `.claude/skills/branching-story-bootstrap/SKILL.md`

- Phase 2 description now names `stent_id` and `world_character_id`.
- Output `_source/intentions/` comment now says forward-looking per-character semantics are carried by `stent_id`, with `world_character_id` as the optional CHAR anchor.

### 3. `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`

- Gate 6 now requires every protagonist + major to have a bare-numeric STINT whose `stent_id` points to its STENT.

### 4. `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md`

- Phase 2 §Initial intention snapshot per major character now names `stent_id` and `world_character_id`. The rest of the paragraph remains about goals, fears, secrets, beliefs, relationships, and pressure state.

### 5. Same-seam bootstrap/page-cycle prose consumers

- `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` now describes `record.stent_id` and `record.world_character_id` on `create_stint_record`.
- `.claude/skills/branching-story-page-cycle/SKILL.md` and `references/record-schemas.md` now use the same STINT semantics while preserving page-cycle's PG/SE/CHC schema authority and bootstrap's shared STINT schema authority.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phases-1-3-premise-cast-facts.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` (modify)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify)

## Out of Scope

- Engine regex change. `^STINT-\d{4}$` continues to govern id format.
- JSON-schema change. `tools/validators/src/schemas/story-intention.schema.json` is permissive — adding optional fields requires no schema edit.
- Migration of any pre-existing bundle. Local/gitignored bundles that already use STINT `character_id: STENT-*` remain historical content; this ticket only changes forward-looking skill/template guidance.
- Renaming STENT.character_id (it correctly refers to a world `CHAR-NNNN` and is not the source of collision).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "^character_id:" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns exactly one occurrence (the STENT example), not two.
2. `grep -n "stent_id" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns the STINT example.
3. `grep -n "world_character_id" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns the STINT example.
4. `grep -n "world_ent_id: null" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` returns the STENT example block.
5. `grep -rn "character_id" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-page-cycle/` returns only references to STENT.character_id / CHAR ids, the new `world_character_id` field, or intentionally labelled historical legacy bundle references — no surviving forward-looking reference to STINT.character_id.
6. `grep -rn "stent_id\|world_character_id" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-page-cycle/` shows the new STINT field names in the owned producer/consumer prose.

### Invariants

1. STENT.character_id continues to refer to a world `CHAR-NNNN` id everywhere it appears.
2. STINT.stent_id refers to a story-local `STENT-NNNN` id.
3. STINT.world_character_id is either a world `CHAR-NNNN` id or `null` (for story-only cast).
4. The engine regex `^STINT-\d{4}$` governing STINT id format remains unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -rn "character_id" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-page-cycle/` — confirms STINT.character_id residue is gone from forward-looking skill prose.
2. `grep -rn "stent_id\|world_character_id" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-page-cycle/` — confirms new field names are present in template + SKILL.md + phase-9 + phases-1-3 + engine-envelope + page-cycle consumer prose.
3. `find worlds -name "STINT-*.yaml" -exec grep -l "^character_id:" {} \;` — discovery-only local-world check; any matches are classified as pre-existing local content and not migrated by this ticket.

## Outcome

Completed: 2026-05-06.

The bootstrap STENT example is internally consistent, forward-looking STINT records now use `stent_id` for the story entity link and `world_character_id` for the optional world CHAR anchor, and bootstrap/page-cycle prose now agrees on that contract.

## Verification Result

1. `grep -rn "character_id" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-page-cycle/` — completed. Remaining skill hits are STENT.character_id / CHAR-id prose, `world_character_id`, or historical legacy-bundle prose; no forward-looking STINT `character_id` semantics remain.
2. `grep -rn "stent_id\|world_character_id" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-page-cycle/` — completed. New field names appear in the STINT template, bootstrap SKILL.md, Phase 9 gate 6, Phase 1-3 reference, engine-envelope reference, and page-cycle STINT consumer prose.
3. `grep -n "world_ent_id: null" .claude/skills/branching-story-bootstrap/templates/story-records.yaml` — completed. The STENT example now uses `world_ent_id: null`.
4. `find worlds -name 'STINT-*.yaml' -exec grep -l '^character_id:' {} \;` — completed as discovery. It reports local gitignored `worlds/erotica-world/stories/red-bunny/_source/intentions/STINT-*.yaml` records that predate this convention and are intentionally not migrated.

## Deviations

- Reassessment widened the file set to include `branching-story-bootstrap/references/engine-envelope-shape.md` and `branching-story-page-cycle` STINT prose because live grep found same-seam forward-looking references to the old field semantics.
- The original "no bundle has been written under this convention yet" assumption was false for local/gitignored world content. This ticket remains forward-only and does not direct-edit story-bundle `_source/*.yaml` records.
