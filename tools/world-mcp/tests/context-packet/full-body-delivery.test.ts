import assert from "node:assert/strict";
import test from "node:test";

import { getContextPacket } from "../../src/tools/get-context-packet";
import { GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE } from "../../src/context-packet/shared";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared";

function collectNodes(packet: Awaited<ReturnType<typeof getContextPacket>>) {
  assert.ok(!("code" in packet));
  return [
    ...packet.local_authority.nodes,
    ...packet.exact_record_links.nodes,
    ...packet.scoped_local_context.nodes,
    ...packet.governing_world_context.nodes,
    ...packet.impact_surfaces.nodes
  ];
}

test("canon_addition packets deliver full bodies for task-critical governing classes", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: "id: CF-0001\nstatement: Genesis fact full body.\n"
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: "id: ONT-1\nstatement: Embodiment remains required.\n"
        },
        {
          node_id: "M-1",
          world_slug: "seeded",
          file_path: "_source/mystery-reserve/M-1.yaml",
          node_type: "mystery_reserve_entry",
          body: "id: M-1\ntitle: Drowned bell\nunknowns:\n  - Who rings it.\n"
        },
        {
          node_id: "OQ-1",
          world_slug: "seeded",
          file_path: "_source/open-questions/OQ-1.yaml",
          node_type: "open_question_entry",
          body: "id: OQ-1\nquestion: Who first charted the brine shelf?\n"
        },
        {
          node_id: "SEC-ELF-001",
          world_slug: "seeded",
          file_path: "_source/everyday-life/SEC-ELF-001.yaml",
          heading_path: "Market",
          node_type: "section",
          body: "id: SEC-ELF-001\nfile_class: EVERYDAY_LIFE\nbody: Market habits.\n"
        }
      ],
      edges: [
        {
          source_node_id: "CF-0001",
          target_node_id: "SEC-ELF-001",
          edge_type: "required_world_update"
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 12000
      })
    );

    assert.ok(!("code" in packet));
    assert.deepEqual(packet.task_header.full_body_classes_delivered.sort(), [
      "canon_fact_record",
      "invariant",
      "mystery_reserve_entry",
      "open_question_entry"
    ]);

    const nodesById = new Map(collectNodes(packet).map((node) => [node.id, node]));
    assert.equal(nodesById.get("CF-0001")?.full_body, "id: CF-0001\nstatement: Genesis fact full body.\n");
    assert.equal(nodesById.get("ONT-1")?.full_body, "id: ONT-1\nstatement: Embodiment remains required.\n");
    assert.equal(nodesById.get("M-1")?.full_body, "id: M-1\ntitle: Drowned bell\nunknowns:\n  - Who rings it.\n");
    assert.equal(
      nodesById.get("OQ-1")?.full_body,
      "id: OQ-1\nquestion: Who first charted the brine shelf?\n"
    );
    assert.equal(nodesById.get("SEC-ELF-001")?.full_body, undefined);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("full-body delivery downgrades high-value nodes when the requested budget cannot fit them", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: "id: CF-0001\nstatement: Short seed.\n"
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: `id: ONT-1\nstatement: ${"Full invariant body must be downgraded. ".repeat(400)}\n`
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "canon_addition",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 1200
      })
    );

    assert.ok(!("code" in packet));
    assert.ok(packet.task_header.token_budget.allocated <= 1200);
    const invariant = packet.governing_world_context.nodes.find((node) => node.id === "ONT-1");
    assert.equal(invariant?.full_body, undefined);
    assert.ok(
      packet.truncation_summary.full_body_downgrades?.some(
        (entry) =>
          entry.layer === "governing_world_context" &&
          entry.node_id === "ONT-1" &&
          entry.reason === "high_value_full_body_budget_exceeded"
      ),
      "truncation_summary should record the high-value full-body downgrade"
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("reserve-policy task types keep governing full bodies ahead of opportunistic layers", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: `id: CF-0001\nstatement: ${"Large local authority body. ".repeat(1000)}\n`
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: "id: ONT-1\nstatement: Embodiment remains required.\n"
        },
        {
          node_id: "M-1",
          world_slug: "seeded",
          file_path: "_source/mystery-reserve/M-1.yaml",
          node_type: "mystery_reserve_entry",
          body: "id: M-1\ntitle: Drowned bell\nunknowns:\n  - Who rings it.\n"
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "character_generation",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 8000
      })
    );

    assert.ok(!("code" in packet));
    assert.deepEqual(
      packet.task_header.governing_full_body_priority,
      GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE.character_generation
    );

    const nodesById = new Map(collectNodes(packet).map((node) => [node.id, node]));
    assert.equal(nodesById.get("ONT-1")?.full_body, "id: ONT-1\nstatement: Embodiment remains required.\n");
    assert.equal(nodesById.get("M-1")?.full_body, "id: M-1\ntitle: Drowned bell\nunknowns:\n  - Who rings it.\n");
    assert.equal(nodesById.get("CF-0001")?.full_body, undefined);
    assert.ok(
      packet.truncation_summary.full_body_downgrades?.some(
        (entry) => entry.layer === "local_authority" && entry.node_id === "CF-0001"
      ),
      "opportunistic local_authority full body should be downgraded after governing reserves are kept"
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("story_bootstrap reserves governing invariant and Mystery Reserve full bodies", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: `id: CF-0001\nstatement: ${"Story premise fact. ".repeat(600)}\n`
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: "id: ONT-1\nstatement: Embodiment remains required.\n"
        },
        {
          node_id: "M-1",
          world_slug: "seeded",
          file_path: "_source/mystery-reserve/M-1.yaml",
          node_type: "mystery_reserve_entry",
          body: "id: M-1\ntitle: Drowned bell\nunknowns:\n  - Who rings it.\n"
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_bootstrap",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 9000
      })
    );

    assert.ok(!("code" in packet));
    assert.deepEqual(
      packet.task_header.governing_full_body_priority,
      GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE.story_bootstrap
    );

    const nodesById = new Map(collectNodes(packet).map((node) => [node.id, node]));
    assert.equal(nodesById.get("ONT-1")?.full_body, "id: ONT-1\nstatement: Embodiment remains required.\n");
    assert.equal(nodesById.get("M-1")?.full_body, "id: M-1\ntitle: Drowned bell\nunknowns:\n  - Who rings it.\n");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("story_page_cycle reserves governing invariant and Mystery Reserve full bodies", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: `id: CF-0001\nstatement: ${"Page-cycle seed fact. ".repeat(600)}\n`
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: "id: ONT-1\nstatement: Embodiment remains required.\n"
        },
        {
          node_id: "M-1",
          world_slug: "seeded",
          file_path: "_source/mystery-reserve/M-1.yaml",
          node_type: "mystery_reserve_entry",
          body: "id: M-1\ntitle: Drowned bell\nunknowns:\n  - Who rings it.\n"
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_page_cycle",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 9000
      })
    );

    assert.ok(!("code" in packet));
    assert.deepEqual(
      packet.task_header.governing_full_body_priority,
      GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE.story_page_cycle
    );

    const nodesById = new Map(collectNodes(packet).map((node) => [node.id, node]));
    assert.equal(nodesById.get("ONT-1")?.full_body, "id: ONT-1\nstatement: Embodiment remains required.\n");
    assert.equal(nodesById.get("M-1")?.full_body, "id: M-1\ntitle: Drowned bell\nunknowns:\n  - Who rings it.\n");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("reserve-policy task types fail loudly when required governing full bodies cannot fit", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: "id: CF-0001\nstatement: Seed.\n"
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: `id: ONT-1\nstatement: ${"Required governing body. ".repeat(500)}\n`
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "diegetic_artifact_generation",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 900
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "packet_incomplete_required_classes");
    assert.ok(result.details);
    assert.deepEqual(
      result.details.governing_full_body_priority,
      GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE.diegetic_artifact_generation
    );
    assert.deepEqual(result.details.retry_with, {
      token_budget: result.details.minimum_required_budget
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("other task type keeps pre-ticket preview-only node delivery", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: "id: CF-0001\nstatement: Seed.\n"
        },
        {
          node_id: "ONT-1",
          world_slug: "seeded",
          file_path: "_source/invariants/ONT-1.yaml",
          node_type: "invariant",
          body: "id: ONT-1\nstatement: Invariant.\n"
        }
      ]
    });

    const packet = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "other",
        world_slug: "seeded",
        seed_nodes: ["CF-0001"],
        token_budget: 8000
      })
    );

    assert.ok(!("code" in packet));
    assert.deepEqual(packet.task_header.full_body_classes_delivered, []);
    assert.equal(collectNodes(packet).some((node) => node.full_body !== undefined), false);
  } finally {
    destroyTempRepoRoot(root);
  }
});
