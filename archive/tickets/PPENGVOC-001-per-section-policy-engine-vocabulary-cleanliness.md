# PPENGVOC-001: Per-section policy in page_plan_body_engine_vocabulary_cleanliness

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts`, updates `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts`, and truths the same-seam page-plan contract prose in `.claude/skills/_shared-templates/story-state-contract.md` plus `branching-story-turn-cycle` references. No hook or schema changes.
**Deps**: None

## Problem

Before this ticket, `page_plan_body_engine_vocabulary_cleanliness` flagged any record-id-shaped token (and any schema-field-name literal) outside `§2 / §3 / §15 / §19 / §16a-Current-state-grounding-records-line` as engine-vocabulary leakage. With ≥3 hits per section the verdict was `fail`; with 1-2 hits it was `warn`. The validator's `applies_to` runs in `pre-apply` mode when `page_plan_drafts` are attached (i.e., during the dry-run that the `branching-story-turn-cycle` skill HARD-GATE clause (c) prescribes), and in `full-world` mode for audits.

At intake, every committed page plan in the `red-bunny` bundle (PG-1 through PG-5) tripped this validator with `fail` severity in §5, §6, §7, §7a, §8, §9, §9c, §10, §10b, §13, §14, and several prose-facing sections. The pages were committed anyway because the submit path takes no `page_plan_drafts` parameter, so `pagePlanTargets()` in `tools/validators/src/structural/page-plan-section-parser.ts` short-circuits on `ctx.run_mode === "pre-apply"` with empty drafts and the validator never reads disk. This is the asymmetry described in the PG-6 reflection: dry-run-with-drafts catches engine-vocabulary fails that submit-without-drafts never sees.

The pre-ticket blanket scan conflated two different page-plan surfaces. The shared story-state contract (`.claude/skills/_shared-templates/story-state-contract.md` §8) now documents §5, §6, §7, §7a, §8, §9, §9b, §9c, §10, §10b, §13, and §14 as engine-output body sections whose grounding-by-record-id is allowed when load-bearing. The validator still treats §1 (Story Kernel Excerpt), §4 (Relevant World-Canon Excerpt), §11 (Forbidden Mystery Resolutions), §12 (Stopping Point), §17 (Style and Register Notes), and §18 (Anti-Pathology Checklist) as prose-facing sections that receive the full scan.

## Assumption Reassessment (2026-05-27)

1. At intake, `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` declared `EXCLUDED_SECTION_NUMBERS = new Set(["2", "3", "15", "19"])` and `SECTION_16A = "16a"`. `scanSection` skipped `RECORD_ID_PATTERN` scanning whenever `section.number === "16a"`, and skipped all scans on the §16a `Current-state grounding records:` line. Every other non-excluded section got the full record-id + schema-field + predicate-DSL scan with no per-section policy.

2. `tools/validators/src/structural/_engine-vocabulary-tokens.ts` defines `RECORD_ID_PREFIXES` (44 prefixes including `PG`, `SE`, `BEL`, `SF`, `STENT`, `STINT`, `STEMO`, `STCHAR`, `THR`, `SREL`, `CLK`, `STSEC`, `STQ`, `OBL`, `CNSQ`, `SLT`, `CHC`, `STOBJ`, `STLOC`, `DA`, `M`, `CF`, `CH`, `INV`, `ENT`, `SEC`, `CHAR`, `SAU`, `SP`, `RSP`, `SLB`, `PA`, etc.). `RECORD_ID_PATTERN` is `\b(<prefix>)-[0-9]+\b`. `SCHEMA_FIELD_NAME_LITERALS` (24 entries) includes `supersedes`, `derived_from`, `state_delta`, `outcome_route`, `state_snapshot` — common English vocabulary the operator naturally uses to describe state transitions. `PREDICATE_DSL_TERM_LITERALS` (29 entries) all end in `(` and would only appear in prose by deliberate paste.

3. `.claude/skills/_shared-templates/story-state-contract.md` §8 (the canonical page-plan structure contract) and the `branching-story-turn-cycle` SKILL.md Phase 7 reference name the page-plan sections §1 through §19 plus optional §9b / §9c / §10b / §16a. The §16a STCHAR packet structure explicitly lists `Current-state grounding records: <comma-separated record IDs>` as a load-bearing operator surface. The §7 / §7a tables are documented to enumerate `SE.state_delta` and turn-driver records by ID. The §10 / §10b / §13 tables are documented to enumerate active OBL / CNSQ / THR / STQ / CLK / STSEC / CHC records by ID. The skill's intended convention places record IDs in these sections; the pre-ticket validator worked against the convention.

4. `docs/FOUNDATIONS.md` Rule 1 clarification says a plan is load-bearing engine output, and FOUNDATIONS §Story Bundles §4a says the plan is engine-readable and validation-bearing. Engine output uses engine vocabulary (record IDs); this is the FOUNDATIONS-aligned position.

5. At intake, `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` had tests that deliberately put record IDs (STINT-4, STEMO-5, BEL-9) in §7 ("Selected Event and State Delta") and asserted that >=3 such tokens failed. Those tests baked the old blanket policy into the test suite. The landed per-section policy updates those tests so record IDs in §7 no longer trigger a verdict.

6. The validator's `severity_mode` is `fail` and the verdict's instance-severity is computed as `hits.length >= 3 ? "fail" : "warn"`. `severity === "fail"` is the gate `tools/world-mcp/src/tools/submit-patch-plan.ts` uses to block submission. The same gate applies to `tools/world-mcp/src/tools/validate-patch-plan.ts`. Lowering or relaxing per-section behavior here does not affect that gate's mechanism.

7. At intake, existing bundle pages (PG-1-PG-5 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/`) tripped the validator under audit, surfaced as `severity: fail` items in the `get_context_packet` `open_risks` list. This ticket reduces those failures to the prose-facing-section subset; the engine-section failures go away. No change to grandfathered §3/§19 verbatim-drift status (GF-PROSESPLIT2-006-001) is intended here; that drift remains a separate concern covered by PPCANONINL-001.

