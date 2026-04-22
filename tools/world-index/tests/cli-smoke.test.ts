import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const cliPath = path.resolve(__dirname, "..", "src", "cli.js");

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
  assert.equal(result.stderr.trim(), "");
});
