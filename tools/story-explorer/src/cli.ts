#!/usr/bin/env node

import { resolveRepoRoot } from "./config/repo-root.js";
import { createServer } from "./server/http.js";

const DEFAULT_PORT = 5174;

function parsePort(args: string[]): number {
  const portFlagIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
  if (portFlagIndex === -1) {
    return DEFAULT_PORT;
  }

  const rawPort = args[portFlagIndex + 1];
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid port: ${rawPort ?? "<missing>"}`);
  }

  return port;
}

function parseRepoRoot(args: string[]): string {
  const repoRootFlagIndex = args.findIndex((arg) => arg === "--repo-root");
  if (repoRootFlagIndex === -1) {
    return resolveRepoRoot();
  }

  const repoRoot = args[repoRootFlagIndex + 1];
  if (repoRoot === undefined || repoRoot.trim() === "") {
    throw new Error("Invalid repo root: <missing>");
  }

  return repoRoot;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const port = parsePort(process.argv.slice(2));
  const repoRoot = parseRepoRoot(args);
  const server = await createServer({ port, repoRoot });

  const shutdown = async () => {
    await server.close();
  };
  process.once("SIGINT", () => {
    shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    shutdown().finally(() => process.exit(0));
  });

  await server.listen({ host: "127.0.0.1", port });
  console.log(`story-explorer v0.1 listening on http://127.0.0.1:${port}`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
