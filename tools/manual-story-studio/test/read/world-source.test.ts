import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { readWorldSource } from "../../src/read/world-source.js";
import type {
  WorldSourceItem,
} from "../../src/read/world-source.js";
import type { ReadResult } from "../../src/read/result.js";

function mkRepoRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-world-source-"));
}

function writeWorldFile(
  repoRoot: string,
  worldSlug: string,
  relativePath: string,
  body: string,
): void {
  const fullPath = path.join(repoRoot, "worlds", worldSlug, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, body);
}

function unwrap<T>(result: ReadResult<T>): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected ok");
  return result.value;
}

function assertReadError(result: ReadResult<unknown>, code: string): void {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected read error");
  assert.equal(result.error.code, code);
}

function byPath(items: WorldSourceItem[], itemPath: string): WorldSourceItem {
  const item = items.find((candidate) => candidate.path === itemPath);
  assert.ok(item, `expected item ${itemPath}`);
  return item;
}

test("readWorldSource enumerates root files, source records, characters, and artifacts", () => {
  const repoRoot = mkRepoRoot();
  try {
    const worldSlug = "fixture-world";
    writeWorldFile(repoRoot, worldSlug, "WORLD_KERNEL.md", "# Fixture World\n");
    writeWorldFile(repoRoot, worldSlug, "ONTOLOGY.md", "# Ontology\n");
    writeWorldFile(
      repoRoot,
      worldSlug,
      "_source/canon/CF-1.yaml",
      YAML.stringify({ title: "Canon One", tags: ["law"], class: "canon_fact" }),
    );
    writeWorldFile(
      repoRoot,
      worldSlug,
      "_source/mystery-reserve/M-1.yaml",
      YAML.stringify({ name: "Locked Mystery", tags: ["reserve"] }),
    );
    writeWorldFile(
      repoRoot,
      worldSlug,
      "characters/CHAR-1.md",
      "# The Archivist\n\nNotes.\n",
    );
    writeWorldFile(
      repoRoot,
      worldSlug,
      "diegetic-artifacts/DA-1.md",
      "# Brass Ledger\n",
    );

    const items = unwrap(readWorldSource(repoRoot, worldSlug));
    const paths = items.map((item) => item.path);

    assert.deepEqual(paths, [
      "WORLD_KERNEL.md",
      "ONTOLOGY.md",
      "_source/canon/CF-1.yaml",
      "_source/mystery-reserve/M-1.yaml",
      "characters/CHAR-1.md",
      "diegetic-artifacts/DA-1.md",
    ]);
    assert.equal(byPath(items, "WORLD_KERNEL.md").kind, "root");
    assert.equal(byPath(items, "_source/canon/CF-1.yaml").kind, "source:canon");
    assert.equal(byPath(items, "_source/canon/CF-1.yaml").title, "Canon One");
    assert.deepEqual(byPath(items, "_source/canon/CF-1.yaml").tags, ["law"]);
    assert.equal(byPath(items, "_source/canon/CF-1.yaml").class, "canon_fact");
    assert.equal(
      byPath(items, "_source/mystery-reserve/M-1.yaml").name,
      "Locked Mystery",
    );
    assert.equal(byPath(items, "characters/CHAR-1.md").title, "The Archivist");
    assert.equal(byPath(items, "diegetic-artifacts/DA-1.md").kind, "diegetic-artifacts");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("readWorldSource skips missing source subdirectories without aborting", () => {
  const repoRoot = mkRepoRoot();
  try {
    const worldSlug = "sparse-world";
    writeWorldFile(repoRoot, worldSlug, "WORLD_KERNEL.md", "# Sparse\n");
    writeWorldFile(
      repoRoot,
      worldSlug,
      "_source/everyday-life/SEC-ELF-1.yaml",
      YAML.stringify({ title: "Daily Bread" }),
    );

    const items = unwrap(readWorldSource(repoRoot, worldSlug));

    assert.deepEqual(items.map((item) => item.path), [
      "WORLD_KERNEL.md",
      "_source/everyday-life/SEC-ELF-1.yaml",
    ]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("readWorldSource surfaces malformed YAML as a structured item error", () => {
  const repoRoot = mkRepoRoot();
  try {
    const worldSlug = "broken-world";
    writeWorldFile(repoRoot, worldSlug, "WORLD_KERNEL.md", "# Broken\n");
    writeWorldFile(
      repoRoot,
      worldSlug,
      "_source/open-questions/OQ-1.yaml",
      "title: [unterminated\n",
    );

    const items = unwrap(readWorldSource(repoRoot, worldSlug));
    const broken = byPath(items, "_source/open-questions/OQ-1.yaml");

    assert.equal(broken.error?.code, "yaml_parse_failed");
    assert.equal(broken.error?.path, "_source/open-questions/OQ-1.yaml");
    assert.equal(broken.raw_text, "title: [unterminated\n");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("readWorldSource resolves worlds only through enumerateWorlds", () => {
  const repoRoot = mkRepoRoot();
  try {
    writeWorldFile(repoRoot, "valid-world", "WORLD_KERNEL.md", "# Valid\n");

    assertReadError(readWorldSource(repoRoot, "missing-world"), "world_not_found");
    assertReadError(readWorldSource(repoRoot, "../valid-world"), "world_not_found");
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("world-source reader module has no write-path APIs", () => {
  const modulePath = path.resolve(
    "src",
    "read",
    "world-source.ts",
  );
  const source = readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /\bwriteFile(?:Sync)?\b/);
  assert.doesNotMatch(source, /\bmkdir(?:Sync)?\b/);
  assert.doesNotMatch(source, /patch-engine|world-mcp/);
});
