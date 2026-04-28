import { readFileSync } from "node:fs";
import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { DELIVERY_MODES } from "./context-packet/shared";
import { TASK_TYPES } from "./ranking/profiles";
import { allocateNextId } from "./tools/allocate-next-id";
import { findEditAnchors } from "./tools/find-edit-anchors";
import { findImpactedFragments } from "./tools/find-impacted-fragments";
import { findNamedEntities } from "./tools/find-named-entities";
import { findSectionsTouchedBy } from "./tools/find-sections-touched-by";
import { getCanonicalVocabulary, VOCABULARY_CLASSES } from "./tools/get-canonical-vocabulary";
import { getContextPacket } from "./tools/get-context-packet";
import { getNeighbors } from "./tools/get-neighbors";
import { getNode } from "./tools/get-node";
import { getRecord } from "./tools/get-record";
import { getRecordField } from "./tools/get-record-field";
import { getRecordSchema, SUPPORTED_RECORD_SCHEMA_NODE_TYPES } from "./tools/get-record-schema";
import { listRecords, SUPPORTED_LIST_RECORD_TYPES } from "./tools/list-records";
import { searchNodes } from "./tools/search-nodes";
import { handleSubmitPatchPlanTool } from "./tools/submit-patch-plan";
import { validatePatchPlan } from "./tools/validate-patch-plan";
import {
  MCP_TOOL_NAMES,
  MCP_TOOL_ORDER,
  type McpToolName,
  type ToolKey
} from "./tool-names";
import type { McpError } from "./errors";

function readPackageVersion(): string {
  const packageJsonPath = path.join(__dirname, "..", "..", "package.json");
  const raw = readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version ?? "0.1.0";
}

function formatPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}

function asToolResult(payload: Record<string, unknown>, isError = false) {
  return {
    content: [
      {
        type: "text" as const,
        text: formatPayload(payload)
      }
    ],
    structuredContent: payload,
    ...(isError ? { isError: true } : {})
  };
}

function isMcpError(result: unknown): result is McpError {
  return (
    typeof result === "object" &&
    result !== null &&
    "code" in result &&
    "message" in result &&
    typeof (result as { code: unknown }).code === "string" &&
    typeof (result as { message: unknown }).message === "string"
  );
}

const searchNodesInputSchema = z.object({
  query: z.string().min(1),
  filters: z
    .object({
      world_slug: z.string().min(1).optional(),
      node_type: z.string().min(1).optional(),
      file_path: z.string().min(1).optional(),
      entity_name: z.string().min(1).optional()
    })
    .optional(),
  ranking_profile: z.record(z.string(), z.number()).optional(),
  exhaustive: z.boolean().optional()
});

const getNodeInputSchema = z.object({
  node_id: z.string().min(1),
  world_slug: z.string().min(1).optional()
});

const getRecordInputSchema = z.object({
  record_id: z.string().min(1),
  world_slug: z.string().min(1).optional()
});

const listRecordsInputSchema = z.object({
  world_slug: z.string().min(1),
  record_type: z.enum(SUPPORTED_LIST_RECORD_TYPES),
  fields: z.array(z.string().min(1)).optional()
});

const getRecordFieldInputSchema = z.object({
  record_id: z.string().min(1),
  field_path: z.array(z.union([z.string(), z.number().int()])).min(1),
  world_slug: z.string().min(1).optional()
});

const getRecordSchemaInputSchema = z.object({
  node_type: z.enum(SUPPORTED_RECORD_SCHEMA_NODE_TYPES)
});

const getNeighborsInputSchema = z.object({
  node_id: z.string().min(1),
  world_slug: z.string().min(1).optional(),
  edge_types: z.array(z.string().min(1)).optional(),
  depth: z.union([z.literal(1), z.literal(2)]).default(1)
});

const getContextPacketInputSchema = z.object({
  task_type: z.enum(TASK_TYPES),
  world_slug: z.string().min(1),
  seed_nodes: z.array(z.string().min(1)).min(1),
  token_budget: z.number().int().positive().optional(),
  delivery_mode: z.enum(DELIVERY_MODES).optional()
});

