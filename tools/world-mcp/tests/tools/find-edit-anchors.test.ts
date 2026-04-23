import assert from "node:assert/strict";
import test from "node:test";

import { findEditAnchors } from "../../src/tools/find-edit-anchors";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

function buildAnchorWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CF-0042",
        world_slug: "seeded",
        file_path: "CANON_LEDGER.md",
        node_type: "canon_fact_record",
        body: "id: CF-0042\ntitle: Brinewick Fact\nstatement: Brinewick anchors the coast.\n"
      },
      {
        node_id: "CF-0043",
        world_slug: "seeded",
        file_path: "CANON_LEDGER.md",
        node_type: "canon_fact_record",
        body: "id: CF-0043\ntitle: Harbor Office Fact\nstatement: The harbor office governs tariffs.\n"
      }
    ],
    anchors: [
      {
        node_id: "CF-0042",
        anchor_form: "```yaml\nid: CF-0042\ntitle: Brinewick Fact\n```"
      },
      {
        node_id: "CF-0043",
        anchor_form: "```yaml\nid: CF-0043\ntitle: Harbor Office Fact\n```"
      }
    ]
  });
}

test("findEditAnchors returns anchor checksum, content hash, and authoritative anchor_form", async () => {
  const root = createTempRepoRoot();

  try {
    buildAnchorWorld(root);

    const result = await withRepoRoot(root, () =>
      findEditAnchors({ world_slug: "seeded", targets: ["CF-0042"] })
    );

    assert.ok("anchors" in result);
    assert.equal(result.anchors.length, 1);
    assert.equal(result.anchors[0]?.node_id, "CF-0042");
    assert.match(result.anchors[0]?.content_hash ?? "", /^[a-f0-9]{64}$/);
    assert.match(result.anchors[0]?.anchor_checksum ?? "", /^[a-f0-9]{64}$/);
    assert.equal(result.anchors[0]?.anchor_form, "```yaml\nid: CF-0042\ntitle: Brinewick Fact\n```");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findEditAnchors returns node_not_found for a missing node", async () => {
  const root = createTempRepoRoot();

  try {
    buildAnchorWorld(root);

    const result = await withRepoRoot(root, () =>
      findEditAnchors({ world_slug: "seeded", targets: ["CF-9999"] })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "node_not_found");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("findEditAnchors supports batch lookup", async () => {
  const root = createTempRepoRoot();

  try {
    buildAnchorWorld(root);

    const result = await withRepoRoot(root, () =>
      findEditAnchors({ world_slug: "seeded", targets: ["CF-0042", "CF-0043"] })
    );

    assert.ok("anchors" in result);
    assert.deepEqual(
      result.anchors.map((anchor) => anchor.node_id),
      ["CF-0042", "CF-0043"]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
