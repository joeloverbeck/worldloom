import { contentHashForProse } from "./canonical";
import {
  firstNonEmptyString,
  parseAuthorityFrontmatter
} from "./entities";
import type {
  EdgeRow,
  NodeRow,
  ScopedReferenceRow
} from "../schema/types";

export interface StructuredEdgeExtractionOutput {
  scopedNodes: NodeRow[];
  scopedReferences: ScopedReferenceRow[];
  edges: EdgeRow[];
}

type StructuredSourceNodeType =
  | "diegetic_artifact_record"
  | "proposal_batch"
  | "proposal_card"
  | "character_proposal_card";

type StructuredTargetNodeType =
  | "character_record"
  | "diegetic_artifact_record"
  | "proposal_batch"
  | "character_proposal_batch";

interface StructuredAdapter {
  sourceNodeType: StructuredSourceNodeType;
  sourceField: string;
  targetNodeType: StructuredTargetNodeType;
  targetField: string;
  referenceKind: string;
}

interface StructuredTargetMatch {
  nodeId: string;
  displayName: string;
}

const STRUCTURED_ADAPTERS: StructuredAdapter[] = [
  {
    sourceNodeType: "diegetic_artifact_record",
    sourceField: "author_character_id",
    targetNodeType: "character_record",
    targetField: "character_id",
    referenceKind: "person"
  },
  {
    sourceNodeType: "proposal_batch",
    sourceField: "source_artifact_id",
    targetNodeType: "diegetic_artifact_record",
    targetField: "artifact_id",
    referenceKind: "artifact"
  },
  {
    sourceNodeType: "proposal_card",
    sourceField: "batch_id",
    targetNodeType: "proposal_batch",
    targetField: "batch_id",
    referenceKind: "proposal_batch"
  },
  {
    sourceNodeType: "character_proposal_card",
    sourceField: "batch_id",
    targetNodeType: "character_proposal_batch",
    targetField: "batch_id",
    referenceKind: "character_proposal_batch"
  }
];

export function extractStructuredRecordEdges(
  proseNodes: NodeRow[]
): StructuredEdgeExtractionOutput {
  const scopedNodes: NodeRow[] = [];
  const scopedReferences: ScopedReferenceRow[] = [];
  const edges: EdgeRow[] = [];
  let edgeId = 1;

  const targetLookups = buildTargetLookups(proseNodes);

  for (const node of proseNodes) {
    const frontmatter = parseAuthorityFrontmatter(node.body);
    if (frontmatter.status !== "parsed") {
      continue;
    }

    for (const adapter of STRUCTURED_ADAPTERS) {
      if (node.node_type !== adapter.sourceNodeType) {
        continue;
      }

      const rawReference = firstNonEmptyString(frontmatter.frontmatter[adapter.sourceField]);
      if (!rawReference) {
        continue;
      }

      const targetMatch =
        targetLookups
          .get(adapter.targetNodeType)
          ?.get(rawReference) ?? null;
      const referenceId = `${node.node_id}#structured:${adapter.sourceField}:0`;
      const displayName = targetMatch?.displayName ?? rawReference;

      scopedNodes.push(
        createStructuredReferenceNode(node, referenceId, adapter.referenceKind, adapter.sourceField, displayName)
      );
      scopedReferences.push({
        reference_id: referenceId,
        world_slug: node.world_slug,
        display_name: displayName,
        reference_kind: adapter.referenceKind,
        provenance_scope: provenanceScopeForNodeType(node.node_type),
        relation: adapter.sourceField,
        source_node_id: node.node_id,
        source_field: adapter.sourceField,
        target_node_id: targetMatch?.nodeId ?? null,
        authority_level: "exact_structured_edge"
      });
      edges.push({
        edge_id: edgeId,
        source_node_id: node.node_id,
        target_node_id: targetMatch?.nodeId ?? null,
        target_unresolved_ref: targetMatch ? null : rawReference,
        edge_type: "references_record"
      });
      edgeId += 1;
    }
  }

  return { scopedNodes, scopedReferences, edges };
}

function buildTargetLookups(
  proseNodes: NodeRow[]
): Map<StructuredTargetNodeType, Map<string, StructuredTargetMatch>> {
  const lookups = new Map<StructuredTargetNodeType, Map<string, StructuredTargetMatch>>();

  for (const adapter of STRUCTURED_ADAPTERS) {
    if (!lookups.has(adapter.targetNodeType)) {
      lookups.set(adapter.targetNodeType, new Map<string, StructuredTargetMatch>());
    }
  }

  for (const node of proseNodes) {
    if (!isStructuredTargetNodeType(node.node_type)) {
      continue;
    }

    const frontmatter = parseAuthorityFrontmatter(node.body);
    if (frontmatter.status !== "parsed") {
      continue;
    }

    const targetField = targetFieldForNodeType(node.node_type);
    const targetId = firstNonEmptyString(frontmatter.frontmatter[targetField]);
    if (!targetId) {
      continue;
    }

    const displayName = displayNameForTargetNode(node, frontmatter.frontmatter, targetId);
    const byType = lookups.get(node.node_type);
    if (!byType || byType.has(targetId)) {
      continue;
    }

    byType.set(targetId, {
      nodeId: node.node_id,
      displayName
    });
  }

  return lookups;
}

function provenanceScopeForNodeType(
  nodeType: StructuredSourceNodeType
): ScopedReferenceRow["provenance_scope"] {
  switch (nodeType) {
    case "diegetic_artifact_record":
      return "diegetic";
    case "proposal_batch":
    case "proposal_card":
    case "character_proposal_card":
      return "proposal";
    default:
      return "audit";
  }
}

function targetFieldForNodeType(nodeType: StructuredTargetNodeType): string {
  switch (nodeType) {
    case "character_record":
      return "character_id";
    case "diegetic_artifact_record":
      return "artifact_id";
    case "proposal_batch":
    case "character_proposal_batch":
      return "batch_id";
    default:
      return "id";
  }
}

function displayNameForTargetNode(
  node: NodeRow,
  frontmatter: Record<string, unknown>,
  fallback: string
): string {
  switch (node.node_type) {
    case "character_record":
      return firstNonEmptyString(frontmatter.name) ?? fallback;
    case "diegetic_artifact_record":
      return firstNonEmptyString(frontmatter.title) ?? fallback;
    case "proposal_batch":
    case "character_proposal_batch":
      return firstNonEmptyString(frontmatter.batch_id) ?? fallback;
    default:
      return fallback;
  }
}

function createStructuredReferenceNode(
  sourceNode: NodeRow,
  referenceId: string,
  referenceKind: string,
  relation: string,
  displayName: string
): NodeRow {
  const body = `Structured reference: ${displayName} | Kind: ${referenceKind} | Relation: ${relation}`;
  return {
    node_id: referenceId,
    world_slug: sourceNode.world_slug,
    file_path: sourceNode.file_path,
    heading_path: sourceNode.heading_path,
    byte_start: sourceNode.byte_start,
    byte_end: sourceNode.byte_end,
    line_start: sourceNode.line_start,
    line_end: sourceNode.line_end,
    node_type: "scoped_reference",
    body,
    content_hash: contentHashForProse(body),
    anchor_checksum: contentHashForProse(body),
    summary: null,
    created_at_index_version: sourceNode.created_at_index_version
  };
}

function isStructuredTargetNodeType(
  nodeType: NodeRow["node_type"]
): nodeType is StructuredTargetNodeType {
  return (
    nodeType === "character_record" ||
    nodeType === "diegetic_artifact_record" ||
    nodeType === "proposal_batch" ||
    nodeType === "character_proposal_batch"
  );
}
