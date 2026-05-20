import assert from "node:assert/strict";
import test from "node:test";

import { STORY_BUNDLE_NODE_TYPES } from "../../src/tools/_shared.js";
import { SUPPORTED_RECORD_SCHEMA_NODE_TYPES } from "../../src/tools/get-record-schema.js";
import { SUPPORTED_LIST_RECORD_TYPES } from "../../src/tools/list-records.js";

const SCHEMALESS_STORY_NODE_TYPES = new Set([
  "audit_record_story",
  "promotion_record",
  "storylet_batch_manifest",
  "remediation_storylet_proposal_card"
]);

test("story-bundle node types are exposed through list_records", () => {
  for (const nodeType of STORY_BUNDLE_NODE_TYPES) {
    assert.ok(
      (SUPPORTED_LIST_RECORD_TYPES as readonly string[]).includes(nodeType),
      `${nodeType} missing from list_records supported record types`
    );
  }
});

test("schema-backed story-bundle node types are exposed through get_record_schema", () => {
  for (const nodeType of STORY_BUNDLE_NODE_TYPES) {
    if (SCHEMALESS_STORY_NODE_TYPES.has(nodeType)) {
      assert.ok(
        !(SUPPORTED_RECORD_SCHEMA_NODE_TYPES as readonly string[]).includes(nodeType),
        `${nodeType} has no validator schema and should not be advertised by get_record_schema`
      );
      continue;
    }

    assert.ok(
      (SUPPORTED_RECORD_SCHEMA_NODE_TYPES as readonly string[]).includes(nodeType),
      `${nodeType} missing from get_record_schema supported node types`
    );
  }
});
