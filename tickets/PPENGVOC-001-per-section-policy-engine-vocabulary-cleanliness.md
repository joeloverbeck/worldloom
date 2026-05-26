# PPENGVOC-001: Per-section policy in page_plan_body_engine_vocabulary_cleanliness

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts`, updates `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts`. No skill, hook, or schema changes.
**Deps**: None

## Problem

The `page_plan_body_engine_vocabulary_cleanliness` validator currently flags any record-id-shaped token (and any schema-field-name literal) outside `§2 / §3 / §15 / §19 / §16a-Current-state-grounding-records-line` as engine-vocabulary leakage. With ≥3 hits per section the verdict is `fail`; with 1-2 hits it is `warn`. The validator's `applies_to` runs in `pre-apply` mode when `page_plan_drafts` are attached (i.e., during the dry-run that the `branching-story-turn-cycle` skill HARD-GATE clause (c) prescribes), and in `full-world` mode for audits.

Reality on the ground (verified during the PG-6 turn cycle for the `red-bunny` bundle): every page plan in the bundle (PG-1 through PG-5) trips this validator with `fail` severity in §5, §6, §7, §7a, §8, §9, §9c, §10, §10b, §13, §14, and several prose-facing sections. The pages were committed anyway because the submit path takes no `page_plan_drafts` parameter, so `pagePlanTargets()` in `tools/validators/src/structural/page-plan-section-parser.ts:16-49` short-circuits on `ctx.run_mode === "pre-apply"` with empty drafts and the validator never reads disk. This is the asymmetry described in the PG-6 reflection: dry-run-with-drafts catches engine-vocabulary fails that submit-without-drafts never sees.

The validator's blanket scan conflates two different page-plan surfaces. The skill's templates and the shared story-state contract (`.claude/skills/_shared-templates/story-state-contract.md` §8) put record IDs in §5 (Active Cast), §6 (Affordances), §7 (Selected Event and State Delta), §7a (Turn driver / initiative trace), §8 (Required Beats), §9 (Relationship and Belief Context), §9b (Active Actor Plans), §9c (Emotional Causality), §10 (Open Obligations / Consequences / Threads), §10b (Open Setups / Active Clocks / Hidden Secrets), §13 (Next Choices), and §14 (Recent Prose Continuity, which references the prior page's rendered-prose file by ID) — these are engine-output sections whose grounding-by-record-id is their load-bearing function. The validator treats them as if they were renderer-facing prose, which is what §1 (Story Kernel Excerpt), §4 (Relevant World-Canon Excerpt), §11 (Forbidden Mystery Resolutions), §12 (Stopping Point), §17 (Style and Register Notes), and §18 (Anti-Pathology Checklist) actually are.

## Assumption Reassessment (2026-05-27)

1. `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts:12` declares `EXCLUDED_SECTION_NUMBERS = new Set(["2", "3", "15", "19"])` and `SECTION_16A = "16a"`. Lines 102-129 (`scanSection`) skip `RECORD_ID_PATTERN` scanning whenever `section.number === "16a"`, and skip all scans on the §16a `Current-state grounding records:` line. Every other non-excluded section gets the full record-id + schema-field + predicate-DSL scan with no per-section policy.

2. `tools/validators/src/structural/_engine-vocabulary-tokens.ts` defines `RECORD_ID_PREFIXES` (44 prefixes including `PG`, `SE`, `BEL`, `SF`, `STENT`, `STINT`, `STEMO`, `STCHAR`, `THR`, `SREL`, `CLK`, `STSEC`, `STQ`, `OBL`, `CNSQ`, `SLT`, `CHC`, `STOBJ`, `STLOC`, `DA`, `M`, `CF`, `CH`, `INV`, `ENT`, `SEC`, `CHAR`, `SAU`, `SP`, `RSP`, `SLB`, `PA`, etc.). `RECORD_ID_PATTERN` is `\b(<prefix>)-[0-9]+\b`. `SCHEMA_FIELD_NAME_LITERALS` (24 entries) includes `supersedes`, `derived_from`, `state_delta`, `outcome_route`, `state_snapshot` — common English vocabulary the operator naturally uses to describe state transitions. `PREDICATE_DSL_TERM_LITERALS` (29 entries) all end in `(` and would only appear in prose by deliberate paste.

3. `.claude/skills/_shared-templates/story-state-contract.md` §8 (the canonical page-plan structure contract) and the `branching-story-turn-cycle` SKILL.md Phase 7 reference numbered sections §1 through §19 plus optional §9b / §9c / §10b / §16a. The §16a STCHAR packet structure explicitly lists `Current-state grounding records: <comma-separated record IDs>` as a load-bearing operator surface. The §7 / §7a tables are documented to enumerate `SE.state_delta` and turn-driver records by ID. The §10 / §10b / §13 tables are documented to enumerate active OBL / CNSQ / THR / STQ / CLK / STSEC / CHC records by ID. The skill's intended convention places record IDs in these sections; the validator works against the convention.

4. `docs/FOUNDATIONS.md` line 430 (Rule 1 clarification): "A plan IS load-bearing engine output. ... Producing a plan without yet-rendered prose satisfies Rule 1, because the plan's frontmatter declares affordances, intended beats, stop conditions, and `forbidden_resolutions[]` with explicit consequences and prerequisites — the rule's grounding requirements apply to the plan as engine artifact independent of whether prose has yet been rendered." FOUNDATIONS §Story Bundles §4a (line 616): "The plan is engine-readable and validation-bearing — its frontmatter declares affordances, intended beats, stop conditions, and `forbidden_resolutions[]`; its body inlines all canonical context the external renderer needs." Engine output uses engine vocabulary (record IDs); this is the FOUNDATIONS-aligned position.

5. `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` has tests that deliberately put record IDs (STINT-4, STEMO-5, BEL-9) in §7 ("Selected Event and State Delta") and assert that ≥3 such tokens fail. Those tests bake the current blanket policy into the test suite. The per-section policy this ticket introduces will require updating those §7 tests (record IDs in §7 must no longer trigger any verdict).

6. The validator's `severity_mode` is `fail` and the verdict's instance-severity is computed at line 55: `hits.length >= 3 ? "fail" : "warn"`. `severity === "fail"` is the gate `tools/world-mcp/src/tools/submit-patch-plan.ts:54` uses to block submission. The same gate applies to `tools/world-mcp/src/tools/validate-patch-plan.ts:92`. Lowering or relaxing per-section behavior here does not affect that gate's mechanism.

7. Existing bundle pages (PG-1–PG-5 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/`) trip the validator under audit, surfaced as `severity: fail` items in the `get_context_packet` `open_risks` list. This ticket reduces those fails to the prose-facing-section subset; the engine-section fails go away. No change to grandfathered §3/§19 verbatim-drift status (GF-PROSESPLIT2-006-001) is intended here; that drift remains a separate concern covered by PPCANONINL-001.

