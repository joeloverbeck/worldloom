# PPCANONINL-001: CLI helper to inline canonical §2/§3/§19 bytes into a page plan

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds a new CLI binary under `tools/world-mcp/src/cli/`, registers it in `tools/world-mcp/package.json`, adds tests under `tools/world-mcp/tests/cli/`, and updates package / machine-facing CLI docs. No HARD-GATE behavior changes; `branching-story-turn-cycle` and `branching-story-bootstrap` skills reference the helper in their Phase-7 / Phase-8 instructions (a documentation-only update tracked as part of this ticket).
**Deps**: None (PPENGVOC-001 is independent; the two tickets address different validators).

## Problem

The page-plan §2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) sections must be byte-identical to their canonical sources at `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md` respectively. This is the verbatim-inlining contract declared in `docs/FOUNDATIONS.md` §Story Bundles §9.

The `page_plan_verbatim_section_integrity` validator at `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` enforces byte-equality by reading the canonical sources at runtime and comparing them line-for-line against the plan's extracted sections. The validator's shared framing helper drops everything before the first `---` line and trims trailing whitespace; that is the exact normalization the new inliner produces.

At intake there was no helper that the authoring operator could run to splice the canonical bytes into a draft page plan. Operators copied §2/§3/§19 from a prior page in the bundle, which copied the prior page's drift. PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/` all carried §3 and §19 drift relative to the canonical sources; the drift is grandfathered by GF-PROSESPLIT2-006-001 but the grandfather does not cover new pages. This ticket added a deterministic inliner for new draft page plans; grandfathered page backfill remains out of scope.

## Assumption Reassessment (2026-05-27)

1. `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md` all exist and each begins with a framing-header preamble followed by a `---` separator line, then the canonical body. The shared `stripPagePlanVerbatimFramingHeader` helper reads everything after the first `---` separator and trims trailing whitespace.
2. `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` now exports `CANONICAL_SOURCES`, `VerbatimSectionNumber`, `stripFramingHeader`, and `trimTrailingWhitespace`. `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` and `tools/world-mcp/src/cli/inline-canonical-prose-sections.ts` both consume that shared mapping through the validator package boundary, so mapping drift is one-source.
3. The validator and inliner both match page-plan base headings with `^##\s+(\d+)\.\s*(.+?)\s*$`; the inliner replaces only existing §2 / §3 / §19 bodies and refuses to invent missing headings.
4. Existing CLI binaries under `tools/world-mcp/src/cli/` follow stdout-on-success / stderr-on-error conventions with a `[world-root] <path> (source: <auto_discovery|env|flag>)` first-line trace on stderr. The new CLI imports `_resolve-world-root.ts` and follows that pattern.
5. The `branching-story-turn-cycle` Phase 7 page-plan reference and `branching-story-bootstrap` Phase 8 page-plan reference now name the inliner before `compute-pg-hashes`. No HARD-GATE clause changed because the validator continues to enforce byte-equality at dry-run time.
6. FOUNDATIONS §Story Bundles §9 and `.claude/skills/_shared-templates/story-state-contract.md` §8 are the canonical verbatim-inlining contract sources. The contract is unchanged; only the operator-facing authoring helper is new. No FOUNDATIONS principle is altered.
7. Adjacent contradiction surfaced during reassessment: PG-1 through PG-5 in `red-bunny` carry §3 and §19 drift (grandfathered by GF-PROSESPLIT2-006-001). **Classification**: future cleanup that must become its own ticket — a `red-bunny` (or general bundle-by-bundle) page-plan-canonical-refresh ticket can run the inliner against the grandfathered pages and decide whether to backfill them to byte-equality or leave them grandfathered. Not in scope here.
8. Adjacent question surfaced during reassessment: does the inliner write the plan back to the same file (in-place), or does it require an explicit `--out` flag? In-place is operator-friendly for the typical flow (operator drafts → runs inliner → re-hashes → validates). The CLI takes `--plan <path>` and writes in place by default; an optional `--out <path>` exists for dry-run or copy-out use. **Classification**: required ergonomic choice for this ticket — reflected in §Landed Changes.
9. Live package reassessment widened the file list from the drafted source/test/skill set. Because this is a user-facing CLI, `tools/world-mcp/package.json` must add the `bin` entry and build-time `chmod`, `tools/world-mcp/README.md` must document operator invocation, and `docs/MACHINE-FACING-LAYER.md` must include it in the MCP CLI world-root-resolution list. This is same-seam package public-surface fallout, not a separate feature.
10. The drafted targeted proof `npm test --silent -- --test-name-pattern "inline-canonical"` is not the strongest truthful package-local proof because the package wrapper always builds and runs the compiled `dist/tests/**/*.test.js` suite shape. Targeted acceptance uses `npm run build` followed by `node --test dist/tests/cli/inline-canonical-prose-sections.test.js`; broad acceptance remains `npm test` for each affected package. Pre-edit baselines on 2026-05-27 were green for both `tools/world-mcp` (`482` passing tests) and `tools/validators` (`1093` passing tests).