8. Adjacent contradiction surfaced during reassessment: `SCHEMA_FIELD_NAME_LITERALS` includes `supersedes` and `derived_from`, both of which the operator naturally uses as English verbs / nouns when describing state transitions in engine sections ("THR-7 supersedes THR-6", "BEL-16 derived_from the disclosure event"). The schema-field scan in engine sections produces false positives. **Classification**: required consequence of this ticket — engine sections must also skip `SCHEMA_FIELD_NAME_LITERALS` scanning, because the operator's natural English overlaps with the schema-field vocabulary in load-bearing ways. Predicate-DSL terms (all ending in `(`) do NOT overlap with natural English; the predicate-DSL scan keeps running in engine sections.

9. Live same-seam docs contradicted the intended validator policy: `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` still described the old "engine terms only in §15 / §16a grounding" rule. **Classification**: required consequence of this ticket — these contract surfaces document the validator's authoring boundary, so they move with the code/test change. Historical triage reports under `docs/triage/` remain provenance and are not operational guidance.

## Architecture Check

1. The fix is additive and per-section: introduce `ENGINE_SECTION_NUMBERS` alongside the existing `EXCLUDED_SECTION_NUMBERS` and `SECTION_16A`. Engine sections skip the `RECORD_ID_PATTERN` scan and the `SCHEMA_FIELD_NAME_LITERALS` scan, but KEEP the `PREDICATE_DSL_TERM_LITERALS` scan. Prose-facing sections keep the full scan. The existing §16a special case (record_id skip for all of §16a; full skip on the `Current-state grounding records:` line) is preserved verbatim.

2. The alternative — relaxing the validator globally (e.g., raise the hit threshold from 3 to 10) — would weaken the leakage catch in actual prose-facing sections like §1, §4, §11, §12, §17, and §18 where the validator does correct work today. Per-section policy preserves the catch where it matters.

3. The alternative — rewriting all skill templates to use display names in §5-§13 — would weaken Rule 1's "plan IS engine output" stance. The §7 table that says `STEMO-11 -> STEMO-13` is direct, machine-parseable, and FOUNDATIONS-aligned. A version that says "Jon's probed-response desire becomes his disclosed-confession-bearing desire" is renderer-facing prose and loses the engine grounding. Rejected.

4. The alternative — documenting the dry-run/submit asymmetry as the intended behavior — would normalize a path that lets ill-formed page plans land on disk. Rejected. The submit path SHOULD enforce page-plan-content validation; that is a separate ticket (`submit-runs-page-plan-validators`, not in scope here) but this ticket's per-section policy is the prerequisite for that future tightening.

