# PPCANONINL-001: CLI helper to inline canonical §2/§3/§19 bytes into a page plan

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds a new CLI binary under `tools/world-mcp/src/cli/`, adds tests under `tools/world-mcp/tests/cli/`. No skill change required but `branching-story-turn-cycle` and `branching-story-bootstrap` skills should reference the helper in their Phase-7 / Phase-8 instructions (a documentation-only update tracked as part of this ticket).
**Deps**: None (PPENGVOC-001 is independent; the two tickets address different validators).

## Problem

The page-plan §2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) sections must be byte-identical to their canonical sources at `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md` respectively. This is the verbatim-inlining contract declared in `docs/FOUNDATIONS.md` §Story Bundles §9 (line 714): "The Prose Craft Contract is hosted at `docs/prose-renderer-contract/prose-craft-contract.md` and inlined verbatim as page-plan §3 per `.claude/skills/_shared-templates/story-state-contract.md` §8. The Content Policy and Render-Time Instruction Template are hosted alongside at `docs/prose-renderer-contract/content-policy.md` and `docs/prose-renderer-contract/render-time-instruction.md` respectively, inlined as page-plan §2 and §19."

The `page_plan_verbatim_section_integrity` validator at `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` enforces byte-equality by reading the canonical sources at runtime and comparing them line-for-line against the plan's extracted sections. The validator's `stripFramingHeader` (lines 76-83) drops everything before the first `---` line and trims trailing whitespace; that is the exact normalization a new helper must produce.

There is currently no helper that the authoring operator can run to splice the canonical bytes into a draft page plan. Operators copy-paste §2/§3/§19 from a prior page in the bundle, which copies the prior page's drift. PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/` all carry §3 and §19 drift relative to the canonical sources; the drift is grandfathered by GF-PROSESPLIT2-006-001 but the grandfather does not cover new pages. During the PG-6 turn cycle I started with PG-5's §3 / §19, hit the verbatim validator's drift fail, manually replaced Rule 9 in §3 against `docs/prose-renderer-contract/prose-craft-contract.md`, and missed §19 drift on the same iteration. A deterministic inliner removes this entire class of authoring error and removes the per-page hand-copy from the operator's workflow.

## Assumption Reassessment (2026-05-27)

