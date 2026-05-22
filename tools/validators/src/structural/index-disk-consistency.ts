import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Context, IndexedRecord, Validator, Verdict, VerdictSeverity } from "../framework/types.js";
import {
  locationFor,
  queryStructuralRecords,
  toPosixPath,
  worldRootFrom
} from "./utils.js";

interface IndexSurface {
  name: string;
  directory: string;
  nodeType: string;
  mode: "id-prefixed" | "slug";
  filePattern?: RegExp;
  idPattern?: RegExp;
}

interface SurfaceInventory {
  surface: IndexSurface;
  indexPath: string;
  indexEntries: Set<string>;
  diskArtifacts: Set<string>;
  indexedRecords: IndexedRecord[];
}

const INDEX_SURFACES: readonly IndexSurface[] = [
  idPrefixedSurface("proposals", "proposals", "proposal_card", /^PR-\d+[^/]*\.md$/, /^PR-\d+/),
  idPrefixedSurface("audits", "audits", "audit_record", /^AU-\d+[^/]*\.md$/, /^AU-\d+/),
  idPrefixedSurface(
    "pressure-events",
    "pressure-events",
    "pressure_event_card",
    /^EPE-\d+(?!.*\.proposal\.md$)[^/]*\.md$/,
    /^EPE-\d+/
  ),
  idPrefixedSurface("character-proposals", "character-proposals", "character_proposal_card", /^NCP-\d+[^/]*\.md$/, /^NCP-\d+/),
  slugSurface("characters", "characters", "character_record"),
  slugSurface("diegetic-artifacts", "diegetic-artifacts", "diegetic_artifact_record")
];

export const indexDiskConsistency: Validator = {
  name: "index_disk_consistency",
  severity_mode: "fail",
  applies_to: () => true,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const worldRoot = worldRootFrom(input, ctx);
    if (worldRoot === undefined) {
      return [];
    }

    const records = await queryStructuralRecords(ctx);
    return INDEX_SURFACES
      .map((surface) => inventoryFor(surface, worldRoot, records, ctx))
      .flatMap((inventory) => verdictsForInventory(inventory, ctx));
  }
};

function inventoryFor(
  surface: IndexSurface,
  worldRoot: string,
  records: readonly IndexedRecord[],
  ctx: Context
): SurfaceInventory {
  const indexPath = `${surface.directory}/INDEX.md`;
  const indexEntries = parseIndexEntries(worldRoot, surface);
  const diskArtifacts = diskArtifactsFor(worldRoot, surface);
  const indexedRecords = records.filter((record) =>
    record.node_type === surface.nodeType &&
    isInScope(record.file_path, ctx) &&
    toPosixPath(record.file_path).startsWith(`${surface.directory}/`)
  );

  return { surface, indexPath, indexEntries, diskArtifacts, indexedRecords };
}

function verdictsForInventory(inventory: SurfaceInventory, ctx: Context): Verdict[] {
  const verdicts: Verdict[] = [];
  const expectedEntries = new Map<string, IndexedRecord>();

  for (const record of inventory.indexedRecords) {
    expectedEntries.set(toPosixPath(record.file_path), record);
  }

  for (const diskPath of inventory.diskArtifacts) {
    if (!isInScope(diskPath, ctx)) {
      continue;
    }
    if (!expectedEntries.has(diskPath)) {
      expectedEntries.set(diskPath, syntheticRecord(diskPath, inventory.surface, ctx));
    }
  }

  for (const [artifactPath, record] of [...expectedEntries.entries()].sort(compareEntries)) {
    if (!inventory.indexEntries.has(artifactPath)) {
      verdicts.push({
        validator: "index_disk_consistency",
        severity: severityFor(ctx),
        code: "index_disk_drift",
        message: `${inventory.indexPath} is missing an entry for ${artifactPath}.`,
        location: locationFor(record),
        detail: {
          surface: inventory.surface.name,
          drift_kind: "artifact_missing_from_index",
          index_path: inventory.indexPath,
          artifact_path: artifactPath
        },
        suggested_fix: `Add ${artifactPath} to ${inventory.indexPath}.`
      });
    }
  }

  for (const artifactPath of [...inventory.indexEntries].sort()) {
    if (!inventory.diskArtifacts.has(artifactPath)) {
      verdicts.push({
        validator: "index_disk_consistency",
        severity: severityFor(ctx),
        code: "index_disk_drift",
        message: `${inventory.indexPath} lists ${artifactPath}, but that artifact is not present on disk.`,
        location: {
          file: inventory.indexPath,
          node_id: path.basename(artifactPath, ".md")
        },
        detail: {
          surface: inventory.surface.name,
          drift_kind: "index_entry_missing_on_disk",
          index_path: inventory.indexPath,
          artifact_path: artifactPath
        },
        suggested_fix: `Remove ${artifactPath} from ${inventory.indexPath}, or restore the missing artifact.`
      });
    }
  }

  return verdicts;
}

