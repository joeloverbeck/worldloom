import type Database from "better-sqlite3";

import { findImpactedFragments } from "../tools/find-impacted-fragments";

import type { ContextPacketNode } from "./shared";
import { loadPacketNodes } from "./shared";

export async function buildSuggestedImpact(
  db: Database.Database,
  worldSlug: string,
  nucleusNodes: ContextPacketNode[]
): Promise<{
  nodes: ContextPacketNode[];
  rationale: string[];
}> {
  const impactResponse = await findImpactedFragments({
    world_slug: worldSlug,
    node_ids: nucleusNodes.map((node) => node.id)
  });

  if ("code" in impactResponse) {
    return { nodes: [], rationale: [] };
  }

  const impactedNodes = loadPacketNodes(
    db,
    worldSlug,
    impactResponse.impacted.map((fragment) => fragment.id)
  );

  return {
    nodes: impactedNodes,
    rationale: impactedNodes.map(
      (node) =>
        `${node.file_path}${node.heading_path ? ` -> ${node.heading_path}` : ""} is a likely downstream update surface.`
    )
  };
}
