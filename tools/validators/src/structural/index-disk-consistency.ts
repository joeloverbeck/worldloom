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
  filePattern: RegExp;
}

interface SurfaceInventory {
  surface: IndexSurface;
  indexPath: string;
  indexEntries: Set<string>;
  diskArtifacts: Set<string>;
  indexedRecords: IndexedRecord[];
}

const INDEX_SURFACES: readonly IndexSurface[] = [
  { name: "proposals", directory: "proposals", nodeType: "proposal_card", filePattern: /^PR-\d+[^/]*\.md$/ },
  { name: "audits", directory: "audits", nodeType: "audit_record", filePattern: /^AU-\d+[^/]*\.md$/ },
  { name: "pressure-events", directory: "pressure-events", nodeType: "pressure_event_card", filePattern: /^EPE-\d+(?!.*\.proposal\.md$)[^/]*\.md$/ },
  { name: "character-proposals", directory: "character-proposals", nodeType: "character_proposal_card", filePattern: /^NCP-\d+[^/]*\.md$/ }
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
      surface.filePattern.test(normalized.slice(surface.directory.length + 1))
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
    if (!entry.isFile() || entry.name === "INDEX.md" || !surface.filePattern.test(entry.name)) {
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
  const nodeId = path.basename(filePath, ".md").match(/^(?:PR|AU|EPE|NCP)-\d+/)?.[0] ?? filePath;
  return {
    node_type: surface.nodeType,
    node_id: nodeId,
    world_slug: ctx.world_slug,
    file_path: filePath,
    parsed: {}
  };
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