8. Adjacent contradiction surfaced during reassessment: `SCHEMA_FIELD_NAME_LITERALS` includes `supersedes` and `derived_from`, both of which the operator naturally uses as English verbs / nouns when describing state transitions in engine sections ("THR-7 supersedes THR-6", "BEL-16 derived_from the disclosure event"). The schema-field scan in engine sections produces false positives. **Classification**: required consequence of this ticket — engine sections must also skip `SCHEMA_FIELD_NAME_LITERALS` scanning, because the operator's natural English overlaps with the schema-field vocabulary in load-bearing ways. Predicate-DSL terms (all ending in `(`) do NOT overlap with natural English; the predicate-DSL scan keeps running in engine sections.

## Architecture Check

1. The fix is additive and per-section: introduce `ENGINE_SECTION_NUMBERS` alongside the existing `EXCLUDED_SECTION_NUMBERS` and `SECTION_16A`. Engine sections skip the `RECORD_ID_PATTERN` scan and the `SCHEMA_FIELD_NAME_LITERALS` scan, but KEEP the `PREDICATE_DSL_TERM_LITERALS` scan. Prose-facing sections keep the full scan. The existing §16a special case (record_id skip for all of §16a; full skip on the `Current-state grounding records:` line) is preserved verbatim.

2. The alternative — relaxing the validator globally (e.g., raise the hit threshold from 3 to 10) — would weaken the leakage catch in actual prose-facing sections like §1, §11, §14, §17, §18 where the validator does correct work today. Per-section policy preserves the catch where it matters.

