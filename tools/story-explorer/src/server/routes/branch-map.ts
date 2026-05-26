import type { FastifyInstance } from "fastify";

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

export async function registerBranchMapRoute(server: FastifyInstance): Promise<void> {
  server.get<{
    Params: { slug: string; storySlug: string };
    Querystring: BranchMapQuery;
  }>("/api/worlds/:slug/stories/:storySlug/branch-map", async (request, reply) => {
    const query = request.query;
    if (query.focus === undefined || query.focus.trim() === "") {
      return reply.code(400).send(invalidInput("Branch-map query parameter focus is required.", "focus"));
    }

    const depth = parseDepth(query.depth);
    if (depth === null) {
      return reply.code(400).send(invalidInput("Branch-map query parameter depth must be an integer from 0 through 10.", "depth"));
    }

    return {
      kind: "not_implemented",
      message: "Branch-map endpoint is a sketch-only placeholder; full implementation lands in SPEC-90.",
      spec: "SPEC-90",
      query: {
        focus: query.focus,
        depth,
      },
    };
  });
}
