import { createMcpError, type McpError } from "../errors";

import { getRecord, isMcpError, type GetRecordResponse } from "./get-record";

export interface GetRecordsArgs {
  record_ids: string[];
  world_slug?: string;
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
  records: GetRecordsEntry[];
}

async function resolveOne(
  recordId: string,
  worldSlug: string | undefined
): Promise<GetRecordsEntry> {
  const result = await getRecord(
    worldSlug === undefined
      ? { record_id: recordId }
      : { record_id: recordId, world_slug: worldSlug }
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

export async function getRecords(args: GetRecordsArgs): Promise<GetRecordsResponse | McpError> {
  if (args.record_ids.length === 0) {
    return createMcpError("invalid_input", "record_ids must contain at least one record id.", {
      field: "record_ids"
    });
  }

  const records = await Promise.all(
    args.record_ids.map((recordId) => resolveOne(recordId, args.world_slug))
  );

  return { records };
}
