import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ContextPacket } from "./shared";

const DEFAULT_TOOL_RESULTS_DIR_NAME = "worldloom-mcp-tool-results";

export function resolvePersistedPacketRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  if (configured !== undefined && configured.trim().length > 0) {
    return path.resolve(configured);
  }

  return path.join(os.tmpdir(), DEFAULT_TOOL_RESULTS_DIR_NAME);
}

export function isPersistedPacketPathAllowed(
  persistedPath: string,
  root = resolvePersistedPacketRoot()
): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(persistedPath);
  return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${path.sep}`);
}

export function persistContextPacket(packet: ContextPacket): string {
  return persistToolResultJson(
    `${packet.task_header.world_slug}-${packet.task_header.task_type}`,
    packet
  );
}

export function persistToolResultJson(nameParts: string, value: unknown): string {
  const root = resolvePersistedPacketRoot();
  mkdirSync(root, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeNameParts = nameParts.replace(/[^A-Za-z0-9_-]+/g, "-");
  const filename = `${timestamp}-${safeNameParts}-${randomUUID()}.json`;
  const persistedPath = path.join(root, filename);
  writeFileSync(persistedPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return persistedPath;
}

export function readPersistedPacketJson(persistedPath: string): unknown {
  if (!isPersistedPacketPathAllowed(persistedPath)) {
    throw new Error(
      `persisted_path must be under ${resolvePersistedPacketRoot()}`
    );
  }

  return JSON.parse(readFileSync(persistedPath, "utf8"));
}
