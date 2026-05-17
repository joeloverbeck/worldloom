import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { AnySchema, ErrorObject, ValidateFunction } from "ajv";
import yaml from "js-yaml";

const packageRoot = process.cwd();
const repoRoot = resolve(packageRoot, "../..");
const schemaRoot = resolve(packageRoot, "src/schemas");
const sourceRoot = resolve(repoRoot, "tests/fixtures/animalia/_source");
type Ajv2020Instance = {
  addSchema(schema: AnySchema): unknown;
  compile(schema: AnySchema): ValidateFunction;
  errorsText(errors?: ErrorObject[] | null): string;
  getSchema(keyRef: string): ValidateFunction | undefined;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;

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

const recordKindForSchema: Record<SchemaName, string> = {
  "canon-fact-record": "canon_fact",
  "change-log-entry": "change_log",
  invariant: "invariant",
  "mystery-reserve": "mystery_reserve",
  "open-question": "open_question",
  entity: "named_entity",
  section: "section"
};

function loadJson(path: string): AnySchema {
  return JSON.parse(readFileSync(path, "utf8")) as AnySchema;
}

function makeAjv(): Ajv2020Instance {
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

function asRecord(value: unknown, label: string): Record<string, unknown> {
  assert.equal(typeof value, "object", `${label} parses as object`);
  assert.notEqual(value, null, `${label} parses as non-null object`);
  assert.equal(Array.isArray(value), false, `${label} parses as plain object`);
  return value as Record<string, unknown>;
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

test("atomic source schemas accept only their matching retrieval record_kind discriminator", () => {
  const ajv = makeAjv();

  for (const [dir, schemaName] of Object.entries(schemaForDir)) {
    const validate = ajv.getSchema(`https://worldloom.local/schemas/${schemaName}.schema.json`);
    assert.ok(validate, `schema compiled for ${schemaName}`);

    const file = readdirSync(join(sourceRoot, dir)).find((name) => name.endsWith(".yaml"));
    assert.ok(file, `${dir} has a YAML fixture`);

    const recordPath = join(sourceRoot, dir, file);
    const record = asRecord(loadYamlRecord(recordPath), `${dir}/${file}`);
    assert.equal(Object.hasOwn(record, "record_kind"), false, `${dir}/${file} stays free of on-disk record_kind`);

    const accepted = { ...record, record_kind: recordKindForSchema[schemaName] };
    assert.equal(
      validate(accepted),
      true,
      `${schemaName} accepts matching record_kind: ${JSON.stringify(validate.errors, null, 2)}`
    );

    const rejected = { ...record, record_kind: "wrong_record_kind" };
    assert.equal(validate(rejected), false, `${schemaName} rejects mismatched record_kind`);
    assert.ok(
      validate.errors?.some((error) => error.instancePath === "/record_kind" && error.keyword === "const"),
      `${schemaName} reports a const discriminator mismatch`
    );
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
