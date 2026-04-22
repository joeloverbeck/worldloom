import { readFileSync } from "node:fs";
import path from "node:path";
import type { Root } from "mdast";

import { contentHashForProse } from "./canonical";
import { isStoplistedEntityCandidate } from "./stoplist";
import { sha256Hex } from "../hash/content";
import { CURRENT_INDEX_VERSION } from "../schema/version";
import type { EdgeRow, EntityMentionRow, NodeRow } from "../schema/types";

export interface EntityRegistryEntry {
  canonicalName: string;
  kind: string | null;
}

export interface EntityRegistry {
  sourcePath: string;
  entries: EntityRegistryEntry[];
}

const CAPITALIZED_MULTIWORD_REGEX = /\b([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3})\b/g;
const VIRTUAL_ENTITY_LINE = 1;
const VIRTUAL_ENTITY_BYTE = 0;

export function loadOntologyRegistry(ontologyPath: string): EntityRegistry {
  const source = readFileSync(ontologyPath, "utf8");
  const entries: EntityRegistryEntry[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("- ")) {
      continue;
    }

    const withoutBullet = line.slice(2).replace(/<!--.*?-->/g, "").trim();
    if (withoutBullet.length === 0) {
      continue;
    }

    const entry = parseRegistryLine(withoutBullet);
    if (entry) {
      entries.push(entry);
    }
  }

  return { sourcePath: path.basename(ontologyPath), entries };
}

export function extractEntities(
  tree: Root,
  proseNodes: NodeRow[],
  ontologyRegistry: EntityRegistry
): { entityNodes: NodeRow[]; mentions: EntityMentionRow[]; edges: EdgeRow[] } {
  void tree;

  const mentions: EntityMentionRow[] = [];
  const edges: EdgeRow[] = [];
  const entityCounts = new Map<string, { canonicalName: string; kind: string | null; count: number }>();
  const registryByName = new Map(
    ontologyRegistry.entries.map((entry) => [entry.canonicalName.toLocaleLowerCase("en-US"), entry])
  );
  const usedSlugs = new Map<string, string>();
  let mentionId = 1;
  let edgeId = 1;

  for (const proseNode of proseNodes) {
    const linkedEntities = new Set<string>();

    for (const entry of ontologyRegistry.entries) {
      const occurrences = countOccurrences(proseNode.body, entry.canonicalName);
      if (occurrences === 0) {
        continue;
      }

      for (let index = 0; index < occurrences; index += 1) {
        mentions.push({
          mention_id: mentionId,
          node_id: proseNode.node_id,
          entity_name: entry.canonicalName,
          entity_kind: entry.kind
        });
        mentionId += 1;
      }

      incrementEntityCount(entityCounts, entry.canonicalName, entry.kind, occurrences);
      linkedEntities.add(entry.canonicalName);
    }

    for (const candidate of collectHeuristicCandidates(proseNode.body)) {
      if (isStoplistedEntityCandidate(candidate)) {
        continue;
      }

      const lowerCandidate = candidate.toLocaleLowerCase("en-US");
      if (registryByName.has(lowerCandidate)) {
        continue;
      }

      mentions.push({
        mention_id: mentionId,
        node_id: proseNode.node_id,
        entity_name: candidate,
        entity_kind: null
      });
      mentionId += 1;

      incrementEntityCount(entityCounts, candidate, null, 1);
      linkedEntities.add(candidate);
    }

    for (const canonicalName of linkedEntities) {
      edges.push({
        edge_id: edgeId,
        source_node_id: proseNode.node_id,
        target_node_id: `entity:${canonicalEntitySlug(canonicalName, usedSlugs)}`,
        target_unresolved_ref: null,
        edge_type: "mentions_entity"
      });
      edgeId += 1;
    }
  }

  const prototypeNode = proseNodes[0];
  const entityNodes: NodeRow[] = [];

  for (const { canonicalName, kind, count } of entityCounts.values()) {
    const body = `Canonical name: ${canonicalName} | Kind: ${kind ?? "unknown"} | Mentions: ${count}`;
    entityNodes.push({
      node_id: `entity:${canonicalEntitySlug(canonicalName, usedSlugs)}`,
      world_slug: prototypeNode?.world_slug ?? deriveWorldSlug(ontologyRegistry.sourcePath),
      file_path: ontologyRegistry.sourcePath,
      heading_path: null,
      // Virtual entity nodes are anchored to the ontology registry file with a sentinel
      // zero-width span at the start of the file, rather than malformed all-zero provenance.
      byte_start: VIRTUAL_ENTITY_BYTE,
      byte_end: VIRTUAL_ENTITY_BYTE,
      line_start: VIRTUAL_ENTITY_LINE,
      line_end: VIRTUAL_ENTITY_LINE,
      node_type: "named_entity",
      body,
      content_hash: contentHashForProse(body),
      anchor_checksum: contentHashForProse(body),
      summary: null,
      created_at_index_version: prototypeNode?.created_at_index_version ?? CURRENT_INDEX_VERSION
    });
  }

  return { entityNodes, mentions, edges };
}

