import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_JARGON_DENYLIST,
  INTERNAL_ID_REGEX,
  lintPrompt,
  RECORD_CLASS_NARRATOR_PHRASES,
  SCHEMA_VALIDATOR_DENYLIST,
  type PromptLintInput,
} from "../src/prompt/lint.js";

const EXPECTED_CONTENT_POLICY = `<content_policy>
RATING: NC-21
</content_policy>`;

function cleanPrompt(): string {
  return [
    `## 1. Content Policy\n\n${EXPECTED_CONTENT_POLICY}`,
    "## 2. Story Contract\n\n**Title:** Fixture",
    "## 3. Current Situation\n\nA quiet moment.",
    "## 4. Manual Moment Directive\n\nDo the thing.",
    "## 5. Required Beat Cluster\n\nRender 2-5 beats.",
    "## 6. Optional Beat Template Guidance\n\n(none selected)",
    "## 7. Cast and Voice\n\n### Jon\n\n**Identity**\n\nA scribe.",
    "## 8. Emotional and Relationship State\n\n(none)",
    "## 9. Current Intentions and Plans\n\n(none)",
    "## 10. Relevant Beliefs, Secrets, and Open Questions\n\n(none)",
    "## 11. Physical Continuity\n\n(none)",
    "## 12. Forbidden Inventions and Forbidden Reveals\n\n(none)",
    "## 13. Style and Prose Craft\n\nPOV discipline.",
    "## 14. Stop Rule\n\nStop at the new response point.",
    "## 15. Output Instruction\n\nOutput prose only.",
  ].join("\n\n");
}

function baseInput(overrides: Partial<PromptLintInput> = {}): PromptLintInput {
  return {
    markdown: cleanPrompt(),
    moment_directive: "Do the thing.",
    expected_content_policy_body: EXPECTED_CONTENT_POLICY,
    selected_cast_ids: ["mchar-1"],
    resolved_cast_ids: new Set(["mchar-1"]),
    selected_record_ids: ["mbel-1"],
    resolved_record_ids: new Set(["mbel-1"]),
    ...overrides,
  };
}

test("clean fixture passes all rules", () => {
  const result = lintPrompt(baseInput());
  assert.deepStrictEqual(result.findings, []);
  assert.equal(result.cleanForCopy, true);
  assert.equal(result.blockingForCopy, false);
});

test("rule 1: empty moment directive → hard finding", () => {
  const result = lintPrompt(baseInput({ moment_directive: "   " }));
  assert.ok(
    result.findings.some(
      (f) => f.rule === "moment_directive_present" && f.tier === "hard",
    ),
  );
  assert.equal(result.blockingForCopy, true);
});

test("rule 2: content-policy mismatch → hard finding", () => {
  const result = lintPrompt(
    baseInput({
      expected_content_policy_body: "DIFFERENT POLICY",
    }),
  );
  assert.ok(
    result.findings.some(
      (f) => f.rule === "content_policy_byte_equal" && f.tier === "hard",
    ),
  );
  assert.equal(result.blockingForCopy, true);
});

test("rule 3: unresolved cast id → hard finding", () => {
  const result = lintPrompt(
    baseInput({
      selected_cast_ids: ["mchar-1", "mchar-99"],
      resolved_cast_ids: new Set(["mchar-1"]),
    }),
  );
  assert.ok(
    result.findings.some(
      (f) =>
        f.rule === "selected_cast_exists" &&
        f.tier === "hard" &&
        f.snippet === "mchar-99",
    ),
  );
  assert.equal(result.blockingForCopy, true);
});

test("rule 4: unresolved record id → hard finding", () => {
  const result = lintPrompt(
    baseInput({
      selected_record_ids: ["mbel-1", "mbel-77"],
      resolved_record_ids: new Set(["mbel-1"]),
    }),
  );
  assert.ok(
    result.findings.some(
      (f) =>
        f.rule === "selected_records_exist" &&
        f.tier === "hard" &&
        f.snippet === "mbel-77",
    ),
  );
});

test("rule 5: internal id leak in prompt body → hard finding", () => {
  const dirty = cleanPrompt().replace(
    "A quiet moment.",
    "A quiet moment with mchar-3 in the room.",
  );
  const result = lintPrompt(baseInput({ markdown: dirty }));
  assert.ok(
    result.findings.some(
      (f) =>
        f.rule === "no_internal_record_ids" &&
        f.tier === "hard" &&
        f.snippet === "mchar-3",
    ),
  );
  assert.equal(result.blockingForCopy, true);
  assert.equal(result.cleanForCopy, false);
});

