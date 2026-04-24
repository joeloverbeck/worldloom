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
import { createMcpError, type McpError } from "../errors";

import { listIndexedWorldSlugs } from "./_shared";

export interface GetRecordArgs {
  record_id: string;
  world_slug?: string;
}

export type ParsedRecord =
  | ({ record_kind: "canon_fact" } & CanonFactRecord)
  | ({ record_kind: "change_log" } & ChangeLogEntry)
  | ({ record_kind: "invariant" } & InvariantRecord)
  | ({ record_kind: "mystery_reserve" } & MysteryRecord)
  | ({ record_kind: "open_question" } & OpenQuestionRecord)
  | ({ record_kind: "named_entity" } & NamedEntityRecord)
  | ({ record_kind: "section" } & SectionRecord);

export interface GetRecordResponse {
  record: ParsedRecord;
  content_hash: string;
  file_path: string;
}

interface RecordRow {
  node_id: string;
  node_type: NodeType;
  file_path: string;
  body: string;
  content_hash: string;
}

const RECORD_ID_PATTERN =
  /^(?:(?:CF|CH|M|OQ|ENT)-\d+|(?:ONT|CAU|DIS|SOC|AES)-\d+|SEC-(?:ELF|INS|MTS|GEO|ECR|PAS|TML)-\d+)$/;

const NODE_TYPE_TO_RECORD_KIND: Partial<Record<NodeType, ParsedRecord["record_kind"]>> = {
  canon_fact_record: "canon_fact",
  change_log_entry: "change_log",
  invariant: "invariant",
  mystery_reserve_entry: "mystery_reserve",
  open_question_entry: "open_question",
  named_entity: "named_entity",
  section: "section"
};

function getRecordKind(nodeType: NodeType): ParsedRecord["record_kind"] | null {
  return NODE_TYPE_TO_RECORD_KIND[nodeType] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMcpError(value: unknown): value is McpError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code: unknown }).code === "string"
  );
}

function validateRecordId(recordId: string): McpError | null {
  if (!RECORD_ID_PATTERN.test(recordId)) {
    return createMcpError("invalid_input", `record_id '${recordId}' is not a supported atomic record id.`, {
      field: "record_id",
      expected:
        "CF-NNNN, CH-NNNN, M-N, OQ-NNNN, ENT-NNNN, invariant category id, or SEC-<class>-NNN"
    });
  }

  return null;
}

function findRecordRow(worldSlug: string, recordId: string): RecordRow | McpError | undefined {
  const opened = openIndexDb(worldSlug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    return opened.db
      .prepare(
        `
          SELECT node_id, node_type, file_path, body, content_hash
          FROM nodes
          WHERE node_id = ?
          LIMIT 1
        `
      )
      .get(recordId) as RecordRow | undefined;
  } finally {
    opened.db.close();
  }
}

function resolveRecordRow(args: GetRecordArgs): { worldSlug: string; row: RecordRow } | McpError {
  if (args.world_slug !== undefined && args.world_slug.length > 0) {
    const row = findRecordRow(args.world_slug, args.record_id);
    if (row === undefined) {
      return createMcpError("record_not_found", `Record '${args.record_id}' does not exist.`, {
        record_id: args.record_id,
        world_slug: args.world_slug
      });
    }

    return "code" in row ? row : { worldSlug: args.world_slug, row };
  }

  const matches: Array<{ worldSlug: string; row: RecordRow }> = [];

  for (const worldSlug of listIndexedWorldSlugs()) {
    const row = findRecordRow(worldSlug, args.record_id);
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

function parseRecordBody(row: RecordRow): ParsedRecord | McpError {
  const recordKind = getRecordKind(row.node_type);
  if (recordKind === null) {
    return createMcpError("invalid_input", `Node '${row.node_id}' is not an atomic record node.`, {
      field: "record_id",
      record_id: row.node_id,
      node_type: row.node_type
    });
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

export async function getRecord(args: GetRecordArgs): Promise<GetRecordResponse | McpError> {
  const idError = validateRecordId(args.record_id);
  if (idError !== null) {
    return idError;
  }

  const resolved = resolveRecordRow(args);
  if ("code" in resolved) {
    return resolved;
  }

  const record = parseRecordBody(resolved.row);
  if (isMcpError(record)) {
    return record;
  }

  return {
    record,
    content_hash: resolved.row.content_hash,
    file_path: resolved.row.file_path
  };
}