function parseRegistryLine(line: string): EntityRegistryEntry | null {
  const simpleMatch = line.match(/^(.+?)\s+\(([^)]+)\)\s*$/);
  if (simpleMatch) {
    const [, rawName, rawKind] = simpleMatch;
    if (!rawName || !rawKind) {
      return null;
    }
    const canonicalName = sanitizeName(rawName);
    const kind = rawKind.split(",")[0]?.trim() ?? null;
    return canonicalName ? { canonicalName, kind } : null;
  }

  const attachesMatch = line.match(/^(.+?)\s+attaches to\s+\*\*([^*]+)\*\*/i);
  if (attachesMatch) {
    const [, rawName, rawKind] = attachesMatch;
    if (!rawName || !rawKind) {
      return null;
    }
    const canonicalName = sanitizeName(rawName);
    const kind = rawKind.trim();
    return canonicalName ? { canonicalName, kind } : null;
  }

  const canonicalName = sanitizeName(line);
  return canonicalName ? { canonicalName, kind: null } : null;
}

function sanitizeName(rawName: string | undefined): string {
  if (!rawName) {
    return "";
  }

  return rawName
    .replace(/\s+\((?:CF|CH|PA|M|DA|CHAR|PR|BATCH|NCP|NCB|AU|RP)-\d+\)/g, "")
    .replace(/\*\*/g, "")
    .trim();
}

function countOccurrences(body: string, canonicalName: string): number {
  const escapedName = canonicalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapedName}([^A-Za-z0-9]|$)`, "gi");
  let count = 0;

  for (;;) {
    const match = pattern.exec(body);
    if (!match) {
      return count;
    }
    count += 1;
  }
}

function collectHeuristicCandidates(body: string): string[] {
  const candidates: string[] = [];
  const proseLines = body.split(/\r?\n/).filter((line) => !line.trimStart().startsWith("#"));

  for (const line of proseLines) {
    CAPITALIZED_MULTIWORD_REGEX.lastIndex = 0;

    for (;;) {
      const match = CAPITALIZED_MULTIWORD_REGEX.exec(line);
      if (!match) {
        break;
      }

      const candidate = match[1];
      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  return candidates;
}

function incrementEntityCount(
  entityCounts: Map<string, { canonicalName: string; kind: string | null; count: number }>,
  canonicalName: string,
  kind: string | null,
  delta: number
): void {
  const key = canonicalName.toLocaleLowerCase("en-US");
  const current = entityCounts.get(key);
  if (current) {
    current.count += delta;
    if (current.kind === null && kind !== null) {
      current.kind = kind;
    }
    return;
  }

  entityCounts.set(key, { canonicalName, kind, count: delta });
}

function canonicalEntitySlug(name: string, usedSlugs: Map<string, string>): string {
  const base = name
    .normalize("NFC")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const fallbackBase = base.length > 0 ? base : "entity";
  const existing = usedSlugs.get(fallbackBase);

  if (!existing || existing === name) {
    usedSlugs.set(fallbackBase, name);
    return fallbackBase;
  }

  return `${fallbackBase}-${sha256Hex(name).slice(0, 8)}`;
}

function deriveWorldSlug(filePath: string): string {
  const normalizedPath = filePath.split(path.sep);
  const worldsIndex = normalizedPath.lastIndexOf("worlds");
  if (worldsIndex >= 0 && worldsIndex + 1 < normalizedPath.length) {
    return normalizedPath[worldsIndex + 1] ?? "__unknown__";
  }

  return "__unknown__";
}
