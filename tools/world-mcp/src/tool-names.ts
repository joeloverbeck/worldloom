export const MCP_TOOL_NAMES = {
  search_nodes: "mcp__worldloom__search_nodes",
  get_node: "mcp__worldloom__get_node",
  get_record: "mcp__worldloom__get_record",
  get_neighbors: "mcp__worldloom__get_neighbors",
  get_context_packet: "mcp__worldloom__get_context_packet",
  find_impacted_fragments: "mcp__worldloom__find_impacted_fragments",
  find_sections_touched_by: "mcp__worldloom__find_sections_touched_by",
  find_named_entities: "mcp__worldloom__find_named_entities",
  find_edit_anchors: "mcp__worldloom__find_edit_anchors",
  validate_patch_plan: "mcp__worldloom__validate_patch_plan",
  submit_patch_plan: "mcp__worldloom__submit_patch_plan",
  allocate_next_id: "mcp__worldloom__allocate_next_id"
} as const;

export type ToolKey = keyof typeof MCP_TOOL_NAMES;
export type McpToolName = (typeof MCP_TOOL_NAMES)[ToolKey];

export const MCP_TOOL_ORDER: McpToolName[] = [
  MCP_TOOL_NAMES.search_nodes,
  MCP_TOOL_NAMES.get_node,
  MCP_TOOL_NAMES.get_record,
  MCP_TOOL_NAMES.get_neighbors,
  MCP_TOOL_NAMES.get_context_packet,
  MCP_TOOL_NAMES.find_impacted_fragments,
  MCP_TOOL_NAMES.find_sections_touched_by,
  MCP_TOOL_NAMES.find_named_entities,
  MCP_TOOL_NAMES.find_edit_anchors,
  MCP_TOOL_NAMES.validate_patch_plan,
  MCP_TOOL_NAMES.submit_patch_plan,
  MCP_TOOL_NAMES.allocate_next_id
];
