#!/usr/bin/env node

import { readFileSync, writeSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  formatWorldRootFailure,
  formatWorldRootTrace,
  resolveWorldRoot
} from "./cli-world-root.js";
import { build } from "./commands/build.js";
import { init } from "./commands/init.js";
import { inspect } from "./commands/inspect.js";
import { render } from "./commands/render.js";
import { stats } from "./commands/stats.js";
import { sync } from "./commands/sync.js";
import { verify } from "./commands/verify.js";
import { SchemaVersionMismatchError } from "./index/open.js";

function loadPackageVersion(): string {
  const packageJsonPath = path.resolve(import.meta.dirname, "..", "..", "package.json");
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
    "  init <world-slug>     initialize an empty world index",
    "  build <world-slug>    full rebuild",
    "  sync <world-slug>     incremental sync; use --quiet to suppress per-record skip warnings",
    "  inspect <node-id>     dump one node as JSON",
    "  render <world-slug>   render indexed records; use --story <story-slug> for story bundles",
    "  stats <world-slug>    print node counts and file freshness",
    "  verify <world-slug>   re-parse disk-backed indexed files and flag content-hash drift",
    "",
    "Options:",
    "  --help     Show this help message",
    "  --version  Print the package version",
    "  --world-root <path>",
    "             Use an explicit worldloom project root; otherwise WORLDLOOM_ROOT",
    "             then marker auto-discovery from cwd are used",
    "",
    "Exit codes:",
    "  0  success",
    "  1  generic failure",
    "  2  invalid world slug or world-root resolution failure",
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
      version: { type: "boolean", short: "v" },
      "world-root": { type: "string" },
      story: { type: "string" },
      quiet: { type: "boolean" }
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

  const commandNeedsWorldRoot = new Set(["build", "init", "sync", "inspect", "render", "stats", "verify"]);
  if (!commandNeedsWorldRoot.has(command)) {
    writeFd(2, `Unknown command '${command}'.\n`);
    return printUsage(1);
  }

  if (typeof argument !== "string") {
    return printUsage(1);
  }

  const resolution = resolveWorldRoot({
    flag: typeof parsed.values["world-root"] === "string" ? parsed.values["world-root"] : undefined,
    envVar: process.env.WORLDLOOM_ROOT,
    cwd: process.cwd()
  });
  if (!resolution.ok) {
    writeFd(2, `${formatWorldRootFailure(resolution)}\n`);
    return 2;
  }

  writeFd(2, `${formatWorldRootTrace(resolution)}\n`);
  const worldRoot = resolution.worldRoot;

  try {
    switch (command) {
      case "build":
        return build(worldRoot, argument);
      case "init":
        return init(worldRoot, argument);
      case "sync":
        return sync(worldRoot, argument, { quiet: parsed.values.quiet === true });
      case "inspect":
        return inspect(worldRoot, argument);
      case "render":
        return typeof parsed.values.story === "string"
          ? render(worldRoot, argument, {
              storySlug: parsed.values.story
            })
          : render(worldRoot, argument, {});
      case "stats":
        return stats(worldRoot, argument);
      case "verify":
        return verify(worldRoot, argument);
    }

    return printUsage(1);
  } catch (error) {
    return cliErrorHandler(error);
  }
}

async function flushStream(stream: NodeJS.WriteStream): Promise<void> {
  await new Promise<void>((resolve) => {
    stream.write("", () => resolve());
  });
}

async function runCli(argv: string[]): Promise<number> {
  const exitCode = main(argv);
  await flushStream(process.stdout);
  await flushStream(process.stderr);
  return exitCode;
}

runCli(process.argv).then(
  (exitCode) => {
    process.exitCode = exitCode;
  },
  (error: unknown) => {
    process.exitCode = cliErrorHandler(error);
  }
);
