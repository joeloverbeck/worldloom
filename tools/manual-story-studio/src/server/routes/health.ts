import { existsSync } from "node:fs";

import type { FastifyInstance } from "fastify";

import { computeHealth } from "../../health/compute.js";
import { resolveManualStoryRoot } from "../../write/sandbox.js";

export interface HealthRouteOptions {
  repoRoot: string;
}

function resolveManualStoryRootOrNull(
  repoRoot: string,
  worldSlug: string,
  msSlug: string,
) {
  try {
    const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
    if (!existsSync(root.absolutePath)) return null;
    return root;
  } catch {
    return null;
  }
}

export async function registerHealthRoute(
  server: FastifyInstance,
  options: HealthRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; msSlug: string } }>(
    "/api/worlds/:slug/manual-stories/:msSlug/health",
    async (request, reply) => {
      const root = resolveManualStoryRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });

      return reply.code(200).send(computeHealth(root.absolutePath));
    },
  );
}
