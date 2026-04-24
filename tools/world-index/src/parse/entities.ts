import { readFileSync } from "node:fs";
import path from "node:path";
import type { Root } from "mdast";
import YAML from "yaml";

import { contentHashForProse } from "./canonical";
import { isStoplistedEntityCandidate } from "./stoplist";
import { sha256Hex } from "../hash/content";
import { CURRENT_INDEX_VERSION } from "../schema/version";
import type {
  EdgeRow,
  EntityAliasRow,
  EntityMentionRow,
  EntityRow,
  NodeRow,
  ValidationResultRow
} from "../schema/types";

export interface EntityRegistryEntry {
  canonicalName: string;
  kind: string | null;
  aliases: string[];
}

interface EntityRegistryIssue {
  code: string;
  message: string;
  lineStart: number | null;
  lineEnd: number | null;
}

export interface EntityRegistry {
  sourcePath: string;
  entries: EntityRegistryEntry[];
  issues: EntityRegistryIssue[];
}

export interface EntityExtractionOutput {
  entityNodes: NodeRow[];
  entities: EntityRow[];
  aliases: EntityAliasRow[];
  mentions: EntityMentionRow[];
  edges: EdgeRow[];
  validationResults: ValidationResultRow[];
}

interface AuthoritySource {
  node: NodeRow | null;
  sourceField: string | null;
  canonicalName: string;
  entityKind: string | null;
  provenanceScope: EntityRow["provenance_scope"];
  authorityLevel: EntityRow["authority_level"];
  aliasTexts: string[];
}

const CAPITALIZED_MULTIWORD_REGEX = /\b([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3})\b/g;
const VIRTUAL_ENTITY_LINE = 1;
const VIRTUAL_ENTITY_BYTE = 0;
const FRAGMENT_LEAD_WORDS = new Set([
  "A",
  "An",
  "As",
  "At",
  "By",
  "For",
  "From",
  "In",
  "Into",
  "Of",
  "On",
  "Per",
  "To",
  "Under",
  "Upon",
  "With",
  "Without"
]);
const PROPOSAL_NODE_TYPES = new Set([
  "proposal_card",
  "proposal_batch",
  "character_proposal_card",
  "character_proposal_batch",
  "retcon_proposal_card"
]);
const CANONICAL_SOURCE_NODE_TYPES = new Set([
  "character_record",
  "character_proposal_card",
  "diegetic_artifact_record"
]);
const MENTION_EVIDENCE_SOURCE_NODE_TYPES = new Set([
  "ontology_category",
  "character_record",
  "character_proposal_card",
  "diegetic_artifact_record",
  "section",
  "subsection",
  "bullet_cluster",
  "mystery_reserve_entry",
  "open_question_entry",
  "invariant",
  "proposal_card",
  "proposal_batch",
  "character_proposal_batch",
  "retcon_proposal_card"
]);

export function loadOntologyRegistry(ontologyPath: string): EntityRegistry {
  const source = readFileSync(ontologyPath, "utf8");
  const { entries, issues } = parseOntologyRegistrySource(source);
  return { sourcePath: path.basename(ontologyPath), entries, issues };
}

export function extractEntities(
  tree: Root,
  proseNodes: NodeRow[],
  ontologyRegistry: EntityRegistry
): EntityExtractionOutput {
  void tree;

  const stageA = stageAConstructCanonicalEntities(proseNodes, ontologyRegistry);
  const aliases = stageBGenerateAliases(stageA.entities, stageA.authoritySources);
  const stageC = stageCScanMentionEvidence(proseNodes, stageA.entities, aliases);
  const mentionCounts = countResolvedMentions(stageC.mentions);

  return {
    entityNodes: stageA.entityNodes.map((node) => {
      const entityId = node.node_id;
      const entity = stageA.entities.find((row) => row.entity_id === entityId);
      const mentionCount = mentionCounts.get(entityId) ?? 0;
      const body = `Canonical name: ${entity?.canonical_name ?? entityId} | Kind: ${entity?.entity_kind ?? "unknown"} | Mentions: ${mentionCount}`;
      return {
        ...node,
        body,
        content_hash: contentHashForProse(body),
        anchor_checksum: contentHashForProse(body)
      };
    }),
    entities: stageA.entities,
    aliases,
    mentions: stageC.mentions,
    edges: stageC.edges,
    validationResults: stageA.validationResults
  };
}

