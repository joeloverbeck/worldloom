import type { FastifyInstance } from "fastify";

import { readBranchTimeline } from "../../read/timeline.js";
import { invalidRouteParam, isValidRouteSlug } from "./params.js";

export interface TimelineRouteOptions {
  repoRoot: string;
}

function isValidFocus(value: string): boolean {
  return /^(PG|SCN)-[0-9]+$/.test(value);
}

function isValidBranchId(value: string): boolean {
  return /^BR-[0-9]+$/.test(value);
}

export async function registerTimelineRoutes(
  server: FastifyInstance,
  options: TimelineRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; storySlug: string };
    Querystring: { branchId?: string; focus?: string };
  }>("/api/worlds/:slug/stories/:storySlug/timeline", async (request, reply) => {
    if (!isValidRouteSlug(request.params.slug)) {
      return reply.code(400).send(invalidRouteParam("slug", request.params.slug, "a lowercase world slug"));
    }
    if (!isValidRouteSlug(request.params.storySlug)) {
      return reply.code(400).send(invalidRouteParam("storySlug", request.params.storySlug, "a lowercase story slug"));
    }
    if (request.query.branchId !== undefined && !isValidBranchId(request.query.branchId)) {
      return reply.code(400).send(invalidRouteParam("branchId", request.query.branchId, "a branch id like BR-12"));
    }
    if (request.query.focus !== undefined && !isValidFocus(request.query.focus)) {
      return reply.code(400).send(invalidRouteParam("focus", request.query.focus, "a page or scene id like PG-12 or SCN-12"));
    }

    const timeline = await readBranchTimeline(
      request.params.slug,
      request.params.storySlug,
      {
        ...(request.query.branchId === undefined ? {} : { branchId: request.query.branchId }),
        ...(request.query.focus === undefined ? {} : { focus: request.query.focus }),
      },
      options.repoRoot,
    );

    if (timeline === null) {
      return reply.code(404).send({
        error: "not_found",
        message: `Timeline not found: ${request.params.slug}/${request.params.storySlug}`,
      });
    }

    return timeline;
  });
}
