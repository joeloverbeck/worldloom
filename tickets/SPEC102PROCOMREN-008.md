# SPEC102PROCOMREN-008: Prompt lint module

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/prompt/lint.ts` plus tests. No impact on existing code paths.
**Deps**: 002

## Problem

The compose pipeline (ticket 007) and the prompt-preview UI (ticket 013) consume a single lint pass over the assembled Markdown to surface hard-fail (structural input-presence) and soft-fail (conservative denylist) violations before the author copies the prompt. The lint module enforces the SPEC-102 §Scope item 4 rule set: moment-directive presence, content-policy byte-equality with `docs/prose-renderer-contract/content-policy.md`, selected-cast-exists, selected-records-exist, no Manual Studio internal record IDs in the body, no engine jargon (closed denylist), no schema/validator/patch/lifecycle terms (closed denylist), no Worldloom-specific record-class vocabulary in narrator voice. Hard findings block the Copy button; soft findings show "copy anyway?" override.

## Assumption Reassessment (2026-05-30)

1. Verified `tools/manual-story-studio/src/prompt/lint.ts` does not exist. The lint-finding shape (`PromptLintFinding` with closed `tier: "hard" | "soft"` enum), the lint-result shape (`PromptLintResult` with `findings: PromptLintFinding[]`, `cleanForCopy: boolean`, `blockingForCopy: boolean`), and the `PromptLintTier` type are all exported from `src/prompt/types.ts` (ticket 002).
2. SPEC-102 §Scope item 4 enumerates the rules with explicit tier tagging: hard rules are moment-directive non-empty, content-policy byte-equal, cast-ids-resolve, record-ids-resolve; soft rules are the four denylist sweeps (internal record IDs, engine jargon, schema/validator/patch/lifecycle terms, record-class narrator-voice vocabulary). The engine-jargon denylist is closed and enumerated in §Scope item 4 (45 uppercase-class ID prefixes including `STINT-` and `SREL-`). The schema/validator/patch/lifecycle denylist is closed and enumerated (15 terms).
3. Cross-artifact shared boundary: `lintPrompt(markdown, expectedContentPolicyBody, allKnownRecordIds, allKnownCastIds): PromptLintResult`. Compose (ticket 007) supplies the expected content-policy body (read at compose-time stage 6) and the resolved id sets. The lint module does NOT re-read content-policy — that would couple lint to disk I/O and break determinism. The id-leakage regex per SPEC-102 §Acceptance criterion 7 is `/m[a-z]+-[0-9]+/g`.
4. FOUNDATIONS principle restated: §Story Bundles §5c Present Causal State, Not Narrative Shape — "Output prose only. No commentary. No Markdown headings. No bullet points. No notes. Do not use the words 'page', 'scene', 'act', 'arc', 'midpoint', 'climax', or any other narrative-structure language." This is the engine-scope §5c restated as a Manual Studio LLM-output prohibition; ticket 006's §15 emitter inlines it into the LLM-facing prompt. The lint module's denylists police OUTGOING prompt cleanliness; per SPEC-102 §3 Key Decisions ("No prompt-side validator for invariant compliance"), the lint does NOT verify the LLM's RESPONSE — that is the author's review job.

## Architecture Check

1. A single lint module file with the closed denylists as top-of-file constants makes the rule set grep-findable and reviewable in one diff. Per-rule helper functions inside the file keep each rule independently testable.
2. No backwards-compatibility aliasing — lint is greenfield; tier semantics are derived solely from the `PromptLintTier` closed-enum from ticket 002.

## Verification Layers

1. Each lint rule fires on a synthetic violating prompt — schema validation (fixture per rule).
2. Clean prompt passes all rules — schema validation (clean fixture produces empty findings).
3. Closed denylist coverage — codebase grep-proof (`grep -nE 'STINT-|SREL-|state_snapshot|patch_plan' tools/manual-story-studio/src/prompt/lint.ts` returns matches confirming the enumerated terms are in the constants).
4. Tier closed-enum compliance — codebase grep-proof (`grep -nE 'tier: "(hard|soft)"' tools/manual-story-studio/src/prompt/lint.ts` matches; no `"info"` / `"warn"` etc. variants).

## What to Change

### 1. Create `tools/manual-story-studio/src/prompt/lint.ts`

Define top-of-file constants for closed denylists per SPEC-102 §Scope item 4:

```ts
export const ENGINE_JARGON_DENYLIST: readonly string[] = [
  "PG-", "SE-", "SCN-", "SLT-", "STCHAR-", "STENT-", "STINT-",
  "STSEC-", "STPLAN-", "STEMO-", "SREL-", "BEL-", "SF-", "CHC-",
  "BR-", "OBL-", "CNSQ-", "THR-", "STSTAT-", "STLOC-", "STOBJ-",
  "STQ-", "DA-", "CLK-", "SLB-", "SAU-", "SP-", "RSP-", "CF-",
  "CH-", "INV-", "M-", "OQ-", "ENT-", "SEC-", "CHAR-", "PA-",
  "EPE-", "NCP-", "NCB-", "NWP-", "PR-", "RP-", "AU-",
];

