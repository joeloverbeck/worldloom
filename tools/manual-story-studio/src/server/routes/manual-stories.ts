import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import YAML from "yaml";

import { enumerateManualStories } from "../../read/manual-stories.js";
import { makeDefaultManualStoryMetadata } from "../../write/manual-story-metadata.js";
import {
  assertInsideSandbox,
  resolveManualStoryRoot,
} from "../../write/sandbox.js";

export interface ManualStoriesRouteOptions {
  repoRoot: string;
}

interface CreateManualStoryBody {
  slug?: unknown;
  title?: unknown;
}

export async function registerManualStoriesGetRoute(
  server: FastifyInstance,
  options: ManualStoriesRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string } }>(
    "/api/worlds/:slug/manual-stories",
    async (request, reply) => {
      try {
        const manualStories = enumerateManualStories(
          options.repoRoot,
          request.params.slug,
        );
        return { manualStories };
      } catch (error) {
        return reply
          .code(400)
          .send({ error: "invalid_slug", message: (error as Error).message });
      }
    },
  );
}

export async function registerManualStoriesWriteRoutes(
  server: FastifyInstance,
  options: ManualStoriesRouteOptions,
): Promise<void> {
  server.post<{
    Params: { slug: string };
    Body: CreateManualStoryBody;
  }>(
    "/api/worlds/:slug/manual-stories",
    async (request, reply) => {
      const worldSlug = request.params.slug;
      const body = (request.body ?? {}) as CreateManualStoryBody;
      const manualStorySlug = body.slug;
      const title = body.title;

      if (typeof manualStorySlug !== "string" || typeof title !== "string") {
        return reply
          .code(400)
          .send({ error: "bad_request", message: "slug and title required" });
      }

      let root;
      try {
        root = resolveManualStoryRoot(options.repoRoot, worldSlug, manualStorySlug);
      } catch (error) {
        return reply
          .code(400)
          .send({ error: "invalid_slug", message: (error as Error).message });
      }

      const manualStoryYamlPath = path.join(root.absolutePath, "manual-story.yaml");

      if (existsSync(manualStoryYamlPath)) {
        return reply
          .code(409)
          .send({ error: "already_exists", manualStorySlug });
      }

      try {
        assertInsideSandbox(manualStoryYamlPath, root);
      } catch (error) {
        return reply
          .code(403)
          .send({ error: "sandbox_violation", message: (error as Error).message });
      }

      mkdirSync(root.absolutePath, { recursive: true });

      const now = new Date().toISOString();
      const initialContent = YAML.stringify(
        makeDefaultManualStoryMetadata(worldSlug, manualStorySlug, title, now),
      );
      writeFileSync(manualStoryYamlPath, initialContent);

      return reply.code(201).send({
        worldSlug,
        manualStorySlug,
        title,
        absolutePath: root.absolutePath,
      });
    },
  );
}