## Architecture Check

1. The fix introduces one new CLI binary that does one thing: replace §2/§3/§19 body bytes in a page plan with the canonical bytes the validator already reads. The CLI calls the same `CANONICAL_SOURCES` mapping the validator uses, applies the same `stripFramingHeader` normalization, and serializes via the same `^## N. ...` section-boundary regex. Single-source-of-truth across the inliner and the validator is preserved by importing both from a small shared module (introduced in step 1 below) rather than duplicating the constants.
2. The alternative — adding canonical-section refreshing to one of the existing CLIs (e.g., as an `--inline-canonical` flag on `compute-pg-hashes.js`) — conflates two distinct concerns: hashing is a read-only verification step; inlining is a write step. The CLIs in `tools/world-mcp/src/cli/` are separate per-concern binaries (`compute-pg-hashes`, `sign-approval-token`, `submit-patch-plan`, `validate-patch-plan`); the inliner fits that pattern.
3. The alternative — embedding the inliner in the `branching-story-turn-cycle` skill instructions (operator runs a multi-line `sed`/`awk` recipe inline) — is fragile because the canonical sources can change, and the recipe encodes a frozen view of their byte ranges. The CLI reads the canonical files at run time and stays correct as the canonical sources evolve. Rejected.
4. No backwards-compatibility shim. The new CLI is purely additive. Existing tooling is unchanged.

## Verification Layers

1. The new CLI binary exists at `tools/world-mcp/src/cli/inline-canonical-prose-sections.ts` and its compiled output at `tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js` → codebase grep-proof (`ls tools/world-mcp/src/cli/inline-canonical-prose-sections.ts && ls tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js` after build).
2. The shared `CANONICAL_SOURCES` mapping is exported once from `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` (new file) and imported by both the validator and the inliner → schema validation (the two consumers compile against the same export; introducing a divergent mapping in either consumer is a type error).
3. The inliner output bodies match the same shared canonical-source helper consumed by `page_plan_verbatim_section_integrity` → targeted CLI tests plus validator package coverage.
4. Running the inliner on a plan that already matches canonical produces a byte-identical output (idempotency) → unit test asserts `await readFile(out) === readBefore` when the plan was already canonical.
5. FOUNDATIONS alignment check: §Story Bundles §9 defines the canonical-source files; this CLI is the operator-facing realization of that contract. §Tooling Recommendation says LLM agents should never operate on prose alone; a deterministic CLI is the machine-facing operationalization of that discipline for this page-plan surface.

## Landed Changes

### 1. Shared canonical-sources module

Moved the `CANONICAL_SOURCES` constant and the `stripFramingHeader` / `trimTrailingWhitespace` helpers out of `page-plan-verbatim-section-integrity.ts` into `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts`, and exported them through `tools/validators/src/public/index.ts`.

