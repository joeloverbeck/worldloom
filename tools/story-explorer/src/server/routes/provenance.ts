import type { FastifyInstance } from "fastify";

import { getRecordProvenance } from "../../read/provenance.js";

export interface ProvenanceRouteOptions {
  repoRoot: string;
}

export async function registerProvenanceRoutes(
  server: FastifyInstance,
  options: ProvenanceRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; storySlug: string; recordId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/provenance/:recordId",
    async (request) =>
      getRecordProvenance(request.params.slug, request.params.storySlug, request.params.recordId, options.repoRoot),
  );
}
