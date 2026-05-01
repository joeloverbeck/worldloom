import type { NodeType } from "@worldloom/world-index/public/types";

import { withIndexFreshnessGuard } from "../context-packet/freshness-guard";
import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

import { isMcpError, parseRecordBody, type ParsedRecord, type RecordRow } from "./get-record";

export const SUPPORTED_LIST_RECORD_TYPES = [
  "canon_fact",
  "change_log_entry",
  "invariant_record",
  "mystery_record",
  "open_question_record",
  "named_entity_record",
  "section_record"
] as const;

export type ListRecordType = (typeof SUPPORTED_LIST_RECORD_TYPES)[number];

export interface ListRecordsArgs {
  world_slug: string;
  record_type: ListRecordType;
  fields?: string[];
  include_full_body?: boolean;
}

export interface ListedRecord extends Record<string, unknown> {
  record_id: string;
}

export interface ListedFullBodyRecord {
  record_id: string;
  content_hash: string;
  file_path: string;
  body: ParsedRecord;
}

export interface ListRecordsResponse {
  records: Array<ListedRecord | ListedFullBodyRecord>;
  total: number;
  truncated: false;
}

const RECORD_TYPE_TO_NODE_TYPE: Record<ListRecordType, NodeType> = {
  canon_fact: "canon_fact_record",
  change_log_entry: "change_log_entry",
  invariant_record: "invariant",
  mystery_record: "mystery_reserve_entry",
  open_question_record: "open_question_entry",
  named_entity_record: "named_entity",
  section_record: "section"
};

function isSupportedRecordType(value: string): value is ListRecordType {
  return (SUPPORTED_LIST_RECORD_TYPES as readonly string[]).includes(value);
}

function withRecordId(row: RecordRow, record: ParsedRecord): ListedRecord {
  return {
    record_id: row.node_id,
    ...record
  };
}

function projectRecord(record: ListedRecord, fields: string[] | undefined): ListedRecord {
  if (fields === undefined || fields.length === 0) {
    return record;
  }

  const projected: ListedRecord = { record_id: record.record_id };
  for (const field of fields) {
    if (field === "record_id") {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      projected[field] = record[field];
    }
  }

  return projected;
}

function withFullBody(row: RecordRow, record: ParsedRecord): ListedFullBodyRecord {
  return {
    record_id: row.node_id,
    content_hash: row.content_hash,
    file_path: row.file_path,
    body: record
  };
}

async function listRecordsImpl(args: ListRecordsArgs): Promise<ListRecordsResponse | McpError> {
  if (!isSupportedRecordType(args.record_type)) {
    return createMcpError("invalid_input", `record_type '${args.record_type}' is not supported.`, {
      field: "record_type",
      supported_record_types: [...SUPPORTED_LIST_RECORD_TYPES]
    });
  }

  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  const nodeType = RECORD_TYPE_TO_NODE_TYPE[args.record_type];

  try {
    const rows = opened.db
      .prepare(
        `
          SELECT node_id, node_type, file_path, body, content_hash
          FROM nodes
          WHERE world_slug = ?
            AND node_type = ?
          ORDER BY node_id
        `
      )
      .all(args.world_slug, nodeType) as RecordRow[];

    const records: Array<ListedRecord | ListedFullBodyRecord> = [];
    for (const row of rows) {
      const parsed = parseRecordBody(row);
      if (isMcpError(parsed)) {
        return parsed;
      }
      records.push(
        args.include_full_body === true
          ? withFullBody(row, parsed)
          : projectRecord(withRecordId(row, parsed), args.fields)
      );
    }

    return {
      records,
      total: records.length,
      truncated: false
    };
  } finally {
    opened.db.close();
  }
}

export const listRecords = withIndexFreshnessGuard(listRecordsImpl);
