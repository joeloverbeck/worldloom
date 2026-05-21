# SPEC59STCHARAUTFID-002: `page_plan_stchar_packet_integrity` validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator in `tools/validators` registered in `structuralValidators`; no impact on existing validators (additive registry entry). Reads page-plan §16a, `PG.state_snapshot`, and STCHAR record frontmatter; mutates nothing.
**Deps**: None

## Problem

The page-plan §16a STCHAR authority packet is well-specified in the shared story state contract but enforced only as `branching-story-prose-attach` skill-prose discipline and as the advisory `page_plan_stchar_hash_mismatch` audit finding — no executable validator gates packet presence, hash equality, or active-in-snapshot consistency at validate-time. SPEC-59 §2.2 (C5b) adds `page_plan_stchar_packet_integrity` to convert these into deterministic checks.

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/structural/` exists and `tools/validators/src/public/registry.ts` exports `structuralValidators: readonly Validator[]` (array). The `Validator` interface (`tools/validators/src/framework/types.ts`) requires `name`, `severity_mode: "fail" | "warn" | "info"`, `applies_to`, `run`. No file `page-plan-stchar-packet-integrity.ts` exists yet (collision-checked). `tests/structural/registry.test.ts` asserts the full ordered `structuralValidators` name list via `deepEqual` — a new validator must be added there too.
2. SPEC-59 §2.2 is the source deliverable; §3 lists fixtures (missing packet → fail; inactive STCHAR → fail; hash mismatch → fail; speaker packet missing voice block → fail).
3. Cross-artifact boundary: the §16a packet shape is defined in `.claude/skills/_shared-templates/story-state-contract.md` §16a (fields: `required_because` enum `viewpoint|speaker|major_actor|direct_target|emotionally_salient|behavior_shapes_page|voice_shapes_page`; `profile_hash`/`voice_block_hash`/`page_packet_hash`; voice block). The three hashes are stored in STCHAR record frontmatter (`tools/validators/src/schemas/story-character-authority.schema.json`, pattern `^sha256:[0-9a-f]{64}$`). `PG.state_snapshot.active_records.STCHAR` is a required key (SPEC-58, landed). The validator parses §16a markdown and compares declared-vs-stored hashes — no re-hashing.
4. FOUNDATIONS §4a Plan-Authority Boundary motivates this ticket: the page plan is the prose writer's sole authority, so §16a must actually carry story-local STCHAR authority (not bare record IDs the renderer must infer). The validator enforces that the plan-time authority surface is structurally complete.
5. Canon Safety surface: this is a new structural validator under `tools/validators/src/structural/` that gates story-bundle page-plan integrity at validate-time / engine pre-apply / Hook 5. It is read-only (asserts presence/shape/hash equality) and does not mutate records or resolve any Mystery Reserve entry; the CHAR-leak class is delegated to the existing `no_char_authority_in_story_runtime` validator rather than re-implemented here. The Mystery Reserve firewall is untouched.

## Architecture Check

1. A dedicated structural validator that asserts packet presence/shape/hash-equality is cleaner than overloading `prose_receipt_schema_compliance` (schema-shape only) or duplicating the CHAR-leak scan — the leak class is delegated to `no_char_authority_in_story_runtime`, keeping single responsibility.
2. No backwards-compatibility shim: hash comparison is declared-vs-stored equality (the integrity anchor STCHAR generation already commits to); the rejected `stchar_body_contract` body-re-hash is explicitly out of scope.

## Verification Layers

1. A page with a qualifying present character but no §16a packet fails -> schema validation (fixture-driven validator run).
2. A packet whose `stchar_id` is absent from `PG.state_snapshot.active_records.STCHAR` fails -> schema validation (inactive-STCHAR fixture).
3. A packet whose declared hash differs from the STCHAR frontmatter hash fails -> codebase grep-proof of the comparison logic + hash-mismatch fixture.
4. A `required_because: speaker|viewpoint` packet missing the voice block fails -> schema validation (voice-block fixture).
5. Validator registered in `structuralValidators` and its name appears in `tests/structural/registry.test.ts` -> codebase grep-proof.

## What to Change

### 1. New validator module

Create `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` exporting a `Validator` named `page_plan_stchar_packet_integrity`, `severity_mode: "fail"`. `applies_to`: page plans in a story bundle. `run`: parse §16a packets; for each qualifying present character (implied by `active_records.STENT`/`active_records.STCHAR` + `required_because`):
- assert a packet exists;
- assert its `stchar_id` is in `PG.state_snapshot.active_records.STCHAR`;
- assert declared `profile_hash`/`voice_block_hash`/`page_packet_hash` equal the referenced STCHAR record's stored frontmatter hashes;
- assert a `speaker`/`viewpoint` packet includes the voice block.

Emit one fail verdict per missing-packet / inactive-STCHAR / hash-mismatch / missing-voice-block. Do NOT scan for `CHAR-*` leak (delegated to `no_char_authority_in_story_runtime`).

### 2. Register in the structural registry

Add the import + array entry in `tools/validators/src/public/registry.ts`, and add the validator name to the ordered name-list assertion in `tools/validators/tests/structural/registry.test.ts`.

### 3. Fixtures

Add fixtures under `tools/validators/tests/fixtures/`: missing packet (fail), inactive STCHAR (fail), hash mismatch (fail), speaker packet missing voice block (fail), and a clean pass case.

## Files to Touch

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify) — import + `structuralValidators` array entry
- `tools/validators/tests/structural/registry.test.ts` (modify) — add name to the ordered `deepEqual` name list
- `tools/validators/tests/fixtures/` — new page-plan §16a fixtures (new)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (new) — validator unit tests

## Out of Scope

- The CHAR-`*` leak scan (owned by `no_char_authority_in_story_runtime`).
- Body re-hashing / the rejected `stchar_body_contract` validator (deferred per SPEC-59 §2.2 hash-integrity note).
- The `offstage_causal_packet` reduced-scope packet tier (deferred per SPEC-59 §5 Out of scope).
- Receipt-side verification (`prose_receipt_stchar_integrity`, ticket 003).

## Acceptance Criteria

### Tests That Must Pass

1. Missing-packet, inactive-STCHAR, hash-mismatch, and speaker-missing-voice-block fixtures each produce a `severity_mode: "fail"` verdict.
2. A clean page plan with complete, hash-matching §16a packets passes.
3. `npm test --prefix tools/validators` passes, including `tests/structural/registry.test.ts` (name list now includes `page_plan_stchar_packet_integrity`).

### Invariants

1. Hash comparison is declared-vs-stored equality only — the validator never re-hashes STCHAR bodies.
2. The validator mutates no records and resolves no Mystery Reserve entry; the CHAR-leak class stays delegated to `no_char_authority_in_story_runtime`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — fixture-driven fail/pass cases per §3.
2. `tools/validators/tests/structural/registry.test.ts` — extend the ordered name-list assertion.

### Commands

1. `npm run build --prefix tools/validators`
2. `npm test --prefix tools/validators`
