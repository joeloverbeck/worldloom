import { existsSync } from "node:fs";
import path from "node:path";

import type { FastifyInstance } from "fastify";

import { enumerateStories } from "../../read/story-list.js";

export interface StoriesRouteOptions {
  repoRoot: string;
}

function storyPath(repoRoot: string, worldSlug: string, storySlug: string): string {
  return path.join(repoRoot, "worlds", worldSlug, "stories", storySlug);
}

export async function registerStoriesRoutes(
  server: FastifyInstance,
  options: StoriesRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string } }>("/api/worlds/:slug/stories", async (request, reply) => {
    const storiesRoot = path.join(options.repoRoot, "worlds", request.params.slug, "stories");
    if (!existsSync(storiesRoot)) {
      return reply.code(404).send({
        error: "not_found",
        message: `World not found or has no stories: ${request.params.slug}`,
      });
    }

    return enumerateStories(request.params.slug, options.repoRoot);
  });

  server.get<{ Params: { slug: string; storySlug: string } }>(
    "/api/worlds/:slug/stories/:storySlug",
    async (request, reply) => {
      if (!existsSync(storyPath(options.repoRoot, request.params.slug, request.params.storySlug))) {
        return reply.code(404).send({
          error: "not_found",
          message: `Story not found: ${request.params.slug}/${request.params.storySlug}`,
        });
      }

      const stories = await enumerateStories(request.params.slug, options.repoRoot);
      const story = stories.find((candidate) => candidate.storySlug === request.params.storySlug);

      if (story === undefined) {
        return reply.code(404).send({
          error: "not_found",
          message: `Story not found: ${request.params.slug}/${request.params.storySlug}`,
        });
      }

      return story;
    },
  );
}
