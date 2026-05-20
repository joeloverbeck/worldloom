import assert from "node:assert/strict";
import test from "node:test";

import { yamlParseIntegrity } from "../../src/structural/yaml-parse-integrity.js";
import { context } from "./helpers.js";

test("yaml_parse_integrity catches malformed atomic YAML and hybrid frontmatter", async () => {
  const ctx = context([]);
  const result = await yamlParseIntegrity.run(
    {
      files: [
        { path: "_source/canon/CF-99.yaml", content: "id: [unterminated" },
        { path: "characters/test.md", content: "---\ncharacter_id: [unterminated\n---\nBody" },
        { path: "character-proposals/NCP-12-test.md", content: "---\nproposal_id: [unterminated\n---\nBody" },
        { path: "character-proposals/batches/NCB-3-test.md", content: "---\nbatch_id: [unterminated\n---\nBody" }
      ]
    },
    ctx
  );

  assert.equal(result.length, 4);
  assert.deepEqual(result.map((verdict) => verdict.code), [
    "yaml_parse_integrity.parse_error",
    "yaml_parse_integrity.parse_error",
    "yaml_parse_integrity.parse_error",
    "yaml_parse_integrity.parse_error"
  ]);
});
