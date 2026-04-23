import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

export interface FindEditAnchorsArgs {
  world_slug: string;
  targets: string[];
}

export interface EditAnchor {
  node_id: string;
  content_hash: string;
  anchor_checksum: string;
  anchor_form: string;
}

export interface FindEditAnchorsResponse {
  anchors: EditAnchor[];
}

interface AnchorRow extends EditAnchor {}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export async function findEditAnchors(
  args: FindEditAnchorsArgs
): Promise<FindEditAnchorsResponse | McpError> {
  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const targets = unique(args.targets);
    if (targets.length === 0) {
      return { anchors: [] };
    }

    const rows = opened.db
      .prepare(
        `
          SELECT
            n.node_id,
            n.content_hash,
            n.anchor_checksum,
            ac.anchor_form
          FROM nodes n
          INNER JOIN anchor_checksums ac ON ac.node_id = n.node_id
          WHERE n.world_slug = ?
            AND n.node_id IN (${targets.map(() => "?").join(", ")})
          ORDER BY n.node_id
        `
      )
      .all(args.world_slug, ...targets) as AnchorRow[];

    if (rows.length !== targets.length) {
      const found = new Set(rows.map((row) => row.node_id));
      const missingNodeId = targets.find((target) => !found.has(target)) ?? targets[0];
      return createMcpError("node_not_found", `Node '${missingNodeId}' does not exist.`, {
        node_id: missingNodeId,
        world_slug: args.world_slug
      });
    }

    return { anchors: rows };
  } finally {
    opened.db.close();
  }
}
