import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  emitAdditionalContext,
  readHookInput,
  type HookEnvelope
} from "./lib/hook-io";
import { logDecision } from "./lib/logging";
import { resolveRepoRoot } from "./lib/pathing";

interface PostToolUseInput extends HookEnvelope {
  hook_event_name: "PostToolUse";
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
}

interface FileWriteReceipt {
  file_path: string;
}

interface PatchReceiptShape {
  files_written?: FileWriteReceipt[];
}

interface ValidatorVerdict {
  validator: string;
  severity: "fail" | "warn" | "info";
  code: string;
  message: string;
  location: {
    file?: string;
    line_range?: [number, number];
    node_id?: string;
  };
}

interface ValidatorRun {
  verdicts: ValidatorVerdict[];
  summary?: {
    fail_count?: number;
  };
}

const STRUCTURAL_HOOK5_VALIDATORS = new Set([
  "record_schema_compliance",
  "id_uniqueness",
  "cross_file_reference",
  "touched_by_cf_completeness"
]);

function asReceipt(toolResponse: unknown): PatchReceiptShape | null {
  if (toolResponse === null || toolResponse === undefined) {
    return null;
  }

  if (typeof toolResponse === "object") {
    const record = toolResponse as Record<string, unknown>;

    if (record.isError === true) {
      return null;
    }

    if (
      typeof record.structuredContent === "object" &&
      record.structuredContent !== null
    ) {
      const structured = record.structuredContent as PatchReceiptShape;
      if (Array.isArray(structured.files_written)) {
        return structured;
      }
    }

    if (Array.isArray((record as PatchReceiptShape).files_written)) {
      return record as PatchReceiptShape;
    }

    if (Array.isArray(record.content)) {
      for (const block of record.content) {
        if (
          typeof block === "object" &&
          block !== null &&
          (block as { type?: unknown }).type === "text" &&
          typeof (block as { text?: unknown }).text === "string"
        ) {
          try {
            const parsed = JSON.parse((block as { text: string }).text) as PatchReceiptShape;
            if (Array.isArray(parsed.files_written)) {
              return parsed;
            }
          } catch {
            // continue
          }
        }
      }
    }
  }

  if (typeof toolResponse === "string") {
    try {
      const parsed = JSON.parse(toolResponse) as PatchReceiptShape;
      if (Array.isArray(parsed.files_written)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
}

interface FilesByWorld {
  [worldSlug: string]: string[];
}

function groupFilesByWorld(receipt: PatchReceiptShape): FilesByWorld {
  const files = receipt.files_written ?? [];
  const grouped: FilesByWorld = {};
  for (const entry of files) {
    if (typeof entry?.file_path !== "string") {
      continue;
    }
    const normalized = entry.file_path.split(path.sep).join("/");
    const match = normalized.match(/(?:^|\/)worlds\/(?<slug>[a-z0-9-]+)\/(?<rest>.+)$/i);
    const slug = match?.groups?.slug;
    const rest = match?.groups?.rest;
    if (slug === undefined || rest === undefined) {
      continue;
    }
    if (!Array.isArray(grouped[slug])) {
      grouped[slug] = [];
    }
    grouped[slug]!.push(rest);
  }
  return grouped;
}

function locateValidatorCli(repoRoot: string): string | null {
  const candidate = path.join(
    repoRoot,
    "tools",
    "validators",
    "dist",
    "src",
    "cli",
    "world-validate.js"
  );
  return existsSync(candidate) ? candidate : null;
}

function runValidator(
  cliPath: string,
  worldSlug: string,
  repoRoot: string
): ValidatorRun | null {
  const result = spawnSync(
    process.execPath,
    [cliPath, worldSlug, "--structural", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024
    }
  );

  // Exit code 1 means at least one fail verdict; 0 means all pass; 2/3 are input/index errors.
  if (result.status === null || (result.status !== 0 && result.status !== 1)) {
    return null;
  }

  try {
    return JSON.parse(result.stdout) as ValidatorRun;
  } catch {
    return null;
  }
}

function relevantVerdicts(
  run: ValidatorRun,
  touchedRelativePaths: string[]
): ValidatorVerdict[] {
  const touched = new Set(touchedRelativePaths);
  return run.verdicts.filter((verdict) => {
    if (verdict.severity !== "fail") {
      return false;
    }
    if (!STRUCTURAL_HOOK5_VALIDATORS.has(verdict.validator)) {
      return false;
    }
    const file = verdict.location.file;
    if (typeof file !== "string" || file.length === 0) {
      return false;
    }
    return touched.has(file);
  });
}

function logFailures(
  worldSlug: string,
  verdicts: ValidatorVerdict[],
  cwd?: string
): void {
  for (const verdict of verdicts) {
    logDecision(
      "error",
      "hook5-validate-after-patch",
      {
        world_slug: worldSlug,
        validator: verdict.validator,
        code: verdict.code,
        file: verdict.location.file ?? null,
        node_id: verdict.location.node_id ?? null,
        message: verdict.message
      },
      cwd
    );
  }
}

function buildSystemReminder(
  worldSlug: string,
  verdicts: ValidatorVerdict[]
): string {
  const lines: string[] = [
    "<system-reminder>",
    `Post-write validators detected structural drift on world '${worldSlug}'.`,
    "This should not normally happen — the pre-apply gate should have caught it. Please investigate before further writes."
  ];
  for (const verdict of verdicts) {
    lines.push(
      `  validator: ${verdict.validator}`,
      `  file: ${verdict.location.file ?? "(unknown)"}`,
      `  code: ${verdict.code}`,
      `  message: ${verdict.message}`
    );
  }
  lines.push("</system-reminder>");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const input = await readHookInput<PostToolUseInput>();
  if (input.tool_name !== "mcp__worldloom__submit_patch_plan") {
    return;
  }

  const receipt = asReceipt(input.tool_response);
  if (receipt === null || (receipt.files_written ?? []).length === 0) {
    return;
  }

  let repoRoot: string;
  try {
    repoRoot = resolveRepoRoot(input.cwd);
  } catch {
    return;
  }

  const cliPath = locateValidatorCli(repoRoot);
  if (cliPath === null) {
    logDecision(
      "info",
      "hook5-validate-after-patch",
      { decision: "skip", reason: "validator_cli_missing" },
      input.cwd
    );
    return;
  }

  const grouped = groupFilesByWorld(receipt);
  const reminders: string[] = [];

  for (const [worldSlug, touchedRelativePaths] of Object.entries(grouped)) {
    const run = runValidator(cliPath, worldSlug, repoRoot);
    if (run === null) {
      logDecision(
        "info",
        "hook5-validate-after-patch",
        { decision: "skip", reason: "validator_run_failed", world_slug: worldSlug },
        input.cwd
      );
      continue;
    }

    const failures = relevantVerdicts(run, touchedRelativePaths);
    if (failures.length === 0) {
      logDecision(
        "info",
        "hook5-validate-after-patch",
        {
          decision: "pass",
          world_slug: worldSlug,
          touched_files: touchedRelativePaths
        },
        input.cwd
      );
      continue;
    }

    logFailures(worldSlug, failures, input.cwd);
    reminders.push(buildSystemReminder(worldSlug, failures));
  }

  if (reminders.length > 0) {
    emitAdditionalContext("PostToolUse", reminders.join("\n"));
  }
}

main().catch((error) => {
  logDecision("error", "hook5-validate-after-patch", {
    error: error instanceof Error ? error.message : String(error)
  });
  // Hook 5 is post-hoc; don't break Claude with non-zero exit.
});
