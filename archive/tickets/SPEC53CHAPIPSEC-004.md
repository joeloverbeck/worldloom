# SPEC53CHAPIPSEC-004: NCP→CHAR provenance + anti-flattening fixtures

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `character-generation` skill prose/template/governance reference, `character-frontmatter.schema.json` documentation-only comment, `character-memorability-structure.ts` (`characterVerdicts` format check), validator fixtures.
**Deps**: None

## Problem

At intake, the NCP→CHAR derivation had no persisted, auditable link: `character-generation` Phase 0 parsed `input_memorability_contract.source_proposal_id` as a working artifact and then dropped it — the generated CHAR recorded nothing about its source NCP. The semantic anti-flattening check already existed (Phase 8 Test 17 + the Phase 9 tradeoff summary, both from SPEC-52), but there was no provenance anchor and no controlled fixture coverage for the path. This ticket persisted the provenance id, added a deterministic format check on it, and added controlled schema/structural fixture coverage.

## Assumption Reassessment (2026-05-20)

1. **Codebase**: `.claude/skills/character-generation/references/phase-0-normalize-brief.md` lines 29–33 build `input_memorability_contract` with `source_proposal_id: <NCP-<integer>>` but no surviving CHAR field carries it; `character-frontmatter.schema.json` line 113 declares `source_basis` as `{ "type": "object" }` (open — top-level `additionalProperties: false` at line 6 does NOT reach into it), so `source_basis.source_proposal_id` is already accepted without a schema change; `character-memorability-structure.ts` `characterVerdicts` (lines 69–115) is the CHAR validation function.
2. **Spec/docs**: SPEC-53 Phase 4 (H2, scoped). The semantic preservation check is NOT re-implemented here — it stays in `character-generation` Phase 8 Test 17 + Phase 9 (SPEC-52). A `dramatic_core` presence-check would be redundant: the CHAR schema already requires `dramatic_core` (top-level `required`, line 7) with all engine fields, `relational_charge` minItems 1, `signature_scene_behaviors` minItems 3 (`dramaticCore` `$def`, lines 44–68), so no valid CHAR can lack a populated `dramatic_core` — the deterministic check is therefore scoped to `source_proposal_id` **format** only.
3. **Cross-skill boundary under audit**: `character-generation` (producer of CHAR dossiers) ↔ `character-frontmatter.schema.json` (CHAR schema) ↔ `character-memorability-structure.ts` (structural validator). The provenance field crosses all three: emitted by the skill, accepted by the open `source_basis`, format-checked by the validator.
4. **FOUNDATIONS principle (Rule 6 — No Silent Retcons / auditability)**: persisting `source_proposal_id` makes the NCP→CHAR derivation auditable rather than dropping the link after Phase 0 — the change strengthens the Rule 6 attribution chain, it does not weaken it.
5. **Canon Safety surface (§Rule 7 firewall confirmation)**: `character-memorability-structure.ts` is a structural validator under `tools/validators/src/structural/`. The new `characterVerdicts` check validates a `^NCP-[0-9]+$` string format only; it does not read canon records, does not resolve any `M-<integer>` entry, and does not alter canon-write ordering or the Mystery Reserve firewall — confirmed.
6. **Schema extension (additive vs breaking)**: the CHAR schema (`character_frontmatter`) is consumed by `record-schema-compliance.ts` and `character-memorability-structure.ts`. The extension is **additive-only and documentation-only** — `source_basis` is already an open object, so the field is accepted today; the schema edit only documents the recognized optional field. No consumer breaks; existing dossiers without `source_proposal_id` remain valid.

## Architecture Check

1. Persisting provenance under the already-open `source_basis` avoids a `required` / `additionalProperties` migration on existing dossiers (a typed top-level field would force one). The deterministic check stays a format check (genuinely new) rather than re-asserting schema-enforced `dramatic_core` completeness (which would be a no-op).
2. No backwards-compatibility shim. The semantic edge-preservation responsibility is left where it already lives (Phase 8 Test 17 + Phase 9), avoiding a fake "deterministic semantic check" the test harness cannot actually perform.

## Verification Layers

1. NCP-derived CHAR records `source_basis.source_proposal_id` → manual review and grep-proof of the Phase-0/SKILL/template prose. No executable character-generation dry-run harness is available in this Codex context, so the proof stays on the load-bearing skill surfaces plus validator fixtures.
2. A CHAR whose `source_proposal_id` is present but malformed (not `^NCP-[0-9]+$`) fails → structural validator test.
3. `source_basis.source_proposal_id` is accepted by the CHAR schema (additive) → schema validation against `character-frontmatter-schema-fixtures.test.ts`.
4. Semantic preservation remains enforced by Phase 8 Test 17 + Phase 9 → FOUNDATIONS alignment check (Rule 6 auditability) — documented as the responsible surface, not re-implemented here.

## What to Change

### 1. Persisted provenance (`character-generation` prose)

