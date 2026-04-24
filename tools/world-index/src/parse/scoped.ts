import { contentHashForProse } from "./canonical";
import {
  canonicalEntitySlug,
  firstNonEmptyString,
  normalizeSurface,
  parseAuthorityFrontmatter
} from "./entities";
import type {
  EdgeRow,
  NodeRow,
  ScopedReferenceAliasRow,
  ScopedReferenceRow,
  ValidationResultRow
} from "../schema/types";

export interface ScopedReferenceExtractionOutput {
  scopedNodes: NodeRow[];
  scopedReferences: ScopedReferenceRow[];
  scopedReferenceAliases: ScopedReferenceAliasRow[];
  edges: EdgeRow[];
  validationResults: ValidationResultRow[];
}

type ScopedSourceNodeType =
  | "character_record"
  | "character_proposal_card"
  | "diegetic_artifact_record"
  | "proposal_card";

const SCOPED_SOURCE_NODE_TYPES = new Set<ScopedSourceNodeType>([
  "character_record",
  "character_proposal_card",
  "diegetic_artifact_record",
  "proposal_card"
]);

interface ParsedScopedReferenceEntry {
  name: string;
  relation: string;
  kind: string | null;
  aliases: string[];
}

export function extractScopedReferences(proseNodes: NodeRow[]): ScopedReferenceExtractionOutput {
  const scopedNodes: NodeRow[] = [];
  const scopedReferences: ScopedReferenceRow[] = [];
  const scopedReferenceAliases: ScopedReferenceAliasRow[] = [];
  const edges: EdgeRow[] = [];
  const validationResults: ValidationResultRow[] = [];
  let aliasId = 1;
  let edgeId = 1;

  for (const node of proseNodes) {
    if (!isScopedSourceNodeType(node.node_type)) {
      continue;
    }

    const frontmatter = parseAuthorityFrontmatter(node.body);
    if (frontmatter.status === "malformed") {
      continue;
    }

    if (frontmatter.status !== "parsed") {
      continue;
    }

    const rawScopedReferences = frontmatter.frontmatter.scoped_references;
    if (!Array.isArray(rawScopedReferences) || rawScopedReferences.length === 0) {
      continue;
    }

    for (const [ordinal, rawEntry] of rawScopedReferences.entries()) {
      const parsed = parseScopedReferenceEntry(rawEntry);
      if (parsed === null) {
        validationResults.push(createMalformedScopedReferenceResult(node, ordinal));
        continue;
      }

      const referenceId = `${node.node_id}#scoped:${canonicalEntitySlug(
        parsed.name,
        `${node.node_id}:${ordinal}`,
        new Set<string>()
      )}:${ordinal}`;
      scopedReferences.push({
        reference_id: referenceId,
        world_slug: node.world_slug,
        display_name: parsed.name,
        reference_kind: parsed.kind,
        provenance_scope: provenanceScopeForNodeType(node.node_type),
        relation: parsed.relation,
        source_node_id: node.node_id,
        source_field: "scoped_references",
        target_node_id: null,
        authority_level: "explicit_scoped_reference"
      });
      scopedNodes.push(createScopedReferenceNode(node, referenceId, parsed));
      edges.push({
        edge_id: edgeId,
        source_node_id: node.node_id,
        target_node_id: referenceId,
        target_unresolved_ref: null,
        edge_type: "references_scoped_name"
      });
      edgeId += 1;

      for (const alias of parsed.aliases) {
        scopedReferenceAliases.push({
          alias_id: aliasId,
          reference_id: referenceId,
          alias_text: alias
        });
        aliasId += 1;
      }
    }
  }

  return {
    scopedNodes,
    scopedReferences,
    scopedReferenceAliases,
    edges,
    validationResults
  };
}

function parseScopedReferenceEntry(rawEntry: unknown): ParsedScopedReferenceEntry | null {
  if (!isRecord(rawEntry)) {
    return null;
  }

  const name = firstNonEmptyString(rawEntry.name);
  const relation = firstNonEmptyString(rawEntry.relation);
  if (!name || !relation) {
    return null;
  }

  const kind = firstNonEmptyString(rawEntry.kind);
  const aliases = parseAliasList(rawEntry.aliases);
  if (aliases === null) {
    return null;
  }

  return { name, relation, kind, aliases };
}

function parseAliasList(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const aliases: string[] = [];
  const seen = new Set<string>();

  for (const rawAlias of value) {
    const alias = firstNonEmptyString(rawAlias);
    if (!alias) {
      return null;
    }

    const normalizedAlias = normalizeSurface(alias);
    const dedupeKey = normalizedAlias.toLocaleLowerCase("en-US");
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    aliases.push(normalizedAlias);
  }

  return aliases;
}

function provenanceScopeForNodeType(nodeType: ScopedSourceNodeType): ScopedReferenceRow["provenance_scope"] {
  switch (nodeType) {
    case "character_record":
      return "world";
    case "diegetic_artifact_record":
      return "diegetic";
    case "character_proposal_card":
    case "proposal_card":
      return "proposal";
    default:
      return "audit";
  }
}

function createScopedReferenceNode(
  sourceNode: NodeRow,
  referenceId: string,
  parsed: ParsedScopedReferenceEntry
): NodeRow {
  const body = `Scoped reference: ${parsed.name} | Kind: ${parsed.kind ?? "unknown"} | Relation: ${parsed.relation}`;
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

function createMalformedScopedReferenceResult(
  node: NodeRow,
  ordinal: number
): ValidationResultRow {
  return {
    result_id: 0,
    world_slug: node.world_slug,
    validator_name: "scoped_reference_parse",
    severity: "warn",
    code: "malformed_scoped_reference",
    message: `Scoped reference entry ${ordinal + 1} on ${node.node_id} must provide string 'name' and 'relation' fields, and aliases must be an array of non-empty strings when present.`,
    node_id: node.node_id,
    file_path: node.file_path,
    line_range_start: node.line_start,
    line_range_end: node.line_end,
    created_at: new Date().toISOString()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScopedSourceNodeType(nodeType: NodeRow["node_type"]): nodeType is ScopedSourceNodeType {
  return SCOPED_SOURCE_NODE_TYPES.has(nodeType as ScopedSourceNodeType);
}
