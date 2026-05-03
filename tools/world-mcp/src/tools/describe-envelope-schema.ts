import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { OPERATION_KINDS, type OperationKind } from "@worldloom/patch-engine";

import { MCP_TOOL_NAMES } from "../tool-names";

type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonObject | JsonValue[] | string | number | boolean | null;

export interface DescribeEnvelopeSchemaArgs {
  op_kind?: OperationKind;
}

export interface DescribeEnvelopeSchemaResponse {
  tool_names: {
    validate_patch_plan: string;
    submit_patch_plan: string;
  };
  source_paths: string[];
  envelope_schema: JsonObject;
  op_schemas: Record<string, JsonObject>;
  referenced_schemas: Record<string, JsonObject>;
}

const ID_ALLOCATION_KEYS = [
  "cf_ids",
  "ch_ids",
  "inv_ids",
  "m_ids",
  "oq_ids",
  "ent_ids",
  "sec_ids",
  "pa_ids",
  "char_ids",
  "da_ids"
] as const;

const RECORD_SCHEMA_BY_PAYLOAD_KEY = {
  cf_record: "canon-fact-record.schema.json",
  ch_record: "change-log-entry.schema.json",
  inv_record: "invariant.schema.json",
  m_record: "mystery-reserve.schema.json",
  oq_record: "open-question.schema.json",
  ent_record: "entity.schema.json",
  sec_record: "section.schema.json",
  adjudication_frontmatter: "adjudication-frontmatter.schema.json",
  char_record: "character-frontmatter.schema.json",
  da_record: "diegetic-artifact-frontmatter.schema.json"
} as const;

const schemaCache = new Map<string, JsonObject>();

function findRepoRoot(): string {
  const starts = [process.cwd(), __dirname];

  for (const start of starts) {
    let current = path.resolve(start);

    while (true) {
      if (existsSync(path.join(current, "tools", "validators", "src", "schemas"))) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return path.resolve(__dirname, "..", "..", "..", "..", "..");
}

function validatorsSchemaRoot(): string {
  return path.join(findRepoRoot(), "tools", "validators", "src", "schemas");
}

function parseJsonSchema(filePath: string): JsonObject {
  const cached = schemaCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as JsonObject;
  schemaCache.set(filePath, parsed);
  return parsed;
}

function readSchema(filename: string): JsonObject {
  return parseJsonSchema(path.join(validatorsSchemaRoot(), filename));
}

function schemaRef(payloadKey: keyof typeof RECORD_SCHEMA_BY_PAYLOAD_KEY): string {
  const schema = readSchema(RECORD_SCHEMA_BY_PAYLOAD_KEY[payloadKey]);
  const id = schema.$id;
  if (typeof id !== "string") {
    throw new Error(`${RECORD_SCHEMA_BY_PAYLOAD_KEY[payloadKey]} is missing $id.`);
  }
  return id;
}

function stringSchema(pattern?: string): JsonObject {
  return pattern === undefined
    ? { type: "string", minLength: 1 }
    : { type: "string", minLength: 1, pattern };
}

function stringArraySchema(pattern?: string): JsonObject {
  return {
    type: "array",
    items: stringSchema(pattern)
  };
}

function idAllocationsSchema(): JsonObject {
  return {
    type: "object",
    additionalProperties: true,
    properties: Object.fromEntries(ID_ALLOCATION_KEYS.map((key) => [key, stringArraySchema()]))
  };
}

function envelopeSchema(opKinds: readonly OperationKind[]): JsonObject {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://worldloom.local/schemas/patch-plan-envelope.schema.json",
    title: "PatchPlanEnvelope",
    type: "object",
    additionalProperties: true,
    required: [
      "plan_id",
      "target_world",
      "approval_token",
      "verdict",
      "originating_skill",
      "expected_id_allocations",
      "patches"
    ],
    properties: {
      plan_id: stringSchema(),
      target_world: stringSchema(),
      approval_token: stringSchema(),
      verdict: stringSchema(),
      originating_skill: stringSchema(),
      originating_cf_ids: stringArraySchema("^CF-[0-9]{4}$"),
      originating_ch_id: stringSchema("^CH-[0-9]{4}$"),
      originating_pa_id: stringSchema("^PA-[0-9]{4}$"),
      expected_id_allocations: idAllocationsSchema(),
      patches: {
        type: "array",
        minItems: 1,
        items: {
          oneOf: opKinds.map((kind) => ({
            $ref: `https://worldloom.local/schemas/patch-operations/${kind}.schema.json`
          }))
        }
      }
    }
  };
}

function baseOperationProperties(kind: OperationKind, payloadSchema: JsonObject): JsonObject {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://worldloom.local/schemas/patch-operations/${kind}.schema.json`,
    title: `PatchOperation.${kind}`,
    type: "object",
    additionalProperties: true,
    required: ["op", "target_world", "target_file", "payload"],
    properties: {
      op: { const: kind },
      target_world: stringSchema(),
      target_file: stringSchema(),
      target_record_id: stringSchema(),
      expected_content_hash: stringSchema(),
      expected_anchor_checksum: stringSchema(),
      failure_mode: { type: "string", enum: ["strict", "relocate_on_miss"] },
      payload: payloadSchema
    }
  };
}