const findImpactedFragmentsInputSchema = z.object({
  world_slug: z.string().min(1),
  node_ids: z.array(z.string().min(1))
});

const findSectionsTouchedByInputSchema = z.object({
  cf_id: z.string().regex(/^CF-\d{4}$/),
  world_slug: z.string().min(1)
});

const findNamedEntitiesInputSchema = z.object({
  world_slug: z.string().min(1),
  names: z.array(z.string().min(1))
});

const findEditAnchorsInputSchema = z.object({
  world_slug: z.string().min(1),
  targets: z.array(z.string().min(1))
});

const getCanonicalVocabularyInputSchema = z.object({
  class: z.enum(VOCABULARY_CLASSES)
});

const patchPlanInputSchema = z.object({}).passthrough();

const validatePatchPlanInputSchema = z.object({
  patch_plan: patchPlanInputSchema
});

const submitPatchPlanInputSchema = z.object({
  patch_plan: patchPlanInputSchema,
  approval_token: z.string().min(1)
});

export const ID_CLASSES = [
  "CF",
  "CH",
  "PA",
  "CHAR",
  "DA",
  "PR",
  "BATCH",
  "NCP",
  "NCB",
  "AU",
  "RP",
  "M",
  "ONT",
  "CAU",
  "DIS",
  "SOC",
  "AES",
  "OQ",
  "ENT",
  "SEC-ELF",
  "SEC-INS",
  "SEC-MTS",
  "SEC-GEO",
  "SEC-ECR",
  "SEC-PAS",
  "SEC-TML"
] as const;

const allocateNextIdInputSchema = z.object({
  world_slug: z.string().min(1),
  id_class: z.enum(ID_CLASSES)
});

