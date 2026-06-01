import { existsSync } from "node:fs";

import type { FastifyInstance } from "fastify";

import { compileManuscript } from "../../manuscript/compile.js";
import { readManuscript } from "../../read/manuscript.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../write/sandbox.js";

export interface ManuscriptRouteOptions {
  repoRoot: string;
}

function resolveRootOrNull(
  repoRoot: string,
  worldSlug: string,
  msSlug: string,
): ManualStoryRoot | null {
  try {
    const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
    if (!existsSync(root.absolutePath)) return null;
    return root;
  } catch {
    return null;
  }
}

export async function registerManuscriptReadRoute(
  server: FastifyInstance,
  options: ManuscriptRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; msSlug: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/manuscript",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });

      const result = readManuscript({ manualStoryRoot: root.absolutePath });
      if (!result.ok) return mapReadErrorToHttpReply(reply, result.error);
      if (!result.value.manuscript_present) {
        return reply.code(404).send({ error: "manuscript_not_compiled_yet" });
      }
      return result.value;
    },
  );
}

export async function registerManuscriptWriteRoute(
  server: FastifyInstance,
  options: ManuscriptRouteOptions,
): Promise<void> {
  server.post<{
    Params: { slug: string; msSlug: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/manuscript/rebuild",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });

      const result = compileManuscript({ manualStoryRoot: root });
      if (!result.ok) return mapReadErrorToHttpReply(reply, result.error);
      return result.value;
    },
  );
}
