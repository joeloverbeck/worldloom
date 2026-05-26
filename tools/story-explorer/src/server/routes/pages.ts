import type { FastifyInstance } from "fastify";

import { getPageDetail } from "../../read/page-detail.js";
import { getPageSummaries } from "../../read/story-list.js";

export interface PageRouteOptions {
  repoRoot: string;
}

export async function registerPageRoutes(
  server: FastifyInstance,
  options: PageRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; storySlug: string };
    Querystring: { root?: string; latest?: string; list?: string };
  }>("/api/worlds/:slug/stories/:storySlug/pages", async (request) => {
    const pages = await getPageSummaries(request.params.slug, request.params.storySlug, options.repoRoot);
    if (request.query.root !== undefined) {
      return pages.find((page) => page.parentPageId === null) ?? pages[0] ?? null;
    }
    if (request.query.latest !== undefined) {
      return pages.reduce(
        (latest, page) => (latest === null || page.turnIndex > latest.turnIndex ? page : latest),
        null as (typeof pages)[number] | null,
      );
    }
    return pages;
  });

  server.get<{ Params: { slug: string; storySlug: string; pageId: string } }>(
    "/api/worlds/:slug/stories/:storySlug/pages/:pageId",
    async (request, reply) => {
      try {
        return await getPageDetail(
          request.params.slug,
          request.params.storySlug,
          request.params.pageId,
          options.repoRoot,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("not found")) {
          return reply.code(404).send({ error: "not_found", message });
        }
        throw error;
      }
    },
  );
}
