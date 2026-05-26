# VALENH-050: Improve page-plan structural validator error messages (format guidance UX)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies three validator error messages in `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` and `page-plan-turn-driver-consistency.ts`; validator-package rebuild required; tests updated to assert the new messages.
**Deps**: None

## Problem

During a real `branching-story-turn-cycle` PG-5 authoring session against red-bunny, three page-plan structural validator failures emitted error messages that were technically correct but did not include enough format guidance for the operator to repair on first read:

1. **`page_plan_stchar_packet_integrity.missing_packet`** — message says "`<plan> omits a 16a STCHAR packet for active STENT-X / STCHAR-Y.`" — but in the empirically-hit case, the packet **did exist** in the page plan; it was simply unparseable because the bullet had `**bold wrapping**` (`- **STENT-1 / STCHAR-1 — Ane Arrieta.**`) which doesn't match the parser regex (`/^- (STENT-(?:0|[1-9][0-9]*)) \/ (STCHAR-(?:0|[1-9][0-9]*))\b.*$/gm`). The operator reading the message naturally tries to add the (already-present) packet, gets confused that the same error persists, and eventually finds the format mismatch by trial and error.

2. **`page_plan_turn_driver_consistency.page_plan_driver_section_missing`** — message says "`<page> resolves <event>, but its page plan omits section 7a Turn driver / initiative trace.`" — but the section may exist with a wrong heading (e.g., `## 7a. Turn Driver / Initiative Trace` in Title Case when the validator expects exact lowercase `## 7a. Turn driver / initiative trace`). The error message does not name the expected heading literally; the operator has to consult shared contract §7a or PG-4's plan to figure out the right form.

3. **`page_plan_stchar_packet_integrity.missing_voice_block`** — message says "`<plan> 16a packet for STCHAR-Y omits the voice/dialogue authority block (voice-requiring labels in set: viewpoint).`" — but does not enumerate the **two equivalent forms** the validator accepts per the shared contract §16a: a dedicated `- Voice/dialogue authority:` bullet **OR** substantive inline `Voice Bible` phrasing within `- Stable STCHAR seed used:` or `- Page-local projection:`. An operator who wrote "Voice authority:" prose (without the literal "Voice Bible" or the dedicated bullet) gets blocked and cannot tell which of two acceptable repair paths is being asked for.

These error messages are **technically correct** under the validator's strict-parsing contract — the validators do exactly what they're documented to do — but the messages elide the format expectations that would let the operator self-repair in one read. The fix is purely UX: enrich the message strings (and the `suggested_fix` strings) with explicit format guidance, so a first-read repair becomes possible without consulting the shared contract.

This is FOUNDATIONS-aligned: §Tooling Recommendation says "LLM agents should never operate on prose alone. They should always receive ... explicit and truthful [error context]." When a validator says "X is missing," the operator should be able to repair without context-switching to documentation. Stricter parsing is the right behavior; vague error messages are an oversight.

## Assumption Reassessment (2026-05-26)

1. **Codebase reassessment.** Three validator source files emit the messages under audit:
   - `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` line 102 (`missing_packet`) and line 172 (`missing_voice_block`).
   - `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` line 81 (`page_plan_driver_section_missing`).
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
   No structured detail field changes; no schema migration needed.
6. **Adjacent contradiction surfaced.** During reassessment I noticed the `missing_packet` validator does not currently distinguish between (a) the packet absent entirely and (b) the packet present but malformed at the bullet shape. Both fail the same way today; the message conflates them. The fix should detect the disambiguation when feasible — at minimum by noting "no packet was found; expected bullet shape `- STENT-X / STCHAR-Y — Name.`" so the operator knows to check the bullet shape before assuming the packet is absent. Classified as **required consequence** of this ticket.
7. **Proof-surface reassessment.** `tools/validators/package.json` runs `npm test` as `npm run build && node --test dist/tests/**/*.test.js`; targeted acceptance must therefore build first and run the compiled `dist/tests/structural/page-plan-stchar-packet-integrity.test.js` and `dist/tests/structural/page-plan-turn-driver-consistency.test.js`, not the source `.ts` files directly. Baseline `cd tools/validators && npm test` must pass before edits to establish the regression baseline.

## Architecture Check

