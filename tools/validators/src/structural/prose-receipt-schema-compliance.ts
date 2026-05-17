import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020";
import type { AnySchema, ErrorObject, ValidateFunction } from "ajv";
import yaml from "js-yaml";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, fileInputsFrom, toPosixPath, worldRootFrom } from "./utils.js";

const RECEIPT_PATH_PATTERN = /^stories\/([^/]+)\/pages-prose-receipts\/PG-(0|[1-9][0-9]*)\.yaml$/;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateReceipt = loadReceiptSchemaValidator();

export const proseReceiptSchemaCompliance: Validator = {
  name: "prose_receipt_schema_compliance",
  severity_mode: "fail",
  applies_to: (ctx: Context) => {
    if (ctx.run_mode === "pre-apply") {
      return false;
    }
    if (ctx.run_mode === "incremental") {
      return ctx.touched_files.some((file) => receiptPathMatchesScope(file, ctx));
    }
    return true;
  },
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const receipt of receiptTargets(input, ctx)) {
      const parsed = parseYamlReceipt(receipt.content);
      if (parsed === null) {
        verdicts.push({
          validator: "prose_receipt_schema_compliance",
          severity: "fail",
          code: "prose_receipt_schema_compliance.yaml_parse",
          message: `${receipt.node_id} prose receipt YAML could not be parsed`,
          location: {
            file: receipt.file_path,
            node_id: receipt.node_id
          }
        });
        continue;
      }

      if (!validateReceipt(parsed)) {
        verdicts.push(...schemaVerdicts(receipt, validateReceipt.errors ?? []));
      }
    }

    return verdicts;
  },
  skip_reason: "no prose receipt files in scope"
};

interface ReceiptTarget {
  node_id: string;
  file_path: string;
  content: string;
}

function receiptTargets(input: unknown, ctx: Context): ReceiptTarget[] {
  const explicitFiles = fileInputsFrom(input, ctx).filter((file) => receiptPathMatchesScope(file.path, ctx));
  if (explicitFiles.length > 0) {
    return explicitFiles.map((file) => ({
      node_id: nodeIdFromPath(file.path),
      file_path: toPosixPath(file.path),
      content: file.content
    }));
  }

  if (ctx.run_mode === "incremental") {
    return [];
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [];
  }

  return receiptTargetsFromWorldRoot(worldRoot, ctx);
}

function receiptTargetsFromWorldRoot(worldRoot: string, ctx: Context): ReceiptTarget[] {
  const storiesRoot = path.join(worldRoot, "stories");
  if (!existsSync(storiesRoot)) {
    return [];
  }

  const targets: ReceiptTarget[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory()) {
      continue;
    }
    if (ctx.story_slug && storyEntry.name !== ctx.story_slug) {
      continue;
    }

    const receiptDir = path.join(storiesRoot, storyEntry.name, "pages-prose-receipts");
    if (!existsSync(receiptDir)) {
      continue;
    }
    for (const receiptEntry of readdirSync(receiptDir, { withFileTypes: true })) {
      if (!receiptEntry.isFile() || !/^PG-(0|[1-9][0-9]*)\.yaml$/.test(receiptEntry.name)) {
        continue;
      }
      const relativePath = toPosixPath(path.join("stories", storyEntry.name, "pages-prose-receipts", receiptEntry.name));
      targets.push({
        node_id: nodeIdFromPath(relativePath),
        file_path: relativePath,
        content: readFileSync(path.join(receiptDir, receiptEntry.name), "utf8")
      });
    }
  }

  return targets.sort((left, right) => left.file_path.localeCompare(right.file_path, "en-US"));
}

function schemaVerdicts(record: ReceiptTarget, errors: ErrorObject[]): Verdict[] {
  return errors.map((error) => ({
    validator: "prose_receipt_schema_compliance",
    severity: "fail",
    code: `prose_receipt_schema_compliance.${error.keyword}`,
    message: `${record.node_id} prose receipt schema violation at ${error.instancePath || "/"}: ${error.message ?? error.keyword}`,
    location: {
      file: record.file_path,
      node_id: record.node_id
    }
  }));
}

function receiptPathMatchesScope(filePath: string, ctx: Context): boolean {
  const normalized = toPosixPath(filePath);
  const match = RECEIPT_PATH_PATTERN.exec(normalized);
  return match !== null && (!ctx.story_slug || match[1] === ctx.story_slug);
}

function nodeIdFromPath(filePath: string): string {
  const match = RECEIPT_PATH_PATTERN.exec(toPosixPath(filePath));
  return match ? `prose-receipt:${match[1]}:${match[2]}` : toPosixPath(filePath);
}

function parseYamlReceipt(content: string): unknown | null {
  try {
    return yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch {
    return null;
  }
}

function loadReceiptSchemaValidator(): ValidateFunction {
  const schemaRoot = path.resolve(__dirname, "../../../src/schemas");
  const schema = JSON.parse(readFileSync(path.join(schemaRoot, "prose-receipt.schema.json"), "utf8")) as AnySchema;
  return ajv.compile(schema);
}