function stageAConstructCanonicalEntities(
  proseNodes: NodeRow[],
  ontologyRegistry: EntityRegistry
): {
  entityNodes: NodeRow[];
  entities: EntityRow[];
  authoritySources: Map<string, AuthoritySource>;
  validationResults: ValidationResultRow[];
} {
  const entityNodes: NodeRow[] = [];
  const entities: EntityRow[] = [];
  const authoritySources = new Map<string, AuthoritySource>();
  const validationResults: ValidationResultRow[] = [];
  const usedSlugs = new Set<string>();
  const worldSlug = proseNodes[0]?.world_slug ?? "__unknown__";

  for (const issue of ontologyRegistry.issues) {
    validationResults.push({
      result_id: 0,
      world_slug: worldSlug,
      validator_name: "ontology_registry",
      severity: "warn",
      code: issue.code,
      message: issue.message,
      node_id: null,
      file_path: ontologyRegistry.sourcePath,
      line_range_start: issue.lineStart,
      line_range_end: issue.lineEnd,
      created_at: new Date().toISOString()
    });
  }

  for (const entry of ontologyRegistry.entries) {
    const entityId = `entity:${canonicalEntitySlug(
      entry.canonicalName,
      `registry:${ontologyRegistry.sourcePath}:${entry.canonicalName}`,
      usedSlugs
    )}`;
    authoritySources.set(entityId, {
      node: null,
      sourceField: null,
      canonicalName: entry.canonicalName,
      entityKind: entry.kind,
      provenanceScope: "world",
      authorityLevel: "structured_anchor",
      aliasTexts: entry.aliases
    });
    entities.push({
      entity_id: entityId,
      world_slug: worldSlug,
      canonical_name: entry.canonicalName,
      entity_kind: entry.kind,
      provenance_scope: "world",
      authority_level: "structured_anchor",
      source_node_id: entityId,
      source_field: null
    });
    entityNodes.push(createOntologyEntityNode(entityId, entry.canonicalName, worldSlug, ontologyRegistry.sourcePath));
  }

  for (const node of proseNodes) {
    if (!CANONICAL_SOURCE_NODE_TYPES.has(node.node_type)) {
      continue;
    }

    const frontmatter = parseAuthorityFrontmatter(node.body);
    if (frontmatter.status === "malformed") {
      validationResults.push({
        result_id: 0,
        world_slug: node.world_slug,
        validator_name: "frontmatter_parse",
        severity: "warn",
        code: "malformed_authority_source",
        message: `Authority-bearing ${node.node_type} has malformed frontmatter; canonical entity emission was skipped.`,
        node_id: node.node_id,
        file_path: node.file_path,
        line_range_start: node.line_start,
        line_range_end: node.line_end,
        created_at: new Date().toISOString()
      });
      continue;
    }

    if (frontmatter.status !== "parsed") {
      continue;
    }

    const source = authoritySourceForNode(node, frontmatter.frontmatter);
    if (!source) {
      continue;
    }

    const entityId = `entity:${canonicalEntitySlug(
      source.canonicalName,
      source.node?.node_id ?? `${source.provenanceScope}:${source.canonicalName}`,
      usedSlugs
    )}`;
    authoritySources.set(entityId, source);
    entities.push({
      entity_id: entityId,
      world_slug: node.world_slug,
      canonical_name: source.canonicalName,
      entity_kind: source.entityKind,
      provenance_scope: source.provenanceScope,
      authority_level: source.authorityLevel,
      source_node_id: node.node_id,
      source_field: source.sourceField
    });
    entityNodes.push(createBackedEntityNode(entityId, node));
  }

  return { entityNodes, entities, authoritySources, validationResults };
}

