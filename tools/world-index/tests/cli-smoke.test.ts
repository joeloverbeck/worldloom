import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
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
  assert.match(result.stdout, /2  invalid world slug or world-root resolution failure/);
  assert.equal(result.stderr.trim(), "");
});

test("render --story prints indexed story-bundle records through the CLI", () => {
  const root = createAtomicRepoRoot();

  try {
    const buildResult = spawnSync(process.execPath, [cliPath, "build", "atomic-world"], {
      cwd: root,
      env: { ...process.env, WORLDLOOM_ROOT: "" },
      encoding: "utf8"
    });
    assert.equal(buildResult.status, 0);
    assert.match(buildResult.stderr, /\[world-root\].*\(source: auto_discovery\)/);

    const renderResult = spawnSync(
      process.execPath,
      [cliPath, "render", "atomic-world", "--story", "harborwatch"],
      {
        cwd: root,
        env: { ...process.env, WORLDLOOM_ROOT: "" },
        encoding: "utf8"
      }
    );

    assert.equal(renderResult.status, 0);
    assert.match(renderResult.stdout, /# Story Bundle: harborwatch/);
    assert.match(renderResult.stdout, /node_type: storylet_record/);
    assert.match(renderResult.stderr, /\[world-root\].*\(source: auto_discovery\)/);
  } finally {
    cleanup(root);
  }
});

test("build invoked from a package subdirectory auto-discovers the repo root", () => {
  const root = createAtomicRepoRoot();
  const cwd = path.join(root, "tools", "world-index");
  mkdirSync(cwd, { recursive: true });

  try {
    const result = spawnSync(process.execPath, [cliPath, "build", "atomic-world"], {
      cwd,
      env: { ...process.env, WORLDLOOM_ROOT: "" },
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stderr, new RegExp(`^\\[world-root\\] ${escapeRegExp(root)} \\(source: auto_discovery\\)`));
  } finally {
    cleanup(root);
  }
});

test("explicit --world-root wins over WORLDLOOM_ROOT and cwd discovery", () => {
  const flagRoot = createAtomicRepoRoot();
  const envRoot = createAtomicRepoRoot("env-world");
  const cwd = path.join(envRoot, "tools", "world-index");
  mkdirSync(cwd, { recursive: true });

  try {
    const result = spawnSync(process.execPath, [cliPath, "stats", "atomic-world", "--world-root", flagRoot], {
      cwd,
      env: { ...process.env, WORLDLOOM_ROOT: envRoot },
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`^\\[world-root\\] ${escapeRegExp(flagRoot)} \\(source: explicit_flag\\)`));
    assert.match(result.stderr, /Index missing for world 'atomic-world'/);
  } finally {
    cleanup(flagRoot);
    cleanup(envRoot);
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
