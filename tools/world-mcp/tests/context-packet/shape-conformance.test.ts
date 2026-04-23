import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { getContextPacket } from "../../src/tools/get-context-packet";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function extractContractKeyTree(): Record<string, string[]> {
  const contractPath = path.join(
    "/home/joeloverbeck/projects/worldloom",
    "docs",
    "CONTEXT-PACKET-CONTRACT.md"
  );
  const source = readFileSync(contractPath, "utf8");
  const match = source.match(/```yaml\n([\s\S]*?)```/);
  assert.ok(match?.[1], "expected canonical YAML example in CONTEXT-PACKET-CONTRACT.md");

  const lines = match[1].split("\n");
  const tree: Record<string, string[]> = {};
  let currentTopLevel: string | null = null;

  for (const rawLine of lines) {
    if (rawLine.trim().length === 0 || rawLine.trim().startsWith("- ")) {
      continue;
    }

    const indent = rawLine.match(/^ */)?.[0].length ?? 0;
    const trimmed = rawLine.trim();
    const key = trimmed.replace(/:.*$/, "");

    if (indent === 0) {
      currentTopLevel = key;
      tree[currentTopLevel] = [];
      continue;
    }

    if (indent === 2 && currentTopLevel !== null) {
      tree[currentTopLevel]?.push(key);
    }
  }

  return tree;
}

test("context packet output matches the canonical top-level and layer keys", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "seeded:WORLD_KERNEL.md:Kernel:0",
          world_slug: "seeded",
          file_path: "WORLD_KERNEL.md",
          heading_path: "Kernel",
          node_type: "section",
          body: "Kernel"
        },
        {
          node_id: "seeded:INVARIANTS.md:Rule:0",
          world_slug: "seeded",
          file_path: "INVARIANTS.md",
          heading_path: "Rule",
          node_type: "invariant",
          body: "Invariant"
        },
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "CANON_LEDGER.md",
          node_type: "canon_fact_record",
          body: "CF-0001"
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 8000
      })
    );

    assert.ok(!("code" in packet));

    const contractTree = extractContractKeyTree();
    assert.deepEqual(Object.keys(packet), Object.keys(contractTree));
    assert.deepEqual(Object.keys(packet.task_header), contractTree.task_header);
    assert.deepEqual(Object.keys(packet.nucleus), contractTree.nucleus);
    assert.deepEqual(Object.keys(packet.envelope), contractTree.envelope);
    assert.deepEqual(Object.keys(packet.constraints), contractTree.constraints);
    assert.deepEqual(
      Object.keys(packet.suggested_impact_surfaces),
      contractTree.suggested_impact_surfaces
    );
    assert.equal(packet.task_header.packet_version, 1);
  } finally {
    destroyTempRepoRoot(root);
  }
});
