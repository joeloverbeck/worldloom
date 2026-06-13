# MANSTOSTUFIX-003: Secret prompt rendering must surface both summary and details

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` backend (`src/prompt/translators/secrets.ts`)
**Deps**: None

## Problem

Before this ticket, when a manual-story `secrets` record had both `summary` and `details` set, the rendered Section 10 prompt dropped the summary and showed only the details. Observed in the field on `worlds/erotica-world/manual-stories/red-bunny` secret `msecret-1`:

```
**Secrets:**
- Secret: Her deliberately provocative pink outfit reads as sex-worker street-signaling to anyone who knows the register, though a stranger may read only youth and vulnerability.
  Audience: Known only to the listed holders; do not disclose to other characters
```

The record's `summary` ("Ane is a self-employed adult sex worker in the Irún station-area; she conceals this from strangers like Jon…") did not appear — only `details` was rendered.

Root cause at intake: `src/prompt/translators/secrets.ts` built the secret body as a single fallback expression:

```ts
const body = record.details.trim() || record.summary.trim() || record.title;
```

This was `details || summary || title` — it surfaced exactly one field. When both were set, `details` won and `summary` was silently discarded. The external LLM therefore lost the authored headline of the secret.

The sibling `src/prompt/translators/questions.ts` already renders the correct shape (title headline, then `Context:` for summary, then `Detail:` for details, each emitted only when non-empty). That translator is the in-repo template for this fix.

Landed behavior: when both `summary` and `details` are set, both render. When only one is set, only that one renders. When neither is set, the renderer falls back to `title`. No empty labelled lines are emitted.

## Assumption Reassessment (2026-06-04)

1. At intake, `src/prompt/translators/secrets.ts` computed `const body = record.details.trim() || record.summary.trim() || record.title;` and emitted a single `- Secret: ${body}` line. The landed implementation computes trimmed `summary` and `details`, uses `summary || details || record.title` for the headline, and emits a `Detail:` line only when both summary and details are non-empty.
2. `summary` and `details` are both `RecordCommonFields` (`src/schema/manual-story.ts:153-154`), present on every record class including `ManualSecretRecord`. No schema change is required.
3. The running `dist` (`dist/src/prompt/translators/secrets.js`, rebuilt 2026-06-04 09:18) matches the current source — this is not a stale-build artifact. The defect is in source.
4. The holder-by-name rendering (`Held by: …`) and `audience_visibility` clause already work correctly and are out of scope here; the empty "Held by:" line in the field report is a separate data/UX issue tracked by MANSTOSTUFIX-004, not a renderer defect.
5. `src/prompt/translators/questions.ts` already emits summary as `Context:` and details as `Detail:` only when non-empty — it is the precedent pattern for the corrected output shape.
6. `src/prompt/translators/beliefs.ts:38` carries the identical `details || summary || title` single-field-drop pattern. It is **out of scope** for this ticket (the field report concerned secrets only); flagged here so a future ticket can address belief rendering consistency if desired.
7. This is the non-canon authoring tool (`No LLM, no MCP, no patch engine`). No FOUNDATIONS enforcement surface, HARD-GATE, canon-write ordering, validator, or Mystery Reserve surface is touched.

## Architecture Check

1. The fix mirrors the existing `questions` translator's labelled-line approach rather than inventing a new convention, keeping Section 10's three sub-blocks (beliefs / secrets / questions) visually consistent.
2. The headline prefers `summary` (the authored one-line gist) with `details` promoted to the headline only when `summary` is empty; the second `Detail:` line is emitted only when both are present, so a single-field secret never shows a redundant or empty label.
3. No new field kinds, schema fields, or public interfaces are introduced. The change is local to one translator function.

## Verification Layers

1. A secret with both `summary` and `details` renders both (headline = summary, `Detail:` line = details) → translator unit test.
2. A secret with only `summary` renders just the headline, no `Detail:` line → translator unit test.
3. A secret with only `details` renders the details as the headline, no `Detail:` line → translator unit test.
4. A secret with neither `summary` nor `details` falls back to `title` → translator unit test.
5. The `Held by:`, `Audience:`, and `Forbidden reveals:` lines continue to render exactly as before → translator unit test asserting line composition is unchanged for those fields.

## Files Touched

- `tools/manual-story-studio/src/prompt/translators/secrets.ts` (modified — replaced the single-field `body` with summary + conditional `Detail:` line)
- `tools/manual-story-studio/test/prompt-translators-secrets.test.ts` (modified — covers the four summary/details combinations and unchanged holder/audience/forbidden-reveal lines)

## Out of Scope

- `held_by` data entry / the "Held by" form control (MANSTOSTUFIX-004).
- The identical drop pattern in `beliefs.ts` (flagged in Assumption Reassessment item 6; separate ticket if desired).
- Any change to `getCastTitle`, holder-name resolution, or `audience_visibility` clause text.
- Treating `refs.characters` as holders — deliberately preserved as distinct (FOUNDATIONS §SF/BEL separation: subject/mention vs holder/knower).

## Acceptance Criteria

### Tests That Must Pass

1. Secret with `summary` and `details` both set -> output contains the summary as the `- Secret:` headline and a `  Detail:` line carrying the details. Covered by `tools/manual-story-studio/test/prompt-translators-secrets.test.ts`.
2. Secret with only `summary` set -> output `- Secret:` headline is the summary; no `  Detail:` line. Covered by `tools/manual-story-studio/test/prompt-translators-secrets.test.ts`.
3. Secret with only `details` set -> output `- Secret:` headline is the details; no `  Detail:` line. Covered by `tools/manual-story-studio/test/prompt-translators-secrets.test.ts`.
4. Secret with neither set -> output `- Secret:` headline is the title. Covered by `tools/manual-story-studio/test/prompt-translators-secrets.test.ts`.
5. Holder, audience, and forbidden-reveal lines are byte-identical to pre-change output for the same inputs. Covered by exact output assertions in `tools/manual-story-studio/test/prompt-translators-secrets.test.ts`.

### Invariants

1. No labelled line (`Detail:`, `Held by:`, `Forbidden reveals:`) is ever emitted with an empty value.
2. Rendering is deterministic given record content (no ordering or environmental dependence).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/prompt-translators-secrets.test.ts` — covers the four summary/details combinations plus a holder/audience/forbidden-reveal composition assertion.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
3. Backend-only command is the correct boundary: this is a backend translator change with no `web/` surface; full `npm test` is run once as a regression gate.

