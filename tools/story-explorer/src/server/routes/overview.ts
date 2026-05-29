import type { FastifyInstance } from "fastify";

import { readStoryOverview } from "../../read/overview.js";

export interface OverviewRouteOptions {
  repoRoot: string;
}

export async function registerOverviewRoutes(
  server: FastifyInstance,
  options: OverviewRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; storySlug: string } }>(
    "/api/worlds/:slug/stories/:storySlug/overview",
    async (request, reply) => {
      const overview = await readStoryOverview(
        request.params.slug,
        request.params.storySlug,
        options.repoRoot,
      );

      if (overview === null) {
        return reply.code(404).send({
          error: "not_found",
          message: `Story not found: ${request.params.slug}/${request.params.storySlug}`,
        });
      }

      return overview;
    },
  );
}
