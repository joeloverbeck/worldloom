import { readFileSync } from "node:fs";
import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { createBuildInfo } from "./build-info.js";
import { DELIVERY_MODES } from "./context-packet/shared.js";
import { isMainModule } from "./esm-main.js";
import { NODE_TYPES, OPERATION_KINDS } from "./package-interop.js";
import { TASK_TYPES } from "./ranking/profiles/index.js";
import { allocateManyIds } from "./tools/allocate-many-ids.js";
import { allocateNextId } from "./tools/allocate-next-id.js";
import { describeCapabilities, type ToolCapability } from "./tools/describe-capabilities.js";
import { describeEnvelopeSchema } from "./tools/describe-envelope-schema.js";
import { findEditAnchors } from "./tools/find-edit-anchors.js";
import { findImpactedFragments } from "./tools/find-impacted-fragments.js";
import { findNamedEntities } from "./tools/find-named-entities.js";
import { findSectionsTouchedBy } from "./tools/find-sections-touched-by.js";
import { getCanonicalVocabulary, VOCABULARY_CLASSES } from "./tools/get-canonical-vocabulary.js";
import { getContextPacket } from "./tools/get-context-packet.js";
import { getFirewallContent } from "./tools/get-firewall-content.js";
import { getNeighbors } from "./tools/get-neighbors.js";
import { getPersistedPacketSlice } from "./tools/get-persisted-packet-slice.js";
import { getNode } from "./tools/get-node.js";
import { getRecord } from "./tools/get-record.js";
import { getRecordField } from "./tools/get-record-field.js";
import { getRecords } from "./tools/get-records.js";
import { getRecordsField } from "./tools/get-records-field.js";
import { getRecordSchema, SUPPORTED_RECORD_SCHEMA_NODE_TYPES } from "./tools/get-record-schema.js";
import { getStoryStateProvenance } from "./tools/get-story-state-provenance.js";
import { listRecords, SUPPORTED_LIST_RECORD_TYPES } from "./tools/list-records.js";
import { searchNodes } from "./tools/search-nodes.js";
import {
  selectStoryletCandidates,
  TURN_DRIVER_KINDS
} from "./tools/select-storylet-candidates.js";
import { handleSubmitPatchPlanTool } from "./tools/submit-patch-plan.js";
import { validatePatchPlan } from "./tools/validate-patch-plan.js";
import { verifyPgStateHash } from "./tools/verify-pg-state-hash.js";
import {
  MCP_TOOL_NAMES,
  MCP_TOOL_ORDER,
  type McpToolName,
  type ToolKey
} from "./tool-names.js";
import type { McpError } from "./errors.js";
import { STORY_SLUG_PATTERN } from "./tools/_shared.js";

function readPackageVersion(): string {
  const packageJsonPath = path.join(import.meta.dirname, "..", "..", "package.json");
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

function orderCapabilitiesByToolOrder(capabilities: readonly ToolCapability[]): ToolCapability[] {
  const byName = new Map(capabilities.map((capability) => [capability.name, capability]));
  return MCP_TOOL_ORDER.map((name) => byName.get(name)).filter(
    (capability): capability is ToolCapability => capability !== undefined
  );
}

const searchNodesInputSchema = z.object({
  query: z.string().min(1),
  filters: z
    .object({
      world_slug: z.string().min(1).optional(),
      story_slug: z.string().regex(STORY_SLUG_PATTERN).optional(),
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
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional(),
  section_path: z.string().min(1).optional()
});

export const GET_RECORD_DESCRIPTION =
  "get_record: Fetch a record's content with content_hash and file_path. Supports atomic records (CF-<integer>, CH-<integer>, INV-*, M-<integer>, OQ-<integer>, ENT-<integer>, SEC-*-<integer>) returning parsed YAML, hybrid records (CHAR-<integer>, world-level DA-<integer>, PA-<integer>, NCP-<integer>, NCB-<integer>) returning parsed frontmatter plus body sections, and story-bundle records when story_slug is supplied for bundle-scoped ids such as PG-<integer>, SE-<integer>, BEL-<integer>, SF-<integer>, OBL-<integer>, CNSQ-<integer>, THR-<integer>, SREL-<integer>, STINT-<integer>, STENT-<integer>, STSTAT-<integer>, STCHAR-<integer>, STLOC-<integer>, STOBJ-<integer>, CLK-<integer>, STSEC-<integer>, STQ-<integer>, STPLAN-<integer>, STEMO-<integer>, BR-<integer>, CHC-<integer>, story-local DA-<integer>, SLT-<integer>, SLB-<integer>, SAU-<integer>, SP-<integer>, RSP-<integer>. ARC_TRACE is not a valid record class. Optional section_path projects parsed atomic/story records with dotted paths; for hybrid records it projects 'frontmatter', 'body', 'frontmatter.<key>', or 'body.<section>'. Oversized unprojected hybrid responses persist full JSON under the tool-results directory and return a bounded delivery_status='oversize_with_projection_suggestions' response plus suggested_section_paths.";

const getRecordsInputSchema = z.object({
  record_ids: z.array(z.string().min(1)).min(1),
  world_slug: z.string().min(1).optional(),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional()
});

const getRecordsFieldInputSchema = z.object({
  record_ids: z.array(z.string().min(1)).min(1),
  field_path: z.array(z.union([z.string(), z.number().int()])).min(1),
  world_slug: z.string().min(1).optional(),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional()
});

const getStoryStateProvenanceInputSchema = z.object({
  record_id: z.string().min(1),
  world_slug: z.string().min(1).optional(),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional()
});

const verifyPgStateHashInputSchema = z.object({
  world_slug: z.string().min(1),
  story_slug: z.string().regex(STORY_SLUG_PATTERN),
  page_id: z.string().regex(/^PG-\d+$/)
});

const getPersistedPacketSliceInputSchema = z.object({
  persisted_path: z.string().min(1),
  slice_path: z.string().min(1)
});

const listRecordFilterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number(), z.boolean()])).min(1)
]);

