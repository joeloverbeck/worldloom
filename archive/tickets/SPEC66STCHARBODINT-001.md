# SPEC66STCHARBODINT-001: stchar_body_integrity validator — section-presence + hash-shape

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds new structural validator `stchar_body_integrity` to `tools/validators`; registers it in `tools/validators/src/public/registry.ts` (`structuralValidators[]`). No impact on existing validators (new validator in isolation; reuses the existing `appliesToStcharStoryState` gate).
**Deps**: None

## Problem

STCHAR is the load-bearing story-local character authority record — persona, voice, appraisal, pressure behavior, agency, and relationship conduct all derive from its body sections (FOUNDATIONS §Story Bundles §6.1; `story-character-profile/SKILL.md` Phase 3). No deterministic validator checks the STCHAR record's own structural integrity: the existing `stchar*` validators check *references to* STCHAR, packet hashes *against* STCHAR frontmatter (`page-plan-stchar-packet-integrity`), and receipt hashes (`prose-receipt-stchar-integrity`), but none re-runnably verifies the record everything else trusts. The only existing 13-section check is `story-character-profile` Phase 7 #7 — a generation-time LLM self-check that does not run on supersession, external edits, or in CI. This ticket adds the deterministic, re-runnable counterpart.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: `appliesToStcharStoryState` exists at `tools/validators/src/structural/stchar-utils.ts:35` and gates on `append_/supersede_story_character_authority_record` ops plus the `story-characters/` touched-directory regex (~line 40) — the new validator reuses it as `applies_to`. Sibling `stchar*` validators register in `tools/validators/src/public/registry.ts` (`structuralValidators[]`, import lines ~70-74, array entries ~125-129). `tools/validators/src/structural/character-memorability-structure.ts` is the implementation precedent: a structural validator that checks required H2 sections on a hybrid markdown record via a `REQUIRED_*_SECTIONS` constant + frontmatter parse + fail-on-missing + placeholder/empty-body discipline, with `severity_mode: "fail"` (line 29).
2. **Spec + docs**: the 13 required H2 sections are defined in `story-character-profile/SKILL.md` Phase 3 (lines 212-224), NOT in the shared story-state contract. The STCHAR schema (`tools/validators/src/schemas/story-character-authority.schema.json`) requires `profile_hash`, `voice_block_hash`, `page_packet_hash` (`required[]` lines 21-23; pattern `^sha256:[0-9a-f]{64}$` lines 58-60). The `record-schema-compliance` validator (registered at `registry.ts:105`) already enforces hash presence + pattern against this schema — §2.1b is an intentional cheap defensive duplicate.
3. **Cross-skill boundary**: the 13-section list is a contract shared between this validator and `story-character-profile` (the producer). The authoritative list lives in `story-character-profile/SKILL.md` Phase 3; this validator sources it from a single canonical constant. Add a one-line cross-reference comment in both directions (validator constant ↔ Phase 3 list) so the list cannot silently drift.
4. **FOUNDATIONS**: Rule 1 (No Floating Facts) — the validator declares its scope (STCHAR records under validation, gated by `appliesToStcharStoryState`), reads no world canon, and names its failure consequence (`severity_mode: "fail"` blocks the engine pre-apply gate / `world-validate`). FOUNDATIONS §Story Bundles §6.1 — guards the load-bearing story-local authority record.
5. **Canon Safety surface**: this validator is a story-scope structural validator that fires at engine pre-apply time (`severity_mode: "fail"`) and gates STCHAR record writes. It does NOT touch the Mystery Reserve firewall — it checks section presence and hash *shape* only; no validator pass narrows a forbidden-status `M` (FOUNDATIONS §Rule 7 preserved; the §3.9 story-scope-validator carve-out applies — the validator mediates no world-canon reads/writes).
6. **Same-seam implementation update**: the original ticket undercounted the pre-apply read-surface work needed for the acceptance claim. `append_story_character_authority_record` must materialize a hybrid STCHAR file input and overlay record before the new validator can run correctly through `validate_patch_plan`; the implementation therefore also updates `tools/validators/src/_helpers/index-access.ts`, `tools/validators/src/cli/_helpers.ts`, and the `tools/world-mcp` pre-apply fixture. Registry fallout also required README/inventory and validator-count updates.

## Architecture Check

1. Reusing the `appliesToStcharStoryState` gate and the `character-memorability-structure` section-presence pattern keeps the new validator consistent with every sibling `stchar*` validator (same gate, same `severity_mode`, same registry-append wiring) rather than inventing a parallel mechanism. Sourcing the 13-section list from one canonical constant with a bidirectional cross-reference comment prevents drift between the validator and the `story-character-profile` producer.
2. No backwards-compatibility shims: this is a net-new validator; there is no prior `stchar_body_integrity` to alias.

## Verification Layers

1. All 13 H2 sections present exactly once → codebase grep-proof (validator constant matches `story-character-profile/SKILL.md` Phase 3 lines 212-224) + unit test with a missing-section and a duplicated-section fixture.
2. Empty-section / empty-body detection → unit test with an empty `Voice Bible / Dialogue Authority` and an empty `Page-Plan Voice Block` fixture.
3. Hash-shape (presence + `^sha256:[0-9a-f]{64}$`) → unit test with a malformed-hash fixture; cross-checked against `story-character-authority.schema.json` lines 58-60.
4. Validator fires under the correct gate → skill/CLI dry-run: `world-validate` against a fixture story bundle containing an STCHAR; confirm `stchar_body_integrity` verdicts appear under op-triggered and `story-characters/`-touched-dir-triggered conditions.

## What to Change

### 1. New validator module `tools/validators/src/structural/stchar-body-integrity.ts`

