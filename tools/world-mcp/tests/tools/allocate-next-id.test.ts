import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  allocateNextId,
  ID_CLASS_FORMATS,
  type AllocateNextIdArgs,
  type IdClass
} from "../../src/tools/allocate-next-id";
import { ID_CLASSES } from "../../src/server";

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
  { idClass: "EPE", highest: "EPE-0005", expected: "EPE-0006" },
  { idClass: "STORY", highest: "STORY-0007", expected: "STORY-0008" },
  { idClass: "M", highest: "M-20", expected: "M-21" },
  { idClass: "ONT", highest: "ONT-3", expected: "ONT-4" },
  { idClass: "CAU", highest: "CAU-2", expected: "CAU-3" },
  { idClass: "DIS", highest: "DIS-1", expected: "DIS-2" },
  { idClass: "SOC", highest: "SOC-4", expected: "SOC-5" },
  { idClass: "AES", highest: "AES-3", expected: "AES-4" },
  { idClass: "OQ", highest: "OQ-0014", expected: "OQ-0015" },
  { idClass: "ENT", highest: "ENT-0029", expected: "ENT-0030" },
  { idClass: "SEC-ELF", highest: "SEC-ELF-006", expected: "SEC-ELF-007" },
  { idClass: "SEC-INS", highest: "SEC-INS-011", expected: "SEC-INS-012" },
  { idClass: "SEC-MTS", highest: "SEC-MTS-002", expected: "SEC-MTS-003" },
  { idClass: "SEC-GEO", highest: "SEC-GEO-018", expected: "SEC-GEO-019" },
  { idClass: "SEC-ECR", highest: "SEC-ECR-005", expected: "SEC-ECR-006" },
  { idClass: "SEC-PAS", highest: "SEC-PAS-007", expected: "SEC-PAS-008" },
  { idClass: "SEC-TML", highest: "SEC-TML-001", expected: "SEC-TML-002" }
];

const STORY_CLASS_CASES: Array<{
  idClass: IdClass;
  subdir: string;
  fileName: string;
  expected: string;
}> = [
  { idClass: "PG", subdir: "pages", fileName: "PG-0007.yaml", expected: "PG-0008" },
  { idClass: "SE", subdir: "events", fileName: "SE-0007.yaml", expected: "SE-0008" },
  { idClass: "SF", subdir: "facts", fileName: "SF-0007.yaml", expected: "SF-0008" },
  { idClass: "OBL", subdir: "obligations", fileName: "OBL-0007.yaml", expected: "OBL-0008" },
  { idClass: "CNSQ", subdir: "consequences", fileName: "CNSQ-0007.yaml", expected: "CNSQ-0008" },
  { idClass: "THR", subdir: "threads", fileName: "THR-0007.yaml", expected: "THR-0008" },
  { idClass: "SREL", subdir: "relationships", fileName: "SREL-0007.yaml", expected: "SREL-0008" },
  { idClass: "STINT", subdir: "intentions", fileName: "STINT-0007-rill.yaml", expected: "STINT-0008" },
  { idClass: "SLT", subdir: "storylets", fileName: "SLT-0007.yaml", expected: "SLT-0008" },
  { idClass: "STLOC", subdir: "locations", fileName: "STLOC-0007.yaml", expected: "STLOC-0008" },
  { idClass: "STOBJ", subdir: "objects", fileName: "STOBJ-0007.yaml", expected: "STOBJ-0008" },
  { idClass: "BR", subdir: "branches", fileName: "BR-0007.yaml", expected: "BR-0008" },
  { idClass: "CHC", subdir: "choices", fileName: "CHC-0007.yaml", expected: "CHC-0008" },
  { idClass: "STENT", subdir: "entities", fileName: "STENT-0007.yaml", expected: "STENT-0008" },
  { idClass: "DA", subdir: "artifacts", fileName: "DA-0007.yaml", expected: "DA-0008" }
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

function writeStoryKernel(root: string, storySlug: string, content: string): void {
  const directory = path.join(root, "worlds", "seeded", "stories", storySlug);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "STORY_KERNEL.md"), content, "utf8");
}

function writeStoryRecord(root: string, storySlug: string, subdir: string, fileName: string): void {
  const directory = path.join(root, "worlds", "seeded", "stories", storySlug, "_source", subdir);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, fileName), "id: placeholder\n", "utf8");
}