const listRecordsInputSchema = z.object({
  world_slug: z.string().min(1),
  record_type: z.enum(SUPPORTED_LIST_RECORD_TYPES),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional(),
  fields: z.array(z.string().min(1)).optional(),
  include_full_body: z.boolean().optional(),
  filters: z.record(z.string().min(1), listRecordFilterValueSchema).optional()
});

const selectStoryletCandidatesInputSchema = z.object({
  world_slug: z.string().min(1),
  story_slug: z.string().regex(STORY_SLUG_PATTERN),
  parent_page_id: z.string().regex(/^PG-\d+$/),
  turn_driver: z.object({
    kind: z.enum(TURN_DRIVER_KINDS),
    initiator: z.string().min(1).nullable().optional(),
    driver_records: z.array(z.string().min(1))
  }),
  intent_signature: z
    .object({
      action_families: z.array(z.string().min(1)).optional(),
      grounding_record_classes: z.array(z.string().min(1)).optional(),
      grounding_record_ids: z.array(z.string().min(1)).optional()
    })
    .optional(),
  max_candidates: z.number().int().min(1).default(24),
  include_rejection_summary: z.boolean().default(true)
});

const getRecordFieldInputSchema = z.object({
  record_id: z.string().min(1),
  field_path: z.array(z.union([z.string(), z.number().int()])).min(1),
  world_slug: z.string().min(1).optional(),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional()
});

const getRecordSchemaInputSchema = z.object({
  node_type: z.enum(SUPPORTED_RECORD_SCHEMA_NODE_TYPES)
});

const getNeighborsInputSchema = z.object({
  node_id: z.string().min(1),
  world_slug: z.string().min(1).optional(),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional(),
  edge_types: z.array(z.string().min(1)).optional(),
  depth: z.union([z.literal(1), z.literal(2)]).default(1)
});

const getContextPacketInputSchema = z.object({
  task_type: z.enum(TASK_TYPES),
  world_slug: z.string().min(1),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional(),
  seed_nodes: z.array(z.string().min(1)).min(1),
  token_budget: z.number().int().positive().optional(),
  delivery_mode: z.enum(DELIVERY_MODES).optional(),
  node_classes: z.array(z.enum(NODE_TYPES)).optional(),
  parent_page_id: z.string().regex(/^PG-\d+$/).optional()
});

const findImpactedFragmentsInputSchema = z.object({
  world_slug: z.string().min(1),
  node_ids: z.array(z.string().min(1)),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional()
});

const findSectionsTouchedByInputSchema = z.object({
  cf_id: z.string().regex(/^CF-\d+$/),
  world_slug: z.string().min(1)
});

const findNamedEntitiesInputSchema = z.object({
  world_slug: z.string().min(1),
  names: z.array(z.string().min(1)),
  story_slug: z.string().regex(STORY_SLUG_PATTERN).optional(),
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
  "RSP",
  "SAU",
  "SP",
  "EPE",
  "STORY",
  "PG",
  "SE",
  "SF",
  "BEL",
  "OBL",
  "CNSQ",
  "THR",
  "SREL",
  "STINT",
  "SLT",
  "SLB",
  "STLOC",
  "STOBJ",
  "BR",
  "CHC",
  "STENT",
  "STSTAT",
  "STCHAR",
  "CLK",
  "STSEC",
  "STQ",
  "STPLAN",
  "STEMO",
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
  story_slug: z.string().min(1).optional(),
  audit_id: z.string().min(1).optional()
});

