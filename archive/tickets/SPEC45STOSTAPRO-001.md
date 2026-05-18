# SPEC45STOSTAPRO-001: Shared intro-tag parser library

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new shared module exposing the intro-tag parser; refactor of `tools/validators/src/structural/midstory-introduction-utils.ts` to import + re-export from the new location. No production behavior change in the validator's existing call sites.
**Deps**: None

## Problem

The intro-tag parser (`extractIntroTags`, `parseIntroTag`, `INTRO_TAG_PATTERN`, `ParsedIntroTag` type, plus the regex grammar that closed-form-decodes `intro:CLK(...)` / `intro:STSEC(...)` / `intro:STQ(...)` / `intro:THR(...)` / `intro:STENT(...)` / `intro:SREL(...)` tags from `SE.world_logic_rationale`) currently lives only in the validators package at `tools/validators/src/structural/midstory-introduction-utils.ts`. Per SPEC-45 Phase 1, the world-index package must also parse intro tags to extract `creation_evidence` edges; duplicating the parser would create a parse-divergence risk where the validator strict-rejects a malformed tag while the indexer silently ingests it (or vice versa), producing subtle data-correctness bugs that only surface during cross-validation. The fix is a single shared library that both packages import — the validator's existing call sites get a one-line refactor (import from shared location instead of local file); the world-index new edge-extraction logic (SPEC45STOSTAPRO-002) consumes the same module.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/structural/midstory-introduction-utils.ts` exists and exports `extractIntroTags(rationale: string): ParsedIntroTag[]` (function at ~line 95), `parseIntroTag(rationale: string): ParsedIntroTag | null` (~line 89), `INTRO_TAG_PATTERN` regex constant (line 73-74), `INTRO_TAG_PARSE_PATTERN` (line 76-77), `ParsedIntroTag` interface (~line 82), and the error class `MidstoryIntroductionTagError`. Verified via Read at `tools/validators/src/structural/midstory-introduction-utils.ts:70-100`. **Mechanical-drift note**: the spec proposes a parser named `parseIntroTags` returning `{ class, id, trigger?, evidence, distinct_from }`; the existing function is named `extractIntroTags` returning `ParsedIntroTag[]` with shape `{ class, recordId, trigger, evidence, distinctFrom }`. This ticket preserves the existing names and types (less churn across validator call sites); SPEC-45 Phase 1 spec naming is illustrative, not normative.
2. SPEC-45 §Approach Phase 1 D2 specifies the new shared file path `tools/world-index/src/parse/intro-tag-parser.ts`; D3 specifies the refactor of `midstory-introduction-utils.ts` to "import + re-export shared parser"; D5 specifies new unit tests at `tools/world-index/tests/parse/intro-tag-parser.test.ts`. **Mechanical-drift note**: world-index tests live FLAT at `tools/world-index/tests/*.test.ts` (no `parse/` subdir; existing tests include `atomic-source-input.test.ts`, `structured-edges.test.ts`, `yaml.test.ts`). The new unit test lands at `tools/world-index/tests/intro-tag-parser.test.ts`. **Parser-behavior correction**: the live parser is strict and throws `MidstoryIntroductionTagError` for malformed intro-tag candidates; this ticket preserves that behavior instead of changing malformed tags to return an empty array.
3. Cross-skill / cross-package boundary under audit: the shared parser introduces a cross-package import from `tools/validators/` to `tools/world-index/`. SPEC-45 §Risks names this explicitly — *"lifting `parseIntroTags()` into a shared library requires resolving a cross-package import path. Direct world-index → validators or validators → world-index imports may be awkward under current `tools/` package conventions. Resolution path: prefer a new `tools/_shared/intro-tag-parser/` package if cross-imports are awkward; defer the location decision to the implementation ticket."* Live package conventions already have `@worldloom/validators` depending on `@worldloom/world-index` through public export subpaths, while `@worldloom/world-index` has no validators dependency. This ticket chooses option (b): world-index owns `tools/world-index/src/parse/intro-tag-parser.ts`, exposes it as `@worldloom/world-index/parse/intro-tag-parser`, and validators imports from that subpath. This avoids a cyclic dependency and avoids adding a new package for one small parser.
4. FOUNDATIONS principle under audit: §Story Bundles §5b — *"Schema minimalism at story scope: every field in every story-bundle record schema must be load-bearing."* This ticket and SPEC-45 as a whole validate the principle by proving the existing parseable form (SPEC-43's grammar choice) is mechanically indexable — no schema fields added; the same string content `SE.world_logic_rationale` carries the intro tags that both the validator and the indexer parse identically via the shared library.

## Architecture Check

1. **Single source of truth eliminates parse-divergence**: the shared library is the only place the regex, the parse function, and the `ParsedIntroTag` type live. Validators and world-index produce identical outputs by construction — no risk of one side strict-rejecting what the other silently ingests. This is structurally cleaner than per-package duplication (which would require ongoing manual cross-package synchronization on every grammar change).
2. **No backwards-compatibility shims introduced**: the validators package's existing call sites (in `midstory-record-introduction-grounding.ts`, `clock-introduction-grounding-integrity.ts`, etc.) update their import path in a single line — the function signature, the type shape, and the return semantics are unchanged. No alias re-export from `midstory-introduction-utils.ts` to preserve the old import path; consumers update directly.

## Verification Layers

1. **Shared module exists at the agreed path** → codebase grep-proof: `grep -rn "from.*intro-tag-parser" tools/validators/src tools/world-index/src` finds matching import sites in both packages.
2. **Validator regression is zero** → schema validation: `npm test --prefix tools/validators` passes with identical pass/fail counts to pre-refactor baseline (recorded at ticket-author time).
3. **Cross-package import resolves at build time** → schema validation: `npm run build --prefix tools/world-index` and `npm run build --prefix tools/validators` both pass after the refactor (TypeScript resolves the shared module).

## What to Change

### 1. Decide cross-package import path

Survey current `tools/<pkg>/package.json` `dependencies` / `devDependencies` fields and `tsconfig.json` `paths` mappings to determine which cross-package conventions are already established. Pick the option that minimizes cyclic-dependency risk:

- **(a)** world-index → validators: world-index adds `@worldloom/validators` (or equivalent) to its dependencies; the parser file lives at `tools/validators/src/_shared/intro-tag-parser.ts` (moved out of `structural/`); world-index imports from there.
- **(b)** validators → world-index: world-index becomes the parser's new owner; validators adds `@worldloom/world-index` to its dependencies (if not already there); imports from `tools/world-index/src/parse/intro-tag-parser.ts`.
- **(c)** new `tools/_shared/intro-tag-parser/` package: both packages depend on the new package; the parser file lives at `tools/_shared/intro-tag-parser/src/index.ts`.

Document the decision in the ticket's PR description; the option chosen drives all subsequent steps.

### 2. Lift the parser into the chosen location

Move (do not copy) the following symbols from `tools/validators/src/structural/midstory-introduction-utils.ts` to the new shared location:

- `INTRO_TAG_PATTERN` regex constant
- `INTRO_TAG_PARSE_PATTERN` regex constant
- `RECORD_ID_PATTERN` regex constant (if exclusively used by the parser; check call sites)
- `ParsedIntroTag` interface
- `MidstoryIntroductionTagError` class
- `extractIntroTags(rationale: string): ParsedIntroTag[]` function
- `parseIntroTag(rationale: string): ParsedIntroTag | null` function
- Any internal helper functions called only by the above (`firstIntroTag`, `introTagCandidates`, `parseExactIntroTag`)

Preserve all type signatures and return semantics exactly. The lift is a pure relocation; no symbol renames, no API changes.

### 3. Refactor validators' existing call sites

Update every file in `tools/validators/src/structural/` that currently imports from `./midstory-introduction-utils` (the parser symbols specifically — other symbols like `MIDSTORY_INTRODUCTION_CLASSES`, `CLK_TRIGGERS`, etc. stay in `midstory-introduction-utils.ts`) to import from the new shared location instead. Use grep to enumerate: `grep -rn "from.*midstory-introduction-utils" tools/validators/src` lists every call site.

If `midstory-introduction-utils.ts` ends up with no remaining exports of the parser symbols, the file remains for the non-parser exports (class constants, trigger vocabularies); do not delete it.

### 4. Add unit tests for the shared parser

Create `tools/world-index/tests/intro-tag-parser.test.ts` (or analogous path under the new shared package per the option chosen in step 1) covering:

- Valid tags across all 6 classes (CLK, STSEC, STQ, THR, STENT, SREL) — one happy-path test per class confirming `extractIntroTags` returns one `ParsedIntroTag` with correct `class`, `recordId`, `trigger`, `evidence`, `distinctFrom`.
- Malformed tags: missing close paren; unknown class; invalid id format (lowercase, no dash, padded zeros); missing required field; extra unrecognized field. Each variant preserves the existing strict behavior by throwing `MidstoryIntroductionTagError`.
- Multi-tag rationales: rationale containing 2+ valid tags returns 2+ `ParsedIntroTag` entries in order.
- Rationale with embedded prose alongside valid tags: parser extracts valid tags and ignores surrounding prose.
- Empty rationale: returns empty array.
- Rationale with leading/trailing whitespace: parser handles whitespace correctly.
- Cross-validation: build validators after refactor and confirm its midstory introduction validator imports the same parser subpath; outputs match by construction because both packages resolve the same implementation.

## Files to Touch

- `tools/world-index/src/parse/intro-tag-parser.ts` (new) — chosen shared parser location; exported as `@worldloom/world-index/parse/intro-tag-parser`.
- `tools/validators/src/structural/midstory-introduction-utils.ts` (modify) — remove the lifted symbols; update internal references if any non-parser exports depended on them.
- Every file in `tools/validators/src/structural/` whose import line for `midstory-introduction-utils` references the lifted symbols (modify) — enumerate via grep at ticket implementation time.
- `tools/validators/src/structural/midstory-record-introduction-grounding.ts` (modify) — parser-symbol import now resolves from the world-index subpath.
- `tools/world-index/tests/intro-tag-parser.test.ts` (new).
- `tools/world-index/package.json` (modify) — add the parser subpath export.

## Out of Scope

- Any change to the parser grammar (the regex stays identical to SPEC-43's existing grammar — this is a pure code relocation).
- Any change to how intro tags are written or authored — this ticket touches only the read path.
- World-index edge extraction using the shared parser — that's SPEC45STOSTAPRO-002.
- MCP tool implementation — that's SPEC45STOSTAPRO-003.
- Consumer skill update — that's SPEC45STOSTAPRO-004.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — passes with identical pass/fail counts to pre-refactor baseline. Record the baseline counts in the ticket's PR description; assert post-refactor counts match.
2. `npm run build --prefix tools/world-index` — passes after the new shared module is in place and any cross-package dependency wiring is correct.
3. `npm run build --prefix tools/validators` — passes after the refactor.
4. New unit tests for the shared parser pass: `npm test --prefix tools/world-index` (or analogous command per the chosen shared package location).

### Invariants

1. The shared parser produces byte-identical outputs to the validators' historical parser on the SPEC-43 test corpus.
2. `INTRO_TAG_PATTERN` regex content is unchanged after the lift (verified via diff against pre-refactor file).
3. No symbol is duplicated between `midstory-introduction-utils.ts` and the new shared location — the lift is a move, not a copy.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/intro-tag-parser.test.ts` — new test file covering all 6 intro-tag classes, malformed inputs, multi-tag rationales, embedded prose, empty rationale, and whitespace handling.

### Commands

1. `npm test --prefix tools/validators` — validators regression check (must match pre-refactor pass/fail counts).
2. `npm run build --prefix tools/world-index && npm run build --prefix tools/validators` — both builds pass after refactor.
3. `npm test --prefix tools/world-index` — new shared parser tests pass.

## Outcome

Completed: 2026-05-18

What changed:

1. Moved the SPEC-43 intro-tag parser and trigger vocabulary into `tools/world-index/src/parse/intro-tag-parser.ts`.
2. Added the public package subpath `@worldloom/world-index/parse/intro-tag-parser`.
3. Refactored `tools/validators/src/structural/midstory-record-introduction-grounding.ts` to consume the world-index parser subpath.
4. Left `tools/validators/src/structural/midstory-introduction-utils.ts` as a trigger-vocabulary compatibility surface only; parser symbols no longer live there.
5. Added `tools/world-index/tests/intro-tag-parser.test.ts` covering all six intro classes, multi-tag extraction, whitespace, empty/no-tag input, and strict malformed-tag failures.

Deviations:

1. The selected implementation is the world-index-owned parser subpath because validators already depends on world-index; adding a validators dependency to world-index would invert the live dependency direction.
2. The drafted malformed-tag test expectation was corrected. The live parser throws `MidstoryIntroductionTagError` for malformed intro-tag candidates, so the shared parser preserves that strict behavior.
3. The validator broad suite remains red on the pre-existing SPEC-43 red-bunny fixture assertion `compatible_optional_absence missing from current_contract`; the pass/fail count stayed at 536/537 before and after this refactor.

Verification:

1. `npm run build` from `tools/world-index` — passed.
2. `npm run build` from `tools/validators` — passed.
3. `npm test` from `tools/world-index` — passed, 92/92.
4. `npm test` from `tools/validators` — unchanged baseline red, 536/537, same failing test: `§Verification bullet 19: red-bunny bundle validates cleanly from a temp world copy`.
5. `rg -n "extractIntroTags|parseIntroTag|ParsedIntroTag|INTRO_TAG_PATTERN" tools/world-index/src/parse/intro-tag-parser.ts tools/validators/src/structural/midstory-introduction-utils.ts tools/validators/src/structural/midstory-record-introduction-grounding.ts` — parser definitions appear only in the world-index shared parser; the validator consumer imports that subpath.
