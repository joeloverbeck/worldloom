# PROSESPLIT2-005: Add `page_plan_verbatim_section_integrity` structural validator + test (byte-equality between page-plan §2 / §3 / §19 and canonical-source files)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` validator + new `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` test; validator registered in `tools/validators/src/registry.ts` (or equivalent registration site)
**Deps**: archive/tickets/PROSESPLIT2-001.md (canonical-source paths must exist), PROSESPLIT2-002 (skill-side refs migrated so new plans author from the new path), PROSESPLIT2-003 (FOUNDATIONS reference migrated), PROSESPLIT2-004 (legacy report deleted; only the new canonical files remain as authoritative source). All four must land first or the test points at a moving target.

## Problem

`_shared-templates/story-state-contract.md` §8 declares §2 / §3 / §19 of every `pages-prose-plans/PG-<integer>.md` as "inlined verbatim from `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md`" (post-PROSESPLIT2-002). The verbatim property is operationally load-bearing per the user's 2026-05-12 decision (feedback memory `page_plan_verbatim_sections`): the external prose renderer has no cross-plan state, so every page render is cold context — any drift between canonical source and inlined plan content silently breaks the self-contained-plan contract.

**Today the verbatim property is enforced only by skill prose** ("§2, §3, and §19 are inlined verbatim on every page plan... Skills must not propose compacting these sections across pages" — `_shared-templates/story-state-contract.md:452`). The existing `page_plan_body_engine_vocabulary_cleanliness` validator allow-lists §2 / §3 / §15 / §19 as engine-vocabulary-permitted sections precisely because they're verbatim-inlined — but it does NOT check the bytes are actually unchanged from canonical source.

A page plan that ships with stale §2 / §3 / §19 content (because the canonical source evolved after the plan was authored, OR because the plan author hand-edited the verbatim block) currently passes all validation. The user-confirmed operationally-load-bearing property is aspirational at the validator layer.

This ticket transforms the verbatim property from skill prose into a structural invariant. The new validator `page_plan_verbatim_section_integrity` reads the three canonical-source files, extracts §2 / §3 / §19 from each page plan in scope, and asserts byte-equality. Drift fails the gate.

## Assumption Reassessment (2026-05-26)

1. `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` exists and demonstrates the validator-authoring pattern this ticket follows: uses `pagePlanTargets(input, ctx)` helper to find pages in scope, uses `parseSections(content)` to extract numbered sections, returns `Verdict[]`, applies in `full-world`, `pre-apply` (with `create_pg_record` patch), and `incremental` (touching `stories/<slug>/pages-prose-plans/PG-<integer>.md`) modes. The new validator uses the same shape.
2. `tools/validators/src/structural/page-plan-section-parser.ts` (used by the existing validator) exposes `pagePlanTargets` and section-extraction helpers — to be confirmed at implementation time; if the section-extraction function is private, the new validator includes its own minimal section parser tuned for §2 / §3 / §19 extraction.
3. Canonical-source files post-PROSESPLIT2-001..004: `docs/prose-renderer-contract/content-policy.md` (page-plan §2 source), `docs/prose-renderer-contract/prose-craft-contract.md` (page-plan §3 source), `docs/prose-renderer-contract/render-time-instruction.md` (page-plan §19 source). Each file starts with a framing header (a `#` H1 title + framing paragraph + `---` separator), then the canonical content. The validator MUST strip the framing header before byte-comparison — the framing exists for human readers, not for inlining.
4. Cross-skill boundary: this ticket adds a new gate that fires against page plans authored by `branching-story-bootstrap` and `branching-story-turn-cycle`. The gate's invariant is byte-equality between canonical source and inlined section; the gate FAILs (not WARNs) on drift because the verbatim property is load-bearing — drift is not a soft pathology.
5. FOUNDATIONS principles motivating the test:
   - §LLM-facing Skill Prose Discipline (§714 hosting reference, updated by PROSESPLIT2-003) — the canonical-source location is now a structurally-enforced contract, not an aspirational reference.
   - §Story Bundles §4 (the plan IS the prompt; single-artifact rendering contract) — drift between the canonical contract and the per-plan bytes silently fragments the single-artifact promise; a structural gate forecloses the fragmentation.
