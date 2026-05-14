import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
  { idClass: "CF", highest: "CF-0047", expected: "CF-48" },
  { idClass: "CH", highest: "CH-0018", expected: "CH-19" },
  { idClass: "PA", highest: "PA-0017", expected: "PA-18" },
  { idClass: "CHAR", highest: "CHAR-0007", expected: "CHAR-8" },
  { idClass: "DA", highest: "DA-0003", expected: "DA-4" },
  { idClass: "PR", highest: "PR-0042", expected: "PR-43" },
  { idClass: "BATCH", highest: "BATCH-0011", expected: "BATCH-12" },
  { idClass: "NCP", highest: "NCP-0007", expected: "NCP-8" },
  { idClass: "NCB", highest: "NCB-0001", expected: "NCB-2" },
  { idClass: "AU", highest: "AU-0002", expected: "AU-3" },
  { idClass: "RP", highest: "RP-0005", expected: "RP-6" },
  { idClass: "EPE", highest: "EPE-0005", expected: "EPE-6" },
  { idClass: "STORY", highest: "STORY-0007", expected: "STORY-8" },
  { idClass: "M", highest: "M-20", expected: "M-21" },
  { idClass: "ONT", highest: "ONT-3", expected: "ONT-4" },
  { idClass: "CAU", highest: "CAU-2", expected: "CAU-3" },
  { idClass: "DIS", highest: "DIS-1", expected: "DIS-2" },
  { idClass: "SOC", highest: "SOC-4", expected: "SOC-5" },
  { idClass: "AES", highest: "AES-3", expected: "AES-4" },
  { idClass: "OQ", highest: "OQ-0014", expected: "OQ-15" },
  { idClass: "ENT", highest: "ENT-0029", expected: "ENT-30" },
  { idClass: "SEC-ELF", highest: "SEC-ELF-006", expected: "SEC-ELF-7" },
  { idClass: "SEC-INS", highest: "SEC-INS-011", expected: "SEC-INS-12" },
  { idClass: "SEC-MTS", highest: "SEC-MTS-002", expected: "SEC-MTS-3" },
  { idClass: "SEC-GEO", highest: "SEC-GEO-018", expected: "SEC-GEO-19" },
  { idClass: "SEC-ECR", highest: "SEC-ECR-005", expected: "SEC-ECR-6" },
  { idClass: "SEC-PAS", highest: "SEC-PAS-007", expected: "SEC-PAS-8" },
  { idClass: "SEC-TML", highest: "SEC-TML-001", expected: "SEC-TML-2" }
];

