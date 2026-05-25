import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { allocateManyIds } from "../../src/tools/allocate-many-ids.js";
import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";

function writeStoryRecord(root: string, storySlug: string, subdir: string, fileName: string): void {
  const directory = path.join(root, "worlds", "seeded", "stories", storySlug, "_source", subdir);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, fileName), "id: placeholder\n", "utf8");
}

function seedMinimalWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CF-2",
        world_slug: "seeded",
        file_path: "_source/canon/CF-2.yaml",
        heading_path: "CF-2",
        node_type: "canon_fact_record",
        body: "id: CF-2\n"
      },
      {
        node_id: "M-4",
        world_slug: "seeded",
        file_path: "_source/mystery-reserve/M-4.yaml",
        heading_path: "M-4",
        node_type: "mystery_reserve_entry",
        body: "id: M-4\n"
      }
    ]
  });
}

test("allocateManyIds preserves request order and cross-class independence", async () => {
  const root = createTempRepoRoot();

  try {
    seedMinimalWorld(root);

    const result = await withRepoRoot(root, () =>
      allocateManyIds({
        world_slug: "seeded",
        allocations: [
          { id_class: "M" },
          { id_class: "BEL", story_slug: "fresh-story" },
          { id_class: "CF" },
          { id_class: "STORY" }
        ]
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.allocations, [
      { id_class: "M", allocated_id: "M-5" },
      { id_class: "BEL", allocated_id: "BEL-1" },
      { id_class: "CF", allocated_id: "CF-3" },
      { id_class: "STORY", allocated_id: "STORY-1" }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateManyIds increments repeated same-scope allocations within one batch", async () => {
  const root = createTempRepoRoot();

  try {
    seedMinimalWorld(root);
    writeStoryRecord(root, "wolf-tale", "beliefs", "BEL-7.yaml");

    const result = await withRepoRoot(root, () =>
      allocateManyIds({
        world_slug: "seeded",
        allocations: [
          { id_class: "BEL", story_slug: "wolf-tale" },
          { id_class: "BEL", story_slug: "wolf-tale" },
          { id_class: "BEL", story_slug: "fresh-story" }
        ]
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.allocations, [
      { id_class: "BEL", allocated_id: "BEL-8" },
      { id_class: "BEL", allocated_id: "BEL-9" },
      { id_class: "BEL", allocated_id: "BEL-1" }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateManyIds supports bootstrap-shaped multi-class story allocation", async () => {
  const root = createTempRepoRoot();

  try {
    seedMinimalWorld(root);
    const classes = [
      "STCHAR",
      "STENT",
      "STSTAT",
      "STINT",
      "SF",
      "BEL",
      "OBL",
      "CNSQ",
      "THR",
      "SREL",
      "STLOC",
      "STOBJ",
      "CLK",
      "STSEC",
      "STQ",
      "STPLAN",
      "STEMO",
      "BR",
      "SE",
      "PG",
      "CHC",
      "SLT"
    ] as const;

    const result = await withRepoRoot(root, () =>
      allocateManyIds({
        world_slug: "seeded",
        allocations: [
          { id_class: "STORY" },
          ...classes.map((idClass) => ({ id_class: idClass, story_slug: "new-bundle" }))
        ]
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.allocations.map((entry) => entry.allocated_id), [
      "STORY-1",
      ...classes.map((idClass) => `${idClass}-1`)
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateManyIds returns prior successes when a later allocation fails", async () => {
  const root = createTempRepoRoot();

  try {
    seedMinimalWorld(root);

    const result = await withRepoRoot(root, () =>
      allocateManyIds({
        world_slug: "seeded",
        allocations: [
          { id_class: "CF" },
          { id_class: "RSP", story_slug: "fresh-story", audit_id: "SAU-1" }
        ]
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.deepEqual(result.details?.successful_allocations, [
      { id_class: "CF", allocated_id: "CF-3" }
    ]);
    assert.equal(result.details?.failed_allocation_index, 1);
  } finally {
    destroyTempRepoRoot(root);
  }
});
