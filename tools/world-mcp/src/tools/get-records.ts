import { createMcpError, type McpError } from "../errors.js";

import { getRecord, isMcpError, type GetRecordResponse } from "./get-record.js";
import {
  ceilingMetadata,
  persistWithSummary,
  type PersistedWithSummaryFields
} from "./oversize-delivery.js";

export interface GetRecordsArgs {
  record_ids: string[];
  world_slug?: string;
  story_slug?: string;
}

export interface GetRecordsSuccessEntry {
  record_id: string;
  found: true;
  record: GetRecordResponse | (GetRecordResponse & Record<string, unknown>);
  content_hash: string;
  file_path: string;
}

export interface GetRecordsErrorEntry {
  record_id: string;
  found: false;
  error: McpError;
}

export type GetRecordsEntry = GetRecordsSuccessEntry | GetRecordsErrorEntry;

export interface GetRecordsResponse {
  delivery_status: "inline";
  records: GetRecordsEntry[];
}

export interface GetRecordsPersistedSummary {
  tool: "get_records";
  record_count: number;
  requested_record_ids: string[];
  records: Array<{
    record_id: string;
    found: boolean;
    record_kind?: string;
    content_hash?: string;
    file_path?: string;
    error_code?: string;
    error_message?: string;
  }>;
  suggested_slice_paths: string[];
  ceiling: ReturnType<typeof ceilingMetadata>;
}

export type GetRecordsResult =
  | GetRecordsResponse
  | PersistedWithSummaryFields<GetRecordsPersistedSummary>;

async function resolveOne(
  recordId: string,
  worldSlug: string | undefined,
  storySlug: string | undefined
): Promise<GetRecordsEntry> {
  const result = await getRecord(
    worldSlug === undefined
      ? {
          record_id: recordId,
          ...(storySlug !== undefined ? { story_slug: storySlug } : {})
        }
      : {
          record_id: recordId,
          world_slug: worldSlug,
          ...(storySlug !== undefined ? { story_slug: storySlug } : {})
        }
  );

  if (isMcpError(result)) {
    return {
      record_id: recordId,
      found: false,
      error: result
    };
  }

  return {
    record_id: recordId,
    found: true,
    record: result,
    content_hash: result.content_hash,
    file_path: result.file_path
  };
}

function inferRecordKind(entry: GetRecordsSuccessEntry): string | undefined {
  if ("record_kind" in entry.record && typeof entry.record.record_kind === "string") {
    return entry.record.record_kind;
  }

  if ("record" in entry.record && typeof entry.record.record === "object" && entry.record.record !== null) {
    const id = (entry.record.record as Record<string, unknown>).id;
    if (typeof id === "string") {
      return id.split("-")[0];
    }
  }

  return entry.record_id.split("-")[0];
}

function summarizeGetRecords(
  args: GetRecordsArgs,
  records: readonly GetRecordsEntry[]
): GetRecordsPersistedSummary {
  return {
    tool: "get_records",
    record_count: records.length,
    requested_record_ids: [...args.record_ids],
    records: records.map((entry) => {
      if (!entry.found) {
        return {
          record_id: entry.record_id,
          found: false,
          error_code: entry.error.code,
          error_message: entry.error.message
        };
      }

      const recordKind = inferRecordKind(entry);
      return {
        record_id: entry.record_id,
        found: true,
        ...(recordKind === undefined ? {} : { record_kind: recordKind }),
        content_hash: entry.content_hash,
        file_path: entry.file_path
      };
    }),
    suggested_slice_paths: records.map((_, index) => `records[${index}]`),
    ceiling: ceilingMetadata()
  };
}

function getRecordsNameParts(args: GetRecordsArgs): string {
  const scope = [args.world_slug ?? "default-world", args.story_slug ?? "world-canon"].join("-");
  return `${scope}-get_records-${args.record_ids.length}`;
}

export async function getRecords(args: GetRecordsArgs): Promise<GetRecordsResult | McpError> {
  if (args.record_ids.length === 0) {
    return createMcpError("invalid_input", "record_ids must contain at least one record id.", {
      field: "record_ids"
    });
  }

  const records = await Promise.all(
    args.record_ids.map((recordId) => resolveOne(recordId, args.world_slug, args.story_slug))
  );

  return persistWithSummary(getRecordsNameParts(args), { records }, summarizeGetRecords(args, records));
}