const STORY_CLASS_CASES: Array<{
  idClass: IdClass;
  subdir: string;
  fileName: string;
  expected: string;
}> = [
  { idClass: "PG", subdir: "pages", fileName: "PG-0007.yaml", expected: "PG-8" },
  { idClass: "SE", subdir: "events", fileName: "SE-0007.yaml", expected: "SE-8" },
  { idClass: "SF", subdir: "facts", fileName: "SF-0007.yaml", expected: "SF-8" },
  { idClass: "BEL", subdir: "beliefs", fileName: "BEL-0007.yaml", expected: "BEL-8" },
  { idClass: "OBL", subdir: "obligations", fileName: "OBL-0007.yaml", expected: "OBL-8" },
  { idClass: "CNSQ", subdir: "consequences", fileName: "CNSQ-0007.yaml", expected: "CNSQ-8" },
  { idClass: "THR", subdir: "threads", fileName: "THR-0007.yaml", expected: "THR-8" },
  { idClass: "SREL", subdir: "relationships", fileName: "SREL-0007.yaml", expected: "SREL-8" },
  { idClass: "STINT", subdir: "intentions", fileName: "STINT-0007.yaml", expected: "STINT-8" },
  { idClass: "SLT", subdir: "storylets", fileName: "SLT-0007.yaml", expected: "SLT-8" },
  { idClass: "SLB", subdir: "storylet-batches", fileName: "SLB-0007.md", expected: "SLB-8" },
  { idClass: "SAU", subdir: "audits", fileName: "SAU-0007-2026-05-03.md", expected: "SAU-8" },
  { idClass: "SP", subdir: "story-promotions", fileName: "SP-0007.md", expected: "SP-8" },
  { idClass: "STLOC", subdir: "locations", fileName: "STLOC-0007.yaml", expected: "STLOC-8" },
  { idClass: "STOBJ", subdir: "objects", fileName: "STOBJ-0007.yaml", expected: "STOBJ-8" },
  { idClass: "BR", subdir: "branches", fileName: "BR-0007.yaml", expected: "BR-8" },
  { idClass: "CHC", subdir: "choices", fileName: "CHC-0007.yaml", expected: "CHC-8" },
  { idClass: "STENT", subdir: "entities", fileName: "STENT-0007.yaml", expected: "STENT-8" },
  { idClass: "STSTAT", subdir: "status", fileName: "STSTAT-0007.yaml", expected: "STSTAT-8" },
  { idClass: "DA", subdir: "artifacts", fileName: "DA-0007.yaml", expected: "DA-8" }
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
  const directory =
    subdir === "storylet-batches" || subdir === "audits" || subdir === "story-promotions"
      ? path.join(root, "worlds", "seeded", "stories", storySlug, subdir)
      : path.join(root, "worlds", "seeded", "stories", storySlug, "_source", subdir);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, fileName), "id: placeholder\n", "utf8");
}

