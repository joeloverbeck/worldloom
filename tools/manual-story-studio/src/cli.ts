#!/usr/bin/env node

import path from "node:path";

import { createServer } from "./server/http.js";

const DEFAULT_PORT = 5175;

interface Args {
  port: number;
  repoRoot: string;
}

function parseArgs(argv: string[]): Args {
  let port = DEFAULT_PORT;
  let repoRoot = process.cwd();

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--port" || flag === "-p") {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
        throw new Error(`Invalid port: ${raw ?? "<missing>"}`);
      }
      port = parsed;
    } else if (flag === "--repo-root") {
      const raw = argv[++i];
      if (raw === undefined || raw.trim() === "") {
        throw new Error("Invalid repo root: <missing>");
      }
      repoRoot = path.resolve(raw);
    }
  }

  return { port, repoRoot };
}

async function main(): Promise<void> {
  const { port, repoRoot } = parseArgs(process.argv.slice(2));
  const server = await createServer({ repoRoot, port });

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

  console.error("Manual Story Studio");
  console.error("Write root: worlds/<world>/manual-stories/<story>/");
  console.error("World canon: read-only");
  console.error("Normal story bundles: read-only");
  console.error("External LLM: not connected");
  console.error(`Listening on http://127.0.0.1:${port}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Manual Story Studio failed to start:", message);
  process.exitCode = 1;
});
