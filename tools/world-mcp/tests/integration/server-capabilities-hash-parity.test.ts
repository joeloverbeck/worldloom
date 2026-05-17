import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  computePatchOperationSchemaHash,
  computeValidatorRegistryHash
} from "../../src/build-info.js";
import { MCP_TOOL_NAMES } from "../../src/tool-names.js";
import { createTempRepoRoot, destroyTempRepoRoot, seedWorld } from "../tools/_shared.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..", "..", "..");
const SERVER_ENTRYPOINT = path.join(REPO_ROOT, "tools", "world-mcp", "dist", "src", "server.js");

function storyPatch(op: string, sourceDir: string, record: Record<string, unknown>) {
  return {
    op,
    target_world: "seeded",
    target_file: `stories/deployed-smoke/_source/${sourceDir}/${String(record.id)}.yaml`,
    payload: {
      story_slug: "deployed-smoke",
      record
    }
  };
}

function buildKnownBadCausalDependencyPlan() {
  return {
    plan_id: "plan-known-bad-causal-dependency",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-turn-cycle",
    expected_id_allocations: {},
    patches: [
      storyPatch("create_stobj_record", "objects", {
        id: "STOBJ-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        label: "Locked gate"
      }),
      storyPatch("create_chc_record", "choices", {
        id: "CHC-1",
        story_id: "STORY-1",
        created_at_page: "PG-1",
        label: "Force the locked gate",
        grounded_in: { records: ["STOBJ-1"] }
      }),
      storyPatch("create_se_record", "events", {
        id: "SE-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        parent_page_id: "PG-1",
        event_kind: "selected_choice",
        actor: "STENT-1",
        commitment: { selected_slt_id: "SLT-1", selection_source: "emitted_choice", alias_bindings: {} },
        outcome_route: "accept",
        world_logic_rationale: "The selected choice closes the object it still depends on.",
        state_delta: {
          create: [],
          supersede: [],
          close: ["STOBJ-1"]
        },
        promotion_claims: []
      }),
      storyPatch("create_pg_record", "pages", {
        id: "PG-2",
        story_id: "STORY-1",
        parent_page_id: "PG-1",
        input: { choice_id: "CHC-1", manual_action_text: null, resolved_event_id: "SE-1" },
        emitted_choices: [],
        state_snapshot: {
          active_records: { CHC: ["CHC-1"] },
          visible_affordances: []
        }
      })
    ]
  };
}

function seedServerWorld(root: string): void {
  seedWorld(root, { worldSlug: "seeded", nodes: [] });
}

async function withSpawnedServerClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const root = createTempRepoRoot();
  seedServerWorld(root);

  const stderr: string[] = [];
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_ENTRYPOINT],
    cwd: path.join(root, "tools", "world-mcp"),
    stderr: "pipe"
  });
  transport.stderr?.on("data", (chunk) => {
    stderr.push(String(chunk));
  });

  const client = new Client({
    name: "worldloom-server-capabilities-hash-parity-test",
    version: "0.1.0"
  });

  try {
    await client.connect(transport);
    assert.ok(transport.pid, "expected StdioClientTransport to spawn dist/src/server.js");
    return await run(client);
  } finally {
    await client.close();
    destroyTempRepoRoot(root);
    assert.equal(stderr.join(""), "");
  }
}

test("spawned dist server exposes source-current capability hashes and rejects a known-bad patch plan", async () => {
  await withSpawnedServerClient(async (client) => {
    const capabilities = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(capabilities.isError, true);
    const structuredCapabilities = capabilities.structuredContent as {
      build_info?: {
        validator_registry_hash?: string;
        patch_operation_schema_hash?: string;
      };
    };

    assert.equal(
      structuredCapabilities.build_info?.validator_registry_hash,
      computeValidatorRegistryHash(),
      "spawned dist/src/server.js returned a validator_registry_hash that differs from source; rebuild tools/world-mcp/dist before claiming deployed capability currency"
    );
    assert.equal(
      structuredCapabilities.build_info?.patch_operation_schema_hash,
      computePatchOperationSchemaHash(),
      "spawned dist/src/server.js returned a patch_operation_schema_hash that differs from source; rebuild tools/world-mcp/dist before claiming deployed capability currency"
    );

    const validation = await client.callTool({
      name: MCP_TOOL_NAMES.validate_patch_plan,
      arguments: { patch_plan: buildKnownBadCausalDependencyPlan() }
    });
    const structuredValidation = validation.structuredContent as {
      status?: string;
      verdicts?: Array<{ severity?: string; validator?: string; code?: string }>;
    };

    assert.equal(structuredValidation.status, "fail");
    assert.ok(
      structuredValidation.verdicts?.some(
        (verdict) =>
          verdict.severity === "fail" &&
          verdict.validator === "causal_dependency_threat_scan" &&
          verdict.code === "choice_dependency_clobbered"
      ),
      "spawned dist/src/server.js did not reject the known-bad causal-dependency fixture with the expected fail verdict"
    );
  });
});
