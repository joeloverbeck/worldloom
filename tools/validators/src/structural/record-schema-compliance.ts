import { readFileSync } from "node:fs";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020";
import type { AnySchema, ErrorObject, ValidateFunction } from "ajv";
import yaml from "js-yaml";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  RECORD_TYPE_TO_SCHEMA,
  asPlainRecord,
  fileInputsFrom,
  queryStructuralRecords,
  toPosixPath
} from "./utils.js";
import { frontmatterFor } from "./yaml-parse-integrity.js";

const ajv = new Ajv2020({ allErrors: true, strict: true, formats: { date: true } });
const validatorsByRecordType = loadSchemaValidators();

export const recordSchemaCompliance: Validator = {
  name: "record_schema_compliance",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];
    const records = await queryStructuralRecords(ctx);

    for (const record of records) {
      if (!isInIncrementalScope(record.file_path, ctx)) {
        continue;
      }
      const validate = validatorsByRecordType.get(String(record.node_type));
      if (!validate) {
        continue;
      }
      if (!validate(record.parsed)) {
        verdicts.push(...schemaVerdicts(record, validate.errors ?? []));
      }
    }

    for (const hybrid of hybridRecordsFromFiles(input, ctx)) {
      const validate = validatorsByRecordType.get(hybrid.node_type);
      if (!validate) {
        continue;
      }
      if (!validate(hybrid.parsed)) {
        verdicts.push(...schemaVerdicts(hybrid, validate.errors ?? []));
      }
    }

    return verdicts;
  }
};

interface SchemaTarget {
  node_id: string;
  node_type: string;
  file_path: string;
  parsed: unknown;
}

function schemaVerdicts(record: SchemaTarget, errors: ErrorObject[]): Verdict[] {
  return errors.map((error) => ({
    validator: "record_schema_compliance",
    severity: "fail",
    code: `record_schema_compliance.${error.keyword}`,
    message: `${record.node_id} schema violation at ${error.instancePath || "/"}: ${error.message ?? error.keyword}`,
    location: {
      file: record.file_path,
      node_id: record.node_id
    }
  }));
}

function loadSchemaValidators(): Map<string, ValidateFunction> {
  const schemaRoot = path.resolve(__dirname, "../../../src/schemas");
  const sharedSchema = JSON.parse(readFileSync(path.join(schemaRoot, "_shared/extension-entry.schema.json"), "utf8")) as AnySchema;
  ajv.addSchema(sharedSchema);

  const validators = new Map<string, ValidateFunction>();
  for (const [recordType, schemaName] of Object.entries(RECORD_TYPE_TO_SCHEMA)) {
    const schema = JSON.parse(readFileSync(path.join(schemaRoot, `${schemaName}.schema.json`), "utf8")) as AnySchema;
    const validate = ajv.compile(schema);
    validators.set(recordType, validate);
  }
  return validators;
}

function hybridRecordsFromFiles(input: unknown, ctx: Context): SchemaTarget[] {
  const records: SchemaTarget[] = [];
  for (const file of fileInputsFrom(input, ctx)) {
    const normalizedPath = toPosixPath(file.path);
    if (!isInIncrementalScope(normalizedPath, ctx)) {
      continue;
    }
    if (normalizedPath.startsWith("characters/")) {
      const frontmatter = frontmatterFor(file.content);
      if (frontmatter !== null) {
        const parsed = parseYamlSurface(frontmatter);
        if (!parsed) {
          continue;
        }
        records.push({
          node_id: String(asPlainRecord(parsed).character_id ?? normalizedPath),
          node_type: "character_record",
          file_path: normalizedPath,
          parsed
        });
      }
    }
    if (normalizedPath.startsWith("diegetic-artifacts/")) {
      const frontmatter = frontmatterFor(file.content);
      if (frontmatter !== null) {
        const parsed = parseYamlSurface(frontmatter);
        if (!parsed) {
          continue;
        }
        records.push({
          node_id: String(asPlainRecord(parsed).artifact_id ?? normalizedPath),
          node_type: "diegetic_artifact_record",
          file_path: normalizedPath,
          parsed
        });
      }
    }
    if (normalizedPath.startsWith("adjudications/")) {
      const frontmatter = frontmatterFor(file.content);
      const parsed = frontmatter === null ? {} : parseYamlSurface(frontmatter);
      if (!parsed) {
        continue;
      }
      records.push({
        node_id: String(asPlainRecord(parsed).pa_id ?? normalizedPath),
        node_type: "adjudication_record",
        file_path: normalizedPath,
        parsed
      });
    }
  }
  return records;
}

function parseYamlSurface(content: string): unknown | null {
  try {
    return yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch {
    return null;
  }
}

function isInIncrementalScope(filePath: string, ctx: Context): boolean {
  if (ctx.run_mode !== "incremental" || ctx.touched_files.length === 0) {
    return true;
  }
  const touched = new Set(ctx.touched_files.map(toPosixPath));
  return touched.has(toPosixPath(filePath));
}
