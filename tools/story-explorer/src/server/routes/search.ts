import type { FastifyInstance } from "fastify";

interface SearchQuery {
  q?: string;
  kinds?: string;
  limit?: string;
  offset?: string;
}

function invalidInput(message: string, field: string): Record<string, string> {
  return {
    error: "invalid_input",
    message,
    field,
  };
}

function parseNonNegativeInteger(value: string | undefined): number | null {
  if (value === undefined) {
    return 0;
  }
  if (!/^[0-9]+$/.test(value)) {
    return null;
  }
  return Number(value);
}

function parseKinds(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }
  return value
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind) => kind.length > 0);
}

export async function registerSearchRoute(server: FastifyInstance): Promise<void> {
  server.get<{
    Params: { slug: string; storySlug: string };
    Querystring: SearchQuery;
  }>("/api/worlds/:slug/stories/:storySlug/search", async (request, reply) => {
    const query = request.query;
    if (query.q === undefined || query.q.trim() === "") {
      return reply.code(400).send(invalidInput("Search query parameter q is required.", "q"));
    }

    const limit = parseNonNegativeInteger(query.limit);
    if (limit === null) {
      return reply.code(400).send(invalidInput("Search query parameter limit must be a non-negative integer.", "limit"));
    }

    const offset = parseNonNegativeInteger(query.offset);
    if (offset === null) {
      return reply.code(400).send(invalidInput("Search query parameter offset must be a non-negative integer.", "offset"));
    }

    return {
      kind: "not_implemented",
      message: "Search endpoint is a sketch-only placeholder; full implementation lands in SPEC-90.",
      spec: "SPEC-90",
      query: {
        q: query.q,
        kinds: parseKinds(query.kinds),
        limit,
        offset,
      },
    };
  });
}