function stageBGenerateAliases(
  entities: EntityRow[],
  authoritySources: Map<string, AuthoritySource>
): EntityAliasRow[] {
  const aliases: EntityAliasRow[] = [];
  let aliasId = 1;
  const seen = new Set<string>();

  for (const entity of entities) {
    const source = authoritySources.get(entity.entity_id);
    const normalizedCanonical = normalizeSurface(entity.canonical_name);
    const sourceNodeId = source?.node?.node_id ?? entity.source_node_id;

    if (normalizedCanonical !== entity.canonical_name) {
      const key = `${entity.entity_id}\u0000${normalizedCanonical}`;
      if (!seen.has(key)) {
        seen.add(key);
        aliases.push({
          alias_id: aliasId,
          entity_id: entity.entity_id,
          alias_text: normalizedCanonical,
          alias_kind: "normalized_form",
          source_node_id: sourceNodeId
        });
        aliasId += 1;
      }
    }

    for (const aliasText of source?.aliasTexts ?? []) {
      const normalizedAlias = normalizeSurface(aliasText);
      if (normalizedAlias.length === 0 || normalizedAlias === normalizedCanonical) {
        continue;
      }

      const key = `${entity.entity_id}\u0000${normalizedAlias}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      aliases.push({
        alias_id: aliasId,
        entity_id: entity.entity_id,
        alias_text: normalizedAlias,
        alias_kind: "exact_structured",
        source_node_id: sourceNodeId
      });
      aliasId += 1;
    }
  }

  return aliases;
}

function stageCScanMentionEvidence(
  proseNodes: NodeRow[],
  entities: EntityRow[],
  aliases: EntityAliasRow[]
): { mentions: EntityMentionRow[]; edges: EdgeRow[] } {
  const mentions: EntityMentionRow[] = [];
  const edges: EdgeRow[] = [];
  let mentionId = 1;
  let edgeId = 1;

  const canonicalEntries = entities.map((entity) => ({
    entityId: entity.entity_id,
    text: entity.canonical_name
  }));
  const aliasEntries = aliases.map((alias) => ({
    entityId: alias.entity_id,
    text: alias.alias_text
  }));

  for (const node of proseNodes) {
    if (!MENTION_EVIDENCE_SOURCE_NODE_TYPES.has(node.node_type)) {
      continue;
    }

    const exactMatchedForms = new Set<string>();

    for (const entry of canonicalEntries) {
      const matches = findExactSurfaceMatches(node.body, entry.text);
      for (const surfaceText of matches) {
        mentions.push({
          mention_id: mentionId,
          node_id: node.node_id,
          surface_text: surfaceText,
          resolved_entity_id: entry.entityId,
          resolution_kind: "canonical",
          extraction_method: "exact_canonical"
        });
        mentionId += 1;
        exactMatchedForms.add(normalizeLookupKey(surfaceText));
        edges.push({
          edge_id: edgeId,
          source_node_id: node.node_id,
          target_node_id: entry.entityId,
          target_unresolved_ref: null,
          edge_type: "mentions_entity"
        });
        edgeId += 1;
      }
    }

    for (const entry of aliasEntries) {
      const matches = findExactSurfaceMatches(node.body, entry.text);
      for (const surfaceText of matches) {
        mentions.push({
          mention_id: mentionId,
          node_id: node.node_id,
          surface_text: surfaceText,
          resolved_entity_id: entry.entityId,
          resolution_kind: "alias",
          extraction_method: "exact_alias"
        });
        mentionId += 1;
        exactMatchedForms.add(normalizeLookupKey(surfaceText));
        edges.push({
          edge_id: edgeId,
          source_node_id: node.node_id,
          target_node_id: entry.entityId,
          target_unresolved_ref: null,
          edge_type: "mentions_entity"
        });
        edgeId += 1;
      }
    }

    for (const candidate of collectHeuristicCandidates(node.body, node.node_type)) {
      if (isStoplistedEntityCandidate(candidate)) {
        continue;
      }

      if (exactMatchedForms.has(normalizeLookupKey(candidate))) {
        continue;
      }

      mentions.push({
        mention_id: mentionId,
        node_id: node.node_id,
        surface_text: candidate,
        resolved_entity_id: null,
        resolution_kind: "unresolved",
        extraction_method: "heuristic_phrase"
      });
      mentionId += 1;
    }
  }

  return { mentions, edges };
}

function authoritySourceForNode(
  node: NodeRow,
  frontmatter: Record<string, unknown>
): AuthoritySource | null {
  if (node.node_type === "character_record" || node.node_type === "character_proposal_card") {
    const canonicalName = firstNonEmptyString(frontmatter.name);
    if (!canonicalName) {
      return null;
    }

    const slugAlias = firstNonEmptyString(frontmatter.slug);
    const declaredAliases = parseExactAliasList(frontmatter.aliases);
    return {
      node,
      sourceField: "name",
      canonicalName,
      entityKind: "person",
      provenanceScope: node.node_type === "character_record" ? "world" : "proposal",
      authorityLevel: "structured_anchor",
      aliasTexts: mergeExactAliases(slugAlias ? [slugAlias] : [], declaredAliases)
    };
  }

  if (node.node_type === "diegetic_artifact_record") {
    const canonicalName = firstNonEmptyString(frontmatter.title);
    if (!canonicalName) {
      return null;
    }

    return {
      node,
      sourceField: "title",
      canonicalName,
      entityKind: classifyArtifactKind(frontmatter),
      provenanceScope: "diegetic",
      authorityLevel: "structured_anchor",
      aliasTexts: parseExactAliasList(frontmatter.aliases)
    };
  }

  return null;
}

function createOntologyEntityNode(
  entityId: string,
  canonicalName: string,
  worldSlug: string,
  sourcePath: string
): NodeRow {
  const body = `Canonical name: ${canonicalName} | Kind: unknown | Mentions: 0`;
  return {
    node_id: entityId,
    world_slug: worldSlug,
    file_path: sourcePath,
    heading_path: null,
    byte_start: VIRTUAL_ENTITY_BYTE,
    byte_end: VIRTUAL_ENTITY_BYTE,
    line_start: VIRTUAL_ENTITY_LINE,
    line_end: VIRTUAL_ENTITY_LINE,
    node_type: "named_entity",
    body,
    content_hash: contentHashForProse(body),
    anchor_checksum: contentHashForProse(body),
    summary: null,
    created_at_index_version: CURRENT_INDEX_VERSION
  };
}

function createBackedEntityNode(entityId: string, sourceNode: NodeRow): NodeRow {
  return {
    node_id: entityId,
    world_slug: sourceNode.world_slug,
    file_path: sourceNode.file_path,
    heading_path: sourceNode.heading_path,
    byte_start: sourceNode.byte_start,
    byte_end: sourceNode.byte_end,
    line_start: sourceNode.line_start,
    line_end: sourceNode.line_end,
    node_type: "named_entity",
    body: "",
    content_hash: "",
    anchor_checksum: "",
    summary: null,
    created_at_index_version: sourceNode.created_at_index_version
  };
}

function parseOntologyRegistrySource(source: string): {
  entries: EntityRegistryEntry[];
  issues: EntityRegistryIssue[];
} {
  const lines = source.split(/\r?\n/);
  const headingIndexes = lines
    .map((line, index) => (line.trim() === "## Named Entity Registry" ? index : -1))
    .filter((index) => index >= 0);

  if (headingIndexes.length === 0) {
    return { entries: [], issues: [] };
  }

  if (headingIndexes.length > 1) {
    return {
      entries: [],
      issues: [
        {
          code: "duplicate_named_entity_registry",
          message:
            "ONTOLOGY.md declares more than one '## Named Entity Registry' section; canonical entity emission from the ontology registry was skipped.",
          lineStart: headingIndexes[0]! + 1,
          lineEnd: headingIndexes[headingIndexes.length - 1]! + 1
        }
      ]
    };
  }

  const block = extractNamedEntityRegistryBlock(lines, headingIndexes[0]!);
  if (!block) {
    return {
      entries: [],
      issues: [
        {
          code: "missing_named_entity_registry_block",
          message:
            "ONTOLOGY.md declares '## Named Entity Registry' without an immediately following fenced YAML block.",
          lineStart: headingIndexes[0]! + 1,
          lineEnd: headingIndexes[0]! + 1
        }
      ]
    };
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(block.content);
  } catch {
    return {
      entries: [],
      issues: [
        {
          code: "invalid_named_entity_registry_yaml",
          message:
            "ONTOLOGY.md named-entity registry YAML could not be parsed; canonical entity emission from the ontology registry was skipped.",
          lineStart: block.startLine,
          lineEnd: block.endLine
        }
      ]
    };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.named_entities)) {
    return {
      entries: [],
      issues: [
        {
          code: "invalid_named_entity_registry_shape",
          message:
            "ONTOLOGY.md named-entity registry must define a top-level 'named_entities' array.",
          lineStart: block.startLine,
          lineEnd: block.endLine
        }
      ]
    };
  }

  const entries: EntityRegistryEntry[] = [];
  const issues: EntityRegistryIssue[] = [];

  for (const [index, rawEntry] of parsed.named_entities.entries()) {
    const entryLine = block.startLine + index + 1;
    if (!isRecord(rawEntry)) {
      issues.push({
        code: "invalid_named_entity_registry_entry",
        message: `ONTOLOGY.md named-entity registry entry ${index + 1} must be a mapping with canonical_name and entity_kind fields.`,
        lineStart: entryLine,
        lineEnd: entryLine
      });
      continue;
    }

    const canonicalName = firstNonEmptyString(rawEntry.canonical_name);
    const kind = firstNonEmptyString(rawEntry.entity_kind);
    const aliases = parseRegistryAliases(rawEntry.aliases);
    if (!canonicalName || !kind || aliases === null) {
      issues.push({
        code: "invalid_named_entity_registry_entry",
        message: `ONTOLOGY.md named-entity registry entry ${index + 1} must provide string canonical_name and entity_kind fields, and aliases must be an array of non-empty strings when present.`,
        lineStart: entryLine,
        lineEnd: entryLine
      });
      continue;
    }

    entries.push({ canonicalName, kind, aliases });
  }

  return { entries, issues };
}

function extractNamedEntityRegistryBlock(
  lines: string[],
  headingIndex: number
): { content: string; startLine: number; endLine: number } | null {
  let lineIndex = headingIndex + 1;
  while (lineIndex < lines.length && lines[lineIndex]?.trim() === "") {
    lineIndex += 1;
  }

  if (!lines[lineIndex]?.trim().startsWith("```yaml")) {
    return null;
  }

  const blockStart = lineIndex + 1;
  lineIndex += 1;
  while (lineIndex < lines.length && lines[lineIndex]?.trim() !== "```") {
    lineIndex += 1;
  }

  if (lineIndex >= lines.length) {
    return null;
  }

  return {
    content: lines.slice(blockStart, lineIndex).join("\n"),
    startLine: blockStart + 1,
    endLine: lineIndex + 1
  };
}

function parseRegistryAliases(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const aliases: string[] = [];
  const seen = new Set<string>();

  for (const alias of value) {
    const normalized = firstNonEmptyString(alias);
    if (!normalized) {
      return null;
    }

    const key = normalizeLookupKey(normalized);
    if (!seen.has(key)) {
      seen.add(key);
      aliases.push(normalized);
    }
  }

  return aliases;
}

function parseExactAliasList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeNormalizedAliases(value.flatMap((alias) => {
    const normalized = firstNonEmptyString(alias);
    return normalized ? [normalized] : [];
  }));
}

