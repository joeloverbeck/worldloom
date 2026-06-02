import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { err, ok, type ReadError, type ReadResult } from "./result.js";
import { enumerateWorlds } from "./worlds.js";

const ROOT_FILES = ["WORLD_KERNEL.md", "ONTOLOGY.md"] as const;
const SOURCE_DIRS = [
  "canon",
  "invariants",
  "mystery-reserve",
  "open-questions",
  "timeline",
  "geography",
  "peoples-and-species",
  "institutions",
  "economy-and-resources",
  "magic-or-tech-systems",
  "everyday-life",
] as const;
const HYBRID_DIRS = ["characters", "diegetic-artifacts"] as const;

export type WorldSourceRootKind = "root";
export type WorldSourceSourceKind = `source:${(typeof SOURCE_DIRS)[number]}`;
export type WorldSourceHybridKind = (typeof HYBRID_DIRS)[number];
export type WorldSourceKind =
  | WorldSourceRootKind
  | WorldSourceSourceKind
  | WorldSourceHybridKind;

export interface WorldSourceItem {
  kind: WorldSourceKind;
  path: string;
  title?: string;
  name?: string;
  tags: string[];
  class?: string;
  raw_text: string;
  error?: ReadError;
}

interface CandidateFile {
  kind: WorldSourceKind;
  absolutePath: string;
  relativePath: string;
}

export function readWorldSource(
  repoRoot: string,
  worldSlug: string,
): ReadResult<WorldSourceItem[]> {
  const worldsResult = enumerateWorlds(repoRoot);
  if (!worldsResult.ok) return err(worldsResult.error);

  const world = worldsResult.value.find((entry) => entry.worldSlug === worldSlug);
  if (!world) {
    return err({
      code: "world_not_found",
      path: path.join(repoRoot, "worlds", worldSlug),
      repair_hint:
        "Choose a world slug returned by enumerateWorlds; worlds must contain WORLD_KERNEL.md.",
    });
  }

  const candidatesResult = enumerateCandidateFiles(world.absolutePath);
  if (!candidatesResult.ok) return err(candidatesResult.error);

  const items: WorldSourceItem[] = [];
  for (const candidate of candidatesResult.value) {
    const item = readCandidate(candidate);
    if (!item.ok) return err(item.error);
    items.push(item.value);
  }
  return ok(items);
}

function enumerateCandidateFiles(
  worldRoot: string,
): ReadResult<CandidateFile[]> {
  const candidates: CandidateFile[] = [];

  for (const filename of ROOT_FILES) {
    const absolutePath = path.join(worldRoot, filename);
    if (existsSync(absolutePath)) {
      candidates.push({
        kind: "root",
        absolutePath,
        relativePath: filename,
      });
    }
  }

  for (const sourceDir of SOURCE_DIRS) {
    const dir = path.join(worldRoot, "_source", sourceDir);
    if (!existsSync(dir)) continue;
    const filesResult = walkFiles(dir);
    if (!filesResult.ok) return err(filesResult.error);
    for (const absolutePath of filesResult.value) {
      candidates.push({
        kind: `source:${sourceDir}`,
        absolutePath,
        relativePath: slashPath(path.relative(worldRoot, absolutePath)),
      });
    }
  }

  for (const hybridDir of HYBRID_DIRS) {
    const dir = path.join(worldRoot, hybridDir);
    if (!existsSync(dir)) continue;
    const filesResult = walkFiles(dir);
    if (!filesResult.ok) return err(filesResult.error);
    for (const absolutePath of filesResult.value) {
      candidates.push({
        kind: hybridDir,
        absolutePath,
        relativePath: slashPath(path.relative(worldRoot, absolutePath)),
      });
    }
  }

  return ok(candidates);
}

function walkFiles(dir: string): ReadResult<string[]> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (cause) {
    return err({
      code: "io_error",
      path: dir,
      cause,
      repair_hint: "Check file permissions on the world source directory.",
    });
  }

  const out: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = walkFiles(absolutePath);
      if (!nested.ok) return err(nested.error);
      out.push(...nested.value);
      continue;
    }
    if (entry.isFile()) out.push(absolutePath);
  }
  out.sort((a, b) => a.localeCompare(b, "en-US"));
  return ok(out);
}

function readCandidate(candidate: CandidateFile): ReadResult<WorldSourceItem> {
  let rawText;
  try {
    rawText = readFileSync(candidate.absolutePath, "utf8");
  } catch (cause) {
    return err({
      code: "io_error",
      path: candidate.relativePath,
      cause,
      repair_hint: "Check file permissions on the world source file.",
    });
  }

  const base: WorldSourceItem = {
    kind: candidate.kind,
    path: candidate.relativePath,
    tags: [],
    raw_text: rawText,
  };

  if (candidate.relativePath.endsWith(".yaml") || candidate.relativePath.endsWith(".yml")) {
    const metadata = parseYamlMetadata(rawText, candidate.relativePath);
    if (metadata.error) {
      return ok({ ...base, ...metadata.value, error: metadata.error });
    }
    return ok({ ...base, ...metadata.value });
  }

  const title = firstMarkdownHeading(rawText);
  return ok(title ? { ...base, title } : base);
}

function parseYamlMetadata(
  rawText: string,
  relativePath: string,
): {
  value: Pick<WorldSourceItem, "title" | "name" | "tags" | "class">;
  error?: ReadError;
} {
  try {
    const parsed = YAML.parse(rawText) as unknown;
    if (!isRecord(parsed)) return { value: { tags: [] } };
    return {
      value: {
        ...stringField(parsed, "title"),
        ...stringField(parsed, "name"),
        tags: stringArrayField(parsed, "tags"),
        ...stringField(parsed, "class"),
      },
    };
  } catch (cause) {
    return {
      value: { tags: [] },
      error: {
        code: "yaml_parse_failed",
        path: relativePath,
        cause,
        repair_hint:
          "Repair the malformed YAML; the browser keeps the raw text visible for manual inspection.",
      },
    };
  }
}

function firstMarkdownHeading(rawText: string): string | undefined {
  for (const line of rawText.split(/\r?\n/)) {
    const match = /^#\s+(.+?)\s*$/.exec(line);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField<K extends "title" | "name" | "class">(
  record: Record<string, unknown>,
  key: K,
): Pick<WorldSourceItem, K> | Record<string, never> {
  const value = record[key];
  return typeof value === "string" && value.trim() ? { [key]: value } as Pick<WorldSourceItem, K> : {};
}

function stringArrayField(
  record: Record<string, unknown>,
  key: string,
): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function slashPath(value: string): string {
  return value.split(path.sep).join("/");
}
