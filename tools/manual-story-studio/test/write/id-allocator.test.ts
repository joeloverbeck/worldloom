import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  allocateNextId,
  allocateNextIdForClass,
} from "../../src/write/id-allocator.js";

function mkTempRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-id-allocator-"));
}

function seedClass(root: string, classDir: string, files: string[]): void {
  const fullDir = path.join(root, "records", classDir);
  mkdirSync(fullDir, { recursive: true });
  for (const f of files) {
    writeFileSync(path.join(fullDir, f), "");
  }
}

test("allocator: empty directory yields prefix-1", () => {
  const root = mkTempRoot();
  try {
    assert.equal(allocateNextId(root, "beliefs", "mbel"), "mbel-1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allocator: missing class directory yields prefix-1", () => {
  const root = mkTempRoot();
  try {
    assert.equal(allocateNextId(root, "missing", "mnew"), "mnew-1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allocator: sequential mbel-1..3 returns mbel-4", () => {
  const root = mkTempRoot();
  try {
    seedClass(root, "beliefs", ["mbel-1.yaml", "mbel-2.yaml", "mbel-3.yaml"]);
    assert.equal(allocateNextId(root, "beliefs", "mbel"), "mbel-4");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allocator: gap preservation — mbel-1,3,5 returns mbel-6", () => {
  const root = mkTempRoot();
  try {
    seedClass(root, "beliefs", ["mbel-1.yaml", "mbel-3.yaml", "mbel-5.yaml"]);
    assert.equal(allocateNextId(root, "beliefs", "mbel"), "mbel-6");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allocator: multi-class independence", () => {
  const root = mkTempRoot();
  try {
    seedClass(root, "beliefs", ["mbel-3.yaml"]);
    seedClass(root, "relationships", ["mrel-2.yaml"]);
    assert.equal(allocateNextId(root, "beliefs", "mbel"), "mbel-4");
    assert.equal(allocateNextId(root, "relationships", "mrel"), "mrel-3");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allocator: stray files ignored — README, dotfile, wrong extension", () => {
  const root = mkTempRoot();
  try {
    seedClass(root, "beliefs", [
      "mbel-3.yaml",
      "README.md",
      ".DS_Store",
      "mbel-3.yml",
      "Mbel-3.yaml",
      "mbel-3.txt",
      "mbel-3-foo.yaml",
      "mbel-foo.yaml",
    ]);
    assert.equal(allocateNextId(root, "beliefs", "mbel"), "mbel-4");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allocateNextIdForClass: convenience uses MANUAL_RECORD_CLASS_PREFIXES", () => {
  const root = mkTempRoot();
  try {
    assert.equal(allocateNextIdForClass(root, "beliefs"), "mbel-1");
    seedClass(root, "cast", ["mchar-7.yaml"]);
    assert.equal(allocateNextIdForClass(root, "cast"), "mchar-8");
    seedClass(root, "secrets", ["msecret-2.yaml"]);
    assert.equal(allocateNextIdForClass(root, "secrets"), "msecret-3");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allocateNextIdForClass: beat-templates yields mtemplate-1 on empty dir", () => {
  const root = mkTempRoot();
  try {
    assert.equal(
      allocateNextIdForClass(root, "beat-templates"),
      "mtemplate-1",
    );
    seedClass(root, "beat-templates", ["mtemplate-3.yaml"]);
    assert.equal(
      allocateNextIdForClass(root, "beat-templates"),
      "mtemplate-4",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
