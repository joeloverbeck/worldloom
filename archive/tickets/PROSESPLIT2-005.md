# PROSESPLIT2-005: Add `page_plan_verbatim_section_integrity` structural validator + test (byte-equality between page-plan §2 / §3 / §19 and canonical-source files)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` validator + new `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` test; validator registered in `tools/validators/src/public/registry.ts`; same-seam validator inventories, pre-apply skip expectations, and prose-renderer contract docs updated
**Deps**: archive/tickets/PROSESPLIT2-001.md (canonical-source paths must exist), archive/tickets/PROSESPLIT2-002.md (skill-side refs migrated so new plans author from the new path), archive/tickets/PROSESPLIT2-003.md (FOUNDATIONS reference migrated), archive/tickets/PROSESPLIT2-004.md (legacy report deleted; only the new canonical files remain as authoritative source). All four must land first or the test points at a moving target.

## Problem

`_shared-templates/story-state-contract.md` §8 declares §2 / §3 / §19 of every `pages-prose-plans/PG-<integer>.md` as "inlined verbatim from `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md`" (post-PROSESPLIT2-002). The verbatim property is operationally load-bearing per the user's 2026-05-12 decision (feedback memory `page_plan_verbatim_sections`): the external prose renderer has no cross-plan state, so every page render is cold context — any drift between canonical source and inlined plan content silently breaks the self-contained-plan contract.

Before this ticket, the verbatim property was enforced only by skill prose ("§2, §3, and §19 are inlined verbatim on every page plan... Skills must not propose compacting these sections across pages" — `_shared-templates/story-state-contract.md:452`). The existing `page_plan_body_engine_vocabulary_cleanliness` validator allow-lists §2 / §3 / §15 / §19 as engine-vocabulary-permitted sections precisely because they're verbatim-inlined, but it did NOT check the bytes were actually unchanged from canonical source.

A page plan that shipped with stale §2 / §3 / §19 content (because the canonical source evolved after the plan was authored, OR because the plan author hand-edited the verbatim block) previously passed all validation. The user-confirmed operationally-load-bearing property was aspirational at the validator layer.

This ticket transformed the verbatim property from skill prose into a structural invariant. The new validator `page_plan_verbatim_section_integrity` reads the three canonical-source files, extracts §2 / §3 / §19 from each page plan in scope, and asserts byte-equality. Drift fails the gate.

## Assumption Reassessment (2026-05-26)

1. `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` exists and demonstrates the validator-authoring pattern this ticket follows: uses `pagePlanTargets(input, ctx)` helper to find pages in scope, uses `parseSections(content)` to extract numbered sections, returns `Verdict[]`, applies in `full-world`, `pre-apply` (with `create_pg_record` patch), and `incremental` (touching `stories/<slug>/pages-prose-plans/PG-<integer>.md`) modes. The new validator uses the same shape.
2. `tools/validators/src/structural/page-plan-section-parser.ts` exposes `pagePlanTargets`, `pagePlanTargetFromContent`, and `markdownSection`, but the existing numbered-section parser inside `page-plan-body-engine-vocabulary-cleanliness.ts` is private. The new validator will include its own minimal section-body extractor for §2 / §3 / §19 rather than refactoring the existing validator in this ticket.
3. Canonical-source files post-PROSESPLIT2-001..004: `docs/prose-renderer-contract/content-policy.md` (page-plan §2 source), `docs/prose-renderer-contract/prose-craft-contract.md` (page-plan §3 source), `docs/prose-renderer-contract/render-time-instruction.md` (page-plan §19 source). Each file starts with a framing header (a `#` H1 title + framing paragraph + `---` separator), then the canonical content. The validator MUST strip the framing header before byte-comparison — the framing exists for human readers, not for inlining.
4. Cross-skill boundary: this ticket adds a new gate that fires against page plans authored by `branching-story-bootstrap` and `branching-story-turn-cycle`. The gate's invariant is byte-equality between canonical source and inlined section; the gate FAILs (not WARNs) on drift because the verbatim property is load-bearing — drift is not a soft pathology.
5. FOUNDATIONS principles motivating the test:
   - §LLM-facing Skill Prose Discipline (§714 hosting reference, updated by PROSESPLIT2-003) — the canonical-source location is now a structurally-enforced contract, not an aspirational reference.
   - §Story Bundles §4 (the plan IS the prompt; single-artifact rendering contract) — drift between the canonical contract and the per-plan bytes silently fragments the single-artifact promise; a structural gate forecloses the fragmentation.