3. The alternative — rewriting all skill templates to use display names in §5-§13 — would weaken Rule 1's "plan IS engine output" stance. The §7 table that says `STEMO-11 → STEMO-13` is direct, machine-parseable, and FOUNDATIONS-aligned. A version that says "Jon's probed-response desire becomes his disclosed-confession-bearing desire" is renderer-facing prose and loses the engine grounding. Rejected.

4. The alternative — documenting the dry-run/submit asymmetry as the intended behavior — would normalize a path that lets ill-formed page plans land on disk. Rejected. The submit path SHOULD enforce page-plan-content validation; that is a separate ticket (`submit-runs-page-plan-validators`, not in scope here) but this ticket's per-section policy is the prerequisite for that future tightening.

5. No backwards-compatibility shim. The change is purely a per-section policy refinement in one validator. Test updates remove pre-existing assertions that encoded the now-relaxed §7 behavior. Existing committed page plans (PG-1–PG-5) become less noisy in `get_context_packet` `open_risks` but no record changes.

## Verification Layers

1. `ENGINE_SECTION_NUMBERS` set is added to `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` and exported for test imports → codebase grep-proof (`grep -n "ENGINE_SECTION_NUMBERS" tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts`).
2. The validator skips `RECORD_ID_PATTERN` and `SCHEMA_FIELD_NAME_LITERALS` scanning in engine sections; still scans `PREDICATE_DSL_TERM_LITERALS` everywhere outside the existing §16a current-state-grounding-line exemption → unit test in `page-plan-body-engine-vocabulary-cleanliness.test.ts` with a §7 body containing 5 record IDs and 1 schema-field literal asserts zero verdicts; same body containing a `pred:` token asserts a 1-hit warn.
3. Prose-facing sections (§1, §4, §11, §12, §17, §18) still flag record IDs at the existing thresholds → unit test in the same file with 3 record IDs in §1 asserts a `severity: fail` verdict; 1 record ID in §1 asserts a `warn`.
4. `npm test` from `tools/validators` passes → full-pipeline verification command.
5. Re-validating the PG-6 envelope from PG-6 turn cycle (`/tmp/red-bunny-pg-6-envelope.json` with the on-disk `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-6.md` as the draft) shows `status: pass` with `severity: fail` items only from genuinely prose-facing sections (if any remain after operator rewrite per BSTC16ADOC-001) → skill dry-run.
6. FOUNDATIONS alignment check: Rule 1 clarification (line 430) and §Story Bundles §4a (line 616) both name the plan as engine artifact; this validator change keeps the engine-vocabulary catch on renderer-facing sections (§1, §4, §11, §12, §17, §18) while permitting the load-bearing engine vocabulary in engine-output sections (§5–§13, §14, §16a).

## What to Change

### 1. Add `ENGINE_SECTION_NUMBERS` and per-section policy in `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts`

At the top of the file alongside the existing `EXCLUDED_SECTION_NUMBERS`:

```ts
const EXCLUDED_SECTION_NUMBERS = new Set(["2", "3", "15", "19"]);
const ENGINE_SECTION_NUMBERS = new Set([
  "5",   // Active Cast and Entity Statuses
  "6",   // Current Location and Affordances
  "7",   // Selected Event and State Delta
  "7a",  // Turn driver / initiative trace
  "8",   // Required Beats from the Selected Commitment Block
  "9",   // Relationship and Belief Context
  "9b",  // Active Actor Plans
  "9c",  // Emotional Causality / Affective Transition
  "10",  // Open Obligations, Consequences, and Threads
  "10b", // Open Setups, Active Clocks, Hidden Secrets
  "13",  // Next Choices to Foreshadow or Make Available
  "14"   // Recent Prose Continuity (references prior page's rendered-prose file by id)
]);
const SECTION_16A = "16a";
```

In `scanSection` (lines 102-129), replace the existing scan logic:

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
- `EXCLUDED_SECTION_NUMBERS` (§2/§3/§15/§19): unchanged — section is skipped entirely by the `parseSections` filter at line 48.
- `ENGINE_SECTION_NUMBERS` (§5/§6/§7/§7a/§8/§9/§9b/§9c/§10/§10b/§13/§14): skip record-id and schema-field scans; keep predicate-DSL scan.
- §16a: existing behavior — skip record-id everywhere; the `Current-state grounding records:` line skips all scans; non-grounding lines run schema-field and predicate-DSL scans.
- Other body sections (§1/§4/§11/§12/§17/§18): unchanged — full record-id + schema-field + predicate-DSL scan.

