import path from "node:path";

import type { FastifyInstance } from "fastify";

import {
  readWorldSource,
  type WorldSourceItem,
} from "../../read/world-source.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface WorldSourceRouteOptions {
  repoRoot: string;
}

type WorldSourceSummary = Omit<WorldSourceItem, "raw_text">;

export async function registerWorldSourceReadRoutes(
  server: FastifyInstance,
  options: WorldSourceRouteOptions,
): Promise<void> {
  server.get<{ Params: { worldSlug: string } }>(
    "/api/worlds/:worldSlug/source",
    async (request, reply) => {
      const slugError = validateWorldSlug(options.repoRoot, request.params.worldSlug);
      if (slugError) return reply.code(400).send(slugError);

      const source = readWorldSource(options.repoRoot, request.params.worldSlug);
      if (!source.ok) return mapReadErrorToHttpReply(reply, source.error);

      return { items: source.value.map(toSummary) };
    },
  );

  server.get<{
    Params: { worldSlug: string };
    Querystring: { path?: string };
  }>("/api/worlds/:worldSlug/source/item", async (request, reply) => {
    const slugError = validateWorldSlug(options.repoRoot, request.params.worldSlug);
    if (slugError) return reply.code(400).send(slugError);

    const itemPath = request.query.path;
    if (!itemPath) return reply.code(400).send({ error: "bad_request", reason: "missing_path" });
    const pathError = validateItemPath(itemPath);
    if (pathError) return reply.code(400).send(pathError);
    const containedItemPath = itemPath;

    const source = readWorldSource(options.repoRoot, request.params.worldSlug);
    if (!source.ok) return mapReadErrorToHttpReply(reply, source.error);

    const item = source.value.find((candidate) => candidate.path === containedItemPath);
    if (!item) {
      return mapReadErrorToHttpReply(reply, {
        code: "file_not_found",
        path: containedItemPath,
        repair_hint: "Choose a source item path returned by the world-source list route.",
      });
    }

    return { item };
  });
}

function validateWorldSlug(
  repoRoot: string,
  worldSlug: string,
): { error: "bad_request"; reason: string } | null {
  if (!SLUG_PATTERN.test(worldSlug)) {
    return { error: "bad_request", reason: "invalid_world_slug" };
  }

  const resolved = path.resolve(repoRoot, "worlds", worldSlug);
  const worldsRoot = path.resolve(repoRoot, "worlds");
  if (!isPathInside(resolved, worldsRoot)) {
    return { error: "bad_request", reason: "invalid_world_slug" };
  }

  return null;
}

function validateItemPath(
  itemPath: string | undefined,
): { error: "bad_request"; reason: string } | null {
  if (!itemPath) {
    return { error: "bad_request", reason: "missing_path" };
  }
  if (path.isAbsolute(itemPath)) {
    return { error: "bad_request", reason: "invalid_item_path" };
  }

  const slashPath = itemPath.replaceAll("\\", "/");
  if (slashPath.split("/").includes("..")) {
    return { error: "bad_request", reason: "invalid_item_path" };
  }

  const normalized = path.posix.normalize(slashPath);
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return { error: "bad_request", reason: "invalid_item_path" };
  }

  return null;
}

function toSummary(item: WorldSourceItem): WorldSourceSummary {
  const { raw_text: _rawText, ...summary } = item;
  return summary;
}

function isPathInside(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
