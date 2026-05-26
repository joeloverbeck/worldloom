# VALENH-050: Improve page-plan structural validator error messages (format guidance UX)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies three validator error messages in `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` and `page-plan-turn-driver-consistency.ts`; validator-package rebuild required; tests updated to assert the new messages.
**Deps**: None

## Problem

At intake, during a real `branching-story-turn-cycle` PG-5 authoring session against red-bunny, three page-plan structural validator failures emitted error messages that were technically correct but did not include enough format guidance for the operator to repair on first read:

1. **`page_plan_stchar_packet_integrity.missing_packet`** — message says "`<plan> omits a 16a STCHAR packet for active STENT-X / STCHAR-Y.`" — but in the empirically-hit case, the packet **did exist** in the page plan; it was simply unparseable because the bullet had `**bold wrapping**` (`- **STENT-1 / STCHAR-1 — Ane Arrieta.**`) which doesn't match the parser regex (`/^- (STENT-(?:0|[1-9][0-9]*)) \/ (STCHAR-(?:0|[1-9][0-9]*))\b.*$/gm`). The operator reading the message naturally tries to add the (already-present) packet, gets confused that the same error persists, and eventually finds the format mismatch by trial and error.

2. **`page_plan_turn_driver_consistency.page_plan_driver_section_missing`** — message says "`<page> resolves <event>, but its page plan omits section 7a Turn driver / initiative trace.`" — but the section may exist with a wrong heading (e.g., `## 7a. Turn Driver / Initiative Trace` in Title Case when the validator expects exact lowercase `## 7a. Turn driver / initiative trace`). The error message does not name the expected heading literally; the operator has to consult shared contract §7a or PG-4's plan to figure out the right form.

3. **`page_plan_stchar_packet_integrity.missing_voice_block`** — message says "`<plan> 16a packet for STCHAR-Y omits the voice/dialogue authority block (voice-requiring labels in set: viewpoint).`" — but does not enumerate the **two equivalent forms** the validator accepts per the shared contract §16a: a dedicated `- Voice/dialogue authority:` bullet **OR** substantive inline `Voice Bible` phrasing within `- Stable STCHAR seed used:` or `- Page-local projection:`. An operator who wrote "Voice authority:" prose (without the literal "Voice Bible" or the dedicated bullet) gets blocked and cannot tell which of two acceptable repair paths is being asked for.

These error messages are **technically correct** under the validator's strict-parsing contract — the validators do exactly what they're documented to do — but the messages elide the format expectations that would let the operator self-repair in one read. The fix is purely UX: enrich the message strings (and the `suggested_fix` strings) with explicit format guidance, so a first-read repair becomes possible without consulting the shared contract.

This is FOUNDATIONS-aligned: §Tooling Recommendation says "LLM agents should never operate on prose alone. They should always receive ... explicit and truthful [error context]." When a validator says "X is missing," the operator should be able to repair without context-switching to documentation. Stricter parsing is the right behavior; vague error messages are an oversight.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** Three validator source files emit the messages under audit:
   - `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (`missing_packet` and `missing_voice_block`).
   - `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` (`page_plan_driver_section_missing`).
   Verified by `grep -n "missing_packet\|missing_voice_block\|page_plan_driver_section_missing\|message:" <files>`.
2. **Specs/docs reassessment.** Shared contract §16a (`.claude/skills/_shared-templates/story-state-contract.md`) documents:
   - The `- STENT-<integer> / STCHAR-<integer> — <display name>.` bullet form (verbatim, no bold wrap).
   - The voice-authority contract: "Voice authority is contract-conformant in either of two equivalent forms: a dedicated `- Voice/dialogue authority:` bullet with substantive content, OR substantive inline `Voice Bible` phrasing within the `- Stable STCHAR seed used:` or `- Page-local projection:` bullets."
   - The §7a heading: `## 7a. Turn driver / initiative trace` (lowercase t/d/i/t after the 7a. prefix).
   The contract is explicit and authoritative; the validators' error messages need to mirror it.