6. **Framing-header strip semantics**: each canonical-source file is structured as `<framing header>\n---\n<verbatim content>` where the canonical content begins on the first line after `---`. The validator extracts the content slice (everything after the first `---` line) and trims trailing whitespace. The page plan's §2 / §3 / §19 content is the text under each `## N. <Section title>` header, up to (but not including) the next section header. Byte-comparison is between the canonical content slice and the page-plan section body.
7. **Existing-plan handling**: Page plans authored before PROSESPLIT2-001 land carry the original report's bytes (which are byte-identical to PROSESPLIT2-001's copies — that is the byte-equality invariant of PROSESPLIT2-001). The new validator therefore PASSES against existing plans on disk without retroactive rewriting. If the canonical source ever evolves (e.g., a future ticket revises Rule 7), existing plans on disk WILL fail the gate; the failure routes to a follow-up "refresh existing plans" ticket per the user's 2026-05-12 decision that "existing in-bundle plans are NOT retroactively rewritten" applied at SPEC-91 time. The validator's failure mode documents this expected lifecycle and recommends the canonical-source-version-stamp follow-up as the lawful remediation.
8. No adjacent contradictions exposed. The existing `page_plan_body_engine_vocabulary_cleanliness` validator's allow-list of §2 / §3 / §15 / §19 sections is intact and orthogonal to this new validator (one allows engine vocabulary IN those sections; the other checks the bytes ARE the canonical-source content).

## Architecture Check

1. The byte-equality test is cleaner than (a) hash-stamp checks (which require schema-extending PG records to carry a `prose_renderer_contract_version` field — more surface area, more validator complexity) or (b) prose-similarity checks (lossy; can't catch single-character drift like a renamed axis token). Direct byte-comparison is the simplest expressible invariant that captures the verbatim property.
2. No backwards-compatibility aliasing/shims — the validator reads canonical-source files at run time; no shim, no flag-gated rollout. Plans on disk that match canonical source PASS; drift FAILs.
3. **Validator placement under `structural/`** (not `integrity/`): the existing `page-plan-body-engine-vocabulary-cleanliness.ts` lives under `structural/`; this validator operates on the same plan-body surface and uses the same `pagePlanTargets` discovery pattern. Placing it under `structural/` keeps the page-plan-body validator cluster cohesive.

## Verification Layers

1. The validator produces no verdict (PASS) when a page plan's §2 / §3 / §19 byte-match canonical source → unit test asserting empty verdicts list against a synthesized PG fixture using literal canonical bytes.
2. The validator produces a FAIL verdict when a page plan's §3 has a single-character drift from canonical source → unit test asserting one verdict with `severity: "fail"` and the drift location.
3. The validator produces FAIL verdicts when a page plan omits §2 / §3 / §19 entirely → unit test for each missing section (three sub-tests).
4. The validator handles the canonical-source framing-header strip correctly → unit test that constructs a canonical-source file with a known framing header and verifies the validator compares only post-framing content.
5. The validator integrates with `pnpm test` and the full pipeline → integration test asserting validator runs end-to-end on a fixture page plan.

## What to Change

### 1. Create `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts`

Validator shape modeled on `page-plan-body-engine-vocabulary-cleanliness.ts`:

```typescript
import { promises as fs } from "node:fs";
import path from "node:path";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { pagePlanTargets, type PagePlanTarget } from "./page-plan-section-parser.js";
import { touchedFilesInclude } from "./utils.js";

const VALIDATOR = "page_plan_verbatim_section_integrity";

const CANONICAL_SOURCES = {
  "2": "docs/prose-renderer-contract/content-policy.md",
  "3": "docs/prose-renderer-contract/prose-craft-contract.md",
  "19": "docs/prose-renderer-contract/render-time-instruction.md"
} as const;

// Strip leading framing header up to and including the first `---` separator line.
// Trim trailing whitespace lines.
function stripFramingHeader(canonicalFileContent: string): string {
  const lines = canonicalFileContent.split("\n");
  const sepIdx = lines.findIndex((line) => line.trim() === "---");
  if (sepIdx < 0) {
    throw new Error(`Canonical source file lacks the required \`---\` separator line.`);
  }
  return lines.slice(sepIdx + 1).join("\n").replace(/\s+$/, "");
}

export const pagePlanVerbatimSectionIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && hasPagePlanDraftInput(ctx)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/pages-prose-plans\/PG-\d+\.md$/)),
  skip_reason: "page-plan §2/§3/§19 byte-equality surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const canonicalContents = await loadCanonicalSources(ctx);
    return pagePlanTargets(input, ctx).flatMap((plan) =>
      validatePlan(plan, canonicalContents)
    );
  }
};

async function loadCanonicalSources(
  ctx: Context
): Promise<Record<"2" | "3" | "19", string>> {
  const repoRoot = ctx.repo_root ?? process.cwd();
  const out: Record<string, string> = {};
  for (const [sectionNumber, relativePath] of Object.entries(CANONICAL_SOURCES)) {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const raw = await fs.readFile(absolutePath, "utf8");
    out[sectionNumber] = stripFramingHeader(raw);
  }
  return out as Record<"2" | "3" | "19", string>;
}

function hasPagePlanDraftInput(ctx: Context): boolean {
  return (ctx.patch_plan?.patches ?? []).some((patch) => patch.op === "create_pg_record");
}