1. `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md` all exist and each begins with a framing-header preamble followed by a `---` separator line, then the canonical body. The validator's `stripFramingHeader` (page-plan-verbatim-section-integrity.ts:76-83) reads everything after the first `---` separator and trims trailing whitespace — confirmed by inspection.
2. `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts:11-15` defines `CANONICAL_SOURCES = { "2": ..., "3": ..., "19": ... }` as the authoritative file mapping. The new CLI must reuse the same mapping (or import from the validator's exports) to stay in sync; otherwise mapping drift becomes its own failure mode.
3. `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts:144-148` shows that §2/§3/§19 are matched in the plan by `^##\s+(\d+)\.\s*(.+?)\s*$` — base sections only, not §16a or §7a. The inliner replaces the same section boundaries.
4. Existing CLI binaries under `tools/world-mcp/src/cli/` (`compute-pg-hashes.ts`, `sign-approval-token.ts`, `submit-patch-plan.ts`, `validate-patch-plan.ts`, `_resolve-world-root.ts`) follow a consistent stdout-on-success / stderr-on-error pattern with a `[world-root] <path> (source: <auto_discovery|env|flag>)` first-line trace on stderr. The new CLI follows that pattern. `_resolve-world-root.ts` is the canonical helper for repo-root discovery and the inliner imports it (or uses the same auto_discovery logic — same as `loadCanonicalSources` `repoRootFrom` at lines 55-73 of the verbatim validator).
5. The `branching-story-turn-cycle` skill's Phase 7 (page-plan authoring) and `branching-story-bootstrap` skill's equivalent phase prescribe verbatim §2/§3/§19. They do not currently name a tool. After this ticket lands, both phases should reference the new CLI. No HARD-GATE clause needs to change because the validator continues to enforce byte-equality at dry-run time.
6. FOUNDATIONS §Story Bundles §9 (line 714) and `.claude/skills/_shared-templates/story-state-contract.md` §8 are the canonical verbatim-inlining contract sources. The contract is unchanged; only the operator-facing authoring helper is new. No FOUNDATIONS principle is altered.
7. Adjacent contradiction surfaced during reassessment: PG-1 through PG-5 in `red-bunny` carry §3 and §19 drift (grandfathered by GF-PROSESPLIT2-006-001). **Classification**: future cleanup that must become its own ticket — a `red-bunny` (or general bundle-by-bundle) page-plan-canonical-refresh ticket can run the inliner against the grandfathered pages and decide whether to backfill them to byte-equality or leave them grandfathered. Not in scope here.
8. Adjacent question surfaced during reassessment: does the inliner write the plan back to the same file (in-place), or does it require an explicit `--out` flag? In-place is operator-friendly for the typical flow (operator drafts → runs inliner → re-hashes → validates). The CLI takes `--plan <path>` and writes in place by default; an optional `--out <path>` exists for dry-run or copy-out use. **Classification**: required ergonomic choice for this ticket — documented in §What to Change below.

## Architecture Check

1. The fix introduces one new CLI binary that does one thing: replace §2/§3/§19 body bytes in a page plan with the canonical bytes the validator already reads. The CLI calls the same `CANONICAL_SOURCES` mapping the validator uses, applies the same `stripFramingHeader` normalization, and serializes via the same `^## N. ...` section-boundary regex. Single-source-of-truth across the inliner and the validator is preserved by importing both from a small shared module (introduced in step 1 below) rather than duplicating the constants.
2. The alternative — adding canonical-section refreshing to one of the existing CLIs (e.g., as an `--inline-canonical` flag on `compute-pg-hashes.js`) — conflates two distinct concerns: hashing is a read-only verification step; inlining is a write step. The CLIs in `tools/world-mcp/src/cli/` are separate per-concern binaries (`compute-pg-hashes`, `sign-approval-token`, `submit-patch-plan`, `validate-patch-plan`); the inliner fits that pattern.
3. The alternative — embedding the inliner in the `branching-story-turn-cycle` skill instructions (operator runs a multi-line `sed`/`awk` recipe inline) — is fragile because the canonical sources can change, and the recipe encodes a frozen view of their byte ranges. The CLI reads the canonical files at run time and stays correct as the canonical sources evolve. Rejected.
4. No backwards-compatibility shim. The new CLI is purely additive. Existing tooling is unchanged.

## Verification Layers

1. The new CLI binary exists at `tools/world-mcp/src/cli/inline-canonical-prose-sections.ts` and its compiled output at `tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js` → codebase grep-proof (`ls tools/world-mcp/src/cli/inline-canonical-prose-sections.ts && ls tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js` after build).
2. The shared `CANONICAL_SOURCES` mapping is exported once from `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` (new file) and imported by both the validator and the inliner → schema validation (the two consumers compile against the same export; introducing a divergent mapping in either consumer is a type error).
3. After running the inliner on a freshly drafted plan that copies §3/§19 from PG-5 (which has known drift), running `page_plan_verbatim_section_integrity` against the result emits zero verdicts → skill dry-run (chain: operator draft → inliner → `validate-patch-plan.js --page-plan-drafts ...`).
4. Running the inliner on a plan that already matches canonical produces a byte-identical output (idempotency) → unit test asserts `await readFile(out) === readBefore` when the plan was already canonical.
5. FOUNDATIONS alignment check: §Story Bundles §9 (line 714) defines the canonical-source files; this CLI is the operator-facing realization of that contract. §Tooling Recommendation (lines 540-557): "LLM agents should never operate on prose alone" — a deterministic CLI is the machine-facing operationalization of "always receive ... directly or via the documented context-packet + targeted-retrieval pattern."

## What to Change

### 1. Add a shared canonical-sources module at `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts`

Move the `CANONICAL_SOURCES` constant and the `stripFramingHeader` / `trimTrailingWhitespace` helpers out of `page-plan-verbatim-section-integrity.ts` into a small module:

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

Update `page-plan-verbatim-section-integrity.ts` to import these from the new shared module. No behavior change.

### 2. Add the CLI at `tools/world-mcp/src/cli/inline-canonical-prose-sections.ts`

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
4. Locate §2, §3, §19 in the plan via `/^##\s+(\d+)\.\s*(.+?)\s*$/m` matching the same regex the validator uses (`page-plan-verbatim-section-integrity.ts:144-148`).
5. For each section, replace the body — everything between the section's `## N. ...` heading line and the next `## M. ...` heading line (or end of file) — with the canonical body. Preserve a single blank line between the heading and the canonical body, and a single blank line after the canonical body before the next heading (so the surrounding plan structure stays intact).
6. Write the result to `--out` (defaults to `--plan`).

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

### 3. Add tests at `tools/world-mcp/tests/cli/inline-canonical-prose-sections.test.ts`

Test cases:
1. Inline against a plan with drifted §3 → `sections_replaced: ["3"]`, out file's §3 matches `stripFramingHeader(prose-craft-contract.md)` byte-for-byte.
2. Inline against a plan with drifted §2/§3/§19 → all three replaced.
3. Inline against an already-canonical plan → `no_change: true`, file unchanged.
4. Inline with `--out` to a separate path → original `--plan` unchanged; `--out` matches.
5. Missing §3 in plan → exit 1, `code: missing_section`.
6. Missing canonical source (mock unreadable path) → exit 1, `code: canonical_source_unreadable`.
7. Canonical source without `---` separator (mock) → exit 1, `code: missing_framing_separator`.
8. After running the inliner on a drifted plan, running `page_plan_verbatim_section_integrity` against the result produces zero verdicts — chain-of-custody test that the inliner's output exactly satisfies the validator.

### 4. Reference the CLI in skill documentation

Update two skill files:

- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — add a short paragraph naming the inliner as the recommended way to populate §2/§3/§19 at draft time. The validator's enforcement is unchanged; this is operator guidance only.
- `.claude/skills/branching-story-bootstrap/references/phase-8-page-plan-pg-1.md` (or the equivalent Phase 8 reference) — same paragraph.

The paragraph reads roughly: "Before re-computing plan_hash in Phase 9, run `node tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js --plan <path>` to splice the canonical §2/§3/§19 bytes into the draft. This eliminates copy-paste drift from prior pages and removes the manual byte-for-byte check that operators otherwise have to perform against `docs/prose-renderer-contract/{content-policy.md,prose-craft-contract.md,render-time-instruction.md}`."

## Files to Touch

- `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts` (new — shared mapping + helpers)
- `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` (modify — import from new shared module)
- `tools/world-mcp/src/cli/inline-canonical-prose-sections.ts` (new — CLI implementation)
- `tools/world-mcp/tests/cli/inline-canonical-prose-sections.test.ts` (new — test suite)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify — single paragraph naming the CLI)
- `.claude/skills/branching-story-bootstrap/references/phase-8-page-plan-pg-1.md` or equivalent (modify — same paragraph)

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
4. New chain-of-custody test: a plan with PG-5's drifted §3/§19 is run through the inliner, then run through `page_plan_verbatim_section_integrity` (via the validator's public API), and the validator emits zero `severity: fail` verdicts for §2/§3/§19.
5. `cd tools/world-mcp && npm test && npm run build` passes.
6. `cd tools/validators && npm test && npm run build` passes (the shared-module extraction is a structural refactor inside the validators package that must not change validator behavior).
7. Targeted CLI smoke test: `node tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js --plan /tmp/PG-6-draft.md --out /tmp/PG-6-inlined.md` against the PG-6 draft from the turn cycle produces `sections_replaced: ["19"]` (or `[]` if the operator already refreshed §19 manually) and the output's §3 is byte-identical to `stripFramingHeader(prose-craft-contract.md)`.