function payloadWithRecord(payloadKey: keyof typeof RECORD_SCHEMA_BY_PAYLOAD_KEY): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    required: [payloadKey],
    properties: {
      [payloadKey]: { $ref: schemaRef(payloadKey) }
    }
  };
}

function operationSchema(kind: OperationKind): JsonObject {
  switch (kind) {
    case "create_cf_record":
      return baseOperationProperties(kind, payloadWithRecord("cf_record"));
    case "create_ch_record":
      return baseOperationProperties(kind, payloadWithRecord("ch_record"));
    case "create_inv_record":
      return baseOperationProperties(kind, payloadWithRecord("inv_record"));
    case "create_m_record":
      return baseOperationProperties(kind, payloadWithRecord("m_record"));
    case "create_oq_record":
      return baseOperationProperties(kind, payloadWithRecord("oq_record"));
    case "create_ent_record":
      return baseOperationProperties(kind, payloadWithRecord("ent_record"));
    case "create_sec_record":
      return baseOperationProperties(kind, payloadWithRecord("sec_record"));
    case "update_record_field":
      return baseOperationProperties(kind, {
        type: "object",
        additionalProperties: false,
        required: ["target_record_id", "field_path", "operation", "new_value"],
        properties: {
          target_record_id: stringSchema(),
          field_path: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
          operation: { type: "string", enum: ["set", "append_list", "append_text"] },
          new_value: {},
          retcon_attestation: retconAttestationSchema()
        }
      });
    case "remove_ch_affected_cf_ids":
      return baseOperationProperties(kind, {
        type: "object",
        additionalProperties: false,
        required: ["target_ch_id"],
        properties: {
          target_ch_id: stringSchema("^CH-[0-9]{4}$")
        }
      });
    case "append_extension":
      return baseOperationProperties(kind, {
        type: "object",
        additionalProperties: false,
        required: ["target_record_id", "extension"],
        properties: {
          target_record_id: stringSchema(),
          extension: extensionPayloadSchema()
        }
      });
    case "append_touched_by_cf":
      return baseOperationProperties(kind, {
        type: "object",
        additionalProperties: false,
        required: ["target_sec_id", "cf_id"],
        properties: {
          target_sec_id: stringSchema("^SEC-[A-Z]{3}-[0-9]{3}$"),
          cf_id: stringSchema("^CF-[0-9]{4}$")
        }
      });
    case "append_modification_history_entry":
      return baseOperationProperties(kind, {
        type: "object",
        additionalProperties: false,
        required: ["target_cf_id", "change_id", "originating_cf", "date", "summary"],
        properties: {
          target_cf_id: stringSchema("^CF-[0-9]{4}$"),
          change_id: stringSchema("^CH-[0-9]{4}$"),
          originating_cf: stringSchema("^CF-[0-9]{4}$"),
          date: { type: "string", minLength: 1, format: "date" },
          summary: stringSchema()
        }
      });
    case "append_adjudication_record":
      return baseOperationProperties(kind, {
        type: "object",
        additionalProperties: false,
        required: ["adjudication_frontmatter", "body_markdown"],
        properties: {
          adjudication_frontmatter: { $ref: schemaRef("adjudication_frontmatter") },
          body_markdown: stringSchema(),
          filename: stringSchema()
        }
      });
    case "append_character_record":
      return baseOperationProperties(kind, {
        type: "object",
        additionalProperties: false,
        required: ["char_record", "body_markdown", "filename"],
        properties: {
          char_record: { $ref: schemaRef("char_record") },
          body_markdown: stringSchema(),
          filename: stringSchema()
        }
      });
    case "append_diegetic_artifact_record":
      return baseOperationProperties(kind, {
        type: "object",
        additionalProperties: false,
        required: ["da_record", "body_markdown", "filename"],
        properties: {
          da_record: { $ref: schemaRef("da_record") },
          body_markdown: stringSchema(),
          filename: stringSchema()
        }
      });
  }
}