function parseIndexEntries(worldRoot: string, surface: IndexSurface): Set<string> {
  const indexFilePath = path.join(worldRoot, surface.directory, "INDEX.md");
  if (!existsSync(indexFilePath)) {
    return new Set();
  }

  const content = readFileSync(indexFilePath, "utf8");
  const entries = new Set<string>();
  const linkPattern = /\[[^\]]+\]\(([^)]+\.md)(?:#[^)]+)?\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1];
    if (rawTarget === undefined || /^(?:https?:|mailto:)/i.test(rawTarget)) {
      continue;
    }
    const normalized = toPosixPath(path.normalize(path.join(surface.directory, rawTarget)));
    if (
      normalized.startsWith(`${surface.directory}/`) &&
      !normalized.includes("/../") &&
      isSurfaceArtifact(surface, normalized.slice(surface.directory.length + 1))
    ) {
      entries.add(normalized);
    }
  }
  return entries;
}

function diskArtifactsFor(worldRoot: string, surface: IndexSurface): Set<string> {
  const surfaceRoot = path.join(worldRoot, surface.directory);
  if (!existsSync(surfaceRoot)) {
    return new Set();
  }

  const artifacts = new Set<string>();
  for (const entry of readdirSync(surfaceRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !isSurfaceArtifact(surface, entry.name)) {
      continue;
    }
    artifacts.add(`${surface.directory}/${entry.name}`);
  }
  return artifacts;
}

function severityFor(ctx: Context): VerdictSeverity {
  return ctx.run_mode === "full-world" ? "warn" : "fail";
}

function syntheticRecord(filePath: string, surface: IndexSurface, ctx: Context): IndexedRecord {
  const fileName = path.basename(filePath);
  const nodeId = surface.idPattern?.exec(fileName)?.[0] ?? path.basename(fileName, ".md");
  return {
    node_type: surface.nodeType,
    node_id: nodeId,
    world_slug: ctx.world_slug,
    file_path: filePath,
    parsed: {}
  };
}

function idPrefixedSurface(
  name: string,
  directory: string,
  nodeType: string,
  filePattern: RegExp,
  idPattern: RegExp
): IndexSurface {
  return { name, directory, nodeType, mode: "id-prefixed", filePattern, idPattern };
}

function slugSurface(name: string, directory: string, nodeType: string): IndexSurface {
  return { name, directory, nodeType, mode: "slug" };
}

function isSurfaceArtifact(surface: IndexSurface, fileName: string): boolean {
  if (fileName.includes("/") || fileName === "INDEX.md" || !fileName.endsWith(".md")) {
    return false;
  }
  if (surface.mode === "slug") {
    return true;
  }
  return surface.filePattern?.test(fileName) ?? false;
}

function compareEntries(left: [string, IndexedRecord], right: [string, IndexedRecord]): number {
  return left[0].localeCompare(right[0], "en-US");
}

function isInScope(filePath: string, ctx: Context): boolean {
  if (ctx.run_mode !== "incremental" || ctx.touched_files.length === 0) {
    return true;
  }
  const normalized = toPosixPath(filePath);
  return ctx.touched_files.map(toPosixPath).some((touched) => touched === normalized || touched.endsWith("/INDEX.md"));
}
