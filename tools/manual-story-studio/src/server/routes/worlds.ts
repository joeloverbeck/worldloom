import type { FastifyInstance } from "fastify";

import { enumerateWorlds } from "../../read/worlds.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";

export interface WorldsRouteOptions {
  repoRoot: string;
}

export async function registerWorldsRoutes(
  server: FastifyInstance,
  options: WorldsRouteOptions,
): Promise<void> {
  server.get("/api/worlds", async (_request, reply) => {
    const worlds = enumerateWorlds(options.repoRoot);
    if (!worlds.ok) return mapReadErrorToHttpReply(reply, worlds.error);
    return { worlds: worlds.value };
  });
}
