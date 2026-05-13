import YAML from "yaml";
import type {
  CanonFactRecord,
  ChangeLogEntry,
  InvariantRecord,
  MysteryRecord,
  NamedEntityRecord,
  NodeType,
  OpenQuestionRecord,
  SectionRecord
} from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db";
import { withIndexFreshnessGuard } from "../context-packet/freshness-guard";
import { persistToolResultJson } from "../context-packet/persistence";
import {
  ENVELOPE_OVERHEAD_RESERVE_CHARS,
  resolveHarnessCeilingChars
} from "../context-packet/shared";
import { createMcpError, type McpError } from "../errors";

import {
  STORY_BUNDLE_NODE_TYPES,
  isStoryBundleNodeType,
  isStoryBundleRecordId,
  listIndexedWorldSlugs,
  toStoryScopedNodeId,
  type StoryBundleNodeType
} from "./_shared";

export interface GetRecordArgs {
  record_id: string;
  world_slug?: string;
  story_slug?: string;
  section_path?: string;
}

export type ParsedRecord =
  | ({ record_kind: "canon_fact" } & CanonFactRecord)
  | ({ record_kind: "change_log" } & ChangeLogEntry)
  | ({ record_kind: "invariant" } & InvariantRecord)
  | ({ record_kind: "mystery_reserve" } & MysteryRecord)
  | ({ record_kind: "open_question" } & OpenQuestionRecord)
  | ({ record_kind: "named_entity" } & NamedEntityRecord)
  | ({ record_kind: "section" } & SectionRecord)
  | StoryParsedRecord;

export type StoryRecordKind = StoryBundleNodeType;

export type StoryParsedRecord = {
  record_kind: StoryRecordKind;
  [key: string]: unknown;
};

export type HybridRecordKind = "character" | "diegetic_artifact" | "adjudication";

export interface GetRecordAtomicResponse {
  record: ParsedRecord;
  content_hash: string;
  file_path: string;
}

export interface GetRecordHybridResponse {
  record_id: string;
  record_kind: HybridRecordKind;
  frontmatter: Record<string, unknown>;
  body_sections: Record<string, string>;
  content_hash: string;
  file_path: string;
}

export interface GetRecordSectionResponse {
  record_id: string;
  record_kind: ParsedRecord["record_kind"] | HybridRecordKind;
  section_path: string;
  value: unknown;
  content_hash: string;
  file_path: string;
}

export interface GetRecordOversizeResponse {
  record_id: string;
  record_kind: HybridRecordKind;
  delivery_status: "oversize_with_projection_suggestions";
  persisted_output_path: string;
  total_chars: number;
  response_cap_chars: number;
  suggested_section_paths: string[];
  suggested_section_paths_omitted_count?: number;
  fallback_advice: string;
  content_hash: string;
  file_path: string;
}

export type GetRecordResponse =
  | GetRecordAtomicResponse
  | GetRecordHybridResponse
  | GetRecordSectionResponse
  | GetRecordOversizeResponse;

export interface RecordRow {
  node_id: string;
  story_slug?: string | null;
  node_type: NodeType;
  file_path: string;
  body: string;
  content_hash: string;
}

const ATOMIC_RECORD_ID_PATTERN =
  /^(?:(?:CF|CH|M|OQ|ENT)-\d+|(?:ONT|CAU|DIS|SOC|AES)-\d+|SEC-(?:ELF|INS|MTS|GEO|ECR|PAS|TML)-\d+)$/;

const HYBRID_RECORD_ID_PATTERN = /^(?:CHAR|DA|PA)-\d+$/;

const STORY_MARKDOWN_NODE_TYPES: readonly StoryBundleNodeType[] = [
  "storylet_batch_manifest",
  "remediation_storylet_proposal_card"
];

const NODE_TYPE_TO_RECORD_KIND: Partial<Record<NodeType, ParsedRecord["record_kind"]>> = {
  canon_fact_record: "canon_fact",
  change_log_entry: "change_log",
  invariant: "invariant",
  mystery_reserve_entry: "mystery_reserve",
  open_question_entry: "open_question",
  named_entity: "named_entity",
  section: "section"
};

