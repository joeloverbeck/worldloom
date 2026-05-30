import type { FastifyInstance } from "fastify";

import { enumerateWorlds } from "../../read/worlds.js";

export interface WorldsRouteOptions {
  repoRoot: string;
}

export async function registerWorldsRoutes(
  server: FastifyInstance,
  options: WorldsRouteOptions,
): Promise<void> {
  server.get("/api/worlds", async () => {
    const worlds = enumerateWorlds(options.repoRoot);
    return { worlds };
  });
}
