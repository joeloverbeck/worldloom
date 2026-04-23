import assert from "node:assert/strict";
import test from "node:test";

import {
  allocateNextId,
  ID_CLASS_FORMATS,
  type AllocateNextIdArgs,
  type IdClass
} from "../../src/tools/allocate-next-id";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

const CLASS_CASES: Array<{ idClass: IdClass; highest: string; expected: string }> = [
  { idClass: "CF", highest: "CF-0047", expected: "CF-0048" },
  { idClass: "CH", highest: "CH-0018", expected: "CH-0019" },
  { idClass: "PA", highest: "PA-0017", expected: "PA-0018" },
  { idClass: "CHAR", highest: "CHAR-0007", expected: "CHAR-0008" },
  { idClass: "DA", highest: "DA-0003", expected: "DA-0004" },
  { idClass: "PR", highest: "PR-0042", expected: "PR-0043" },
  { idClass: "BATCH", highest: "BATCH-0011", expected: "BATCH-0012" },
  { idClass: "NCP", highest: "NCP-0007", expected: "NCP-0008" },
  { idClass: "NCB", highest: "NCB-0001", expected: "NCB-0002" },
  { idClass: "AU", highest: "AU-0002", expected: "AU-0003" },
  { idClass: "RP", highest: "RP-0005", expected: "RP-0006" },
  { idClass: "M", highest: "M-20", expected: "M-21" }
];

function seedAllocationWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      ...CLASS_CASES.map((entry, index) => ({
        node_id: entry.highest,
        world_slug: "seeded",
        file_path: `records/${entry.idClass}-${index + 1}.md`,
        heading_path: entry.highest,
        node_type: "section" as const,
        body: `${entry.highest} body`
      })),
      {
        node_id: "seeded:GEOGRAPHY.md:Brinewick:0",
        world_slug: "seeded",
        file_path: "GEOGRAPHY.md",
        heading_path: "Brinewick",
        node_type: "section" as const,
        body: "Generic structural node that should not affect id allocation."
      }
    ]
  });
}

test("allocateNextId returns the next id for all 12 classes", async () => {
  const root = createTempRepoRoot();

  try {
    seedAllocationWorld(root);

    for (const entry of CLASS_CASES) {
      const result = await withRepoRoot(root, () =>
        allocateNextId({ world_slug: "seeded", id_class: entry.idClass })
      );

      assert.ok(!("code" in result));
      assert.equal(result.next_id, entry.expected);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId returns first-run ids for missing classes", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "empty-fixture",
      nodes: [
        {
          node_id: "empty-fixture:WORLD_KERNEL.md:Kernel:0",
          world_slug: "empty-fixture",
          file_path: "WORLD_KERNEL.md",
          heading_path: "Kernel",
          node_type: "section",
          body: "Kernel text only."
        }
      ]
    });

    const cfResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "empty-fixture", id_class: "CF" })
    );
    const ncpResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "empty-fixture", id_class: "NCP" })
    );
    const mysteryResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "empty-fixture", id_class: "M" })
    );

    assert.ok(!("code" in cfResult));
    assert.ok(!("code" in ncpResult));
    assert.ok(!("code" in mysteryResult));
    assert.equal(cfResult.next_id, "CF-0001");
    assert.equal(ncpResult.next_id, "NCP-0001");
    assert.equal(mysteryResult.next_id, "M-1");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId exposes all 12 id classes with non-padded M formatting", () => {
  assert.deepEqual(Object.keys(ID_CLASS_FORMATS), [
    "CF",
    "CH",
    "PA",
    "CHAR",
    "DA",
    "PR",
    "BATCH",
    "NCP",
    "NCB",
    "AU",
    "RP",
    "M"
  ]);
  assert.equal(ID_CLASS_FORMATS.M.zeroPad, false);
  assert.match("M-21", ID_CLASS_FORMATS.M.regex);
});

test("allocateNextId rejects unsupported id classes in the direct module API", async () => {
  const root = createTempRepoRoot();

  try {
    seedAllocationWorld(root);

    await assert.rejects(
      withRepoRoot(root, () =>
        allocateNextId({
          world_slug: "seeded",
          id_class: "INVALID" as AllocateNextIdArgs["id_class"]
        })
      ),
      /Unsupported id_class/
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
