import type { FastifyInstance } from "fastify";

import { readBranchMap } from "../../read/branch-map.js";
import { invalidRouteParam, isValidRouteSlug } from "./params.js";

export interface BranchMapRouteOptions {
  repoRoot: string;
}

interface BranchMapQuery {
  focus?: string;
  depth?: string;
}

function invalidInput(message: string, field: string): Record<string, string> {
  return {
    error: "invalid_input",
    message,
    field,
  };
}

// SPEC-98 §2 item 3 widens focus to SCN-N | PG-N | CHC-N | BR-N.
const FOCUS_PATTERN = /^(SCN|PG|CHC|BR)-(0|[1-9][0-9]*)$/;

function parseDepth(value: string | undefined): number | null {
  if (value === undefined) {
    return 3;
  }
  if (!/^[0-9]+$/.test(value)) {
    return null;
  }
  const depth = Number(value);
  return depth <= 10 ? depth : null;
}

export async function registerBranchMapRoute(server: FastifyInstance, options: BranchMapRouteOptions): Promise<void> {
  server.get<{
    Params: { slug: string; storySlug: string };
    Querystring: BranchMapQuery;
  }>("/api/worlds/:slug/stories/:storySlug/branch-map", async (request, reply) => {
    if (!isValidRouteSlug(request.params.slug)) {
      return reply.code(400).send(invalidRouteParam("slug", request.params.slug, "a lowercase world slug"));
    }
    if (!isValidRouteSlug(request.params.storySlug)) {
      return reply.code(400).send(invalidRouteParam("storySlug", request.params.storySlug, "a lowercase story slug"));
    }

    const query = request.query;
    if (query.focus === undefined || query.focus.trim() === "") {
      return reply.code(400).send(invalidInput("Branch-map query parameter focus is required.", "focus"));
    }
    if (!FOCUS_PATTERN.test(query.focus)) {
      return reply
        .code(400)
        .send(invalidInput("Branch-map query parameter focus must be a SCN-N, PG-N, CHC-N, or BR-N id.", "focus"));
    }

    const depth = parseDepth(query.depth);
    if (depth === null) {
      return reply.code(400).send(invalidInput("Branch-map query parameter depth must be an integer from 0 through 10.", "depth"));
    }

    return readBranchMap(request.params.slug, request.params.storySlug, { focus: query.focus, depth }, options.repoRoot);
  });
}