function retconAttestationSchema(): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    required: ["retcon_type", "originating_ch", "rationale"],
    properties: {
      retcon_type: { type: "string", enum: ["A", "B", "C", "D", "E", "F"] },
      originating_ch: stringSchema("^CH-[0-9]{4}$"),
      rationale: stringSchema()
    }
  };
}

function extensionPayloadSchema(): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    required: ["originating_cf", "change_id", "date", "label", "body"],
    properties: {
      originating_cf: stringSchema("^CF-[0-9]{4}$"),
      change_id: stringSchema("^CH-[0-9]{4}$"),
      date: { type: "string", minLength: 1, format: "date" },
      label: stringSchema(),
      body: stringSchema()
    }
  };
}

function collectReferencedSchemas(opKinds: readonly OperationKind[]): Record<string, JsonObject> {
  const referenced: Record<string, JsonObject> = {};

  for (const schema of Object.values(RECORD_SCHEMA_BY_PAYLOAD_KEY)) {
    const parsed = readSchema(schema);
    const id = parsed.$id;
    if (typeof id !== "string") {
      continue;
    }

    if (
      opKinds.some((kind) =>
        JSON.stringify(operationSchema(kind)).includes(id)
      )
    ) {
      referenced[id] = parsed;
    }
  }

  const extensionSchema = readSchema("_shared/extension-entry.schema.json");
  const extensionId = extensionSchema.$id;
  if (typeof extensionId === "string") {
    referenced[extensionId] = extensionSchema;
  }

  return referenced;
}

export async function describeEnvelopeSchema(
  args: DescribeEnvelopeSchemaArgs = {}
): Promise<DescribeEnvelopeSchemaResponse> {
  const opKinds = args.op_kind === undefined ? [...OPERATION_KINDS] : [args.op_kind];
  const opSchemas = Object.fromEntries(opKinds.map((kind) => [kind, operationSchema(kind)]));

  return {
    tool_names: {
      validate_patch_plan: MCP_TOOL_NAMES.validate_patch_plan,
      submit_patch_plan: MCP_TOOL_NAMES.submit_patch_plan
    },
    source_paths: [
      "tools/world-mcp/src/tools/_shared.ts",
      "tools/patch-engine/src/envelope/schema.ts",
      "tools/validators/src/schemas/*.schema.json"
    ],
    envelope_schema: envelopeSchema(opKinds),
    op_schemas: opSchemas,
    referenced_schemas: collectReferencedSchemas(opKinds)
  };
}
