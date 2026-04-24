import YAML from "yaml";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

export interface FindSectionsTouchedByArgs {
  cf_id: string;
  world_slug: string;
}

export interface SectionMatch {
  sec_id: string;
  file_path: string;
  match_type: "touched_by_cf" | "extension";
}

export interface FindSectionsTouchedByResponse {
  sections: SectionMatch[];
  total_count: number;
}

interface SectionCandidateRow {
  node_id: string;
  file_path: string;
  body: string;
}

const CF_ID_PATTERN = /^CF-\d{4}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchesTouchedByCf(parsed: Record<string, unknown>, cfId: string): boolean {
  return Array.isArray(parsed.touched_by_cf) && parsed.touched_by_cf.includes(cfId);
}

function matchesExtensionOrigin(parsed: Record<string, unknown>, cfId: string): boolean {
  if (!Array.isArray(parsed.extensions)) {
    return false;
  }

  return parsed.extensions.some(
    (entry) => isRecord(entry) && entry.originating_cf === cfId
  );
}

function classifySectionMatch(row: SectionCandidateRow, cfId: string): SectionMatch[] {
  let parsed: unknown;
  try {
    parsed = YAML.parse(row.body);
  } catch {
    return [];
  }

  if (!isRecord(parsed)) {
    return [];
  }

  const matches: SectionMatch[] = [];
  if (matchesTouchedByCf(parsed, cfId)) {
    matches.push({
      sec_id: row.node_id,
      file_path: row.file_path,
      match_type: "touched_by_cf"
    });
  }

  if (matchesExtensionOrigin(parsed, cfId)) {
    matches.push({
      sec_id: row.node_id,
      file_path: row.file_path,
      match_type: "extension"
    });
  }

  return matches;
}

export async function findSectionsTouchedBy(
  args: FindSectionsTouchedByArgs
): Promise<FindSectionsTouchedByResponse | McpError> {
  if (!CF_ID_PATTERN.test(args.cf_id)) {
    return createMcpError("invalid_input", `cf_id '${args.cf_id}' is not a Canon Fact id.`, {
      field: "cf_id",
      expected: "CF-NNNN"
    });
  }

  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const rows = opened.db
      .prepare(
        `
          SELECT node_id, file_path, body
          FROM nodes
          WHERE world_slug = ?
            AND node_type = 'section'
            AND body LIKE '%' || ? || '%'
          ORDER BY node_id, file_path
        `
      )
      .all(args.world_slug, args.cf_id) as SectionCandidateRow[];

    const sections = rows.flatMap((row) => classifySectionMatch(row, args.cf_id));

    return {
      sections,
      total_count: sections.length
    };
  } finally {
    opened.db.close();
  }
}
