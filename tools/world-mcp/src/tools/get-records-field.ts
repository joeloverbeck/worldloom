import { createMcpError, type McpError } from "../errors";

import {
  getRecordField,
  type GetRecordFieldResponse
} from "./get-record-field";
import { isMcpError } from "./get-record";

export interface GetRecordsFieldArgs {
  record_ids: string[];
  field_path: Array<string | number>;
  world_slug?: string;
  story_slug?: string;
}

export interface GetRecordsFieldSuccessEntry {
  record_id: string;
  found: true;
  field_value: unknown;
  content_hash: string;
  file_path: string;
}

export interface GetRecordsFieldErrorEntry {
  record_id: string;
  found: false;
  error: McpError;
}

export type GetRecordsFieldEntry = GetRecordsFieldSuccessEntry | GetRecordsFieldErrorEntry;

export interface GetRecordsFieldResponse {
  records: GetRecordsFieldEntry[];
  field_path: Array<string | number>;
}

async function resolveOne(
  recordId: string,
  fieldPath: Array<string | number>,
  worldSlug: string | undefined,
  storySlug: string | undefined
): Promise<GetRecordsFieldEntry> {
  const result = await getRecordField(
    worldSlug === undefined
      ? {
          record_id: recordId,
          field_path: fieldPath,
          ...(storySlug !== undefined ? { story_slug: storySlug } : {})
        }
      : {
          record_id: recordId,
          field_path: fieldPath,
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

  const fieldResult = result as GetRecordFieldResponse;

  return {
    record_id: recordId,
    found: true,
    field_value: fieldResult.value,
    content_hash: fieldResult.content_hash,
    file_path: fieldResult.file_path
  };
}

export async function getRecordsField(
  args: GetRecordsFieldArgs
): Promise<GetRecordsFieldResponse | McpError> {
  if (args.record_ids.length === 0) {
    return createMcpError("invalid_input", "record_ids must contain at least one record id.", {
      field: "record_ids"
    });
  }

  if (args.field_path.length === 0) {
    return createMcpError("invalid_input", "field_path must contain at least one segment.", {
      field: "field_path"
    });
  }

  const records = await Promise.all(
    args.record_ids.map((recordId) =>
      resolveOne(recordId, args.field_path, args.world_slug, args.story_slug)
    )
  );

  return {
    records,
    field_path: args.field_path
  };
}