const NODE_TYPE_TO_HYBRID_KIND: Partial<Record<NodeType, HybridRecordKind>> = {
  character_record: "character",
  diegetic_artifact_record: "diegetic_artifact",
  adjudication_record: "adjudication"
};

function getRecordKind(nodeType: NodeType): ParsedRecord["record_kind"] | null {
  if (isStoryBundleNodeType(nodeType)) {
    return nodeType;
  }

  return NODE_TYPE_TO_RECORD_KIND[nodeType] ?? null;
}

export function getHybridKind(nodeType: NodeType): HybridRecordKind | null {
  return NODE_TYPE_TO_HYBRID_KIND[nodeType] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMcpError(value: unknown): value is McpError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code: unknown }).code === "string"
  );
}

export function validateRecordId(recordId: string): McpError | null {
  if (
    ATOMIC_RECORD_ID_PATTERN.test(recordId) ||
    HYBRID_RECORD_ID_PATTERN.test(recordId) ||
    isStoryBundleRecordId(recordId)
  ) {
    return null;
  }

  return createMcpError("invalid_input", `record_id '${recordId}' is not a supported record id.`, {
    field: "record_id",
    expected:
      "atomic (CF-<integer>, CH-<integer>, M-<integer>, OQ-<integer>, ENT-<integer>, invariant category id, SEC-<class>-<integer>), hybrid (CHAR-<integer>, DA-<integer>, PA-<integer>), or story-bundle (PG/SE/SF/OBL/CNSQ/THR/SREL/STINT/STENT/STLOC/STOBJ/BR/CHC/SLT/SLB/SAU/SP/RSP-<integer>)"
  });
}

function findRecordRow(
  worldSlug: string,
  recordId: string,
  storySlug?: string
): RecordRow | McpError | undefined {
  const opened = openIndexDb(worldSlug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    if (storySlug !== undefined && isStoryBundleRecordId(recordId)) {
      return opened.db
        .prepare(
          `
            SELECT node_id, story_slug, node_type, file_path, body, content_hash
            FROM nodes
            WHERE world_slug = ?
              AND story_slug = ?
              AND node_id = ?
            LIMIT 1
          `
        )
        .get(worldSlug, storySlug, toStoryScopedNodeId(recordId, storySlug)) as
        | RecordRow
        | undefined;
    }

    return opened.db
      .prepare(
        `
          SELECT node_id, story_slug, node_type, file_path, body, content_hash
          FROM nodes
          WHERE world_slug = ?
            AND node_id = ?
            AND story_slug IS NULL
          LIMIT 1
        `
      )
      .get(worldSlug, recordId) as RecordRow | undefined;
  } finally {
    opened.db.close();
  }
}

export function resolveRecordRow(args: {
  record_id: string;
  world_slug?: string;
  story_slug?: string;
}): { worldSlug: string; row: RecordRow } | McpError {
  if (isStoryBundleRecordId(args.record_id) && args.story_slug === undefined) {
    return createMcpError(
      "invalid_input",
      `story_slug required for record_id=${args.record_id}; bundle-scoped IDs are not unique across bundles within a world.`,
      {
        field: "story_slug",
        record_id: args.record_id
      }
    );
  }

  if (args.world_slug !== undefined && args.world_slug.length > 0) {
    const row = findRecordRow(args.world_slug, args.record_id, args.story_slug);
    if (row === undefined) {
      return createMcpError("record_not_found", `Record '${args.record_id}' does not exist.`, {
        record_id: args.record_id,
        world_slug: args.world_slug,
        ...(args.story_slug !== undefined ? { story_slug: args.story_slug } : {})
      });
    }

    return "code" in row ? row : { worldSlug: args.world_slug, row };
  }

  const matches: Array<{ worldSlug: string; row: RecordRow }> = [];

  for (const worldSlug of listIndexedWorldSlugs()) {
    const row = findRecordRow(worldSlug, args.record_id, args.story_slug);
    if (row === undefined || "code" in row) {
      continue;
    }

    matches.push({ worldSlug, row });
  }

  if (matches.length === 1) {
    return matches[0]!;
  }

  if (matches.length > 1) {
    throw new Error(
      `Record id '${args.record_id}' is ambiguous across indexed worlds: ${matches
        .map((match) => match.worldSlug)
        .join(", ")}.`
    );
  }

  return createMcpError("record_not_found", `Record '${args.record_id}' was not found in any indexed world.`, {
    record_id: args.record_id
  });
}

