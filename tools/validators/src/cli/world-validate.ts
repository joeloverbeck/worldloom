#!/usr/bin/env node
import { parseArgs } from "node:util";

import Database from "better-sqlite3";

import { runValidators } from "../framework/run.js";
import { ruleValidators, structuralValidators } from "../public/registry.js";
import type { Context } from "../framework/types.js";
import {
  buildReadSurface,
  databasePathForWorldDirectory,
  existingDirectory,
  existingFile,
  packageVersion,
  persistVerdicts,
  printHelp,
  printHuman,
  resolveScope,
  selectValidators,
  validateOptions,
  worldDirectoryFor,
  type CliValues
} from "./_helpers.js";

async function main(): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        rules: { type: "string" },
        structural: { type: "boolean" },
        json: { type: "boolean" },
        file: { type: "string" },
        since: { type: "string" },
        help: { type: "boolean" },
        version: { type: "boolean" }
      },
      allowPositionals: true,
      strict: true
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  const values = parsed.values as CliValues;

  if (values.help) {
    printHelp();
    return 0;
  }

  if (values.version) {
    console.log(packageVersion());
    return 0;
  }

  const optionError = validateOptions(values);
  if (optionError) {
    console.error(optionError);
    return 2;
  }

  const worldSlug = parsed.positionals[0];
  if (!worldSlug) {
    console.error("missing world slug");
    return 2;
  }

  const repoRoot = process.cwd();
  const worldDirectory = worldDirectoryFor(repoRoot, worldSlug);
  if (!existingDirectory(worldDirectory)) {
    console.error(`world '${worldSlug}' not found at ${worldDirectory}`);
    return 2;
  }

  const indexPath = databasePathForWorldDirectory(worldDirectory);
  if (!existingFile(indexPath)) {
    console.error(`index missing at ${indexPath}; run 'world-index build ${worldSlug}' first`);
    return 3;
  }

  const scope = resolveScope(worldDirectory, worldSlug, values);
  const db = openExistingDatabase(indexPath, worldSlug);

  try {
    const ctx: Context = {
      run_mode: "full-world",
      world_slug: worldSlug,
      index: buildReadSurface(db, worldSlug),
      touched_files: scope.touchedFiles
    };
    const selected = selectValidators(structuralValidators, ruleValidators, values, ctx);
    const run = await runValidators(
      selected,
      {
        world_slug: worldSlug,
        world_root: worldDirectory,
        files: scope.explicitFiles
      },
      ctx
    );

    persistVerdicts(db, worldSlug, run.verdicts, scope.touchedFiles, run.started_at);

    if (values.json) {
      process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
    } else {
      printHuman(run);
    }

    return run.summary.fail_count > 0 ? 1 : 0;
  } finally {
    db.close();
  }
}

function openExistingDatabase(indexPath: string, worldSlug: string): Database.Database {
  try {
    return new Database(indexPath);
  } catch {
    console.error(`index missing at ${indexPath}; run 'world-index build ${worldSlug}' first`);
    process.exit(3);
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
