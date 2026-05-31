import { existsSync } from "node:fs";

import type { FastifyInstance } from "fastify";

import { readManualStoryMetadata } from "../../read/manual-story-metadata.js";
import type { ManualStoryMetadata } from "../../schema/manual-story.js";
import { updateManualStoryMetadata } from "../../write/manual-story-metadata.js";
import { resolveManualStoryRoot } from "../../write/sandbox.js";

export interface MetadataRouteOptions {
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

export async function registerMetadataReadRoute(
  server: FastifyInstance,
  options: MetadataRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; msSlug: string } }>(
    "/api/worlds/:slug/manual-stories/:msSlug/metadata",
    async (request, reply) => {
      const root = resolveManualStoryRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });
      const metadata = readManualStoryMetadata(root.absolutePath);
      if (!metadata) return reply.code(404).send({ error: "not_found" });
      return { metadata };
    },
  );
}

interface PutMetadataBody {
  metadata?: ManualStoryMetadata;
}

export async function registerMetadataWriteRoute(
  server: FastifyInstance,
  options: MetadataRouteOptions,
): Promise<void> {
  server.put<{
    Params: { slug: string; msSlug: string };
    Body: PutMetadataBody;
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/metadata",
    async (request, reply) => {
      const root = resolveManualStoryRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "not_found" });
      const body = (request.body ?? {}) as PutMetadataBody;
      if (!body.metadata || typeof body.metadata !== "object") {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "metadata body required" });
      }
      const result = updateManualStoryMetadata(root, body.metadata);
      if (result.ok) return { ok: true };
      return reply
        .code(400)
        .send({ error: "validation_failed", errors: result.errors });
    },
  );
}
