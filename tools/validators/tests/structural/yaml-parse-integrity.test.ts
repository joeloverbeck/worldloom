import assert from "node:assert/strict";
import test from "node:test";

import { yamlParseIntegrity } from "../../src/structural/yaml-parse-integrity.js";
import { context } from "./helpers.js";

test("yaml_parse_integrity catches malformed atomic YAML and hybrid frontmatter", async () => {
  const ctx = context([]);
  const result = await yamlParseIntegrity.run(
    {
      files: [
        { path: "_source/canon/CF-0099.yaml", content: "id: [unterminated" },
        { path: "characters/test.md", content: "---\ncharacter_id: [unterminated\n---\nBody" }
      ]
    },
    ctx
  );

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((verdict) => verdict.code), [
    "yaml_parse_integrity.parse_error",
    "yaml_parse_integrity.parse_error"
  ]);
});
