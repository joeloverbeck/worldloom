import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  EPISTEMIC_PROFILE_REQUIRED_TYPES,
  EXCEPTION_GOVERNANCE_REQUIRED_TYPES
} from "@worldloom/validators";

import { createMcpError, type McpError } from "../errors";

type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonObject | JsonValue[] | string | number | boolean | null;

export const SUPPORTED_RECORD_SCHEMA_NODE_TYPES = [
  "canon_fact_record",
  "change_log_entry",
  "invariant",
  "mystery_reserve_entry",
  "open_question_entry",
  "named_entity",
  "section",
  "character_record",
  "diegetic_artifact_record",
  "adjudication_record",
  "extension_entry",
  "story_entity_record",
  "story_fact_record",
  "story_event_record",
  "obligation_record",
  "consequence_record",
  "thread_record",
  "relationship_record_story",
  "intention_record",
  "story_location_record",
  "story_object_record",
  "branch_record",
  "page_record",
  "choice_record",
  "storylet_record",
  "belief_record",
  "story_diegetic_artifact_record"
] as const;

export type SupportedRecordSchemaNodeType = (typeof SUPPORTED_RECORD_SCHEMA_NODE_TYPES)[number];

export interface GetRecordSchemaArgs {
  node_type: SupportedRecordSchemaNodeType;
}

export interface GetRecordSchemaResponse {
  node_type: SupportedRecordSchemaNodeType;
  schema: JsonObject;
  source_path: string;
  referenced_schemas: Record<string, JsonObject>;
  required_fields: string[];
  conditional_blocks: Record<string, JsonValue>;
}

const NODE_TYPE_TO_SCHEMA_FILE: Record<SupportedRecordSchemaNodeType, string> = {
  canon_fact_record: "canon-fact-record.schema.json",
  change_log_entry: "change-log-entry.schema.json",
  invariant: "invariant.schema.json",
  mystery_reserve_entry: "mystery-reserve.schema.json",
  open_question_entry: "open-question.schema.json",
  named_entity: "entity.schema.json",
  section: "section.schema.json",
  character_record: "character-frontmatter.schema.json",
  diegetic_artifact_record: "diegetic-artifact-frontmatter.schema.json",
  adjudication_record: "adjudication-frontmatter.schema.json",
  extension_entry: "_shared/extension-entry.schema.json",
  story_entity_record: "story-entity.schema.json",
  story_fact_record: "story-fact.schema.json",
  story_event_record: "story-event.schema.json",
  obligation_record: "story-obligation.schema.json",
  consequence_record: "story-consequence.schema.json",
  thread_record: "story-thread.schema.json",
  relationship_record_story: "story-relationship.schema.json",
  intention_record: "story-intention.schema.json",
  story_location_record: "story-location.schema.json",
  story_object_record: "story-object.schema.json",
  branch_record: "story-branch.schema.json",
  page_record: "story-page.schema.json",
  choice_record: "story-choice.schema.json",
  storylet_record: "story-storylet.schema.json",
  belief_record: "story-belief.schema.json",
  story_diegetic_artifact_record: "story-diegetic-artifact.schema.json"
};

const schemaCache = new Map<string, JsonObject>();

function isSupportedNodeType(value: string): value is SupportedRecordSchemaNodeType {
  return (SUPPORTED_RECORD_SCHEMA_NODE_TYPES as readonly string[]).includes(value);
}

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

function collectRefs(value: JsonValue, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefs(item, refs);
    }
    return;
  }

  if (typeof value !== "object" || value === null) {
    return;
  }

  const ref = value.$ref;
  if (typeof ref === "string") {
    refs.add(ref);
  }

  for (const child of Object.values(value)) {
    collectRefs(child, refs);
  }
}

function resolveSchemaRef(schemaRoot: string, ref: string): string | null {
  if (ref.startsWith("#")) {
    return null;
  }

  const filename = path.basename(new URL(ref).pathname);
  const candidates = [
    path.join(schemaRoot, filename),
    path.join(schemaRoot, "_shared", filename)
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function collectReferencedSchemas(
  schemaRoot: string,
  schema: JsonObject
): Record<string, JsonObject> {
  const referencedSchemas: Record<string, JsonObject> = {};
  const pending = new Set<string>();
  const visited = new Set<string>();
  collectRefs(schema, pending);

  while (pending.size > 0) {
    const ref = pending.values().next().value as string;
    pending.delete(ref);

    if (visited.has(ref)) {
      continue;
    }
    visited.add(ref);

    const refPath = resolveSchemaRef(schemaRoot, ref);
    if (refPath === null) {
      continue;
    }

    const refSchema = parseJsonSchema(refPath);
    const refId = refSchema.$id;
    if (typeof refId === "string") {
      referencedSchemas[refId] = refSchema;
    }

    const nestedRefs = new Set<string>();
    collectRefs(refSchema, nestedRefs);
    for (const nestedRef of nestedRefs) {
      if (!visited.has(nestedRef)) {
        pending.add(nestedRef);
      }
    }
  }

  return referencedSchemas;
}

function requiredFields(schema: JsonObject): string[] {
  return Array.isArray(schema.required)
    ? schema.required.filter((field): field is string => typeof field === "string")
    : [];
}

function conditionalBlocks(nodeType: SupportedRecordSchemaNodeType): Record<string, JsonValue> {
  if (nodeType !== "canon_fact_record") {
    return {};
  }

  return {
    epistemic_profile: {
      required_for_types: [...EPISTEMIC_PROFILE_REQUIRED_TYPES]
    },
    exception_governance: {
      required_for_types: [...EXCEPTION_GOVERNANCE_REQUIRED_TYPES]
    }
  };
}

export async function getRecordSchema(
  args: GetRecordSchemaArgs
): Promise<GetRecordSchemaResponse | McpError> {
  if (!isSupportedNodeType(args.node_type)) {
    return createMcpError("invalid_input", `Unsupported record schema node_type '${args.node_type}'.`, {
      supported_node_types: [...SUPPORTED_RECORD_SCHEMA_NODE_TYPES]
    });
  }

  const schemaRoot = validatorsSchemaRoot();
  const schemaFile = NODE_TYPE_TO_SCHEMA_FILE[args.node_type];
  const schemaPath = path.join(schemaRoot, schemaFile);
  const schema = parseJsonSchema(schemaPath);

  return {
    node_type: args.node_type,
    schema,
    source_path: path.join("tools", "validators", "src", "schemas", schemaFile),
    referenced_schemas: collectReferencedSchemas(schemaRoot, schema),
    required_fields: requiredFields(schema),
    conditional_blocks: conditionalBlocks(args.node_type)
  };
}