const allocateManyIdsInputSchema = z.object({
  world_slug: z.string().min(1),
  allocations: z
    .array(
      z.object({
        id_class: z.enum(ID_CLASSES),
        story_slug: z.string().min(1).optional(),
        audit_id: z.string().min(1).optional()
      })
    )
    .min(1)
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
    "Search indexed world nodes with exact-match-first retrieval ordering. Optional filters.story_slug scopes search to indexed story-bundle records.",
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
    GET_RECORD_DESCRIPTION,
    getRecordInputSchema,
    async (args) => getRecord(args as unknown as Parameters<typeof getRecord>[0])
  );
  registerToolWithCapability(
    "get_records",
    "get_records: Fetch multiple records by id in one call. Optional story_slug scopes bundle-scoped story ids. Returns one ordered entry per requested id, wrapping the same successful response shape as get_record or a per-id error without aborting the batch. Oversized batch responses persist full JSON under the tool-results directory and return delivery_status='persisted_with_summary' with summary metadata and slice paths such as records[0].record.record.",
    getRecordsInputSchema,
    async (args) => getRecords(args as unknown as Parameters<typeof getRecords>[0])
  );
  registerToolWithCapability(
    "get_records_field",
    "get_records_field: Fetch one field from multiple parsed atomic or story-bundle records in one ordered response. Optional story_slug scopes bundle-scoped story ids. Returns per-id field_value entries or per-id errors without aborting the batch.",
    getRecordsFieldInputSchema,
    async (args) => getRecordsField(args as unknown as Parameters<typeof getRecordsField>[0])
  );
  registerToolWithCapability(
    "get_story_state_provenance",
    "get_story_state_provenance: Fetch story-event provenance for one story-bundle record. Requires story_slug for bundle-scoped ids and returns record_id, record_class, creating_se_id, modifying_se_ids, and evidence_records from indexed state_delta_create, state_delta_supersede, and creation_evidence edges.",
    getStoryStateProvenanceInputSchema,
    async (args) =>
      getStoryStateProvenance(args as unknown as Parameters<typeof getStoryStateProvenance>[0])
  );
  registerToolWithCapability(
    "verify_pg_state_hash",
    "verify_pg_state_hash: Prose-attach Phase 2 verifier for a committed PG page record. Recomputes state_hash from the parsed PG exactly as committed and does not modify plan.plan_hash before hashing; state_hash_match is verdict-driving, while plan_hash_match is SPEC-72 advisory drift against pages-prose-plans/<page_id>.md.",
    verifyPgStateHashInputSchema,
    async (args) => verifyPgStateHash(args as unknown as Parameters<typeof verifyPgStateHash>[0])
  );
  registerToolWithCapability(
    "get_persisted_packet_slice",
    "get_persisted_packet_slice: Read a structured dot-path slice from package-persisted JSON emitted by get_context_packet, get_records, or describe_envelope_schema delivery_status='persisted_with_summary'. Supports object paths, array indexes such as records[0], and node id selectors such as local_authority.nodes[id=entity:donostia].",
    getPersistedPacketSliceInputSchema,
    async (args) => getPersistedPacketSlice(args as unknown as Parameters<typeof getPersistedPacketSlice>[0])
  );
  registerToolWithCapability(
    "list_records",
    "list_records: Return indexed records of a supported atomic, hybrid, or story-bundle record type, with optional server-side filters by parsed body field path, field projection, or include_full_body metadata/body records. Hybrid record types include character_record, diegetic_artifact_record, adjudication_record, character_proposal_card, and character_proposal_batch. Story-bundle record types require story_slug and include story_plan_record, story_emotion_record, pressure_clock_record, story_secret_record, and story_question_record alongside the other supported story records. Filters accept scalar exact matches or array any-of matches, including dotted paths such as {shape: ['routine_disruption', 'reflection_dilemma'], content_intensity: ['mature', 'tame'], 'visibility.scope': 'global_author_pool'}. Fields are validated against response-shape top-level keys and unknown fields return invalid_input with accepted_projection_keys; include_full_body returns full bodies and ignores fields. Bundle-scoped IDs are unique within (world_slug, story_slug).",
    listRecordsInputSchema,
    async (args) => listRecords(args as unknown as Parameters<typeof listRecords>[0]),
    { record_type: SUPPORTED_LIST_RECORD_TYPES }
  );
  registerToolWithCapability(
    "select_storylet_candidates",
    "select_storylet_candidates: Return a projection-only storylet shortlist for a parent page and turn driver from indexed SLT projection columns and edges. The response includes filter_trace counts, shortlisted_candidate_ids, compact projection records, and requires_full_body_ids for follow-up get_records calls; it never returns full SLT bodies.",
    selectStoryletCandidatesInputSchema,
    async (args) =>
      selectStoryletCandidates(args as unknown as Parameters<typeof selectStoryletCandidates>[0]),
    { "turn_driver.kind": TURN_DRIVER_KINDS }
  );
  registerToolWithCapability(
    "get_record_field",
    "get_record_field: Fetch one field from an atomic or story-bundle record without returning the full parsed record. Story-bundle ids require story_slug.",
    getRecordFieldInputSchema,
    async (args) => getRecordField(args as unknown as Parameters<typeof getRecordField>[0])
  );
  registerToolWithCapability(
    "get_record_schema",
    "get_record_schema: Return the validator JSON Schema and referenced schemas for a record node type, including schema-backed story-bundle node types such as belief_record, story_plan_record, and story_emotion_record.",
    getRecordSchemaInputSchema,
    async (args) => getRecordSchema(args as unknown as Parameters<typeof getRecordSchema>[0]),
    { node_type: SUPPORTED_RECORD_SCHEMA_NODE_TYPES }
  );
  registerToolWithCapability(
    "get_neighbors",
    "Expand graph neighbors around a seed node across one or two hops. Story-bundle authored ids require story_slug.",
    getNeighborsInputSchema,
    async (args) => getNeighbors(args as unknown as Parameters<typeof getNeighbors>[0])
  );
  registerToolWithCapability(
    "get_context_packet",
    "Assemble a bounded context packet for a retrieval task. Story-pipeline task types require story_slug. story_bootstrap treats it as the target bundle slug and returns story_bundle_context: null; other story-pipeline task types populate story_bundle_context from indexed story-bundle records plus STORY_KERNEL.md frontmatter, including active_intentions, active_statuses, active_beliefs_by_holder, active_relationships_by_participant, active_locations_in_scope, active_objects_in_scope, active_story_diegetic_artifacts, active_story_characters, active_actor_plans, active_emotional_states, and a projection-only selection_shortlist when parent_page_id is supplied or a PG seed is present. World-canon task types return story_bundle_context: null. Unresolvable seed_nodes are skipped and surfaced in task_header.warnings; all-unresolved seed sets still return seed-independent context with an aggregate warning.",
    getContextPacketInputSchema,
    async (args) => getContextPacket(args as unknown as Parameters<typeof getContextPacket>[0]),
    { task_type: TASK_TYPES, delivery_mode: DELIVERY_MODES, node_classes: NODE_TYPES }
  );
  registerToolWithCapability(
    "find_impacted_fragments",
    "Find downstream world fragments impacted by proposed node mutations. Story-bundle authored node ids require story_slug.",
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
    "Resolve exact canonical and unresolved surface-name matches. Optional story_slug adds story_local_matches from indexed story-bundle records alongside world-canon matches. Region/era descriptor hints include capped matching_record_ids for direct get_record lookup, with search_nodes(query=...) as the broad fallback.",
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
    "Validate a patch plan envelope without mutating world content. Runs validators and id-allocation race checks, returning status: 'pass' | 'fail' | 'skipped' with verdicts and an optional skip reason.",
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
    "Allocate the next append-only id for a world-specific, story-bundle-scoped, sub-audit-scoped, or pipeline-scoped record class. Story-bundle-scoped classes return unpadded natural-integer IDs such as <CLASS>-1 for a fresh missing bundle under an existing world (per FOUNDATIONS-002). RSP requires story_slug and audit_id.",
    allocateNextIdInputSchema,
    async (args) => allocateNextId(args as unknown as Parameters<typeof allocateNextId>[0]),
    { id_class: ID_CLASSES }
  );
  registerToolWithCapability(
    "allocate_many_ids",
    "allocate_many_ids: Allocate multiple append-only ids for one world in a single ordered response. Each allocation entry uses the same id_class, story_slug, and audit_id rules as allocate_next_id; repeated entries for the same scope increment monotonically within the batch, and errors include successful_allocations for reconciliation.",
    allocateManyIdsInputSchema,
    async (args) => allocateManyIds(args as unknown as Parameters<typeof allocateManyIds>[0]),
    { "allocations[].id_class": ID_CLASSES }
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
      "Return the patch-plan envelope schema and per-operation payload schemas for validate_patch_plan and submit_patch_plan. Oversized unfiltered responses persist full JSON and return delivery_status='persisted_with_summary' with available_op_kinds for op_kind narrowing.",
    input_schema_enums: { op_kind: OPERATION_KINDS }
  };
  registerToolWithCapability(
    "describe_envelope_schema",
    describeEnvelopeCapability.description,
    describeEnvelopeSchemaInputSchema,
    async (args) => describeEnvelopeSchema(args as unknown as Parameters<typeof describeEnvelopeSchema>[0]),
    describeEnvelopeCapability.input_schema_enums
  );

  const describedTools = orderCapabilitiesByToolOrder([...registeredCapabilities, describeCapability]);
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

if (isMainModule(import.meta.url)) {
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