export function parseRecordBody(row: RecordRow): ParsedRecord | McpError {
  const recordKind = getRecordKind(row.node_type);
  if (recordKind === null) {
    return createMcpError("invalid_input", `Node '${row.node_id}' is not an atomic record node.`, {
      field: "record_id",
      record_id: row.node_id,
      node_type: row.node_type
    });
  }

  if (
    isStoryBundleNodeType(row.node_type) &&
    (STORY_MARKDOWN_NODE_TYPES as readonly string[]).includes(row.node_type)
  ) {
    return {
      record_kind: row.node_type,
      record_id: row.node_id,
      body: row.body
    };
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(row.body);
  } catch (error) {
    return createMcpError("invalid_input", `Record '${row.node_id}' body is not parseable YAML.`, {
      field: "record_id",
      record_id: row.node_id,
      parse_error: error instanceof Error ? error.message : String(error)
    });
  }

  if (!isRecord(parsed)) {
    return createMcpError("invalid_input", `Record '${row.node_id}' body is not a YAML mapping.`, {
      field: "record_id",
      record_id: row.node_id
    });
  }

  return {
    record_kind: recordKind,
    ...parsed
  } as ParsedRecord;
}

export interface HybridFileParts {
  frontmatter: Record<string, unknown>;
  body_sections: Record<string, string>;
}

export function parseHybridFile(
  recordId: string,
  fileBody: string
): HybridFileParts | McpError {
  const lines = fileBody.split("\n");

  if (lines[0] !== "---") {
    return createMcpError(
      "invalid_input",
      `Record '${recordId}' file does not begin with a YAML frontmatter delimiter.`,
      { field: "record_id", record_id: recordId }
    );
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex <= 0) {
    return createMcpError(
      "invalid_input",
      `Record '${recordId}' file is missing a closing YAML frontmatter delimiter.`,
      { field: "record_id", record_id: recordId }
    );
  }

  let parsedFrontmatter: unknown;
  try {
    parsedFrontmatter = YAML.parse(lines.slice(1, closingIndex).join("\n"));
  } catch (error) {
    return createMcpError(
      "invalid_input",
      `Record '${recordId}' frontmatter is not parseable YAML.`,
      {
        field: "record_id",
        record_id: recordId,
        parse_error: error instanceof Error ? error.message : String(error)
      }
    );
  }

  if (!isRecord(parsedFrontmatter)) {
    return createMcpError(
      "invalid_input",
      `Record '${recordId}' frontmatter is not a YAML mapping.`,
      { field: "record_id", record_id: recordId }
    );
  }

  const bodyLines = lines.slice(closingIndex + 1);
  const bodySections = parseBodySections(bodyLines);

  return { frontmatter: parsedFrontmatter, body_sections: bodySections };
}

function parseBodySections(bodyLines: string[]): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flush = (): void => {
    if (currentHeading === null) {
      return;
    }
    while (currentLines.length > 0 && currentLines[currentLines.length - 1] === "") {
      currentLines.pop();
    }
    sections[currentHeading] = currentLines.join("\n");
  };

  for (const line of bodyLines) {
    const headingMatch = /^(#{1,2})\s+(.+?)\s*$/.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[2]!;
      currentLines = [];
      continue;
    }

    if (currentHeading !== null) {
      currentLines.push(line);
    }
  }

  flush();
  return sections;
}

interface SectionPathProjection {
  value: unknown;
}

