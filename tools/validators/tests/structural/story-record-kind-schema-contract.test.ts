import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { RECORD_TYPE_TO_SCHEMA } from "../../src/structural/utils.js";

const STORY_SCHEMA_BY_RECORD_KIND = Object.entries(RECORD_TYPE_TO_SCHEMA)
  .filter(([, schemaName]) => schemaName.startsWith("story-"))
  .sort(([left], [right]) => left.localeCompare(right));

test("every schema-backed story record accepts only its matching optional record_kind", () => {
  assert.equal(STORY_SCHEMA_BY_RECORD_KIND.length, 23);

  for (const [recordKind, schemaName] of STORY_SCHEMA_BY_RECORD_KIND) {
    const schemaPath = path.resolve(process.cwd(), "src", "schemas", `${schemaName}.schema.json`);
    const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as {
      properties?: Record<string, unknown>;
      required?: string[];
    };
    const recordKindProperty = schema.properties?.record_kind as {
      type?: string;
      const?: string;
    } | undefined;

    assert.deepEqual(
      recordKindProperty,
      { type: "string", const: recordKind },
      `${schemaName}.schema.json should pin record_kind to ${recordKind}`
    );
    assert.equal(
      schema.required?.includes("record_kind"),
      false,
      `${schemaName}.schema.json should keep record_kind optional`
    );
  }
});
