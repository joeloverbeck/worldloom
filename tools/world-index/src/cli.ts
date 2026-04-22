#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

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
    "  build <world-slug>    not yet implemented",
    "  sync <world-slug>     not yet implemented",
    "  inspect <node-id>     not yet implemented",
    "  stats <world-slug>    not yet implemented",
    "  verify <world-slug>   not yet implemented",
    "",
    "Options:",
    "  --help     Show this help message",
    "  --version  Print the package version"
  ].join("\n");
}

function main(argv: string[]): number {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(renderHelp());
    return 0;
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log(loadPackageVersion());
    return 0;
  }

  console.error("command not yet implemented; see SPEC-01-002..008");
  return 1;
}

process.exitCode = main(process.argv);
