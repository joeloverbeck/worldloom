import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import yaml from "js-yaml";

import type {
  Context,
  IndexedRecord,
  Validator,
  ValidatorRun,
  Verdict,
  WorldIndexReadSurface
} from "../framework/types.js";
import { frontmatterFor } from "../structural/yaml-parse-integrity.js";

export interface CliValues {
  rules?: string;
  structural?: boolean;
  json?: boolean;
  file?: string;
  since?: string;
  help?: boolean;
  version?: boolean;
}

export interface ResolvedScope {
  touchedFiles: string[];
  explicitFiles: Array<{ path: string; content: string }>;
}

const RULE_FILTER_PATTERN = /^([124567])(?:,([124567]))*$/;

export function packageVersion(): string {
  const packageJsonPath = path.resolve(__dirname, "../../../package.json");
  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
  return typeof parsed.version === "string" ? parsed.version : "unknown";
}

export function printHelp(): void {
  process.stdout.write(`world-validate <world-slug> [options]

Run the SPEC-04 validator framework against a world's atomic-source tree.

Options:
  --rules=<list>        Comma-separated rule numbers (1,2,4,5,6,7). Mutually exclusive with --structural.
  --structural          Run structural validators only. Mutually exclusive with --rules.
  --json                Emit machine-readable JSON output.
  --file <path>         Narrow scope to a single file within worlds/<slug>/.
  --since <commit>      Narrow scope to files changed since <commit> in the world's git repo.
  --help                Show this help text.
  --version             Print the validator framework version.

Exit codes:
  0  All pass.
  1  One or more validators emitted a fail verdict.
  2  Invalid input.
  3  Index missing at worlds/<slug>/_index/world.db.
`);
}

export function validateOptions(values: CliValues): string | null {
  if (values.rules && values.structural) {
    return "--rules and --structural are mutually exclusive";
  }
  if (values.file && values.since) {
    return "--file and --since are mutually exclusive";
  }
  if (values.rules && !RULE_FILTER_PATTERN.test(values.rules)) {
    return "--rules must be a comma-separated list of mechanized rule numbers 1,2,4,5,6,7";
  }
  return null;
}

export function worldDirectoryFor(repoRoot: string, worldSlug: string): string {
  return path.resolve(repoRoot, "worlds", worldSlug);
}

export function databasePathForWorldDirectory(worldDirectory: string): string {
  return path.join(worldDirectory, "_index", "world.db");
}

export function resolveScope(worldDirectory: string, worldSlug: string, values: CliValues): ResolvedScope {
  if (values.file) {
    const relativePath = normalizeWorldRelativePath(worldDirectory, values.file);
    const absolutePath = path.join(worldDirectory, relativePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`file '${values.file}' not found in world '${worldSlug}'`);
    }
    return {
      touchedFiles: [relativePath],
      explicitFiles: [{ path: relativePath, content: readFileSync(absolutePath, "utf8") }]
    };
  }

  if (values.since) {
    const changed = changedWorldFilesSince(worldDirectory, values.since);
    return {
      touchedFiles: changed,
      explicitFiles: changed.map((relativePath) => ({
        path: relativePath,
        content: readFileSync(path.join(worldDirectory, relativePath), "utf8")
      }))
    };
  }

  return { touchedFiles: [], explicitFiles: [] };
}

export function selectValidators(
  structuralValidators: readonly Validator[],
  ruleValidators: readonly Validator[],
  values: CliValues,
  contextForApplicability?: Context
): Validator[] {
  let selected: readonly Validator[];

  if (values.structural) {
    selected = structuralValidators;
  } else if (values.rules) {
    const prefixes = new Set(values.rules.split(",").map((part) => `rule${part}_`));
    selected = ruleValidators.filter((validator) =>
      [...prefixes].some((prefix) => validator.name.startsWith(prefix))
    );
  } else {
    selected = [...structuralValidators, ...ruleValidators];
  }

  if (!contextForApplicability || contextForApplicability.touched_files.length === 0) {
    return [...selected];
  }

  const incrementalContext: Context = {
    ...contextForApplicability,
    run_mode: "incremental"
  };
  return selected.filter((validator) => validator.applies_to(incrementalContext));
}

export function buildReadSurface(db: Database.Database, worldSlug: string): WorldIndexReadSurface {
  return {
    query: async ({ record_type, world_slug }) => {
      if (world_slug !== worldSlug) {
        return [];
      }

      const rows = (record_type
        ? db
            .prepare(
              `SELECT node_id, node_type, world_slug, file_path, body FROM nodes WHERE world_slug = ? AND node_type = ?`
            )
            .all(worldSlug, record_type)
        : db
            .prepare(`SELECT node_id, node_type, world_slug, file_path, body FROM nodes WHERE world_slug = ?`)
            .all(worldSlug)) as NodeRow[];

      return rows.map(rowToIndexedRecord);
    }
  };
}