## Outcome

Completed: 2026-06-04

`tools/manual-story-studio/src/prompt/translators/secrets.ts` now preserves the authored secret summary as the prompt headline when present and emits details as a separate `Detail:` line only when both fields are populated. Single-field secrets still render as a single `- Secret:` headline, empty `Detail:` lines are not emitted, and holder/audience/forbidden-reveal lines remain unchanged.

`tools/manual-story-studio/test/prompt-translators-secrets.test.ts` now covers the four summary/details combinations plus the unchanged holder, audience, and forbidden-reveal composition.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` — PASS on 2026-06-04; backend build passed and 89 compiled backend test files passed.
2. `cd tools/manual-story-studio && npm test` — PASS on 2026-06-04; backend build passed, 510 backend/runtime tests passed, and `npm --prefix web test` typecheck passed.

## Deviations

- The first `npm run test:backend` attempt failed during TypeScript compilation because the new tests called `fixtureCtx()` without its required title-map argument. The tests were corrected to call `fixtureCtx({})`.
- The next `npm run test:backend` attempt isolated failures in the new test expectations: `fixtureSecret` defaults to `held_by: ["mchar-1"]` and `audience_visibility: "hidden"`. The new single-field tests now explicitly set `held_by: []` and `audience_visibility: "known_to_holders"` before the final passing proof.
- `tools/manual-story-studio/dist/`, `tools/manual-story-studio/node_modules/`, `tools/manual-story-studio/web/dist/`, and `tools/manual-story-studio/web/node_modules/` were pre-existing ignored package artifacts and remained ignored verification artifacts.
