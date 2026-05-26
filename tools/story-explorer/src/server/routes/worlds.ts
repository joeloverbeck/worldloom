import { existsSync } from "node:fs";
import path from "node:path";

import type { FastifyInstance } from "fastify";

import { enumerateWorlds } from "../../read/world-list.js";

export interface WorldsRouteOptions {
  repoRoot: string;
}

export async function registerWorldsRoutes(
  server: FastifyInstance,
  options: WorldsRouteOptions,
): Promise<void> {
  server.get("/api/worlds", async () => enumerateWorlds(options.repoRoot));

  server.get<{ Params: { slug: string } }>("/api/worlds/:slug", async (request, reply) => {
    const worldPath = path.join(options.repoRoot, "worlds", request.params.slug);
    if (!existsSync(worldPath)) {
      return reply.code(404).send({
        error: "not_found",
        message: `World not found: ${request.params.slug}`,
      });
    }

    const worlds = await enumerateWorlds(options.repoRoot);
    const world = worlds.find((candidate) => candidate.worldSlug === request.params.slug);

    if (world === undefined) {
      return reply.code(404).send({
        error: "not_found",
        message: `World not found: ${request.params.slug}`,
      });
    }

    return world;
  });
}
