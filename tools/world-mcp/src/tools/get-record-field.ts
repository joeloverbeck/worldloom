import { createMcpError, type McpError } from "../errors";

import {
  isMcpError,
  parseRecordBody,
  resolveRecordRow,
  validateRecordId
} from "./get-record";

export interface GetRecordFieldArgs {
  record_id: string;
  field_path: Array<string | number>;
  world_slug?: string;
}

export interface GetRecordFieldResponse {
  value: unknown;
  content_hash: string;
  file_path: string;
}

function getPathSegment(value: unknown, segment: string | number): unknown {
  if (Array.isArray(value)) {
    return typeof segment === "number" && Number.isInteger(segment) ? value[segment] : undefined;
  }

  if (typeof value === "object" && value !== null) {
    return (value as Record<string, unknown>)[String(segment)];
  }

  return undefined;
}

function projectField(record: unknown, fieldPath: Array<string | number>): unknown | McpError {
  let current = record;

  for (let index = 0; index < fieldPath.length; index += 1) {
    const segment = fieldPath[index]!;
    const next = getPathSegment(current, segment);

    if (next === undefined) {
      return createMcpError(
        "record_field_not_found",
        `Field path segment '${String(segment)}' was not found on record field path.`,
        {
          field: "field_path",
          missing_segment: segment,
          missing_segment_index: index,
          field_path: fieldPath
        }
      );
    }

    current = next;
  }

  return current;
}

export async function getRecordField(
  args: GetRecordFieldArgs
): Promise<GetRecordFieldResponse | McpError> {
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

  const value = projectField(record, args.field_path);
  if (isMcpError(value)) {
    return value;
  }

  return {
    value,
    content_hash: resolved.row.content_hash,
    file_path: resolved.row.file_path
  };
}
