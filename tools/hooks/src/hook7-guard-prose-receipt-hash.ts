import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  emitPermissionDecision,
  readHookInput,
  type PreToolUseReadInput
} from "./lib/hook-io.js";
import { logDecision } from "./lib/logging.js";

interface PreToolUseEditWriteInput extends PreToolUseReadInput {
  tool_input?: {
    file_path?: string;
    content?: string;
    old_string?: string;
    new_string?: string;
  };
}

interface ReceiptPathMatch {
  storyRoot: string;
  pageId: string;
}

interface ReceiptFields {
  prosePath: string;
  proseHash: string;
}

type PendingBodyResult = { ok: true; body: string } | { ok: false; reason: string };
type ReceiptParseResult = { ok: true; fields: ReceiptFields } | { ok: false; reason: string };
type ReceiptCheckResult =
  | {
      ok: true;
      receiptPath: string;
      prosePath: string;
      proseHash: string;
    }
  | {
      ok: false;
      reason: string;
      receiptPath: string;
      prosePath?: string;
      stampedHash?: string;
      computedHash?: string;
    };

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function absolutePath(filePath: string, cwd: string | undefined): string {
  if (path.isAbsolute(filePath)) {
    return path.resolve(filePath);
  }
  return path.resolve(cwd ?? process.cwd(), filePath);
}

function receiptPathMatch(filePath: string): ReceiptPathMatch | null {
  const normalized = normalizePath(filePath);
  const match = normalized.match(
    /^(?<prefix>.*?worlds\/[a-z0-9-]+\/stories\/[^/]+)\/pages-prose-receipts\/(?<pageId>PG-\d+)\.yaml$/i
  );
  if (match?.groups?.prefix === undefined || match.groups.pageId === undefined) {
    return null;
  }
  return {
    storyRoot: match.groups.prefix,
    pageId: match.groups.pageId
  };
}

function pendingBody(input: PreToolUseEditWriteInput, filePath: string): PendingBodyResult {
  const toolInput = input.tool_input;
  if (input.tool_name === "Write") {
    if (typeof toolInput?.content !== "string") {
      return { ok: false, reason: "Write payload did not include content bytes." };
    }
    return { ok: true, body: toolInput.content };
  }

  if (input.tool_name === "Edit") {
    if (typeof toolInput?.old_string === "string" && typeof toolInput.new_string === "string") {
      let current: string;
      try {
        current = readFileSync(filePath, "utf8");
      } catch (err) {
        const cause = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: `Unable to read current file for Edit simulation: ${cause}` };
      }

      const firstIndex = current.indexOf(toolInput.old_string);
      if (firstIndex === -1) {
        return { ok: false, reason: "Edit old_string was not found in the current file." };
      }
      const secondIndex = current.indexOf(toolInput.old_string, firstIndex + toolInput.old_string.length);
      if (secondIndex !== -1) {
        return { ok: false, reason: "Edit old_string matched multiple locations." };
      }

      return {
        ok: true,
        body:
          current.slice(0, firstIndex) +
          toolInput.new_string +
          current.slice(firstIndex + toolInput.old_string.length)
      };
    }

    return { ok: false, reason: "Edit payload did not include old_string/new_string." };
  }

  return { ok: false, reason: `Unsupported tool ${input.tool_name ?? "<unknown>"}.` };
}

function scalarValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  const commentless = trimmed.replace(/\s+#.*$/, "").trim();
  const quoted = commentless.match(/^(['"])(.*)\1$/);
  return quoted?.[2] ?? commentless;
}

function parseReceiptFields(raw: string): ReceiptParseResult {
  const fields: Partial<ReceiptFields> = {};
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    if (/^\s*$/.test(line) || /^\s*#/.test(line) || /^\s+/.test(line)) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (match === null) {
      return { ok: false, reason: `Receipt YAML parse failed near: ${line}` };
    }

    const key = match[1];
    const value = scalarValue(match[2] ?? "");
    if (key === "prose_path") {
      fields.prosePath = value;
    } else if (key === "prose_hash") {
      fields.proseHash = value.toLowerCase();
    }
  }

  if (fields.prosePath === undefined || fields.prosePath.length === 0) {
    return { ok: false, reason: "Receipt missing required prose_path." };
  }
  if (fields.proseHash === undefined || fields.proseHash.length === 0) {
    return { ok: false, reason: "Receipt missing required prose_hash." };
  }

  return {
    ok: true,
    fields: {
      prosePath: fields.prosePath,
      proseHash: fields.proseHash
    }
  };
}

function resolveProsePath(storyRoot: string, prosePath: string): { ok: true; path: string } | { ok: false; reason: string } {
  if (path.isAbsolute(prosePath)) {
    return { ok: false, reason: `prose_path must be relative to the story bundle: ${prosePath}` };
  }

  const resolved = path.resolve(storyRoot, prosePath);
  const relative = path.relative(storyRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { ok: false, reason: `prose_path escapes the story bundle: ${prosePath}` };
  }
  return { ok: true, path: resolved };
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function checkReceiptHash(
  receiptPath: string,
  match: ReceiptPathMatch,
  body: string
): ReceiptCheckResult {
  const parsed = parseReceiptFields(body);
  if (!parsed.ok) {
    return { ok: false, receiptPath, reason: parsed.reason };
  }

  const prosePath = resolveProsePath(match.storyRoot, parsed.fields.prosePath);
  if (!prosePath.ok) {
    return {
      ok: false,
      receiptPath,
      reason: prosePath.reason,
      stampedHash: parsed.fields.proseHash
    };
  }

  let proseBytes: Buffer;
  try {
    proseBytes = readFileSync(prosePath.path);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      receiptPath,
      prosePath: prosePath.path,
      stampedHash: parsed.fields.proseHash,
      reason: `Unable to read prose file at prose_path: ${cause}`
    };
  }

  const computedHash = sha256Hex(proseBytes);
  if (computedHash !== parsed.fields.proseHash) {
    return {
      ok: false,
      receiptPath,
      prosePath: prosePath.path,
      stampedHash: parsed.fields.proseHash,
      computedHash,
      reason: `prose_hash mismatch for ${receiptPath}: stamped=${parsed.fields.proseHash} computed=${computedHash} prose_path=${prosePath.path}`
    };
  }

  return {
    ok: true,
    receiptPath,
    prosePath: prosePath.path,
    proseHash: computedHash
  };
}

function denyReason(result: Extract<ReceiptCheckResult, { ok: false }>): string {
  return [
    "Direct Edit/Write to a prose receipt was blocked.",
    result.reason,
    "The receipt's prose_hash must equal the sha256 of the file at prose_path before the write can land."
  ].join("\n");
}

async function main(): Promise<void> {
  const input = await readHookInput<PreToolUseEditWriteInput>();
  if (input.tool_name !== "Edit" && input.tool_name !== "Write") {
    return;
  }

  const filePathInput = input.tool_input?.file_path;
  if (typeof filePathInput !== "string" || filePathInput.length === 0) {
    return;
  }

  const receiptPath = absolutePath(filePathInput, input.cwd);
  const match = receiptPathMatch(receiptPath);
  if (match === null) {
    return;
  }

  const body = pendingBody(input, receiptPath);
  const result = body.ok
    ? checkReceiptHash(receiptPath, match, body.body)
    : {
        ok: false as const,
        receiptPath,
        reason: body.reason
      };

  if (result.ok) {
    emitPermissionDecision("allow", `prose_hash matches sha256(${result.prosePath})`);
    logDecision(
      "info",
      "hook7-guard-prose-receipt-hash",
      {
        decision: "allow",
        tool_name: input.tool_name,
        file_path: receiptPath,
        prose_path: result.prosePath,
        prose_hash: result.proseHash
      },
      input.cwd
    );
    return;
  }

  emitPermissionDecision("deny", denyReason(result));
  logDecision(
    "info",
    "hook7-guard-prose-receipt-hash",
    {
      decision: "deny",
      tool_name: input.tool_name,
      file_path: receiptPath,
      prose_path: result.prosePath,
      stamped_hash: result.stampedHash,
      computed_hash: result.computedHash,
      reason: result.reason
    },
    input.cwd
  );
}

main().catch((error) => {
  logDecision("error", "hook7-guard-prose-receipt-hash", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