```ts
// tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts

export const CANONICAL_SOURCES = {
  "2": "docs/prose-renderer-contract/content-policy.md",
  "3": "docs/prose-renderer-contract/prose-craft-contract.md",
  "19": "docs/prose-renderer-contract/render-time-instruction.md"
} as const;

export type VerbatimSectionNumber = keyof typeof CANONICAL_SOURCES;

export function stripFramingHeader(content: string): string { ... }
export function trimTrailingWhitespace(value: string): string { ... }
```

`page-plan-verbatim-section-integrity.ts` now imports these from the shared module. Its enforcement and `applies_to` policy did not change.

### 2. Inliner CLI

The CLI signature:

```
node tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js \
  --plan <path-to-page-plan.md> \
  [--out <path-to-output.md>] \
  [--world-root <path>]
```

- `--plan <path>` (required) — path to the page-plan markdown file. Relative paths resolve from cwd.
- `--out <path>` (optional) — output path. Default: same as `--plan` (in-place rewrite).
- `--world-root <path>` (optional) — repo root for resolving the canonical-source files. Default: auto-discovery (walk up from cwd until `docs/prose-renderer-contract/` is found), matching `_resolve-world-root.ts` semantics.

Behavior:
1. Read the plan file.
2. Read the three canonical source files via `path.join(worldRoot, CANONICAL_SOURCES["2"|"3"|"19"])`.
3. For each canonical source, apply `stripFramingHeader` + `trimTrailingWhitespace` to obtain the canonical body bytes — bit-identical to what `page_plan_verbatim_section_integrity` extracts.
4. Locate §2, §3, §19 in the plan via `/^##\s+(\d+)\.\s*(.+?)\s*$/m` matching the same base-heading regex the validator uses.
5. For each section, replace the body — everything between the section's `## N. ...` heading line and the next `## M. ...` heading line (or end of file) — with the canonical body. Preserve a single blank line between the heading and the canonical body, and a single blank line after the canonical body before the next heading (so the surrounding plan structure stays intact).
6. Write the result to `--out` (defaults to `--plan`).

Registered the compiled CLI in `tools/world-mcp/package.json` under `bin`, added it to the package `build` script's `chmod +x` list, and exposed the shared validator helper through `tools/world-mcp/src/package-interop.ts`.

stdout on success: a JSON status object:
```json
{
  "plan_path": "stories/red-bunny/pages-prose-plans/PG-6.md",
  "out_path": "stories/red-bunny/pages-prose-plans/PG-6.md",
  "sections_replaced": ["2", "3", "19"],
  "no_change": false
}
```

When the plan already matched canonical (idempotent run), `no_change: true` and `sections_replaced: []`.

stderr first line: `[world-root] <path> (source: auto_discovery|env|flag)` per the existing CLI convention.

Failure modes (exit 1, JSON written to stderr):
- `{ "ok": false, "code": "plan_not_found", "message": "..." }`
- `{ "ok": false, "code": "missing_section", "message": "...", "section": "3" }` — the plan does not contain `## 3. ...`; the inliner refuses to invent it.
- `{ "ok": false, "code": "canonical_source_unreadable", "message": "...", "path": "..." }`
- `{ "ok": false, "code": "missing_framing_separator", "message": "...", "path": "..." }` — a canonical source lacks the `---` framing separator.

### 3. Tests

Added `tools/world-mcp/tests/cli/inline-canonical-prose-sections.test.ts` covering:
1. Inline against a plan with drifted §3 → `sections_replaced: ["3"]`, out file's §3 matches `stripFramingHeader(prose-craft-contract.md)` byte-for-byte.
2. Inline against a plan with drifted §2/§3/§19 → all three replaced.
3. Inline against an already-canonical plan → `no_change: true`, file unchanged.
4. Inline with `--out` to a separate path → original `--plan` unchanged; `--out` matches.
5. Missing §3 in plan → exit 1, `code: missing_section`.
6. Missing canonical source (mock unreadable path) → exit 1, `code: canonical_source_unreadable`.
7. Canonical source without `---` separator (mock) → exit 1, `code: missing_framing_separator`.
8. Missing plan path → exit 1, `code: plan_not_found`.

