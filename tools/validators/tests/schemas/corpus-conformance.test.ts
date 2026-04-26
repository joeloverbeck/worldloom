import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020";
import type { AnySchema } from "ajv";
import yaml from "js-yaml";

const packageRoot = process.cwd();
const repoRoot = resolve(packageRoot, "../..");
const schemaRoot = resolve(packageRoot, "src/schemas");
const sourceRoot = resolve(repoRoot, "tests/fixtures/animalia/_source");

const schemaNames = [
  "canon-fact-record",
  "change-log-entry",
  "invariant",
  "mystery-reserve",
  "open-question",
  "entity",
  "section"
] as const;

type SchemaName = (typeof schemaNames)[number];

const schemaForDir: Record<string, SchemaName> = {
  canon: "canon-fact-record",
  "change-log": "change-log-entry",
  invariants: "invariant",
  "mystery-reserve": "mystery-reserve",
  "open-questions": "open-question",
  entities: "entity",
  "everyday-life": "section",
  institutions: "section",
  "magic-or-tech-systems": "section",
  geography: "section",
  "economy-and-resources": "section",
  "peoples-and-species": "section",
  timeline: "section"
};

function loadJson(path: string): AnySchema {
  return JSON.parse(readFileSync(path, "utf8")) as AnySchema;
}

function makeAjv(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: true, formats: { date: true } });
  ajv.addSchema(loadJson(join(schemaRoot, "_shared/extension-entry.schema.json")));
  for (const schemaName of schemaNames) {
    ajv.addSchema(loadJson(join(schemaRoot, `${schemaName}.schema.json`)));
  }
  return ajv;
}

function loadYamlRecord(path: string): unknown {
  return yaml.load(readFileSync(path, "utf8"), { schema: yaml.JSON_SCHEMA });
}

test("animalia atomic source records conform to their JSON Schemas", () => {
  const ajv = makeAjv();

  for (const [dir, schemaName] of Object.entries(schemaForDir)) {
    const validate = ajv.getSchema(`https://worldloom.local/schemas/${schemaName}.schema.json`);
    assert.ok(validate, `schema compiled for ${schemaName}`);

    for (const file of readdirSync(join(sourceRoot, dir)).filter((name) => name.endsWith(".yaml"))) {
      const recordPath = join(sourceRoot, dir, file);
      const record = loadYamlRecord(recordPath);
      assert.equal(
        validate(record),
        true,
        `${dir}/${file} failed ${schemaName}: ${JSON.stringify(validate.errors, null, 2)}`
      );
    }
  }
});

test("section schema rejects mismatched SEC id prefix and file_class", () => {
  const ajv = makeAjv();
  const validate = ajv.getSchema("https://worldloom.local/schemas/section.schema.json");
  assert.ok(validate, "section schema compiled");

  const record = loadYamlRecord(join(sourceRoot, "peoples-and-species/SEC-PAS-001.yaml")) as Record<string, unknown>;
  const mismatchedRecord = { ...record, id: "SEC-GEO-001" };

  assert.equal(validate(mismatchedRecord), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "pattern"));
});