3. **Cross-skill / cross-artifact boundary.** The shared boundary is the markdown parser inside each validator. The parser is intentionally strict because the page plan is the prompt package for the external prose renderer; deterministic parsing is required so that the renderer (and downstream validators) read the same intended packet structure. UX improvements to the error messages do not change the parser; they only enrich what the validator says when the parser doesn't find what it expects.
4. **FOUNDATIONS principle restatement.** FOUNDATIONS §Tooling Recommendation requires the validation surface to be operationally pedagogical: "HARD-GATE PASS/FAIL rationales follow the authority-cited discipline in docs/HARD-GATE-DISCIPLINE.md: a validation judgment must cite the record id, packet layer, validator result, retrieved field, or named loaded authority it rests on, not model memory or impression alone." A validator error message that names the violated invariant without naming the format expectation makes the operator do undocumented archaeology to repair; the fix is to surface the format expectation in the message itself.
5. **Schema extension consumer audit.** Validator error messages are consumed by:
   - The operator reading dry-run output during HARD-GATE preparation (this ticket's primary target).
   - The patch engine's `PatchReceipt.validators_run[].detail` field, which is structured prose; the change here goes into `message` and `suggested_fix`, both already free-form strings.
   - The MCP `validate_patch_plan` response, which echoes the validator's Verdict structure verbatim.
   The landed change enriches existing free-form `detail` payloads without introducing a schema migration.
6. **Adjacent contradiction surfaced.** During reassessment I noticed the pre-ticket `missing_packet` validator did not distinguish between (a) the packet absent entirely and (b) the packet present but malformed at the bullet prefix. Both failed the same way before this ticket; the landed fix now detects the feasible disambiguation when the expected STCHAR id appears in §16a and names the required `- STENT-X / STCHAR-Y` prefix. Classified as **required consequence** of this ticket.
7. **Parser contract correction.** Live parser review corrected the draft wording above: `parsePackets()` currently requires the line to start with `- STENT-<integer> / STCHAR-<integer>` but does **not** require an em dash or display-name suffix. The landed message must therefore describe the canonical prefix and examples of malformed bullet wrapping without claiming the validator enforces an exact em-dash/display-name shape.
8. **Proof-surface reassessment.** `tools/validators/package.json` runs `npm test` as `npm run build && node --test dist/tests/**/*.test.js`; targeted acceptance must therefore build first and run the compiled `dist/tests/structural/page-plan-stchar-packet-integrity.test.js` and `dist/tests/structural/page-plan-turn-driver-consistency.test.js`, not the source `.ts` files directly. Baseline `cd tools/validators && npm test` passed before edits on 2026-05-26 (1072 passing tests).
9. **Package docs surface.** `tools/validators/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` do not document these three verdict message strings. The package README validator inventory already lists `page_plan_stchar_packet_integrity`; it does not list `page_plan_turn_driver_consistency`, but this ticket changes only diagnostic wording, not registry/inventory coverage, so the README inventory gap is outside this ticket.

## Architecture Check

1. **Pure message-string change with disambiguation lookups.** The fix touches only the `message` and `suggested_fix` strings emitted by three validators, plus additive `detail` keys for machine-readable format guidance. No parser change, no rule change, no schema change. The disambiguation lookup in `missing_packet` (checking whether the expected STCHAR id appears in the §16a section even though no parseable packet was found) is a low-cost helper that strengthens UX without weakening the validator's strictness.
2. **No backwards-compatibility aliasing/shims introduced.** Existing tests that assert on `code` field continue to pass (the code values are unchanged). Tests asserting on the literal `message` string content require updates, but those are local test-fixture updates, not contract changes.
3. **Strengthened validation.** This ticket also adds:
   - A "format drift detection" helper for `missing_packet`: when the validator can find a §16a section heading but cannot find a matching bullet for the expected STENT/STCHAR pair, it adds a `format_drift_detected: true` detail field and tailors the message to mention bullet-shape issues. The reverse (no §16a section at all) keeps the simpler message.
   - A `format_expectation` detail key on all three Verdict structures, machine-readable for future tooling that wants to surface the format string in UI.
4. **No FOUNDATIONS regression.** The fix only improves operator pedagogy. The validators continue to enforce the same rules.

## Verification Layers

1. **Codebase grep-proof** → `grep -E "bullet to start|Expected heading exactly|Two equivalent forms are accepted|format_expectation|format_drift_detected" tools/validators/src/structural/page-plan-stchar-packet-integrity.ts tools/validators/src/structural/page-plan-turn-driver-consistency.ts` returns hits after the edit.
2. **Validator unit tests** → tests in `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` and `page-plan-turn-driver-consistency.test.ts` assert the new message content. Specifically:
   - `missing_packet` test fixture with bold-wrapped bullet asserts the message contains the literal parser-prefix expectation string.
   - `page_plan_driver_section_missing` test fixture with mis-cased heading asserts the message contains the literal expected heading string.
   - `missing_voice_block` test fixture asserts the message enumerates both accepted forms (dedicated bullet OR Voice Bible phrasing).
3. **Verdict shape preservation** → existing tests asserting on `verdict.code === "page_plan_stchar_packet_integrity.missing_packet"` etc. continue to pass; only message-content tests are updated.
4. **FOUNDATIONS alignment check** → §Tooling Recommendation pedagogical-validation discipline plus docs/HARD-GATE-DISCIPLINE.md "authority-cited discipline" applied to validator error messages.

## Landed Changes

### 1. `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`

- Enriched `missing_packet` with parser-format guidance for the required `- STENT-X / STCHAR-Y` bullet prefix.
- Added `formatDriftDetectedInSection()` so malformed §16a bullets that still mention the expected STCHAR id get a more precise "section present but no parseable packet bullet" diagnostic.
- Added `format_expectation` to the `missing_packet` detail payload and `format_drift_detected: true` when the drift heuristic fires.
- Enriched `missing_voice_block` to enumerate both accepted voice-authority forms: a dedicated `- Voice/dialogue authority:` bullet or inline `Voice Bible` phrasing in the stable seed/page-local projection bullets.

### 2. `tools/validators/src/structural/page-plan-turn-driver-consistency.ts`

- Enriched `page_plan_driver_section_missing` to quote the expected heading exactly: `## 7a. Turn driver / initiative trace`.
- Added `expected_heading` and `format_expectation` detail fields for downstream UI/tooling consumers.

### 3. Tests and build artifact

- Updated `page-plan-stchar-packet-integrity.test.ts` to assert no-drift `missing_packet` guidance, bold-wrapped §16a bullet drift guidance, and both accepted `missing_voice_block` forms.
- Updated `page-plan-turn-driver-consistency.test.ts` to assert the literal expected heading and a Title Case drift case.
- Rebuilt `tools/validators/dist/**` through the package build/test commands.

## Files to Touch

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify message strings + add format-drift helper)
- `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` (modify message string)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify existing tests + add 1 new format-drift test)
- `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` (modify existing tests + add 1 new test)
- `tools/validators/dist/**` (ignored rebuild artifact refreshed)

