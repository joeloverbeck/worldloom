import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { resolveWorldDbPath, resolveWorldRoot } from "./pathing";
import {
  ALWAYS_PROTECTED_FILES,
  THRESHOLD_PROTECTED_FILES
} from "./size-thresholds";

interface NamedEntityMatch {
  entity_id: string;
  canonical_name: string;
  source_node_id: string;
}

interface SearchRow {
  node_id: string;
}

function openWorldDb(worldSlug: string, cwd?: string): Database.Database | null {
  const dbPath = resolveWorldDbPath(worldSlug, cwd);
  if (!existsSync(dbPath)) {
    return null;
  }

  try {
    return new Database(dbPath, { readonly: true });
  } catch {
    return null;
  }
}

function escapeFtsToken(token: string): string {
  return token.replace(/"/g, "");
}

function extractPromptTokens(prompt: string): string[] {
  const stopWords = new Set([
    "about",
    "after",
    "again",
    "against",
    "animalia",
    "because",
    "before",
    "between",
    "could",
    "implement",
    "please",
    "spec",
    "world",
    "worldloom"
  ]);

  return [...new Set(
    (prompt.match(/[A-Za-z][A-Za-z0-9-]{3,}/g) ?? [])
      .map((token) => token.toLowerCase())
      .filter((token) => !stopWords.has(token))
      .slice(0, 8)
  )];
}

export function extractStructuredNodeIds(prompt: string): string[] {
  return [...new Set(prompt.match(/\b(?:CF|CH|PA|DA|PR|BATCH|AU|RP|CHAR)-\d{4}\b|\bM-\d+\b/g) ?? [])];
}

export function detectNamedEntitiesFromPrompt(
  worldSlug: string,
  prompt: string,
  cwd?: string
): NamedEntityMatch[] {
  const db = openWorldDb(worldSlug, cwd);
  if (db === null) {
    return [];
  }

  try {
    const canonicalRows = db
      .prepare(
        `
          SELECT DISTINCT entity_id, canonical_name, source_node_id
          FROM entities
          WHERE world_slug = ?
            AND instr(lower(?), lower(canonical_name)) > 0
          ORDER BY length(canonical_name) DESC, canonical_name ASC
          LIMIT 8
        `
      )
      .all(worldSlug, prompt) as NamedEntityMatch[];

    const aliasRows = db
      .prepare(
        `
          SELECT DISTINCT e.entity_id, e.canonical_name, e.source_node_id
          FROM entity_aliases ea
          INNER JOIN entities e ON e.entity_id = ea.entity_id
          WHERE e.world_slug = ?
            AND instr(lower(?), lower(ea.alias_text)) > 0
          ORDER BY length(e.canonical_name) DESC, e.canonical_name ASC
          LIMIT 8
        `
      )
      .all(worldSlug, prompt) as NamedEntityMatch[];

    const byEntityId = new Map<string, NamedEntityMatch>();
    for (const row of [...canonicalRows, ...aliasRows]) {
      if (!byEntityId.has(row.entity_id)) {
        byEntityId.set(row.entity_id, row);
      }
    }

    return [...byEntityId.values()];
  } finally {
    db.close();
  }
}

function searchRelevantNodeIds(
  db: Database.Database,
  prompt: string
): string[] {
  const queryTokens = extractPromptTokens(prompt).map(escapeFtsToken);
  if (queryTokens.length === 0) {
    return [];
  }

  const ftsQuery = queryTokens.join(" OR ");

  try {
    const rows = db
      .prepare(
        `
          SELECT n.node_id
          FROM fts_nodes
          INNER JOIN nodes n ON n.rowid = fts_nodes.rowid
          WHERE fts_nodes MATCH ?
          ORDER BY bm25(fts_nodes)
          LIMIT 5
        `
      )
      .all(ftsQuery) as SearchRow[];

    return rows.map((row) => row.node_id);
  } catch {
    const likeRows = db
      .prepare(
        `
          SELECT node_id
          FROM nodes
          WHERE ${queryTokens
            .map(() => "(lower(body) LIKE ? OR lower(COALESCE(heading_path, '')) LIKE ?)")
            .join(" OR ")}
          ORDER BY node_id
          LIMIT 5
        `
      )
      .all(
        ...queryTokens.flatMap((token) => [`%${token}%`, `%${token}%`])
      ) as SearchRow[];

    return likeRows.map((row) => row.node_id);
  }
}

export function findRelevantNodeIds(
  worldSlug: string,
  prompt: string,
  cwd?: string
): string[] {
  const db = openWorldDb(worldSlug, cwd);
  const exactIds = extractStructuredNodeIds(prompt);
  const entityMatches = detectNamedEntitiesFromPrompt(worldSlug, prompt, cwd);
  const fromEntities = entityMatches.map((match) => match.source_node_id);

  if (db === null) {
    return [...new Set([...exactIds, ...fromEntities])].slice(0, 5);
  }

  try {
    return [...new Set([...exactIds, ...fromEntities, ...searchRelevantNodeIds(db, prompt)])].slice(0, 5);
  } finally {
    db.close();
  }
}

function countLines(source: string): number {
  if (source.length === 0) {
    return 0;
  }

  return source.split("\n").length;
}

export function readWorldSummary(
  worldSlug: string,
  cwd?: string
): { topLevelFileCount: number; totalLines: number } | null {
  const worldRoot = resolveWorldRoot(worldSlug, cwd);

  try {
    const files = readdirSync(worldRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();

    let totalLines = 0;
    for (const fileName of files) {
      totalLines += countLines(readFileSync(path.join(worldRoot, fileName), "utf8"));
    }

    return {
      topLevelFileCount: files.length,
      totalLines
    };
  } catch {
    return null;
  }
}

export function readProtectedFileWarnings(
  worldSlug: string,
  prompt: string,
  cwd?: string
): string[] {
  const worldRoot = resolveWorldRoot(worldSlug, cwd);
  const lowerPrompt = prompt.toLowerCase();
  const warnings: string[] = [];

  const candidateFiles = [...ALWAYS_PROTECTED_FILES, ...THRESHOLD_PROTECTED_FILES.keys()];
  for (const fileName of candidateFiles) {
    const lowerName = fileName.toLowerCase();
    if (!lowerPrompt.includes(lowerName) && !lowerPrompt.includes(lowerName.replace(".md", ""))) {
      continue;
    }

    const absolutePath = path.join(worldRoot, fileName);
    if (!existsSync(absolutePath)) {
      continue;
    }

    const lineCount = countLines(readFileSync(absolutePath, "utf8"));
    if (ALWAYS_PROTECTED_FILES.has(fileName)) {
      warnings.push(`${fileName} is always protected; prefer mcp__worldloom__get_context_packet or targeted node reads.`);
      continue;
    }

    const threshold = THRESHOLD_PROTECTED_FILES.get(fileName);
    if (threshold !== undefined && lineCount > threshold) {
      warnings.push(`${fileName} is ${lineCount} lines and exceeds the ${threshold}-line raw-read threshold.`);
    }
  }

  return warnings;
}