5. No backwards-compatibility shim. The change is purely a per-section policy refinement in one validator. Test updates remove pre-existing assertions that encoded the now-relaxed §7 behavior. Existing committed page plans (PG-1–PG-5) become less noisy in `get_context_packet` `open_risks` but no record changes.

## Verification Layers

1. `ENGINE_SECTION_NUMBERS` set is added to `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` and exported for test imports → codebase grep-proof (`grep -n "ENGINE_SECTION_NUMBERS" tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts`).
2. The validator skips `RECORD_ID_PATTERN` and `SCHEMA_FIELD_NAME_LITERALS` scanning in engine sections; still scans `PREDICATE_DSL_TERM_LITERALS` everywhere outside the existing §16a current-state-grounding-line exemption → unit test in `page-plan-body-engine-vocabulary-cleanliness.test.ts` with a §7 body containing 5 record IDs and 1 schema-field literal asserts zero verdicts; same body containing a `pred:` token asserts a 1-hit warn.
3. Prose-facing sections (§1, §4, §11, §12, §17, §18) still flag record IDs at the existing thresholds → unit test in the same file with 3 record IDs in §1 asserts a `severity: fail` verdict; 1 record ID in §1 asserts a `warn`.
4. Same-seam skill contract prose documents the same per-section policy → manual review plus stale-anchor grep over the shared story-state contract and turn-cycle references.
5. `npm test` from `tools/validators` passes → full-pipeline verification command.
6. Re-validating the PG-6 envelope from PG-6 turn cycle (`/tmp/red-bunny-pg-6-envelope.json` with `/tmp/pg-6-drafts.json`) shows `page_plan_body_engine_vocabulary_cleanliness` no longer contributes fail verdicts for engine-output sections; any remaining failures are classified by section → CLI dry-run.
7. FOUNDATIONS alignment check: Rule 1 clarification and §Story Bundles §4a both name the plan as engine artifact; this validator change keeps the engine-vocabulary catch on renderer-facing sections (§1, §4, §11, §12, §17, §18) while permitting the load-bearing engine vocabulary in engine-output sections (§5-§13, §14, §16a).

## Landed Changes

### 1. Added `ENGINE_SECTION_NUMBERS` and per-section policy in `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts`

At the top of the file alongside the existing `EXCLUDED_SECTION_NUMBERS`:

```ts
const EXCLUDED_SECTION_NUMBERS = new Set(["2", "3", "15", "19"]);
export const ENGINE_SECTION_NUMBERS = new Set([
  "5",
  "6",
  "7",
  "7a",
  "8",
  "9",
  "9b",
  "9c",
  "10",
  "10b",
  "13",
  "14"
]);
const SECTION_16A = "16a";
```

`scanSection` now uses this policy:

```ts
function scanSection(section: Section): Hit[] {
  const hits: Hit[] = [];
  const isEngineSection = ENGINE_SECTION_NUMBERS.has(section.number);
  section.lines.forEach((line, offset) => {
    const lineNumber = section.startLine + offset;
    const isCurrentStateGrounding = section.number === SECTION_16A && CURRENT_STATE_GROUNDING_LINE.test(line);
    const skipRecordIdScan = section.number === SECTION_16A || isEngineSection;
    const skipSchemaFieldScan = isCurrentStateGrounding || isEngineSection;
    if (!skipRecordIdScan && !isCurrentStateGrounding) {
      for (const match of line.matchAll(RECORD_ID_PATTERN)) {
        if (match[0]) {
          hits.push({ token: match[0], token_class: "record_id", line: lineNumber });
        }
      }
    }
    if (isCurrentStateGrounding) {
      return;
    }
    if (!skipSchemaFieldScan) {
      for (const token of SCHEMA_FIELD_NAME_LITERALS) {
        if (line.includes(token)) {
          hits.push({ token, token_class: "schema_field", line: lineNumber });
        }
      }
    }
    for (const token of PREDICATE_DSL_TERM_LITERALS) {
      if (line.includes(token)) {
        hits.push({ token, token_class: "predicate_dsl", line: lineNumber });
      }
    }
  });
  return hits;
}
```