function projectSectionPath(
  recordId: string,
  parts: HybridFileParts,
  sectionPath: string
): SectionPathProjection | McpError {
  if (sectionPath === "frontmatter") {
    return { value: parts.frontmatter };
  }

  if (sectionPath === "body") {
    return { value: parts.body_sections };
  }

  const firstDot = sectionPath.indexOf(".");
  if (firstDot <= 0) {
    return createMcpError(
      "invalid_input",
      `section_path '${sectionPath}' must be 'frontmatter', 'body', or start with 'frontmatter.' or 'body.' followed by a key.`,
      { field: "section_path", section_path: sectionPath }
    );
  }

  const realm = sectionPath.slice(0, firstDot);
  const remainder = sectionPath.slice(firstDot + 1);

  if (remainder.length === 0) {
    return createMcpError(
      "invalid_input",
      `section_path '${sectionPath}' is missing a key after '${realm}.'.`,
      { field: "section_path", section_path: sectionPath }
    );
  }

  if (realm === "frontmatter") {
    const segments = remainder.split(".");
    let current: unknown = parts.frontmatter;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]!;
      if (!isRecord(current) || !(segment in current)) {
        return createMcpError(
          "section_not_found",
          `section_path '${sectionPath}' does not resolve in record '${recordId}'.`,
          {
            field: "section_path",
            section_path: sectionPath,
            record_id: recordId,
            valid_paths: enumerateValidPaths(parts)
          }
        );
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return { value: current };
  }

  if (realm === "body") {
    if (!(remainder in parts.body_sections)) {
      return createMcpError(
        "section_not_found",
        `section_path '${sectionPath}' does not resolve in record '${recordId}'.`,
        {
          field: "section_path",
          section_path: sectionPath,
          record_id: recordId,
          valid_paths: enumerateValidPaths(parts)
        }
      );
    }
    return { value: parts.body_sections[remainder] };
  }

  return createMcpError(
    "invalid_input",
    `section_path '${sectionPath}' must start with 'frontmatter.' or 'body.'.`,
    { field: "section_path", section_path: sectionPath }
  );
}

function parseAtomicSectionPath(sectionPath: string): Array<string | number> | McpError {
  if (sectionPath.length === 0) {
    return createMcpError("invalid_input", "section_path must not be empty.", {
      field: "section_path",
      section_path: sectionPath
    });
  }

  const segments = sectionPath.split(".");
  if (segments.some((segment) => segment.length === 0)) {
    return createMcpError(
      "invalid_input",
      `section_path '${sectionPath}' contains an empty path segment.`,
      { field: "section_path", section_path: sectionPath }
    );
  }

  return segments.map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

function projectParsedRecordPath(
  recordId: string,
  record: ParsedRecord,
  sectionPath: string
): SectionPathProjection | McpError {
  const segments = parseAtomicSectionPath(sectionPath);
  if (isMcpError(segments)) {
    return segments;
  }

  let current: unknown = record;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    let next: unknown;
    if (Array.isArray(current)) {
      next = typeof segment === "number" && Number.isInteger(segment) ? current[segment] : undefined;
    } else if (isRecord(current)) {
      next = current[String(segment)];
    }

    if (next === undefined) {
      return createMcpError(
        "section_not_found",
        `section_path '${sectionPath}' does not resolve in record '${recordId}'.`,
        {
          field: "section_path",
          section_path: sectionPath,
          record_id: recordId,
          missing_segment: segment,
          missing_segment_index: index
        }
      );
    }

    current = next;
  }

  return { value: current };
}

function enumerateValidPaths(parts: HybridFileParts): string[] {
  const paths: string[] = ["frontmatter", "body"];
  for (const key of Object.keys(parts.frontmatter)) {
    paths.push(`frontmatter.${key}`);
  }
  for (const key of Object.keys(parts.body_sections)) {
    paths.push(`body.${key}`);
  }
  return paths;
}

function effectiveResponseCapChars(): number {
  return Math.max(1, resolveHarnessCeilingChars() - ENVELOPE_OVERHEAD_RESERVE_CHARS);
}

