import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, fileInputsFrom, stringValue, toPosixPath, worldRootFrom } from "./utils.js";

const VALIDATOR = "prose_receipt_hash_integrity";
const RECEIPT_PATH_PATTERN = /^stories\/([^/]+)\/pages-prose-receipts\/(PG-(0|[1-9][0-9]*))\.yaml$/;

interface ReceiptTarget {
  storySlug: string;
  pageId: string;
  node_id: string;
  file_path: string;
  content: string;
}

interface ProseReadResult {
  path: string;
  content?: Buffer;
  code?: "prose_receipt_hash_integrity.path_escape" | "prose_receipt_hash_integrity.prose_unreadable";
  message?: string;
}

export const proseReceiptHashIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context) => {
    if (ctx.run_mode === "pre-apply") {
      return false;
    }
    if (ctx.run_mode === "incremental") {
      return ctx.touched_files.some((file) => receiptPathMatchesScope(file, ctx));
    }
    return true;
  },
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const verdicts: Verdict[] = [];

    for (const receipt of receiptTargets(input, ctx)) {
      const parsed = parseYamlReceipt(receipt.content);
      if (!parsed) {
        verdicts.push(fail(
          receipt,
          "prose_receipt_hash_integrity.yaml_parse",
          `${receipt.file_path} prose receipt YAML could not be parsed.`
        ));
        continue;
      }

      const prosePath = stringValue(parsed.prose_path);
      if (!prosePath) {
        verdicts.push(fail(
          receipt,
          "prose_receipt_hash_integrity.missing_prose_path",
          `${receipt.file_path} is missing prose_path.`
        ));
        continue;
      }

      const stampedHash = stringValue(parsed.prose_hash);
      if (!stampedHash) {
        verdicts.push(fail(
          receipt,
          "prose_receipt_hash_integrity.missing_prose_hash",
          `${receipt.file_path} is missing prose_hash.`
        ));
        continue;
      }

      const prose = readProseBytes(input, ctx, receipt, prosePath);
      if (!prose.content) {
        verdicts.push(fail(receipt, prose.code ?? "prose_receipt_hash_integrity.prose_unreadable", prose.message ?? `${prose.path} could not be read.`));
        continue;
      }

      const computedHash = sha256Hex(prose.content);
      if (stampedHash !== computedHash) {
        verdicts.push(fail(
          receipt,
          "prose_receipt_hash_integrity.hash_mismatch",
          `${receipt.file_path} prose_hash does not match ${prose.path}.`,
          { stamped_hash: stampedHash, computed_hash: computedHash, prose_path: prose.path },
          `Update prose_hash to ${computedHash} after confirming ${prose.path} is the intended prose file.`
        ));
      }
    }

    return verdicts;
  },
  skip_reason: "no prose receipt files in scope"
};

function receiptTargets(input: unknown, ctx: Context): ReceiptTarget[] {
  const explicitFiles = fileInputsFrom(input, ctx).filter((file) => receiptPathMatchesScope(file.path, ctx));
  if (explicitFiles.length > 0) {
    return explicitFiles.map((file) => targetFromPath(file.path, file.content));
  }

  if (ctx.run_mode === "incremental") {
    return [];
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [];
  }

  return receiptTargetsFromWorldRoot(worldRoot, ctx);
}

function receiptTargetsFromWorldRoot(worldRoot: string, ctx: Context): ReceiptTarget[] {
  const storiesRoot = path.join(worldRoot, "stories");
  if (!existsSync(storiesRoot)) {
    return [];
  }

  const targets: ReceiptTarget[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory() || (ctx.story_slug && storyEntry.name !== ctx.story_slug)) {
      continue;
    }
    const receiptDir = path.join(storiesRoot, storyEntry.name, "pages-prose-receipts");
    if (!existsSync(receiptDir)) {
      continue;
    }
    for (const receiptEntry of readdirSync(receiptDir, { withFileTypes: true })) {
      if (!receiptEntry.isFile() || !/^PG-(0|[1-9][0-9]*)\.yaml$/.test(receiptEntry.name)) {
        continue;
      }
      const relativePath = toPosixPath(path.join("stories", storyEntry.name, "pages-prose-receipts", receiptEntry.name));
      targets.push(targetFromPath(relativePath, readFileSync(path.join(receiptDir, receiptEntry.name), "utf8")));
    }
  }

  return targets.sort((left, right) => left.file_path.localeCompare(right.file_path, "en-US"));
}

function targetFromPath(filePath: string, content: string): ReceiptTarget {
  const normalized = toPosixPath(filePath);
  const match = RECEIPT_PATH_PATTERN.exec(normalized);
  const storySlug = match?.[1] ?? "";
  const pageId = match?.[2] ?? normalized;
  return {
    storySlug,
    pageId,
    node_id: storySlug ? `prose-receipt:${storySlug}:${pageId}` : normalized,
    file_path: normalized,
    content
  };
}

function readProseBytes(input: unknown, ctx: Context, receipt: ReceiptTarget, prosePath: string): ProseReadResult {
  const relativePath = resolveProsePath(receipt, prosePath);
  if (!relativePath) {
    return {
      path: prosePath,
      code: "prose_receipt_hash_integrity.path_escape",
      message: `${receipt.file_path} prose_path escapes the story bundle: ${prosePath}.`
    };
  }

  const explicit = fileInputsFrom(input, ctx).find((file) => toPosixPath(file.path) === relativePath);
  if (explicit) {
    return { path: relativePath, content: Buffer.from(explicit.content, "utf8") };
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return {
      path: relativePath,
      code: "prose_receipt_hash_integrity.prose_unreadable",
      message: `${relativePath} could not be read because no world root is available.`
    };
  }

  const absolutePath = path.join(worldRoot, ...relativePath.split("/"));
  try {
    return { path: relativePath, content: readFileSync(absolutePath) };
  } catch {
    return {
      path: relativePath,
      code: "prose_receipt_hash_integrity.prose_unreadable",
      message: `${relativePath} could not be read.`
    };
  }
}

function resolveProsePath(receipt: ReceiptTarget, prosePath: string): string | undefined {
  const normalized = toPosixPath(prosePath);
  if (path.posix.isAbsolute(normalized)) {
    return undefined;
  }

  const storyRoot = `stories/${receipt.storySlug}`;
  const resolved = path.posix.normalize(path.posix.join(storyRoot, normalized));
  return resolved === storyRoot || resolved.startsWith(`${storyRoot}/`) ? resolved : undefined;
}

function receiptPathMatchesScope(filePath: string, ctx: Context): boolean {
  const match = RECEIPT_PATH_PATTERN.exec(toPosixPath(filePath));
  return match !== null && (!ctx.story_slug || match[1] === ctx.story_slug);
}

function parseYamlReceipt(content: string): Record<string, unknown> | null {
  try {
    return asPlainRecord(yaml.load(content, { schema: yaml.JSON_SCHEMA }));
  } catch {
    return null;
  }
}

function sha256Hex(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function fail(
  receipt: ReceiptTarget,
  code: string,
  message: string,
  detail?: unknown,
  suggested_fix?: string
): Verdict {
  return {
    validator: VALIDATOR,
    severity: "fail",
    code,
    message,
    location: {
      file: receipt.file_path,
      node_id: receipt.node_id
    },
    ...(detail === undefined ? {} : { detail }),
    ...(suggested_fix === undefined ? {} : { suggested_fix })
  };
}
