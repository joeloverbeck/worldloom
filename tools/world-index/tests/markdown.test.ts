import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { Root, Content, Parent } from "mdast";

import { contentHashForProse } from "../src/parse/canonical";
import { parseMarkdown } from "../src/parse/markdown";

function loadFixture(name: string): string {
  return readFileSync(path.resolve(__dirname, "..", "..", "tests", "fixtures", name), "utf8");
}

function visit(node: Content | Root, callback: (node: Content) => void): void {
  if (node.type !== "root") {
    callback(node);
  }

  const children = "children" in node ? (node as Parent).children : [];
  for (const child of children) {
    visit(child, callback);
  }
}

test("parseMarkdown returns mdast with GFM tables, html comments, and positions", () => {
  const source = loadFixture("fixture-prose.md");
  const { tree, lines } = parseMarkdown(source);

  assert.equal(lines[0], "# Example World");
  assert.equal(tree.type, "root");

  const encounteredTypes = new Set<string>();
  visit(tree, (node) => {
    encounteredTypes.add(node.type);
    assert.ok(node.position);
  });

  assert.equal(encounteredTypes.has("heading"), true);
  assert.equal(encounteredTypes.has("paragraph"), true);
  assert.equal(encounteredTypes.has("table"), true);
  assert.equal(encounteredTypes.has("html"), true);
});

test("parseMarkdown and prose hashing are deterministic within a process", () => {
  const source = loadFixture("fixture-prose.md");

  const first = parseMarkdown(source);
  const second = parseMarkdown(source);

  assert.deepEqual(first.lines, second.lines);
  assert.deepEqual(first.tree, second.tree);
  assert.equal(contentHashForProse(source), contentHashForProse(source));
});