Net effect per section type:
- `EXCLUDED_SECTION_NUMBERS` (§2/§3/§15/§19): unchanged — section is skipped by the `validatePlan` loop before scanning.
- `ENGINE_SECTION_NUMBERS` (§5/§6/§7/§7a/§8/§9/§9b/§9c/§10/§10b/§13/§14): skip record-id and schema-field scans; keep predicate-DSL scan.
- §16a: existing behavior — skip record-id everywhere; the `Current-state grounding records:` line skips all scans; non-grounding lines run schema-field and predicate-DSL scans.
- Other body sections (§1/§4/§11/§12/§17/§18): unchanged — full record-id + schema-field + predicate-DSL scan.

### 2. Updated the suggested_fix wording in the verdict

The `suggested_fix` now names engine-output sections as lawful locations for engine-readable IDs and keeps schema-field / predicate DSL cleanup guidance for prose-facing sections:

```ts
suggested_fix: section.number === SECTION_16A
  ? "Keep §16a current-state IDs only in the `Current-state grounding records:` field and translate schema or predicate vocabulary into renderer-facing prose elsewhere in the packet."
  : "Move engine-readable IDs into §15 frontmatter or one of the engine-output sections (§5/§6/§7/§7a/§8/§9/§9b/§9c/§10/§10b/§13/§14/§16a); translate schema-field literals or predicate DSL terms into renderer-facing prose for this prose-facing section."
```

### 3. Updated tests in `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts`

The old §7 fail/warn expectations were replaced with §1 prose-facing warn/fail tests and focused engine-section tests:

- "engine section §7 with 5 record IDs and 1 schema-field literal yields zero verdicts" — exercises the new exemption.
- "engine section §7 with a `pred:` token yields 1-hit warn" — predicate-DSL scan still runs in engine sections.
- "engine section §16a non-grounding line with a schema-field literal still yields a verdict" — existing §16a behavior unchanged.
- "prose section §1 with 3 record IDs yields a fail" — prose-facing-section catch preserved.
- "prose section §1 with 1 record ID yields a warn" — warn threshold preserved.

Existing tests that target §16a current-state-grounding-line behavior, §16a non-grounding behavior, and hit-detail shape remain covered.

### 4. Truthed same-seam page-plan contract prose

`.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`, and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` now describe the same per-section validator policy: engine-output sections allow load-bearing record IDs and schema-field vocabulary, predicate DSL terms remain scanned, prose-facing sections retain the full engine-vocabulary scan, and §16a preserves the current-state-grounding exemption.

## Files to Touch

- `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` (modify)
- `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify)

## Out of Scope

