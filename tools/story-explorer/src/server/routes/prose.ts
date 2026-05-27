import { readFile } from "node:fs/promises";
import path from "node:path";

import type { FastifyInstance } from "fastify";

import { readProse } from "../../read/prose-direct.js";
import { parseRecordBody, storyDirectory } from "../../read/record-io.js";
import { invalidRouteParam, isValidPageId, isValidRouteSlug } from "./params.js";

export interface ProseRouteOptions {
  repoRoot: string;
}

async function readOptionalBody(sourcePath: string): Promise<{ body: string; sourcePath: string } | null> {
  try {
    return { body: await readFile(sourcePath, "utf8"), sourcePath };
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function registerProseRoutes(
  server: FastifyInstance,
  options: ProseRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; storySlug: string; pageId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/prose/:pageId",
    async (request, reply) => {
      const routeError = validateStoryPageParams(request.params);
      if (routeError !== null) {
        return reply.code(400).send(routeError);
      }
      return readProse(request.params.slug, request.params.storySlug, request.params.pageId, options.repoRoot);
    },
  );

  server.get<{ Params: { slug: string; storySlug: string; pageId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/page-plans/:pageId",
    async (request, reply) => {
      const routeError = validateStoryPageParams(request.params);
      if (routeError !== null) {
        return reply.code(400).send(routeError);
      }
      const sourcePath = path.join(
        storyDirectory(options.repoRoot, request.params.slug, request.params.storySlug),
        "pages-prose-plans",
        `${request.params.pageId}.md`,
      );
      const plan = await readOptionalBody(sourcePath);
      return plan ?? reply.code(404).send({ error: "not_found", message: `Page plan not found: ${request.params.pageId}` });
    },
  );

  server.get<{ Params: { slug: string; storySlug: string; pageId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/prose-receipts/:pageId",
    async (request, reply) => {
      const routeError = validateStoryPageParams(request.params);
      if (routeError !== null) {
        return reply.code(400).send(routeError);
      }
      const sourcePath = path.join(
        storyDirectory(options.repoRoot, request.params.slug, request.params.storySlug),
        "pages-prose-receipts",
        `${request.params.pageId}.yaml`,
      );
      const receipt = await readOptionalBody(sourcePath);
      if (receipt === null) {
        return reply.code(404).send({ error: "not_found", message: `Prose receipt not found: ${request.params.pageId}` });
      }
      return {
        body: parseRecordBody(receipt.body),
        sourcePath,
      };
    },
  );
}

function validateStoryPageParams(params: { slug: string; storySlug: string; pageId: string }) {
  if (!isValidRouteSlug(params.slug)) {
    return invalidRouteParam("slug", params.slug, "a lowercase world slug");
  }
  if (!isValidRouteSlug(params.storySlug)) {
    return invalidRouteParam("storySlug", params.storySlug, "a lowercase story slug");
  }
  if (!isValidPageId(params.pageId)) {
    return invalidRouteParam("pageId", params.pageId, "a page id like PG-12");
  }
  return null;
}
