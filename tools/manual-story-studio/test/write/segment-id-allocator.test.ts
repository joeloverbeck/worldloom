import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { allocateNextSegmentId } from "../../src/write/segment-id-allocator.js";

function mkTempRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-segment-id-"));
}

function seedSegments(root: string, files: string[]): void {
  const fullDir = path.join(root, "segments");
  mkdirSync(fullDir, { recursive: true });
  for (const file of files) {
    writeFileSync(path.join(fullDir, file), "");
  }
}

test("segment allocator: empty segments directory yields SEG-1", () => {
  const root = mkTempRoot();
  try {
    mkdirSync(path.join(root, "segments"));
    assert.equal(allocateNextSegmentId(root), "SEG-1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("segment allocator: missing segments directory yields SEG-1", () => {
  const root = mkTempRoot();
  try {
    assert.equal(allocateNextSegmentId(root), "SEG-1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("segment allocator: existing paired files advance to next id", () => {
  const root = mkTempRoot();
  try {
    seedSegments(root, ["SEG-1.md", "SEG-1.yaml"]);
    assert.equal(allocateNextSegmentId(root), "SEG-2");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("segment allocator: gap preservation returns max plus one", () => {
  const root = mkTempRoot();
  try {
    seedSegments(root, [
      "SEG-1.md",
      "SEG-1.yaml",
      "SEG-3.md",
      "SEG-3.yaml",
    ]);
    assert.equal(allocateNextSegmentId(root), "SEG-4");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("segment allocator: numeric ordering handles SEG-9 and SEG-10", () => {
  const root = mkTempRoot();
  try {
    seedSegments(root, [
      "SEG-9.md",
      "SEG-9.yaml",
      "SEG-10.md",
      "SEG-10.yaml",
    ]);
    assert.equal(allocateNextSegmentId(root), "SEG-11");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("segment allocator: ignores markdown-only and stray segment files", () => {
  const root = mkTempRoot();
  try {
    seedSegments(root, [
      "SEG-4.md",
      "SEG-5.yaml",
      "README.md",
      "SEG-6.yml",
      "SEG-foo.yaml",
      "segment-7.yaml",
    ]);
    assert.equal(allocateNextSegmentId(root), "SEG-6");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
