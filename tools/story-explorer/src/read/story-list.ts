import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { openExistingIndex } from "@worldloom/world-index/index/open";

import { resolveRepoRoot } from "../config/repo-root.js";
import { resolveIndexStatus } from "./index-status.js";
import type { PageSummary, TerminalReason } from "../view-models/page-summary.js";
import type { StorySummary } from "../view-models/story-summary.js";

interface ParsedPageRecord {
  id: string;
  branchId: string;
  parentPageId: string | null;
  turnIndex: number;
  choiceId: string | null;
  resolvedEventId: string | null;
  activeRecordCounts: Record<string, number>;
  emittedChoices: string[];
  terminalStatus: string | null;
}

function directoryEntries(parent: string): string[] {
  try {
    return readdirSync(parent)
      .filter((entry) => !entry.startsWith("."))
      .filter((entry) => statSync(path.join(parent, entry)).isDirectory())
      .sort();
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function fileEntries(parent: string, pattern: RegExp): string[] {
  try {
    return readdirSync(parent)
      .filter((entry) => pattern.test(entry))
      .sort();
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function storyDirectory(repoRoot: string, worldSlug: string, storySlug: string): string {
  return path.join(repoRoot, "worlds", worldSlug, "stories", storySlug);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = unquote(value);
  return parsed === "null" || parsed === "" ? null : parsed;
}

function parseInlineArray(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((entry) => unquote(entry))
    .filter(Boolean);
}

function indentation(line: string): number {
  return line.length - line.trimStart().length;
}

function scalarAfterKey(lines: string[], key: string, minIndent = 0): string | null {
  const prefix = `${key}:`;
  for (const line of lines) {
    if (indentation(line) < minIndent) {
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith(prefix)) {
      return parseScalar(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function sectionLines(lines: string[], key: string, minIndent = 0): string[] {
  const prefix = `${key}:`;
  const start = lines.findIndex(
    (line) => indentation(line) >= minIndent && line.trim() === prefix
  );
  if (start < 0) {
    return [];
  }

  const baseIndent = indentation(lines[start] ?? "");
  const section: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== "" && indentation(line) <= baseIndent) {
      break;
    }
    section.push(line);
  }
  return section;
}

function arrayAfterKey(lines: string[], key: string): string[] {
  const prefix = `${key}:`;
  const start = lines.findIndex((line) => line.trim().startsWith(prefix));
  if (start < 0) {
    return [];
  }

  const currentLine = lines[start];
  if (currentLine === undefined) {
    return [];
  }
  const inline = currentLine.trim().slice(prefix.length);
  if (inline.trim().startsWith("[")) {
    return parseInlineArray(inline);
  }

  const baseIndent = indentation(currentLine);
  const values: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== "" && indentation(line) <= baseIndent) {
      break;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      values.push(unquote(trimmed.slice(2)));
    }
  }
  return values;
}

function parseActiveRecordCounts(lines: string[]): Record<string, number> {
  const stateSnapshot = sectionLines(lines, "state_snapshot");
  const activeRecords = sectionLines(stateSnapshot, "active_records");
  const counts: Record<string, number> = {};

  for (const line of activeRecords) {
    const match = /^\s*([A-Z]+):\s*(.*)$/.exec(line);
    if (match === null) {
      continue;
    }
    const key = match[1];
    if (key === undefined) {
      continue;
    }
    const value = match[2] ?? "";
    counts[key] = parseInlineArray(value).length;
  }

  return counts;
}

function parsePageRecord(body: string): ParsedPageRecord {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const input = (parsed.input ?? {}) as Record<string, unknown>;
    const stateSnapshot = (parsed.state_snapshot ?? {}) as Record<string, unknown>;
    const activeRecords = (stateSnapshot.active_records ?? {}) as Record<string, unknown>;
    const continuation = (stateSnapshot.continuation ?? {}) as Record<string, unknown>;

    return {
      id: String(parsed.id ?? ""),
      branchId: String(parsed.branch_id ?? ""),
      parentPageId: parseScalar(parsed.parent_page_id),
      turnIndex: Number(parsed.turn_index ?? 0),
      choiceId: parseScalar(input.choice_id),
      resolvedEventId: parseScalar(input.resolved_event_id),
      activeRecordCounts: Object.fromEntries(
        Object.entries(activeRecords).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.length : 0,
        ])
      ),
      emittedChoices: Array.isArray(parsed.emitted_choices)
        ? parsed.emitted_choices.map(String)
        : [],
      terminalStatus: parseScalar(continuation.terminal_status),
    };
  } catch {
    const lines = body.split(/\r?\n/);
    const input = sectionLines(lines, "input");
    const stateSnapshot = sectionLines(lines, "state_snapshot");
    const continuation = sectionLines(stateSnapshot, "continuation");

    return {
      id: scalarAfterKey(lines, "id") ?? "",
      branchId: scalarAfterKey(lines, "branch_id") ?? "",
      parentPageId: scalarAfterKey(lines, "parent_page_id"),
      turnIndex: Number(scalarAfterKey(lines, "turn_index") ?? 0),
      choiceId: scalarAfterKey(input, "choice_id"),
      resolvedEventId: scalarAfterKey(input, "resolved_event_id"),
      activeRecordCounts: parseActiveRecordCounts(lines),
      emittedChoices: arrayAfterKey(lines, "emitted_choices"),
      terminalStatus: scalarAfterKey(continuation, "terminal_status"),
    };
  }
}

function pageRecordPath(repoRoot: string, worldSlug: string, storySlug: string, pageId: string): string {
  return path.join(storyDirectory(repoRoot, worldSlug, storySlug), "_source", "pages", `${pageId}.yaml`);
}

function loadPagesFromFilesystem(repoRoot: string, worldSlug: string, storySlug: string): ParsedPageRecord[] {
  const pagesRoot = path.join(storyDirectory(repoRoot, worldSlug, storySlug), "_source", "pages");
  return fileEntries(pagesRoot, /^PG-[0-9]+\.ya?ml$/).map((entry) =>
    parsePageRecord(readFileSync(path.join(pagesRoot, entry), "utf8"))
  );
}

function loadPagesFromIndex(repoRoot: string, worldSlug: string, storySlug: string): ParsedPageRecord[] {
  const db = openExistingIndex(repoRoot, worldSlug);
  try {
    const rows = db
      .prepare(
        `
          SELECT body
          FROM nodes
          WHERE world_slug = ?
            AND story_slug = ?
            AND node_type = 'page_record'
          ORDER BY node_id
        `
      )
      .all(worldSlug, storySlug) as Array<{ body: string }>;
    return rows.map((row) => parsePageRecord(row.body));
  } finally {
    db.close();
  }
}

function readKernelFrontmatter(kernelPath: string): { storyId: string; title: string | null } {
  try {
    const body = readFileSync(kernelPath, "utf8");
    const lines = body.split(/\r?\n/);
    const storyId = scalarAfterKey(lines, "story_id") ?? scalarAfterKey(lines, "id") ?? "";
    const title = scalarAfterKey(lines, "title");
    return { storyId, title };
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return { storyId: "", title: null };
    }
    throw error;
  }
}

