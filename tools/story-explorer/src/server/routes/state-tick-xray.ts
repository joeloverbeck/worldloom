import type { FastifyInstance } from "fastify";

import { readStateTickXray } from "../../read/state-tick-xray.js";
import { invalidRouteParam, isValidPageId, isValidRouteSlug } from "./params.js";

export interface StateTickXrayRouteOptions {
  repoRoot: string;
}

export async function registerStateTickXrayRoutes(
  server: FastifyInstance,
  options: StateTickXrayRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; storySlug: string; pgId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/state-ticks/:pgId/xray",
    async (request, reply) => {
      if (!isValidRouteSlug(request.params.slug)) {
        return reply.code(400).send(invalidRouteParam("slug", request.params.slug, "a lowercase world slug"));
      }
      if (!isValidRouteSlug(request.params.storySlug)) {
        return reply.code(400).send(invalidRouteParam("storySlug", request.params.storySlug, "a lowercase story slug"));
      }
      if (!isValidPageId(request.params.pgId)) {
        return reply.code(400).send(invalidRouteParam("pgId", request.params.pgId, "a page id like PG-12"));
      }

      const xray = await readStateTickXray(
        request.params.slug,
        request.params.storySlug,
        request.params.pgId,
        options.repoRoot,
      );
      if (xray === null) {
        return reply.code(404).send({ error: "not_found", message: `State tick not found: ${request.params.pgId}` });
      }
      return xray;
    },
  );
}