- Export a `Validator` named `stchar_body_integrity` with `severity_mode: "fail"` and `applies_to: appliesToStcharStoryState` (imported from `./stchar-utils.js`), following the `character-memorability-structure.ts` shape (frontmatter parse + canonical-section constant + fail-on-missing).
- Define a single canonical `REQUIRED_STCHAR_SECTIONS` constant listing the 13 H2 headings by exact text (`Story-Facing Identity`, `Source Distillation`, `Stable Persona Core`, `Emotional Appraisal Map`, `Pressure Behavior`, `Voice Bible / Dialogue Authority`, `Page-Plan Voice Block`, `Perception and Embodiment`, `Agency and Planning Tendencies`, `Relationship-Specific Behavior`, `Story-State Derivation Guide`, `Prose Rendering Constraints`, `Validation / Audit Anchors`). Add a one-line comment pointing to `story-character-profile/SKILL.md` Phase 3 as the authoritative source; add the reciprocal one-line comment in Phase 3 pointing back to this constant.
- **2.1a Section-presence checks**: for each STCHAR hybrid record (`stories/<slug>/story-characters/STCHAR-*.md`), fail if any of the 13 H2 sections is missing, present more than once (matching Phase 7 #7's "exactly once" discipline), has an empty body (whitespace-only between the heading and the next H2), or the body is empty overall.
- **2.1b Hash-shape checks**: fail if `profile_hash`, `voice_block_hash`, or `page_packet_hash` is absent or does not match `^sha256:[0-9a-f]{64}$`. This intentionally duplicates `record-schema-compliance` as a cheap defensive guard.

### 2. Register in `tools/validators/src/public/registry.ts`

- Add the import alongside the other `stchar*` validator imports (~lines 70-74) and the array entry alongside the other `stchar*` entries in `structuralValidators[]` (~lines 125-129). No other registration site exists (the public barrel re-exports the array generically; `world-validate.ts` consumes it generically).

### 3. Tests under `tools/validators/tests/structural/`

- Add `stchar-body-integrity.test.ts` with fixtures covering: a complete exactly-13-section STCHAR (passes); a missing-section STCHAR (fails); a duplicated-section STCHAR (fails); an empty-`Voice Bible / Dialogue Authority` STCHAR (fails); an empty-`Page-Plan Voice Block` STCHAR (fails); a malformed-hash STCHAR (fails).

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/src/_helpers/index-access.ts` (modify — STCHAR hybrid pre-apply overlay/read surface)
- `tools/validators/src/cli/_helpers.ts` (modify — STCHAR hybrid frontmatter parse for CLI read surface)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — registry inventory)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator counts)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify — fixture STCHAR hybrid body)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — STCHAR execution count)
- `tools/validators/README.md` (modify — validator inventory)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify — STCHAR pre-apply fixture)
- `.claude/skills/story-character-profile/SKILL.md` (modify — add the one-line reciprocal cross-reference comment in Phase 3 pointing to the validator's canonical constant)

## Out of Scope

- The hash-recompute check (recomputing `profile_hash`/`voice_block_hash`/`page_packet_hash` from the body and comparing) — that is contingent and lands in SPEC66STCHARBODINT-002.
- Grading whether section *content* is faithful to the source character (voice/appraisal fidelity) — judgment-assisted, housed in prose-attach `profile_fidelity[]` and health-audit advisories.
- Exposing STCHAR section projections in `get_record_schema` (report §17 Nice-to-have #12) — deferred, no consumer.
- Expanding `appliesToStcharStoryState`'s applicability (report §17 Critical #4) — the validator reuses the gate as-is.

## Acceptance Criteria

### Tests That Must Pass

1. `node --test dist/tests/structural/stchar-body-integrity.test.js` — passed. The complete fixture passes; missing-section, duplicated-section, empty `Voice Bible / Dialogue Authority`, empty `Page-Plan Voice Block`, and malformed-hash fixtures fail.
2. `npm test` (from `tools/validators`) — passed, 833 tests.
3. `node --test dist/tests/tools/validate-patch-plan.test.js` (from `tools/world-mcp` after build) — passed, confirming the MCP pre-apply path accepts a valid STCHAR hybrid patch and runs the validators package through the new STCHAR body gate.

### Invariants

1. The 13-section constant in the validator is byte-identical to `story-character-profile/SKILL.md` Phase 3's H2 list (bidirectional cross-reference comment enforces non-drift).
2. The validator reads only the STCHAR record(s) under validation — no world-canon reads, no Mystery Reserve resolution.
3. `severity_mode: "fail"` — a body-integrity failure blocks the engine pre-apply gate, matching every sibling `stchar*` validator.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` (new) — fixtures for section presence (missing/duplicated), empty-section/empty-body, and hash-shape (malformed) failure cases plus the complete-pass case.

### Commands

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/stchar-body-integrity.test.js` — passed.
3. `cd tools/validators && npm test` — passed, 833 tests.
4. `cd tools/world-mcp && npm run build` — passed.
5. `cd tools/world-mcp && node --test dist/tests/tools/validate-patch-plan.test.js` — passed, 11 tests.

## Outcome

Implemented `stchar_body_integrity` as a fail-mode structural validator registered with the STCHAR validator family. It validates all 13 required STCHAR H2 sections exactly once, rejects empty required sections and empty bodies, and defensively checks `profile_hash`, `voice_block_hash`, and `page_packet_hash` shape. The 13-section producer contract is cross-referenced from `.claude/skills/story-character-profile/SKILL.md`.

The implementation also made the validators read surfaces STCHAR-hybrid aware for pre-apply and CLI validation so `append_story_character_authority_record` can be validated before commit. Hash recomputation remains out of scope for SPEC66STCHARBODINT-002.