### 4. Skill and package documentation

Updated two skill files and the package/machine-facing CLI docs:

- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — add a short paragraph naming the inliner as the recommended way to populate §2/§3/§19 at draft time. The validator's enforcement is unchanged; this is operator guidance only.
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` — same paragraph.
- `tools/world-mcp/README.md` — documents the CLI alongside other package CLIs.
- `docs/MACHINE-FACING-LAYER.md` — includes the CLI in the deterministic world-root resolution contract for MCP CLIs.

## Files to Touch

- `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` (new — shared mapping + helpers)
- `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` (modify — import from new shared module)
- `tools/validators/src/public/index.ts` (modify — public helper export)
- `tools/world-mcp/package.json` (modify — binary registration and executable build artifact)
- `tools/world-mcp/src/package-interop.ts` (modify — validator helper bridge)
- `tools/world-mcp/src/cli/inline-canonical-prose-sections.ts` (new — CLI implementation)
- `tools/world-mcp/tests/cli/inline-canonical-prose-sections.test.ts` (new — test suite)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify — single paragraph naming the CLI)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify — same paragraph)
- `tools/world-mcp/README.md` (modify — package CLI documentation)
- `docs/MACHINE-FACING-LAYER.md` (modify — machine-facing CLI root-resolution documentation)

## Out of Scope

- Backfilling PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/` to byte-equality with the canonical sources. Those plans are grandfathered by GF-PROSESPLIT2-006-001; refreshing them is a separate operational decision (it would change content hashes on already-committed `_source/pages/PG-N.yaml` records via the plan_hash dependency, which is a non-trivial migration). Track as a follow-up if/when the grandfather is retired.
- Updating the `page_plan_verbatim_section_integrity` validator itself. The validator's enforcement and `applies_to` policy are unchanged; this ticket only feeds canonical bytes into the operator's draft pipeline.
- Any change to the canonical source files themselves (`docs/prose-renderer-contract/*.md`). The CLI reads whatever those files contain.
- Adding inliner support for §15 frontmatter or §16a STCHAR packets. Those sections are operator-authored per page and do not have a canonical source to inline from.
- Tightening the submit path (`tools/world-mcp/src/tools/submit-patch-plan.ts`) to enforce verbatim integrity when no `page_plan_drafts` are attached. The dry-run/submit asymmetry tracking remains its own concern outside this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: inliner replaces drifted §3 with canonical bytes; output's extracted §3 body matches `stripFramingHeader` applied to `docs/prose-renderer-contract/prose-craft-contract.md` byte-for-byte.
2. New unit test: idempotent run on already-canonical plan emits `no_change: true` and produces a byte-identical output file (same content_hash).
3. New unit test: missing §3 in the plan returns exit 1 with `code: missing_section`.
4. New chain-of-custody proof: the inliner imports the same validator-package canonical mapping / framing helper as `page_plan_verbatim_section_integrity`, and the CLI test asserts drifted §2 / §3 / §19 output bodies match that helper byte-for-byte; the unchanged validator behavior is covered by `tools/validators` package tests.
5. `cd tools/world-mcp && npm run build && node --test dist/tests/cli/inline-canonical-prose-sections.test.js` passes.
6. `cd tools/world-mcp && npm test` passes.
7. `cd tools/validators && npm test` passes (the shared-module extraction is a structural refactor inside the validators package that must not change validator behavior).
8. Targeted CLI smoke test: `node --test dist/tests/cli/inline-canonical-prose-sections.test.js` exercises temp drifted drafts and proves `sections_replaced` plus byte-identical §2 / §3 / §19 output bodies against the shared canonical-source helper outputs.

### Invariants