## Out of Scope

- Loosening the validator's parser to accept bold-wrapped bullets, title-case headings, or other format drifts. The strict-parse rule is correct for deterministic prose-renderer prompts; this ticket only improves the error message when the strict-parse fails.
- Adding format-drift detection for `missing_voice_block` (e.g., detecting that "Voice authority:" was written but not "Voice Bible" — hard to disambiguate honest authoring drift from a genuine omission; defer to a future ticket if empirical authoring drift is observed).
- Adding heading-case auto-correction (out of scope for a validator; validator stays strict).
- Adding rich/structured error UI (the message string is the primary surface; consumers can render it as they like).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript compile + dist refresh completes cleanly.
2. `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js dist/tests/structural/page-plan-turn-driver-consistency.test.js` — all existing tests pass with updated assertions plus the new format-drift and form-enumeration tests (compiled path matches `npm test` execution model).
3. `cd tools/validators && npm test` — full validator test suite passes with no regressions.
4. **Post-build message smoke via focused unit fixtures** — the compiled focused tests exercise the original failure shapes: bold-wrapped §16a packet bullet, Title Case §7a heading, and missing voice-authority block.

### Invariants

1. **Validator strictness unchanged.** All three validators continue to enforce the same parse rules; nothing previously rejected becomes accepted.
2. **Verdict code stability.** Existing consumers keying off `verdict.code` continue to work; only `message`, `suggested_fix`, and certain `detail` fields are enriched.
3. **Pedagogical messages.** Operator can repair from message alone without consulting external documentation for the canonical format expectation.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — update existing `missing_packet` and `missing_voice_block` message assertions; add tests asserting new content (format-drift detected vs not; enumerated voice-authority forms).
2. `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` — update existing `page_plan_driver_section_missing` test assertion; add a Title Case drift case.

### Commands

1. **Build:** `cd tools/validators && npm run build`
2. **Targeted (compiled):** `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js dist/tests/structural/page-plan-turn-driver-consistency.test.js`
3. **Full suite:** `cd tools/validators && npm test`
4. **Post-build smoke substitute:** covered by the compiled focused unit fixtures named above; no portable historical PG-5 patch-plan envelope exists in this checkout.

## Outcome

Completed. The three targeted verdicts now include concrete repair guidance while preserving strict parser behavior and stable verdict codes.

## Verification Result

1. `cd tools/validators && npm test` passed before source edits on 2026-05-26: 1072 passing tests.
2. `cd tools/validators && npm run build` passed after source/test edits.
3. `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js dist/tests/structural/page-plan-turn-driver-consistency.test.js` passed: 35 passing tests.
4. `cd tools/validators && npm test` passed after edits: 1074 passing tests.
5. `grep -E "bullet to start|Expected heading exactly|Two equivalent forms are accepted|format_expectation|format_drift_detected" tools/validators/src/structural/page-plan-stchar-packet-integrity.ts tools/validators/src/structural/page-plan-turn-driver-consistency.ts` returned the expected source hits.

## Deviations

- The draft said the §16a packet parser required an exact em-dash/display-name bullet shape. Live code requires the `- STENT-X / STCHAR-Y` prefix only, so the landed message mirrors that actual parser contract.
- The drafted world-mcp historical PG-5 smoke was replaced with package-local compiled unit fixtures because no portable historical patch-plan envelope is present in this checkout. The focused tests exercise the same message branches without widening into world-mcp CLI envelope construction.
- `tools/validators/README.md` was inspected as a package user-facing surface. It has no message-string docs; its pre-existing validator-inventory omission for `page_plan_turn_driver_consistency` remains outside this diagnostic-message ticket.
