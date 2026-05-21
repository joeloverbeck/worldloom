import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { indexDiskConsistency } from "../../src/structural/index-disk-consistency.js";
import { context, record } from "./helpers.js";

test("index_disk_consistency reports artifacts missing from INDEX.md", async () => {
  const worldRoot = createWorldRoot();
  try {
    writeSurface(worldRoot, "proposals", {
      index: "",
      files: ["PR-1-hidden-guild.md"]
    });

    const verdicts = await indexDiskConsistency.run(
      { world_root: worldRoot },
      context([
        record("proposal_card", "PR-1", "proposals/PR-1-hidden-guild.md", { proposal_id: "PR-1" })
      ], { run_mode: "pre-apply" })
    );

    assert.equal(verdicts.length, 1);
    assert.equal(verdicts[0]?.validator, "index_disk_consistency");
    assert.equal(verdicts[0]?.severity, "fail");
    assert.equal(verdicts[0]?.code, "index_disk_drift");
    assert.match(verdicts[0]?.message ?? "", /missing an entry/);
    assert.deepEqual(verdicts[0]?.location, {
      file: "proposals/PR-1-hidden-guild.md",
      node_id: "PR-1"
    });
    assert.deepEqual(verdicts[0]?.detail, {
      surface: "proposals",
      drift_kind: "artifact_missing_from_index",
      index_path: "proposals/INDEX.md",
      artifact_path: "proposals/PR-1-hidden-guild.md"
    });
  } finally {
    rmSync(worldRoot, { recursive: true, force: true });
  }
});

test("index_disk_consistency reports INDEX.md entries missing on disk", async () => {
  const worldRoot = createWorldRoot();
  try {
    writeSurface(worldRoot, "character-proposals", {
      index: "- [Absent Candidate](NCP-2-absent.md) — protagonist\n",
      files: []
    });

    const verdicts = await indexDiskConsistency.run({ world_root: worldRoot }, context([]));

    assert.equal(verdicts.length, 1);
    assert.equal(verdicts[0]?.severity, "warn");
    assert.equal(verdicts[0]?.code, "index_disk_drift");
    assert.match(verdicts[0]?.message ?? "", /not present on disk/);
    assert.deepEqual(verdicts[0]?.location, {
      file: "character-proposals/INDEX.md",
      node_id: "NCP-2-absent"
    });
    assert.deepEqual(verdicts[0]?.detail, {
      surface: "character-proposals",
      drift_kind: "index_entry_missing_on_disk",
      index_path: "character-proposals/INDEX.md",
      artifact_path: "character-proposals/NCP-2-absent.md"
    });
  } finally {
    rmSync(worldRoot, { recursive: true, force: true });
  }
});

test("index_disk_consistency accepts matching INDEX.md and disk artifacts", async () => {
  const worldRoot = createWorldRoot();
  try {
    writeSurface(worldRoot, "audits", {
      index: "- [AU-1](AU-1-check.md) — periodic\n",
      files: ["AU-1-check.md"]
    });

    const verdicts = await indexDiskConsistency.run(
      { world_root: worldRoot },
      context([
        record("audit_record", "AU-1", "audits/AU-1-check.md", { audit_id: "AU-1" })
      ])
    );

    assert.deepEqual(verdicts, []);
  } finally {
    rmSync(worldRoot, { recursive: true, force: true });
  }
});

test("index_disk_consistency checks pressure and proposal-family surfaces only", async () => {
  const worldRoot = createWorldRoot();
  try {
    writeSurface(worldRoot, "pressure-events", {
      index: "- [Storm Pressure](EPE-1-storm.md) — local\n",
      files: ["EPE-1-storm.md", "EPE-1-storm.proposal.md"]
    });

    const verdicts = await indexDiskConsistency.run(
      { world_root: worldRoot },
      context([
        record("pressure_event_card", "EPE-1", "pressure-events/EPE-1-storm.md", { event_id: "EPE-1" }),
        record("pressure_event_sidecar_proposal", "PR-1", "pressure-events/EPE-1-storm.proposal.md", { proposal_id: "PR-1" })
      ])
    );

    assert.deepEqual(verdicts, []);
  } finally {
    rmSync(worldRoot, { recursive: true, force: true });
  }
});

function createWorldRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "worldloom-index-disk-"));
}

function writeSurface(
  worldRoot: string,
  directory: string,
  options: { index: string; files: string[] }
): void {
  const absoluteDirectory = path.join(worldRoot, directory);
  mkdirSync(absoluteDirectory, { recursive: true });
  writeFileSync(path.join(absoluteDirectory, "INDEX.md"), options.index, "utf8");
  for (const file of options.files) {
    writeFileSync(path.join(absoluteDirectory, file), "---\n---\n", "utf8");
  }
}
