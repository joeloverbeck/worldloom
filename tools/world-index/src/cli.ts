#!/usr/bin/env node

import { readFileSync, writeSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { build } from "./commands/build";
import { inspect } from "./commands/inspect";
import { stats } from "./commands/stats";
import { sync } from "./commands/sync";
import { verify } from "./commands/verify";
import { SchemaVersionMismatchError } from "./index/open";

function loadPackageVersion(): string {
  const packageJsonPath = path.resolve(__dirname, "..", "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version?: unknown;
  };

  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error("package.json version is missing or invalid");
  }

  return packageJson.version;
}

function renderHelp(): string {
  return [
    "Usage: world-index <command> [options]",
    "",
    "Commands:",
    "  build <world-slug>    full rebuild",
    "  sync <world-slug>     incremental sync",
    "  inspect <node-id>     dump one node as JSON",
    "  stats <world-slug>    print node counts and file freshness",
    "  verify <world-slug>   re-parse disk-backed indexed files and flag content-hash drift",
    "",
    "Options:",
    "  --help     Show this help message",
    "  --version  Print the package version",
    "",
    "Exit codes:",
    "  0  success",
    "  1  generic failure",
    "  2  invalid world slug",
    "  3  missing mandatory file",
    "  4  parse failure threshold exceeded"
  ].join("\n");
}

function printUsage(exitCode: number): number {
  writeFd(exitCode === 0 ? 1 : 2, `${renderHelp()}\n`);
  return exitCode;
}

function writeFd(fd: 1 | 2, message: string): void {
  writeSync(fd, message);
}

export function cliErrorHandler(error: unknown): number {
  if (error instanceof SchemaVersionMismatchError) {
    writeFd(2, `${error.message}\n`);
    return 1;
  }

  if (error instanceof Error) {
    writeFd(2, `${error.message}\n`);
    return 1;
  }

  writeFd(2, `${String(error)}\n`);
  return 1;
}

function main(argv: string[]): number {
  const parsed = parseArgs({
    args: argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" }
    },
    allowPositionals: true,
    strict: false
  });

  if (parsed.values.help) {
    return printUsage(0);
  }

  if (parsed.values.version) {
    writeFd(1, `${loadPackageVersion()}\n`);
    return 0;
  }

  const [command, argument] = parsed.positionals;
  if (!command) {
    return printUsage(1);
  }

  const worldRoot = process.cwd();

  try {
    switch (command) {
      case "build":
        return typeof argument === "string" ? build(worldRoot, argument) : printUsage(1);
      case "sync":
        return typeof argument === "string" ? sync(worldRoot, argument) : printUsage(1);
      case "inspect":
        return typeof argument === "string" ? inspect(worldRoot, argument) : printUsage(1);
      case "stats":
        return typeof argument === "string" ? stats(worldRoot, argument) : printUsage(1);
      case "verify":
        return typeof argument === "string" ? verify(worldRoot, argument) : printUsage(1);
      default:
        writeFd(2, `Unknown command '${command}'.\n`);
        return printUsage(1);
    }
  } catch (error) {
    return cliErrorHandler(error);
  }
}

process.exitCode = main(process.argv);
