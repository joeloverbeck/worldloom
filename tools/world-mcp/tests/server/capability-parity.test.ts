import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { OperationKind } from "@worldloom/patch-engine";

import { computePatchOperationSchemaHash, computeValidatorRegistryHash } from "../../src/build-info.js";
import { OPERATION_KINDS } from "../../src/package-interop.js";
import { createServer } from "../../src/server.js";
import { MCP_TOOL_ORDER, MCP_TOOL_NAMES } from "../../src/tool-names.js";
import { describeEnvelopeSchema } from "../../src/tools/describe-envelope-schema.js";

const requireFromThisTest = createRequire(import.meta.url);

interface Validator {
  name: string;
}

async function withServerClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const server = createServer();
  const client = new Client({
    name: "worldloom-capability-parity-test",
    version: "0.1.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return await run(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

test("describe_capabilities lists every registered tool in order", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      tools?: Array<{ name?: string }>;
    };

    assert.deepEqual(
      structured.tools?.map((tool) => tool.name),
      MCP_TOOL_ORDER
    );
  });
});

test("describe_capabilities exposes planless story-state maintenance metadata", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      tools?: Array<{ name?: string; description?: string }>;
    };
    const capability = structured.tools?.find(
      (tool) => tool.name === MCP_TOOL_NAMES.plan_story_state_maintenance
    );

    assert.ok(capability?.description);
    assert.match(capability.description, /review-only patch-plan envelope/);
    assert.match(capability.description, /planless forkable maintenance PG/);
    assert.match(capability.description, /asks the operator to write a page plan/);
    assert.doesNotMatch(capability.description, /maintenance_page_plan/);
    assert.doesNotMatch(capability.description, /write the returned page plan/);
    assert.doesNotMatch(capability.description, /returns? .*page-plan body/);
  });
});

test("describe_envelope_schema covers every operation kind", async () => {
  for (const kind of OPERATION_KINDS) {
    const manifest = await describeEnvelopeSchema({ op_kind: kind });

    assert.equal(manifest.delivery_status, "inline", `${kind} should fit inline when requested directly`);
    assert.deepEqual(Object.keys(manifest.op_schemas), [kind]);

    const schema = manifest.op_schemas[kind] as
      | {
          required?: unknown;
          properties?: {
            op?: { const?: OperationKind };
            payload?: { type?: string; properties?: Record<string, unknown> };
          };
        }
      | undefined;
    assert.ok(schema, `${kind} should have a schema entry`);
    assert.deepEqual(schema.required, ["op", "target_world", "target_file", "payload"]);
    assert.equal(schema.properties?.op?.const, kind);
    assert.equal(schema.properties?.payload?.type, "object");
    assert.ok(schema.properties?.payload?.properties, `${kind} should expose a structured payload schema`);
  }
});

test("validator registry exposes stable machine-readable validator names", () => {
  const validatorsEntryPath = requireFromThisTest.resolve("@worldloom/validators");
  const registryPath = validatorsEntryPath.replace(/index\.js$/, "registry.js");
  const registry = requireFromThisTest(registryPath) as {
    structuralValidators: readonly Validator[];
    ruleValidators: readonly Validator[];
  };

  const names = [...registry.structuralValidators, ...registry.ruleValidators]
    .map((validator) => validator.name)
    .sort((left, right) => left.localeCompare(right));

  assert.ok(registry.structuralValidators.length > 0, "structural validator registry should not be empty");
  assert.ok(registry.ruleValidators.length > 0, "rule validator registry should not be empty");
  assert.deepEqual(names, [...new Set(names)], "validator names must be unique");
  for (const name of names) {
    assert.match(name, /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/, `${name} should be a snake_case tool-safe name`);
  }
});

test("describe_capabilities exposes validator_registry_hash for the current validator source content", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      build_info?: { validator_registry_hash?: string };
    };

    assert.match(structured.build_info?.validator_registry_hash ?? "", /^[0-9a-f]{64}$/);
    assert.equal(structured.build_info?.validator_registry_hash, computeValidatorRegistryHash());
  });
});

test("describe_capabilities exposes patch_operation_schema_hash for the current op schema manifest", async () => {
  await withServerClient(async (client) => {
    const result = await client.callTool({
      name: MCP_TOOL_NAMES.describe_capabilities,
      arguments: {}
    });

    assert.notEqual(result.isError, true);
    const structured = result.structuredContent as {
      build_info?: { patch_operation_schema_hash?: string };
    };

    assert.match(structured.build_info?.patch_operation_schema_hash ?? "", /^[0-9a-f]{64}$/);
    assert.equal(structured.build_info?.patch_operation_schema_hash, computePatchOperationSchemaHash());
  });
});
