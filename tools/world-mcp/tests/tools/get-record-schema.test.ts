import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getRecordSchema,
  SUPPORTED_RECORD_SCHEMA_NODE_TYPES,
  type SupportedRecordSchemaNodeType
} from "../../src/tools/get-record-schema";

const EXPECTED_SCHEMA_IDS: Record<SupportedRecordSchemaNodeType, string> = {
  canon_fact_record: "https://worldloom.local/schemas/canon-fact-record.schema.json",
  change_log_entry: "https://worldloom.local/schemas/change-log-entry.schema.json",
  invariant: "https://worldloom.local/schemas/invariant.schema.json",
  mystery_reserve_entry: "https://worldloom.local/schemas/mystery-reserve.schema.json",
  open_question_entry: "https://worldloom.local/schemas/open-question.schema.json",
  named_entity: "https://worldloom.local/schemas/entity.schema.json",
  section: "https://worldloom.local/schemas/section.schema.json",
  character_record: "https://worldloom.local/schemas/character-frontmatter.schema.json",
  diegetic_artifact_record: "https://worldloom.local/schemas/diegetic-artifact-frontmatter.schema.json",
  adjudication_record: "https://worldloom.local/schemas/adjudication-frontmatter.schema.json",
  extension_entry: "https://worldloom.local/schemas/extension-entry.schema.json"
};

const EXPECTED_SOURCE_PATHS: Record<SupportedRecordSchemaNodeType, string> = {
  canon_fact_record: "tools/validators/src/schemas/canon-fact-record.schema.json",
  change_log_entry: "tools/validators/src/schemas/change-log-entry.schema.json",
  invariant: "tools/validators/src/schemas/invariant.schema.json",
  mystery_reserve_entry: "tools/validators/src/schemas/mystery-reserve.schema.json",
  open_question_entry: "tools/validators/src/schemas/open-question.schema.json",
  named_entity: "tools/validators/src/schemas/entity.schema.json",
  section: "tools/validators/src/schemas/section.schema.json",
  character_record: "tools/validators/src/schemas/character-frontmatter.schema.json",
  diegetic_artifact_record: "tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json",
  adjudication_record: "tools/validators/src/schemas/adjudication-frontmatter.schema.json",
  extension_entry: "tools/validators/src/schemas/_shared/extension-entry.schema.json"
};

const EXTENSION_ENTRY_ID = "https://worldloom.local/schemas/extension-entry.schema.json";

function readSourceSchema(nodeType: SupportedRecordSchemaNodeType): Record<string, unknown> {
  const absolutePath = path.resolve(process.cwd(), "..", "..", EXPECTED_SOURCE_PATHS[nodeType]);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as Record<string, unknown>;
}

test("getRecordSchema returns the expected schema for every supported node type", async () => {
  for (const nodeType of SUPPORTED_RECORD_SCHEMA_NODE_TYPES) {
    const result = await getRecordSchema({ node_type: nodeType });

    assert.ok(!("code" in result));
    assert.equal(result.node_type, nodeType);
    assert.equal(result.schema.$id, EXPECTED_SCHEMA_IDS[nodeType]);
    assert.equal(result.source_path, EXPECTED_SOURCE_PATHS[nodeType]);
    assert.deepEqual(result.schema, readSourceSchema(nodeType));
    assert.deepEqual(result.required_fields, readSourceSchema(nodeType).required ?? []);
  }
});

test("getRecordSchema returns referenced schemas keyed by schema id URL", async () => {
  const canonFact = await getRecordSchema({ node_type: "canon_fact_record" });
  const section = await getRecordSchema({ node_type: "section" });

  assert.ok(!("code" in canonFact));
  assert.ok(!("code" in section));
  assert.equal(canonFact.referenced_schemas[EXTENSION_ENTRY_ID]?.$id, EXTENSION_ENTRY_ID);
  assert.equal(section.referenced_schemas[EXTENSION_ENTRY_ID]?.$id, EXTENSION_ENTRY_ID);
});

test("getRecordSchema keeps the primary schema ref intact while exposing referenced schemas", async () => {
  const result = await getRecordSchema({ node_type: "canon_fact_record" });

  assert.ok(!("code" in result));
  const properties = result.schema.properties as Record<string, unknown>;
  const preFiguredBy = properties.pre_figured_by as { items: { pattern: string } };
  const extensions = properties.extensions as { items: { $ref: string } };

  assert.equal(preFiguredBy.items.pattern, "^CF-[0-9]{4}$");
  assert.equal(extensions.items.$ref, EXTENSION_ENTRY_ID);
  assert.equal(result.referenced_schemas[EXTENSION_ENTRY_ID]?.$id, EXTENSION_ENTRY_ID);
});

test("getRecordSchema exposes validator-sourced canon safety conditional blocks", async () => {
  const result = await getRecordSchema({ node_type: "canon_fact_record" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.conditional_blocks, {
    epistemic_profile: {
      required_for_types: [
        "capability",
        "bloodline",
        "magic_practice",
        "technology",
        "divine_action",
        "artifact_dependent_truth",
        "exception_introducing_fact",
        "institution_with_secrecy",
        "knowledge_asymmetric_fact"
      ]
    },
    exception_governance: {
      required_for_types: [
        "capability",
        "bloodline",
        "magic_practice",
        "technology",
        "divine_action",
        "artifact_dependent_truth",
        "exception_introducing_fact"
      ]
    }
  });
});

test("getRecordSchema returns shared extension entry schema as a first-class node type", async () => {
  const result = await getRecordSchema({ node_type: "extension_entry" });

  assert.ok(!("code" in result));
  assert.equal(result.schema.$id, EXTENSION_ENTRY_ID);
  assert.equal(result.source_path, "tools/validators/src/schemas/_shared/extension-entry.schema.json");
  assert.deepEqual(result.referenced_schemas, {});
  assert.deepEqual(result.required_fields, ["originating_cf", "change_id", "date", "label", "body"]);
  assert.deepEqual(result.conditional_blocks, {});
});

test("getRecordSchema returns an empty referenced schema map when the schema has no refs", async () => {
  const result = await getRecordSchema({ node_type: "adjudication_record" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.referenced_schemas, {});
});

test("getRecordSchema rejects unsupported node types", async () => {
  const result = await getRecordSchema({ node_type: "foo" as never });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.deepEqual(result.details?.supported_node_types, [...SUPPORTED_RECORD_SCHEMA_NODE_TYPES]);
});