function mergeExactAliases(...aliasGroups: string[][]): string[] {
  return dedupeNormalizedAliases(aliasGroups.flat());
}

function dedupeNormalizedAliases(aliases: string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const alias of aliases) {
    const key = normalizeLookupKey(alias);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(alias);
  }

  return deduped;
}

function collectHeuristicCandidates(body: string, nodeType: string): string[] {
  const candidates: string[] = [];
  const proseLines = heuristicScanLines(body, nodeType);

  for (const line of proseLines) {
    CAPITALIZED_MULTIWORD_REGEX.lastIndex = 0;

    for (;;) {
      const match = CAPITALIZED_MULTIWORD_REGEX.exec(line);
      if (!match) {
        break;
      }

      const candidate = match[1];
      if (candidate && !looksLikePhraseFragment(candidate)) {
        candidates.push(candidate);
      }
    }
  }

  return candidates;
}

function heuristicScanLines(body: string, nodeType: string): string[] {
  const lines = stripHeuristicNoise(body, nodeType).split(/\r?\n/);
  return lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith("#") &&
      !looksLikeTableRow(trimmed) &&
      !looksLikeStandaloneLabel(trimmed)
    );
  });
}

function stripHeuristicNoise(body: string, nodeType: string): string {
  let normalized = body;

  normalized = normalized.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
  normalized = normalized.replace(/```[\s\S]*?```/g, "\n");
  normalized = normalized.replace(/<!--[\s\S]*?-->/g, "");
  if (PROPOSAL_NODE_TYPES.has(nodeType)) {
    normalized = normalized.replace(/^\*\*Phase\s+\d+[a-z]?(?:\s+\([^*\n]+\))?\*\*:?.*$/gim, "");
    normalized = normalized.replace(/^\*\*Phase\s+\d+[a-z]?(?:\s+[^*\n]+)?\*\*:?.*$/gim, "");
  }

  return normalized;
}

