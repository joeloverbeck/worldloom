# SPEC38STOLOCDIE-012: New rule validator `prose_load_bearing_artifact_mention`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new rule validator at `tools/validators/src/rules/rule_prose_load_bearing_artifact_mention.ts` + paired test + registration in `tools/validators/src/public/registry.ts` + registry-test assertion update
**Deps**: None

## Problem

Prose-attach (ticket 006 amendment) needs pattern-detection logic to catch rendered prose that mentions a load-bearing artifact (letter, map, diary, decree, log, recording, inscription, confession, notice, ledger, transcript, briefing, proclamation, seal, codex, marginalia, redaction, etc.) without a corresponding DA in `PG.state_snapshot.active_records.DA[]`. Without a validator, prose-attach's existing `invented_structural_fact` check catches only explicit record-id references — narrative phrasings like "a letter arrived bearing the king's seal" or "she unfolded the map" slip through. This ticket lands the rule validator that ticket 006 consumes.

## Assumption Reassessment (2026-05-17)

1. Verified codebase has analogous rule validators at `tools/validators/src/rules/rule_<snake>.ts` (per `rule_choice_set_noncollapse.ts` and `rule_storylet_predicate_dsl_parsability.ts`). Registry seam: import block at `registry.ts` lines 28-31, `ruleValidators` array at lines 62-73. Registry test at `tools/validators/tests/rules/registry.test.ts` asserts the exact name list. Test path: `tools/validators/tests/rules/rule_<snake>.test.ts`.
2. Verified SPEC-38 §D12 prescribes the validator with WARN-default-FAIL-on-quotation severity split. Filename in spec is `prose-load-bearing-artifact-mention.ts`; codebase convention for non-numbered rules is `rule_<snake>.ts` — mechanical-drift correction propagated silently per `/spec-to-tickets` §Codebase truth guardrail (corrected path: `rule_prose_load_bearing_artifact_mention.ts`; corrected test path: same). Pattern noun list per §D12 is the v1 baseline; extensible per §Risks #4.
3. Cross-skill boundary: this validator is consumed by `branching-story-prose-attach` Phase 3 new sub-section (ticket 006). The verdict code `prose_load_bearing_artifact_mention_without_da` must match the name ticket 006 cites. Registry surface + registry test updated atomically.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §4a Plan-Authority Boundary (FOUNDATIONS.md line 590 — *"Rendered prose is a rendering of that state, not a second state engine"*). Prose-introduced load-bearing artifacts directly violate the boundary: the prose introduces structural fact (a load-bearing artifact in the narrative) that page-plan state did not author. Rule 1 No Floating Facts: load-bearing prose mentions without state-record backing are floating facts in prose.
5. HARD-GATE / canon-write ordering: this ticket adds a NEW rule validator under `tools/validators/src/rules/`. Per the validator-modification-gates-canon-write rule, rule validators gate canon and story-bundle record writes at engine pre-apply time. The validator emits WARN by default (heuristic pattern-matching with false-positive risk per §Risks #6) and FAIL when the prose explicitly quotes the artifact content (highest-confidence escalation). Confirmed the validator STRENGTHENS the plan-authority firewall (catches prose-introduced structural facts that `invented_structural_fact` misses) — it does NOT weaken the Mystery Reserve firewall, does NOT silently resolve MR entries, and does NOT change any existing validator's verdict semantics.

## Architecture Check

1. New rule validator (cleaner than embedding pattern-detection in prose-attach skill prose): detection is mechanical (pattern matching + context filter + state lookup) and benefits from being unit-testable as a validator. Pattern list lives in a single constants module for extensibility per §Risks #4.
2. WARN-default-FAIL-on-quotation severity split: WARN is the conservative default given false-positive risk; FAIL escalates on quoted-content evidence (highest-confidence signal of structural-fact introduction). This calibration handle is documented in SPEC-38 §Risks #6.
3. No backwards-compatibility shims; net-new validator.

## Verification Layers

1. Validator file exists → codebase grep-proof: `test -f tools/validators/src/rules/rule_prose_load_bearing_artifact_mention.ts`.
2. Test file exists with ≥4 tests passing → `cd tools/validators && npm test`.
3. Registry import + `ruleValidators` array entry added → codebase grep-proof: `grep -n 'ruleProseLoadBearingArtifactMention' tools/validators/src/public/registry.ts` returns ≥2 matches.
4. Registry test extended to include new name → codebase grep-proof: `grep -n 'prose_load_bearing_artifact_mention' tools/validators/tests/rules/registry.test.ts` returns ≥1 match.
5. No regressions on existing suite.

## What to Change

### 1. New validator source file

Path: `tools/validators/src/rules/rule_prose_load_bearing_artifact_mention.ts`.

Behavior per SPEC-38 §D12:
- Load rendered prose at `pages-prose/PG-<integer>.md` and the corresponding PG's `state_snapshot.active_records.DA[]`.
- Scan prose tokens for load-bearing artifact noun patterns (extensible constants module): `letter, map, diary, decree, log, recording, inscription, confession, notice, ledger, transcript, briefing, proclamation, seal, codex, marginalia, redaction, warrant, testimony, missive, dispatch, manifest, charter, edict, treaty, will, oath`.
- Apply context filter: the noun must appear in a sentence that grounds knowledge / choice availability / mystery progression / character action (heuristic: action verbs near the noun like `read | quoted | cited | revealed | followed | found | discovered | unfolded | opened | sealed | hid | burned | translated | forged`, OR appearance in a paragraph naming a CHC the page emits).
- Filter out matches whose context names a DA-id explicitly OR explicitly disclaims the artifact ("not a real letter, just a metaphor").
- For each surviving match, check whether `PG.state_snapshot.active_records.DA[]` contains any DA whose `genre` or `title` plausibly matches (loose matching).
- Emit verdict `prose_load_bearing_artifact_mention_without_da`. Severity: WARN by default; FAIL when the prose explicitly quotes the artifact content (heuristic: quoted-string spans naming the artifact).

Export shape:

```ts
export const ruleProseLoadBearingArtifactMention: Validator = {
  name: "prose_load_bearing_artifact_mention",
  severity_mode: "warn", // FAIL escalation handled internally per quoted-content detection
  applies_to: (ctx) => /* prose-attach context */,
  run: async (input, ctx) => verdicts
};
```

### 2. New test file

Path: `tools/validators/tests/rules/rule_prose_load_bearing_artifact_mention.test.ts`. Minimum 4 tests per SPEC-38 §D12:

- `prose_mentions_letter_with_matching_da_passes` — prose "Rell read the letter again", PG has DA-1 with `genre: private letter`. Expect pass.
- `prose_mentions_letter_without_da_warns` — prose "Rell read the letter again", PG has no DA. Expect verdict `prose_load_bearing_artifact_mention_without_da` at WARN.
- `prose_quotes_artifact_without_da_fails` — prose contains `"By order of the River Guard, no ferry shall cross after moonrise"` styled as artifact-content, PG has no DA. Expect verdict at FAIL.
- `prose_metaphor_passes` — prose "her words were a letter to her future self", clear metaphor. Expect pass (context-filter exclusion).

### 3. Register in `tools/validators/src/public/registry.ts`

Add import alongside existing rule imports (lines 28-31 region):

```ts
import { ruleProseLoadBearingArtifactMention } from "../rules/rule_prose_load_bearing_artifact_mention.js";
```

Add to `ruleValidators` array (lines 62-73 region).

### 4. Update `tools/validators/tests/rules/registry.test.ts`

Append `"prose_load_bearing_artifact_mention"` to the existing name-list assertion, in the same order as the registry.ts array entry.

## Files to Touch

- `tools/validators/src/rules/rule_prose_load_bearing_artifact_mention.ts` (new)
- `tools/validators/tests/rules/rule_prose_load_bearing_artifact_mention.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — add import + array entry)
- `tools/validators/tests/rules/registry.test.ts` (modify — extend assertion list)

## Out of Scope

- Pattern-list extension beyond the v1 baseline (extensible per §Risks #4; future pull requests add nouns as new patterns surface in pilot bundles)
- Internationalization (worldloom is English-only per SPEC-38 §Risks #4)
- Body-similarity clustering for duplicate DAs (lives in ticket 011)
- CHC-grounding accessibility (lives in ticket 010)
- Prose-attach Phase 3 sub-section prose (lives in ticket 006 which CONSUMES this validator's verdict code)
- DA schema changes (deferred per SPEC-38 §Out of Scope)
- Quantitative tuning of WARN/FAIL escalation threshold (awaits pilot prose corpus per §Risks #6)

## Acceptance Criteria

### Tests That Must Pass

1. Validator implemented and registered.
2. All 4 minimum tests pass.
3. `cd tools/validators && npm test` produces zero regressions.
4. `tools/validators/tests/rules/registry.test.ts` includes the new name.

### Invariants

1. The validator emits WARN by default; FAIL only when prose explicitly quotes the artifact content.
2. Pattern list, context-filter heuristics, and quoted-content detection are documented inline in the validator source.
3. Verdict code `prose_load_bearing_artifact_mention_without_da` matches the name cited by ticket 006.
4. The validator does NOT mutate state — it only emits verdicts.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_prose_load_bearing_artifact_mention.test.ts` (new) — 4 tests per SPEC-38 §D12.
2. `tools/validators/tests/rules/registry.test.ts` (modify) — extend name list.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm test`
3. Targeted: `cd tools/validators && npm run build && node --test dist/tests/rules/rule_prose_load_bearing_artifact_mention.test.js`