function writeRemediationProposal(
  root: string,
  storySlug: string,
  auditId: string,
  fileName: string
): void {
  const directory = path.join(
    root,
    "worlds",
    "seeded",
    "stories",
    storySlug,
    "audits",
    auditId,
    "remediation-storylet-proposals"
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, fileName), "rsp_id: placeholder\n", "utf8");
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
    assert.equal(cfResult.next_id, "CF-1");
    assert.equal(ncpResult.next_id, "NCP-1");
    assert.equal(mysteryResult.next_id, "M-1");
    assert.equal(aesResult.next_id, "AES-1");
    assert.equal(secResult.next_id, "SEC-GEO-1");
    assert.equal(epeResult.next_id, "EPE-1");
    assert.equal(storyResult.next_id, "STORY-1");
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
    assert.equal(result.next_id, "STORY-8");
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
    const slbResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "SLB", story_slug: "empty-story" })
    );
    const sauResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "SAU", story_slug: "empty-story" })
    );
    const spResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "SP", story_slug: "empty-story" })
    );
    const beliefResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "BEL", story_slug: "empty-story" })
    );
    const statusResult = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "STSTAT", story_slug: "empty-story" })
    );

    assert.ok(!("code" in pageResult));
    assert.ok(!("code" in stintResult));
    assert.ok(!("code" in slbResult));
    assert.ok(!("code" in sauResult));
    assert.ok(!("code" in spResult));
    assert.ok(!("code" in beliefResult));
    assert.ok(!("code" in statusResult));
    assert.equal(pageResult.next_id, "PG-1");
    assert.equal(stintResult.next_id, "STINT-1");
    assert.equal(slbResult.next_id, "SLB-1");
    assert.equal(sauResult.next_id, "SAU-1");
    assert.equal(spResult.next_id, "SP-1");
    assert.equal(beliefResult.next_id, "BEL-1");
    assert.equal(statusResult.next_id, "STSTAT-1");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId returns first-run story-scoped ids for fresh missing story bundles", async () => {
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

    const storyDirectory = path.join(root, "worlds", "seeded", "stories", "fresh-bundle");
    assert.equal(existsSync(storyDirectory), false);

    for (const entry of STORY_CLASS_CASES) {
      const result = await withRepoRoot(root, () =>
        allocateNextId({
          world_slug: "seeded",
          id_class: entry.idClass,
          story_slug: "fresh-bundle"
        })
      );

      assert.ok(!("code" in result));
      assert.equal(result.next_id, `${entry.idClass}-1`);
    }

    assert.equal(existsSync(storyDirectory), false);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId ignores legacy suffixed STINT records", async () => {
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
    mkdirSync(path.join(root, "worlds", "seeded", "stories", "legacy-intentions"), {
      recursive: true
    });
    writeStoryRecord(root, "legacy-intentions", "intentions", "STINT-0001-iker.yaml");
    writeStoryRecord(root, "legacy-intentions", "intentions", "STINT-0001-marla.yaml");

    const result = await withRepoRoot(root, () =>
      allocateNextId({
        world_slug: "seeded",
        id_class: "STINT",
        story_slug: "legacy-intentions"
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.next_id, "STINT-1");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId counts only bare-numeric STINT records when legacy suffixes coexist", async () => {
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
    mkdirSync(path.join(root, "worlds", "seeded", "stories", "mixed-intentions"), {
      recursive: true
    });
    writeStoryRecord(root, "mixed-intentions", "intentions", "STINT-0001-iker.yaml");
    writeStoryRecord(root, "mixed-intentions", "intentions", "STINT-0001-marla.yaml");
    writeStoryRecord(root, "mixed-intentions", "intentions", "STINT-0001.yaml");

    const result = await withRepoRoot(root, () =>
      allocateNextId({
        world_slug: "seeded",
        id_class: "STINT",
        story_slug: "mixed-intentions"
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.next_id, "STINT-2");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId counts SP ledger and proposal-package sidecar files together", async () => {
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
    mkdirSync(path.join(root, "worlds", "seeded", "stories", "wolf-tale"), { recursive: true });
    writeStoryRecord(root, "wolf-tale", "story-promotions", "SP-0001.md");
    writeStoryRecord(root, "wolf-tale", "story-promotions", "SP-0003-proposal-package.yaml");
    writeStoryRecord(root, "wolf-tale", "story-promotions", "SP-9999-draft.yaml");
    writeStoryRecord(root, "wolf-tale", "story-promotions", "not-an-sp.md");
    writeStoryRecord(root, "other-story", "story-promotions", "SP-0099.md");

    const result = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "SP", story_slug: "wolf-tale" })
    );

    assert.ok(!("code" in result));
    assert.equal(result.next_id, "SP-4");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId returns next sub-audit-scoped RSP ids per SAU directory", async () => {
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
    mkdirSync(path.join(root, "worlds", "seeded", "stories", "wolf-tale"), { recursive: true });
    writeRemediationProposal(root, "wolf-tale", "SAU-0003", "RSP-0001-payoff.md");
    writeRemediationProposal(root, "wolf-tale", "SAU-0003", "RSP-0003-escalation.md");
    writeRemediationProposal(root, "wolf-tale", "SAU-0003", "not-an-rsp.md");
    writeRemediationProposal(root, "wolf-tale", "SAU-0007", "RSP-0099-other-audit.md");
    writeRemediationProposal(root, "other-story", "SAU-0003", "RSP-0088-other-story.md");

    const nextForAudit = await withRepoRoot(root, () =>
      allocateNextId({
        world_slug: "seeded",
        id_class: "RSP",
        story_slug: "wolf-tale",
        audit_id: "SAU-0003"
      })
    );
    const firstRunForMissingAuditDirectory = await withRepoRoot(root, () =>
      allocateNextId({
        world_slug: "seeded",
        id_class: "RSP",
        story_slug: "wolf-tale",
        audit_id: "SAU-0004"
      })
    );

    assert.ok(!("code" in nextForAudit));
    assert.ok(!("code" in firstRunForMissingAuditDirectory));
    assert.equal(nextForAudit.next_id, "RSP-4");
    assert.equal(firstRunForMissingAuditDirectory.next_id, "RSP-1");
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
    assert.equal(batchResult.next_id, "NWB-2");
    assert.equal(proposalResult.next_id, "NWP-9");
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
    assert.equal(batchResult.next_id, "NWB-1");
    assert.equal(proposalResult.next_id, "NWP-1");
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
    mkdirSync(path.join(root, "worlds", "seeded", "stories", "wolf-tale"), { recursive: true });

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
    const sauWithPipelineSlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "__pipeline__", id_class: "SAU", story_slug: "wolf-tale" })
    );
    const storyScopedWithoutStorySlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "PG" })
    );
    const beliefWithoutStorySlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "BEL" })
    );
    const sauWithoutStorySlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "SAU" })
    );
    const spWithoutStorySlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "SP" })
    );
    const rspWithoutStorySlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "RSP", audit_id: "SAU-0001" })
    );
    const rspWithoutAuditId = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "RSP", story_slug: "wolf-tale" })
    );
    const rspWithMalformedAuditId = await withRepoRoot(root, () =>
      allocateNextId({
        world_slug: "seeded",
        id_class: "RSP",
        story_slug: "wolf-tale",
        audit_id: "SAU-X"
      })
    );
    const nonSubAuditScopedWithAuditId = await withRepoRoot(root, () =>
      allocateNextId({
        world_slug: "seeded",
        id_class: "SAU",
        story_slug: "wolf-tale",
        audit_id: "SAU-0001"
      })
    );
    const worldScopedWithStorySlug = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "seeded", id_class: "CF", story_slug: "wolf-tale" })
    );
    const storyScopedMissingWorld = await withRepoRoot(root, () =>
      allocateNextId({ world_slug: "missing-world", id_class: "PG", story_slug: "missing-story" })
    );

    assert.ok("code" in pipelineClassWithWorldSlug);
    assert.ok("code" in worldClassWithPipelineSlug);
    assert.ok("code" in epeWithPipelineSlug);
    assert.ok("code" in storyWithPipelineSlug);
    assert.ok("code" in sauWithPipelineSlug);
    assert.ok("code" in storyScopedWithoutStorySlug);
    assert.ok("code" in beliefWithoutStorySlug);
    assert.ok("code" in sauWithoutStorySlug);
    assert.ok("code" in spWithoutStorySlug);
    assert.ok("code" in rspWithoutStorySlug);
    assert.ok("code" in rspWithoutAuditId);
    assert.ok("code" in rspWithMalformedAuditId);
    assert.ok("code" in nonSubAuditScopedWithAuditId);
    assert.ok("code" in worldScopedWithStorySlug);
    assert.ok("code" in storyScopedMissingWorld);
    assert.equal(pipelineClassWithWorldSlug.code, "invalid_input");
    assert.equal(worldClassWithPipelineSlug.code, "invalid_input");
    assert.equal(epeWithPipelineSlug.code, "invalid_input");
    assert.equal(storyWithPipelineSlug.code, "invalid_input");
    assert.equal(sauWithPipelineSlug.code, "invalid_input");
    assert.equal(storyScopedWithoutStorySlug.code, "invalid_input");
    assert.equal(beliefWithoutStorySlug.code, "invalid_input");
    assert.equal(sauWithoutStorySlug.code, "invalid_input");
    assert.equal(spWithoutStorySlug.code, "invalid_input");
    assert.equal(rspWithoutStorySlug.code, "invalid_input");
    assert.equal(rspWithoutAuditId.code, "invalid_input");
    assert.equal(rspWithMalformedAuditId.code, "invalid_input");
    assert.equal(nonSubAuditScopedWithAuditId.code, "invalid_input");
    assert.equal(worldScopedWithStorySlug.code, "invalid_input");
    assert.equal(storyScopedMissingWorld.code, "world_not_found");
    assert.match(pipelineClassWithWorldSlug.message, /__pipeline__/);
    assert.match(worldClassWithPipelineSlug.message, /NWB, NWP/);
    assert.match(sauWithPipelineSlug.message, /NWB, NWP/);
    assert.match(storyScopedWithoutStorySlug.message, /requires story_slug/);
    assert.match(beliefWithoutStorySlug.message, /requires story_slug/);
    assert.match(sauWithoutStorySlug.message, /requires story_slug/);
    assert.match(spWithoutStorySlug.message, /requires story_slug/);
    assert.match(rspWithoutStorySlug.message, /requires story_slug/);
    assert.match(rspWithoutAuditId.message, /requires audit_id/);
    assert.match(rspWithMalformedAuditId.message, /SAU-<integer>/);
    assert.match(nonSubAuditScopedWithAuditId.message, /does not accept audit_id/);
    assert.match(worldScopedWithStorySlug.message, /does not accept story_slug/);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("allocateNextId exposes all 50 id classes with canonical unpadded formats", () => {
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
    "RSP",
    "SAU",
    "SP",
    "EPE",
    "STORY",
    "PG",
    "SE",
    "SF",
    "BEL",
    "OBL",
    "CNSQ",
    "THR",
    "SREL",
    "STINT",
    "SLT",
    "SLB",
    "STLOC",
    "STOBJ",
    "BR",
    "CHC",
    "STENT",
    "STSTAT",
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
  assert.equal(Object.keys(ID_CLASS_FORMATS).length, 50);
  assert.equal(ID_CLASS_FORMATS.M.zeroPad, false);
  assert.equal(ID_CLASS_FORMATS.STORY.zeroPad, false);
  assert.match("STORY-8", ID_CLASS_FORMATS.STORY.regex);
  assert.equal(ID_CLASS_FORMATS.BEL.zeroPad, false);
  assert.match("BEL-8", ID_CLASS_FORMATS.BEL.regex);
  assert.equal(ID_CLASS_FORMATS.STSTAT.zeroPad, false);
  assert.match("STSTAT-8", ID_CLASS_FORMATS.STSTAT.regex);
  assert.equal(ID_CLASS_FORMATS.PG.zeroPad, false);
  assert.match("PG-8", ID_CLASS_FORMATS.PG.regex);
  assert.match("STINT-8", ID_CLASS_FORMATS.STINT.regex);
  assert.doesNotMatch("STINT-0008-rill", ID_CLASS_FORMATS.STINT.regex);
  assert.match("SLB-8", ID_CLASS_FORMATS.SLB.regex);
  assert.match("RSP-8-payoff", ID_CLASS_FORMATS.RSP.regex);
  assert.match("SAU-8-2026-05-03", ID_CLASS_FORMATS.SAU.regex);
  assert.match("SP-8-proposal-package", ID_CLASS_FORMATS.SP.regex);
  assert.match("M-21", ID_CLASS_FORMATS.M.regex);
  assert.equal(ID_CLASS_FORMATS.OQ.zeroPad, false);
  assert.match("OQ-1", ID_CLASS_FORMATS.OQ.regex);
  assert.equal(ID_CLASS_FORMATS.AES.zeroPad, false);
  assert.match("AES-1", ID_CLASS_FORMATS.AES.regex);
  assert.equal(ID_CLASS_FORMATS["SEC-GEO"].width, 1);
  assert.match("SEC-GEO-1", ID_CLASS_FORMATS["SEC-GEO"].regex);
  assert.match("NWB-1", ID_CLASS_FORMATS.NWB.regex);
  assert.match("NWP-1", ID_CLASS_FORMATS.NWP.regex);
  assert.match("EPE-1", ID_CLASS_FORMATS.EPE.regex);
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
    await assert.rejects(
      withRepoRoot(root, () =>
        allocateNextId({
          world_slug: "seeded",
          id_class: "ARCTRACE" as AllocateNextIdArgs["id_class"],
          story_slug: "opening-bells"
        })
      ),
      /Unsupported id_class 'ARCTRACE'/
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});