function validatePlan(
  plan: PagePlanTarget,
  canonical: Record<"2" | "3" | "19", string>
): Verdict[] {
  const verdicts: Verdict[] = [];
  const sectionBodies = extractSections(plan.content, ["2", "3", "19"]);

  for (const sectionNumber of ["2", "3", "19"] as const) {
    const planBody = sectionBodies[sectionNumber];
    const canonicalBody = canonical[sectionNumber];

    if (planBody === undefined) {
      verdicts.push({
        validator: VALIDATOR,
        severity: "fail",
        code: `${VALIDATOR}.missing_section`,
        path: plan.path,
        detail: {
          missing_section: sectionNumber,
          canonical_source: CANONICAL_SOURCES[sectionNumber]
        },
        message: `Page plan ${plan.path} is missing §${sectionNumber}; expected verbatim content from ${CANONICAL_SOURCES[sectionNumber]}.`
      });
      continue;
    }

    if (planBody !== canonicalBody) {
      verdicts.push({
        validator: VALIDATOR,
        severity: "fail",
        code: `${VALIDATOR}.drift`,
        path: plan.path,
        detail: {
          section: sectionNumber,
          canonical_source: CANONICAL_SOURCES[sectionNumber],
          first_diverging_line: findFirstDivergingLine(planBody, canonicalBody)
        },
        message: `Page plan ${plan.path} §${sectionNumber} drifts from canonical source ${CANONICAL_SOURCES[sectionNumber]}. The verbatim-inlining contract requires byte-equality; refresh the section from canonical source or run the canonical-source-refresh workflow.`
      });
    }
  }

  return verdicts;
}

function extractSections(
  planContent: string,
  sectionNumbers: readonly string[]
): Record<string, string | undefined> {
  // Implementation: scan for `## N. <title>` headers; capture body until next `## ` or EOF.
  // Returns map of sectionNumber -> body string (trimmed trailing whitespace), or undefined when missing.
  // Implementation detail follows the existing `parseSections` shape from `page-plan-body-engine-vocabulary-cleanliness.ts`.
  // Adjust to handle §19 which is the LAST section (terminate at EOF rather than next header).
  // ...
}

function findFirstDivergingLine(a: string, b: string): number {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  for (let i = 0; i < Math.min(aLines.length, bLines.length); i++) {
    if (aLines[i] !== bLines[i]) return i + 1;
  }
  return Math.min(aLines.length, bLines.length) + 1;
}
```

Implementation notes (filled in at coding time):
- The `extractSections` helper SHOULD reuse `page-plan-section-parser.ts` if its API exposes section-body extraction; if not, include a minimal local implementation. Avoid duplicating the existing section-parser logic — refactor if needed and update the existing validator's import.
- `ctx.repo_root` access: confirm at coding time whether the `Context` type exposes a `repo_root` field; if not, derive from the `pagePlanTargets` results (each target's path is repo-relative) or accept a path resolver in `applies_to`.
- The validator is `severity_mode: "fail"` because verbatim drift breaks the self-contained-plan contract — not a soft pathology.

### 2. Create `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts`

Test file modeled on `page-plan-body-engine-vocabulary-cleanliness.test.ts`. Required test cases:

```typescript
import assert from "node:assert/strict";
import test from "node:test";

import { pagePlanVerbatimSectionIntegrity } from "../../src/structural/page-plan-verbatim-section-integrity.js";
import { context } from "./helpers.js";

test("page_plan_verbatim_section_integrity passes when §2 / §3 / §19 match canonical source byte-for-byte", async () => {
  // Read canonical files; construct plan with their bytes inlined as §2 / §3 / §19.
  // Assert empty verdicts list.
});

test("page_plan_verbatim_section_integrity fails on §3 single-character drift", async () => {
  // Inline §3 with one character changed from canonical.
  // Assert one verdict, severity "fail", code "page_plan_verbatim_section_integrity.drift", section "3".
});

test("page_plan_verbatim_section_integrity fails on missing §2", async () => {
  // Plan that omits §2 entirely.
  // Assert one verdict, code "page_plan_verbatim_section_integrity.missing_section", missing_section "2".
});

test("page_plan_verbatim_section_integrity fails on missing §3", async () => {
  // Plan that omits §3 entirely.
});

test("page_plan_verbatim_section_integrity fails on missing §19", async () => {
  // Plan that omits §19 entirely.
});

test("page_plan_verbatim_section_integrity strips canonical-source framing header before comparison", async () => {
  // Construct a fixture canonical file with a known framing header `# <title>\n<framing>\n---\n<content>`.
  // Mock the canonical-source read OR construct a synthetic context with a temp file.
  // Verify the validator compares only the post-`---` content.
});

