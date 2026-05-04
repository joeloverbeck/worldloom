import { readPersistedPacketJson } from "../context-packet/persistence";
import { createMcpError, type McpError } from "../errors";

export interface GetPersistedPacketSliceArgs {
  persisted_path: string;
  slice_path: string;
}

export interface GetPersistedPacketSliceResponse {
  found: boolean;
  slice?: unknown;
  error?: McpError;
}

interface SliceSegment {
  key: string;
  id?: string;
  index?: number;
}

const SEGMENT_PATTERN = /^([^.[\]]+)(?:\[(?:(id)=([^\]]+)|([0-9]+))\])?$/;

function parseSlicePath(slicePath: string): SliceSegment[] | McpError {
  const rawSegments = slicePath.split(".");
  if (rawSegments.length === 0 || rawSegments.some((segment) => segment.trim().length === 0)) {
    return createMcpError("invalid_input", "slice_path must be a non-empty dot path.", {
      field: "slice_path"
    });
  }

  const segments: SliceSegment[] = [];
  for (const rawSegment of rawSegments) {
    const match = rawSegment.match(SEGMENT_PATTERN);
    if (match === null) {
      return createMcpError("invalid_input", `Unsupported slice_path segment '${rawSegment}'.`, {
        field: "slice_path",
        segment: rawSegment,
        expected: "property, property[index], or property[id=<node-id>]"
      });
    }

    segments.push({
      key: match[1]!,
      ...(match[2] === undefined ? {} : { id: match[3] }),
      ...(match[4] === undefined ? {} : { index: Number.parseInt(match[4], 10) })
    });
  }

  return segments;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findById(value: unknown, id: string): unknown {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.find((entry) => isRecord(entry) && entry.id === id);
}

function findByIndex(value: unknown, index: number): unknown {
  if (!Array.isArray(value) || index < 0 || index >= value.length) {
    return undefined;
  }

  return value[index];
}

function getSlice(root: unknown, segments: readonly SliceSegment[]): unknown {
  let current = root;

  for (const segment of segments) {
    if (!isRecord(current) || !(segment.key in current)) {
      return undefined;
    }

    current = current[segment.key];
    if (segment.id !== undefined) {
      current = findById(current, segment.id);
      if (current === undefined) {
        return undefined;
      }
    }
    if (segment.index !== undefined) {
      current = findByIndex(current, segment.index);
      if (current === undefined) {
        return undefined;
      }
    }
  }

  return current;
}

export async function getPersistedPacketSlice(
  args: GetPersistedPacketSliceArgs
): Promise<GetPersistedPacketSliceResponse | McpError> {
  const segments = parseSlicePath(args.slice_path);
  if ("code" in segments) {
    return segments;
  }

  let parsed: unknown;
  try {
    parsed = readPersistedPacketJson(args.persisted_path);
  } catch (error) {
    return createMcpError("invalid_input", "Unable to read persisted packet JSON.", {
      persisted_path: args.persisted_path,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const slice = getSlice(parsed, segments);
  if (slice === undefined) {
    return {
      found: false,
      error: createMcpError("slice_not_found", `Slice '${args.slice_path}' was not found.`, {
        slice_path: args.slice_path
      })
    };
  }

  return {
    found: true,
    slice
  };
}