1. **Pure message-string change with disambiguation lookups.** The fix touches only the `message` and `suggested_fix` strings emitted by three validators. No parser change, no rule change, no schema change. The disambiguation lookups in `missing_packet` (checking if any bullet starts with `STENT-` in the §16a section, possibly with format drift) is a low-cost helper that strengthens UX without weakening the validator's strictness.
2. **No backwards-compatibility aliasing/shims introduced.** Existing tests that assert on `code` field continue to pass (the code values are unchanged). Tests asserting on the literal `message` string content require updates, but those are local test-fixture updates, not contract changes.
3. **Strengthened validation.** This ticket also adds:
   - A "format drift detection" helper for `missing_packet`: when the validator can find a §16a section heading but cannot find a matching bullet for the expected STENT/STCHAR pair, it adds a `format_drift_detected: true` detail field and tailors the message to mention bullet-shape issues. The reverse (no §16a section at all) keeps the simpler message.
   - A `format_expectation` detail key on all three Verdict structures, machine-readable for future tooling that wants to surface the format string in UI.
4. **No FOUNDATIONS regression.** The fix only improves operator pedagogy. The validators continue to enforce the same rules.

## Verification Layers

1. **Codebase grep-proof** → `grep -E "bullet shape|expected heading|Voice Bible" tools/validators/src/structural/page-plan-stchar-packet-integrity.ts tools/validators/src/structural/page-plan-turn-driver-consistency.ts` returns hits after the edit (currently returns no useful hits).
2. **Validator unit tests** → tests in `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` and `page-plan-turn-driver-consistency.test.ts` assert the new message content. Specifically:
   - `missing_packet` test fixture with bold-wrapped bullet asserts the message contains the literal bullet-shape expectation string.
   - `page_plan_driver_section_missing` test fixture with mis-cased heading asserts the message contains the literal expected heading string.
   - `missing_voice_block` test fixture asserts the message enumerates both accepted forms (dedicated bullet OR Voice Bible phrasing).
3. **Verdict shape preservation** → existing tests asserting on `verdict.code === "page_plan_stchar_packet_integrity.missing_packet"` etc. continue to pass; only message-content tests are updated.
4. **FOUNDATIONS alignment check** → §Tooling Recommendation pedagogical-validation discipline plus docs/HARD-GATE-DISCIPLINE.md "authority-cited discipline" applied to validator error messages.

## What to Change

### 1. `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`

**`missing_packet` (line ~99):** Replace the message and suggested_fix to enumerate the expected bullet shape and add a format-drift detection helper.

```ts
verdicts.push(planFail(
  page,
  plan.path,
  "page_plan_stchar_packet_integrity.missing_packet",
  formatDriftDetectedInSection(content, stcharId)
    ? `${plan.path} 16a section is present but no parseable packet bullet was found for active ${stentId} / ${stcharId}. The expected bullet shape is exactly \`- ${stentId} / ${stcharId} — <display name>.\` (no bold wrap, no extra prefix characters; the bullet must start at column 0 of the bullet line).`
    : `${plan.path} omits a 16a STCHAR packet for active ${stentId} / ${stcharId}. Expected a bullet of the form \`- ${stentId} / ${stcharId} — <display name>.\` under the \`## 16a. STCHAR-Derived Character Authority Packets\` heading.`,
  {
    page_id: pageId(page),
    stent_id: stentId,
    stchar_id: stcharId,
    format_expectation: `- ${stentId} / ${stcharId} — <display name>.`
  },
  formatDriftDetectedInSection(content, stcharId)
    ? `Repair the 16a packet bullet for ${stentId} / ${stcharId} to match the canonical shape \`- ${stentId} / ${stcharId} — <display name>.\` — common drifts: \`**${stentId} / ${stcharId} — …**\` (bold wrap), \`### ${stentId} / ${stcharId} — …\` (heading instead of bullet), or extra prefix characters.`
    : `Add a 16a packet for ${stentId} / ${stcharId} (canonical shape: \`- ${stentId} / ${stcharId} — <display name>.\`), or remove the character from the page's active STENT/STCHAR set.`
));
```

Helper to add to the same file:

```ts
const STCHAR_SECTION_HEADING = /^##\s+16a\.\s+STCHAR/im;

