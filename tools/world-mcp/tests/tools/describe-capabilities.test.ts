import assert from "node:assert/strict";
import test from "node:test";

import { createBuildInfo } from "../../src/build-info";
import { TASK_TYPES } from "../../src/ranking/profiles";
import { ID_CLASSES } from "../../src/server";
import { MCP_TOOL_NAMES } from "../../src/tool-names";
import { describeCapabilities, type ToolCapability } from "../../src/tools/describe-capabilities";
import { SUPPORTED_LIST_RECORD_TYPES } from "../../src/tools/list-records";

const CAPABILITIES: ToolCapability[] = [
  {
    name: MCP_TOOL_NAMES.allocate_next_id,
    description: "Allocate the next append-only id for a world-specific or pipeline-scoped record class.",
    input_schema_enums: { id_class: ID_CLASSES }
  },
  {
    name: MCP_TOOL_NAMES.get_context_packet,
    description: "Assemble a bounded context packet for a retrieval task.",
    input_schema_enums: { task_type: TASK_TYPES }
  },
  {
    name: MCP_TOOL_NAMES.list_records,
    description: "Return all records of a given atomic record type.",
    input_schema_enums: { record_type: SUPPORTED_LIST_RECORD_TYPES }
  },
  {
    name: MCP_TOOL_NAMES.describe_capabilities,
    description: "Return this MCP server's startup build metadata, registered tool names, and enum-valued input contracts.",
    input_schema_enums: {}
  }
];

test("describeCapabilities returns build metadata and enum-valued input contracts", () => {
  const buildInfo = createBuildInfo(CAPABILITIES);
  const manifest = describeCapabilities({ buildInfo, tools: CAPABILITIES });

  assert.match(manifest.build_info.git_commit_hash, /^[0-9a-f]{40}$|^unknown$/);
  assert.match(manifest.build_info.build_timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(!Number.isNaN(Date.parse(manifest.build_info.build_timestamp)));
  assert.match(manifest.build_info.source_schema_hash, /^[0-9a-f]{64}$/);

  const byName = new Map(manifest.tools.map((tool) => [tool.name, tool]));
  assert.deepEqual(byName.get(MCP_TOOL_NAMES.allocate_next_id)?.input_schema_enums.id_class, [...ID_CLASSES]);
  assert.deepEqual(byName.get(MCP_TOOL_NAMES.get_context_packet)?.input_schema_enums.task_type, [...TASK_TYPES]);
  assert.deepEqual(byName.get(MCP_TOOL_NAMES.list_records)?.input_schema_enums.record_type, [
    ...SUPPORTED_LIST_RECORD_TYPES
  ]);
  assert.ok(byName.has(MCP_TOOL_NAMES.describe_capabilities));
});

test("build info is stable for one captured server capability set", () => {
  const buildInfo = createBuildInfo(CAPABILITIES);
  const first = describeCapabilities({ buildInfo, tools: CAPABILITIES });
  const second = describeCapabilities({ buildInfo, tools: CAPABILITIES });

  assert.deepEqual(second.build_info, first.build_info);
});