function serializeResponse(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function buildOversizeResponse(args: {
  fullResponse: GetRecordHybridResponse;
  worldSlug: string;
  parts: HybridFileParts;
  totalChars: number;
  responseCapChars: number;
}): GetRecordOversizeResponse {
  const persistedOutputPath = persistToolResultJson(
    `${args.worldSlug}-get_record-${args.fullResponse.record_id}`,
    args.fullResponse
  );
  const allSuggestedSectionPaths = enumerateValidPaths(args.parts);
  const fallbackAdvice = "Retry get_record with a suggested section_path, or read persisted_output_path JSON.";
  const buildResponse = (suggestedSectionPaths: string[]): GetRecordOversizeResponse => {
    const omittedCount = allSuggestedSectionPaths.length - suggestedSectionPaths.length;
    return {
      record_id: args.fullResponse.record_id,
      record_kind: args.fullResponse.record_kind,
      delivery_status: "oversize_with_projection_suggestions",
      persisted_output_path: persistedOutputPath,
      total_chars: args.totalChars,
      response_cap_chars: args.responseCapChars,
      suggested_section_paths: suggestedSectionPaths,
      ...(omittedCount > 0 ? { suggested_section_paths_omitted_count: omittedCount } : {}),
      fallback_advice: fallbackAdvice,
      content_hash: args.fullResponse.content_hash,
      file_path: args.fullResponse.file_path
    };
  };

  const suggestedSectionPaths = [...allSuggestedSectionPaths];
  let response = buildResponse(suggestedSectionPaths);
  while (serializeResponse(response).length > args.responseCapChars && suggestedSectionPaths.length > 1) {
    suggestedSectionPaths.pop();
    response = buildResponse(suggestedSectionPaths);
  }
  return response;
}

async function getRecordImpl(args: GetRecordArgs): Promise<GetRecordResponse | McpError> {
  const idError = validateRecordId(args.record_id);
  if (idError !== null) {
    return idError;
  }

  const isHybrid = HYBRID_RECORD_ID_PATTERN.test(args.record_id);

  const isStoryBundleRecord = isStoryBundleRecordId(args.record_id);

  if (args.section_path !== undefined && isHybrid && isStoryBundleRecord) {
    return createMcpError(
      "invalid_input",
      `section_path is not valid for story-bundle records with hybrid ids.`,
      { field: "section_path", record_id: args.record_id }
    );
  }

  const resolved = resolveRecordRow(
    args.world_slug !== undefined
      ? {
          record_id: args.record_id,
          world_slug: args.world_slug,
          ...(args.story_slug !== undefined ? { story_slug: args.story_slug } : {})
        }
      : {
          record_id: args.record_id,
          ...(args.story_slug !== undefined ? { story_slug: args.story_slug } : {})
        }
  );
  if ("code" in resolved) {
    return resolved;
  }

  if (isHybrid) {
    const recordKind = getHybridKind(resolved.row.node_type);
    if (recordKind === null) {
      return createMcpError(
        "invalid_input",
        `Node '${resolved.row.node_id}' is not a hybrid record node.`,
        {
          field: "record_id",
          record_id: resolved.row.node_id,
          node_type: resolved.row.node_type
        }
      );
    }

    const parts = parseHybridFile(resolved.row.node_id, resolved.row.body);
    if (isMcpError(parts)) {
      return parts;
    }

    if (args.section_path !== undefined) {
      const projection = projectSectionPath(resolved.row.node_id, parts, args.section_path);
      if (isMcpError(projection)) {
        return projection;
      }
      return {
        record_id: resolved.row.node_id,
        record_kind: recordKind,
        section_path: args.section_path,
        value: projection.value,
        content_hash: resolved.row.content_hash,
        file_path: resolved.row.file_path
      };
    }

    const fullResponse: GetRecordHybridResponse = {
      record_id: resolved.row.node_id,
      record_kind: recordKind,
      frontmatter: parts.frontmatter,
      body_sections: parts.body_sections,
      content_hash: resolved.row.content_hash,
      file_path: resolved.row.file_path
    };

    const serialized = serializeResponse(fullResponse);
    const responseCapChars = effectiveResponseCapChars();
    if (serialized.length > responseCapChars) {
      return buildOversizeResponse({
        fullResponse,
        worldSlug: resolved.worldSlug,
        parts,
        totalChars: serialized.length,
        responseCapChars
      });
    }

    return fullResponse;
  }

  const record = parseRecordBody(resolved.row);
  if (isMcpError(record)) {
    return record;
  }

  if (args.section_path !== undefined) {
    const projection = projectParsedRecordPath(resolved.row.node_id, record, args.section_path);
    if (isMcpError(projection)) {
      return projection;
    }
    return {
      record_id: resolved.row.node_id,
      record_kind: record.record_kind,
      section_path: args.section_path,
      value: projection.value,
      content_hash: resolved.row.content_hash,
      file_path: resolved.row.file_path
    };
  }

  return {
    record,
    content_hash: resolved.row.content_hash,
    file_path: resolved.row.file_path
  };
}

export const getRecord = withIndexFreshnessGuard(getRecordImpl);