function terminalReasonFor(page: ParsedPageRecord, isLeaf: boolean): TerminalReason {
  if (page.terminalStatus === "branch_pause") {
    return "paused";
  }
  if (page.terminalStatus === "terminal_closed") {
    return "terminal";
  }
  return isLeaf ? "no_children" : null;
}

export async function getPageSummaries(
  worldSlug: string,
  storySlug: string,
  repoRoot = resolveRepoRoot()
): Promise<PageSummary[]> {
  const indexStatus = resolveIndexStatus(worldSlug, repoRoot);
  const pages =
    indexStatus.kind === "fresh"
      ? loadPagesFromIndex(repoRoot, worldSlug, storySlug)
      : loadPagesFromFilesystem(repoRoot, worldSlug, storySlug);
  const childCounts = new Map<string, number>();

  for (const page of pages) {
    if (page.parentPageId !== null) {
      childCounts.set(page.parentPageId, (childCounts.get(page.parentPageId) ?? 0) + 1);
    }
  }

  return pages
    .map((page) => {
      const childCount = childCounts.get(page.id) ?? 0;
      const isLeaf = childCount === 0;
      const terminalReason = terminalReasonFor(page, isLeaf);
      const base = storyDirectory(repoRoot, worldSlug, storySlug);

      return {
        pageId: page.id,
        branchId: page.branchId,
        parentPageId: page.parentPageId,
        turnIndex: page.turnIndex,
        choiceId: page.choiceId,
        resolvedEventId: page.resolvedEventId,
        hasRenderedProse: existsSync(path.join(base, "pages-prose", `${page.id}.md`)),
        hasPlan: existsSync(path.join(base, "pages-prose-plans", `${page.id}.md`)),
        hasReceipt: existsSync(path.join(base, "pages-prose-receipts", `${page.id}.yaml`)),
        activeRecordCounts: page.activeRecordCounts,
        childCount,
        isLeaf,
        isTerminalOrPaused: terminalReason !== null,
        terminalReason,
      };
    })
    .sort((left, right) => left.turnIndex - right.turnIndex || left.pageId.localeCompare(right.pageId));
}

export async function enumerateStories(
  worldSlug: string,
  repoRoot = resolveRepoRoot()
): Promise<StorySummary[]> {
  const storiesRoot = path.join(repoRoot, "worlds", worldSlug, "stories");
  const indexStatus = resolveIndexStatus(worldSlug, repoRoot);

  return Promise.all(
    directoryEntries(storiesRoot).map(async (storySlug) => {
      const base = storyDirectory(repoRoot, worldSlug, storySlug);
      const kernelPath = path.join(base, "STORY_KERNEL.md");
      const kernel = readKernelFrontmatter(kernelPath);
      const pages = await getPageSummaries(worldSlug, storySlug, repoRoot);
      const branchIds = new Set(pages.map((page) => page.branchId).filter(Boolean));
      const choiceIds = new Set(pages.map((page) => page.choiceId).filter((id): id is string => id !== null));
      const leafPageIds = pages.filter((page) => page.isLeaf).map((page) => page.pageId);
      const rootPage = pages.find((page) => page.parentPageId === null) ?? pages[0] ?? null;
      const latestPage = pages.reduce<PageSummary | null>(
        (latest, page) => (latest === null || page.turnIndex > latest.turnIndex ? page : latest),
        null
      );

      return {
        worldSlug,
        storySlug,
        storyId: kernel.storyId,
        title: kernel.title,
        kernelPath,
        pageCount: pages.length,
        choiceCount: choiceIds.size,
        branchCount: branchIds.size,
        renderedProseCount: fileEntries(path.join(base, "pages-prose"), /^PG-[0-9]+\.md$/).length,
        leafPageIds,
        rootPageId: rootPage?.pageId ?? null,
        latestPageId: latestPage?.pageId ?? null,
        indexStatus,
      };
    })
  );
}

export function pageSourcePath(worldSlug: string, storySlug: string, pageId: string, repoRoot = resolveRepoRoot()): string {
  return pageRecordPath(repoRoot, worldSlug, storySlug, pageId);
}