1. The inliner and the `page_plan_verbatim_section_integrity` validator both read the same `CANONICAL_SOURCES` mapping and the same `stripFramingHeader` normalization, sourced from `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts`. Any future change to the canonical-source file paths or the framing-header convention requires a single edit, not two.
2. The inliner is a pure file-rewrite operation — it never mutates `_source/` records, never runs the patch engine, never calls MCP, never touches `INDEX.md`. Engine-only mutation discipline (Hook 3 etc.) is preserved by exclusion.
3. The inliner refuses to invent sections that do not already exist in the plan (no `--insert-missing` flag). The operator must author the section headings; the inliner only refreshes existing bodies.
4. Aligns with `docs/FOUNDATIONS.md` §Story Bundles §9 (canonical-source files) and §Tooling Recommendation (deterministic machine-facing surfaces).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/inline-canonical-prose-sections.test.ts` (new) — covers the cases listed in §Landed Changes step 3.
2. `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` (existing) — verify it still passes after the shared-module extraction; no functional change expected.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/cli/inline-canonical-prose-sections.test.js` — targeted CLI test run over the compiled artifact.
2. `cd tools/world-mcp && npm test` — full world-mcp package check.
3. `cd tools/validators && npm test` — full validators package check (catches regressions in the shared-module extraction).
4. The end-to-end smoke is represented by `tools/world-mcp/tests/cli/inline-canonical-prose-sections.test.ts`: it builds temp world roots and temp page-plan drafts, runs the CLI implementation, and confirms the output bodies match the shared canonical-source helper exactly.

## Outcome

Implemented the canonical page-plan prose-section inliner and shared canonical-source helper surface:

1. Added `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` and updated `page_plan_verbatim_section_integrity` to import the shared mapping and normalization helpers.
2. Exported the shared helper through the validators public package surface and bridged it in `tools/world-mcp/src/package-interop.ts`.
3. Added `tools/world-mcp/src/cli/inline-canonical-prose-sections.ts`, registered the compiled binary in `tools/world-mcp/package.json`, and made the build mark it executable.
4. Added compiled-artifact CLI tests covering replacement, idempotency, `--out`, missing sections, missing canonical source, missing framing separator, and missing plan input.
5. Updated the turn-cycle/bootstrap page-plan references plus `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` so operator guidance names the new CLI before hashing.

## Verification Result

1. Pre-edit baseline: `cd tools/world-mcp && npm test` passed with `482` passing tests.
2. Pre-edit baseline: `cd tools/validators && npm test` passed with `1093` passing tests.
3. `cd tools/validators && npm run build` passed after adding the shared canonical-source module.
4. `cd tools/world-mcp && npm run build` initially failed on TypeScript narrowing in the new CLI; after narrowing the replacement union type, it passed.
5. `cd tools/world-mcp && node --test dist/tests/cli/inline-canonical-prose-sections.test.js` passed with `8` passing tests.
6. `cd tools/validators && npm test` passed with `1093` passing tests.
7. A concurrent `cd tools/world-mcp && npm test` run failed once because it imported `tools/validators/dist` while the validators package was being rebuilt in parallel. The same `world-mcp` suite was rerun sequentially after validators settled and passed with `490` passing tests.
8. `git diff --check` passed.

## Deviations

1. Same-seam file-set widening: `tools/world-mcp/package.json`, `tools/world-mcp/src/package-interop.ts`, `tools/validators/src/public/index.ts`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` were added to the landed file set because the CLI must be registered, executable after build, publicly documented, and able to consume the validator helper through the package boundary.
2. The drafted `npm test --silent -- --test-name-pattern "inline-canonical"` proof was replaced with `npm run build` plus `node --test dist/tests/cli/inline-canonical-prose-sections.test.js` because the package-local test wrapper is a compiled full-suite lane, not a reliable narrow test-name filter.
3. The final proof was run sequentially after the transient concurrent producer/consumer rebuild failure; no package behavior failure remained.