6. **Framing-header strip semantics**: each canonical-source file is structured as `<framing header>\n---\n<verbatim payload>`, where the payload is exactly the bytes intended to sit under the numbered page-plan section header. The validator extracts the payload slice (everything after the first `---` line), trims trailing whitespace, and compares it to the page plan's §2 / §3 / §19 body under each numbered header, up to (but not including) the next numbered page-plan section header, with leading blank separator lines and trailing whitespace removed.
7. **Existing-plan handling**: Page plans authored before PROSESPLIT2-001 land carry the original report payload bytes under numbered page-plan section headers. Reassessment found that the new canonical-source files had retained standalone helper headings/intro prose inside the post-`---` payload; that would make every existing plan fail for the wrong reason despite the intended byte-copy lineage. This ticket corrects the canonical-source payloads so the validator compares against actual inlined-block shape. Existing red-bunny plans still carry older §3 / §19 bytes than the current canonical payloads, so they intentionally remain follow-up work rather than being retroactively rewritten in this ticket. If the canonical source payload ever evolves (e.g., a future ticket revises Rule 7), existing plans on disk WILL fail the gate; remediation routes to a follow-up "refresh existing plans" ticket per the user's 2026-05-12 decision that "existing in-bundle plans are NOT retroactively rewritten" applied at SPEC-91 time.
8. No adjacent contradictions exposed. The existing `page_plan_body_engine_vocabulary_cleanliness` validator's allow-list of §2 / §3 / §15 / §19 sections is intact and orthogonal to this new validator (one allows engine vocabulary IN those sections; the other checks the bytes ARE the canonical-source content).
9. Registry path correction: the live registration surface is `tools/validators/src/public/registry.ts`, not `tools/validators/src/registry.ts` or `tools/validators/src/index.ts`. Same-package inventory surfaces are also owned: `tools/validators/README.md` lists every structural validator and `tools/validators/tests/structural/registry.test.ts` asserts the exact registry and README inventories.
10. Package proof correction: this repo does not have the drafted root `pnpm turbo` proof lane. The package-local baseline `npm test` from `tools/validators/` passed before edits, and the accepted proof is package-local build/test plus focused compiled `node --test` commands after build.
11. HARD-GATE-facing validation signal: this validator runs in `pre-apply` when a `create_pg_record` patch is present, so `docs/HARD-GATE-DISCIPLINE.md` was read before implementation. The new validator fails closed on byte drift and does not weaken submit/approval flow.
12. Proof-discovered same-seam correction: focused live-plan smoke against `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` showed that the canonical-source files' post-`---` payloads were not the actual inlined blocks: `content-policy.md` and `render-time-instruction.md` included standalone explanatory paragraphs not present in plans, and `prose-craft-contract.md` used standalone `## N.` headings where page plans use nested `### N.` headings. Because the canonical-source files are the authority this validator reads, this ticket also corrects those three payloads before accepting byte-equality proof.
13. Existing live-plan drift remains after the canonical payload correction because the checked-in red-bunny page plans contain older prose-craft and render-time instruction bytes than the current canonical files. That is outside this validator ticket's package/docs owner boundary; follow-up `tickets/PROSESPLIT2-006.md` owns refreshing or explicitly grandfathering existing page plans.

## Architecture Check

