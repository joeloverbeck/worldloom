import { readFileSync } from "node:fs";
import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { OPERATION_KINDS } from "@worldloom/patch-engine";
import { NODE_TYPES } from "@worldloom/world-index/public/types";

import { createBuildInfo } from "./build-info";
import { DELIVERY_MODES } from "./context-packet/shared";
import { TASK_TYPES } from "./ranking/profiles";
import { allocateNextId } from "./tools/allocate-next-id";
import { describeCapabilities, type ToolCapability } from "./tools/describe-capabilities";
import { describeEnvelopeSchema } from "./tools/describe-envelope-schema";
import { findEditAnchors } from "./tools/find-edit-anchors";
import { findImpactedFragments } from "./tools/find-impacted-fragments";
import { findNamedEntities } from "./tools/find-named-entities";
import { findSectionsTouchedBy } from "./tools/find-sections-touched-by";
import { getCanonicalVocabulary, VOCABULARY_CLASSES } from "./tools/get-canonical-vocabulary";
import { getContextPacket } from "./tools/get-context-packet";
import { getFirewallContent } from "./tools/get-firewall-content";
import { getNeighbors } from "./tools/get-neighbors";
import { getPersistedPacketSlice } from "./tools/get-persisted-packet-slice";
import { getNode } from "./tools/get-node";
import { getRecord } from "./tools/get-record";
import { getRecordField } from "./tools/get-record-field";
import { getRecords } from "./tools/get-records";
import { getRecordsField } from "./tools/get-records-field";
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
  world_slug: z.string().min(1).optional(),
  section_path: z.string().min(1).optional()
});

const getRecordsInputSchema = z.object({
  record_ids: z.array(z.string().min(1)).min(1),
  world_slug: z.string().min(1).optional()
});

const getRecordsFieldInputSchema = z.object({
  record_ids: z.array(z.string().min(1)).min(1),
  field_path: z.array(z.union([z.string(), z.number().int()])).min(1),
  world_slug: z.string().min(1).optional()
});

const getPersistedPacketSliceInputSchema = z.object({
  persisted_path: z.string().min(1),
  slice_path: z.string().min(1)
});

const listRecordsInputSchema = z.object({
  world_slug: z.string().min(1),
  record_type: z.enum(SUPPORTED_LIST_RECORD_TYPES),
  fields: z.array(z.string().min(1)).optional(),
  include_full_body: z.boolean().optional()
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
  delivery_mode: z.enum(DELIVERY_MODES).optional(),
  node_classes: z.array(z.enum(NODE_TYPES)).optional()
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
  names: z.array(z.string().min(1)),
  node_type_filter: z.array(z.enum(NODE_TYPES)).optional()
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
  "NWB",
  "NWP",
  "NCP",
  "NCB",
  "AU",
  "RP",
  "EPE",
  "STORY",
  "PG",
  "SE",
  "SF",
  "OBL",
  "CNSQ",
  "THR",
  "SREL",
  "STINT",
  "SLT",
  "STLOC",
  "STOBJ",
  "BR",
  "CHC",
  "STENT",
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
  id_class: z.enum(ID_CLASSES),
  story_slug: z.string().min(1).optional()
});

const getFirewallContentInputSchema = z.object({
  world_slug: z.string().min(1),
  m_ids: z.array(z.string().min(1)).optional()
});

const describeCapabilitiesInputSchema = z.object({}).strict();