export function persistVerdicts(
  db: Database.Database,
  worldSlug: string,
  verdicts: readonly Verdict[],
  touchedFiles: readonly string[],
  createdAt: string
): void {
  const insert = db.prepare(`
    INSERT INTO validation_results (
      world_slug,
      validator_name,
      severity,
      code,
      message,
      node_id,
      file_path,
      line_range_start,
      line_range_end,
      created_at
    ) VALUES (
      @world_slug,
      @validator_name,
      @severity,
      @code,
      @message,
      @node_id,
      @file_path,
      @line_range_start,
      @line_range_end,
      @created_at
    )
  `);

  db.transaction(() => {
    if (touchedFiles.length === 0) {
      db.prepare("DELETE FROM validation_results WHERE world_slug = ?").run(worldSlug);
    } else {
      const deleteOne = db.prepare(
        "DELETE FROM validation_results WHERE world_slug = ? AND file_path = ?"
      );
      for (const filePath of touchedFiles) {
        deleteOne.run(worldSlug, filePath);
      }
    }

    for (const verdict of verdicts) {
      insert.run({
        world_slug: worldSlug,
        validator_name: verdict.validator,
        severity: verdict.severity,
        code: verdict.code,
        message: verdict.message,
        node_id: verdict.location.node_id ?? null,
        file_path: verdict.location.file || null,
        line_range_start: verdict.location.line_range?.[0] ?? null,
        line_range_end: verdict.location.line_range?.[1] ?? null,
        created_at: createdAt
      });
    }
  })();
}

export function printHuman(run: ValidatorRun): void {
  process.stdout.write(
    [
      `world-validate ${run.world_slug}`,
      `validators: ${run.summary.validators_run.length} run, ${run.summary.validators_skipped.length} skipped`,
      `verdicts: ${run.summary.fail_count} fail, ${run.summary.warn_count} warn, ${run.summary.info_count} info`
    ].join("\n") + "\n"
  );

  for (const verdict of run.verdicts) {
    const location = formatLocation(verdict);
    process.stdout.write(`${verdict.severity} [${verdict.code}] ${verdict.message}${location}\n`);
  }
}

interface NodeRow {
  node_id: string;
  node_type: string;
  world_slug: string;
  file_path: string;
  body: string;
}

function rowToIndexedRecord(row: NodeRow): IndexedRecord {
  return {
    node_id: row.node_id,
    node_type: row.node_type,
    world_slug: row.world_slug,
    file_path: normalizePosix(row.file_path),
    parsed: parsedBodyFor(row)
  };
}

function parsedBodyFor(row: NodeRow): Record<string, unknown> {
  if (row.node_type === "character_record" || row.node_type === "diegetic_artifact_record" || row.node_type === "adjudication_record") {
    const frontmatter = frontmatterFor(row.body);
    return parseYamlRecord(frontmatter ?? "");
  }
  return parseYamlRecord(row.body);
}

function parseYamlRecord(source: string): Record<string, unknown> {
  try {
    const parsed = yaml.load(source, { schema: yaml.JSON_SCHEMA });
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function changedWorldFilesSince(worldDirectory: string, since: string): string[] {
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: worldDirectory,
    encoding: "utf8"
  }).trim();
  const relativeWorldDirectory = normalizePosix(path.relative(repoRoot, worldDirectory));
  const stdout = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      `${since}..HEAD`,
      "--",
      `${relativeWorldDirectory}/_source`,
      `${relativeWorldDirectory}/adjudications`
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  return [...new Set(stdout.split(/\r?\n/).filter(Boolean))]
    .map((filePath) => normalizePosix(path.relative(relativeWorldDirectory, filePath)))
    .filter((filePath) => !filePath.startsWith(".."))
    .sort((left, right) => left.localeCompare(right, "en-US"));
}

function normalizeWorldRelativePath(worldDirectory: string, filePath: string): string {
  const normalizedInput = normalizePosix(filePath);
  const worldName = path.basename(worldDirectory);
  const worldsPrefix = `worlds/${worldName}/`;
  if (normalizedInput.startsWith(worldsPrefix)) {
    return normalizedInput.slice(worldsPrefix.length);
  }

  const absolute = path.resolve(filePath);
  if (absolute.startsWith(`${worldDirectory}${path.sep}`)) {
    return normalizePosix(path.relative(worldDirectory, absolute));
  }

  return normalizedInput;
}

function normalizePosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function formatLocation(verdict: Verdict): string {
  if (!verdict.location.file) {
    return "";
  }
  const lineRange = verdict.location.line_range
    ? `:${verdict.location.line_range[0]}-${verdict.location.line_range[1]}`
    : "";
  return ` (${verdict.location.file}${lineRange})`;
}

export function existingDirectory(filePath: string): boolean {
  const stat = statSync(filePath, { throwIfNoEntry: false });
  return stat?.isDirectory() ?? false;
}

export function existingFile(filePath: string): boolean {
  const stat = statSync(filePath, { throwIfNoEntry: false });
  return stat?.isFile() ?? false;
}