function formatDriftDetectedInSection(content: string, expectedStcharId: string): boolean {
  const section = markdownSection(content, STCHAR_SECTION_HEADING);
  if (section === null) {
    return false;
  }
  // Look for the expected STCHAR id anywhere in the section, even if not in canonical bullet shape.
  return new RegExp(`\\b${expectedStcharId}\\b`).test(section);
}
```

**`missing_voice_block` (line ~169):** Enrich the message to enumerate both accepted forms.

```ts
verdicts.push(planFail(
  page,
  planPath,
  "page_plan_stchar_packet_integrity.missing_voice_block",
  `${planPath} 16a packet for ${packet.stcharId} omits the voice/dialogue authority block (voice-requiring labels in set: ${voiceRequiringLabels.join(", ")}). Two equivalent forms are accepted: (1) a dedicated \`- Voice/dialogue authority:\` bullet with substantive content under the packet, OR (2) substantive inline \`Voice Bible\` phrasing within the \`- Stable STCHAR seed used:\` or \`- Page-local projection:\` bullets.`,
  {
    page_id: pageId(page),
    stchar_id: packet.stcharId,
    required_because: packet.requiredBecause,
    voice_requiring_labels: voiceRequiringLabels,
    accepted_forms: [
      "Dedicated `- Voice/dialogue authority:` bullet with substantive content",
      "Inline `Voice Bible` phrasing within `- Stable STCHAR seed used:` or `- Page-local projection:` bullets"
    ]
  },
  `Add either form: (1) a \`- Voice/dialogue authority:\` bullet, OR (2) the literal phrase \`Voice Bible\` inside the Stable STCHAR seed or Page-local projection bullet, naming the operative voice authority for ${packet.stcharId}.`
));
```

### 2. `tools/validators/src/structural/page-plan-turn-driver-consistency.ts`

**`page_plan_driver_section_missing` (line ~78):** Quote the expected heading literally.

```ts
return [planVerdict(
  page,
  plan.path,
  "page_plan_driver_section_missing",
  `${recordId(page)} resolves ${recordId(event)}, but its page plan omits section 7a Turn driver / initiative trace. Expected heading exactly: \`## 7a. Turn driver / initiative trace\` (case-sensitive; the validator regex is \`/^##\\s+7a\\.\\s+Turn driver \\/ initiative trace\\s*$/m\`). Common drifts: Title Case (\`Turn Driver / Initiative Trace\`), missing period after \`7a\`, or a different heading level.`,
  {
    page_id: recordId(page),
    event_id: recordId(event),
    expected_heading: "## 7a. Turn driver / initiative trace"
  },
  `Add or correct page-plan section 7a heading to exactly \`## 7a. Turn driver / initiative trace\` (lowercase t/d/i/t after the 7a. prefix). The section must project ${recordId(event)}.turn_driver per shared contract §7a.`
)];
```

### 3. Update existing tests

The tests in `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` and `page-plan-turn-driver-consistency.test.ts` may assert specifically on message content. Inspect and update assertions to match the new strings. Existing assertions on `code` and `severity` fields are unchanged.

### 4. Add new tests

New tests:
- **`missing_packet` with format drift**: fixture has §16a heading + bullet wrapped in bold (`- **STENT-1 / STCHAR-1 — Name.**`). Assert the verdict message contains "16a section is present but no parseable packet bullet" and the `format_drift_detected` heuristic fires.
- **`missing_packet` without §16a section**: fixture omits §16a entirely. Assert message contains "omits a 16a STCHAR packet" (the no-drift branch).
- **`missing_voice_block` enumerates forms**: fixture has packet with viewpoint label but no voice bullet and no "Voice Bible" phrase. Assert the message contains "Two equivalent forms are accepted" and both form descriptions.
- **`page_plan_driver_section_missing` quotes heading**: fixture has Title Case §7a heading. Assert message contains the literal `\`## 7a. Turn driver / initiative trace\`` expectation string.

### 5. Rebuild

`cd tools/validators && npm run build` so MCP CLI consumers see the new messages.

## Files to Touch

- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify message strings + add format-drift helper)
- `tools/validators/src/structural/page-plan-turn-driver-consistency.ts` (modify message string)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify existing tests + add 3 new tests)
- `tools/validators/tests/structural/page-plan-turn-driver-consistency.test.ts` (modify existing tests + add 1 new test)
- `tools/validators/dist/**` (rebuild artifact)

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
4. **Post-build smoke**: replay the original PG-5 first-dry-run scenario (bold-wrapped §16a packets, Title Case §7a heading, missing voice block) and confirm:
   - `missing_packet` message now contains "16a section is present but no parseable packet bullet" or "Expected a bullet of the form `- STENT-X / STCHAR-Y — <display name>.`" depending on drift detection.
   - `page_plan_driver_section_missing` message now contains the literal expected-heading string.
   - `missing_voice_block` message enumerates both accepted forms.

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
4. **Post-build smoke**: prepare a sandbox PG-5 envelope mimicking the original failures (bold-wrapped 16a packets, Title Case 7a heading); run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --page-plan-drafts <sandbox-drafts> <sandbox-envelope>`; inspect message strings; confirm format guidance present.