### Invariants

1. The inliner and the `page_plan_verbatim_section_integrity` validator both read the same `CANONICAL_SOURCES` mapping and the same `stripFramingHeader` normalization, sourced from `tools/validators/src/structural/page-plan-verbatim-canonical-sources.ts`. Any future change to the canonical-source file paths or the framing-header convention requires a single edit, not two.
2. The inliner is a pure file-rewrite operation — it never mutates `_source/` records, never runs the patch engine, never calls MCP, never touches `INDEX.md`. Engine-only mutation discipline (Hook 3 etc.) is preserved by exclusion.
3. The inliner refuses to invent sections that do not already exist in the plan (no `--insert-missing` flag). The operator must author the section headings; the inliner only refreshes existing bodies.
4. Aligns with `docs/FOUNDATIONS.md` §Story Bundles §9 (line 714 — canonical-source files) and §Tooling Recommendation (lines 540-557 — deterministic machine-facing surfaces).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/inline-canonical-prose-sections.test.ts` (new) — covers cases 1-8 from §What to Change step 3.
2. `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` (existing) — verify it still passes after the shared-module extraction; no functional change expected.

### Commands

1. `cd tools/world-mcp && npm test --silent -- --test-name-pattern "inline-canonical"` — targeted CLI test run.
2. `cd tools/world-mcp && npm test && npm run build` — full world-mcp package check.
3. `cd tools/validators && npm test && npm run build` — full validators package check (catches regressions in the shared-module extraction).
4. End-to-end smoke: copy PG-5's body to `/tmp/PG-6-test.md`, run `node tools/world-mcp/dist/src/cli/inline-canonical-prose-sections.js --plan /tmp/PG-6-test.md`, then run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts <drafts-built-from-/tmp/PG-6-test.md> <envelope>` and confirm `page_plan_verbatim_section_integrity` reports zero fails for §2/§3/§19. (Other validators may still fire; this test isolates the verbatim concern.)