function looksLikeTableRow(line: string): boolean {
  if (!line.includes("|")) {
    return false;
  }

  const trimmed = line.trim();
  return trimmed.startsWith("|") || /^\|?[\s:-]+\|[\s|:-]*$/.test(trimmed);
}

function looksLikePhraseFragment(candidate: string): boolean {
  const [firstWord] = candidate.trim().split(/\s+/);
  return firstWord ? FRAGMENT_LEAD_WORDS.has(firstWord) : false;
}

function looksLikeStandaloneLabel(line: string): boolean {
  return /^\*\*[^*\n]+\*\*:?\s*$/.test(line.trim());
}

export function canonicalEntitySlug(name: string, uniqueKey: string, usedSlugs: Set<string>): string {
  const base = name
    .normalize("NFC")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const fallbackBase = base.length > 0 ? base : "entity";
  if (!usedSlugs.has(fallbackBase)) {
    usedSlugs.add(fallbackBase);
    return fallbackBase;
  }

  const suffixed = `${fallbackBase}-${sha256Hex(uniqueKey).slice(0, 8)}`;
  if (!usedSlugs.has(suffixed)) {
    usedSlugs.add(suffixed);
    return suffixed;
  }

  let length = 10;
  for (;;) {
    const extended = `${fallbackBase}-${sha256Hex(`${uniqueKey}:${length}`).slice(0, length)}`;
    if (!usedSlugs.has(extended)) {
      usedSlugs.add(extended);
      return extended;
    }
    length += 2;
  }
}