test("page_plan_verbatim_section_integrity emits first_diverging_line on drift", async () => {
  // Drift on line N of §3.
  // Assert detail.first_diverging_line === N.
});
```

### 3. Register the validator

Add a line registering `pagePlanVerbatimSectionIntegrity` in the validator registry (likely `tools/validators/src/registry.ts` or `tools/validators/src/index.ts` — confirm at coding time by reading how `pagePlanBodyEngineVocabularyCleanliness` is wired in).

### 4. Update `_shared-templates/story-state-contract.md` §8 paragraph at line 452

Append a single sentence to the existing paragraph after "Skills must not propose compacting these sections across pages.":

> Byte-equality between canonical source and inlined section is enforced by the `page_plan_verbatim_section_integrity` structural validator (`tools/validators/src/structural/page-plan-verbatim-section-integrity.ts`); drift fails the gate.

This documents the new gate alongside the prose contract.

## Files to Touch

- `tools/validators/src/structural/page-plan-verbatim-section-integrity.ts` (new)
- `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` (new)
- `tools/validators/src/registry.ts` (modify — register new validator; exact path to confirm at coding time)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — append validator-enforcement note at line 452)

## Out of Scope

- **Retroactively rewriting in-bundle page plans** (`worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-*.md`). The validator's failure mode against pre-existing plans is acceptable per the user's 2026-05-12 decision that existing plans are forward-only. If the canonical source evolves and existing plans need refreshing, that is a separate ticket.
- **Adding a `prose_renderer_contract_version` field to PG records or canonical-source files.** The byte-equality check is the simplest expressible invariant; versioning is a possible follow-up if canonical-source evolution becomes frequent.
- **A canonical-source-refresh CLI** (e.g., `pnpm refresh-page-plan-verbatim PG-N`). The validator FAILs on drift; remediation is currently manual (re-copy from canonical source). A CLI is a follow-up if drift becomes operationally frequent.
- **WARN-level drift severity.** Drift is FAIL because the verbatim property is load-bearing; a WARN gate would invite drift accumulation. If a soft-drift case ever surfaces, it warrants a discussion not a validator-config flag.
- **Cross-page consistency checks** (e.g., asserting PG-1's §3 matches PG-2's §3). The canonical-source equality check makes cross-page consistency a transitive property; a separate cross-page validator is unnecessary.

## Acceptance Criteria

### Tests That Must Pass

1. `node --test tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` (or `pnpm --filter @worldloom/validators test -- --grep verbatim_section_integrity` per the package's test command) — all 7 test cases pass.
2. `pnpm turbo lint && pnpm turbo typecheck` — no lint/type regression.
3. `pnpm turbo test` — full validator test suite continues to pass; new validator integrates cleanly.
4. Manual: run the validator against `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` post-PROSESPLIT2-001..004; expected PASS (existing plan's bytes are byte-identical to the canonical-source copies created by PROSESPLIT2-001).
5. Manual: hand-edit one character of §3 in a copy of an existing plan; run the validator against the copy; expected FAIL with `code: "page_plan_verbatim_section_integrity.drift"` and `detail.section: "3"`.

### Invariants

1. After this ticket lands, any page plan committed via `branching-story-bootstrap` or `branching-story-turn-cycle` carries §2 / §3 / §19 content byte-identical to `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md` (post-framing-header strip).
2. Drift between canonical source and any plan's §2 / §3 / §19 produces a `fail` verdict from `page_plan_verbatim_section_integrity`; no soft-PASS path exists.
3. The validator runs in `full-world`, `pre-apply` (against draft PG records), and `incremental` (when a page plan is touched) modes — paralleling the existing `page_plan_body_engine_vocabulary_cleanliness` coverage.
4. The validator's existence is documented inline in `_shared-templates/story-state-contract.md` §8 so future skill authors see the enforcement surface alongside the prose contract.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-verbatim-section-integrity.test.ts` — new — 7 test cases per the §2 implementation block (pass / drift / missing-§2 / missing-§3 / missing-§19 / framing-header-strip / first-diverging-line detail). Each test verifies a distinct invariant.
2. `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` — verify no regression after section-parser refactor (if the implementation refactors the section parser to share with the new validator) → existing test must continue to pass unchanged.

### Commands

1. `pnpm --filter @worldloom/validators test -- --grep page_plan_verbatim_section_integrity` — targeted test command.
2. `pnpm turbo test` — full-pipeline test command.
3. `pnpm turbo lint && pnpm turbo typecheck` — full-pipeline type/lint command.
4. `node tools/validators/dist/cli/run-validator.js page_plan_verbatim_section_integrity --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` — manual smoke against an existing plan (exact CLI form to confirm at coding time from the package's existing validator-runner conventions).
