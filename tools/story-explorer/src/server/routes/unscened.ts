import type { FastifyInstance } from "fastify";

import { readUnscenedRanges } from "../../read/unscened.js";
import { invalidRouteParam, isValidRouteSlug } from "./params.js";

export interface UnscenedRouteOptions {
  repoRoot: string;
}

function isValidBranchId(value: string): boolean {
  return /^BR-[0-9]+$/.test(value);
}

export async function registerUnscenedRoutes(
  server: FastifyInstance,
  options: UnscenedRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; storySlug: string };
    Querystring: { branchId?: string };
  }>("/api/worlds/:slug/stories/:storySlug/unscened-ranges", async (request, reply) => {
    if (!isValidRouteSlug(request.params.slug)) {
      return reply.code(400).send(invalidRouteParam("slug", request.params.slug, "a lowercase world slug"));
    }
    if (!isValidRouteSlug(request.params.storySlug)) {
      return reply.code(400).send(invalidRouteParam("storySlug", request.params.storySlug, "a lowercase story slug"));
    }
    if (request.query.branchId === undefined || !isValidBranchId(request.query.branchId)) {
      return reply
        .code(400)
        .send(invalidRouteParam("branchId", request.query.branchId ?? "", "a branch id like BR-12"));
    }

    const ranges = await readUnscenedRanges(
      request.params.slug,
      request.params.storySlug,
      request.query.branchId,
      options.repoRoot,
    );
    if (ranges === null) {
      return reply.code(404).send({
        error: "not_found",
        message: `Unscened ranges not found: ${request.params.slug}/${request.params.storySlug}/${request.query.branchId}`,
      });
    }
    return ranges;
  });
}