export function parseAuthorityFrontmatter(body: string):
  | { status: "missing" }
  | { status: "malformed" }
  | { status: "parsed"; frontmatter: Record<string, unknown> } {
  const match = body.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match?.[1]) {
    return { status: "missing" };
  }

  try {
    const parsed = YAML.parse(match[1]);
    return isRecord(parsed)
      ? { status: "parsed", frontmatter: parsed }
      : { status: "malformed" };
  } catch {
    return { status: "malformed" };
  }
}

function findExactSurfaceMatches(body: string, phrase: string): string[] {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escaped})(?=[^A-Za-z0-9]|$)`, "gi");
  const matches: string[] = [];

  for (;;) {
    const match = pattern.exec(body);
    if (!match) {
      return matches;
    }

    matches.push(match[2] ?? phrase);
  }
}

function countResolvedMentions(mentions: EntityMentionRow[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const mention of mentions) {
    if (!mention.resolved_entity_id) {
      continue;
    }

    counts.set(
      mention.resolved_entity_id,
      (counts.get(mention.resolved_entity_id) ?? 0) + 1
    );
  }

  return counts;
}

function classifyArtifactKind(frontmatter: Record<string, unknown>): EntityRow["entity_kind"] {
  const artifactType = firstNonEmptyString(frontmatter.artifact_type);
  if (!artifactType) {
    return "artifact";
  }

  return /(text|tradition|travelogue|chronicle|sermon)/i.test(artifactType)
    ? "text/tradition"
    : "artifact";
}

export function normalizeSurface(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

function normalizeLookupKey(text: string): string {
  return normalizeSurface(text).toLocaleLowerCase("en-US");
}

export function firstNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? normalizeSurface(value) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