const describeEnvelopeSchemaInputSchema = z
  .object({
    op_kind: z.enum(OPERATION_KINDS).optional()
  })
  .strict();

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

  const registeredCapabilities: ToolCapability[] = [];
  const registerToolWithCapability = <TArgs extends Record<string, unknown>>(
    key: ToolKey,
    description: string,
    inputSchema: z.ZodType<TArgs>,
    handler: (args: TArgs) => Promise<object | McpError>,
    inputSchemaEnums: Record<string, readonly string[]> = {}
  ) => {
    registeredCapabilities.push({
      name: MCP_TOOL_NAMES[key],
      description,
      input_schema_enums: inputSchemaEnums
    });
    registerWrappedTool(server, key, description, inputSchema, handler);
  };

  registerToolWithCapability(
    "search_nodes",
    "Search indexed world nodes with exact-match-first retrieval ordering.",
    searchNodesInputSchema,
    async (args) => searchNodes(args as unknown as Parameters<typeof searchNodes>[0])
  );
  registerToolWithCapability(
    "get_node",
    "Fetch a node with body, edges, mentions, hashes, and anchor details.",
    getNodeInputSchema,
    async (args) => getNode(args as unknown as Parameters<typeof getNode>[0])
  );
  registerToolWithCapability(
    "get_record",
    "get_record: Fetch a record's content with content_hash and file_path. Supports atomic records (CF-NNNN, CH-NNNN, INV-*, M-NNNN, OQ-NNNN, ENT-NNNN, SEC-*-NNN) returning parsed YAML, and hybrid records (CHAR-NNNN, DA-NNNN, PA-NNNN) returning parsed frontmatter plus body sections. Optional section_path projects a hybrid record subset, e.g. 'frontmatter.world_consistency' or 'body.Capabilities'.",
    getRecordInputSchema,
    async (args) => getRecord(args as unknown as Parameters<typeof getRecord>[0])
  );
  registerToolWithCapability(
    "get_records",
    "get_records: Fetch multiple records by id in one call. Returns one ordered entry per requested id, wrapping the same successful response shape as get_record or a per-id error without aborting the batch.",
    getRecordsInputSchema,
    async (args) => getRecords(args as unknown as Parameters<typeof getRecords>[0])
  );
  registerToolWithCapability(
    "get_records_field",
    "get_records_field: Fetch one field from multiple parsed atomic records in one ordered response. Returns per-id field_value entries or per-id errors without aborting the batch.",
    getRecordsFieldInputSchema,
    async (args) => getRecordsField(args as unknown as Parameters<typeof getRecordsField>[0])
  );
  registerToolWithCapability(
    "get_persisted_packet_slice",
    "get_persisted_packet_slice: Read a structured dot-path slice from a package-persisted full context packet emitted by get_context_packet delivery_status='persisted_with_summary'.",
    getPersistedPacketSliceInputSchema,
    async (args) => getPersistedPacketSlice(args as unknown as Parameters<typeof getPersistedPacketSlice>[0])
  );
  registerToolWithCapability(
    "list_records",
    "list_records: Return all records of a given atomic record type, with optional field projection or include_full_body metadata/body records.",
    listRecordsInputSchema,
    async (args) => listRecords(args as unknown as Parameters<typeof listRecords>[0]),
    { record_type: SUPPORTED_LIST_RECORD_TYPES }
  );
  registerToolWithCapability(
    "get_record_field",
    "get_record_field: Fetch one field from an atomic record without returning the full parsed record.",
    getRecordFieldInputSchema,
    async (args) => getRecordField(args as unknown as Parameters<typeof getRecordField>[0])
  );
  registerToolWithCapability(
    "get_record_schema",
    "get_record_schema: Return the validator JSON Schema and referenced schemas for a record node type.",
    getRecordSchemaInputSchema,
    async (args) => getRecordSchema(args as unknown as Parameters<typeof getRecordSchema>[0]),
    { node_type: SUPPORTED_RECORD_SCHEMA_NODE_TYPES }
  );
  registerToolWithCapability(
    "get_neighbors",
    "Expand graph neighbors around a seed node across one or two hops.",
    getNeighborsInputSchema,
    async (args) => getNeighbors(args as unknown as Parameters<typeof getNeighbors>[0])
  );
  registerToolWithCapability(
    "get_context_packet",
    "Assemble a bounded context packet for a retrieval task.",
    getContextPacketInputSchema,
    async (args) => getContextPacket(args as unknown as Parameters<typeof getContextPacket>[0]),
    { task_type: TASK_TYPES, delivery_mode: DELIVERY_MODES, node_classes: NODE_TYPES }
  );
  registerToolWithCapability(
    "find_impacted_fragments",
    "Find downstream world fragments impacted by proposed node mutations.",
    findImpactedFragmentsInputSchema,
    async (args) => findImpactedFragments(args as unknown as Parameters<typeof findImpactedFragments>[0])
  );
  registerToolWithCapability(
    "find_sections_touched_by",
    "mcp__worldloom__find_sections_touched_by: Reverse-index CF to SEC lookup across touched_by_cf and extension attribution.",
    findSectionsTouchedByInputSchema,
    async (args) => findSectionsTouchedBy(args as unknown as Parameters<typeof findSectionsTouchedBy>[0])
  );
  registerToolWithCapability(
    "find_named_entities",
    "Resolve exact canonical and unresolved surface-name matches. Region/era descriptor hints include capped matching_record_ids for direct get_record lookup, with search_nodes(query=...) as the broad fallback.",
    findNamedEntitiesInputSchema,
    async (args) => findNamedEntities(args as unknown as Parameters<typeof findNamedEntities>[0]),
    { node_type_filter: NODE_TYPES }
  );
  registerToolWithCapability(
    "find_edit_anchors",
    "Return anchor checksums, content hashes, and anchor text for targets.",
    findEditAnchorsInputSchema,
    async (args) => findEditAnchors(args as unknown as Parameters<typeof findEditAnchors>[0])
  );
  registerToolWithCapability(
    "get_canonical_vocabulary",
    "Return canonical validator vocabulary values for skill reasoning before patch-plan submission.",
    getCanonicalVocabularyInputSchema,
    async (args) => getCanonicalVocabulary(args as unknown as Parameters<typeof getCanonicalVocabulary>[0]),
    { class: VOCABULARY_CLASSES }
  );
  registerToolWithCapability(
    "validate_patch_plan",
    "Validate a patch plan envelope without mutating world content. Returns status: 'pass' | 'fail' | 'skipped' with verdicts and an optional skip reason.",
    validatePatchPlanInputSchema,
    async (args) => validatePatchPlan(args as unknown as Parameters<typeof validatePatchPlan>[0])
  );
  registerToolWithCapability(
    "submit_patch_plan",
    "Submit a patch plan using an approval token through the patch engine.",
    submitPatchPlanInputSchema,
    async (args) => handleSubmitPatchPlanTool(args as unknown as Parameters<typeof handleSubmitPatchPlanTool>[0])
  );
  registerToolWithCapability(
    "allocate_next_id",
    "Allocate the next append-only id for a world-specific, story-bundle-scoped, or pipeline-scoped record class.",
    allocateNextIdInputSchema,
    async (args) => allocateNextId(args as unknown as Parameters<typeof allocateNextId>[0]),
    { id_class: ID_CLASSES }
  );
  registerToolWithCapability(
    "get_firewall_content",
    "get_firewall_content: Bulk retrieval of Mystery Reserve firewall fields (title, status, unknowns, common_interpretations, disallowed_cheap_answers) keyed by M-id. Optional m_ids filter; defaults to every M record in the world. Use for Phase 7b firewall audits to avoid budget-pressured packet calls or N per-record get_record calls.",
    getFirewallContentInputSchema,
    async (args) => getFirewallContent(args as unknown as Parameters<typeof getFirewallContent>[0])
  );

  const describeCapability: ToolCapability = {
    name: MCP_TOOL_NAMES.describe_capabilities,
    description: "Return this MCP server's startup build metadata, registered tool names, and enum-valued input contracts.",
    input_schema_enums: {}
  };
  const describeEnvelopeCapability: ToolCapability = {
    name: MCP_TOOL_NAMES.describe_envelope_schema,
    description:
      "Return the patch-plan envelope schema and per-operation payload schemas for validate_patch_plan and submit_patch_plan.",
    input_schema_enums: { op_kind: OPERATION_KINDS }
  };
  registerToolWithCapability(
    "describe_envelope_schema",
    describeEnvelopeCapability.description,
    describeEnvelopeSchemaInputSchema,
    async (args) => describeEnvelopeSchema(args as unknown as Parameters<typeof describeEnvelopeSchema>[0]),
    describeEnvelopeCapability.input_schema_enums
  );

  const describedTools = [...registeredCapabilities, describeCapability];
  const buildInfo = createBuildInfo(describedTools);
  registerWrappedTool(
    server,
    "describe_capabilities",
    describeCapability.description,
    describeCapabilitiesInputSchema,
    async () => describeCapabilities({ buildInfo, tools: describedTools })
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
