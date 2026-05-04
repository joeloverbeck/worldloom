import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getPersistedPacketSlice } from "../../src/tools/get-persisted-packet-slice";

import { createTempRepoRoot, destroyTempRepoRoot } from "./_shared";

async function withToolResults<T>(run: (resultsDir: string) => Promise<T>): Promise<T> {
  const root = createTempRepoRoot();
  const originalResultsDir = process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  const resultsDir = path.join(root, "tool-results");
  process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = resultsDir;
  mkdirSync(resultsDir, { recursive: true });

  try {
    return await run(resultsDir);
  } finally {
    if (originalResultsDir === undefined) {
      delete process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
    } else {
      process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = originalResultsDir;
    }
    destroyTempRepoRoot(root);
  }
}

function writePacket(resultsDir: string): string {
  const persistedPath = path.join(resultsDir, "packet.json");
  writeFileSync(
    persistedPath,
    JSON.stringify({
      governing_world_context: {
        nodes: [{ id: "ONT-1", node_type: "invariant", body_preview: "Invariant body." }]
      },
      local_authority: {
        nodes: [
          { id: "entity:donostia", node_type: "named_entity" },
          { id: "CF-0001", node_type: "canon_fact_record" }
        ]
      }
    }),
    "utf8"
  );
  return persistedPath;
}

test("getPersistedPacketSlice returns a nested packet slice by dot path", async () => {
  await withToolResults(async (resultsDir) => {
    const persistedPath = writePacket(resultsDir);
    const result = await getPersistedPacketSlice({
      persisted_path: persistedPath,
      slice_path: "governing_world_context.nodes"
    });

    assert.ok(!("code" in result));
    assert.equal(result.found, true);
    assert.deepEqual(result.slice, [
      { id: "ONT-1", node_type: "invariant", body_preview: "Invariant body." }
    ]);
  });
});

test("getPersistedPacketSlice supports nodes[id=...] selection", async () => {
  await withToolResults(async (resultsDir) => {
    const persistedPath = writePacket(resultsDir);
    const result = await getPersistedPacketSlice({
      persisted_path: persistedPath,
      slice_path: "local_authority.nodes[id=entity:donostia]"
    });

    assert.ok(!("code" in result));
    assert.equal(result.found, true);
    assert.deepEqual(result.slice, { id: "entity:donostia", node_type: "named_entity" });
  });
});

test("getPersistedPacketSlice supports array indexes in persisted get_records JSON", async () => {
  await withToolResults(async (resultsDir) => {
    const persistedPath = path.join(resultsDir, "records.json");
    writeFileSync(
      persistedPath,
      JSON.stringify({
        delivery_status: "inline",
        records: [
          {
            record_id: "CF-0001",
            found: true,
            record: {
              record: {
                id: "CF-0001",
                statement: "Brinewick anchors the salt trade."
              }
            }
          }
        ]
      }),
      "utf8"
    );

    const result = await getPersistedPacketSlice({
      persisted_path: persistedPath,
      slice_path: "records[0].record.record"
    });

    assert.ok(!("code" in result));
    assert.equal(result.found, true);
    assert.deepEqual(result.slice, {
      id: "CF-0001",
      statement: "Brinewick anchors the salt trade."
    });
  });
});

test("getPersistedPacketSlice supports schema dot paths in persisted describe_envelope_schema JSON", async () => {
  await withToolResults(async (resultsDir) => {
    const persistedPath = path.join(resultsDir, "schema.json");
    writeFileSync(
      persistedPath,
      JSON.stringify({
        delivery_status: "inline",
        op_schemas: {
          create_cf_record: {
            required: ["op", "target_world", "target_file", "payload"]
          }
        }
      }),
      "utf8"
    );

    const result = await getPersistedPacketSlice({
      persisted_path: persistedPath,
      slice_path: "op_schemas.create_cf_record"
    });

    assert.ok(!("code" in result));
    assert.equal(result.found, true);
    assert.deepEqual(result.slice, {
      required: ["op", "target_world", "target_file", "payload"]
    });
  });
});

test("getPersistedPacketSlice reports missing paths without throwing", async () => {
  await withToolResults(async (resultsDir) => {
    const persistedPath = writePacket(resultsDir);
    const result = await getPersistedPacketSlice({
      persisted_path: persistedPath,
      slice_path: "local_authority.nodes[id=missing]"
    });

    assert.ok(!("code" in result));
    assert.equal(result.found, false);
    assert.equal(result.error?.code, "slice_not_found");
  });
});

test("getPersistedPacketSlice rejects paths outside the tool-results root", async () => {
  await withToolResults(async (resultsDir) => {
    const outsidePath = path.join(path.dirname(resultsDir), "packet.json");
    writeFileSync(outsidePath, "{}", "utf8");

    const result = await getPersistedPacketSlice({
      persisted_path: outsidePath,
      slice_path: "governing_world_context.nodes"
    });

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
  });
});
