import { readFile } from "node:fs/promises";
import path from "node:path";

import { sha256Hex } from "@worldloom/world-index/hash/content";

import { resolveRepoRoot } from "../config/repo-root.js";
import { parseRecordBody, storyDirectory } from "./record-io.js";
import type { ProseStatus } from "../view-models/page-detail.js";

export interface ProseReadResult {
  body: string | null;
  status: ProseStatus;
}

function valueAsString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function receiptStateHash(receiptPath: string): Promise<string | null> {
  try {
    const body = await readFile(receiptPath, "utf8");
    const parsed = parseRecordBody(body);
    return valueAsString(parsed.state_hash) ?? valueAsString(parsed.prose_hash) ?? valueAsString(parsed.rendered_prose_hash);
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readProse(
  worldSlug: string,
  storySlug: string,
  pageId: string,
  repoRoot = resolveRepoRoot()
): Promise<ProseReadResult> {
  const base = storyDirectory(repoRoot, worldSlug, storySlug);
  const prosePath = path.join(base, "pages-prose", `${pageId}.md`);
  const receiptPath = path.join(base, "pages-prose-receipts", `${pageId}.yaml`);

  try {
    const body = await readFile(prosePath, "utf8");
    const expectedHash = await receiptStateHash(receiptPath);
    if (expectedHash !== null && expectedHash !== sha256Hex(body)) {
      return { body, status: "hash_mismatch" };
    }
    return { body, status: "present" };
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return { body: null, status: "missing" };
    }
    return { body: null, status: "unreadable" };
  }
}
