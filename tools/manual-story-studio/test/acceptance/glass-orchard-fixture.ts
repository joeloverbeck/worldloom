import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import YAML from "yaml";

import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";

export interface GlassOrchardFixture {
  repoRoot: string;
  worldSlug: string;
  manualStorySlug: string;
  root: ManualStoryRoot;
}

export function makeGlassOrchardFixture(): GlassOrchardFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "glass-orchard-"));
  const worldSlug = "glass-orchard";
  const manualStorySlug = "one-real-story";
  const worldRoot = path.join(repoRoot, "worlds", worldSlug);

  writePromptDocs(repoRoot);
  writeWorldSource(worldRoot);

  const root = resolveManualStoryRoot(repoRoot, worldSlug, manualStorySlug);
  mkdirSync(root.absolutePath, { recursive: true });
  safeWriteFile(
    root,
    "manual-story.yaml",
    YAML.stringify(
      makeDefaultManualStoryMetadata(
        worldSlug,
        manualStorySlug,
        "The Glass Orchard",
        "2026-06-03T00:00:00.000Z",
      ),
    ),
  );

  return { repoRoot, worldSlug, manualStorySlug, root };
}

export function cleanupGlassOrchardFixture(fixture: GlassOrchardFixture): void {
  rmSync(fixture.repoRoot, { recursive: true, force: true });
}

function writePromptDocs(repoRoot: string): void {
  writeRepoFile(
    repoRoot,
    "docs/prose-renderer-contract/content-policy.md",
    [
      "Content policy.",
      "",
      "Keep the pasted prose within the author's stated intensity and do not invent off-limits reveals.",
    ].join("\n"),
  );
  writeRepoFile(
    repoRoot,
    "docs/manual-story-studio/prose-craft-contract.md",
    [
      "Prose craft contract.",
      "",
      "Write only the requested moment. Preserve established voice, pressure, and continuity.",
    ].join("\n"),
  );
}

function writeWorldSource(worldRoot: string): void {
  writeFile(
    path.join(worldRoot, "WORLD_KERNEL.md"),
    [
      "# The Glass Orchard",
      "",
      "A quiet fantasy valley where glass-barked orchard trees hold human memories as fruit.",
      "The tax guild claims a tithe on each harvest, and families hide painful memories in grafted branches.",
    ].join("\n"),
  );
  writeFile(
    path.join(worldRoot, "_source/canon/CF-1.yaml"),
    YAML.stringify({
      id: "CF-1",
      title: "Glass orchard trees hold memories",
      tags: ["glass-orchard", "memory-fruit"],
      class: "canon-fact",
      summary: "The orchard trees preserve memories in fragile fruit.",
    }),
  );
  writeFile(
    path.join(worldRoot, "_source/canon/CF-2.yaml"),
    YAML.stringify({
      id: "CF-2",
      title: "The tax guild audits memory-fruit",
      tags: ["guild", "tax"],
      class: "canon-fact",
      summary: "Guild inspectors tax each harvest and seize undeclared fruit.",
    }),
  );
  writeFile(
    path.join(worldRoot, "characters/mira.md"),
    [
      "# Mira",
      "",
      "Mira is a tax-guild inspector who can read the color of a harvested memory.",
    ].join("\n"),
  );
  writeFile(
    path.join(worldRoot, "characters/len.md"),
    [
      "# Len",
      "",
      "Len is an orchard keeper hiding a broken grafting knife from Mira.",
    ].join("\n"),
  );
}

function writeRepoFile(repoRoot: string, relativePath: string, text: string): void {
  writeFile(path.join(repoRoot, relativePath), text);
}

function writeFile(absolutePath: string, text: string): void {
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text.endsWith("\n") ? text : `${text}\n`);
}
