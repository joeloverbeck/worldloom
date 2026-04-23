import { listWorldSlugs, openExistingWorldIndex } from "./shared";

interface InspectPayload {
  worldSlug: string;
  node: Record<string, unknown>;
  outgoing_edges: Array<Record<string, unknown>>;
  incoming_edges: Array<Record<string, unknown>>;
  entity_record: Record<string, unknown> | null;
  entity_aliases: Array<Record<string, unknown>>;
  entity_mentions: Array<Record<string, unknown>>;
}

export function inspect(worldRoot: string, nodeId: string): number {
  const matches: InspectPayload[] = [];

  for (const worldSlug of listWorldSlugs(worldRoot)) {
    const opened = openExistingWorldIndex(worldRoot, worldSlug);
    if (opened instanceof Error) {
      continue;
    }

    try {
      const node = opened.prepare("SELECT * FROM nodes WHERE node_id = ?").get(nodeId) as
        | Record<string, unknown>
        | undefined;

      if (!node) {
        continue;
      }

      matches.push({
        worldSlug,
        node,
        outgoing_edges: opened
          .prepare("SELECT * FROM edges WHERE source_node_id = ? ORDER BY edge_id")
          .all(nodeId) as Array<Record<string, unknown>>,
        incoming_edges: opened
          .prepare("SELECT * FROM edges WHERE target_node_id = ? ORDER BY edge_id")
          .all(nodeId) as Array<Record<string, unknown>>,
        entity_record:
          (opened.prepare("SELECT * FROM entities WHERE entity_id = ?").get(nodeId) as
            | Record<string, unknown>
            | undefined) ?? null,
        entity_aliases: opened
          .prepare(
            `
              SELECT *
              FROM entity_aliases
              WHERE entity_id = ?
              ORDER BY alias_id
            `
          )
          .all(nodeId) as Array<Record<string, unknown>>,
        entity_mentions: opened
          .prepare("SELECT * FROM entity_mentions WHERE node_id = ? ORDER BY mention_id")
          .all(nodeId) as Array<Record<string, unknown>>
      });
    } finally {
      opened.close();
    }
  }

  if (matches.length === 0) {
    console.error(`Node '${nodeId}' was not found in any indexed world.`);
    return 1;
  }

  if (matches.length > 1) {
    console.error(`Node '${nodeId}' is ambiguous across indexed worlds.`);
    return 1;
  }

  process.stdout.write(`${JSON.stringify(matches[0], null, 2)}\n`);
  return 0;
}