- Removing or relaxing the `SCHEMA_FIELD_NAME_LITERALS` list itself. The list captures real schema-field leakage in prose-facing sections; the per-section policy is the right mechanism, not a list edit. Adding or removing schema field names is a separate concern.
- Tightening the submit path to run page-plan-content validators when no `page_plan_drafts` are attached. That is the deeper structural fix for the dry-run/submit asymmetry and depends on this ticket landing first (so the submit-path validators do not block all in-flight authoring); track separately.
- Rewriting PG-1 through PG-5 in the `red-bunny` bundle to clean up the prose-facing-section fails that remain after this ticket lands. Those plans were authored before this discipline was formalized; they remain grandfathered by GF-PROSESPLIT2-006-001 for §3/§19 verbatim drift, and the remaining engine-vocabulary fails on prose-facing sections become surfaceable but non-blocking under audit.
- Any change to `EXCLUDED_SECTION_NUMBERS` (§2/§3/§15/§19), the `SECTION_16A` special case, or the verbatim-section-integrity validator (`page_plan_verbatim_section_integrity`). These surfaces are unchanged by this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test: §7 body containing 5 record IDs and 1 schema-field literal (`supersedes`) returns zero verdicts.
2. New unit test: §7 body containing 1 `pred:` token returns 1 verdict with `severity: warn` and `token_class: "predicate_dsl"`.
3. New unit test: §16a non-grounding-line body with 1 schema-field literal returns 1 verdict (existing §16a behavior preserved).
4. New unit test: §1 body with 3 record IDs returns 1 verdict with `severity: fail` (prose-facing catch preserved).
5. New unit test: §1 body with 1 record ID returns 1 verdict with `severity: warn`.
6. `npm test` passes from `tools/validators` (the full validator-package test suite, including the page-plan-body-engine-vocabulary-cleanliness test file).
7. `npm run build` passes from `tools/validators` (the package-local TypeScript compile lane).
8. CLI dry-run: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts /tmp/pg-6-drafts.json /tmp/red-bunny-pg-6-envelope.json` against the PG-6 envelope no longer reports `severity: fail` for §5, §6, §7, §7a, §8, §9, §10, §13, or §14 of the engine-vocabulary validator. Any remaining fails come only from prose-facing sections (§1, §4, §11, §12, §17, §18) where the operator's plan content actually leaked IDs.
9. Same-seam story-state and turn-cycle guidance describes the same per-section policy as the validator.

### Invariants

1. `ENGINE_SECTION_NUMBERS` is a closed set that exactly matches the page-plan-section taxonomy in `.claude/skills/_shared-templates/story-state-contract.md` §8 engine-output sections, plus §14 (Recent Prose Continuity). Any new section number added in a future contract amendment must be reviewed against this taxonomy before being added to either set.
2. The validator continues to scan `PREDICATE_DSL_TERM_LITERALS` in every section that is not in `EXCLUDED_SECTION_NUMBERS` and that is not the §16a current-state-grounding line. Predicate DSL terms (e.g., `any_belief(`, `clock_at_least(`) never appear in renderer-facing prose; the validator must keep that catch universal.
3. The §16a current-state-grounding-line full-skip behavior at `page-plan-body-engine-vocabulary-cleanliness.ts:106` is preserved.
4. Aligns with `docs/FOUNDATIONS.md` Rule 1 clarification ("plan IS load-bearing engine output") and §Story Bundles §4a (plan body inlines canonical context the renderer needs).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` — replace the old §7 fail/warn expectations with engine-section allowance tests, predicate-DSL rejection in §7, prose-facing §1 warn/fail tests, and the exported engine-section policy witness.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.js` — targeted validator test run from freshly compiled output.
2. `cd tools/validators && npm test && npm run build` — full validator package check (test + typecheck-via-build).
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts /tmp/pg-6-drafts.json /tmp/red-bunny-pg-6-envelope.json` — replayed the PG-6 dry-run; `page_plan_body_engine_vocabulary_cleanliness` did not report engine-section fail verdicts.

## Outcome

Implemented the per-section validator policy. `ENGINE_SECTION_NUMBERS` now covers §5, §6, §7, §7a, §8, §9, §9b, §9c, §10, §10b, §13, and §14. Those sections skip record-id and schema-field scans while retaining predicate-DSL scanning. §16a keeps its existing record-id exemption and full skip on the `Current-state grounding records:` line. Prose-facing sections retain the full scan and the existing warn/fail thresholds.

The focused tests now prove engine-section record IDs and schema-field literals are accepted, predicate DSL is still warned in §7, §16a non-grounding schema/predicate behavior is unchanged, and §1 prose-facing record IDs still warn/fail. Same-seam story-state and turn-cycle guidance now documents the same policy as the validator.

## Verification Result

1. Baseline before edits: `cd tools/validators && npm test` passed with 1090 tests passing.
2. `cd tools/validators && npm run build` passed.
3. `cd tools/validators && node --test dist/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.js` passed with 9 tests passing.
4. `cd tools/validators && npm test` passed with 1093 tests passing.
5. Final `cd tools/validators && npm run build` passed.
6. `grep -n "ENGINE_SECTION_NUMBERS" tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` found the exported set and the `scanSection` use.
7. Stale-anchor grep over `.claude/skills/_shared-templates/story-state-contract.md` and the two `branching-story-turn-cycle` references found no remaining old operational phrasing for the old §15/§16a-only allow-list.
8. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts /tmp/pg-6-drafts.json /tmp/red-bunny-pg-6-envelope.json` exited 1 because the historical envelope is stale against current `red-bunny` state, but the target validator reported `validators_run[].status: "pass"`. The only `page_plan_body_engine_vocabulary_cleanliness` verdict was a §7 `relationship_axis(` predicate-DSL `warn`, proving the intended retained scan rather than the retired engine-section record-id/schema-field fails.

## Deviations

- Same-seam skill/reference prose was added to the touched file set during reassessment because the live contract still described the retired "engine terms only in §15 / §16a grounding" policy. Historical triage reports under `docs/triage/` were left unchanged as provenance.
- The PG-6 replay is not a clean full-envelope pass. It still fails on stale historical-envelope issues outside this ticket: existing story-state target IDs, `id_allocation_race`, and §19 verbatim drift. This ticket accepts the replay only as a targeted validator witness for `page_plan_body_engine_vocabulary_cleanliness`.