### 2. Update the suggested_fix wording in the verdict

The current `suggested_fix` at lines 73-75 says "Move engine-readable IDs, schema fields, hashes, and predicate DSL terms into §15 frontmatter or translate them into renderer-facing prose." Reword for the new policy:

```ts
suggested_fix: section.number === SECTION_16A
  ? "Keep §16a current-state IDs only in the `Current-state grounding records:` field and translate schema or predicate vocabulary into renderer-facing prose elsewhere in the packet."
  : "Move engine-readable IDs into §15 frontmatter or one of the engine-output sections (§5/§6/§7/§7a/§8/§9/§9b/§9c/§10/§10b/§13/§14/§16a); translate schema-field literals or predicate DSL terms into renderer-facing prose for this prose-facing section."
```

### 3. Update tests in `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts`

The current tests at lines 22-50 deliberately put record IDs (STINT-4, STEMO-5, BEL-9) in §7 and assert fail/warn verdicts. Under the new policy those tests should assert zero verdicts. Replace those §7-targeted tests with §1-targeted analogues (record IDs in §1 — a prose-facing section — should still trip the validator). Add new tests:

- "engine section §7 with 5 record IDs and 1 schema-field literal yields zero verdicts" — exercises the new exemption.
- "engine section §7 with a `pred:` token yields 1-hit warn" — predicate-DSL scan still runs in engine sections.
- "engine section §16a non-grounding line with a schema-field literal still yields a verdict" — existing §16a behavior unchanged.
- "prose section §1 with 3 record IDs yields a fail" — prose-facing-section catch preserved.
- "prose section §1 with 1 record ID yields a warn" — warn threshold preserved.

Existing tests that target §16a current-state-grounding-line behavior, §16a non-grounding behavior, and the verdict-line-range / hit-detail shape stay untouched.

## Files to Touch

- `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` (modify)
- `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` (modify)

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
8. Skill dry-run: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts /tmp/pg-6-drafts.json /tmp/red-bunny-pg-6-envelope.json` against the PG-6 envelope and on-disk PG-6.md draft from the PG-6 turn cycle no longer reports `severity: fail` for §5, §6, §7, §7a, §8, §9, §10, §13, or §14 of the engine-vocabulary validator. Any remaining fails come only from prose-facing sections (§1, §4, §11, §12, §14, §17, §18) where the operator's plan content actually leaked IDs.

### Invariants

1. `ENGINE_SECTION_NUMBERS` is a closed set that exactly matches the page-plan-section taxonomy in `.claude/skills/_shared-templates/story-state-contract.md` §8 engine-output sections, plus §14 (Recent Prose Continuity). Any new section number added in a future contract amendment must be reviewed against this taxonomy before being added to either set.
2. The validator continues to scan `PREDICATE_DSL_TERM_LITERALS` in every section that is not in `EXCLUDED_SECTION_NUMBERS` and that is not the §16a current-state-grounding line. Predicate DSL terms (e.g., `any_belief(`, `clock_at_least(`) never appear in renderer-facing prose; the validator must keep that catch universal.
3. The §16a current-state-grounding-line full-skip behavior at `page-plan-body-engine-vocabulary-cleanliness.ts:106` is preserved.
4. Aligns with `docs/FOUNDATIONS.md` line 430 (Rule 1 clarification — plan IS engine output) and §Story Bundles §4a (line 616 — plan body inlines canonical context the renderer needs).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` — modify existing §7-targeted fail/warn tests to assert zero verdicts (the policy change); add new tests per the Acceptance Criteria list.

### Commands

1. `cd tools/validators && npm test --silent -- --test-name-pattern "page_plan_body_engine_vocabulary_cleanliness"` — targeted validator test run.
2. `cd tools/validators && npm test && npm run build` — full validator package check (test + typecheck-via-build).
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts /tmp/pg-6-drafts.json /tmp/red-bunny-pg-6-envelope.json 2>/dev/null | jq '[.verdicts[] | select(.severity == "fail") | .validator] | unique'` — replays the PG-6 dry-run; after the fix lands, `page_plan_body_engine_vocabulary_cleanliness` should no longer appear in the unique fail-validator list (or should appear only with fails attributable to prose-facing sections, separately tracked).
