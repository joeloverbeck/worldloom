import YAML from "yaml";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

import type { RecordRow } from "./get-record";

export interface GetFirewallContentArgs {
  world_slug: string;
  m_ids?: string[];
}

export interface FirewallContent {
  title: string;
  status: string;
  unknowns: string[];
  common_interpretations: string[];
  disallowed_cheap_answers: string[];
}

export interface GetFirewallContentResponse {
  records: Record<string, FirewallContent>;
  not_found: string[];
}

const M_RECORD_ID_PATTERN = /^M-\d+$/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function projectFirewallFields(row: RecordRow): FirewallContent | McpError {
  let parsed: unknown;
  try {
    parsed = YAML.parse(row.body);
  } catch (error) {
    return createMcpError("invalid_input", `Record '${row.node_id}' body is not parseable YAML.`, {
      record_id: row.node_id,
      parse_error: error instanceof Error ? error.message : String(error)
    });
  }

  if (!isRecord(parsed)) {
    return createMcpError("invalid_input", `Record '${row.node_id}' body is not a YAML mapping.`, {
      record_id: row.node_id
    });
  }

  return {
    title: typeof parsed.title === "string" ? parsed.title : "",
    status: typeof parsed.status === "string" ? parsed.status : "",
    unknowns: isStringArray(parsed.unknowns) ? parsed.unknowns : [],
    common_interpretations: isStringArray(parsed.common_interpretations)
      ? parsed.common_interpretations
      : [],
    disallowed_cheap_answers: isStringArray(parsed.disallowed_cheap_answers)
      ? parsed.disallowed_cheap_answers
      : []
  };
}

export async function getFirewallContent(
  args: GetFirewallContentArgs
): Promise<GetFirewallContentResponse | McpError> {
  if (args.m_ids !== undefined) {
    for (const candidate of args.m_ids) {
      if (!M_RECORD_ID_PATTERN.test(candidate)) {
        return createMcpError(
          "invalid_input",
          `m_ids entry '${candidate}' is not a valid M-record id (expected 'M-N').`,
          { field: "m_ids", invalid_id: candidate }
        );
      }
    }
  }

  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const rows = opened.db
      .prepare(
        `
          SELECT node_id, node_type, file_path, body, content_hash
          FROM nodes
          WHERE world_slug = ?
            AND node_type = 'mystery_reserve_entry'
          ORDER BY node_id
        `
      )
      .all(args.world_slug) as RecordRow[];

    const indexed = new Map<string, RecordRow>();
    for (const row of rows) {
      indexed.set(row.node_id, row);
    }

    const requestedIds =
      args.m_ids !== undefined && args.m_ids.length > 0
        ? args.m_ids
        : [...indexed.keys()];

    const records: Record<string, FirewallContent> = {};
    const notFound: string[] = [];

    for (const requestedId of requestedIds) {
      const row = indexed.get(requestedId);
      if (row === undefined) {
        notFound.push(requestedId);
        continue;
      }

      const projected = projectFirewallFields(row);
      if ("code" in projected) {
        return projected;
      }
      records[requestedId] = projected;
    }

    return { records, not_found: notFound };
  } finally {
    opened.db.close();
  }
}
