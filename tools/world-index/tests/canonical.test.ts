import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseMarkdown } from "../src/parse/markdown";
import {
  ANCHOR_CONTEXT_LINES,
  anchorChecksum,
  contentHashForProse,
  contentHashForYaml
} from "../src/parse/canonical";
import { normalizeProseWhitespace, serializeStableYaml } from "../src/hash/content";

function loadFixture(name: string): string {
  return readFileSync(path.resolve(__dirname, "..", "..", "tests", "fixtures", name), "utf8");
}

test("prose hashing normalizes whitespace before hashing", () => {
  assert.equal(normalizeProseWhitespace("  foo  \n\n\n\nbar\n"), "  foo\n\nbar");
  assert.equal(
    contentHashForProse("  foo  \n\n\n\nbar\n"),
    contentHashForProse("  foo\n\nbar")
  );
});

test("yaml hashing is independent of object key order", () => {
  assert.equal(contentHashForYaml({ b: 2, a: 1 }), contentHashForYaml({ a: 1, b: 2 }));
  assert.equal(serializeStableYaml({ b: 2, a: 1 }), "a: 1\nb: 2\n");
});

test("anchorChecksum responds only to local surrounding-context drift", () => {
  assert.equal(ANCHOR_CONTEXT_LINES, 3);

  const lines = [
    "line 1",
    "line 2",
    "line 3",
    "body 1",
    "body 2",
    "line 6",
    "line 7",
    "line 8",
    "line 9",
    "line 10",
    "line 11",
    "line 12"
  ];

  const original = anchorChecksum(lines, 4, 5);

  const changedContext = [...lines];
  changedContext[2] = "line 3 changed";
  assert.notEqual(anchorChecksum(changedContext, 4, 5), original);

  const changedFarAway = [...lines];
  changedFarAway[11] = "line 12 changed";
  assert.equal(anchorChecksum(changedFarAway, 4, 5), original);

  assert.equal(contentHashForProse(lines.slice(3, 5).join("\n")), contentHashForProse("body 1\nbody 2"));
});

test("canonical hash helpers are deterministic across fresh node processes", () => {
  const fixturePath = path.resolve(__dirname, "..", "..", "tests", "fixtures", "fixture-ledger.md");
  const script = `
    const fs = require("node:fs");
    const source = fs.readFileSync(${JSON.stringify(fixturePath)}, "utf8");
    const { parseMarkdown } = require(${JSON.stringify(path.resolve(__dirname, "..", "src", "parse", "markdown.js"))});
    const { contentHashForProse } = require(${JSON.stringify(path.resolve(__dirname, "..", "src", "parse", "canonical.js"))});
    const parsed = parseMarkdown(source);
    process.stdout.write(JSON.stringify({ lines: parsed.lines.length, hash: contentHashForProse(source) }));
  `;

  const first = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });
  const second = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });

  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.equal(first.stderr, "");
  assert.equal(second.stderr, "");
  assert.equal(first.stdout, second.stdout);
});

test("markdown parsing plus hashing of the same source is stable across repeated calls", () => {
  const source = loadFixture("fixture-prose.md");
  const first = parseMarkdown(source);
  const second = parseMarkdown(source);

  assert.deepEqual(first.lines, second.lines);
  assert.equal(contentHashForProse(source), contentHashForProse(source));
});