1. The byte-equality test is cleaner than (a) hash-stamp checks (which require schema-extending PG records to carry a `prose_renderer_contract_version` field — more surface area, more validator complexity) or (b) prose-similarity checks (lossy; can't catch single-character drift like a renamed axis token). Direct byte-comparison is the simplest expressible invariant that captures the verbatim property.
2. No backwards-compatibility aliasing/shims — the validator reads canonical-source files at run time; no shim, no flag-gated rollout. Plans on disk that match canonical source PASS; drift FAILs.
3. **Validator placement under `structural/`** (not `integrity/`): the existing `page-plan-body-engine-vocabulary-cleanliness.ts` lives under `structural/`; this validator operates on the same plan-body surface and uses the same `pagePlanTargets` discovery pattern. Placing it under `structural/` keeps the page-plan-body validator cluster cohesive.

## Verification Layers

1. The validator produces no verdict (PASS) when a page plan's §2 / §3 / §19 byte-match canonical source → unit test asserting empty verdicts list against a synthesized PG fixture using literal canonical bytes.
2. The validator produces a FAIL verdict when a page plan's §3 has a single-character drift from canonical source → unit test asserting one verdict with `severity: "fail"` and the drift location.
3. The validator produces FAIL verdicts when a page plan omits §2 / §3 / §19 entirely → unit test for each missing section (three sub-tests).
4. The validator handles the canonical-source framing-header strip correctly → unit test that constructs a canonical-source file with a known framing header and verifies the validator compares only post-framing content.
5. The validator integrates with the package-local `npm test` suite → integration test asserting the clean pre-apply plan skips this page-plan-only validator when no page plan is present.

## Landed Changes

### 1. Created `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts`

Added a structural validator modeled on `page-plan-body-engine-vocabulary-cleanliness.ts`. It targets `full-world`, `pre-apply` with `create_pg_record`, and `incremental` page-plan file touches. The validator discovers page-plan targets before reading canonical files, so temp worlds with no page plans do not fail on missing repo-level docs.

The implementation strips the canonical-source framing before `---`, trims trailing whitespace, trims leading blank separator lines from page-plan section bodies, reports missing sections with `page_plan_verbatim_section_integrity.missing_section`, and reports byte drift with `page_plan_verbatim_section_integrity.drift` plus `detail.first_diverging_line`.

### 2. Created `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts`

Added seven focused tests covering pass, §3 drift, missing §2, missing §3, missing §19, framing-header stripping, and first-diverging-line reporting. The tests use temporary canonical-source directories and pass `repo_root` in the test input.

### 3. Registered the validator

Registered `pagePlanVerbatimSectionIntegrity` in `tools/validators/src/public/registry.ts`, adjacent to `pagePlanBodyEngineVocabularyCleanliness`.

### 3b. Updated same-package validator inventory surfaces

Added `page_plan_verbatim_section_integrity` to `tools/validators/README.md`, `tools/validators/tests/structural/registry.test.ts`, and the clean pre-apply skip expectation in `tools/validators/tests/integration/validate-patch-plan.test.ts`.

### 4. Documented the validator in prose contracts

Added validator-enforcement notes to `.claude/skills/_shared-templates/story-state-contract.md` §8 and `docs/prose-renderer-contract/README.md`.

### 5. Corrected canonical-source post-framing payloads

Updated `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md` so the bytes after `---` are actual page-plan payload bytes. Standalone helper headings/paragraphs no longer live in the post-framing payload, and §3 rule headings use nested `### N.` headings.

## Files to Touch

- `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` (new)
- `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — register new validator)
- `tools/validators/tests/structural/registry.test.ts` (modify — exact registry inventory)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean pre-apply skip expectation)
- `tools/validators/README.md` (modify — structural validator inventory)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — append validator-enforcement note at line 452)
- `docs/prose-renderer-contract/README.md` (modify — append validator-enforcement note)
- `docs/prose-renderer-contract/content-policy.md` (modify — post-`---` payload correction)
- `docs/prose-renderer-contract/prose-craft-contract.md` (modify — post-`---` payload heading correction)
- `docs/prose-renderer-contract/render-time-instruction.md` (modify — post-`---` payload correction)
- `tickets/PROSESPLIT2-006.md` (new — bounded follow-up for existing-plan drift remediation)

## Out of Scope

- **Retroactively rewriting in-bundle page plans** (`worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-*.md`). The validator's failure mode against pre-existing plans is acceptable per the user's 2026-05-12 decision that existing plans are forward-only. If the canonical source evolves and existing plans need refreshing, that is a separate ticket.
- **Adding a `prose_renderer_contract_version` field to PG records or canonical-source files.** The byte-equality check is the simplest expressible invariant; versioning is a possible follow-up if canonical-source evolution becomes frequent.
- **A canonical-source-refresh CLI** (e.g., `pnpm refresh-page-plan-verbatim PG-N`). The validator FAILs on drift; remediation is currently manual (re-copy from canonical source). A CLI is a follow-up if drift becomes operationally frequent.
- **WARN-level drift severity.** Drift is FAIL because the verbatim property is load-bearing; a WARN gate would invite drift accumulation. If a soft-drift case ever surfaces, it warrants a discussion not a validator-config flag.
- **Cross-page consistency checks** (e.g., asserting PG-1's §3 matches PG-2's §3). The canonical-source equality check makes cross-page consistency a transitive property; a separate cross-page validator is unnecessary.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` from `tools/validators/`, then `node --test dist/tests/structural/page-plan-verbatim-section-integrity.test.js` — focused compiled test passes with all 7 test cases.
2. `node --test dist/tests/integration/validate-patch-plan.test.js` from `tools/validators/` — clean pre-apply skip expectation remains true.
3. `node --test dist/tests/structural/registry.test.js` from `tools/validators/` — registry and README inventories include the new structural validator.
4. `npm test` from `tools/validators/` — full package suite continues to pass; new validator integrates cleanly.
5. Manual review: `_shared-templates/story-state-contract.md` §8 documents the validator enforcement surface next to the §2 / §3 / §19 verbatim prose contract.
6. Direct smoke: `page_plan_verbatim_section_integrity` emits only the known existing-plan drift for `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md`; follow-up `tickets/PROSESPLIT2-006.md` owns refreshing or explicitly grandfathering those existing page plans.

### Invariants

1. After this ticket lands, any page plan committed via `branching-story-bootstrap` or `branching-story-turn-cycle` carries §2 / §3 / §19 content byte-identical to `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md` (post-framing-header strip).
2. Drift between canonical source and any plan's §2 / §3 / §19 produces a `fail` verdict from `page_plan_verbatim_section_integrity`; no soft-PASS path exists.
3. The validator runs in `full-world`, `pre-apply` (against draft PG records), and `incremental` (when a page plan is touched) modes — paralleling the existing `page_plan_body_engine_vocabulary_cleanliness` coverage.
4. The validator's existence is documented inline in `_shared-templates/story-state-contract.md` §8 so future skill authors see the enforcement surface alongside the prose contract.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` — new — 7 test cases per the §2 implementation block (pass / drift / missing-§2 / missing-§3 / missing-§19 / framing-header-strip / first-diverging-line detail). Each test verifies a distinct invariant.
2. `tools/validators/tests/structural/registry.test.ts` — modified — exact registry inventory and README inventory include `page_plan_verbatim_section_integrity`.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — modified — clean pre-apply test expects this page-plan-only validator to skip when no page plan is present.

### Commands

1. `npm run build` from `tools/validators/` — compile source and tests to `dist/`.
2. `node --test dist/tests/structural/page-plan-verbatim-section-integrity.test.js` from `tools/validators/` — targeted compiled validator proof.
3. `node --test dist/tests/structural/registry.test.js` from `tools/validators/` — registry/README inventory proof.
4. `npm test` from `tools/validators/` — full package proof.
5. Direct compiled `node --input-type=module -e ...` smoke from `tools/validators/` against `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` — live existing-plan drift classification.

## Outcome

Completion date: 2026-05-26.

Implemented `page_plan_verbatim_section_integrity` as a fail-mode structural validator for page-plan §2 / §3 / §19 byte equality. Registered it in the validators package, added focused tests, updated registry/README inventory proof, and documented the enforcement surface in the shared story-state contract and prose-renderer README.

Reassessment also corrected the canonical renderer-contract payloads so post-`---` bytes are actual page-plan payload bytes rather than standalone-document helper headings/intro text. Existing red-bunny page plans still carry older §3 / §19 bytes; `tickets/PROSESPLIT2-006.md` now owns refresh/grandfathering.

## Verification Result

1. `npm run build` from `tools/validators/` — PASS.
2. `node --test dist/tests/structural/page-plan-verbatim-section-integrity.test.js` from `tools/validators/` — PASS, 7 tests.
3. `node --test dist/tests/structural/registry.test.js` from `tools/validators/` — PASS, 2 tests.
4. `node --test dist/tests/integration/validate-patch-plan.test.js` from `tools/validators/` — PASS, 21 tests.
5. Direct compiled live-plan smoke against `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` — PASS as drift classification; emitted two expected `page_plan_verbatim_section_integrity.drift` verdicts for §3 line 73 and §19 line 47.
6. `npm test` from `tools/validators/` — PASS, 1090 tests.
7. Manual review — PASS; `.claude/skills/_shared-templates/story-state-contract.md` and `docs/prose-renderer-contract/README.md` both name the new validator as the byte-equality enforcement surface.

## Deviations

- The drafted registry path was stale; the live registry is `tools/validators/src/public/registry.ts`.
- The drafted root `pnpm turbo` proof lane is unavailable in this checkout; accepted proof is package-local `npm run build`, focused compiled `node --test` commands, and package-local `npm test`.
- The canonical-source files' post-`---` payloads were corrected as same-seam fallout because they contained standalone-document helper text/headings that were not actual page-plan payload bytes.
- Existing red-bunny page plans still drift from current §3 / §19 canonical payloads. This ticket leaves those world artifacts untouched and creates `tickets/PROSESPLIT2-006.md` as the bounded remediation owner.