test("rule 6: engine jargon (STCHAR-7) in body → hard finding", () => {
  const dirty = cleanPrompt().replace(
    "A scribe.",
    "A scribe linked to STCHAR-7.",
  );
  const result = lintPrompt(baseInput({ markdown: dirty }));
  assert.ok(
    result.findings.some(
      (f) =>
        f.rule === "no_engine_jargon" &&
        f.tier === "hard" &&
        f.snippet === "STCHAR-7",
    ),
  );
  assert.equal(result.blockingForCopy, true);
  assert.equal(result.cleanForCopy, false);
});

test("rule 7: schema/validator term → hard finding", () => {
  const dirty = cleanPrompt().replace(
    "POV discipline.",
    "POV discipline; respects the validation_trace.",
  );
  const result = lintPrompt(baseInput({ markdown: dirty }));
  assert.ok(
    result.findings.some(
      (f) => f.rule === "no_schema_validator_terms" && f.tier === "hard",
    ),
  );
  assert.equal(result.blockingForCopy, true);
  assert.equal(result.cleanForCopy, false);
});

test("rule 8: record-class narrator-voice phrase → hard finding", () => {
  const dirty = cleanPrompt().replace(
    "A scribe.",
    "A scribe whose SF authority is at stake.",
  );
  const result = lintPrompt(baseInput({ markdown: dirty }));
  assert.ok(
    result.findings.some(
      (f) =>
        f.rule === "no_record_class_narrator_voice" &&
        f.tier === "hard",
    ),
  );
  assert.equal(result.blockingForCopy, true);
  assert.equal(result.cleanForCopy, false);
});

test("blockingForCopy is true iff any finding has tier=hard", () => {
  const clean = lintPrompt(baseInput());
  assert.equal(clean.blockingForCopy, false);
  assert.equal(clean.cleanForCopy, true);

  const promotedLeak = lintPrompt(
    baseInput({
      markdown: cleanPrompt().replace(
        "A scribe.",
        "A scribe linked to STCHAR-9.",
      ),
    }),
  );
  assert.equal(promotedLeak.blockingForCopy, true);
  assert.equal(promotedLeak.cleanForCopy, false);
  assert.ok(promotedLeak.findings.some((f) => f.tier === "hard"));

  const hardPlus = lintPrompt(
    baseInput({
      moment_directive: "",
      markdown: cleanPrompt().replace(
        "A scribe.",
        "A scribe linked to STCHAR-9.",
      ),
    }),
  );
  assert.equal(hardPlus.blockingForCopy, true);
  assert.equal(hardPlus.cleanForCopy, false);
});

test("denylist completeness — engine-jargon prefixes (SPEC-102 §Scope item 4)", () => {
  // SPEC-102 §Scope item 4 enumerates 44 distinct uppercase-class
  // prefixes (the ticket text mentioned 45 but the enumerated list
  // resolves to 44 — counted: 10 + 10 + 10 + 10 + 4 = 44).
  assert.equal(ENGINE_JARGON_DENYLIST.length, 44);
  assert.ok(ENGINE_JARGON_DENYLIST.includes("STINT-"));
  assert.ok(ENGINE_JARGON_DENYLIST.includes("SREL-"));
  assert.ok(ENGINE_JARGON_DENYLIST.includes("PG-"));
  assert.ok(ENGINE_JARGON_DENYLIST.includes("SCN-"));
});

test("denylist completeness — 15 schema/validator/lifecycle terms", () => {
  assert.equal(SCHEMA_VALIDATOR_DENYLIST.length, 15);
  assert.ok(SCHEMA_VALIDATOR_DENYLIST.includes("patch_plan"));
  assert.ok(SCHEMA_VALIDATOR_DENYLIST.includes("state_snapshot"));
  assert.ok(SCHEMA_VALIDATOR_DENYLIST.includes("schema_version"));
});

test("internal id regex matches lowercase m-prefix ids", () => {
  const matches = "see mchar-1 and mbel-77 here".match(INTERNAL_ID_REGEX);
  assert.deepStrictEqual(matches, ["mchar-1", "mbel-77"]);
});

test("RECORD_CLASS_NARRATOR_PHRASES list is non-empty", () => {
  assert.ok(RECORD_CLASS_NARRATOR_PHRASES.length > 0);
});
