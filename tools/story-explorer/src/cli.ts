#!/usr/bin/env node

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

try {
  const port = parsePort(process.argv.slice(2));
  console.log(`story-explorer v0.1 - server scaffold not yet wired (lands in ticket 007); default port ${port}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