function registerWrappedTool<TArgs extends Record<string, unknown>>(
  server: McpServer,
  key: ToolKey,
  description: string,
  inputSchema: z.ZodType<TArgs>,
  handler: (args: TArgs) => Promise<object | McpError>
): void {
  server.registerTool(
    MCP_TOOL_NAMES[key],
    {
      description,
      inputSchema
    },
    async (args: TArgs) => {
      const result = await handler(args);
      return isMcpError(result)
        ? asToolResult(result as unknown as Record<string, unknown>, true)
        : asToolResult(result as Record<string, unknown>);
    }
  );
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "worldloom",
    version: readPackageVersion()
  });

  registerWrappedTool(
    server,
    "search_nodes",
    "Search indexed world nodes with exact-match-first retrieval ordering.",
    searchNodesInputSchema,
    async (args) => searchNodes(args as unknown as Parameters<typeof searchNodes>[0])
  );
  registerWrappedTool(
    server,
    "get_node",
    "Fetch a node with body, edges, mentions, hashes, and anchor details.",
    getNodeInputSchema,
    async (args) => getNode(args as unknown as Parameters<typeof getNode>[0])
  );
  registerWrappedTool(
    server,
    "get_record",
    "get_record: Fetch an atomic record's parsed YAML content with content_hash and file_path.",
    getRecordInputSchema,
    async (args) => getRecord(args as unknown as Parameters<typeof getRecord>[0])
  );
  registerWrappedTool(
    server,
    "list_records",
    "list_records: Return all records of a given atomic record type, with optional field projection.",
    listRecordsInputSchema,
    async (args) => listRecords(args as unknown as Parameters<typeof listRecords>[0])
  );
  registerWrappedTool(
    server,
    "get_record_field",
    "get_record_field: Fetch one field from an atomic record without returning the full parsed record.",
    getRecordFieldInputSchema,
    async (args) => getRecordField(args as unknown as Parameters<typeof getRecordField>[0])
  );
  registerWrappedTool(
    server,
    "get_record_schema",
    "get_record_schema: Return the validator JSON Schema and referenced schemas for a record node type.",
    getRecordSchemaInputSchema,
    async (args) => getRecordSchema(args as unknown as Parameters<typeof getRecordSchema>[0])
  );
  registerWrappedTool(
    server,
    "get_neighbors",
    "Expand graph neighbors around a seed node across one or two hops.",
    getNeighborsInputSchema,
    async (args) => getNeighbors(args as unknown as Parameters<typeof getNeighbors>[0])
  );
  registerWrappedTool(
    server,
    "get_context_packet",
    "Assemble a bounded context packet for a retrieval task.",
    getContextPacketInputSchema,
    async (args) => getContextPacket(args as unknown as Parameters<typeof getContextPacket>[0])
  );
  registerWrappedTool(
    server,
    "find_impacted_fragments",
    "Find downstream world fragments impacted by proposed node mutations.",
    findImpactedFragmentsInputSchema,
    async (args) => findImpactedFragments(args as unknown as Parameters<typeof findImpactedFragments>[0])
  );
  registerWrappedTool(
    server,
    "find_sections_touched_by",
    "mcp__worldloom__find_sections_touched_by: Reverse-index CF to SEC lookup across touched_by_cf and extension attribution.",
    findSectionsTouchedByInputSchema,
    async (args) => findSectionsTouchedBy(args as unknown as Parameters<typeof findSectionsTouchedBy>[0])
  );
  registerWrappedTool(
    server,
    "find_named_entities",
    "Resolve exact canonical and unresolved surface-name matches. For region/era descriptors and compound tokens that may not match an indexed entity exactly, use search_nodes(query=...) for content lookup.",
    findNamedEntitiesInputSchema,
    async (args) => findNamedEntities(args as unknown as Parameters<typeof findNamedEntities>[0])
  );
  registerWrappedTool(
    server,
    "find_edit_anchors",
    "Return anchor checksums, content hashes, and anchor text for targets.",
    findEditAnchorsInputSchema,
    async (args) => findEditAnchors(args as unknown as Parameters<typeof findEditAnchors>[0])
  );
  registerWrappedTool(
    server,
    "get_canonical_vocabulary",
    "Return canonical validator vocabulary values for skill reasoning before patch-plan submission.",
    getCanonicalVocabularyInputSchema,
    async (args) => getCanonicalVocabulary(args as unknown as Parameters<typeof getCanonicalVocabulary>[0])
  );
  registerWrappedTool(
    server,
    "validate_patch_plan",
    "Validate a patch plan envelope without mutating world content. Returns status: 'pass' | 'fail' | 'skipped' with verdicts and an optional skip reason.",
    validatePatchPlanInputSchema,
    async (args) => validatePatchPlan(args as unknown as Parameters<typeof validatePatchPlan>[0])
  );
  registerWrappedTool(
    server,
    "submit_patch_plan",
    "Submit a patch plan using an approval token through the patch engine.",
    submitPatchPlanInputSchema,
    async (args) => handleSubmitPatchPlanTool(args as unknown as Parameters<typeof handleSubmitPatchPlanTool>[0])
  );
  registerWrappedTool(
    server,
    "allocate_next_id",
    "Allocate the next append-only id for a world-specific record class.",
    allocateNextIdInputSchema,
    async (args) => allocateNextId(args as unknown as Parameters<typeof allocateNextId>[0])
  );

  return server;
}

export function getRegisteredToolNames(): McpToolName[] {
  return [...MCP_TOOL_ORDER];
}

export async function startStdioServer(): Promise<McpServer> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.resume();
  const keepAlive = setInterval(() => {}, 1 << 30);

  const closeServer = async () => {
    clearInterval(keepAlive);
    await server.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void closeServer();
  });
  process.once("SIGTERM", () => {
    void closeServer();
  });
  process.stdin.once("end", () => {
    void closeServer();
  });

  return server;
}

if (require.main === module) {
  startStdioServer()
    .then(
      async () =>
        await new Promise<void>(() => {
          // Keep the stdio server alive until a signal handler closes it.
        })
    )
    .catch((error: unknown) => {
      console.error("world-mcp server failed:", error);
      process.exit(1);
    });
}