- `references/phase-0-normalize-brief.md` + `SKILL.md`: when the source is an NCP, emit `source_basis.source_proposal_id: <NCP-id>` into the generated CHAR dossier (the load-bearing change).
- `templates/character-dossier.md` + `references/governance-and-foundations.md`: document the optional source-proposal field where operators and governance readers inspect the dossier shape.

### 2. CHAR schema documentation (additive, optional)

- `character-frontmatter.schema.json`: documents `source_proposal_id` as a recognized optional key using `$comment` only. The field is already accepted via the open `source_basis`; this edit does not make the schema reject malformed values.

### 3. Structural format check (`characterVerdicts`)

- Add a verdict that fails when `source_basis.source_proposal_id` is present but does not match `^NCP-[0-9]+$`. Do NOT add a `dramatic_core` presence-check (already schema-enforced).

### 4. Controlled fixtures

- Added focused CHAR fixture coverage: a schema fixture carrying `source_basis.source_proposal_id: "NCP-7"` and a structural fixture carrying malformed `"7"` that emits `source_proposal_id_format`.

## Files to Touch

- `.claude/skills/character-generation/references/phase-0-normalize-brief.md` (modify)
- `.claude/skills/character-generation/SKILL.md` (modify)
- `.claude/skills/character-generation/templates/character-dossier.md` (modify)
- `.claude/skills/character-generation/references/governance-and-foundations.md` (modify)
- `tools/validators/src/schemas/character-frontmatter.schema.json` (modify)
- `tools/validators/src/structural/character-memorability-structure.ts` (modify)
- `tools/validators/tests/structural/character-memorability-structure.test.ts` (modify)
- `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` (modify)
- `archive/specs/SPEC-53-character-pipeline-second-iteration-fixes.md` (modify — Phase 4 implementation note)

## Out of Scope

- An LLM-in-the-loop automated semantic-preservation test (no harness exists; semantic enforcement stays in Phase 8 Test 17 + Phase 9).
- A `dramatic_core` presence/completeness deterministic check (already schema-enforced — redundant).
- The NCP user_seed parity check (archive/tickets/SPEC53CHAPIPSEC-003.md — separate function `proposalVerdicts` in the same file).

## Acceptance Criteria

### Tests That Must Pass

1. A CHAR fixture carrying `source_basis.source_proposal_id: "NCP-7"` validates against `character-frontmatter.schema.json`.
2. A CHAR fixture with `source_basis.source_proposal_id: "7"` (malformed) fails the structural format check; a CHAR with a missing `dramatic_core` field still fails the schema (independent of this check).
3. `npm test` from `tools/validators` passes.

### Invariants

1. Existing dossiers without `source_proposal_id` remain valid (additive-only).
2. The validator's new check reads a string format only — no canon-record reads, no MR-firewall interaction.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/character-memorability-structure.test.ts` — added malformed-`source_proposal_id` CHAR case.
2. `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` — added a CHAR fixture carrying a well-formed `source_proposal_id`.

### Commands

1. `npm test` from `tools/validators`
2. `npm run build` from `tools/validators` (`tsc` covers typecheck)

## Outcome

Completed on 2026-05-20.

The character-generation workflow now carries NCP provenance through the final CHAR frontmatter: Phase 0 names the preservation contract, the SKILL.md Phase 9 commit step copies `input_memorability_contract.source_proposal_id` into `source_basis.source_proposal_id`, and the dossier template/governance reference expose the optional field to operators. The CHAR schema keeps `source_basis` open and documents the recognized key with `$comment`; malformed present values are rejected by `character_memorability_structure.source_proposal_id_format`, not by the schema. SPEC-53 Phase 4 was annotated with this landed boundary.

## Verification Result

1. `npm test` from `tools/validators` — PASS; rebuilt the package and ran 738 passing tests, including the new schema acceptance and structural malformed-id fixtures.
2. `npm run build` from `tools/validators` — PASS; TypeScript compile completed after the final schema-boundary correction.
3. `rg -n "source_proposal_id|NCP->CHAR|NCP-derived|input_memorability_contract.source_proposal_id" .claude/skills/character-generation tools/validators/src tools/validators/tests archive/tickets/SPEC53CHAPIPSEC-004.md archive/specs/SPEC-53-character-pipeline-second-iteration-fixes.md` — PASS; confirmed the field is present in the load-bearing skill/template/governance/schema/test surfaces and remaining spec/ticket mentions are current or historical intake/closeout context.

## Deviations

- The drafted proof row named a `skill dry-run`, but no executable character-generation dry-run harness is available in this Codex context. The accepted proof is manual review plus grep over the load-bearing skill/template surfaces, paired with schema and structural validator tests.
- The schema edit is documentation-only by design. A first implementation draft made malformed `source_basis.source_proposal_id` fail at schema level too, but closeout corrected that so deterministic format rejection remains owned by `character_memorability_structure`.