test("allocateNextId returns the next id for all supported classes", async () => {
  const root = createTempRepoRoot();

  try {
    seedAllocationWorld(root);
    mkdirSync(path.join(root, "worlds", "seeded", "pressure-events"), { recursive: true });
    writeFileSync(
      path.join(root, "worlds", "seeded", "pressure-events", "EPE-0005-spring-fever.md"),
      "event",
      "utf8"
    );
    writeFileSync(
      path.join(root, "worlds", "seeded", "pressure-events", "EPE-0008-sidecar.proposal.md"),
      "proposal",
      "utf8"
    );
    writeStoryKernel(root, "current-high", "---\nstory_id: STORY-0007\n---\n# Current High\n");

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

test("allocateNextId returns first-run ids for missing world-scoped classes", async () => {
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
    const aesResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "empty-fixture", id_class: "AES" })
    );
    const secResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "empty-fixture", id_class: "SEC-GEO" })
    );
    const epeResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "empty-fixture", id_class: "EPE" })
    );
    const storyResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "empty-fixture", id_class: "STORY" })
    );

    assert.ok(!("code" in cfResult));
    assert.ok(!("code" in ncpResult));
    assert.ok(!("code" in mysteryResult));
    assert.ok(!("code" in aesResult));
    assert.ok(!("code" in secResult));
    assert.ok(!("code" in epeResult));
    assert.ok(!("code" in storyResult));
    assert.equal(cfResult.next_id, "CF-0001");
    assert.equal(ncpResult.next_id, "NCP-0001");
    assert.equal(mysteryResult.next_id, "M-1");
    assert.equal(aesResult.next_id, "AES-1");
    assert.equal(secResult.next_id, "SEC-GEO-001");
    assert.equal(epeResult.next_id, "EPE-0001");
    assert.equal(storyResult.next_id, "STORY-0001");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId scans STORY_KERNEL frontmatter for story ids", async () => {
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
          body: "Kernel text only."
        }
      ]
    });

    writeStoryKernel(root, "opening-bells", "---\nstory_id: STORY-0005\n---\n# Opening Bells\n");
    writeStoryKernel(root, "salt-thread", "---\nstory_id: STORY-0007\n---\n# Salt Thread\n");
    writeStoryKernel(root, "malformed", "---\nstory_id: [not-valid\n---\n# Malformed\n");
    writeStoryKernel(root, "wrong-id-class", "---\nstory_id: PG-0009\n---\n# Wrong Class\n");
    mkdirSync(path.join(root, "worlds", "seeded", "stories", "partial-bundle"), {
      recursive: true
    });
    writeFileSync(path.join(root, "worlds", "seeded", "stories", "README.md"), "ignored", "utf8");

    const result = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "STORY" })
    );

    assert.ok(!("code" in result));
    assert.equal(result.next_id, "STORY-0008");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId returns the next id for story-scoped classes", async () => {
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
          body: "Kernel text only."
        }
      ]
    });

    for (const entry of STORY_CLASS_CASES) {
      writeStoryRecord(root, "wolf-tale", entry.subdir, entry.fileName);
      writeStoryRecord(root, "wolf-tale", entry.subdir, `${entry.idClass}-0003.yaml`);
      writeStoryRecord(root, "other-story", entry.subdir, `${entry.idClass}-0099.yaml`);
    }

    for (const entry of STORY_CLASS_CASES) {
      const result = await withRepoRoot(root, () =>
        allocateNextId({
          world_slug: "seeded",
          id_class: entry.idClass,
          story_slug: "wolf-tale"
        })
      );

      assert.ok(!("code" in result));
      assert.equal(result.next_id, entry.expected);
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId returns first-run story-scoped ids", async () => {
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
          body: "Kernel text only."
        }
      ]
    });
    mkdirSync(path.join(root, "worlds", "seeded", "stories", "empty-story"), { recursive: true });

    const pageResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "PG", story_slug: "empty-story" })
    );
    const stintResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "STINT", story_slug: "empty-story" })
    );

    assert.ok(!("code" in pageResult));
    assert.ok(!("code" in stintResult));
    assert.equal(pageResult.next_id, "PG-0001");
    assert.equal(stintResult.next_id, "STINT-0001");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId returns the next pipeline-scoped ids from world-proposals", async () => {
  const root = createTempRepoRoot();

  try {
    mkdirSync(path.join(root, "world-proposals", "batches"), { recursive: true });
    writeFileSync(path.join(root, "world-proposals", "batches", "NWB-0001.md"), "batch", "utf8");
    writeFileSync(path.join(root, "world-proposals", "NWP-0008-the-cipher.md"), "card", "utf8");
    writeFileSync(path.join(root, "world-proposals", "NWP-not-an-id.md"), "ignored", "utf8");

    const batchResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "__pipeline__", id_class: "NWB" })
    );
    const proposalResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "__pipeline__", id_class: "NWP" })
    );

    assert.ok(!("code" in batchResult));
    assert.ok(!("code" in proposalResult));
    assert.equal(batchResult.next_id, "NWB-0002");
    assert.equal(proposalResult.next_id, "NWP-0009");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId returns first-run pipeline ids when world-proposals is absent", async () => {
  const root = createTempRepoRoot();

  try {
    const batchResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "__pipeline__", id_class: "NWB" })
    );
    const proposalResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "__pipeline__", id_class: "NWP" })
    );

    assert.ok(!("code" in batchResult));
    assert.ok(!("code" in proposalResult));
    assert.equal(batchResult.next_id, "NWB-0001");
    assert.equal(proposalResult.next_id, "NWP-0001");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId rejects cross-scope world_slug and id_class combinations", async () => {
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
          body: "Kernel text only."
        }
      ]
    });

    const pipelineClassWithWorldSlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "NWB" })
    );
    const worldClassWithPipelineSlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "__pipeline__", id_class: "CF" })
    );
    const epeWithPipelineSlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "__pipeline__", id_class: "EPE" })
    );
    const storyWithPipelineSlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "__pipeline__", id_class: "STORY" })
    );
    const storyScopedWithoutStorySlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "PG" })
    );
    const worldScopedWithStorySlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "CF", story_slug: "wolf-tale" })
    );
    const storyScopedMissingStory = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "PG", story_slug: "missing-story" })
    );

    assert.ok("code" in pipelineClassWithWorldSlug);
    assert.ok("code" in worldClassWithPipelineSlug);
    assert.ok("code" in epeWithPipelineSlug);
    assert.ok("code" in storyWithPipelineSlug);
    assert.ok("code" in storyScopedWithoutStorySlug);
    assert.ok("code" in worldScopedWithStorySlug);
    assert.ok("code" in storyScopedMissingStory);
    assert.equal(pipelineClassWithWorldSlug.code, "invalid_input");
    assert.equal(worldClassWithPipelineSlug.code, "invalid_input");
    assert.equal(epeWithPipelineSlug.code, "invalid_input");
    assert.equal(storyWithPipelineSlug.code, "invalid_input");
    assert.equal(storyScopedWithoutStorySlug.code, "invalid_input");
    assert.equal(worldScopedWithStorySlug.code, "invalid_input");
    assert.equal(storyScopedMissingStory.code, "invalid_input");
    assert.match(pipelineClassWithWorldSlug.message, /__pipeline__/);
    assert.match(worldClassWithPipelineSlug.message, /NWB, NWP/);
    assert.match(storyScopedWithoutStorySlug.message, /requires story_slug/);
    assert.match(worldScopedWithStorySlug.message, /does not accept story_slug/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId exposes all 44 id classes with existing formats preserved", () => {
  assert.deepEqual(Object.keys(ID_CLASS_FORMATS), [
    "CF",
    "CH",
    "PA",
    "CHAR",
    "DA",
    "PR",
    "BATCH",
    "NWB",
    "NWP",
    "NCP",
    "NCB",
    "AU",
    "RP",
    "EPE",
    "STORY",
    "PG",
    "SE",
    "SF",
    "OBL",
    "CNSQ",
    "THR",
    "SREL",
    "STINT",
    "SLT",
    "STLOC",
    "STOBJ",
    "BR",
    "CHC",
    "STENT",
    "M",
    "ONT",
    "CAU",
    "DIS",
    "SOC",
    "AES",
    "OQ",
    "ENT",
    "SEC-ELF",
    "SEC-INS",
    "SEC-MTS",
    "SEC-GEO",
    "SEC-ECR",
    "SEC-PAS",
    "SEC-TML"
  ]);
  assert.equal(Object.keys(ID_CLASS_FORMATS).length, 44);
  assert.equal(ID_CLASS_FORMATS.M.zeroPad, false);
  assert.equal(ID_CLASS_FORMATS.STORY.zeroPad, true);
  assert.match("STORY-0008", ID_CLASS_FORMATS.STORY.regex);
  assert.equal(ID_CLASS_FORMATS.PG.zeroPad, true);
  assert.match("PG-0008", ID_CLASS_FORMATS.PG.regex);
  assert.match("STINT-0008-rill", ID_CLASS_FORMATS.STINT.regex);
  assert.match("M-21", ID_CLASS_FORMATS.M.regex);
  assert.equal(ID_CLASS_FORMATS.OQ.zeroPad, true);
  assert.match("OQ-0001", ID_CLASS_FORMATS.OQ.regex);
  assert.equal(ID_CLASS_FORMATS.AES.zeroPad, false);
  assert.match("AES-1", ID_CLASS_FORMATS.AES.regex);
  assert.equal(ID_CLASS_FORMATS["SEC-GEO"].width, 3);
  assert.match("SEC-GEO-001", ID_CLASS_FORMATS["SEC-GEO"].regex);
  assert.match("NWB-0001", ID_CLASS_FORMATS.NWB.regex);
  assert.match("NWP-0001", ID_CLASS_FORMATS.NWP.regex);
  assert.match("EPE-0001", ID_CLASS_FORMATS.EPE.regex);
});

test("allocateNextId class formats stay in lockstep with the MCP input enum", () => {
  assert.deepEqual([...Object.keys(ID_CLASS_FORMATS)].sort(), [...ID_CLASSES].sort());
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
