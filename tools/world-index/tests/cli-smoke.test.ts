import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { cleanup, createAtomicRepoRoot } from "./helpers/atomic-fixture.js";

const cliPath = path.resolve(import.meta.dirname, "..", "src", "cli.js");

test("--version prints the package version", () => {
  const result = spawnSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "0.1.0");
  assert.equal(result.stderr.trim(), "");
});

test("--help prints the command synopsis", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: world-index <command> \[options\]/);
  assert.match(result.stdout, /build <world-slug>/);
  assert.match(result.stdout, /render <world-slug>/);
  assert.equal(result.stderr.trim(), "");
});

test("render --story prints indexed story-bundle records through the CLI", () => {
  const root = createAtomicRepoRoot();

  try {
    const buildResult = spawnSync(process.execPath, [cliPath, "build", "atomic-world"], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(buildResult.status, 0);

    const renderResult = spawnSync(
      process.execPath,
      [cliPath, "render", "atomic-world", "--story", "harborwatch"],
      {
        cwd: root,
        encoding: "utf8"
      }
    );

    assert.equal(renderResult.status, 0);
    assert.match(renderResult.stdout, /# Story Bundle: harborwatch/);
    assert.match(renderResult.stdout, /node_type: storylet_record/);
    assert.equal(renderResult.stderr.trim(), "");
  } finally {
    cleanup(root);
  }
});