export const SCHEMA_VALIDATOR_DENYLIST: readonly string[] = [
  "state_snapshot", "state_delta", "state_hash", "patch_plan",
  "submit_patch_plan", "validator", "validation_trace", "supersession",
  "superseded", "append_only", "mystery_policy", "provenance.origin",
  "bootstrap", "record_version", "schema_version",
];

export const INTERNAL_ID_REGEX = /m[a-z]+-[0-9]+/g;
```

Export `lintPrompt(input: PromptLintInput): PromptLintResult` where `PromptLintInput` is:

```ts
export interface PromptLintInput {
  markdown: string;
  moment_directive: string;
  expected_content_policy_body: string;
  selected_cast_ids: string[];
  resolved_cast_ids: Set<string>;
  selected_record_ids: string[];
  resolved_record_ids: Set<string>;
}
```

Per-rule sub-helpers inside the module:

- `checkMomentDirectivePresent(input)` → `[]` or `[{rule: "moment_directive_present", tier: "hard", ...}]`.
- `checkContentPolicyByteEqual(input)` → extracts the §1 body from the assembled Markdown and compares to `expected_content_policy_body`; emits hard finding on mismatch.
- `checkSelectedCastExist(input)` → emits hard finding per missing id.
- `checkSelectedRecordsExist(input)` → emits hard finding per missing id.
- `checkNoInternalRecordIds(input)` → regex sweep over the prompt body (excluding the sidecar — sidecar is YAML not part of `markdown`); emits soft finding per match.
- `checkNoEngineJargon(input)` → substring sweep with `ENGINE_JARGON_DENYLIST`; emits soft finding per match.
- `checkNoSchemaValidatorTerms(input)` → substring sweep with `SCHEMA_VALIDATOR_DENYLIST`; emits soft finding per match.
- `checkNoRecordClassNarratorVoice(input)` → regex sweep for narrator-voice phrasing using record-class names (e.g., `\bSF authority\b`, `\bBEL records\b`); emits soft finding per match.

The aggregator builds `findings`, then computes:
- `cleanForCopy = findings.length === 0`.
- `blockingForCopy = findings.some(f => f.tier === "hard")`.

UI behavior (ticket 013): `blockingForCopy` disables the Copy button; `!cleanForCopy && !blockingForCopy` shows "copy anyway?" override.

### 2. Lint test

`test/prompt-lint.test.ts` covers:
- Each rule fires on a synthetic prompt with exactly one violation matching the rule.
- Clean fixture passes all 8 rules.
- `blockingForCopy` is `true` iff any finding has `tier: "hard"`.
- The closed engine-jargon denylist contains all 45 prefixes enumerated in SPEC-102 §Scope item 4 — assert via `assert.strictEqual(ENGINE_JARGON_DENYLIST.length, 45)` + per-string `assert.ok(ENGINE_JARGON_DENYLIST.includes("STINT-"))` spot-checks for `STINT-` and `SREL-` (the two prefixes added during the working-tree reassessment).

## Files to Touch

- `tools/manual-story-studio/src/prompt/lint.ts` (new)
- `tools/manual-story-studio/test/prompt-lint.test.ts` (new)

## Out of Scope

- Reading content-policy from disk — compose (ticket 007) handles disk I/O; lint receives the body as input.
- Lint UI rendering — ticket 013 (Prompt Preview screen).
- Overrides logged into the sidecar — ticket 009 (write layer) records the override timestamp + findings.
- Verifying the LLM's RESPONSE prose — explicit non-goal per SPEC-102 §3 Key Decisions; lint is outgoing-prompt-cleanliness only.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes — `prompt-lint.test.ts` included.
2. Each of the 8 rules fires on its synthetic-violation fixture (SPEC-102 §Acceptance criterion 3).
3. Clean fixture produces `findings: []`, `cleanForCopy: true`, `blockingForCopy: false`.
4. Engine-jargon denylist contains `STINT-` and `SREL-` (regression-proof against the working-tree reassessment expansions).

### Invariants

1. Lint findings carry closed-enum `tier: "hard" | "soft"`; no other values.
2. `blockingForCopy` true iff any finding has `tier: "hard"`; UI Copy button must respect this.
3. Lint is a pure function of `(markdown, expected_content_policy_body, ids)`; no disk I/O, no LLM.
4. Denylists are closed sets — adding a new term requires editing this file (and SPEC-102 §Scope item 4) in the same diff per Rule 6.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-lint.test.ts` — per-rule synthetic-violation fixtures + clean fixture + tier-blocking assertions + denylist completeness assertions.

### Commands

1. `cd tools/manual-story-studio && npm test`
